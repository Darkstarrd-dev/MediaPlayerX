import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { AudioItem } from '../../types'
import { MetadataMusicEditor } from './MetadataMusicEditor'

function makeAudio(): AudioItem {
  return {
    id: 'audio-1',
    fileName: 'audio-1.mp3',
    absolutePath: 'D:/audio/audio-1.mp3',
    treePath: ['D:', 'audio', 'audio-1.mp3'],
    durationSec: 86,
    sizeMb: 7,
    album: 'Album A',
    author: 'Author A',
    trackTitle: 'Track A',
    seriesId: 'series-a',
    mediaLocator: {
      kind: 'filesystem',
      absolutePath: 'D:/audio/audio-1.mp3',
      extension: '.mp3',
      mediaType: 'audio',
      mimeType: 'audio/mpeg',
    },
  }
}

function makeBookletProps(overrides: Partial<Parameters<typeof MetadataMusicEditor>[0]> = {}) {
  return {
    musicBookletAlbumRootPath: 'D:/audio',
    musicBookletCandidates: [
      { sourceId: 'cover-source', label: 'cover', imageCount: 1 },
      { sourceId: 'scans-source', label: 'scans', imageCount: 12 },
    ],
    musicCoverBindingValue: '__auto__',
    musicBookletBindingValue: '__auto__',
    canOpenMusicCover: true,
    canOpenMusicBooklet: true,
    onMusicCoverBindingChange: vi.fn(),
    onMusicBookletBindingChange: vi.fn(),
    onOpenMusicCover: vi.fn(),
    onOpenMusicBooklet: vi.fn(),
    onResetMusicBookletBinding: vi.fn(),
    ...overrides,
  }
}

describe('MetadataMusicEditor', () => {
  it('只读模式渲染 album/author/trackTitle 并支持检索跳转', () => {
    const onSearchByWorkTitle = vi.fn()
    const onSearchByCircle = vi.fn()
    const onSearchByAuthor = vi.fn()
    const audio = makeAudio()

    render(
      <MetadataMusicEditor
        focusedAudio={audio}
        audioPlaylistIds={[audio.id]}
        selectedAudioId={audio.id}
        audioById={new Map([[audio.id, audio]])}
        {...makeBookletProps()}
        metadataPending={false}
        editable={false}
        audioAlbumDraft="Album A"
        audioAuthorDraft="Author A"
        audioTrackTitleDraft="Track A"
        audioSeriesIdDraft="series-a"
        onAudioAlbumDraftChange={vi.fn()}
        onAudioAuthorDraftChange={vi.fn()}
        onAudioTrackTitleDraftChange={vi.fn()}
        onAudioSeriesIdDraftChange={vi.fn()}
        onSubmitAudioAlbum={vi.fn()}
        onSubmitAudioAuthor={vi.fn()}
        onSubmitAudioTrackTitle={vi.fn()}
        onSubmitAudioSeriesId={vi.fn()}
        onSearchByWorkTitle={onSearchByWorkTitle}
        onSearchByCircle={onSearchByCircle}
        onSearchByAuthor={onSearchByAuthor}
        onSelectAudio={vi.fn()}
        onSelectAudioAndPlay={vi.fn()}
      />,
    )

    expect(screen.getByText('Album A')).toBeInTheDocument()
    expect(screen.getByText('Author A')).toBeInTheDocument()
    expect(screen.getByText('Track A')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '打开封面' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '打开Booklet' })).not.toBeInTheDocument()
    expect(screen.queryByText('Booklet 绑定')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Track A'))
    fireEvent.click(screen.getByText('Album A'))
    fireEvent.click(screen.getByText('Author A'))

    expect(onSearchByWorkTitle).toHaveBeenCalledWith('Track A')
    expect(onSearchByCircle).toHaveBeenCalledWith('Album A')
    expect(onSearchByAuthor).toHaveBeenCalledWith('Author A')
  })

  it('编辑模式回车会提交四个字段', () => {
    const onSubmitAudioAlbum = vi.fn()
    const onSubmitAudioAuthor = vi.fn()
    const onSubmitAudioTrackTitle = vi.fn()
    const onSubmitAudioSeriesId = vi.fn()
    const audio = makeAudio()

    render(
      <MetadataMusicEditor
        focusedAudio={audio}
        audioPlaylistIds={[audio.id]}
        selectedAudioId={audio.id}
        audioById={new Map([[audio.id, audio]])}
        {...makeBookletProps()}
        metadataPending={false}
        editable={true}
        audioAlbumDraft="Album A"
        audioAuthorDraft="Author A"
        audioTrackTitleDraft="Track A"
        audioSeriesIdDraft="series-a"
        onAudioAlbumDraftChange={vi.fn()}
        onAudioAuthorDraftChange={vi.fn()}
        onAudioTrackTitleDraftChange={vi.fn()}
        onAudioSeriesIdDraftChange={vi.fn()}
        onSubmitAudioAlbum={onSubmitAudioAlbum}
        onSubmitAudioAuthor={onSubmitAudioAuthor}
        onSubmitAudioTrackTitle={onSubmitAudioTrackTitle}
        onSubmitAudioSeriesId={onSubmitAudioSeriesId}
        onSearchByWorkTitle={vi.fn()}
        onSearchByCircle={vi.fn()}
        onSearchByAuthor={vi.fn()}
        onSelectAudio={vi.fn()}
        onSelectAudioAndPlay={vi.fn()}
      />,
    )

    const albumInput = screen.getByDisplayValue('Album A')
    const authorInput = screen.getByDisplayValue('Author A')
    const trackInput = screen.getByDisplayValue('Track A')
    const seriesInput = screen.getByDisplayValue('series-a')
    expect(screen.getByText('Booklet 绑定')).toBeInTheDocument()

    fireEvent.keyDown(albumInput, { key: 'Enter' })
    fireEvent.keyDown(authorInput, { key: 'Enter' })
    fireEvent.keyDown(trackInput, { key: 'Enter' })
    fireEvent.keyDown(seriesInput, { key: 'Enter' })

    expect(onSubmitAudioAlbum).toHaveBeenCalledWith('Album A')
    expect(onSubmitAudioAuthor).toHaveBeenCalledWith('Author A')
    expect(onSubmitAudioTrackTitle).toHaveBeenCalledWith('Track A')
    expect(onSubmitAudioSeriesId).toHaveBeenCalledWith('series-a')
  })

  it('播放列表渲染到元数据面板并支持点击切换曲目', () => {
    const audioA = makeAudio()
    const audioB = {
      ...makeAudio(),
      id: 'audio-2',
      fileName: 'audio-2.mp3',
      absolutePath: 'D:/audio/audio-2.mp3',
      trackTitle: 'Track B',
      mediaLocator: {
        kind: 'filesystem' as const,
        absolutePath: 'D:/audio/audio-2.mp3',
        extension: '.mp3',
        mediaType: 'audio' as const,
        mimeType: 'audio/mpeg',
      },
    }
    const onSelectAudio = vi.fn()
    const onSelectAudioAndPlay = vi.fn()

    render(
      <MetadataMusicEditor
        focusedAudio={audioA}
        audioPlaylistIds={[]}
        selectedAudioId={audioA.id}
        audioById={new Map([
          [audioA.id, audioA],
          [audioB.id, audioB],
        ])}
        {...makeBookletProps()}
        metadataPending={false}
        editable={false}
        audioAlbumDraft="Album A"
        audioAuthorDraft="Author A"
        audioTrackTitleDraft="Track A"
        audioSeriesIdDraft="series-a"
        onAudioAlbumDraftChange={vi.fn()}
        onAudioAuthorDraftChange={vi.fn()}
        onAudioTrackTitleDraftChange={vi.fn()}
        onAudioSeriesIdDraftChange={vi.fn()}
        onSubmitAudioAlbum={vi.fn()}
        onSubmitAudioAuthor={vi.fn()}
        onSubmitAudioTrackTitle={vi.fn()}
        onSubmitAudioSeriesId={vi.fn()}
        onSearchByWorkTitle={vi.fn()}
        onSearchByCircle={vi.fn()}
        onSearchByAuthor={vi.fn()}
        onSelectAudio={onSelectAudio}
        onSelectAudioAndPlay={onSelectAudioAndPlay}
      />,
    )

    expect(screen.getByLabelText('音乐播放列表')).toBeInTheDocument()
    const audio2Button = screen.getByRole('button', { name: /audio-2.mp3/i })
    fireEvent.click(audio2Button)
    expect(onSelectAudio).toHaveBeenCalledWith('audio-2')
    expect(onSelectAudioAndPlay).not.toHaveBeenCalled()

    fireEvent.doubleClick(audio2Button)
    expect(onSelectAudioAndPlay).toHaveBeenCalledWith('audio-2')
  })
})
