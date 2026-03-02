import type {
  UseMusicVisualizerRuntimeParams,
  UseMusicVisualizerRuntimeResult,
} from "./useMusicVisualizerRuntime";
import type { MusicVisualizerShaderDefinition } from "./types";
import {
  resolveDefaultMusicVisualizerShader,
  resolveMusicVisualizerShaderById,
} from "./shaderRegistry";
import { adaptShaderForPlugin } from "./plugin/adapters/shaderAdapter";
import { buildPluginRuntimeUniformBinding } from "./plugin/inputBinder";
import { buildPluginSignalBank } from "./plugin/signalBank";

export interface UseMusicVisualizerPluginRuntimeResult
  extends UseMusicVisualizerRuntimeResult {
  fatal: boolean;
  bridgeToLegacy: boolean;
  bridgeShaderOverride: MusicVisualizerShaderDefinition | null;
}

export function useMusicVisualizerPluginRuntime(
  params: UseMusicVisualizerRuntimeParams,
): UseMusicVisualizerPluginRuntimeResult {
  if (!params.active) {
    return {
      stats: null,
      activeBackend: null,
      runtimeError: null,
      resumeAudioAnalyser: async () => undefined,
      fatal: false,
      bridgeToLegacy: false,
      bridgeShaderOverride: null,
    };
  }

  const defaultShader = resolveDefaultMusicVisualizerShader();
  const baseShader =
    resolveMusicVisualizerShaderById(params.selectedShaderId) ??
    defaultShader ??
    null;
  if (!baseShader) {
    return {
      stats: null,
      activeBackend: null,
      runtimeError: "Plugin 模式未找到可用 Shader，已回退。",
      resumeAudioAnalyser: async () => undefined,
      fatal: true,
      bridgeToLegacy: false,
      bridgeShaderOverride: null,
    };
  }

  const signalBank = buildPluginSignalBank(params.pluginInputBinding);
  const runtimeBinding = buildPluginRuntimeUniformBinding(signalBank);
  const customBinding = params.pluginCustomBinding ?? {
    scalarBindings: {},
    scalarTransforms: {},
    samplerBindings: {},
  };
  const adaptedShader = adaptShaderForPlugin(
    baseShader,
    runtimeBinding,
    customBinding,
  );

  return {
    stats: null,
    activeBackend: null,
    runtimeError: null,
    resumeAudioAnalyser: async () => undefined,
    fatal: false,
    bridgeToLegacy: true,
    bridgeShaderOverride: adaptedShader,
  };
}
