import { useEffect, useMemo, useRef, useState } from 'react'

import { VideoControlIcon } from './VideoControlIcon'
import type { AudioItem, MusicLoopMode } from '../types'
import { MUSIC_VISUALIZER_SHADERS, resolveDefaultMusicVisualizerShader } from '../features/music-visualizer/shaderRegistry'
import { useMusicVisualizerRuntime } from '../features/music-visualizer/useMusicVisualizerRuntime'
import { clamp, formatSeconds } from '../utils/ui'

type MusicPopoverKey = 'volume' | 'shader'

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
  canJumpToBooklet: boolean
  onJumpToManga: () => void
  onJumpToAnimation: () => void
  onJumpToBooklet: () => void
  audios: AudioItem[]
  focusedAudio: AudioItem | null
  focusedAudioSrc: string | null
  musicLoopMode: MusicLoopMode
  musicLoopModeLabel: string
  canPrevAudio: boolean
  canNextAudio: boolean
  fullscreenActive: boolean
  onToggleFullscreen: () => void
  musicVisualizerRenderLongEdgePx: number
  musicVisualizerFpsCap: 30 | 60 | 120
  musicVisualizerShowFps: boolean
  musicVisualizerRenderer: 'gpu' | 'cpu'
  onPrevAudio: () => void
  onNextAudio: () => void
  onCycleMusicLoopMode: () => void
}

function resolveLoopModeIconName(mode: MusicLoopMode): 'repeatOne' | 'repeatFolder' | 'repeatAlbum' | 'repeatLibrary' {
  if (mode === 'single') {
    return 'repeatOne'
  }
  if (mode === 'folder') {
    return 'repeatFolder'
  }
  if (mode === 'album') {
    return 'repeatAlbum'
  }
  return 'repeatLibrary'
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
  canJumpToBooklet,
  onJumpToManga,
  onJumpToAnimation,
  onJumpToBooklet,
  audios,
  focusedAudio,
  focusedAudioSrc,
  musicLoopMode,
  musicLoopModeLabel,
  canPrevAudio,
  canNextAudio,
  fullscreenActive,
  onToggleFullscreen,
  musicVisualizerRenderLongEdgePx,
  musicVisualizerFpsCap,
  musicVisualizerShowFps,
  musicVisualizerRenderer,
  onPrevAudio,
  onNextAudio,
  onCycleMusicLoopMode,
}: MusicMainSectionProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const visualizerCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const lastPlayRequestNonceRef = useRef(playRequestNonce)
  const [openPopover, setOpenPopover] = useState<MusicPopoverKey | null>(null)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [audioVolume, setAudioVolume] = useState(60)
  const [audioMuted, setAudioMuted] = useState(false)
  const [audioTime, setAudioTime] = useState(0)
  const [audioDurationSec, setAudioDurationSec] = useState(0)
  const [selectedShaderId, setSelectedShaderId] = useState(() => resolveDefaultMusicVisualizerShader()?.id ?? '')

  const { stats: visualizerStats, runtimeError: visualizerRuntimeError, resumeAudioAnalyser } = useMusicVisualizerRuntime({
    canvasRef: visualizerCanvasRef,
    audioRef,
    active,
    preferredRenderer: musicVisualizerRenderer,
    renderLongEdgePx: musicVisualizerRenderLongEdgePx,
    fpsCap: musicVisualizerFpsCap,
    selectedShaderId,
  })

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

  const selectedShaderLabel = useMemo(() => {
    return MUSIC_VISUALIZER_SHADERS.find((shader) => shader.id === selectedShaderId)?.label ?? '未选择 Shader'
  }, [selectedShaderId])

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
    if (!focusedAudio?.id && !focusedAudioSrc) {
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

  useEffect(() => {
    if (!audioPlaying) {
      return
    }
    void resumeAudioAnalyser()
  }, [audioPlaying, resumeAudioAnalyser])

  useEffect(() => {
    if (MUSIC_VISUALIZER_SHADERS.length === 0) {
      if (selectedShaderId !== '') {
        setSelectedShaderId('')
      }
      return
    }

    const matched = MUSIC_VISUALIZER_SHADERS.some((shader) => shader.id === selectedShaderId)
    if (matched) {
      return
    }

    setSelectedShaderId(resolveDefaultMusicVisualizerShader()?.id ?? MUSIC_VISUALIZER_SHADERS[0]?.id ?? '')
  }, [selectedShaderId])

  const closePopover = () => {
    setOpenPopover(null)
  }

  const musicControlsShell = (
    <div className={`music-controls-shell${fullscreenActive ? ' is-fullscreen-floating' : ''}`} onMouseLeave={closePopover}>
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

          <div
            className={`music-ctrl-popover ${openPopover === 'shader' ? 'is-open' : ''}`}
            onMouseEnter={() => setOpenPopover('shader')}
            onMouseLeave={closePopover}
          >
            <button
              aria-controls="music-main-popover-shader"
              aria-expanded={openPopover === 'shader'}
              aria-haspopup="dialog"
              aria-label={`Shader：${selectedShaderLabel}`}
              className="video-action-btn"
              type="button"
            >
              <VideoControlIcon name="shader" />
            </button>
            <div className="music-ctrl-panel is-shader" hidden={openPopover !== 'shader'} id="music-main-popover-shader" role="dialog">
              <span className="music-ctrl-panel-title">Shader</span>
              <div className="music-ctrl-panel-options">
                {MUSIC_VISUALIZER_SHADERS.length > 0 ? (
                  MUSIC_VISUALIZER_SHADERS.map((shader) => (
                    <button
                      aria-pressed={selectedShaderId === shader.id}
                      className={`music-ctrl-panel-option ${selectedShaderId === shader.id ? 'is-active' : ''}`}
                      key={shader.id}
                      type="button"
                      onClick={() => {
                        setSelectedShaderId(shader.id)
                        closePopover()
                      }}
                    >
                      {shader.label}
                    </button>
                  ))
                ) : (
                  <span className="music-ctrl-panel-note">暂无 Shader</span>
                )}
              </div>
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

        <div className="music-controls-group is-right">
          <button
            aria-label={fullscreenActive ? '退出全屏' : '全屏'}
            className="video-action-btn"
            title={fullscreenActive ? '退出全屏' : '全屏'}
            type="button"
            onClick={onToggleFullscreen}
          >
            <VideoControlIcon name="fullscreen" />
          </button>
          <button
            aria-label={`循环模式：${musicLoopModeLabel}`}
            className="video-action-btn"
            title={`循环模式：${musicLoopModeLabel}`}
            type="button"
            onClick={onCycleMusicLoopMode}
          >
            <VideoControlIcon name={resolveLoopModeIconName(musicLoopMode)} />
          </button>
        </div>
      </div>
    </div>
  )

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
                {canJumpToManga || canJumpToAnimation || canJumpToBooklet ? (
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
                    {canJumpToBooklet ? (
                      <button className="toolbar-icon-btn" type="button" aria-label="Booklet" title="Booklet" onClick={onJumpToBooklet}>
                        <span aria-hidden="true">▤</span>
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div
            className={`name-list music-name-list music-visualizer${fullscreenActive ? ' is-fullscreen' : ''}`}
            aria-label="music visualizer"
            data-overlay-close={fullscreenActive ? 'fullscreen' : undefined}
          >
            <canvas ref={visualizerCanvasRef} className="music-visualizer-canvas" />
            {musicVisualizerShowFps && visualizerStats ? (
              <div className="music-visualizer-hud" role="status">
                <span>{`FPS ${visualizerStats.fps.toFixed(1)} | ${visualizerStats.frameMs.toFixed(2)}ms`}</span>
                <span>{`Render ${visualizerStats.renderWidth} x ${visualizerStats.renderHeight}`}</span>
                <span>{`TargetLongEdge ${musicVisualizerRenderLongEdgePx}`}</span>
                <span>{`FPS Cap ${musicVisualizerFpsCap}`}</span>
                <span>{`Backend ${visualizerStats.backend.toUpperCase()}`}</span>
                <span>{`Shader ${visualizerStats.shaderId}`}</span>
                <span>{visualizerStats.rendererLabel}</span>
              </div>
            ) : null}
            {visualizerRuntimeError ? (
              <div className={`music-visualizer-hud ${musicVisualizerShowFps ? 'is-warning' : 'is-warning is-bottom'}`} role="status">
                <span>{visualizerRuntimeError}</span>
              </div>
            ) : null}
            {fullscreenActive ? musicControlsShell : null}
          </div>

          {!fullscreenActive ? musicControlsShell : null}
        </>
      ) : null}

      <audio
        ref={audioRef}
        className="music-native-audio"
        crossOrigin="anonymous"
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
          const audio = audioRef.current
          const shouldRestartCurrent = Boolean(focusedAudioSrc) && (musicLoopMode === 'single' || !canNextAudio)
          if (audio && shouldRestartCurrent) {
            audio.currentTime = 0
            if (audioPlaying) {
              void audio.play().catch(() => {
                setAudioPlaying(false)
              })
            }
            return
          }
          onNextAudio()
        }}
      />
    </>
  )
}

export default MusicMainSection
