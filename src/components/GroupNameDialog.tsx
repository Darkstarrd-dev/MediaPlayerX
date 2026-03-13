import { useMemo } from "react";

interface GroupNameDialogProps {
  open: boolean;
  pending?: boolean;
  inputLabel: string;
  inputPlaceholder: string;
  value: string;
  groupLabel: string;
  moveLabel: string;
  cancelLabel: string;
  onChange: (value: string) => void;
  onMove: () => void;
  onCancel: () => void;
  onGroup: () => void;
}

function GroupNameDialog({
  open,
  pending = false,
  inputLabel,
  inputPlaceholder,
  value,
  groupLabel,
  moveLabel,
  cancelLabel,
  onChange,
  onMove,
  onCancel,
  onGroup,
}: GroupNameDialogProps) {
  const disabledGroup = useMemo(
    () => pending || value.trim().length === 0,
    [pending, value],
  );
  const dialogWidthCh = useMemo(() => {
    const contentLength = Math.max(value.length, inputPlaceholder.length, 18);
    const clamped = Math.min(64, Math.max(24, contentLength + 4));
    return `${clamped}ch`;
  }, [inputPlaceholder.length, value.length]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="settings-floating-mask mpx-dialog-mask"
      data-slot="fg-main-header-manage-group-name-ovl"
      role="dialog"
      aria-modal="true"
      aria-label={inputLabel}
      data-overlay-close="group-name-dialog"
    >
      <section
        className="settings-floating-panel mpx-dialog-panel manage-group-dialog mpx-btn-scope-panel-small"
        data-slot="fg-main-header-manage-group-name-panel"
        role="document"
        style={{ width: `min(92vw, max(270px, ${dialogWidthCh}))` }}
      >
        <input
          id="manage-group-name-input"
          className="mpx-overlay-input mpx-overlay-input-compact"
          aria-label={inputLabel}
          type="text"
          value={value}
          placeholder={inputPlaceholder}
          disabled={pending}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (!disabledGroup) {
                onGroup();
              }
              return;
            }
            if (event.key === "Escape") {
              event.preventDefault();
              onCancel();
            }
          }}
          autoFocus
        />
        <div
          className="mpx-overlay-actions mpx-overlay-actions-start mpx-btn-group mpx-btn-group--panel-small-actions"
          data-slot="fg-panel-small-btn-group-actions"
        >
          <button
            className="mpx-btn feature-action-btn main-icon-square-btn"
            type="button"
            onClick={onGroup}
            disabled={disabledGroup}
          >
            {groupLabel}
          </button>
          <button
            className="mpx-btn feature-action-btn main-icon-square-btn"
            type="button"
            onClick={onMove}
            disabled={pending}
          >
            {moveLabel}
          </button>
          <button
            className="mpx-btn feature-action-btn main-icon-square-btn"
            type="button"
            onClick={onCancel}
            disabled={pending}
          >
            {cancelLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export default GroupNameDialog;
