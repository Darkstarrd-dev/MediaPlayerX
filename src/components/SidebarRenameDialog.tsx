interface SidebarRenameDialogProps {
  open: boolean
  pending?: boolean
  mode: 'single' | 'replace' | 'numbering' | 'remove-range' | 'metadata'
  targetCount: number
  inputLabel: string
  inputPlaceholder: string
  modeLabel: string
  modeOptionReplace: string
  modeOptionNumbering: string
  modeOptionRemoveRange: string
  modeOptionMetadata: string
  modeOptionSingle: string
  replaceFromPlaceholder: string
  replaceToPlaceholder: string
  numberBasePlaceholder: string
  numberStartPlaceholder: string
  numberStepPlaceholder: string
  numberPadWidthPlaceholder: string
  removeStartPlaceholder: string
  removeEndPlaceholder: string
  metadataTemplatePlaceholder: string
  previewLabel: string
  previewSummaryText: string | null
  confirmLabel: string
  cancelLabel: string
  value: string
  replaceFrom: string
  replaceTo: string
  numberBase: string
  numberStart: string
  numberStep: string
  numberPadWidth: string
  removeStart: string
  removeEnd: string
  metadataTemplate: string
  previewRows: Array<{ nodeId: string; sourceName: string; targetName: string; reason: string | null }>
  errorMessage?: string | null
  onChange: (value: string) => void
  onModeChange: (value: 'single' | 'replace' | 'numbering' | 'remove-range' | 'metadata') => void
  onReplaceFromChange: (value: string) => void
  onReplaceToChange: (value: string) => void
  onNumberBaseChange: (value: string) => void
  onNumberStartChange: (value: string) => void
  onNumberStepChange: (value: string) => void
  onNumberPadWidthChange: (value: string) => void
  onRemoveStartChange: (value: string) => void
  onRemoveEndChange: (value: string) => void
  onMetadataTemplateChange: (value: string) => void
  onRefreshPreview: () => void
  onConfirm: () => void
  onCancel: () => void
}

function SidebarRenameDialog({
  open,
  pending = false,
  mode,
  targetCount,
  inputLabel,
  inputPlaceholder,
  modeLabel,
  modeOptionReplace,
  modeOptionNumbering,
  modeOptionRemoveRange,
  modeOptionMetadata,
  modeOptionSingle,
  replaceFromPlaceholder,
  replaceToPlaceholder,
  numberBasePlaceholder,
  numberStartPlaceholder,
  numberStepPlaceholder,
  numberPadWidthPlaceholder,
  removeStartPlaceholder,
  removeEndPlaceholder,
  metadataTemplatePlaceholder,
  previewLabel,
  previewSummaryText,
  confirmLabel,
  cancelLabel,
  value,
  replaceFrom,
  replaceTo,
  numberBase,
  numberStart,
  numberStep,
  numberPadWidth,
  removeStart,
  removeEnd,
  metadataTemplate,
  previewRows,
  errorMessage = null,
  onChange,
  onModeChange,
  onReplaceFromChange,
  onReplaceToChange,
  onNumberBaseChange,
  onNumberStartChange,
  onNumberStepChange,
  onNumberPadWidthChange,
  onRemoveStartChange,
  onRemoveEndChange,
  onMetadataTemplateChange,
  onRefreshPreview,
  onConfirm,
  onCancel,
}: SidebarRenameDialogProps) {
  const batchModeActive = targetCount > 1 || mode !== 'single'
  const singleConfirmDisabled = pending || value.trim().length === 0

  if (!open) {
    return null
  }

  return (
    <div className="settings-floating-mask" data-slot="fg-sidebar-shortcut-rename-panel" role="dialog" aria-modal="true" aria-label={inputLabel} data-overlay-close="sidebar-rename-dialog">
      <section className="settings-floating-panel manage-group-dialog sidebar-rename-dialog" role="document">
        <h3 className="sidebar-rename-title">{inputLabel}</h3>
        {batchModeActive ? (
          <>
            <label className="sidebar-rename-mode-label">{modeLabel}</label>
            <select className="manage-group-name-input" value={mode} disabled={pending} onChange={(event) => onModeChange(event.target.value as SidebarRenameDialogProps['mode'])}>
              <option value="replace">{modeOptionReplace}</option>
              <option value="numbering">{modeOptionNumbering}</option>
              <option value="remove-range">{modeOptionRemoveRange}</option>
              <option value="metadata">{modeOptionMetadata}</option>
              {targetCount === 1 ? <option value="single">{modeOptionSingle}</option> : null}
            </select>

            {mode === 'replace' ? (
              <>
                <input className="manage-group-name-input" type="text" value={replaceFrom} placeholder={replaceFromPlaceholder} disabled={pending} onChange={(event) => onReplaceFromChange(event.target.value)} />
                <input className="manage-group-name-input" type="text" value={replaceTo} placeholder={replaceToPlaceholder} disabled={pending} onChange={(event) => onReplaceToChange(event.target.value)} />
              </>
            ) : null}

            {mode === 'numbering' ? (
              <>
                <input className="manage-group-name-input" type="text" value={numberBase} placeholder={numberBasePlaceholder} disabled={pending} onChange={(event) => onNumberBaseChange(event.target.value)} />
                <input className="manage-group-name-input" type="number" value={numberStart} placeholder={numberStartPlaceholder} disabled={pending} onChange={(event) => onNumberStartChange(event.target.value)} />
                <input className="manage-group-name-input" type="number" value={numberStep} placeholder={numberStepPlaceholder} disabled={pending} onChange={(event) => onNumberStepChange(event.target.value)} />
                <input className="manage-group-name-input" type="number" value={numberPadWidth} placeholder={numberPadWidthPlaceholder} disabled={pending} onChange={(event) => onNumberPadWidthChange(event.target.value)} />
              </>
            ) : null}

            {mode === 'remove-range' ? (
              <>
                <input className="manage-group-name-input" type="number" value={removeStart} placeholder={removeStartPlaceholder} disabled={pending} onChange={(event) => onRemoveStartChange(event.target.value)} />
                <input className="manage-group-name-input" type="number" value={removeEnd} placeholder={removeEndPlaceholder} disabled={pending} onChange={(event) => onRemoveEndChange(event.target.value)} />
              </>
            ) : null}

            {mode === 'metadata' ? (
              <textarea className="manage-group-name-input" value={metadataTemplate} placeholder={metadataTemplatePlaceholder} disabled={pending} onChange={(event) => onMetadataTemplateChange(event.target.value)} rows={3} />
            ) : null}

            <div className="settings-floating-actions manage-group-actions">
              <button className="feature-action-btn main-icon-square-btn" type="button" disabled={pending} onClick={onRefreshPreview}>{previewLabel}</button>
            </div>
            {previewSummaryText ? <p className="sidebar-rename-preview-summary">{previewSummaryText}</p> : null}
            <div className="sidebar-rename-preview-list">
              {previewRows.slice(0, 24).map((row) => (
                <p key={row.nodeId} className={`sidebar-rename-preview-row ${row.reason ? 'is-failed' : ''}`}>
                  {row.sourceName} {'->'} {row.targetName}{row.reason ? ` (${row.reason})` : ''}
                </p>
              ))}
            </div>
          </>
        ) : (
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
                if (!singleConfirmDisabled) {
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
        )}
        {errorMessage ? <p className="sidebar-rename-error">{errorMessage}</p> : null}
        <div className="settings-floating-actions manage-group-actions">
          <button className="feature-action-btn main-icon-square-btn" type="button" disabled={batchModeActive ? pending : singleConfirmDisabled} onClick={onConfirm}>
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
