interface SidebarRenameDialogProps {
  open: boolean
  pending?: boolean
  inputLabel: string
  inputPlaceholder: string
  confirmLabel: string
  cancelLabel: string
  value: string
  errorMessage?: string | null
  onChange: (value: string) => void
  onConfirm: () => void
  onCancel: () => void
}

function SidebarRenameDialog({
  open,
  pending = false,
  inputLabel,
  inputPlaceholder,
  confirmLabel,
  cancelLabel,
  value,
  errorMessage = null,
  onChange,
  onConfirm,
  onCancel,
}: SidebarRenameDialogProps) {
  const confirmDisabled = pending || value.trim().length === 0

  if (!open) {
    return null
  }

  return (
    <div className="settings-floating-mask" data-slot="fg-sidebar-shortcut-rename-panel" role="dialog" aria-modal="true" aria-label={inputLabel} data-overlay-close="sidebar-rename-dialog">
      <section className="settings-floating-panel manage-group-dialog sidebar-rename-dialog" role="document">
        <h3 className="sidebar-rename-title">{inputLabel}</h3>
        <input
          className="manage-group-name-input"
          aria-label={inputLabel}
          type="text"
          value={value}
          placeholder={inputPlaceholder}
          disabled={pending}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              if (!confirmDisabled) {
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
        {errorMessage ? <p className="sidebar-rename-error">{errorMessage}</p> : null}
        <div className="settings-floating-actions manage-group-actions">
          <button className="feature-action-btn main-icon-square-btn" type="button" disabled={confirmDisabled} onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button className="feature-action-btn main-icon-square-btn" type="button" disabled={pending} onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </section>
    </div>
  )
}

export default SidebarRenameDialog
