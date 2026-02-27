import { describe, expect, it } from 'vitest'

import {
  clampThumbnailScaleLevel,
  toDisplayThumbnailScaleLevel,
  toNormalizedThumbnailScale,
} from './thumbnailScaleMapping'

describe('thumbnailScaleMapping', () => {
  it('显示等级与缩放等级保持 1:1 直映射', () => {
    for (let level = 1; level <= 7; level += 1) {
      expect(toDisplayThumbnailScaleLevel(level, 7)).toBe(level)
      expect(toNormalizedThumbnailScale(level, 7)).toBe(level)
    }
  })

  it('统一执行 rounding 与边界钳制', () => {
    expect(clampThumbnailScaleLevel(0, 7)).toBe(1)
    expect(clampThumbnailScaleLevel(9, 7)).toBe(7)
    expect(clampThumbnailScaleLevel(4.6, 7)).toBe(5)
    expect(clampThumbnailScaleLevel(2.4, 7)).toBe(2)
    expect(clampThumbnailScaleLevel(3, 0)).toBe(1)
  })
})
