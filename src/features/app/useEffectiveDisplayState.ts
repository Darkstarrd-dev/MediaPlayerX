import { useMemo } from 'react'

import type {
  ImageMetadataViewModel,
  ImagePageViewModel,
} from '../backend'
import type {
  AudioItem,
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
  selectedAudioId: string
  videosForSidebar: VideoItem[]
  audiosForSidebar: AudioItem[]
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
  focusedAudio: AudioItem | null
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
  selectedAudioId,
  videosForSidebar,
  audiosForSidebar,
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

  const pageSnapshotMatchesActivePackage =
    !effectivePageSnapshot ||
    effectivePageSnapshot.sourceId === null ||
    !activePackage ||
    effectivePageSnapshot.sourceId === activePackage.id

  const pageSnapshotForDisplay =
    !vectorResultsActive && effectivePageSnapshot && pageSnapshotMatchesActivePackage
      ? effectivePageSnapshot
      : null

  const normalizeRefs = (refs: FocusedImageRef[]): FocusedImageRef[] =>
    refs.filter((ref) => {
      const pkg = packageById.get(ref.packageId)
      return Boolean(pkg && ref.imageIndex >= 0 && ref.imageIndex < pkg.images.length)
    })

  const activePackageForDisplay =
    pageSnapshotForDisplay?.sourceId
      ? (packageById.get(pageSnapshotForDisplay.sourceId) ?? activePackage)
      : activePackage
  const refsInPageEffectiveRaw = pageSnapshotForDisplay?.refs ?? refsInPage
  const refsInPageEffective = normalizeRefs(refsInPageEffectiveRaw)
  const pageStartEffective =
    pageSnapshotForDisplay
      ? pageSnapshotForDisplay.pageIndex * Math.max(1, pagedPageSize)
      : pageStart
  const normalizedPageIndexEffective =
    pageSnapshotForDisplay ? pageSnapshotForDisplay.pageIndex : normalizedPageIndex
  const imageTotalPagesEffective =
    pageSnapshotForDisplay
      ? (showNamesOnly
          ? 1
          : Math.max(1, Math.ceil(pageSnapshotForDisplay.totalItems / Math.max(1, pagedPageSize))))
      : imageTotalPages
  const metadataImageEffective = (() => {
    if (!imageFocusActive || !metadataSnapshotMatchesFocus) {
      return focusedImage
    }

    const snapshotImage = effectiveMetadataSnapshot?.image ?? null
    if (!snapshotImage) {
      return focusedImage
    }

    if (!focusedImage || snapshotImage.id !== focusedImage.id) {
      return snapshotImage
    }

    // Keep stable fields (like size/dimensions) if metadata snapshot lacks them.
    const merged = {
      ...focusedImage,
      ...snapshotImage,
    }
    if (snapshotImage.width <= 0 && focusedImage.width > 0) {
      merged.width = focusedImage.width
    }
    if (snapshotImage.height <= 0 && focusedImage.height > 0) {
      merged.height = focusedImage.height
    }
    if (snapshotImage.sizeKb <= 0 && focusedImage.sizeKb > 0) {
      merged.sizeKb = focusedImage.sizeKb
    }
    return merged
  })()
  const metadataImagePackageEffective =
    imageFocusActive && metadataSnapshotMatchesFocus
      ? (effectiveMetadataSnapshot?.package ?? metadataImagePackage)
      : metadataImagePackage
  const currentGradeEffective =
    imageFocusActive && metadataSnapshotMatchesFocus
      ? (effectiveMetadataSnapshot?.grade ?? currentGrade)
      : currentGrade

  const scopedVideoById = useMemo(
    () => new Map(videosForSidebar.map((video) => [video.id, video])),
    [videosForSidebar],
  )
  const scopedAudioById = useMemo(
    () => new Map(audiosForSidebar.map((audio) => [audio.id, audio])),
    [audiosForSidebar],
  )

  const focusedVideo = scopedVideoById.get(selectedVideoId) ?? videosForSidebar[0] ?? null
  const focusedAudio = scopedAudioById.get(selectedAudioId) ?? audiosForSidebar[0] ?? null
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
    backendPageSnapshot: pageSnapshotForDisplay,
    activePackageForDisplay,
    refsInPageEffective,
    pageStartEffective,
    normalizedPageIndexEffective,
    imageTotalPagesEffective,
    metadataImageEffective,
    metadataImagePackageEffective,
    currentGradeEffective,
    focusedVideo,
    focusedAudio,
    focusedVideoDurationSec,
    focusedVideoCoverColor,
    focusedVideoCoverImageLocator,
    focusedVideoEffective,
  }
}

export type EffectiveDisplayStateResult = ReturnType<typeof useEffectiveDisplayState>
