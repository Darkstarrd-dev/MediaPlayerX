import { useEffect, useMemo, useRef, useState } from 'react'

import { VideoControlIcon } from './VideoControlIcon'
import type { AudioItem } from '../types'
import { clamp, formatSeconds } from '../utils/ui'

type MusicPopoverKey = 'volume'

interface MusicMainSectionProps {
  active: boolean
  interruptByVideoPlayback: boolean
  playRequestNonce: number
  manageMode: boolean
  metadataManageMode: boolean
  sidebarSelectedCount: number
  imageSelectedCount: number
  activeSelectionScope: 'sidebar' | 'image' | null
  pendingManageAction: boolean
  manageOperationHint: string | null
  canManageDelete: boolean
  onManageDelete: () => void
  onClearManageSelection: () => void
  canJumpToManga: boolean
  canJumpToAnimation: boolean
  onJumpToManga: () => void
  onJumpToAnimation: () => void
  audios: AudioItem[]
  focusedAudio: AudioItem | null
  focusedAudioSrc: string | null
  canPrevAudio: boolean
  canNextAudio: boolean
  onPrevAudio: () => void
  onNextAudio: () => void
}

function MusicMainSection({
  active,
  interruptByVideoPlayback,
  playRequestNonce,
  manageMode,
  metadataManageMode,
  sidebarSelectedCount,
  imageSelectedCount,
  activeSelectionScope,
  pendingManageAction,
  manageOperationHint,
  canManageDelete,
  onManageDelete,
  onClearManageSelection,
  canJumpToManga,
  canJumpToAnimation,
  onJumpToManga,
  onJumpToAnimation,
  audios,
  focusedAudio,
  focusedAudioSrc,
  canPrevAudio,
  canNextAudio,
  onPrevAudio,
  onNextAudio,
}: MusicMainSectionProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastPlayRequestNonceRef = useRef(playRequestNonce)
  const [openPopover, setOpenPopover] = useState<MusicPopoverKey | null>(null)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [audioVolume, setAudioVolume] = useState(60)
  const [audioMuted, setAudioMuted] = useState(false)
  const [audioTime, setAudioTime] = useState(0)
  const [audioDurationSec, setAudioDurationSec] = useState(0)

  const toolbarSummary = useMemo(() => {
    if (!focusedAudio) {
      return '音乐列表'
    }

    const album = focusedAudio.album.trim()
    const author = focusedAudio.author.trim()
    return [
      album || '未知专辑',
      author || '未知作者',
    ]
      .filter((value): value is string => Boolean(value))
      .join(' / ')
  }, [focusedAudio])

  const clampedAudioTime = clamp(audioTime, 0, Math.max(0, audioDurationSec))

  const manageSummary =
    activeSelectionScope === 'sidebar'
      ? `已选目录节点: ${sidebarSelectedCount}`
      : activeSelectionScope === 'image'
        ? `已选媒体条目: ${imageSelectedCount}`
        : '未选择条目'

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) {
      return
    }

    audio.muted = audioMuted
    audio.volume = clamp(audioVolume / 100, 0, 1)

    if (!focusedAudioSrc) {
      audio.pause()
      setAudioTime(0)
      return
    }

    if (audioPlaying) {
      void audio.play().catch(() => {
        setAudioPlaying(false)
      })
      return
    }

    audio.pause()
  }, [audioMuted, audioPlaying, audioVolume, focusedAudioSrc])

  useEffect(() => {
    setAudioTime(0)
    setAudioDurationSec(Math.max(0, focusedAudio?.durationSec ?? 0))
    if (!focusedAudioSrc) {
      setAudioPlaying(false)
    }
  }, [focusedAudio?.id, focusedAudio?.durationSec, focusedAudioSrc])

  useEffect(() => {
    if (!interruptByVideoPlayback) {
      return
    }
    setAudioPlaying(false)
  }, [interruptByVideoPlayback])

  useEffect(() => {
    if (playRequestNonce === lastPlayRequestNonceRef.current) {
      return
    }
    lastPlayRequestNonceRef.current = playRequestNonce

    if (!focusedAudioSrc || interruptByVideoPlayback) {
      return
    }
    setAudioPlaying(true)
  }, [focusedAudioSrc, interruptByVideoPlayback, playRequestNonce])

  const closePopover = () => {
    setOpenPopover(null)
  }

  return (
    <>
      {active ? (
        <>
          <div className="main-toolbar">
            {manageMode ? (
              <>
                <div className="toolbar-actions toolbar-actions-manage">
                  <button className="vector-search-btn" type="button" disabled={!canManageDelete || pendingManageAction} onClick={onManageDelete}>
                    删除
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
                {manageOperationHint ? (
                  <div className="toolbar-actions toolbar-actions-manage">
                    <span className="main-toolbar-hint">{manageOperationHint}</span>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <strong className="main-toolbar-title" title={toolbarSummary}>
                  {`${toolbarSummary} (${audios.length} 首)`}
                </strong>
                {canJumpToManga || canJumpToAnimation ? (
                  <div className="toolbar-actions">
                    {canJumpToManga ? (
                      <button className="toolbar-icon-btn" type="button" aria-label="漫画版" title="漫画版" onClick={onJumpToManga}>
                        <span aria-hidden="true">▦</span>
                      </button>
                    ) : null}
                    {canJumpToAnimation ? (
                      <button className="toolbar-icon-btn" type="button" aria-label="动画版" title="动画版" onClick={onJumpToAnimation}>
                        <span aria-hidden="true">▧</span>
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="name-list music-name-list music-visualizer-placeholder" aria-label="music visualizer">
            <div className="music-visualizer-placeholder-inner">Music Visualizer (Placeholder)</div>
          </div>

          <div className="music-controls-shell">
            <div className="music-controls-progress">
              <span className="video-progress-time">{`${formatSeconds(clampedAudioTime)} / ${formatSeconds(audioDurationSec)}`}</span>
              <input
                aria-label="音乐进度滑条"
                max={Math.max(0, audioDurationSec)}
                min={0}
                step={0.1}
                type="range"
                value={clampedAudioTime}
                onChange={(event) => {
                  const nextTime = clamp(Number(event.target.value), 0, Math.max(0, audioDurationSec))
                  setAudioTime(nextTime)
                  const audio = audioRef.current
                  if (audio) {
                    audio.currentTime = nextTime
                  }
                }}
              />
            </div>

            <div className="music-controls-row">
              <div className="music-controls-group is-left">
                <div
                  className={`music-ctrl-popover ${openPopover === 'volume' ? 'is-open' : ''}`}
                  onMouseEnter={() => setOpenPopover('volume')}
                  onMouseLeave={closePopover}
                >
                  <button
                    aria-controls="music-main-popover-volume"
                    aria-expanded={openPopover === 'volume'}
                    aria-haspopup="dialog"
                    aria-label={audioMuted ? '取消静音' : '静音'}
                    className="video-action-btn"
                    type="button"
                    onClick={() => setAudioMuted((value) => !value)}
                  >
                    <VideoControlIcon name={audioMuted ? 'volumeMuted' : 'volume'} />
                  </button>

                  <div className="music-ctrl-panel is-volume" hidden={openPopover !== 'volume'} id="music-main-popover-volume" role="dialog">
                    <input
                      aria-label="音量滑条"
                      className="music-ctrl-volume-range"
                      max={100}
                      min={0}
                      step={1}
                      type="range"
                      value={audioMuted ? 0 : audioVolume}
                      onChange={(event) => {
                        setAudioMuted(false)
                        setAudioVolume(clamp(Number(event.target.value), 0, 100))
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="music-controls-group is-center">
                <button aria-label="上一个" className="video-action-btn" disabled={!canPrevAudio} type="button" onClick={onPrevAudio}>
                  <VideoControlIcon name="prev" />
                </button>
                <button
                  aria-label={audioPlaying ? '暂停' : '播放'}
                  className="video-action-btn"
                  disabled={!focusedAudioSrc}
                  type="button"
                  onClick={() => {
                    if (!focusedAudioSrc) {
                      return
                    }
                    setAudioPlaying((value) => !value)
                  }}
                >
                  <VideoControlIcon name={audioPlaying ? 'pause' : 'play'} />
                </button>
                <button aria-label="下一个" className="video-action-btn" disabled={!canNextAudio} type="button" onClick={onNextAudio}>
                  <VideoControlIcon name="next" />
                </button>
              </div>

              <div className="music-controls-group is-right" />
            </div>
          </div>
        </>
      ) : null}

      <audio
        ref={audioRef}
        className="music-native-audio"
        src={focusedAudioSrc ?? undefined}
        preload="metadata"
        onTimeUpdate={() => {
          const currentTime = audioRef.current?.currentTime ?? 0
          setAudioTime(currentTime)
        }}
        onLoadedMetadata={() => {
          const duration = audioRef.current?.duration ?? 0
          if (Number.isFinite(duration) && duration > 0) {
            setAudioDurationSec(duration)
          } else {
            setAudioDurationSec(Math.max(0, focusedAudio?.durationSec ?? 0))
          }
          setAudioTime(audioRef.current?.currentTime ?? 0)
        }}
        onEnded={() => {
          setAudioTime(0)
          onNextAudio()
        }}
      />
    </>
  )
}

export default MusicMainSection
