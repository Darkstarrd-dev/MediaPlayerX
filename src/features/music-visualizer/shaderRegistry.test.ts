import { describe, expect, it } from 'vitest'

import { MUSIC_VISUALIZER_SHADERS, resolveDefaultMusicVisualizerShader, resolveMusicVisualizerShaderById } from './shaderRegistry'

describe('shaderRegistry', () => {
  it('loads bundled music visualizer shaders', () => {
    expect(MUSIC_VISUALIZER_SHADERS.length).toBeGreaterThan(0)
    expect(MUSIC_VISUALIZER_SHADERS.some((shader) => shader.id === 'mcs-szb')).toBe(true)
    expect(MUSIC_VISUALIZER_SHADERS.some((shader) => shader.id === 'starfield')).toBe(true)
    expect(MUSIC_VISUALIZER_SHADERS.some((shader) => shader.id === 'galaxy')).toBe(true)
    expect(MUSIC_VISUALIZER_SHADERS.some((shader) => shader.id === 'nebula')).toBe(true)
    expect(MUSIC_VISUALIZER_SHADERS.some((shader) => shader.id === 'voxel')).toBe(true)
    expect(MUSIC_VISUALIZER_SHADERS.some((shader) => shader.id === 'fungi')).toBe(true)
    expect(MUSIC_VISUALIZER_SHADERS.some((shader) => shader.id === 'singularity')).toBe(true)
    expect(MUSIC_VISUALIZER_SHADERS.some((shader) => shader.id === 'rain-drips')).toBe(true)
  })

  it('resolves default shader entry', () => {
    const shader = resolveDefaultMusicVisualizerShader()
    expect(shader).not.toBeNull()
    expect(shader?.id).toBe('mcs-szb')
  })

  it('resolves shader by id', () => {
    expect(resolveMusicVisualizerShaderById('mcs-szb')?.id).toBe('mcs-szb')
    expect(resolveMusicVisualizerShaderById('missing-shader')).toBeNull()
  })
})
