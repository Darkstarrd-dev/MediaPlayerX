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
    rootScopedVideoIds: new Set<string>(),
    selectVideoFromBrowser: vi.fn(),
    setVideoTime: vi.fn(),
    selectedAudioId: '',
    rootScopedAudioIds: new Set<string>(),
    setSelectedAudioId: vi.fn(),
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
    },
    music: {
      audioId: '',
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
})
