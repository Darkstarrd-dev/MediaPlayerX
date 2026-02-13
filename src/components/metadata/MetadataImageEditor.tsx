import { useEffect, useMemo, useState } from 'react'

import { mediaLocatorFileName } from '../../features/backend'
import type { ParsedExternalMetadata } from '../../features/metadata/parseExternalMetadata'
import type { ImageItem, ImagePackage } from '../../types'
import { MetadataRatingGroup } from './MetadataRatingGroup'
import {
  type ParsedMetadataDraft,
  buildParsedDraft,
  copyTextValue,
  flattenTagValuesExcluding,
  formatTagJson,
  joinTagValues,
  parseTagJson,
  resolveEditableTagsValue,
  resolveEvaluationDisplayValue,
  resolveLanguageLabel,
  resolveSourceSiteLabel,
  splitTagValues,
  toParsedPayload,
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
  const [preferTitleJpn, setPreferTitleJpn] = useState(true)
  const [preferAuthorJpn, setPreferAuthorJpn] = useState(true)
  const [preferGroupJpn, setPreferGroupJpn] = useState(true)
  const [parsedDraft, setParsedDraft] = useState<ParsedMetadataDraft>(
    buildParsedDraft(focusedImagePackage, workTitleDraft, circleDraft, authorDraft, tagsDraft),
  )
  const [parsedError, setParsedError] = useState<string | null>(null)

  useEffect(() => {
    setPreferTitleJpn(true)
    setPreferAuthorJpn(true)
    setPreferGroupJpn(true)
    setParsedDraft(buildParsedDraft(focusedImagePackage, workTitleDraft, circleDraft, authorDraft, tagsDraft))
    setParsedError(null)
  }, [focusedImagePackage])

  const parsedTagMap = useMemo(() => {
    try {
      return parseTagJson(parsedDraft.tagsJson)
    } catch {
      return {} as Record<string, string>
    }
  }, [parsedDraft.tagsJson])

  const readOnlyTags = useMemo(() => {
    const parsedValues = flattenTagValuesExcluding(parsedTagMap, ['parody', 'character'])
    if (parsedValues.length > 0) {
      return parsedValues
    }
    return tagsDraft
      .split(/[,，]/)
      .map((tag) => tag.trim())
      .filter((tag, index, arr) => tag.length > 0 && arr.indexOf(tag) === index)
  }, [parsedTagMap, tagsDraft])

  const sourceDisplayValue = resolveSourceSiteLabel(parsedDraft.sourceSite)

  const resolvedTitle = useMemo(() => {
    const primary = preferTitleJpn ? parsedDraft.titleJpn : parsedDraft.title
    const fallback = preferTitleJpn ? parsedDraft.title : parsedDraft.titleJpn
    return primary.trim() || fallback.trim() || '-'
  }, [parsedDraft.title, parsedDraft.titleJpn, preferTitleJpn])

  const resolvedAuthor = useMemo(() => {
    const primary = preferAuthorJpn ? parsedDraft.artistJpn : parsedDraft.artist
    const fallback = preferAuthorJpn ? parsedDraft.artist : parsedDraft.artistJpn
    return primary.trim() || fallback.trim() || '-'
  }, [parsedDraft.artist, parsedDraft.artistJpn, preferAuthorJpn])

  const resolvedGroup = useMemo(() => {
    const primary = preferGroupJpn ? parsedDraft.groupJpn : parsedDraft.group
    const fallback = preferGroupJpn ? parsedDraft.group : parsedDraft.groupJpn
    return primary.trim() || fallback.trim() || '-'
  }, [parsedDraft.group, parsedDraft.groupJpn, preferGroupJpn])

  const titleLangLabel = useMemo(
    () => resolveLanguageLabel(preferTitleJpn, parsedDraft.titleJpn, parsedDraft.title),
    [parsedDraft.title, parsedDraft.titleJpn, preferTitleJpn],
  )
  const authorLangLabel = useMemo(
    () => resolveLanguageLabel(preferAuthorJpn, parsedDraft.artistJpn, parsedDraft.artist),
    [parsedDraft.artist, parsedDraft.artistJpn, preferAuthorJpn],
  )
  const groupLangLabel = useMemo(
    () => resolveLanguageLabel(preferGroupJpn, parsedDraft.groupJpn, parsedDraft.group),
    [parsedDraft.group, parsedDraft.groupJpn, preferGroupJpn],
  )
  const hasDualTitle = parsedDraft.title.trim().length > 0 && parsedDraft.titleJpn.trim().length > 0
  const hasDualAuthor = parsedDraft.artist.trim().length > 0 && parsedDraft.artistJpn.trim().length > 0
  const hasDualGroup = parsedDraft.group.trim().length > 0 && parsedDraft.groupJpn.trim().length > 0
  const titleToggleLabel = titleLangLabel === 'EN' ? 'EN' : 'JP'
  const authorToggleLabel = authorLangLabel === 'EN' ? 'EN' : 'JP'
  const groupToggleLabel = groupLangLabel === 'EN' ? 'EN' : 'JP'
  const ratingFavoritedDisplayValue = `${parsedDraft.rating.trim() || '-'} / ${parsedDraft.favorited.trim() || '-'}`

  const parodyValues = useMemo(() => splitTagValues(parsedTagMap.parody ?? ''), [parsedTagMap])
  const characterValues = useMemo(() => splitTagValues(parsedTagMap.character ?? ''), [parsedTagMap])
  const editableParodyValue = useMemo(() => joinTagValues(parsedTagMap.parody ?? ''), [parsedTagMap])
  const editableCharacterValue = useMemo(() => joinTagValues(parsedTagMap.character ?? ''), [parsedTagMap])
  const editableTagsValue = useMemo(
    () => resolveEditableTagsValue(parsedDraft.sourceSite, parsedTagMap),
    [parsedDraft.sourceSite, parsedTagMap],
  )
  const evaluationDisplayValue = useMemo(() => resolveEvaluationDisplayValue(parsedDraft), [parsedDraft])

  const persistParsedPatch = async (patch: Partial<ParsedMetadataDraft>) => {
    const nextDraft = {
      ...parsedDraft,
      ...patch,
    }
    setParsedDraft(nextDraft)
    setParsedError(null)
    try {
      const payload = toParsedPayload(nextDraft)
      await onSubmitParsedMetadata(payload)
    } catch (error) {
      setParsedError(error instanceof Error ? error.message : '写入 parsed 元数据失败')
    }
  }

  const openSourceInBrowser = () => {
    const targetUrl = parsedDraft.sourceUrl.trim()
    if (!targetUrl) {
      return
    }
    const backendApi = window.mediaPlayerBackend as
      | (typeof window.mediaPlayerBackend & {
          openExternalUrl?: (request: { url: string }) => Promise<{ ok: boolean }>
        })
      | undefined
    const openExternalUrl = backendApi?.openExternalUrl
    if (openExternalUrl) {
      void openExternalUrl({ url: targetUrl })
      return
    }
    window.open(targetUrl, '_blank', 'noopener,noreferrer')
  }

  const copyResolvedTitle = () => {
    const value = resolvedTitle.trim()
    if (!value || value === '-') {
      return
    }
    void copyTextValue(value)
  }

  const copyResolvedAuthor = () => {
    const value = resolvedAuthor.trim()
    if (!value || value === '-') {
      return
    }
    void copyTextValue(value)
  }

  const copyResolvedGroup = () => {
    const value = resolvedGroup.trim()
    if (!value || value === '-') {
      return
    }
    void copyTextValue(value)
  }

  const searchResolvedAuthor = () => {
    const value = resolvedAuthor.trim()
    if (!value || value === '-') {
      return
    }
    onSearchByAuthor(value)
  }

  const searchResolvedGroup = () => {
    const value = resolvedGroup.trim()
    if (!value || value === '-') {
      return
    }
    onSearchByCircle(value)
  }

  return (
    <div className={contentClassName}>
      {showImageCanvas && focusedImage ? (
        <>
          <div className="metadata-image-canvas">
            {displayedImageSrc ? (
              <img
                className="metadata-image-real"
                src={displayedImageSrc}
                alt={`${focusedImagePackage?.displayName ?? '图片'} #${focusedImage.ordinal}`}
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
            title="评分"
            groupAriaLabel="图包评分"
            clearAriaLabel="清空评分"
            pending={metadataPending}
            value={currentGrade}
            onChange={onGradeChange}
          />

          {editable || focusedImagePackage ? (
            <div className="metadata-edit-grid">
              {!editable ? (
                <>
                  <label>
                    <span>图包名</span>
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
                      作品名
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
                      作者
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
                      社团
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
                    <span>发布时间</span>
                    <input readOnly value={parsedDraft.posted.trim() || '-'} />
                  </label>

                  <label>
                    <span>评分/收藏</span>
                    <input readOnly value={ratingFavoritedDisplayValue} />
                  </label>

                  <label>
                    <span>系列名</span>
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
                    <span>角色名</span>
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
                    <span>Tags</span>
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
                    <span>来源</span>
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
                    <span>来源站点</span>
                    <select
                      value={parsedDraft.sourceSite}
                      onChange={(event) => {
                        const sourceSite = toSourceSite(event.target.value)
                        void persistParsedPatch({ sourceSite })
                      }}
                    >
                      <option value="nhentai">nhentai</option>
                      <option value="ehentai">ehentai</option>
                      <option value="others">others</option>
                    </select>
                    <small className="metadata-field-hint" aria-hidden="true">
                      parsed.source.site
                    </small>
                  </label>

                  <label>
                    <span>来源URL</span>
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
                    <span>日文标题</span>
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
                    <span>英文标题</span>
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
                    <span>系列ID</span>
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
                    <span>日文作者名</span>
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
                    <span>英文作者名</span>
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
                    <span>日文社团名</span>
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
                    <span>英文社团名</span>
                    <input
                      aria-label="英文社团名"
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
                    <span>发布时间</span>
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
                    <span>评分/favorited（只读）</span>
                    <input readOnly value={evaluationDisplayValue} />
                  </label>

                  <label>
                    <span>Parody</span>
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
                    <span>Character</span>
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
                    <span>Tags</span>
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
                    <span>来源ID</span>
                    <input readOnly value={parsedDraft.sourceId.trim() || '-'} />
                  </label>

                  <label>
                    <span>来源Token</span>
                    <input readOnly value={parsedDraft.sourceToken.trim() || '-'} />
                  </label>

                  <label>
                    <span>封面URL</span>
                    <input readOnly value={parsedDraft.thumb.trim() || '-'} />
                  </label>

                  {parsedError ? <p className="metadata-inline-error">{parsedError}</p> : null}
                </>
              ) : null}
            </div>
          ) : (
            <p className="metadata-empty-tip">当前无可编辑图包</p>
          )}
        </div>
      )}
    </div>
  )
}
