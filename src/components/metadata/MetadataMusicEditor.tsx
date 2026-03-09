import type { KeyboardEvent as ReactKeyboardEvent } from 'react'

import { MainUiIcon } from '../MainUiIcon'
import { MetadataPlaylistItem } from './MetadataPlaylistItem'
import { useI18n } from '../../i18n/useI18n'
import type { AudioItem } from '../../types'
import { dispatchMusicPlaybackControl } from '../../features/media/musicPlaybackBridge'

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
        <p className="metadata-empty-tip">{t('ui.metadata.noEditableAudio')}</p>
      </div>
    )
  }

  return (
    <div className="metadata-content metadata-video-content metadata-music-content">
      <div className="metadata-video-body metadata-music-body">
        <div className="metadata-edit-grid metadata-video-grid mpx-scroll-area">
          <label>
            <span>{t('ui.metadata.album')}</span>
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
            <span>{t('ui.metadata.author')}</span>
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
            <span>{t('ui.metadata.trackTitle')}</span>
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
              <span>{t('ui.metadata.seriesId')}</span>
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
        <div className="metadata-music-booklet-bindings" data-slot="fg-meta-main-music-editor-booklet-binding-panel">
          <div className="metadata-music-booklet-bindings-head">
            <strong>{t('ui.metadata.bookletBinding')}</strong>
            <span data-tooltip-label={musicBookletAlbumRootPath}>{musicBookletAlbumRootPath || '-'}</span>
          </div>

          <div className="metadata-music-booklet-bindings-grid">
            <label>
              <span>{t('ui.metadata.coverSource')}</span>
              <select
                disabled={metadataPending || musicBookletCandidates.length === 0}
                value={musicCoverBindingValue}
                onChange={(event) => onMusicCoverBindingChange(event.target.value)}
              >
                <option value={MUSIC_BOOKLET_AUTO_VALUE}>{t('ui.metadata.auto')}</option>
                <option value={MUSIC_BOOKLET_NONE_VALUE}>{t('ui.metadata.none')}</option>
                {musicBookletCandidates.map((candidate) => (
                  <option key={candidate.sourceId} value={candidate.sourceId}>
                    {`${candidate.label} (${candidate.imageCount})`}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>{t('ui.metadata.bookletSource')}</span>
              <select
                disabled={metadataPending || musicBookletCandidates.length === 0}
                value={musicBookletBindingValue}
                onChange={(event) => onMusicBookletBindingChange(event.target.value)}
              >
                <option value={MUSIC_BOOKLET_AUTO_VALUE}>{t('ui.metadata.auto')}</option>
                <option value={MUSIC_BOOKLET_NONE_VALUE}>{t('ui.metadata.none')}</option>
                {musicBookletCandidates.map((candidate) => (
                  <option key={candidate.sourceId} value={candidate.sourceId}>
                    {`${candidate.label} (${candidate.imageCount})`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="metadata-music-booklet-bindings-actions main-header-actions">
            <button
              className="toolbar-icon-btn main-icon-square-btn"
              disabled={!canOpenMusicCover}
              type="button"
              aria-label={t('ui.metadata.openCover')}
              data-tooltip-label={t('ui.metadata.openCover')}
              onClick={onOpenMusicCover}
            >
              <MainUiIcon name="cover" />
            </button>
            <button
              className="toolbar-icon-btn main-icon-square-btn"
              disabled={!canOpenMusicBooklet}
              type="button"
              aria-label={t('ui.metadata.openBooklet')}
              data-tooltip-label={t('ui.metadata.openBooklet')}
              onClick={onOpenMusicBooklet}
            >
              <MainUiIcon name="booklet" />
            </button>
            <button
              className="toolbar-icon-btn main-icon-square-btn"
              disabled={metadataPending || !musicBookletAlbumRootPath}
              type="button"
              aria-label={t('a11y.common.restoreDefault')}
              data-tooltip-label={t('tip.common.restoreDefault')}
              onClick={onResetMusicBookletBinding}
            >
              <MainUiIcon name="return" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="metadata-music-playlist mpx-scroll-area" aria-label={t('a11y.music.playlist')}>
        {effectivePlaylistIds.length > 0 ? (
          effectivePlaylistIds.map((audioId, index) => {
            const audio = audioById.get(audioId)
            if (!audio) {
              return null
            }

            return (
              <div
                key={audioId}
                className={`metadata-playlist-row name-list-row ${selectedAudioId === audioId ? 'is-selected is-focused' : ''}`}
              >
                <MetadataPlaylistItem
                  mediaId={audioId}
                  title={audio.fileName}
                  index={index + 1}
                  durationSec={audio.durationSec}
                  active={selectedAudioId === audioId}
                  onSelect={onSelectAudio}
                  onSelectAndPlay={onSelectAudioAndPlay}
                  onTogglePlayPause={(targetAudioId) => {
                    if (selectedAudioId === targetAudioId) {
                      dispatchMusicPlaybackControl('toggle-playback')
                      return
                    }
                    onSelectAudioAndPlay(targetAudioId)
                  }}
                />
              </div>
            )
          })
        ) : (
          <p className="metadata-empty-tip">{t('ui.metadata.noPlaylistEntries')}</p>
        )}
      </div>
    </div>
  )
}
