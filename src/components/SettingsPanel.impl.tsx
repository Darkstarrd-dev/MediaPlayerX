import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import {
  appendShortcutBinding,
  keyboardEventToCombo,
  mouseEventToCombo,
  wheelEventToCombo,
  SHORTCUT_DEFINITIONS,
} from "../shortcuts";
import {
  renderSettingsMainSection,
  type SettingsSection,
} from "./settings/renderSettingsMainSection";
import { usePreferenceDebugState } from "./settings/usePreferenceDebugState";
import { useAudioEngineState } from "./settings/useAudioEngineState";
import { buildA11yProps } from "../i18n/a11y";
import { a11yRegistry } from "../i18n/ariaRegistry";
import { useI18n } from "../i18n/useI18n";
import { MainUiIcon } from "./MainUiIcon";
import { useDraggablePanel } from "./useDraggablePanel";
import { SettingsShortcutBindingDialog } from "./settings/SettingsShortcutBindingDialog";
import { SettingsShortcutCaptureDialog } from "./settings/SettingsShortcutCaptureDialog";
import {
  CPU_TOKEN_LIMIT_MAX,
  CPU_TOKEN_LIMIT_MIN,
  MOUSE_CAPTURE_PRESETS,
  type BindingTarget,
  SETTINGS_SECTIONS,
  THUMBNAIL_GENERATION_CONCURRENCY_MAX,
  THUMBNAIL_GENERATION_CONCURRENCY_MIN,
  THUMBNAIL_QUEUE_SIZE_MAX,
  THUMBNAIL_QUEUE_SIZE_MIN,
  THUMBNAIL_RESOLVE_CONCURRENCY_MAX,
  THUMBNAIL_RESOLVE_CONCURRENCY_MIN,
  THUMBNAIL_WIDTH_MAX,
  THUMBNAIL_WIDTH_MIN,
  resolveSettingsSection,
} from "./settings/settingsPanelHelpers";
import {
  resolveRuntimeSpacing,
  resolveRuntimeViewportWidth,
} from "../features/layout/runtimeSpacing";
import { toScale } from "./settings/settingsScale";
import type { SettingsPanelProps } from "./SettingsPanel.types";

function SettingsPanel({
  settingsOpen,
  settingsPanelSection,
  uiLocale,
  styleId,
  paletteMode,
  paletteDayId,
  paletteNightId,
  headerHeight,
  settingsBackdropOpacity,
  settingsFontSize,
  layoutGapScaleCoeff,
  paneInnerGapScaleCoeff,
  paneStackGapScaleCoeff,
  sidebarInnerGapScaleCoeff,
  thumbnailGapScaleCoeff,
  buttonGroupInsetScaleCoeff,
  paneHeaderHeightScaleCoeff,
  paneFooterHeightScaleCoeff,
  radiusCascadeScaleCoeff,
  radiusValueScaleCoeff,
  sidebarRatio,
  sidebarMinWidth,
  layoutLocked,
  headerDebugGroupVisible,
  tooltipEnabled,
  electronNativeChromeEnabled,
  themeParameterButtonVisible,
  sidebarFontSize,
  sidebarCountFontSize,
  sidebarIndentStep,
  sidebarVerticalGap,
  metadataRatio,
  workspaceBottomPanelHeight,
  fullscreenVideoControlsMaxWidth,
  mediaPreloadMemoryBudgetMb,
  musicVisualizerRuntimeMode,
  musicVisualizerSelectedShaderId,
  musicVisualizerRenderLongEdgePx,
  musicVisualizerFpsCap,
  musicVisualizerToneMapMode,
  musicVisualizerToneMapExposure,
  musicVisualizerToneMapStrength,
  musicVisualizerShowFps,
  musicVisualizerRenderer,
  musicVisualizerShaderSettingsById,
  musicVisualizerPluginInputBindingsByShaderId,
  musicVisualizerPluginCustomBindingsByShaderId,
  musicVisualizerShaderLab,
  thumbnailGap,
  thumbnailQuality,
  thumbnailAdaptiveResolution,
  thumbnailWidth,
  thumbnailGenerationConcurrency,
  thumbnailResolveConcurrency,
  thumbnailQueueSize,
  cpuTokenLimit,
  thumbnailWarmupRadius,
  thumbnailWarmupConcurrency,
  fullscreenPrefetchRadius,
  fullscreenAdjacentPackagePrefetch,
  fullscreenCrossPackagePrefetchCount,
  fullscreenImageNavMaxPerSecond,
  fullscreenDecodeCacheSize,
  fullscreenResamplingEnabled,
  fullscreenLayeredRenderEnabled,
  fullscreenUpsamplingKernel,
  fullscreenDownsamplingKernel,
  proxyServer,
  externalSourceWatcherEnabled,
  ehentaiAuthState,
  ehentaiAuthConnected,
  ehentaiAuthMessage,
  ehentaiAuthChecking,
  ehentaiAuthConnectPending,
  ehentaiAuthDisconnectPending,
  subtitleFeatureEnabled,
  subtitleRenderMode,
  subtitleAdvancedVadPreset,
  subtitleAdvancedVadThreshold,
  subtitleAdvancedVadMinSilenceSec,
  subtitleAdvancedVadMinSpeechSec,
  subtitleAdvancedVadMaxSpeechSec,
  subtitleAdvancedSpeakerThreshold,
  subtitleValidPlaybackRateThreshold,
  subtitleLanguage,
  subtitleSelectedModelId,
  subtitleModelDir,
  subtitleTextFillMode,
  subtitleTextColor,
  subtitleGradientStartColor,
  subtitleGradientEndColor,
  subtitleGradientDirection,
  subtitleGradientCurve,
  subtitleStrokeColor,
  subtitleStrokeWidth,
  subtitleStrokeShadowColor,
  subtitleStrokeShadowRadius,
  subtitleFontSize,
  subtitleMaxLineChars,
  subtitleOffsetY,
  subtitleStylePanelExpanded,
  subtitleModelsLoading,
  subtitleModelsError,
  subtitleModelsStatus,
  subtitleRemoteModels,
  subtitleLocalModels,
  subtitleDownloadTask,
  subtitleDownloadPending,
  subtitleModelDownloadSupported,
  adReviewVisionEndpoint,
  adReviewVisionModel,
  adReviewVisionVerified,
  adReviewVisionTestPending,
  adReviewVisionTestMessage,
  adReviewVisionSavePending,
  adReviewVisionSaveMessage,
  subtitleCleanupLlmEndpoint,
  subtitleCleanupLlmModel,
  subtitleCleanupLlmPrompt,
  adReviewExecutionMode,
  adReviewHashCompareStage,
  adReviewHashHitAction,
  adReviewKnownHashImportPending,
  adReviewKnownHashImportMessage,
  adReviewKnownHashExportPending,
  adReviewKnownHashExportMessage,
  shortcuts,
  shortcutConflicts,
  databaseResetPending,
  databaseResetError,
  runtimePathUpdatePending,
  runtimePathUpdateMessage,
  repositoryMode,
  backendBridgeInjected,
  runtimeInfoLoading,
  runtimeInfoError,
  runtimeInfo,
  mediaCapabilitiesLoading,
  mediaCapabilitiesError,
  mediaCapabilities,
  adReviewDeleteOverlayDebugActive,
  onClose,
  onSettingsPanelSectionChange,
  onUiLocaleChange,
  onStyleChange,
  onPaletteModeChange,
  onPaletteDayChange,
  onPaletteNightChange,
  onHeaderHeightChange,
  onSettingsBackdropOpacityChange,
  onSettingsFontSizeChange,
  onLayoutGapScaleCoeffChange,
  onPaneInnerGapScaleCoeffChange,
  onPaneStackGapScaleCoeffChange,
  onSidebarInnerGapScaleCoeffChange,
  onThumbnailGapScaleCoeffChange,
  onButtonGroupInsetScaleCoeffChange,
  onPaneToolbarHeightScaleCoeffChange,
  onPaneFooterHeightScaleCoeffChange,
  onRadiusCascadeScaleCoeffChange,
  onRadiusValueScaleCoeffChange,
  onSidebarRatioChange,
  onSidebarMinWidthChange,
  onLayoutLockedChange,
  onHeaderDebugGroupVisibleChange,
  onTooltipEnabledChange,
  onElectronNativeChromeEnabledChange,
  onThemeParameterButtonVisibleChange,
  onSidebarFontSizeChange,
  onSidebarCountFontSizeChange,
  onSidebarIndentStepChange,
  onSidebarVerticalGapChange,
  onMetadataRatioChange,
  onWorkspaceBottomPanelHeightChange,
  onFullscreenVideoControlsMaxWidthChange,
  onMediaPreloadMemoryBudgetMbChange,
  onMusicVisualizerRuntimeModeChange,
  onMusicVisualizerSelectedShaderIdChange,
  onMusicVisualizerShaderSettingsChange,
  onMusicVisualizerPluginInputBindingChange,
  onMusicVisualizerPluginCustomBindingChange,
  onMusicVisualizerPluginCustomSamplerBindingChange,
  onMusicVisualizerPluginCustomTransformChange,
  onMusicVisualizerPluginCustomBindingReplace,
  onMusicVisualizerShaderLabChange,
  onThumbnailGapChange,
  onThumbnailQualityChange,
  onResetThumbnailQuality,
  onThumbnailAdaptiveResolutionChange,
  onThumbnailWidthChange,
  onResetThumbnailWidth,
  onThumbnailGenerationConcurrencyChange,
  onThumbnailResolveConcurrencyChange,
  onResetThumbnailGenerationConcurrency,
  onResetThumbnailResolveConcurrency,
  onThumbnailQueueSizeChange,
  onResetThumbnailQueueSize,
  onCpuTokenLimitChange,
  onResetCpuTokenLimit,
  onThumbnailWarmupRadiusChange,
  onThumbnailWarmupConcurrencyChange,
  onFullscreenPrefetchRadiusChange,
  onFullscreenAdjacentPackagePrefetchChange,
  onFullscreenCrossPackagePrefetchCountChange,
  onFullscreenImageNavMaxPerSecondChange,
  onFullscreenDecodeCacheSizeChange,
  onFullscreenResamplingEnabledChange,
  onFullscreenLayeredRenderEnabledChange,
  onFullscreenUpsamplingKernelChange,
  onFullscreenDownsamplingKernelChange,
  onProxyServerChange,
  onExternalSourceWatcherEnabledChange,
  onRefreshEhentaiAuthStatus,
  onConnectEhentaiAuth,
  onDisconnectEhentaiAuth,
  onSubtitleFeatureEnabledChange,
  onSubtitleRenderModeChange,
  onSubtitleAdvancedVadPresetChange,
  onSubtitleAdvancedVadThresholdChange,
  onSubtitleAdvancedVadMinSilenceSecChange,
  onSubtitleAdvancedVadMinSpeechSecChange,
  onSubtitleAdvancedVadMaxSpeechSecChange,
  onSubtitleAdvancedSpeakerThresholdChange,
  onSubtitleValidPlaybackRateThresholdChange,
  onSubtitleLanguageChange,
  onSubtitleSelectedModelIdChange,
  onSubtitleModelDirPick,
  onSubtitleTextFillModeChange,
  onSubtitleTextColorChange,
  onSubtitleGradientStartColorChange,
  onSubtitleGradientEndColorChange,
  onSubtitleGradientDirectionChange,
  onSubtitleGradientCurveChange,
  onSubtitleStrokeColorChange,
  onSubtitleStrokeWidthChange,
  onSubtitleStrokeShadowColorChange,
  onSubtitleStrokeShadowRadiusChange,
  onSubtitleFontSizeChange,
  onSubtitleMaxLineCharsChange,
  onSubtitleOffsetYChange,
  onSubtitleStylePanelExpandedChange,
  onRefreshSubtitleModels,
  onStartSubtitleModelDownload,
  onCancelSubtitleModelDownload,
  onOpenSubtitleModelPage,
  onAdReviewVisionEndpointChange,
  onAdReviewVisionModelChange,
  onTestAdReviewVisionModel,
  onSaveAdReviewVisionModel,
  onSubtitleCleanupLlmEndpointChange,
  onSubtitleCleanupLlmModelChange,
  onSubtitleCleanupLlmPromptChange,
  onAdReviewExecutionModeChange,
  onAdReviewHashCompareStageChange,
  onAdReviewHashHitActionChange,
  onImportAdReviewKnownHashes,
  onExportAdReviewKnownHashes,
  onSetShortcut,
  onResetShortcuts,
  onClearDatabase,
  onPickDatabaseDirectoryPath,
  onPickThumbnailCacheDirectoryPath,
  onRefreshRuntimeInfo,
  onOpenAdReviewDeleteOverlayDebug,
  onPerformancePresetChange,
}: SettingsPanelProps) {
  const { t } = useI18n();
  const [activeSectionRaw, setActiveSection] = useState<SettingsSection>(() =>
    resolveSettingsSection(settingsPanelSection),
  );
  const activeSection = resolveSettingsSection(activeSectionRaw);
  const [bindingTarget, setBindingTarget] = useState<BindingTarget | null>(
    null,
  );
  const [capturingTarget, setCapturingTarget] = useState<BindingTarget | null>(
    null,
  );
  const [capturedCombo, setCapturedCombo] = useState("");
  const [thumbnailWidthInputValue, setThumbnailWidthInputValue] = useState(() =>
    String(thumbnailWidth),
  );
  const [
    thumbnailGenerationConcurrencyInput,
    setThumbnailGenerationConcurrencyInput,
  ] = useState(() => String(thumbnailGenerationConcurrency));
  const [
    thumbnailResolveConcurrencyInput,
    setThumbnailResolveConcurrencyInput,
  ] = useState(() => String(thumbnailResolveConcurrency));
  const [thumbnailQueueSizeInput, setThumbnailQueueSizeInput] = useState(() =>
    String(thumbnailQueueSize),
  );
  const [cpuTokenLimitInput, setCpuTokenLimitInput] = useState(() =>
    String(cpuTokenLimit),
  );
  const { panelOffset, panelDragging, headHandlers } =
    useDraggablePanel(settingsOpen);
  const {
    preferenceDebugLoading,
    preferenceDebugError,
    preferenceDebugData,
    refreshPreferenceDebug,
    resetPreferenceDebugState,
  } = usePreferenceDebugState({
    settingsOpen,
    activeSection,
    t,
  });
  const {
    audioEngineLoading,
    audioEngineUpdating,
    audioEngineError,
    audioEngineState,
    mpvBinDirectoryDraft,
    mpvBinVerifyPending,
    mpvBinVerifyMessage,
    ffmpegBinDirectoryDraft,
    ffmpegBinVerifyPending,
    ffmpegBinVerifyMessage,
    audioTranscodeCapabilitiesLoading,
    audioTranscodeCapabilitiesError,
    audioTranscodeCapabilities,
    audioOutputDevicesLoading,
    audioOutputDevices,
    refreshAudioEngineState,
    refreshAudioOutputDevices,
    refreshAudioTranscodeCapabilities,
    setMpvBinDirectoryDraft,
    setFfmpegBinDirectoryDraft,
    pickMpvBinDirectory,
    pickFfmpegBinDirectory,
    verifyMpvBinDirectory,
    verifyFfmpegBinDirectory,
    setAudioEngineMode,
    setAudioOutputDevice,
    setAudioExclusive,
    setAudioGaplessMode,
    setAudioReplayGainMode,
  } = useAudioEngineState({
    settingsOpen,
    activeSection,
  });

  const headerHeightScale = toScale("headerHeight", headerHeight);
  const settingsFontSizeScale = toScale("settingsFontSize", settingsFontSize);
  const sidebarMinWidthScale = toScale("sidebarMinWidth", sidebarMinWidth);
  const sidebarFontSizeScale = toScale("sidebarFontSize", sidebarFontSize);
  const sidebarCountFontSizeScale = toScale(
    "sidebarCountFontSize",
    sidebarCountFontSize,
  );
  const sidebarIndentStepScale = toScale(
    "sidebarIndentStep",
    sidebarIndentStep,
  );
  const sidebarVerticalGapScale = toScale(
    "sidebarVerticalGap",
    sidebarVerticalGap,
  );
  const workspaceBottomPanelHeightScale = toScale(
    "workspaceBottomPanelHeight",
    workspaceBottomPanelHeight,
  );
  const fullscreenVideoControlsMaxWidthScale = toScale(
    "fullscreenVideoControlsMaxWidth",
    fullscreenVideoControlsMaxWidth,
  );
  const runtimeSpacing = resolveRuntimeSpacing({
    viewportWidth: resolveRuntimeViewportWidth(),
    layoutGapScaleCoeff,
    paneInnerGapScaleCoeff,
    paneStackGapScaleCoeff,
    sidebarInnerGapScaleCoeff,
    thumbnailGapScaleCoeff,
    buttonGroupInsetScaleCoeff,
    paneHeaderHeightScaleCoeff,
    paneFooterHeightScaleCoeff,
  });
  const thumbnailGapScale = thumbnailGapScaleCoeff;
  const resolvedThumbnailGap =
    runtimeSpacing.thumbnailGapPx > 0
      ? runtimeSpacing.thumbnailGapPx
      : thumbnailGap;

  const shortcutLabelByAction = useMemo(
    () =>
      new Map(
        SHORTCUT_DEFINITIONS.map((definition) => [
          definition.action,
          definition.label,
        ]),
      ),
    [],
  );
  const getBinding = (target: BindingTarget): string => {
    return shortcuts[target.action];
  };

  const setBinding = (target: BindingTarget, binding: string) => {
    onSetShortcut(target.action, binding);
  };

  useEffect(() => {
    if (!settingsOpen) {
      setActiveSection(resolveSettingsSection(settingsPanelSection));
      setBindingTarget(null);
      setCapturingTarget(null);
      setCapturedCombo("");
      setThumbnailWidthInputValue(String(thumbnailWidth));
      setThumbnailGenerationConcurrencyInput(
        String(thumbnailGenerationConcurrency),
      );
      setThumbnailResolveConcurrencyInput(String(thumbnailResolveConcurrency));
      setThumbnailQueueSizeInput(String(thumbnailQueueSize));
      setCpuTokenLimitInput(String(cpuTokenLimit));
      resetPreferenceDebugState();
    }
  }, [
    settingsOpen,
    settingsPanelSection,
    cpuTokenLimit,
    resetPreferenceDebugState,
    thumbnailGenerationConcurrency,
    thumbnailQueueSize,
    thumbnailResolveConcurrency,
    thumbnailWidth,
  ]);

  useEffect(() => {
    setThumbnailWidthInputValue(String(thumbnailWidth));
  }, [thumbnailWidth]);

  useEffect(() => {
    setThumbnailGenerationConcurrencyInput(
      String(thumbnailGenerationConcurrency),
    );
  }, [thumbnailGenerationConcurrency]);

  useEffect(() => {
    setThumbnailResolveConcurrencyInput(String(thumbnailResolveConcurrency));
  }, [thumbnailResolveConcurrency]);

  useEffect(() => {
    setThumbnailQueueSizeInput(String(thumbnailQueueSize));
  }, [thumbnailQueueSize]);

  useEffect(() => {
    setCpuTokenLimitInput(String(cpuTokenLimit));
  }, [cpuTokenLimit]);

  useEffect(() => {
    const normalized = resolveSettingsSection(activeSectionRaw);
    if (normalized !== activeSectionRaw) {
      setActiveSection(normalized);
    }
  }, [activeSectionRaw]);

  useEffect(() => {
    if (!settingsOpen) {
      return;
    }
    setActiveSection(resolveSettingsSection(settingsPanelSection));
  }, [settingsOpen, settingsPanelSection]);

  useEffect(() => {
    if (!capturingTarget) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const combo = keyboardEventToCombo(event);
      if (!combo) {
        return;
      }
      setCapturedCombo(combo);
    };

    const onMouseDown = (event: MouseEvent) => {
      const targetElement = event.target as HTMLElement | null;
      if (targetElement?.closest('[data-capture-ignore="true"]')) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const combo = mouseEventToCombo(event);
      if (!combo) {
        return;
      }
      setCapturedCombo(combo);
    };

    const onWheel = (event: WheelEvent) => {
      const targetElement = event.target as HTMLElement | null;
      if (targetElement?.closest('[data-capture-ignore="true"]')) {
        return;
      }

      const combo = wheelEventToCombo(event);
      if (!combo) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setCapturedCombo(combo);
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("wheel", onWheel, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("mousedown", onMouseDown, true);
      window.removeEventListener("wheel", onWheel, true);
    };
  }, [capturingTarget]);

  if (!settingsOpen) {
    return null;
  }

  const openBindingManager = (target: BindingTarget) => {
    setBindingTarget(target);
    setCapturingTarget(null);
    setCapturedCombo("");
  };

  const renderBindingRows = () => {
    return (
      <div className="shortcut-list">
        {SHORTCUT_DEFINITIONS.map((definition) => (
          <label
            key={definition.action}
            className="shortcut-row"
            data-tooltip-label={definition.label}
          >
            <span>{definition.label}</span>
            <button
              className="shortcut-binding-trigger"
              type="button"
              onClick={() =>
                openBindingManager({
                  action: definition.action,
                  label: definition.label,
                })
              }
            >
              {shortcuts[definition.action] || t("ui.settings.shortcutNotSet")}
            </button>
          </label>
        ))}
      </div>
    );
  };

  const commitThumbnailWidthInput = () => {
    const parsed = Number(thumbnailWidthInputValue);
    if (!Number.isFinite(parsed)) {
      setThumbnailWidthInputValue(String(thumbnailWidth));
      return;
    }

    const normalized = Math.max(
      THUMBNAIL_WIDTH_MIN,
      Math.min(THUMBNAIL_WIDTH_MAX, Math.round(parsed)),
    );
    setThumbnailWidthInputValue(String(normalized));
    onThumbnailWidthChange(normalized);
  };

  const handleThumbnailWidthInputChange = (value: string) => {
    if (value.length === 0) {
      setThumbnailWidthInputValue(value);
      return;
    }
    if (!/^\d+$/.test(value)) {
      return;
    }

    setThumbnailWidthInputValue(value);

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return;
    }
    if (parsed < THUMBNAIL_WIDTH_MIN || parsed > THUMBNAIL_WIDTH_MAX) {
      return;
    }
    onThumbnailWidthChange(parsed);
  };

  const handleThumbnailWidthInputKeyDown = (
    event: ReactKeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter") {
      commitThumbnailWidthInput();
      event.currentTarget.blur();
      return;
    }
    if (event.key === "Escape") {
      setThumbnailWidthInputValue(String(thumbnailWidth));
      event.currentTarget.blur();
    }
  };

  const commitThumbnailGenerationConcurrencyInput = () => {
    const parsed = Number(thumbnailGenerationConcurrencyInput);
    if (!Number.isFinite(parsed)) {
      setThumbnailGenerationConcurrencyInput(
        String(thumbnailGenerationConcurrency),
      );
      return;
    }

    const normalized = Math.max(
      THUMBNAIL_GENERATION_CONCURRENCY_MIN,
      Math.min(THUMBNAIL_GENERATION_CONCURRENCY_MAX, Math.round(parsed)),
    );
    setThumbnailGenerationConcurrencyInput(String(normalized));
    onThumbnailGenerationConcurrencyChange(normalized);
  };

  const handleThumbnailGenerationConcurrencyInputChange = (value: string) => {
    if (value.length === 0) {
      setThumbnailGenerationConcurrencyInput(value);
      return;
    }
    if (!/^\d+$/.test(value)) {
      return;
    }

    setThumbnailGenerationConcurrencyInput(value);
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return;
    }
    if (
      parsed < THUMBNAIL_GENERATION_CONCURRENCY_MIN ||
      parsed > THUMBNAIL_GENERATION_CONCURRENCY_MAX
    ) {
      return;
    }
    onThumbnailGenerationConcurrencyChange(parsed);
  };

  const handleThumbnailGenerationConcurrencyInputKeyDown = (
    event: ReactKeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter") {
      commitThumbnailGenerationConcurrencyInput();
      event.currentTarget.blur();
      return;
    }
    if (event.key === "Escape") {
      setThumbnailGenerationConcurrencyInput(
        String(thumbnailGenerationConcurrency),
      );
      event.currentTarget.blur();
    }
  };

  const commitThumbnailResolveConcurrencyInput = () => {
    const parsed = Number(thumbnailResolveConcurrencyInput);
    if (!Number.isFinite(parsed)) {
      setThumbnailResolveConcurrencyInput(String(thumbnailResolveConcurrency));
      return;
    }

    const normalized = Math.max(
      THUMBNAIL_RESOLVE_CONCURRENCY_MIN,
      Math.min(THUMBNAIL_RESOLVE_CONCURRENCY_MAX, Math.round(parsed)),
    );
    setThumbnailResolveConcurrencyInput(String(normalized));
    onThumbnailResolveConcurrencyChange(normalized);
  };

  const handleThumbnailResolveConcurrencyInputChange = (value: string) => {
    if (value.length === 0) {
      setThumbnailResolveConcurrencyInput(value);
      return;
    }
    if (!/^\d+$/.test(value)) {
      return;
    }

    setThumbnailResolveConcurrencyInput(value);
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return;
    }
    if (
      parsed < THUMBNAIL_RESOLVE_CONCURRENCY_MIN ||
      parsed > THUMBNAIL_RESOLVE_CONCURRENCY_MAX
    ) {
      return;
    }
    onThumbnailResolveConcurrencyChange(parsed);
  };

  const handleThumbnailResolveConcurrencyInputKeyDown = (
    event: ReactKeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter") {
      commitThumbnailResolveConcurrencyInput();
      event.currentTarget.blur();
      return;
    }
    if (event.key === "Escape") {
      setThumbnailResolveConcurrencyInput(String(thumbnailResolveConcurrency));
      event.currentTarget.blur();
    }
  };

  const commitThumbnailQueueSizeInput = () => {
    const parsed = Number(thumbnailQueueSizeInput);
    if (!Number.isFinite(parsed)) {
      setThumbnailQueueSizeInput(String(thumbnailQueueSize));
      return;
    }

    const normalized = Math.max(
      THUMBNAIL_QUEUE_SIZE_MIN,
      Math.min(THUMBNAIL_QUEUE_SIZE_MAX, Math.round(parsed)),
    );
    setThumbnailQueueSizeInput(String(normalized));
    onThumbnailQueueSizeChange(normalized);
  };

  const handleThumbnailQueueSizeInputChange = (value: string) => {
    if (value.length === 0) {
      setThumbnailQueueSizeInput(value);
      return;
    }
    if (!/^\d+$/.test(value)) {
      return;
    }

    setThumbnailQueueSizeInput(value);
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return;
    }
    if (
      parsed < THUMBNAIL_QUEUE_SIZE_MIN ||
      parsed > THUMBNAIL_QUEUE_SIZE_MAX
    ) {
      return;
    }
    onThumbnailQueueSizeChange(parsed);
  };

  const handleThumbnailQueueSizeInputKeyDown = (
    event: ReactKeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter") {
      commitThumbnailQueueSizeInput();
      event.currentTarget.blur();
      return;
    }
    if (event.key === "Escape") {
      setThumbnailQueueSizeInput(String(thumbnailQueueSize));
      event.currentTarget.blur();
    }
  };

  const commitCpuTokenLimitInput = () => {
    const parsed = Number(cpuTokenLimitInput);
    if (!Number.isFinite(parsed)) {
      setCpuTokenLimitInput(String(cpuTokenLimit));
      return;
    }

    const normalized = Math.max(
      CPU_TOKEN_LIMIT_MIN,
      Math.min(CPU_TOKEN_LIMIT_MAX, Math.round(parsed)),
    );
    setCpuTokenLimitInput(String(normalized));
    onCpuTokenLimitChange(normalized);
  };

  const handleCpuTokenLimitInputChange = (value: string) => {
    if (value.length === 0) {
      setCpuTokenLimitInput(value);
      return;
    }
    if (!/^\d+$/.test(value)) {
      return;
    }

    setCpuTokenLimitInput(value);
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return;
    }
    if (parsed < CPU_TOKEN_LIMIT_MIN || parsed > CPU_TOKEN_LIMIT_MAX) {
      return;
    }
    onCpuTokenLimitChange(parsed);
  };

  const handleCpuTokenLimitInputKeyDown = (
    event: ReactKeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter") {
      commitCpuTokenLimitInput();
      event.currentTarget.blur();
      return;
    }
    if (event.key === "Escape") {
      setCpuTokenLimitInput(String(cpuTokenLimit));
      event.currentTarget.blur();
    }
  };

  const mainSection = renderSettingsMainSection({
    t,
    activeSection,
    settingsPanelSection,
    uiLocale,
    layoutLocked,
    electronNativeChromeEnabled,
    themeParameterButtonVisible,
    headerHeight,
    headerHeightScale,
    settingsFontSize,
    settingsFontSizeScale,
    layoutGapScaleCoeff,
    paneInnerGapScaleCoeff,
    paneStackGapScaleCoeff,
    sidebarInnerGapScaleCoeff,
    thumbnailGapScaleCoeff,
    buttonGroupInsetScaleCoeff,
    paneHeaderHeightScaleCoeff,
    paneFooterHeightScaleCoeff,
    radiusCascadeScaleCoeff,
    radiusValueScaleCoeff,
    sidebarRatio,
    sidebarMinWidth,
    headerDebugGroupVisible,
    tooltipEnabled,
    sidebarMinWidthScale,
    sidebarFontSize,
    sidebarFontSizeScale,
    sidebarCountFontSize,
    sidebarCountFontSizeScale,
    sidebarIndentStep,
    sidebarIndentStepScale,
    sidebarVerticalGap,
    sidebarVerticalGapScale,
    metadataRatio,
    workspaceBottomPanelHeight,
    workspaceBottomPanelHeightScale,
    fullscreenVideoControlsMaxWidth,
    fullscreenVideoControlsMaxWidthScale,
    mediaPreloadMemoryBudgetMb,
    musicVisualizerRuntimeMode,
    musicVisualizerSelectedShaderId,
    musicVisualizerRenderLongEdgePx,
    musicVisualizerFpsCap,
    musicVisualizerToneMapMode,
    musicVisualizerToneMapExposure,
    musicVisualizerToneMapStrength,
    musicVisualizerShowFps,
    musicVisualizerRenderer,
    musicVisualizerShaderSettingsById,
    musicVisualizerPluginInputBindingsByShaderId,
    musicVisualizerPluginCustomBindingsByShaderId,
    musicVisualizerShaderLab,
    thumbnailGap: resolvedThumbnailGap,
    thumbnailGapScale,
    thumbnailQuality,
    thumbnailAdaptiveResolution,
    thumbnailWidthInputValue,
    thumbnailGenerationConcurrencyInput,
    thumbnailResolveConcurrencyInput,
    thumbnailQueueSizeInput,
    cpuTokenLimitInput,
    thumbnailWarmupRadius,
    thumbnailWarmupConcurrency,
    fullscreenPrefetchRadius,
    fullscreenAdjacentPackagePrefetch,
    fullscreenCrossPackagePrefetchCount,
    fullscreenImageNavMaxPerSecond,
    fullscreenDecodeCacheSize,
    fullscreenResamplingEnabled,
    fullscreenLayeredRenderEnabled,
    fullscreenUpsamplingKernel,
    fullscreenDownsamplingKernel,
    proxyServer,
    externalSourceWatcherEnabled,
    ehentaiAuthState,
    ehentaiAuthConnected,
    ehentaiAuthMessage,
    ehentaiAuthChecking,
    ehentaiAuthConnectPending,
    ehentaiAuthDisconnectPending,
    subtitleFeatureEnabled,
    subtitleRenderMode,
    subtitleAdvancedVadPreset,
    subtitleAdvancedVadThreshold,
    subtitleAdvancedVadMinSilenceSec,
    subtitleAdvancedVadMinSpeechSec,
    subtitleAdvancedVadMaxSpeechSec,
    subtitleAdvancedSpeakerThreshold,
    subtitleValidPlaybackRateThreshold,
    subtitleLanguage,
    subtitleSelectedModelId,
    subtitleModelDir,
    subtitleTextFillMode,
    subtitleTextColor,
    subtitleGradientStartColor,
    subtitleGradientEndColor,
    subtitleGradientDirection,
    subtitleGradientCurve,
    subtitleStrokeColor,
    subtitleStrokeWidth,
    subtitleStrokeShadowColor,
    subtitleStrokeShadowRadius,
    subtitleFontSize,
    subtitleMaxLineChars,
    subtitleOffsetY,
    subtitleStylePanelExpanded,
    subtitleModelsLoading,
    subtitleModelsError,
    subtitleModelsStatus,
    subtitleRemoteModels,
    subtitleLocalModels,
    subtitleDownloadTask,
    subtitleDownloadPending,
    subtitleModelDownloadSupported,
    adReviewVisionEndpoint,
    adReviewVisionModel,
    adReviewVisionVerified,
    adReviewVisionTestPending,
    adReviewVisionTestMessage,
    adReviewVisionSavePending,
    adReviewVisionSaveMessage,
    subtitleCleanupLlmEndpoint,
    subtitleCleanupLlmModel,
    subtitleCleanupLlmPrompt,
    adReviewExecutionMode,
    adReviewHashCompareStage,
    adReviewHashHitAction,
    adReviewKnownHashImportPending,
    adReviewKnownHashImportMessage,
    adReviewKnownHashExportPending,
    adReviewKnownHashExportMessage,
    styleId,
    paletteMode,
    paletteDayId,
    paletteNightId,
    shortcutConflicts,
    shortcutLabelByAction,
    databaseResetPending,
    databaseResetError,
    runtimePathUpdatePending,
    runtimePathUpdateMessage,
    repositoryMode,
    backendBridgeInjected,
    runtimeInfoLoading,
    runtimeInfoError,
    runtimeInfo,
    mediaCapabilitiesLoading,
    mediaCapabilitiesError,
    mediaCapabilities,
    adReviewDeleteOverlayDebugActive,
    preferenceDebugLoading,
    preferenceDebugError,
    audioEngineLoading,
    audioEngineUpdating,
    audioEngineError,
    audioEngineMode: audioEngineState?.mode ?? "chromium",
    audioEngineDesiredMode: audioEngineState?.desired_mode ?? "chromium",
    audioEngineUsingFallback: audioEngineState?.using_fallback ?? false,
    audioEngineMpvAvailable: audioEngineState?.mpv_available ?? false,
    audioEngineMpvBinPath: audioEngineState?.mpv_bin_path ?? null,
    mpvBinDirectoryDraft,
    mpvBinVerifyPending,
    mpvBinVerifyMessage,
    ffmpegBinDirectoryDraft,
    ffmpegBinVerifyPending,
    ffmpegBinVerifyMessage,
    audioEngineActiveDeviceId: audioEngineState?.active_device_id ?? null,
    audioEngineExclusiveEnabled: audioEngineState?.exclusive_enabled ?? false,
    audioEngineGaplessMode: audioEngineState?.gapless_mode ?? "weak",
    audioEngineReplayGainMode: audioEngineState?.replaygain_mode ?? "off",
    audioOutputDevicesLoading,
    audioOutputDevices,
    audioTranscodeCapabilitiesLoading,
    audioTranscodeCapabilitiesError,
    audioTranscodeCapabilities,
    preferenceDebugData,
    renderBindingRows,
    onResetShortcuts,
    onSettingsPanelSectionChange,
    onUiLocaleChange,
    onLayoutLockedChange,
    onElectronNativeChromeEnabledChange,
    onThemeParameterButtonVisibleChange,
    onHeaderHeightChange,
    settingsBackdropOpacity,
    onSettingsFontSizeChange,
    onLayoutGapScaleCoeffChange,
    onPaneInnerGapScaleCoeffChange,
    onPaneStackGapScaleCoeffChange,
    onSidebarInnerGapScaleCoeffChange,
    onThumbnailGapScaleCoeffChange,
    onButtonGroupInsetScaleCoeffChange,
    onPaneToolbarHeightScaleCoeffChange,
    onPaneFooterHeightScaleCoeffChange,
    onRadiusCascadeScaleCoeffChange,
    onRadiusValueScaleCoeffChange,
    onSettingsBackdropOpacityChange,
    onSidebarRatioChange,
    onSidebarMinWidthChange,
    onHeaderDebugGroupVisibleChange,
    onTooltipEnabledChange,
    onSidebarFontSizeChange,
    onSidebarCountFontSizeChange,
    onSidebarIndentStepChange,
    onSidebarVerticalGapChange,
    onMetadataRatioChange,
    onWorkspaceBottomPanelHeightChange,
    onFullscreenVideoControlsMaxWidthChange,
    onMediaPreloadMemoryBudgetMbChange,
    onMusicVisualizerRuntimeModeChange,
    onMusicVisualizerSelectedShaderIdChange,
    onMusicVisualizerShaderSettingsChange,
    onMusicVisualizerPluginInputBindingChange,
    onMusicVisualizerPluginCustomBindingChange,
    onMusicVisualizerPluginCustomSamplerBindingChange,
    onMusicVisualizerPluginCustomTransformChange,
    onMusicVisualizerPluginCustomBindingReplace,
    onMusicVisualizerShaderLabChange,
    onThumbnailGapChange,
    onThumbnailQualityChange,
    onResetThumbnailQuality,
    onThumbnailAdaptiveResolutionChange,
    onThumbnailWidthInputChange: handleThumbnailWidthInputChange,
    onThumbnailWidthInputBlur: commitThumbnailWidthInput,
    onThumbnailWidthInputKeyDown: handleThumbnailWidthInputKeyDown,
    onResetThumbnailWidth,
    onThumbnailGenerationConcurrencyInputChange:
      handleThumbnailGenerationConcurrencyInputChange,
    onThumbnailGenerationConcurrencyInputBlur:
      commitThumbnailGenerationConcurrencyInput,
    onThumbnailGenerationConcurrencyInputKeyDown:
      handleThumbnailGenerationConcurrencyInputKeyDown,
    onResetThumbnailGenerationConcurrency,
    onThumbnailResolveConcurrencyInputChange:
      handleThumbnailResolveConcurrencyInputChange,
    onThumbnailResolveConcurrencyInputBlur:
      commitThumbnailResolveConcurrencyInput,
    onThumbnailResolveConcurrencyInputKeyDown:
      handleThumbnailResolveConcurrencyInputKeyDown,
    onResetThumbnailResolveConcurrency,
    onThumbnailQueueSizeInputChange: handleThumbnailQueueSizeInputChange,
    onThumbnailQueueSizeInputBlur: commitThumbnailQueueSizeInput,
    onThumbnailQueueSizeInputKeyDown: handleThumbnailQueueSizeInputKeyDown,
    onResetThumbnailQueueSize,
    onCpuTokenLimitInputChange: handleCpuTokenLimitInputChange,
    onCpuTokenLimitInputBlur: commitCpuTokenLimitInput,
    onCpuTokenLimitInputKeyDown: handleCpuTokenLimitInputKeyDown,
    onResetCpuTokenLimit,
    onThumbnailWarmupRadiusChange,
    onThumbnailWarmupConcurrencyChange,
    onFullscreenPrefetchRadiusChange,
    onFullscreenAdjacentPackagePrefetchChange,
    onFullscreenCrossPackagePrefetchCountChange,
    onFullscreenImageNavMaxPerSecondChange,
    onFullscreenDecodeCacheSizeChange,
    onFullscreenResamplingEnabledChange,
    onFullscreenLayeredRenderEnabledChange,
    onFullscreenUpsamplingKernelChange,
    onFullscreenDownsamplingKernelChange,
    onProxyServerChange,
    onExternalSourceWatcherEnabledChange,
    onRefreshEhentaiAuthStatus,
    onConnectEhentaiAuth,
    onDisconnectEhentaiAuth,
    onSubtitleFeatureEnabledChange,
    onSubtitleRenderModeChange,
    onSubtitleAdvancedVadPresetChange,
    onSubtitleAdvancedVadThresholdChange,
    onSubtitleAdvancedVadMinSilenceSecChange,
    onSubtitleAdvancedVadMinSpeechSecChange,
    onSubtitleAdvancedVadMaxSpeechSecChange,
    onSubtitleAdvancedSpeakerThresholdChange,
    onSubtitleValidPlaybackRateThresholdChange,
    onSubtitleLanguageChange,
    onSubtitleSelectedModelIdChange,
    onSubtitleModelDirPick,
    onSubtitleTextFillModeChange,
    onSubtitleTextColorChange,
    onSubtitleGradientStartColorChange,
    onSubtitleGradientEndColorChange,
    onSubtitleGradientDirectionChange,
    onSubtitleGradientCurveChange,
    onSubtitleStrokeColorChange,
    onSubtitleStrokeWidthChange,
    onSubtitleStrokeShadowColorChange,
    onSubtitleStrokeShadowRadiusChange,
    onSubtitleFontSizeChange,
    onSubtitleMaxLineCharsChange,
    onSubtitleOffsetYChange,
    onSubtitleStylePanelExpandedChange,
    onRefreshSubtitleModels,
    onStartSubtitleModelDownload,
    onCancelSubtitleModelDownload,
    onOpenSubtitleModelPage,
    onAdReviewVisionEndpointChange,
    onAdReviewVisionModelChange,
    onTestAdReviewVisionModel,
    onSaveAdReviewVisionModel,
    onSubtitleCleanupLlmEndpointChange,
    onSubtitleCleanupLlmModelChange,
    onSubtitleCleanupLlmPromptChange,
    onAdReviewExecutionModeChange,
    onAdReviewHashCompareStageChange,
    onAdReviewHashHitActionChange,
    onImportAdReviewKnownHashes,
    onExportAdReviewKnownHashes,
    onStyleChange,
    onPaletteModeChange,
    onPaletteDayChange,
    onPaletteNightChange,
    onClearDatabase,
    onPickDatabaseDirectoryPath,
    onPickThumbnailCacheDirectoryPath,
    onRefreshRuntimeInfo,
    onRefreshPreferenceDebug: refreshPreferenceDebug,
    onRefreshAudioEngineState: refreshAudioEngineState,
    onRefreshAudioOutputDevices: refreshAudioOutputDevices,
    onRefreshAudioTranscodeCapabilities: refreshAudioTranscodeCapabilities,
    onMpvBinDirectoryDraftChange: setMpvBinDirectoryDraft,
    onFfmpegBinDirectoryDraftChange: setFfmpegBinDirectoryDraft,
    onPickMpvBinDirectory: () => {
      void pickMpvBinDirectory();
    },
    onPickFfmpegBinDirectory: () => {
      void pickFfmpegBinDirectory();
    },
    onVerifyMpvBinDirectory: () => {
      void verifyMpvBinDirectory();
    },
    onVerifyFfmpegBinDirectory: () => {
      void verifyFfmpegBinDirectory();
    },
    onAudioEngineModeChange: (mode) => {
      void setAudioEngineMode(mode);
    },
    onAudioOutputDeviceChange: (deviceId) => {
      void setAudioOutputDevice(deviceId);
    },
    onAudioExclusiveChange: (enabled) => {
      void setAudioExclusive(enabled);
    },
    onAudioGaplessModeChange: (mode) => {
      void setAudioGaplessMode(mode);
    },
    onAudioReplayGainModeChange: (mode) => {
      void setAudioReplayGainMode(mode);
    },
    onOpenAdReviewDeleteOverlayDebug,
    onPerformancePresetChange,
  });

  const currentBinding = bindingTarget ? getBinding(bindingTarget) : "";
  const currentCombos = currentBinding ? currentBinding.split("|") : [];
  const settingsPanelA11y = buildA11yProps({
    id: "settings.panel",
    labelKey: "a11y.settings.panel",
    t,
  });
  const settingsCloseA11y = buildA11yProps({
    id: "settings.close",
    labelKey: "a11y.settings.close",
    titleKey: "tip.settings.close",
    t,
  });

  return (
    <div
      {...settingsPanelA11y}
      className="settings-mask"
      data-slot="fg-header-g1-settings-root-ovl"
      role="dialog"
      aria-modal="true"
      data-overlay-close="settings"
    >
      <section
        className={`mpx-large-panel mpx-large-panel--settings settings-panel mpx-btn-scope-panel-large ${panelDragging ? "is-dragging" : ""}`}
        data-slot="fg-header-g1-settings-root-panel"
        style={{
          fontSize: `${settingsFontSize}px`,
          transform: `translate(${panelOffset.x}px, ${panelOffset.y}px)`,
        }}
      >
        <div
          className="mpx-large-panel-head settings-head settings-head-draggable"
          {...headHandlers}
        >
          <span
            className="mpx-large-panel-head-spacer settings-head-spacer"
            aria-hidden="true"
          />
          <h2 style={{ color: "var(--mpx-large-panel-head-text, inherit)" }}>
            {t("ui.settings.panel")}
          </h2>
          <button
            {...settingsCloseA11y}
            className="mpx-btn settings-icon-btn main-icon-square-btn"
            data-slot="fg-panel-large-head-btn-group-main-btn-close"
            type="button"
            data-no-drag="true"
            onClick={onClose}
          >
            <MainUiIcon name="close" />
          </button>
        </div>

        <div className="mpx-large-panel-shell settings-shell">
          <aside
            className="mpx-large-panel-side settings-side mpx-btn-group mpx-btn-group--panel-large-side"
            data-slot="fg-panel-large-side-btn-group-nav"
            aria-label={t(a11yRegistry.settingsGroups.labelKey)}
          >
            {SETTINGS_SECTIONS.map((section) => (
              <button
                key={section.id}
                className={
                  activeSection === section.id
                    ? "mpx-btn theme-parameter-side-btn is-active"
                    : "mpx-btn theme-parameter-side-btn"
                }
                data-slot="fg-panel-large-side-btn-group-nav-btn-item"
                type="button"
                onClick={() => {
                  setActiveSection(section.id);
                  onSettingsPanelSectionChange(section.id);
                }}
              >
                {t(section.labelKey)}
              </button>
            ))}
          </aside>

          <main className="mpx-large-panel-main settings-main mpx-scroll-area">
            {mainSection}
          </main>
        </div>

        {bindingTarget ? (
          <SettingsShortcutBindingDialog
            t={t}
            bindingTarget={bindingTarget}
            currentCombos={currentCombos}
            onStartCapture={() => {
              setCapturedCombo("");
              setCapturingTarget(bindingTarget);
            }}
            onClearBinding={() => setBinding(bindingTarget, "")}
            onClose={() => {
              setBindingTarget(null);
              setCapturingTarget(null);
              setCapturedCombo("");
            }}
          />
        ) : null}

        {capturingTarget ? (
          <SettingsShortcutCaptureDialog
            t={t}
            capturedCombo={capturedCombo}
            mouseCapturePresets={MOUSE_CAPTURE_PRESETS}
            onPickPreset={setCapturedCombo}
            onConfirmAdd={() => {
              const existingBinding = getBinding(capturingTarget);
              const merged = appendShortcutBinding(
                existingBinding,
                capturedCombo,
              );
              setBinding(capturingTarget, merged);
              setCapturingTarget(null);
              setCapturedCombo("");
            }}
            onCancel={() => {
              setCapturingTarget(null);
              setCapturedCombo("");
            }}
          />
        ) : null}
      </section>
    </div>
  );
}

export default SettingsPanel;
