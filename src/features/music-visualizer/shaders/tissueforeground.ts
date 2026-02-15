import type { MusicVisualizerShaderDefinition } from '../types'

const IMAGE_SOURCE = String.raw`#define AA (1.5 / iResolution.y)

float ss(float e, float v)
{
  return smoothstep(e - AA, e + AA, v);
}

float ss(float e, float v, float m)
{
  float a = m * AA;
  return smoothstep(e - a, e + a, v);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
  vec2 uv = fragCoord / iResolution.xy - 0.5;
  uv.x *= iResolution.x / iResolution.y;
  uv = (-uv * 2.0);

  float barCount = 50.0;

  float r = atan(uv.x, uv.y) / 3.14159;
  r = (r + 1.0) / 2.0;

  float ir = floor(r * barCount) / barCount;

  float s = 0.3;

  float w = texture(iChannel0, vec2(ir, 0.0)).r;
  w = mix(s, 1.0, w);
  w = s + (w - s) * 1.5;

  float d = length(uv);

  float b = fract(r * barCount);
  b = ss(0.15, b, barCount) - ss(0.85, b, barCount);

  vec3 col = vec3(0.0);
  col = mix(col, mix(vec3(0.0, 0.7, 0.3), vec3(0.0, 1.0, 1.0), d), ss(d, w) * b * ss(s + 0.01, d));

  fragColor = vec4(col, 1.0);
}
`

export const SHADER: MusicVisualizerShaderDefinition = {
  id: 'tissueforeground',
  label: 'Tissue Foreground',
  fragmentSource: IMAGE_SOURCE,
}
