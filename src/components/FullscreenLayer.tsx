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
} from 'react'

import type { BrowserMode, ImageItem, VideoItem } from '../types'
import { clamp } from '../utils/ui'
import type { VideoFitMode } from '../features/media/videoFitMode'
import { buildA11yPropsByRegistry } from '../i18n/a11y'
import { useI18n } from '../i18n/useI18n'
import { FullscreenFooter } from './fullscreen/FullscreenFooter'
import { FullscreenImagePane, FullscreenVideoPane } from './fullscreen/FullscreenPanes'
import { resolveFullscreenControlsWidth } from './fullscreen/controlsWidth'
import { useFullscreenImageSource } from './fullscreen/useFullscreenImageSource'
import { useFullscreenViewportSize } from './fullscreen/useFullscreenViewportSize'
import { useFullscreenWindowViewport } from './fullscreen/useFullscreenWindowViewport'
import {
  FullscreenVideoControlsShell,
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

const DEFAULT_FULLSCREEN_VIDEO_CONTROLS_MAX_WIDTH = 980
const DUAL_IMAGE_CONTROLS_COMPACT_WIDTH = 700
const DUAL_IMAGE_CONTROLS_MIN_WITH_RIGHT_GROUP = 680
const DUAL_VIDEO_CONTROLS_COMPACT_WIDTH = 620
const DUAL_VIDEO_CONTROLS_MIN_WITH_LEFT_GROUP = 500
const DUAL_IMAGE_CONTROLS_MIN_TWO_GROUPS = 460
const DUAL_VIDEO_CONTROLS_MIN_TWO_GROUPS = 360
const FULLSCREEN_DIVIDER_WIDTH = 8

function resolveMediaPathForFooter(item: { mediaLocator: ImageItem['mediaLocator'] } | { mediaLocator: VideoItem['mediaLocator'] }): string {
  const locator = item.mediaLocator
  if (locator.kind === 'filesystem') {
    return locator.absolutePath
  }
  return `${locator.archivePath} :: ${locator.entryName}`
}

function formatImageSizeForFooter(sizeKb: number): string {
  if (!Number.isFinite(sizeKb) || sizeKb <= 0) {
    return '-'
  }
  if (sizeKb >= 1024) {
    return `${(sizeKb / 1024).toFixed(2)}MB`
  }
  return `${Math.round(sizeKb)}KB`
}

function formatVideoSizeForFooter(sizeMb: number): string {
  if (!Number.isFinite(sizeMb) || sizeMb <= 0) {
    return '-'
  }
  return `${Number(sizeMb.toFixed(2))}MB`
}

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
  subtitleTrackUrl: string | null
  subtitleVisible: boolean
  subtitleLoading: boolean
  subtitleMessage: string | null
  subtitleOptions: Array<{ id: string; label: string; format: 'vtt' | 'srt' | 'ass' | 'ssa' }>
  selectedSubtitleId: string | null
  autoSubtitleActive: boolean
  liveSubtitleText: string | null
  subtitleOverlayStyle: CSSProperties
  bindFullscreenVideoElement: (element: HTMLVideoElement | null) => void
  focusedVideoCoverImageSrc: string | null
  durationSec: number
  focusedVideoCoverColor: string
  videoTime: number
  videoPlaying: boolean
  videoRate: number
  videoVolume: number
  videoMuted: boolean
  videoFitMode: VideoFitMode
  videoLoopMode: 'single' | 'list'
  fullscreenVideoControlsMaxWidth: number
  autoPlayEnabled: boolean
  autoPlayInterval: number
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
  onVideoEnded: () => void
  onToggleSubtitle: () => void
  onSelectSubtitle: (subtitleId: string) => void
  playlistEntries: Array<{ id: string; label: string }>
  selectedVideoId: string
  onSelectVideo: (videoId: string) => void
  onSaveCover: () => void
  onSeekVideo: (time: number) => void
  onVideoTimeUpdate: (time: number) => void
  onVideoDurationDetected: (duration: number) => void
  onToggleVideoMute: () => void
  onChangeVideoVolume: (volume: number) => void
  onChangeVideoRate: (rate: number) => void
  onCycleVideoLoopMode: () => void
  onCycleVideoFitMode: () => void
  onSetVideoFitMode: (mode: VideoFitMode) => void
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
  autoPlayEnabled,
  autoPlayInterval,
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
  const { t } = useI18n()
  const contentRef = useRef<HTMLDivElement>(null)
  const imagePaneRef = useRef<HTMLElement>(null)
  const videoPaneRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hideVideoControlsTimerRef = useRef<number | null>(null)

  const { imageViewportSize, videoViewportSize } = useFullscreenViewportSize({
    fullscreenActive,
    mode,
    fullscreenDisplay,
    fullscreenSwapped,
    imagePaneRef,
    videoPaneRef,
  })
  const fullscreenViewport = useFullscreenWindowViewport(fullscreenActive)
  const [imageTransform, setImageTransform] = useState<PaneTransform>(DEFAULT_PANE_TRANSFORM)
  const [videoTransform, setVideoTransform] = useState<PaneTransform>(DEFAULT_PANE_TRANSFORM)
  const [imageAlign, setImageAlign] = useState<PaneAlign>(DEFAULT_PANE_ALIGN)
  const [videoAlign, setVideoAlign] = useState<PaneAlign>(DEFAULT_PANE_ALIGN)
  const { displayedImageSrc, displayedImageAspect, setDisplayedImageAspect } = useFullscreenImageSource({
    focusedImageSrc,
    focusedImage,
  })
  const [displayedImageNaturalSize, setDisplayedImageNaturalSize] = useState<{ width: number; height: number } | null>(null)
  const [videoControlsVisible, setVideoControlsVisible] = useState(false)
  const [draggingPane, setDraggingPane] = useState<PaneKey | null>(null)
  const [footerHovering, setFooterHovering] = useState(false)

  useEffect(() => {
    setDisplayedImageNaturalSize(null)
  }, [displayedImageSrc])

  const singlePane = fullscreenDisplay === 'video-only' ? 'video' : fullscreenDisplay === 'image-only' ? 'image' : null
  const focusedPane: PaneKey = fullscreenDisplay === 'dual' ? (fullscreenVideoFocus ? 'video' : 'image') : (singlePane ?? 'image')
  const zoomEnabled = fullscreenDisplay !== 'dual'
  const autoplayEnabledForFocus = mode === 'image' && focusedPane === 'image'
  const clampedVideoTime = clamp(videoTime, 0, Math.max(0, durationSec))

  const imageAspect = displayedImageAspect ?? resolveMediaAspect(focusedImage?.width ?? 0, focusedImage?.height ?? 0, 1)
  const videoAspect = resolveMediaAspect(focusedVideo?.width ?? 0, focusedVideo?.height ?? 0, 16 / 9)

  const fallbackViewportWidth = fullscreenViewport.width
  const fallbackViewportHeight = fullscreenViewport.height
  const effectiveImageViewportSize =
    fullscreenDisplay === 'image-only'
      ? { width: fallbackViewportWidth, height: fallbackViewportHeight }
      : (imageViewportSize.width <= 64 || imageViewportSize.height <= 64)
        ? { width: fallbackViewportWidth, height: fallbackViewportHeight }
        : imageViewportSize
  const effectiveVideoViewportSize =
    fullscreenDisplay === 'video-only'
      ? { width: fallbackViewportWidth, height: fallbackViewportHeight }
      : (videoViewportSize.width <= 64 || videoViewportSize.height <= 64)
        ? { width: fallbackViewportWidth, height: fallbackViewportHeight }
        : videoViewportSize

  const imageGeometry = useMemo(
    () => computeMediaGeometry(effectiveImageViewportSize, imageAspect, imageTransform.zoom),
    [effectiveImageViewportSize, imageAspect, imageTransform.zoom],
  )
  const videoGeometry = useMemo(
    () => computeMediaGeometry(effectiveVideoViewportSize, videoAspect, videoTransform.zoom),
    [effectiveVideoViewportSize, videoAspect, videoTransform.zoom],
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

        const availableWidth = Math.max(1, rect.width - FULLSCREEN_DIVIDER_WIDTH)
        const minImageRatioByControls = DUAL_IMAGE_CONTROLS_MIN_TWO_GROUPS / availableWidth
        const maxImageRatioByControls = 1 - DUAL_VIDEO_CONTROLS_MIN_TWO_GROUPS / availableWidth
        let minImageRatio = Math.max(MIN_SPLIT, minImageRatioByControls)
        let maxImageRatio = Math.min(MAX_SPLIT, maxImageRatioByControls)

        if (minImageRatio > maxImageRatio) {
          const fallbackRatio = clamp(minImageRatioByControls, MIN_SPLIT, MAX_SPLIT)
          minImageRatio = fallbackRatio
          maxImageRatio = fallbackRatio
        }

        const ratioFromLeft = clamp((moveEvent.clientX - rect.left - FULLSCREEN_DIVIDER_WIDTH / 2) / availableWidth, 0, 1)
        const nextImageRatio = fullscreenSwapped ? 1 - ratioFromLeft : ratioFromLeft
        onSetSplit(clamp(Number(nextImageRatio.toFixed(3)), minImageRatio, maxImageRatio))
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
      if (hideVideoControlsTimerRef.current !== null) {
        window.clearTimeout(hideVideoControlsTimerRef.current)
        hideVideoControlsTimerRef.current = null
      }
    }
  }, [fullscreenActive])

  useEffect(
    () => () => {
      if (hideVideoControlsTimerRef.current !== null) {
        window.clearTimeout(hideVideoControlsTimerRef.current)
      }
    },
    [],
  )

  const showVideoControls = useCallback(() => {
    if (hideVideoControlsTimerRef.current !== null) {
      window.clearTimeout(hideVideoControlsTimerRef.current)
      hideVideoControlsTimerRef.current = null
    }
    setVideoControlsVisible(true)
  }, [])

  const hideVideoControls = useCallback(() => {
    if (hideVideoControlsTimerRef.current !== null) {
      window.clearTimeout(hideVideoControlsTimerRef.current)
    }
    hideVideoControlsTimerRef.current = window.setTimeout(() => {
      setVideoControlsVisible(false)
      hideVideoControlsTimerRef.current = null
    }, 150)
  }, [])

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

  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }
    const mode = subtitleVisible && subtitleTrackUrl ? 'showing' : 'hidden'
    for (let index = 0; index < video.textTracks.length; index += 1) {
      video.textTracks[index].mode = mode
    }
  }, [subtitleTrackUrl, subtitleVisible])

  if (!fullscreenActive || mode === 'music') {
    return null
  }

  const dualAvailableWidth = Math.max(1, effectiveImageViewportSize.width + effectiveVideoViewportSize.width)
  const minImageRatioByControls = DUAL_IMAGE_CONTROLS_MIN_TWO_GROUPS / dualAvailableWidth
  const maxImageRatioByControls = 1 - DUAL_VIDEO_CONTROLS_MIN_TWO_GROUPS / dualAvailableWidth
  let dualMinImageRatio = Math.max(MIN_SPLIT, minImageRatioByControls)
  let dualMaxImageRatio = Math.min(MAX_SPLIT, maxImageRatioByControls)

  if (dualMinImageRatio > dualMaxImageRatio) {
    const fallbackRatio = clamp(minImageRatioByControls, MIN_SPLIT, MAX_SPLIT)
    dualMinImageRatio = fallbackRatio
    dualMaxImageRatio = fallbackRatio
  }

  const imageRatio = fullscreenDisplay === 'dual'
    ? clamp(fullscreenSplit, dualMinImageRatio, dualMaxImageRatio)
    : clamp(fullscreenSplit, MIN_SPLIT, MAX_SPLIT)
  const videoRatio = 1 - imageRatio
  const paneOrder: PaneKey[] = fullscreenSwapped ? ['video', 'image'] : ['image', 'video']

  const activeSingleTransform = singlePane === 'video' ? videoTransform : imageTransform
  const zoomPercent = Math.round(activeSingleTransform.zoom * 100)

  const videoMediaTop = (effectiveVideoViewportSize.height - videoGeometry.height) / 2 + videoTransform.offsetY
  const videoMediaBottom = videoMediaTop + videoGeometry.height
  const topGap = videoMediaTop
  const bottomGap = effectiveVideoViewportSize.height - videoMediaBottom
  const videoControlsAtTop = bottomGap < topGap

  const controlsBlockHeight = 122
  const controlsMaxTop = Math.max(8, effectiveVideoViewportSize.height - controlsBlockHeight - 8)
  const controlsPreferredTop = videoControlsAtTop ? videoMediaTop - controlsBlockHeight - 8 : videoMediaBottom + 8
  const videoControlsTop = clamp(Math.round(controlsPreferredTop), 8, controlsMaxTop)

  const controlsWidthCap = clamp(fullscreenVideoControlsMaxWidth, 640, 1920) || DEFAULT_FULLSCREEN_VIDEO_CONTROLS_MAX_WIDTH
  const singleControlsViewport = { width: fallbackViewportWidth, height: fallbackViewportHeight }
  const singleControlsWidth = resolveFullscreenControlsWidth({
    viewportWidth: singleControlsViewport.width,
    viewportHeight: singleControlsViewport.height,
    widthCap: controlsWidthCap,
  })
  const dualImageControlsWidth = Math.max(120, Math.min(singleControlsWidth, effectiveImageViewportSize.width - 16))
  const dualVideoControlsWidth = Math.max(120, Math.min(singleControlsWidth, effectiveVideoViewportSize.width - 16))
  const controlsMaxWidth = Math.max(120, Math.min(effectiveVideoViewportSize.width - 16, controlsWidthCap))
  const controlsPreferredWidth = Math.max(120, videoGeometry.width - 16)
  const videoControlsWidthByGeometry = Math.min(controlsPreferredWidth, controlsMaxWidth)
  const videoControlsWidth =
    fullscreenDisplay === 'dual'
      ? dualVideoControlsWidth
      : fullscreenDisplay === 'video-only'
        ? singleControlsWidth
        : videoControlsWidthByGeometry
  const controlsMaxLeft = Math.max(8, effectiveVideoViewportSize.width - videoControlsWidth - 8)
  const centeredControlsLeft = Math.round((effectiveVideoViewportSize.width - videoControlsWidth) / 2)
  const videoControlsLeft = clamp(centeredControlsLeft, 8, controlsMaxLeft)
  const imageControlsCompact = fullscreenDisplay === 'dual' && dualImageControlsWidth < DUAL_IMAGE_CONTROLS_COMPACT_WIDTH
  const imageControlsHideRightGroup = fullscreenDisplay === 'dual' && dualImageControlsWidth < DUAL_IMAGE_CONTROLS_MIN_WITH_RIGHT_GROUP
  const videoControlsCompact = fullscreenDisplay === 'dual' && dualVideoControlsWidth < DUAL_VIDEO_CONTROLS_COMPACT_WIDTH
  const videoControlsHideLeftGroup = fullscreenDisplay === 'dual' && dualVideoControlsWidth < DUAL_VIDEO_CONTROLS_MIN_WITH_LEFT_GROUP
  const fullscreenControlsCssVars = {
    '--mpx-fullscreen-controls-max-width': `${singleControlsWidth}px`,
    '--mpx-fullscreen-controls-width': `${singleControlsWidth}px`,
  } as CSSProperties

  const imagePaneClassName = `fullscreen-pane fullscreen-image${fullscreenDisplay === 'dual' && !fullscreenVideoFocus ? ' is-pane-focus' : ''}`
  const videoPaneClassName = `fullscreen-pane fullscreen-video${fullscreenDisplay === 'dual' && fullscreenVideoFocus ? ' is-pane-focus' : ''}`

  const footerImageInfo = (() => {
    if (!focusedImage) {
      return t('ui.fullscreen.noImage')
    }

    const width = displayedImageNaturalSize?.width ?? focusedImage.width
    const height = displayedImageNaturalSize?.height ?? focusedImage.height
    const resolutionText = width > 0 && height > 0 ? `${width} x ${height}` : '-'
    return `${resolveMediaPathForFooter(focusedImage)} | ${resolutionText} | ${formatImageSizeForFooter(focusedImage.sizeKb)}`
  })()
  const footerVideoInfo = focusedVideo
    ? `${resolveMediaPathForFooter(focusedVideo)} | ${focusedVideo.width} x ${focusedVideo.height} | ${formatVideoSizeForFooter(focusedVideo.sizeMb)}`
    : t('ui.fullscreen.noVideo')

  const imageControls = showFullscreenFooter
    ? (
        <FullscreenFooter
          mode={mode}
          fullscreenDisplay={fullscreenDisplay}
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
          onAlignFocusedPane={alignFocusedPane}
          onSetZoomPercent={(percent) => {
            if (singlePane) {
              updatePaneTransform(singlePane, (previous) => ({
                ...previous,
                zoom: clamp(Number((percent / 100).toFixed(3)), MIN_ZOOM, MAX_ZOOM),
              }))
            }
          }}
          onResetSinglePane={resetSinglePane}
          onHoverStateChange={setFooterHovering}
          onExit={onExit}
          controlsWidth={fullscreenDisplay === 'dual' ? dualImageControlsWidth : undefined}
          compact={imageControlsCompact}
          hideRightGroup={imageControlsHideRightGroup}
        />
      )
    : null

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
      controlsRows={imageControls}
      onSetVideoFocus={onSetVideoFocus}
      onWheel={(event) => handlePaneWheel('image', event)}
      onMouseDown={(event) => startPaneDrag('image', event)}
      onImageNaturalSize={(naturalWidth, naturalHeight) => {
        if (naturalWidth > 0 && naturalHeight > 0) {
          setDisplayedImageAspect(naturalWidth / naturalHeight)
          setDisplayedImageNaturalSize({ width: naturalWidth, height: naturalHeight })
        }
      }}
    />
  )

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
      onSeekVideo={onSeekVideo}
      onToggleVideoPlay={onToggleVideoPlay}
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
      controlsWidth={fullscreenDisplay === 'dual' ? dualVideoControlsWidth : undefined}
      compact={videoControlsCompact}
      hideLeftGroup={videoControlsHideLeftGroup}
    />
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
      onSetVideoFocus={onSetVideoFocus}
      onWheel={(event) => handlePaneWheel('video', event)}
      onMouseDown={(event) => startPaneDrag('video', event)}
      onShowControls={showVideoControls}
      onHideControls={hideVideoControls}
      onVideoTimeUpdate={onVideoTimeUpdate}
      onVideoDurationDetected={onVideoDurationDetected}
      onVideoEnded={onVideoEnded}
    />
  )

  return (
    <div
      className="fullscreen-layer"
      style={fullscreenControlsCssVars}
      data-overlay-close="fullscreen"
      onMouseMove={(event) => {
        onSetFooterVisible(footerHovering || event.clientY > fullscreenViewport.height * 0.8)
      }}
      onMouseLeave={() => {
        setFooterHovering(false)
        onSetFooterVisible(false)
        hideVideoControls()
      }}
    >
      <div className="fullscreen-content" ref={contentRef}>
        {fullscreenDisplay === 'dual' ? (
          paneOrder.map((pane, index) => (
            <Fragment key={pane}>
              {pane === 'image' ? imagePane : videoPane}
              {index === 0 ? (
                <div
                  {...buildA11yPropsByRegistry({ key: 'commonAdjustFullscreenSplit', t })}
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

    </div>
  )
}

export default FullscreenLayer
