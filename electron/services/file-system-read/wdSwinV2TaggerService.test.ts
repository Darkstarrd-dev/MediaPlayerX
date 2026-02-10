import { describe, expect, it } from 'vitest'
import type * as ort from 'onnxruntime-node'

import {
  parseAutoTagRangeRules,
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

describe('parseAutoTagRangeRules', () => {
  it('支持 start_index/end_index/min_score 结构', () => {
    const rules = parseAutoTagRangeRules({
      ranges: [
        { start_index: 5, end_index: 8, min_score: 0.55 },
        { start_index: 0, end_index: 2, min_score: 0.35 },
      ],
    })

    expect(rules).toEqual([
      { startIndex: 0, endIndex: 2, minScore: 0.35 },
      { startIndex: 5, endIndex: 8, minScore: 0.55 },
    ])
  })

  it('不合法区间配置会抛出错误', () => {
    expect(() =>
      parseAutoTagRangeRules({
        ranges: [{ start_index: 8, end_index: 2, min_score: 0.5 }],
      }),
    ).toThrow(/end_index 不能小于 start_index/)
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
