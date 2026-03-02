import type {
  MusicVisualizerPluginCustomBinding,
  MusicVisualizerPluginInputBinding,
  MusicVisualizerShaderDefinition,
} from "../../types";
import type { PluginRuntimeUniformBinding } from "../inputBinder";

function computeBindingHash(
  binding: PluginRuntimeUniformBinding,
  customBinding: MusicVisualizerPluginCustomBinding,
): string {
  const token = [
    binding.audioLevelUniform,
    binding.audioBeatUniform,
    binding.timeUniform,
    binding.audioTextureSampler,
    JSON.stringify(customBinding.scalarBindings),
    JSON.stringify(customBinding.scalarTransforms),
    JSON.stringify(customBinding.samplerBindings),
  ].join("|");
  if (!token) {
    return "base";
  }
  let hash = 0;
  for (let index = 0; index < token.length; index += 1) {
    hash = (hash * 31 + token.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16);
}

function cloneBinding(
  binding: PluginRuntimeUniformBinding,
): MusicVisualizerPluginInputBinding {
  return {
    audioLevelUniform: binding.audioLevelUniform,
    audioBeatUniform: binding.audioBeatUniform,
    timeUniform: binding.timeUniform,
    audioTextureSampler: binding.audioTextureSampler,
  };
}

export function adaptShaderForPlugin(
  shader: MusicVisualizerShaderDefinition,
  binding: PluginRuntimeUniformBinding,
  customBinding: MusicVisualizerPluginCustomBinding,
): MusicVisualizerShaderDefinition {
  const hash = computeBindingHash(binding, customBinding);
  return {
    ...shader,
    id: `${shader.id}::plugin::${hash}`,
    label: `${shader.label} [Plugin]`,
    commonSource: shader.commonSource,
    pluginInputBinding: cloneBinding(binding),
    pluginCustomBinding: {
      scalarBindings: { ...customBinding.scalarBindings },
      scalarTransforms: { ...customBinding.scalarTransforms },
      samplerBindings: { ...customBinding.samplerBindings },
    },
    multiPass: shader.multiPass
      ? {
          ...shader.multiPass,
          passes: shader.multiPass.passes.map((pass) => ({ ...pass })),
          textures: shader.multiPass.textures?.map((texture) => ({ ...texture })),
        }
      : undefined,
  };
}
