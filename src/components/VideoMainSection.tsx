import { useEffect, useRef } from 'react'

import { clamp, formatSeconds } from '../utils/ui'

interface VideoMainSectionProps {
  durationSec: number
  videoTime: number
  videoPlaying: boolean
  videoRate: number
  videoVolume: number
  videoMuted: boolean
  videoSourceUrl: string | null
  coverImageUrl: string | null
  active: boolean
  coverColor: string
  onTogglePlay: () => void
  onPrevVideo: () => void
  onNextVideo: () => void
  onSeekVideo: (time: number) => void
  onVideoTimeUpdate: (time: number) => void
  onVideoDurationDetected: (duration: number) => void
  onToggleMute: () => void
  onChangeVolume: (volume: number) => void
  onChangeRate: (rate: number) => void
  onSaveCover: () => void
  onEnterFullscreen: () => void
}

function VideoMainSection({
  durationSec,
  videoTime,
  videoPlaying,
  videoRate,
  videoVolume,
  videoMuted,
  videoSourceUrl,
  coverImageUrl,
  active,
  coverColor,
  onTogglePlay,
  onPrevVideo,
  onNextVideo,
  onSeekVideo,
  onVideoTimeUpdate,
  onVideoDurationDetected,
  onToggleMute,
  onChangeVolume,
  onChangeRate,
  onSaveCover,
  onEnterFullscreen,
}: VideoMainSectionProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const clampedTime = Math.min(videoTime, Math.max(0, durationSec))

  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    video.playbackRate = clamp(videoRate, 0.1, 4)
    video.muted = videoMuted
    video.volume = clamp(videoVolume / 100, 0, 1)

    if (!active) {
      video.pause()
      return
    }

    if (Math.abs(video.currentTime - clampedTime) > 0.35) {
      video.currentTime = clampedTime
    }

    if (videoPlaying) {
      void video.play().catch(() => undefined)
    } else {
      video.pause()
    }
  }, [active, clampedTime, videoMuted, videoPlaying, videoRate, videoSourceUrl, videoVolume])

  return (
    <div className="video-preview">
      <div className="video-screen" style={{ background: videoPlaying ? 'linear-gradient(135deg, #2d2f33, #212022)' : coverColor }}>
        {videoSourceUrl ? (
          <video
            ref={videoRef}
            className="video-screen-media"
            style={{ opacity: videoPlaying ? 1 : 0 }}
            src={videoSourceUrl}
            preload="metadata"
            playsInline
            onTimeUpdate={() => {
              const currentTime = videoRef.current?.currentTime ?? 0
              onVideoTimeUpdate(currentTime)
            }}
            onLoadedMetadata={() => {
              const duration = videoRef.current?.duration ?? 0
              if (Number.isFinite(duration) && duration > 0) {
                onVideoDurationDetected(duration)
              }
              const currentTime = videoRef.current?.currentTime ?? 0
              onVideoTimeUpdate(currentTime)
            }}
            onEnded={() => {
              onVideoTimeUpdate(0)
              onNextVideo()
            }}
          />
        ) : null}

        {!videoPlaying && coverImageUrl ? <img className="video-screen-cover-image" src={coverImageUrl} alt="视频封面" /> : null}

        <div className="video-screen-hud">
          {videoPlaying ? (
            <span>{`真实视频 ${formatSeconds(clampedTime)} / ${formatSeconds(durationSec)}`}</span>
          ) : (
            <span>{`封面态（待播放） ${formatSeconds(clampedTime)} / ${formatSeconds(durationSec)}`}</span>
          )}
        </div>

        {!videoSourceUrl ? (
          <div className="video-screen-empty">
            <span>无可用视频源</span>
          </div>
        ) : null}
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
