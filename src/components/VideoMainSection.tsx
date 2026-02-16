import { useEffect, useRef, useState, type CSSProperties } from 'react'

import { MainUiIcon } from './MainUiIcon'
import { MusicControlIcon } from './MusicControlIcon'
import { ToolbarTitleMarquee } from './ToolbarTitleMarquee'
import { VideoControlIcon } from './VideoControlIcon'
import { useMediaPreloadWindow } from './useMediaPreloadWindow'
import { useI18n } from '../i18n/useI18n'
import type { VideoItem } from '../types'
import type { VideoFitMode } from '../features/media/videoFitMode'
import { clamp, formatSeconds } from '../utils/ui'

type VideoPopoverKey = 'volume' | 'subtitle' | 'speed' | 'fit' | 'playlist'

interface VideoMainSectionProps {
  manageMode: boolean
  metadataManageMode: boolean
  sidebarSelectedCount: number
  imageSelectedCount: number
  activeSelectionScope: 'sidebar' | 'image' | null
  pendingManageAction: boolean
  manageOperationHint: string | null
  canManageDelete: boolean
  canManageMoveNodes?: boolean
  canManageAddToPlaylist?: boolean
  canManageHide: boolean
  canManageUnhide: boolean
  onManageDelete: () => void
  onManageGroup?: () => void
  onManageMove?: () => void
  onManageAddToPlaylist?: () => void
  onManageHide: () => void
  onManageUnhide: () => void
  onClearManageSelection: () => void
  metadataPending: boolean
  onMetadataSyncName: () => void
  canJumpToManga: boolean
  canJumpToMusic: boolean
  onJumpToManga: () => void
  onJumpToMusic: () => void
  durationSec: number
  videoTime: number
  videoPlaying: boolean
  videoRate: number
  videoVolume: number
  videoMuted: boolean
  videoFitMode: VideoFitMode
  videoLoopMode: 'single' | 'list'
  videoLoopModeLabel: string
  mediaPreloadMemoryBudgetMb: number
  videoPreloadItems: Array<{ id: string; src: string; sizeMb: number }>
  videoSourceUrl: string | null
  subtitleTrackUrl: string | null
  subtitleVisible: boolean
  subtitleLoading: boolean
  subtitleMessage: string | null
  subtitleOptions: Array<{ id: string; label: string; format: 'vtt' | 'srt' | 'ass' | 'ssa' }>
  selectedSubtitleId: string | null
  fullscreenActive: boolean
  coverImageUrl: string | null
  focusedVideo: VideoItem | null
  active: boolean
  onTogglePlay: () => void
  onPrevVideo: () => void
  onNextVideo: () => void
  onVideoEnded: () => void
  onSeekVideo: (time: number) => void
  onVideoTimeUpdate: (time: number) => void
  onVideoDurationDetected: (duration: number) => void
  onToggleMute: () => void
  onToggleSubtitle: () => void
  onSelectSubtitle: (subtitleId: string) => void
  onChangeVolume: (volume: number) => void
  onChangeRate: (rate: number) => void
  onCycleVideoLoopMode: () => void
  onCycleVideoFitMode: () => void
  onSetVideoFitMode: (mode: VideoFitMode) => void
  onSaveCover: () => void
  onEnterFullscreen: () => void
}

function VideoMainSection({
  manageMode,
  metadataManageMode,
  sidebarSelectedCount,
  imageSelectedCount,
  activeSelectionScope,
  pendingManageAction,
  manageOperationHint,
  canManageDelete,
  canManageMoveNodes = false,
  canManageAddToPlaylist = false,
  onManageDelete,
  onManageGroup = () => undefined,
  onManageAddToPlaylist = () => undefined,
  metadataPending,
  onMetadataSyncName,
  canJumpToManga,
  canJumpToMusic,
  onJumpToManga,
  onJumpToMusic,
  durationSec,
  videoTime,
  videoPlaying,
  videoRate,
  videoVolume,
  videoMuted,
  videoFitMode,
  videoLoopMode,
  videoLoopModeLabel,
  mediaPreloadMemoryBudgetMb,
  videoPreloadItems,
  videoSourceUrl,
  subtitleTrackUrl,
  subtitleVisible,
  subtitleLoading,
  subtitleMessage,
  subtitleOptions,
  selectedSubtitleId,
  fullscreenActive,
  coverImageUrl,
  focusedVideo,
  active,
  onTogglePlay,
  onPrevVideo,
  onNextVideo,
  onVideoEnded,
  onSeekVideo,
  onVideoTimeUpdate,
  onVideoDurationDetected,
  onToggleMute,
  onToggleSubtitle,
  onSelectSubtitle,
  onChangeVolume,
  onChangeRate,
  onCycleVideoLoopMode,
  onCycleVideoFitMode,
  onSetVideoFitMode,
  onSaveCover,
  onEnterFullscreen,
}: VideoMainSectionProps) {
  const { t } = useI18n()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const lastSeekPreviewAtRef = useRef(0)
  const lastSeekPreviewValueRef = useRef<number | null>(null)
  const [hasPlayedCurrentSource, setHasPlayedCurrentSource] = useState(false)
  const [hasSeekPreviewCurrentSource, setHasSeekPreviewCurrentSource] = useState(false)
  const [seekDraftTime, setSeekDraftTime] = useState<number | null>(null)
  const [openPopover, setOpenPopover] = useState<VideoPopoverKey | null>(null)
  const clampedTime = Math.min(videoTime, Math.max(0, durationSec))
  const displayTime = seekDraftTime == null ? clampedTime : clamp(seekDraftTime, 0, Math.max(0, durationSec))
  const progressPercent = durationSec > 0 ? clamp((displayTime / durationSec) * 100, 0, 100) : 0
  const videoProgressRangeStyle = {
    '--mpx-skeuo-range-pct': `${progressPercent}%`,
  } as CSSProperties
  const volumePercent = clamp(videoMuted ? 0 : videoVolume, 0, 100)
  const videoVolumeRangeStyle = {
    '--mpx-skeuo-range-pct': `${volumePercent}%`,
  } as CSSProperties
  const showVideoFrame = Boolean(videoSourceUrl && (videoPlaying || hasPlayedCurrentSource || hasSeekPreviewCurrentSource || !coverImageUrl))
  const showCover = Boolean(videoSourceUrl && !showVideoFrame && coverImageUrl)
  const videoScreenBackground = 'var(--mpx-bg-elevated)'
  const videoObjectFit = videoFitMode === 'original' ? 'none' : videoFitMode
  const subtitleToggleLabel = subtitleVisible ? t('a11y.media.subtitleOn') : t('a11y.media.subtitleOff')
  const videoFitLabel =
    videoFitMode === 'fill'
      ? t('a11y.media.videoFitFill')
      : videoFitMode === 'original'
        ? t('a11y.media.videoFitOriginal')
        : t('a11y.media.videoFitContain')
  const toolbarAuthor = focusedVideo?.author.trim() ?? ''
  const toolbarVideoSummary = focusedVideo
    ? [
        focusedVideo.workTitle.trim() || focusedVideo.fileName,
        toolbarAuthor && toolbarAuthor !== t('ui.common.unknown') ? `[${toolbarAuthor}]` : null,
        `${focusedVideo.width}x${focusedVideo.height}`,
        `${focusedVideo.sizeMb}MB`,
      ]
        .filter((value): value is string => Boolean(value))
        .join('    ')
    : t('a11y.media.videoPreview')
  const manageSummary =
    activeSelectionScope === 'sidebar'
      ? t('a11y.manage.selectedSidebarNodes', { count: sidebarSelectedCount })
      : activeSelectionScope === 'image'
        ? t('a11y.manage.selectedMediaItems', { count: imageSelectedCount })
        : t('a11y.manage.noSelection')

  const closePopover = () => {
    setOpenPopover(null)
  }

  useMediaPreloadWindow({
    mediaType: 'video',
    items: videoPreloadItems,
    activeId: focusedVideo?.id ?? null,
    budgetMb: mediaPreloadMemoryBudgetMb,
    lookBehind: 1,
    lookAhead: 2,
  })

  const commitSeekDraft = () => {
    if (seekDraftTime == null) {
      return
    }
    const nextTime = clamp(seekDraftTime, 0, Math.max(0, durationSec))
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

  useEffect(() => {
    setHasPlayedCurrentSource(false)
    setHasSeekPreviewCurrentSource(false)
    setSeekDraftTime(null)
    lastSeekPreviewAtRef.current = 0
    lastSeekPreviewValueRef.current = null
  }, [videoSourceUrl])

  useEffect(() => {
    if (videoPlaying && videoSourceUrl) {
      setHasPlayedCurrentSource(true)
    }
  }, [videoPlaying, videoSourceUrl])

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

  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoSourceUrl) {
      return
    }

    const tracks = video.textTracks
    for (let index = 0; index < tracks.length; index += 1) {
      tracks[index].mode = subtitleVisible && subtitleTrackUrl ? 'showing' : 'hidden'
    }
  }, [subtitleTrackUrl, subtitleVisible, videoSourceUrl])

  return (
    <>
      <div className="main-toolbar">
        {manageMode ? (
          <>
            <div className="toolbar-actions toolbar-actions-manage">
              <button
                className="feature-action-btn main-icon-square-btn"
                type="button"
                aria-label={t('a11y.media.addToPlaylist')}
                title={t('tip.media.addToPlaylist')}
                disabled={!canManageAddToPlaylist || pendingManageAction}
                onClick={onManageAddToPlaylist}
              >
                <span aria-hidden="true">P</span>
              </button>
              <button
                className="feature-action-btn main-icon-square-btn"
                type="button"
                aria-label={t('a11y.common.organize')}
                title={t('tip.common.organize')}
                disabled={!canManageMoveNodes || pendingManageAction}
                onClick={onManageGroup}
              >
                <span aria-hidden="true">{t('ui.common.organizeShort')}</span>
              </button>
              <button
                className="vector-search-btn main-icon-square-btn"
                type="button"
                aria-label={t('a11y.common.delete')}
                title={t('tip.common.delete')}
                disabled={!canManageDelete || pendingManageAction}
                onClick={onManageDelete}
              >
                <MainUiIcon name="delete" />
              </button>
              {manageOperationHint ? <span className="main-toolbar-hint">{manageOperationHint}</span> : null}
            </div>
            <strong className="main-toolbar-summary" title={manageSummary}>
              {manageSummary}
            </strong>
          </>
        ) : metadataManageMode ? (
          <>
            <strong className="main-toolbar-title">{t('ui.header.metadataManage')}</strong>
            <div className="toolbar-actions toolbar-actions-manage">
              <button
                className="feature-action-btn main-icon-square-btn"
                type="button"
                aria-label={t('a11y.common.syncName')}
                title={t('tip.common.syncName')}
                disabled={metadataPending}
                onClick={onMetadataSyncName}
              >
                <MainUiIcon name="refresh" />
              </button>
              {manageOperationHint ? <span className="main-toolbar-hint">{manageOperationHint}</span> : null}
            </div>
          </>
        ) : (
          <>
            <ToolbarTitleMarquee className="main-toolbar-title is-video" text={toolbarVideoSummary} />
            {canJumpToManga || canJumpToMusic ? (
              <div className="toolbar-actions">
                {canJumpToManga ? (
                  <button
                    className="toolbar-icon-btn"
                    type="button"
                    aria-label={t('a11y.media.manga')}
                    title={t('tip.media.manga')}
                    onClick={onJumpToManga}
                  >
                    <MainUiIcon name="imageMode" />
                  </button>
                ) : null}
                {canJumpToMusic ? (
                  <button
                    className="toolbar-icon-btn"
                    type="button"
                    aria-label={t('a11y.media.music')}
                    title={t('tip.media.music')}
                    onClick={onJumpToMusic}
                  >
                    <MainUiIcon name="musicMode" />
                  </button>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="video-preview">
        <div className="video-screen" style={{ background: videoScreenBackground }}>
        {videoSourceUrl ? (
          <video
            ref={videoRef}
            className="video-screen-media"
            style={{
              opacity: showVideoFrame ? 1 : 0,
              objectFit: videoObjectFit,
              objectPosition: 'center center',
            }}
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
              if (!videoPlaying && !coverImageUrl) {
                const video = videoRef.current
                if (video && video.duration > 0) {
                  video.currentTime = Math.min(0.001, video.duration)
                }
              }
              const currentTime = videoRef.current?.currentTime ?? 0
              onVideoTimeUpdate(currentTime)
            }}
            onEnded={() => {
              onVideoEnded()
            }}
          >
            {subtitleTrackUrl ? <track default kind="subtitles" label={t('ui.media.subtitleTrack')} src={subtitleTrackUrl} /> : null}
          </video>
        ) : null}

        {showCover && coverImageUrl ? (
          <img
            className="video-screen-cover-image"
            style={{ objectFit: videoObjectFit, objectPosition: 'center center' }}
            src={coverImageUrl}
            alt={t('ui.media.videoCoverAlt')}
          />
        ) : null}

        {!videoSourceUrl ? (
          <div className="video-screen-empty">
            <span>{t('ui.media.noVideoSource')}</span>
          </div>
        ) : null}
        </div>

        <div className="video-controls-shell">
        <div className="video-controls-progress">
          <span className="video-progress-time">{`${formatSeconds(displayTime)} / ${formatSeconds(durationSec)}`}</span>
          <input
            aria-label={t('a11y.media.progress')}
            max={durationSec}
            min={0}
            step={0.1}
            style={videoProgressRangeStyle}
            type="range"
            value={displayTime}
            onChange={(event) => {
              setHasSeekPreviewCurrentSource(true)
              const nextTime = clamp(Number(event.target.value), 0, Math.max(0, durationSec))
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
            {fullscreenActive ? (
              <button
                aria-label={t('a11y.media.dualModeFullscreenOnly')}
                className="video-action-btn video-action-dual"
                title={t('tip.media.dualModeInFullscreen')}
                type="button"
              >
                <VideoControlIcon name="dual" />
              </button>
            ) : null}

            <div
              className={`video-ctrl-popover ${openPopover === 'fit' ? 'is-open' : ''}`}
              onMouseEnter={() => setOpenPopover('fit')}
              onMouseLeave={closePopover}
            >
              <button
                aria-controls="video-main-popover-fit"
                aria-expanded={openPopover === 'fit'}
                aria-haspopup="dialog"
                className="video-action-btn video-action-fit"
                aria-label={videoFitLabel}
                type="button"
                onClick={onCycleVideoFitMode}
              >
                <VideoControlIcon name="aspect" />
              </button>
              <div className="video-ctrl-panel is-fit" hidden={openPopover !== 'fit'} id="video-main-popover-fit" role="dialog">
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
              onMouseEnter={() => setOpenPopover('subtitle')}
              onMouseLeave={closePopover}
            >
              <button
                aria-controls="video-main-popover-subtitle"
                aria-expanded={openPopover === 'subtitle'}
                aria-haspopup="dialog"
                className="video-action-btn video-action-subtitle"
                aria-label={subtitleToggleLabel}
                type="button"
                onClick={onToggleSubtitle}
              >
                <VideoControlIcon name="subtitle" />
              </button>
              <div className="video-ctrl-panel" hidden={openPopover !== 'subtitle'} id="video-main-popover-subtitle" role="dialog">
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
              onMouseEnter={() => setOpenPopover('speed')}
              onMouseLeave={closePopover}
            >
              <button
                aria-controls="video-main-popover-speed"
                aria-expanded={openPopover === 'speed'}
                aria-haspopup="dialog"
                className="video-action-btn video-action-speed"
                aria-label={t('a11y.media.playbackRate', { rate: videoRate.toFixed(2) })}
                type="button"
              >
                <VideoControlIcon name="speed" />
              </button>
              <div className="video-ctrl-panel is-speed" hidden={openPopover !== 'speed'} id="video-main-popover-speed" role="dialog">
                <div className="video-ctrl-panel-options">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      aria-pressed={Math.abs(videoRate - rate) < 0.01}
                      className={`video-ctrl-panel-option ${Math.abs(videoRate - rate) < 0.01 ? 'is-active' : ''}`}
                      key={rate}
                      type="button"
                      onClick={() => {
                        onChangeRate(rate)
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
              aria-label={t('a11y.media.hotkeyFullscreen')}
              className="video-action-btn video-action-fullscreen video-fullscreen-btn"
              type="button"
              onClick={onEnterFullscreen}
            >
              <VideoControlIcon name="fullscreenExpand" />
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
              onClick={onTogglePlay}
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

            {fullscreenActive ? (
              <div
                className={`video-ctrl-popover ${openPopover === 'playlist' ? 'is-open' : ''}`}
                onMouseEnter={() => setOpenPopover('playlist')}
                onMouseLeave={closePopover}
              >
                <button
                  aria-controls="video-main-popover-playlist"
                  aria-expanded={openPopover === 'playlist'}
                  aria-haspopup="dialog"
                  aria-label={t('a11y.media.playlistFullscreenOnly')}
                  className="video-action-btn video-action-playlist"
                  title={t('tip.media.playlistInFullscreen')}
                  type="button"
                >
                  <VideoControlIcon name="playlist" />
                </button>
                <div className="video-ctrl-panel" hidden={openPopover !== 'playlist'} id="video-main-popover-playlist" role="dialog">
                  <span className="video-ctrl-panel-title">{t('ui.media.playlist')}</span>
                  <span className="video-ctrl-panel-note">{t('ui.media.playlistFullscreenHint')}</span>
                </div>
              </div>
            ) : null}

            <button
              aria-label={t('a11y.media.videoLoopMode', { label: videoLoopModeLabel })}
              className="video-action-btn video-action-loop-mode"
              title={t('tip.media.videoLoopMode', { label: videoLoopModeLabel })}
              type="button"
              onClick={onCycleVideoLoopMode}
            >
              <MusicControlIcon
                className="video-action-icon"
                name={videoLoopMode === 'single' ? 'repeatOne' : 'repeatAlbum'}
              />
            </button>

            <div
              className={`video-ctrl-popover ${openPopover === 'volume' ? 'is-open' : ''}`}
              onMouseEnter={() => setOpenPopover('volume')}
              onMouseLeave={closePopover}
            >
              <button
                aria-controls="video-main-popover-volume"
                aria-expanded={openPopover === 'volume'}
                aria-haspopup="dialog"
                className="video-action-btn video-action-mute"
                aria-label={videoMuted ? t('a11y.media.unmute') : t('a11y.media.mute')}
                type="button"
                onClick={onToggleMute}
              >
                <VideoControlIcon name={videoMuted ? 'volumeMuted' : 'volume'} />
              </button>
              <div className="video-ctrl-panel is-volume" hidden={openPopover !== 'volume'} id="video-main-popover-volume" role="dialog">
                <div className="video-ctrl-volume-axis">
                  <input
                    aria-label={t('a11y.media.volumeSlider')}
                    className="video-ctrl-volume-range"
                    max={100}
                    min={0}
                    step={1}
                    style={videoVolumeRangeStyle}
                    type="range"
                    value={videoMuted ? 0 : videoVolume}
                    onChange={(event) => onChangeVolume(Number(event.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  )
}

export default VideoMainSection
