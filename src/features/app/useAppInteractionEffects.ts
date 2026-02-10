import { useAppShortcutBindings } from './useAppShortcutBindings'
import { useAppEffects } from './useAppEffects'
import { usePersistedAppSettings } from './usePersistedAppSettings'
import type { useAppSettingsStore } from './useAppSettingsStore'
import type { useAppSessionState } from './useAppSessionState'
import type { useRepositoryBootstrapData } from './useRepositoryBootstrapData'
import type { useMediaState } from '../media/useMediaState'
import type { useAppReadAndNavigation } from './useAppReadAndNavigation'
import type { useFullscreenPlaybackBindings } from './useFullscreenPlaybackBindings'
import type { useMetadataWriteBindings } from './useMetadataWriteBindings'

const SIDEBAR_COLLAPSE_RATIO = 0.03

interface UseAppInteractionEffectsParams {
  appSettings: ReturnType<typeof useAppSettingsStore>
  mediaRepository: ReturnType<typeof useRepositoryBootstrapData>['mediaRepository']
  sessionState: ReturnType<typeof useAppSessionState>
  mediaState: ReturnType<typeof useMediaState>
  readNavigationState: ReturnType<typeof useAppReadAndNavigation>
  videoShortcutActive: boolean
  requestFullscreenAlign: ReturnType<typeof useFullscreenPlaybackBindings>['requestFullscreenAlign']
  applyAutoplayIntervalByIndex: ReturnType<typeof useFullscreenPlaybackBindings>['applyAutoplayIntervalByIndex']
  setFullscreenActiveWithAutoStop: ReturnType<typeof useFullscreenPlaybackBindings>['setFullscreenActiveWithAutoStop']
  applyPackageGrade: ReturnType<typeof useMetadataWriteBindings>['applyPackageGrade']
}

export function useAppInteractionEffects({
  appSettings,
  mediaRepository,
  sessionState,
  mediaState,
  readNavigationState,
  videoShortcutActive,
  requestFullscreenAlign,
  applyAutoplayIntervalByIndex,
  setFullscreenActiveWithAutoStop,
  applyPackageGrade,
}: UseAppInteractionEffectsParams) {
  const {
    mode,
    vectorMode,
    settingsOpen,
    sidebarRatio,
    thumbnailScale,
    showNamesOnly,
    autoPlayEnabled,
    autoPlayInterval,
    sidebarFocus,
    vectorPanelHeight,
    themeId,
    shortcuts,
    updateSettings,
  } = appSettings

  const {
    selectedPackageId,
    selectedSidebarNodeId,
    imageFocusActive,
    setImageFocusActive,
    focusByPackage,
    setPageByPackage,
    vectorSearchResults,
    vectorFocusIndex,
    setVectorFocusIndex,
    setVectorPage,
    vectorUniverseOpen,
    appBodyRef,
    vectorPanelContentRef,
    wasFullscreenRef,
    lastExpandedSidebarRatioRef,
    setAppBodyWidth,
    setGridSize,
    setSelectedPackageId,
    setSelectedSidebarNodeId,
    setFullscreenEntryDisplay,
  } = sessionState

  const {
    selectedVideoId,
    videoPlaying,
    setVideoPlaying,
    fullscreenActive,
    fullscreenDisplay,
    setFullscreenDisplay,
    setFullscreenVideoFocus,
    setFullscreenSwapped,
    setShowFullscreenFooter,
    goPlaylist,
    adjustVideoRate,
    adjustVideoVolume,
    selectVideoFromBrowser,
  } = mediaState

  void videoPlaying

  const {
    searchPanelMode,
    searchPanelCollapsed,
    featureTagPickerOpen,
    vectorResultsActive,
    rootScopedVideoIds,
    rootScopedPackageIds,
    vectorSidebarNodes,
    vectorResultPackageNodeIdMap,
    flatSidebarNodes,
    sidebarNodeById,
    imageSourceNodeIdMap,
    videoNodeIdMap,
    videosForSidebar,
    ensureSidebarNodeVisible,
    handleSidebarNavigationKey,
    orderedRootScopedPackages,
    sidebarCollapsed,
    normalizeSidebarRatio,
    normalizedThumbnailScale,
    pagedPageSize,
    activePackage,
    focusedRef,
    moveImage,
    moveImageVertical,
    jumpImageBoundary,
    goPackage,
  } = readNavigationState

  useAppShortcutBindings({
    shortcuts,
    vectorUniverseOpen,
    mode,
    vectorResultsActive,
    settingsOpen,
    sidebarFocus,
    fullscreenActive,
    fullscreenDisplay,
    imageFocusActive,
    videoShortcutActive,
    focusedImage: readNavigationState.focusedImage,
    handleSidebarNavigationKey,
    setImageFocusActive,
    setFullscreenActiveWithAutoStop,
    setFullscreenVideoFocus,
    moveImage,
    moveImageVertical,
    jumpImageBoundary,
    goPackage,
    requestFullscreenAlign,
    autoPlayEnabled,
    applyAutoplayIntervalByIndex,
    applyPackageGrade,
    setVideoPlaying,
    goPlaylist,
    adjustVideoRate,
    adjustVideoVolume,
    updateSettings,
  })

  useAppEffects({
    appBodyRef,
    gridRef: sessionState.gridRef,
    vectorPanelContentRef,
    wasFullscreenRef,
    lastExpandedSidebarRatioRef,
    mode,
    showNamesOnly,
    sidebarRatio,
    sidebarCollapseRatio: SIDEBAR_COLLAPSE_RATIO,
    normalizeSidebarRatio,
    sidebarCollapsed,
    sidebarFocus,
    vectorResultsActive,
    thumbnailScale,
    normalizedThumbnailScale,
    activePackage,
    imageFocusActive,
    focusByPackage,
    pagedPageSize,
    vectorSearchResults,
    vectorFocusIndex,
    selectedPackageId,
    orderedRootScopedPackages,
    rootScopedPackageIds,
    flatSidebarNodes,
    focusedRef,
    imageSourceNodeIdMap,
    selectedSidebarNodeId,
    sidebarNodeById,
    vectorResultPackageNodeIdMap,
    vectorSidebarNodes,
    videosForSidebar,
    rootScopedVideoIds,
    selectedVideoId,
    videoNodeIdMap,
    ensureSidebarNodeVisible,
    fullscreenActive,
    autoPlayEnabled,
    autoPlayInterval,
    moveImage,
    vectorMode,
    searchPanelCollapsed,
    searchPanelMode,
    vectorPanelHeight,
    featureTagPickerOpen,
    themeId,
    setAppBodyWidth,
    setGridSize,
    setVectorFocusIndex,
    setVectorPage,
    setPageByPackage,
    setSelectedPackageId,
    setSelectedSidebarNodeId,
    selectVideoFromBrowser,
    setFullscreenEntryDisplay,
    setFullscreenDisplay,
    setFullscreenVideoFocus,
    setFullscreenSwapped,
    setShowFullscreenFooter,
    updateSettings,
  })

  usePersistedAppSettings({
    settings: appSettings,
    repository: mediaRepository,
  })
}
