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
