import { useEffect, useRef, useState } from 'react'

import type { ImageItem } from '../../types'

const IS_TEST_MODE = import.meta.env.MODE === 'test'

interface DecodedImageCacheEntry {
  aspect: number
  decodedAtMs: number
}

const fullscreenDecodedImageCache = new Map<string, DecodedImageCacheEntry>()

function touchDecodedCacheEntry(src: string, aspect: number): void {
  fullscreenDecodedImageCache.set(src, {
    aspect,
    decodedAtMs: Date.now(),
  })
}

function trimDecodedCache(maxSize: number): void {
  while (fullscreenDecodedImageCache.size > maxSize) {
    let oldestKey: string | null = null
    let oldestTime = Number.POSITIVE_INFINITY
    for (const [key, entry] of fullscreenDecodedImageCache) {
      if (entry.decodedAtMs < oldestTime) {
        oldestTime = entry.decodedAtMs
        oldestKey = key
      }
    }
    if (!oldestKey) {
      break
    }
    fullscreenDecodedImageCache.delete(oldestKey)
  }
}

interface UseFullscreenImageSourceParams {
  focusedImageSrc: string | null
  focusedImage: ImageItem | null
  decodeCacheSize?: number
}

interface UseFullscreenImageSourceResult {
  displayedImageSrc: string | null
  displayedImageAspect: number | null
  setDisplayedImageAspect: (aspect: number | null) => void
}

export function useFullscreenImageSource({
  focusedImageSrc,
  focusedImage,
  decodeCacheSize = 10,
}: UseFullscreenImageSourceParams): UseFullscreenImageSourceResult {
  const [displayedImageSrc, setDisplayedImageSrc] = useState<string | null>(null)
  const [displayedImageAspect, setDisplayedImageAspectState] = useState<number | null>(null)
  const imagePreloadSeqRef = useRef(0)

  const normalizedDecodeCacheSize = Math.max(4, Math.min(16, Math.round(decodeCacheSize)))

  useEffect(() => {
    trimDecodedCache(normalizedDecodeCacheSize)
  }, [normalizedDecodeCacheSize])

  useEffect(() => {
    if (IS_TEST_MODE) {
      setDisplayedImageSrc(focusedImageSrc)
      if (focusedImage && focusedImage.width > 0 && focusedImage.height > 0) {
        setDisplayedImageAspectState(focusedImage.width / focusedImage.height)
      } else {
        setDisplayedImageAspectState(null)
      }
      return
    }

    imagePreloadSeqRef.current += 1
    const sequence = imagePreloadSeqRef.current

    if (!focusedImageSrc) {
      setDisplayedImageSrc(null)
      setDisplayedImageAspectState(null)
      return
    }

    const cached = fullscreenDecodedImageCache.get(focusedImageSrc)
    if (cached) {
      touchDecodedCacheEntry(focusedImageSrc, cached.aspect)
      trimDecodedCache(normalizedDecodeCacheSize)
      setDisplayedImageSrc(focusedImageSrc)
      setDisplayedImageAspectState(cached.aspect)
      return
    }

    if (focusedImageSrc === displayedImageSrc) {
      return
    }

    let cancelled = false

    const preview = new Image()
    preview.decoding = 'async'
    preview.src = focusedImageSrc

    const commit = () => {
      if (cancelled || imagePreloadSeqRef.current !== sequence) {
        return
      }
      setDisplayedImageSrc(focusedImageSrc)
      if (preview.naturalWidth > 0 && preview.naturalHeight > 0) {
        const aspect = preview.naturalWidth / preview.naturalHeight
        touchDecodedCacheEntry(focusedImageSrc, aspect)
        trimDecodedCache(normalizedDecodeCacheSize)
        setDisplayedImageAspectState(aspect)
      }
    }

    const fail = () => {
      if (cancelled || imagePreloadSeqRef.current !== sequence) {
        return
      }
    }

    if (typeof preview.decode === 'function') {
      void preview
        .decode()
        .then(() => {
          commit()
        })
        .catch(() => {
          if (preview.complete && preview.naturalWidth > 0 && preview.naturalHeight > 0) {
            commit()
            return
          }
          fail()
        })
    } else {
      preview.onload = () => {
        commit()
      }
      preview.onerror = () => {
        fail()
      }
    }

    return () => {
      cancelled = true
    }
  }, [displayedImageSrc, focusedImage, focusedImageSrc, normalizedDecodeCacheSize])

  return {
    displayedImageSrc,
    displayedImageAspect,
    setDisplayedImageAspect: (aspect) => setDisplayedImageAspectState(aspect),
  }
}
