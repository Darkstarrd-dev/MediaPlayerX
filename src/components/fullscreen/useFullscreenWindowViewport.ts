import { useEffect, useState } from 'react'

interface FullscreenWindowViewport {
  width: number
  height: number
}

function readWindowViewport(): FullscreenWindowViewport {
  if (typeof window === 'undefined') {
    return { width: 1920, height: 1080 }
  }
  return {
    width: Math.max(1, window.innerWidth),
    height: Math.max(1, window.innerHeight),
  }
}

export function useFullscreenWindowViewport(fullscreenActive: boolean): FullscreenWindowViewport {
  const [viewport, setViewport] = useState<FullscreenWindowViewport>(readWindowViewport)

  useEffect(() => {
    if (!fullscreenActive || typeof window === 'undefined') {
      return
    }

    const syncViewport = () => {
      const nextViewport = readWindowViewport()
      setViewport((previous) => {
        if (previous.width === nextViewport.width && previous.height === nextViewport.height) {
          return previous
        }
        return nextViewport
      })
    }

    syncViewport()
    window.addEventListener('resize', syncViewport)
    window.addEventListener('fullscreenchange', syncViewport)

    return () => {
      window.removeEventListener('resize', syncViewport)
      window.removeEventListener('fullscreenchange', syncViewport)
    }
  }, [fullscreenActive])

  return viewport
}
