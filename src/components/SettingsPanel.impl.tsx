import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
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
import { SettingsShortcutBindingDialog } from "./settings/SettingsShortcutBindingDialog";
import { SettingsShortcutCaptureDialog } from "./settings/SettingsShortcutCaptureDialog";
import {
  CPU_TOKEN_LIMIT_MAX,
  CPU_TOKEN_LIMIT_MIN,
  MOUSE_CAPTURE_PRESETS,
  type BindingTarget,
  type PanelDragState,
  type PanelOffset,
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
  shouldIgnoreSettingsPanelDragStart,
} from "./settings/settingsPanelHelpers";
import { toScale } from "./settings/settingsScale";
import type { SettingsPanelProps } from "./SettingsPanel.types";

function SettingsPanel({
  settingsOpen,
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
  fullscreenDecodeCacheSize,
  fullscreenResamplingEnabled,
  fullscreenUpsamplingKernel,
  fullscreenDownsamplingKernel,
  proxyServer,
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
  onFullscreenDecodeCacheSizeChange,
  onFullscreenResamplingEnabledChange,
  onFullscreenUpsamplingKernelChange,
  onFullscreenDownsamplingKernelChange,
  onProxyServerChange,
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
  const [activeSectionRaw, setActiveSection] =
    useState<SettingsSection>("layout");
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
  const settingsPanelRef = useRef<HTMLElement>(null);
  const panelDragStateRef = useRef<PanelDragState | null>(null);
  const [settingsPanelOffset, setSettingsPanelOffset] = useState<PanelOffset>({
    x: 0,
    y: 0,
  });
  const [settingsPanelDragging, setSettingsPanelDragging] = useState(false);
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
  const thumbnailGapScale = toScale("thumbnailGap", thumbnailGap);

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
      setActiveSection("layout");
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
      panelDragStateRef.current = null;
      setSettingsPanelOffset({ x: 0, y: 0 });
      setSettingsPanelDragging(false);
      resetPreferenceDebugState();
    }
  }, [
    settingsOpen,
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

  const stopSettingsPanelDragging = () => {
    panelDragStateRef.current = null;
    setSettingsPanelDragging(false);
  };

  const handleSettingsHeadPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (event.button !== 0) {
      return;
    }
    if (shouldIgnoreSettingsPanelDragStart(event.target)) {
      return;
    }

    panelDragStateRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: settingsPanelOffset.x,
      startOffsetY: settingsPanelOffset.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    setSettingsPanelDragging(true);
    event.preventDefault();
  };

  const handleSettingsHeadPointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const dragState = panelDragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const nextOffset = {
      x: dragState.startOffsetX + (event.clientX - dragState.startClientX),
      y: dragState.startOffsetY + (event.clientY - dragState.startClientY),
    };

    setSettingsPanelOffset((previousOffset) => {
      if (
        Math.abs(previousOffset.x - nextOffset.x) < 0.5 &&
        Math.abs(previousOffset.y - nextOffset.y) < 0.5
      ) {
        return previousOffset;
      }
      return nextOffset;
    });

    event.preventDefault();
  };

  const handleSettingsHeadPointerUp = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const dragState = panelDragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    stopSettingsPanelDragging();
  };

  const handleSettingsHeadPointerCancel = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const dragState = panelDragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    stopSettingsPanelDragging();
  };

  const handleSettingsHeadLostPointerCapture = () => {
    stopSettingsPanelDragging();
  };

  const mainSection = renderSettingsMainSection({
    t,
    activeSection,
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
    thumbnailGap,
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
    fullscreenDecodeCacheSize,
    fullscreenResamplingEnabled,
    fullscreenUpsamplingKernel,
    fullscreenDownsamplingKernel,
    proxyServer,
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
    onFullscreenDecodeCacheSizeChange,
    onFullscreenResamplingEnabledChange,
    onFullscreenUpsamplingKernelChange,
    onFullscreenDownsamplingKernelChange,
    onProxyServerChange,
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
      data-slot="fg-header-g1-settings-root-panel"
      role="dialog"
      aria-modal="true"
      data-overlay-close="settings"
    >
      <section
        ref={settingsPanelRef}
        className={`settings-panel ${settingsPanelDragging ? "is-dragging" : ""}`}
        style={{
          fontSize: `${settingsFontSize}px`,
          transform: `translate(${settingsPanelOffset.x}px, ${settingsPanelOffset.y}px)`,
        }}
      >
        <div
          className="settings-head settings-head-draggable"
          onPointerDown={handleSettingsHeadPointerDown}
          onPointerMove={handleSettingsHeadPointerMove}
          onPointerUp={handleSettingsHeadPointerUp}
          onPointerCancel={handleSettingsHeadPointerCancel}
          onLostPointerCapture={handleSettingsHeadLostPointerCapture}
        >
          <span className="settings-head-spacer" aria-hidden="true" />
          <h2>{t("ui.settings.panel")}</h2>
          <button
            {...settingsCloseA11y}
            className="settings-icon-btn main-icon-square-btn"
            type="button"
            data-no-drag="true"
            onClick={onClose}
          >
            <MainUiIcon name="close" />
          </button>
        </div>

        <div className="settings-shell">
          <aside
            className="settings-side"
            aria-label={t(a11yRegistry.settingsGroups.labelKey)}
          >
            {SETTINGS_SECTIONS.map((section) => (
              <button
                key={section.id}
                className={activeSection === section.id ? "is-active" : ""}
                type="button"
                onClick={() => setActiveSection(section.id)}
              >
                {t(section.labelKey)}
              </button>
            ))}
          </aside>

          <main className="settings-main mpx-scroll-area">{mainSection}</main>
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
