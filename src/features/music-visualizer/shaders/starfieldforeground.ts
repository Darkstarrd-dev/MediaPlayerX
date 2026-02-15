import type { MusicVisualizerShaderDefinition } from '../types'

const COMMON_SOURCE = String.raw`const float PI = 3.141592654;

vec2 grad(ivec2 z) {
  int n = z.x + z.y * 11111;
  n = (n << 13) ^ n;
  n = (n * (n * n * 15731 + 789221) + 1376312589) >> 16;

  n &= 7;
  vec2 gr = vec2(float(n & 1), float(n >> 1)) * 2.0 - 1.0;
  return (n >= 6)
    ? vec2(0.0, gr.x)
    : ((n >= 4)
      ? vec2(gr.x, 0.0)
      : gr);
}

float noise(vec2 p) {
  ivec2 i = ivec2(floor(p));
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(
      dot(grad(i + ivec2(0, 0)), f - vec2(0.0, 0.0)),
      dot(grad(i + ivec2(1, 0)), f - vec2(1.0, 0.0)),
      u.x
    ),
    mix(
      dot(grad(i + ivec2(0, 1)), f - vec2(0.0, 1.0)),
      dot(grad(i + ivec2(1, 1)), f - vec2(1.0, 1.0)),
      u.x
    ),
    u.y
  );
}

float sdSphere(vec2 p, float r) {
  return length(p) - r;
}

vec2 opRepAng(vec2 p, float theta, float offset) {
  float a = atan(p.y, p.x) - offset;
  a = mod(a + 0.5 * theta, theta) - 0.5 * theta;
  return length(p) * vec2(cos(a), sin(a));
}

float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

vec3 renderForeground(vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float aspect = iResolution.x / iResolution.y;
  vec2 uvAspect = vec2(uv.x * aspect, uv.y);

  vec3 backCol = 0.5 + 0.5 * cos(iTime + uvAspect.xyx + vec3(0.0, 2.0, 4.0));

  vec2 center = vec2(0.5 * aspect, 0.5);
  vec2 p = uvAspect - center;

  float circle = 1.0 - smoothstep(
    0.0,
    0.2,
    sdSphere(p * (2.0 - 0.55 * noise(p * 5.50 + vec2(iTime * 1.5))), 0.35)
  );
  float circle1 = 1.0 - smoothstep(
    0.1,
    1.0,
    sdSphere(p * (2.33 - 1.9 * noise(p * 10.50 + vec2(iTime, iTime * 2.0))), 0.2)
  );

  vec2 ringP = opRepAng(p, 2.0 * PI / 20.0, PI * 0.5);
  float len = 0.4;
  float offset = 0.02 * sin(iTime * 10.0) * 5.02 * (circle1 - circle);
  float segment = sdSegment(ringP * 1.5, vec2(len * 0.9 - offset, 0.0), vec2(len + offset, 0.0));

  float val = smoothstep(0.01, 0.015, segment);
  float addVal = mix(0.21, 13.0, segment);

  vec3 addValCol = clamp(1.0 - addVal, 0.0, 1.0) * vec3(0.3, 0.5, 0.99);
  vec3 baseValCol = vec3(0.4, 0.8, 0.88) * (1.0 - val);
  vec3 col = addValCol + baseValCol;

  col = mix(col, backCol + col, clamp(col.x, 0.0, 1.0));

  float radialMask = 1.0 - smoothstep(0.38, 0.88, length(p));
  return col * radialMask;
}
`

const IMAGE_SOURCE = String.raw`void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec3 foreground = renderForeground(fragCoord);
  fragColor = vec4(foreground, 1.0);
}
`

export const SHADER: MusicVisualizerShaderDefinition = {
  id: 'starfieldforeground',
  label: 'Starfield Foreground',
  fragmentSource: IMAGE_SOURCE,
  commonSource: COMMON_SOURCE,
}
