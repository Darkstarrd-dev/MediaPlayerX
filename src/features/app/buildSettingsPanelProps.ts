import type { AppSettings } from "../../contracts/settings";
import type { SettingsPanelProps } from "../../components/SettingsPanel";
import {
  resolvePalettePairForStyle,
  resolveStyleId,
} from "../theme/themeRegistry";

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
  uiLocale: AppSettings["uiLocale"];
  styleId: string;
  paletteId: string;
  paletteMode: AppSettings["paletteMode"];
  paletteDayId: string;
  paletteNightId: string;
  headerHeight: number;
  settingsBackdropOpacity: number;
  settingsFontSize: number;
  sidebarRatio: number;
  sidebarMinWidth: number;
  layoutLocked: boolean;
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
  ehentaiCookies: string;
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
  subtitleModelDir: string;
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
}

export function buildSettingsPanelProps(
  params: BuildSettingsPanelPropsParams,
): SettingsPanelProps {
  return {
    settingsOpen: params.settingsOpen,
    uiLocale: params.uiLocale,
    styleId: params.styleId,
    paletteId: params.paletteId,
    paletteMode: params.paletteMode,
    paletteDayId: params.paletteDayId,
    paletteNightId: params.paletteNightId,
    headerHeight: params.headerHeight,
    settingsBackdropOpacity: params.settingsBackdropOpacity,
    settingsFontSize: params.settingsFontSize,
    sidebarRatio: params.sidebarRatio,
    sidebarMinWidth: params.sidebarMinWidth,
    layoutLocked: params.layoutLocked,
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
    ehentaiCookies: params.ehentaiCookies,
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
    onSettingsFontSizeChange: (value) =>
      params.updateSettings({ settingsFontSize: value }),
    onSidebarRatioChange: params.applySidebarRatio,
    onSidebarMinWidthChange: (value) =>
      params.updateSettings({ sidebarMinWidth: value }),
    onLayoutLockedChange: (value) =>
      params.updateSettings({ layoutLocked: value }),
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
    onEhentaiCookiesChange: (value) =>
      params.updateSettings({ ehentaiCookies: value }),
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
