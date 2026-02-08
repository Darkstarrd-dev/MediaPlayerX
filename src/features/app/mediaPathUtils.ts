import type { MediaLocator } from '../../types'
import { clamp } from '../../utils/ui'

const RESPONSIVE_ZOOM_BASE_WIDTH = 1600
const RESPONSIVE_ZOOM_BASE_HEIGHT = 900
const RESPONSIVE_ZOOM_MIN_FACTOR = 0.72

const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
}

export const RESPONSIVE_ZOOM_EPSILON = 0.005

export function computeResponsiveZoomFactor(width: number, height: number): number {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 1
  }

  const widthFactor = width / RESPONSIVE_ZOOM_BASE_WIDTH
  const heightFactor = height / RESPONSIVE_ZOOM_BASE_HEIGHT
  const factor = Math.min(widthFactor, heightFactor, 1)
  return clamp(Number(factor.toFixed(4)), RESPONSIVE_ZOOM_MIN_FACTOR, 1)
}

export function normalizePathForCompare(value: string): string {
  const normalized = value.trim().replace(/\\/g, '/')
  if (typeof window !== 'undefined' && /win/i.test(window.navigator.platform)) {
    return normalized.toLowerCase()
  }
  return normalized
}

export function buildCoverImageLocator(absolutePath: string | null | undefined): MediaLocator | null {
  if (!absolutePath) {
    return null
  }

  const trimmed = absolutePath.trim()
  if (trimmed.length === 0) {
    return null
  }

  const extensionMatch = trimmed.match(/(\.[^./\\]+)$/)
  const extension = extensionMatch?.[1]?.toLowerCase()
  if (!extension) {
    return null
  }

  const mimeType = IMAGE_MIME_BY_EXTENSION[extension]
  if (!mimeType) {
    return null
  }

  return {
    kind: 'filesystem',
    absolutePath: trimmed,
    extension,
    mediaType: 'image',
    mimeType,
  }
}
