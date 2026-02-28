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
  rootDir: string;
  ffmpegBin: string;
  defaultConcurrency: number;
  runWithCpuToken?: <T>(taskName: string, task: () => Promise<T>) => Promise<T>;
  ensureRuntimeDependencies: () => Promise<{
    ffmpeg: boolean;
    ffprobe: boolean;
  }>;
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

const PRESET_REQUIRED_MUXERS: Record<AudioTranscodePresetDto, string[]> = {
  flac: ["flac"],
  alac: ["ipod", "mp4"],
  wav: ["wav"],
  opus: ["opus"],
  aac: ["ipod", "mp4"],
  mp3: ["mp3"],
};

type FilesystemAudioItem = AudioItemDto & {
  media_locator: Extract<AudioItemDto["media_locator"], { kind: "filesystem" }>;
};

export class ManagementAudioTranscodeService {
  private static readonly ENCODER_CACHE_TTL_MS = 30_000;

  private static readonly DEFAULT_TRANSCODE_OUTPUT_RELATIVE_PATH = path.join(
    ".mediaplayerx",
    "transcoded",
  );

  private encoderCache: {
    expiresAtMs: number;
    encoders: Set<string>;
    muxers: Set<string>;
  } | null = null;

  private encoderLoadingPromise: Promise<{
    encoders: Set<string>;
    muxers: Set<string>;
  }> | null = null;

  constructor(
    private readonly dependencies: ManagementAudioTranscodeServiceDependencies,
  ) {}

  private resolveTaskConcurrency(totalCount: number): number {
    const rawValue = Number(this.dependencies.defaultConcurrency);
    const normalized = Number.isFinite(rawValue)
      ? Math.max(1, Math.min(2, Math.round(rawValue)))
      : 1;
    return Math.max(1, Math.min(totalCount, normalized));
  }

  private throwIfCancelled(options: RunAudioTranscodeTaskOptions): void {
    if (options.isCancelled?.() || options.signal?.aborted) {
      throw new AudioTranscodeCancelledError();
    }
  }

  private async runFfmpeg(
    args: string[],
    options: RunAudioTranscodeTaskOptions,
  ): Promise<{ code: number; stderr: string }> {
    const runSpawnTask = async (): Promise<{ code: number; stderr: string }> =>
      await new Promise((resolve, reject) => {
        const child = spawn(this.dependencies.ffmpegBin, args, {
          windowsHide: true,
          stdio: ["ignore", "ignore", "pipe"],
        });
        let stderr = "";
        let settled = false;

        const settle = (handler: () => void): void => {
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

    if (!this.dependencies.runWithCpuToken) {
      return await runSpawnTask();
    }

    return await this.dependencies.runWithCpuToken(
      "audio-transcode-ffmpeg",
      runSpawnTask,
    );
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
    return path.resolve(
      path.join(outputDir, `${sourceBaseName}${cueSuffix}${extension}`),
    );
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
      fileKeyToPath.set(
        normalizeAllowlistKey(path.resolve(value)),
        path.resolve(value),
      );
    }
    for (const value of outputFiles) {
      const resolved = path.resolve(value);
      fileKeyToPath.set(normalizeAllowlistKey(resolved), resolved);
    }
    this.dependencies.writeMusicImportSources({
      directories: Array.from(
        new Set(current.directories.map((value) => path.resolve(value))),
      ),
      files: Array.from(fileKeyToPath.values()).sort((left, right) =>
        left.localeCompare(right, "zh-CN"),
      ),
    });
  }

  private resolveLibraryRootDir(): string {
    return path.resolve(this.dependencies.rootDir);
  }

  private resolveDefaultOutputDir(): string {
    return path.resolve(
      this.resolveLibraryRootDir(),
      ManagementAudioTranscodeService.DEFAULT_TRANSCODE_OUTPUT_RELATIVE_PATH,
    );
  }

  private formatRequiredMuxer(preset: AudioTranscodePresetDto): string {
    return PRESET_REQUIRED_MUXERS[preset].join("/");
  }

  private async runFfmpegEncoderProbe(): Promise<Set<string>> {
    return await new Promise((resolve, reject) => {
      const child = spawn(
        this.dependencies.ffmpegBin,
        ["-hide_banner", "-encoders"],
        {
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
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
          reject(
            new Error(
              stderr.trim() ||
                `ffmpeg encoder probe exited with code ${code ?? -1}`,
            ),
          );
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

  private async runFfmpegMuxerProbe(): Promise<Set<string>> {
    return await new Promise((resolve, reject) => {
      const child = spawn(
        this.dependencies.ffmpegBin,
        ["-hide_banner", "-muxers"],
        {
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
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
          reject(
            new Error(
              stderr.trim() ||
                `ffmpeg muxer probe exited with code ${code ?? -1}`,
            ),
          );
          return;
        }

        const output = `${stdout}\n${stderr}`;
        const muxers = new Set<string>();
        for (const line of output.split(/\r?\n/)) {
          const matched = line.match(/^\s*[D.][E.]\s+([^\s]+)\s+/);
          if (!matched) {
            continue;
          }
          for (const name of matched[1].split(",")) {
            const normalized = name.trim().toLowerCase();
            if (!normalized) {
              continue;
            }
            muxers.add(normalized);
          }
        }
        resolve(muxers);
      });
    });
  }

  private async readCachedFfmpegCodecCapabilities(): Promise<{
    encoders: Set<string>;
    muxers: Set<string>;
  }> {
    const now = Date.now();
    if (this.encoderCache && this.encoderCache.expiresAtMs > now) {
      return {
        encoders: this.encoderCache.encoders,
        muxers: this.encoderCache.muxers,
      };
    }

    if (!this.encoderLoadingPromise) {
      this.encoderLoadingPromise = Promise.all([
        this.runFfmpegEncoderProbe(),
        this.runFfmpegMuxerProbe(),
      ])
        .then(([encoders, muxers]) => ({ encoders, muxers }))
        .finally(() => {
          this.encoderLoadingPromise = null;
        });
    }

    const capabilities = await this.encoderLoadingPromise;
    this.encoderCache = {
      expiresAtMs: now + ManagementAudioTranscodeService.ENCODER_CACHE_TTL_MS,
      encoders: capabilities.encoders,
      muxers: capabilities.muxers,
    };
    return capabilities;
  }

  private buildUnavailablePresetCapabilities(
    reason: "ffmpeg_unavailable" | "encoder_unavailable" | "muxer_unavailable",
  ): ReadAudioTranscodeCapabilitiesResponseDto["presets"] {
    return {
      flac: {
        available: false,
        required_encoder: PRESET_REQUIRED_ENCODER.flac,
        required_muxer: this.formatRequiredMuxer("flac"),
        reason,
      },
      alac: {
        available: false,
        required_encoder: PRESET_REQUIRED_ENCODER.alac,
        required_muxer: this.formatRequiredMuxer("alac"),
        reason,
      },
      wav: {
        available: false,
        required_encoder: PRESET_REQUIRED_ENCODER.wav,
        required_muxer: this.formatRequiredMuxer("wav"),
        reason,
      },
      opus: {
        available: false,
        required_encoder: PRESET_REQUIRED_ENCODER.opus,
        required_muxer: this.formatRequiredMuxer("opus"),
        reason,
      },
      aac: {
        available: false,
        required_encoder: PRESET_REQUIRED_ENCODER.aac,
        required_muxer: this.formatRequiredMuxer("aac"),
        reason,
      },
      mp3: {
        available: false,
        required_encoder: PRESET_REQUIRED_ENCODER.mp3,
        required_muxer: this.formatRequiredMuxer("mp3"),
        reason,
      },
    };
  }

  private buildPresetCapabilitiesFromCodecs(
    encoders: Set<string>,
    muxers: Set<string>,
  ): ReadAudioTranscodeCapabilitiesResponseDto["presets"] {
    const resolvePresetCapability = (
      preset: AudioTranscodePresetDto,
    ): ReadAudioTranscodeCapabilitiesResponseDto["presets"][AudioTranscodePresetDto] => {
      const hasEncoder = encoders.has(PRESET_REQUIRED_ENCODER[preset]);
      const requiredMuxers = PRESET_REQUIRED_MUXERS[preset];
      const hasMuxer = requiredMuxers.some((muxer) => muxers.has(muxer));
      const available = hasEncoder && hasMuxer;

      let reason: ReadAudioTranscodeCapabilitiesResponseDto["presets"][AudioTranscodePresetDto]["reason"] =
        null;
      if (!hasEncoder) {
        reason = "encoder_unavailable";
      } else if (!hasMuxer) {
        reason = "muxer_unavailable";
      }

      return {
        available,
        required_encoder: PRESET_REQUIRED_ENCODER[preset],
        required_muxer: this.formatRequiredMuxer(preset),
        reason,
      };
    };

    return {
      flac: resolvePresetCapability("flac"),
      alac: resolvePresetCapability("alac"),
      wav: resolvePresetCapability("wav"),
      opus: resolvePresetCapability("opus"),
      aac: resolvePresetCapability("aac"),
      mp3: resolvePresetCapability("mp3"),
    };
  }

  async readAudioTranscodeCapabilities(): Promise<ReadAudioTranscodeCapabilitiesResponseDto> {
    const runtimeDependencies =
      await this.dependencies.ensureRuntimeDependencies();
    const checkedAtMs = Date.now();
    const libraryRootDir = this.resolveLibraryRootDir();
    const defaultOutputDir = this.resolveDefaultOutputDir();
    if (!runtimeDependencies.ffmpeg) {
      return {
        enabled: false,
        ffmpeg_available: false,
        ffprobe_available: runtimeDependencies.ffprobe,
        library_root_dir: libraryRootDir,
        default_output_dir: defaultOutputDir,
        presets: this.buildUnavailablePresetCapabilities("ffmpeg_unavailable"),
        checked_at_ms: checkedAtMs,
      };
    }

    let presets: ReadAudioTranscodeCapabilitiesResponseDto["presets"];
    try {
      const codecCapabilities = await this.readCachedFfmpegCodecCapabilities();
      presets = this.buildPresetCapabilitiesFromCodecs(
        codecCapabilities.encoders,
        codecCapabilities.muxers,
      );
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
      library_root_dir: libraryRootDir,
      default_output_dir: defaultOutputDir,
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
      if (presetCapability.reason === "muxer_unavailable") {
        throw new Error(
          `audio transcode failed: preset ${request.preset} unavailable (missing muxer ${presetCapability.required_muxer})`,
        );
      }
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
      const sourcePath = path.resolve(
        filesystemAudio.media_locator.absolute_path,
      );
      if (!isPathAllowlisted(sourcePath, mediaAccessContext)) {
        continue;
      }
      selectedAudios.push(filesystemAudio);
    }

    if (selectedAudios.length <= 0) {
      throw new Error("audio transcode failed: no valid audio selected");
    }

    const requestOutputDir = request.output_dir?.trim() ?? "";
    const defaultOutputDir = capabilities.default_output_dir;
    const resolvedOutputDir = path.resolve(
      requestOutputDir.length > 0 ? requestOutputDir : defaultOutputDir,
    );

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

    const workerCount = this.resolveTaskConcurrency(selectedAudios.length);
    emitProgress(
      workerCount > 1
        ? `starting audio transcode task with concurrency=${workerCount}`
        : "starting audio transcode task",
    );

    const processSingleAudio = async (
      audio: FilesystemAudioItem,
    ): Promise<void> => {
      this.throwIfCancelled(options);
      const sourcePath = path.resolve(audio.media_locator.absolute_path);
      const targetDir = resolvedOutputDir;
      if (!isPathAllowlisted(targetDir, mediaAccessContext)) {
        processedCount += 1;
        failedCount += 1;
        if (!firstErrorDetail) {
          firstErrorDetail = `output directory outside allowlist: ${targetDir}`;
        }
        emitProgress(
          `failed ${path.basename(sourcePath)}: output outside allowlist`,
        );
        return;
      }
      await fs.mkdir(targetDir, { recursive: true });

      const outputPath = this.buildOutputPath(
        sourcePath,
        targetDir,
        request.preset,
        audio,
      );
      if (!request.overwrite) {
        const exists = await fs.stat(outputPath).catch(() => null);
        if (exists) {
          processedCount += 1;
          failedCount += 1;
          if (!firstErrorDetail) {
            firstErrorDetail = `destination already exists: ${outputPath}`;
          }
          emitProgress(
            `failed ${path.basename(sourcePath)}: destination already exists`,
          );
          return;
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
          throw new Error(
            result.stderr.trim() || `ffmpeg exited with code ${result.code}`,
          );
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
          error instanceof Error && error.message
            ? error.message
            : String(error);
        processedCount += 1;
        failedCount += 1;
        if (!firstErrorDetail) {
          firstErrorDetail = reason;
        }
        emitProgress(`failed ${path.basename(sourcePath)}: ${reason}`);
      }
    };

    let nextAudioIndex = 0;
    const pickNextAudio = (): FilesystemAudioItem | null => {
      if (nextAudioIndex >= selectedAudios.length) {
        return null;
      }
      const audio = selectedAudios[nextAudioIndex];
      nextAudioIndex += 1;
      return audio;
    };

    const runWorker = async (): Promise<void> => {
      while (true) {
        this.throwIfCancelled(options);
        const nextAudio = pickNextAudio();
        if (!nextAudio) {
          return;
        }
        await processSingleAudio(nextAudio);
      }
    };

    await Promise.all(
      Array.from({ length: workerCount }, async () => {
        await runWorker();
      }),
    );

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
