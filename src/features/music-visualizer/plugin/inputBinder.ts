import type { PluginSignalBank } from "./signalBank";

export interface PluginRuntimeUniformBinding {
  audioLevelUniform: string;
  audioBeatUniform: string;
  timeUniform: string;
  audioTextureSampler: string;
}

const GLSL_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function isValidIdentifier(value: string): boolean {
  return GLSL_IDENTIFIER_PATTERN.test(value);
}

export function buildPluginRuntimeUniformBinding(
  signalBank: PluginSignalBank,
): PluginRuntimeUniformBinding {
  const normalize = (raw: string, fallback: string): string => {
    if (!isValidIdentifier(raw)) {
      return fallback;
    }
    return raw;
  };

  return {
    audioLevelUniform: normalize(signalBank.audioLevelSymbol, "iAudioLevel"),
    audioBeatUniform: normalize(signalBank.audioBeatSymbol, "iAudioBeat"),
    timeUniform: normalize(signalBank.timeSymbol, "iTime"),
    audioTextureSampler: normalize(signalBank.audioTextureSymbol, "iChannel0"),
  };
}
