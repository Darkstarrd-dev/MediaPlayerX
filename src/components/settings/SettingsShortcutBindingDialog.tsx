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
      className="settings-floating-mask mpx-dialog-mask"
      data-slot="fg-header-g1-settings-shortcut-edit-ovl"
      role="dialog"
      aria-modal="true"
      aria-label={t(a11yRegistry.settingsShortcutEditDialog.labelKey)}
    >
      <section
        className="settings-floating-panel mpx-dialog-panel mpx-btn-scope-panel-small"
        data-slot="fg-header-g1-settings-shortcut-edit-panel"
      >
        <h3>{bindingTarget.label}</h3>
        {currentCombos.length > 0 ? (
          <ul className="mpx-overlay-chip-list">
            {currentCombos.map((combo) => (
              <li key={combo} className="mpx-overlay-chip">
                {combo}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mpx-overlay-caption">
            {t("ui.settings.shortcutNoneConfigured")}
          </p>
        )}
        <div
          className="mpx-overlay-actions mpx-btn-group mpx-btn-group--panel-small-actions"
          data-slot="fg-panel-small-btn-group-actions"
        >
          <button
            className="mpx-btn"
            type="button"
            data-capture-ignore="true"
            onClick={onStartCapture}
          >
            {t("ui.common.add")}
          </button>
          <button
            className="mpx-btn"
            type="button"
            data-capture-ignore="true"
            onClick={onClearBinding}
          >
            {t("ui.common.clear")}
          </button>
          <button
            className="mpx-btn"
            type="button"
            data-capture-ignore="true"
            onClick={onClose}
          >
            {t("ui.common.close")}
          </button>
        </div>
      </section>
    </div>
  );
}
