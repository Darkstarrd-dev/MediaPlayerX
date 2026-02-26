import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useMusicVisualizerRuntime } from './useMusicVisualizerRuntime'

type MutableTestShader = {
  id: string
  label: string
  fragmentSource: string
  renderScale?: number
  multiPass?: {
    passes: Array<{
      id: string
      fragmentSource: string
      output: 'buffer' | 'screen'
    }>
  }
}

const shared = vi.hoisted(() => {
  const shader: MutableTestShader = {
    id: 'test-shader',
    label: 'Test Shader',
    fragmentSource: `
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  fragColor = vec4(fragCoord.xy * 0.0, 0.0, 1.0);
}
`,
  }

  return {
    shader,
    shaderById: new Map<string, MutableTestShader>(),
    failWebglInit: false,
    webglFailedCanvas: null as HTMLCanvasElement | null,
    webglConstructorCount: 0,
    cpuConstructorCount: 0,
    cpuConstructedCanvases: [] as HTMLCanvasElement[],
    webglConstructedShaders: [] as Array<{
      id: string
      multiPass?: {
        passes: Array<{
          id: string
          output?: 'buffer' | 'screen'
          toneMap?: boolean
        }>
      }
    }>,
    webglRenderCalls: [] as Array<{
      width: number
      height: number
      timeSec: number
      frame: number
      toneMapMode: string
      toneMapExposure: number
      toneMapStrength: number
      foregroundOffsetX: number
      foregroundOffsetY: number
      foregroundScale: number
    }>,
  }
})

vi.mock('./shaderRegistry', () => ({
  resolveDefaultMusicVisualizerShader: () => shared.shader,
  resolveMusicVisualizerShaderById: (id: string | null | undefined) => {
    if (!id) {
      return null
    }
    if (id === shared.shader.id) {
      return shared.shader
    }
    return shared.shaderById.get(id) ?? null
  },
}))

vi.mock('./audioAnalyser', () => {
  class MusicAudioAnalyser {
    readonly frequencyData = new Uint8Array(512)
    readonly waveformData = new Uint8Array(512)
    audioLevel = 0.35
    audioBeat = 0.2
    lastError: string | null = null

    attach = vi.fn()
    sample = vi.fn()
    resume = vi.fn(async () => undefined)
    dispose = vi.fn()

    constructor() {
      this.waveformData.fill(128)
    }
  }

  return {
    MusicAudioAnalyser,
  }
})

vi.mock('./cpuRenderer', () => {
  class CpuMusicVisualizerRenderer {
    readonly backend = 'cpu' as const
    readonly shaderId = 'cpu-fallback'
    readonly rendererLabel = 'mock-cpu'
    resize = vi.fn()
    render = vi.fn()
    dispose = vi.fn()

    constructor(canvas: HTMLCanvasElement) {
      shared.cpuConstructorCount += 1
      shared.cpuConstructedCanvases.push(canvas)
      if (canvas === shared.webglFailedCanvas) {
        throw new Error('当前环境不可用 Canvas2D')
      }
    }
  }

  return {
    CpuMusicVisualizerRenderer,
  }
})

vi.mock('./webglRenderer', () => {
  class WebglMusicVisualizerRenderer {
    readonly backend = 'gpu' as const
    readonly shaderId: string
    readonly rendererLabel = 'mock-webgl'

    constructor(canvas: HTMLCanvasElement, shader: { id: string }) {
      this.shaderId = shader.id
      shared.webglConstructorCount += 1
      if (shared.failWebglInit) {
        shared.webglFailedCanvas = canvas
        throw new Error('mock webgl init failure')
      }
      shared.webglConstructedShaders.push(shader)
    }

    resize = vi.fn()

    render(input: {
      width: number
      height: number
      timeSec: number
      frame: number
      toneMapMode: string
      toneMapExposure: number
      toneMapStrength: number
      foregroundOffsetX: number
      foregroundOffsetY: number
      foregroundScale: number
    }) {
      shared.webglRenderCalls.push({
        width: input.width,
        height: input.height,
        timeSec: input.timeSec,
        frame: input.frame,
        toneMapMode: input.toneMapMode,
        toneMapExposure: input.toneMapExposure,
        toneMapStrength: input.toneMapStrength,
        foregroundOffsetX: input.foregroundOffsetX,
        foregroundOffsetY: input.foregroundOffsetY,
        foregroundScale: input.foregroundScale,
      })
    }

    dispose = vi.fn()
  }

  return {
    WebglMusicVisualizerRenderer,
  }
})

describe('useMusicVisualizerRuntime', () => {
  let rafNow = 0
  let rafId = 0
  let rafCallbacks: Map<number, FrameRequestCallback>

  const flushFrame = (stepMs = 20) => {
    act(() => {
      rafNow += stepMs
      const callbacks = Array.from(rafCallbacks.values())
      rafCallbacks.clear()
      for (const callback of callbacks) {
        callback(rafNow)
      }
    })
  }

  beforeEach(() => {
    shared.shader.id = 'test-shader'
    shared.shader.label = 'Test Shader'
    shared.shader.fragmentSource = `
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  fragColor = vec4(fragCoord.xy * 0.0, 0.0, 1.0);
}
`
    delete shared.shader.multiPass
    delete shared.shader.renderScale

    shared.shaderById.clear()
    shared.shaderById.set(shared.shader.id, shared.shader)

    shared.failWebglInit = false
    shared.webglFailedCanvas = null
    shared.webglConstructorCount = 0
    shared.cpuConstructorCount = 0
    shared.cpuConstructedCanvases.length = 0
    shared.webglConstructedShaders.length = 0
    shared.webglRenderCalls.length = 0

    rafNow = 0
    rafId = 0
    rafCallbacks = new Map<number, FrameRequestCallback>()

    vi.spyOn(performance, 'now').mockImplementation(() => rafNow)
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      rafId += 1
      rafCallbacks.set(rafId, callback)
      return rafId
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number) => {
      rafCallbacks.delete(id)
    })

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      ((contextId: string) => {
        if (contextId === 'webgl2') {
          return {} as WebGL2RenderingContext
        }
        if (contextId === '2d') {
          return {} as CanvasRenderingContext2D
        }
        return null
      }) as typeof HTMLCanvasElement.prototype.getContext,
    )
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('热更新 tone mapping 与渲染参数时不重建 renderer，并使用平滑过渡', () => {
    const container = document.createElement('div')
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true })
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true })
    const canvas = document.createElement('canvas')
    container.appendChild(canvas)
    document.body.appendChild(container)

    const audio = document.createElement('audio')
    const canvasRef = { current: canvas }
    const audioRef = { current: audio }

    const { rerender } = renderHook((props: Parameters<typeof useMusicVisualizerRuntime>[0]) => useMusicVisualizerRuntime(props), {
      initialProps: {
        canvasRef,
        audioRef,
        active: true,
        preferredRenderer: 'gpu',
        renderLongEdgePx: 1200,
        fpsCap: 60,
        toneMapMode: 'aces',
        toneMapExposure: 0.5,
        toneMapStrength: 0,
        selectedShaderId: 'test-shader',
        renderScaleCoeff: 1,
      },
    })

    flushFrame(20)

    const initialConstructorCount = shared.webglConstructorCount
    expect(initialConstructorCount).toBe(1)
    expect(shared.webglRenderCalls.length).toBeGreaterThan(0)

    const firstFrame = shared.webglRenderCalls.at(-1)
    expect(firstFrame).toBeDefined()
    expect(firstFrame?.width).toBe(1200)
    expect(firstFrame?.height).toBe(900)
    expect(firstFrame?.toneMapMode).toBe('aces')
    expect(firstFrame?.toneMapExposure).toBe(0.5)
    expect(firstFrame?.toneMapStrength).toBe(0)

    rerender({
      canvasRef,
      audioRef,
      active: true,
      preferredRenderer: 'gpu',
      renderLongEdgePx: 2400,
      fpsCap: 120,
      toneMapMode: 'khronos',
      toneMapExposure: 2,
      toneMapStrength: 1,
      selectedShaderId: 'test-shader',
      renderScaleCoeff: 1,
    })

    flushFrame(20)

    const nextFrame = shared.webglRenderCalls.at(-1)
    expect(nextFrame).toBeDefined()
    expect(shared.webglConstructorCount).toBe(initialConstructorCount)
    expect(nextFrame?.width).toBe(2400)
    expect(nextFrame?.height).toBe(1800)
    expect(nextFrame?.toneMapMode).toBe('khronos')
    expect(nextFrame?.toneMapExposure).toBeGreaterThan(0.5)
    expect(nextFrame?.toneMapExposure).toBeLessThan(2)
    expect(nextFrame?.toneMapStrength).toBeGreaterThan(0)
    expect(nextFrame?.toneMapStrength).toBeLessThan(1)
  })

  it('热更新前景参数与渲染倍率时不重建 renderer', () => {
    const container = document.createElement('div')
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true })
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true })
    const canvas = document.createElement('canvas')
    container.appendChild(canvas)
    document.body.appendChild(container)

    const audio = document.createElement('audio')
    const canvasRef = { current: canvas }
    const audioRef = { current: audio }

    const { rerender } = renderHook((props: Parameters<typeof useMusicVisualizerRuntime>[0]) => useMusicVisualizerRuntime(props), {
      initialProps: {
        canvasRef,
        audioRef,
        active: true,
        preferredRenderer: 'gpu',
        renderLongEdgePx: 800,
        renderScaleCoeff: 1,
        fpsCap: 60,
        toneMapMode: 'aces',
        toneMapExposure: 1,
        toneMapStrength: 0.5,
        layeredForegroundOffsetX: 0,
        layeredForegroundOffsetY: 0,
        layeredForegroundScale: 1,
        selectedShaderId: 'test-shader',
      },
    })

    flushFrame(20)
    const initialConstructorCount = shared.webglConstructorCount
    const initialFrame = shared.webglRenderCalls.at(-1)
    expect(initialFrame?.width).toBe(800)
    expect(initialFrame?.height).toBe(600)
    expect(initialFrame?.foregroundOffsetX).toBeCloseTo(0, 5)
    expect(initialFrame?.foregroundOffsetY).toBeCloseTo(0, 5)
    expect(initialFrame?.foregroundScale).toBeCloseTo(1, 5)

    rerender({
      canvasRef,
      audioRef,
      active: true,
      preferredRenderer: 'gpu',
      renderLongEdgePx: 800,
      renderScaleCoeff: 2,
      fpsCap: 60,
      toneMapMode: 'aces',
      toneMapExposure: 1,
      toneMapStrength: 0.5,
      layeredForegroundOffsetX: 0.3,
      layeredForegroundOffsetY: -0.2,
      layeredForegroundScale: 1.4,
      selectedShaderId: 'test-shader',
    })

    flushFrame(20)
    const nextFrame = shared.webglRenderCalls.at(-1)
    expect(shared.webglConstructorCount).toBe(initialConstructorCount)
    expect(nextFrame?.width).toBe(1600)
    expect(nextFrame?.height).toBe(1200)
    expect(nextFrame?.foregroundOffsetX).toBeCloseTo(0.3, 5)
    expect(nextFrame?.foregroundOffsetY).toBeCloseTo(-0.2, 5)
    expect(nextFrame?.foregroundScale).toBeCloseTo(1.4, 5)
  })

  it('暂停时冻结 shader 帧，停止时复位到初始帧', () => {
    const container = document.createElement('div')
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true })
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true })
    const canvas = document.createElement('canvas')
    container.appendChild(canvas)
    document.body.appendChild(container)

    const audio = document.createElement('audio')
    const canvasRef = { current: canvas }
    const audioRef = { current: audio }

    const { rerender } = renderHook((props: Parameters<typeof useMusicVisualizerRuntime>[0]) => useMusicVisualizerRuntime(props), {
      initialProps: {
        canvasRef,
        audioRef,
        active: true,
        playbackPaused: false,
        playbackResetNonce: 0,
        preferredRenderer: 'gpu',
        renderLongEdgePx: 800,
        renderScaleCoeff: 1,
        fpsCap: 60,
        toneMapMode: 'aces',
        toneMapExposure: 1,
        toneMapStrength: 0.5,
        selectedShaderId: 'test-shader',
      },
    })

    flushFrame(20)
    flushFrame(20)
    const latestPlayingFrame = shared.webglRenderCalls.at(-1)
    expect(latestPlayingFrame).toBeDefined()

    rerender({
      canvasRef,
      audioRef,
      active: true,
      playbackPaused: true,
      playbackResetNonce: 0,
      preferredRenderer: 'gpu',
      renderLongEdgePx: 800,
      renderScaleCoeff: 1,
      fpsCap: 60,
      toneMapMode: 'aces',
      toneMapExposure: 1,
      toneMapStrength: 0.5,
      selectedShaderId: 'test-shader',
    })

    flushFrame(20)
    const pausedFrame = shared.webglRenderCalls.at(-1)
    expect(pausedFrame?.timeSec).toBe(latestPlayingFrame?.timeSec)
    expect(pausedFrame?.frame).toBe(latestPlayingFrame?.frame)

    rerender({
      canvasRef,
      audioRef,
      active: true,
      playbackPaused: true,
      playbackResetNonce: 1,
      preferredRenderer: 'gpu',
      renderLongEdgePx: 800,
      renderScaleCoeff: 1,
      fpsCap: 60,
      toneMapMode: 'aces',
      toneMapExposure: 1,
      toneMapStrength: 0.5,
      selectedShaderId: 'test-shader',
    })

    flushFrame(20)
    const stoppedFrame = shared.webglRenderCalls.at(-1)
    expect(stoppedFrame?.timeSec).toBe(0)
    expect(stoppedFrame?.frame).toBe(0)
  })

  it('GPU 初始化失败时可使用独立 CPU 画布回退', () => {
    shared.failWebglInit = true

    const container = document.createElement('div')
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true })
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true })
    const gpuCanvas = document.createElement('canvas')
    const cpuCanvas = document.createElement('canvas')
    container.appendChild(gpuCanvas)
    container.appendChild(cpuCanvas)
    document.body.appendChild(container)

    const audio = document.createElement('audio')
    const gpuCanvasRef = { current: gpuCanvas }
    const cpuCanvasRef = { current: cpuCanvas }
    const audioRef = { current: audio }

    const { result } = renderHook((props: Parameters<typeof useMusicVisualizerRuntime>[0]) => useMusicVisualizerRuntime(props), {
      initialProps: {
        canvasRef: gpuCanvasRef,
        cpuCanvasRef,
        audioRef,
        active: true,
        preferredRenderer: 'gpu',
        renderLongEdgePx: 800,
        renderScaleCoeff: 1,
        fpsCap: 60,
        toneMapMode: 'aces',
        toneMapExposure: 1,
        toneMapStrength: 0.5,
        selectedShaderId: 'test-shader',
      },
    })

    flushFrame(20)

    expect(shared.webglConstructorCount).toBe(1)
    expect(shared.cpuConstructorCount).toBe(1)
    expect(shared.cpuConstructedCanvases.at(-1)).toBe(cpuCanvas)
    expect(result.current.activeBackend).toBe('cpu')
    expect(result.current.runtimeError?.includes('已自动切换 CPU')).toBe(true)
  })

  it('rain-drips 的前景背景倍率会抬升最终输出分辨率', () => {
    shared.shader.id = 'rain-drips'
    shared.shader.label = 'Rain Drips'
    shared.shader.multiPass = {
      passes: [
        { id: 'buffer-a', fragmentSource: shared.shader.fragmentSource, output: 'buffer' },
        { id: 'buffer-b', fragmentSource: shared.shader.fragmentSource, output: 'buffer' },
        { id: 'foreground-audio', fragmentSource: shared.shader.fragmentSource, output: 'buffer' },
        { id: 'image', fragmentSource: shared.shader.fragmentSource, output: 'screen' },
      ],
    }

    const container = document.createElement('div')
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true })
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true })
    const canvas = document.createElement('canvas')
    container.appendChild(canvas)
    document.body.appendChild(container)

    const audio = document.createElement('audio')
    const canvasRef = { current: canvas }
    const audioRef = { current: audio }

    const { rerender } = renderHook((props: Parameters<typeof useMusicVisualizerRuntime>[0]) => useMusicVisualizerRuntime(props), {
      initialProps: {
        canvasRef,
        audioRef,
        active: true,
        preferredRenderer: 'gpu',
        renderLongEdgePx: 400,
        renderScaleCoeff: 1,
        fpsCap: 60,
        toneMapMode: 'aces',
        toneMapExposure: 1,
        toneMapStrength: 0.5,
        selectedShaderId: 'rain-drips',
      },
    })

    flushFrame(20)
    const baseFrame = shared.webglRenderCalls.at(-1)
    expect(baseFrame?.width).toBe(400)
    expect(baseFrame?.height).toBe(300)

    rerender({
      canvasRef,
      audioRef,
      active: true,
      preferredRenderer: 'gpu',
      renderLongEdgePx: 400,
      renderScaleCoeff: 5,
      fpsCap: 60,
      toneMapMode: 'aces',
      toneMapExposure: 1,
      toneMapStrength: 0.5,
      selectedShaderId: 'rain-drips',
    })

    flushFrame(20)
    const scaledFrame = shared.webglRenderCalls.at(-1)
    expect(scaledFrame?.width).toBe(2000)
    expect(scaledFrame?.height).toBe(1500)
  })

  it('galaxy、starfield、escape、tissue 的前景背景倍率会抬升最终输出分辨率', () => {
    const scenarios = [
      {
        shaderId: 'galaxy',
        label: 'Galaxy',
        backgroundPassId: 'galaxy-background',
        foregroundPassId: 'galaxy-foreground',
        screenPassId: 'galaxy-image',
      },
      {
        shaderId: 'starfield',
        label: 'Starfield',
        backgroundPassId: 'starfield-background',
        foregroundPassId: 'starfield-foreground',
        screenPassId: 'starfield-image',
      },
      {
        shaderId: 'escape',
        label: 'Escape',
        backgroundPassId: 'escape-background',
        foregroundPassId: 'escape-foreground',
        screenPassId: 'escape-image',
      },
      {
        shaderId: 'tissue',
        label: 'Tissue',
        backgroundPassId: 'tissue-background',
        foregroundPassId: 'tissue-foreground',
        screenPassId: 'tissue-image',
      },
    ]

    for (const scenario of scenarios) {
      shared.shader.id = scenario.shaderId
      shared.shader.label = scenario.label
      shared.shader.multiPass = {
        passes: [
          { id: scenario.backgroundPassId, fragmentSource: shared.shader.fragmentSource, output: 'buffer' },
          { id: scenario.foregroundPassId, fragmentSource: shared.shader.fragmentSource, output: 'buffer' },
          { id: scenario.screenPassId, fragmentSource: shared.shader.fragmentSource, output: 'screen' },
        ],
      }

      const container = document.createElement('div')
      Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true })
      Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true })
      const canvas = document.createElement('canvas')
      container.appendChild(canvas)
      document.body.appendChild(container)

      const audio = document.createElement('audio')
      const canvasRef = { current: canvas }
      const audioRef = { current: audio }

      const { rerender, unmount } = renderHook((props: Parameters<typeof useMusicVisualizerRuntime>[0]) => useMusicVisualizerRuntime(props), {
        initialProps: {
          canvasRef,
          audioRef,
          active: true,
          preferredRenderer: 'gpu',
          renderLongEdgePx: 400,
          renderScaleCoeff: 1,
          fpsCap: 60,
          toneMapMode: 'aces',
          toneMapExposure: 1,
          toneMapStrength: 0.5,
          selectedShaderId: scenario.shaderId,
        },
      })

      flushFrame(20)
      const baseFrame = shared.webglRenderCalls.at(-1)
      expect(baseFrame?.width).toBe(400)
      expect(baseFrame?.height).toBe(300)

      rerender({
        canvasRef,
        audioRef,
        active: true,
        preferredRenderer: 'gpu',
        renderLongEdgePx: 400,
        renderScaleCoeff: 5,
        fpsCap: 60,
        toneMapMode: 'aces',
        toneMapExposure: 1,
        toneMapStrength: 0.5,
        selectedShaderId: scenario.shaderId,
      })

      flushFrame(20)
      const scaledFrame = shared.webglRenderCalls.at(-1)
      expect(scaledFrame?.width).toBe(2000)
      expect(scaledFrame?.height).toBe(1500)

      unmount()
    }
  })

  it('layered 模式仅在最终合成 pass 启用 tone mapping，并传递前景变换参数', () => {
    const backgroundShader: MutableTestShader = {
      id: 'bg-shader',
      label: 'Background Shader',
      fragmentSource: shared.shader.fragmentSource,
      multiPass: {
        passes: [
          { id: 'bg-buffer', fragmentSource: shared.shader.fragmentSource, output: 'buffer' },
          { id: 'bg-image', fragmentSource: shared.shader.fragmentSource, output: 'screen' },
        ],
      },
    }

    const foregroundShader: MutableTestShader = {
      id: 'fg-shader',
      label: 'Foreground Shader',
      fragmentSource: shared.shader.fragmentSource,
    }

    shared.shaderById.set(backgroundShader.id, backgroundShader)
    shared.shaderById.set(foregroundShader.id, foregroundShader)

    const container = document.createElement('div')
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true })
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true })
    const canvas = document.createElement('canvas')
    container.appendChild(canvas)
    document.body.appendChild(container)

    const audio = document.createElement('audio')
    const canvasRef = { current: canvas }
    const audioRef = { current: audio }

    renderHook((props: Parameters<typeof useMusicVisualizerRuntime>[0]) => useMusicVisualizerRuntime(props), {
      initialProps: {
        canvasRef,
        audioRef,
        active: true,
        preferredRenderer: 'gpu',
        renderLongEdgePx: 800,
        renderScaleCoeff: 1,
        layeredBackgroundShaderId: backgroundShader.id,
        layeredForegroundShaderId: foregroundShader.id,
        layeredBackgroundEnabled: true,
        layeredForegroundEnabled: true,
        layeredBackgroundRenderScaleCoeff: 1.5,
        layeredForegroundRenderScaleCoeff: 1.2,
        layeredForegroundOffsetX: 0.2,
        layeredForegroundOffsetY: -0.15,
        layeredForegroundScale: 1.3,
        fpsCap: 60,
        toneMapMode: 'aces',
        toneMapExposure: 1,
        toneMapStrength: 0.5,
        selectedShaderId: 'test-shader',
      },
    })

    flushFrame(20)

    const constructedShader = shared.webglConstructedShaders.at(-1)
    expect(constructedShader?.id.startsWith('layered:')).toBe(true)

    const passes = constructedShader?.multiPass?.passes ?? []
    expect(passes.length).toBeGreaterThan(0)

    const toneMappedPasses = passes.filter((pass) => pass.toneMap === true)
    expect(toneMappedPasses).toHaveLength(1)
    expect(toneMappedPasses[0]?.id).toBe('compose-screen')

    const nonFinalToneMappedPasses = passes.filter((pass) => pass.id !== 'compose-screen' && pass.toneMap === true)
    expect(nonFinalToneMappedPasses).toHaveLength(0)

    const renderedFrame = shared.webglRenderCalls.at(-1)
    expect(renderedFrame?.foregroundOffsetX).toBeCloseTo(0.2, 5)
    expect(renderedFrame?.foregroundOffsetY).toBeCloseTo(-0.15, 5)
    expect(renderedFrame?.foregroundScale).toBeCloseTo(1.3, 5)
  })

  it('前景/背景仅开启一层时直接使用该层 shader，两层关闭时回退透明 shader', () => {
    const backgroundShader: MutableTestShader = {
      id: 'bg-only',
      label: 'Background Only',
      fragmentSource: shared.shader.fragmentSource,
    }
    const foregroundShader: MutableTestShader = {
      id: 'fg-only',
      label: 'Foreground Only',
      fragmentSource: shared.shader.fragmentSource,
    }
    shared.shaderById.set(backgroundShader.id, backgroundShader)
    shared.shaderById.set(foregroundShader.id, foregroundShader)

    const container = document.createElement('div')
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true })
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true })
    const canvas = document.createElement('canvas')
    container.appendChild(canvas)
    document.body.appendChild(container)

    const audio = document.createElement('audio')
    const canvasRef = { current: canvas }
    const audioRef = { current: audio }

    const { rerender } = renderHook((props: Parameters<typeof useMusicVisualizerRuntime>[0]) => useMusicVisualizerRuntime(props), {
      initialProps: {
        canvasRef,
        audioRef,
        active: true,
        preferredRenderer: 'gpu',
        renderLongEdgePx: 800,
        fpsCap: 60,
        toneMapMode: 'aces',
        toneMapExposure: 1,
        toneMapStrength: 0.5,
        selectedShaderId: 'test-shader',
        layeredBackgroundShaderId: backgroundShader.id,
        layeredForegroundShaderId: foregroundShader.id,
        layeredBackgroundEnabled: true,
        layeredForegroundEnabled: false,
      },
    })

    flushFrame(20)
    expect(shared.webglConstructedShaders.at(-1)?.id).toBe(backgroundShader.id)

    rerender({
      canvasRef,
      audioRef,
      active: true,
      preferredRenderer: 'gpu',
      renderLongEdgePx: 800,
      fpsCap: 60,
      toneMapMode: 'aces',
      toneMapExposure: 1,
      toneMapStrength: 0.5,
      selectedShaderId: 'test-shader',
      layeredBackgroundShaderId: backgroundShader.id,
      layeredForegroundShaderId: foregroundShader.id,
      layeredBackgroundEnabled: false,
      layeredForegroundEnabled: true,
    })

    flushFrame(20)
    expect(shared.webglConstructedShaders.at(-1)?.id).toBe(foregroundShader.id)

    rerender({
      canvasRef,
      audioRef,
      active: true,
      preferredRenderer: 'gpu',
      renderLongEdgePx: 800,
      fpsCap: 60,
      toneMapMode: 'aces',
      toneMapExposure: 1,
      toneMapStrength: 0.5,
      selectedShaderId: 'test-shader',
      layeredBackgroundShaderId: backgroundShader.id,
      layeredForegroundShaderId: foregroundShader.id,
      layeredBackgroundEnabled: false,
      layeredForegroundEnabled: false,
    })

    flushFrame(20)
    expect(shared.webglConstructedShaders.at(-1)?.id).toBe('transparent-disabled')
  })
})
