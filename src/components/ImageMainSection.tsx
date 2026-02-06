import type { RefObject } from 'react'

import type { FocusedImageRef, ImagePackage, VectorCandidate } from '../types'

interface ImageMainSectionProps {
  vectorMode: boolean
  showNamesOnly: boolean
  activePackage: ImagePackage | null
  focusedRef: FocusedImageRef | null
  focusedImageExists: boolean
  refsInPage: FocusedImageRef[]
  pageStart: number
  actualCellWidth: number
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
  refsInPage,
  pageStart,
  actualCellWidth,
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
            : `${activePackage?.displayName ?? '无图包'} (${activePackage?.images.length ?? 0} 张)`}
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

      <div className="image-grid" ref={gridRef}>
        {refsInPage.map((ref, pageIndex) => {
          const pkg = packageById.get(ref.packageId)
          const image = pkg?.images[ref.imageIndex]
          if (!pkg || !image) {
            return null
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
              {showNamesOnly ? (
                <div className="name-only">{`#${image.ordinal.toString().padStart(4, '0')}`}</div>
              ) : (
                <div className="thumb-placeholder" style={{ background: image.color }}>
                  <span>{`${image.width} x ${image.height}`}</span>
                </div>
              )}
              <div className="thumb-caption">
                <strong>{`${pkg.displayName} #${image.ordinal}`}</strong>
                {vectorMode ? <small>{`score ${(vectorCandidates[absoluteIndex]?.score ?? 0).toFixed(2)}`}</small> : null}
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
  )
}

export default ImageMainSection
