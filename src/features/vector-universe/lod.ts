import type { VectorUniverseLodCounts, VectorUniverseLodLevel } from './types'

export const VECTOR_UNIVERSE_LOD_THRESHOLDS = Object.freeze({
  near: 16,
  mid: 44,
})

export function resolveVectorUniverseLod(
  distance: number,
  thresholds = VECTOR_UNIVERSE_LOD_THRESHOLDS,
): VectorUniverseLodLevel {
  if (!Number.isFinite(distance)) {
    return 'far'
  }

  if (distance <= thresholds.near) {
    return 'near'
  }

  if (distance <= thresholds.mid) {
    return 'mid'
  }

  return 'far'
}

export function countVectorUniverseLods(distances: number[]): VectorUniverseLodCounts {
  const counts: VectorUniverseLodCounts = {
    far: 0,
    mid: 0,
    near: 0,
  }

  for (const distance of distances) {
    counts[resolveVectorUniverseLod(distance)] += 1
  }

  return counts
}
