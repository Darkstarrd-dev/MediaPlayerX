import { mediaLocatorFileName } from '../../features/backend'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'

import type { ImageItem, ImagePackage } from '../../types'
import { MetadataRatingGroup } from './MetadataRatingGroup'

interface MetadataImageEditorProps {
  contentClassName: string
  showImageCanvas: boolean
  focusedImage: ImageItem | null
  focusedImagePackage: ImagePackage | null
  displayedImageSrc: string | null
  imagePreviewSizing: { width?: string; height?: string }
  metadataPending: boolean
  editable: boolean
  currentGrade: number | null
  workTitleDraft: string
  circleDraft: string
  authorDraft: string
  tagsDraft: string
  onWorkTitleDraftChange: (value: string) => void
  onCircleDraftChange: (value: string) => void
  onAuthorDraftChange: (value: string) => void
  onTagsDraftChange: (value: string) => void
  onSubmitPackageWorkTitle: (value: string) => void
  onSubmitPackageCircle: (value: string) => void
  onSubmitPackageAuthor: (value: string) => void
  onSubmitPackageTags: (value: string) => void
  onGradeChange: (grade: number | null) => void
  onSearchByWorkTitle: (value: string) => void
  onSearchByCircle: (value: string) => void
  onSearchByAuthor: (value: string) => void
  onSearchByTag: (value: string) => void
}

export function MetadataImageEditor({
  contentClassName,
  showImageCanvas,
  focusedImage,
  focusedImagePackage,
  displayedImageSrc,
  imagePreviewSizing,
  metadataPending,
  editable,
  currentGrade,
  workTitleDraft,
  circleDraft,
  authorDraft,
  tagsDraft,
  onWorkTitleDraftChange,
  onCircleDraftChange,
  onAuthorDraftChange,
  onTagsDraftChange,
  onSubmitPackageWorkTitle,
  onSubmitPackageCircle,
  onSubmitPackageAuthor,
  onSubmitPackageTags,
  onGradeChange,
  onSearchByCircle,
  onSearchByAuthor,
  onSearchByTag,
}: MetadataImageEditorProps) {
  const readOnlyTags = tagsDraft
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
    <div className={contentClassName}>
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
          <MetadataRatingGroup
            title="评分"
            groupAriaLabel="图包评分"
            clearAriaLabel="清空评分"
            pending={metadataPending}
            value={currentGrade}
            onChange={onGradeChange}
          />

          {focusedImagePackage ? (
            <div className="metadata-edit-grid">
              <label>
                <span>图包名</span>
                <input readOnly value={focusedImagePackage.packageName} />
              </label>

              <label>
                <span>作品名</span>
                {editable ? (
                  <input
                    value={workTitleDraft}
                    onChange={(event) => onWorkTitleDraftChange(event.target.value)}
                    onKeyDown={(event) => {
                      commitOnEnter(event, onSubmitPackageWorkTitle)
                    }}
                  />
                ) : (
                  <input readOnly value={workTitleDraft.trim() || '-'} />
                )}
              </label>

              <label>
                <span>社团</span>
                {editable ? (
                  <input
                    value={circleDraft}
                    onChange={(event) => onCircleDraftChange(event.target.value)}
                    onKeyDown={(event) => {
                      commitOnEnter(event, onSubmitPackageCircle)
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    disabled={circleDraft.trim().length === 0}
                    onClick={() => onSearchByCircle(circleDraft.trim())}
                  >
                    {circleDraft.trim() || '-'}
                  </button>
                )}
              </label>

              <label>
                <span>作者</span>
                {editable ? (
                  <input
                    value={authorDraft}
                    onChange={(event) => onAuthorDraftChange(event.target.value)}
                    onKeyDown={(event) => {
                      commitOnEnter(event, onSubmitPackageAuthor)
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    disabled={authorDraft.trim().length === 0}
                    onClick={() => onSearchByAuthor(authorDraft.trim())}
                  >
                    {authorDraft.trim() || '-'}
                  </button>
                )}
              </label>

              <label>
                <span>Tags</span>
                {editable ? (
                  <input
                    value={tagsDraft}
                    placeholder="多个标签用逗号分隔"
                    onChange={(event) => onTagsDraftChange(event.target.value)}
                    onKeyDown={(event) => {
                      commitOnEnter(event, onSubmitPackageTags)
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
          ) : (
            <p className="metadata-empty-tip">当前无可编辑图包</p>
          )}
        </div>
      )}
    </div>
  )
}
