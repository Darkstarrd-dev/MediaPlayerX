import type { MusicVisualizerShaderDefinition } from '../types'

export const SHADER: MusicVisualizerShaderDefinition = {
  id: 'fungi',
  label: 'Fungi',
  renderScale: 1,
  fragmentSource: String.raw`vec3 neonPalette(float phase) {
  return 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + phase));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  // Keep the original Shadertoy algorithm as the visual baseline.
  float i = 0.0;
  float d = 0.0;
  float s = 0.0;
  float n = 0.0;
  float t = iTime;
  vec3 p = iResolution;
  vec2 u = (fragCoord - p.xy * 0.5) / p.y;
  vec4 o = vec4(0.0);

  for (o *= i; i++ < 1e2; d += s = 0.01 + abs(s) * 0.8, o += 1.0 / s) {
    p = vec3(u * d, d + t + t);
    p.xy *= mat2(cos(p.z * 0.2 + vec4(0.0, 33.0, 11.0, 0.0)));
    s = sin(p.y + p.x);
    for (n = 1.0; n < 32.0; n += n) {
      s -= abs(dot(cos(0.3 * t + p * n), vec3(0.3))) / n;
    }
  }

  vec3 base = tanh(o.rgb / 20000.0 / length(u));

  // Human-comfort response: no playback keeps original grayscale.
  float musicAmount = smoothstep(0.035, 0.16, iAudioLevel);
  if (musicAmount <= 0.001) {
    fragColor = vec4(clamp(base, 0.0, 1.0), 1.0);
    return;
  }

  float beat = pow(smoothstep(0.05, 0.78, iAudioBeat), 0.78);
  float huePhase = iTime * (0.060 + musicAmount * 0.080) + d * 0.0013 + dot(u, u) * 0.28 + beat * 0.22;
  vec3 neon = neonPalette(huePhase);

  // Increase chroma while keeping gradient continuity.
  neon = mix(neon, neon * neon * (3.0 - 2.0 * neon), 0.45);

  vec3 tint = 0.44 + neon * 0.92;
  vec3 neonColor = base * tint * (1.05 + musicAmount * 0.35);
  vec3 color = mix(base, neonColor, musicAmount * 0.90);

  // Pulse boosts mostly highlight and mid-tone structures to avoid full-screen strobe.
  float midMask = smoothstep(0.10, 0.80, base.r);
  float coreMask = smoothstep(0.18, 0.84, base.r) * (1.0 - smoothstep(0.88, 1.14, base.r));
  float coreShield = smoothstep(0.82, 1.18, base.r);

  // Impact +30% while suppressing center over-exposure.
  float pulseAmp = beat * (0.26 + 0.72 * musicAmount);
  color *= 1.0 + pulseAmp * 0.45 * midMask;
  color += neon * coreMask * pulseAmp * 0.92;
  color *= 1.0 - coreShield * pulseAmp * 0.11;
  color += (neon - 0.5) * midMask * musicAmount * 0.25;
  color += neon * musicAmount * 0.04;

  // Two-stage compression: keep contrast, but protect center from clipping.
  vec3 mildCompressed = color / (1.0 + color * 0.09);
  float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float overExposure = smoothstep(0.84, 1.58, luminance);
  vec3 coreCompressed = color / (1.0 + color * (0.20 + 0.28 * coreShield));
  color = mix(color, mildCompressed, 0.24 + beat * 0.12);
  color = mix(color, coreCompressed, overExposure * (0.58 + 0.30 * coreShield));

  // Restore neon saturation after compression.
  float finalLuma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float saturationBoost = 1.12 + 0.16 * musicAmount;
  color = mix(vec3(finalLuma), color, saturationBoost);

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`,
}
