import type {
  ResolveMediaResourceRequestDto,
  ResolveMediaResourceResponseDto,
} from '../../contracts/backend'
import type { MediaLocator } from '../../types'
import { mapMediaLocatorToDto, mediaLocatorKey } from './mediaLocator'
import type { MediaRepository } from './repository'

const THUMBNAIL_MIN_QUALITY = 1
const THUMBNAIL_MAX_QUALITY = 100

export interface MediaResolveTarget {
  targetId: string
  locator: MediaLocator | null
  variant?: 'original' | 'thumbnail' | 'fullscreen'
  thumbnailMaxEdge?: number
  thumbnailQuality?: number
  thumbnailGenerationConcurrency?: number
  thumbnailQueueSize?: number
  fullscreenTargetWidth?: number
  fullscreenTargetHeight?: number
  fullscreenKernel?: 'lanczos3' | 'mitchell' | 'nearest' | 'cubic'
}

export interface SyncResolveRepository extends MediaRepository {
  resolveMediaResourceSync(request: ResolveMediaResourceRequestDto): ResolveMediaResourceResponseDto
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }
  return 'media_resolve_failed'
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

export function isSyncResolveRepository(repository: MediaRepository): repository is SyncResolveRepository {
  return 'resolveMediaResourceSync' in repository && typeof repository.resolveMediaResourceSync === 'function'
}

export function buildRequestKey(target: MediaResolveTarget): string | null {
  if (!target.locator) {
    return null
  }

  const base = mediaLocatorKey(target.locator)
  if (target.variant === 'fullscreen') {
    const targetWidth = Math.max(1, Math.min(7680, Math.round(target.fullscreenTargetWidth ?? 1920)))
    const targetHeight = Math.max(1, Math.min(4320, Math.round(target.fullscreenTargetHeight ?? 1080)))
    const kernel = target.fullscreenKernel ?? 'lanczos3'
    return `${base}|variant:fullscreen|w:${targetWidth}|h:${targetHeight}|k:${kernel}`
  }

  if (target.variant !== 'thumbnail') {
    return `${base}|variant:original`
  }

  const maxEdge = Math.max(64, Math.min(2048, Math.round(target.thumbnailMaxEdge ?? 320)))
  const quality = Math.max(THUMBNAIL_MIN_QUALITY, Math.min(THUMBNAIL_MAX_QUALITY, Math.round(target.thumbnailQuality ?? 82)))
  return `${base}|variant:thumbnail|max:${maxEdge}|q:${quality}`
}

export function buildResolveRequest(target: MediaResolveTarget): ResolveMediaResourceRequestDto {
  if (target.variant === 'thumbnail') {
    return {
      locator: mapMediaLocatorToDto(target.locator as MediaLocator),
      preferred_variant: 'thumbnail',
      thumbnail: {
        max_edge: Math.max(64, Math.min(2048, Math.round(target.thumbnailMaxEdge ?? 320))),
        quality: Math.max(THUMBNAIL_MIN_QUALITY, Math.min(THUMBNAIL_MAX_QUALITY, Math.round(target.thumbnailQuality ?? 82))),
        generation_concurrency: Math.max(1, Math.min(16, Math.round(target.thumbnailGenerationConcurrency ?? 4))),
        queue_size: target.thumbnailQueueSize != null
          ? Math.max(16, Math.min(256, Math.round(target.thumbnailQueueSize)))
          : undefined,
      },
    }
  }

  if (target.variant === 'fullscreen') {
    return {
      locator: mapMediaLocatorToDto(target.locator as MediaLocator),
      preferred_variant: 'original',
      fullscreen_resize: {
        target_width: Math.max(1, Math.min(7680, Math.round(target.fullscreenTargetWidth ?? 1920))),
        target_height: Math.max(1, Math.min(4320, Math.round(target.fullscreenTargetHeight ?? 1080))),
        kernel: target.fullscreenKernel ?? 'lanczos3',
      },
    }
  }

  return {
    locator: mapMediaLocatorToDto(target.locator as MediaLocator),
    preferred_variant: 'original',
  }
}

export async function runTasksWithConcurrency(
  tasks: Array<() => Promise<void>>,
  maxConcurrent: number,
  signal: AbortSignal,
): Promise<void> {
  if (tasks.length === 0) {
    return
  }

  const limit = Number.isFinite(maxConcurrent) ? Math.max(1, Math.min(tasks.length, maxConcurrent)) : tasks.length
  let cursor = 0
  const inFlight = new Set<Promise<void>>()

  const launchMore = () => {
    while (!signal.aborted && inFlight.size < limit && cursor < tasks.length) {
      const task = tasks[cursor]
      cursor += 1
      const promise = task()
        .catch(() => undefined)
        .finally(() => {
          inFlight.delete(promise)
        })
      inFlight.add(promise)
    }
  }

  launchMore()
  while (!signal.aborted && inFlight.size > 0) {
    await Promise.race(inFlight)
    launchMore()
  }
}
