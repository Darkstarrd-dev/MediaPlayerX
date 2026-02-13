import {
  type FeatureFilterDto,
  type ImagePackageDto,
  type MediaLocatorDto,
  type ReadImageSidebarTreeRequestDto,
} from '../../../../contracts/backend'
import { type RepositoryRequestOptions } from '../types'
import { MOCK_LIBRARY_SNAPSHOT_REF } from './types'

export async function resolveAsync<T>(value: T, options?: RepositoryRequestOptions): Promise<T> {
  throwIfAborted(options?.signal)
  await Promise.resolve()
  throwIfAborted(options?.signal)
  return value
}


export function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) {
    return
  }

  const abortError = new Error('请求已取消')
  abortError.name = 'AbortError'
  throw abortError
}

export function normalizeTextValue(value: string, fallback: string): string {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : fallback
}

export function normalizeTags(tags: string[]): string[] {
  const next = new Set<string>()
  for (const rawTag of tags) {
    const normalized = rawTag.trim()
    if (normalized.length > 0) {
      next.add(normalized)
    }
  }
  return Array.from(next)
}

export function deriveWorkTitleFromFileName(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex <= 0) {
    return fileName
  }
  return fileName.slice(0, dotIndex)
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

export function pickSourceGrade(
  sourceId: string,
  sourceFallbackGrade: number | null,
  gradeOverrides?: Record<string, number | null>,
): number | null {
  if (!gradeOverrides) {
    return sourceFallbackGrade
  }

  return sourceId in gradeOverrides ? gradeOverrides[sourceId] ?? null : sourceFallbackGrade
}

export function matchesFeatureFilter(
  source: ImagePackageDto,
  filter: FeatureFilterDto,
  gradeOverrides?: Record<string, number | null>,
): boolean {
  const external = source.external_metadata

  if (filter.name_query) {
    const nameMatched = [source.package_name, source.display_name].some((text) =>
      text.toLowerCase().includes(filter.name_query),
    )
    if (!nameMatched) {
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

export function filterSources(
  request: Pick<ReadImageSidebarTreeRequestDto, 'feature_filter' | 'grade_overrides'>,
): {
  imagePackages: ImagePackageDto[]
  imageDirectories: ImagePackageDto[]
} {
  const snapshot = MOCK_LIBRARY_SNAPSHOT_REF.current
  if (!snapshot) {
    return { imagePackages: [], imageDirectories: [] }
  }

  const normalized = normalizeFeatureFilter(request.feature_filter)
  const gradeOverrides = request.grade_overrides

  return {
    imagePackages: snapshot.image_packages.filter((source) =>
      matchesFeatureFilter(source, normalized, gradeOverrides),
    ),
    imageDirectories: snapshot.image_directories.filter((source) =>
      matchesFeatureFilter(source, normalized, gradeOverrides),
    ),
  }
}

export function filterHiddenImagesForSource(source: ImagePackageDto, includeHidden: boolean): ImagePackageDto {
  if (includeHidden) {
    return source
  }

  const visibleImages = source.images.filter((image) => !(image.hidden ?? false))
  if (visibleImages.length === source.images.length) {
    return source
  }

  return {
    ...source,
    images: visibleImages,
  }
}

export function filterHiddenSources(
  sources: ImagePackageDto[],
  includeHidden: boolean,
): ImagePackageDto[] {
  if (includeHidden) {
    return sources
  }

  return sources
    .map((source) => filterHiddenImagesForSource(source, includeHidden))
    .filter((source) => source.images.length > 0)
}

export function locatorPathKey(locator: MediaLocatorDto): string {
  if (locator.kind === 'filesystem') {
    return `fs:${locator.absolute_path}`
  }
  return `archive:${locator.archive_path}::${locator.entry_name}`
}

export function hashLocator(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function syncPackageNameFromWorkTitle(source: ImagePackageDto, workTitle: string): { packageName: string; displayName: string } {
  const fileName = source.absolute_path.split(/[\\/]/).pop() ?? source.package_name
  const dotIndex = fileName.lastIndexOf('.')
  const extension = dotIndex > 0 ? fileName.slice(dotIndex) : ''

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

export function normalizePathKeyForMatch(pathSegments: string[]): string {
  return pathSegments.join('/')
}

export function pathHasPrefix(pathValue: string, prefix: string): boolean {
  if (pathValue === prefix) {
    return true
  }
  return pathValue.startsWith(`${prefix}/`)
}

export function renumberSourceImages(source: ImagePackageDto): void {
  source.images.forEach((image, index) => {
    image.ordinal = index + 1
  })
}

export function parseSidebarNodePath(nodeId: string): {
  kind: 'folder' | 'package' | 'video'
  pathKey: string
} | null {
  const delimiterIndex = nodeId.indexOf(':')
  if (delimiterIndex <= 0) {
    return null
  }

  const kind = nodeId.slice(0, delimiterIndex)
  if (kind !== 'folder' && kind !== 'package' && kind !== 'video') {
    return null
  }

  const pathKey = nodeId.slice(delimiterIndex + 1)
  if (pathKey.length === 0) {
    return null
  }

  return {
    kind,
    pathKey,
  }
}

export function toMockImageDataUrl(locator: MediaLocatorDto): string {
  const key = locatorPathKey(locator)
  const hash = hashLocator(key)
  const hue = hash % 360
  const label = locator.kind === 'filesystem' ? locator.absolute_path : `${locator.archive_path}::${locator.entry_name}`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="hsl(${hue} 72% 46%)"/><stop offset="100%" stop-color="hsl(${(hue + 36) % 360} 72% 28%)"/></linearGradient></defs><rect width="1280" height="720" fill="url(#g)"/><text x="50%" y="46%" text-anchor="middle" fill="white" font-size="44" font-family="Segoe UI, sans-serif">Mock Image</text><text x="50%" y="56%" text-anchor="middle" fill="rgba(255,255,255,0.86)" font-size="22" font-family="Consolas, monospace">${label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export function toDeterministicCoverColor(videoId: string): string {
  const hash = hashLocator(videoId)
  return `hsl(${hash % 360}, 44%, 40%)`
}
