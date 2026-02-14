import type { MusicVisualizerShaderDefinition } from '../types'

const BACKGROUND_SOURCE = String.raw`#define HSAMPLES 128
#define MSAMPLES 8

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
  vec4 ran = fract(vec4(10.5421, 22.61129, 30.7123, 35.36291) * dot(vec2(0.0149451, 0.038921), fragCoord)) - 0.5;

  vec2 p = (2.0 * (fragCoord + ran.xy) - iResolution.xy) / iResolution.y;
  float t = iTime;
  float dof = dot(p, p);

  vec3 tot = vec3(0.0);
  for (int j = 0; j < MSAMPLES; j += 1)
  {
    float msa = (float(j) + ran.z) / float(MSAMPLES);
    float tim = t + 0.5 * (1.0 / 24.0) * (float(j) + ran.w) / float(MSAMPLES);
    vec2 off = vec2(0.2 * tim, 0.2 * sin(tim * 0.2));

    vec2 q = p + dof * 0.04 * msa * vec2(cos(15.7 * msa), sin(15.7 * msa));
    vec2 r = vec2(length(q), 0.5 + 0.5 * atan(q.y, q.x) / 3.1415927);

    vec3 uv = vec3(0.0);
    for (int i = 0; i < HSAMPLES; i += 1)
    {
      uv.z = (float(i) + ran.x) / float(HSAMPLES - 1);
      float den = max(r.x * (1.0 - 0.6 * uv.z), 0.0007);
      uv.xy = off + vec2(0.2 / den, r.y);
      if (textureLod(iChannel0, uv.xy, 0.0).x < uv.z)
      {
        break;
      }
    }

    float dif = clamp(8.0 * (textureLod(iChannel0, uv.xy, 0.0).x - textureLod(iChannel0, uv.xy + vec2(0.02, 0.0), 0.0).x), 0.0, 1.0);
    vec3 col = vec3(1.0);
    col *= 1.0 - textureLod(iChannel0, uv.xy, 0.0).xyz;
    col = mix(col * 1.2, 1.5 * textureLod(iChannel0, vec2(uv.x * 0.4, 0.1 * sin(2.0 * uv.y * 3.1316)), 0.0).yzx, 1.0 - 0.7 * col);
    col = mix(col, vec3(0.2, 0.1, 0.1), 0.5 - 0.5 * smoothstep(0.0, 0.3, 0.3 - 0.8 * uv.z + texture(iChannel0, 2.0 * uv.xy + uv.z).x));
    col *= 1.0 - 1.3 * uv.z;
    col *= 1.3 - 0.2 * dif;
    col *= exp(-0.35 / (0.0001 + r.x));

    tot += col;
  }

  tot /= float(MSAMPLES);
  tot.x += 0.05;
  tot = 1.05 * pow(tot, vec3(0.6, 1.0, 1.0));

  fragColor = vec4(tot, 1.0);
}
`

const FOREGROUND_SOURCE = String.raw`#define AA (1.5 / iResolution.y)

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

const IMAGE_SOURCE = String.raw`vec3 screenBlend(vec3 base, vec3 layer)
{
  return 1.0 - (1.0 - base) * (1.0 - layer);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
  vec2 uv = fragCoord / iResolution.xy;
  vec3 background = texture(iChannel0, uv).rgb;
  vec3 foreground = texture(iChannel1, uv).rgb;
  vec3 color = screenBlend(background, foreground * 1.2);

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`

export const SHADER: MusicVisualizerShaderDefinition = {
  id: 'tissue',
  label: 'Tissue',
  fragmentSource: IMAGE_SOURCE,
  multiPass: {
    textures: [
      {
        id: 'tissue-noise',
        preset: 'noise-rgb-seamless',
        width: 1024,
        height: 1024,
        filter: 'linear',
        wrap: 'repeat',
        seed: 71,
      },
    ],
    passes: [
      {
        id: 'tissue-background',
        fragmentSource: BACKGROUND_SOURCE,
        output: 'buffer',
        channels: [{ kind: 'texture', textureId: 'tissue-noise' }],
      },
      {
        id: 'tissue-foreground',
        fragmentSource: FOREGROUND_SOURCE,
        output: 'buffer',
        channels: [{ kind: 'audio' }],
      },
      {
        id: 'tissue-image',
        fragmentSource: IMAGE_SOURCE,
        output: 'screen',
        toneMap: true,
        channels: [
          { kind: 'pass', passId: 'tissue-background' },
          { kind: 'pass', passId: 'tissue-foreground' },
        ],
      },
    ],
  },
}
