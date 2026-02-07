import {
  buildImageSidebarTree,
  IMAGE_DIRECTORY_SOURCES,
  IMAGE_PACKAGES,
  VIDEO_ITEMS,
} from '../../../mockData'
import {
  librarySnapshotDtoSchema,
  readImageMetadataResponseSchema,
  readImagePageResponseSchema,
  readImageSidebarTreeResponseSchema,
  resolveMediaResourceResponseSchema,
  mediaAccessAuditResponseSchema,
  readPlaylistResponseSchema,
  saveVideoCoverResponseSchema,
  writePlaylistResponseSchema,
  writePackageGradeResponseSchema,
  type FeatureFilterDto,
  type ImageItemDto,
  type ImagePackageDto,
  type LibrarySnapshotDto,
  type MediaAccessAuditResponseDto,
  type MediaLocatorDto,
  type ReadImageMetadataRequestDto,
  type ReadImageMetadataResponseDto,
  type ReadPlaylistResponseDto,
  type ReadImagePageRequestDto,
  type ReadImagePageResponseDto,
  type ReadImageSidebarTreeRequestDto,
  type ReadImageSidebarTreeResponseDto,
  type ResolveMediaResourceRequestDto,
  type ResolveMediaResourceResponseDto,
  type SaveVideoCoverRequestDto,
  type SaveVideoCoverResponseDto,
  type SidebarNodeDto,
  type VideoItemDto,
  type WritePlaylistRequestDto,
  type WritePlaylistResponseDto,
  type WritePackageGradeRequestDto,
  type WritePackageGradeResponseDto,
} from '../../../contracts/backend'
import type { ImagePackage, MediaLocator, SidebarNode } from '../../../types'
import type {
  ReadonlyMediaRepository,
  RepositoryRequestOptions,
  SynchronousMediaRepository,
} from './types'

const MOCK_LIBRARY_SNAPSHOT: LibrarySnapshotDto = librarySnapshotDtoSchema.parse({
  image_packages: IMAGE_PACKAGES.map(toImagePackageDto),
  image_directories: IMAGE_DIRECTORY_SOURCES.map(toImagePackageDto),
  videos: VIDEO_ITEMS.map(toVideoItemDto),
})

function toMediaLocatorDto(locator: MediaLocator): MediaLocatorDto {
  if (locator.kind === 'filesystem') {
    return {
      kind: 'filesystem',
      absolute_path: locator.absolutePath,
      extension: locator.extension,
      media_type: locator.mediaType,
      mime_type: locator.mimeType,
    }
  }

  return {
    kind: 'archive-entry',
    archive_path: locator.archivePath,
    archive_format: locator.archiveFormat,
    entry_name: locator.entryName,
    extension: locator.extension,
    media_type: locator.mediaType,
    mime_type: locator.mimeType,
  }
}

function toMediaLocatorViewModel(locator: MediaLocatorDto): MediaLocator {
  if (locator.kind === 'filesystem') {
    return {
      kind: 'filesystem',
      absolutePath: locator.absolute_path,
      extension: locator.extension,
      mediaType: locator.media_type,
      mimeType: locator.mime_type,
    }
  }

  return {
    kind: 'archive-entry',
    archivePath: locator.archive_path,
    archiveFormat: locator.archive_format,
    entryName: locator.entry_name,
    extension: locator.extension,
    mediaType: locator.media_type,
    mimeType: locator.mime_type,
  }
}

function toImageItemDto(item: ImagePackage['images'][number]): ImageItemDto {
  return {
    id: item.id,
    ordinal: item.ordinal,
    width: item.width,
    height: item.height,
    size_kb: item.sizeKb,
    cluster: item.cluster,
    color: item.color,
    feature_vector: [...item.featureVector],
    media_locator: toMediaLocatorDto(item.mediaLocator),
  }
}

function toImagePackageDto(source: ImagePackage): ImagePackageDto {
  return {
    id: source.id,
    package_name: source.packageName,
    display_name: source.displayName,
    absolute_path: source.absolutePath,
    tree_path: [...source.treePath],
    work_title: source.workTitle,
    circle: source.circle,
    author: source.author,
    tags: [...source.tags],
    mock_grade: source.mockGrade ?? null,
    images: source.images.map(toImageItemDto),
  }
}

function toVideoItemDto(video: (typeof VIDEO_ITEMS)[number]): VideoItemDto {
  return {
    id: video.id,
    file_name: video.fileName,
    absolute_path: video.absolutePath,
    tree_path: [...video.treePath],
    duration_sec: video.durationSec,
    width: video.width,
    height: video.height,
    size_mb: video.sizeMb,
    cover_color: video.coverColor,
    media_locator: toMediaLocatorDto(video.mediaLocator),
  }
}

function toSidebarNodeDto(node: SidebarNode): SidebarNodeDto {
  return {
    id: node.id,
    label: node.label,
    kind: node.kind,
    children: node.children.map(toSidebarNodeDto),
    package_id: node.packageId,
    video_id: node.videoId,
    image_source_id: node.imageSourceId,
    direct_image_count: node.directImageCount,
    path_key: node.pathKey,
  }
}

function toImagePackageViewModel(dto: ImagePackageDto): ImagePackage {
  return {
    id: dto.id,
    packageName: dto.package_name,
    displayName: dto.display_name,
    absolutePath: dto.absolute_path,
    treePath: [...dto.tree_path],
    workTitle: dto.work_title,
    circle: dto.circle,
    author: dto.author,
    tags: [...dto.tags],
    mockGrade: dto.mock_grade ?? undefined,
    images: dto.images.map((item) => ({
      id: item.id,
      ordinal: item.ordinal,
      width: item.width,
      height: item.height,
      sizeKb: item.size_kb,
      cluster: item.cluster,
      color: item.color,
      featureVector: [...item.feature_vector],
      mediaLocator: toMediaLocatorViewModel(item.media_locator),
    })),
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) {
    return
  }

  const abortError = new Error('请求已取消')
  abortError.name = 'AbortError'
  throw abortError
}

function normalizeFeatureFilter(filter: FeatureFilterDto): FeatureFilterDto {
  return {
    name_query: filter.name_query.trim().toLowerCase(),
    work_title_query: filter.work_title_query.trim().toLowerCase(),
    circle_query: filter.circle_query.trim().toLowerCase(),
    author_query: filter.author_query.trim().toLowerCase(),
    tags: filter.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean),
    grade: filter.grade,
  }
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

function matchesFeatureFilter(
  source: ImagePackageDto,
  filter: FeatureFilterDto,
  gradeOverrides?: Record<string, number | null>,
): boolean {
  if (filter.name_query) {
    const nameMatched = [source.package_name, source.display_name].some((text) =>
      text.toLowerCase().includes(filter.name_query),
    )
    if (!nameMatched) {
      return false
    }
  }

  if (filter.work_title_query && !source.work_title.toLowerCase().includes(filter.work_title_query)) {
    return false
  }

  if (filter.circle_query && !source.circle.toLowerCase().includes(filter.circle_query)) {
    return false
  }

  if (filter.author_query && !source.author.toLowerCase().includes(filter.author_query)) {
    return false
  }

  if (filter.tags.length > 0) {
    const lowerTags = source.tags.map((tag) => tag.toLowerCase())
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

function filterSources(
  request: Pick<ReadImageSidebarTreeRequestDto, 'feature_filter' | 'grade_overrides'>,
): {
  imagePackages: ImagePackageDto[]
  imageDirectories: ImagePackageDto[]
} {
  const normalized = normalizeFeatureFilter(request.feature_filter)
  const gradeOverrides = request.grade_overrides

  return {
    imagePackages: MOCK_LIBRARY_SNAPSHOT.image_packages.filter((source) =>
      matchesFeatureFilter(source, normalized, gradeOverrides),
    ),
    imageDirectories: MOCK_LIBRARY_SNAPSHOT.image_directories.filter((source) =>
      matchesFeatureFilter(source, normalized, gradeOverrides),
    ),
  }
}

async function resolveAsync<T>(value: T, options?: RepositoryRequestOptions): Promise<T> {
  throwIfAborted(options?.signal)
  await Promise.resolve()
  throwIfAborted(options?.signal)
  return value
}

function locatorPathKey(locator: MediaLocatorDto): string {
  if (locator.kind === 'filesystem') {
    return `fs:${locator.absolute_path}`
  }
  return `archive:${locator.archive_path}::${locator.entry_name}`
}

function hashLocator(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function toMockImageDataUrl(locator: MediaLocatorDto): string {
  const key = locatorPathKey(locator)
  const hash = hashLocator(key)
  const hue = hash % 360
  const label = locator.kind === 'filesystem' ? locator.absolute_path : `${locator.archive_path}::${locator.entry_name}`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="hsl(${hue} 72% 46%)"/><stop offset="100%" stop-color="hsl(${(hue + 36) % 360} 72% 28%)"/></linearGradient></defs><rect width="1280" height="720" fill="url(#g)"/><text x="50%" y="46%" text-anchor="middle" fill="white" font-size="44" font-family="Segoe UI, sans-serif">Mock Image</text><text x="50%" y="56%" text-anchor="middle" fill="rgba(255,255,255,0.86)" font-size="22" font-family="Consolas, monospace">${label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function toDeterministicCoverColor(videoId: string): string {
  const hash = hashLocator(videoId)
  return `hsl(${hash % 360}, 44%, 40%)`
}

export class MockMediaRepository implements ReadonlyMediaRepository, SynchronousMediaRepository {
  private playlistIds = MOCK_LIBRARY_SNAPSHOT.videos.slice(0, 3).map((video) => video.id)

  getInitialLibrarySnapshot(): LibrarySnapshotDto {
    return MOCK_LIBRARY_SNAPSHOT
  }

  async readLibrarySnapshot(options?: RepositoryRequestOptions): Promise<LibrarySnapshotDto> {
    return resolveAsync(MOCK_LIBRARY_SNAPSHOT, options)
  }

  readImageSidebarTreeSync(
    request: ReadImageSidebarTreeRequestDto,
  ): ReadImageSidebarTreeResponseDto {
    const filtered = filterSources(request)
    const tree = buildImageSidebarTree(
      filtered.imagePackages.map(toImagePackageViewModel),
      filtered.imageDirectories.map(toImagePackageViewModel),
    ).map(toSidebarNodeDto)

    return readImageSidebarTreeResponseSchema.parse({
      image_packages: filtered.imagePackages,
      image_directories: filtered.imageDirectories,
      tree,
    })
  }

  async readImageSidebarTree(
    request: ReadImageSidebarTreeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadImageSidebarTreeResponseDto> {
    const response = this.readImageSidebarTreeSync(request)

    return resolveAsync(response, options)
  }

  readImagePageSync(
    request: ReadImagePageRequestDto,
  ): ReadImagePageResponseDto {
    const filtered = filterSources({
      feature_filter: request.feature_filter,
      grade_overrides: request.grade_overrides,
    })

    const allSources = [...filtered.imagePackages, ...filtered.imageDirectories]
    const selectedById = request.source_id ? allSources.find((source) => source.id === request.source_id) : null
    const selectedSource = selectedById ?? allSources.find((source) => source.images.length > 0) ?? allSources[0] ?? null

    if (!selectedSource) {
      return readImagePageResponseSchema.parse({
        source_id: null,
        total_items: 0,
        page_index: 0,
        page_size: request.page_size,
        refs: [],
      })
    }

    const totalItems = selectedSource.images.length
    const pageSize = request.show_names_only ? Math.max(1, totalItems) : request.page_size
    const maxPageIndex = Math.max(0, Math.ceil(totalItems / pageSize) - 1)
    const pageIndex = request.show_names_only ? 0 : Math.min(request.page_index, maxPageIndex)
    const pageStart = pageIndex * pageSize
    const pageEnd = pageStart + pageSize

    const refs = selectedSource.images
      .slice(pageStart, pageEnd)
      .map((_: ImageItemDto, index: number) => ({
        package_id: selectedSource.id,
        image_index: pageStart + index,
      }))

    return readImagePageResponseSchema.parse({
      source_id: selectedSource.id,
      total_items: totalItems,
      page_index: pageIndex,
      page_size: request.page_size,
      refs,
    })
  }

  async readImagePage(
    request: ReadImagePageRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadImagePageResponseDto> {
    const response = this.readImagePageSync(request)

    return resolveAsync(response, options)
  }

  readImageMetadataSync(
    request: ReadImageMetadataRequestDto,
  ): ReadImageMetadataResponseDto {
    const allSources = [...MOCK_LIBRARY_SNAPSHOT.image_packages, ...MOCK_LIBRARY_SNAPSHOT.image_directories]
    const source = allSources.find((item) => item.id === request.package_id)
    const image = source?.images[request.image_index]

    return readImageMetadataResponseSchema.parse(
      source && image
        ? {
            package: source,
            image,
            grade: source.mock_grade,
          }
        : null,
    )
  }

  async readImageMetadata(
    request: ReadImageMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadImageMetadataResponseDto> {
    const response = this.readImageMetadataSync(request)

    return resolveAsync(response, options)
  }

  resolveMediaResourceSync(
    request: ResolveMediaResourceRequestDto,
  ): ResolveMediaResourceResponseDto {
    const response =
      request.locator.media_type === 'image'
        ? {
            resource_url: toMockImageDataUrl(request.locator),
            mime_type: request.locator.mime_type,
            expires_at_ms: Date.now() + 600_000,
          }
        : {
            resource_url: `about:blank#mock-video-${encodeURIComponent(locatorPathKey(request.locator))}`,
            mime_type: request.locator.mime_type,
            expires_at_ms: Date.now() + 600_000,
          }

    return resolveMediaResourceResponseSchema.parse(response)
  }

  async resolveMediaResource(
    request: ResolveMediaResourceRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ResolveMediaResourceResponseDto> {
    const response = this.resolveMediaResourceSync(request)
    return resolveAsync(response, options)
  }

  writePackageGradeSync(
    request: WritePackageGradeRequestDto,
  ): WritePackageGradeResponseDto {
    const allSources = [...MOCK_LIBRARY_SNAPSHOT.image_packages, ...MOCK_LIBRARY_SNAPSHOT.image_directories]
    const source = allSources.find((item) => item.id === request.package_id)
    if (!source) {
      throw new Error(`mock 仓库写入评分失败：source 不存在 ${request.package_id}`)
    }

    source.mock_grade = request.grade
    return writePackageGradeResponseSchema.parse({
      package_id: request.package_id,
      grade: request.grade,
      updated_at_ms: Date.now(),
    })
  }

  async writePackageGrade(
    request: WritePackageGradeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePackageGradeResponseDto> {
    const response = this.writePackageGradeSync(request)
    return resolveAsync(response, options)
  }

  saveVideoCoverSync(
    request: SaveVideoCoverRequestDto,
  ): SaveVideoCoverResponseDto {
    const video = MOCK_LIBRARY_SNAPSHOT.videos.find((item) => item.id === request.video_id)
    if (!video) {
      throw new Error(`mock 仓库保存封面失败：video 不存在 ${request.video_id}`)
    }

    const coverColor = request.fallback_color ?? video.cover_color ?? toDeterministicCoverColor(request.video_id)
    video.cover_color = coverColor

    return saveVideoCoverResponseSchema.parse({
      video_id: request.video_id,
      cover_color: coverColor,
      cover_image_path: null,
      updated_at_ms: Date.now(),
    })
  }

  async saveVideoCover(
    request: SaveVideoCoverRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SaveVideoCoverResponseDto> {
    const response = this.saveVideoCoverSync(request)
    return resolveAsync(response, options)
  }

  readPlaylistSync(): ReadPlaylistResponseDto {
    return readPlaylistResponseSchema.parse({
      video_ids: this.playlistIds,
    })
  }

  async readPlaylist(options?: RepositoryRequestOptions): Promise<ReadPlaylistResponseDto> {
    const response = this.readPlaylistSync()
    return resolveAsync(response, options)
  }

  writePlaylistSync(request: WritePlaylistRequestDto): WritePlaylistResponseDto {
    const validVideoIds = new Set(MOCK_LIBRARY_SNAPSHOT.videos.map((video) => video.id))
    this.playlistIds = Array.from(new Set(request.video_ids)).filter((id) => validVideoIds.has(id))
    return writePlaylistResponseSchema.parse({
      video_ids: this.playlistIds,
      updated_at_ms: Date.now(),
    })
  }

  async writePlaylist(
    request: WritePlaylistRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePlaylistResponseDto> {
    const response = this.writePlaylistSync(request)
    return resolveAsync(response, options)
  }

  readMediaAccessAuditSync(): MediaAccessAuditResponseDto {
    return mediaAccessAuditResponseSchema.parse({
      resolve_requests: 0,
      resolve_granted: 0,
      resolve_denied_total: 0,
      resolve_denied_by_reason: {},
      token_reads: 0,
      token_hits: 0,
      token_misses: 0,
      token_expired: 0,
      token_cleanup_removed: 0,
      token_active: 0,
      generated_at_ms: Date.now(),
    })
  }

  async readMediaAccessAudit(
    options?: RepositoryRequestOptions,
  ): Promise<MediaAccessAuditResponseDto> {
    const response = this.readMediaAccessAuditSync()
    return resolveAsync(response, options)
  }
}
