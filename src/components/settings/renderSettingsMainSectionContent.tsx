import {
  listPalettesByStyle,
  listStyles,
  resolvePalettePairForStyle,
  resolveStyleIdFromStyles,
} from "../../features/theme/themeRegistry";
import type { JSX } from "react";

import { MainUiIcon } from "../MainUiIcon";
import { renderSettingsDatabaseSection } from "./renderSettingsDatabaseSection";
import { renderSettingsDebugSection } from "./renderSettingsDebugSection";
import { renderSettingsModelSection } from "./renderSettingsModelSection";
import { renderSettingsPerformanceSection } from "./renderSettingsPerformanceSection";
import { renderSettingsShortcutsSection } from "./renderSettingsShortcutsSection";
import { renderSettingsSystemSection } from "./renderSettingsSystemSection";
import { formatScale, SIZE_SCALE_CONFIG, toAbsolutePx } from "./settingsScale";
import type { RenderSettingsMainSectionParams } from "./renderSettingsMainSection.types";

export type { SettingsSection } from "./renderSettingsMainSection.types";

export function renderSettingsMainSection(
  params: RenderSettingsMainSectionParams,
): JSX.Element {
  const { t, activeSection } = params;
  const settingsTip = (key: string): string => t(`ui.settings.tooltip.${key}`);

  if (activeSection === "layout") {
    const {
      uiLocale,
      layoutLocked,
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
      thumbnailAdaptiveResolution,
      thumbnailWidthInputValue,
      thumbnailGenerationConcurrencyInput,
      thumbnailResolveConcurrencyInput,
      styleId,
      paletteMode,
      paletteDayId,
      paletteNightId,
      settingsBackdropOpacity,
      onUiLocaleChange,
      onLayoutLockedChange,
      onHeaderHeightChange,
      onSettingsBackdropOpacityChange,
      onSettingsFontSizeChange,
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
      onThumbnailAdaptiveResolutionChange,
      onThumbnailWidthInputChange,
      onThumbnailWidthInputBlur,
      onThumbnailWidthInputKeyDown,
      onResetThumbnailWidth,
      onThumbnailGenerationConcurrencyInputChange,
      onThumbnailGenerationConcurrencyInputBlur,
      onThumbnailGenerationConcurrencyInputKeyDown,
      onResetThumbnailGenerationConcurrency,
      onThumbnailResolveConcurrencyInputChange,
      onThumbnailResolveConcurrencyInputBlur,
      onThumbnailResolveConcurrencyInputKeyDown,
      onResetThumbnailResolveConcurrency,
      onStyleChange,
      onPaletteModeChange,
      onPaletteDayChange,
      onPaletteNightChange,
    } = params;
    const styles = listStyles();
    const selectedStyleId = resolveStyleIdFromStyles(styleId, styles);
    const palettes = listPalettesByStyle(selectedStyleId);
    const selectedPalettePair = resolvePalettePairForStyle(
      selectedStyleId,
      paletteDayId,
      paletteNightId,
    );

    return (
      <div className="settings-block">
        <section className="settings-group">
          <header className="settings-group-head">
            <span>{t("ui.settings.languageSection")}</span>
          </header>
          <label
            htmlFor="settings-ui-locale-select"
            data-tooltip-label={settingsTip("uiLocale")}
          >
            {t("ui.settings.languageLabel")}
            <select
              id="settings-ui-locale-select"
              value={uiLocale}
              onChange={(event) =>
                onUiLocaleChange(
                  event.target.value as "auto" | "zh-CN" | "en-US",
                )
              }
            >
              <option value="auto">
                {t("ui.settings.languageOptionAuto")}
              </option>
              <option value="zh-CN">
                {t("ui.settings.languageOptionZhCn")}
              </option>
              <option value="en-US">
                {t("ui.settings.languageOptionEnUs")}
              </option>
            </select>
          </label>
        </section>

        <section className="settings-group">
          <header className="settings-group-head">
            <span>{t("ui.settings.themeSection")}</span>
          </header>
          <div className="settings-theme-inline-row">
            <label htmlFor="theme-style-select" data-tooltip-label={settingsTip("style")}
            >
              {t("ui.settings.styleLabel")}
              <select
                id="theme-style-select"
                value={selectedStyleId}
                onChange={(event) => onStyleChange(event.target.value)}
              >
                {styles.map((style) => (
                  <option key={style.id} value={style.id}>
                    {style.label}
                  </option>
                ))}
              </select>
            </label>
            <label
              htmlFor="theme-palette-day-select"
              data-tooltip-label={settingsTip("paletteDay")}
            >
              {t("ui.settings.paletteDayDefault")}
              {paletteMode === "day" ? t("ui.settings.currentActiveTag") : ""}
              <select
                id="theme-palette-day-select"
                aria-label={t("ui.settings.paletteDayDefault")}
                value={selectedPalettePair.day}
                onChange={(event) => onPaletteDayChange(event.target.value)}
              >
                {palettes.map((palette) => (
                  <option key={palette.id} value={palette.id}>
                    {palette.label}
                  </option>
                ))}
              </select>
            </label>
            <label
              htmlFor="theme-palette-night-select"
              data-tooltip-label={settingsTip("paletteNight")}
            >
              {t("ui.settings.paletteNightDefault")}
              {paletteMode === "night" ? t("ui.settings.currentActiveTag") : ""}
              <select
                id="theme-palette-night-select"
                aria-label={t("ui.settings.paletteNightDefault")}
                value={selectedPalettePair.night}
                onChange={(event) => onPaletteNightChange(event.target.value)}
              >
                {palettes.map((palette) => (
                  <option key={palette.id} value={palette.id}>
                    {palette.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="header-settings-btn header-icon-only-btn settings-theme-toggle-btn"
              type="button"
              aria-label={
                paletteMode === "day"
                  ? t("a11y.header.switchToNightPalette")
                  : t("a11y.header.switchToDayPalette")
              }
              data-tooltip-label={
                paletteMode === "day"
                  ? t("a11y.header.switchToNightPalette")
                  : t("a11y.header.switchToDayPalette")
              }
              aria-pressed={paletteMode === "night"}
              onClick={() =>
                onPaletteModeChange(paletteMode === "day" ? "night" : "day")
              }
            >
              <MainUiIcon name={paletteMode === "day" ? "day" : "night"} />
            </button>
          </div>
          <label data-tooltip-label={settingsTip("backdropOpacity")}>
            {t("ui.settings.backdropOpacity", {
              value: settingsBackdropOpacity.toFixed(0),
            })}
            <input
              max={100}
              min={0}
              step={1}
              type="range"
              value={settingsBackdropOpacity}
              onChange={(event) =>
                onSettingsBackdropOpacityChange(Number(event.target.value))
              }
            />
          </label>
        </section>

        <section className="settings-group">
          <header className="settings-group-head">
            <span>{t("ui.settings.thumbnailSection")}</span>
          </header>
          <label data-tooltip-label={settingsTip("thumbnailGap")}>
            {t("ui.settings.thumbnailGapScale", {
              scale: formatScale(thumbnailGapScale),
              px: thumbnailGap,
            })}
            <input
              max={SIZE_SCALE_CONFIG.thumbnailGap.max}
              min={SIZE_SCALE_CONFIG.thumbnailGap.min}
              step={SIZE_SCALE_CONFIG.thumbnailGap.step}
              type="range"
              value={thumbnailGapScale}
              onChange={(event) =>
                onThumbnailGapChange(
                  toAbsolutePx("thumbnailGap", Number(event.target.value)),
                )
              }
            />
          </label>
          <label
            className="settings-toggle-row"
            data-tooltip-label={settingsTip("thumbnailAdaptiveResolution")}
          >
            <span>{t("ui.settings.thumbnailAdaptiveResolution")}</span>
            <input
              type="checkbox"
              checked={thumbnailAdaptiveResolution}
              onChange={(event) =>
                onThumbnailAdaptiveResolutionChange(event.target.checked)
              }
            />
          </label>
          <div className="settings-thumbnail-four-row">
            <div
              className="settings-compact-control-cell"
              data-tooltip-label={settingsTip("thumbnailQuality")}
            >
              <span>{t("ui.settings.thumbnailQuality")}</span>
              <div className="settings-compact-control-actions">
                <input
                  max={100}
                  min={1}
                  type="number"
                  aria-label={t("ui.settings.thumbnailQuality")}
                  value={thumbnailQuality}
                  onChange={(event) =>
                    onThumbnailQualityChange(Number(event.target.value))
                  }
                />
                <button
                  className="settings-icon-btn main-icon-square-btn"
                  type="button"
                  aria-label={t("a11y.common.restoreDefault")}
                  data-tooltip-label={t("tip.common.restoreDefault")}
                  onClick={onResetThumbnailQuality}
                >
                  <MainUiIcon name="return" />
                </button>
              </div>
            </div>
            <div
              className="settings-compact-control-cell"
              data-tooltip-label={settingsTip("thumbnailResolution")}
            >
              <span>{t("ui.settings.thumbnailResolution")}</span>
              <div className="settings-compact-control-actions">
                <input
                  max={2048}
                  min={128}
                  type="number"
                  aria-label={t("ui.settings.thumbnailResolution")}
                  value={thumbnailWidthInputValue}
                  onBlur={onThumbnailWidthInputBlur}
                  onChange={(event) =>
                    onThumbnailWidthInputChange(event.target.value)
                  }
                  onKeyDown={onThumbnailWidthInputKeyDown}
                />
                <button
                  className="settings-icon-btn main-icon-square-btn"
                  type="button"
                  aria-label={t("a11y.common.restoreDefault")}
                  data-tooltip-label={t("tip.common.restoreDefault")}
                  onClick={onResetThumbnailWidth}
                >
                  <MainUiIcon name="return" />
                </button>
              </div>
            </div>
            <div
              className="settings-compact-control-cell"
              data-tooltip-label={settingsTip("thumbnailGenerationConcurrency")}
            >
              <span>{t("ui.settings.thumbnailGenerationConcurrency")}</span>
              <div className="settings-compact-control-actions">
                <input
                  max={16}
                  min={1}
                  type="number"
                  aria-label={t("ui.settings.thumbnailGenerationConcurrency")}
                  value={thumbnailGenerationConcurrencyInput}
                  onBlur={onThumbnailGenerationConcurrencyInputBlur}
                  onChange={(event) =>
                    onThumbnailGenerationConcurrencyInputChange(
                      event.target.value,
                    )
                  }
                  onKeyDown={onThumbnailGenerationConcurrencyInputKeyDown}
                />
                <button
                  className="settings-icon-btn main-icon-square-btn"
                  type="button"
                  aria-label={t("a11y.common.restoreDefault")}
                  data-tooltip-label={t("tip.common.restoreDefault")}
                  onClick={onResetThumbnailGenerationConcurrency}
                >
                  <MainUiIcon name="return" />
                </button>
              </div>
            </div>
            <div
              className="settings-compact-control-cell"
              data-tooltip-label={settingsTip("thumbnailResolveConcurrency")}
            >
              <span>{t("ui.settings.thumbnailResolveConcurrency")}</span>
              <div className="settings-compact-control-actions">
                <input
                  max={32}
                  min={1}
                  type="number"
                  aria-label={t("ui.settings.thumbnailResolveConcurrency")}
                  value={thumbnailResolveConcurrencyInput}
                  onBlur={onThumbnailResolveConcurrencyInputBlur}
                  onChange={(event) =>
                    onThumbnailResolveConcurrencyInputChange(event.target.value)
                  }
                  onKeyDown={onThumbnailResolveConcurrencyInputKeyDown}
                />
                <button
                  className="settings-icon-btn main-icon-square-btn"
                  type="button"
                  aria-label={t("a11y.common.restoreDefault")}
                  data-tooltip-label={t("tip.common.restoreDefault")}
                  onClick={onResetThumbnailResolveConcurrency}
                >
                  <MainUiIcon name="return" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="settings-group">
          <header className="settings-group-head">
            <span>{t("ui.settings.layoutSection")}</span>
          </header>
          <label
            className="settings-toggle-row"
            data-tooltip-label={settingsTip("layoutLocked")}
          >
            <span>{t("ui.settings.layoutLocked")}</span>
            <input
              type="checkbox"
              checked={layoutLocked}
              onChange={(event) => onLayoutLockedChange(event.target.checked)}
            />
          </label>
          <label data-tooltip-label={settingsTip("headerHeight")}>
            {t("ui.settings.headerHeightScale", {
              scale: formatScale(headerHeightScale),
              px: headerHeight,
            })}
            <input
              max={SIZE_SCALE_CONFIG.headerHeight.max}
              min={SIZE_SCALE_CONFIG.headerHeight.min}
              step={SIZE_SCALE_CONFIG.headerHeight.step}
              type="range"
              value={headerHeightScale}
              onChange={(event) =>
                onHeaderHeightChange(
                  toAbsolutePx("headerHeight", Number(event.target.value)),
                )
              }
            />
          </label>
          <label data-tooltip-label={settingsTip("settingsFontScale")}>
            {t("ui.settings.settingsFontScale", {
              scale: formatScale(settingsFontSizeScale),
              px: settingsFontSize,
            })}
            <input
              max={SIZE_SCALE_CONFIG.settingsFontSize.max}
              min={SIZE_SCALE_CONFIG.settingsFontSize.min}
              step={SIZE_SCALE_CONFIG.settingsFontSize.step}
              type="range"
              value={settingsFontSizeScale}
              onChange={(event) =>
                onSettingsFontSizeChange(
                  toAbsolutePx("settingsFontSize", Number(event.target.value)),
                )
              }
            />
          </label>
          <label data-tooltip-label={settingsTip("sidebarRatio")}>
            {t("ui.settings.sidebarRatio", {
              percent: (sidebarRatio * 100).toFixed(0),
            })}
            <input
              max={0.95}
              min={0}
              step={0.005}
              type="range"
              value={sidebarRatio}
              onChange={(event) =>
                onSidebarRatioChange(Number(event.target.value))
              }
            />
          </label>
          <label data-tooltip-label={settingsTip("sidebarMinWidth")}>
            {t("ui.settings.sidebarMinWidthScale", {
              scale: formatScale(sidebarMinWidthScale),
              px: sidebarMinWidth,
            })}
            <input
              max={SIZE_SCALE_CONFIG.sidebarMinWidth.max}
              min={SIZE_SCALE_CONFIG.sidebarMinWidth.min}
              step={SIZE_SCALE_CONFIG.sidebarMinWidth.step}
              type="range"
              value={sidebarMinWidthScale}
              onChange={(event) =>
                onSidebarMinWidthChange(
                  toAbsolutePx("sidebarMinWidth", Number(event.target.value)),
                )
              }
            />
          </label>
          <label data-tooltip-label={settingsTip("sidebarFontScale")}>
            {t("ui.settings.sidebarFontScale", {
              scale: formatScale(sidebarFontSizeScale),
              px: sidebarFontSize,
            })}
            <input
              max={SIZE_SCALE_CONFIG.sidebarFontSize.max}
              min={SIZE_SCALE_CONFIG.sidebarFontSize.min}
              step={SIZE_SCALE_CONFIG.sidebarFontSize.step}
              type="range"
              value={sidebarFontSizeScale}
              onChange={(event) =>
                onSidebarFontSizeChange(
                  toAbsolutePx("sidebarFontSize", Number(event.target.value)),
                )
              }
            />
          </label>
          <label data-tooltip-label={settingsTip("sidebarCountFontScale")}>
            {t("ui.settings.sidebarCountFontScale", {
              scale: formatScale(sidebarCountFontSizeScale),
              px: sidebarCountFontSize,
            })}
            <input
              max={SIZE_SCALE_CONFIG.sidebarCountFontSize.max}
              min={SIZE_SCALE_CONFIG.sidebarCountFontSize.min}
              step={SIZE_SCALE_CONFIG.sidebarCountFontSize.step}
              type="range"
              value={sidebarCountFontSizeScale}
              onChange={(event) =>
                onSidebarCountFontSizeChange(
                  toAbsolutePx(
                    "sidebarCountFontSize",
                    Number(event.target.value),
                  ),
                )
              }
            />
          </label>
          <label data-tooltip-label={settingsTip("sidebarIndentScale")}>
            {t("ui.settings.sidebarIndentScale", {
              scale: formatScale(sidebarIndentStepScale),
              px: sidebarIndentStep,
            })}
            <input
              max={SIZE_SCALE_CONFIG.sidebarIndentStep.max}
              min={SIZE_SCALE_CONFIG.sidebarIndentStep.min}
              step={SIZE_SCALE_CONFIG.sidebarIndentStep.step}
              type="range"
              value={sidebarIndentStepScale}
              onChange={(event) =>
                onSidebarIndentStepChange(
                  toAbsolutePx("sidebarIndentStep", Number(event.target.value)),
                )
              }
            />
          </label>
          <label data-tooltip-label={settingsTip("sidebarVerticalGapScale")}>
            {t("ui.settings.sidebarVerticalGapScale", {
              scale: formatScale(sidebarVerticalGapScale),
              px: sidebarVerticalGap,
            })}
            <input
              max={SIZE_SCALE_CONFIG.sidebarVerticalGap.max}
              min={SIZE_SCALE_CONFIG.sidebarVerticalGap.min}
              step={SIZE_SCALE_CONFIG.sidebarVerticalGap.step}
              type="range"
              value={sidebarVerticalGapScale}
              onChange={(event) =>
                onSidebarVerticalGapChange(
                  toAbsolutePx(
                    "sidebarVerticalGap",
                    Number(event.target.value),
                  ),
                )
              }
            />
          </label>
          <label data-tooltip-label={settingsTip("metadataPanelRatio")}>
            {t("ui.settings.metadataPanelRatio", {
              percent: (metadataRatio * 100).toFixed(0),
            })}
            <input
              max={0.45}
              min={0.2}
              step={0.01}
              type="range"
              value={metadataRatio}
              onChange={(event) =>
                onMetadataRatioChange(Number(event.target.value))
              }
            />
          </label>
          <label data-tooltip-label={settingsTip("workspaceBottomPanelHeightScale")}>
            {t("ui.settings.workspaceBottomPanelHeightScale", {
              scale: formatScale(workspaceBottomPanelHeightScale),
              px: workspaceBottomPanelHeight,
            })}
            <input
              max={SIZE_SCALE_CONFIG.workspaceBottomPanelHeight.max}
              min={SIZE_SCALE_CONFIG.workspaceBottomPanelHeight.min}
              step={SIZE_SCALE_CONFIG.workspaceBottomPanelHeight.step}
              type="range"
              value={workspaceBottomPanelHeightScale}
              onChange={(event) =>
                onWorkspaceBottomPanelHeightChange(
                  toAbsolutePx(
                    "workspaceBottomPanelHeight",
                    Number(event.target.value),
                  ),
                )
              }
            />
          </label>
          <label data-tooltip-label={settingsTip("fullscreenVideoControlsMaxWidthScale")}>
            {t("ui.settings.fullscreenVideoControlsMaxWidthScale", {
              scale: formatScale(fullscreenVideoControlsMaxWidthScale),
              px: fullscreenVideoControlsMaxWidth,
            })}
            <input
              max={SIZE_SCALE_CONFIG.fullscreenVideoControlsMaxWidth.max}
              min={SIZE_SCALE_CONFIG.fullscreenVideoControlsMaxWidth.min}
              step={SIZE_SCALE_CONFIG.fullscreenVideoControlsMaxWidth.step}
              type="range"
              value={fullscreenVideoControlsMaxWidthScale}
              onChange={(event) =>
                onFullscreenVideoControlsMaxWidthChange(
                  toAbsolutePx(
                    "fullscreenVideoControlsMaxWidth",
                    Number(event.target.value),
                  ),
                )
              }
            />
          </label>
          <label data-tooltip-label={settingsTip("mediaPreloadMemoryBudgetMb")}>
            {t("ui.settings.mediaPreloadMemoryBudgetMb", {
              value: mediaPreloadMemoryBudgetMb,
            })}
            <input
              max={4096}
              min={0}
              step={64}
              type="range"
              value={mediaPreloadMemoryBudgetMb}
              onChange={(event) =>
                onMediaPreloadMemoryBudgetMbChange(Number(event.target.value))
              }
            />
          </label>
        </section>
      </div>
    );
  }

  if (activeSection === "performance") {
    return renderSettingsPerformanceSection({ params, settingsTip });
  }

  if (activeSection === "system") {
    return renderSettingsSystemSection({
      t,
      repositoryMode: params.repositoryMode,
      backendBridgeInjected: params.backendBridgeInjected,
      runtimeInfoLoading: params.runtimeInfoLoading,
      runtimeInfoError: params.runtimeInfoError,
      runtimeInfo: params.runtimeInfo,
      mediaCapabilitiesLoading: params.mediaCapabilitiesLoading,
      mediaCapabilitiesError: params.mediaCapabilitiesError,
      mediaCapabilities: params.mediaCapabilities,
      onRefreshRuntimeInfo: params.onRefreshRuntimeInfo,
      preferenceDebugLoading: params.preferenceDebugLoading,
      preferenceDebugError: params.preferenceDebugError,
      preferenceDebugData: params.preferenceDebugData,
      onRefreshPreferenceDebug: params.onRefreshPreferenceDebug,
      audioEngineLoading: params.audioEngineLoading,
      audioEngineUpdating: params.audioEngineUpdating,
      audioEngineError: params.audioEngineError,
      audioEngineMode: params.audioEngineMode,
      audioEngineDesiredMode: params.audioEngineDesiredMode,
      audioEngineUsingFallback: params.audioEngineUsingFallback,
      audioEngineMpvAvailable: params.audioEngineMpvAvailable,
      audioEngineMpvBinPath: params.audioEngineMpvBinPath,
      mpvBinDirectoryDraft: params.mpvBinDirectoryDraft,
      mpvBinVerifyPending: params.mpvBinVerifyPending,
      mpvBinVerifyMessage: params.mpvBinVerifyMessage,
      audioEngineActiveDeviceId: params.audioEngineActiveDeviceId,
      audioEngineExclusiveEnabled: params.audioEngineExclusiveEnabled,
      audioEngineGaplessMode: params.audioEngineGaplessMode,
      audioEngineReplayGainMode: params.audioEngineReplayGainMode,
      audioOutputDevicesLoading: params.audioOutputDevicesLoading,
      audioOutputDevices: params.audioOutputDevices,
      onRefreshAudioEngineState: params.onRefreshAudioEngineState,
      onRefreshAudioOutputDevices: params.onRefreshAudioOutputDevices,
      onMpvBinDirectoryDraftChange: params.onMpvBinDirectoryDraftChange,
      onPickMpvBinDirectory: params.onPickMpvBinDirectory,
      onVerifyMpvBinDirectory: params.onVerifyMpvBinDirectory,
      onAudioEngineModeChange: params.onAudioEngineModeChange,
      onAudioOutputDeviceChange: params.onAudioOutputDeviceChange,
      onAudioExclusiveChange: params.onAudioExclusiveChange,
      onAudioGaplessModeChange: params.onAudioGaplessModeChange,
      onAudioReplayGainModeChange: params.onAudioReplayGainModeChange,
    });
  }

  if (activeSection === "model") {
    return renderSettingsModelSection({
      t,
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
      onSubtitleFeatureEnabledChange: params.onSubtitleFeatureEnabledChange,
      onSubtitleRenderModeChange: params.onSubtitleRenderModeChange,
      onSubtitleAdvancedVadPresetChange: params.onSubtitleAdvancedVadPresetChange,
      onSubtitleAdvancedVadThresholdChange:
        params.onSubtitleAdvancedVadThresholdChange,
      onSubtitleAdvancedVadMinSilenceSecChange:
        params.onSubtitleAdvancedVadMinSilenceSecChange,
      onSubtitleAdvancedVadMinSpeechSecChange:
        params.onSubtitleAdvancedVadMinSpeechSecChange,
      onSubtitleAdvancedVadMaxSpeechSecChange:
        params.onSubtitleAdvancedVadMaxSpeechSecChange,
      onSubtitleAdvancedSpeakerThresholdChange:
        params.onSubtitleAdvancedSpeakerThresholdChange,
      onSubtitleValidPlaybackRateThresholdChange:
        params.onSubtitleValidPlaybackRateThresholdChange,
      onSubtitleLanguageChange: params.onSubtitleLanguageChange,
      onSubtitleSelectedModelIdChange: params.onSubtitleSelectedModelIdChange,
      onSubtitleModelDirPick: params.onSubtitleModelDirPick,
      onSubtitleTextFillModeChange: params.onSubtitleTextFillModeChange,
      onSubtitleTextColorChange: params.onSubtitleTextColorChange,
      onSubtitleGradientStartColorChange:
        params.onSubtitleGradientStartColorChange,
      onSubtitleGradientEndColorChange: params.onSubtitleGradientEndColorChange,
      onSubtitleGradientDirectionChange:
        params.onSubtitleGradientDirectionChange,
      onSubtitleGradientCurveChange: params.onSubtitleGradientCurveChange,
      onSubtitleStrokeColorChange: params.onSubtitleStrokeColorChange,
      onSubtitleStrokeWidthChange: params.onSubtitleStrokeWidthChange,
      onSubtitleStrokeShadowColorChange:
        params.onSubtitleStrokeShadowColorChange,
      onSubtitleStrokeShadowRadiusChange:
        params.onSubtitleStrokeShadowRadiusChange,
      onSubtitleFontSizeChange: params.onSubtitleFontSizeChange,
      onSubtitleMaxLineCharsChange: params.onSubtitleMaxLineCharsChange,
      onSubtitleOffsetYChange: params.onSubtitleOffsetYChange,
      onSubtitleStylePanelExpandedChange:
        params.onSubtitleStylePanelExpandedChange,
      onRefreshSubtitleModels: params.onRefreshSubtitleModels,
      onStartSubtitleModelDownload: params.onStartSubtitleModelDownload,
      onCancelSubtitleModelDownload: params.onCancelSubtitleModelDownload,
      onOpenSubtitleModelPage: params.onOpenSubtitleModelPage,
      onAdReviewVisionEndpointChange: params.onAdReviewVisionEndpointChange,
      onAdReviewVisionModelChange: params.onAdReviewVisionModelChange,
      onTestAdReviewVisionModel: params.onTestAdReviewVisionModel,
      onSaveAdReviewVisionModel: params.onSaveAdReviewVisionModel,
      onSubtitleCleanupLlmEndpointChange:
        params.onSubtitleCleanupLlmEndpointChange,
      onSubtitleCleanupLlmModelChange: params.onSubtitleCleanupLlmModelChange,
      onSubtitleCleanupLlmPromptChange: params.onSubtitleCleanupLlmPromptChange,
    });
  }

  if (activeSection === "debug") {
    return renderSettingsDebugSection({ params });
  }

  if (activeSection === "shortcuts") {
    return renderSettingsShortcutsSection({ params });
  }

  if (activeSection === "database") {
    return renderSettingsDatabaseSection({ params, settingsTip });
  }

  return <div className="settings-block" />;
}
