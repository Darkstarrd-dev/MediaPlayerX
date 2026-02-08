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

  const cached = await fs.stat(cachePath).catch(() => null)
  if (!cached || !cached.isFile()) {
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
    } finally {
      onRenderingEnd()
      if (hasPendingArchiveNormalization()) {
        scheduleArchiveNormalizationDrain(archiveNormalizeRecheckMs)
      }
    }
  }

  return {
    kind: 'filesystem',
    absolute_path: cachePath,
    extension: '.webp',
    media_type: 'image',
    mime_type: 'image/webp',
  }
}
