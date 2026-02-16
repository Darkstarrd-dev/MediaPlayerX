import { useEffect, useMemo, useRef } from 'react'

interface MediaPreloadItem {
  id: string
  src: string
  sizeMb: number
}

interface UseMediaPreloadWindowParams {
  mediaType: 'video' | 'audio'
  items: MediaPreloadItem[]
  activeId: string | null
  budgetMb: number
  lookBehind?: number
  lookAhead?: number
}

const DEFAULT_VIDEO_ITEM_SIZE_MB = 40
const DEFAULT_AUDIO_ITEM_SIZE_MB = 12

function normalizeItemSizeMb(mediaType: 'video' | 'audio', sizeMb: number): number {
  if (Number.isFinite(sizeMb) && sizeMb > 0) {
    return sizeMb
  }
  return mediaType === 'video' ? DEFAULT_VIDEO_ITEM_SIZE_MB : DEFAULT_AUDIO_ITEM_SIZE_MB
}

export function useMediaPreloadWindow({
  mediaType,
  items,
  activeId,
  budgetMb,
  lookBehind = 1,
  lookAhead = 2,
}: UseMediaPreloadWindowParams): void {
  const preloaderByIdRef = useRef<Map<string, HTMLMediaElement>>(new Map())

  const preloadItemIds = useMemo(() => {
    if (budgetMb <= 0 || items.length === 0 || !activeId) {
      return []
    }

    const activeIndex = items.findIndex((item) => item.id === activeId)
    if (activeIndex < 0) {
      return []
    }

    let remainingBudget = budgetMb
    const picked = new Set<string>()
    for (let offset = 1; offset <= Math.max(lookBehind, lookAhead); offset += 1) {
      const backwardIndex = activeIndex - offset
      if (offset <= lookBehind && backwardIndex >= 0) {
        const backwardItem = items[backwardIndex]
        if (backwardItem) {
          const cost = normalizeItemSizeMb(mediaType, backwardItem.sizeMb)
          if (remainingBudget >= cost) {
            picked.add(backwardItem.id)
            remainingBudget -= cost
          }
        }
      }

      const forwardIndex = activeIndex + offset
      if (offset <= lookAhead && forwardIndex < items.length) {
        const forwardItem = items[forwardIndex]
        if (forwardItem) {
          const cost = normalizeItemSizeMb(mediaType, forwardItem.sizeMb)
          if (remainingBudget >= cost) {
            picked.add(forwardItem.id)
            remainingBudget -= cost
          }
        }
      }
    }

    return Array.from(picked)
  }, [activeId, budgetMb, items, lookAhead, lookBehind, mediaType])

  useEffect(() => {
    const itemById = new Map(items.map((item) => [item.id, item]))
    const targetSet = new Set(preloadItemIds)
    const preloaders = preloaderByIdRef.current

    for (const [id, preloader] of preloaders) {
      if (targetSet.has(id)) {
        continue
      }
      preloader.pause()
      preloader.removeAttribute('src')
      preloader.load()
      preloaders.delete(id)
    }

    for (const preloadId of preloadItemIds) {
      const item = itemById.get(preloadId)
      if (!item) {
        continue
      }

      let preloader = preloaders.get(preloadId)
      if (!preloader) {
        preloader = document.createElement(mediaType)
        preloader.preload = 'auto'
        preloader.muted = true
        preloaders.set(preloadId, preloader)
      }

      if (preloader.src !== item.src) {
        preloader.src = item.src
        preloader.load()
      }
    }
  }, [items, mediaType, preloadItemIds])

  useEffect(() => {
    return () => {
      const preloaders = preloaderByIdRef.current
      for (const preloader of preloaders.values()) {
        preloader.pause()
        preloader.removeAttribute('src')
        preloader.load()
      }
      preloaders.clear()
    }
  }, [])
}
