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

describe('MetadataMusicEditor', () => {
  it('只读模式渲染 album/author/trackTitle 并支持检索跳转', () => {
    const onSearchByWorkTitle = vi.fn()
    const onSearchByCircle = vi.fn()
    const onSearchByAuthor = vi.fn()

    render(
      <MetadataMusicEditor
        focusedAudio={makeAudio()}
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
      />,
    )

    expect(screen.getByText('Album A')).toBeInTheDocument()
    expect(screen.getByText('Author A')).toBeInTheDocument()
    expect(screen.getByText('Track A')).toBeInTheDocument()

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

    render(
      <MetadataMusicEditor
        focusedAudio={makeAudio()}
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
      />,
    )

    const albumInput = screen.getByDisplayValue('Album A')
    const authorInput = screen.getByDisplayValue('Author A')
    const trackInput = screen.getByDisplayValue('Track A')
    const seriesInput = screen.getByDisplayValue('series-a')

    fireEvent.keyDown(albumInput, { key: 'Enter' })
    fireEvent.keyDown(authorInput, { key: 'Enter' })
    fireEvent.keyDown(trackInput, { key: 'Enter' })
    fireEvent.keyDown(seriesInput, { key: 'Enter' })

    expect(onSubmitAudioAlbum).toHaveBeenCalledWith('Album A')
    expect(onSubmitAudioAuthor).toHaveBeenCalledWith('Author A')
    expect(onSubmitAudioTrackTitle).toHaveBeenCalledWith('Track A')
    expect(onSubmitAudioSeriesId).toHaveBeenCalledWith('series-a')
  })
})
