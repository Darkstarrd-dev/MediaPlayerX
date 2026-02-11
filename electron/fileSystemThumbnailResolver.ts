import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'

import type { MediaLocatorDto, ResolveMediaResourceRequestDto } from '../src/contracts/backend'
import { getSharpModule } from './fileSystemRuntimeHelpers'

const THUMBNAIL_DEFAULT_MAX_EDGE = 320
const THUMBNAIL_DEFAULT_QUALITY = 82
const THUMBNAIL_MIN_EDGE = 64
const THUMBNAIL_MAX_EDGE = 2048
const THUMBNAIL_MIN_QUALITY = 50
const THUMBNAIL_MAX_QUALITY = 95

// 限制全局并发缩略图生成任务数，防止 Sharp 峰值内存/线程池过载
const MAX_CONCURRENT_THUMBNAIL_GENERATION = 4

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

    if (activeProcessingCount < MAX_CONCURRENT_THUMBNAIL_GENERATION) {
      void execute()
    } else {
      processingQueue.push(execute)
    }
  })
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
  hasPendingArchiveNormalization,
  scheduleArchiveNormalizationDrain,
  archiveNormalizeRecheckMs,
}: ResolveThumbnailLocatorParams): Promise<MediaLocatorDto | null> {
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

  const sharpModule = await getSharpModule()
  if (!sharpModule?.default) {
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

      onRenderingStart()
      try {
        await fs.mkdir(thumbnailCacheRootDir, { recursive: true })
        const tempPath = `${cachePath}.${process.pid}.${Date.now()}.tmp.webp`
        const sharp = sharpModule.default

        const generated = await sharp(sourceBuffer, { failOn: 'none' })
          .rotate()
          .resize({
            width: options.maxEdge,
            height: options.maxEdge,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: options.quality })
          .toFile(tempPath)
          .catch(() => null)

        if (!generated) {
          await fs.rm(tempPath, { force: true })
          return null
        }

        await fs.rename(tempPath, cachePath).catch(async () => {
          await fs.rm(tempPath, { force: true })
        })

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
    } finally {
      // 任务完成后（无论成功失败），从 pending 表移除
      pendingThumbnailTasks.delete(cachePath)
    }
  })

  // 4. 注册到去重表
  pendingThumbnailTasks.set(cachePath, task)
  return task
}
