import type { KeyboardEvent as ReactKeyboardEvent } from 'react'

import { useI18n } from '../../i18n/useI18n'
import type { AudioItem } from '../../types'

interface MetadataMusicEditorProps {
  focusedAudio: AudioItem | null
  audioPlaylistIds: string[]
  selectedAudioId: string
  audioById: Map<string, AudioItem>
  musicBookletAlbumRootPath: string
  musicBookletCandidates: Array<{ sourceId: string; label: string; imageCount: number }>
  musicCoverBindingValue: string
  musicBookletBindingValue: string
  canOpenMusicCover: boolean
  canOpenMusicBooklet: boolean
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
  onSelectAudio: (audioId: string) => void
  onSelectAudioAndPlay: (audioId: string) => void
  onMusicCoverBindingChange: (value: string) => void
  onMusicBookletBindingChange: (value: string) => void
  onOpenMusicCover: () => void
  onOpenMusicBooklet: () => void
  onResetMusicBookletBinding: () => void
}

const MUSIC_BOOKLET_AUTO_VALUE = '__auto__'
const MUSIC_BOOKLET_NONE_VALUE = '__none__'

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
  audioPlaylistIds,
  selectedAudioId,
  audioById,
  musicBookletAlbumRootPath,
  musicBookletCandidates,
  musicCoverBindingValue,
  musicBookletBindingValue,
  canOpenMusicCover,
  canOpenMusicBooklet,
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
  onSelectAudio,
  onSelectAudioAndPlay,
  onMusicCoverBindingChange,
  onMusicBookletBindingChange,
  onOpenMusicCover,
  onOpenMusicBooklet,
  onResetMusicBookletBinding,
}: MetadataMusicEditorProps) {
  const { t } = useI18n()
  const playlistIds = audioPlaylistIds.filter((audioId) => audioById.has(audioId))
  const effectivePlaylistIds = playlistIds.length > 0 ? playlistIds : Array.from(audioById.keys())

  if (!focusedAudio && !editable) {
    return (
      <div className="metadata-content metadata-video-content metadata-music-content">
        <p className="metadata-empty-tip">当前无可编辑音频</p>
      </div>
    )
  }

  return (
    <div className="metadata-content metadata-video-content metadata-music-content">
      <div className="metadata-video-body metadata-music-body">
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

      {editable ? (
        <div className="metadata-music-booklet-bindings">
          <div className="metadata-music-booklet-bindings-head">
            <strong>Booklet 绑定</strong>
            <span title={musicBookletAlbumRootPath}>{musicBookletAlbumRootPath || '-'}</span>
          </div>

          <div className="metadata-music-booklet-bindings-grid">
            <label>
              <span>封面来源</span>
              <select
                disabled={metadataPending || musicBookletCandidates.length === 0}
                value={musicCoverBindingValue}
                onChange={(event) => onMusicCoverBindingChange(event.target.value)}
              >
                <option value={MUSIC_BOOKLET_AUTO_VALUE}>自动</option>
                <option value={MUSIC_BOOKLET_NONE_VALUE}>无</option>
                {musicBookletCandidates.map((candidate) => (
                  <option key={candidate.sourceId} value={candidate.sourceId}>
                    {`${candidate.label} (${candidate.imageCount})`}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Booklet 来源</span>
              <select
                disabled={metadataPending || musicBookletCandidates.length === 0}
                value={musicBookletBindingValue}
                onChange={(event) => onMusicBookletBindingChange(event.target.value)}
              >
                <option value={MUSIC_BOOKLET_AUTO_VALUE}>自动</option>
                <option value={MUSIC_BOOKLET_NONE_VALUE}>无</option>
                {musicBookletCandidates.map((candidate) => (
                  <option key={candidate.sourceId} value={candidate.sourceId}>
                    {`${candidate.label} (${candidate.imageCount})`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="metadata-music-booklet-bindings-actions">
            <button disabled={!canOpenMusicCover} type="button" onClick={onOpenMusicCover}>
              打开封面
            </button>
            <button disabled={!canOpenMusicBooklet} type="button" onClick={onOpenMusicBooklet}>
              打开Booklet
            </button>
            <button
              disabled={metadataPending || !musicBookletAlbumRootPath}
              type="button"
              onClick={onResetMusicBookletBinding}
            >
              重置自动
            </button>
          </div>
        </div>
      ) : (
        <div className="metadata-music-booklet-bindings-actions">
          <button disabled={!canOpenMusicCover} type="button" onClick={onOpenMusicCover}>
            打开封面
          </button>
          <button disabled={!canOpenMusicBooklet} type="button" onClick={onOpenMusicBooklet}>
            打开Booklet
          </button>
        </div>
      )}

      <div className="metadata-music-playlist" aria-label={t('a11y.music.playlist')}>
        {effectivePlaylistIds.length > 0 ? (
          effectivePlaylistIds.map((audioId, index) => {
            const audio = audioById.get(audioId)
            if (!audio) {
              return null
            }

            return (
              <button
                key={audioId}
                className={`metadata-music-playlist-item ${selectedAudioId === audioId ? 'is-active' : ''}`}
                type="button"
                onClick={() => onSelectAudio(audioId)}
                onDoubleClick={() => onSelectAudioAndPlay(audioId)}
              >
                <span className="metadata-music-playlist-index">{index + 1}</span>
                <span className="metadata-music-playlist-title" title={audio.fileName}>
                  {audio.fileName}
                </span>
              </button>
            )
          })
        ) : (
          <p className="metadata-empty-tip">当前无播放条目</p>
        )}
      </div>
    </div>
  )
}
