import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useState } from 'react'

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
import type { ReadonlyMediaRepository, RepositoryRequestOptions } from './repository'
import { useWriteDataAccess } from './useWriteDataAccess'

class WritableRepositoryStub implements ReadonlyMediaRepository {
  private shouldFailGrade = false

  private shouldFailCover = false

  setFailGrade(enabled: boolean): void {
    this.shouldFailGrade = enabled
  }

  setFailCover(enabled: boolean): void {
    this.shouldFailCover = enabled
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

describe('useWriteDataAccess', () => {
  it('评分写入失败会触发 optimistic rollback', async () => {
    const repository = new WritableRepositoryStub()
    repository.setFailGrade(true)

    const { result } = renderHook(() => {
      const [gradeByPackage, setGradeByPackage] = useState<Record<string, number | null>>({ pkg: 4 })
      const [videoCoverById, setVideoCoverById] = useState<Record<string, string>>({ video: 'hsl(0, 40%, 40%)' })
      const write = useWriteDataAccess({
        repository,
        setGradeByPackage,
        setVideoCoverById,
      })

      return {
        gradeByPackage,
        videoCoverById,
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
      const write = useWriteDataAccess({
        repository,
        setGradeByPackage,
        setVideoCoverById,
      })

      return {
        gradeByPackage,
        videoCoverById,
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
      const write = useWriteDataAccess({
        repository,
        setGradeByPackage,
        setVideoCoverById,
      })

      return {
        gradeByPackage,
        videoCoverById,
        write,
      }
    })

    await act(async () => {
      await result.current.write.writePackageGrade('pkg', 5)
      await result.current.write.saveVideoCover('video', 1.5, 'hsl(120, 44%, 40%)')
    })

    await waitFor(() => {
      expect(result.current.gradeByPackage.pkg).toBe(5)
      expect(result.current.videoCoverById.video).toBe('hsl(120, 44%, 40%)')
    })
    expect(result.current.write.errors.grade).toBeNull()
    expect(result.current.write.errors.cover).toBeNull()
  })
})
