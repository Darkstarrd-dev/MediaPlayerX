import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  RefObject,
  WheelEvent as ReactWheelEvent,
} from 'react'
import { useEffect, useState } from 'react'

import type { VideoFitMode } from '../../features/media/videoFitMode'
import { clamp } from '../../utils/ui'
import SubtitleOverlay from '../subtitles/SubtitleOverlay'
import type { MediaGeometry, PaneKey, PaneTransform } from './paneMath'

interface FullscreenImagePaneProps {
  paneRef: RefObject<HTMLElement | null>
  className: string
  dataSlot?: string
  flex: number
  fullscreenDisplay: 'dual' | 'video-only' | 'image-only'
  singlePane: PaneKey | null
  draggingPane: PaneKey | null
  imageGeometry: MediaGeometry
  imageTransform: PaneTransform
  displayedImageSrc: string | null
  focusedImageOrdinal: number | null
  controlsRows: ReactNode
  overlayContent?: ReactNode
  imageConvertPreviewMode?: boolean
  imageConvertPreviewSrc?: string | null
  imageConvertPreviewError?: string | null
  imageConvertCompareSplit?: number
  onSetImageConvertCompareSplit?: (value: number) => void
  onSetVideoFocus: (enabled: boolean) => void
  onWheel: (event: ReactWheelEvent<HTMLElement>) => void
  onMouseDown: (event: ReactMouseEvent<HTMLElement>) => void
  onImageNaturalSize: (width: number, height: number) => void
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
  imageConvertPreviewMode = false,
  imageConvertPreviewSrc,
  imageConvertPreviewError,
  imageConvertCompareSplit = 0.5,
  onSetImageConvertCompareSplit,
  onSetVideoFocus,
  onWheel,
  onMouseDown,
  onImageNaturalSize,
}: FullscreenImagePaneProps) {
  const clampedCompareSplit = Math.max(0.05, Math.min(0.95, imageConvertCompareSplit))

  const startCompareDividerDrag = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (!imageConvertPreviewMode || !onSetImageConvertCompareSplit || event.button !== 0) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    const onMouseMove = (moveEvent: MouseEvent) => {
      const stageElement = paneRef.current?.querySelector('.fullscreen-stage')
      const rect = stageElement?.getBoundingClientRect()
      if (!rect || rect.width <= 1) {
        return
      }
      const ratio = (moveEvent.clientX - rect.left) / rect.width
      onSetImageConvertCompareSplit(Math.max(0.05, Math.min(0.95, Number(ratio.toFixed(3)))))
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  return (
    <section
      ref={paneRef}
      className={className}
      data-slot={dataSlot}
      style={{ flex }}
      onClick={() => {
        if (fullscreenDisplay === 'dual') {
          onSetVideoFocus(false)
        }
      }}
      onMouseMove={() => {
        if (fullscreenDisplay === 'dual') {
          onSetVideoFocus(false)
        }
      }}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
    >
      <div className={`fullscreen-stage mpx-scrollbar-hidden ${singlePane === 'image' ? 'is-draggable' : ''} ${draggingPane === 'image' ? 'is-dragging' : ''}`}>
        <div
          className="fullscreen-media fullscreen-media-image"
          style={{
            width: `${imageGeometry.width}px`,
            height: `${imageGeometry.height}px`,
            transform: `translate3d(${imageTransform.offsetX}px, ${imageTransform.offsetY}px, 0)`,
          }}
        >
          {displayedImageSrc ? (
            imageConvertPreviewMode ? (
              <div className="fullscreen-image-compare" data-slot="fs-image-convert-preview-panel" style={{ '--mpx-fs-compare-split': `${Math.round(clampedCompareSplit * 100)}%` } as CSSProperties}>
                <img
                  className="fullscreen-image-compare-layer"
                  src={displayedImageSrc}
                  alt={`图片 #${focusedImageOrdinal ?? '-'}`}
                  draggable={false}
                  onLoad={(event) => {
                    const imageElement = event.currentTarget
                    onImageNaturalSize(imageElement.naturalWidth, imageElement.naturalHeight)
                  }}
                />
                {imageConvertPreviewError ? null : (
                  <img
                    className="fullscreen-image-compare-layer is-preview"
                    src={imageConvertPreviewSrc ?? displayedImageSrc}
                    alt={`转换预览 #${focusedImageOrdinal ?? '-'}`}
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
                    style={{ left: `${Math.round(clampedCompareSplit * 100)}%` }}
                    onMouseDown={startCompareDividerDrag}
                  />
                )}
                {imageConvertPreviewError ? <div className="fullscreen-image-compare-error" data-slot="fs-image-convert-preview-error-ovl">预览失败，已回退为原图显示：{imageConvertPreviewError}</div> : null}
              </div>
            ) : (
              <img
                className="fullscreen-media-image-element"
                src={displayedImageSrc}
                alt={`图片 #${focusedImageOrdinal ?? '-'}`}
                draggable={false}
                onLoad={(event) => {
                  const imageElement = event.currentTarget
                  onImageNaturalSize(imageElement.naturalWidth, imageElement.naturalHeight)
                }}
              />
            )
          ) : null}
        </div>

        {overlayContent ? <div className="fullscreen-pane-overlay">{overlayContent}</div> : null}

        {fullscreenDisplay !== 'video-only' ? controlsRows : null}
      </div>
    </section>
  )
}

interface FullscreenVideoPaneProps {
  paneRef: RefObject<HTMLElement | null>
  videoRef: RefObject<HTMLVideoElement | null>
  className: string
  dataSlot?: string
  flex: number
  fullscreenDisplay: 'dual' | 'video-only' | 'image-only'
  singlePane: PaneKey | null
  draggingPane: PaneKey | null
  videoGeometry: MediaGeometry
  videoTransform: PaneTransform
  videoPlaying: boolean
  videoTime: number
  focusedVideoSrc: string | null
  focusedVideoCoverImageSrc: string | null
  focusedVideoCoverColor: string
  subtitleTrackUrl: string | null
  autoSubtitleActive: boolean
  subtitleVisible: boolean
  liveSubtitleText: string | null
  subtitleOverlayStyle: CSSProperties
  bindVideoElement: (element: HTMLVideoElement | null) => void
  videoFitMode: VideoFitMode
  videoLoopMode: 'single' | 'list'
  videoControlsVisible: boolean
  videoControlsAtTop: boolean
  videoControlsTop: number
  videoControlsLeft: number
  videoControlsWidth: number
  controlsRows: ReactNode
  overlayContent?: ReactNode
  onSetVideoFocus: (enabled: boolean) => void
  onWheel: (event: ReactWheelEvent<HTMLElement>) => void
  onMouseDown: (event: ReactMouseEvent<HTMLElement>) => void
  onShowControls: () => void
  onHideControls: () => void
  onVideoTimeUpdate: (time: number) => void
  onVideoDurationDetected: (duration: number) => void
  onVideoEnded: () => void
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
  onSetVideoFocus,
  onWheel,
  onMouseDown,
  onShowControls,
  onHideControls,
  onVideoTimeUpdate,
  onVideoDurationDetected,
  onVideoEnded,
}: FullscreenVideoPaneProps) {
  const [hasPlayedCurrentSource, setHasPlayedCurrentSource] = useState(false)
  const [hasSeekPreviewCurrentSource, setHasSeekPreviewCurrentSource] = useState(false)

  useEffect(() => {
    setHasPlayedCurrentSource(false)
    setHasSeekPreviewCurrentSource(false)
  }, [focusedVideoSrc])

  useEffect(() => {
    if (videoPlaying && focusedVideoSrc) {
      setHasPlayedCurrentSource(true)
    }
  }, [focusedVideoSrc, videoPlaying])

  const useFixedBottomControls = fullscreenDisplay !== 'image-only'
  const controlsAtTop = useFixedBottomControls ? false : videoControlsAtTop
  const showVideoFrame = Boolean(
    focusedVideoSrc && (videoPlaying || hasPlayedCurrentSource || hasSeekPreviewCurrentSource || !focusedVideoCoverImageSrc),
  )
  const controlsStyle = useFixedBottomControls
    ? {
        bottom: 'var(--mpx-fullscreen-controls-bottom, 5%)',
        left: `${videoControlsLeft}px`,
        width: `${videoControlsWidth}px`,
      }
    : {
        top: `${videoControlsTop}px`,
        left: `${videoControlsLeft}px`,
        width: `${videoControlsWidth}px`,
      }

  return (
    <section
      ref={paneRef}
      className={className}
      data-slot={dataSlot}
      style={{ flex }}
      onClick={() => {
        if (fullscreenDisplay === 'dual') {
          onSetVideoFocus(true)
        }
      }}
      onMouseMove={() => {
        if (fullscreenDisplay === 'dual') {
          onSetVideoFocus(true)
        }
      }}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseLeave={onHideControls}
    >
      <div
        className={`fullscreen-stage mpx-scrollbar-hidden ${singlePane === 'video' || fullscreenDisplay === 'dual' ? 'is-draggable' : ''} ${draggingPane === 'video' ? 'is-dragging' : ''}`}
      >
        <div
          className="fullscreen-media fullscreen-media-video"
            style={{
              width: `${videoGeometry.width}px`,
              height: `${videoGeometry.height}px`,
              transform: `translate3d(${videoTransform.offsetX}px, ${videoTransform.offsetY}px, 0)`,
              background: showVideoFrame ? 'var(--mpx-video-screen-bg)' : focusedVideoCoverColor,
            }}
          >
          {focusedVideoSrc ? (
            <video
              ref={(element) => {
                videoRef.current = element
                bindVideoElement(element)
              }}
              className="fullscreen-media-video-element"
              style={{
                opacity: showVideoFrame ? 1 : 0,
                objectFit: videoFitMode === 'original' ? 'none' : videoFitMode,
                objectPosition: 'center center',
              }}
              src={focusedVideoSrc}
              crossOrigin="anonymous"
              preload="metadata"
              playsInline
              loop={videoLoopMode === 'single'}
              onTimeUpdate={() => {
                const currentTime = videoRef.current?.currentTime ?? 0
                if (currentTime > 0.05) {
                  setHasSeekPreviewCurrentSource(true)
                }
                onVideoTimeUpdate(currentTime)
              }}
              onLoadedMetadata={() => {
                const duration = videoRef.current?.duration ?? 0
                if (Number.isFinite(duration) && duration > 0) {
                  onVideoDurationDetected(duration)
                }
                const restoreTime = clamp(videoTime, 0, Number.isFinite(duration) && duration > 0 ? duration : Math.max(0, videoTime))
                if (restoreTime > 0.05 && videoRef.current && Math.abs(videoRef.current.currentTime - restoreTime) > 0.05) {
                  videoRef.current.currentTime = restoreTime
                }
                if ((videoRef.current?.currentTime ?? 0) > 0.05) {
                  setHasSeekPreviewCurrentSource(true)
                }
              }}
              onSeeked={() => {
                const currentTime = videoRef.current?.currentTime ?? 0
                if (currentTime > 0.05) {
                  setHasSeekPreviewCurrentSource(true)
                }
                onVideoTimeUpdate(currentTime)
              }}
              onEnded={() => {
                if (videoLoopMode === 'single') {
                  onVideoTimeUpdate(0)
                  return
                }
                onVideoEnded()
              }}
            >
              {!autoSubtitleActive && subtitleTrackUrl ? <track default kind="subtitles" label="字幕" src={subtitleTrackUrl} /> : null}
            </video>
          ) : null}

          <SubtitleOverlay text={autoSubtitleActive ? liveSubtitleText : null} visible={subtitleVisible} style={subtitleOverlayStyle} />

          {!showVideoFrame && focusedVideoCoverImageSrc ? (
            <img
              className="fullscreen-media-video-cover"
              style={{
                objectFit: videoFitMode === 'original' ? 'none' : videoFitMode,
                objectPosition: 'center center',
              }}
              src={focusedVideoCoverImageSrc}
              alt="视频封面"
            />
          ) : null}

          {!focusedVideoSrc ? <div className="fullscreen-media-empty">无可用视频源</div> : null}
        </div>

        {overlayContent ? <div className="fullscreen-pane-overlay">{overlayContent}</div> : null}

        {fullscreenDisplay !== 'image-only' ? (
          <>
            <div
              className={`fullscreen-video-controls-hotzone ${controlsAtTop ? 'is-top' : 'is-bottom'}`}
              data-slot="fs-video-controls-hotzone-ovl"
              style={controlsStyle}
              onMouseEnter={onShowControls}
              onMouseLeave={onHideControls}
            />
            <div
              className={`fullscreen-video-controls ${controlsAtTop ? 'is-top' : 'is-bottom'} ${videoControlsVisible ? 'is-visible' : ''}`}
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
  )
}
