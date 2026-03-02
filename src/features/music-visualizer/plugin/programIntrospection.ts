import { buildShadertoyFragmentSource } from "../shadertoyAdapter";
import type { MusicVisualizerShaderDefinition } from "../types";

export interface ShaderProgramIntrospectionPass {
  passId: string;
  scalarUniforms: string[];
  samplerUniforms: string[];
}

export interface ShaderProgramIntrospectionResult {
  passes: ShaderProgramIntrospectionPass[];
  scalarUniforms: string[];
  samplerUniforms: string[];
}

const VERTEX_SHADER_SOURCE = `#version 300 es
precision highp float;
const vec2 FULLSCREEN_TRIANGLE[3] = vec2[3](
  vec2(-1.0, -1.0),
  vec2(3.0, -1.0),
  vec2(-1.0, 3.0)
);
void main() {
  gl_Position = vec4(FULLSCREEN_TRIANGLE[gl_VertexID], 0.0, 1.0);
}
`;

interface InspectPassSource {
  passId: string;
  fragmentSource: string;
  commonSource?: string;
  toneMap?: boolean;
}

function isSamplerType(gl: WebGL2RenderingContext, type: number): boolean {
  return (
    type === gl.SAMPLER_2D ||
    type === gl.SAMPLER_CUBE ||
    type === gl.INT_SAMPLER_2D ||
    type === gl.UNSIGNED_INT_SAMPLER_2D ||
    type === gl.SAMPLER_2D_SHADOW
  );
}

function compileShader(
  gl: WebGL2RenderingContext,
  shaderType: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(shaderType);
  if (!shader) {
    throw new Error("shader_create_failed");
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "shader_compile_failed";
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

function inspectProgramUniforms(
  gl: WebGL2RenderingContext,
  fragmentSource: string,
): { scalarUniforms: string[]; samplerUniforms: string[] } {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    throw new Error("program_create_failed");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  const linkOk = gl.getProgramParameter(program, gl.LINK_STATUS);
  const linkLog = gl.getProgramInfoLog(program) ?? "program_link_failed";

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!linkOk) {
    gl.deleteProgram(program);
    throw new Error(linkLog);
  }

  const activeCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  const scalarUniforms: string[] = [];
  const samplerUniforms: string[] = [];

  for (let index = 0; index < activeCount; index += 1) {
    const info = gl.getActiveUniform(program, index);
    if (!info) {
      continue;
    }
    const name = info.name.replace(/\[0\]$/, "");
    if (isSamplerType(gl, info.type)) {
      samplerUniforms.push(name);
    } else {
      scalarUniforms.push(name);
    }
  }

  gl.deleteProgram(program);
  return {
    scalarUniforms,
    samplerUniforms,
  };
}

function buildInspectPasses(
  shader: MusicVisualizerShaderDefinition,
): InspectPassSource[] {
  if (!shader.multiPass || shader.multiPass.passes.length === 0) {
    return [
      {
        passId: `${shader.id}-image`,
        fragmentSource: shader.fragmentSource,
        commonSource: shader.commonSource,
        toneMap: true,
      },
    ];
  }

  const commonSource = shader.multiPass.commonSource ?? shader.commonSource;
  return shader.multiPass.passes.map((pass, index) => {
    const output =
      pass.output ??
      (index === shader.multiPass!.passes.length - 1 ? "screen" : "buffer");
    return {
      passId: pass.id,
      fragmentSource: pass.fragmentSource,
      commonSource,
      toneMap: pass.toneMap ?? output === "screen",
    };
  });
}

export function inspectShaderPrograms(
  shader: MusicVisualizerShaderDefinition,
): ShaderProgramIntrospectionResult {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2");
  if (!gl) {
    throw new Error("webgl2_unavailable");
  }

  const passes = buildInspectPasses(shader);
  const passReports: ShaderProgramIntrospectionPass[] = [];
  const scalarSet = new Set<string>();
  const samplerSet = new Set<string>();

  for (const pass of passes) {
    const fragmentSource = buildShadertoyFragmentSource(pass.fragmentSource, {
      commonSource: pass.commonSource,
      includeToneMapping: pass.toneMap,
    });
    const report = inspectProgramUniforms(gl, fragmentSource);
    report.scalarUniforms.forEach((name) => scalarSet.add(name));
    report.samplerUniforms.forEach((name) => samplerSet.add(name));
    passReports.push({
      passId: pass.passId,
      scalarUniforms: [...new Set(report.scalarUniforms)].sort(),
      samplerUniforms: [...new Set(report.samplerUniforms)].sort(),
    });
  }

  return {
    passes: passReports,
    scalarUniforms: [...scalarSet].sort(),
    samplerUniforms: [...samplerSet].sort(),
  };
}
