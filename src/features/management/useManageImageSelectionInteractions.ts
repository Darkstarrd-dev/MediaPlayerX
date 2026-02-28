import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'

interface MarqueeRect {
  startX: number
  startY: number
  currentX: number
  currentY: number
}

interface UseManageImageSelectionInteractionsParams {
  manageMode: boolean
  onReplaceCheckedImages: (imageIds: string[], append?: boolean) => void
  onToggleImageChecked: (
    imageId: string,
    checked?: boolean,
    options?: { shiftKey?: boolean; orderedIds?: readonly string[] },
  ) => void
  onSelectImage: (packageId: string, imageIndex: number, absoluteIndex: number) => void
  focusOnFirstToggle?: boolean
}

interface UseManageImageSelectionInteractionsResult {
  marqueeStyle: {
    left: number
    top: number
    width: number
    height: number
  } | null
  startMarqueeSelection: (event: ReactMouseEvent<HTMLElement>) => void
  startThumbnailDragToggle: (event: ReactMouseEvent<HTMLElement>) => void
}

export function useManageImageSelectionInteractions({
  manageMode,
  onReplaceCheckedImages,
  onToggleImageChecked,
  onSelectImage,
  focusOnFirstToggle = true,
}: UseManageImageSelectionInteractionsParams): UseManageImageSelectionInteractionsResult {
  const marqueeListenerCleanupRef = useRef<(() => void) | null>(null)
  const dragToggleCleanupRef = useRef<(() => void) | null>(null)
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null)

  const marqueeStyle = useMemo(() => {
    if (!marqueeRect) {
      return null
    }

    const left = Math.min(marqueeRect.startX, marqueeRect.currentX)
    const top = Math.min(marqueeRect.startY, marqueeRect.currentY)
    const width = Math.abs(marqueeRect.currentX - marqueeRect.startX)
    const height = Math.abs(marqueeRect.currentY - marqueeRect.startY)
    return {
      left,
      top,
      width,
      height,
    }
  }, [marqueeRect])

  const detachMarqueeListeners = useCallback(() => {
    const cleanup = marqueeListenerCleanupRef.current
    if (cleanup) {
      marqueeListenerCleanupRef.current = null
      cleanup()
    }
  }, [])

  const detachDragToggleListeners = useCallback(() => {
    const cleanup = dragToggleCleanupRef.current
    if (cleanup) {
      dragToggleCleanupRef.current = null
      cleanup()
    }
  }, [])

  useEffect(() => {
    if (!manageMode) {
      detachMarqueeListeners()
      detachDragToggleListeners()
      setMarqueeRect(null)
    }

    return () => {
      detachMarqueeListeners()
      detachDragToggleListeners()
    }
  }, [detachDragToggleListeners, detachMarqueeListeners, manageMode])

  const startMarqueeSelection = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (!manageMode || event.button !== 0) {
        return
      }

      const target = event.target
      if (!(target instanceof Element)) {
        return
      }

      if (target.closest('button') || target.closest('input') || target.closest('label') || target.closest('img')) {
        return
      }

      event.preventDefault()
      detachMarqueeListeners()

      const container = event.currentTarget
      const startX = event.clientX
      const startY = event.clientY
      const minSelectionDistance = 4
      setMarqueeRect({
        startX,
        startY,
        currentX: startX,
        currentY: startY,
      })

      const collectHitImageIds = (currentX: number, currentY: number): string[] => {
        const left = Math.min(startX, currentX)
        const right = Math.max(startX, currentX)
        const top = Math.min(startY, currentY)
        const bottom = Math.max(startY, currentY)
        const hitIds: string[] = []

        const candidates = Array.from(container.querySelectorAll<HTMLElement>('[data-manage-image-id]'))
        for (const candidate of candidates) {
          const imageId = candidate.dataset.manageImageId
          if (!imageId) {
            continue
          }
          const rect = candidate.getBoundingClientRect()
          const intersects = rect.right >= left && rect.left <= right && rect.bottom >= top && rect.top <= bottom
          if (intersects) {
            hitIds.push(imageId)
          }
        }

        return hitIds
      }

      const onMouseMove = (moveEvent: MouseEvent) => {
        setMarqueeRect((previous) =>
          previous
            ? {
                ...previous,
                currentX: moveEvent.clientX,
                currentY: moveEvent.clientY,
              }
            : previous,
        )
      }

      const onMouseUp = (upEvent: MouseEvent) => {
        const deltaX = Math.abs(upEvent.clientX - startX)
        const deltaY = Math.abs(upEvent.clientY - startY)
        const movedEnough = deltaX >= minSelectionDistance || deltaY >= minSelectionDistance
        if (movedEnough) {
          const hitImageIds = collectHitImageIds(upEvent.clientX, upEvent.clientY)
          if (hitImageIds.length > 0 || upEvent.shiftKey) {
            onReplaceCheckedImages(hitImageIds, upEvent.shiftKey)
          }
        }

        setMarqueeRect(null)
        detachMarqueeListeners()
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
      marqueeListenerCleanupRef.current = () => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }
    },
    [detachMarqueeListeners, manageMode, onReplaceCheckedImages],
  )

  const startThumbnailDragToggle = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (!manageMode || event.button !== 0) {
        return
      }

      const target = event.target
      if (!(target instanceof Element)) {
        return
      }

      const findCardFromElement = (element: Element | null): HTMLElement | null => {
        if (!(element instanceof Element)) {
          return null
        }
        return element.closest<HTMLElement>('[data-manage-image-id]')
      }

      const toggledImageIds = new Set<string>()
      const orderedImageIds = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[data-manage-image-id]'))
        .map((card) => card.dataset.manageImageId)
        .filter((imageId): imageId is string => Boolean(imageId))
      const toggleFromCard = (
        card: HTMLElement | null,
        focusImage: boolean,
        options?: { shiftKey?: boolean; orderedIds?: readonly string[] },
      ) => {
        if (!card) {
          return
        }

        const imageId = card.dataset.manageImageId
        if (!imageId || toggledImageIds.has(imageId)) {
          return
        }

        toggledImageIds.add(imageId)
        onToggleImageChecked(imageId, undefined, options)

        if (!focusImage) {
          return
        }

        const packageId = card.dataset.managePackageId
        const imageIndex = Number.parseInt(card.dataset.manageImageIndex ?? '', 10)
        const absoluteIndex = Number.parseInt(card.dataset.manageAbsoluteIndex ?? '', 10)
        if (!packageId || Number.isNaN(imageIndex) || Number.isNaN(absoluteIndex)) {
          return
        }

        onSelectImage(packageId, imageIndex, absoluteIndex)
      }

      const firstCard = findCardFromElement(target)
      if (!firstCard) {
        return
      }

      event.preventDefault()
      detachDragToggleListeners()
      toggleFromCard(firstCard, focusOnFirstToggle, {
        shiftKey: event.shiftKey,
        orderedIds: orderedImageIds,
      })

      const onMouseMove = (moveEvent: MouseEvent) => {
        const card = findCardFromElement(document.elementFromPoint(moveEvent.clientX, moveEvent.clientY))
        toggleFromCard(card, false)
      }

      const onMouseUp = () => {
        detachDragToggleListeners()
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
      dragToggleCleanupRef.current = () => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }
    },
    [detachDragToggleListeners, focusOnFirstToggle, manageMode, onSelectImage, onToggleImageChecked],
  )

  return {
    marqueeStyle,
    startMarqueeSelection,
    startThumbnailDragToggle,
  }
}
