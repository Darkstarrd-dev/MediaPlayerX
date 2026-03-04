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
      className="settings-floating-mask mpx-dialog-mask"
      data-slot="fg-header-g1-settings-shortcut-capture-ovl"
      role="dialog"
      aria-modal="true"
      aria-label={t(a11yRegistry.settingsShortcutCaptureDialog.labelKey)}
    >
      <section
        className="settings-floating-panel mpx-dialog-panel"
        data-slot="fg-header-g1-settings-shortcut-capture-panel"
      >
        <h3>{t("ui.settings.shortcutCaptureTitle")}</h3>
        <p className="mpx-overlay-caption">
          {t("ui.settings.shortcutCaptureHint")}
        </p>
        <p className="mpx-overlay-content-surface mpx-overlay-mono-preview">
          {capturedCombo || t("ui.settings.shortcutCaptureWaiting")}
        </p>
        <div
          className="mpx-overlay-content-surface mpx-overlay-padded-stack"
          data-capture-ignore="true"
        >
          <span className="mpx-overlay-caption">
            {t("ui.settings.shortcutMousePresets")}
          </span>
          <div className="mpx-overlay-chip-list">
            {mouseCapturePresets.map((preset) => (
              <button
                key={preset.combo}
                className="mpx-overlay-chip-btn"
                type="button"
                data-capture-ignore="true"
                onClick={() => onPickPreset(preset.combo)}
              >
                {t(preset.labelKey)}
              </button>
            ))}
          </div>
        </div>
        <div className="mpx-overlay-actions">
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
