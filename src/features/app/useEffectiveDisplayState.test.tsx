import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { VideoItem } from '../../types'
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

function createParams(videosForSidebar: VideoItem[], selectedVideoId = ''): Parameters<typeof useEffectiveDisplayState>[0] {
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
    videosForSidebar,
    videoDurationById: {},
    videoCoverById: {},
    videoCoverImageById: {},
  }
}

describe('useEffectiveDisplayState', () => {
  it('选中视频不在当前侧栏范围时回退到范围内首项', () => {
    const sidebarVideo = makeVideo('video-inside')

    const { result } = renderHook(() =>
      useEffectiveDisplayState(createParams([sidebarVideo], 'video-outside')),
    )

    expect(result.current.focusedVideo?.id).toBe('video-inside')
  })

  it('当前侧栏没有视频时不会保留过期视频焦点', () => {
    const { result } = renderHook(() =>
      useEffectiveDisplayState(createParams([], 'video-outside')),
    )

    expect(result.current.focusedVideo).toBeNull()
  })
})
