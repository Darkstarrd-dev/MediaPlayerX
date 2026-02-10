import { promises as fs } from 'node:fs'
import path from 'node:path'

import * as ort from 'onnxruntime-node'

import {
  testWdSwinTaggerModelResponseSchema,
  type TestWdSwinTaggerModelRequestDto,
  type TestWdSwinTaggerModelResponseDto,
} from '../../../src/contracts/backend'

const DEFAULT_TEST_TIMEOUT_MS = 30_000
const WARMUP_INPUT_DIMS = [1, 3, 448, 448] as const
const TAGS_CSV_FILE_NAME = 'selected_tags.csv'

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

function buildWarmupInputTensor(): ort.Tensor {
  const [batch, channels, height, width] = WARMUP_INPUT_DIMS
  const imageSize = height * width
  const data = new Float32Array(batch * channels * imageSize)

  for (let index = 0; index < imageSize; index += 1) {
    data[index] = 1
    data[imageSize + index] = -1
    data[2 * imageSize + index] = -1
  }

  return new ort.Tensor('float32', data, [batch, channels, height, width])
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

    const outputMap = await session.run({
      [inputName]: buildWarmupInputTensor(),
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
