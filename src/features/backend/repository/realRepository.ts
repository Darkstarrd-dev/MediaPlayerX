import {
  enqueueImportTaskResponseSchema,
  librarySnapshotDtoSchema,
  mediaAccessAuditResponseSchema,
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

  async readLibrarySnapshot(options?: RepositoryRequestOptions): Promise<LibrarySnapshotDto> {
    const api = window.mediaPlayerBackend
    if (!api) {
      throw new Error('真实后端通道不可用：window.mediaPlayerBackend 未注入')
    }

    const response = await withAbort(api.readLibrarySnapshot(), options)
    return librarySnapshotDtoSchema.parse(response)
  }

  async readImageSidebarTree(
    request: ReadImageSidebarTreeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadImageSidebarTreeResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api) {
      throw new Error('真实后端通道不可用：window.mediaPlayerBackend 未注入')
    }

    const response = await withAbort(api.readImageSidebarTree(request), options)
    return readImageSidebarTreeResponseSchema.parse(response)
  }

  async readImagePage(
    request: ReadImagePageRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadImagePageResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api) {
      throw new Error('真实后端通道不可用：window.mediaPlayerBackend 未注入')
    }

    const response = await withAbort(api.readImagePage(request), options)
    return readImagePageResponseSchema.parse(response)
  }

  async readImageMetadata(
    request: ReadImageMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadImageMetadataResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api) {
      throw new Error('真实后端通道不可用：window.mediaPlayerBackend 未注入')
    }

    const response = await withAbort(api.readImageMetadata(request), options)
    return readImageMetadataResponseSchema.parse(response)
  }

  async resolveMediaResource(
    request: ResolveMediaResourceRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ResolveMediaResourceResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api) {
      throw new Error('真实后端通道不可用：window.mediaPlayerBackend 未注入')
    }

    const response = await withAbort(api.resolveMediaResource(request), options)
    return resolveMediaResourceResponseSchema.parse(response)
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

  async enqueueImportTask(
    request: EnqueueImportTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<EnqueueImportTaskResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api) {
      throw new Error('真实后端通道不可用：window.mediaPlayerBackend 未注入')
    }

    const response = await withAbort(api.enqueueImportTask(request), options)
    return enqueueImportTaskResponseSchema.parse(response)
  }

  async readImportTasks(options?: RepositoryRequestOptions): Promise<ReadImportTasksResponseDto> {
    const api = window.mediaPlayerBackend
    if (!api) {
      throw new Error('真实后端通道不可用：window.mediaPlayerBackend 未注入')
    }

    const response = await withAbort(api.readImportTasks(), options)
    return readImportTasksResponseSchema.parse(response)
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
}
