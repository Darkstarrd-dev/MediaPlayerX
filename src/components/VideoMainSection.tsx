import { useEffect, useRef, useState } from 'react'

import { VideoControlIcon } from './VideoControlIcon'
import type { VideoItem } from '../types'
import { videoFitModeLabel, type VideoFitMode } from '../features/media/videoFitMode'
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
  canManageHide: boolean
  canManageUnhide: boolean
  onManageDelete: () => void
  onManageHide: () => void
  onManageUnhide: () => void
  onClearManageSelection: () => void
  metadataPending: boolean
  onMetadataSyncName: () => void
  canJumpToManga: boolean
  onJumpToManga: () => void
  durationSec: number
  videoTime: number
  videoPlaying: boolean
  videoRate: number
  videoVolume: number
  videoMuted: boolean
  videoFitMode: VideoFitMode
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
  onSeekVideo: (time: number) => void
  onVideoTimeUpdate: (time: number) => void
  onVideoDurationDetected: (duration: number) => void
  onToggleMute: () => void
  onToggleSubtitle: () => void
  onSelectSubtitle: (subtitleId: string) => void
  onChangeVolume: (volume: number) => void
  onChangeRate: (rate: number) => void
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
  canManageHide,
  canManageUnhide,
  onManageDelete,
  onManageHide,
  onManageUnhide,
  onClearManageSelection,
  metadataPending,
  onMetadataSyncName,
  canJumpToManga,
  onJumpToManga,
  durationSec,
  videoTime,
  videoPlaying,
  videoRate,
  videoVolume,
  videoMuted,
  videoFitMode,
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
  onSeekVideo,
  onVideoTimeUpdate,
  onVideoDurationDetected,
  onToggleMute,
  onToggleSubtitle,
  onSelectSubtitle,
  onChangeVolume,
  onChangeRate,
  onCycleVideoFitMode,
  onSetVideoFitMode,
  onSaveCover,
  onEnterFullscreen,
}: VideoMainSectionProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [hasPlayedCurrentSource, setHasPlayedCurrentSource] = useState(false)
  const [openPopover, setOpenPopover] = useState<VideoPopoverKey | null>(null)
  const clampedTime = Math.min(videoTime, Math.max(0, durationSec))
  const showCover = Boolean(videoSourceUrl && !videoPlaying && !hasPlayedCurrentSource)
  const showVideoFrame = Boolean(videoSourceUrl && (videoPlaying || hasPlayedCurrentSource))
  const videoScreenBackground = 'var(--mpx-bg-elevated)'
  const videoObjectFit = videoFitMode === 'original' ? 'none' : videoFitMode
  const toolbarAuthor = focusedVideo?.author.trim() ?? ''
  const toolbarVideoSummary = focusedVideo
    ? [
        focusedVideo.workTitle.trim() || focusedVideo.fileName,
        toolbarAuthor && toolbarAuthor !== '未知' ? `[${toolbarAuthor}]` : null,
        `${focusedVideo.width}x${focusedVideo.height}`,
        `${focusedVideo.sizeMb}MB`,
      ]
        .filter((value): value is string => Boolean(value))
        .join('    ')
    : '视频预览'
  const manageSummary =
    activeSelectionScope === 'sidebar'
      ? `已选目录节点: ${sidebarSelectedCount}`
      : activeSelectionScope === 'image'
        ? `已选媒体条目: ${imageSelectedCount}`
        : '未选择条目'

  const closePopover = () => {
    setOpenPopover(null)
  }

  useEffect(() => {
    setHasPlayedCurrentSource(false)
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
              <button className="vector-search-btn" type="button" disabled={!canManageDelete || pendingManageAction} onClick={onManageDelete}>
                删除
              </button>
              <button className="feature-action-btn" type="button" disabled={!canManageHide || pendingManageAction} onClick={onManageHide}>
                隐藏
              </button>
              <button className="feature-action-btn" type="button" disabled={!canManageUnhide || pendingManageAction} onClick={onManageUnhide}>
                取消隐藏
              </button>
              <button className="feature-action-btn" type="button" disabled={pendingManageAction} onClick={onClearManageSelection}>
                清空选择
              </button>
              {manageOperationHint ? <span className="main-toolbar-hint">{manageOperationHint}</span> : null}
            </div>
            <strong className="main-toolbar-summary" title={manageSummary}>
              {manageSummary}
            </strong>
          </>
        ) : metadataManageMode ? (
          <>
            <strong className="main-toolbar-title">元数据管理</strong>
            <div className="toolbar-actions toolbar-actions-manage">
              <button className="feature-action-btn" type="button" disabled={metadataPending} onClick={onMetadataSyncName}>
                同步名称
              </button>
              {manageOperationHint ? <span className="main-toolbar-hint">{manageOperationHint}</span> : null}
            </div>
          </>
        ) : (
          <>
            <strong className="main-toolbar-title is-video" title={toolbarVideoSummary}>
              {toolbarVideoSummary}
            </strong>
            {canJumpToManga ? (
              <div className="toolbar-actions">
                <button
                  className="toolbar-icon-btn"
                  type="button"
                  aria-label="漫画版"
                  title="漫画版"
                  onClick={onJumpToManga}
                >
                  <span aria-hidden="true">▦</span>
                </button>
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
              const currentTime = videoRef.current?.currentTime ?? 0
              onVideoTimeUpdate(currentTime)
            }}
            onEnded={() => {
              onVideoTimeUpdate(0)
              onNextVideo()
            }}
          >
            {subtitleTrackUrl ? <track default kind="subtitles" label="字幕" src={subtitleTrackUrl} /> : null}
          </video>
        ) : null}

        {showCover && coverImageUrl ? (
          <img
            className="video-screen-cover-image"
            style={{ objectFit: videoObjectFit, objectPosition: 'center center' }}
            src={coverImageUrl}
            alt="视频封面"
          />
        ) : null}

        {!videoSourceUrl ? (
          <div className="video-screen-empty">
            <span>无可用视频源</span>
          </div>
        ) : null}
        </div>

        <div className="video-controls-shell">
        <div className="video-controls-progress">
          <span className="video-progress-time">{`${formatSeconds(clampedTime)} / ${formatSeconds(durationSec)}`}</span>
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

        <div className="video-controls-row video-controls">
          <div className="video-controls-group is-left">
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
                aria-label={videoMuted ? '取消静音' : '静音'}
                type="button"
                onClick={onToggleMute}
              >
                <VideoControlIcon name={videoMuted ? 'volumeMuted' : 'volume'} />
              </button>
              <div className="video-ctrl-panel is-volume" hidden={openPopover !== 'volume'} id="video-main-popover-volume" role="dialog">
                <input
                  aria-label="音量滑条"
                  className="video-ctrl-volume-range"
                  max={100}
                  min={0}
                  step={1}
                  type="range"
                  value={videoMuted ? 0 : videoVolume}
                  onChange={(event) => onChangeVolume(Number(event.target.value))}
                />
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
                aria-label={subtitleVisible ? '字幕:开' : '字幕:关'}
                type="button"
                onClick={onToggleSubtitle}
              >
                <VideoControlIcon name="subtitle" />
              </button>
              <div className="video-ctrl-panel" hidden={openPopover !== 'subtitle'} id="video-main-popover-subtitle" role="dialog">
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
              onMouseEnter={() => setOpenPopover('speed')}
              onMouseLeave={closePopover}
            >
              <button
                aria-controls="video-main-popover-speed"
                aria-expanded={openPopover === 'speed'}
                aria-haspopup="dialog"
                className="video-action-btn video-action-speed"
                aria-label={`倍速 x${videoRate.toFixed(2)}`}
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
              aria-label="F 全屏"
              className="video-action-btn video-action-fullscreen video-fullscreen-btn"
              type="button"
              onClick={onEnterFullscreen}
            >
              <VideoControlIcon name="fullscreen" />
            </button>

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
                aria-label={videoFitModeLabel(videoFitMode)}
                type="button"
                onClick={onCycleVideoFitMode}
              >
                <VideoControlIcon name="aspect" />
              </button>
              <div className="video-ctrl-panel is-fit" hidden={openPopover !== 'fit'} id="video-main-popover-fit" role="dialog">
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
              onClick={onTogglePlay}
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
            <button
              aria-label="切换独立或复合模式（仅全屏可用）"
              className="video-action-btn video-action-dual"
              disabled={!fullscreenActive}
              title={fullscreenActive ? '在全屏中切换独立/复合模式' : '仅全屏模式可用'}
              type="button"
            >
              <VideoControlIcon name="dual" />
            </button>

            <div
              className={`video-ctrl-popover ${openPopover === 'playlist' ? 'is-open' : ''}`}
              onMouseEnter={() => setOpenPopover('playlist')}
              onMouseLeave={closePopover}
            >
              <button
                aria-controls="video-main-popover-playlist"
                aria-expanded={openPopover === 'playlist'}
                aria-haspopup="dialog"
                aria-label="播放列表（仅全屏可用）"
                className="video-action-btn video-action-playlist"
                disabled={!fullscreenActive}
                title={fullscreenActive ? '在全屏中选择播放项' : '仅全屏模式可用'}
                type="button"
              >
                <VideoControlIcon name="playlist" />
              </button>
              <div className="video-ctrl-panel" hidden={openPopover !== 'playlist'} id="video-main-popover-playlist" role="dialog">
                <span className="video-ctrl-panel-title">播放列表</span>
                <span className="video-ctrl-panel-note">P3 在 fullscreen 内启用</span>
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
