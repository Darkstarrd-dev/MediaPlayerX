import { useI18n } from '../../i18n/useI18n'

interface MetadataSearchSectionProps {
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
  featureTagPickerOpen: boolean
  featureTags: string[]
  onToggleFeatureTagPickerRequest: () => void
  onClearFeatureTags: () => void
  onSetFeatureTags: (tags: string[]) => void
  featureGradeFilter: number | null
  onFeatureGradeFilterChange: (value: number | null) => void
}

export function MetadataSearchSection({
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
  featureTagPickerOpen,
  featureTags,
  onToggleFeatureTagPickerRequest,
  onClearFeatureTags,
  onSetFeatureTags,
  featureGradeFilter,
  onFeatureGradeFilterChange,
}: MetadataSearchSectionProps) {
  const { t } = useI18n()

  return (
    <section className="metadata-search-section" aria-label={t('a11y.metadata.searchFilters')}>
      <div className="metadata-search-head">
        <strong>{t('ui.metadata.hitNodeCount', { count: featureResultCount })}</strong>
      </div>

      <div className="feature-controls metadata-search-controls">
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
            list="metadata-feature-circle-options"
            placeholder={t('ui.metadata.circleQueryPlaceholder')}
            value={featureCircleQuery}
            onChange={(event) => onFeatureCircleQueryChange(event.target.value)}
          />
          <datalist id="metadata-feature-circle-options">
            {featureCircleOptions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label>
          {t('ui.metadata.author')}
          <input
            className="feature-query-input"
            list="metadata-feature-author-options"
            placeholder={t('ui.metadata.authorQueryPlaceholder')}
            value={featureAuthorQuery}
            onChange={(event) => onFeatureAuthorQueryChange(event.target.value)}
          />
          <datalist id="metadata-feature-author-options">
            {featureAuthorOptions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <div className="feature-tags-group">
          <div className="feature-control-head">
            <strong>{t('ui.metadata.tags')}</strong>
            <div className="feature-control-actions">
              <button className="feature-action-btn" type="button" onClick={onToggleFeatureTagPickerRequest}>
                {featureTagPickerOpen ? t('ui.metadata.closePanel') : t('ui.metadata.selectTags')}
              </button>
              <button className="feature-action-btn" type="button" onClick={onClearFeatureTags}>
                {t('ui.metadata.clearTags')}
              </button>
            </div>
          </div>

          {featureTags.length === 0 ? (
            <p className="feature-selection-result">{t('ui.metadata.noTagsSelected')}</p>
          ) : (
            <div className="feature-selected-tags">
              {featureTags.map((tag) => (
                <button
                  key={tag}
                  className="feature-selected-tag-chip"
                  type="button"
                  aria-label={t('a11y.metadata.removeTag', { tag })}
                  title={t('a11y.metadata.removeTag', { tag })}
                  onClick={() => onSetFeatureTags(featureTags.filter((item) => item !== tag))}
                >
                  <span>{tag}</span>
                  <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="feature-rating-group">
          <strong>{t('ui.metadata.packageRatingLabel')}</strong>
          <div className="feature-rating-stars" role="group" aria-label={t('a11y.metadata.ratingFilter')}>
            <button
              aria-label={t('a11y.metadata.ratingNone')}
              title={t('a11y.metadata.ratingNone')}
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
                  title={t('a11y.metadata.ratingScore', { score })}
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
    </section>
  )
}
