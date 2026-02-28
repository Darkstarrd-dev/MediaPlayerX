import { useEffect, useMemo, useRef } from "react";

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
  buildVideoNodeBrowseItems,
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
  createSaveParsedMetadataByPackageId,
  createSaveParsedMetadata,
} from "./workspaceMetadataActions";
import { buildWorkspaceMetadataFetchTargets } from "./workspaceMetadataFetchTargets";
import { useWorkspaceNodeBrowsePaging } from "./useWorkspaceNodeBrowsePaging";
import { createWorkspaceImageMainSectionHandlers } from "./workspaceImageMainSectionHandlers";
import { useMetadataManageSelectionMode } from "./useMetadataManageSelectionMode";
import { createAdReviewSettingHandlers } from "./workspaceAdReviewHandlers";
import { buildWorkspaceMetadataPanelProps } from "./workspaceMetadataPanelProps";
import type { UseAppWorkspacePropsParams } from "./useAppWorkspaceProps.types";
import type { MetadataFetchTarget } from "../metadata/metadataFetchTargets";
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
  requestImageSidebarLocateFromMain,
  toggleImageChecked,
  replaceImageCheckedIds,
  goPrevPage,
  goNextPage,
  goPageByDelta,
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
  videoCoverImageUrlById,
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
  videoQueueSource,
  setVideoTime,
  setVideoDurationById,
  setVideoMuted,
  setVideoVolume,
  setVideoRate,
  setVideoFitMode,
  requestVideoSidebarLocateFromMain,
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
  checkSidebarNode,
  setAudioPlaylistIds,
  requestMusicPlay,
  musicBookletBindings,
}: UseAppWorkspacePropsParams) {
  const { t } = useI18n();
  const { metadataManageSelectionMode, toggleMetadataManageSelectionMode } =
    useMetadataManageSelectionMode({
      metadataManageMode,
      selectedSidebarNodeId,
      sidebarNodeById,
      clearSidebarSelections,
      checkSidebarNode,
    });

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

  const activePaletteId =
    appSettings.paletteMode === "night"
      ? appSettings.paletteNightId
      : appSettings.paletteDayId;
  const luxuryWhiteActive =
    appSettings.styleId.startsWith("soft-skeuomorphic") &&
    activePaletteId === "skeuomorphic-luxury-white";

  const videoNodeBrowseMode =
    mode === "video" &&
    !manageMode &&
    !metadataManageMode &&
    Boolean(
      selectedSidebarNode &&
      selectedSidebarNode.kind === "folder" &&
      selectedSidebarNode.children.some((child) => Boolean(child.videoId)),
    );

  const videoNodeBrowseItems = buildVideoNodeBrowseItems({
    nodeBrowseMode: videoNodeBrowseMode,
    selectedSidebarNode,
    videoByIdEffective,
    videoCoverImageUrlById,
  });
  const autoSavedVideoCoverIdsRef = useRef<Set<string>>(new Set());
  const pendingAutoSaveVideoCoverIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!videoNodeBrowseMode) {
      return;
    }
    setVideoPlaying(false);
  }, [setVideoPlaying, videoNodeBrowseMode]);

  const sidebarPanelProps = buildSidebarPanelProps({
    mode,
    sidebarFocus: appSettings.sidebarFocus,
    sidebarRatio: appSettings.sidebarRatio,
    sidebarMinWidth: appSettings.sidebarMinWidth,
    sidebarFontSize: appSettings.sidebarFontSize,
    sidebarCountFontSize: appSettings.sidebarCountFontSize,
    sidebarIndentStep: appSettings.sidebarIndentStep,
    sidebarVerticalGap: appSettings.sidebarVerticalGap,
    sidebarLabelDisplayMode: appSettings.sidebarLabelDisplayMode,
    sidebarTreeDisplayMode: appSettings.sidebarTreeDisplayMode,
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
    videoNodeBrowseMode,
    metadataManageSelectionMode,
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
    onSelectMetadataSingleNode: (nodeId) => {
      clearSidebarSelections();
      checkSidebarNode(nodeId);
    },
    titleCollapseEnabled: !luxuryWhiteActive,
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

  const saveParsedMetadataByPackageId = createSaveParsedMetadataByPackageId({
    mode,
    metadataWriteBindings,
    saveParsedMetadataErrors: {
      unsupportedMode: t("ui.metadata.saveParsedUnsupportedMode"),
      noAvailablePackage: t("ui.metadata.saveParsedNoPackage"),
    },
  });

  const metadataFetchTargets: MetadataFetchTarget[] = useMemo(() => {
    return buildWorkspaceMetadataFetchTargets({
      mode,
      metadataManageMode,
      sidebarCheckedNodeIds,
      sidebarNodeById,
      metadataImagePackageId: metadataImagePackageEffective?.id ?? null,
      packageById: packageByIdEffective,
    });
  }, [
    metadataImagePackageEffective?.id,
    metadataManageMode,
    mode,
    packageByIdEffective,
    sidebarCheckedNodeIds,
    sidebarNodeById,
  ]);

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
  const mainNodeBrowseMode = nodeBrowseMode || videoNodeBrowseMode;
  const mainNodeBrowseItemsLength =
    mode === "video" ? videoNodeBrowseItems.length : nodeBrowseItems.length;
  const {
    nodeBrowsePageStart,
    nodeBrowsePageSize,
    normalizedPageIndexForFooterWithPreview,
    imageTotalPagesForFooter,
    onPrevPageForMain,
    onNextPageForMain,
    onThumbnailWheelTurnPage,
    onThumbnailWheelDeltaPreview,
  } = useWorkspaceNodeBrowsePaging({
    nodeBrowseMode: mainNodeBrowseMode,
    nodeBrowseNodeId: mainNodeBrowseMode ? (selectedSidebarNode?.id ?? "") : "",
    nodeBrowseItemsLength: mainNodeBrowseItemsLength,
    pagedPageSize,
    adReviewResultsMode,
    imageTotalPagesForMain,
    normalizedPageIndexForMain,
    setAdReviewPageIndex,
    goPrevPage,
    goNextPage,
    goPageByDelta,
  });

  useEffect(() => {
    if (!videoNodeBrowseMode || !selectedSidebarNode) {
      return;
    }

    const pageStart = Math.max(0, nodeBrowsePageStart);
    const pageSize = Math.max(1, nodeBrowsePageSize);
    const pagedItems = videoNodeBrowseItems.slice(
      pageStart,
      pageStart + pageSize,
    );

    for (const item of pagedItems) {
      const videoId = item.videoId?.trim() ?? "";
      if (!videoId) {
        continue;
      }

      if (pendingAutoSaveVideoCoverIdsRef.current.has(videoId)) {
        continue;
      }

      if (autoSavedVideoCoverIdsRef.current.has(videoId)) {
        continue;
      }

      const video = videoByIdEffective.get(videoId);
      if (!video) {
        continue;
      }

      const hasExistingCover = Boolean(
        video.coverImagePath || videoCoverImageUrlById[videoId],
      );
      if (hasExistingCover) {
        autoSavedVideoCoverIdsRef.current.add(videoId);
        continue;
      }

      pendingAutoSaveVideoCoverIdsRef.current.add(videoId);
      void backendWrite
        .saveVideoCover(videoId, 0.1, video.coverColor)
        .then(() => {
          autoSavedVideoCoverIdsRef.current.add(videoId);
        })
        .catch(() => undefined)
        .finally(() => {
          pendingAutoSaveVideoCoverIdsRef.current.delete(videoId);
        });
    }
  }, [
    backendWrite,
    nodeBrowsePageSize,
    nodeBrowsePageStart,
    selectedSidebarNode,
    videoByIdEffective,
    videoCoverImageUrlById,
    videoNodeBrowseItems,
    videoNodeBrowseMode,
  ]);

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

  const imageMainSectionHandlers = createWorkspaceImageMainSectionHandlers({
    canManageImageConvert,
    selectedConvertibleSidebarNodeIds,
    backendWrite,
    requestManageGroup,
    requestManageMove,
    runManageHideAction,
    manageAdReview,
    setAdReviewPanelOpen,
    setAdReviewFocusTaskId,
    setAdReviewPageIndex,
    setSelectedSidebarNodeId,
    setSelectedPackageId,
    setImageFocus,
    normalImageSourceNodeIdMap,
    orderedRootScopedImageRefs,
    packageByIdEffective,
    clearAllSelections,
    thumbnailScaleLevelCount,
    appSettings,
    setImageConvertScale,
    setImageConvertLongestEdgePx,
    setImageConvertAdjustProfile,
    setImageConvertFormat,
    setImageConvertQuality,
    imageConvertScale,
    imageConvertLongestEdgePx,
    imageConvertAdjustProfile,
    imageConvertFormat,
    imageConvertQuality,
    setImageConvertPreviewScale,
    setImageConvertPreviewLongestEdgePx,
    setImageConvertPreviewAdjustProfile,
    setImageConvertPreviewFormat,
    setImageConvertPreviewQuality,
    setImageConvertPreviewMode,
    imageConvertPreviewScale,
    imageConvertPreviewLongestEdgePx,
    imageConvertPreviewAdjustProfile,
    imageConvertPreviewFormat,
    imageConvertPreviewQuality,
    setFullscreenActiveWithAutoStop,
    imageSidebarNodeIdsForWheel,
    imageSidebarNodeIndexByIdForWheel,
    selectedSidebarNodeId,
    effectiveSidebarNodeById,
  });

  const imageMainSectionProps = buildImageMainSectionProps({
    popoverDebugPinned: appSettings.popoverDebugPinned,
    fullscreenActive,
    vectorResultsActive,
    showNamesOnly,
    metadataManageMode,
    metadataManageSelectionMode,
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
    onRequestSidebarLocateFromMain: requestImageSidebarLocateFromMain,
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
    metadataFetchTargets,
    metadataProxyServer: appSettings.proxyServer,
    metadataEhentaiCookies: appSettings.ehentaiCookies,
    onMetadataSyncName: applyMetadataSyncName,
    onToggleMetadataManageSelectionMode: toggleMetadataManageSelectionMode,
    onMetadataSaveParsed: saveParsedMetadata,
    onMetadataSaveParsedByPackageId: saveParsedMetadataByPackageId,
    onToggleImageChecked: toggleImageChecked,
    onReplaceCheckedImages: replaceImageCheckedIds,
    onManageDelete: requestManageDelete,
    onManageRename: () => undefined,
    onManageGroup: imageMainSectionHandlers.onManageGroup,
    onManageMove: imageMainSectionHandlers.onManageMove,
    onStartImageConvertTask: imageMainSectionHandlers.onStartImageConvertTask,
    onManageHide: imageMainSectionHandlers.onManageHide,
    onManageUnhide: imageMainSectionHandlers.onManageUnhide,
    onToggleAdReviewPanel: imageMainSectionHandlers.onToggleAdReviewPanel,
    onManageReviewModeChange: manageAdReview.setReviewMode,
    onToggleAdReviewFocus,
    onAdReviewStrategyModeChange,
    onAdReviewMaxConcurrencyChange,
    onAdReviewHeadNChange,
    onAdReviewTailNChange,
    onAdReviewTailStopCleanStreakChange,
    onStartAdReview: imageMainSectionHandlers.onStartAdReview,
    onPauseAdReview: imageMainSectionHandlers.onPauseAdReview,
    onRemoveAdReviewTask: imageMainSectionHandlers.onRemoveAdReviewTask,
    onDeleteSelectedAdReviewCandidates:
      imageMainSectionHandlers.onDeleteSelectedAdReviewCandidates,
    onDismissAdReviewTask: imageMainSectionHandlers.onDismissAdReviewTask,
    onClearManageSelection: imageMainSectionHandlers.onClearManageSelection,
    onThumbnailScaleLevelChange:
      imageMainSectionHandlers.onThumbnailScaleLevelChange,
    onImageConvertScaleChange:
      imageMainSectionHandlers.onImageConvertScaleChange,
    onImageConvertLongestEdgePxChange:
      imageMainSectionHandlers.onImageConvertLongestEdgePxChange,
    onImageConvertFormatChange:
      imageMainSectionHandlers.onImageConvertFormatChange,
    onImageConvertQualityChange:
      imageMainSectionHandlers.onImageConvertQualityChange,
    onOpenImageConvertPreview:
      imageMainSectionHandlers.onOpenImageConvertPreview,
    onConfirmImageConvertPreview:
      imageMainSectionHandlers.onConfirmImageConvertPreview,
    onCancelImageConvertPreview:
      imageMainSectionHandlers.onCancelImageConvertPreview,
    nodeBrowseMode,
    nodeBrowseLabel: nodeBrowseMode
      ? (selectedSidebarNode?.label ?? t("ui.image.nodeBrowseDefaultLabel"))
      : "",
    nodeBrowseItems,
    nodeBrowsePageStart,
    nodeBrowsePageSize,
    onSelectNodeBrowseItem: imageMainSectionHandlers.onSelectNodeBrowseItem,
    onThumbnailWheelTurnPage,
    onThumbnailWheelDeltaPreview,
    onThumbnailWheelSwitchSidebarNode:
      imageMainSectionHandlers.onThumbnailWheelSwitchSidebarNode,
  });

  const videoMainSectionProps = buildVideoMainSectionProps({
    manageMode,
    metadataManageMode,
    adReviewPanelOpen,
    metadataManageSelectionMode,
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
    nodeBrowseMode: videoNodeBrowseMode,
    nodeBrowseLabel: videoNodeBrowseMode
      ? (selectedSidebarNode?.label ?? t("ui.image.nodeBrowseDefaultLabel"))
      : "",
    nodeBrowseItems: videoNodeBrowseItems,
    nodeBrowsePageStart,
    nodeBrowsePageSize,
    thumbnailColumns,
    actualCellWidth,
    thumbnailGap: actualThumbnailGap,
    thumbnailScaleLevelCount,
    displayThumbnailScaleLevel,
    canThumbnailScaleDown,
    canThumbnailScaleUp,
    onGridElementChange,
    onThumbnailScaleLevelChange:
      imageMainSectionHandlers.onThumbnailScaleLevelChange,
    onPreviewNodeBrowseItem: (_nodeId, videoId) => {
      if (!videoId) {
        return;
      }
      setVideoPlaying(false);
      selectVideoFromBrowser(videoId, {
        play: false,
        queueSource: "sidebar",
        preserveRate: true,
      });
    },
    onActivateNodeBrowseItem: (nodeId, videoId) => {
      setSelectedSidebarNodeId(nodeId);
      if (videoId) {
        selectVideoFromBrowser(videoId, { play: true, queueSource: "sidebar" });
      }
    },
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
    updateSettings: appSettings.updateSettings,
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
    goPlaylist: (step, queueOverride, options) => {
      const effectiveQueueOverride =
        queueOverride ??
        (videoQueueSource === "sidebar" ? sidebarVideoQueueIds : undefined);
      goPlaylist(step, effectiveQueueOverride, options);
    },
    setVideoTime,
    setVideoDurationById,
    setVideoMuted,
    setVideoVolume,
    setVideoRate,
    setVideoFitMode,
    onRequestSidebarLocateFromMain: requestVideoSidebarLocateFromMain,
    onCycleVideoLoopMode: cycleVideoLoopMode,
    cycleVideoFitMode,
    saveVideoCover: backendWrite.saveVideoCover,
    setFullscreenActiveWithAutoStop,
    metadataPending: metadataWriteBindings.metadataPending,
    onMetadataSyncName: applyMetadataSyncName,
    onToggleMetadataManageSelectionMode: toggleMetadataManageSelectionMode,
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
    metadataManageSelectionMode,
    sidebarSelectedCount: sidebarCheckedNodeIds.length,
    sidebarCheckedNodeIds,
    imageCheckedIds,
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
    showNamesOnly,
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
    requestMusicPlay,
    toggleImageChecked,
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
    onToggleMetadataManageSelectionMode: toggleMetadataManageSelectionMode,
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
    videoQueueSource,
    titleCollapseEnabled: !luxuryWhiteActive,
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
    nodeBrowseMode: mainNodeBrowseMode,
    normalizedPageIndex: normalizedPageIndexForFooterWithPreview,
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
