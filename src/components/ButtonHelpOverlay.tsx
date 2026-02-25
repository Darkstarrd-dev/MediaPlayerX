import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { useI18n } from '../i18n/useI18n'

interface HelpOverlayItem {
  key: string
  text: string
  top: number
  left: number
  placement: 'top' | 'bottom'
}

interface HelpOverlayCandidate {
  key: string
  text: string
  rect: DOMRect
  placement: 'top' | 'bottom'
}

interface ButtonHelpOverlayProps {
  active: boolean
}

const CONTROL_SELECTORS = [
  '.header-settings-btn',
  '.window-control-btn',
  '.search-trigger-btn',
  '.toolbar-icon-btn',
  '.video-action-btn',
  '.mode-action-btn',
  '.sidebar-head-icon-btn',
  '.metadata-head-icon-btn',
  '.settings-icon-btn',
  '.main-icon-square-btn',
  '[data-help-overlay="true"]',
].join(', ')

const DEFAULT_VIEWPORT_PADDING_PX = 8
const DEFAULT_OFFSET_PX = 10

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function isVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false
  }
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

function resolveLabel(el: HTMLElement): string {
  const custom = el.getAttribute('data-tooltip-label')
  if (custom && custom.trim().length > 0) {
    return custom.trim()
  }
  const fromA11y = el.getAttribute('aria-label')
  if (fromA11y && fromA11y.trim().length > 0) {
    return fromA11y.trim()
  }
  return ''
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

function estimateTagSize(text: string): { width: number; height: number } {
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

function resolveOverlayPlacement(el: HTMLElement): 'top' | 'bottom' {
  const override = el.getAttribute('data-help-overlay-placement')
  if (override === 'top' || override === 'bottom') {
    return override
  }

  const inMusicControls = el.closest('[data-slot="fg-main-content-music-controls"]') !== null
  const inFloatingMusicControls = el.closest('.music-controls-shell.is-fullscreen-floating') !== null
  if (inMusicControls && !inFloatingMusicControls) {
    return 'bottom'
  }

  return 'top'
}

function collectOverlayItems(): HelpOverlayItem[] {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(CONTROL_SELECTORS))
  const itemCandidates: HelpOverlayCandidate[] = []
  const items: HelpOverlayItem[] = []
  const seen = new Set<string>()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const viewportPadding = readRootPxVar('--mpx-tooltip-viewport-padding', DEFAULT_VIEWPORT_PADDING_PX)
  const offset = readRootPxVar('--mpx-tooltip-offset', DEFAULT_OFFSET_PX)

  for (const el of candidates) {
    if (!isVisible(el)) {
      continue
    }

    const label = resolveLabel(el)
    if (!label) {
      continue
    }

    const aid = el.getAttribute('data-a11y-id') ?? `${el.tagName.toLowerCase()}-${items.length}`
    const key = `${aid}:${label}`
    if (seen.has(key)) {
      continue
    }
    seen.add(key)

    itemCandidates.push({
      key,
      text: label,
      rect: el.getBoundingClientRect(),
      placement: resolveOverlayPlacement(el),
    })
  }

  itemCandidates.sort((left, right) => {
    if (Math.abs(left.rect.top - right.rect.top) > 0.5) {
      return left.rect.top - right.rect.top
    }
    return left.rect.left - right.rect.left
  })

  for (const candidate of itemCandidates) {
    const { width, height } = estimateTagSize(candidate.text)
    const centerX = candidate.rect.left + candidate.rect.width / 2
    const maxTop = Math.max(viewportPadding, viewportHeight - viewportPadding - height)
    const maxLeft = Math.max(viewportPadding, viewportWidth - width - viewportPadding)

    let placement = candidate.placement
    let top = placement === 'bottom' ? candidate.rect.bottom + offset : candidate.rect.top - height - offset

    if (placement === 'top' && top < viewportPadding) {
      placement = 'bottom'
      top = candidate.rect.bottom + offset
    }

    if (placement === 'bottom' && top + height > viewportHeight - viewportPadding) {
      const topFallback = candidate.rect.top - height - offset
      if (topFallback >= viewportPadding) {
        placement = 'top'
        top = topFallback
      }
    }

    items.push({
      key: candidate.key,
      text: candidate.text,
      left: clamp(centerX - width / 2, viewportPadding, maxLeft),
      top: clamp(top, viewportPadding, maxTop),
      placement,
    })
  }

  return items
}

function ButtonHelpOverlay({ active }: ButtonHelpOverlayProps) {
  const { t } = useI18n()
  const [items, setItems] = useState<HelpOverlayItem[]>([])

  const composedHint = useMemo(() => {
    return t('ui.help.overlayHint')
  }, [t])

  useEffect(() => {
    if (!active) {
      setItems([])
      return
    }

    const refresh = () => {
      setItems(collectOverlayItems())
    }

    refresh()

    const rafRefresh = () => {
      requestAnimationFrame(refresh)
    }

    const observer = new MutationObserver(rafRefresh)
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-tooltip-label', 'aria-label', 'hidden'],
    })

    window.addEventListener('resize', rafRefresh)
    window.addEventListener('scroll', rafRefresh, true)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', rafRefresh)
      window.removeEventListener('scroll', rafRefresh, true)
    }
  }, [active])

  if (!active) {
    return null
  }

  return createPortal(
    <div className="help-overlay" data-slot="fg-header-g3-help-root-button-overlay-ovl" data-overlay-close="help-overlay" role="dialog" aria-modal="false" aria-label={t('a11y.help.buttonOverlay')}>
      <div className="help-overlay-mask" aria-hidden="true" />
      <div className="help-overlay-hint">{composedHint}</div>
      {items.map((item) => (
        <div
          key={item.key}
          className={`app-tooltip-bubble${item.placement === 'bottom' ? ' is-bottom' : ''}`}
          style={{ top: `${item.top}px`, left: `${item.left}px` }}
        >
          {item.text}
        </div>
      ))}
    </div>,
    document.body,
  )
}

export default ButtonHelpOverlay
