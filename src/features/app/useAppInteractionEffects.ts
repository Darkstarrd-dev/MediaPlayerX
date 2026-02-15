import { useEffect } from 'react'

import { useAppShortcutBindings } from './useAppShortcutBindings'
import { useAppEffects } from './useAppEffects'
import { usePersistedAppSettings } from './usePersistedAppSettings'
import { normalizeSeriesId, pickFirstBySeriesId } from './workspaceSharedUtils'
import { isEditableTarget } from '../../utils/ui'
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
  applyVideoGrade: (grade: number | null) => void
  adReviewDeletePending: boolean
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
  applyVideoGrade,
  adReviewDeletePending,
}: UseAppInteractionEffectsParams) {
  const {
    mode,
    vectorMode,
    settingsOpen,
    helpOpen,
    sidebarRatio,
    settingsBackdropOpacity,
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
    setPlaylistIds,
    videoQueueSource,
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
    applyQuickFeatureSearch,
    setSearchPanelMode,
    setSearchPanelCollapsed,
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
    goPrevPage,
    goNextPage,
    clearAllSelections,
  } = readNavigationState

  const handleImageWheelLikePageNavigation = (direction: 'next' | 'prev') => {
    if (mode !== 'image') {
      return
    }

    if (direction === 'next') {
      goNextPage()
      return
    }

    goPrevPage()
  }

  const handleImageCtrlWheelLikeSidebarNavigation = (direction: 'next' | 'prev') => {
    if (mode !== 'image' || flatSidebarNodes.length === 0) {
      return
    }

    const currentNodeId = selectedSidebarNodeId && sidebarNodeById.has(selectedSidebarNodeId) ? selectedSidebarNodeId : flatSidebarNodes[0].id
    const currentIndex = Math.max(0, flatSidebarNodes.findIndex((node) => node.id === currentNodeId))
    const delta = direction === 'next' ? 1 : -1
    const nextIndex = Math.max(0, Math.min(flatSidebarNodes.length - 1, currentIndex + delta))
    const nextNode = flatSidebarNodes[nextIndex]
    if (!nextNode || nextNode.id === selectedSidebarNodeId) {
      return
    }

    setSelectedSidebarNodeId(nextNode.id)
    if (nextNode.imageSourceId) {
      setSelectedPackageId(nextNode.imageSourceId)
    }

    requestAnimationFrame(() => ensureSidebarNodeVisible(nextNode.id))
  }

  useEffect(() => {
    const searchPanelOpen = vectorMode && !manageMode && !metadataManageMode

    const closeManagePanel = () => {
      if (adReviewDeletePending) {
        return false
      }
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
      if (adReviewDeletePending) {
        return false
      }
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

    const closeHelpPanel = () => {
      if (!helpOpen) {
        return false
      }
      updateSettings({ helpOpen: false })
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
      if (adReviewDeletePending) {
        return false
      }
      if (closeDeleteConfirm()) {
        return true
      }
      if (closeHelpPanel()) {
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
      if (adReviewDeletePending) {
        return false
      }
      if (layer === 'delete-confirm') {
        return closeDeleteConfirm()
      }
      if (layer === 'settings') {
        return closeSettingsPanel()
      }
      if (layer === 'help') {
        return closeHelpPanel()
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

    const tryJumpToSeriesMode = (targetMode: 'image' | 'video' | 'music') => {
      if (targetMode === mode) {
        return false
      }

      const currentVideo = videosForSidebar.find((video) => video.id === selectedVideoId) ?? null
      const currentAudio = audiosForSidebar.find((audio) => audio.id === selectedAudioId) ?? null
      const seriesId = normalizeSeriesId(
        mode === 'image' ? activePackage?.seriesId : mode === 'video' ? currentVideo?.seriesId : currentAudio?.seriesId,
      )

      if (!seriesId) {
        return false
      }

      if (targetMode === 'image') {
        const targetPackage = pickFirstBySeriesId(orderedRootScopedPackages, seriesId)
        if (!targetPackage) {
          return false
        }
        applyQuickFeatureSearch({ seriesId })
        updateSettings({ mode: 'image' })
        setSelectedPackageId(targetPackage.id)
        const nodeId = imageSourceNodeIdMap.get(targetPackage.id)
        if (nodeId) {
          setSelectedSidebarNodeId(nodeId)
          requestAnimationFrame(() => ensureSidebarNodeVisible(nodeId))
        }
        return true
      }

      if (targetMode === 'video') {
        const targetVideo = pickFirstBySeriesId(videosForSidebar, seriesId)
        if (!targetVideo) {
          return false
        }
        applyQuickFeatureSearch({ seriesId })
        updateSettings({ mode: 'video' })
        selectVideoFromBrowser(targetVideo.id)
        const nodeId = videoNodeIdMap.get(targetVideo.id)
        if (nodeId) {
          setSelectedSidebarNodeId(nodeId)
          requestAnimationFrame(() => ensureSidebarNodeVisible(nodeId))
        }
        return true
      }

      const targetAudio = pickFirstBySeriesId(audiosForSidebar, seriesId)
      if (!targetAudio) {
        return false
      }
      applyQuickFeatureSearch({ seriesId })
      updateSettings({ mode: 'music' })
      setSelectedAudioId(targetAudio.id)
      const nodeId = audioNodeIdMap.get(targetAudio.id)
      if (nodeId) {
        setSelectedSidebarNodeId(nodeId)
        requestAnimationFrame(() => ensureSidebarNodeVisible(nodeId))
      }
      return true
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (featureTagPickerOpen) {
        return
      }

      if (!fullscreenActive) {
        if (isEditableTarget(event.target)) {
          return
        }

        if (!event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey) {
          if (event.code === 'F1') {
            event.preventDefault()
            event.stopPropagation()
            updateSettings({ mode: 'image' })
            return
          }
          if (event.code === 'F2') {
            event.preventDefault()
            event.stopPropagation()
            updateSettings({ mode: 'video' })
            return
          }
          if (event.code === 'F3') {
            event.preventDefault()
            event.stopPropagation()
            updateSettings({ mode: 'music' })
            return
          }
        }

        if (event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey) {
          if (adReviewDeletePending) {
            return
          }

          if (event.code === 'F1' || event.code === 'F2' || event.code === 'F3') {
            const targetMode = event.code === 'F1' ? 'image' : event.code === 'F2' ? 'video' : 'music'
            if (tryJumpToSeriesMode(targetMode)) {
              event.preventDefault()
              event.stopPropagation()
            }
            return
          }

          if (event.code === 'Digit1' || event.code === 'Numpad1') {
            event.preventDefault()
            event.stopPropagation()
            if (manageMode) {
              closeManagePanel()
            }
            if (metadataManageMode) {
              closeMetadataManagePanel()
            }
            if (searchPanelOpen) {
              updateSettings({ vectorMode: false })
            } else {
              updateSettings({ vectorMode: true })
              setSearchPanelMode(mode === 'image' ? 'vector' : 'feature')
              setSearchPanelCollapsed(false)
            }
            return
          }

          if (event.code === 'Digit2' || event.code === 'Numpad2') {
            event.preventDefault()
            event.stopPropagation()
            const nextOpen = !manageMode
            setManageMode(nextOpen)
            setAdReviewPanelOpen(false)
            setDeleteConfirmOpen(false)
            setManageOperationHint(null)
            clearAllSelections()

            if (nextOpen) {
              if (metadataManageMode) {
                setMetadataManageMode(false)
              }
              updateSettings({ vectorMode: false, sidebarFocus: 'main' })
            }
            return
          }

          if (event.code === 'Digit3' || event.code === 'Numpad3') {
            event.preventDefault()
            event.stopPropagation()
            const nextOpen = !metadataManageMode
            setMetadataManageMode(nextOpen)
            setAdReviewPanelOpen(false)
            setDeleteConfirmOpen(false)
            setManageOperationHint(null)
            clearAllSelections()

            if (nextOpen) {
              if (manageMode) {
                setManageMode(false)
              }
              updateSettings({ vectorMode: false, sidebarFocus: 'main' })
            }
            return
          }
        }
      }

      if (adReviewDeletePending && event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
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

      if (adReviewDeletePending && event.button === 2) {
        event.preventDefault()
        event.stopPropagation()
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
    mode,
    activePackage,
    selectedVideoId,
    videosForSidebar,
    selectedAudioId,
    audiosForSidebar,
    orderedRootScopedPackages,
    imageSourceNodeIdMap,
    videoNodeIdMap,
    audioNodeIdMap,
    ensureSidebarNodeVisible,
    setSelectedPackageId,
    setSelectedAudioId,
    setSelectedSidebarNodeId,
    selectVideoFromBrowser,
    applyQuickFeatureSearch,
    manageMode,
    metadataManageMode,
    adReviewDeletePending,
    setDeleteConfirmOpen,
    setFullscreenActiveWithAutoStop,
    setAdReviewPanelOpen,
    setManageMode,
    setManageOperationHint,
    setMetadataManageMode,
    settingsOpen,
    helpOpen,
    setSearchPanelCollapsed,
    setSearchPanelMode,
    updateSettings,
    vectorMode,
    featureTagPickerOpen,
  ])

  useAppShortcutBindings({
    shortcuts,
    featureTagPickerOpen,
    adReviewDeletePending,
    mode,
    vectorResultsActive,
    settingsOpen: settingsOpen || helpOpen,
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
    applyVideoGrade,
    addFocusedVideoToPlaylist: () => {
      if (mode !== 'video' || !selectedVideoId) {
        return
      }
      setPlaylistIds((previous) => (previous.includes(selectedVideoId) ? previous : [...previous, selectedVideoId]))
    },
    removeFocusedVideoFromPlaylist: () => {
      if (mode !== 'video' || !selectedVideoId) {
        return
      }
      setPlaylistIds((previous) => previous.filter((id) => id !== selectedVideoId))
    },
    setVideoPlaying,
    goPlaylist,
    adjustVideoRate,
    adjustVideoVolume,
    onImageWheelNavigatePage: handleImageWheelLikePageNavigation,
    onImageCtrlWheelNavigateSidebar: handleImageCtrlWheelLikeSidebarNavigation,
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
    videoQueueSource,
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
    settingsBackdropOpacity,
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
