import { useCallback, useEffect, useMemo, useState } from 'react'

import type { ReadRuntimeCapabilitiesResponseDto } from '../../contracts/backend'
import { useI18n } from '../../i18n/useI18n'
import { toErrorDetailWithCode } from '../shared/errorCode'
import type { MediaRepository } from './repository'

const RUNTIME_CAPABILITY_TIMEOUT_MS = 6_000

interface UseRuntimeCapabilitiesParams {
  repository: MediaRepository
}

interface UseRuntimeCapabilitiesResult {
  data: ReadRuntimeCapabilitiesResponseDto | null
  loading: boolean
  error: string | null
  retry: () => void
}

interface SyncRuntimeCapabilityRepository extends MediaRepository {
  readRuntimeCapabilitiesSync(): ReadRuntimeCapabilitiesResponseDto
}

function isSyncRuntimeCapabilityRepository(
  repository: MediaRepository,
): repository is SyncRuntimeCapabilityRepository {
  return 'readRuntimeCapabilitiesSync' in repository && typeof repository.readRuntimeCapabilitiesSync === 'function'
}

export function useRuntimeCapabilities({ repository }: UseRuntimeCapabilitiesParams): UseRuntimeCapabilitiesResult {
  const { t } = useI18n()
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
        setError(t('ui.settings.runtimeCapabilityReadFailed', { message: toErrorDetailWithCode(errorValue, t) }))
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
  }, [isSynchronousTestMode, repository, retryNonce, t])

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

export type RuntimeCapabilitiesResult = ReturnType<typeof useRuntimeCapabilities>
