import { useEffect, useState } from 'react'

interface DangerConfirmDialogProps {
  open: boolean
  title: string
  description: string
  acknowledgeLabel: string
  confirmLabel: string
  cancelLabel: string
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

function DangerConfirmDialog({
  open,
  title,
  description,
  acknowledgeLabel,
  confirmLabel,
  cancelLabel,
  pending = false,
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
    <div className="settings-floating-mask" role="dialog" aria-modal="true" aria-label={title}>
      <section className="settings-floating-panel manage-confirm-dialog">
        <h3>{title}</h3>
        <p className="manage-confirm-description">{description}</p>

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
