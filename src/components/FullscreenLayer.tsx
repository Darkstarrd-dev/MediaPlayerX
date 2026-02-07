import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'

import type { BrowserMode, ImageItem, VideoItem } from '../types'
import { clamp, formatSeconds } from '../utils/ui'

type PaneKey = 'image' | 'video'
type AlignDirection = 'up' | 'down' | 'left' | 'right'
type AxisAlign = 'center' | 'start' | 'end' | 'free'

interface PaneTransform {
  zoom: number
  offsetX: number
  offsetY: number
}

interface PaneViewportSize {
  width: number
  height: number
}

interface MediaGeometry {
  width: number
  height: number
  diffX: number
  diffY: number
  maxOffsetX: number
  maxOffsetY: number
}

interface PaneAlign {
  x: AxisAlign
  y: AxisAlign
}

interface FullscreenLayerProps {
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
  onToggleVideoMute: () => void
  onChangeVideoVolume: (volume: number) => void
  onChangeVideoRate: (rate: number) => void
  onExit: () => void
}

const DEFAULT_PANE_TRANSFORM: PaneTransform = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
}

const DEFAULT_PANE_ALIGN: PaneAlign = {
  x: 'center',
  y: 'center',
}

const MIN_SPLIT = 0.2
const MAX_SPLIT = 0.8
const MIN_ZOOM = 0.2
const MAX_ZOOM = 4
const ZOOM_STEP = 0.12

function computeMediaGeometry(viewport: PaneViewportSize, aspect: number, zoom: number): MediaGeometry {
  const width = Math.max(1, viewport.width)
  const height = Math.max(1, viewport.height)
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1
  const safeZoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM)

  const viewportRatio = width / height
  const fitByWidth = viewportRatio <= safeAspect
  const fitWidth = fitByWidth ? width : height * safeAspect
  const fitHeight = fitByWidth ? width / safeAspect : height
  const mediaWidth = fitWidth * safeZoom
  const mediaHeight = fitHeight * safeZoom

  const diffX = mediaWidth - width
  const diffY = mediaHeight - height

  return {
    width: mediaWidth,
    height: mediaHeight,
    diffX,
    diffY,
    maxOffsetX: Math.abs(diffX) / 2,
    maxOffsetY: Math.abs(diffY) / 2,
  }
}

function applyAlignedOffset(transform: PaneTransform, align: PaneAlign, geometry: MediaGeometry): PaneTransform {
  let nextOffsetX = transform.offsetX
  let nextOffsetY = transform.offsetY

  if (align.x === 'center') {
    nextOffsetX = 0
  } else if (align.x === 'start') {
    nextOffsetX = geometry.diffX / 2
  } else if (align.x === 'end') {
    nextOffsetX = -geometry.diffX / 2
  }

  if (align.y === 'center') {
    nextOffsetY = 0
  } else if (align.y === 'start') {
    nextOffsetY = geometry.diffY / 2
  } else if (align.y === 'end') {
    nextOffsetY = -geometry.diffY / 2
  }

  if (Math.abs(nextOffsetX - transform.offsetX) < 0.0001 && Math.abs(nextOffsetY - transform.offsetY) < 0.0001) {
    return transform
  }

  return {
    ...transform,
    offsetX: nextOffsetX,
    offsetY: nextOffsetY,
  }
}

function clampPaneTransform(transform: PaneTransform, geometry: MediaGeometry): PaneTransform {
  const nextZoom = clamp(transform.zoom, MIN_ZOOM, MAX_ZOOM)
  const nextOffsetX = clamp(transform.offsetX, -geometry.maxOffsetX, geometry.maxOffsetX)
  const nextOffsetY = clamp(transform.offsetY, -geometry.maxOffsetY, geometry.maxOffsetY)

  if (
    Math.abs(nextZoom - transform.zoom) < 0.0001 &&
    Math.abs(nextOffsetX - transform.offsetX) < 0.0001 &&
    Math.abs(nextOffsetY - transform.offsetY) < 0.0001
  ) {
    return transform
  }

  return {
    zoom: nextZoom,
    offsetX: nextOffsetX,
    offsetY: nextOffsetY,
  }
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
  onToggleVideoMute,
  onChangeVideoVolume,
  onChangeVideoRate,
  onExit,
}: FullscreenLayerProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const imagePaneRef = useRef<HTMLElement>(null)
  const videoPaneRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const [imageViewportSize, setImageViewportSize] = useState<PaneViewportSize>({ width: 1, height: 1 })
  const [videoViewportSize, setVideoViewportSize] = useState<PaneViewportSize>({ width: 1, height: 1 })
  const [imageTransform, setImageTransform] = useState<PaneTransform>(DEFAULT_PANE_TRANSFORM)
  const [videoTransform, setVideoTransform] = useState<PaneTransform>(DEFAULT_PANE_TRANSFORM)
  const [imageAlign, setImageAlign] = useState<PaneAlign>(DEFAULT_PANE_ALIGN)
  const [videoAlign, setVideoAlign] = useState<PaneAlign>(DEFAULT_PANE_ALIGN)
  const [videoControlsVisible, setVideoControlsVisible] = useState(false)
  const [draggingPane, setDraggingPane] = useState<PaneKey | null>(null)

  const singlePane = fullscreenDisplay === 'video-only' ? 'video' : fullscreenDisplay === 'image-only' ? 'image' : null
  const focusedPane: PaneKey = fullscreenDisplay === 'dual' ? (fullscreenVideoFocus ? 'video' : 'image') : (singlePane ?? 'image')
  const zoomEnabled = fullscreenDisplay !== 'dual'
  const autoplayEnabledForFocus = mode === 'image' && focusedPane === 'image'
  const durationSec = focusedVideo?.durationSec ?? 0
  const clampedVideoTime = clamp(videoTime, 0, durationSec)

  const imageAspect = focusedImage ? focusedImage.width / focusedImage.height : 1
  const videoAspect = focusedVideo ? focusedVideo.width / focusedVideo.height : 16 / 9

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
      if (!zoomEnabled || !singlePane || pane !== singlePane || !event.ctrlKey) {
        return
      }

      event.preventDefault()
      adjustPaneZoom(pane, event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)
    },
    [adjustPaneZoom, singlePane, zoomEnabled],
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
      return
    }

    const observers: ResizeObserver[] = []

    const observePane = (element: HTMLElement | null, setter: (size: PaneViewportSize) => void) => {
      if (!element) {
        return
      }

      const updateSize = () => {
        const rect = element.getBoundingClientRect()
        setter({
          width: Math.max(1, rect.width),
          height: Math.max(1, rect.height),
        })
      }

      updateSize()
      const observer = new ResizeObserver(() => updateSize())
      observer.observe(element)
      observers.push(observer)
    }

    observePane(imagePaneRef.current, setImageViewportSize)
    observePane(videoPaneRef.current, setVideoViewportSize)

    return () => {
      for (const observer of observers) {
        observer.disconnect()
      }
    }
  }, [fullscreenActive, fullscreenDisplay, fullscreenSwapped])

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

  useEffect(() => {
    setImageTransform((previous) => {
      const aligned = applyAlignedOffset(previous, imageAlign, imageGeometry)
      return clampPaneTransform(aligned, imageGeometry)
    })
  }, [imageAlign, imageGeometry])

  useEffect(() => {
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
    <section
      ref={imagePaneRef}
      className={imagePaneClassName}
      style={{ flex: imageRatio }}
      onClick={() => {
        if (fullscreenDisplay === 'dual') {
          onSetVideoFocus(false)
        }
      }}
      onWheel={(event) => handlePaneWheel('image', event)}
      onMouseDown={(event) => startPaneDrag('image', event)}
    >
      <div className={`fullscreen-stage ${singlePane === 'image' ? 'is-draggable' : ''} ${draggingPane === 'image' ? 'is-dragging' : ''}`}>
        <div
          className="fullscreen-media fullscreen-media-image"
          style={{
            width: `${imageGeometry.width}px`,
            height: `${imageGeometry.height}px`,
            transform: `translate3d(${imageTransform.offsetX}px, ${imageTransform.offsetY}px, 0)`,
            background: focusedImage?.color ?? '#4f5967',
          }}
        >
          {focusedImageSrc ? (
            <img
              className="fullscreen-media-image-element"
              src={focusedImageSrc}
              alt={`图片 #${focusedImage?.ordinal ?? '-'}`}
              draggable={false}
            />
          ) : null}
          <div className="fullscreen-media-overlay">
            <span>{`图片 #${focusedImage?.ordinal ?? '-'}`}</span>
            <small>{focusedImage ? `${focusedImage.width} x ${focusedImage.height}` : '无可用图片'}</small>
          </div>
        </div>
      </div>
    </section>
  )

  const progressRow = (
    <div className="fullscreen-video-controls-row is-progress" key="progress">
      <span>{`${formatSeconds(clampedVideoTime)} / ${formatSeconds(durationSec)}`}</span>
      <input
        aria-label="全屏视频进度滑条"
        max={Math.max(0, durationSec)}
        min={0}
        step={0.1}
        type="range"
        value={clampedVideoTime}
        onChange={(event) => onSeekVideo(Number(event.target.value))}
      />
    </div>
  )

  const controlRow = (
    <div className="fullscreen-video-controls-row is-controls" key="controls">
      <button type="button" onClick={onToggleVideoPlay}>
        {videoPlaying ? '暂停' : '播放'}
      </button>
      <button type="button" onClick={onPrevVideo}>
        上一个
      </button>
      <button type="button" onClick={onNextVideo}>
        下一个
      </button>
      <button type="button" onClick={onToggleVideoMute}>
        {videoMuted ? '取消静音' : '静音'}
      </button>
      <label>
        音量 {videoMuted ? '0%' : `${videoVolume}%`}
        <input
          aria-label="全屏视频音量滑条"
          max={100}
          min={0}
          step={1}
          type="range"
          value={videoMuted ? 0 : videoVolume}
          onChange={(event) => onChangeVideoVolume(Number(event.target.value))}
        />
      </label>
      <label>
        倍速 x{videoRate.toFixed(2)}
        <input
          aria-label="全屏视频倍速滑条"
          max={4}
          min={0.1}
          step={0.1}
          type="range"
          value={videoRate}
          onChange={(event) => onChangeVideoRate(Number(event.target.value))}
        />
      </label>
    </div>
  )

  const controlsRows = videoControlsAtTop ? [controlRow, progressRow] : [progressRow, controlRow]

  const videoPane = (
    <section
      ref={videoPaneRef}
      className={videoPaneClassName}
      style={{ flex: videoRatio }}
      onClick={() => {
        if (fullscreenDisplay === 'dual') {
          onSetVideoFocus(true)
        }
      }}
      onWheel={(event) => handlePaneWheel('video', event)}
      onMouseDown={(event) => startPaneDrag('video', event)}
      onMouseEnter={() => setVideoControlsVisible(true)}
      onMouseMove={() => setVideoControlsVisible(true)}
      onMouseLeave={() => setVideoControlsVisible(false)}
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
              src={focusedVideoSrc}
              preload="metadata"
              playsInline
              onTimeUpdate={() => {
                const currentTime = videoRef.current?.currentTime ?? 0
                onVideoTimeUpdate(currentTime)
              }}
              onLoadedMetadata={() => {
                const currentTime = videoRef.current?.currentTime ?? 0
                onVideoTimeUpdate(currentTime)
              }}
              onEnded={() => {
                onVideoTimeUpdate(0)
                onNextVideo()
              }}
            />
          ) : null}

          <div className="fullscreen-media-overlay">
            <span>
              {videoPlaying
                ? `真实视频 ${formatSeconds(clampedVideoTime)} / ${formatSeconds(durationSec)}`
                : `封面态（待播放） ${formatSeconds(clampedVideoTime)} / ${formatSeconds(durationSec)}`}
            </span>
            <small>{focusedVideo ? `${focusedVideo.fileName} (${focusedVideo.width} x ${focusedVideo.height})` : '无可用视频'}</small>
          </div>

          {!focusedVideoSrc ? <div className="fullscreen-media-empty">无可用视频源</div> : null}
        </div>

        {videoControlsVisible ? (
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
        <footer className="fullscreen-footer">
          <div className="fullscreen-group">
            <button className={fullscreenDisplay === 'dual' ? 'is-active' : ''} type="button" onClick={toggleDualDisplay}>
              {fullscreenDisplay === 'dual' ? '单显示' : '双显示'}
            </button>
            <button type="button" disabled={fullscreenDisplay !== 'dual'} onClick={onToggleSwapSides}>
              调换左右
            </button>
            <span className="fullscreen-focus-text">
              {fullscreenDisplay === 'dual' ? `焦点：${fullscreenVideoFocus ? '视频' : '图片'}（点击区域或 Tab 切换）` : '焦点：单显示'}
            </span>
          </div>

          <div className="fullscreen-group">
            <button type="button" onClick={() => stepFocusedPane(-1)}>
              上一页
            </button>
            <button type="button" onClick={() => stepFocusedPane(1)}>
              下一页
            </button>
            <button type="button" disabled={mode !== 'image'} onClick={onPrevPackage}>
              上个包
            </button>
            <button type="button" disabled={mode !== 'image'} onClick={onNextPackage}>
              下个包
            </button>
            <button type="button" disabled={!autoplayEnabledForFocus} onClick={onToggleAutoplay}>
              {autoPlayEnabled ? '停止自动播放' : '自动播放'}
            </button>
            <label className="fullscreen-inline-field">
              速度
              <select
                aria-label="全屏自动播放速度"
                disabled={!autoplayEnabledForFocus}
                value={autoPlayInterval}
                onChange={(event) => onSetAutoplayInterval(Number(event.target.value))}
              >
                {autoPlayPresets.map((seconds) => (
                  <option key={seconds} value={seconds}>
                    {`${seconds}s`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="fullscreen-group">
            <button type="button" onClick={() => alignFocusedPane('up')}>
              上对齐
            </button>
            <button type="button" onClick={() => alignFocusedPane('down')}>
              下对齐
            </button>
            <button type="button" onClick={() => alignFocusedPane('left')}>
              左对齐
            </button>
            <button type="button" onClick={() => alignFocusedPane('right')}>
              右对齐
            </button>
            <button type="button" disabled={!zoomEnabled} onClick={() => singlePane && adjustPaneZoom(singlePane, -ZOOM_STEP)}>
              缩小
            </button>
            <span className="fullscreen-zoom-text">{zoomEnabled ? `${zoomPercent}%` : '-'}</span>
            <button type="button" disabled={!zoomEnabled} onClick={() => singlePane && adjustPaneZoom(singlePane, ZOOM_STEP)}>
              放大
            </button>
            <button type="button" disabled={!zoomEnabled} onClick={resetSinglePane}>
              Reset
            </button>
            <button type="button" onClick={onExit}>
              退出全屏
            </button>
          </div>
        </footer>
      ) : null}
    </div>
  )
}

export default FullscreenLayer
