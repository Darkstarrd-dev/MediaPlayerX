import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'

import {
  librarySnapshotDtoSchema,
  readImageMetadataResponseSchema,
  readImagePageResponseSchema,
  readImageSidebarTreeResponseSchema,
  type FeatureFilterDto,
  type FocusedImageRefDto,
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
} from '../src/contracts/backend'

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'])
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mkv', '.mov'])
const ARCHIVE_EXTENSIONS = new Set(['.zip', '.rar', '.7z'])
const COLOR_PALETTE = ['#dd6b66', '#d58b45', '#6da249', '#4aa6a1', '#4f86cf', '#8868d6']

interface FileRecord {
  absolutePath: string
  relativePath: string
  extension: string
  sizeBytes: number
}

function normalizePathKey(value: string): string {
  return value.split(path.sep).join('/')
}

function makeStableId(prefix: string, value: string): string {
  const hash = createHash('sha1').update(value).digest('hex').slice(0, 12)
  return `${prefix}-${hash}`
}

function toTreePath(rootDir: string, targetPath: string): string[] {
  const relative = normalizePathKey(path.relative(rootDir, targetPath))
  const segments = relative
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)

  if (segments.length > 0) {
    return segments
  }

  return [path.basename(targetPath)]
}

function toSafeSizeKb(sizeBytes: number): number {
  return Math.max(0, Math.ceil(sizeBytes / 1024))
}

function toSafeSizeMb(sizeBytes: number): number {
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

function matchesFeatureFilter(
  source: ImagePackageDto,
  filter: FeatureFilterDto,
  gradeOverrides?: Record<string, number | null>,
): boolean {
  if (filter.name_query) {
    const matched = [source.package_name, source.display_name].some((text) =>
      text.toLowerCase().includes(filter.name_query),
    )
    if (!matched) {
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

function buildImageSidebarTree(
  imagePackages: ImagePackageDto[],
  imageDirectories: ImagePackageDto[],
): SidebarNodeDto[] {
  const packageByPath = new Map<string, ImagePackageDto>()
  const directoryByPath = new Map<string, ImagePackageDto>()

  for (const pkg of imagePackages) {
    packageByPath.set(pkg.tree_path.join('/'), pkg)
  }
  for (const directory of imageDirectories) {
    directoryByPath.set(directory.tree_path.join('/'), directory)
  }

  const allLeafPaths = [
    ...imagePackages.map((pkg) => pkg.tree_path),
    ...imageDirectories.map((directory) => directory.tree_path),
  ]

  const rootMap = new Map<string, SidebarNodeDto>()
  const nodeByPath = new Map<string, SidebarNodeDto>()

  for (const sourcePath of allLeafPaths) {
    for (let index = 0; index < sourcePath.length; index += 1) {
      const segments = sourcePath.slice(0, index + 1)
      const pathKey = segments.join('/')
      if (nodeByPath.has(pathKey)) {
        continue
      }

      const packageAtPath = packageByPath.get(pathKey)
      const directoryAtPath = directoryByPath.get(pathKey)
      const kind = packageAtPath ? 'package' : 'folder'

      const node: SidebarNodeDto = {
        id: `${kind}:${pathKey}`,
        label: segments[segments.length - 1] ?? pathKey,
        kind,
        children: [],
        path_key: pathKey,
      }

      if (packageAtPath) {
        node.package_id = packageAtPath.id
        node.image_source_id = packageAtPath.id
        node.direct_image_count = packageAtPath.images.length
      } else if (directoryAtPath) {
        node.image_source_id = directoryAtPath.id
        node.direct_image_count = directoryAtPath.images.length
      }

      nodeByPath.set(pathKey, node)

      if (segments.length === 1) {
        rootMap.set(pathKey, node)
        continue
      }

      const parentPath = sourcePath.slice(0, index).join('/')
      const parentNode = nodeByPath.get(parentPath)
      if (parentNode) {
        parentNode.children.push(node)
      }
    }
  }

  const sortNodes = (nodes: SidebarNodeDto[]) => {
    nodes.sort((left, right) => {
      const kindOrder: Record<SidebarNodeDto['kind'], number> = {
        folder: 0,
        package: 1,
        video: 2,
      }
      const kindDelta = kindOrder[left.kind] - kindOrder[right.kind]
      if (kindDelta !== 0) {
        return kindDelta
      }
      return left.label.localeCompare(right.label, 'zh-CN')
    })

    for (const node of nodes) {
      if (node.children.length > 0) {
        sortNodes(node.children)
      }
    }
  }

  const roots = Array.from(rootMap.values())
  sortNodes(roots)
  return roots
}

export class FileSystemMediaReadService {
  private readonly rootDir: string

  private snapshotCache: LibrarySnapshotDto | null = null

  private loadingPromise: Promise<LibrarySnapshotDto> | null = null

  constructor(rootDir: string) {
    this.rootDir = path.resolve(rootDir)
  }

  invalidateCache(): void {
    this.snapshotCache = null
  }

  private async ensureSnapshotLoaded(): Promise<LibrarySnapshotDto> {
    if (this.snapshotCache) {
      return this.snapshotCache
    }

    if (!this.loadingPromise) {
      this.loadingPromise = this.loadSnapshot().finally(() => {
        this.loadingPromise = null
      })
    }

    this.snapshotCache = await this.loadingPromise
    return this.snapshotCache
  }

  private async collectFiles(): Promise<FileRecord[]> {
    const rootStat = await fs.stat(this.rootDir).catch(() => null)
    if (!rootStat || !rootStat.isDirectory()) {
      throw new Error(`后端真实读服务失败：目录不存在或不可访问 -> ${this.rootDir}`)
    }

    const files: FileRecord[] = []
    const queue = [this.rootDir]

    while (queue.length > 0) {
      const current = queue.pop()
      if (!current) {
        continue
      }

      const entries = await fs.readdir(current, { withFileTypes: true })
      for (const entry of entries) {
        const absolutePath = path.join(current, entry.name)
        if (entry.isDirectory()) {
          queue.push(absolutePath)
          continue
        }

        if (!entry.isFile()) {
          continue
        }

        const extension = path.extname(entry.name).toLowerCase()
        if (!IMAGE_EXTENSIONS.has(extension) && !VIDEO_EXTENSIONS.has(extension) && !ARCHIVE_EXTENSIONS.has(extension)) {
          continue
        }

        const stat = await fs.stat(absolutePath)
        files.push({
          absolutePath,
          relativePath: normalizePathKey(path.relative(this.rootDir, absolutePath)),
          extension,
          sizeBytes: stat.size,
        })
      }
    }

    files.sort((left, right) => left.relativePath.localeCompare(right.relativePath, 'zh-CN'))
    return files
  }

  private createImageItem(record: FileRecord, sourceId: string, ordinal: number): ImageItemDto {
    const cluster = ordinal % COLOR_PALETTE.length
    return {
      id: makeStableId('img', `${sourceId}:${record.absolutePath}`),
      ordinal,
      width: 1920,
      height: 1080,
      size_kb: toSafeSizeKb(record.sizeBytes),
      cluster,
      color: COLOR_PALETTE[cluster] ?? '#4f86cf',
      feature_vector: [0, 0, 0, 0, 0, 0, 0, 0],
    }
  }

  private createDirectorySource(directoryPath: string, imageFiles: FileRecord[]): ImagePackageDto {
    const treePath = toTreePath(this.rootDir, directoryPath)
    const sourceId = makeStableId('dir', directoryPath)
    const displayName = path.basename(directoryPath) || treePath[treePath.length - 1] || sourceId

    return {
      id: sourceId,
      package_name: displayName,
      display_name: displayName,
      absolute_path: directoryPath,
      tree_path: treePath,
      work_title: displayName,
      circle: '未知',
      author: '未知',
      tags: [],
      mock_grade: null,
      images: imageFiles.map((file, index) => this.createImageItem(file, sourceId, index + 1)),
    }
  }

  private createArchiveSource(file: FileRecord): ImagePackageDto {
    const sourceId = makeStableId('pkg', file.absolutePath)
    const fileName = path.basename(file.absolutePath)
    const displayName = path.basename(file.absolutePath, file.extension)

    const image: ImageItemDto = {
      id: `${sourceId}-img-1`,
      ordinal: 1,
      width: 1920,
      height: 1080,
      size_kb: toSafeSizeKb(file.sizeBytes),
      cluster: 0,
      color: COLOR_PALETTE[0],
      feature_vector: [0, 0, 0, 0, 0, 0, 0, 0],
    }

    return {
      id: sourceId,
      package_name: fileName,
      display_name: displayName,
      absolute_path: file.absolutePath,
      tree_path: toTreePath(this.rootDir, file.absolutePath),
      work_title: displayName,
      circle: '未知',
      author: '未知',
      tags: [],
      mock_grade: null,
      images: [image],
    }
  }

  private createVideoSource(file: FileRecord): VideoItemDto {
    return {
      id: makeStableId('vid', file.absolutePath),
      file_name: path.basename(file.absolutePath),
      absolute_path: file.absolutePath,
      tree_path: toTreePath(this.rootDir, file.absolutePath),
      duration_sec: 0,
      width: 1920,
      height: 1080,
      size_mb: toSafeSizeMb(file.sizeBytes),
    }
  }

  private async loadSnapshot(): Promise<LibrarySnapshotDto> {
    const files = await this.collectFiles()

    const directoryImageMap = new Map<string, FileRecord[]>()
    const archives: FileRecord[] = []
    const videos: FileRecord[] = []

    for (const file of files) {
      if (IMAGE_EXTENSIONS.has(file.extension)) {
        const directoryPath = path.dirname(file.absolutePath)
        const list = directoryImageMap.get(directoryPath) ?? []
        list.push(file)
        directoryImageMap.set(directoryPath, list)
        continue
      }

      if (ARCHIVE_EXTENSIONS.has(file.extension)) {
        archives.push(file)
        continue
      }

      if (VIDEO_EXTENSIONS.has(file.extension)) {
        videos.push(file)
      }
    }

    const imageDirectories = Array.from(directoryImageMap.entries())
      .map(([directoryPath, imageFiles]) => {
        imageFiles.sort((left, right) => left.relativePath.localeCompare(right.relativePath, 'zh-CN'))
        return this.createDirectorySource(directoryPath, imageFiles)
      })
      .sort((left, right) => left.absolute_path.localeCompare(right.absolute_path, 'zh-CN'))

    const imagePackages = archives
      .map((file) => this.createArchiveSource(file))
      .sort((left, right) => left.absolute_path.localeCompare(right.absolute_path, 'zh-CN'))

    const videoItems = videos
      .map((file) => this.createVideoSource(file))
      .sort((left, right) => left.absolute_path.localeCompare(right.absolute_path, 'zh-CN'))

    return librarySnapshotDtoSchema.parse({
      image_packages: imagePackages,
      image_directories: imageDirectories,
      videos: videoItems,
    })
  }

  private filterSources(request: Pick<ReadImageSidebarTreeRequestDto, 'feature_filter' | 'grade_overrides'>): {
    imagePackages: ImagePackageDto[]
    imageDirectories: ImagePackageDto[]
  } {
    const snapshot = this.snapshotCache
    if (!snapshot) {
      return {
        imagePackages: [],
        imageDirectories: [],
      }
    }

    const normalizedFilter = normalizeFeatureFilter(request.feature_filter)

    return {
      imagePackages: snapshot.image_packages.filter((source) =>
        matchesFeatureFilter(source, normalizedFilter, request.grade_overrides),
      ),
      imageDirectories: snapshot.image_directories.filter((source) =>
        matchesFeatureFilter(source, normalizedFilter, request.grade_overrides),
      ),
    }
  }

  async readLibrarySnapshot(): Promise<LibrarySnapshotDto> {
    return this.ensureSnapshotLoaded()
  }

  async readImageSidebarTree(
    request: ReadImageSidebarTreeRequestDto,
  ): Promise<ReadImageSidebarTreeResponseDto> {
    await this.ensureSnapshotLoaded()
    const filtered = this.filterSources(request)

    return readImageSidebarTreeResponseSchema.parse({
      image_packages: filtered.imagePackages,
      image_directories: filtered.imageDirectories,
      tree: buildImageSidebarTree(filtered.imagePackages, filtered.imageDirectories),
    })
  }

  async readImagePage(request: ReadImagePageRequestDto): Promise<ReadImagePageResponseDto> {
    await this.ensureSnapshotLoaded()
    const filtered = this.filterSources({
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

    const refs: FocusedImageRefDto[] = selectedSource.images
      .slice(pageStart, pageEnd)
      .map((_, index) => ({
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

  async readImageMetadata(
    request: ReadImageMetadataRequestDto,
  ): Promise<ReadImageMetadataResponseDto> {
    const snapshot = await this.ensureSnapshotLoaded()
    const allSources = [...snapshot.image_packages, ...snapshot.image_directories]
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
}
