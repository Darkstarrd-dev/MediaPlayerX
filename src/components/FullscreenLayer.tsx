import type { ImageItem, VideoItem } from '../types'
import { formatSeconds } from '../utils/ui'

interface FullscreenLayerProps {
  fullscreenActive: boolean
  showFullscreenFooter: boolean
  fullscreenDisplay: 'dual' | 'video-only' | 'image-only'
  fullscreenVideoFocus: boolean
  fullscreenSplit: number
  focusedImage: ImageItem | null
  focusedVideo: VideoItem | null
  videoTime: number
  videoPlaying: boolean
  onSetFooterVisible: (visible: boolean) => void
  onSetDisplay: (display: 'dual' | 'video-only' | 'image-only') => void
  onSetVideoFocus: (enabled: boolean) => void
  onSetSplit: (value: number) => void
  onToggleVideoPlay: () => void
  onPrevVideo: () => void
  onNextVideo: () => void
  onExit: () => void
}

function FullscreenLayer({
  fullscreenActive,
  showFullscreenFooter,
  fullscreenDisplay,
  fullscreenVideoFocus,
  fullscreenSplit,
  focusedImage,
  focusedVideo,
  videoTime,
  videoPlaying,
  onSetFooterVisible,
  onSetDisplay,
  onSetVideoFocus,
  onSetSplit,
  onToggleVideoPlay,
  onPrevVideo,
  onNextVideo,
  onExit,
}: FullscreenLayerProps) {
  if (!fullscreenActive) {
    return null
  }

  return (
    <div
      className="fullscreen-layer"
      onMouseMove={(event) => {
        onSetFooterVisible(event.clientY > window.innerHeight * 0.8)
      }}
      onMouseLeave={() => onSetFooterVisible(false)}
    >
      <div className="fullscreen-content">
        {fullscreenDisplay !== 'video-only' ? (
          <section className="fullscreen-image" style={{ flex: fullscreenDisplay === 'dual' ? fullscreenSplit : 1 }}>
            <div className="full-placeholder" style={{ background: focusedImage?.color ?? '#666' }}>
              <span>{`图片 #${focusedImage?.ordinal ?? '-'}`}</span>
            </div>
          </section>
        ) : null}

        {fullscreenDisplay === 'dual' ? <div className="fullscreen-divider" /> : null}

        {fullscreenDisplay !== 'image-only' ? (
          <section className="fullscreen-video" style={{ flex: fullscreenDisplay === 'dual' ? 1 - fullscreenSplit : 1 }}>
            <div className={`full-video-placeholder ${fullscreenVideoFocus ? 'is-focus' : ''}`}>
              <span>{`视频 ${focusedVideo?.fileName ?? '-'}`}</span>
              <strong>{`${formatSeconds(videoTime)} / ${formatSeconds(focusedVideo?.durationSec ?? 0)}`}</strong>
            </div>
          </section>
        ) : null}
      </div>

      {showFullscreenFooter ? (
        <footer className="fullscreen-footer">
          <div className="fullscreen-group">
            <button className={fullscreenDisplay === 'dual' ? 'is-active' : ''} type="button" onClick={() => onSetDisplay('dual')}>
              双显示
            </button>
            <button
              className={fullscreenDisplay === 'video-only' ? 'is-active' : ''}
              type="button"
              onClick={() => onSetDisplay('video-only')}
            >
              仅视频
            </button>
            <button
              className={fullscreenDisplay === 'image-only' ? 'is-active' : ''}
              type="button"
              onClick={() => onSetDisplay('image-only')}
            >
              仅图片
            </button>
          </div>

          <div className="fullscreen-group">
            <button type="button" onClick={() => onSetVideoFocus(false)}>
              图片控制
            </button>
            <button type="button" onClick={() => onSetVideoFocus(true)}>
              视频控制
            </button>
            <label>
              分屏比例
              <input
                max={0.8}
                min={0.2}
                step={0.02}
                type="range"
                value={fullscreenSplit}
                onChange={(event) => onSetSplit(Number(event.target.value))}
              />
            </label>
          </div>

          <div className="fullscreen-group">
            <button type="button" onClick={onToggleVideoPlay}>
              {videoPlaying ? '暂停' : '播放'}
            </button>
            <button type="button" onClick={onPrevVideo}>
              上一个
            </button>
            <button type="button" onClick={onNextVideo}>
              下一个
            </button>
            <button type="button" onClick={onExit}>
              退出全屏
            </button>
          </div>
        </footer>
      ) : null}
    </div>
  )
}

export default FullscreenLayer
