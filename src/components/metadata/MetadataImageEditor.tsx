import { mediaLocatorFileName } from '../../features/backend'
import type { ParsedExternalMetadata } from '../../features/metadata/parseExternalMetadata'
import type { ImageItem, ImagePackage } from '../../types'
import { MetadataRatingGroup } from './MetadataRatingGroup'
import { useI18n } from '../../i18n/useI18n'
import { useMetadataImageParsedDraft } from './useMetadataImageParsedDraft'
import {
  formatTagJson,
  toSourceSite,
  updateSourceTagsBySite,
  updateTagNamespace,
} from './MetadataImageEditor.helpers'

interface MetadataImageEditorProps {
  contentClassName: string
  showImageCanvas: boolean
  focusedImage: ImageItem | null
  focusedImagePackage: ImagePackage | null
  displayedImageSrc: string | null
  metadataPending: boolean
  editable: boolean
  currentGrade: number | null
  workTitleDraft: string
  seriesIdDraft: string
  circleDraft: string
  authorDraft: string
  tagsDraft: string
  onWorkTitleDraftChange: (value: string) => void
  onSeriesIdDraftChange: (value: string) => void
  onCircleDraftChange: (value: string) => void
  onAuthorDraftChange: (value: string) => void
  onTagsDraftChange: (value: string) => void
  onSubmitPackageWorkTitle: (value: string) => void
  onSubmitPackageSeriesId: (value: string) => void
  onSubmitPackageCircle: (value: string) => void
  onSubmitPackageAuthor: (value: string) => void
  onSubmitPackageTags: (value: string) => void
  onSubmitParsedMetadata: (parsed: ParsedExternalMetadata) => Promise<void>
  onGradeChange: (grade: number | null) => void
  onSearchByWorkTitle: (value: string) => void
  onSearchByCircle: (value: string) => void
  onSearchByAuthor: (value: string) => void
  onSearchByTag: (value: string) => void
}

export function MetadataImageEditor({
  contentClassName,
  showImageCanvas,
  focusedImage,
  focusedImagePackage,
  displayedImageSrc,
  metadataPending,
  editable,
  currentGrade,
  workTitleDraft,
  seriesIdDraft,
  circleDraft,
  authorDraft,
  tagsDraft,
  onWorkTitleDraftChange,
  onSeriesIdDraftChange,
  onCircleDraftChange,
  onAuthorDraftChange,
  onTagsDraftChange,
  onSubmitPackageWorkTitle,
  onSubmitPackageSeriesId,
  onSubmitPackageCircle,
  onSubmitPackageAuthor,
  onSubmitPackageTags,
  onSubmitParsedMetadata,
  onGradeChange,
  onSearchByCircle,
  onSearchByAuthor,
  onSearchByTag,
}: MetadataImageEditorProps) {
  const { t } = useI18n()
  const {
    parsedDraft,
    setParsedDraft,
    parsedError,
    parsedTagMap,
    readOnlyTags,
    sourceDisplayValue,
    resolvedTitle,
    resolvedAuthor,
    resolvedGroup,
    hasDualTitle,
    hasDualAuthor,
    hasDualGroup,
    titleToggleLabel,
    authorToggleLabel,
    groupToggleLabel,
    ratingFavoritedDisplayValue,
    parodyValues,
    characterValues,
    editableParodyValue,
    editableCharacterValue,
    editableTagsValue,
    evaluationDisplayValue,
    setPreferTitleJpn,
    setPreferAuthorJpn,
    setPreferGroupJpn,
    persistParsedPatch,
    openSourceInBrowser,
    copyResolvedTitle,
    copyResolvedAuthor,
    copyResolvedGroup,
    searchResolvedAuthor,
    searchResolvedGroup,
  } = useMetadataImageParsedDraft({
    focusedImagePackage,
    workTitleDraft,
    circleDraft,
    authorDraft,
    tagsDraft,
    onSubmitParsedMetadata,
    onSearchByAuthor,
    onSearchByCircle,
  })

  return (
    <div className={contentClassName}>
      {showImageCanvas && focusedImage ? (
        <>
          <div className="metadata-image-canvas">
            {displayedImageSrc ? (
                <img
                  className="metadata-image-real"
                  src={displayedImageSrc}
                  alt={`${focusedImagePackage?.displayName ?? t('ui.metadata.imageFallbackName')} #${focusedImage.ordinal}`}
                  draggable={false}
                />
            ) : (
              <div className="metadata-image-placeholder" aria-hidden="true" />
            )}
          </div>
          <div className="metadata-image-caption">
            <span>{mediaLocatorFileName(focusedImage.mediaLocator)}</span>
            <span>{focusedImage.width > 0 && focusedImage.height > 0 ? `${focusedImage.width} x ${focusedImage.height}` : '-'}</span>
            <span>{focusedImage.sizeKb > 0 ? `${focusedImage.sizeKb}KB` : '-'}</span>
          </div>
        </>
      ) : (
        <div className="metadata-editor-shell">
          <MetadataRatingGroup
            title={t('tip.common.rating')}
            groupAriaLabel={t('a11y.metadata.packageRating')}
            clearAriaLabel={t('a11y.metadata.clearPackageRating')}
            pending={metadataPending}
            value={currentGrade}
            onChange={onGradeChange}
          />

          {editable || focusedImagePackage ? (
            <div className="metadata-edit-grid">
              {!editable ? (
                <>
                  <label>
                    <span>{t('ui.metadata.packageName')}</span>
                    <input readOnly value={focusedImagePackage?.packageName ?? '-'} />
                  </label>

                  <label>
                    <span
                      className="metadata-field-name"
                      onClick={(e) => {
                        e.preventDefault()
                        copyResolvedTitle()
                      }}
                    >
                      {t('ui.metadata.workTitle')}
                    </span>
                    <div className="metadata-localized-field">
                      <p className="metadata-localized-value" onClick={(e) => e.preventDefault()}>
                        {resolvedTitle}
                      </p>
                      <button
                        type="button"
                        className="metadata-lang-toggle-btn"
                        onClick={(e) => {
                          e.preventDefault()
                          if (!hasDualTitle) {
                            return
                          }
                          setPreferTitleJpn((value) => !value)
                        }}
                      >
                        {titleToggleLabel}
                      </button>
                    </div>
                  </label>

                  <label>
                    <span
                      className="metadata-field-name"
                      onClick={(e) => {
                        e.preventDefault()
                        copyResolvedAuthor()
                      }}
                    >
                      {t('ui.metadata.author')}
                    </span>
                    <div className="metadata-localized-field">
                      <p
                        className="metadata-localized-value is-clickable"
                        onClick={(e) => {
                          e.preventDefault()
                          searchResolvedAuthor()
                        }}
                      >
                        {resolvedAuthor}
                      </p>
                      <button
                        type="button"
                        className="metadata-lang-toggle-btn"
                        onClick={(e) => {
                          e.preventDefault()
                          if (!hasDualAuthor) {
                            return
                          }
                          setPreferAuthorJpn((value) => !value)
                        }}
                      >
                        {authorToggleLabel}
                      </button>
                    </div>
                  </label>

                  <label>
                    <span
                      className="metadata-field-name"
                      onClick={(e) => {
                        e.preventDefault()
                        copyResolvedGroup()
                      }}
                    >
                      {t('ui.metadata.circle')}
                    </span>
                    <div className="metadata-localized-field">
                      <p
                        className="metadata-localized-value is-clickable"
                        onClick={(e) => {
                          e.preventDefault()
                          searchResolvedGroup()
                        }}
                      >
                        {resolvedGroup}
                      </p>
                      <button
                        type="button"
                        className="metadata-lang-toggle-btn"
                        onClick={(e) => {
                          e.preventDefault()
                          if (!hasDualGroup) {
                            return
                          }
                          setPreferGroupJpn((value) => !value)
                        }}
                      >
                        {groupToggleLabel}
                      </button>
                    </div>
                  </label>

                  <label>
                    <span>{t('ui.metadata.publishedAt')}</span>
                    <input readOnly value={parsedDraft.posted.trim() || '-'} />
                  </label>

                  <label>
                    <span>{t('ui.metadata.ratingFavorited')}</span>
                    <input readOnly value={ratingFavoritedDisplayValue} />
                  </label>

                  <label>
                    <span>{t('ui.metadata.parodyName')}</span>
                    <div className="metadata-tag-chip-list">
                      {parodyValues.length > 0
                        ? parodyValues.map((tag) => (
                            <button key={`parody-${tag}`} type="button" onClick={() => onSearchByTag(tag)}>
                              {tag}
                            </button>
                          ))
                        : '-'}
                    </div>
                  </label>

                  <label>
                    <span>{t('ui.metadata.characterName')}</span>
                    <div className="metadata-tag-chip-list">
                      {characterValues.length > 0
                        ? characterValues.map((tag) => (
                            <button key={`character-${tag}`} type="button" onClick={() => onSearchByTag(tag)}>
                              {tag}
                            </button>
                          ))
                        : '-'}
                    </div>
                  </label>

                  <label>
                    <span>{t('ui.metadata.tags')}</span>
                    <div className="metadata-tag-chip-list">
                      {readOnlyTags.length > 0
                        ? readOnlyTags.map((tag) => (
                            <button key={tag} type="button" onClick={() => onSearchByTag(tag)}>
                              {tag}
                            </button>
                          ))
                        : '-'}
                    </div>
                  </label>

                  <label>
                    <span>{t('ui.metadata.source')}</span>
                    <button
                      type="button"
                      disabled={!parsedDraft.sourceUrl.trim()}
                      onClick={openSourceInBrowser}
                    >
                      {sourceDisplayValue}
                    </button>
                  </label>
                </>
              ) : null}

              {editable ? (
                <>
                  <label>
                    <span>{t('ui.metadata.sourceSite')}</span>
                    <select
                      value={parsedDraft.sourceSite}
                      onChange={(event) => {
                        const sourceSite = toSourceSite(event.target.value)
                        void persistParsedPatch({ sourceSite })
                      }}
                    >
                      <option value="nhentai">{t('ui.metadata.sourceSiteNhentai')}</option>
                      <option value="ehentai">{t('ui.metadata.sourceSiteEhentai')}</option>
                      <option value="others">{t('ui.metadata.sourceSiteOthers')}</option>
                    </select>
                    <small className="metadata-field-hint" aria-hidden="true">
                      parsed.source.site
                    </small>
                  </label>

                  <label>
                    <span>{t('ui.metadata.sourceUrl')}</span>
                    <input
                      value={parsedDraft.sourceUrl}
                      onChange={(event) => {
                        const sourceUrl = event.target.value
                        setParsedDraft((previous) => ({
                          ...previous,
                          sourceUrl,
                        }))
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') {
                          return
                        }
                        event.preventDefault()
                        void persistParsedPatch({ sourceUrl: event.currentTarget.value })
                      }}
                    />
                    <small className="metadata-field-hint" aria-hidden="true">
                      parsed.source.url
                    </small>
                  </label>

                  <label>
                    <span>{t('ui.metadata.japaneseTitle')}</span>
                    <input
                      value={parsedDraft.titleJpn}
                      onChange={(event) => {
                        const titleJpn = event.target.value
                        setParsedDraft((previous) => ({
                          ...previous,
                          titleJpn,
                        }))
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') {
                          return
                        }
                        event.preventDefault()
                        void persistParsedPatch({ titleJpn: event.currentTarget.value })
                      }}
                    />
                    <small className="metadata-field-hint" aria-hidden="true">
                      parsed.title_jpn
                    </small>
                  </label>

                  <label>
                    <span>{t('ui.metadata.englishTitle')}</span>
                    <input
                      value={workTitleDraft}
                      onChange={(event) => {
                        const nextValue = event.target.value
                        onWorkTitleDraftChange(nextValue)
                        setParsedDraft((previous) => ({
                          ...previous,
                          title: nextValue,
                        }))
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') {
                          return
                        }
                        event.preventDefault()
                        const value = event.currentTarget.value
                        onSubmitPackageWorkTitle(value)
                        void persistParsedPatch({ title: value })
                      }}
                    />
                    <small className="metadata-field-hint" aria-hidden="true">
                      parsed.title
                    </small>
                  </label>

                  <label>
                    <span>{t('ui.metadata.seriesId')}</span>
                    <input
                      value={seriesIdDraft}
                      onChange={(event) => {
                        onSeriesIdDraftChange(event.target.value)
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') {
                          return
                        }
                        event.preventDefault()
                        onSubmitPackageSeriesId(event.currentTarget.value)
                      }}
                    />
                    <small className="metadata-field-hint" aria-hidden="true">
                      series_id
                    </small>
                  </label>

                  <label>
                    <span>{t('ui.metadata.japaneseAuthor')}</span>
                    <input
                      value={parsedDraft.artistJpn}
                      onChange={(event) => {
                        const artistJpn = event.target.value
                        setParsedDraft((previous) => ({
                          ...previous,
                          artistJpn,
                        }))
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') {
                          return
                        }
                        event.preventDefault()
                        void persistParsedPatch({ artistJpn: event.currentTarget.value })
                      }}
                    />
                    <small className="metadata-field-hint" aria-hidden="true">
                      parsed.artist_jpn
                    </small>
                  </label>

                  <label>
                    <span>{t('ui.metadata.englishAuthor')}</span>
                    <input
                      value={authorDraft}
                      onChange={(event) => {
                        const nextValue = event.target.value
                        onAuthorDraftChange(nextValue)
                        setParsedDraft((previous) => ({
                          ...previous,
                          artist: nextValue,
                        }))
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') {
                          return
                        }
                        event.preventDefault()
                        const value = event.currentTarget.value
                        onSubmitPackageAuthor(value)
                        void persistParsedPatch({ artist: value })
                      }}
                    />
                    <small className="metadata-field-hint" aria-hidden="true">
                      parsed.artist
                    </small>
                  </label>

                  <label>
                    <span>{t('ui.metadata.japaneseCircle')}</span>
                    <input
                      value={parsedDraft.groupJpn}
                      onChange={(event) => {
                        const groupJpn = event.target.value
                        setParsedDraft((previous) => ({
                          ...previous,
                          groupJpn,
                        }))
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') {
                          return
                        }
                        event.preventDefault()
                        void persistParsedPatch({ groupJpn: event.currentTarget.value })
                      }}
                    />
                    <small className="metadata-field-hint" aria-hidden="true">
                      parsed.group_jpn
                    </small>
                  </label>

                  <label>
                    <span>{t('ui.metadata.englishCircle')}</span>
                    <input
                      aria-label={t('a11y.metadata.englishCircle')}
                      value={circleDraft}
                      onChange={(event) => {
                        const nextValue = event.target.value
                        onCircleDraftChange(nextValue)
                        setParsedDraft((previous) => ({
                          ...previous,
                          group: nextValue,
                        }))
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') {
                          return
                        }
                        event.preventDefault()
                        const value = event.currentTarget.value
                        onSubmitPackageCircle(value)
                        void persistParsedPatch({ group: value })
                      }}
                    />
                    <small className="metadata-field-hint" aria-hidden="true">
                      parsed.group
                    </small>
                  </label>

                  <label>
                    <span>{t('ui.metadata.publishedAt')}</span>
                    <input
                      value={parsedDraft.posted}
                      onChange={(event) => {
                        const posted = event.target.value
                        setParsedDraft((previous) => ({
                          ...previous,
                          posted,
                        }))
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') {
                          return
                        }
                        event.preventDefault()
                        void persistParsedPatch({ posted: event.currentTarget.value })
                      }}
                    />
                    <small className="metadata-field-hint" aria-hidden="true">
                      parsed.posted
                    </small>
                  </label>

                  <label>
                    <span>{t('ui.metadata.evaluationReadOnly')}</span>
                    <input readOnly value={evaluationDisplayValue} />
                  </label>

                  <label>
                    <span>{t('ui.metadata.parody')}</span>
                    <input
                      value={editableParodyValue}
                      onChange={(event) => {
                        const nextTags = updateTagNamespace(parsedTagMap, 'parody', event.target.value)
                        setParsedDraft((previous) => ({
                          ...previous,
                          tagsJson: formatTagJson(nextTags),
                        }))
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') {
                          return
                        }
                        event.preventDefault()
                        const nextTags = updateTagNamespace(parsedTagMap, 'parody', event.currentTarget.value)
                        void persistParsedPatch({ tagsJson: formatTagJson(nextTags) })
                      }}
                    />
                    <small className="metadata-field-hint" aria-hidden="true">
                      parsed.tags.parody
                    </small>
                  </label>

                  <label>
                    <span>{t('ui.metadata.character')}</span>
                    <input
                      value={editableCharacterValue}
                      onChange={(event) => {
                        const nextTags = updateTagNamespace(parsedTagMap, 'character', event.target.value)
                        setParsedDraft((previous) => ({
                          ...previous,
                          tagsJson: formatTagJson(nextTags),
                        }))
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') {
                          return
                        }
                        event.preventDefault()
                        const nextTags = updateTagNamespace(parsedTagMap, 'character', event.currentTarget.value)
                        void persistParsedPatch({ tagsJson: formatTagJson(nextTags) })
                      }}
                    />
                    <small className="metadata-field-hint" aria-hidden="true">
                      parsed.tags.character
                    </small>
                  </label>

                  <label>
                    <span>{t('ui.metadata.tags')}</span>
                    <input
                      value={editableTagsValue}
                      onChange={(event) => {
                        const nextTags = updateSourceTagsBySite(parsedTagMap, parsedDraft.sourceSite, event.target.value)
                        setParsedDraft((previous) => ({
                          ...previous,
                          tagsJson: formatTagJson(nextTags),
                        }))
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') {
                          return
                        }
                        event.preventDefault()
                        const value = event.currentTarget.value
                        onTagsDraftChange(value)
                        onSubmitPackageTags(value)
                        const nextTags = updateSourceTagsBySite(parsedTagMap, parsedDraft.sourceSite, value)
                        void persistParsedPatch({ tagsJson: formatTagJson(nextTags) })
                      }}
                    />
                    <small className="metadata-field-hint" aria-hidden="true">
                      parsed.tags
                    </small>
                  </label>

                  <label>
                    <span>{t('ui.metadata.sourceId')}</span>
                    <input readOnly value={parsedDraft.sourceId.trim() || '-'} />
                  </label>

                  <label>
                    <span>{t('ui.metadata.sourceToken')}</span>
                    <input readOnly value={parsedDraft.sourceToken.trim() || '-'} />
                  </label>

                  <label>
                    <span>{t('ui.metadata.coverUrl')}</span>
                    <input readOnly value={parsedDraft.thumb.trim() || '-'} />
                  </label>

                  {parsedError ? <p className="metadata-inline-error">{parsedError}</p> : null}
                </>
              ) : null}
            </div>
          ) : (
            <p className="metadata-empty-tip">{t('ui.metadata.noEditablePackage')}</p>
          )}
        </div>
      )}
    </div>
  )
}
