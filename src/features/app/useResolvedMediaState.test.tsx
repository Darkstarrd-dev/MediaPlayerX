import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useResolvedMediaUrls } from '../backend'
import type { MediaRepository } from '../backend/repository'
import type { UiBenchSettings } from '../perf/benchSettings'
import type { AudioItem, FocusedImageRef, ImagePackage } from '../../types'
import { useResolvedMediaState } from './useResolvedMediaState'

vi.mock('../backend', () => ({
  useResolvedMediaUrls: vi.fn(() => ({
    urlByTargetId: {},
    errorByTargetId: {},
  })),
}))

function createBenchSettings(): UiBenchSettings {
  return {
    enabled: false,
    mode: null,
    candidateId: null,
    runTag: null,
    resolvedMedia: {},
    imageLoadingSkeleton: { mode: 'off' },
    reactProfiler: false,
    e2e: {},
  }
}

function createPackageWithImages(imageCount: number): ImagePackage {
  return {
    id: 'pkg-base',
    packageName: 'pkg-base.zip',
    displayName: 'pkg-base',
    absolutePath: 'Z:/bench/pkg-base.zip',
    treePath: ['pkg-base.zip'],
    workTitle: 'pkg-base',
    circle: 'unknown',
    author: 'unknown',
    tags: [],
    images: Array.from({ length: imageCount }).map((_, index) => ({
      id: `img-${index}`,
      ordinal: index + 1,
      width: 1024,
      height: 768,
      sizeKb: 120,
      cluster: 0,
      color: '#999999',
      mediaLocator: {
        kind: 'filesystem',
        absolutePath: `Z:/bench/img-${index}.jpg`,
        extension: '.jpg',
        mediaType: 'image',
        mimeType: 'image/jpeg',
      },
    })),
  }
}

function createAudio(id: string): AudioItem {
  return {
    id,
    fileName: `${id}.mp3`,
    absolutePath: `Z:/bench/${id}.mp3`,
    treePath: ['Z盘', 'bench', `${id}.mp3`],
    durationSec: 60,
    sizeMb: 4,
    album: 'bench',
    author: 'bench',
    trackTitle: id,
    mediaLocator: {
      kind: 'filesystem',
      absolutePath: `Z:/bench/${id}.mp3`,
      extension: '.mp3',
      mediaType: 'audio',
      mimeType: 'audio/mpeg',
    },
  }
}

describe('useResolvedMediaState', () => {
  beforeEach(() => {
    vi.mocked(useResolvedMediaUrls).mockClear()
    vi.mocked(useResolvedMediaUrls).mockReturnValue({
      urlByTargetId: {},
      errorByTargetId: {},
    })
  })

  it('缩略图目标仅解析当前页，避免切换阶段请求风暴', () => {
    const packageData = createPackageWithImages(6)
    const packageById = new Map<string, ImagePackage>([[packageData.id, packageData]])
    const visibleImageRefs: FocusedImageRef[] = Array.from({ length: 6 }).map((_, index) => ({
      packageId: packageData.id,
      imageIndex: index,
    }))

    renderHook(() =>
      useResolvedMediaState({
        repository: {} as MediaRepository,
        benchSettings: createBenchSettings(),
        maxConcurrent: 8,
        actualCellWidth: 240,
        actualMediaHeight: 180,
        thumbnailQuality: 82,
        thumbnailWidth: 512,
        thumbnailGenerationConcurrency: 4,
        packageById,
        focusedImage: null,
        metadataImage: null,
        focusedRef: null,
        orderedRootScopedImageRefs: visibleImageRefs,
        fullscreenActive: false,
        showNamesOnly: false,
        refsInPage: visibleImageRefs.slice(2, 4),
        focusedVideo: null,
        focusedAudio: null,
        focusedVideoCoverImageLocator: null,
      }),
    )

    const firstCall =
      vi
        .mocked(useResolvedMediaUrls)
        .mock.calls
        .map((call) => call[0])
        .find((call) => call.targets.some((target) => target.targetId.startsWith('image-thumb:'))) ?? null
    const thumbnailTargetIds =
      firstCall?.targets.filter((target) => target.targetId.startsWith('image-thumb:')).map((target) => target.targetId) ?? []
    const originalTargetIds =
      firstCall?.targets.filter((target) => target.targetId.startsWith('image-original:')).map((target) => target.targetId) ?? []

    expect(thumbnailTargetIds).toEqual([
      'image-thumb:img-2',
      'image-thumb:img-3',
    ])
    expect(originalTargetIds).toContain('image-original:img-2')
  })

  it('缩略图质量和宽度变化会更新缩略图解析参数', () => {
    const packageData = createPackageWithImages(2)
    const packageById = new Map<string, ImagePackage>([[packageData.id, packageData]])
    const visibleImageRefs: FocusedImageRef[] = [
      { packageId: packageData.id, imageIndex: 0 },
      { packageId: packageData.id, imageIndex: 1 },
    ]

    const { rerender } = renderHook(
      ({ thumbnailQuality, thumbnailWidth }) =>
        useResolvedMediaState({
          repository: {} as MediaRepository,
          benchSettings: createBenchSettings(),
          maxConcurrent: 8,
          actualCellWidth: 180,
          actualMediaHeight: 120,
          thumbnailQuality,
          thumbnailWidth,
          thumbnailGenerationConcurrency: 4,
          packageById,
          focusedImage: null,
          metadataImage: null,
          focusedRef: null,
          orderedRootScopedImageRefs: visibleImageRefs,
          fullscreenActive: false,
          showNamesOnly: false,
          refsInPage: visibleImageRefs,
          focusedVideo: null,
          focusedAudio: null,
          focusedVideoCoverImageLocator: null,
        }),
      {
        initialProps: {
          thumbnailQuality: 40,
          thumbnailWidth: 256,
        },
      },
    )

    const firstThumbnailTargetCalls = vi
      .mocked(useResolvedMediaUrls)
      .mock.calls
      .map((call) => call[0])
      .filter((call) => call.targets.some((target) => target.targetId.startsWith('image-thumb:')))

    const firstTargets = firstThumbnailTargetCalls[0]?.targets ?? []
    const firstThumbTarget = firstTargets.find((target) => target.targetId === 'image-thumb:img-0')
    expect(firstThumbTarget?.thumbnailQuality).toBe(40)
    expect(firstThumbTarget?.thumbnailMaxEdge).toBe(256)

    rerender({ thumbnailQuality: 90, thumbnailWidth: 640 })

    const secondThumbnailTargetCalls = vi
      .mocked(useResolvedMediaUrls)
      .mock.calls
      .map((call) => call[0])
      .filter((call) => call.targets.some((target) => target.targetId.startsWith('image-thumb:')))

    const secondTargets = secondThumbnailTargetCalls[1]?.targets ?? []
    const secondThumbTarget = secondTargets.find((target) => target.targetId === 'image-thumb:img-0')
    expect(secondThumbTarget?.thumbnailQuality).toBe(90)
    expect(secondThumbTarget?.thumbnailMaxEdge).toBe(640)
  })

  it('启用相邻页预热时会在当前页后追加相邻页缩略图目标', () => {
    const packageData = createPackageWithImages(12)
    const packageById = new Map<string, ImagePackage>([[packageData.id, packageData]])
    const allRefs: FocusedImageRef[] = Array.from({ length: 12 }).map((_, index) => ({
      packageId: packageData.id,
      imageIndex: index,
    }))

    renderHook(() =>
      useResolvedMediaState({
        repository: {} as MediaRepository,
        benchSettings: createBenchSettings(),
        maxConcurrent: 8,
        actualCellWidth: 240,
        actualMediaHeight: 180,
        thumbnailQuality: 82,
        thumbnailWidth: 512,
        thumbnailGenerationConcurrency: 4,
        packageById,
        focusedImage: null,
        metadataImage: null,
        focusedRef: null,
        orderedRootScopedImageRefs: allRefs,
        fullscreenActive: false,
        showNamesOnly: false,
        refsInPage: allRefs.slice(4, 8),
        visibleImageRefs: allRefs,
        normalizedPageIndex: 1,
        imageTotalPages: 3,
        pagedPageSize: 4,
        thumbnailWarmupRadius: 1,
        thumbnailWarmupConcurrency: 1,
        focusedVideo: null,
        focusedAudio: null,
        focusedVideoCoverImageLocator: null,
      }),
    )

    const call =
      vi
        .mocked(useResolvedMediaUrls)
        .mock.calls
        .map((args) => args[0])
        .find((args) => args.targets.some((target) => target.targetId.startsWith('image-thumb:'))) ?? null

    const thumbnailTargetIds =
      call?.targets
        .filter((target) => target.targetId.startsWith('image-thumb:'))
        .map((target) => target.targetId) ?? []

    expect(thumbnailTargetIds).toEqual([
      'image-thumb:img-4',
      'image-thumb:img-5',
      'image-thumb:img-6',
      'image-thumb:img-7',
      'image-thumb:img-0',
      'image-thumb:img-1',
      'image-thumb:img-2',
      'image-thumb:img-3',
    ])
  })

  it('全屏预取深度使用设置值替代硬编码半径', () => {
    const packageData = createPackageWithImages(20)
    const packageById = new Map<string, ImagePackage>([[packageData.id, packageData]])
    const allRefs: FocusedImageRef[] = Array.from({ length: 20 }).map((_, index) => ({
      packageId: packageData.id,
      imageIndex: index,
    }))

    renderHook(() =>
      useResolvedMediaState({
        repository: {} as MediaRepository,
        benchSettings: createBenchSettings(),
        maxConcurrent: 8,
        actualCellWidth: 240,
        actualMediaHeight: 180,
        thumbnailQuality: 82,
        thumbnailWidth: 512,
        thumbnailGenerationConcurrency: 4,
        packageById,
        focusedImage: packageData.images[10],
        metadataImage: null,
        focusedRef: { packageId: packageData.id, imageIndex: 10 },
        orderedRootScopedImageRefs: allRefs,
        fullscreenActive: true,
        fullscreenPrefetchRadius: 6,
        showNamesOnly: true,
        refsInPage: [],
        focusedVideo: null,
        focusedAudio: null,
        focusedVideoCoverImageLocator: null,
      }),
    )

    const call = vi.mocked(useResolvedMediaUrls).mock.calls[0]?.[0]
    const originalTargetIds =
      call?.targets
        .filter((target) => target.targetId.startsWith('image-original:'))
        .map((target) => target.targetId) ?? []

    expect(originalTargetIds).toContain('image-original:img-16')
    expect(originalTargetIds).toContain('image-original:img-4')
  })

  it('启用全屏重采样时会追加 fullscreen 目标并携带 kernel', () => {
    const packageData = createPackageWithImages(12)
    for (const image of packageData.images) {
      image.width = 4000
      image.height = 3000
    }
    const packageById = new Map<string, ImagePackage>([[packageData.id, packageData]])
    const allRefs: FocusedImageRef[] = Array.from({ length: 12 }).map((_, index) => ({
      packageId: packageData.id,
      imageIndex: index,
    }))

    renderHook(() =>
      useResolvedMediaState({
        repository: {} as MediaRepository,
        benchSettings: createBenchSettings(),
        maxConcurrent: 8,
        actualCellWidth: 240,
        actualMediaHeight: 180,
        thumbnailQuality: 82,
        thumbnailWidth: 512,
        thumbnailGenerationConcurrency: 4,
        packageById,
        focusedImage: packageData.images[6],
        metadataImage: null,
        focusedRef: { packageId: packageData.id, imageIndex: 6 },
        orderedRootScopedImageRefs: allRefs,
        fullscreenActive: true,
        fullscreenPrefetchRadius: 2,
        fullscreenResamplingEnabled: true,
        fullscreenDownsamplingKernel: 'mitchell',
        fullscreenUpsamplingKernel: 'nearest',
        showNamesOnly: true,
        refsInPage: [],
        focusedVideo: null,
        focusedAudio: null,
        focusedVideoCoverImageLocator: null,
      }),
    )

    const call = vi.mocked(useResolvedMediaUrls).mock.calls[0]?.[0]
    const fullscreenTargets = call?.targets.filter((target) => target.targetId.startsWith('image-fullscreen:')) ?? []

    expect(fullscreenTargets.map((target) => target.targetId)).toContain('image-fullscreen:img-6')
    expect(fullscreenTargets.map((target) => target.targetId)).toContain('image-fullscreen:img-8')
    expect(fullscreenTargets.map((target) => target.targetId)).toContain('image-fullscreen:img-4')
    expect(fullscreenTargets.every((target) => target.fullscreenKernel === 'mitchell')).toBe(true)
  })

  it('fullscreenImageSrc 优先使用 fullscreen URL', () => {
    const packageData = createPackageWithImages(2)
    const packageById = new Map<string, ImagePackage>([[packageData.id, packageData]])
    vi.mocked(useResolvedMediaUrls).mockReturnValue({
      urlByTargetId: {
        'image-fullscreen:img-0': 'media://fullscreen',
        'image-original:img-0': 'media://original',
        'image-thumb:img-0': 'media://thumb',
      },
      errorByTargetId: {},
    })

    const { result } = renderHook(() =>
      useResolvedMediaState({
        repository: {} as MediaRepository,
        benchSettings: createBenchSettings(),
        maxConcurrent: 8,
        actualCellWidth: 240,
        actualMediaHeight: 180,
        thumbnailQuality: 82,
        thumbnailWidth: 512,
        thumbnailGenerationConcurrency: 4,
        packageById,
        focusedImage: packageData.images[0],
        metadataImage: null,
        focusedRef: { packageId: packageData.id, imageIndex: 0 },
        orderedRootScopedImageRefs: [{ packageId: packageData.id, imageIndex: 0 }],
        fullscreenActive: true,
        fullscreenResamplingEnabled: true,
        showNamesOnly: true,
        refsInPage: [],
        focusedVideo: null,
        focusedAudio: null,
        focusedVideoCoverImageLocator: null,
      }),
    )

    expect(result.current.fullscreenImageSrc).toBe('media://fullscreen')
  })

  it('聚焦音频时会下发 audio 资源解析目标', () => {
    const packageData = createPackageWithImages(1)
    const packageById = new Map<string, ImagePackage>([[packageData.id, packageData]])
    const focusedAudio = createAudio('audio-focus')

    renderHook(() =>
      useResolvedMediaState({
        repository: {} as MediaRepository,
        benchSettings: createBenchSettings(),
        maxConcurrent: 8,
        actualCellWidth: 180,
        actualMediaHeight: 120,
        thumbnailQuality: 40,
        thumbnailWidth: 256,
        thumbnailGenerationConcurrency: 4,
        packageById,
        focusedImage: null,
        metadataImage: null,
        focusedRef: null,
        orderedRootScopedImageRefs: [],
        fullscreenActive: false,
        showNamesOnly: true,
        refsInPage: [],
        focusedVideo: null,
        focusedAudio,
        focusedVideoCoverImageLocator: null,
      }),
    )

    const firstCall =
      vi
        .mocked(useResolvedMediaUrls)
        .mock.calls
        .map((call) => call[0])
        .find((call) => call.targets.some((target) => target.targetId.startsWith('audio:'))) ?? null
    const audioTargetIds = firstCall?.targets.filter((target) => target.targetId.startsWith('audio:')).map((target) => target.targetId)
    expect(audioTargetIds).toEqual(['audio:audio-focus'])
  })

  it('node browse cover 预热使用独立低并发缩略图队列', () => {
    const packageData = createPackageWithImages(1)
    const packageById = new Map<string, ImagePackage>([[packageData.id, packageData]])

    renderHook(() =>
      useResolvedMediaState({
        repository: {} as MediaRepository,
        benchSettings: createBenchSettings(),
        maxConcurrent: 8,
        actualCellWidth: 180,
        actualMediaHeight: 120,
        thumbnailQuality: 82,
        thumbnailWidth: 320,
        thumbnailGenerationConcurrency: 4,
        packageById,
        focusedImage: null,
        metadataImage: null,
        focusedRef: null,
        orderedRootScopedImageRefs: [],
        fullscreenActive: false,
        showNamesOnly: true,
        refsInPage: [],
        focusedVideo: null,
        focusedAudio: null,
        focusedVideoCoverImageLocator: null,
        nodeBrowseCoverThumbnailLocators: [
          {
            sourceId: packageData.id,
            imageId: packageData.images[0].id,
            locator: packageData.images[0].mediaLocator,
          },
        ],
      }),
    )

    const warmupCall =
      vi
        .mocked(useResolvedMediaUrls)
        .mock.calls
        .map((call) => call[0])
        .find((call) => call.targets.some((target) => target.targetId.startsWith('node-cover-thumb:'))) ?? null

    expect(warmupCall).not.toBeNull()
    expect(warmupCall?.options?.maxConcurrent).toBe(1)
    expect(warmupCall?.options?.stateScope).toBe('active-only')
  })

  it('importBusy=true 时缩略图目标数限制为首屏可视区范围', () => {
    const packageData = createPackageWithImages(30)
    const packageById = new Map<string, ImagePackage>([[packageData.id, packageData]])
    const allRefs: FocusedImageRef[] = Array.from({ length: 30 }).map((_, index) => ({
      packageId: packageData.id,
      imageIndex: index,
    }))

    renderHook(() =>
      useResolvedMediaState({
        repository: {} as MediaRepository,
        benchSettings: createBenchSettings(),
        maxConcurrent: 8,
        importBusy: true,
        actualCellWidth: 240,
        actualMediaHeight: 180,
        thumbnailQuality: 82,
        thumbnailWidth: 512,
        thumbnailGenerationConcurrency: 4,
        packageById,
        focusedImage: null,
        metadataImage: null,
        focusedRef: null,
        orderedRootScopedImageRefs: [],
        fullscreenActive: false,
        showNamesOnly: false,
        refsInPage: allRefs,
        focusedVideo: null,
        focusedAudio: null,
        focusedVideoCoverImageLocator: null,
      }),
    )

    const call =
      vi
        .mocked(useResolvedMediaUrls)
        .mock.calls
        .map((args) => args[0])
        .find((args) => args.targets.some((t) => t.targetId.startsWith('image-thumb:'))) ?? null

    const thumbTargets = call?.targets.filter((t) => t.targetId.startsWith('image-thumb:')) ?? []
    expect(thumbTargets.length).toBeLessThan(30)
    expect(thumbTargets.length).toBe(16)
  })

  it('importBusy=false 时不限制缩略图目标数', () => {
    const packageData = createPackageWithImages(30)
    const packageById = new Map<string, ImagePackage>([[packageData.id, packageData]])
    const allRefs: FocusedImageRef[] = Array.from({ length: 30 }).map((_, index) => ({
      packageId: packageData.id,
      imageIndex: index,
    }))

    renderHook(() =>
      useResolvedMediaState({
        repository: {} as MediaRepository,
        benchSettings: createBenchSettings(),
        maxConcurrent: 8,
        importBusy: false,
        actualCellWidth: 240,
        actualMediaHeight: 180,
        thumbnailQuality: 82,
        thumbnailWidth: 512,
        thumbnailGenerationConcurrency: 4,
        packageById,
        focusedImage: null,
        metadataImage: null,
        focusedRef: null,
        orderedRootScopedImageRefs: [],
        fullscreenActive: false,
        showNamesOnly: false,
        refsInPage: allRefs,
        focusedVideo: null,
        focusedAudio: null,
        focusedVideoCoverImageLocator: null,
      }),
    )

    const call =
      vi
        .mocked(useResolvedMediaUrls)
        .mock.calls
        .map((args) => args[0])
        .find((args) => args.targets.some((t) => t.targetId.startsWith('image-thumb:'))) ?? null

    const thumbTargets = call?.targets.filter((t) => t.targetId.startsWith('image-thumb:')) ?? []
    expect(thumbTargets.length).toBe(30)
  })

  it('importBusy=true 时 maxConcurrent 被限制为 2', () => {
    const packageData = createPackageWithImages(4)
    const packageById = new Map<string, ImagePackage>([[packageData.id, packageData]])
    const allRefs: FocusedImageRef[] = Array.from({ length: 4 }).map((_, index) => ({
      packageId: packageData.id,
      imageIndex: index,
    }))

    renderHook(() =>
      useResolvedMediaState({
        repository: {} as MediaRepository,
        benchSettings: createBenchSettings(),
        maxConcurrent: 8,
        importBusy: true,
        actualCellWidth: 240,
        actualMediaHeight: 180,
        thumbnailQuality: 82,
        thumbnailWidth: 512,
        thumbnailGenerationConcurrency: 4,
        packageById,
        focusedImage: null,
        metadataImage: null,
        focusedRef: null,
        orderedRootScopedImageRefs: [],
        fullscreenActive: false,
        showNamesOnly: false,
        refsInPage: allRefs,
        focusedVideo: null,
        focusedAudio: null,
        focusedVideoCoverImageLocator: null,
      }),
    )

    const mainCall =
      vi
        .mocked(useResolvedMediaUrls)
        .mock.calls
        .map((args) => args[0])
        .find((args) => args.targets.some((t) => t.targetId.startsWith('image-thumb:'))) ?? null

    expect(mainCall?.options?.maxConcurrent).toBe(2)
  })

  it('importBusy=false 时 maxConcurrent 使用配置值', () => {
    const packageData = createPackageWithImages(4)
    const packageById = new Map<string, ImagePackage>([[packageData.id, packageData]])
    const allRefs: FocusedImageRef[] = Array.from({ length: 4 }).map((_, index) => ({
      packageId: packageData.id,
      imageIndex: index,
    }))

    renderHook(() =>
      useResolvedMediaState({
        repository: {} as MediaRepository,
        benchSettings: createBenchSettings(),
        maxConcurrent: 8,
        importBusy: false,
        actualCellWidth: 240,
        actualMediaHeight: 180,
        thumbnailQuality: 82,
        thumbnailWidth: 512,
        thumbnailGenerationConcurrency: 4,
        packageById,
        focusedImage: null,
        metadataImage: null,
        focusedRef: null,
        orderedRootScopedImageRefs: [],
        fullscreenActive: false,
        showNamesOnly: false,
        refsInPage: allRefs,
        focusedVideo: null,
        focusedAudio: null,
        focusedVideoCoverImageLocator: null,
      }),
    )

    const mainCall =
      vi
        .mocked(useResolvedMediaUrls)
        .mock.calls
        .map((args) => args[0])
        .find((args) => args.targets.some((t) => t.targetId.startsWith('image-thumb:'))) ?? null

    expect(mainCall?.options?.maxConcurrent).toBe(8)
  })
})
