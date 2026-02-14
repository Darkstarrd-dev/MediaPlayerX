import type { MusicVisualizerShaderDefinition } from '../types'

export const SHADER: MusicVisualizerShaderDefinition = {
  id: 'nebula',
  label: 'Nebula',
  fragmentSource: String.raw`#define PI 3.141592654

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

const int NEBULA_NUM_RAYS = 50;
const int NEBULA_VOLUMETRIC_STEPS = 19;
const int NEBULA_MAX_ITER = 35;
const float NEBULA_FAR = 6.0;

float iAmplifiedTime = 0.0;
vec4 nebulaBands = vec4(0.0);

float fftBand(float index) {
  int bin = int(clamp(index, 0.0, 511.0));
  return pow(texelFetch(iChannel0, ivec2(bin, 0), 0).r, 5.0);
}

float audioBand(float normalizedPos) {
  float x = clamp(normalizedPos, 0.001, 0.999);
  return texture(iChannel0, vec2(x, 0.25)).r;
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

float hashScalar(float n) {
  return fract(sin(n) * 43758.5453);
}

mat2 mm2(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}

float noise3(vec3 p) {
  vec3 ip = floor(p);
  vec3 fp = fract(p);
  fp = fp * fp * (3.0 - 2.0 * fp);

  float n = dot(ip, vec3(1.0, 57.0, 113.0));
  float a = hashScalar(n + 0.0);
  float b = hashScalar(n + 1.0);
  float c = hashScalar(n + 57.0);
  float d = hashScalar(n + 58.0);
  float e = hashScalar(n + 113.0);
  float f = hashScalar(n + 114.0);
  float g = hashScalar(n + 170.0);
  float h = hashScalar(n + 171.0);

  return mix(
    mix(mix(a, b, fp.x), mix(c, d, fp.x), fp.y),
    mix(mix(e, f, fp.x), mix(g, h, fp.x), fp.y),
    fp.z
  );
}

float snd() {
  nebulaBands = vec4(
    audioBand(0.02),
    audioBand(0.08),
    audioBand(0.16),
    audioBand(0.28)
  );

  float h = nebulaBands.x;
  h += nebulaBands.y * 0.5;
  h += nebulaBands.z * 0.3;
  h += nebulaBands.w * 0.2;
  return h;
}

vec3 foregroundBackground(vec2 uv) {
  float d = length(uv - vec2(0.0, 0.2));
  vec3 col = vec3(1.0, 0.4, 0.3);
  col *= smoothstep(0.8, 0.0, d) * 1.5 * (fftBand(50.0) * 0.5);
  return col;
}

mat3 m3 = mat3(
   0.00,  0.80,  0.60,
  -0.80,  0.36, -0.48,
  -0.60, -0.48,  0.64
);

float flow(vec3 p, float t) {
  float z = 2.0;
  float rz = 0.0;
  vec3 bp = p;
  for (int i = 1; i < 5; i += 1) {
    p += iAmplifiedTime * 0.1;
    rz += (sin(noise3(p + t * 0.8) * 6.0) * 0.5 + 0.5) / z;
    p = mix(bp, p, 0.6);
    z *= 2.0;
    p *= 2.01;
    p *= m3;
  }
  return rz;
}

float sins(float x) {
  float rz = 0.0;
  float z = 2.0;
  for (int i = 0; i < 3; i += 1) {
    rz += abs(fract(x * 1.4) - 0.5) / z;
    x *= 1.3;
    z *= 1.15;
    x -= iAmplifiedTime * 0.65 * z;
  }
  return rz;
}

float segm(vec3 p, vec3 a, vec3 b) {
  vec3 pa = p - a;
  vec3 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) * 0.5;
}

vec3 path(float i, float d) {
  vec3 en = vec3(0.0, 0.0, 1.0);
  float sns2 = sins(d + i * 0.5) * 0.22;
  float sns = sins(d + i * 0.6) * 0.21;
  en.xz *= mm2((hashScalar(i * 10.569) - 0.5) * 6.2 + sns2);
  en.xy *= mm2((hashScalar(i * 4.732) - 0.5) * 6.2 + sns);
  return en;
}

vec2 mapForeground(vec3 p, float i) {
  float lp = length(p);
  vec3 bg = vec3(0.0);
  vec3 en = path(i, lp);

  float ins = smoothstep(0.11, 0.46, lp);
  float outs = 0.15 + smoothstep(0.0, 0.15, abs(lp - 1.0));
  p *= ins * outs;

  float rz = segm(p, bg, en) - 0.011;
  return vec2(rz, ins * outs);
}

float marchForeground(vec3 ro, vec3 rd, float startf, float maxd, float j) {
  float precis = 0.001;
  float h = 0.5;
  float d = startf;
  for (int i = 0; i < NEBULA_MAX_ITER; i += 1) {
    if (abs(h) < precis || d > maxd) {
      break;
    }
    d += h * 1.2;
    float stepAudio = audioBand((float(i) + 1.0) / float(NEBULA_MAX_ITER + 1));
    float res = mapForeground(ro + rd * d, j).x * (0.6 + stepAudio * 1.5);
    h = res;
  }
  return d;
}

vec3 vmarchForeground(vec3 ro, vec3 rd, float j, vec3 orig) {
  vec3 p = ro;
  vec3 sum = vec3(0.0);

  for (int i = 0; i < NEBULA_VOLUMETRIC_STEPS; i += 1) {
    vec2 r = mapForeground(p, j);
    p += rd * 0.03;
    float lp = length(p);

    vec3 col = sin(vec3(1.05, 2.5, 1.52) * 3.94 + r.y) * 0.85 + 0.4 * snd();
    col *= smoothstep(0.0, 0.015, -r.x);
    col *= smoothstep(0.04, 0.2, abs(lp - 1.1));
    col *= smoothstep(0.1, 0.34, lp);

    float jitter = 1.2 - noise3(vec3(lp * 2.0 + j * 13.0 + iAmplifiedTime * 5.0, j, float(i))) * 1.1;
    float denom = max(log(max(distance(p, orig) - 2.0, 0.001)) + 0.75, 0.05);
    sum += abs(col) * 5.0 * jitter / denom;
  }

  return sum * snd();
}

vec2 iSphere2(vec3 ro, vec3 rd) {
  vec3 oc = ro;
  float b = dot(oc, rd);
  float c = dot(oc, oc) - 1.0;
  float h = b * b - c;
  if (h < 0.0) {
    return vec2(-1.0);
  }
  return vec2(-b - sqrt(h), -b + sqrt(h));
}

vec3 renderForeground(vec2 fragCoord) {
  vec2 p = fragCoord / iResolution.xy - 0.5;
  p.x *= iResolution.x / iResolution.y;

  vec2 um = vec2(sin(iAmplifiedTime * 0.31), cos(iAmplifiedTime * 0.27)) * 0.08;

  vec3 ro = vec3(0.0, 0.0, 5.0);
  vec3 rd = normalize(vec3(p * 0.7, -1.5));

  mat2 mx = mm2(iAmplifiedTime * 0.44 + um.x * 6.0);
  mat2 my = mm2(iAmplifiedTime * 0.33 + um.y * 6.0);
  ro.xz *= mx;
  rd.xz *= mx;
  ro.xy *= my;
  rd.xy *= my;

  vec3 bro = ro;
  vec3 brd = rd;

  vec3 col = vec3(0.0125, 0.0, 0.025);

  for (int j = 1; j <= NEBULA_NUM_RAYS; j += 1) {
    float fj = float(j);
    float rayAmp = audioBand((fj + 2.0) / float(NEBULA_NUM_RAYS + 4));
    if (rayAmp < 0.01) {
      continue;
    }

    ro = bro;
    rd = brd;
    mat2 mm = mm2((iAmplifiedTime * 0.1 + ((fj + 1.0) * 5.1)) * fj * 0.25);
    ro.xy *= mm;
    rd.xy *= mm;
    ro.xz *= mm;
    rd.xz *= mm;

    float rz = marchForeground(ro, rd, 2.5, NEBULA_FAR, fj);
    if (rz >= NEBULA_FAR) {
      continue;
    }

    vec3 pos = ro + rz * rd;
    vec3 rayCol = vmarchForeground(pos, rd, fj, bro) * (0.7 + rayAmp * 2.0);
    col = max(col, rayCol);
  }

  ro = bro;
  rd = brd;
  vec2 sph = iSphere2(ro, rd);

  if (sph.x > 0.0) {
    vec3 pos = ro + rd * sph.x;
    vec3 pos2 = ro + rd * sph.y;
    vec3 rf = reflect(rd, pos);
    vec3 rf2 = reflect(rd, pos2);
    float nz = -log(max(abs(flow(rf * 1.2, iAmplifiedTime) - 0.01), 0.0001));
    float nz2 = -log(max(abs(flow(rf2 * 1.2, -iAmplifiedTime) - 0.01), 0.0001));
    col += (0.1 * nz * nz * vec3(0.12, 0.12, 0.5) + 0.05 * nz2 * nz2 * vec3(0.55, 0.2, 0.55)) * 0.8;
  }

  p.y = -p.y;
  vec3 bgCol = foregroundBackground(p);
  col *= (0.3 + bgCol * 10.5);
  col += bgCol;

  return clamp(col * 1.3, 0.0, 3.0);
}

vec3 screenBlend(vec3 base, vec3 highlight) {
  return 1.0 - (1.0 - base) * (1.0 - highlight);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  float addToTime = 0.0;
  for (int i = 0; i < AUDIO_SAMPLE_COUNT; i += 1) {
    addToTime += fftBand(1.0 + float(i) * 2.0);
  }
  addToTime /= float(AUDIO_SAMPLE_COUNT);
  iAmplifiedTime = iTime + addToTime;

  vec2 uv = fragCoord / iResolution.xy - 0.5;
  uv.y *= iResolution.y / iResolution.x;

  vec3 swirl = renderSwirl(fragCoord);
  vec3 bursts = renderAudioBursts(fragCoord, uv);
  vec3 volume = renderVolumetric(fragCoord).rgb;

  vec3 coreBackground = volume * (bursts * vec3(0.4, 1.0, 1.0) + swirl);
  float bgEnergy = max(max(coreBackground.r, coreBackground.g), coreBackground.b);
  float bgMask = smoothstep(0.05, 0.35, bgEnergy);
  vec3 background = max(coreBackground * bgMask - vec3(0.015), vec3(0.0));

  vec3 foreground = renderForeground(fragCoord);

  float fgEnergy = max(max(foreground.r, foreground.g), foreground.b);
  float fgMask = smoothstep(0.08, 0.35, fgEnergy);
  vec3 color = mix(background, screenBlend(background, foreground), fgMask);

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`,
}
