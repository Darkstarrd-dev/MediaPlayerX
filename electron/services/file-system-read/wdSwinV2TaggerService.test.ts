import { describe, expect, it } from 'vitest'
import type * as ort from 'onnxruntime-node'

import {
  buildAutoTagRangesByCategory,
  resolveWarmupInputSpec,
  selectTagsByRanges,
} from './wdSwinV2TaggerService'

function createMetadata(shape: Array<number | string>, type: ort.Tensor.Type = 'float32') {
  return {
    name: 'input',
    isTensor: true,
    type,
    shape,
  } as unknown as ort.InferenceSession.ValueMetadata
}

describe('resolveWarmupInputSpec', () => {
  it('识别 NHWC 输入并保留 [N,H,W,C] 维度', () => {
    const spec = resolveWarmupInputSpec(createMetadata([1, 448, 448, 3]))
    expect(spec).toEqual({
      type: 'float32',
      layout: 'nhwc',
      dims: [1, 448, 448, 3],
    })
  })

  it('识别 NCHW 输入并保留 [N,C,H,W] 维度', () => {
    const spec = resolveWarmupInputSpec(createMetadata([1, 3, 448, 448]))
    expect(spec).toEqual({
      type: 'float32',
      layout: 'nchw',
      dims: [1, 3, 448, 448],
    })
  })

  it('动态维度使用默认值回填并保持布局判断', () => {
    const spec = resolveWarmupInputSpec(createMetadata(['N', 'H', 'W', 3]))
    expect(spec).toEqual({
      type: 'float32',
      layout: 'nhwc',
      dims: [1, 448, 448, 3],
    })
  })
})

describe('buildAutoTagRangesByCategory', () => {
  it('根据 category 与阈值配置自动生成区间', () => {
    const rules = buildAutoTagRangesByCategory(
      [
        { name: 'general', category: '9' },
        { name: 'sensitive', category: '9' },
        { name: '1girl', category: '0' },
        { name: 'solo', category: '0' },
        { name: 'azusa', category: '4' },
        { name: 'mio', category: '4' },
      ],
      {
        occurrenceThreshold: 2,
        generalMinScore: 0.35,
        characterMinScore: 0.75,
        includeRating: false,
        ratingMinScore: 0.5,
      },
    )

    expect(rules).toEqual([
      { startIndex: 2, endIndex: 3, minScore: 0.35 },
      { startIndex: 4, endIndex: 5, minScore: 0.75 },
    ])
  })

  it('开启 rating 后会纳入 rating 区间', () => {
    const rules = buildAutoTagRangesByCategory(
      [
        { name: 'general', category: '9' },
        { name: '1girl', category: '0' },
      ],
      {
        occurrenceThreshold: 1,
        generalMinScore: 0.35,
        characterMinScore: 0.75,
        includeRating: true,
        ratingMinScore: 0.42,
      },
    )

    expect(rules).toEqual([
      { startIndex: 0, endIndex: 0, minScore: 0.42 },
      { startIndex: 1, endIndex: 1, minScore: 0.35 },
    ])
  })
})

describe('selectTagsByRanges', () => {
  it('按区间阈值筛选标签并去重', () => {
    const tags = selectTagsByRanges(
      [0.1, 0.72, 0.43, 0.91, 0.61],
      ['a', 'b', 'c', 'd', 'e'],
      [
        { startIndex: 1, endIndex: 3, minScore: 0.7 },
        { startIndex: 3, endIndex: 4, minScore: 0.6 },
      ],
    )

    expect(tags).toEqual(['b', 'd', 'e'])
  })
})
