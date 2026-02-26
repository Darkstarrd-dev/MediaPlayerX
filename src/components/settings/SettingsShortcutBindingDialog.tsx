import type { JSX } from "react";

import { a11yRegistry } from "../../i18n/ariaRegistry";

interface SettingsShortcutBindingDialogProps {
  t: (key: string) => string;
  bindingTarget: { action: string; label: string };
  currentCombos: string[];
  onStartCapture: () => void;
  onClearBinding: () => void;
  onClose: () => void;
}

export function SettingsShortcutBindingDialog({
  t,
  bindingTarget,
  currentCombos,
  onStartCapture,
  onClearBinding,
  onClose,
}: SettingsShortcutBindingDialogProps): JSX.Element {
  return (
    <div
      className="settings-floating-mask"
      data-slot="fg-header-g1-settings-shortcut-edit-panel"
      role="dialog"
      aria-modal="true"
      aria-label={t(a11yRegistry.settingsShortcutEditDialog.labelKey)}
    >
      <section className="settings-floating-panel">
        <h3>{bindingTarget.label}</h3>
        {currentCombos.length > 0 ? (
          <ul className="binding-chip-list">
            {currentCombos.map((combo) => (
              <li key={combo}>{combo}</li>
            ))}
          </ul>
        ) : (
          <p className="settings-placeholder">{t("ui.settings.shortcutNoneConfigured")}</p>
        )}
        <div className="settings-floating-actions">
          <button type="button" data-capture-ignore="true" onClick={onStartCapture}>
            {t("ui.common.add")}
          </button>
          <button type="button" data-capture-ignore="true" onClick={onClearBinding}>
            {t("ui.common.clear")}
          </button>
          <button type="button" data-capture-ignore="true" onClick={onClose}>
            {t("ui.common.close")}
          </button>
        </div>
      </section>
    </div>
  );
}
