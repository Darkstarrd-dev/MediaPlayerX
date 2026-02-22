import {
  listPalettesByStyle,
  listStyles,
  resolvePalettePairForStyle,
  resolveStyleIdFromStyles,
} from "../../features/theme/themeRegistry";
import type { JSX } from "react";

import { MainUiIcon } from "../MainUiIcon";
import { renderSettingsModelSection } from "./renderSettingsModelSection";
import { renderSettingsSystemSection } from "./renderSettingsSystemSection";
import { formatScale, SIZE_SCALE_CONFIG, toAbsolutePx } from "./settingsScale";
import type { RenderSettingsMainSectionParams } from "./renderSettingsMainSection.types";

export type { SettingsSection } from "./renderSettingsMainSection.types";

export function renderSettingsMainSection({
  t,
  activeSection,
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
  electronNativeChromeEnabled,
  themeParameterButtonVisible,
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
  thumbnailWarmupRadius,
  thumbnailWarmupConcurrency,
  fullscreenPrefetchRadius,
  fullscreenDecodeCacheSize,
  fullscreenResamplingEnabled,
  fullscreenUpsamplingKernel,
  fullscreenDownsamplingKernel,
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
  settingsBackdropOpacity,
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
  onHeaderHeightChange,
  onSettingsBackdropOpacityChange,
  onSettingsFontSizeChange,
  onSidebarRatioChange,
  onSidebarMinWidthChange,
  onSidebarFontSizeChange,
  onElectronNativeChromeEnabledChange,
  onThemeParameterButtonVisibleChange,
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
  onThumbnailWarmupRadiusChange,
  onThumbnailWarmupConcurrencyChange,
  onFullscreenPrefetchRadiusChange,
  onFullscreenDecodeCacheSizeChange,
  onFullscreenResamplingEnabledChange,
  onFullscreenUpsamplingKernelChange,
  onFullscreenDownsamplingKernelChange,
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
}: RenderSettingsMainSectionParams): JSX.Element {
  const settingsTip = (key: string): string => t(`ui.settings.tooltip.${key}`);

  if (activeSection === "layout") {
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
            title={settingsTip("uiLocale")}
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
            <label htmlFor="theme-style-select" title={settingsTip("style")}
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
              title={settingsTip("paletteDay")}
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
              title={settingsTip("paletteNight")}
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
              title={
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
          <label title={settingsTip("backdropOpacity")}>
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
          <label title={settingsTip("thumbnailGap")}>
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
          <div className="settings-thumbnail-four-row">
            <div
              className="settings-compact-control-cell"
              title={settingsTip("thumbnailQuality")}
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
                  title={t("tip.common.restoreDefault")}
                  onClick={onResetThumbnailQuality}
                >
                  <MainUiIcon name="return" />
                </button>
              </div>
            </div>
            <div
              className="settings-compact-control-cell"
              title={settingsTip("thumbnailResolution")}
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
                  title={t("tip.common.restoreDefault")}
                  onClick={onResetThumbnailWidth}
                >
                  <MainUiIcon name="return" />
                </button>
              </div>
            </div>
            <div
              className="settings-compact-control-cell"
              title={settingsTip("thumbnailGenerationConcurrency")}
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
                  title={t("tip.common.restoreDefault")}
                  onClick={onResetThumbnailGenerationConcurrency}
                >
                  <MainUiIcon name="return" />
                </button>
              </div>
            </div>
            <div
              className="settings-compact-control-cell"
              title={settingsTip("thumbnailResolveConcurrency")}
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
                  title={t("tip.common.restoreDefault")}
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
            <span>{t("ui.settings.debugSection")}</span>
          </header>
          <div className="settings-debug-toggle-row">
            <button
              type="button"
              className={`settings-debug-toggle-btn ${electronNativeChromeEnabled ? "is-on" : ""}`}
              onClick={() =>
                onElectronNativeChromeEnabledChange(
                  !electronNativeChromeEnabled,
                )
              }
            >
              {`${t("ui.settings.debugNativeChrome")} · ${electronNativeChromeEnabled ? t("ui.settings.toggleOn") : t("ui.settings.toggleOff")}`}
            </button>
            <button
              type="button"
              className={`settings-debug-toggle-btn ${themeParameterButtonVisible ? "is-on" : ""}`}
              onClick={() =>
                onThemeParameterButtonVisibleChange(
                  !themeParameterButtonVisible,
                )
              }
            >
              {`${t("ui.settings.showThemeParameterButton")} · ${themeParameterButtonVisible ? t("ui.settings.toggleOn") : t("ui.settings.toggleOff")}`}
            </button>
          </div>
        </section>

        <section className="settings-group">
          <header className="settings-group-head">
            <span>{t("ui.settings.layoutSection")}</span>
          </header>
          <label
            className="settings-toggle-row"
            title={settingsTip("layoutLocked")}
          >
            <span>{t("ui.settings.layoutLocked")}</span>
            <input
              type="checkbox"
              checked={layoutLocked}
              onChange={(event) => onLayoutLockedChange(event.target.checked)}
            />
          </label>
          <label title={settingsTip("headerHeight")}>
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
          <label title={settingsTip("settingsFontScale")}>
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
          <label title={settingsTip("sidebarRatio")}>
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
          <label title={settingsTip("sidebarMinWidth")}>
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
          <label title={settingsTip("sidebarFontScale")}>
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
          <label title={settingsTip("sidebarCountFontScale")}>
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
          <label title={settingsTip("sidebarIndentScale")}>
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
          <label title={settingsTip("sidebarVerticalGapScale")}>
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
          <label title={settingsTip("metadataPanelRatio")}>
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
          <label title={settingsTip("workspaceBottomPanelHeightScale")}>
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
          <label title={settingsTip("fullscreenVideoControlsMaxWidthScale")}>
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
          <label title={settingsTip("mediaPreloadMemoryBudgetMb")}>
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
    return (
      <div className="settings-block">
        <section className="settings-group">
          <header className="settings-group-head">
            <span>{t("ui.settings.performanceLoadSection")}</span>
          </header>

          <label
            htmlFor="settings-thumbnail-warmup-radius-select"
            title={settingsTip("thumbnailWarmupRadius")}
          >
            {t("ui.settings.thumbnailWarmupRadius")}
            <select
              id="settings-thumbnail-warmup-radius-select"
              value={String(thumbnailWarmupRadius)}
              onChange={(event) =>
                onThumbnailWarmupRadiusChange(Number(event.target.value))
              }
            >
              <option value="0">{t("ui.settings.warmupRadiusOff")}</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </label>

          <label
            htmlFor="settings-thumbnail-warmup-concurrency-select"
            title={settingsTip("thumbnailWarmupConcurrency")}
          >
            {t("ui.settings.thumbnailWarmupConcurrency")}
            <select
              id="settings-thumbnail-warmup-concurrency-select"
              value={String(thumbnailWarmupConcurrency)}
              onChange={(event) =>
                onThumbnailWarmupConcurrencyChange(Number(event.target.value))
              }
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </label>

          <label
            htmlFor="settings-fullscreen-prefetch-radius-select"
            title={settingsTip("fullscreenPrefetchRadius")}
          >
            {t("ui.settings.fullscreenPrefetchRadius")}
            <select
              id="settings-fullscreen-prefetch-radius-select"
              value={String(fullscreenPrefetchRadius)}
              onChange={(event) =>
                onFullscreenPrefetchRadiusChange(Number(event.target.value))
              }
            >
              <option value="2">2</option>
              <option value="4">4</option>
              <option value="6">6</option>
              <option value="8">8</option>
              <option value="12">12</option>
            </select>
          </label>

          <label
            htmlFor="settings-fullscreen-decode-cache-size-select"
            title={settingsTip("fullscreenDecodeCacheSize")}
          >
            {t("ui.settings.fullscreenDecodeCacheSize")}
            <select
              id="settings-fullscreen-decode-cache-size-select"
              value={String(fullscreenDecodeCacheSize)}
              onChange={(event) =>
                onFullscreenDecodeCacheSizeChange(Number(event.target.value))
              }
            >
              <option value="4">4</option>
              <option value="6">6</option>
              <option value="8">8</option>
              <option value="10">10</option>
              <option value="16">16</option>
            </select>
          </label>

          <label
            className="settings-toggle-row"
            title={t("ui.settings.fullscreenResamplingEnabledTooltip")}
          >
            <span title={t("ui.settings.fullscreenResamplingEnabledTooltip")}>
              {t("ui.settings.fullscreenResamplingEnabled")}
            </span>
            <input
              type="checkbox"
              checked={fullscreenResamplingEnabled}
              onChange={(event) =>
                onFullscreenResamplingEnabledChange(event.target.checked)
              }
            />
          </label>

          {fullscreenResamplingEnabled ? (
            <>
              <label
                htmlFor="settings-fullscreen-downsampling-kernel-select"
                title={t("ui.settings.fullscreenDownsamplingKernelTooltip")}
              >
                <span
                  title={t("ui.settings.fullscreenDownsamplingKernelTooltip")}
                >
                  {t("ui.settings.fullscreenDownsamplingKernel")}
                </span>
                <select
                  id="settings-fullscreen-downsampling-kernel-select"
                  value={fullscreenDownsamplingKernel}
                  onChange={(event) =>
                    onFullscreenDownsamplingKernelChange(
                      event.target.value as
                        | "lanczos3"
                        | "mitchell"
                        | "nearest"
                        | "cubic",
                    )
                  }
                >
                  <option value="lanczos3">
                    {t("ui.settings.resamplingKernelLanczos3")}
                  </option>
                  <option value="mitchell">
                    {t("ui.settings.resamplingKernelMitchell")}
                  </option>
                  <option value="nearest">
                    {t("ui.settings.resamplingKernelNearest")}
                  </option>
                  <option value="cubic">
                    {t("ui.settings.resamplingKernelCubic")}
                  </option>
                </select>
              </label>

              <label
                htmlFor="settings-fullscreen-upsampling-kernel-select"
                title={t("ui.settings.fullscreenUpsamplingKernelTooltip")}
              >
                <span
                  title={t("ui.settings.fullscreenUpsamplingKernelTooltip")}
                >
                  {t("ui.settings.fullscreenUpsamplingKernel")}
                </span>
                <select
                  id="settings-fullscreen-upsampling-kernel-select"
                  value={fullscreenUpsamplingKernel}
                  onChange={(event) =>
                    onFullscreenUpsamplingKernelChange(
                      event.target.value as
                        | "lanczos3"
                        | "mitchell"
                        | "nearest"
                        | "cubic",
                    )
                  }
                >
                  <option value="lanczos3">
                    {t("ui.settings.resamplingKernelLanczos3")}
                  </option>
                  <option value="mitchell">
                    {t("ui.settings.resamplingKernelMitchell")}
                  </option>
                  <option value="nearest">
                    {t("ui.settings.resamplingKernelNearest")}
                  </option>
                  <option value="cubic">
                    {t("ui.settings.resamplingKernelCubic")}
                  </option>
                </select>
              </label>
            </>
          ) : null}
        </section>
      </div>
    );
  }

  if (activeSection === "system") {
    return renderSettingsSystemSection({
      t,
      repositoryMode,
      backendBridgeInjected,
      runtimeInfoLoading,
      runtimeInfoError,
      runtimeInfo,
      mediaCapabilitiesLoading,
      mediaCapabilitiesError,
      mediaCapabilities,
      onRefreshRuntimeInfo,
    });
  }

  if (activeSection === "model") {
    return renderSettingsModelSection({
      t,
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
    });
  }

  if (activeSection === "shortcuts") {
    return (
      <div className="settings-block settings-shortcuts">
        <div className="settings-shortcuts-head">
          <strong>{t("ui.settings.shortcutsTitle")}</strong>
          <button
            className="settings-icon-btn main-icon-square-btn"
            type="button"
            aria-label={t("a11y.common.restoreDefault")}
            title={t("tip.common.restoreDefault")}
            onClick={onResetShortcuts}
          >
            <MainUiIcon name="return" />
          </button>
        </div>

        {renderBindingRows()}

        <div className="shortcut-conflicts">
          <strong>{t("ui.settings.shortcutConflictsTitle")}</strong>
          {shortcutConflicts.length === 0 ? (
            <p>{t("ui.settings.shortcutConflictsNone")}</p>
          ) : (
            <ul>
              {shortcutConflicts.map((conflict) => (
                <li key={`${conflict.scope}-${conflict.combo}`}>
                  {t("ui.settings.shortcutConflictLine", {
                    scope: conflict.scope,
                    combo: conflict.combo,
                    actions: conflict.actions
                      .map(
                        (action) => shortcutLabelByAction.get(action) ?? action,
                      )
                      .join(", "),
                  })}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  if (activeSection === "database") {
    const databasePath = runtimeInfo?.database_path ?? "";
    const thumbnailCachePath = runtimeInfo?.thumbnail_cache_path ?? "";

    return (
      <div className="settings-block">
        <p className="settings-placeholder">
          {t("ui.settings.databaseResetHint")}
        </p>
        <label title={settingsTip("databaseReset")}>
          {t("ui.settings.databaseResetLabel")}
          <button
            type="button"
            className="settings-danger-btn"
            disabled={databaseResetPending}
            onClick={onClearDatabase}
          >
            {databaseResetPending
              ? t("ui.settings.databaseResetPending")
              : t("ui.settings.databaseResetAction")}
          </button>
        </label>
        {databaseResetError ? (
          <p className="settings-danger-text">{databaseResetError}</p>
        ) : null}

        <fieldset className="settings-subsection">
          <legend>{t("ui.settings.databaseDirectoryLegend")}</legend>
          <p className="settings-placeholder">
            {t("ui.settings.databaseDirectoryHint")}
          </p>
          <p className="settings-placeholder">
            {t("ui.settings.databaseDirectoryMigrationHint")}
          </p>
          <label title={settingsTip("sqlDatabasePath")}>
            {t("ui.settings.sqlDatabasePathLabel")}
            <div className="settings-inline-field">
              <input
                type="text"
                value={databasePath}
                readOnly
                placeholder={t("ui.settings.readRuntimeInfoPlaceholder")}
              />
              <button
                type="button"
                disabled={runtimePathUpdatePending}
                onClick={onPickDatabaseDirectoryPath}
              >
                {runtimePathUpdatePending
                  ? t("ui.settings.runtimePathSaving")
                  : t("ui.settings.chooseSqlDirectory")}
              </button>
            </div>
          </label>
          <label title={settingsTip("thumbnailCacheDirectory")}>
            {t("ui.settings.thumbnailCacheDirectoryLabel")}
            <div className="settings-inline-field">
              <input
                type="text"
                value={thumbnailCachePath}
                readOnly
                placeholder={t("ui.settings.readRuntimeInfoPlaceholder")}
              />
              <button
                type="button"
                disabled={runtimePathUpdatePending}
                onClick={onPickThumbnailCacheDirectoryPath}
              >
                {runtimePathUpdatePending
                  ? t("ui.settings.runtimePathSaving")
                  : t("ui.settings.chooseThumbnailDirectory")}
              </button>
            </div>
          </label>
          {runtimePathUpdateMessage ? (
            <p className="settings-placeholder">{runtimePathUpdateMessage}</p>
          ) : null}
        </fieldset>

        <fieldset className="settings-subsection">
          <legend>{t("ui.settings.networkProxyLegend")}</legend>
          <p className="settings-placeholder">
            {t("ui.settings.networkProxyHint")}
          </p>
          <label title={settingsTip("proxyServer")}>
            {t("ui.settings.proxyServerLabel")}
            <input
              type="text"
              value={proxyServer}
              placeholder={t("ui.settings.proxyServerPlaceholder")}
              onChange={(event) => onProxyServerChange(event.target.value)}
            />
          </label>
          <label title={settingsTip("ehentaiCookies")}>
            {t("ui.settings.ehentaiCookiesLabel")}
            <input
              type="text"
              value={ehentaiCookies}
              placeholder={t("ui.settings.ehentaiCookiesPlaceholder")}
              onChange={(event) => onEhentaiCookiesChange(event.target.value)}
            />
          </label>
        </fieldset>
      </div>
    );
  }

  return <div className="settings-block" />;
}
