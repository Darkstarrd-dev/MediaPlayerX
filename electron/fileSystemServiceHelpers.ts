import { createHash } from 'node:crypto'
import path from 'node:path'

import type { FeatureFilterDto, ImagePackageDto } from '../src/contracts/backend'

export function normalizePathKey(value: string): string {
  return value.split(path.sep).join('/')
}

export function normalizeAllowlistKey(value: string): string {
  const resolved = normalizePathKey(path.resolve(value))
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved
}

export function makeStableId(prefix: string, value: string): string {
  const hash = createHash('sha1').update(value).digest('hex').slice(0, 12)
  return `${prefix}-${hash}`
}

export function toAbsoluteTreePath(targetPath: string): string[] {
  const resolved = normalizePathKey(path.resolve(targetPath))

  if (/^[a-zA-Z]:\//.test(resolved)) {
    const drive = resolved.slice(0, 2)
    const rest = resolved.slice(3)
    const segments = rest
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean)
    return segments.length > 0 ? [drive, ...segments] : [drive]
  }

  if (resolved.startsWith('//')) {
    const parts = resolved
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean)
    if (parts.length >= 2) {
      const uncRoot = `//${parts[0]}/${parts[1]}`
      return parts.length > 2 ? [uncRoot, ...parts.slice(2)] : [uncRoot]
    }
    return [resolved]
  }

  if (resolved.startsWith('/')) {
    const parts = resolved
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean)
    return parts.length > 0 ? ['/', ...parts] : ['/']
  }

  const parts = resolved
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
  return parts.length > 0 ? parts : [path.basename(targetPath)]
}

export function toSafeSizeKb(sizeBytes: number): number {
  return Math.max(0, Math.ceil(sizeBytes / 1024))
}

export function toSafeSizeMb(sizeBytes: number): number {
  return Math.max(0, Math.ceil(sizeBytes / (1024 * 1024)))
}

function pickSourceGrade(
  sourceId: string,
  sourceFallbackGrade: number | null,
  gradeOverrides?: Record<string, number | null>,
): number | null {
  if (!gradeOverrides) {
    return sourceFallbackGrade
  }

  return sourceId in gradeOverrides ? gradeOverrides[sourceId] ?? null : sourceFallbackGrade
}

export function normalizeFeatureFilter(filter: FeatureFilterDto): FeatureFilterDto {
  return {
    name_query: filter.name_query.trim().toLowerCase(),
    work_title_query: filter.work_title_query.trim().toLowerCase(),
    series_id_query: filter.series_id_query.trim().toLowerCase(),
    circle_query: filter.circle_query.trim().toLowerCase(),
    author_query: filter.author_query.trim().toLowerCase(),
    tags: filter.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean),
    grade: filter.grade,
  }
}

export function matchesFeatureFilter(
  source: ImagePackageDto,
  filter: FeatureFilterDto,
  gradeOverrides?: Record<string, number | null>,
): boolean {
  const external = source.external_metadata

  if (filter.name_query) {
    const matched = [source.package_name, source.display_name].some((text) =>
      text.toLowerCase().includes(filter.name_query),
    )
    if (!matched) {
      return false
    }
  }

  if (filter.work_title_query) {
    const matched = [source.work_title, external?.title ?? '', external?.title_jpn ?? ''].some((value) =>
      value.toLowerCase().includes(filter.work_title_query),
    )
    if (!matched) {
      return false
    }
  }

  if (filter.series_id_query) {
    const matched = (source.series_id ?? '').toLowerCase().includes(filter.series_id_query)
    if (!matched) {
      return false
    }
  }

  if (filter.circle_query) {
    const matched = [source.circle, external?.group_name ?? '', external?.group_name_jpn ?? ''].some((value) =>
      value.toLowerCase().includes(filter.circle_query),
    )
    if (!matched) {
      return false
    }
  }

  if (filter.author_query) {
    const matched = [source.author, external?.artist ?? '', external?.artist_jpn ?? ''].some((value) =>
      value.toLowerCase().includes(filter.author_query),
    )
    if (!matched) {
      return false
    }
  }

  if (filter.tags.length > 0) {
    const externalTags = external
      ? Object.entries(external.tags)
          .flatMap(([namespace, raw]) =>
            raw
              .split(',')
              .map((value) => value.trim())
              .filter(Boolean)
              .flatMap((value) => [value, `${namespace}:${value}`]),
          )
      : []
    const lowerTags = [...source.tags, ...externalTags].map((tag) => tag.toLowerCase())
    const tagsMatched = filter.tags.every((tag) => lowerTags.includes(tag))
    if (!tagsMatched) {
      return false
    }
  }

  if (filter.grade !== null) {
    const gradeValue = pickSourceGrade(source.id, source.mock_grade, gradeOverrides) ?? 0
    if (gradeValue !== filter.grade) {
      return false
    }
  }

  return true
}

export function normalizeMetadataText(value: string, fallback: string): string {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : fallback
}

export function normalizeMetadataTags(tags: string[]): string[] {
  const next = new Set<string>()
  for (const rawTag of tags) {
    const normalized = rawTag.trim()
    if (normalized.length > 0) {
      next.add(normalized)
    }
  }
  return Array.from(next)
}

export function syncPackageNameFromWorkTitle(
  source: ImagePackageDto,
  workTitle: string,
): { packageName: string; displayName: string } {
  const fileName = path.basename(source.absolute_path)
  const extension = path.extname(fileName)

  if (extension.length > 0) {
    return {
      packageName: `${workTitle}${extension}`,
      displayName: workTitle,
    }
  }

  return {
    packageName: workTitle,
    displayName: workTitle,
  }
}

export function deriveVideoWorkTitleFromFileName(fileName: string): string {
  const extension = path.extname(fileName)
  if (extension.length <= 0) {
    return fileName
  }
  return fileName.slice(0, -extension.length)
}

export function isPathInsideRoot(rootDir: string, absolutePath: string): boolean {
  const relative = path.relative(rootDir, absolutePath)
  if (relative.length === 0) {
    return true
  }
  return !relative.startsWith('..') && !path.isAbsolute(relative)
}

export function detectMimeTypeByExtension(
  extension: string,
  mediaType: 'image' | 'video' | 'audio' | 'subtitle',
): string {
  const lowerExt = extension.toLowerCase()
  if (mediaType === 'image') {
    if (lowerExt === '.jpg' || lowerExt === '.jpeg') {
      return 'image/jpeg'
    }
    if (lowerExt === '.png') {
      return 'image/png'
    }
    if (lowerExt === '.webp') {
      return 'image/webp'
    }
    if (lowerExt === '.gif') {
      return 'image/gif'
    }
    if (lowerExt === '.bmp') {
      return 'image/bmp'
    }
    return 'application/octet-stream'
  }

  if (mediaType === 'video') {
    if (lowerExt === '.mp4') {
      return 'video/mp4'
    }
    if (lowerExt === '.webm') {
      return 'video/webm'
    }
    if (lowerExt === '.mkv') {
      return 'video/x-matroska'
    }
    if (lowerExt === '.mov') {
      return 'video/quicktime'
    }
    return 'application/octet-stream'
  }

  if (mediaType === 'audio') {
    if (lowerExt === '.mp3') {
      return 'audio/mpeg'
    }
    if (lowerExt === '.flac') {
      return 'audio/flac'
    }
    if (lowerExt === '.wav') {
      return 'audio/wav'
    }
    if (lowerExt === '.ogg') {
      return 'audio/ogg'
    }
    if (lowerExt === '.m4a') {
      return 'audio/mp4'
    }
    if (lowerExt === '.opus') {
      return 'audio/opus'
    }
    if (lowerExt === '.aac') {
      return 'audio/aac'
    }
    if (lowerExt === '.ape') {
      return 'audio/ape'
    }
    if (lowerExt === '.wv') {
      return 'audio/wavpack'
    }
    if (lowerExt === '.tta') {
      return 'audio/x-tta'
    }
    if (lowerExt === '.tak') {
      return 'audio/x-tak'
    }
    if (lowerExt === '.shn') {
      return 'audio/x-shorten'
    }
    if (lowerExt === '.dsf') {
      return 'audio/x-dsf'
    }
    if (lowerExt === '.dff') {
      return 'audio/x-dff'
    }
    if (lowerExt === '.iso') {
      return 'application/x-iso9660-image'
    }
    return 'application/octet-stream'
  }

  if (lowerExt === '.vtt') {
    return 'text/vtt'
  }
  if (lowerExt === '.srt') {
    return 'application/x-subrip'
  }
  if (lowerExt === '.ass' || lowerExt === '.ssa') {
    return 'text/x-ssa'
  }
  return 'application/octet-stream'
}

export function toSafeFsName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+/, '').slice(0, 96) || 'archive'
}

export function toDeterministicCoverColor(videoId: string): string {
  const hash = makeStableId('cover', videoId)
  let hue = 0
  for (let index = 0; index < hash.length; index += 1) {
    hue = (hue * 31 + hash.charCodeAt(index)) % 360
  }
  return `hsl(${hue}, 44%, 40%)`
}
