import { clamp } from '../../utils/ui'

export type PaneKey = 'image' | 'video'
export type AlignDirection = 'up' | 'down' | 'left' | 'right'
export type AxisAlign = 'center' | 'start' | 'end' | 'free'

export interface PaneTransform {
  zoom: number
  offsetX: number
  offsetY: number
}

export interface PaneViewportSize {
  width: number
  height: number
}

export interface MediaGeometry {
  width: number
  height: number
  diffX: number
  diffY: number
  maxOffsetX: number
  maxOffsetY: number
}

export interface PaneAlign {
  x: AxisAlign
  y: AxisAlign
}

export const DEFAULT_PANE_TRANSFORM: PaneTransform = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
}

export const DEFAULT_PANE_ALIGN: PaneAlign = {
  x: 'center',
  y: 'center',
}

export const MIN_SPLIT = 0.2
export const MAX_SPLIT = 0.8
export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 4
export const ZOOM_STEP = 0.12
const DUAL_ADAPTIVE_EPSILON_PX = 0.5
export const DUAL_ADAPTIVE_HORIZONTAL_DIFF_THRESHOLD_RATIO = 0.07

export type DualAdaptiveSplitRule =
  | 'expand-underfilled-pane'
  | 'center-inward'
  | 'center-balanced'

interface ResolveDualAdaptiveSplitParams {
  totalWidth: number
  imageViewportHeight: number
  videoViewportHeight: number
  imageAspect: number
  videoAspect: number
}

export interface DualAdaptiveSplitResult {
  imageRatio: number
  rule: DualAdaptiveSplitRule
}

export function resolveDualAdaptiveStickySplit(
  previous: DualAdaptiveSplitResult | null,
  candidate: DualAdaptiveSplitResult,
  horizontalDiffThresholdRatio = DUAL_ADAPTIVE_HORIZONTAL_DIFF_THRESHOLD_RATIO,
): DualAdaptiveSplitResult {
  if (!previous) {
    return candidate
  }

  const safeThreshold = clamp(
    Number.isFinite(horizontalDiffThresholdRatio)
      ? horizontalDiffThresholdRatio
      : DUAL_ADAPTIVE_HORIZONTAL_DIFF_THRESHOLD_RATIO,
    0,
    1,
  )
  const diffRatio = Math.abs(candidate.imageRatio - previous.imageRatio)

  if (diffRatio <= safeThreshold) {
    return previous
  }

  return candidate
}

export function resolveMediaAspect(width: number, height: number, fallback = 1): number {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return fallback
  }
  return width / height
}

export function resolveDualAdaptiveSplit({
  totalWidth,
  imageViewportHeight,
  videoViewportHeight,
  imageAspect,
  videoAspect,
}: ResolveDualAdaptiveSplitParams): DualAdaptiveSplitResult {
  const safeTotalWidth = Math.max(1, totalWidth)
  const safeImageHeight = Math.max(1, imageViewportHeight)
  const safeVideoHeight = Math.max(1, videoViewportHeight)
  const safeImageAspect = Number.isFinite(imageAspect) && imageAspect > 0 ? imageAspect : 1
  const safeVideoAspect = Number.isFinite(videoAspect) && videoAspect > 0 ? videoAspect : 16 / 9

  const halfWidth = safeTotalWidth / 2
  const imageHeightFillThreshold = safeImageHeight * safeImageAspect
  const videoHeightFillThreshold = safeVideoHeight * safeVideoAspect

  const imageHasHorizontalGap = halfWidth > imageHeightFillThreshold + DUAL_ADAPTIVE_EPSILON_PX
  const imageHeightNotFilled = halfWidth < imageHeightFillThreshold - DUAL_ADAPTIVE_EPSILON_PX
  const videoHasHorizontalGap = halfWidth > videoHeightFillThreshold + DUAL_ADAPTIVE_EPSILON_PX
  const videoHeightNotFilled = halfWidth < videoHeightFillThreshold - DUAL_ADAPTIVE_EPSILON_PX

  if (imageHasHorizontalGap && videoHeightNotFilled) {
    return {
      imageRatio: clamp(imageHeightFillThreshold / safeTotalWidth, 0, 1),
      rule: 'expand-underfilled-pane',
    }
  }

  if (videoHasHorizontalGap && imageHeightNotFilled) {
    return {
      imageRatio: clamp(1 - videoHeightFillThreshold / safeTotalWidth, 0, 1),
      rule: 'expand-underfilled-pane',
    }
  }

  if (imageHasHorizontalGap && videoHasHorizontalGap) {
    return {
      imageRatio: 0.5,
      rule: 'center-inward',
    }
  }

  return {
    imageRatio: 0.5,
    rule: 'center-balanced',
  }
}

export function computeMediaGeometry(viewport: PaneViewportSize, aspect: number, zoom: number): MediaGeometry {
  const width = Math.max(1, viewport.width)
  const height = Math.max(1, viewport.height)
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1
  const safeZoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM)

  const viewportRatio = width / height
  const fitByWidth = viewportRatio <= safeAspect
  const fitWidth = fitByWidth ? width : height * safeAspect
  const fitHeight = fitByWidth ? width / safeAspect : height
  const mediaWidth = fitWidth * safeZoom
  const mediaHeight = fitHeight * safeZoom

  const diffX = mediaWidth - width
  const diffY = mediaHeight - height

  return {
    width: mediaWidth,
    height: mediaHeight,
    diffX,
    diffY,
    maxOffsetX: Math.abs(diffX) / 2,
    maxOffsetY: Math.abs(diffY) / 2,
  }
}

export function computeMediaGeometryHeightAnchored(
  viewport: PaneViewportSize,
  aspect: number,
  zoom: number,
): MediaGeometry {
  const width = Math.max(1, viewport.width)
  const height = Math.max(1, viewport.height)
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1
  const safeZoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM)

  const mediaHeight = height * safeZoom
  const mediaWidth = mediaHeight * safeAspect
  const diffX = mediaWidth - width
  const diffY = mediaHeight - height

  return {
    width: mediaWidth,
    height: mediaHeight,
    diffX,
    diffY,
    maxOffsetX: Math.abs(diffX) / 2,
    maxOffsetY: Math.abs(diffY) / 2,
  }
}

export function applyAlignedOffset(transform: PaneTransform, align: PaneAlign, geometry: MediaGeometry): PaneTransform {
  let nextOffsetX = transform.offsetX
  let nextOffsetY = transform.offsetY

  if (align.x === 'center') {
    nextOffsetX = 0
  } else if (align.x === 'start') {
    nextOffsetX = geometry.diffX / 2
  } else if (align.x === 'end') {
    nextOffsetX = -geometry.diffX / 2
  }

  if (align.y === 'center') {
    nextOffsetY = 0
  } else if (align.y === 'start') {
    nextOffsetY = geometry.diffY / 2
  } else if (align.y === 'end') {
    nextOffsetY = -geometry.diffY / 2
  }

  if (Math.abs(nextOffsetX - transform.offsetX) < 0.0001 && Math.abs(nextOffsetY - transform.offsetY) < 0.0001) {
    return transform
  }

  return {
    ...transform,
    offsetX: nextOffsetX,
    offsetY: nextOffsetY,
  }
}

export function clampPaneTransform(transform: PaneTransform, geometry: MediaGeometry): PaneTransform {
  const nextZoom = clamp(transform.zoom, MIN_ZOOM, MAX_ZOOM)
  const nextOffsetX = clamp(transform.offsetX, -geometry.maxOffsetX, geometry.maxOffsetX)
  const nextOffsetY = clamp(transform.offsetY, -geometry.maxOffsetY, geometry.maxOffsetY)

  if (
    Math.abs(nextZoom - transform.zoom) < 0.0001 &&
    Math.abs(nextOffsetX - transform.offsetX) < 0.0001 &&
    Math.abs(nextOffsetY - transform.offsetY) < 0.0001
  ) {
    return transform
  }

  return {
    zoom: nextZoom,
    offsetX: nextOffsetX,
    offsetY: nextOffsetY,
  }
}
