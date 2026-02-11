import { formatSeconds } from '../../utils/ui'

interface FullscreenVideoControlRowsProps {
  clampedVideoTime: number
  durationSec: number
  videoPlaying: boolean
  videoMuted: boolean
  videoVolume: number
  videoRate: number
  onToggleVideoPlay: () => void
  onPrevVideo: () => void
  onNextVideo: () => void
  onToggleVideoMute: () => void
  onChangeVideoVolume: (volume: number) => void
  onChangeVideoRate: (rate: number) => void
  onSeekVideo: (time: number) => void
}

export function FullscreenVideoProgressRow({
  clampedVideoTime,
  durationSec,
  onSeekVideo,
}: Pick<FullscreenVideoControlRowsProps, 'clampedVideoTime' | 'durationSec' | 'onSeekVideo'>) {
  return (
    <div className="fullscreen-video-controls-row is-progress">
      <span className="video-progress-time">{`${formatSeconds(clampedVideoTime)} / ${formatSeconds(durationSec)}`}</span>
      <input
        aria-label="全屏视频进度滑条"
        max={Math.max(0, durationSec)}
        min={0}
        step={0.1}
        type="range"
        value={clampedVideoTime}
        onChange={(event) => onSeekVideo(Number(event.target.value))}
      />
    </div>
  )
}

export function FullscreenVideoControlRow({
  videoPlaying,
  videoMuted,
  videoVolume,
  videoRate,
  onToggleVideoPlay,
  onPrevVideo,
  onNextVideo,
  onToggleVideoMute,
  onChangeVideoVolume,
  onChangeVideoRate,
}: Omit<FullscreenVideoControlRowsProps, 'clampedVideoTime' | 'durationSec' | 'onSeekVideo'>) {
  return (
    <div className="fullscreen-video-controls-row is-controls">
      <button className="video-action-btn video-action-play" type="button" onClick={onToggleVideoPlay}>
        {videoPlaying ? '暂停' : '播放'}
      </button>
      <button className="video-action-btn video-action-prev" type="button" onClick={onPrevVideo}>
        上一个
      </button>
      <button className="video-action-btn video-action-next" type="button" onClick={onNextVideo}>
        下一个
      </button>
      <button className="video-action-btn video-action-mute" type="button" onClick={onToggleVideoMute}>
        {videoMuted ? '取消静音' : '静音'}
      </button>
      <label className="player-inline-field">
        音量 {videoMuted ? '0%' : `${videoVolume}%`}
        <input
          aria-label="全屏视频音量滑条"
          max={100}
          min={0}
          step={1}
          type="range"
          value={videoMuted ? 0 : videoVolume}
          onChange={(event) => onChangeVideoVolume(Number(event.target.value))}
        />
      </label>
      <label className="player-inline-field">
        倍速 x{videoRate.toFixed(2)}
        <input
          aria-label="全屏视频倍速滑条"
          max={4}
          min={0.1}
          step={0.1}
          type="range"
          value={videoRate}
          onChange={(event) => onChangeVideoRate(Number(event.target.value))}
        />
      </label>
    </div>
  )
}
