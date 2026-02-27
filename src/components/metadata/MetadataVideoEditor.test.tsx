import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { VideoItem } from '../../types'
import { MetadataVideoEditor } from './MetadataVideoEditor'

function makeVideo(overrides: Partial<VideoItem> = {}): VideoItem {
  return {
    id: 'video-1',
    fileName: 'video-1.mp4',
    absolutePath: 'D:/video/video-1.mp4',
    treePath: ['D:', 'video', 'video-1.mp4'],
    durationSec: 151,
    width: 1920,
    height: 1080,
    sizeMb: 12,
    coverColor: '#222222',
    coverImagePath: null,
    workTitle: 'Work A',
    workTitleJpn: '作品A',
    seriesId: 'series-a',
    circle: 'Circle A',
    circleJpn: 'サークルA',
    author: 'Author A',
    authorJpn: '作者A',
    tags: ['tag-a'],
    grade: null,
    mediaLocator: {
      kind: 'filesystem',
      absolutePath: 'D:/video/video-1.mp4',
      extension: '.mp4',
      mediaType: 'video',
      mimeType: 'video/mp4',
    },
    ...overrides,
  }
}

function makeProps(overrides: Partial<Parameters<typeof MetadataVideoEditor>[0]> = {}) {
  const video = makeVideo()
  return {
    metadataTab: 'playlist' as const,
    videoQueueSource: 'playlist' as const,
    focusedVideo: video,
    metadataPending: false,
    editable: false,
    currentVideoGrade: null,
    videoWorkTitleDraft: video.workTitle,
    videoWorkTitleJpnDraft: video.workTitleJpn ?? '',
    videoSeriesIdDraft: video.seriesId ?? '',
    videoCircleDraft: video.circle,
    videoCircleJpnDraft: video.circleJpn ?? '',
    videoAuthorDraft: video.author,
    videoAuthorJpnDraft: video.authorJpn ?? '',
    videoTagsDraft: video.tags.join(', '),
    playlistIds: [video.id],
    savedVideoPlaylists: {},
    selectedVideoId: video.id,
    dragVideoId: null,
    videoById: new Map([[video.id, video]]),
    onMetadataTabChange: vi.fn(),
    onVideoWorkTitleDraftChange: vi.fn(),
    onVideoWorkTitleJpnDraftChange: vi.fn(),
    onVideoSeriesIdDraftChange: vi.fn(),
    onVideoCircleDraftChange: vi.fn(),
    onVideoCircleJpnDraftChange: vi.fn(),
    onVideoAuthorDraftChange: vi.fn(),
    onVideoAuthorJpnDraftChange: vi.fn(),
    onVideoTagsDraftChange: vi.fn(),
    onSubmitVideoWorkTitle: vi.fn(),
    onSubmitVideoWorkTitleJpn: vi.fn(),
    onSubmitVideoSeriesId: vi.fn(),
    onSubmitVideoCircle: vi.fn(),
    onSubmitVideoCircleJpn: vi.fn(),
    onSubmitVideoAuthor: vi.fn(),
    onSubmitVideoAuthorJpn: vi.fn(),
    onSubmitVideoTags: vi.fn(),
    onVideoGradeChange: vi.fn(),
    onSearchByWorkTitle: vi.fn(),
    onSearchByCircle: vi.fn(),
    onSearchByAuthor: vi.fn(),
    onSearchByTag: vi.fn(),
    onSelectVideo: vi.fn(),
    onSelectVideoAndPlay: vi.fn(),
    onSaveCurrentPlaylist: vi.fn(),
    onCreateNamedPlaylist: vi.fn(),
    onLoadSavedPlaylist: vi.fn(),
    onDeleteSavedPlaylist: vi.fn(),
    onRemoveVideoFromPlaylist: vi.fn(),
    onDragStart: vi.fn(),
    onDropToVideo: vi.fn(),
    onDragEnd: vi.fn(),
    ...overrides,
  }
}

describe('MetadataVideoEditor playlist integration', () => {
  it('播放列表条目聚焦后按 Delete 会删除当前视频', () => {
    const onRemoveVideoFromPlaylist = vi.fn()
    const props = makeProps({ onRemoveVideoFromPlaylist })

    render(<MetadataVideoEditor {...props} />)

    const videoButton = screen.getByRole('button', { name: /video-1.mp4/i })
    fireEvent.focus(videoButton)
    fireEvent.keyDown(videoButton, { key: 'Delete' })

    expect(onRemoveVideoFromPlaylist).toHaveBeenCalledWith('video-1')
  })
})
