import { useEffect, useMemo, useState } from "react";

import { buildImageMainSectionProps } from "./buildImageMainSectionProps";
import { buildMainFooter } from "./buildMainFooter";
import { buildMetadataManagementPanelProps } from "./buildMetadataManagementPanelProps";
import { buildSidebarPanelProps } from "./buildSidebarPanelProps";
import { buildMusicMainSectionProps } from "./buildMusicMainSectionProps";
import { buildVideoMainSectionProps } from "./buildVideoMainSectionProps";
import { buildWorkspaceJumpContext } from "./workspaceJumpContext";
import { useAdReviewFocusBindings } from "./workspaceAdReviewFocus";
import {
  collectAudioIdsBySidebarOrder,
  collectVideoIdsBySidebarOrder,
  collectScopedAudioIdsByFolderNode,
  flattenExternalTagValues,
  normalizeFeatureTags,
} from "./workspaceSharedUtils";
import {
  buildNodeBrowseItems,
  resolveRefsInPageForDisplay,
} from "./workspaceImageDerivations";
import {
  buildImageSidebarWheelContext,
  resolveImageConvertManageState,
} from "./workspaceImageManageUtils";
import {
  resolveAdReviewPageDerivations,
  shouldGroupAdReviewByPackageRows,
} from "./workspaceAdReviewPageDerivations";
import { resolveAdReviewSidebarContext } from "./workspaceAdReviewSidebarContext";
import {
  createApplyMetadataSyncName,
  createSaveParsedMetadata,
} from "./workspaceMetadataActions";
import { createAdReviewSettingHandlers } from "./workspaceAdReviewHandlers";
import { buildWorkspaceMetadataPanelProps } from "./workspaceMetadataPanelProps";
import type { UseAppWorkspacePropsParams } from "./useAppWorkspaceProps.types";
import { useI18n } from "../../i18n/useI18n";
export function useAppWorkspaceProps({
  appSettings,
  mediaRepository,
  benchSettings,
  mode,
  vectorMode,
  manageMode,
  metadataManageMode,
  adReviewPanelOpen,
  setAdReviewPanelOpen,
  adReviewFocusTaskId,
  setAdReviewFocusTaskId,
  adReviewPageIndex,
  setAdReviewPageIndex,
  searchPanelCollapsed,
  setSearchPanelCollapsed,
  workspaceBottomPanelHeight,
  vectorPanelRef,
  vectorPanelContentRef,
  vectorSearchResults,
  scopedImageSourcesEffective,
  musicBookletImageSources,
  videosForSidebarCount,
  videosForSidebar,
  audiosForSidebarCount,
  audiosForSidebar,
  focusedRef,
  focusedImage,
  focusedImagePackage,
  featureNameQuery,
  setFeatureNameQuery,
  featureWorkTitleQuery,
  setFeatureWorkTitleQuery,
  featureCircleQuery,
  setFeatureCircleQuery,
  featureAuthorQuery,
  setFeatureAuthorQuery,
  featureCircleOptions,
  featureAuthorOptions,
  featureTagOptions,
  applyQuickFeatureSearch,
  featureTagPickerOpen,
  setFeatureTagPickerOpen,
  featureTags,
  setFeatureTags,
  featureGradeFilter,
  setFeatureGradeFilter,
  onStartWorkspaceBottomPanelResize,
  layoutLocked,
  currentRootLabel,
  sidebarCheckedNodeIds,
  imageCheckedIds,
  activeSelectionScope,
  backendWrite,
  manageOperationHint,
  requestManageDelete,
  requestManageGroup,
  requestManageMove,
  runManageHideAction,
  manageAdReview,
  clearSidebarSelections,
  clearAllSelections,
  vectorResultsActive,
  showNamesOnly,
  displayThumbnailScaleLevel,
  thumbnailScaleLevelCount,
  canThumbnailScaleDown,
  canThumbnailScaleUp,
  imageConvertScale,
  setImageConvertScale,
  imageConvertLongestEdgePx,
  setImageConvertLongestEdgePx,
  imageConvertAdjustProfile,
  setImageConvertAdjustProfile,
  imageConvertFormat,
  setImageConvertFormat,
  imageConvertQuality,
  setImageConvertQuality,
  imageConvertPreviewMode,
  setImageConvertPreviewMode,
  imageConvertPreviewScale,
  setImageConvertPreviewScale,
  imageConvertPreviewLongestEdgePx,
  setImageConvertPreviewLongestEdgePx,
  imageConvertPreviewAdjustProfile,
  setImageConvertPreviewAdjustProfile,
  imageConvertPreviewFormat,
  setImageConvertPreviewFormat,
  imageConvertPreviewQuality,
  setImageConvertPreviewQuality,
  backendPageLoading,
  pagedPageSize,
  activePackageForDisplay,
  visibleImageRefs,
  refsInPageEffective,
  pageStartEffective,
  actualCellWidth,
  actualMediaHeight,
  thumbnailColumns,
  actualThumbnailGap,
  normalizedPageIndexEffective,
  imageTotalPagesEffective,
  packageByIdEffective,
  thumbnailImageUrlById,
  sourceCoverImageUrlBySourceId,
  gridRef,
  onGridElementChange,
  imageCheckedIdSet,
  setFullscreenActiveWithAutoStop,
  setVectorFocusIndex,
  setImageFocus,
  toggleImageChecked,
  replaceImageCheckedIds,
  goPrevPage,
  goNextPage,
  focusedVideoDurationSec,
  focusedAudio,
  videoTime,
  videoPlaying,
  videoRate,
  videoVolume,
  videoMuted,
  videoFitMode,
  videoLoopMode,
  focusedVideoSrc,
  focusedAudioSrc,
  videoUrlById,
  audioUrlById,
  subtitleTrackUrl,
  subtitleVisible,
  subtitleLoading,
  subtitleMessage,
  subtitleOptions,
  selectedSubtitleId,
  autoSubtitleActive,
  liveSubtitleText,
  subtitleOverlayStyle,
  bindMainVideoElement,
  setSubtitleVisible,
  selectSubtitleById,
  refreshSubtitleOptions,
  fullscreenActive,
  focusedVideoCoverColor,
  focusedVideoCoverImageSrc,
  focusedVideoEffective,
  setVideoPlaying,
  goPlaylist,
  setVideoTime,
  setVideoDurationById,
  setVideoMuted,
  setVideoVolume,
  setVideoRate,
  setVideoFitMode,
  cycleVideoLoopMode,
  cycleVideoFitMode,
  imageFocusActive,
  metadataImageEffective,
  metadataImageSrc,
  metadataImagePackageEffective,
  currentGradeEffective,
  metadataWriteBindings,
  metadataTab,
  playlistIds,
  selectedVideoId,
  selectedAudioId,
  audioPlaylistIds,
  musicLoopMode,
  musicPlayRequestNonce,
  dragVideoId,
  videoByIdEffective,
  audioByIdEffective,
  setMetadataTab,
  selectVideoFromBrowser,
  setPlaylistIds,
  setDragVideoId,
  sidebarNodeById,
  selectedSidebarNodeId,
  searchResultsMode,
  canSetCurrentRoot,
  normalImageSourceNodeIdMap,
  orderedRootScopedImageRefs,
  imageRootNodeId,
  videoRootNodeId,
  musicRootNodeId,
  imageTreeForSidebar,
  videoTreeForSidebar,
  audioTreeForSidebar,
  imageNodeLoadStateById,
  selectedPackageId,
  featureSearchActive,
  searchResultsReadOnly,
  sidebarCheckedNodeIdSet,
  goToFromSearchMode,
  setSelectedSidebarNodeId,
  setSelectedPackageId,
  setSelectedAudioId,
  setMusicLoopMode,
  collapseSidebar,
  applyCurrentRootFromSelection,
  toggleSidebarNodeChecked,
  setAudioPlaylistIds,
  requestMusicPlay,
  musicBookletBindings,
}: UseAppWorkspacePropsParams) {
  const { t } = useI18n();
  const [nodeBrowsePageByNodeId, setNodeBrowsePageByNodeId] = useState<
    Record<string, number>
  >({});

  const featureTagOptionsEffective = Array.from(
    new Set(
      normalizeFeatureTags(
        mode === "image"
          ? scopedImageSourcesEffective.flatMap((source) => [
              ...source.tags,
              ...flattenExternalTagValues(source.externalMetadata?.tags ?? {}),
            ])
          : featureTagOptions,
      ),
    ),
  ).sort((left, right) => left.localeCompare(right, "zh-CN"));

  const {
    adReviewFocusTask,
    adReviewResultsMode,
    effectiveSidebarNodeById,
    selectedSidebarNode,
    sidebarImageTreeNodes,
  } = resolveAdReviewSidebarContext({
    mode,
    adReviewFocusTaskId,
    queueTasks: manageAdReview.queueTasks,
    packageByIdEffective,
    sidebarNodeById,
    selectedSidebarNodeId,
    imageTreeForSidebar,
  });

  const { onToggleAdReviewFocus } = useAdReviewFocusBindings({
    adReviewPanelOpen,
    adReviewFocusTaskId,
    adReviewTask: manageAdReview.task,
    adReviewDeletePending: manageAdReview.deletePending,
    setAdReviewFocusTaskId,
    setAdReviewPageIndex,
    setSelectedSidebarNodeId,
  });

  const sidebarVideoQueueIds = useMemo(() => {
    const orderedByTree = collectVideoIdsBySidebarOrder(videoTreeForSidebar);
    if (orderedByTree.length > 0) {
      return orderedByTree;
    }
    return videosForSidebar.map((video) => video.id);
  }, [videoTreeForSidebar, videosForSidebar]);

  const sidebarPanelProps = buildSidebarPanelProps({
    mode,
    sidebarFocus: appSettings.sidebarFocus,
    sidebarRatio: appSettings.sidebarRatio,
    sidebarMinWidth: appSettings.sidebarMinWidth,
    sidebarFontSize: appSettings.sidebarFontSize,
    sidebarCountFontSize: appSettings.sidebarCountFontSize,
    sidebarIndentStep: appSettings.sidebarIndentStep,
    sidebarVerticalGap: appSettings.sidebarVerticalGap,
    currentRootLabel: adReviewResultsMode
      ? t("ui.sidebar.adReviewResultsRoot")
      : currentRootLabel,
    searchResultsMode,
    searchResultsLabel: t("ui.sidebar.searchResultsRoot"),
    adReviewResultsMode,
    selectedSidebarNodeId,
    canSetCurrentRoot: adReviewResultsMode ? false : canSetCurrentRoot,
    imageRootNodeId,
    videoRootNodeId,
    musicRootNodeId,
    imageTreeNodes: sidebarImageTreeNodes,
    videoTreeNodes: videoTreeForSidebar,
    audioTreeNodes: audioTreeForSidebar,
    imageNodeLoadStateById,
    selectedPackageId,
    selectedVideoId,
    selectedAudioId,
    vectorResultsActive,
    featureSearchActive,
    searchResultsReadOnly: adReviewResultsMode ? false : searchResultsReadOnly,
    manageMode,
    metadataManageMode,
    checkedSidebarNodeIdSet: sidebarCheckedNodeIdSet,
    focusedRef,
    playlistIds,
    goToFromSearchMode,
    onExitAdReviewResultsMode: () => {
      setAdReviewFocusTaskId(null);
      setAdReviewPageIndex(0);
    },
    setSelectedSidebarNodeId: (nodeId) => {
      setSelectedSidebarNodeId(nodeId);
      if (adReviewResultsMode) {
        setAdReviewPageIndex(0);
      }
    },
    updateSettings: appSettings.updateSettings,
    setSelectedPackageId,
    selectVideoFromBrowser: (videoId, options) => {
      selectVideoFromBrowser(videoId, {
        ...options,
        queueSource: options?.queueSource ?? "sidebar",
      });
    },
    setSelectedAudioId,
    collapseSidebar,
    collapsedFolderNodeIds:
      mode === "image"
        ? appSettings.imageCollapsedFolderNodeIds
        : mode === "video"
          ? appSettings.videoCollapsedFolderNodeIds
          : appSettings.musicCollapsedFolderNodeIds,
    setCollapsedFolderNodeIds: (nodeIds) => {
      const normalizedNodeIds = Array.from(
        new Set(nodeIds.map((nodeId) => nodeId.trim()).filter(Boolean)),
      );
      if (mode === "image") {
        appSettings.updateSettings({
          imageCollapsedFolderNodeIds: normalizedNodeIds,
        });
        return;
      }
      if (mode === "video") {
        appSettings.updateSettings({
          videoCollapsedFolderNodeIds: normalizedNodeIds,
        });
        return;
      }
      appSettings.updateSettings({
        musicCollapsedFolderNodeIds: normalizedNodeIds,
      });
    },
    applyCurrentRootFromSelection,
    setPlaylistIds,
    audioPlaylistIds,
    setAudioPlaylistIds,
    onToggleManageNode: toggleSidebarNodeChecked,
    onClearSidebarSelection: clearSidebarSelections,
  });

  const {
    onAdReviewStrategyModeChange,
    onAdReviewMaxConcurrencyChange,
    onAdReviewHeadNChange,
    onAdReviewTailNChange,
    onAdReviewTailStopCleanStreakChange,
  } = createAdReviewSettingHandlers({
    updateSettings: appSettings.updateSettings,
  });

  const applyMetadataSyncName = createApplyMetadataSyncName({
    mode,
    metadataWriteBindings,
    metadataImagePackageEffective,
  });

  const saveParsedMetadata = createSaveParsedMetadata({
    mode,
    metadataWriteBindings,
    metadataImagePackageEffective,
    saveParsedMetadataErrors: {
      unsupportedMode: t("ui.metadata.saveParsedUnsupportedMode"),
      noAvailablePackage: t("ui.metadata.saveParsedNoPackage"),
    },
  });

  const metadataManagementPanelProps = buildMetadataManagementPanelProps({
    metadataManageMode,
    searchPanelCollapsed,
    setSearchPanelCollapsed,
    workspaceBottomPanelHeight,
    vectorPanelRef,
    vectorPanelContentRef,
    metadataPending: metadataWriteBindings.metadataPending,
    operationHint: manageOperationHint,
    onSyncName: applyMetadataSyncName,
    onSaveParsedMetadata: saveParsedMetadata,
    onStartWorkspaceBottomPanelResize,
    layoutLocked,
    targetPackageName: metadataImagePackageEffective?.packageName ?? "",
    targetPackageLabel: metadataImagePackageEffective?.displayName ?? "-",
    proxyServer: appSettings.proxyServer,
    ehentaiCookies: appSettings.ehentaiCookies,
  });

  const enableLoadingSkeleton = benchSettings.enabled
    ? benchSettings.imageLoadingSkeleton.mode === "replace"
    : true;

  const audioSidebarOrderedIds = collectAudioIdsBySidebarOrder(
    audioTreeForSidebar,
    audiosForSidebar,
  );
  const metadataMusicPlaylistIds = collectScopedAudioIdsByFolderNode({
    selectedSidebarNode,
    audiosForSidebar,
    audioSidebarOrderedIds,
  });
  const adReviewGroupByPackageRows = shouldGroupAdReviewByPackageRows(
    adReviewResultsMode,
    selectedSidebarNode,
  );

  const {
    visibleImageRefsForMain,
    refsInPageBase,
    pageStartForMain,
    normalizedPageIndexForMain,
    imageTotalPagesForMain,
  } = resolveAdReviewPageDerivations({
    adReviewResultsMode,
    orderedRootScopedImageRefs,
    packageByIdEffective,
    adReviewFocusTask,
    selectedSidebarNode,
    pagedPageSize,
    thumbnailColumns,
    adReviewGroupByPackageRows,
    adReviewPageIndex,
    normalizedPageIndexEffective,
    visibleImageRefs,
    refsInPageEffective,
    pageStartEffective,
    imageTotalPagesEffective,
  });

  const { imageSidebarNodeIdsForWheel, imageSidebarNodeIndexByIdForWheel } =
    buildImageSidebarWheelContext(mode, sidebarImageTreeNodes);

  const { selectedConvertibleSidebarNodeIds, canManageImageConvert } =
    resolveImageConvertManageState({
      mode,
      activeSelectionScope,
      sidebarCheckedNodeIds,
      sidebarNodeById,
    });

  useEffect(() => {
    if (fullscreenActive) {
      return;
    }
    if (!imageConvertPreviewMode) {
      return;
    }
    setImageConvertPreviewMode(false);
    setImageConvertPreviewScale(imageConvertScale);
    setImageConvertPreviewLongestEdgePx(imageConvertLongestEdgePx);
    setImageConvertPreviewAdjustProfile(imageConvertAdjustProfile);
    setImageConvertPreviewFormat(imageConvertFormat);
    setImageConvertPreviewQuality(imageConvertQuality);
  }, [
    fullscreenActive,
    imageConvertAdjustProfile,
    imageConvertFormat,
    imageConvertLongestEdgePx,
    imageConvertPreviewMode,
    imageConvertQuality,
    imageConvertScale,
    setImageConvertPreviewAdjustProfile,
    setImageConvertPreviewFormat,
    setImageConvertPreviewLongestEdgePx,
    setImageConvertPreviewMode,
    setImageConvertPreviewQuality,
    setImageConvertPreviewScale,
  ]);

  const nodeBrowseMode =
    mode === "image" &&
    !vectorResultsActive &&
    !metadataManageMode &&
    !adReviewResultsMode &&
    Boolean(
      selectedSidebarNode &&
      selectedSidebarNode.imageNodeType === "folder" &&
      selectedSidebarNode.children.length > 0,
    );

  const nodeBrowseItems = buildNodeBrowseItems({
    nodeBrowseMode,
    selectedSidebarNode,
    packageByIdEffective,
    sourceCoverImageUrlBySourceId,
    thumbnailImageUrlById,
  });
  const nodeBrowsePageSize = Math.max(1, pagedPageSize);
  const nodeBrowseNodeId = nodeBrowseMode ? (selectedSidebarNode?.id ?? "") : "";
  const nodeBrowseRawPageIndex =
    nodeBrowseNodeId && nodeBrowsePageByNodeId[nodeBrowseNodeId] != null
      ? nodeBrowsePageByNodeId[nodeBrowseNodeId]
      : 0;
  const nodeBrowseTotalPages = nodeBrowseMode
    ? Math.max(1, Math.ceil(nodeBrowseItems.length / nodeBrowsePageSize))
    : 1;
  const nodeBrowseNormalizedPageIndex = nodeBrowseMode
    ? Math.max(0, Math.min(nodeBrowseTotalPages - 1, nodeBrowseRawPageIndex))
    : 0;
  const nodeBrowsePageStart = nodeBrowseMode
    ? nodeBrowseNormalizedPageIndex * nodeBrowsePageSize
    : 0;

  useEffect(() => {
    if (!nodeBrowseMode || !nodeBrowseNodeId) {
      return;
    }
    if (nodeBrowseRawPageIndex === nodeBrowseNormalizedPageIndex) {
      return;
    }
    setNodeBrowsePageByNodeId((previous) => ({
      ...previous,
      [nodeBrowseNodeId]: nodeBrowseNormalizedPageIndex,
    }));
  }, [
    nodeBrowseMode,
    nodeBrowseNodeId,
    nodeBrowseNormalizedPageIndex,
    nodeBrowseRawPageIndex,
  ]);

  const setNodeBrowsePage = (updater: (value: number) => number) => {
    if (!nodeBrowseMode || !nodeBrowseNodeId) {
      return;
    }
    setNodeBrowsePageByNodeId((previous) => {
      const currentRaw = previous[nodeBrowseNodeId] ?? 0;
      const current = Math.max(0, Math.min(nodeBrowseTotalPages - 1, currentRaw));
      const next = Math.max(0, Math.min(nodeBrowseTotalPages - 1, updater(current)));
      if (next === currentRaw) {
        return previous;
      }
      return {
        ...previous,
        [nodeBrowseNodeId]: next,
      };
    });
  };

  const onPrevPageForMain = nodeBrowseMode
    ? () => setNodeBrowsePage((value) => value - 1)
    : adReviewResultsMode
      ? () => setAdReviewPageIndex((value) => Math.max(0, value - 1))
      : goPrevPage;
  const onNextPageForMain = nodeBrowseMode
    ? () => setNodeBrowsePage((value) => value + 1)
    : adReviewResultsMode
      ? () =>
          setAdReviewPageIndex((value) =>
            Math.min(Math.max(0, imageTotalPagesForMain - 1), value + 1),
          )
      : goNextPage;
  const normalizedPageIndexForFooter = nodeBrowseMode
    ? nodeBrowseNormalizedPageIndex
    : normalizedPageIndexForMain;
  const imageTotalPagesForFooter = nodeBrowseMode
    ? nodeBrowseTotalPages
    : imageTotalPagesForMain;

  const refsInPageForDisplay = resolveRefsInPageForDisplay(refsInPageBase, {
    manageMode,
    hideUncheckedNonChecked: false,
    imageCheckedIdSet,
    packageByIdEffective,
  });

  const adReviewTaskForDisplay = adReviewResultsMode
    ? adReviewFocusTask
    : manageAdReview.task;
  const adReviewScopeImageIdSet = new Set(
    adReviewTaskForDisplay?.scope_image_ids ?? manageAdReview.scopeImageIds,
  );
  const adReviewLlmReviewedImageIdSet = new Set(
    adReviewTaskForDisplay
      ? Object.entries(adReviewTaskForDisplay.image_source_by_id)
          .filter(([, source]) => source === "llm" || source === "llm-error")
          .map(([imageId]) => imageId)
      : manageAdReview.llmReviewedImageIds,
  );
  const adReviewNonLlmReviewedImageIdSet = new Set(
    adReviewTaskForDisplay
      ? Object.entries(adReviewTaskForDisplay.image_source_by_id)
          .filter(
            ([, source]) =>
              source === "known-hash" || source === "strategy-skip",
          )
          .map(([imageId]) => imageId)
      : manageAdReview.nonLlmReviewedImageIds,
  );
  const adReviewCandidateImageIdSet = new Set(
    adReviewTaskForDisplay?.candidates.map((candidate) => candidate.image_id) ??
      [],
  );

  const {
    musicBookletState,
    openMusicCoverSourceId,
    openMusicBookletSourceId,
    returnMusicAudioId,
    imageInMusicBookletOrCoverSource,
    jumpTargetVideo,
    jumpTargetImage,
    jumpTargetAudioFromImage,
    jumpTargetAudioFromVideo,
    jumpTargetImageFromAudio,
    jumpTargetVideoFromAudio,
    jumpToAnimation,
    jumpToManga,
    jumpImageToMusic,
    jumpImageBookletToMusic,
    jumpVideoToMusic,
    jumpMusicToManga,
    jumpMusicToAnimation,
    jumpMusicToCover,
    jumpMusicToBooklet,
    updateMusicCoverBinding,
    updateMusicBookletBinding,
  } = buildWorkspaceJumpContext({
    metadataManageMode,
    metadataImagePackageEffective,
    focusedVideoEffective,
    focusedAudio,
    musicBookletImageSources,
    musicBookletBindings,
    normalImageSourceNodeIdMap,
    selectedAudioId,
    selectedPackageId,
    packageByIdEffective,
    videoByIdEffective,
    audioByIdEffective,
    applyQuickFeatureSearch,
    updateSettings: appSettings.updateSettings,
    setMetadataTab,
    setSelectedPackageId,
    setSelectedAudioId,
    selectVideoFromBrowser,
  });

  const imageMainSectionProps = buildImageMainSectionProps({
    fullscreenActive,
    vectorResultsActive,
    showNamesOnly,
    metadataManageMode,
    thumbnailScaleLevel: displayThumbnailScaleLevel,
    thumbnailScaleLevelCount,
    canThumbnailScaleDown,
    canThumbnailScaleUp,
    imageConvertScale,
    imageConvertLongestEdgePx,
    imageConvertAdjustProfile,
    imageConvertFormat,
    imageConvertQuality,
    imageConvertPreviewMode,
    imageConvertPreviewScale,
    imageConvertPreviewLongestEdgePx,
    imageConvertPreviewAdjustProfile,
    imageConvertPreviewFormat,
    imageConvertPreviewQuality,
    backendPageLoading,
    pagedPageSize,
    enableLoadingSkeleton,
    activePackageForDisplay,
    focusedRef,
    focusedImageExists: Boolean(focusedImage),
    visibleImageRefs: visibleImageRefsForMain,
    refsInPageEffective: refsInPageForDisplay,
    pageStartEffective: pageStartForMain,
    actualCellWidth,
    actualMediaHeight,
    thumbnailColumns,
    actualThumbnailGap,
    vectorSearchResults,
    packageByIdEffective,
    thumbnailImageUrlById,
    gridRef,
    onGridElementChange,
    manageMode,
    sidebarSelectedCount: sidebarCheckedNodeIds.length,
    imageSelectedCount: imageCheckedIds.length,
    activeSelectionScope,
    pendingManageAction:
      backendWrite.pending.manage || manageAdReview.deletePending,
    manageOperationHint,
    canManageDelete:
      sidebarCheckedNodeIds.length > 0 || imageCheckedIds.length > 0,
    canManageMoveNodes: sidebarCheckedNodeIds.length > 0,
    canManageImageConvert,
    canManageHide: mode === "image" && imageCheckedIds.length > 0,
    canManageUnhide: mode === "image" && imageCheckedIds.length > 0,
    adReviewFeatureEnabled: appSettings.adReviewVisionVerified,
    adReviewPending: manageAdReview.pending,
    adReviewDeletePending: manageAdReview.deletePending,
    adReviewPanelOpen,
    manageReviewMode: manageAdReview.reviewMode,
    canSwitchManageReviewMode: manageAdReview.supportsCoverReview,
    adReviewTask: manageAdReview.task,
    adReviewFocusTaskId,
    adReviewStrategyMode: appSettings.adReviewStrategyMode,
    adReviewMaxConcurrency: appSettings.adReviewMaxConcurrency,
    adReviewHeadN: appSettings.adReviewHeadN,
    adReviewTailN: appSettings.adReviewTailN,
    adReviewTailStopCleanStreak: appSettings.adReviewTailStopCleanStreak,
    canExecuteAdReview:
      (activeSelectionScope === "sidebar" &&
        sidebarCheckedNodeIds.length > 0) ||
      imageCheckedIds.length > 0,
    hasCheckedAdReviewCandidates: manageAdReview.hasCheckedCandidateSelection,
    selectedAdReviewCandidateCount: manageAdReview.selectedCandidateCount,
    checkedImageIdSet: imageCheckedIdSet,
    adReviewScopeImageIdSet,
    adReviewLlmReviewedImageIdSet,
    adReviewNonLlmReviewedImageIdSet,
    adReviewCandidateImageIdSet,
    adReviewResultsMode,
    adReviewGroupByPackageRows,
    updateSettings: appSettings.updateSettings,
    setFullscreenActiveWithAutoStop,
    setVectorFocusIndex,
    setImageFocus,
    canJumpToAnimation: Boolean(jumpTargetVideo),
    canJumpToMusic: Boolean(jumpTargetAudioFromImage),
    canJumpToMusicFromBooklet:
      imageInMusicBookletOrCoverSource && Boolean(returnMusicAudioId),
    onJumpToAnimation: jumpToAnimation,
    onJumpToMusic: jumpImageToMusic,
    onJumpToMusicFromBooklet: jumpImageBookletToMusic,
    metadataPending: metadataWriteBindings.metadataPending,
    metadataTargetPackageLabel:
      metadataImagePackageEffective?.displayName ?? "-",
    metadataFetchDefaultText: metadataManagementPanelProps.defaultFetchText,
    metadataProxyServer: appSettings.proxyServer,
    metadataEhentaiCookies: appSettings.ehentaiCookies,
    onMetadataSyncName: applyMetadataSyncName,
    onMetadataSaveParsed: saveParsedMetadata,
    onToggleImageChecked: toggleImageChecked,
    onReplaceCheckedImages: replaceImageCheckedIds,
    onManageDelete: requestManageDelete,
    onManageRename: () => undefined,
    onManageGroup: () => {
      void requestManageGroup();
    },
    onManageMove: () => {
      void requestManageMove();
    },
    onStartImageConvertTask: async (request) => {
      if (!canManageImageConvert) {
        return;
      }
      const normalizedNodeIds = Array.from(
        new Set(
          selectedConvertibleSidebarNodeIds
            .map((nodeId) => nodeId.trim())
            .filter(Boolean),
        ),
      );
      if (normalizedNodeIds.length === 0) {
        return;
      }

      return await backendWrite.startImageConvertTask({
        ...request,
        node_ids: normalizedNodeIds,
      });
    },
    onManageHide: () => {
      void runManageHideAction(true);
    },
    onManageUnhide: () => {
      void runManageHideAction(false);
    },
    onToggleAdReviewPanel: () => {
      if (manageAdReview.deletePending) {
        return;
      }
      setAdReviewPanelOpen((value) => !value);
    },
    onManageReviewModeChange: manageAdReview.setReviewMode,
    onToggleAdReviewFocus,
    onAdReviewStrategyModeChange,
    onAdReviewMaxConcurrencyChange,
    onAdReviewHeadNChange,
    onAdReviewTailNChange,
    onAdReviewTailStopCleanStreakChange,
    onStartAdReview: (options) => {
      void (async () => {
        const startedTask = await manageAdReview.startManageAdReview(options);
        if (!startedTask) {
          return;
        }
        setAdReviewFocusTaskId(startedTask.task_id);
        setAdReviewPageIndex(0);
        setSelectedSidebarNodeId(null);
      })();
    },
    onPauseAdReview: () => {
      void manageAdReview.pauseManageAdReview();
    },
    onRemoveAdReviewTask: (taskId) => {
      void manageAdReview.removeTask(taskId);
    },
    onDeleteSelectedAdReviewCandidates: () => {
      void (async () => {
        const result = await manageAdReview.confirmDeleteSelectedCandidates();
        if (!result.ok) {
          return;
        }

        setAdReviewFocusTaskId(null);
        setAdReviewPageIndex(0);

        if (result.firstHitPackageId) {
          const targetNodeId = normalImageSourceNodeIdMap.get(
            result.firstHitPackageId,
          );
          if (targetNodeId) {
            setSelectedSidebarNodeId(targetNodeId);
          }
          setSelectedPackageId(result.firstHitPackageId);
        }

        if (result.firstHitImageId) {
          const focusRef = orderedRootScopedImageRefs.find((ref) => {
            const imageId =
              packageByIdEffective.get(ref.packageId)?.images[ref.imageIndex]
                ?.id ?? null;
            return imageId === result.firstHitImageId;
          });
          if (focusRef) {
            setImageFocus(focusRef.packageId, focusRef.imageIndex);
          }
        }
      })();
    },
    onDismissAdReviewTask: manageAdReview.dismissTask,
    onClearManageSelection: clearAllSelections,
    onThumbnailScaleLevelChange: (level) => {
      const targetLevel = Math.max(
        1,
        Math.min(thumbnailScaleLevelCount, Math.round(level)),
      );
      const nextNormalizedScale = Math.max(
        1,
        Math.min(
          thumbnailScaleLevelCount,
          thumbnailScaleLevelCount - targetLevel + 1,
        ),
      );

      if (nextNormalizedScale === appSettings.thumbnailScale) {
        return;
      }

      appSettings.updateSettings({ thumbnailScale: nextNormalizedScale });
    },
    onImageConvertScaleChange: (value) => {
      setImageConvertScale(
        Math.max(0.1, Math.min(1, Number(value.toFixed(1)))),
      );
    },
    onImageConvertLongestEdgePxChange: (value) => {
      if (value == null || !Number.isFinite(value)) {
        setImageConvertLongestEdgePx(null);
        return;
      }
      setImageConvertLongestEdgePx(
        Math.max(1, Math.min(16384, Math.round(value))),
      );
    },
    onImageConvertFormatChange: (value) => {
      setImageConvertFormat(value);
    },
    onImageConvertQualityChange: (value) => {
      setImageConvertQuality(Math.max(10, Math.min(100, Math.round(value))));
    },
    onOpenImageConvertPreview: () => {
      if (!canManageImageConvert) {
        return;
      }
      setImageConvertPreviewScale(imageConvertScale);
      setImageConvertPreviewLongestEdgePx(imageConvertLongestEdgePx);
      setImageConvertPreviewAdjustProfile(imageConvertAdjustProfile);
      setImageConvertPreviewFormat(imageConvertFormat);
      setImageConvertPreviewQuality(imageConvertQuality);
      setImageConvertPreviewMode(true);
      setFullscreenActiveWithAutoStop(true);
    },
    onConfirmImageConvertPreview: () => {
      setImageConvertScale(imageConvertPreviewScale);
      setImageConvertLongestEdgePx(imageConvertPreviewLongestEdgePx);
      setImageConvertAdjustProfile(imageConvertPreviewAdjustProfile);
      setImageConvertFormat(imageConvertPreviewFormat);
      setImageConvertQuality(imageConvertPreviewQuality);
      setImageConvertPreviewMode(false);
      setFullscreenActiveWithAutoStop(false);
    },
    onCancelImageConvertPreview: () => {
      setImageConvertPreviewScale(imageConvertScale);
      setImageConvertPreviewLongestEdgePx(imageConvertLongestEdgePx);
      setImageConvertPreviewAdjustProfile(imageConvertAdjustProfile);
      setImageConvertPreviewFormat(imageConvertFormat);
      setImageConvertPreviewQuality(imageConvertQuality);
      setImageConvertPreviewMode(false);
      setFullscreenActiveWithAutoStop(false);
    },
    nodeBrowseMode,
    nodeBrowseLabel: nodeBrowseMode
      ? (selectedSidebarNode?.label ?? t("ui.image.nodeBrowseDefaultLabel"))
      : "",
    nodeBrowseItems,
    nodeBrowsePageStart,
    nodeBrowsePageSize,
    onSelectNodeBrowseItem: (nodeId, imageSourceId) => {
      setSelectedSidebarNodeId(nodeId);
      if (imageSourceId) {
        setSelectedPackageId(imageSourceId);
      }
    },
    onThumbnailWheelTurnPage: (direction) => {
      if (direction === "next") {
        onNextPageForMain();
        return;
      }
      onPrevPageForMain();
    },
    onThumbnailWheelSwitchSidebarNode: (direction) => {
      if (imageSidebarNodeIdsForWheel.length === 0) {
        return;
      }

      const currentNodeId =
        selectedSidebarNodeId &&
        imageSidebarNodeIndexByIdForWheel.has(selectedSidebarNodeId)
          ? selectedSidebarNodeId
          : imageSidebarNodeIdsForWheel[0];
      const currentIndex = imageSidebarNodeIndexByIdForWheel.get(currentNodeId);
      if (currentIndex === undefined) {
        return;
      }

      const nextIndex = Math.max(
        0,
        Math.min(
          imageSidebarNodeIdsForWheel.length - 1,
          currentIndex + (direction === "next" ? 1 : -1),
        ),
      );
      const nextNodeId = imageSidebarNodeIdsForWheel[nextIndex];
      if (!nextNodeId || nextNodeId === selectedSidebarNodeId) {
        return;
      }

      setSelectedSidebarNodeId(nextNodeId);

      const nextNode = effectiveSidebarNodeById.get(nextNodeId);
      if (nextNode?.imageSourceId) {
        setSelectedPackageId(nextNode.imageSourceId);
      }
    },
  });

  const videoMainSectionProps = buildVideoMainSectionProps({
    manageMode,
    metadataManageMode,
    sidebarSelectedCount: sidebarCheckedNodeIds.length,
    imageSelectedCount: imageCheckedIds.length,
    activeSelectionScope,
    pendingManageAction:
      backendWrite.pending.manage || manageAdReview.deletePending,
    manageOperationHint,
    canManageDelete:
      sidebarCheckedNodeIds.length > 0 || imageCheckedIds.length > 0,
    canManageMoveNodes: sidebarCheckedNodeIds.length > 0,
    canManageAddToPlaylist: sidebarCheckedNodeIds.some((nodeId) => {
      const node = sidebarNodeById.get(nodeId);
      return Boolean(node?.videoId);
    }),
    canManageHide: mode === "image" && imageCheckedIds.length > 0,
    canManageUnhide: mode === "image" && imageCheckedIds.length > 0,
    onManageDelete: requestManageDelete,
    onManageGroup: () => {
      void requestManageGroup();
    },
    onManageMove: () => {
      void requestManageMove();
    },
    onManageAddToPlaylist: () => {
      const checkedVideoIds = Array.from(
        new Set(
          sidebarCheckedNodeIds
            .map((nodeId) => sidebarNodeById.get(nodeId)?.videoId ?? null)
            .filter((videoId): videoId is string => Boolean(videoId)),
        ),
      );
      if (checkedVideoIds.length === 0) {
        return;
      }
      setPlaylistIds((previous) => {
        const next = new Set(previous);
        for (const videoId of checkedVideoIds) {
          next.add(videoId);
        }
        return Array.from(next);
      });
    },
    onManageHide: () => {
      void runManageHideAction(true);
    },
    onManageUnhide: () => {
      void runManageHideAction(false);
    },
    onClearManageSelection: clearAllSelections,
    durationSec: focusedVideoDurationSec,
    videoTime,
    videoPlaying,
    videoRate,
    videoVolume,
    videoMuted,
    videoFitMode,
    videoLoopMode,
    videoLoopModeLabel:
      videoLoopMode === "single"
        ? t("ui.media.videoLoopModeSingle")
        : t("ui.media.videoLoopModeList"),
    mediaPreloadMemoryBudgetMb: appSettings.mediaPreloadMemoryBudgetMb,
    videoPreloadOrderIds: sidebarVideoQueueIds,
    videoById: videoByIdEffective,
    videoUrlById,
    videoSourceUrl: focusedVideoSrc,
    popoverDebugPinned: appSettings.popoverDebugPinned,
    subtitleTrackUrl,
    subtitleVisible,
    subtitleLoading,
    subtitleMessage,
    subtitleOptions,
    selectedSubtitleId,
    autoSubtitleActive,
    liveSubtitleText,
    subtitleOverlayStyle,
    bindVideoElement: bindMainVideoElement,
    setSubtitleVisible,
    selectSubtitleById,
    onSubtitleCleanupSaved: refreshSubtitleOptions,
    fullscreenActive,
    active: !fullscreenActive,
    coverColor: focusedVideoCoverColor,
    coverImageUrl: focusedVideoCoverImageSrc,
    focusedVideoId: focusedVideoEffective?.id ?? null,
    focusedVideo: focusedVideoEffective,
    subtitleCleanupLlmEndpoint: appSettings.subtitleCleanupLlmEndpoint,
    subtitleCleanupLlmModel: appSettings.subtitleCleanupLlmModel,
    subtitleCleanupLlmPrompt: appSettings.subtitleCleanupLlmPrompt,
    startSubtitleCleanup: mediaRepository.startManageSubtitleCleanup,
    readSubtitleCleanupTask: mediaRepository.readManageSubtitleCleanupTask,
    runSubtitleCleanup: mediaRepository.runManageSubtitleCleanup,
    saveSubtitleCleanup: mediaRepository.saveManageSubtitleCleanup,
    onSubtitleCleanupLlmEndpointChange: (value) => {
      appSettings.updateSettings({ subtitleCleanupLlmEndpoint: value });
    },
    onSubtitleCleanupLlmModelChange: (value) => {
      appSettings.updateSettings({ subtitleCleanupLlmModel: value });
    },
    setVideoPlaying,
    canJumpToManga: Boolean(jumpTargetImage),
    canJumpToMusic: Boolean(jumpTargetAudioFromVideo),
    onJumpToManga: jumpToManga,
    onJumpToMusic: jumpVideoToMusic,
    goPlaylist: (step) => goPlaylist(step, sidebarVideoQueueIds),
    setVideoTime,
    setVideoDurationById,
    setVideoMuted,
    setVideoVolume,
    setVideoRate,
    setVideoFitMode,
    onCycleVideoLoopMode: cycleVideoLoopMode,
    cycleVideoFitMode,
    saveVideoCover: backendWrite.saveVideoCover,
    setFullscreenActiveWithAutoStop,
    metadataPending: metadataWriteBindings.metadataPending,
    onMetadataSyncName: applyMetadataSyncName,
  });

  const musicMainSectionProps = buildMusicMainSectionProps({
    mode,
    fullscreenActive,
    popoverDebugPinned: appSettings.popoverDebugPinned,
    paletteMode: appSettings.paletteMode,
    videoPlaying,
    playRequestNonce: musicPlayRequestNonce,
    manageMode,
    metadataManageMode,
    sidebarSelectedCount: sidebarCheckedNodeIds.length,
    imageSelectedCount: imageCheckedIds.length,
    activeSelectionScope,
    pendingManageAction:
      backendWrite.pending.manage || manageAdReview.deletePending,
    manageOperationHint,
    canManageDelete:
      sidebarCheckedNodeIds.length > 0 || imageCheckedIds.length > 0,
    canManageMoveNodes: sidebarCheckedNodeIds.length > 0,
    onManageDelete: requestManageDelete,
    onManageGroup: () => {
      void requestManageGroup();
    },
    onManageMove: () => {
      void requestManageMove();
    },
    onClearManageSelection: clearAllSelections,
    canJumpToManga: Boolean(jumpTargetImageFromAudio),
    canJumpToAnimation: Boolean(jumpTargetVideoFromAudio),
    canJumpToCover: Boolean(openMusicCoverSourceId),
    canJumpToBooklet: Boolean(openMusicBookletSourceId),
    onJumpToManga: jumpMusicToManga,
    onJumpToAnimation: jumpMusicToAnimation,
    onJumpToCover: jumpMusicToCover,
    onJumpToBooklet: jumpMusicToBooklet,
    audiosForSidebar,
    audioSidebarOrderedIds,
    focusedAudio,
    focusedAudioSrc,
    audioUrlById,
    mediaPreloadMemoryBudgetMb: appSettings.mediaPreloadMemoryBudgetMb,
    fullscreenVideoControlsMaxWidth:
      appSettings.fullscreenVideoControlsMaxWidth,
    selectedAudioId,
    musicLoopMode,
    musicLoopModeLabels: {
      single: t("ui.music.loopModeSingle"),
      folder: t("ui.music.loopModeFolder"),
      album: t("ui.music.loopModeAlbum"),
      library: t("ui.music.loopModeLibrary"),
    },
    audioByIdEffective,
    setSelectedAudioId,
    setMusicLoopMode,
    setFullscreenActiveWithAutoStop,
    musicVisualizerSelectedShaderId:
      appSettings.musicVisualizerSelectedShaderId,
    musicVisualizerRenderLongEdgePx:
      appSettings.musicVisualizerRenderLongEdgePx,
    musicVisualizerFpsCap: appSettings.musicVisualizerFpsCap,
    musicVisualizerToneMapMode: appSettings.musicVisualizerToneMapMode,
    musicVisualizerToneMapExposure: appSettings.musicVisualizerToneMapExposure,
    musicVisualizerToneMapStrength: appSettings.musicVisualizerToneMapStrength,
    musicVisualizerShowFps: appSettings.musicVisualizerShowFps,
    musicVisualizerRenderer: appSettings.musicVisualizerRenderer,
    musicVisualizerShaderSettingsById:
      appSettings.musicVisualizerShaderSettingsById,
    updateSettings: appSettings.updateSettings,
  });

  const metadataPanelProps = buildWorkspaceMetadataPanelProps({
    appSettings,
    manageAdReview,
    metadataWriteBindings,
    musicBookletState,
    musicBookletBindings,
    mode,
    manageMode,
    vectorMode,
    metadataManageMode,
    videosForSidebarCount,
    audiosForSidebarCount,
    scopedImageSourcesEffective,
    featureNameQuery,
    setFeatureNameQuery,
    featureWorkTitleQuery,
    setFeatureWorkTitleQuery,
    featureCircleQuery,
    setFeatureCircleQuery,
    featureAuthorQuery,
    setFeatureAuthorQuery,
    featureCircleOptions,
    featureAuthorOptions,
    featureTagOptionsEffective,
    featureTagPickerOpen,
    setFeatureTagPickerOpen,
    featureTags,
    setFeatureTags,
    featureGradeFilter,
    setFeatureGradeFilter,
    adReviewPanelOpen,
    activeSelectionScope,
    sidebarCheckedNodeIds,
    imageCheckedIds,
    adReviewFocusTaskId,
    setAdReviewFocusTaskId,
    setAdReviewPageIndex,
    setSelectedSidebarNodeId,
    imageFocusActive,
    metadataImageEffective,
    metadataImageSrc,
    metadataImagePackageEffective,
    currentGradeEffective,
    focusedVideoEffective,
    focusedAudio,
    metadataMusicPlaylistIds,
    selectedAudioId,
    audioByIdEffective,
    openMusicCoverSourceId,
    openMusicBookletSourceId,
    metadataTab,
    playlistIds,
    selectedVideoId,
    dragVideoId,
    videoByIdEffective,
    saveParsedMetadata,
    applyQuickFeatureSearch,
    setMetadataTab,
    selectVideoFromBrowser,
    setSelectedAudioId,
    requestMusicPlay,
    updateMusicCoverBinding,
    updateMusicBookletBinding,
    jumpMusicToCover,
    jumpMusicToBooklet,
    setPlaylistIds,
    setDragVideoId,
  });

  const mainFooter = buildMainFooter({
    t,
    mode,
    focusedImage,
    focusedImagePackage,
    focusedVideo: focusedVideoEffective,
    focusedAudio,
    sidebarFocusedPath: selectedSidebarNodeId
      ? (effectiveSidebarNodeById.get(selectedSidebarNodeId)?.pathKey ?? null)
      : null,
    nodeBrowseMode,
    normalizedPageIndex: normalizedPageIndexForFooter,
    imageTotalPages: imageTotalPagesForFooter,
    onPrevPage: onPrevPageForMain,
    onNextPage: onNextPageForMain,
  });

  return {
    sidebarPanelProps,
    imageMainSectionProps,
    videoMainSectionProps,
    musicMainSectionProps,
    metadataPanelProps,
    mainFooter,
  };
}

export type AppWorkspacePropsResult = ReturnType<typeof useAppWorkspaceProps>;
