import type { VideoItem } from '../../types'
import { formatSeconds } from '../../utils/ui'
import { MetadataRatingGroup } from './MetadataRatingGroup'

interface MetadataVideoEditorProps {
  metadataTab: 'info' | 'playlist'
  focusedVideo: VideoItem | null
  metadataPending: boolean
  currentVideoGrade: number | null
  videoWorkTitleDraft: string
  videoCircleDraft: string
  videoAuthorDraft: string
  videoTagsDraft: string
  playlistIds: string[]
  selectedVideoId: string
  dragVideoId: string | null
  videoById: Map<string, VideoItem>
  videoVolume: number
  videoMuted: boolean
  videoRate: number
  onMetadataTabChange: (tab: 'info' | 'playlist') => void
  onVideoWorkTitleDraftChange: (value: string) => void
  onVideoCircleDraftChange: (value: string) => void
  onVideoAuthorDraftChange: (value: string) => void
  onVideoTagsDraftChange: (value: string) => void
  onPersistVideoMetadata: (syncFileNameToWorkTitle?: boolean, grade?: number | null) => void
  onSelectVideo: (videoId: string) => void
  onRemoveVideoFromPlaylist: (videoId: string) => void
  onDragStart: (videoId: string) => void
  onDropToVideo: (targetVideoId: string) => void
}

export function MetadataVideoEditor({
  metadataTab,
  focusedVideo,
  metadataPending,
  currentVideoGrade,
  videoWorkTitleDraft,
  videoCircleDraft,
  videoAuthorDraft,
  videoTagsDraft,
  playlistIds,
  selectedVideoId,
  dragVideoId,
  videoById,
  videoVolume,
  videoMuted,
  videoRate,
  onMetadataTabChange,
  onVideoWorkTitleDraftChange,
  onVideoCircleDraftChange,
  onVideoAuthorDraftChange,
  onVideoTagsDraftChange,
  onPersistVideoMetadata,
  onSelectVideo,
  onRemoveVideoFromPlaylist,
  onDragStart,
  onDropToVideo,
}: MetadataVideoEditorProps) {
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
              pending={metadataPending}
              value={currentVideoGrade}
              onChange={(grade) => {
                onPersistVideoMetadata(false, grade)
              }}
            />

            <div className="metadata-edit-grid metadata-video-grid">
              <label>
                <span>文件名</span>
                <input readOnly value={focusedVideo.fileName} />
              </label>
              <label>
                <span>作品名</span>
                <input
                  value={videoWorkTitleDraft}
                  onChange={(event) => onVideoWorkTitleDraftChange(event.target.value)}
                  onBlur={() => {
                    onPersistVideoMetadata(false)
                  }}
                />
              </label>
              <label>
                <span>社团</span>
                <input
                  value={videoCircleDraft}
                  onChange={(event) => onVideoCircleDraftChange(event.target.value)}
                  onBlur={() => {
                    onPersistVideoMetadata(false)
                  }}
                />
              </label>
              <label>
                <span>作者</span>
                <input
                  value={videoAuthorDraft}
                  onChange={(event) => onVideoAuthorDraftChange(event.target.value)}
                  onBlur={() => {
                    onPersistVideoMetadata(false)
                  }}
                />
              </label>
              <label>
                <span>Tags</span>
                <input
                  value={videoTagsDraft}
                  placeholder="多个标签用逗号分隔"
                  onChange={(event) => onVideoTagsDraftChange(event.target.value)}
                  onBlur={() => {
                    onPersistVideoMetadata(false)
                  }}
                />
              </label>
            </div>

            <div className="metadata-edit-actions">
              <button
                type="button"
                disabled={metadataPending}
                onClick={() => {
                  onPersistVideoMetadata(false)
                }}
              >
                保存
              </button>
              <button
                type="button"
                disabled={metadataPending}
                onClick={() => {
                  onPersistVideoMetadata(true)
                }}
              >
                同步文件名到作品名
              </button>
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

      {focusedVideo ? (
        <div className="metadata-video-stats">
          <span>{`时长 ${formatSeconds(focusedVideo.durationSec)}`}</span>
          <span>{`分辨率 ${focusedVideo.width}x${focusedVideo.height}`}</span>
          <span>{`音量 ${videoMuted ? '静音' : `${videoVolume}%`}`}</span>
          <span>{`倍速 ${videoRate.toFixed(2)}x`}</span>
        </div>
      ) : null}
    </div>
  )
}
