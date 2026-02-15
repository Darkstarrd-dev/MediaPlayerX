import type { BrowserMode } from '../../types'
import { buildA11yPropsByRegistry } from '../../i18n/a11y'
import { useI18n } from '../../i18n/useI18n'
import type { AlignDirection } from './paneMath'

interface FullscreenFooterProps {
  mode: BrowserMode
  fullscreenDisplay: 'dual' | 'video-only' | 'image-only'
  fullscreenVideoFocus: boolean
  footerInfoText: string
  autoplayEnabledForFocus: boolean
  autoPlayEnabled: boolean
  autoPlayInterval: number
  autoPlayPresets: number[]
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
  autoPlayPresets,
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
        <button type="button" disabled={!autoplayEnabledForFocus} onClick={onToggleAutoplay}>
          {autoPlayEnabled ? t('ui.fullscreen.stopAutoplay') : t('ui.fullscreen.autoplay')}
        </button>
        <label className="fullscreen-inline-field">
          {t('ui.fullscreen.speed')}
          <select
            {...buildA11yPropsByRegistry({ key: 'mediaFullscreenAutoPlaySpeed', t })}
            disabled={!autoplayEnabledForFocus}
            value={autoPlayInterval}
            onChange={(event) => onSetAutoplayInterval(Number(event.target.value))}
          >
            {autoPlayPresets.map((seconds) => (
              <option key={seconds} value={seconds}>
                {`${seconds}s`}
              </option>
            ))}
          </select>
        </label>
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
