import { useEffect, useState } from 'react'

import { useEffectiveDisplayState } from './useEffectiveDisplayState'
import { useMetadataWriteBindings } from './useMetadataWriteBindings'
import { buildCoverImageLocator } from './mediaPathUtils'
import { resolveAdReviewPageDerivations } from './workspaceAdReviewPageDerivations'
import { resolveAdReviewSidebarContext } from './workspaceAdReviewSidebarContext'
import { resolveRefsInPageForDisplay } from './workspaceImageDerivations'
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
import { useI18n } from '../../i18n/useI18n'
import { toErrorDetailWithCode } from './errorCode'

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
  const { t } = useI18n()
  const { showNamesOnly } = appSettings
  const isVideoMode = appSettings.mode === 'video'
  const syncMediaRepository = isSyncSubtitleRepository(mediaRepository) ? mediaRepository : null
  const isSynchronousSubtitleMode = import.meta.env.MODE === 'test' && Boolean(syncMediaRepository)
  const {
    imageFocusActive,
    manageMode,
    metadataManageMode,
    adReviewFocusTaskId,
    adReviewPageIndex,
    selectedSidebarNodeId,
    setManageOperationHint,
  } = sessionState

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
    audioByIdEffective,
    audiosForSidebar,
    videosForSidebar,
    selectedAudioId,
    focusedRef,
    focusedImage,
    activePackage,
    visibleImageRefs,
    refsInPage,
    pageStart,
    normalizedPageIndex,
    imageTotalPages,
    pagedPageSize,
    thumbnailColumns,
    metadataImagePackage,
    currentGrade,
    actualCellWidth,
    actualMediaHeight,
    orderedRootScopedImageRefs,
    imageTreeForSidebar,
    sidebarCheckedNodeIds,
    imageCheckedIdSet,
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
    focusedAudio,
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
    selectedAudioId,
    videosForSidebar,
    audiosForSidebar,
    videoDurationById,
    videoCoverById,
    videoCoverImageById,
  })

  const {
    adReviewFocusTask,
    adReviewResultsMode,
    selectedSidebarNode,
  } = resolveAdReviewSidebarContext({
    mode: appSettings.mode,
    adReviewFocusTaskId,
    queueTasks: manageBindings.manageAdReview.queueTasks,
    packageByIdEffective,
    sidebarNodeById,
    selectedSidebarNodeId,
    imageTreeForSidebar,
  })
  const adReviewGroupByPackageRows =
    adReviewResultsMode && Boolean(selectedSidebarNode && (selectedSidebarNode.kind === 'folder' || selectedSidebarNode.imageNodeType === 'folder'))

  const { refsInPageBase } = resolveAdReviewPageDerivations({
    adReviewResultsMode,
    orderedRootScopedImageRefs,
    packageByIdEffective,
    adReviewFocusTask,
    selectedSidebarNode,
    pagedPageSize,
    thumbnailColumns,
    adReviewGroupByPackageRows,
    adReviewPageIndex,
    normalizedPageIndexEffective,
    visibleImageRefs,
    refsInPageEffective,
    pageStartEffective,
    imageTotalPagesEffective,
  })

  const refsInPageForResolve = resolveRefsInPageForDisplay(refsInPageBase, {
    manageMode,
    hideUncheckedNonChecked: false,
    imageCheckedIdSet,
    packageByIdEffective,
  })

  const metadataWriteBindings = useMetadataWriteBindings({
    metadataManageMode,
    backendWrite: manageBindings.backendWrite,
    packageById: packageByIdEffective,
    videoById: videoByIdEffective,
    audioById: audioByIdEffective,
    metadataImagePackageId: metadataImagePackageEffective?.id ?? null,
    focusedVideoId: focusedVideoEffective?.id ?? null,
    focusedAudioId: focusedAudio?.id ?? null,
    sidebarCheckedNodeIds,
    sidebarNodeById,
    setManageOperationHint,
  })

  const {
    thumbnailImageUrlById,
    metadataImageSrc,
    fullscreenImageSrc,
    focusedVideoSrc,
    focusedAudioSrc,
    focusedVideoCoverImageSrc,
    sourceCoverImageUrlBySourceId,
  } = useResolvedMediaState({
    repository: mediaRepository,
    benchSettings,
    maxConcurrent: appSettings.thumbnailResolveConcurrency,
    actualCellWidth,
    actualMediaHeight,
    thumbnailQuality: appSettings.thumbnailQuality,
    thumbnailWidth: appSettings.thumbnailWidth,
    thumbnailGenerationConcurrency: appSettings.thumbnailGenerationConcurrency,
    packageById: packageByIdEffective,
    focusedImage,
    metadataImage: metadataImageEffective,
    focusedRef,
    orderedRootScopedImageRefs,
    fullscreenActive,
    showNamesOnly,
    refsInPage: refsInPageForResolve,
    focusedVideo,
    focusedAudio,
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
    const apiSync = syncMediaRepository?.listVideoSubtitlesSync
    const videoId = isVideoMode ? (focusedVideoEffective?.id ?? null) : null
    if (!isVideoMode || !videoId || (!api && !apiSync)) {
      setSubtitleOptions([])
      setSelectedSubtitleId(null)
      setSelectedSubtitleLocator(null)
      setSubtitleTrackUrl(null)
      setSubtitleVisible(false)
      setSubtitleLoading(false)
      setSubtitleMessage(null)
      return
    }

    if (isSynchronousSubtitleMode && apiSync) {
      const response = apiSync({ video_id: videoId })
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
        setSubtitleMessage(t('ui.media.subtitleNotFoundInDirectory'))
      }
      setSubtitleLoading(false)
      return
    }

    if (!api) {
      setSubtitleOptions([])
      setSelectedSubtitleId(null)
      setSelectedSubtitleLocator(null)
      setSubtitleTrackUrl(null)
      setSubtitleVisible(false)
      setSubtitleLoading(false)
      setSubtitleMessage(null)
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
          setSubtitleMessage(t('ui.media.subtitleNotFoundInDirectory'))
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }
        const message = toErrorDetailWithCode(error, t)
        setSubtitleOptions([])
        setSelectedSubtitleId(null)
        setSelectedSubtitleLocator(null)
        setSubtitleTrackUrl(null)
        setSubtitleVisible(false)
        setSubtitleMessage(t('ui.media.subtitleLoadFailed', { message }))
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
  }, [focusedVideoEffective?.id, isSynchronousSubtitleMode, isVideoMode, mediaRepository, syncMediaRepository, t])

  useEffect(() => {
    if (!isVideoMode || !focusedVideoEffective?.id || !selectedSubtitleLocator) {
      setSubtitleTrackUrl(null)
      return
    }

    if (isSynchronousSubtitleMode && syncMediaRepository) {
      const response = syncMediaRepository.resolveMediaResourceSync({
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
        setSubtitleMessage(t('ui.media.subtitleResolveFailed', { message: toErrorDetailWithCode(error, t) }))
      })

    return () => {
      active = false
    }
  }, [focusedVideoEffective?.id, isSynchronousSubtitleMode, isVideoMode, mediaRepository, selectedSubtitleLocator, syncMediaRepository])

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
          throw new Error(t('ui.media.subtitleConverterUnsupported'))
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
      setSubtitleMessage(t('ui.media.subtitleSelectFailed', { message: toErrorDetailWithCode(error, t) }))
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
    focusedAudio,
    focusedVideoDurationSec,
    focusedVideoCoverColor,
    focusedVideoCoverImageLocator,
    focusedVideoEffective,
    metadataWriteBindings,
    thumbnailImageUrlById,
    metadataImageSrc,
    fullscreenImageSrc,
    focusedVideoSrc,
    focusedAudioSrc,
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
