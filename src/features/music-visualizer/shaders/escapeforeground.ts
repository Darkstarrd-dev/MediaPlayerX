import type { MusicVisualizerShaderDefinition } from '../types'

// Source: https://www.shadertoy.com/view/W3y3Wy

const IMAGE_SOURCE = String.raw`const float XFill = 0.9;
const float BarWidth = 0.0125;
const float YOffset = 0.53;

vec3 bouncingBars(vec2 p) {
  float antiAlias = sqrt(2.0) / iResolution.y;
  float aspectScale = XFill * iResolution.x / iResolution.y;
  vec3 color = vec3(0.0);

  vec2 op = p;
  op.y += YOffset;

  p /= aspectScale;
  p.y += YOffset / aspectScale;

  vec2 normalizedPos = (1.0 + p) * 0.5;
  float barIndex = round(normalizedPos.x / BarWidth) * BarWidth;

  if (barIndex >= 0.0 && barIndex <= 1.0) {
    vec2 localPos = vec2(normalizedPos.x - barIndex, abs(normalizedPos.y - 0.5));
    float sampleX = clamp(barIndex + 0.5 * BarWidth, 0.0, 1.0);
    float amplitude = texture(iChannel0, vec2(sampleX, 0.25)).x;
    float highBandLift = mix(1.0, 3.2, pow(sampleX, 0.75));
    float waveformPulse = abs(texture(iChannel0, vec2(sampleX, 0.75)).x - 0.5) * 2.0;
    amplitude = amplitude * highBandLift + waveformPulse * 0.2;
    amplitude = amplitude * sqrt(sampleX + 0.2) * 2.5 / aspectScale - 0.25;

    localPos.y -= amplitude * 0.3;

    float distanceToBar = aspectScale * ((localPos.y > 0.0 ? length(localPos) : abs(localPos.x)) - BarWidth * 0.4);

    color = mix(
      color,
      (1.0 + sin(abs(p.y) - iTime + 2.0 * p.x + vec3(0.0, 1.0, 2.0))) * (1.25 + sign(p.y)),
      smoothstep(antiAlias, -antiAlias, distanceToBar)
    );
  }

  if (abs(op.y) < 2.0 * antiAlias) {
    color = vec3(2.0);
  }

  if (op.y < 0.0) {
    color -= 0.003 * vec3(1.0, 3.0, 21.0) * op.y;
  }

  return color;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 p = (fragCoord + fragCoord - iResolution.xy) / iResolution.y;
  fragColor = vec4(sqrt(tanh(bouncingBars(p))), 1.0);
}
`

export const SHADER: MusicVisualizerShaderDefinition = {
  id: 'escapeforeground',
  label: 'Bouncing Bars',
  fragmentSource: IMAGE_SOURCE,
}
