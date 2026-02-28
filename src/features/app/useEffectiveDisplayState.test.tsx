import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { AudioItem, VideoItem } from '../../types'
import { useEffectiveDisplayState } from './useEffectiveDisplayState'

function makeVideo(id: string): VideoItem {
  return {
    id,
    fileName: `${id}.mp4`,
    absolutePath: `D:/videos/${id}.mp4`,
    treePath: ['D:', 'videos', `${id}.mp4`],
    durationSec: 10,
    width: 1920,
    height: 1080,
    sizeMb: 12,
    coverColor: '#334455',
    coverImagePath: null,
    workTitle: id,
    circle: 'circle',
    author: 'author',
    tags: [],
    grade: null,
    mediaLocator: {
      kind: 'filesystem',
      absolutePath: `D:/videos/${id}.mp4`,
      extension: '.mp4',
      mediaType: 'video',
      mimeType: 'video/mp4',
    },
  }
}

function makeAudio(id: string): AudioItem {
  return {
    id,
    fileName: `${id}.mp3`,
    absolutePath: `D:/audios/${id}.mp3`,
    treePath: ['D:', 'audios', `${id}.mp3`],
    durationSec: 10,
    sizeMb: 4,
    album: 'album',
    author: 'author',
    trackTitle: id,
    mediaLocator: {
      kind: 'filesystem',
      absolutePath: `D:/audios/${id}.mp3`,
      extension: '.mp3',
      mediaType: 'audio',
      mimeType: 'audio/mpeg',
    },
  }
}

function createParams(
  videosForSidebar: VideoItem[],
  audiosForSidebar: AudioItem[],
  selectedVideoId = '',
  selectedAudioId = '',
  audioById: ReadonlyMap<string, AudioItem> = new Map(
    audiosForSidebar.map((audio) => [audio.id, audio]),
  ),
): Parameters<typeof useEffectiveDisplayState>[0] {
  return {
    backendPageData: null,
    backendPageSnapshot: null,
    backendMetadataData: null,
    backendMetadataSnapshot: null,
    vectorResultsActive: false,
    imageFocusActive: false,
    focusedRef: null,
    focusedImage: null,
    activePackage: null,
    refsInPage: [],
    pageStart: 0,
    normalizedPageIndex: 0,
    imageTotalPages: 1,
    pagedPageSize: 40,
    showNamesOnly: false,
    packageById: new Map(),
    metadataImagePackage: null,
    currentGrade: null,
    selectedVideoId,
    selectedAudioId,
    audioById,
    videosForSidebar,
    audiosForSidebar,
    videoDurationById: {},
    videoCoverById: {},
    videoCoverImageById: {},
  }
}

describe('useEffectiveDisplayState', () => {
  it('选中视频不在当前侧栏范围时回退到范围内首项', () => {
    const sidebarVideo = makeVideo('video-inside')

    const { result } = renderHook(() =>
      useEffectiveDisplayState(createParams([sidebarVideo], [], 'video-outside')),
    )

    expect(result.current.focusedVideo?.id).toBe('video-inside')
  })

  it('当前侧栏没有视频时不会保留过期视频焦点', () => {
    const { result } = renderHook(() =>
      useEffectiveDisplayState(createParams([], [], 'video-outside')),
    )

    expect(result.current.focusedVideo).toBeNull()
  })

  it('选中音频不在当前侧栏范围时回退到范围内首项', () => {
    const sidebarAudio = makeAudio('audio-inside')

    const { result } = renderHook(() =>
      useEffectiveDisplayState(createParams([], [sidebarAudio], '', 'audio-outside')),
    )

    expect(result.current.focusedAudio?.id).toBe('audio-inside')
  })

  it('非音乐模式侧栏为空时仍应保持已选音频焦点', () => {
    const pinnedAudio = makeAudio('audio-pinned')
    const audioById = new Map<string, AudioItem>([[pinnedAudio.id, pinnedAudio]])

    const { result } = renderHook(() =>
      useEffectiveDisplayState(createParams([], [], '', pinnedAudio.id, audioById)),
    )

    expect(result.current.focusedAudio?.id).toBe('audio-pinned')
  })
})
