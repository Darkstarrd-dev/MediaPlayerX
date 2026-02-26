import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'

import type { AppSettingsStoreSnapshot } from './useAppSettingsStore'

const DEFAULT_AUTO_PLAY_PRESETS = [1, 2, 3, 5, 8]

export type FullscreenAlignDirection = 'up' | 'down' | 'left' | 'right'

interface UseFullscreenPlaybackBindingsParams {
  fullscreenActive: boolean
  fullscreenDisplay: 'image-only' | 'video-only' | 'dual'
  fullscreenVideoFocus: boolean
  autoPlayEnabled: boolean
  updateSettings: AppSettingsStoreSnapshot['updateSettings']
  setFullscreenActive: Dispatch<SetStateAction<boolean>>
  autoPlayPresets?: number[]
}

export function useFullscreenPlaybackBindings({
  fullscreenActive,
  fullscreenDisplay,
  fullscreenVideoFocus,
  autoPlayEnabled,
  updateSettings,
  setFullscreenActive,
  autoPlayPresets = DEFAULT_AUTO_PLAY_PRESETS,
}: UseFullscreenPlaybackBindingsParams) {
  const previousFullscreenActiveRef = useRef(fullscreenActive)
  const previousWindowSyncFullscreenActiveRef = useRef(fullscreenActive)
  const windowFullscreenBeforeMediaRef = useRef<boolean | null>(null)
  const pendingWindowFullscreenCaptureRef = useRef<Promise<boolean> | null>(null)
  const [fullscreenAlignRequest, setFullscreenAlignRequest] = useState<{
    id: number
    direction: FullscreenAlignDirection
  } | null>(null)

  const videoShortcutActive =
    fullscreenActive && (fullscreenDisplay === 'video-only' || (fullscreenDisplay === 'dual' && fullscreenVideoFocus))

  const applyAutoplayIntervalByIndex = useCallback(
    (index: number) => {
      const seconds = autoPlayPresets[index]
      if (!seconds) {
        return
      }
      updateSettings({ autoPlayInterval: seconds, autoPlayEnabled: true })
    },
    [autoPlayPresets, updateSettings],
  )

  const requestFullscreenAlign = useCallback((direction: FullscreenAlignDirection) => {
    setFullscreenAlignRequest((previous) => ({
      id: (previous?.id ?? 0) + 1,
      direction,
    }))
  }, [])

  useEffect(() => {
    const previous = previousFullscreenActiveRef.current
    if (previous && !fullscreenActive && autoPlayEnabled) {
      updateSettings({ autoPlayEnabled: false })
    }
    previousFullscreenActiveRef.current = fullscreenActive
  }, [autoPlayEnabled, fullscreenActive, updateSettings])

  useEffect(() => {
    const windowApi = typeof window !== 'undefined' ? window.mediaPlayerWindow : undefined
    if (!windowApi?.setFullscreen || !windowApi.isFullscreen) {
      return
    }

    const previous = previousWindowSyncFullscreenActiveRef.current
    previousWindowSyncFullscreenActiveRef.current = fullscreenActive
    if (previous === fullscreenActive) {
      return
    }

    if (fullscreenActive) {
      const capturePromise = windowApi
        .isFullscreen()
        .then((active) => {
          windowFullscreenBeforeMediaRef.current = active
          return active
        })
        .catch(() => {
          windowFullscreenBeforeMediaRef.current = false
          return false
        })

      pendingWindowFullscreenCaptureRef.current = capturePromise

      void capturePromise
        .then((active) => {
          if (active) {
            return
          }
          return windowApi.setFullscreen(true)
        })
        .catch(() => undefined)
        .finally(() => {
          if (pendingWindowFullscreenCaptureRef.current === capturePromise) {
            pendingWindowFullscreenCaptureRef.current = null
          }
        })

      return
    }

    const applyRestoreFullscreen = (fallbackValue: boolean) => {
      const restoreValue = windowFullscreenBeforeMediaRef.current ?? fallbackValue
      windowFullscreenBeforeMediaRef.current = null
      void windowApi.setFullscreen(restoreValue).catch(() => undefined)
    }

    const capturePromise = pendingWindowFullscreenCaptureRef.current
    if (capturePromise) {
      void capturePromise
        .then((capturedValue) => {
          applyRestoreFullscreen(capturedValue)
        })
        .catch(() => {
          applyRestoreFullscreen(false)
        })
        .finally(() => {
          if (pendingWindowFullscreenCaptureRef.current === capturePromise) {
            pendingWindowFullscreenCaptureRef.current = null
          }
        })
      return
    }

    applyRestoreFullscreen(false)
  }, [fullscreenActive])

  const setFullscreenActiveWithAutoStop = useCallback(
    (value: boolean | ((previous: boolean) => boolean)) => {
      setFullscreenActive(value)
    },
    [setFullscreenActive],
  )

  return {
    videoShortcutActive,
    fullscreenAlignRequest,
    applyAutoplayIntervalByIndex,
    requestFullscreenAlign,
    setFullscreenActiveWithAutoStop,
  }
}

export type FullscreenPlaybackBindingsResult = ReturnType<typeof useFullscreenPlaybackBindings>
