import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'

import {
  shouldIgnoreSettingsPanelDragStart,
  type PanelDragState,
  type PanelOffset,
} from './settings/settingsPanelHelpers'

interface DraggablePanelHeadHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void
  onLostPointerCapture: () => void
}

interface DraggablePanelState {
  panelOffset: PanelOffset
  panelDragging: boolean
  headHandlers: DraggablePanelHeadHandlers
}

export function useDraggablePanel(open: boolean): DraggablePanelState {
  const dragStateRef = useRef<PanelDragState | null>(null)
  const [panelOffset, setPanelOffset] = useState<PanelOffset>({ x: 0, y: 0 })
  const [panelDragging, setPanelDragging] = useState(false)

  useEffect(() => {
    if (!open) {
      dragStateRef.current = null
      setPanelOffset({ x: 0, y: 0 })
      setPanelDragging(false)
    }
  }, [open])

  const stopDragging = () => {
    dragStateRef.current = null
    setPanelDragging(false)
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return
    }
    if (shouldIgnoreSettingsPanelDragStart(event.target)) {
      return
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: panelOffset.x,
      startOffsetY: panelOffset.y,
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    setPanelDragging(true)
    event.preventDefault()
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    const nextOffset = {
      x: dragState.startOffsetX + (event.clientX - dragState.startClientX),
      y: dragState.startOffsetY + (event.clientY - dragState.startClientY),
    }

    setPanelOffset((previousOffset) => {
      if (
        Math.abs(previousOffset.x - nextOffset.x) < 0.5 &&
        Math.abs(previousOffset.y - nextOffset.y) < 0.5
      ) {
        return previousOffset
      }
      return nextOffset
    })

    event.preventDefault()
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    stopDragging()
  }

  const handlePointerCancel = (event: ReactPointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    stopDragging()
  }

  return {
    panelOffset,
    panelDragging,
    headHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onLostPointerCapture: stopDragging,
    },
  }
}
