import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

import {
  type EstimateVideoTranscodeOutputSizeRequestDto,
  type EstimateVideoTranscodeOutputSizeResponseDto,
  type ReadVideoTranscodeCapabilitiesResponseDto,
  type StartVideoTranscodeTaskRequestDto,
  type VideoItemDto,
} from "../../../src/contracts/backend";
import { isPathAllowlisted } from "../../fileSystemMediaAccessGuard";
import { type MediaAccessGuardContext } from "../../fileSystemMediaAccessGuard";
import { type RuntimeDependencySnapshot } from "./runtimeDependencyService";

interface VideoTranscodeProgressPayload {
  progress: number;
  total_count: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  message: string;
}

interface RunVideoTranscodeTaskOptions {
  isCancelled?: () => boolean;
  signal?: AbortSignal;
  onProgress?: (payload: VideoTranscodeProgressPayload) => void;
}

interface RunVideoTranscodeTaskResult {
  total_count: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  output_files: string[];
  first_error_detail: string | null;
}

interface ManagementVideoTranscodeServiceDependencies {
  rootDir: string;
  ffmpegBin: string;
  ensureRuntimeDependencies: () => Promise<RuntimeDependencySnapshot>;
  ensureStateLoaded: () => Promise<void>;
  ensureSnapshotLoaded: () => Promise<{ videos: VideoItemDto[] }>;
  buildMediaAccessContext: () => MediaAccessGuardContext;
  defaultConcurrency: number;
  runWithCpuToken?: <T>(taskName: string, task: () => Promise<T>) => Promise<T>;
}

interface FfmpegResult {
  code: number;
  stderr: string;
}

type VideoTranscodeParams = NonNullable<
  StartVideoTranscodeTaskRequestDto["params_override"]
>;

const CODEC_ENCODER: Record<string, string> = {
  h264: "libx264",
  h265: "libx265",
  vp9: "libvpx-vp9",
  av1: "libaom-av1",
  copy: "copy",
};

const CONTAINER_MUXERS: Record<string, string[]> = {
  mp4: ["mp4"],
  mkv: ["matroska"],
  webm: ["webm"],
};

class VideoTranscodeCancelledError extends Error {
  constructor() {
    super("video_transcode_cancelled");
    this.name = "VideoTranscodeCancelledError";
  }
}

type FilesystemVideoItem = VideoItemDto & {
  media_locator: {
    kind: "filesystem";
    absolute_path: string;
  };
};

export class ManagementVideoTranscodeService {
  static readonly DEFAULT_TRANSCODE_OUTPUT_RELATIVE_PATH = path.join(
    "transcoded",
    "video",
  );

  private ffmpegBinPath: string;

  private codecCache: {
    expiresAtMs: number;
    encoders: Set<string>;
    muxers: Set<string>;
  } | null = null;

  private codecLoadingPromise: Promise<{
    encoders: Set<string>;
    muxers: Set<string>;
  }> | null = null;

  constructor(
    private readonly dependencies: ManagementVideoTranscodeServiceDependencies,
  ) {
    this.ffmpegBinPath = dependencies.ffmpegBin;
  }

  overrideFfmpegBinPath(nextPath: string): void {
    this.ffmpegBinPath = nextPath;
    this.codecCache = null;
    this.codecLoadingPromise = null;
  }

  private resolveLibraryRootDir(): string {
    return path.resolve(this.dependencies.rootDir);
  }

  private resolveDefaultOutputDir(): string {
    return path.resolve(
      this.resolveLibraryRootDir(),
      ManagementVideoTranscodeService.DEFAULT_TRANSCODE_OUTPUT_RELATIVE_PATH,
    );
  }

  private throwIfCancelled(options: RunVideoTranscodeTaskOptions): void {
    if (options.isCancelled?.() || options.signal?.aborted) {
      throw new VideoTranscodeCancelledError();
    }
  }

  private resolveTaskConcurrency(totalCount: number): number {
    const normalizedDefault = Number.isFinite(
      this.dependencies.defaultConcurrency,
    )
      ? Math.max(1, Math.floor(this.dependencies.defaultConcurrency))
      : 1;
    return Math.max(1, Math.min(2, normalizedDefault, totalCount));
  }

  private resolveParamsOverride(
    request: StartVideoTranscodeTaskRequestDto,
  ): VideoTranscodeParams {
    return request.params_override ?? {};
  }

  private resolveOutputExt(container: "mp4" | "mkv" | "webm"): string {
    return container;
  }

  private buildOutputPath(
    sourcePath: string,
    outputDir: string,
    container: "mp4" | "mkv" | "webm",
  ): string {
    const baseName = path.basename(sourcePath, path.extname(sourcePath));
    return path.join(
      outputDir,
      `${baseName}.${this.resolveOutputExt(container)}`,
    );
  }

  private buildVideoFilterArgs(params: VideoTranscodeParams): string[] {
    const filters: string[] = [];
    if (typeof params.scale_long_edge_px === "number") {
      filters.push(
        `scale='if(gt(iw,ih),min(iw,${params.scale_long_edge_px}),-2)':'if(gt(ih,iw),min(ih,${params.scale_long_edge_px}),-2)'`,
      );
    }
    if (filters.length <= 0) {
      return [];
    }
    return ["-vf", filters.join(",")];
  }

  private buildCodecArgs(params: VideoTranscodeParams): string[] {
    const codec = params.video_codec ?? "h264";
    const qualityMode = params.quality_mode ?? "crf";
    const audioMode = params.audio_mode ?? "copy";
    const container = params.container ?? "mp4";

    const args: string[] = ["-c:v", CODEC_ENCODER[codec]];
    if (codec !== "copy") {
      if (
        typeof params.encoder_preset === "string" &&
        (codec === "h264" || codec === "h265")
      ) {
        args.push("-preset", params.encoder_preset);
      }
      if (qualityMode === "crf" && typeof params.crf === "number") {
        args.push("-crf", String(params.crf));
      }
      if (
        qualityMode === "bitrate" &&
        typeof params.video_bitrate_kbps === "number"
      ) {
        args.push("-b:v", `${params.video_bitrate_kbps}k`);
      }
    }

    if (typeof params.fps === "number") {
      args.push("-r", String(params.fps));
    }
    args.push(...this.buildVideoFilterArgs(params));

    if (audioMode === "drop") {
      args.push("-an");
    } else if (audioMode === "copy") {
      args.push("-c:a", "copy");
    } else {
      if (container === "webm") {
        args.push("-c:a", "libopus");
      } else {
        args.push("-c:a", "aac");
      }
      if (typeof params.audio_bitrate_kbps === "number") {
        args.push("-b:a", `${params.audio_bitrate_kbps}k`);
      }
    }

    if (params.faststart !== false && container === "mp4") {
      args.push("-movflags", "+faststart");
    }

    return args;
  }

  private resolveDurationMs(video: FilesystemVideoItem): number {
    const seconds = Number(video.duration_sec);
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return 0;
    }
    return Math.max(0, Math.floor(seconds * 1000));
  }

  private async runFfmpegWithProgress(
    args: string[],
    options: RunVideoTranscodeTaskOptions,
    onProgressMs: (outTimeMs: number) => void,
  ): Promise<FfmpegResult> {
    return await new Promise((resolve, reject) => {
      const child = spawn(this.ffmpegBinPath, args, {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stderr = "";
      let progressBuffer = "";

      const settleReject = (error: unknown): void => {
        reject(error);
      };

      const abortListener = (): void => {
        child.kill();
        settleReject(new VideoTranscodeCancelledError());
      };

      if (options.signal) {
        options.signal.addEventListener("abort", abortListener, { once: true });
      }

      const parseProgressLine = (line: string): void => {
        const trimmed = line.trim();
        if (!trimmed) {
          return;
        }
        const [key, value] = trimmed.split("=");
        if (key !== "out_time_ms") {
          return;
        }
        const outTimeMicroseconds = Number(value);
        if (!Number.isFinite(outTimeMicroseconds) || outTimeMicroseconds < 0) {
          return;
        }
        onProgressMs(Math.floor(outTimeMicroseconds / 1000));
      };

      child.stdout.on("data", (chunk) => {
        progressBuffer += String(chunk);
        let lineBreakIndex = progressBuffer.indexOf("\n");
        while (lineBreakIndex >= 0) {
          const line = progressBuffer.slice(0, lineBreakIndex);
          progressBuffer = progressBuffer.slice(lineBreakIndex + 1);
          parseProgressLine(line);
          lineBreakIndex = progressBuffer.indexOf("\n");
        }
      });

      child.stderr.on("data", (chunk) => {
        stderr += String(chunk);
      });

      child.on("error", (error) => {
        settleReject(error);
      });

      child.on("close", (code) => {
        if (options.signal) {
          options.signal.removeEventListener("abort", abortListener);
        }
        if (options.signal?.aborted || options.isCancelled?.()) {
          settleReject(new VideoTranscodeCancelledError());
          return;
        }
        if (progressBuffer.trim()) {
          parseProgressLine(progressBuffer);
        }
        resolve({ code: code ?? -1, stderr });
      });
    });
  }

  private async runFfmpegEncoderProbe(): Promise<Set<string>> {
    return await new Promise((resolve, reject) => {
      const child = spawn(this.ffmpegBinPath, ["-hide_banner", "-encoders"], {
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
      child.on("error", (error) => reject(error));
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
        const encoders = new Set<string>();
        const output = `${stdout}\n${stderr}`;
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
      const child = spawn(this.ffmpegBinPath, ["-hide_banner", "-muxers"], {
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
      child.on("error", (error) => reject(error));
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
        const muxers = new Set<string>();
        const output = `${stdout}\n${stderr}`;
        for (const line of output.split(/\r?\n/)) {
          const flagField = line.slice(0, 4).toUpperCase();
          if (!flagField.includes("E")) {
            continue;
          }
          const candidate = line.slice(4).trim().split(/\s+/)[0] ?? "";
          if (!candidate) {
            continue;
          }
          for (const value of candidate.split(",")) {
            const normalized = value.trim().toLowerCase();
            if (normalized) {
              muxers.add(normalized);
            }
          }
        }
        resolve(muxers);
      });
    });
  }

  private async readCachedCodecCapabilities(): Promise<{
    encoders: Set<string>;
    muxers: Set<string>;
  }> {
    const now = Date.now();
    if (this.codecCache && this.codecCache.expiresAtMs > now) {
      return {
        encoders: this.codecCache.encoders,
        muxers: this.codecCache.muxers,
      };
    }

    if (!this.codecLoadingPromise) {
      this.codecLoadingPromise = Promise.all([
        this.runFfmpegEncoderProbe(),
        this.runFfmpegMuxerProbe(),
      ])
        .then(([encoders, muxers]) => ({ encoders, muxers }))
        .finally(() => {
          this.codecLoadingPromise = null;
        });
    }

    const capabilities = await this.codecLoadingPromise;
    this.codecCache = {
      expiresAtMs: now + 30_000,
      encoders: capabilities.encoders,
      muxers: capabilities.muxers,
    };
    return capabilities;
  }

  async readVideoTranscodeCapabilities(): Promise<ReadVideoTranscodeCapabilitiesResponseDto> {
    const runtime = await this.dependencies.ensureRuntimeDependencies();
    const checkedAtMs = Date.now();
    const libraryRootDir = this.resolveLibraryRootDir();
    const defaultOutputDir = this.resolveDefaultOutputDir();

    const unavailable = {
      containers: {
        mp4: {
          available: false,
          required_muxer: "mp4",
          reason: "ffmpeg_unavailable" as const,
        },
        mkv: {
          available: false,
          required_muxer: "matroska",
          reason: "ffmpeg_unavailable" as const,
        },
        webm: {
          available: false,
          required_muxer: "webm",
          reason: "ffmpeg_unavailable" as const,
        },
      },
      video_codecs: {
        h264: {
          available: false,
          required_encoder: "libx264",
          reason: "ffmpeg_unavailable" as const,
        },
        h265: {
          available: false,
          required_encoder: "libx265",
          reason: "ffmpeg_unavailable" as const,
        },
        vp9: {
          available: false,
          required_encoder: "libvpx-vp9",
          reason: "ffmpeg_unavailable" as const,
        },
        av1: {
          available: false,
          required_encoder: "libaom-av1",
          reason: "ffmpeg_unavailable" as const,
        },
        copy: {
          available: false,
          required_encoder: "copy",
          reason: "ffmpeg_unavailable" as const,
        },
      },
    };

    if (!runtime.ffmpeg) {
      return {
        enabled: false,
        ffmpeg_available: false,
        ffprobe_available: runtime.ffprobe,
        library_root_dir: libraryRootDir,
        default_output_dir: defaultOutputDir,
        containers: unavailable.containers,
        video_codecs: unavailable.video_codecs,
        checked_at_ms: checkedAtMs,
      };
    }

    const codecs = await this.readCachedCodecCapabilities().catch(() => null);
    if (!codecs) {
      return {
        enabled: false,
        ffmpeg_available: runtime.ffmpeg,
        ffprobe_available: runtime.ffprobe,
        library_root_dir: libraryRootDir,
        default_output_dir: defaultOutputDir,
        containers: {
          mp4: {
            available: false,
            required_muxer: "mp4",
            reason: "muxer_unavailable",
          },
          mkv: {
            available: false,
            required_muxer: "matroska",
            reason: "muxer_unavailable",
          },
          webm: {
            available: false,
            required_muxer: "webm",
            reason: "muxer_unavailable",
          },
        },
        video_codecs: {
          h264: {
            available: false,
            required_encoder: "libx264",
            reason: "encoder_unavailable",
          },
          h265: {
            available: false,
            required_encoder: "libx265",
            reason: "encoder_unavailable",
          },
          vp9: {
            available: false,
            required_encoder: "libvpx-vp9",
            reason: "encoder_unavailable",
          },
          av1: {
            available: false,
            required_encoder: "libaom-av1",
            reason: "encoder_unavailable",
          },
          copy: {
            available: true,
            required_encoder: "copy",
            reason: null,
          },
        },
        checked_at_ms: checkedAtMs,
      };
    }

    const containers = {
      mp4: {
        available: CONTAINER_MUXERS.mp4.some((muxer) =>
          codecs.muxers.has(muxer),
        ),
        required_muxer: "mp4",
        reason: null as "muxer_unavailable" | null,
      },
      mkv: {
        available: CONTAINER_MUXERS.mkv.some((muxer) =>
          codecs.muxers.has(muxer),
        ),
        required_muxer: "matroska",
        reason: null as "muxer_unavailable" | null,
      },
      webm: {
        available: CONTAINER_MUXERS.webm.some((muxer) =>
          codecs.muxers.has(muxer),
        ),
        required_muxer: "webm",
        reason: null as "muxer_unavailable" | null,
      },
    };

    if (!containers.mp4.available) {
      containers.mp4.reason = "muxer_unavailable";
    }
    if (!containers.mkv.available) {
      containers.mkv.reason = "muxer_unavailable";
    }
    if (!containers.webm.available) {
      containers.webm.reason = "muxer_unavailable";
    }

    const video_codecs = {
      h264: {
        available: codecs.encoders.has("libx264"),
        required_encoder: "libx264",
        reason: null as "encoder_unavailable" | null,
      },
      h265: {
        available: codecs.encoders.has("libx265"),
        required_encoder: "libx265",
        reason: null as "encoder_unavailable" | null,
      },
      vp9: {
        available: codecs.encoders.has("libvpx-vp9"),
        required_encoder: "libvpx-vp9",
        reason: null as "encoder_unavailable" | null,
      },
      av1: {
        available: codecs.encoders.has("libaom-av1"),
        required_encoder: "libaom-av1",
        reason: null as "encoder_unavailable" | null,
      },
      copy: {
        available: true,
        required_encoder: "copy",
        reason: null,
      },
    };

    if (!video_codecs.h264.available) {
      video_codecs.h264.reason = "encoder_unavailable";
    }
    if (!video_codecs.h265.available) {
      video_codecs.h265.reason = "encoder_unavailable";
    }
    if (!video_codecs.vp9.available) {
      video_codecs.vp9.reason = "encoder_unavailable";
    }
    if (!video_codecs.av1.available) {
      video_codecs.av1.reason = "encoder_unavailable";
    }

    const enabled =
      (containers.mp4.available ||
        containers.mkv.available ||
        containers.webm.available) &&
      (video_codecs.h264.available ||
        video_codecs.h265.available ||
        video_codecs.vp9.available ||
        video_codecs.av1.available ||
        video_codecs.copy.available);

    return {
      enabled,
      ffmpeg_available: runtime.ffmpeg,
      ffprobe_available: runtime.ffprobe,
      library_root_dir: libraryRootDir,
      default_output_dir: defaultOutputDir,
      containers,
      video_codecs,
      checked_at_ms: checkedAtMs,
    };
  }

  async runVideoTranscodeTask(
    request: StartVideoTranscodeTaskRequestDto,
    options: RunVideoTranscodeTaskOptions = {},
  ): Promise<RunVideoTranscodeTaskResult> {
    await this.dependencies.ensureStateLoaded();
    const capabilities = await this.readVideoTranscodeCapabilities();
    if (!capabilities.ffmpeg_available) {
      throw new Error("video transcode failed: ffmpeg unavailable");
    }

    const params = this.resolveParamsOverride(request);
    const container = params.container ?? "mp4";
    const codec = params.video_codec ?? "h264";
    const containerCapability = capabilities.containers[container];
    const codecCapability = capabilities.video_codecs[codec];
    if (!containerCapability.available) {
      throw new Error(
        `video transcode failed: container ${container} unavailable (missing muxer ${containerCapability.required_muxer})`,
      );
    }
    if (!codecCapability.available) {
      throw new Error(
        `video transcode failed: video codec ${codec} unavailable (missing encoder ${codecCapability.required_encoder})`,
      );
    }

    const snapshot = await this.dependencies.ensureSnapshotLoaded();
    const videoById = new Map<string, VideoItemDto>(
      (snapshot.videos ?? []).map((video) => [video.id, video]),
    );
    const mediaAccessContext = this.dependencies.buildMediaAccessContext();
    const normalizedVideoIds = Array.from(
      new Set(request.video_ids.map((value) => value.trim()).filter(Boolean)),
    );

    const selectedVideos: FilesystemVideoItem[] = [];
    for (const videoId of normalizedVideoIds) {
      const video = videoById.get(videoId);
      if (!video || video.media_locator.kind !== "filesystem") {
        continue;
      }
      const sourcePath = path.resolve(video.media_locator.absolute_path);
      if (!isPathAllowlisted(sourcePath, mediaAccessContext)) {
        continue;
      }
      selectedVideos.push(video as FilesystemVideoItem);
    }
    if (selectedVideos.length <= 0) {
      throw new Error("video transcode failed: no valid video selected");
    }

    const requestOutputDir = request.output_dir?.trim() ?? "";
    const resolvedOutputDir = path.resolve(
      requestOutputDir.length > 0
        ? requestOutputDir
        : capabilities.default_output_dir,
    );
    await fs.mkdir(resolvedOutputDir, { recursive: true });

    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    let firstErrorDetail: string | null = null;
    const outputFiles: string[] = [];

    const totalCount = selectedVideos.length;
    const emitProgress = (
      message: string,
      activeFileProgress: number,
    ): void => {
      const boundedFileProgress = Math.max(0, Math.min(1, activeFileProgress));
      const overallProgress =
        totalCount > 0
          ? Math.max(
              0,
              Math.min(1, (processedCount + boundedFileProgress) / totalCount),
            )
          : 0;
      options.onProgress?.({
        progress: overallProgress,
        total_count: totalCount,
        processed_count: processedCount,
        success_count: successCount,
        failed_count: failedCount,
        message,
      });
    };

    const processSingleVideo = async (
      video: FilesystemVideoItem,
    ): Promise<void> => {
      this.throwIfCancelled(options);
      const sourcePath = path.resolve(video.media_locator.absolute_path);
      if (!isPathAllowlisted(resolvedOutputDir, mediaAccessContext)) {
        processedCount += 1;
        failedCount += 1;
        if (!firstErrorDetail) {
          firstErrorDetail = `output directory outside allowlist: ${resolvedOutputDir}`;
        }
        emitProgress(
          `failed ${path.basename(sourcePath)}: output outside allowlist`,
          0,
        );
        return;
      }

      const outputPath = this.buildOutputPath(
        sourcePath,
        resolvedOutputDir,
        container,
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
            0,
          );
          return;
        }
      }

      const args: string[] = [
        "-hide_banner",
        "-nostdin",
        request.overwrite ? "-y" : "-n",
        "-i",
        sourcePath,
        "-progress",
        "pipe:1",
        "-nostats",
        ...this.buildCodecArgs(params),
        outputPath,
      ];

      const durationMs = this.resolveDurationMs(video);
      try {
        const run = async (): Promise<FfmpegResult> => {
          return await this.runFfmpegWithProgress(
            args,
            options,
            (outTimeMs) => {
              const fileProgress =
                durationMs > 0
                  ? Math.max(0, Math.min(1, outTimeMs / durationMs))
                  : 0;
              emitProgress(
                `transcoding ${path.basename(sourcePath)}`,
                fileProgress,
              );
            },
          );
        };

        const result = this.dependencies.runWithCpuToken
          ? await this.dependencies.runWithCpuToken("video-transcode", run)
          : await run();
        if (result.code !== 0) {
          throw new Error(
            result.stderr.trim() || `ffmpeg exited with code ${result.code}`,
          );
        }
        outputFiles.push(outputPath);
        processedCount += 1;
        successCount += 1;
        emitProgress(`transcoded ${path.basename(sourcePath)}`, 0);
      } catch (error) {
        if (error instanceof VideoTranscodeCancelledError) {
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
        emitProgress(`failed ${path.basename(sourcePath)}: ${reason}`, 0);
      }
    };

    let nextIndex = 0;
    const pickNextVideo = (): FilesystemVideoItem | null => {
      if (nextIndex >= selectedVideos.length) {
        return null;
      }
      const video = selectedVideos[nextIndex];
      nextIndex += 1;
      return video;
    };

    const workerCount = this.resolveTaskConcurrency(selectedVideos.length);
    await Promise.all(
      Array.from({ length: workerCount }, async () => {
        while (true) {
          this.throwIfCancelled(options);
          const nextVideo = pickNextVideo();
          if (!nextVideo) {
            return;
          }
          await processSingleVideo(nextVideo);
        }
      }),
    );

    emitProgress("video transcode task finished", 0);
    return {
      total_count: selectedVideos.length,
      processed_count: processedCount,
      success_count: successCount,
      failed_count: failedCount,
      output_files: outputFiles,
      first_error_detail: firstErrorDetail,
    };
  }

  async estimateVideoTranscodeOutputSize(
    request: EstimateVideoTranscodeOutputSizeRequestDto,
  ): Promise<EstimateVideoTranscodeOutputSizeResponseDto> {
    await this.dependencies.ensureStateLoaded();
    const snapshot = await this.dependencies.ensureSnapshotLoaded();
    const videoById = new Map<string, VideoItemDto>(
      (snapshot.videos ?? []).map((video) => [video.id, video]),
    );
    const mediaAccessContext = this.dependencies.buildMediaAccessContext();
    const normalizedVideoIds = Array.from(
      new Set(request.video_ids.map((value) => value.trim()).filter(Boolean)),
    );

    const selectedVideos: FilesystemVideoItem[] = [];
    for (const videoId of normalizedVideoIds) {
      const video = videoById.get(videoId);
      if (!video || video.media_locator.kind !== "filesystem") {
        continue;
      }
      const sourcePath = path.resolve(video.media_locator.absolute_path);
      if (!isPathAllowlisted(sourcePath, mediaAccessContext)) {
        continue;
      }
      selectedVideos.push(video as FilesystemVideoItem);
    }

    if (selectedVideos.length <= 0) {
      throw new Error("video transcode estimate failed: no valid video selected");
    }

    const params = this.resolveParamsOverride({
      video_ids: request.video_ids,
      params_override: request.params_override,
    });
    const audioMode = params.audio_mode ?? "copy";
    const qualityMode = params.quality_mode ?? "crf";
    const codec = params.video_codec ?? "h264";

    let sourceTotalBytes = 0;
    let totalDurationSec = 0;
    for (const video of selectedVideos) {
      const sizeBytes = Math.max(0, Math.round(video.size_mb * 1024 * 1024));
      sourceTotalBytes += sizeBytes;
      totalDurationSec += Math.max(0, Number(video.duration_sec) || 0);
    }

    const safeDurationSec = Math.max(1, totalDurationSec);
    const sourceTotalKbps = (sourceTotalBytes * 8) / safeDurationSec / 1000;
    const estimatedSourceAudioKbps =
      audioMode === "drop" ? 0 : Math.max(64, Math.min(320, sourceTotalKbps * 0.12));
    const sourceVideoKbps = Math.max(100, sourceTotalKbps - estimatedSourceAudioKbps);

    const explicitAudioKbps =
      audioMode === "drop"
        ? 0
        : audioMode === "encode"
          ? Math.max(16, params.audio_bitrate_kbps ?? 128)
          : estimatedSourceAudioKbps;

    const overheadFactor = 1.03;
    let estimatedVideoKbps = sourceVideoKbps;
    let method: EstimateVideoTranscodeOutputSizeResponseDto["method"] =
      "crf_heuristic";
    let confidence: EstimateVideoTranscodeOutputSizeResponseDto["confidence"] =
      "medium";
    let rangeFactorLow = 0.65;
    let rangeFactorHigh = 1.35;

    if (qualityMode === "copy" || codec === "copy") {
      method = "bitrate_formula";
      confidence = "high";
      estimatedVideoKbps = sourceVideoKbps;
      rangeFactorLow = 0.95;
      rangeFactorHigh = 1.08;
    } else if (
      qualityMode === "bitrate" &&
      typeof params.video_bitrate_kbps === "number"
    ) {
      method = "bitrate_formula";
      confidence = "high";
      estimatedVideoKbps = Math.max(100, params.video_bitrate_kbps);
      rangeFactorLow = 0.92;
      rangeFactorHigh = 1.08;
    } else {
      const codecEfficiency =
        codec === "h265"
          ? 0.68
          : codec === "vp9"
            ? 0.6
            : codec === "av1"
              ? 0.52
              : 0.9;
      const crf = typeof params.crf === "number" ? params.crf : 23;
      const crfFactor = Math.pow(2, (23 - crf) / 6);
      estimatedVideoKbps = Math.max(
        100,
        Math.min(sourceVideoKbps * 1.3, sourceVideoKbps * codecEfficiency * crfFactor),
      );
    }

    const estimatedBytes = Math.max(
      0,
      Math.round(
        ((estimatedVideoKbps + explicitAudioKbps) * 1000 * safeDurationSec * overheadFactor) /
          8,
      ),
    );
    const lowBytes = Math.max(0, Math.round(estimatedBytes * rangeFactorLow));
    const highBytes = Math.max(lowBytes, Math.round(estimatedBytes * rangeFactorHigh));

    return {
      source_total_bytes: sourceTotalBytes,
      estimated_bytes: estimatedBytes,
      range: {
        low_bytes: lowBytes,
        high_bytes: highBytes,
      },
      method,
      confidence,
      target_video_count: selectedVideos.length,
      details: {
        duration_sec: safeDurationSec,
        assumed_video_bitrate_kbps: Number(estimatedVideoKbps.toFixed(2)),
        audio_bitrate_kbps:
          audioMode === "drop" ? 0 : Number(explicitAudioKbps.toFixed(2)),
        overhead_factor: overheadFactor,
      },
    };
  }
}
