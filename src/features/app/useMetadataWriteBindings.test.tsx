import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ImagePackage, SidebarNode, VideoItem } from '../../types'
import { useMetadataWriteBindings } from './useMetadataWriteBindings'

function createImagePackage(id: string, overrides: Partial<ImagePackage> = {}): ImagePackage {
  return {
    id,
    packageName: `${id}.zip`,
    displayName: `${id}.zip`,
    absolutePath: `D:/gallery/${id}.zip`,
    treePath: ['D:', 'gallery', `${id}.zip`],
    workTitle: `${id}-work`,
    circle: `${id}-circle`,
    author: `${id}-author`,
    tags: [`${id}-tag`],
    mockGrade: 0,
    images: [],
    ...overrides,
  }
}

function createVideo(id: string): VideoItem {
  return {
    id,
    fileName: `${id}.mp4`,
    absolutePath: `D:/video/${id}.mp4`,
    treePath: ['D:', 'video', `${id}.mp4`],
    durationSec: 12,
    width: 1920,
    height: 1080,
    sizeMb: 12,
    coverColor: '#334455',
    coverImagePath: null,
    workTitle: `${id}-work`,
    circle: `${id}-circle`,
    author: `${id}-author`,
    tags: [`${id}-tag`],
    grade: null,
    mediaLocator: {
      kind: 'filesystem',
      absolutePath: `D:/video/${id}.mp4`,
      extension: '.mp4',
      mediaType: 'video',
      mimeType: 'video/mp4',
    },
  }
}

function createSidebarRootWithPackages(packageIds: string[]): SidebarNode {
  return {
    id: 'folder:root',
    label: 'root',
    kind: 'folder',
    children: packageIds.map((packageId) => ({
      id: `package:${packageId}`,
      label: packageId,
      kind: 'package',
      children: [],
      packageId,
      imageSourceId: packageId,
      pathKey: `root/${packageId}`,
    })),
    pathKey: 'root',
  }
}

describe('useMetadataWriteBindings', () => {
  it('批量字段提交会合并原值，仅覆盖回车提交字段', async () => {
    const packageA = createImagePackage('pkg-a', {
      workTitle: 'work-a',
      circle: 'circle-a',
      author: 'author-a',
      tags: ['a'],
    })
    const packageB = createImagePackage('pkg-b', {
      workTitle: 'work-b',
      circle: 'circle-b',
      author: 'author-b',
      tags: ['b'],
    })

    const writePackageMetadata = vi.fn().mockResolvedValue(undefined)
    const sidebarRoot = createSidebarRootWithPackages([packageA.id, packageB.id])

    const { result } = renderHook(() =>
      useMetadataWriteBindings({
        metadataManageMode: true,
        backendWrite: {
          pending: {
            metadata: false,
            grade: false,
          },
          writePackageGrade: vi.fn().mockResolvedValue(undefined),
          writePackageMetadata,
          writeVideoMetadata: vi.fn().mockResolvedValue(undefined),
        },
        packageById: new Map([
          [packageA.id, packageA],
          [packageB.id, packageB],
        ]),
        videoById: new Map<string, VideoItem>([['video-a', createVideo('video-a')]]),
        metadataImagePackageId: packageA.id,
        focusedVideoId: 'video-a',
        sidebarCheckedNodeIds: [sidebarRoot.id],
        sidebarNodeById: new Map([[sidebarRoot.id, sidebarRoot]]),
        setManageOperationHint: vi.fn(),
      }),
    )

    act(() => {
      result.current.applyPackageMetadata({
        circle: 'new-circle',
      })
    })

    await waitFor(() => {
      expect(writePackageMetadata).toHaveBeenCalledTimes(2)
    })

    expect(writePackageMetadata).toHaveBeenCalledWith(
      packageA.id,
      expect.objectContaining({
        workTitle: 'work-a',
        circle: 'new-circle',
        author: 'author-a',
        tags: ['a'],
      }),
    )
    expect(writePackageMetadata).toHaveBeenCalledWith(
      packageB.id,
      expect.objectContaining({
        workTitle: 'work-b',
        circle: 'new-circle',
        author: 'author-b',
        tags: ['b'],
      }),
    )
  })

  it('同步名称会以已有元数据为基础触发批量写入', async () => {
    const packageA = createImagePackage('pkg-a')
    const writePackageMetadata = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useMetadataWriteBindings({
        metadataManageMode: false,
        backendWrite: {
          pending: { metadata: false, grade: false },
          writePackageGrade: vi.fn().mockResolvedValue(undefined),
          writePackageMetadata,
          writeVideoMetadata: vi.fn().mockResolvedValue(undefined),
        },
        packageById: new Map([[packageA.id, packageA]]),
        videoById: new Map<string, VideoItem>(),
        metadataImagePackageId: packageA.id,
        focusedVideoId: null,
        sidebarCheckedNodeIds: [],
        sidebarNodeById: new Map(),
        setManageOperationHint: vi.fn(),
      }),
    )

    act(() => {
      result.current.applyPackageSyncName()
    })

    await waitFor(() => {
      expect(writePackageMetadata).toHaveBeenCalledTimes(1)
    })

    expect(writePackageMetadata).toHaveBeenCalledWith(
      packageA.id,
      expect.objectContaining({
        syncWorkTitleToPackageName: true,
      }),
    )
  })
})
