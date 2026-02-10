import { promises as fs } from 'node:fs'
import path from 'node:path'

import * as ort from 'onnxruntime-node'

import {
  testWdSwinTaggerModelResponseSchema,
  type TestWdSwinTaggerModelRequestDto,
  type TestWdSwinTaggerModelResponseDto,
} from '../../../src/contracts/backend'

const DEFAULT_TEST_TIMEOUT_MS = 30_000
const WARMUP_DEFAULT_IMAGE_SIZE = 448
const WARMUP_DEFAULT_BATCH = 1
const WARMUP_DEFAULT_CHANNELS = 3
const TAGS_CSV_FILE_NAME = 'selected_tags.csv'

type WarmupLayout = 'nchw' | 'nhwc'
type WarmupTensorType =
  | 'float32'
  | 'float64'
  | 'float16'
  | 'int8'
  | 'uint8'
  | 'int16'
  | 'uint16'
  | 'int32'
  | 'uint32'
  | 'bool'

function withTimeout<T>(task: Promise<T>, timeoutMs: number): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return task
  }

  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`模型测试超时（>${timeoutMs}ms）`))
    }, timeoutMs)

    task
      .then((value) => {
        clearTimeout(timeoutId)
        resolve(value)
      })
      .catch((error: unknown) => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

function normalizeInputDimension(value: number | string | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0 && Math.floor(value) === value) {
    return value
  }
  return fallback
}

function toWarmupTensorType(type: ort.Tensor.Type): WarmupTensorType {
  switch (type) {
    case 'float32':
    case 'float64':
    case 'float16':
    case 'int8':
    case 'uint8':
    case 'int16':
    case 'uint16':
    case 'int32':
    case 'uint32':
    case 'bool':
      return type
    default:
      throw new Error(`模型测试失败：暂不支持输入类型 ${type}`)
  }
}

function createWarmupTypedArray(
  type: WarmupTensorType,
  length: number,
):
  | Float32Array
  | Float64Array
  | Uint16Array
  | Int8Array
  | Uint8Array
  | Int16Array
  | Int32Array
  | Uint32Array {
  switch (type) {
    case 'float32':
      return new Float32Array(length)
    case 'float64':
      return new Float64Array(length)
    case 'float16':
      return new Uint16Array(length)
    case 'int8':
      return new Int8Array(length)
    case 'uint8':
    case 'bool':
      return new Uint8Array(length)
    case 'int16':
      return new Int16Array(length)
    case 'uint16':
      return new Uint16Array(length)
    case 'int32':
      return new Int32Array(length)
    case 'uint32':
      return new Uint32Array(length)
  }
}

function warmupChannelValues(type: WarmupTensorType): { red: number; green: number; blue: number } {
  if (type === 'float16') {
    return {
      red: 0x3c00,
      green: 0xbc00,
      blue: 0xbc00,
    }
  }

  if (type === 'uint8' || type === 'uint16' || type === 'uint32' || type === 'bool') {
    return {
      red: 1,
      green: 0,
      blue: 0,
    }
  }

  return {
    red: 1,
    green: -1,
    blue: -1,
  }
}

export function resolveWarmupInputSpec(
  metadata: ort.InferenceSession.ValueMetadata | undefined,
): { type: WarmupTensorType; layout: WarmupLayout; dims: [number, number, number, number] } {
  const fallbackDims: [number, number, number, number] = [
    WARMUP_DEFAULT_BATCH,
    WARMUP_DEFAULT_IMAGE_SIZE,
    WARMUP_DEFAULT_IMAGE_SIZE,
    WARMUP_DEFAULT_CHANNELS,
  ]
  const fallbackSpec = {
    type: 'float32' as WarmupTensorType,
    layout: 'nhwc' as WarmupLayout,
    dims: fallbackDims,
  }

  if (!metadata || !metadata.isTensor) {
    return fallbackSpec
  }

  if (metadata.shape.length !== 4) {
    throw new Error(`模型测试失败：仅支持4维输入，当前为 ${metadata.shape.length} 维`)
  }

  const shape = metadata.shape
  const hasNchwChannel = shape[1] === 3
  const hasNhwcChannel = shape[3] === 3
  const layout: WarmupLayout = hasNchwChannel && !hasNhwcChannel ? 'nchw' : 'nhwc'

  if (layout === 'nchw') {
    return {
      type: toWarmupTensorType(metadata.type),
      layout,
      dims: [
        normalizeInputDimension(shape[0], WARMUP_DEFAULT_BATCH),
        normalizeInputDimension(shape[1], WARMUP_DEFAULT_CHANNELS),
        normalizeInputDimension(shape[2], WARMUP_DEFAULT_IMAGE_SIZE),
        normalizeInputDimension(shape[3], WARMUP_DEFAULT_IMAGE_SIZE),
      ],
    }
  }

  return {
    type: toWarmupTensorType(metadata.type),
    layout,
    dims: [
      normalizeInputDimension(shape[0], WARMUP_DEFAULT_BATCH),
      normalizeInputDimension(shape[1], WARMUP_DEFAULT_IMAGE_SIZE),
      normalizeInputDimension(shape[2], WARMUP_DEFAULT_IMAGE_SIZE),
      normalizeInputDimension(shape[3], WARMUP_DEFAULT_CHANNELS),
    ],
  }
}

function buildWarmupInputTensor(metadata: ort.InferenceSession.ValueMetadata | undefined): ort.Tensor {
  const spec = resolveWarmupInputSpec(metadata)
  const values = warmupChannelValues(spec.type)
  const elementCount = spec.dims.reduce((product, value) => product * value, 1)
  const data = createWarmupTypedArray(spec.type, elementCount)

  if (spec.layout === 'nchw') {
    const [batch, channels, height, width] = spec.dims
    const imageSize = height * width
    const imageVolume = channels * imageSize

    for (let batchIndex = 0; batchIndex < batch; batchIndex += 1) {
      const batchOffset = batchIndex * imageVolume
      for (let pixelIndex = 0; pixelIndex < imageSize; pixelIndex += 1) {
        data[batchOffset + pixelIndex] = values.red
        if (channels > 1) {
          data[batchOffset + imageSize + pixelIndex] = values.green
        }
        if (channels > 2) {
          data[batchOffset + imageSize * 2 + pixelIndex] = values.blue
        }
      }
    }
  } else {
    const [batch, height, width, channels] = spec.dims
    const imageSize = height * width
    const imageVolume = imageSize * channels

    for (let batchIndex = 0; batchIndex < batch; batchIndex += 1) {
      const batchOffset = batchIndex * imageVolume
      for (let pixelIndex = 0; pixelIndex < imageSize; pixelIndex += 1) {
        const pixelOffset = batchOffset + pixelIndex * channels
        data[pixelOffset] = values.red
        if (channels > 1) {
          data[pixelOffset + 1] = values.green
        }
        if (channels > 2) {
          data[pixelOffset + 2] = values.blue
        }
      }
    }
  }

  return new ort.Tensor(spec.type, data, spec.dims)
}

function normalizeOutputShape(dims: readonly number[] | undefined): number[] | null {
  if (!dims || dims.length === 0) {
    return null
  }

  const normalized = dims.map((value) => Number(value))
  if (normalized.some((value) => !Number.isFinite(value) || value <= 0 || Math.floor(value) !== value)) {
    return null
  }

  return normalized
}

async function readTagCountFromCsv(csvPath: string): Promise<number | null> {
  try {
    const content = await fs.readFile(csvPath, 'utf8')
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    if (lines.length === 0) {
      return null
    }

    const header = lines[0].toLowerCase()
    const hasHeader = header.includes('tag_id') || header.includes('name') || header.includes('category')
    const count = lines.length - (hasHeader ? 1 : 0)
    return count >= 0 ? count : null
  } catch {
    return null
  }
}

export class WdSwinV2TaggerService {
  async testModel(request: TestWdSwinTaggerModelRequestDto): Promise<TestWdSwinTaggerModelResponseDto> {
    const modelPathRaw = request.model_path.trim()
    if (!modelPathRaw) {
      return testWdSwinTaggerModelResponseSchema.parse({
        ok: false,
        message: '模型测试失败：模型路径不能为空',
        provider: null,
        output_shape: null,
        tag_count: null,
        elapsed_ms: null,
      })
    }

    const modelPath = path.resolve(modelPathRaw)
    const timeoutMs = request.timeout_ms ?? DEFAULT_TEST_TIMEOUT_MS
    const startedAt = Date.now()

    try {
      await fs.access(modelPath)

      const { provider, outputShape, tagCount } = await withTimeout(this.runWarmup(modelPath), timeoutMs)
      const elapsedMs = Date.now() - startedAt
      const shapeText = outputShape ? `[${outputShape.join(', ')}]` : 'unknown'
      return testWdSwinTaggerModelResponseSchema.parse({
        ok: true,
        message: `wd-swinv2 模型加载成功，输出维度 ${shapeText}`,
        provider,
        output_shape: outputShape,
        tag_count: tagCount,
        elapsed_ms: elapsedMs,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return testWdSwinTaggerModelResponseSchema.parse({
        ok: false,
        message: `模型测试失败：${message}`,
        provider: null,
        output_shape: null,
        tag_count: null,
        elapsed_ms: Date.now() - startedAt,
      })
    }
  }

  private async runWarmup(modelPath: string): Promise<{
    provider: string | null
    outputShape: number[] | null
    tagCount: number | null
  }> {
    const session = await ort.InferenceSession.create(modelPath)
    const inputName = session.inputNames[0]
    if (!inputName) {
      throw new Error('模型测试失败：模型输入为空')
    }

    const inputMetadata = session.inputMetadata.find((item) => item.name === inputName)

    const outputMap = await session.run({
      [inputName]: buildWarmupInputTensor(inputMetadata),
    })

    const outputName = session.outputNames[0] ?? Object.keys(outputMap)[0]
    if (!outputName) {
      throw new Error('模型测试失败：模型输出为空')
    }

    const outputTensor = outputMap[outputName]
    const outputShape = normalizeOutputShape(outputTensor?.dims)
    const csvTagCount = await readTagCountFromCsv(path.join(path.dirname(modelPath), TAGS_CSV_FILE_NAME))
    const outputTagCount = outputShape && outputShape.length > 0 ? outputShape[outputShape.length - 1] : null
    const tagCount = csvTagCount ?? outputTagCount ?? null
    const provider =
      Array.isArray(session.executionProviders) && session.executionProviders.length > 0
        ? session.executionProviders.join(',')
        : null

    return {
      provider,
      outputShape,
      tagCount,
    }
  }
}
