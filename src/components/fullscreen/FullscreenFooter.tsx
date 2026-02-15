import { useEffect, useRef, useState, type ReactElement } from 'react'

import type { BrowserMode } from '../../types'
import { buildA11yPropsByRegistry } from '../../i18n/a11y'
import { useI18n } from '../../i18n/useI18n'
import type { AlignDirection } from './paneMath'

type FullscreenAutoplayIconName = 'autoplayOn' | 'autoplayOff'

const FULLSCREEN_AUTOPLAY_ICON_NODES: Record<FullscreenAutoplayIconName, ReactElement> = {
  autoplayOn: (
    <>
      <path d="M12 2a10 10 0 1 0 10 10" />
      <polygon points="10 8 16 12 10 16 10 8" />
      <path d="M22 12c0-5.52-4.48-10-10-10" />
    </>
  ),
  autoplayOff: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>
  ),
}

function FullscreenAutoplayIcon({ name }: { name: FullscreenAutoplayIconName }) {
  return (
    <svg aria-hidden="true" className="header-action-icon" viewBox="0 0 24 24">
      {FULLSCREEN_AUTOPLAY_ICON_NODES[name]}
    </svg>
  )
}

interface FullscreenFooterProps {
  mode: BrowserMode
  fullscreenDisplay: 'dual' | 'video-only' | 'image-only'
  fullscreenVideoFocus: boolean
  footerInfoText: string
  autoplayEnabledForFocus: boolean
  autoPlayEnabled: boolean
  autoPlayInterval: number
  zoomEnabled: boolean
  zoomPercent: number
  onToggleDualDisplay: () => void
  onToggleSwapSides: () => void
  onStepFocusedPane: (delta: -1 | 1) => void
  onPrevPackage: () => void
  onNextPackage: () => void
  onToggleAutoplay: () => void
  onSetAutoplayInterval: (seconds: number) => void
  onAlignFocusedPane: (direction: AlignDirection) => void
  onZoomOut: () => void
  onZoomIn: () => void
  onResetSinglePane: () => void
  onExit: () => void
}

export function FullscreenFooter({
  mode,
  fullscreenDisplay,
  fullscreenVideoFocus,
  footerInfoText,
  autoplayEnabledForFocus,
  autoPlayEnabled,
  autoPlayInterval,
  zoomEnabled,
  zoomPercent,
  onToggleDualDisplay,
  onToggleSwapSides,
  onStepFocusedPane,
  onPrevPackage,
  onNextPackage,
  onToggleAutoplay,
  onSetAutoplayInterval,
  onAlignFocusedPane,
  onZoomOut,
  onZoomIn,
  onResetSinglePane,
  onExit,
}: FullscreenFooterProps) {
  const { t } = useI18n()
  const [openAutoplayPopover, setOpenAutoplayPopover] = useState(false)
  const [autoPlayDraftValue, setAutoPlayDraftValue] = useState(Math.max(1, Math.min(9, Math.round(autoPlayInterval))))
  const autoplayPopoverHideTimerRef = useRef<number | null>(null)

  useEffect(() => {
    setAutoPlayDraftValue(Math.max(1, Math.min(9, Math.round(autoPlayInterval))))
  }, [autoPlayInterval])

  useEffect(() => {
    if (autoplayEnabledForFocus) {
      return
    }
    setOpenAutoplayPopover(false)
  }, [autoplayEnabledForFocus])

  const clearAutoplayPopoverHideTimer = () => {
    if (autoplayPopoverHideTimerRef.current != null) {
      window.clearTimeout(autoplayPopoverHideTimerRef.current)
      autoplayPopoverHideTimerRef.current = null
    }
  }

  const openAutoplayPopoverByHover = () => {
    if (!autoplayEnabledForFocus) {
      return
    }
    clearAutoplayPopoverHideTimer()
    setOpenAutoplayPopover(true)
  }

  const closeAutoplayPopoverByHover = () => {
    clearAutoplayPopoverHideTimer()
    autoplayPopoverHideTimerRef.current = window.setTimeout(() => {
      setOpenAutoplayPopover(false)
      autoplayPopoverHideTimerRef.current = null
    }, 140)
  }

  useEffect(
    () => () => {
      clearAutoplayPopoverHideTimer()
    },
    [],
  )

  return (
    <footer className="fullscreen-footer">
      <div className="fullscreen-meta-line">{footerInfoText}</div>
      <div className="fullscreen-group">
        <button className={fullscreenDisplay === 'dual' ? 'is-active' : ''} type="button" onClick={onToggleDualDisplay}>
          {fullscreenDisplay === 'dual' ? t('ui.fullscreen.singleDisplay') : t('ui.fullscreen.dualDisplay')}
        </button>
        <button type="button" disabled={fullscreenDisplay !== 'dual'} onClick={onToggleSwapSides}>
          {t('ui.fullscreen.swapSides')}
        </button>
        <span className="fullscreen-focus-text">
          {fullscreenDisplay === 'dual'
            ? t('ui.fullscreen.focusDual', {
                focus: fullscreenVideoFocus ? t('ui.fullscreen.focusVideo') : t('ui.fullscreen.focusImage'),
              })
            : t('ui.fullscreen.focusSingle')}
        </span>
      </div>

      <div className="fullscreen-group">
        <button type="button" onClick={() => onStepFocusedPane(-1)}>
          {t('ui.fullscreen.prevPage')}
        </button>
        <button type="button" onClick={() => onStepFocusedPane(1)}>
          {t('ui.fullscreen.nextPage')}
        </button>
        <button type="button" disabled={mode !== 'image'} onClick={onPrevPackage}>
          {t('ui.fullscreen.prevPackage')}
        </button>
        <button type="button" disabled={mode !== 'image'} onClick={onNextPackage}>
          {t('ui.fullscreen.nextPackage')}
        </button>
        <div
          className={`header-popover-control header-popover-control--upward fullscreen-autoplay-control ${openAutoplayPopover ? 'is-open' : ''}`}
          role="group"
          aria-label={t('a11y.header.autoPlayGroup')}
          onMouseEnter={openAutoplayPopoverByHover}
          onMouseLeave={closeAutoplayPopoverByHover}
        >
          <button
            {...buildA11yPropsByRegistry({ key: 'headerAutoPlay', t })}
            aria-pressed={autoPlayEnabled}
            className={`header-popover-trigger auto-play-toggle-btn ${autoPlayEnabled ? 'is-active' : ''}`}
            disabled={!autoplayEnabledForFocus}
            type="button"
            onClick={onToggleAutoplay}
          >
            <FullscreenAutoplayIcon name={autoPlayEnabled ? 'autoplayOn' : 'autoplayOff'} />
          </button>

          <div
            className="header-popover-panel header-popover-panel--upward fullscreen-autoplay-popover"
            hidden={!openAutoplayPopover || !autoplayEnabledForFocus}
            role="dialog"
            aria-label={t('a11y.header.autoPlaySettings')}
          >
            <div className="header-vertical-slider" role="group" aria-label={t('a11y.header.autoPlayLevels')}>
              <div className="header-vertical-slider-value">{Math.max(1, Math.min(9, Math.round(autoPlayDraftValue)))}</div>
              <div className="header-vertical-slider-body">
                <input
                  {...buildA11yPropsByRegistry({ key: 'headerAutoPlaySlider', t })}
                  className="header-vertical-range header-vertical-range--ascending-up"
                  max={9}
                  min={1}
                  step={0.01}
                  type="range"
                  value={autoPlayDraftValue}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value)
                    setAutoPlayDraftValue(nextValue)
                    const roundedLevel = Math.max(1, Math.min(9, Math.round(nextValue)))
                    onSetAutoplayInterval(roundedLevel)
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fullscreen-group">
        <button type="button" onClick={() => onAlignFocusedPane('up')}>
          {t('ui.fullscreen.alignUp')}
        </button>
        <button type="button" onClick={() => onAlignFocusedPane('down')}>
          {t('ui.fullscreen.alignDown')}
        </button>
        <button type="button" onClick={() => onAlignFocusedPane('left')}>
          {t('ui.fullscreen.alignLeft')}
        </button>
        <button type="button" onClick={() => onAlignFocusedPane('right')}>
          {t('ui.fullscreen.alignRight')}
        </button>
        <button type="button" disabled={!zoomEnabled} onClick={onZoomOut}>
          {t('ui.fullscreen.zoomOut')}
        </button>
        <span className="fullscreen-zoom-text">{zoomEnabled ? `${zoomPercent}%` : '-'}</span>
        <button type="button" disabled={!zoomEnabled} onClick={onZoomIn}>
          {t('ui.fullscreen.zoomIn')}
        </button>
        <button type="button" disabled={!zoomEnabled} onClick={onResetSinglePane}>
          {t('ui.fullscreen.reset')}
        </button>
        <button type="button" onClick={onExit}>
          {t('ui.fullscreen.exit')}
        </button>
      </div>
    </footer>
  )
}
