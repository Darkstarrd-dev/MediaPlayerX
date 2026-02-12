import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import type { ManageAdReviewTaskDto } from '../contracts/backend'
import type { ParsedExternalMetadata } from '../features/metadata/parseExternalMetadata'
import type { BrowserMode, ImageItem, ImagePackage, VideoItem } from '../types'
import { MetadataImageEditor } from './metadata/MetadataImageEditor'
import { MetadataVideoEditor } from './metadata/MetadataVideoEditor'

const IS_TEST_MODE = import.meta.env.MODE === 'test'
const AD_REVIEW_CONCURRENCY_OPTIONS = Array.from({ length: 9 }, (_, index) => index + 4)
const AD_REVIEW_WINDOW_OPTIONS = Array.from({ length: 201 }, (_, index) => index)
const AD_REVIEW_STREAK_OPTIONS = Array.from({ length: 200 }, (_, index) => index + 1)

function resolveAdReviewStatusLabel(status: ManageAdReviewTaskDto['status']): string {
  if (status === 'running') {
    return '审核中'
  }
  if (status === 'paused') {
    return '已暂停'
  }
  if (status === 'failed') {
    return '失败'
  }
  return '待复核'
}

function formatPercent(value: number): string {
  const normalized = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
  return `${(normalized * 100).toFixed(1)}%`
}

function resolveAdReviewExecutionLabel(task: ManageAdReviewTaskDto): string | null {
  if (!task.execution) {
    return null
  }

  const strategy = task.execution.strategy
  const strategyLabel =
    strategy.mode === 'head-tail'
      ? `head-tail(h=${strategy.head_n}, t=${strategy.tail_n}, stop=${strategy.tail_stop_clean_streak})`
      : 'all'

  return `策略 ${strategyLabel} | 并发 ${task.execution.max_concurrency}`
}

function resolveTagGroupKey(tag: string): string {
  const normalized = tag.trim()
  if (!normalized) {
    return '#'
  }

  const first = normalized[0]?.toUpperCase() ?? '#'
  return /[A-Z0-9]/.test(first) ? first : '#'
}

export interface MetadataPanelProps {
  mode: BrowserMode
  manageMode: boolean
  searchModeActive: boolean
  featureResultCount: number
  featureNameQuery: string
  onFeatureNameQueryChange: (value: string) => void
  featureWorkTitleQuery: string
  onFeatureWorkTitleQueryChange: (value: string) => void
  featureCircleQuery: string
  onFeatureCircleQueryChange: (value: string) => void
  featureAuthorQuery: string
  onFeatureAuthorQueryChange: (value: string) => void
  featureCircleOptions: string[]
  featureAuthorOptions: string[]
  featureTagOptions: string[]
  featureTagPickerOpen: boolean
  onToggleFeatureTagPicker: () => void
  featureTags: string[]
  onSetFeatureTags: (tags: string[]) => void
  onClearFeatureTags: () => void
  featureGradeFilter: number | null
  onFeatureGradeFilterChange: (value: number | null) => void
  adReviewFeatureVisible: boolean
  adReviewPanelOpen: boolean
  canExecuteAdReview: boolean
  adReviewPending: boolean
  adReviewTask: ManageAdReviewTaskDto | null
  adReviewHideUncheckedNonChecked: boolean
  hasCheckedAdReviewCandidates: boolean
  adReviewStrategyMode: 'all' | 'head-tail'
  adReviewMaxConcurrency: number
  adReviewHeadN: number
  adReviewTailN: number
  adReviewTailStopCleanStreak: number
  onStartAdReview: () => void
  onPauseAdReview: () => void
  onToggleHideUncheckedNonChecked: () => void
  onAdReviewStrategyModeChange: (value: 'all' | 'head-tail') => void
  onAdReviewMaxConcurrencyChange: (value: number) => void
  onAdReviewHeadNChange: (value: number) => void
  onAdReviewTailNChange: (value: number) => void
  onAdReviewTailStopCleanStreakChange: (value: number) => void
  onDismissAdReviewTask: () => void
  metadataCollapsed: boolean
  metadataRatio: number
  hasImageFocus: boolean
  focusedImage: ImageItem | null
  focusedImageSrc: string | null
  focusedImagePackage: ImagePackage | null
  currentGrade: number | null
  currentVideoGrade: number | null
  metadataPending: boolean
  editable: boolean
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
    workTitle?: string
    circle?: string
    author?: string
    tags?: string[]
    syncWorkTitleToPackageName?: boolean
  }) => void
  onSavePackageParsedMetadata: (payload: ParsedExternalMetadata) => Promise<void>
  onSaveVideoMetadata: (payload: {
    workTitle?: string
    circle?: string
    author?: string
    tags?: string[]
    grade?: number | null
    syncFileNameToWorkTitle?: boolean
  }) => void
  onSearchByWorkTitle: (value: string) => void
  onSearchByCircle: (value: string) => void
  onSearchByAuthor: (value: string) => void
  onSearchByTag: (value: string) => void
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

function MetadataPanel({
  mode,
  manageMode,
  searchModeActive,
  featureResultCount,
  featureNameQuery,
  onFeatureNameQueryChange,
  featureWorkTitleQuery,
  onFeatureWorkTitleQueryChange,
  featureCircleQuery,
  onFeatureCircleQueryChange,
  featureAuthorQuery,
  onFeatureAuthorQueryChange,
  featureCircleOptions,
  featureAuthorOptions,
  featureTagOptions,
  featureTagPickerOpen,
  onToggleFeatureTagPicker,
  featureTags,
  onSetFeatureTags,
  onClearFeatureTags,
  featureGradeFilter,
  onFeatureGradeFilterChange,
  adReviewFeatureVisible,
  adReviewPanelOpen,
  canExecuteAdReview,
  adReviewPending,
  adReviewTask,
  adReviewHideUncheckedNonChecked,
  hasCheckedAdReviewCandidates,
  adReviewStrategyMode,
  adReviewMaxConcurrency,
  adReviewHeadN,
  adReviewTailN,
  adReviewTailStopCleanStreak,
  onStartAdReview,
  onPauseAdReview,
  onToggleHideUncheckedNonChecked,
  onAdReviewStrategyModeChange,
  onAdReviewMaxConcurrencyChange,
  onAdReviewHeadNChange,
  onAdReviewTailNChange,
  onAdReviewTailStopCleanStreakChange,
  onDismissAdReviewTask,
  metadataCollapsed,
  metadataRatio,
  hasImageFocus,
  focusedImage,
  focusedImageSrc,
  focusedImagePackage,
  currentGrade,
  currentVideoGrade,
  metadataPending,
  editable,
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
  onSavePackageParsedMetadata,
  onSaveVideoMetadata,
  onSearchByWorkTitle,
  onSearchByCircle,
  onSearchByAuthor,
  onSearchByTag,
  onMetadataTabChange,
  onSelectVideo,
  onRemoveVideoFromPlaylist,
  onDragStart,
  onDropToVideo,
}: MetadataPanelProps) {
  const [displayedImageSrc, setDisplayedImageSrc] = useState<string | null>(null)
  const [showImagePreview, setShowImagePreview] = useState(true)
  const [workTitleDraft, setWorkTitleDraft] = useState('')
  const [circleDraft, setCircleDraft] = useState('')
  const [authorDraft, setAuthorDraft] = useState('')
  const [tagsDraft, setTagsDraft] = useState('')
  const [videoWorkTitleDraft, setVideoWorkTitleDraft] = useState('')
  const [videoCircleDraft, setVideoCircleDraft] = useState('')
  const [videoAuthorDraft, setVideoAuthorDraft] = useState('')
  const [videoTagsDraft, setVideoTagsDraft] = useState('')
  const [featureTagDrafts, setFeatureTagDrafts] = useState<string[]>([])
  const [featureTagSelectMode, setFeatureTagSelectMode] = useState<'single' | 'multi'>('multi')
  const featureTagGroupsRef = useRef<HTMLDivElement | null>(null)
  const imagePreloadSeqRef = useRef(0)

  const groupedFeatureTagOptions = useMemo(() => {
    const groups = new Map<string, string[]>()
    for (const tag of featureTagOptions) {
      const key = resolveTagGroupKey(tag)
      const existing = groups.get(key)
      if (existing) {
        existing.push(tag)
        continue
      }
      groups.set(key, [tag])
    }

    return Array.from(groups.entries())
      .sort(([left], [right]) => {
        if (left === '#') {
          return 1
        }
        if (right === '#') {
          return -1
        }
        return left.localeCompare(right, 'en-US')
      })
      .map(([key, tags]) => ({
        key,
        tags: tags.sort((left, right) => left.localeCompare(right, 'zh-CN')),
      }))
  }, [featureTagOptions])

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

  useEffect(() => {
    if (editable && showImagePreview) {
      setShowImagePreview(false)
    }
  }, [editable, showImagePreview])

  useEffect(() => {
    if (!featureTagPickerOpen) {
      return
    }
    setFeatureTagDrafts(featureTags)
  }, [featureTagPickerOpen, featureTags])

  useEffect(() => {
    if (!featureTagPickerOpen) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const shouldTrap = event.key === 'Escape' || /^[a-zA-Z0-9]$/.test(event.key)
      if (!shouldTrap) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation?.()

      if (event.key === 'Escape') {
        setFeatureTagDrafts(featureTags)
        onToggleFeatureTagPicker()
        return
      }

      const matched = event.key.match(/^[a-zA-Z0-9]$/)
      if (!matched) {
        return
      }
      const jumpKey = matched[0].toUpperCase()
      const container = featureTagGroupsRef.current
      if (!container) {
        return
      }

      const rows = Array.from(container.querySelectorAll<HTMLElement>('[data-tag-group-key]'))
      const targetRow = rows.find((row) => row.dataset.tagGroupKey === jumpKey)
      if (!targetRow) {
        return
      }

      targetRow.scrollIntoView({ block: 'start', behavior: 'auto' })
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [featureTagPickerOpen, featureTags, onToggleFeatureTagPicker])

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
  const lockMetadataScroll = mode === 'image' && showImagePreview && hasImageFocus && Boolean(focusedImage) && !searchModeActive
  const metadataPanelClassName = lockMetadataScroll ? 'metadata-panel is-image-focus' : 'metadata-panel'
  const adReviewRunning = adReviewTask?.status === 'running'
  const closeFeatureTagPicker = (revertDraft: boolean) => {
    if (revertDraft) {
      setFeatureTagDrafts(featureTags)
    }
    if (featureTagPickerOpen) {
      onToggleFeatureTagPicker()
    }
  }

  const persistPackageWorkTitle = (rawValue: string) => {
    if (!focusedImagePackage) {
      return
    }
    const workTitle = rawValue.trim()
    if (workTitle.length === 0) {
      return
    }

    onSavePackageMetadata({
      workTitle,
    })
  }

  const persistPackageCircle = (rawValue: string) => {
    if (!focusedImagePackage) {
      return
    }
    const circle = rawValue.trim()
    if (circle.length === 0) {
      return
    }

    onSavePackageMetadata({
      circle,
    })
  }

  const persistPackageAuthor = (rawValue: string) => {
    if (!focusedImagePackage) {
      return
    }
    const author = rawValue.trim()
    if (author.length === 0) {
      return
    }

    onSavePackageMetadata({
      author,
    })
  }

  const persistPackageTags = (rawValue: string) => {
    if (!focusedImagePackage) {
      return
    }
    const tags = parseTagsInput(rawValue)

    onSavePackageMetadata({
      tags,
    })
  }

  const persistVideoWorkTitle = (rawValue: string) => {
    if (!focusedVideo) {
      return
    }
    const workTitle = rawValue.trim()
    if (workTitle.length === 0) {
      return
    }

    onSaveVideoMetadata({
      workTitle,
    })
  }

  const persistVideoCircle = (rawValue: string) => {
    if (!focusedVideo) {
      return
    }
    const circle = rawValue.trim()
    if (circle.length === 0) {
      return
    }

    onSaveVideoMetadata({
      circle,
    })
  }

  const persistVideoAuthor = (rawValue: string) => {
    if (!focusedVideo) {
      return
    }
    const author = rawValue.trim()
    if (author.length === 0) {
      return
    }

    onSaveVideoMetadata({
      author,
    })
  }

  const persistVideoTags = (rawValue: string) => {
    if (!focusedVideo) {
      return
    }
    const tags = parseTagsInput(rawValue)

    onSaveVideoMetadata({
      tags,
    })
  }

  const persistVideoGrade = (grade: number | null) => {
    if (!focusedVideo) {
      return
    }

    onSaveVideoMetadata({
      grade,
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

  const tagPickerModal =
    featureTagPickerOpen && typeof document !== 'undefined'
      ? createPortal(
          <div className="feature-tag-modal-overlay" role="dialog" aria-modal="true" aria-label="tags 控制面板">
            <div
              className="feature-tag-modal-backdrop"
              onMouseDown={(event) => {
                if (event.button === 2) {
                  event.preventDefault()
                  event.stopPropagation()
                  closeFeatureTagPicker(true)
                  return
                }
                if (event.target === event.currentTarget) {
                  closeFeatureTagPicker(true)
                }
              }}
              onContextMenu={(event) => {
                event.preventDefault()
                event.stopPropagation()
                closeFeatureTagPicker(true)
              }}
            >
              <div className="feature-tag-modal-panel">
                <div className="feature-tag-picker-head">
                  <strong>Tag 选择</strong>
                  <div className="feature-control-actions">
                    <label className="feature-tag-select-mode">
                      <input
                        checked={featureTagSelectMode === 'single'}
                        type="radio"
                        name="feature-tag-select-mode"
                        onChange={() => {
                          setFeatureTagSelectMode('single')
                          if (featureTagDrafts.length > 1) {
                            setFeatureTagDrafts(featureTagDrafts.slice(0, 1))
                          }
                        }}
                      />
                      单选
                    </label>
                    <label className="feature-tag-select-mode">
                      <input
                        checked={featureTagSelectMode === 'multi'}
                        type="radio"
                        name="feature-tag-select-mode"
                        onChange={() => setFeatureTagSelectMode('multi')}
                      />
                      复选
                    </label>
                  </div>
                </div>

                <div className="feature-tag-picker-groups" role="listbox" aria-label="tags 分组列表" ref={featureTagGroupsRef}>
                  {groupedFeatureTagOptions.length === 0 ? (
                    <p className="feature-selection-result">当前库内暂无可选 tags</p>
                  ) : (
                    groupedFeatureTagOptions.map((group) => (
                      <div key={group.key} className="feature-tag-picker-group-row" data-tag-group-key={group.key}>
                        <span className="feature-tag-picker-group-key">{group.key}</span>
                        <div className="feature-tags-popover">
                          {group.tags.map((tag) => {
                            const selected = featureTagDrafts.includes(tag)
                            return (
                              <button
                                key={tag}
                                aria-label={tag}
                                aria-pressed={selected}
                                className={selected ? 'is-active' : ''}
                                type="button"
                                onClick={() => {
                                  setFeatureTagDrafts((previous) => {
                                    if (featureTagSelectMode === 'single') {
                                      return previous[0] === tag ? [] : [tag]
                                    }
                                    if (previous.includes(tag)) {
                                      return previous.filter((item) => item !== tag)
                                    }
                                    return [...previous, tag]
                                  })
                                }}
                              >
                                {tag}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="feature-tag-picker-actions">
                  <button className="feature-action-btn" type="button" onClick={() => setFeatureTagDrafts([])}>
                    清空临时选择
                  </button>
                  <button className="feature-action-btn" type="button" onClick={() => closeFeatureTagPicker(true)}>
                    取消
                  </button>
                  <button
                    className="vector-search-btn"
                    type="button"
                    onClick={() => {
                      onSetFeatureTags(featureTagDrafts)
                      closeFeatureTagPicker(false)
                    }}
                  >
                    确定
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
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
        <MetadataImageEditor
          contentClassName={imagePreviewClassName}
          showImageCanvas={showImageCanvas}
          focusedImage={focusedImage}
          focusedImagePackage={focusedImagePackage}
          displayedImageSrc={displayedImageSrc}
          imagePreviewSizing={imagePreviewSizing}
          metadataPending={metadataPending}
          editable={editable}
          currentGrade={currentGrade}
          workTitleDraft={workTitleDraft}
          circleDraft={circleDraft}
          authorDraft={authorDraft}
          tagsDraft={tagsDraft}
          onWorkTitleDraftChange={setWorkTitleDraft}
          onCircleDraftChange={setCircleDraft}
          onAuthorDraftChange={setAuthorDraft}
          onTagsDraftChange={setTagsDraft}
          onSubmitPackageWorkTitle={persistPackageWorkTitle}
          onSubmitPackageCircle={persistPackageCircle}
          onSubmitPackageAuthor={persistPackageAuthor}
          onSubmitPackageTags={persistPackageTags}
          onSubmitParsedMetadata={onSavePackageParsedMetadata}
          onGradeChange={onGradeChange}
          onSearchByWorkTitle={onSearchByWorkTitle}
          onSearchByCircle={onSearchByCircle}
          onSearchByAuthor={onSearchByAuthor}
          onSearchByTag={onSearchByTag}
        />
      ) : (
        <MetadataVideoEditor
          metadataTab={metadataTab}
          focusedVideo={focusedVideo}
          metadataPending={metadataPending}
          editable={editable}
          currentVideoGrade={currentVideoGrade}
          videoWorkTitleDraft={videoWorkTitleDraft}
          videoCircleDraft={videoCircleDraft}
          videoAuthorDraft={videoAuthorDraft}
          videoTagsDraft={videoTagsDraft}
          playlistIds={playlistIds}
          selectedVideoId={selectedVideoId}
          dragVideoId={dragVideoId}
          videoById={videoById}
          videoVolume={videoVolume}
          videoMuted={videoMuted}
          videoRate={videoRate}
          onMetadataTabChange={onMetadataTabChange}
          onVideoWorkTitleDraftChange={setVideoWorkTitleDraft}
          onVideoCircleDraftChange={setVideoCircleDraft}
          onVideoAuthorDraftChange={setVideoAuthorDraft}
          onVideoTagsDraftChange={setVideoTagsDraft}
          onSubmitVideoWorkTitle={persistVideoWorkTitle}
          onSubmitVideoCircle={persistVideoCircle}
          onSubmitVideoAuthor={persistVideoAuthor}
          onSubmitVideoTags={persistVideoTags}
          onVideoGradeChange={persistVideoGrade}
          onSearchByWorkTitle={onSearchByWorkTitle}
          onSearchByCircle={onSearchByCircle}
          onSearchByAuthor={onSearchByAuthor}
          onSearchByTag={onSearchByTag}
          onSelectVideo={onSelectVideo}
          onRemoveVideoFromPlaylist={onRemoveVideoFromPlaylist}
          onDragStart={onDragStart}
          onDropToVideo={onDropToVideo}
        />
      )}

      {searchModeActive ? (
        <section className="metadata-search-section" aria-label="检索筛选">
          <div className="metadata-search-head">
            <strong>{`命中节点: ${featureResultCount} 个`}</strong>
          </div>

          <div className="feature-controls metadata-search-controls">
            <label>
              名称
              <input
                className="feature-query-input"
                placeholder="按名称模糊匹配"
                value={featureNameQuery}
                onChange={(event) => onFeatureNameQueryChange(event.target.value)}
              />
            </label>

            <label>
              作品名
              <input
                className="feature-query-input"
                placeholder="按作品名模糊匹配"
                value={featureWorkTitleQuery}
                onChange={(event) => onFeatureWorkTitleQueryChange(event.target.value)}
              />
            </label>

            <label>
              社团
              <input
                className="feature-query-input"
                list="metadata-feature-circle-options"
                placeholder="输入社团，支持自动补完"
                value={featureCircleQuery}
                onChange={(event) => onFeatureCircleQueryChange(event.target.value)}
              />
              <datalist id="metadata-feature-circle-options">
                {featureCircleOptions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </label>

            <label>
              作者
              <input
                className="feature-query-input"
                list="metadata-feature-author-options"
                placeholder="输入作者，支持自动补完"
                value={featureAuthorQuery}
                onChange={(event) => onFeatureAuthorQueryChange(event.target.value)}
              />
              <datalist id="metadata-feature-author-options">
                {featureAuthorOptions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </label>

            <div className="feature-tags-group">
              <div className="feature-control-head">
                <strong>tags</strong>
                <div className="feature-control-actions">
                  <button
                    className="feature-action-btn"
                    type="button"
                    onClick={() => {
                      if (!featureTagPickerOpen) {
                        setFeatureTagDrafts(featureTags)
                      }
                      onToggleFeatureTagPicker()
                    }}
                  >
                    {featureTagPickerOpen ? '关闭面板' : '选择 tags'}
                  </button>
                  <button className="feature-action-btn" type="button" onClick={onClearFeatureTags}>
                    清空 tags
                  </button>
                </div>
              </div>

              {featureTags.length === 0 ? (
                <p className="feature-selection-result">未选择 tags</p>
              ) : (
                <div className="feature-selected-tags">
                  {featureTags.map((tag) => (
                    <button
                      key={tag}
                      className="feature-selected-tag-chip"
                      type="button"
                      aria-label={`移除tag ${tag}`}
                      onClick={() => onSetFeatureTags(featureTags.filter((item) => item !== tag))}
                    >
                      <span>{tag}</span>
                      <span aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="feature-rating-group">
              <strong>图包评分</strong>
              <div className="feature-rating-stars" role="group" aria-label="图包评分筛选">
                <button
                  aria-label="图包评分 无评分"
                  aria-pressed={featureGradeFilter === null}
                  className={`is-clear ${featureGradeFilter === null ? 'is-active' : ''}`}
                  type="button"
                  onClick={() => onFeatureGradeFilterChange(null)}
                >
                  ×
                </button>

                {[1, 2, 3, 4, 5].map((score) => {
                  const isActive = featureGradeFilter !== null && score <= featureGradeFilter
                  return (
                    <button
                      key={score}
                      aria-label={`图包评分 ${score} 分`}
                      aria-pressed={featureGradeFilter === score}
                      className={isActive ? 'is-active' : ''}
                      style={{ color: `hsl(42deg ${35 + score * 13}% 48%)` }}
                      type="button"
                      onClick={() => onFeatureGradeFilterChange(featureGradeFilter === score ? null : score)}
                    >
                      {isActive ? '★' : '☆'}
                    </button>
                  )
                })}
              </div>
            </div>

            <p className="vector-hint">多字段组合按 AND 逻辑过滤，结果即时同步到 Sidebar 与主视图。</p>
          </div>
        </section>
      ) : null}

      {manageMode && adReviewFeatureVisible && adReviewPanelOpen && mode === 'image' ? (
        <section className="metadata-ad-review-section" aria-label="AI广告审核面板">
          <header>
            <strong>AI广告审核</strong>
            {adReviewTask ? <span className={`manage-ad-review-status is-${adReviewTask.status}`}>{resolveAdReviewStatusLabel(adReviewTask.status)}</span> : null}
          </header>

          <div className="metadata-ad-review-controls" role="group" aria-label="AI广告审核控制">
            <div className="metadata-ad-review-primary-row">
              <button
                className={`manage-ad-review-icon-btn ${adReviewStrategyMode === 'head-tail' ? 'is-active' : ''}`}
                type="button"
                aria-label="AI广告审核策略切换"
                title={
                  adReviewStrategyMode === 'head-tail'
                    ? '当前策略：头尾抽样。点击切换为全量审核'
                    : '当前策略：全量审核。点击切换为头尾抽样'
                }
                onClick={() => onAdReviewStrategyModeChange(adReviewStrategyMode === 'head-tail' ? 'all' : 'head-tail')}
              >
                <span aria-hidden="true">{adReviewStrategyMode === 'head-tail' ? '⇵' : '∞'}</span>
              </button>

              <button
                className={`manage-ad-review-icon-btn manage-ad-review-exec-btn ${adReviewRunning ? 'is-running' : ''}`}
                type="button"
                aria-label={adReviewRunning ? '暂停AI广告审核' : '执行AI广告审核'}
                title={adReviewRunning ? '暂停AI广告审核' : '执行AI广告审核'}
                disabled={adReviewPending || (!adReviewRunning && !canExecuteAdReview)}
                onClick={adReviewRunning ? onPauseAdReview : onStartAdReview}
              >
                <span aria-hidden="true">{adReviewRunning ? '⏸' : '▶'}</span>
              </button>
            </div>

            <label className="manage-ad-review-inline-field">
              <span>并发</span>
              <select
                aria-label="AI广告审核并发"
                value={adReviewMaxConcurrency}
                onChange={(event) => onAdReviewMaxConcurrencyChange(Number(event.target.value))}
              >
                {AD_REVIEW_CONCURRENCY_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className={`manage-ad-review-inline-field ${adReviewStrategyMode !== 'head-tail' ? 'is-disabled' : ''}`}>
              <span>头部</span>
              <select
                aria-label="AI广告审核头部窗口样本数"
                disabled={adReviewStrategyMode !== 'head-tail'}
                value={adReviewHeadN}
                onChange={(event) => onAdReviewHeadNChange(Number(event.target.value))}
              >
                {AD_REVIEW_WINDOW_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className={`manage-ad-review-inline-field ${adReviewStrategyMode !== 'head-tail' ? 'is-disabled' : ''}`}>
              <span>尾部</span>
              <select
                aria-label="AI广告审核尾部窗口样本数"
                disabled={adReviewStrategyMode !== 'head-tail'}
                value={adReviewTailN}
                onChange={(event) => onAdReviewTailNChange(Number(event.target.value))}
              >
                {AD_REVIEW_WINDOW_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label
              className={`manage-ad-review-inline-field manage-ad-review-inline-field-wide ${
                adReviewStrategyMode !== 'head-tail' ? 'is-disabled' : ''
              }`}
            >
              <span>停止 clean</span>
              <select
                aria-label="AI广告审核尾部停止clean连续数"
                disabled={adReviewStrategyMode !== 'head-tail'}
                value={adReviewTailStopCleanStreak}
                onChange={(event) => onAdReviewTailStopCleanStreakChange(Number(event.target.value))}
              >
                {AD_REVIEW_STREAK_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {adReviewTask ? (
            <section className="manage-ad-review" aria-live="polite">
              <p className="manage-ad-review-progress">
                {`进度 ${Math.round(adReviewTask.progress * 100)}% (${adReviewTask.reviewed_count}/${adReviewTask.total_count})`}
              </p>
              {resolveAdReviewExecutionLabel(adReviewTask) ? <p className="manage-ad-review-config">{resolveAdReviewExecutionLabel(adReviewTask)}</p> : null}
              {adReviewTask.audit ? (
                <div className="manage-ad-review-audit">
                  <p className="manage-ad-review-audit-line">
                    {`来源 known-hash ${adReviewTask.audit.source_distribution.known_hash} | llm(疑似/正常/失败) ${adReviewTask.audit.source_distribution.llm_suspected}/${adReviewTask.audit.source_distribution.llm_clean}/${adReviewTask.audit.source_distribution.llm_failed} | strategy-skip ${adReviewTask.audit.source_distribution.strategy_skipped}`}
                  </p>
                  <p className="manage-ad-review-audit-line">
                    {`命中率 LLM ${formatPercent(adReviewTask.audit.llm_hit_rate)} | 总体 ${formatPercent(adReviewTask.audit.overall_hit_rate)}`}
                  </p>
                </div>
              ) : null}

              <p className="manage-ad-review-message">
                {adReviewTask.status === 'review'
                  ? `疑似候选 ${adReviewTask.candidates.length} 张，已同步到选中态。请在主视图修正后使用上方“删除”执行清除。`
                  : adReviewTask.message ?? 'AI广告审核任务进行中'}
              </p>

              {adReviewTask.status === 'review' ? (
                <div className="manage-ad-review-actions">
                  <button className="feature-action-btn" type="button" disabled={adReviewPending} onClick={onToggleHideUncheckedNonChecked}>
                    {adReviewHideUncheckedNonChecked ? '显示全部图片' : '隐藏未勾选图片'}
                  </button>
                  <button className="feature-action-btn" type="button" disabled={adReviewPending} onClick={onDismissAdReviewTask}>
                    关闭结果
                  </button>
                  <span className={`manage-ad-review-selection-tag ${hasCheckedAdReviewCandidates ? 'is-active' : ''}`}>
                    {hasCheckedAdReviewCandidates ? '已选候选可删除' : '未选候选'}
                  </span>
                </div>
              ) : null}

              {adReviewTask.error_detail ? <p className="manage-ad-review-error">{adReviewTask.error_detail}</p> : null}
            </section>
          ) : null}
        </section>
      ) : null}
      </aside>
      {tagPickerModal}
    </>
  )
}

export default MetadataPanel
