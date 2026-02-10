import { promises as fs } from 'node:fs'
import path from 'node:path'

import * as ort from 'onnxruntime-node'

import {
  type MediaLocatorDto,
  testWdSwinTaggerModelResponseSchema,
  type TestWdSwinTaggerModelRequestDto,
  type TestWdSwinTaggerModelResponseDto,
} from '../../../src/contracts/backend'
import { getSharpModule } from '../../fileSystemRuntimeHelpers'

const DEFAULT_TEST_TIMEOUT_MS = 30_000
const WARMUP_DEFAULT_IMAGE_SIZE = 448
const WARMUP_DEFAULT_BATCH = 1
const WARMUP_DEFAULT_CHANNELS = 3
const TAGS_TABLE_FILE_NAMES = ['selected_tags.csv', 'selected_tags.txt'] as const

interface AutoTagScoreRangeRule {
  startIndex: number
  endIndex: number
  minScore: number
}

interface AutoTagThresholdConfig {
  occurrenceThreshold: number
  generalMinScore: number
  characterMinScore: number
  includeRating: boolean
  ratingMinScore: number
}

interface TagDefinitionRecord {
  name: string
  category: string | null
}

interface GenerateTagsForPackageRequest {
  modelPath: string
  occurrenceThreshold: number
  generalMinScore: number
  characterMinScore: number
  includeRating: boolean
  ratingMinScore: number
  imageLocators: MediaLocatorDto[]
  readImageBuffer: (locator: MediaLocatorDto) => Promise<Buffer>
}

interface GenerateTagsForPackageResult {
  generatedTags: string[]
  analyzedImages: number
}

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

async function findTagTablePath(modelDirectory: string): Promise<string | null> {
  for (const fileName of TAGS_TABLE_FILE_NAMES) {
    const candidatePath = path.join(modelDirectory, fileName)
    try {
      await fs.access(candidatePath)
      return candidatePath
    } catch {
      // continue checking the next candidate
    }
  }
  return null
}

async function resolveTagTablePath(modelDirectory: string): Promise<string> {
  const tablePath = await findTagTablePath(modelDirectory)
  if (tablePath) {
    return tablePath
  }

  throw new Error(`自动标签失败：未找到标签表（${TAGS_TABLE_FILE_NAMES.join(' / ')}）`)
}

async function readTagCountFromTagTable(modelDirectory: string): Promise<number | null> {
  const tablePath = await findTagTablePath(modelDirectory)
  if (!tablePath) {
    return null
  }

  try {
    const content = await fs.readFile(tablePath, 'utf8')
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

function toFloat16Bits(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  const floatView = new Float32Array(1)
  const intView = new Uint32Array(floatView.buffer)
  floatView[0] = value
  const bits = intView[0]

  const sign = (bits >>> 31) & 0x1
  const exponent = (bits >>> 23) & 0xff
  const mantissa = bits & 0x7fffff

  if (exponent === 0xff) {
    if (mantissa !== 0) {
      return (sign << 15) | 0x7e00
    }
    return (sign << 15) | 0x7c00
  }

  let halfExponent = exponent - 127 + 15
  if (halfExponent >= 0x1f) {
    return (sign << 15) | 0x7c00
  }

  if (halfExponent <= 0) {
    if (halfExponent < -10) {
      return sign << 15
    }

    const shifted = (mantissa | 0x800000) >>> (1 - halfExponent)
    const rounded = (shifted + 0x1000) >>> 13
    return (sign << 15) | rounded
  }

  const roundedMantissa = (mantissa + 0x1000) >>> 13
  if (roundedMantissa === 0x400) {
    halfExponent += 1
    if (halfExponent >= 0x1f) {
      return (sign << 15) | 0x7c00
    }
    return (sign << 15) | (halfExponent << 10)
  }

  return (sign << 15) | (halfExponent << 10) | roundedMantissa
}

function fromFloat16Bits(bits: number): number {
  const sign = (bits & 0x8000) !== 0 ? -1 : 1
  const exponent = (bits >>> 10) & 0x1f
  const mantissa = bits & 0x3ff

  if (exponent === 0) {
    if (mantissa === 0) {
      return sign * 0
    }
    return sign * (mantissa / 0x400) * 2 ** -14
  }

  if (exponent === 0x1f) {
    if (mantissa === 0) {
      return sign * Number.POSITIVE_INFINITY
    }
    return Number.NaN
  }

  return sign * (1 + mantissa / 0x400) * 2 ** (exponent - 15)
}

function normalizeColorValue(type: WarmupTensorType, normalized: number): number {
  if (type === 'float16') {
    return toFloat16Bits(normalized)
  }
  if (type === 'float32' || type === 'float64') {
    return normalized
  }
  if (type === 'int8') {
    return Math.max(-128, Math.min(127, Math.round(normalized * 127)))
  }
  if (type === 'uint8' || type === 'bool') {
    return Math.max(0, Math.min(255, Math.round((normalized + 1) * 127.5)))
  }
  if (type === 'int16') {
    return Math.max(-32768, Math.min(32767, Math.round(normalized * 32767)))
  }
  if (type === 'uint16') {
    return Math.max(0, Math.min(65535, Math.round((normalized + 1) * 32767.5)))
  }
  if (type === 'int32') {
    return Math.round(normalized * 2147483647)
  }
  if (type === 'uint32') {
    return Math.round((normalized + 1) * 2147483647.5)
  }
  return normalized
}

function normalizePixelToModelValue(rawChannelValue: number): number {
  return rawChannelValue / 127.5 - 1
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      fields.push(current)
      current = ''
      continue
    }

    current += char
  }

  fields.push(current)
  return fields
}

function normalizeScoreThreshold(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback
  }
  return Math.max(0, Math.min(1, value))
}

function resolveCategoryThreshold(
  categoryRaw: string | null,
  config: AutoTagThresholdConfig,
): number | null {
  const category = (categoryRaw ?? '').trim().toLowerCase()
  if (category === '0' || category === 'general') {
    return config.generalMinScore
  }
  if (category === '4' || category === 'character') {
    return config.characterMinScore
  }
  if (category === '9' || category === 'rating') {
    return config.includeRating ? config.ratingMinScore : null
  }
  return null
}

export function buildAutoTagRangesByCategory(
  tagDefinitions: TagDefinitionRecord[],
  config: AutoTagThresholdConfig,
): AutoTagScoreRangeRule[] {
  const ranges: AutoTagScoreRangeRule[] = []
  let currentStart = -1
  let currentMinScore = 0

  for (let index = 0; index < tagDefinitions.length; index += 1) {
    const minScore = resolveCategoryThreshold(tagDefinitions[index]?.category ?? null, config)
    if (minScore === null) {
      if (currentStart >= 0) {
        ranges.push({
          startIndex: currentStart,
          endIndex: index - 1,
          minScore: currentMinScore,
        })
        currentStart = -1
      }
      continue
    }

    if (currentStart < 0) {
      currentStart = index
      currentMinScore = minScore
      continue
    }

    if (minScore !== currentMinScore) {
      ranges.push({
        startIndex: currentStart,
        endIndex: index - 1,
        minScore: currentMinScore,
      })
      currentStart = index
      currentMinScore = minScore
    }
  }

  if (currentStart >= 0) {
    ranges.push({
      startIndex: currentStart,
      endIndex: tagDefinitions.length - 1,
      minScore: currentMinScore,
    })
  }

  return ranges
}

async function readTagDefinitionsFromTable(tagTablePath: string): Promise<TagDefinitionRecord[]> {
  const content = await fs.readFile(tagTablePath, 'utf8')
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    return []
  }

  const firstLineFields = parseCsvLine(lines[0]).map((field) => field.trim())
  const normalizedHeader = firstLineFields.map((field) => field.toLowerCase())
  const hasHeader =
    normalizedHeader.includes('name') ||
    normalizedHeader.includes('tag_id') ||
    normalizedHeader.includes('category')

  const nameFieldIndex = hasHeader
    ? Math.max(0, normalizedHeader.indexOf('name'))
    : firstLineFields.length > 1
      ? 1
      : 0
  const categoryFieldIndex = hasHeader
    ? normalizedHeader.indexOf('category')
    : firstLineFields.length > 2
      ? 2
      : -1
  const startLineIndex = hasHeader ? 1 : 0

  const definitions: TagDefinitionRecord[] = []
  for (let lineIndex = startLineIndex; lineIndex < lines.length; lineIndex += 1) {
    const fields = parseCsvLine(lines[lineIndex]).map((field) => field.trim())
    const name = (fields[nameFieldIndex] ?? fields[0] ?? '').trim()
    if (name.length === 0) {
      continue
    }
    const category = categoryFieldIndex >= 0 ? (fields[categoryFieldIndex] ?? '').trim() : ''
    definitions.push({
      name,
      category: category.length > 0 ? category : null,
    })
  }

  return definitions
}

function decodeOutputTensorValues(tensor: ort.Tensor): number[] {
  if (tensor.type === 'float16' && tensor.data instanceof Uint16Array) {
    return Array.from(tensor.data, (value) => fromFloat16Bits(value))
  }

  if (ArrayBuffer.isView(tensor.data)) {
    return Array.from(tensor.data as ArrayLike<number>, (value) => Number(value))
  }

  return []
}

async function buildImageInputTensor(
  imageBuffer: Buffer,
  metadata: ort.InferenceSession.ValueMetadata | undefined,
): Promise<ort.Tensor> {
  const spec = resolveWarmupInputSpec(metadata)
  const [batch, dim1, dim2, dim3] = spec.dims
  const width = spec.layout === 'nchw' ? dim3 : dim2
  const height = spec.layout === 'nchw' ? dim2 : dim1
  const channels = spec.layout === 'nchw' ? dim1 : dim3

  const sharpModule = await getSharpModule()
  if (!sharpModule?.default) {
    throw new Error('自动标签失败：Sharp 不可用，无法预处理图片')
  }

  const resized = await sharpModule
    .default(imageBuffer, { failOn: 'none' })
    .removeAlpha()
    .resize(width, height, { fit: 'fill' })
    .raw()
    .toBuffer()

  const imageSize = width * height
  const totalLength = batch * imageSize * channels
  const data = createWarmupTypedArray(spec.type, totalLength)

  const readChannel = (pixelOffset: number, channel: number): number => {
    if (channel < 3) {
      return resized[pixelOffset + channel] ?? 0
    }
    return 0
  }

  if (spec.layout === 'nchw') {
    const imageVolume = channels * imageSize
    for (let batchIndex = 0; batchIndex < batch; batchIndex += 1) {
      const batchOffset = batchIndex * imageVolume
      for (let pixelIndex = 0; pixelIndex < imageSize; pixelIndex += 1) {
        const pixelOffset = pixelIndex * 3
        for (let channel = 0; channel < channels; channel += 1) {
          const value = normalizeColorValue(
            spec.type,
            normalizePixelToModelValue(readChannel(pixelOffset, channel)),
          )
          data[batchOffset + channel * imageSize + pixelIndex] = value
        }
      }
    }
  } else {
    const imageVolume = imageSize * channels
    for (let batchIndex = 0; batchIndex < batch; batchIndex += 1) {
      const batchOffset = batchIndex * imageVolume
      for (let pixelIndex = 0; pixelIndex < imageSize; pixelIndex += 1) {
        const srcPixelOffset = pixelIndex * 3
        const dstPixelOffset = batchOffset + pixelIndex * channels
        for (let channel = 0; channel < channels; channel += 1) {
          const value = normalizeColorValue(
            spec.type,
            normalizePixelToModelValue(readChannel(srcPixelOffset, channel)),
          )
          data[dstPixelOffset + channel] = value
        }
      }
    }
  }

  return new ort.Tensor(spec.type, data, spec.dims)
}

export function selectTagsByRanges(
  scores: number[],
  tagLabels: string[],
  ranges: AutoTagScoreRangeRule[],
): string[] {
  if (scores.length === 0 || tagLabels.length === 0 || ranges.length === 0) {
    return []
  }

  const selected = new Set<string>()
  const lastIndex = Math.min(scores.length, tagLabels.length) - 1

  for (const range of ranges) {
    const start = Math.max(0, Math.min(lastIndex, range.startIndex))
    const end = Math.max(start, Math.min(lastIndex, range.endIndex))
    for (let index = start; index <= end; index += 1) {
      if (scores[index] >= range.minScore) {
        const tag = tagLabels[index]?.trim()
        if (tag) {
          selected.add(tag)
        }
      }
    }
  }

  return Array.from(selected)
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

  async generateTagsForPackage(request: GenerateTagsForPackageRequest): Promise<GenerateTagsForPackageResult> {
    const modelPathRaw = request.modelPath.trim()
    const normalizedModelPath = path.resolve(modelPathRaw)
    const modelDirectory = path.dirname(normalizedModelPath)
    const thresholdConfig: AutoTagThresholdConfig = {
      occurrenceThreshold: Math.max(1, Math.floor(request.occurrenceThreshold)),
      generalMinScore: normalizeScoreThreshold(request.generalMinScore, 0.35),
      characterMinScore: normalizeScoreThreshold(request.characterMinScore, 0.75),
      includeRating: Boolean(request.includeRating),
      ratingMinScore: normalizeScoreThreshold(request.ratingMinScore, 0.5),
    }

    if (!modelPathRaw) {
      throw new Error('自动标签失败：模型路径不能为空')
    }

    await fs.access(normalizedModelPath)
    const tagTablePath = await resolveTagTablePath(modelDirectory)
    const tagDefinitions = await readTagDefinitionsFromTable(tagTablePath)
    const ranges = buildAutoTagRangesByCategory(tagDefinitions, thresholdConfig)
    const tagLabels = tagDefinitions.map((item) => item.name)

    if (tagLabels.length === 0) {
      throw new Error('自动标签失败：标签表为空或不可解析')
    }
    if (ranges.length === 0) {
      throw new Error('自动标签失败：标签表中未找到可用分类区间')
    }

    const session = await ort.InferenceSession.create(normalizedModelPath)
    const inputName = session.inputNames[0]
    if (!inputName) {
      throw new Error('自动标签失败：模型输入为空')
    }

    const inputMetadata = session.inputMetadata.find((item) => item.name === inputName)
    const tagOccurrence = new Map<string, number>()
    let analyzedImages = 0

    for (const locator of request.imageLocators) {
      const imageBuffer = await request.readImageBuffer(locator).catch(() => null)
      if (!imageBuffer || imageBuffer.length === 0) {
        continue
      }

      const tags = await this.runSingleImageTagInference({
        session,
        inputName,
        inputMetadata,
        imageBuffer,
        tagLabels,
        ranges,
      })

      analyzedImages += 1
      for (const tag of tags) {
        tagOccurrence.set(tag, (tagOccurrence.get(tag) ?? 0) + 1)
      }
    }

    const generatedTags = Array.from(tagOccurrence.entries())
      .filter(([, count]) => count >= thresholdConfig.occurrenceThreshold)
      .sort((left, right) => {
        if (right[1] !== left[1]) {
          return right[1] - left[1]
        }
        return left[0].localeCompare(right[0], 'zh-CN')
      })
      .map(([tag]) => tag)

    return {
      generatedTags,
      analyzedImages,
    }
  }

  private async runSingleImageTagInference(params: {
    session: ort.InferenceSession
    inputName: string
    inputMetadata: ort.InferenceSession.ValueMetadata | undefined
    imageBuffer: Buffer
    tagLabels: string[]
    ranges: AutoTagScoreRangeRule[]
  }): Promise<string[]> {
    const tensor = await buildImageInputTensor(params.imageBuffer, params.inputMetadata)
    const outputMap = await params.session.run({
      [params.inputName]: tensor,
    })

    const outputName = params.session.outputNames[0] ?? Object.keys(outputMap)[0]
    if (!outputName) {
      return []
    }

    const outputTensor = outputMap[outputName]
    if (!outputTensor) {
      return []
    }

    const values = decodeOutputTensorValues(outputTensor)
    if (values.length === 0) {
      return []
    }

    const outputShape = normalizeOutputShape(outputTensor.dims)
    const batchSize = outputShape && outputShape.length > 1 ? Math.max(1, outputShape[0]) : 1
    const stride = Math.max(1, Math.floor(values.length / batchSize))
    const firstBatchScores = values.slice(0, stride)

    return selectTagsByRanges(firstBatchScores, params.tagLabels, params.ranges)
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
    const csvTagCount = await readTagCountFromTagTable(path.dirname(modelPath))
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
