import type { MusicVisualizerShaderDefinition } from '../types'

const COMMON_SOURCE = String.raw`const float NUM_LAYERS = 7.0;
const int NUM_LAYER_COUNT = 7;
const float PI = 3.141592654;

vec3 palette(float t) {
  vec3 a = vec3(0.498, 0.588, 1.128);
  vec3 b = vec3(0.303, 0.388, 0.273);
  vec3 c = vec3(1.763, 0.938, 0.787);
  vec3 d = vec3(-2.982, 1.818, 1.948);
  return a + b * cos(6.28318 * (c * t + d));
}

mat2 Rot(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c);
}

float Hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.821));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float Star(vec2 uv, float size, float baseRotation) {
  float d = length(uv);
  float m = 0.0;

  m += smoothstep(0.12, 0.15, d) / 7.0 * size;
  m += 0.01 / max(d, 0.0008) * (size * 0.5 + 0.5);

  uv *= Rot(baseRotation);
  float rays = 0.0;
  rays += max(0.0, 1.0 - abs(pow(abs(uv.x), 1.8) * uv.y * 30000.0));

  uv *= Rot(3.14159 / 4.0);
  rays += max(0.0, 1.0 - abs(uv.x * uv.y * 3000.0)) * 0.7;

  m *= smoothstep(1.0, 0.2, d);
  m += rays * smoothstep(1.0, 0.2, d / max(size, 0.001));
  return m;
}

vec3 StarLayer(vec2 uv, float vol) {
  vec3 col = vec3(0.0);
  vec2 gv = fract(uv) - 0.5;
  vec2 id = floor(uv);

  for (int y = -1; y <= 1; y += 1) {
    for (int x = -1; x <= 1; x += 1) {
      vec2 offset = vec2(float(x), float(y));
      float n = Hash21(id + offset);
      float size = fract(n * 149.1) * (sin(iTime * 0.3 + n * 48.123) * 0.5 + 1.0) * vol;
      float star = Star(-offset + gv - (vec2(n, fract(n * 34.0)) - 0.5), smoothstep(0.4, 1.0, size), -3.14159 / 10.0);
      vec3 color = palette(star / 3.0 + iTime * 0.3 + fract(n * 9438.7));
      col += star * color;
    }
  }

  return col;
}

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

vec3 renderBackground(vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
  float t = iTime * 0.02;

  vec2 motion = vec2(sin(iTime / 4.0), cos(iTime / 4.0));
  uv += motion * 0.4;

  vec3 col = vec3(0.0);
  for (int layer = 0; layer < NUM_LAYER_COUNT; layer += 1) {
    float i = float(layer) / NUM_LAYERS;
    float depth = fract(i + t);
    float scale = mix(10.0, 1.0, depth);
    float audio = texture(iChannel0, vec2(clamp(depth, 0.001, 0.999), 0.25)).r;
    float vol = pow(audio * 1.5, 2.0);

    col += StarLayer(uv * scale + i * 400.3 - motion - t, vol)
      * smoothstep(1.0, 0.9, depth)
      * depth
      * clamp((i - 1.0 + 1.0 / NUM_LAYERS) * 1.5 + iTime / 10.0, -1.0, 1.0);
  }

  return col;
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

const BACKGROUND_PASS_SOURCE = String.raw`void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec3 background = renderBackground(fragCoord);
  fragColor = vec4(background, 1.0);
}
`

export const SHADER: MusicVisualizerShaderDefinition = {
  id: 'starfield',
  label: 'Starfield Background',
  layerRole: 'background',
  fragmentSource: BACKGROUND_PASS_SOURCE,
  commonSource: COMMON_SOURCE,
  multiPass: {
    commonSource: COMMON_SOURCE,
    passes: [
      {
        id: 'starfield-image',
        fragmentSource: BACKGROUND_PASS_SOURCE,
        output: 'screen',
        toneMap: true,
        channels: [{ kind: 'audio' }],
      },
    ],
  },
}
