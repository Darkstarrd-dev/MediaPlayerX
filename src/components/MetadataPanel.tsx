import { useEffect, useRef, useState } from 'react'

import type { BrowserMode, ImageItem, ImagePackage, VideoItem } from '../types'
import { formatSeconds } from '../utils/ui'
import { mediaLocatorFileName } from '../features/backend'

const IS_TEST_MODE = import.meta.env.MODE === 'test'

interface MetadataPanelProps {
  mode: BrowserMode
  metadataCollapsed: boolean
  metadataRatio: number
  hasImageFocus: boolean
  focusedImage: ImageItem | null
  focusedImageSrc: string | null
  focusedImagePackage: ImagePackage | null
  currentGrade: number | null
  focusedVideo: VideoItem | null
  metadataTab: 'info' | 'playlist'
  playlistIds: string[]
  selectedVideoId: string
  dragVideoId: string | null
  videoVolume: number
  videoMuted: boolean
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
  hasImageFocus,
  focusedImage,
  focusedImageSrc,
  focusedImagePackage,
  currentGrade,
  focusedVideo,
  metadataTab,
  playlistIds,
  selectedVideoId,
  dragVideoId,
  videoVolume,
  videoMuted,
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
  const [displayedImageSrc, setDisplayedImageSrc] = useState<string | null>(null)
  const imagePreloadSeqRef = useRef(0)

  useEffect(() => {
    if (IS_TEST_MODE) {
      if (displayedImageSrc !== focusedImageSrc) {
        setDisplayedImageSrc(focusedImageSrc)
      }
      return
    }

    imagePreloadSeqRef.current += 1
    const sequence = imagePreloadSeqRef.current

    if (!focusedImageSrc) {
      setDisplayedImageSrc(null)
      return
    }

    if (focusedImageSrc === displayedImageSrc) {
      return
    }

    let cancelled = false
    const preview = new Image()
    preview.decoding = 'async'
    preview.src = focusedImageSrc

    const commit = () => {
      if (cancelled || imagePreloadSeqRef.current !== sequence) {
        return
      }
      setDisplayedImageSrc(focusedImageSrc)
    }

    if (typeof preview.decode === 'function') {
      void preview
        .decode()
        .then(() => {
          commit()
        })
        .catch(() => {
          if (preview.complete && preview.naturalWidth > 0 && preview.naturalHeight > 0) {
            commit()
          }
        })
    } else {
      preview.onload = () => {
        commit()
      }
      preview.onerror = () => undefined
    }

    return () => {
      cancelled = true
    }
  }, [displayedImageSrc, focusedImageSrc])

  const imagePreviewSizing = (() => {
    if (!focusedImage) {
      return {}
    }

    if (focusedImage.width >= focusedImage.height) {
      return { width: '100%' }
    }

    return { height: '100%' }
  })()

  const imagePreviewClassName = hasImageFocus && focusedImage ? 'metadata-content metadata-content-focus' : 'metadata-content'
  const metadataPanelClassName = hasImageFocus && focusedImage ? 'metadata-panel is-image-focus' : 'metadata-panel'

  if (metadataCollapsed) {
    return (
      <button aria-label="展开元数据面板" className="meta-restore" type="button" onClick={onExpand}>
        <span className="meta-restore-tip">展开元数据面板</span>
      </button>
    )
  }

  return (
    <aside className={metadataPanelClassName} style={{ width: `${metadataRatio * 100}%` }}>
      <div className="metadata-head">
        <button className="metadata-title-btn" type="button" onClick={onCollapse}>
          元数据面板
        </button>
      </div>

      {mode === 'image' ? (
        <div className={imagePreviewClassName}>
          {hasImageFocus && focusedImage ? (
            <>
              <div className="metadata-image-canvas">
                {displayedImageSrc ? (
                  <img
                    className="metadata-image-real"
                    src={displayedImageSrc}
                    alt={`${focusedImagePackage?.displayName ?? '图片'} #${focusedImage.ordinal}`}
                    draggable={false}
                  />
                ) : (
                  <div
                    className="metadata-image-media"
                    style={{
                      background: focusedImage.color,
                      aspectRatio: `${focusedImage.width} / ${focusedImage.height}`,
                      ...imagePreviewSizing,
                    }}
                  >
                    <span>{`${focusedImage.width > 0 && focusedImage.height > 0 ? `${focusedImage.width} x ${focusedImage.height}` : '-'}`}</span>
                  </div>
                )}
              </div>
              <div className="metadata-image-caption">
                <strong>{`${focusedImagePackage?.displayName ?? '图片'} #${focusedImage.ordinal}`}</strong>
                <span>{mediaLocatorFileName(focusedImage.mediaLocator)}</span>
              </div>
            </>
          ) : (
            <>
              <p>{`图包：${focusedImagePackage?.displayName ?? '-'}`}</p>
              <p>{`作品名：${focusedImagePackage?.workTitle ?? '-'}`}</p>
              <p>{`社团：${focusedImagePackage?.circle ?? '-'}`}</p>
              <p>{`作者：${focusedImagePackage?.author ?? '-'}`}</p>
              <p>{`Tags：${focusedImagePackage?.tags.join(', ') ?? '-'}`}</p>
              <p>{`图包评分：${currentGrade === null ? '未评分' : currentGrade}`}</p>
            </>
          )}
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
              <p>{`音量：${videoMuted ? '静音' : `${videoVolume}%`}`}</p>
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
