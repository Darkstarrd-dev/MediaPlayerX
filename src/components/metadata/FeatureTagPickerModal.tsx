import { createPortal } from 'react-dom'
import type { Dispatch, RefObject, SetStateAction } from 'react'

import { MainUiIcon } from '../MainUiIcon'
import { useDraggablePanel } from '../useDraggablePanel'
import { buildA11yPropsByRegistry } from '../../i18n/a11y'
import { useI18n } from '../../i18n/useI18n'

interface FeatureTagGroup {
  key: string
  tags: string[]
}

interface FeatureTagPickerModalProps {
  open: boolean
  selectMode: 'single' | 'multi'
  drafts: string[]
  groupedOptions: FeatureTagGroup[]
  groupContainerRef: RefObject<HTMLDivElement | null>
  onSelectModeChange: (mode: 'single' | 'multi') => void
  onDraftsChange: Dispatch<SetStateAction<string[]>>
  onCancel: () => void
  onConfirm: () => void
}

export function FeatureTagPickerModal({
  open,
  selectMode,
  drafts,
  groupedOptions,
  groupContainerRef,
  onSelectModeChange,
  onDraftsChange,
  onCancel,
  onConfirm,
}: FeatureTagPickerModalProps) {
  const { panelOffset, panelDragging, headHandlers } = useDraggablePanel(open)
  const { t } = useI18n()

  if (!open || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div className="feature-tag-modal-overlay" data-slot="fg-meta-main-search-feature-tag-picker-ovl" role="dialog" aria-modal="true" {...buildA11yPropsByRegistry({ key: 'tagsPanel', t })}>
      <div
        className="feature-tag-modal-backdrop"
        onMouseDown={(event) => {
          if (event.button === 2) {
            event.preventDefault()
            event.stopPropagation()
            onCancel()
            return
          }
          if (event.target === event.currentTarget) {
            onCancel()
          }
        }}
        onContextMenu={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onCancel()
        }}
      >
        <div
          className={`mpx-large-panel mpx-large-panel--feature-tag-picker feature-tag-modal-panel ${panelDragging ? 'is-dragging' : ''}`}
          data-slot="fg-meta-main-search-feature-tag-picker-panel"
          style={{ transform: `translate(${panelOffset.x}px, ${panelOffset.y}px)` }}
        >
          <header className="mpx-large-panel-head settings-head settings-head-draggable feature-tag-modal-head" {...headHandlers}>
            <span className="mpx-large-panel-head-spacer settings-head-spacer" aria-hidden="true" />
            <h2>{t('ui.tags.selectTitle')}</h2>
            <button
              className="settings-icon-btn main-icon-square-btn"
              type="button"
              aria-label={t('a11y.common.close')}
              data-tooltip-label={t('tip.common.close')}
              onClick={onCancel}
            >
              <MainUiIcon name="close" />
            </button>
          </header>
          <div className="mpx-large-panel-shell settings-shell is-no-side feature-tag-picker-shell">
            <main className="mpx-large-panel-main settings-main feature-tag-picker-main">
              <div className="feature-control-actions feature-tag-picker-controls">
              <label className="feature-tag-select-mode">
                <input
                  checked={selectMode === 'single'}
                  type="radio"
                  name="feature-tag-select-mode"
                  onChange={() => {
                    onSelectModeChange('single')
                    if (drafts.length > 1) {
                      onDraftsChange(drafts.slice(0, 1))
                    }
                  }}
                />
                {t('ui.tags.singleSelect')}
              </label>
              <label className="feature-tag-select-mode">
                <input
                  checked={selectMode === 'multi'}
                  type="radio"
                  name="feature-tag-select-mode"
                  onChange={() => onSelectModeChange('multi')}
                />
                {t('ui.tags.multiSelect')}
              </label>
              </div>

              <div className="feature-tag-picker-groups" role="listbox" {...buildA11yPropsByRegistry({ key: 'tagsGroups', t })} ref={groupContainerRef}>
                {groupedOptions.length === 0 ? (
                  <p className="feature-selection-result">{t('ui.tags.noAvailable')}</p>
                ) : (
                  groupedOptions.map((group) => (
                    <div key={group.key} className="feature-tag-picker-group-row" data-tag-group-key={group.key}>
                      <span className="feature-tag-picker-group-key">{group.key}</span>
                      <div className="feature-tags-popover">
                        {group.tags.map((tag) => {
                          const selected = drafts.includes(tag)
                          return (
                            <button
                              key={tag}
                              aria-label={t('a11y.tags.selectTag', { tag })}
                              data-tooltip-label={t('a11y.tags.selectTag', { tag })}
                              aria-pressed={selected}
                              className={selected ? 'is-active' : ''}
                              type="button"
                              onClick={() => {
                                onDraftsChange((previous) => {
                                  if (selectMode === 'single') {
                                    return previous[0] === tag ? [] : [tag]
                                  }
                                  if (previous.includes(tag)) {
                                    return previous.filter((item) => item !== tag)
                                  }
                                  return [...previous, tag]
                                })
                              }}
                            >
                              {tag}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="feature-tag-picker-actions">
                <button className="feature-action-btn" type="button" onClick={() => onDraftsChange([])}>
                  {t('ui.tags.clearTemporarySelection')}
                </button>
                <button className="feature-action-btn" type="button" onClick={onCancel}>
                  {t('ui.common.cancel')}
                </button>
                <button className="vector-search-btn" type="button" onClick={onConfirm}>
                  {t('ui.common.confirm')}
                </button>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
