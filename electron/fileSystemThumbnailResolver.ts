import { createHash } from 'node:crypto'
import { fork } from 'node:child_process'
import { existsSync } from 'node:fs'
import { promises as fs } from 'node:fs'
import path from 'node:path'

import type { MediaLocatorDto, ResolveMediaResourceRequestDto } from '../src/contracts/backend'
import { getSharpModule } from './fileSystemRuntimeHelpers'

const THUMBNAIL_DEFAULT_MAX_EDGE = 320
const THUMBNAIL_DEFAULT_QUALITY = 82
const THUMBNAIL_MIN_EDGE = 64
const THUMBNAIL_MAX_EDGE = 2048
const THUMBNAIL_MIN_QUALITY = 1
const THUMBNAIL_MAX_QUALITY = 100
const THUMBNAIL_RENDER_WORKER_TIMEOUT_MS = 30_000

// 限制全局并发缩略图生成任务数，防止 Sharp 峰值内存/线程池过载
const DEFAULT_MAX_CONCURRENT_THUMBNAIL_GENERATION = 4
let maxConcurrentThumbnailGeneration = DEFAULT_MAX_CONCURRENT_THUMBNAIL_GENERATION
let thumbnailRenderWorkerScriptPath: string | null = null

// 全局任务队列与去重池
const pendingThumbnailTasks = new Map<string, Promise<MediaLocatorDto | null>>()
const processingQueue: Array<() => void> = []
let activeProcessingCount = 0

function runWithConcurrencyLimit<T>(task: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const execute = async () => {
      activeProcessingCount += 1
      try {
        const result = await task()
        resolve(result)
      } catch (error) {
        reject(error)
      } finally {
        activeProcessingCount -= 1
        const next = processingQueue.shift()
        if (next) {
          next()
        }
      }
    }

    if (activeProcessingCount < maxConcurrentThumbnailGeneration) {
      void execute()
    } else {
      processingQueue.push(execute)
    }
  })
}

function applyRequestedGenerationConcurrency(rawValue: number | undefined): void {
  if (!Number.isFinite(rawValue)) {
    return
  }

  const normalized = Math.max(1, Math.min(16, Math.round(rawValue)))
  if (normalized === maxConcurrentThumbnailGeneration) {
    return
  }

  maxConcurrentThumbnailGeneration = normalized
}

interface ThumbnailRenderOptions {
  maxEdge: number
  quality: number
}

function clampThumbnailMaxEdge(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return THUMBNAIL_DEFAULT_MAX_EDGE
  }

  return Math.max(THUMBNAIL_MIN_EDGE, Math.min(THUMBNAIL_MAX_EDGE, Math.round(value)))
}

function clampThumbnailQuality(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return THUMBNAIL_DEFAULT_QUALITY
  }

  return Math.max(THUMBNAIL_MIN_QUALITY, Math.min(THUMBNAIL_MAX_QUALITY, Math.round(value)))
}

function resolveThumbnailOptionsFromRequest(request: ResolveMediaResourceRequestDto): ThumbnailRenderOptions | null {
  if (request.preferred_variant !== 'thumbnail') {
    return null
  }
  if (request.locator.media_type !== 'image') {
    return null
  }

  return {
    maxEdge: clampThumbnailMaxEdge(request.thumbnail?.max_edge),
    quality: clampThumbnailQuality(request.thumbnail?.quality),
  }
}

function resolveThumbnailWorkerScriptPath(): string | null {
  if (thumbnailRenderWorkerScriptPath) {
    return thumbnailRenderWorkerScriptPath
  }

  const mainEntry = process.argv[1] ? path.resolve(process.argv[1]) : ''
  const candidates: string[] = []
  if (mainEntry) {
    candidates.push(path.join(path.dirname(mainEntry), 'thumbnailRenderWorker.cjs'))
  }
  candidates.push(path.join(process.cwd(), 'dist-electron', 'thumbnailRenderWorker.cjs'))

  for (const candidate of candidates) {
    if (!existsSync(candidate)) {
      continue
    }
    thumbnailRenderWorkerScriptPath = candidate
    return candidate
  }

  return null
}

async function renderThumbnailWithProcessWorker(payload: {
  workerPath: string
  sourceBuffer: Buffer
  options: ThumbnailRenderOptions
  tempPath: string
  cachePath: string
}): Promise<boolean> {
  return await new Promise<boolean>((resolve, reject) => {
    const child = fork(payload.workerPath, [], {
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      serialization: 'advanced',
    })

    let settled = false
    const timeoutId = setTimeout(() => {
      finish(new Error('thumbnail render process timeout'), false)
      child.kill('SIGKILL')
    }, THUMBNAIL_RENDER_WORKER_TIMEOUT_MS)
    timeoutId.unref?.()

    const finish = (error: Error | null, result: boolean) => {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timeoutId)
      if (error) {
        reject(error)
      } else {
        resolve(result)
      }
    }

    child.once('message', (rawPayload: unknown) => {
      const message = rawPayload as { ok?: boolean; error?: string }
      if (message?.ok) {
        finish(null, true)
        return
      }
      finish(new Error(message?.error ?? 'thumbnail render process failed'), false)
    })

    child.once('error', (error) => {
      finish(error, false)
    })

    child.once('exit', (code, signal) => {
      if (settled) {
        return
      }
      if (code === 0 && !signal) {
        finish(null, true)
        return
      }
      finish(new Error(`thumbnail render process exit ${code ?? 'null'} signal ${signal ?? 'none'}`), false)
    })

    if (!child.connected) {
      finish(new Error('thumbnail render process ipc disconnected'), false)
      return
    }

    try {
      child.send({
        sourceBuffer: payload.sourceBuffer,
        maxEdge: payload.options.maxEdge,
        quality: payload.options.quality,
        tempPath: payload.tempPath,
        cachePath: payload.cachePath,
      })
    } catch (error) {
      const reason = error instanceof Error && error.message ? error.message : String(error)
      finish(new Error(`thumbnail render process send failed: ${reason}`), false)
    }
  })
}

async function renderThumbnailInProcess(payload: {
  sourceBuffer: Buffer
  options: ThumbnailRenderOptions
  tempPath: string
  cachePath: string
}): Promise<boolean> {
  const sharpModule = await getSharpModule()
  if (!sharpModule?.default) {
    return false
  }

  const sharp = sharpModule.default
  const generated = await sharp(payload.sourceBuffer, { failOn: 'none' })
    .rotate()
    .resize({
      width: payload.options.maxEdge,
      height: payload.options.maxEdge,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: payload.options.quality })
    .toFile(payload.tempPath)
    .catch(() => null)

  if (!generated) {
    await fs.rm(payload.tempPath, { force: true })
    return false
  }

  await fs.rename(payload.tempPath, payload.cachePath).catch(async () => {
    await fs.rm(payload.tempPath, { force: true })
  })
  return true
}

async function computeThumbnailCachePath(
  locator: MediaLocatorDto,
  options: ThumbnailRenderOptions,
  thumbnailCacheRootDir: string,
): Promise<string | null> {
  if (locator.media_type !== 'image') {
    return null
  }

  if (locator.kind === 'filesystem') {
    const stat = await fs.stat(locator.absolute_path).catch(() => null)
    if (!stat || !stat.isFile()) {
      return null
    }

    const cacheKey = JSON.stringify({
      variant: 'thumb',
      kind: locator.kind,
      path: locator.absolute_path,
      mtimeMs: stat.mtimeMs,
      size: stat.size,
      maxEdge: options.maxEdge,
      quality: options.quality,
    })
    const hash = createHash('sha1').update(cacheKey).digest('hex')
    return path.join(thumbnailCacheRootDir, `${hash}.webp`)
  }

  const archiveStat = await fs.stat(locator.archive_path).catch(() => null)
  if (!archiveStat || !archiveStat.isFile()) {
    return null
  }

  const cacheKey = JSON.stringify({
    variant: 'thumb',
    kind: locator.kind,
    archivePath: locator.archive_path,
    entry: locator.entry_name,
    mtimeMs: archiveStat.mtimeMs,
    size: archiveStat.size,
    maxEdge: options.maxEdge,
    quality: options.quality,
  })
  const hash = createHash('sha1').update(cacheKey).digest('hex')
  return path.join(thumbnailCacheRootDir, `${hash}.webp`)
}

interface ResolveThumbnailLocatorParams {
  locator: MediaLocatorDto
  request: ResolveMediaResourceRequestDto
  thumbnailCacheRootDir: string
  ensureRuntimeDependencies: () => Promise<{ sharp: boolean }>
  readImageBufferForThumbnail: (locator: MediaLocatorDto) => Promise<Buffer>
  onRenderingStart: () => void
  onRenderingEnd: () => void
  runWithCpuToken?: <T>(taskName: string, task: () => Promise<T>) => Promise<T>
  hasPendingArchiveNormalization: () => boolean
  scheduleArchiveNormalizationDrain: (delayMs: number) => void
  archiveNormalizeRecheckMs: number
}

export async function maybeResolveThumbnailLocator({
  locator,
  request,
  thumbnailCacheRootDir,
  ensureRuntimeDependencies,
  readImageBufferForThumbnail,
  onRenderingStart,
  onRenderingEnd,
  runWithCpuToken,
  hasPendingArchiveNormalization,
  scheduleArchiveNormalizationDrain,
  archiveNormalizeRecheckMs,
}: ResolveThumbnailLocatorParams): Promise<MediaLocatorDto | null> {
  applyRequestedGenerationConcurrency(request.thumbnail?.generation_concurrency)

  const options = resolveThumbnailOptionsFromRequest(request)
  if (!options) {
    return null
  }
  if (locator.media_type !== 'image') {
    return null
  }

  const runtimeDependencies = await ensureRuntimeDependencies()
  if (!runtimeDependencies.sharp) {
    return null
  }

  const cachePath = await computeThumbnailCachePath(locator, options, thumbnailCacheRootDir)
  if (!cachePath) {
    return null
  }

  // 1. 如果已有针对该 cachePath 的生成任务在跑，直接复用（去重）
  const pendingTask = pendingThumbnailTasks.get(cachePath)
  if (pendingTask) {
    return pendingTask
  }

  // 2. 检查缓存是否存在
  const cached = await fs.stat(cachePath).catch(() => null)
  if (cached && cached.isFile()) {
    return {
      kind: 'filesystem',
      absolute_path: cachePath,
      extension: '.webp',
      media_type: 'image',
      mime_type: 'image/webp',
    }
  }

  // 3. 构建新的生成任务，并加入限流队列
  const task = runWithConcurrencyLimit(async () => {
    try {
      const sourceBuffer = await readImageBufferForThumbnail(locator).catch(() => null)
      if (!sourceBuffer || sourceBuffer.length === 0) {
        return null
      }

      const generateTask = async () => {
        onRenderingStart()
        try {
          await fs.mkdir(thumbnailCacheRootDir, { recursive: true })
          const tempPath = `${cachePath}.${process.pid}.${Date.now()}.tmp.webp`

          const workerPath = resolveThumbnailWorkerScriptPath()
          const generated = workerPath
            ? await renderThumbnailWithProcessWorker({
                workerPath,
                sourceBuffer,
                options,
                tempPath,
                cachePath,
              }).catch(() => false)
            : await renderThumbnailInProcess({
                sourceBuffer,
                options,
                tempPath,
                cachePath,
              })

          if (!generated) {
            await fs.rm(tempPath, { force: true })
            return null
          }

          return {
            kind: 'filesystem',
            absolute_path: cachePath,
            extension: '.webp',
            media_type: 'image',
            mime_type: 'image/webp',
          } as MediaLocatorDto
        } finally {
          onRenderingEnd()
          if (hasPendingArchiveNormalization()) {
            scheduleArchiveNormalizationDrain(archiveNormalizeRecheckMs)
          }
        }
      }

      return runWithCpuToken
        ? await runWithCpuToken('thumbnail-render', generateTask)
        : await generateTask()
    } finally {
      // 任务完成后（无论成功失败），从 pending 表移除
      pendingThumbnailTasks.delete(cachePath)
    }
  })

  // 4. 注册到去重表
  pendingThumbnailTasks.set(cachePath, task)
  return task
}
