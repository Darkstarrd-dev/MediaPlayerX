import { useEffectiveDisplayState } from './useEffectiveDisplayState'
import { useMetadataWriteBindings } from './useMetadataWriteBindings'
import { useResolvedMediaState } from './useResolvedMediaState'
import type { AppReadAndNavigationResult } from './useAppReadAndNavigation'
import type { AppSettingsStoreSnapshot } from './useAppSettingsStore'
import type { AppSessionStateResult } from './useAppSessionState'
import type { RepositoryBootstrapDataResult } from './useRepositoryBootstrapData'
import type { AppManageBindingsResult } from './useAppManageBindings'
import type { MediaStateResult } from '../media/useMediaState'
import type { UiBenchSettings } from '../perf/benchSettings'

const MEDIA_RESOLVE_MAX_CONCURRENT = 8

interface UseAppDisplayResourcesParams {
  appSettings: AppSettingsStoreSnapshot
  benchSettings: UiBenchSettings
  mediaRepository: RepositoryBootstrapDataResult['mediaRepository']
  sessionState: AppSessionStateResult
  mediaState: MediaStateResult
  readNavigationState: AppReadAndNavigationResult
  manageBindings: AppManageBindingsResult
}

export function useAppDisplayResources({
  appSettings,
  benchSettings,
  mediaRepository,
  sessionState,
  mediaState,
  readNavigationState,
  manageBindings,
}: UseAppDisplayResourcesParams) {
  const { showNamesOnly } = appSettings
  const { imageFocusActive, metadataManageMode, setManageOperationHint } = sessionState

  const {
    selectedVideoId,
    videoDurationById,
    videoCoverById,
    videoCoverImageById,
    fullscreenActive,
  } = mediaState

  const {
    backendRead,
    vectorResultsActive,
    packageByIdEffective,
    videoByIdEffective,
    videosForSidebar,
    focusedRef,
    focusedImage,
    activePackage,
    refsInPage,
    pageStart,
    normalizedPageIndex,
    imageTotalPages,
    pagedPageSize,
    metadataImagePackage,
    currentGrade,
    actualCellWidth,
    actualMediaHeight,
    orderedRootScopedImageRefs,
    sidebarCheckedNodeIds,
    sidebarNodeById,
  } = readNavigationState

  const {
    backendPageSnapshot,
    activePackageForDisplay,
    refsInPageEffective,
    pageStartEffective,
    normalizedPageIndexEffective,
    imageTotalPagesEffective,
    metadataImageEffective,
    metadataImagePackageEffective,
    currentGradeEffective,
    focusedVideo,
    focusedVideoDurationSec,
    focusedVideoCoverColor,
    focusedVideoCoverImageLocator,
    focusedVideoEffective,
  } = useEffectiveDisplayState({
    backendPageData: backendRead.page.data,
    backendPageSnapshot: backendRead.page.snapshot,
    backendMetadataData: backendRead.metadata.data,
    backendMetadataSnapshot: backendRead.metadata.snapshot,
    vectorResultsActive,
    imageFocusActive,
    focusedRef,
    focusedImage,
    activePackage,
    refsInPage,
    pageStart,
    normalizedPageIndex,
    imageTotalPages,
    pagedPageSize,
    showNamesOnly,
    packageById: packageByIdEffective,
    metadataImagePackage,
    currentGrade,
    selectedVideoId,
    videoById: videoByIdEffective,
    videosForSidebar,
    videoDurationById,
    videoCoverById,
    videoCoverImageById,
  })

  const metadataWriteBindings = useMetadataWriteBindings({
    metadataManageMode,
    autoTagModelPath: appSettings.wdSwinTaggerModelPath,
    autoTagOccurrenceThreshold: appSettings.wdSwinTaggerAutoTagOccurrenceThreshold,
    autoTagGeneralMinScore: appSettings.wdSwinTaggerAutoTagGeneralMinScore,
    autoTagCharacterMinScore: appSettings.wdSwinTaggerAutoTagCharacterMinScore,
    autoTagIncludeRating: appSettings.wdSwinTaggerAutoTagIncludeRating,
    autoTagRatingMinScore: appSettings.wdSwinTaggerAutoTagRatingMinScore,
    backendWrite: manageBindings.backendWrite,
    metadataImagePackageId: metadataImagePackageEffective?.id ?? null,
    focusedVideoId: focusedVideoEffective?.id ?? null,
    sidebarCheckedNodeIds,
    sidebarNodeById,
    setManageOperationHint,
  })

  const {
    thumbnailImageUrlById,
    metadataImageSrc,
    fullscreenImageSrc,
    focusedVideoSrc,
    focusedVideoCoverImageSrc,
  } = useResolvedMediaState({
    repository: mediaRepository,
    benchSettings,
    maxConcurrent: MEDIA_RESOLVE_MAX_CONCURRENT,
    actualCellWidth,
    actualMediaHeight,
    packageById: packageByIdEffective,
    focusedImage,
    metadataImage: metadataImageEffective,
    focusedRef,
    orderedRootScopedImageRefs,
    fullscreenActive,
    showNamesOnly,
    refsInPage: refsInPageEffective,
    focusedVideo,
    focusedVideoCoverImageLocator,
  })

  return {
    backendPageSnapshot,
    activePackageForDisplay,
    refsInPageEffective,
    pageStartEffective,
    normalizedPageIndexEffective,
    imageTotalPagesEffective,
    metadataImageEffective,
    metadataImagePackageEffective,
    currentGradeEffective,
    focusedVideo,
    focusedVideoDurationSec,
    focusedVideoCoverColor,
    focusedVideoCoverImageLocator,
    focusedVideoEffective,
    metadataWriteBindings,
    thumbnailImageUrlById,
    metadataImageSrc,
    fullscreenImageSrc,
    focusedVideoSrc,
    focusedVideoCoverImageSrc,
  }
}

export type AppDisplayResourcesResult = ReturnType<typeof useAppDisplayResources>
