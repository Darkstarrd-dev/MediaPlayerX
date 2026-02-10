import { type RefObject } from 'react'

import { mediaLocatorFileName } from '../features/backend'
import { useManageImageSelectionInteractions } from '../features/management/useManageImageSelectionInteractions'
import type { FocusedImageRef, ImagePackage, VectorCandidate } from '../types'

interface ImageMainSectionProps {
  vectorMode: boolean
  showNamesOnly: boolean
  loading: boolean
  placeholderCount: number
  enableLoadingSkeleton: boolean
  activePackage: ImagePackage | null
  focusedRef: FocusedImageRef | null
  focusedImageExists: boolean
  visibleImageRefs: FocusedImageRef[]
  refsInPage: FocusedImageRef[]
  pageStart: number
  actualCellWidth: number
  actualMediaHeight: number
  thumbnailColumns: number
  thumbnailGap: number
  vectorCandidates: VectorCandidate[]
  normalizedPageIndex: number
  imageTotalPages: number
  packageById: Map<string, ImagePackage>
  imageUrlById: Record<string, string>
  gridRef: RefObject<HTMLDivElement | null>
  onToggleShowNamesOnly: () => void
  onEnterFullscreen: () => void
  onSelectImage: (packageId: string, imageIndex: number, absoluteIndex: number) => void
  manageMode: boolean
  checkedImageIds: ReadonlySet<string>
  onToggleImageChecked: (imageId: string, checked?: boolean) => void
  onReplaceCheckedImages: (imageIds: string[], append?: boolean) => void
  onPrevPage: () => void
  onNextPage: () => void
}

function ImageMainSection({
  vectorMode,
  showNamesOnly,
  loading,
  placeholderCount,
  enableLoadingSkeleton,
  activePackage,
  focusedRef,
  focusedImageExists,
  visibleImageRefs,
  refsInPage,
  pageStart,
  actualCellWidth,
  actualMediaHeight,
  thumbnailColumns,
  thumbnailGap,
  vectorCandidates,
  normalizedPageIndex,
  imageTotalPages,
  packageById,
  imageUrlById,
  gridRef,
  manageMode,
  checkedImageIds,
  onToggleImageChecked,
  onReplaceCheckedImages,
  onToggleShowNamesOnly,
  onEnterFullscreen,
  onSelectImage,
  onPrevPage,
  onNextPage,
}: ImageMainSectionProps) {
  const showSkeleton = !showNamesOnly && enableLoadingSkeleton && loading && refsInPage.length === 0
  const { marqueeStyle, startMarqueeSelection, startThumbnailDragToggle } = useManageImageSelectionInteractions({
    manageMode,
    onReplaceCheckedImages,
    onToggleImageChecked,
    onSelectImage,
  })

  return (
    <>
      <div className="main-toolbar">
        <strong className="main-toolbar-title">
          {vectorMode
            ? '向量结果视图'
            : `${activePackage?.displayName ?? '无图包'} (${visibleImageRefs.length} 张)`}
        </strong>
        <div className="toolbar-actions">
          <button
            className={`toolbar-icon-btn ${showNamesOnly ? 'is-names-mode' : 'is-grid-mode'}`}
            type="button"
            aria-label={showNamesOnly ? '当前纯文件名模式，切换到缩略图模式' : '当前缩略图模式，切换到纯文件名模式'}
            title={showNamesOnly ? '切换到缩略图模式' : '切换到纯文件名模式'}
            onClick={onToggleShowNamesOnly}
          >
            <span aria-hidden="true">{showNamesOnly ? '≡' : '▦'}</span>
          </button>
          <button
            className="toolbar-icon-btn"
            type="button"
            aria-label="进入全屏"
            title="进入全屏"
            onClick={onEnterFullscreen}
            disabled={!focusedImageExists}
          >
            <span aria-hidden="true">⛶</span>
          </button>
        </div>
      </div>

      {showNamesOnly ? (
        <div className={`name-list ${manageMode ? 'is-manage' : ''}`} ref={gridRef}>
          <div className="name-list-header">
            {manageMode ? <span aria-hidden="true" /> : null}
            <span>文件名</span>
            <span>文件大小</span>
            <span>分辨率</span>
          </div>
          <div className="name-list-body" onMouseDown={startMarqueeSelection}>
            {visibleImageRefs.map((ref, absoluteIndex) => {
              const pkg = packageById.get(ref.packageId)
              const image = pkg?.images[ref.imageIndex]
              if (!pkg || !image) {
                return null
              }

              const fileName = mediaLocatorFileName(image.mediaLocator)
              const isFocused = focusedRef?.packageId === ref.packageId && focusedRef.imageIndex === ref.imageIndex
              const isChecked = checkedImageIds.has(image.id)

              if (manageMode) {
                return (
                  <div
                    key={`${ref.packageId}-${ref.imageIndex}`}
                    data-manage-image-id={image.id}
                    data-manage-package-id={ref.packageId}
                    data-manage-image-index={String(ref.imageIndex)}
                    data-manage-absolute-index={String(absoluteIndex)}
                    className={`name-list-row is-manage ${image.hidden ? 'is-hidden' : ''} ${isFocused ? 'is-focused' : ''}`}
                  >
                    <input
                      className="manage-image-checker"
                      aria-label={`manage-image-${image.id}`}
                      checked={isChecked}
                      type="checkbox"
                      onChange={(event) => onToggleImageChecked(image.id, event.target.checked)}
                    />
                    <button
                      className="name-list-row-main"
                      type="button"
                      onClick={() => onSelectImage(ref.packageId, ref.imageIndex, absoluteIndex)}
                      onDoubleClick={onEnterFullscreen}
                    >
                      <span>{`${image.hidden ? '[隐藏] ' : ''}${pkg.displayName}/${fileName}`}</span>
                      <span>{`${image.sizeKb}KB`}</span>
                      <span>{image.width > 0 && image.height > 0 ? `${image.width} x ${image.height}` : '-'}</span>
                    </button>
                  </div>
                )
              }

              return (
                <button
                  key={`${ref.packageId}-${ref.imageIndex}`}
                  className={`name-list-row ${isFocused ? 'is-focused' : ''}`}
                  type="button"
                  onClick={() => onSelectImage(ref.packageId, ref.imageIndex, absoluteIndex)}
                  onDoubleClick={onEnterFullscreen}
                >
                  <span>{`${pkg.displayName}/${fileName}`}</span>
                  <span>{`${image.sizeKb}KB`}</span>
                  <span>{image.width > 0 && image.height > 0 ? `${image.width} x ${image.height}` : '-'}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <> 
          <div
            className={`image-grid ${manageMode ? 'is-manage' : ''}`}
            ref={gridRef}
            onMouseDown={manageMode ? startThumbnailDragToggle : undefined}
            style={{
              gridTemplateColumns: `repeat(${thumbnailColumns}, ${actualCellWidth}px)`,
              gap: `${thumbnailGap}px`,
            }}
          >
            {showSkeleton
              ? Array.from({ length: Math.max(1, placeholderCount) }).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="thumb-card is-skeleton"
                    style={{ width: `${actualCellWidth}px` }}
                  >
                    <div className="thumb-placeholder" style={{ aspectRatio: `${actualCellWidth} / ${actualMediaHeight}` }}>
                      <div className="thumb-media thumb-media-empty" style={{ width: '100%', height: '100%' }} />
                    </div>
                  </div>
                ))
              : refsInPage.map((ref, pageIndex) => {
              const pkg = packageById.get(ref.packageId)
              const image = pkg?.images[ref.imageIndex]
              if (!pkg || !image) {
                return null
              }

               const absoluteIndex = pageStart + pageIndex
               const isFocused = focusedRef?.packageId === ref.packageId && focusedRef.imageIndex === ref.imageIndex
               const imageSrc = imageUrlById[image.id] ?? ''
               const isChecked = checkedImageIds.has(image.id)

               if (manageMode) {
                 return (
                   <div
                      key={`${ref.packageId}-${ref.imageIndex}`}
                      data-manage-image-id={image.id}
                      data-manage-package-id={ref.packageId}
                      data-manage-image-index={String(ref.imageIndex)}
                      data-manage-absolute-index={String(absoluteIndex)}
                      className={`thumb-card is-manage ${image.hidden ? 'is-hidden' : ''} ${isFocused ? 'is-focused' : ''}`}
                      style={{ width: `${actualCellWidth}px` }}
                    >
                      <input
                        className="manage-image-checker"
                       aria-label={`manage-image-${image.id}`}
                        checked={isChecked}
                        type="checkbox"
                        onMouseDown={(event) => {
                          event.stopPropagation()
                        }}
                        onChange={(event) => onToggleImageChecked(image.id, event.target.checked)}
                      />
                     <button
                       className="thumb-card-main"
                       type="button"
                       onClick={() => onSelectImage(ref.packageId, ref.imageIndex, absoluteIndex)}
                       onDoubleClick={onEnterFullscreen}
                     >
                       {image.hidden ? <span className="manage-hidden-badge">已隐藏</span> : null}
                       <span className="visually-hidden">{`${pkg.displayName} #${image.ordinal}`}</span>
                       {vectorMode ? (
                         <span className="visually-hidden">{`相似度 ${(vectorCandidates[absoluteIndex]?.score ?? 0).toFixed(2)}`}</span>
                       ) : null}
                       <div className="thumb-placeholder" style={{ aspectRatio: `${actualCellWidth} / ${actualMediaHeight}` }}>
                         <div className="thumb-media" style={{ width: '100%', height: '100%' }}>
                           {imageSrc ? (
                             <img
                               className="thumb-media-image"
                               src={imageSrc}
                               alt={`${pkg.displayName} #${image.ordinal}`}
                               loading="lazy"
                               draggable={false}
                             />
                           ) : (
                             <div className="thumb-media-empty" />
                           )}
                         </div>
                       </div>
                     </button>
                   </div>
                 )
               }

               return (
                 <button
                   key={`${ref.packageId}-${ref.imageIndex}`}
                   className={`thumb-card ${isFocused ? 'is-focused' : ''}`}
                   style={{ width: `${actualCellWidth}px` }}
                   type="button"
                   onClick={() => onSelectImage(ref.packageId, ref.imageIndex, absoluteIndex)}
                   onDoubleClick={onEnterFullscreen}
                 >
                   <span className="visually-hidden">{`${pkg.displayName} #${image.ordinal}`}</span>
                   {vectorMode ? (
                     <span className="visually-hidden">{`相似度 ${(vectorCandidates[absoluteIndex]?.score ?? 0).toFixed(2)}`}</span>
                   ) : null}
                   <div className="thumb-placeholder" style={{ aspectRatio: `${actualCellWidth} / ${actualMediaHeight}` }}>
                     <div className="thumb-media" style={{ width: '100%', height: '100%' }}>
                       {imageSrc ? (
                         <img
                           className="thumb-media-image"
                           src={imageSrc}
                           alt={`${pkg.displayName} #${image.ordinal}`}
                           loading="lazy"
                           draggable={false}
                         />
                       ) : (
                         <div className="thumb-media-empty" />
                       )}
                     </div>
                   </div>
                 </button>
               )
             })}
          </div>

          <div className="pager-line">
            <button type="button" onClick={onPrevPage}>
              上一页
            </button>
            <span>{`第 ${normalizedPageIndex + 1} / ${imageTotalPages} 页`}</span>
            <button type="button" onClick={onNextPage}>
              下一页
            </button>
          </div>
        </>
      )}

      {marqueeStyle && marqueeStyle.width > 2 && marqueeStyle.height > 2 ? (
        <div
          className="manage-selection-marquee"
          style={{
            left: `${marqueeStyle.left}px`,
            top: `${marqueeStyle.top}px`,
            width: `${marqueeStyle.width}px`,
            height: `${marqueeStyle.height}px`,
          }}
        />
      ) : null}
    </>
  )
}

export default ImageMainSection
