import { useEffect, useRef } from 'react'

import {
  computeResponsiveZoomFactor,
  RESPONSIVE_ZOOM_EPSILON,
} from './mediaPathUtils'

export function useResponsiveZoomEffect(): void {
  const responsiveZoomFactorRef = useRef(1)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.mediaPlayerView?.setZoomFactor) {
      return
    }

    let rafId = 0
    responsiveZoomFactorRef.current = 1

    const applyZoom = () => {
      const stableWidth = window.innerWidth * responsiveZoomFactorRef.current
      const stableHeight = window.innerHeight * responsiveZoomFactorRef.current
      const nextFactor = computeResponsiveZoomFactor(stableWidth, stableHeight)
      if (Math.abs(nextFactor - responsiveZoomFactorRef.current) < RESPONSIVE_ZOOM_EPSILON) {
        return
      }

      responsiveZoomFactorRef.current = nextFactor
      window.mediaPlayerView?.setZoomFactor(nextFactor)
    }

    applyZoom()

    const onResize = () => {
      window.cancelAnimationFrame(rafId)
      rafId = window.requestAnimationFrame(applyZoom)
    }

    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.cancelAnimationFrame(rafId)
      responsiveZoomFactorRef.current = 1
      window.mediaPlayerView?.setZoomFactor(1)
    }
  }, [])
}
