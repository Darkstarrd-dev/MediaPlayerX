import { useEffect, useState, type RefObject } from 'react'

import { mediaLocatorFileName } from '../features/backend'
import { useManageImageSelectionInteractions } from '../features/management/useManageImageSelectionInteractions'
import type { ParsedExternalMetadata } from '../features/metadata/parseExternalMetadata'
import type { FocusedImageRef, ImagePackage, VectorCandidate } from '../types'
import MetadataFetchPanel from './metadata/MetadataFetchPanel'

interface ImageMainSectionProps {
  vectorMode: boolean
  showNamesOnly: boolean
  metadataManageMode: boolean
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
  onGridElementChange: (element: HTMLDivElement | null) => void
  onToggleShowNamesOnly: () => void
  onEnterFullscreen: () => void
  canJumpToAnimation: boolean
  onJumpToAnimation: () => void
  onSelectImage: (packageId: string, imageIndex: number, absoluteIndex: number) => void
  metadataPending: boolean
  metadataTargetPackageLabel: string
  metadataFetchDefaultText: string
  metadataProxyServer: string
  metadataEhentaiCookies: string
  onMetadataSyncName: () => void
  onMetadataSaveParsed: (parsed: ParsedExternalMetadata) => Promise<void>
  manageMode: boolean
  sidebarSelectedCount: number
  imageSelectedCount: number
  activeSelectionScope: 'sidebar' | 'image' | null
  pendingManageAction: boolean
  manageOperationHint: string | null
  canManageDelete: boolean
  canManageHide: boolean
  canManageUnhide: boolean
  adReviewFeatureEnabled: boolean
  adReviewPanelOpen: boolean
  checkedImageIds: ReadonlySet<string>
  adReviewScopeImageIds: ReadonlySet<string>
  adReviewLlmReviewedImageIds: ReadonlySet<string>
  adReviewNonLlmReviewedImageIds: ReadonlySet<string>
  onToggleImageChecked: (imageId: string, checked?: boolean) => void
  onReplaceCheckedImages: (imageIds: string[], append?: boolean) => void
  onManageDelete: () => void
  onManageHide: () => void
  onManageUnhide: () => void
  onToggleAdReviewPanel: () => void
  onClearManageSelection: () => void
  onPrevPage: () => void
  onNextPage: () => void
  nodeBrowseMode?: boolean
  nodeBrowseLabel?: string
  nodeBrowseItems?: Array<{
    nodeId: string
    imageSourceId?: string
    imageNodeType: 'folder' | 'package' | 'directory'
    label: string
    packageCount: number
    imageCount: number
    descendantNodeCount: number
    coverImageUrl: string | null
  }>
  onSelectNodeBrowseItem?: (nodeId: string, imageSourceId?: string) => void
}

function ImageMainSection({
  vectorMode,
  showNamesOnly,
  metadataManageMode,
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
  onGridElementChange,
  manageMode,
  sidebarSelectedCount,
  imageSelectedCount,
  activeSelectionScope,
  pendingManageAction,
  manageOperationHint,
  canManageDelete,
  canManageHide,
  canManageUnhide,
  adReviewFeatureEnabled,
  adReviewPanelOpen,
  checkedImageIds,
  adReviewScopeImageIds,
  adReviewLlmReviewedImageIds,
  adReviewNonLlmReviewedImageIds,
  onToggleImageChecked,
  onReplaceCheckedImages,
  onManageDelete,
  onManageHide,
  onManageUnhide,
  onToggleAdReviewPanel,
  onClearManageSelection,
  onToggleShowNamesOnly,
  onEnterFullscreen,
  canJumpToAnimation,
  onJumpToAnimation,
  onSelectImage,
  metadataPending,
  metadataTargetPackageLabel,
  metadataFetchDefaultText,
  metadataProxyServer,
  metadataEhentaiCookies,
  onMetadataSyncName,
  onMetadataSaveParsed,
  onPrevPage,
  onNextPage,
  nodeBrowseMode = false,
  nodeBrowseLabel = '',
  nodeBrowseItems = [],
  onSelectNodeBrowseItem,
}: ImageMainSectionProps) {
  const [metadataFetchOpen, setMetadataFetchOpen] = useState(false)
  const showSkeleton = !showNamesOnly && enableLoadingSkeleton && loading && refsInPage.length === 0

  useEffect(() => {
    onGridElementChange(gridRef.current)
    return () => {
      onGridElementChange(null)
    }
  }, [gridRef, nodeBrowseMode, onGridElementChange, showNamesOnly])

  const { marqueeStyle, startMarqueeSelection, startThumbnailDragToggle } = useManageImageSelectionInteractions({
    manageMode,
    onReplaceCheckedImages,
    onToggleImageChecked,
    onSelectImage,
  })

  const manageSummary =
    activeSelectionScope === 'sidebar'
      ? `已选目录节点: ${sidebarSelectedCount}`
      : activeSelectionScope === 'image'
        ? `已选媒体条目: ${imageSelectedCount}`
        : '未选择条目'

  return (
    <>
      <div className="main-toolbar">
        {manageMode ? (
          <>
            <div className="toolbar-actions toolbar-actions-manage">
              <button className="vector-search-btn" type="button" disabled={!canManageDelete || pendingManageAction} onClick={onManageDelete}>
                删除
              </button>
              {adReviewFeatureEnabled ? (
                <button
                  className={`feature-action-btn ${adReviewPanelOpen ? 'is-active' : ''}`}
                  type="button"
                  disabled={pendingManageAction}
                  onClick={onToggleAdReviewPanel}
                >
                  广告审核
                </button>
              ) : null}
              <button className="feature-action-btn" type="button" disabled={!canManageHide || pendingManageAction} onClick={onManageHide}>
                隐藏
              </button>
              <button className="feature-action-btn" type="button" disabled={!canManageUnhide || pendingManageAction} onClick={onManageUnhide}>
                取消隐藏
              </button>
              <button className="feature-action-btn" type="button" disabled={pendingManageAction} onClick={onClearManageSelection}>
                清空选择
              </button>
              {manageOperationHint ? <span className="main-toolbar-hint">{manageOperationHint}</span> : null}
            </div>
            <strong className="main-toolbar-summary" title={manageSummary}>
              {manageSummary}
            </strong>
          </>
        ) : metadataManageMode ? (
          <>
            <strong className="main-toolbar-title">元数据管理</strong>
            <div className="toolbar-actions toolbar-actions-manage">
              <button className="feature-action-btn" type="button" disabled={metadataPending} onClick={onMetadataSyncName}>
                同步名称
              </button>
              <button className="feature-action-btn" type="button" onClick={() => setMetadataFetchOpen(true)}>
                获取元数据
              </button>
              {manageOperationHint ? <span className="main-toolbar-hint">{manageOperationHint}</span> : null}
            </div>
          </>
        ) : (
          <>
            <strong className="main-toolbar-title">
              {nodeBrowseMode
                ? `${nodeBrowseLabel || '节点浏览'} (${nodeBrowseItems.length} 项)`
                : vectorMode
                  ? '检索结果视图'
                  : `${activePackage?.displayName ?? '无图包'} (${visibleImageRefs.length} 张)`}
            </strong>
            <div className="toolbar-actions">
              {canJumpToAnimation ? (
                <button
                  className="toolbar-icon-btn"
                  type="button"
                  aria-label="动画版"
                  title="动画版"
                  onClick={onJumpToAnimation}
                >
                  <span aria-hidden="true">▶</span>
                </button>
              ) : null}
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
          </>
        )}
      </div>

      {nodeBrowseMode ? (
        <div
          className="image-grid node-browse-grid"
          ref={gridRef}
          style={{
            gridTemplateColumns: `repeat(${thumbnailColumns}, ${actualCellWidth}px)`,
            gap: `${thumbnailGap}px`,
          }}
        >
          {nodeBrowseItems.map((item) => (
            <div key={item.nodeId} className="thumb-card" style={{ width: `${actualCellWidth}px` }}>
              <button
                className="thumb-card-main"
                type="button"
                onClick={() => onSelectNodeBrowseItem?.(item.nodeId, item.imageSourceId)}
              >
                <div className="thumb-placeholder" style={{ aspectRatio: '1 / 1' }}>
                  <div className="thumb-media" style={{ width: '100%', height: '100%' }}>
                    {item.coverImageUrl ? (
                      <img
                        className="thumb-media-image"
                        src={item.coverImageUrl}
                        alt={item.label}
                        loading="lazy"
                        draggable={false}
                      />
                    ) : (
                      <div className="thumb-media-empty" />
                    )}
                  </div>
                </div>
                <div className="node-browse-caption">
                  <strong>{item.label}</strong>
                  <span>
                    {item.imageNodeType === 'folder' ? `包含节点 ${item.descendantNodeCount}` : `图片 ${item.imageCount}`}
                  </span>
                </div>
              </button>
            </div>
          ))}
        </div>
      ) : showNamesOnly ? (
        <div className={`name-list ${manageMode ? 'is-manage' : ''}`} ref={gridRef}>
          <div className="name-list-header">
            <span>文件名</span>
            <span>文件大小</span>
            <span>分辨率</span>
          </div>
          <div
            className="name-list-body"
            onMouseDown={(event) => {
              startMarqueeSelection(event)
              startThumbnailDragToggle(event)
            }}
          >
            {visibleImageRefs.map((ref, absoluteIndex) => {
              const pkg = packageById.get(ref.packageId)
              const image = pkg?.images[ref.imageIndex]
              if (!pkg || !image) {
                return null
              }

              const fileName = mediaLocatorFileName(image.mediaLocator)
              const isFocused = focusedRef?.packageId === ref.packageId && focusedRef.imageIndex === ref.imageIndex
              const isChecked = checkedImageIds.has(image.id)
              const inAdReviewScope = adReviewScopeImageIds.has(image.id)
              const isAdReviewLlmReviewed = adReviewLlmReviewedImageIds.has(image.id)
              const isAdReviewNonLlmReviewed = adReviewNonLlmReviewedImageIds.has(image.id)
              const isAdReviewPending = inAdReviewScope && !isAdReviewLlmReviewed && !isAdReviewNonLlmReviewed
              return (
                <div
                  key={`${ref.packageId}-${ref.imageIndex}`}
                  data-manage-image-id={image.id}
                  data-manage-package-id={ref.packageId}
                  data-manage-image-index={String(ref.imageIndex)}
                  data-manage-absolute-index={String(absoluteIndex)}
                  className={`name-list-row ${manageMode ? 'is-manage' : ''} ${manageMode && isChecked ? 'is-selected' : ''} ${manageMode && image.hidden ? 'is-hidden' : ''} ${isFocused ? 'is-focused' : ''} ${manageMode && inAdReviewScope ? 'is-ad-review-scope' : ''} ${manageMode && isAdReviewPending ? 'is-ad-review-pending' : ''} ${manageMode && isAdReviewLlmReviewed ? 'is-ad-reviewed-llm' : ''} ${manageMode && isAdReviewNonLlmReviewed ? 'is-ad-reviewed-non-llm' : ''}`}
                >
                  <button
                    className="name-list-row-main"
                    type="button"
                    onClick={!manageMode ? () => onSelectImage(ref.packageId, ref.imageIndex, absoluteIndex) : undefined}
                    onDoubleClick={!manageMode ? onEnterFullscreen : undefined}
                  >
                    <span>{`${manageMode && image.hidden ? '[隐藏] ' : ''}${pkg.displayName}/${fileName}`}</span>
                    <span>{`${image.sizeKb}KB`}</span>
                    <span>{image.width > 0 && image.height > 0 ? `${image.width} x ${image.height}` : '-'}</span>
                  </button>
                </div>
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
                    <div className="thumb-placeholder" style={{ aspectRatio: '1 / 1' }}>
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
                const inAdReviewScope = adReviewScopeImageIds.has(image.id)
                const isAdReviewLlmReviewed = adReviewLlmReviewedImageIds.has(image.id)
                const isAdReviewNonLlmReviewed = adReviewNonLlmReviewedImageIds.has(image.id)
                const isAdReviewPending = inAdReviewScope && !isAdReviewLlmReviewed && !isAdReviewNonLlmReviewed
                return (
                  <div
                    key={`${ref.packageId}-${ref.imageIndex}`}
                    data-manage-image-id={image.id}
                    data-manage-package-id={ref.packageId}
                    data-manage-image-index={String(ref.imageIndex)}
                    data-manage-absolute-index={String(absoluteIndex)}
                    className={`thumb-card ${manageMode ? 'is-manage' : ''} ${manageMode && isChecked ? 'is-selected' : ''} ${manageMode && image.hidden ? 'is-hidden' : ''} ${isFocused ? 'is-focused' : ''} ${manageMode && inAdReviewScope ? 'is-ad-review-scope' : ''} ${manageMode && isAdReviewPending ? 'is-ad-review-pending' : ''} ${manageMode && isAdReviewLlmReviewed ? 'is-ad-reviewed-llm' : ''} ${manageMode && isAdReviewNonLlmReviewed ? 'is-ad-reviewed-non-llm' : ''}`}
                    style={{ width: `${actualCellWidth}px` }}
                  >
                    <button
                      className="thumb-card-main"
                      type="button"
                      onClick={!manageMode ? () => onSelectImage(ref.packageId, ref.imageIndex, absoluteIndex) : undefined}
                      onDoubleClick={!manageMode ? onEnterFullscreen : undefined}
                    >
                      {manageMode && image.hidden ? <span className="manage-hidden-badge">已隐藏</span> : null}
                      <span className="visually-hidden">{`${pkg.displayName} #${image.ordinal}`}</span>
                      {vectorMode ? (
                        <span className="visually-hidden">{`相似度 ${(vectorCandidates[absoluteIndex]?.score ?? 0).toFixed(2)}`}</span>
                      ) : null}
                      <div className="thumb-placeholder" style={{ aspectRatio: '1 / 1' }}>
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
              })}
          </div>

          {imageTotalPages > 1 ? (
            <div className="pager-line">
              <button type="button" onClick={onPrevPage}>
                上一页
              </button>
              <span>{`第 ${normalizedPageIndex + 1} / ${imageTotalPages} 页`}</span>
              <button type="button" onClick={onNextPage}>
                下一页
              </button>
            </div>
          ) : null}
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

      <MetadataFetchPanel
        open={metadataFetchOpen}
        defaultText={metadataFetchDefaultText}
        proxyServer={metadataProxyServer}
        ehentaiCookies={metadataEhentaiCookies}
        metadataPending={metadataPending}
        targetPackageLabel={metadataTargetPackageLabel}
        onClose={() => setMetadataFetchOpen(false)}
        onSaveParsedMetadata={onMetadataSaveParsed}
      />
    </>
  )
}

export default ImageMainSection
