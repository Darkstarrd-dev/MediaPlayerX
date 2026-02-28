import type { MouseEvent } from "react";

import type { StartAudioTranscodeTaskRequestDto } from "../contracts/backend";
import { useI18n } from "../i18n/useI18n";

type AudioTranscodePreset = StartAudioTranscodeTaskRequestDto["preset"];
type AudioTranscodeTaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "cancelled"
  | "failed"
  | null;

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
  taskStatus: AudioTranscodeTaskStatus;
  taskProgress: number;
  taskMessage: string | null;
  outputCount: number;
  onCloseMask: () => void;
  onPanelMouseDown: (event: MouseEvent<HTMLElement>) => void;
  onPresetChange: (value: AudioTranscodePreset) => void;
  onOutputDirChange: (value: string) => void;
  onPickOutputDir: () => void | Promise<void>;
  onOverwriteChange: (value: boolean) => void;
  onCopyMetadataChange: (value: boolean) => void;
  onAddOutputToMusicSourcesChange: (value: boolean) => void;
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
  taskStatus,
  taskProgress,
  taskMessage,
  outputCount,
  onCloseMask,
  onPanelMouseDown,
  onPresetChange,
  onOutputDirChange,
  onPickOutputDir,
  onOverwriteChange,
  onCopyMetadataChange,
  onAddOutputToMusicSourcesChange,
  onConfirm,
  onCancel,
}: MusicAudioTranscodePanelProps) {
  const { t } = useI18n();

  if (!open || fullscreenActive) {
    return null;
  }

  const taskStatusLabel = taskStatus
    ? t(`ui.music.audioTranscodeStatus.${taskStatus}`)
    : null;

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
            disabled={executing}
            onChange={(event) =>
              onPresetChange(event.target.value as AudioTranscodePreset)
            }
          >
            <option value="flac">FLAC</option>
            <option value="alac">ALAC</option>
            <option value="wav">WAV</option>
            <option value="opus">Opus</option>
            <option value="aac">AAC</option>
            <option value="mp3">MP3</option>
          </select>
        </label>
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
        <div className="mpx-overlay-actions mpx-overlay-actions-start">
          <button
            type="button"
            disabled={executing}
            onClick={() => void onConfirm()}
          >
            {t("ui.music.audioTranscodeStart")}
          </button>
          <button type="button" onClick={() => void onCancel()}>
            {executing
              ? t("ui.music.audioTranscodeCancelTask")
              : t("ui.music.audioTranscodeClose")}
          </button>
        </div>
      </section>
    </div>
  );
}
