import { z } from "zod";

export const browserModeSchema = z.enum(["image", "video", "music"]);

export const searchFieldSchema = z.enum([
  "all",
  "name",
  "workTitle",
  "circle",
  "author",
  "tags",
]);

export const musicVisualizerFpsCapSchema = z.union([
  z.literal(30),
  z.literal(60),
  z.literal(120),
]);
export const musicVisualizerToneMapModeSchema = z.enum([
  "off",
  "reinhard",
  "aces",
  "filmic",
  "agx",
  "khronos",
]);
export const musicVisualizerRendererSchema = z.enum(["gpu", "cpu"]);
export const musicVisualizerCompositionModeSchema = z.enum([
  "single",
  "layered",
]);
export const paletteModeSchema = z.enum(["day", "night"]);
export const uiLocaleSchema = z.enum(["auto", "zh-CN", "en-US"]);
export const sidebarLabelDisplayModeSchema = z.enum(["full", "leaf"]);
export const sidebarTreeDisplayModeSchema = z.enum(["direct", "hierarchy"]);
export const subtitleAccelerationSchema = z.enum(["auto", "cpu", "directml"]);
export const subtitleLanguageSchema = z.enum([
  "auto",
  "zh",
  "en",
  "ja",
  "ko",
  "yue",
]);
export const subtitleTextFillModeSchema = z.enum(["solid", "gradient"]);
export const subtitleGradientDirectionSchema = z.enum([
  "left-to-right",
  "right-to-left",
  "top-to-bottom",
  "bottom-to-top",
  "top-left-to-bottom-right",
  "top-right-to-bottom-left",
  "bottom-left-to-top-right",
  "bottom-right-to-top-left",
]);
export const subtitleGradientCurveSchema = z.enum([
  "linear",
  "smooth",
  "bezier",
  "smoother",
]);
export const subtitleRenderModeSchema = z.enum(["simple", "advanced"]);
export const audioEngineModeSchema = z.enum(["chromium", "mpv"]);
export const audioGaplessModeSchema = z.enum(["no", "weak", "yes"]);
export const audioReplayGainModeSchema = z.enum(["off", "track", "album"]);
export const subtitleAdvancedVadPresetSchema = z.enum([
  "balanced",
  "conservative",
  "aggressive",
]);
export const fullscreenResamplingKernelSchema = z.enum([
  "lanczos3",
  "mitchell",
  "nearest",
  "cubic",
]);

export const musicVisualizerShaderSettingsSchema = z.object({
  renderLongEdgePx: z.number().int().min(240).max(4096),
  renderScaleCoeff: z.number().min(1).max(5).default(2),
  compositionMode: musicVisualizerCompositionModeSchema.default("single"),
  layeredBackgroundShaderId: z.string().max(64).default("galaxy"),
  layeredForegroundShaderId: z.string().max(64).default("mcs-szb"),
  layeredBackgroundEnabled: z.boolean().default(true),
  layeredForegroundEnabled: z.boolean().default(true),
  layeredForegroundOffsetX: z.number().min(-1).max(1).default(0),
  layeredForegroundOffsetY: z.number().min(-1).max(1).default(0),
  layeredForegroundScale: z.number().min(0.25).max(3).default(1),
  fpsCap: musicVisualizerFpsCapSchema,
  toneMapMode: musicVisualizerToneMapModeSchema,
  toneMapExposure: z.number().min(0.5).max(2),
  toneMapStrength: z.number().min(0).max(1),
  showFps: z.boolean(),
  renderer: musicVisualizerRendererSchema,
});

export const musicVisualizerShaderSettingsByIdSchema = z.record(
  z.string().max(64),
  musicVisualizerShaderSettingsSchema,
);

export const appSettingsSchema = z.object({
  mode: browserModeSchema,
  vectorMode: z.boolean(),
  settingsOpen: z.boolean(),
  helpOpen: z.boolean(),
  headerHeight: z.number().min(48).max(96),
  settingsBackdropOpacity: z.number().min(0).max(100),
  settingsFontSize: z.number().min(12).max(24),
  sidebarRatio: z.number().min(0).max(0.95),
  sidebarMinWidth: z.number().min(80).max(640),
  layoutLocked: z.boolean(),
  headerDebugGroupVisible: z.boolean(),
  tooltipEnabled: z.boolean(),
  electronNativeChromeEnabled: z.boolean(),
  themeParameterButtonVisible: z.boolean(),
  popoverDebugPinned: z.boolean(),
  sidebarFontSize: z.number().min(11).max(24),
  sidebarCountFontSize: z.number().min(10).max(22),
  sidebarIndentStep: z.number().min(8).max(48),
  sidebarVerticalGap: z.number().min(0).max(24),
  metadataRatio: z.number().min(0.2).max(0.45),
  workspaceBottomPanelHeight: z.number().min(80).max(360),
  fullscreenVideoControlsMaxWidth: z.number().min(640).max(1920),
  mediaPreloadMemoryBudgetMb: z.number().int().min(0).max(4096),
  thumbnailScale: z.number().min(1).max(7),
  thumbnailGap: z.number().min(0).max(24),
  showNamesOnly: z.boolean(),
  metadataCollapsed: z.boolean(),
  autoPlayEnabled: z.boolean(),
  autoPlayInterval: z.number().min(1).max(60),
  searchField: searchFieldSchema,
  searchText: z.string().max(120),
  vectorThreshold: z.number().min(0).max(1),
  sidebarFocus: z.enum(["sidebar", "main"]),
  imageRootNodeId: z.string().nullable(),
  videoRootNodeId: z.string().nullable(),
  musicRootNodeId: z.string().nullable(),
  audioEngineMode: audioEngineModeSchema,
  audioOutputDeviceId: z.string().max(256).nullable(),
  audioExclusiveEnabled: z.boolean(),
  audioExclusiveFallbackToShared: z.boolean(),
  audioGaplessMode: audioGaplessModeSchema,
  audioReplayGainMode: audioReplayGainModeSchema,
  imageCollapsedFolderNodeIds: z.array(z.string().min(1)),
  videoCollapsedFolderNodeIds: z.array(z.string().min(1)),
  musicCollapsedFolderNodeIds: z.array(z.string().min(1)),
  sidebarLabelDisplayMode: sidebarLabelDisplayModeSchema,
  sidebarTreeDisplayMode: sidebarTreeDisplayModeSchema,
  uiLocale: uiLocaleSchema,
  themeId: z.string().min(1),
  styleId: z.string().min(1).default("soft-skeuomorphic"),
  paletteId: z.string().min(1).default("skeuomorphic-luxury-white"),
  paletteMode: paletteModeSchema.default("day"),
  paletteDayId: z.string().min(1).default("skeuomorphic-luxury-white"),
  paletteNightId: z.string().min(1).default("skeuomorphic-luxury-white"),
  thumbnailAdaptiveResolution: z.boolean(),
  thumbnailQueueSize: z.number().int().min(16).max(256),
  cpuTokenLimit: z.number().int().min(1).max(16),
  thumbnailQuality: z.number().min(1).max(100),
  thumbnailWidth: z.number().min(128).max(2048),
  thumbnailGenerationConcurrency: z.number().int().min(1).max(16),
  thumbnailResolveConcurrency: z.number().int().min(1).max(32),
  thumbnailWarmupRadius: z.number().int().min(0).max(3),
  thumbnailWarmupConcurrency: z.number().int().min(1).max(4),
  fullscreenPrefetchRadius: z.number().int().min(2).max(12),
  fullscreenDecodeCacheSize: z.number().int().min(4).max(16),
  fullscreenResamplingEnabled: z.boolean(),
  fullscreenUpsamplingKernel: fullscreenResamplingKernelSchema,
  fullscreenDownsamplingKernel: fullscreenResamplingKernelSchema,
  musicVisualizerRenderLongEdgePx: z.number().int().min(240).max(4096),
  musicVisualizerFpsCap: musicVisualizerFpsCapSchema,
  musicVisualizerSelectedShaderId: z.string().max(64),
  musicVisualizerToneMapMode: musicVisualizerToneMapModeSchema,
  musicVisualizerToneMapExposure: z.number().min(0.5).max(2),
  musicVisualizerToneMapStrength: z.number().min(0).max(1),
  musicVisualizerShowFps: z.boolean(),
  musicVisualizerRenderer: musicVisualizerRendererSchema,
  musicVisualizerShaderSettingsById: musicVisualizerShaderSettingsByIdSchema,
  proxyServer: z.string().max(512),
  subtitleFeatureEnabled: z.boolean(),
  subtitleRenderMode: subtitleRenderModeSchema.default("advanced"),
  subtitleAdvancedVadPreset:
    subtitleAdvancedVadPresetSchema.default("balanced"),
  subtitleAdvancedVadThreshold: z.number().min(0.1).max(0.9).default(0.42),
  subtitleAdvancedVadMinSilenceSec: z.number().min(0.1).max(1.2).default(0.14),
  subtitleAdvancedVadMinSpeechSec: z.number().min(0.05).max(1).default(0.18),
  subtitleAdvancedVadMaxSpeechSec: z.number().min(3).max(30).default(3),
  subtitleAdvancedSpeakerThreshold: z.number().min(0.45).max(0.85).default(0.5),
  subtitleValidPlaybackRateThreshold: z.number().min(0.1).max(10).default(1),
  subtitleAcceleration: subtitleAccelerationSchema,
  subtitleLanguage: subtitleLanguageSchema,
  subtitleModelDir: z.string().max(1024),
  subtitleModelDirByProfile: z.record(
    z.string().max(128),
    z.string().max(1024),
  ),
  subtitleSelectedModelId: z.string().max(128).nullable(),
  subtitleTextFillMode: subtitleTextFillModeSchema,
  subtitleTextColor: z.string().max(16),
  subtitleGradientStartColor: z.string().max(16),
  subtitleGradientEndColor: z.string().max(16),
  subtitleGradientDirection: subtitleGradientDirectionSchema,
  subtitleGradientCurve: subtitleGradientCurveSchema,
  subtitleStrokeColor: z.string().max(16),
  subtitleStrokeWidth: z.number().min(0).max(8),
  subtitleStrokeShadowColor: z.string().max(16),
  subtitleStrokeShadowRadius: z.number().min(0).max(24),
  subtitleFontSize: z.number().min(14).max(72),
  subtitleMaxLineChars: z.number().int().min(8).max(80),
  subtitleSelectionByVideoId: z.record(
    z.string().min(1),
    z.string().min(1).max(512),
  ),
  subtitleOffsetY: z.number().min(-400).max(400),
  subtitleStylePanelExpanded: z.boolean(),
  videoSavedPlaylists: z.record(
    z.string().min(1).max(64),
    z.array(z.string().min(1)).max(2000),
  ),
  adReviewVisionEndpoint: z.string().max(512),
  adReviewVisionModel: z.string().max(256),
  adReviewVisionVerified: z.boolean(),
  subtitleCleanupLlmEndpoint: z.string().max(512),
  subtitleCleanupLlmModel: z.string().max(256),
  subtitleCleanupLlmPrompt: z.string().max(12000),
  adReviewStrategyMode: z.enum(["all", "head-tail"]),
  adReviewHeadN: z.number().int().min(1).max(20),
  adReviewTailN: z.number().int().min(1).max(20),
  adReviewTailStopCleanStreak: z.number().int().min(1).max(20),
  adReviewMaxConcurrency: z.number().int().min(1).max(20),
});

export type AppSettings = z.infer<typeof appSettingsSchema>;
