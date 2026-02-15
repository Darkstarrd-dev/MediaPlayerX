import { afterEach, describe, expect, it, vi } from 'vitest'

import { resetUiStoreState, useUiStore } from './useUiStore'

describe('useUiStore visualizer settings', () => {
  afterEach(() => {
    resetUiStoreState()
  })

  it('provides visualizer defaults', () => {
    const state = useUiStore.getState()
    expect(state.uiLocale).toBe('auto')
    expect(state.musicVisualizerRenderLongEdgePx).toBe(1280)
    expect(state.musicVisualizerFpsCap).toBe(60)
    expect(state.musicVisualizerSelectedShaderId).toBe('')
    expect(state.musicVisualizerToneMapMode).toBe('aces')
    expect(state.musicVisualizerToneMapExposure).toBe(1)
    expect(state.musicVisualizerToneMapStrength).toBe(0.55)
    expect(state.musicVisualizerShowFps).toBe(false)
    expect(state.musicVisualizerRenderer).toBe('gpu')
    expect(state.musicVisualizerShaderSettingsById['mcs-szb']).toEqual({
      renderLongEdgePx: 1280,
      renderScaleCoeff: 2,
      compositionMode: 'single',
      layeredBackgroundShaderId: 'galaxy',
      layeredForegroundShaderId: 'mcs-szb',
      layeredBackgroundEnabled: true,
      layeredForegroundEnabled: true,
      layeredForegroundOffsetX: 0,
      layeredForegroundOffsetY: 0,
      layeredForegroundScale: 1,
      fpsCap: 60,
      toneMapMode: 'aces',
      toneMapExposure: 1,
      toneMapStrength: 0.55,
      showFps: false,
      renderer: 'gpu',
    })
  })

  it('accepts valid visualizer settings updates', () => {
    useUiStore.getState().updateSettings({
      musicVisualizerRenderLongEdgePx: 1920,
      musicVisualizerFpsCap: 120,
      musicVisualizerSelectedShaderId: 'fungi',
      musicVisualizerToneMapMode: 'reinhard',
      musicVisualizerToneMapExposure: 1.3,
      musicVisualizerToneMapStrength: 0.8,
      musicVisualizerShowFps: true,
      musicVisualizerRenderer: 'cpu',
      uiLocale: 'en-US',
      musicVisualizerShaderSettingsById: {
        fungi: {
          renderLongEdgePx: 1920,
          renderScaleCoeff: 3,
          compositionMode: 'single',
          layeredBackgroundShaderId: 'galaxy',
          layeredForegroundShaderId: 'mcs-szb',
          layeredBackgroundEnabled: true,
          layeredForegroundEnabled: true,
          layeredForegroundOffsetX: 0,
          layeredForegroundOffsetY: 0,
          layeredForegroundScale: 1,
          fpsCap: 120,
          toneMapMode: 'reinhard',
          toneMapExposure: 1.3,
          toneMapStrength: 0.8,
          showFps: true,
          renderer: 'cpu',
        },
      },
    })

    const state = useUiStore.getState()
    expect(state.musicVisualizerRenderLongEdgePx).toBe(1920)
    expect(state.musicVisualizerFpsCap).toBe(120)
    expect(state.musicVisualizerSelectedShaderId).toBe('fungi')
    expect(state.musicVisualizerToneMapMode).toBe('reinhard')
    expect(state.musicVisualizerToneMapExposure).toBe(1.3)
    expect(state.musicVisualizerToneMapStrength).toBe(0.8)
    expect(state.musicVisualizerShowFps).toBe(true)
    expect(state.musicVisualizerRenderer).toBe('cpu')
    expect(state.uiLocale).toBe('en-US')
    expect(state.musicVisualizerShaderSettingsById.fungi).toEqual({
      renderLongEdgePx: 1920,
      renderScaleCoeff: 3,
      compositionMode: 'single',
      layeredBackgroundShaderId: 'galaxy',
      layeredForegroundShaderId: 'mcs-szb',
      layeredBackgroundEnabled: true,
      layeredForegroundEnabled: true,
      layeredForegroundOffsetX: 0,
      layeredForegroundOffsetY: 0,
      layeredForegroundScale: 1,
      fpsCap: 120,
      toneMapMode: 'reinhard',
      toneMapExposure: 1.3,
      toneMapStrength: 0.8,
      showFps: true,
      renderer: 'cpu',
    })
  })

  it('rejects invalid visualizer settings updates', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    useUiStore.getState().updateSettings({
      musicVisualizerRenderLongEdgePx: 99999 as unknown as number,
      musicVisualizerFpsCap: 999 as unknown as 30,
      musicVisualizerSelectedShaderId: 1 as unknown as string,
      musicVisualizerToneMapMode: 'invalid' as unknown as 'off',
      musicVisualizerToneMapExposure: 99 as unknown as number,
      musicVisualizerToneMapStrength: -1 as unknown as number,
      musicVisualizerRenderer: 'invalid' as unknown as 'gpu',
      uiLocale: 'de-DE' as unknown as 'auto',
    })

    const state = useUiStore.getState()
    expect(state.musicVisualizerRenderLongEdgePx).toBe(1280)
    expect(state.musicVisualizerFpsCap).toBe(60)
    expect(state.musicVisualizerSelectedShaderId).toBe('')
    expect(state.musicVisualizerToneMapMode).toBe('aces')
    expect(state.musicVisualizerToneMapExposure).toBe(1)
    expect(state.musicVisualizerToneMapStrength).toBe(0.55)
    expect(state.musicVisualizerRenderer).toBe('gpu')
    expect(state.uiLocale).toBe('auto')

    warnSpy.mockRestore()
  })
})
