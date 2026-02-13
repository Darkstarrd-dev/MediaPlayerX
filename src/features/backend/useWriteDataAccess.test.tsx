import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useState } from 'react'

import type {
  DeleteImageItemsRequestDto,
  DeleteImageItemsResponseDto,
  DeleteSidebarNodesRequestDto,
  DeleteSidebarNodesResponseDto,
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
  SetImageHiddenRequestDto,
  SetImageHiddenResponseDto,
  WritePlaylistRequestDto,
  WritePlaylistResponseDto,
  WritePackageMetadataRequestDto,
  WritePackageMetadataResponseDto,
  WritePackageGradeRequestDto,
  WritePackageGradeResponseDto,
} from '../../contracts/backend'
import type { MediaRepository, RepositoryRequestOptions } from './repository'
import { useWriteDataAccess } from './useWriteDataAccess'

class WritableRepositoryStub implements MediaRepository {
  private shouldFailGrade = false

  private shouldFailCover = false

  private shouldFailMetadata = false

  private shouldFailManage = false

  setFailGrade(enabled: boolean): void {
    this.shouldFailGrade = enabled
  }

  setFailCover(enabled: boolean): void {
    this.shouldFailCover = enabled
  }

  setFailMetadata(enabled: boolean): void {
    this.shouldFailMetadata = enabled
  }

  setFailManage(enabled: boolean): void {
    this.shouldFailManage = enabled
  }

  getInitialLibrarySnapshot(): LibrarySnapshotDto | null {
    return null
  }

  async readLibrarySnapshot(): Promise<LibrarySnapshotDto> {
    throw new Error('not implemented')
  }

  async readImageSidebarTree(
    request: ReadImageSidebarTreeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadImageSidebarTreeResponseDto> {
    void request
    void options
    throw new Error('not implemented')
  }

  async readImagePage(
    request: ReadImagePageRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadImagePageResponseDto> {
    void request
    void options
    throw new Error('not implemented')
  }

  async readImageMetadata(
    request: ReadImageMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadImageMetadataResponseDto> {
    void request
    void options
    throw new Error('not implemented')
  }

  async resolveMediaResource(
    request: ResolveMediaResourceRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ResolveMediaResourceResponseDto> {
    void request
    void options
    throw new Error('not implemented')
  }

  async writePackageGrade(
    request: WritePackageGradeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePackageGradeResponseDto> {
    void options
    if (this.shouldFailGrade) {
      throw new Error('write-grade-failed')
    }
    return {
      package_id: request.package_id,
      grade: request.grade,
      updated_at_ms: Date.now(),
    }
  }

  async writePackageMetadata(
    request: WritePackageMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePackageMetadataResponseDto> {
    void options
    if (this.shouldFailMetadata) {
      throw new Error('write-metadata-failed')
    }
    return {
      package: {
        id: request.package_id,
        package_name: request.sync_work_title_to_package_name ? `${request.work_title}.zip` : 'archive_001.zip',
        display_name: request.sync_work_title_to_package_name ? request.work_title : 'archive_001',
        absolute_path: 'Z:/mock/archive_001.zip',
        tree_path: ['archive_001.zip'],
        work_title: request.work_title,
        series_id: request.series_id ?? '',
        circle: request.circle,
        author: request.author,
        tags: request.tags,
        mock_grade: 4,
        images: [],
      },
      updated_at_ms: Date.now(),
    }
  }

  async saveVideoCover(
    request: SaveVideoCoverRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SaveVideoCoverResponseDto> {
    void options
    if (this.shouldFailCover) {
      throw new Error('save-cover-failed')
    }
    return {
      video_id: request.video_id,
      cover_color: request.fallback_color ?? 'hsl(120, 44%, 40%)',
      cover_image_path: null,
      updated_at_ms: Date.now(),
    }
  }

  async setImageHidden(
    request: SetImageHiddenRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SetImageHiddenResponseDto> {
    void options
    if (this.shouldFailManage) {
      throw new Error('manage-failed')
    }

    return {
      updated_count: request.image_ids.length,
      updated_at_ms: Date.now(),
    }
  }

  async deleteImageItems(
    request: DeleteImageItemsRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<DeleteImageItemsResponseDto> {
    void options
    if (this.shouldFailManage) {
      throw new Error('manage-failed')
    }

    return {
      deleted_count: request.image_ids.length,
      failed: [],
      updated_at_ms: Date.now(),
    }
  }

  async deleteSidebarNodes(
    request: DeleteSidebarNodesRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<DeleteSidebarNodesResponseDto> {
    void options
    if (this.shouldFailManage) {
      throw new Error('manage-failed')
    }

    return {
      deleted_count: request.node_ids.length,
      failed: [],
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
        task_id: 'task-write-stub',
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

describe('useWriteDataAccess', () => {
  it('评分写入失败会触发 optimistic rollback', async () => {
    const repository = new WritableRepositoryStub()
    repository.setFailGrade(true)

    const { result } = renderHook(() => {
      const [gradeByPackage, setGradeByPackage] = useState<Record<string, number | null>>({ pkg: 4 })
      const [videoCoverById, setVideoCoverById] = useState<Record<string, string>>({ video: 'hsl(0, 40%, 40%)' })
      const [videoCoverImageById, setVideoCoverImageById] = useState<Record<string, string | null>>({ video: null })
      const write = useWriteDataAccess({
        repository,
        setGradeByPackage,
        setVideoCoverById,
        setVideoCoverImageById,
      })

      return {
        gradeByPackage,
        videoCoverById,
        videoCoverImageById,
        write,
      }
    })

    await act(async () => {
      await result.current.write.writePackageGrade('pkg', 2)
    })

    expect(result.current.gradeByPackage.pkg).toBe(4)
    expect(result.current.write.errors.grade).toBe('write-grade-failed')
  })

  it('封面写入失败会回滚封面颜色', async () => {
    const repository = new WritableRepositoryStub()
    repository.setFailCover(true)

    const { result } = renderHook(() => {
      const [gradeByPackage, setGradeByPackage] = useState<Record<string, number | null>>({ pkg: 4 })
      const [videoCoverById, setVideoCoverById] = useState<Record<string, string>>({ video: 'hsl(20, 40%, 40%)' })
      const [videoCoverImageById, setVideoCoverImageById] = useState<Record<string, string | null>>({ video: null })
      const write = useWriteDataAccess({
        repository,
        setGradeByPackage,
        setVideoCoverById,
        setVideoCoverImageById,
      })

      return {
        gradeByPackage,
        videoCoverById,
        videoCoverImageById,
        write,
      }
    })

    await act(async () => {
      await result.current.write.saveVideoCover('video', 3.2, 'hsl(300, 40%, 40%)')
    })

    expect(result.current.videoCoverById.video).toBe('hsl(20, 40%, 40%)')
    expect(result.current.write.errors.cover).toBe('save-cover-failed')
  })

  it('写入成功保持 optimistic 结果并清理错误', async () => {
    const repository = new WritableRepositoryStub()

    const { result } = renderHook(() => {
      const [gradeByPackage, setGradeByPackage] = useState<Record<string, number | null>>({ pkg: 4 })
      const [videoCoverById, setVideoCoverById] = useState<Record<string, string>>({ video: 'hsl(20, 40%, 40%)' })
      const [videoCoverImageById, setVideoCoverImageById] = useState<Record<string, string | null>>({ video: null })
      const write = useWriteDataAccess({
        repository,
        setGradeByPackage,
        setVideoCoverById,
        setVideoCoverImageById,
      })

      return {
        gradeByPackage,
        videoCoverById,
        videoCoverImageById,
        write,
      }
    })

    await act(async () => {
      await result.current.write.writePackageGrade('pkg', 5)
      await result.current.write.writePackageMetadata('pkg', {
        workTitle: '新作',
        seriesId: 'series-test-001',
        circle: '社团A',
        author: '作者B',
        tags: ['tag1', 'tag2'],
        syncWorkTitleToPackageName: true,
      })
      await result.current.write.saveVideoCover('video', 1.5, 'hsl(120, 44%, 40%)')
    })

    await waitFor(() => {
      expect(result.current.gradeByPackage.pkg).toBe(5)
      expect(result.current.videoCoverById.video).toBe('hsl(120, 44%, 40%)')
    })
    expect(result.current.write.errors.grade).toBeNull()
    expect(result.current.write.errors.metadata).toBeNull()
    expect(result.current.write.errors.cover).toBeNull()
  })

  it('元数据写入失败会回填错误状态', async () => {
    const repository = new WritableRepositoryStub()
    repository.setFailMetadata(true)

    const { result } = renderHook(() => {
      const [, setGradeByPackage] = useState<Record<string, number | null>>({ pkg: 4 })
      const [, setVideoCoverById] = useState<Record<string, string>>({ video: 'hsl(20, 40%, 40%)' })
      const [, setVideoCoverImageById] = useState<Record<string, string | null>>({ video: null })
      const write = useWriteDataAccess({
        repository,
        setGradeByPackage,
        setVideoCoverById,
        setVideoCoverImageById,
      })

      return {
        write,
      }
    })

    await act(async () => {
      await result.current.write.writePackageMetadata('pkg', {
        workTitle: '新作',
        seriesId: 'series-test-002',
        circle: '社团A',
        author: '作者B',
        tags: ['tag1'],
      })
    })

    expect(result.current.write.errors.metadata).toBe('write-metadata-failed')
  })

  it('管理写链路失败会设置 manage 错误并可清理', async () => {
    const repository = new WritableRepositoryStub()
    repository.setFailManage(true)

    const { result } = renderHook(() => {
      const [, setGradeByPackage] = useState<Record<string, number | null>>({ pkg: 4 })
      const [, setVideoCoverById] = useState<Record<string, string>>({ video: 'hsl(20, 40%, 40%)' })
      const [, setVideoCoverImageById] = useState<Record<string, string | null>>({ video: null })
      const write = useWriteDataAccess({
        repository,
        setGradeByPackage,
        setVideoCoverById,
        setVideoCoverImageById,
      })

      return {
        write,
      }
    })

    await act(async () => {
      await expect(result.current.write.setImageHidden(['img-1'], true)).rejects.toThrow('manage-failed')
    })

    expect(result.current.write.errors.manage).toBe('manage-failed')
    expect(result.current.write.pending.manage).toBe(false)

    act(() => {
      result.current.write.clearManageError()
    })
    expect(result.current.write.errors.manage).toBeNull()
  })

  it('管理写链路成功返回计数并保持 manage 错误为空', async () => {
    const repository = new WritableRepositoryStub()

    const { result } = renderHook(() => {
      const [, setGradeByPackage] = useState<Record<string, number | null>>({ pkg: 4 })
      const [, setVideoCoverById] = useState<Record<string, string>>({ video: 'hsl(20, 40%, 40%)' })
      const [, setVideoCoverImageById] = useState<Record<string, string | null>>({ video: null })
      const write = useWriteDataAccess({
        repository,
        setGradeByPackage,
        setVideoCoverById,
        setVideoCoverImageById,
      })

      return {
        write,
      }
    })

    await act(async () => {
      const hiddenResult = await result.current.write.setImageHidden(['img-1', 'img-2'], true)
      expect(hiddenResult.updated_count).toBe(2)

      const deleteImageResult = await result.current.write.deleteImageItems(['img-1'])
      expect(deleteImageResult.deleted_count).toBe(1)

      const deleteNodeResult = await result.current.write.deleteSidebarNodes(['folder:root'])
      expect(deleteNodeResult.deleted_count).toBe(1)
    })

    expect(result.current.write.errors.manage).toBeNull()
    expect(result.current.write.pending.manage).toBe(false)
  })
})
