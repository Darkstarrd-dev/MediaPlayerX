import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { VideoItem } from '../../types'
import { useMediaState } from './useMediaState'

function createVideo(id: string): VideoItem {
  return {
    id,
    fileName: `${id}.mp4`,
    absolutePath: `C:/videos/${id}.mp4`,
    treePath: ['videos'],
    durationSec: 120,
    width: 1920,
    height: 1080,
    sizeMb: 100,
    coverColor: '#123456',
    coverImagePath: null,
    workTitle: id,
    seriesId: '',
    circle: '',
    author: '',
    tags: [],
    grade: null,
    mediaLocator: {
      kind: 'filesystem',
      absolutePath: `C:/videos/${id}.mp4`,
      extension: '.mp4',
      mediaType: 'video',
      mimeType: 'video/mp4',
    },
  }
}

describe('useMediaState video speed behavior', () => {
  it('manual video selection resets speed to 1x', () => {
    const videos = [createVideo('video-a'), createVideo('video-b')]
    const { result } = renderHook(() =>
      useMediaState({
        initialVideoId: videos[0].id,
        initialPlaylistIds: videos.map((video) => video.id),
        videos,
      }),
    )

    act(() => {
      result.current.setVideoRate(2)
    })
    expect(result.current.videoRate).toBe(2)

    act(() => {
      result.current.selectVideoFromBrowser(videos[1].id)
    })

    expect(result.current.selectedVideoId).toBe(videos[1].id)
    expect(result.current.videoRate).toBe(1)
  })

  it('goPlaylist keeps speed only when preserveRate is true', () => {
    const videos = [createVideo('video-a'), createVideo('video-b')]
    const { result } = renderHook(() =>
      useMediaState({
        initialVideoId: videos[0].id,
        initialPlaylistIds: videos.map((video) => video.id),
        videos,
      }),
    )

    act(() => {
      result.current.setVideoRate(2)
      result.current.goPlaylist(1)
    })

    expect(result.current.selectedVideoId).toBe(videos[1].id)
    expect(result.current.videoRate).toBe(1)

    act(() => {
      result.current.setVideoRate(2)
      result.current.goPlaylist(-1, undefined, { preserveRate: true })
    })

    expect(result.current.selectedVideoId).toBe(videos[0].id)
    expect(result.current.videoRate).toBe(2)
  })

  it('goPlaylist 在提供 sidebar 队列时优先使用该队列', () => {
    const videos = [createVideo('video-a'), createVideo('video-b'), createVideo('video-c')]
    const { result } = renderHook(() =>
      useMediaState({
        initialVideoId: videos[0].id,
        initialPlaylistIds: [videos[0].id],
        videos,
      }),
    )

    act(() => {
      result.current.selectVideoFromBrowser(videos[0].id, { queueSource: 'playlist' })
    })

    act(() => {
      result.current.goPlaylist(1, [videos[0].id, videos[1].id])
    })

    expect(result.current.selectedVideoId).toBe(videos[1].id)
  })

  it('goPlaylist 在当前视频不在队列中时从队列首项开始', () => {
    const videos = [createVideo('video-a'), createVideo('video-b'), createVideo('video-c')]
    const { result } = renderHook(() =>
      useMediaState({
        initialVideoId: videos[2].id,
        initialPlaylistIds: videos.map((video) => video.id),
        videos,
      }),
    )

    act(() => {
      result.current.goPlaylist(1, [videos[0].id, videos[1].id], { preserveRate: true })
    })

    expect(result.current.selectedVideoId).toBe(videos[0].id)
    expect(result.current.videoTime).toBe(0)
  })

  it('selectVideoFromBrowser 显式 play false 时会暂停', () => {
    const videos = [createVideo('video-a'), createVideo('video-b')]
    const { result } = renderHook(() =>
      useMediaState({
        initialVideoId: videos[0].id,
        initialPlaylistIds: videos.map((video) => video.id),
        videos,
      }),
    )

    act(() => {
      result.current.setVideoPlaying(true)
    })
    expect(result.current.videoPlaying).toBe(true)

    act(() => {
      result.current.selectVideoFromBrowser(videos[1].id, { play: false, queueSource: 'sidebar' })
    })

    expect(result.current.selectedVideoId).toBe(videos[1].id)
    expect(result.current.videoPlaying).toBe(false)
  })
})
