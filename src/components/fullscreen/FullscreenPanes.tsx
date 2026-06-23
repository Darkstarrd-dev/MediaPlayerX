import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  RefObject,
  WheelEvent as ReactWheelEvent,
} from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import type { VideoFitMode } from "../../features/media/videoFitMode";
import { clamp } from "../../utils/ui";
import SubtitleOverlay from "../subtitles/SubtitleOverlay";
import type { MediaGeometry, PaneKey, PaneTransform } from "./paneMath";

interface FullscreenImagePaneProps {
  paneRef: RefObject<HTMLElement | null>;
  className: string;
  dataSlot?: string;
  flex: number;
  fullscreenDisplay: "dual" | "video-only" | "image-only";
  singlePane: PaneKey | null;
  draggingPane: PaneKey | null;
  imageGeometry: MediaGeometry;
  imageTransform: PaneTransform;
  displayedImageSrc: string | null;
  focusedImageOrdinal: number | null;
  controlsRows: ReactNode;
  overlayContent?: ReactNode;
  deleteOverlayContent?: ReactNode;
  imageConvertPreviewMode?: boolean;
  imageConvertPreviewSrc?: string | null;
  imageConvertPreviewError?: string | null;
  imageConvertCompareSplit?: number;
  onSetImageConvertCompareSplit?: (value: number) => void;
  /**
   * 多层预渲染：开启时在 .fullscreen-media-image 内堆叠多层 <img>，
   * 仅 active 层 opacity:1，切换近瞬时、零重新解码。窗口层 url 与显示同源。
   */
  layeredRenderEnabled?: boolean;
  windowImageSrcs?: string[];
  onSetVideoFocus: (enabled: boolean) => void;
  onWheel: (event: ReactWheelEvent<HTMLElement>) => void;
  onMouseDown: (event: ReactMouseEvent<HTMLElement>) => void;
  onImageNaturalSize: (width: number, height: number) => void;
}

export function FullscreenImagePane({
  paneRef,
  className,
  dataSlot,
  flex,
  fullscreenDisplay,
  singlePane,
  draggingPane,
  imageGeometry,
  imageTransform,
  displayedImageSrc,
  focusedImageOrdinal,
  controlsRows,
  overlayContent,
  deleteOverlayContent,
  imageConvertPreviewMode = false,
  imageConvertPreviewSrc,
  imageConvertPreviewError,
  imageConvertCompareSplit = 0.5,
  onSetImageConvertCompareSplit,
  layeredRenderEnabled = false,
  windowImageSrcs,
  onSetVideoFocus,
  onWheel,
  onMouseDown,
  onImageNaturalSize,
}: FullscreenImagePaneProps) {
  const clampedCompareSplit = Math.max(
    0.05,
    Math.min(0.95, imageConvertCompareSplit),
  );
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  const startCompareDividerDrag = (
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => {
    if (
      !imageConvertPreviewMode ||
      !onSetImageConvertCompareSplit ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const onMouseMove = (moveEvent: MouseEvent) => {
      const stageElement = paneRef.current?.querySelector(".fullscreen-stage");
      const rect = stageElement?.getBoundingClientRect();
      if (!rect || rect.width <= 1) {
        return;
      }
      const ratio = (moveEvent.clientX - rect.left) / rect.width;
      onSetImageConvertCompareSplit(
        Math.max(0.05, Math.min(0.95, Number(ratio.toFixed(3)))),
      );
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleMouseDown = (event: ReactMouseEvent<HTMLElement>) => {
    mouseDownPosRef.current = { x: event.clientX, y: event.clientY };
    onMouseDown(event);
  };

  const handleClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (fullscreenDisplay !== "dual") {
      return;
    }

    // 检查是否是真正的点击（非拖拽）
    const downPos = mouseDownPosRef.current;
    if (downPos) {
      const dx = Math.abs(event.clientX - downPos.x);
      const dy = Math.abs(event.clientY - downPos.y);
      // 如果移动距离超过 5px，视为拖拽而非点击
      if (dx > 5 || dy > 5) {
        return;
      }
    }

    onSetVideoFocus(false);
  };

  return (
    <section
      ref={paneRef}
      className={className}
      data-slot={dataSlot}
      style={{ flex }}
      onClick={handleClick}
      onMouseMove={() => {
        if (fullscreenDisplay === "dual") {
          onSetVideoFocus(false);
        }
      }}
      onWheel={onWheel}
      onMouseDown={handleMouseDown}
    >
      <div
        className={`fullscreen-stage mpx-scrollbar-hidden ${singlePane === "image" ? "is-draggable" : ""} ${draggingPane === "image" ? "is-dragging" : ""}`}
      >
        <div
          className="fullscreen-media fullscreen-media-image"
          style={{
            width: `${imageGeometry.width}px`,
            height: `${imageGeometry.height}px`,
            transform: `translate3d(${imageTransform.offsetX}px, ${imageTransform.offsetY}px, 0)`,
          }}
        >
          {displayedImageSrc ? (
            layeredRenderEnabled &&
            !imageConvertPreviewMode &&
            windowImageSrcs &&
            windowImageSrcs.length > 0 ? (
              <div
                className="fullscreen-media-image-layers"
                data-slot="fs-image-layers"
              >
                {windowImageSrcs.map((src) => {
                  const isActive = src === displayedImageSrc;
                  return (
                    <img
                      key={src}
                      className={`fullscreen-media-image-layer${isActive ? " is-active" : ""}`}
                      src={src}
                      alt={`图片 #${focusedImageOrdinal ?? "-"}`}
                      draggable={false}
                      // 仅 active 层驱动 onImageNaturalSize，
                      // 避免背景层抢设 aspect/分辨率（footer 显示）
                      onLoad={
                        isActive
                          ? (event) => {
                              const imageElement = event.currentTarget;
                              onImageNaturalSize(
                                imageElement.naturalWidth,
                                imageElement.naturalHeight,
                              );
                            }
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            ) : imageConvertPreviewMode ? (
              <div
                className="fullscreen-image-compare"
                data-slot="fs-image-convert-preview-panel"
                style={
                  {
                    "--mpx-fs-compare-split": `${Math.round(clampedCompareSplit * 100)}%`,
                  } as CSSProperties
                }
              >
                <img
                  className="fullscreen-image-compare-layer"
                  src={displayedImageSrc}
                  alt={`图片 #${focusedImageOrdinal ?? "-"}`}
                  draggable={false}
                  onLoad={(event) => {
                    const imageElement = event.currentTarget;
                    onImageNaturalSize(
                      imageElement.naturalWidth,
                      imageElement.naturalHeight,
                    );
                  }}
                />
                {imageConvertPreviewError ? null : (
                  <img
                    className="fullscreen-image-compare-layer is-preview"
                    src={imageConvertPreviewSrc ?? displayedImageSrc}
                    alt={`转换预览 #${focusedImageOrdinal ?? "-"}`}
                    draggable={false}
                  />
                )}
                {imageConvertPreviewError ? null : (
                  <button
                    aria-label="调整预览分割位置"
                    className="fullscreen-image-compare-divider"
                    data-slot="fs-image-convert-preview-splitter"
                    data-tooltip-label="调整预览分割位置"
                    type="button"
                    style={{
                      left: `${Math.round(clampedCompareSplit * 100)}%`,
                    }}
                    onMouseDown={startCompareDividerDrag}
                  />
                )}
                {imageConvertPreviewError ? (
                  <div
                    className="fullscreen-image-compare-error"
                    data-slot="fs-image-convert-preview-error-ovl"
                  >
                    预览失败，已回退为原图显示：{imageConvertPreviewError}
                  </div>
                ) : null}
              </div>
            ) : (
              <img
                className="fullscreen-media-image-element"
                src={displayedImageSrc}
                alt={`图片 #${focusedImageOrdinal ?? "-"}`}
                draggable={false}
                onLoad={(event) => {
                  const imageElement = event.currentTarget;
                  onImageNaturalSize(
                    imageElement.naturalWidth,
                    imageElement.naturalHeight,
                  );
                }}
              />
            )
          ) : null}
        </div>

        {overlayContent ? (
          <div className="fullscreen-pane-overlay">{overlayContent}</div>
        ) : null}

        {deleteOverlayContent}

        {fullscreenDisplay !== "video-only" ? controlsRows : null}
      </div>
    </section>
  );
}

interface FullscreenVideoPaneProps {
  paneRef: RefObject<HTMLElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  className: string;
  dataSlot?: string;
  flex: number;
  fullscreenDisplay: "dual" | "video-only" | "image-only";
  singlePane: PaneKey | null;
  draggingPane: PaneKey | null;
  videoGeometry: MediaGeometry;
  videoTransform: PaneTransform;
  focusedVideoId: string | null;
  videoPlaying: boolean;
  videoTime: number;
  focusedVideoSrc: string | null;
  focusedVideoCoverImageSrc: string | null;
  focusedVideoCoverColor: string;
  subtitleTrackUrl: string | null;
  autoSubtitleActive: boolean;
  subtitleVisible: boolean;
  liveSubtitleText: string | null;
  subtitleOverlayStyle: CSSProperties;
  bindVideoElement: (element: HTMLVideoElement | null) => void;
  videoFitMode: VideoFitMode;
  videoLoopMode: "single" | "list";
  videoControlsVisible: boolean;
  videoControlsAtTop: boolean;
  videoControlsTop: number;
  videoControlsLeft: number;
  videoControlsWidth: number;
  controlsRows: ReactNode;
  overlayContent?: ReactNode;
  deleteOverlayContent?: ReactNode;
  onSetVideoFocus: (enabled: boolean) => void;
  onWheel: (event: ReactWheelEvent<HTMLElement>) => void;
  onMouseDown: (event: ReactMouseEvent<HTMLElement>) => void;
  onShowControls: () => void;
  onHideControls: () => void;
  onVideoTimeUpdate: (time: number) => void;
  onVideoDurationDetected: (duration: number) => void;
  onVideoEnded: () => void;
}

export function FullscreenVideoPane({
  paneRef,
  videoRef,
  className,
  dataSlot,
  flex,
  fullscreenDisplay,
  singlePane,
  draggingPane,
  videoGeometry,
  videoTransform,
  focusedVideoId,
  videoPlaying,
  videoTime,
  focusedVideoSrc,
  focusedVideoCoverImageSrc,
  focusedVideoCoverColor,
  subtitleTrackUrl,
  autoSubtitleActive,
  subtitleVisible,
  liveSubtitleText,
  subtitleOverlayStyle,
  bindVideoElement,
  videoFitMode,
  videoLoopMode,
  videoControlsVisible,
  videoControlsAtTop,
  videoControlsTop,
  videoControlsLeft,
  videoControlsWidth,
  controlsRows,
  overlayContent,
  deleteOverlayContent,
  onSetVideoFocus,
  onWheel,
  onMouseDown,
  onShowControls,
  onHideControls,
  onVideoTimeUpdate,
  onVideoDurationDetected,
  onVideoEnded,
}: FullscreenVideoPaneProps) {
  const [displayedVideoId, setDisplayedVideoId] = useState(focusedVideoId);
  const [displayedVideoSrc, setDisplayedVideoSrc] = useState(focusedVideoSrc);
  const [hasPlayedCurrentSource, setHasPlayedCurrentSource] = useState(false);
  const [hasSeekPreviewCurrentSource, setHasSeekPreviewCurrentSource] =
    useState(false);
  const lastStableTimeRef = useRef(0);
  const sourceChangedAtMsRef = useRef(0);
  const sourceRestoreAnchorTimeRef = useRef(0);
  const sourceRestoreAnchorVideoIdRef = useRef<string | null>(focusedVideoId);
  const previousDisplayedVideoIdRef = useRef<string | null>(focusedVideoId);
  const pendingVideoSrcRef = useRef<string | null>(null);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    if (!focusedVideoId) {
      pendingVideoSrcRef.current = null;
      lastStableTimeRef.current = 0;
      sourceRestoreAnchorTimeRef.current = 0;
      sourceRestoreAnchorVideoIdRef.current = null;
      setDisplayedVideoId(null);
      setDisplayedVideoSrc(null);
      return;
    }

    if (displayedVideoId !== focusedVideoId) {
      pendingVideoSrcRef.current = null;
      lastStableTimeRef.current = Math.max(0, videoTime);
      sourceRestoreAnchorTimeRef.current = Math.max(0, videoTime);
      sourceRestoreAnchorVideoIdRef.current = focusedVideoId;
      setDisplayedVideoId(focusedVideoId);
      setDisplayedVideoSrc(focusedVideoSrc);
      return;
    }

    if (!focusedVideoSrc) {
      if (!videoPlaying) {
        pendingVideoSrcRef.current = null;
        setDisplayedVideoSrc(null);
      }
      return;
    }

    if (displayedVideoSrc === null) {
      pendingVideoSrcRef.current = null;
      if (displayedVideoSrc !== focusedVideoSrc) {
        setDisplayedVideoSrc(focusedVideoSrc);
      }
      return;
    }

    if (focusedVideoSrc === displayedVideoSrc) {
      if (pendingVideoSrcRef.current === focusedVideoSrc) {
        pendingVideoSrcRef.current = null;
      }
      return;
    }

    pendingVideoSrcRef.current = focusedVideoSrc;
    if (!videoPlaying) {
      pendingVideoSrcRef.current = null;
      setDisplayedVideoSrc(focusedVideoSrc);
    }
  }, [
    displayedVideoId,
    displayedVideoSrc,
    focusedVideoId,
    focusedVideoSrc,
    videoPlaying,
    videoTime,
  ]);

  const commitPendingVideoSrc = () => {
    const pendingVideoSrc = pendingVideoSrcRef.current;
    if (!pendingVideoSrc || pendingVideoSrc === displayedVideoSrc) {
      return false;
    }

    pendingVideoSrcRef.current = null;
    setDisplayedVideoSrc(pendingVideoSrc);
    return true;
  };

  useLayoutEffect(() => {
    const previousDisplayedVideoId = previousDisplayedVideoIdRef.current;
    previousDisplayedVideoIdRef.current = displayedVideoId;

    const sameVideo =
      displayedVideoId !== null &&
      previousDisplayedVideoId !== null &&
      displayedVideoId === previousDisplayedVideoId;

    sourceChangedAtMsRef.current = Date.now();
    if (sameVideo) {
      sourceRestoreAnchorTimeRef.current = Math.max(
        lastStableTimeRef.current,
        Math.max(0, videoTime),
      );
      sourceRestoreAnchorVideoIdRef.current = displayedVideoId;
    } else {
      lastStableTimeRef.current = Math.max(0, videoTime);
      sourceRestoreAnchorTimeRef.current = Math.max(0, videoTime);
      sourceRestoreAnchorVideoIdRef.current = displayedVideoId;
    }
    setHasPlayedCurrentSource(false);
    setHasSeekPreviewCurrentSource(false);
  }, [displayedVideoId, displayedVideoSrc, videoTime]);

  useEffect(() => {
    if (videoPlaying && displayedVideoSrc) {
      setHasPlayedCurrentSource(true);
    }
  }, [displayedVideoSrc, videoPlaying]);

  useEffect(() => {
    if (videoTime > 0.05) {
      sourceRestoreAnchorVideoIdRef.current = displayedVideoId;
      lastStableTimeRef.current = Math.max(
        lastStableTimeRef.current,
        videoTime,
      );
      sourceRestoreAnchorTimeRef.current = Math.max(
        sourceRestoreAnchorTimeRef.current,
        videoTime,
      );
    }
  }, [displayedVideoId, videoTime]);

  const useFixedBottomControls = fullscreenDisplay !== "image-only";
  const controlsAtTop = useFixedBottomControls ? false : videoControlsAtTop;
  const showVideoFrame = Boolean(
    displayedVideoSrc &&
    (videoPlaying ||
      hasPlayedCurrentSource ||
      hasSeekPreviewCurrentSource ||
      !focusedVideoCoverImageSrc),
  );
  const controlsStyle = useFixedBottomControls
    ? {
        bottom: "var(--mpx-fullscreen-controls-bottom, 5%)",
        left: `${videoControlsLeft}px`,
        width: `${videoControlsWidth}px`,
      }
    : {
        top: `${videoControlsTop}px`,
        left: `${videoControlsLeft}px`,
        width: `${videoControlsWidth}px`,
      };

  const handleMouseDown = (event: ReactMouseEvent<HTMLElement>) => {
    mouseDownPosRef.current = { x: event.clientX, y: event.clientY };
    onMouseDown(event);
  };

  const handleClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (fullscreenDisplay !== "dual") {
      return;
    }

    // 检查是否是真正的点击（非拖拽）
    const downPos = mouseDownPosRef.current;
    if (downPos) {
      const dx = Math.abs(event.clientX - downPos.x);
      const dy = Math.abs(event.clientY - downPos.y);
      // 如果移动距离超过 5px，视为拖拽而非点击
      if (dx > 5 || dy > 5) {
        return;
      }
    }

    onSetVideoFocus(true);
  };

  return (
    <section
      ref={paneRef}
      className={className}
      data-slot={dataSlot}
      style={{ flex }}
      onClick={handleClick}
      onMouseMove={() => {
        if (fullscreenDisplay === "dual") {
          onSetVideoFocus(true);
        }
      }}
      onWheel={onWheel}
      onMouseDown={handleMouseDown}
      onMouseLeave={onHideControls}
    >
      <div
        className={`fullscreen-stage mpx-scrollbar-hidden ${singlePane === "video" || fullscreenDisplay === "dual" ? "is-draggable" : ""} ${draggingPane === "video" ? "is-dragging" : ""}`}
      >
        <div
          className="fullscreen-media fullscreen-media-video"
          style={{
            width: `${videoGeometry.width}px`,
            height: `${videoGeometry.height}px`,
            transform: `translate3d(${videoTransform.offsetX}px, ${videoTransform.offsetY}px, 0)`,
            background: showVideoFrame
              ? "var(--mpx-video-screen-bg)"
              : focusedVideoCoverColor,
          }}
        >
          {displayedVideoSrc ? (
            <video
              ref={(element) => {
                videoRef.current = element;
                bindVideoElement(element);
              }}
              className="fullscreen-media-video-element"
              style={{
                opacity: showVideoFrame ? 1 : 0,
                objectFit: videoFitMode === "original" ? "none" : videoFitMode,
                objectPosition: "center center",
              }}
              src={displayedVideoSrc}
              crossOrigin="anonymous"
              preload="metadata"
              playsInline
              loop={videoLoopMode === "single"}
              onError={() => {
                void commitPendingVideoSrc();
              }}
              onTimeUpdate={() => {
                const currentTime = videoRef.current?.currentTime ?? 0;
                const recentSourceSwap =
                  Date.now() - sourceChangedAtMsRef.current < 2_500;
                const restoreAnchorTime =
                  sourceRestoreAnchorVideoIdRef.current === displayedVideoId
                    ? sourceRestoreAnchorTimeRef.current
                    : 0;
                const shouldIgnoreTransientReset =
                  currentTime <= 0.05 &&
                  videoPlaying &&
                  recentSourceSwap &&
                  restoreAnchorTime > 0.8;

                if (shouldIgnoreTransientReset) {
                  return;
                }

                if (currentTime > 0.05) {
                  sourceRestoreAnchorVideoIdRef.current = displayedVideoId;
                  lastStableTimeRef.current = currentTime;
                  sourceRestoreAnchorTimeRef.current = Math.max(
                    sourceRestoreAnchorTimeRef.current,
                    currentTime,
                  );
                  setHasSeekPreviewCurrentSource(true);
                }
                onVideoTimeUpdate(currentTime);
              }}
              onLoadedMetadata={() => {
                const videoElement = videoRef.current;
                const duration = videoElement?.duration ?? 0;
                if (Number.isFinite(duration) && duration > 0) {
                  onVideoDurationDetected(duration);
                }
                const restoreAnchorTime =
                  sourceRestoreAnchorVideoIdRef.current === displayedVideoId
                    ? sourceRestoreAnchorTimeRef.current
                    : 0;
                const restoreTime = clamp(
                  Math.max(videoTime, restoreAnchorTime),
                  0,
                  Number.isFinite(duration) && duration > 0
                    ? duration
                    : Math.max(0, videoTime),
                );
                if (
                  restoreTime > 0.05 &&
                  videoElement &&
                  Math.abs(videoElement.currentTime - restoreTime) > 0.05
                ) {
                  videoElement.currentTime = restoreTime;
                }
                if ((videoElement?.currentTime ?? 0) > 0.05) {
                  sourceRestoreAnchorVideoIdRef.current = displayedVideoId;
                  lastStableTimeRef.current = Math.max(
                    lastStableTimeRef.current,
                    videoElement?.currentTime ?? 0,
                  );
                  setHasSeekPreviewCurrentSource(true);
                }
                if (videoPlaying && videoElement) {
                  void videoElement.play().catch(() => undefined);
                }
              }}
              onSeeked={() => {
                const currentTime = videoRef.current?.currentTime ?? 0;
                if (currentTime > 0.05) {
                  sourceRestoreAnchorVideoIdRef.current = displayedVideoId;
                  lastStableTimeRef.current = currentTime;
                  sourceRestoreAnchorTimeRef.current = Math.max(
                    sourceRestoreAnchorTimeRef.current,
                    currentTime,
                  );
                  setHasSeekPreviewCurrentSource(true);
                }
                onVideoTimeUpdate(currentTime);
              }}
              onEnded={() => {
                if (videoLoopMode === "single") {
                  onVideoTimeUpdate(0);
                  return;
                }
                onVideoEnded();
              }}
            >
              {!autoSubtitleActive && subtitleTrackUrl ? (
                <track
                  default
                  kind="subtitles"
                  label="字幕"
                  src={subtitleTrackUrl}
                />
              ) : null}
            </video>
          ) : null}

          <SubtitleOverlay
            text={autoSubtitleActive ? liveSubtitleText : null}
            visible={subtitleVisible}
            style={subtitleOverlayStyle}
          />

          {!showVideoFrame && focusedVideoCoverImageSrc ? (
            <img
              className="fullscreen-media-video-cover"
              style={{
                objectFit: videoFitMode === "original" ? "none" : videoFitMode,
                objectPosition: "center center",
              }}
              src={focusedVideoCoverImageSrc}
              alt="视频封面"
            />
          ) : null}

          {!focusedVideoSrc ? (
            <div className="fullscreen-media-empty">无可用视频源</div>
          ) : null}
        </div>

        {overlayContent ? (
          <div className="fullscreen-pane-overlay">{overlayContent}</div>
        ) : null}

        {deleteOverlayContent}

        {fullscreenDisplay !== "image-only" ? (
          <>
            <div
              className={`fullscreen-video-controls-hotzone ${controlsAtTop ? "is-top" : "is-bottom"}`}
              data-slot="fs-video-controls-hotzone-ovl"
              style={controlsStyle}
              onMouseEnter={onShowControls}
              onMouseLeave={onHideControls}
            />
            <div
              className={`fullscreen-video-controls ${controlsAtTop ? "is-top" : "is-bottom"} ${videoControlsVisible ? "is-visible" : ""}`}
              data-slot="fs-video-controls-float-panel"
              style={controlsStyle}
              onMouseEnter={onShowControls}
              onMouseLeave={onHideControls}
            >
              {controlsRows}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
