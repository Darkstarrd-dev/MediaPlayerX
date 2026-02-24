import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { useI18n } from '../i18n/useI18n'

interface HelpOverlayItem {
  key: string
  text: string
  top: number
  left: number
}

interface HelpOverlayCandidate {
  key: string
  text: string
  rect: DOMRect
}

interface OverlayBox {
  left: number
  right: number
  top: number
  bottom: number
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
const DEFAULT_TOP_RESERVED_PX = 48
const DEFAULT_TAG_GAP_PX = 8

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
  const fromTitle = el.getAttribute('title')
  if (fromTitle && fromTitle.trim().length > 0) {
    return fromTitle.trim()
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
  const width = Math.min(240, Math.max(92, text.length * 7 + 18))
  const rows = Math.max(1, Math.ceil((text.length * 7) / Math.max(70, width - 18)))
  const height = 10 + rows * 16
  return { width, height }
}

function boxesOverlap(left: OverlayBox, right: OverlayBox): boolean {
  return left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top
}

function collectOverlayItems(): HelpOverlayItem[] {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(CONTROL_SELECTORS))
  const itemCandidates: HelpOverlayCandidate[] = []
  const items: HelpOverlayItem[] = []
  const seen = new Set<string>()
  const placedBoxes: OverlayBox[] = []
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const viewportPadding = readRootPxVar('--mpx-tooltip-viewport-padding', DEFAULT_VIEWPORT_PADDING_PX)
  const topReserved = readRootPxVar('--mpx-help-overlay-top-reserved', DEFAULT_TOP_RESERVED_PX)
  const tagGap = readRootPxVar('--mpx-help-overlay-tag-gap', DEFAULT_TAG_GAP_PX)

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
    const centerX = clamp(candidate.rect.left + candidate.rect.width / 2, viewportPadding + width / 2, viewportWidth - viewportPadding - width / 2)
    const topPreferred = candidate.rect.top - height - tagGap
    const bottomPreferred = candidate.rect.bottom + tagGap
    const canPlaceTop = topPreferred >= topReserved
    const topBase = canPlaceTop ? topPreferred : bottomPreferred

    const minTop = topReserved
    const maxTop = Math.max(minTop, viewportHeight - viewportPadding - height)
    let top = clamp(topBase, minTop, maxTop)

    let box: OverlayBox = {
      left: centerX - width / 2,
      right: centerX + width / 2,
      top,
      bottom: top + height,
    }

    let guard = 0
    while (placedBoxes.some((placed) => boxesOverlap(box, placed)) && guard < 20) {
      const shiftedDownTop = box.bottom + tagGap
      if (shiftedDownTop + height <= maxTop) {
        top = shiftedDownTop
      } else {
        top = Math.max(minTop, box.top - (height + tagGap))
      }
      box = {
        left: centerX - width / 2,
        right: centerX + width / 2,
        top,
        bottom: top + height,
      }
      guard += 1
    }

    placedBoxes.push(box)
    items.push({
      key: candidate.key,
      text: candidate.text,
      left: centerX,
      top: box.top,
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
      attributeFilter: ['class', 'style', 'title', 'aria-label', 'hidden'],
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
          className="help-overlay-tag"
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
