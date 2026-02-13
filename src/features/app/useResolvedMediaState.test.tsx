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

    const firstCall = vi.mocked(useResolvedMediaUrls).mock.calls[0]?.[0]
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

    const firstTargets = vi.mocked(useResolvedMediaUrls).mock.calls[0]?.[0]?.targets ?? []
    const firstThumbTarget = firstTargets.find((target) => target.targetId === 'image-thumb:img-0')
    expect(firstThumbTarget?.thumbnailQuality).toBe(40)
    expect(firstThumbTarget?.thumbnailMaxEdge).toBe(256)

    rerender({ thumbnailQuality: 90, thumbnailWidth: 640 })

    const secondTargets = vi.mocked(useResolvedMediaUrls).mock.calls[1]?.[0]?.targets ?? []
    const secondThumbTarget = secondTargets.find((target) => target.targetId === 'image-thumb:img-0')
    expect(secondThumbTarget?.thumbnailQuality).toBe(90)
    expect(secondThumbTarget?.thumbnailMaxEdge).toBe(640)
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

    const firstCall = vi.mocked(useResolvedMediaUrls).mock.calls[0]?.[0]
    const audioTargetIds = firstCall?.targets.filter((target) => target.targetId.startsWith('audio:')).map((target) => target.targetId)
    expect(audioTargetIds).toEqual(['audio:audio-focus'])
  })
})
