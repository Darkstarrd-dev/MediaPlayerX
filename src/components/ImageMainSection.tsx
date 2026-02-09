import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type RefObject } from 'react'

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
  const marqueeListenerCleanupRef = useRef<(() => void) | null>(null)
  const dragToggleCleanupRef = useRef<(() => void) | null>(null)
  const [marqueeRect, setMarqueeRect] = useState<{
    startX: number
    startY: number
    currentX: number
    currentY: number
  } | null>(null)

  const marqueeStyle = useMemo(() => {
    if (!marqueeRect) {
      return null
    }

    const left = Math.min(marqueeRect.startX, marqueeRect.currentX)
    const top = Math.min(marqueeRect.startY, marqueeRect.currentY)
    const width = Math.abs(marqueeRect.currentX - marqueeRect.startX)
    const height = Math.abs(marqueeRect.currentY - marqueeRect.startY)
    return {
      left,
      top,
      width,
      height,
    }
  }, [marqueeRect])

  const detachMarqueeListeners = useCallback(() => {
    const cleanup = marqueeListenerCleanupRef.current
    if (cleanup) {
      marqueeListenerCleanupRef.current = null
      cleanup()
    }
  }, [])

  const detachDragToggleListeners = useCallback(() => {
    const cleanup = dragToggleCleanupRef.current
    if (cleanup) {
      dragToggleCleanupRef.current = null
      cleanup()
    }
  }, [])

  useEffect(() => {
    if (!manageMode) {
      detachMarqueeListeners()
      detachDragToggleListeners()
      setMarqueeRect(null)
    }

    return () => {
      detachMarqueeListeners()
      detachDragToggleListeners()
    }
  }, [detachDragToggleListeners, detachMarqueeListeners, manageMode])

  const startMarqueeSelection = (event: ReactMouseEvent<HTMLElement>) => {
    if (!manageMode || event.button !== 0) {
      return
    }

    const target = event.target
    if (!(target instanceof Element)) {
      return
    }

    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('label') ||
      target.closest('img')
    ) {
      return
    }

    event.preventDefault()
    detachMarqueeListeners()

    const container = event.currentTarget
    const startX = event.clientX
    const startY = event.clientY
    const minSelectionDistance = 4
    setMarqueeRect({
      startX,
      startY,
      currentX: startX,
      currentY: startY,
    })

    const collectHitImageIds = (currentX: number, currentY: number): string[] => {
      const left = Math.min(startX, currentX)
      const right = Math.max(startX, currentX)
      const top = Math.min(startY, currentY)
      const bottom = Math.max(startY, currentY)
      const hitIds: string[] = []

      const candidates = Array.from(container.querySelectorAll<HTMLElement>('[data-manage-image-id]'))
      for (const candidate of candidates) {
        const imageId = candidate.dataset.manageImageId
        if (!imageId) {
          continue
        }
        const rect = candidate.getBoundingClientRect()
        const intersects = rect.right >= left && rect.left <= right && rect.bottom >= top && rect.top <= bottom
        if (intersects) {
          hitIds.push(imageId)
        }
      }

      return hitIds
    }

    const onMouseMove = (moveEvent: MouseEvent) => {
      setMarqueeRect((previous) =>
        previous
          ? {
              ...previous,
              currentX: moveEvent.clientX,
              currentY: moveEvent.clientY,
            }
          : previous,
      )
    }

    const onMouseUp = (upEvent: MouseEvent) => {
      const deltaX = Math.abs(upEvent.clientX - startX)
      const deltaY = Math.abs(upEvent.clientY - startY)
      const movedEnough = deltaX >= minSelectionDistance || deltaY >= minSelectionDistance
      if (movedEnough) {
        const hitImageIds = collectHitImageIds(upEvent.clientX, upEvent.clientY)
        if (hitImageIds.length > 0 || upEvent.shiftKey) {
          onReplaceCheckedImages(hitImageIds, upEvent.shiftKey)
        }
      }

      setMarqueeRect(null)
      detachMarqueeListeners()
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    marqueeListenerCleanupRef.current = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }

  const startThumbnailDragToggle = (event: ReactMouseEvent<HTMLElement>) => {
    if (!manageMode || event.button !== 0) {
      return
    }

    const target = event.target
    if (!(target instanceof Element)) {
      return
    }

    if (target.closest('.manage-image-checker')) {
      return
    }

    const findCardFromElement = (element: Element | null): HTMLElement | null => {
      if (!(element instanceof Element)) {
        return null
      }
      return element.closest<HTMLElement>('[data-manage-image-id]')
    }

    const toggledImageIds = new Set<string>()
    const toggleFromCard = (card: HTMLElement | null, focusImage: boolean) => {
      if (!card) {
        return
      }

      const imageId = card.dataset.manageImageId
      if (!imageId || toggledImageIds.has(imageId)) {
        return
      }

      toggledImageIds.add(imageId)
      onToggleImageChecked(imageId)

      if (!focusImage) {
        return
      }

      const packageId = card.dataset.managePackageId
      const imageIndex = Number.parseInt(card.dataset.manageImageIndex ?? '', 10)
      const absoluteIndex = Number.parseInt(card.dataset.manageAbsoluteIndex ?? '', 10)
      if (!packageId || Number.isNaN(imageIndex) || Number.isNaN(absoluteIndex)) {
        return
      }

      onSelectImage(packageId, imageIndex, absoluteIndex)
    }

    const firstCard = findCardFromElement(target)
    if (!firstCard) {
      return
    }

    event.preventDefault()
    detachDragToggleListeners()
    toggleFromCard(firstCard, true)

    const onMouseMove = (moveEvent: MouseEvent) => {
      const card = findCardFromElement(document.elementFromPoint(moveEvent.clientX, moveEvent.clientY))
      toggleFromCard(card, false)
    }

    const onMouseUp = () => {
      detachDragToggleListeners()
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    dragToggleCleanupRef.current = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }

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
            className="image-grid"
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
