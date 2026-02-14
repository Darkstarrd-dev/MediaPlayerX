import { buildShadertoyFragmentSource } from './shadertoyAdapter'
import type { MusicVisualizerFrameInput, MusicVisualizerRenderer, MusicVisualizerShaderDefinition } from './types'

const AUDIO_TEXTURE_WIDTH = 512
const AUDIO_TEXTURE_HEIGHT = 2

const VERTEX_SHADER_SOURCE = `#version 300 es
precision highp float;

const vec2 FULLSCREEN_TRIANGLE[3] = vec2[3](
  vec2(-1.0, -1.0),
  vec2(3.0, -1.0),
  vec2(-1.0, 3.0)
);

void main() {
  gl_Position = vec4(FULLSCREEN_TRIANGLE[gl_VertexID], 0.0, 1.0);
}
`

function compileShader(gl: WebGL2RenderingContext, shaderType: number, source: string): WebGLShader {
  const shader = gl.createShader(shaderType)
  if (!shader) {
    throw new Error('创建 WebGL Shader 失败')
  }

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    return shader
  }

  const info = gl.getShaderInfoLog(shader) || 'unknown shader error'
  gl.deleteShader(shader)
  const stage = shaderType === gl.VERTEX_SHADER ? 'vertex' : 'fragment'
  throw new Error(`[${stage} compile] ${info}`)
}

function createProgram(gl: WebGL2RenderingContext, fragmentSource: string): WebGLProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE)
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
  const program = gl.createProgram()
  if (!program) {
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)
    throw new Error('创建 WebGL Program 失败')
  }

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)

  if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
    return program
  }

  const info = gl.getProgramInfoLog(program) || 'unknown link error'
  gl.deleteProgram(program)
  throw new Error(`[program link] ${info}`)
}

function resolveRendererLabel(gl: WebGL2RenderingContext): string {
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
  if (debugInfo) {
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    if (typeof renderer === 'string' && renderer.trim().length > 0) {
      return renderer
    }
  }

  const fallback = gl.getParameter(gl.RENDERER)
  if (typeof fallback === 'string' && fallback.trim().length > 0) {
    return fallback
  }

  return 'WebGL2'
}

function listActiveUniformNames(gl: WebGL2RenderingContext, program: WebGLProgram): string[] {
  const activeCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
  const names: string[] = []
  const normalizedCount = typeof activeCount === 'number' ? activeCount : 0
  for (let index = 0; index < normalizedCount; index += 1) {
    const activeUniform = gl.getActiveUniform(program, index)
    if (!activeUniform || !activeUniform.name) {
      continue
    }
    names.push(activeUniform.name)
  }
  return names
}

function resolveToneMapModeCode(mode: MusicVisualizerFrameInput['toneMapMode']): number {
  if (mode === 'reinhard') {
    return 1
  }
  if (mode === 'aces') {
    return 2
  }
  if (mode === 'filmic') {
    return 3
  }
  if (mode === 'agx') {
    return 4
  }
  if (mode === 'khronos') {
    return 5
  }
  return 0
}

export class WebglMusicVisualizerRenderer implements MusicVisualizerRenderer {
  readonly backend = 'gpu' as const
  readonly shaderId: string
  readonly rendererLabel: string

  private readonly canvas: HTMLCanvasElement
  private readonly gl: WebGL2RenderingContext
  private readonly program: WebGLProgram
  private readonly vao: WebGLVertexArrayObject
  private readonly audioTexture: WebGLTexture
  private readonly audioTextureData = new Uint8Array(AUDIO_TEXTURE_WIDTH * AUDIO_TEXTURE_HEIGHT * 4)

  private readonly resolutionUniform: WebGLUniformLocation | null
  private readonly timeUniform: WebGLUniformLocation | null
  private readonly frameUniform: WebGLUniformLocation | null
  private readonly channel0Uniform: WebGLUniformLocation | null
  private readonly audioLevelUniform: WebGLUniformLocation | null
  private readonly audioBeatUniform: WebGLUniformLocation | null
  private readonly toneMapModeUniform: WebGLUniformLocation | null
  private readonly toneMapExposureUniform: WebGLUniformLocation | null
  private readonly toneMapStrengthUniform: WebGLUniformLocation | null

  constructor(canvas: HTMLCanvasElement, shader: MusicVisualizerShaderDefinition) {
    this.canvas = canvas
    this.shaderId = shader.id

    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    })

    if (!gl) {
      throw new Error('当前环境不可用 WebGL2')
    }

    const program = createProgram(gl, buildShadertoyFragmentSource(shader.fragmentSource))
    const vao = gl.createVertexArray()
    if (!vao) {
      gl.deleteProgram(program)
      throw new Error('创建 VAO 失败')
    }

    const audioTexture = gl.createTexture()
    if (!audioTexture) {
      gl.deleteVertexArray(vao)
      gl.deleteProgram(program)
      throw new Error('创建音频纹理失败')
    }

    gl.bindTexture(gl.TEXTURE_2D, audioTexture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, AUDIO_TEXTURE_WIDTH, AUDIO_TEXTURE_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.bindTexture(gl.TEXTURE_2D, null)

    const resolutionUniform = gl.getUniformLocation(program, 'iResolution')
    const timeUniform = gl.getUniformLocation(program, 'iTime')
    const frameUniform = gl.getUniformLocation(program, 'iFrame')
    const channel0Uniform = gl.getUniformLocation(program, 'iChannel0')
    const audioLevelUniform = gl.getUniformLocation(program, 'iAudioLevel')
    const audioBeatUniform = gl.getUniformLocation(program, 'iAudioBeat')
    const toneMapModeUniform = gl.getUniformLocation(program, 'iToneMapMode')
    const toneMapExposureUniform = gl.getUniformLocation(program, 'iToneMapExposure')
    const toneMapStrengthUniform = gl.getUniformLocation(program, 'iToneMapStrength')
    const activeUniformNames = listActiveUniformNames(gl, program)

    this.gl = gl
    this.program = program
    this.vao = vao
    this.audioTexture = audioTexture
    this.resolutionUniform = resolutionUniform
    this.timeUniform = timeUniform
    this.frameUniform = frameUniform
    this.channel0Uniform = channel0Uniform
    this.audioLevelUniform = audioLevelUniform
    this.audioBeatUniform = audioBeatUniform
    this.toneMapModeUniform = toneMapModeUniform
    this.toneMapExposureUniform = toneMapExposureUniform
    this.toneMapStrengthUniform = toneMapStrengthUniform
    this.rendererLabel = `${resolveRendererLabel(gl)} | uniforms=${activeUniformNames.join(',') || 'none'}`
  }

  resize(width: number, height: number): void {
    const nextWidth = Math.max(1, Math.round(width))
    const nextHeight = Math.max(1, Math.round(height))
    if (this.canvas.width !== nextWidth) {
      this.canvas.width = nextWidth
    }
    if (this.canvas.height !== nextHeight) {
      this.canvas.height = nextHeight
    }
    this.gl.viewport(0, 0, nextWidth, nextHeight)
  }

  render({
    width,
    height,
    timeSec,
    frame,
    frequencyData,
    waveformData,
    audioLevel,
    audioBeat,
    toneMapMode,
    toneMapExposure,
    toneMapStrength,
  }: MusicVisualizerFrameInput): void {
    this.uploadAudioTexture(frequencyData, waveformData)

    const gl = this.gl
    gl.useProgram(this.program)
    gl.bindVertexArray(this.vao)

    if (this.channel0Uniform) {
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, this.audioTexture)
      gl.uniform1i(this.channel0Uniform, 0)
    }

    if (this.resolutionUniform) {
      gl.uniform3f(this.resolutionUniform, width, height, 1)
    }
    if (this.timeUniform) {
      gl.uniform1f(this.timeUniform, timeSec)
    }
    if (this.frameUniform) {
      gl.uniform1i(this.frameUniform, frame)
    }
    if (this.audioLevelUniform) {
      gl.uniform1f(this.audioLevelUniform, audioLevel)
    }
    if (this.audioBeatUniform) {
      gl.uniform1f(this.audioBeatUniform, audioBeat)
    }
    if (this.toneMapModeUniform) {
      gl.uniform1i(this.toneMapModeUniform, resolveToneMapModeCode(toneMapMode))
    }
    if (this.toneMapExposureUniform) {
      gl.uniform1f(this.toneMapExposureUniform, toneMapExposure)
    }
    if (this.toneMapStrengthUniform) {
      gl.uniform1f(this.toneMapStrengthUniform, toneMapStrength)
    }

    gl.drawArrays(gl.TRIANGLES, 0, 3)

    gl.bindVertexArray(null)
    if (this.channel0Uniform) {
      gl.bindTexture(gl.TEXTURE_2D, null)
    }
  }

  dispose(): void {
    this.gl.deleteTexture(this.audioTexture)
    this.gl.deleteVertexArray(this.vao)
    this.gl.deleteProgram(this.program)
  }

  private uploadAudioTexture(frequencyData: Uint8Array, waveformData: Uint8Array): void {
    for (let index = 0; index < AUDIO_TEXTURE_WIDTH; index += 1) {
      const frequency = frequencyData[index] ?? 0
      const waveform = waveformData[index] ?? 128

      const topOffset = index * 4
      this.audioTextureData[topOffset] = frequency
      this.audioTextureData[topOffset + 1] = frequency
      this.audioTextureData[topOffset + 2] = frequency
      this.audioTextureData[topOffset + 3] = 255

      const bottomOffset = (AUDIO_TEXTURE_WIDTH + index) * 4
      this.audioTextureData[bottomOffset] = waveform
      this.audioTextureData[bottomOffset + 1] = waveform
      this.audioTextureData[bottomOffset + 2] = waveform
      this.audioTextureData[bottomOffset + 3] = 255
    }

    const gl = this.gl
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.audioTexture)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, AUDIO_TEXTURE_WIDTH, AUDIO_TEXTURE_HEIGHT, gl.RGBA, gl.UNSIGNED_BYTE, this.audioTextureData)
  }
}
