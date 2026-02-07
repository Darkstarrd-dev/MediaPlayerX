import type { RefObject } from 'react'

import type { FocusedImageRef, ImagePackage, VectorCandidate } from '../types'

interface ImageMainSectionProps {
  vectorMode: boolean
  showNamesOnly: boolean
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
  gridRef,
  onToggleShowNamesOnly,
  onEnterFullscreen,
  onSelectImage,
  onPrevPage,
  onNextPage,
}: ImageMainSectionProps) {
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

              const fileName = `img_${image.ordinal.toString().padStart(4, '0')}.jpg`
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
                  <span>{`${image.width} x ${image.height}`}</span>
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
            {refsInPage.map((ref, pageIndex) => {
              const pkg = packageById.get(ref.packageId)
              const image = pkg?.images[ref.imageIndex]
              if (!pkg || !image) {
                return null
              }

              const imageRatio = image.width / image.height
              const frameRatio = actualCellWidth / actualMediaHeight
              const mediaSizing =
                imageRatio >= frameRatio
                  ? {
                      width: '100%',
                      aspectRatio: `${image.width} / ${image.height}`,
                    }
                  : {
                      height: '100%',
                      aspectRatio: `${image.width} / ${image.height}`,
                    }

              const absoluteIndex = pageStart + pageIndex
              const isFocused = focusedRef?.packageId === ref.packageId && focusedRef.imageIndex === ref.imageIndex

              return (
                <button
                  key={`${ref.packageId}-${ref.imageIndex}`}
                  className={`thumb-card ${isFocused ? 'is-focused' : ''}`}
                  style={{ width: `${actualCellWidth}px` }}
                  type="button"
                  onClick={() => onSelectImage(ref.packageId, ref.imageIndex, absoluteIndex)}
                  onDoubleClick={onEnterFullscreen}
                >
                  <div className="thumb-placeholder" style={{ aspectRatio: `${actualCellWidth} / ${actualMediaHeight}` }}>
                    <div className="thumb-media" style={{ ...mediaSizing, background: image.color }}>
                      <span>{`${image.width} x ${image.height}`}</span>
                    </div>
                  </div>
                  <div className="thumb-caption">
                    <strong>{`${pkg.displayName} #${image.ordinal}`}</strong>
                    {vectorMode ? <small>{`相似度 ${(vectorCandidates[absoluteIndex]?.score ?? 0).toFixed(2)}`}</small> : null}
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
