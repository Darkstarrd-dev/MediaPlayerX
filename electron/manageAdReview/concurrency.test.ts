import { describe, expect, it } from 'vitest'

import { mapWithConcurrency } from './concurrency'

describe('mapWithConcurrency', () => {
  it('遵守并发上限且保持结果顺序', async () => {
    const items = [1, 2, 3, 4, 5, 6]
    let active = 0
    let peak = 0

    const results = await mapWithConcurrency({
      items,
      concurrency: 2,
      worker: async (item) => {
        active += 1
        peak = Math.max(peak, active)

        await new Promise((resolve) => setTimeout(resolve, 8))
        active -= 1
        return item * 10
      },
    })

    expect(peak).toBeLessThanOrEqual(2)
    expect(results).toEqual([10, 20, 30, 40, 50, 60])
  })
})
