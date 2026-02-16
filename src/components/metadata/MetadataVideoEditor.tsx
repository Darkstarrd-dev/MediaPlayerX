import { useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'

import type { VideoItem } from '../../types'
import { useI18n } from '../../i18n/useI18n'
import { MainUiIcon } from '../MainUiIcon'
import { VideoControlIcon } from '../VideoControlIcon'
import { MetadataRatingGroup } from './MetadataRatingGroup'

interface MetadataVideoEditorProps {
  metadataTab: 'info' | 'playlist'
  focusedVideo: VideoItem | null
  metadataPending: boolean
  editable: boolean
  currentVideoGrade: number | null
  videoWorkTitleDraft: string
  videoWorkTitleJpnDraft: string
  videoSeriesIdDraft: string
  videoCircleDraft: string
  videoCircleJpnDraft: string
  videoAuthorDraft: string
  videoAuthorJpnDraft: string
  videoTagsDraft: string
  playlistIds: string[]
  selectedVideoId: string
  dragVideoId: string | null
  videoById: Map<string, VideoItem>
  onMetadataTabChange: (tab: 'info' | 'playlist') => void
  onVideoWorkTitleDraftChange: (value: string) => void
  onVideoWorkTitleJpnDraftChange: (value: string) => void
  onVideoSeriesIdDraftChange: (value: string) => void
  onVideoCircleDraftChange: (value: string) => void
  onVideoCircleJpnDraftChange: (value: string) => void
  onVideoAuthorDraftChange: (value: string) => void
  onVideoAuthorJpnDraftChange: (value: string) => void
  onVideoTagsDraftChange: (value: string) => void
  onSubmitVideoWorkTitle: (value: string) => void
  onSubmitVideoWorkTitleJpn: (value: string) => void
  onSubmitVideoSeriesId: (value: string) => void
  onSubmitVideoCircle: (value: string) => void
  onSubmitVideoCircleJpn: (value: string) => void
  onSubmitVideoAuthor: (value: string) => void
  onSubmitVideoAuthorJpn: (value: string) => void
  onSubmitVideoTags: (value: string) => void
  onVideoGradeChange: (grade: number | null) => void
  onSearchByWorkTitle: (value: string) => void
  onSearchByCircle: (value: string) => void
  onSearchByAuthor: (value: string) => void
  onSearchByTag: (value: string) => void
  onSelectVideo: (videoId: string) => void
  onSelectVideoAndPlay: (videoId: string) => void
  onRemoveVideoFromPlaylist: (videoId: string) => void
  onDragStart: (videoId: string) => void
  onDropToVideo: (targetVideoId: string, placement: 'before' | 'after') => void
  onDragEnd: () => void
}

function resolveLocalizedValue(preferJpn: boolean, jpnValue: string, enValue: string): string {
  const primary = preferJpn ? jpnValue : enValue
  const fallback = preferJpn ? enValue : jpnValue
  return primary.trim() || fallback.trim() || '-'
}

function resolveLanguageLabel(preferJpn: boolean, jpnValue: string, enValue: string): 'EN' | 'JP' {
  const hasJpn = jpnValue.trim().length > 0
  const hasEn = enValue.trim().length > 0
  if (preferJpn && hasJpn) {
    return 'JP'
  }
  if (!preferJpn && hasEn) {
    return 'EN'
  }
  if (hasJpn) {
    return 'JP'
  }
  return 'EN'
}

function normalizeSearchValue(value: string): string {
  const normalized = value.trim()
  if (!normalized || normalized === '-') {
    return ''
  }
  return normalized
}

export function MetadataVideoEditor({
  metadataTab,
  focusedVideo,
  metadataPending,
  editable,
  currentVideoGrade,
  videoWorkTitleDraft,
  videoWorkTitleJpnDraft,
  videoSeriesIdDraft,
  videoCircleDraft,
  videoCircleJpnDraft,
  videoAuthorDraft,
  videoAuthorJpnDraft,
  videoTagsDraft,
  playlistIds,
  selectedVideoId,
  dragVideoId,
  videoById,
  onMetadataTabChange,
  onVideoWorkTitleDraftChange,
  onVideoWorkTitleJpnDraftChange,
  onVideoSeriesIdDraftChange,
  onVideoCircleDraftChange,
  onVideoCircleJpnDraftChange,
  onVideoAuthorDraftChange,
  onVideoAuthorJpnDraftChange,
  onVideoTagsDraftChange,
  onSubmitVideoWorkTitle,
  onSubmitVideoWorkTitleJpn,
  onSubmitVideoSeriesId,
  onSubmitVideoCircle,
  onSubmitVideoCircleJpn,
  onSubmitVideoAuthor,
  onSubmitVideoAuthorJpn,
  onSubmitVideoTags,
  onVideoGradeChange,
  onSearchByWorkTitle,
  onSearchByCircle,
  onSearchByAuthor,
  onSearchByTag,
  onSelectVideo,
  onSelectVideoAndPlay,
  onRemoveVideoFromPlaylist,
  onDragStart,
  onDropToVideo,
  onDragEnd,
}: MetadataVideoEditorProps) {
  const { t } = useI18n()
  const readOnlyTags = videoTagsDraft
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter((tag, index, arr) => tag.length > 0 && arr.indexOf(tag) === index)
  const [preferWorkTitleJpn, setPreferWorkTitleJpn] = useState(true)
  const [preferCircleJpn, setPreferCircleJpn] = useState(true)
  const [preferAuthorJpn, setPreferAuthorJpn] = useState(true)

  useEffect(() => {
    setPreferWorkTitleJpn(true)
    setPreferCircleJpn(true)
    setPreferAuthorJpn(true)
  }, [focusedVideo?.id])

  const resolvedWorkTitle = useMemo(
    () => resolveLocalizedValue(preferWorkTitleJpn, videoWorkTitleJpnDraft, videoWorkTitleDraft),
    [preferWorkTitleJpn, videoWorkTitleDraft, videoWorkTitleJpnDraft],
  )
  const resolvedCircle = useMemo(
    () => resolveLocalizedValue(preferCircleJpn, videoCircleJpnDraft, videoCircleDraft),
    [preferCircleJpn, videoCircleDraft, videoCircleJpnDraft],
  )
  const resolvedAuthor = useMemo(
    () => resolveLocalizedValue(preferAuthorJpn, videoAuthorJpnDraft, videoAuthorDraft),
    [preferAuthorJpn, videoAuthorDraft, videoAuthorJpnDraft],
  )

  const hasDualWorkTitle = videoWorkTitleDraft.trim().length > 0 && videoWorkTitleJpnDraft.trim().length > 0
  const hasDualCircle = videoCircleDraft.trim().length > 0 && videoCircleJpnDraft.trim().length > 0
  const hasDualAuthor = videoAuthorDraft.trim().length > 0 && videoAuthorJpnDraft.trim().length > 0

  const workTitleToggleLabel = resolveLanguageLabel(preferWorkTitleJpn, videoWorkTitleJpnDraft, videoWorkTitleDraft)
  const circleToggleLabel = resolveLanguageLabel(preferCircleJpn, videoCircleJpnDraft, videoCircleDraft)
  const authorToggleLabel = resolveLanguageLabel(preferAuthorJpn, videoAuthorJpnDraft, videoAuthorDraft)

  const commitOnEnter = (
    event: ReactKeyboardEvent<HTMLInputElement>,
    onCommit: (value: string) => void,
  ) => {
    if (event.key !== 'Enter') {
      return
    }
    event.preventDefault()
    onCommit(event.currentTarget.value)
  }

  return (
    <div className="metadata-content metadata-video-content">
      <div className="meta-tabs" role="group" aria-label={`${t('ui.metadata.videoInfoTab')} / ${t('ui.metadata.playlistTab')}`}>
        <button
          className={`main-icon-square-btn ${metadataTab === 'playlist' ? 'is-active' : ''}`}
          type="button"
          aria-label={metadataTab === 'info' ? t('ui.metadata.playlistTab') : t('ui.metadata.videoInfoTab')}
          aria-pressed={metadataTab === 'playlist'}
          title={metadataTab === 'info' ? t('ui.metadata.playlistTab') : t('ui.metadata.videoInfoTab')}
          onClick={() => onMetadataTabChange(metadataTab === 'info' ? 'playlist' : 'info')}
        >
          {metadataTab === 'info' ? <MainUiIcon name="videoInfo" /> : <VideoControlIcon className="main-ui-icon" name="playlist" />}
        </button>
      </div>

      <div className="metadata-video-body">
        {metadataTab === 'info' && focusedVideo ? (
          <>
            <MetadataRatingGroup
              title={t('tip.common.rating')}
              groupAriaLabel={t('a11y.metadata.videoRating')}
              clearAriaLabel={t('a11y.metadata.clearVideoRating')}
              pending={metadataPending || !editable}
              value={currentVideoGrade}
              onChange={onVideoGradeChange}
            />

            <div className="metadata-edit-grid metadata-video-grid">
              <label>
                <span>{t('ui.metadata.fileName')}</span>
                <input readOnly value={focusedVideo.fileName} />
              </label>
              <label>
                <span>{editable ? t('ui.metadata.japaneseTitle') : t('ui.metadata.workTitle')}</span>
                {editable ? (
                  <input
                    value={videoWorkTitleJpnDraft}
                    onChange={(event) => onVideoWorkTitleJpnDraftChange(event.target.value)}
                    onKeyDown={(event) => {
                      commitOnEnter(event, onSubmitVideoWorkTitleJpn)
                    }}
                  />
                ) : (
                  <div className="metadata-localized-field">
                    <p
                      className="metadata-localized-value is-clickable"
                      onClick={() => {
                        const value = normalizeSearchValue(resolvedWorkTitle)
                        if (!value) {
                          return
                        }
                        onSearchByWorkTitle(value)
                      }}
                    >
                      {resolvedWorkTitle}
                    </p>
                    <button
                      type="button"
                      className="metadata-lang-toggle-btn"
                      onClick={() => {
                        if (!hasDualWorkTitle) {
                          return
                        }
                        setPreferWorkTitleJpn((value) => !value)
                      }}
                    >
                      {workTitleToggleLabel}
                    </button>
                  </div>
                )}
              </label>
              {editable ? (
                <label>
                  <span>{t('ui.metadata.englishTitle')}</span>
                  <input
                    value={videoWorkTitleDraft}
                    onChange={(event) => onVideoWorkTitleDraftChange(event.target.value)}
                    onKeyDown={(event) => {
                      commitOnEnter(event, onSubmitVideoWorkTitle)
                    }}
                  />
                </label>
              ) : null}
              {editable ? (
                <label>
                  <span>{t('ui.metadata.seriesId')}</span>
                  <input
                    value={videoSeriesIdDraft}
                    onChange={(event) => onVideoSeriesIdDraftChange(event.target.value)}
                    onKeyDown={(event) => {
                      commitOnEnter(event, onSubmitVideoSeriesId)
                    }}
                  />
                </label>
              ) : null}
              <label>
                <span>{editable ? t('ui.metadata.japaneseCircle') : t('ui.metadata.circle')}</span>
                {editable ? (
                  <input
                    value={videoCircleJpnDraft}
                    onChange={(event) => onVideoCircleJpnDraftChange(event.target.value)}
                    onKeyDown={(event) => {
                      commitOnEnter(event, onSubmitVideoCircleJpn)
                    }}
                  />
                ) : (
                  <div className="metadata-localized-field">
                    <p
                      className="metadata-localized-value is-clickable"
                      onClick={() => {
                        const value = normalizeSearchValue(resolvedCircle)
                        if (!value) {
                          return
                        }
                        onSearchByCircle(value)
                      }}
                    >
                      {resolvedCircle}
                    </p>
                    <button
                      type="button"
                      className="metadata-lang-toggle-btn"
                      onClick={() => {
                        if (!hasDualCircle) {
                          return
                        }
                        setPreferCircleJpn((value) => !value)
                      }}
                    >
                      {circleToggleLabel}
                    </button>
                  </div>
                )}
              </label>
              {editable ? (
                <label>
                  <span>{t('ui.metadata.englishCircle')}</span>
                  <input
                    value={videoCircleDraft}
                    onChange={(event) => onVideoCircleDraftChange(event.target.value)}
                    onKeyDown={(event) => {
                      commitOnEnter(event, onSubmitVideoCircle)
                    }}
                  />
                </label>
              ) : null}
              <label>
                <span>{editable ? t('ui.metadata.japaneseAuthor') : t('ui.metadata.author')}</span>
                {editable ? (
                  <input
                    value={videoAuthorJpnDraft}
                    onChange={(event) => onVideoAuthorJpnDraftChange(event.target.value)}
                    onKeyDown={(event) => {
                      commitOnEnter(event, onSubmitVideoAuthorJpn)
                    }}
                  />
                ) : (
                  <div className="metadata-localized-field">
                    <p
                      className="metadata-localized-value is-clickable"
                      onClick={() => {
                        const value = normalizeSearchValue(resolvedAuthor)
                        if (!value) {
                          return
                        }
                        onSearchByAuthor(value)
                      }}
                    >
                      {resolvedAuthor}
                    </p>
                    <button
                      type="button"
                      className="metadata-lang-toggle-btn"
                      onClick={() => {
                        if (!hasDualAuthor) {
                          return
                        }
                        setPreferAuthorJpn((value) => !value)
                      }}
                    >
                      {authorToggleLabel}
                    </button>
                  </div>
                )}
              </label>
              {editable ? (
                <label>
                  <span>{t('ui.metadata.englishAuthor')}</span>
                  <input
                    value={videoAuthorDraft}
                    onChange={(event) => onVideoAuthorDraftChange(event.target.value)}
                    onKeyDown={(event) => {
                      commitOnEnter(event, onSubmitVideoAuthor)
                    }}
                  />
                </label>
              ) : null}
              <label>
                <span>{t('ui.metadata.tags')}</span>
                {editable ? (
                  <input
                    value={videoTagsDraft}
                    placeholder={t('ui.metadata.tagsPlaceholder')}
                    onChange={(event) => onVideoTagsDraftChange(event.target.value)}
                    onKeyDown={(event) => {
                      commitOnEnter(event, onSubmitVideoTags)
                    }}
                  />
                ) : (
                  <div className="metadata-tag-chip-list">
                    {readOnlyTags.length > 0
                      ? readOnlyTags.map((tag) => (
                          <button key={tag} type="button" onClick={() => onSearchByTag(tag)}>
                            {tag}
                          </button>
                        ))
                      : '-'}
                  </div>
                )}
              </label>
            </div>
          </>
        ) : null}

      </div>

      {metadataTab === 'playlist' ? (
        <div className="playlist-list">
          {playlistIds.map((videoId) => {
            const video = videoById.get(videoId)
            if (!video) {
              return null
            }

            return (
              <div
                key={videoId}
                className={`playlist-item ${selectedVideoId === videoId ? 'is-active' : ''}`}
                draggable
                onDragStart={() => onDragStart(videoId)}
                onDragEnd={onDragEnd}
                onDragOver={(event) => {
                  event.preventDefault()
                  if (!dragVideoId || dragVideoId === videoId) {
                    return
                  }
                  const bounds = event.currentTarget.getBoundingClientRect()
                  const placement = event.clientY - bounds.top > bounds.height / 2 ? 'after' : 'before'
                  onDropToVideo(videoId, placement)
                }}
                onDrop={() => {
                  onDragEnd()
                }}
              >
                <button type="button" onClick={() => onSelectVideo(videoId)} onDoubleClick={() => onSelectVideoAndPlay(videoId)}>
                  {video.fileName}
                </button>
                <button
                  type="button"
                  className="playlist-item-remove main-icon-square-btn"
                  aria-label={t('a11y.common.delete')}
                  title={t('tip.common.delete')}
                  onClick={() => onRemoveVideoFromPlaylist(videoId)}
                >
                  <MainUiIcon name="delete" />
                </button>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
