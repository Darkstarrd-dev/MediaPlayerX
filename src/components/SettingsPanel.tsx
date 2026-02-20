import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type { ReadRuntimeInfoResponseDto } from "../contracts/backend";
import type { RepositoryMode } from "../features/backend/repository";
import {
  appendShortcutBinding,
  keyboardEventToCombo,
  mouseEventToCombo,
  wheelEventToCombo,
  SHORTCUT_DEFINITIONS,
  type ShortcutAction,
  type ShortcutConflict,
  type ShortcutMap,
} from "../shortcuts";
import {
  renderSettingsMainSection,
  type SettingsSection,
} from "./settings/renderSettingsMainSection";
import type { RuntimeMediaCapabilityProbeResult } from "../features/app/useRuntimeInfoDiagnostics";
import { buildA11yProps } from "../i18n/a11y";
import { a11yRegistry } from "../i18n/ariaRegistry";
import { useI18n } from "../i18n/useI18n";
import { MainUiIcon } from "./MainUiIcon";
import { toScale } from "./settings/settingsScale";

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
  thumbnailWidth: number;
  thumbnailGenerationConcurrency: number;
  thumbnailResolveConcurrency: number;
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
  onClose: () => void;
  onUiLocaleChange: (value: "auto" | "zh-CN" | "en-US") => void;
  onStyleChange: (value: string) => void;
  onPaletteModeChange: (value: "day" | "night") => void;
  onPaletteDayChange: (value: string) => void;
  onPaletteNightChange: (value: string) => void;
  onHeaderHeightChange: (value: number) => void;
  onSettingsBackdropOpacityChange: (value: number) => void;
  onSettingsFontSizeChange: (value: number) => void;
  onSidebarRatioChange: (value: number) => void;
  onSidebarMinWidthChange: (value: number) => void;
  onLayoutLockedChange: (value: boolean) => void;
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
  onThumbnailWidthChange: (value: number) => void;
  onResetThumbnailWidth: () => void;
  onThumbnailGenerationConcurrencyChange: (value: number) => void;
  onThumbnailResolveConcurrencyChange: (value: number) => void;
  onResetThumbnailGenerationConcurrency: () => void;
  onResetThumbnailResolveConcurrency: () => void;
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
}

type BindingTarget = { action: ShortcutAction; label: string };
type PanelOffset = { x: number; y: number };
type PanelDragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startOffsetX: number;
  startOffsetY: number;
};

const MOUSE_CAPTURE_PRESETS: Array<{ labelKey: string; combo: string }> = [
  { labelKey: "ui.settings.mousePresetLeft", combo: "MouseLeft" },
  { labelKey: "ui.settings.mousePresetMiddle", combo: "MouseMiddle" },
  { labelKey: "ui.settings.mousePresetRight", combo: "MouseRight" },
  { labelKey: "ui.settings.mousePresetBack", combo: "MouseBack" },
  { labelKey: "ui.settings.mousePresetForward", combo: "MouseForward" },
  { labelKey: "ui.settings.mousePresetWheelUp", combo: "WheelUp" },
  { labelKey: "ui.settings.mousePresetWheelDown", combo: "WheelDown" },
];

const SETTINGS_SECTIONS: Array<{ id: SettingsSection; labelKey: string }> = [
  { id: "layout", labelKey: "ui.settings.sectionLayout" },
  { id: "model", labelKey: "ui.settings.sectionModel" },
  { id: "shortcuts", labelKey: "ui.settings.sectionShortcuts" },
  { id: "database", labelKey: "ui.settings.sectionDatabase" },
  { id: "system", labelKey: "ui.settings.sectionSystem" },
];

const THUMBNAIL_WIDTH_MIN = 128;
const THUMBNAIL_WIDTH_MAX = 2048;
const THUMBNAIL_GENERATION_CONCURRENCY_MIN = 1;
const THUMBNAIL_GENERATION_CONCURRENCY_MAX = 16;
const THUMBNAIL_RESOLVE_CONCURRENCY_MIN = 1;
const THUMBNAIL_RESOLVE_CONCURRENCY_MAX = 32;

function shouldIgnoreSettingsPanelDragStart(
  target: EventTarget | null,
): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      'button, input, select, textarea, a, label, [data-no-drag="true"]',
    ),
  );
}

function resolveSettingsSection(raw: unknown): SettingsSection {
  if (
    raw === "layout" ||
    raw === "system" ||
    raw === "model" ||
    raw === "database" ||
    raw === "shortcuts"
  ) {
    return raw;
  }
  if (raw === "theme" || raw === "thumbnail") {
    return "layout";
  }
  return "layout";
}

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
  sidebarRatio,
  sidebarMinWidth,
  layoutLocked,
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
  thumbnailWidth,
  thumbnailGenerationConcurrency,
  thumbnailResolveConcurrency,
  proxyServer,
  ehentaiCookies,
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
  onClose,
  onUiLocaleChange,
  onStyleChange,
  onPaletteModeChange,
  onPaletteDayChange,
  onPaletteNightChange,
  onHeaderHeightChange,
  onSettingsBackdropOpacityChange,
  onSettingsFontSizeChange,
  onSidebarRatioChange,
  onSidebarMinWidthChange,
  onLayoutLockedChange,
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
  onThumbnailWidthChange,
  onResetThumbnailWidth,
  onThumbnailGenerationConcurrencyChange,
  onThumbnailResolveConcurrencyChange,
  onResetThumbnailGenerationConcurrency,
  onResetThumbnailResolveConcurrency,
  onProxyServerChange,
  onEhentaiCookiesChange,
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
  const captureDialogRef = useRef<HTMLDivElement>(null);
  const settingsPanelRef = useRef<HTMLElement>(null);
  const panelDragStateRef = useRef<PanelDragState | null>(null);
  const [settingsPanelOffset, setSettingsPanelOffset] = useState<PanelOffset>({
    x: 0,
    y: 0,
  });
  const [settingsPanelDragging, setSettingsPanelDragging] = useState(false);

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
      panelDragStateRef.current = null;
      setSettingsPanelOffset({ x: 0, y: 0 });
      setSettingsPanelDragging(false);
    }
  }, [
    settingsOpen,
    thumbnailGenerationConcurrency,
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
          <label key={definition.action} className="shortcut-row">
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
    sidebarRatio,
    sidebarMinWidth,
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
    thumbnailWidthInputValue,
    thumbnailGenerationConcurrencyInput,
    thumbnailResolveConcurrencyInput,
    proxyServer,
    ehentaiCookies,
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
    renderBindingRows,
    onResetShortcuts,
    onUiLocaleChange,
    onLayoutLockedChange,
    onElectronNativeChromeEnabledChange,
    onThemeParameterButtonVisibleChange,
    onHeaderHeightChange,
    settingsBackdropOpacity,
    onSettingsFontSizeChange,
    onSettingsBackdropOpacityChange,
    onSidebarRatioChange,
    onSidebarMinWidthChange,
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
    onProxyServerChange,
    onEhentaiCookiesChange,
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

          <main className="settings-main">{mainSection}</main>
        </div>

        {bindingTarget ? (
          <div
            className="settings-floating-mask"
            data-slot="fg-header-g1-settings-shortcut-edit-panel"
            role="dialog"
            aria-modal="true"
            aria-label={t(a11yRegistry.settingsShortcutEditDialog.labelKey)}
          >
            <section className="settings-floating-panel">
              <h3>{bindingTarget.label}</h3>
              {currentCombos.length > 0 ? (
                <ul className="binding-chip-list">
                  {currentCombos.map((combo) => (
                    <li key={combo}>{combo}</li>
                  ))}
                </ul>
              ) : (
                <p className="settings-placeholder">
                  {t("ui.settings.shortcutNoneConfigured")}
                </p>
              )}
              <div className="settings-floating-actions">
                <button
                  type="button"
                  data-capture-ignore="true"
                  onClick={() => {
                    setCapturedCombo("");
                    setCapturingTarget(bindingTarget);
                  }}
                >
                  {t("ui.common.add")}
                </button>
                <button
                  type="button"
                  data-capture-ignore="true"
                  onClick={() => setBinding(bindingTarget, "")}
                >
                  {t("ui.common.clear")}
                </button>
                <button
                  type="button"
                  data-capture-ignore="true"
                  onClick={() => {
                    setBindingTarget(null);
                    setCapturingTarget(null);
                    setCapturedCombo("");
                  }}
                >
                  {t("ui.common.close")}
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {capturingTarget ? (
          <div
            className="settings-floating-mask"
            data-slot="fg-header-g1-settings-shortcut-capture-panel"
            role="dialog"
            aria-modal="true"
            aria-label={t(a11yRegistry.settingsShortcutCaptureDialog.labelKey)}
          >
            <section ref={captureDialogRef} className="settings-floating-panel">
              <h3>{t("ui.settings.shortcutCaptureTitle")}</h3>
              <p className="settings-placeholder">
                {t("ui.settings.shortcutCaptureHint")}
              </p>
              <p className="binding-capture-preview">
                {capturedCombo || t("ui.settings.shortcutCaptureWaiting")}
              </p>
              <div className="binding-mouse-presets" data-capture-ignore="true">
                <span>{t("ui.settings.shortcutMousePresets")}</span>
                <div className="binding-mouse-preset-list">
                  {MOUSE_CAPTURE_PRESETS.map((preset) => (
                    <button
                      key={preset.combo}
                      type="button"
                      data-capture-ignore="true"
                      onClick={() => {
                        setCapturedCombo(preset.combo);
                      }}
                    >
                      {t(preset.labelKey)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="settings-floating-actions">
                <button
                  type="button"
                  data-capture-ignore="true"
                  disabled={!capturedCombo}
                  onClick={() => {
                    const existingBinding = getBinding(capturingTarget);
                    const merged = appendShortcutBinding(
                      existingBinding,
                      capturedCombo,
                    );
                    setBinding(capturingTarget, merged);
                    setCapturingTarget(null);
                    setCapturedCombo("");
                  }}
                >
                  {t("ui.settings.shortcutConfirmAdd")}
                </button>
                <button
                  type="button"
                  data-capture-ignore="true"
                  onClick={() => {
                    setCapturingTarget(null);
                    setCapturedCombo("");
                  }}
                >
                  {t("ui.common.cancel")}
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export default SettingsPanel;
