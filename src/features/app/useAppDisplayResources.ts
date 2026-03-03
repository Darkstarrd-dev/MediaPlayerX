import { useEffectiveDisplayState } from "./useEffectiveDisplayState";
import { useMetadataWriteBindings } from "./useMetadataWriteBindings";
import { buildCoverImageLocator } from "./mediaPathUtils";
import { useResolvedMediaState } from "./useResolvedMediaState";
import type { AppReadAndNavigationResult } from "./useAppReadAndNavigation";
import type { AppSettingsStoreSnapshot } from "./useAppSettingsStore";
import type { AppSessionStateResult } from "./useAppSessionState";
import type { RepositoryBootstrapDataResult } from "./useRepositoryBootstrapData";
import type { AppManageBindingsResult } from "./useAppManageBindings";
import type { MediaStateResult } from "../media/useMediaState";
import type { UiBenchSettings } from "../perf/benchSettings";
import { useI18n } from "../../i18n/useI18n";
import { useVideoSubtitleState } from "./useVideoSubtitleState";
import { isSyncSubtitleRepository } from "./useAppDisplayResources.helpers";
import { useAppDisplayPageResources } from "./useAppDisplayPageResources";

interface UseAppDisplayResourcesParams {
  appSettings: AppSettingsStoreSnapshot;
  benchSettings: UiBenchSettings;
  mediaRepository: RepositoryBootstrapDataResult["mediaRepository"];
  importBusy: boolean;
  sessionState: AppSessionStateResult;
  mediaState: MediaStateResult;
  readNavigationState: AppReadAndNavigationResult;
  manageBindings: AppManageBindingsResult;
}

export function useAppDisplayResources({
  appSettings,
  benchSettings,
  mediaRepository,
  importBusy,
  sessionState,
  mediaState,
  readNavigationState,
  manageBindings,
}: UseAppDisplayResourcesParams) {
  const { t } = useI18n();
  const { showNamesOnly } = appSettings;
  const isVideoMode = appSettings.mode === "video";
  const syncMediaRepository = isSyncSubtitleRepository(mediaRepository)
    ? mediaRepository
    : null;
  const isSynchronousSubtitleMode =
    import.meta.env.MODE === "test" && Boolean(syncMediaRepository);
  const {
    imageFocusActive,
    manageMode,
    metadataManageMode,
    adReviewFocusTaskId,
    adReviewPageIndex,
    selectedSidebarNodeId,
    setManageOperationHint,
  } = sessionState;

  const {
    selectedVideoId,
    videoTime,
    videoDurationById,
    videoCoverById,
    videoCoverImageById,
    fullscreenActive,
  } = mediaState;

  const {
    backendRead,
    vectorResultsActive,
    packageByIdEffective,
    scopedImageSourcesEffective,
    videoByIdEffective,
    audioByIdEffective,
    audiosForSidebar,
    videosForSidebar,
    selectedAudioId,
    focusedRef,
    focusedImage,
    activePackage,
    visibleImageRefs,
    refsInPage,
    pageStart,
    normalizedPageIndex,
    imageTotalPages,
    pagedPageSize,
    thumbnailColumns,
    metadataImagePackage,
    currentGrade,
    actualCellWidth,
    actualMediaHeight,
    orderedRootScopedImageRefs,
    imageTreeForSidebar,
    sidebarCheckedNodeIds,
    imageCheckedIdSet,
    sidebarNodeById,
  } = readNavigationState;

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
    focusedAudio,
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
    selectedAudioId,
    videoById: videoByIdEffective,
    audioById: audioByIdEffective,
    videosForSidebar,
    audiosForSidebar,
    videoDurationById,
    videoCoverById,
    videoCoverImageById,
  });

  const {
    refsInPageForResolve,
    nodeBrowseCoverThumbnailLocators,
    nodeBrowseVideoCoverLocators,
  } = useAppDisplayPageResources({
    mode: appSettings.mode,
    importBusy,
    metadataManageMode,
    manageMode,
    adReviewFocusTaskId,
    adReviewPageIndex,
    selectedSidebarNodeId,
    queueTasks: manageBindings.manageAdReview.queueTasks,
    readNavigationState: {
      backendRead,
      vectorResultsActive,
      packageByIdEffective,
      orderedRootScopedImageRefs,
      imageTreeForSidebar,
      sidebarNodeById,
      pagedPageSize,
      thumbnailColumns,
      visibleImageRefs,
      imageCheckedIdSet,
      videoByIdEffective,
    },
    videoCoverImageById,
    effectiveDisplayState: {
      refsInPageEffective,
      pageStartEffective,
      normalizedPageIndexEffective,
      imageTotalPagesEffective,
    },
  });

  const metadataWriteBindings = useMetadataWriteBindings({
    metadataManageMode,
    backendWrite: manageBindings.backendWrite,
    packageById: packageByIdEffective,
    videoById: videoByIdEffective,
    audioById: audioByIdEffective,
    metadataImagePackageId: metadataImagePackageEffective?.id ?? null,
    focusedVideoId: focusedVideoEffective?.id ?? null,
    focusedAudioId: focusedAudio?.id ?? null,
    sidebarCheckedNodeIds,
    sidebarNodeById,
    setManageOperationHint,
  });

  const {
    thumbnailImageUrlById,
    metadataImageSrc,
    fullscreenImageSrc,
    focusedVideoSrc,
    focusedAudioSrc,
    videoUrlById,
    audioUrlById,
    videoCoverImageUrlById,
    focusedVideoCoverImageSrc,
    sourceCoverImageUrlBySourceId,
  } = useResolvedMediaState({
    repository: mediaRepository,
    benchSettings,
    maxConcurrent: appSettings.thumbnailResolveConcurrency,
    importBusy,
    actualCellWidth,
    actualMediaHeight,
    thumbnailQuality: appSettings.thumbnailQuality,
    thumbnailWidth: appSettings.thumbnailWidth,
    thumbnailAdaptiveResolution: appSettings.thumbnailAdaptiveResolution,
    thumbnailGenerationConcurrency: appSettings.thumbnailGenerationConcurrency,
    thumbnailQueueSize: appSettings.thumbnailQueueSize,
    packageById: packageByIdEffective,
    focusedImage,
    metadataImage: metadataImageEffective,
    focusedRef,
    orderedRootScopedImageRefs,
    fullscreenActive,
    fullscreenPrefetchRadius: appSettings.fullscreenPrefetchRadius,
    fullscreenResamplingEnabled: appSettings.fullscreenResamplingEnabled,
    fullscreenUpsamplingKernel: appSettings.fullscreenUpsamplingKernel,
    fullscreenDownsamplingKernel: appSettings.fullscreenDownsamplingKernel,
    showNamesOnly,
    refsInPage: refsInPageForResolve,
    visibleImageRefs,
    normalizedPageIndex: normalizedPageIndexEffective,
    imageTotalPages: imageTotalPagesEffective,
    pagedPageSize,
    thumbnailWarmupRadius: appSettings.thumbnailWarmupRadius,
    thumbnailWarmupConcurrency: appSettings.thumbnailWarmupConcurrency,
    focusedVideo,
    focusedAudio,
    focusedVideoCoverImageLocator,
    nodeBrowseVideoCoverLocators,
    nodeBrowseCoverThumbnailLocators,
    sourceCoverLocators: scopedImageSourcesEffective
      .map((source) => {
        const locator = buildCoverImageLocator(
          source.sourceCover?.coverImagePath ?? null,
        );
        if (!locator) {
          return null;
        }
        return {
          sourceId: source.id,
          locator,
        };
      })
      .filter(
        (
          item,
        ): item is {
          sourceId: string;
          locator: NonNullable<ReturnType<typeof buildCoverImageLocator>>;
        } => Boolean(item),
      ),
  });

  const {
    subtitleVisible,
    subtitleOptions,
    selectedSubtitleId,
    subtitleTrackUrl,
    subtitleLoading,
    subtitleMessage,
    subtitleRuntimeErrorMessage,
    autoSubtitleActive,
    liveSubtitleText,
    subtitleOverlayStyle,
    bindMainVideoElement,
    bindFullscreenVideoElement,
    setSubtitleVisible,
    selectSubtitleById,
    refreshSubtitleOptions,
  } = useVideoSubtitleState({
    appSettings,
    mediaRepository,
    syncMediaRepository,
    isSynchronousSubtitleMode,
    isVideoMode,
    focusedVideoEffective,
    videoTime,
    fullscreenActive,
    t,
  });

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
    focusedAudio,
    focusedVideoDurationSec,
    focusedVideoCoverColor,
    focusedVideoCoverImageLocator,
    focusedVideoEffective,
    metadataWriteBindings,
    thumbnailImageUrlById,
    metadataImageSrc,
    fullscreenImageSrc,
    focusedVideoSrc,
    focusedAudioSrc,
    videoUrlById,
    audioUrlById,
    videoCoverImageUrlById,
    focusedVideoCoverImageSrc,
    sourceCoverImageUrlBySourceId,
    subtitleVisible,
    subtitleOptions,
    selectedSubtitleId,
    subtitleTrackUrl,
    subtitleLoading,
    subtitleMessage,
    subtitleRuntimeErrorMessage,
    autoSubtitleActive,
    liveSubtitleText,
    subtitleOverlayStyle,
    bindMainVideoElement,
    bindFullscreenVideoElement,
    setSubtitleVisible,
    selectSubtitleById,
    refreshSubtitleOptions,
  };
}

export type AppDisplayResourcesResult = ReturnType<
  typeof useAppDisplayResources
>;
