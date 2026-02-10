import { describe, expect, it } from 'vitest'

import { extractAdReviewJson } from './jsonExtract'

describe('extractAdReviewJson', () => {
  it('可解析纯 JSON 输出', () => {
    const parsed = extractAdReviewJson('{"is_ad": true, "reason": "contains qr code"}')
    expect(parsed).toEqual({
      isAd: true,
      reason: 'contains qr code',
    })
  })

  it('可解析 markdown code fence 包裹的 JSON', () => {
    const parsed = extractAdReviewJson('```json\n{"is_ad":false,"reason":"normal story page"}\n```')
    expect(parsed).toEqual({
      isAd: false,
      reason: 'normal story page',
    })
  })

  it('可解析叙述文本中的 JSON 子串', () => {
    const parsed = extractAdReviewJson('结论如下：{"isAd": true, "reason": "promo banner"}，请处理。')
    expect(parsed).toEqual({
      isAd: true,
      reason: 'promo banner',
    })
  })

  it('在 JSON 语法不完整时可回退到正则解析', () => {
    const parsed = extractAdReviewJson('is_ad: true, reason: "qr"')
    expect(parsed).toEqual({
      isAd: true,
      reason: 'qr',
    })
  })

  it('无法解析时返回 null', () => {
    expect(extractAdReviewJson('totally unrelated output')).toBeNull()
  })
})
