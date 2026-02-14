import { useEffect } from 'react'

import { useAppShortcutBindings } from './useAppShortcutBindings'
import { useAppEffects } from './useAppEffects'
import { usePersistedAppSettings } from './usePersistedAppSettings'
import type { AppSettingsStoreSnapshot } from './useAppSettingsStore'
import type { AppSessionStateResult } from './useAppSessionState'
import type { RepositoryBootstrapDataResult } from './useRepositoryBootstrapData'
import type { MediaStateResult } from '../media/useMediaState'
import type { AppReadAndNavigationResult } from './useAppReadAndNavigation'
import type { FullscreenPlaybackBindingsResult } from './useFullscreenPlaybackBindings'
import type { MetadataWriteBindingsResult } from './useMetadataWriteBindings'

const SIDEBAR_COLLAPSE_RATIO = 0.03

interface UseAppInteractionEffectsParams {
  appSettings: AppSettingsStoreSnapshot
  mediaRepository: RepositoryBootstrapDataResult['mediaRepository']
  sessionState: AppSessionStateResult
  mediaState: MediaStateResult
  readNavigationState: AppReadAndNavigationResult
  videoShortcutActive: boolean
  requestFullscreenAlign: FullscreenPlaybackBindingsResult['requestFullscreenAlign']
  applyAutoplayIntervalByIndex: FullscreenPlaybackBindingsResult['applyAutoplayIntervalByIndex']
  setFullscreenActiveWithAutoStop: FullscreenPlaybackBindingsResult['setFullscreenActiveWithAutoStop']
  applyPackageGrade: MetadataWriteBindingsResult['applyPackageGrade']
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
    workspaceBottomPanelHeight,
    styleId,
    paletteId,
    paletteMode,
    paletteDayId,
    paletteNightId,
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
    appBodyRef,
    vectorPanelContentRef,
    wasFullscreenRef,
    lastExpandedSidebarRatioRef,
    setAppBodyWidth,
    gridElement,
    setGridSize,
    setSelectedPackageId,
    setSelectedSidebarNodeId,
    setSelectedAudioId,
    setFullscreenEntryDisplay,
    manageMode,
    metadataManageMode,
    deleteConfirmOpen,
    setManageMode,
    setMetadataManageMode,
    setAdReviewPanelOpen,
    setDeleteConfirmOpen,
    setManageOperationHint,
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
    audiosForSidebar,
    rootScopedAudioIds,
    selectedAudioId,
    audioNodeIdMap,
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
    clearAllSelections,
  } = readNavigationState

  useEffect(() => {
    const searchPanelOpen = vectorMode && !manageMode && !metadataManageMode

    const closeManagePanel = () => {
      if (!manageMode) {
        return false
      }
      setManageMode(false)
      setAdReviewPanelOpen(false)
      setDeleteConfirmOpen(false)
      setManageOperationHint(null)
      clearAllSelections()
      return true
    }

    const closeMetadataManagePanel = () => {
      if (!metadataManageMode) {
        return false
      }
      setMetadataManageMode(false)
      setAdReviewPanelOpen(false)
      setDeleteConfirmOpen(false)
      setManageOperationHint(null)
      clearAllSelections()
      return true
    }

    const closeSearchPanel = () => {
      if (!searchPanelOpen) {
        return false
      }
      updateSettings({ vectorMode: false })
      return true
    }

    const closeSettingsPanel = () => {
      if (!settingsOpen) {
        return false
      }
      updateSettings({ settingsOpen: false })
      return true
    }

    const closeDeleteConfirm = () => {
      if (!deleteConfirmOpen) {
        return false
      }
      setDeleteConfirmOpen(false)
      return true
    }

    const closeFullscreenLayer = () => {
      if (!fullscreenActive) {
        return false
      }
      setFullscreenActiveWithAutoStop(false)
      return true
    }

    const closeTopLayerByPriority = () => {
      if (closeDeleteConfirm()) {
        return true
      }
      if (closeSettingsPanel()) {
        return true
      }
      if (closeSearchPanel()) {
        return true
      }
      if (closeManagePanel()) {
        return true
      }
      if (closeMetadataManagePanel()) {
        return true
      }
      if (closeFullscreenLayer()) {
        return true
      }
      return false
    }

    const closeLayerByRoot = (layer: string) => {
      if (layer === 'delete-confirm') {
        return closeDeleteConfirm()
      }
      if (layer === 'settings') {
        return closeSettingsPanel()
      }
      if (layer === 'search-panel') {
        return closeSearchPanel()
      }
      if (layer === 'manage-panel') {
        return closeManagePanel()
      }
      if (layer === 'metadata-manage-panel') {
        return closeMetadataManagePanel()
      }
      if (layer === 'fullscreen') {
        return closeFullscreenLayer()
      }
      return false
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (featureTagPickerOpen) {
        return
      }
      if (event.key !== 'Escape') {
        return
      }

      if (closeTopLayerByPriority()) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    const onMouseDown = (event: MouseEvent) => {
      if (featureTagPickerOpen) {
        return
      }
      if (event.button !== 2) {
        return
      }

      const target = event.target as HTMLElement | null
      const layerRoot = target?.closest('[data-overlay-close]')
      const layer = layerRoot?.getAttribute('data-overlay-close')
      if (!layer) {
        return
      }

      if (closeLayerByRoot(layer)) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('mousedown', onMouseDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('mousedown', onMouseDown, true)
    }
  }, [
    clearAllSelections,
    deleteConfirmOpen,
    fullscreenActive,
    manageMode,
    metadataManageMode,
    setDeleteConfirmOpen,
    setFullscreenActiveWithAutoStop,
    setAdReviewPanelOpen,
    setManageMode,
    setManageOperationHint,
    setMetadataManageMode,
    settingsOpen,
    updateSettings,
    vectorMode,
    featureTagPickerOpen,
  ])

  useAppShortcutBindings({
    shortcuts,
    featureTagPickerOpen,
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
    gridElement,
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
    audiosForSidebar,
    rootScopedVideoIds,
    rootScopedAudioIds,
    selectedVideoId,
    selectedAudioId,
    videoNodeIdMap,
    audioNodeIdMap,
    ensureSidebarNodeVisible,
    fullscreenActive,
    autoPlayEnabled,
    autoPlayInterval,
    moveImage,
    vectorMode,
    manageMode,
    metadataManageMode,
    searchPanelCollapsed,
    searchPanelMode,
    workspaceBottomPanelHeight,
    featureTagPickerOpen,
    styleId,
    paletteId,
    paletteMode,
    paletteDayId,
    paletteNightId,
    themeId,
    setAppBodyWidth,
    setGridSize,
    setVectorFocusIndex,
    setVectorPage,
    setPageByPackage,
    setSelectedPackageId,
    setSelectedSidebarNodeId,
    setSelectedAudioId,
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
