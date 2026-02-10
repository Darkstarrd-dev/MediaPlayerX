import { useMemo } from 'react'

import type {
  ImageMetadataViewModel,
  ImagePageViewModel,
} from '../backend'
import type {
  FocusedImageRef,
  ImageItem,
  ImagePackage,
  MediaLocator,
  VideoItem,
} from '../../types'
import { buildCoverImageLocator } from './mediaPathUtils'

interface UseEffectiveDisplayStateParams {
  backendPageData: ImagePageViewModel | null
  backendPageSnapshot: ImagePageViewModel | null
  backendMetadataData: ImageMetadataViewModel | null
  backendMetadataSnapshot: ImageMetadataViewModel | null
  vectorResultsActive: boolean
  imageFocusActive: boolean
  focusedRef: FocusedImageRef | null
  focusedImage: ImageItem | null
  activePackage: ImagePackage | null
  refsInPage: FocusedImageRef[]
  pageStart: number
  normalizedPageIndex: number
  imageTotalPages: number
  pagedPageSize: number
  showNamesOnly: boolean
  packageById: ReadonlyMap<string, ImagePackage>
  metadataImagePackage: ImagePackage | null
  currentGrade: number | null
  selectedVideoId: string
  videoById: ReadonlyMap<string, VideoItem>
  videosForSidebar: VideoItem[]
  videoDurationById: Record<string, number>
  videoCoverById: Record<string, string>
  videoCoverImageById: Record<string, string | null>
}

interface UseEffectiveDisplayStateResult {
  backendPageSnapshot: ImagePageViewModel | null
  activePackageForDisplay: ImagePackage | null
  refsInPageEffective: FocusedImageRef[]
  pageStartEffective: number
  normalizedPageIndexEffective: number
  imageTotalPagesEffective: number
  metadataImageEffective: ImageItem | null
  metadataImagePackageEffective: ImagePackage | null
  currentGradeEffective: number | null
  focusedVideo: VideoItem | null
  focusedVideoDurationSec: number
  focusedVideoCoverColor: string
  focusedVideoCoverImageLocator: MediaLocator | null
  focusedVideoEffective: VideoItem | null
}

export function useEffectiveDisplayState({
  backendPageData,
  backendPageSnapshot,
  backendMetadataData,
  backendMetadataSnapshot,
  vectorResultsActive,
  imageFocusActive,
  focusedRef,
  focusedImage,
  activePackage,
  refsInPage,
  pageStart,
  normalizedPageIndex,
  imageTotalPages,
  pagedPageSize,
  showNamesOnly,
  packageById,
  metadataImagePackage,
  currentGrade,
  selectedVideoId,
  videoById,
  videosForSidebar,
  videoDurationById,
  videoCoverById,
  videoCoverImageById,
}: UseEffectiveDisplayStateParams): UseEffectiveDisplayStateResult {
  const effectivePageSnapshot = backendPageData ?? backendPageSnapshot
  const effectiveMetadataSnapshot = backendMetadataData ?? backendMetadataSnapshot
  const metadataSnapshotMatchesFocus = Boolean(
    imageFocusActive &&
      focusedRef &&
      effectiveMetadataSnapshot &&
      effectiveMetadataSnapshot.package.id === focusedRef.packageId &&
      effectiveMetadataSnapshot.image.id === focusedImage?.id,
  )

  const activePackageForDisplay =
    !vectorResultsActive && effectivePageSnapshot?.sourceId
      ? (packageById.get(effectivePageSnapshot.sourceId) ?? activePackage)
      : activePackage
  const refsInPageEffective = !vectorResultsActive && effectivePageSnapshot ? effectivePageSnapshot.refs : refsInPage
  const pageStartEffective =
    !vectorResultsActive && effectivePageSnapshot
      ? effectivePageSnapshot.pageIndex * Math.max(1, pagedPageSize)
      : pageStart
  const normalizedPageIndexEffective =
    !vectorResultsActive && effectivePageSnapshot ? effectivePageSnapshot.pageIndex : normalizedPageIndex
  const imageTotalPagesEffective =
    !vectorResultsActive && effectivePageSnapshot
      ? (showNamesOnly
          ? 1
          : Math.max(1, Math.ceil(effectivePageSnapshot.totalItems / Math.max(1, pagedPageSize))))
      : imageTotalPages
  const metadataImageEffective =
    imageFocusActive && metadataSnapshotMatchesFocus
      ? (effectiveMetadataSnapshot?.image ?? focusedImage)
      : focusedImage
  const metadataImagePackageEffective =
    imageFocusActive && metadataSnapshotMatchesFocus
      ? (effectiveMetadataSnapshot?.package ?? metadataImagePackage)
      : metadataImagePackage
  const currentGradeEffective =
    imageFocusActive && metadataSnapshotMatchesFocus
      ? (effectiveMetadataSnapshot?.grade ?? currentGrade)
      : currentGrade

  const focusedVideo = videoById.get(selectedVideoId) ?? videosForSidebar[0] ?? null
  const focusedVideoDurationSec = focusedVideo
    ? Math.max(0, videoDurationById[focusedVideo.id] ?? focusedVideo.durationSec)
    : 0
  const focusedVideoCoverColor = focusedVideo
    ? (videoCoverById[focusedVideo.id] ?? focusedVideo.coverColor ?? '#3f4b58')
    : '#3f4b58'
  const focusedVideoCoverImagePath = focusedVideo
    ? (videoCoverImageById[focusedVideo.id] ?? focusedVideo.coverImagePath ?? null)
    : null
  const focusedVideoCoverImageLocator = useMemo(
    () => buildCoverImageLocator(focusedVideoCoverImagePath),
    [focusedVideoCoverImagePath],
  )
  const focusedVideoEffective = useMemo(
    () =>
      focusedVideo
        ? {
            ...focusedVideo,
            durationSec: focusedVideoDurationSec,
            coverColor: focusedVideoCoverColor,
            coverImagePath: focusedVideoCoverImagePath,
          }
        : null,
    [focusedVideo, focusedVideoCoverColor, focusedVideoCoverImagePath, focusedVideoDurationSec],
  )

  return {
    backendPageSnapshot: effectivePageSnapshot,
    activePackageForDisplay,
    refsInPageEffective,
    pageStartEffective,
    normalizedPageIndexEffective,
    imageTotalPagesEffective,
    metadataImageEffective,
    metadataImagePackageEffective,
    currentGradeEffective,
    focusedVideo,
    focusedVideoDurationSec,
    focusedVideoCoverColor,
    focusedVideoCoverImageLocator,
    focusedVideoEffective,
  }
}

export type EffectiveDisplayStateResult = ReturnType<typeof useEffectiveDisplayState>
