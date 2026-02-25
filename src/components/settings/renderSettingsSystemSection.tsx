import type { JSX } from "react";

import { MainUiIcon } from "../MainUiIcon";
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
