import type { JSX } from "react";

import { MainUiIcon } from "../MainUiIcon";
import type { RenderSettingsMainSectionParams } from "./renderSettingsMainSection.types";

interface RenderSettingsPerformanceSectionParams {
  params: RenderSettingsMainSectionParams;
  settingsTip: (key: string) => string;
}

export function renderSettingsPerformanceSection({
  params,
  settingsTip,
}: RenderSettingsPerformanceSectionParams): JSX.Element {
  const {
    t,
    thumbnailWarmupRadius,
    thumbnailWarmupConcurrency,
    fullscreenPrefetchRadius,
    fullscreenAdjacentPackagePrefetch,
    fullscreenDecodeCacheSize,
    fullscreenResamplingEnabled,
    fullscreenDownsamplingKernel,
    fullscreenUpsamplingKernel,
    thumbnailQuality,
    thumbnailAdaptiveResolution,
    thumbnailWidthInputValue,
    thumbnailGenerationConcurrencyInput,
    thumbnailResolveConcurrencyInput,
    thumbnailQueueSizeInput,
    cpuTokenLimitInput,
    onThumbnailWarmupRadiusChange,
    onThumbnailWarmupConcurrencyChange,
    onFullscreenPrefetchRadiusChange,
    onFullscreenAdjacentPackagePrefetchChange,
    onFullscreenDecodeCacheSizeChange,
    onFullscreenResamplingEnabledChange,
    onFullscreenDownsamplingKernelChange,
    onFullscreenUpsamplingKernelChange,
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
    onPerformancePresetChange,
    onThumbnailQueueSizeInputChange,
    onThumbnailQueueSizeInputBlur,
    onThumbnailQueueSizeInputKeyDown,
    onResetThumbnailQueueSize,
    onCpuTokenLimitInputChange,
    onCpuTokenLimitInputBlur,
    onCpuTokenLimitInputKeyDown,
    onResetCpuTokenLimit,
  } = params;

  return (
    <div className="settings-block">
      <section className="settings-group">
        <header className="settings-group-head">
          <span>{t("ui.settings.performanceLoadSection")}</span>
        </header>

        <label
          htmlFor="settings-thumbnail-warmup-radius-select"
          data-tooltip-label={settingsTip("thumbnailWarmupRadius")}
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
          data-tooltip-label={settingsTip("thumbnailWarmupConcurrency")}
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
          data-tooltip-label={settingsTip("fullscreenPrefetchRadius")}
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
          htmlFor="settings-fullscreen-adjacent-package-prefetch-select"
          data-tooltip-label={settingsTip("fullscreenAdjacentPackagePrefetch")}
        >
          {t("ui.settings.fullscreenAdjacentPackagePrefetch")}
          <select
            id="settings-fullscreen-adjacent-package-prefetch-select"
            value={String(fullscreenAdjacentPackagePrefetch)}
            onChange={(event) =>
              onFullscreenAdjacentPackagePrefetchChange(
                Number(event.target.value),
              )
            }
          >
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </label>

        <label
          htmlFor="settings-fullscreen-decode-cache-size-select"
          data-tooltip-label={settingsTip("fullscreenDecodeCacheSize")}
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
          data-tooltip-label={t(
            "ui.settings.fullscreenResamplingEnabledTooltip",
          )}
        >
          <span
            data-tooltip-label={t(
              "ui.settings.fullscreenResamplingEnabledTooltip",
            )}
          >
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
              data-tooltip-label={t(
                "ui.settings.fullscreenDownsamplingKernelTooltip",
              )}
            >
              <span
                data-tooltip-label={t(
                  "ui.settings.fullscreenDownsamplingKernelTooltip",
                )}
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
              data-tooltip-label={t(
                "ui.settings.fullscreenUpsamplingKernelTooltip",
              )}
            >
              <span
                data-tooltip-label={t(
                  "ui.settings.fullscreenUpsamplingKernelTooltip",
                )}
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

      <section className="settings-group">
        <header className="settings-group-head">
          <span>{t("ui.settings.thumbnailPipelineSection")}</span>
        </header>
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
        <label
          htmlFor="settings-performance-preset-select"
          data-tooltip-label={t("ui.settings.tooltip.performancePreset")}
        >
          {t("ui.settings.performancePreset")}
          <select
            id="settings-performance-preset-select"
            value=""
            onChange={(event) => {
              const value = event.target.value;
              if (value) {
                onPerformancePresetChange(value);
              }
              event.target.value = "";
            }}
          >
            <option value="" disabled>
              {t("ui.settings.performancePresetPlaceholder")}
            </option>
            <option value="normal">
              {t("ui.settings.performancePresetNormal")}
            </option>
            <option value="performance">
              {t("ui.settings.performancePresetPerformance")}
            </option>
            <option value="ultra">
              {t("ui.settings.performancePresetUltra")}
            </option>
          </select>
        </label>
        <div className="settings-compact-row">
          <label data-tooltip-label={settingsTip("thumbnailQueueSize")}>
            {t("ui.settings.thumbnailQueueSize")}
          </label>
          <div className="settings-compact-input-group">
            <input
              className="settings-number-input"
              type="text"
              inputMode="numeric"
              value={thumbnailQueueSizeInput}
              onChange={(event) =>
                onThumbnailQueueSizeInputChange(event.target.value)
              }
              onBlur={onThumbnailQueueSizeInputBlur}
              onKeyDown={onThumbnailQueueSizeInputKeyDown}
            />
            <button
              className="settings-icon-btn main-icon-square-btn"
              type="button"
              aria-label={t("a11y.common.restoreDefault")}
              data-tooltip-label={t("tip.common.restoreDefault")}
              onClick={onResetThumbnailQueueSize}
            >
              <MainUiIcon name="return" />
            </button>
          </div>
        </div>
        <div className="settings-compact-row">
          <label data-tooltip-label={settingsTip("cpuTokenLimit")}>
            {t("ui.settings.cpuTokenLimit")}
          </label>
          <div className="settings-compact-input-group">
            <input
              className="settings-number-input"
              type="text"
              inputMode="numeric"
              value={cpuTokenLimitInput}
              onChange={(event) =>
                onCpuTokenLimitInputChange(event.target.value)
              }
              onBlur={onCpuTokenLimitInputBlur}
              onKeyDown={onCpuTokenLimitInputKeyDown}
            />
            <button
              className="settings-icon-btn main-icon-square-btn"
              type="button"
              aria-label={t("a11y.common.restoreDefault")}
              data-tooltip-label={t("tip.common.restoreDefault")}
              onClick={onResetCpuTokenLimit}
            >
              <MainUiIcon name="return" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
