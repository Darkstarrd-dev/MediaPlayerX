import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

import type { BrowserMode, ImageItem, VideoItem } from "../types";
import { clamp } from "../utils/ui";
import { resolveFullscreenAutoplayControlEnabled } from "../utils/fullscreenAutoplay";
import type { VideoFitMode } from "../features/media/videoFitMode";
import type { ImageConvertAdjustProfile } from "../features/app/useAppSessionState";
import { buildA11yPropsByRegistry } from "../i18n/a11y";
import { useI18n } from "../i18n/useI18n";
import { FullscreenFooter } from "./fullscreen/FullscreenFooter";
import { FullscreenImageAdjustPanel } from "./fullscreen/FullscreenImageAdjustPanel";
import { RatingFavoriteControl } from "./metadata/RatingFavoriteControl";
import {
  FullscreenImagePane,
  FullscreenVideoPane,
} from "./fullscreen/FullscreenPanes";
import { resolveFullscreenControlsWidth } from "./fullscreen/controlsWidth";
import { useFullscreenImageSource } from "./fullscreen/useFullscreenImageSource";
import { useFullscreenImageAdjustPanelController } from "./fullscreen/useFullscreenImageAdjustPanelController";
import { useFullscreenViewportSize } from "./fullscreen/useFullscreenViewportSize";
import { useFullscreenWindowViewport } from "./fullscreen/useFullscreenWindowViewport";
import { FullscreenVideoControlsShell } from "./fullscreen/FullscreenVideoControls";
import {
  applyAlignedOffset,
  clampPaneTransform,
  computeMediaGeometry,
  computeMediaGeometryHeightAnchored,
  DEFAULT_PANE_ALIGN,
  DEFAULT_PANE_TRANSFORM,
  DUAL_ADAPTIVE_HORIZONTAL_DIFF_THRESHOLD_RATIO,
  MAX_SPLIT,
  MAX_ZOOM,
  MIN_SPLIT,
  MIN_ZOOM,
  resolveDualAdaptiveSplit,
  resolveDualAdaptiveStickySplit,
  resolveMediaAspect,
  ZOOM_STEP,
  type AlignDirection,
  type DualAdaptiveSplitResult,
  type DualAdaptiveSplitRule,
  type PaneAlign,
  type PaneKey,
  type PaneTransform,
} from "./fullscreen/paneMath";
import {
  estimateDataUrlSizeKb,
  formatImageSizeForFooter,
  formatVideoSizeForFooter,
  resolveConvertedImagePathForFooter,
  resolveDataUrlMimeType,
  resolveFormatLabelByMimeType,
  resolveImageConvertTargetSize,
  resolveMediaPathForFooter,
} from "./fullscreen/fullscreenImageAdjustUtils";
import { onFullscreenRatingFeedback } from "../utils/fullscreenRatingFeedback";

const DEFAULT_FULLSCREEN_VIDEO_CONTROLS_MAX_WIDTH = 980;
const DUAL_IMAGE_CONTROLS_COMPACT_WIDTH = 700;
const DUAL_IMAGE_CONTROLS_MIN_WITH_RIGHT_GROUP = 680;
const DUAL_VIDEO_CONTROLS_COMPACT_WIDTH = 620;
const DUAL_VIDEO_CONTROLS_MIN_WITH_LEFT_GROUP = 500;
const DUAL_IMAGE_CONTROLS_MIN_TWO_GROUPS = 460;
const DUAL_VIDEO_CONTROLS_MIN_TWO_GROUPS = 360;
const FULLSCREEN_DIVIDER_WIDTH = 8;
const FULLSCREEN_RATING_FEEDBACK_HOLD_MS = 1000;
const FULLSCREEN_RATING_FEEDBACK_FADE_MS = 500;
const FULLSCREEN_RATING_FEEDBACK_REMOVE_BUFFER_MS = 80;
const NOOP_RATING_CHANGE = () => undefined;

interface FullscreenRatingFeedbackState {
  id: number;
  grade: number | null;
  pane: PaneKey;
  fading: boolean;
}

export interface FullscreenLayerProps {
  mode: BrowserMode;
  fullscreenActive: boolean;
  showFullscreenFooter: boolean;
  fullscreenDisplay: "dual" | "video-only" | "image-only";
  fullscreenEntryDisplay: "video-only" | "image-only";
  fullscreenAlignRequest: { id: number; direction: AlignDirection } | null;
  fullscreenSwapped: boolean;
  fullscreenVideoFocus: boolean;
  fullscreenSplit: number;
  focusedImage: ImageItem | null;
  focusedImageSrc: string | null;
  focusedVideo: VideoItem | null;
  focusedVideoSrc: string | null;
  subtitleTrackUrl: string | null;
  subtitleVisible: boolean;
  subtitleLoading: boolean;
  subtitleMessage: string | null;
  subtitleOptions: Array<{
    id: string;
    label: string;
    format: "vtt" | "srt" | "ass" | "ssa";
  }>;
  selectedSubtitleId: string | null;
  autoSubtitleActive: boolean;
  liveSubtitleText: string | null;
  subtitleOverlayStyle: CSSProperties;
  bindFullscreenVideoElement: (element: HTMLVideoElement | null) => void;
  focusedVideoCoverImageSrc: string | null;
  durationSec: number;
  focusedVideoCoverColor: string;
  videoTime: number;
  videoPlaying: boolean;
  videoRate: number;
  videoVolume: number;
  videoMuted: boolean;
  videoFitMode: VideoFitMode;
  videoLoopMode: "single" | "list";
  fullscreenVideoControlsMaxWidth: number;
  fullscreenDecodeCacheSize?: number;
  autoPlayEnabled: boolean;
  autoPlayInterval: number;
  popoverDebugPinned: boolean;
  imageConvertPreviewMode?: boolean;
  imageConvertPreviewScale?: number;
  imageConvertPreviewLongestEdgePx?: number | null;
  imageConvertPreviewAdjustProfile?: ImageConvertAdjustProfile;
  imageConvertPreviewFormat?: "webp" | "jpeg" | "png" | "avif";
  imageConvertPreviewQuality?: number;
  imageConvertPreviewRenderedSrc?: string | null;
  imageConvertPreviewError?: string | null;
  onSetFooterVisible: (visible: boolean) => void;
  onSetDisplay: (display: "dual" | "video-only" | "image-only") => void;
  onToggleSwapSides: () => void;
  onSetVideoFocus: (enabled: boolean) => void;
  onSetSplit: (value: number) => void;
  onPrevImage: () => void;
  onNextImage: () => void;
  onPrevPackage: () => void;
  onNextPackage: () => void;
  onToggleAutoplay: () => void;
  onSetAutoplayInterval: (seconds: number) => void;
  onChangeImageConvertPreviewScale?: (value: number) => void;
  onChangeImageConvertPreviewFormat?: (
    value: "webp" | "jpeg" | "png" | "avif",
  ) => void;
  onChangeImageConvertPreviewQuality?: (value: number) => void;
  onApplyImageConvertPreviewScaleToLongestEdge?: (value: number | null) => void;
  onChangeImageConvertPreviewAdjustProfile?: (
    profile: ImageConvertAdjustProfile,
  ) => void;
  onConfirmImageConvertPreview?: () => void;
  onCancelImageConvertPreview?: () => void;
  onToggleVideoPlay: () => void;
  onPrevVideo: () => void;
  onNextVideo: () => void;
  onVideoEnded: () => void;
  onToggleSubtitle: () => void;
  onSelectSubtitle: (subtitleId: string) => void;
  playlistEntries: Array<{ id: string; label: string }>;
  selectedVideoId: string;
  onSelectVideo: (videoId: string) => void;
  onSaveCover: () => void;
  onSeekVideo: (time: number) => void;
  onVideoTimeUpdate: (time: number) => void;
  onVideoDurationDetected: (duration: number) => void;
  onToggleVideoMute: () => void;
  onChangeVideoVolume: (volume: number) => void;
  onChangeVideoRate: (rate: number) => void;
  onCycleVideoLoopMode: () => void;
  onCycleVideoFitMode: () => void;
  onSetVideoFitMode: (mode: VideoFitMode) => void;
  onExit: () => void;
}
function FullscreenLayer({
  mode,
  fullscreenActive,
  showFullscreenFooter,
  fullscreenDisplay,
  fullscreenEntryDisplay,
  fullscreenAlignRequest,
  fullscreenSwapped,
  fullscreenVideoFocus,
  fullscreenSplit,
  focusedImage,
  focusedImageSrc,
  focusedVideo,
  focusedVideoSrc,
  subtitleTrackUrl,
  subtitleVisible,
  subtitleLoading,
  subtitleMessage,
  subtitleOptions,
  selectedSubtitleId,
  autoSubtitleActive,
  liveSubtitleText,
  subtitleOverlayStyle,
  bindFullscreenVideoElement,
  focusedVideoCoverImageSrc,
  durationSec,
  focusedVideoCoverColor,
  videoTime,
  videoPlaying,
  videoRate,
  videoVolume,
  videoMuted,
  videoFitMode,
  videoLoopMode,
  fullscreenVideoControlsMaxWidth,
  fullscreenDecodeCacheSize = 10,
  autoPlayEnabled,
  autoPlayInterval,
  popoverDebugPinned,
  imageConvertPreviewMode = false,
  imageConvertPreviewScale = 1,
  imageConvertPreviewLongestEdgePx = null,
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
  imageConvertPreviewRenderedSrc = null,
  imageConvertPreviewError = null,
  onSetFooterVisible,
  onSetDisplay,
  onToggleSwapSides,
  onSetVideoFocus,
  onSetSplit,
  onPrevImage,
  onNextImage,
  onPrevPackage,
  onNextPackage,
  onToggleAutoplay,
  onSetAutoplayInterval,
  onChangeImageConvertPreviewScale,
  onChangeImageConvertPreviewFormat,
  onChangeImageConvertPreviewQuality,
  onApplyImageConvertPreviewScaleToLongestEdge,
  onChangeImageConvertPreviewAdjustProfile,
  onConfirmImageConvertPreview,
  onCancelImageConvertPreview,
  onToggleVideoPlay,
  onPrevVideo,
  onNextVideo,
  onVideoEnded,
  onToggleSubtitle,
  onSelectSubtitle,
  playlistEntries,
  selectedVideoId,
  onSelectVideo,
  onSaveCover,
  onSeekVideo,
  onVideoTimeUpdate,
  onVideoDurationDetected,
  onToggleVideoMute,
  onChangeVideoVolume,
  onChangeVideoRate,
  onCycleVideoLoopMode,
  onCycleVideoFitMode,
  onSetVideoFitMode,
  onExit,
}: FullscreenLayerProps) {
  const { t } = useI18n();
  const contentRef = useRef<HTMLDivElement>(null);
  const imagePaneRef = useRef<HTMLElement>(null);
  const videoPaneRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previousVideoTimePropRef = useRef(videoTime);
  const explicitSeekAtMsRef = useRef(0);
  const hideVideoControlsTimerRef = useRef<number | null>(null);
  const ratingFeedbackHoldTimerRef = useRef<number | null>(null);
  const ratingFeedbackFadeTimerRef = useRef<number | null>(null);
  const ratingFeedbackNonceRef = useRef(0);
  const imageConvertPreviewActive = mode === "image" && imageConvertPreviewMode;
  const effectiveFullscreenDisplay = imageConvertPreviewActive
    ? "image-only"
    : fullscreenDisplay;
  const [imageConvertCompareSplit, setImageConvertCompareSplit] = useState(0.5);

  const { imageViewportSize, videoViewportSize } = useFullscreenViewportSize({
    fullscreenActive,
    mode,
    fullscreenDisplay: effectiveFullscreenDisplay,
    fullscreenSwapped,
    imagePaneRef,
    videoPaneRef,
  });
  const fullscreenViewport = useFullscreenWindowViewport(fullscreenActive);
  const [imageTransform, setImageTransform] = useState<PaneTransform>(
    DEFAULT_PANE_TRANSFORM,
  );
  const [videoTransform, setVideoTransform] = useState<PaneTransform>(
    DEFAULT_PANE_TRANSFORM,
  );
  const [imageAlign, setImageAlign] = useState<PaneAlign>(DEFAULT_PANE_ALIGN);
  const [videoAlign, setVideoAlign] = useState<PaneAlign>(DEFAULT_PANE_ALIGN);
  const { displayedImageSrc, displayedImageAspect, setDisplayedImageAspect } =
    useFullscreenImageSource({
      focusedImageSrc,
      focusedImage,
      decodeCacheSize: fullscreenDecodeCacheSize,
    });
  const [displayedImageNaturalSize, setDisplayedImageNaturalSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [videoControlsVisible, setVideoControlsVisible] = useState(false);
  const [draggingPane, setDraggingPane] = useState<PaneKey | null>(null);
  const [dualSplitMode, setDualSplitMode] = useState<"auto" | "manual">(
    "auto",
  );
  const [dualAppliedAutoSplit, setDualAppliedAutoSplit] =
    useState<DualAdaptiveSplitResult | null>(null);
  const [footerHovering, setFooterHovering] = useState(false);
  const [ratingFeedback, setRatingFeedback] =
    useState<FullscreenRatingFeedbackState | null>(null);

  useEffect(() => {
    setDisplayedImageNaturalSize(null);
  }, [displayedImageSrc]);

  const clearRatingFeedbackTimers = useCallback(() => {
    if (ratingFeedbackHoldTimerRef.current !== null) {
      window.clearTimeout(ratingFeedbackHoldTimerRef.current);
      ratingFeedbackHoldTimerRef.current = null;
    }

    if (ratingFeedbackFadeTimerRef.current !== null) {
      window.clearTimeout(ratingFeedbackFadeTimerRef.current);
      ratingFeedbackFadeTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!fullscreenActive || mode === "music") {
      clearRatingFeedbackTimers();
      setRatingFeedback((previous) => (previous === null ? previous : null));
      return;
    }

    return onFullscreenRatingFeedback((detail) => {
      const defaultPane =
        effectiveFullscreenDisplay === "video-only" ? "video" : "image";
      const targetPane =
        effectiveFullscreenDisplay === "dual" ? detail.pane : defaultPane;
      const nextGrade =
        detail.grade === null ? null : Math.max(1, Math.min(5, detail.grade));
      ratingFeedbackNonceRef.current += 1;
      const feedbackId = ratingFeedbackNonceRef.current;

      clearRatingFeedbackTimers();
      setRatingFeedback({
        id: feedbackId,
        grade: nextGrade,
        pane: targetPane,
        fading: false,
      });

      ratingFeedbackHoldTimerRef.current = window.setTimeout(() => {
        setRatingFeedback((previous) => {
          if (!previous || previous.id !== feedbackId) {
            return previous;
          }
          return {
            ...previous,
            fading: true,
          };
        });
        ratingFeedbackHoldTimerRef.current = null;

        ratingFeedbackFadeTimerRef.current = window.setTimeout(() => {
          setRatingFeedback((previous) => {
            if (!previous || previous.id !== feedbackId) {
              return previous;
            }
            return null;
          });
          ratingFeedbackFadeTimerRef.current = null;
        }, FULLSCREEN_RATING_FEEDBACK_FADE_MS + FULLSCREEN_RATING_FEEDBACK_REMOVE_BUFFER_MS);
      }, FULLSCREEN_RATING_FEEDBACK_HOLD_MS);
    });
  }, [
    clearRatingFeedbackTimers,
    effectiveFullscreenDisplay,
    fullscreenActive,
    mode,
  ]);

  useEffect(
    () => () => {
      clearRatingFeedbackTimers();
    },
    [clearRatingFeedbackTimers],
  );

  useEffect(() => {
    if (!fullscreenActive || effectiveFullscreenDisplay !== "dual") {
      setDualSplitMode("auto");
      setDualAppliedAutoSplit(null);
    }
  }, [effectiveFullscreenDisplay, fullscreenActive]);

  const {
    imageConvertAdjustPanelOpen,
    imageConvertAdjustPanelDragging,
    imageAdjustHistogramBins,
    imageAdjustPanelRef,
    levelsEditorTrackRef,
    curveSvgRef,
    imageAdjustPanelInlineStyle,
    levelBlackRatio,
    levelGammaRatio,
    levelWhiteRatio,
    curveHistogramBars,
    curvePathD,
    curvePoints,
    updatePreviewAdjustProfile,
    handleOpenAdjustPanel,
    handleResetAdjustPanel,
    handleCancelAdjustPanel,
    startLevelHandleDrag,
    startAdjustPanelDrag,
    startCurvePointDrag,
  } = useFullscreenImageAdjustPanelController({
    imageConvertPreviewActive,
    imageConvertPreviewAdjustProfile,
    imageConvertPreviewRenderedSrc,
    displayedImageSrc,
    fullscreenViewport,
    onSetFooterVisible,
    onChangeImageConvertPreviewAdjustProfile,
  });

  const singlePane =
    effectiveFullscreenDisplay === "video-only"
      ? "video"
      : effectiveFullscreenDisplay === "image-only"
        ? "image"
        : null;
  const focusedPane: PaneKey =
    effectiveFullscreenDisplay === "dual"
      ? fullscreenVideoFocus
        ? "video"
        : "image"
      : (singlePane ?? "image");
  const zoomEnabled = effectiveFullscreenDisplay !== "dual";
  const autoplayEnabledForFocus = resolveFullscreenAutoplayControlEnabled({
    imageConvertPreviewActive,
    fullscreenDisplay: effectiveFullscreenDisplay,
  });
  const clampedVideoTime =
    durationSec > 0 ? clamp(videoTime, 0, durationSec) : Math.max(0, videoTime);
  const handleSeekVideo = useCallback(
    (time: number) => {
      explicitSeekAtMsRef.current = Date.now();
      onSeekVideo(time);
    },
    [onSeekVideo],
  );

  const imageAspect =
    displayedImageAspect ??
    resolveMediaAspect(focusedImage?.width ?? 0, focusedImage?.height ?? 0, 1);
  const videoAspect = resolveMediaAspect(
    focusedVideo?.width ?? 0,
    focusedVideo?.height ?? 0,
    16 / 9,
  );
  const [previousImageAspectForSuppression, setPreviousImageAspectForSuppression] =
    useState(imageAspect);
  const [dualSuppressedImageAspectLock, setDualSuppressedImageAspectLock] =
    useState<number | null>(null);
  const focusedImageId = focusedImage?.id ?? null;
  const focusedVideoId = focusedVideo?.id ?? null;

  useEffect(() => {
    if (!fullscreenActive || effectiveFullscreenDisplay !== "dual") {
      return;
    }
    setDualSplitMode("auto");
  }, [
    effectiveFullscreenDisplay,
    focusedImageId,
    focusedVideoId,
    fullscreenActive,
  ]);

  const fallbackViewportWidth = fullscreenViewport.width;
  const fallbackViewportHeight = fullscreenViewport.height;
  const effectiveImageViewportSize = useMemo(() => {
    if (effectiveFullscreenDisplay === "image-only") {
      return { width: fallbackViewportWidth, height: fallbackViewportHeight };
    }
    if (imageViewportSize.width <= 64 || imageViewportSize.height <= 64) {
      return { width: fallbackViewportWidth, height: fallbackViewportHeight };
    }
    return imageViewportSize;
  }, [
    effectiveFullscreenDisplay,
    fallbackViewportHeight,
    fallbackViewportWidth,
    imageViewportSize,
  ]);
  const effectiveVideoViewportSize = useMemo(() => {
    if (effectiveFullscreenDisplay === "video-only") {
      return { width: fallbackViewportWidth, height: fallbackViewportHeight };
    }
    if (videoViewportSize.width <= 64 || videoViewportSize.height <= 64) {
      return { width: fallbackViewportWidth, height: fallbackViewportHeight };
    }
    return videoViewportSize;
  }, [
    effectiveFullscreenDisplay,
    fallbackViewportHeight,
    fallbackViewportWidth,
    videoViewportSize,
  ]);

  const imageGeometry = useMemo(
    () =>
      computeMediaGeometry(
        effectiveImageViewportSize,
        imageAspect,
        imageTransform.zoom,
      ),
    [effectiveImageViewportSize, imageAspect, imageTransform.zoom],
  );
  const videoGeometry = useMemo(
    () =>
      computeMediaGeometry(
        effectiveVideoViewportSize,
        videoAspect,
        videoTransform.zoom,
      ),
    [effectiveVideoViewportSize, videoAspect, videoTransform.zoom],
  );

  const setPaneAlign = useCallback((pane: PaneKey, align: PaneAlign) => {
    if (pane === "image") {
      setImageAlign(align);
      return;
    }
    setVideoAlign(align);
  }, []);

  const updatePaneTransform = useCallback(
    (
      pane: PaneKey,
      updater: PaneTransform | ((previous: PaneTransform) => PaneTransform),
    ) => {
      const setTransform =
        pane === "image" ? setImageTransform : setVideoTransform;
      const viewport = pane === "image" ? imageViewportSize : videoViewportSize;
      const aspect = pane === "image" ? imageAspect : videoAspect;

      setTransform((previous) => {
        const nextValue =
          typeof updater === "function" ? updater(previous) : updater;
        const geometry = computeMediaGeometry(viewport, aspect, nextValue.zoom);
        return clampPaneTransform(nextValue, geometry);
      });
    },
    [imageAspect, imageViewportSize, videoAspect, videoViewportSize],
  );

  const adjustPaneZoom = useCallback(
    (pane: PaneKey, delta: number) => {
      updatePaneTransform(pane, (previous) => ({
        ...previous,
        zoom: clamp(
          Number((previous.zoom + delta).toFixed(3)),
          MIN_ZOOM,
          MAX_ZOOM,
        ),
      }));
    },
    [updatePaneTransform],
  );

  const alignFocusedPane = useCallback(
    (direction: AlignDirection) => {
      const setAlign = focusedPane === "image" ? setImageAlign : setVideoAlign;

      setAlign((previous) => {
        if (direction === "left") {
          return { ...previous, x: "start" };
        }
        if (direction === "right") {
          return { ...previous, x: "end" };
        }
        if (direction === "up") {
          return { ...previous, y: "start" };
        }
        return { ...previous, y: "end" };
      });
    },
    [focusedPane],
  );

  useEffect(() => {
    if (!fullscreenActive || !fullscreenAlignRequest) {
      return;
    }
    alignFocusedPane(fullscreenAlignRequest.direction);
  }, [alignFocusedPane, fullscreenActive, fullscreenAlignRequest]);

  const resetSinglePane = useCallback(() => {
    if (!zoomEnabled || !singlePane) {
      return;
    }

    setPaneAlign(singlePane, DEFAULT_PANE_ALIGN);
    updatePaneTransform(singlePane, { ...DEFAULT_PANE_TRANSFORM });
  }, [setPaneAlign, singlePane, updatePaneTransform, zoomEnabled]);

  const handlePaneWheel = useCallback(
    (pane: PaneKey, event: ReactWheelEvent<HTMLElement>) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest(
          "input, select, textarea, button, .fullscreen-video-controls, .fullscreen-footer",
        )
      ) {
        return;
      }

      if (zoomEnabled && singlePane && pane === singlePane && event.ctrlKey) {
        event.preventDefault();
        adjustPaneZoom(pane, event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
        return;
      }

      if (event.ctrlKey || Math.abs(event.deltaY) < 8) {
        return;
      }

      event.preventDefault();

      const stepTargetPane: PaneKey =
        effectiveFullscreenDisplay === "dual" ? pane : focusedPane;
      if (event.deltaY > 0) {
        if (stepTargetPane === "video") {
          onNextVideo();
          return;
        }
        onNextImage();
        return;
      }

      if (stepTargetPane === "video") {
        onPrevVideo();
        return;
      }
      onPrevImage();
    },
    [
      adjustPaneZoom,
      focusedPane,
      effectiveFullscreenDisplay,
      onNextImage,
      onNextVideo,
      onPrevImage,
      onPrevVideo,
      singlePane,
      zoomEnabled,
    ],
  );

  const startPaneDrag = useCallback(
    (pane: PaneKey, event: ReactMouseEvent<HTMLElement>) => {
      const canDragSinglePane =
        zoomEnabled && Boolean(singlePane) && pane === singlePane;
      const canDragDualVideo =
        effectiveFullscreenDisplay === "dual" && pane === "video";

      if (event.button !== 0 || (!canDragSinglePane && !canDragDualVideo)) {
        return;
      }

      if (
        event.target instanceof HTMLElement &&
        event.target.closest(".fullscreen-video-controls")
      ) {
        return;
      }

      event.preventDefault();

      const startTransform = pane === "image" ? imageTransform : videoTransform;
      const startX = event.clientX;
      const startY = event.clientY;

      setDraggingPane(pane);

      setPaneAlign(pane, { x: "free", y: "free" });

      const onMouseMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        updatePaneTransform(pane, {
          ...startTransform,
          offsetX: startTransform.offsetX + dx,
          offsetY: startTransform.offsetY + dy,
        });
      };

      const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        setDraggingPane((value) => (value === pane ? null : value));
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [
      effectiveFullscreenDisplay,
      imageTransform,
      setPaneAlign,
      singlePane,
      updatePaneTransform,
      videoTransform,
      zoomEnabled,
    ],
  );

  const startSplitDrag = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (event.button !== 0 || effectiveFullscreenDisplay !== "dual") {
        return;
      }

      event.preventDefault();
      setDualSplitMode("manual");

      const onMouseMove = (moveEvent: MouseEvent) => {
        const rect = contentRef.current?.getBoundingClientRect();
        if (!rect || rect.width <= 1) {
          return;
        }

        const availableWidth = Math.max(
          1,
          rect.width - FULLSCREEN_DIVIDER_WIDTH,
        );
        const minImageRatioByControls =
          DUAL_IMAGE_CONTROLS_MIN_TWO_GROUPS / availableWidth;
        const maxImageRatioByControls =
          1 - DUAL_VIDEO_CONTROLS_MIN_TWO_GROUPS / availableWidth;
        let minImageRatio = Math.max(MIN_SPLIT, minImageRatioByControls);
        let maxImageRatio = Math.min(MAX_SPLIT, maxImageRatioByControls);

        if (minImageRatio > maxImageRatio) {
          const fallbackRatio = clamp(
            minImageRatioByControls,
            MIN_SPLIT,
            MAX_SPLIT,
          );
          minImageRatio = fallbackRatio;
          maxImageRatio = fallbackRatio;
        }

        const ratioFromLeft = clamp(
          (moveEvent.clientX - rect.left - FULLSCREEN_DIVIDER_WIDTH / 2) /
            availableWidth,
          0,
          1,
        );
        const nextImageRatio = fullscreenSwapped
          ? 1 - ratioFromLeft
          : ratioFromLeft;
        onSetSplit(
          clamp(
            Number(nextImageRatio.toFixed(3)),
            minImageRatio,
            maxImageRatio,
          ),
        );
      };

      const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [effectiveFullscreenDisplay, fullscreenSwapped, onSetSplit],
  );

  const toggleDualDisplay = useCallback(() => {
    if (effectiveFullscreenDisplay === "dual") {
      onSetDisplay(
        imageConvertPreviewActive ? "image-only" : fullscreenEntryDisplay,
      );
      return;
    }
    if (imageConvertPreviewActive) {
      return;
    }
    onSetDisplay("dual");
  }, [
    effectiveFullscreenDisplay,
    fullscreenEntryDisplay,
    imageConvertPreviewActive,
    onSetDisplay,
  ]);

  const stepFocusedPane = useCallback(
    (delta: -1 | 1) => {
      if (focusedPane === "video") {
        if (delta < 0) {
          onPrevVideo();
          return;
        }
        onNextVideo();
        return;
      }

      if (delta < 0) {
        onPrevImage();
        return;
      }
      onNextImage();
    },
    [focusedPane, onNextImage, onNextVideo, onPrevImage, onPrevVideo],
  );

  useEffect(() => {
    if (!fullscreenActive) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [fullscreenActive]);

  useEffect(() => {
    if (!fullscreenActive) {
      setVideoControlsVisible(false);
      setDraggingPane(null);
      if (hideVideoControlsTimerRef.current !== null) {
        window.clearTimeout(hideVideoControlsTimerRef.current);
        hideVideoControlsTimerRef.current = null;
      }
    }
  }, [fullscreenActive]);

  useEffect(
    () => () => {
      if (hideVideoControlsTimerRef.current !== null) {
        window.clearTimeout(hideVideoControlsTimerRef.current);
      }
    },
    [],
  );

  const showVideoControls = useCallback(() => {
    if (hideVideoControlsTimerRef.current !== null) {
      window.clearTimeout(hideVideoControlsTimerRef.current);
      hideVideoControlsTimerRef.current = null;
    }
    setVideoControlsVisible(true);
  }, []);

  const hideVideoControls = useCallback(() => {
    if (popoverDebugPinned) {
      setVideoControlsVisible(true);
      return;
    }
    if (hideVideoControlsTimerRef.current !== null) {
      window.clearTimeout(hideVideoControlsTimerRef.current);
    }
    hideVideoControlsTimerRef.current = window.setTimeout(() => {
      setVideoControlsVisible(false);
      hideVideoControlsTimerRef.current = null;
    }, 150);
  }, [popoverDebugPinned]);

  useEffect(() => {
    if (!fullscreenActive || !popoverDebugPinned) {
      return;
    }
    setVideoControlsVisible(true);
    onSetFooterVisible(true);
  }, [fullscreenActive, onSetFooterVisible, popoverDebugPinned]);

  useEffect(() => {
    if (!fullscreenActive) {
      return;
    }

    if (effectiveFullscreenDisplay !== "dual") {
      return;
    }

    setImageAlign(DEFAULT_PANE_ALIGN);
    setVideoAlign(DEFAULT_PANE_ALIGN);
    setImageTransform({ ...DEFAULT_PANE_TRANSFORM });
    setVideoTransform({ ...DEFAULT_PANE_TRANSFORM });
    setDraggingPane(null);
  }, [effectiveFullscreenDisplay, fullscreenActive]);

  useEffect(() => {
    if (!imageConvertPreviewActive) {
      setImageConvertCompareSplit(0.5);
    }
  }, [imageConvertPreviewActive]);

  useLayoutEffect(() => {
    setImageTransform((previous) => {
      const aligned = applyAlignedOffset(previous, imageAlign, imageGeometry);
      return clampPaneTransform(aligned, imageGeometry);
    });
  }, [imageAlign, imageGeometry]);

  useLayoutEffect(() => {
    setVideoTransform((previous) => {
      const aligned = applyAlignedOffset(previous, videoAlign, videoGeometry);
      return clampPaneTransform(aligned, videoGeometry);
    });
  }, [videoAlign, videoGeometry]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.playbackRate = clamp(videoRate, 0.1, 10);
    video.muted = videoMuted;
    video.volume = clamp(videoVolume / 100, 0, 1);

    const videoVisible =
      effectiveFullscreenDisplay === "video-only" ||
      effectiveFullscreenDisplay === "dual";
    if (!fullscreenActive || !videoVisible || !focusedVideoSrc) {
      video.pause();
      return;
    }

    if (videoPlaying) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [
    clampedVideoTime,
    effectiveFullscreenDisplay,
    focusedVideoSrc,
    fullscreenActive,
    videoMuted,
    videoPlaying,
    videoRate,
    videoVolume,
  ]);

  useEffect(() => {
    const previousVideoTime = previousVideoTimePropRef.current;
    previousVideoTimePropRef.current = videoTime;

    const video = videoRef.current;
    if (!video) {
      return;
    }

    const videoVisible =
      effectiveFullscreenDisplay === "video-only" ||
      effectiveFullscreenDisplay === "dual";
    if (!fullscreenActive || !videoVisible || !focusedVideoSrc) {
      return;
    }

    const propJump = Math.abs(videoTime - previousVideoTime) > 0.35;
    if (!propJump) {
      return;
    }

    const explicitSeekRecently = Date.now() - explicitSeekAtMsRef.current < 700;
    const suspiciousResetWhilePaused =
      !videoPlaying && clampedVideoTime < 0.15 && video.currentTime > 0.8;
    if (suspiciousResetWhilePaused && !explicitSeekRecently) {
      return;
    }

    if (Math.abs(video.currentTime - clampedVideoTime) <= 0.2) {
      return;
    }

    video.currentTime = clampedVideoTime;
  }, [
    clampedVideoTime,
    effectiveFullscreenDisplay,
    focusedVideoSrc,
    fullscreenActive,
    videoPlaying,
    videoTime,
  ]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const mode = subtitleVisible && subtitleTrackUrl ? "showing" : "hidden";
    for (let index = 0; index < video.textTracks.length; index += 1) {
      video.textTracks[index].mode = mode;
    }
  }, [subtitleTrackUrl, subtitleVisible]);

  const handleToggleVideoPlayback = useCallback(() => {
    if (videoPlaying) {
      const currentTime = videoRef.current?.currentTime;
      if (typeof currentTime === "number" && Number.isFinite(currentTime)) {
        onVideoTimeUpdate(currentTime);
      }
    }
    onToggleVideoPlay();
  }, [onToggleVideoPlay, onVideoTimeUpdate, videoPlaying]);

  const dualAvailableWidth = Math.max(
    1,
    effectiveImageViewportSize.width + effectiveVideoViewportSize.width,
  );
  const dualAdaptiveSplit = resolveDualAdaptiveSplit({
    totalWidth: dualAvailableWidth,
    imageViewportHeight: effectiveImageViewportSize.height,
    videoViewportHeight: effectiveVideoViewportSize.height,
    imageAspect,
    videoAspect,
  });
  const minImageRatioByControls =
    DUAL_IMAGE_CONTROLS_MIN_TWO_GROUPS / dualAvailableWidth;
  const maxImageRatioByControls =
    1 - DUAL_VIDEO_CONTROLS_MIN_TWO_GROUPS / dualAvailableWidth;
  let dualMinImageRatio = Math.max(MIN_SPLIT, minImageRatioByControls);
  let dualMaxImageRatio = Math.min(MAX_SPLIT, maxImageRatioByControls);

  if (dualMinImageRatio > dualMaxImageRatio) {
    const fallbackRatio = clamp(minImageRatioByControls, MIN_SPLIT, MAX_SPLIT);
    dualMinImageRatio = fallbackRatio;
    dualMaxImageRatio = fallbackRatio;
  }

  const dualAdaptiveCandidate: DualAdaptiveSplitResult = useMemo(
    () => ({
      imageRatio: clamp(
        dualAdaptiveSplit.imageRatio,
        dualMinImageRatio,
        dualMaxImageRatio,
      ),
      rule: dualAdaptiveSplit.rule,
    }),
    [
      dualAdaptiveSplit.imageRatio,
      dualAdaptiveSplit.rule,
      dualMaxImageRatio,
      dualMinImageRatio,
    ],
  );
  const dualResolvedAutoSplit = resolveDualAdaptiveStickySplit(
    dualAppliedAutoSplit,
    dualAdaptiveCandidate,
  );
  const dualAdaptiveDiffRatio =
    dualAppliedAutoSplit === null
      ? null
      : Math.abs(
          dualAdaptiveCandidate.imageRatio - dualAppliedAutoSplit.imageRatio,
        );
  const dualAdaptiveSuppressedByThreshold =
    fullscreenActive &&
    effectiveFullscreenDisplay === "dual" &&
    dualSplitMode === "auto" &&
    dualAppliedAutoSplit !== null &&
    (dualAdaptiveDiffRatio ?? Number.POSITIVE_INFINITY) <=
      DUAL_ADAPTIVE_HORIZONTAL_DIFF_THRESHOLD_RATIO;
  const dualSuppressedImageAspect = dualAdaptiveSuppressedByThreshold
    ? dualSuppressedImageAspectLock ?? previousImageAspectForSuppression
    : imageAspect;
  const imageSuppressedGeometry = computeMediaGeometryHeightAnchored(
    effectiveImageViewportSize,
    dualSuppressedImageAspect,
    imageTransform.zoom,
  );

  useEffect(() => {
    if (
      !fullscreenActive ||
      effectiveFullscreenDisplay !== "dual" ||
      dualSplitMode !== "auto"
    ) {
      return;
    }

    setDualAppliedAutoSplit((previous) =>
      resolveDualAdaptiveStickySplit(previous, dualAdaptiveCandidate),
    );
  }, [
    dualAdaptiveCandidate,
    dualAdaptiveCandidate.imageRatio,
    dualAdaptiveCandidate.rule,
    dualSplitMode,
    effectiveFullscreenDisplay,
    fullscreenActive,
  ]);

  useEffect(() => {
    if (!dualAdaptiveSuppressedByThreshold) {
      setDualSuppressedImageAspectLock((previous) =>
        previous === null ? previous : null,
      );
      return;
    }

    if (dualSuppressedImageAspectLock !== null) {
      return;
    }

    const previousAspect = previousImageAspectForSuppression;
    setDualSuppressedImageAspectLock(
      Number.isFinite(previousAspect) && previousAspect > 0
        ? previousAspect
        : imageAspect,
    );
  }, [
    dualAdaptiveSuppressedByThreshold,
    dualSuppressedImageAspectLock,
    imageAspect,
    previousImageAspectForSuppression,
  ]);

  useEffect(() => {
    setPreviousImageAspectForSuppression((previous) =>
      Math.abs(previous - imageAspect) < 0.0001 ? previous : imageAspect,
    );
  }, [imageAspect]);

  if (!fullscreenActive || mode === "music") {
    return null;
  }

  const dualAdaptiveRule: DualAdaptiveSplitRule = dualResolvedAutoSplit.rule;
  const dualAutoImageRatio = dualResolvedAutoSplit.imageRatio;
  const dualManualImageRatio = clamp(
    fullscreenSplit,
    dualMinImageRatio,
    dualMaxImageRatio,
  );
  const dualImageRatio =
    dualSplitMode === "manual" ? dualManualImageRatio : dualAutoImageRatio;
  const imageRatio =
    effectiveFullscreenDisplay === "dual"
      ? dualImageRatio
      : 1;
  const videoRatio = effectiveFullscreenDisplay === "dual" ? 1 - imageRatio : 1;
  const paneOrder: PaneKey[] = fullscreenSwapped
    ? ["video", "image"]
    : ["image", "video"];
  const imageRenderGeometry =
    effectiveFullscreenDisplay === "dual" && dualAdaptiveSuppressedByThreshold
      ? imageSuppressedGeometry
      : imageGeometry;

  const dualInwardAlignByPane = (() => {
    if (
      effectiveFullscreenDisplay !== "dual" ||
      dualSplitMode !== "auto" ||
      dualAdaptiveSuppressedByThreshold ||
      dualAdaptiveRule !== "center-inward"
    ) {
      return {
        image: "center",
        video: "center",
      } as const;
    }

    const leftPane: PaneKey = fullscreenSwapped ? "video" : "image";
    const rightPane: PaneKey = leftPane === "image" ? "video" : "image";

    return {
      image: leftPane === "image" ? "end" : rightPane === "image" ? "start" : "center",
      video: leftPane === "video" ? "end" : rightPane === "video" ? "start" : "center",
    } as const;
  })();

  const imageRenderTransform = (() => {
    if (imageAlign.x !== "center") {
      return imageTransform;
    }

    const targetAlignX = dualInwardAlignByPane.image;
    const targetOffsetX =
      targetAlignX === "start"
        ? imageRenderGeometry.diffX / 2
        : targetAlignX === "end"
          ? -imageRenderGeometry.diffX / 2
          : 0;

    if (Math.abs(targetOffsetX - imageTransform.offsetX) < 0.0001) {
      return imageTransform;
    }

    return {
      ...imageTransform,
      offsetX: targetOffsetX,
    };
  })();

  const videoRenderTransform = (() => {
    if (videoAlign.x !== "center") {
      return videoTransform;
    }

    const targetAlignX = dualInwardAlignByPane.video;
    const targetOffsetX =
      targetAlignX === "start"
        ? videoGeometry.diffX / 2
        : targetAlignX === "end"
          ? -videoGeometry.diffX / 2
          : 0;

    if (Math.abs(targetOffsetX - videoTransform.offsetX) < 0.0001) {
      return videoTransform;
    }

    return {
      ...videoTransform,
      offsetX: targetOffsetX,
    };
  })();

  const activeSingleTransform =
    singlePane === "video" ? videoTransform : imageTransform;
  const zoomPercent = Math.round(activeSingleTransform.zoom * 100);

  const videoMediaTop =
    (effectiveVideoViewportSize.height - videoGeometry.height) / 2 +
    videoTransform.offsetY;
  const videoMediaBottom = videoMediaTop + videoGeometry.height;
  const topGap = videoMediaTop;
  const bottomGap = effectiveVideoViewportSize.height - videoMediaBottom;
  const videoControlsAtTop = bottomGap < topGap;

  const controlsBlockHeight = 122;
  const controlsMaxTop = Math.max(
    8,
    effectiveVideoViewportSize.height - controlsBlockHeight - 8,
  );
  const controlsPreferredTop = videoControlsAtTop
    ? videoMediaTop - controlsBlockHeight - 8
    : videoMediaBottom + 8;
  const videoControlsTop = clamp(
    Math.round(controlsPreferredTop),
    8,
    controlsMaxTop,
  );

  const controlsWidthCap =
    clamp(fullscreenVideoControlsMaxWidth, 640, 1920) ||
    DEFAULT_FULLSCREEN_VIDEO_CONTROLS_MAX_WIDTH;
  const singleControlsViewport = {
    width: fallbackViewportWidth,
    height: fallbackViewportHeight,
  };
  const singleControlsWidth = resolveFullscreenControlsWidth({
    viewportWidth: singleControlsViewport.width,
    viewportHeight: singleControlsViewport.height,
    widthCap: controlsWidthCap,
  });
  const dualImageControlsWidth = Math.max(
    120,
    Math.min(singleControlsWidth, effectiveImageViewportSize.width - 16),
  );
  const dualVideoControlsWidth = Math.max(
    120,
    Math.min(singleControlsWidth, effectiveVideoViewportSize.width - 16),
  );
  const controlsMaxWidth = Math.max(
    120,
    Math.min(effectiveVideoViewportSize.width - 16, controlsWidthCap),
  );
  const controlsPreferredWidth = Math.max(120, videoGeometry.width - 16);
  const videoControlsWidthByGeometry = Math.min(
    controlsPreferredWidth,
    controlsMaxWidth,
  );
  const videoControlsWidth =
    effectiveFullscreenDisplay === "dual"
      ? dualVideoControlsWidth
      : effectiveFullscreenDisplay === "video-only"
        ? singleControlsWidth
        : videoControlsWidthByGeometry;
  const controlsMaxLeft = Math.max(
    8,
    effectiveVideoViewportSize.width - videoControlsWidth - 8,
  );
  const centeredControlsLeft = Math.round(
    (effectiveVideoViewportSize.width - videoControlsWidth) / 2,
  );
  const videoControlsLeft = clamp(centeredControlsLeft, 8, controlsMaxLeft);
  const imageControlsCompact =
    effectiveFullscreenDisplay === "dual" &&
    dualImageControlsWidth < DUAL_IMAGE_CONTROLS_COMPACT_WIDTH;
  const imageControlsHideRightGroup =
    effectiveFullscreenDisplay === "dual" &&
    dualImageControlsWidth < DUAL_IMAGE_CONTROLS_MIN_WITH_RIGHT_GROUP;
  const videoControlsCompact =
    effectiveFullscreenDisplay === "dual" &&
    dualVideoControlsWidth < DUAL_VIDEO_CONTROLS_COMPACT_WIDTH;
  const videoControlsHideLeftGroup =
    effectiveFullscreenDisplay === "dual" &&
    dualVideoControlsWidth < DUAL_VIDEO_CONTROLS_MIN_WITH_LEFT_GROUP;
  const fullscreenControlsCssVars = {
    "--mpx-fullscreen-controls-max-width": `${singleControlsWidth}px`,
    "--mpx-fullscreen-controls-width": `${singleControlsWidth}px`,
  } as CSSProperties;

  const imagePaneClassName = `fullscreen-pane fullscreen-image mpx-scrollbar-hidden${effectiveFullscreenDisplay === "dual" && !fullscreenVideoFocus ? " is-pane-focus" : ""}`;
  const videoPaneClassName = `fullscreen-pane fullscreen-video mpx-scrollbar-hidden${effectiveFullscreenDisplay === "dual" && fullscreenVideoFocus ? " is-pane-focus" : ""}`;

  const footerImageInfo = (() => {
    if (!focusedImage) {
      return t("ui.fullscreen.noImage");
    }

    if (imageConvertPreviewActive) {
      const sourceWidth =
        displayedImageNaturalSize?.width ?? focusedImage.width;
      const sourceHeight =
        displayedImageNaturalSize?.height ?? focusedImage.height;
      const convertedSize = resolveImageConvertTargetSize(
        sourceWidth,
        sourceHeight,
        imageConvertPreviewScale,
        imageConvertPreviewLongestEdgePx,
      );
      const convertedWidth = convertedSize.width;
      const convertedHeight = convertedSize.height;
      const resolutionText =
        convertedWidth > 0 && convertedHeight > 0
          ? `${convertedWidth} x ${convertedHeight}`
          : "-";
      const convertedPath = resolveConvertedImagePathForFooter(
        focusedImage,
        imageConvertPreviewFormat,
      );
      const convertedSizeKb = estimateDataUrlSizeKb(
        imageConvertPreviewRenderedSrc,
      );
      const actualFormatLabel = resolveFormatLabelByMimeType(
        resolveDataUrlMimeType(imageConvertPreviewRenderedSrc),
      );
      const requestedFormatLabel = imageConvertPreviewFormat.toUpperCase();
      const formatText =
        actualFormatLabel && actualFormatLabel !== requestedFormatLabel
          ? `${requestedFormatLabel}->${actualFormatLabel}`
          : requestedFormatLabel;
      const previewParamsText =
        imageConvertPreviewLongestEdgePx != null
          ? `LE${Math.round(imageConvertPreviewLongestEdgePx)} F${formatText} Q${Math.round(imageConvertPreviewQuality)}`
          : `S${imageConvertPreviewScale.toFixed(1)} F${formatText} Q${Math.round(imageConvertPreviewQuality)}`;
      return `${previewParamsText} | ${convertedPath} | ${resolutionText} | ${formatImageSizeForFooter(convertedSizeKb)}`;
    }

    const width = displayedImageNaturalSize?.width ?? focusedImage.width;
    const height = displayedImageNaturalSize?.height ?? focusedImage.height;
    const resolutionText =
      width > 0 && height > 0 ? `${width} x ${height}` : "-";
    return `${resolveMediaPathForFooter(focusedImage)} | ${resolutionText} | ${formatImageSizeForFooter(focusedImage.sizeKb)}`;
  })();

  const applyScaleResultToLongestEdge = () => {
    if (!imageConvertPreviewActive) {
      return;
    }
    const sourceWidth =
      displayedImageNaturalSize?.width ?? focusedImage?.width ?? 0;
    const sourceHeight =
      displayedImageNaturalSize?.height ?? focusedImage?.height ?? 0;
    const sourceLongestEdge = Math.max(
      0,
      Math.round(Math.max(sourceWidth, sourceHeight)),
    );
    if (sourceLongestEdge <= 0) {
      return;
    }
    const nextLongestEdge = Math.max(
      1,
      Math.min(16384, Math.round(sourceLongestEdge * imageConvertPreviewScale)),
    );
    onApplyImageConvertPreviewScaleToLongestEdge?.(nextLongestEdge);
  };
  const footerVideoInfo = focusedVideo
    ? `${resolveMediaPathForFooter(focusedVideo)} | ${focusedVideo.width} x ${focusedVideo.height} | ${formatVideoSizeForFooter(focusedVideo.sizeMb)}`
    : t("ui.fullscreen.noVideo");

  const ratingFeedbackNode = ratingFeedback ? (
    <div
      className={`fullscreen-rating-feedback ${ratingFeedback.grade === null ? "is-clear" : "is-rated"} ${ratingFeedback.fading ? "is-fading" : ""}`}
      key={ratingFeedback.id}
    >
      <div className="metadata-rating-stars-wrap">
        <RatingFavoriteControl
          className="metadata-rating-stars fullscreen-rating-feedback-stars"
          groupAriaLabel={t("ui.metadata.ratingFavorited")}
          value={ratingFeedback.grade}
          pending
          allowDrag={false}
          evaluationLabel={t("ui.metadata.ratingEvaluationLabel")}
          sweepEnabled={false}
          onChange={NOOP_RATING_CHANGE}
        />
      </div>
    </div>
  ) : null;

  const imagePaneOverlay =
    ratingFeedbackNode && ratingFeedback?.pane === "image"
      ? ratingFeedbackNode
      : null;
  const videoPaneOverlay =
    ratingFeedbackNode && ratingFeedback?.pane === "video"
      ? ratingFeedbackNode
      : null;

  const imageControls =
    showFullscreenFooter && !imageConvertAdjustPanelOpen ? (
      <FullscreenFooter
        mode={mode}
        fullscreenDisplay={effectiveFullscreenDisplay}
        footerInfoLeftText={footerImageInfo}
        footerInfoRightText={null}
        autoplayEnabledForFocus={autoplayEnabledForFocus}
        autoPlayEnabled={autoPlayEnabled}
        autoPlayInterval={autoPlayInterval}
        zoomEnabled={zoomEnabled}
        zoomPercent={zoomPercent}
        onToggleDualDisplay={toggleDualDisplay}
        onToggleSwapSides={onToggleSwapSides}
        onStepFocusedPane={stepFocusedPane}
        onPrevPackage={onPrevPackage}
        onNextPackage={onNextPackage}
        onToggleAutoplay={onToggleAutoplay}
        onSetAutoplayInterval={onSetAutoplayInterval}
        popoverDebugPinned={popoverDebugPinned}
        onAlignFocusedPane={alignFocusedPane}
        onSetZoomPercent={(percent) => {
          if (singlePane) {
            updatePaneTransform(singlePane, (previous) => ({
              ...previous,
              zoom: clamp(
                Number((percent / 100).toFixed(3)),
                MIN_ZOOM,
                MAX_ZOOM,
              ),
            }));
          }
        }}
        onResetSinglePane={resetSinglePane}
        onHoverStateChange={setFooterHovering}
        onExit={onExit}
        controlsWidth={
          effectiveFullscreenDisplay === "dual"
            ? dualImageControlsWidth
            : undefined
        }
        compact={imageControlsCompact}
        hideRightGroup={imageControlsHideRightGroup}
        imageConvertPreviewMode={imageConvertPreviewActive}
        imageConvertPreviewScale={imageConvertPreviewScale}
        imageConvertPreviewLongestEdgePx={imageConvertPreviewLongestEdgePx}
        imageConvertPreviewAdjustProfile={imageConvertPreviewAdjustProfile}
        imageConvertPreviewFormat={imageConvertPreviewFormat}
        imageConvertPreviewQuality={imageConvertPreviewQuality}
        showImageConvertAdjustPanel={imageConvertAdjustPanelOpen}
        canApplyScaleToLongestEdge={
          imageConvertPreviewActive && imageConvertPreviewLongestEdgePx == null
        }
        onChangeImageConvertPreviewScale={onChangeImageConvertPreviewScale}
        onChangeImageConvertPreviewFormat={onChangeImageConvertPreviewFormat}
        onChangeImageConvertPreviewQuality={onChangeImageConvertPreviewQuality}
        onApplyImageConvertPreviewScaleToLongestEdge={
          applyScaleResultToLongestEdge
        }
        onToggleImageConvertAdjustPanel={handleOpenAdjustPanel}
        onConfirmImageConvertPreview={onConfirmImageConvertPreview}
        onCancelImageConvertPreview={onCancelImageConvertPreview}
      />
    ) : null;

  const imagePane = (
    <FullscreenImagePane
      paneRef={imagePaneRef}
      className={imagePaneClassName}
      dataSlot={
        effectiveFullscreenDisplay === "dual" ? "fs-dual-pane-image" : undefined
      }
      flex={imageRatio}
      fullscreenDisplay={effectiveFullscreenDisplay}
      singlePane={singlePane}
      draggingPane={draggingPane}
      imageGeometry={imageRenderGeometry}
      imageTransform={imageRenderTransform}
      displayedImageSrc={displayedImageSrc}
      focusedImageOrdinal={focusedImage?.ordinal ?? null}
      controlsRows={imageControls}
      overlayContent={imagePaneOverlay}
      imageConvertPreviewMode={imageConvertPreviewActive}
      imageConvertPreviewSrc={imageConvertPreviewRenderedSrc}
      imageConvertPreviewError={imageConvertPreviewError}
      imageConvertCompareSplit={imageConvertCompareSplit}
      onSetImageConvertCompareSplit={setImageConvertCompareSplit}
      onSetVideoFocus={onSetVideoFocus}
      onWheel={(event) => handlePaneWheel("image", event)}
      onMouseDown={(event) => startPaneDrag("image", event)}
      onImageNaturalSize={(naturalWidth, naturalHeight) => {
        if (naturalWidth > 0 && naturalHeight > 0) {
          setDisplayedImageAspect(naturalWidth / naturalHeight);
          setDisplayedImageNaturalSize({
            width: naturalWidth,
            height: naturalHeight,
          });
        }
      }}
    />
  );

  const controlsRows = (
    <FullscreenVideoControlsShell
      mediaInfoText={footerVideoInfo}
      clampedVideoTime={clampedVideoTime}
      durationSec={durationSec}
      videoPlaying={videoPlaying}
      videoMuted={videoMuted}
      videoFitMode={videoFitMode}
      videoLoopMode={videoLoopMode}
      videoVolume={videoVolume}
      videoRate={videoRate}
      subtitleVisible={subtitleVisible}
      subtitleLoading={subtitleLoading}
      subtitleMessage={subtitleMessage}
      subtitleOptions={subtitleOptions}
      selectedSubtitleId={selectedSubtitleId}
      playlistEntries={playlistEntries}
      selectedVideoId={selectedVideoId}
      onSeekVideo={handleSeekVideo}
      onToggleVideoPlay={handleToggleVideoPlayback}
      onPrevVideo={onPrevVideo}
      onNextVideo={onNextVideo}
      onToggleVideoMute={onToggleVideoMute}
      onCycleVideoLoopMode={onCycleVideoLoopMode}
      onToggleSubtitle={onToggleSubtitle}
      onSelectSubtitle={onSelectSubtitle}
      onChangeVideoVolume={onChangeVideoVolume}
      onChangeVideoRate={onChangeVideoRate}
      onCycleVideoFitMode={onCycleVideoFitMode}
      onSetVideoFitMode={onSetVideoFitMode}
      onToggleDualDisplay={toggleDualDisplay}
      onSelectVideo={onSelectVideo}
      onSaveCover={onSaveCover}
      onExit={onExit}
      popoverDebugPinned={popoverDebugPinned}
      controlsWidth={
        effectiveFullscreenDisplay === "dual"
          ? dualVideoControlsWidth
          : undefined
      }
      compact={videoControlsCompact}
      hideLeftGroup={videoControlsHideLeftGroup}
    />
  );

  const videoPane = (
    <FullscreenVideoPane
      paneRef={videoPaneRef}
      videoRef={videoRef}
      className={videoPaneClassName}
      dataSlot={
        effectiveFullscreenDisplay === "dual" ? "fs-dual-pane-video" : undefined
      }
      flex={videoRatio}
      fullscreenDisplay={effectiveFullscreenDisplay}
      singlePane={singlePane}
      draggingPane={draggingPane}
      videoGeometry={videoGeometry}
      videoTransform={videoRenderTransform}
      focusedVideoId={focusedVideoId}
      videoPlaying={videoPlaying}
      videoTime={clampedVideoTime}
      focusedVideoSrc={focusedVideoSrc}
      focusedVideoCoverImageSrc={focusedVideoCoverImageSrc}
      focusedVideoCoverColor={focusedVideoCoverColor}
      subtitleTrackUrl={subtitleVisible ? subtitleTrackUrl : null}
      autoSubtitleActive={autoSubtitleActive}
      subtitleVisible={subtitleVisible}
      liveSubtitleText={liveSubtitleText}
      subtitleOverlayStyle={subtitleOverlayStyle}
      bindVideoElement={bindFullscreenVideoElement}
      videoFitMode={videoFitMode}
      videoLoopMode={videoLoopMode}
      videoControlsVisible={videoControlsVisible}
      videoControlsAtTop={videoControlsAtTop}
      videoControlsTop={videoControlsTop}
      videoControlsLeft={videoControlsLeft}
      videoControlsWidth={videoControlsWidth}
      controlsRows={controlsRows}
      overlayContent={videoPaneOverlay}
      onSetVideoFocus={onSetVideoFocus}
      onWheel={(event) => handlePaneWheel("video", event)}
      onMouseDown={(event) => startPaneDrag("video", event)}
      onShowControls={showVideoControls}
      onHideControls={hideVideoControls}
      onVideoTimeUpdate={onVideoTimeUpdate}
      onVideoDurationDetected={onVideoDurationDetected}
      onVideoEnded={onVideoEnded}
    />
  );

  return (
    <div
      className="fullscreen-layer mpx-scrollbar-hidden"
      data-slot="bg-fs-mask"
      style={fullscreenControlsCssVars}
      data-overlay-close="fullscreen"
      onMouseMove={(event) => {
        if (popoverDebugPinned) {
          onSetFooterVisible(true);
          return;
        }
        onSetFooterVisible(
          footerHovering || event.clientY > fullscreenViewport.height * 0.8,
        );
      }}
      onMouseLeave={() => {
        if (popoverDebugPinned) {
          onSetFooterVisible(true);
          return;
        }
        setFooterHovering(false);
        onSetFooterVisible(false);
        hideVideoControls();
      }}
    >
      <span hidden data-slot="fs-layer-root" />
      <div
        className="fullscreen-content mpx-scrollbar-hidden"
        data-slot="fs-layer-content"
        ref={contentRef}
      >
        {effectiveFullscreenDisplay === "dual" ? (
          <>
            <span hidden data-slot="fs-dual-root" />
            <span hidden data-slot="fs-dual-pane-image" />
            <span hidden data-slot="fs-dual-pane-video" />
            {paneOrder.map((pane, index) => (
              <Fragment key={pane}>
                {pane === "image" ? imagePane : videoPane}
                {index === 0 ? (
                  <div
                    {...buildA11yPropsByRegistry({
                      key: "commonAdjustFullscreenSplit",
                      t,
                    })}
                    aria-orientation="vertical"
                    className="fullscreen-divider"
                    role="separator"
                    tabIndex={-1}
                    onMouseDown={startSplitDrag}
                  />
                ) : null}
              </Fragment>
            ))}
          </>
        ) : effectiveFullscreenDisplay === "image-only" ? (
          <section
            className="fullscreen-single-pane mpx-scrollbar-hidden"
            data-slot="fs-nondual-root"
          >
            {imagePane}
          </section>
        ) : (
          <section
            className="fullscreen-single-pane mpx-scrollbar-hidden"
            data-slot="fs-nondual-root"
          >
            {videoPane}
          </section>
        )}
      </div>

      <FullscreenImageAdjustPanel
        visible={imageConvertPreviewActive && imageConvertAdjustPanelOpen}
        profile={imageConvertPreviewAdjustProfile}
        histogramBins={imageAdjustHistogramBins}
        panelRef={imageAdjustPanelRef}
        levelsEditorTrackRef={levelsEditorTrackRef}
        curveSvgRef={curveSvgRef}
        panelInlineStyle={imageAdjustPanelInlineStyle}
        panelDragging={imageConvertAdjustPanelDragging}
        levelBlackRatio={levelBlackRatio}
        levelGammaRatio={levelGammaRatio}
        levelWhiteRatio={levelWhiteRatio}
        curveHistogramBars={curveHistogramBars}
        curvePathD={curvePathD}
        curvePoints={curvePoints}
        onStartPanelDrag={startAdjustPanelDrag}
        onUpdateProfile={updatePreviewAdjustProfile}
        onStartLevelHandleDrag={startLevelHandleDrag}
        onStartCurvePointDrag={startCurvePointDrag}
        onReset={handleResetAdjustPanel}
        onCancel={handleCancelAdjustPanel}
      />
    </div>
  );
}

export default FullscreenLayer;
