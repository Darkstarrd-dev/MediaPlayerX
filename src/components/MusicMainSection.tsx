import { useEffect, useMemo, useRef, useState } from 'react'

import { VideoControlIcon } from './VideoControlIcon'
import type { AudioItem } from '../types'
import { clamp, formatSeconds } from '../utils/ui'

type MusicPopoverKey = 'volume'

interface MusicMainSectionProps {
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
  audios: AudioItem[]
  selectedAudioId: string
  focusedAudio: AudioItem | null
  focusedAudioSrc: string | null
  canPrevAudio: boolean
  canNextAudio: boolean
  onSelectAudio: (audioId: string) => void
  onPrevAudio: () => void
  onNextAudio: () => void
}

function MusicMainSection({
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
  audios,
  selectedAudioId,
  focusedAudio,
  focusedAudioSrc,
  canPrevAudio,
  canNextAudio,
  onSelectAudio,
  onPrevAudio,
  onNextAudio,
}: MusicMainSectionProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [openPopover, setOpenPopover] = useState<MusicPopoverKey | null>(null)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [audioVolume, setAudioVolume] = useState(60)
  const [audioMuted, setAudioMuted] = useState(false)

  const toolbarSummary = useMemo(() => {
    if (!focusedAudio) {
      return '音乐列表'
    }

    const author = focusedAudio.author.trim()
    const album = focusedAudio.album.trim()
    return [
      focusedAudio.trackTitle.trim() || focusedAudio.fileName,
      author ? `[${author}]` : null,
      album ? `(${album})` : null,
    ]
      .filter((value): value is string => Boolean(value))
      .join(' ')
  }, [focusedAudio])

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
    if (!focusedAudioSrc) {
      setAudioPlaying(false)
    }
  }, [focusedAudioSrc])

  const closePopover = () => {
    setOpenPopover(null)
  }

  return (
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
            <div className="toolbar-actions toolbar-actions-manage">
              <span className="main-toolbar-hint">音乐元数据编辑将在下一步接入</span>
            </div>
          </>
        ) : (
          <>
            <strong className="main-toolbar-title" title={toolbarSummary}>
              {`${toolbarSummary} (${audios.length} 首)`}
            </strong>
          </>
        )}
      </div>

      <div className="name-list music-name-list">
        <div className="name-list-header music-name-list-header">
          <span>文件名</span>
          <span>文件大小</span>
          <span>时长</span>
        </div>
        <div className="name-list-body">
          {audios.map((audio) => {
            const isFocused = audio.id === selectedAudioId
            return (
              <div key={audio.id} className={`name-list-row music-name-list-row ${isFocused ? 'is-focused' : ''}`}>
                <button
                  className="name-list-row-main"
                  type="button"
                  onClick={() => onSelectAudio(audio.id)}
                  onDoubleClick={() => {
                    onSelectAudio(audio.id)
                    setAudioPlaying(true)
                  }}
                >
                  <span>{audio.fileName}</span>
                  <span>{`${audio.sizeMb}MB`}</span>
                  <span>{formatSeconds(audio.durationSec)}</span>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="music-controls-shell">
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

      <audio
        ref={audioRef}
        className="music-native-audio"
        src={focusedAudioSrc ?? undefined}
        preload="metadata"
        onEnded={() => {
          onNextAudio()
        }}
      />
    </>
  )
}

export default MusicMainSection
