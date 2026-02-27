import type { JSX, KeyboardEvent as ReactKeyboardEvent } from "react";

import type {
  AudioGaplessModeDto,
  AudioEngineModeDto,
  AudioOutputDeviceDto,
  AudioReplayGainModeDto,
  ReadRuntimeInfoResponseDto,
} from "../../contracts/backend";
import type { RepositoryMode } from "../../features/backend/repository";
import type { RuntimeMediaCapabilityProbeResult } from "../../features/app/useRuntimeInfoDiagnostics";
import type { SubtitleModelSelectionId } from "../../features/subtitles/fixedModel";
import type { TranslateFn } from "../../i18n/context";
import type { ShortcutConflict } from "../../shortcuts";

export type SettingsSection =
  | "layout"
  | "performance"
  | "debug"
  | "system"
  | "model"
  | "database"
  | "shortcuts";

export interface RenderSettingsMainSectionParams {
  t: TranslateFn;
  activeSection: SettingsSection;
  uiLocale: "auto" | "zh-CN" | "en-US";
  layoutLocked: boolean;
  headerHeight: number;
  headerHeightScale: number;
  settingsFontSize: number;
  settingsFontSizeScale: number;
  sidebarRatio: number;
  sidebarMinWidth: number;
  sidebarMinWidthScale: number;
  sidebarFontSize: number;
  sidebarFontSizeScale: number;
  headerDebugGroupVisible: boolean;
  tooltipEnabled: boolean;
  electronNativeChromeEnabled: boolean;
  themeParameterButtonVisible: boolean;
  sidebarCountFontSize: number;
  sidebarCountFontSizeScale: number;
  sidebarIndentStep: number;
  sidebarIndentStepScale: number;
  sidebarVerticalGap: number;
  sidebarVerticalGapScale: number;
  metadataRatio: number;
  workspaceBottomPanelHeight: number;
  workspaceBottomPanelHeightScale: number;
  fullscreenVideoControlsMaxWidth: number;
  fullscreenVideoControlsMaxWidthScale: number;
  mediaPreloadMemoryBudgetMb: number;
  thumbnailGap: number;
  thumbnailGapScale: number;
  thumbnailQuality: number;
  thumbnailAdaptiveResolution: boolean;
  thumbnailWidthInputValue: string;
  thumbnailGenerationConcurrencyInput: string;
  thumbnailResolveConcurrencyInput: string;
  thumbnailQueueSizeInput: string;
  cpuTokenLimitInput: string;
  thumbnailWarmupRadius: number;
  thumbnailWarmupConcurrency: number;
  fullscreenPrefetchRadius: number;
  fullscreenDecodeCacheSize: number;
  fullscreenResamplingEnabled: boolean;
  fullscreenUpsamplingKernel: "lanczos3" | "mitchell" | "nearest" | "cubic";
  fullscreenDownsamplingKernel:
    | "lanczos3"
    | "mitchell"
    | "nearest"
    | "cubic";
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
  subtitleLanguage: "auto" | "zh" | "en" | "ja" | "ko" | "yue";
  subtitleSelectedModelId: SubtitleModelSelectionId;
  subtitleModelDir: string;
  subtitleTextFillMode: "solid" | "gradient";
  subtitleTextColor: string;
  subtitleGradientStartColor: string;
  subtitleGradientEndColor: string;
  subtitleGradientDirection:
    | "left-to-right"
    | "right-to-left"
    | "top-to-bottom"
    | "bottom-to-top"
    | "top-left-to-bottom-right"
    | "top-right-to-bottom-left"
    | "bottom-left-to-top-right"
    | "bottom-right-to-top-left";
  subtitleGradientCurve: "linear" | "smooth" | "bezier" | "smoother";
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
  subtitleRemoteModels: Array<{
    id: string;
    label: string;
    languageCodes: string[];
    sizeBytes: number;
    homepageUrl: string | null;
  }>;
  subtitleLocalModels: Array<{
    id: string;
    label: string;
    modelDir: string;
    sizeBytes: number;
    source: "downloaded" | "manual";
  }>;
  subtitleDownloadTask: {
    downloadId: string;
    status:
      | "queued"
      | "downloading"
      | "verifying"
      | "completed"
      | "failed"
      | "cancelled";
    percent: number;
    speedBps: number;
    etaSec: number | null;
    message: string | null;
  } | null;
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
  styleId: string;
  paletteMode: "day" | "night";
  paletteDayId: string;
  paletteNightId: string;
  shortcutConflicts: ShortcutConflict[];
  shortcutLabelByAction: Map<string, string>;
  settingsBackdropOpacity: number;
  databaseResetPending: boolean;
  databaseResetError: string | null;
  runtimePathUpdatePending: boolean;
  runtimePathUpdateMessage: string | null;
  repositoryMode: RepositoryMode;
  backendBridgeInjected: boolean;
  runtimeInfoLoading: boolean;
  runtimeInfoError: string | null;
  runtimeInfo: ReadRuntimeInfoResponseDto | null;
  mediaCapabilitiesLoading: boolean;
  mediaCapabilitiesError: string | null;
  mediaCapabilities: RuntimeMediaCapabilityProbeResult[];
  adReviewDeleteOverlayDebugActive: boolean;
  preferenceDebugLoading: boolean;
  preferenceDebugError: string | null;
  audioEngineLoading: boolean;
  audioEngineUpdating: boolean;
  audioEngineError: string | null;
  audioEngineMode: AudioEngineModeDto;
  audioEngineDesiredMode: AudioEngineModeDto;
  audioEngineUsingFallback: boolean;
  audioEngineMpvAvailable: boolean;
  audioEngineMpvBinPath: string | null;
  audioEngineActiveDeviceId: string | null;
  audioEngineExclusiveEnabled: boolean;
  audioEngineGaplessMode: AudioGaplessModeDto;
  audioEngineReplayGainMode: AudioReplayGainModeDto;
  audioOutputDevicesLoading: boolean;
  audioOutputDevices: AudioOutputDeviceDto[];
  preferenceDebugData: {
    reason: string;
    updatedAtMs: number | null;
    imageAggregateCount: number;
    videoAggregateCount: number;
    imageSessionCount: number;
    videoSessionCount: number;
    imageSessionPreview: unknown[];
    videoSessionPreview: unknown[];
  } | null;
  renderBindingRows: () => JSX.Element;
  onResetShortcuts: () => void;
  onUiLocaleChange: (value: "auto" | "zh-CN" | "en-US") => void;
  onLayoutLockedChange: (value: boolean) => void;
  onHeaderHeightChange: (value: number) => void;
  onSettingsBackdropOpacityChange: (value: number) => void;
  onSettingsFontSizeChange: (value: number) => void;
  onSidebarRatioChange: (value: number) => void;
  onSidebarMinWidthChange: (value: number) => void;
  onSidebarFontSizeChange: (value: number) => void;
  onHeaderDebugGroupVisibleChange: (value: boolean) => void;
  onTooltipEnabledChange: (value: boolean) => void;
  onElectronNativeChromeEnabledChange: (value: boolean) => void;
  onThemeParameterButtonVisibleChange: (value: boolean) => void;
  onSidebarCountFontSizeChange: (value: number) => void;
  onSidebarIndentStepChange: (value: number) => void;
  onSidebarVerticalGapChange: (value: number) => void;
  onMetadataRatioChange: (value: number) => void;
  onWorkspaceBottomPanelHeightChange: (value: number) => void;
  onFullscreenVideoControlsMaxWidthChange: (value: number) => void;
  onMediaPreloadMemoryBudgetMbChange: (value: number) => void;
  onThumbnailGapChange: (value: number) => void;
  onThumbnailQualityChange: (value: number) => void;
  onResetThumbnailQuality: () => void;
  onThumbnailAdaptiveResolutionChange: (value: boolean) => void;
  onThumbnailWidthInputChange: (value: string) => void;
  onThumbnailWidthInputBlur: () => void;
  onThumbnailWidthInputKeyDown: (
    event: ReactKeyboardEvent<HTMLInputElement>,
  ) => void;
  onResetThumbnailWidth: () => void;
  onThumbnailGenerationConcurrencyInputChange: (value: string) => void;
  onThumbnailGenerationConcurrencyInputBlur: () => void;
  onThumbnailGenerationConcurrencyInputKeyDown: (
    event: ReactKeyboardEvent<HTMLInputElement>,
  ) => void;
  onResetThumbnailGenerationConcurrency: () => void;
  onThumbnailResolveConcurrencyInputChange: (value: string) => void;
  onThumbnailResolveConcurrencyInputBlur: () => void;
  onThumbnailResolveConcurrencyInputKeyDown: (
    event: ReactKeyboardEvent<HTMLInputElement>,
  ) => void;
  onResetThumbnailResolveConcurrency: () => void;
  onThumbnailQueueSizeInputChange: (value: string) => void;
  onThumbnailQueueSizeInputBlur: () => void;
  onThumbnailQueueSizeInputKeyDown: (
    event: ReactKeyboardEvent<HTMLInputElement>,
  ) => void;
  onResetThumbnailQueueSize: () => void;
  onCpuTokenLimitInputChange: (value: string) => void;
  onCpuTokenLimitInputBlur: () => void;
  onCpuTokenLimitInputKeyDown: (
    event: ReactKeyboardEvent<HTMLInputElement>,
  ) => void;
  onResetCpuTokenLimit: () => void;
  onThumbnailWarmupRadiusChange: (value: number) => void;
  onThumbnailWarmupConcurrencyChange: (value: number) => void;
  onFullscreenPrefetchRadiusChange: (value: number) => void;
  onFullscreenDecodeCacheSizeChange: (value: number) => void;
  onFullscreenResamplingEnabledChange: (value: boolean) => void;
  onFullscreenUpsamplingKernelChange: (
    value: "lanczos3" | "mitchell" | "nearest" | "cubic",
  ) => void;
  onFullscreenDownsamplingKernelChange: (
    value: "lanczos3" | "mitchell" | "nearest" | "cubic",
  ) => void;
  onProxyServerChange: (value: string) => void;
  onEhentaiCookiesChange: (value: string) => void;
  onSubtitleFeatureEnabledChange: (value: boolean) => void;
  onSubtitleRenderModeChange: (value: "simple" | "advanced") => void;
  onSubtitleAdvancedVadPresetChange: (
    value: "balanced" | "conservative" | "aggressive",
  ) => void;
  onSubtitleAdvancedVadThresholdChange: (value: number) => void;
  onSubtitleAdvancedVadMinSilenceSecChange: (value: number) => void;
  onSubtitleAdvancedVadMinSpeechSecChange: (value: number) => void;
  onSubtitleAdvancedVadMaxSpeechSecChange: (value: number) => void;
  onSubtitleAdvancedSpeakerThresholdChange: (value: number) => void;
  onSubtitleValidPlaybackRateThresholdChange: (value: number) => void;
  onSubtitleLanguageChange: (
    value: "auto" | "zh" | "en" | "ja" | "ko" | "yue",
  ) => void;
  onSubtitleSelectedModelIdChange: (value: SubtitleModelSelectionId) => void;
  onSubtitleModelDirPick: () => void;
  onSubtitleTextFillModeChange: (value: "solid" | "gradient") => void;
  onSubtitleTextColorChange: (value: string) => void;
  onSubtitleGradientStartColorChange: (value: string) => void;
  onSubtitleGradientEndColorChange: (value: string) => void;
  onSubtitleGradientDirectionChange: (
    value:
      | "left-to-right"
      | "right-to-left"
      | "top-to-bottom"
      | "bottom-to-top"
      | "top-left-to-bottom-right"
      | "top-right-to-bottom-left"
      | "bottom-left-to-top-right"
      | "bottom-right-to-top-left",
  ) => void;
  onSubtitleGradientCurveChange: (
    value: "linear" | "smooth" | "bezier" | "smoother",
  ) => void;
  onSubtitleStrokeColorChange: (value: string) => void;
  onSubtitleStrokeWidthChange: (value: number) => void;
  onSubtitleStrokeShadowColorChange: (value: string) => void;
  onSubtitleStrokeShadowRadiusChange: (value: number) => void;
  onSubtitleFontSizeChange: (value: number) => void;
  onSubtitleMaxLineCharsChange: (value: number) => void;
  onSubtitleOffsetYChange: (value: number) => void;
  onSubtitleStylePanelExpandedChange: (value: boolean) => void;
  onRefreshSubtitleModels: () => void;
  onStartSubtitleModelDownload: () => void;
  onCancelSubtitleModelDownload: () => void;
  onOpenSubtitleModelPage: () => void;
  onAdReviewVisionEndpointChange: (value: string) => void;
  onAdReviewVisionModelChange: (value: string) => void;
  onTestAdReviewVisionModel: () => void;
  onSaveAdReviewVisionModel: () => void;
  onSubtitleCleanupLlmEndpointChange: (value: string) => void;
  onSubtitleCleanupLlmModelChange: (value: string) => void;
  onSubtitleCleanupLlmPromptChange: (value: string) => void;
  onStyleChange: (value: string) => void;
  onPaletteModeChange: (value: "day" | "night") => void;
  onPaletteDayChange: (value: string) => void;
  onPaletteNightChange: (value: string) => void;
  onClearDatabase: () => void;
  onPickDatabaseDirectoryPath: () => void;
  onPickThumbnailCacheDirectoryPath: () => void;
  onRefreshRuntimeInfo: () => void;
  onRefreshPreferenceDebug: () => void;
  onRefreshAudioEngineState: () => void;
  onRefreshAudioOutputDevices: () => void;
  onAudioEngineModeChange: (mode: AudioEngineModeDto) => void;
  onAudioOutputDeviceChange: (deviceId: string) => void;
  onAudioExclusiveChange: (enabled: boolean) => void;
  onAudioGaplessModeChange: (mode: AudioGaplessModeDto) => void;
  onAudioReplayGainModeChange: (mode: AudioReplayGainModeDto) => void;
  onOpenAdReviewDeleteOverlayDebug: () => void;
  onPerformancePresetChange: (preset: string) => void;
}
