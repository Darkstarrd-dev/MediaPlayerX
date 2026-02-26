import type { JSX } from "react";

import { MainUiIcon } from "../MainUiIcon";
import {
  SUBTITLE_MODEL_CURRENT_ID,
  SUBTITLE_MODEL_FUNASR_NANO_ID,
  type SubtitleModelSelectionId,
} from "../../features/subtitles/fixedModel";
import type { RenderSettingsMainSectionParams } from "./renderSettingsMainSection.types";

export function renderSettingsModelSection({
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
}: Pick<
  RenderSettingsMainSectionParams,
  | "t"
  | "subtitleFeatureEnabled"
  | "subtitleRenderMode"
  | "subtitleAdvancedVadPreset"
  | "subtitleAdvancedVadThreshold"
  | "subtitleAdvancedVadMinSilenceSec"
  | "subtitleAdvancedVadMinSpeechSec"
  | "subtitleAdvancedVadMaxSpeechSec"
  | "subtitleAdvancedSpeakerThreshold"
  | "subtitleValidPlaybackRateThreshold"
  | "subtitleLanguage"
  | "subtitleSelectedModelId"
  | "subtitleModelDir"
  | "subtitleTextFillMode"
  | "subtitleTextColor"
  | "subtitleGradientStartColor"
  | "subtitleGradientEndColor"
  | "subtitleGradientDirection"
  | "subtitleGradientCurve"
  | "subtitleStrokeColor"
  | "subtitleStrokeWidth"
  | "subtitleStrokeShadowColor"
  | "subtitleStrokeShadowRadius"
  | "subtitleFontSize"
  | "subtitleMaxLineChars"
  | "subtitleOffsetY"
  | "subtitleStylePanelExpanded"
  | "subtitleModelsLoading"
  | "subtitleModelsError"
  | "subtitleModelsStatus"
  | "subtitleDownloadTask"
  | "subtitleDownloadPending"
  | "subtitleModelDownloadSupported"
  | "adReviewVisionEndpoint"
  | "adReviewVisionModel"
  | "adReviewVisionVerified"
  | "adReviewVisionTestPending"
  | "adReviewVisionTestMessage"
  | "adReviewVisionSavePending"
  | "adReviewVisionSaveMessage"
  | "subtitleCleanupLlmEndpoint"
  | "subtitleCleanupLlmModel"
  | "subtitleCleanupLlmPrompt"
  | "onSubtitleFeatureEnabledChange"
  | "onSubtitleRenderModeChange"
  | "onSubtitleAdvancedVadPresetChange"
  | "onSubtitleAdvancedVadThresholdChange"
  | "onSubtitleAdvancedVadMinSilenceSecChange"
  | "onSubtitleAdvancedVadMinSpeechSecChange"
  | "onSubtitleAdvancedVadMaxSpeechSecChange"
  | "onSubtitleAdvancedSpeakerThresholdChange"
  | "onSubtitleValidPlaybackRateThresholdChange"
  | "onSubtitleLanguageChange"
  | "onSubtitleSelectedModelIdChange"
  | "onSubtitleModelDirPick"
  | "onSubtitleTextFillModeChange"
  | "onSubtitleTextColorChange"
  | "onSubtitleGradientStartColorChange"
  | "onSubtitleGradientEndColorChange"
  | "onSubtitleGradientDirectionChange"
  | "onSubtitleGradientCurveChange"
  | "onSubtitleStrokeColorChange"
  | "onSubtitleStrokeWidthChange"
  | "onSubtitleStrokeShadowColorChange"
  | "onSubtitleStrokeShadowRadiusChange"
  | "onSubtitleFontSizeChange"
  | "onSubtitleMaxLineCharsChange"
  | "onSubtitleOffsetYChange"
  | "onSubtitleStylePanelExpandedChange"
  | "onRefreshSubtitleModels"
  | "onStartSubtitleModelDownload"
  | "onCancelSubtitleModelDownload"
  | "onOpenSubtitleModelPage"
  | "onAdReviewVisionEndpointChange"
  | "onAdReviewVisionModelChange"
  | "onTestAdReviewVisionModel"
  | "onSaveAdReviewVisionModel"
  | "onSubtitleCleanupLlmEndpointChange"
  | "onSubtitleCleanupLlmModelChange"
  | "onSubtitleCleanupLlmPromptChange"
>): JSX.Element {
  const settingsTip = (key: string): string => t(`ui.settings.tooltip.${key}`);

  return (
    <div className="settings-block">
      <fieldset className="settings-subsection">
        <legend>{t("ui.settings.offlineSubtitleLegend")}</legend>
        <div className="settings-debug-toggle-row">
          <button
            type="button"
            className={`settings-debug-toggle-btn ${subtitleFeatureEnabled ? "is-on" : ""}`}
            onClick={() =>
              onSubtitleFeatureEnabledChange(!subtitleFeatureEnabled)
            }
          >
            {`${t("ui.settings.offlineSubtitleEnabled")} · ${subtitleFeatureEnabled ? t("ui.settings.toggleOn") : t("ui.settings.toggleOff")}`}
          </button>
          <button
            type="button"
            className={`settings-debug-toggle-btn ${subtitleRenderMode === "advanced" ? "is-on" : ""}`}
            onClick={() => {
              const newMode =
                subtitleRenderMode === "simple" ? "advanced" : "simple";
              onSubtitleRenderModeChange(newMode);
            }}
          >
            {`${t("ui.settings.offlineSubtitleRenderMode")} · ${subtitleRenderMode === "simple" ? t("ui.settings.offlineSubtitleRenderModeSimple") : t("ui.settings.offlineSubtitleRenderModeAdvanced")}`}
          </button>
        </div>
        {subtitleRenderMode === "advanced" ? (
          <details className="settings-collapsible" open>
            <summary>{t("ui.settings.offlineSubtitleAdvancedSection")}</summary>
            <div className="settings-collapsible-content">
              <label data-tooltip-label={settingsTip("offlineSubtitleVadPreset")}>
                {t("ui.settings.offlineSubtitleVadPreset")}
                <select
                  value={subtitleAdvancedVadPreset}
                  onChange={(event) =>
                    onSubtitleAdvancedVadPresetChange(
                      event.target.value as
                        | "balanced"
                        | "conservative"
                        | "aggressive",
                    )
                  }
                >
                  <option value="balanced">
                    {t("ui.settings.offlineSubtitleVadPresetBalanced")}
                  </option>
                  <option value="conservative">
                    {t("ui.settings.offlineSubtitleVadPresetConservative")}
                  </option>
                  <option value="aggressive">
                    {t("ui.settings.offlineSubtitleVadPresetAggressive")}
                  </option>
                </select>
              </label>
              <label data-tooltip-label={settingsTip("offlineSubtitleVadThreshold")}>
                {t("ui.settings.offlineSubtitleVadThreshold")}
                <input
                  type="range"
                  min={0.1}
                  max={0.9}
                  step={0.01}
                  value={subtitleAdvancedVadThreshold}
                  onChange={(event) =>
                    onSubtitleAdvancedVadThresholdChange(
                      Number(event.target.value),
                    )
                  }
                />
                <span className="settings-placeholder">
                  {subtitleAdvancedVadThreshold.toFixed(2)}
                </span>
              </label>
              <label data-tooltip-label={settingsTip("offlineSubtitleVadMinSilenceSec")}>
                {t("ui.settings.offlineSubtitleVadMinSilenceSec")}
                <input
                  type="range"
                  min={0.1}
                  max={1.2}
                  step={0.01}
                  value={subtitleAdvancedVadMinSilenceSec}
                  onChange={(event) =>
                    onSubtitleAdvancedVadMinSilenceSecChange(
                      Number(event.target.value),
                    )
                  }
                />
                <span className="settings-placeholder">
                  {subtitleAdvancedVadMinSilenceSec.toFixed(2)}s
                </span>
              </label>
              <label data-tooltip-label={settingsTip("offlineSubtitleVadMinSpeechSec")}>
                {t("ui.settings.offlineSubtitleVadMinSpeechSec")}
                <input
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.01}
                  value={subtitleAdvancedVadMinSpeechSec}
                  onChange={(event) =>
                    onSubtitleAdvancedVadMinSpeechSecChange(
                      Number(event.target.value),
                    )
                  }
                />
                <span className="settings-placeholder">
                  {subtitleAdvancedVadMinSpeechSec.toFixed(2)}s
                </span>
              </label>
              <label data-tooltip-label={settingsTip("offlineSubtitleVadMaxSpeechSec")}>
                {t("ui.settings.offlineSubtitleVadMaxSpeechSec")}
                <input
                  type="range"
                  min={3}
                  max={30}
                  step={1}
                  value={subtitleAdvancedVadMaxSpeechSec}
                  onChange={(event) =>
                    onSubtitleAdvancedVadMaxSpeechSecChange(
                      Number(event.target.value),
                    )
                  }
                />
                <span className="settings-placeholder">
                  {subtitleAdvancedVadMaxSpeechSec.toFixed(0)}s
                </span>
              </label>
              <label data-tooltip-label={settingsTip("offlineSubtitleSpeakerThreshold")}>
                {t("ui.settings.offlineSubtitleSpeakerThreshold")}
                <input
                  type="range"
                  min={0.45}
                  max={0.85}
                  step={0.01}
                  value={subtitleAdvancedSpeakerThreshold}
                  onChange={(event) =>
                    onSubtitleAdvancedSpeakerThresholdChange(
                      Number(event.target.value),
                    )
                  }
                />
                <span className="settings-placeholder">
                  {subtitleAdvancedSpeakerThreshold.toFixed(2)}
                </span>
              </label>
              <label data-tooltip-label={settingsTip("offlineSubtitleValidPlaybackRateThreshold")}>
                {t("ui.settings.offlineSubtitleValidPlaybackRateThreshold")}
                <input
                  type="range"
                  min={0.1}
                  max={3}
                  step={0.05}
                  value={subtitleValidPlaybackRateThreshold}
                  onChange={(event) =>
                    onSubtitleValidPlaybackRateThresholdChange(
                      Number(event.target.value),
                    )
                  }
                />
                <span className="settings-placeholder">
                  {subtitleValidPlaybackRateThreshold.toFixed(2)}x
                </span>
              </label>
            </div>
          </details>
        ) : null}
        <label data-tooltip-label={settingsTip("offlineSubtitleLanguage")}>
          {t("ui.settings.offlineSubtitleLanguage")}
          <select
            value={subtitleLanguage}
            onChange={(event) =>
              onSubtitleLanguageChange(
                event.target.value as
                  | "auto"
                  | "zh"
                  | "en"
                  | "ja"
                  | "ko"
                  | "yue",
              )
            }
          >
            <option value="auto">
              {t("ui.settings.offlineSubtitleLanguageAuto")}
            </option>
            <option value="zh">
              {t("ui.settings.offlineSubtitleLanguageZh")}
            </option>
            <option value="en">
              {t("ui.settings.offlineSubtitleLanguageEn")}
            </option>
            <option value="ja">
              {t("ui.settings.offlineSubtitleLanguageJa")}
            </option>
            <option value="ko">
              {t("ui.settings.offlineSubtitleLanguageKo")}
            </option>
            <option value="yue">
              {t("ui.settings.offlineSubtitleLanguageYue")}
            </option>
          </select>
        </label>
        <label data-tooltip-label={settingsTip("offlineSubtitleModelProfile")}>
          {t("ui.settings.offlineSubtitleModelProfile")}
          <select
            value={subtitleSelectedModelId}
            onChange={(event) =>
              onSubtitleSelectedModelIdChange(
                event.target.value as SubtitleModelSelectionId,
              )
            }
          >
            <option value={SUBTITLE_MODEL_CURRENT_ID}>
              {t("ui.settings.offlineSubtitleModelProfileCurrent")}
            </option>
            <option value={SUBTITLE_MODEL_FUNASR_NANO_ID}>
              {t("ui.settings.offlineSubtitleModelProfileFunasrNano")}
            </option>
          </select>
        </label>
        <label data-tooltip-label={settingsTip("offlineSubtitleModelDir")}>
          {t("ui.settings.offlineSubtitleModelDir")}
          <div className="settings-inline-field">
            <input
              type="text"
              value={subtitleModelDir}
              readOnly
              placeholder={t("ui.settings.offlineSubtitleModelDirPlaceholder")}
            />
            <button type="button" onClick={onSubtitleModelDirPick}>
              {t("ui.settings.offlineSubtitleChooseModelDir")}
            </button>
          </div>
        </label>
        <label data-tooltip-label={settingsTip("offlineSubtitleOffsetY")}>
          {t("ui.settings.offlineSubtitleOffsetY")}
          <input
            type="range"
            min={-400}
            max={400}
            step={2}
            value={subtitleOffsetY}
            onChange={(event) =>
              onSubtitleOffsetYChange(Number(event.target.value))
            }
          />
          <span className="settings-placeholder">
            {t("ui.settings.offlineSubtitleOffsetYValue", {
              value: subtitleOffsetY,
            })}
          </span>
          <span className="settings-placeholder">
            {t("ui.settings.offlineSubtitleOffsetYShortcutHint")}
          </span>
        </label>
        <details
          className="settings-collapsible"
          open={subtitleStylePanelExpanded}
          onToggle={(event) =>
            onSubtitleStylePanelExpandedChange(
              (event.currentTarget as HTMLDetailsElement).open,
            )
          }
        >
          <summary>{t("ui.settings.offlineSubtitleStyleSection")}</summary>
          <div className="settings-collapsible-content">
            <label data-tooltip-label={settingsTip("offlineSubtitleTextFillMode")}>
              {t("ui.settings.offlineSubtitleTextFillMode")}
              <select
                value={subtitleTextFillMode}
                onChange={(event) =>
                  onSubtitleTextFillModeChange(
                    event.target.value as "solid" | "gradient",
                  )
                }
              >
                <option value="solid">
                  {t("ui.settings.offlineSubtitleTextFillModeSolid")}
                </option>
                <option value="gradient">
                  {t("ui.settings.offlineSubtitleTextFillModeGradient")}
                </option>
              </select>
            </label>
            {subtitleTextFillMode === "solid" ? (
              <label data-tooltip-label={settingsTip("offlineSubtitleTextColor")}>
                {t("ui.settings.offlineSubtitleTextColor")}
                <input
                  type="color"
                  value={subtitleTextColor}
                  onChange={(event) =>
                    onSubtitleTextColorChange(event.target.value)
                  }
                />
              </label>
            ) : (
              <>
                <label data-tooltip-label={settingsTip("offlineSubtitleGradientStartColor")}>
                  {t("ui.settings.offlineSubtitleGradientStartColor")}
                  <input
                    type="color"
                    value={subtitleGradientStartColor}
                    onChange={(event) =>
                      onSubtitleGradientStartColorChange(event.target.value)
                    }
                  />
                </label>
                <label data-tooltip-label={settingsTip("offlineSubtitleGradientEndColor")}>
                  {t("ui.settings.offlineSubtitleGradientEndColor")}
                  <input
                    type="color"
                    value={subtitleGradientEndColor}
                    onChange={(event) =>
                      onSubtitleGradientEndColorChange(event.target.value)
                    }
                  />
                </label>
                <label data-tooltip-label={settingsTip("offlineSubtitleGradientDirection")}>
                  {t("ui.settings.offlineSubtitleGradientDirection")}
                  <select
                    value={subtitleGradientDirection}
                    onChange={(event) =>
                      onSubtitleGradientDirectionChange(
                        event.target.value as
                          | "left-to-right"
                          | "right-to-left"
                          | "top-to-bottom"
                          | "bottom-to-top"
                          | "top-left-to-bottom-right"
                          | "top-right-to-bottom-left"
                          | "bottom-left-to-top-right"
                          | "bottom-right-to-top-left",
                      )
                    }
                  >
                    <option value="left-to-right">
                      {t(
                        "ui.settings.offlineSubtitleGradientDirectionLeftToRight",
                      )}
                    </option>
                    <option value="right-to-left">
                      {t(
                        "ui.settings.offlineSubtitleGradientDirectionRightToLeft",
                      )}
                    </option>
                    <option value="top-to-bottom">
                      {t(
                        "ui.settings.offlineSubtitleGradientDirectionTopToBottom",
                      )}
                    </option>
                    <option value="bottom-to-top">
                      {t(
                        "ui.settings.offlineSubtitleGradientDirectionBottomToTop",
                      )}
                    </option>
                    <option value="top-left-to-bottom-right">
                      {t(
                        "ui.settings.offlineSubtitleGradientDirectionTopLeftToBottomRight",
                      )}
                    </option>
                    <option value="top-right-to-bottom-left">
                      {t(
                        "ui.settings.offlineSubtitleGradientDirectionTopRightToBottomLeft",
                      )}
                    </option>
                    <option value="bottom-left-to-top-right">
                      {t(
                        "ui.settings.offlineSubtitleGradientDirectionBottomLeftToTopRight",
                      )}
                    </option>
                    <option value="bottom-right-to-top-left">
                      {t(
                        "ui.settings.offlineSubtitleGradientDirectionBottomRightToTopLeft",
                      )}
                    </option>
                  </select>
                </label>
                <label data-tooltip-label={settingsTip("offlineSubtitleGradientCurve")}>
                  {t("ui.settings.offlineSubtitleGradientCurve")}
                  <select
                    value={subtitleGradientCurve}
                    onChange={(event) =>
                      onSubtitleGradientCurveChange(
                        event.target.value as
                          | "linear"
                          | "smooth"
                          | "bezier"
                          | "smoother",
                      )
                    }
                  >
                    <option value="linear">
                      {t("ui.settings.offlineSubtitleGradientCurveLinear")}
                    </option>
                    <option value="smooth">
                      {t("ui.settings.offlineSubtitleGradientCurveSmooth")}
                    </option>
                    <option value="bezier">
                      {t("ui.settings.offlineSubtitleGradientCurveBezier")}
                    </option>
                    <option value="smoother">
                      {t("ui.settings.offlineSubtitleGradientCurveSmoother")}
                    </option>
                  </select>
                </label>
              </>
            )}
            <label data-tooltip-label={settingsTip("offlineSubtitleStrokeColor")}>
              {t("ui.settings.offlineSubtitleStrokeColor")}
              <input
                type="color"
                value={subtitleStrokeColor}
                onChange={(event) =>
                  onSubtitleStrokeColorChange(event.target.value)
                }
              />
            </label>
            <label data-tooltip-label={settingsTip("offlineSubtitleStrokeWidth")}>
              {t("ui.settings.offlineSubtitleStrokeWidth")}
              <input
                type="range"
                min={0}
                max={8}
                step={0.5}
                value={subtitleStrokeWidth}
                onChange={(event) =>
                  onSubtitleStrokeWidthChange(Number(event.target.value))
                }
              />
              <span className="settings-placeholder">
                {subtitleStrokeWidth.toFixed(1)}px
              </span>
            </label>
            <label data-tooltip-label={settingsTip("offlineSubtitleFontSize")}>
              {t("ui.settings.offlineSubtitleFontSize")}
              <input
                type="range"
                min={14}
                max={72}
                step={1}
                value={subtitleFontSize}
                onChange={(event) =>
                  onSubtitleFontSizeChange(Number(event.target.value))
                }
              />
              <span className="settings-placeholder">
                {t("ui.settings.offlineSubtitleFontSizeValue", {
                  value: subtitleFontSize,
                })}
              </span>
            </label>
            <label data-tooltip-label={settingsTip("offlineSubtitleMaxLineChars")}>
              {t("ui.settings.offlineSubtitleMaxLineChars")}
              <input
                type="range"
                min={8}
                max={80}
                step={1}
                value={subtitleMaxLineChars}
                onChange={(event) =>
                  onSubtitleMaxLineCharsChange(Number(event.target.value))
                }
              />
              <span className="settings-placeholder">
                {t("ui.settings.offlineSubtitleMaxLineCharsValue", {
                  value: subtitleMaxLineChars,
                })}
              </span>
            </label>
            <label data-tooltip-label={settingsTip("offlineSubtitleStrokeShadowColor")}>
              {t("ui.settings.offlineSubtitleStrokeShadowColor")}
              <input
                type="color"
                value={subtitleStrokeShadowColor}
                onChange={(event) =>
                  onSubtitleStrokeShadowColorChange(event.target.value)
                }
              />
            </label>
            <label data-tooltip-label={settingsTip("offlineSubtitleStrokeShadowRadius")}>
              {t("ui.settings.offlineSubtitleStrokeShadowRadius")}
              <input
                type="range"
                min={0}
                max={24}
                step={1}
                value={subtitleStrokeShadowRadius}
                onChange={(event) =>
                  onSubtitleStrokeShadowRadiusChange(Number(event.target.value))
                }
              />
              <span className="settings-placeholder">
                {subtitleStrokeShadowRadius.toFixed(0)}px
              </span>
            </label>
          </div>
        </details>
        <div className="settings-test-row">
          <button
            className="settings-icon-btn main-icon-square-btn"
            type="button"
            disabled={subtitleModelsLoading}
            aria-label={t("ui.settings.offlineSubtitleRescanDirectory")}
            data-tooltip-label={t("ui.settings.offlineSubtitleRescanDirectory")}
            onClick={onRefreshSubtitleModels}
          >
            <MainUiIcon name="refresh" />
          </button>
          <button
            className="settings-icon-btn main-icon-square-btn"
            type="button"
            disabled={
              subtitleDownloadPending ||
              subtitleModelsLoading ||
              !subtitleModelDir ||
              !subtitleModelDownloadSupported
            }
            aria-label={t("ui.settings.offlineSubtitleDownloadModel")}
            data-tooltip-label={t("ui.settings.offlineSubtitleDownloadModel")}
            onClick={onStartSubtitleModelDownload}
          >
            <MainUiIcon name="save" />
          </button>
          <button
            className="settings-icon-btn main-icon-square-btn"
            type="button"
            disabled={
              !subtitleDownloadTask ||
              (subtitleDownloadTask.status !== "queued" &&
                subtitleDownloadTask.status !== "downloading" &&
                subtitleDownloadTask.status !== "verifying")
            }
            aria-label={t("ui.settings.offlineSubtitleCancelDownload")}
            data-tooltip-label={t("ui.settings.offlineSubtitleCancelDownload")}
            onClick={onCancelSubtitleModelDownload}
          >
            <MainUiIcon name="close" />
          </button>
          <button
            className="settings-icon-btn main-icon-square-btn"
            type="button"
            aria-label={t("ui.settings.offlineSubtitleOpenModelPage")}
            data-tooltip-label={t("ui.settings.offlineSubtitleOpenModelPage")}
            onClick={onOpenSubtitleModelPage}
          >
            <MainUiIcon name="videoInfo" />
          </button>
        </div>
        {subtitleDownloadTask ? (
          <p className="settings-placeholder">
            {t("ui.settings.offlineSubtitleDownloadProgress", {
              status: subtitleDownloadTask.status,
              percent: subtitleDownloadTask.percent.toFixed(1),
              speed: Math.round(subtitleDownloadTask.speedBps / 1024),
              eta:
                subtitleDownloadTask.etaSec == null
                  ? "-"
                  : String(subtitleDownloadTask.etaSec),
              message: subtitleDownloadTask.message ?? "-",
            })}
          </p>
        ) : null}
        {subtitleModelsError ? (
          <p className="settings-danger-text">{subtitleModelsError}</p>
        ) : null}
        {subtitleModelsStatus ? (
          <p className="settings-placeholder">{subtitleModelsStatus}</p>
        ) : null}
        {subtitleDownloadTask?.status === "failed" ? (
          <p className="settings-placeholder">
            {t("ui.settings.offlineSubtitleManualInstallHint")}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="settings-subsection">
        <legend>{t("ui.settings.adReviewVisionLegend")}</legend>
        <label data-tooltip-label={settingsTip("adReviewVisionEndpoint")}>
          {t("ui.settings.adReviewVisionEndpoint")}
          <input
            type="text"
            value={adReviewVisionEndpoint}
            onChange={(event) =>
              onAdReviewVisionEndpointChange(event.target.value)
            }
          />
        </label>
        <label data-tooltip-label={settingsTip("adReviewVisionModel")}>
          {t("ui.settings.adReviewVisionModel")}
          <input
            type="text"
            value={adReviewVisionModel}
            onChange={(event) =>
              onAdReviewVisionModelChange(event.target.value)
            }
          />
        </label>
        <div className="settings-test-row">
          <button
            className="settings-icon-btn main-icon-square-btn"
            type="button"
            disabled={adReviewVisionTestPending}
            aria-label={
              adReviewVisionTestPending
                ? t("a11y.settings.testingVisionModel")
                : t("a11y.settings.testVisionModel")
            }
            data-tooltip-label={
              adReviewVisionTestPending
                ? t("a11y.settings.testingVisionModel")
                : t("a11y.settings.testVisionModel")
            }
            onClick={onTestAdReviewVisionModel}
          >
            <MainUiIcon name="test" />
          </button>
          <button
            className="settings-icon-btn main-icon-square-btn"
            type="button"
            disabled={adReviewVisionSavePending}
            aria-label={
              adReviewVisionSavePending
                ? t("a11y.settings.savingVisionModel")
                : t("a11y.settings.saveVisionModel")
            }
            data-tooltip-label={
              adReviewVisionSavePending
                ? t("a11y.settings.savingVisionModel")
                : t("a11y.settings.saveVisionModel")
            }
            onClick={onSaveAdReviewVisionModel}
          >
            <MainUiIcon name="save" />
          </button>
          <span
            className={`settings-test-status ${adReviewVisionVerified ? "is-ok" : "is-pending"}`}
          >
            {adReviewVisionTestMessage ??
              (adReviewVisionVerified
                ? t("ui.settings.adReviewVisionPassed")
                : t("ui.settings.adReviewVisionUntested"))}
          </span>
        </div>
        {adReviewVisionSaveMessage ? (
          <p className="settings-placeholder">{adReviewVisionSaveMessage}</p>
        ) : null}
        <p className="settings-placeholder">
          {t("ui.settings.adReviewVisionHint")}
        </p>
      </fieldset>

      <fieldset className="settings-subsection">
        <legend>{t("ui.settings.subtitleCleanupLlmLegend")}</legend>
        <label data-tooltip-label={settingsTip("subtitleCleanupLlmEndpoint")}>
          {t("ui.settings.subtitleCleanupLlmEndpoint")}
          <input
            type="text"
            value={subtitleCleanupLlmEndpoint}
            onChange={(event) =>
              onSubtitleCleanupLlmEndpointChange(event.target.value)
            }
          />
        </label>
        <label data-tooltip-label={settingsTip("subtitleCleanupLlmModel")}>
          {t("ui.settings.subtitleCleanupLlmModel")}
          <input
            type="text"
            value={subtitleCleanupLlmModel}
            onChange={(event) =>
              onSubtitleCleanupLlmModelChange(event.target.value)
            }
          />
        </label>
        <details className="settings-collapsible">
          <summary>{t("ui.settings.subtitleCleanupLlmPromptSection")}</summary>
          <div className="settings-collapsible-content">
            <label data-tooltip-label={settingsTip("subtitleCleanupLlmPrompt")}>
              {t("ui.settings.subtitleCleanupLlmPrompt")}
              <textarea
                className="settings-scroll-hidden-textarea mpx-scrollbar-hidden"
                rows={8}
                value={subtitleCleanupLlmPrompt}
                onChange={(event) =>
                  onSubtitleCleanupLlmPromptChange(event.target.value)
                }
              />
            </label>
          </div>
        </details>
        <p className="settings-placeholder">
          {t("ui.settings.subtitleCleanupLlmHint")}
        </p>
      </fieldset>
    </div>
  );
}
