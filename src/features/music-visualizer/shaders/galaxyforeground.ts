import type { MusicVisualizerShaderDefinition } from '../types'

const COMMON_SOURCE = String.raw`#define PI 3.141592654

vec3 paletteForeground(float t) {
  vec3 a = vec3(0.5, 0.5, 0.5);
  vec3 b = vec3(0.5, 0.5, 0.5);
  vec3 c = vec3(1.0, 1.0, 1.0);
  vec3 d = vec3(0.2, 0.4, 0.5);
  return a + b * cos(2.0 * PI * (c * t + d));
}

vec3 renderForeground(vec2 fragCoord) {
  vec2 uv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;

  float angle = atan(-uv.y, -uv.x) / (2.0 * PI);
  angle = fract(angle);

  float dist = length(uv) * 1.5;
  float level = pow(texture(iChannel0, vec2(clamp(angle, 0.001, 0.999), 0.25)).r, 0.5);

  float wrappedAngle = abs(2.0 * (1.0 - angle));

  if (dist < 1.0) {
    dist = pow(max(dist, 0.0001), (1.0 - 0.95 * level) * 20.0);
  } else {
    dist = exp2(100.0 * (1.0 - dist));
  }

  vec3 result = (1.0 + 5.0 * level) * dist * paletteForeground(-iTime / 2.0 + wrappedAngle);
  vec3 centered = tanh(result);

  float mask = 1.0 - smoothstep(1.0, 1.8, length(uv));
  return centered * mask;
}
`

const IMAGE_SOURCE = String.raw`void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec3 foreground = renderForeground(fragCoord);
  fragColor = vec4(clamp(foreground, 0.0, 1.0), 1.0);
}
`

export const SHADER: MusicVisualizerShaderDefinition = {
  id: 'galaxyforeground',
  label: 'Galaxy Foreground',
  layerRole: 'foreground',
  fragmentSource: IMAGE_SOURCE,
  commonSource: COMMON_SOURCE,
}
