import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'

import { MusicAudioAnalyser } from './audioAnalyser'
import { CpuMusicVisualizerRenderer } from './cpuRenderer'
import { resolveDefaultMusicVisualizerShader, resolveMusicVisualizerShaderById } from './shaderRegistry'
import type { MusicVisualizerRenderer, MusicVisualizerRendererMode, MusicVisualizerStats } from './types'
import { WebglMusicVisualizerRenderer } from './webglRenderer'

const MIN_RENDER_LONG_EDGE = 240
const MAX_RENDER_LONG_EDGE = 4096
const STATS_UPDATE_INTERVAL_MS = 240
const MIN_SHADER_RENDER_SCALE = 0.25
const MAX_SHADER_RENDER_SCALE = 1

interface UseMusicVisualizerRuntimeParams {
  canvasRef: RefObject<HTMLCanvasElement | null>
  audioRef: RefObject<HTMLAudioElement | null>
  active: boolean
  preferredRenderer: MusicVisualizerRendererMode
  renderLongEdgePx: number
  fpsCap: 30 | 60 | 120
  selectedShaderId: string | null
}

interface UseMusicVisualizerRuntimeResult {
  stats: MusicVisualizerStats | null
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

export function useMusicVisualizerRuntime({
  canvasRef,
  audioRef,
  active,
  preferredRenderer,
  renderLongEdgePx,
  fpsCap,
  selectedShaderId,
}: UseMusicVisualizerRuntimeParams): UseMusicVisualizerRuntimeResult {
  const [stats, setStats] = useState<MusicVisualizerStats | null>(null)
  const [runtimeError, setRuntimeError] = useState<string | null>(null)

  const shader = useMemo(() => {
    const matched = resolveMusicVisualizerShaderById(selectedShaderId)
    if (matched) {
      return matched
    }
    return resolveDefaultMusicVisualizerShader()
  }, [selectedShaderId])
  const audioAnalyserRef = useRef<MusicAudioAnalyser | null>(null)

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
      setRuntimeError(null)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) {
      setStats(null)
      setRuntimeError('可视化画布未就绪（canvasRef.current 为空）')
      return
    }

    if (!shader) {
      setStats(null)
      setRuntimeError('未找到可用 Shader')
      return
    }

    const shaderRenderScale = Math.max(MIN_SHADER_RENDER_SCALE, Math.min(MAX_SHADER_RENDER_SCALE, shader.renderScale ?? 1))
    const minFrameIntervalMs = 1000 / fpsCap

    const createRenderer = (mode: MusicVisualizerRendererMode): MusicVisualizerRenderer => {
      if (mode === 'gpu') {
        const probeCanvas = document.createElement('canvas')
        const probeRenderer = new WebglMusicVisualizerRenderer(probeCanvas, shader)
        probeRenderer.dispose()
        return new WebglMusicVisualizerRenderer(canvas, shader)
      }
      return new CpuMusicVisualizerRenderer(canvas)
    }

    const resolveRuntimeProbeInfo = (): string => {
      const probeWebglCanvas = document.createElement('canvas')
      const probe2dCanvas = document.createElement('canvas')
      const hasWebgl2 = Boolean(probeWebglCanvas.getContext('webgl2'))
      const hasCanvas2d = Boolean(probe2dCanvas.getContext('2d'))
      return `shader=${shader.id}, scale=${shaderRenderScale.toFixed(2)}, fpsCap=${fpsCap}, dpr=${window.devicePixelRatio.toFixed(2)}, webgl2=${hasWebgl2 ? 'yes' : 'no'}, canvas2d=${hasCanvas2d ? 'yes' : 'no'}`
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

    if (!renderer) {
      setStats(null)
      return
    }

    const audioAnalyser = audioAnalyserRef.current
    let disposed = false
    let animationFrameId = 0
    let frame = 0
    let lastFrameAt = performance.now()
    let statsStartAt = lastFrameAt
    let statsFrameCount = 0
    let latestFrameMs = 0
    let lastAnalyserError: string | null = null
    let lastRenderAt = -Infinity

    const renderLoop = (now: number) => {
      if (disposed) {
        return
      }

      if (now - lastRenderAt < minFrameIntervalMs) {
        animationFrameId = window.requestAnimationFrame(renderLoop)
        return
      }
      lastRenderAt = now

      const containerSize = resolveContainerSize(canvas)
      const containerWidth = containerSize.width
      const containerHeight = containerSize.height
      const renderSize = resolveRenderSize(containerWidth, containerHeight, renderLongEdgePx * shaderRenderScale)

      canvas.style.width = '100%'
      canvas.style.height = '100%'
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

      renderer.render({
        width: renderSize.width,
        height: renderSize.height,
        timeSec: now * 0.001,
        frame,
        frequencyData: audioAnalyser?.frequencyData ?? new Uint8Array(512),
        waveformData: audioAnalyser?.waveformData ?? new Uint8Array(512),
      })

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
  }, [active, audioRef, canvasRef, fpsCap, preferredRenderer, renderLongEdgePx, shader])

  return {
    stats,
    runtimeError,
    resumeAudioAnalyser,
  }
}
