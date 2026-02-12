import type { ExternalMetadataResultItemDto } from '../../contracts/backend'

export interface ParsedExternalMetadata {
  source: {
    site: 'nhentai' | 'ehentai' | 'others'
    url: string
    id: string
    token: string
  }
  title: string
  title_jpn: string
  thumb: string
  artist: string
  group: string
  artist_jpn: string
  group_jpn: string
  posted: string
  rating?: string
  favorited?: string
  tags: Record<string, string>
}

interface ParsedTitleFields {
  title: string
  group: string
  artist: string
}

export function parseExternalMetadataToHitomi(source: ExternalMetadataResultItemDto): ParsedExternalMetadata {
  const raw = source.raw && typeof source.raw === 'object' ? (source.raw as Record<string, unknown>) : {}
  const sourceSite = source.source
  const sourceToken = sourceSite === 'ehentai' ? source.token?.trim() || extractEhTokenFromUrl(source.url) : ''

  const englishTitle = sourceSite === 'ehentai' ? asString(raw.title) || source.title : source.title
  const japaneseTitle = sourceSite === 'ehentai' ? asString(raw.title_jpn) || source.title_original || '' : source.title_original || ''

  const englishParsed = parseTitle(englishTitle)
  const japaneseParsed = parseTitle(japaneseTitle)

  let englishArtist = englishParsed.artist
  let englishGroup = englishParsed.group
  if (sourceSite === 'nhentai') {
    const tags = readRawTagObjects(raw)
    englishArtist = buildNamesFromTagObjects(tags, 'artist') || englishArtist
    englishGroup = buildNamesFromTagObjects(tags, 'group') || englishGroup
  }

  const output: ParsedExternalMetadata = {
    source: {
      site: sourceSite,
      url: source.url,
      id: source.id,
      token: sourceToken,
    },
    title: englishParsed.title,
    title_jpn: japaneseParsed.title,
    thumb: source.cover || '',
    artist: englishArtist,
    group: englishGroup,
    artist_jpn: japaneseParsed.artist,
    group_jpn: japaneseParsed.group,
    posted: formatPostedDate(source.posted),
    tags: normalizeTags(source),
  }

  if (sourceSite === 'ehentai') {
    output.rating = source.rating || ''
  } else {
    output.favorited = source.favorited != null ? String(source.favorited) : '0'
  }

  return output
}

function parseTitle(value: string): ParsedTitleFields {
  const fullTitle = value.trim()
  if (!fullTitle) {
    return {
      title: '',
      group: '',
      artist: '',
    }
  }

  const groupMatch = fullTitle.match(/\[([^\]]+)\]/)
  if (!groupMatch) {
    return {
      title: fullTitle,
      group: '',
      artist: '',
    }
  }

  const groupBlock = groupMatch[1].trim()
  const artistMatch = groupBlock.match(/^(.+?)\s*\((.+?)\)$/)
  const group = artistMatch ? artistMatch[1].trim() : groupBlock
  const artist = artistMatch ? artistMatch[2].trim() : ''

  const firstBracketEnd = fullTitle.indexOf(']')
  const title = firstBracketEnd >= 0 ? fullTitle.slice(firstBracketEnd + 1).trim() : fullTitle

  return {
    title,
    group,
    artist,
  }
}

function normalizeTags(source: ExternalMetadataResultItemDto): Record<string, string> {
  const rawTagStrings = source.source === 'nhentai' ? source.tags : source.tags
  const tagMap: Record<string, string> = {
    parody: '',
    character: '',
  }
  const skipNamespaces = new Set(['group', 'artist', 'category', 'language'])

  for (const tagValue of rawTagStrings) {
    const normalized = tagValue.trim()
    if (!normalized) {
      continue
    }
    const parts = normalized.split(':')
    if (parts.length < 2) {
      continue
    }

    const namespace = parts[0].trim().toLowerCase()
    if (!namespace || skipNamespaces.has(namespace)) {
      continue
    }
    const value = parts.slice(1).join(':').trim()
    if (!value) {
      continue
    }

    if (!tagMap[namespace]) {
      tagMap[namespace] = value
      continue
    }
    tagMap[namespace] = `${tagMap[namespace]}, ${value}`
  }

  return tagMap
}

function formatPostedDate(value: string | null | undefined): string {
  if (!value) {
    return ''
  }
  if (/^\d+$/.test(value)) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return new Date(parsed * 1000).toISOString().slice(0, 10)
    }
  }
  const date = new Date(value)
  if (!Number.isNaN(date.valueOf())) {
    return date.toISOString().slice(0, 10)
  }
  return value
}

function buildNamesFromTagObjects(tagObjects: Array<Record<string, unknown>>, targetType: string): string {
  const names = tagObjects
    .filter((item) => asString(item.type) === targetType)
    .map((item) => asString(item.name))
    .filter(Boolean)
  return names.join(', ')
}

function readRawTagObjects(raw: Record<string, unknown>): Array<Record<string, unknown>> {
  if (!Array.isArray(raw.tags)) {
    return []
  }
  return raw.tags.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
}

function extractEhTokenFromUrl(url: string): string {
  const matched = url.match(/\/g\/\d+\/([a-f0-9]+)/i)
  return matched?.[1] ?? ''
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}
