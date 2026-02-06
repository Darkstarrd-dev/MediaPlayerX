import type { BrowserMode, ImagePackage, VideoItem } from '../types'
import { formatSeconds } from '../utils/ui'

interface MetadataPanelProps {
  mode: BrowserMode
  metadataCollapsed: boolean
  metadataRatio: number
  focusedImagePackage: ImagePackage | null
  currentGrade: number | null
  focusedVideo: VideoItem | null
  metadataTab: 'info' | 'playlist'
  playlistIds: string[]
  selectedVideoId: string
  dragVideoId: string | null
  videoVolume: number
  videoRate: number
  videoById: Map<string, VideoItem>
  onCollapse: () => void
  onExpand: () => void
  onMetadataTabChange: (tab: 'info' | 'playlist') => void
  onSelectVideo: (videoId: string) => void
  onRemoveVideoFromPlaylist: (videoId: string) => void
  onDragStart: (videoId: string) => void
  onDropToVideo: (targetVideoId: string) => void
}

function MetadataPanel({
  mode,
  metadataCollapsed,
  metadataRatio,
  focusedImagePackage,
  currentGrade,
  focusedVideo,
  metadataTab,
  playlistIds,
  selectedVideoId,
  dragVideoId,
  videoVolume,
  videoRate,
  videoById,
  onCollapse,
  onExpand,
  onMetadataTabChange,
  onSelectVideo,
  onRemoveVideoFromPlaylist,
  onDragStart,
  onDropToVideo,
}: MetadataPanelProps) {
  if (metadataCollapsed) {
    return (
      <button className="meta-restore" type="button" onClick={onExpand}>
        展开元数据面板
      </button>
    )
  }

  return (
    <aside className="metadata-panel" style={{ width: `${metadataRatio * 100}%` }}>
      <div className="metadata-head">
        <strong>元数据面板</strong>
        <button type="button" onClick={onCollapse}>
          折叠
        </button>
      </div>

      {mode === 'image' ? (
        <div className="metadata-content">
          <p>{`图包：${focusedImagePackage?.displayName ?? '-'}`}</p>
          <p>{`作品名：${focusedImagePackage?.workTitle ?? '-'}`}</p>
          <p>{`社团：${focusedImagePackage?.circle ?? '-'}`}</p>
          <p>{`作者：${focusedImagePackage?.author ?? '-'}`}</p>
          <p>{`Tags：${focusedImagePackage?.tags.join(', ') ?? '-'}`}</p>
          <p>{`评分：${currentGrade === null ? '未评分' : currentGrade}`}</p>
        </div>
      ) : (
        <div className="metadata-content">
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

          {metadataTab === 'info' && focusedVideo ? (
            <>
              <p>{`文件：${focusedVideo.fileName}`}</p>
              <p>{`时长：${formatSeconds(focusedVideo.durationSec)}`}</p>
              <p>{`分辨率：${focusedVideo.width}x${focusedVideo.height}`}</p>
              <p>{`音量：${videoVolume}%`}</p>
              <p>{`倍速：${videoRate.toFixed(2)}x`}</p>
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
      )}
    </aside>
  )
}

export default MetadataPanel
