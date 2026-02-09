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
  onGradeChange: (grade: number | null) => void
}

export function MetadataImageEditor({
  contentClassName,
  showImageCanvas,
  focusedImage,
  focusedImagePackage,
  displayedImageSrc,
  imagePreviewSizing,
  metadataPending,
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
  onGradeChange,
}: MetadataImageEditorProps) {
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
                <input
                  value={workTitleDraft}
                  onChange={(event) => onWorkTitleDraftChange(event.target.value)}
                  onBlur={() => {
                    onPersistPackageMetadata(false)
                  }}
                />
              </label>

              <label>
                <span>社团</span>
                <input
                  value={circleDraft}
                  onChange={(event) => onCircleDraftChange(event.target.value)}
                  onBlur={() => {
                    onPersistPackageMetadata(false)
                  }}
                />
              </label>

              <label>
                <span>作者</span>
                <input
                  value={authorDraft}
                  onChange={(event) => onAuthorDraftChange(event.target.value)}
                  onBlur={() => {
                    onPersistPackageMetadata(false)
                  }}
                />
              </label>

              <label>
                <span>Tags</span>
                <input
                  value={tagsDraft}
                  placeholder="多个标签用逗号分隔"
                  onChange={(event) => onTagsDraftChange(event.target.value)}
                  onBlur={() => {
                    onPersistPackageMetadata(false)
                  }}
                />
              </label>

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
              </div>
            </div>
          ) : (
            <p className="metadata-empty-tip">当前无可编辑图包</p>
          )}
        </div>
      )}
    </div>
  )
}
