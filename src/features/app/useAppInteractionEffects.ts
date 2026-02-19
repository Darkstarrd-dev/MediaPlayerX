import { useEffect, useRef } from 'react'

import { useAppShortcutBindings } from './useAppShortcutBindings'
import { useAppEffects } from './useAppEffects'
import { usePersistedAppSettings } from './usePersistedAppSettings'
import { normalizeSeriesId, pickFirstBySeriesId } from './workspaceSharedUtils'
import { clamp, isEditableTarget } from '../../utils/ui'
import type { AppSettingsStoreSnapshot } from './useAppSettingsStore'
import type { AppSessionStateResult } from './useAppSessionState'
import type { RepositoryBootstrapDataResult } from './useRepositoryBootstrapData'
import type { MediaStateResult } from '../media/useMediaState'
import type { AppReadAndNavigationResult } from './useAppReadAndNavigation'
import type { FullscreenPlaybackBindingsResult } from './useFullscreenPlaybackBindings'
import type { MetadataWriteBindingsResult } from './useMetadataWriteBindings'

const SIDEBAR_COLLAPSE_RATIO = 0.03

function stripFileExtension(value: string): string {
  return value.replace(/\.[^./\\]+$/, '')
}

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
  requestManageOrganize: () => void
  onToggleSubtitleByShortcut: () => void
  onSaveVideoCoverByShortcut: () => void
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
  requestManageOrganize,
  onToggleSubtitleByShortcut,
  onSaveVideoCoverByShortcut,
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
    setFocusByPackage,
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
    sidebarRenameDialogOpen,
    setManageMode,
    setMetadataManageMode,
    setAdReviewPanelOpen,
    setDeleteConfirmOpen,
    setManageOperationHint,
    setSidebarRenameDialogOpen,
    setSidebarRenameTargetNodeId,
    setSidebarRenameDraft,
    helpOverlayOpen,
    setHelpOverlayOpen,
    themeParameterPanelOpen,
    setThemeParameterPanelOpen,
  } = sessionState

  const {
    selectedVideoId,
    playlistIds,
    videoDurationById,
    videoPlaying,
    setVideoPlaying,
    setVideoTime,
    setVideoMuted,
    setPlaylistIds,
    videoQueueSource,
    fullscreenActive,
    fullscreenDisplay,
    fullscreenVideoFocus,
    setFullscreenDisplay,
    setFullscreenVideoFocus,
    setFullscreenSwapped,
    setShowFullscreenFooter,
    goPlaylist,
    adjustVideoRate,
    adjustVideoVolume,
    cycleVideoFitMode,
    selectVideoFromBrowser,
  } = mediaState

  void videoPlaying

  const {
    scopedImageSourcesEffective,
    packageByIdEffective,
    imageTreeForSidebar,
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
    normalImageSourceNodeIdMap,
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
    focusedImage,
    moveImage,
    moveImageVertical,
    jumpImageBoundary,
    goPackage,
    goPrevPage,
    goNextPage,
    clearAllSelections,
    checkSidebarNode,
    sidebarCheckedNodeIds,
    imageCheckedIds,
  } = readNavigationState

  const focusedVideoDurationSec = Math.max(
    0,
    videoDurationById[selectedVideoId] ??
      videosForSidebar.find((video) => video.id === selectedVideoId)?.durationSec ??
      0,
  )

  const previousModeRef = useRef(mode)

  useEffect(() => {
    const previousMode = previousModeRef.current
    if (previousMode === mode) {
      return
    }

    if (previousMode === 'video' || mode === 'video') {
      setVideoPlaying(false)
    }

    previousModeRef.current = mode
  }, [mode, setVideoPlaying])

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

    const closeHelpOverlay = () => {
      if (!helpOverlayOpen) {
        return false
      }
      setHelpOverlayOpen(false)
      return true
    }

    const closeThemeParameterPanel = () => {
      if (!themeParameterPanelOpen) {
        return false
      }
      setThemeParameterPanelOpen(false)
      return true
    }

    const closeDeleteConfirm = () => {
      if (!deleteConfirmOpen) {
        return false
      }
      setDeleteConfirmOpen(false)
      return true
    }

    const closeSidebarRenameDialog = () => {
      if (!sidebarRenameDialogOpen) {
        return false
      }
      setSidebarRenameDialogOpen(false)
      setSidebarRenameTargetNodeId(null)
      setSidebarRenameDraft('')
      return true
    }

    const closeFullscreenLayer = () => {
      if (!fullscreenActive) {
        return false
      }
      setFullscreenActiveWithAutoStop(false)
      return true
    }

    const findFirstImageNodeFromTree = (nodes: typeof imageTreeForSidebar): (typeof imageTreeForSidebar)[number] | null => {
      for (const node of nodes) {
        const sourceId = node.imageSourceId?.trim() ?? ''
        const isCoverNode = Boolean((node.coverSourceId?.trim() ?? '') || (node.coverImageId?.trim() ?? ''))
        const isImagePackageNode = node.kind === 'package' || node.imageNodeType === 'package'
        const hasUsableImages = sourceId
          ? (packageByIdEffective.get(sourceId)?.images.some((image) => !image.hidden) ?? false)
          : false

        if (sourceId && isImagePackageNode && !isCoverNode && hasUsableImages) {
          return node
        }

        const matchedChild = findFirstImageNodeFromTree(node.children)
        if (matchedChild) {
          return matchedChild
        }
      }
      return null
    }

    const ensureImageFocusFromSidebar = (options?: { syncSidebarNode?: boolean, preferSidebarFirst?: boolean }) => {
      const syncSidebarNode = options?.syncSidebarNode ?? true
      const preferSidebarFirst = options?.preferSidebarFirst ?? false
      const firstImageSidebarNode = findFirstImageNodeFromTree(imageTreeForSidebar)

      const findFirstVisibleImageIndex = (packageId: string): number => {
        const images = packageByIdEffective.get(packageId)?.images ?? []
        const firstVisibleIndex = images.findIndex((image) => !image.hidden)
        return firstVisibleIndex >= 0 ? firstVisibleIndex : 0
      }

      const selectedPackageUsable =
        rootScopedPackageIds.has(selectedPackageId) &&
        (packageByIdEffective.get(selectedPackageId)?.images.some((image) => !image.hidden) ?? false)

      const firstSidebarPackageId = firstImageSidebarNode?.imageSourceId?.trim() ?? ''
      const fallbackPackageId = preferSidebarFirst
        ? (
            firstSidebarPackageId ||
            (selectedPackageUsable ? selectedPackageId : '') ||
            orderedRootScopedPackages.find((pkg) => pkg.images.some((image) => !image.hidden))?.id ||
            scopedImageSourcesEffective.find((source) => source.images.some((image) => !image.hidden))?.id ||
            ''
          )
        : selectedPackageUsable
          ? selectedPackageId
          : (
              firstSidebarPackageId ||
              orderedRootScopedPackages.find((pkg) => pkg.images.some((image) => !image.hidden))?.id ||
              scopedImageSourcesEffective.find((source) => source.images.some((image) => !image.hidden))?.id ||
              ''
            )

      const fallbackPackageIdWithLooseFallback =
        fallbackPackageId ||
        firstSidebarPackageId ||
        selectedPackageId ||
        orderedRootScopedPackages[0]?.id ||
        scopedImageSourcesEffective[0]?.id ||
        ''

      if (!fallbackPackageIdWithLooseFallback) {
        return false
      }

      const nextSidebarNodeId =
        firstImageSidebarNode?.id ??
        (
          normalImageSourceNodeIdMap.get(fallbackPackageIdWithLooseFallback)
          ?? imageSourceNodeIdMap.get(fallbackPackageIdWithLooseFallback)
          ?? null
        )

      if (fallbackPackageIdWithLooseFallback !== selectedPackageId) {
        setSelectedPackageId(fallbackPackageIdWithLooseFallback)
      }

      const fallbackImageIndex = findFirstVisibleImageIndex(fallbackPackageIdWithLooseFallback)

      setImageFocusActive(true)
      setFocusByPackage((previous) => ({
        ...previous,
        [fallbackPackageIdWithLooseFallback]: fallbackImageIndex,
      }))
      setPageByPackage((previous) => ({
        ...previous,
        [fallbackPackageIdWithLooseFallback]: Math.floor(fallbackImageIndex / Math.max(1, pagedPageSize)),
      }))

      if (syncSidebarNode && nextSidebarNodeId) {
        setSelectedSidebarNodeId(nextSidebarNodeId)
        requestAnimationFrame(() => ensureSidebarNodeVisible(nextSidebarNodeId))
      }

      return true
    }

    if (fullscreenActive && mode === 'video' && fullscreenDisplay === 'dual' && (!focusedImage || !imageFocusActive)) {
      ensureImageFocusFromSidebar({ syncSidebarNode: false, preferSidebarFirst: true })
    } else if (fullscreenActive && !focusedImage && mode === 'image') {
      ensureImageFocusFromSidebar()
    }

    const closeTopLayerByPriority = () => {
      if (adReviewDeletePending) {
        return false
      }
      if (closeDeleteConfirm()) {
        return true
      }
      if (closeSidebarRenameDialog()) {
        return true
      }
      if (closeThemeParameterPanel()) {
        return true
      }
      if (closeHelpOverlay()) {
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
      if (layer === 'sidebar-rename-dialog') {
        return closeSidebarRenameDialog()
      }
      if (layer === 'settings') {
        return closeSettingsPanel()
      }
      if (layer === 'help') {
        return closeHelpPanel()
      }
      if (layer === 'help-overlay') {
        return closeHelpOverlay()
      }
      if (layer === 'theme-parameter') {
        return closeThemeParameterPanel()
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

    const switchModeByShortcut = (targetMode: 'image' | 'video' | 'music') => {
      if (targetMode === mode) {
        return false
      }

      const alignFullscreenSingleDisplay = () => {
        if (!fullscreenActive || fullscreenDisplay === 'dual') {
          return
        }

        if (targetMode === 'video') {
          setFullscreenDisplay('video-only')
          setFullscreenEntryDisplay('video-only')
          setFullscreenVideoFocus(true)
          setShowFullscreenFooter(false)
          return
        }

        if (targetMode === 'image') {
          setFullscreenDisplay('image-only')
          setFullscreenEntryDisplay('image-only')
          setFullscreenVideoFocus(false)
          setShowFullscreenFooter(false)
          return
        }

        setShowFullscreenFooter(false)
      }

      if (targetMode === 'image') {
        updateSettings({ mode: 'image' })
        alignFullscreenSingleDisplay()
        return ensureImageFocusFromSidebar()
      }

      if (targetMode === 'video') {
        const rootScopedVideoIdList = Array.from(rootScopedVideoIds)
        const hasVideoFocus =
          selectedVideoId.trim().length > 0 &&
          (Object.prototype.hasOwnProperty.call(videoDurationById, selectedVideoId) || videosForSidebar.some((video) => video.id === selectedVideoId))
        const playlistFirstVideoId = playlistIds[0] ?? null
        const sidebarFirstVideoId = rootScopedVideoIdList[0] ?? videosForSidebar[0]?.id ?? null
        const fallbackVideoId = hasVideoFocus
          ? selectedVideoId
          : (playlistFirstVideoId ?? sidebarFirstVideoId ?? '')
        const nextSidebarNodeId = fallbackVideoId
          ? (videoNodeIdMap.get(fallbackVideoId) ?? (sidebarFirstVideoId ? (videoNodeIdMap.get(sidebarFirstVideoId) ?? null) : null))
          : null

        updateSettings({ mode: 'video' })
        alignFullscreenSingleDisplay()

        if (fallbackVideoId && fallbackVideoId !== selectedVideoId) {
          const queueSource = playlistFirstVideoId && fallbackVideoId === playlistFirstVideoId ? 'playlist' : 'sidebar'
          selectVideoFromBrowser(fallbackVideoId, { queueSource })
        }

        if (nextSidebarNodeId) {
          setSelectedSidebarNodeId(nextSidebarNodeId)
          requestAnimationFrame(() => ensureSidebarNodeVisible(nextSidebarNodeId))
        }
        return true
      }

      const rootScopedAudioIdList = Array.from(rootScopedAudioIds)
      const hasAudioFocus = rootScopedAudioIds.has(selectedAudioId)
      const fallbackAudioId = hasAudioFocus
        ? selectedAudioId
        : (rootScopedAudioIdList[0] ?? audiosForSidebar[0]?.id ?? '')
      const nextSidebarNodeId = fallbackAudioId
        ? (audioNodeIdMap.get(fallbackAudioId) ?? null)
        : null

      updateSettings({ mode: 'music' })
      alignFullscreenSingleDisplay()

      if (fallbackAudioId && fallbackAudioId !== selectedAudioId) {
        setSelectedAudioId(fallbackAudioId)
      }

      if (nextSidebarNodeId) {
        setSelectedSidebarNodeId(nextSidebarNodeId)
        requestAnimationFrame(() => ensureSidebarNodeVisible(nextSidebarNodeId))
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
          const eventTarget = event.target
          const sidebarShortcutActive =
            sidebarFocus === 'sidebar' ||
            (eventTarget instanceof Element && eventTarget.closest('.sidebar') !== null)

          if (sidebarShortcutActive && event.code === 'KeyR') {
            const targetNodeId = selectedSidebarNodeId && sidebarNodeById.has(selectedSidebarNodeId) ? selectedSidebarNodeId : null
            if (!targetNodeId) {
              return
            }

            const targetNode = sidebarNodeById.get(targetNodeId)
            const preferredDraft = (() => {
              if (!targetNode) {
                return ''
              }

              if (targetNode.videoId) {
                const video = videosForSidebar.find((item) => item.id === targetNode.videoId)
                if (video) {
                  return stripFileExtension(video.fileName)
                }
              }

              if (targetNode.packageId) {
                const source = packageByIdEffective.get(targetNode.packageId)
                if (source) {
                  const fileName = source.absolutePath.split(/[\\/]/).pop() ?? targetNode.label
                  return stripFileExtension(fileName)
                }
              }

              return targetNode.label
            })()
            event.preventDefault()
            event.stopPropagation()
            setSidebarRenameTargetNodeId(targetNodeId)
            setSidebarRenameDraft(preferredDraft)
            setSidebarRenameDialogOpen(true)
            return
          }

          if (sidebarShortcutActive && event.code === 'Delete') {
            const hasManageSelection = sidebarCheckedNodeIds.length > 0 || imageCheckedIds.length > 0
            if (!hasManageSelection) {
              const targetNodeId = selectedSidebarNodeId && sidebarNodeById.has(selectedSidebarNodeId) ? selectedSidebarNodeId : null
              if (!targetNodeId) {
                return
              }
              clearAllSelections()
              checkSidebarNode(targetNodeId)
            }

            event.preventDefault()
            event.stopPropagation()
            setManageOperationHint(null)
            setDeleteConfirmOpen(true)
            return
          }

          if (event.code === 'F1') {
            event.preventDefault()
            event.stopPropagation()
            switchModeByShortcut('image')
            return
          }
          if (event.code === 'F2') {
            event.preventDefault()
            event.stopPropagation()
            switchModeByShortcut('video')
            return
          }
          if (event.code === 'F3') {
            event.preventDefault()
            event.stopPropagation()
            switchModeByShortcut('music')
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

      if (fullscreenActive && fullscreenDisplay !== 'dual' && !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey) {
        if (event.code === 'F1' || event.code === 'F2' || event.code === 'F3') {
          const targetMode = event.code === 'F1' ? 'image' : event.code === 'F2' ? 'video' : 'music'
          if (switchModeByShortcut(targetMode)) {
            event.preventDefault()
            event.stopPropagation()
          }
          return
        }
      }

      if (adReviewDeletePending && event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        return
      }

      if (event.key !== 'Escape') {
        if (!fullscreenActive && !isEditableTarget(event.target) && !event.ctrlKey && !event.altKey && !event.metaKey) {
          const isHelpOverlayToggle = event.key === '?' || (event.code === 'Slash' && event.shiftKey)
          if (isHelpOverlayToggle) {
            event.preventDefault()
            event.stopPropagation()
            setHelpOverlayOpen((value) => !value)
            return
          }
        }
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

      const target = event.target
      const layerRoot = target instanceof Element ? target.closest('[data-overlay-close]') : null
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
    checkSidebarNode,
    deleteConfirmOpen,
    sidebarRenameDialogOpen,
    fullscreenActive,
    fullscreenDisplay,
    mode,
    activePackage,
    focusedImage,
    imageFocusActive,
    pagedPageSize,
    selectedVideoId,
    playlistIds,
    videosForSidebar,
    selectedAudioId,
    audiosForSidebar,
    scopedImageSourcesEffective,
    packageByIdEffective,
    imageTreeForSidebar,
    orderedRootScopedPackages,
    rootScopedPackageIds,
    rootScopedVideoIds,
    rootScopedAudioIds,
    flatSidebarNodes,
    sidebarNodeById,
    imageSourceNodeIdMap,
    normalImageSourceNodeIdMap,
    videoNodeIdMap,
    audioNodeIdMap,
    ensureSidebarNodeVisible,
    sidebarCheckedNodeIds,
    imageCheckedIds,
    setImageFocusActive,
    setFocusByPackage,
    setSelectedPackageId,
    setPageByPackage,
    setSelectedAudioId,
    selectedSidebarNodeId,
    sidebarFocus,
    setSelectedSidebarNodeId,
    selectVideoFromBrowser,
    applyQuickFeatureSearch,
    manageMode,
    metadataManageMode,
    adReviewDeletePending,
    setDeleteConfirmOpen,
    setSidebarRenameDialogOpen,
    setSidebarRenameTargetNodeId,
    setSidebarRenameDraft,
    setFullscreenActiveWithAutoStop,
    setFullscreenDisplay,
    setFullscreenEntryDisplay,
    setFullscreenVideoFocus,
    setShowFullscreenFooter,
    setAdReviewPanelOpen,
    setManageMode,
    setManageOperationHint,
    setMetadataManageMode,
    settingsOpen,
    helpOpen,
    helpOverlayOpen,
    setHelpOverlayOpen,
    themeParameterPanelOpen,
    setThemeParameterPanelOpen,
    setSearchPanelCollapsed,
    setSearchPanelMode,
    selectedPackageId,
    updateSettings,
    vectorMode,
    videoDurationById,
    featureTagPickerOpen,
  ])

  useAppShortcutBindings({
    shortcuts,
    featureTagPickerOpen,
    adReviewDeletePending,
    mode,
    vectorResultsActive,
    settingsOpen: settingsOpen || helpOpen || helpOverlayOpen || themeParameterPanelOpen,
    sidebarFocus,
    fullscreenActive,
    fullscreenDisplay,
    fullscreenVideoFocus,
    imageFocusActive,
    manageMode,
    videoShortcutActive,
    handleSidebarNavigationKey,
    setImageFocusActive,
    setFullscreenActiveWithAutoStop,
    setFullscreenEntryDisplay,
    setFullscreenDisplay,
    setFullscreenVideoFocus,
    setFullscreenSwapped,
    moveImage,
    moveImageVertical,
    jumpImageBoundary,
    goPackage,
    requestFullscreenAlign,
    autoPlayEnabled,
    applyAutoplayIntervalByIndex,
    applyPackageGrade,
    applyVideoGrade,
    requestManageOrganize: () => {
      if (!manageMode) {
        return
      }
      requestManageOrganize()
    },
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
    goPlaylist: (step) => {
      goPlaylist(step, Array.from(rootScopedVideoIds))
    },
    seekVideoBy: (deltaSeconds) => {
      setVideoTime((value) => {
        const nextValue = value + deltaSeconds
        if (focusedVideoDurationSec <= 0) {
          return Math.max(0, nextValue)
        }
        return clamp(nextValue, 0, focusedVideoDurationSec)
      })
    },
    adjustVideoRate,
    adjustVideoVolume,
    toggleVideoMute: () => {
      setVideoMuted((value) => !value)
    },
    saveVideoCover: onSaveVideoCoverByShortcut,
    toggleVideoSubtitle: onToggleSubtitleByShortcut,
    adjustVideoSubtitleOffset: (delta) => {
      const nextOffset = clamp(appSettings.subtitleOffsetY + delta, -400, 400)
      updateSettings({ subtitleOffsetY: nextOffset })
    },
    cycleVideoFitMode,
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
    fullscreenDisplay,
    fullscreenVideoFocus,
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
