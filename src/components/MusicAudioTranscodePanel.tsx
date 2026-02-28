import type { MouseEvent } from "react";

import type { StartAudioTranscodeTaskRequestDto } from "../contracts/backend";

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
  onOverwriteChange,
  onCopyMetadataChange,
  onAddOutputToMusicSourcesChange,
  onConfirm,
  onCancel,
}: MusicAudioTranscodePanelProps) {
  if (!open || fullscreenActive) {
    return null;
  }

  return (
    <div
      className="settings-floating-mask"
      data-slot="fg-main-toolbar-music-transcode-panel"
      role="dialog"
      aria-modal="true"
      aria-label="音频转码设置"
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
        <h3 className="main-toolbar-image-convert-title">音频转码</h3>
        <label className="main-toolbar-image-convert-row mpx-overlay-field-row">
          <span>预设</span>
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
          <span>输出目录</span>
          <input
            type="text"
            placeholder="留空=源文件目录"
            value={outputDir}
            disabled={executing}
            onChange={(event) => onOutputDirChange(event.target.value)}
          />
        </label>
        <label className="main-toolbar-image-convert-row mpx-overlay-field-row">
          <span>覆盖已有文件</span>
          <input
            type="checkbox"
            checked={overwrite}
            disabled={executing}
            onChange={(event) => onOverwriteChange(event.target.checked)}
          />
        </label>
        <label className="main-toolbar-image-convert-row mpx-overlay-field-row">
          <span>复制元数据</span>
          <input
            type="checkbox"
            checked={copyMetadata}
            disabled={executing}
            onChange={(event) => onCopyMetadataChange(event.target.checked)}
          />
        </label>
        <label className="main-toolbar-image-convert-row mpx-overlay-field-row">
          <span>输出自动纳入音乐源</span>
          <input
            type="checkbox"
            checked={addOutputToMusicSources}
            disabled={executing}
            onChange={(event) =>
              onAddOutputToMusicSourcesChange(event.target.checked)
            }
          />
        </label>
        {taskStatus ? (
          <p className="main-toolbar-hint">
            {`转码 ${taskStatus} ${Math.round(taskProgress * 100)}% | 输出 ${outputCount} 个${taskMessage ? ` | ${taskMessage}` : ""}`}
          </p>
        ) : null}
        <div className="mpx-overlay-actions mpx-overlay-actions-start">
          <button
            type="button"
            disabled={executing}
            onClick={() => void onConfirm()}
          >
            开始
          </button>
          <button type="button" onClick={() => void onCancel()}>
            {executing ? "取消任务" : "关闭"}
          </button>
        </div>
      </section>
    </div>
  );
}
