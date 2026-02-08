import type { RefObject } from 'react'

import { mediaLocatorFileName } from '../features/backend'
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
  onToggleShowNamesOnly,
  onEnterFullscreen,
  onSelectImage,
  onPrevPage,
  onNextPage,
}: ImageMainSectionProps) {
  const showSkeleton = !showNamesOnly && enableLoadingSkeleton && loading

  return (
    <>
      <div className="main-toolbar">
        <strong>
          {vectorMode
            ? '向量结果视图'
            : `${activePackage?.displayName ?? '无图包'} (${visibleImageRefs.length} 张)`}
        </strong>
        <div className="toolbar-actions">
          <button type="button" onClick={onToggleShowNamesOnly}>
            {showNamesOnly ? '显示缩略图' : '纯文件名模式'}
          </button>
          <button type="button" onClick={onEnterFullscreen} disabled={!focusedImageExists}>
            进入全屏
          </button>
        </div>
      </div>

      {showNamesOnly ? (
        <div className="name-list" ref={gridRef}>
          <div className="name-list-header">
            <span>文件名</span>
            <span>文件大小</span>
            <span>分辨率</span>
          </div>
          <div className="name-list-body">
            {visibleImageRefs.map((ref, absoluteIndex) => {
              const pkg = packageById.get(ref.packageId)
              const image = pkg?.images[ref.imageIndex]
              if (!pkg || !image) {
                return null
              }

              const fileName = mediaLocatorFileName(image.mediaLocator)
              const isFocused = focusedRef?.packageId === ref.packageId && focusedRef.imageIndex === ref.imageIndex

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
            className="image-grid"
            ref={gridRef}
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
                          onLoad={(event) => {
                            event.currentTarget.style.display = 'block'
                          }}
                          onError={(event) => {
                            event.currentTarget.style.display = 'none'
                          }}
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
    </>
  )
}

export default ImageMainSection
