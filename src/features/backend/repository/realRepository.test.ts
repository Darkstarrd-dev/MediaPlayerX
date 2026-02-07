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
})
