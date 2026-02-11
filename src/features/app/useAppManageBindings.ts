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
    setManageMode,
    setMetadataManageMode,
    setAdReviewPanelOpen,
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
  } = readNavigationState

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
    confirmManageDelete,
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
    clearAllSelections,
    replaceImageCheckedIds,
    setManageOperationHint,
  })

  const confirmManageDeleteWithAdReview = useCallback(async () => {
    const reviewTask = manageAdReview.task
    const shouldRouteToAdReviewDelete =
      reviewTask?.status === 'review' &&
      imageCheckedIds.some((imageId) => reviewTask.candidates.some((candidate) => candidate.image_id === imageId))

    if (shouldRouteToAdReviewDelete) {
      setDeleteConfirmOpen(false)
      setManageOperationHint(null)
      await manageAdReview.confirmDeleteSelectedCandidates()
      return
    }

    await confirmManageDelete()
  }, [confirmManageDelete, imageCheckedIds, manageAdReview, setDeleteConfirmOpen, setManageOperationHint])

  const runtimeCapabilities = useRuntimeCapabilities({
    repository: mediaRepository,
  })

  return {
    backendWrite,
    toggleManageMode,
    toggleMetadataManageMode,
    runManageHideAction,
    requestManageDelete,
    confirmManageDelete: confirmManageDeleteWithAdReview,
    manageAdReview,
    runtimeCapabilities,
  }
}

export type AppManageBindingsResult = ReturnType<typeof useAppManageBindings>
