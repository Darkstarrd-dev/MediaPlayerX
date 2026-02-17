import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { MediaRepository } from '../backend/repository'
import { useLiveSubtitles } from './useLiveSubtitles'

vi.mock('./VideoSubtitleCapture', () => {
  class MockVideoSubtitleCapture {
    async attach(): Promise<void> {
      return
    }

    detach(): void {
      return
    }

    dispose(): void {
      return
    }
  }

  return {
    VideoSubtitleCapture: MockVideoSubtitleCapture,
  }
})

function createRepository(): MediaRepository {
  return {
    getInitialLibrarySnapshot: () => null,
    readLibrarySnapshot: vi.fn(),
    readImageSidebarTree: vi.fn(),
    readImagePage: vi.fn(),
    readImageMetadata: vi.fn(),
    resolveMediaResource: vi.fn(),
    writePackageGrade: vi.fn(),
    saveVideoCover: vi.fn(),
    readPlaylist: vi.fn(),
    writePlaylist: vi.fn(),
    enqueueImportTask: vi.fn(),
    readImportTasks: vi.fn(),
    retryImportTask: vi.fn(),
    readMediaAccessAudit: vi.fn(),
    readRuntimeCapabilities: vi.fn(),
    startSubtitleSession: vi.fn().mockResolvedValue({
      session_id: 'session-1',
      provider: 'cpu',
      fallback_applied: false,
      events: [],
      started_at_ms: Date.now(),
    }),
    stopSubtitleSession: vi.fn().mockResolvedValue({
      session_id: 'session-1',
      stopped: true,
      updated_at_ms: Date.now(),
    }),
    resetSubtitleSession: vi.fn().mockResolvedValue({
      session_id: 'session-1',
      ok: true,
      events: [],
      updated_at_ms: Date.now(),
    }),
    flushSubtitleSession: vi.fn().mockResolvedValue({
      session_id: 'session-1',
      cues: [],
      preview: null,
      events: [],
      updated_at_ms: Date.now(),
    }),
    pushSubtitleAudio: vi.fn().mockResolvedValue({
      session_id: 'session-1',
      accepted: true,
      provider: 'cpu',
      cues: [],
      preview: null,
      events: [],
      updated_at_ms: Date.now(),
    }),
    precomputeSubtitleCues: vi.fn().mockResolvedValue({
      source: 'generated',
      cache_key: 'cache-key-1',
      cues: [
        {
          id: 'cue-pre-1',
          start_sec: 1,
          end_sec: 2,
          text: 'precomputed subtitle',
          lang: 'ja',
        },
      ],
      events: [],
      generated_at_ms: Date.now(),
    }),
  } as unknown as MediaRepository
}

describe('useLiveSubtitles', () => {
  it('优先显示预生成 cues 文本', async () => {
    const repository = createRepository()
    const videoElement = document.createElement('video')

    const { result } = renderHook(() =>
      useLiveSubtitles({
        enabled: true,
        videoElement,
        videoPath: 'D:/videos/demo.mp4',
        currentTimeSec: 1.5,
        modelDir: 'D:/models/subtitle',
        modelId: 'sensevoice-small-int8-2025-01',
        providerPreference: 'cpu',
        language: 'auto',
        repository,
      }),
    )

    await waitFor(() => {
      expect(result.current.activeText).toBe('precomputed subtitle')
    })

    expect(repository.precomputeSubtitleCues).toHaveBeenCalledWith({
      video_path: 'D:/videos/demo.mp4',
      model_dir: 'D:/models/subtitle',
      model_id: 'sensevoice-small-int8-2025-01',
      provider_preference: 'cpu',
      language: 'auto',
      fallback_to_cpu: true,
    })
  })

  it('从预生成 cues 中提取检测语言', async () => {
    const repository = createRepository()
    const videoElement = document.createElement('video')

    const { result } = renderHook(() =>
      useLiveSubtitles({
        enabled: true,
        videoElement,
        videoPath: 'D:/videos/demo.mp4',
        currentTimeSec: 1.5,
        modelDir: 'D:/models/subtitle',
        modelId: 'sensevoice-small-int8-2025-01',
        providerPreference: 'cpu',
        language: 'auto',
        repository,
      }),
    )

    await waitFor(() => {
      expect(result.current.detectedLanguage).toBe('ja')
    })
  })
})
