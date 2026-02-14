import type { ParsedExternalMetadata } from '../../features/metadata/parseExternalMetadata'
import type { ImagePackage } from '../../types'

export type ParsedSourceSite = ParsedExternalMetadata['source']['site']

export interface ParsedMetadataDraft {
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

const MUSIC_BOOKLET_ROOT_LABEL = 'CD Booklet'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function toSourceSite(value: string): ParsedSourceSite {
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
    if (!namespace || typeof rawText !== 'string') {
      continue
    }
    tags[namespace] = rawText.trim()
  }
  return tags
}

export function formatTagJson(tags: Record<string, string>): string {
  return JSON.stringify(tags, null, 2)
}

export function parseTagJson(raw: string): Record<string, string> {
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

function resolveDefaultSourceSite(sourcePackage: ImagePackage | null): ParsedSourceSite {
  return sourcePackage?.treePath[0] === MUSIC_BOOKLET_ROOT_LABEL ? 'others' : 'nhentai'
}

export function buildParsedDraft(
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
  const defaultSourceSite = resolveDefaultSourceSite(sourcePackage)

  const merged: ParsedMetadataDraft = {
    ...EMPTY_PARSED_DRAFT,
    sourceSite: external?.sourceSite ?? rawDraft?.sourceSite ?? defaultSourceSite,
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

export function splitTagValues(raw: string): string[] {
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

export function flattenTagValuesExcluding(tags: Record<string, string>, excludedNamespaces: string[]): string[] {
  const excluded = new Set(excludedNamespaces)
  const values: string[] = []
  for (const [namespace, raw] of Object.entries(tags)) {
    if (excluded.has(namespace)) {
      continue
    }
    values.push(...splitTagValues(raw))
  }
  return Array.from(new Set(values))
}

export function joinTagValues(raw: string): string {
  return Array.from(new Set(splitTagValues(raw))).join(', ')
}

export function resolveEditableTagsValue(sourceSite: ParsedSourceSite, tags: Record<string, string>): string {
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

export function resolveEvaluationDisplayValue(draft: ParsedMetadataDraft): string {
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

export function resolveSourceSiteLabel(site: ParsedSourceSite): string {
  if (site === 'nhentai') {
    return 'Nhentai'
  }
  if (site === 'ehentai') {
    return 'Ehentai'
  }
  return 'Other'
}

export function resolveLanguageLabel(preferJpn: boolean, jpnValue: string, enValue: string): 'JP' | 'EN' | '-' {
  const jpn = jpnValue.trim()
  const en = enValue.trim()
  if (!jpn && !en) {
    return '-'
  }
  if (!jpn) {
    return 'EN'
  }
  if (!en) {
    return 'JP'
  }
  return preferJpn ? 'JP' : 'EN'
}

export async function copyTextValue(rawValue: string): Promise<void> {
  const value = rawValue.trim()
  if (!value) {
    return
  }

  const clipboard = globalThis.navigator?.clipboard
  if (clipboard?.writeText) {
    await clipboard.writeText(value)
    return
  }

  if (typeof document === 'undefined') {
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

export function updateTagNamespace(
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

export function updateSourceTagsBySite(
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

export function toParsedPayload(draft: ParsedMetadataDraft): ParsedExternalMetadata {
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
