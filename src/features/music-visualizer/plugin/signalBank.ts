export interface PluginInputBinding {
  audioLevelUniform: string;
  audioBeatUniform: string;
  timeUniform: string;
  audioTextureSampler: string;
}

export interface PluginSignalBank {
  audioLevelSymbol: string;
  audioBeatSymbol: string;
  timeSymbol: string;
  audioTextureSymbol: string;
}

export const DEFAULT_PLUGIN_INPUT_BINDING: PluginInputBinding = {
  audioLevelUniform: "iAudioLevel",
  audioBeatUniform: "iAudioBeat",
  timeUniform: "iTime",
  audioTextureSampler: "iChannel0",
};

function normalizeSymbol(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") {
    return fallback;
  }
  const value = raw.trim().slice(0, 64);
  return value.length > 0 ? value : fallback;
}

export function buildPluginSignalBank(
  binding: Partial<PluginInputBinding> | null | undefined,
): PluginSignalBank {
  return {
    audioLevelSymbol: normalizeSymbol(
      binding?.audioLevelUniform,
      DEFAULT_PLUGIN_INPUT_BINDING.audioLevelUniform,
    ),
    audioBeatSymbol: normalizeSymbol(
      binding?.audioBeatUniform,
      DEFAULT_PLUGIN_INPUT_BINDING.audioBeatUniform,
    ),
    timeSymbol: normalizeSymbol(
      binding?.timeUniform,
      DEFAULT_PLUGIN_INPUT_BINDING.timeUniform,
    ),
    audioTextureSymbol: normalizeSymbol(
      binding?.audioTextureSampler,
      DEFAULT_PLUGIN_INPUT_BINDING.audioTextureSampler,
    ),
  };
}
