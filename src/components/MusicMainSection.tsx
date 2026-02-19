import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

import { MainUiIcon } from './MainUiIcon'
import { MusicControlIcon } from './MusicControlIcon'
import type { MusicMainSectionProps, MusicPopoverKey } from './MusicMainSection.types'
import { ToolbarTitleMarquee } from './ToolbarTitleMarquee'
import { resolveFullscreenControlsWidth } from './fullscreen/controlsWidth'
import { FullscreenMetaMarquee } from './fullscreen/FullscreenMetaMarquee'
import { useFullscreenWindowViewport } from './fullscreen/useFullscreenWindowViewport'
import { resolveLoopModeIconName, resolveMusicToolbarSummary } from './musicMainSectionUtils'
import { useMediaPreloadWindow } from './useMediaPreloadWindow'
import { useFullscreenFloatingControls } from './useFullscreenFloatingControls'
import { useI18n } from '../i18n/useI18n'
import {
  emitMusicPlaybackState,
  onMusicPlaybackControl,
} from '../features/media/musicPlaybackBridge'
import { MUSIC_VISUALIZER_SHADERS, resolveDefaultMusicVisualizerShader, resolveMusicVisualizerShaderById } from '../features/music-visualizer/shaderRegistry'
import { useMusicVisualizerRuntime } from '../features/music-visualizer/useMusicVisualizerRuntime'
import { clamp, formatSeconds } from '../utils/ui'

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
  canManageMoveNodes = false,
  onManageGroup = () => undefined,
  canJumpToManga,
  canJumpToAnimation,
  canJumpToCover,
  canJumpToBooklet,
  onJumpToManga,
  onJumpToAnimation,
  onJumpToCover,
  onJumpToBooklet,
  audios,
  focusedAudio,
  focusedAudioSrc,
  mediaPreloadMemoryBudgetMb,
  fullscreenVideoControlsMaxWidth,
  audioPreloadItems,
  musicLoopMode,
  musicLoopModeLabel,
  canPrevAudio,
  canNextAudio,
  fullscreenActive,
  paletteMode = 'day',
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
  const { t } = useI18n()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const visualizerGpuCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const visualizerCpuCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const lastAudioSeekPreviewAtRef = useRef(0)
  const lastAudioSeekPreviewValueRef = useRef<number | null>(null)
  const lastPlayRequestNonceRef = useRef(playRequestNonce)
  const visualizerActivateRafRef = useRef<number | null>(null)
  const visualizerActivateRaf2Ref = useRef<number | null>(null)
  const [openPopover, setOpenPopover] = useState<MusicPopoverKey | null>(null)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [audioVolume, setAudioVolume] = useState(60)
  const [audioMuted, setAudioMuted] = useState(false)
  const [audioTime, setAudioTime] = useState(0)
  const [audioSeekDraftTime, setAudioSeekDraftTime] = useState<number | null>(null)
  const [audioDurationSec, setAudioDurationSec] = useState(0)
  const [renderLongEdgeDraft, setRenderLongEdgeDraft] = useState('')
  const [foregroundRenderScaleCoeffDraft, setForegroundRenderScaleCoeffDraft] = useState<number | null>(null)
  const [backgroundRenderScaleCoeffDraft, setBackgroundRenderScaleCoeffDraft] = useState<number | null>(null)
  const [shaderListTargetLayer, setShaderListTargetLayer] = useState<'foreground' | 'background'>('foreground')
  const [visualizerCanvasVersion, setVisualizerCanvasVersion] = useState(0)
  const [visualizerRuntimeActive, setVisualizerRuntimeActive] = useState(false)
  const visualizerRecoveryRef = useRef({ windowStartedAt: 0, attempts: 0 })

  const musicVisualizerLayeredBackgroundShaderId = musicVisualizerShaderSettings.layeredBackgroundShaderId ?? 'galaxy'
  const musicVisualizerLayeredForegroundShaderId = musicVisualizerShaderSettings.layeredForegroundShaderId ?? 'mcs-szb'
  const musicVisualizerLayeredBackgroundEnabled = musicVisualizerShaderSettings.layeredBackgroundEnabled ?? true
  const musicVisualizerLayeredForegroundEnabled = musicVisualizerShaderSettings.layeredForegroundEnabled ?? true
  const musicVisualizerLayeredForegroundOffsetX = musicVisualizerShaderSettings.layeredForegroundOffsetX ?? 0
  const musicVisualizerLayeredForegroundOffsetY = musicVisualizerShaderSettings.layeredForegroundOffsetY ?? 0
  const musicVisualizerLayeredForegroundScale = musicVisualizerShaderSettings.layeredForegroundScale ?? 1
  const backgroundLayerRenderScaleCoeff = musicVisualizerLayeredBackgroundShaderSettings.renderScaleCoeff ?? 2
  const foregroundLayerRenderScaleCoeff = musicVisualizerLayeredForegroundShaderSettings.renderScaleCoeff ?? 2

  const shaderListTargetShaderId = shaderListTargetLayer === 'foreground'
    ? musicVisualizerLayeredForegroundShaderId
    : musicVisualizerLayeredBackgroundShaderId
  const shaderListTargetEnabled = shaderListTargetLayer === 'foreground'
    ? musicVisualizerLayeredForegroundEnabled
    : musicVisualizerLayeredBackgroundEnabled

  const hasNoLayerEnabled = !musicVisualizerLayeredBackgroundEnabled && !musicVisualizerLayeredForegroundEnabled

  const runtimeRenderLongEdgePx = musicVisualizerShaderSettings.renderLongEdgePx
  const runtimeRenderScaleCoeff = musicVisualizerShaderSettings.renderScaleCoeff ?? 2
  const runtimeFpsCap = musicVisualizerShaderSettings.fpsCap
  const runtimeToneMapMode = musicVisualizerShaderSettings.toneMapMode
  const runtimeToneMapExposure = musicVisualizerShaderSettings.toneMapExposure
  const runtimeToneMapStrength = musicVisualizerShaderSettings.toneMapStrength
  const runtimeShowFps = musicVisualizerShaderSettings.showFps
  const runtimeRenderer = musicVisualizerShaderSettings.renderer

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

  const {
    stats: visualizerStats,
    activeBackend: visualizerActiveBackend,
    runtimeError: visualizerRuntimeError,
    resumeAudioAnalyser,
  } = useMusicVisualizerRuntime({
    canvasRef: visualizerGpuCanvasRef,
    cpuCanvasRef: visualizerCpuCanvasRef,
    audioRef,
    canvasInstanceVersion: visualizerCanvasVersion,
    active: visualizerRuntimeActive && !hasNoLayerEnabled,
    preferredRenderer: runtimeRenderer,
    renderLongEdgePx: runtimeRenderLongEdgePx,
    renderScaleCoeff: runtimeRenderScaleCoeff,
    layeredBackgroundShaderId: musicVisualizerLayeredBackgroundShaderId,
    layeredForegroundShaderId: musicVisualizerLayeredForegroundShaderId,
    layeredBackgroundEnabled: musicVisualizerLayeredBackgroundEnabled,
    layeredForegroundEnabled: musicVisualizerLayeredForegroundEnabled,
    layeredBackgroundRenderScaleCoeff: backgroundLayerRenderScaleCoeff,
    layeredForegroundRenderScaleCoeff: foregroundLayerRenderScaleCoeff,
    layeredForegroundOffsetX: musicVisualizerLayeredForegroundOffsetX,
    layeredForegroundOffsetY: musicVisualizerLayeredForegroundOffsetY,
    layeredForegroundScale: musicVisualizerLayeredForegroundScale,
    paletteMode,
    fpsCap: runtimeFpsCap,
    toneMapMode: runtimeToneMapMode,
    toneMapExposure: runtimeToneMapExposure,
    toneMapStrength: runtimeToneMapStrength,
    selectedShaderId,
  })

  useEffect(() => {
    if (!visualizerRuntimeError) {
      visualizerRecoveryRef.current = { windowStartedAt: 0, attempts: 0 }
      return
    }

    const shouldRecover =
      visualizerRuntimeError.includes(t('ui.music.visualizerInitErrorMarker')) ||
      visualizerRuntimeError.includes('WebGL context lost')
    if (!shouldRecover) {
      return
    }

    const now = Date.now()
    const tracker = visualizerRecoveryRef.current
    if (tracker.windowStartedAt === 0 || now - tracker.windowStartedAt > 8000) {
      tracker.windowStartedAt = now
      tracker.attempts = 0
    }
    if (tracker.attempts >= 2) {
      return
    }

    tracker.attempts += 1
    setVisualizerCanvasVersion((value) => value + 1)
  }, [t, visualizerRuntimeError])

  const toolbarSummary = useMemo(
    () =>
      resolveMusicToolbarSummary(focusedAudio, {
        list: t('ui.music.libraryLabel'),
        unknownAlbum: t('ui.music.unknownAlbum'),
        unknownAuthor: t('ui.music.unknownAuthor'),
      }),
    [focusedAudio, t],
  )
  const musicToolbarTitle = t('ui.music.trackCountSummary', { summary: toolbarSummary, count: audios.length })

  const layeredBackgroundShaderLabel = useMemo(() => {
    return MUSIC_VISUALIZER_SHADERS.find((shader) => shader.id === musicVisualizerLayeredBackgroundShaderId)?.label ?? t('ui.music.backgroundShaderUnselected')
  }, [musicVisualizerLayeredBackgroundShaderId, t])

  const layeredForegroundShaderLabel = useMemo(() => {
    return MUSIC_VISUALIZER_SHADERS.find((shader) => shader.id === musicVisualizerLayeredForegroundShaderId)?.label ?? t('ui.music.foregroundShaderUnselected')
  }, [musicVisualizerLayeredForegroundShaderId, t])

  const selectedShaderLabel = useMemo(() => {
    if (musicVisualizerLayeredBackgroundEnabled && musicVisualizerLayeredForegroundEnabled) {
      return `${layeredBackgroundShaderLabel} + ${layeredForegroundShaderLabel}`
    }
    if (musicVisualizerLayeredBackgroundEnabled) {
      return layeredBackgroundShaderLabel
    }
    if (musicVisualizerLayeredForegroundEnabled) {
      return layeredForegroundShaderLabel
    }
    return t('ui.music.transparent')
  }, [
    layeredBackgroundShaderLabel,
    layeredForegroundShaderLabel,
    musicVisualizerLayeredBackgroundEnabled,
    musicVisualizerLayeredForegroundEnabled,
    t,
  ])

  const clampedAudioTime = clamp(audioTime, 0, Math.max(0, audioDurationSec))
  const displayAudioTime = audioSeekDraftTime == null ? clampedAudioTime : clamp(audioSeekDraftTime, 0, Math.max(0, audioDurationSec))
  const audioProgressPercent = audioDurationSec > 0 ? clamp((displayAudioTime / audioDurationSec) * 100, 0, 100) : 0
  const musicProgressRangeStyle = {
    '--mpx-skeuo-range-pct': `${audioProgressPercent}%`,
  } as CSSProperties
  const audioVolumePercent = clamp(audioMuted ? 0 : audioVolume, 0, 100)
  const musicVolumeRangeStyle = {
    '--mpx-skeuo-range-pct': `${audioVolumePercent}%`,
  } as CSSProperties
  const toneMapExposurePercent = clamp(((musicVisualizerShaderSettings.toneMapExposure - 0.5) / 1.5) * 100, 0, 100)
  const toneMapExposureRangeStyle = {
    '--mpx-skeuo-range-pct': `${toneMapExposurePercent}%`,
  } as CSSProperties
  const toneMapStrengthPercent = clamp(musicVisualizerShaderSettings.toneMapStrength * 100, 0, 100)
  const toneMapStrengthRangeStyle = {
    '--mpx-skeuo-range-pct': `${toneMapStrengthPercent}%`,
  } as CSSProperties
  const foregroundRenderScaleCoeffValue = foregroundRenderScaleCoeffDraft ?? foregroundLayerRenderScaleCoeff
  const foregroundRenderScaleCoeffPercent = clamp(((foregroundRenderScaleCoeffValue - 1) / 4) * 100, 0, 100)
  const foregroundRenderScaleCoeffStyle = {
    '--mpx-skeuo-range-pct': `${foregroundRenderScaleCoeffPercent}%`,
  } as CSSProperties
  const backgroundRenderScaleCoeffValue = backgroundRenderScaleCoeffDraft ?? backgroundLayerRenderScaleCoeff
  const backgroundRenderScaleCoeffPercent = clamp(((backgroundRenderScaleCoeffValue - 1) / 4) * 100, 0, 100)
  const backgroundRenderScaleCoeffStyle = {
    '--mpx-skeuo-range-pct': `${backgroundRenderScaleCoeffPercent}%`,
  } as CSSProperties
  const visualizerDisplayBackend = visualizerStats?.backend ?? visualizerActiveBackend ?? runtimeRenderer
  const gpuCanvasStyle = hasNoLayerEnabled
    ? ({ opacity: 0 } as CSSProperties)
    : visualizerDisplayBackend === 'gpu'
      ? undefined
      : ({ display: 'none' } as CSSProperties)
  const cpuCanvasStyle = hasNoLayerEnabled
    ? ({ opacity: 0 } as CSSProperties)
    : visualizerDisplayBackend === 'cpu'
      ? undefined
      : ({ display: 'none' } as CSSProperties)

  const manageSummary =
    activeSelectionScope === 'sidebar'
      ? t('a11y.manage.selectedSidebarNodes', { count: sidebarSelectedCount })
      : activeSelectionScope === 'image'
        ? t('a11y.manage.selectedMediaItems', { count: imageSelectedCount })
        : t('a11y.manage.noSelection')

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
    setAudioSeekDraftTime(null)
    lastAudioSeekPreviewAtRef.current = 0
    lastAudioSeekPreviewValueRef.current = null
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
    setRenderLongEdgeDraft(String(musicVisualizerShaderSettings.renderLongEdgePx))
  }, [musicVisualizerShaderSettings.renderLongEdgePx])

  useEffect(() => {
    setForegroundRenderScaleCoeffDraft(null)
  }, [foregroundLayerRenderScaleCoeff])

  useEffect(() => {
    setBackgroundRenderScaleCoeffDraft(null)
  }, [backgroundLayerRenderScaleCoeff])

  const closePopover = () => {
    setOpenPopover(null)
  }

  useMediaPreloadWindow({
    mediaType: 'audio',
    items: audioPreloadItems,
    activeId: focusedAudio?.id ?? null,
    budgetMb: mediaPreloadMemoryBudgetMb,
    lookBehind: 1,
    lookAhead: 2,
  })

  const commitAudioSeekDraft = () => {
    if (audioSeekDraftTime == null) {
      return
    }
    const nextTime = clamp(audioSeekDraftTime, 0, Math.max(0, audioDurationSec))
    setAudioTime(nextTime)
    const audio = audioRef.current
    if (audio) {
      audio.currentTime = nextTime
    }
    setAudioSeekDraftTime(null)
    lastAudioSeekPreviewAtRef.current = Date.now()
    lastAudioSeekPreviewValueRef.current = nextTime
  }

  const previewAudioSeekDuringDrag = (nextTime: number) => {
    const now = Date.now()
    const lastAt = lastAudioSeekPreviewAtRef.current
    const lastValue = lastAudioSeekPreviewValueRef.current
    const hasLargeJump = lastValue == null || Math.abs(nextTime - lastValue) >= 2
    if (lastAt !== 0 && now - lastAt < 90 && !hasLargeJump) {
      return
    }

    setAudioTime(nextTime)
    const audio = audioRef.current
    if (audio) {
      audio.currentTime = nextTime
    }
    lastAudioSeekPreviewAtRef.current = now
    lastAudioSeekPreviewValueRef.current = nextTime
  }

  const {
    controlsMounted: fullscreenControlsMounted,
    controlsVisible: fullscreenControlsVisible,
    showControls: showFullscreenControls,
    hideControls: hideFullscreenControls,
  } = useFullscreenFloatingControls({
    fullscreenActive,
    onAfterHide: closePopover,
  })
  const fullscreenViewport = useFullscreenWindowViewport(fullscreenActive)

  const toggleShaderListTargetLayer = () => {
    setShaderListTargetLayer((value) => (value === 'foreground' ? 'background' : 'foreground'))
  }

  const toggleShaderListTargetEnabled = () => {
    if (shaderListTargetLayer === 'foreground') {
      onMusicVisualizerShaderSettingsChange({ layeredForegroundEnabled: !musicVisualizerLayeredForegroundEnabled })
      return
    }
    onMusicVisualizerShaderSettingsChange({ layeredBackgroundEnabled: !musicVisualizerLayeredBackgroundEnabled })
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

  const applyForegroundRenderScaleCoeffDraft = useCallback(() => {
    if (foregroundRenderScaleCoeffDraft == null || !Number.isFinite(foregroundRenderScaleCoeffDraft)) {
      return
    }
    onMusicVisualizerLayerShaderSettingsChange('foreground', {
      renderScaleCoeff: Math.max(1, Math.min(5, foregroundRenderScaleCoeffDraft)),
    })
    setForegroundRenderScaleCoeffDraft(null)
  }, [foregroundRenderScaleCoeffDraft, onMusicVisualizerLayerShaderSettingsChange])

  const applyBackgroundRenderScaleCoeffDraft = useCallback(() => {
    if (backgroundRenderScaleCoeffDraft == null || !Number.isFinite(backgroundRenderScaleCoeffDraft)) {
      return
    }
    onMusicVisualizerLayerShaderSettingsChange('background', {
      renderScaleCoeff: Math.max(1, Math.min(5, backgroundRenderScaleCoeffDraft)),
    })
    setBackgroundRenderScaleCoeffDraft(null)
  }, [backgroundRenderScaleCoeffDraft, onMusicVisualizerLayerShaderSettingsChange])

  useEffect(() => {
    if (foregroundRenderScaleCoeffDraft == null) {
      return
    }

    const handlePointerUp = () => {
      applyForegroundRenderScaleCoeffDraft()
    }

    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('touchend', handlePointerUp)

    return () => {
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('touchend', handlePointerUp)
    }
  }, [applyForegroundRenderScaleCoeffDraft, foregroundRenderScaleCoeffDraft])

  useEffect(() => {
    if (backgroundRenderScaleCoeffDraft == null) {
      return
    }

    const handlePointerUp = () => {
      applyBackgroundRenderScaleCoeffDraft()
    }

    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('touchend', handlePointerUp)

    return () => {
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('touchend', handlePointerUp)
    }
  }, [applyBackgroundRenderScaleCoeffDraft, backgroundRenderScaleCoeffDraft])

  const fullscreenControlsWidthStyle = useMemo(() => {
    if (!fullscreenActive) {
      return undefined
    }
    const controlsWidth = resolveFullscreenControlsWidth({
      viewportWidth: fullscreenViewport.width,
      viewportHeight: fullscreenViewport.height,
      widthCap: fullscreenVideoControlsMaxWidth,
    })
    return {
      '--mpx-fullscreen-controls-max-width': `${controlsWidth}px`,
      '--mpx-fullscreen-controls-width': `${controlsWidth}px`,
    } as CSSProperties
  }, [fullscreenActive, fullscreenVideoControlsMaxWidth, fullscreenViewport.height, fullscreenViewport.width])

  const musicControlsShell = (
    <div
      className={`music-controls-shell${fullscreenActive ? ' is-fullscreen-floating fullscreen-controls-shell' : ''}${fullscreenActive && fullscreenControlsVisible ? ' is-visible' : ''}${fullscreenActive && !fullscreenControlsMounted ? ' is-hidden' : ''}`}
      hidden={fullscreenActive ? !fullscreenControlsMounted : undefined}
      onMouseEnter={fullscreenActive ? showFullscreenControls : undefined}
      onMouseLeave={fullscreenActive ? hideFullscreenControls : closePopover}
    >
      {fullscreenActive && focusedAudio ? (
        <div className="fullscreen-meta-row is-single">
          <div className="fullscreen-meta-line">
            <div className="fullscreen-meta-line-segment">
              <FullscreenMetaMarquee text={`${focusedAudio.absolutePath} | ${formatSeconds(Math.max(0, focusedAudio.durationSec))} | ${Number(focusedAudio.sizeMb.toFixed(2))}MB`} />
            </div>
          </div>
        </div>
      ) : null}

      <div className="music-controls-progress">
        <span className="video-progress-time">{`${formatSeconds(displayAudioTime)} / ${formatSeconds(audioDurationSec)}`}</span>
        <div className="mpx-progress-bar" style={musicProgressRangeStyle}>
          <input
            aria-label={t('a11y.music.progress')}
            className="mpx-progress-input"
            max={Math.max(0, audioDurationSec)}
            min={0}
            step={0.1}
            type="range"
            value={displayAudioTime}
            onChange={(event) => {
              const nextTime = clamp(Number(event.target.value), 0, Math.max(0, audioDurationSec))
              setAudioSeekDraftTime(nextTime)
              previewAudioSeekDuringDrag(nextTime)
            }}
            onMouseUp={commitAudioSeekDraft}
            onTouchEnd={commitAudioSeekDraft}
            onBlur={commitAudioSeekDraft}
            onKeyUp={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                commitAudioSeekDraft()
              }
            }}
          />
          <div className="mpx-progress-groove" aria-hidden="true" />
          <div className="mpx-progress-fill" aria-hidden="true" />
          <div className="mpx-progress-thumb" aria-hidden="true">
            <div className="mpx-progress-thumb-core" />
          </div>
        </div>
      </div>

      <div className="music-controls-row">
        <div className="music-controls-group is-left">
          <div
            className={`music-ctrl-popover ${openPopover === 'shader' ? 'is-open' : ''}`}
            onMouseEnter={() => setOpenPopover('shader')}
            onMouseLeave={closePopover}
          >
            <button
              aria-controls="music-main-popover-shader"
              aria-expanded={openPopover === 'shader'}
              aria-haspopup="dialog"
              aria-label={t('a11y.music.shaderSelected', { label: selectedShaderLabel })}
              className="video-action-btn"
              type="button"
            >
              <MusicControlIcon name="shaderList" />
            </button>
            <div className="music-ctrl-panel is-shader" hidden={openPopover !== 'shader'} id="music-main-popover-shader" role="dialog">
              <span className="music-ctrl-panel-title">{t('ui.music.shaderTitle')}</span>
              <div className="music-ctrl-shader-toolbar">
                <button
                  aria-label={t('a11y.music.shaderToggleLayer')}
                  className="music-ctrl-shader-toolbar-btn"
                  type="button"
                  onClick={toggleShaderListTargetLayer}
                >
                  {shaderListTargetLayer === 'foreground' ? 'F' : 'B'}
                </button>
                <button
                  aria-label={t('a11y.music.shaderToggleEnabled')}
                  className={`music-ctrl-shader-toolbar-btn ${shaderListTargetEnabled ? 'is-on' : 'is-off'}`}
                  type="button"
                  onClick={toggleShaderListTargetEnabled}
                >
                  {shaderListTargetEnabled ? t('ui.music.enabled') : t('ui.music.disabled')}
                </button>
              </div>
              <div className="music-ctrl-panel-options">
                {MUSIC_VISUALIZER_SHADERS.length > 0 ? (
                  MUSIC_VISUALIZER_SHADERS.map((shader) => (
                    <button
                      aria-pressed={shaderListTargetShaderId === shader.id}
                      className={`music-ctrl-panel-option ${shaderListTargetShaderId === shader.id ? 'is-active' : ''}`}
                      key={shader.id}
                      type="button"
                      onClick={() => {
                        onMusicVisualizerLayerShaderIdChange(shaderListTargetLayer, shader.id)
                        closePopover()
                      }}
                    >
                      {shader.label}
                    </button>
                  ))
                ) : (
                  <span className="music-ctrl-panel-note">{t('ui.music.noShaders')}</span>
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
              aria-label={t('a11y.music.shaderSettings')}
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
              <span className="music-ctrl-panel-title">{t('ui.music.shaderSettingsTitle')}</span>
              <div className="music-ctrl-panel-options music-ctrl-shader-settings-form">
                <label className="music-ctrl-shader-field">
                  <span className="music-ctrl-shader-label">{t('ui.music.renderLongEdge')}</span>
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
                  <span className="music-ctrl-shader-label">{t('ui.music.foregroundResolutionScale', { value: foregroundRenderScaleCoeffValue.toFixed(2) })}</span>
                  <input
                    className="music-ctrl-shader-range"
                    max={5}
                    min={1}
                    step={0.01}
                    style={foregroundRenderScaleCoeffStyle}
                    type="range"
                    value={foregroundRenderScaleCoeffValue}
                    onChange={(event) => {
                      const value = Number(event.target.value)
                      if (!Number.isFinite(value)) {
                        return
                      }
                      setForegroundRenderScaleCoeffDraft(Math.max(1, Math.min(5, value)))
                    }}
                    onMouseUp={applyForegroundRenderScaleCoeffDraft}
                    onTouchEnd={applyForegroundRenderScaleCoeffDraft}
                    onBlur={applyForegroundRenderScaleCoeffDraft}
                    onKeyUp={(event) => {
                      if (event.key === 'Enter') {
                        applyForegroundRenderScaleCoeffDraft()
                      }
                    }}
                  />
                </label>
                <label className="music-ctrl-shader-field">
                  <span className="music-ctrl-shader-label">{t('ui.music.backgroundResolutionScale', { value: backgroundRenderScaleCoeffValue.toFixed(2) })}</span>
                  <input
                    className="music-ctrl-shader-range"
                    max={5}
                    min={1}
                    step={0.01}
                    style={backgroundRenderScaleCoeffStyle}
                    type="range"
                    value={backgroundRenderScaleCoeffValue}
                    onChange={(event) => {
                      const value = Number(event.target.value)
                      if (!Number.isFinite(value)) {
                        return
                      }
                      setBackgroundRenderScaleCoeffDraft(Math.max(1, Math.min(5, value)))
                    }}
                    onMouseUp={applyBackgroundRenderScaleCoeffDraft}
                    onTouchEnd={applyBackgroundRenderScaleCoeffDraft}
                    onBlur={applyBackgroundRenderScaleCoeffDraft}
                    onKeyUp={(event) => {
                      if (event.key === 'Enter') {
                        applyBackgroundRenderScaleCoeffDraft()
                      }
                    }}
                  />
                </label>
                <label className="music-ctrl-shader-field">
                  <span className="music-ctrl-shader-label">{t('ui.music.foregroundOffsetX', { value: musicVisualizerLayeredForegroundOffsetX.toFixed(2) })}</span>
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
                  <span className="music-ctrl-shader-label">{t('ui.music.foregroundOffsetY', { value: musicVisualizerLayeredForegroundOffsetY.toFixed(2) })}</span>
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
                  <span className="music-ctrl-shader-label">{t('ui.music.foregroundScale', { value: musicVisualizerLayeredForegroundScale.toFixed(2) })}</span>
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
                <label className="music-ctrl-shader-field">
                  <span className="music-ctrl-shader-label">{t('ui.music.fpsCap')}</span>
                  <select
                    className="music-ctrl-shader-input"
                    value={musicVisualizerShaderSettings.fpsCap}
                    onChange={(event) =>
                      onMusicVisualizerShaderSettingsChange({
                        fpsCap: Number(event.target.value) as 30 | 60 | 120,
                      })
                    }
                  >
                    <option value={30}>{t('ui.music.fpsCapOption30')}</option>
                    <option value={60}>{t('ui.music.fpsCapOption60')}</option>
                    <option value={120}>{t('ui.music.fpsCapOption120')}</option>
                  </select>
                </label>
                <label className="music-ctrl-shader-field">
                  <span className="music-ctrl-shader-label">{t('ui.music.toneMapping')}</span>
                  <select
                    className="music-ctrl-shader-input"
                    value={musicVisualizerShaderSettings.toneMapMode}
                    onChange={(event) =>
                      onMusicVisualizerShaderSettingsChange({
                        toneMapMode: event.target.value as 'off' | 'reinhard' | 'aces' | 'filmic' | 'agx' | 'khronos',
                      })
                    }
                  >
                    <option value="off">{t('ui.music.disabled')}</option>
                    <option value="aces">{t('ui.music.toneMapModeAces')}</option>
                    <option value="reinhard">{t('ui.music.toneMapModeReinhard')}</option>
                    <option value="filmic">{t('ui.music.toneMapModeFilmic')}</option>
                    <option value="agx">{t('ui.music.toneMapModeAgx')}</option>
                    <option value="khronos">{t('ui.music.toneMapModeKhronos')}</option>
                  </select>
                </label>
                <label className="music-ctrl-shader-field">
                  <span className="music-ctrl-shader-label">{t('ui.music.toneMapExposure', { value: musicVisualizerShaderSettings.toneMapExposure.toFixed(2) })}</span>
                  <input
                    className="music-ctrl-shader-range"
                    max={2}
                    min={0.5}
                    step={0.01}
                    style={toneMapExposureRangeStyle}
                    type="range"
                    value={musicVisualizerShaderSettings.toneMapExposure}
                    onChange={(event) => {
                      const value = Number(event.target.value)
                      if (!Number.isFinite(value)) {
                        return
                      }
                      onMusicVisualizerShaderSettingsChange({
                        toneMapExposure: Math.max(0.5, Math.min(2, value)),
                      })
                    }}
                  />
                </label>
                <label className="music-ctrl-shader-field">
                  <span className="music-ctrl-shader-label">{t('ui.music.toneMapStrength', { value: (musicVisualizerShaderSettings.toneMapStrength * 100).toFixed(0) })}</span>
                  <input
                    className="music-ctrl-shader-range"
                    max={1}
                    min={0}
                    step={0.01}
                    style={toneMapStrengthRangeStyle}
                    type="range"
                    value={musicVisualizerShaderSettings.toneMapStrength}
                    onChange={(event) =>
                      onMusicVisualizerShaderSettingsChange({
                        toneMapStrength: Math.max(0, Math.min(1, Number(event.target.value))),
                      })
                    }
                  />
                </label>
                <label className="music-ctrl-shader-toggle">
                  <span className="music-ctrl-shader-label">{t('ui.music.showFpsDebug')}</span>
                  <input
                    type="checkbox"
                    checked={musicVisualizerShaderSettings.showFps}
                    onChange={(event) => onMusicVisualizerShaderSettingsChange({ showFps: event.target.checked })}
                  />
                </label>
                <label className="music-ctrl-shader-field">
                  <span className="music-ctrl-shader-label">{t('ui.music.renderBackend')}</span>
                  <select
                    className="music-ctrl-shader-input"
                    value={musicVisualizerShaderSettings.renderer}
                    onChange={(event) =>
                      onMusicVisualizerShaderSettingsChange({
                        renderer: event.target.value as 'gpu' | 'cpu',
                      })
                    }
                  >
                    <option value="gpu">{t('ui.music.rendererGpu')}</option>
                    <option value="cpu">{t('ui.music.rendererCpu')}</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          <button
            aria-label={fullscreenActive ? t('a11y.media.exitFullscreen') : t('a11y.media.enterFullscreen')}
            className="video-action-btn"
            title={fullscreenActive ? t('tip.media.exitFullscreen') : t('tip.media.enterFullscreen')}
            type="button"
            onClick={onToggleFullscreen}
          >
            <MusicControlIcon name={fullscreenActive ? 'fullscreenCompress' : 'fullscreenExpand'} />
          </button>
        </div>

        <div className="music-controls-group is-center">
          <button aria-label={t('a11y.media.prev')} className="video-action-btn" disabled={!canPrevAudio} type="button" onClick={onPrevAudio}>
            <MusicControlIcon name="prev" />
          </button>
          <button
            aria-label={audioPlaying ? t('a11y.media.pause') : t('a11y.media.play')}
            className="video-action-btn"
            disabled={!focusedAudioSrc}
            type="button"
            onClick={toggleAudioPlayback}
          >
            <MusicControlIcon name={audioPlaying ? 'pause' : 'play'} />
          </button>
          <button aria-label={t('a11y.media.next')} className="video-action-btn" disabled={!canNextAudio} type="button" onClick={onNextAudio}>
            <MusicControlIcon name="next" />
          </button>
        </div>

        <div className="music-controls-group is-right">
          <button
            aria-label={t('a11y.music.loopMode', { label: musicLoopModeLabel })}
            className="video-action-btn"
            title={t('tip.music.loopMode', { label: musicLoopModeLabel })}
            type="button"
            onClick={onCycleMusicLoopMode}
          >
            <MusicControlIcon name={resolveLoopModeIconName(musicLoopMode)} />
          </button>

          <div
            className={`music-ctrl-popover ${openPopover === 'volume' ? 'is-open' : ''}`}
            onMouseEnter={() => setOpenPopover('volume')}
          >
            <button
              aria-controls="music-main-popover-volume"
              aria-expanded={openPopover === 'volume'}
              aria-haspopup="dialog"
              aria-label={audioMuted ? t('a11y.media.unmute') : t('a11y.media.mute')}
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
                <div className="mpx-volume-bar" style={musicVolumeRangeStyle}>
                  <input
                    aria-label={t('a11y.media.volumeSlider')}
                    className="music-ctrl-volume-range mpx-volume-input"
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
                  <div className="mpx-volume-groove" aria-hidden="true" />
                  <div className="mpx-volume-fill" aria-hidden="true" />
                  <div className="mpx-volume-thumb" aria-hidden="true">
                    <div className="mpx-volume-thumb-core" />
                  </div>
                </div>
              </div>
            </div>
          </div>
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
                    className="feature-action-btn main-icon-square-btn"
                    type="button"
                    aria-label={t('a11y.common.organize')}
                    title={t('tip.common.organize')}
                    disabled={!canManageMoveNodes || pendingManageAction}
                    onClick={onManageGroup}
                  >
                    <MainUiIcon name="organize" />
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
                {manageOperationHint ? (
                  <div className="toolbar-actions toolbar-actions-manage">
                    <span className="main-toolbar-hint">{manageOperationHint}</span>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <ToolbarTitleMarquee text={musicToolbarTitle} />
                {canJumpToManga || canJumpToAnimation || canJumpToCover || canJumpToBooklet ? (
                  <div className="toolbar-actions">
                    {canJumpToCover ? (
                      <button
                        className="toolbar-icon-btn"
                        type="button"
                        aria-label={t('ui.metadata.openCover')}
                        title={t('ui.metadata.openCover')}
                        onClick={onJumpToCover}
                      >
                        <MainUiIcon name="cover" />
                      </button>
                    ) : null}
                    {canJumpToBooklet ? (
                      <button className="toolbar-icon-btn" type="button" aria-label={t('a11y.media.booklet')} title={t('tip.media.booklet')} onClick={onJumpToBooklet}>
                        <MainUiIcon name="booklet" />
                      </button>
                    ) : null}
                    {canJumpToManga ? (
                      <button className="toolbar-icon-btn" type="button" aria-label={t('a11y.media.manga')} title={t('tip.media.manga')} onClick={onJumpToManga}>
                        <MainUiIcon name="imageMode" />
                      </button>
                    ) : null}
                    {canJumpToAnimation ? (
                      <button className="toolbar-icon-btn" type="button" aria-label={t('a11y.media.animation')} title={t('tip.media.animation')} onClick={onJumpToAnimation}>
                        <MainUiIcon name="videoMode" />
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div
            className={`name-list music-name-list music-visualizer${fullscreenActive ? ' is-fullscreen' : ''}`}
            aria-label={t('a11y.music.visualizer')}
            data-overlay-close={fullscreenActive ? 'fullscreen' : undefined}
            style={fullscreenControlsWidthStyle}
          >
            <canvas
              key={`${visualizerCanvasVersion}-gpu`}
              ref={visualizerGpuCanvasRef}
              className="music-visualizer-canvas"
              style={gpuCanvasStyle}
            />
            <canvas
              key={`${visualizerCanvasVersion}-cpu`}
              ref={visualizerCpuCanvasRef}
              className="music-visualizer-canvas"
              style={cpuCanvasStyle}
            />
            {runtimeShowFps && visualizerStats ? (
              <div className="music-visualizer-hud" role="status">
                <span>{`FPS ${visualizerStats.fps.toFixed(1)} | ${visualizerStats.frameMs.toFixed(2)}ms`}</span>
                <span>{`Render ${visualizerStats.renderWidth} x ${visualizerStats.renderHeight}`}</span>
                <span>{`TargetLongEdge ${runtimeRenderLongEdgePx}`}</span>
                <span>{`FPS Cap ${runtimeFpsCap}`}</span>
                <span>{`ToneMap ${runtimeToneMapMode}@${runtimeToneMapExposure.toFixed(2)}*${runtimeToneMapStrength.toFixed(2)}`}</span>
                <span>{`Backend ${visualizerStats.backend.toUpperCase()}`}</span>
                <span>{`Shader ${visualizerStats.shaderId}`}</span>
                <span>{visualizerStats.rendererLabel}</span>
              </div>
            ) : null}
            {visualizerRuntimeError ? (
              <div className={`music-visualizer-hud ${runtimeShowFps ? 'is-warning' : 'is-warning is-bottom'}`} role="status">
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
