import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useMusicVisualizerRuntime } from './useMusicVisualizerRuntime'

const shared = vi.hoisted(() => {
  const shader = {
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
    webglConstructorCount: 0,
    webglRenderCalls: [] as Array<{
      width: number
      height: number
      toneMapMode: string
      toneMapExposure: number
      toneMapStrength: number
    }>,
  }
})

vi.mock('./shaderRegistry', () => ({
  resolveDefaultMusicVisualizerShader: () => shared.shader,
  resolveMusicVisualizerShaderById: (id: string | null | undefined) => (id === shared.shader.id ? shared.shader : null),
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

    constructor(_canvas: HTMLCanvasElement, shader: { id: string }) {
      this.shaderId = shader.id
      shared.webglConstructorCount += 1
    }

    resize = vi.fn()

    render(input: {
      width: number
      height: number
      toneMapMode: string
      toneMapExposure: number
      toneMapStrength: number
    }) {
      shared.webglRenderCalls.push({
        width: input.width,
        height: input.height,
        toneMapMode: input.toneMapMode,
        toneMapExposure: input.toneMapExposure,
        toneMapStrength: input.toneMapStrength,
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
    shared.webglConstructorCount = 0
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
      },
    })

    flushFrame(20)

    const initialConstructorCount = shared.webglConstructorCount
    expect(initialConstructorCount).toBe(2)
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
})
