import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react'

import type { BrowserMode } from '../../types'
import { buildA11yPropsByRegistry } from '../../i18n/a11y'
import { useI18n } from '../../i18n/useI18n'
import type { AlignDirection } from './paneMath'
import { FullscreenMetaMarquee } from './FullscreenMetaMarquee'
import { MainUiIcon } from '../MainUiIcon'
import { VideoControlIcon } from '../VideoControlIcon'
import { SkeuoRunway } from '../primitives/SkeuoRunway'
import type { ImageConvertAdjustProfile } from '../../features/app/useAppSessionState'

const IMAGE_CONVERT_FORMAT_OPTIONS = ['webp', 'jpeg', 'png', 'avif'] as const
type ImageConvertFormat = (typeof IMAGE_CONVERT_FORMAT_OPTIONS)[number]

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
  popoverDebugPinned?: boolean
  controlsWidth?: number
  compact?: boolean
  hideRightGroup?: boolean
  imageConvertPreviewMode?: boolean
  imageConvertPreviewScale?: number
  imageConvertPreviewLongestEdgePx?: number | null
  imageConvertPreviewFormat?: ImageConvertFormat
  imageConvertPreviewQuality?: number
  imageConvertPreviewAdjustProfile?: ImageConvertAdjustProfile
  showImageConvertAdjustPanel?: boolean
  canApplyScaleToLongestEdge?: boolean
  onChangeImageConvertPreviewScale?: (value: number) => void
  onChangeImageConvertPreviewFormat?: (value: ImageConvertFormat) => void
  onChangeImageConvertPreviewQuality?: (value: number) => void
  onApplyImageConvertPreviewScaleToLongestEdge?: () => void
  onToggleImageConvertAdjustPanel?: () => void
  onConfirmImageConvertPreview?: () => void
  onCancelImageConvertPreview?: () => void
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
  popoverDebugPinned = false,
  controlsWidth,
  compact = false,
  hideRightGroup = false,
  imageConvertPreviewMode = false,
  imageConvertPreviewScale = 1,
  imageConvertPreviewLongestEdgePx = null,
  imageConvertPreviewFormat = 'webp',
  imageConvertPreviewQuality = 80,
  imageConvertPreviewAdjustProfile = {
    mode: 'basic',
    brightness: 0,
    contrast: 0,
    level_input_black: 0,
    level_input_white: 255,
    level_gamma: 1,
    curve_shadow_x: 64,
    curve_midtone_x: 128,
    curve_highlight_x: 192,
    curve_shadow: 0,
    curve_midtone: 0,
    curve_highlight: 0,
  },
  showImageConvertAdjustPanel = false,
  canApplyScaleToLongestEdge = false,
  onChangeImageConvertPreviewScale,
  onChangeImageConvertPreviewFormat,
  onChangeImageConvertPreviewQuality,
  onApplyImageConvertPreviewScaleToLongestEdge,
  onToggleImageConvertAdjustPanel,
  onConfirmImageConvertPreview,
  onCancelImageConvertPreview,
}: FullscreenFooterProps) {
  const { t } = useI18n()
  const [openAutoplayPopover, setOpenAutoplayPopover] = useState(false)
  const [openZoomPopover, setOpenZoomPopover] = useState(false)
  const [openPreviewScalePopover, setOpenPreviewScalePopover] = useState(false)
  const [openPreviewFormatPopover, setOpenPreviewFormatPopover] = useState(false)
  const [openPreviewQualityPopover, setOpenPreviewQualityPopover] = useState(false)
  const [previewScaleDraftValue, setPreviewScaleDraftValue] = useState(
    Math.max(0.1, Math.min(1, Number(imageConvertPreviewScale.toFixed(1)))),
  )
  const [previewQualityDraftValue, setPreviewQualityDraftValue] = useState(
    Math.max(10, Math.min(100, Math.round(imageConvertPreviewQuality))),
  )
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
    setPreviewScaleDraftValue(Math.max(0.1, Math.min(1, Number(imageConvertPreviewScale.toFixed(1)))))
  }, [imageConvertPreviewScale])

  useEffect(() => {
    setPreviewQualityDraftValue(Math.max(10, Math.min(100, Math.round(imageConvertPreviewQuality))))
  }, [imageConvertPreviewQuality])

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

  useEffect(() => {
    if (imageConvertPreviewMode) {
      return
    }
    setOpenPreviewScalePopover(false)
    setOpenPreviewFormatPopover(false)
    setOpenPreviewQualityPopover(false)
  }, [imageConvertPreviewMode])

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
    if (popoverDebugPinned) {
      return
    }
    if (!autoplayEnabledForFocus) {
      return
    }
    clearAutoplayPopoverHideTimer()
    setOpenAutoplayPopover(true)
  }

  const closeAutoplayPopoverByHover = () => {
    if (popoverDebugPinned) {
      return
    }
    clearAutoplayPopoverHideTimer()
    autoplayPopoverHideTimerRef.current = window.setTimeout(() => {
      setOpenAutoplayPopover(false)
      autoplayPopoverHideTimerRef.current = null
    }, 140)
  }

  const openZoomPopoverByHover = () => {
    if (popoverDebugPinned) {
      return
    }
    if (!zoomEnabled) {
      return
    }
    clearZoomPopoverHideTimer()
    setOpenZoomPopover(true)
  }

  const closeZoomPopoverByHover = () => {
    if (popoverDebugPinned) {
      return
    }
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

  const commitPreviewScaleDraft = () => {
    onChangeImageConvertPreviewScale?.(Math.max(0.1, Math.min(1, Number(previewScaleDraftValue.toFixed(1)))))
  }

  const commitPreviewQualityDraft = () => {
    onChangeImageConvertPreviewQuality?.(Math.max(10, Math.min(100, Math.round(previewQualityDraftValue))))
  }
  const showAutoplayPopover = popoverDebugPinned || openAutoplayPopover
  const showZoomPopover = popoverDebugPinned || openZoomPopover
  const showPreviewScalePopover = popoverDebugPinned || openPreviewScalePopover
  const showPreviewFormatPopover = popoverDebugPinned || openPreviewFormatPopover
  const showPreviewQualityPopover = popoverDebugPinned || openPreviewQualityPopover
  const autoplayRangePercent = Math.max(0, Math.min(100, ((autoPlayDraftValue - 1) / 8) * 100))
  const zoomRangePercent = Math.max(0, Math.min(100, ((zoomDraftValue - 10) / 190) * 100))

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
          {imageConvertPreviewMode ? null : (
            <>
              <button aria-label={fullscreenDisplay === 'dual' ? t('ui.fullscreen.singleDisplay') : t('ui.fullscreen.dualDisplay')} className={`video-action-btn fullscreen-action-btn ${fullscreenDisplay === 'dual' ? 'is-active' : ''}`} type="button" data-tooltip-label={fullscreenDisplay === 'dual' ? t('ui.fullscreen.singleDisplay') : t('ui.fullscreen.dualDisplay')} onClick={onToggleDualDisplay}>
                <span className="fullscreen-action-content">
                  <VideoControlIcon name="dual" />
                </span>
              </button>
              <button aria-label={t('ui.fullscreen.swapSides')} className="video-action-btn fullscreen-action-btn" type="button" data-tooltip-label={t('ui.fullscreen.swapSides')} disabled={fullscreenDisplay !== 'dual'} onClick={onToggleSwapSides}>
                <span className="fullscreen-action-content">
                  <FullscreenFooterIcon name="swapSides" />
                </span>
              </button>

              <div
                className={`header-popover-control header-popover-control--upward fullscreen-autoplay-control ${showAutoplayPopover ? 'is-open' : ''}`}
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
                  hidden={!showAutoplayPopover || !autoplayEnabledForFocus}
                  role="dialog"
                  aria-label={t('a11y.header.autoPlaySettings')}
                >
                  <div className="header-vertical-slider" role="group" aria-label={t('a11y.header.autoPlayLevels')}>
                    <div className="header-vertical-slider-value">{Math.max(1, Math.min(9, Math.round(autoPlayDraftValue)))}</div>
                    <div className="header-vertical-slider-body">
                      <div className="video-ctrl-volume-axis">
                        <SkeuoRunway
                          ariaLabel={t('a11y.header.autoPlaySlider')}
                          className="is-volume"
                          fillTone="graphite"
                          inputClassName="video-ctrl-volume-range"
                          max={9}
                          min={1}
                          rangePercent={autoplayRangePercent}
                          step={0.01}
                          thumbTone="graphite"
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
            </>
          )}

          {imageConvertPreviewMode ? (
            <>
              <div
                className={`header-popover-control header-popover-control--upward ${showPreviewScalePopover ? 'is-open' : ''}`}
                onMouseEnter={() => setOpenPreviewScalePopover(true)}
                onMouseLeave={() => {
                  if (popoverDebugPinned) {
                    return
                  }
                  commitPreviewScaleDraft()
                  setOpenPreviewScalePopover(false)
                }}
              >
                <button
                  className="video-action-btn fullscreen-action-btn header-popover-trigger"
                  type="button"
                  data-tooltip-label={imageConvertPreviewLongestEdgePx != null ? `LongestEdge ${Math.round(imageConvertPreviewLongestEdgePx)} (scale disabled)` : `Scale ${imageConvertPreviewScale.toFixed(1)}`}
                  disabled={imageConvertPreviewLongestEdgePx != null}
                >
                  <span className="fullscreen-action-content">S</span>
                </button>
                <div className="header-popover-panel header-popover-panel--upward" hidden={!showPreviewScalePopover} role="dialog" aria-label="Scale">
                  <div className="header-vertical-slider" role="group" aria-label="Scale levels">
                    <div className="header-vertical-slider-value">{previewScaleDraftValue.toFixed(1)}</div>
                    <div className="header-vertical-slider-body">
                      <input
                        className="header-vertical-range header-vertical-range--ascending-up"
                        max={1}
                        min={0.1}
                        step={0.1}
                        type="range"
                        value={previewScaleDraftValue}
                        disabled={imageConvertPreviewLongestEdgePx != null}
                        onChange={(event) => {
                          setPreviewScaleDraftValue(Number(event.target.value))
                        }}
                        onMouseUp={commitPreviewScaleDraft}
                        onTouchEnd={commitPreviewScaleDraft}
                        onKeyUp={(event) => {
                          if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                            commitPreviewScaleDraft()
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                className="video-action-btn fullscreen-action-btn"
                type="button"
                data-tooltip-label="应用当前缩放结果到 Longest Edge"
                disabled={!canApplyScaleToLongestEdge}
                onClick={() => {
                  onApplyImageConvertPreviewScaleToLongestEdge?.()
                }}
              >
                <span className="fullscreen-action-content">AS</span>
              </button>

              <div className={`header-popover-control header-popover-control--upward ${showPreviewFormatPopover ? 'is-open' : ''}`} onMouseEnter={() => setOpenPreviewFormatPopover(true)} onMouseLeave={() => {
                if (popoverDebugPinned) {
                  return
                }
                setOpenPreviewFormatPopover(false)
              }}>
                <button className="video-action-btn fullscreen-action-btn header-popover-trigger" type="button" data-tooltip-label={`Format ${imageConvertPreviewFormat.toUpperCase()}`}>
                  <span className="fullscreen-action-content">F</span>
                </button>
                <div className="header-popover-panel header-popover-panel--upward fullscreen-convert-format-popover" hidden={!showPreviewFormatPopover} role="dialog" aria-label="Format">
                  <div className="fullscreen-convert-format-options" role="group" aria-label="Format options">
                    {IMAGE_CONVERT_FORMAT_OPTIONS.map((option) => (
                      <button
                        key={option}
                        className={`fullscreen-convert-format-btn ${option === imageConvertPreviewFormat ? 'is-active' : ''}`}
                        type="button"
                        onClick={() => onChangeImageConvertPreviewFormat?.(option)}
                      >
                        {option.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className={`header-popover-control header-popover-control--upward ${showPreviewQualityPopover ? 'is-open' : ''}`}
                onMouseEnter={() => setOpenPreviewQualityPopover(true)}
                onMouseLeave={() => {
                  if (popoverDebugPinned) {
                    return
                  }
                  commitPreviewQualityDraft()
                  setOpenPreviewQualityPopover(false)
                }}
              >
                <button className="video-action-btn fullscreen-action-btn header-popover-trigger" type="button" data-tooltip-label={`Quality ${imageConvertPreviewQuality}`}>
                  <span className="fullscreen-action-content">Q</span>
                </button>
                <div className="header-popover-panel header-popover-panel--upward" hidden={!showPreviewQualityPopover} role="dialog" aria-label="Quality">
                  <div className="header-vertical-slider" role="group" aria-label="Quality levels">
                    <div className="header-vertical-slider-value">{Math.round(previewQualityDraftValue)}</div>
                    <div className="header-vertical-slider-body">
                      <input
                        className="header-vertical-range header-vertical-range--ascending-up"
                        max={100}
                        min={10}
                        step={1}
                        type="range"
                        value={previewQualityDraftValue}
                        onChange={(event) => {
                          setPreviewQualityDraftValue(Number(event.target.value))
                        }}
                        onMouseUp={commitPreviewQualityDraft}
                        onTouchEnd={commitPreviewQualityDraft}
                        onKeyUp={(event) => {
                          if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                            commitPreviewQualityDraft()
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                className={`video-action-btn fullscreen-action-btn ${showImageConvertAdjustPanel ? 'is-active' : ''}`}
                type="button"
                data-tooltip-label={`调节面板 (${imageConvertPreviewAdjustProfile.mode.toUpperCase()})`}
                onClick={() => {
                  onToggleImageConvertAdjustPanel?.()
                }}
              >
                <span className="fullscreen-action-content">ADJ</span>
              </button>
            </>
          ) : null}

          <div
            className={`header-popover-control header-popover-control--upward fullscreen-zoom-control ${showZoomPopover ? 'is-open' : ''}`}
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
              data-tooltip-label={zoomPercent === 100 ? t('ui.fullscreen.zoomIn') : t('ui.fullscreen.reset')}
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
               hidden={!showZoomPopover || !zoomEnabled}
              role="dialog"
              aria-label={t('ui.fullscreen.zoomIn')}
            >
              <div className="header-vertical-slider" role="group" aria-label={t('ui.fullscreen.zoomIn')}>
                <div className="header-vertical-slider-value">{zoomDraftValue}%</div>
                <div className="header-vertical-slider-body">
                  <div className="video-ctrl-volume-axis">
                    <SkeuoRunway
                      ariaLabel={t('ui.fullscreen.zoomIn')}
                      className="is-volume"
                      fillTone="graphite"
                      inputClassName="video-ctrl-volume-range"
                      max={200}
                      min={10}
                      rangePercent={zoomRangePercent}
                      step={1}
                      thumbTone="graphite"
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
          </div>

          <button aria-label={t('ui.fullscreen.exit')} className="video-action-btn fullscreen-action-btn" type="button" data-tooltip-label={t('ui.fullscreen.exit')} onClick={onExit}>
            <span className="fullscreen-action-content">
              <VideoControlIcon name="fullscreenCompress" />
            </span>
          </button>
        </div>

        <div className="fullscreen-group is-center">
          {imageConvertPreviewMode ? (
            <>
              <button className="video-action-btn fullscreen-action-btn" type="button" onClick={onConfirmImageConvertPreview}>
                <span className="fullscreen-action-content">OK</span>
              </button>
              <button className="video-action-btn fullscreen-action-btn" type="button" onClick={onCancelImageConvertPreview}>
                <span className="fullscreen-action-content">X</span>
              </button>
            </>
          ) : null}
          <button aria-label={t('ui.fullscreen.prevPage')} className="video-action-btn fullscreen-action-btn fullscreen-action-page" type="button" data-tooltip-label={t('ui.fullscreen.prevPage')} onClick={() => onStepFocusedPane(-1)}>
            <span className="fullscreen-action-content">
              <span className="fullscreen-action-icon-mirror">
                <VideoControlIcon name="play" />
              </span>
            </span>
          </button>
          <button aria-label={t('ui.fullscreen.nextPage')} className="video-action-btn fullscreen-action-btn fullscreen-action-page" type="button" data-tooltip-label={t('ui.fullscreen.nextPage')} onClick={() => onStepFocusedPane(1)}>
            <span className="fullscreen-action-content">
              <VideoControlIcon name="play" />
            </span>
          </button>
          <button aria-label={t('ui.fullscreen.prevPackage')} className="video-action-btn fullscreen-action-btn fullscreen-action-page" type="button" data-tooltip-label={t('ui.fullscreen.prevPackage')} disabled={mode !== 'image'} onClick={onPrevPackage}>
            <span className="fullscreen-action-content">
              <VideoControlIcon name="prev" />
            </span>
          </button>
          <button aria-label={t('ui.fullscreen.nextPackage')} className="video-action-btn fullscreen-action-btn fullscreen-action-page" type="button" data-tooltip-label={t('ui.fullscreen.nextPackage')} disabled={mode !== 'image'} onClick={onNextPackage}>
            <span className="fullscreen-action-content">
              <VideoControlIcon name="next" />
            </span>
          </button>
        </div>

        {!hideRightGroup ? <div className="fullscreen-group is-right">
          <button aria-label={t('ui.fullscreen.alignUp')} className="video-action-btn fullscreen-action-btn" type="button" data-tooltip-label={t('ui.fullscreen.alignUp')} onClick={() => onAlignFocusedPane('up')}>
            <span className="fullscreen-action-content">
              <FullscreenFooterIcon name="alignUp" />
            </span>
          </button>
          <button aria-label={t('ui.fullscreen.alignDown')} className="video-action-btn fullscreen-action-btn" type="button" data-tooltip-label={t('ui.fullscreen.alignDown')} onClick={() => onAlignFocusedPane('down')}>
            <span className="fullscreen-action-content">
              <FullscreenFooterIcon name="alignDown" />
            </span>
          </button>
          <button aria-label={t('ui.fullscreen.alignLeft')} className="video-action-btn fullscreen-action-btn" type="button" data-tooltip-label={t('ui.fullscreen.alignLeft')} onClick={() => onAlignFocusedPane('left')}>
            <span className="fullscreen-action-content">
              <FullscreenFooterIcon name="alignLeft" />
            </span>
          </button>
          <button aria-label={t('ui.fullscreen.alignRight')} className="video-action-btn fullscreen-action-btn" type="button" data-tooltip-label={t('ui.fullscreen.alignRight')} onClick={() => onAlignFocusedPane('right')}>
            <span className="fullscreen-action-content">
              <FullscreenFooterIcon name="alignRight" />
            </span>
          </button>
          <button
            aria-label={t('ui.fullscreen.alignCenter')}
            className="video-action-btn fullscreen-action-btn"
            data-tooltip-label={t('ui.fullscreen.alignCenter')}
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
