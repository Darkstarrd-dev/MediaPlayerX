import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement } from 'react'

import type { BrowserMode } from '../../types'
import { buildA11yPropsByRegistry } from '../../i18n/a11y'
import { useI18n } from '../../i18n/useI18n'
import type { AlignDirection } from './paneMath'
import { VideoControlIcon } from '../VideoControlIcon'
import { MainUiIcon } from '../MainUiIcon'

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
  footerInfoLeftText: string
  footerInfoRightText: string | null
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
  onSetZoomPercent: (percent: number) => void
  onResetSinglePane: () => void
  onHoverStateChange: (hovering: boolean) => void
  onExit: () => void
}

const FULLSCREEN_ZOOM_LEVELS = [200, 175, 150, 125, 100, 75, 50, 25, 10] as const

function resolveNearestZoomLevel(value: number): number {
  let nearest: number = FULLSCREEN_ZOOM_LEVELS[0]
  let minDiff = Math.abs(value - nearest)
  for (let index = 1; index < FULLSCREEN_ZOOM_LEVELS.length; index += 1) {
    const level: number = FULLSCREEN_ZOOM_LEVELS[index]
    const diff = Math.abs(value - level)
    if (diff < minDiff) {
      nearest = level
      minDiff = diff
    }
  }
  return nearest
}

function FullscreenMetaMarquee({ text }: { text: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const textRef = useRef<HTMLSpanElement | null>(null)
  const [overflowing, setOverflowing] = useState(false)

  useEffect(() => {
    const hostElement = hostRef.current
    const textElement = textRef.current
    if (!hostElement || !textElement) {
      return
    }

    const updateOverflowState = () => {
      setOverflowing(textElement.scrollWidth > hostElement.clientWidth)
    }

    updateOverflowState()
    window.addEventListener('resize', updateOverflowState)

    const resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => updateOverflowState())
      : null
    if (resizeObserver) {
      resizeObserver.observe(hostElement)
      resizeObserver.observe(textElement)
    }

    return () => {
      window.removeEventListener('resize', updateOverflowState)
      resizeObserver?.disconnect()
    }
  }, [text])

  const marqueeStyle = useMemo(
    () => ({ '--mpx-fullscreen-marquee-duration': `${Math.max(8, Math.min(30, Math.round(text.length * 0.24)))}s` }) as CSSProperties,
    [text.length],
  )

  return (
    <div className={`fullscreen-meta-marquee ${overflowing ? 'is-overflow' : ''}`} ref={hostRef} style={marqueeStyle}>
      <span className="fullscreen-meta-marquee-item" ref={textRef}>{text}</span>
      {overflowing ? <span aria-hidden="true" className="fullscreen-meta-marquee-item">{text}</span> : null}
    </div>
  )
}

export function FullscreenFooter({
  mode,
  fullscreenDisplay,
  footerInfoLeftText,
  footerInfoRightText,
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
  onSetZoomPercent,
  onResetSinglePane,
  onHoverStateChange,
  onExit,
}: FullscreenFooterProps) {
  const { t } = useI18n()
  const [openAutoplayPopover, setOpenAutoplayPopover] = useState(false)
  const [openZoomPopover, setOpenZoomPopover] = useState(false)
  const [autoPlayDraftValue, setAutoPlayDraftValue] = useState(Math.max(1, Math.min(9, Math.round(autoPlayInterval))))
  const [zoomDraftValue, setZoomDraftValue] = useState(resolveNearestZoomLevel(zoomPercent))
  const autoplayPopoverHideTimerRef = useRef<number | null>(null)
  const zoomPopoverHideTimerRef = useRef<number | null>(null)

  useEffect(() => {
    setAutoPlayDraftValue(Math.max(1, Math.min(9, Math.round(autoPlayInterval))))
  }, [autoPlayInterval])

  useEffect(() => {
    setZoomDraftValue(resolveNearestZoomLevel(zoomPercent))
  }, [zoomPercent])

  useEffect(() => {
    if (autoplayEnabledForFocus) {
      return
    }
    setOpenAutoplayPopover(false)
  }, [autoplayEnabledForFocus])

  useEffect(() => {
    if (zoomEnabled) {
      return
    }
    setOpenZoomPopover(false)
  }, [zoomEnabled])

  const clearAutoplayPopoverHideTimer = () => {
    if (autoplayPopoverHideTimerRef.current != null) {
      window.clearTimeout(autoplayPopoverHideTimerRef.current)
      autoplayPopoverHideTimerRef.current = null
    }
  }

  const clearZoomPopoverHideTimer = () => {
    if (zoomPopoverHideTimerRef.current != null) {
      window.clearTimeout(zoomPopoverHideTimerRef.current)
      zoomPopoverHideTimerRef.current = null
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

  const openZoomPopoverByHover = () => {
    if (!zoomEnabled) {
      return
    }
    clearZoomPopoverHideTimer()
    setOpenZoomPopover(true)
  }

  const closeZoomPopoverByHover = () => {
    clearZoomPopoverHideTimer()
    zoomPopoverHideTimerRef.current = window.setTimeout(() => {
      setOpenZoomPopover(false)
      zoomPopoverHideTimerRef.current = null
    }, 140)
  }

  useEffect(
    () => () => {
      clearAutoplayPopoverHideTimer()
      clearZoomPopoverHideTimer()
    },
    [],
  )

  return (
    <footer
      className={`fullscreen-footer ${fullscreenDisplay === 'dual' ? 'is-dual' : 'is-single'}`}
      onMouseEnter={() => onHoverStateChange(true)}
      onMouseLeave={() => onHoverStateChange(false)}
    >
      <div className={`fullscreen-meta-row ${footerInfoRightText ? 'is-dual' : 'is-single'}`}>
        <div className="fullscreen-meta-line">
          <div className="fullscreen-meta-line-segment">
            <FullscreenMetaMarquee text={footerInfoLeftText} />
          </div>
        </div>
        {footerInfoRightText ? (
          <div className="fullscreen-meta-line">
            <div className="fullscreen-meta-line-segment">
              <FullscreenMetaMarquee text={footerInfoRightText} />
            </div>
          </div>
        ) : null}
      </div>

      <div className="fullscreen-controls-row">
        <div className="fullscreen-group is-left">
          <button aria-label={fullscreenDisplay === 'dual' ? t('ui.fullscreen.singleDisplay') : t('ui.fullscreen.dualDisplay')} className={`video-action-btn fullscreen-action-btn ${fullscreenDisplay === 'dual' ? 'is-active' : ''}`} type="button" onClick={onToggleDualDisplay}>
            <span className="fullscreen-action-content">
              <VideoControlIcon name="dual" />
            </span>
          </button>
          <button aria-label={t('ui.fullscreen.swapSides')} className="video-action-btn fullscreen-action-btn" type="button" disabled={fullscreenDisplay !== 'dual'} onClick={onToggleSwapSides}>
            <span className="fullscreen-action-content">S</span>
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
              className={`video-action-btn fullscreen-action-btn header-popover-trigger auto-play-toggle-btn ${autoPlayEnabled ? 'is-active' : ''}`}
              disabled={!autoplayEnabledForFocus}
              type="button"
              onClick={onToggleAutoplay}
            >
              <span className="fullscreen-action-content">
                <FullscreenAutoplayIcon name={autoPlayEnabled ? 'autoplayOn' : 'autoplayOff'} />
              </span>
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

          <div
            className={`header-popover-control header-popover-control--upward fullscreen-zoom-control ${openZoomPopover ? 'is-open' : ''}`}
            role="group"
            aria-label={t('ui.fullscreen.zoomIn')}
            onMouseEnter={openZoomPopoverByHover}
            onMouseLeave={closeZoomPopoverByHover}
          >
            <button
              aria-label={t('ui.fullscreen.reset')}
              className="video-action-btn fullscreen-action-btn header-popover-trigger"
              disabled={!zoomEnabled}
              type="button"
              onClick={() => {
                setZoomDraftValue(100)
                onSetZoomPercent(100)
              }}
            >
              <span className="fullscreen-action-content">100</span>
            </button>

            <div
              className="header-popover-panel header-popover-panel--upward fullscreen-zoom-popover"
              hidden={!openZoomPopover || !zoomEnabled}
              role="dialog"
              aria-label={t('ui.fullscreen.zoomIn')}
            >
              <div className="header-vertical-slider" role="group" aria-label={t('ui.fullscreen.zoomIn')}>
                <div className="header-vertical-slider-value">{zoomDraftValue}%</div>
                <div className="header-vertical-slider-body">
                  <input
                    aria-label={t('ui.fullscreen.zoomIn')}
                    className="header-vertical-range header-vertical-range--ascending-up"
                    max={200}
                    min={10}
                    step={1}
                    type="range"
                    value={zoomDraftValue}
                    onChange={(event) => {
                      const rawValue = Number(event.target.value)
                      const nextLevel = resolveNearestZoomLevel(rawValue)
                      setZoomDraftValue(nextLevel)
                      onSetZoomPercent(nextLevel)
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <button aria-label={t('ui.fullscreen.exit')} className="video-action-btn fullscreen-action-btn" type="button" onClick={onExit}>
            <span className="fullscreen-action-content">
              <VideoControlIcon name="fullscreenCompress" />
            </span>
          </button>
        </div>

        <div className="fullscreen-group is-center">
          <button aria-label={t('ui.fullscreen.prevPage')} className="video-action-btn fullscreen-action-btn" type="button" onClick={() => onStepFocusedPane(-1)}>
            <span className="fullscreen-action-content">P</span>
          </button>
          <button aria-label={t('ui.fullscreen.nextPage')} className="video-action-btn fullscreen-action-btn" type="button" onClick={() => onStepFocusedPane(1)}>
            <span className="fullscreen-action-content">N</span>
          </button>
          <button aria-label={t('ui.fullscreen.prevPackage')} className="video-action-btn fullscreen-action-btn" type="button" disabled={mode !== 'image'} onClick={onPrevPackage}>
            <span className="fullscreen-action-content">PF</span>
          </button>
          <button aria-label={t('ui.fullscreen.nextPackage')} className="video-action-btn fullscreen-action-btn" type="button" disabled={mode !== 'image'} onClick={onNextPackage}>
            <span className="fullscreen-action-content">NF</span>
          </button>
        </div>

        <div className="fullscreen-group is-right">
          <button aria-label={t('ui.fullscreen.alignUp')} className="video-action-btn fullscreen-action-btn" type="button" onClick={() => onAlignFocusedPane('up')}>
            <span className="fullscreen-action-content">↑</span>
          </button>
          <button aria-label={t('ui.fullscreen.alignDown')} className="video-action-btn fullscreen-action-btn" type="button" onClick={() => onAlignFocusedPane('down')}>
            <span className="fullscreen-action-content">↓</span>
          </button>
          <button aria-label={t('ui.fullscreen.alignLeft')} className="video-action-btn fullscreen-action-btn" type="button" onClick={() => onAlignFocusedPane('left')}>
            <span className="fullscreen-action-content">←</span>
          </button>
          <button aria-label={t('ui.fullscreen.alignRight')} className="video-action-btn fullscreen-action-btn" type="button" onClick={() => onAlignFocusedPane('right')}>
            <span className="fullscreen-action-content">→</span>
          </button>
          <button
            aria-label={t('a11y.common.restoreDefault')}
            className="video-action-btn fullscreen-action-btn"
            title={t('tip.common.restoreDefault')}
            type="button"
            disabled={!zoomEnabled}
            onClick={onResetSinglePane}
          >
            <span className="fullscreen-action-content">
              <MainUiIcon name="return" />
            </span>
          </button>
        </div>
      </div>
    </footer>
  )
}
