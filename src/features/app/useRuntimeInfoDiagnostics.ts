import { useCallback, useEffect, useState } from 'react'

import type { ReadRuntimeInfoResponseDto, RuntimeMediaCapabilityHintDto } from '../../contracts/backend'

const RUNTIME_INFO_TIMEOUT_MS = 6_000
const MEDIA_CAPABILITY_TIMEOUT_MS = 1_500

const DEFAULT_MEDIA_CAPABILITY_HINTS: RuntimeMediaCapabilityHintDto[] = [
  { id: 'h264-1080p', label: 'H.264 / AVC 1080p', content_type: 'video/mp4; codecs="avc1.640028"' },
  { id: 'hevc-1080p', label: 'H.265 / HEVC 1080p', content_type: 'video/mp4; codecs="hvc1.1.6.L120.B0"' },
  { id: 'av1-1080p', label: 'AV1 1080p', content_type: 'video/mp4; codecs="av01.0.08M.08"' },
  { id: 'vp9-1080p', label: 'VP9 1080p', content_type: 'video/webm; codecs="vp09.00.41.08"' },
]

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
  mediaCapabilitiesLoading: boolean
  mediaCapabilitiesError: string | null
  mediaCapabilities: RuntimeMediaCapabilityProbeResult[]
  retry: () => void
}

export interface RuntimeMediaCapabilityProbeResult {
  id: string
  label: string
  contentType: string
  supported: boolean
  smooth: boolean
  powerEfficient: boolean | null
  error: string | null
}

function hasMediaCapabilitiesApi(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.mediaCapabilities?.decodingInfo === 'function'
}

function toMediaCapabilityErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }
  return '解码能力检测失败'
}

export function useRuntimeInfoDiagnostics(): RuntimeInfoDiagnosticsResult {
  const backendBridgeInjected = detectBackendBridgeInjected()
  const [data, setData] = useState<ReadRuntimeInfoResponseDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mediaCapabilities, setMediaCapabilities] = useState<RuntimeMediaCapabilityProbeResult[]>([])
  const [mediaCapabilitiesLoading, setMediaCapabilitiesLoading] = useState(false)
  const [mediaCapabilitiesError, setMediaCapabilitiesError] = useState<string | null>(null)
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

  useEffect(() => {
    const hints = data?.media_capability_hints ?? DEFAULT_MEDIA_CAPABILITY_HINTS
    if (!hasMediaCapabilitiesApi()) {
      setMediaCapabilitiesLoading(false)
      setMediaCapabilitiesError('当前环境不支持 MediaCapabilities API')
      setMediaCapabilities([])
      return
    }

    let active = true
    setMediaCapabilitiesLoading(true)
    setMediaCapabilitiesError(null)

    const run = async () => {
      const next: RuntimeMediaCapabilityProbeResult[] = []
      for (const hint of hints) {
        let timeoutId: ReturnType<typeof setTimeout> | null = null
        const timeoutTask = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`解码能力检测超时（>${MEDIA_CAPABILITY_TIMEOUT_MS}ms）`))
          }, MEDIA_CAPABILITY_TIMEOUT_MS)
        })

        try {
          const probeTask = navigator.mediaCapabilities.decodingInfo({
            type: 'file',
            video: {
              contentType: hint.content_type,
              width: 1920,
              height: 1080,
              bitrate: 8_000_000,
              framerate: 30,
            },
          })

          const result = await Promise.race([probeTask, timeoutTask])
          next.push({
            id: hint.id,
            label: hint.label,
            contentType: hint.content_type,
            supported: result.supported,
            smooth: result.smooth,
            powerEfficient: result.powerEfficient,
            error: null,
          })
        } catch (errorValue: unknown) {
          next.push({
            id: hint.id,
            label: hint.label,
            contentType: hint.content_type,
            supported: false,
            smooth: false,
            powerEfficient: null,
            error: toMediaCapabilityErrorMessage(errorValue),
          })
        } finally {
          if (timeoutId !== null) {
            clearTimeout(timeoutId)
          }
        }
      }

      if (!active) {
        return
      }
      setMediaCapabilities(next)
      setMediaCapabilitiesLoading(false)
    }

    void run().catch((errorValue: unknown) => {
      if (!active) {
        return
      }
      setMediaCapabilities([])
      setMediaCapabilitiesLoading(false)
      setMediaCapabilitiesError(toMediaCapabilityErrorMessage(errorValue))
    })

    return () => {
      active = false
    }
  }, [data])

  const retry = useCallback(() => {
    setRetryNonce((value) => value + 1)
  }, [])

  return {
    data,
    loading,
    error,
    backendBridgeInjected,
    mediaCapabilitiesLoading,
    mediaCapabilitiesError,
    mediaCapabilities,
    retry,
  }
}
