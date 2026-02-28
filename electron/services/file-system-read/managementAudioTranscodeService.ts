import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

import {
  type AudioItemDto,
  type AudioTranscodePresetDto,
  type LibrarySnapshotDto,
  type ReadAudioTranscodeCapabilitiesResponseDto,
  type StartAudioTranscodeTaskRequestDto,
} from "../../../src/contracts/backend";
import {
  isPathAllowlisted,
  type MediaAccessGuardContext,
} from "../../fileSystemMediaAccessGuard";
import { normalizeAllowlistKey } from "../../fileSystemServiceHelpers";

class AudioTranscodeCancelledError extends Error {
  constructor() {
    super("audio_transcode_cancelled");
    this.name = "AudioTranscodeCancelledError";
  }
}

interface AudioTranscodeProgressPayload {
  total_count: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  message: string;
}

interface RunAudioTranscodeTaskOptions {
  isCancelled?: () => boolean;
  signal?: AbortSignal;
  onProgress?: (payload: AudioTranscodeProgressPayload) => void;
}

interface RunAudioTranscodeTaskResult {
  total_count: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  output_files: string[];
  first_error_detail: string | null;
}

interface ManagementAudioTranscodeServiceDependencies {
  ffmpegBin: string;
  ensureRuntimeDependencies: () => Promise<{ ffmpeg: boolean; ffprobe: boolean }>;
  ensureStateLoaded: () => Promise<void>;
  ensureSnapshotLoaded: () => Promise<LibrarySnapshotDto>;
  refreshSnapshotFromFilesystem?: (options?: {
    force?: boolean;
  }) => Promise<LibrarySnapshotDto>;
  syncSnapshotFromDatabase: () => LibrarySnapshotDto;
  buildMediaAccessContext: () => MediaAccessGuardContext;
  readMusicImportSources: () => { directories: string[]; files: string[] };
  writeMusicImportSources: (next: {
    directories: string[];
    files: string[];
  }) => void;
  emitLibraryChanged: (payload: {
    reason: string;
    updated_at_ms: number;
  }) => void;
}

const PRESET_EXTENSION: Record<
  StartAudioTranscodeTaskRequestDto["preset"],
  string
> = {
  flac: ".flac",
  alac: ".m4a",
  wav: ".wav",
  opus: ".opus",
  aac: ".m4a",
  mp3: ".mp3",
};

const PRESET_CODEC_ARGS: Record<
  StartAudioTranscodeTaskRequestDto["preset"],
  string[]
> = {
  flac: ["-c:a", "flac"],
  alac: ["-c:a", "alac"],
  wav: ["-c:a", "pcm_s16le"],
  opus: ["-c:a", "libopus", "-b:a", "160k"],
  aac: ["-c:a", "aac", "-b:a", "256k"],
  mp3: ["-c:a", "libmp3lame", "-b:a", "320k"],
};

const PRESET_REQUIRED_ENCODER: Record<AudioTranscodePresetDto, string> = {
  flac: "flac",
  alac: "alac",
  wav: "pcm_s16le",
  opus: "libopus",
  aac: "aac",
  mp3: "libmp3lame",
};

type FilesystemAudioItem = AudioItemDto & {
  media_locator: Extract<AudioItemDto["media_locator"], { kind: "filesystem" }>;
};

export class ManagementAudioTranscodeService {
  private static readonly ENCODER_CACHE_TTL_MS = 30_000;

  private encoderCache: {
    expiresAtMs: number;
    encoders: Set<string>;
  } | null = null;

  private encoderLoadingPromise: Promise<Set<string>> | null = null;

  constructor(
    private readonly dependencies: ManagementAudioTranscodeServiceDependencies,
  ) {}

  private throwIfCancelled(options: RunAudioTranscodeTaskOptions): void {
    if (options.isCancelled?.() || options.signal?.aborted) {
      throw new AudioTranscodeCancelledError();
    }
  }

  private async runFfmpeg(
    args: string[],
    options: RunAudioTranscodeTaskOptions,
  ): Promise<{ code: number; stderr: string }> {
    return await new Promise((resolve, reject) => {
      const child = spawn(this.dependencies.ffmpegBin, args, {
        windowsHide: true,
        stdio: ["ignore", "ignore", "pipe"],
      });
      let stderr = "";
      let settled = false;

      const settle = (
        handler: () => void,
      ): void => {
        if (settled) {
          return;
        }
        settled = true;
        options.signal?.removeEventListener("abort", onAbort);
        handler();
      };

      const onAbort = (): void => {
        try {
          child.kill("SIGKILL");
        } catch {
          // ignore
        }
        settle(() => reject(new AudioTranscodeCancelledError()));
      };

      options.signal?.addEventListener("abort", onAbort, { once: true });

      child.stderr.on("data", (chunk) => {
        stderr += String(chunk);
      });

      child.on("error", (error) => {
        settle(() => reject(error));
      });

      child.on("close", (code) => {
        settle(() => resolve({ code: code ?? -1, stderr }));
      });
    });
  }

  private computeSegmentRange(audio: AudioItemDto): {
    startSec: number | null;
    endSec: number | null;
  } {
    const startSec =
      typeof audio.cue_start_sec === "number" && audio.cue_start_sec >= 0
        ? audio.cue_start_sec
        : null;
    const endSec =
      typeof audio.cue_end_sec === "number" && audio.cue_end_sec > 0
        ? audio.cue_end_sec
        : null;
    if (startSec == null) {
      return { startSec: null, endSec: null };
    }
    if (endSec == null || endSec <= startSec) {
      return { startSec, endSec: null };
    }
    return { startSec, endSec };
  }

  private buildOutputPath(
    sourcePath: string,
    outputDir: string,
    preset: StartAudioTranscodeTaskRequestDto["preset"],
    audio: AudioItemDto,
  ): string {
    const sourceBaseName = path.basename(sourcePath, path.extname(sourcePath));
    const cueSuffix =
      typeof audio.cue_track_no === "number"
        ? `.track${String(audio.cue_track_no).padStart(2, "0")}`
        : "";
    const extension = PRESET_EXTENSION[preset];
    return path.resolve(path.join(outputDir, `${sourceBaseName}${cueSuffix}${extension}`));
  }

  private async addOutputFilesToMusicImportSources(
    outputFiles: string[],
  ): Promise<void> {
    if (outputFiles.length <= 0) {
      return;
    }
    const current = this.dependencies.readMusicImportSources();
    const fileKeyToPath = new Map<string, string>();
    for (const value of current.files) {
      fileKeyToPath.set(normalizeAllowlistKey(path.resolve(value)), path.resolve(value));
    }
    for (const value of outputFiles) {
      const resolved = path.resolve(value);
      fileKeyToPath.set(normalizeAllowlistKey(resolved), resolved);
    }
    this.dependencies.writeMusicImportSources({
      directories: Array.from(new Set(current.directories.map((value) => path.resolve(value)))),
      files: Array.from(fileKeyToPath.values()).sort((left, right) =>
        left.localeCompare(right, "zh-CN"),
      ),
    });
  }

  private async runFfmpegEncoderProbe(): Promise<Set<string>> {
    return await new Promise((resolve, reject) => {
      const child = spawn(this.dependencies.ffmpegBin, ["-hide_banner", "-encoders"], {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk) => {
        stdout += String(chunk);
      });
      child.stderr.on("data", (chunk) => {
        stderr += String(chunk);
      });

      child.on("error", (error) => {
        reject(error);
      });

      child.on("close", (code) => {
        if ((code ?? -1) !== 0) {
          reject(new Error(stderr.trim() || `ffmpeg encoder probe exited with code ${code ?? -1}`));
          return;
        }

        const output = `${stdout}\n${stderr}`;
        const encoders = new Set<string>();
        for (const line of output.split(/\r?\n/)) {
          const matched = line.match(/^\s*[A-Z.]{6}\s+([^\s]+)\s+/);
          if (!matched) {
            continue;
          }
          encoders.add(matched[1].toLowerCase());
        }
        resolve(encoders);
      });
    });
  }

  private async readCachedFfmpegEncoders(): Promise<Set<string>> {
    const now = Date.now();
    if (this.encoderCache && this.encoderCache.expiresAtMs > now) {
      return this.encoderCache.encoders;
    }

    if (!this.encoderLoadingPromise) {
      this.encoderLoadingPromise = this.runFfmpegEncoderProbe().finally(() => {
        this.encoderLoadingPromise = null;
      });
    }

    const encoders = await this.encoderLoadingPromise;
    this.encoderCache = {
      expiresAtMs: now + ManagementAudioTranscodeService.ENCODER_CACHE_TTL_MS,
      encoders,
    };
    return encoders;
  }

  private buildUnavailablePresetCapabilities(
    reason: "ffmpeg_unavailable" | "encoder_unavailable",
  ): ReadAudioTranscodeCapabilitiesResponseDto["presets"] {
    return {
      flac: {
        available: false,
        required_encoder: PRESET_REQUIRED_ENCODER.flac,
        reason,
      },
      alac: {
        available: false,
        required_encoder: PRESET_REQUIRED_ENCODER.alac,
        reason,
      },
      wav: {
        available: false,
        required_encoder: PRESET_REQUIRED_ENCODER.wav,
        reason,
      },
      opus: {
        available: false,
        required_encoder: PRESET_REQUIRED_ENCODER.opus,
        reason,
      },
      aac: {
        available: false,
        required_encoder: PRESET_REQUIRED_ENCODER.aac,
        reason,
      },
      mp3: {
        available: false,
        required_encoder: PRESET_REQUIRED_ENCODER.mp3,
        reason,
      },
    };
  }

  private buildPresetCapabilitiesFromEncoders(
    encoders: Set<string>,
  ): ReadAudioTranscodeCapabilitiesResponseDto["presets"] {
    return {
      flac: {
        available: encoders.has(PRESET_REQUIRED_ENCODER.flac),
        required_encoder: PRESET_REQUIRED_ENCODER.flac,
        reason: encoders.has(PRESET_REQUIRED_ENCODER.flac)
          ? null
          : "encoder_unavailable",
      },
      alac: {
        available: encoders.has(PRESET_REQUIRED_ENCODER.alac),
        required_encoder: PRESET_REQUIRED_ENCODER.alac,
        reason: encoders.has(PRESET_REQUIRED_ENCODER.alac)
          ? null
          : "encoder_unavailable",
      },
      wav: {
        available: encoders.has(PRESET_REQUIRED_ENCODER.wav),
        required_encoder: PRESET_REQUIRED_ENCODER.wav,
        reason: encoders.has(PRESET_REQUIRED_ENCODER.wav)
          ? null
          : "encoder_unavailable",
      },
      opus: {
        available: encoders.has(PRESET_REQUIRED_ENCODER.opus),
        required_encoder: PRESET_REQUIRED_ENCODER.opus,
        reason: encoders.has(PRESET_REQUIRED_ENCODER.opus)
          ? null
          : "encoder_unavailable",
      },
      aac: {
        available: encoders.has(PRESET_REQUIRED_ENCODER.aac),
        required_encoder: PRESET_REQUIRED_ENCODER.aac,
        reason: encoders.has(PRESET_REQUIRED_ENCODER.aac)
          ? null
          : "encoder_unavailable",
      },
      mp3: {
        available: encoders.has(PRESET_REQUIRED_ENCODER.mp3),
        required_encoder: PRESET_REQUIRED_ENCODER.mp3,
        reason: encoders.has(PRESET_REQUIRED_ENCODER.mp3)
          ? null
          : "encoder_unavailable",
      },
    };
  }

  async readAudioTranscodeCapabilities(): Promise<ReadAudioTranscodeCapabilitiesResponseDto> {
    const runtimeDependencies = await this.dependencies.ensureRuntimeDependencies();
    const checkedAtMs = Date.now();
    if (!runtimeDependencies.ffmpeg) {
      return {
        enabled: false,
        ffmpeg_available: false,
        ffprobe_available: runtimeDependencies.ffprobe,
        presets: this.buildUnavailablePresetCapabilities("ffmpeg_unavailable"),
        checked_at_ms: checkedAtMs,
      };
    }

    let presets: ReadAudioTranscodeCapabilitiesResponseDto["presets"];
    try {
      const encoders = await this.readCachedFfmpegEncoders();
      presets = this.buildPresetCapabilitiesFromEncoders(encoders);
    } catch {
      presets = this.buildUnavailablePresetCapabilities("encoder_unavailable");
    }

    const enabled =
      presets.flac.available ||
      presets.alac.available ||
      presets.wav.available ||
      presets.opus.available ||
      presets.aac.available ||
      presets.mp3.available;
    return {
      enabled,
      ffmpeg_available: runtimeDependencies.ffmpeg,
      ffprobe_available: runtimeDependencies.ffprobe,
      presets,
      checked_at_ms: checkedAtMs,
    };
  }

  async runAudioTranscodeTask(
    request: StartAudioTranscodeTaskRequestDto,
    options: RunAudioTranscodeTaskOptions = {},
  ): Promise<RunAudioTranscodeTaskResult> {
    await this.dependencies.ensureStateLoaded();
    const capabilities = await this.readAudioTranscodeCapabilities();
    if (!capabilities.ffmpeg_available) {
      throw new Error("audio transcode failed: ffmpeg unavailable");
    }
    const presetCapability = capabilities.presets[request.preset];
    if (!presetCapability.available) {
      throw new Error(
        `audio transcode failed: preset ${request.preset} unavailable (missing encoder ${presetCapability.required_encoder})`,
      );
    }

    const snapshot = await this.dependencies.ensureSnapshotLoaded();
    const mediaAccessContext = this.dependencies.buildMediaAccessContext();
    const audioById = new Map<string, AudioItemDto>(
      (snapshot.audios ?? []).map((audio) => [audio.id, audio]),
    );
    const normalizedAudioIds = Array.from(
      new Set(request.audio_ids.map((value) => value.trim()).filter(Boolean)),
    );

    const selectedAudios: FilesystemAudioItem[] = [];
    for (const audioId of normalizedAudioIds) {
      const audio = audioById.get(audioId);
      if (!audio || audio.media_locator.kind !== "filesystem") {
        continue;
      }
      const filesystemAudio = audio as FilesystemAudioItem;
      const sourcePath = path.resolve(filesystemAudio.media_locator.absolute_path);
      if (!isPathAllowlisted(sourcePath, mediaAccessContext)) {
        continue;
      }
      selectedAudios.push(filesystemAudio);
    }

    if (selectedAudios.length <= 0) {
      throw new Error("audio transcode failed: no valid audio selected");
    }

    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    let firstErrorDetail: string | null = null;
    const outputFiles: string[] = [];

    const emitProgress = (message: string): void => {
      options.onProgress?.({
        total_count: selectedAudios.length,
        processed_count: processedCount,
        success_count: successCount,
        failed_count: failedCount,
        message,
      });
    };

    emitProgress("starting audio transcode task");

    for (const audio of selectedAudios) {
      this.throwIfCancelled(options);
      const sourcePath = path.resolve(audio.media_locator.absolute_path);
      const targetDir = path.resolve(request.output_dir ?? path.dirname(sourcePath));
      if (!isPathAllowlisted(targetDir, mediaAccessContext)) {
        processedCount += 1;
        failedCount += 1;
        if (!firstErrorDetail) {
          firstErrorDetail = `output directory outside allowlist: ${targetDir}`;
        }
        emitProgress(`failed ${path.basename(sourcePath)}: output outside allowlist`);
        continue;
      }
      await fs.mkdir(targetDir, { recursive: true });

      const outputPath = this.buildOutputPath(sourcePath, targetDir, request.preset, audio);
      if (!request.overwrite) {
        const exists = await fs.stat(outputPath).catch(() => null);
        if (exists) {
          processedCount += 1;
          failedCount += 1;
          if (!firstErrorDetail) {
            firstErrorDetail = `destination already exists: ${outputPath}`;
          }
          emitProgress(`failed ${path.basename(sourcePath)}: destination already exists`);
          continue;
        }
      }

      const segment = this.computeSegmentRange(audio);
      const args: string[] = [
        "-hide_banner",
        "-nostdin",
        request.overwrite ? "-y" : "-n",
        "-i",
        sourcePath,
      ];
      if (request.copy_metadata !== false) {
        args.push("-map_metadata", "0");
      }
      if (segment.startSec != null) {
        args.push("-ss", segment.startSec.toFixed(3));
      }
      if (segment.endSec != null) {
        args.push("-to", segment.endSec.toFixed(3));
      }
      args.push(...PRESET_CODEC_ARGS[request.preset]);
      args.push(outputPath);

      try {
        const result = await this.runFfmpeg(args, options);
        if (result.code !== 0) {
          throw new Error(result.stderr.trim() || `ffmpeg exited with code ${result.code}`);
        }
        outputFiles.push(outputPath);
        processedCount += 1;
        successCount += 1;
        emitProgress(`transcoded ${path.basename(sourcePath)}`);
      } catch (error) {
        if (error instanceof AudioTranscodeCancelledError) {
          throw error;
        }
        await fs.rm(outputPath, { force: true }).catch(() => undefined);
        const reason =
          error instanceof Error && error.message ? error.message : String(error);
        processedCount += 1;
        failedCount += 1;
        if (!firstErrorDetail) {
          firstErrorDetail = reason;
        }
        emitProgress(`failed ${path.basename(sourcePath)}: ${reason}`);
      }
    }

    if (successCount > 0) {
      if (request.add_output_to_music_sources !== false) {
        await this.addOutputFilesToMusicImportSources(outputFiles);
      }
      if (this.dependencies.refreshSnapshotFromFilesystem) {
        await this.dependencies.refreshSnapshotFromFilesystem({ force: true });
      } else {
        this.dependencies.syncSnapshotFromDatabase();
      }
      this.dependencies.emitLibraryChanged({
        reason: "manage-audio-transcode",
        updated_at_ms: Date.now(),
      });
    }

    emitProgress("audio transcode task finished");
    return {
      total_count: selectedAudios.length,
      processed_count: processedCount,
      success_count: successCount,
      failed_count: failedCount,
      output_files: outputFiles,
      first_error_detail: firstErrorDetail,
    };
  }
}
