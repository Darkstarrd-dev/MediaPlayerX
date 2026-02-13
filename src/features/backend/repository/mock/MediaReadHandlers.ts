import {
  readImageMetadataResponseSchema,
  readImagePageResponseSchema,
  readImageSidebarTreeResponseSchema,
  readImportTasksResponseSchema,
  readPlaylistResponseSchema,
  readRuntimeCapabilitiesResponseSchema,
  resolveMediaResourceResponseSchema,
  mediaAccessAuditResponseSchema,
  type ReadImageMetadataRequestDto,
  type ReadImageMetadataResponseDto,
  type ReadImagePageRequestDto,
  type ReadImagePageResponseDto,
  type ReadImageSidebarTreeRequestDto,
  type ReadImageSidebarTreeResponseDto,
  type ReadPlaylistResponseDto,
  type ResolveMediaResourceRequestDto,
  type ResolveMediaResourceResponseDto,
  type ImageItemDto,
  type ReadImportTasksResponseDto,
  type ReadRuntimeCapabilitiesResponseDto,
  type MediaAccessAuditResponseDto,
} from '../../../../contracts/backend'
import { buildImageSidebarTree } from '../../../../mockData'
import {
  toImagePackageViewModel,
  toSidebarNodeDto,
} from './mappers'
import {
  filterSources,
  filterHiddenSources,
  filterHiddenImagesForSource,
  toMockImageDataUrl,
  locatorPathKey,
} from './utils'
import { MOCK_LIBRARY_SNAPSHOT_REF, type MockRepositoryState } from './types'

export class MockMediaReadHandlers {
  private readonly state: MockRepositoryState

  constructor(state: MockRepositoryState) {
    this.state = state
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

  readImageMetadataSync(
    request: ReadImageMetadataRequestDto,
  ): ReadImageMetadataResponseDto {
    const snapshot = MOCK_LIBRARY_SNAPSHOT_REF.current
    if (!snapshot) return null

    const includeHidden = request.include_hidden ?? false
    const allSources = [...snapshot.image_packages, ...snapshot.image_directories]
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
        : request.locator.media_type === 'video'
          ? {
              resource_url: `about:blank#mock-video-${encodeURIComponent(locatorPathKey(request.locator))}`,
              mime_type: request.locator.mime_type,
              expires_at_ms: Date.now() + 600_000,
            }
          : {
              resource_url: `about:blank#mock-audio-${encodeURIComponent(locatorPathKey(request.locator))}`,
              mime_type: request.locator.mime_type,
              expires_at_ms: Date.now() + 600_000,
            }

    return resolveMediaResourceResponseSchema.parse(response)
  }

  readPlaylistSync(): ReadPlaylistResponseDto {
    return readPlaylistResponseSchema.parse({
      video_ids: this.state.playlistIds,
    })
  }

  readImportTasksSync(): ReadImportTasksResponseDto {
    return readImportTasksResponseSchema.parse({
      tasks: this.state.importTasks,
    })
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
}
