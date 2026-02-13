import { useEffect, useState } from 'react'

import { useEffectiveDisplayState } from './useEffectiveDisplayState'
import { useMetadataWriteBindings } from './useMetadataWriteBindings'
import { buildCoverImageLocator } from './mediaPathUtils'
import { useResolvedMediaState } from './useResolvedMediaState'
import type { AppReadAndNavigationResult } from './useAppReadAndNavigation'
import type { AppSettingsStoreSnapshot } from './useAppSettingsStore'
import type { AppSessionStateResult } from './useAppSessionState'
import type { RepositoryBootstrapDataResult } from './useRepositoryBootstrapData'
import type { AppManageBindingsResult } from './useAppManageBindings'
import type { SynchronousMediaRepository } from '../backend/repository'
import type { MediaStateResult } from '../media/useMediaState'
import type { UiBenchSettings } from '../perf/benchSettings'
import type { MediaLocator } from '../../types'

function isSyncSubtitleRepository(repository: unknown): repository is SynchronousMediaRepository {
  if (!repository || typeof repository !== 'object') {
    return false
  }

  const candidate = repository as Partial<SynchronousMediaRepository>
  return (
    typeof candidate.listVideoSubtitlesSync === 'function' &&
    typeof candidate.resolveMediaResourceSync === 'function'
  )
}

function toLocatorDto(locator: MediaLocator) {
  if (locator.kind === 'filesystem') {
    return {
      kind: 'filesystem' as const,
      absolute_path: locator.absolutePath,
      extension: locator.extension,
      media_type: locator.mediaType,
      mime_type: locator.mimeType,
    }
  }

  return {
    kind: 'archive-entry' as const,
    archive_path: locator.archivePath,
    archive_format: locator.archiveFormat,
    entry_name: locator.entryName,
    extension: locator.extension,
    media_type: locator.mediaType,
    mime_type: locator.mimeType,
  }
}

const MEDIA_RESOLVE_MAX_CONCURRENT = 8

export interface VideoSubtitleOption {
  id: string
  label: string
  format: 'vtt' | 'srt' | 'ass' | 'ssa'
  locator: MediaLocator
}

interface UseAppDisplayResourcesParams {
  appSettings: AppSettingsStoreSnapshot
  benchSettings: UiBenchSettings
  mediaRepository: RepositoryBootstrapDataResult['mediaRepository']
  sessionState: AppSessionStateResult
  mediaState: MediaStateResult
  readNavigationState: AppReadAndNavigationResult
  manageBindings: AppManageBindingsResult
}

export function useAppDisplayResources({
  appSettings,
  benchSettings,
  mediaRepository,
  sessionState,
  mediaState,
  readNavigationState,
  manageBindings,
}: UseAppDisplayResourcesParams) {
  const { showNamesOnly } = appSettings
  const isVideoMode = appSettings.mode === 'video'
  const isSynchronousSubtitleMode = import.meta.env.MODE === 'test' && isSyncSubtitleRepository(mediaRepository)
  const { imageFocusActive, metadataManageMode, setManageOperationHint } = sessionState

  const {
    selectedVideoId,
    videoDurationById,
    videoCoverById,
    videoCoverImageById,
    fullscreenActive,
  } = mediaState

  const {
    backendRead,
    vectorResultsActive,
    packageByIdEffective,
    scopedImageSourcesEffective,
    videoByIdEffective,
    videosForSidebar,
    focusedRef,
    focusedImage,
    activePackage,
    refsInPage,
    visibleImageRefs,
    pageStart,
    normalizedPageIndex,
    imageTotalPages,
    pagedPageSize,
    metadataImagePackage,
    currentGrade,
    actualCellWidth,
    actualMediaHeight,
    orderedRootScopedImageRefs,
    sidebarCheckedNodeIds,
    sidebarNodeById,
  } = readNavigationState

  const {
    backendPageSnapshot,
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
  } = useEffectiveDisplayState({
    backendPageData: backendRead.page.data,
    backendPageSnapshot: backendRead.page.snapshot,
    backendMetadataData: backendRead.metadata.data,
    backendMetadataSnapshot: backendRead.metadata.snapshot,
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
    packageById: packageByIdEffective,
    metadataImagePackage,
    currentGrade,
    selectedVideoId,
    videosForSidebar,
    videoDurationById,
    videoCoverById,
    videoCoverImageById,
  })

  const metadataWriteBindings = useMetadataWriteBindings({
    metadataManageMode,
    backendWrite: manageBindings.backendWrite,
    packageById: packageByIdEffective,
    videoById: videoByIdEffective,
    metadataImagePackageId: metadataImagePackageEffective?.id ?? null,
    focusedVideoId: focusedVideoEffective?.id ?? null,
    sidebarCheckedNodeIds,
    sidebarNodeById,
    setManageOperationHint,
  })

  const {
    thumbnailImageUrlById,
    metadataImageSrc,
    fullscreenImageSrc,
    focusedVideoSrc,
    focusedVideoCoverImageSrc,
    sourceCoverImageUrlBySourceId,
  } = useResolvedMediaState({
    repository: mediaRepository,
    benchSettings,
    maxConcurrent: MEDIA_RESOLVE_MAX_CONCURRENT,
    actualCellWidth,
    actualMediaHeight,
    thumbnailQuality: appSettings.thumbnailQuality,
    packageById: packageByIdEffective,
    focusedImage,
    metadataImage: metadataImageEffective,
    focusedRef,
    orderedRootScopedImageRefs,
    fullscreenActive,
    showNamesOnly,
    visibleImageRefs,
    pageStart,
    pagedPageSize,
    refsInPage: refsInPageEffective,
    focusedVideo,
    focusedVideoCoverImageLocator,
    sourceCoverLocators: scopedImageSourcesEffective
      .map((source) => {
        const locator = buildCoverImageLocator(source.sourceCover?.coverImagePath ?? null)
        if (!locator) {
          return null
        }
        return {
          sourceId: source.id,
          locator,
        }
      })
      .filter((item): item is { sourceId: string; locator: NonNullable<ReturnType<typeof buildCoverImageLocator>> } => Boolean(item)),
  })

  const [subtitleVisible, setSubtitleVisible] = useState(false)
  const [subtitleOptions, setSubtitleOptions] = useState<VideoSubtitleOption[]>([])
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(null)
  const [selectedSubtitleLocator, setSelectedSubtitleLocator] = useState<MediaLocator | null>(null)
  const [subtitleTrackUrl, setSubtitleTrackUrl] = useState<string | null>(null)
  const [subtitleLoading, setSubtitleLoading] = useState(false)
  const [subtitleMessage, setSubtitleMessage] = useState<string | null>(null)

  useEffect(() => {
    const api = mediaRepository.listVideoSubtitles
    const videoId = isVideoMode ? (focusedVideoEffective?.id ?? null) : null
    if (!isVideoMode || !api || !videoId) {
      setSubtitleOptions([])
      setSelectedSubtitleId(null)
      setSelectedSubtitleLocator(null)
      setSubtitleTrackUrl(null)
      setSubtitleVisible(false)
      setSubtitleLoading(false)
      setSubtitleMessage(null)
      return
    }

    if (isSynchronousSubtitleMode) {
      const response = mediaRepository.listVideoSubtitlesSync({ video_id: videoId })
      const options = response.subtitles.map((item) => ({
        id: item.id,
        label: item.label,
        format: item.format,
        locator: {
          kind: item.locator.kind,
          ...(item.locator.kind === 'filesystem'
            ? {
                absolutePath: item.locator.absolute_path,
                extension: item.locator.extension,
                mediaType: item.locator.media_type,
                mimeType: item.locator.mime_type,
              }
            : {
                archivePath: item.locator.archive_path,
                archiveFormat: item.locator.archive_format,
                entryName: item.locator.entry_name,
                extension: item.locator.extension,
                mediaType: item.locator.media_type,
                mimeType: item.locator.mime_type,
              }),
        } as MediaLocator,
      }))
      setSubtitleOptions(options)
      if (options.length === 0) {
        setSubtitleVisible(false)
        setSubtitleMessage('未发现同目录字幕文件')
      }
      setSubtitleLoading(false)
      return
    }

    let active = true
    setSelectedSubtitleId(null)
    setSelectedSubtitleLocator(null)
    setSubtitleTrackUrl(null)
    setSubtitleVisible(false)
    setSubtitleLoading(true)
    setSubtitleMessage(null)

    void api({ video_id: videoId })
      .then((response) => {
        if (!active) {
          return
        }
        const options = response.subtitles.map((item) => ({
          id: item.id,
          label: item.label,
          format: item.format,
          locator: {
            kind: item.locator.kind,
            ...(item.locator.kind === 'filesystem'
              ? {
                  absolutePath: item.locator.absolute_path,
                  extension: item.locator.extension,
                  mediaType: item.locator.media_type,
                  mimeType: item.locator.mime_type,
                }
              : {
                  archivePath: item.locator.archive_path,
                  archiveFormat: item.locator.archive_format,
                  entryName: item.locator.entry_name,
                  extension: item.locator.extension,
                  mediaType: item.locator.media_type,
                  mimeType: item.locator.mime_type,
                }),
          } as MediaLocator,
        }))
        setSubtitleOptions(options)
        if (options.length === 0) {
          setSubtitleVisible(false)
          setSubtitleMessage('未发现同目录字幕文件')
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }
        const message = error instanceof Error ? error.message : String(error)
        setSubtitleOptions([])
        setSelectedSubtitleId(null)
        setSelectedSubtitleLocator(null)
        setSubtitleTrackUrl(null)
        setSubtitleVisible(false)
        setSubtitleMessage(message)
      })
      .finally(() => {
        if (!active) {
          return
        }
        setSubtitleLoading(false)
      })

    return () => {
      active = false
    }
  }, [focusedVideoEffective?.id, isSynchronousSubtitleMode, isVideoMode, mediaRepository])

  useEffect(() => {
    if (!isVideoMode || !focusedVideoEffective?.id || !selectedSubtitleLocator) {
      setSubtitleTrackUrl(null)
      return
    }

    if (isSynchronousSubtitleMode) {
      const response = mediaRepository.resolveMediaResourceSync({
        locator: toLocatorDto(selectedSubtitleLocator),
        preferred_variant: 'original',
      })
      setSubtitleTrackUrl(response.resource_url)
      return
    }

    let active = true
    void mediaRepository
      .resolveMediaResource({
        locator: toLocatorDto(selectedSubtitleLocator),
        preferred_variant: 'original',
      })
      .then((response) => {
        if (!active) {
          return
        }
        setSubtitleTrackUrl(response.resource_url)
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }
        setSubtitleTrackUrl(null)
        setSubtitleMessage(error instanceof Error ? error.message : String(error))
      })

    return () => {
      active = false
    }
  }, [focusedVideoEffective?.id, isSynchronousSubtitleMode, isVideoMode, mediaRepository, selectedSubtitleLocator])

  const selectSubtitleById = async (subtitleId: string) => {
    const option = subtitleOptions.find((item) => item.id === subtitleId)
    if (!option) {
      return
    }

    setSubtitleLoading(true)
    setSubtitleMessage(null)
    try {
      let locator = option.locator
      if (option.format !== 'vtt') {
        if (!mediaRepository.prepareSubtitleTrack) {
          throw new Error('后端未启用字幕转换能力')
        }
        const prepared = await mediaRepository.prepareSubtitleTrack({
          subtitle_id: option.id,
          format: option.format,
          locator: toLocatorDto(locator),
        })
        locator = prepared.locator.kind === 'filesystem'
          ? {
              kind: 'filesystem',
              absolutePath: prepared.locator.absolute_path,
              extension: prepared.locator.extension,
              mediaType: prepared.locator.media_type,
              mimeType: prepared.locator.mime_type,
            }
          : {
              kind: 'archive-entry',
              archivePath: prepared.locator.archive_path,
              archiveFormat: prepared.locator.archive_format,
              entryName: prepared.locator.entry_name,
              extension: prepared.locator.extension,
              mediaType: prepared.locator.media_type,
              mimeType: prepared.locator.mime_type,
            }
      }

      setSelectedSubtitleId(option.id)
      setSelectedSubtitleLocator(locator)
      setSubtitleVisible(true)
    } catch (error: unknown) {
      setSubtitleMessage(error instanceof Error ? error.message : String(error))
      setSubtitleVisible(false)
    } finally {
      setSubtitleLoading(false)
    }
  }

  return {
    backendPageSnapshot,
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
    metadataWriteBindings,
    thumbnailImageUrlById,
    metadataImageSrc,
    fullscreenImageSrc,
    focusedVideoSrc,
    focusedVideoCoverImageSrc,
    sourceCoverImageUrlBySourceId,
    subtitleVisible,
    subtitleOptions,
    selectedSubtitleId,
    subtitleTrackUrl,
    subtitleLoading,
    subtitleMessage,
    setSubtitleVisible,
    selectSubtitleById,
  }
}

export type AppDisplayResourcesResult = ReturnType<typeof useAppDisplayResources>
