import { describe, expect, it } from 'vitest'

import { computeThumbnailGridLayout } from './thumbnailLayout'

describe('computeThumbnailGridLayout', () => {
  it('缩略图媒体区保持 1:1，单元格使用固定 chrome 补偿', () => {
    const layout = computeThumbnailGridLayout({
      gridWidth: 240,
      gridHeight: 200,
      thumbnailWidth: 1000,
      thumbnailGap: 8,
      zoomLevel: 1,
    })

    expect(layout.columns).toBe(1)
    expect(layout.rows).toBe(1)
    expect(layout.cellWidth - layout.mediaHeight).toBe(12)
    expect(layout.idealGridHeight).toBe(200)
  })

  it('纵向优先按容器高度均分，输出高度与容器对齐', () => {
    const layout = computeThumbnailGridLayout({
      gridWidth: 960,
      gridHeight: 540,
      thumbnailWidth: 420,
      thumbnailGap: 8,
      zoomLevel: 4,
    })

    const totalHeight = layout.rows * (layout.mediaHeight + 12) + (layout.rows - 1) * layout.gap
    expect(Math.abs(totalHeight - 540)).toBeLessThan(0.01)
  })
})
