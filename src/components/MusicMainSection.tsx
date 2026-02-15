import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

import { MainUiIcon } from './MainUiIcon'
import { MusicControlIcon, type MusicControlIconName } from './MusicControlIcon'
import type { AppSettings } from '../contracts/settings'
import type { AudioItem, MusicLoopMode } from '../types'
import {
  emitMusicPlaybackState,
  onMusicPlaybackControl,
} from '../features/media/musicPlaybackBridge'
import { MUSIC_VISUALIZER_SHADERS, resolveDefaultMusicVisualizerShader, resolveMusicVisualizerShaderById } from '../features/music-visualizer/shaderRegistry'
import { useMusicVisualizerRuntime } from '../features/music-visualizer/useMusicVisualizerRuntime'
import { clamp, formatSeconds } from '../utils/ui'

type MusicPopoverKey = 'volume' | 'shader' | 'shaderSettings'

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
  musicVisualizerSelectedShaderId: string
  musicVisualizerShaderSettings: AppSettings['musicVisualizerShaderSettingsById'][string]
  musicVisualizerLayeredBackgroundShaderSettings: AppSettings['musicVisualizerShaderSettingsById'][string]
  musicVisualizerLayeredForegroundShaderSettings: AppSettings['musicVisualizerShaderSettingsById'][string]
  onMusicVisualizerSelectedShaderIdChange?: (value: string) => void
  onMusicVisualizerShaderSettingsChange: (patch: Partial<AppSettings['musicVisualizerShaderSettingsById'][string]>) => void
  onMusicVisualizerLayerShaderIdChange?: (layer: 'foreground' | 'background', value: string) => void
  onMusicVisualizerLayerShaderSettingsChange?: (
    layer: 'foreground' | 'background',
    patch: Partial<AppSettings['musicVisualizerShaderSettingsById'][string]>,
  ) => void
  onPrevAudio: () => void
  onNextAudio: () => void
  onCycleMusicLoopMode: () => void
}

function resolveLoopModeIconName(mode: MusicLoopMode): Extract<
  MusicControlIconName,
  'repeatOne' | 'repeatFolder' | 'repeatAlbum' | 'repeatLibrary'
> {
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
  musicVisualizerSelectedShaderId,
  musicVisualizerShaderSettings,
  musicVisualizerLayeredBackgroundShaderSettings,
  musicVisualizerLayeredForegroundShaderSettings,
  onMusicVisualizerSelectedShaderIdChange = () => undefined,
  onMusicVisualizerShaderSettingsChange,
  onMusicVisualizerLayerShaderIdChange = () => undefined,
  onMusicVisualizerLayerShaderSettingsChange = () => undefined,
  onPrevAudio,
  onNextAudio,
  onCycleMusicLoopMode,
}: MusicMainSectionProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const visualizerCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const lastPlayRequestNonceRef = useRef(playRequestNonce)
  const visualizerActivateRafRef = useRef<number | null>(null)
  const visualizerActivateRaf2Ref = useRef<number | null>(null)
  const [openPopover, setOpenPopover] = useState<MusicPopoverKey | null>(null)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [audioVolume, setAudioVolume] = useState(60)
  const [audioMuted, setAudioMuted] = useState(false)
  const [audioTime, setAudioTime] = useState(0)
  const [audioDurationSec, setAudioDurationSec] = useState(0)
  const [renderLongEdgeDraft, setRenderLongEdgeDraft] = useState('')
  const [renderScaleCoeffDraft, setRenderScaleCoeffDraft] = useState<number | null>(null)
  const [visualizerRuntimeActive, setVisualizerRuntimeActive] = useState(false)
  const [fullscreenControlsMounted, setFullscreenControlsMounted] = useState(true)
  const [fullscreenControlsVisible, setFullscreenControlsVisible] = useState(true)
  const fullscreenControlsHideTimerRef = useRef<number | null>(null)

  const musicVisualizerRenderLongEdgePx = musicVisualizerShaderSettings.renderLongEdgePx
  const musicVisualizerRenderScaleCoeff = musicVisualizerShaderSettings.renderScaleCoeff ?? 2
  const musicVisualizerCompositionMode = musicVisualizerShaderSettings.compositionMode ?? 'single'
  const musicVisualizerLayeredBackgroundShaderId = musicVisualizerShaderSettings.layeredBackgroundShaderId ?? 'galaxy'
  const musicVisualizerLayeredForegroundShaderId = musicVisualizerShaderSettings.layeredForegroundShaderId ?? 'mcs-szb'
  const musicVisualizerLayeredBackgroundEnabled = musicVisualizerShaderSettings.layeredBackgroundEnabled ?? true
  const musicVisualizerLayeredForegroundEnabled = musicVisualizerShaderSettings.layeredForegroundEnabled ?? true
  const musicVisualizerLayeredForegroundOffsetX = musicVisualizerShaderSettings.layeredForegroundOffsetX ?? 0
  const musicVisualizerLayeredForegroundOffsetY = musicVisualizerShaderSettings.layeredForegroundOffsetY ?? 0
  const musicVisualizerLayeredForegroundScale = musicVisualizerShaderSettings.layeredForegroundScale ?? 1
  const backgroundLayerRenderScaleCoeff = musicVisualizerLayeredBackgroundShaderSettings.renderScaleCoeff ?? 2
  const foregroundLayerRenderScaleCoeff = musicVisualizerLayeredForegroundShaderSettings.renderScaleCoeff ?? 2
  const musicVisualizerFpsCap = musicVisualizerShaderSettings.fpsCap
  const musicVisualizerToneMapMode = musicVisualizerShaderSettings.toneMapMode
  const musicVisualizerToneMapExposure = musicVisualizerShaderSettings.toneMapExposure
  const musicVisualizerToneMapStrength = musicVisualizerShaderSettings.toneMapStrength
  const musicVisualizerShowFps = musicVisualizerShaderSettings.showFps
  const musicVisualizerRenderer = musicVisualizerShaderSettings.renderer

  const selectedShaderId = useMemo(() => {
    const matched = resolveMusicVisualizerShaderById(musicVisualizerSelectedShaderId)
    if (matched) {
      return matched.id
    }
    return resolveDefaultMusicVisualizerShader()?.id ?? ''
  }, [musicVisualizerSelectedShaderId])

  useEffect(() => {
    if (selectedShaderId && selectedShaderId !== musicVisualizerSelectedShaderId) {
      onMusicVisualizerSelectedShaderIdChange(selectedShaderId)
    }
  }, [musicVisualizerSelectedShaderId, onMusicVisualizerSelectedShaderIdChange, selectedShaderId])

  useEffect(() => {
    if (visualizerActivateRafRef.current != null) {
      window.cancelAnimationFrame(visualizerActivateRafRef.current)
      visualizerActivateRafRef.current = null
    }
    if (visualizerActivateRaf2Ref.current != null) {
      window.cancelAnimationFrame(visualizerActivateRaf2Ref.current)
      visualizerActivateRaf2Ref.current = null
    }

    if (!active) {
      setVisualizerRuntimeActive(false)
      return
    }

    setVisualizerRuntimeActive(false)
    visualizerActivateRafRef.current = window.requestAnimationFrame(() => {
      visualizerActivateRafRef.current = null
      visualizerActivateRaf2Ref.current = window.requestAnimationFrame(() => {
        visualizerActivateRaf2Ref.current = null
        setVisualizerRuntimeActive(true)
      })
    })

    return () => {
      if (visualizerActivateRafRef.current != null) {
        window.cancelAnimationFrame(visualizerActivateRafRef.current)
        visualizerActivateRafRef.current = null
      }
      if (visualizerActivateRaf2Ref.current != null) {
        window.cancelAnimationFrame(visualizerActivateRaf2Ref.current)
        visualizerActivateRaf2Ref.current = null
      }
    }
  }, [active])

  const { stats: visualizerStats, runtimeError: visualizerRuntimeError, resumeAudioAnalyser } = useMusicVisualizerRuntime({
    canvasRef: visualizerCanvasRef,
    audioRef,
    active: visualizerRuntimeActive,
    preferredRenderer: musicVisualizerRenderer,
    renderLongEdgePx: musicVisualizerRenderLongEdgePx,
    renderScaleCoeff: musicVisualizerRenderScaleCoeff,
    compositionMode: musicVisualizerCompositionMode,
    layeredBackgroundShaderId: musicVisualizerLayeredBackgroundShaderId,
    layeredForegroundShaderId: musicVisualizerLayeredForegroundShaderId,
    layeredBackgroundEnabled: musicVisualizerLayeredBackgroundEnabled,
    layeredForegroundEnabled: musicVisualizerLayeredForegroundEnabled,
    layeredBackgroundRenderScaleCoeff: backgroundLayerRenderScaleCoeff,
    layeredForegroundRenderScaleCoeff: foregroundLayerRenderScaleCoeff,
    layeredForegroundOffsetX: musicVisualizerLayeredForegroundOffsetX,
    layeredForegroundOffsetY: musicVisualizerLayeredForegroundOffsetY,
    layeredForegroundScale: musicVisualizerLayeredForegroundScale,
    fpsCap: musicVisualizerFpsCap,
    toneMapMode: musicVisualizerToneMapMode,
    toneMapExposure: musicVisualizerToneMapExposure,
    toneMapStrength: musicVisualizerToneMapStrength,
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

  const layeredBackgroundShaderOptions = useMemo(() => {
    const compatible = MUSIC_VISUALIZER_SHADERS.filter((shader) => (shader.layerRole ?? 'any') !== 'foreground')
    if (compatible.some((shader) => shader.id === musicVisualizerLayeredBackgroundShaderId)) {
      return compatible
    }
    const selected = MUSIC_VISUALIZER_SHADERS.find((shader) => shader.id === musicVisualizerLayeredBackgroundShaderId)
    return selected ? [selected, ...compatible] : compatible
  }, [musicVisualizerLayeredBackgroundShaderId])

  const layeredForegroundShaderOptions = useMemo(() => {
    const compatible = MUSIC_VISUALIZER_SHADERS.filter((shader) => (shader.layerRole ?? 'any') !== 'background')
    if (compatible.some((shader) => shader.id === musicVisualizerLayeredForegroundShaderId)) {
      return compatible
    }
    const selected = MUSIC_VISUALIZER_SHADERS.find((shader) => shader.id === musicVisualizerLayeredForegroundShaderId)
    return selected ? [selected, ...compatible] : compatible
  }, [musicVisualizerLayeredForegroundShaderId])

  const layeredBackgroundShaderLabel = useMemo(() => {
    return MUSIC_VISUALIZER_SHADERS.find((shader) => shader.id === musicVisualizerLayeredBackgroundShaderId)?.label ?? '未选择背景 Shader'
  }, [musicVisualizerLayeredBackgroundShaderId])

  const layeredForegroundShaderLabel = useMemo(() => {
    return MUSIC_VISUALIZER_SHADERS.find((shader) => shader.id === musicVisualizerLayeredForegroundShaderId)?.label ?? '未选择前景 Shader'
  }, [musicVisualizerLayeredForegroundShaderId])

  const clampedAudioTime = clamp(audioTime, 0, Math.max(0, audioDurationSec))
  const audioProgressPercent = audioDurationSec > 0 ? clamp((clampedAudioTime / audioDurationSec) * 100, 0, 100) : 0
  const musicProgressRangeStyle = {
    '--mpx-skeuo-range-pct': `${audioProgressPercent}%`,
  } as CSSProperties
  const audioVolumePercent = clamp(audioMuted ? 0 : audioVolume, 0, 100)
  const musicVolumeRangeStyle = {
    '--mpx-skeuo-range-pct': `${audioVolumePercent}%`,
  } as CSSProperties
  const toneMapExposurePercent = clamp(((musicVisualizerToneMapExposure - 0.5) / 1.5) * 100, 0, 100)
  const toneMapExposureRangeStyle = {
    '--mpx-skeuo-range-pct': `${toneMapExposurePercent}%`,
  } as CSSProperties
  const toneMapStrengthPercent = clamp(musicVisualizerToneMapStrength * 100, 0, 100)
  const toneMapStrengthRangeStyle = {
    '--mpx-skeuo-range-pct': `${toneMapStrengthPercent}%`,
  } as CSSProperties
  const renderScaleCoeffValue = renderScaleCoeffDraft ?? musicVisualizerRenderScaleCoeff
  const renderScaleCoeffPercent = clamp(((renderScaleCoeffValue - 1) / 4) * 100, 0, 100)
  const renderScaleCoeffStyle = {
    '--mpx-skeuo-range-pct': `${renderScaleCoeffPercent}%`,
  } as CSSProperties
  const backgroundLayerRenderScaleCoeffStyle = {
    '--mpx-skeuo-range-pct': `${clamp(((backgroundLayerRenderScaleCoeff - 1) / 4) * 100, 0, 100)}%`,
  } as CSSProperties
  const foregroundLayerRenderScaleCoeffStyle = {
    '--mpx-skeuo-range-pct': `${clamp(((foregroundLayerRenderScaleCoeff - 1) / 4) * 100, 0, 100)}%`,
  } as CSSProperties

  const manageSummary =
    activeSelectionScope === 'sidebar'
      ? `已选目录节点: ${sidebarSelectedCount}`
      : activeSelectionScope === 'image'
        ? `已选媒体条目: ${imageSelectedCount}`
        : '未选择条目'

  const toggleAudioPlayback = useCallback(() => {
    if (!focusedAudioSrc) {
      return
    }
    setAudioPlaying((value) => !value)
  }, [focusedAudioSrc])

  const stopAudioPlayback = useCallback(() => {
    setAudioPlaying(false)
    setAudioTime(0)
    emitMusicPlaybackState({ playing: false })
    const audio = audioRef.current
    if (!audio) {
      return
    }
    audio.pause()
    audio.currentTime = 0
  }, [])

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
    emitMusicPlaybackState({ playing: audioPlaying })
  }, [audioPlaying])

  useEffect(() => {
    return () => {
      emitMusicPlaybackState({ playing: false })
    }
  }, [])

  useEffect(() => {
    return onMusicPlaybackControl((action) => {
      if (action === 'toggle-playback') {
        toggleAudioPlayback()
        return
      }
      stopAudioPlayback()
    })
  }, [stopAudioPlayback, toggleAudioPlayback])

  useEffect(() => {
    setRenderLongEdgeDraft(String(musicVisualizerRenderLongEdgePx))
  }, [musicVisualizerRenderLongEdgePx, selectedShaderId])

  useEffect(() => {
    setRenderScaleCoeffDraft(null)
  }, [musicVisualizerRenderScaleCoeff, selectedShaderId])

  useEffect(() => {
    if (!fullscreenActive) {
      if (fullscreenControlsHideTimerRef.current != null) {
        window.clearTimeout(fullscreenControlsHideTimerRef.current)
        fullscreenControlsHideTimerRef.current = null
      }
      setFullscreenControlsMounted(true)
      setFullscreenControlsVisible(true)
      return
    }

    setFullscreenControlsMounted(true)
    setFullscreenControlsVisible(true)
  }, [fullscreenActive])

  useEffect(
    () => () => {
      if (fullscreenControlsHideTimerRef.current != null) {
        window.clearTimeout(fullscreenControlsHideTimerRef.current)
        fullscreenControlsHideTimerRef.current = null
      }
    },
    [],
  )

  const closePopover = () => {
    setOpenPopover(null)
  }

  const applyRenderLongEdgeDraft = () => {
    const parsed = Number(renderLongEdgeDraft)
    if (!Number.isFinite(parsed)) {
      return
    }
    const clamped = Math.max(240, Math.min(4096, Math.round(parsed)))
    setRenderLongEdgeDraft(String(clamped))
    onMusicVisualizerShaderSettingsChange({ renderLongEdgePx: clamped })
  }

  const applyRenderScaleCoeffDraft = useCallback(() => {
    if (renderScaleCoeffDraft == null || !Number.isFinite(renderScaleCoeffDraft)) {
      return
    }
    onMusicVisualizerShaderSettingsChange({
      renderScaleCoeff: Math.max(1, Math.min(5, renderScaleCoeffDraft)),
    })
    setRenderScaleCoeffDraft(null)
  }, [onMusicVisualizerShaderSettingsChange, renderScaleCoeffDraft])

  useEffect(() => {
    if (renderScaleCoeffDraft == null) {
      return
    }

    const handlePointerUp = () => {
      applyRenderScaleCoeffDraft()
    }

    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('touchend', handlePointerUp)

    return () => {
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('touchend', handlePointerUp)
    }
  }, [applyRenderScaleCoeffDraft, renderScaleCoeffDraft])

  const showFullscreenControls = () => {
    if (!fullscreenActive) {
      return
    }
    if (fullscreenControlsHideTimerRef.current != null) {
      window.clearTimeout(fullscreenControlsHideTimerRef.current)
      fullscreenControlsHideTimerRef.current = null
    }
    if (!fullscreenControlsMounted) {
      setFullscreenControlsMounted(true)
      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          setFullscreenControlsVisible(true)
        })
      } else {
        setFullscreenControlsVisible(true)
      }
      return
    }
    setFullscreenControlsVisible(true)
  }

  const hideFullscreenControls = () => {
    if (!fullscreenActive) {
      return
    }
    setFullscreenControlsVisible(false)
    if (fullscreenControlsHideTimerRef.current != null) {
      window.clearTimeout(fullscreenControlsHideTimerRef.current)
    }
    fullscreenControlsHideTimerRef.current = window.setTimeout(() => {
      setFullscreenControlsMounted(false)
      fullscreenControlsHideTimerRef.current = null
      closePopover()
    }, 300)
  }

  const musicControlsShell = (
    <div
      className={`music-controls-shell${fullscreenActive ? ' is-fullscreen-floating' : ''}${fullscreenActive && fullscreenControlsVisible ? ' is-visible' : ''}${fullscreenActive && !fullscreenControlsMounted ? ' is-hidden' : ''}`}
      hidden={fullscreenActive ? !fullscreenControlsMounted : undefined}
      onMouseEnter={fullscreenActive ? showFullscreenControls : undefined}
      onMouseLeave={fullscreenActive ? hideFullscreenControls : closePopover}
    >
      <div className="music-controls-progress">
        <span className="video-progress-time">{`${formatSeconds(clampedAudioTime)} / ${formatSeconds(audioDurationSec)}`}</span>
        <input
          aria-label="音乐进度滑条"
          max={Math.max(0, audioDurationSec)}
          min={0}
          step={0.1}
          style={musicProgressRangeStyle}
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
              <MusicControlIcon name={audioMuted ? 'volumeMuted' : 'volume'} />
            </button>

            <div
              className="music-ctrl-panel is-volume"
              hidden={openPopover !== 'volume'}
              id="music-main-popover-volume"
              role="dialog"
              onMouseLeave={closePopover}
            >
              <div className="music-ctrl-volume-axis">
                <input
                  aria-label="音量滑条"
                  className="music-ctrl-volume-range"
                  max={100}
                  min={0}
                  step={1}
                  style={musicVolumeRangeStyle}
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
              <MusicControlIcon name="shaderList" />
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
                        onMusicVisualizerSelectedShaderIdChange(shader.id)
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

          <div
            className={`music-ctrl-popover is-dock-left ${openPopover === 'shaderSettings' ? 'is-open' : ''}`}
            onMouseEnter={() => setOpenPopover('shaderSettings')}
            onMouseLeave={closePopover}
          >
            <button
              aria-controls="music-main-popover-shader-settings"
              aria-expanded={openPopover === 'shaderSettings'}
              aria-haspopup="dialog"
              aria-label="Shader 设置"
              className="video-action-btn"
              type="button"
            >
              <MusicControlIcon name="shaderParameter" />
            </button>
            <div
              className="music-ctrl-panel is-shader is-shader-settings"
              hidden={openPopover !== 'shaderSettings'}
              id="music-main-popover-shader-settings"
              role="dialog"
            >
              <span className="music-ctrl-panel-title">{`${selectedShaderLabel} 设置`}</span>
              <div className="music-ctrl-panel-options music-ctrl-shader-settings-form">
                <label className="music-ctrl-shader-field">
                  <span className="music-ctrl-shader-label">实际渲染长边分辨率</span>
                  <input
                    className="music-ctrl-shader-input"
                    type="number"
                    value={renderLongEdgeDraft}
                    onChange={(event) => {
                      setRenderLongEdgeDraft(event.target.value)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        applyRenderLongEdgeDraft()
                      }
                    }}
                  />
                </label>
                <label className="music-ctrl-shader-field">
                  <span className="music-ctrl-shader-label">渲染分辨率系数 {renderScaleCoeffValue.toFixed(2)}x</span>
                  <input
                    className="music-ctrl-shader-range"
                    max={5}
                    min={1}
                    step={0.01}
                    style={renderScaleCoeffStyle}
                    type="range"
                    value={renderScaleCoeffValue}
                    onChange={(event) => {
                      const value = Number(event.target.value)
                      if (!Number.isFinite(value)) {
                        return
                      }
                      setRenderScaleCoeffDraft(Math.max(1, Math.min(5, value)))
                    }}
                    onMouseUp={applyRenderScaleCoeffDraft}
                    onTouchEnd={applyRenderScaleCoeffDraft}
                    onBlur={applyRenderScaleCoeffDraft}
                    onKeyUp={(event) => {
                      if (event.key === 'Enter') {
                        applyRenderScaleCoeffDraft()
                      }
                    }}
                  />
                </label>
                <label className="music-ctrl-shader-field">
                  <span className="music-ctrl-shader-label">合成模式</span>
                  <select
                    className="music-ctrl-shader-input"
                    value={musicVisualizerCompositionMode}
                    onChange={(event) =>
                      onMusicVisualizerShaderSettingsChange({
                        compositionMode: event.target.value === 'layered' ? 'layered' : 'single',
                      })
                    }
                  >
                    <option value="single">单 Shader</option>
                    <option value="layered">前景 + 背景</option>
                  </select>
                </label>
                {musicVisualizerCompositionMode === 'layered' ? (
                  <>
                    <label className="music-ctrl-shader-toggle">
                      <span className="music-ctrl-shader-label">启用背景层</span>
                      <input
                        type="checkbox"
                        checked={musicVisualizerLayeredBackgroundEnabled}
                        onChange={(event) => onMusicVisualizerShaderSettingsChange({ layeredBackgroundEnabled: event.target.checked })}
                      />
                    </label>
                    <label className="music-ctrl-shader-field">
                      <span className="music-ctrl-shader-label">背景 Shader（{layeredBackgroundShaderLabel}）</span>
                      <select
                        className="music-ctrl-shader-input"
                        value={musicVisualizerLayeredBackgroundShaderId}
                        onChange={(event) => onMusicVisualizerLayerShaderIdChange('background', event.target.value)}
                      >
                        {layeredBackgroundShaderOptions.map((shader) => (
                          <option key={`bg-${shader.id}`} value={shader.id}>
                            {shader.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="music-ctrl-shader-field">
                      <span className="music-ctrl-shader-label">背景分辨率系数 {backgroundLayerRenderScaleCoeff.toFixed(2)}x</span>
                      <input
                        className="music-ctrl-shader-range"
                        max={5}
                        min={1}
                        step={0.01}
                        style={backgroundLayerRenderScaleCoeffStyle}
                        type="range"
                        value={backgroundLayerRenderScaleCoeff}
                        onChange={(event) => {
                          const value = Number(event.target.value)
                          if (!Number.isFinite(value)) {
                            return
                          }
                          onMusicVisualizerLayerShaderSettingsChange('background', {
                            renderScaleCoeff: Math.max(1, Math.min(5, value)),
                          })
                        }}
                      />
                    </label>
                    <label className="music-ctrl-shader-toggle">
                      <span className="music-ctrl-shader-label">启用前景层</span>
                      <input
                        type="checkbox"
                        checked={musicVisualizerLayeredForegroundEnabled}
                        onChange={(event) => onMusicVisualizerShaderSettingsChange({ layeredForegroundEnabled: event.target.checked })}
                      />
                    </label>
                    <label className="music-ctrl-shader-field">
                      <span className="music-ctrl-shader-label">前景 Shader（{layeredForegroundShaderLabel}）</span>
                      <select
                        className="music-ctrl-shader-input"
                        value={musicVisualizerLayeredForegroundShaderId}
                        onChange={(event) => onMusicVisualizerLayerShaderIdChange('foreground', event.target.value)}
                      >
                        {layeredForegroundShaderOptions.map((shader) => (
                          <option key={`fg-${shader.id}`} value={shader.id}>
                            {shader.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="music-ctrl-shader-field">
                      <span className="music-ctrl-shader-label">前景分辨率系数 {foregroundLayerRenderScaleCoeff.toFixed(2)}x</span>
                      <input
                        className="music-ctrl-shader-range"
                        max={5}
                        min={1}
                        step={0.01}
                        style={foregroundLayerRenderScaleCoeffStyle}
                        type="range"
                        value={foregroundLayerRenderScaleCoeff}
                        onChange={(event) => {
                          const value = Number(event.target.value)
                          if (!Number.isFinite(value)) {
                            return
                          }
                          onMusicVisualizerLayerShaderSettingsChange('foreground', {
                            renderScaleCoeff: Math.max(1, Math.min(5, value)),
                          })
                        }}
                      />
                    </label>
                    <label className="music-ctrl-shader-field">
                      <span className="music-ctrl-shader-label">前景 X 偏移 {musicVisualizerLayeredForegroundOffsetX.toFixed(2)}</span>
                      <input
                        className="music-ctrl-shader-range"
                        max={1}
                        min={-1}
                        step={0.01}
                        type="range"
                        value={musicVisualizerLayeredForegroundOffsetX}
                        onChange={(event) => {
                          const value = Number(event.target.value)
                          if (!Number.isFinite(value)) {
                            return
                          }
                          onMusicVisualizerShaderSettingsChange({ layeredForegroundOffsetX: Math.max(-1, Math.min(1, value)) })
                        }}
                      />
                    </label>
                    <label className="music-ctrl-shader-field">
                      <span className="music-ctrl-shader-label">前景 Y 偏移 {musicVisualizerLayeredForegroundOffsetY.toFixed(2)}</span>
                      <input
                        className="music-ctrl-shader-range"
                        max={1}
                        min={-1}
                        step={0.01}
                        type="range"
                        value={musicVisualizerLayeredForegroundOffsetY}
                        onChange={(event) => {
                          const value = Number(event.target.value)
                          if (!Number.isFinite(value)) {
                            return
                          }
                          onMusicVisualizerShaderSettingsChange({ layeredForegroundOffsetY: Math.max(-1, Math.min(1, value)) })
                        }}
                      />
                    </label>
                    <label className="music-ctrl-shader-field">
                      <span className="music-ctrl-shader-label">前景缩放 {musicVisualizerLayeredForegroundScale.toFixed(2)}x</span>
                      <input
                        className="music-ctrl-shader-range"
                        max={3}
                        min={0.25}
                        step={0.01}
                        type="range"
                        value={musicVisualizerLayeredForegroundScale}
                        onChange={(event) => {
                          const value = Number(event.target.value)
                          if (!Number.isFinite(value)) {
                            return
                          }
                          onMusicVisualizerShaderSettingsChange({ layeredForegroundScale: Math.max(0.25, Math.min(3, value)) })
                        }}
                      />
                    </label>
                  </>
                ) : null}
                <label className="music-ctrl-shader-field">
                  <span className="music-ctrl-shader-label">渲染帧率上限</span>
                  <select
                    className="music-ctrl-shader-input"
                    value={musicVisualizerFpsCap}
                    onChange={(event) =>
                      onMusicVisualizerShaderSettingsChange({
                        fpsCap: Number(event.target.value) as 30 | 60 | 120,
                      })
                    }
                  >
                    <option value={30}>30 FPS</option>
                    <option value={60}>60 FPS</option>
                    <option value={120}>120 FPS</option>
                  </select>
                </label>
                <label className="music-ctrl-shader-field">
                  <span className="music-ctrl-shader-label">Tone Mapping</span>
                  <select
                    className="music-ctrl-shader-input"
                    value={musicVisualizerToneMapMode}
                    onChange={(event) =>
                      onMusicVisualizerShaderSettingsChange({
                        toneMapMode: event.target.value as 'off' | 'reinhard' | 'aces' | 'filmic' | 'agx' | 'khronos',
                      })
                    }
                  >
                    <option value="off">关闭</option>
                    <option value="aces">ACES Filmic</option>
                    <option value="reinhard">Reinhard</option>
                    <option value="filmic">Filmic (Blender)</option>
                    <option value="agx">AgX (Blender 5.1)</option>
                    <option value="khronos">Khronos PBR Neutral (Blender 5.1)</option>
                  </select>
                </label>
                <label className="music-ctrl-shader-field">
                  <span className="music-ctrl-shader-label">Tone Mapping 曝光 {musicVisualizerToneMapExposure.toFixed(2)}</span>
                  <input
                    className="music-ctrl-shader-range"
                    max={2}
                    min={0.5}
                    step={0.01}
                    style={toneMapExposureRangeStyle}
                    type="range"
                    value={musicVisualizerToneMapExposure}
                    onChange={(event) => {
                      const value = Number(event.target.value)
                      if (!Number.isFinite(value)) {
                        return
                      }
                      onMusicVisualizerShaderSettingsChange({ toneMapExposure: Math.max(0.5, Math.min(2, value)) })
                    }}
                  />
                </label>
                <label className="music-ctrl-shader-field">
                  <span className="music-ctrl-shader-label">Tone Mapping 强度 {(musicVisualizerToneMapStrength * 100).toFixed(0)}%</span>
                  <input
                    className="music-ctrl-shader-range"
                    max={1}
                    min={0}
                    step={0.01}
                    style={toneMapStrengthRangeStyle}
                    type="range"
                    value={musicVisualizerToneMapStrength}
                    onChange={(event) =>
                      onMusicVisualizerShaderSettingsChange({
                        toneMapStrength: Math.max(0, Math.min(1, Number(event.target.value))),
                      })
                    }
                  />
                </label>
                <label className="music-ctrl-shader-toggle">
                  <span className="music-ctrl-shader-label">显示 FPS 调试信息</span>
                  <input
                    type="checkbox"
                    checked={musicVisualizerShowFps}
                    onChange={(event) => onMusicVisualizerShaderSettingsChange({ showFps: event.target.checked })}
                  />
                </label>
                <label className="music-ctrl-shader-field">
                  <span className="music-ctrl-shader-label">渲染后端</span>
                  <select
                    className="music-ctrl-shader-input"
                    value={musicVisualizerRenderer}
                    onChange={(event) =>
                      onMusicVisualizerShaderSettingsChange({
                        renderer: event.target.value as 'gpu' | 'cpu',
                      })
                    }
                  >
                    <option value="gpu">GPU (WebGL2 Shader)</option>
                    <option value="cpu">CPU (Canvas2D Fallback)</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="music-controls-group is-center">
          <button aria-label="上一个" className="video-action-btn" disabled={!canPrevAudio} type="button" onClick={onPrevAudio}>
            <MusicControlIcon name="prev" />
          </button>
          <button
            aria-label={audioPlaying ? '暂停' : '播放'}
            className="video-action-btn"
            disabled={!focusedAudioSrc}
            type="button"
            onClick={toggleAudioPlayback}
          >
            <MusicControlIcon name={audioPlaying ? 'pause' : 'play'} />
          </button>
          <button aria-label="下一个" className="video-action-btn" disabled={!canNextAudio} type="button" onClick={onNextAudio}>
            <MusicControlIcon name="next" />
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
            <MusicControlIcon name={fullscreenActive ? 'fullscreenCompress' : 'fullscreenExpand'} />
          </button>
          <button
            aria-label={`循环模式：${musicLoopModeLabel}`}
            className="video-action-btn"
            title={`循环模式：${musicLoopModeLabel}`}
            type="button"
            onClick={onCycleMusicLoopMode}
          >
            <MusicControlIcon name={resolveLoopModeIconName(musicLoopMode)} />
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
                  <button
                    className="vector-search-btn main-icon-square-btn"
                    type="button"
                    aria-label="删除"
                    title="删除"
                    disabled={!canManageDelete || pendingManageAction}
                    onClick={onManageDelete}
                  >
                    <MainUiIcon name="delete" />
                  </button>
                  <button
                    className="feature-action-btn main-icon-square-btn"
                    type="button"
                    aria-label="清空选择"
                    title="清空选择"
                    disabled={pendingManageAction}
                    onClick={onClearManageSelection}
                  >
                    <MainUiIcon name="unselectAll" />
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
                <span>{`ToneMap ${musicVisualizerToneMapMode}@${musicVisualizerToneMapExposure.toFixed(2)}*${musicVisualizerToneMapStrength.toFixed(2)}`}</span>
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
            {fullscreenActive ? (
              <>
                <div
                  className="music-controls-fullscreen-hotzone"
                  onMouseEnter={showFullscreenControls}
                  onMouseLeave={hideFullscreenControls}
                />
                {musicControlsShell}
              </>
            ) : null}
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
