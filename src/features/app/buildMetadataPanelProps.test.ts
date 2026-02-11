import { describe, expect, it, vi } from 'vitest'

import type { ImageItem, ImagePackage, VideoItem } from '../../types'
import { buildMetadataPanelProps } from './buildMetadataPanelProps'

const IMAGE_FIXTURE: ImageItem = {
  id: 'img-1',
  ordinal: 1,
  width: 1920,
  height: 1080,
  sizeKb: 256,
  cluster: 0,
  color: '#335577',
  featureVector: [0, 0, 0, 0],
  mediaLocator: {
    kind: 'filesystem',
    absolutePath: 'D:/img-1.jpg',
    extension: '.jpg',
    mediaType: 'image',
    mimeType: 'image/jpeg',
  },
}

const PACKAGE_FIXTURE: ImagePackage = {
  id: 'pkg-1',
  packageName: 'pkg-1.zip',
  displayName: 'pkg-1',
  absolutePath: 'D:/pkg-1.zip',
  treePath: ['pkg-1.zip'],
  workTitle: 'pkg-1',
  circle: '未知',
  author: '未知',
  tags: [],
  mockGrade: 3,
  images: [IMAGE_FIXTURE],
}

const VIDEO_FIXTURE: VideoItem = {
  id: 'video-a',
  fileName: 'video-a.mp4',
  absolutePath: 'D:/video-a.mp4',
  treePath: ['video-a.mp4'],
  durationSec: 10,
  width: 1280,
  height: 720,
  sizeMb: 42,
  coverColor: 'hsl(210, 44%, 40%)',
  coverImagePath: null,
  workTitle: 'video-a',
  circle: '未知',
  author: '未知',
  tags: [],
  grade: null,
  mediaLocator: {
    kind: 'filesystem',
    absolutePath: 'D:/video-a.mp4',
    extension: '.mp4',
    mediaType: 'video',
    mimeType: 'video/mp4',
  },
}

describe('buildMetadataPanelProps', () => {
  it('折叠展开与移除播放列表操作会正确透传到 setter', () => {
    const updateSettings = vi.fn()
    const setPlaylistIds = vi.fn()
    const setDragVideoId = vi.fn()

    const props = buildMetadataPanelProps({
      mode: 'image',
      metadataCollapsed: false,
      metadataRatio: 0.28,
      hasImageFocus: true,
      focusedImage: IMAGE_FIXTURE,
      focusedImageSrc: 'about:blank#image',
      focusedImagePackage: PACKAGE_FIXTURE,
      currentGrade: 3,
      currentVideoGrade: null,
      metadataPending: false,
      autoTagPending: false,
      embeddingPending: false,
      editable: false,
      focusedVideo: VIDEO_FIXTURE,
      metadataTab: 'playlist',
      playlistIds: ['video-a', 'video-b'],
      selectedVideoId: 'video-a',
      dragVideoId: null,
      videoVolume: 1,
      videoMuted: false,
      videoRate: 1,
      videoById: new Map([
        ['video-a', VIDEO_FIXTURE],
        ['video-b', { ...VIDEO_FIXTURE, id: 'video-b', fileName: 'video-b.mp4', workTitle: 'video-b' }],
      ]),
      updateSettings,
      onGradeChange: vi.fn(),
      onSavePackageMetadata: vi.fn(),
      onGeneratePackageAutoTags: vi.fn(),
      onGeneratePackageAutoTagsVision: vi.fn(),
      onGeneratePackageEmbeddings: vi.fn(),
      onSaveVideoMetadata: vi.fn(),
      onSearchByWorkTitle: vi.fn(),
      onSearchByCircle: vi.fn(),
      onSearchByAuthor: vi.fn(),
      onSearchByTag: vi.fn(),
      onMetadataTabChange: vi.fn(),
      onSelectVideo: vi.fn(),
      setPlaylistIds,
      setDragVideoId,
    })

    props.onCollapse()
    props.onExpand()
    expect(updateSettings).toHaveBeenNthCalledWith(1, { metadataCollapsed: true })
    expect(updateSettings).toHaveBeenNthCalledWith(2, { metadataCollapsed: false })

    props.onRemoveVideoFromPlaylist('video-b')
    const removeUpdater = setPlaylistIds.mock.calls[0]?.[0] as ((value: string[]) => string[]) | undefined
    expect(removeUpdater?.(['video-a', 'video-b'])).toEqual(['video-a'])

    props.onDragStart('video-a')
    expect(setDragVideoId).toHaveBeenCalledWith('video-a')
  })

  it('拖拽 drop 到目标视频时会重排播放列表，非法场景保持不变', () => {
    const setPlaylistIds = vi.fn()

    const props = buildMetadataPanelProps({
      mode: 'video',
      metadataCollapsed: false,
      metadataRatio: 0.28,
      hasImageFocus: false,
      focusedImage: null,
      focusedImageSrc: null,
      focusedImagePackage: null,
      currentGrade: null,
      currentVideoGrade: null,
      metadataPending: false,
      autoTagPending: false,
      embeddingPending: false,
      editable: false,
      focusedVideo: VIDEO_FIXTURE,
      metadataTab: 'playlist',
      playlistIds: ['video-a', 'video-b', 'video-c'],
      selectedVideoId: 'video-a',
      dragVideoId: 'video-b',
      videoVolume: 1,
      videoMuted: false,
      videoRate: 1,
      videoById: new Map([
        ['video-a', VIDEO_FIXTURE],
        ['video-b', { ...VIDEO_FIXTURE, id: 'video-b', fileName: 'video-b.mp4', workTitle: 'video-b' }],
        ['video-c', { ...VIDEO_FIXTURE, id: 'video-c', fileName: 'video-c.mp4', workTitle: 'video-c' }],
      ]),
      updateSettings: vi.fn(),
      onGradeChange: vi.fn(),
      onSavePackageMetadata: vi.fn(),
      onGeneratePackageAutoTags: vi.fn(),
      onGeneratePackageAutoTagsVision: vi.fn(),
      onGeneratePackageEmbeddings: vi.fn(),
      onSaveVideoMetadata: vi.fn(),
      onSearchByWorkTitle: vi.fn(),
      onSearchByCircle: vi.fn(),
      onSearchByAuthor: vi.fn(),
      onSearchByTag: vi.fn(),
      onMetadataTabChange: vi.fn(),
      onSelectVideo: vi.fn(),
      setPlaylistIds,
      setDragVideoId: vi.fn(),
    })

    props.onDropToVideo('video-a')
    const reorderUpdater = setPlaylistIds.mock.calls[0]?.[0] as ((value: string[]) => string[]) | undefined
    expect(reorderUpdater?.(['video-a', 'video-b', 'video-c'])).toEqual(['video-b', 'video-a', 'video-c'])

    props.onDropToVideo('video-b')
    expect(setPlaylistIds).toHaveBeenCalledTimes(1)
  })
})
