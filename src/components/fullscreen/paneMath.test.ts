import { describe, expect, it } from 'vitest'

import {
  computeMediaGeometryHeightAnchored,
  resolveDualAdaptiveSplit,
  resolveDualAdaptiveStickySplit,
} from './paneMath'

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

describe('resolveDualAdaptiveStickySplit', () => {
  it('首次自适应时直接采用候选结果', () => {
    const result = resolveDualAdaptiveStickySplit(null, {
      imageRatio: 0.52,
      rule: 'expand-underfilled-pane',
    })

    expect(result).toEqual({
      imageRatio: 0.52,
      rule: 'expand-underfilled-pane',
    })
  })

  it('当横向差异不超过 7% 时保持上次结果，避免来回弹跳', () => {
    const result = resolveDualAdaptiveStickySplit(
      {
        imageRatio: 0.42,
        rule: 'center-inward',
      },
      {
        imageRatio: 0.48,
        rule: 'expand-underfilled-pane',
      },
    )

    expect(result).toEqual({
      imageRatio: 0.42,
      rule: 'center-inward',
    })
  })

  it('当横向差异超过 7% 时切换到新的自适应结果', () => {
    const result = resolveDualAdaptiveStickySplit(
      {
        imageRatio: 0.42,
        rule: 'center-inward',
      },
      {
        imageRatio: 0.51,
        rule: 'expand-underfilled-pane',
      },
    )

    expect(result).toEqual({
      imageRatio: 0.51,
      rule: 'expand-underfilled-pane',
    })
  })
})

describe('computeMediaGeometryHeightAnchored', () => {
  it('容器宽度不足时保持高度锚定并截断横向溢出', () => {
    const result = computeMediaGeometryHeightAnchored(
      {
        width: 300,
        height: 200,
      },
      2,
      1,
    )

    expect(result.width).toBe(400)
    expect(result.height).toBe(200)
    expect(result.diffX).toBe(100)
    expect(result.diffY).toBe(0)
  })

  it('容器宽度富余时保持高度锚定并保留留白', () => {
    const result = computeMediaGeometryHeightAnchored(
      {
        width: 500,
        height: 200,
      },
      1,
      1,
    )

    expect(result.width).toBe(200)
    expect(result.height).toBe(200)
    expect(result.diffX).toBe(-300)
    expect(result.diffY).toBe(0)
  })
})
