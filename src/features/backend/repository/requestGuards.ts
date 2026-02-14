import type { RepositoryRequestOptions } from './types'

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

export async function withAbort<T>(task: Promise<T>, options?: RepositoryRequestOptions): Promise<T> {
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
