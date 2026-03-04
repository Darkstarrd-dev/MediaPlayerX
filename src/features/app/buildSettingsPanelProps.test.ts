import { describe, expect, it, vi } from "vitest";

import { DEFAULT_SHORTCUTS } from "../../shortcuts";
import {
  SUBTITLE_MODEL_CURRENT_ID,
  SUBTITLE_MODEL_FUNASR_NANO_ID,
} from "../subtitles/fixedModel";
import { buildSettingsPanelProps } from "./buildSettingsPanelProps";

describe("buildSettingsPanelProps", () => {
  it("wires thumbnail settings fields and callbacks", () => {
    const updateSettings = vi.fn();

    const props = buildSettingsPanelProps({
      settingsOpen: true,
      settingsPanelSection: "layout",
      uiLocale: "auto",
      styleId: "soft-skeuomorphic",
      paletteId: "skeuomorphic-luxury-white",
      paletteMode: "day",
      paletteDayId: "skeuomorphic-luxury-white",
      paletteNightId: "skeuomorphic-luxury-white",
      thumbnailAdaptiveResolution: true,
      thumbnailQueueSize: 64,
      cpuTokenLimit: 2,
      headerHeight: 56,
      settingsBackdropOpacity: 18,
      settingsFontSize: 14,
      layoutGapScaleCoeff: 1,
      paneInnerGapScaleCoeff: 1,
      paneStackGapScaleCoeff: 1,
      sidebarInnerGapScaleCoeff: 1,
      thumbnailGapScaleCoeff: 1,
      buttonGroupInsetScaleCoeff: 1,
      paneHeaderHeightScaleCoeff: 1,
      paneFooterHeightScaleCoeff: 1,
      radiusCascadeScaleCoeff: 1,
      radiusValueScaleCoeff: 1,
      sidebarRatio: 0.26,
      sidebarMinWidth: 180,
      layoutLocked: false,
      headerDebugGroupVisible: false,
      tooltipEnabled: true,
      electronNativeChromeEnabled: false,
      themeParameterButtonVisible: false,
      sidebarFontSize: 14,
      sidebarCountFontSize: 12,
      sidebarIndentStep: 14,
      sidebarVerticalGap: 2,
      metadataRatio: 0.28,
      workspaceBottomPanelHeight: 164,
      fullscreenVideoControlsMaxWidth: 980,
      mediaPreloadMemoryBudgetMb: 1024,
      musicVisualizerRuntimeMode: "legacy",
      musicVisualizerSelectedShaderId: "mcs-szb",
      musicVisualizerRenderLongEdgePx: 1280,
      musicVisualizerFpsCap: 60,
      musicVisualizerToneMapMode: "aces",
      musicVisualizerToneMapExposure: 1,
      musicVisualizerToneMapStrength: 0.55,
      musicVisualizerShowFps: false,
      musicVisualizerRenderer: "gpu",
      musicVisualizerShaderSettingsById: {
        "mcs-szb": {
          renderLongEdgePx: 1280,
          renderScaleCoeff: 2,
          compositionMode: "single",
          layeredBackgroundShaderId: "galaxy",
          layeredForegroundShaderId: "mcs-szb",
          layeredBackgroundEnabled: true,
          layeredForegroundEnabled: true,
          layeredForegroundOffsetX: 0,
          layeredForegroundOffsetY: 0,
          layeredForegroundScale: 1,
          fpsCap: 60,
          toneMapMode: "aces",
          toneMapExposure: 1,
          toneMapStrength: 0.55,
          showFps: false,
          renderer: "gpu",
        },
      },
      musicVisualizerPluginInputBindingsByShaderId: {
        "mcs-szb": {
          audioLevelUniform: "iAudioLevel",
          audioBeatUniform: "iAudioBeat",
          timeUniform: "iTime",
          audioTextureSampler: "iChannel0",
        },
      },
      musicVisualizerPluginCustomBindingsByShaderId: {
        "mcs-szb": {
          scalarBindings: {},
          scalarTransforms: {},
          samplerBindings: {},
        },
      },
      musicVisualizerShaderLab: {
        adapterMode: "auto",
        previewFpsCap: 60,
        previewRenderLongEdgePx: 1280,
        previewInputSource: "demo",
      },
      thumbnailGap: 8,
      thumbnailQuality: 40,
      thumbnailWidth: 512,
      thumbnailGenerationConcurrency: 4,
      thumbnailResolveConcurrency: 8,
      thumbnailWarmupRadius: 1,
      thumbnailWarmupConcurrency: 2,
      fullscreenPrefetchRadius: 6,
      fullscreenDecodeCacheSize: 10,
      fullscreenResamplingEnabled: false,
      fullscreenUpsamplingKernel: "lanczos3",
      fullscreenDownsamplingKernel: "lanczos3",
      proxyServer: "",
      ehentaiAuthState: "disconnected",
      ehentaiAuthConnected: false,
      ehentaiAuthMessage: null,
      ehentaiAuthChecking: false,
      ehentaiAuthConnectPending: false,
      ehentaiAuthDisconnectPending: false,
      subtitleFeatureEnabled: false,
      subtitleRenderMode: "advanced",
      subtitleAdvancedVadPreset: "balanced",
      subtitleAdvancedVadThreshold: 0.42,
      subtitleAdvancedVadMinSilenceSec: 0.14,
      subtitleAdvancedVadMinSpeechSec: 0.18,
      subtitleAdvancedVadMaxSpeechSec: 3,
      subtitleAdvancedSpeakerThreshold: 0.5,
      subtitleValidPlaybackRateThreshold: 1,
      subtitleLanguage: "auto",
      subtitleSelectedModelId: SUBTITLE_MODEL_CURRENT_ID,
      subtitleModelDir: "",
      subtitleModelDirByProfile: {
        [SUBTITLE_MODEL_CURRENT_ID]: "",
        [SUBTITLE_MODEL_FUNASR_NANO_ID]: "C:/models/funasr",
      },
      subtitleTextFillMode: "solid",
      subtitleTextColor: "#ffffff",
      subtitleGradientStartColor: "#ffffff",
      subtitleGradientEndColor: "#7fd6ff",
      subtitleGradientDirection: "left-to-right",
      subtitleGradientCurve: "smooth",
      subtitleStrokeColor: "#000000",
      subtitleStrokeWidth: 2,
      subtitleStrokeShadowColor: "#000000",
      subtitleStrokeShadowRadius: 6,
      subtitleFontSize: 24,
      subtitleMaxLineChars: 28,
      subtitleOffsetY: 180,
      subtitleStylePanelExpanded: false,
      subtitleModelsLoading: false,
      subtitleModelsError: null,
      subtitleModelsStatus: null,
      subtitleRemoteModels: [],
      subtitleLocalModels: [],
      subtitleDownloadTask: null,
      subtitleDownloadPending: false,
      subtitleModelDownloadSupported: true,
      adReviewVisionEndpoint: "http://127.0.0.1:1234/v1/chat/completions",
      adReviewVisionModel: "",
      adReviewVisionVerified: false,
      adReviewVisionTestPending: false,
      adReviewVisionTestMessage: null,
      adReviewVisionSavePending: false,
      adReviewVisionSaveMessage: null,
      subtitleCleanupLlmEndpoint: "http://127.0.0.1:1234/v1/chat/completions",
      subtitleCleanupLlmModel: "",
      subtitleCleanupLlmPrompt: "cleanup prompt",
      adReviewExecutionMode: "normal",
      adReviewHashCompareStage: "ad-review",
      adReviewHashHitAction: "silent-delete",
      adReviewKnownHashImportPending: false,
      adReviewKnownHashImportMessage: null,
      adReviewKnownHashExportPending: false,
      adReviewKnownHashExportMessage: null,
      shortcuts: { ...DEFAULT_SHORTCUTS },
      shortcutConflicts: [],
      databaseResetPending: false,
      databaseResetError: null,
      runtimePathUpdatePending: false,
      runtimePathUpdateMessage: null,
      repositoryMode: "mock",
      backendBridgeInjected: false,
      runtimeInfoLoading: false,
      runtimeInfoError: null,
      runtimeInfo: null,
      mediaCapabilitiesLoading: false,
      mediaCapabilitiesError: null,
      mediaCapabilities: [],
      adReviewDeleteOverlayDebugActive: false,
      refreshRuntimeInfo: vi.fn(),
      updateSettings,
      applySidebarRatio: vi.fn(),
      applyMetadataRatio: vi.fn(),
      applyElectronNativeChromeEnabled: vi.fn(),
      setShortcut: vi.fn(),
      resetShortcuts: vi.fn(),
      clearDatabaseForDev: vi.fn(),
      testAdReviewVisionModel: vi.fn(),
      saveAdReviewVisionModel: vi.fn(),
      importAdReviewKnownHashes: vi.fn(),
      exportAdReviewKnownHashes: vi.fn(),
      pickDatabaseDirectoryPath: vi.fn(),
      pickThumbnailCacheDirectoryPath: vi.fn(),
      pickSubtitleModelDirectoryPath: vi.fn(),
      refreshSubtitleModels: vi.fn(),
      startSubtitleModelDownload: vi.fn(),
      cancelSubtitleModelDownload: vi.fn(),
      openSubtitleModelPage: vi.fn(),
      openAdReviewDeleteOverlayDebug: vi.fn(),
      refreshEhentaiAuthStatus: vi.fn(),
      connectEhentaiAuth: vi.fn(),
      disconnectEhentaiAuth: vi.fn(),
    });

    expect(props.thumbnailWidth).toBe(512);
    expect(props.thumbnailQuality).toBe(40);
    expect(props.thumbnailGap).toBe(8);
    expect(props.settingsBackdropOpacity).toBe(18);
    expect(props.paletteMode).toBe("day");

    props.onThumbnailWidthChange(1024);
    props.onThumbnailQualityChange(65);
    props.onThumbnailGapChange(12);
    props.onSettingsBackdropOpacityChange(42);
    props.onPaletteModeChange("night");
    props.onPaletteDayChange("skeuomorphic-luxury-white");
    props.onPaletteNightChange("skeuomorphic-luxury-white");
    props.onUiLocaleChange("en-US");
    props.onSubtitleFeatureEnabledChange(true);
    props.onSubtitleLanguageChange("ja");
    props.onSubtitleSelectedModelIdChange(SUBTITLE_MODEL_FUNASR_NANO_ID);
    props.onThemeParameterButtonVisibleChange(true);
    props.onThumbnailWarmupRadiusChange(3);
    props.onThumbnailWarmupConcurrencyChange(4);
    props.onFullscreenPrefetchRadiusChange(8);
    props.onFullscreenDecodeCacheSizeChange(16);
    props.onFullscreenResamplingEnabledChange(true);
    props.onFullscreenDownsamplingKernelChange("mitchell");
    props.onFullscreenUpsamplingKernelChange("nearest");
    props.onMusicVisualizerPluginInputBindingChange({
      audioLevelUniform: "uAudioLevel",
    });
    props.onMusicVisualizerPluginCustomBindingReplace({
      pluginInputBinding: {
        audioLevelUniform: "uLevel",
        audioBeatUniform: "uBeat",
        timeUniform: "uTime",
        audioTextureSampler: "uTex0",
      },
      pluginCustomBinding: {
        scalarBindings: {
          uEnergy: "audioLevel",
        },
        scalarTransforms: {
          uEnergy: {
            scale: 1.5,
            bias: 0.1,
            clampEnabled: true,
            clampMin: 0,
            clampMax: 1,
            smoothEnabled: true,
            smoothAttack: 0.2,
            smoothRelease: 0.15,
          },
        },
        samplerBindings: {
          uAudioSampler: "audioTexture",
        },
      },
    });
    props.onSettingsPanelSectionChange("shader");
    props.onMusicVisualizerShaderLabChange({
      previewInputSource: "player",
      previewFpsCap: 120,
      previewRenderLongEdgePx: 1600,
      adapterMode: "shadertoy",
    });
    props.onAdReviewExecutionModeChange("performance");

    expect(updateSettings).toHaveBeenNthCalledWith(1, { thumbnailWidth: 1024 });
    expect(updateSettings).toHaveBeenNthCalledWith(2, { thumbnailQuality: 65 });
    expect(updateSettings).toHaveBeenNthCalledWith(3, { thumbnailGap: 12 });
    expect(updateSettings).toHaveBeenNthCalledWith(4, {
      settingsBackdropOpacity: 42,
    });
    expect(updateSettings).toHaveBeenNthCalledWith(5, {
      paletteMode: "night",
      paletteDayId: "skeuomorphic-luxury-white",
      paletteNightId: "skeuomorphic-luxury-white",
      paletteId: "skeuomorphic-luxury-white",
      themeId: "skeuomorphic-luxury-white",
    });
    expect(updateSettings).toHaveBeenNthCalledWith(6, {
      paletteDayId: "skeuomorphic-luxury-white",
      paletteNightId: "skeuomorphic-luxury-white",
      paletteId: "skeuomorphic-luxury-white",
      themeId: "skeuomorphic-luxury-white",
    });
    expect(updateSettings).toHaveBeenNthCalledWith(7, {
      paletteDayId: "skeuomorphic-luxury-white",
      paletteNightId: "skeuomorphic-luxury-white",
    });
    expect(updateSettings).toHaveBeenNthCalledWith(8, { uiLocale: "en-US" });
    expect(updateSettings).toHaveBeenNthCalledWith(9, {
      subtitleFeatureEnabled: true,
    });
    expect(updateSettings).toHaveBeenNthCalledWith(10, {
      subtitleLanguage: "ja",
    });
    expect(updateSettings).toHaveBeenNthCalledWith(11, {
      subtitleSelectedModelId: SUBTITLE_MODEL_FUNASR_NANO_ID,
      subtitleModelDir: "C:/models/funasr",
    });
    expect(updateSettings).toHaveBeenNthCalledWith(12, {
      themeParameterButtonVisible: true,
    });
    expect(updateSettings).toHaveBeenNthCalledWith(13, {
      thumbnailWarmupRadius: 3,
    });
    expect(updateSettings).toHaveBeenNthCalledWith(14, {
      thumbnailWarmupConcurrency: 4,
    });
    expect(updateSettings).toHaveBeenNthCalledWith(15, {
      fullscreenPrefetchRadius: 8,
    });
    expect(updateSettings).toHaveBeenNthCalledWith(16, {
      fullscreenDecodeCacheSize: 16,
    });
    expect(updateSettings).toHaveBeenNthCalledWith(17, {
      fullscreenResamplingEnabled: true,
    });
    expect(updateSettings).toHaveBeenNthCalledWith(18, {
      fullscreenDownsamplingKernel: "mitchell",
    });
    expect(updateSettings).toHaveBeenNthCalledWith(19, {
      fullscreenUpsamplingKernel: "nearest",
    });
    expect(updateSettings).toHaveBeenCalledWith({
      musicVisualizerPluginInputBindingsByShaderId: {
        "mcs-szb": {
          audioLevelUniform: "uAudioLevel",
          audioBeatUniform: "iAudioBeat",
          timeUniform: "iTime",
          audioTextureSampler: "iChannel0",
        },
      },
    });
    expect(updateSettings).toHaveBeenCalledWith({
      settingsPanelSection: "shader",
    });
    expect(updateSettings).toHaveBeenCalledWith({
      musicVisualizerShaderLab: {
        adapterMode: "shadertoy",
        previewFpsCap: 120,
        previewRenderLongEdgePx: 1600,
        previewInputSource: "player",
      },
    });
    expect(updateSettings).toHaveBeenCalledWith({
      adReviewExecutionMode: "performance",
    });
    expect(updateSettings).toHaveBeenCalledWith({
      musicVisualizerPluginInputBindingsByShaderId: {
        "mcs-szb": {
          audioLevelUniform: "uLevel",
          audioBeatUniform: "uBeat",
          timeUniform: "uTime",
          audioTextureSampler: "uTex0",
        },
      },
      musicVisualizerPluginCustomBindingsByShaderId: {
        "mcs-szb": {
          scalarBindings: {
            uEnergy: "audioLevel",
          },
          scalarTransforms: {
            uEnergy: {
              scale: 1.5,
              bias: 0.1,
              clampEnabled: true,
              clampMin: 0,
              clampMax: 1,
              smoothEnabled: true,
              smoothAttack: 0.2,
              smoothRelease: 0.15,
            },
          },
          samplerBindings: {
            uAudioSampler: "audioTexture",
          },
        },
      },
    });

    props.onThumbnailGapScaleCoeffChange(1.4);
    props.onButtonGroupInsetScaleCoeffChange(0.8);
    props.onPaneToolbarHeightScaleCoeffChange(1.2);
    props.onPaneFooterHeightScaleCoeffChange(0.9);

    expect(updateSettings).toHaveBeenCalledWith({
      thumbnailGapScaleCoeff: 1.4,
    });
    expect(updateSettings).toHaveBeenCalledWith({
      buttonGroupInsetScaleCoeff: 0.8,
    });
    expect(updateSettings).toHaveBeenCalledWith({
      paneHeaderHeightScaleCoeff: 1.2,
    });
    expect(updateSettings).toHaveBeenCalledWith({
      paneFooterHeightScaleCoeff: 0.9,
    });
  });
});
