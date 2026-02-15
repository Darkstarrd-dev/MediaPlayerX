import { buildShadertoyFragmentSource } from './shadertoyAdapter'
import type {
  MusicVisualizerFrameInput,
  MusicVisualizerRenderer,
  MusicVisualizerShaderChannelSource,
  MusicVisualizerShaderDefinition,
  MusicVisualizerShaderPassDefinition,
  MusicVisualizerShaderTextureDefinition,
} from './types'

const AUDIO_TEXTURE_WIDTH = 512
const AUDIO_TEXTURE_HEIGHT = 2
const MAX_CHANNEL_COUNT = 4

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

type PassOutputMode = 'buffer' | 'screen'

interface ChannelTextureBinding {
  texture: WebGLTexture
  width: number
  height: number
}

interface PassUniformLocations {
  resolution: WebGLUniformLocation | null
  time: WebGLUniformLocation | null
  frame: WebGLUniformLocation | null
  date: WebGLUniformLocation | null
  channels: [WebGLUniformLocation | null, WebGLUniformLocation | null, WebGLUniformLocation | null, WebGLUniformLocation | null]
  channelResolution: WebGLUniformLocation | null
  audioLevel: WebGLUniformLocation | null
  audioBeat: WebGLUniformLocation | null
  toneMapMode: WebGLUniformLocation | null
  toneMapExposure: WebGLUniformLocation | null
  toneMapStrength: WebGLUniformLocation | null
  foregroundOffset: WebGLUniformLocation | null
  foregroundScale: WebGLUniformLocation | null
}

interface PassRenderTarget {
  textures: [WebGLTexture, WebGLTexture]
  framebuffers: [WebGLFramebuffer, WebGLFramebuffer]
  width: number
  height: number
  readIndex: 0 | 1
}

interface NormalizedPassDescriptor {
  id: string
  fragmentSource: string
  channels: [MusicVisualizerShaderChannelSource | null, MusicVisualizerShaderChannelSource | null, MusicVisualizerShaderChannelSource | null, MusicVisualizerShaderChannelSource | null]
  output: PassOutputMode
  renderScale: number
  toneMap: boolean
}

interface NormalizedShaderPipeline {
  commonSource?: string
  textures: readonly MusicVisualizerShaderTextureDefinition[]
  passes: NormalizedPassDescriptor[]
}

interface PassRuntime {
  descriptor: NormalizedPassDescriptor
  program: WebGLProgram
  uniforms: PassUniformLocations
  activeUniformNames: string[]
  target: PassRenderTarget | null
}

interface PassUniformInput {
  width: number
  height: number
  timeSec: number
  frame: number
  audioLevel: number
  audioBeat: number
  toneMapModeCode: number
  toneMapExposure: number
  toneMapStrength: number
  foregroundOffsetX: number
  foregroundOffsetY: number
  foregroundScale: number
}

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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function smooth01(value: number): number {
  const t = clamp(value, 0, 1)
  return t * t * (3 - 2 * t)
}

function hashCoord(x: number, y: number, seed: number): number {
  let hash = Math.imul(x, 374_761_393) ^ Math.imul(y, 668_265_263) ^ Math.imul(seed, 1_442_695_041)
  hash = (hash ^ (hash >>> 13)) >>> 0
  hash = Math.imul(hash, 1_274_126_177) >>> 0
  return ((hash ^ (hash >>> 16)) >>> 0) / 4_294_967_295
}

function valueNoise(x: number, y: number, frequency: number, seed: number): number {
  const fx = x * frequency
  const fy = y * frequency
  const ix = Math.floor(fx)
  const iy = Math.floor(fy)
  const tx = smooth01(fx - ix)
  const ty = smooth01(fy - iy)

  const a = hashCoord(ix, iy, seed)
  const b = hashCoord(ix + 1, iy, seed)
  const c = hashCoord(ix, iy + 1, seed)
  const d = hashCoord(ix + 1, iy + 1, seed)

  return lerp(lerp(a, b, tx), lerp(c, d, tx), ty)
}

function buildTexturePixels(definition: MusicVisualizerShaderTextureDefinition): Uint8Array {
  const { width, height, seed = 1 } = definition
  const pixels = new Uint8Array(width * height * 4)

  for (let y = 0; y < height; y += 1) {
    const v = height <= 1 ? 0 : y / (height - 1)
    for (let x = 0; x < width; x += 1) {
      const u = width <= 1 ? 0 : x / (width - 1)
      const offset = (y * width + x) * 4

      if (definition.preset === 'noise-rg') {
        const a = hashCoord(x, y, seed) * Math.PI * 2
        const n = hashCoord(x, y, seed + 17)
        const rx = Math.cos(a) * 0.5 * n + 0.5
        const ry = Math.sin(a) * 0.5 * n + 0.5
        pixels[offset] = Math.round(clamp(rx, 0, 1) * 255)
        pixels[offset + 1] = Math.round(clamp(ry, 0, 1) * 255)
        pixels[offset + 2] = Math.round(hashCoord(x, y, seed + 29) * 255)
        pixels[offset + 3] = 255
        continue
      }

      if (definition.preset === 'noise-rgb') {
        const n0 = valueNoise(u, v, 9, seed)
        const n1 = valueNoise(u, v, 21, seed + 11)
        const n2 = valueNoise(u, v, 47, seed + 23)
        const mixed = n0 * 0.58 + n1 * 0.30 + n2 * 0.12
        const tint = valueNoise(u + 0.17, v + 0.31, 13, seed + 41)
        const r = clamp(mixed * (0.92 + tint * 0.20), 0, 1)
        const g = clamp(mixed * (0.96 + tint * 0.18), 0, 1)
        const b = clamp(mixed * (1.02 + tint * 0.14), 0, 1)
        pixels[offset] = Math.round(r * 255)
        pixels[offset + 1] = Math.round(g * 255)
        pixels[offset + 2] = Math.round(b * 255)
        pixels[offset + 3] = 255
        continue
      }

      if (definition.preset === 'noise-rgb-seamless') {
        const tau = Math.PI * 2
        const ax = u * tau
        const ay = v * tau

        const n0 = Math.sin(ax * 3 + ay * 2 + seed * 0.13) * 0.5 + 0.5
        const n1 = Math.sin(ax * 7 - ay * 5 + seed * 0.27) * 0.5 + 0.5
        const n2 = Math.cos(ax * 11 + ay * 9 + seed * 0.19) * 0.5 + 0.5

        const mixed = n0 * 0.46 + n1 * 0.34 + n2 * 0.20
        const tint = Math.sin(ax * 5 + ay * 4 + seed * 0.07) * 0.5 + 0.5

        const r = clamp(mixed * (0.90 + tint * 0.22), 0, 1)
        const g = clamp(mixed * (0.95 + tint * 0.18), 0, 1)
        const b = clamp(mixed * (1.02 + tint * 0.14), 0, 1)

        pixels[offset] = Math.round(r * 255)
        pixels[offset + 1] = Math.round(g * 255)
        pixels[offset + 2] = Math.round(b * 255)
        pixels[offset + 3] = 255
        continue
      }

      const glowA = Math.exp(-((u - 0.65) * (u - 0.65) * 19 + (v - 0.38) * (v - 0.38) * 8.5))
      const glowB = Math.exp(-((u - 0.28) * (u - 0.28) * 22 + (v - 0.74) * (v - 0.74) * 9.2))
      const glowC = Math.exp(-((u - 0.52) * (u - 0.52) * 30 + (v - 0.18) * (v - 0.18) * 13.0))

      const fog = valueNoise(u, v + 0.2, 4.6, seed + 5)
      const film = valueNoise(u + 0.4, v + 0.7, 85, seed + 53)

      const lane = Math.floor(u * 88)
      const laneMask = smooth01((hashCoord(lane, 0, seed + 71) - 0.62) * 3.2)
      const laneDetail = valueNoise(u * 0.9 + lane * 0.01, v, 12, seed + 97)
      const condensation = laneMask * laneDetail

      const base = 0.015 + (1 - v) * 0.010
      let r = base + glowA * 0.54 + glowB * 0.34 + glowC * 0.20 + fog * 0.04
      let g = base * 1.36 + glowA * 0.48 + glowB * 0.30 + glowC * 0.25 + fog * 0.11
      let b = base * 0.58 + glowA * 0.10 + glowB * 0.07 + glowC * 0.08 + fog * 0.02

      r += condensation * 0.11
      g += condensation * 0.14
      b += condensation * 0.06

      const crackMask = smooth01((film - 0.76) * 5.2) * (1 - smooth01((film - 0.95) * 10.0))
      r += crackMask * 0.10
      g += crackMask * 0.11
      b += crackMask * 0.04

      const grain = hashCoord(x, y, seed + 101) - 0.5
      r += grain * 0.03
      g += grain * 0.03
      b += grain * 0.02

      pixels[offset] = Math.round(clamp(r, 0, 1) * 255)
      pixels[offset + 1] = Math.round(clamp(g, 0, 1) * 255)
      pixels[offset + 2] = Math.round(clamp(b, 0, 1) * 255)
      pixels[offset + 3] = 255
    }
  }

  return pixels
}

function resolveTextureFilter(gl: WebGL2RenderingContext, filter: MusicVisualizerShaderTextureDefinition['filter'] | undefined): number {
  return filter === 'nearest' ? gl.NEAREST : gl.LINEAR
}

function resolveTextureWrap(gl: WebGL2RenderingContext, wrap: MusicVisualizerShaderTextureDefinition['wrap'] | undefined): number {
  return wrap === 'clamp' ? gl.CLAMP_TO_EDGE : gl.REPEAT
}

function uploadTexturePixels(
  gl: WebGL2RenderingContext,
  texture: WebGLTexture,
  width: number,
  height: number,
  pixels: ArrayBufferView | null,
  filter: number,
  wrap: number,
): void {
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap)
  gl.bindTexture(gl.TEXTURE_2D, null)
}

function createTextureBinding(
  gl: WebGL2RenderingContext,
  definition: MusicVisualizerShaderTextureDefinition,
  shouldApplyAsyncUpload: () => boolean,
): ChannelTextureBinding {
  const texture = gl.createTexture()
  if (!texture) {
    throw new Error(`创建纹理失败：${definition.id}`)
  }

  const filter = resolveTextureFilter(gl, definition.filter)
  const wrap = resolveTextureWrap(gl, definition.wrap)
  const pixels = buildTexturePixels(definition)
  uploadTexturePixels(gl, texture, definition.width, definition.height, pixels, filter, wrap)

  const binding: ChannelTextureBinding = {
    texture,
    width: definition.width,
    height: definition.height,
  }

  if (definition.sourceUrl && typeof Image !== 'undefined') {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => {
      if (!shouldApplyAsyncUpload()) {
        return
      }

      const nextWidth = Math.max(1, image.naturalWidth || image.width || binding.width)
      const nextHeight = Math.max(1, image.naturalHeight || image.height || binding.height)
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap)
      gl.bindTexture(gl.TEXTURE_2D, null)
      binding.width = nextWidth
      binding.height = nextHeight
    }
    image.onerror = () => {
      if (!shouldApplyAsyncUpload()) {
        return
      }
      console.warn(`纹理加载失败，回退程序化纹理: ${definition.id}`)
    }
    image.src = definition.sourceUrl
  }

  return binding
}

function createRenderTexture(gl: WebGL2RenderingContext, width: number, height: number): WebGLTexture {
  const texture = gl.createTexture()
  if (!texture) {
    throw new Error('创建渲染纹理失败')
  }
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.bindTexture(gl.TEXTURE_2D, null)
  return texture
}

function createFramebufferForTexture(gl: WebGL2RenderingContext, texture: WebGLTexture): WebGLFramebuffer {
  const framebuffer = gl.createFramebuffer()
  if (!framebuffer) {
    throw new Error('创建帧缓冲失败')
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    gl.deleteFramebuffer(framebuffer)
    throw new Error(`帧缓冲不完整：status=${status}`)
  }
  return framebuffer
}

function clearRenderTarget(gl: WebGL2RenderingContext, target: PassRenderTarget): void {
  for (const framebuffer of target.framebuffers) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.viewport(0, 0, target.width, target.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
}

function createRenderTarget(gl: WebGL2RenderingContext, width: number, height: number): PassRenderTarget {
  const textureA = createRenderTexture(gl, width, height)
  const textureB = createRenderTexture(gl, width, height)
  const framebufferA = createFramebufferForTexture(gl, textureA)
  const framebufferB = createFramebufferForTexture(gl, textureB)
  const target: PassRenderTarget = {
    textures: [textureA, textureB],
    framebuffers: [framebufferA, framebufferB],
    width,
    height,
    readIndex: 0,
  }
  clearRenderTarget(gl, target)
  return target
}

function resizeRenderTarget(gl: WebGL2RenderingContext, target: PassRenderTarget, width: number, height: number): void {
  if (target.width === width && target.height === height) {
    return
  }
  for (const texture of target.textures) {
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  }
  gl.bindTexture(gl.TEXTURE_2D, null)
  target.width = width
  target.height = height
  target.readIndex = 0
  clearRenderTarget(gl, target)
}

function destroyRenderTarget(gl: WebGL2RenderingContext, target: PassRenderTarget): void {
  gl.deleteFramebuffer(target.framebuffers[0])
  gl.deleteFramebuffer(target.framebuffers[1])
  gl.deleteTexture(target.textures[0])
  gl.deleteTexture(target.textures[1])
}

function normalizeChannels(
  channels: MusicVisualizerShaderPassDefinition['channels'],
): [MusicVisualizerShaderChannelSource | null, MusicVisualizerShaderChannelSource | null, MusicVisualizerShaderChannelSource | null, MusicVisualizerShaderChannelSource | null] {
  const normalized: [MusicVisualizerShaderChannelSource | null, MusicVisualizerShaderChannelSource | null, MusicVisualizerShaderChannelSource | null, MusicVisualizerShaderChannelSource | null] = [
    null,
    null,
    null,
    null,
  ]
  if (!channels) {
    return normalized
  }
  for (let index = 0; index < Math.min(MAX_CHANNEL_COUNT, channels.length); index += 1) {
    normalized[index] = channels[index] ?? null
  }
  return normalized
}

function normalizeShaderPipeline(shader: MusicVisualizerShaderDefinition): NormalizedShaderPipeline {
  if (!shader.multiPass || shader.multiPass.passes.length === 0) {
    return {
      commonSource: shader.commonSource,
      textures: [],
      passes: [
        {
          id: `${shader.id}-image`,
          fragmentSource: shader.fragmentSource,
          channels: [{ kind: 'audio' }, null, null, null],
          output: 'screen',
          renderScale: 1,
          toneMap: true,
        },
      ],
    }
  }

  const normalizedPasses = shader.multiPass.passes.map((pass, index): NormalizedPassDescriptor => {
    const output: PassOutputMode = pass.output ?? (index === shader.multiPass!.passes.length - 1 ? 'screen' : 'buffer')
    return {
      id: pass.id,
      fragmentSource: pass.fragmentSource,
      channels: normalizeChannels(pass.channels),
      output,
      renderScale: output === 'screen' ? 1 : clamp(pass.renderScale ?? 1, 0.1, 5),
      toneMap: pass.toneMap ?? output === 'screen',
    }
  })

  const passIdSet = new Set<string>()
  for (const pass of normalizedPasses) {
    if (passIdSet.has(pass.id)) {
      throw new Error(`多 Pass 配置存在重复 id：${pass.id}`)
    }
    passIdSet.add(pass.id)
  }

  const screenPassIndexes = normalizedPasses
    .map((pass, index) => (pass.output === 'screen' ? index : -1))
    .filter((index) => index >= 0)

  if (screenPassIndexes.length !== 1) {
    throw new Error('多 Pass 配置必须且只能有 1 个 output=screen 的 pass')
  }
  if (screenPassIndexes[0] !== normalizedPasses.length - 1) {
    throw new Error('output=screen 的 pass 必须位于多 Pass 队列末尾')
  }

  return {
    commonSource: shader.multiPass.commonSource ?? shader.commonSource,
    textures: shader.multiPass.textures ?? [],
    passes: normalizedPasses,
  }
}

function resolvePassUniformLocations(gl: WebGL2RenderingContext, program: WebGLProgram): PassUniformLocations {
  return {
    resolution: gl.getUniformLocation(program, 'iResolution'),
    time: gl.getUniformLocation(program, 'iTime'),
    frame: gl.getUniformLocation(program, 'iFrame'),
    date: gl.getUniformLocation(program, 'iDate'),
    channels: [
      gl.getUniformLocation(program, 'iChannel0'),
      gl.getUniformLocation(program, 'iChannel1'),
      gl.getUniformLocation(program, 'iChannel2'),
      gl.getUniformLocation(program, 'iChannel3'),
    ],
    channelResolution: gl.getUniformLocation(program, 'iChannelResolution[0]'),
    audioLevel: gl.getUniformLocation(program, 'iAudioLevel'),
    audioBeat: gl.getUniformLocation(program, 'iAudioBeat'),
    toneMapMode: gl.getUniformLocation(program, 'iToneMapMode'),
    toneMapExposure: gl.getUniformLocation(program, 'iToneMapExposure'),
    toneMapStrength: gl.getUniformLocation(program, 'iToneMapStrength'),
    foregroundOffset: gl.getUniformLocation(program, 'iForegroundOffset'),
    foregroundScale: gl.getUniformLocation(program, 'iForegroundScale'),
  }
}

export class WebglMusicVisualizerRenderer implements MusicVisualizerRenderer {
  readonly backend = 'gpu' as const
  readonly shaderId: string
  readonly rendererLabel: string

  private readonly canvas: HTMLCanvasElement
  private readonly gl: WebGL2RenderingContext
  private readonly vao: WebGLVertexArrayObject
  private readonly audioTexture: WebGLTexture
  private readonly audioTextureData = new Uint8Array(AUDIO_TEXTURE_WIDTH * AUDIO_TEXTURE_HEIGHT * 4)
  private readonly staticTextureById = new Map<string, ChannelTextureBinding>()
  private readonly passRuntimeById = new Map<string, PassRuntime>()
  private readonly passRuntimes: PassRuntime[] = []
  private readonly channelResolutionData = new Float32Array(MAX_CHANNEL_COUNT * 3)
  private readonly dateData = new Float32Array(4)
  private disposed = false

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

    const vao = gl.createVertexArray()
    if (!vao) {
      throw new Error('创建 VAO 失败')
    }

    const audioTexture = gl.createTexture()
    if (!audioTexture) {
      gl.deleteVertexArray(vao)
      throw new Error('创建音频纹理失败')
    }

    gl.bindTexture(gl.TEXTURE_2D, audioTexture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, AUDIO_TEXTURE_WIDTH, AUDIO_TEXTURE_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.bindTexture(gl.TEXTURE_2D, null)

    this.gl = gl
    this.vao = vao
    this.audioTexture = audioTexture

    const pipeline = normalizeShaderPipeline(shader)

    for (const textureDef of pipeline.textures) {
      if (this.staticTextureById.has(textureDef.id)) {
        throw new Error(`多 Pass 纹理 id 重复：${textureDef.id}`)
      }
      const binding = createTextureBinding(gl, textureDef, () => !this.disposed)
      this.staticTextureById.set(textureDef.id, binding)
    }

    for (const descriptor of pipeline.passes) {
      const fragmentSource = buildShadertoyFragmentSource(descriptor.fragmentSource, {
        commonSource: pipeline.commonSource,
        includeToneMapping: descriptor.toneMap,
      })
      const program = createProgram(gl, fragmentSource)
      const uniforms = resolvePassUniformLocations(gl, program)
      const activeUniformNames = listActiveUniformNames(gl, program)
      const target = descriptor.output === 'buffer' ? createRenderTarget(gl, 1, 1) : null
      const runtime: PassRuntime = {
        descriptor,
        program,
        uniforms,
        activeUniformNames,
        target,
      }
      this.passRuntimes.push(runtime)
      this.passRuntimeById.set(descriptor.id, runtime)
    }

    this.validatePipelineReferences()

    const passChain = this.passRuntimes.map((runtime) => runtime.descriptor.id).join('>')
    const uniformSummary = this.passRuntimes.map((runtime) => `${runtime.descriptor.id}:${runtime.activeUniformNames.length}`).join(',')
    this.rendererLabel = `${resolveRendererLabel(gl)} | passes=${passChain} | uniforms=${uniformSummary}`
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
    this.ensurePassTargetSizes(nextWidth, nextHeight)
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
    foregroundOffsetX,
    foregroundOffsetY,
    foregroundScale,
  }: MusicVisualizerFrameInput): void {
    this.uploadAudioTexture(frequencyData, waveformData)
    this.ensurePassTargetSizes(width, height)
    this.updateDateUniformData()

    const toneMapModeCode = resolveToneMapModeCode(toneMapMode)
    const gl = this.gl

    const previousTexturesByPassId = new Map<string, ChannelTextureBinding>()
    for (const runtime of this.passRuntimes) {
      if (!runtime.target) {
        continue
      }
      previousTexturesByPassId.set(runtime.descriptor.id, {
        texture: runtime.target.textures[runtime.target.readIndex],
        width: runtime.target.width,
        height: runtime.target.height,
      })
    }

    const renderedTexturesByPassId = new Map<string, ChannelTextureBinding>()

    for (const runtime of this.passRuntimes) {
      const target = runtime.target
      let passWidth = Math.max(1, Math.round(width))
      let passHeight = Math.max(1, Math.round(height))
      let writeIndex: 0 | 1 | null = null

      if (target) {
        writeIndex = target.readIndex === 0 ? 1 : 0
        passWidth = target.width
        passHeight = target.height
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffers[writeIndex])
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      }

      gl.viewport(0, 0, passWidth, passHeight)
      gl.useProgram(runtime.program)
      gl.bindVertexArray(this.vao)

      this.bindPassChannels(runtime, renderedTexturesByPassId, previousTexturesByPassId)
      this.updatePassUniforms(runtime.uniforms, {
        width: passWidth,
        height: passHeight,
        timeSec,
        frame,
        audioLevel,
        audioBeat,
        toneMapModeCode,
        toneMapExposure,
        toneMapStrength,
        foregroundOffsetX,
        foregroundOffsetY,
        foregroundScale,
      })

      gl.drawArrays(gl.TRIANGLES, 0, 3)

      if (target && writeIndex != null) {
        renderedTexturesByPassId.set(runtime.descriptor.id, {
          texture: target.textures[writeIndex],
          width: target.width,
          height: target.height,
        })
        target.readIndex = writeIndex
      }
    }

    gl.bindVertexArray(null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    for (let channel = 0; channel < MAX_CHANNEL_COUNT; channel += 1) {
      gl.activeTexture(gl.TEXTURE0 + channel)
      gl.bindTexture(gl.TEXTURE_2D, null)
    }
  }

  dispose(): void {
    if (this.disposed) {
      return
    }
    this.disposed = true

    const gl = this.gl
    gl.deleteTexture(this.audioTexture)
    gl.deleteVertexArray(this.vao)

    for (const runtime of this.passRuntimes) {
      if (runtime.target) {
        destroyRenderTarget(gl, runtime.target)
      }
      gl.deleteProgram(runtime.program)
    }

    for (const binding of this.staticTextureById.values()) {
      gl.deleteTexture(binding.texture)
    }

    this.passRuntimes.length = 0
    this.passRuntimeById.clear()
    this.staticTextureById.clear()
  }

  private validatePipelineReferences(): void {
    for (const runtime of this.passRuntimes) {
      for (const channel of runtime.descriptor.channels) {
        if (!channel) {
          continue
        }
        if (channel.kind === 'pass' && !this.passRuntimeById.has(channel.passId)) {
          throw new Error(`Pass ${runtime.descriptor.id} 引用了不存在的 pass：${channel.passId}`)
        }
        if (channel.kind === 'texture' && !this.staticTextureById.has(channel.textureId)) {
          throw new Error(`Pass ${runtime.descriptor.id} 引用了不存在的纹理：${channel.textureId}`)
        }
      }
    }
  }

  private ensurePassTargetSizes(baseWidth: number, baseHeight: number): void {
    const normalizedWidth = Math.max(1, Math.round(baseWidth))
    const normalizedHeight = Math.max(1, Math.round(baseHeight))
    for (const runtime of this.passRuntimes) {
      if (!runtime.target) {
        continue
      }
      const targetWidth = Math.max(1, Math.round(normalizedWidth * runtime.descriptor.renderScale))
      const targetHeight = Math.max(1, Math.round(normalizedHeight * runtime.descriptor.renderScale))
      resizeRenderTarget(this.gl, runtime.target, targetWidth, targetHeight)
    }
  }

  private resolveChannelTexture(
    passId: string,
    channel: MusicVisualizerShaderChannelSource | null,
    renderedTexturesByPassId: Map<string, ChannelTextureBinding>,
    previousTexturesByPassId: Map<string, ChannelTextureBinding>,
  ): ChannelTextureBinding | null {
    if (!channel) {
      return null
    }

    if (channel.kind === 'audio') {
      return {
        texture: this.audioTexture,
        width: AUDIO_TEXTURE_WIDTH,
        height: AUDIO_TEXTURE_HEIGHT,
      }
    }

    if (channel.kind === 'texture') {
      return this.staticTextureById.get(channel.textureId) ?? null
    }

    if (channel.feedback || channel.passId === passId) {
      return previousTexturesByPassId.get(channel.passId) ?? null
    }

    const rendered = renderedTexturesByPassId.get(channel.passId)
    if (rendered) {
      return rendered
    }
    return previousTexturesByPassId.get(channel.passId) ?? null
  }

  private bindPassChannels(
    runtime: PassRuntime,
    renderedTexturesByPassId: Map<string, ChannelTextureBinding>,
    previousTexturesByPassId: Map<string, ChannelTextureBinding>,
  ): void {
    const gl = this.gl

    for (let channelIndex = 0; channelIndex < MAX_CHANNEL_COUNT; channelIndex += 1) {
      const channel = runtime.descriptor.channels[channelIndex]
      const channelTexture = this.resolveChannelTexture(runtime.descriptor.id, channel, renderedTexturesByPassId, previousTexturesByPassId)
      const resolutionBaseIndex = channelIndex * 3

      this.channelResolutionData[resolutionBaseIndex] = channelTexture?.width ?? 0
      this.channelResolutionData[resolutionBaseIndex + 1] = channelTexture?.height ?? 0
      this.channelResolutionData[resolutionBaseIndex + 2] = 1

      gl.activeTexture(gl.TEXTURE0 + channelIndex)
      gl.bindTexture(gl.TEXTURE_2D, channelTexture?.texture ?? null)

      const channelUniform = runtime.uniforms.channels[channelIndex]
      if (channelUniform) {
        gl.uniform1i(channelUniform, channelIndex)
      }
    }

    if (runtime.uniforms.channelResolution) {
      gl.uniform3fv(runtime.uniforms.channelResolution, this.channelResolutionData)
    }
  }

  private updateDateUniformData(): void {
    const now = new Date()
    const daySeconds =
      now.getHours() * 3600 +
      now.getMinutes() * 60 +
      now.getSeconds() +
      now.getMilliseconds() * 0.001

    this.dateData[0] = now.getFullYear()
    this.dateData[1] = now.getMonth() + 1
    this.dateData[2] = now.getDate()
    this.dateData[3] = daySeconds
  }

  private updatePassUniforms(uniforms: PassUniformLocations, input: PassUniformInput): void {
    const gl = this.gl
    if (uniforms.resolution) {
      gl.uniform3f(uniforms.resolution, input.width, input.height, 1)
    }
    if (uniforms.time) {
      gl.uniform1f(uniforms.time, input.timeSec)
    }
    if (uniforms.frame) {
      gl.uniform1i(uniforms.frame, input.frame)
    }
    if (uniforms.date) {
      gl.uniform4fv(uniforms.date, this.dateData)
    }
    if (uniforms.audioLevel) {
      gl.uniform1f(uniforms.audioLevel, input.audioLevel)
    }
    if (uniforms.audioBeat) {
      gl.uniform1f(uniforms.audioBeat, input.audioBeat)
    }
    if (uniforms.toneMapMode) {
      gl.uniform1i(uniforms.toneMapMode, input.toneMapModeCode)
    }
    if (uniforms.toneMapExposure) {
      gl.uniform1f(uniforms.toneMapExposure, input.toneMapExposure)
    }
    if (uniforms.toneMapStrength) {
      gl.uniform1f(uniforms.toneMapStrength, input.toneMapStrength)
    }
    if (uniforms.foregroundOffset) {
      gl.uniform2f(uniforms.foregroundOffset, input.foregroundOffsetX, input.foregroundOffsetY)
    }
    if (uniforms.foregroundScale) {
      gl.uniform1f(uniforms.foregroundScale, input.foregroundScale)
    }
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
