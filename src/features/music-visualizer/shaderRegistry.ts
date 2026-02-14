import type { MusicVisualizerShaderDefinition } from './types'

interface ShaderModuleShape {
  SHADER?: MusicVisualizerShaderDefinition
  default?: MusicVisualizerShaderDefinition
}

const shaderModuleByPath = import.meta.glob<ShaderModuleShape>('./shaders/*.ts', { eager: true })

function listShaderEntries(): MusicVisualizerShaderDefinition[] {
  const entries: MusicVisualizerShaderDefinition[] = []
  for (const module of Object.values(shaderModuleByPath)) {
    const shader = module.SHADER ?? module.default
    if (!shader) {
      continue
    }
    entries.push(shader)
  }

  return entries.sort((left, right) => left.label.localeCompare(right.label))
}

export const MUSIC_VISUALIZER_SHADERS = listShaderEntries()

export function resolveDefaultMusicVisualizerShader(): MusicVisualizerShaderDefinition | null {
  const explicitDefault = MUSIC_VISUALIZER_SHADERS.find((shader) => shader.defaultEntry)
  if (explicitDefault) {
    return explicitDefault
  }
  return MUSIC_VISUALIZER_SHADERS[0] ?? null
}
