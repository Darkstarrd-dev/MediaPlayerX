import { describe, expect, it } from 'vitest'

import { buildShadertoyFragmentSource } from './shadertoyAdapter'

describe('buildShadertoyFragmentSource', () => {
  it('wraps mainImage shader source into WebGL2 fragment entry', () => {
    const source = buildShadertoyFragmentSource(`
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  fragColor = vec4(fragCoord.xy * 0.0, 0.0, 1.0);
}
`)

    expect(source).toContain('#version 300 es')
    expect(source).toContain('uniform vec3 iResolution;')
    expect(source).toContain('uniform sampler2D iChannel0;')
    expect(source).toContain('uniform float iAudioLevel;')
    expect(source).toContain('uniform float iAudioBeat;')
    expect(source).toContain('uniform int iToneMapMode;')
    expect(source).toContain('uniform float iToneMapExposure;')
    expect(source).toContain('uniform float iToneMapStrength;')
    expect(source).toContain('vec3 toneMapFilmic')
    expect(source).toContain('vec3 toneMapAgx')
    expect(source).toContain('vec3 toneMapKhronos')
    expect(source).toContain('mainImage(rawColor, gl_FragCoord.xy);')
  })
})
