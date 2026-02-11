import { useEffect, useRef, useState } from 'react'

import { clamp, formatSeconds } from '../utils/ui'

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
  const [hasPlayedCurrentSource, setHasPlayedCurrentSource] = useState(false)
  const clampedTime = Math.min(videoTime, Math.max(0, durationSec))
  const showCover = Boolean(videoSourceUrl && !videoPlaying && !hasPlayedCurrentSource)
  const showVideoFrame = Boolean(videoSourceUrl && (videoPlaying || hasPlayedCurrentSource))
  const videoScreenBackground = !videoSourceUrl
    ? 'var(--mpx-video-empty-bg)'
    : showCover
      ? coverColor
      : 'var(--mpx-video-screen-bg)'
  const manageSummary =
    activeSelectionScope === 'sidebar'
      ? `已选目录节点: ${sidebarSelectedCount}`
      : activeSelectionScope === 'image'
        ? `已选媒体条目: ${imageSelectedCount}`
        : '未选择条目'

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

  return (
    <div className="video-preview">
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
          <strong className="main-toolbar-title">视频预览</strong>
        )}
      </div>

      <div className="video-screen" style={{ background: videoScreenBackground }}>
        {videoSourceUrl ? (
          <video
            ref={videoRef}
            className="video-screen-media"
            style={{ opacity: showVideoFrame ? 1 : 0 }}
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

        {showCover && coverImageUrl ? <img className="video-screen-cover-image" src={coverImageUrl} alt="视频封面" /> : null}

        {videoSourceUrl ? (
          <div className="video-screen-hud">
            {videoPlaying ? (
              <span>{`真实视频 ${formatSeconds(clampedTime)} / ${formatSeconds(durationSec)}`}</span>
            ) : showCover ? (
              <span>{`封面态（待播放） ${formatSeconds(clampedTime)} / ${formatSeconds(durationSec)}`}</span>
            ) : (
              <span>{`暂停 ${formatSeconds(clampedTime)} / ${formatSeconds(durationSec)}`}</span>
            )}
          </div>
        ) : null}

        {!videoSourceUrl ? (
          <div className="video-screen-empty">
            <span>无可用视频源</span>
          </div>
        ) : null}
      </div>

      <div className="video-progress-line">
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

      <div className="video-controls">
        <div className="video-controls-group is-transport">
          <button className="video-action-btn video-action-play" type="button" onClick={onTogglePlay}>
            {videoPlaying ? '暂停' : '播放'}
          </button>
          <button className="video-action-btn video-action-prev" type="button" onClick={onPrevVideo}>
            上一个
          </button>
          <button className="video-action-btn video-action-next" type="button" onClick={onNextVideo}>
            下一个
          </button>
        </div>

        <div className="video-controls-group is-audio">
          <button className="video-action-btn video-action-mute" type="button" onClick={onToggleMute}>
            {videoMuted ? '取消静音' : '静音'}
          </button>
          <label className="video-volume-inline player-inline-field">
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
        </div>

        <div className="video-controls-group is-rate">
          <label className="video-rate-inline player-inline-field">
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
        </div>

        <div className="video-controls-group is-utility">
          <button className="video-action-btn video-action-save-cover" type="button" onClick={onSaveCover}>
            Save as cover
          </button>
          <button className="video-action-btn video-action-fullscreen video-fullscreen-btn" type="button" onClick={onEnterFullscreen}>
            F 全屏
          </button>
        </div>
      </div>
    </div>
  )
}

export default VideoMainSection
