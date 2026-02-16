import { useRef, useState, type CSSProperties } from 'react'

import { VideoControlIcon } from '../VideoControlIcon'
import { MusicControlIcon } from '../MusicControlIcon'
import type { VideoFitMode } from '../../features/media/videoFitMode'
import { useI18n } from '../../i18n/useI18n'
import { formatSeconds } from '../../utils/ui'

type VideoPopoverKey = 'volume' | 'subtitle' | 'speed' | 'fit' | 'playlist'

interface FullscreenVideoControlsShellProps {
  clampedVideoTime: number
  durationSec: number
  videoPlaying: boolean
  videoMuted: boolean
  videoFitMode: VideoFitMode
  videoLoopMode: 'single' | 'list'
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
  onCycleVideoLoopMode: () => void
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
  videoLoopMode,
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
  onCycleVideoLoopMode,
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
  const { t } = useI18n()
  const [openPopover, setOpenPopover] = useState<VideoPopoverKey | null>(null)
  const [seekDraftTime, setSeekDraftTime] = useState<number | null>(null)
  const lastSeekPreviewAtRef = useRef(0)
  const lastSeekPreviewValueRef = useRef<number | null>(null)

  const closePopover = () => {
    setOpenPopover(null)
  }

  const displayTime = seekDraftTime == null ? clampedVideoTime : Math.max(0, Math.min(Math.max(0, durationSec), seekDraftTime))
  const progressPercent = durationSec > 0 ? Math.max(0, Math.min(100, (displayTime / durationSec) * 100)) : 0
  const videoProgressRangeStyle = {
    '--mpx-skeuo-range-pct': `${progressPercent}%`,
  } as CSSProperties
  const volumePercent = Math.max(0, Math.min(100, videoMuted ? 0 : videoVolume))
  const videoVolumeRangeStyle = {
    '--mpx-skeuo-range-pct': `${volumePercent}%`,
  } as CSSProperties
  const videoFitLabel =
    videoFitMode === 'fill'
      ? t('a11y.media.videoFitFill')
      : videoFitMode === 'original'
        ? t('a11y.media.videoFitOriginal')
      : t('a11y.media.videoFitContain')
  const videoLoopModeLabel = videoLoopMode === 'single' ? t('ui.media.videoLoopModeSingle') : t('ui.media.videoLoopModeList')

  const openPopoverByHover = (key: VideoPopoverKey) => {
    setOpenPopover(key)
  }

  const commitSeekDraft = () => {
    if (seekDraftTime == null) {
      return
    }
    const nextTime = Math.max(0, Math.min(Math.max(0, durationSec), seekDraftTime))
    onSeekVideo(nextTime)
    lastSeekPreviewAtRef.current = Date.now()
    lastSeekPreviewValueRef.current = nextTime
    setSeekDraftTime(null)
  }

  const commitSeekDraftAndBlur = (input: HTMLInputElement) => {
    commitSeekDraft()
    input.blur()
  }

  const previewSeekDuringDrag = (nextTime: number) => {
    const now = Date.now()
    const lastAt = lastSeekPreviewAtRef.current
    const lastValue = lastSeekPreviewValueRef.current
    const hasLargeJump = lastValue == null || Math.abs(nextTime - lastValue) >= 2
    if (lastAt !== 0 && now - lastAt < 90 && !hasLargeJump) {
      return
    }
    onSeekVideo(nextTime)
    lastSeekPreviewAtRef.current = now
    lastSeekPreviewValueRef.current = nextTime
  }

  return (
    <div className="video-controls-shell fullscreen-video-controls-shell">
      <div className="video-controls-progress">
        <span className="video-progress-time">{`${formatSeconds(displayTime)} / ${formatSeconds(durationSec)}`}</span>
        <input
          aria-label={t('a11y.media.fullscreenProgress')}
          max={Math.max(0, durationSec)}
          min={0}
          step={0.1}
          style={videoProgressRangeStyle}
          type="range"
          value={displayTime}
          onChange={(event) => {
            const nextTime = Math.max(0, Math.min(Math.max(0, durationSec), Number(event.target.value)))
            setSeekDraftTime(nextTime)
            previewSeekDuringDrag(nextTime)
          }}
          onMouseUp={(event) => commitSeekDraftAndBlur(event.currentTarget)}
          onTouchEnd={(event) => commitSeekDraftAndBlur(event.currentTarget)}
          onBlur={commitSeekDraft}
          onKeyUp={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              commitSeekDraft()
            }
          }}
        />
      </div>

      <div className="video-controls-row video-controls">
        <div className="video-controls-group is-left">
          <button aria-label={t('a11y.media.dualMode')} className="video-action-btn video-action-dual" type="button" onClick={onToggleDualDisplay}>
            <VideoControlIcon name="dual" />
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
              aria-label={videoFitLabel}
              className="video-action-btn video-action-fit"
              type="button"
              onClick={onCycleVideoFitMode}
            >
              <VideoControlIcon name="aspect" />
            </button>
            <div className="video-ctrl-panel is-fit" hidden={openPopover !== 'fit'} id="fullscreen-popover-fit" role="dialog">
              <div className="video-ctrl-panel-options">
                {[
                  { label: t('a11y.media.videoFitContain'), mode: 'contain' as const },
                  { label: t('a11y.media.videoFitFill'), mode: 'fill' as const },
                  { label: t('a11y.media.videoFitOriginal'), mode: 'original' as const },
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

          <div
            className={`video-ctrl-popover ${openPopover === 'subtitle' ? 'is-open' : ''}`}
            onMouseEnter={() => openPopoverByHover('subtitle')}
            onMouseLeave={closePopover}
          >
            <button
              aria-controls="fullscreen-popover-subtitle"
              aria-expanded={openPopover === 'subtitle'}
              aria-haspopup="dialog"
              aria-label={subtitleVisible ? t('a11y.media.subtitleOn') : t('a11y.media.subtitleOff')}
              className="video-action-btn video-action-subtitle"
              type="button"
              onClick={onToggleSubtitle}
            >
              <VideoControlIcon name="subtitle" />
            </button>
            <div className="video-ctrl-panel" hidden={openPopover !== 'subtitle'} id="fullscreen-popover-subtitle" role="dialog">
              {subtitleLoading ? <span className="video-ctrl-panel-note">{t('ui.common.loading')}</span> : null}
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
              aria-label={t('a11y.media.playbackRate', { rate: videoRate.toFixed(2) })}
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
            aria-label={t('a11y.media.exitFullscreen')}
            className="video-action-btn video-action-fullscreen video-fullscreen-btn"
            type="button"
            onClick={onExit}
          >
            <VideoControlIcon name="fullscreenCompress" />
          </button>
        </div>

        <div className="video-controls-group is-center">
          <button aria-label={t('a11y.media.prev')} className="video-action-btn video-action-prev" type="button" onClick={onPrevVideo}>
            <VideoControlIcon name="prev" />
          </button>
          <button
            aria-label={videoPlaying ? t('a11y.media.pause') : t('a11y.media.play')}
            className="video-action-btn video-action-play"
            type="button"
            onClick={onToggleVideoPlay}
          >
            <VideoControlIcon name={videoPlaying ? 'pause' : 'play'} />
          </button>
          <button aria-label={t('a11y.media.next')} className="video-action-btn video-action-next" type="button" onClick={onNextVideo}>
            <VideoControlIcon name="next" />
          </button>
        </div>

        <div className="video-controls-group is-right">
          <button aria-label={t('a11y.media.saveAsCover')} className="video-action-btn video-action-save-cover" type="button" onClick={onSaveCover}>
            <VideoControlIcon name="camera" />
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
              aria-label={t('a11y.media.playlist')}
              className="video-action-btn video-action-playlist"
              type="button"
            >
              <VideoControlIcon name="playlist" />
            </button>
            <div className="video-ctrl-panel" hidden={openPopover !== 'playlist'} id="fullscreen-popover-playlist" role="dialog">
              {playlistEntries.length === 0 ? (
                <span className="video-ctrl-panel-note">{t('ui.media.emptyPlaylist')}</span>
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

          <button
            aria-label={t('a11y.media.videoLoopMode', { label: videoLoopModeLabel })}
            className="video-action-btn video-action-loop-mode"
            title={t('tip.media.videoLoopMode', { label: videoLoopModeLabel })}
            type="button"
            onClick={onCycleVideoLoopMode}
          >
            <MusicControlIcon className="video-action-icon" name={videoLoopMode === 'single' ? 'repeatOne' : 'repeatAlbum'} />
          </button>

          <div
            className={`video-ctrl-popover ${openPopover === 'volume' ? 'is-open' : ''}`}
            onMouseEnter={() => openPopoverByHover('volume')}
            onMouseLeave={closePopover}
          >
            <button
              aria-controls="fullscreen-popover-volume"
              aria-expanded={openPopover === 'volume'}
              aria-haspopup="dialog"
              aria-label={videoMuted ? t('a11y.media.unmute') : t('a11y.media.mute')}
              className="video-action-btn video-action-mute"
              type="button"
              onClick={onToggleVideoMute}
            >
              <VideoControlIcon name={videoMuted ? 'volumeMuted' : 'volume'} />
            </button>
            <div className="video-ctrl-panel is-volume" hidden={openPopover !== 'volume'} id="fullscreen-popover-volume" role="dialog">
              <div className="video-ctrl-volume-axis">
                <input
                  aria-label={t('a11y.media.fullscreenVolume')}
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
        </div>
      </div>
    </div>
  )
}
