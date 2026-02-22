import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'

import type { MediaLocatorDto, ResolveMediaResourceRequestDto } from '../src/contracts/backend'
import { getSharpModule } from './fileSystemRuntimeHelpers'

const FULLSCREEN_DEFAULT_TARGET_WIDTH = 1920
const FULLSCREEN_DEFAULT_TARGET_HEIGHT = 1080
const FULLSCREEN_MIN_TARGET_WIDTH = 1
const FULLSCREEN_MAX_TARGET_WIDTH = 7680
const FULLSCREEN_MIN_TARGET_HEIGHT = 1
const FULLSCREEN_MAX_TARGET_HEIGHT = 4320
const FULLSCREEN_WEBP_QUALITY = 95
const DEFAULT_MAX_CONCURRENT_FULLSCREEN_GENERATION = 2

const pendingFullscreenTasks = new Map<string, Promise<MediaLocatorDto | null>>()
const processingQueue: Array<() => void> = []
let activeProcessingCount = 0

type FullscreenKernel = 'lanczos3' | 'mitchell' | 'nearest' | 'cubic'

interface FullscreenResizeOptions {
  targetWidth: number
  targetHeight: number
  kernel: FullscreenKernel
}

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

    if (activeProcessingCount < DEFAULT_MAX_CONCURRENT_FULLSCREEN_GENERATION) {
      void execute()
    } else {
      processingQueue.push(execute)
    }
  })
}

function clampTargetWidth(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return FULLSCREEN_DEFAULT_TARGET_WIDTH
  }
  return Math.max(FULLSCREEN_MIN_TARGET_WIDTH, Math.min(FULLSCREEN_MAX_TARGET_WIDTH, Math.round(value)))
}

function clampTargetHeight(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return FULLSCREEN_DEFAULT_TARGET_HEIGHT
  }
  return Math.max(FULLSCREEN_MIN_TARGET_HEIGHT, Math.min(FULLSCREEN_MAX_TARGET_HEIGHT, Math.round(value)))
}

function normalizeKernel(value: ResolveMediaResourceRequestDto['fullscreen_resize'] extends { kernel: infer K } ? K : never): FullscreenKernel {
  if (value === 'mitchell' || value === 'nearest' || value === 'cubic') {
    return value
  }
  return 'lanczos3'
}

function resolveFullscreenResizeOptions(request: ResolveMediaResourceRequestDto): FullscreenResizeOptions | null {
  if (!request.fullscreen_resize) {
    return null
  }
  if (request.locator.media_type !== 'image') {
    return null
  }

  return {
    targetWidth: clampTargetWidth(request.fullscreen_resize.target_width),
    targetHeight: clampTargetHeight(request.fullscreen_resize.target_height),
    kernel: normalizeKernel(request.fullscreen_resize.kernel),
  }
}

async function computeFullscreenCachePath(
  locator: MediaLocatorDto,
  options: FullscreenResizeOptions,
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
      variant: 'fullscreen',
      kind: locator.kind,
      path: locator.absolute_path,
      mtimeMs: stat.mtimeMs,
      size: stat.size,
      targetWidth: options.targetWidth,
      targetHeight: options.targetHeight,
      kernel: options.kernel,
    })
    const hash = createHash('sha1').update(cacheKey).digest('hex')
    return path.join(thumbnailCacheRootDir, `${hash}.webp`)
  }

  const archiveStat = await fs.stat(locator.archive_path).catch(() => null)
  if (!archiveStat || !archiveStat.isFile()) {
    return null
  }

  const cacheKey = JSON.stringify({
    variant: 'fullscreen',
    kind: locator.kind,
    archivePath: locator.archive_path,
    entry: locator.entry_name,
    mtimeMs: archiveStat.mtimeMs,
    size: archiveStat.size,
    targetWidth: options.targetWidth,
    targetHeight: options.targetHeight,
    kernel: options.kernel,
  })
  const hash = createHash('sha1').update(cacheKey).digest('hex')
  return path.join(thumbnailCacheRootDir, `${hash}.webp`)
}

interface ResolveFullscreenLocatorParams {
  locator: MediaLocatorDto
  request: ResolveMediaResourceRequestDto
  thumbnailCacheRootDir: string
  ensureRuntimeDependencies: () => Promise<{ sharp: boolean }>
  readImageBufferForThumbnail: (locator: MediaLocatorDto) => Promise<Buffer>
  runWithCpuToken?: <T>(taskName: string, task: () => Promise<T>) => Promise<T>
}

export async function maybeResolveFullscreenLocator({
  locator,
  request,
  thumbnailCacheRootDir,
  ensureRuntimeDependencies,
  readImageBufferForThumbnail,
  runWithCpuToken,
}: ResolveFullscreenLocatorParams): Promise<MediaLocatorDto | null> {
  const options = resolveFullscreenResizeOptions(request)
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

  const cachePath = await computeFullscreenCachePath(locator, options, thumbnailCacheRootDir)
  if (!cachePath) {
    return null
  }

  const pendingTask = pendingFullscreenTasks.get(cachePath)
  if (pendingTask) {
    return pendingTask
  }

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

  const task = runWithConcurrencyLimit(async () => {
    try {
      const sourceBuffer = await readImageBufferForThumbnail(locator).catch(() => null)
      if (!sourceBuffer || sourceBuffer.length === 0) {
        return null
      }

      const generateTask = async () => {
        await fs.mkdir(thumbnailCacheRootDir, { recursive: true })
        const tempPath = `${cachePath}.${process.pid}.${Date.now()}.tmp.webp`

        const sharpModule = await getSharpModule()
        if (!sharpModule?.default) {
          return null
        }

        const sharp = sharpModule.default
        const generated = await sharp(sourceBuffer, { failOn: 'none' })
          .rotate()
          .resize({
            width: options.targetWidth,
            height: options.targetHeight,
            fit: 'inside',
            kernel: sharp.kernel[options.kernel],
            withoutEnlargement: false,
          })
          .webp({ quality: FULLSCREEN_WEBP_QUALITY })
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
      }

      return runWithCpuToken
        ? await runWithCpuToken('fullscreen-resize', generateTask)
        : await generateTask()
    } finally {
      pendingFullscreenTasks.delete(cachePath)
    }
  })

  pendingFullscreenTasks.set(cachePath, task)
  return task
}
