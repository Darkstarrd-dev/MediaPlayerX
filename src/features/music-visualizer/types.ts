export type MusicVisualizerRendererMode = 'gpu' | 'cpu'

export type MusicVisualizerToneMapMode = 'off' | 'reinhard' | 'aces' | 'filmic' | 'agx' | 'khronos'

export type MusicVisualizerToneMapPolicy = 'inherit' | 'force-on' | 'force-off'

export type MusicVisualizerShaderTextureFilter = 'linear' | 'nearest'

export type MusicVisualizerShaderTextureWrap = 'repeat' | 'clamp'

export type MusicVisualizerShaderTexturePreset =
  | 'noise-rg'
  | 'noise-rgb'
  | 'noise-rgb-seamless'
  | 'rain-bg'

export interface MusicVisualizerPluginInputBinding {
  audioLevelUniform: string
  audioBeatUniform: string
  timeUniform: string
  audioTextureSampler: string
}

export type MusicVisualizerPluginScalarSignal =
  | 'none'
  | 'audioLevel'
  | 'audioBeat'
  | 'timeSec'

export type MusicVisualizerPluginSamplerSignal = 'none' | 'audioTexture'

export interface MusicVisualizerPluginScalarTransform {
  scale: number
  bias: number
  clampEnabled: boolean
  clampMin: number
  clampMax: number
  smoothEnabled: boolean
  smoothAttack: number
  smoothRelease: number
}

export interface MusicVisualizerPluginCustomBinding {
  scalarBindings: Record<string, MusicVisualizerPluginScalarSignal>
  scalarTransforms: Record<string, MusicVisualizerPluginScalarTransform>
  samplerBindings: Record<string, MusicVisualizerPluginSamplerSignal>
}

export interface MusicVisualizerShaderTextureDefinition {
  id: string
  preset: MusicVisualizerShaderTexturePreset
  width: number
  height: number
  sourceUrl?: string
  filter?: MusicVisualizerShaderTextureFilter
  wrap?: MusicVisualizerShaderTextureWrap
  seed?: number
}

export type MusicVisualizerShaderChannelSource =
  | { kind: 'audio' }
  | {
      kind: 'pass'
      passId: string
      feedback?: boolean
    }
  | {
      kind: 'texture'
      textureId: string
    }

export interface MusicVisualizerShaderPassDefinition {
  id: string
  fragmentSource: string
  channels?: readonly (MusicVisualizerShaderChannelSource | null | undefined)[]
  output?: 'buffer' | 'screen'
  renderScale?: number
  toneMap?: boolean
}

export interface MusicVisualizerShaderMultiPassDefinition {
  commonSource?: string
  textures?: readonly MusicVisualizerShaderTextureDefinition[]
  passes: readonly MusicVisualizerShaderPassDefinition[]
}

export interface MusicVisualizerShaderDefinition {
  id: string
  label: string
  fragmentSource: string
  commonSource?: string
  multiPass?: MusicVisualizerShaderMultiPassDefinition
  defaultEntry?: boolean
  renderScale?: number
  toneMapPolicy?: MusicVisualizerToneMapPolicy
  toneMapStrengthBias?: number
  pluginInputBinding?: MusicVisualizerPluginInputBinding
  pluginCustomBinding?: MusicVisualizerPluginCustomBinding
}

export interface MusicVisualizerFrameInput {
  width: number
  height: number
  timeSec: number
  frame: number
  frequencyData: Uint8Array
  waveformData: Uint8Array
  audioLevel: number
  audioBeat: number
  toneMapMode: MusicVisualizerToneMapMode
  toneMapExposure: number
  toneMapStrength: number
  foregroundOffsetX: number
  foregroundOffsetY: number
  foregroundScale: number
  compositeModeCode: number
  themeModeCode: number
  themeBackgroundR: number
  themeBackgroundG: number
  themeBackgroundB: number
}

export interface MusicVisualizerRenderer {
  readonly backend: MusicVisualizerRendererMode
  readonly shaderId: string
  readonly rendererLabel: string
  resize: (width: number, height: number) => void
  render: (input: MusicVisualizerFrameInput) => void
  dispose: () => void
}

export interface MusicVisualizerStats {
  fps: number
  frameMs: number
  renderWidth: number
  renderHeight: number
  backend: MusicVisualizerRendererMode
  shaderId: string
  rendererLabel: string
}
