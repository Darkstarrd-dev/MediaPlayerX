export type MusicVisualizerRendererMode = 'gpu' | 'cpu'

export interface MusicVisualizerShaderDefinition {
  id: string
  label: string
  fragmentSource: string
  defaultEntry?: boolean
  renderScale?: number
}

export interface MusicVisualizerFrameInput {
  width: number
  height: number
  timeSec: number
  frame: number
  frequencyData: Uint8Array
  waveformData: Uint8Array
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
