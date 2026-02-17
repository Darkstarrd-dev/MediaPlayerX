import { describe, expect, it } from 'vitest'

import type {
  LibrarySnapshotDto,
  ReadImageSidebarTreeResponseDto,
} from '../../../contracts/backend'
import { RealMediaRepository } from './realRepository'

function createSubtitleCleanupTaskDto() {
  const now = Date.now()
  return {
    task_id: 'subtitle-task-1',
    video_id: 'video-1',
    subtitle_path: 'Z:/bench/video-1.srt',
    status: 'review' as const,
    raw_stage: 'ready' as const,
    cleanup_stage: 'ready' as const,
    raw_subtitle_text: '1\n00:00:00,000 --> 00:00:01,000\nraw\n',
    cleaned_subtitle_text: '1\n00:00:00,000 --> 00:00:01,000\nclean\n',
    message: 'ok',
    error_detail: null,
    created_at_ms: now,
    updated_at_ms: now,
  }
}

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
        series_id: '',
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

function setMoveBackend(
  moveSidebarNodes: (request: {
    node_ids: string[]
    destination_directory: string
    group_name?: string
  }) => Promise<unknown>,
): void {
  window.mediaPlayerBackend = {
    moveSidebarNodes,
  } as unknown as NonNullable<Window['mediaPlayerBackend']>
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
      pickImportPaths: async () => ({
        paths: [],
      }),
      enqueueImportTask: async () => ({
        task: {
          task_id: 'task-1',
          task_type: 'import',
          source: 'dialog-files',
          paths: ['Z:/bench/sample.jpg'],
          status: 'completed',
          progress: 1,
          processed_count: 1,
          total_count: 1,
          message: 'ok',
          error_detail: null,
          created_at_ms: Date.now(),
          updated_at_ms: Date.now(),
        },
      }),
      readImportTasks: async () => ({ tasks: [] }),
      retryImportTask: async () => ({
        task: {
          task_id: 'task-1',
          task_type: 'import',
          source: 'dialog-files',
          paths: ['Z:/bench/sample.jpg'],
          status: 'completed',
          progress: 1,
          processed_count: 1,
          total_count: 1,
          message: 'ok',
          error_detail: null,
          created_at_ms: Date.now(),
          updated_at_ms: Date.now(),
        },
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
        minimum_matrix: [
          {
            capability: '基础浏览（文件系统图片/视频）',
            status: 'available',
            note: 'all good',
          },
        ],
        generated_at_ms: Date.now(),
      }),
      readClipboardImportPaths: async () => ({
        paths: [],
      }),
      clearDatabase: async () => ({
        cleared: true,
        cleared_at_ms: Date.now(),
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
      pickImportPaths: async () => ({
        paths: [],
      }),
      enqueueImportTask: async () => ({
        task: {
          task_id: 'task-1',
          task_type: 'import',
          source: 'dialog-files',
          paths: ['Z:/bench/sample.jpg'],
          status: 'completed',
          progress: 1,
          processed_count: 1,
          total_count: 1,
          message: 'ok',
          error_detail: null,
          created_at_ms: Date.now(),
          updated_at_ms: Date.now(),
        },
      }),
      readImportTasks: async () => ({ tasks: [] }),
      retryImportTask: async () => ({
        task: {
          task_id: 'task-1',
          task_type: 'import',
          source: 'dialog-files',
          paths: ['Z:/bench/sample.jpg'],
          status: 'completed',
          progress: 1,
          processed_count: 1,
          total_count: 1,
          message: 'ok',
          error_detail: null,
          created_at_ms: Date.now(),
          updated_at_ms: Date.now(),
        },
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
        minimum_matrix: [
          {
            capability: '基础浏览（文件系统图片/视频）',
            status: 'available',
            note: 'all good',
          },
        ],
        generated_at_ms: Date.now(),
      }),
      readClipboardImportPaths: async () => ({
        paths: [],
      }),
      clearDatabase: async () => ({
        cleared: true,
        cleared_at_ms: Date.now(),
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
      pickImportPaths: async () => ({
        paths: [],
      }),
      enqueueImportTask: async () => ({
        task: {
          task_id: 'task-1',
          task_type: 'import',
          source: 'dialog-files',
          paths: ['Z:/bench/sample.jpg'],
          status: 'completed',
          progress: 1,
          processed_count: 1,
          total_count: 1,
          message: 'ok',
          error_detail: null,
          created_at_ms: Date.now(),
          updated_at_ms: Date.now(),
        },
      }),
      readImportTasks: async () => ({ tasks: [] }),
      retryImportTask: async () => ({
        task: {
          task_id: 'task-1',
          task_type: 'import',
          source: 'dialog-files',
          paths: ['Z:/bench/sample.jpg'],
          status: 'completed',
          progress: 1,
          processed_count: 1,
          total_count: 1,
          message: 'ok',
          error_detail: null,
          created_at_ms: Date.now(),
          updated_at_ms: Date.now(),
        },
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
        minimum_matrix: [
          {
            capability: '基础浏览（文件系统图片/视频）',
            status: 'available',
            note: 'all good',
          },
        ],
        generated_at_ms: Date.now(),
      }),
      readClipboardImportPaths: async () => ({
        paths: [],
      }),
      clearDatabase: async () => ({
        cleared: true,
        cleared_at_ms: Date.now(),
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
      pickImportPaths: async () => ({
        paths: [],
      }),
      enqueueImportTask: async () => ({
        task: {
          task_id: 'task-1',
          task_type: 'import',
          source: 'dialog-files',
          paths: ['Z:/bench/sample.jpg'],
          status: 'completed',
          progress: 1,
          processed_count: 1,
          total_count: 1,
          message: 'ok',
          error_detail: null,
          created_at_ms: Date.now(),
          updated_at_ms: Date.now(),
        },
      }),
      readImportTasks: async () => ({ tasks: [] }),
      retryImportTask: async () => ({
        task: {
          task_id: 'task-1',
          task_type: 'import',
          source: 'dialog-files',
          paths: ['Z:/bench/sample.jpg'],
          status: 'completed',
          progress: 1,
          processed_count: 1,
          total_count: 1,
          message: 'ok',
          error_detail: null,
          created_at_ms: Date.now(),
          updated_at_ms: Date.now(),
        },
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
        minimum_matrix: [
          {
            capability: '基础浏览（文件系统图片/视频）',
            status: 'available',
            note: 'all good',
          },
        ],
        generated_at_ms: Date.now(),
      }),
      readClipboardImportPaths: async () => ({
        paths: [],
      }),
      clearDatabase: async () => ({
        cleared: true,
        cleared_at_ms: Date.now(),
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

  it('moveSidebarNodes IPC 超时会抛出 TimeoutError', async () => {
    setMoveBackend(async () => new Promise<unknown>(() => undefined))

    const repository = new RealMediaRepository()

    await expect(
      repository.moveSidebarNodes(
        {
          node_ids: ['package:pkg-timeout'],
          destination_directory: 'D:/target',
        },
        { timeoutMs: 25 },
      ),
    ).rejects.toMatchObject({
      name: 'TimeoutError',
    })
  })

  it('moveSidebarNodes 取消信号会终止请求并抛出 AbortError', async () => {
    setMoveBackend(
      async () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                moved_count: 1,
                failed: [],
                target_directory: 'D:/target',
                updated_at_ms: Date.now(),
              }),
            80,
          )
        }),
    )

    const repository = new RealMediaRepository()
    const abortController = new AbortController()
    const task = repository.moveSidebarNodes(
      {
        node_ids: ['package:pkg-abort'],
        destination_directory: 'D:/target',
      },
      {
        signal: abortController.signal,
        timeoutMs: 2_000,
      },
    )

    abortController.abort()

    await expect(task).rejects.toMatchObject({
      name: 'AbortError',
    })
  })

  it('moveSidebarNodes 返回非法 payload 时抛出 ZodError', async () => {
    setMoveBackend(async () => ({
      moved_count: 1,
      failed: [],
      updated_at_ms: Date.now(),
    }))

    const repository = new RealMediaRepository()

    await expect(
      repository.moveSidebarNodes({
        node_ids: ['package:pkg-invalid'],
        destination_directory: 'D:/target',
      }),
    ).rejects.toMatchObject({
      name: 'ZodError',
    })
  })

  it('支持字幕清理 IPC 调用并解析响应', async () => {
    const task = createSubtitleCleanupTaskDto()
    window.mediaPlayerBackend = {
      startManageSubtitleCleanup: async () => ({ task }),
      readManageSubtitleCleanupTask: async () => ({ task }),
      runManageSubtitleCleanup: async () => ({ task }),
      saveManageSubtitleCleanup: async () => ({
        task,
        saved_path: 'Z:/bench/video-1.srt',
        updated_at_ms: Date.now(),
      }),
    } as unknown as NonNullable<Window['mediaPlayerBackend']>

    const repository = new RealMediaRepository()

    const started = await repository.startManageSubtitleCleanup({
      video_id: 'video-1',
    })
    const read = await repository.readManageSubtitleCleanupTask({ task_id: task.task_id })
    const run = await repository.runManageSubtitleCleanup({
      task_id: task.task_id,
      llm_endpoint: 'http://127.0.0.1:1234/v1/chat/completions',
      llm_model: 'qwen2.5',
    })
    const saved = await repository.saveManageSubtitleCleanup({
      task_id: task.task_id,
      cleaned_subtitle_text: task.cleaned_subtitle_text,
    })

    expect(started.task.task_id).toBe(task.task_id)
    expect(read.task?.video_id).toBe('video-1')
    expect(run.task.task_id).toBe(task.task_id)
    expect(saved.saved_path).toContain('.srt')
  })

  it('字幕清理 IPC 返回非法 payload 时抛出 ZodError', async () => {
    window.mediaPlayerBackend = {
      startManageSubtitleCleanup: async () => ({
        task: {
          task_id: 'subtitle-task-invalid',
          video_id: 'video-1',
          status: 'review',
        },
      }),
    } as unknown as NonNullable<Window['mediaPlayerBackend']>

    const repository = new RealMediaRepository()

    await expect(
      repository.startManageSubtitleCleanup({
        video_id: 'video-1',
      }),
    ).rejects.toMatchObject({
      name: 'ZodError',
    })
  })
})
