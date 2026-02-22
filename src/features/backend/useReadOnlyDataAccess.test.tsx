import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  EnqueueImportTaskRequestDto,
  EnqueueImportTaskResponseDto,
  LibrarySnapshotDto,
  LibrarySnapshotLiteDto,
  ReadImportTasksResponseDto,
  ReadRuntimeCapabilitiesResponseDto,
  MediaAccessAuditResponseDto,
  ReadImageMetadataRequestDto,
  ReadImageMetadataResponseDto,
  ReadPlaylistResponseDto,
  ReadImagePageRequestDto,
  ReadImagePageResponseDto,
  ReadImageSidebarTreeRequestDto,
  ReadImageSidebarTreeResponseDto,
  ResolveMediaResourceRequestDto,
  ResolveMediaResourceResponseDto,
  RetryImportTaskRequestDto,
  RetryImportTaskResponseDto,
  SaveVideoCoverRequestDto,
  SaveVideoCoverResponseDto,
  WritePlaylistRequestDto,
  WritePlaylistResponseDto,
  WritePackageGradeRequestDto,
  WritePackageGradeResponseDto,
} from '../../contracts/backend'
import { setBenchSettings } from '../perf/benchSettings'
import { useReadOnlyDataAccess } from './useReadOnlyDataAccess'
import type { MediaRepository, RepositoryRequestOptions } from './repository'

function createAbortError(): Error {
  const error = new Error('aborted')
  error.name = 'AbortError'
  return error
}

function createPackageDto(id: string, displayName: string): LibrarySnapshotDto['image_packages'][number] {
  return {
    id,
    package_name: `${displayName}.zip`,
    display_name: displayName,
    absolute_path: `Z:/bench/${displayName}.zip`,
    tree_path: [`${displayName}.zip`],
    work_title: displayName,
    series_id: '',
    circle: '未知',
    author: '未知',
    tags: [],
    mock_grade: null,
    images: [
      {
        id: `${id}-img-1`,
        ordinal: 1,
        width: 1920,
        height: 1080,
        size_kb: 120,
        cluster: 0,
        color: '#dd6b66',
        media_locator: {
          kind: 'filesystem' as const,
          absolute_path: `Z:/bench/${displayName}.jpg`,
          extension: '.jpg',
          media_type: 'image' as const,
          mime_type: 'image/jpeg',
        },
      },
    ],
  }
}

function createLibrarySnapshot(): LibrarySnapshotDto {
  return {
    image_packages: [createPackageDto('pkg-base', 'base')],
    image_directories: [],
    videos: [],
  }
}

function createBaselineRepository(overrides?: Partial<MediaRepository>): MediaRepository {
  const snapshot = createLibrarySnapshot()
  const source = snapshot.image_packages[0]!
  const sidebarResponse = createSidebarResponse(source)
  const pageResponse: ReadImagePageResponseDto = {
    source_id: source.id,
    total_items: source.images.length,
    page_index: 0,
    page_size: 12,
    refs: [{ package_id: source.id, image_index: 0 }],
  }
  const metadataResponse: ReadImageMetadataResponseDto = {
    package: source,
    image: source.images[0],
    grade: source.mock_grade,
  }
  const baseRepository: MediaRepository = {
    getInitialLibrarySnapshot: () => snapshot,
    readLibrarySnapshot: async () => snapshot,
    readImageSidebarTree: async () => sidebarResponse,
    readImagePage: async () => pageResponse,
    readImageMetadata: async () => metadataResponse,
    resolveMediaResource: async () => ({
      resource_url: 'about:blank#media',
      mime_type: 'image/jpeg',
      expires_at_ms: Date.now() + 1_000,
    }),
    writePackageGrade: async (request: WritePackageGradeRequestDto) => ({
      package_id: request.package_id,
      grade: request.grade,
      updated_at_ms: Date.now(),
    }),
    saveVideoCover: async (request: SaveVideoCoverRequestDto) => ({
      video_id: request.video_id,
      cover_color: request.fallback_color ?? 'hsl(120, 44%, 40%)',
      cover_image_path: null,
      updated_at_ms: Date.now(),
    }),
    readPlaylist: async () => ({ video_ids: [] }),
    writePlaylist: async (request: WritePlaylistRequestDto) => ({
      video_ids: request.video_ids,
      updated_at_ms: Date.now(),
    }),
    enqueueImportTask: async (request: EnqueueImportTaskRequestDto) => ({
      task: {
        task_id: 'task-baseline',
        task_type: 'import',
        source: request.source,
        paths: request.paths,
        status: 'completed',
        progress: 1,
        processed_count: request.paths.length,
        total_count: request.paths.length,
        message: 'ok',
        error_detail: null,
        created_at_ms: Date.now(),
        updated_at_ms: Date.now(),
      },
    }),
    readImportTasks: async () => ({ tasks: [] }),
    retryImportTask: async (request: RetryImportTaskRequestDto) => ({
      task: {
        task_id: request.task_id,
        task_type: 'import',
        source: 'dialog-files',
        paths: ['Z:/bench/retry.jpg'],
        status: 'completed',
        progress: 1,
        processed_count: 1,
        total_count: 1,
        message: 'retried',
        error_detail: null,
        created_at_ms: Date.now(),
        updated_at_ms: Date.now(),
      },
    }),
    readMediaAccessAudit: async () => ({
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
    }),
    readRuntimeCapabilities: async () => ({
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
      minimum_matrix: [],
      generated_at_ms: Date.now(),
    }),
  }

  return {
    ...baseRepository,
    ...overrides,
  }
}

function createSidebarResponse(packageDto: ReturnType<typeof createPackageDto>): ReadImageSidebarTreeResponseDto {
  return {
    image_packages: [packageDto],
    image_directories: [],
    tree: [
      {
        id: `package:${packageDto.tree_path.join('/')}`,
        label: packageDto.tree_path[packageDto.tree_path.length - 1] ?? packageDto.display_name,
        kind: 'package',
        children: [],
        package_id: packageDto.id,
        image_source_id: packageDto.id,
        direct_image_count: packageDto.images.length,
        path_key: packageDto.tree_path.join('/'),
      },
    ],
  }
}

function createHookParams(repository: MediaRepository, overrides?: Partial<Parameters<typeof useReadOnlyDataAccess>[0]>) {
  return {
    repository,
    mode: 'image' as const,
    includeHidden: false,
    selectedSourceId: 'pkg-base',
    pageIndex: 0,
    pageSize: 12,
    showNamesOnly: false,
    focusedRef: { packageId: 'pkg-base', imageIndex: 0 },
    vectorResultsActive: false,
    featureNameQuery: '',
    featureWorkTitleQuery: '',
    featureSeriesIdQuery: '',
    featureCircleQuery: '',
    featureAuthorQuery: '',
    featureTags: [],
    featureGradeFilter: null,
    gradeByPackage: {},
    ...overrides,
  }
}

class GradeRefreshTrackingRepository implements MediaRepository {
  private readonly snapshot = createLibrarySnapshot()

  private libraryChangedListener: ((payload: { reason: string; updated_at_ms: number }) => void) | null = null

  readonly readImageSidebarTree = vi.fn(
    async (request: ReadImageSidebarTreeRequestDto): Promise<ReadImageSidebarTreeResponseDto> => {
      void request
      return createSidebarResponse(this.snapshot.image_packages[0]!)
    },
  )

  readonly readImagePage = vi.fn(
    async (request: ReadImagePageRequestDto): Promise<ReadImagePageResponseDto> => ({
      source_id: 'pkg-base',
      total_items: 1,
      page_index: request.page_index,
      page_size: request.page_size,
      refs: [{ package_id: 'pkg-base', image_index: 0 }],
    }),
  )

  readonly readImageMetadata = vi.fn(
    async (request: ReadImageMetadataRequestDto): Promise<ReadImageMetadataResponseDto> => {
      void request
      return {
        package: this.snapshot.image_packages[0]!,
        image: this.snapshot.image_packages[0]!.images[0],
        grade: this.snapshot.image_packages[0]!.mock_grade,
      }
    },
  )

  getInitialLibrarySnapshot(): LibrarySnapshotDto {
    return this.snapshot
  }

  async readLibrarySnapshot(): Promise<LibrarySnapshotDto> {
    return this.snapshot
  }

  async resolveMediaResource(
    request: ResolveMediaResourceRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ResolveMediaResourceResponseDto> {
    void request
    void options
    return {
      resource_url: 'about:blank#media',
      mime_type: 'image/jpeg',
      expires_at_ms: Date.now() + 1_000,
    }
  }

  async writePackageGrade(
    request: WritePackageGradeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePackageGradeResponseDto> {
    void options
    return {
      package_id: request.package_id,
      grade: request.grade,
      updated_at_ms: Date.now(),
    }
  }

  async saveVideoCover(
    request: SaveVideoCoverRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SaveVideoCoverResponseDto> {
    void options
    return {
      video_id: request.video_id,
      cover_color: request.fallback_color ?? 'hsl(120, 44%, 40%)',
      cover_image_path: null,
      updated_at_ms: Date.now(),
    }
  }

  async readPlaylist(options?: RepositoryRequestOptions): Promise<ReadPlaylistResponseDto> {
    void options
    return {
      video_ids: [],
    }
  }

  async writePlaylist(
    request: WritePlaylistRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePlaylistResponseDto> {
    void options
    return {
      video_ids: request.video_ids,
      updated_at_ms: Date.now(),
    }
  }

  async enqueueImportTask(
    request: EnqueueImportTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<EnqueueImportTaskResponseDto> {
    void options
    return {
      task: {
        task_id: 'task-grade-refresh',
        task_type: 'import',
        source: request.source,
        paths: request.paths,
        status: 'completed',
        progress: 1,
        processed_count: request.paths.length,
        total_count: request.paths.length,
        message: 'ok',
        error_detail: null,
        created_at_ms: Date.now(),
        updated_at_ms: Date.now(),
      },
    }
  }

  async readImportTasks(options?: RepositoryRequestOptions): Promise<ReadImportTasksResponseDto> {
    void options
    return {
      tasks: [],
    }
  }

  async retryImportTask(
    request: RetryImportTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<RetryImportTaskResponseDto> {
    void options
    return {
      task: {
        task_id: request.task_id,
        task_type: 'import',
        source: 'dialog-files',
        paths: ['Z:/bench/retry.jpg'],
        status: 'completed',
        progress: 1,
        processed_count: 1,
        total_count: 1,
        message: 'retried',
        error_detail: null,
        created_at_ms: Date.now(),
        updated_at_ms: Date.now(),
      },
    }
  }

  async readMediaAccessAudit(options?: RepositoryRequestOptions): Promise<MediaAccessAuditResponseDto> {
    void options
    return {
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
    }
  }

  async readRuntimeCapabilities(options?: RepositoryRequestOptions): Promise<ReadRuntimeCapabilitiesResponseDto> {
    void options
    return {
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
      minimum_matrix: [],
      generated_at_ms: Date.now(),
    }
  }

  onLibraryChanged(listener: (payload: { reason: string; updated_at_ms: number }) => void): () => void {
    this.libraryChangedListener = listener
    return () => {
      if (this.libraryChangedListener === listener) {
        this.libraryChangedListener = null
      }
    }
  }

  emitLibraryChanged(reason: string): void {
    this.libraryChangedListener?.({
      reason,
      updated_at_ms: Date.now(),
    })
  }
}

class CancellationAwareRepository implements MediaRepository {
  private readonly snapshot = createLibrarySnapshot()

  getInitialLibrarySnapshot(): LibrarySnapshotDto {
    return this.snapshot
  }

  async readLibrarySnapshot(): Promise<LibrarySnapshotDto> {
    return this.snapshot
  }

  async readImageSidebarTree(
    request: ReadImageSidebarTreeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadImageSidebarTreeResponseDto> {
    const first = request.feature_filter.name_query === 'first'
    const response = first
      ? createSidebarResponse(createPackageDto('pkg-first', 'first'))
      : createSidebarResponse(createPackageDto('pkg-second', 'second'))
    const delayMs = first ? 80 : 8

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        resolve(response)
      }, delayMs)

      options?.signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer)
          reject(createAbortError())
        },
        { once: true },
      )
    })
  }

  async readImagePage(request: ReadImagePageRequestDto): Promise<ReadImagePageResponseDto> {
    void request
    return {
      source_id: 'pkg-base',
      total_items: 1,
      page_index: 0,
      page_size: 12,
      refs: [{ package_id: 'pkg-base', image_index: 0 }],
    }
  }

  async readImageMetadata(request: ReadImageMetadataRequestDto): Promise<ReadImageMetadataResponseDto> {
    void request
    const source = this.snapshot.image_packages[0]
    return {
      package: source,
      image: source.images[0],
      grade: null,
    }
  }

  async resolveMediaResource(
    request: ResolveMediaResourceRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ResolveMediaResourceResponseDto> {
    void request
    void options
    return {
      resource_url: 'about:blank#media',
      mime_type: 'image/jpeg',
      expires_at_ms: Date.now() + 1_000,
    }
  }

  async writePackageGrade(
    request: WritePackageGradeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePackageGradeResponseDto> {
    void options
    return {
      package_id: request.package_id,
      grade: request.grade,
      updated_at_ms: Date.now(),
    }
  }

  async saveVideoCover(
    request: SaveVideoCoverRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SaveVideoCoverResponseDto> {
    void options
    return {
      video_id: request.video_id,
      cover_color: request.fallback_color ?? 'hsl(120, 44%, 40%)',
      cover_image_path: null,
      updated_at_ms: Date.now(),
    }
  }

  async readPlaylist(options?: RepositoryRequestOptions): Promise<ReadPlaylistResponseDto> {
    void options
    return {
      video_ids: [],
    }
  }

  async writePlaylist(
    request: WritePlaylistRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePlaylistResponseDto> {
    void options
    return {
      video_ids: request.video_ids,
      updated_at_ms: Date.now(),
    }
  }

  async enqueueImportTask(
    request: EnqueueImportTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<EnqueueImportTaskResponseDto> {
    void options
    return {
      task: {
        task_id: 'task-cancellation-aware',
        task_type: 'import',
        source: request.source,
        paths: request.paths,
        status: 'completed',
        progress: 1,
        processed_count: request.paths.length,
        total_count: request.paths.length,
        message: 'ok',
        error_detail: null,
        created_at_ms: Date.now(),
        updated_at_ms: Date.now(),
      },
    }
  }

  async readImportTasks(options?: RepositoryRequestOptions): Promise<ReadImportTasksResponseDto> {
    void options
    return {
      tasks: [],
    }
  }

  async retryImportTask(
    request: RetryImportTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<RetryImportTaskResponseDto> {
    void options
    return {
      task: {
        task_id: request.task_id,
        task_type: 'import',
        source: 'dialog-files',
        paths: ['Z:/bench/retry.jpg'],
        status: 'completed',
        progress: 1,
        processed_count: 1,
        total_count: 1,
        message: 'retried',
        error_detail: null,
        created_at_ms: Date.now(),
        updated_at_ms: Date.now(),
      },
    }
  }

  async readMediaAccessAudit(options?: RepositoryRequestOptions): Promise<MediaAccessAuditResponseDto> {
    void options
    return {
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
    }
  }

  async readRuntimeCapabilities(options?: RepositoryRequestOptions): Promise<ReadRuntimeCapabilitiesResponseDto> {
    void options
    return {
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
          note: 'all good',
        },
      ],
      generated_at_ms: Date.now(),
    }
  }
}

class RetrySnapshotRepository implements MediaRepository {
  private readonly snapshot = createLibrarySnapshot()

  private sidebarCallCount = 0

  getInitialLibrarySnapshot(): LibrarySnapshotDto {
    return this.snapshot
  }

  async readLibrarySnapshot(): Promise<LibrarySnapshotDto> {
    return this.snapshot
  }

  async readImageSidebarTree(request: ReadImageSidebarTreeRequestDto): Promise<ReadImageSidebarTreeResponseDto> {
    void request
    this.sidebarCallCount += 1

    if (this.sidebarCallCount === 1) {
      return createSidebarResponse(createPackageDto('pkg-a', 'alpha'))
    }

    if (this.sidebarCallCount === 2) {
      throw new Error('sidebar-failed')
    }

    return createSidebarResponse(createPackageDto('pkg-c', 'charlie'))
  }

  async readImagePage(request: ReadImagePageRequestDto): Promise<ReadImagePageResponseDto> {
    void request
    return {
      source_id: 'pkg-base',
      total_items: 1,
      page_index: 0,
      page_size: 12,
      refs: [{ package_id: 'pkg-base', image_index: 0 }],
    }
  }

  async readImageMetadata(request: ReadImageMetadataRequestDto): Promise<ReadImageMetadataResponseDto> {
    void request
    const source = this.snapshot.image_packages[0]
    return {
      package: source,
      image: source.images[0],
      grade: null,
    }
  }

  async resolveMediaResource(
    request: ResolveMediaResourceRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ResolveMediaResourceResponseDto> {
    void request
    void options
    return {
      resource_url: 'about:blank#media',
      mime_type: 'image/jpeg',
      expires_at_ms: Date.now() + 1_000,
    }
  }

  async writePackageGrade(
    request: WritePackageGradeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePackageGradeResponseDto> {
    void options
    return {
      package_id: request.package_id,
      grade: request.grade,
      updated_at_ms: Date.now(),
    }
  }

  async saveVideoCover(
    request: SaveVideoCoverRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SaveVideoCoverResponseDto> {
    void options
    return {
      video_id: request.video_id,
      cover_color: request.fallback_color ?? 'hsl(120, 44%, 40%)',
      cover_image_path: null,
      updated_at_ms: Date.now(),
    }
  }

  async readPlaylist(options?: RepositoryRequestOptions): Promise<ReadPlaylistResponseDto> {
    void options
    return {
      video_ids: [],
    }
  }

  async writePlaylist(
    request: WritePlaylistRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePlaylistResponseDto> {
    void options
    return {
      video_ids: request.video_ids,
      updated_at_ms: Date.now(),
    }
  }

  async enqueueImportTask(
    request: EnqueueImportTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<EnqueueImportTaskResponseDto> {
    void options
    return {
      task: {
        task_id: 'task-retry-snapshot',
        task_type: 'import',
        source: request.source,
        paths: request.paths,
        status: 'completed',
        progress: 1,
        processed_count: request.paths.length,
        total_count: request.paths.length,
        message: 'ok',
        error_detail: null,
        created_at_ms: Date.now(),
        updated_at_ms: Date.now(),
      },
    }
  }

  async readImportTasks(options?: RepositoryRequestOptions): Promise<ReadImportTasksResponseDto> {
    void options
    return {
      tasks: [],
    }
  }

  async retryImportTask(
    request: RetryImportTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<RetryImportTaskResponseDto> {
    void options
    return {
      task: {
        task_id: request.task_id,
        task_type: 'import',
        source: 'dialog-files',
        paths: ['Z:/bench/retry.jpg'],
        status: 'completed',
        progress: 1,
        processed_count: 1,
        total_count: 1,
        message: 'retried',
        error_detail: null,
        created_at_ms: Date.now(),
        updated_at_ms: Date.now(),
      },
    }
  }

  async readMediaAccessAudit(options?: RepositoryRequestOptions): Promise<MediaAccessAuditResponseDto> {
    void options
    return {
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
    }
  }

  async readRuntimeCapabilities(options?: RepositoryRequestOptions): Promise<ReadRuntimeCapabilitiesResponseDto> {
    void options
    return {
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
          note: 'all good',
        },
      ],
      generated_at_ms: Date.now(),
    }
  }
}

describe('useReadOnlyDataAccess', () => {
  afterEach(() => {
    // 恢复全局 bench 设置，避免影响其他测试
    setBenchSettings({ enabled: false })
  })

  it('仅在评分筛选启用时透传 grade_overrides', async () => {
    const repository = new GradeRefreshTrackingRepository()
    const gradeOverrides = { 'pkg-base': 4 }

    const { rerender } = renderHook((params: ReturnType<typeof createHookParams>) => useReadOnlyDataAccess(params), {
      initialProps: createHookParams(repository, {
        featureGradeFilter: null,
        gradeByPackage: gradeOverrides,
      }),
    })

    await waitFor(() => {
      expect(repository.readImageSidebarTree).toHaveBeenCalledTimes(1)
      expect(repository.readImagePage).toHaveBeenCalledTimes(1)
    })

    const firstSidebarRequest = repository.readImageSidebarTree.mock.calls[0]?.[0]
    const firstPageRequest = repository.readImagePage.mock.calls[0]?.[0]
    expect(firstSidebarRequest?.grade_overrides).toBeUndefined()
    expect(firstPageRequest?.grade_overrides).toBeUndefined()

    rerender(
      createHookParams(repository, {
        featureGradeFilter: 4,
        gradeByPackage: gradeOverrides,
      }),
    )

    await waitFor(() => {
      expect(repository.readImageSidebarTree).toHaveBeenCalledTimes(2)
      expect(repository.readImagePage).toHaveBeenCalledTimes(2)
    })

    const secondSidebarRequest = repository.readImageSidebarTree.mock.calls[1]?.[0]
    const secondPageRequest = repository.readImagePage.mock.calls[1]?.[0]
    expect(secondSidebarRequest?.grade_overrides).toEqual(gradeOverrides)
    expect(secondPageRequest?.grade_overrides).toEqual(gradeOverrides)
  })

  it('write-package-grade 事件在无评分筛选时不会触发刷新', async () => {
    const repository = new GradeRefreshTrackingRepository()

    renderHook((params: ReturnType<typeof createHookParams>) => useReadOnlyDataAccess(params), {
      initialProps: createHookParams(repository, {
        featureGradeFilter: null,
      }),
    })

    await waitFor(() => {
      expect(repository.readImageSidebarTree).toHaveBeenCalledTimes(1)
      expect(repository.readImagePage).toHaveBeenCalledTimes(1)
      expect(repository.readImageMetadata).toHaveBeenCalledTimes(1)
    })

    const sidebarCallsBefore = repository.readImageSidebarTree.mock.calls.length
    const pageCallsBefore = repository.readImagePage.mock.calls.length
    const metadataCallsBefore = repository.readImageMetadata.mock.calls.length

    await act(async () => {
      repository.emitLibraryChanged('write-package-grade')
      await new Promise((resolve) => setTimeout(resolve, 220))
    })

    expect(repository.readImageSidebarTree).toHaveBeenCalledTimes(sidebarCallsBefore)
    expect(repository.readImagePage).toHaveBeenCalledTimes(pageCallsBefore)
    expect(repository.readImageMetadata).toHaveBeenCalledTimes(metadataCallsBefore)
  })

  it('thumbnail-rendering 事件不会触发 Sidebar/Page/Metadata 切片刷新', async () => {
    const repository = new GradeRefreshTrackingRepository()

    renderHook((params: ReturnType<typeof createHookParams>) => useReadOnlyDataAccess(params), {
      initialProps: createHookParams(repository, {
        featureGradeFilter: null,
      }),
    })

    await waitFor(() => {
      expect(repository.readImageSidebarTree).toHaveBeenCalledTimes(1)
      expect(repository.readImagePage).toHaveBeenCalledTimes(1)
      expect(repository.readImageMetadata).toHaveBeenCalledTimes(1)
    })

    const sidebarCallsBefore = repository.readImageSidebarTree.mock.calls.length
    const pageCallsBefore = repository.readImagePage.mock.calls.length
    const metadataCallsBefore = repository.readImageMetadata.mock.calls.length

    await act(async () => {
      repository.emitLibraryChanged('thumbnail-rendering-start')
      repository.emitLibraryChanged('thumbnail-rendering-end')
      await new Promise((resolve) => setTimeout(resolve, 220))
    })

    expect(repository.readImageSidebarTree).toHaveBeenCalledTimes(sidebarCallsBefore)
    expect(repository.readImagePage).toHaveBeenCalledTimes(pageCallsBefore)
    expect(repository.readImageMetadata).toHaveBeenCalledTimes(metadataCallsBefore)
  })

  it('write-package-grade 事件在评分筛选启用时仅刷新 Sidebar/Page', async () => {
    const repository = new GradeRefreshTrackingRepository()

    renderHook((params: ReturnType<typeof createHookParams>) => useReadOnlyDataAccess(params), {
      initialProps: createHookParams(repository, {
        featureGradeFilter: 3,
        gradeByPackage: { 'pkg-base': 3 },
      }),
    })

    await waitFor(() => {
      expect(repository.readImageSidebarTree).toHaveBeenCalledTimes(1)
      expect(repository.readImagePage).toHaveBeenCalledTimes(1)
      expect(repository.readImageMetadata).toHaveBeenCalledTimes(1)
    })

    const sidebarCallsBefore = repository.readImageSidebarTree.mock.calls.length
    const pageCallsBefore = repository.readImagePage.mock.calls.length
    const metadataCallsBefore = repository.readImageMetadata.mock.calls.length

    await act(async () => {
      repository.emitLibraryChanged('write-package-grade')
      await new Promise((resolve) => setTimeout(resolve, 220))
    })

    await waitFor(() => {
      expect(repository.readImageSidebarTree.mock.calls.length).toBeGreaterThan(sidebarCallsBefore)
      expect(repository.readImagePage.mock.calls.length).toBeGreaterThan(pageCallsBefore)
    })
    expect(repository.readImageMetadata).toHaveBeenCalledTimes(metadataCallsBefore)
  })

  it('元数据管理挂起刷新时，元数据写事件不会刷新缩略图相关切片，退出后补一次全量刷新', async () => {
    const repository = new GradeRefreshTrackingRepository()

    const { rerender } = renderHook((params: ReturnType<typeof createHookParams>) => useReadOnlyDataAccess(params), {
      initialProps: createHookParams(repository, {
        featureGradeFilter: 3,
        gradeByPackage: { 'pkg-base': 3 },
        suspendLibraryChangedRefresh: true,
      }),
    })

    await waitFor(() => {
      expect(repository.readImageSidebarTree).toHaveBeenCalledTimes(1)
      expect(repository.readImagePage).toHaveBeenCalledTimes(1)
      expect(repository.readImageMetadata).toHaveBeenCalledTimes(1)
    })

    const sidebarCallsBefore = repository.readImageSidebarTree.mock.calls.length
    const pageCallsBefore = repository.readImagePage.mock.calls.length
    const metadataCallsBefore = repository.readImageMetadata.mock.calls.length

    await act(async () => {
      repository.emitLibraryChanged('write-package-grade')
      repository.emitLibraryChanged('write-package-metadata')
      repository.emitLibraryChanged('write-package-external-metadata')
      await new Promise((resolve) => setTimeout(resolve, 220))
    })

    expect(repository.readImageSidebarTree).toHaveBeenCalledTimes(sidebarCallsBefore)
    expect(repository.readImagePage).toHaveBeenCalledTimes(pageCallsBefore)
    expect(repository.readImageMetadata).toHaveBeenCalledTimes(metadataCallsBefore)

    rerender(
      createHookParams(repository, {
        featureGradeFilter: 3,
        gradeByPackage: { 'pkg-base': 3 },
        suspendLibraryChangedRefresh: false,
      }),
    )

    await waitFor(() => {
      expect(repository.readImageSidebarTree.mock.calls.length).toBeGreaterThan(sidebarCallsBefore)
      expect(repository.readImagePage.mock.calls.length).toBeGreaterThan(pageCallsBefore)
      expect(repository.readImageMetadata.mock.calls.length).toBeGreaterThan(metadataCallsBefore)
    })
  })

  it('importBusy 期间延迟 import-task-updated 的 library 刷新并在结束后补一次', async () => {
    const snapshot = createLibrarySnapshot()
    const readLibrarySnapshot = vi.fn(async () => snapshot)
    let listener: ((payload: { reason: string; updated_at_ms: number }) => void) | null = null

    const repository = createBaselineRepository({
      getInitialLibrarySnapshot: () => null,
      readLibrarySnapshot,
      onLibraryChanged: (registeredListener) => {
        listener = registeredListener
        return () => {
          if (listener === registeredListener) {
            listener = null
          }
        }
      },
    })

    const { rerender } = renderHook((params: ReturnType<typeof createHookParams>) => useReadOnlyDataAccess(params), {
      initialProps: createHookParams(repository, { importBusy: true }),
    })

    await waitFor(() => {
      expect(readLibrarySnapshot).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      listener?.({
        reason: 'import-task-updated',
        updated_at_ms: Date.now(),
      })
      await new Promise((resolve) => setTimeout(resolve, 220))
    })

    expect(readLibrarySnapshot).toHaveBeenCalledTimes(1)

    rerender(createHookParams(repository, { importBusy: false }))

    await waitFor(() => {
      expect(readLibrarySnapshot.mock.calls.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('筛选切换时可取消旧请求，且旧响应不会覆盖新状态', async () => {
    const repository = new CancellationAwareRepository()
    const { result, rerender } = renderHook((params: ReturnType<typeof createHookParams>) => useReadOnlyDataAccess(params), {
      initialProps: createHookParams(repository, { featureNameQuery: 'first' }),
    })

    rerender(createHookParams(repository, { featureNameQuery: 'second' }))

    await waitFor(() => {
      expect(result.current.sidebar.data?.imagePackages[0]?.displayName).toBe('second')
    })
    expect(result.current.sidebar.error).toBeNull()
  })

  it('失败后保留快照并支持重试恢复', async () => {
    const repository = new RetrySnapshotRepository()
    const { result, rerender } = renderHook((params: ReturnType<typeof createHookParams>) => useReadOnlyDataAccess(params), {
      initialProps: createHookParams(repository, { featureNameQuery: 'alpha' }),
    })

    await waitFor(() => {
      expect(result.current.sidebar.data?.imagePackages[0]?.displayName).toBe('alpha')
    })

    rerender(createHookParams(repository, { featureNameQuery: 'bravo' }))

    await waitFor(() => {
      expect(result.current.sidebar.error).toBe('sidebar-failed')
    })
    expect(result.current.sidebar.data?.imagePackages[0]?.displayName).toBe('alpha')

    await act(async () => {
      result.current.retrySidebar()
    })

    await waitFor(() => {
      expect(result.current.sidebar.error).toBeNull()
      expect(result.current.sidebar.data?.imagePackages[0]?.displayName).toBe('charlie')
    })
  })

  it('lite 快照仅在接口缺失错误时回退到 legacy snapshot', async () => {
    const legacySnapshot = createLibrarySnapshot()
    const readLibrarySnapshotLite = vi
      .fn<() => Promise<LibrarySnapshotLiteDto>>()
      .mockRejectedValue(new Error('readLibrarySnapshotLite is not a function'))
    const readLibrarySnapshot = vi
      .fn<() => Promise<LibrarySnapshotDto>>()
      .mockResolvedValue(legacySnapshot)

    const repository = createBaselineRepository({
      getInitialLibrarySnapshot: () => null,
      readLibrarySnapshotLite,
      readLibrarySnapshot,
    })

    const { result } = renderHook((params: ReturnType<typeof createHookParams>) => useReadOnlyDataAccess(params), {
      initialProps: createHookParams(repository),
    })

    await waitFor(() => {
      expect(readLibrarySnapshotLite).toHaveBeenCalledTimes(1)
      expect(readLibrarySnapshot).toHaveBeenCalledTimes(1)
      expect(result.current.library.error).toBeNull()
      expect(result.current.library.data?.imagePackages.length).toBe(legacySnapshot.image_packages.length)
    })

  })

  it('lite 快照遇到非接口缺失错误时不回退 legacy snapshot', async () => {
    const readLibrarySnapshotLite = vi
      .fn<() => Promise<LibrarySnapshotLiteDto>>()
      .mockRejectedValue(new Error('readLibrarySnapshotLite timeout'))
    const readLibrarySnapshot = vi.fn<() => Promise<LibrarySnapshotDto>>()

    const repository = createBaselineRepository({
      getInitialLibrarySnapshot: () => null,
      readLibrarySnapshotLite,
      readLibrarySnapshot,
    })

    const { result } = renderHook((params: ReturnType<typeof createHookParams>) => useReadOnlyDataAccess(params), {
      initialProps: createHookParams(repository),
    })

    await waitFor(() => {
      expect(result.current.library.error).toBe('readLibrarySnapshotLite timeout')
    })
    expect(readLibrarySnapshotLite).toHaveBeenCalledTimes(1)
    expect(readLibrarySnapshot).not.toHaveBeenCalled()
  })

  it('管理模式开启时会向 Sidebar/Page/Metadata 请求透传 include_hidden=true', async () => {
    const snapshot = createLibrarySnapshot()
    const source = snapshot.image_packages[0]
    if (!source) {
      throw new Error('mock source not found')
    }

    const readImageSidebarTree = vi.fn(async (request: ReadImageSidebarTreeRequestDto): Promise<ReadImageSidebarTreeResponseDto> => {
      void request
      return createSidebarResponse(source)
    })

    const readImagePage = vi.fn(async (request: ReadImagePageRequestDto): Promise<ReadImagePageResponseDto> => {
      return {
        source_id: source.id,
        total_items: source.images.length,
        page_index: request.page_index,
        page_size: request.page_size,
        refs: [{ package_id: source.id, image_index: 0 }],
      }
    })

    const readImageMetadata = vi.fn(
      async (request: ReadImageMetadataRequestDto): Promise<ReadImageMetadataResponseDto> => {
        void request
        return {
          package: source,
          image: source.images[0],
          grade: source.mock_grade,
        }
      },
    )

    const repository: MediaRepository = {
      getInitialLibrarySnapshot: () => snapshot,
      readLibrarySnapshot: async () => snapshot,
      readImageSidebarTree,
      readImagePage,
      readImageMetadata,
      resolveMediaResource: async () => ({
        resource_url: 'about:blank#media',
        mime_type: 'image/jpeg',
        expires_at_ms: Date.now() + 1_000,
      }),
      writePackageGrade: async (request: WritePackageGradeRequestDto) => ({
        package_id: request.package_id,
        grade: request.grade,
        updated_at_ms: Date.now(),
      }),
      saveVideoCover: async (request: SaveVideoCoverRequestDto) => ({
        video_id: request.video_id,
        cover_color: request.fallback_color ?? 'hsl(120, 44%, 40%)',
        cover_image_path: null,
        updated_at_ms: Date.now(),
      }),
      readPlaylist: async () => ({
        video_ids: [],
      }),
      writePlaylist: async (request: WritePlaylistRequestDto) => ({
        video_ids: request.video_ids,
        updated_at_ms: Date.now(),
      }),
      enqueueImportTask: async (request: EnqueueImportTaskRequestDto) => ({
        task: {
          task_id: 'task-include-hidden',
          task_type: 'import',
          source: request.source,
          paths: request.paths,
          status: 'completed',
          progress: 1,
          processed_count: request.paths.length,
          total_count: request.paths.length,
          message: 'ok',
          error_detail: null,
          created_at_ms: Date.now(),
          updated_at_ms: Date.now(),
        },
      }),
      readImportTasks: async () => ({
        tasks: [],
      }),
      retryImportTask: async (request: RetryImportTaskRequestDto) => ({
        task: {
          task_id: request.task_id,
          task_type: 'import',
          source: 'dialog-files',
          paths: ['Z:/bench/retry.jpg'],
          status: 'completed',
          progress: 1,
          processed_count: 1,
          total_count: 1,
          message: 'retried',
          error_detail: null,
          created_at_ms: Date.now(),
          updated_at_ms: Date.now(),
        },
      }),
      readMediaAccessAudit: async () => ({
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
      }),
      readRuntimeCapabilities: async () => ({
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
        minimum_matrix: [],
        generated_at_ms: Date.now(),
      }),
    }

    const { result } = renderHook((params: ReturnType<typeof createHookParams>) => useReadOnlyDataAccess(params), {
      initialProps: createHookParams(repository, { includeHidden: true }),
    })

    await waitFor(() => {
      expect(result.current.sidebar.data?.imagePackages.length).toBeGreaterThan(0)
      expect(result.current.page.data?.sourceId).toBe(source.id)
      expect(result.current.metadata.data?.package.id).toBe(source.id)
    })

    expect(readImageSidebarTree).toHaveBeenCalledWith(
      expect.objectContaining({ include_hidden: true }),
      expect.anything(),
    )
    expect(readImagePage).toHaveBeenCalledWith(
      expect.objectContaining({ include_hidden: true }),
      expect.anything(),
    )
    expect(readImageMetadata).toHaveBeenCalledWith(
      expect.objectContaining({ include_hidden: true }),
      expect.anything(),
    )
  })

  it('video 模式在 dual 上下文启用时会额外读取 image sidebar 数据', async () => {
    const snapshot = createLibrarySnapshot()
    const source = snapshot.image_packages[0]
    if (!source) {
      throw new Error('mock source not found')
    }

    const readImageSidebarTree = vi.fn(
      async (request: ReadImageSidebarTreeRequestDto): Promise<ReadImageSidebarTreeResponseDto> => {
        void request
        return createSidebarResponse(source)
      },
    )

    const repository = createBaselineRepository({
      readImageSidebarTree,
    })

    const { rerender } = renderHook((params: ReturnType<typeof createHookParams>) => useReadOnlyDataAccess(params), {
      initialProps: createHookParams(repository, {
        mode: 'video',
        focusedRef: null,
        selectedSourceId: null,
        enableImageSidebarRead: false,
      }),
    })

    await waitFor(() => {
      expect(readImageSidebarTree).toHaveBeenCalledTimes(0)
    })

    rerender(
      createHookParams(repository, {
        mode: 'video',
        focusedRef: null,
        selectedSourceId: null,
        enableImageSidebarRead: true,
      }),
    )

    await waitFor(() => {
      expect(readImageSidebarTree).toHaveBeenCalledTimes(1)
    })
  })

  it('includeHidden 从 true 切换到 false 时会驱动 Sidebar/Page/Metadata 同步收敛', async () => {
    const snapshot = createLibrarySnapshot()
    const source = snapshot.image_packages[0]
    if (!source) {
      throw new Error('mock source not found')
    }

    const baseImage = source.images[0]
    if (!baseImage || baseImage.media_locator.kind !== 'filesystem') {
      throw new Error('mock base image not found')
    }

    const hiddenImageId = `${source.id}-img-hidden`
    const hiddenImage: typeof baseImage = {
      ...baseImage,
      id: hiddenImageId,
      ordinal: 2,
      hidden: true,
      media_locator: {
        ...baseImage.media_locator,
        absolute_path: baseImage.media_locator.absolute_path.replace('.jpg', '_hidden.jpg'),
      },
    }
    source.images = [{ ...baseImage, hidden: false }, hiddenImage]

    const toVisibleSource = (includeHidden: boolean) => ({
      ...source,
      images: includeHidden ? source.images : source.images.filter((image) => !(image.hidden ?? false)),
    })

    const readImageSidebarTree = vi.fn(async (request: ReadImageSidebarTreeRequestDto): Promise<ReadImageSidebarTreeResponseDto> => {
      const visibleSource = toVisibleSource(request.include_hidden ?? false)
      return createSidebarResponse(visibleSource)
    })

    const readImagePage = vi.fn(async (request: ReadImagePageRequestDto): Promise<ReadImagePageResponseDto> => {
      const visibleSource = toVisibleSource(request.include_hidden ?? false)
      return {
        source_id: visibleSource.id,
        total_items: visibleSource.images.length,
        page_index: request.page_index,
        page_size: request.page_size,
        refs: visibleSource.images.map((_, index) => ({
          package_id: visibleSource.id,
          image_index: index,
        })),
      }
    })

    const readImageMetadata = vi.fn(
      async (request: ReadImageMetadataRequestDto): Promise<ReadImageMetadataResponseDto> => {
        const includeHidden = request.include_hidden ?? false
        const targetImage = source.images[request.image_index]
        if (!targetImage) {
          return null
        }
        if (!includeHidden && (targetImage.hidden ?? false)) {
          return null
        }

        const visibleSource = toVisibleSource(includeHidden)
        const visibleImage = visibleSource.images.find((image) => image.id === targetImage.id)
        if (!visibleImage) {
          return null
        }

        return {
          package: visibleSource,
          image: visibleImage,
          grade: visibleSource.mock_grade,
        }
      },
    )

    const repository: MediaRepository = {
      getInitialLibrarySnapshot: () => snapshot,
      readLibrarySnapshot: async () => snapshot,
      readImageSidebarTree,
      readImagePage,
      readImageMetadata,
      resolveMediaResource: async () => ({
        resource_url: 'about:blank#media',
        mime_type: 'image/jpeg',
        expires_at_ms: Date.now() + 1_000,
      }),
      writePackageGrade: async (request: WritePackageGradeRequestDto) => ({
        package_id: request.package_id,
        grade: request.grade,
        updated_at_ms: Date.now(),
      }),
      saveVideoCover: async (request: SaveVideoCoverRequestDto) => ({
        video_id: request.video_id,
        cover_color: request.fallback_color ?? 'hsl(120, 44%, 40%)',
        cover_image_path: null,
        updated_at_ms: Date.now(),
      }),
      readPlaylist: async () => ({
        video_ids: [],
      }),
      writePlaylist: async (request: WritePlaylistRequestDto) => ({
        video_ids: request.video_ids,
        updated_at_ms: Date.now(),
      }),
      enqueueImportTask: async (request: EnqueueImportTaskRequestDto) => ({
        task: {
          task_id: 'task-include-hidden-toggle',
          task_type: 'import',
          source: request.source,
          paths: request.paths,
          status: 'completed',
          progress: 1,
          processed_count: request.paths.length,
          total_count: request.paths.length,
          message: 'ok',
          error_detail: null,
          created_at_ms: Date.now(),
          updated_at_ms: Date.now(),
        },
      }),
      readImportTasks: async () => ({
        tasks: [],
      }),
      retryImportTask: async (request: RetryImportTaskRequestDto) => ({
        task: {
          task_id: request.task_id,
          task_type: 'import',
          source: 'dialog-files',
          paths: ['Z:/bench/retry.jpg'],
          status: 'completed',
          progress: 1,
          processed_count: 1,
          total_count: 1,
          message: 'retried',
          error_detail: null,
          created_at_ms: Date.now(),
          updated_at_ms: Date.now(),
        },
      }),
      readMediaAccessAudit: async () => ({
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
      }),
      readRuntimeCapabilities: async () => ({
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
        minimum_matrix: [],
        generated_at_ms: Date.now(),
      }),
    }

    const { result, rerender } = renderHook((params: ReturnType<typeof createHookParams>) => useReadOnlyDataAccess(params), {
      initialProps: createHookParams(repository, {
        includeHidden: true,
        focusedRef: {
          packageId: source.id,
          imageIndex: 1,
        },
      }),
    })

    await waitFor(() => {
      expect(result.current.page.data?.totalItems).toBe(2)
      expect(result.current.metadata.data?.image.id).toBe(hiddenImageId)
    })

    rerender(
      createHookParams(repository, {
        includeHidden: false,
        focusedRef: {
          packageId: source.id,
          imageIndex: 1,
        },
      }),
    )

    await waitFor(() => {
      expect(result.current.page.data?.totalItems).toBe(1)
      expect(result.current.metadata.data).toBeNull()
    })

    const sidebarIncludeHiddenValues = readImageSidebarTree.mock.calls.map(([request]) => request.include_hidden)
    const pageIncludeHiddenValues = readImagePage.mock.calls.map(([request]) => request.include_hidden)
    const metadataIncludeHiddenValues = readImageMetadata.mock.calls.map(([request]) => request.include_hidden)

    expect(sidebarIncludeHiddenValues).toContain(true)
    expect(sidebarIncludeHiddenValues).toContain(false)
    expect(pageIncludeHiddenValues).toContain(true)
    expect(pageIncludeHiddenValues).toContain(false)
    expect(metadataIncludeHiddenValues).toContain(true)
    expect(metadataIncludeHiddenValues).toContain(false)
  })

  it('importRefreshThrottle=true（默认）时 import-task-updated 仅刷新 library，不刷新 sidebar/page/metadata', async () => {
    const repository = new GradeRefreshTrackingRepository()

    renderHook((params: ReturnType<typeof createHookParams>) => useReadOnlyDataAccess(params), {
      initialProps: createHookParams(repository),
    })

    await waitFor(() => {
      expect(repository.readImageSidebarTree).toHaveBeenCalledTimes(1)
      expect(repository.readImagePage).toHaveBeenCalledTimes(1)
      expect(repository.readImageMetadata).toHaveBeenCalledTimes(1)
    })

    const sidebarCallsBefore = repository.readImageSidebarTree.mock.calls.length
    const pageCallsBefore = repository.readImagePage.mock.calls.length
    const metadataCallsBefore = repository.readImageMetadata.mock.calls.length

    await act(async () => {
      repository.emitLibraryChanged('import-task-updated')
      await new Promise((resolve) => setTimeout(resolve, 220))
    })

    // library-only scope：sidebar/page/metadata 不被刷新
    expect(repository.readImageSidebarTree).toHaveBeenCalledTimes(sidebarCallsBefore)
    expect(repository.readImagePage).toHaveBeenCalledTimes(pageCallsBefore)
    expect(repository.readImageMetadata).toHaveBeenCalledTimes(metadataCallsBefore)
  })

  it('importRefreshThrottle=false 时 import-task-updated 触发全量刷新（恢复旧行为）', async () => {
    setBenchSettings({
      enabled: true,
      mode: 'e2e',
      candidateId: 'test',
      runTag: 'test',
      importRefreshThrottle: false,
      resolvedMedia: {},
      imageLoadingSkeleton: { mode: 'off' },
      reactProfiler: false,
      e2e: {},
    })

    const repository = new GradeRefreshTrackingRepository()

    renderHook((params: ReturnType<typeof createHookParams>) => useReadOnlyDataAccess(params), {
      initialProps: createHookParams(repository),
    })

    await waitFor(() => {
      expect(repository.readImageSidebarTree).toHaveBeenCalledTimes(1)
      expect(repository.readImagePage).toHaveBeenCalledTimes(1)
      expect(repository.readImageMetadata).toHaveBeenCalledTimes(1)
    })

    const sidebarCallsBefore = repository.readImageSidebarTree.mock.calls.length
    const pageCallsBefore = repository.readImagePage.mock.calls.length
    const metadataCallsBefore = repository.readImageMetadata.mock.calls.length

    await act(async () => {
      repository.emitLibraryChanged('import-task-updated')
      await new Promise((resolve) => setTimeout(resolve, 220))
    })

    // all scope：sidebar/page/metadata 均被刷新
    await waitFor(() => {
      expect(repository.readImageSidebarTree.mock.calls.length).toBeGreaterThan(sidebarCallsBefore)
      expect(repository.readImagePage.mock.calls.length).toBeGreaterThan(pageCallsBefore)
      expect(repository.readImageMetadata.mock.calls.length).toBeGreaterThan(metadataCallsBefore)
    })
  })
})
