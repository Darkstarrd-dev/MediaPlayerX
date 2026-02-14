export function buildShadertoyFragmentSource(mainImageSource: string): string {
  return `#version 300 es
precision highp float;
precision highp int;

uniform vec3 iResolution;
uniform float iTime;
uniform int iFrame;
uniform sampler2D iChannel0;

out vec4 outColor;

${mainImageSource}

void main() {
  mainImage(outColor, gl_FragCoord.xy);
}
`
}
