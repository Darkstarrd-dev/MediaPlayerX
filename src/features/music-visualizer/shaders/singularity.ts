import type { MusicVisualizerShaderDefinition } from '../types'

export const SHADER: MusicVisualizerShaderDefinition = {
  id: 'singularity',
  label: 'Singularity',
  renderScale: 0.95,
  toneMapStrengthBias: 0.12,
  fragmentSource: String.raw`/*
  Based on "Singularity" by @XorDev
  Source: https://www.shadertoy.com/view/3csSWB

  Behavior contract:
  - Idle/no playback: keep baseline look.
  - Playback: drive brightness + whole-scene zoom.
*/

void mainImage(out vec4 O, vec2 F) {
  float musicAmount = smoothstep(0.03, 0.17, iAudioLevel);
  float beat = smoothstep(0.05, 0.85, iAudioBeat);

  // Keep 1.0 at idle so baseline stays unchanged.
  float zoom = 1.0 + musicAmount * (0.07 + 0.05 * sin(iTime * 2.2 + beat * 6.28318));

  float i = 0.2;
  float a;
  vec2 r = iResolution.xy;
  vec2 p = (F + F - r) / r.y / (0.7 * zoom);
  vec2 d = vec2(-1.0, 1.0);
  vec2 b = p - i * d;
  vec2 c = p * mat2(1.0, 1.0, d / (0.1 + i / dot(b, b)));
  vec2 v = c * mat2(cos(0.5 * log(a = dot(c, c)) + iTime * i + vec4(0.0, 33.0, 11.0, 0.0))) / i;
  vec2 w = vec2(0.0);

  for (; i++ < 9.0; w += 1.0 + sin(v)) {
    v += 0.7 * sin(v.yx * i + iTime) / i + 0.5;
  }

  i = length(sin(v / 0.3) * 0.4 + c * (3.0 + d));
  O = 1.0 - exp(
    -exp(c.x * vec4(0.6, -0.4, -1.0, 0.0))
    / w.xyyx
    / (2.0 + i * i / 4.0 - i)
    / (0.5 + 1.0 / a)
    / (0.03 + abs(length(p) - 0.7))
  );

  // Playback boosts luminosity while keeping HDR range for tone mapping.
  float brightness = 1.0 + musicAmount * (0.20 + beat * 0.36);
  float hdrLift = 1.0 + musicAmount * 0.28 + beat * 0.12;
  vec3 color = O.rgb * brightness;
  color = color / (1.0 + color * (0.08 + 0.18 * beat));
  color *= hdrLift;

  O = vec4(max(color, 0.0), 1.0);
}
`,
}
