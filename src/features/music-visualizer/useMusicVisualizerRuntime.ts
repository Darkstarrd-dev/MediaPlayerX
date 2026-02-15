import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'

import { MusicAudioAnalyser } from './audioAnalyser'
import { CpuMusicVisualizerRenderer } from './cpuRenderer'
import { resolveDefaultMusicVisualizerShader, resolveMusicVisualizerShaderById } from './shaderRegistry'
import type {
  MusicVisualizerShaderChannelSource,
  MusicVisualizerShaderDefinition,
  MusicVisualizerShaderPassDefinition,
  MusicVisualizerShaderTextureDefinition,
  MusicVisualizerRenderer,
  MusicVisualizerRendererMode,
  MusicVisualizerStats,
  MusicVisualizerToneMapMode,
} from './types'
import { WebglMusicVisualizerRenderer } from './webglRenderer'

const MIN_RENDER_LONG_EDGE = 240
const MAX_RENDER_LONG_EDGE = 4096
const STATS_UPDATE_INTERVAL_MS = 240
const MIN_SHADER_RENDER_SCALE = 0.25
const MAX_SHADER_RENDER_SCALE = 5
const MIN_TONE_MAP_EXPOSURE = 0.5
const MAX_TONE_MAP_EXPOSURE = 2
const TONE_MAP_EXPOSURE_SLEW_PER_SECOND = 1.8
const TONE_MAP_STRENGTH_SLEW_PER_SECOND = 1.2

function clampToneMapExposure(value: number): number {
  if (!Number.isFinite(value)) {
    return 1
  }
  return Math.max(MIN_TONE_MAP_EXPOSURE, Math.min(MAX_TONE_MAP_EXPOSURE, value))
}

function clampToneMapStrength(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.max(0, Math.min(1, value))
}

interface UseMusicVisualizerRuntimeParams {
  canvasRef: RefObject<HTMLCanvasElement | null>
  cpuCanvasRef?: RefObject<HTMLCanvasElement | null>
  audioRef: RefObject<HTMLAudioElement | null>
  canvasInstanceVersion?: number
  active: boolean
  preferredRenderer: MusicVisualizerRendererMode
  renderLongEdgePx: number
  fpsCap: 30 | 60 | 120
  toneMapMode: MusicVisualizerToneMapMode
  toneMapExposure: number
  toneMapStrength: number
  selectedShaderId: string | null
  renderScaleCoeff?: number
  layeredBackgroundShaderId?: string | null
  layeredForegroundShaderId?: string | null
  layeredBackgroundEnabled?: boolean
  layeredForegroundEnabled?: boolean
  layeredBackgroundRenderScaleCoeff?: number
  layeredForegroundRenderScaleCoeff?: number
  layeredForegroundOffsetX?: number
  layeredForegroundOffsetY?: number
  layeredForegroundScale?: number
}

interface UseMusicVisualizerRuntimeResult {
  stats: MusicVisualizerStats | null
  activeBackend: MusicVisualizerRendererMode | null
  runtimeError: string | null
  resumeAudioAnalyser: () => Promise<void>
}

function resolveRenderSize(containerWidth: number, containerHeight: number, targetLongEdgePx: number): { width: number; height: number } {
  const clampedLongEdge = Math.max(MIN_RENDER_LONG_EDGE, Math.min(MAX_RENDER_LONG_EDGE, Math.round(targetLongEdgePx)))
  const longestEdge = Math.max(containerWidth, containerHeight, 1)
  const scale = clampedLongEdge / longestEdge

  return {
    width: Math.max(1, Math.round(containerWidth * scale)),
    height: Math.max(1, Math.round(containerHeight * scale)),
  }
}

function resolveContainerSize(canvas: HTMLCanvasElement): { width: number; height: number } {
  const container = canvas.parentElement
  if (!container) {
    return {
      width: Math.max(1, Math.round(canvas.clientWidth || 1)),
      height: Math.max(1, Math.round(canvas.clientHeight || 1)),
    }
  }

  const width = container.clientWidth || Math.round(container.getBoundingClientRect().width)
  const height = container.clientHeight || Math.round(container.getBoundingClientRect().height)
  return {
    width: Math.max(1, width),
    height: Math.max(1, height),
  }
}

function clampRenderScaleCoeff(value: number): number {
  if (!Number.isFinite(value)) {
    return 1
  }
  return Math.max(1, Math.min(5, value))
}

function prefixChannelSource(
  source: MusicVisualizerShaderChannelSource,
  prefix: string,
): MusicVisualizerShaderChannelSource {
  if (source.kind === 'pass') {
    return {
      ...source,
      passId: `${prefix}${source.passId}`,
    }
  }
  if (source.kind === 'texture') {
    return {
      ...source,
      textureId: `${prefix}${source.textureId}`,
    }
  }
  return source
}

function composeLayeredShader(params: {
  backgroundShader: MusicVisualizerShaderDefinition | null
  foregroundShader: MusicVisualizerShaderDefinition | null
  backgroundEnabled: boolean
  foregroundEnabled: boolean
  backgroundScaleCoeff: number
  foregroundScaleCoeff: number
}): MusicVisualizerShaderDefinition | null {
  const {
    backgroundShader,
    foregroundShader,
    backgroundEnabled,
    foregroundEnabled,
    backgroundScaleCoeff,
    foregroundScaleCoeff,
  } = params

  if (!backgroundEnabled && !foregroundEnabled) {
    return null
  }

  const textures: MusicVisualizerShaderTextureDefinition[] = []
  const passes: MusicVisualizerShaderPassDefinition[] = []

  const appendShaderAsBuffer = (
    shader: MusicVisualizerShaderDefinition,
    prefix: string,
    defaultScaleCoeff: number,
  ): string => {
    const commonSource = shader.multiPass?.commonSource ?? shader.commonSource
    let finalPassId = ''

    if (shader.multiPass && shader.multiPass.passes.length > 0) {
      for (const texture of shader.multiPass.textures ?? []) {
        textures.push({
          ...texture,
          id: `${prefix}${texture.id}`,
        })
      }

      const sourcePasses = shader.multiPass.passes
      const explicitScreenIndex = sourcePasses.findIndex((pass) => pass.output === 'screen')
      const screenPassIndex = explicitScreenIndex >= 0 ? explicitScreenIndex : sourcePasses.length - 1

      for (let index = 0; index < sourcePasses.length; index += 1) {
        const sourcePass = sourcePasses[index]
        const passId = `${prefix}${sourcePass.id}`
        finalPassId = index === screenPassIndex ? passId : finalPassId

        const scopedSource = commonSource
          ? `${commonSource}\n\n${sourcePass.fragmentSource}`
          : sourcePass.fragmentSource

        passes.push({
          id: passId,
          fragmentSource: scopedSource,
          output: 'buffer',
          toneMap: false,
          renderScale: clampRenderScaleCoeff((sourcePass.renderScale ?? 1) * defaultScaleCoeff),
          channels: (sourcePass.channels ?? []).map((channel) => {
            if (!channel) {
              return null
            }
            return prefixChannelSource(channel, prefix)
          }),
        })
      }

      return finalPassId
    }

    finalPassId = `${prefix}image`
    const scopedSource = commonSource ? `${commonSource}\n\n${shader.fragmentSource}` : shader.fragmentSource
    passes.push({
      id: finalPassId,
      fragmentSource: scopedSource,
      output: 'buffer',
      toneMap: false,
      renderScale: clampRenderScaleCoeff((shader.renderScale ?? 1) * defaultScaleCoeff),
      channels: [{ kind: 'audio' }, null, null, null],
    })
    return finalPassId
  }

  const backgroundPassId = backgroundEnabled && backgroundShader
    ? appendShaderAsBuffer(backgroundShader, 'bg_', backgroundScaleCoeff)
    : ''
  const foregroundPassId = foregroundEnabled && foregroundShader
    ? appendShaderAsBuffer(foregroundShader, 'fg_', foregroundScaleCoeff)
    : ''

  passes.push({
    id: 'compose-screen',
    output: 'screen',
    toneMap: true,
    fragmentSource: String.raw`vec3 screenBlend(vec3 base, vec3 layer) {
  return 1.0 - (1.0 - base) * (1.0 - layer);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  vec3 background = texture(iChannel0, uv).rgb;

  vec2 centered = (uv - vec2(0.5)) / max(iForegroundScale, 0.0001) + vec2(0.5);
  vec2 foregroundUv = centered - iForegroundOffset;
  vec3 foreground = texture(iChannel1, foregroundUv).rgb;

  vec3 color = screenBlend(background, foreground);
  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`,
    channels: [
      backgroundPassId ? { kind: 'pass', passId: backgroundPassId } : null,
      foregroundPassId ? { kind: 'pass', passId: foregroundPassId } : null,
      null,
      null,
    ],
  })

  return {
    id: `layered:${backgroundShader?.id ?? 'none'}:${foregroundShader?.id ?? 'none'}`,
    label: 'Layered Composite',
    fragmentSource: passes[passes.length - 1]?.fragmentSource ?? '',
    multiPass: {
      textures,
      passes,
    },
  }
}

const TRANSPARENT_SHADER: MusicVisualizerShaderDefinition = {
  id: 'transparent-disabled',
  label: 'Transparent Disabled',
  fragmentSource: String.raw`void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  fragColor = vec4(0.0, 0.0, 0.0, 0.0);
}`,
  toneMapPolicy: 'force-off',
}

export function useMusicVisualizerRuntime({
  canvasRef,
  cpuCanvasRef,
  audioRef,
  canvasInstanceVersion = 0,
  active,
  preferredRenderer,
  renderLongEdgePx,
  fpsCap,
  toneMapMode,
  toneMapExposure,
  toneMapStrength,
  selectedShaderId,
  renderScaleCoeff = 2,
  layeredBackgroundShaderId,
  layeredForegroundShaderId,
  layeredBackgroundEnabled = true,
  layeredForegroundEnabled = true,
  layeredBackgroundRenderScaleCoeff = 2,
  layeredForegroundRenderScaleCoeff = 2,
  layeredForegroundOffsetX = 0,
  layeredForegroundOffsetY = 0,
  layeredForegroundScale = 1,
}: UseMusicVisualizerRuntimeParams): UseMusicVisualizerRuntimeResult {
  const [stats, setStats] = useState<MusicVisualizerStats | null>(null)
  const [activeBackend, setActiveBackend] = useState<MusicVisualizerRendererMode | null>(null)
  const [runtimeError, setRuntimeError] = useState<string | null>(null)

  const shader = useMemo(() => {
    const defaultShader = resolveDefaultMusicVisualizerShader()
    const fallbackShader = resolveMusicVisualizerShaderById(selectedShaderId) ?? defaultShader
    const backgroundShader = resolveMusicVisualizerShaderById(layeredBackgroundShaderId) ?? fallbackShader
    const foregroundShader = resolveMusicVisualizerShaderById(layeredForegroundShaderId) ?? fallbackShader

    if (layeredBackgroundEnabled && layeredForegroundEnabled && backgroundShader && foregroundShader) {
      return composeLayeredShader({
        backgroundShader,
        foregroundShader,
        backgroundEnabled: true,
        foregroundEnabled: true,
        backgroundScaleCoeff: layeredBackgroundRenderScaleCoeff,
        foregroundScaleCoeff: layeredForegroundRenderScaleCoeff,
      })
    }

    if (layeredBackgroundEnabled) {
      return backgroundShader ?? fallbackShader ?? TRANSPARENT_SHADER
    }
    if (layeredForegroundEnabled) {
      return foregroundShader ?? fallbackShader ?? TRANSPARENT_SHADER
    }

    return TRANSPARENT_SHADER
  }, [
    layeredBackgroundEnabled,
    layeredBackgroundRenderScaleCoeff,
    layeredBackgroundShaderId,
    layeredForegroundEnabled,
    layeredForegroundRenderScaleCoeff,
    layeredForegroundShaderId,
    selectedShaderId,
  ])
  const audioAnalyserRef = useRef<MusicAudioAnalyser | null>(null)
  const runtimeSettingsRef = useRef({
    fpsCap,
    renderLongEdgePx,
    renderScaleCoeff,
    toneMapMode,
    toneMapExposure,
    toneMapStrength,
    layeredForegroundOffsetX,
    layeredForegroundOffsetY,
    layeredForegroundScale,
  })

  useEffect(() => {
    runtimeSettingsRef.current = {
      fpsCap,
      renderLongEdgePx,
      renderScaleCoeff,
      toneMapMode,
      toneMapExposure,
      toneMapStrength,
      layeredForegroundOffsetX,
      layeredForegroundOffsetY,
      layeredForegroundScale,
    }
  }, [
    fpsCap,
    layeredForegroundOffsetX,
    layeredForegroundOffsetY,
    layeredForegroundScale,
    renderLongEdgePx,
    renderScaleCoeff,
    toneMapExposure,
    toneMapMode,
    toneMapStrength,
  ])

  if (audioAnalyserRef.current == null) {
    audioAnalyserRef.current = new MusicAudioAnalyser()
  }

  const resumeAudioAnalyser = useCallback(async () => {
    if (!audioAnalyserRef.current) {
      return
    }
    try {
      await audioAnalyserRef.current.resume()
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    return () => {
      audioAnalyserRef.current?.dispose()
    }
  }, [])

  useEffect(() => {
    if (!active) {
      setStats(null)
      setActiveBackend(null)
      setRuntimeError(null)
      return
    }

    const gpuCanvas = canvasRef.current
    const cpuCanvas = cpuCanvasRef?.current ?? canvasRef.current
    if (!gpuCanvas) {
      setStats(null)
      setActiveBackend(null)
      setRuntimeError('可视化画布未就绪（canvasRef.current 为空）')
      return
    }
    if (!cpuCanvas) {
      setStats(null)
      setActiveBackend(null)
      setRuntimeError('可视化画布未就绪（cpuCanvasRef.current 为空）')
      return
    }

    if (!shader) {
      setStats(null)
      setActiveBackend(null)
      setRuntimeError('未找到可用 Shader')
      return
    }

    const resolveShaderRenderScale = (): number => {
      return Math.max(
        MIN_SHADER_RENDER_SCALE,
        Math.min(MAX_SHADER_RENDER_SCALE, (shader.renderScale ?? 1) * clampRenderScaleCoeff(runtimeSettingsRef.current.renderScaleCoeff)),
      )
    }
    const resolveEffectiveToneMap = (): {
      mode: MusicVisualizerToneMapMode
      exposure: number
      strength: number
    } => {
      const shaderToneMapPolicy = shader.toneMapPolicy ?? 'inherit'
      let mode: MusicVisualizerToneMapMode = runtimeSettingsRef.current.toneMapMode
      if (shaderToneMapPolicy === 'force-off') {
        mode = 'off'
      } else if (shaderToneMapPolicy === 'force-on' && mode === 'off') {
        mode = 'aces'
      }

      const baseStrength = mode === 'off' ? 0 : runtimeSettingsRef.current.toneMapStrength
      return {
        mode,
        exposure: clampToneMapExposure(runtimeSettingsRef.current.toneMapExposure),
        strength: clampToneMapStrength(baseStrength + (shader.toneMapStrengthBias ?? 0)),
      }
    }

    const initialToneMap = resolveEffectiveToneMap()

    const createRenderer = (mode: MusicVisualizerRendererMode): MusicVisualizerRenderer => {
      if (mode === 'gpu') {
        return new WebglMusicVisualizerRenderer(gpuCanvas, shader)
      }
      return new CpuMusicVisualizerRenderer(cpuCanvas)
    }

    const resolveRuntimeProbeInfo = (): string => {
      const probeWebglCanvas = document.createElement('canvas')
      const probe2dCanvas = document.createElement('canvas')
      const hasWebgl2 = Boolean(probeWebglCanvas.getContext('webgl2'))
      const hasCanvas2d = Boolean(probe2dCanvas.getContext('2d'))
      const snapshot = resolveEffectiveToneMap()
      const shaderRenderScale = resolveShaderRenderScale()
      return `shader=${shader.id}, scale=${shaderRenderScale.toFixed(2)}, fpsCap=${runtimeSettingsRef.current.fpsCap}, toneMap=${snapshot.mode}@${snapshot.exposure.toFixed(2)}*${snapshot.strength.toFixed(2)}, dpr=${window.devicePixelRatio.toFixed(2)}, webgl2=${hasWebgl2 ? 'yes' : 'no'}, canvas2d=${hasCanvas2d ? 'yes' : 'no'}`
    }

    const runtimeProbeInfo = resolveRuntimeProbeInfo()

    let renderer: MusicVisualizerRenderer | null = null
    let rendererInitMessage: string | null = null

    if (preferredRenderer === 'gpu') {
      try {
        renderer = createRenderer('gpu')
      } catch (gpuError) {
        const gpuErrorMessage = gpuError instanceof Error ? gpuError.message : String(gpuError)
        try {
          renderer = createRenderer('cpu')
          rendererInitMessage = `GPU 渲染初始化失败，已自动切换 CPU：${gpuErrorMessage} | ${runtimeProbeInfo}`
        } catch (cpuError) {
          const cpuErrorMessage = cpuError instanceof Error ? cpuError.message : String(cpuError)
          rendererInitMessage = `可视化渲染器初始化失败（GPU + CPU）：${gpuErrorMessage} | ${cpuErrorMessage} | ${runtimeProbeInfo}`
        }
      }
    } else {
      try {
        renderer = createRenderer('cpu')
      } catch (cpuError) {
        const cpuErrorMessage = cpuError instanceof Error ? cpuError.message : String(cpuError)
        rendererInitMessage = `CPU 渲染初始化失败：${cpuErrorMessage} | ${runtimeProbeInfo}`
      }
    }

    setRuntimeError(rendererInitMessage)
    setActiveBackend(renderer?.backend ?? null)

    if (!renderer) {
      setStats(null)
      return
    }

    const renderCanvas = renderer.backend === 'gpu' ? gpuCanvas : cpuCanvas

    const audioAnalyser = audioAnalyserRef.current
    let disposed = false
    let animationFrameId = 0
    let frame = 0
    let lastFrameAt = performance.now()
    let statsStartAt = lastFrameAt
    let statsFrameCount = 0
    let latestFrameMs = 0
    let lastAnalyserError: string | null = null
    let lastRenderError: string | null = null
    let lastRenderAt = -Infinity
    let smoothedToneMapExposure = initialToneMap.exposure
    let smoothedToneMapStrength = initialToneMap.strength
    let smoothedToneMapMode = initialToneMap.mode

    const stepToward = (current: number, target: number, maxDelta: number): number => {
      if (!Number.isFinite(current) || !Number.isFinite(target)) {
        return target
      }
      if (!Number.isFinite(maxDelta) || maxDelta <= 0) {
        return target
      }
      if (Math.abs(target - current) <= maxDelta) {
        return target
      }
      return current + Math.sign(target - current) * maxDelta
    }

    const renderLoop = (now: number) => {
      if (disposed) {
        return
      }

      const minFrameIntervalMs = 1000 / runtimeSettingsRef.current.fpsCap
      if (now - lastRenderAt < minFrameIntervalMs) {
        animationFrameId = window.requestAnimationFrame(renderLoop)
        return
      }
      lastRenderAt = now

      const containerSize = resolveContainerSize(renderCanvas)
      const containerWidth = containerSize.width
      const containerHeight = containerSize.height
      const shaderRenderScale = resolveShaderRenderScale()
      const renderSize = resolveRenderSize(containerWidth, containerHeight, runtimeSettingsRef.current.renderLongEdgePx * shaderRenderScale)

      renderCanvas.style.width = '100%'
      renderCanvas.style.height = '100%'
      renderer.resize(renderSize.width, renderSize.height)

      if (audioAnalyser) {
        audioAnalyser.attach(audioRef.current)
        audioAnalyser.sample()
        if (audioAnalyser.lastError !== lastAnalyserError) {
          lastAnalyserError = audioAnalyser.lastError
          if (lastAnalyserError) {
            setRuntimeError(`音频分析不可用：${lastAnalyserError}`)
          } else {
            setRuntimeError(rendererInitMessage)
          }
        }
      }

      const toneMap = resolveEffectiveToneMap()
      const deltaSec = Math.max(0.001, Math.min(0.2, (now - lastFrameAt) * 0.001))
      const exposureStep = TONE_MAP_EXPOSURE_SLEW_PER_SECOND * deltaSec
      const strengthStep = TONE_MAP_STRENGTH_SLEW_PER_SECOND * deltaSec

      if (toneMap.mode !== smoothedToneMapMode) {
        smoothedToneMapMode = toneMap.mode
      }
      smoothedToneMapExposure = stepToward(smoothedToneMapExposure, toneMap.exposure, exposureStep)
      smoothedToneMapStrength = stepToward(smoothedToneMapStrength, toneMap.strength, strengthStep)

      try {
        renderer.render({
          width: renderSize.width,
          height: renderSize.height,
          timeSec: now * 0.001,
          frame,
          frequencyData: audioAnalyser?.frequencyData ?? new Uint8Array(512),
          waveformData: audioAnalyser?.waveformData ?? new Uint8Array(512),
          audioLevel: audioAnalyser?.audioLevel ?? 0,
          audioBeat: audioAnalyser?.audioBeat ?? 0,
          toneMapMode: smoothedToneMapMode,
          toneMapExposure: smoothedToneMapExposure,
          toneMapStrength: smoothedToneMapStrength,
          foregroundOffsetX: Math.max(-1, Math.min(1, runtimeSettingsRef.current.layeredForegroundOffsetX)),
          foregroundOffsetY: Math.max(-1, Math.min(1, runtimeSettingsRef.current.layeredForegroundOffsetY)),
          foregroundScale: Math.max(0.25, Math.min(3, runtimeSettingsRef.current.layeredForegroundScale)),
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (message !== lastRenderError) {
          lastRenderError = message
          setRuntimeError(`可视化渲染异常：${message} | ${runtimeProbeInfo}`)
        }
        animationFrameId = window.requestAnimationFrame(renderLoop)
        return
      }

      if (lastRenderError) {
        lastRenderError = null
        setRuntimeError(rendererInitMessage)
      }

      frame += 1
      statsFrameCount += 1
      latestFrameMs = now - lastFrameAt
      lastFrameAt = now

      const elapsed = now - statsStartAt
      if (elapsed >= STATS_UPDATE_INTERVAL_MS) {
        const fps = (statsFrameCount * 1000) / elapsed
        setStats({
          fps,
          frameMs: latestFrameMs,
          renderWidth: renderSize.width,
          renderHeight: renderSize.height,
          backend: renderer.backend,
          shaderId: renderer.shaderId,
          rendererLabel: renderer.rendererLabel,
        })
        statsStartAt = now
        statsFrameCount = 0
      }

      animationFrameId = window.requestAnimationFrame(renderLoop)
    }

    animationFrameId = window.requestAnimationFrame(renderLoop)

    return () => {
      disposed = true
      window.cancelAnimationFrame(animationFrameId)
      renderer?.dispose()
    }
  }, [
    active,
    audioRef,
    canvasInstanceVersion,
    canvasRef,
    cpuCanvasRef,
    preferredRenderer,
    shader,
  ])

  return {
    stats,
    activeBackend,
    runtimeError,
    resumeAudioAnalyser,
  }
}
