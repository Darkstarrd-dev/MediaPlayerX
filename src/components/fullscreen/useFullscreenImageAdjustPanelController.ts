import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";

import type { ImageConvertAdjustProfile } from "../../features/app/useAppSessionState";
import { clamp } from "../../utils/ui";
import {
  buildImageAdjustHistogramBins,
  IMAGE_ADJUST_CURVE_CANVAS_HEIGHT,
  IMAGE_ADJUST_CURVE_CANVAS_WIDTH,
  IMAGE_ADJUST_CURVE_PADDING,
  IMAGE_ADJUST_HISTOGRAM_BIN_COUNT,
  IMAGE_ADJUST_PANEL_DRAG_MARGIN,
  loadImageElementForAdjust,
  resolveCurveControlPoints,
  resolveCurvePathD,
} from "./fullscreenImageAdjustUtils";
import {
  resolveAdjustResetPatch,
  startAdjustPanelDrag as startImageAdjustPanelDrag,
  startCurvePointDrag as startImageAdjustCurvePointDrag,
  startLevelHandleDrag as startImageAdjustLevelHandleDrag,
} from "./imageAdjustInteractions";

interface UseFullscreenImageAdjustPanelControllerOptions {
  imageConvertPreviewActive: boolean;
  imageConvertPreviewAdjustProfile: ImageConvertAdjustProfile;
  imageConvertPreviewRenderedSrc: string | null;
  displayedImageSrc: string | null;
  fullscreenViewport: { width: number; height: number };
  onSetFooterVisible: (visible: boolean) => void;
  onChangeImageConvertPreviewAdjustProfile?: (
    profile: ImageConvertAdjustProfile,
  ) => void;
}

export function useFullscreenImageAdjustPanelController({
  imageConvertPreviewActive,
  imageConvertPreviewAdjustProfile,
  imageConvertPreviewRenderedSrc,
  displayedImageSrc,
  fullscreenViewport,
  onSetFooterVisible,
  onChangeImageConvertPreviewAdjustProfile,
}: UseFullscreenImageAdjustPanelControllerOptions) {
  const [imageConvertAdjustPanelOpen, setImageConvertAdjustPanelOpen] =
    useState(false);
  const [imageConvertAdjustPanelPosition, setImageConvertAdjustPanelPosition] =
    useState<{ x: number; y: number } | null>(null);
  const [imageConvertAdjustPanelDragging, setImageConvertAdjustPanelDragging] =
    useState(false);
  const [imageAdjustHistogramBins, setImageAdjustHistogramBins] = useState<
    number[]
  >(Array.from({ length: IMAGE_ADJUST_HISTOGRAM_BIN_COUNT }, () => 0));

  const imageConvertAdjustInitialProfileRef =
    useRef<ImageConvertAdjustProfile | null>(null);
  const imageAdjustPanelRef = useRef<HTMLElement>(null);
  const levelsEditorTrackRef = useRef<HTMLDivElement>(null);
  const curveSvgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!imageConvertPreviewActive) {
      setImageConvertAdjustPanelOpen(false);
      setImageConvertAdjustPanelDragging(false);
      imageConvertAdjustInitialProfileRef.current = null;
    }
  }, [imageConvertPreviewActive]);

  useEffect(() => {
    document.documentElement.dataset.mpxImageAdjustPanelOpen =
      imageConvertAdjustPanelOpen ? "1" : "0";
    return () => {
      document.documentElement.dataset.mpxImageAdjustPanelOpen = "0";
    };
  }, [imageConvertAdjustPanelOpen]);

  useEffect(() => {
    const onCancelByGlobalEvent = () => {
      const initialProfile = imageConvertAdjustInitialProfileRef.current;
      if (initialProfile) {
        onChangeImageConvertPreviewAdjustProfile?.({
          ...initialProfile,
        });
      }
      setImageConvertAdjustPanelOpen(false);
    };
    window.addEventListener("mpx:image-adjust-cancel", onCancelByGlobalEvent);
    return () => {
      window.removeEventListener(
        "mpx:image-adjust-cancel",
        onCancelByGlobalEvent,
      );
    };
  }, [onChangeImageConvertPreviewAdjustProfile]);

  useEffect(() => {
    if (imageConvertAdjustPanelOpen) {
      onSetFooterVisible(false);
    }
  }, [imageConvertAdjustPanelOpen, onSetFooterVisible]);

  useEffect(() => {
    if (!imageConvertAdjustPanelPosition) {
      return;
    }
    const panelElement = imageAdjustPanelRef.current;
    const panelWidth = panelElement?.offsetWidth ?? 560;
    const panelHeight = panelElement?.offsetHeight ?? 480;
    const nextX = clamp(
      imageConvertAdjustPanelPosition.x,
      IMAGE_ADJUST_PANEL_DRAG_MARGIN,
      Math.max(
        IMAGE_ADJUST_PANEL_DRAG_MARGIN,
        fullscreenViewport.width - panelWidth - IMAGE_ADJUST_PANEL_DRAG_MARGIN,
      ),
    );
    const nextY = clamp(
      imageConvertAdjustPanelPosition.y,
      IMAGE_ADJUST_PANEL_DRAG_MARGIN,
      Math.max(
        IMAGE_ADJUST_PANEL_DRAG_MARGIN,
        fullscreenViewport.height - panelHeight - IMAGE_ADJUST_PANEL_DRAG_MARGIN,
      ),
    );
    if (
      nextX !== imageConvertAdjustPanelPosition.x ||
      nextY !== imageConvertAdjustPanelPosition.y
    ) {
      setImageConvertAdjustPanelPosition({ x: nextX, y: nextY });
    }
  }, [
    fullscreenViewport.height,
    fullscreenViewport.width,
    imageConvertAdjustPanelPosition,
  ]);

  useEffect(() => {
    if (!imageConvertPreviewActive || !imageConvertAdjustPanelOpen) {
      return;
    }
    const source = imageConvertPreviewRenderedSrc ?? displayedImageSrc;
    if (!source) {
      setImageAdjustHistogramBins(
        Array.from({ length: IMAGE_ADJUST_HISTOGRAM_BIN_COUNT }, () => 0),
      );
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const imageElement = await loadImageElementForAdjust(source);
        if (cancelled) {
          return;
        }
        const sampleWidth = Math.max(
          1,
          Math.min(480, imageElement.naturalWidth || imageElement.width || 1),
        );
        const sampleHeight = Math.max(
          1,
          Math.min(360, imageElement.naturalHeight || imageElement.height || 1),
        );
        const canvas = document.createElement("canvas");
        canvas.width = sampleWidth;
        canvas.height = sampleHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          return;
        }
        context.clearRect(0, 0, sampleWidth, sampleHeight);
        context.drawImage(imageElement, 0, 0, sampleWidth, sampleHeight);
        const rawData = context.getImageData(0, 0, sampleWidth, sampleHeight);
        if (cancelled) {
          return;
        }
        setImageAdjustHistogramBins(
          buildImageAdjustHistogramBins(rawData.data, rawData.data.length > 0 ? 4 : 0),
        );
      } catch {
        if (!cancelled) {
          setImageAdjustHistogramBins(
            Array.from({ length: IMAGE_ADJUST_HISTOGRAM_BIN_COUNT }, () => 0),
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    displayedImageSrc,
    imageConvertAdjustPanelOpen,
    imageConvertPreviewActive,
    imageConvertPreviewRenderedSrc,
  ]);

  const updatePreviewAdjustProfile = (patch: Partial<ImageConvertAdjustProfile>) => {
    onChangeImageConvertPreviewAdjustProfile?.({
      ...imageConvertPreviewAdjustProfile,
      ...patch,
    });
  };

  const handleOpenAdjustPanel = () => {
    if (imageConvertAdjustPanelOpen) {
      return;
    }
    imageConvertAdjustInitialProfileRef.current = {
      ...imageConvertPreviewAdjustProfile,
    };
    setImageConvertAdjustPanelOpen(true);
  };

  const handleResetAdjustPanel = () => {
    updatePreviewAdjustProfile(
      resolveAdjustResetPatch(imageConvertPreviewAdjustProfile.mode),
    );
  };

  const handleCancelAdjustPanel = () => {
    const initialProfile = imageConvertAdjustInitialProfileRef.current;
    if (initialProfile) {
      onChangeImageConvertPreviewAdjustProfile?.({
        ...initialProfile,
      });
    }
    setImageConvertAdjustPanelOpen(false);
  };

  const startLevelHandleDrag = (
    handle: "black" | "gamma" | "white",
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => {
    startImageAdjustLevelHandleDrag({
      handle,
      event,
      trackElement: levelsEditorTrackRef.current,
      profile: imageConvertPreviewAdjustProfile,
      onUpdateProfile: updatePreviewAdjustProfile,
    });
  };

  const startAdjustPanelDrag = (event: ReactMouseEvent<HTMLDivElement>) => {
    startImageAdjustPanelDrag({
      event,
      panelElement: imageAdjustPanelRef.current as HTMLDivElement | null,
      viewport: fullscreenViewport,
      onDraggingChange: setImageConvertAdjustPanelDragging,
      onPositionChange: setImageConvertAdjustPanelPosition,
    });
  };

  const startCurvePointDrag = (
    pointKey: "shadow" | "midtone" | "highlight",
    event: ReactMouseEvent<SVGCircleElement>,
  ) => {
    startImageAdjustCurvePointDrag({
      pointKey,
      event,
      svgElement: curveSvgRef.current,
      profile: imageConvertPreviewAdjustProfile,
      onUpdateProfile: updatePreviewAdjustProfile,
    });
  };

  const levelBlackRatio = clamp(
    imageConvertPreviewAdjustProfile.level_input_black / 255,
    0,
    1,
  );
  const levelWhiteRatio = clamp(
    imageConvertPreviewAdjustProfile.level_input_white / 255,
    0,
    1,
  );
  const levelSpan = Math.max(0.0001, levelWhiteRatio - levelBlackRatio);
  const levelGammaRatio = clamp(
    levelBlackRatio +
      levelSpan * Math.pow(0.5, imageConvertPreviewAdjustProfile.level_gamma),
    levelBlackRatio + 0.01,
    levelWhiteRatio - 0.01,
  );

  const curvePoints = resolveCurveControlPoints(imageConvertPreviewAdjustProfile);
  const curvePathD = resolveCurvePathD(imageConvertPreviewAdjustProfile);
  const curveInnerWidth =
    IMAGE_ADJUST_CURVE_CANVAS_WIDTH - IMAGE_ADJUST_CURVE_PADDING * 2;
  const curveInnerHeight =
    IMAGE_ADJUST_CURVE_CANVAS_HEIGHT - IMAGE_ADJUST_CURVE_PADDING * 2;
  const curveHistogramBars = useMemo(
    () =>
      imageAdjustHistogramBins.map((ratio, index) => {
        const barWidth = curveInnerWidth / IMAGE_ADJUST_HISTOGRAM_BIN_COUNT;
        const barHeight = Math.max(1, ratio * curveInnerHeight);
        return {
          x: IMAGE_ADJUST_CURVE_PADDING + index * barWidth,
          y: IMAGE_ADJUST_CURVE_PADDING + curveInnerHeight - barHeight,
          width: Math.max(0.5, barWidth - 0.5),
          height: barHeight,
        };
      }),
    [curveInnerHeight, curveInnerWidth, imageAdjustHistogramBins],
  );

  const imageAdjustPanelInlineStyle: CSSProperties | undefined =
    imageConvertAdjustPanelPosition
      ? {
          left: `${Math.round(imageConvertAdjustPanelPosition.x)}px`,
          top: `${Math.round(imageConvertAdjustPanelPosition.y)}px`,
          bottom: "auto",
        }
      : undefined;

  return {
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
  };
}
