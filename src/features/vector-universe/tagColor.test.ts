import { describe, expect, it } from 'vitest'

import {
  getVectorUniverseTagColor,
  pickVectorUniversePrimaryTag,
} from './tagColor'

describe('vector universe tag color', () => {
  it('同 tag 始终映射同一颜色', () => {
    const colorA = getVectorUniverseTagColor('city')
    const colorB = getVectorUniverseTagColor('city')
    expect(colorA).toBe(colorB)
  })

  it('多 tag 按首 tag 取色', () => {
    const color = getVectorUniverseTagColor(['forest', 'night', 'fog'])
    expect(color).toBe(getVectorUniverseTagColor('forest'))
    expect(pickVectorUniversePrimaryTag(['forest', 'night', 'fog'])).toBe('forest')
  })

  it('空 tag 输入使用兜底颜色', () => {
    const color = getVectorUniverseTagColor([])
    expect(typeof color).toBe('string')
    expect(color.length).toBeGreaterThan(0)
  })
})
