import { mediaLocatorFileName } from '../../features/backend'
import { useEffect, useMemo, useState } from 'react'

import type { ParsedExternalMetadata } from '../../features/metadata/parseExternalMetadata'
import type { ImageItem, ImagePackage } from '../../types'
import { MetadataRatingGroup } from './MetadataRatingGroup'

type ParsedSourceSite = ParsedExternalMetadata['source']['site']

interface ParsedMetadataDraft {
  sourceSite: ParsedSourceSite
  sourceUrl: string
  sourceId: string
  sourceToken: string
  title: string
  titleJpn: string
  thumb: string
  artist: string
  group: string
  artistJpn: string
  groupJpn: string
  posted: string
  rating: string
  favorited: string
  tagsJson: string
}

interface MetadataImageEditorProps {
  contentClassName: string
  showImageCanvas: boolean
  focusedImage: ImageItem | null
  focusedImagePackage: ImagePackage | null
  displayedImageSrc: string | null
  imagePreviewSizing: { width?: string; height?: string }
  metadataPending: boolean
  editable: boolean
  currentGrade: number | null
  workTitleDraft: string
  circleDraft: string
  authorDraft: string
  tagsDraft: string
  onWorkTitleDraftChange: (value: string) => void
  onCircleDraftChange: (value: string) => void
  onAuthorDraftChange: (value: string) => void
  onTagsDraftChange: (value: string) => void
  onSubmitPackageWorkTitle: (value: string) => void
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

const EMPTY_PARSED_DRAFT: ParsedMetadataDraft = {
  sourceSite: 'nhentai',
  sourceUrl: '',
  sourceId: '',
  sourceToken: '',
  title: '',
  titleJpn: '',
  thumb: '',
  artist: '',
  group: '',
  artistJpn: '',
  groupJpn: '',
  posted: '',
  rating: '',
  favorited: '',
  tagsJson: '{\n  "parody": "",\n  "character": ""\n}',
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function toSourceSite(value: string): ParsedSourceSite {
  if (value === 'ehentai') {
    return 'ehentai'
  }
  if (value === 'others') {
    return 'others'
  }
  return 'nhentai'
}

function normalizeTagMap(value: unknown): Record<string, string> {
  const record = asRecord(value)
  const tags: Record<string, string> = {}
  for (const [rawNamespace, rawText] of Object.entries(record)) {
    const namespace = rawNamespace.trim()
    if (!namespace) {
      continue
    }
    if (typeof rawText !== 'string') {
      continue
    }
    tags[namespace] = rawText.trim()
  }
  return tags
}

function formatTagJson(tags: Record<string, string>): string {
  return JSON.stringify(tags, null, 2)
}

function parseTagJson(raw: string): Record<string, string> {
  const text = raw.trim()
  if (!text) {
    return {}
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('tags 必须是合法 JSON 对象')
  }

  const record = asRecord(parsed)
  const normalized: Record<string, string> = {}
  for (const [namespaceRaw, valueRaw] of Object.entries(record)) {
    const namespace = namespaceRaw.trim()
    if (!namespace) {
      continue
    }
    if (typeof valueRaw !== 'string') {
      throw new Error(`tags.${namespace} 必须是字符串`)
    }
    normalized[namespace] = valueRaw.trim()
  }
  return normalized
}

function parseRawParsedDraft(rawJson: string): Partial<ParsedMetadataDraft> | null {
  const rawText = rawJson.trim()
  if (!rawText) {
    return null
  }

  try {
    const parsed = asRecord(JSON.parse(rawText))
    const source = asRecord(parsed.source)
    const tags = normalizeTagMap(parsed.tags)
    return {
      sourceSite: toSourceSite(asText(source.site)),
      sourceUrl: asText(source.url),
      sourceId: asText(source.id),
      sourceToken: asText(source.token),
      title: asText(parsed.title),
      titleJpn: asText(parsed.title_jpn),
      thumb: asText(parsed.thumb),
      artist: asText(parsed.artist),
      group: asText(parsed.group),
      artistJpn: asText(parsed.artist_jpn),
      groupJpn: asText(parsed.group_jpn),
      posted: asText(parsed.posted),
      rating: asText(parsed.rating),
      favorited: asText(parsed.favorited),
      tagsJson: formatTagJson(tags),
    }
  } catch {
    return null
  }
}

function tagsDraftToMap(tagsDraft: string): Record<string, string> {
  const values = tagsDraft
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
  if (values.length === 0) {
    return {}
  }
  return { tag: values.join(', ') }
}

function buildParsedDraft(
  sourcePackage: ImagePackage | null,
  workTitleDraft: string,
  circleDraft: string,
  authorDraft: string,
  tagsDraft: string,
): ParsedMetadataDraft {
  const external = sourcePackage?.externalMetadata ?? null
  const rawDraft = external ? parseRawParsedDraft(external.rawJson) : null
  const externalTags = external?.tags ?? {}
  const packageTags = sourcePackage?.tags ?? []
  const packageTagsDraft = packageTags.length > 0 ? packageTags.join(', ') : tagsDraft

  const merged: ParsedMetadataDraft = {
    ...EMPTY_PARSED_DRAFT,
    sourceSite: external?.sourceSite ?? rawDraft?.sourceSite ?? 'nhentai',
    sourceUrl: external?.sourceUrl ?? rawDraft?.sourceUrl ?? '',
    sourceId: external?.sourceRemoteId ?? rawDraft?.sourceId ?? '',
    sourceToken: external?.sourceToken ?? rawDraft?.sourceToken ?? '',
    title: external?.title ?? rawDraft?.title ?? sourcePackage?.workTitle ?? workTitleDraft.trim(),
    titleJpn: external?.titleJpn ?? rawDraft?.titleJpn ?? '',
    thumb: rawDraft?.thumb ?? '',
    artist: external?.artist ?? rawDraft?.artist ?? sourcePackage?.author ?? authorDraft.trim(),
    group: external?.groupName ?? rawDraft?.group ?? sourcePackage?.circle ?? circleDraft.trim(),
    artistJpn: external?.artistJpn ?? rawDraft?.artistJpn ?? '',
    groupJpn: external?.groupNameJpn ?? rawDraft?.groupJpn ?? '',
    posted: external?.posted ?? rawDraft?.posted ?? '',
    rating: external?.rating ?? rawDraft?.rating ?? '',
    favorited: external?.favorited ?? rawDraft?.favorited ?? '',
    tagsJson: formatTagJson(
      Object.keys(externalTags).length > 0
        ? externalTags
        : rawDraft?.tagsJson
          ? parseTagJson(rawDraft.tagsJson)
          : tagsDraftToMap(packageTagsDraft),
    ),
  }

  if (!merged.sourceUrl && rawDraft?.sourceUrl) {
    merged.sourceUrl = rawDraft.sourceUrl
  }
  if (!merged.sourceId && rawDraft?.sourceId) {
    merged.sourceId = rawDraft.sourceId
  }
  if (!merged.sourceToken && rawDraft?.sourceToken) {
    merged.sourceToken = rawDraft.sourceToken
  }
  if (!merged.title && rawDraft?.title) {
    merged.title = rawDraft.title
  }
  if (!merged.titleJpn && rawDraft?.titleJpn) {
    merged.titleJpn = rawDraft.titleJpn
  }
  if (!merged.artist && rawDraft?.artist) {
    merged.artist = rawDraft.artist
  }
  if (!merged.group && rawDraft?.group) {
    merged.group = rawDraft.group
  }
  if (!merged.artistJpn && rawDraft?.artistJpn) {
    merged.artistJpn = rawDraft.artistJpn
  }
  if (!merged.groupJpn && rawDraft?.groupJpn) {
    merged.groupJpn = rawDraft.groupJpn
  }
  if (!merged.posted && rawDraft?.posted) {
    merged.posted = rawDraft.posted
  }
  if (!merged.rating && rawDraft?.rating) {
    merged.rating = rawDraft.rating
  }
  if (!merged.favorited && rawDraft?.favorited) {
    merged.favorited = rawDraft.favorited
  }
  if (!merged.thumb && rawDraft?.thumb) {
    merged.thumb = rawDraft.thumb
  }

  return merged
}

function splitTagValues(raw: string): string[] {
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function flattenTagValues(tags: Record<string, string>): string[] {
  const values: string[] = []
  for (const raw of Object.values(tags)) {
    values.push(...splitTagValues(raw))
  }
  return Array.from(new Set(values))
}

function joinTagValues(raw: string): string {
  return Array.from(new Set(splitTagValues(raw))).join(', ')
}

function resolveEditableTagsValue(sourceSite: ParsedSourceSite, tags: Record<string, string>): string {
  if (sourceSite === 'nhentai') {
    const nhTags = tags.tag?.trim() ?? ''
    if (nhTags) {
      return joinTagValues(nhTags)
    }
    const fallback = Object.entries(tags)
      .filter(([namespace]) => namespace !== 'parody' && namespace !== 'character')
      .flatMap(([, value]) => splitTagValues(value))
    return Array.from(new Set(fallback)).join(', ')
  }

  const flattened = Object.entries(tags)
    .filter(([namespace]) => namespace !== 'parody' && namespace !== 'character')
    .flatMap(([, value]) => splitTagValues(value))
  return Array.from(new Set(flattened)).join(', ')
}

function resolveEvaluationDisplayValue(draft: ParsedMetadataDraft): string {
  if (draft.sourceSite === 'ehentai') {
    return draft.rating.trim() || '-'
  }
  if (draft.sourceSite === 'nhentai') {
    return draft.favorited.trim() || '-'
  }
  const rating = draft.rating.trim()
  const favorited = draft.favorited.trim()
  if (rating && favorited) {
    return `${rating} / ${favorited}`
  }
  return rating || favorited || '-'
}

function updateTagNamespace(
  tags: Record<string, string>,
  namespace: string,
  value: string,
): Record<string, string> {
  const next = { ...tags }
  const normalizedValue = value.trim()
  if (!normalizedValue) {
    delete next[namespace]
    return next
  }
  next[namespace] = joinTagValues(normalizedValue)
  return next
}

function updateSourceTagsBySite(
  tags: Record<string, string>,
  sourceSite: ParsedSourceSite,
  value: string,
): Record<string, string> {
  const normalized = joinTagValues(value)
  if (sourceSite === 'nhentai') {
    const next = { ...tags }
    if (!normalized) {
      delete next.tag
      return next
    }
    next.tag = normalized
    return next
  }

  const next: Record<string, string> = {}
  const parody = tags.parody?.trim() ?? ''
  const character = tags.character?.trim() ?? ''
  if (parody) {
    next.parody = parody
  }
  if (character) {
    next.character = character
  }
  if (normalized) {
    next.tag = normalized
  }
  return next
}

function toParsedPayload(draft: ParsedMetadataDraft): ParsedExternalMetadata {
  const sourceUrl = draft.sourceUrl.trim()
  if (!sourceUrl) {
    throw new Error('source.url 不能为空')
  }

  const sourceId = draft.sourceId.trim()
  if (!sourceId) {
    throw new Error('source.id 不能为空')
  }

  const tags = parseTagJson(draft.tagsJson)
  const payload: ParsedExternalMetadata = {
    source: {
      site: draft.sourceSite,
      url: sourceUrl,
      id: sourceId,
      token: draft.sourceToken.trim(),
    },
    title: draft.title.trim(),
    title_jpn: draft.titleJpn.trim(),
    thumb: draft.thumb.trim(),
    artist: draft.artist.trim(),
    group: draft.group.trim(),
    artist_jpn: draft.artistJpn.trim(),
    group_jpn: draft.groupJpn.trim(),
    posted: draft.posted.trim(),
    tags,
  }

  const rating = draft.rating.trim()
  if (rating) {
    payload.rating = rating
  }

  const favorited = draft.favorited.trim()
  if (favorited) {
    payload.favorited = favorited
  }

  return payload
}

export function MetadataImageEditor({
  contentClassName,
  showImageCanvas,
  focusedImage,
  focusedImagePackage,
  displayedImageSrc,
  imagePreviewSizing,
  metadataPending,
  editable,
  currentGrade,
  workTitleDraft,
  circleDraft,
  authorDraft,
  tagsDraft,
  onWorkTitleDraftChange,
  onCircleDraftChange,
  onAuthorDraftChange,
  onTagsDraftChange,
  onSubmitPackageWorkTitle,
  onSubmitPackageCircle,
  onSubmitPackageAuthor,
  onSubmitPackageTags,
  onSubmitParsedMetadata,
  onGradeChange,
  onSearchByWorkTitle,
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
    const parsedValues = flattenTagValues(parsedTagMap)
    if (parsedValues.length > 0) {
      return parsedValues
    }
    return tagsDraft
      .split(/[,，]/)
      .map((tag) => tag.trim())
      .filter((tag, index, arr) => tag.length > 0 && arr.indexOf(tag) === index)
  }, [parsedTagMap, tagsDraft])

  const sourceLabel =
    parsedDraft.sourceSite === 'nhentai'
      ? 'NH'
      : parsedDraft.sourceSite === 'ehentai'
        ? 'EH'
        : 'OTH'
  const sourceDisplayValue = parsedDraft.sourceId ? `${sourceLabel} #${parsedDraft.sourceId}` : sourceLabel

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

  const parodyValues = useMemo(() => splitTagValues(parsedTagMap.parody ?? ''), [parsedTagMap])
  const characterValues = useMemo(() => splitTagValues(parsedTagMap.character ?? ''), [parsedTagMap])
  const externalTagValues = useMemo(() => flattenTagValues(parsedTagMap), [parsedTagMap])
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
              <div
                className="metadata-image-media"
                style={{
                  background: focusedImage.color,
                  aspectRatio: `${focusedImage.width} / ${focusedImage.height}`,
                  ...imagePreviewSizing,
                }}
              >
                <span>{`${focusedImage.width > 0 && focusedImage.height > 0 ? `${focusedImage.width} x ${focusedImage.height}` : '-'}`}</span>
              </div>
            )}
          </div>
          <div className="metadata-image-caption">
            <strong>{`${focusedImagePackage?.displayName ?? '图片'} #${focusedImage.ordinal}`}</strong>
            <span>{mediaLocatorFileName(focusedImage.mediaLocator)}</span>
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
                    <span>作品名</span>
                    <button
                      type="button"
                      disabled={resolvedTitle.trim().length === 0 || resolvedTitle === '-'}
                      onClick={() => onSearchByWorkTitle(resolvedTitle.trim())}
                    >
                      {resolvedTitle}
                    </button>
                  </label>

                  <label>
                    <span>社团</span>
                    <button
                      type="button"
                      disabled={resolvedGroup.trim().length === 0 || resolvedGroup === '-'}
                      onClick={() => onSearchByCircle(resolvedGroup.trim())}
                    >
                      {resolvedGroup}
                    </button>
                  </label>

                  <label>
                    <span>作者</span>
                    <button
                      type="button"
                      disabled={resolvedAuthor.trim().length === 0 || resolvedAuthor === '-'}
                      onClick={() => onSearchByAuthor(resolvedAuthor.trim())}
                    >
                      {resolvedAuthor}
                    </button>
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
              ) : (
                <>
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

                  <label>
                    <span>来源标题</span>
                    <button
                      type="button"
                      disabled={!(parsedDraft.title.trim() && parsedDraft.titleJpn.trim())}
                      onClick={() => {
                        setPreferTitleJpn((value) => !value)
                      }}
                    >
                      {resolvedTitle}
                    </button>
                  </label>

                  <label>
                    <span>来源作者</span>
                    <button
                      type="button"
                      disabled={!(parsedDraft.artist.trim() && parsedDraft.artistJpn.trim())}
                      onClick={() => {
                        setPreferAuthorJpn((value) => !value)
                      }}
                    >
                      {resolvedAuthor}
                    </button>
                  </label>

                  <label>
                    <span>来源社团</span>
                    <button
                      type="button"
                      disabled={!(parsedDraft.group.trim() && parsedDraft.groupJpn.trim())}
                      onClick={() => {
                        setPreferGroupJpn((value) => !value)
                      }}
                    >
                      {resolvedGroup}
                    </button>
                  </label>

                  <label>
                    <span>发布时间</span>
                    <input readOnly value={parsedDraft.posted.trim() || '-'} />
                  </label>

                  <label>
                    <span>评分/收藏</span>
                    <input readOnly value={`${parsedDraft.rating.trim() || '-'} / ${parsedDraft.favorited.trim() || '-'}`} />
                  </label>

                  <label>
                    <span>Parody</span>
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
                    <span>Character</span>
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
                    <span>外部标签</span>
                    <div className="metadata-tag-chip-list">
                      {externalTagValues.length > 0
                        ? externalTagValues.map((tag) => (
                            <button key={`external-tag-${tag}`} type="button" onClick={() => onSearchByTag(tag)}>
                              {tag}
                            </button>
                          ))
                        : '-'}
                    </div>
                  </label>
                </>
              )}
            </div>
          ) : (
            <p className="metadata-empty-tip">当前无可编辑图包</p>
          )}
        </div>
      )}
    </div>
  )
}
