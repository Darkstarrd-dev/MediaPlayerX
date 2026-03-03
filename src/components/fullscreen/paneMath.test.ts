import { describe, expect, it } from 'vitest'

import { resolveDualAdaptiveSplit } from './paneMath'

describe('resolveDualAdaptiveSplit', () => {
  it('当 image 侧高度占满且有横向留白时，向 video 侧让渡宽度', () => {
    const result = resolveDualAdaptiveSplit({
      totalWidth: 1200,
      imageViewportHeight: 300,
      videoViewportHeight: 300,
      imageAspect: 1,
      videoAspect: 3,
    })

    expect(result.rule).toBe('expand-underfilled-pane')
    expect(result.imageRatio).toBeCloseTo(0.25, 6)
  })

  it('当 video 侧高度占满且有横向留白时，向 image 侧让渡宽度', () => {
    const result = resolveDualAdaptiveSplit({
      totalWidth: 1200,
      imageViewportHeight: 300,
      videoViewportHeight: 300,
      imageAspect: 3,
      videoAspect: 1,
    })

    expect(result.rule).toBe('expand-underfilled-pane')
    expect(result.imageRatio).toBeCloseTo(0.75, 6)
  })

  it('当两侧都高度占满且有横向留白时，保持对半并触发向中线贴齐', () => {
    const result = resolveDualAdaptiveSplit({
      totalWidth: 1000,
      imageViewportHeight: 300,
      videoViewportHeight: 300,
      imageAspect: 0.5,
      videoAspect: 0.6,
    })

    expect(result.rule).toBe('center-inward')
    expect(result.imageRatio).toBe(0.5)
  })

  it('当两侧都宽度占满且高度有留白时，保持对半平均分配', () => {
    const result = resolveDualAdaptiveSplit({
      totalWidth: 1000,
      imageViewportHeight: 300,
      videoViewportHeight: 300,
      imageAspect: 3,
      videoAspect: 2.2,
    })

    expect(result.rule).toBe('center-balanced')
    expect(result.imageRatio).toBe(0.5)
  })
})
