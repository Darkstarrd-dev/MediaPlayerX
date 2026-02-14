import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_SHORTCUTS } from '../../shortcuts'
import { buildSettingsPanelProps } from './buildSettingsPanelProps'

describe('buildSettingsPanelProps', () => {
  it('wires visualizer settings fields and callbacks', () => {
    const updateSettings = vi.fn()

    const props = buildSettingsPanelProps({
      settingsOpen: true,
      styleId: 'flush',
      paletteId: 'parchment',
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
      musicVisualizerRenderLongEdgePx: 1920,
      musicVisualizerShowFps: true,
      musicVisualizerRenderer: 'cpu',
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

    expect(props.musicVisualizerRenderLongEdgePx).toBe(1920)
    expect(props.musicVisualizerShowFps).toBe(true)
    expect(props.musicVisualizerRenderer).toBe('cpu')

    props.onMusicVisualizerRenderLongEdgePxChange(1280)
    props.onMusicVisualizerShowFpsChange(false)
    props.onMusicVisualizerRendererChange('gpu')

    expect(updateSettings).toHaveBeenNthCalledWith(1, { musicVisualizerRenderLongEdgePx: 1280 })
    expect(updateSettings).toHaveBeenNthCalledWith(2, { musicVisualizerShowFps: false })
    expect(updateSettings).toHaveBeenNthCalledWith(3, { musicVisualizerRenderer: 'gpu' })
  })
})
