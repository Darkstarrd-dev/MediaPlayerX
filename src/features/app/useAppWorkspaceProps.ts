import { useEffect, useMemo, useRef } from "react";

import { buildImageMainSectionProps } from "./buildImageMainSectionProps";
import { buildMainFooter } from "./buildMainFooter";
import { buildManagementPanelProps } from "./buildManagementPanelProps";
import { buildMetadataManagementPanelProps } from "./buildMetadataManagementPanelProps";
import { buildMetadataPanelProps } from "./buildMetadataPanelProps";
import { buildSearchPanelProps } from "./buildSearchPanelProps";
import { buildSidebarPanelProps } from "./buildSidebarPanelProps";
import { buildMusicMainSectionProps } from "./buildMusicMainSectionProps";
import { buildVideoMainSectionProps } from "./buildVideoMainSectionProps";
import {
  resolveMusicBookletPreviewRootNodeId,
  resolveMusicBookletState,
} from "./workspaceMusicBooklet";
import {
  createMusicBookletBindingActions,
  createWorkspaceJumpActions,
} from "./workspaceJumpActions";
import {
  collectAudioIdsBySidebarOrder,
  collectScopedAudioIdsByFolderNode,
  flattenExternalTagValues,
  normalizeFeatureTags,
  normalizeSeriesId,
  pickFirstBySeriesId,
} from "./workspaceSharedUtils";
import {
  buildNodeBrowseItems,
  resolveRefsInPageForDisplay,
} from "./workspaceImageDerivations";
import { resolveAdReviewPageDerivations } from "./workspaceAdReviewPageDerivations";
import { resolveAdReviewSidebarContext } from "./workspaceAdReviewSidebarContext";
import {
  createApplyMetadataSyncName,
  createSaveParsedMetadata,
} from "./workspaceMetadataActions";
import { createAdReviewSettingHandlers } from "./workspaceAdReviewHandlers";
import type { UseAppWorkspacePropsParams } from "./useAppWorkspaceProps.types";
import { useI18n } from "../../i18n/useI18n";

export function useAppWorkspaceProps({
  appSettings,
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
  managementErrorRows,
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
  clearAllSelections,
  vectorResultsActive,
  showNamesOnly,
  displayThumbnailScaleLevel,
  thumbnailScaleLevelCount,
  canThumbnailScaleDown,
  canThumbnailScaleUp,
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
  focusedVideoSrc,
  focusedAudioSrc,
  subtitleTrackUrl,
  subtitleVisible,
  subtitleLoading,
  subtitleMessage,
  subtitleOptions,
  selectedSubtitleId,
  setSubtitleVisible,
  selectSubtitleById,
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

  /**
   * The Workspace layer only assembles view-model props:
   * - Inputs are read/write capabilities already consolidated by upstream state layers.
   * - Outputs are stable props for Sidebar/Main/Metadata.
   */
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

  const previousAdReviewPanelOpenRef = useRef(adReviewPanelOpen);
  useEffect(() => {
    const wasOpen = previousAdReviewPanelOpenRef.current;
    previousAdReviewPanelOpenRef.current = adReviewPanelOpen;

    if (wasOpen && !adReviewPanelOpen) {
      if (adReviewFocusTaskId) {
        setAdReviewFocusTaskId(null);
        setAdReviewPageIndex(0);
      }
      return;
    }

    const enteringAdReviewMode = !wasOpen && adReviewPanelOpen;
    if (!enteringAdReviewMode) {
      return;
    }

    const activeTask = manageAdReview.task;
    if (!activeTask) {
      return;
    }

    if (activeTask.status === "running" || activeTask.status === "paused") {
      setAdReviewFocusTaskId(activeTask.task_id);
      setAdReviewPageIndex(0);
    }
  }, [
    adReviewFocusTaskId,
    adReviewPanelOpen,
    manageAdReview.task,
    setAdReviewFocusTaskId,
    setAdReviewPageIndex,
  ]);

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
    selectVideoFromBrowser,
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
    onCheckManageNode: checkSidebarNode,
  });

  const searchPanelProps = buildSearchPanelProps({
    vectorMode,
    manageMode,
    searchPanelCollapsed,
    setSearchPanelCollapsed,
    workspaceBottomPanelHeight,
    vectorPanelRef,
    vectorPanelContentRef,
    featureResultCount:
      mode === "video"
        ? videosForSidebarCount
        : mode === "music"
          ? audiosForSidebarCount
          : scopedImageSourcesEffective.length,
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
    featureTagOptions: featureTagOptionsEffective,
    featureTagPickerOpen,
    setFeatureTagPickerOpen,
    featureTags,
    setFeatureTags,
    featureGradeFilter,
    setFeatureGradeFilter,
    onStartWorkspaceBottomPanelResize,
    layoutLocked,
  });

  const managementPanelProps = buildManagementPanelProps({
    mode,
    manageMode,
    searchPanelCollapsed,
    setSearchPanelCollapsed,
    workspaceBottomPanelHeight,
    vectorPanelRef,
    vectorPanelContentRef,
    sidebarSelectedCount: sidebarCheckedNodeIds.length,
    imageSelectedCount: imageCheckedIds.length,
    activeSelectionScope,
    pending: backendWrite.pending.manage || manageAdReview.deletePending,
    operationHint: manageOperationHint,
    errorRows: managementErrorRows,
    onDelete: requestManageDelete,
    onHide: () => {
      void runManageHideAction(true);
    },
    onUnhide: () => {
      void runManageHideAction(false);
    },
    onClearSelection: clearAllSelections,
    adReviewFeatureEnabled: appSettings.adReviewVisionVerified,
    adReviewPending: manageAdReview.pending,
    adReviewDeletePending: manageAdReview.deletePending,
    adReviewTask: manageAdReview.task,
    adReviewHideUncheckedNonChecked: manageAdReview.hideUncheckedNonChecked,
    hasCheckedAdReviewCandidates: manageAdReview.hasCheckedCandidateSelection,
    adReviewStrategyMode: appSettings.adReviewStrategyMode,
    adReviewMaxConcurrency: appSettings.adReviewMaxConcurrency,
    adReviewHeadN: appSettings.adReviewHeadN,
    adReviewTailN: appSettings.adReviewTailN,
    adReviewTailStopCleanStreak: appSettings.adReviewTailStopCleanStreak,
    onStartAdReview: () => {
      void manageAdReview.startManageAdReview();
    },
    onPauseAdReview: () => {
      void manageAdReview.pauseManageAdReview();
    },
    onToggleHideUncheckedNonChecked:
      manageAdReview.toggleHideUncheckedNonChecked,
    ...createAdReviewSettingHandlers({
      updateSettings: appSettings.updateSettings,
    }),
    onDismissAdReviewTask: manageAdReview.dismissTask,
    onStartWorkspaceBottomPanelResize,
    layoutLocked,
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
  const adReviewGroupByPackageRows =
    adReviewResultsMode &&
    Boolean(
      selectedSidebarNode &&
      (selectedSidebarNode.kind === "folder" ||
        selectedSidebarNode.imageNodeType === "folder"),
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

  const onPrevPageForMain = adReviewResultsMode
    ? () => {
        setAdReviewPageIndex((value) => Math.max(0, value - 1));
      }
    : goPrevPage;
  const onNextPageForMain = adReviewResultsMode
    ? () => {
        setAdReviewPageIndex((value) =>
          Math.min(Math.max(0, imageTotalPagesForMain - 1), value + 1),
        );
      }
    : goNextPage;

  const imageSidebarNodeIdsForWheel = useMemo(() => {
    const orderedIds: string[] = [];
    const walk = (nodes: typeof sidebarImageTreeNodes) => {
      for (const node of nodes) {
        orderedIds.push(node.id);
        if (node.children.length > 0) {
          walk(node.children);
        }
      }
    };
    walk(sidebarImageTreeNodes);
    return orderedIds;
  }, [sidebarImageTreeNodes]);

  const imageSidebarNodeIndexByIdForWheel = useMemo(() => {
    return new Map(
      imageSidebarNodeIdsForWheel.map((nodeId, index) => [nodeId, index]),
    );
  }, [imageSidebarNodeIdsForWheel]);

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

  const imageSeriesId = normalizeSeriesId(
    metadataImagePackageEffective?.seriesId,
  );
  const videoSeriesId = normalizeSeriesId(focusedVideoEffective?.seriesId);
  const audioSeriesId = normalizeSeriesId(focusedAudio?.seriesId);
  const jumpTargetVideo = pickFirstBySeriesId(
    videoByIdEffective.values(),
    imageSeriesId,
  );
  const jumpTargetAudioFromImage = pickFirstBySeriesId(
    audioByIdEffective.values(),
    imageSeriesId,
  );
  const jumpTargetImage = pickFirstBySeriesId(
    packageByIdEffective.values(),
    videoSeriesId,
  );
  const jumpTargetAudioFromVideo = pickFirstBySeriesId(
    audioByIdEffective.values(),
    videoSeriesId,
  );
  const jumpTargetImageFromAudio = pickFirstBySeriesId(
    packageByIdEffective.values(),
    audioSeriesId,
  );
  const jumpTargetVideoFromAudio = pickFirstBySeriesId(
    videoByIdEffective.values(),
    audioSeriesId,
  );
  const musicBookletState = resolveMusicBookletState({
    focusedAudio,
    imageSources: musicBookletImageSources,
    musicImportDirectories: musicBookletBindings.musicImportDirectories,
    bindingsByAlbumRoot: musicBookletBindings.bindingsByAlbumRoot,
  });
  const openMusicCoverSourceId = metadataManageMode
    ? musicBookletState.effectiveCoverSourceId
    : (musicBookletState.effectiveCoverSourceId ??
      musicBookletState.autoCoverSourceId);
  const openMusicBookletSourceId = metadataManageMode
    ? (musicBookletState.effectiveBookletSourceId ??
      musicBookletState.effectiveCoverSourceId)
    : (musicBookletState.effectiveBookletSourceId ??
      musicBookletState.effectiveCoverSourceId ??
      musicBookletState.autoBookletSourceId ??
      musicBookletState.autoCoverSourceId);
  const musicBookletPreviewRootNodeId = resolveMusicBookletPreviewRootNodeId({
    candidateSourceIds: musicBookletState.candidates.map(
      (candidate) => candidate.sourceId,
    ),
    imageSourceNodeIdMap: normalImageSourceNodeIdMap,
  });

  const {
    jumpToAnimation,
    jumpToManga,
    jumpImageToMusic,
    jumpVideoToMusic,
    jumpMusicToManga,
    jumpMusicToAnimation,
    jumpMusicToCover,
    jumpMusicToBooklet,
  } = createWorkspaceJumpActions({
    applyQuickFeatureSearch: (patch) => applyQuickFeatureSearch(patch),
    updateSettings: (patch) => appSettings.updateSettings(patch),
      setMetadataTab,
      setSelectedPackageId,
      setSelectedAudioId,
      selectVideoFromBrowser,
      jumpTargetVideoId: jumpTargetVideo?.id ?? null,
      jumpTargetImageId: jumpTargetImage?.id ?? null,
      jumpTargetAudioFromImageId: jumpTargetAudioFromImage?.id ?? null,
      jumpTargetAudioFromVideoId: jumpTargetAudioFromVideo?.id ?? null,
      jumpTargetImageFromAudioId: jumpTargetImageFromAudio?.id ?? null,
      jumpTargetVideoFromAudioId: jumpTargetVideoFromAudio?.id ?? null,
    imageSeriesId,
    videoSeriesId,
    audioSeriesId,
    openMusicCoverSourceId,
    openMusicBookletSourceId,
    musicBookletPreviewRootNodeId,
  });

  const { updateMusicCoverBinding, updateMusicBookletBinding } =
    createMusicBookletBindingActions({
      albumRootPath: musicBookletState.albumRootPath,
      bindingsByAlbumRoot: musicBookletBindings.bindingsByAlbumRoot,
      resetBindingOverride: musicBookletBindings.resetBindingOverride,
      setBindingOverride: musicBookletBindings.setBindingOverride,
    });

  const imageMainSectionProps = buildImageMainSectionProps({
    vectorResultsActive,
    showNamesOnly,
    metadataManageMode,
    thumbnailScaleLevel: displayThumbnailScaleLevel,
    thumbnailScaleLevelCount,
    canThumbnailScaleDown,
    canThumbnailScaleUp,
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
    canManageHide: mode === "image" && imageCheckedIds.length > 0,
    canManageUnhide: mode === "image" && imageCheckedIds.length > 0,
    adReviewFeatureEnabled: appSettings.adReviewVisionVerified,
    adReviewDeletePending: manageAdReview.deletePending,
    adReviewPanelOpen,
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
    onJumpToAnimation: jumpToAnimation,
    onJumpToMusic: jumpImageToMusic,
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
    onManageGroup: () => {
      void requestManageGroup();
    },
    onManageMove: () => {
      void requestManageMove();
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
    onClearManageSelection: clearAllSelections,
    onThumbnailScaleLevelChange: (level) => {
      const targetLevel = Math.max(1, Math.min(thumbnailScaleLevelCount, Math.round(level)));
      const nextNormalizedScale = Math.max(
        1,
        Math.min(thumbnailScaleLevelCount, thumbnailScaleLevelCount - targetLevel + 1),
      );

      if (nextNormalizedScale === appSettings.thumbnailScale) {
        return;
      }

      appSettings.updateSettings({ thumbnailScale: nextNormalizedScale });
    },
    nodeBrowseMode,
    nodeBrowseLabel: nodeBrowseMode
      ? (selectedSidebarNode?.label ?? t("ui.image.nodeBrowseDefaultLabel"))
      : "",
    nodeBrowseItems,
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
      const node = sidebarNodeById.get(nodeId)
      return Boolean(node?.videoId)
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
      )
      if (checkedVideoIds.length === 0) {
        return
      }
      setPlaylistIds((previous) => {
        const next = new Set(previous)
        for (const videoId of checkedVideoIds) {
          next.add(videoId)
        }
        return Array.from(next)
      })
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
    videoSourceUrl: focusedVideoSrc,
    subtitleTrackUrl,
    subtitleVisible,
    subtitleLoading,
    subtitleMessage,
    subtitleOptions,
    selectedSubtitleId,
    setSubtitleVisible,
    selectSubtitleById,
    fullscreenActive,
    active: !fullscreenActive,
    coverColor: focusedVideoCoverColor,
    coverImageUrl: focusedVideoCoverImageSrc,
    focusedVideoId: focusedVideoEffective?.id ?? null,
    focusedVideo: focusedVideoEffective,
    setVideoPlaying,
    canJumpToManga: Boolean(jumpTargetImage),
    canJumpToMusic: Boolean(jumpTargetAudioFromVideo),
    onJumpToManga: jumpToManga,
    onJumpToMusic: jumpVideoToMusic,
    goPlaylist,
    setVideoTime,
    setVideoDurationById,
    setVideoMuted,
    setVideoVolume,
    setVideoRate,
    setVideoFitMode,
    cycleVideoFitMode,
    saveVideoCover: backendWrite.saveVideoCover,
    setFullscreenActiveWithAutoStop,
    metadataPending: metadataWriteBindings.metadataPending,
    onMetadataSyncName: applyMetadataSyncName,
  });

  const musicMainSectionProps = buildMusicMainSectionProps({
    mode,
    fullscreenActive,
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
    canJumpToBooklet: Boolean(openMusicBookletSourceId),
    onJumpToManga: jumpMusicToManga,
    onJumpToAnimation: jumpMusicToAnimation,
    onJumpToBooklet: jumpMusicToBooklet,
    audiosForSidebar,
    audioSidebarOrderedIds,
    focusedAudio,
    focusedAudioSrc,
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

  const applyMetadataFeatureSearch = (patch: {
    workTitle?: string;
    circle?: string;
    author?: string;
    tag?: string;
  }) => {
    applyQuickFeatureSearch(patch);
  };

  const metadataPanelProps = buildMetadataPanelProps({
    mode,
    manageMode,
    searchModeActive: vectorMode && !manageMode && !metadataManageMode,
    featureResultCount:
      mode === "video"
        ? videosForSidebarCount
        : mode === "music"
          ? audiosForSidebarCount
          : scopedImageSourcesEffective.length,
    featureNameQuery,
    onFeatureNameQueryChange: setFeatureNameQuery,
    featureWorkTitleQuery,
    onFeatureWorkTitleQueryChange: setFeatureWorkTitleQuery,
    featureCircleQuery,
    onFeatureCircleQueryChange: setFeatureCircleQuery,
    featureAuthorQuery,
    onFeatureAuthorQueryChange: setFeatureAuthorQuery,
    featureCircleOptions,
    featureAuthorOptions,
    featureTagOptions: featureTagOptionsEffective,
    featureTagPickerOpen,
    onToggleFeatureTagPicker: () => setFeatureTagPickerOpen((value) => !value),
    featureTags,
    onSetFeatureTags: (tags) => {
      const normalized = Array.from(
        new Set(tags.map((tag) => tag.trim()).filter(Boolean)),
      );
      setFeatureTags(normalized);
    },
    onClearFeatureTags: () => setFeatureTags([]),
    featureGradeFilter,
    onFeatureGradeFilterChange: setFeatureGradeFilter,
    adReviewFeatureVisible: appSettings.adReviewVisionVerified,
    adReviewPanelOpen,
    canExecuteAdReview:
      (activeSelectionScope === "sidebar" &&
        sidebarCheckedNodeIds.length > 0) ||
      imageCheckedIds.length > 0,
    adReviewPending: manageAdReview.pending,
    adReviewDeletePending: manageAdReview.deletePending,
    adReviewTask: manageAdReview.task,
    adReviewQueueTasks: manageAdReview.queueTasks,
    adReviewActiveTaskId: manageAdReview.activeTaskId,
    adReviewHideUncheckedNonChecked: manageAdReview.hideUncheckedNonChecked,
    hasCheckedAdReviewCandidates: manageAdReview.hasCheckedCandidateSelection,
    selectedAdReviewCandidateCount: manageAdReview.selectedCandidateCount,
    adReviewFocusTaskId,
    adReviewStrategyMode: appSettings.adReviewStrategyMode,
    adReviewMaxConcurrency: appSettings.adReviewMaxConcurrency,
    adReviewHeadN: appSettings.adReviewHeadN,
    adReviewTailN: appSettings.adReviewTailN,
    adReviewTailStopCleanStreak: appSettings.adReviewTailStopCleanStreak,
    onStartAdReview: async (options) => {
      const startedTask = await manageAdReview.startManageAdReview(options);
      if (!startedTask) {
        return;
      }
      setAdReviewFocusTaskId(startedTask.task_id);
      setAdReviewPageIndex(0);
    },
    onPauseAdReview: () => {
      void manageAdReview.pauseManageAdReview();
    },
    onToggleHideUncheckedNonChecked:
      manageAdReview.toggleHideUncheckedNonChecked,
    onSelectAdReviewTask: (taskId) => {
      manageAdReview.selectTask(taskId);
      setAdReviewPageIndex(0);
    },
    onRemoveAdReviewTask: (taskId) => {
      void manageAdReview.removeTask(taskId);
    },
    onDeleteSelectedAdReviewCandidates: () => {
      void manageAdReview.confirmDeleteSelectedCandidates();
    },
    onToggleAdReviewFocus: () => {
      if (manageAdReview.deletePending) {
        return;
      }
      const currentTask = manageAdReview.task;
      if (!currentTask) {
        setAdReviewFocusTaskId(null);
        return;
      }

      const canFocusStatus =
        currentTask.status === "running" ||
        currentTask.status === "paused" ||
        currentTask.status === "review";
      if (!canFocusStatus || currentTask.candidates.length === 0) {
        setAdReviewFocusTaskId(null);
        setAdReviewPageIndex(0);
        return;
      }

      setAdReviewFocusTaskId((previous) => {
        setAdReviewPageIndex(0);
        return previous === currentTask.task_id ? null : currentTask.task_id;
      });
    },
    ...createAdReviewSettingHandlers({
      updateSettings: appSettings.updateSettings,
    }),
    onDismissAdReviewTask: manageAdReview.dismissTask,
    metadataCollapsed: appSettings.metadataCollapsed,
    metadataRatio: appSettings.metadataRatio,
    hasImageFocus: imageFocusActive,
    focusedImage: metadataImageEffective,
    focusedImageSrc: metadataImageSrc,
    focusedImagePackage: metadataImagePackageEffective,
    currentGrade: currentGradeEffective,
    currentVideoGrade: focusedVideoEffective?.grade ?? null,
    metadataPending: metadataWriteBindings.metadataPending,
    editable: metadataManageMode,
    focusedVideo: focusedVideoEffective,
    focusedAudio,
    audioPlaylistIds: metadataMusicPlaylistIds,
    selectedAudioId,
    audioById: audioByIdEffective,
    musicBookletAlbumRootPath: musicBookletState.albumRootPath,
    musicBookletCandidates: musicBookletState.candidates.map((candidate) => ({
      sourceId: candidate.sourceId,
      label: candidate.label,
      imageCount: candidate.imageCount,
    })),
    musicCoverBindingValue: musicBookletState.coverBindingValue,
    musicBookletBindingValue: musicBookletState.bookletBindingValue,
    canOpenMusicCover: Boolean(openMusicCoverSourceId),
    canOpenMusicBooklet: Boolean(openMusicBookletSourceId),
    metadataTab,
    playlistIds,
    selectedVideoId,
    dragVideoId,
    videoById: videoByIdEffective,
    updateSettings: appSettings.updateSettings,
    onGradeChange: metadataWriteBindings.applyPackageGrade,
    onSavePackageMetadata: metadataWriteBindings.applyPackageMetadata,
    onSavePackageParsedMetadata: saveParsedMetadata,
    onSaveVideoMetadata: metadataWriteBindings.applyVideoMetadata,
    onSaveAudioMetadata: metadataWriteBindings.applyAudioMetadata,
    onSearchByWorkTitle: (value) => {
      applyMetadataFeatureSearch({ workTitle: value });
    },
    onSearchByCircle: (value) => {
      applyMetadataFeatureSearch({ circle: value });
    },
    onSearchByAuthor: (value) => {
      applyMetadataFeatureSearch({ author: value });
    },
    onSearchByTag: (value) => {
      applyMetadataFeatureSearch({ tag: value });
    },
    onMetadataTabChange: setMetadataTab,
    onSelectVideo: selectVideoFromBrowser,
    onSelectAudio: (audioId) => {
      setSelectedAudioId(audioId);
      appSettings.updateSettings({ sidebarFocus: "main" });
    },
    onSelectAudioAndPlay: (audioId) => {
      setSelectedAudioId(audioId);
      requestMusicPlay();
      appSettings.updateSettings({ sidebarFocus: "main" });
    },
    onMusicCoverBindingChange: updateMusicCoverBinding,
    onMusicBookletBindingChange: updateMusicBookletBinding,
    onOpenMusicCover: jumpMusicToCover,
    onOpenMusicBooklet: jumpMusicToBooklet,
    onResetMusicBookletBinding: () => {
      if (!musicBookletState.albumRootPath) {
        return;
      }
      musicBookletBindings.resetBindingOverride(
        musicBookletState.albumRootPath,
      );
    },
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
    normalizedPageIndex: normalizedPageIndexForMain,
    imageTotalPages: imageTotalPagesForMain,
    onPrevPage: onPrevPageForMain,
    onNextPage: onNextPageForMain,
  });

  return {
    sidebarPanelProps,
    searchPanelProps,
    managementPanelProps,
    imageMainSectionProps,
    videoMainSectionProps,
    musicMainSectionProps,
    metadataPanelProps,
    mainFooter,
  };
}

export type AppWorkspacePropsResult = ReturnType<typeof useAppWorkspaceProps>;
