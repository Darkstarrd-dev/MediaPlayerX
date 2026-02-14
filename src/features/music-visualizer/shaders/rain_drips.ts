import type { MusicVisualizerShaderDefinition } from '../types'
import iChannel1TextureUrl from '../../../assets/iChannel1.png'
import iChannel3TextureUrl from '../../../assets/iChannel3.png'

const COMMON_SOURCE = String.raw`#define DEBUG 0

const int COUNT = 256;
const float GRAVITY = 0.01;
const float DROPSIZE = 0.5;
const float DROPJITTER = 0.2;
const int LIFETIME = 300;

float saturate(float x)
{
    return clamp(x, 0.0, 1.0);
}

uint baseHash(uint p)
{
    p = 1103515245U * ((p >> 1U) ^ p);
    uint h32 = 1103515245U * (p ^ (p >> 3U));
    return h32 ^ (h32 >> 16);
}

vec2 hash21(int x)
{
    uint n = baseHash(uint(x));
    uvec2 rz = uvec2(n, n * 48271U);
    return vec2((rz.xy >> 1) & uvec2(0x7fffffffU)) / float(0x7fffffffU);
}

vec2 hash21f(float p)
{
    vec3 p3 = fract(vec3(p) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

float hash11(int x)
{
    uint n = baseHash(uint(x));
    return float(n) * (1.0 / float(0xffffffffU));
}

vec3 buildnormalz(vec2 normal)
{
    return vec3(normal, sqrt(max(1.0 - normal.x * normal.x - normal.y * normal.y, 0.0)));
}

vec4 multisample(sampler2D tex, vec2 uv, float mip, float offset)
{
    vec4 outcol = vec4(0.0);
    outcol += texture(tex, uv + vec2(0.0, 0.0), mip);
    outcol += texture(tex, uv + vec2(offset, offset), mip);
    outcol += texture(tex, uv + vec2(-offset, offset), mip);
    outcol += texture(tex, uv + vec2(offset, -offset), mip);
    outcol += texture(tex, uv + vec2(-offset, -offset), mip);
    return outcol * 0.2;
}
`

const BUFFER_A_SOURCE = String.raw`vec2 writePos(int i, vec2 fragCoord, vec2 value)
{
    if (fragCoord.x == float(i))
    {
        return value;
    }
    return vec2(0.0);
}

float writeLife(int i, vec2 fragCoord, float value)
{
    if (fragCoord.x == float(i))
    {
        return value;
    }
    return 0.0;
}

vec4 loadData(int index)
{
    return texture(iChannel0, vec2((float(index) + 0.5) / iChannelResolution[0].x, 0.0), -100.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 res = iResolution.xy;
    vec2 uv = fragCoord / res;
    vec2 inv = vec2(1.0, res.x / max(res.y, 1.0));

    vec2 pos = vec2(0.0);
    vec4 col = vec4(0.0);
    float radius = DROPSIZE * 0.005;
    float life01 = 1.0 / float(LIFETIME);
    float life = 0.0;

    if (fragCoord.y < 2.0)
    {
        for (int i = 0; i < COUNT - 1; ++i)
        {
            float perInstanceRandom = hash11(i);
            if (iFrame == 0)
            {
                pos += writePos(i, floor(fragCoord), hash21f(float(i) + iDate.x + iDate.y + iDate.z + iDate.w));
                life += writeLife(i, floor(fragCoord), perInstanceRandom * 121.317);
            }
            else
            {
                float rndgrav = -GRAVITY * pow(0.7 + 0.3 * sin(perInstanceRandom * 15.0 + iTime * 0.05), 2.0);
                pos += writePos(i, floor(fragCoord), (hash21(i * COUNT + int(iTime * 60.0)) * 2.0 - 1.0) * DROPJITTER * inv * rndgrav + vec2(0.0, rndgrav));
                life += writeLife(i, floor(fragCoord), life01 / max(abs(pos.y * 10.0), 0.0001) * 0.01);
            }
        }
        float vel = pos.y;
        pos = fract(texture(iChannel0, uv).xy + pos);
        life = fract(texture(iChannel0, uv).z + life);
        fragColor = vec4(pos, life, vel);
    }
    else
    {
        for (int i = 0; i < COUNT - 1; ++i)
        {
            vec4 get = loadData(i);
            vec2 uvscale = (uv - get.xy) / vec2(2.0, 4.0) + get.xy;
            float mask = 1.0 - saturate(distance(get.xy, uvscale) / radius);
            mask *= smoothstep(0.9, 0.95, get.z);
            vec2 normal = normalize(get.xy - uvscale) * (1.0 - mask) * ceil(mask);
            mask = ceil(mask);
            col.xy += normal;
            col.w = max(col.w, mask);
        }
        fragColor = col;
    }
}
`

const BUFFER_B_SOURCE = String.raw`void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 res = iResolution.xy;
    vec2 uv = fragCoord / res;
    vec2 inv = vec2(1.0, res.y / max(res.x, 1.0));

    vec4 bufA = multisample(iChannel0, uv, 0.0, 0.0005);
    vec2 uvoffset = (texture(iChannel2, uv * inv * 0.5).xy * 2.0 - 1.0) * 0.00005;
    vec4 bufB = multisample(iChannel1, uv + uvoffset, 0.0, 0.001);

    fragColor = mix(bufB * 0.98, bufA, bufA.w);
    fragColor.z = dot(texture(iChannel3, uv * vec2(9.0, 6.0)).xyz, vec3(0.3, 0.6, 0.1)) * 0.5;
    fragColor.z += smoothstep(0.0, 1.0, abs(sin(uv.x * 120.0))) * 0.2;
}
`

const IMAGE_PASS_SOURCE = String.raw`#define heightMap iChannel0
#define heightMapResolution iChannelResolution[0]
#define textureOffset 1.0

float bnoise(vec2 uv)
{
    return texture(iChannel3, uv).x * 2.0 - 1.0;
}

vec2 texNormalMap(in vec2 uv)
{
    vec2 s = 1.0 / heightMapResolution.xy;
    float p = texture(heightMap, uv).z;
    float h1 = texture(heightMap, uv + s * vec2(textureOffset, 0.0)).z;
    float v1 = texture(heightMap, uv + s * vec2(0.0, textureOffset)).z;
    return p - vec2(h1, v1);
}

const float FOREGROUND_SCALE = 0.84;
const float OUTER_RING_RESPONSE_GAIN = 2.5;
const float FG_PI = 3.141592;

vec3 drawWaveForeground(in vec2 uv)
{
    float downsizeX = 2.5;
    vec2 scaledUv = uv;
    scaledUv.x = (scaledUv.x * downsizeX) - (downsizeX - 1.0) * 0.5;
    float downsizeY = 7.5;
    scaledUv.y = (scaledUv.y * downsizeY) - (downsizeY - 1.0) * 0.5;

    int tx = int(clamp(scaledUv.x, 0.0, 1.0) * 511.0);
    float wave = texelFetch(iChannel2, ivec2(tx, 1), 0).x;

    float waveThickness = pow(abs(wave - 0.5), 0.6) * 3.0;
    vec3 waveCol = vec3(1.0 - smoothstep(0.0, waveThickness, abs(wave - scaledUv.y)));

    float xColorSpeed = 1.2;
    float xColor1 = cos(iTime * xColorSpeed + FG_PI * scaledUv.x) * 0.5 + 0.5;
    float xColor2 = cos(iTime * xColorSpeed + FG_PI * scaledUv.x + FG_PI * 0.25) * 0.5 + 0.5;
    float xColor3 = 1.0 - xColor2;
    waveCol *= vec3(waveCol.x * xColor3, waveCol.x * xColor2, waveCol.x * xColor1);
    waveCol *= 1.2;

    float lineThickness = 0.02;
    float lineIsInXRange = float(scaledUv.x > 0.0 && scaledUv.x < 1.0);
    float lineIsInYRange = float(scaledUv.y > (0.5 - lineThickness) && scaledUv.y < (0.5 + lineThickness));
    float lineCol = 1.0 * lineIsInXRange * lineIsInYRange;

    vec3 col = lineCol > 0.0 ? vec3(1.0) : waveCol;

    float fade = 0.2;
    col *= smoothstep(0.0, fade, scaledUv.x) * (1.0 - smoothstep(1.0 - fade, 1.0, scaledUv.x));

    return col;
}

vec3 drawFreqForeground(const vec2 uv, vec2 fragCoord)
{
    vec2 centeredUv = (fragCoord.xy - iResolution.xy * 0.5) / max(iResolution.x, iResolution.y);
    float r = sqrt(centeredUv.x * centeredUv.x + centeredUv.y * centeredUv.y);
    float theta = atan(centeredUv.y, centeredUv.x);
    theta = theta / (2.0 * FG_PI) + 0.5;

    float nBands = 128.0;
    float intBand = floor(theta * nBands);
    float fractBand = fract(theta * nBands);

    int tx = int(clamp(intBand / nBands, 0.0, 1.0) * 511.0);
    float fft = texelFetch(iChannel2, ivec2(tx, 0), 0).x;

    float circleMinRadius = 0.24;
    float circleMaxRadius = 0.30;
    float bandWidth = 0.1;
    bandWidth += 0.3 * abs(cos(iTime * 0.4 + FG_PI * theta));
    float freqAmount = circleMinRadius + (circleMaxRadius - circleMinRadius) * fft * OUTER_RING_RESPONSE_GAIN;
    float isInBandRange = float(fractBand < bandWidth && r > circleMinRadius && r < freqAmount);
    vec3 freqColor = vec3(1.0) * isInBandRange;

    float xColorSpeed = 1.2;
    float xColor1 = cos(iTime * xColorSpeed + FG_PI * theta) * 0.5 + 0.5;
    float xColor2 = cos(iTime * xColorSpeed + FG_PI * theta + FG_PI * 0.25) * 0.5 + 0.5;
    float xColor3 = 1.0 - xColor2;
    freqColor *= vec3(xColor1, xColor2, xColor3);

    float lineThickness = 0.003;
    vec3 lineColor = vec3(float(r > circleMinRadius && r < circleMinRadius + lineThickness));

    return freqColor + lineColor;
}

vec3 screenBlend(vec3 base, vec3 layer)
{
    return 1.0 - (1.0 - base) * (1.0 - layer);
}

vec3 drawAudioForegroundScaled(vec2 fragCoord, vec2 resolution)
{
    vec2 uv = fragCoord / resolution;
    vec2 scaledUv = (uv - 0.5) / FOREGROUND_SCALE + 0.5;
    vec2 scaledFragCoord = scaledUv * resolution;

    float inBounds =
        step(0.0, scaledUv.x) * step(scaledUv.x, 1.0) *
        step(0.0, scaledUv.y) * step(scaledUv.y, 1.0);

    float edgeFade =
        smoothstep(0.0, 0.03, scaledUv.x) *
        smoothstep(0.0, 0.03, scaledUv.y) *
        (1.0 - smoothstep(0.97, 1.0, scaledUv.x)) *
        (1.0 - smoothstep(0.97, 1.0, scaledUv.y));

    vec3 col = vec3(0.0);
    col += drawFreqForeground(scaledUv, scaledFragCoord);
    col += drawWaveForeground(scaledUv);

    return col * inBounds * edgeFade;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 res = iResolution.xy;
    vec2 invres = 1.0 / res;
    vec2 uv = fragCoord / res;
    uv = ((uv - 0.5) * (0.85 + sin(iTime * 0.33) * 0.05)) + 0.5;
    vec2 uvoffset = vec2(sin(iTime * 0.2), cos(iTime * 0.4)) * 0.02;
    uvoffset += vec2(cos(iTime * 0.5), sin(iTime * 0.3)) * 0.01;
    uv += uvoffset;

    float noise = bnoise(fragCoord / vec2(1024.0));
    vec4 bufB = texture(iChannel0, uv);
    bufB.xy *= -1.0;

    vec2 bguv = ((fragCoord / res - 0.5) * 0.85 + 0.5);
    vec2 windowN = texNormalMap(uv) / (invres.x * 2000.0);

    vec3 drops = texture(iChannel1, bguv + bufB.xy * -0.1 + windowN, 2.0).xyz;
    vec3 hazyglass = multisample(iChannel1, bguv + windowN, (1.0 - bufB.w) * 5.0, 0.05 + 0.0006 * noise).xyz;

    float spec = saturate(dot(normalize(vec3(-vec2(bufB.xy * -0.1 + windowN) * 10.0, 1.0)), normalize(vec3((uv - vec2(sin(iTime * 0.3) * 2.0 + 0.5, 0.2)) * vec2(1.0, 0.5), 1.0))));
    spec = pow(smoothstep(0.9, 1.0, spec), bufB.w * 100.0 + 60.0);
    spec *= bufB.w + 0.1;

    if (DEBUG != 1)
    {
        float vignette = distance(fragCoord / res, vec2(0.5)) * 2.0 + 0.5;
        fragColor.rgb = pow(mix(hazyglass, drops, smoothstep(0.8, 0.9, bufB.w)), vec3(1.2, 1.3, 2.5) * vignette);
        fragColor.rgb += spec * vec3(0.5, 0.0, 0.0);

        float musicAmount = smoothstep(0.03, 0.18, iAudioLevel);
        float beat = smoothstep(0.05, 0.82, iAudioBeat);
        float brightnessBoost = musicAmount * 0.16 + beat * 0.24;
        float luminance = dot(fragColor.rgb, vec3(0.2126, 0.7152, 0.0722));
        float highlightMask = smoothstep(0.08, 0.90, luminance);
        float dropletMask = smoothstep(0.05, 1.0, bufB.w);
        float responseMask = max(highlightMask, dropletMask * 0.92);

        fragColor.rgb += fragColor.rgb * brightnessBoost * (0.22 + 0.78 * responseMask);
        fragColor.rgb = fragColor.rgb / (1.0 + fragColor.rgb * (0.12 + beat * 0.08));

        vec3 foreground = drawAudioForegroundScaled(fragCoord, res);
        foreground *= 0.95;
        fragColor.rgb = screenBlend(fragColor.rgb, foreground);
    }
    else
    {
        float time = fract(iTime * 0.25);
        if (time < 0.25)
        {
            fragColor.rgb = buildnormalz(bufB.xy) * vec3(0.5) + vec3(0.5);
        }
        else if (time < 0.5)
        {
            fragColor.rgb = buildnormalz(texture(iChannel2, uv).xy) * vec3(0.5) + vec3(0.5);
        }
        else if (time < 0.75)
        {
            fragColor.rgb = vec3(bufB.w);
        }
        else
        {
            fragColor.rgb = vec3(texture(iChannel2, uv).w);
        }
    }

    fragColor.a = 1.0;
}
`

export const SHADER: MusicVisualizerShaderDefinition = {
  id: 'rain-drips',
  label: 'Rain Drips',
  renderScale: 1,
  fragmentSource: IMAGE_PASS_SOURCE,
  commonSource: COMMON_SOURCE,
  multiPass: {
    commonSource: COMMON_SOURCE,
    textures: [
      {
        id: 'rain-distort',
        preset: 'noise-rg',
        width: 512,
        height: 512,
        filter: 'linear',
        wrap: 'repeat',
        seed: 17,
      },
      {
        id: 'rain-glass',
        preset: 'noise-rgb',
        width: 1024,
        height: 1024,
        sourceUrl: iChannel3TextureUrl,
        filter: 'linear',
        wrap: 'repeat',
        seed: 29,
      },
      {
        id: 'rain-bg',
        preset: 'rain-bg',
        width: 1024,
        height: 1024,
        sourceUrl: iChannel1TextureUrl,
        filter: 'linear',
        wrap: 'repeat',
        seed: 43,
      },
    ],
    passes: [
      {
        id: 'buffer-a',
        fragmentSource: BUFFER_A_SOURCE,
        output: 'buffer',
        channels: [{ kind: 'pass', passId: 'buffer-a', feedback: true }],
      },
      {
        id: 'buffer-b',
        fragmentSource: BUFFER_B_SOURCE,
        output: 'buffer',
        channels: [
          { kind: 'pass', passId: 'buffer-a' },
          { kind: 'pass', passId: 'buffer-b', feedback: true },
          { kind: 'texture', textureId: 'rain-distort' },
          { kind: 'texture', textureId: 'rain-glass' },
        ],
      },
      {
        id: 'image',
        fragmentSource: IMAGE_PASS_SOURCE,
        output: 'screen',
        toneMap: true,
        channels: [
          { kind: 'pass', passId: 'buffer-b' },
          { kind: 'texture', textureId: 'rain-bg' },
          { kind: 'audio' },
          { kind: 'texture', textureId: 'rain-glass' },
        ],
      },
    ],
  },
}
