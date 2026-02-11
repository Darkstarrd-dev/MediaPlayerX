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

function createDeferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((resolver) => {
    resolve = resolver
  })
  return {
    promise,
    resolve,
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
        autoTagModelPath: 'Z:/mock/model.onnx',
        autoTagOccurrenceThreshold: 3,
        autoTagGeneralMinScore: 0.35,
        autoTagCharacterMinScore: 0.75,
        autoTagIncludeRating: true,
        autoTagRatingMinScore: 0.5,
        visionAutoTagCsvPath: 'Z:/mock/tags.csv',
        visionAutoTagSampleImageCount: 6,
        visionAutoTagOccurrenceThreshold: 2,
        visionAutoTagTemperature: 0,
        visionAutoTagTimeoutMs: 30000,
        visionAutoTagEndpoint: 'http://127.0.0.1:1234/v1/chat/completions',
        visionAutoTagModel: 'qwen2.5-vl-instruct',
        embeddingEndpoint: 'http://127.0.0.1:1234/v1/embeddings',
        embeddingModel: 'qwen3-vl-embedding',
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

  it('自动标签任务支持运行中暂停/继续，并可停止后回到空闲态', async () => {
    const packageA = createImagePackage('pkg-a')
    const packageB = createImagePackage('pkg-b')
    const sidebarRoot = createSidebarRootWithPackages([packageA.id, packageB.id])
    const deferred = createDeferred<void>()

    const generatePackageAutoTags = vi.fn().mockImplementation(async () => {
      await deferred.promise
      return {
        generated_tags: [],
        analyzed_images: 0,
      }
    })

    const { result } = renderHook(() =>
      useMetadataWriteBindings({
        metadataManageMode: true,
        autoTagModelPath: 'Z:/mock/model.onnx',
        autoTagOccurrenceThreshold: 3,
        autoTagGeneralMinScore: 0.35,
        autoTagCharacterMinScore: 0.75,
        autoTagIncludeRating: true,
        autoTagRatingMinScore: 0.5,
        visionAutoTagCsvPath: 'Z:/mock/tags.csv',
        visionAutoTagSampleImageCount: 6,
        visionAutoTagOccurrenceThreshold: 2,
        visionAutoTagTemperature: 0,
        visionAutoTagTimeoutMs: 30000,
        visionAutoTagEndpoint: 'http://127.0.0.1:1234/v1/chat/completions',
        visionAutoTagModel: 'qwen2.5-vl-instruct',
        embeddingEndpoint: 'http://127.0.0.1:1234/v1/embeddings',
        embeddingModel: 'qwen3-vl-embedding',
        backendWrite: {
          pending: {
            metadata: false,
            grade: false,
          },
          writePackageGrade: vi.fn().mockResolvedValue(undefined),
          writePackageMetadata: vi.fn().mockResolvedValue(undefined),
          generatePackageAutoTags,
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
      result.current.applyPackageAutoTags()
    })
    expect(result.current.metadataTaskKind).toBe('auto-tags')
    expect(result.current.metadataTaskStatus).toBe('running')
    expect(generatePackageAutoTags).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.applyPackageAutoTags()
    })
    expect(result.current.metadataTaskStatus).toBe('paused')

    act(() => {
      result.current.applyPackageAutoTags()
    })
    expect(result.current.metadataTaskStatus).toBe('running')

    act(() => {
      result.current.stopMetadataTask()
    })
    expect(result.current.metadataTaskKind).toBeNull()
    expect(result.current.metadataTaskStatus).toBe('idle')

    await act(async () => {
      deferred.resolve()
      await Promise.resolve()
    })

    expect(generatePackageAutoTags).toHaveBeenCalledTimes(1)
  })
})
