import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { MediaRepository } from '../backend/repository'
import { setBenchSettings } from '../perf/benchSettings'
import { usePersistedSessionCursor } from './usePersistedSessionCursor'

function createParams(overrides?: Partial<Parameters<typeof usePersistedSessionCursor>[0]>) {
  const repository = {
    readAppState: vi.fn().mockResolvedValue({ state_json: null }),
  } as unknown as MediaRepository

  return {
    repository,
    mode: 'video' as const,
    importBusy: false,
    fullscreenActive: false,
    selectedPackageId: 'pkg-current',
    focusByPackage: {},
    pagedPageSize: 40,
    packageByIdEffective: new Map([
      [
        'pkg-a',
        {
          id: 'pkg-a',
          images: [{ hidden: false }, { hidden: false }, { hidden: false }],
        },
      ],
    ]),
    setSelectedPackageId: vi.fn(),
    setImageFocusActive: vi.fn(),
    setFocusByPackage: vi.fn(),
    setPageByPackage: vi.fn(),
    selectedVideoId: '',
    videoTime: 0,
    metadataTab: 'info' as const,
    rootScopedVideoIds: new Set<string>(),
    selectVideoFromBrowser: vi.fn(),
    setVideoTime: vi.fn(),
    setMetadataTab: vi.fn(),
    selectedAudioId: '',
    rootScopedAudioIds: new Set<string>(),
    setSelectedAudioId: vi.fn(),
    setMusicTimeSec: vi.fn(),
    setSelectedSidebarNodeId: vi.fn(),
    imageSourceNodeIdMap: new Map<string, string>(),
    videoNodeIdMap: new Map<string, string>(),
    audioNodeIdMap: new Map<string, string>(),
    ...overrides,
  }
}

function createPersistedImageCursorJson() {
  return JSON.stringify({
    mode: 'image',
    image: {
      packageId: 'pkg-a',
      imageIndex: 2,
    },
    video: {
      videoId: '',
      timeSec: 0,
      metadataTab: 'info',
    },
    music: {
      audioId: '',
      timeSec: 0,
    },
  })
}

describe('usePersistedSessionCursor', () => {
  afterEach(() => {
    setBenchSettings({ enabled: false })
  })

  it('fullscreenActive=true 时不会恢复 cursor，退出 fullscreen 后才恢复', async () => {
    const params = createParams({
      fullscreenActive: true,
      repository: {
        readAppState: vi.fn().mockResolvedValue({
          state_json: createPersistedImageCursorJson(),
        }),
      } as unknown as MediaRepository,
    })

    const { rerender } = renderHook((next) => usePersistedSessionCursor(next), {
      initialProps: params,
    })

    await waitFor(() => {
      expect(params.repository.readAppState).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      expect(params.setSelectedPackageId).toHaveBeenCalledTimes(0)
      expect(params.setImageFocusActive).toHaveBeenCalledTimes(0)
    })

    rerender({
      ...params,
      fullscreenActive: false,
    })

    await waitFor(() => {
      expect(params.setSelectedPackageId).toHaveBeenCalledWith('pkg-a')
      expect(params.setImageFocusActive).toHaveBeenCalledWith(true)
      expect(params.setFocusByPackage).toHaveBeenCalledTimes(1)
      expect(params.setPageByPackage).toHaveBeenCalledTimes(1)
    })
  })

  it('importBusy=true 时不会恢复 cursor，导入结束后才恢复', async () => {
    const params = createParams({
      importBusy: true,
      repository: {
        readAppState: vi.fn().mockResolvedValue({
          state_json: createPersistedImageCursorJson(),
        }),
      } as unknown as MediaRepository,
    })

    const { rerender } = renderHook((next) => usePersistedSessionCursor(next), {
      initialProps: params,
    })

    await waitFor(() => {
      expect(params.repository.readAppState).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      expect(params.setSelectedPackageId).toHaveBeenCalledTimes(0)
      expect(params.setImageFocusActive).toHaveBeenCalledTimes(0)
    })

    rerender({
      ...params,
      importBusy: false,
    })

    await waitFor(() => {
      expect(params.setSelectedPackageId).toHaveBeenCalledWith('pkg-a')
      expect(params.setImageFocusActive).toHaveBeenCalledWith(true)
      expect(params.setFocusByPackage).toHaveBeenCalledTimes(1)
      expect(params.setPageByPackage).toHaveBeenCalledTimes(1)
    })
  })

  it('恢复 image cursor 时会同步侧栏焦点节点', async () => {
    const params = createParams({
      mode: 'image',
      selectedPackageId: '',
      repository: {
        readAppState: vi.fn().mockResolvedValue({
          state_json: createPersistedImageCursorJson(),
        }),
      } as unknown as MediaRepository,
      imageSourceNodeIdMap: new Map([['pkg-a', 'package:pkg-a']]),
    })

    const { rerender } = renderHook((next) => usePersistedSessionCursor(next), {
      initialProps: params,
    })

    await waitFor(() => {
      expect(params.repository.readAppState).toHaveBeenCalledTimes(1)
    })

    rerender({ ...params })

    await waitFor(() => {
      expect(params.setSelectedSidebarNodeId).toHaveBeenCalledWith('package:pkg-a')
    })
  })

  it('恢复 music cursor 时仅恢复焦点并重置进度到 0', async () => {
    const params = createParams({
      mode: 'music',
      selectedAudioId: '',
      repository: {
        readAppState: vi.fn().mockResolvedValue({
          state_json: JSON.stringify({
            mode: 'music',
            image: {
              packageId: '',
              imageIndex: 0,
            },
            video: {
              videoId: '',
              timeSec: 0,
              metadataTab: 'info',
            },
            music: {
              audioId: 'audio-2',
              timeSec: 42.5,
            },
          }),
        }),
      } as unknown as MediaRepository,
      rootScopedAudioIds: new Set(['audio-1', 'audio-2']),
      audioNodeIdMap: new Map([['audio-2', 'audio:Z盘/music']]),
    })

    const { rerender } = renderHook((next) => usePersistedSessionCursor(next), {
      initialProps: params,
    })

    await waitFor(() => {
      expect(params.repository.readAppState).toHaveBeenCalledTimes(1)
    })

    rerender({ ...params })

    await waitFor(() => {
      expect(params.setSelectedAudioId).toHaveBeenCalledWith('audio-2')
      expect(params.setMusicTimeSec).toHaveBeenCalledWith(0)
      expect(params.setSelectedSidebarNodeId).toHaveBeenCalledWith(
        'audio:Z盘/music',
      )
    })
  })

  it('恢复 video cursor 时会恢复 metadataTab', async () => {
    const params = createParams({
      mode: 'video',
      selectedVideoId: '',
      metadataTab: 'info',
      repository: {
        readAppState: vi.fn().mockResolvedValue({
          state_json: JSON.stringify({
            mode: 'video',
            image: {
              packageId: '',
              imageIndex: 0,
            },
            video: {
              videoId: 'video-9',
              timeSec: 18.6,
              metadataTab: 'playlist',
            },
            music: {
              audioId: '',
              timeSec: 0,
            },
          }),
        }),
      } as unknown as MediaRepository,
      rootScopedVideoIds: new Set(['video-9']),
    })

    const { rerender } = renderHook((next) => usePersistedSessionCursor(next), {
      initialProps: params,
    })

    await waitFor(() => {
      expect(params.repository.readAppState).toHaveBeenCalledTimes(1)
    })

    rerender({ ...params })

    await waitFor(() => {
      expect(params.setMetadataTab).toHaveBeenCalledWith('playlist')
      expect(params.setVideoTime).toHaveBeenCalledWith(18.6)
    })
  })

  it('importBusy 阻塞恢复期间不会提前写入覆盖 cursor', async () => {
    const writeAppState = vi.fn().mockResolvedValue({ updated_at_ms: 1 })
    const params = createParams({
      importBusy: true,
      mode: 'image',
      repository: {
        readAppState: vi.fn().mockResolvedValue({
          state_json: createPersistedImageCursorJson(),
        }),
        writeAppState,
      } as unknown as MediaRepository,
    })

    renderHook((next) => usePersistedSessionCursor(next), {
      initialProps: params,
    })

    await waitFor(() => {
      expect(params.repository.readAppState).toHaveBeenCalledTimes(1)
    })

    await new Promise((resolve) => setTimeout(resolve, 380))
    expect(writeAppState).not.toHaveBeenCalled()
  })

  it('music 写入仅更新焦点且不会覆盖 image/video 已持久化游标', async () => {
    const writeAppState = vi.fn().mockResolvedValue({ updated_at_ms: 1 })
    const params = createParams({
      mode: 'music',
      selectedAudioId: 'audio-2',
      rootScopedVideoIds: new Set(['video-7']),
      rootScopedAudioIds: new Set(['audio-1', 'audio-2']),
      repository: {
        readAppState: vi.fn().mockResolvedValue({
          state_json: JSON.stringify({
            mode: 'video',
            image: {
              packageId: 'pkg-a',
              imageIndex: 2,
            },
            video: {
              videoId: 'video-7',
              timeSec: 12.4,
              metadataTab: 'playlist',
            },
            music: {
              audioId: 'audio-1',
              timeSec: 7,
            },
          }),
        }),
        writeAppState,
      } as unknown as MediaRepository,
    })

    renderHook((next) => usePersistedSessionCursor(next), {
      initialProps: params,
    })

    await waitFor(() => {
      expect(params.repository.readAppState).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      expect(writeAppState).toHaveBeenCalledTimes(1)
    })

    const lastCall = writeAppState.mock.calls.at(-1)?.[0]
    const persisted = JSON.parse(lastCall?.state_json ?? '{}') as {
      image: { packageId: string; imageIndex: number }
      video: { videoId: string; timeSec: number; metadataTab: 'info' | 'playlist' }
      music: { audioId: string; timeSec: number }
      mode: string
    }

    expect(persisted.image).toEqual({ packageId: 'pkg-a', imageIndex: 2 })
    expect(persisted.video).toEqual({
      videoId: 'video-7',
      timeSec: 12.4,
      metadataTab: 'playlist',
    })
    expect(persisted.music).toEqual({ audioId: 'audio-2', timeSec: 0 })
    expect(persisted.mode).toBe('music')
  })

  it('music teardown 空音频 id 不会覆盖已写入 cursor', async () => {
    const writeAppState = vi.fn().mockResolvedValue({ updated_at_ms: 1 })
    const params = createParams({
      mode: 'music',
      selectedAudioId: 'audio-2',
      repository: {
        readAppState: vi.fn().mockResolvedValue({
          state_json: createPersistedImageCursorJson(),
        }),
        writeAppState,
      } as unknown as MediaRepository,
    })

    const { rerender } = renderHook((next) => usePersistedSessionCursor(next), {
      initialProps: params,
    })

    await waitFor(() => {
      expect(params.repository.readAppState).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      expect(writeAppState).toHaveBeenCalledTimes(1)
    })

    rerender({
      ...params,
      selectedAudioId: '',
    })

    await new Promise((resolve) => setTimeout(resolve, 380))
    expect(writeAppState).toHaveBeenCalledTimes(1)
  })

  it('persisted.mode=music 时 video 作用域晚到仍会恢复 video 游标', async () => {
    const persistedJson = JSON.stringify({
      mode: 'music',
      image: {
        packageId: 'pkg-a',
        imageIndex: 1,
      },
      video: {
        videoId: 'video-5',
        timeSec: 88.2,
        metadataTab: 'playlist',
      },
      music: {
        audioId: 'audio-2',
        timeSec: 12.3,
      },
    })

    const params = createParams({
      mode: 'music',
      selectedVideoId: '',
      rootScopedVideoIds: new Set<string>(),
      repository: {
        readAppState: vi.fn().mockResolvedValue({
          state_json: persistedJson,
        }),
      } as unknown as MediaRepository,
      rootScopedAudioIds: new Set(['audio-2']),
      videoNodeIdMap: new Map([['video-5', 'video:archive/video-5']]),
    })

    const { rerender } = renderHook((next) => usePersistedSessionCursor(next), {
      initialProps: params,
    })

    await waitFor(() => {
      expect(params.repository.readAppState).toHaveBeenCalledTimes(1)
    })

    expect(params.selectVideoFromBrowser).toHaveBeenCalledTimes(0)
    expect(params.setVideoTime).toHaveBeenCalledTimes(0)

    rerender({
      ...params,
      rootScopedVideoIds: new Set(['video-5']),
    })

    await waitFor(() => {
      expect(params.selectVideoFromBrowser).toHaveBeenCalledWith('video-5', {
        queueSource: 'sidebar',
        preserveRate: true,
      })
      expect(params.setVideoTime).toHaveBeenCalledWith(88.2)
      expect(params.setMetadataTab).toHaveBeenCalledWith('playlist')
      expect(params.setSelectedSidebarNodeId).toHaveBeenCalledWith(
        'video:archive/video-5',
      )
    })
  })

  it('music 状态写入后再写 video 时应保留 video 最新变更', async () => {
    const writeAppState = vi.fn().mockResolvedValue({ updated_at_ms: 1 })
    const params = createParams({
      mode: 'music',
      selectedAudioId: 'audio-2',
      selectedVideoId: 'video-7',
      videoTime: 12.4,
      metadataTab: 'info',
      rootScopedVideoIds: new Set(['video-7', 'video-9']),
      rootScopedAudioIds: new Set(['audio-1', 'audio-2']),
      repository: {
        readAppState: vi.fn().mockResolvedValue({
          state_json: JSON.stringify({
            mode: 'video',
            image: {
              packageId: 'pkg-a',
              imageIndex: 1,
            },
            video: {
              videoId: 'video-7',
              timeSec: 10,
              metadataTab: 'info',
            },
            music: {
              audioId: 'audio-1',
              timeSec: 8,
            },
          }),
        }),
        writeAppState,
      } as unknown as MediaRepository,
    })

    const { rerender } = renderHook((next) => usePersistedSessionCursor(next), {
      initialProps: params,
    })

    await waitFor(() => {
      expect(params.repository.readAppState).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      expect(writeAppState).toHaveBeenCalledTimes(1)
    })

    rerender({
      ...params,
      mode: 'video',
      selectedVideoId: 'video-9',
      videoTime: 77.7,
      metadataTab: 'playlist',
    })

    await waitFor(() => {
      expect(writeAppState).toHaveBeenCalledTimes(2)
    })

    const lastCall = writeAppState.mock.calls.at(-1)?.[0]
    const persisted = JSON.parse(lastCall?.state_json ?? '{}') as {
      video: { videoId: string; timeSec: number; metadataTab: 'info' | 'playlist' }
      mode: string
    }

    expect(persisted.mode).toBe('video')
    expect(persisted.video).toEqual({
      videoId: 'video-9',
      timeSec: 77.7,
      metadataTab: 'playlist',
    })
  })
})
