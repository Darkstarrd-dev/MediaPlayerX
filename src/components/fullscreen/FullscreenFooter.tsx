import type { BrowserMode } from '../../types'
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
  return (
    <footer className="fullscreen-footer">
      <div className="fullscreen-meta-line">{footerInfoText}</div>
      <div className="fullscreen-group">
        <button className={fullscreenDisplay === 'dual' ? 'is-active' : ''} type="button" onClick={onToggleDualDisplay}>
          {fullscreenDisplay === 'dual' ? '单显示' : '双显示'}
        </button>
        <button type="button" disabled={fullscreenDisplay !== 'dual'} onClick={onToggleSwapSides}>
          调换左右
        </button>
        <span className="fullscreen-focus-text">
          {fullscreenDisplay === 'dual' ? `焦点：${fullscreenVideoFocus ? '视频' : '图片'}（点击区域或 Tab 切换）` : '焦点：单显示'}
        </span>
      </div>

      <div className="fullscreen-group">
        <button type="button" onClick={() => onStepFocusedPane(-1)}>
          上一页
        </button>
        <button type="button" onClick={() => onStepFocusedPane(1)}>
          下一页
        </button>
        <button type="button" disabled={mode !== 'image'} onClick={onPrevPackage}>
          上个包
        </button>
        <button type="button" disabled={mode !== 'image'} onClick={onNextPackage}>
          下个包
        </button>
        <button type="button" disabled={!autoplayEnabledForFocus} onClick={onToggleAutoplay}>
          {autoPlayEnabled ? '停止自动播放' : '自动播放'}
        </button>
        <label className="fullscreen-inline-field">
          速度
          <select
            aria-label="全屏自动播放速度"
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
          上对齐
        </button>
        <button type="button" onClick={() => onAlignFocusedPane('down')}>
          下对齐
        </button>
        <button type="button" onClick={() => onAlignFocusedPane('left')}>
          左对齐
        </button>
        <button type="button" onClick={() => onAlignFocusedPane('right')}>
          右对齐
        </button>
        <button type="button" disabled={!zoomEnabled} onClick={onZoomOut}>
          缩小
        </button>
        <span className="fullscreen-zoom-text">{zoomEnabled ? `${zoomPercent}%` : '-'}</span>
        <button type="button" disabled={!zoomEnabled} onClick={onZoomIn}>
          放大
        </button>
        <button type="button" disabled={!zoomEnabled} onClick={onResetSinglePane}>
          Reset
        </button>
        <button type="button" onClick={onExit}>
          退出全屏
        </button>
      </div>
    </footer>
  )
}
