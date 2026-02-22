import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type WheelEvent as ReactWheelEvent,
} from "react";

import { MainUiIcon } from "./MainUiIcon";
import { ToolbarTitleMarquee } from "./ToolbarTitleMarquee";
import { VideoControlIcon } from "./VideoControlIcon";
import { renderImageMainContent } from "./ImageMainSection.renderers";
import type { ImageMainSectionProps } from "./ImageMainSection.types";
import { mapMediaLocatorToDto } from "../features/backend";
import { useManageImageSelectionInteractions } from "../features/management/useManageImageSelectionInteractions";
import { buildA11yPropsByRegistry } from "../i18n/a11y";
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
import MetadataFetchPanel from "./metadata/MetadataFetchPanel";
import { formatPercent } from "./metadata/metadataPanelUtils";

const IS_TEST_MODE = import.meta.env.MODE === "test";
const EMPTY_IMAGE_ID_SET = new Set<string>();

type ImageConvertTaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "cancelled"
  | "failed";

function resolveTaskIdFromStartResponse(response: unknown): string | null {
  if (!response || typeof response !== "object") {
    return null;
  }
  const directTaskId = (response as { task_id?: unknown }).task_id;
  if (typeof directTaskId === "string" && directTaskId.trim().length > 0) {
    return directTaskId;
  }
  const nestedTaskId = (response as { task?: { task_id?: unknown } }).task?.task_id;
  if (typeof nestedTaskId === "string" && nestedTaskId.trim().length > 0) {
    return nestedTaskId;
  }
  return null;
}

function ImageMainSection({
  fullscreenActive = false,
  vectorMode,
  showNamesOnly,
  metadataManageMode,
  thumbnailScaleLevel = 1,
  thumbnailScaleLevelCount = 9,
  canThumbnailScaleDown = true,
  canThumbnailScaleUp = true,
  imageConvertScale = 1,
  imageConvertLongestEdgePx = null,
  imageConvertFormat = "webp",
  imageConvertQuality = 80,
  imageConvertPreviewMode = false,
  imageConvertPreviewScale = 1,
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
  adReviewScopeImageIds: _adReviewScopeImageIds,
  adReviewLlmReviewedImageIds: _adReviewLlmReviewedImageIds,
  adReviewNonLlmReviewedImageIds: _adReviewNonLlmReviewedImageIds,
  adReviewCandidateImageIds = EMPTY_IMAGE_ID_SET,
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
  metadataTargetPackageLabel,
  metadataFetchDefaultText,
  metadataProxyServer,
  metadataEhentaiCookies,
  onMetadataSyncName,
  onMetadataSaveParsed,
  nodeBrowseMode = false,
  nodeBrowseLabel = "",
  nodeBrowseItems = [],
  onSelectNodeBrowseItem,
  onThumbnailWheelTurnPage,
  onThumbnailWheelSwitchSidebarNode,
}: ImageMainSectionProps) {
  const markThumbInputMouse = () => {
    document.documentElement.dataset.mpxThumbInput = "mouse";
  };

  const thumbOriginRafRef = useRef<number | null>(null);
  const lastOriginElRef = useRef<HTMLElement | null>(null);

  const scrollFocusedThumbIntoView = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const thumbCard = target.closest(".thumb-card");
    if (!(thumbCard instanceof HTMLElement)) {
      return;
    }
    if (typeof thumbCard.scrollIntoView === "function") {
      thumbCard.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: "auto",
      });
    }
  };

  const syncFocusedThumbTransformOrigin = useCallback(() => {
    const container = gridRef.current;
    if (!container) {
      return;
    }

    const focusedThumb = container.querySelector(".thumb-card.is-focused");
    if (!(focusedThumb instanceof HTMLElement)) {
      if (lastOriginElRef.current) {
        lastOriginElRef.current.style.removeProperty("--mpx-thumb-origin-x");
        lastOriginElRef.current.style.removeProperty("--mpx-thumb-origin-y");
        lastOriginElRef.current = null;
      }
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const rect = focusedThumb.getBoundingClientRect();
    const scale = 1.1;
    const halo = 22;
    const needX = (rect.width * (scale - 1)) / 2 + halo;
    const needY = (rect.height * (scale - 1)) / 2 + halo;

    const leftSpace = rect.left - containerRect.left;
    const rightSpace = containerRect.right - rect.right;
    const topSpace = rect.top - containerRect.top;
    const bottomSpace = containerRect.bottom - rect.bottom;

    let originX = "50%";
    if (leftSpace < needX && rightSpace >= needX) {
      originX = "0%";
    } else if (rightSpace < needX && leftSpace >= needX) {
      originX = "100%";
    } else if (leftSpace < needX && rightSpace < needX) {
      originX = leftSpace >= rightSpace ? "100%" : "0%";
    }

    let originY = "50%";
    if (topSpace < needY && bottomSpace >= needY) {
      originY = "0%";
    } else if (bottomSpace < needY && topSpace >= needY) {
      originY = "100%";
    } else if (topSpace < needY && bottomSpace < needY) {
      originY = topSpace >= bottomSpace ? "100%" : "0%";
    }

    focusedThumb.style.setProperty("--mpx-thumb-origin-x", originX);
    focusedThumb.style.setProperty("--mpx-thumb-origin-y", originY);

    if (lastOriginElRef.current && lastOriginElRef.current !== focusedThumb) {
      lastOriginElRef.current.style.removeProperty("--mpx-thumb-origin-x");
      lastOriginElRef.current.style.removeProperty("--mpx-thumb-origin-y");
    }
    lastOriginElRef.current = focusedThumb;
  }, [gridRef]);

  const scheduleFocusedThumbOriginSync = useCallback(() => {
    if (thumbOriginRafRef.current != null) {
      return;
    }
    thumbOriginRafRef.current = window.requestAnimationFrame(() => {
      thumbOriginRafRef.current = null;
      syncFocusedThumbTransformOrigin();
    });
  }, [syncFocusedThumbTransformOrigin]);
  const { t } = useI18n();
  void _adReviewScopeImageIds;
  void _adReviewLlmReviewedImageIds;
  void _adReviewNonLlmReviewedImageIds;
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
  const [imageConvertTaskId, setImageConvertTaskId] = useState<string | null>(null);
  const [imageConvertTaskStatus, setImageConvertTaskStatus] =
    useState<ImageConvertTaskStatus | null>(null);
  const [imageConvertTaskProgress, setImageConvertTaskProgress] = useState(0);
  const [imageConvertTaskMessage, setImageConvertTaskMessage] = useState<string | null>(null);
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

  useEffect(() => {
    // Keep focused thumbnail fully visible when navigating via keyboard,
    // so the focus ring / glow won't get clipped by the scroll viewport.
    if (document.documentElement.dataset.mpxThumbInput !== "keyboard") {
      return;
    }

    const container = gridRef.current;
    if (!container) {
      return;
    }

    const focusedThumb = container.querySelector(".thumb-card.is-focused");
    if (!(focusedThumb instanceof HTMLElement)) {
      return;
    }

    if (typeof focusedThumb.scrollIntoView === "function") {
      focusedThumb.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: "auto",
      });
    }
    scheduleFocusedThumbOriginSync();
  }, [
    focusedRef?.packageId,
    focusedRef?.imageIndex,
    gridRef,
    scheduleFocusedThumbOriginSync,
  ]);

  useEffect(() => {
    if (IS_TEST_MODE) {
      return;
    }

    const container = gridRef.current;
    const handle = () => scheduleFocusedThumbOriginSync();
    if (container) {
      container.addEventListener("scroll", handle, { passive: true });
    }
    window.addEventListener("resize", handle);

    scheduleFocusedThumbOriginSync();
    return () => {
      if (container) {
        container.removeEventListener("scroll", handle);
      }
      window.removeEventListener("resize", handle);
      if (thumbOriginRafRef.current != null) {
        window.cancelAnimationFrame(thumbOriginRafRef.current);
        thumbOriginRafRef.current = null;
      }
    };
  }, [nodeBrowseMode, showNamesOnly, gridRef, scheduleFocusedThumbOriginSync]);

  useEffect(() => {
    if (IS_TEST_MODE) {
      return;
    }
    scheduleFocusedThumbOriginSync();
  }, [
    focusedRef?.packageId,
    focusedRef?.imageIndex,
    scheduleFocusedThumbOriginSync,
  ]);

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
    clearScalePopoverHideTimer();
    scalePopoverHideTimerRef.current = window.setTimeout(() => {
      setOpenScalePopover(false);
      scalePopoverHideTimerRef.current = null;
    }, 140);
  };

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

      setPendingThumbnailSession(thumbnailGridSession);
      return;
    }

    setPendingThumbnailSession((previous) => {
      if (previous?.key === thumbnailGridSession.key) {
        return previous;
      }
      return thumbnailGridSession;
    });
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

  useEffect(() => {
    if (!showNamesOnly) {
      return;
    }

    if (IS_TEST_MODE) {
      return;
    }

    const api = window.mediaPlayerBackend;
    if (!api?.readImageMetadata) {
      return;
    }

    const canResolveOriginal = typeof api.resolveMediaResource === "function";

    let cancelled = false;
    const maxConcurrent = 2;

    const itemsToLoad: Array<{
      imageId: string;
      packageId: string;
      imageIndex: number;
      locatorDto: ReturnType<typeof mapMediaLocatorToDto>;
    }> = [];
    const loadingSet = nameListDimsLoadingRef.current;
    const startIndex = Math.max(0, nameListRange.start);
    const endIndex = Math.min(
      visibleImageRefs.length,
      Math.max(nameListRange.end, startIndex),
    );
    for (let index = startIndex; index < endIndex; index += 1) {
      const ref = visibleImageRefs[index];
      const pkg = packageById.get(ref.packageId);
      const image = pkg?.images[ref.imageIndex];
      if (!image) {
        continue;
      }

      const existing = nameListDimsById[image.id];
      const width = existing?.width ?? image.width;
      const height = existing?.height ?? image.height;
      if (width > 0 && height > 0) {
        continue;
      }

      if (loadingSet.has(image.id)) {
        continue;
      }

      loadingSet.add(image.id);
      itemsToLoad.push({
        imageId: image.id,
        packageId: ref.packageId,
        imageIndex: ref.imageIndex,
        locatorDto: mapMediaLocatorToDto(image.mediaLocator),
      });
    }

    if (itemsToLoad.length === 0) {
      return;
    }

    const loadDimsFromUrl = (
      url: string,
    ): Promise<{ width: number; height: number } | null> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.loading = "eager";
        img.onload = () => {
          const width = img.naturalWidth || img.width || 0;
          const height = img.naturalHeight || img.height || 0;
          resolve(width > 0 && height > 0 ? { width, height } : null);
        };
        img.onerror = () => resolve(null);
        img.src = url;
      });
    };

    let cursor = 0;
    const workers = Array.from(
      { length: Math.min(maxConcurrent, itemsToLoad.length) },
      async () => {
        while (!cancelled) {
          const index = cursor;
          cursor += 1;
          const next = itemsToLoad[index];
          if (!next) {
            return;
          }

          try {
            const response = await api.readImageMetadata({
              package_id: next.packageId,
              image_index: next.imageIndex,
              include_hidden: manageMode,
            });
            const width = response?.image?.width ?? 0;
            const height = response?.image?.height ?? 0;
            if (!cancelled && width > 0 && height > 0) {
              setNameListDimsById((previous) => {
                if (previous[next.imageId]) {
                  return previous;
                }
                return { ...previous, [next.imageId]: { width, height } };
              });
              continue;
            }

            if (!cancelled && canResolveOriginal) {
              const resource = await api.resolveMediaResource({
                locator: next.locatorDto,
                preferred_variant: "original",
              });
              const dims = resource?.resource_url
                ? await loadDimsFromUrl(resource.resource_url)
                : null;
              if (!cancelled && dims) {
                setNameListDimsById((previous) => {
                  if (previous[next.imageId]) {
                    return previous;
                  }
                  return { ...previous, [next.imageId]: dims };
                });
              }
            }
          } catch {
            // ignore
          } finally {
            loadingSet.delete(next.imageId);
          }
        }
      },
    );

    void Promise.all(workers);
    return () => {
      cancelled = true;
      for (const item of itemsToLoad) {
        loadingSet.delete(item.imageId);
      }
    };
  }, [
    manageMode,
    nameListDimsById,
    nameListRange.end,
    nameListRange.start,
    packageById,
    showNamesOnly,
    visibleImageRefs,
  ]);

  const { marqueeStyle, startMarqueeSelection, startThumbnailDragToggle } =
    useManageImageSelectionInteractions({
      manageMode,
      onReplaceCheckedImages,
      onToggleImageChecked,
      onSelectImage,
      focusOnFirstToggle: !adReviewResultsMode,
    });

  const manageSummary =
    activeSelectionScope === "sidebar"
      ? t("a11y.manage.selectedSidebarNodes", { count: sidebarSelectedCount })
      : activeSelectionScope === "image"
        ? t("a11y.manage.selectedMediaItems", { count: imageSelectedCount })
        : t("a11y.manage.noSelection");

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
    imageConvertTaskStatus === "pending" || imageConvertTaskStatus === "running";
  const convertInteractionLocked = pendingManageAction || imageConvertExecuting;

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
        const response = await readImageConvertTask({ task_id: imageConvertTaskId });
        const task = (response as { task?: { status?: ImageConvertTaskStatus; progress?: number; message?: string | null } })?.task;
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

        if (nextStatus === "completed" || nextStatus === "cancelled" || nextStatus === "failed") {
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

  const renderScaleControl = () => (
    <div
      className={`header-popover-control main-toolbar-scale-control ${openScalePopover ? "is-open" : ""}`}
      data-slot="fg-main-toolbar-image-scale-pop"
      role="group"
      aria-label={t("a11y.header.thumbnailScaleGroup")}
      onMouseEnter={openScalePopoverByHover}
      onMouseLeave={closeScalePopoverByHover}
    >
      <button
        {...buildA11yPropsByRegistry({
          key: "headerThumbnailScale",
          t,
        })}
        className="toolbar-icon-btn header-popover-trigger"
        disabled={!canThumbnailScaleDown && !canThumbnailScaleUp}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="main-ui-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
          <path d="M11 8v6" />
          <path d="M8 11h6" />
        </svg>
      </button>

      <div
        className="header-popover-panel"
        hidden={!openScalePopover}
        role="dialog"
        aria-label={t("a11y.header.scaleSettings")}
      >
        <div
          className="header-vertical-slider"
          role="group"
          aria-label={t("a11y.header.scaleLevels")}
        >
          <div className="header-vertical-slider-value">
            {Math.max(
              1,
              Math.min(thumbnailScaleLevelCount, Math.round(scaleDraftValue)),
            )}
          </div>
          <div className="header-vertical-slider-body">
            <input
              {...buildA11yPropsByRegistry({
                key: "headerScaleSlider",
                t,
              })}
              className="header-vertical-range"
              max={thumbnailScaleLevelCount}
              min={1}
              step={0.01}
              type="range"
              value={scaleDraftValue}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                setScaleDraftValue(nextValue);
                const roundedLevel = Math.max(
                  1,
                  Math.min(thumbnailScaleLevelCount, Math.round(nextValue)),
                );
                onThumbnailScaleLevelChange?.(roundedLevel);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );

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

    onThumbnailWheelTurnPage?.(direction);
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
                title={
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
                title={t("tip.common.hide")}
                disabled={!canManageHide || convertInteractionLocked}
                onClick={onManageHide}
              >
                <MainUiIcon name="hidden" />
              </button>
              <button
                className="feature-action-btn main-icon-square-btn"
                type="button"
                aria-label={t("a11y.common.unhide")}
                title={t("tip.common.unhide")}
                disabled={!canManageUnhide || convertInteractionLocked}
                onClick={onManageUnhide}
              >
                <MainUiIcon name="reveal" />
              </button>
              <button
                className="feature-action-btn main-icon-square-btn"
                type="button"
                aria-label={t("a11y.common.organize")}
                title={t("tip.common.organize")}
                disabled={!canManageMoveNodes || convertInteractionLocked}
                onClick={onManageGroup}
              >
                <MainUiIcon name="organize" />
              </button>
              <button
                className="feature-action-btn main-icon-square-btn"
                type="button"
                aria-label={t("a11y.common.rename")}
                title={t("tip.common.rename")}
                disabled={!hasAnyManageSelection || convertInteractionLocked}
                onClick={onManageRename}
              >
                <MainUiIcon name="rename" />
              </button>
              <button
                className={`feature-action-btn main-icon-square-btn ${
                  imageConvertPanelOpen || imageConvertPreviewMode ? "is-active" : ""
                }`}
                type="button"
                aria-label="RS"
                title="RS"
                disabled={!canManageImageConvert || convertInteractionLocked}
                onClick={() => setImageConvertPanelOpen((value) => !value)}
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
                title={
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
                  title={t("tip.manage.adReview")}
                  disabled={convertInteractionLocked}
                  onClick={onToggleAdReviewPanel}
                >
                  <MainUiIcon name="adSearch" />
                </button>
              ) : null}
              {showAdReviewToolbarControls &&
              !isReviewRunningOrPaused &&
              !isReviewWithCandidates &&
              canSwitchManageReviewMode ? (
                <button
                  className="manage-ad-review-icon-btn main-icon-square-btn"
                  type="button"
                  disabled={convertInteractionLocked || adReviewPending}
                  onClick={() =>
                    onManageReviewModeChange(
                      manageReviewMode === "ad" ? "cover" : "ad",
                    )
                  }
                  title={
                    manageReviewMode === "ad"
                      ? t("ui.manage.adReviewTitle")
                      : t("ui.manage.coverReviewTitle")
                  }
                >
                  <span aria-hidden="true">
                    {manageReviewMode === "ad" ? "AD" : "C"}
                  </span>
                </button>
              ) : null}
              {showAdReviewToolbarControls &&
              !isReviewRunningOrPaused &&
              !isReviewWithCandidates &&
              manageReviewMode === "ad" ? (
                <div
                  className={`header-popover-control main-toolbar-ad-review-strategy-control ${
                    openAdReviewStrategyPopover ? "is-open" : ""
                  }`}
                  onMouseEnter={openAdReviewStrategyPopoverByHover}
                  onMouseLeave={closeAdReviewStrategyPopoverByHover}
                >
                  <button
                    className={`manage-ad-review-icon-btn main-icon-square-btn header-popover-trigger ${
                      adReviewStrategyMode === "head-tail" ? "is-active" : ""
                    }`}
                    type="button"
                    aria-label={t("a11y.manage.strategyToggle")}
                    title={
                      adReviewStrategyMode === "head-tail"
                        ? t("tip.manage.strategyHeadTailToAll")
                        : t("tip.manage.strategyAllToHeadTail")
                    }
                    disabled={pendingManageAction || adReviewPending}
                    onClick={() =>
                      onAdReviewStrategyModeChange(
                        adReviewStrategyMode === "head-tail"
                          ? "all"
                          : "head-tail",
                      )
                    }
                  >
                    <span aria-hidden="true">
                      {adReviewStrategyMode === "head-tail" ? "H" : "A"}
                    </span>
                  </button>

                  <div
                    className="header-popover-panel main-toolbar-ad-review-strategy-panel"
                    data-slot="fg-main-toolbar-image-ad-review-strategy-pop"
                    hidden={
                      !openAdReviewStrategyPopover ||
                      adReviewStrategyMode !== "head-tail"
                    }
                    role="dialog"
                    aria-label={t("a11y.manage.strategyPanel")}
                  >
                    <p className="main-toolbar-ad-review-strategy-title">
                      {t("ui.manage.strategyHeadTailPanelTitle")}
                    </p>

                    <div className="main-toolbar-ad-review-slider-row">
                      <span>{t("ui.manage.concurrency")}</span>
                      <input
                        type="range"
                        min={1}
                        max={20}
                        step={1}
                        value={adReviewMaxConcurrency}
                        onChange={(event) =>
                          onAdReviewMaxConcurrencyChange(
                            Number(event.target.value),
                          )
                        }
                      />
                      <strong>{adReviewMaxConcurrency}</strong>
                    </div>
                    <p className="main-toolbar-ad-review-slider-hint">
                      {t("ui.manage.strategyHintConcurrency")}
                    </p>

                    <div className="main-toolbar-ad-review-slider-row">
                      <span>{t("ui.manage.headWindow")}</span>
                      <input
                        type="range"
                        min={1}
                        max={20}
                        step={1}
                        value={adReviewHeadN}
                        onChange={(event) =>
                          onAdReviewHeadNChange(Number(event.target.value))
                        }
                      />
                      <strong>{adReviewHeadN}</strong>
                    </div>
                    <p className="main-toolbar-ad-review-slider-hint">
                      {t("ui.manage.strategyHintHead")}
                    </p>

                    <div className="main-toolbar-ad-review-slider-row">
                      <span>{t("ui.manage.tailWindow")}</span>
                      <input
                        type="range"
                        min={1}
                        max={20}
                        step={1}
                        value={adReviewTailN}
                        onChange={(event) =>
                          onAdReviewTailNChange(Number(event.target.value))
                        }
                      />
                      <strong>{adReviewTailN}</strong>
                    </div>
                    <p className="main-toolbar-ad-review-slider-hint">
                      {t("ui.manage.strategyHintTail")}
                    </p>

                    <div className="main-toolbar-ad-review-slider-row">
                      <span>{t("ui.manage.tailStopClean")}</span>
                      <input
                        type="range"
                        min={1}
                        max={20}
                        step={1}
                        value={adReviewTailStopCleanStreak}
                        onChange={(event) =>
                          onAdReviewTailStopCleanStreakChange(
                            Number(event.target.value),
                          )
                        }
                      />
                      <strong>{adReviewTailStopCleanStreak}</strong>
                    </div>
                    <p className="main-toolbar-ad-review-slider-hint">
                      {t("ui.manage.strategyHintTailStop")}
                    </p>
                  </div>
                </div>
              ) : null}
              {showAdReviewToolbarControls && isReviewRunningOrPaused ? (
                <>
                  <div
                    className={`header-popover-control main-toolbar-ad-review-progress-control ${openAdReviewProgressPopover ? "is-open" : ""}`}
                    onMouseEnter={openAdReviewProgressPopoverByHover}
                    onMouseLeave={closeAdReviewProgressPopoverByHover}
                  >
                    <button
                      className="main-toolbar-ad-review-running-pill"
                      type="button"
                      aria-label={t("ui.manage.progress", {
                        percent: Math.round(
                          (adReviewTask?.progress ?? 0) * 100,
                        ),
                        reviewed: adReviewTask?.reviewed_count ?? 0,
                        total: adReviewTask?.total_count ?? 0,
                      })}
                      title={t("ui.manage.progress", {
                        percent: Math.round(
                          (adReviewTask?.progress ?? 0) * 100,
                        ),
                        reviewed: adReviewTask?.reviewed_count ?? 0,
                        total: adReviewTask?.total_count ?? 0,
                      })}
                    >
                      {t("ui.manage.progress", {
                        percent: Math.round(
                          (adReviewTask?.progress ?? 0) * 100,
                        ),
                        reviewed: adReviewTask?.reviewed_count ?? 0,
                        total: adReviewTask?.total_count ?? 0,
                      })}
                    </button>

                    <div
                      className="header-popover-panel main-toolbar-ad-review-progress-panel"
                      data-slot="fg-main-toolbar-image-ad-review-progress-pop"
                      hidden={!openAdReviewProgressPopover}
                      role="dialog"
                      aria-label={t("ui.manage.progress", {
                        percent: Math.round(
                          (adReviewTask?.progress ?? 0) * 100,
                        ),
                        reviewed: adReviewTask?.reviewed_count ?? 0,
                        total: adReviewTask?.total_count ?? 0,
                      })}
                    >
                      {adReviewTask ? (
                        <>
                          <p className="main-toolbar-ad-review-progress-line">
                            {`策略 ${adReviewTask.execution?.strategy.mode === "head-tail" ? "head-tail" : "all"} 并发 ${adReviewTask.execution?.max_concurrency ?? adReviewMaxConcurrency}`}
                          </p>
                          <p className="main-toolbar-ad-review-progress-line">
                            {`头部 ${adReviewTask.execution?.strategy.mode === "head-tail" ? adReviewTask.execution.strategy.head_n : "-"} 尾部 ${adReviewTask.execution?.strategy.mode === "head-tail" ? adReviewTask.execution.strategy.tail_n : "-"} 尾部截止 ${adReviewTask.execution?.strategy.mode === "head-tail" ? adReviewTask.execution.strategy.tail_stop_clean_streak : "-"}`}
                          </p>
                          {adReviewTask.audit ? (
                            <>
                              <p className="main-toolbar-ad-review-progress-line">
                                {`来源 known-hash ${adReviewTask.audit.source_distribution.known_hash} strategy-skip ${adReviewTask.audit.source_distribution.strategy_skipped}`}
                              </p>
                              <p className="main-toolbar-ad-review-progress-line">
                                {`LLM 疑似 ${adReviewTask.audit.source_distribution.llm_suspected} 正常 ${adReviewTask.audit.source_distribution.llm_clean} 失败 ${adReviewTask.audit.source_distribution.llm_failed}`}
                              </p>
                              <p className="main-toolbar-ad-review-progress-line">
                                {`命中率 LLM ${formatPercent(adReviewTask.audit.llm_hit_rate)} 总体 ${formatPercent(adReviewTask.audit.overall_hit_rate)}`}
                              </p>
                            </>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>
                  <button
                    className={`manage-ad-review-icon-btn main-icon-square-btn manage-ad-review-exec-btn ${adReviewRunning ? "is-running" : ""}`}
                    type="button"
                    aria-label={
                      adReviewRunning
                        ? t("a11y.manage.pause")
                        : t("a11y.manage.start")
                    }
                    title={
                      adReviewRunning
                        ? t("a11y.manage.pause")
                        : t("a11y.manage.start")
                    }
                    disabled={
                      convertInteractionLocked ||
                      adReviewPending ||
                      (!adReviewRunning && !canExecuteAdReview)
                    }
                    onClick={triggerToolbarAdReviewStartOrPause}
                  >
                    <span aria-hidden="true">
                      {adReviewRunning ? "⏸" : "▶"}
                    </span>
                  </button>
                  {adReviewTask ? (
                    <button
                      className="manage-ad-review-icon-btn main-icon-square-btn"
                      type="button"
                      aria-label={t("ui.manage.removeTask")}
                      title={t("ui.manage.removeTask")}
                      disabled={
                        pendingManageAction ||
                        adReviewPending ||
                        adReviewDeletePending ||
                        adReviewTask.status === "running"
                      }
                      onClick={() => onRemoveAdReviewTask(adReviewTask.task_id)}
                    >
                      <span aria-hidden="true">X</span>
                    </button>
                  ) : null}
                </>
              ) : null}
              {showAdReviewToolbarControls && isReviewWithCandidates ? (
                <>
                  <button
                    className={`main-toolbar-ad-review-review-pill ${adReviewFocusActive ? "is-active" : ""}`}
                    type="button"
                    aria-label={t("a11y.manage.focus")}
                    title={t("a11y.manage.focus")}
                    disabled={
                      pendingManageAction ||
                      adReviewPending ||
                      !hasAdReviewFocusCandidates
                    }
                    onClick={() => {
                      if (!adReviewFocusActive) {
                        onToggleAdReviewFocus();
                      }
                    }}
                  >
                    {t("ui.manage.reviewToolbarProgress", {
                      selected: selectedAdReviewCandidateCount,
                      total: adReviewTask?.candidates.length ?? 0,
                    })}
                  </button>
                  {adReviewTask ? (
                    <button
                      className="manage-ad-review-icon-btn main-icon-square-btn"
                      type="button"
                      aria-label={t("ui.manage.removeTask")}
                      title={t("ui.manage.removeTask")}
                      disabled={
                        pendingManageAction ||
                        adReviewPending ||
                        adReviewDeletePending
                      }
                      onClick={() => onRemoveAdReviewTask(adReviewTask.task_id)}
                    >
                      <span aria-hidden="true">X</span>
                    </button>
                  ) : null}
                  <button
                    className="manage-ad-review-icon-btn main-icon-square-btn"
                    type="button"
                    aria-label={t("ui.manage.delete")}
                    title={t("ui.manage.delete")}
                    disabled={
                      pendingManageAction ||
                      adReviewPending ||
                      !hasCheckedAdReviewCandidates
                    }
                    onClick={onDeleteSelectedAdReviewCandidates}
                  >
                    <span aria-hidden="true">D</span>
                  </button>
                  <button
                    className="manage-ad-review-icon-btn main-icon-square-btn"
                    type="button"
                    aria-label={t("ui.manage.resetDismiss")}
                    title={t("ui.manage.resetDismiss")}
                    disabled={pendingManageAction || adReviewPending}
                    onClick={onDismissAdReviewTask}
                  >
                    <span aria-hidden="true">R</span>
                  </button>
                </>
              ) : null}
              {showAdReviewToolbarControls &&
              !isReviewWithCandidates &&
              !isReviewRunningOrPaused ? (
                <button
                  className={`manage-ad-review-icon-btn main-icon-square-btn manage-ad-review-exec-btn ${adReviewRunning ? "is-running" : ""}`}
                  type="button"
                  aria-label={
                    adReviewRunning
                      ? t("a11y.manage.pause")
                      : t("a11y.manage.start")
                  }
                  title={
                    adReviewRunning
                      ? t("a11y.manage.pause")
                      : t("a11y.manage.start")
                  }
                  disabled={
                    pendingManageAction ||
                    adReviewPending ||
                    (!adReviewRunning && !canExecuteAdReview)
                  }
                  onClick={triggerToolbarAdReviewStartOrPause}
                >
                  <span aria-hidden="true">{adReviewRunning ? "⏸" : "▶"}</span>
                </button>
              ) : null}
              {!showAdReviewToolbarControls && manageOperationHint ? (
                <span className="main-toolbar-hint">{manageOperationHint}</span>
              ) : null}
              {imageConvertPanelOpen && !fullscreenActive && !imageConvertPreviewMode ? (
                <div
                  className="settings-floating-mask"
                  data-slot="fg-main-toolbar-image-rs-panel"
                  role="dialog"
                  aria-modal="true"
                  aria-label="RS 转换设置"
                  onMouseDown={(event) => {
                    if (event.target !== event.currentTarget || imageConvertExecuting) {
                      return;
                    }
                    if (imageConvertPreviewMode) {
                      onCancelImageConvertPreview();
                    }
                    stopImageConvertExecution();
                    setImageConvertPanelOpen(false);
                  }}
                >
                  <section
                    className="settings-floating-panel main-toolbar-image-convert-panel main-toolbar-image-convert-dialog"
                    onMouseDown={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <h3 className="main-toolbar-image-convert-title">RS 转换设置</h3>
                    <label className="main-toolbar-image-convert-row">
                      <span>Scale {imageConvertScale.toFixed(1)}</span>
                      <input
                        type="range"
                        min={0.1}
                        max={1.0}
                        step={0.1}
                        value={imageConvertScale}
                        disabled={imageConvertExecuting}
                        onChange={(event) =>
                          onImageConvertScaleChange(Number(event.target.value))
                        }
                      />
                    </label>
                    <label className="main-toolbar-image-convert-row">
                      <span>Longest Edge</span>
                      <input
                        type="number"
                        min={1}
                        max={16384}
                        step={1}
                        placeholder="留空=按Scale"
                        value={imageConvertLongestEdgePx == null ? "" : imageConvertLongestEdgePx}
                        disabled={imageConvertExecuting}
                        onChange={(event) => {
                          const rawValue = event.target.value.trim();
                          if (rawValue.length === 0) {
                            onImageConvertLongestEdgePxChange(null);
                            return;
                          }
                          const parsed = Number(rawValue);
                          if (!Number.isFinite(parsed)) {
                            return;
                          }
                          onImageConvertLongestEdgePxChange(parsed);
                        }}
                      />
                    </label>
                    <label className="main-toolbar-image-convert-row">
                      <span>Format</span>
                      <select
                        value={imageConvertFormat}
                        disabled={imageConvertExecuting}
                        onChange={(event) =>
                          onImageConvertFormatChange(
                            event.target.value as "webp" | "jpeg" | "png" | "avif",
                          )
                        }
                      >
                        <option value="webp">Webp</option>
                        <option value="jpeg">Jpeg</option>
                        <option value="png">Png</option>
                        <option value="avif">Avif</option>
                      </select>
                    </label>
                    <label className="main-toolbar-image-convert-row">
                      <span>Quality {imageConvertQuality}</span>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        step={5}
                        value={imageConvertQuality}
                        disabled={imageConvertExecuting}
                        onChange={(event) =>
                          onImageConvertQualityChange(Number(event.target.value))
                        }
                      />
                    </label>
                    <label className="main-toolbar-image-convert-row">
                      <span>Threads {imageConvertConcurrency}</span>
                      <input
                        type="range"
                        min={1}
                        max={16}
                        step={1}
                        value={imageConvertConcurrency}
                        disabled={imageConvertExecuting}
                        onChange={(event) =>
                          setImageConvertConcurrency(Number(event.target.value))
                        }
                      />
                    </label>
                    {imageConvertTaskStatus ? (
                      <p className="main-toolbar-hint">
                        {`RS ${imageConvertTaskStatus} ${Math.round(imageConvertTaskProgress * 100)}%${imageConvertTaskMessage ? ` | ${imageConvertTaskMessage}` : ""}`}
                      </p>
                    ) : null}
                    <div className="settings-floating-actions manage-group-actions">
                      <button
                        type="button"
                        disabled={imageConvertExecuting}
                        title={
                          imageConvertPreviewMode
                            ? `Preview ${imageConvertPreviewScale.toFixed(1)} ${imageConvertPreviewFormat.toUpperCase()} Q${Math.round(imageConvertPreviewQuality)}`
                            : "预览"
                        }
                        onClick={() => {
                          setImageConvertPanelOpen(false);
                          onOpenImageConvertPreview();
                        }}
                      >
                        预览
                      </button>
                      <button
                        type="button"
                        disabled={imageConvertExecuting}
                        onClick={async () => {
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
                        }}
                      >
                        确定
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (imageConvertExecuting && imageConvertTaskId) {
                            try {
                              await window.mediaPlayerBackend?.cancelImageConvertTask?.({ task_id: imageConvertTaskId });
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
                        }}
                      >
                        取消
                      </button>
                    </div>
                  </section>
                </div>
              ) : null}
            </div>
            <div className="toolbar-actions toolbar-actions-manage-secondary">
              <strong className="main-toolbar-summary" title={manageSummary}>
                {manageSummary}
              </strong>
              {renderScaleControl()}
            </div>
          </>
        ) : metadataManageMode ? (
          <>
            <span hidden data-slot="fg-main-toolbar-state-metadata" />
            <strong className="main-toolbar-title">
              {t("ui.header.metadataManage")}
            </strong>
            <div className="toolbar-actions toolbar-actions-manage">
              <button
                className="feature-action-btn main-icon-square-btn"
                type="button"
                aria-label={t("a11y.common.syncName")}
                title={t("tip.common.syncName")}
                disabled={metadataPending}
                onClick={onMetadataSyncName}
              >
                <MainUiIcon name="refresh" />
              </button>
              <button
                className="feature-action-btn main-icon-square-btn"
                type="button"
                aria-label={t("a11y.metadata.fetch")}
                title={t("a11y.metadata.fetch")}
                onClick={() => setMetadataFetchOpen(true)}
              >
                <MainUiIcon name="getMetaData" />
              </button>
              {manageOperationHint ? (
                <span className="main-toolbar-hint">{manageOperationHint}</span>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <span hidden data-slot="fg-main-toolbar-state-normal" />
            <ToolbarTitleMarquee text={browseToolbarTitle} />
            <div className="toolbar-actions toolbar-actions-image-mode">
              <div className="toolbar-actions toolbar-actions-image-primary">
                <button
                  className={`toolbar-icon-btn ${showNamesOnly ? "is-names-mode" : "is-grid-mode"}`}
                  type="button"
                  aria-label={
                    showNamesOnly
                      ? t("a11y.image.switchToGridMode")
                      : t("a11y.image.switchToNamesMode")
                  }
                  title={
                    showNamesOnly
                      ? t("tip.image.switchToGridMode")
                      : t("tip.image.switchToNamesMode")
                  }
                  onClick={onToggleShowNamesOnly}
                >
                  <MainUiIcon name={showNamesOnly ? "thumbnail" : "fileList"} />
                </button>
                {renderScaleControl()}
                <button
                  className="toolbar-icon-btn"
                  type="button"
                  aria-label={t("a11y.media.enterFullscreen")}
                  title={t("tip.media.enterFullscreen")}
                  onClick={onEnterFullscreen}
                  disabled={!focusedImageExists}
                >
                  <VideoControlIcon
                    className="main-ui-icon"
                    name="fullscreenExpand"
                  />
                </button>
                {canJumpToMusicFromBooklet ? (
                  <button
                    className="toolbar-icon-btn"
                    type="button"
                    aria-label={t("a11y.media.music")}
                    title={t("tip.media.music")}
                    onClick={onJumpToMusicFromBooklet}
                  >
                    <MainUiIcon name="musicMode" />
                  </button>
                ) : null}
              </div>
              {canJumpToAnimation ||
              (canJumpToMusic && !canJumpToMusicFromBooklet) ? (
                <div className="toolbar-actions toolbar-actions-series-jump">
                  {canJumpToAnimation ? (
                    <button
                      className="toolbar-icon-btn"
                      type="button"
                      aria-label={t("a11y.media.animation")}
                      title={t("tip.media.animation")}
                      onClick={onJumpToAnimation}
                    >
                      <MainUiIcon name="videoMode" />
                    </button>
                  ) : null}
                  {canJumpToMusic && !canJumpToMusicFromBooklet ? (
                    <button
                      className="toolbar-icon-btn"
                      type="button"
                      aria-label={t("a11y.media.music")}
                      title={t("tip.media.music")}
                      onClick={onJumpToMusic}
                    >
                      <MainUiIcon name="musicMode" />
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>

      {renderImageMainContent({
        nodeBrowseMode,
        showNamesOnly,
        manageMode,
        gridRef,
        handleThumbnailContainerWheel,
        thumbnailColumns,
        actualCellWidth,
        thumbnailGap,
        nodeBrowseItems,
        markThumbInputMouse,
        scrollFocusedThumbIntoView,
        scheduleFocusedThumbOriginSync,
        onSelectNodeBrowseItem,
        t,
        setNameListBodyEl,
        startMarqueeSelection,
        startThumbnailDragToggle,
        visibleImageRefs,
        packageById,
        nameListDimsById,
        focusedRef,
        checkedImageIds,
        adReviewCandidateImageIds,
        onSelectImage,
        onEnterFullscreen,
        refsInPageForRender,
        isThumbnailInteractionLocked,
        imageUrlByIdForRender,
        pageStart,
        adReviewGroupByPackageRows,
        showSkeleton,
        skeletonCount,
        vectorMode,
        vectorCandidates,
      })}

      {marqueeStyle && marqueeStyle.width > 2 && marqueeStyle.height > 2 ? (
        <div
          className="manage-selection-marquee"
          data-slot="fg-main-content-image-marquee-ovl"
          style={{
            left: `${marqueeStyle.left}px`,
            top: `${marqueeStyle.top}px`,
            width: `${marqueeStyle.width}px`,
            height: `${marqueeStyle.height}px`,
          }}
        />
      ) : null}

      {adReviewStartDialogOpen ? (
        <div
          className="manage-ad-review-start-mask"
          data-slot="fg-main-toolbar-image-ad-review-start-panel"
          role="dialog"
          aria-modal="true"
          aria-label={t("a11y.manage.startModeDialog")}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setAdReviewStartDialogOpen(false);
            }
          }}
        >
          <section
            className="settings-floating-panel manage-ad-review-start-dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h3>
              {manageReviewMode === "cover"
                ? t("ui.manage.startDialogTitleCover")
                : t("ui.manage.startDialogTitle")}
            </h3>
            <p className="manage-ad-review-start-description">
              {t("ui.manage.startDialogDescription")}
            </p>
            <div className="settings-floating-actions">
              <button
                type="button"
                onClick={() => startToolbarAdReviewWithOption(true)}
              >
                {t("ui.manage.startSkipScanned")}
              </button>
              <button
                type="button"
                onClick={() => startToolbarAdReviewWithOption(false)}
              >
                {t("ui.manage.startDontSkipScanned")}
              </button>
              <button
                type="button"
                onClick={() => setAdReviewStartDialogOpen(false)}
              >
                {t("ui.common.cancel")}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <MetadataFetchPanel
        open={metadataFetchOpen}
        defaultText={metadataFetchDefaultText}
        proxyServer={metadataProxyServer}
        ehentaiCookies={metadataEhentaiCookies}
        metadataPending={metadataPending}
        targetPackageLabel={metadataTargetPackageLabel}
        onClose={() => setMetadataFetchOpen(false)}
        onSaveParsedMetadata={onMetadataSaveParsed}
      />
    </>
  );
}

export default ImageMainSection;
