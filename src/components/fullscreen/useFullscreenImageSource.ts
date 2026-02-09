import { useEffect, useRef, useState } from 'react'

import type { ImageItem } from '../../types'

const IS_TEST_MODE = import.meta.env.MODE === 'test'

interface UseFullscreenImageSourceParams {
  focusedImageSrc: string | null
  focusedImage: ImageItem | null
}

interface UseFullscreenImageSourceResult {
  displayedImageSrc: string | null
  displayedImageAspect: number | null
  setDisplayedImageAspect: (aspect: number | null) => void
}

export function useFullscreenImageSource({
  focusedImageSrc,
  focusedImage,
}: UseFullscreenImageSourceParams): UseFullscreenImageSourceResult {
  const [displayedImageSrc, setDisplayedImageSrc] = useState<string | null>(null)
  const [displayedImageAspect, setDisplayedImageAspectState] = useState<number | null>(null)
  const imagePreloadSeqRef = useRef(0)

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
        setDisplayedImageAspectState(preview.naturalWidth / preview.naturalHeight)
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
  }, [displayedImageSrc, focusedImage, focusedImageSrc])

  return {
    displayedImageSrc,
    displayedImageAspect,
    setDisplayedImageAspect: (aspect) => setDisplayedImageAspectState(aspect),
  }
}
