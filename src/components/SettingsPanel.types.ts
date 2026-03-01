import type { ReadRuntimeInfoResponseDto } from "../contracts/backend";
import type { RepositoryMode } from "../features/backend/repository";
import type { RuntimeMediaCapabilityProbeResult } from "../features/app/useRuntimeInfoDiagnostics";
import type { SubtitleModelSelectionId } from "../features/subtitles/fixedModel";
import type {
  ShortcutAction,
  ShortcutConflict,
  ShortcutMap,
} from "../shortcuts";

export interface SettingsPanelProps {
  settingsOpen: boolean;
  uiLocale: "auto" | "zh-CN" | "en-US";
  styleId: string;
  paletteId: string;
  paletteMode: "day" | "night";
  paletteDayId: string;
  paletteNightId: string;
  headerHeight: number;
  settingsBackdropOpacity: number;
  settingsFontSize: number;
  layoutGapScaleCoeff: number;
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
  fullscreenUpsamplingKernel: "lanczos3" | "mitchell" | "nearest" | "cubic";
  fullscreenDownsamplingKernel: "lanczos3" | "mitchell" | "nearest" | "cubic";
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
  shortcuts: ShortcutMap;
  shortcutConflicts: ShortcutConflict[];
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
  onClose: () => void;
  onUiLocaleChange: (value: "auto" | "zh-CN" | "en-US") => void;
  onStyleChange: (value: string) => void;
  onPaletteModeChange: (value: "day" | "night") => void;
  onPaletteDayChange: (value: string) => void;
  onPaletteNightChange: (value: string) => void;
  onHeaderHeightChange: (value: number) => void;
  onSettingsBackdropOpacityChange: (value: number) => void;
  onSettingsFontSizeChange: (value: number) => void;
  onLayoutGapScaleCoeffChange: (value: number) => void;
  onSidebarRatioChange: (value: number) => void;
  onSidebarMinWidthChange: (value: number) => void;
  onLayoutLockedChange: (value: boolean) => void;
  onHeaderDebugGroupVisibleChange: (value: boolean) => void;
  onTooltipEnabledChange: (value: boolean) => void;
  onElectronNativeChromeEnabledChange: (value: boolean) => void;
  onThemeParameterButtonVisibleChange: (value: boolean) => void;
  onSidebarFontSizeChange: (value: number) => void;
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
  onThumbnailWidthChange: (value: number) => void;
  onResetThumbnailWidth: () => void;
  onThumbnailGenerationConcurrencyChange: (value: number) => void;
  onThumbnailResolveConcurrencyChange: (value: number) => void;
  onResetThumbnailGenerationConcurrency: () => void;
  onResetThumbnailResolveConcurrency: () => void;
  onThumbnailQueueSizeChange: (value: number) => void;
  onResetThumbnailQueueSize: () => void;
  onCpuTokenLimitChange: (value: number) => void;
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
  onRefreshEhentaiAuthStatus: () => void;
  onConnectEhentaiAuth: () => void;
  onDisconnectEhentaiAuth: () => void;
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
  onSetShortcut: (action: ShortcutAction, binding: string) => void;
  onResetShortcuts: () => void;
  onClearDatabase: () => void;
  onPickDatabaseDirectoryPath: () => void;
  onPickThumbnailCacheDirectoryPath: () => void;
  onRefreshRuntimeInfo: () => void;
  onOpenAdReviewDeleteOverlayDebug: () => void;
  onPerformancePresetChange: (preset: string) => void;
}
