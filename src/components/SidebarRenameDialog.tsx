import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'

import { MainUiIcon } from './MainUiIcon'

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
  numberBaseLabel: string
  numberStartPlaceholder: string
  numberStartLabel: string
  numberStepPlaceholder: string
  numberStepLabel: string
  numberPadWidthPlaceholder: string
  numberPadWidthLabel: string
  removeStartPlaceholder: string
  removeEndPlaceholder: string
  removeHeadPlaceholder: string
  removeTailPlaceholder: string
  removeRangeHint: string
  removeEdgesHint: string
  metadataTemplatePlaceholder: string
  previewLabel: string
  applyFromSourceLabel: string
  previewOriginalHeaderLabel: string
  previewNewHeaderLabel: string
  previewUnchangedLabel: string
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
  onUseSourceNameAsReplaceFrom: (value: string) => void
  onUseSourceNameAsNumberBase: (value: string) => void
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
  numberBaseLabel,
  numberStartLabel,
  numberStepLabel,
  numberPadWidthLabel,
  removeStartPlaceholder,
  removeEndPlaceholder,
  removeHeadPlaceholder,
  removeTailPlaceholder,
  removeRangeHint,
  removeEdgesHint,
  previewLabel,
  applyFromSourceLabel,
  previewOriginalHeaderLabel,
  previewNewHeaderLabel,
  previewUnchangedLabel,
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
  onUseSourceNameAsReplaceFrom,
  onUseSourceNameAsNumberBase,
  onConfirm,
  onCancel,
}: SidebarRenameDialogProps) {
  const previewListRef = useRef<HTMLDivElement | null>(null)
  const [previewListViewportHeight, setPreviewListViewportHeight] = useState(0)
  const [previewListScrollTop, setPreviewListScrollTop] = useState(0)

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
  const previewRowHeight = 45
  const previewVirtualizeThreshold = 80
  const shouldVirtualizePreviewRows = batchModeActive && previewRows.length > previewVirtualizeThreshold && previewListViewportHeight > 0

  const previewVirtualRange = useMemo(() => {
    if (!shouldVirtualizePreviewRows) {
      return {
        startIndex: 0,
        endIndex: previewRows.length,
        topSpacerHeight: 0,
        bottomSpacerHeight: 0,
      }
    }

    const overscanRows = 8
    const safeScrollTop = Math.max(0, previewListScrollTop)
    const unclampedStartIndex = Math.max(0, Math.floor(safeScrollTop / previewRowHeight) - overscanRows)
    const startIndex = Math.min(Math.max(0, previewRows.length - 1), unclampedStartIndex)
    const visibleCount = Math.ceil(previewListViewportHeight / previewRowHeight) + overscanRows * 2
    const endIndex = Math.min(previewRows.length, startIndex + Math.max(1, visibleCount))
    const topSpacerHeight = startIndex * previewRowHeight
    const trailingCount = Math.max(0, previewRows.length - endIndex)
    const bottomSpacerHeight = trailingCount * previewRowHeight

    return {
      startIndex,
      endIndex,
      topSpacerHeight,
      bottomSpacerHeight,
    }
  }, [previewListScrollTop, previewListViewportHeight, previewRows.length, shouldVirtualizePreviewRows])

  const previewRowsForRender = useMemo(
    () => previewRows.slice(previewVirtualRange.startIndex, previewVirtualRange.endIndex),
    [previewRows, previewVirtualRange.endIndex, previewVirtualRange.startIndex],
  )

  useEffect(() => {
    const listElement = previewListRef.current
    if (!listElement) {
      return
    }

    const refreshViewportHeight = () => {
      setPreviewListViewportHeight(listElement.clientHeight)
    }

    refreshViewportHeight()
    if (typeof ResizeObserver === 'undefined') {
      return
    }

    const observer = new ResizeObserver(() => {
      refreshViewportHeight()
    })
    observer.observe(listElement)

    return () => {
      observer.disconnect()
    }
  }, [batchModeActive, open])

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
          <div className="sidebar-rename-header-main">
            <h3 className="sidebar-rename-title">{inputLabel}</h3>
            {previewSummaryText ? <p className="sidebar-rename-preview-summary">{previewSummaryText}</p> : null}
          </div>
          {errorMessage ? <p className="sidebar-rename-error sidebar-rename-error-header">{errorMessage}</p> : null}
          <button
            className="feature-action-btn main-icon-square-btn sidebar-rename-close-btn sidebar-rename-g2-btn mpx-skeuo-metal-btn"
            type="button"
            aria-label={closeLabel}
            data-tooltip-label={closeLabel}
            disabled={pending}
            onClick={onCancel}
          >
            ×
          </button>
        </div>
        {batchModeActive ? (
          <>
            {mode === 'replace' ? (
              <div className="sidebar-rename-replace-controls" aria-label={modeLabel}>
                <label className="sidebar-rename-seamless-control sidebar-rename-mode-control">
                  <span className="sidebar-rename-mode-prefix">{modeLabel}</span>
                  <select
                    className="sidebar-rename-mode-select"
                    value={mode}
                    disabled={pending}
                    onChange={(event) => onModeChange(event.target.value as SidebarRenameDialogProps['mode'])}
                  >
                    <option value="replace">{modeOptionReplace}</option>
                    <option value="numbering">{modeOptionNumbering}</option>
                    <option value="remove-range">{modeOptionRemoveRange}</option>
                    <option value="metadata">{modeOptionMetadata}</option>
                    {targetCount === 1 ? <option value="single">{modeOptionSingle}</option> : null}
                  </select>
                </label>
                <input
                  className="sidebar-rename-seamless-control"
                  type="text"
                  value={replaceFrom}
                  placeholder={replaceFromPlaceholder}
                  disabled={pending}
                  onChange={(event) => onReplaceFromChange(event.target.value)}
                />
                <input
                  className="sidebar-rename-seamless-control"
                  type="text"
                  value={replaceTo}
                  placeholder={replaceToPlaceholder}
                  disabled={pending}
                  onChange={(event) => onReplaceToChange(event.target.value)}
                />
              </div>
            ) : (
              <div className="sidebar-rename-mode-row" aria-label={modeLabel}>
                <label className="sidebar-rename-mode-control sidebar-rename-mode-cell">
                  <span className="sidebar-rename-mode-prefix">{modeLabel}</span>
                  <select
                    className="sidebar-rename-mode-select"
                    value={mode}
                    disabled={pending}
                    onChange={(event) => onModeChange(event.target.value as SidebarRenameDialogProps['mode'])}
                  >
                    <option value="replace">{modeOptionReplace}</option>
                    <option value="numbering">{modeOptionNumbering}</option>
                    <option value="remove-range">{modeOptionRemoveRange}</option>
                    <option value="metadata">{modeOptionMetadata}</option>
                    {targetCount === 1 ? <option value="single">{modeOptionSingle}</option> : null}
                  </select>
                </label>
                <div className="sidebar-rename-mode-row-spacer" aria-hidden={mode !== 'numbering' && mode !== 'remove-range'}>
                  {mode === 'numbering' ? (
                    <div className="sidebar-rename-numbering-controls">
                      <label className="sidebar-rename-seamless-control sidebar-rename-numbering-control is-name">
                        <span className="sidebar-rename-numbering-prefix">{numberBaseLabel}</span>
                        <input
                          className="sidebar-rename-numbering-field"
                          type="text"
                          value={numberBase}
                          disabled={pending}
                          onChange={(event) => onNumberBaseChange(event.target.value)}
                        />
                      </label>
                      <label className="sidebar-rename-seamless-control sidebar-rename-numbering-control">
                        <span className="sidebar-rename-numbering-prefix">{numberStartLabel}</span>
                        <input
                          className="sidebar-rename-numbering-field"
                          type="number"
                          value={numberStart}
                          disabled={pending}
                          onChange={(event) => onNumberStartChange(event.target.value)}
                        />
                      </label>
                      <label className="sidebar-rename-seamless-control sidebar-rename-numbering-control">
                        <span className="sidebar-rename-numbering-prefix">{numberStepLabel}</span>
                        <input
                          className="sidebar-rename-numbering-field"
                          type="number"
                          value={numberStep}
                          disabled={pending}
                          onChange={(event) => onNumberStepChange(event.target.value)}
                        />
                      </label>
                      <label className="sidebar-rename-seamless-control sidebar-rename-numbering-control">
                        <span className="sidebar-rename-numbering-prefix">{numberPadWidthLabel}</span>
                        <input
                          className="sidebar-rename-numbering-field"
                          type="number"
                          value={numberPadWidth}
                          disabled={pending}
                          onChange={(event) => onNumberPadWidthChange(event.target.value)}
                        />
                      </label>
                    </div>
                  ) : mode === 'remove-range' ? (
                    <div className="sidebar-rename-remove-controls" aria-label={`${removeRangeHint} ${removeEdgesHint}`}>
                      <label className="sidebar-rename-seamless-control sidebar-rename-numbering-control">
                        <span className="sidebar-rename-numbering-prefix">{removeHeadPlaceholder}</span>
                        <input
                          className="sidebar-rename-numbering-field"
                          type="number"
                          min={0}
                          value={removeHead}
                          disabled={pending}
                          onChange={(event) => onRemoveHeadChange(event.target.value)}
                          onKeyDown={(event) => {
                            handleNumericArrowAdjust(event, removeHead, onRemoveHeadChange)
                          }}
                        />
                      </label>
                      <label className="sidebar-rename-seamless-control sidebar-rename-numbering-control">
                        <span className="sidebar-rename-numbering-prefix">{removeTailPlaceholder}</span>
                        <input
                          className="sidebar-rename-numbering-field"
                          type="number"
                          min={0}
                          value={removeTail}
                          disabled={pending}
                          onChange={(event) => onRemoveTailChange(event.target.value)}
                          onKeyDown={(event) => {
                            handleNumericArrowAdjust(event, removeTail, onRemoveTailChange)
                          }}
                        />
                      </label>
                      <label className="sidebar-rename-seamless-control sidebar-rename-numbering-control">
                        <span className="sidebar-rename-numbering-prefix">{removeStartPlaceholder}</span>
                        <input
                          className="sidebar-rename-numbering-field"
                          type="number"
                          min={0}
                          value={removeStart}
                          disabled={pending}
                          onChange={(event) => onRemoveStartChange(event.target.value)}
                          onKeyDown={(event) => {
                            const nextStart = handleNumericArrowAdjust(event, removeStart, onRemoveStartChange)
                            if (nextStart == null) {
                              return
                            }
                            const currentEnd = parseNonNegativeInt(removeEnd)
                            if (currentEnd > 0 && nextStart > 0 && currentEnd < nextStart) {
                              onRemoveEndChange(String(nextStart))
                            }
                          }}
                        />
                      </label>
                      <label className="sidebar-rename-seamless-control sidebar-rename-numbering-control">
                        <span className="sidebar-rename-numbering-prefix">{removeEndPlaceholder}</span>
                        <input
                          className="sidebar-rename-numbering-field"
                          type="number"
                          min={0}
                          value={removeEnd}
                          disabled={pending}
                          onChange={(event) => onRemoveEndChange(event.target.value)}
                          onKeyDown={(event) => {
                            const nextEnd = handleNumericArrowAdjust(event, removeEnd, onRemoveEndChange)
                            if (nextEnd == null) {
                              return
                            }
                            const currentStart = parseNonNegativeInt(removeStart)
                            if (nextEnd > 0 && currentStart > 0 && nextEnd < currentStart) {
                              onRemoveEndChange(String(currentStart))
                            }
                          }}
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            <div className="sidebar-rename-preview-table" aria-label={previewLabel}>
              <div className="sidebar-rename-preview-head">
                <span>{previewOriginalHeaderLabel}</span>
                <span aria-hidden="true" />
                <span>{previewNewHeaderLabel}</span>
              </div>
              <div
                ref={previewListRef}
                className="sidebar-rename-preview-list"
                onScroll={(event) => {
                  setPreviewListScrollTop(event.currentTarget.scrollTop)
                }}
              >
                {shouldVirtualizePreviewRows && previewVirtualRange.topSpacerHeight > 0 ? (
                  <div
                    aria-hidden="true"
                    style={{
                      height: `${previewVirtualRange.topSpacerHeight}px`,
                      flex: '0 0 auto',
                      pointerEvents: 'none',
                    }}
                  />
                ) : null}
                {previewRowsForRender.map((row) => {
                  const failed = Boolean(row.reason && row.reason !== 'unchanged')
                  const unchanged = row.reason === 'unchanged'
                  return (
                    <div key={row.nodeId} className={`sidebar-rename-preview-row ${failed ? 'is-failed' : ''} ${unchanged ? 'is-unchanged' : 'is-changed'}`}>
                      {mode === 'replace' || mode === 'numbering' ? (
                        <button
                          className="sidebar-rename-preview-cell sidebar-rename-preview-source-btn"
                          type="button"
                          disabled={pending}
                          data-tooltip-label={`${applyFromSourceLabel}: ${row.sourceName}`}
                          onClick={() => {
                            if (mode === 'replace') {
                              onUseSourceNameAsReplaceFrom(row.sourceName)
                              return
                            }
                            onUseSourceNameAsNumberBase(row.sourceName)
                          }}
                        >
                          {row.sourceName}
                        </button>
                      ) : (
                        <span className="sidebar-rename-preview-cell" data-tooltip-label={row.sourceName}>{row.sourceName}</span>
                      )}
                      <span className="sidebar-rename-preview-arrow" aria-hidden="true">
                        <MainUiIcon name="next" className="sidebar-rename-preview-arrow-icon" />
                      </span>
                      <span className="sidebar-rename-preview-cell">
                        {failed ? row.reason : unchanged ? previewUnchangedLabel : row.targetName}
                      </span>
                    </div>
                  )
                })}
                {shouldVirtualizePreviewRows && previewVirtualRange.bottomSpacerHeight > 0 ? (
                  <div
                    aria-hidden="true"
                    style={{
                      height: `${previewVirtualRange.bottomSpacerHeight}px`,
                      flex: '0 0 auto',
                      pointerEvents: 'none',
                    }}
                  />
                ) : null}
              </div>
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
        <div className="settings-floating-actions manage-group-actions sidebar-rename-footer-actions">
          <button className="feature-action-btn main-icon-square-btn sidebar-rename-g2-btn mpx-skeuo-metal-btn" type="button" disabled={pending} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="feature-action-btn main-icon-square-btn sidebar-rename-confirm-btn sidebar-rename-g2-btn mpx-skeuo-metal-btn" type="button" disabled={batchModeActive ? pending : singleConfirmDisabled} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}

export default SidebarRenameDialog
