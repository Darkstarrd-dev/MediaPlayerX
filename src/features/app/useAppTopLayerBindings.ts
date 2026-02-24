import { useEffect, useRef, useState } from 'react'

import {
  normalizePathForCompare,
} from './mediaPathUtils'
import {
  resolveImageConvertScopeNodeIds,
  resolveScopedImageConvertNavigationNodeId,
} from './workspaceImageManageUtils'
import { useAppTopLayerState } from './useAppTopLayerState'
import type { ImageConvertAdjustProfile } from './useAppSessionState'
import type { AppRuntimeSourcesResult } from './useAppRuntimeSources'
import type { AppReadAndNavigationResult } from './useAppReadAndNavigation'
import type { AppDisplayAndEffectsResult } from './useAppDisplayAndEffects'

const AUTO_PLAY_PRESETS = [1, 2, 3, 5, 8]

function resolveImageConvertMimeType(format: 'webp' | 'jpeg' | 'png' | 'avif'): string {
  if (format === 'jpeg') {
    return 'image/jpeg'
  }
  if (format === 'png') {
    return 'image/png'
  }
  if (format === 'avif') {
    return 'image/avif'
  }
  return 'image/webp'
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('preview image load failed'))
    image.src = src
  })
}

function canvasToDataUrl(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
): Promise<string> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve(
            quality == null ? canvas.toDataURL(mimeType) : canvas.toDataURL(mimeType, quality),
          )
          return
        }
        const reader = new FileReader()
        reader.onload = () => {
          const result = typeof reader.result === 'string' ? reader.result : canvas.toDataURL(mimeType)
          resolve(result)
        }
        reader.onerror = () => {
          resolve(
            quality == null ? canvas.toDataURL(mimeType) : canvas.toDataURL(mimeType, quality),
          )
        }
        reader.readAsDataURL(blob)
      },
      mimeType,
      quality,
    )
  })
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

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function buildCurveLutFromAnchors(
  shadowX: number,
  midtoneX: number,
  highlightX: number,
  shadowYOffset: number,
  midtoneYOffset: number,
  highlightYOffset: number,
): Uint8ClampedArray {
  const clampedShadowX = clampByte(shadowX)
  const clampedMidtoneX = clampByte(midtoneX)
  const clampedHighlightX = clampByte(highlightX)
  const anchorX = [
    0,
    Math.max(1, Math.min(clampedShadowX, clampedMidtoneX - 2)),
    Math.max(clampedShadowX + 1, Math.min(clampedMidtoneX, clampedHighlightX - 1)),
    Math.max(clampedMidtoneX + 2, Math.min(clampedHighlightX, 254)),
    255,
  ]
  const anchorY = [
    0,
    clampByte(anchorX[1] - shadowYOffset * 0.52),
    clampByte(anchorX[2] - midtoneYOffset * 0.52),
    clampByte(anchorX[3] - highlightYOffset * 0.52),
    255,
  ]
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
    while (
      segmentIndex < anchorX.length - 2 &&
      x > anchorX[segmentIndex + 1]
    ) {
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

function createImageConvertLut(profile: ImageConvertAdjustProfile): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256)
  const normalizedContrast = Math.max(-100, Math.min(100, profile.contrast)) / 100
  const contrastFactor = (259 * (normalizedContrast * 255 + 255)) / (255 * (259 - normalizedContrast * 255))
  const brightnessOffset = (Math.max(-100, Math.min(100, profile.brightness)) / 100) * 255
  const inputBlack = Math.max(0, Math.min(254, Math.round(profile.level_input_black)))
  const inputWhite = Math.max(inputBlack + 1, Math.min(255, Math.round(profile.level_input_white)))
  const gamma = Math.max(0.1, Math.min(5, profile.level_gamma))
  const curveShadow = Math.max(-100, Math.min(100, profile.curve_shadow))
  const curveMidtone = Math.max(-100, Math.min(100, profile.curve_midtone))
  const curveHighlight = Math.max(-100, Math.min(100, profile.curve_highlight))
  const curveLut =
    profile.mode === 'curve'
      ? buildCurveLutFromAnchors(
        profile.curve_shadow_x,
        profile.curve_midtone_x,
        profile.curve_highlight_x,
        curveShadow,
        curveMidtone,
        curveHighlight,
      )
      : null

  for (let index = 0; index < 256; index += 1) {
    let value = index
    if (profile.mode === 'basic') {
      value = contrastFactor * (value - 128) + 128 + brightnessOffset
    }
    if (profile.mode === 'levels') {
      const leveled = (value - inputBlack) / (inputWhite - inputBlack)
      const clampedLeveled = Math.max(0, Math.min(1, leveled))
      value = 255 * Math.pow(clampedLeveled, 1 / gamma)
    }
    if (profile.mode === 'curve') {
      value = curveLut ? curveLut[clampByte(value)] : value
    }
    lut[index] = clampByte(value)
  }

  return lut
}

function applyImageConvertAdjustToCanvas(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  profile: ImageConvertAdjustProfile,
): void {
  const isIdentityProfile =
    (profile.mode === 'basic' && profile.brightness === 0 && profile.contrast === 0) ||
    (profile.mode === 'levels' &&
      profile.level_input_black === 0 &&
      profile.level_input_white === 255 &&
      profile.level_gamma === 1) ||
    (profile.mode === 'curve' &&
      profile.curve_shadow_x === 64 &&
      profile.curve_midtone_x === 128 &&
      profile.curve_highlight_x === 192 &&
      profile.curve_shadow === 0 &&
      profile.curve_midtone === 0 &&
      profile.curve_highlight === 0)
  if (isIdentityProfile) {
    return
  }

  const imageData = context.getImageData(0, 0, width, height)
  const lut = createImageConvertLut(profile)
  const pixels = imageData.data
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = lut[pixels[index]]
    pixels[index + 1] = lut[pixels[index + 1]]
    pixels[index + 2] = lut[pixels[index + 2]]
  }
  context.putImageData(imageData, 0, 0)
}

interface UseAppTopLayerBindingsParams {
  runtimeSources: AppRuntimeSourcesResult
  readNavigationState: AppReadAndNavigationResult
  displayState: AppDisplayAndEffectsResult
  adReviewDeleteOverlayDebugActive: boolean
  onOpenAdReviewDeleteOverlayDebug: () => void
}

export function useAppTopLayerBindings({
  runtimeSources,
  readNavigationState,
  displayState,
  adReviewDeleteOverlayDebugActive,
  onOpenAdReviewDeleteOverlayDebug,
}: UseAppTopLayerBindingsParams) {
  const [imageConvertPreviewRenderedSrc, setImageConvertPreviewRenderedSrc] = useState<string | null>(null)
  const [imageConvertPreviewError, setImageConvertPreviewError] = useState<string | null>(null)
  const imageConvertPreviewRenderTokenRef = useRef(0)

  const {
    appSettings,
    repositoryBootstrap,
    sessionState,
    mediaState,
    playlistPersistence,
    importState,
    archiveLoadStatus,
  } = runtimeSources

  const {
    mediaRepository,
    repositoryMode,
  } = repositoryBootstrap

  const {
    mode,
  } = appSettings

  const {
    manageMode,
    metadataManageMode,
    importMenuOpen,
    setImportMenuOpen,
    dismissedImportTaskIds,
    setDismissedImportTaskIds,
    importTaskPanelOpen,
    setImportTaskPanelOpen,
    helpOverlayOpen,
    themeParameterPanelOpen,
    setThemeParameterPanelOpen,
    fullscreenEntryDisplay,
    selectedPackageId,
    selectedSidebarNodeId,
    setSelectedPackageId,
    setSelectedSidebarNodeId,
    imageConvertScale,
    setImageConvertScale,
    imageConvertLongestEdgePx,
    setImageConvertLongestEdgePx,
    imageConvertAdjustProfile,
    setImageConvertAdjustProfile,
    imageConvertFormat,
    setImageConvertFormat,
    imageConvertQuality,
    setImageConvertQuality,
    imageConvertPreviewMode,
    setImageConvertPreviewMode,
    imageConvertPreviewScale,
    setImageConvertPreviewScale,
    imageConvertPreviewLongestEdgePx,
    setImageConvertPreviewLongestEdgePx,
    imageConvertPreviewAdjustProfile,
    setImageConvertPreviewAdjustProfile,
    imageConvertPreviewFormat,
    setImageConvertPreviewFormat,
    imageConvertPreviewQuality,
    setImageConvertPreviewQuality,
  } = sessionState

  const {
    fullscreenActive,
    showFullscreenFooter,
    fullscreenDisplay,
    fullscreenSwapped,
    fullscreenVideoFocus,
    fullscreenSplit,
    playlistIds,
    selectedVideoId,
    selectVideoFromBrowser,
    videoTime,
    videoPlaying,
    videoRate,
    videoVolume,
    videoMuted,
    videoFitMode,
    videoLoopMode,
    setVideoPlaying,
    goPlaylist,
    videoQueueSource,
    setVideoTime,
    setVideoDurationById,
    setVideoMuted,
    setVideoVolume,
    setVideoRate,
    setVideoFitMode,
    cycleVideoLoopMode,
    cycleVideoFitMode,
    setShowFullscreenFooter,
    setFullscreenDisplay,
    setFullscreenSwapped,
    setFullscreenVideoFocus,
    setFullscreenSplit,
  } = mediaState

  const {
    backendRead,
    displayThumbnailScaleLevel,
    thumbnailScaleLevelCount,
    canThumbnailScaleDown,
    canThumbnailScaleUp,
    focusedImage,
    moveImage,
    goPackage,
    rootScopedVideoIds,
    sidebarCheckedNodeIds,
    activeSelectionScope,
    sidebarNodeById,
    applySidebarRatio,
    applyMetadataRatio,
    videoByIdEffective,
    collapseSidebar,
    sidebarCollapsed,
    layoutConvergedInsetPx,
    onExpandSidebar,
  } = readNavigationState

  const {
    backendWrite,
    toggleManageMode,
    toggleMetadataManageMode,
    runtimeCapabilities,
    focusedVideoDurationSec,
    focusedVideoCoverColor,
    focusedVideoEffective,
    fullscreenImageSrc,
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
    setSubtitleVisible,
    selectSubtitleById,
    focusedVideoCoverImageSrc,
    fullscreenAlignRequest,
    setFullscreenActiveWithAutoStop,
  } = displayState

  useEffect(() => {
    if (!imageConvertPreviewMode || !fullscreenImageSrc) {
      setImageConvertPreviewRenderedSrc(null)
      setImageConvertPreviewError(null)
      return
    }

    const renderToken = imageConvertPreviewRenderTokenRef.current + 1
    imageConvertPreviewRenderTokenRef.current = renderToken
    setImageConvertPreviewError(null)

    const delayTimer = window.setTimeout(() => {
      void (async () => {
        try {
          const imageElement = await loadImageElement(fullscreenImageSrc)
          const sourceWidth = Math.max(1, imageElement.naturalWidth || imageElement.width || 1)
          const sourceHeight = Math.max(1, imageElement.naturalHeight || imageElement.height || 1)
          const targetSize = resolveImageConvertTargetSize(
            sourceWidth,
            sourceHeight,
            imageConvertPreviewScale,
            imageConvertPreviewLongestEdgePx,
          )
          const targetWidth = targetSize.width
          const targetHeight = targetSize.height

          const canvas = document.createElement('canvas')
          canvas.width = targetWidth
          canvas.height = targetHeight
          const context = canvas.getContext('2d')
          if (!context) {
            throw new Error('preview canvas unavailable')
          }

          context.imageSmoothingEnabled = true
          context.imageSmoothingQuality = imageConvertPreviewQuality >= 70 ? 'high' : imageConvertPreviewQuality >= 40 ? 'medium' : 'low'
          context.clearRect(0, 0, targetWidth, targetHeight)
          context.drawImage(imageElement, 0, 0, targetWidth, targetHeight)
          applyImageConvertAdjustToCanvas(
            context,
            targetWidth,
            targetHeight,
            imageConvertPreviewAdjustProfile,
          )

          const mimeType = resolveImageConvertMimeType(imageConvertPreviewFormat)
          const quality = imageConvertPreviewFormat === 'png'
            ? undefined
            : Math.max(0.1, Math.min(1, Number((imageConvertPreviewQuality / 100).toFixed(2))))
          const rendered = await canvasToDataUrl(canvas, mimeType, quality)

          if (imageConvertPreviewRenderTokenRef.current !== renderToken) {
            return
          }
          setImageConvertPreviewRenderedSrc(rendered)
          setImageConvertPreviewError(null)
        } catch (error) {
          if (imageConvertPreviewRenderTokenRef.current !== renderToken) {
            return
          }
          const reason = error instanceof Error && error.message ? error.message : String(error)
          setImageConvertPreviewRenderedSrc(null)
          setImageConvertPreviewError(reason)
        }
      })()
    }, 40)

    return () => {
      window.clearTimeout(delayTimer)
    }
  }, [
    fullscreenImageSrc,
    imageConvertPreviewFormat,
    imageConvertPreviewAdjustProfile,
    imageConvertPreviewLongestEdgePx,
    imageConvertPreviewMode,
    imageConvertPreviewQuality,
    imageConvertPreviewScale,
  ])

  const goPackageForFullscreen = (step: number) => {
    if (mode !== 'image' || !imageConvertPreviewMode) {
      goPackage(step)
      return
    }

    const scopeNodeIds = resolveImageConvertScopeNodeIds({
      mode,
      manageMode,
      activeSelectionScope,
      sidebarCheckedNodeIds,
      selectedSidebarNodeId,
      sidebarNodeById,
    })
    if (scopeNodeIds.length === 0) {
      goPackage(step)
      return
    }

    const nextNodeId = resolveScopedImageConvertNavigationNodeId({
      scopeNodeIds,
      selectedSidebarNodeId,
      selectedPackageId,
      sidebarNodeById,
      step,
    })
    if (!nextNodeId || nextNodeId === selectedSidebarNodeId) {
      return
    }

    const nextNode = sidebarNodeById.get(nextNodeId)
    setSelectedSidebarNodeId(nextNodeId)
    if (nextNode?.imageSourceId) {
      setSelectedPackageId(nextNode.imageSourceId)
    }
  }

  return useAppTopLayerState({
    appSettings,
    mediaRepository,
    repositoryMode,
    backendRead,
    backendWrite,
    playlistPersistence,
    runtimeCapabilities,
    autoPlayPresets: AUTO_PLAY_PRESETS,
    mode,
    manageMode,
    metadataManageMode,
    displayThumbnailScaleLevel,
    thumbnailScaleLevelCount,
    canThumbnailScaleDown,
    canThumbnailScaleUp,
    importMenuOpen,
    importTaskPanelOpen,
    helpOverlayOpen,
    themeParameterPanelOpen,
    setImportMenuOpen,
    setImportTaskPanelOpen,
    setThemeParameterPanelOpen,
    openImportFilesDialog: importState.openImportFilesDialog,
    openImportFoldersDialog: importState.openImportFoldersDialog,
    setSearchPanelMode: readNavigationState.setSearchPanelMode,
    setSearchPanelCollapsed: readNavigationState.setSearchPanelCollapsed,
    onToggleManageMode: toggleManageMode,
    onToggleMetadataManageMode: toggleMetadataManageMode,
    sidebarCollapsed,
    metadataCollapsed: appSettings.metadataCollapsed,
    layoutConvergedInsetPx,
    onToggleSidebarPanel: () => {
      if (sidebarCollapsed) {
        onExpandSidebar()
        return
      }
      collapseSidebar()
    },
    onToggleMetadataPanel: () => {
      appSettings.updateSettings({ metadataCollapsed: !appSettings.metadataCollapsed })
    },
    importTasks: importState.importTasks,
    dismissedImportTaskIds,
    setDismissedImportTaskIds,
    enqueuePending: importState.enqueuePending,
    archiveLoadStatus,
    normalizePathForCompare,
    retryImportTask: importState.retryImportTask,
    adReviewRunning: displayState.manageAdReview.hasRunningTask,
    adReviewDeleting: displayState.manageAdReview.deletePending,
    taskError: importState.taskError,
    clearTaskError: importState.clearTaskError,
    fullscreenActive,
    showFullscreenFooter,
    fullscreenDisplay,
    fullscreenEntryDisplay,
    fullscreenAlignRequest,
    fullscreenSwapped,
    fullscreenVideoFocus,
    fullscreenSplit,
    focusedImage,
    fullscreenImageSrc,
    focusedVideo: focusedVideoEffective,
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
    imageConvertPreviewMode,
    imageConvertPreviewScale,
    imageConvertPreviewLongestEdgePx,
    imageConvertPreviewAdjustProfile,
    imageConvertPreviewFormat,
    imageConvertPreviewQuality,
    imageConvertPreviewRenderedSrc,
    imageConvertPreviewError,
    onChangeImageConvertPreviewScale: (value) => {
      setImageConvertPreviewScale(Math.max(0.1, Math.min(1, Number(value.toFixed(1)))))
    },
    onChangeImageConvertPreviewFormat: (value) => {
      setImageConvertPreviewFormat(value)
    },
    onChangeImageConvertPreviewQuality: (value) => {
      setImageConvertPreviewQuality(Math.max(10, Math.min(100, Math.round(value))))
    },
    onConfirmImageConvertPreview: () => {
      setImageConvertScale(imageConvertPreviewScale)
      setImageConvertLongestEdgePx(imageConvertPreviewLongestEdgePx)
      setImageConvertAdjustProfile(imageConvertPreviewAdjustProfile)
      setImageConvertFormat(imageConvertPreviewFormat)
      setImageConvertQuality(imageConvertPreviewQuality)
      setImageConvertPreviewMode(false)
      setFullscreenActiveWithAutoStop(false)
    },
    onCancelImageConvertPreview: () => {
      setImageConvertPreviewScale(imageConvertScale)
      setImageConvertPreviewLongestEdgePx(imageConvertLongestEdgePx)
      setImageConvertPreviewAdjustProfile(imageConvertAdjustProfile)
      setImageConvertPreviewFormat(imageConvertFormat)
      setImageConvertPreviewQuality(imageConvertQuality)
      setImageConvertPreviewMode(false)
      setFullscreenActiveWithAutoStop(false)
    },
    onApplyImageConvertPreviewScaleToLongestEdge: (value) => {
      setImageConvertPreviewLongestEdgePx(value)
    },
    onChangeImageConvertPreviewAdjustProfile: (nextProfile) => {
      setImageConvertPreviewAdjustProfile(nextProfile)
    },
    bindFullscreenVideoElement,
    focusedVideoCoverImageSrc,
    focusedVideoDurationSec,
    focusedVideoCoverColor,
    videoTime,
    videoPlaying,
    videoRate,
    videoVolume,
    videoMuted,
    videoFitMode,
    videoLoopMode,
    setVideoPlaying,
    goPlaylist,
    playlistIds,
    videoQueueSource,
    rootScopedVideoIds: Array.from(rootScopedVideoIds),
    selectedVideoId,
    videoById: videoByIdEffective,
    selectVideoFromBrowser,
    setVideoTime,
    setVideoDurationById,
    setVideoMuted,
    setVideoVolume,
    setVideoRate,
    setVideoFitMode,
    cycleVideoLoopMode,
    cycleVideoFitMode,
    setSubtitleVisible,
    selectSubtitleById,
    setFullscreenActiveWithAutoStop,
    setShowFullscreenFooter,
    setFullscreenDisplay,
    setFullscreenSwapped,
    setFullscreenVideoFocus,
    setFullscreenSplit,
    moveImage,
    goPackage: goPackageForFullscreen,
    applySidebarRatio,
    applyMetadataRatio,
    adReviewDeleteOverlayDebugActive,
    onOpenAdReviewDeleteOverlayDebug,
    focusedVideoEffectiveId: focusedVideoEffective?.id ?? null,
  })
}
