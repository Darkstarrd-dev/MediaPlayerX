import type { JSX } from "react";

import { MainUiIcon } from "../MainUiIcon";
import type { RenderSettingsMainSectionParams } from "./renderSettingsMainSection.types";

interface RenderSettingsShortcutsSectionParams {
  params: RenderSettingsMainSectionParams;
}

export function renderSettingsShortcutsSection({
  params,
}: RenderSettingsShortcutsSectionParams): JSX.Element {
  const {
    t,
    renderBindingRows,
    shortcutConflicts,
    shortcutLabelByAction,
    onResetShortcuts,
  } = params;

  return (
    <div className="settings-block settings-shortcuts">
      <div className="settings-shortcuts-head">
        <strong>{t("ui.settings.shortcutsTitle")}</strong>
        <button
          className="settings-icon-btn main-icon-square-btn"
          type="button"
          aria-label={t("a11y.common.restoreDefault")}
          data-tooltip-label={t("tip.common.restoreDefault")}
          onClick={onResetShortcuts}
        >
          <MainUiIcon name="return" />
        </button>
      </div>

      {renderBindingRows()}

      <div className="shortcut-conflicts">
        <strong>{t("ui.settings.shortcutConflictsTitle")}</strong>
        {shortcutConflicts.length === 0 ? (
          <p>{t("ui.settings.shortcutConflictsNone")}</p>
        ) : (
          <ul>
            {shortcutConflicts.map((conflict) => (
              <li key={`${conflict.scope}-${conflict.combo}`}>
                {t("ui.settings.shortcutConflictLine", {
                  scope: conflict.scope,
                  combo: conflict.combo,
                  actions: conflict.actions
                    .map((action) => shortcutLabelByAction.get(action) ?? action)
                    .join(", "),
                })}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
