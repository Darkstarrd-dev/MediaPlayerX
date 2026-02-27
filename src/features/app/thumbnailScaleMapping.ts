export function clampThumbnailScaleLevel(level: number, levelCount: number): number {
  const safeLevelCount = Math.max(1, Math.round(levelCount))
  return Math.max(1, Math.min(safeLevelCount, Math.round(level)))
}

export function toDisplayThumbnailScaleLevel(
  normalizedThumbnailScale: number,
  thumbnailScaleLevelCount: number,
): number {
  return clampThumbnailScaleLevel(
    normalizedThumbnailScale,
    thumbnailScaleLevelCount,
  )
}

export function toNormalizedThumbnailScale(
  targetLevel: number,
  thumbnailScaleLevelCount: number,
): number {
  return clampThumbnailScaleLevel(targetLevel, thumbnailScaleLevelCount)
}
