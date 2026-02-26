import type { JSX } from "react";

import type { RenderSettingsMainSectionParams } from "./renderSettingsMainSection.types";

interface RenderSettingsDebugSectionParams {
  params: RenderSettingsMainSectionParams;
}

export function renderSettingsDebugSection({
  params,
}: RenderSettingsDebugSectionParams): JSX.Element {
  const {
    t,
    adReviewDeleteOverlayDebugActive,
    headerDebugGroupVisible,
    tooltipEnabled,
    electronNativeChromeEnabled,
    themeParameterButtonVisible,
    onOpenAdReviewDeleteOverlayDebug,
    onHeaderDebugGroupVisibleChange,
    onTooltipEnabledChange,
    onElectronNativeChromeEnabledChange,
    onThemeParameterButtonVisibleChange,
  } = params;

  return (
    <div className="settings-block">
      <section className="settings-group">
        <header className="settings-group-head">
          <span>{t("ui.settings.debugOverlaySection")}</span>
        </header>
        <div className="settings-debug-toggle-row">
          <button
            type="button"
            className={`settings-debug-toggle-btn ${adReviewDeleteOverlayDebugActive ? "is-on" : ""}`}
            onClick={onOpenAdReviewDeleteOverlayDebug}
          >
            {`${t("ui.settings.debugOpenDeleteOverlay")} · ${adReviewDeleteOverlayDebugActive ? t("ui.settings.toggleOn") : t("ui.settings.toggleOff")}`}
          </button>
        </div>
      </section>

      <section className="settings-group">
        <header className="settings-group-head">
          <span>{t("ui.settings.debugSection")}</span>
        </header>
        <div className="settings-debug-toggle-row">
          <button
            type="button"
            className={`settings-debug-toggle-btn ${headerDebugGroupVisible ? "is-on" : ""}`}
            onClick={() => onHeaderDebugGroupVisibleChange(!headerDebugGroupVisible)}
          >
            {`${t("ui.settings.debugHeaderGroup")} · ${headerDebugGroupVisible ? t("ui.settings.toggleOn") : t("ui.settings.toggleOff")}`}
          </button>
          <button
            type="button"
            className={`settings-debug-toggle-btn ${tooltipEnabled ? "is-on" : ""}`}
            onClick={() => onTooltipEnabledChange(!tooltipEnabled)}
          >
            {`${t("ui.settings.debugTooltips")} · ${tooltipEnabled ? t("ui.settings.toggleOn") : t("ui.settings.toggleOff")}`}
          </button>
          <button
            type="button"
            className={`settings-debug-toggle-btn ${electronNativeChromeEnabled ? "is-on" : ""}`}
            onClick={() =>
              onElectronNativeChromeEnabledChange(!electronNativeChromeEnabled)
            }
          >
            {`${t("ui.settings.debugNativeChrome")} · ${electronNativeChromeEnabled ? t("ui.settings.toggleOn") : t("ui.settings.toggleOff")}`}
          </button>
          <button
            type="button"
            className={`settings-debug-toggle-btn ${themeParameterButtonVisible ? "is-on" : ""}`}
            onClick={() =>
              onThemeParameterButtonVisibleChange(!themeParameterButtonVisible)
            }
          >
            {`${t("ui.settings.showThemeParameterButton")} · ${themeParameterButtonVisible ? t("ui.settings.toggleOn") : t("ui.settings.toggleOff")}`}
          </button>
        </div>
      </section>
    </div>
  );
}
