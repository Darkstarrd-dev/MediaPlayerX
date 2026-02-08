import { useEffect, useRef, useState } from 'react'

import type { BrowserMode, ImageItem, ImagePackage, VideoItem } from '../types'
import { formatSeconds } from '../utils/ui'
import { mediaLocatorFileName } from '../features/backend'

const IS_TEST_MODE = import.meta.env.MODE === 'test'

export interface MetadataPanelProps {
  mode: BrowserMode
  metadataCollapsed: boolean
  metadataRatio: number
  hasImageFocus: boolean
  focusedImage: ImageItem | null
  focusedImageSrc: string | null
  focusedImagePackage: ImagePackage | null
  currentGrade: number | null
  currentVideoGrade: number | null
  metadataPending: boolean
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
  onGradeChange: (grade: number | null) => void
  onSavePackageMetadata: (payload: {
    workTitle: string
    circle: string
    author: string
    tags: string[]
    syncWorkTitleToPackageName?: boolean
  }) => void
  onSaveVideoMetadata: (payload: {
    workTitle: string
    circle: string
    author: string
    tags: string[]
    grade?: number | null
    syncFileNameToWorkTitle?: boolean
  }) => void
  onMetadataTabChange: (tab: 'info' | 'playlist') => void
  onSelectVideo: (videoId: string) => void
  onRemoveVideoFromPlaylist: (videoId: string) => void
  onDragStart: (videoId: string) => void
  onDropToVideo: (targetVideoId: string) => void
}

function parseTagsInput(value: string): string[] {
  const next = new Set<string>()
  for (const item of value.split(/[\n,，]/)) {
    const normalized = item.trim()
    if (normalized.length > 0) {
      next.add(normalized)
    }
  }
  return Array.from(next)
}

function resolveRatingByClientX(clientX: number, element: HTMLElement): number {
  const rect = element.getBoundingClientRect()
  if (rect.width <= 0) {
    return 1
  }
  const relativeX = Math.max(0, Math.min(rect.width, clientX - rect.left))
  const ratio = relativeX / rect.width
  const rating = Math.floor(ratio * 5) + 1
  return Math.max(1, Math.min(5, rating))
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
  currentVideoGrade,
  metadataPending,
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
  onGradeChange,
  onSavePackageMetadata,
  onSaveVideoMetadata,
  onMetadataTabChange,
  onSelectVideo,
  onRemoveVideoFromPlaylist,
  onDragStart,
  onDropToVideo,
}: MetadataPanelProps) {
  const [displayedImageSrc, setDisplayedImageSrc] = useState<string | null>(null)
  const [showImagePreview, setShowImagePreview] = useState(true)
  const [ratingDragging, setRatingDragging] = useState(false)
  const [videoRatingDragging, setVideoRatingDragging] = useState(false)
  const [workTitleDraft, setWorkTitleDraft] = useState('')
  const [circleDraft, setCircleDraft] = useState('')
  const [authorDraft, setAuthorDraft] = useState('')
  const [tagsDraft, setTagsDraft] = useState('')
  const [videoWorkTitleDraft, setVideoWorkTitleDraft] = useState('')
  const [videoCircleDraft, setVideoCircleDraft] = useState('')
  const [videoAuthorDraft, setVideoAuthorDraft] = useState('')
  const [videoTagsDraft, setVideoTagsDraft] = useState('')
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

  useEffect(() => {
    setWorkTitleDraft(focusedImagePackage?.workTitle ?? '')
    setCircleDraft(focusedImagePackage?.circle ?? '')
    setAuthorDraft(focusedImagePackage?.author ?? '')
    setTagsDraft((focusedImagePackage?.tags ?? []).join(', '))
  }, [focusedImagePackage?.id, focusedImagePackage?.workTitle, focusedImagePackage?.circle, focusedImagePackage?.author, focusedImagePackage?.tags])

  useEffect(() => {
    setVideoWorkTitleDraft(focusedVideo?.workTitle ?? '')
    setVideoCircleDraft(focusedVideo?.circle ?? '')
    setVideoAuthorDraft(focusedVideo?.author ?? '')
    setVideoTagsDraft((focusedVideo?.tags ?? []).join(', '))
  }, [focusedVideo?.id, focusedVideo?.workTitle, focusedVideo?.circle, focusedVideo?.author, focusedVideo?.tags])

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
  const effectiveGrade = currentGrade
  const effectiveVideoGrade = currentVideoGrade

  const persistPackageMetadata = (syncWorkTitleToPackageName = false) => {
    if (!focusedImagePackage) {
      return
    }

    const workTitle = workTitleDraft.trim().length > 0 ? workTitleDraft.trim() : focusedImagePackage.workTitle
    const circle = circleDraft.trim().length > 0 ? circleDraft.trim() : focusedImagePackage.circle
    const author = authorDraft.trim().length > 0 ? authorDraft.trim() : focusedImagePackage.author
    const tags = parseTagsInput(tagsDraft)

    onSavePackageMetadata({
      workTitle,
      circle,
      author,
      tags,
      syncWorkTitleToPackageName,
    })
  }

  const persistVideoMetadata = (syncFileNameToWorkTitle = false, grade: number | null | undefined = undefined) => {
    if (!focusedVideo) {
      return
    }

    const workTitle =
      videoWorkTitleDraft.trim().length > 0 ? videoWorkTitleDraft.trim() : focusedVideo.workTitle
    const circle = videoCircleDraft.trim().length > 0 ? videoCircleDraft.trim() : focusedVideo.circle
    const author = videoAuthorDraft.trim().length > 0 ? videoAuthorDraft.trim() : focusedVideo.author
    const tags = parseTagsInput(videoTagsDraft)

    onSaveVideoMetadata({
      workTitle,
      circle,
      author,
      tags,
      grade,
      syncFileNameToWorkTitle,
    })
  }

  const showImageCanvas = mode === 'image' && showImagePreview && hasImageFocus && Boolean(focusedImage)

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

        {mode === 'image' ? (
          <button
            className={`metadata-head-icon-btn ${showImagePreview ? 'is-image' : 'is-metadata'}`}
            type="button"
            aria-label={showImagePreview ? '切换到元数据显示' : '切换到原图显示'}
            title={showImagePreview ? '切换到元数据显示' : '切换到原图显示'}
            onClick={() => setShowImagePreview((value) => !value)}
          >
            <span aria-hidden="true">{showImagePreview ? '≣' : '▣'}</span>
          </button>
        ) : null}
      </div>

      {mode === 'image' ? (
        <div className={imagePreviewClassName}>
          {showImageCanvas && focusedImage ? (
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
            <div className="metadata-editor-shell">
              <div className="feature-rating-group metadata-rating-group">
                <strong>评分</strong>
                <div
                  className="metadata-rating-clear-zone"
                  role="button"
                  tabIndex={0}
                  aria-label="清空评分"
                  onMouseDown={(event) => {
                    if (metadataPending || event.button !== 0) {
                      return
                    }

                    const target = event.target as HTMLElement
                    if (target.closest('.metadata-rating-stars')) {
                      return
                    }

                    onGradeChange(null)
                  }}
                  onKeyDown={(event) => {
                    if (metadataPending) {
                      return
                    }
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onGradeChange(null)
                    }
                  }}
                >
                <div
                  className="feature-rating-stars metadata-rating-stars"
                  role="group"
                  aria-label="图包评分"
                  onMouseDown={(event) => {
                    if (metadataPending || event.button !== 0) {
                      return
                    }
                    event.preventDefault()
                    const score = resolveRatingByClientX(event.clientX, event.currentTarget)
                    onGradeChange(score)
                    setRatingDragging(true)
                  }}
                  onMouseMove={(event) => {
                    if (!ratingDragging || metadataPending) {
                      return
                    }
                    const score = resolveRatingByClientX(event.clientX, event.currentTarget)
                    onGradeChange(score)
                  }}
                  onMouseUp={() => {
                    setRatingDragging(false)
                  }}
                  onMouseLeave={() => {
                    setRatingDragging(false)
                  }}
                >
                  <button
                    aria-label="图包评分 无评分"
                    aria-pressed={effectiveGrade === null}
                    className={`is-clear ${effectiveGrade === null ? 'is-active' : ''}`}
                    type="button"
                    disabled={metadataPending}
                    onClick={() => {
                      onGradeChange(null)
                    }}
                  >
                    ×
                  </button>

                  {[1, 2, 3, 4, 5].map((score) => {
                    const isActive = effectiveGrade !== null && score <= effectiveGrade
                    return (
                      <button
                        key={score}
                        aria-label={`图包评分 ${score} 星`}
                        aria-pressed={effectiveGrade === score}
                        className={isActive ? 'is-active' : ''}
                        type="button"
                        disabled={metadataPending}
                        onClick={() => {
                          onGradeChange(score)
                        }}
                      >
                        {isActive ? '★' : '☆'}
                      </button>
                    )
                  })}
                </div>
                </div>
              </div>

              {focusedImagePackage ? (
                <div className="metadata-edit-grid">
                  <label>
                    <span>图包名</span>
                    <input readOnly value={focusedImagePackage.packageName} />
                  </label>

                  <label>
                    <span>作品名</span>
                    <input
                      value={workTitleDraft}
                      onChange={(event) => setWorkTitleDraft(event.target.value)}
                      onBlur={() => {
                        persistPackageMetadata(false)
                      }}
                    />
                  </label>

                  <label>
                    <span>社团</span>
                    <input
                      value={circleDraft}
                      onChange={(event) => setCircleDraft(event.target.value)}
                      onBlur={() => {
                        persistPackageMetadata(false)
                      }}
                    />
                  </label>

                  <label>
                    <span>作者</span>
                    <input
                      value={authorDraft}
                      onChange={(event) => setAuthorDraft(event.target.value)}
                      onBlur={() => {
                        persistPackageMetadata(false)
                      }}
                    />
                  </label>

                  <label>
                    <span>Tags</span>
                    <input
                      value={tagsDraft}
                      placeholder="多个标签用逗号分隔"
                      onChange={(event) => setTagsDraft(event.target.value)}
                      onBlur={() => {
                        persistPackageMetadata(false)
                      }}
                    />
                  </label>

                  <div className="metadata-edit-actions">
                    <button
                      type="button"
                      disabled={metadataPending}
                      onClick={() => {
                        persistPackageMetadata(false)
                      }}
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      disabled={metadataPending}
                      onClick={() => {
                        persistPackageMetadata(true)
                      }}
                    >
                      作品名同步图包名
                    </button>
                  </div>
                </div>
              ) : (
                <p className="metadata-empty-tip">当前无可编辑图包</p>
              )}
            </div>
          )}
        </div>
      ) : (
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
                <div className="feature-rating-group metadata-rating-group">
                  <strong>评分</strong>
                  <div
                    className="metadata-rating-clear-zone"
                    role="button"
                    tabIndex={0}
                    aria-label="清空视频评分"
                    onMouseDown={(event) => {
                      if (metadataPending || event.button !== 0) {
                        return
                      }

                      const target = event.target as HTMLElement
                      if (target.closest('.metadata-rating-stars')) {
                        return
                      }

                      persistVideoMetadata(false, null)
                    }}
                    onKeyDown={(event) => {
                      if (metadataPending) {
                        return
                      }
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        persistVideoMetadata(false, null)
                      }
                    }}
                  >
                    <div
                      className="feature-rating-stars metadata-rating-stars"
                      role="group"
                      aria-label="视频评分"
                      onMouseDown={(event) => {
                        if (metadataPending || event.button !== 0) {
                          return
                        }
                        event.preventDefault()
                        const score = resolveRatingByClientX(event.clientX, event.currentTarget)
                        persistVideoMetadata(false, score)
                        setVideoRatingDragging(true)
                      }}
                      onMouseMove={(event) => {
                        if (!videoRatingDragging || metadataPending) {
                          return
                        }
                        const score = resolveRatingByClientX(event.clientX, event.currentTarget)
                        persistVideoMetadata(false, score)
                      }}
                      onMouseUp={() => {
                        setVideoRatingDragging(false)
                      }}
                      onMouseLeave={() => {
                        setVideoRatingDragging(false)
                      }}
                    >
                      <button
                        aria-label="视频评分 无评分"
                        aria-pressed={effectiveVideoGrade === null}
                        className={`is-clear ${effectiveVideoGrade === null ? 'is-active' : ''}`}
                        type="button"
                        disabled={metadataPending}
                        onClick={() => {
                          persistVideoMetadata(false, null)
                        }}
                      >
                        ×
                      </button>

                      {[1, 2, 3, 4, 5].map((score) => {
                        const isActive = effectiveVideoGrade !== null && score <= effectiveVideoGrade
                        return (
                          <button
                            key={score}
                            aria-label={`视频评分 ${score} 星`}
                            aria-pressed={effectiveVideoGrade === score}
                            className={isActive ? 'is-active' : ''}
                            type="button"
                            disabled={metadataPending}
                            onClick={() => {
                              persistVideoMetadata(false, score)
                            }}
                          >
                            {isActive ? '★' : '☆'}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="metadata-edit-grid metadata-video-grid">
                  <label>
                    <span>文件名</span>
                    <input readOnly value={focusedVideo.fileName} />
                  </label>
                  <label>
                    <span>作品名</span>
                    <input
                      value={videoWorkTitleDraft}
                      onChange={(event) => setVideoWorkTitleDraft(event.target.value)}
                      onBlur={() => {
                        persistVideoMetadata(false)
                      }}
                    />
                  </label>
                  <label>
                    <span>社团</span>
                    <input
                      value={videoCircleDraft}
                      onChange={(event) => setVideoCircleDraft(event.target.value)}
                      onBlur={() => {
                        persistVideoMetadata(false)
                      }}
                    />
                  </label>
                  <label>
                    <span>作者</span>
                    <input
                      value={videoAuthorDraft}
                      onChange={(event) => setVideoAuthorDraft(event.target.value)}
                      onBlur={() => {
                        persistVideoMetadata(false)
                      }}
                    />
                  </label>
                  <label>
                    <span>Tags</span>
                    <input
                      value={videoTagsDraft}
                      placeholder="多个标签用逗号分隔"
                      onChange={(event) => setVideoTagsDraft(event.target.value)}
                      onBlur={() => {
                        persistVideoMetadata(false)
                      }}
                    />
                  </label>
                </div>

                <div className="metadata-edit-actions">
                  <button
                    type="button"
                    disabled={metadataPending}
                    onClick={() => {
                      persistVideoMetadata(false)
                    }}
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    disabled={metadataPending}
                    onClick={() => {
                      persistVideoMetadata(true)
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
      )}
    </aside>
  )
}

export default MetadataPanel
