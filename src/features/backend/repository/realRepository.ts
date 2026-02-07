import {
  librarySnapshotDtoSchema,
  readImageMetadataResponseSchema,
  readImagePageResponseSchema,
  readImageSidebarTreeResponseSchema,
  resolveMediaResourceResponseSchema,
  type LibrarySnapshotDto,
  type ReadImageMetadataRequestDto,
  type ReadImageMetadataResponseDto,
  type ReadImagePageRequestDto,
  type ReadImagePageResponseDto,
  type ReadImageSidebarTreeRequestDto,
  type ReadImageSidebarTreeResponseDto,
  type ResolveMediaResourceRequestDto,
  type ResolveMediaResourceResponseDto,
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
}
