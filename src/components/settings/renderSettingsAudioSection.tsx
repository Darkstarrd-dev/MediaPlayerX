import type { JSX } from "react";

import { MainUiIcon } from "../MainUiIcon";
import type {
  AudioEngineModeDto,
  AudioGaplessModeDto,
  AudioReplayGainModeDto,
  ReadAudioTranscodeCapabilitiesResponseDto,
} from "../../contracts/backend";
import type { RenderSettingsMainSectionParams } from "./renderSettingsMainSection.types";

interface RenderSettingsAudioSectionParams {
  t: RenderSettingsMainSectionParams["t"];
  audioEngineLoading: RenderSettingsMainSectionParams["audioEngineLoading"];
  audioEngineUpdating: RenderSettingsMainSectionParams["audioEngineUpdating"];
  audioEngineError: RenderSettingsMainSectionParams["audioEngineError"];
  audioEngineMode: RenderSettingsMainSectionParams["audioEngineMode"];
  audioEngineDesiredMode: RenderSettingsMainSectionParams["audioEngineDesiredMode"];
  audioEngineUsingFallback: RenderSettingsMainSectionParams["audioEngineUsingFallback"];
  audioEngineMpvAvailable: RenderSettingsMainSectionParams["audioEngineMpvAvailable"];
  audioEngineMpvBinPath: RenderSettingsMainSectionParams["audioEngineMpvBinPath"];
  mpvBinDirectoryDraft: RenderSettingsMainSectionParams["mpvBinDirectoryDraft"];
  mpvBinVerifyPending: RenderSettingsMainSectionParams["mpvBinVerifyPending"];
  mpvBinVerifyMessage: RenderSettingsMainSectionParams["mpvBinVerifyMessage"];
  audioEngineActiveDeviceId: RenderSettingsMainSectionParams["audioEngineActiveDeviceId"];
  audioEngineExclusiveEnabled: RenderSettingsMainSectionParams["audioEngineExclusiveEnabled"];
  audioEngineGaplessMode: RenderSettingsMainSectionParams["audioEngineGaplessMode"];
  audioEngineReplayGainMode: RenderSettingsMainSectionParams["audioEngineReplayGainMode"];
  audioOutputDevicesLoading: RenderSettingsMainSectionParams["audioOutputDevicesLoading"];
  audioOutputDevices: RenderSettingsMainSectionParams["audioOutputDevices"];
  audioTranscodeCapabilitiesLoading: RenderSettingsMainSectionParams["audioTranscodeCapabilitiesLoading"];
  audioTranscodeCapabilitiesError: RenderSettingsMainSectionParams["audioTranscodeCapabilitiesError"];
  audioTranscodeCapabilities: RenderSettingsMainSectionParams["audioTranscodeCapabilities"];
  ffmpegBinDirectoryDraft: RenderSettingsMainSectionParams["ffmpegBinDirectoryDraft"];
  ffmpegBinVerifyPending: RenderSettingsMainSectionParams["ffmpegBinVerifyPending"];
  ffmpegBinVerifyMessage: RenderSettingsMainSectionParams["ffmpegBinVerifyMessage"];
  onRefreshAudioEngineState: RenderSettingsMainSectionParams["onRefreshAudioEngineState"];
  onRefreshAudioOutputDevices: RenderSettingsMainSectionParams["onRefreshAudioOutputDevices"];
  onRefreshAudioTranscodeCapabilities: RenderSettingsMainSectionParams["onRefreshAudioTranscodeCapabilities"];
  onMpvBinDirectoryDraftChange: RenderSettingsMainSectionParams["onMpvBinDirectoryDraftChange"];
  onFfmpegBinDirectoryDraftChange: RenderSettingsMainSectionParams["onFfmpegBinDirectoryDraftChange"];
  onPickMpvBinDirectory: RenderSettingsMainSectionParams["onPickMpvBinDirectory"];
  onPickFfmpegBinDirectory: RenderSettingsMainSectionParams["onPickFfmpegBinDirectory"];
  onVerifyMpvBinDirectory: RenderSettingsMainSectionParams["onVerifyMpvBinDirectory"];
  onVerifyFfmpegBinDirectory: RenderSettingsMainSectionParams["onVerifyFfmpegBinDirectory"];
  onAudioEngineModeChange: RenderSettingsMainSectionParams["onAudioEngineModeChange"];
  onAudioOutputDeviceChange: RenderSettingsMainSectionParams["onAudioOutputDeviceChange"];
  onAudioExclusiveChange: RenderSettingsMainSectionParams["onAudioExclusiveChange"];
  onAudioGaplessModeChange: RenderSettingsMainSectionParams["onAudioGaplessModeChange"];
  onAudioReplayGainModeChange: RenderSettingsMainSectionParams["onAudioReplayGainModeChange"];
}

function resolveModeLabel(mode: AudioEngineModeDto): string {
  return mode === "mpv" ? "增强模式 (mpv)" : "兼容模式 (chromium)";
}

function resolveGaplessLabel(mode: AudioGaplessModeDto): string {
  if (mode === "yes") {
    return "强无缝 (yes)";
  }
  if (mode === "no") {
    return "关闭 (no)";
  }
  return "平衡 (weak)";
}

function resolveReplayGainLabel(mode: AudioReplayGainModeDto): string {
  if (mode === "track") {
    return "按曲目 (track)";
  }
  if (mode === "album") {
    return "按专辑 (album)";
  }
  return "关闭 (off)";
}

function resolveDateTimeOrDash(timestamp: number | null): string {
  if (
    typeof timestamp !== "number" ||
    !Number.isFinite(timestamp) ||
    timestamp <= 0
  ) {
    return "-";
  }
  return new Date(timestamp).toLocaleString();
}

const AUDIO_TRANSCODE_PRESET_LABELS: Record<
  keyof ReadAudioTranscodeCapabilitiesResponseDto["presets"],
  string
> = {
  flac: "FLAC",
  alac: "ALAC",
  wav: "WAV",
  opus: "Opus",
  aac: "AAC",
  mp3: "MP3",
};

function resolvePresetCapabilityLabel(
  preset: keyof ReadAudioTranscodeCapabilitiesResponseDto["presets"],
  capability: ReadAudioTranscodeCapabilitiesResponseDto["presets"][keyof ReadAudioTranscodeCapabilitiesResponseDto["presets"]],
): string {
  if (capability.available) {
    return "可用";
  }
  if (capability.reason === "muxer_unavailable") {
    return `缺少封装器 (${capability.required_muxer})`;
  }
  if (capability.reason === "encoder_unavailable") {
    return `缺少编码器 (${capability.required_encoder})`;
  }
  if (capability.reason === "ffmpeg_unavailable") {
    return "ffmpeg 不可用";
  }
  return `${AUDIO_TRANSCODE_PRESET_LABELS[preset]} 不可用`;
}

export function renderSettingsAudioSection(
  params: RenderSettingsAudioSectionParams,
): JSX.Element {
  return (
    <div className="settings-block">
      <fieldset className="settings-subsection">
        <legend>音频增强模式</legend>
        <p className="settings-placeholder">
          默认保持兼容模式；切换到增强模式后使用 mpv 输出链路。
        </p>
        <div className="settings-runtime-grid">
          <span>当前模式</span>
          <code>{resolveModeLabel(params.audioEngineMode)}</code>
          <span>目标模式</span>
          <code>{resolveModeLabel(params.audioEngineDesiredMode)}</code>
          <span>mpv 可用</span>
          <code>{String(params.audioEngineMpvAvailable)}</code>
          <span>回退状态</span>
          <code>{String(params.audioEngineUsingFallback)}</code>
          <span>mpv 路径</span>
          <code>{params.audioEngineMpvBinPath ?? "-"}</code>
          <span>Gapless</span>
          <code>{resolveGaplessLabel(params.audioEngineGaplessMode)}</code>
          <span>ReplayGain</span>
          <code>
            {resolveReplayGainLabel(params.audioEngineReplayGainMode)}
          </code>
        </div>
        <div className="settings-runtime-actions">
          <button
            className="settings-icon-btn main-icon-square-btn"
            type="button"
            disabled={params.audioEngineLoading || params.audioEngineUpdating}
            aria-label="刷新音频引擎状态"
            data-tooltip-label="刷新音频引擎状态"
            onClick={params.onRefreshAudioEngineState}
          >
            <MainUiIcon name="refresh" />
          </button>
          <button
            className="settings-icon-btn main-icon-square-btn"
            type="button"
            disabled={
              params.audioOutputDevicesLoading || params.audioEngineUpdating
            }
            aria-label="刷新输出设备列表"
            data-tooltip-label="刷新输出设备列表"
            onClick={params.onRefreshAudioOutputDevices}
          >
            <MainUiIcon name="refresh" />
          </button>
        </div>
        <label>
          MPX_MPV_BIN 目录
          <input
            type="text"
            value={params.mpvBinDirectoryDraft}
            placeholder="例如：C:\\Tools\\mpv"
            disabled={params.audioEngineUpdating || params.mpvBinVerifyPending}
            onChange={(event) =>
              params.onMpvBinDirectoryDraftChange(event.target.value)
            }
          />
        </label>
        <div className="settings-runtime-actions">
          <button
            type="button"
            disabled={params.audioEngineUpdating || params.mpvBinVerifyPending}
            onClick={params.onPickMpvBinDirectory}
          >
            选择目录
          </button>
          <button
            type="button"
            disabled={params.audioEngineUpdating || params.mpvBinVerifyPending}
            onClick={params.onVerifyMpvBinDirectory}
          >
            {params.mpvBinVerifyPending ? "验证中..." : "验证 MPX_MPV_BIN"}
          </button>
        </div>
        <label>
          音频模式
          <select
            value={params.audioEngineDesiredMode}
            disabled={
              params.audioEngineUpdating || !params.audioEngineMpvAvailable
            }
            onChange={(event) =>
              params.onAudioEngineModeChange(
                event.target.value as AudioEngineModeDto,
              )
            }
          >
            <option value="chromium">兼容模式 (chromium)</option>
            <option value="mpv">增强模式 (mpv)</option>
          </select>
        </label>
        <label>
          输出设备
          <select
            value={params.audioEngineActiveDeviceId ?? "auto"}
            disabled={
              params.audioEngineUpdating ||
              params.audioEngineDesiredMode !== "mpv" ||
              params.audioOutputDevices.length <= 0
            }
            onChange={(event) => {
              params.onAudioOutputDeviceChange(event.target.value);
            }}
          >
            {params.audioOutputDevices.length > 0 ? (
              params.audioOutputDevices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.label}
                </option>
              ))
            ) : (
              <option value="auto">自动选择</option>
            )}
          </select>
        </label>
        <label className="settings-toggle-row">
          <input
            type="checkbox"
            checked={params.audioEngineExclusiveEnabled}
            disabled={
              params.audioEngineUpdating ||
              params.audioEngineDesiredMode !== "mpv"
            }
            onChange={(event) =>
              params.onAudioExclusiveChange(event.target.checked)
            }
          />
          <span>独占输出 (WASAPI Exclusive)</span>
        </label>
        <label>
          Gapless
          <select
            value={params.audioEngineGaplessMode}
            disabled={
              params.audioEngineUpdating ||
              params.audioEngineDesiredMode !== "mpv"
            }
            onChange={(event) =>
              params.onAudioGaplessModeChange(
                event.target.value as AudioGaplessModeDto,
              )
            }
          >
            <option value="weak">平衡 (weak)</option>
            <option value="yes">强无缝 (yes)</option>
            <option value="no">关闭 (no)</option>
          </select>
        </label>
        <label>
          ReplayGain
          <select
            value={params.audioEngineReplayGainMode}
            disabled={
              params.audioEngineUpdating ||
              params.audioEngineDesiredMode !== "mpv"
            }
            onChange={(event) =>
              params.onAudioReplayGainModeChange(
                event.target.value as AudioReplayGainModeDto,
              )
            }
          >
            <option value="off">关闭 (off)</option>
            <option value="track">按曲目 (track)</option>
            <option value="album">按专辑 (album)</option>
          </select>
        </label>
        {params.audioEngineError ? (
          <p className="settings-danger-text">{params.audioEngineError}</p>
        ) : null}
        {params.mpvBinVerifyMessage ? (
          <p className="settings-placeholder">{params.mpvBinVerifyMessage}</p>
        ) : null}
      </fieldset>

      <fieldset className="settings-subsection">
        <legend>音频转码运行时</legend>
        <p className="settings-placeholder">
          设置 ffmpeg/ffprobe 目录后可刷新预设可用性（编码器/封装器）。
        </p>
        <div className="settings-runtime-grid">
          <span>ffmpeg 可用</span>
          <code>
            {String(
              params.audioTranscodeCapabilities?.ffmpeg_available ?? false,
            )}
          </code>
          <span>ffprobe 可用</span>
          <code>
            {String(
              params.audioTranscodeCapabilities?.ffprobe_available ?? false,
            )}
          </code>
          <span>库根目录</span>
          <code>
            {params.audioTranscodeCapabilities?.library_root_dir ?? "-"}
          </code>
          <span>默认输出目录</span>
          <code>
            {params.audioTranscodeCapabilities?.default_output_dir ?? "-"}
          </code>
          <span>最后检查时间</span>
          <code>
            {resolveDateTimeOrDash(
              params.audioTranscodeCapabilities?.checked_at_ms ?? null,
            )}
          </code>
        </div>
        <label>
          MPX_FFMPEG_BIN / MPX_FFPROBE_BIN 目录
          <input
            type="text"
            value={params.ffmpegBinDirectoryDraft}
            placeholder="例如：C:\\Tools\\ffmpeg\\bin"
            disabled={params.ffmpegBinVerifyPending}
            onChange={(event) =>
              params.onFfmpegBinDirectoryDraftChange(event.target.value)
            }
          />
        </label>
        <div className="settings-runtime-actions">
          <button
            type="button"
            disabled={params.ffmpegBinVerifyPending}
            onClick={params.onPickFfmpegBinDirectory}
          >
            选择目录
          </button>
          <button
            type="button"
            disabled={params.ffmpegBinVerifyPending}
            onClick={params.onVerifyFfmpegBinDirectory}
          >
            {params.ffmpegBinVerifyPending
              ? "验证中..."
              : "验证 MPX_FFMPEG_BIN"}
          </button>
          <button
            className="settings-icon-btn main-icon-square-btn"
            type="button"
            disabled={params.audioTranscodeCapabilitiesLoading}
            aria-label="刷新音频转码能力"
            data-tooltip-label="刷新音频转码能力"
            onClick={params.onRefreshAudioTranscodeCapabilities}
          >
            <MainUiIcon name="refresh" />
          </button>
        </div>
        {params.ffmpegBinVerifyMessage ? (
          <p className="settings-placeholder">
            {params.ffmpegBinVerifyMessage}
          </p>
        ) : null}
        {params.audioTranscodeCapabilitiesLoading ? (
          <p className="settings-placeholder">正在读取音频转码能力...</p>
        ) : null}
        {params.audioTranscodeCapabilitiesError ? (
          <p className="settings-danger-text">
            {params.audioTranscodeCapabilitiesError}
          </p>
        ) : null}
        {params.audioTranscodeCapabilities ? (
          <div className="settings-runtime-grid">
            {Object.entries(params.audioTranscodeCapabilities.presets).flatMap(
              ([presetKey, capability]) => [
                <span key={`${presetKey}:label`}>
                  {
                    AUDIO_TRANSCODE_PRESET_LABELS[
                      presetKey as keyof ReadAudioTranscodeCapabilitiesResponseDto["presets"]
                    ]
                  }
                </span>,
                <code key={`${presetKey}:value`}>
                  {resolvePresetCapabilityLabel(
                    presetKey as keyof ReadAudioTranscodeCapabilitiesResponseDto["presets"],
                    capability,
                  )}
                </code>,
              ],
            )}
          </div>
        ) : null}
      </fieldset>
    </div>
  );
}
