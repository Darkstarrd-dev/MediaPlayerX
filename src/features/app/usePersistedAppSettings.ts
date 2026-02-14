import type { MediaRepository } from '../backend/repository'
import type { AppSettings } from '../../contracts/settings'
import type { AppSettingsStoreSnapshot } from './useAppSettingsStore'
import { useSettingsPersistence } from './useSettingsPersistence'

interface UsePersistedAppSettingsParams {
  settings: AppSettingsStoreSnapshot
  repository: MediaRepository
}

export const SETTINGS_STATE_KEY = 'ui_settings_v1'

export function toPersistedAppSettings(settings: AppSettingsStoreSnapshot): AppSettings {
  return {
    mode: settings.mode,
    vectorMode: settings.vectorMode,
    settingsOpen: settings.settingsOpen,
    headerHeight: settings.headerHeight,
    settingsFontSize: settings.settingsFontSize,
    sidebarRatio: settings.sidebarRatio,
    sidebarMinWidth: settings.sidebarMinWidth,
    layoutLocked: settings.layoutLocked,
    electronNativeChromeEnabled: settings.electronNativeChromeEnabled,
    sidebarFontSize: settings.sidebarFontSize,
    sidebarCountFontSize: settings.sidebarCountFontSize,
    sidebarIndentStep: settings.sidebarIndentStep,
    sidebarVerticalGap: settings.sidebarVerticalGap,
    metadataRatio: settings.metadataRatio,
    workspaceBottomPanelHeight: settings.workspaceBottomPanelHeight,
    fullscreenVideoControlsMaxWidth: settings.fullscreenVideoControlsMaxWidth,
    thumbnailScale: settings.thumbnailScale,
    thumbnailGap: settings.thumbnailGap,
    showNamesOnly: settings.showNamesOnly,
    metadataCollapsed: settings.metadataCollapsed,
    autoPlayEnabled: settings.autoPlayEnabled,
    autoPlayInterval: settings.autoPlayInterval,
    searchField: settings.searchField,
    searchText: settings.searchText,
    vectorThreshold: settings.vectorThreshold,
    sidebarFocus: settings.sidebarFocus,
    imageRootNodeId: settings.imageRootNodeId,
    videoRootNodeId: settings.videoRootNodeId,
    musicRootNodeId: settings.musicRootNodeId,
    themeId: settings.themeId,
    styleId: settings.styleId,
    paletteId: settings.paletteId,
    thumbnailQuality: settings.thumbnailQuality,
    thumbnailWidth: settings.thumbnailWidth,
    musicVisualizerRenderLongEdgePx: settings.musicVisualizerRenderLongEdgePx,
    musicVisualizerFpsCap: settings.musicVisualizerFpsCap,
    musicVisualizerSelectedShaderId: settings.musicVisualizerSelectedShaderId,
    musicVisualizerToneMapMode: settings.musicVisualizerToneMapMode,
    musicVisualizerToneMapExposure: settings.musicVisualizerToneMapExposure,
    musicVisualizerToneMapStrength: settings.musicVisualizerToneMapStrength,
    musicVisualizerShowFps: settings.musicVisualizerShowFps,
    musicVisualizerRenderer: settings.musicVisualizerRenderer,
    musicVisualizerShaderSettingsById: settings.musicVisualizerShaderSettingsById,
    proxyServer: settings.proxyServer,
    ehentaiCookies: settings.ehentaiCookies,
    adReviewVisionEndpoint: settings.adReviewVisionEndpoint,
    adReviewVisionModel: settings.adReviewVisionModel,
    adReviewVisionVerified: settings.adReviewVisionVerified,
    adReviewStrategyMode: settings.adReviewStrategyMode,
    adReviewHeadN: settings.adReviewHeadN,
    adReviewTailN: settings.adReviewTailN,
    adReviewTailStopCleanStreak: settings.adReviewTailStopCleanStreak,
    adReviewMaxConcurrency: settings.adReviewMaxConcurrency,
  }
}

export function usePersistedAppSettings({
  settings,
  repository,
}: UsePersistedAppSettingsParams): void {
  useSettingsPersistence({
    settings: toPersistedAppSettings(settings),
    repository,
    updateSettings: settings.updateSettings,
  })
}
