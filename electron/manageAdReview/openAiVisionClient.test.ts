import { describe, expect, it } from 'vitest'

import { OpenAiVisionClient, normalizeChatCompletionsUrl } from './openAiVisionClient'

describe('normalizeChatCompletionsUrl', () => {
  it('可将 embeddings endpoint 归一化为 chat/completions', () => {
    const normalized = normalizeChatCompletionsUrl('http://127.0.0.1:1234/v1/embeddings')
    expect(normalized).toBe('http://127.0.0.1:1234/v1/chat/completions')
  })

  it('保持已是 chat/completions 的 endpoint', () => {
    const normalized = normalizeChatCompletionsUrl('http://127.0.0.1:1234/v1/chat/completions')
    expect(normalized).toBe('http://127.0.0.1:1234/v1/chat/completions')
  })
})

describe('OpenAiVisionClient', () => {
  it('可调用 OpenAI 兼容接口并解析广告判定 JSON', async () => {
    let capturedUrl = ''
    let capturedBody = ''

    const client = new OpenAiVisionClient({
      endpoint: 'http://127.0.0.1:1234/v1/embeddings',
      model: 'mock-model',
      apiKey: 'mock-key',
      imageToDataUrl: async () => 'data:image/jpeg;base64,Zm9v',
      fetchImpl: async (input, init) => {
        capturedUrl = String(input)
        capturedBody = String(init?.body ?? '')

        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: '```json\n{"is_ad": true, "reason": "promo"}\n```',
                },
              },
            ],
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        )
      },
    })

    const result = await client.detectAd({
      imageBytes: Uint8Array.from([0xff, 0xd8, 0xff]),
    })

    expect(capturedUrl).toBe('http://127.0.0.1:1234/v1/chat/completions')
    expect(capturedBody).toContain('mock-model')
    expect(result).toEqual({
      isAd: true,
      reason: 'promo',
      rawText: '```json\n{"is_ad": true, "reason": "promo"}\n```',
    })
  })

  it('当响应不可解析时抛出错误', async () => {
    const client = new OpenAiVisionClient({
      endpoint: 'http://127.0.0.1:1234/v1',
      model: 'mock-model',
      imageToDataUrl: async () => 'data:image/jpeg;base64,Zm9v',
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: 'not json',
                },
              },
            ],
          }),
          { status: 200 },
        ),
    })

    await expect(
      client.detectAd({
        imageBytes: Uint8Array.from([0xff, 0xd8, 0xff]),
      }),
    ).rejects.toThrow('LLM 响应无法解析广告判定 JSON')
  })
})
