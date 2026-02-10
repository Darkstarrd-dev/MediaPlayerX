import { describe, expect, it } from 'vitest'
import type * as ort from 'onnxruntime-node'

import { resolveWarmupInputSpec } from './wdSwinV2TaggerService'

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
