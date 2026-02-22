import { useCallback } from 'react'

import { useRuntimeCapabilities, useWriteDataAccess } from '../backend'
import type { AppReadAndNavigationResult } from './useAppReadAndNavigation'
import type { AppSettingsStoreSnapshot } from './useAppSettingsStore'
import type { AppSessionStateResult } from './useAppSessionState'
import { useManageAdReviewActions } from './useManageAdReviewActions'
import { useManageModeActions } from './useManageModeActions'
import { useMetadataManageModeActions } from './useMetadataManageModeActions'
import type { RepositoryBootstrapDataResult } from './useRepositoryBootstrapData'
import type { MediaStateResult } from '../media/useMediaState'

interface UseAppManageBindingsParams {
  appSettings: AppSettingsStoreSnapshot
  mediaRepository: RepositoryBootstrapDataResult['mediaRepository']
  sessionState: AppSessionStateResult
  mediaState: MediaStateResult
  readNavigationState: AppReadAndNavigationResult
}

export function useAppManageBindings({
  appSettings,
  mediaRepository,
  sessionState,
  mediaState,
  readNavigationState,
}: UseAppManageBindingsParams) {
  const {
    mode,
    adReviewVisionEndpoint,
    adReviewVisionModel,
    adReviewStrategyMode,
    adReviewHeadN,
    adReviewTailN,
    adReviewTailStopCleanStreak,
    adReviewMaxConcurrency,
    updateSettings,
  } = appSettings

  const {
    setGradeByPackage,
    manageMode,
    metadataManageMode,
    manageReviewMode,
    setManageReviewMode,
    setManageMode,
    setMetadataManageMode,
    setAdReviewPanelOpen,
    adReviewPanelOpen,
    adReviewFocusTaskId,
    setManageOperationHint,
    setDeleteConfirmOpen,
  } = sessionState

  const { setVideoCoverById, setVideoCoverImageById } = mediaState

  const {
    imageCheckedIds,
    sidebarCheckedNodeIds,
    activeSelectionScope,
    clearAllSelections,
    replaceImageCheckedIds,
    backendRead,
  } = readNavigationState

  const {
    retryLibrary,
    retrySidebar,
    retryPage,
    retryMetadata,
  } = backendRead

  const backendWrite = useWriteDataAccess({
    repository: mediaRepository,
    setGradeByPackage,
    setVideoCoverById,
    setVideoCoverImageById,
  })

  const {
    toggleManageMode,
    runManageHideAction,
    requestManageDelete,
    requestManageGroup,
    groupNameDialogOpen,
    groupNameDraft,
    setGroupNameDraft,
    cancelManageGroup,
    confirmManageGroup,
    confirmManageMove,
    requestManageMove,
    confirmManageDelete,
    confirmManageRemoveOnly,
  } = useManageModeActions({
    mode,
    manageMode,
    metadataManageMode,
    imageCheckedIds,
    sidebarCheckedNodeIds,
    backendWrite,
    clearAllSelections,
    setManageMode,
    setMetadataManageMode,
    setAdReviewPanelOpen,
    setDeleteConfirmOpen,
    setManageOperationHint,
    updateSettings,
  })

  const { toggleMetadataManageMode } = useMetadataManageModeActions({
    manageMode,
    metadataManageMode,
    clearAllSelections,
    setManageMode,
    setMetadataManageMode,
    setAdReviewPanelOpen,
    setDeleteConfirmOpen,
    setManageOperationHint,
    updateSettings,
  })

  const manageAdReview = useManageAdReviewActions({
    repository: mediaRepository,
    mode,
    manageMode,
    activeSelectionScope,
    imageCheckedIds,
    sidebarCheckedNodeIds,
    llmEndpoint: adReviewVisionEndpoint,
    llmModel: adReviewVisionModel,
    adReviewStrategyMode,
    adReviewHeadN,
    adReviewTailN,
    adReviewTailStopCleanStreak,
    adReviewMaxConcurrency,
    reviewMode: manageReviewMode,
    onReviewModeChange: setManageReviewMode,
    clearAllSelections,
    replaceImageCheckedIds,
    setManageOperationHint,
    adReviewPanelOpen,
    adReviewFocusTaskId,
    onDeleteRoundCompleted: () => {
      setAdReviewPanelOpen(false)
    },
  })

  const confirmManageDeleteWithAdReview = useCallback(async () => {
    if (manageAdReview.deletePending) {
      return
    }

    try {
      const reviewTask = manageAdReview.task
      const isCoverApplyMode = manageAdReview.applyActionMode === 'cover'
      const isReviewReady = reviewTask?.status === 'review'
      const shouldRouteToAdReviewDelete =
        isReviewReady &&
        imageCheckedIds.some((imageId) => reviewTask.candidates.some((candidate) => candidate.image_id === imageId))

      const shouldRouteToCoverReviewHide = Boolean(isCoverApplyMode && isReviewReady)

      if (shouldRouteToCoverReviewHide || shouldRouteToAdReviewDelete) {
        setDeleteConfirmOpen(false)
        setManageOperationHint(null)
        await manageAdReview.confirmDeleteSelectedCandidates()
        return
      }

      await confirmManageDelete()
    } finally {
      retryLibrary()
      retrySidebar()
      retryPage()
      retryMetadata()
    }
  }, [
    confirmManageDelete,
    imageCheckedIds,
    manageAdReview,
    retryLibrary,
    retryMetadata,
    retryPage,
    retrySidebar,
    setDeleteConfirmOpen,
    setManageOperationHint,
  ])

  const confirmManageRemoveOnlyWithRefresh = useCallback(async () => {
    try {
      await confirmManageRemoveOnly()
    } finally {
      retryLibrary()
      retrySidebar()
      retryPage()
      retryMetadata()
    }
  }, [
    confirmManageRemoveOnly,
    retryLibrary,
    retryMetadata,
    retryPage,
    retrySidebar,
  ])

  const runtimeCapabilities = useRuntimeCapabilities({
    repository: mediaRepository,
  })

  return {
    backendWrite,
    toggleManageMode,
    toggleMetadataManageMode,
    runManageHideAction,
    requestManageDelete,
    requestManageGroup,
    groupNameDialogOpen,
    groupNameDraft,
    setGroupNameDraft,
    cancelManageGroup,
    confirmManageGroup,
    confirmManageMove,
    requestManageMove,
    confirmManageDelete: confirmManageDeleteWithAdReview,
    confirmManageRemoveOnly: confirmManageRemoveOnlyWithRefresh,
    manageAdReview,
    runtimeCapabilities,
  }
}

export type AppManageBindingsResult = ReturnType<typeof useAppManageBindings>
