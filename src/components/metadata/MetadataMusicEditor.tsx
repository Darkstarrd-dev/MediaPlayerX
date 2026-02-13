import type { KeyboardEvent as ReactKeyboardEvent } from 'react'

import type { AudioItem } from '../../types'

interface MetadataMusicEditorProps {
  focusedAudio: AudioItem | null
  metadataPending: boolean
  editable: boolean
  audioAlbumDraft: string
  audioAuthorDraft: string
  audioTrackTitleDraft: string
  audioSeriesIdDraft: string
  onAudioAlbumDraftChange: (value: string) => void
  onAudioAuthorDraftChange: (value: string) => void
  onAudioTrackTitleDraftChange: (value: string) => void
  onAudioSeriesIdDraftChange: (value: string) => void
  onSubmitAudioAlbum: (value: string) => void
  onSubmitAudioAuthor: (value: string) => void
  onSubmitAudioTrackTitle: (value: string) => void
  onSubmitAudioSeriesId: (value: string) => void
  onSearchByWorkTitle: (value: string) => void
  onSearchByCircle: (value: string) => void
  onSearchByAuthor: (value: string) => void
}

function commitOnEnter(
  event: ReactKeyboardEvent<HTMLInputElement>,
  onCommit: (value: string) => void,
): void {
  if (event.key !== 'Enter') {
    return
  }
  event.preventDefault()
  onCommit(event.currentTarget.value)
}

function normalizeSearchValue(value: string): string {
  const normalized = value.trim()
  return normalized.length > 0 && normalized !== '-' ? normalized : ''
}

export function MetadataMusicEditor({
  focusedAudio,
  metadataPending,
  editable,
  audioAlbumDraft,
  audioAuthorDraft,
  audioTrackTitleDraft,
  audioSeriesIdDraft,
  onAudioAlbumDraftChange,
  onAudioAuthorDraftChange,
  onAudioTrackTitleDraftChange,
  onAudioSeriesIdDraftChange,
  onSubmitAudioAlbum,
  onSubmitAudioAuthor,
  onSubmitAudioTrackTitle,
  onSubmitAudioSeriesId,
  onSearchByWorkTitle,
  onSearchByCircle,
  onSearchByAuthor,
}: MetadataMusicEditorProps) {
  if (!focusedAudio && !editable) {
    return (
      <div className="metadata-content metadata-video-content">
        <p className="metadata-empty-tip">当前无可编辑音频</p>
      </div>
    )
  }

  return (
    <div className="metadata-content metadata-video-content">
      <div className="metadata-video-body">
        <div className="metadata-edit-grid metadata-video-grid">
          <label>
            <span>专辑</span>
            {editable ? (
              <input
                disabled={metadataPending}
                value={audioAlbumDraft}
                onChange={(event) => onAudioAlbumDraftChange(event.target.value)}
                onKeyDown={(event) => commitOnEnter(event, onSubmitAudioAlbum)}
              />
            ) : (
              <p
                className="metadata-localized-value is-clickable"
                onClick={() => {
                  const value = normalizeSearchValue(audioAlbumDraft)
                  if (!value) {
                    return
                  }
                  onSearchByCircle(value)
                }}
              >
                {audioAlbumDraft.trim() || '-'}
              </p>
            )}
          </label>

          <label>
            <span>作者</span>
            {editable ? (
              <input
                disabled={metadataPending}
                value={audioAuthorDraft}
                onChange={(event) => onAudioAuthorDraftChange(event.target.value)}
                onKeyDown={(event) => commitOnEnter(event, onSubmitAudioAuthor)}
              />
            ) : (
              <p
                className="metadata-localized-value is-clickable"
                onClick={() => {
                  const value = normalizeSearchValue(audioAuthorDraft)
                  if (!value) {
                    return
                  }
                  onSearchByAuthor(value)
                }}
              >
                {audioAuthorDraft.trim() || '-'}
              </p>
            )}
          </label>

          <label>
            <span>曲名</span>
            {editable ? (
              <input
                disabled={metadataPending}
                value={audioTrackTitleDraft}
                onChange={(event) => onAudioTrackTitleDraftChange(event.target.value)}
                onKeyDown={(event) => commitOnEnter(event, onSubmitAudioTrackTitle)}
              />
            ) : (
              <p
                className="metadata-localized-value is-clickable"
                onClick={() => {
                  const value = normalizeSearchValue(audioTrackTitleDraft)
                  if (!value) {
                    return
                  }
                  onSearchByWorkTitle(value)
                }}
              >
                {audioTrackTitleDraft.trim() || '-'}
              </p>
            )}
          </label>

          {editable ? (
            <label>
              <span>系列ID</span>
              <input
                disabled={metadataPending}
                value={audioSeriesIdDraft}
                onChange={(event) => onAudioSeriesIdDraftChange(event.target.value)}
                onKeyDown={(event) => commitOnEnter(event, onSubmitAudioSeriesId)}
              />
            </label>
          ) : null}
        </div>
      </div>
    </div>
  )
}
