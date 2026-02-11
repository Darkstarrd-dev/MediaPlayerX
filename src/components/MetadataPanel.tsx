import { useEffect, useRef, useState } from 'react'

import type { BrowserMode, ImageItem, ImagePackage, VideoItem } from '../types'
import { MetadataImageEditor } from './metadata/MetadataImageEditor'
import { MetadataVideoEditor } from './metadata/MetadataVideoEditor'

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
  autoTagPending: boolean
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
    workTitle: string
    circle: string
    author: string
    tags: string[]
    syncWorkTitleToPackageName?: boolean
  }) => void
  onGeneratePackageAutoTags: () => void
  onGeneratePackageAutoTagsVision: () => void
  onSaveVideoMetadata: (payload: {
    workTitle: string
    circle: string
    author: string
    tags: string[]
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
  metadataCollapsed,
  metadataRatio,
  hasImageFocus,
  focusedImage,
  focusedImageSrc,
  focusedImagePackage,
  currentGrade,
  currentVideoGrade,
  metadataPending,
  autoTagPending,
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
  onGeneratePackageAutoTags,
  onGeneratePackageAutoTagsVision,
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
        <MetadataImageEditor
          contentClassName={imagePreviewClassName}
          showImageCanvas={showImageCanvas}
          focusedImage={focusedImage}
          focusedImagePackage={focusedImagePackage}
          displayedImageSrc={displayedImageSrc}
          imagePreviewSizing={imagePreviewSizing}
          metadataPending={metadataPending}
          autoTagPending={autoTagPending}
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
          onPersistPackageMetadata={persistPackageMetadata}
          onGeneratePackageAutoTags={onGeneratePackageAutoTags}
          onGeneratePackageAutoTagsVision={onGeneratePackageAutoTagsVision}
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
          onPersistVideoMetadata={persistVideoMetadata}
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
    </aside>
  )
}

export default MetadataPanel
