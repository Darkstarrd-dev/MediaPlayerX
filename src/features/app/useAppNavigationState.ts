import { useCallback, useEffect, useMemo, useRef } from "react";

import type { AppSettingsStoreSnapshot } from "./useAppSettingsStore";
import type { AppSessionStateResult } from "./useAppSessionState";
import type { RepositoryBootstrapDataResult } from "./useRepositoryBootstrapData";
import type { ArchiveLoadStatusResult } from "./useArchiveLoadStatus";
import type { MediaStateResult } from "../media/useMediaState";
import type { AppReadStateResult } from "./useAppReadState";
import { useAppSidebarScopeState } from "./useAppSidebarScopeState";
import { usePaneResizers } from "../layout/usePaneResizers";
import {
  computeThumbnailGridLayout,
  resolveThumbnailCardChromePx,
} from "../layout/thumbnailLayout";
import {
  resolveSnapTargetColumns,
  type GridSnapAnchor,
} from "../layout/thumbnailHorizontalSnap";
import { useImageBrowserViewModel } from "./useImageBrowserViewModel";

const SIDEBAR_COLLAPSE_RATIO = 0.03;
const GAP_SNAP_MIN_PX = 4;
const GAP_SNAP_SETTLE_MS = 72;
const GAP_SNAP_MANUAL_MS = 36;
// 右避让（扩展 +1 列）时的精度补偿：ratio→pixel 换算经过浮点除法、
// CSS flexbox 舍入、gridSize Math.floor 三层丢失，总计 1-3px；
// 补偿不足会导致 pickClosestCols 判定 cols+1 溢出而保留原列数。
const GAP_SNAP_EXPAND_BUFFER_PX = 2;
// snap 执行后的冷却窗口：覆盖 CSS re-layout 多帧 settling，
// 防止精度偏差导致 snap 方向反转形成不收敛振荡。
const GAP_SNAP_COOLDOWN_MS = 250;

interface UseAppNavigationStateParams {
  appSettings: AppSettingsStoreSnapshot;
  sessionState: AppSessionStateResult;
  repositoryBootstrap: RepositoryBootstrapDataResult;
  archiveLoadStatus: ArchiveLoadStatusResult;
  mediaState: Pick<
    MediaStateResult,
    | "selectVideoFromBrowser"
    | "fullscreenActive"
    | "fullscreenDisplay"
    | "fullscreenVideoFocus"
  >;
  readState: AppReadStateResult;
}

export function useAppNavigationState({
  appSettings,
  sessionState,
  repositoryBootstrap,
  archiveLoadStatus,
  mediaState,
  readState,
}: UseAppNavigationStateParams) {
  const {
    mode,
    sidebarRatio,
    sidebarMinWidth,
    metadataCollapsed,
    metadataRatio,
    workspaceBottomPanelHeight,
    layoutLocked,
    thumbnailScale,
    thumbnailGap,
    thumbnailWidth,
    showNamesOnly,
    imageRootNodeId,
    videoRootNodeId,
    musicRootNodeId,
    updateSettings,
  } = appSettings;

  const {
    bootstrapLibrarySnapshot,
    bootstrapImagePackages,
    bootstrapImageDirectories,
    bootstrapVideos,
    bootstrapAudios,
  } = repositoryBootstrap;

  const {
    selectedPackageId,
    setSelectedPackageId,
    selectedSidebarNodeId,
    setSelectedSidebarNodeId,
    selectedAudioId,
    setSelectedAudioId,
    audioPlaylistIds,
    setAudioPlaylistIds,
    imageFocusActive,
    setImageFocusActive,
    focusByPackage,
    setFocusByPackage,
    pageByPackage,
    setPageByPackage,
    vectorSearchResults,
    vectorFocusIndex,
    setVectorFocusIndex,
    vectorPage,
    setVectorPage,
    gradeByPackage,
    setGradeByPackage,
    appBodyRef,
    workspaceRef,
    workspaceBodyRef,
    lastExpandedSidebarRatioRef,
    appBodyWidth,
    gridSize,
  } = sessionState;

  const {
    selectVideoFromBrowser,
    fullscreenActive,
    fullscreenDisplay,
    fullscreenVideoFocus,
  } = mediaState;

  const {
    backendRead,
    searchPanelCollapsed,
    featureSearchActive,
    featureNameQueryEffective,
    featureWorkTitleQueryEffective,
    featureSeriesIdQueryEffective,
    featureCircleQueryEffective,
    featureAuthorQueryEffective,
    featureTagsEffective,
    featureGradeFilterEffective,
    vectorResultsActive,
  } = readState;

  const {
    scopedImageSourcesEffective,
    packageByIdEffective,
    videoByIdEffective,
    audioByIdEffective,
    imageTreeForSidebar,
    imageNodeLoadStateById,
    videosForSidebar,
    videoTreeForSidebar,
    audiosForSidebar,
    audioTreeForSidebar,
    rootScopedVideoIds,
    rootScopedAudioIds,
    rootScopedPackageIds,
    allScopedRefs,
    normalImageSourceNodeIdMap,
    vectorSidebarNodes,
    vectorResultPackageNodeIdMap,
    flatSidebarNodes,
    sidebarNodeById,
    imageSourceNodeIdMap,
    videoNodeIdMap,
    audioNodeIdMap,
    canSetCurrentRoot,
    currentRootLabel,
    applyCurrentRootFromSelection,
    ensureSidebarNodeVisible,
    handleSidebarNavigationKey,
    sidebarCheckedNodeIds,
    sidebarCheckedNodeIdSet,
    imageCheckedIds,
    imageCheckedIdSet,
    activeSelectionScope,
    clearSidebarSelections,
    clearAllSelections,
    toggleSidebarNodeChecked,
    checkSidebarNode,
    toggleImageChecked,
    replaceImageCheckedIds,
    orderedRootScopedPackages,
    orderedRootScopedImageRefs,
  } = useAppSidebarScopeState({
    backendRead,
    mode,
    fullscreenActive,
    fullscreenDisplay,
    bootstrapLibrarySnapshot,
    bootstrapImagePackages,
    bootstrapImageDirectories,
    bootstrapVideos,
    bootstrapAudios,
    vectorSearchResults,
    vectorResultsActive,
    featureSearchActive,
    featureNameQuery: featureNameQueryEffective,
    featureWorkTitleQuery: featureWorkTitleQueryEffective,
    featureSeriesIdQuery: featureSeriesIdQueryEffective,
    featureCircleQuery: featureCircleQueryEffective,
    featureAuthorQuery: featureAuthorQueryEffective,
    featureTags: featureTagsEffective,
    featureGradeFilter: featureGradeFilterEffective,
    archiveLoadStatus,
    imageRootNodeId,
    videoRootNodeId,
    musicRootNodeId,
    selectedSidebarNodeId,
    appBodyRef,
    setSelectedSidebarNodeId,
    setSelectedPackageId,
    selectVideoFromBrowser,
    setSelectedAudioId,
    setAudioPlaylistIds,
    setFocusByPackage,
    setPageByPackage,
    setGradeByPackage,
    updateSettings,
  });

  const collapseSidebar = useCallback(() => {
    updateSettings({ sidebarRatio: 0, sidebarFocus: "main" });
  }, [updateSettings]);

  const {
    sidebarCollapsed,
    normalizeSidebarRatio,
    applySidebarRatio,
    applyMetadataRatio,
    horizontalResizing,
    horizontalResizeCommitCount,
    horizontalResizeCommitContext,
    horizontalResizeLiveContext,
    onStartSidebarResize,
    onStartMetadataResize,
    onStartWorkspaceBottomPanelResize,
    onExpandSidebar,
  } = usePaneResizers({
    appBodyRef,
    workspaceRef,
    workspaceBodyRef,
    appBodyWidth,
    sidebarRatio,
    sidebarMinWidth,
    metadataRatio,
    workspaceBottomPanelHeight,
    layoutLocked,
    searchPanelCollapsed,
    sidebarCollapseRatio: SIDEBAR_COLLAPSE_RATIO,
    lastExpandedSidebarRatioRef,
    onSetSidebarRatio: (value) => updateSettings({ sidebarRatio: value }),
    onSetMetadataRatio: (value) => updateSettings({ metadataRatio: value }),
    onSetWorkspaceBottomPanelHeight: (value) =>
      updateSettings({ workspaceBottomPanelHeight: value }),
  });

  // 简化条件：仅在 image 模式 + 非锁定布局时执行 gap snap
  const canGapSnap = mode === "image" && !layoutLocked;

  const thumbnailLayout = useMemo(
    () =>
      computeThumbnailGridLayout({
        gridWidth: gridSize.width,
        gridHeight: gridSize.height,
        thumbnailWidth,
        thumbnailGap,
        zoomLevel: thumbnailScale,
        cardChrome: resolveThumbnailCardChromePx(),
      }),
    [
      thumbnailScale,
      gridSize.height,
      gridSize.width,
      thumbnailGap,
      thumbnailWidth,
    ],
  );
  const normalizedThumbnailScale = thumbnailLayout.zoomLevel;
  const thumbnailScaleLevelCount = thumbnailLayout.zoomLevelCount;
  const displayThumbnailScaleLevel =
    thumbnailScaleLevelCount - normalizedThumbnailScale + 1;
  const canThumbnailScaleDown =
    normalizedThumbnailScale < thumbnailScaleLevelCount;
  const canThumbnailScaleUp = normalizedThumbnailScale > 1;
  const thumbnailColumns = thumbnailLayout.columns;
  const actualCellWidth = thumbnailLayout.cellWidth;
  const actualMediaHeight = thumbnailLayout.mediaHeight;
  const pagedPageSize = thumbnailLayout.pageSize;
  const actualThumbnailGap = thumbnailLayout.gap;

  const horizontalResizeAnchorRef = useRef<GridSnapAnchor | null>(null);
  const previousHorizontalResizingRef = useRef(false);
  const previousGridSizeRef = useRef(gridSize);
  const lastHandledCommitCountRef = useRef(0);
  const lastResizeSourceRef = useRef<"sidebar" | "metadata">("sidebar");
  const gapSnapTimeoutRef = useRef<number | null>(null);
  const lastSnapTimeRef = useRef(0);
  // snap 后记录期望目标宽度，在宽度未显著偏离目标前拒绝再次 snap，防止振荡
  const snapTargetWidthRef = useRef(0);
  const initialSnapDoneRef = useRef(false);
  const previousAppBodyWidthRef = useRef(appBodyWidth);

  // 统一 gap snap 回调：吸附分割条到网格线消除右侧留白
  const applyGapSnap = useCallback(() => {
    if (gridSize.width <= 1 || gridSize.height <= 1) return;

    // 时间窗口冷却：覆盖 snap 引发的多帧 CSS re-layout
    if (performance.now() - lastSnapTimeRef.current < GAP_SNAP_COOLDOWN_MS)
      return;

    // 反振荡守卫：grid 宽度未显著偏离上次 snap 目标时，
    // 残余空隙为 ratio→pixel 精度误差，接受不再 snap
    if (snapTargetWidthRef.current > 0) {
      const drift = Math.abs(gridSize.width - snapTargetWidthRef.current);
      const threshold = Math.max(
        GAP_SNAP_MIN_PX * 2,
        thumbnailLayout.cellWidth / 3,
      );
      if (drift < threshold) return;
    }

    const rightGap = gridSize.width - thumbnailLayout.idealGridWidth;
    if (rightGap < GAP_SNAP_MIN_PX || thumbnailLayout.cellWidth <= 0) return;

    const halfCell = thumbnailLayout.cellWidth * 0.5;
    const cellSpan = thumbnailLayout.cellWidth + thumbnailLayout.gap;

    // 计算 main 区域需要的宽度增量（正=扩展，负=收缩）
    const mainDelta =
      rightGap <= halfCell
        ? -rightGap // 左吸附：收缩 main 消除空隙
        : cellSpan - rightGap + GAP_SNAP_EXPAND_BUFFER_PX; // 右避让：扩展 main 容纳 +1 列（含精度补偿）

    if (Math.abs(mainDelta) < GAP_SNAP_MIN_PX) return;

    lastSnapTimeRef.current = performance.now();
    snapTargetWidthRef.current = gridSize.width + mainDelta;

    // 选择要偏移的分割条：优先最近交互侧，带 fallback 链
    const preferSource = lastResizeSourceRef.current;

    // metadata 分支：检查 clamp [0.2, 0.45] 是否截断，不足时 fallback 到 sidebar
    if (preferSource === "metadata" && !metadataCollapsed) {
      const bodyWidth =
        workspaceBodyRef.current?.getBoundingClientRect().width;
      if (bodyWidth && bodyWidth > 1) {
        const targetRatio = metadataRatio - mainDelta / bodyWidth;
        const clamped = Math.max(0.2, Math.min(0.45, targetRatio));
        const actualDelta = (metadataRatio - clamped) * bodyWidth;
        if (Math.abs(actualDelta - mainDelta) < GAP_SNAP_MIN_PX) {
          // clamp 后差距足够小，直接应用
          applyMetadataRatio(targetRatio);
          return;
        }
        // clamp 截断了，先应用 metadata 能吸收的部分，剩余交给 sidebar
        applyMetadataRatio(targetRatio);
        const remainDelta = mainDelta - actualDelta;
        if (
          Math.abs(remainDelta) >= GAP_SNAP_MIN_PX &&
          !sidebarCollapsed
        ) {
          const sbBodyWidth =
            appBodyRef.current?.getBoundingClientRect().width ?? appBodyWidth;
          const factor = Math.max(0.05, 1 - clamped);
          if (sbBodyWidth > 1 && factor > 0) {
            applySidebarRatio(
              sidebarRatio - remainDelta / (sbBodyWidth * factor),
            );
          }
        }
        return;
      }
    }

    // sidebar 分支
    if (!sidebarCollapsed) {
      const bodyWidth =
        appBodyRef.current?.getBoundingClientRect().width ?? appBodyWidth;
      const workspaceMainFactor = metadataCollapsed
        ? 1
        : Math.max(0.05, 1 - metadataRatio);
      if (bodyWidth > 1 && workspaceMainFactor > 0) {
        applySidebarRatio(
          sidebarRatio - mainDelta / (bodyWidth * workspaceMainFactor),
        );
      }
    } else if (!metadataCollapsed) {
      // sidebar 折叠时 fallback 到 metadata
      const bodyWidth =
        workspaceBodyRef.current?.getBoundingClientRect().width;
      if (bodyWidth && bodyWidth > 1) {
        applyMetadataRatio(metadataRatio - mainDelta / bodyWidth);
      }
    }
  }, [
    appBodyRef,
    appBodyWidth,
    applyMetadataRatio,
    applySidebarRatio,
    gridSize.height,
    gridSize.width,
    metadataCollapsed,
    metadataRatio,
    sidebarCollapsed,
    sidebarRatio,
    thumbnailLayout.cellWidth,
    thumbnailLayout.gap,
    thumbnailLayout.idealGridWidth,
    workspaceBodyRef,
  ]);

  const queueGapSnap = useCallback(
    (delayMs: number) => {
      if (!canGapSnap) return;
      if (gapSnapTimeoutRef.current !== null) {
        window.clearTimeout(gapSnapTimeoutRef.current);
      }
      gapSnapTimeoutRef.current = window.setTimeout(() => {
        gapSnapTimeoutRef.current = null;
        applyGapSnap();
      }, delayMs);
    },
    [applyGapSnap, canGapSnap],
  );

  // 清理 timeout
  useEffect(() => {
    return () => {
      if (gapSnapTimeoutRef.current !== null) {
        window.clearTimeout(gapSnapTimeoutRef.current);
      }
    };
  }, []);

  // canGapSnap 关闭时重置所有 snap 状态
  useEffect(() => {
    if (!canGapSnap) {
      if (gapSnapTimeoutRef.current !== null) {
        window.clearTimeout(gapSnapTimeoutRef.current);
        gapSnapTimeoutRef.current = null;
      }
      lastSnapTimeRef.current = 0;
      snapTargetWidthRef.current = 0;
      initialSnapDoneRef.current = false;
    }
  }, [canGapSnap]);

  // Effect 0: 初始挂载 / image 模式激活后首次 gap snap
  useEffect(() => {
    if (initialSnapDoneRef.current) return;
    if (!canGapSnap) return;
    if (gridSize.width <= 1 || gridSize.height <= 1) return;
    initialSnapDoneRef.current = true;
    lastSnapTimeRef.current = 0;
    snapTargetWidthRef.current = 0;
    queueGapSnap(GAP_SNAP_SETTLE_MS);
  }, [canGapSnap, gridSize.width, gridSize.height, queueGapSnap]);

  // Effect 1: 分割条 commit 后 gap snap
  useEffect(() => {
    if (!canGapSnap) return;
    if (horizontalResizeCommitCount <= lastHandledCommitCountRef.current)
      return;
    lastHandledCommitCountRef.current = horizontalResizeCommitCount;
    lastSnapTimeRef.current = 0; // 用户动作：清除冷却
    snapTargetWidthRef.current = 0; // 用户动作：清除目标锁定
    queueGapSnap(GAP_SNAP_SETTLE_MS);
  }, [canGapSnap, horizontalResizeCommitCount, queueGapSnap]);

  // Effect 2: 容器尺寸变化（非拖拽）后 gap snap
  useEffect(() => {
    const prev = previousGridSizeRef.current;
    if (
      Math.abs(prev.width - gridSize.width) < 2 &&
      Math.abs(prev.height - gridSize.height) < 2
    )
      return;
    previousGridSizeRef.current = gridSize;
    if (!canGapSnap || horizontalResizing) return;
    // snap 引发的容器 settling：不再触发二次 snap，防止反复调整分割条导致振荡
    if (snapTargetWidthRef.current > 0) return;
    queueGapSnap(GAP_SNAP_SETTLE_MS);
  }, [canGapSnap, gridSize, horizontalResizing, queueGapSnap]);

  // Effect 2b: 窗口宽度变化时清除 snap 锁定并重新 snap
  // appBodyWidth 仅在 Electron/浏览器窗口缩放时变化，不受分割条调整影响
  useEffect(() => {
    if (Math.abs(previousAppBodyWidthRef.current - appBodyWidth) < 2) return;
    previousAppBodyWidthRef.current = appBodyWidth;
    if (!canGapSnap) return;
    lastSnapTimeRef.current = 0;
    snapTargetWidthRef.current = 0;
    queueGapSnap(GAP_SNAP_SETTLE_MS);
  }, [appBodyWidth, canGapSnap, queueGapSnap]);

  // Effect 3: 缩放级别变化后 gap snap
  const previousScaleRef = useRef(thumbnailScale);
  useEffect(() => {
    if (previousScaleRef.current === thumbnailScale) return;
    previousScaleRef.current = thumbnailScale;
    if (!canGapSnap) return;
    lastResizeSourceRef.current = "sidebar"; // scale 变更默认调 sidebar
    lastSnapTimeRef.current = 0; // 用户动作：清除冷却
    snapTargetWidthRef.current = 0; // 用户动作：清除目标锁定
    queueGapSnap(GAP_SNAP_MANUAL_MS);
  }, [canGapSnap, thumbnailScale, queueGapSnap]);

  // live resize 期间的列吸附锚点管理
  useEffect(() => {
    if (horizontalResizing && !previousHorizontalResizingRef.current) {
      horizontalResizeAnchorRef.current = {
        columns: thumbnailLayout.columns,
        cellWidth: thumbnailLayout.cellWidth,
        gap: thumbnailLayout.gap,
      };
    }

    if (!horizontalResizing && previousHorizontalResizingRef.current) {
      horizontalResizeAnchorRef.current = null;
    }

    previousHorizontalResizingRef.current = horizontalResizing;
  }, [
    horizontalResizing,
    thumbnailLayout.cellWidth,
    thumbnailLayout.columns,
    thumbnailLayout.gap,
  ]);

  // 跟踪最近交互的分割条
  useEffect(() => {
    if (!horizontalResizeLiveContext) return;
    lastResizeSourceRef.current = horizontalResizeLiveContext.source;
  }, [horizontalResizeLiveContext]);

  useEffect(() => {
    if (!horizontalResizeCommitContext) return;
    lastResizeSourceRef.current = horizontalResizeCommitContext.source;
  }, [horizontalResizeCommitContext]);

  const resolveResizeTargetColumns = useCallback((): number | null => {
    if (!horizontalResizing) return null;

    const anchor = horizontalResizeAnchorRef.current;
    if (!anchor || anchor.columns <= 0 || anchor.cellWidth <= 0) return null;

    const live = horizontalResizeLiveContext;
    if (!live) return null;

    return resolveSnapTargetColumns({
      anchor,
      commit: {
        source: live.source,
        deltaX: live.deltaX,
        commitId: live.tickId,
      },
    });
  }, [horizontalResizeLiveContext, horizontalResizing]);

  // live resize 期间不需要 resolveResizeTargetColumns 驱动 —— columns 由 useMemo 自动重算
  // 保留 resolveResizeTargetColumns 用于 anchor 列吸附参考（可在后续精化中使用）
  void resolveResizeTargetColumns;

  const {
    activePackage,
    focusedRef,
    focusedImage,
    focusedImagePackage,
    metadataImagePackage,
    currentGrade,
    visibleImageRefs,
    imageTotalPages,
    normalizedPageIndex,
    pageStart,
    refsInPage,
    setImageFocus,
    moveImage,
    moveImageVertical,
    jumpImageBoundary,
    goPackage,
    goPrevPage,
    goNextPage,
  } = useImageBrowserViewModel({
    mode,
    selectedPackageId,
    setSelectedPackageId,
    imageFocusActive,
    setImageFocusActive,
    focusByPackage,
    setFocusByPackage,
    pageByPackage,
    setPageByPackage,
    vectorSearchResults,
    vectorFocusIndex,
    setVectorFocusIndex,
    vectorPage,
    setVectorPage,
    gradeByPackage,
    setGradeByPackage,
    packageById: packageByIdEffective,
    orderedRootScopedPackages,
    orderedRootScopedImageRefs,
    vectorResultsActive,
    showNamesOnly,
    thumbnailColumns,
    pagedPageSize,
    fullscreenActive,
    fullscreenDisplay,
    fullscreenVideoFocus,
  });

  return {
    scopedImageSourcesEffective,
    packageByIdEffective,
    videoByIdEffective,
    audioByIdEffective,
    imageTreeForSidebar,
    imageNodeLoadStateById,
    videosForSidebar,
    videoTreeForSidebar,
    audiosForSidebar,
    audioTreeForSidebar,
    rootScopedVideoIds,
    rootScopedAudioIds,
    rootScopedPackageIds,
    allScopedRefs,
    normalImageSourceNodeIdMap,
    vectorSidebarNodes,
    vectorResultPackageNodeIdMap,
    flatSidebarNodes,
    sidebarNodeById,
    imageSourceNodeIdMap,
    videoNodeIdMap,
    audioNodeIdMap,
    canSetCurrentRoot,
    currentRootLabel,
    applyCurrentRootFromSelection,
    ensureSidebarNodeVisible,
    handleSidebarNavigationKey,
    sidebarCheckedNodeIds,
    sidebarCheckedNodeIdSet,
    imageCheckedIds,
    imageCheckedIdSet,
    activeSelectionScope,
    clearSidebarSelections,
    clearAllSelections,
    toggleSidebarNodeChecked,
    checkSidebarNode,
    toggleImageChecked,
    replaceImageCheckedIds,
    orderedRootScopedPackages,
    orderedRootScopedImageRefs,
    selectedAudioId,
    setSelectedAudioId,
    audioPlaylistIds,
    setAudioPlaylistIds,
    collapseSidebar,
    sidebarCollapsed,
    normalizeSidebarRatio,
    applySidebarRatio,
    applyMetadataRatio,
    horizontalResizeCommitCount,
    onStartSidebarResize,
    onStartMetadataResize,
    onStartWorkspaceBottomPanelResize,
    onExpandSidebar,
    normalizedThumbnailScale,
    thumbnailScaleLevelCount,
    displayThumbnailScaleLevel,
    canThumbnailScaleDown,
    canThumbnailScaleUp,
    thumbnailColumns,
    actualCellWidth,
    actualMediaHeight,
    pagedPageSize,
    actualThumbnailGap,
    activePackage,
    focusedRef,
    focusedImage,
    focusedImagePackage,
    metadataImagePackage,
    currentGrade,
    visibleImageRefs,
    imageTotalPages,
    normalizedPageIndex,
    pageStart,
    refsInPage,
    setImageFocus,
    moveImage,
    moveImageVertical,
    jumpImageBoundary,
    goPackage,
    goPrevPage,
    goNextPage,
  };
}
