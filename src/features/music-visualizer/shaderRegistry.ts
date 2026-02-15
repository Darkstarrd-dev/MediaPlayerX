import type { MusicVisualizerShaderDefinition } from './types'

interface ShaderModuleShape {
  SHADER?: MusicVisualizerShaderDefinition
  default?: MusicVisualizerShaderDefinition
}

const shaderModuleByPath = import.meta.glob<ShaderModuleShape>('./shaders/*.ts', { eager: true })

const SHADER_ORDER_PRIORITY: Record<string, number> = {
  'mcs-szb': 0,
  escapeforeground: 1,
  starfieldforeground: 2,
  tissueforeground: 3,
  galaxyforeground: 4,
  singularity: 5,
  starfield: 6,
  nebula: 7,
  galaxy: 8,
  fungi: 9,
  tissue: 10,
  'rain-drips': 11,
  escape: 12,
  voxel: 13,
}

function listShaderEntries(): MusicVisualizerShaderDefinition[] {
  const entries: MusicVisualizerShaderDefinition[] = []
  for (const module of Object.values(shaderModuleByPath)) {
    const shader = module.SHADER ?? module.default
    if (!shader) {
      continue
    }
    entries.push(shader)
  }

  return entries.sort((left, right) => {
    const leftPriority = SHADER_ORDER_PRIORITY[left.id] ?? Number.POSITIVE_INFINITY
    const rightPriority = SHADER_ORDER_PRIORITY[right.id] ?? Number.POSITIVE_INFINITY
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority
    }
    return left.label.localeCompare(right.label)
  })
}

export const MUSIC_VISUALIZER_SHADERS = listShaderEntries()

export function resolveMusicVisualizerShaderById(shaderId: string | null | undefined): MusicVisualizerShaderDefinition | null {
  if (!shaderId) {
    return null
  }
  return MUSIC_VISUALIZER_SHADERS.find((shader) => shader.id === shaderId) ?? null
}

export function resolveDefaultMusicVisualizerShader(): MusicVisualizerShaderDefinition | null {
  const explicitDefault = MUSIC_VISUALIZER_SHADERS.find((shader) => shader.defaultEntry)
  if (explicitDefault) {
    return explicitDefault
  }
  return MUSIC_VISUALIZER_SHADERS[0] ?? null
}
