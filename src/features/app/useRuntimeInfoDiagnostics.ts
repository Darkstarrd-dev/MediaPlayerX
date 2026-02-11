import { useCallback, useEffect, useState } from 'react'

import type { ReadRuntimeInfoResponseDto } from '../../contracts/backend'

const RUNTIME_INFO_TIMEOUT_MS = 6_000

function detectBackendBridgeInjected(): boolean {
  return typeof window !== 'undefined' && typeof window.mediaPlayerBackend !== 'undefined'
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }
  return '读取运行时诊断信息失败'
}

export interface RuntimeInfoDiagnosticsResult {
  data: ReadRuntimeInfoResponseDto | null
  loading: boolean
  error: string | null
  backendBridgeInjected: boolean
  retry: () => void
}

export function useRuntimeInfoDiagnostics(): RuntimeInfoDiagnosticsResult {
  const backendBridgeInjected = detectBackendBridgeInjected()
  const [data, setData] = useState<ReadRuntimeInfoResponseDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryNonce, setRetryNonce] = useState(0)

  useEffect(() => {
    const backendApi = typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
    if (!backendBridgeInjected || !backendApi) {
      setData(null)
      setLoading(false)
      setError('未检测到后端桥接（window.mediaPlayerBackend），当前可能是浏览器 mock 环境')
      return
    }

    if (typeof backendApi.readRuntimeInfo !== 'function') {
      setData(null)
      setLoading(false)
      setError('当前后端未提供运行时诊断接口（readRuntimeInfo）')
      return
    }

    let active = true
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    setLoading(true)
    setError(null)

    const timeoutTask = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`运行时诊断读取超时（>${RUNTIME_INFO_TIMEOUT_MS}ms）`))
      }, RUNTIME_INFO_TIMEOUT_MS)
    })

    void Promise.race([backendApi.readRuntimeInfo(), timeoutTask])
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
        setData(null)
        setError(toErrorMessage(errorValue))
      })
      .finally(() => {
        if (timeoutId !== null) {
          clearTimeout(timeoutId)
        }
        if (!active) {
          return
        }
        setLoading(false)
      })

    return () => {
      active = false
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }
    }
  }, [backendBridgeInjected, retryNonce])

  const retry = useCallback(() => {
    setRetryNonce((value) => value + 1)
  }, [])

  return {
    data,
    loading,
    error,
    backendBridgeInjected,
    retry,
  }
}
