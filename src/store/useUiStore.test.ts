import { afterEach, describe, expect, it, vi } from 'vitest'

import { resetUiStoreState, useUiStore } from './useUiStore'

describe('useUiStore visualizer settings', () => {
  afterEach(() => {
    resetUiStoreState()
  })

  it('provides visualizer defaults', () => {
    const state = useUiStore.getState()
    expect(state.musicVisualizerRenderLongEdgePx).toBe(1280)
    expect(state.musicVisualizerShowFps).toBe(false)
    expect(state.musicVisualizerRenderer).toBe('gpu')
  })

  it('accepts valid visualizer settings updates', () => {
    useUiStore.getState().updateSettings({
      musicVisualizerRenderLongEdgePx: 1920,
      musicVisualizerShowFps: true,
      musicVisualizerRenderer: 'cpu',
    })

    const state = useUiStore.getState()
    expect(state.musicVisualizerRenderLongEdgePx).toBe(1920)
    expect(state.musicVisualizerShowFps).toBe(true)
    expect(state.musicVisualizerRenderer).toBe('cpu')
  })

  it('rejects invalid visualizer settings updates', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    useUiStore.getState().updateSettings({
      musicVisualizerRenderLongEdgePx: 99999 as unknown as number,
      musicVisualizerRenderer: 'invalid' as unknown as 'gpu',
    })

    const state = useUiStore.getState()
    expect(state.musicVisualizerRenderLongEdgePx).toBe(1280)
    expect(state.musicVisualizerRenderer).toBe('gpu')

    warnSpy.mockRestore()
  })
})
