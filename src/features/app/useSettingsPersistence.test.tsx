import { renderHook, waitFor } from '@testing-library/react'
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

  it('hydrates and clamps visual auto-tag settings into safe ranges', async () => {
    const updateSettings = vi.fn()
    const readAppState = vi.fn().mockResolvedValue({
      state_json: JSON.stringify({
        visionAutoTagSampleImageCount: 99,
        visionAutoTagOccurrenceThreshold: -3,
        visionAutoTagTemperature: 1.6,
        visionAutoTagTimeoutMs: 999_999,
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
          visionAutoTagSampleImageCount: 24,
          visionAutoTagOccurrenceThreshold: 1,
          visionAutoTagTemperature: 1,
          visionAutoTagTimeoutMs: 120_000,
        }),
      )
    })
  })
})
