import type { RefObject } from "react";

import type {
  MusicVisualizerPluginCustomBinding,
  MusicVisualizerPluginInputBinding,
  MusicVisualizerRendererMode,
  MusicVisualizerShaderDefinition,
  MusicVisualizerStats,
  MusicVisualizerToneMapMode,
} from "./types";

export interface UseMusicVisualizerRuntimeParams {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  cpuCanvasRef?: RefObject<HTMLCanvasElement | null>;
  audioRef: RefObject<HTMLAudioElement | null>;
  canvasInstanceVersion?: number;
  active: boolean;
  playbackPaused?: boolean;
  playbackResetNonce?: number;
  preferredRenderer: MusicVisualizerRendererMode;
  renderLongEdgePx: number;
  fpsCap: 30 | 60 | 120;
  toneMapMode: MusicVisualizerToneMapMode;
  toneMapExposure: number;
  toneMapStrength: number;
  selectedShaderId: string | null;
  renderScaleCoeff?: number;
  layeredBackgroundShaderId?: string | null;
  layeredForegroundShaderId?: string | null;
  layeredBackgroundEnabled?: boolean;
  layeredForegroundEnabled?: boolean;
  layeredBackgroundRenderScaleCoeff?: number;
  layeredForegroundRenderScaleCoeff?: number;
  layeredForegroundOffsetX?: number;
  layeredForegroundOffsetY?: number;
  layeredForegroundScale?: number;
  paletteMode?: "day" | "night";
  disableAudioAnalyser?: boolean;
  externalAudioFrame?: {
    frequencyData: Uint8Array;
    waveformData: Uint8Array;
    audioLevel: number;
    audioBeat: number;
  } | null;
  pluginInputBinding?: MusicVisualizerPluginInputBinding | null;
  pluginCustomBinding?: MusicVisualizerPluginCustomBinding | null;
  resolvedShaderOverride?: MusicVisualizerShaderDefinition | null;
  mode?: "legacy" | "plugin";
}

export interface UseMusicVisualizerRuntimeResult {
  stats: MusicVisualizerStats | null;
  activeBackend: MusicVisualizerRendererMode | null;
  runtimeError: string | null;
  resumeAudioAnalyser: () => Promise<void>;
}
