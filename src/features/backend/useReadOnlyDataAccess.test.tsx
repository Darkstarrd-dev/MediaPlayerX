import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type {
  LibrarySnapshotDto,
  MediaAccessAuditResponseDto,
  ReadImageMetadataRequestDto,
  ReadImageMetadataResponseDto,
  ReadImagePageRequestDto,
  ReadImagePageResponseDto,
  ReadImageSidebarTreeRequestDto,
  ReadImageSidebarTreeResponseDto,
  ResolveMediaResourceRequestDto,
  ResolveMediaResourceResponseDto,
  SaveVideoCoverRequestDto,
  SaveVideoCoverResponseDto,
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
})
