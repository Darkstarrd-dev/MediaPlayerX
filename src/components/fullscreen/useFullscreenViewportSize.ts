import { useEffect, useState, type RefObject } from 'react'

import type { PaneViewportSize } from './paneMath'

interface UseFullscreenViewportSizeParams {
  fullscreenActive: boolean
  fullscreenDisplay: 'dual' | 'video-only' | 'image-only'
  fullscreenSwapped: boolean
  imagePaneRef: RefObject<HTMLElement | null>
  videoPaneRef: RefObject<HTMLElement | null>
}

interface UseFullscreenViewportSizeResult {
  imageViewportSize: PaneViewportSize
  videoViewportSize: PaneViewportSize
}

export function useFullscreenViewportSize({
  fullscreenActive,
  fullscreenDisplay,
  fullscreenSwapped,
  imagePaneRef,
  videoPaneRef,
}: UseFullscreenViewportSizeParams): UseFullscreenViewportSizeResult {
  const [imageViewportSize, setImageViewportSize] = useState<PaneViewportSize>({ width: 1, height: 1 })
  const [videoViewportSize, setVideoViewportSize] = useState<PaneViewportSize>({ width: 1, height: 1 })

  useEffect(() => {
    if (!fullscreenActive) {
      return
    }

    const observers: ResizeObserver[] = []

    const observePane = (element: HTMLElement | null, setter: (size: PaneViewportSize) => void) => {
      if (!element) {
        return
      }

      const updateSize = () => {
        const rect = element.getBoundingClientRect()
        setter({
          width: Math.max(1, rect.width),
          height: Math.max(1, rect.height),
        })
      }

      updateSize()
      const observer = new ResizeObserver(() => updateSize())
      observer.observe(element)
      observers.push(observer)
    }

    observePane(imagePaneRef.current, setImageViewportSize)
    observePane(videoPaneRef.current, setVideoViewportSize)

    return () => {
      for (const observer of observers) {
        observer.disconnect()
      }
    }
  }, [fullscreenActive, fullscreenDisplay, fullscreenSwapped, imagePaneRef, videoPaneRef])

  return {
    imageViewportSize,
    videoViewportSize,
  }
}
