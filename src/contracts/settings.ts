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
export const musicVisualizerRuntimeModeSchema = z.enum(["legacy", "plugin"]);
export const musicVisualizerCompositionModeSchema = z.enum([
  "single",
  "layered",
]);
export const paletteModeSchema = z.enum(["day", "night"]);
export const uiLocaleSchema = z.enum(["auto", "zh-CN", "en-US"]);
export const settingsPanelSectionSchema = z.enum([
  "layout",
  "performance",
  "shader",
  "audio",
  "video",
  "debug",
  "system",
  "model",
  "database",
  "shortcuts",
]);
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
export const audioTranscodePresetSchema = z.enum([
  "flac",
  "alac",
  "wav",
  "opus",
  "aac",
  "mp3",
]);
export const audioTranscodeMetadataModeSchema = z.enum([
  "copy",
  "none",
  "copy_and_override",
]);
export const audioTranscodeSampleRateSchema = z.union([
  z.literal(44_100),
  z.literal(48_000),
  z.literal(96_000),
]);
export const audioTranscodeChannelsSchema = z.union([
  z.literal(1),
  z.literal(2),
]);
export const audioTranscodeWavBitDepthSchema = z.union([
  z.literal(16),
  z.literal(24),
]);
export const audioTranscodeDefaultParamsSchema = z.object({
  bitrateKbps: z.number().int().min(8).max(1536).nullable().default(null),
  vbrQuality: z.number().int().min(0).max(9).nullable().default(null),
  sampleRateHz: audioTranscodeSampleRateSchema.nullable().default(null),
  channels: audioTranscodeChannelsSchema.nullable().default(null),
  flacCompressionLevel: z
    .number()
    .int()
    .min(0)
    .max(12)
    .nullable()
    .default(null),
  wavBitDepth: audioTranscodeWavBitDepthSchema.nullable().default(null),
  metadataMode: audioTranscodeMetadataModeSchema.default("copy"),
  metadataOverrideKey: z.string().max(64).default(""),
  metadataOverrideValue: z.string().max(256).default(""),
});
export const audioTranscodeDefaultsByPresetSchema = z.object({
  flac: audioTranscodeDefaultParamsSchema,
  alac: audioTranscodeDefaultParamsSchema,
  wav: audioTranscodeDefaultParamsSchema,
  opus: audioTranscodeDefaultParamsSchema,
  aac: audioTranscodeDefaultParamsSchema,
  mp3: audioTranscodeDefaultParamsSchema,
});
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

export const musicVisualizerPluginInputBindingSchema = z.object({
  audioLevelUniform: z.string().max(64).default("iAudioLevel"),
  audioBeatUniform: z.string().max(64).default("iAudioBeat"),
  timeUniform: z.string().max(64).default("iTime"),
  audioTextureSampler: z.string().max(64).default("iChannel0"),
});

export const musicVisualizerPluginScalarSignalSchema = z.enum([
  "none",
  "audioLevel",
  "audioBeat",
  "timeSec",
]);

export const musicVisualizerPluginSamplerSignalSchema = z.enum([
  "none",
  "audioTexture",
]);

export const musicVisualizerPluginScalarTransformSchema = z.object({
  scale: z.number().min(-16).max(16).default(1),
  bias: z.number().min(-4).max(4).default(0),
  clampEnabled: z.boolean().default(false),
  clampMin: z.number().min(-4).max(4).default(0),
  clampMax: z.number().min(-4).max(4).default(1),
  smoothEnabled: z.boolean().default(false),
  smoothAttack: z.number().min(0).max(1).default(0.35),
  smoothRelease: z.number().min(0).max(1).default(0.12),
});

export const musicVisualizerPluginCustomBindingSchema = z.object({
  scalarBindings: z.record(
    z.string().max(64),
    musicVisualizerPluginScalarSignalSchema,
  ),
  scalarTransforms: z.record(
    z.string().max(64),
    musicVisualizerPluginScalarTransformSchema,
  ),
  samplerBindings: z.record(
    z.string().max(64),
    musicVisualizerPluginSamplerSignalSchema,
  ),
});

export const musicVisualizerPluginInputBindingsByShaderIdSchema = z.record(
  z.string().max(64),
  musicVisualizerPluginInputBindingSchema,
);

export const musicVisualizerPluginCustomBindingsByShaderIdSchema = z.record(
  z.string().max(64),
  musicVisualizerPluginCustomBindingSchema,
);

export const musicVisualizerShaderLabAdapterModeSchema = z.enum([
  "auto",
  "shadertoy",
  "glsl",
]);

export const musicVisualizerShaderLabPreviewInputSourceSchema = z.enum([
  "demo",
  "player",
]);

export const musicVisualizerShaderLabSchema = z.object({
  adapterMode: musicVisualizerShaderLabAdapterModeSchema.default("auto"),
  previewFpsCap: musicVisualizerFpsCapSchema.default(60),
  previewRenderLongEdgePx: z.number().int().min(240).max(2048).default(1280),
  previewInputSource:
    musicVisualizerShaderLabPreviewInputSourceSchema.default("demo"),
});

export const appSettingsSchema = z.object({
  mode: browserModeSchema,
  vectorMode: z.boolean(),
  settingsOpen: z.boolean(),
  settingsPanelSection: settingsPanelSectionSchema.default("layout"),
  helpOpen: z.boolean(),
  headerHeight: z.number().min(48).max(96),
  settingsBackdropOpacity: z.number().min(0).max(100),
  settingsFontSize: z.number().min(12).max(24),
  layoutGapScaleCoeff: z.number().min(0).max(3).default(1),
  paneInnerGapScaleCoeff: z.number().min(0).max(2).default(1),
  paneStackGapScaleCoeff: z.number().min(0).max(2).default(1),
  sidebarInnerGapScaleCoeff: z.number().min(0).max(2).default(1),
  thumbnailGapScaleCoeff: z.number().min(0).max(2).default(1),
  buttonGroupInsetScaleCoeff: z.number().min(0).max(2).default(1),
  paneHeaderHeightScaleCoeff: z.number().min(0.5).max(2).default(1),
  paneFooterHeightScaleCoeff: z.number().min(0.5).max(2).default(1),
  radiusCascadeScaleCoeff: z.number().min(0).max(2).default(1),
  radiusValueScaleCoeff: z.number().min(0).max(2).default(1),
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
  metadataRatio: z.number().min(0).max(0.95),
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
  audioTranscodeDefaultPreset: audioTranscodePresetSchema,
  audioTranscodeDefaultsByPreset: audioTranscodeDefaultsByPresetSchema,
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
  musicVisualizerRuntimeMode:
    musicVisualizerRuntimeModeSchema.default("legacy"),
  musicVisualizerShaderSettingsById: musicVisualizerShaderSettingsByIdSchema,
  musicVisualizerPluginInputBindingsByShaderId:
    musicVisualizerPluginInputBindingsByShaderIdSchema.default({}),
  musicVisualizerPluginCustomBindingsByShaderId:
    musicVisualizerPluginCustomBindingsByShaderIdSchema.default({}),
  musicVisualizerShaderLab: musicVisualizerShaderLabSchema.default({
    adapterMode: "auto",
    previewFpsCap: 60,
    previewRenderLongEdgePx: 1280,
    previewInputSource: "demo",
  }),
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
  adReviewExecutionMode: z.enum(["normal", "performance"]),
  adReviewHashCompareStage: z.enum(["ad-review", "import"]),
  adReviewHashHitAction: z.enum(["silent-delete", "user-confirm"]),
  adReviewStrategyMode: z.enum(["all", "head-tail"]),
  adReviewHeadN: z.number().int().min(1).max(20),
  adReviewTailN: z.number().int().min(1).max(20),
  adReviewTailStopCleanStreak: z.number().int().min(1).max(20),
  adReviewMaxConcurrency: z.number().int().min(1).max(20),
  externalSourceWatcherEnabled: z.boolean().default(true),
});

export type AppSettings = z.infer<typeof appSettingsSchema>;
