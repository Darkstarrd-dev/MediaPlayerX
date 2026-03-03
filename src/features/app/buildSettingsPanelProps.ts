import {
  musicVisualizerPluginCustomBindingSchema,
  musicVisualizerPluginInputBindingSchema,
  type AppSettings,
} from "../../contracts/settings";
import type { SettingsPanelProps } from "../../components/SettingsPanel";
import {
  resolvePalettePairForStyle,
  resolveStyleId,
} from "../theme/themeRegistry";
import type { SubtitleModelSelectionId } from "../subtitles/fixedModel";

/** 性能预设：一次性批量覆写，不持久化预设名 */
export const PERFORMANCE_PRESETS: Record<string, Partial<AppSettings>> = {
  normal: {
    thumbnailAdaptiveResolution: true,
    thumbnailQueueSize: 64,
    cpuTokenLimit: 2,
    thumbnailGenerationConcurrency: 4,
    thumbnailResolveConcurrency: 8,
    thumbnailQuality: 40,
    thumbnailWarmupRadius: 1,
    thumbnailWarmupConcurrency: 2,
    fullscreenPrefetchRadius: 6,
    fullscreenDecodeCacheSize: 10,
  },
  performance: {
    thumbnailAdaptiveResolution: true,
    thumbnailQueueSize: 128,
    cpuTokenLimit: 4,
    thumbnailGenerationConcurrency: 8,
    thumbnailResolveConcurrency: 12,
    thumbnailQuality: 35,
    thumbnailWarmupRadius: 1,
    thumbnailWarmupConcurrency: 2,
    fullscreenPrefetchRadius: 8,
    fullscreenDecodeCacheSize: 12,
  },
  ultra: {
    thumbnailAdaptiveResolution: true,
    thumbnailQueueSize: 256,
    cpuTokenLimit: 8,
    thumbnailGenerationConcurrency: 12,
    thumbnailResolveConcurrency: 16,
    thumbnailQuality: 35,
    thumbnailWarmupRadius: 2,
    thumbnailWarmupConcurrency: 2,
    fullscreenPrefetchRadius: 10,
    fullscreenDecodeCacheSize: 16,
  },
};

interface BuildSettingsPanelPropsParams {
  settingsOpen: boolean;
  settingsPanelSection: AppSettings["settingsPanelSection"];
  uiLocale: AppSettings["uiLocale"];
  styleId: string;
  paletteId: string;
  paletteMode: AppSettings["paletteMode"];
  paletteDayId: string;
  paletteNightId: string;
  headerHeight: number;
  settingsBackdropOpacity: number;
  settingsFontSize: number;
  layoutGapScaleCoeff: number;
  paneInnerGapScaleCoeff: number;
  paneStackGapScaleCoeff: number;
  sidebarInnerGapScaleCoeff: number;
  thumbnailGapScaleCoeff: number;
  buttonGroupInsetScaleCoeff: number;
  paneToolbarHeightScaleCoeff: number;
  paneFooterHeightScaleCoeff: number;
  radiusCascadeScaleCoeff: number;
  radiusValueScaleCoeff: number;
  sidebarRatio: number;
  sidebarMinWidth: number;
  layoutLocked: boolean;
  headerDebugGroupVisible: boolean;
  tooltipEnabled: boolean;
  electronNativeChromeEnabled: boolean;
  themeParameterButtonVisible: boolean;
  sidebarFontSize: number;
  sidebarCountFontSize: number;
  sidebarIndentStep: number;
  sidebarVerticalGap: number;
  metadataRatio: number;
  workspaceBottomPanelHeight: number;
  fullscreenVideoControlsMaxWidth: number;
  mediaPreloadMemoryBudgetMb: number;
  musicVisualizerRuntimeMode: AppSettings["musicVisualizerRuntimeMode"];
  musicVisualizerSelectedShaderId: string;
  musicVisualizerRenderLongEdgePx: number;
  musicVisualizerFpsCap: 30 | 60 | 120;
  musicVisualizerToneMapMode: AppSettings["musicVisualizerToneMapMode"];
  musicVisualizerToneMapExposure: number;
  musicVisualizerToneMapStrength: number;
  musicVisualizerShowFps: boolean;
  musicVisualizerRenderer: AppSettings["musicVisualizerRenderer"];
  musicVisualizerShaderSettingsById: AppSettings["musicVisualizerShaderSettingsById"];
  musicVisualizerPluginInputBindingsByShaderId: AppSettings["musicVisualizerPluginInputBindingsByShaderId"];
  musicVisualizerPluginCustomBindingsByShaderId: AppSettings["musicVisualizerPluginCustomBindingsByShaderId"];
  musicVisualizerShaderLab: AppSettings["musicVisualizerShaderLab"];
  thumbnailGap: number;
  thumbnailQuality: number;
  thumbnailAdaptiveResolution: boolean;
  thumbnailWidth: number;
  thumbnailGenerationConcurrency: number;
  thumbnailResolveConcurrency: number;
  thumbnailQueueSize: number;
  cpuTokenLimit: number;
  thumbnailWarmupRadius: number;
  thumbnailWarmupConcurrency: number;
  fullscreenPrefetchRadius: number;
  fullscreenDecodeCacheSize: number;
  fullscreenResamplingEnabled: boolean;
  fullscreenUpsamplingKernel: AppSettings["fullscreenUpsamplingKernel"];
  fullscreenDownsamplingKernel: AppSettings["fullscreenDownsamplingKernel"];
  proxyServer: string;
  ehentaiAuthState: "connected" | "disconnected" | "error";
  ehentaiAuthConnected: boolean;
  ehentaiAuthMessage: string | null;
  ehentaiAuthChecking: boolean;
  ehentaiAuthConnectPending: boolean;
  ehentaiAuthDisconnectPending: boolean;
  subtitleFeatureEnabled: boolean;
  subtitleRenderMode: "simple" | "advanced";
  subtitleAdvancedVadPreset: "balanced" | "conservative" | "aggressive";
  subtitleAdvancedVadThreshold: number;
  subtitleAdvancedVadMinSilenceSec: number;
  subtitleAdvancedVadMinSpeechSec: number;
  subtitleAdvancedVadMaxSpeechSec: number;
  subtitleAdvancedSpeakerThreshold: number;
  subtitleValidPlaybackRateThreshold: number;
  subtitleLanguage: AppSettings["subtitleLanguage"];
  subtitleSelectedModelId: SubtitleModelSelectionId;
  subtitleModelDir: string;
  subtitleModelDirByProfile: AppSettings["subtitleModelDirByProfile"];
  subtitleTextFillMode: AppSettings["subtitleTextFillMode"];
  subtitleTextColor: string;
  subtitleGradientStartColor: string;
  subtitleGradientEndColor: string;
  subtitleGradientDirection: AppSettings["subtitleGradientDirection"];
  subtitleGradientCurve: AppSettings["subtitleGradientCurve"];
  subtitleStrokeColor: string;
  subtitleStrokeWidth: number;
  subtitleStrokeShadowColor: string;
  subtitleStrokeShadowRadius: number;
  subtitleFontSize: number;
  subtitleMaxLineChars: number;
  subtitleOffsetY: number;
  subtitleStylePanelExpanded: boolean;
  subtitleModelsLoading: boolean;
  subtitleModelsError: string | null;
  subtitleModelsStatus: string | null;
  subtitleRemoteModels: SettingsPanelProps["subtitleRemoteModels"];
  subtitleLocalModels: SettingsPanelProps["subtitleLocalModels"];
  subtitleDownloadTask: SettingsPanelProps["subtitleDownloadTask"];
  subtitleDownloadPending: boolean;
  subtitleModelDownloadSupported: boolean;
  adReviewVisionEndpoint: string;
  adReviewVisionModel: string;
  adReviewVisionVerified: boolean;
  adReviewVisionTestPending: boolean;
  adReviewVisionTestMessage: string | null;
  adReviewVisionSavePending: boolean;
  adReviewVisionSaveMessage: string | null;
  subtitleCleanupLlmEndpoint: string;
  subtitleCleanupLlmModel: string;
  subtitleCleanupLlmPrompt: string;
  adReviewExecutionMode: AppSettings["adReviewExecutionMode"];
  shortcuts: SettingsPanelProps["shortcuts"];
  shortcutConflicts: SettingsPanelProps["shortcutConflicts"];
  databaseResetPending: boolean;
  databaseResetError: string | null;
  runtimePathUpdatePending: boolean;
  runtimePathUpdateMessage: string | null;
  repositoryMode: SettingsPanelProps["repositoryMode"];
  backendBridgeInjected: boolean;
  runtimeInfoLoading: boolean;
  runtimeInfoError: string | null;
  runtimeInfo: SettingsPanelProps["runtimeInfo"];
  mediaCapabilitiesLoading: boolean;
  mediaCapabilitiesError: string | null;
  mediaCapabilities: SettingsPanelProps["mediaCapabilities"];
  adReviewDeleteOverlayDebugActive: boolean;
  refreshRuntimeInfo: () => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  applySidebarRatio: (value: number) => void;
  applyMetadataRatio: (value: number) => void;
  applyElectronNativeChromeEnabled: (value: boolean) => void;
  setShortcut: SettingsPanelProps["onSetShortcut"];
  resetShortcuts: () => void;
  clearDatabaseForDev: () => void;
  testAdReviewVisionModel: () => void;
  saveAdReviewVisionModel: () => void;
  pickDatabaseDirectoryPath: () => void;
  pickThumbnailCacheDirectoryPath: () => void;
  pickSubtitleModelDirectoryPath: () => void;
  refreshSubtitleModels: () => void;
  startSubtitleModelDownload: () => void;
  cancelSubtitleModelDownload: () => void;
  openSubtitleModelPage: () => void;
  openAdReviewDeleteOverlayDebug: () => void;
  refreshEhentaiAuthStatus: () => void;
  connectEhentaiAuth: () => void;
  disconnectEhentaiAuth: () => void;
}

export function buildSettingsPanelProps(
  params: BuildSettingsPanelPropsParams,
): SettingsPanelProps {
  const resolveFallbackShaderSettings =
    (): AppSettings["musicVisualizerShaderSettingsById"][string] => ({
      renderLongEdgePx: params.musicVisualizerRenderLongEdgePx,
      renderScaleCoeff: 2,
      compositionMode: "single",
      layeredBackgroundShaderId: "galaxy",
      layeredForegroundShaderId: "mcs-szb",
      layeredBackgroundEnabled: true,
      layeredForegroundEnabled: true,
      layeredForegroundOffsetX: 0,
      layeredForegroundOffsetY: 0,
      layeredForegroundScale: 1,
      fpsCap: params.musicVisualizerFpsCap,
      toneMapMode: params.musicVisualizerToneMapMode,
      toneMapExposure: params.musicVisualizerToneMapExposure,
      toneMapStrength: params.musicVisualizerToneMapStrength,
      showFps: params.musicVisualizerShowFps,
      renderer: params.musicVisualizerRenderer,
    });

  const resolveSelectedShaderId = (): string => {
    const trimmed = params.musicVisualizerSelectedShaderId.trim().slice(0, 64);
    return trimmed || "mcs-szb";
  };

  return {
    settingsOpen: params.settingsOpen,
    settingsPanelSection: params.settingsPanelSection,
    uiLocale: params.uiLocale,
    styleId: params.styleId,
    paletteId: params.paletteId,
    paletteMode: params.paletteMode,
    paletteDayId: params.paletteDayId,
    paletteNightId: params.paletteNightId,
    headerHeight: params.headerHeight,
    settingsBackdropOpacity: params.settingsBackdropOpacity,
    settingsFontSize: params.settingsFontSize,
    layoutGapScaleCoeff: params.layoutGapScaleCoeff,
    paneInnerGapScaleCoeff: params.paneInnerGapScaleCoeff,
    paneStackGapScaleCoeff: params.paneStackGapScaleCoeff,
    sidebarInnerGapScaleCoeff: params.sidebarInnerGapScaleCoeff,
    thumbnailGapScaleCoeff: params.thumbnailGapScaleCoeff,
    buttonGroupInsetScaleCoeff: params.buttonGroupInsetScaleCoeff,
    paneToolbarHeightScaleCoeff: params.paneToolbarHeightScaleCoeff,
    paneFooterHeightScaleCoeff: params.paneFooterHeightScaleCoeff,
    radiusCascadeScaleCoeff: params.radiusCascadeScaleCoeff,
    radiusValueScaleCoeff: params.radiusValueScaleCoeff,
    sidebarRatio: params.sidebarRatio,
    sidebarMinWidth: params.sidebarMinWidth,
    layoutLocked: params.layoutLocked,
    headerDebugGroupVisible: params.headerDebugGroupVisible,
    tooltipEnabled: params.tooltipEnabled,
    electronNativeChromeEnabled: params.electronNativeChromeEnabled,
    themeParameterButtonVisible: params.themeParameterButtonVisible,
    sidebarFontSize: params.sidebarFontSize,
    sidebarCountFontSize: params.sidebarCountFontSize,
    sidebarIndentStep: params.sidebarIndentStep,
    sidebarVerticalGap: params.sidebarVerticalGap,
    metadataRatio: params.metadataRatio,
    workspaceBottomPanelHeight: params.workspaceBottomPanelHeight,
    fullscreenVideoControlsMaxWidth: params.fullscreenVideoControlsMaxWidth,
    mediaPreloadMemoryBudgetMb: params.mediaPreloadMemoryBudgetMb,
    musicVisualizerRuntimeMode: params.musicVisualizerRuntimeMode,
    musicVisualizerSelectedShaderId: params.musicVisualizerSelectedShaderId,
    musicVisualizerRenderLongEdgePx: params.musicVisualizerRenderLongEdgePx,
    musicVisualizerFpsCap: params.musicVisualizerFpsCap,
    musicVisualizerToneMapMode: params.musicVisualizerToneMapMode,
    musicVisualizerToneMapExposure: params.musicVisualizerToneMapExposure,
    musicVisualizerToneMapStrength: params.musicVisualizerToneMapStrength,
    musicVisualizerShowFps: params.musicVisualizerShowFps,
    musicVisualizerRenderer: params.musicVisualizerRenderer,
    musicVisualizerShaderSettingsById: params.musicVisualizerShaderSettingsById,
    musicVisualizerPluginInputBindingsByShaderId:
      params.musicVisualizerPluginInputBindingsByShaderId,
    musicVisualizerPluginCustomBindingsByShaderId:
      params.musicVisualizerPluginCustomBindingsByShaderId,
    musicVisualizerShaderLab: params.musicVisualizerShaderLab,
    thumbnailGap: params.thumbnailGap,
    thumbnailQuality: params.thumbnailQuality,
    thumbnailAdaptiveResolution: params.thumbnailAdaptiveResolution,
    thumbnailWidth: params.thumbnailWidth,
    thumbnailGenerationConcurrency: params.thumbnailGenerationConcurrency,
    thumbnailResolveConcurrency: params.thumbnailResolveConcurrency,
    thumbnailQueueSize: params.thumbnailQueueSize,
    cpuTokenLimit: params.cpuTokenLimit,
    thumbnailWarmupRadius: params.thumbnailWarmupRadius,
    thumbnailWarmupConcurrency: params.thumbnailWarmupConcurrency,
    fullscreenPrefetchRadius: params.fullscreenPrefetchRadius,
    fullscreenDecodeCacheSize: params.fullscreenDecodeCacheSize,
    fullscreenResamplingEnabled: params.fullscreenResamplingEnabled,
    fullscreenUpsamplingKernel: params.fullscreenUpsamplingKernel,
    fullscreenDownsamplingKernel: params.fullscreenDownsamplingKernel,
    proxyServer: params.proxyServer,
    ehentaiAuthState: params.ehentaiAuthState,
    ehentaiAuthConnected: params.ehentaiAuthConnected,
    ehentaiAuthMessage: params.ehentaiAuthMessage,
    ehentaiAuthChecking: params.ehentaiAuthChecking,
    ehentaiAuthConnectPending: params.ehentaiAuthConnectPending,
    ehentaiAuthDisconnectPending: params.ehentaiAuthDisconnectPending,
    subtitleFeatureEnabled: params.subtitleFeatureEnabled,
    subtitleRenderMode: params.subtitleRenderMode,
    subtitleAdvancedVadPreset: params.subtitleAdvancedVadPreset,
    subtitleAdvancedVadThreshold: params.subtitleAdvancedVadThreshold,
    subtitleAdvancedVadMinSilenceSec: params.subtitleAdvancedVadMinSilenceSec,
    subtitleAdvancedVadMinSpeechSec: params.subtitleAdvancedVadMinSpeechSec,
    subtitleAdvancedVadMaxSpeechSec: params.subtitleAdvancedVadMaxSpeechSec,
    subtitleAdvancedSpeakerThreshold: params.subtitleAdvancedSpeakerThreshold,
    subtitleValidPlaybackRateThreshold:
      params.subtitleValidPlaybackRateThreshold,
    subtitleLanguage: params.subtitleLanguage,
    subtitleSelectedModelId: params.subtitleSelectedModelId,
    subtitleModelDir: params.subtitleModelDir,
    subtitleTextFillMode: params.subtitleTextFillMode,
    subtitleTextColor: params.subtitleTextColor,
    subtitleGradientStartColor: params.subtitleGradientStartColor,
    subtitleGradientEndColor: params.subtitleGradientEndColor,
    subtitleGradientDirection: params.subtitleGradientDirection,
    subtitleGradientCurve: params.subtitleGradientCurve,
    subtitleStrokeColor: params.subtitleStrokeColor,
    subtitleStrokeWidth: params.subtitleStrokeWidth,
    subtitleStrokeShadowColor: params.subtitleStrokeShadowColor,
    subtitleStrokeShadowRadius: params.subtitleStrokeShadowRadius,
    subtitleFontSize: params.subtitleFontSize,
    subtitleMaxLineChars: params.subtitleMaxLineChars,
    subtitleOffsetY: params.subtitleOffsetY,
    subtitleStylePanelExpanded: params.subtitleStylePanelExpanded,
    subtitleModelsLoading: params.subtitleModelsLoading,
    subtitleModelsError: params.subtitleModelsError,
    subtitleModelsStatus: params.subtitleModelsStatus,
    subtitleRemoteModels: params.subtitleRemoteModels,
    subtitleLocalModels: params.subtitleLocalModels,
    subtitleDownloadTask: params.subtitleDownloadTask,
    subtitleDownloadPending: params.subtitleDownloadPending,
    subtitleModelDownloadSupported: params.subtitleModelDownloadSupported,
    adReviewVisionEndpoint: params.adReviewVisionEndpoint,
    adReviewVisionModel: params.adReviewVisionModel,
    adReviewVisionVerified: params.adReviewVisionVerified,
    adReviewVisionTestPending: params.adReviewVisionTestPending,
    adReviewVisionTestMessage: params.adReviewVisionTestMessage,
    adReviewVisionSavePending: params.adReviewVisionSavePending,
    adReviewVisionSaveMessage: params.adReviewVisionSaveMessage,
    subtitleCleanupLlmEndpoint: params.subtitleCleanupLlmEndpoint,
    subtitleCleanupLlmModel: params.subtitleCleanupLlmModel,
    subtitleCleanupLlmPrompt: params.subtitleCleanupLlmPrompt,
    adReviewExecutionMode: params.adReviewExecutionMode,
    shortcuts: params.shortcuts,
    shortcutConflicts: params.shortcutConflicts,
    databaseResetPending: params.databaseResetPending,
    databaseResetError: params.databaseResetError,
    runtimePathUpdatePending: params.runtimePathUpdatePending,
    runtimePathUpdateMessage: params.runtimePathUpdateMessage,
    repositoryMode: params.repositoryMode,
    backendBridgeInjected: params.backendBridgeInjected,
    runtimeInfoLoading: params.runtimeInfoLoading,
    runtimeInfoError: params.runtimeInfoError,
    runtimeInfo: params.runtimeInfo,
    mediaCapabilitiesLoading: params.mediaCapabilitiesLoading,
    mediaCapabilitiesError: params.mediaCapabilitiesError,
    mediaCapabilities: params.mediaCapabilities,
    adReviewDeleteOverlayDebugActive: params.adReviewDeleteOverlayDebugActive,
    onRefreshRuntimeInfo: params.refreshRuntimeInfo,
    onClose: () => params.updateSettings({ settingsOpen: false }),
    onSettingsPanelSectionChange: (value) =>
      params.updateSettings({ settingsPanelSection: value }),
    onUiLocaleChange: (value) => {
      params.updateSettings({ uiLocale: value });
    },
    onStyleChange: (value) => {
      const nextStyleId = resolveStyleId(value);
      const nextPair = resolvePalettePairForStyle(
        nextStyleId,
        params.paletteDayId,
        params.paletteNightId,
      );
      const nextPaletteId =
        params.paletteMode === "night" ? nextPair.night : nextPair.day;
      params.updateSettings({
        styleId: nextStyleId,
        paletteDayId: nextPair.day,
        paletteNightId: nextPair.night,
        paletteId: nextPaletteId,
        themeId: nextPaletteId,
      });
    },
    onPaletteModeChange: (value) => {
      const nextMode: AppSettings["paletteMode"] =
        value === "night" ? "night" : "day";
      const pair = resolvePalettePairForStyle(
        params.styleId,
        params.paletteDayId,
        params.paletteNightId,
      );
      const nextPaletteId = nextMode === "night" ? pair.night : pair.day;
      params.updateSettings({
        paletteMode: nextMode,
        paletteDayId: pair.day,
        paletteNightId: pair.night,
        paletteId: nextPaletteId,
        themeId: nextPaletteId,
      });
    },
    onPaletteDayChange: (value) => {
      const pair = resolvePalettePairForStyle(
        params.styleId,
        value,
        params.paletteNightId,
      );
      params.updateSettings({
        paletteDayId: pair.day,
        paletteNightId: pair.night,
        ...(params.paletteMode === "day"
          ? {
              paletteId: pair.day,
              themeId: pair.day,
            }
          : {}),
      });
    },
    onPaletteNightChange: (value) => {
      const pair = resolvePalettePairForStyle(
        params.styleId,
        params.paletteDayId,
        value,
      );
      params.updateSettings({
        paletteDayId: pair.day,
        paletteNightId: pair.night,
        ...(params.paletteMode === "night"
          ? {
              paletteId: pair.night,
              themeId: pair.night,
            }
          : {}),
      });
    },
    onHeaderHeightChange: (value) =>
      params.updateSettings({ headerHeight: value }),
    onSettingsBackdropOpacityChange: (value) =>
      params.updateSettings({ settingsBackdropOpacity: value }),
    onLayoutGapScaleCoeffChange: (value) =>
      params.updateSettings({ layoutGapScaleCoeff: value }),
    onPaneInnerGapScaleCoeffChange: (value) =>
      params.updateSettings({ paneInnerGapScaleCoeff: value }),
    onPaneStackGapScaleCoeffChange: (value) =>
      params.updateSettings({ paneStackGapScaleCoeff: value }),
    onSidebarInnerGapScaleCoeffChange: (value) =>
      params.updateSettings({ sidebarInnerGapScaleCoeff: value }),
    onThumbnailGapScaleCoeffChange: (value) =>
      params.updateSettings({ thumbnailGapScaleCoeff: value }),
    onButtonGroupInsetScaleCoeffChange: (value) =>
      params.updateSettings({ buttonGroupInsetScaleCoeff: value }),
    onPaneToolbarHeightScaleCoeffChange: (value) =>
      params.updateSettings({ paneToolbarHeightScaleCoeff: value }),
    onPaneFooterHeightScaleCoeffChange: (value) =>
      params.updateSettings({ paneFooterHeightScaleCoeff: value }),
    onRadiusCascadeScaleCoeffChange: (value) =>
      params.updateSettings({ radiusCascadeScaleCoeff: value }),
    onRadiusValueScaleCoeffChange: (value) =>
      params.updateSettings({ radiusValueScaleCoeff: value }),
    onSettingsFontSizeChange: (value) =>
      params.updateSettings({ settingsFontSize: value }),
    onSidebarRatioChange: params.applySidebarRatio,
    onSidebarMinWidthChange: (value) =>
      params.updateSettings({ sidebarMinWidth: value }),
    onLayoutLockedChange: (value) =>
      params.updateSettings({ layoutLocked: value }),
    onHeaderDebugGroupVisibleChange: (value) =>
      params.updateSettings({ headerDebugGroupVisible: value }),
    onTooltipEnabledChange: (value) =>
      params.updateSettings({ tooltipEnabled: value }),
    onElectronNativeChromeEnabledChange:
      params.applyElectronNativeChromeEnabled,
    onThemeParameterButtonVisibleChange: (value) =>
      params.updateSettings({ themeParameterButtonVisible: value }),
    onSidebarFontSizeChange: (value) =>
      params.updateSettings({ sidebarFontSize: value }),
    onSidebarCountFontSizeChange: (value) =>
      params.updateSettings({ sidebarCountFontSize: value }),
    onSidebarIndentStepChange: (value) =>
      params.updateSettings({ sidebarIndentStep: value }),
    onSidebarVerticalGapChange: (value) =>
      params.updateSettings({ sidebarVerticalGap: value }),
    onMetadataRatioChange: params.applyMetadataRatio,
    onWorkspaceBottomPanelHeightChange: (value) =>
      params.updateSettings({ workspaceBottomPanelHeight: value }),
    onFullscreenVideoControlsMaxWidthChange: (value) =>
      params.updateSettings({ fullscreenVideoControlsMaxWidth: value }),
    onMediaPreloadMemoryBudgetMbChange: (value) =>
      params.updateSettings({ mediaPreloadMemoryBudgetMb: value }),
    onMusicVisualizerRuntimeModeChange: (value) =>
      params.updateSettings({ musicVisualizerRuntimeMode: value }),
    onMusicVisualizerSelectedShaderIdChange: (value) => {
      const nextShaderId = value.trim().slice(0, 64);
      if (!nextShaderId) {
        return;
      }

      const selectedShaderId = resolveSelectedShaderId();
      const fallback = resolveFallbackShaderSettings();
      const nextSettingsById = { ...params.musicVisualizerShaderSettingsById };
      if (!nextSettingsById[nextShaderId]) {
        nextSettingsById[nextShaderId] = {
          ...(nextSettingsById[selectedShaderId] ?? fallback),
        };
      }

      params.updateSettings({
        musicVisualizerSelectedShaderId: nextShaderId,
        musicVisualizerShaderSettingsById: nextSettingsById,
      });
    },
    onMusicVisualizerShaderSettingsChange: (patch) => {
      const selectedShaderId = resolveSelectedShaderId();
      const fallback = resolveFallbackShaderSettings();
      const currentSettings =
        params.musicVisualizerShaderSettingsById[selectedShaderId] ?? fallback;
      params.updateSettings({
        musicVisualizerShaderSettingsById: {
          ...params.musicVisualizerShaderSettingsById,
          [selectedShaderId]: {
            ...currentSettings,
            ...patch,
          },
        },
      });
    },
    onMusicVisualizerPluginInputBindingChange: (patch) => {
      const selectedShaderId = resolveSelectedShaderId();
      const currentBinding = params
        .musicVisualizerPluginInputBindingsByShaderId[selectedShaderId] ?? {
        audioLevelUniform: "iAudioLevel",
        audioBeatUniform: "iAudioBeat",
        timeUniform: "iTime",
        audioTextureSampler: "iChannel0",
      };
      const normalizeUniformName = (
        value: string | undefined,
        fallback: string,
      ): string => {
        if (typeof value !== "string") {
          return fallback;
        }
        const normalized = value.trim().slice(0, 64);
        return normalized.length > 0 ? normalized : fallback;
      };
      params.updateSettings({
        musicVisualizerPluginInputBindingsByShaderId: {
          ...params.musicVisualizerPluginInputBindingsByShaderId,
          [selectedShaderId]: {
            audioLevelUniform: normalizeUniformName(
              patch.audioLevelUniform,
              patch.audioLevelUniform
                ? "iAudioLevel"
                : currentBinding.audioLevelUniform,
            ),
            audioBeatUniform: normalizeUniformName(
              patch.audioBeatUniform,
              patch.audioBeatUniform
                ? "iAudioBeat"
                : currentBinding.audioBeatUniform,
            ),
            timeUniform: normalizeUniformName(
              patch.timeUniform,
              patch.timeUniform ? "iTime" : currentBinding.timeUniform,
            ),
            audioTextureSampler: normalizeUniformName(
              patch.audioTextureSampler,
              patch.audioTextureSampler
                ? "iChannel0"
                : currentBinding.audioTextureSampler,
            ),
          },
        },
      });
    },
    onMusicVisualizerPluginCustomBindingChange: (uniformName, signal) => {
      const selectedShaderId = resolveSelectedShaderId();
      const normalizedName = uniformName.trim().slice(0, 64);
      if (!normalizedName) {
        return;
      }
      const currentBinding = params
        .musicVisualizerPluginCustomBindingsByShaderId[selectedShaderId] ?? {
        scalarBindings: {},
        scalarTransforms: {},
        samplerBindings: {},
      };
      const nextScalarBindings = { ...currentBinding.scalarBindings };
      const nextScalarTransforms = { ...currentBinding.scalarTransforms };
      if (signal === "none") {
        delete nextScalarBindings[normalizedName];
        delete nextScalarTransforms[normalizedName];
      } else {
        nextScalarBindings[normalizedName] = signal;
        if (!nextScalarTransforms[normalizedName]) {
          nextScalarTransforms[normalizedName] = {
            scale: 1,
            bias: 0,
            clampEnabled: false,
            clampMin: 0,
            clampMax: 1,
            smoothEnabled: false,
            smoothAttack: 0.35,
            smoothRelease: 0.12,
          };
        }
      }
      params.updateSettings({
        musicVisualizerPluginCustomBindingsByShaderId: {
          ...params.musicVisualizerPluginCustomBindingsByShaderId,
          [selectedShaderId]: {
            ...currentBinding,
            scalarBindings: nextScalarBindings,
            scalarTransforms: nextScalarTransforms,
          },
        },
      });
    },
    onMusicVisualizerPluginCustomSamplerBindingChange: (
      uniformName,
      signal,
    ) => {
      const selectedShaderId = resolveSelectedShaderId();
      const normalizedName = uniformName.trim().slice(0, 64);
      if (!normalizedName) {
        return;
      }
      const currentBinding = params
        .musicVisualizerPluginCustomBindingsByShaderId[selectedShaderId] ?? {
        scalarBindings: {},
        scalarTransforms: {},
        samplerBindings: {},
      };
      const nextSamplerBindings = { ...currentBinding.samplerBindings };
      if (signal === "none") {
        delete nextSamplerBindings[normalizedName];
      } else {
        nextSamplerBindings[normalizedName] = signal;
      }
      params.updateSettings({
        musicVisualizerPluginCustomBindingsByShaderId: {
          ...params.musicVisualizerPluginCustomBindingsByShaderId,
          [selectedShaderId]: {
            ...currentBinding,
            samplerBindings: nextSamplerBindings,
          },
        },
      });
    },
    onMusicVisualizerPluginCustomTransformChange: (uniformName, patch) => {
      const selectedShaderId = resolveSelectedShaderId();
      const normalizedName = uniformName.trim().slice(0, 64);
      if (!normalizedName) {
        return;
      }
      const currentBinding = params
        .musicVisualizerPluginCustomBindingsByShaderId[selectedShaderId] ?? {
        scalarBindings: {},
        scalarTransforms: {},
        samplerBindings: {},
      };
      const currentTransform = currentBinding.scalarTransforms[
        normalizedName
      ] ?? {
        scale: 1,
        bias: 0,
        clampEnabled: false,
        clampMin: 0,
        clampMax: 1,
        smoothEnabled: false,
        smoothAttack: 0.35,
        smoothRelease: 0.12,
      };
      const nextTransform = {
        ...currentTransform,
        ...patch,
      };
      const normalizeNumber = (
        value: number,
        fallback: number,
        min: number,
        max: number,
      ): number => {
        if (!Number.isFinite(value)) {
          return fallback;
        }
        return Math.max(min, Math.min(max, value));
      };
      nextTransform.scale = normalizeNumber(nextTransform.scale, 1, -16, 16);
      nextTransform.bias = normalizeNumber(nextTransform.bias, 0, -4, 4);
      nextTransform.clampMin = normalizeNumber(
        nextTransform.clampMin,
        0,
        -4,
        4,
      );
      nextTransform.clampMax = normalizeNumber(
        nextTransform.clampMax,
        1,
        -4,
        4,
      );
      nextTransform.smoothAttack = normalizeNumber(
        nextTransform.smoothAttack,
        0.35,
        0,
        1,
      );
      nextTransform.smoothRelease = normalizeNumber(
        nextTransform.smoothRelease,
        0.12,
        0,
        1,
      );
      if (nextTransform.clampMax < nextTransform.clampMin) {
        nextTransform.clampMax = nextTransform.clampMin;
      }
      params.updateSettings({
        musicVisualizerPluginCustomBindingsByShaderId: {
          ...params.musicVisualizerPluginCustomBindingsByShaderId,
          [selectedShaderId]: {
            ...currentBinding,
            scalarTransforms: {
              ...currentBinding.scalarTransforms,
              [normalizedName]: nextTransform,
            },
          },
        },
      });
    },
    onMusicVisualizerPluginCustomBindingReplace: (value) => {
      if (!value || typeof value !== "object") {
        return;
      }
      const selectedShaderId = resolveSelectedShaderId();
      const payload = value as Record<string, unknown>;

      const importedInputCandidate =
        payload.pluginInputBinding ?? payload.musicVisualizerPluginInputBinding;
      const importedCustomCandidate =
        payload.pluginCustomBinding ??
        payload.musicVisualizerPluginCustomBinding;

      const importedInput = musicVisualizerPluginInputBindingSchema.safeParse(
        importedInputCandidate,
      );
      const importedCustom = musicVisualizerPluginCustomBindingSchema.safeParse(
        importedCustomCandidate,
      );

      if (!importedInput.success && !importedCustom.success) {
        return;
      }

      const patch: Partial<AppSettings> = {};
      if (importedInput.success) {
        patch.musicVisualizerPluginInputBindingsByShaderId = {
          ...params.musicVisualizerPluginInputBindingsByShaderId,
          [selectedShaderId]: importedInput.data,
        };
      }
      if (importedCustom.success) {
        patch.musicVisualizerPluginCustomBindingsByShaderId = {
          ...params.musicVisualizerPluginCustomBindingsByShaderId,
          [selectedShaderId]: importedCustom.data,
        };
      }
      params.updateSettings(patch);
    },
    onMusicVisualizerShaderLabChange: (patch) => {
      const current = params.musicVisualizerShaderLab;
      const next: AppSettings["musicVisualizerShaderLab"] = {
        adapterMode:
          patch.adapterMode === "auto" ||
          patch.adapterMode === "shadertoy" ||
          patch.adapterMode === "glsl"
            ? patch.adapterMode
            : current.adapterMode,
        previewFpsCap:
          patch.previewFpsCap === 30 ||
          patch.previewFpsCap === 60 ||
          patch.previewFpsCap === 120
            ? patch.previewFpsCap
            : current.previewFpsCap,
        previewRenderLongEdgePx:
          typeof patch.previewRenderLongEdgePx === "number" &&
          Number.isFinite(patch.previewRenderLongEdgePx)
            ? Math.max(
                240,
                Math.min(2048, Math.round(patch.previewRenderLongEdgePx)),
              )
            : current.previewRenderLongEdgePx,
        previewInputSource:
          patch.previewInputSource === "demo" ||
          patch.previewInputSource === "player"
            ? patch.previewInputSource
            : current.previewInputSource,
      };
      params.updateSettings({
        musicVisualizerShaderLab: next,
      });
    },
    onThumbnailGapChange: (value) =>
      params.updateSettings({ thumbnailGap: value }),
    onThumbnailQualityChange: (value) =>
      params.updateSettings({ thumbnailQuality: value }),
    onResetThumbnailQuality: () =>
      params.updateSettings({
        thumbnailQuality: 40,
      }),
    onThumbnailAdaptiveResolutionChange: (value) =>
      params.updateSettings({ thumbnailAdaptiveResolution: value }),
    onThumbnailWidthChange: (value) =>
      params.updateSettings({ thumbnailWidth: value }),
    onResetThumbnailWidth: () =>
      params.updateSettings({
        thumbnailWidth: 512,
      }),
    onThumbnailGenerationConcurrencyChange: (value) =>
      params.updateSettings({ thumbnailGenerationConcurrency: value }),
    onThumbnailResolveConcurrencyChange: (value) =>
      params.updateSettings({ thumbnailResolveConcurrency: value }),
    onResetThumbnailGenerationConcurrency: () =>
      params.updateSettings({
        thumbnailGenerationConcurrency: 6,
      }),
    onResetThumbnailResolveConcurrency: () =>
      params.updateSettings({
        thumbnailResolveConcurrency: 8,
      }),
    onThumbnailQueueSizeChange: (value) =>
      params.updateSettings({ thumbnailQueueSize: value }),
    onResetThumbnailQueueSize: () =>
      params.updateSettings({
        thumbnailQueueSize: 64,
      }),
    onCpuTokenLimitChange: (value) =>
      params.updateSettings({ cpuTokenLimit: value }),
    onResetCpuTokenLimit: () =>
      params.updateSettings({
        cpuTokenLimit: 2,
      }),
    onThumbnailWarmupRadiusChange: (value) =>
      params.updateSettings({ thumbnailWarmupRadius: value }),
    onThumbnailWarmupConcurrencyChange: (value) =>
      params.updateSettings({ thumbnailWarmupConcurrency: value }),
    onFullscreenPrefetchRadiusChange: (value) =>
      params.updateSettings({ fullscreenPrefetchRadius: value }),
    onFullscreenDecodeCacheSizeChange: (value) =>
      params.updateSettings({ fullscreenDecodeCacheSize: value }),
    onFullscreenResamplingEnabledChange: (value) =>
      params.updateSettings({ fullscreenResamplingEnabled: value }),
    onFullscreenUpsamplingKernelChange: (value) =>
      params.updateSettings({ fullscreenUpsamplingKernel: value }),
    onFullscreenDownsamplingKernelChange: (value) =>
      params.updateSettings({ fullscreenDownsamplingKernel: value }),
    onProxyServerChange: (value) =>
      params.updateSettings({ proxyServer: value }),
    onRefreshEhentaiAuthStatus: params.refreshEhentaiAuthStatus,
    onConnectEhentaiAuth: params.connectEhentaiAuth,
    onDisconnectEhentaiAuth: params.disconnectEhentaiAuth,
    onSubtitleFeatureEnabledChange: (value) =>
      params.updateSettings({ subtitleFeatureEnabled: value }),
    onSubtitleRenderModeChange: (value) =>
      params.updateSettings({ subtitleRenderMode: value }),
    onSubtitleAdvancedVadPresetChange: (value) => {
      if (value === "conservative") {
        params.updateSettings({
          subtitleAdvancedVadPreset: value,
          subtitleAdvancedVadThreshold: 0.52,
          subtitleAdvancedVadMinSilenceSec: 0.45,
          subtitleAdvancedVadMinSpeechSec: 0.25,
          subtitleAdvancedVadMaxSpeechSec: 20,
        });
        return;
      }
      if (value === "aggressive") {
        params.updateSettings({
          subtitleAdvancedVadPreset: value,
          subtitleAdvancedVadThreshold: 0.36,
          subtitleAdvancedVadMinSilenceSec: 0.1,
          subtitleAdvancedVadMinSpeechSec: 0.15,
          subtitleAdvancedVadMaxSpeechSec: 3,
        });
        return;
      }
      params.updateSettings({
        subtitleAdvancedVadPreset: value,
        subtitleAdvancedVadThreshold: 0.42,
        subtitleAdvancedVadMinSilenceSec: 0.14,
        subtitleAdvancedVadMinSpeechSec: 0.18,
        subtitleAdvancedVadMaxSpeechSec: 3,
      });
    },
    onSubtitleAdvancedVadThresholdChange: (value) =>
      params.updateSettings({ subtitleAdvancedVadThreshold: value }),
    onSubtitleAdvancedVadMinSilenceSecChange: (value) =>
      params.updateSettings({ subtitleAdvancedVadMinSilenceSec: value }),
    onSubtitleAdvancedVadMinSpeechSecChange: (value) =>
      params.updateSettings({ subtitleAdvancedVadMinSpeechSec: value }),
    onSubtitleAdvancedVadMaxSpeechSecChange: (value) =>
      params.updateSettings({ subtitleAdvancedVadMaxSpeechSec: value }),
    onSubtitleAdvancedSpeakerThresholdChange: (value) =>
      params.updateSettings({ subtitleAdvancedSpeakerThreshold: value }),
    onSubtitleValidPlaybackRateThresholdChange: (value) =>
      params.updateSettings({ subtitleValidPlaybackRateThreshold: value }),
    onSubtitleLanguageChange: (value) =>
      params.updateSettings({ subtitleLanguage: value }),
    onSubtitleSelectedModelIdChange: (value) =>
      params.updateSettings({
        subtitleSelectedModelId: value,
        subtitleModelDir: params.subtitleModelDirByProfile[value] ?? "",
      }),
    onSubtitleModelDirPick: params.pickSubtitleModelDirectoryPath,
    onSubtitleTextFillModeChange: (value) =>
      params.updateSettings({ subtitleTextFillMode: value }),
    onSubtitleTextColorChange: (value) =>
      params.updateSettings({ subtitleTextColor: value }),
    onSubtitleGradientStartColorChange: (value) =>
      params.updateSettings({ subtitleGradientStartColor: value }),
    onSubtitleGradientEndColorChange: (value) =>
      params.updateSettings({ subtitleGradientEndColor: value }),
    onSubtitleGradientDirectionChange: (value) =>
      params.updateSettings({ subtitleGradientDirection: value }),
    onSubtitleGradientCurveChange: (value) =>
      params.updateSettings({ subtitleGradientCurve: value }),
    onSubtitleStrokeColorChange: (value) =>
      params.updateSettings({ subtitleStrokeColor: value }),
    onSubtitleStrokeWidthChange: (value) =>
      params.updateSettings({ subtitleStrokeWidth: value }),
    onSubtitleStrokeShadowColorChange: (value) =>
      params.updateSettings({ subtitleStrokeShadowColor: value }),
    onSubtitleStrokeShadowRadiusChange: (value) =>
      params.updateSettings({ subtitleStrokeShadowRadius: value }),
    onSubtitleFontSizeChange: (value) =>
      params.updateSettings({ subtitleFontSize: value }),
    onSubtitleMaxLineCharsChange: (value) =>
      params.updateSettings({ subtitleMaxLineChars: value }),
    onSubtitleOffsetYChange: (value) =>
      params.updateSettings({ subtitleOffsetY: value }),
    onSubtitleStylePanelExpandedChange: (value) =>
      params.updateSettings({ subtitleStylePanelExpanded: value }),
    onRefreshSubtitleModels: params.refreshSubtitleModels,
    onStartSubtitleModelDownload: params.startSubtitleModelDownload,
    onCancelSubtitleModelDownload: params.cancelSubtitleModelDownload,
    onOpenSubtitleModelPage: params.openSubtitleModelPage,
    onAdReviewVisionEndpointChange: (value) =>
      params.updateSettings({
        adReviewVisionEndpoint: value,
        adReviewVisionVerified: false,
      }),
    onAdReviewVisionModelChange: (value) =>
      params.updateSettings({
        adReviewVisionModel: value,
        adReviewVisionVerified: false,
      }),
    onTestAdReviewVisionModel: params.testAdReviewVisionModel,
    onSaveAdReviewVisionModel: params.saveAdReviewVisionModel,
    onSubtitleCleanupLlmEndpointChange: (value) =>
      params.updateSettings({
        subtitleCleanupLlmEndpoint: value,
      }),
    onSubtitleCleanupLlmModelChange: (value) =>
      params.updateSettings({
        subtitleCleanupLlmModel: value,
      }),
    onSubtitleCleanupLlmPromptChange: (value) =>
      params.updateSettings({
        subtitleCleanupLlmPrompt: value,
      }),
    onAdReviewExecutionModeChange: (value) =>
      params.updateSettings({
        adReviewExecutionMode: value,
      }),
    onSetShortcut: params.setShortcut,
    onResetShortcuts: params.resetShortcuts,
    onClearDatabase: params.clearDatabaseForDev,
    onPickDatabaseDirectoryPath: params.pickDatabaseDirectoryPath,
    onPickThumbnailCacheDirectoryPath: params.pickThumbnailCacheDirectoryPath,
    onOpenAdReviewDeleteOverlayDebug: params.openAdReviewDeleteOverlayDebug,
    onPerformancePresetChange: (preset: string) => {
      const values = PERFORMANCE_PRESETS[preset];
      if (values) {
        params.updateSettings(values);
      }
    },
  };
}
