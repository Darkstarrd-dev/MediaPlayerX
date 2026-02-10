import { describe, expect, it } from 'vitest'

import { computeSha256Hex, InMemoryKnownHashStore } from './hashStore'
import { runManageAdReview } from './adReviewEngine'
import type { AdVisionClient, ManageAdReviewImageInput } from './types'

function makeImageInput(imageId: string, ordinal: number, bytes: number[]): ManageAdReviewImageInput {
  return {
    imageId,
    ordinal,
    fileName: `${imageId}.png`,
    getImageBytes: async () => Uint8Array.from(bytes),
  }
}

describe('runManageAdReview', () => {
  it('优先命中已知哈希并跳过对应 LLM 调用', async () => {
    const bytesA = Uint8Array.from([1, 10, 11])
    const bytesB = Uint8Array.from([2, 10, 11])
    const bytesC = Uint8Array.from([3, 10, 11])

    const knownHashStore = new InMemoryKnownHashStore([computeSha256Hex(bytesA)])

    let llmCalls = 0
    const client: AdVisionClient = {
      detectAd: async ({ imageBytes }) => {
        llmCalls += 1
        if (imageBytes[0] === 2) {
          return {
            isAd: true,
            reason: 'qr_code',
            rawText: '{"is_ad":true,"reason":"qr_code"}',
          }
        }

        throw new Error('mock_network_error')
      },
    }

    const result = await runManageAdReview(
      {
        containers: [
          {
            containerId: 'pkg-1',
            images: [
              {
                imageId: 'a',
                ordinal: 1,
                fileName: 'a.png',
                getImageBytes: async () => bytesA,
              },
              {
                imageId: 'b',
                ordinal: 2,
                fileName: 'b.png',
                getImageBytes: async () => bytesB,
              },
              {
                imageId: 'c',
                ordinal: 3,
                fileName: 'c.png',
                getImageBytes: async () => bytesC,
              },
            ],
          },
        ],
      },
      {
        client,
        hashStore: knownHashStore,
        strategy: { mode: 'all' },
        concurrency: 2,
      },
    )

    expect(llmCalls).toBe(2)
    expect(result.summary).toMatchObject({
      total: 3,
      suspected: 2,
      clean: 0,
      failed: 1,
      skipped: 0,
      knownHashHits: 1,
      llmCalls: 2,
    })

    expect(result.items.map((item) => [item.imageId, item.status, item.source, item.reason])).toEqual([
      ['a', 'suspected', 'known-hash', 'known_hash'],
      ['b', 'suspected', 'llm', 'qr_code'],
      ['c', 'failed', 'llm-error', 'mock_network_error'],
    ])
  })

  it('在 head-tail 策略下仅扫描必要窗口并标记跳过项', async () => {
    const callOrder: number[] = []

    const client: AdVisionClient = {
      detectAd: async ({ imageBytes }) => {
        const marker = imageBytes[0]
        callOrder.push(marker)

        if (marker === 6) {
          return {
            isAd: true,
            reason: 'tail_ad',
            rawText: '{"is_ad":true,"reason":"tail_ad"}',
          }
        }

        return {
          isAd: false,
          reason: 'clean',
          rawText: '{"is_ad":false,"reason":"clean"}',
        }
      },
    }

    const images: ManageAdReviewImageInput[] = [
      makeImageInput('img-1', 1, [1]),
      makeImageInput('img-2', 2, [2]),
      makeImageInput('img-3', 3, [3]),
      makeImageInput('img-4', 4, [4]),
      makeImageInput('img-5', 5, [5]),
      makeImageInput('img-6', 6, [6]),
    ]

    const result = await runManageAdReview(
      {
        containers: [
          {
            containerId: 'pkg-2',
            images,
          },
        ],
      },
      {
        client,
        concurrency: 1,
        strategy: {
          mode: 'head-tail',
          headN: 1,
          tailN: 1,
          tailStopCleanStreak: 2,
        },
      },
    )

    expect(callOrder).toEqual([6, 1, 5, 4])

    const statusByImageId = new Map(result.items.map((item) => [item.imageId, `${item.status}:${item.reason}`]))
    expect(statusByImageId.get('img-1')).toBe('clean:clean')
    expect(statusByImageId.get('img-2')).toBe('skipped:tail_extension_stop')
    expect(statusByImageId.get('img-3')).toBe('skipped:tail_extension_stop')
    expect(statusByImageId.get('img-4')).toBe('clean:clean')
    expect(statusByImageId.get('img-5')).toBe('clean:clean')
    expect(statusByImageId.get('img-6')).toBe('suspected:tail_ad')

    expect(result.summary).toMatchObject({
      total: 6,
      suspected: 1,
      clean: 3,
      failed: 0,
      skipped: 2,
      knownHashHits: 0,
      llmCalls: 4,
    })
  })
})
