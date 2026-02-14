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
  return (
    <section className="metadata-search-section" aria-label="检索筛选">
      <div className="metadata-search-head">
        <strong>{`命中节点: ${featureResultCount} 个`}</strong>
      </div>

      <div className="feature-controls metadata-search-controls">
        <label>
          名称
          <input
            className="feature-query-input"
            placeholder="按名称模糊匹配"
            value={featureNameQuery}
            onChange={(event) => onFeatureNameQueryChange(event.target.value)}
          />
        </label>

        <label>
          作品名
          <input
            className="feature-query-input"
            placeholder="按作品名模糊匹配"
            value={featureWorkTitleQuery}
            onChange={(event) => onFeatureWorkTitleQueryChange(event.target.value)}
          />
        </label>

        <label>
          社团
          <input
            className="feature-query-input"
            list="metadata-feature-circle-options"
            placeholder="输入社团，支持自动补完"
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
          作者
          <input
            className="feature-query-input"
            list="metadata-feature-author-options"
            placeholder="输入作者，支持自动补完"
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
            <strong>tags</strong>
            <div className="feature-control-actions">
              <button className="feature-action-btn" type="button" onClick={onToggleFeatureTagPickerRequest}>
                {featureTagPickerOpen ? '关闭面板' : '选择 tags'}
              </button>
              <button className="feature-action-btn" type="button" onClick={onClearFeatureTags}>
                清空 tags
              </button>
            </div>
          </div>

          {featureTags.length === 0 ? (
            <p className="feature-selection-result">未选择 tags</p>
          ) : (
            <div className="feature-selected-tags">
              {featureTags.map((tag) => (
                <button
                  key={tag}
                  className="feature-selected-tag-chip"
                  type="button"
                  aria-label={`移除tag ${tag}`}
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
          <strong>图包评分</strong>
          <div className="feature-rating-stars" role="group" aria-label="图包评分筛选">
            <button
              aria-label="图包评分 无评分"
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
                  aria-label={`图包评分 ${score} 分`}
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

        <p className="vector-hint">多字段组合按 AND 逻辑过滤，结果即时同步到 Sidebar 与主视图。</p>
      </div>
    </section>
  )
}
