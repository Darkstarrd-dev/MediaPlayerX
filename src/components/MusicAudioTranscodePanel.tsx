import { useMemo, useState, type MouseEvent } from "react";

import type {
  ReadAudioTranscodeCapabilitiesResponseDto,
  StartAudioTranscodeTaskRequestDto,
} from "../contracts/backend";
import { useI18n } from "../i18n/useI18n";

type AudioTranscodePreset = StartAudioTranscodeTaskRequestDto["preset"];
type AudioTranscodePresetCapabilities =
  ReadAudioTranscodeCapabilitiesResponseDto["presets"];
type AudioTranscodeTaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "cancelled"
  | "failed"
  | null;

interface AudioTranscodeTaskHistoryItem {
  taskId: string;
  status: Exclude<AudioTranscodeTaskStatus, null>;
  progress: number;
  outputCount: number;
  message: string | null;
}

interface MusicAudioTranscodePanelProps {
  open: boolean;
  fullscreenActive: boolean;
  executing: boolean;
  preset: AudioTranscodePreset;
  outputDir: string;
  pickingOutputDir: boolean;
  overwrite: boolean;
  copyMetadata: boolean;
  addOutputToMusicSources: boolean;
  capabilitiesLoading: boolean;
  capabilities: AudioTranscodePresetCapabilities | null;
  confirmDisabledReason: string | null;
  outputPolicyHint: string | null;
  taskStatus: AudioTranscodeTaskStatus;
  taskProgress: number;
  taskMessage: string | null;
  outputCount: number;
  taskHistory: AudioTranscodeTaskHistoryItem[];
  onCloseMask: () => void;
  onPanelMouseDown: (event: MouseEvent<HTMLElement>) => void;
  onPresetChange: (value: AudioTranscodePreset) => void;
  onOutputDirChange: (value: string) => void;
  onPickOutputDir: () => void | Promise<void>;
  onOverwriteChange: (value: boolean) => void;
  onCopyMetadataChange: (value: boolean) => void;
  onAddOutputToMusicSourcesChange: (value: boolean) => void;
  onRetryTask: (taskId: string) => void | Promise<void>;
  onRetryFailedTasks: () => void | Promise<void>;
  onClearTaskHistory: () => void;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void | Promise<void>;
}

export function MusicAudioTranscodePanel({
  open,
  fullscreenActive,
  executing,
  preset,
  outputDir,
  pickingOutputDir,
  overwrite,
  copyMetadata,
  addOutputToMusicSources,
  capabilitiesLoading,
  capabilities,
  confirmDisabledReason,
  outputPolicyHint,
  taskStatus,
  taskProgress,
  taskMessage,
  outputCount,
  taskHistory,
  onCloseMask,
  onPanelMouseDown,
  onPresetChange,
  onOutputDirChange,
  onPickOutputDir,
  onOverwriteChange,
  onCopyMetadataChange,
  onAddOutputToMusicSourcesChange,
  onRetryTask,
  onRetryFailedTasks,
  onClearTaskHistory,
  onConfirm,
  onCancel,
}: MusicAudioTranscodePanelProps) {
  const { t } = useI18n();
  const [historyFailedOnly, setHistoryFailedOnly] = useState(false);
  const selectedPresetCapability = capabilities?.[preset] ?? null;
  const taskStatusLabel = taskStatus
    ? t(`ui.music.audioTranscodeStatus.${taskStatus}`)
    : null;
  const failedTaskCount = useMemo(
    () => taskHistory.filter((task) => task.status === "failed").length,
    [taskHistory],
  );
  const filteredTaskHistory = useMemo(() => {
    if (!historyFailedOnly) {
      return taskHistory;
    }
    return taskHistory.filter((task) => task.status === "failed");
  }, [historyFailedOnly, taskHistory]);

  if (!open || fullscreenActive) {
    return null;
  }

  return (
    <div
      className="settings-floating-mask"
      data-slot="fg-main-toolbar-music-transcode-panel"
      role="dialog"
      aria-modal="true"
      aria-label={t("ui.music.audioTranscodeDialog")}
      onMouseDown={(event) => {
        if (event.target !== event.currentTarget || executing) {
          return;
        }
        onCloseMask();
      }}
    >
      <section
        className="settings-floating-panel main-toolbar-image-convert-panel main-toolbar-image-convert-dialog"
        onMouseDown={onPanelMouseDown}
      >
        <h3 className="main-toolbar-image-convert-title">
          {t("ui.music.audioTranscodeTitle")}
        </h3>
        <label className="main-toolbar-image-convert-row mpx-overlay-field-row">
          <span>{t("ui.music.audioTranscodePreset")}</span>
          <select
            value={preset}
            disabled={executing || capabilitiesLoading}
            onChange={(event) =>
              onPresetChange(event.target.value as AudioTranscodePreset)
            }
          >
            <option
              value="flac"
              disabled={Boolean(capabilities && !capabilities.flac.available)}
            >
              FLAC
            </option>
            <option
              value="alac"
              disabled={Boolean(capabilities && !capabilities.alac.available)}
            >
              ALAC
            </option>
            <option
              value="wav"
              disabled={Boolean(capabilities && !capabilities.wav.available)}
            >
              WAV
            </option>
            <option
              value="opus"
              disabled={Boolean(capabilities && !capabilities.opus.available)}
            >
              Opus
            </option>
            <option
              value="aac"
              disabled={Boolean(capabilities && !capabilities.aac.available)}
            >
              AAC
            </option>
            <option
              value="mp3"
              disabled={Boolean(capabilities && !capabilities.mp3.available)}
            >
              MP3
            </option>
          </select>
        </label>
        {capabilitiesLoading ? (
          <p className="mpx-overlay-caption">
            {t("ui.music.audioTranscodeCapabilityLoading")}
          </p>
        ) : null}
        {!capabilitiesLoading && selectedPresetCapability?.available === false ? (
          <p className="mpx-overlay-caption">
            {selectedPresetCapability.reason === "muxer_unavailable"
              ? t("ui.music.audioTranscodePresetMuxerUnavailable", {
                  muxer: selectedPresetCapability.required_muxer,
                })
              : t("ui.music.audioTranscodePresetUnavailable", {
                  encoder: selectedPresetCapability.required_encoder,
                })}
          </p>
        ) : null}
        {confirmDisabledReason ? (
          <p className="mpx-overlay-caption">{confirmDisabledReason}</p>
        ) : null}
        <label className="main-toolbar-image-convert-row mpx-overlay-field-row">
          <span>{t("ui.music.audioTranscodeOutputDirectory")}</span>
          <input
            type="text"
            placeholder={t("ui.music.audioTranscodeOutputDirectoryPlaceholder")}
            value={outputDir}
            disabled={executing}
            onChange={(event) => onOutputDirChange(event.target.value)}
          />
        </label>
        <div className="mpx-overlay-actions mpx-overlay-actions-start">
          <button
            type="button"
            disabled={executing || pickingOutputDir}
            onClick={() => void onPickOutputDir()}
          >
            {pickingOutputDir
              ? t("ui.music.audioTranscodePickingOutputDirectory")
              : t("ui.music.audioTranscodePickOutputDirectory")}
          </button>
          <button
            type="button"
            disabled={executing || outputDir.trim().length <= 0}
            onClick={() => onOutputDirChange("")}
          >
            {t("ui.common.clear")}
          </button>
        </div>
        {outputPolicyHint ? (
          <p className="mpx-overlay-caption">{outputPolicyHint}</p>
        ) : null}
        <label className="main-toolbar-image-convert-row mpx-overlay-field-row">
          <span>{t("ui.music.audioTranscodeOverwrite")}</span>
          <input
            type="checkbox"
            checked={overwrite}
            disabled={executing}
            onChange={(event) => onOverwriteChange(event.target.checked)}
          />
        </label>
        <label className="main-toolbar-image-convert-row mpx-overlay-field-row">
          <span>{t("ui.music.audioTranscodeCopyMetadata")}</span>
          <input
            type="checkbox"
            checked={copyMetadata}
            disabled={executing}
            onChange={(event) => onCopyMetadataChange(event.target.checked)}
          />
        </label>
        <label className="main-toolbar-image-convert-row mpx-overlay-field-row">
          <span>{t("ui.music.audioTranscodeAddOutputToSources")}</span>
          <input
            type="checkbox"
            checked={addOutputToMusicSources}
            disabled={executing}
            onChange={(event) =>
              onAddOutputToMusicSourcesChange(event.target.checked)
            }
          />
        </label>
        {taskStatus && taskStatusLabel ? (
          <p className="main-toolbar-hint">
            {`${t("ui.music.audioTranscodeTaskSummary", {
              status: taskStatusLabel,
              progress: Math.round(taskProgress * 100),
              count: outputCount,
            })}${taskMessage ? ` | ${taskMessage}` : ""}`}
          </p>
        ) : null}
        {taskHistory.length > 0 ? (
          <section className="mpx-overlay-section">
            <div className="mpx-overlay-actions mpx-overlay-actions-start">
              <p className="mpx-overlay-caption">
                {t("ui.music.audioTranscodeHistoryTitle")}
              </p>
              <button
                type="button"
                disabled={executing}
                onClick={() => {
                  setHistoryFailedOnly((value) => !value);
                }}
              >
                {historyFailedOnly
                  ? t("ui.music.audioTranscodeHistoryShowAll")
                  : t("ui.music.audioTranscodeHistoryShowFailedOnly")}
              </button>
              <button
                type="button"
                disabled={executing || failedTaskCount <= 0}
                onClick={() => void onRetryFailedTasks()}
              >
                {t("ui.music.audioTranscodeRetryFailedTasks", {
                  count: failedTaskCount,
                })}
              </button>
            </div>
            <ul className="mpx-overlay-list-surface mpx-overlay-scroll-list">
              {filteredTaskHistory.map((task) => {
                const status = t(`ui.music.audioTranscodeStatus.${task.status}`);
                return (
                  <li key={task.taskId}>
                    <div className="mpx-overlay-actions mpx-overlay-actions-start">
                      <span className="mpx-overlay-list-item-truncate">
                        {t("ui.music.audioTranscodeHistoryItem", {
                          id: task.taskId.slice(0, 8),
                          status,
                          progress: Math.round(task.progress * 100),
                          count: task.outputCount,
                        })}
                      </span>
                      <button
                        type="button"
                        disabled={executing || task.status !== "failed"}
                        onClick={() => void onRetryTask(task.taskId)}
                      >
                        {t("ui.common.retry")}
                      </button>
                    </div>
                    {task.message ? (
                      <p className="mpx-overlay-caption">{task.message}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {filteredTaskHistory.length <= 0 ? (
              <p className="mpx-overlay-caption">
                {t("ui.music.audioTranscodeNoFailedTaskInHistory")}
              </p>
            ) : null}
          </section>
        ) : null}
        <div className="mpx-overlay-actions mpx-overlay-actions-start">
          <button
            type="button"
            disabled={executing || Boolean(confirmDisabledReason)}
            onClick={() => void onConfirm()}
          >
            {t("ui.music.audioTranscodeStart")}
          </button>
          <button type="button" onClick={() => void onCancel()}>
            {executing
              ? t("ui.music.audioTranscodeCancelTask")
              : t("ui.music.audioTranscodeClose")}
          </button>
          <button
            type="button"
            disabled={executing || taskHistory.length <= 0}
            onClick={onClearTaskHistory}
          >
            {t("ui.common.clear")}
          </button>
        </div>
      </section>
    </div>
  );
}
