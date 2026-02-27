import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
import { clamp } from "../../utils/ui";
import { resolveMetadataMainDelta } from "../layout/thumbnailGapPolicy";

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
const METADATA_RATIO_MIN = 0.2;
const METADATA_RATIO_MAX = 0.45;
const METADATA_PANEL_MIN_WIDTH_PX = 180;
const DUAL_COLLAPSED_INSET_MAX_RATIO = 0.6;

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

  const selectedSidebarNode = selectedSidebarNodeId
    ? (sidebarNodeById.get(selectedSidebarNodeId) ?? null)
    : null;
  const videoNodeBrowseSnapActive =
    mode === "video" &&
    Boolean(
      selectedSidebarNode &&
        selectedSidebarNode.kind === "folder" &&
        selectedSidebarNode.children.some((child) => Boolean(child.videoId)),
    );

  // image 模式和 video 节点缩略图模式都允许 gap snap
  const canGapSnap = !layoutLocked && (mode === "image" || videoNodeBrowseSnapActive);

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
  const [layoutConvergedInsetPx, setLayoutConvergedInsetPx] = useState(0);
  const gapSnapTimeoutRef = useRef<number | null>(null);
  const lastSnapTimeRef = useRef(0);
  // snap 后记录期望目标宽度，在宽度未显著偏离目标前拒绝再次 snap，防止振荡
  const snapTargetWidthRef = useRef(0);
  const initialSnapDoneRef = useRef(false);
  const previousAppBodyWidthRef = useRef(appBodyWidth);
  const previousPanelCollapseStateRef = useRef<{
    sidebarCollapsed: boolean;
    metadataCollapsed: boolean;
  } | null>(null);

  // 统一 gap snap 回调：吸附分割条到网格线消除右侧留白
  const applyGapSnap = useCallback(() => {
    if (gridSize.width <= 1 || gridSize.height <= 1) return;

    // 反振荡守卫：grid 宽度未显著偏离上次 snap 目标时，
    // 残余空隙为 ratio→pixel 精度误差，接受不再 snap
    const rightGap = gridSize.width - thumbnailLayout.idealGridWidth;
    if (snapTargetWidthRef.current > 0) {
      const drift = Math.abs(gridSize.width - snapTargetWidthRef.current);
      const settleThreshold = Math.max(
        GAP_SNAP_MIN_PX * 2,
        Math.min(thumbnailLayout.cellWidth * 0.18, 24),
      );
      const gapRecheckThreshold = Math.max(
        GAP_SNAP_MIN_PX * 2,
        thumbnailLayout.cellWidth * 0.35,
      );
      if (drift < settleThreshold && Math.abs(rightGap) < gapRecheckThreshold) {
        return;
      }
    }

    // 时间窗口冷却：覆盖 snap 引发的多帧 CSS re-layout。
    // 若出现显著空隙则允许突破冷却，避免遗漏用户触发的结构变化。
    if (
      performance.now() - lastSnapTimeRef.current < GAP_SNAP_COOLDOWN_MS &&
      Math.abs(rightGap) <
        Math.max(GAP_SNAP_MIN_PX * 2, thumbnailLayout.cellWidth * 0.4)
    ) {
      return;
    }

    if (thumbnailLayout.cellWidth <= 0) return;

    const halfCell = thumbnailLayout.cellWidth * 0.5;
    const cellSpan = thumbnailLayout.cellWidth + thumbnailLayout.gap;
    const cardChrome = Math.max(
      0,
      thumbnailLayout.cellWidth - thumbnailLayout.mediaHeight,
    );
    const resolveMainDeltaByGap = (gap: number) =>
      gap <= halfCell ? -gap : cellSpan - gap + GAP_SNAP_EXPAND_BUFFER_PX;
    const markSnapApplied = (actualMainDelta: number) => {
      if (Math.abs(actualMainDelta) < GAP_SNAP_MIN_PX) {
        return false;
      }
      lastSnapTimeRef.current = performance.now();
      snapTargetWidthRef.current = gridSize.width + actualMainDelta;
      return true;
    };

    if (sidebarCollapsed && metadataCollapsed) {
      if (Math.abs(rightGap) < GAP_SNAP_MIN_PX) {
        snapTargetWidthRef.current = 0;
        return;
      }

      let desiredMainDelta =
        rightGap > 0 ? resolveMainDeltaByGap(rightGap) : -rightGap;
      if (desiredMainDelta > 0 && layoutConvergedInsetPx <= GAP_SNAP_MIN_PX) {
        desiredMainDelta = -Math.max(0, rightGap);
      }

      const measuredAppWidth =
        appBodyRef.current?.getBoundingClientRect().width ?? appBodyWidth;
      const baseWidth =
        measuredAppWidth > 1 ? measuredAppWidth + layoutConvergedInsetPx : 0;
      const maxInsetPx = Math.max(
        0,
        Math.floor(
          (baseWidth > 1 ? baseWidth : gridSize.width) *
            DUAL_COLLAPSED_INSET_MAX_RATIO,
        ),
      );
      const nextInsetPx = clamp(
        Math.round(layoutConvergedInsetPx - desiredMainDelta),
        0,
        maxInsetPx,
      );
      const actualMainDelta = layoutConvergedInsetPx - nextInsetPx;
      if (Math.abs(actualMainDelta) < GAP_SNAP_MIN_PX) {
        snapTargetWidthRef.current = 0;
        return;
      }

      setLayoutConvergedInsetPx((previous) =>
        previous === nextInsetPx ? previous : nextInsetPx,
      );
      markSnapApplied(actualMainDelta);
      return;
    }

    if (layoutConvergedInsetPx !== 0) {
      setLayoutConvergedInsetPx(0);
    }

    if (rightGap < GAP_SNAP_MIN_PX) {
      snapTargetWidthRef.current = 0;
      return;
    }

    // 计算 main 区域需要的宽度增量（正=扩展，负=收缩）
    const mainDelta = resolveMainDeltaByGap(rightGap);

    if (Math.abs(mainDelta) < GAP_SNAP_MIN_PX) {
      snapTargetWidthRef.current = 0;
      return;
    }

    // 默认仅调整右侧 metadata 分割条；仅在右侧折叠时回退到左侧 sidebar。
    if (!metadataCollapsed) {
      const bodyWidth = workspaceBodyRef.current?.getBoundingClientRect().width;
      if (bodyWidth && bodyWidth > 1) {
        const metadataMinRatioByWidth = METADATA_PANEL_MIN_WIDTH_PX / bodyWidth;
        const metadataMinRatio = Math.min(
          METADATA_RATIO_MAX,
          Math.max(METADATA_RATIO_MIN, metadataMinRatioByWidth),
        );
        const maxExpandableMainDelta = Math.max(
          0,
          (metadataRatio - metadataMinRatio) * bodyWidth,
        );
        const maxShrinkMainDelta = Math.max(
          0,
          (METADATA_RATIO_MAX - metadataRatio) * bodyWidth,
        );
        const shrinkMainDelta = -rightGap;
        const shrinkGridWidth = Math.max(
          1,
          Math.round(gridSize.width + shrinkMainDelta),
        );
        const shrinkLayout = computeThumbnailGridLayout({
          gridWidth: shrinkGridWidth,
          gridHeight: gridSize.height,
          thumbnailWidth,
          thumbnailGap,
          zoomLevel: thumbnailScale,
          cardChrome,
        });
        const shrinkWouldDropColumns =
          shrinkLayout.columns < thumbnailLayout.columns;

        const desiredMainDelta = resolveMetadataMainDelta({
          proposedMainDelta: mainDelta,
          rightGap,
          cellSpan,
          maxExpandableMainDelta,
          maxShrinkMainDelta,
          minActionPx: GAP_SNAP_MIN_PX,
          expandBufferPx: GAP_SNAP_EXPAND_BUFFER_PX,
          shrinkWouldDropColumns,
        });

        if (Math.abs(desiredMainDelta) < GAP_SNAP_MIN_PX) {
          snapTargetWidthRef.current = 0;
          return;
        }

        const toRatioCandidate = (targetMainDelta: number) => {
          const ratioCandidate = metadataRatio - targetMainDelta / bodyWidth;
          const nextRatio = clamp(
            ratioCandidate,
            metadataMinRatio,
            METADATA_RATIO_MAX,
          );
          return {
            nextRatio,
            actualMainDelta: (metadataRatio - nextRatio) * bodyWidth,
          };
        };

        let candidate = toRatioCandidate(desiredMainDelta);

        // 左吸附被 metadata 上限卡住时，若仍可右避让到下一列，则优先走右避让。
        if (
          desiredMainDelta < 0 &&
          Math.abs(candidate.actualMainDelta) < GAP_SNAP_MIN_PX
        ) {
          const minExpandNeeded = Math.max(0, cellSpan - rightGap);
          const expandTargetDelta = Math.max(
            0,
            cellSpan - rightGap + GAP_SNAP_EXPAND_BUFFER_PX,
          );
          const expandDelta = Math.min(
            expandTargetDelta,
            maxExpandableMainDelta,
          );
          if (expandDelta + GAP_SNAP_MIN_PX >= minExpandNeeded) {
            candidate = toRatioCandidate(expandDelta);
          }
        }

        if (!markSnapApplied(candidate.actualMainDelta)) {
          snapTargetWidthRef.current = 0;
          return;
        }
        applyMetadataRatio(candidate.nextRatio);
        return;
      }
      snapTargetWidthRef.current = 0;
      return;
    }

    // 右侧折叠时回退到 sidebar 分支
    if (!sidebarCollapsed) {
      const bodyWidth =
        appBodyRef.current?.getBoundingClientRect().width ?? appBodyWidth;
      const workspaceMainFactor = metadataCollapsed
        ? 1
        : Math.max(0.05, 1 - metadataRatio);
      if (bodyWidth > 1 && workspaceMainFactor > 0) {
        const targetRatio =
          sidebarRatio - mainDelta / (bodyWidth * workspaceMainFactor);
        const nextRatio = normalizeSidebarRatio(targetRatio);
        const actualMainDelta =
          (sidebarRatio - nextRatio) * bodyWidth * workspaceMainFactor;
        if (!markSnapApplied(actualMainDelta)) {
          snapTargetWidthRef.current = 0;
          return;
        }
        applySidebarRatio(nextRatio);
        return;
      }
    }

    snapTargetWidthRef.current = 0;
  }, [
    appBodyRef,
    appBodyWidth,
    applyMetadataRatio,
    applySidebarRatio,
    gridSize.height,
    gridSize.width,
    layoutConvergedInsetPx,
    metadataCollapsed,
    metadataRatio,
    normalizeSidebarRatio,
    sidebarCollapsed,
    sidebarRatio,
    thumbnailLayout.cellWidth,
    thumbnailLayout.gap,
    thumbnailLayout.idealGridWidth,
    thumbnailLayout.mediaHeight,
    thumbnailLayout.columns,
    thumbnailScale,
    thumbnailGap,
    thumbnailWidth,
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
      setLayoutConvergedInsetPx(0);
    }
  }, [canGapSnap]);

  useEffect(() => {
    const previous = previousPanelCollapseStateRef.current;
    previousPanelCollapseStateRef.current = {
      sidebarCollapsed,
      metadataCollapsed,
    };

    if (!canGapSnap) {
      return;
    }

    if (
      previous &&
      previous.sidebarCollapsed === sidebarCollapsed &&
      previous.metadataCollapsed === metadataCollapsed
    ) {
      return;
    }

    // 折叠/展开属于强交互，需立即解除锁定并重新吸附。
    lastSnapTimeRef.current = 0;
    snapTargetWidthRef.current = 0;
    if (
      !(sidebarCollapsed && metadataCollapsed) &&
      layoutConvergedInsetPx !== 0
    ) {
      setLayoutConvergedInsetPx(0);
    }
    queueGapSnap(GAP_SNAP_SETTLE_MS);
  }, [
    canGapSnap,
    layoutConvergedInsetPx,
    metadataCollapsed,
    queueGapSnap,
    sidebarCollapsed,
  ]);

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
    const widthChanged = Math.abs(prev.width - gridSize.width) >= 1;
    const heightChanged = Math.abs(prev.height - gridSize.height) >= 1;
    if (!widthChanged && !heightChanged) return;
    previousGridSizeRef.current = gridSize;
    if (!canGapSnap || horizontalResizing) return;

    if (heightChanged) {
      // 例如顶部系统面板展开导致主区高度变化，这类变化不应被冷却窗口拦截。
      lastSnapTimeRef.current = 0;
      snapTargetWidthRef.current = 0;
    }

    if (snapTargetWidthRef.current > 0) {
      const driftFromTarget = Math.abs(
        gridSize.width - snapTargetWidthRef.current,
      );
      const settleThreshold = Math.max(
        GAP_SNAP_MIN_PX * 2,
        Math.min(thumbnailLayout.cellWidth * 0.18, 24),
      );
      // snap 后自然 settling：跳过；其余视为结构变化，释放锁定重算。
      if (
        driftFromTarget < settleThreshold &&
        !heightChanged &&
        performance.now() - lastSnapTimeRef.current < GAP_SNAP_SETTLE_MS * 2
      ) {
        return;
      }
      snapTargetWidthRef.current = 0;
      lastSnapTimeRef.current = 0;
    }

    queueGapSnap(GAP_SNAP_SETTLE_MS);
  }, [
    canGapSnap,
    gridSize,
    horizontalResizing,
    queueGapSnap,
    thumbnailLayout.cellWidth,
  ]);

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
    goPageByDelta,
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

  const effectiveLayoutConvergedInsetPx =
    sidebarCollapsed && metadataCollapsed ? layoutConvergedInsetPx : 0;

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
    layoutConvergedInsetPx: effectiveLayoutConvergedInsetPx,
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
    goPageByDelta,
  };
}
