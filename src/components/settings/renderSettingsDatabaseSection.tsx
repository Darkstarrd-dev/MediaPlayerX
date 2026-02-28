import type { JSX } from "react";

import type { RenderSettingsMainSectionParams } from "./renderSettingsMainSection.types";

interface RenderSettingsDatabaseSectionParams {
  params: RenderSettingsMainSectionParams;
  settingsTip: (key: string) => string;
}

export function renderSettingsDatabaseSection({
  params,
  settingsTip,
}: RenderSettingsDatabaseSectionParams): JSX.Element {
  const {
    t,
    runtimeInfo,
    databaseResetPending,
    databaseResetError,
    runtimePathUpdatePending,
    runtimePathUpdateMessage,
    proxyServer,
    ehentaiAuthState,
    ehentaiAuthConnected,
    ehentaiAuthMessage,
    ehentaiAuthChecking,
    ehentaiAuthConnectPending,
    ehentaiAuthDisconnectPending,
    onClearDatabase,
    onPickDatabaseDirectoryPath,
    onPickThumbnailCacheDirectoryPath,
    onProxyServerChange,
    onRefreshEhentaiAuthStatus,
    onConnectEhentaiAuth,
    onDisconnectEhentaiAuth,
  } = params;

  const databasePath = runtimeInfo?.database_path ?? "";
  const thumbnailCachePath = runtimeInfo?.thumbnail_cache_path ?? "";

  return (
    <div className="settings-block">
      <p className="settings-placeholder">{t("ui.settings.databaseResetHint")}</p>
      <label data-tooltip-label={settingsTip("databaseReset")}>
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
        <p className="settings-placeholder">{t("ui.settings.databaseDirectoryHint")}</p>
        <p className="settings-placeholder">
          {t("ui.settings.databaseDirectoryMigrationHint")}
        </p>
        <label data-tooltip-label={settingsTip("sqlDatabasePath")}>
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
        <label data-tooltip-label={settingsTip("thumbnailCacheDirectory")}>
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
        <p className="settings-placeholder">{t("ui.settings.networkProxyHint")}</p>
        <label data-tooltip-label={settingsTip("proxyServer")}>
          {t("ui.settings.proxyServerLabel")}
          <input
            type="text"
            value={proxyServer}
            placeholder={t("ui.settings.proxyServerPlaceholder")}
            onChange={(event) => onProxyServerChange(event.target.value)}
          />
        </label>
      </fieldset>

      <fieldset className="settings-subsection">
        <legend>{t("ui.settings.ehentaiAuthLegend")}</legend>
        <p className="settings-placeholder">{t("ui.settings.ehentaiAuthHint")}</p>
        <p
          className={`settings-test-status ${
            ehentaiAuthConnected
              ? "is-ok"
              : ehentaiAuthState === "error"
                ? ""
                : "is-pending"
          }`}
        >
          {ehentaiAuthChecking
            ? t("ui.settings.ehentaiAuthChecking")
            : ehentaiAuthMessage ??
              (ehentaiAuthConnected
                ? t("ui.settings.ehentaiAuthConnected")
                : t("ui.settings.ehentaiAuthDisconnected"))}
        </p>
        <div className="settings-runtime-actions">
          <button
            type="button"
            disabled={ehentaiAuthConnectPending}
            onClick={onConnectEhentaiAuth}
          >
            {ehentaiAuthConnectPending
              ? t("ui.settings.ehentaiAuthConnecting")
              : t("ui.settings.ehentaiAuthConnectAction")}
          </button>
          <button
            type="button"
            disabled={ehentaiAuthDisconnectPending}
            onClick={onDisconnectEhentaiAuth}
          >
            {ehentaiAuthDisconnectPending
              ? t("ui.settings.ehentaiAuthDisconnecting")
              : t("ui.settings.ehentaiAuthDisconnectAction")}
          </button>
          <button type="button" disabled={ehentaiAuthChecking} onClick={onRefreshEhentaiAuthStatus}>
            {ehentaiAuthChecking
              ? t("ui.settings.ehentaiAuthChecking")
              : t("ui.settings.ehentaiAuthRefreshAction")}
          </button>
        </div>
      </fieldset>
    </div>
  );
}
