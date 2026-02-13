import { useMemo } from 'react'

import {
  type MediaResolveTarget,
  useResolvedMediaUrls,
} from '../backend'
import type { MediaRepository } from '../backend/repository'
import type { UiBenchSettings } from '../perf/benchSettings'
import type {
  FocusedImageRef,
  ImageItem,
  ImagePackage,
  MediaLocator,
  VideoItem,
} from '../../types'

interface UseResolvedMediaStateParams {
  repository: MediaRepository
  benchSettings: UiBenchSettings
  maxConcurrent: number
  actualCellWidth: number
  actualMediaHeight: number
  thumbnailQuality: number
  thumbnailWidth: number
  packageById: ReadonlyMap<string, ImagePackage>
  focusedImage: ImageItem | null
  metadataImage: ImageItem | null
  focusedRef: FocusedImageRef | null
  orderedRootScopedImageRefs: FocusedImageRef[]
  fullscreenActive: boolean
  showNamesOnly: boolean
  refsInPage: FocusedImageRef[]
  focusedVideo: VideoItem | null
  focusedVideoCoverImageLocator: MediaLocator | null
  sourceCoverLocators?: Array<{ sourceId: string; locator: MediaLocator }>
}

interface UseResolvedMediaStateResult {
  thumbnailImageUrlById: Record<string, string>
  metadataImageSrc: string | null
  fullscreenImageSrc: string | null
  focusedVideoSrc: string | null
  focusedVideoCoverImageSrc: string | null
  sourceCoverImageUrlBySourceId: Record<string, string>
}

export function useResolvedMediaState({
  repository,
  benchSettings,
  maxConcurrent,
  actualCellWidth,
  actualMediaHeight,
  thumbnailQuality,
  thumbnailWidth,
  packageById,
  focusedImage,
  metadataImage,
  focusedRef,
  orderedRootScopedImageRefs,
  fullscreenActive,
  showNamesOnly,
  refsInPage,
  focusedVideo,
  focusedVideoCoverImageLocator,
  sourceCoverLocators = [],
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
      for (const ref of refsInPage) {
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
    thumbnailWidth,
    focusedImage,
    focusedVideo,
    focusedVideoCoverImageLocator,
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
          maxConcurrent,
        },
  })

  const thumbnailImageUrlById = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {}
    for (const [targetId, url] of Object.entries(resolvedMedia.urlByTargetId)) {
      if (!targetId.startsWith('image-thumb:')) {
        continue
      }
      next[targetId.slice('image-thumb:'.length)] = url
    }
    return next
  }, [resolvedMedia.urlByTargetId])

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
  const focusedVideoCoverImageSrc = focusedVideo ? (videoCoverImageUrlById[focusedVideo.id] ?? null) : null

  return {
    thumbnailImageUrlById,
    metadataImageSrc,
    fullscreenImageSrc,
    focusedVideoSrc,
    focusedVideoCoverImageSrc,
    sourceCoverImageUrlBySourceId,
  }
}
