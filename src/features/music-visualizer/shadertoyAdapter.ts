interface BuildShadertoyFragmentSourceOptions {
  commonSource?: string
  includeToneMapping?: boolean
}

export function buildShadertoyFragmentSource(
  mainImageSource: string,
  options: BuildShadertoyFragmentSourceOptions = {},
): string {
  const includeToneMapping = options.includeToneMapping ?? true
  const commonSource = options.commonSource ? `${options.commonSource}\n\n` : ''

  const toneMapFunctions = includeToneMapping
    ? `
vec3 toneMapReinhard(vec3 value) {
  return value / (vec3(1.0) + value);
}

vec3 toneMapAces(vec3 value) {
  const float a = 2.51;
  const float b = 0.03;
  const float c = 2.43;
  const float d = 0.59;
  const float e = 0.14;
  return clamp((value * (a * value + b)) / (value * (c * value + d) + e), 0.0, 1.0);
}

vec3 toneMapFilmic(vec3 value) {
  vec3 x = max(value - vec3(0.004), vec3(0.0));
  return clamp((x * (6.2 * x + 0.5)) / (x * (6.2 * x + 1.7) + 0.06), 0.0, 1.0);
}

vec3 toneMapAgx(vec3 value) {
  vec3 x = max(value, vec3(0.0));
  vec3 compressed = x / (vec3(1.0) + x);
  vec3 contrast = pow(compressed, vec3(1.15));
  vec3 mapped = contrast * (2.51 - 1.67 * contrast + 0.30 * contrast * contrast);
  return clamp(mapped, 0.0, 1.0);
}

vec3 toneMapKhronos(vec3 value) {
  vec3 x = max(value, vec3(0.0));
  vec3 numerator = x * (x + 0.0245786) - 0.000090537;
  vec3 denominator = x * (0.983729 * x + 0.4329510) + 0.238081;
  return clamp(numerator / max(denominator, vec3(0.000001)), 0.0, 1.0);
}

vec3 applyToneMapping(vec3 color) {
  float strength = clamp(iToneMapStrength, 0.0, 1.0);
  if (iToneMapMode == 0 || strength <= 0.0001) {
    return color;
  }

  vec3 exposed = max(color, vec3(0.0)) * max(iToneMapExposure, 0.001);
  vec3 mapped = exposed;
  if (iToneMapMode == 1) {
    mapped = toneMapReinhard(exposed);
  } else if (iToneMapMode == 2) {
    mapped = toneMapAces(exposed);
  } else if (iToneMapMode == 3) {
    mapped = toneMapFilmic(exposed);
  } else if (iToneMapMode == 4) {
    mapped = toneMapAgx(exposed);
  } else if (iToneMapMode == 5) {
    mapped = toneMapKhronos(exposed);
  }
  return mix(color, mapped, strength);
}
`
    : ''

  const outputColorLine = includeToneMapping
    ? '  outColor = vec4(applyToneMapping(rawColor.rgb), rawColor.a);'
    : '  outColor = rawColor;'

  return `#version 300 es
precision highp float;
precision highp int;

uniform vec3 iResolution;
uniform float iTime;
uniform int iFrame;
uniform vec4 iDate;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D iChannel2;
uniform sampler2D iChannel3;
uniform vec3 iChannelResolution[4];
uniform float iAudioLevel;
uniform float iAudioBeat;
uniform int iToneMapMode;
uniform float iToneMapExposure;
uniform float iToneMapStrength;
uniform vec2 iForegroundOffset;
uniform float iForegroundScale;
uniform int iCompositeMode;
uniform int iThemeMode;
uniform vec3 iThemeBackgroundColor;

out vec4 outColor;

${toneMapFunctions}

${commonSource}

${mainImageSource}

void main() {
  vec4 rawColor = vec4(0.0);
  mainImage(rawColor, gl_FragCoord.xy);
${outputColorLine}
}
`
}
