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
})
