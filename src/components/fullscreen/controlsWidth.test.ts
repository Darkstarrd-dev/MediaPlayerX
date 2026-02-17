import { describe, expect, it } from 'vitest'

import { resolveFullscreenControlsWidth } from './controlsWidth'

describe('resolveFullscreenControlsWidth', () => {
  it('按 16:9 参考宽度的 45% 计算', () => {
    const width = resolveFullscreenControlsWidth({
      viewportWidth: 1920,
      viewportHeight: 1080,
      widthCap: 980,
    })

    expect(width).toBe(864)
  })

  it('45% 结果不足按钮总占位时使用最小宽度', () => {
    const width = resolveFullscreenControlsWidth({
      viewportWidth: 1280,
      viewportHeight: 720,
      widthCap: 980,
    })

    expect(width).toBe(668)
  })

  it('宽度受上限配置约束', () => {
    const width = resolveFullscreenControlsWidth({
      viewportWidth: 1920,
      viewportHeight: 1080,
      widthCap: 700,
    })

    expect(width).toBe(700)
  })

  it('窄屏下不超出可用视口', () => {
    const width = resolveFullscreenControlsWidth({
      viewportWidth: 640,
      viewportHeight: 360,
      widthCap: 980,
    })

    expect(width).toBe(624)
  })
})
