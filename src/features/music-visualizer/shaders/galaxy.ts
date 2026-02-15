import type { MusicVisualizerShaderDefinition } from '../types'

const COMMON_SOURCE = String.raw`#define PI 3.141592654

const int ITERATIONS = 13;
const int VOLSTEPS = 20;
const int AUDIO_SAMPLE_COUNT = 45;

const float FORMUPARAM = 0.53;
const float STEPSIZE = 0.1;
const float ZOOM = 0.8;
const float TILE = 0.85;
const float BRIGHTNESS = 0.0015;
const float DARKMATTER = 0.3;
const float DISTFADING = 0.73;
const float SATURATION = 0.85;

float iAmplifiedTime = 0.0;

float fftBand(float index) {
  int bin = int(clamp(index, 0.0, 511.0));
  return pow(texelFetch(iChannel0, ivec2(bin, 0), 0).r, 5.0);
}

mat2 rotMat(float r) {
  float c = cos(r);
  float s = sin(r);
  return mat2(c, -s, s, c);
}

float abs1d(float x) {
  return abs(fract(x) - 0.5);
}

vec2 abs2d(vec2 v) {
  return abs(fract(v) - 0.5);
}

float sin1d(float p) {
  return sin(p * 6.283184) * 0.25 + 0.25;
}

vec3 oilnoise(vec2 pos, vec3 rgb) {
  const int OCTAVES = 15;
  vec2 q = vec2(0.0);
  float result = 0.0;

  float s = 2.2;
  float gain = 0.44;
  vec2 aPos = abs2d(pos) * 0.5;

  for (int i = 0; i < OCTAVES; i += 1) {
    pos *= rotMat(radians(30.0));
    float t = (sin(iAmplifiedTime) * 0.5 + 0.5) * 0.2 + iAmplifiedTime * 0.8;
    q = pos * s + aPos + t;
    q = cos(q);

    result += sin1d(dot(q, vec2(0.3))) * gain;

    s *= 1.07;
    aPos += cos(smoothstep(0.0, 0.15, q));
    aPos *= rotMat(radians(5.0));
    aPos *= 1.232;
  }

  result = pow(max(result, 0.0001), 4.504);
  float denom = max(abs1d(dot(q, vec2(-0.240, 0.000))) * 0.5 / result, 0.0001);
  return clamp(rgb / denom, vec3(0.0), vec3(1.0));
}

float easeFade(float x) {
  float t = 2.0 * x - 1.0;
  return 1.0 - t * t * t * t;
}

float holeFade(float t, float life, float lifeOffset) {
  return easeFade(mod(t - lifeOffset, life) / life);
}

vec2 getPos(float t, float life, float offset, float lifeOffset) {
  float snap = floor((t - lifeOffset) / life) * life;
  return vec2(
    cos(offset + snap) * iResolution.x / 2.0,
    sin(2.0 * offset + snap) * iResolution.y / 2.0
  );
}

vec4 renderVolumetric(vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy - 0.5;
  uv.y *= iResolution.y / iResolution.x;

  vec3 dir = vec3(uv * ZOOM, 1.0);
  vec3 from = vec3(1.0, 0.5, 0.5);

  float s = 0.1;
  float fade = 1.0;
  vec3 v = vec3(0.0);

  for (int r = 0; r < VOLSTEPS; r += 1) {
    vec3 p = from + s * dir * 0.5;
    p = abs(vec3(TILE) - mod(p, vec3(TILE * 2.0)));

    float pa = 0.0;
    float a = 0.0;
    for (int i = 0; i < ITERATIONS; i += 1) {
      p = abs(p) / dot(p, p) - FORMUPARAM;
      float rot = iAmplifiedTime * 0.01;
      p.xy *= mat2(cos(rot), sin(rot), -sin(rot), cos(rot));
      a += abs(length(p) - pa);
      pa = length(p);
    }

    float dm = max(0.0, DARKMATTER - a * a * 0.001);
    a *= a * a;

    if (r > 6) {
      fade *= 1.3 - dm;
    }

    v += fade;
    v += vec3(s, s * s, s * s * s * s) * a * BRIGHTNESS * fade;
    fade *= DISTFADING;
    s += STEPSIZE;
  }

  v = mix(vec3(length(v)), v, SATURATION);
  return vec4(v * 0.01, 1.0);
}

vec3 renderSwirl(vec2 fragCoord) {
  vec2 v = iResolution.xy;
  vec2 u = 0.2 * (fragCoord + fragCoord - v) / v.y;
  vec2 k = u;
  vec2 w = u;

  vec4 o = vec4(1.0, 2.0, 3.0, 0.0);
  float a = 0.5;
  float t = iAmplifiedTime * 0.21;

  for (int iter = 0; iter < 19; iter += 1) {
    float fi = float(iter) + 1.0;
    o += (1.0 + cos(vec4(0.0, 1.0, 3.0, 0.0) + t))
      / max(length((1.0 + fi * dot(v, v)) * sin(w * 3.0 - 9.0 * u.yx + t)), 0.0001);

    t += 1.0;
    a += 0.03;
    v = cos(t - 7.0 * u * pow(a, fi)) - 5.0 * u;
    u *= mat2(cos(fi + t * 0.02 - vec4(0.0, 11.0, 33.0, 0.0)));
    u += 0.005 * tanh(40.0 * dot(u, u) * cos(100.0 * u.yx + t))
      + 0.2 * a * u
      + 0.003 * cos(t + 4.0 * exp(-0.01 * dot(o, o)));
    w = u / max(1.0 - 2.0 * dot(u, u), 0.0001);
  }

  o = 1.0 - sqrt(exp(-o * o * o / 200.0));
  o = pow(clamp(o, vec4(0.0), vec4(1.0)), vec4(0.3));
  o -= dot(k - u, k - u) / 250.0;

  return clamp(o.xyz, 0.0, 3.0);
}

vec3 renderAudioBursts(vec2 fragCoord, vec2 uv) {
  vec2 coord = fragCoord * 2.0 - iResolution.xy;

  float holeSize = iResolution.y / 10.0;
  float holeLife = 2.0;
  vec3 final = vec3(0.0);

  float audioAvg = 0.0;
  for (int i = 0; i < AUDIO_SAMPLE_COUNT; i += 1) {
    float bandIndex = 1.0 + float(i) * 2.0;
    float audio = fftBand(bandIndex);
    audioAvg += audio;

    float amplifiedAudio = audio * 7.0;
    vec3 col = 0.5 + 0.5 * cos(iAmplifiedTime + uv.xyx + vec3(float(i), 2.0 * float(i) + 4.0, 4.0 * float(i) + 16.0));

    float lifeOffset = float(i) / 2.0;
    vec2 pos = getPos(iAmplifiedTime, holeLife, float(i) * 4.5, lifeOffset);

    float d = distance(coord, pos) / holeSize;
    d = 1.0 / max(d, 0.0001) - 0.1;

    final += mix(vec3(0.0), col, d) * holeFade(iAmplifiedTime, holeLife, lifeOffset) * amplifiedAudio;
  }

  audioAvg /= float(AUDIO_SAMPLE_COUNT);
  if (audioAvg > 0.1855) {
    vec3 gate = vec3(fftBand(0.0) * 0.75, fftBand(25.0), fftBand(50.0) * 1.5 * audioAvg) * 1.2;
    final = 1.0 - final + final * audioAvg * 14.0 * gate;
  }

  return final;
}

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

float resolveAmplifiedTime() {
  float addToTime = 0.0;
  for (int i = 0; i < AUDIO_SAMPLE_COUNT; i += 1) {
    addToTime += fftBand(1.0 + float(i) * 2.0);
  }
  addToTime /= float(AUDIO_SAMPLE_COUNT);
  return iTime + addToTime;
}
`

const BACKGROUND_PASS_SOURCE = String.raw`void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  iAmplifiedTime = resolveAmplifiedTime();

  vec2 uv = fragCoord / iResolution.xy - 0.5;
  uv.y *= iResolution.y / iResolution.x;

  vec3 swirl = renderSwirl(fragCoord);
  vec3 bursts = renderAudioBursts(fragCoord, uv);
  vec3 volume = renderVolumetric(fragCoord).rgb;
  vec3 background = volume * (bursts * vec3(0.4, 1.0, 1.0) + swirl);

  fragColor = vec4(clamp(background, 0.0, 1.0), 1.0);
}
`

export const SHADER: MusicVisualizerShaderDefinition = {
  id: 'galaxy',
  label: 'Galaxy Background',
  fragmentSource: BACKGROUND_PASS_SOURCE,
  commonSource: COMMON_SOURCE,
  multiPass: {
    commonSource: COMMON_SOURCE,
    passes: [
      {
        id: 'galaxy-image',
        fragmentSource: BACKGROUND_PASS_SOURCE,
        output: 'screen',
        toneMap: true,
        channels: [{ kind: 'audio' }],
      },
    ],
  },
}
