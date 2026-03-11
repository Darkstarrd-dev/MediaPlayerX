import type { MouseEvent } from "react";
import { createPortal } from "react-dom";

import type {
  EstimateVideoTranscodeOutputSizeResponseDto,
  ReadVideoTranscodeCapabilitiesResponseDto,
  StartVideoTranscodeTaskRequestDto,
  VideoTranscodeTaskDto,
} from "../contracts/backend";
import { useI18n } from "../i18n/useI18n";
import { MainUiIcon } from "./MainUiIcon";

interface VideoTranscodePanelProps {
  open: boolean;
  fullscreenActive: boolean;
  executing: boolean;
  container: "mp4" | "mkv" | "webm";
  videoCodec: "h264" | "h265" | "vp9" | "av1" | "copy";
  qualityMode: "copy" | "crf" | "bitrate";
  crf: number;
  videoBitrateKbps: number | null;
  encoderPreset: NonNullable<
    NonNullable<
      StartVideoTranscodeTaskRequestDto["params_override"]
    >["encoder_preset"]
  >;
  encoderPresetOptions: Array<
    NonNullable<
      NonNullable<
        StartVideoTranscodeTaskRequestDto["params_override"]
      >["encoder_preset"]
    >
  >;
  scaleLongEdgePx: number | null;
  fps: number | null;
  audioMode: "copy" | "encode" | "drop";
  audioBitrateKbps: number | null;
  faststart: boolean;
  outputDir: string;
  pickingOutputDir: boolean;
  overwrite: boolean;
  addOutputToSources: boolean;
  capabilitiesLoading: boolean;
  capabilities: ReadVideoTranscodeCapabilitiesResponseDto | null;
  confirmDisabledReason: string | null;
  estimateLoading: boolean;
  estimateMessage: string | null;
  estimateResult: EstimateVideoTranscodeOutputSizeResponseDto | null;
  canOpenOutputDirectory: boolean;
  taskStatus: VideoTranscodeTaskDto["status"] | null;
  taskProgress: number;
  taskMessage: string | null;
  outputCount: number;
  onCloseMask: () => void;
  onPanelMouseDown: (event: MouseEvent<HTMLElement>) => void;
  onContainerChange: (value: "mp4" | "mkv" | "webm") => void;
  onVideoCodecChange: (value: "h264" | "h265" | "vp9" | "av1" | "copy") => void;
  onQualityModeChange: (value: "copy" | "crf" | "bitrate") => void;
  onCrfChange: (value: number) => void;
  onVideoBitrateKbpsChange: (value: number | null) => void;
  onEncoderPresetChange: (
    value: NonNullable<
      NonNullable<
        StartVideoTranscodeTaskRequestDto["params_override"]
      >["encoder_preset"]
    >,
  ) => void;
  onScaleLongEdgePxChange: (value: number | null) => void;
  onFpsChange: (value: number | null) => void;
  onAudioModeChange: (value: "copy" | "encode" | "drop") => void;
  onAudioBitrateKbpsChange: (value: number | null) => void;
  onFaststartChange: (value: boolean) => void;
  onOutputDirChange: (value: string) => void;
  onPickOutputDir: () => void | Promise<void>;
  onOverwriteChange: (value: boolean) => void;
  onAddOutputToSourcesChange: (value: boolean) => void;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void | Promise<void>;
  onOpenOutputDirectory: () => void | Promise<void>;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex <= 1 ? 0 : 2)} ${units[unitIndex]}`;
}

export function VideoTranscodePanel({
  open,
  fullscreenActive,
  executing,
  container,
  videoCodec,
  qualityMode,
  crf,
  videoBitrateKbps,
  encoderPreset,
  encoderPresetOptions,
  scaleLongEdgePx,
  fps,
  audioMode,
  audioBitrateKbps,
  faststart,
  outputDir,
  pickingOutputDir,
  overwrite,
  addOutputToSources,
  capabilitiesLoading,
  capabilities,
  confirmDisabledReason,
  estimateLoading,
  estimateMessage,
  estimateResult,
  canOpenOutputDirectory,
  taskStatus,
  taskProgress,
  taskMessage,
  outputCount,
  onCloseMask,
  onPanelMouseDown,
  onContainerChange,
  onVideoCodecChange,
  onQualityModeChange,
  onCrfChange,
  onVideoBitrateKbpsChange,
  onEncoderPresetChange,
  onScaleLongEdgePxChange,
  onFpsChange,
  onAudioModeChange,
  onAudioBitrateKbpsChange,
  onFaststartChange,
  onOutputDirChange,
  onPickOutputDir,
  onOverwriteChange,
  onAddOutputToSourcesChange,
  onConfirm,
  onCancel,
  onOpenOutputDirectory,
}: VideoTranscodePanelProps) {
  const { t } = useI18n();

  if (!open || fullscreenActive) {
    return null;
  }

  const taskStatusLabel = taskStatus
    ? t(`ui.media.videoTranscodeStatus.${taskStatus}`)
    : null;

  const sourceBytes = estimateResult?.source_total_bytes ?? 0;
  const estimatedBytes = estimateResult?.estimated_bytes ?? 0;
  const compressRatio =
    sourceBytes > 0
      ? Math.max(
          0,
          Math.min(100, ((sourceBytes - estimatedBytes) / sourceBytes) * 100),
        )
      : 0;

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="settings-mask"
      data-slot="fg-main-header-manage-video-transcode-ovl"
      role="dialog"
      aria-modal="true"
      aria-label={t("ui.media.videoTranscodeDialog")}
      onMouseDown={(event) => {
        if (event.target !== event.currentTarget || executing) {
          return;
        }
        onCloseMask();
      }}
    >
      <section
        className="mpx-large-panel mpx-large-panel--video-transcode settings-panel music-audio-transcode-dialog video-transcode-panel"
        data-slot="fg-main-header-manage-video-transcode-panel"
        onMouseDown={onPanelMouseDown}
      >
        <header className="mpx-large-panel-head settings-head video-transcode-head">
          <span
            className="mpx-large-panel-head-spacer settings-head-spacer"
            aria-hidden="true"
          />
          <h2 style={{ color: "var(--mpx-large-panel-head-text, inherit)" }}>
            {t("ui.media.videoTranscodeTitle")}
          </h2>
          <button
            className="feature-action-btn main-icon-square-btn settings-icon-btn"
            type="button"
            aria-label={t("a11y.common.close")}
            data-tooltip-label={t("tip.common.close")}
            onClick={() => void onCancel()}
          >
            <MainUiIcon name="close" />
          </button>
        </header>
        <div className="mpx-large-panel-shell settings-shell is-no-side video-transcode-shell">
          <main className="mpx-large-panel-main settings-main video-transcode-main">
            <div className="music-audio-transcode-body">
              <section className="mpx-overlay-section">
                <label className="main-header-image-convert-row mpx-overlay-field-row">
                  <span>{t("ui.media.videoTranscodeContainer")}</span>
                  <select
                    value={container}
                    disabled={executing || capabilitiesLoading}
                    onChange={(event) =>
                      onContainerChange(
                        event.target.value as "mp4" | "mkv" | "webm",
                      )
                    }
                  >
                    <option
                      value="mp4"
                      disabled={Boolean(
                        capabilities && !capabilities.containers.mp4.available,
                      )}
                    >
                      MP4
                    </option>
                    <option
                      value="mkv"
                      disabled={Boolean(
                        capabilities && !capabilities.containers.mkv.available,
                      )}
                    >
                      MKV
                    </option>
                    <option
                      value="webm"
                      disabled={Boolean(
                        capabilities && !capabilities.containers.webm.available,
                      )}
                    >
                      WebM
                    </option>
                  </select>
                </label>
                <label className="main-header-image-convert-row mpx-overlay-field-row">
                  <span>{t("ui.media.videoTranscodeCodec")}</span>
                  <select
                    value={videoCodec}
                    disabled={executing || capabilitiesLoading}
                    onChange={(event) =>
                      onVideoCodecChange(
                        event.target.value as
                          | "h264"
                          | "h265"
                          | "vp9"
                          | "av1"
                          | "copy",
                      )
                    }
                  >
                    <option
                      value="h264"
                      disabled={Boolean(
                        capabilities &&
                        !capabilities.video_codecs.h264.available,
                      )}
                    >
                      H.264
                    </option>
                    <option
                      value="h265"
                      disabled={Boolean(
                        capabilities &&
                        !capabilities.video_codecs.h265.available,
                      )}
                    >
                      H.265
                    </option>
                    <option
                      value="vp9"
                      disabled={Boolean(
                        capabilities &&
                        !capabilities.video_codecs.vp9.available,
                      )}
                    >
                      VP9
                    </option>
                    <option
                      value="av1"
                      disabled={Boolean(
                        capabilities &&
                        !capabilities.video_codecs.av1.available,
                      )}
                    >
                      AV1
                    </option>
                    <option
                      value="copy"
                      disabled={Boolean(
                        capabilities &&
                        !capabilities.video_codecs.copy.available,
                      )}
                    >
                      {t("ui.media.videoTranscodeCopyStream")}
                    </option>
                  </select>
                </label>
                <label className="main-header-image-convert-row mpx-overlay-field-row">
                  <span>{t("ui.media.videoTranscodeQualityMode")}</span>
                  <select
                    value={qualityMode}
                    disabled={executing}
                    onChange={(event) =>
                      onQualityModeChange(
                        event.target.value as "copy" | "crf" | "bitrate",
                      )
                    }
                  >
                    <option value="copy">
                      {t("ui.media.videoTranscodeQualityCopy")}
                    </option>
                    <option value="crf">CRF</option>
                    <option value="bitrate">
                      {t("ui.media.videoTranscodeQualityBitrate")}
                    </option>
                  </select>
                </label>
                {qualityMode === "crf" ? (
                  <label className="main-header-image-convert-row mpx-overlay-field-row">
                    <span>CRF</span>
                    <input
                      type="number"
                      min={0}
                      max={51}
                      step={1}
                      value={crf}
                      disabled={executing}
                      onChange={(event) =>
                        onCrfChange(Number(event.target.value))
                      }
                    />
                  </label>
                ) : null}
                {qualityMode === "bitrate" ? (
                  <label className="main-header-image-convert-row mpx-overlay-field-row">
                    <span>{t("ui.media.videoTranscodeVideoBitrateKbps")}</span>
                    <input
                      type="number"
                      min={100}
                      max={200000}
                      step={1}
                      value={videoBitrateKbps ?? ""}
                      disabled={executing}
                      onChange={(event) => {
                        const raw = event.target.value.trim();
                        onVideoBitrateKbpsChange(raw ? Number(raw) : null);
                      }}
                    />
                  </label>
                ) : null}
                <label className="main-header-image-convert-row mpx-overlay-field-row">
                  <span>{t("ui.media.videoTranscodeEncoderPreset")}</span>
                  <select
                    value={encoderPreset}
                    disabled={
                      executing ||
                      (videoCodec !== "h264" && videoCodec !== "h265")
                    }
                    onChange={(event) =>
                      onEncoderPresetChange(
                        event.target.value as NonNullable<
                          NonNullable<
                            StartVideoTranscodeTaskRequestDto["params_override"]
                          >["encoder_preset"]
                        >,
                      )
                    }
                  >
                    {encoderPresetOptions.map((preset) => (
                      <option key={preset} value={preset}>
                        {preset}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="main-header-image-convert-row mpx-overlay-field-row">
                  <span>{t("ui.media.videoTranscodeScaleLongEdge")}</span>
                  <input
                    type="number"
                    min={240}
                    max={7680}
                    step={1}
                    value={scaleLongEdgePx ?? ""}
                    disabled={executing}
                    onChange={(event) => {
                      const raw = event.target.value.trim();
                      onScaleLongEdgePxChange(raw ? Number(raw) : null);
                    }}
                  />
                </label>
                <label className="main-header-image-convert-row mpx-overlay-field-row">
                  <span>{t("ui.media.videoTranscodeFps")}</span>
                  <input
                    type="number"
                    min={1}
                    max={240}
                    step={0.001}
                    value={fps ?? ""}
                    disabled={executing}
                    onChange={(event) => {
                      const raw = event.target.value.trim();
                      onFpsChange(raw ? Number(raw) : null);
                    }}
                  />
                </label>
                <label className="main-header-image-convert-row mpx-overlay-field-row">
                  <span>{t("ui.media.videoTranscodeAudioMode")}</span>
                  <select
                    value={audioMode}
                    disabled={executing}
                    onChange={(event) =>
                      onAudioModeChange(
                        event.target.value as "copy" | "encode" | "drop",
                      )
                    }
                  >
                    <option value="copy">
                      {t("ui.media.videoTranscodeAudioCopy")}
                    </option>
                    <option value="encode">
                      {t("ui.media.videoTranscodeAudioEncode")}
                    </option>
                    <option value="drop">
                      {t("ui.media.videoTranscodeAudioDrop")}
                    </option>
                  </select>
                </label>
                {audioMode === "encode" ? (
                  <label className="main-header-image-convert-row mpx-overlay-field-row">
                    <span>{t("ui.media.videoTranscodeAudioBitrateKbps")}</span>
                    <input
                      type="number"
                      min={16}
                      max={1536}
                      step={1}
                      value={audioBitrateKbps ?? ""}
                      disabled={executing}
                      onChange={(event) => {
                        const raw = event.target.value.trim();
                        onAudioBitrateKbpsChange(raw ? Number(raw) : null);
                      }}
                    />
                  </label>
                ) : null}
                <label className="main-header-image-convert-row mpx-overlay-field-row">
                  <span>{t("ui.media.videoTranscodeFaststart")}</span>
                  <input
                    type="checkbox"
                    checked={faststart}
                    disabled={executing || container !== "mp4"}
                    onChange={(event) =>
                      onFaststartChange(event.target.checked)
                    }
                  />
                </label>
              </section>

              <div className="music-audio-transcode-path-row mpx-overlay-seamless-row">
                <input
                  className="sidebar-rename-seamless-control music-audio-transcode-output-input"
                  type="text"
                  value={outputDir}
                  disabled={executing}
                  placeholder={t(
                    "ui.media.videoTranscodeOutputDirectoryPlaceholder",
                  )}
                  onChange={(event) => onOutputDirChange(event.target.value)}
                />
                <button
                  className="feature-action-btn main-icon-square-btn music-audio-transcode-seamless-btn mpx-overlay-seamless-cell mpx-overlay-seamless-btn mpx-overlay-cell-btn"
                  type="button"
                  disabled={executing || pickingOutputDir}
                  onClick={() => void onPickOutputDir()}
                >
                  {pickingOutputDir
                    ? t("ui.media.videoTranscodePickingOutputDirectory")
                    : t("ui.media.videoTranscodePickOutputDirectory")}
                </button>
                <button
                  className="feature-action-btn main-icon-square-btn music-audio-transcode-seamless-btn mpx-overlay-seamless-cell mpx-overlay-seamless-btn mpx-overlay-cell-btn"
                  type="button"
                  disabled={executing || outputDir.trim().length <= 0}
                  onClick={() => onOutputDirChange("")}
                >
                  {t("ui.common.clear")}
                </button>
              </div>

              <label className="main-header-image-convert-row mpx-overlay-field-row">
                <span>{t("ui.media.videoTranscodeOverwrite")}</span>
                <input
                  type="checkbox"
                  checked={overwrite}
                  disabled={executing}
                  onChange={(event) => onOverwriteChange(event.target.checked)}
                />
              </label>

              <label className="main-header-image-convert-row mpx-overlay-field-row">
                <span>{t("ui.media.videoTranscodeAddOutputToSources")}</span>
                <input
                  type="checkbox"
                  checked={addOutputToSources}
                  disabled={executing}
                  onChange={(event) =>
                    onAddOutputToSourcesChange(event.target.checked)
                  }
                />
              </label>

              {capabilitiesLoading ? (
                <p className="mpx-overlay-caption">
                  {t("ui.media.videoTranscodeCapabilityLoading")}
                </p>
              ) : null}
              {confirmDisabledReason ? (
                <p className="mpx-overlay-caption">{confirmDisabledReason}</p>
              ) : null}

              <section className="mpx-overlay-section">
                <p className="mpx-overlay-caption">
                  {t("ui.media.videoTranscodeEstimateTitle")}
                </p>
                {estimateLoading ? (
                  <p className="mpx-overlay-caption">
                    {t("ui.common.loading")}
                  </p>
                ) : null}
                {estimateMessage ? (
                  <p className="mpx-overlay-caption">{estimateMessage}</p>
                ) : null}
                {estimateResult ? (
                  <div className="mpx-overlay-caption">
                    <div>
                      {t("ui.media.videoTranscodeEstimateSourceSize", {
                        value: formatBytes(sourceBytes),
                      })}
                    </div>
                    <div>
                      {t("ui.media.videoTranscodeEstimateOutputSize", {
                        value: formatBytes(estimatedBytes),
                      })}
                    </div>
                    {estimateResult.range ? (
                      <div>
                        {t("ui.media.videoTranscodeEstimateRange", {
                          low: formatBytes(estimateResult.range.low_bytes),
                          high: formatBytes(estimateResult.range.high_bytes),
                        })}
                      </div>
                    ) : null}
                    <div>
                      {t("ui.media.videoTranscodeEstimateCompressRatio", {
                        ratio: Math.round(compressRatio),
                      })}
                    </div>
                    <div>
                      {t("ui.media.videoTranscodeEstimateMethod", {
                        method: estimateResult.method,
                        confidence: estimateResult.confidence,
                      })}
                    </div>
                  </div>
                ) : null}
              </section>

              {taskStatus && taskStatusLabel ? (
                <p className="main-header-hint">
                  {`${t("ui.media.videoTranscodeTaskSummary", {
                    status: taskStatusLabel,
                    progress: Math.round(taskProgress * 100),
                    count: outputCount,
                  })}${taskMessage ? ` | ${taskMessage}` : ""}`}
                </p>
              ) : null}
            </div>

            <div className="mpx-overlay-actions mpx-overlay-footer-actions music-audio-transcode-footer-actions">
              <button
                className="feature-action-btn main-icon-square-btn sidebar-rename-g2-btn mpx-soft-metal-btn mpx-overlay-footer-btn"
                type="button"
                disabled={executing || !canOpenOutputDirectory}
                onClick={() => void onOpenOutputDirectory()}
              >
                {t("ui.media.videoTranscodeOpenOutputDirectory")}
              </button>
              <button
                className="feature-action-btn main-icon-square-btn sidebar-rename-g2-btn mpx-soft-metal-btn mpx-overlay-footer-btn"
                type="button"
                disabled={executing || Boolean(confirmDisabledReason)}
                onClick={() => void onConfirm()}
              >
                {t("ui.media.videoTranscodeStart")}
              </button>
              <button
                className="feature-action-btn main-icon-square-btn sidebar-rename-g2-btn mpx-soft-metal-btn mpx-overlay-footer-btn"
                type="button"
                onClick={() => void onCancel()}
              >
                {executing
                  ? t("ui.media.videoTranscodeCancelTask")
                  : t("ui.media.videoTranscodeClose")}
              </button>
            </div>
          </main>
        </div>
      </section>
    </div>,
    document.body,
  );
}
