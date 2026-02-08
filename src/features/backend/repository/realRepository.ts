import {
  clearDatabaseResponseSchema,
  enqueueImportTaskResponseSchema,
  librarySnapshotDtoSchema,
  mediaAccessAuditResponseSchema,
  pickImportPathsResponseSchema,
  readClipboardImportPathsResponseSchema,
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
  writePackageGradeResponseSchema,
  type EnqueueImportTaskRequestDto,
  type EnqueueImportTaskResponseDto,
  type ClearDatabaseResponseDto,
  type PickImportPathsRequestDto,
  type PickImportPathsResponseDto,
  type ReadClipboardImportPathsResponseDto,
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
  type WritePackageGradeRequestDto,
  type WritePackageGradeResponseDto,
} from '../../../contracts/backend'
import type { ReadonlyMediaRepository, RepositoryRequestOptions } from './types'
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

export class RealMediaRepository implements ReadonlyMediaRepository {
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

  async clearDatabase(options?: RepositoryRequestOptions): Promise<ClearDatabaseResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api) {
      throw new Error('真实后端通道不可用：window.mediaPlayerBackend 未注入')
    }

    const response = await withAbort(api.clearDatabase(), options)
    return clearDatabaseResponseSchema.parse(response)
  }
}
