import type {
  MouseEvent as ReactMouseEvent,
  ReactNode,
  RefObject,
  WheelEvent as ReactWheelEvent,
} from 'react'

import type { MediaGeometry, PaneKey, PaneTransform } from './paneMath'

interface FullscreenImagePaneProps {
  paneRef: RefObject<HTMLElement | null>
  className: string
  flex: number
  fullscreenDisplay: 'dual' | 'video-only' | 'image-only'
  singlePane: PaneKey | null
  draggingPane: PaneKey | null
  imageGeometry: MediaGeometry
  imageTransform: PaneTransform
  displayedImageSrc: string | null
  focusedImageOrdinal: number | null
  onSetVideoFocus: (enabled: boolean) => void
  onWheel: (event: ReactWheelEvent<HTMLElement>) => void
  onMouseDown: (event: ReactMouseEvent<HTMLElement>) => void
  onImageNaturalSize: (width: number, height: number) => void
}

export function FullscreenImagePane({
  paneRef,
  className,
  flex,
  fullscreenDisplay,
  singlePane,
  draggingPane,
  imageGeometry,
  imageTransform,
  displayedImageSrc,
  focusedImageOrdinal,
  onSetVideoFocus,
  onWheel,
  onMouseDown,
  onImageNaturalSize,
}: FullscreenImagePaneProps) {
  return (
    <section
      ref={paneRef}
      className={className}
      style={{ flex }}
      onClick={() => {
        if (fullscreenDisplay === 'dual') {
          onSetVideoFocus(false)
        }
      }}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
    >
      <div className={`fullscreen-stage ${singlePane === 'image' ? 'is-draggable' : ''} ${draggingPane === 'image' ? 'is-dragging' : ''}`}>
        <div
          className="fullscreen-media fullscreen-media-image"
          style={{
            width: `${imageGeometry.width}px`,
            height: `${imageGeometry.height}px`,
            transform: `translate3d(${imageTransform.offsetX}px, ${imageTransform.offsetY}px, 0)`,
          }}
        >
          {displayedImageSrc ? (
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
          ) : null}
        </div>
      </div>
    </section>
  )
}

interface FullscreenVideoPaneProps {
  paneRef: RefObject<HTMLElement | null>
  videoRef: RefObject<HTMLVideoElement | null>
  className: string
  flex: number
  fullscreenDisplay: 'dual' | 'video-only' | 'image-only'
  singlePane: PaneKey | null
  draggingPane: PaneKey | null
  videoGeometry: MediaGeometry
  videoTransform: PaneTransform
  videoPlaying: boolean
  focusedVideoSrc: string | null
  focusedVideoCoverImageSrc: string | null
  focusedVideoCoverColor: string
  videoControlsVisible: boolean
  videoControlsAtTop: boolean
  videoControlsTop: number
  videoControlsLeft: number
  videoControlsWidth: number
  controlsRows: ReactNode
  onSetVideoFocus: (enabled: boolean) => void
  onWheel: (event: ReactWheelEvent<HTMLElement>) => void
  onMouseDown: (event: ReactMouseEvent<HTMLElement>) => void
  onShowControls: () => void
  onHideControls: () => void
  onVideoTimeUpdate: (time: number) => void
  onVideoDurationDetected: (duration: number) => void
  onNextVideo: () => void
}

export function FullscreenVideoPane({
  paneRef,
  videoRef,
  className,
  flex,
  fullscreenDisplay,
  singlePane,
  draggingPane,
  videoGeometry,
  videoTransform,
  videoPlaying,
  focusedVideoSrc,
  focusedVideoCoverImageSrc,
  focusedVideoCoverColor,
  videoControlsVisible,
  videoControlsAtTop,
  videoControlsTop,
  videoControlsLeft,
  videoControlsWidth,
  controlsRows,
  onSetVideoFocus,
  onWheel,
  onMouseDown,
  onShowControls,
  onHideControls,
  onVideoTimeUpdate,
  onVideoDurationDetected,
  onNextVideo,
}: FullscreenVideoPaneProps) {
  return (
    <section
      ref={paneRef}
      className={className}
      style={{ flex }}
      onClick={() => {
        if (fullscreenDisplay === 'dual') {
          onSetVideoFocus(true)
        }
      }}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseEnter={onShowControls}
      onMouseMove={onShowControls}
      onMouseLeave={onHideControls}
    >
      <div
        className={`fullscreen-stage ${singlePane === 'video' || fullscreenDisplay === 'dual' ? 'is-draggable' : ''} ${draggingPane === 'video' ? 'is-dragging' : ''}`}
      >
        <div
          className="fullscreen-media fullscreen-media-video"
          style={{
            width: `${videoGeometry.width}px`,
            height: `${videoGeometry.height}px`,
            transform: `translate3d(${videoTransform.offsetX}px, ${videoTransform.offsetY}px, 0)`,
            background: videoPlaying ? 'linear-gradient(145deg, #232830, #15191f)' : focusedVideoCoverColor,
          }}
        >
          {focusedVideoSrc ? (
            <video
              ref={videoRef}
              className="fullscreen-media-video-element"
              style={{ opacity: videoPlaying ? 1 : 0 }}
              src={focusedVideoSrc}
              preload="metadata"
              playsInline
              onTimeUpdate={() => {
                const currentTime = videoRef.current?.currentTime ?? 0
                onVideoTimeUpdate(currentTime)
              }}
              onLoadedMetadata={() => {
                const duration = videoRef.current?.duration ?? 0
                if (Number.isFinite(duration) && duration > 0) {
                  onVideoDurationDetected(duration)
                }
                const currentTime = videoRef.current?.currentTime ?? 0
                onVideoTimeUpdate(currentTime)
              }}
              onEnded={() => {
                onVideoTimeUpdate(0)
                onNextVideo()
              }}
            />
          ) : null}

          {!videoPlaying && focusedVideoCoverImageSrc ? (
            <img
              className="fullscreen-media-video-cover"
              src={focusedVideoCoverImageSrc}
              alt="视频封面"
            />
          ) : null}

          {!focusedVideoSrc ? <div className="fullscreen-media-empty">无可用视频源</div> : null}
        </div>

        {fullscreenDisplay === 'dual' && videoControlsVisible ? (
          <div
            className={`fullscreen-video-controls ${videoControlsAtTop ? 'is-top' : 'is-bottom'}`}
            style={{
              top: `${videoControlsTop}px`,
              left: `${videoControlsLeft}px`,
              width: `${videoControlsWidth}px`,
            }}
          >
            {controlsRows}
          </div>
        ) : null}
      </div>
    </section>
  )
}
