import { useState, type CSSProperties } from 'react'

import { VideoControlIcon } from '../VideoControlIcon'
import { videoFitModeLabel, type VideoFitMode } from '../../features/media/videoFitMode'
import { formatSeconds } from '../../utils/ui'

type VideoPopoverKey = 'volume' | 'subtitle' | 'speed' | 'fit' | 'playlist'

interface FullscreenVideoControlsShellProps {
  clampedVideoTime: number
  durationSec: number
  videoPlaying: boolean
  videoMuted: boolean
  videoFitMode: VideoFitMode
  videoVolume: number
  videoRate: number
  subtitleVisible: boolean
  subtitleLoading: boolean
  subtitleMessage: string | null
  subtitleOptions: Array<{ id: string; label: string; format: 'vtt' | 'srt' | 'ass' | 'ssa' }>
  selectedSubtitleId: string | null
  playlistEntries: Array<{ id: string; label: string }>
  selectedVideoId: string
  onSeekVideo: (time: number) => void
  onToggleVideoPlay: () => void
  onPrevVideo: () => void
  onNextVideo: () => void
  onToggleVideoMute: () => void
  onToggleSubtitle: () => void
  onSelectSubtitle: (subtitleId: string) => void
  onChangeVideoVolume: (volume: number) => void
  onChangeVideoRate: (rate: number) => void
  onCycleVideoFitMode: () => void
  onSetVideoFitMode: (mode: VideoFitMode) => void
  onToggleDualDisplay: () => void
  onSelectVideo: (videoId: string) => void
  onSaveCover: () => void
  onExit: () => void
}

export function FullscreenVideoControlsShell({
  clampedVideoTime,
  durationSec,
  videoPlaying,
  videoMuted,
  videoFitMode,
  videoVolume,
  videoRate,
  subtitleVisible,
  subtitleLoading,
  subtitleMessage,
  subtitleOptions,
  selectedSubtitleId,
  playlistEntries,
  selectedVideoId,
  onSeekVideo,
  onToggleVideoPlay,
  onPrevVideo,
  onNextVideo,
  onToggleVideoMute,
  onToggleSubtitle,
  onSelectSubtitle,
  onChangeVideoVolume,
  onChangeVideoRate,
  onCycleVideoFitMode,
  onSetVideoFitMode,
  onToggleDualDisplay,
  onSelectVideo,
  onSaveCover,
  onExit,
}: FullscreenVideoControlsShellProps) {
  const [openPopover, setOpenPopover] = useState<VideoPopoverKey | null>(null)

  const closePopover = () => {
    setOpenPopover(null)
  }

  const progressPercent = durationSec > 0 ? Math.max(0, Math.min(100, (clampedVideoTime / durationSec) * 100)) : 0
  const videoProgressRangeStyle = {
    '--mpx-skeuo-range-pct': `${progressPercent}%`,
  } as CSSProperties
  const volumePercent = Math.max(0, Math.min(100, videoMuted ? 0 : videoVolume))
  const videoVolumeRangeStyle = {
    '--mpx-skeuo-range-pct': `${volumePercent}%`,
  } as CSSProperties

  const openPopoverByHover = (key: VideoPopoverKey) => {
    setOpenPopover(key)
  }

  return (
    <div className="video-controls-shell fullscreen-video-controls-shell">
      <div className="video-controls-progress">
        <span className="video-progress-time">{`${formatSeconds(clampedVideoTime)} / ${formatSeconds(durationSec)}`}</span>
        <input
          aria-label="全屏视频进度滑条"
          max={Math.max(0, durationSec)}
          min={0}
          step={0.1}
          style={videoProgressRangeStyle}
          type="range"
          value={clampedVideoTime}
          onChange={(event) => onSeekVideo(Number(event.target.value))}
        />
      </div>

      <div className="video-controls-row video-controls">
        <div className="video-controls-group is-left">
          <div
            className={`video-ctrl-popover ${openPopover === 'volume' ? 'is-open' : ''}`}
            onMouseEnter={() => openPopoverByHover('volume')}
            onMouseLeave={closePopover}
          >
            <button
              aria-controls="fullscreen-popover-volume"
              aria-expanded={openPopover === 'volume'}
              aria-haspopup="dialog"
              aria-label={videoMuted ? '取消静音' : '静音'}
              className="video-action-btn video-action-mute"
              type="button"
              onClick={onToggleVideoMute}
            >
              <VideoControlIcon name={videoMuted ? 'volumeMuted' : 'volume'} />
            </button>
            <div className="video-ctrl-panel is-volume" hidden={openPopover !== 'volume'} id="fullscreen-popover-volume" role="dialog">
              <div className="video-ctrl-volume-axis">
                <input
                  aria-label="全屏视频音量滑条"
                  className="video-ctrl-volume-range"
                  max={100}
                  min={0}
                  step={1}
                  style={videoVolumeRangeStyle}
                  type="range"
                  value={videoMuted ? 0 : videoVolume}
                  onChange={(event) => onChangeVideoVolume(Number(event.target.value))}
                />
              </div>
            </div>
          </div>

          <div
            className={`video-ctrl-popover ${openPopover === 'subtitle' ? 'is-open' : ''}`}
            onMouseEnter={() => openPopoverByHover('subtitle')}
            onMouseLeave={closePopover}
          >
            <button
              aria-controls="fullscreen-popover-subtitle"
              aria-expanded={openPopover === 'subtitle'}
              aria-haspopup="dialog"
              aria-label={subtitleVisible ? '字幕:开' : '字幕:关'}
              className="video-action-btn video-action-subtitle"
              type="button"
              onClick={onToggleSubtitle}
            >
              <VideoControlIcon name="subtitle" />
            </button>
            <div className="video-ctrl-panel" hidden={openPopover !== 'subtitle'} id="fullscreen-popover-subtitle" role="dialog">
              {subtitleLoading ? <span className="video-ctrl-panel-note">加载中...</span> : null}
              {subtitleMessage ? <span className="video-ctrl-panel-note">{subtitleMessage}</span> : null}
              <div className="video-ctrl-panel-options">
                {subtitleOptions.map((option) => (
                  <button
                    aria-pressed={selectedSubtitleId === option.id}
                    className={`video-ctrl-panel-option ${selectedSubtitleId === option.id ? 'is-active' : ''}`}
                    key={option.id}
                    type="button"
                    onClick={() => {
                      onSelectSubtitle(option.id)
                      closePopover()
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            className={`video-ctrl-popover ${openPopover === 'speed' ? 'is-open' : ''}`}
            onMouseEnter={() => openPopoverByHover('speed')}
            onMouseLeave={closePopover}
          >
            <button
              aria-controls="fullscreen-popover-speed"
              aria-expanded={openPopover === 'speed'}
              aria-haspopup="dialog"
              aria-label={`倍速 x${videoRate.toFixed(2)}`}
              className="video-action-btn video-action-speed"
              type="button"
            >
              <VideoControlIcon name="speed" />
            </button>
            <div className="video-ctrl-panel is-speed" hidden={openPopover !== 'speed'} id="fullscreen-popover-speed" role="dialog">
              <div className="video-ctrl-panel-options">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                  <button
                    aria-pressed={Math.abs(videoRate - rate) < 0.01}
                    className={`video-ctrl-panel-option ${Math.abs(videoRate - rate) < 0.01 ? 'is-active' : ''}`}
                    key={rate}
                    type="button"
                    onClick={() => {
                      onChangeVideoRate(rate)
                      closePopover()
                    }}
                  >
                    {`${rate}x`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            aria-label="退出全屏"
            className="video-action-btn video-action-fullscreen video-fullscreen-btn"
            type="button"
            onClick={onExit}
          >
            <VideoControlIcon name="fullscreenCompress" />
          </button>

          <div
            className={`video-ctrl-popover ${openPopover === 'fit' ? 'is-open' : ''}`}
            onMouseEnter={() => openPopoverByHover('fit')}
            onMouseLeave={closePopover}
          >
            <button
              aria-controls="fullscreen-popover-fit"
              aria-expanded={openPopover === 'fit'}
              aria-haspopup="dialog"
              aria-label={videoFitModeLabel(videoFitMode)}
              className="video-action-btn video-action-fit"
              type="button"
              onClick={onCycleVideoFitMode}
            >
              <VideoControlIcon name="aspect" />
            </button>
            <div className="video-ctrl-panel is-fit" hidden={openPopover !== 'fit'} id="fullscreen-popover-fit" role="dialog">
              <div className="video-ctrl-panel-options">
                {[
                  { label: '适应', mode: 'contain' as const },
                  { label: '拉伸', mode: 'fill' as const },
                  { label: '原始', mode: 'original' as const },
                ].map((option) => (
                  <button
                    aria-pressed={videoFitMode === option.mode}
                    className={`video-ctrl-panel-option ${videoFitMode === option.mode ? 'is-active' : ''}`}
                    key={option.mode}
                    type="button"
                    onClick={() => {
                      onSetVideoFitMode(option.mode)
                      closePopover()
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="video-controls-group is-center">
          <button aria-label="上一个" className="video-action-btn video-action-prev" type="button" onClick={onPrevVideo}>
            <VideoControlIcon name="prev" />
          </button>
          <button
            aria-label={videoPlaying ? '暂停' : '播放'}
            className="video-action-btn video-action-play"
            type="button"
            onClick={onToggleVideoPlay}
          >
            <VideoControlIcon name={videoPlaying ? 'pause' : 'play'} />
          </button>
          <button aria-label="下一个" className="video-action-btn video-action-next" type="button" onClick={onNextVideo}>
            <VideoControlIcon name="next" />
          </button>
        </div>

        <div className="video-controls-group is-right">
          <button aria-label="Save as cover" className="video-action-btn video-action-save-cover" type="button" onClick={onSaveCover}>
            <VideoControlIcon name="camera" />
          </button>
          <button aria-label="独立/复合" className="video-action-btn video-action-dual" type="button" onClick={onToggleDualDisplay}>
            <VideoControlIcon name="dual" />
          </button>

          <div
            className={`video-ctrl-popover ${openPopover === 'playlist' ? 'is-open' : ''}`}
            onMouseEnter={() => openPopoverByHover('playlist')}
            onMouseLeave={closePopover}
          >
            <button
              aria-controls="fullscreen-popover-playlist"
              aria-expanded={openPopover === 'playlist'}
              aria-haspopup="dialog"
              aria-label="播放列表"
              className="video-action-btn video-action-playlist"
              type="button"
            >
              <VideoControlIcon name="playlist" />
            </button>
            <div className="video-ctrl-panel" hidden={openPopover !== 'playlist'} id="fullscreen-popover-playlist" role="dialog">
              {playlistEntries.length === 0 ? (
                <span className="video-ctrl-panel-note">无播放列表</span>
              ) : (
                <div className="video-ctrl-panel-options">
                  {playlistEntries.map((entry) => (
                    <button
                      aria-pressed={entry.id === selectedVideoId}
                      className={`video-ctrl-panel-option ${entry.id === selectedVideoId ? 'is-active' : ''}`}
                      key={entry.id}
                      type="button"
                      onClick={() => {
                        onSelectVideo(entry.id)
                        closePopover()
                      }}
                    >
                      {entry.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
