import { assertNotAborted, createAbortError } from './concurrency'
import { extractAdReviewJson } from './jsonExtract'
import { AD_REVIEW_SYSTEM_PROMPT, AD_REVIEW_USER_PROMPT } from './prompts'
import type { AdReviewDetectionResult, AdVisionClient } from './types'

type FetchLike = typeof fetch

interface OpenAiVisionClientOptions {
  endpoint: string
  model: string
  apiKey?: string
  timeoutMs?: number
  resizePx?: number
  maxTokens?: number
  temperature?: number
  fetchImpl?: FetchLike
  imageToDataUrl?: (imageBytes: Uint8Array, resizePx: number) => Promise<string>
  systemPrompt?: string
  userPrompt?: string
}

function detectImageMimeType(bytes: Uint8Array): string {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png'
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp'
  }

  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return 'image/bmp'
  }

  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return 'image/gif'
  }

  return 'image/jpeg'
}

async function defaultImageToDataUrl(imageBytes: Uint8Array, resizePx: number): Promise<string> {
  const normalizedResizePx = Math.max(64, Math.min(2048, Math.floor(resizePx)))

  try {
    const sharpModule = await import('sharp')
    const sharp = sharpModule.default
    const jpegBuffer = await sharp(Buffer.from(imageBytes), { failOn: 'none' })
      .rotate()
      .resize({
        width: normalizedResizePx,
        height: normalizedResizePx,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toBuffer()

    return `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`
  } catch {
    const mime = detectImageMimeType(imageBytes)
    return `data:${mime};base64,${Buffer.from(imageBytes).toString('base64')}`
  }
}

export function normalizeChatCompletionsUrl(endpoint: string): string {
  const trimmed = endpoint.trim()
  if (!trimmed) {
    throw new Error('LLM endpoint 不能为空')
  }

  const rewritePath = (pathnameInput: string): string => {
    const pathname = pathnameInput.replace(/\/+$/, '')
    if (pathname.endsWith('/chat/completions')) {
      return pathname
    }
    if (pathname.endsWith('/embeddings')) {
      return pathname.replace(/\/embeddings$/, '/chat/completions')
    }
    if (pathname.endsWith('/v1')) {
      return `${pathname}/chat/completions`
    }
    return `${pathname}/chat/completions`
  }

  try {
    const parsed = new URL(trimmed)
    parsed.pathname = rewritePath(parsed.pathname)
    parsed.search = ''
    parsed.hash = ''
    return parsed.toString()
  } catch {
    return rewritePath(trimmed)
  }
}

function extractMessageTextFromChatResponse(responseBody: unknown): string | null {
  if (!responseBody || typeof responseBody !== 'object') {
    return null
  }

  const choices = (responseBody as { choices?: unknown }).choices
  if (!Array.isArray(choices) || choices.length === 0) {
    return null
  }

  const firstChoice = choices[0]
  if (!firstChoice || typeof firstChoice !== 'object') {
    return null
  }

  const message = (firstChoice as { message?: unknown }).message
  if (!message || typeof message !== 'object') {
    return null
  }

  const content = (message as { content?: unknown }).content
  if (typeof content === 'string') {
    return content
  }

  if (!Array.isArray(content)) {
    return null
  }

  const textParts: string[] = []
  for (const item of content) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const text = (item as { text?: unknown }).text
    if (typeof text === 'string' && text.trim()) {
      textParts.push(text)
    }
  }

  if (textParts.length === 0) {
    return null
  }

  return textParts.join('\n')
}

function createRequestSignal(timeoutMs: number, parentSignal?: AbortSignal): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort(createAbortError(`LLM 请求超时: ${timeoutMs}ms`))
  }, timeoutMs)

  const onParentAbort = () => {
    controller.abort(createAbortError('操作已取消'))
  }

  if (parentSignal?.aborted) {
    onParentAbort()
  } else {
    parentSignal?.addEventListener('abort', onParentAbort, { once: true })
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId)
      parentSignal?.removeEventListener('abort', onParentAbort)
    },
  }
}

export class OpenAiVisionClient implements AdVisionClient {
  private readonly endpoint: string
  private readonly model: string
  private readonly apiKey: string
  private readonly timeoutMs: number
  private readonly resizePx: number
  private readonly maxTokens: number
  private readonly temperature: number
  private readonly fetchImpl: FetchLike
  private readonly imageToDataUrl: (imageBytes: Uint8Array, resizePx: number) => Promise<string>
  private readonly systemPrompt: string
  private readonly userPrompt: string

  constructor(options: OpenAiVisionClientOptions) {
    this.endpoint = normalizeChatCompletionsUrl(options.endpoint)
    this.model = options.model.trim()
    this.apiKey = options.apiKey?.trim() || 'lm-studio'
    this.timeoutMs = Math.max(1_000, Math.floor(options.timeoutMs ?? 45_000))
    this.resizePx = Math.max(64, Math.floor(options.resizePx ?? 512))
    this.maxTokens = Math.max(32, Math.floor(options.maxTokens ?? 120))
    this.temperature = Number.isFinite(options.temperature) ? Number(options.temperature) : 0
    this.fetchImpl = options.fetchImpl ?? fetch
    this.imageToDataUrl = options.imageToDataUrl ?? defaultImageToDataUrl
    this.systemPrompt = options.systemPrompt ?? AD_REVIEW_SYSTEM_PROMPT
    this.userPrompt = options.userPrompt ?? AD_REVIEW_USER_PROMPT

    if (!this.model) {
      throw new Error('LLM model 不能为空')
    }
  }

  async detectAd(params: { imageBytes: Uint8Array; signal?: AbortSignal }): Promise<AdReviewDetectionResult> {
    assertNotAborted(params.signal)

    const imageUrl = await this.imageToDataUrl(params.imageBytes, this.resizePx)
    assertNotAborted(params.signal)

    const payload = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: this.systemPrompt,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: this.userPrompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: this.maxTokens,
      temperature: this.temperature,
    }

    const { signal, cleanup } = createRequestSignal(this.timeoutMs, params.signal)

    let response: Response
    try {
      response = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal,
      })
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error
      }
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`LLM 请求失败: ${message}`)
    } finally {
      cleanup()
    }

    const bodyText = await response.text()
    if (!response.ok) {
      throw new Error(`LLM 请求失败: HTTP ${response.status} ${response.statusText} - ${bodyText.slice(0, 300)}`)
    }

    let responseBody: unknown
    try {
      responseBody = JSON.parse(bodyText)
    } catch {
      throw new Error(`LLM 响应不是合法 JSON: ${bodyText.slice(0, 300)}`)
    }

    const rawContent = extractMessageTextFromChatResponse(responseBody)
    if (!rawContent) {
      throw new Error('LLM 响应缺少 message.content')
    }

    const parsed = extractAdReviewJson(rawContent)
    if (!parsed) {
      throw new Error(`LLM 响应无法解析广告判定 JSON: ${rawContent.slice(0, 300)}`)
    }

    return {
      isAd: parsed.isAd,
      reason: parsed.reason,
      rawText: rawContent,
    }
  }
}

export type { OpenAiVisionClientOptions }
