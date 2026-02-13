import type { KeyboardEvent as ReactKeyboardEvent } from 'react'

import type { VideoItem } from '../../types'
import { MetadataRatingGroup } from './MetadataRatingGroup'

interface MetadataVideoEditorProps {
  metadataTab: 'info' | 'playlist'
  focusedVideo: VideoItem | null
  metadataPending: boolean
  editable: boolean
  currentVideoGrade: number | null
  videoWorkTitleDraft: string
  videoSeriesIdDraft: string
  videoCircleDraft: string
  videoAuthorDraft: string
  videoTagsDraft: string
  playlistIds: string[]
  selectedVideoId: string
  dragVideoId: string | null
  videoById: Map<string, VideoItem>
  onMetadataTabChange: (tab: 'info' | 'playlist') => void
  onVideoWorkTitleDraftChange: (value: string) => void
  onVideoSeriesIdDraftChange: (value: string) => void
  onVideoCircleDraftChange: (value: string) => void
  onVideoAuthorDraftChange: (value: string) => void
  onVideoTagsDraftChange: (value: string) => void
  onSubmitVideoWorkTitle: (value: string) => void
  onSubmitVideoSeriesId: (value: string) => void
  onSubmitVideoCircle: (value: string) => void
  onSubmitVideoAuthor: (value: string) => void
  onSubmitVideoTags: (value: string) => void
  onVideoGradeChange: (grade: number | null) => void
  onSearchByWorkTitle: (value: string) => void
  onSearchByCircle: (value: string) => void
  onSearchByAuthor: (value: string) => void
  onSearchByTag: (value: string) => void
  onSelectVideo: (videoId: string) => void
  onRemoveVideoFromPlaylist: (videoId: string) => void
  onDragStart: (videoId: string) => void
  onDropToVideo: (targetVideoId: string) => void
}

export function MetadataVideoEditor({
  metadataTab,
  focusedVideo,
  metadataPending,
  editable,
  currentVideoGrade,
  videoWorkTitleDraft,
  videoSeriesIdDraft,
  videoCircleDraft,
  videoAuthorDraft,
  videoTagsDraft,
  playlistIds,
  selectedVideoId,
  dragVideoId,
  videoById,
  onMetadataTabChange,
  onVideoWorkTitleDraftChange,
  onVideoSeriesIdDraftChange,
  onVideoCircleDraftChange,
  onVideoAuthorDraftChange,
  onVideoTagsDraftChange,
  onSubmitVideoWorkTitle,
  onSubmitVideoSeriesId,
  onSubmitVideoCircle,
  onSubmitVideoAuthor,
  onSubmitVideoTags,
  onVideoGradeChange,
  onSearchByCircle,
  onSearchByAuthor,
  onSearchByTag,
  onSelectVideo,
  onRemoveVideoFromPlaylist,
  onDragStart,
  onDropToVideo,
}: MetadataVideoEditorProps) {
  const readOnlyTags = videoTagsDraft
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter((tag, index, arr) => tag.length > 0 && arr.indexOf(tag) === index)

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
      <div className="meta-tabs">
        <button className={metadataTab === 'info' ? 'is-active' : ''} type="button" onClick={() => onMetadataTabChange('info')}>
          视频信息
        </button>
        <button
          className={metadataTab === 'playlist' ? 'is-active' : ''}
          type="button"
          onClick={() => onMetadataTabChange('playlist')}
        >
          播放列表
        </button>
      </div>

      <div className="metadata-video-body">
        {metadataTab === 'info' && focusedVideo ? (
          <>
            <MetadataRatingGroup
              title="评分"
              groupAriaLabel="视频评分"
              clearAriaLabel="清空视频评分"
              pending={metadataPending || !editable}
              value={currentVideoGrade}
              onChange={onVideoGradeChange}
            />

            <div className="metadata-edit-grid metadata-video-grid">
              <label>
                <span>文件名</span>
                <input readOnly value={focusedVideo.fileName} />
              </label>
              <label>
                <span>作品名</span>
                {editable ? (
                  <input
                    value={videoWorkTitleDraft}
                    onChange={(event) => onVideoWorkTitleDraftChange(event.target.value)}
                    onKeyDown={(event) => {
                      commitOnEnter(event, onSubmitVideoWorkTitle)
                    }}
                  />
                ) : (
                  <input readOnly value={videoWorkTitleDraft.trim() || '-'} />
                )}
              </label>
              <label>
                <span>系列ID</span>
                {editable ? (
                  <input
                    value={videoSeriesIdDraft}
                    onChange={(event) => onVideoSeriesIdDraftChange(event.target.value)}
                    onKeyDown={(event) => {
                      commitOnEnter(event, onSubmitVideoSeriesId)
                    }}
                  />
                ) : (
                  <input readOnly value={videoSeriesIdDraft.trim() || '-'} />
                )}
              </label>
              <label>
                <span>社团</span>
                {editable ? (
                  <input
                    value={videoCircleDraft}
                    onChange={(event) => onVideoCircleDraftChange(event.target.value)}
                    onKeyDown={(event) => {
                      commitOnEnter(event, onSubmitVideoCircle)
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    disabled={videoCircleDraft.trim().length === 0}
                    onClick={() => onSearchByCircle(videoCircleDraft.trim())}
                  >
                    {videoCircleDraft.trim() || '-'}
                  </button>
                )}
              </label>
              <label>
                <span>作者</span>
                {editable ? (
                  <input
                    value={videoAuthorDraft}
                    onChange={(event) => onVideoAuthorDraftChange(event.target.value)}
                    onKeyDown={(event) => {
                      commitOnEnter(event, onSubmitVideoAuthor)
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    disabled={videoAuthorDraft.trim().length === 0}
                    onClick={() => onSearchByAuthor(videoAuthorDraft.trim())}
                  >
                    {videoAuthorDraft.trim() || '-'}
                  </button>
                )}
              </label>
              <label>
                <span>Tags</span>
                {editable ? (
                  <input
                    value={videoTagsDraft}
                    placeholder="多个标签用逗号分隔"
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
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (!dragVideoId || dragVideoId === videoId) {
                      return
                    }
                    onDropToVideo(videoId)
                  }}
                >
                  <button type="button" onClick={() => onSelectVideo(videoId)}>
                    {video.fileName}
                  </button>
                  <button type="button" onClick={() => onRemoveVideoFromPlaylist(videoId)}>
                    删除
                  </button>
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}
