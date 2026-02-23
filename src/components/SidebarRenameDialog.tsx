import type { KeyboardEvent as ReactKeyboardEvent } from 'react'

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
  removeHeadPlaceholder: string
  removeTailPlaceholder: string
  removeRangeHint: string
  removeEdgesHint: string
  metadataTemplatePlaceholder: string
  previewLabel: string
  applyFromSourceLabel: string
  previewSummaryText: string | null
  confirmLabel: string
  cancelLabel: string
  closeLabel: string
  value: string
  replaceFrom: string
  replaceTo: string
  numberBase: string
  numberStart: string
  numberStep: string
  numberPadWidth: string
  removeStart: string
  removeEnd: string
  removeHead: string
  removeTail: string
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
  onRemoveHeadChange: (value: string) => void
  onRemoveTailChange: (value: string) => void
  onMetadataTemplateChange: (value: string) => void
  onRefreshPreview: () => void
  onUseSourceNameAsReplaceFrom: (value: string) => void
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
  removeHeadPlaceholder,
  removeTailPlaceholder,
  removeRangeHint,
  removeEdgesHint,
  previewLabel,
  applyFromSourceLabel,
  previewSummaryText,
  confirmLabel,
  cancelLabel,
  closeLabel,
  value,
  replaceFrom,
  replaceTo,
  numberBase,
  numberStart,
  numberStep,
  numberPadWidth,
  removeStart,
  removeEnd,
  removeHead,
  removeTail,
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
  onRemoveHeadChange,
  onRemoveTailChange,
  onRefreshPreview,
  onUseSourceNameAsReplaceFrom,
  onConfirm,
  onCancel,
}: SidebarRenameDialogProps) {
  const parseNonNegativeInt = (raw: string): number => {
    const parsed = Number.parseInt(raw, 10)
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0
    }
    return parsed
  }

  const handleNumericArrowAdjust = (
    event: ReactKeyboardEvent<HTMLInputElement>,
    currentValue: string,
    onValueChange: (value: string) => void,
    min = 0,
    max = Number.MAX_SAFE_INTEGER,
  ): number | null => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return null
    }
    event.preventDefault()
    const delta = event.key === 'ArrowRight' ? 1 : -1
    const current = parseNonNegativeInt(currentValue)
    const next = Math.min(max, Math.max(min, current + delta))
    onValueChange(String(next))
    return next
  }

  const batchModeActive = targetCount > 1 || mode !== 'single'
  const singleConfirmDisabled = pending || value.trim().length === 0
  const showManualPreviewButton = mode === 'replace'

  if (!open) {
    return null
  }

  return (
    <div className="settings-floating-mask" data-slot="fg-sidebar-shortcut-rename-panel" role="dialog" aria-modal="true" aria-label={inputLabel} data-overlay-close="sidebar-rename-dialog">
      <section
        className="settings-floating-panel manage-group-dialog sidebar-rename-dialog"
        role="document"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            onCancel()
            return
          }
          if (event.key === 'Enter' && batchModeActive && !pending) {
            event.preventDefault()
            onConfirm()
          }
        }}
      >
        <div className="sidebar-rename-header">
          <h3 className="sidebar-rename-title">{inputLabel}</h3>
          <button
            className="feature-action-btn main-icon-square-btn sidebar-rename-close-btn"
            type="button"
            aria-label={closeLabel}
            title={closeLabel}
            disabled={pending}
            onClick={onCancel}
          >
            ×
          </button>
        </div>
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
                <p className="sidebar-rename-hint">{removeRangeHint}</p>
                <div className="sidebar-rename-input-row">
                  <input className="manage-group-name-input" type="number" min={0} value={removeStart} placeholder={removeStartPlaceholder} disabled={pending} onChange={(event) => onRemoveStartChange(event.target.value)} onKeyDown={(event) => {
                    const nextStart = handleNumericArrowAdjust(event, removeStart, onRemoveStartChange)
                    if (nextStart == null) {
                      return
                    }
                    const currentEnd = parseNonNegativeInt(removeEnd)
                    if (currentEnd > 0 && nextStart > 0 && currentEnd < nextStart) {
                      onRemoveEndChange(String(nextStart))
                    }
                  }} />
                  <input className="manage-group-name-input" type="number" min={0} value={removeEnd} placeholder={removeEndPlaceholder} disabled={pending} onChange={(event) => onRemoveEndChange(event.target.value)} onKeyDown={(event) => {
                    const nextEnd = handleNumericArrowAdjust(event, removeEnd, onRemoveEndChange)
                    if (nextEnd == null) {
                      return
                    }
                    const currentStart = parseNonNegativeInt(removeStart)
                    if (nextEnd > 0 && currentStart > 0 && nextEnd < currentStart) {
                      onRemoveEndChange(String(currentStart))
                    }
                  }} />
                </div>
                <p className="sidebar-rename-hint">{removeEdgesHint}</p>
                <div className="sidebar-rename-input-row">
                  <input className="manage-group-name-input" type="number" min={0} value={removeHead} placeholder={removeHeadPlaceholder} disabled={pending} onChange={(event) => onRemoveHeadChange(event.target.value)} onKeyDown={(event) => {
                    handleNumericArrowAdjust(event, removeHead, onRemoveHeadChange)
                  }} />
                  <input className="manage-group-name-input" type="number" min={0} value={removeTail} placeholder={removeTailPlaceholder} disabled={pending} onChange={(event) => onRemoveTailChange(event.target.value)} onKeyDown={(event) => {
                    handleNumericArrowAdjust(event, removeTail, onRemoveTailChange)
                  }} />
                </div>
              </>
            ) : null}

            {showManualPreviewButton ? (
              <div className="settings-floating-actions manage-group-actions">
                <button className="feature-action-btn main-icon-square-btn" type="button" disabled={pending} onClick={onRefreshPreview}>{previewLabel}</button>
              </div>
            ) : null}
            {previewSummaryText ? <p className="sidebar-rename-preview-summary">{previewSummaryText}</p> : null}
            <div className="sidebar-rename-preview-list">
              {previewRows.slice(0, 24).map((row) => (
                <div key={row.nodeId} className={`sidebar-rename-preview-row ${row.reason && row.reason !== 'unchanged' ? 'is-failed' : ''} ${row.reason === 'unchanged' ? 'is-unchanged' : ''}`}>
                  {mode === 'replace' ? (
                    <button
                      className="sidebar-rename-preview-cell sidebar-rename-preview-source-btn"
                      type="button"
                      disabled={pending}
                      title={row.sourceName}
                      onClick={() => {
                        onUseSourceNameAsReplaceFrom(row.sourceName)
                      }}
                    >
                      {applyFromSourceLabel}: {row.sourceName}
                    </button>
                  ) : (
                    <span className="sidebar-rename-preview-cell" title={row.sourceName}>{row.sourceName}</span>
                  )}
                  <span className="sidebar-rename-preview-cell">{row.reason && row.reason !== 'unchanged' ? row.reason : row.targetName}</span>
                </div>
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
