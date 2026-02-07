import { describe, expect, it } from 'vitest'

import {
  VECTOR_UNIVERSE_LOD_THRESHOLDS,
  countVectorUniverseLods,
  resolveVectorUniverseLod,
} from './lod'

describe('vector universe LOD', () => {
  it('按阈值输出 far/mid/near', () => {
    expect(resolveVectorUniverseLod(VECTOR_UNIVERSE_LOD_THRESHOLDS.near - 0.01)).toBe('near')
    expect(resolveVectorUniverseLod(VECTOR_UNIVERSE_LOD_THRESHOLDS.near + 0.01)).toBe('mid')
    expect(resolveVectorUniverseLod(VECTOR_UNIVERSE_LOD_THRESHOLDS.mid + 0.01)).toBe('far')
  })

  it('可统计各层数量', () => {
    const counts = countVectorUniverseLods([3, 12, 18, 41, 68])
    expect(counts).toEqual({
      near: 2,
      mid: 2,
      far: 1,
    })
  })
})
