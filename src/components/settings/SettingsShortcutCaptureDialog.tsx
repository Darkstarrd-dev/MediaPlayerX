import type { JSX } from "react";

import { a11yRegistry } from "../../i18n/ariaRegistry";

interface SettingsShortcutCaptureDialogProps {
  t: (key: string) => string;
  capturedCombo: string;
  mouseCapturePresets: Array<{ labelKey: string; combo: string }>;
  onPickPreset: (combo: string) => void;
  onConfirmAdd: () => void;
  onCancel: () => void;
}

export function SettingsShortcutCaptureDialog({
  t,
  capturedCombo,
  mouseCapturePresets,
  onPickPreset,
  onConfirmAdd,
  onCancel,
}: SettingsShortcutCaptureDialogProps): JSX.Element {
  return (
    <div
      className="settings-floating-mask"
      data-slot="fg-header-g1-settings-shortcut-capture-panel"
      role="dialog"
      aria-modal="true"
      aria-label={t(a11yRegistry.settingsShortcutCaptureDialog.labelKey)}
    >
      <section className="settings-floating-panel">
        <h3>{t("ui.settings.shortcutCaptureTitle")}</h3>
        <p className="settings-placeholder">{t("ui.settings.shortcutCaptureHint")}</p>
        <p className="binding-capture-preview">
          {capturedCombo || t("ui.settings.shortcutCaptureWaiting")}
        </p>
        <div className="binding-mouse-presets" data-capture-ignore="true">
          <span>{t("ui.settings.shortcutMousePresets")}</span>
          <div className="binding-mouse-preset-list">
            {mouseCapturePresets.map((preset) => (
              <button
                key={preset.combo}
                type="button"
                data-capture-ignore="true"
                onClick={() => onPickPreset(preset.combo)}
              >
                {t(preset.labelKey)}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-floating-actions">
          <button
            type="button"
            data-capture-ignore="true"
            disabled={!capturedCombo}
            onClick={onConfirmAdd}
          >
            {t("ui.settings.shortcutConfirmAdd")}
          </button>
          <button type="button" data-capture-ignore="true" onClick={onCancel}>
            {t("ui.common.cancel")}
          </button>
        </div>
      </section>
    </div>
  );
}
