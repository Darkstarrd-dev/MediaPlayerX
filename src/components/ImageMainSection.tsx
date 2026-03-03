import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

import { MainUiIcon } from "./MainUiIcon";
import { AdReviewExecButton } from "./AdReviewExecButton";
import { ImageMainSectionContentArea } from "./ImageMainSectionContentArea";
import { ImageConvertSettingsPanel } from "./ImageConvertSettingsPanel";
import { ImageMainAdReviewControls } from "./ImageMainAdReviewControls";
import { ImageMainMetadataToolbar } from "./ImageMainMetadataToolbar";
import { ImageMainNormalToolbar } from "./ImageMainNormalToolbar";
import { ImageMainScaleControl } from "./ImageMainScaleControl";
import type { ImageMainSectionProps } from "./ImageMainSection.types";
import { useManageImageSelectionInteractions } from "../features/management/useManageImageSelectionInteractions";
import { useI18n } from "../i18n/useI18n";
import type { FocusedImageRef } from "../types";
import {
  type ThumbnailGridSession,
  buildThumbnailGridSession,
  collectSessionImageUrls,
  isEqualRecord,
  preloadSessionImageUrls,
  resolveImageIdForRef,
} from "./imageMainSectionPreload";
import { useFocusedThumbOriginSync } from "./useFocusedThumbOriginSync";
import { resolveTaskIdFromStartResponse } from "./imageMainSectionTasks";
import { useNameListDimsLoader } from "./useNameListDimsLoader";
import type { MetadataFetchTarget } from "../features/metadata/metadataFetchTargets";
import { NAVIGATION_INPUT_SETTLE_MS } from "../features/shared/interactionDelays";

const IS_TEST_MODE = import.meta.env.MODE === "test";
const EMPTY_IMAGE_ID_SET = new Set<string>();

type ImageConvertTaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "cancelled"
  | "failed";

function ImageMainSection({
  popoverDebugPinned = false,
  fullscreenActive = false,
  vectorMode,
  showNamesOnly,
  metadataManageMode,
  metadataManageSelectionMode = "multiple",
  thumbnailScaleLevel = 1,
  thumbnailScaleLevelCount = 9,
  canThumbnailScaleDown = true,
  canThumbnailScaleUp = true,
  imageConvertScale = 1,
  imageConvertLongestEdgePx = null,
  imageConvertAdjustProfile = {
    mode: "basic",
    brightness: 0,
    contrast: 0,
    level_input_black: 0,
    level_input_white: 255,
    level_gamma: 1,
    curve_shadow_x: 64,
    curve_midtone_x: 128,
    curve_highlight_x: 192,
    curve_shadow: 0,
    curve_midtone: 0,
    curve_highlight: 0,
  },
  imageConvertFormat = "webp",
  imageConvertQuality = 80,
  imageConvertPreviewMode = false,
  imageConvertPreviewScale = 1,
  imageConvertPreviewAdjustProfile = {
    mode: "basic",
    brightness: 0,
    contrast: 0,
    level_input_black: 0,
    level_input_white: 255,
    level_gamma: 1,
    curve_shadow_x: 64,
    curve_midtone_x: 128,
    curve_highlight_x: 192,
    curve_shadow: 0,
    curve_midtone: 0,
    curve_highlight: 0,
  },
  imageConvertPreviewFormat = "webp",
  imageConvertPreviewQuality = 80,
  loading,
  placeholderCount,
  enableLoadingSkeleton,
  activePackage,
  focusedRef,
  focusedImageExists,
  visibleImageRefs,
  refsInPage,
  pageStart,
  actualCellWidth,
  actualMediaHeight: _actualMediaHeight,
  thumbnailColumns,
  thumbnailGap,
  thumbnailRowGap = thumbnailGap,
  vectorCandidates,
  packageById,
  imageUrlById,
  gridRef,
  onGridElementChange,
  manageMode,
  sidebarSelectedCount,
  imageSelectedCount,
  activeSelectionScope,
  pendingManageAction,
  manageOperationHint,
  canManageDelete,
  canManageMoveNodes = false,
  canManageImageConvert = false,
  canManageHide,
  canManageUnhide,
  adReviewFeatureEnabled,
  adReviewPending = false,
  adReviewDeletePending = false,
  adReviewPanelOpen,
  manageReviewMode = "ad",
  adReviewExecutionMode = "normal",
  canSwitchManageReviewMode = false,
  adReviewTask = null,
  adReviewFocusTaskId = null,
  adReviewStrategyMode = "all",
  adReviewMaxConcurrency = 4,
  adReviewHeadN = 4,
  adReviewTailN = 4,
  adReviewTailStopCleanStreak = 4,
  canExecuteAdReview = false,
  hasCheckedAdReviewCandidates = false,
  selectedAdReviewCandidateCount = 0,
  checkedImageIds,
  adReviewCandidateImageIds = EMPTY_IMAGE_ID_SET,
  adReviewNonBodyImageIds = EMPTY_IMAGE_ID_SET,
  adReviewResultsMode = false,
  adReviewGroupByPackageRows = false,
  onToggleImageChecked,
  onReplaceCheckedImages,
  onManageDelete,
  onManageRename = () => undefined,
  onManageGroup = () => undefined,
  onStartImageConvertTask = async () => undefined,
  onManageHide,
  onManageUnhide,
  onToggleAdReviewPanel,
  onManageReviewModeChange = () => undefined,
  onToggleAdReviewFocus = () => undefined,
  onAdReviewStrategyModeChange = () => undefined,
  onAdReviewMaxConcurrencyChange = () => undefined,
  onAdReviewHeadNChange = () => undefined,
  onAdReviewTailNChange = () => undefined,
  onAdReviewTailStopCleanStreakChange = () => undefined,
  onStartAdReview = () => undefined,
  onPauseAdReview = () => undefined,
  onRemoveAdReviewTask = () => undefined,
  onDeleteSelectedAdReviewCandidates = () => undefined,
  onDismissAdReviewTask = () => undefined,
  onClearManageSelection,
  onThumbnailScaleLevelChange,
  onImageConvertScaleChange = () => undefined,
  onImageConvertLongestEdgePxChange = () => undefined,
  onImageConvertFormatChange = () => undefined,
  onImageConvertQualityChange = () => undefined,
  onOpenImageConvertPreview = () => undefined,
  onConfirmImageConvertPreview = () => undefined,
  onCancelImageConvertPreview = () => undefined,
  onToggleShowNamesOnly,
  onEnterFullscreen,
  canJumpToAnimation,
  canJumpToMusic = false,
  canJumpToMusicFromBooklet = false,
  onJumpToAnimation,
  onJumpToMusic = () => undefined,
  onJumpToMusicFromBooklet = () => undefined,
  onSelectImage,
  metadataPending,
  metadataTargetPackageLabel = "-",
  metadataFetchDefaultText = "",
  metadataFetchTargets = [],
  metadataProxyServer,
  onMetadataSyncName,
  onToggleMetadataManageSelectionMode = () => undefined,
  onMetadataSaveParsed,
  onMetadataSaveParsedByPackageId,
  nodeBrowseMode = false,
  nodeBrowseLabel = "",
  nodeBrowseItems = [],
  nodeBrowsePageStart = 0,
  nodeBrowsePageSize = Number.MAX_SAFE_INTEGER,
  onSelectNodeBrowseItem,
  onThumbnailWheelTurnPage,
  onThumbnailWheelDeltaPreview,
  onThumbnailWheelSwitchSidebarNode,
}: ImageMainSectionProps) {
  const {
    markThumbInputMouse,
    scrollFocusedThumbIntoView,
    scheduleFocusedThumbOriginSync,
  } = useFocusedThumbOriginSync({
    gridRef,
    focusedRef,
    nodeBrowseMode,
    showNamesOnly,
    isTestMode: IS_TEST_MODE,
  });
  const { t } = useI18n();
  const [metadataFetchOpen, setMetadataFetchOpen] = useState(false);
  const [openScalePopover, setOpenScalePopover] = useState(false);
  const [adReviewStartDialogOpen, setAdReviewStartDialogOpen] = useState(false);
  const [openAdReviewStrategyPopover, setOpenAdReviewStrategyPopover] =
    useState(false);
  const [openAdReviewProgressPopover, setOpenAdReviewProgressPopover] =
    useState(false);
  const [scaleDraftValue, setScaleDraftValue] = useState(
    Math.max(
      1,
      Math.min(thumbnailScaleLevelCount, Math.round(thumbnailScaleLevel)),
    ),
  );
  const [nameListDimsById, setNameListDimsById] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const [imageConvertPanelOpen, setImageConvertPanelOpen] = useState(false);
  const [imageConvertConcurrency, setImageConvertConcurrency] = useState(4);
  const [imageConvertTaskId, setImageConvertTaskId] = useState<string | null>(
    null,
  );
  const [imageConvertTaskStatus, setImageConvertTaskStatus] =
    useState<ImageConvertTaskStatus | null>(null);
  const [imageConvertTaskProgress, setImageConvertTaskProgress] = useState(0);
  const [imageConvertTaskMessage, setImageConvertTaskMessage] = useState<
    string | null
  >(null);
  const nameListDimsLoadingRef = useRef<Set<string>>(new Set());
  const imageConvertPollTimerRef = useRef<number | null>(null);
  const [nameListBodyEl, setNameListBodyEl] = useState<HTMLDivElement | null>(
    null,
  );
  const [nameListRange, setNameListRange] = useState<{
    start: number;
    end: number;
  }>({ start: 0, end: 0 });
  const scalePopoverHideTimerRef = useRef<number | null>(null);
  const adReviewStrategyPopoverHideTimerRef = useRef<number | null>(null);
  const adReviewProgressPopoverHideTimerRef = useRef<number | null>(null);
  const wheelAccumulatorRef = useRef(0);
  const wheelFlushTimerRef = useRef<number | null>(null);

  const effectiveMetadataFetchTargets = useMemo<MetadataFetchTarget[]>(() => {
    if (metadataFetchTargets.length > 0) {
      return metadataFetchTargets;
    }

    const fallbackPackageId = activePackage?.id?.trim() ?? "";
    if (!fallbackPackageId) {
      return [];
    }

    return [
      {
        packageId: fallbackPackageId,
        label: metadataTargetPackageLabel,
        defaultText: metadataFetchDefaultText,
      },
    ];
  }, [
    activePackage?.id,
    metadataFetchDefaultText,
    metadataFetchTargets,
    metadataTargetPackageLabel,
  ]);

  const handleSaveParsedMetadataByPackageId = useCallback(
    async (
      packageId: string,
      parsed: Parameters<typeof onMetadataSaveParsed>[0],
    ) => {
      if (onMetadataSaveParsedByPackageId) {
        await onMetadataSaveParsedByPackageId(packageId, parsed);
        return;
      }
      const effectivePackageId = activePackage?.id?.trim() ?? "";
      if (!effectivePackageId || effectivePackageId !== packageId) {
        throw new Error("package_not_found");
      }
      await onMetadataSaveParsed(parsed);
    },
    [activePackage?.id, onMetadataSaveParsed, onMetadataSaveParsedByPackageId],
  );

  const scaleLevel = Math.max(
    1,
    Math.min(thumbnailScaleLevelCount, Math.round(thumbnailScaleLevel)),
  );

  useEffect(() => {
    setScaleDraftValue(scaleLevel);
  }, [scaleLevel]);

  useEffect(() => {
    if (!showNamesOnly) {
      return;
    }

    const body = nameListBodyEl;
    if (!body) {
      return;
    }

    let rafId: number | null = null;
    const bufferRows = 6;

    const compute = () => {
      const row = body.querySelector(".name-list-row");
      const rowHeight =
        row instanceof HTMLElement
          ? row.getBoundingClientRect().height || 42
          : 42;
      const totalRows = visibleImageRefs.length;
      const scrollTop = body.scrollTop;
      const viewportHeight = body.clientHeight;
      const visibleCount = Math.ceil(viewportHeight / Math.max(1, rowHeight));
      const start = Math.max(
        0,
        Math.floor(scrollTop / Math.max(1, rowHeight)) - bufferRows,
      );
      const end = Math.min(totalRows, start + visibleCount + bufferRows * 2);

      setNameListRange((previous) => {
        if (previous.start === start && previous.end === end) {
          return previous;
        }
        return { start, end };
      });
    };

    const schedule = () => {
      if (rafId != null) {
        return;
      }
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        compute();
      });
    };

    schedule();
    body.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      body.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (rafId != null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [nameListBodyEl, showNamesOnly, visibleImageRefs.length]);

  const clearScalePopoverHideTimer = () => {
    if (scalePopoverHideTimerRef.current != null) {
      window.clearTimeout(scalePopoverHideTimerRef.current);
      scalePopoverHideTimerRef.current = null;
    }
  };

  const openScalePopoverByHover = () => {
    clearScalePopoverHideTimer();
    setOpenScalePopover(true);
  };

  const closeScalePopoverByHover = () => {
    if (popoverDebugPinned) {
      return;
    }
    clearScalePopoverHideTimer();
    scalePopoverHideTimerRef.current = window.setTimeout(() => {
      setOpenScalePopover(false);
      scalePopoverHideTimerRef.current = null;
    }, 140);
  };

  const effectiveOpenScalePopover = popoverDebugPinned || openScalePopover;

  const clearAdReviewStrategyPopoverHideTimer = () => {
    if (adReviewStrategyPopoverHideTimerRef.current != null) {
      window.clearTimeout(adReviewStrategyPopoverHideTimerRef.current);
      adReviewStrategyPopoverHideTimerRef.current = null;
    }
  };

  const clearAdReviewProgressPopoverHideTimer = () => {
    if (adReviewProgressPopoverHideTimerRef.current != null) {
      window.clearTimeout(adReviewProgressPopoverHideTimerRef.current);
      adReviewProgressPopoverHideTimerRef.current = null;
    }
  };

  useEffect(
    () => () => {
      clearScalePopoverHideTimer();
      clearAdReviewStrategyPopoverHideTimer();
      clearAdReviewProgressPopoverHideTimer();
      if (wheelFlushTimerRef.current != null) {
        window.clearTimeout(wheelFlushTimerRef.current);
        wheelFlushTimerRef.current = null;
      }
    },
    [],
  );

  const initialThumbnailSession =
    !showNamesOnly && !nodeBrowseMode
      ? buildThumbnailGridSession({
          refsInPage,
          packageById,
          actualCellWidth,
          actualMediaHeight: _actualMediaHeight,
          thumbnailColumns,
          thumbnailGap,
        })
      : null;
  const initialThumbnailUrls = initialThumbnailSession
    ? collectSessionImageUrls(initialThumbnailSession, imageUrlById)
    : null;

  const [bufferedRefsInPage, setBufferedRefsInPage] = useState<
    FocusedImageRef[]
  >(() => {
    if (initialThumbnailSession && initialThumbnailUrls) {
      return initialThumbnailSession.refs;
    }
    return [];
  });
  const [bufferedThumbnailSessionKey, setBufferedThumbnailSessionKey] =
    useState<string | null>(() => {
      if (initialThumbnailSession && initialThumbnailUrls) {
        return initialThumbnailSession.key;
      }
      return null;
    });
  const [bufferedImageUrlById, setBufferedImageUrlById] = useState<
    Record<string, string>
  >(() => {
    if (initialThumbnailUrls) {
      return initialThumbnailUrls;
    }
    return {};
  });
  const [pendingThumbnailSession, setPendingThumbnailSession] =
    useState<ThumbnailGridSession | null>(() => {
      if (initialThumbnailSession && !initialThumbnailUrls) {
        return initialThumbnailSession;
      }
      return null;
    });
  const pendingDecodeSequenceRef = useRef(0);

  const thumbnailGridSession = useMemo(
    () =>
      buildThumbnailGridSession({
        refsInPage,
        packageById,
        actualCellWidth,
        actualMediaHeight: _actualMediaHeight,
        thumbnailColumns,
        thumbnailGap,
      }),
    [
      _actualMediaHeight,
      actualCellWidth,
      packageById,
      refsInPage,
      thumbnailColumns,
      thumbnailGap,
    ],
  );

  useEffect(() => {
    if (nodeBrowseMode) {
      setPendingThumbnailSession(null);
      setBufferedRefsInPage(refsInPage);
      setBufferedThumbnailSessionKey(null);
      setBufferedImageUrlById((previous) =>
        isEqualRecord(previous, imageUrlById) ? previous : imageUrlById,
      );
      return;
    }

    if (showNamesOnly) {
      setPendingThumbnailSession(null);
      return;
    }

    if (!thumbnailGridSession) {
      setPendingThumbnailSession(null);
      setBufferedRefsInPage([]);
      setBufferedThumbnailSessionKey(null);
      setBufferedImageUrlById((previous) =>
        Object.keys(previous).length === 0 ? previous : {},
      );
      return;
    }

    const readyUrls = collectSessionImageUrls(
      thumbnailGridSession,
      imageUrlById,
    );

    if (bufferedThumbnailSessionKey === thumbnailGridSession.key) {
      if (readyUrls) {
        setBufferedRefsInPage(thumbnailGridSession.refs);
        setBufferedImageUrlById((previous) =>
          isEqualRecord(previous, readyUrls) ? previous : readyUrls,
        );
        setPendingThumbnailSession(null);
        return;
      }

      // 未全部就绪 — 由增量同步 effect 渐进补全，不设 pending
      return;
    }

    // 新 session：已有缩略图时渐进显示，初始挂载时等待全部就绪
    if (bufferedThumbnailSessionKey !== null) {
      const partialUrls: Record<string, string> = {};
      for (const imageId of thumbnailGridSession.imageIds) {
        const url = imageUrlById[imageId];
        if (url) {
          partialUrls[imageId] = url;
        }
      }
      setBufferedRefsInPage(thumbnailGridSession.refs);
      setBufferedThumbnailSessionKey(thumbnailGridSession.key);
      setBufferedImageUrlById(partialUrls);
      setPendingThumbnailSession(null);
    } else {
      setPendingThumbnailSession((previous) => {
        if (previous?.key === thumbnailGridSession.key) {
          return previous;
        }
        return thumbnailGridSession;
      });
    }
  }, [
    bufferedThumbnailSessionKey,
    imageUrlById,
    nodeBrowseMode,
    refsInPage,
    showNamesOnly,
    thumbnailGridSession,
  ]);

  useEffect(() => {
    if (!pendingThumbnailSession) {
      return;
    }

    const readyUrls = collectSessionImageUrls(
      pendingThumbnailSession,
      imageUrlById,
    );
    if (!readyUrls) {
      return;
    }

    if (IS_TEST_MODE) {
      setPendingThumbnailSession(null);
      setBufferedThumbnailSessionKey(pendingThumbnailSession.key);
      setBufferedRefsInPage(pendingThumbnailSession.refs);
      setBufferedImageUrlById((previous) =>
        isEqualRecord(previous, readyUrls) ? previous : readyUrls,
      );
      return;
    }

    pendingDecodeSequenceRef.current += 1;
    const sequence = pendingDecodeSequenceRef.current;
    let cancelled = false;

    void preloadSessionImageUrls(readyUrls)
      .catch(() => undefined)
      .then(() => {
        if (cancelled || pendingDecodeSequenceRef.current !== sequence) {
          return;
        }

        setPendingThumbnailSession(null);
        setBufferedThumbnailSessionKey(pendingThumbnailSession.key);
        setBufferedRefsInPage(pendingThumbnailSession.refs);
        setBufferedImageUrlById((previous) =>
          isEqualRecord(previous, readyUrls) ? previous : readyUrls,
        );
      });

    return () => {
      cancelled = true;
    };
  }, [imageUrlById, pendingThumbnailSession]);

  // 渐进式缩略图同步：当 session 已切换且无 pending 时，增量更新已就绪的 URL
  useEffect(() => {
    if (showNamesOnly || nodeBrowseMode || !thumbnailGridSession) {
      return;
    }
    if (bufferedThumbnailSessionKey !== thumbnailGridSession.key) {
      return;
    }
    if (pendingThumbnailSession !== null) {
      return;
    }

    setBufferedImageUrlById((previous) => {
      let changed = false;
      const next = { ...previous };
      for (const imageId of thumbnailGridSession.imageIds) {
        const url = imageUrlById[imageId];
        if (url && next[imageId] !== url) {
          next[imageId] = url;
          changed = true;
        }
      }
      return changed ? next : previous;
    });
  }, [
    bufferedThumbnailSessionKey,
    imageUrlById,
    nodeBrowseMode,
    pendingThumbnailSession,
    showNamesOnly,
    thumbnailGridSession,
  ]);

  const thumbnailBufferPending =
    !showNamesOnly && !nodeBrowseMode && pendingThumbnailSession !== null;
  const refsInPageForRender =
    showNamesOnly || nodeBrowseMode ? refsInPage : bufferedRefsInPage;
  const imageUrlByIdForRender =
    showNamesOnly || nodeBrowseMode ? imageUrlById : bufferedImageUrlById;
  const hasRenderableThumbnailBatch =
    !showNamesOnly &&
    !nodeBrowseMode &&
    refsInPageForRender.length > 0 &&
    refsInPageForRender.every((ref) => {
      const imageId = resolveImageIdForRef(packageById, ref);
      return Boolean(imageId && imageUrlByIdForRender[imageId]);
    });
  const isThumbnailInteractionLocked =
    !showNamesOnly && !nodeBrowseMode && thumbnailBufferPending;
  const showSkeleton =
    !showNamesOnly &&
    !nodeBrowseMode &&
    enableLoadingSkeleton &&
    !hasRenderableThumbnailBatch &&
    (thumbnailBufferPending || (loading && refsInPageForRender.length === 0));
  const skeletonCount = Math.max(
    1,
    thumbnailBufferPending
      ? (pendingThumbnailSession?.refs.length ?? placeholderCount)
      : placeholderCount,
  );

  useEffect(() => {
    onGridElementChange(gridRef.current);
    return () => {
      onGridElementChange(null);
    };
  }, [gridRef, nodeBrowseMode, onGridElementChange, showNamesOnly]);

  useNameListDimsLoader({
    showNamesOnly,
    isTestMode: IS_TEST_MODE,
    manageMode,
    nameListRange,
    visibleImageRefs,
    packageById,
    nameListDimsById,
    setNameListDimsById,
    nameListDimsLoadingRef,
  });

  const { marqueeStyle, startMarqueeSelection, startThumbnailDragToggle } =
    useManageImageSelectionInteractions({
      manageMode,
      onReplaceCheckedImages,
      onToggleImageChecked,
      onSelectImage,
      focusOnFirstToggle:
        !adReviewResultsMode ||
        adReviewTask?.status === "running" ||
        adReviewTask?.status === "paused" ||
        adReviewTask?.status === "review",
    });

  const manageSummary =
    activeSelectionScope === "sidebar"
      ? t("a11y.manage.selectedSidebarNodes", { count: sidebarSelectedCount })
      : activeSelectionScope === "image"
        ? t("a11y.manage.selectedMediaItems", { count: imageSelectedCount })
        : t("a11y.manage.noSelection");
  const manageSummaryText = manageOperationHint ?? manageSummary;

  const currentThumbnailPageImageIds = useMemo(() => {
    if (!manageMode) {
      return [];
    }

    const ids: string[] = [];
    for (const ref of refsInPage) {
      const imageId = resolveImageIdForRef(packageById, ref);
      if (imageId) {
        ids.push(imageId);
      }
    }
    return ids;
  }, [manageMode, packageById, refsInPage]);
  const hasCurrentThumbnailPage = currentThumbnailPageImageIds.length > 0;
  const hasAnyManageSelection =
    sidebarSelectedCount > 0 || imageSelectedCount > 0;
  const imageConvertExecuting =
    imageConvertTaskStatus === "pending" ||
    imageConvertTaskStatus === "running";
  const convertInteractionLocked = pendingManageAction || imageConvertExecuting;
  const toggleImageConvertPanel = useCallback(() => {
    if (!canManageImageConvert || convertInteractionLocked) {
      return;
    }
    setImageConvertPanelOpen((value) => !value);
  }, [canManageImageConvert, convertInteractionLocked]);

  useEffect(() => {
    const onToggleByShortcut = () => {
      toggleImageConvertPanel();
    };
    const onOpenByShortcut = () => {
      setImageConvertPanelOpen(true);
    };
    window.addEventListener(
      "mpx:image-convert-toggle-panel",
      onToggleByShortcut,
    );
    window.addEventListener("mpx:image-convert-open-panel", onOpenByShortcut);
    return () => {
      window.removeEventListener(
        "mpx:image-convert-toggle-panel",
        onToggleByShortcut,
      );
      window.removeEventListener(
        "mpx:image-convert-open-panel",
        onOpenByShortcut,
      );
    };
  }, [toggleImageConvertPanel]);

  const activePackageImageProgress = (() => {
    if (!activePackage || activePackage.images.length === 0) {
      return null;
    }

    const total = activePackage.images.length;

    if (focusedRef?.packageId === activePackage.id) {
      const current = Math.max(1, Math.min(total, focusedRef.imageIndex + 1));
      return `${current}/${total}`;
    }

    const firstInPage = refsInPage.find(
      (ref) => ref.packageId === activePackage.id,
    );
    if (firstInPage) {
      const current = Math.max(1, Math.min(total, firstInPage.imageIndex + 1));
      return `${current}/${total}`;
    }

    const firstVisible = visibleImageRefs.find(
      (ref) => ref.packageId === activePackage.id,
    );
    if (firstVisible) {
      const current = Math.max(1, Math.min(total, firstVisible.imageIndex + 1));
      return `${current}/${total}`;
    }

    return `1/${total}`;
  })();

  const browseToolbarTitle = nodeBrowseMode
    ? t("ui.image.nodeBrowseSummary", {
        label: nodeBrowseLabel || t("ui.image.nodeBrowseDefaultLabel"),
        count: nodeBrowseItems.length,
      })
    : vectorMode
      ? t("ui.image.searchResultsView")
      : t("ui.image.packageProgressSummary", {
          packageName: activePackage?.displayName ?? t("ui.image.noPackage"),
          progress: activePackageImageProgress ?? t("ui.image.defaultProgress"),
        });

  const focusEnabledTask =
    adReviewTask &&
    (adReviewTask.status === "running" ||
      adReviewTask.status === "paused" ||
      adReviewTask.status === "review")
      ? adReviewTask
      : null;
  const hasAdReviewFocusCandidates = Boolean(
    focusEnabledTask && focusEnabledTask.candidates.length > 0,
  );
  const adReviewFocusActive = Boolean(
    focusEnabledTask && adReviewFocusTaskId === focusEnabledTask.task_id,
  );
  const showAdReviewToolbarControls =
    manageMode && adReviewFeatureEnabled && adReviewPanelOpen;
  const isAdReviewPerformanceMode =
    manageReviewMode === "ad" && adReviewExecutionMode === "performance";
  const isReviewWithCandidates = Boolean(
    adReviewTask &&
    adReviewTask.status === "review" &&
    adReviewTask.candidates.length > 0,
  );
  const isReviewRunningOrPaused = Boolean(
    adReviewTask &&
    (adReviewTask.status === "running" || adReviewTask.status === "paused"),
  );
  const adReviewRunning = adReviewTask?.status === "running";
  const openAdReviewProgressPopoverByHover = () => {
    clearAdReviewProgressPopoverHideTimer();
    setOpenAdReviewProgressPopover(true);
  };

  const closeAdReviewProgressPopoverByHover = () => {
    clearAdReviewProgressPopoverHideTimer();
    adReviewProgressPopoverHideTimerRef.current = window.setTimeout(() => {
      setOpenAdReviewProgressPopover(false);
      adReviewProgressPopoverHideTimerRef.current = null;
    }, 90);
  };

  useEffect(() => {
    if (adReviewRunning) {
      setAdReviewStartDialogOpen(false);
    }
  }, [adReviewRunning]);

  const clearImageConvertPollTimer = useCallback(() => {
    if (imageConvertPollTimerRef.current != null) {
      window.clearInterval(imageConvertPollTimerRef.current);
      imageConvertPollTimerRef.current = null;
    }
  }, []);

  const stopImageConvertExecution = useCallback(() => {
    clearImageConvertPollTimer();
    setImageConvertTaskId(null);
    setImageConvertTaskStatus(null);
    setImageConvertTaskProgress(0);
    setImageConvertTaskMessage(null);
  }, [clearImageConvertPollTimer]);

  useEffect(() => {
    document.documentElement.dataset.mpxImageConvertExecuting =
      imageConvertExecuting ? "1" : "0";
    return () => {
      document.documentElement.dataset.mpxImageConvertExecuting = "0";
    };
  }, [imageConvertExecuting]);

  useEffect(
    () => () => {
      clearImageConvertPollTimer();
      document.documentElement.dataset.mpxImageConvertExecuting = "0";
    },
    [clearImageConvertPollTimer],
  );

  useEffect(() => {
    if (!imageConvertTaskId || !imageConvertExecuting) {
      clearImageConvertPollTimer();
      return;
    }

    const api = window.mediaPlayerBackend;
    const readImageConvertTask = api?.readImageConvertTask;
    if (!readImageConvertTask) {
      return;
    }

    const pollTask = async () => {
      try {
        const response = await readImageConvertTask({
          task_id: imageConvertTaskId,
        });
        const task = (
          response as {
            task?: {
              status?: ImageConvertTaskStatus;
              progress?: number;
              message?: string | null;
            };
          }
        )?.task;
        if (!task) {
          return;
        }
        const nextStatus = task.status ?? "running";
        const nextProgress = Number.isFinite(task.progress)
          ? Math.max(0, Math.min(1, Number(task.progress)))
          : 0;
        setImageConvertTaskStatus(nextStatus);
        setImageConvertTaskProgress(nextProgress);
        setImageConvertTaskMessage(task.message ?? null);

        if (
          nextStatus === "completed" ||
          nextStatus === "cancelled" ||
          nextStatus === "failed"
        ) {
          clearImageConvertPollTimer();
        }
      } catch {
        // ignore polling errors and keep current UI state
      }
    };

    void pollTask();
    clearImageConvertPollTimer();
    imageConvertPollTimerRef.current = window.setInterval(() => {
      void pollTask();
    }, 350);
    return () => {
      clearImageConvertPollTimer();
    };
  }, [clearImageConvertPollTimer, imageConvertExecuting, imageConvertTaskId]);

  useEffect(() => {
    if (!manageMode) {
      setImageConvertPanelOpen(false);
      stopImageConvertExecution();
    }
  }, [manageMode, stopImageConvertExecution]);

  useEffect(() => {
    if (fullscreenActive) {
      setImageConvertPanelOpen(false);
    }
  }, [fullscreenActive]);

  const triggerToolbarAdReviewStartOrPause = () => {
    if (adReviewTask?.status === "paused") {
      onPauseAdReview();
      return;
    }
    if (adReviewRunning) {
      onPauseAdReview();
      return;
    }
    setAdReviewStartDialogOpen(true);
  };

  const startToolbarAdReviewWithOption = (skipReviewedNodes: boolean) => {
    setAdReviewStartDialogOpen(false);
    onStartAdReview({ skipReviewedNodes });
  };

  const openAdReviewStrategyPopoverByHover = () => {
    clearAdReviewStrategyPopoverHideTimer();
    setOpenAdReviewStrategyPopover(true);
  };

  const closeAdReviewStrategyPopoverByHover = () => {
    clearAdReviewStrategyPopoverHideTimer();
    adReviewStrategyPopoverHideTimerRef.current = window.setTimeout(() => {
      setOpenAdReviewStrategyPopover(false);
      adReviewStrategyPopoverHideTimerRef.current = null;
    }, 90);
  };

  const closeImageConvertSettingsMask = () => {
    if (imageConvertPreviewMode) {
      onCancelImageConvertPreview();
    }
    stopImageConvertExecution();
    setImageConvertPanelOpen(false);
  };

  const handleImageConvertPanelMouseDown = (
    event: ReactMouseEvent<HTMLElement>,
  ) => {
    event.stopPropagation();
  };

  const handleImageConvertConfirm = async () => {
    if (imageConvertPreviewMode) {
      onConfirmImageConvertPreview();
    }
    setImageConvertTaskStatus("pending");
    setImageConvertTaskProgress(0);
    setImageConvertTaskMessage(null);
    const startResponse = (await onStartImageConvertTask({
      node_ids: [],
      scale_factor: imageConvertScale,
      ...(imageConvertLongestEdgePx != null
        ? { longest_edge_px: imageConvertLongestEdgePx }
        : {}),
      adjust: imageConvertPreviewMode
        ? imageConvertPreviewAdjustProfile
        : imageConvertAdjustProfile,
      target_format: imageConvertFormat,
      quality: imageConvertQuality,
      concurrency: imageConvertConcurrency,
    })) as unknown;
    const nextTaskId = resolveTaskIdFromStartResponse(startResponse);
    if (!nextTaskId) {
      setImageConvertTaskStatus("failed");
      setImageConvertTaskMessage("missing task id");
      return;
    }
    setImageConvertTaskId(nextTaskId);
    setImageConvertTaskStatus("running");
  };

  const handleImageConvertCancel = async () => {
    if (imageConvertExecuting && imageConvertTaskId) {
      try {
        await window.mediaPlayerBackend?.cancelImageConvertTask?.({
          task_id: imageConvertTaskId,
        });
        setImageConvertTaskStatus("cancelled");
        setImageConvertTaskMessage("cancel requested");
      } catch {
        setImageConvertTaskMessage("cancel failed");
      }
      stopImageConvertExecution();
      return;
    }
    if (imageConvertPreviewMode) {
      onCancelImageConvertPreview();
    }
    stopImageConvertExecution();
    setImageConvertPanelOpen(false);
  };

  const handleThumbnailContainerWheel = (
    event: ReactWheelEvent<HTMLDivElement>,
  ) => {
    if (
      Math.abs(event.deltaY) <= Math.abs(event.deltaX) ||
      event.deltaY === 0
    ) {
      return;
    }

    const direction: "next" | "prev" = event.deltaY > 0 ? "next" : "prev";
    event.preventDefault();

    if (event.ctrlKey) {
      onThumbnailWheelSwitchSidebarNode?.(direction);
      return;
    }

    wheelAccumulatorRef.current += Math.sign(event.deltaY);
    onThumbnailWheelDeltaPreview?.(wheelAccumulatorRef.current);
    if (wheelFlushTimerRef.current != null) {
      window.clearTimeout(wheelFlushTimerRef.current);
    }
    wheelFlushTimerRef.current = window.setTimeout(() => {
      wheelFlushTimerRef.current = null;
      const delta = wheelAccumulatorRef.current;
      wheelAccumulatorRef.current = 0;
      onThumbnailWheelDeltaPreview?.(0);
      if (delta !== 0) {
        onThumbnailWheelTurnPage?.(delta);
      }
    }, NAVIGATION_INPUT_SETTLE_MS);
  };

  return (
    <>
      <div className="main-toolbar" data-slot="fg-main-toolbar">
        {manageMode ? (
          <>
            <span hidden data-slot="fg-main-toolbar-state-manage" />
            <div className="toolbar-actions toolbar-actions-manage">
              <button
                className="feature-action-btn main-icon-square-btn"
                type="button"
                aria-label={
                  hasAnyManageSelection
                    ? t("a11y.common.clearSelection")
                    : t("a11y.media.selectAllPage")
                }
                data-tooltip-label={
                  hasAnyManageSelection
                    ? t("tip.common.clearSelection")
                    : t("tip.media.selectAllPage")
                }
                disabled={
                  convertInteractionLocked ||
                  (!hasAnyManageSelection && !hasCurrentThumbnailPage)
                }
                onClick={
                  hasAnyManageSelection
                    ? onClearManageSelection
                    : () => onReplaceCheckedImages(currentThumbnailPageImageIds)
                }
              >
                <MainUiIcon
                  name={hasAnyManageSelection ? "unselectAll" : "selectAll"}
                />
              </button>
              <button
                className="feature-action-btn main-icon-square-btn"
                type="button"
                aria-label={t("a11y.common.hide")}
                data-tooltip-label={t("tip.common.hide")}
                disabled={!canManageHide || convertInteractionLocked}
                onClick={onManageHide}
              >
                <MainUiIcon name="hidden" />
              </button>
              <button
                className="feature-action-btn main-icon-square-btn"
                type="button"
                aria-label={t("a11y.common.unhide")}
                data-tooltip-label={t("tip.common.unhide")}
                disabled={!canManageUnhide || convertInteractionLocked}
                onClick={onManageUnhide}
              >
                <MainUiIcon name="reveal" />
              </button>
              <button
                className="feature-action-btn main-icon-square-btn"
                type="button"
                aria-label={t("a11y.common.organize")}
                data-tooltip-label={t("tip.common.organize")}
                disabled={!canManageMoveNodes || convertInteractionLocked}
                onClick={onManageGroup}
              >
                <MainUiIcon name="organize" />
              </button>
              <button
                className="feature-action-btn main-icon-square-btn"
                type="button"
                aria-label={t("a11y.common.rename")}
                data-tooltip-label={t("tip.common.rename")}
                disabled={!hasAnyManageSelection || convertInteractionLocked}
                onClick={onManageRename}
              >
                <MainUiIcon name="rename" />
              </button>
              <button
                className={`feature-action-btn main-icon-square-btn ${
                  imageConvertPanelOpen || imageConvertPreviewMode
                    ? "is-active"
                    : ""
                }`}
                type="button"
                aria-label="RS"
                data-tooltip-label="RS"
                disabled={!canManageImageConvert || convertInteractionLocked}
                onClick={toggleImageConvertPanel}
              >
                <span aria-hidden="true">RS</span>
              </button>
              <button
                className={`vector-search-btn main-icon-square-btn ${adReviewDeletePending ? "is-pending" : ""}`}
                type="button"
                aria-label={
                  adReviewDeletePending
                    ? t("ui.manage.deleting")
                    : t("a11y.common.delete")
                }
                data-tooltip-label={
                  adReviewDeletePending
                    ? t("ui.manage.deleting")
                    : t("tip.common.delete")
                }
                disabled={!canManageDelete || convertInteractionLocked}
                onClick={onManageDelete}
              >
                <MainUiIcon name="delete" />
              </button>
              {adReviewFeatureEnabled ? (
                <button
                  className={`feature-action-btn main-icon-square-btn ${adReviewPanelOpen ? "is-active" : ""}`}
                  type="button"
                  aria-label={t("a11y.manage.adReview")}
                  data-tooltip-label={t("tip.manage.adReview")}
                  disabled={convertInteractionLocked}
                  onClick={onToggleAdReviewPanel}
                >
                  <MainUiIcon name="adSearch" />
                </button>
              ) : null}
              <ImageMainAdReviewControls
                t={t}
                showAdReviewToolbarControls={showAdReviewToolbarControls}
                isReviewRunningOrPaused={isReviewRunningOrPaused}
                isReviewWithCandidates={isReviewWithCandidates}
                canSwitchManageReviewMode={canSwitchManageReviewMode}
                convertInteractionLocked={convertInteractionLocked}
                adReviewPending={adReviewPending}
                pendingManageAction={pendingManageAction}
                adReviewExecutionMode={adReviewExecutionMode}
                manageReviewMode={manageReviewMode}
                onManageReviewModeChange={onManageReviewModeChange}
                openAdReviewStrategyPopover={openAdReviewStrategyPopover}
                openAdReviewStrategyPopoverByHover={
                  openAdReviewStrategyPopoverByHover
                }
                closeAdReviewStrategyPopoverByHover={
                  closeAdReviewStrategyPopoverByHover
                }
                adReviewStrategyMode={adReviewStrategyMode}
                onAdReviewStrategyModeChange={onAdReviewStrategyModeChange}
                adReviewMaxConcurrency={adReviewMaxConcurrency}
                adReviewHeadN={adReviewHeadN}
                adReviewTailN={adReviewTailN}
                adReviewTailStopCleanStreak={adReviewTailStopCleanStreak}
                onAdReviewMaxConcurrencyChange={onAdReviewMaxConcurrencyChange}
                onAdReviewHeadNChange={onAdReviewHeadNChange}
                onAdReviewTailNChange={onAdReviewTailNChange}
                onAdReviewTailStopCleanStreakChange={
                  onAdReviewTailStopCleanStreakChange
                }
                openAdReviewProgressPopover={openAdReviewProgressPopover}
                openAdReviewProgressPopoverByHover={
                  openAdReviewProgressPopoverByHover
                }
                closeAdReviewProgressPopoverByHover={
                  closeAdReviewProgressPopoverByHover
                }
                adReviewTask={adReviewTask}
                adReviewRunning={adReviewRunning}
                canExecuteAdReview={canExecuteAdReview}
                triggerToolbarAdReviewStartOrPause={
                  triggerToolbarAdReviewStartOrPause
                }
                onRemoveAdReviewTask={onRemoveAdReviewTask}
                adReviewDeletePending={adReviewDeletePending}
                adReviewFocusActive={adReviewFocusActive}
                hasAdReviewFocusCandidates={hasAdReviewFocusCandidates}
                onToggleAdReviewFocus={onToggleAdReviewFocus}
                selectedAdReviewCandidateCount={selectedAdReviewCandidateCount}
                hasCheckedAdReviewCandidates={hasCheckedAdReviewCandidates}
                onDeleteSelectedAdReviewCandidates={
                  onDeleteSelectedAdReviewCandidates
                }
                onDismissAdReviewTask={onDismissAdReviewTask}
              />
              {showAdReviewToolbarControls &&
              !isReviewWithCandidates &&
              !isReviewRunningOrPaused ? (
                <AdReviewExecButton
                  t={t}
                  adReviewRunning={adReviewRunning}
                  disabled={
                    pendingManageAction ||
                    adReviewPending ||
                    (!adReviewRunning && !canExecuteAdReview)
                  }
                  onClick={triggerToolbarAdReviewStartOrPause}
                />
              ) : null}
              <ImageConvertSettingsPanel
                open={imageConvertPanelOpen}
                fullscreenActive={fullscreenActive}
                imageConvertPreviewMode={imageConvertPreviewMode}
                imageConvertExecuting={imageConvertExecuting}
                imageConvertScale={imageConvertScale}
                imageConvertLongestEdgePx={imageConvertLongestEdgePx}
                imageConvertFormat={imageConvertFormat}
                imageConvertQuality={imageConvertQuality}
                imageConvertConcurrency={imageConvertConcurrency}
                imageConvertTaskStatus={imageConvertTaskStatus}
                imageConvertTaskProgress={imageConvertTaskProgress}
                imageConvertTaskMessage={imageConvertTaskMessage}
                imageConvertPreviewScale={imageConvertPreviewScale}
                imageConvertPreviewFormat={imageConvertPreviewFormat}
                imageConvertPreviewQuality={imageConvertPreviewQuality}
                onCloseMask={closeImageConvertSettingsMask}
                onPanelMouseDown={handleImageConvertPanelMouseDown}
                onScaleChange={onImageConvertScaleChange}
                onLongestEdgeChange={onImageConvertLongestEdgePxChange}
                onFormatChange={onImageConvertFormatChange}
                onQualityChange={onImageConvertQualityChange}
                onConcurrencyChange={setImageConvertConcurrency}
                onPreview={() => {
                  setImageConvertPanelOpen(false);
                  onOpenImageConvertPreview();
                }}
                onConfirm={handleImageConvertConfirm}
                onCancel={handleImageConvertCancel}
              />
            </div>
            <div className="toolbar-actions toolbar-actions-manage-secondary">
              <strong
                className="main-toolbar-summary"
                data-tooltip-label={manageSummaryText}
              >
                {manageSummaryText}
              </strong>
              <ImageMainScaleControl
                t={t}
                openScalePopover={effectiveOpenScalePopover}
                canThumbnailScaleDown={canThumbnailScaleDown}
                canThumbnailScaleUp={canThumbnailScaleUp}
                thumbnailScaleLevelCount={thumbnailScaleLevelCount}
                scaleDraftValue={scaleDraftValue}
                onOpenByHover={openScalePopoverByHover}
                onCloseByHover={closeScalePopoverByHover}
                onScaleDraftChange={setScaleDraftValue}
                onScaleChange={(level) => onThumbnailScaleLevelChange?.(level)}
              />
            </div>
          </>
        ) : metadataManageMode ? (
          <ImageMainMetadataToolbar
            t={t}
            metadataPending={metadataPending}
            metadataManageSelectionMode={metadataManageSelectionMode}
            manageOperationHint={manageOperationHint}
            onMetadataSyncName={onMetadataSyncName}
            onToggleMetadataManageSelectionMode={
              onToggleMetadataManageSelectionMode
            }
            onOpenMetadataFetch={() => setMetadataFetchOpen(true)}
          />
        ) : (
          <ImageMainNormalToolbar
            t={t}
            browseToolbarTitle={browseToolbarTitle}
            showNamesOnly={showNamesOnly}
            openScalePopover={effectiveOpenScalePopover}
            canThumbnailScaleDown={canThumbnailScaleDown}
            canThumbnailScaleUp={canThumbnailScaleUp}
            thumbnailScaleLevelCount={thumbnailScaleLevelCount}
            scaleDraftValue={scaleDraftValue}
            focusedImageExists={focusedImageExists}
            canJumpToMusicFromBooklet={canJumpToMusicFromBooklet}
            canJumpToAnimation={canJumpToAnimation}
            canJumpToMusic={canJumpToMusic}
            onToggleShowNamesOnly={onToggleShowNamesOnly}
            onEnterFullscreen={onEnterFullscreen}
            onJumpToMusicFromBooklet={onJumpToMusicFromBooklet}
            onJumpToAnimation={onJumpToAnimation}
            onJumpToMusic={onJumpToMusic}
            onOpenScalePopoverByHover={openScalePopoverByHover}
            onCloseScalePopoverByHover={closeScalePopoverByHover}
            onScaleDraftChange={setScaleDraftValue}
            onScaleChange={(level) => onThumbnailScaleLevelChange?.(level)}
          />
        )}
      </div>

      <ImageMainSectionContentArea
        nodeBrowseMode={nodeBrowseMode}
        showNamesOnly={showNamesOnly}
        manageMode={manageMode}
        gridRef={gridRef}
        handleThumbnailContainerWheel={handleThumbnailContainerWheel}
        thumbnailColumns={thumbnailColumns}
        actualCellWidth={actualCellWidth}
        thumbnailGap={thumbnailGap}
        thumbnailRowGap={thumbnailRowGap}
        nodeBrowseItems={nodeBrowseItems}
        nodeBrowsePageStart={nodeBrowsePageStart}
        nodeBrowsePageSize={nodeBrowsePageSize}
        markThumbInputMouse={markThumbInputMouse}
        scrollFocusedThumbIntoView={scrollFocusedThumbIntoView}
        scheduleFocusedThumbOriginSync={scheduleFocusedThumbOriginSync}
        onSelectNodeBrowseItem={onSelectNodeBrowseItem}
        t={t}
        setNameListBodyEl={setNameListBodyEl}
        startMarqueeSelection={startMarqueeSelection}
        startThumbnailDragToggle={startThumbnailDragToggle}
        visibleImageRefs={visibleImageRefs}
        packageById={packageById}
        nameListDimsById={nameListDimsById}
        focusedRef={focusedRef}
        checkedImageIds={checkedImageIds}
        adReviewCandidateImageIds={adReviewCandidateImageIds}
        adReviewNonBodyImageIds={adReviewNonBodyImageIds}
        onSelectImage={onSelectImage}
        onEnterFullscreen={onEnterFullscreen}
        refsInPageForRender={refsInPageForRender}
        isThumbnailInteractionLocked={isThumbnailInteractionLocked}
        imageUrlByIdForRender={imageUrlByIdForRender}
        pageStart={pageStart}
        adReviewGroupByPackageRows={adReviewGroupByPackageRows}
        adReviewPerformanceMode={isAdReviewPerformanceMode}
        showSkeleton={showSkeleton}
        skeletonCount={skeletonCount}
        vectorMode={vectorMode}
        vectorCandidates={vectorCandidates}
        marqueeStyle={marqueeStyle}
        adReviewStartDialogOpen={adReviewStartDialogOpen}
        manageReviewMode={manageReviewMode}
        setAdReviewStartDialogOpen={setAdReviewStartDialogOpen}
        startToolbarAdReviewWithOption={startToolbarAdReviewWithOption}
        metadataFetchOpen={metadataFetchOpen}
        effectiveMetadataFetchTargets={effectiveMetadataFetchTargets}
        metadataProxyServer={metadataProxyServer}
        metadataPending={metadataPending}
        setMetadataFetchOpen={setMetadataFetchOpen}
        handleSaveParsedMetadataByPackageId={
          handleSaveParsedMetadataByPackageId
        }
      />
    </>
  );
}

export default ImageMainSection;
