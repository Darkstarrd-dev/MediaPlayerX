import type { MouseEvent as ReactMouseEvent, RefObject } from 'react'

import { buildA11yPropsByRegistry } from '../i18n/a11y'
import { useI18n } from '../i18n/useI18n'

interface SearchPanelProps {
  visible: boolean
  collapsed: boolean
  panelHeight: number
  panelRef: RefObject<HTMLDivElement | null>
  panelContentRef: RefObject<HTMLDivElement | null>
  featureResultCount: number
  featureNameQuery: string
  onFeatureNameQueryChange: (value: string) => void
  featureWorkTitleQuery: string
  onFeatureWorkTitleQueryChange: (value: string) => void
  featureCircleQuery: string
  onFeatureCircleQueryChange: (value: string) => void
  featureAuthorQuery: string
  onFeatureAuthorQueryChange: (value: string) => void
  featureCircleOptions: string[]
  featureAuthorOptions: string[]
  featureTagOptions: string[]
  featureTagPickerOpen: boolean
  onToggleFeatureTagPicker: () => void
  featureTags: string[]
  onClearFeatureTags: () => void
  onToggleFeatureTag: (tag: string) => void
  featureGradeFilter: number | null
  onFeatureGradeFilterChange: (value: number | null) => void
  onCollapse: () => void
  onExpand: () => void
  onStartResize: (event: ReactMouseEvent<HTMLDivElement>) => void
  layoutLocked: boolean
}

function SearchPanel({
  visible,
  collapsed,
  panelHeight,
  panelRef,
  panelContentRef,
  featureResultCount,
  featureNameQuery,
  onFeatureNameQueryChange,
  featureWorkTitleQuery,
  onFeatureWorkTitleQueryChange,
  featureCircleQuery,
  onFeatureCircleQueryChange,
  featureAuthorQuery,
  onFeatureAuthorQueryChange,
  featureCircleOptions,
  featureAuthorOptions,
  featureTagOptions,
  featureTagPickerOpen,
  onToggleFeatureTagPicker,
  featureTags,
  onClearFeatureTags,
  onToggleFeatureTag,
  featureGradeFilter,
  onFeatureGradeFilterChange,
  onCollapse,
  onExpand,
  onStartResize,
  layoutLocked,
}: SearchPanelProps) {
  const { t } = useI18n()

  if (!visible) {
    return null
  }

  return (
    <>
      {collapsed ? (
        <button
          {...buildA11yPropsByRegistry({ key: 'commonExpandSearchPanel', t })}
          className="search-panel-expand-btn"
          type="button"
          onClick={onExpand}
        >
          <span className="search-panel-expand-tip">{t('ui.search.expandPanelTip')}</span>
        </button>
      ) : (
        <div className="vector-panel" ref={panelRef} style={{ height: `${panelHeight}px` }} data-overlay-close="search-panel">
          <div className="vector-panel-content" ref={panelContentRef}>
            <div className="vector-top-row">
              <div className="vector-top-actions">
                <span>{t('ui.metadata.hitNodeCount', { count: featureResultCount })}</span>
                <button className="vector-collapse-btn" type="button" onClick={onCollapse}>
                  {t('ui.search.collapse')}
                </button>
              </div>
            </div>
            <div className="feature-controls">
                <label>
                  {t('ui.metadata.name')}
                  <input
                    className="feature-query-input"
                    placeholder={t('ui.metadata.nameQueryPlaceholder')}
                    value={featureNameQuery}
                    onChange={(event) => onFeatureNameQueryChange(event.target.value)}
                  />
                </label>
                <label>
                  {t('ui.metadata.workTitle')}
                  <input
                    className="feature-query-input"
                    placeholder={t('ui.metadata.workTitleQueryPlaceholder')}
                    value={featureWorkTitleQuery}
                    onChange={(event) => onFeatureWorkTitleQueryChange(event.target.value)}
                  />
                </label>
                <label>
                  {t('ui.metadata.circle')}
                  <input
                    className="feature-query-input"
                    list="feature-circle-options"
                    placeholder={t('ui.metadata.circleQueryPlaceholder')}
                    value={featureCircleQuery}
                    onChange={(event) => onFeatureCircleQueryChange(event.target.value)}
                  />
                  <datalist id="feature-circle-options">
                    {featureCircleOptions.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </label>
                <label>
                  {t('ui.metadata.author')}
                  <input
                    className="feature-query-input"
                    list="feature-author-options"
                    placeholder={t('ui.metadata.authorQueryPlaceholder')}
                    value={featureAuthorQuery}
                    onChange={(event) => onFeatureAuthorQueryChange(event.target.value)}
                  />
                  <datalist id="feature-author-options">
                    {featureAuthorOptions.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </label>

                <div className="feature-tags-group">
                  <div className="feature-control-head">
                    <strong>{t('ui.metadata.tags')}</strong>
                    <div className="feature-control-actions">
                      <button className="feature-action-btn" type="button" onClick={onToggleFeatureTagPicker}>
                        {featureTagPickerOpen ? t('ui.search.collapseTags') : t('ui.metadata.selectTags')}
                      </button>
                      <button className="feature-action-btn" type="button" onClick={onClearFeatureTags}>
                        {t('ui.metadata.clearTags')}
                      </button>
                    </div>
                  </div>

                  {featureTagPickerOpen ? (
                    <div className="feature-tags-popover" role="listbox" {...buildA11yPropsByRegistry({ key: 'tagsSelect', t })}>
                      {featureTagOptions.map((tag) => {
                        const selected = featureTags.includes(tag)
                        return (
                          <button
                            key={tag}
                            aria-label={t('a11y.tags.selectTag', { tag })}
                            aria-pressed={selected}
                            className={selected ? 'is-active' : ''}
                            type="button"
                            onClick={() => onToggleFeatureTag(tag)}
                          >
                            {tag}
                          </button>
                        )
                      })}
                    </div>
                  ) : null}

                  <p className="feature-selection-result">
                    {featureTags.length === 0 ? t('ui.metadata.noTagsSelected') : t('ui.metadata.selectedTagsSummary', { tags: featureTags.join(', ') })}
                  </p>
                </div>

                <div className="feature-rating-group">
                  <strong>{t('ui.metadata.packageRatingLabel')}</strong>
                  <div className="feature-rating-stars" role="group" aria-label={t('a11y.metadata.ratingFilter')}>
                    <button
                      aria-label={t('a11y.metadata.ratingNone')}
                      aria-pressed={featureGradeFilter === null}
                      className={`is-clear ${featureGradeFilter === null ? 'is-active' : ''}`}
                      type="button"
                      onClick={() => onFeatureGradeFilterChange(null)}
                    >
                      ×
                    </button>

                    {[1, 2, 3, 4, 5].map((score) => {
                      const isActive = featureGradeFilter !== null && score <= featureGradeFilter
                      return (
                        <button
                          key={score}
                          aria-label={t('a11y.metadata.ratingScore', { score })}
                          aria-pressed={featureGradeFilter === score}
                          className={isActive ? 'is-active' : ''}
                          style={{ color: `hsl(42deg ${35 + score * 13}% 48%)` }}
                          type="button"
                          onClick={() => onFeatureGradeFilterChange(featureGradeFilter === score ? null : score)}
                        >
                          {isActive ? '★' : '☆'}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <p className="vector-hint">{t('ui.metadata.searchHint')}</p>
              </div>
          </div>
        </div>
      )}

      {!collapsed ? (
        <div
          {...buildA11yPropsByRegistry({ key: 'commonAdjustSearchPanelHeight', t })}
          aria-orientation="horizontal"
          aria-disabled={layoutLocked}
          className={`vector-splitter ${layoutLocked ? 'is-locked' : ''}`}
          role="separator"
          tabIndex={-1}
          onMouseDown={onStartResize}
        />
      ) : null}
    </>
  )
}

export default SearchPanel
