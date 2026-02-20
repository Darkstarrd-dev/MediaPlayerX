import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react'

import type { BrowserMode } from '../../types'
import { buildA11yPropsByRegistry } from '../../i18n/a11y'
import { useI18n } from '../../i18n/useI18n'
import type { AlignDirection } from './paneMath'
import { FullscreenMetaMarquee } from './FullscreenMetaMarquee'
import { MainUiIcon } from '../MainUiIcon'
import { VideoControlIcon } from '../VideoControlIcon'

type FullscreenAutoplayIconName = 'autoplayOn' | 'autoplayOff'
type FullscreenFooterIconName =
  | 'swapSides'
  | 'pagePrev'
  | 'pageNext'
  | 'packagePrev'
  | 'packageNext'
  | 'alignUp'
  | 'alignDown'
  | 'alignLeft'
  | 'alignRight'
  | 'zoomPlus'
  | 'alignReset'

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

const FULLSCREEN_FOOTER_ICON_NODES: Record<FullscreenFooterIconName, ReactElement> = {
  swapSides: (
    <>
      <path d="M8 3 4 7l4 4" />
      <path d="M4 7h16" />
      <path d="m16 21 4-4-4-4" />
      <path d="M20 17H4" />
    </>
  ),
  pagePrev: <path d="m15 18-6-6 6-6" />,
  pageNext: <path d="m9 18 6-6-6-6" />,
  packagePrev: (
    <>
      <path d="m11 17-5-5 5-5" />
      <path d="m18 17-5-5 5-5" />
    </>
  ),
  packageNext: (
    <>
      <path d="m13 17 5-5-5-5" />
      <path d="m6 17 5-5-5-5" />
    </>
  ),
  alignUp: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <rect x="7" y="7" width="10" height="4" rx="1" fill="currentColor" fillOpacity="0.2" stroke="none" />
    </>
  ),
  alignDown: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <rect x="7" y="13" width="10" height="4" rx="1" fill="currentColor" fillOpacity="0.2" stroke="none" />
    </>
  ),
  alignLeft: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <rect x="7" y="7" width="4" height="10" rx="1" fill="currentColor" fillOpacity="0.2" stroke="none" />
    </>
  ),
  alignRight: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <rect x="13" y="7" width="4" height="10" rx="1" fill="currentColor" fillOpacity="0.2" stroke="none" />
    </>
  ),
  zoomPlus: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
      <path d="M11 8v6" />
      <path d="M8 11h6" />
    </>
  ),
  alignReset: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M12 3v18M3 12h18" strokeWidth="1" opacity="0.3" />
      <rect x="8" y="8" width="8" height="8" rx="1" fill="currentColor" fillOpacity="0.2" stroke="none" />
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

function FullscreenFooterIcon({ name }: { name: FullscreenFooterIconName }) {
  return (
    <svg aria-hidden="true" className="header-action-icon" viewBox="0 0 24 24">
      {FULLSCREEN_FOOTER_ICON_NODES[name]}
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
  controlsWidth?: number
  compact?: boolean
  hideRightGroup?: boolean
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
  controlsWidth,
  compact = false,
  hideRightGroup = false,
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

  const footerStyle =
    Number.isFinite(controlsWidth) && typeof controlsWidth === 'number'
      ? ({ '--mpx-fullscreen-controls-width': `${Math.max(120, Math.round(controlsWidth))}px` } as CSSProperties)
      : undefined

  return (
    <footer
      className={`fullscreen-footer fullscreen-controls-shell ${fullscreenDisplay === 'dual' ? 'is-dual' : 'is-single'}${mode === 'image' ? ' is-image-mode' : ''}${compact ? ' is-compact' : ''}${hideRightGroup ? ' is-hide-right-group' : ''}`}
      data-slot="fs-image-controls-shell"
      style={footerStyle}
      onMouseDown={(event) => {
        event.stopPropagation()
      }}
      onPointerDown={(event) => {
        event.stopPropagation()
      }}
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
            <span className="fullscreen-action-content">
              <FullscreenFooterIcon name="swapSides" />
            </span>
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
              data-slot="fs-image-controls-autoplay-pop"
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
              aria-label={zoomPercent === 100 ? t('ui.fullscreen.zoomIn') : t('ui.fullscreen.reset')}
              className="video-action-btn fullscreen-action-btn header-popover-trigger"
              disabled={!zoomEnabled}
              type="button"
              title={zoomPercent === 100 ? t('ui.fullscreen.zoomIn') : t('ui.fullscreen.reset')}
              onClick={() => {
                setZoomDraftValue(100)
                onSetZoomPercent(100)
              }}
            >
              <span className="fullscreen-action-content">
                {zoomPercent === 100 ? <FullscreenFooterIcon name="zoomPlus" /> : <MainUiIcon name="return" />}
              </span>
            </button>

            <div
              className="header-popover-panel header-popover-panel--upward fullscreen-zoom-popover"
              data-slot="fs-image-controls-zoom-pop"
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
          <button aria-label={t('ui.fullscreen.prevPage')} className="video-action-btn fullscreen-action-btn fullscreen-action-page" type="button" onClick={() => onStepFocusedPane(-1)}>
            <span className="fullscreen-action-content">
              <FullscreenFooterIcon name="pagePrev" />
            </span>
          </button>
          <button aria-label={t('ui.fullscreen.nextPage')} className="video-action-btn fullscreen-action-btn fullscreen-action-page" type="button" onClick={() => onStepFocusedPane(1)}>
            <span className="fullscreen-action-content">
              <FullscreenFooterIcon name="pageNext" />
            </span>
          </button>
          <button aria-label={t('ui.fullscreen.prevPackage')} className="video-action-btn fullscreen-action-btn fullscreen-action-page" type="button" disabled={mode !== 'image'} onClick={onPrevPackage}>
            <span className="fullscreen-action-content">
              <FullscreenFooterIcon name="packagePrev" />
            </span>
          </button>
          <button aria-label={t('ui.fullscreen.nextPackage')} className="video-action-btn fullscreen-action-btn fullscreen-action-page" type="button" disabled={mode !== 'image'} onClick={onNextPackage}>
            <span className="fullscreen-action-content">
              <FullscreenFooterIcon name="packageNext" />
            </span>
          </button>
        </div>

        {!hideRightGroup ? <div className="fullscreen-group is-right">
          <button aria-label={t('ui.fullscreen.alignUp')} className="video-action-btn fullscreen-action-btn" type="button" onClick={() => onAlignFocusedPane('up')}>
            <span className="fullscreen-action-content">
              <FullscreenFooterIcon name="alignUp" />
            </span>
          </button>
          <button aria-label={t('ui.fullscreen.alignDown')} className="video-action-btn fullscreen-action-btn" type="button" onClick={() => onAlignFocusedPane('down')}>
            <span className="fullscreen-action-content">
              <FullscreenFooterIcon name="alignDown" />
            </span>
          </button>
          <button aria-label={t('ui.fullscreen.alignLeft')} className="video-action-btn fullscreen-action-btn" type="button" onClick={() => onAlignFocusedPane('left')}>
            <span className="fullscreen-action-content">
              <FullscreenFooterIcon name="alignLeft" />
            </span>
          </button>
          <button aria-label={t('ui.fullscreen.alignRight')} className="video-action-btn fullscreen-action-btn" type="button" onClick={() => onAlignFocusedPane('right')}>
            <span className="fullscreen-action-content">
              <FullscreenFooterIcon name="alignRight" />
            </span>
          </button>
          <button
            aria-label={t('ui.fullscreen.alignCenter')}
            className="video-action-btn fullscreen-action-btn"
            title={t('ui.fullscreen.alignCenter')}
            type="button"
            disabled={!zoomEnabled}
            onClick={onResetSinglePane}
          >
            <span className="fullscreen-action-content">
              <FullscreenFooterIcon name="alignReset" />
            </span>
          </button>
        </div> : null}
      </div>
    </footer>
  )
}
