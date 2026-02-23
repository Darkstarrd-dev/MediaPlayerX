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
import type { ImageConvertAdjustProfile } from '../features/app/useAppSessionState'
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
const IMAGE_ADJUST_HISTOGRAM_BIN_COUNT = 64
const IMAGE_ADJUST_CURVE_CANVAS_WIDTH = 360
const IMAGE_ADJUST_CURVE_CANVAS_HEIGHT = 220
const IMAGE_ADJUST_CURVE_PADDING = 18
const IMAGE_ADJUST_PANEL_DRAG_MARGIN = 8

function loadImageElementForAdjust(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('image adjust preview image load failed'))
    image.src = src
  })
}

function buildImageAdjustHistogramBins(
  imageData: Uint8ClampedArray,
  channelStride: number,
): number[] {
  const bins = Array.from({ length: IMAGE_ADJUST_HISTOGRAM_BIN_COUNT }, () => 0)
  if (channelStride <= 0) {
    return bins
  }
  for (let index = 0; index < imageData.length; index += channelStride) {
    const red = imageData[index] ?? 0
    const green = imageData[index + 1] ?? 0
    const blue = imageData[index + 2] ?? 0
    const luminance = Math.round(red * 0.2126 + green * 0.7152 + blue * 0.0722)
    const binIndex = Math.max(0, Math.min(IMAGE_ADJUST_HISTOGRAM_BIN_COUNT - 1, Math.floor((luminance / 256) * IMAGE_ADJUST_HISTOGRAM_BIN_COUNT)))
    bins[binIndex] += 1
  }
  const peak = Math.max(1, ...bins)
  return bins.map((value) => Number((value / peak).toFixed(4)))
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function resolveNormalizedCurveAnchorX(
  shadowX: number,
  midtoneX: number,
  highlightX: number,
): { shadowX: number; midtoneX: number; highlightX: number } {
  const clampedShadowX = clampByte(shadowX)
  const clampedMidtoneX = clampByte(midtoneX)
  const clampedHighlightX = clampByte(highlightX)
  const normalizedShadowX = Math.max(1, Math.min(clampedShadowX, clampedMidtoneX - 2))
  const normalizedMidtoneX = Math.max(
    normalizedShadowX + 1,
    Math.min(clampedMidtoneX, clampedHighlightX - 1),
  )
  const normalizedHighlightX = Math.max(
    normalizedMidtoneX + 2,
    Math.min(clampedHighlightX, 254),
  )
  return {
    shadowX: normalizedShadowX,
    midtoneX: normalizedMidtoneX,
    highlightX: normalizedHighlightX,
  }
}

function resolveNormalizedCurveAnchors(
  shadowX: number,
  midtoneX: number,
  highlightX: number,
  shadowYOffset: number,
  midtoneYOffset: number,
  highlightYOffset: number,
): {
  anchorX: [number, number, number, number, number]
  anchorY: [number, number, number, number, number]
} {
  const normalizedX = resolveNormalizedCurveAnchorX(shadowX, midtoneX, highlightX)
  const anchorX: [number, number, number, number, number] = [
    0,
    normalizedX.shadowX,
    normalizedX.midtoneX,
    normalizedX.highlightX,
    255,
  ]
  const anchorY: [number, number, number, number, number] = [
    0,
    clampByte(anchorX[1] - shadowYOffset * 0.52),
    clampByte(anchorX[2] - midtoneYOffset * 0.52),
    clampByte(anchorX[3] - highlightYOffset * 0.52),
    255,
  ]
  return {
    anchorX,
    anchorY,
  }
}

function buildCurveLutFromAnchors(
  shadowX: number,
  midtoneX: number,
  highlightX: number,
  shadowYOffset: number,
  midtoneYOffset: number,
  highlightYOffset: number,
): Uint8ClampedArray {
  const { anchorX, anchorY } = resolveNormalizedCurveAnchors(
    shadowX,
    midtoneX,
    highlightX,
    shadowYOffset,
    midtoneYOffset,
    highlightYOffset,
  )

  const slope = new Array<number>(anchorX.length).fill(0)
  slope[0] = (anchorY[1] - anchorY[0]) / (anchorX[1] - anchorX[0])
  slope[slope.length - 1] =
    (anchorY[anchorY.length - 1] - anchorY[anchorY.length - 2]) /
    (anchorX[anchorX.length - 1] - anchorX[anchorX.length - 2])
  for (let index = 1; index < slope.length - 1; index += 1) {
    slope[index] =
      (anchorY[index + 1] - anchorY[index - 1]) /
      (anchorX[index + 1] - anchorX[index - 1])
  }

  const lut = new Uint8ClampedArray(256)
  for (let x = 0; x <= 255; x += 1) {
    let segmentIndex = 0
    while (segmentIndex < anchorX.length - 2 && x > anchorX[segmentIndex + 1]) {
      segmentIndex += 1
    }
    const x0 = anchorX[segmentIndex]
    const x1 = anchorX[segmentIndex + 1]
    const y0 = anchorY[segmentIndex]
    const y1 = anchorY[segmentIndex + 1]
    const span = Math.max(1, x1 - x0)
    const t = (x - x0) / span
    const m0 = slope[segmentIndex]
    const m1 = slope[segmentIndex + 1]
    const h00 = 2 * t * t * t - 3 * t * t + 1
    const h10 = t * t * t - 2 * t * t + t
    const h01 = -2 * t * t * t + 3 * t * t
    const h11 = t * t * t - t * t
    const y = h00 * y0 + h10 * span * m0 + h01 * y1 + h11 * span * m1
    lut[x] = clampByte(y)
  }

  return lut
}

function resolveCurveControlPoints(profile: ImageConvertAdjustProfile): Array<{ key: 'shadow' | 'midtone' | 'highlight'; x: number; y: number; value: number }> {
  const innerWidth = IMAGE_ADJUST_CURVE_CANVAS_WIDTH - IMAGE_ADJUST_CURVE_PADDING * 2
  const innerHeight = IMAGE_ADJUST_CURVE_CANVAS_HEIGHT - IMAGE_ADJUST_CURVE_PADDING * 2
  const { anchorX, anchorY } = resolveNormalizedCurveAnchors(
    profile.curve_shadow_x,
    profile.curve_midtone_x,
    profile.curve_highlight_x,
    profile.curve_shadow,
    profile.curve_midtone,
    profile.curve_highlight,
  )

  return [
    {
      key: 'shadow',
      x: Math.round((anchorX[1] / 255) * innerWidth),
      y: Math.round((1 - anchorY[1] / 255) * innerHeight),
      value: profile.curve_shadow,
    },
    {
      key: 'midtone',
      x: Math.round((anchorX[2] / 255) * innerWidth),
      y: Math.round((1 - anchorY[2] / 255) * innerHeight),
      value: profile.curve_midtone,
    },
    {
      key: 'highlight',
      x: Math.round((anchorX[3] / 255) * innerWidth),
      y: Math.round((1 - anchorY[3] / 255) * innerHeight),
      value: profile.curve_highlight,
    },
  ]
}

function resolveCurvePathD(profile: ImageConvertAdjustProfile): string {
  const innerWidth = IMAGE_ADJUST_CURVE_CANVAS_WIDTH - IMAGE_ADJUST_CURVE_PADDING * 2
  const innerHeight = IMAGE_ADJUST_CURVE_CANVAS_HEIGHT - IMAGE_ADJUST_CURVE_PADDING * 2
  const lut = buildCurveLutFromAnchors(
    profile.curve_shadow_x,
    profile.curve_midtone_x,
    profile.curve_highlight_x,
    profile.curve_shadow,
    profile.curve_midtone,
    profile.curve_highlight,
  )
  let pathData = ''
  for (let x = 0; x <= 255; x += 2) {
    const output = lut[x] ?? x
    const px = IMAGE_ADJUST_CURVE_PADDING + (x / 255) * innerWidth
    const py = IMAGE_ADJUST_CURVE_PADDING + (1 - output / 255) * innerHeight
    pathData += `${x === 0 ? 'M' : ' L'} ${px} ${py}`
  }
  const output = lut[255] ?? 255
  const px = IMAGE_ADJUST_CURVE_PADDING + innerWidth
  const py = IMAGE_ADJUST_CURVE_PADDING + (1 - output / 255) * innerHeight
  pathData += ` L ${px} ${py}`
  return pathData
}

function resolveMediaPathForFooter(item: { mediaLocator: ImageItem['mediaLocator'] } | { mediaLocator: VideoItem['mediaLocator'] }): string {
  const locator = item.mediaLocator
  if (locator.kind === 'filesystem') {
    return locator.absolutePath
  }
  return `${locator.archivePath} :: ${locator.entryName}`
}

function replacePathExtension(pathLike: string, nextExtension: string): string {
  const normalizedNextExtension = nextExtension.startsWith('.') ? nextExtension : `.${nextExtension}`
  const slashIndex = Math.max(pathLike.lastIndexOf('/'), pathLike.lastIndexOf('\\'))
  const dotIndex = pathLike.lastIndexOf('.')
  if (dotIndex <= slashIndex) {
    return `${pathLike}${normalizedNextExtension}`
  }
  return `${pathLike.slice(0, dotIndex)}${normalizedNextExtension}`
}

function resolveConvertedImagePathForFooter(
  image: ImageItem,
  targetFormat: 'webp' | 'jpeg' | 'png' | 'avif',
): string {
  const targetExtension = targetFormat === 'jpeg' ? '.jpg' : `.${targetFormat}`
  const locator = image.mediaLocator
  if (locator.kind === 'filesystem') {
    return replacePathExtension(locator.absolutePath, targetExtension)
  }
  const nextEntryName = replacePathExtension(locator.entryName, targetExtension)
  return `${locator.archivePath} :: ${nextEntryName}`
}

function estimateDataUrlSizeKb(dataUrl: string | null | undefined): number {
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    return 0
  }
  const commaIndex = dataUrl.indexOf(',')
  if (commaIndex <= 0) {
    return 0
  }
  const metadata = dataUrl.slice(0, commaIndex)
  const payload = dataUrl.slice(commaIndex + 1).replace(/\s/g, '')
  if (metadata.includes(';base64')) {
    const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0
    const bytes = Math.max(0, Math.floor((payload.length * 3) / 4) - padding)
    return bytes / 1024
  }
  try {
    const decoded = decodeURIComponent(payload)
    return new TextEncoder().encode(decoded).byteLength / 1024
  } catch {
    return payload.length / 1024
  }
}

function resolveDataUrlMimeType(dataUrl: string | null | undefined): string | null {
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    return null
  }
  const commaIndex = dataUrl.indexOf(',')
  if (commaIndex <= 0) {
    return null
  }
  const metadata = dataUrl.slice(5, commaIndex)
  const semicolonIndex = metadata.indexOf(';')
  const mimeType = semicolonIndex >= 0 ? metadata.slice(0, semicolonIndex) : metadata
  return mimeType.trim().toLowerCase() || null
}

function resolveFormatLabelByMimeType(mimeType: string | null): string | null {
  if (!mimeType) {
    return null
  }
  if (mimeType === 'image/jpeg') {
    return 'JPEG'
  }
  if (mimeType === 'image/png') {
    return 'PNG'
  }
  if (mimeType === 'image/webp') {
    return 'WEBP'
  }
  if (mimeType === 'image/avif') {
    return 'AVIF'
  }
  return mimeType.toUpperCase()
}

function resolveImageConvertTargetSize(
  sourceWidth: number,
  sourceHeight: number,
  scaleFactor: number,
  longestEdgePx: number | null,
): { width: number; height: number } {
  const safeSourceWidth = Math.max(1, Math.round(sourceWidth))
  const safeSourceHeight = Math.max(1, Math.round(sourceHeight))

  if (longestEdgePx != null && Number.isFinite(longestEdgePx) && longestEdgePx > 0) {
    const sourceLongestEdge = Math.max(safeSourceWidth, safeSourceHeight)
    const resizeRatio = Math.min(1, longestEdgePx / sourceLongestEdge)
    return {
      width: Math.max(1, Math.round(safeSourceWidth * resizeRatio)),
      height: Math.max(1, Math.round(safeSourceHeight * resizeRatio)),
    }
  }

  const safeScaleFactor = Math.max(0.1, Math.min(1, scaleFactor))
  return {
    width: Math.max(1, Math.round(safeSourceWidth * safeScaleFactor)),
    height: Math.max(1, Math.round(safeSourceHeight * safeScaleFactor)),
  }
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
  fullscreenDecodeCacheSize?: number
  autoPlayEnabled: boolean
  autoPlayInterval: number
  popoverDebugPinned: boolean
  imageConvertPreviewMode?: boolean
  imageConvertPreviewScale?: number
  imageConvertPreviewLongestEdgePx?: number | null
  imageConvertPreviewAdjustProfile?: ImageConvertAdjustProfile
  imageConvertPreviewFormat?: 'webp' | 'jpeg' | 'png' | 'avif'
  imageConvertPreviewQuality?: number
  imageConvertPreviewRenderedSrc?: string | null
  imageConvertPreviewError?: string | null
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
  onChangeImageConvertPreviewScale?: (value: number) => void
  onChangeImageConvertPreviewFormat?: (value: 'webp' | 'jpeg' | 'png' | 'avif') => void
  onChangeImageConvertPreviewQuality?: (value: number) => void
  onApplyImageConvertPreviewScaleToLongestEdge?: (value: number | null) => void
  onChangeImageConvertPreviewAdjustProfile?: (profile: ImageConvertAdjustProfile) => void
  onConfirmImageConvertPreview?: () => void
  onCancelImageConvertPreview?: () => void
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
  fullscreenDecodeCacheSize = 10,
  autoPlayEnabled,
  autoPlayInterval,
  popoverDebugPinned,
  imageConvertPreviewMode = false,
  imageConvertPreviewScale = 1,
  imageConvertPreviewLongestEdgePx = null,
  imageConvertPreviewAdjustProfile = {
    mode: 'basic',
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
  imageConvertPreviewFormat = 'webp',
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
  const { t } = useI18n()
  const contentRef = useRef<HTMLDivElement>(null)
  const imagePaneRef = useRef<HTMLElement>(null)
  const videoPaneRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hideVideoControlsTimerRef = useRef<number | null>(null)
  const imageConvertPreviewActive = mode === 'image' && imageConvertPreviewMode
  const effectiveFullscreenDisplay = imageConvertPreviewActive ? 'image-only' : fullscreenDisplay
  const [imageConvertCompareSplit, setImageConvertCompareSplit] = useState(0.5)
  const [imageConvertAdjustPanelOpen, setImageConvertAdjustPanelOpen] = useState(false)
  const [imageConvertAdjustPanelPosition, setImageConvertAdjustPanelPosition] = useState<{ x: number; y: number } | null>(null)
  const [imageConvertAdjustPanelDragging, setImageConvertAdjustPanelDragging] = useState(false)
  const [imageAdjustHistogramBins, setImageAdjustHistogramBins] = useState<number[]>(
    Array.from({ length: IMAGE_ADJUST_HISTOGRAM_BIN_COUNT }, () => 0),
  )
  const imageConvertAdjustInitialProfileRef = useRef<ImageConvertAdjustProfile | null>(null)
  const imageAdjustPanelRef = useRef<HTMLElement>(null)
  const levelsEditorTrackRef = useRef<HTMLDivElement>(null)
  const curveSvgRef = useRef<SVGSVGElement>(null)

  const { imageViewportSize, videoViewportSize } = useFullscreenViewportSize({
    fullscreenActive,
    mode,
    fullscreenDisplay: effectiveFullscreenDisplay,
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
    decodeCacheSize: fullscreenDecodeCacheSize,
  })
  const [displayedImageNaturalSize, setDisplayedImageNaturalSize] = useState<{ width: number; height: number } | null>(null)
  const [videoControlsVisible, setVideoControlsVisible] = useState(false)
  const [draggingPane, setDraggingPane] = useState<PaneKey | null>(null)
  const [footerHovering, setFooterHovering] = useState(false)

  useEffect(() => {
    if (!imageConvertPreviewActive) {
      setImageConvertAdjustPanelOpen(false)
      setImageConvertAdjustPanelDragging(false)
      imageConvertAdjustInitialProfileRef.current = null
    }
  }, [imageConvertPreviewActive])

  useEffect(() => {
    document.documentElement.dataset.mpxImageAdjustPanelOpen =
      imageConvertAdjustPanelOpen ? '1' : '0'
    return () => {
      document.documentElement.dataset.mpxImageAdjustPanelOpen = '0'
    }
  }, [imageConvertAdjustPanelOpen])

  useEffect(() => {
    const onCancelByGlobalEvent = () => {
      const initialProfile = imageConvertAdjustInitialProfileRef.current
      if (initialProfile) {
        onChangeImageConvertPreviewAdjustProfile?.({
          ...initialProfile,
        })
      }
      setImageConvertAdjustPanelOpen(false)
    }
    window.addEventListener('mpx:image-adjust-cancel', onCancelByGlobalEvent)
    return () => {
      window.removeEventListener('mpx:image-adjust-cancel', onCancelByGlobalEvent)
    }
  }, [onChangeImageConvertPreviewAdjustProfile])

  useEffect(() => {
    if (imageConvertAdjustPanelOpen) {
      onSetFooterVisible(false)
    }
  }, [imageConvertAdjustPanelOpen, onSetFooterVisible])

  useEffect(() => {
    if (!imageConvertAdjustPanelPosition) {
      return
    }
    const panelElement = imageAdjustPanelRef.current
    const panelWidth = panelElement?.offsetWidth ?? 560
    const panelHeight = panelElement?.offsetHeight ?? 480
    const nextX = clamp(
      imageConvertAdjustPanelPosition.x,
      IMAGE_ADJUST_PANEL_DRAG_MARGIN,
      Math.max(
        IMAGE_ADJUST_PANEL_DRAG_MARGIN,
        fullscreenViewport.width - panelWidth - IMAGE_ADJUST_PANEL_DRAG_MARGIN,
      ),
    )
    const nextY = clamp(
      imageConvertAdjustPanelPosition.y,
      IMAGE_ADJUST_PANEL_DRAG_MARGIN,
      Math.max(
        IMAGE_ADJUST_PANEL_DRAG_MARGIN,
        fullscreenViewport.height - panelHeight - IMAGE_ADJUST_PANEL_DRAG_MARGIN,
      ),
    )
    if (nextX !== imageConvertAdjustPanelPosition.x || nextY !== imageConvertAdjustPanelPosition.y) {
      setImageConvertAdjustPanelPosition({ x: nextX, y: nextY })
    }
  }, [
    fullscreenViewport.height,
    fullscreenViewport.width,
    imageConvertAdjustPanelPosition,
  ])

  useEffect(() => {
    if (!imageConvertPreviewActive || !imageConvertAdjustPanelOpen) {
      return
    }
    const source = imageConvertPreviewRenderedSrc ?? displayedImageSrc
    if (!source) {
      setImageAdjustHistogramBins(
        Array.from({ length: IMAGE_ADJUST_HISTOGRAM_BIN_COUNT }, () => 0),
      )
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const imageElement = await loadImageElementForAdjust(source)
        if (cancelled) {
          return
        }
        const sampleWidth = Math.max(1, Math.min(480, imageElement.naturalWidth || imageElement.width || 1))
        const sampleHeight = Math.max(1, Math.min(360, imageElement.naturalHeight || imageElement.height || 1))
        const canvas = document.createElement('canvas')
        canvas.width = sampleWidth
        canvas.height = sampleHeight
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) {
          return
        }
        context.clearRect(0, 0, sampleWidth, sampleHeight)
        context.drawImage(imageElement, 0, 0, sampleWidth, sampleHeight)
        const rawData = context.getImageData(0, 0, sampleWidth, sampleHeight)
        if (cancelled) {
          return
        }
        setImageAdjustHistogramBins(
          buildImageAdjustHistogramBins(rawData.data, rawData.data.length > 0 ? 4 : 0),
        )
      } catch {
        if (!cancelled) {
          setImageAdjustHistogramBins(
            Array.from({ length: IMAGE_ADJUST_HISTOGRAM_BIN_COUNT }, () => 0),
          )
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    displayedImageSrc,
    imageConvertAdjustPanelOpen,
    imageConvertPreviewActive,
    imageConvertPreviewRenderedSrc,
  ])

  useEffect(() => {
    setDisplayedImageNaturalSize(null)
  }, [displayedImageSrc])

  const singlePane = effectiveFullscreenDisplay === 'video-only' ? 'video' : effectiveFullscreenDisplay === 'image-only' ? 'image' : null
  const focusedPane: PaneKey = effectiveFullscreenDisplay === 'dual' ? (fullscreenVideoFocus ? 'video' : 'image') : (singlePane ?? 'image')
  const zoomEnabled = effectiveFullscreenDisplay !== 'dual'
  const autoplayEnabledForFocus =
    !imageConvertPreviewActive && focusedPane === 'image' && effectiveFullscreenDisplay !== 'video-only'
  const clampedVideoTime = clamp(videoTime, 0, Math.max(0, durationSec))

  const imageAspect = displayedImageAspect ?? resolveMediaAspect(focusedImage?.width ?? 0, focusedImage?.height ?? 0, 1)
  const videoAspect = resolveMediaAspect(focusedVideo?.width ?? 0, focusedVideo?.height ?? 0, 16 / 9)

  const fallbackViewportWidth = fullscreenViewport.width
  const fallbackViewportHeight = fullscreenViewport.height
  const effectiveImageViewportSize = useMemo(() => {
    if (effectiveFullscreenDisplay === 'image-only') {
      return { width: fallbackViewportWidth, height: fallbackViewportHeight }
    }
    if (imageViewportSize.width <= 64 || imageViewportSize.height <= 64) {
      return { width: fallbackViewportWidth, height: fallbackViewportHeight }
    }
    return imageViewportSize
  }, [effectiveFullscreenDisplay, fallbackViewportHeight, fallbackViewportWidth, imageViewportSize])
  const effectiveVideoViewportSize = useMemo(() => {
    if (effectiveFullscreenDisplay === 'video-only') {
      return { width: fallbackViewportWidth, height: fallbackViewportHeight }
    }
    if (videoViewportSize.width <= 64 || videoViewportSize.height <= 64) {
      return { width: fallbackViewportWidth, height: fallbackViewportHeight }
    }
    return videoViewportSize
  }, [effectiveFullscreenDisplay, fallbackViewportHeight, fallbackViewportWidth, videoViewportSize])

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

      const stepTargetPane: PaneKey = effectiveFullscreenDisplay === 'dual' ? pane : focusedPane
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
      effectiveFullscreenDisplay,
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
      const canDragDualVideo = effectiveFullscreenDisplay === 'dual' && pane === 'video'

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
    [effectiveFullscreenDisplay, imageTransform, setPaneAlign, singlePane, updatePaneTransform, videoTransform, zoomEnabled],
  )

  const startSplitDrag = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (event.button !== 0 || effectiveFullscreenDisplay !== 'dual') {
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
    [effectiveFullscreenDisplay, fullscreenSwapped, onSetSplit],
  )

  const toggleDualDisplay = useCallback(() => {
    if (effectiveFullscreenDisplay === 'dual') {
      onSetDisplay(imageConvertPreviewActive ? 'image-only' : fullscreenEntryDisplay)
      return
    }
    if (imageConvertPreviewActive) {
      return
    }
    onSetDisplay('dual')
  }, [effectiveFullscreenDisplay, fullscreenEntryDisplay, imageConvertPreviewActive, onSetDisplay])

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
    if (popoverDebugPinned) {
      setVideoControlsVisible(true)
      return
    }
    if (hideVideoControlsTimerRef.current !== null) {
      window.clearTimeout(hideVideoControlsTimerRef.current)
    }
    hideVideoControlsTimerRef.current = window.setTimeout(() => {
      setVideoControlsVisible(false)
      hideVideoControlsTimerRef.current = null
    }, 150)
  }, [popoverDebugPinned])

  useEffect(() => {
    if (!fullscreenActive || !popoverDebugPinned) {
      return
    }
    setVideoControlsVisible(true)
    onSetFooterVisible(true)
  }, [fullscreenActive, onSetFooterVisible, popoverDebugPinned])

  useEffect(() => {
    if (!fullscreenActive) {
      return
    }

    if (effectiveFullscreenDisplay !== 'dual') {
      return
    }

    setImageAlign(DEFAULT_PANE_ALIGN)
    setVideoAlign(DEFAULT_PANE_ALIGN)
    setImageTransform({ ...DEFAULT_PANE_TRANSFORM })
    setVideoTransform({ ...DEFAULT_PANE_TRANSFORM })
    setDraggingPane(null)
  }, [effectiveFullscreenDisplay, fullscreenActive])

  useEffect(() => {
    if (!imageConvertPreviewActive) {
      setImageConvertCompareSplit(0.5)
    }
  }, [imageConvertPreviewActive])

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

    video.playbackRate = clamp(videoRate, 0.1, 10)
    video.muted = videoMuted
    video.volume = clamp(videoVolume / 100, 0, 1)

    const videoVisible = effectiveFullscreenDisplay === 'video-only' || effectiveFullscreenDisplay === 'dual'
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
  }, [clampedVideoTime, effectiveFullscreenDisplay, focusedVideoSrc, fullscreenActive, videoMuted, videoPlaying, videoRate, videoVolume])

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

  const imageRatio = effectiveFullscreenDisplay === 'dual'
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
    effectiveFullscreenDisplay === 'dual'
      ? dualVideoControlsWidth
      : effectiveFullscreenDisplay === 'video-only'
        ? singleControlsWidth
        : videoControlsWidthByGeometry
  const controlsMaxLeft = Math.max(8, effectiveVideoViewportSize.width - videoControlsWidth - 8)
  const centeredControlsLeft = Math.round((effectiveVideoViewportSize.width - videoControlsWidth) / 2)
  const videoControlsLeft = clamp(centeredControlsLeft, 8, controlsMaxLeft)
  const imageControlsCompact = effectiveFullscreenDisplay === 'dual' && dualImageControlsWidth < DUAL_IMAGE_CONTROLS_COMPACT_WIDTH
  const imageControlsHideRightGroup = effectiveFullscreenDisplay === 'dual' && dualImageControlsWidth < DUAL_IMAGE_CONTROLS_MIN_WITH_RIGHT_GROUP
  const videoControlsCompact = effectiveFullscreenDisplay === 'dual' && dualVideoControlsWidth < DUAL_VIDEO_CONTROLS_COMPACT_WIDTH
  const videoControlsHideLeftGroup = effectiveFullscreenDisplay === 'dual' && dualVideoControlsWidth < DUAL_VIDEO_CONTROLS_MIN_WITH_LEFT_GROUP
  const fullscreenControlsCssVars = {
    '--mpx-fullscreen-controls-max-width': `${singleControlsWidth}px`,
    '--mpx-fullscreen-controls-width': `${singleControlsWidth}px`,
  } as CSSProperties

  const imagePaneClassName = `fullscreen-pane fullscreen-image${effectiveFullscreenDisplay === 'dual' && !fullscreenVideoFocus ? ' is-pane-focus' : ''}`
  const videoPaneClassName = `fullscreen-pane fullscreen-video${effectiveFullscreenDisplay === 'dual' && fullscreenVideoFocus ? ' is-pane-focus' : ''}`

  const footerImageInfo = (() => {
    if (!focusedImage) {
      return t('ui.fullscreen.noImage')
    }

    if (imageConvertPreviewActive) {
      const sourceWidth = displayedImageNaturalSize?.width ?? focusedImage.width
      const sourceHeight = displayedImageNaturalSize?.height ?? focusedImage.height
      const convertedSize = resolveImageConvertTargetSize(
        sourceWidth,
        sourceHeight,
        imageConvertPreviewScale,
        imageConvertPreviewLongestEdgePx,
      )
      const convertedWidth = convertedSize.width
      const convertedHeight = convertedSize.height
      const resolutionText = convertedWidth > 0 && convertedHeight > 0 ? `${convertedWidth} x ${convertedHeight}` : '-'
      const convertedPath = resolveConvertedImagePathForFooter(focusedImage, imageConvertPreviewFormat)
      const convertedSizeKb = estimateDataUrlSizeKb(imageConvertPreviewRenderedSrc)
      const actualFormatLabel = resolveFormatLabelByMimeType(resolveDataUrlMimeType(imageConvertPreviewRenderedSrc))
      const requestedFormatLabel = imageConvertPreviewFormat.toUpperCase()
      const formatText = actualFormatLabel && actualFormatLabel !== requestedFormatLabel
        ? `${requestedFormatLabel}->${actualFormatLabel}`
        : requestedFormatLabel
      const previewParamsText = imageConvertPreviewLongestEdgePx != null
        ? `LE${Math.round(imageConvertPreviewLongestEdgePx)} F${formatText} Q${Math.round(imageConvertPreviewQuality)}`
        : `S${imageConvertPreviewScale.toFixed(1)} F${formatText} Q${Math.round(imageConvertPreviewQuality)}`
      return `${previewParamsText} | ${convertedPath} | ${resolutionText} | ${formatImageSizeForFooter(convertedSizeKb)}`
    }

    const width = displayedImageNaturalSize?.width ?? focusedImage.width
    const height = displayedImageNaturalSize?.height ?? focusedImage.height
    const resolutionText = width > 0 && height > 0 ? `${width} x ${height}` : '-'
    return `${resolveMediaPathForFooter(focusedImage)} | ${resolutionText} | ${formatImageSizeForFooter(focusedImage.sizeKb)}`
  })()

  const applyScaleResultToLongestEdge = () => {
    if (!imageConvertPreviewActive) {
      return
    }
    const sourceWidth = displayedImageNaturalSize?.width ?? focusedImage?.width ?? 0
    const sourceHeight = displayedImageNaturalSize?.height ?? focusedImage?.height ?? 0
    const sourceLongestEdge = Math.max(0, Math.round(Math.max(sourceWidth, sourceHeight)))
    if (sourceLongestEdge <= 0) {
      return
    }
    const nextLongestEdge = Math.max(
      1,
      Math.min(16384, Math.round(sourceLongestEdge * imageConvertPreviewScale)),
    )
    onApplyImageConvertPreviewScaleToLongestEdge?.(nextLongestEdge)
  }
  const footerVideoInfo = focusedVideo
    ? `${resolveMediaPathForFooter(focusedVideo)} | ${focusedVideo.width} x ${focusedVideo.height} | ${formatVideoSizeForFooter(focusedVideo.sizeMb)}`
    : t('ui.fullscreen.noVideo')

  const imageControls = showFullscreenFooter && !imageConvertAdjustPanelOpen
    ? (
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
                zoom: clamp(Number((percent / 100).toFixed(3)), MIN_ZOOM, MAX_ZOOM),
              }))
            }
          }}
          onResetSinglePane={resetSinglePane}
          onHoverStateChange={setFooterHovering}
          onExit={onExit}
          controlsWidth={effectiveFullscreenDisplay === 'dual' ? dualImageControlsWidth : undefined}
          compact={imageControlsCompact}
          hideRightGroup={imageControlsHideRightGroup}
          imageConvertPreviewMode={imageConvertPreviewActive}
          imageConvertPreviewScale={imageConvertPreviewScale}
          imageConvertPreviewLongestEdgePx={imageConvertPreviewLongestEdgePx}
          imageConvertPreviewAdjustProfile={imageConvertPreviewAdjustProfile}
          imageConvertPreviewFormat={imageConvertPreviewFormat}
          imageConvertPreviewQuality={imageConvertPreviewQuality}
          showImageConvertAdjustPanel={imageConvertAdjustPanelOpen}
          canApplyScaleToLongestEdge={imageConvertPreviewActive && imageConvertPreviewLongestEdgePx == null}
          onChangeImageConvertPreviewScale={onChangeImageConvertPreviewScale}
          onChangeImageConvertPreviewFormat={onChangeImageConvertPreviewFormat}
          onChangeImageConvertPreviewQuality={onChangeImageConvertPreviewQuality}
          onApplyImageConvertPreviewScaleToLongestEdge={applyScaleResultToLongestEdge}
          onToggleImageConvertAdjustPanel={handleOpenAdjustPanel}
          onConfirmImageConvertPreview={onConfirmImageConvertPreview}
          onCancelImageConvertPreview={onCancelImageConvertPreview}
        />
      )
    : null

  const imagePane = (
    <FullscreenImagePane
      paneRef={imagePaneRef}
      className={imagePaneClassName}
      dataSlot={effectiveFullscreenDisplay === 'dual' ? 'fs-dual-pane-image' : undefined}
      flex={imageRatio}
      fullscreenDisplay={effectiveFullscreenDisplay}
      singlePane={singlePane}
      draggingPane={draggingPane}
      imageGeometry={imageGeometry}
      imageTransform={imageTransform}
      displayedImageSrc={displayedImageSrc}
      focusedImageOrdinal={focusedImage?.ordinal ?? null}
      controlsRows={imageControls}
      imageConvertPreviewMode={imageConvertPreviewActive}
      imageConvertPreviewSrc={imageConvertPreviewRenderedSrc}
      imageConvertPreviewError={imageConvertPreviewError}
      imageConvertCompareSplit={imageConvertCompareSplit}
      onSetImageConvertCompareSplit={setImageConvertCompareSplit}
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
      popoverDebugPinned={popoverDebugPinned}
      controlsWidth={effectiveFullscreenDisplay === 'dual' ? dualVideoControlsWidth : undefined}
      compact={videoControlsCompact}
      hideLeftGroup={videoControlsHideLeftGroup}
    />
  )

  const videoPane = (
    <FullscreenVideoPane
      paneRef={videoPaneRef}
      videoRef={videoRef}
      className={videoPaneClassName}
      dataSlot={effectiveFullscreenDisplay === 'dual' ? 'fs-dual-pane-video' : undefined}
      flex={videoRatio}
      fullscreenDisplay={effectiveFullscreenDisplay}
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

  const updatePreviewAdjustProfile = (
    patch: Partial<ImageConvertAdjustProfile>,
  ) => {
    onChangeImageConvertPreviewAdjustProfile?.({
      ...imageConvertPreviewAdjustProfile,
      ...patch,
    })
  }

  function restoreAdjustProfileFromInitial(): void {
    const initialProfile = imageConvertAdjustInitialProfileRef.current
    if (!initialProfile) {
      return
    }
    onChangeImageConvertPreviewAdjustProfile?.({
      ...initialProfile,
    })
  }

  function handleOpenAdjustPanel(): void {
    if (imageConvertAdjustPanelOpen) {
      return
    }
    imageConvertAdjustInitialProfileRef.current = {
      ...imageConvertPreviewAdjustProfile,
    }
    setImageConvertAdjustPanelOpen(true)
  }

  function handleResetAdjustPanel(): void {
    if (imageConvertPreviewAdjustProfile.mode === 'basic') {
      updatePreviewAdjustProfile({
        brightness: 0,
        contrast: 0,
      })
      return
    }
    if (imageConvertPreviewAdjustProfile.mode === 'levels') {
      updatePreviewAdjustProfile({
        level_input_black: 0,
        level_input_white: 255,
        level_gamma: 1,
      })
      return
    }
    updatePreviewAdjustProfile({
      curve_shadow_x: 64,
      curve_midtone_x: 128,
      curve_highlight_x: 192,
      curve_shadow: 0,
      curve_midtone: 0,
      curve_highlight: 0,
    })
  }

  function handleCancelAdjustPanel(): void {
    restoreAdjustProfileFromInitial()
    setImageConvertAdjustPanelOpen(false)
  }

  const levelBlackRatio = clamp(imageConvertPreviewAdjustProfile.level_input_black / 255, 0, 1)
  const levelWhiteRatio = clamp(imageConvertPreviewAdjustProfile.level_input_white / 255, 0, 1)
  const levelSpan = Math.max(0.0001, levelWhiteRatio - levelBlackRatio)
  const levelGammaRatio = clamp(
    levelBlackRatio + levelSpan * Math.pow(0.5, imageConvertPreviewAdjustProfile.level_gamma),
    levelBlackRatio + 0.01,
    levelWhiteRatio - 0.01,
  )

  const startLevelHandleDrag = (
    handle: 'black' | 'gamma' | 'white',
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => {
    if (event.button !== 0) {
      return
    }
    const trackElement = levelsEditorTrackRef.current
    if (!trackElement) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    const onMouseMove = (moveEvent: MouseEvent) => {
      const rect = trackElement.getBoundingClientRect()
      if (rect.width <= 1) {
        return
      }
      const rawRatio = clamp((moveEvent.clientX - rect.left) / rect.width, 0, 1)
      const currentBlack = imageConvertPreviewAdjustProfile.level_input_black
      const currentWhite = imageConvertPreviewAdjustProfile.level_input_white
      if (handle === 'black') {
        const nextBlack = Math.min(currentWhite - 1, Math.round(rawRatio * 255))
        updatePreviewAdjustProfile({ level_input_black: nextBlack })
        return
      }
      if (handle === 'white') {
        const nextWhite = Math.max(currentBlack + 1, Math.round(rawRatio * 255))
        updatePreviewAdjustProfile({ level_input_white: nextWhite })
        return
      }
      const span = Math.max(1, currentWhite - currentBlack)
      const normalized = clamp((rawRatio * 255 - currentBlack) / span, 0.001, 0.999)
      const nextGamma = clamp(Math.log(normalized) / Math.log(0.5), 0.1, 5)
      updatePreviewAdjustProfile({ level_gamma: Number(nextGamma.toFixed(3)) })
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const curvePoints = resolveCurveControlPoints(imageConvertPreviewAdjustProfile)
  const curvePathD = resolveCurvePathD(imageConvertPreviewAdjustProfile)
  const curveInnerWidth = IMAGE_ADJUST_CURVE_CANVAS_WIDTH - IMAGE_ADJUST_CURVE_PADDING * 2
  const curveInnerHeight = IMAGE_ADJUST_CURVE_CANVAS_HEIGHT - IMAGE_ADJUST_CURVE_PADDING * 2
  const curveHistogramBars = imageAdjustHistogramBins.map((ratio, index) => {
    const barWidth = curveInnerWidth / IMAGE_ADJUST_HISTOGRAM_BIN_COUNT
    const barHeight = Math.max(1, ratio * curveInnerHeight)
    return {
      x: IMAGE_ADJUST_CURVE_PADDING + index * barWidth,
      y: IMAGE_ADJUST_CURVE_PADDING + curveInnerHeight - barHeight,
      width: Math.max(0.5, barWidth - 0.5),
      height: barHeight,
    }
  })

  const startAdjustPanelDrag = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return
    }
    const panelElement = imageAdjustPanelRef.current
    if (!panelElement) {
      return
    }
    const panelRect = panelElement.getBoundingClientRect()
    const dragOffsetX = event.clientX - panelRect.left
    const dragOffsetY = event.clientY - panelRect.top
    const panelWidth = panelElement.offsetWidth
    const panelHeight = panelElement.offsetHeight
    event.preventDefault()
    event.stopPropagation()
    setImageConvertAdjustPanelDragging(true)

    const onMouseMove = (moveEvent: MouseEvent) => {
      const nextX = clamp(
        moveEvent.clientX - dragOffsetX,
        IMAGE_ADJUST_PANEL_DRAG_MARGIN,
        Math.max(
          IMAGE_ADJUST_PANEL_DRAG_MARGIN,
          fullscreenViewport.width - panelWidth - IMAGE_ADJUST_PANEL_DRAG_MARGIN,
        ),
      )
      const nextY = clamp(
        moveEvent.clientY - dragOffsetY,
        IMAGE_ADJUST_PANEL_DRAG_MARGIN,
        Math.max(
          IMAGE_ADJUST_PANEL_DRAG_MARGIN,
          fullscreenViewport.height - panelHeight - IMAGE_ADJUST_PANEL_DRAG_MARGIN,
        ),
      )
      setImageConvertAdjustPanelPosition({ x: nextX, y: nextY })
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      setImageConvertAdjustPanelDragging(false)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const imageAdjustPanelInlineStyle: CSSProperties | undefined = imageConvertAdjustPanelPosition
    ? {
        left: `${Math.round(imageConvertAdjustPanelPosition.x)}px`,
        top: `${Math.round(imageConvertAdjustPanelPosition.y)}px`,
        bottom: 'auto',
      }
    : undefined

  const startCurvePointDrag = (
    pointKey: 'shadow' | 'midtone' | 'highlight',
    event: ReactMouseEvent<SVGCircleElement>,
  ) => {
    if (event.button !== 0) {
      return
    }
    const svgElement = curveSvgRef.current
    if (!svgElement) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    const onMouseMove = (moveEvent: MouseEvent) => {
      const rect = svgElement.getBoundingClientRect()
      if (rect.width <= 1 || rect.height <= 1) {
        return
      }
      const innerWidth = IMAGE_ADJUST_CURVE_CANVAS_WIDTH - IMAGE_ADJUST_CURVE_PADDING * 2
      const innerHeight = IMAGE_ADJUST_CURVE_CANVAS_HEIGHT - IMAGE_ADJUST_CURVE_PADDING * 2
      const normalizedX = clamp((moveEvent.clientX - rect.left) / rect.width, 0, 1)
      const normalizedY = clamp((moveEvent.clientY - rect.top) / rect.height, 0, 1)
      const localX = clamp(normalizedX * IMAGE_ADJUST_CURVE_CANVAS_WIDTH - IMAGE_ADJUST_CURVE_PADDING, 0, innerWidth)
      const localY = clamp(normalizedY * IMAGE_ADJUST_CURVE_CANVAS_HEIGHT - IMAGE_ADJUST_CURVE_PADDING, 0, innerHeight)
      const currentShadowX = imageConvertPreviewAdjustProfile.curve_shadow_x
      const currentMidtoneX = imageConvertPreviewAdjustProfile.curve_midtone_x
      const currentHighlightX = imageConvertPreviewAdjustProfile.curve_highlight_x

      let nextX = Math.round((localX / innerWidth) * 255)
      if (pointKey === 'shadow') {
        nextX = clamp(nextX, 1, currentMidtoneX - 1)
      } else if (pointKey === 'midtone') {
        nextX = clamp(nextX, currentShadowX + 1, currentHighlightX - 1)
      } else {
        nextX = clamp(nextX, currentMidtoneX + 1, 254)
      }

      const nextAnchorY = clampByte(Math.round((1 - localY / innerHeight) * 255))
      const nextValue = clamp((nextX - nextAnchorY) / 0.52, -100, 100)
      if (pointKey === 'shadow') {
        updatePreviewAdjustProfile({
          curve_shadow_x: nextX,
          curve_shadow: Number(nextValue.toFixed(1)),
        })
      } else if (pointKey === 'midtone') {
        updatePreviewAdjustProfile({
          curve_midtone_x: nextX,
          curve_midtone: Number(nextValue.toFixed(1)),
        })
      } else {
        updatePreviewAdjustProfile({
          curve_highlight_x: nextX,
          curve_highlight: Number(nextValue.toFixed(1)),
        })
      }
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  return (
    <div
      className="fullscreen-layer"
      data-slot="bg-fs-mask"
      style={fullscreenControlsCssVars}
      data-overlay-close="fullscreen"
      onMouseMove={(event) => {
        if (popoverDebugPinned) {
          onSetFooterVisible(true)
          return
        }
        onSetFooterVisible(footerHovering || event.clientY > fullscreenViewport.height * 0.8)
      }}
      onMouseLeave={() => {
        if (popoverDebugPinned) {
          onSetFooterVisible(true)
          return
        }
        setFooterHovering(false)
        onSetFooterVisible(false)
        hideVideoControls()
      }}
    >
      <span hidden data-slot="fs-layer-root" />
      <div className="fullscreen-content" data-slot="fs-layer-content" ref={contentRef}>
        {effectiveFullscreenDisplay === 'dual' ? (
          <>
            <span hidden data-slot="fs-dual-root" />
            <span hidden data-slot="fs-dual-pane-image" />
            <span hidden data-slot="fs-dual-pane-video" />
            {paneOrder.map((pane, index) => (
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
            ))}
          </>
        ) : effectiveFullscreenDisplay === 'image-only' ? (
          <section className="fullscreen-single-pane" data-slot="fs-nondual-root">{imagePane}</section>
        ) : (
          <section className="fullscreen-single-pane" data-slot="fs-nondual-root">{videoPane}</section>
        )}
      </div>

      {imageConvertPreviewActive && imageConvertAdjustPanelOpen ? (
        <div
          className="fullscreen-image-adjust-mask"
          data-slot="fs-image-controls-adjust-panel"
        >
          <section
            ref={imageAdjustPanelRef}
            className={`fullscreen-image-adjust-panel${imageConvertAdjustPanelDragging ? ' is-dragging' : ''}`}
            style={imageAdjustPanelInlineStyle}
            onMouseDown={(event) => {
              event.stopPropagation()
            }}
          >
            <div
              className="fullscreen-image-adjust-drag-head"
              onMouseDown={startAdjustPanelDrag}
            >
              <h3>图像调节</h3>
              <span>拖拽移动</span>
            </div>
            <div className="fullscreen-image-adjust-mode-group">
              {(['basic', 'levels', 'curve'] as const).map((modeKey) => (
                <button
                  key={modeKey}
                  className={imageConvertPreviewAdjustProfile.mode === modeKey ? 'is-active' : ''}
                  type="button"
                  onClick={() => {
                    updatePreviewAdjustProfile({ mode: modeKey })
                  }}
                >
                  {modeKey.toUpperCase()}
                </button>
              ))}
            </div>
            {imageConvertPreviewAdjustProfile.mode === 'basic' ? (
              <>
                <label className="fullscreen-image-adjust-row">
                  <span>Brightness {Math.round(imageConvertPreviewAdjustProfile.brightness)}</span>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    step={1}
                    value={imageConvertPreviewAdjustProfile.brightness}
                    onChange={(event) => {
                      updatePreviewAdjustProfile({ brightness: Number(event.target.value) })
                    }}
                  />
                </label>
                <label className="fullscreen-image-adjust-row">
                  <span>Contrast {Math.round(imageConvertPreviewAdjustProfile.contrast)}</span>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    step={1}
                    value={imageConvertPreviewAdjustProfile.contrast}
                    onChange={(event) => {
                      updatePreviewAdjustProfile({ contrast: Number(event.target.value) })
                    }}
                  />
                </label>
              </>
            ) : null}
            {imageConvertPreviewAdjustProfile.mode === 'levels' ? (
              <section className="fullscreen-image-adjust-editor-block">
                <header className="fullscreen-image-adjust-editor-head">
                  <strong>Levels</strong>
                  <span>
                    B {Math.round(imageConvertPreviewAdjustProfile.level_input_black)}
                    {' | '}
                    G {imageConvertPreviewAdjustProfile.level_gamma.toFixed(2)}
                    {' | '}
                    W {Math.round(imageConvertPreviewAdjustProfile.level_input_white)}
                  </span>
                </header>
                <div className="fullscreen-image-adjust-levels-editor" ref={levelsEditorTrackRef}>
                  <div className="fullscreen-image-adjust-levels-histogram" aria-hidden="true">
                    {imageAdjustHistogramBins.map((value, index) => (
                      <span
                        key={`level-hist-${index}`}
                        className="fullscreen-image-adjust-levels-histogram-bar"
                        style={{ height: `${Math.max(2, Math.round(value * 100))}%` }}
                      />
                    ))}
                  </div>
                  <div className="fullscreen-image-adjust-levels-track" aria-label="Levels editor">
                    <button
                      aria-label="Input Black"
                      className="fullscreen-image-adjust-levels-handle is-black"
                      style={{ left: `${(levelBlackRatio * 100).toFixed(2)}%` }}
                      type="button"
                      onMouseDown={(event) => {
                        startLevelHandleDrag('black', event)
                      }}
                    />
                    <button
                      aria-label="Gamma"
                      className="fullscreen-image-adjust-levels-handle is-gamma"
                      style={{ left: `${(levelGammaRatio * 100).toFixed(2)}%` }}
                      type="button"
                      onMouseDown={(event) => {
                        startLevelHandleDrag('gamma', event)
                      }}
                    />
                    <button
                      aria-label="Input White"
                      className="fullscreen-image-adjust-levels-handle is-white"
                      style={{ left: `${(levelWhiteRatio * 100).toFixed(2)}%` }}
                      type="button"
                      onMouseDown={(event) => {
                        startLevelHandleDrag('white', event)
                      }}
                    />
                  </div>
                </div>
              </section>
            ) : null}
            {imageConvertPreviewAdjustProfile.mode === 'curve' ? (
              <section className="fullscreen-image-adjust-editor-block">
                <header className="fullscreen-image-adjust-editor-head">
                  <strong>Curve (Master)</strong>
                  <span>
                    S {Math.round(imageConvertPreviewAdjustProfile.curve_shadow)}
                    {' | '}
                    M {Math.round(imageConvertPreviewAdjustProfile.curve_midtone)}
                    {' | '}
                    H {Math.round(imageConvertPreviewAdjustProfile.curve_highlight)}
                  </span>
                </header>
                <svg
                  ref={curveSvgRef}
                  className="fullscreen-image-adjust-curve-svg"
                  viewBox={`0 0 ${IMAGE_ADJUST_CURVE_CANVAS_WIDTH} ${IMAGE_ADJUST_CURVE_CANVAS_HEIGHT}`}
                  role="img"
                  aria-label="Curve editor"
                >
                  <defs>
                    <pattern
                      id="fullscreen-image-adjust-curve-grid"
                      width="54"
                      height="54"
                      patternUnits="userSpaceOnUse"
                    >
                      <path d="M 54 0 L 0 0 0 54" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect
                    x={IMAGE_ADJUST_CURVE_PADDING}
                    y={IMAGE_ADJUST_CURVE_PADDING}
                    width={IMAGE_ADJUST_CURVE_CANVAS_WIDTH - IMAGE_ADJUST_CURVE_PADDING * 2}
                    height={IMAGE_ADJUST_CURVE_CANVAS_HEIGHT - IMAGE_ADJUST_CURVE_PADDING * 2}
                    fill="url(#fullscreen-image-adjust-curve-grid)"
                    stroke="currentColor"
                    strokeOpacity="0.3"
                  />
                  <g className="fullscreen-image-adjust-curve-histogram" aria-hidden="true">
                    {curveHistogramBars.map((bar, index) => (
                      <rect
                        key={`curve-hist-${index}`}
                        className="fullscreen-image-adjust-curve-histogram-bar"
                        x={bar.x}
                        y={bar.y}
                        width={bar.width}
                        height={bar.height}
                      />
                    ))}
                  </g>
                  <line
                    x1={IMAGE_ADJUST_CURVE_PADDING}
                    y1={IMAGE_ADJUST_CURVE_CANVAS_HEIGHT - IMAGE_ADJUST_CURVE_PADDING}
                    x2={IMAGE_ADJUST_CURVE_CANVAS_WIDTH - IMAGE_ADJUST_CURVE_PADDING}
                    y2={IMAGE_ADJUST_CURVE_PADDING}
                    stroke="currentColor"
                    strokeOpacity="0.35"
                    strokeDasharray="4 3"
                  />
                  <path
                    d={curvePathD}
                    fill="none"
                    stroke="var(--mpx-accent-500, #58a6ff)"
                    strokeWidth="2"
                  />
                  {curvePoints.map((point) => (
                    <g key={`curve-point-${point.key}`}>
                      <circle
                        cx={point.x + IMAGE_ADJUST_CURVE_PADDING}
                        cy={point.y + IMAGE_ADJUST_CURVE_PADDING}
                        r={8}
                        className="fullscreen-image-adjust-curve-point-hit"
                        onMouseDown={(event) => {
                          startCurvePointDrag(point.key, event)
                        }}
                      />
                      <circle
                        cx={point.x + IMAGE_ADJUST_CURVE_PADDING}
                        cy={point.y + IMAGE_ADJUST_CURVE_PADDING}
                        r={4}
                        className="fullscreen-image-adjust-curve-point"
                        onMouseDown={(event) => {
                          startCurvePointDrag(point.key, event)
                        }}
                      />
                    </g>
                  ))}
                </svg>
              </section>
            ) : null}
            <div className="fullscreen-image-adjust-actions">
              <button
                type="button"
                onClick={handleResetAdjustPanel}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleCancelAdjustPanel}
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      ) : null}

    </div>
  )
}

export default FullscreenLayer
