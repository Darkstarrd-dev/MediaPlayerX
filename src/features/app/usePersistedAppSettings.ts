import type { MediaRepository } from '../backend/repository'
import type { AppSettingsStoreSnapshot } from './useAppSettingsStore'
import { useSettingsPersistence } from './useSettingsPersistence'

interface UsePersistedAppSettingsParams {
  settings: AppSettingsStoreSnapshot
  repository: MediaRepository
}

export function usePersistedAppSettings({
  settings,
  repository,
}: UsePersistedAppSettingsParams): void {
  useSettingsPersistence({
    settings: {
      mode: settings.mode,
      vectorMode: settings.vectorMode,
      settingsOpen: settings.settingsOpen,
      headerHeight: settings.headerHeight,
      settingsFontSize: settings.settingsFontSize,
      sidebarRatio: settings.sidebarRatio,
      sidebarMinWidth: settings.sidebarMinWidth,
      layoutLocked: settings.layoutLocked,
      sidebarFontSize: settings.sidebarFontSize,
      sidebarCountFontSize: settings.sidebarCountFontSize,
      sidebarIndentStep: settings.sidebarIndentStep,
      sidebarVerticalGap: settings.sidebarVerticalGap,
      metadataRatio: settings.metadataRatio,
      vectorPanelHeight: settings.vectorPanelHeight,
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
      themeId: settings.themeId,
      thumbnailQuality: settings.thumbnailQuality,
      thumbnailWidth: settings.thumbnailWidth,
      lmStudioEndpoint: settings.lmStudioEndpoint,
      lmStudioModel: settings.lmStudioModel,
      adReviewStrategyMode: settings.adReviewStrategyMode,
      adReviewHeadN: settings.adReviewHeadN,
      adReviewTailN: settings.adReviewTailN,
      adReviewTailStopCleanStreak: settings.adReviewTailStopCleanStreak,
      adReviewMaxConcurrency: settings.adReviewMaxConcurrency,
      vectorUniverseMoveSpeed: settings.vectorUniverseMoveSpeed,
      vectorUniverseSprintMultiplier: settings.vectorUniverseSprintMultiplier,
      vectorUniverseLookSensitivity: settings.vectorUniverseLookSensitivity,
      vectorUniverseRaycastDistance: settings.vectorUniverseRaycastDistance,
      vectorUniverseHelperScale: settings.vectorUniverseHelperScale,
      vectorUniverseDispersion: settings.vectorUniverseDispersion,
      vectorUniverseWidgetSize: settings.vectorUniverseWidgetSize,
    },
    repository,
    updateSettings: settings.updateSettings,
  })
}
