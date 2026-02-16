import { useMemo } from 'react'

interface GroupNameDialogProps {
  open: boolean
  pending?: boolean
  title: string
  inputLabel: string
  inputPlaceholder: string
  value: string
  cancelLabel: string
  confirmLabel: string
  onChange: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
}

function GroupNameDialog({
  open,
  pending = false,
  title,
  inputLabel,
  inputPlaceholder,
  value,
  cancelLabel,
  confirmLabel,
  onChange,
  onCancel,
  onConfirm,
}: GroupNameDialogProps) {
  const disabledConfirm = useMemo(() => pending || value.trim().length === 0, [pending, value])

  if (!open) {
    return null
  }

  return (
    <div className="settings-floating-mask" role="dialog" aria-modal="true" aria-label={title} data-overlay-close="group-name-dialog">
      <section className="settings-floating-panel manage-group-dialog" role="document">
        <h3>{title}</h3>
        <label className="settings-field" htmlFor="manage-group-name-input">
          <span>{inputLabel}</span>
          <input
            id="manage-group-name-input"
            type="text"
            value={value}
            placeholder={inputPlaceholder}
            disabled={pending}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                if (!disabledConfirm) {
                  onConfirm()
                }
                return
              }
              if (event.key === 'Escape') {
                event.preventDefault()
                onCancel()
              }
            }}
            autoFocus
          />
        </label>
        <div className="settings-floating-actions">
          <button type="button" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={disabledConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}

export default GroupNameDialog
