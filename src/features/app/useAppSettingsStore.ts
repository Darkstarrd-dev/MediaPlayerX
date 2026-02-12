import { useShallow } from 'zustand/react/shallow'

import { useUiStore } from '../../store/useUiStore'

export function useAppSettingsStore() {
  return useUiStore(
    useShallow((state) => ({
      mode: state.mode,
      vectorMode: state.vectorMode,
      settingsOpen: state.settingsOpen,
      headerHeight: state.headerHeight,
      settingsFontSize: state.settingsFontSize,
      sidebarRatio: state.sidebarRatio,
      sidebarMinWidth: state.sidebarMinWidth,
      layoutLocked: state.layoutLocked,
      sidebarFontSize: state.sidebarFontSize,
      sidebarCountFontSize: state.sidebarCountFontSize,
      sidebarIndentStep: state.sidebarIndentStep,
      sidebarVerticalGap: state.sidebarVerticalGap,
      metadataRatio: state.metadataRatio,
      vectorPanelHeight: state.vectorPanelHeight,
      fullscreenVideoControlsMaxWidth: state.fullscreenVideoControlsMaxWidth,
      thumbnailScale: state.thumbnailScale,
      thumbnailGap: state.thumbnailGap,
      showNamesOnly: state.showNamesOnly,
      metadataCollapsed: state.metadataCollapsed,
      autoPlayEnabled: state.autoPlayEnabled,
      autoPlayInterval: state.autoPlayInterval,
      searchField: state.searchField,
      searchText: state.searchText,
      vectorThreshold: state.vectorThreshold,
      sidebarFocus: state.sidebarFocus,
      imageRootNodeId: state.imageRootNodeId,
      videoRootNodeId: state.videoRootNodeId,
      themeId: state.themeId,
      styleId: state.styleId,
      paletteId: state.paletteId,
      thumbnailQuality: state.thumbnailQuality,
      thumbnailWidth: state.thumbnailWidth,
      proxyServer: state.proxyServer,
      ehentaiCookies: state.ehentaiCookies,
      adReviewVisionEndpoint: state.adReviewVisionEndpoint,
      adReviewVisionModel: state.adReviewVisionModel,
      adReviewVisionVerified: state.adReviewVisionVerified,
      adReviewStrategyMode: state.adReviewStrategyMode,
      adReviewHeadN: state.adReviewHeadN,
      adReviewTailN: state.adReviewTailN,
      adReviewTailStopCleanStreak: state.adReviewTailStopCleanStreak,
      adReviewMaxConcurrency: state.adReviewMaxConcurrency,
      shortcuts: state.shortcuts,
      updateSettings: state.updateSettings,
      setShortcut: state.setShortcut,
      resetShortcuts: state.resetShortcuts,
    })),
  )
}

export type AppSettingsStoreSnapshot = ReturnType<typeof useAppSettingsStore>
