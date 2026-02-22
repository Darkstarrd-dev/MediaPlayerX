import { useEffect, useRef, useState } from 'react'

import {
  normalizePathForCompare,
} from './mediaPathUtils'
import { useAppTopLayerState } from './useAppTopLayerState'
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

interface UseAppTopLayerBindingsParams {
  runtimeSources: AppRuntimeSourcesResult
  readNavigationState: AppReadAndNavigationResult
  displayState: AppDisplayAndEffectsResult
}

export function useAppTopLayerBindings({
  runtimeSources,
  readNavigationState,
  displayState,
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
    imageConvertScale,
    setImageConvertScale,
    imageConvertLongestEdgePx,
    imageConvertFormat,
    setImageConvertFormat,
    imageConvertQuality,
    setImageConvertQuality,
    imageConvertPreviewMode,
    setImageConvertPreviewMode,
    imageConvertPreviewScale,
    setImageConvertPreviewScale,
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
    applySidebarRatio,
    applyMetadataRatio,
    videoByIdEffective,
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
            imageConvertLongestEdgePx,
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
    imageConvertLongestEdgePx,
    imageConvertPreviewMode,
    imageConvertPreviewQuality,
    imageConvertPreviewScale,
  ])

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
    imageConvertPreviewLongestEdgePx: imageConvertLongestEdgePx,
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
      setImageConvertFormat(imageConvertPreviewFormat)
      setImageConvertQuality(imageConvertPreviewQuality)
      setImageConvertPreviewMode(false)
      setFullscreenActiveWithAutoStop(false)
    },
    onCancelImageConvertPreview: () => {
      setImageConvertPreviewScale(imageConvertScale)
      setImageConvertPreviewFormat(imageConvertFormat)
      setImageConvertPreviewQuality(imageConvertQuality)
      setImageConvertPreviewMode(false)
      setFullscreenActiveWithAutoStop(false)
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
    goPackage,
    applySidebarRatio,
    applyMetadataRatio,
    focusedVideoEffectiveId: focusedVideoEffective?.id ?? null,
  })
}
