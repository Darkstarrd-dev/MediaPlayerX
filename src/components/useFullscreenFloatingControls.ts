import { useCallback, useEffect, useRef, useState } from 'react'

interface UseFullscreenFloatingControlsParams {
  fullscreenActive: boolean
  onAfterHide?: () => void
}

interface FullscreenFloatingControlsResult {
  controlsMounted: boolean
  controlsVisible: boolean
  showControls: () => void
  hideControls: () => void
}

export function useFullscreenFloatingControls({
  fullscreenActive,
  onAfterHide,
}: UseFullscreenFloatingControlsParams): FullscreenFloatingControlsResult {
  const [controlsMounted, setControlsMounted] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(false)
  const hideTimerRef = useRef<number | null>(null)

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current == null) {
      return
    }
    window.clearTimeout(hideTimerRef.current)
    hideTimerRef.current = null
  }, [])

  useEffect(() => {
    if (!fullscreenActive) {
      clearHideTimer()
      setControlsMounted(false)
      setControlsVisible(false)
      return
    }

    setControlsMounted(false)
    setControlsVisible(false)
  }, [clearHideTimer, fullscreenActive])

  useEffect(() => {
    return () => {
      clearHideTimer()
    }
  }, [clearHideTimer])

  const showControls = useCallback(() => {
    if (!fullscreenActive) {
      return
    }
    clearHideTimer()
    if (!controlsMounted) {
      setControlsMounted(true)
      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          setControlsVisible(true)
        })
      } else {
        setControlsVisible(true)
      }
      return
    }
    setControlsVisible(true)
  }, [clearHideTimer, controlsMounted, fullscreenActive])

  const hideControls = useCallback(() => {
    if (!fullscreenActive) {
      return
    }
    setControlsVisible(false)
    clearHideTimer()
    hideTimerRef.current = window.setTimeout(() => {
      setControlsMounted(false)
      hideTimerRef.current = null
      onAfterHide?.()
    }, 300)
  }, [clearHideTimer, fullscreenActive, onAfterHide])

  return {
    controlsMounted,
    controlsVisible,
    showControls,
    hideControls,
  }
}
