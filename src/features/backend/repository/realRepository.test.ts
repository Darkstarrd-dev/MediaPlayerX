import { describe, expect, it } from 'vitest'

import type {
  LibrarySnapshotDto,
  ReadImageSidebarTreeResponseDto,
} from '../../../contracts/backend'
import { RealMediaRepository } from './realRepository'

function createLibrarySnapshotDto(): LibrarySnapshotDto {
  return {
    image_packages: [
      {
        id: 'pkg-1',
        package_name: 'archive_001.zip',
        display_name: 'archive_001',
        absolute_path: 'Z:/bench/archive_001.zip',
        tree_path: ['archive_001.zip'],
        work_title: 'archive_001',
        circle: '未知',
        author: '未知',
        tags: [],
        mock_grade: null,
        images: [
          {
            id: 'img-1',
            ordinal: 1,
            width: 1920,
            height: 1080,
            size_kb: 100,
            cluster: 0,
            color: '#dd6b66',
            feature_vector: [0, 0, 0, 0, 0, 0, 0, 0],
            media_locator: {
              kind: 'filesystem',
              absolute_path: 'Z:/bench/archive_001.zip',
              extension: '.jpg',
              media_type: 'image',
              mime_type: 'image/jpeg',
            },
          },
        ],
      },
    ],
    image_directories: [],
    videos: [],
  }
}

function createSidebarResponseDto(): ReadImageSidebarTreeResponseDto {
  return {
    image_packages: createLibrarySnapshotDto().image_packages,
    image_directories: [],
    tree: [
      {
        id: 'package:archive_001.zip',
        label: 'archive_001.zip',
        kind: 'package',
        children: [],
        package_id: 'pkg-1',
        image_source_id: 'pkg-1',
        direct_image_count: 1,
        path_key: 'archive_001.zip',
      },
    ],
  }
}

describe('RealMediaRepository', () => {
  it('IPC 超时会抛出 TimeoutError', async () => {
    window.mediaPlayerBackend = {
      readLibrarySnapshot: async () => new Promise<LibrarySnapshotDto>(() => undefined),
      readImageSidebarTree: async () => createSidebarResponseDto(),
      readImagePage: async () => ({
        source_id: 'pkg-1',
        total_items: 1,
        page_index: 0,
        page_size: 1,
        refs: [{ package_id: 'pkg-1', image_index: 0 }],
      }),
      readImageMetadata: async () => ({
        package: createLibrarySnapshotDto().image_packages[0],
        image: createLibrarySnapshotDto().image_packages[0].images[0],
        grade: null,
      }),
      resolveMediaResource: async () => ({
        resource_url: 'about:blank#media',
        mime_type: 'image/jpeg',
        expires_at_ms: Date.now() + 1_000,
      }),
      writePackageGrade: async () => ({
        package_id: 'pkg-1',
        grade: 4,
        updated_at_ms: Date.now(),
      }),
      saveVideoCover: async () => ({
        video_id: 'video-1',
        cover_color: 'hsl(120, 44%, 40%)',
        cover_image_path: null,
        updated_at_ms: Date.now(),
      }),
      readPlaylist: async () => ({
        video_ids: ['video-1'],
      }),
      writePlaylist: async (request) => ({
        video_ids: request.video_ids,
        updated_at_ms: Date.now(),
      }),
      readMediaAccessAudit: async () => ({
        resolve_requests: 1,
        resolve_granted: 1,
        resolve_denied_total: 0,
        resolve_denied_by_reason: {},
        token_reads: 1,
        token_hits: 1,
        token_misses: 0,
        token_expired: 0,
        token_cleanup_removed: 0,
        token_active: 1,
        generated_at_ms: Date.now(),
      }),
    }

    const repository = new RealMediaRepository()

    await expect(repository.readLibrarySnapshot({ timeoutMs: 25 })).rejects.toMatchObject({
      name: 'TimeoutError',
    })
  })

  it('取消信号会终止请求并抛出 AbortError', async () => {
    window.mediaPlayerBackend = {
      readLibrarySnapshot: async () =>
        new Promise<LibrarySnapshotDto>((resolve) => {
          setTimeout(() => resolve(createLibrarySnapshotDto()), 60)
        }),
      readImageSidebarTree: async () => createSidebarResponseDto(),
      readImagePage: async () => ({
        source_id: 'pkg-1',
        total_items: 1,
        page_index: 0,
        page_size: 1,
        refs: [{ package_id: 'pkg-1', image_index: 0 }],
      }),
      readImageMetadata: async () => ({
        package: createLibrarySnapshotDto().image_packages[0],
        image: createLibrarySnapshotDto().image_packages[0].images[0],
        grade: null,
      }),
      resolveMediaResource: async () => ({
        resource_url: 'about:blank#media',
        mime_type: 'image/jpeg',
        expires_at_ms: Date.now() + 1_000,
      }),
      writePackageGrade: async () => ({
        package_id: 'pkg-1',
        grade: 4,
        updated_at_ms: Date.now(),
      }),
      saveVideoCover: async () => ({
        video_id: 'video-1',
        cover_color: 'hsl(120, 44%, 40%)',
        cover_image_path: null,
        updated_at_ms: Date.now(),
      }),
      readPlaylist: async () => ({
        video_ids: ['video-1'],
      }),
      writePlaylist: async (request) => ({
        video_ids: request.video_ids,
        updated_at_ms: Date.now(),
      }),
      readMediaAccessAudit: async () => ({
        resolve_requests: 1,
        resolve_granted: 1,
        resolve_denied_total: 0,
        resolve_denied_by_reason: {},
        token_reads: 1,
        token_hits: 1,
        token_misses: 0,
        token_expired: 0,
        token_cleanup_removed: 0,
        token_active: 1,
        generated_at_ms: Date.now(),
      }),
    }

    const repository = new RealMediaRepository()
    const abortController = new AbortController()
    const task = repository.readLibrarySnapshot({
      signal: abortController.signal,
      timeoutMs: 2_000,
    })

    abortController.abort()

    await expect(task).rejects.toMatchObject({
      name: 'AbortError',
    })
  })

  it('可通过 IPC 获取可渲染媒体 URL', async () => {
    window.mediaPlayerBackend = {
      readLibrarySnapshot: async () => createLibrarySnapshotDto(),
      readImageSidebarTree: async () => createSidebarResponseDto(),
      readImagePage: async () => ({
        source_id: 'pkg-1',
        total_items: 1,
        page_index: 0,
        page_size: 1,
        refs: [{ package_id: 'pkg-1', image_index: 0 }],
      }),
      readImageMetadata: async () => ({
        package: createLibrarySnapshotDto().image_packages[0],
        image: createLibrarySnapshotDto().image_packages[0].images[0],
        grade: null,
      }),
      resolveMediaResource: async () => ({
        resource_url: 'mediaplayerx-media://resource/token-001',
        mime_type: 'image/jpeg',
        expires_at_ms: Date.now() + 2_000,
      }),
      writePackageGrade: async () => ({
        package_id: 'pkg-1',
        grade: 5,
        updated_at_ms: Date.now(),
      }),
      saveVideoCover: async () => ({
        video_id: 'video-1',
        cover_color: 'hsl(120, 44%, 40%)',
        cover_image_path: null,
        updated_at_ms: Date.now(),
      }),
      readPlaylist: async () => ({
        video_ids: ['video-1'],
      }),
      writePlaylist: async (request) => ({
        video_ids: request.video_ids,
        updated_at_ms: Date.now(),
      }),
      readMediaAccessAudit: async () => ({
        resolve_requests: 1,
        resolve_granted: 1,
        resolve_denied_total: 0,
        resolve_denied_by_reason: {},
        token_reads: 1,
        token_hits: 1,
        token_misses: 0,
        token_expired: 0,
        token_cleanup_removed: 0,
        token_active: 1,
        generated_at_ms: Date.now(),
      }),
    }

    const repository = new RealMediaRepository()
    const response = await repository.resolveMediaResource({
      locator: {
        kind: 'filesystem',
        absolute_path: 'Z:/bench/archive_001.zip',
        extension: '.jpg',
        media_type: 'image',
        mime_type: 'image/jpeg',
      },
    })

    expect(response.resource_url).toContain('mediaplayerx-media://')
    expect(response.mime_type).toBe('image/jpeg')
  })

  it('支持写入评分与封面，并可读取审计统计', async () => {
    window.mediaPlayerBackend = {
      readLibrarySnapshot: async () => createLibrarySnapshotDto(),
      readImageSidebarTree: async () => createSidebarResponseDto(),
      readImagePage: async () => ({
        source_id: 'pkg-1',
        total_items: 1,
        page_index: 0,
        page_size: 1,
        refs: [{ package_id: 'pkg-1', image_index: 0 }],
      }),
      readImageMetadata: async () => ({
        package: createLibrarySnapshotDto().image_packages[0],
        image: createLibrarySnapshotDto().image_packages[0].images[0],
        grade: null,
      }),
      resolveMediaResource: async () => ({
        resource_url: 'mediaplayerx-media://resource/token-001',
        mime_type: 'image/jpeg',
        expires_at_ms: Date.now() + 2_000,
      }),
      writePackageGrade: async () => ({
        package_id: 'pkg-1',
        grade: 3,
        updated_at_ms: Date.now(),
      }),
      saveVideoCover: async () => ({
        video_id: 'video-001',
        cover_color: 'hsl(120, 44%, 40%)',
        cover_image_path: 'Z:/bench/.mediaplayerx/covers/video-001.jpg',
        updated_at_ms: Date.now(),
      }),
      readPlaylist: async () => ({
        video_ids: ['video-001'],
      }),
      writePlaylist: async (request) => ({
        video_ids: request.video_ids,
        updated_at_ms: Date.now(),
      }),
      readMediaAccessAudit: async () => ({
        resolve_requests: 2,
        resolve_granted: 1,
        resolve_denied_total: 1,
        resolve_denied_by_reason: {
          path_outside_root: 1,
        },
        token_reads: 1,
        token_hits: 1,
        token_misses: 0,
        token_expired: 0,
        token_cleanup_removed: 0,
        token_active: 1,
        generated_at_ms: Date.now(),
      }),
    }

    const repository = new RealMediaRepository()
    const grade = await repository.writePackageGrade({
      package_id: 'pkg-1',
      grade: 3,
    })
    const cover = await repository.saveVideoCover({
      video_id: 'video-001',
      time_sec: 1.2,
      fallback_color: 'hsl(120, 44%, 40%)',
    })
    const audit = await repository.readMediaAccessAudit()

    expect(grade.grade).toBe(3)
    expect(cover.cover_color).toContain('hsl')
    expect(audit.resolve_denied_by_reason.path_outside_root).toBe(1)
  })
})
