import type { VideoItem } from '../types'
import { formatSeconds } from '../utils/ui'

interface VideoMainSectionProps {
  focusedVideo: VideoItem | null
  videoTime: number
  videoPlaying: boolean
  videoRate: number
  videoVolume: number
  videoMuted: boolean
  coverColor: string
  onTogglePlay: () => void
  onPrevVideo: () => void
  onNextVideo: () => void
  onSeekVideo: (time: number) => void
  onToggleMute: () => void
  onChangeVolume: (volume: number) => void
  onChangeRate: (rate: number) => void
  onSaveCover: () => void
  onEnterFullscreen: () => void
}

function VideoMainSection({
  focusedVideo,
  videoTime,
  videoPlaying,
  videoRate,
  videoVolume,
  videoMuted,
  coverColor,
  onTogglePlay,
  onPrevVideo,
  onNextVideo,
  onSeekVideo,
  onToggleMute,
  onChangeVolume,
  onChangeRate,
  onSaveCover,
  onEnterFullscreen,
}: VideoMainSectionProps) {
  const durationSec = focusedVideo?.durationSec ?? 0
  const clampedTime = Math.min(videoTime, durationSec)

  return (
    <div className="video-preview">
      <div className="video-screen" style={{ background: videoPlaying ? 'linear-gradient(135deg, #2d2f33, #212022)' : coverColor }}>
        {videoPlaying ? (
          <span>{`虚拟视频时钟 ${formatSeconds(clampedTime)} / ${formatSeconds(durationSec)}`}</span>
        ) : (
          <span>{`封面态（待播放） ${formatSeconds(clampedTime)} / ${formatSeconds(durationSec)}`}</span>
        )}
      </div>

      <div className="video-progress-line">
        <span>{`${formatSeconds(clampedTime)} / ${formatSeconds(durationSec)}`}</span>
        <input
          aria-label="进度滑条"
          max={durationSec}
          min={0}
          step={0.1}
          type="range"
          value={clampedTime}
          onChange={(event) => onSeekVideo(Number(event.target.value))}
        />
      </div>

      <div className="video-controls">
        <button type="button" onClick={onTogglePlay}>
          {videoPlaying ? '暂停' : '播放'}
        </button>
        <button type="button" onClick={onPrevVideo}>
          上一个
        </button>
        <button type="button" onClick={onNextVideo}>
          下一个
        </button>
        <button type="button" onClick={onSaveCover}>
          Save as cover
        </button>
        <button type="button" onClick={onToggleMute}>
          {videoMuted ? '取消静音' : '静音'}
        </button>
        <label className="video-volume-inline">
          <span>音量</span>
          <span>{videoMuted ? '0%' : `${videoVolume}%`}</span>
          <input
            aria-label="音量滑条"
            max={100}
            min={0}
            step={1}
            type="range"
            value={videoMuted ? 0 : videoVolume}
            onChange={(event) => onChangeVolume(Number(event.target.value))}
          />
        </label>
        <label className="video-rate-inline">
          <span>{`倍率 x${videoRate.toFixed(2)}`}</span>
          <input
            aria-label="倍速滑条"
            max={4}
            min={0.1}
            step={0.1}
            type="range"
            value={videoRate}
            onChange={(event) => onChangeRate(Number(event.target.value))}
          />
        </label>
        <button className="video-fullscreen-btn" type="button" onClick={onEnterFullscreen}>
          F 全屏
        </button>
      </div>
    </div>
  )
}

export default VideoMainSection
