import {
  buildImageSidebarTree,
  IMAGE_DIRECTORY_SOURCES,
  IMAGE_PACKAGES,
  VIDEO_ITEMS,
} from '../../../mockData'
import {
  clearDatabaseResponseSchema,
  deleteImageItemsResponseSchema,
  deleteSidebarNodesResponseSchema,
  manageAdReviewTaskExecutionSchema,
  startManageAdReviewResponseSchema,
  readManageAdReviewTaskResponseSchema,
  pauseManageAdReviewTaskResponseSchema,
  testAdReviewVisionModelResponseSchema,
  confirmManageAdReviewDeleteResponseSchema,
  enqueueImportTaskResponseSchema,
  librarySnapshotDtoSchema,
  pickImportPathsResponseSchema,
  pickFilePathResponseSchema,
  pickDirectoryPathResponseSchema,
  readClipboardImportPathsResponseSchema,
  readImportTasksResponseSchema,
  readRuntimeCapabilitiesResponseSchema,
  readImageMetadataResponseSchema,
  readImagePageResponseSchema,
  readImageSidebarTreeResponseSchema,
  resolveMediaResourceResponseSchema,
  mediaAccessAuditResponseSchema,
  readPlaylistResponseSchema,
  retryImportTaskResponseSchema,
  saveVideoCoverResponseSchema,
  setImageHiddenResponseSchema,
  writePlaylistResponseSchema,
  writePackageMetadataResponseSchema,
  writePackageExternalMetadataResponseSchema,
  searchExternalMetadataResponseSchema,
  writeVideoMetadataResponseSchema,
  writePackageGradeResponseSchema,
  type ReadAppStateRequestDto,
  type ReadAppStateResponseDto,
  type WriteAppStateRequestDto,
  type WriteAppStateResponseDto,
  type EnqueueImportTaskRequestDto,
  type EnqueueImportTaskResponseDto,
  type ClearDatabaseResponseDto,
  type FeatureFilterDto,
  type DeleteImageItemsRequestDto,
  type DeleteImageItemsResponseDto,
  type DeleteSidebarNodesRequestDto,
  type DeleteSidebarNodesResponseDto,
  type StartManageAdReviewRequestDto,
  type StartManageAdReviewResponseDto,
  type ReadManageAdReviewTaskRequestDto,
  type ReadManageAdReviewTaskResponseDto,
  type PauseManageAdReviewTaskRequestDto,
  type PauseManageAdReviewTaskResponseDto,
  type TestAdReviewVisionModelRequestDto,
  type TestAdReviewVisionModelResponseDto,
  type ConfirmManageAdReviewDeleteRequestDto,
  type ConfirmManageAdReviewDeleteResponseDto,
  type ManageAdReviewImageSourceDto,
  type ManageAdReviewSourceDistributionDto,
  type ManageAdReviewTaskAuditDto,
  type ManageAdReviewTaskDto,
  type ManageAdReviewTaskExecutionDto,
  type ImageItemDto,
  type ImagePackageDto,
  type ImportTaskDto,
  type LibrarySnapshotDto,
  type MediaAccessAuditResponseDto,
  type MediaLocatorDto,
  type PickImportPathsRequestDto,
  type PickImportPathsResponseDto,
  type PickFilePathRequestDto,
  type PickFilePathResponseDto,
  type PickDirectoryPathRequestDto,
  type PickDirectoryPathResponseDto,
  type ReadClipboardImportPathsResponseDto,
  type ReadImportTasksResponseDto,
  type ReadRuntimeCapabilitiesResponseDto,
  type ReadImageMetadataRequestDto,
  type ReadImageMetadataResponseDto,
  type ReadPlaylistResponseDto,
  type ReadImagePageRequestDto,
  type ReadImagePageResponseDto,
  type ReadImageSidebarTreeRequestDto,
  type ReadImageSidebarTreeResponseDto,
  type ResolveMediaResourceRequestDto,
  type ResolveMediaResourceResponseDto,
  type RetryImportTaskRequestDto,
  type RetryImportTaskResponseDto,
  type SaveVideoCoverRequestDto,
  type SaveVideoCoverResponseDto,
  type SetImageHiddenRequestDto,
  type SetImageHiddenResponseDto,
  type SidebarNodeDto,
  type VideoItemDto,
  type WritePlaylistRequestDto,
  type WritePlaylistResponseDto,
  type WritePackageMetadataRequestDto,
  type WritePackageMetadataResponseDto,
  type WritePackageExternalMetadataRequestDto,
  type WritePackageExternalMetadataResponseDto,
  type SearchExternalMetadataRequestDto,
  type SearchExternalMetadataResponseDto,
  type WriteVideoMetadataRequestDto,
  type WriteVideoMetadataResponseDto,
  type WritePackageGradeRequestDto,
  type WritePackageGradeResponseDto,
} from '../../../contracts/backend'
import type { ImagePackage, MediaLocator, SidebarNode } from '../../../types'
import type {
  MediaRepository,
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
    media_locator: toMediaLocatorDto(item.mediaLocator),
    hidden: item.hidden ?? false,
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
  const fallbackWorkTitle = deriveWorkTitleFromFileName(video.fileName)
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
    cover_image_path: video.coverImagePath ?? null,
    work_title: video.workTitle ?? fallbackWorkTitle,
    circle: video.circle ?? '未知',
    author: video.author ?? '未知',
    tags: [...(video.tags ?? [])],
    grade: video.grade ?? null,
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
    image_node_type: node.imageNodeType,
    direct_image_count: node.directImageCount,
    descendant_package_count: node.descendantPackageCount,
    descendant_image_count: node.descendantImageCount,
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
      mediaLocator: toMediaLocatorViewModel(item.media_locator),
      hidden: item.hidden ?? false,
    })),
  }
}

function normalizeTextValue(value: string, fallback: string): string {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : fallback
}

function normalizeTags(tags: string[]): string[] {
  const next = new Set<string>()
  for (const rawTag of tags) {
    const normalized = rawTag.trim()
    if (normalized.length > 0) {
      next.add(normalized)
    }
  }
  return Array.from(next)
}

function syncPackageNameFromWorkTitle(source: ImagePackageDto, workTitle: string): { packageName: string; displayName: string } {
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

function deriveWorkTitleFromFileName(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex <= 0) {
    return fileName
  }
  return fileName.slice(0, dotIndex)
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

function filterHiddenImagesForSource(source: ImagePackageDto, includeHidden: boolean): ImagePackageDto {
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

function filterHiddenSources(
  sources: ImagePackageDto[],
  includeHidden: boolean,
): ImagePackageDto[] {
  if (includeHidden) {
    return sources
  }
  return sources.map((source) => filterHiddenImagesForSource(source, includeHidden))
}

function parseSidebarNodePath(nodeId: string): { kind: 'folder' | 'package' | 'video'; pathKey: string } | null {
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

function normalizePathKeyForMatch(pathSegments: string[]): string {
  return pathSegments.join('/')
}

function pathHasPrefix(pathValue: string, prefix: string): boolean {
  if (pathValue === prefix) {
    return true
  }
  return pathValue.startsWith(`${prefix}/`)
}

function renumberSourceImages(source: ImagePackageDto): void {
  source.images.forEach((image, index) => {
    image.ordinal = index + 1
  })
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


const DEFAULT_AD_REVIEW_MAX_CONCURRENCY = 4
const MAX_AD_REVIEW_MAX_CONCURRENCY = 12

function normalizeAdReviewExecution(request: StartManageAdReviewRequestDto): ManageAdReviewTaskExecutionDto {
  const strategy = request.strategy
  const normalizedStrategy: ManageAdReviewTaskExecutionDto['strategy'] =
    !strategy || strategy.mode === 'all'
      ? { mode: 'all' }
      : {
          mode: 'head-tail',
          head_n: Math.max(0, Math.floor(strategy.head_n)),
          tail_n: Math.max(0, Math.floor(strategy.tail_n)),
          tail_stop_clean_streak: Math.max(1, Math.floor(strategy.tail_stop_clean_streak)),
        }

  const maxConcurrency = Number.isFinite(request.max_concurrency)
    ? Math.min(
        MAX_AD_REVIEW_MAX_CONCURRENCY,
        Math.max(DEFAULT_AD_REVIEW_MAX_CONCURRENCY, Math.floor(request.max_concurrency as number)),
      )
    : DEFAULT_AD_REVIEW_MAX_CONCURRENCY

  return manageAdReviewTaskExecutionSchema.parse({
    strategy: normalizedStrategy,
    max_concurrency: maxConcurrency,
  })
}

function createAdReviewSourceDistribution(params: {
  knownHash: number
  llmSuspected: number
  llmClean: number
  llmFailed?: number
  strategySkipped?: number
}): ManageAdReviewSourceDistributionDto {
  return {
    known_hash: Math.max(0, Math.floor(params.knownHash)),
    llm_suspected: Math.max(0, Math.floor(params.llmSuspected)),
    llm_clean: Math.max(0, Math.floor(params.llmClean)),
    llm_failed: Math.max(0, Math.floor(params.llmFailed ?? 0)),
    strategy_skipped: Math.max(0, Math.floor(params.strategySkipped ?? 0)),
  }
}

function buildAdReviewAudit(
  sourceDistribution: ManageAdReviewSourceDistributionDto,
  suspectedCount: number,
  totalCount: number,
): ManageAdReviewTaskAuditDto {
  const llmCalls =
    sourceDistribution.llm_suspected +
    sourceDistribution.llm_clean +
    sourceDistribution.llm_failed

  return {
    source_distribution: sourceDistribution,
    llm_hit_rate: llmCalls > 0 ? sourceDistribution.llm_suspected / llmCalls : 0,
    overall_hit_rate: totalCount > 0 ? suspectedCount / totalCount : 0,
  }
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

export class MockMediaRepository implements MediaRepository, SynchronousMediaRepository {
  private playlistIds = MOCK_LIBRARY_SNAPSHOT.videos.slice(0, 3).map((video) => video.id)

  private importTasks: ImportTaskDto[] = []

  private manageAdReviewTasks = new Map<string, ManageAdReviewTaskDto>()

  getInitialLibrarySnapshot(): LibrarySnapshotDto {
    return MOCK_LIBRARY_SNAPSHOT
  }

  async readLibrarySnapshot(options?: RepositoryRequestOptions): Promise<LibrarySnapshotDto> {
    return resolveAsync(MOCK_LIBRARY_SNAPSHOT, options)
  }

  readImageSidebarTreeSync(
    request: ReadImageSidebarTreeRequestDto,
  ): ReadImageSidebarTreeResponseDto {
    const includeHidden = request.include_hidden ?? false
    const filtered = filterSources(request)
    const filteredPackages = filterHiddenSources(filtered.imagePackages, includeHidden)
    const filteredDirectories = filterHiddenSources(filtered.imageDirectories, includeHidden)
    const tree = buildImageSidebarTree(
      filteredPackages.map(toImagePackageViewModel),
      filteredDirectories.map(toImagePackageViewModel),
    ).map(toSidebarNodeDto)

    return readImageSidebarTreeResponseSchema.parse({
      image_packages: filteredPackages,
      image_directories: filteredDirectories,
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
    const includeHidden = request.include_hidden ?? false
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

    const selectedSourceVisible = filterHiddenImagesForSource(selectedSource, includeHidden)
    const totalItems = selectedSourceVisible.images.length
    const pageSize = request.show_names_only ? Math.max(1, totalItems) : request.page_size
    const maxPageIndex = Math.max(0, Math.ceil(totalItems / pageSize) - 1)
    const pageIndex = request.show_names_only ? 0 : Math.min(request.page_index, maxPageIndex)
    const pageStart = pageIndex * pageSize
    const pageEnd = pageStart + pageSize

    const refs = selectedSourceVisible.images
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
    const includeHidden = request.include_hidden ?? false
    const allSources = [...MOCK_LIBRARY_SNAPSHOT.image_packages, ...MOCK_LIBRARY_SNAPSHOT.image_directories]
    const source = allSources.find((item) => item.id === request.package_id)
    const visibleSource = source ? filterHiddenImagesForSource(source, includeHidden) : null
    const image = visibleSource?.images[request.image_index]

    return readImageMetadataResponseSchema.parse(
      visibleSource && image
        ? {
            package: visibleSource,
            image,
            grade: visibleSource.mock_grade,
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

  setImageHiddenSync(
    request: SetImageHiddenRequestDto,
  ): SetImageHiddenResponseDto {
    const allSources = [...MOCK_LIBRARY_SNAPSHOT.image_packages, ...MOCK_LIBRARY_SNAPSHOT.image_directories]
    const targetImageIds = new Set(request.image_ids)
    const touchedImageIds = new Set<string>()

    for (const source of allSources) {
      for (const image of source.images) {
        if (!targetImageIds.has(image.id)) {
          continue
        }
        image.hidden = request.hidden
        touchedImageIds.add(image.id)
      }
    }

    return setImageHiddenResponseSchema.parse({
      updated_count: touchedImageIds.size,
      updated_at_ms: Date.now(),
    })
  }

  async setImageHidden(
    request: SetImageHiddenRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SetImageHiddenResponseDto> {
    const response = this.setImageHiddenSync(request)
    return resolveAsync(response, options)
  }

  deleteImageItemsSync(
    request: DeleteImageItemsRequestDto,
  ): DeleteImageItemsResponseDto {
    const allSources = [...MOCK_LIBRARY_SNAPSHOT.image_packages, ...MOCK_LIBRARY_SNAPSHOT.image_directories]
    const targetImageIds = new Set(request.image_ids)
    const deletedImageIds = new Set<string>()

    for (const source of allSources) {
      const nextImages = source.images.filter((image) => {
        if (!targetImageIds.has(image.id)) {
          return true
        }
        deletedImageIds.add(image.id)
        return false
      })

      if (nextImages.length !== source.images.length) {
        source.images = nextImages
        renumberSourceImages(source)
      }
    }

    const failed = request.image_ids
      .filter((imageId) => !deletedImageIds.has(imageId))
      .map((imageId) => ({
        image_id: imageId,
        reason: 'image not found',
      }))

    return deleteImageItemsResponseSchema.parse({
      deleted_count: deletedImageIds.size,
      failed,
      updated_at_ms: Date.now(),
    })
  }

  async deleteImageItems(
    request: DeleteImageItemsRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<DeleteImageItemsResponseDto> {
    const response = this.deleteImageItemsSync(request)
    return resolveAsync(response, options)
  }

  deleteSidebarNodesSync(
    request: DeleteSidebarNodesRequestDto,
  ): DeleteSidebarNodesResponseDto {
    const parsedTargets = request.node_ids.map((nodeId) => {
      const parsed = parseSidebarNodePath(nodeId)
      return {
        nodeId,
        parsed,
        matched: false,
      }
    })

    const failed: Array<{ node_id: string; reason: string }> = []
    const validTargets = parsedTargets.filter((target) => {
      if (target.parsed) {
        return true
      }
      failed.push({
        node_id: target.nodeId,
        reason: 'invalid node id',
      })
      return false
    })

    const matchesTarget = (pathKey: string, kind: 'package' | 'directory' | 'video') => {
      for (const target of validTargets) {
        const parsed = target.parsed
        if (!parsed) {
          continue
        }

        if (parsed.kind === 'folder') {
          if (pathHasPrefix(pathKey, parsed.pathKey)) {
            target.matched = true
            return true
          }
          continue
        }

        if (parsed.kind === 'package' && kind === 'package' && pathKey === parsed.pathKey) {
          target.matched = true
          return true
        }

        if (parsed.kind === 'video' && kind === 'video' && pathKey === parsed.pathKey) {
          target.matched = true
          return true
        }
      }

      return false
    }

    const prevPackageCount = MOCK_LIBRARY_SNAPSHOT.image_packages.length
    const prevDirectoryCount = MOCK_LIBRARY_SNAPSHOT.image_directories.length
    const prevVideoCount = MOCK_LIBRARY_SNAPSHOT.videos.length

    MOCK_LIBRARY_SNAPSHOT.image_packages = MOCK_LIBRARY_SNAPSHOT.image_packages.filter((source) => {
      const pathKey = normalizePathKeyForMatch(source.tree_path)
      return !matchesTarget(pathKey, 'package')
    })

    MOCK_LIBRARY_SNAPSHOT.image_directories = MOCK_LIBRARY_SNAPSHOT.image_directories.filter((source) => {
      const pathKey = normalizePathKeyForMatch(source.tree_path)
      return !matchesTarget(pathKey, 'directory')
    })

    MOCK_LIBRARY_SNAPSHOT.videos = MOCK_LIBRARY_SNAPSHOT.videos.filter((video) => {
      const pathKey = normalizePathKeyForMatch(video.tree_path)
      return !matchesTarget(pathKey, 'video')
    })

    const remainingVideoIds = new Set(MOCK_LIBRARY_SNAPSHOT.videos.map((video) => video.id))
    this.playlistIds = this.playlistIds.filter((videoId) => remainingVideoIds.has(videoId))

    for (const target of validTargets) {
      if (target.matched) {
        continue
      }
      failed.push({
        node_id: target.nodeId,
        reason: 'node not found',
      })
    }

    const deletedCount =
      (prevPackageCount - MOCK_LIBRARY_SNAPSHOT.image_packages.length) +
      (prevDirectoryCount - MOCK_LIBRARY_SNAPSHOT.image_directories.length) +
      (prevVideoCount - MOCK_LIBRARY_SNAPSHOT.videos.length)

    return deleteSidebarNodesResponseSchema.parse({
      deleted_count: Math.max(0, deletedCount),
      failed,
      updated_at_ms: Date.now(),
    })
  }

  async deleteSidebarNodes(
    request: DeleteSidebarNodesRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<DeleteSidebarNodesResponseDto> {
    const response = this.deleteSidebarNodesSync(request)
    return resolveAsync(response, options)
  }

  private resolveManageAdReviewImageIds(request: StartManageAdReviewRequestDto): string[] {
    const allSources = [...MOCK_LIBRARY_SNAPSHOT.image_packages, ...MOCK_LIBRARY_SNAPSHOT.image_directories]
    const imageById = new Map<string, { source: ImagePackageDto; image: ImageItemDto }>()
    for (const source of allSources) {
      for (const image of source.images) {
        imageById.set(image.id, { source, image })
      }
    }

    if (request.selection_scope === 'image') {
      return Array.from(
        new Set(
          (request.image_ids ?? []).map((value) => value.trim()).filter((value) => value.length > 0 && imageById.has(value)),
        ),
      )
    }

    const selected = new Set<string>()
    const parsedTargets = (request.node_ids ?? [])
      .map((nodeId) => parseSidebarNodePath(nodeId))
      .filter((value): value is { kind: 'folder' | 'package' | 'video'; pathKey: string } => Boolean(value))

    for (const source of allSources) {
      const sourcePathKey = normalizePathKeyForMatch(source.tree_path)
      let matched = false
      for (const target of parsedTargets) {
        if (target.kind === 'folder' && pathHasPrefix(sourcePathKey, target.pathKey)) {
          matched = true
          break
        }
        if (target.kind === 'package' && sourcePathKey === target.pathKey) {
          matched = true
          break
        }
      }

      if (!matched) {
        continue
      }

      for (const image of source.images) {
        selected.add(image.id)
      }
    }

    return Array.from(selected)
  }

  startManageAdReviewSync(request: StartManageAdReviewRequestDto): StartManageAdReviewResponseDto {
    const selectedImageIds = this.resolveManageAdReviewImageIds(request)
    if (selectedImageIds.length === 0) {
      throw new Error('广告审核失败：未选中图片')
    }

    const allSources = [...MOCK_LIBRARY_SNAPSHOT.image_packages, ...MOCK_LIBRARY_SNAPSHOT.image_directories]
    const imageById = new Map<string, { source: ImagePackageDto; image: ImageItemDto }>()
    for (const source of allSources) {
      for (const image of source.images) {
        imageById.set(image.id, { source, image })
      }
    }

    const selectedEntries = selectedImageIds
      .map((imageId) => imageById.get(imageId))
      .filter((item): item is { source: ImagePackageDto; image: ImageItemDto } => Boolean(item))

    const imageSourceById: Record<string, ManageAdReviewImageSourceDto> = {}
    const candidates: ManageAdReviewTaskDto['candidates'] = []
    let knownHashHits = 0
    let llmSuspected = 0
    let llmClean = 0
    let strategySkipped = 0

    for (const { source, image } of selectedEntries) {
      let imageSource: ManageAdReviewImageSourceDto
      if (image.ordinal % 7 === 0) {
        imageSource = 'strategy-skip'
        strategySkipped += 1
      } else if (image.ordinal % 4 === 0) {
        imageSource = 'known-hash'
        knownHashHits += 1
      } else {
        imageSource = 'llm'
        if (image.ordinal % 2 === 1) {
          llmSuspected += 1
        } else {
          llmClean += 1
        }
      }

      imageSourceById[image.id] = imageSource

      const shouldBeCandidate = imageSource === 'known-hash' || (imageSource === 'llm' && image.ordinal % 2 === 1)
      if (!shouldBeCandidate) {
        continue
      }

      candidates.push({
        image_id: image.id,
        package_id: source.id,
        package_name: source.package_name,
        display_name: source.display_name,
        ordinal: image.ordinal,
        file_name:
          image.media_locator.kind === 'filesystem'
            ? image.media_locator.absolute_path.split(/[\\/]/).pop() ?? null
            : image.media_locator.entry_name,
        reason: imageSource === 'known-hash' ? 'mock_known_hash_hit' : 'mock_llm_suspected',
        source: imageSource === 'known-hash' ? 'known-hash' : 'llm',
        hash: hashLocator(`${source.id}:${image.id}`).toString(16).padStart(8, '0'),
      })
    }

    const now = Date.now()
    const taskId = `mock-manage-ad-review-${now}-${Math.round(Math.random() * 10_000)}`
    const execution = normalizeAdReviewExecution(request)
    const sourceDistribution = createAdReviewSourceDistribution({
      knownHash: knownHashHits,
      llmSuspected,
      llmClean,
      strategySkipped,
    })

    const task: ManageAdReviewTaskDto = {
      task_id: taskId,
      status: 'review',
      progress: 1,
      total_count: selectedImageIds.length,
      reviewed_count: selectedImageIds.length,
      suspected_count: candidates.length,
      failed_count: 0,
      known_hash_hits: knownHashHits,
      llm_calls: llmSuspected + llmClean,
      scope_image_ids: selectedImageIds,
      image_source_by_id: imageSourceById,
      execution,
      audit: buildAdReviewAudit(sourceDistribution, candidates.length, selectedImageIds.length),
      message: candidates.length > 0 ? `审核完成：疑似 ${candidates.length} 张` : '审核完成：未发现疑似广告',
      error_detail: null,
      candidates,
      created_at_ms: now,
      updated_at_ms: now,
    }

    this.manageAdReviewTasks.set(taskId, task)
    return startManageAdReviewResponseSchema.parse({ task })
  }

  async startManageAdReview(
    request: StartManageAdReviewRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StartManageAdReviewResponseDto> {
    const response = this.startManageAdReviewSync(request)
    return resolveAsync(response, options)
  }

  readManageAdReviewTaskSync(request: ReadManageAdReviewTaskRequestDto): ReadManageAdReviewTaskResponseDto {
    return readManageAdReviewTaskResponseSchema.parse({
      task: this.manageAdReviewTasks.get(request.task_id) ?? null,
    })
  }

  async readManageAdReviewTask(
    request: ReadManageAdReviewTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadManageAdReviewTaskResponseDto> {
    const response = this.readManageAdReviewTaskSync(request)
    return resolveAsync(response, options)
  }

  pauseManageAdReviewTaskSync(
    request: PauseManageAdReviewTaskRequestDto,
  ): PauseManageAdReviewTaskResponseDto {
    const task = this.manageAdReviewTasks.get(request.task_id)
    if (!task) {
      throw new Error(`AI广告审核暂停失败：任务不存在 ${request.task_id}`)
    }

    const nextTask: ManageAdReviewTaskDto =
      task.status === 'running'
        ? {
            ...task,
            status: 'paused',
            message: 'AI广告审核已暂停',
            error_detail: null,
            updated_at_ms: Date.now(),
          }
        : task

    this.manageAdReviewTasks.set(nextTask.task_id, nextTask)
    return pauseManageAdReviewTaskResponseSchema.parse({
      task: nextTask,
    })
  }

  async pauseManageAdReviewTask(
    request: PauseManageAdReviewTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PauseManageAdReviewTaskResponseDto> {
    const response = this.pauseManageAdReviewTaskSync(request)
    return resolveAsync(response, options)
  }

  testAdReviewVisionModelSync(
    request: TestAdReviewVisionModelRequestDto,
  ): TestAdReviewVisionModelResponseDto {
    const endpoint = request.llm_endpoint.trim()
    const model = request.llm_model.trim()
    const imageBase64 = request.image_base64.trim()
    if (!endpoint || !model) {
      return testAdReviewVisionModelResponseSchema.parse({
        ok: false,
        message: '模型测试失败：端口和模型ID不能为空',
      })
    }

    if (!imageBase64) {
      return testAdReviewVisionModelResponseSchema.parse({
        ok: false,
        message: '模型测试失败：测试图片数据缺失',
      })
    }

    if (endpoint.toLowerCase().includes('fail') || model.toLowerCase().includes('fail')) {
      return testAdReviewVisionModelResponseSchema.parse({
        ok: false,
        message: '模型测试失败：mock 连接失败',
      })
    }

    return testAdReviewVisionModelResponseSchema.parse({
      ok: true,
      message: '模型响应正常',
    })
  }

  async testAdReviewVisionModel(
    request: TestAdReviewVisionModelRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<TestAdReviewVisionModelResponseDto> {
    const response = this.testAdReviewVisionModelSync(request)
    return resolveAsync(response, options)
  }


  confirmManageAdReviewDeleteSync(
    request: ConfirmManageAdReviewDeleteRequestDto,
  ): ConfirmManageAdReviewDeleteResponseDto {
    const task = this.manageAdReviewTasks.get(request.task_id)
    if (!task) {
      throw new Error(`广告审核删除失败：任务不存在 ${request.task_id}`)
    }

    const candidateIds = new Set(task.candidates.map((item) => item.image_id))
    const normalizedIds = Array.from(
      new Set(request.image_ids.map((value) => value.trim()).filter((value) => value.length > 0 && candidateIds.has(value))),
    )
    if (normalizedIds.length === 0) {
      throw new Error('广告审核删除失败：未选中候选项')
    }

    const deleteResult = this.deleteImageItemsSync({ image_ids: normalizedIds })
    const failedSet = new Set(deleteResult.failed.map((item) => item.image_id))
    const deletedSet = new Set(normalizedIds.filter((imageId) => !failedSet.has(imageId)))

    const now = Date.now()
    const nextImageSourceById = { ...task.image_source_by_id }
    for (const imageId of deletedSet) {
      delete nextImageSourceById[imageId]
    }

    const nextTask: ManageAdReviewTaskDto = {
      ...task,
      candidates: task.candidates.filter((item) => !deletedSet.has(item.image_id)),
      suspected_count: task.candidates.filter((item) => !deletedSet.has(item.image_id)).length,
      scope_image_ids: task.scope_image_ids.filter((imageId) => !deletedSet.has(imageId)),
      image_source_by_id: nextImageSourceById,
      updated_at_ms: now,
      message: deletedSet.size > 0 ? `已删除 ${deletedSet.size} 张疑似广告` : task.message,
    }

    this.manageAdReviewTasks.set(task.task_id, nextTask)

    return confirmManageAdReviewDeleteResponseSchema.parse({
      task: nextTask,
      deleted_count: deleteResult.deleted_count,
      failed: deleteResult.failed,
      updated_at_ms: now,
    })
  }

  async confirmManageAdReviewDelete(
    request: ConfirmManageAdReviewDeleteRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ConfirmManageAdReviewDeleteResponseDto> {
    const response = this.confirmManageAdReviewDeleteSync(request)
    return resolveAsync(response, options)
  }

  writePackageMetadataSync(
    request: WritePackageMetadataRequestDto,
  ): WritePackageMetadataResponseDto {
    const allSources = [...MOCK_LIBRARY_SNAPSHOT.image_packages, ...MOCK_LIBRARY_SNAPSHOT.image_directories]
    const source = allSources.find((item) => item.id === request.package_id)
    if (!source) {
      throw new Error(`mock 仓库写入元数据失败：source 不存在 ${request.package_id}`)
    }

    const workTitle = normalizeTextValue(request.work_title, source.work_title)
    source.work_title = workTitle
    source.circle = normalizeTextValue(request.circle, source.circle)
    source.author = normalizeTextValue(request.author, source.author)
    source.tags = normalizeTags(request.tags)

    if (request.sync_work_title_to_package_name) {
      const synced = syncPackageNameFromWorkTitle(source, workTitle)
      source.package_name = synced.packageName
      source.display_name = synced.displayName
    }

    return writePackageMetadataResponseSchema.parse({
      package: source,
      updated_at_ms: Date.now(),
    })
  }

  async writePackageMetadata(
    request: WritePackageMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePackageMetadataResponseDto> {
    const response = this.writePackageMetadataSync(request)
    return resolveAsync(response, options)
  }

  writePackageExternalMetadataSync(
    request: WritePackageExternalMetadataRequestDto,
  ): WritePackageExternalMetadataResponseDto {
    const allSources = [...MOCK_LIBRARY_SNAPSHOT.image_packages, ...MOCK_LIBRARY_SNAPSHOT.image_directories]
    const source = allSources.find((item) => item.id === request.package_id)
    if (!source) {
      throw new Error(`mock 仓库写入外部元数据失败：source 不存在 ${request.package_id}`)
    }

    source.external_metadata = {
      source_site: request.source_site,
      source_url: request.source_url,
      source_remote_id: request.source_remote_id,
      source_token: request.source_token?.trim() ?? '',
      title: request.title?.trim() ?? '',
      title_jpn: request.title_jpn?.trim() ?? '',
      group_name: request.group_name?.trim() ?? '',
      group_name_jpn: request.group_name_jpn?.trim() ?? '',
      artist: request.artist?.trim() ?? '',
      artist_jpn: request.artist_jpn?.trim() ?? '',
      posted: request.posted?.trim() ?? '',
      rating: request.rating ?? null,
      favorited: request.favorited ?? null,
      tags: request.tags,
      raw_json: request.raw_json,
    }

    return writePackageExternalMetadataResponseSchema.parse({
      package: source,
      updated_at_ms: Date.now(),
    })
  }

  async writePackageExternalMetadata(
    request: WritePackageExternalMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePackageExternalMetadataResponseDto> {
    const response = this.writePackageExternalMetadataSync(request)
    return resolveAsync(response, options)
  }

  searchExternalMetadataSync(
    request: SearchExternalMetadataRequestDto,
  ): SearchExternalMetadataResponseDto {
    const text = request.input_text?.trim() || request.input_id?.trim() || ''
    if (!text) {
      return searchExternalMetadataResponseSchema.parse({ items: [] })
    }

    const mockItem = {
      source: request.source ?? 'nhentai',
      id: request.input_id?.trim() || '114514',
      title: text,
      title_original: null,
      cover: null,
      url: 'https://example.com/mock-metadata',
      token: request.source === 'ehentai' ? 'mocktoken' : '',
      tags: ['language:chinese', 'parody:original'],
      pages: 1,
      posted: null,
      rating: null,
      favorited: null,
      raw: {
        mock: true,
        input_text: request.input_text ?? '',
        input_id: request.input_id ?? '',
      },
    }

    return searchExternalMetadataResponseSchema.parse({
      items: [mockItem],
    })
  }

  async searchExternalMetadata(
    request: SearchExternalMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SearchExternalMetadataResponseDto> {
    const response = this.searchExternalMetadataSync(request)
    return resolveAsync(response, options)
  }


  writeVideoMetadataSync(
    request: WriteVideoMetadataRequestDto,
  ): WriteVideoMetadataResponseDto {
    const video = MOCK_LIBRARY_SNAPSHOT.videos.find((item) => item.id === request.video_id)
    if (!video) {
      throw new Error(`mock 仓库写入视频元数据失败：video 不存在 ${request.video_id}`)
    }

    const nextWorkTitle = request.sync_file_name_to_work_title
      ? deriveWorkTitleFromFileName(video.file_name)
      : normalizeTextValue(request.work_title, video.work_title)

    video.work_title = nextWorkTitle
    video.circle = normalizeTextValue(request.circle, video.circle)
    video.author = normalizeTextValue(request.author, video.author)
    video.tags = normalizeTags(request.tags)
    if (typeof request.grade !== 'undefined') {
      video.grade = request.grade
    }

    return writeVideoMetadataResponseSchema.parse({
      video,
      updated_at_ms: Date.now(),
    })
  }

  async writeVideoMetadata(
    request: WriteVideoMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WriteVideoMetadataResponseDto> {
    const response = this.writeVideoMetadataSync(request)
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

  async writePlaylist(request: WritePlaylistRequestDto): Promise<WritePlaylistResponseDto> {
    const response = this.writePlaylistSync(request)
    return resolveAsync(response)
  }

  async readAppState(request: ReadAppStateRequestDto): Promise<ReadAppStateResponseDto> {
    const val = localStorage.getItem(`mpx_mock_state_${request.state_key}`)
    return { state_json: val ?? request.fallback_json ?? 'null' }
  }

  async writeAppState(request: WriteAppStateRequestDto): Promise<WriteAppStateResponseDto> {
    localStorage.setItem(`mpx_mock_state_${request.state_key}`, request.state_json)
    return { updated_at_ms: Date.now() }
  }

  pickImportPathsSync(request: PickImportPathsRequestDto): PickImportPathsResponseDto {
    void request
    return pickImportPathsResponseSchema.parse({
      paths: [],
    })
  }

  async pickImportPaths(
    request: PickImportPathsRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PickImportPathsResponseDto> {
    const response = this.pickImportPathsSync(request)
    return resolveAsync(response, options)
  }

  pickFilePathSync(request: PickFilePathRequestDto): PickFilePathResponseDto {
    void request
    return pickFilePathResponseSchema.parse({
      canceled: true,
      path: null,
    })
  }

  async pickFilePath(
    request: PickFilePathRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PickFilePathResponseDto> {
    const response = this.pickFilePathSync(request)
    return resolveAsync(response, options)
  }

  pickDirectoryPathSync(request: PickDirectoryPathRequestDto): PickDirectoryPathResponseDto {
    void request
    return pickDirectoryPathResponseSchema.parse({
      canceled: true,
      path: null,
    })
  }

  async pickDirectoryPath(
    request: PickDirectoryPathRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PickDirectoryPathResponseDto> {
    const response = this.pickDirectoryPathSync(request)
    return resolveAsync(response, options)
  }

  readClipboardImportPathsSync(): ReadClipboardImportPathsResponseDto {
    return readClipboardImportPathsResponseSchema.parse({
      paths: [],
    })
  }

  async readClipboardImportPaths(options?: RepositoryRequestOptions): Promise<ReadClipboardImportPathsResponseDto> {
    const response = this.readClipboardImportPathsSync()
    return resolveAsync(response, options)
  }

  enqueueImportTaskSync(request: EnqueueImportTaskRequestDto): EnqueueImportTaskResponseDto {
    const now = Date.now()
    const task: ImportTaskDto = {
      task_id: `mock-import-${now}-${Math.round(Math.random() * 10_000)}`,
      task_type: 'import',
      source: request.source,
      paths: request.paths,
      status: 'completed',
      progress: 1,
      processed_count: request.paths.length,
      total_count: request.paths.length,
      message: 'mock import completed',
      error_detail: null,
      created_at_ms: now,
      updated_at_ms: now,
    }

    this.importTasks = [task, ...this.importTasks]
    return enqueueImportTaskResponseSchema.parse({ task })
  }

  async enqueueImportTask(
    request: EnqueueImportTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<EnqueueImportTaskResponseDto> {
    const response = this.enqueueImportTaskSync(request)
    return resolveAsync(response, options)
  }

  readImportTasksSync(): ReadImportTasksResponseDto {
    return readImportTasksResponseSchema.parse({
      tasks: this.importTasks,
    })
  }

  async readImportTasks(options?: RepositoryRequestOptions): Promise<ReadImportTasksResponseDto> {
    const response = this.readImportTasksSync()
    return resolveAsync(response, options)
  }

  retryImportTaskSync(request: RetryImportTaskRequestDto): RetryImportTaskResponseDto {
    const found = this.importTasks.find((task) => task.task_id === request.task_id)
    if (!found) {
      throw new Error(`mock 导入重试失败：task 不存在 ${request.task_id}`)
    }

    const updated: ImportTaskDto = {
      ...found,
      status: 'completed',
      progress: 1,
      processed_count: Math.max(found.processed_count, found.total_count),
      message: 'mock import retried',
      error_detail: null,
      updated_at_ms: Date.now(),
    }

    this.importTasks = this.importTasks.map((task) => (task.task_id === request.task_id ? updated : task))
    return retryImportTaskResponseSchema.parse({ task: updated })
  }

  async retryImportTask(
    request: RetryImportTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<RetryImportTaskResponseDto> {
    const response = this.retryImportTaskSync(request)
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

  readRuntimeCapabilitiesSync(): ReadRuntimeCapabilitiesResponseDto {
    return readRuntimeCapabilitiesResponseSchema.parse({
      dependencies: {
        sharp: true,
        ffmpeg: true,
        ffprobe: true,
        seven_zip: true,
        powershell: true,
      },
      strategies: {
        thumbnail: 'sharp-webp-cache',
        video_probe: 'ffprobe',
        video_cover: 'ffmpeg',
        archive_rar_7z: 'normalize-to-zip-store',
        archive_zip_repack: 'repack-webp-store',
      },
      minimum_matrix: [
        {
          capability: '基础浏览（文件系统图片/视频）',
          status: 'available',
          note: 'mock 模式下始终可用',
        },
      ],
      generated_at_ms: Date.now(),
    })
  }

  async readRuntimeCapabilities(
    options?: RepositoryRequestOptions,
  ): Promise<ReadRuntimeCapabilitiesResponseDto> {
    const response = this.readRuntimeCapabilitiesSync()
    return resolveAsync(response, options)
  }

  clearDatabaseSync(): ClearDatabaseResponseDto {
    this.playlistIds = []
    this.importTasks = []
    this.manageAdReviewTasks.clear()

    return clearDatabaseResponseSchema.parse({
      cleared: true,
      cleared_at_ms: Date.now(),
    })
  }

  async clearDatabase(options?: RepositoryRequestOptions): Promise<ClearDatabaseResponseDto> {
    const response = this.clearDatabaseSync()
    return resolveAsync(response, options)
  }
}
