import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type TooltipPlacement = 'top' | 'bottom'

interface TooltipState {
  text: string
  top: number
  left: number
  placement: TooltipPlacement
}

interface TooltipLayerProps {
  suspended?: boolean
}

const HOVER_OPEN_DELAY_MS = 420
const FOCUS_OPEN_DELAY_MS = 120
const DEFAULT_VIEWPORT_PADDING_PX = 8
const DEFAULT_OFFSET_PX = 10

function getTooltipText(target: HTMLElement): string {
  const custom = target.getAttribute('data-tooltip-label')
  if (custom && custom.trim().length > 0) {
    return custom.trim()
  }

  return ''
}

function isElementVisible(target: HTMLElement): boolean {
  const style = window.getComputedStyle(target)
  if (style.visibility === 'hidden' || style.display === 'none') {
    return false
  }
  const rect = target.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

function resolveTooltipTarget(eventTarget: EventTarget | null): HTMLElement | null {
  if (!(eventTarget instanceof Element)) {
    return null
  }

  const target = eventTarget.closest<HTMLElement>('[data-tooltip-label]')
  if (!target) {
    return null
  }

  if (target.getAttribute('data-tooltip') === 'off') {
    return null
  }

  if (!isElementVisible(target)) {
    return null
  }

  const text = getTooltipText(target)
  if (!text) {
    return null
  }

  return target
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function readRootPxVar(name: string, fallback: number): number {
  const rootStyle = window.getComputedStyle(document.documentElement)
  const raw = rootStyle.getPropertyValue(name).trim()
  const parsed = Number.parseFloat(raw)
  if (Number.isFinite(parsed)) {
    return parsed
  }
  return fallback
}

function measureTooltipSize(text: string): { width: number; height: number } {
  const probe = document.createElement('div')
  probe.className = 'app-tooltip-bubble app-tooltip-bubble--measure'
  probe.textContent = text
  document.body.appendChild(probe)
  const rect = probe.getBoundingClientRect()
  probe.remove()
  return {
    width: Math.ceil(rect.width),
    height: Math.ceil(rect.height),
  }
}

function prefersBottomPlacement(target: HTMLElement): boolean {
  return target.closest('[data-slot="fg-main-content-music-controls"]') !== null
}

function resolvePosition(target: HTMLElement, bubbleWidth: number, bubbleHeight: number): TooltipState | null {
  const text = getTooltipText(target)
  if (!text) {
    return null
  }

  const viewportPadding = readRootPxVar('--mpx-tooltip-viewport-padding', DEFAULT_VIEWPORT_PADDING_PX)
  const offset = readRootPxVar('--mpx-tooltip-offset', DEFAULT_OFFSET_PX)

  const rect = target.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const centerX = rect.left + rect.width / 2

  const preferBottom = prefersBottomPlacement(target)
  let placement: TooltipPlacement = preferBottom ? 'bottom' : 'top'
  let top = placement === 'bottom' ? rect.bottom + offset : rect.top - bubbleHeight - offset

  if (placement === 'top' && top < viewportPadding) {
    placement = 'bottom'
    top = rect.bottom + offset
  }

  if (placement === 'bottom' && top + bubbleHeight > viewportHeight - viewportPadding) {
    const topFallback = rect.top - bubbleHeight - offset
    if (topFallback >= viewportPadding) {
      placement = 'top'
      top = topFallback
    }
  }

  const maxTop = Math.max(viewportPadding, viewportHeight - bubbleHeight - viewportPadding)
  const maxLeft = Math.max(viewportPadding, viewportWidth - bubbleWidth - viewportPadding)
  const left = clamp(centerX - bubbleWidth / 2, viewportPadding, maxLeft)

  return {
    text,
    top: clamp(top, viewportPadding, maxTop),
    left,
    placement,
  }
}

function TooltipLayer({ suspended = false }: TooltipLayerProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const activeTargetRef = useRef<HTMLElement | null>(null)
  const openTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const clearOpenTimer = () => {
      if (openTimerRef.current != null) {
        window.clearTimeout(openTimerRef.current)
        openTimerRef.current = null
      }
    }

    const closeTooltip = () => {
      clearOpenTimer()
      setTooltip(null)
      activeTargetRef.current = null
    }

    const openTooltipForTarget = (target: HTMLElement, delay: number) => {
      clearOpenTimer()
      activeTargetRef.current = target

      openTimerRef.current = window.setTimeout(() => {
        if (activeTargetRef.current !== target) {
          return
        }
        const size = measureTooltipSize(getTooltipText(target))
        const position = resolvePosition(target, size.width, size.height)
        if (!position) {
          closeTooltip()
          return
        }
        setTooltip(position)
      }, delay)
    }

    const onPointerOver = (event: PointerEvent) => {
      if (suspended) {
        closeTooltip()
        return
      }
      const target = resolveTooltipTarget(event.target)
      if (!target) {
        return
      }
      openTooltipForTarget(target, HOVER_OPEN_DELAY_MS)
    }

    const onPointerOut = (event: PointerEvent) => {
      if (!activeTargetRef.current) {
        return
      }
      const related = event.relatedTarget as Node | null
      if (related && activeTargetRef.current.contains(related)) {
        return
      }
      closeTooltip()
    }

    const onFocusIn = (event: FocusEvent) => {
      if (suspended) {
        closeTooltip()
        return
      }
      const target = resolveTooltipTarget(event.target)
      if (!target) {
        return
      }
      openTooltipForTarget(target, FOCUS_OPEN_DELAY_MS)
    }

    const onFocusOut = () => {
      closeTooltip()
    }

    const onWindowResize = () => {
      const target = activeTargetRef.current
      if (!target || suspended) {
        closeTooltip()
        return
      }
      const size = measureTooltipSize(getTooltipText(target))
      const position = resolvePosition(target, size.width, size.height)
      if (!position) {
        closeTooltip()
        return
      }
      setTooltip(position)
    }

    const onDismissIntent = () => {
      closeTooltip()
    }

    document.addEventListener('pointerover', onPointerOver, true)
    document.addEventListener('pointerout', onPointerOut, true)
    document.addEventListener('focusin', onFocusIn, true)
    document.addEventListener('focusout', onFocusOut, true)
    document.addEventListener('pointerdown', onDismissIntent, true)
    document.addEventListener('wheel', onDismissIntent, { capture: true, passive: true })
    window.addEventListener('scroll', onWindowResize, true)
    window.addEventListener('resize', onWindowResize)
    window.addEventListener('blur', onDismissIntent)

    return () => {
      document.removeEventListener('pointerover', onPointerOver, true)
      document.removeEventListener('pointerout', onPointerOut, true)
      document.removeEventListener('focusin', onFocusIn, true)
      document.removeEventListener('focusout', onFocusOut, true)
      document.removeEventListener('pointerdown', onDismissIntent, true)
      document.removeEventListener('wheel', onDismissIntent, true)
      window.removeEventListener('scroll', onWindowResize, true)
      window.removeEventListener('resize', onWindowResize)
      window.removeEventListener('blur', onDismissIntent)
      closeTooltip()
    }
  }, [suspended])

  if (!tooltip) {
    return null
  }

  return createPortal(
    <div
      className={`app-tooltip-bubble${tooltip.placement === 'bottom' ? ' is-bottom' : ''}`}
      data-slot="fg-app-tooltip-ovl"
      role="tooltip"
      style={{ top: `${tooltip.top}px`, left: `${tooltip.left}px` }}
    >
      {tooltip.text}
    </div>,
    document.body,
  )
}

export default TooltipLayer
