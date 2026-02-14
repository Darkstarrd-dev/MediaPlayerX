import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_SHORTCUTS } from '../../shortcuts'
import { buildSettingsPanelProps } from './buildSettingsPanelProps'

describe('buildSettingsPanelProps', () => {
  it('wires thumbnail settings fields and callbacks', () => {
    const updateSettings = vi.fn()

    const props = buildSettingsPanelProps({
      settingsOpen: true,
      styleId: 'flush',
      paletteId: 'parchment',
      paletteMode: 'day',
      paletteDayId: 'parchment',
      paletteNightId: 'tokyo-night',
      headerHeight: 56,
      settingsFontSize: 14,
      sidebarRatio: 0.26,
      sidebarMinWidth: 180,
      layoutLocked: false,
      electronNativeChromeEnabled: false,
      sidebarFontSize: 14,
      sidebarCountFontSize: 12,
      sidebarIndentStep: 14,
      sidebarVerticalGap: 2,
      metadataRatio: 0.28,
      workspaceBottomPanelHeight: 164,
      fullscreenVideoControlsMaxWidth: 980,
      thumbnailGap: 8,
      thumbnailQuality: 40,
      thumbnailWidth: 512,
      proxyServer: '',
      ehentaiCookies: '',
      adReviewVisionEndpoint: 'http://127.0.0.1:1234/v1/chat/completions',
      adReviewVisionModel: '',
      adReviewVisionVerified: false,
      adReviewVisionTestPending: false,
      adReviewVisionTestMessage: null,
      adReviewVisionSavePending: false,
      adReviewVisionSaveMessage: null,
      shortcuts: { ...DEFAULT_SHORTCUTS },
      shortcutConflicts: [],
      databaseResetPending: false,
      databaseResetError: null,
      runtimePathUpdatePending: false,
      runtimePathUpdateMessage: null,
      repositoryMode: 'mock',
      backendBridgeInjected: false,
      runtimeInfoLoading: false,
      runtimeInfoError: null,
      runtimeInfo: null,
      refreshRuntimeInfo: vi.fn(),
      updateSettings,
      applySidebarRatio: vi.fn(),
      applyMetadataRatio: vi.fn(),
      applyElectronNativeChromeEnabled: vi.fn(),
      setShortcut: vi.fn(),
      resetShortcuts: vi.fn(),
      clearDatabaseForDev: vi.fn(),
      testAdReviewVisionModel: vi.fn(),
      saveAdReviewVisionModel: vi.fn(),
      pickDatabaseDirectoryPath: vi.fn(),
      pickThumbnailCacheDirectoryPath: vi.fn(),
    })

    expect(props.thumbnailWidth).toBe(512)
    expect(props.thumbnailQuality).toBe(40)
    expect(props.thumbnailGap).toBe(8)
    expect(props.paletteMode).toBe('day')

    props.onThumbnailWidthChange(1024)
    props.onThumbnailQualityChange(65)
    props.onThumbnailGapChange(12)
    props.onPaletteModeChange('night')
    props.onPaletteDayChange('geist-light')
    props.onPaletteNightChange('tokyo-night')

    expect(updateSettings).toHaveBeenNthCalledWith(1, { thumbnailWidth: 1024 })
    expect(updateSettings).toHaveBeenNthCalledWith(2, { thumbnailQuality: 65 })
    expect(updateSettings).toHaveBeenNthCalledWith(3, { thumbnailGap: 12 })
    expect(updateSettings).toHaveBeenNthCalledWith(4, {
      paletteMode: 'night',
      paletteDayId: 'parchment',
      paletteNightId: 'tokyo-night',
      paletteId: 'tokyo-night',
      themeId: 'tokyo-night',
    })
    expect(updateSettings).toHaveBeenNthCalledWith(5, {
      paletteDayId: 'geist-light',
      paletteNightId: 'tokyo-night',
      paletteId: 'geist-light',
      themeId: 'geist-light',
    })
    expect(updateSettings).toHaveBeenNthCalledWith(6, {
      paletteDayId: 'parchment',
      paletteNightId: 'tokyo-night',
    })
  })
})
