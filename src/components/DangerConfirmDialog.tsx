import { useEffect, useState } from 'react'

export interface DangerConfirmDialogProps {
  open: boolean
  title: string
  description: string
  targetListTitle?: string
  targetPaths?: string[]
  acknowledgeLabel: string
  confirmLabel: string
  removeOnlyLabel?: string
  removeOnlyEnabled?: boolean
  cancelLabel: string
  pending?: boolean
  onRemoveOnly?: () => void
  onConfirm: () => void
  onCancel: () => void
}

function DangerConfirmDialog({
  open,
  title,
  description,
  targetListTitle,
  targetPaths = [],
  acknowledgeLabel,
  confirmLabel,
  removeOnlyLabel,
  removeOnlyEnabled = false,
  cancelLabel,
  pending = false,
  onRemoveOnly,
  onConfirm,
  onCancel,
}: DangerConfirmDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false)

  useEffect(() => {
    if (!open) {
      setAcknowledged(false)
    }
  }, [open])

  if (!open) {
    return null
  }

  return (
    <div className="settings-floating-mask" data-slot="fg-main-toolbar-manage-delete-confirm-panel" role="dialog" aria-modal="true" aria-label={title} data-overlay-close="delete-confirm">
      <section className="settings-floating-panel manage-confirm-dialog">
        <h3>{title}</h3>
        <p className="manage-confirm-description">{description}</p>

        {targetPaths.length > 0 ? (
          <section className="manage-confirm-targets" aria-label={targetListTitle}>
            <p className="manage-confirm-targets-title">{targetListTitle}</p>
            <ul className="manage-confirm-targets-list mpx-scrollbar-hidden">
              {targetPaths.map((path) => (
                <li key={path} data-tooltip-label={path}>{path}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <label className="manage-confirm-ack">
          <input
            checked={acknowledged}
            type="checkbox"
            disabled={pending}
            onChange={(event) => setAcknowledged(event.target.checked)}
          />
          <span>{acknowledgeLabel}</span>
        </label>

        <div className="settings-floating-actions">
          {onRemoveOnly && removeOnlyLabel ? (
            <button type="button" disabled={!removeOnlyEnabled || pending} onClick={onRemoveOnly}>
              {removeOnlyLabel}
            </button>
          ) : null}
          <button type="button" disabled={!acknowledged || pending} onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button type="button" disabled={pending} onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </section>
    </div>
  )
}

export default DangerConfirmDialog
