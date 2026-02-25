import { createPortal } from 'react-dom'
import type { Dispatch, RefObject, SetStateAction } from 'react'

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
  const { t } = useI18n()

  if (!open || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div className="feature-tag-modal-overlay" role="dialog" aria-modal="true" {...buildA11yPropsByRegistry({ key: 'tagsPanel', t })}>
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
        <div className="feature-tag-modal-panel" data-slot="fg-meta-main-search-feature-tag-picker-panel">
          <div className="feature-tag-picker-head">
            <strong>{t('ui.tags.selectTitle')}</strong>
            <div className="feature-control-actions">
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
        </div>
      </div>
    </div>,
    document.body,
  )
}
