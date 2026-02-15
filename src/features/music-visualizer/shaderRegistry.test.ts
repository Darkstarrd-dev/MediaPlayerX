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
    expect(MUSIC_VISUALIZER_SHADERS.some((shader) => shader.id === 'escape')).toBe(true)
    expect(MUSIC_VISUALIZER_SHADERS.some((shader) => shader.id === 'tissue')).toBe(true)
    expect(MUSIC_VISUALIZER_SHADERS.some((shader) => shader.id === 'galaxyforeground')).toBe(true)
    expect(MUSIC_VISUALIZER_SHADERS.some((shader) => shader.id === 'starfieldforeground')).toBe(true)
    expect(MUSIC_VISUALIZER_SHADERS.some((shader) => shader.id === 'escapeforeground')).toBe(true)
    expect(MUSIC_VISUALIZER_SHADERS.some((shader) => shader.id === 'tissueforeground')).toBe(true)
    expect(resolveMusicVisualizerShaderById('galaxyforeground')?.label).toBe('Orbs')
    expect(resolveMusicVisualizerShaderById('starfieldforeground')?.label).toBe('Simple Pan')
    expect(resolveMusicVisualizerShaderById('escapeforeground')?.label).toBe('Bouncing Bars')
    expect(resolveMusicVisualizerShaderById('tissueforeground')?.label).toBe('Radial Bars')
    expect(resolveMusicVisualizerShaderById('starfield')?.label).toBe('Starfield')
    expect(resolveMusicVisualizerShaderById('galaxy')?.label).toBe('Galaxy')
    expect(resolveMusicVisualizerShaderById('tissue')?.label).toBe('Tissue')
    expect(resolveMusicVisualizerShaderById('escape')?.label).toBe('Escape')
  })

  it('keeps custom shader list order', () => {
    const orderedIds = MUSIC_VISUALIZER_SHADERS.map((shader) => shader.id)
    expect(orderedIds).toEqual([
      'mcs-szb',
      'escapeforeground',
      'starfieldforeground',
      'tissueforeground',
      'galaxyforeground',
      'singularity',
      'starfield',
      'nebula',
      'galaxy',
      'fungi',
      'tissue',
      'rain-drips',
      'escape',
      'voxel',
    ])
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
