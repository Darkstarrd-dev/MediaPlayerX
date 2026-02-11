import { act, renderHook, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_SETTINGS } from '../../store/useUiStore'
import { useSettingsPersistence } from './useSettingsPersistence'

describe('useSettingsPersistence', () => {
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
})
