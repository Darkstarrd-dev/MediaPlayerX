import tissueIChannel0 from '../../../assets/iChannel1.png'
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
    col *= mix(vec3(1.10, 0.86, 1.05), vec3(0.70, 0.36, 0.50), smoothstep(0.12, 1.0, uv.z));
    col *= 1.0 - 1.3 * uv.z;
    col *= 1.3 - 0.2 * dif;
    col *= exp(-0.35 / (0.0001 + r.x));

    tot += col;
  }

  tot /= float(MSAMPLES);
  tot.x += 0.06;
  tot = 1.08 * pow(tot, vec3(0.58, 0.90, 0.86));
  tot *= vec3(1.16, 0.84, 0.98);

  fragColor = vec4(tot, 1.0);
}
`

export const SHADER: MusicVisualizerShaderDefinition = {
  id: 'tissue',
  label: 'Tissue',
  fragmentSource: BACKGROUND_SOURCE,
  multiPass: {
    textures: [
      {
        id: 'tissue-noise',
        preset: 'noise-rgb',
        width: 1024,
        height: 1024,
        sourceUrl: tissueIChannel0,
        filter: 'linear',
        wrap: 'repeat',
        seed: 71,
      },
    ],
    passes: [
      {
        id: 'tissue-image',
        fragmentSource: BACKGROUND_SOURCE,
        output: 'screen',
        toneMap: true,
        channels: [{ kind: 'texture', textureId: 'tissue-noise' }],
      },
    ],
  },
}
