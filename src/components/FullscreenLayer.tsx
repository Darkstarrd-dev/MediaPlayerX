import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'

import type { BrowserMode, ImageItem, VideoItem } from '../types'
import { clamp, formatSeconds } from '../utils/ui'
import { FullscreenFooter } from './fullscreen/FullscreenFooter'
import { FullscreenImagePane, FullscreenVideoPane } from './fullscreen/FullscreenPanes'
import { useFullscreenImageSource } from './fullscreen/useFullscreenImageSource'
import { useFullscreenViewportSize } from './fullscreen/useFullscreenViewportSize'
import {
  FullscreenVideoControlRow,
  FullscreenVideoProgressRow,
} from './fullscreen/FullscreenVideoControls'
import {
  applyAlignedOffset,
  clampPaneTransform,
  computeMediaGeometry,
  DEFAULT_PANE_ALIGN,
  DEFAULT_PANE_TRANSFORM,
  MAX_SPLIT,
  MAX_ZOOM,
  MIN_SPLIT,
  MIN_ZOOM,
  resolveMediaAspect,
  ZOOM_STEP,
  type AlignDirection,
  type PaneAlign,
  type PaneKey,
  type PaneTransform,
} from './fullscreen/paneMath'

export interface FullscreenLayerProps {
  mode: BrowserMode
  fullscreenActive: boolean
  showFullscreenFooter: boolean
  fullscreenDisplay: 'dual' | 'video-only' | 'image-only'
  fullscreenEntryDisplay: 'video-only' | 'image-only'
  fullscreenAlignRequest: { id: number; direction: AlignDirection } | null
  fullscreenSwapped: boolean
  fullscreenVideoFocus: boolean
  fullscreenSplit: number
  focusedImage: ImageItem | null
  focusedImageSrc: string | null
  focusedVideo: VideoItem | null
  focusedVideoSrc: string | null
  focusedVideoCoverImageSrc: string | null
  durationSec: number
  focusedVideoCoverColor: string
  videoTime: number
  videoPlaying: boolean
  videoRate: number
  videoVolume: number
  videoMuted: boolean
  autoPlayEnabled: boolean
  autoPlayInterval: number
  autoPlayPresets: number[]
  onSetFooterVisible: (visible: boolean) => void
  onSetDisplay: (display: 'dual' | 'video-only' | 'image-only') => void
  onToggleSwapSides: () => void
  onSetVideoFocus: (enabled: boolean) => void
  onSetSplit: (value: number) => void
  onPrevImage: () => void
  onNextImage: () => void
  onPrevPackage: () => void
  onNextPackage: () => void
  onToggleAutoplay: () => void
  onSetAutoplayInterval: (seconds: number) => void
  onToggleVideoPlay: () => void
  onPrevVideo: () => void
  onNextVideo: () => void
  onSeekVideo: (time: number) => void
  onVideoTimeUpdate: (time: number) => void
  onVideoDurationDetected: (duration: number) => void
  onToggleVideoMute: () => void
  onChangeVideoVolume: (volume: number) => void
  onChangeVideoRate: (rate: number) => void
  onExit: () => void
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
  focusedVideoCoverImageSrc,
  durationSec,
  focusedVideoCoverColor,
  videoTime,
  videoPlaying,
  videoRate,
  videoVolume,
  videoMuted,
  autoPlayEnabled,
  autoPlayInterval,
  autoPlayPresets,
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
  onToggleVideoPlay,
  onPrevVideo,
  onNextVideo,
  onSeekVideo,
  onVideoTimeUpdate,
  onVideoDurationDetected,
  onToggleVideoMute,
  onChangeVideoVolume,
  onChangeVideoRate,
  onExit,
}: FullscreenLayerProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const imagePaneRef = useRef<HTMLElement>(null)
  const videoPaneRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const { imageViewportSize, videoViewportSize } = useFullscreenViewportSize({
    fullscreenActive,
    fullscreenDisplay,
    fullscreenSwapped,
    imagePaneRef,
    videoPaneRef,
  })
  const [imageTransform, setImageTransform] = useState<PaneTransform>(DEFAULT_PANE_TRANSFORM)
  const [videoTransform, setVideoTransform] = useState<PaneTransform>(DEFAULT_PANE_TRANSFORM)
  const [imageAlign, setImageAlign] = useState<PaneAlign>(DEFAULT_PANE_ALIGN)
  const [videoAlign, setVideoAlign] = useState<PaneAlign>(DEFAULT_PANE_ALIGN)
  const { displayedImageSrc, displayedImageAspect, setDisplayedImageAspect } = useFullscreenImageSource({
    focusedImageSrc,
    focusedImage,
  })
  const [videoControlsVisible, setVideoControlsVisible] = useState(false)
  const [draggingPane, setDraggingPane] = useState<PaneKey | null>(null)

  const singlePane = fullscreenDisplay === 'video-only' ? 'video' : fullscreenDisplay === 'image-only' ? 'image' : null
  const focusedPane: PaneKey = fullscreenDisplay === 'dual' ? (fullscreenVideoFocus ? 'video' : 'image') : (singlePane ?? 'image')
  const zoomEnabled = fullscreenDisplay !== 'dual'
  const autoplayEnabledForFocus = mode === 'image' && focusedPane === 'image'
  const clampedVideoTime = clamp(videoTime, 0, Math.max(0, durationSec))

  const imageAspect = displayedImageAspect ?? resolveMediaAspect(focusedImage?.width ?? 0, focusedImage?.height ?? 0, 1)
  const videoAspect = resolveMediaAspect(focusedVideo?.width ?? 0, focusedVideo?.height ?? 0, 16 / 9)

  const imageGeometry = useMemo(
    () => computeMediaGeometry(imageViewportSize, imageAspect, imageTransform.zoom),
    [imageAspect, imageTransform.zoom, imageViewportSize],
  )
  const videoGeometry = useMemo(
    () => computeMediaGeometry(videoViewportSize, videoAspect, videoTransform.zoom),
    [videoAspect, videoTransform.zoom, videoViewportSize],
  )

  const setPaneAlign = useCallback((pane: PaneKey, align: PaneAlign) => {
    if (pane === 'image') {
      setImageAlign(align)
      return
    }
    setVideoAlign(align)
  }, [])

  const updatePaneTransform = useCallback(
    (pane: PaneKey, updater: PaneTransform | ((previous: PaneTransform) => PaneTransform)) => {
      const setTransform = pane === 'image' ? setImageTransform : setVideoTransform
      const viewport = pane === 'image' ? imageViewportSize : videoViewportSize
      const aspect = pane === 'image' ? imageAspect : videoAspect

      setTransform((previous) => {
        const nextValue = typeof updater === 'function' ? updater(previous) : updater
        const geometry = computeMediaGeometry(viewport, aspect, nextValue.zoom)
        return clampPaneTransform(nextValue, geometry)
      })
    },
    [imageAspect, imageViewportSize, videoAspect, videoViewportSize],
  )

  const adjustPaneZoom = useCallback(
    (pane: PaneKey, delta: number) => {
      updatePaneTransform(pane, (previous) => ({
        ...previous,
        zoom: clamp(Number((previous.zoom + delta).toFixed(3)), MIN_ZOOM, MAX_ZOOM),
      }))
    },
    [updatePaneTransform],
  )

  const alignFocusedPane = useCallback(
    (direction: AlignDirection) => {
      const setAlign = focusedPane === 'image' ? setImageAlign : setVideoAlign

      setAlign((previous) => {
        if (direction === 'left') {
          return { ...previous, x: 'start' }
        }
        if (direction === 'right') {
          return { ...previous, x: 'end' }
        }
        if (direction === 'up') {
          return { ...previous, y: 'start' }
        }
        return { ...previous, y: 'end' }
      })
    },
    [focusedPane],
  )

  useEffect(() => {
    if (!fullscreenActive || !fullscreenAlignRequest) {
      return
    }
    alignFocusedPane(fullscreenAlignRequest.direction)
  }, [alignFocusedPane, fullscreenActive, fullscreenAlignRequest])

  const resetSinglePane = useCallback(() => {
    if (!zoomEnabled || !singlePane) {
      return
    }

    setPaneAlign(singlePane, DEFAULT_PANE_ALIGN)
    updatePaneTransform(singlePane, { ...DEFAULT_PANE_TRANSFORM })
  }, [setPaneAlign, singlePane, updatePaneTransform, zoomEnabled])

  const handlePaneWheel = useCallback(
    (pane: PaneKey, event: ReactWheelEvent<HTMLElement>) => {
      const target = event.target
      if (
        target instanceof HTMLElement &&
        target.closest('input, select, textarea, button, .fullscreen-video-controls, .fullscreen-footer')
      ) {
        return
      }

      if (zoomEnabled && singlePane && pane === singlePane && event.ctrlKey) {
        event.preventDefault()
        adjustPaneZoom(pane, event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)
        return
      }

      if (event.ctrlKey || Math.abs(event.deltaY) < 8) {
        return
      }

      event.preventDefault()

      const stepTargetPane: PaneKey = fullscreenDisplay === 'dual' ? pane : focusedPane
      if (event.deltaY > 0) {
        if (stepTargetPane === 'video') {
          onNextVideo()
          return
        }
        onNextImage()
        return
      }

      if (stepTargetPane === 'video') {
        onPrevVideo()
        return
      }
      onPrevImage()
    },
    [
      adjustPaneZoom,
      focusedPane,
      fullscreenDisplay,
      onNextImage,
      onNextVideo,
      onPrevImage,
      onPrevVideo,
      singlePane,
      zoomEnabled,
    ],
  )

  const startPaneDrag = useCallback(
    (pane: PaneKey, event: ReactMouseEvent<HTMLElement>) => {
      const canDragSinglePane = zoomEnabled && Boolean(singlePane) && pane === singlePane
      const canDragDualVideo = fullscreenDisplay === 'dual' && pane === 'video'

      if (event.button !== 0 || (!canDragSinglePane && !canDragDualVideo)) {
        return
      }

      if (
        event.target instanceof HTMLElement &&
        event.target.closest('.fullscreen-video-controls')
      ) {
        return
      }

      event.preventDefault()

      const startTransform = pane === 'image' ? imageTransform : videoTransform
      const startX = event.clientX
      const startY = event.clientY

      setDraggingPane(pane)

      setPaneAlign(pane, { x: 'free', y: 'free' })

      const onMouseMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - startX
        const dy = moveEvent.clientY - startY

        updatePaneTransform(pane, {
          ...startTransform,
          offsetX: startTransform.offsetX + dx,
          offsetY: startTransform.offsetY + dy,
        })
      }

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
        setDraggingPane((value) => (value === pane ? null : value))
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [fullscreenDisplay, imageTransform, setPaneAlign, singlePane, updatePaneTransform, videoTransform, zoomEnabled],
  )

  const startSplitDrag = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (event.button !== 0 || fullscreenDisplay !== 'dual') {
        return
      }

      event.preventDefault()

      const onMouseMove = (moveEvent: MouseEvent) => {
        const rect = contentRef.current?.getBoundingClientRect()
        if (!rect || rect.width <= 1) {
          return
        }

        const ratioFromLeft = clamp((moveEvent.clientX - rect.left) / rect.width, 0, 1)
        const nextImageRatio = fullscreenSwapped ? 1 - ratioFromLeft : ratioFromLeft
        onSetSplit(clamp(Number(nextImageRatio.toFixed(3)), MIN_SPLIT, MAX_SPLIT))
      }

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [fullscreenDisplay, fullscreenSwapped, onSetSplit],
  )

  const toggleDualDisplay = useCallback(() => {
    if (fullscreenDisplay === 'dual') {
      onSetDisplay(fullscreenEntryDisplay)
      return
    }
    onSetDisplay('dual')
  }, [fullscreenDisplay, fullscreenEntryDisplay, onSetDisplay])

  const stepFocusedPane = useCallback(
    (delta: -1 | 1) => {
      if (focusedPane === 'video') {
        if (delta < 0) {
          onPrevVideo()
          return
        }
        onNextVideo()
        return
      }

      if (delta < 0) {
        onPrevImage()
        return
      }
      onNextImage()
    },
    [focusedPane, onNextImage, onNextVideo, onPrevImage, onPrevVideo],
  )

  useEffect(() => {
    if (!fullscreenActive) {
      return
    }

    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [fullscreenActive])

  useEffect(() => {
    if (!fullscreenActive) {
      setVideoControlsVisible(false)
      setDraggingPane(null)
    }
  }, [fullscreenActive])

  useEffect(() => {
    if (!fullscreenActive) {
      return
    }

    if (fullscreenDisplay !== 'dual') {
      return
    }

    setImageAlign(DEFAULT_PANE_ALIGN)
    setVideoAlign(DEFAULT_PANE_ALIGN)
    setImageTransform({ ...DEFAULT_PANE_TRANSFORM })
    setVideoTransform({ ...DEFAULT_PANE_TRANSFORM })
    setDraggingPane(null)
  }, [fullscreenActive, fullscreenDisplay])

  useLayoutEffect(() => {
    setImageTransform((previous) => {
      const aligned = applyAlignedOffset(previous, imageAlign, imageGeometry)
      return clampPaneTransform(aligned, imageGeometry)
    })
  }, [imageAlign, imageGeometry])

  useLayoutEffect(() => {
    setVideoTransform((previous) => {
      const aligned = applyAlignedOffset(previous, videoAlign, videoGeometry)
      return clampPaneTransform(aligned, videoGeometry)
    })
  }, [videoAlign, videoGeometry])

  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    video.playbackRate = clamp(videoRate, 0.1, 4)
    video.muted = videoMuted
    video.volume = clamp(videoVolume / 100, 0, 1)

    const videoVisible = fullscreenDisplay === 'video-only' || fullscreenDisplay === 'dual'
    if (!fullscreenActive || !videoVisible || !focusedVideoSrc) {
      video.pause()
      return
    }

    if (Math.abs(video.currentTime - clampedVideoTime) > 0.35) {
      video.currentTime = clampedVideoTime
    }

    if (videoPlaying) {
      void video.play().catch(() => undefined)
    } else {
      video.pause()
    }
  }, [clampedVideoTime, focusedVideoSrc, fullscreenActive, fullscreenDisplay, videoMuted, videoPlaying, videoRate, videoVolume])

  if (!fullscreenActive) {
    return null
  }

  const imageRatio = clamp(fullscreenSplit, MIN_SPLIT, MAX_SPLIT)
  const videoRatio = 1 - imageRatio
  const paneOrder: PaneKey[] = fullscreenSwapped ? ['video', 'image'] : ['image', 'video']

  const activeSingleTransform = singlePane === 'video' ? videoTransform : imageTransform
  const zoomPercent = Math.round(activeSingleTransform.zoom * 100)

  const videoMediaTop = (videoViewportSize.height - videoGeometry.height) / 2 + videoTransform.offsetY
  const videoMediaBottom = videoMediaTop + videoGeometry.height
  const videoMediaLeft = (videoViewportSize.width - videoGeometry.width) / 2 + videoTransform.offsetX

  const topGap = videoMediaTop
  const bottomGap = videoViewportSize.height - videoMediaBottom
  const videoControlsAtTop = bottomGap < topGap

  const controlsBlockHeight = 122
  const controlsMaxTop = Math.max(8, videoViewportSize.height - controlsBlockHeight - 8)
  const controlsPreferredTop = videoControlsAtTop ? videoMediaTop - controlsBlockHeight - 8 : videoMediaBottom + 8
  const videoControlsTop = clamp(Math.round(controlsPreferredTop), 8, controlsMaxTop)

  const controlsMaxWidth = Math.max(120, videoViewportSize.width - 16)
  const controlsPreferredWidth = Math.max(120, videoGeometry.width - 16)
  const videoControlsWidth = Math.min(controlsPreferredWidth, controlsMaxWidth)
  const controlsMaxLeft = Math.max(8, videoViewportSize.width - videoControlsWidth - 8)
  const videoControlsLeft = clamp(Math.round(videoMediaLeft + 8), 8, controlsMaxLeft)

  const imagePaneClassName = `fullscreen-pane fullscreen-image${fullscreenDisplay === 'dual' && !fullscreenVideoFocus ? ' is-pane-focus' : ''}`
  const videoPaneClassName = `fullscreen-pane fullscreen-video${fullscreenDisplay === 'dual' && fullscreenVideoFocus ? ' is-pane-focus' : ''}`

  const imagePane = (
    <FullscreenImagePane
      paneRef={imagePaneRef}
      className={imagePaneClassName}
      flex={imageRatio}
      fullscreenDisplay={fullscreenDisplay}
      singlePane={singlePane}
      draggingPane={draggingPane}
      imageGeometry={imageGeometry}
      imageTransform={imageTransform}
      displayedImageSrc={displayedImageSrc}
      focusedImageOrdinal={focusedImage?.ordinal ?? null}
      onSetVideoFocus={onSetVideoFocus}
      onWheel={(event) => handlePaneWheel('image', event)}
      onMouseDown={(event) => startPaneDrag('image', event)}
      onImageNaturalSize={(naturalWidth, naturalHeight) => {
        if (naturalWidth > 0 && naturalHeight > 0) {
          setDisplayedImageAspect(naturalWidth / naturalHeight)
        }
      }}
    />
  )

  const videoProgressRowProps = {
    clampedVideoTime,
    durationSec,
    onSeekVideo,
  }
  const videoControlRowProps = {
    videoPlaying,
    videoMuted,
    videoVolume,
    videoRate,
    onToggleVideoPlay,
    onPrevVideo,
    onNextVideo,
    onToggleVideoMute,
    onChangeVideoVolume,
    onChangeVideoRate,
  }

  const controlsRows = videoControlsAtTop ? (
    <>
      <FullscreenVideoControlRow {...videoControlRowProps} />
      <FullscreenVideoProgressRow {...videoProgressRowProps} />
    </>
  ) : (
    <>
      <FullscreenVideoProgressRow {...videoProgressRowProps} />
      <FullscreenVideoControlRow {...videoControlRowProps} />
    </>
  )

  const videoPane = (
    <FullscreenVideoPane
      paneRef={videoPaneRef}
      videoRef={videoRef}
      className={videoPaneClassName}
      flex={videoRatio}
      fullscreenDisplay={fullscreenDisplay}
      singlePane={singlePane}
      draggingPane={draggingPane}
      videoGeometry={videoGeometry}
      videoTransform={videoTransform}
      videoPlaying={videoPlaying}
      focusedVideoSrc={focusedVideoSrc}
      focusedVideoCoverImageSrc={focusedVideoCoverImageSrc}
      focusedVideoCoverColor={focusedVideoCoverColor}
      videoControlsVisible={videoControlsVisible}
      videoControlsAtTop={videoControlsAtTop}
      videoControlsTop={videoControlsTop}
      videoControlsLeft={videoControlsLeft}
      videoControlsWidth={videoControlsWidth}
      controlsRows={controlsRows}
      onSetVideoFocus={onSetVideoFocus}
      onWheel={(event) => handlePaneWheel('video', event)}
      onMouseDown={(event) => startPaneDrag('video', event)}
      onShowControls={() => setVideoControlsVisible(true)}
      onHideControls={() => setVideoControlsVisible(false)}
      onVideoTimeUpdate={onVideoTimeUpdate}
      onVideoDurationDetected={onVideoDurationDetected}
      onNextVideo={onNextVideo}
    />
  )

  const footerImageInfo = focusedImage
    ? `图片 #${focusedImage.ordinal} | ${focusedImage.width} x ${focusedImage.height}`
    : '无可用图片'
  const footerVideoInfo = focusedVideo
    ? `${videoPlaying ? '真实视频' : '封面态'} ${formatSeconds(clampedVideoTime)} / ${formatSeconds(durationSec)} | ${focusedVideo.fileName} (${focusedVideo.width} x ${focusedVideo.height})`
    : '无可用视频'
  const footerInfoText =
    fullscreenDisplay === 'image-only'
      ? footerImageInfo
      : fullscreenDisplay === 'video-only'
        ? footerVideoInfo
        : `${footerImageInfo} || ${footerVideoInfo}`

  return (
    <div
      className="fullscreen-layer"
      onMouseMove={(event) => {
        onSetFooterVisible(event.clientY > window.innerHeight * 0.8)
      }}
      onMouseLeave={() => {
        onSetFooterVisible(false)
        setVideoControlsVisible(false)
      }}
    >
      <div className="fullscreen-content" ref={contentRef}>
        {fullscreenDisplay === 'dual' ? (
          paneOrder.map((pane, index) => (
            <Fragment key={pane}>
              {pane === 'image' ? imagePane : videoPane}
              {index === 0 ? (
                <div
                  aria-label="调整全屏分屏比例"
                  aria-orientation="vertical"
                  className="fullscreen-divider"
                  role="separator"
                  tabIndex={-1}
                  onMouseDown={startSplitDrag}
                />
              ) : null}
            </Fragment>
          ))
        ) : fullscreenDisplay === 'image-only' ? (
          <section className="fullscreen-single-pane">{imagePane}</section>
        ) : (
          <section className="fullscreen-single-pane">{videoPane}</section>
        )}
      </div>

      {showFullscreenFooter ? (
        <FullscreenFooter
          mode={mode}
          fullscreenDisplay={fullscreenDisplay}
          fullscreenVideoFocus={fullscreenVideoFocus}
          footerInfoText={footerInfoText}
          clampedVideoTime={clampedVideoTime}
          durationSec={durationSec}
          videoPlaying={videoPlaying}
          videoMuted={videoMuted}
          videoVolume={videoVolume}
          videoRate={videoRate}
          autoplayEnabledForFocus={autoplayEnabledForFocus}
          autoPlayEnabled={autoPlayEnabled}
          autoPlayInterval={autoPlayInterval}
          autoPlayPresets={autoPlayPresets}
          zoomEnabled={zoomEnabled}
          zoomPercent={zoomPercent}
          onSeekVideo={onSeekVideo}
          onToggleVideoPlay={onToggleVideoPlay}
          onPrevVideo={onPrevVideo}
          onNextVideo={onNextVideo}
          onToggleVideoMute={onToggleVideoMute}
          onChangeVideoVolume={onChangeVideoVolume}
          onChangeVideoRate={onChangeVideoRate}
          onToggleDualDisplay={toggleDualDisplay}
          onToggleSwapSides={onToggleSwapSides}
          onStepFocusedPane={stepFocusedPane}
          onPrevPackage={onPrevPackage}
          onNextPackage={onNextPackage}
          onToggleAutoplay={onToggleAutoplay}
          onSetAutoplayInterval={onSetAutoplayInterval}
          onAlignFocusedPane={alignFocusedPane}
          onZoomOut={() => {
            if (singlePane) {
              adjustPaneZoom(singlePane, -ZOOM_STEP)
            }
          }}
          onZoomIn={() => {
            if (singlePane) {
              adjustPaneZoom(singlePane, ZOOM_STEP)
            }
          }}
          onResetSinglePane={resetSinglePane}
          onExit={onExit}
        />
      ) : null}
    </div>
  )
}

export default FullscreenLayer
