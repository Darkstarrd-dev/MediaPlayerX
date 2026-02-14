import { act, renderHook, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_SETTINGS } from '../../store/useUiStore'
import { useSettingsPersistence } from './useSettingsPersistence'

describe('useSettingsPersistence', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('migrates legacy themeId into styleId + paletteId on hydration', async () => {
    const updateSettings = vi.fn()
    const readAppState = vi.fn().mockResolvedValue({
      state_json: JSON.stringify({ themeId: 'tokyo-night' }),
    })
    const repository = {
      readAppState,
    } as unknown as Parameters<typeof useSettingsPersistence>[0]['repository']

    renderHook(() =>
      useSettingsPersistence({
        settings: DEFAULT_SETTINGS,
        repository,
        updateSettings,
      }),
    )

    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          themeId: 'tokyo-night',
          styleId: 'flush',
          paletteId: 'tokyo-night',
        }),
      )
    })
  })

  it('hydrates and clamps ad review settings into safe ranges', async () => {
    const updateSettings = vi.fn()
    const readAppState = vi.fn().mockResolvedValue({
      state_json: JSON.stringify({
        adReviewMaxConcurrency: 99,
      }),
    })
    const repository = {
      readAppState,
    } as unknown as Parameters<typeof useSettingsPersistence>[0]['repository']

    renderHook(() =>
      useSettingsPersistence({
        settings: DEFAULT_SETTINGS,
        repository,
        updateSettings,
      }),
    )

    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          adReviewMaxConcurrency: 12,
        }),
      )
    })
  })

  it('migrates legacy vectorPanelHeight into workspaceBottomPanelHeight on hydration', async () => {
    const updateSettings = vi.fn()
    const readAppState = vi.fn().mockResolvedValue({
      state_json: JSON.stringify({
        vectorPanelHeight: 248,
      }),
    })
    const repository = {
      readAppState,
    } as unknown as Parameters<typeof useSettingsPersistence>[0]['repository']

    renderHook(() =>
      useSettingsPersistence({
        settings: DEFAULT_SETTINGS,
        repository,
        updateSettings,
      }),
    )

    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceBottomPanelHeight: 248,
        }),
      )
    })
  })

  it('sanitizes music visualizer settings on hydration', async () => {
    const updateSettings = vi.fn()
    const readAppState = vi.fn().mockResolvedValue({
      state_json: JSON.stringify({
        musicVisualizerRenderLongEdgePx: 99999,
        musicVisualizerFpsCap: 75,
        musicVisualizerSelectedShaderId: 1,
        musicVisualizerToneMapMode: 'filmic',
        musicVisualizerToneMapExposure: 8,
        musicVisualizerToneMapStrength: -3,
        musicVisualizerShowFps: 'true',
        musicVisualizerRenderer: 'metal',
      }),
    })
    const repository = {
      readAppState,
    } as unknown as Parameters<typeof useSettingsPersistence>[0]['repository']

    renderHook(() =>
      useSettingsPersistence({
        settings: DEFAULT_SETTINGS,
        repository,
        updateSettings,
      }),
    )

    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalled()
    })

    const hydrationPatch = updateSettings.mock.calls[0]?.[0] as Record<string, unknown>
    expect(hydrationPatch.musicVisualizerRenderLongEdgePx).toBe(4096)
    expect(hydrationPatch).not.toHaveProperty('musicVisualizerFpsCap')
    expect(hydrationPatch).not.toHaveProperty('musicVisualizerSelectedShaderId')
    expect(hydrationPatch.musicVisualizerToneMapMode).toBe('filmic')
    expect(hydrationPatch.musicVisualizerToneMapExposure).toBe(2)
    expect(hydrationPatch.musicVisualizerToneMapStrength).toBe(0)
    expect(hydrationPatch).not.toHaveProperty('musicVisualizerShowFps')
    expect(hydrationPatch).not.toHaveProperty('musicVisualizerRenderer')
  })

  it('sanitizes per-shader visualizer settings map on hydration', async () => {
    const updateSettings = vi.fn()
    const readAppState = vi.fn().mockResolvedValue({
      state_json: JSON.stringify({
        musicVisualizerSelectedShaderId: 'singularity',
        musicVisualizerShaderSettingsById: {
          singularity: {
            renderLongEdgePx: 99999,
            fpsCap: 120,
            toneMapMode: 'khronos',
            toneMapExposure: 9,
            toneMapStrength: -2,
            showFps: true,
            renderer: 'gpu',
          },
          bad: {
            renderLongEdgePx: 'x',
          },
        },
      }),
    })
    const repository = {
      readAppState,
    } as unknown as Parameters<typeof useSettingsPersistence>[0]['repository']

    renderHook(() =>
      useSettingsPersistence({
        settings: DEFAULT_SETTINGS,
        repository,
        updateSettings,
      }),
    )

    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalled()
    })

    const hydrationPatch = updateSettings.mock.calls[0]?.[0] as Record<string, unknown>
    expect(hydrationPatch.musicVisualizerSelectedShaderId).toBe('singularity')
    expect(hydrationPatch.musicVisualizerShaderSettingsById).toEqual({
      singularity: {
        renderLongEdgePx: 4096,
        foregroundBackgroundScaleRatio: 2,
        fpsCap: 120,
        toneMapMode: 'khronos',
        toneMapExposure: 2,
        toneMapStrength: 0,
        showFps: true,
        renderer: 'gpu',
      },
    })
  })

  it('does not overwrite local changes made before hydration resolves', async () => {
    const deferred: { resolve: (value: unknown) => void } = {
      resolve: () => void 0,
    }
    const readAppState = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          deferred.resolve = resolve
        }),
    )

    const repository = {
      readAppState,
    } as unknown as Parameters<typeof useSettingsPersistence>[0]['repository']

    function useHarness() {
      const [settings, setSettings] = useState(DEFAULT_SETTINGS)
      const updateSettings = (patch: Parameters<typeof useSettingsPersistence>[0]['updateSettings'] extends (arg: infer A) => void ? A : never) => {
        setSettings((prev) => ({
          ...prev,
          ...patch,
        }))
      }

      useSettingsPersistence({
        settings,
        repository,
        updateSettings,
      })

      return {
        settings,
        updateSettings,
      }
    }

    const { result } = renderHook(() => useHarness())

    act(() => {
      result.current.updateSettings({
        adReviewVisionEndpoint: 'http://localhost:1234/v1/chat/completions',
        adReviewVisionModel: 'local-new-model',
      })
    })

    deferred.resolve({
      state_json: JSON.stringify({
        adReviewVisionEndpoint: 'http://127.0.0.1:1234/v1/chat/completions',
        adReviewVisionModel: 'persisted-old-model',
      }),
    })

    await waitFor(() => {
      expect(result.current.settings.adReviewVisionEndpoint).toBe('http://localhost:1234/v1/chat/completions')
      expect(result.current.settings.adReviewVisionModel).toBe('local-new-model')
    })
  })

  it('still persists settings when readAppState is unavailable', async () => {
    vi.useFakeTimers()
    const writeAppState = vi.fn().mockResolvedValue({})
    const repository = {
      writeAppState,
    } as unknown as Parameters<typeof useSettingsPersistence>[0]['repository']

    function useHarness() {
      const [settings, setSettings] = useState(DEFAULT_SETTINGS)
      const updateSettings = (patch: Parameters<typeof useSettingsPersistence>[0]['updateSettings'] extends (arg: infer A) => void ? A : never) => {
        setSettings((prev) => ({
          ...prev,
          ...patch,
        }))
      }

      useSettingsPersistence({
        settings,
        repository,
        updateSettings,
      })

      return {
        settings,
        updateSettings,
      }
    }

    const { result } = renderHook(() => useHarness())

    act(() => {
      result.current.updateSettings({ adReviewVisionModel: 'persist-model' })
      vi.advanceTimersByTime(1200)
    })

    await Promise.resolve()
    await Promise.resolve()
    expect(writeAppState).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })

  it('flushes pending settings before window unload', async () => {
    vi.useFakeTimers()
    const writeAppState = vi.fn().mockResolvedValue({})
    const repository = {
      writeAppState,
    } as unknown as Parameters<typeof useSettingsPersistence>[0]['repository']

    function useHarness() {
      const [settings, setSettings] = useState(DEFAULT_SETTINGS)
      const updateSettings = (patch: Parameters<typeof useSettingsPersistence>[0]['updateSettings'] extends (arg: infer A) => void ? A : never) => {
        setSettings((prev) => ({
          ...prev,
          ...patch,
        }))
      }

      useSettingsPersistence({
        settings,
        repository,
        updateSettings,
      })

      return {
        settings,
        updateSettings,
      }
    }

    const { result } = renderHook(() => useHarness())
    await Promise.resolve()

    act(() => {
      result.current.updateSettings({ headerHeight: 72 })
    })

    act(() => {
      window.dispatchEvent(new Event('beforeunload'))
    })

    await Promise.resolve()
    await Promise.resolve()
    expect(writeAppState).toHaveBeenCalledTimes(1)
    expect(writeAppState).toHaveBeenCalledWith(
      expect.objectContaining({
        state_key: 'ui_settings_v1',
      }),
    )
    expect(writeAppState.mock.calls[0][0].state_json).toContain('"headerHeight":72')
  })
})
