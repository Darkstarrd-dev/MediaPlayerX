import {
  normalizePathForCompare,
} from './mediaPathUtils'
import { useAppTopLayerState } from './useAppTopLayerState'
import type { AppRuntimeSourcesResult } from './useAppRuntimeSources'
import type { AppReadAndNavigationResult } from './useAppReadAndNavigation'
import type { AppDisplayAndEffectsResult } from './useAppDisplayAndEffects'

const AUTO_PLAY_PRESETS = [1, 2, 3, 5, 8]

interface UseAppTopLayerBindingsParams {
  runtimeSources: AppRuntimeSourcesResult
  readNavigationState: AppReadAndNavigationResult
  displayState: AppDisplayAndEffectsResult
}

export function useAppTopLayerBindings({
  runtimeSources,
  readNavigationState,
  displayState,
}: UseAppTopLayerBindingsParams) {
  const {
    appSettings,
    repositoryBootstrap,
    sessionState,
    mediaState,
    playlistPersistence,
    importState,
    archiveLoadStatus,
  } = runtimeSources

  const {
    mediaRepository,
    repositoryMode,
  } = repositoryBootstrap

  const {
    mode,
  } = appSettings

  const {
    manageMode,
    metadataManageMode,
    importMenuOpen,
    setImportMenuOpen,
    dismissedImportTaskIds,
    setDismissedImportTaskIds,
    importTaskPanelOpen,
    setImportTaskPanelOpen,
    fullscreenEntryDisplay,
  } = sessionState

  const {
    fullscreenActive,
    showFullscreenFooter,
    fullscreenDisplay,
    fullscreenSwapped,
    fullscreenVideoFocus,
    fullscreenSplit,
    videoTime,
    videoPlaying,
    videoRate,
    videoVolume,
    videoMuted,
    setVideoPlaying,
    goPlaylist,
    setVideoTime,
    setVideoDurationById,
    setVideoMuted,
    setVideoVolume,
    setVideoRate,
    setShowFullscreenFooter,
    setFullscreenDisplay,
    setFullscreenSwapped,
    setFullscreenVideoFocus,
    setFullscreenSplit,
  } = mediaState

  const {
    backendRead,
    displayThumbnailScaleLevel,
    thumbnailScaleLevelCount,
    canThumbnailScaleDown,
    canThumbnailScaleUp,
    focusedImage,
    moveImage,
    goPackage,
    applySidebarRatio,
    applyMetadataRatio,
  } = readNavigationState

  const {
    backendWrite,
    toggleManageMode,
    toggleMetadataManageMode,
    runtimeCapabilities,
    focusedVideoDurationSec,
    focusedVideoCoverColor,
    focusedVideoEffective,
    fullscreenImageSrc,
    focusedVideoSrc,
    focusedVideoCoverImageSrc,
    fullscreenAlignRequest,
    setFullscreenActiveWithAutoStop,
  } = displayState

  return useAppTopLayerState({
    appSettings,
    mediaRepository,
    repositoryMode,
    backendRead,
    backendWrite,
    playlistPersistence,
    runtimeCapabilities,
    autoPlayPresets: AUTO_PLAY_PRESETS,
    mode,
    manageMode,
    metadataManageMode,
    displayThumbnailScaleLevel,
    thumbnailScaleLevelCount,
    canThumbnailScaleDown,
    canThumbnailScaleUp,
    importMenuOpen,
    importTaskPanelOpen,
    setImportMenuOpen,
    setImportTaskPanelOpen,
    openImportFilesDialog: importState.openImportFilesDialog,
    openImportFoldersDialog: importState.openImportFoldersDialog,
    setSearchPanelMode: readNavigationState.setSearchPanelMode,
    setSearchPanelCollapsed: readNavigationState.setSearchPanelCollapsed,
    onToggleManageMode: toggleManageMode,
    onToggleMetadataManageMode: toggleMetadataManageMode,
    importTasks: importState.importTasks,
    dismissedImportTaskIds,
    setDismissedImportTaskIds,
    enqueuePending: importState.enqueuePending,
    archiveLoadStatus,
    normalizePathForCompare,
    retryImportTask: importState.retryImportTask,
    taskError: importState.taskError,
    clearTaskError: importState.clearTaskError,
    fullscreenActive,
    showFullscreenFooter,
    fullscreenDisplay,
    fullscreenEntryDisplay,
    fullscreenAlignRequest,
    fullscreenSwapped,
    fullscreenVideoFocus,
    fullscreenSplit,
    focusedImage,
    fullscreenImageSrc,
    focusedVideo: focusedVideoEffective,
    focusedVideoSrc,
    focusedVideoCoverImageSrc,
    focusedVideoDurationSec,
    focusedVideoCoverColor,
    videoTime,
    videoPlaying,
    videoRate,
    videoVolume,
    videoMuted,
    setVideoPlaying,
    goPlaylist,
    setVideoTime,
    setVideoDurationById,
    setVideoMuted,
    setVideoVolume,
    setVideoRate,
    setFullscreenActiveWithAutoStop,
    setShowFullscreenFooter,
    setFullscreenDisplay,
    setFullscreenSwapped,
    setFullscreenVideoFocus,
    setFullscreenSplit,
    moveImage,
    goPackage,
    applySidebarRatio,
    applyMetadataRatio,
    focusedVideoEffectiveId: focusedVideoEffective?.id ?? null,
  })
}
