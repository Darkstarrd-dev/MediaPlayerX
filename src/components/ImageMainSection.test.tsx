import { createRef } from 'react'

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ImagePackage } from '../types'
import ImageMainSection from './ImageMainSection'

const basePackage: ImagePackage = {
  id: 'pkg-1',
  packageName: 'pkg-1.zip',
  displayName: 'pkg-1',
  absolutePath: 'C:/mock/pkg-1.zip',
  treePath: ['pkg-1'],
  workTitle: 'pkg-1',
  circle: 'circle',
  author: 'author',
  tags: [],
  images: [],
}

function renderImageMainSection() {
  return render(
    <ImageMainSection
      vectorMode={false}
      showNamesOnly={false}
      metadataManageMode={false}
      loading={false}
      placeholderCount={1}
      enableLoadingSkeleton={false}
      activePackage={basePackage}
      focusedRef={null}
      focusedImageExists={false}
      visibleImageRefs={[]}
      refsInPage={[]}
      pageStart={0}
      actualCellWidth={120}
      actualMediaHeight={108}
      thumbnailColumns={8}
      thumbnailGap={8}
      vectorCandidates={[]}
      packageById={new Map([[basePackage.id, basePackage]])}
      imageUrlById={{}}
      gridRef={createRef<HTMLDivElement>()}
      onGridElementChange={vi.fn()}
      onToggleShowNamesOnly={vi.fn()}
      onEnterFullscreen={vi.fn()}
      canJumpToAnimation={false}
      onJumpToAnimation={vi.fn()}
      onSelectImage={vi.fn()}
      metadataPending={false}
      metadataTargetPackageLabel={basePackage.displayName}
      metadataFetchDefaultText={basePackage.packageName}
      metadataProxyServer={''}
      metadataEhentaiCookies={''}
      onMetadataSyncName={vi.fn()}
      onMetadataSaveParsed={async () => undefined}
      manageMode={false}
      sidebarSelectedCount={0}
      imageSelectedCount={0}
      activeSelectionScope={null}
      pendingManageAction={false}
      manageOperationHint={null}
      canManageDelete={false}
      canManageHide={false}
      canManageUnhide={false}
      adReviewFeatureEnabled={false}
      adReviewPanelOpen={false}
      checkedImageIds={new Set()}
      adReviewScopeImageIds={new Set()}
      adReviewLlmReviewedImageIds={new Set()}
      adReviewNonLlmReviewedImageIds={new Set()}
      onToggleImageChecked={vi.fn()}
      onReplaceCheckedImages={vi.fn()}
      onManageDelete={vi.fn()}
      onManageHide={vi.fn()}
      onManageUnhide={vi.fn()}
      onToggleAdReviewPanel={vi.fn()}
      onClearManageSelection={vi.fn()}
    />,
  )
}

function renderNodeBrowseSection() {
  return render(
    <ImageMainSection
      vectorMode={false}
      showNamesOnly={false}
      metadataManageMode={false}
      loading={false}
      placeholderCount={1}
      enableLoadingSkeleton={false}
      activePackage={basePackage}
      focusedRef={null}
      focusedImageExists={false}
      visibleImageRefs={[]}
      refsInPage={[]}
      pageStart={0}
      actualCellWidth={120}
      actualMediaHeight={108}
      thumbnailColumns={8}
      thumbnailGap={8}
      vectorCandidates={[]}
      packageById={new Map([[basePackage.id, basePackage]])}
      imageUrlById={{}}
      gridRef={createRef<HTMLDivElement>()}
      onGridElementChange={vi.fn()}
      onToggleShowNamesOnly={vi.fn()}
      onEnterFullscreen={vi.fn()}
      canJumpToAnimation={false}
      onJumpToAnimation={vi.fn()}
      onSelectImage={vi.fn()}
      metadataPending={false}
      metadataTargetPackageLabel={basePackage.displayName}
      metadataFetchDefaultText={basePackage.packageName}
      metadataProxyServer={''}
      metadataEhentaiCookies={''}
      onMetadataSyncName={vi.fn()}
      onMetadataSaveParsed={async () => undefined}
      manageMode={false}
      sidebarSelectedCount={0}
      imageSelectedCount={0}
      activeSelectionScope={null}
      pendingManageAction={false}
      manageOperationHint={null}
      canManageDelete={false}
      canManageHide={false}
      canManageUnhide={false}
      adReviewFeatureEnabled={false}
      adReviewPanelOpen={false}
      checkedImageIds={new Set()}
      adReviewScopeImageIds={new Set()}
      adReviewLlmReviewedImageIds={new Set()}
      adReviewNonLlmReviewedImageIds={new Set()}
      onToggleImageChecked={vi.fn()}
      onReplaceCheckedImages={vi.fn()}
      onManageDelete={vi.fn()}
      onManageHide={vi.fn()}
      onManageUnhide={vi.fn()}
      onToggleAdReviewPanel={vi.fn()}
      onClearManageSelection={vi.fn()}
      nodeBrowseMode={true}
      nodeBrowseLabel="目录A"
      nodeBrowseItems={[
        {
          nodeId: 'folder-1',
          label: '子目录-示例',
          imageNodeType: 'folder',
          packageCount: 0,
          imageCount: 12,
          descendantNodeCount: 3,
          coverImageUrl: null,
        },
      ]}
      onSelectNodeBrowseItem={vi.fn()}
    />,
  )
}

describe('ImageMainSection layout', () => {
  it('主区不再渲染分页容器与翻页按钮', () => {
    renderImageMainSection()

    expect(document.querySelector('.pager-line')).toBeNull()
    expect(screen.queryByRole('button', { name: '上一页' })).toBeNull()
    expect(screen.queryByRole('button', { name: '下一页' })).toBeNull()
  })

  it('节点浏览缩略图仅显示封面，不显示名称与数量文案', () => {
    renderNodeBrowseSection()

    expect(document.querySelector('.node-browse-caption')).toBeNull()
    expect(screen.queryByText('图片 12')).toBeNull()
    expect(screen.queryByText('子目录-示例')).toBeNull()
    expect(document.querySelector('.pager-line')).toBeNull()
  })
})
