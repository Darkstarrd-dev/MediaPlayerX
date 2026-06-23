import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";

import type {
  MediaLocatorDto,
  ResolveMediaResourceRequestDto,
} from "../src/contracts/backend";
import { getSharpModule } from "./fileSystemRuntimeHelpers";
import { runTaskInProcess } from "./services/task-orchestrator/processTaskOrchestrator";

const THUMBNAIL_DEFAULT_MAX_EDGE = 320;
const THUMBNAIL_DEFAULT_QUALITY = 82;
const THUMBNAIL_MIN_EDGE = 64;
const THUMBNAIL_MAX_EDGE = 2048;
const THUMBNAIL_MIN_QUALITY = 1;
const THUMBNAIL_MAX_QUALITY = 100;
const THUMBNAIL_RENDER_WORKER_TIMEOUT_MS = 30_000;

// 限制全局并发缩略图生成任务数，防止 Sharp 峰值内存/线程池过载
const DEFAULT_MAX_CONCURRENT_THUMBNAIL_GENERATION = 4;
const DEFAULT_MAX_THUMBNAIL_QUEUE_SIZE = 64;
let maxConcurrentThumbnailGeneration =
  DEFAULT_MAX_CONCURRENT_THUMBNAIL_GENERATION;
let maxThumbnailQueueSize = DEFAULT_MAX_THUMBNAIL_QUEUE_SIZE;
let thumbnailRenderWorkerScriptPath: string | null = null;

// 全局任务队列与去重池
const pendingThumbnailTasks = new Map<
  string,
  Promise<MediaLocatorDto | null>
>();

interface QueuedThumbnailTask {
  execute: () => void;
  reject: (error: Error) => void;
}

const processingQueue: QueuedThumbnailTask[] = [];
let activeProcessingCount = 0;

function runWithConcurrencyLimit<T>(task: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const execute = async () => {
      activeProcessingCount += 1;
      try {
        const result = await task();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        activeProcessingCount -= 1;
        const next = processingQueue.shift();
        if (next) {
          next.execute();
        }
      }
    };

    if (activeProcessingCount < maxConcurrentThumbnailGeneration) {
      void execute();
    } else {
      // 队列溢出保护：超出限制时丢弃最老的任务
      if (processingQueue.length >= maxThumbnailQueueSize) {
        const evicted = processingQueue.shift();
        if (evicted) {
          evicted.reject(new Error("thumbnail queue overflow"));
        }
      }
      processingQueue.push({ execute, reject });
    }
  });
}

function applyRequestedGenerationConcurrency(
  rawValue: number | undefined,
): void {
  if (!Number.isFinite(rawValue)) {
    return;
  }

  const normalized = Math.max(1, Math.min(16, Math.round(rawValue)));
  if (normalized === maxConcurrentThumbnailGeneration) {
    return;
  }

  maxConcurrentThumbnailGeneration = normalized;
}

function applyRequestedQueueSize(rawValue: number | undefined): void {
  if (!Number.isFinite(rawValue)) {
    return;
  }

  const normalized = Math.max(16, Math.min(256, Math.round(rawValue)));
  if (normalized === maxThumbnailQueueSize) {
    return;
  }

  maxThumbnailQueueSize = normalized;
}

interface ThumbnailRenderOptions {
  maxEdge: number;
  quality: number;
}

function clampThumbnailMaxEdge(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return THUMBNAIL_DEFAULT_MAX_EDGE;
  }

  return Math.max(
    THUMBNAIL_MIN_EDGE,
    Math.min(THUMBNAIL_MAX_EDGE, Math.round(value)),
  );
}

function clampThumbnailQuality(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return THUMBNAIL_DEFAULT_QUALITY;
  }

  return Math.max(
    THUMBNAIL_MIN_QUALITY,
    Math.min(THUMBNAIL_MAX_QUALITY, Math.round(value)),
  );
}

function resolveThumbnailOptionsFromRequest(
  request: ResolveMediaResourceRequestDto,
): ThumbnailRenderOptions | null {
  if (request.preferred_variant !== "thumbnail") {
    return null;
  }
  if (request.locator.media_type !== "image") {
    return null;
  }

  return {
    maxEdge: clampThumbnailMaxEdge(request.thumbnail?.max_edge),
    quality: clampThumbnailQuality(request.thumbnail?.quality),
  };
}

function resolveThumbnailWorkerScriptPath(): string | null {
  if (thumbnailRenderWorkerScriptPath) {
    return thumbnailRenderWorkerScriptPath;
  }

  const mainEntry = process.argv[1] ? path.resolve(process.argv[1]) : "";
  const candidates: string[] = [];
  if (mainEntry) {
    candidates.push(
      path.join(path.dirname(mainEntry), "thumbnailRenderWorker.cjs"),
    );
  }
  candidates.push(
    path.join(process.cwd(), "dist-electron", "thumbnailRenderWorker.cjs"),
  );

  for (const candidate of candidates) {
    if (!existsSync(candidate)) {
      continue;
    }
    thumbnailRenderWorkerScriptPath = candidate;
    return candidate;
  }

  return null;
}

async function renderThumbnailWithProcessWorker(payload: {
  workerPath: string;
  sourceBuffer: Buffer;
  options: ThumbnailRenderOptions;
  tempPath: string;
  cachePath: string;
  onProgress?: (payload: {
    progress: number | null;
    message: string | null;
  }) => void;
}): Promise<boolean> {
  await runTaskInProcess<
    {
      sourceBuffer: Buffer;
      maxEdge: number;
      quality: number;
      tempPath: string;
      cachePath: string;
    },
    {
      cachePath?: string;
    }
  >({
    workerPath: payload.workerPath,
    taskName: "thumbnail-render",
    payload: {
      sourceBuffer: payload.sourceBuffer,
      maxEdge: payload.options.maxEdge,
      quality: payload.options.quality,
      tempPath: payload.tempPath,
      cachePath: payload.cachePath,
    },
    timeoutMs: THUMBNAIL_RENDER_WORKER_TIMEOUT_MS,
    heartbeatTimeoutMs: 12_000,
    maxRetries: 1,
    serialization: "advanced",
    onProgress: payload.onProgress,
    onAudit: ({ stage, attempt, maxRetries, message }) => {
      if (
        stage === "cancel-sent" ||
        stage === "timeout" ||
        stage === "heartbeat-timeout" ||
        stage === "retry-scheduled" ||
        stage === "failed"
      ) {
        console.warn("thumbnail render process audit", {
          cachePath: payload.cachePath,
          stage,
          attempt,
          maxRetries,
          message,
        });
      }
    },
  });

  return true;
}

async function renderThumbnailInProcess(payload: {
  sourceBuffer: Buffer;
  options: ThumbnailRenderOptions;
  tempPath: string;
  cachePath: string;
  onProgress?: (payload: {
    progress: number | null;
    message: string | null;
  }) => void;
}): Promise<boolean> {
  payload.onProgress?.({
    progress: 0.1,
    message: "thumbnail-render-bootstrap",
  });
  const sharpModule = await getSharpModule();
  if (!sharpModule?.default) {
    return false;
  }

  const sharp = sharpModule.default;
  payload.onProgress?.({ progress: 0.4, message: "thumbnail-render-encoding" });
  const generated = await sharp(payload.sourceBuffer, { failOn: "none" })
    .rotate()
    .resize({
      width: payload.options.maxEdge,
      height: payload.options.maxEdge,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: payload.options.quality })
    .toFile(payload.tempPath)
    .catch(() => null);

  if (!generated) {
    await fs.rm(payload.tempPath, { force: true });
    return false;
  }

  payload.onProgress?.({
    progress: 0.85,
    message: "thumbnail-render-moving-cache",
  });
  await fs.rename(payload.tempPath, payload.cachePath).catch(async () => {
    await fs.rm(payload.tempPath, { force: true });
  });
  payload.onProgress?.({ progress: 1, message: "thumbnail-render-complete" });
  return true;
}

async function computeThumbnailCachePath(
  locator: MediaLocatorDto,
  options: ThumbnailRenderOptions,
  thumbnailCacheRootDir: string,
): Promise<string | null> {
  if (locator.media_type !== "image") {
    return null;
  }

  if (locator.kind === "filesystem") {
    const stat = await fs.stat(locator.absolute_path).catch(() => null);
    if (!stat || !stat.isFile()) {
      return null;
    }

    const cacheKey = JSON.stringify({
      variant: "thumb",
      kind: locator.kind,
      path: locator.absolute_path,
      mtimeMs: stat.mtimeMs,
      size: stat.size,
      maxEdge: options.maxEdge,
      quality: options.quality,
    });
    const hash = createHash("sha1").update(cacheKey).digest("hex");
    return path.join(thumbnailCacheRootDir, `${hash}.webp`);
  }

  const archiveStat = await fs.stat(locator.archive_path).catch(() => null);
  if (!archiveStat || !archiveStat.isFile()) {
    return null;
  }

  const cacheKey = JSON.stringify({
    variant: "thumb",
    kind: locator.kind,
    archivePath: locator.archive_path,
    entry: locator.entry_name,
    mtimeMs: archiveStat.mtimeMs,
    size: archiveStat.size,
    maxEdge: options.maxEdge,
    quality: options.quality,
  });
  const hash = createHash("sha1").update(cacheKey).digest("hex");
  return path.join(thumbnailCacheRootDir, `${hash}.webp`);
}

interface ResolveThumbnailLocatorParams {
  locator: MediaLocatorDto;
  request: ResolveMediaResourceRequestDto;
  thumbnailCacheRootDir: string;
  ensureRuntimeDependencies: () => Promise<{ sharp: boolean }>;
  readImageBufferForThumbnail: (locator: MediaLocatorDto) => Promise<Buffer>;
  onRenderingStart: (taskKey: string) => void;
  onRenderingProgress: (
    taskKey: string,
    payload: { progress: number | null; message: string | null },
  ) => void;
  onRenderingEnd: (taskKey: string) => void;
  runWithCpuToken?: <T>(taskName: string, task: () => Promise<T>) => Promise<T>;
  hasPendingArchiveNormalization: () => boolean;
  scheduleArchiveNormalizationDrain: (delayMs: number) => void;
  archiveNormalizeRecheckMs: number;
}

export async function maybeResolveThumbnailLocator({
  locator,
  request,
  thumbnailCacheRootDir,
  ensureRuntimeDependencies,
  readImageBufferForThumbnail,
  onRenderingStart,
  onRenderingProgress,
  onRenderingEnd,
  runWithCpuToken,
  hasPendingArchiveNormalization,
  scheduleArchiveNormalizationDrain,
  archiveNormalizeRecheckMs,
}: ResolveThumbnailLocatorParams): Promise<MediaLocatorDto | null> {
  applyRequestedGenerationConcurrency(
    request.thumbnail?.generation_concurrency,
  );
  applyRequestedQueueSize(request.thumbnail?.queue_size);

  const options = resolveThumbnailOptionsFromRequest(request);
  if (!options) {
    return null;
  }
  if (locator.media_type !== "image") {
    return null;
  }

  const runtimeDependencies = await ensureRuntimeDependencies();
  if (!runtimeDependencies.sharp) {
    return null;
  }

  const cachePath = await computeThumbnailCachePath(
    locator,
    options,
    thumbnailCacheRootDir,
  );
  if (!cachePath) {
    return null;
  }

  // 1. 如果已有针对该 cachePath 的生成任务在跑，直接复用（去重）
  const pendingTask = pendingThumbnailTasks.get(cachePath);
  if (pendingTask) {
    return pendingTask;
  }

  // 2. 检查缓存是否存在
  const cached = await fs.stat(cachePath).catch(() => null);
  if (cached && cached.isFile()) {
    return {
      kind: "filesystem",
      absolute_path: cachePath,
      extension: ".webp",
      media_type: "image",
      mime_type: "image/webp",
    };
  }

  // 3. 构建新的生成任务，并加入限流队列
  const task = runWithConcurrencyLimit(async () => {
    try {
      const sourceBuffer = await readImageBufferForThumbnail(locator).catch(
        () => null,
      );
      if (!sourceBuffer || sourceBuffer.length === 0) {
        return null;
      }

      const generateTask = async () => {
        onRenderingStart(cachePath);
        try {
          await fs.mkdir(thumbnailCacheRootDir, { recursive: true });
          const tempPath = `${cachePath}.${process.pid}.${Date.now()}.tmp.webp`;
          onRenderingProgress(cachePath, {
            progress: 0.05,
            message: "thumbnail-read-complete",
          });

          const workerPath = resolveThumbnailWorkerScriptPath();
          const generated = workerPath
            ? await renderThumbnailWithProcessWorker({
                workerPath,
                sourceBuffer,
                options,
                tempPath,
                cachePath,
                onProgress: (payload) => {
                  onRenderingProgress(cachePath, payload);
                },
              }).catch((error) => {
                console.warn("thumbnail render process failed", {
                  reason:
                    error instanceof Error && error.message
                      ? error.message
                      : String(error),
                });
                onRenderingProgress(cachePath, {
                  progress: null,
                  message: "thumbnail-render-failed",
                });
                return false;
              })
            : await renderThumbnailInProcess({
                sourceBuffer,
                options,
                tempPath,
                cachePath,
                onProgress: (payload) => {
                  onRenderingProgress(cachePath, payload);
                },
              });

          if (!generated) {
            await fs.rm(tempPath, { force: true });
            return null;
          }

          onRenderingProgress(cachePath, {
            progress: 1,
            message: "thumbnail-ready",
          });

          return {
            kind: "filesystem",
            absolute_path: cachePath,
            extension: ".webp",
            media_type: "image",
            mime_type: "image/webp",
          } as MediaLocatorDto;
        } finally {
          onRenderingEnd(cachePath);
          if (hasPendingArchiveNormalization()) {
            scheduleArchiveNormalizationDrain(archiveNormalizeRecheckMs);
          }
        }
      };

      return runWithCpuToken
        ? await runWithCpuToken("thumbnail-render", generateTask)
        : await generateTask();
    } finally {
      // 任务完成后（无论成功失败），从 pending 表移除
      pendingThumbnailTasks.delete(cachePath);
    }
  });

  // 4. 注册到去重表
  pendingThumbnailTasks.set(cachePath, task);
  return task;
}
