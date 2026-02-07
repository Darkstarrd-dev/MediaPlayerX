import { useCallback, useEffect, useState } from 'react'

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

export function useRuntimeCapabilities({ repository }: UseRuntimeCapabilitiesParams): UseRuntimeCapabilitiesResult {
  const [data, setData] = useState<ReadRuntimeCapabilitiesResponseDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryNonce, setRetryNonce] = useState(0)

  useEffect(() => {
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
  }, [repository, retryNonce])

  const retry = useCallback(() => {
    setRetryNonce((value) => value + 1)
  }, [])

  return {
    data,
    loading,
    error,
    retry,
  }
}
