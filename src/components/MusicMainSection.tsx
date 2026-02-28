import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { MusicMainSectionControlsShell } from './MusicMainSectionControlsShell'
import { MusicMainSectionLayout } from './MusicMainSectionLayout'
import type { MusicMainSectionProps, MusicPopoverKey } from './MusicMainSection.types'
import { MusicAudioTranscodePanel } from './MusicAudioTranscodePanel'
import { resolveFullscreenControlsWidth } from './fullscreen/controlsWidth'
import { useFullscreenWindowViewport } from './fullscreen/useFullscreenWindowViewport'
import { resolveMusicToolbarSummary } from './musicMainSectionUtils'
import { useMediaPreloadWindow } from './useMediaPreloadWindow'
import { useFullscreenFloatingControls } from './useFullscreenFloatingControls'
import { useI18n } from '../i18n/useI18n'
import {
  emitMusicPlaybackState,
  onMusicPlaybackControl,
} from '../features/media/musicPlaybackBridge'
import type { StartAudioTranscodeTaskRequestDto } from '../contracts/backend'
import { MUSIC_VISUALIZER_SHADERS, resolveDefaultMusicVisualizerShader, resolveMusicVisualizerShaderById } from '../features/music-visualizer/shaderRegistry'
import { useMusicVisualizerRuntime } from '../features/music-visualizer/useMusicVisualizerRuntime'
import { clamp } from '../utils/ui'

function MusicMainSection({
  active,
  interruptByVideoPlayback,
  playRequestNonce,
  manageMode,
  metadataManageMode,
  metadataManageSelectionMode = 'multiple',
  sidebarSelectedCount,
  imageSelectedCount,
  activeSelectionScope,
  manageSelectedAudioIds = [],
  pendingManageAction,
  manageOperationHint,
  canManageDelete,
  onManageDelete,
  onToggleMetadataManageSelectionMode = () => undefined,
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
  popoverDebugPinned,
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
  const AUDIO_ENGINE_MODE_CHANGED_EVENT = 'mpx:audio-engine-mode-changed'
  const { t } = useI18n()
  const metadataSelectionToggleLabel =
    metadataManageSelectionMode === 'single'
      ? t('a11y.metadata.switchToMultipleSelectMode')
      : t('a11y.metadata.switchToSingleSelectMode')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const visualizerGpuCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const visualizerCpuCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const lastAudioSeekPreviewAtRef = useRef(0)
  const lastAudioSeekPreviewValueRef = useRef<number | null>(null)
  const lastPlayRequestNonceRef = useRef(playRequestNonce)
  const visualizerActivateRafRef = useRef<number | null>(null)
  const visualizerActivateRaf2Ref = useRef<number | null>(null)
  const audioTranscodePollTimerRef = useRef<number | null>(null)
  const suppressNativePlaybackEventsRef = useRef(false)
  const suppressNativePlaybackTimerRef = useRef<number | null>(null)
  const modeTransitionInProgressRef = useRef(false)
  const modeTransitionReconcileTimerRef = useRef<number | null>(null)
  const audioEngineModeRef = useRef<'chromium' | 'mpv'>('chromium')
  const pendingMpvResumeStartSecRef = useRef<number | null>(null)
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
  const [visualizerPlaybackResetNonce, setVisualizerPlaybackResetNonce] = useState(0)
  const [visualizerExternalAudioFrame, setVisualizerExternalAudioFrame] = useState<{
    frequencyData: Uint8Array
    waveformData: Uint8Array
    audioLevel: number
    audioBeat: number
  } | null>(null)
  const [audioEngineMode, setAudioEngineMode] = useState<'chromium' | 'mpv'>('chromium')
  const [audioTranscodePanelOpen, setAudioTranscodePanelOpen] = useState(false)
  const [audioTranscodePreset, setAudioTranscodePreset] = useState<StartAudioTranscodeTaskRequestDto['preset']>('flac')
  const [audioTranscodeOutputDir, setAudioTranscodeOutputDir] = useState('')
  const [audioTranscodePickingOutputDir, setAudioTranscodePickingOutputDir] = useState(false)
  const [audioTranscodeOverwrite, setAudioTranscodeOverwrite] = useState(false)
  const [audioTranscodeCopyMetadata, setAudioTranscodeCopyMetadata] = useState(true)
  const [audioTranscodeAddOutputToMusicSources, setAudioTranscodeAddOutputToMusicSources] = useState(true)
  const [audioTranscodeTaskId, setAudioTranscodeTaskId] = useState<string | null>(null)
  const [audioTranscodeTaskStatus, setAudioTranscodeTaskStatus] = useState<
    'pending' | 'running' | 'completed' | 'cancelled' | 'failed' | null
  >(null)
  const [audioTranscodeTaskProgress, setAudioTranscodeTaskProgress] = useState(0)
  const [audioTranscodeTaskMessage, setAudioTranscodeTaskMessage] = useState<string | null>(null)
  const [audioTranscodeOutputCount, setAudioTranscodeOutputCount] = useState(0)
  const previousAudioEngineModeRef = useRef<'chromium' | 'mpv'>('chromium')
  const visualizerRecoveryRef = useRef({ windowStartedAt: 0, attempts: 0 })

  useEffect(() => {
    audioEngineModeRef.current = audioEngineMode
  }, [audioEngineMode])

  const cueStartSec = Math.max(0, focusedAudio?.cueStartSec ?? 0)
  const cueEndSec = typeof focusedAudio?.cueEndSec === 'number' && focusedAudio.cueEndSec > cueStartSec
    ? focusedAudio.cueEndSec
    : null
  const cueSegmentDurationSec = cueEndSec != null
    ? Math.max(0, cueEndSec - cueStartSec)
    : Math.max(0, focusedAudio?.durationSec ?? 0)
  const hasCueSegment = cueStartSec > 0 || cueEndSec != null
  const focusedAudioExtension = focusedAudio?.mediaLocator.kind === 'filesystem' ? focusedAudio.mediaLocator.extension.toLowerCase() : ''
  const requiresEnhancedModeInChromium =
    (focusedAudioExtension === '.ape' ||
      focusedAudioExtension === '.wv' ||
      focusedAudioExtension === '.tta' ||
      focusedAudioExtension === '.tak' ||
      focusedAudioExtension === '.shn') ||
    (typeof focusedAudioSrc === 'string' && focusedAudioSrc.startsWith('data:application/octet-stream;base64,'))

  const suppressNativePlaybackEventsFor = useCallback((ms: number) => {
    suppressNativePlaybackEventsRef.current = true
    if (suppressNativePlaybackTimerRef.current != null) {
      window.clearTimeout(suppressNativePlaybackTimerRef.current)
      suppressNativePlaybackTimerRef.current = null
    }
    suppressNativePlaybackTimerRef.current = window.setTimeout(() => {
      suppressNativePlaybackEventsRef.current = false
      suppressNativePlaybackTimerRef.current = null
    }, Math.max(80, ms))
  }, [])

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
  const hasForegroundShaderSelected = musicVisualizerLayeredForegroundShaderId.trim().length > 0
  const hasBackgroundShaderSelected = musicVisualizerLayeredBackgroundShaderId.trim().length > 0
  const effectiveForegroundLayerEnabled = musicVisualizerLayeredForegroundEnabled && hasForegroundShaderSelected
  const effectiveBackgroundLayerEnabled = musicVisualizerLayeredBackgroundEnabled && hasBackgroundShaderSelected
  const hasNoLayerEnabled = !effectiveBackgroundLayerEnabled && !effectiveForegroundLayerEnabled

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
  }, [active, fullscreenActive])

  useEffect(() => {
    if (!active || !fullscreenActive || typeof document === 'undefined') {
      return
    }

    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [active, fullscreenActive])

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
    disableAudioAnalyser: audioEngineMode === 'mpv',
    externalAudioFrame: audioEngineMode === 'mpv' ? visualizerExternalAudioFrame : null,
    playbackPaused: !audioPlaying,
    playbackResetNonce: visualizerPlaybackResetNonce,
    preferredRenderer: runtimeRenderer,
    renderLongEdgePx: runtimeRenderLongEdgePx,
    renderScaleCoeff: runtimeRenderScaleCoeff,
    layeredBackgroundShaderId: musicVisualizerLayeredBackgroundShaderId,
    layeredForegroundShaderId: musicVisualizerLayeredForegroundShaderId,
    layeredBackgroundEnabled: effectiveBackgroundLayerEnabled,
    layeredForegroundEnabled: effectiveForegroundLayerEnabled,
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
  const audioTranscodeExecuting =
    audioTranscodeTaskStatus === 'pending' ||
    audioTranscodeTaskStatus === 'running'
  const canManageAudioTranscode =
    manageMode &&
    (manageSelectedAudioIds.length > 0 || Boolean(focusedAudio?.id))

  const clearAudioTranscodePollTimer = useCallback(() => {
    if (audioTranscodePollTimerRef.current != null) {
      window.clearInterval(audioTranscodePollTimerRef.current)
      audioTranscodePollTimerRef.current = null
    }
  }, [])

  const stopAudioTranscodeExecution = useCallback(() => {
    clearAudioTranscodePollTimer()
    setAudioTranscodeTaskId(null)
    setAudioTranscodeTaskStatus(null)
    setAudioTranscodeTaskProgress(0)
    setAudioTranscodeTaskMessage(null)
    setAudioTranscodeOutputCount(0)
  }, [clearAudioTranscodePollTimer])

  const resolveAudioTranscodeTargetIds = useCallback((): string[] => {
    if (
      manageMode &&
      activeSelectionScope === 'sidebar' &&
      manageSelectedAudioIds.length > 0
    ) {
      return Array.from(new Set(manageSelectedAudioIds))
    }
    if (focusedAudio?.id) {
      return [focusedAudio.id]
    }
    return []
  }, [
    activeSelectionScope,
    focusedAudio?.id,
    manageMode,
    manageSelectedAudioIds,
  ])

  const layeredBackgroundShaderLabel = useMemo(() => {
    return MUSIC_VISUALIZER_SHADERS.find((shader) => shader.id === musicVisualizerLayeredBackgroundShaderId)?.label ?? t('ui.music.backgroundShaderUnselected')
  }, [musicVisualizerLayeredBackgroundShaderId, t])

  const layeredForegroundShaderLabel = useMemo(() => {
    return MUSIC_VISUALIZER_SHADERS.find((shader) => shader.id === musicVisualizerLayeredForegroundShaderId)?.label ?? t('ui.music.foregroundShaderUnselected')
  }, [musicVisualizerLayeredForegroundShaderId, t])

  const selectedShaderLabel = useMemo(() => {
    if (effectiveBackgroundLayerEnabled && effectiveForegroundLayerEnabled) {
      return `${layeredBackgroundShaderLabel} + ${layeredForegroundShaderLabel}`
    }
    if (effectiveBackgroundLayerEnabled) {
      return layeredBackgroundShaderLabel
    }
    if (effectiveForegroundLayerEnabled) {
      return layeredForegroundShaderLabel
    }
    return t('ui.music.transparent')
  }, [
    effectiveBackgroundLayerEnabled,
    effectiveForegroundLayerEnabled,
    layeredBackgroundShaderLabel,
    layeredForegroundShaderLabel,
    t,
  ])

  const clampedAudioTime = clamp(audioTime, 0, Math.max(0, audioDurationSec))
  const displayAudioTime = audioSeekDraftTime == null ? clampedAudioTime : clamp(audioSeekDraftTime, 0, Math.max(0, audioDurationSec))
  const audioProgressPercent = audioDurationSec > 0 ? clamp((displayAudioTime / audioDurationSec) * 100, 0, 100) : 0
  const audioVolumePercent = clamp(audioMuted ? 0 : audioVolume, 0, 100)
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

  const suggestEnhancedModeForUnsupported = useCallback(() => {
    if (typeof window === 'undefined') {
      return
    }

    const backendApi = window.mediaPlayerBackend
    const setAudioEngineModeMethod = backendApi?.setAudioEngineMode
    const tipMessage = '当前音频格式在兼容模式下无法播放，建议切换到增强模式 (mpv)。是否立即切换？'
    if (typeof setAudioEngineModeMethod !== 'function') {
      if (typeof window.alert === 'function') {
        window.alert('当前音频格式在兼容模式下无法播放，请在设置中切换到增强模式 (mpv)。')
      }
      return
    }

    const confirmed = typeof window.confirm === 'function' ? window.confirm(tipMessage) : true
    if (!confirmed) {
      return
    }

    void setAudioEngineModeMethod({ mode: 'mpv' }).then((response) => {
      setAudioEngineMode(response.mode)
      setAudioPlaying(true)
      window.dispatchEvent(new CustomEvent(AUDIO_ENGINE_MODE_CHANGED_EVENT, {
        detail: {
          mode: response.mode,
        },
      }))
    }).catch(() => undefined)
  }, [AUDIO_ENGINE_MODE_CHANGED_EVENT])

  const toggleAudioPlayback = useCallback(() => {
    if (audioEngineMode === 'mpv') {
      const nextPlaying = !audioPlaying
      setAudioPlaying(nextPlaying)
      if (nextPlaying) {
        void resumeAudioAnalyser()
      }
      return
    }

    if (!audioPlaying && requiresEnhancedModeInChromium) {
      suggestEnhancedModeForUnsupported()
      return
    }

    if (!focusedAudioSrc) {
      const nextPlaying = !audioPlaying
      setAudioPlaying(nextPlaying)
      if (nextPlaying) {
        void resumeAudioAnalyser()
      }
      return
    }

    const audio = audioRef.current
    if (!audio) {
      const nextPlaying = !audioPlaying
      setAudioPlaying(nextPlaying)
      if (nextPlaying) {
        void resumeAudioAnalyser()
      }
      return
    }

    if (!audio.paused) {
      audio.pause()
      setAudioPlaying(false)
      return
    }

    setAudioPlaying(true)
    void resumeAudioAnalyser()
    void audio.play().catch(() => {
      setAudioPlaying(false)
    })
  }, [
    audioEngineMode,
    audioPlaying,
    focusedAudioSrc,
    requiresEnhancedModeInChromium,
    resumeAudioAnalyser,
    suggestEnhancedModeForUnsupported,
  ])

  const stopAudioPlayback = useCallback(() => {
    setAudioPlaying(false)
    setAudioTime(0)
    setVisualizerPlaybackResetNonce((value) => value + 1)
    emitMusicPlaybackState({ playing: false })
    const audio = audioRef.current
    if (!audio) {
      const backendApi = typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
      if (audioEngineMode === 'mpv' && typeof backendApi?.audioEngineStopPlayback === 'function') {
        void backendApi.audioEngineStopPlayback().catch(() => undefined)
      }
      return
    }
    audio.pause()
    audio.currentTime = 0
    const backendApi = typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
    if (audioEngineMode === 'mpv' && typeof backendApi?.audioEngineStopPlayback === 'function') {
      void backendApi.audioEngineStopPlayback().catch(() => undefined)
    }
  }, [audioEngineMode])

  useEffect(() => {
    const backendApi = typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
    const readAudioEngineState = backendApi?.readAudioEngineState
    if (typeof readAudioEngineState !== 'function') {
      setAudioEngineMode('chromium')
      return
    }

    let activeState = true
    const refreshMode = () => {
      void readAudioEngineState().then((response) => {
        if (!activeState) {
          return
        }
        setAudioEngineMode(response.mode)
      }).catch(() => undefined)
    }

    refreshMode()
    const onModeChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: unknown }>).detail
      const mode = detail?.mode
      if (mode === 'chromium' || mode === 'mpv') {
        setAudioEngineMode(mode)
      }
    }

    window.addEventListener(AUDIO_ENGINE_MODE_CHANGED_EVENT, onModeChanged)
    const timer = window.setInterval(refreshMode, 3000)
    return () => {
      activeState = false
      window.removeEventListener(AUDIO_ENGINE_MODE_CHANGED_EVENT, onModeChanged)
      window.clearInterval(timer)
    }
  }, [AUDIO_ENGINE_MODE_CHANGED_EVENT])

  useEffect(() => {
    const previousMode = previousAudioEngineModeRef.current
    previousAudioEngineModeRef.current = audioEngineMode
    if (previousMode === audioEngineMode) {
      return
    }

    const audio = audioRef.current
    if (!audio) {
      return
    }

    if (previousMode === 'chromium' && audioEngineMode === 'mpv') {
      modeTransitionInProgressRef.current = false
      if (modeTransitionReconcileTimerRef.current != null) {
        window.clearTimeout(modeTransitionReconcileTimerRef.current)
        modeTransitionReconcileTimerRef.current = null
      }
      pendingMpvResumeStartSecRef.current = Math.max(0, audio.currentTime)
      suppressNativePlaybackEventsFor(220)
      audio.muted = true
      return
    }

    if (previousMode !== 'mpv' || audioEngineMode !== 'chromium') {
      return
    }

    modeTransitionInProgressRef.current = true
    suppressNativePlaybackEventsFor(220)
    audio.muted = audioMuted
    audio.volume = clamp(audioVolume / 100, 0, 1)

    if (!focusedAudioSrc) {
      audio.pause()
      setAudioPlaying(false)
      return
    }

    const resumeAtSec = clamp(audio.currentTime, 0, Math.max(0, audioDurationSec))
    if (Number.isFinite(resumeAtSec) && Math.abs(audio.currentTime - resumeAtSec) > 0.6) {
      try {
        audio.currentTime = resumeAtSec
      } catch {
        // ignore seek failure during mode switch
      }
    }

    if (!audioPlaying) {
      audio.pause()
      modeTransitionInProgressRef.current = false
      return
    }

    void resumeAudioAnalyser()
    void audio.play().catch(() => {
      setAudioPlaying(false)
      modeTransitionInProgressRef.current = false
    })

    const baselineTime = audio.currentTime
    const expectedSrc = focusedAudioSrc
    if (modeTransitionReconcileTimerRef.current != null) {
      window.clearTimeout(modeTransitionReconcileTimerRef.current)
      modeTransitionReconcileTimerRef.current = null
    }
    modeTransitionReconcileTimerRef.current = window.setTimeout(() => {
      modeTransitionReconcileTimerRef.current = null
      if (audioEngineModeRef.current !== 'chromium') {
        modeTransitionInProgressRef.current = false
        return
      }
      const currentAudio = audioRef.current
      if (!currentAudio || expectedSrc !== focusedAudioSrc) {
        modeTransitionInProgressRef.current = false
        return
      }

      const progressed = currentAudio.currentTime > baselineTime + 0.05
      if (audioPlaying && (!progressed || currentAudio.paused)) {
        void resumeAudioAnalyser()
        void currentAudio.play().catch(() => {
          setAudioPlaying(false)
        }).finally(() => {
          modeTransitionInProgressRef.current = false
        })
        return
      }
      modeTransitionInProgressRef.current = false
    }, 360)
  }, [
    audioDurationSec,
    audioEngineMode,
    audioMuted,
    audioPlaying,
    audioVolume,
    focusedAudioSrc,
    resumeAudioAnalyser,
    suppressNativePlaybackEventsFor,
  ])

  useEffect(() => {
    const backendApi = typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
    if (audioEngineMode !== 'mpv' || typeof backendApi?.audioEngineLoadTrack !== 'function') {
      return
    }
    if (!focusedAudioSrc || !focusedAudio?.absolutePath) {
      if (typeof backendApi.audioEngineStopPlayback === 'function') {
        void backendApi.audioEngineStopPlayback().catch(() => undefined)
      }
      return
    }

    const pendingStartSec = pendingMpvResumeStartSecRef.current
    pendingMpvResumeStartSecRef.current = null
    const request: {
      file_path: string
      start_sec?: number
      end_sec?: number
    } = {
      file_path:
        focusedAudio.mediaLocator.kind === 'filesystem'
          ? focusedAudio.mediaLocator.absolutePath
          : focusedAudio.absolutePath,
    }

    if (typeof pendingStartSec === 'number' && Number.isFinite(pendingStartSec) && pendingStartSec > 0.05) {
      request.start_sec = pendingStartSec
    } else if (cueStartSec > 0.05) {
      request.start_sec = cueStartSec
    }

    if (cueEndSec != null) {
      request.end_sec = cueEndSec
    }

    void backendApi.audioEngineLoadTrack(request).catch(() => undefined)
  }, [audioEngineMode, focusedAudio?.absolutePath, focusedAudio?.id, focusedAudio?.mediaLocator.kind, focusedAudioSrc])

  useEffect(() => {
    const backendApi = typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
    if (audioEngineMode !== 'mpv' || typeof backendApi?.audioEngineSetPaused !== 'function') {
      return
    }
    void backendApi.audioEngineSetPaused({
      paused: !audioPlaying,
    }).catch(() => undefined)
  }, [audioEngineMode, audioPlaying])

  useEffect(() => {
    const backendApi = typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
    if (audioEngineMode !== 'mpv' || typeof backendApi?.audioEngineSetVolume !== 'function') {
      return
    }
    void backendApi.audioEngineSetVolume({
      volume: clamp(audioMuted ? 0 : audioVolume, 0, 100),
    }).catch(() => undefined)
  }, [audioEngineMode, audioMuted, audioVolume])

  useEffect(() => {
    const backendApi = typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
    if (audioEngineMode !== 'mpv' || typeof backendApi?.readAudioEngineAnalysisFrame !== 'function') {
      setVisualizerExternalAudioFrame(null)
      return
    }

    let active = true
    const syncAnalysisFrame = () => {
      void backendApi.readAudioEngineAnalysisFrame!().then((response) => {
        if (!active || response.mode !== 'mpv' || !response.ok || !response.loaded) {
          return
        }

        const frequencyData = new Uint8Array(512)
        const waveformData = new Uint8Array(512)
        const bins = response.frequency_bins
        const waveformBins = response.waveform_bins
        for (let index = 0; index < 512; index += 1) {
          const frequencyValue = bins[index]
          const waveformValue = waveformBins[index]
          frequencyData[index] = typeof frequencyValue === 'number' ? Math.max(0, Math.min(255, Math.round(frequencyValue))) : 0
          waveformData[index] = typeof waveformValue === 'number' ? Math.max(0, Math.min(255, Math.round(waveformValue))) : 128
        }

        setVisualizerExternalAudioFrame({
          frequencyData,
          waveformData,
          audioLevel: Math.max(0, Math.min(1, response.audio_level)),
          audioBeat: Math.max(0, Math.min(1, response.audio_beat)),
        })
      }).catch(() => undefined)
    }

    syncAnalysisFrame()
    const timer = window.setInterval(syncAnalysisFrame, 33)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [audioEngineMode])

  useEffect(() => {
    const backendApi = typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
    if (audioEngineMode !== 'mpv' || typeof backendApi?.readAudioEnginePlaybackStatus !== 'function') {
      return
    }

    let active = true
    const syncPlaybackStatus = () => {
      void backendApi.readAudioEnginePlaybackStatus!().then((response) => {
        if (!active || response.mode !== 'mpv' || !response.ok) {
          return
        }

        if (!response.loaded) {
          if (audioSeekDraftTime == null) {
            setAudioTime(0)
          }
          setAudioPlaying(false)
          return
        }

        if (typeof response.paused === 'boolean') {
          setAudioPlaying(!response.paused)
        }

        if (typeof response.time_sec === 'number' && Number.isFinite(response.time_sec) && audioSeekDraftTime == null) {
          if (hasCueSegment) {
            const relativeTime = Math.max(0, response.time_sec - cueStartSec)
            const clampedRelativeTime = cueEndSec != null ? Math.min(relativeTime, cueSegmentDurationSec) : relativeTime
            setAudioTime(clampedRelativeTime)
          } else {
            setAudioTime(Math.max(0, response.time_sec))
          }
        }

        if (hasCueSegment) {
          setAudioDurationSec(cueSegmentDurationSec)
        } else if (typeof response.duration_sec === 'number' && Number.isFinite(response.duration_sec) && response.duration_sec > 0) {
          setAudioDurationSec(response.duration_sec)
        }
      }).catch(() => undefined)
    }

    syncPlaybackStatus()
    const timer = window.setInterval(syncPlaybackStatus, 250)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [audioEngineMode, audioSeekDraftTime, cueEndSec, cueSegmentDurationSec, cueStartSec, hasCueSegment])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) {
      return
    }

    if (modeTransitionInProgressRef.current) {
      return
    }

    audio.muted = audioMuted || audioEngineMode === 'mpv'
    audio.volume = clamp(audioVolume / 100, 0, 1)

    if (audioEngineMode === 'mpv') {
      audio.pause()
      return
    }

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
  }, [audioEngineMode, audioMuted, audioPlaying, audioVolume, focusedAudioSrc])

  useEffect(() => {
    return () => {
      if (suppressNativePlaybackTimerRef.current != null) {
        window.clearTimeout(suppressNativePlaybackTimerRef.current)
        suppressNativePlaybackTimerRef.current = null
      }
      if (modeTransitionReconcileTimerRef.current != null) {
        window.clearTimeout(modeTransitionReconcileTimerRef.current)
        modeTransitionReconcileTimerRef.current = null
      }
      modeTransitionInProgressRef.current = false
    }
  }, [])

  useEffect(() => {
    setAudioTime(0)
    setAudioSeekDraftTime(null)
    lastAudioSeekPreviewAtRef.current = 0
    lastAudioSeekPreviewValueRef.current = null
    setAudioDurationSec(hasCueSegment ? cueSegmentDurationSec : Math.max(0, focusedAudio?.durationSec ?? 0))
    if (!focusedAudio?.id && !focusedAudioSrc) {
      setAudioPlaying(false)
    }
  }, [cueSegmentDurationSec, focusedAudio?.id, focusedAudio?.durationSec, focusedAudioSrc, hasCueSegment])

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

    if (audioEngineMode !== 'mpv' && requiresEnhancedModeInChromium) {
      suggestEnhancedModeForUnsupported()
      return
    }

    setAudioPlaying(true)
  }, [
    audioEngineMode,
    focusedAudioSrc,
    interruptByVideoPlayback,
    playRequestNonce,
    requiresEnhancedModeInChromium,
    suggestEnhancedModeForUnsupported,
  ])

  useEffect(() => {
    if (!audioPlaying) {
      return
    }
    void resumeAudioAnalyser()
  }, [audioPlaying, resumeAudioAnalyser])

  useEffect(() => {
    if (!manageMode) {
      setAudioTranscodePanelOpen(false)
    }
  }, [manageMode])

  useEffect(() => {
    if (fullscreenActive) {
      setAudioTranscodePanelOpen(false)
    }
  }, [fullscreenActive])

  useEffect(() => {
    if (!audioTranscodeTaskId || !audioTranscodeExecuting) {
      clearAudioTranscodePollTimer()
      return
    }

    const backendApi = typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
    const readAudioTranscodeTask = backendApi?.readAudioTranscodeTask
    if (typeof readAudioTranscodeTask !== 'function') {
      return
    }

    const pollTask = () => {
      void readAudioTranscodeTask({ task_id: audioTranscodeTaskId }).then((response) => {
        const task = response.task
        if (!task) {
          return
        }
        const nextStatus = task.status ?? 'running'
        const progress = task.total_count > 0
          ? Math.max(0, Math.min(1, task.processed_count / task.total_count))
          : Math.max(0, Math.min(1, task.progress ?? 0))
        setAudioTranscodeTaskStatus(nextStatus)
        setAudioTranscodeTaskProgress(progress)
        setAudioTranscodeTaskMessage(task.message ?? null)
        setAudioTranscodeOutputCount(task.output_files?.length ?? 0)

        if (nextStatus === 'completed' || nextStatus === 'cancelled' || nextStatus === 'failed') {
          clearAudioTranscodePollTimer()
        }
      }).catch(() => undefined)
    }

    pollTask()
    clearAudioTranscodePollTimer()
    audioTranscodePollTimerRef.current = window.setInterval(pollTask, 350)
    return () => {
      clearAudioTranscodePollTimer()
    }
  }, [
    audioTranscodeExecuting,
    audioTranscodeTaskId,
    clearAudioTranscodePollTimer,
  ])

  useEffect(() => {
    return () => {
      clearAudioTranscodePollTimer()
    }
  }, [clearAudioTranscodePollTimer])

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
    if (popoverDebugPinned) {
      return
    }
    setOpenPopover(null)
  }

  const toggleAudioTranscodePanel = () => {
    if (!canManageAudioTranscode || pendingManageAction || audioTranscodeExecuting) {
      return
    }
    setAudioTranscodePanelOpen((value) => !value)
  }

  const handleAudioTranscodeConfirm = async () => {
    const targetAudioIds = resolveAudioTranscodeTargetIds()
    if (targetAudioIds.length <= 0) {
      setAudioTranscodeTaskStatus('failed')
      setAudioTranscodeTaskMessage(t('ui.music.audioTranscodeNoTarget'))
      return
    }

    const backendApi = typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
    const startAudioTranscodeTask = backendApi?.startAudioTranscodeTask
    if (typeof startAudioTranscodeTask !== 'function') {
      setAudioTranscodeTaskStatus('failed')
      setAudioTranscodeTaskMessage(t('ui.music.audioTranscodeBackendUnavailable'))
      return
    }

    setAudioTranscodeTaskStatus('pending')
    setAudioTranscodeTaskProgress(0)
    setAudioTranscodeTaskMessage(null)
    setAudioTranscodeOutputCount(0)

    const request: StartAudioTranscodeTaskRequestDto = {
      audio_ids: targetAudioIds,
      preset: audioTranscodePreset,
      overwrite: audioTranscodeOverwrite,
      copy_metadata: audioTranscodeCopyMetadata,
      add_output_to_music_sources: audioTranscodeAddOutputToMusicSources,
    }
    const outputDir = audioTranscodeOutputDir.trim()
    if (outputDir.length > 0) {
      request.output_dir = outputDir
    }

    try {
      const response = await startAudioTranscodeTask(request)
      const task = response.task
      if (!task?.task_id) {
        setAudioTranscodeTaskStatus('failed')
        setAudioTranscodeTaskMessage(t('ui.music.audioTranscodeMissingTaskId'))
        return
      }
      setAudioTranscodeTaskId(task.task_id)
      setAudioTranscodeTaskStatus(task.status ?? 'running')
      setAudioTranscodeTaskProgress(0)
      setAudioTranscodeTaskMessage(task.message ?? null)
      setAudioTranscodeOutputCount(task.output_files?.length ?? 0)
    } catch (error) {
      const reason = error instanceof Error && error.message ? error.message : String(error)
      setAudioTranscodeTaskStatus('failed')
      setAudioTranscodeTaskMessage(reason)
    }
  }

  const handleAudioTranscodePickOutputDir = async () => {
    if (audioTranscodeExecuting || audioTranscodePickingOutputDir) {
      return
    }

    const backendApi = typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
    const pickDirectoryPath = backendApi?.pickDirectoryPath
    if (typeof pickDirectoryPath !== 'function') {
      setAudioTranscodeTaskStatus('failed')
      setAudioTranscodeTaskMessage(t('ui.music.audioTranscodePickOutputDirectoryUnsupported'))
      return
    }

    setAudioTranscodePickingOutputDir(true)
    try {
      const response = await pickDirectoryPath({
        title: t('ui.music.audioTranscodePickOutputDirectoryTitle'),
        default_path: audioTranscodeOutputDir.trim() || undefined,
      })
      const pickedPath = response.path?.trim() ?? ''
      if (!response.canceled && pickedPath.length > 0) {
        setAudioTranscodeOutputDir(pickedPath)
      }
    } catch (error) {
      const reason = error instanceof Error && error.message ? error.message : String(error)
      setAudioTranscodeTaskStatus('failed')
      setAudioTranscodeTaskMessage(t('ui.music.audioTranscodePickOutputDirectoryFailed', { message: reason }))
    } finally {
      setAudioTranscodePickingOutputDir(false)
    }
  }

  const handleAudioTranscodeCancel = async () => {
    const backendApi = typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
    if (audioTranscodeExecuting && audioTranscodeTaskId && typeof backendApi?.cancelAudioTranscodeTask === 'function') {
      try {
        await backendApi.cancelAudioTranscodeTask({ task_id: audioTranscodeTaskId })
      } catch {
        // ignore cancel error and close panel anyway
      }
    }
    stopAudioTranscodeExecution()
    setAudioTranscodePanelOpen(false)
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
    const localCueStartSec = hasCueSegment ? cueStartSec : 0
    const absoluteSeekTime = localCueStartSec > 0 ? localCueStartSec + nextTime : nextTime
    if (audio) {
      audio.currentTime = absoluteSeekTime
    }
    const backendApi = typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
    if (audioEngineMode === 'mpv' && typeof backendApi?.audioEngineSeekTo === 'function') {
      void backendApi.audioEngineSeekTo({ time_sec: absoluteSeekTime }).catch(() => undefined)
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
    const localCueStartSec = hasCueSegment ? cueStartSec : 0
    const absoluteSeekTime = localCueStartSec > 0 ? localCueStartSec + nextTime : nextTime
    if (audio) {
      audio.currentTime = absoluteSeekTime
    }
    const backendApi = typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
    if (audioEngineMode === 'mpv' && typeof backendApi?.audioEngineSeekTo === 'function') {
      void backendApi.audioEngineSeekTo({ time_sec: absoluteSeekTime }).catch(() => undefined)
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

  const toggleShaderLayerEnabled = useCallback((layer: 'foreground' | 'background') => {
    if (layer === 'foreground') {
      if (!hasForegroundShaderSelected) {
        onMusicVisualizerShaderSettingsChange({ layeredForegroundEnabled: false })
        return
      }
      onMusicVisualizerShaderSettingsChange({ layeredForegroundEnabled: !musicVisualizerLayeredForegroundEnabled })
      return
    }
    if (!hasBackgroundShaderSelected) {
      onMusicVisualizerShaderSettingsChange({ layeredBackgroundEnabled: false })
      return
    }
    onMusicVisualizerShaderSettingsChange({ layeredBackgroundEnabled: !musicVisualizerLayeredBackgroundEnabled })
  }, [
    hasBackgroundShaderSelected,
    hasForegroundShaderSelected,
    musicVisualizerLayeredBackgroundEnabled,
    musicVisualizerLayeredForegroundEnabled,
    onMusicVisualizerShaderSettingsChange,
  ])

  const shaderOptionWidthStyle = useMemo(() => {
    const longestLabelLength = MUSIC_VISUALIZER_SHADERS.reduce((maxLength, shader) => {
      return Math.max(maxLength, shader.label.length)
    }, 8)
    return {
      '--mpx-shader-option-width-ch': `${longestLabelLength}`,
    } as CSSProperties
  }, [])

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

  const musicVolumeTooltipStatus = audioMuted
    ? t('tip.music.volumeStatusMuted')
    : t('tip.music.volumeStatusPercent', { value: Math.round(audioVolume) })
  const shaderSelectTooltip = t('tip.music.shaderSelector', { label: selectedShaderLabel })
  const loopModeTooltip = t('tip.music.loopModeSelector', { label: musicLoopModeLabel })
  const volumeTooltip = t('tip.music.volumeAdjust', { status: musicVolumeTooltipStatus })
  const playTooltip = audioPlaying ? t('tip.music.pauseTrack') : t('tip.music.playTrack')

  const audioTranscodePanel = (
    <MusicAudioTranscodePanel
      open={audioTranscodePanelOpen}
      fullscreenActive={fullscreenActive}
      executing={audioTranscodeExecuting}
      preset={audioTranscodePreset}
      outputDir={audioTranscodeOutputDir}
      pickingOutputDir={audioTranscodePickingOutputDir}
      overwrite={audioTranscodeOverwrite}
      copyMetadata={audioTranscodeCopyMetadata}
      addOutputToMusicSources={audioTranscodeAddOutputToMusicSources}
      taskStatus={audioTranscodeTaskStatus}
      taskProgress={audioTranscodeTaskProgress}
      taskMessage={audioTranscodeTaskMessage}
      outputCount={audioTranscodeOutputCount}
      onCloseMask={() => {
        setAudioTranscodePanelOpen(false)
      }}
      onPanelMouseDown={(event) => {
        event.stopPropagation()
      }}
      onPresetChange={setAudioTranscodePreset}
      onOutputDirChange={setAudioTranscodeOutputDir}
      onPickOutputDir={handleAudioTranscodePickOutputDir}
      onOverwriteChange={setAudioTranscodeOverwrite}
      onCopyMetadataChange={setAudioTranscodeCopyMetadata}
      onAddOutputToMusicSourcesChange={setAudioTranscodeAddOutputToMusicSources}
      onConfirm={handleAudioTranscodeConfirm}
      onCancel={handleAudioTranscodeCancel}
    />
  )

  const musicControlsShell = (
    <MusicMainSectionControlsShell
      t={t}
      fullscreenActive={fullscreenActive}
      focusedAudio={focusedAudio}
      popoverDebugPinned={popoverDebugPinned}
      openPopover={openPopover}
      onSetOpenPopover={setOpenPopover}
      onClosePopover={closePopover}
      controlsMounted={fullscreenControlsMounted}
      controlsVisible={fullscreenControlsVisible}
      showFullscreenControls={showFullscreenControls}
      hideFullscreenControls={hideFullscreenControls}
      displayAudioTime={displayAudioTime}
      audioDurationSec={audioDurationSec}
      audioProgressPercent={audioProgressPercent}
      onAudioSeekDraftChange={(nextTime) => {
        setAudioSeekDraftTime(nextTime)
        previewAudioSeekDuringDrag(nextTime)
      }}
      onCommitAudioSeekDraft={commitAudioSeekDraft}
      shaderSelectTooltip={shaderSelectTooltip}
      selectedShaderLabel={selectedShaderLabel}
      shaderOptionWidthStyle={shaderOptionWidthStyle}
      shaderListTargetLayer={shaderListTargetLayer}
      onSetShaderListTargetLayer={setShaderListTargetLayer}
      effectiveForegroundLayerEnabled={effectiveForegroundLayerEnabled}
      effectiveBackgroundLayerEnabled={effectiveBackgroundLayerEnabled}
      onToggleShaderLayerEnabled={toggleShaderLayerEnabled}
      shaderListTargetShaderId={shaderListTargetShaderId}
      musicVisualizerLayeredForegroundShaderId={musicVisualizerLayeredForegroundShaderId}
      musicVisualizerLayeredBackgroundShaderId={musicVisualizerLayeredBackgroundShaderId}
      onMusicVisualizerLayerShaderIdChange={onMusicVisualizerLayerShaderIdChange}
      renderLongEdgeDraft={renderLongEdgeDraft}
      onRenderLongEdgeDraftChange={setRenderLongEdgeDraft}
      onApplyRenderLongEdgeDraft={applyRenderLongEdgeDraft}
      foregroundRenderScaleCoeffValue={foregroundRenderScaleCoeffValue}
      foregroundRenderScaleCoeffStyle={foregroundRenderScaleCoeffStyle}
      onForegroundRenderScaleCoeffDraftChange={setForegroundRenderScaleCoeffDraft}
      onApplyForegroundRenderScaleCoeffDraft={applyForegroundRenderScaleCoeffDraft}
      backgroundRenderScaleCoeffValue={backgroundRenderScaleCoeffValue}
      backgroundRenderScaleCoeffStyle={backgroundRenderScaleCoeffStyle}
      onBackgroundRenderScaleCoeffDraftChange={setBackgroundRenderScaleCoeffDraft}
      onApplyBackgroundRenderScaleCoeffDraft={applyBackgroundRenderScaleCoeffDraft}
      musicVisualizerLayeredForegroundOffsetX={musicVisualizerLayeredForegroundOffsetX}
      musicVisualizerLayeredForegroundOffsetY={musicVisualizerLayeredForegroundOffsetY}
      musicVisualizerLayeredForegroundScale={musicVisualizerLayeredForegroundScale}
      musicVisualizerShaderSettings={musicVisualizerShaderSettings}
      toneMapExposureRangeStyle={toneMapExposureRangeStyle}
      toneMapStrengthRangeStyle={toneMapStrengthRangeStyle}
      onMusicVisualizerShaderSettingsChange={onMusicVisualizerShaderSettingsChange}
      onToggleFullscreen={onToggleFullscreen}
      playTooltip={playTooltip}
      canPrevAudio={canPrevAudio}
      onPrevAudio={onPrevAudio}
      audioPlaying={audioPlaying}
      onToggleAudioPlayback={toggleAudioPlayback}
      onStopAudioPlayback={stopAudioPlayback}
      canNextAudio={canNextAudio}
      onNextAudio={onNextAudio}
      loopModeTooltip={loopModeTooltip}
      musicLoopModeLabel={musicLoopModeLabel}
      musicLoopMode={musicLoopMode}
      onCycleMusicLoopMode={onCycleMusicLoopMode}
      volumeTooltip={volumeTooltip}
      audioMuted={audioMuted}
      onToggleAudioMuted={() => {
        setAudioMuted((value) => !value)
      }}
      audioVolume={audioVolume}
      audioVolumePercent={audioVolumePercent}
      onAudioVolumeChange={(value) => {
        setAudioMuted(false)
        setAudioVolume(value)
      }}
    />
  )

  const visualizerPane = (
    <div
      className={`name-list music-name-list music-visualizer${fullscreenActive ? ' is-fullscreen' : ''}`}
      data-slot="fg-main-content-music-preview"
      aria-label={t('a11y.music.visualizer')}
      style={fullscreenControlsWidthStyle}
    >
      <canvas
        key={`${visualizerCanvasVersion}-gpu`}
        ref={visualizerGpuCanvasRef}
        className="music-visualizer-canvas"
        data-slot="fg-main-content-music-preview-canvas-gpu"
        style={gpuCanvasStyle}
      />
      <canvas
        key={`${visualizerCanvasVersion}-cpu`}
        ref={visualizerCpuCanvasRef}
        className="music-visualizer-canvas"
        data-slot="fg-main-content-music-preview-canvas-cpu"
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
  )

  return (
    <>
      <MusicMainSectionLayout
        active={active}
        t={t}
        manageMode={manageMode}
        metadataManageMode={metadataManageMode}
        metadataManageSelectionMode={metadataManageSelectionMode}
        metadataSelectionToggleLabel={metadataSelectionToggleLabel}
        sidebarSelectedCount={sidebarSelectedCount}
        imageSelectedCount={imageSelectedCount}
        activeSelectionScope={activeSelectionScope}
        pendingManageAction={pendingManageAction}
        manageOperationHint={manageOperationHint}
        canManageDelete={canManageDelete}
        canManageMoveNodes={canManageMoveNodes}
        canManageAudioTranscode={canManageAudioTranscode}
        audioTranscodePanelOpen={audioTranscodePanelOpen}
        canJumpToManga={canJumpToManga}
        canJumpToAnimation={canJumpToAnimation}
        canJumpToCover={canJumpToCover}
        canJumpToBooklet={canJumpToBooklet}
        onManageDelete={onManageDelete}
        onManageGroup={onManageGroup}
        onToggleAudioTranscodePanel={toggleAudioTranscodePanel}
        onToggleMetadataManageSelectionMode={onToggleMetadataManageSelectionMode}
        onJumpToManga={onJumpToManga}
        onJumpToAnimation={onJumpToAnimation}
        onJumpToCover={onJumpToCover}
        onJumpToBooklet={onJumpToBooklet}
        musicToolbarTitle={musicToolbarTitle}
        fullscreenActive={fullscreenActive}
        visualizerPane={visualizerPane}
        musicControlsShell={musicControlsShell}
        audioTranscodePanel={audioTranscodePanel}
      />

      <audio
        ref={audioRef}
        className="music-native-audio"
        crossOrigin="anonymous"
        src={focusedAudioSrc ?? undefined}
        preload="metadata"
        onPlay={() => {
          if (audioEngineMode === 'mpv' || suppressNativePlaybackEventsRef.current) {
            return
          }
          if (focusedAudioSrc) {
            setAudioPlaying(true)
          }
        }}
        onPause={() => {
          if (audioEngineMode === 'mpv' || suppressNativePlaybackEventsRef.current) {
            return
          }
          if (focusedAudioSrc) {
            setAudioPlaying(false)
          }
        }}
        onTimeUpdate={() => {
          const currentTime = audioRef.current?.currentTime ?? 0
          if (hasCueSegment) {
            const relativeTime = Math.max(0, currentTime - cueStartSec)
            const clampedRelativeTime = cueEndSec != null ? Math.min(relativeTime, cueSegmentDurationSec) : relativeTime
            setAudioTime(clampedRelativeTime)
            if (audioEngineMode !== 'mpv' && cueEndSec != null && currentTime >= cueEndSec - 0.01) {
              const audio = audioRef.current
              if (audio && !audio.paused) {
                audio.pause()
                audio.currentTime = cueEndSec
                onNextAudio()
              }
              setAudioTime(cueSegmentDurationSec)
              setAudioPlaying(false)
            }
            return
          }
          setAudioTime(currentTime)
        }}
        onLoadedMetadata={() => {
          if (hasCueSegment) {
            if (audioRef.current) {
              audioRef.current.currentTime = cueStartSec
            }
            setAudioDurationSec(cueSegmentDurationSec)
            setAudioTime(0)
            return
          }
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
            audio.currentTime = hasCueSegment ? cueStartSec : 0
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
