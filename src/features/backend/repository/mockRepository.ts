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
  type FeatureFilterDto,
  type ImageItemDto,
  type ImagePackageDto,
  type LibrarySnapshotDto,
  type ReadImageMetadataRequestDto,
  type ReadImageMetadataResponseDto,
  type ReadImagePageRequestDto,
  type ReadImagePageResponseDto,
  type ReadImageSidebarTreeRequestDto,
  type ReadImageSidebarTreeResponseDto,
  type SidebarNodeDto,
  type VideoItemDto,
} from '../../../contracts/backend'
import type { ImagePackage, SidebarNode } from '../../../types'
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

export class MockMediaRepository implements ReadonlyMediaRepository, SynchronousMediaRepository {
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
    const selectedSource =
      (request.source_id ? allSources.find((source) => source.id === request.source_id) : null) ?? allSources[0] ?? null

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
}
