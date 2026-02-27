import type { JSX } from "react";

import { MainUiIcon } from "../MainUiIcon";
import type {
  AudioEngineModeDto,
  AudioGaplessModeDto,
  AudioReplayGainModeDto,
} from "../../contracts/backend";
import type { RenderSettingsMainSectionParams } from "./renderSettingsMainSection.types";

interface RenderSettingsSystemSectionParams {
  t: RenderSettingsMainSectionParams["t"];
  repositoryMode: RenderSettingsMainSectionParams["repositoryMode"];
  backendBridgeInjected: RenderSettingsMainSectionParams["backendBridgeInjected"];
  runtimeInfoLoading: RenderSettingsMainSectionParams["runtimeInfoLoading"];
  runtimeInfoError: RenderSettingsMainSectionParams["runtimeInfoError"];
  runtimeInfo: RenderSettingsMainSectionParams["runtimeInfo"];
  mediaCapabilitiesLoading: RenderSettingsMainSectionParams["mediaCapabilitiesLoading"];
  mediaCapabilitiesError: RenderSettingsMainSectionParams["mediaCapabilitiesError"];
  mediaCapabilities: RenderSettingsMainSectionParams["mediaCapabilities"];
  preferenceDebugLoading: RenderSettingsMainSectionParams["preferenceDebugLoading"];
  preferenceDebugError: RenderSettingsMainSectionParams["preferenceDebugError"];
  preferenceDebugData: RenderSettingsMainSectionParams["preferenceDebugData"];
  onRefreshRuntimeInfo: RenderSettingsMainSectionParams["onRefreshRuntimeInfo"];
  onRefreshPreferenceDebug: RenderSettingsMainSectionParams["onRefreshPreferenceDebug"];
  audioEngineLoading: RenderSettingsMainSectionParams["audioEngineLoading"];
  audioEngineUpdating: RenderSettingsMainSectionParams["audioEngineUpdating"];
  audioEngineError: RenderSettingsMainSectionParams["audioEngineError"];
  audioEngineMode: RenderSettingsMainSectionParams["audioEngineMode"];
  audioEngineDesiredMode: RenderSettingsMainSectionParams["audioEngineDesiredMode"];
  audioEngineUsingFallback: RenderSettingsMainSectionParams["audioEngineUsingFallback"];
  audioEngineMpvAvailable: RenderSettingsMainSectionParams["audioEngineMpvAvailable"];
  audioEngineMpvBinPath: RenderSettingsMainSectionParams["audioEngineMpvBinPath"];
  audioEngineActiveDeviceId: RenderSettingsMainSectionParams["audioEngineActiveDeviceId"];
  audioEngineExclusiveEnabled: RenderSettingsMainSectionParams["audioEngineExclusiveEnabled"];
  audioEngineGaplessMode: RenderSettingsMainSectionParams["audioEngineGaplessMode"];
  audioEngineReplayGainMode: RenderSettingsMainSectionParams["audioEngineReplayGainMode"];
  audioOutputDevicesLoading: RenderSettingsMainSectionParams["audioOutputDevicesLoading"];
  audioOutputDevices: RenderSettingsMainSectionParams["audioOutputDevices"];
  onRefreshAudioEngineState: RenderSettingsMainSectionParams["onRefreshAudioEngineState"];
  onRefreshAudioOutputDevices: RenderSettingsMainSectionParams["onRefreshAudioOutputDevices"];
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

function formatDateTimeOrDash(timestamp: number | null): string {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp) || timestamp <= 0) {
    return "-";
  }
  return new Date(timestamp).toLocaleString();
}

export function renderSettingsSystemSection(
  params: RenderSettingsSystemSectionParams,
): JSX.Element {
  const rendererIsProd = import.meta.env.PROD;
  const bridgeMissingInProduction =
    rendererIsProd &&
    params.repositoryMode === "real" &&
    !params.backendBridgeInjected;
  const gpuFeatureRows = params.runtimeInfo?.gpu_feature_status
    ? Object.entries(params.runtimeInfo.gpu_feature_status).sort(
        ([left], [right]) => left.localeCompare(right),
      )
    : [];
  const gpuInfoJson = params.runtimeInfo?.gpu_info_basic
    ? JSON.stringify(params.runtimeInfo.gpu_info_basic, null, 2)
    : null;

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
          <code>{resolveReplayGainLabel(params.audioEngineReplayGainMode)}</code>
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
            disabled={params.audioOutputDevicesLoading || params.audioEngineUpdating}
            aria-label="刷新输出设备列表"
            data-tooltip-label="刷新输出设备列表"
            onClick={params.onRefreshAudioOutputDevices}
          >
            <MainUiIcon name="refresh" />
          </button>
        </div>
        <label>
          音频模式
          <select
            value={params.audioEngineDesiredMode}
            disabled={params.audioEngineUpdating || !params.audioEngineMpvAvailable}
            onChange={(event) =>
              params.onAudioEngineModeChange(event.target.value as AudioEngineModeDto)
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
            disabled={params.audioEngineUpdating || params.audioEngineDesiredMode !== "mpv"}
            onChange={(event) => params.onAudioExclusiveChange(event.target.checked)}
          />
          <span>独占输出 (WASAPI Exclusive)</span>
        </label>
        <label>
          Gapless
          <select
            value={params.audioEngineGaplessMode}
            disabled={params.audioEngineUpdating || params.audioEngineDesiredMode !== "mpv"}
            onChange={(event) =>
              params.onAudioGaplessModeChange(event.target.value as AudioGaplessModeDto)
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
            disabled={params.audioEngineUpdating || params.audioEngineDesiredMode !== "mpv"}
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
      </fieldset>

      <fieldset className="settings-subsection">
        <legend>{params.t("ui.settings.runtimeDiagnosticsLegend")}</legend>
        <p className="settings-placeholder">
          {params.t("ui.settings.runtimeDiagnosticsHint")}
        </p>
        <div className="settings-runtime-grid">
          <span>{params.t("ui.settings.rendererProd")}</span>
          <code>{rendererIsProd ? "true" : "false"}</code>
          <span>{params.t("ui.settings.repositoryMode")}</span>
          <code>{params.repositoryMode}</code>
          <span>{params.t("ui.settings.backendBridge")}</span>
          <code>{params.backendBridgeInjected ? "true" : "false"}</code>
          <span>{params.t("ui.settings.appVersion")}</span>
          <code>{params.runtimeInfo?.app_version ?? "-"}</code>
          <span>{params.t("ui.settings.mainIsPackaged")}</span>
          <code>
            {typeof params.runtimeInfo?.is_packaged === "boolean"
              ? String(params.runtimeInfo.is_packaged)
              : "-"}
          </code>
          <span>{params.t("ui.settings.platformArch")}</span>
          <code>
            {params.runtimeInfo
              ? `${params.runtimeInfo.platform}/${params.runtimeInfo.arch}`
              : "-"}
          </code>
          <span>{params.t("ui.settings.userDataPath")}</span>
          <code>{params.runtimeInfo?.user_data_path ?? "-"}</code>
          <span>{params.t("ui.settings.libraryRoot")}</span>
          <code>{params.runtimeInfo?.library_root ?? "-"}</code>
          <span>{params.t("ui.settings.databasePath")}</span>
          <code>{params.runtimeInfo?.database_path ?? "-"}</code>
        </div>
        <div className="settings-runtime-actions">
          <button
            className="settings-icon-btn main-icon-square-btn"
            type="button"
            disabled={params.runtimeInfoLoading}
            aria-label={
              params.runtimeInfoLoading
                ? params.t("a11y.settings.loadingDiagnostics")
                : params.t("a11y.settings.refreshDiagnostics")
            }
            data-tooltip-label={
              params.runtimeInfoLoading
                ? params.t("a11y.settings.loadingDiagnostics")
                : params.t("a11y.settings.refreshDiagnostics")
            }
            onClick={params.onRefreshRuntimeInfo}
          >
            <MainUiIcon name="refresh" />
          </button>
        </div>
        {params.runtimeInfoError ? (
          <p className="settings-danger-text">{params.runtimeInfoError}</p>
        ) : null}
        {bridgeMissingInProduction ? (
          <p className="settings-danger-text">
            {params.t("ui.settings.bridgeMissingWarning")}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="settings-subsection">
        <legend>{params.t("ui.settings.gpuDiagnosticsLegend")}</legend>
        <div className="settings-runtime-grid">
          <span>{params.t("ui.settings.hardwareAccelerationEnabled")}</span>
          <code>
            {typeof params.runtimeInfo?.hardware_acceleration_enabled ===
            "boolean"
              ? String(params.runtimeInfo.hardware_acceleration_enabled)
              : "-"}
          </code>
        </div>
        {gpuFeatureRows.length > 0 ? (
          <div className="settings-runtime-grid">
            {gpuFeatureRows.flatMap(([key, value]) => [
              <span key={`${key}:label`}>{key}</span>,
              <code key={`${key}:value`}>{value}</code>,
            ])}
          </div>
        ) : (
          <p className="settings-placeholder">
            {params.t("ui.settings.gpuFeatureStatusEmpty")}
          </p>
        )}
        {gpuInfoJson ? (
          <pre className="settings-code-block">{gpuInfoJson}</pre>
        ) : (
          <p className="settings-placeholder">
            {params.t("ui.settings.gpuInfoEmpty")}
          </p>
        )}
      </fieldset>

      <fieldset className="settings-subsection">
        <legend>{params.t("ui.settings.mediaCapabilitiesLegend")}</legend>
        {params.mediaCapabilitiesLoading ? (
          <p className="settings-placeholder">
            {params.t("ui.settings.mediaCapabilitiesLoading")}
          </p>
        ) : null}
        {params.mediaCapabilitiesError ? (
          <p className="settings-danger-text">
            {params.mediaCapabilitiesError}
          </p>
        ) : null}
        {params.mediaCapabilities.length > 0 ? (
          <div className="settings-runtime-grid">
            {params.mediaCapabilities.flatMap((item) => [
              <span key={`${item.id}:label`}>{item.label}</span>,
              <code key={`${item.id}:value`}>
                {item.supported
                  ? params.t("ui.settings.mediaCapabilitySupported", {
                      supported: item.supported,
                      smooth: item.smooth,
                      powerEfficient: item.powerEfficient ?? "unknown",
                    })
                  : item.error
                    ? params.t(
                        "ui.settings.mediaCapabilityUnsupportedWithError",
                        {
                          error: item.error,
                        },
                      )
                    : params.t("ui.settings.mediaCapabilityUnsupported")}
              </code>,
            ])}
          </div>
        ) : null}
      </fieldset>

      <fieldset className="settings-subsection">
        <legend>{params.t("ui.settings.preferenceDebugLegend")}</legend>
        <p className="settings-placeholder">
          {params.t("ui.settings.preferenceDebugHint")}
        </p>
        <div className="settings-runtime-actions">
          <button
            className="settings-icon-btn main-icon-square-btn"
            type="button"
            disabled={params.preferenceDebugLoading}
            aria-label={
              params.preferenceDebugLoading
                ? params.t("a11y.settings.loadingDiagnostics")
                : params.t("a11y.settings.refreshDiagnostics")
            }
            data-tooltip-label={
              params.preferenceDebugLoading
                ? params.t("a11y.settings.loadingDiagnostics")
                : params.t("a11y.settings.refreshDiagnostics")
            }
            onClick={params.onRefreshPreferenceDebug}
          >
            <MainUiIcon name="refresh" />
          </button>
        </div>
        {params.preferenceDebugLoading ? (
          <p className="settings-placeholder">
            {params.t("ui.settings.preferenceDebugLoading")}
          </p>
        ) : null}
        {params.preferenceDebugError ? (
          <p className="settings-danger-text">{params.preferenceDebugError}</p>
        ) : null}
        {params.preferenceDebugData ? (
          <>
            <div className="settings-runtime-grid">
              <span>{params.t("ui.settings.preferenceDebugReason")}</span>
              <code>{params.preferenceDebugData.reason}</code>
              <span>{params.t("ui.settings.preferenceDebugUpdatedAt")}</span>
              <code>
                {formatDateTimeOrDash(params.preferenceDebugData.updatedAtMs)}
              </code>
              <span>
                {params.t("ui.settings.preferenceDebugImageAggregateCount")}
              </span>
              <code>{params.preferenceDebugData.imageAggregateCount}</code>
              <span>
                {params.t("ui.settings.preferenceDebugVideoAggregateCount")}
              </span>
              <code>{params.preferenceDebugData.videoAggregateCount}</code>
              <span>
                {params.t("ui.settings.preferenceDebugImageSessionCount")}
              </span>
              <code>{params.preferenceDebugData.imageSessionCount}</code>
              <span>
                {params.t("ui.settings.preferenceDebugVideoSessionCount")}
              </span>
              <code>{params.preferenceDebugData.videoSessionCount}</code>
            </div>

            <details>
              <summary>
                {params.t("ui.settings.preferenceDebugImageSessionsLatest")}
              </summary>
              <pre className="settings-code-block">
                {JSON.stringify(
                  params.preferenceDebugData.imageSessionPreview,
                  null,
                  2,
                )}
              </pre>
            </details>

            <details>
              <summary>
                {params.t("ui.settings.preferenceDebugVideoSessionsLatest")}
              </summary>
              <pre className="settings-code-block">
                {JSON.stringify(
                  params.preferenceDebugData.videoSessionPreview,
                  null,
                  2,
                )}
              </pre>
            </details>
          </>
        ) : (
          !params.preferenceDebugLoading &&
          !params.preferenceDebugError && (
            <p className="settings-placeholder">
              {params.t("ui.settings.preferenceDebugNoData")}
            </p>
          )
        )}
      </fieldset>
    </div>
  );
}
