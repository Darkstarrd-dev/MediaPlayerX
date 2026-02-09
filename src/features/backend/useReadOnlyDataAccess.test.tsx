import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type {
  EnqueueImportTaskRequestDto,
  EnqueueImportTaskResponseDto,
  LibrarySnapshotDto,
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
import { useReadOnlyDataAccess } from './useReadOnlyDataAccess'
import type { ReadonlyMediaRepository, RepositoryRequestOptions } from './repository'

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
        feature_vector: [0, 0, 0, 0, 0, 0, 0, 0],
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

function createHookParams(repository: ReadonlyMediaRepository, overrides?: Partial<Parameters<typeof useReadOnlyDataAccess>[0]>) {
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
    featureCircleQuery: '',
    featureAuthorQuery: '',
    featureTags: [],
    featureGradeFilter: null,
    gradeByPackage: {},
    ...overrides,
  }
}

class CancellationAwareRepository implements ReadonlyMediaRepository {
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

class RetrySnapshotRepository implements ReadonlyMediaRepository {
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

    const repository: ReadonlyMediaRepository = {
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
})
