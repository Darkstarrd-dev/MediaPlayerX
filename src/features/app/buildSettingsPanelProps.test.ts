import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_SHORTCUTS } from '../../shortcuts'
import { buildSettingsPanelProps } from './buildSettingsPanelProps'

describe('buildSettingsPanelProps', () => {
  it('wires thumbnail settings fields and callbacks', () => {
    const updateSettings = vi.fn()

    const props = buildSettingsPanelProps({
      settingsOpen: true,
      uiLocale: 'auto',
      styleId: 'flush',
      paletteId: 'parchment',
      paletteMode: 'day',
      paletteDayId: 'parchment',
      paletteNightId: 'tokyo-night',
      headerHeight: 56,
      settingsBackdropOpacity: 18,
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
      mediaPreloadMemoryBudgetMb: 1024,
      thumbnailGap: 8,
      thumbnailQuality: 40,
      thumbnailWidth: 512,
      thumbnailGenerationConcurrency: 4,
      thumbnailResolveConcurrency: 8,
      proxyServer: '',
      ehentaiCookies: '',
      subtitleFeatureEnabled: false,
      subtitleAcceleration: 'auto',
      subtitleModelDir: '',
      subtitleSelectedModelId: null,
      subtitleModelsLoading: false,
      subtitleModelsError: null,
      subtitleModelsStatus: null,
      subtitleRemoteModels: [],
      subtitleLocalModels: [],
      subtitleDownloadTask: null,
      subtitleDownloadPending: false,
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
      mediaCapabilitiesLoading: false,
      mediaCapabilitiesError: null,
      mediaCapabilities: [],
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
      pickSubtitleModelDirectoryPath: vi.fn(),
      pickSubtitleModelLocationPath: vi.fn(),
      refreshSubtitleModels: vi.fn(),
      startSubtitleModelDownload: vi.fn(),
      clearSubtitleLocalModel: vi.fn(),
      cancelSubtitleModelDownload: vi.fn(),
      openSubtitleModelPage: vi.fn(),
    })

    expect(props.thumbnailWidth).toBe(512)
    expect(props.thumbnailQuality).toBe(40)
    expect(props.thumbnailGap).toBe(8)
    expect(props.settingsBackdropOpacity).toBe(18)
    expect(props.paletteMode).toBe('day')

    props.onThumbnailWidthChange(1024)
    props.onThumbnailQualityChange(65)
    props.onThumbnailGapChange(12)
    props.onSettingsBackdropOpacityChange(42)
    props.onPaletteModeChange('night')
    props.onPaletteDayChange('geist-light')
    props.onPaletteNightChange('tokyo-night')
    props.onUiLocaleChange('en-US')
    props.onSubtitleFeatureEnabledChange(true)
    props.onSubtitleAccelerationChange('directml')
    props.onSubtitleSelectedModelIdChange(' sensevoice-small ')

    expect(updateSettings).toHaveBeenNthCalledWith(1, { thumbnailWidth: 1024 })
    expect(updateSettings).toHaveBeenNthCalledWith(2, { thumbnailQuality: 65 })
    expect(updateSettings).toHaveBeenNthCalledWith(3, { thumbnailGap: 12 })
    expect(updateSettings).toHaveBeenNthCalledWith(4, { settingsBackdropOpacity: 42 })
    expect(updateSettings).toHaveBeenNthCalledWith(5, {
      paletteMode: 'night',
      paletteDayId: 'parchment',
      paletteNightId: 'tokyo-night',
      paletteId: 'tokyo-night',
      themeId: 'tokyo-night',
    })
    expect(updateSettings).toHaveBeenNthCalledWith(6, {
      paletteDayId: 'geist-light',
      paletteNightId: 'tokyo-night',
      paletteId: 'geist-light',
      themeId: 'geist-light',
    })
    expect(updateSettings).toHaveBeenNthCalledWith(7, {
      paletteDayId: 'parchment',
      paletteNightId: 'tokyo-night',
    })
    expect(updateSettings).toHaveBeenNthCalledWith(8, { uiLocale: 'en-US' })
    expect(updateSettings).toHaveBeenNthCalledWith(9, { subtitleFeatureEnabled: true })
    expect(updateSettings).toHaveBeenNthCalledWith(10, { subtitleAcceleration: 'directml' })
    expect(updateSettings).toHaveBeenNthCalledWith(11, { subtitleSelectedModelId: 'sensevoice-small' })
  })
})
