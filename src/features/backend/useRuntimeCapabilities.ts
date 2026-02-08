import { useCallback, useEffect, useMemo, useState } from 'react'

import type { ReadRuntimeCapabilitiesResponseDto } from '../../contracts/backend'
import type { ReadonlyMediaRepository } from './repository'

const RUNTIME_CAPABILITY_TIMEOUT_MS = 6_000

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }
  return '运行时能力探测失败'
}

interface UseRuntimeCapabilitiesParams {
  repository: ReadonlyMediaRepository
}

interface UseRuntimeCapabilitiesResult {
  data: ReadRuntimeCapabilitiesResponseDto | null
  loading: boolean
  error: string | null
  retry: () => void
}

interface SyncRuntimeCapabilityRepository extends ReadonlyMediaRepository {
  readRuntimeCapabilitiesSync(): ReadRuntimeCapabilitiesResponseDto
}

function isSyncRuntimeCapabilityRepository(
  repository: ReadonlyMediaRepository,
): repository is SyncRuntimeCapabilityRepository {
  return 'readRuntimeCapabilitiesSync' in repository && typeof repository.readRuntimeCapabilitiesSync === 'function'
}

export function useRuntimeCapabilities({ repository }: UseRuntimeCapabilitiesParams): UseRuntimeCapabilitiesResult {
  const isSynchronousTestMode = import.meta.env.MODE === 'test' && isSyncRuntimeCapabilityRepository(repository)
  const syncInitialData = useMemo<ReadRuntimeCapabilitiesResponseDto | null>(() => {
    if (!isSynchronousTestMode) {
      return null
    }
    return repository.readRuntimeCapabilitiesSync()
  }, [isSynchronousTestMode, repository])

  const [data, setData] = useState<ReadRuntimeCapabilitiesResponseDto | null>(syncInitialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryNonce, setRetryNonce] = useState(0)

  useEffect(() => {
    if (isSynchronousTestMode) {
      return
    }

    const abortController = new AbortController()
    let active = true

    setLoading(true)
    setError(null)

    repository
      .readRuntimeCapabilities({
        signal: abortController.signal,
        timeoutMs: RUNTIME_CAPABILITY_TIMEOUT_MS,
      })
      .then((response) => {
        if (!active) {
          return
        }
        setData(response)
      })
      .catch((errorValue: unknown) => {
        if (!active) {
          return
        }
        setError(toErrorMessage(errorValue))
      })
      .finally(() => {
        if (!active) {
          return
        }
        setLoading(false)
      })

    return () => {
      active = false
      abortController.abort()
    }
  }, [isSynchronousTestMode, repository, retryNonce])

  const retry = useCallback(() => {
    setRetryNonce((value) => value + 1)
  }, [])

  if (isSynchronousTestMode) {
    return {
      data: syncInitialData,
      loading: false,
      error: null,
      retry: () => undefined,
    }
  }

  return {
    data,
    loading,
    error,
    retry,
  }
}
