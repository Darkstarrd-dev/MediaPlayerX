import { mediaLocatorFileName } from '../../features/backend'
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
  autoTagPending: boolean
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
  onPersistPackageMetadata: (syncWorkTitleToPackageName?: boolean) => void
  onGeneratePackageAutoTags: () => void
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
  autoTagPending,
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
  onPersistPackageMetadata,
  onGeneratePackageAutoTags,
  onGradeChange,
  onSearchByCircle,
  onSearchByAuthor,
  onSearchByTag,
}: MetadataImageEditorProps) {
  const readOnlyTags = tagsDraft
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter((tag, index, arr) => tag.length > 0 && arr.indexOf(tag) === index)

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
            pending={metadataPending || !editable}
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
                    onBlur={() => {
                      onPersistPackageMetadata(false)
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
                    onBlur={() => {
                      onPersistPackageMetadata(false)
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
                    onBlur={() => {
                      onPersistPackageMetadata(false)
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
                    onBlur={() => {
                      onPersistPackageMetadata(false)
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

              {editable ? (
                <div className="metadata-edit-actions">
                  <button
                    type="button"
                    disabled={metadataPending}
                    onClick={() => {
                      onPersistPackageMetadata(false)
                    }}
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    disabled={metadataPending}
                    onClick={() => {
                      onPersistPackageMetadata(true)
                    }}
                  >
                    作品名同步图包名
                  </button>
                  <button type="button" disabled={metadataPending || autoTagPending} onClick={onGeneratePackageAutoTags}>
                    {autoTagPending ? '自动生成标签中...' : '自动生成标签'}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="metadata-empty-tip">当前无可编辑图包</p>
          )}
        </div>
      )}
    </div>
  )
}
