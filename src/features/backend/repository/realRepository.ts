import {
  clearDatabaseResponseSchema,
  enqueueImportTaskResponseSchema,
  librarySnapshotDtoSchema,
  mediaAccessAuditResponseSchema,
  pickImportPathsResponseSchema,
  pickFilePathResponseSchema,
  pickDirectoryPathResponseSchema,
  readClipboardImportPathsResponseSchema,
  readArchiveLoadStatusResponseSchema,
  readRuntimeCapabilitiesResponseSchema,
  readImportTasksResponseSchema,
  readPlaylistResponseSchema,
  readImageMetadataResponseSchema,
  readImagePageResponseSchema,
  readImageSidebarTreeResponseSchema,
  resolveMediaResourceResponseSchema,
  retryImportTaskResponseSchema,
  saveVideoCoverResponseSchema,
  writePlaylistResponseSchema,
  writePackageMetadataResponseSchema,
  writePackageExternalMetadataResponseSchema,
  searchExternalMetadataResponseSchema,
  writeVideoMetadataResponseSchema,
  writePackageGradeResponseSchema,
  setImageHiddenResponseSchema,
  deleteImageItemsResponseSchema,
  deleteSidebarNodesResponseSchema,
  startManageAdReviewResponseSchema,
  readManageAdReviewTaskResponseSchema,
  pauseManageAdReviewTaskResponseSchema,
  testAdReviewVisionModelResponseSchema,
  confirmManageAdReviewDeleteResponseSchema,
  readAppStateResponseSchema,
  writeAppStateResponseSchema,
  type EnqueueImportTaskRequestDto,
  type EnqueueImportTaskResponseDto,
  type ClearDatabaseResponseDto,
  type PickImportPathsRequestDto,
  type PickImportPathsResponseDto,
  type PickFilePathRequestDto,
  type PickFilePathResponseDto,
  type PickDirectoryPathRequestDto,
  type PickDirectoryPathResponseDto,
  type ReadClipboardImportPathsResponseDto,
  type ReadArchiveLoadStatusResponseDto,
  type ReadRuntimeCapabilitiesResponseDto,
  type MediaAccessAuditResponseDto,
  type LibrarySnapshotDto,
  type ReadImportTasksResponseDto,
  type ReadImageMetadataRequestDto,
  type ReadImageMetadataResponseDto,
  type ReadPlaylistResponseDto,
  type ReadImagePageRequestDto,
  type ReadImagePageResponseDto,
  type ReadImageSidebarTreeRequestDto,
  type ReadImageSidebarTreeResponseDto,
  type ResolveMediaResourceRequestDto,
  type ResolveMediaResourceResponseDto,
  type RetryImportTaskRequestDto,
  type RetryImportTaskResponseDto,
  type SaveVideoCoverRequestDto,
  type SaveVideoCoverResponseDto,
  type WritePlaylistRequestDto,
  type WritePlaylistResponseDto,
  type WritePackageMetadataRequestDto,
  type WritePackageMetadataResponseDto,
  type WritePackageExternalMetadataRequestDto,
  type WritePackageExternalMetadataResponseDto,
  type SearchExternalMetadataRequestDto,
  type SearchExternalMetadataResponseDto,
  type WriteVideoMetadataRequestDto,
  type WriteVideoMetadataResponseDto,
  type SetImageHiddenRequestDto,
  type SetImageHiddenResponseDto,
  type DeleteImageItemsRequestDto,
  type DeleteImageItemsResponseDto,
  type DeleteSidebarNodesRequestDto,
  type DeleteSidebarNodesResponseDto,
  type StartManageAdReviewRequestDto,
  type StartManageAdReviewResponseDto,
  type ReadManageAdReviewTaskRequestDto,
  type ReadManageAdReviewTaskResponseDto,
  type PauseManageAdReviewTaskRequestDto,
  type PauseManageAdReviewTaskResponseDto,
  type TestAdReviewVisionModelRequestDto,
  type TestAdReviewVisionModelResponseDto,
  type ConfirmManageAdReviewDeleteRequestDto,
  type ConfirmManageAdReviewDeleteResponseDto,
  type WritePackageGradeRequestDto,
  type WritePackageGradeResponseDto,
  type ReadAppStateRequestDto,
  type ReadAppStateResponseDto,
  type WriteAppStateRequestDto,
  type WriteAppStateResponseDto,
} from '../../../contracts/backend'
import type { MediaRepository, RepositoryRequestOptions } from './types'
import { benchRecordIpcTiming } from '../../perf/benchRecorder'

function createAbortError(): Error {
  const error = new Error('请求已取消')
  error.name = 'AbortError'
  return error
}

function createTimeoutError(timeoutMs: number): Error {
  const error = new Error(`后端请求超时（>${timeoutMs}ms）`)
  error.name = 'TimeoutError'
  return error
}

async function withAbort<T>(
  task: Promise<T>,
  options?: RepositoryRequestOptions,
): Promise<T> {
  const timeoutMs = options?.timeoutMs

  if (!options?.signal && (!timeoutMs || timeoutMs <= 0)) {
    return task
  }

  const signal = options?.signal
  if (signal?.aborted) {
    throw createAbortError()
  }

  return new Promise<T>((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const clearGuards = () => {
      if (signal) {
        signal.removeEventListener('abort', onAbort)
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }
    }

    const onAbort = () => {
      clearGuards()
      reject(createAbortError())
    }

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true })
    }
    if (timeoutMs && timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        clearGuards()
        reject(createTimeoutError(timeoutMs))
      }, timeoutMs)
    }

    task
      .then((value) => {
        clearGuards()
        resolve(value)
      })
      .catch((error: unknown) => {
        clearGuards()
        reject(error)
      })
  })
}

export class RealMediaRepository implements MediaRepository {
  getInitialLibrarySnapshot(): LibrarySnapshotDto | null {
    return null
  }

  onLibraryChanged(listener: (payload: { reason: string; updated_at_ms: number }) => void): () => void {
    const api = window.mediaPlayerBackend
    if (!api?.onLibraryChanged) {
      return () => undefined
    }

    return api.onLibraryChanged(listener)
  }

  async readLibrarySnapshot(options?: RepositoryRequestOptions): Promise<LibrarySnapshotDto> {
    const api = window.mediaPlayerBackend
    if (!api) {
      throw new Error('真实后端通道不可用：window.mediaPlayerBackend 未注入')
    }

    const startedAt = performance.now()
    try {
      const response = await withAbort(api.readLibrarySnapshot(), options)
      benchRecordIpcTiming('readLibrarySnapshot', performance.now() - startedAt, true)
      return librarySnapshotDtoSchema.parse(response)
    } catch (error: unknown) {
      benchRecordIpcTiming(
        'readLibrarySnapshot',
        performance.now() - startedAt,
        false,
        error instanceof Error ? error.message : String(error),
      )
      throw error
    }
  }

  async readImageSidebarTree(
    request: ReadImageSidebarTreeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadImageSidebarTreeResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api) {
      throw new Error('真实后端通道不可用：window.mediaPlayerBackend 未注入')
    }

    const startedAt = performance.now()
    try {
      const response = await withAbort(api.readImageSidebarTree(request), options)
      benchRecordIpcTiming('readImageSidebarTree', performance.now() - startedAt, true)
      return readImageSidebarTreeResponseSchema.parse(response)
    } catch (error: unknown) {
      benchRecordIpcTiming(
        'readImageSidebarTree',
        performance.now() - startedAt,
        false,
        error instanceof Error ? error.message : String(error),
      )
      throw error
    }
  }

  async readImagePage(
    request: ReadImagePageRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadImagePageResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api) {
      throw new Error('真实后端通道不可用：window.mediaPlayerBackend 未注入')
    }

    const startedAt = performance.now()
    try {
      const response = await withAbort(api.readImagePage(request), options)
      benchRecordIpcTiming('readImagePage', performance.now() - startedAt, true)
      return readImagePageResponseSchema.parse(response)
    } catch (error: unknown) {
      benchRecordIpcTiming('readImagePage', performance.now() - startedAt, false, error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  async readImageMetadata(
    request: ReadImageMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadImageMetadataResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api) {
      throw new Error('真实后端通道不可用：window.mediaPlayerBackend 未注入')
    }

    const startedAt = performance.now()
    try {
      const response = await withAbort(api.readImageMetadata(request), options)
      benchRecordIpcTiming('readImageMetadata', performance.now() - startedAt, true)
      return readImageMetadataResponseSchema.parse(response)
    } catch (error: unknown) {
      benchRecordIpcTiming(
        'readImageMetadata',
        performance.now() - startedAt,
        false,
        error instanceof Error ? error.message : String(error),
      )
      throw error
    }
  }

  async resolveMediaResource(
    request: ResolveMediaResourceRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ResolveMediaResourceResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api) {
      throw new Error('真实后端通道不可用：window.mediaPlayerBackend 未注入')
    }

    const startedAt = performance.now()
    try {
      const response = await withAbort(api.resolveMediaResource(request), options)
      benchRecordIpcTiming('resolveMediaResource', performance.now() - startedAt, true)
      return resolveMediaResourceResponseSchema.parse(response)
    } catch (error: unknown) {
      benchRecordIpcTiming(
        'resolveMediaResource',
        performance.now() - startedAt,
        false,
        error instanceof Error ? error.message : String(error),
      )
      throw error
    }
  }

  async writePackageGrade(
    request: WritePackageGradeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePackageGradeResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api) {
      throw new Error('真实后端通道不可用：window.mediaPlayerBackend 未注入')
    }

    const response = await withAbort(api.writePackageGrade(request), options)
    return writePackageGradeResponseSchema.parse(response)
  }

  async setImageHidden(
    request: SetImageHiddenRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SetImageHiddenResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api?.setImageHidden) {
      throw new Error('真实后端通道不可用：setImageHidden 未注入')
    }

    const response = await withAbort(api.setImageHidden(request), options)
    return setImageHiddenResponseSchema.parse(response)
  }

  async deleteImageItems(
    request: DeleteImageItemsRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<DeleteImageItemsResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api?.deleteImageItems) {
      throw new Error('真实后端通道不可用：deleteImageItems 未注入')
    }

    const response = await withAbort(api.deleteImageItems(request), options)
    return deleteImageItemsResponseSchema.parse(response)
  }

  async deleteSidebarNodes(
    request: DeleteSidebarNodesRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<DeleteSidebarNodesResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api?.deleteSidebarNodes) {
      throw new Error('真实后端通道不可用：deleteSidebarNodes 未注入')
    }

    const response = await withAbort(api.deleteSidebarNodes(request), options)
    return deleteSidebarNodesResponseSchema.parse(response)
  }

  async startManageAdReview(
    request: StartManageAdReviewRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StartManageAdReviewResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api?.startManageAdReview) {
      throw new Error('真实后端通道不可用：startManageAdReview 未注入')
    }

    const response = await withAbort(api.startManageAdReview(request), options)
    return startManageAdReviewResponseSchema.parse(response)
  }

  async readManageAdReviewTask(
    request: ReadManageAdReviewTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadManageAdReviewTaskResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api?.readManageAdReviewTask) {
      throw new Error('真实后端通道不可用：readManageAdReviewTask 未注入')
    }

    const response = await withAbort(api.readManageAdReviewTask(request), options)
    return readManageAdReviewTaskResponseSchema.parse(response)
  }

  async pauseManageAdReviewTask(
    request: PauseManageAdReviewTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PauseManageAdReviewTaskResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api?.pauseManageAdReviewTask) {
      throw new Error('真实后端通道不可用：pauseManageAdReviewTask 未注入')
    }

    const response = await withAbort(api.pauseManageAdReviewTask(request), options)
    return pauseManageAdReviewTaskResponseSchema.parse(response)
  }

  async testAdReviewVisionModel(
    request: TestAdReviewVisionModelRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<TestAdReviewVisionModelResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api?.testAdReviewVisionModel) {
      throw new Error('真实后端通道不可用：testAdReviewVisionModel 未注入')
    }

    const response = await withAbort(api.testAdReviewVisionModel(request), options)
    return testAdReviewVisionModelResponseSchema.parse(response)
  }

  async confirmManageAdReviewDelete(
    request: ConfirmManageAdReviewDeleteRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ConfirmManageAdReviewDeleteResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api?.confirmManageAdReviewDelete) {
      throw new Error('真实后端通道不可用：confirmManageAdReviewDelete 未注入')
    }

    const response = await withAbort(api.confirmManageAdReviewDelete(request), options)
    return confirmManageAdReviewDeleteResponseSchema.parse(response)
  }

  async writePackageMetadata(
    request: WritePackageMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePackageMetadataResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api?.writePackageMetadata) {
      throw new Error('真实后端通道不可用：writePackageMetadata 未注入')
    }

    const response = await withAbort(api.writePackageMetadata(request), options)
    return writePackageMetadataResponseSchema.parse(response)
  }

  async writePackageExternalMetadata(
    request: WritePackageExternalMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePackageExternalMetadataResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api?.writePackageExternalMetadata) {
      throw new Error('真实后端通道不可用：writePackageExternalMetadata 未注入')
    }

    const response = await withAbort(api.writePackageExternalMetadata(request), options)
    return writePackageExternalMetadataResponseSchema.parse(response)
  }

  async searchExternalMetadata(
    request: SearchExternalMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SearchExternalMetadataResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api?.searchExternalMetadata) {
      throw new Error('真实后端通道不可用：searchExternalMetadata 未注入')
    }

    const response = await withAbort(api.searchExternalMetadata(request), options)
    return searchExternalMetadataResponseSchema.parse(response)
  }

  async writeVideoMetadata(
    request: WriteVideoMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WriteVideoMetadataResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api?.writeVideoMetadata) {
      throw new Error('真实后端通道不可用：writeVideoMetadata 未注入')
    }

    const response = await withAbort(api.writeVideoMetadata(request), options)
    return writeVideoMetadataResponseSchema.parse(response)
  }

  async saveVideoCover(
    request: SaveVideoCoverRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SaveVideoCoverResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api) {
      throw new Error('真实后端通道不可用：window.mediaPlayerBackend 未注入')
    }

    const response = await withAbort(api.saveVideoCover(request), options)
    return saveVideoCoverResponseSchema.parse(response)
  }

  async readPlaylist(options?: RepositoryRequestOptions): Promise<ReadPlaylistResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api) {
      throw new Error('真实后端通道不可用：window.mediaPlayerBackend 未注入')
    }

    const response = await withAbort(api.readPlaylist(), options)
    return readPlaylistResponseSchema.parse(response)
  }

  async writePlaylist(
    request: WritePlaylistRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePlaylistResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api) {
      throw new Error('真实后端通道不可用：window.mediaPlayerBackend 未注入')
    }

    const response = await withAbort(api.writePlaylist(request), options)
    return writePlaylistResponseSchema.parse(response)
  }

  async pickImportPaths(
    request: PickImportPathsRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PickImportPathsResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api) {
      throw new Error('真实后端通道不可用：window.mediaPlayerBackend 未注入')
    }

    const response = await withAbort(api.pickImportPaths(request), options)
    return pickImportPathsResponseSchema.parse(response)
  }

  async pickFilePath(
    request: PickFilePathRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PickFilePathResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api?.pickFilePath) {
      throw new Error('真实后端通道不可用：pickFilePath 未注入')
    }

    const response = await withAbort(api.pickFilePath(request), options)
    return pickFilePathResponseSchema.parse(response)
  }

  async pickDirectoryPath(
    request: PickDirectoryPathRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PickDirectoryPathResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api?.pickDirectoryPath) {
      throw new Error('真实后端通道不可用：pickDirectoryPath 未注入')
    }

    const response = await withAbort(api.pickDirectoryPath(request), options)
    return pickDirectoryPathResponseSchema.parse(response)
  }

  async readClipboardImportPaths(options?: RepositoryRequestOptions): Promise<ReadClipboardImportPathsResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api) {
      throw new Error('真实后端通道不可用：window.mediaPlayerBackend 未注入')
    }

    const response = await withAbort(api.readClipboardImportPaths(), options)
    return readClipboardImportPathsResponseSchema.parse(response)
  }

  async enqueueImportTask(
    request: EnqueueImportTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<EnqueueImportTaskResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api) {
      throw new Error('真实后端通道不可用：window.mediaPlayerBackend 未注入')
    }

    const startedAt = performance.now()
    try {
      const response = await withAbort(api.enqueueImportTask(request), options)
      benchRecordIpcTiming('enqueueImportTask', performance.now() - startedAt, true)
      return enqueueImportTaskResponseSchema.parse(response)
    } catch (error: unknown) {
      benchRecordIpcTiming(
        'enqueueImportTask',
        performance.now() - startedAt,
        false,
        error instanceof Error ? error.message : String(error),
      )
      throw error
    }
  }

  async readImportTasks(options?: RepositoryRequestOptions): Promise<ReadImportTasksResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api) {
      throw new Error('真实后端通道不可用：window.mediaPlayerBackend 未注入')
    }

    const startedAt = performance.now()
    try {
      const response = await withAbort(api.readImportTasks(), options)
      benchRecordIpcTiming('readImportTasks', performance.now() - startedAt, true)
      return readImportTasksResponseSchema.parse(response)
    } catch (error: unknown) {
      benchRecordIpcTiming('readImportTasks', performance.now() - startedAt, false, error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  async retryImportTask(
    request: RetryImportTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<RetryImportTaskResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api) {
      throw new Error('真实后端通道不可用：window.mediaPlayerBackend 未注入')
    }

    const response = await withAbort(api.retryImportTask(request), options)
    return retryImportTaskResponseSchema.parse(response)
  }

  async readMediaAccessAudit(options?: RepositoryRequestOptions): Promise<MediaAccessAuditResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api) {
      throw new Error('真实后端通道不可用：window.mediaPlayerBackend 未注入')
    }

    const response = await withAbort(api.readMediaAccessAudit(), options)
    return mediaAccessAuditResponseSchema.parse(response)
  }

  async readRuntimeCapabilities(options?: RepositoryRequestOptions): Promise<ReadRuntimeCapabilitiesResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api) {
      throw new Error('真实后端通道不可用：window.mediaPlayerBackend 未注入')
    }

    const response = await withAbort(api.readRuntimeCapabilities(), options)
    return readRuntimeCapabilitiesResponseSchema.parse(response)
  }

  async readArchiveLoadStatus(options?: RepositoryRequestOptions): Promise<ReadArchiveLoadStatusResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api || !api.readArchiveLoadStatus) {
      throw new Error('真实后端通道不可用：readArchiveLoadStatus 未注入')
    }

    const response = await withAbort(api.readArchiveLoadStatus(), options)
    return readArchiveLoadStatusResponseSchema.parse(response)
  }

  async readAppState(
    request: ReadAppStateRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadAppStateResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api || !api.readAppState) {
      throw new Error('真实后端通道不可用：readAppState 未注入')
    }

    const response = await withAbort(api.readAppState(request), options)
    return readAppStateResponseSchema.parse(response)
  }

  async writeAppState(
    request: WriteAppStateRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WriteAppStateResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api || !api.writeAppState) {
      throw new Error('真实后端通道不可用：writeAppState 未注入')
    }

    const response = await withAbort(api.writeAppState(request), options)
    return writeAppStateResponseSchema.parse(response)
  }

  async clearDatabase(options?: RepositoryRequestOptions): Promise<ClearDatabaseResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api) {
      throw new Error('真实后端通道不可用：window.mediaPlayerBackend 未注入')
    }

    const response = await withAbort(api.clearDatabase(), options)
    return clearDatabaseResponseSchema.parse(response)
  }
}
