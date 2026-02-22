import { useMemo } from 'react'

import {
  type MediaResolveTarget,
  useResolvedMediaUrls,
} from '../backend'
import type { MediaRepository } from '../backend/repository'
import type { UiBenchSettings } from '../perf/benchSettings'
import type {
  AudioItem,
  FocusedImageRef,
  ImageItem,
  ImagePackage,
  MediaLocator,
  VideoItem,
} from '../../types'

// 导入忙碌期间：限制缩略图解析目标数量，减少对主进程的 IPC 压力
const IMPORT_BUSY_THUMBNAIL_LIMIT = 16
// 导入忙碌期间：降低最大并发数，避免与 snapshot 刷新争抢资源
const IMPORT_BUSY_MAX_CONCURRENT = 2

interface UseResolvedMediaStateParams {
  repository: MediaRepository
  benchSettings: UiBenchSettings
  maxConcurrent: number
  importBusy?: boolean
  actualCellWidth: number
  actualMediaHeight: number
  thumbnailQuality: number
  thumbnailWidth: number
  thumbnailGenerationConcurrency: number
  packageById: ReadonlyMap<string, ImagePackage>
  focusedImage: ImageItem | null
  metadataImage: ImageItem | null
  focusedRef: FocusedImageRef | null
  orderedRootScopedImageRefs: FocusedImageRef[]
  fullscreenActive: boolean
  showNamesOnly: boolean
  refsInPage: FocusedImageRef[]
  focusedVideo: VideoItem | null
  focusedAudio: AudioItem | null
  focusedVideoCoverImageLocator: MediaLocator | null
  sourceCoverLocators?: Array<{ sourceId: string; locator: MediaLocator }>
  nodeBrowseCoverThumbnailLocators?: Array<{ sourceId: string; imageId: string; locator: MediaLocator }>
}

interface UseResolvedMediaStateResult {
  thumbnailImageUrlById: Record<string, string>
  metadataImageSrc: string | null
  fullscreenImageSrc: string | null
  focusedVideoSrc: string | null
  focusedAudioSrc: string | null
  videoUrlById: Record<string, string>
  audioUrlById: Record<string, string>
  focusedVideoCoverImageSrc: string | null
  sourceCoverImageUrlBySourceId: Record<string, string>
}

export function useResolvedMediaState({
  repository,
  benchSettings,
  maxConcurrent,
  importBusy = false,
  actualCellWidth,
  actualMediaHeight,
  thumbnailQuality,
  thumbnailWidth,
  thumbnailGenerationConcurrency,
  packageById,
  focusedImage,
  metadataImage,
  focusedRef,
  orderedRootScopedImageRefs,
  fullscreenActive,
  showNamesOnly,
  refsInPage,
  focusedVideo,
  focusedAudio,
  focusedVideoCoverImageLocator,
  sourceCoverLocators = [],
  nodeBrowseCoverThumbnailLocators = [],
}: UseResolvedMediaStateParams): UseResolvedMediaStateResult {
  const mediaResolveTargets = useMemo<MediaResolveTarget[]>(() => {
    const targetById = new Map<string, MediaResolveTarget>()
    const priorityTargets: MediaResolveTarget[] = []
    const normalTargets: MediaResolveTarget[] = []
    const normalizedThumbnailWidth = Math.max(128, Math.round(thumbnailWidth))
    const thumbnailMaxEdge = Math.max(96, Math.ceil(Math.max(actualCellWidth, actualMediaHeight, normalizedThumbnailWidth)))

    const pushTarget = (target: MediaResolveTarget, priority = false) => {
      if (targetById.has(target.targetId)) {
        return
      }
      targetById.set(target.targetId, target)
      if (priority) {
        priorityTargets.push(target)
      } else {
        normalTargets.push(target)
      }
    }

    const pushThumbnailImageTarget = (ref: FocusedImageRef) => {
      const image = packageById.get(ref.packageId)?.images[ref.imageIndex]
      if (!image) {
        return
      }

      pushTarget({
        targetId: `image-thumb:${image.id}`,
        locator: image.mediaLocator,
        variant: 'thumbnail',
        thumbnailMaxEdge,
        thumbnailQuality,
        thumbnailGenerationConcurrency,
      })
    }

    const pushOriginalImageTarget = (image: ImageItem | null) => {
      if (!image) {
        return
      }

      pushTarget(
        {
          targetId: `image-original:${image.id}`,
          locator: image.mediaLocator,
          variant: 'original',
        },
        true,
      )
    }

    const pushOriginalImageTargetByRef = (ref: FocusedImageRef | null | undefined, priority = false) => {
      if (!ref) {
        return
      }
      const image = packageById.get(ref.packageId)?.images[ref.imageIndex]
      if (!image) {
        return
      }
      pushTarget(
        {
          targetId: `image-original:${image.id}`,
          locator: image.mediaLocator,
          variant: 'original',
        },
        priority,
      )
    }

    pushOriginalImageTarget(focusedImage)
    pushOriginalImageTarget(metadataImage)
    pushOriginalImageTargetByRef(refsInPage[0], true)

    if (focusedRef && orderedRootScopedImageRefs.length > 0) {
      const focusedIndex = orderedRootScopedImageRefs.findIndex(
        (ref) => ref.packageId === focusedRef.packageId && ref.imageIndex === focusedRef.imageIndex,
      )
      if (focusedIndex >= 0) {
        const prefetchRadius = fullscreenActive ? 4 : 2
        for (let offset = 1; offset <= prefetchRadius; offset += 1) {
          pushOriginalImageTargetByRef(orderedRootScopedImageRefs[focusedIndex + offset], true)
          pushOriginalImageTargetByRef(orderedRootScopedImageRefs[focusedIndex - offset], true)
        }
      }
    }

    if (!showNamesOnly) {
      // 导入忙碌期间仅解析首屏可视区内的缩略图，减少 IPC 竞争
      const effectiveRefsForThumbnails = importBusy ? refsInPage.slice(0, IMPORT_BUSY_THUMBNAIL_LIMIT) : refsInPage
      for (const ref of effectiveRefsForThumbnails) {
        pushThumbnailImageTarget(ref)
      }
    }

    if (focusedVideo) {
      pushTarget(
        {
          targetId: `video:${focusedVideo.id}`,
          locator: focusedVideo.mediaLocator,
          variant: 'original',
        },
        true,
      )

      if (focusedVideoCoverImageLocator) {
        pushTarget(
          {
            targetId: `video-cover:${focusedVideo.id}`,
            locator: focusedVideoCoverImageLocator,
            variant: 'original',
          },
          true,
        )
      }
    }

    if (focusedAudio) {
      pushTarget(
        {
          targetId: `audio:${focusedAudio.id}`,
          locator: focusedAudio.mediaLocator,
          variant: 'original',
        },
        true,
      )
    }

    for (const sourceCover of sourceCoverLocators) {
      pushTarget(
        {
          targetId: `source-cover:${sourceCover.sourceId}`,
          locator: sourceCover.locator,
          variant: 'original',
        },
        true,
      )
    }

    return [...priorityTargets, ...normalTargets]
  }, [
    actualCellWidth,
    actualMediaHeight,
    thumbnailQuality,
    thumbnailGenerationConcurrency,
    thumbnailWidth,
    focusedImage,
    focusedAudio,
    focusedVideo,
    focusedVideoCoverImageLocator,
    importBusy,
    metadataImage,
    focusedRef,
    fullscreenActive,
    orderedRootScopedImageRefs,
    packageById,
    refsInPage,
    showNamesOnly,
    sourceCoverLocators,
  ])

  const resolvedMedia = useResolvedMediaUrls({
    repository,
    targets: mediaResolveTargets,
    options: benchSettings.enabled
      ? benchSettings.resolvedMedia
      : {
          applyMode: 'raf',
          stateScope: 'active-only',
          maxConcurrent: importBusy ? Math.min(maxConcurrent, IMPORT_BUSY_MAX_CONCURRENT) : maxConcurrent,
        },
  })

  const nodeBrowseCoverThumbnailTargets = useMemo<MediaResolveTarget[]>(() => {
    if (benchSettings.enabled || nodeBrowseCoverThumbnailLocators.length === 0) {
      return []
    }

    const targetById = new Map<string, MediaResolveTarget>()
    const normalizedThumbnailWidth = Math.max(128, Math.round(thumbnailWidth))
    const thumbnailMaxEdge = Math.max(96, Math.ceil(Math.max(actualCellWidth, actualMediaHeight, normalizedThumbnailWidth)))

    for (const candidate of nodeBrowseCoverThumbnailLocators) {
      const targetId = `node-cover-thumb:${candidate.imageId}`
      if (targetById.has(targetId)) {
        continue
      }

      targetById.set(targetId, {
        targetId,
        locator: candidate.locator,
        variant: 'thumbnail',
        thumbnailMaxEdge,
        thumbnailQuality,
        thumbnailGenerationConcurrency,
      })
    }

    return [...targetById.values()]
  }, [
    actualCellWidth,
    actualMediaHeight,
    benchSettings.enabled,
    nodeBrowseCoverThumbnailLocators,
    thumbnailGenerationConcurrency,
    thumbnailQuality,
    thumbnailWidth,
  ])

  const nodeBrowseCoverWarmupMedia = useResolvedMediaUrls({
    repository,
    targets: nodeBrowseCoverThumbnailTargets,
    options: {
      applyMode: 'raf',
      stateScope: 'active-only',
      maxConcurrent: 1,
    },
  })

  const thumbnailImageUrlById = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {}

    const appendThumbnailTargetUrls = (urlByTargetId: Record<string, string>) => {
      for (const [targetId, url] of Object.entries(urlByTargetId)) {
        if (targetId.startsWith('image-thumb:')) {
          next[targetId.slice('image-thumb:'.length)] = url
          continue
        }

        if (targetId.startsWith('node-cover-thumb:')) {
          next[targetId.slice('node-cover-thumb:'.length)] = url
        }
      }
    }

    appendThumbnailTargetUrls(resolvedMedia.urlByTargetId)
    appendThumbnailTargetUrls(nodeBrowseCoverWarmupMedia.urlByTargetId)

    return next
  }, [nodeBrowseCoverWarmupMedia.urlByTargetId, resolvedMedia.urlByTargetId])

  const originalImageUrlById = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {}
    for (const [targetId, url] of Object.entries(resolvedMedia.urlByTargetId)) {
      if (!targetId.startsWith('image-original:')) {
        continue
      }
      next[targetId.slice('image-original:'.length)] = url
    }
    return next
  }, [resolvedMedia.urlByTargetId])

  const videoCoverImageUrlById = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {}
    for (const [targetId, url] of Object.entries(resolvedMedia.urlByTargetId)) {
      if (!targetId.startsWith('video-cover:')) {
        continue
      }
      next[targetId.slice('video-cover:'.length)] = url
    }
    return next
  }, [resolvedMedia.urlByTargetId])

  const sourceCoverImageUrlBySourceId = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {}
    for (const [targetId, url] of Object.entries(resolvedMedia.urlByTargetId)) {
      if (!targetId.startsWith('source-cover:')) {
        continue
      }
      next[targetId.slice('source-cover:'.length)] = url
    }
    return next
  }, [resolvedMedia.urlByTargetId])

  const metadataImageSrc = metadataImage
    ? (originalImageUrlById[metadataImage.id] ?? thumbnailImageUrlById[metadataImage.id] ?? null)
    : null
  const fullscreenImageSrc = focusedImage
    ? (originalImageUrlById[focusedImage.id] ?? thumbnailImageUrlById[focusedImage.id] ?? null)
    : null
  const focusedVideoSrc = focusedVideo ? (resolvedMedia.urlByTargetId[`video:${focusedVideo.id}`] ?? null) : null
  const focusedAudioSrc = focusedAudio ? (resolvedMedia.urlByTargetId[`audio:${focusedAudio.id}`] ?? null) : null
  const focusedVideoCoverImageSrc = focusedVideo ? (videoCoverImageUrlById[focusedVideo.id] ?? null) : null
  const videoUrlById = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {}
    for (const [targetId, url] of Object.entries(resolvedMedia.urlByTargetId)) {
      if (!targetId.startsWith('video:')) {
        continue
      }
      next[targetId.slice('video:'.length)] = url
    }
    return next
  }, [resolvedMedia.urlByTargetId])
  const audioUrlById = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {}
    for (const [targetId, url] of Object.entries(resolvedMedia.urlByTargetId)) {
      if (!targetId.startsWith('audio:')) {
        continue
      }
      next[targetId.slice('audio:'.length)] = url
    }
    return next
  }, [resolvedMedia.urlByTargetId])

  return {
    thumbnailImageUrlById,
    metadataImageSrc,
    fullscreenImageSrc,
    focusedVideoSrc,
    focusedAudioSrc,
    videoUrlById,
    audioUrlById,
    focusedVideoCoverImageSrc,
    sourceCoverImageUrlBySourceId,
  }
}
