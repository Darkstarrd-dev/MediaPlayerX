import { createRef } from 'react'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ImagePackage } from '../types'
import ImageMainSection from './ImageMainSection'
import type { ImageMainSectionProps } from './ImageMainSection.types'

vi.mock('./metadata/MetadataFetchPanel', () => ({
  default: () => null,
}))

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

const packageWithImages: ImagePackage = {
  ...basePackage,
  id: 'pkg-2',
  packageName: 'pkg-2.zip',
  displayName: 'pkg-2',
  images: [
    {
      id: 'img-1',
      ordinal: 1,
      width: 1024,
      height: 768,
      sizeKb: 128,
      cluster: 0,
      color: '#999',
      mediaLocator: {
        kind: 'filesystem',
        absolutePath: 'C:/mock/pkg-2-1.jpg',
        extension: '.jpg',
        mediaType: 'image',
        mimeType: 'image/jpeg',
      },
    },
    {
      id: 'img-2',
      ordinal: 2,
      width: 1024,
      height: 768,
      sizeKb: 128,
      cluster: 0,
      color: '#999',
      mediaLocator: {
        kind: 'filesystem',
        absolutePath: 'C:/mock/pkg-2-2.jpg',
        extension: '.jpg',
        mediaType: 'image',
        mimeType: 'image/jpeg',
      },
    },
  ],
}

const packageWithMoreImages: ImagePackage = {
  ...packageWithImages,
  images: [
    ...packageWithImages.images,
    {
      id: 'img-3',
      ordinal: 3,
      width: 1024,
      height: 768,
      sizeKb: 128,
      cluster: 0,
      color: '#999',
      mediaLocator: {
        kind: 'filesystem',
        absolutePath: 'C:/mock/pkg-2-3.jpg',
        extension: '.jpg',
        mediaType: 'image',
        mimeType: 'image/jpeg',
      },
    },
    {
      id: 'img-4',
      ordinal: 4,
      width: 1024,
      height: 768,
      sizeKb: 128,
      cluster: 0,
      color: '#999',
      mediaLocator: {
        kind: 'filesystem',
        absolutePath: 'C:/mock/pkg-2-4.jpg',
        extension: '.jpg',
        mediaType: 'image',
        mimeType: 'image/jpeg',
      },
    },
  ],
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
      onMetadataSyncName={vi.fn()}
      onMetadataSaveParsed={async () => undefined}
      manageMode={false}
      sidebarSelectedCount={0}
      imageSelectedCount={0}
      activeSelectionScope={null}
      pendingManageAction={false}
      manageOperationHint={null}
      canManageDelete={false}
      canManageMoveNodes={false}
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
      onManageGroup={vi.fn()}
      onManageMove={vi.fn()}
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
      onMetadataSyncName={vi.fn()}
      onMetadataSaveParsed={async () => undefined}
      manageMode={false}
      sidebarSelectedCount={0}
      imageSelectedCount={0}
      activeSelectionScope={null}
      pendingManageAction={false}
      manageOperationHint={null}
      canManageDelete={false}
      canManageMoveNodes={false}
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
      onManageGroup={vi.fn()}
      onManageMove={vi.fn()}
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

function createManageImageConvertProps(overrides: Partial<ImageMainSectionProps> = {}): ImageMainSectionProps {
  const defaultProps: ImageMainSectionProps = {
    vectorMode: false,
    showNamesOnly: false,
    metadataManageMode: false,
    loading: false,
    placeholderCount: 1,
    enableLoadingSkeleton: false,
    activePackage: packageWithImages,
    focusedRef: null,
    focusedImageExists: false,
    visibleImageRefs: [{ packageId: packageWithImages.id, imageIndex: 0 }],
    refsInPage: [{ packageId: packageWithImages.id, imageIndex: 0 }],
    pageStart: 0,
    actualCellWidth: 120,
    actualMediaHeight: 108,
    thumbnailColumns: 2,
    thumbnailGap: 8,
    vectorCandidates: [],
    packageById: new Map([[packageWithImages.id, packageWithImages]]),
    imageUrlById: { 'img-1': 'mock://thumb-1' },
    gridRef: createRef<HTMLDivElement>(),
    onGridElementChange: vi.fn(),
    onToggleShowNamesOnly: vi.fn(),
    onEnterFullscreen: vi.fn(),
    canJumpToAnimation: false,
    onJumpToAnimation: vi.fn(),
    onSelectImage: vi.fn(),
    metadataPending: false,
    metadataTargetPackageLabel: packageWithImages.displayName,
    metadataFetchDefaultText: packageWithImages.packageName,
    metadataProxyServer: '',
    onMetadataSyncName: vi.fn(),
    onMetadataSaveParsed: async () => undefined,
    manageMode: true,
    sidebarSelectedCount: 1,
    imageSelectedCount: 0,
    activeSelectionScope: 'sidebar',
    pendingManageAction: false,
    manageOperationHint: null,
    canManageDelete: true,
    canManageMoveNodes: true,
    canManageImageConvert: true,
    canManageHide: true,
    canManageUnhide: true,
    adReviewFeatureEnabled: false,
    adReviewPanelOpen: false,
    checkedImageIds: new Set(),
    adReviewScopeImageIds: new Set(),
    adReviewLlmReviewedImageIds: new Set(),
    adReviewNonLlmReviewedImageIds: new Set(),
    onToggleImageChecked: vi.fn(),
    onReplaceCheckedImages: vi.fn(),
    onManageDelete: vi.fn(),
    onManageGroup: vi.fn(),
    onManageMove: vi.fn(),
    onManageHide: vi.fn(),
    onManageUnhide: vi.fn(),
    onToggleAdReviewPanel: vi.fn(),
    onClearManageSelection: vi.fn(),
    onStartImageConvertTask: async () => ({
      task: {
        task_id: 'task-default',
      },
    }),
  }

  return {
    ...defaultProps,
    ...overrides,
  }
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

  it('节点浏览模式按分页切片渲染当前页卡片', () => {
    const onSelectNodeBrowseItem = vi.fn()
    render(
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
        onMetadataSyncName={vi.fn()}
        onMetadataSaveParsed={async () => undefined}
        manageMode={false}
        sidebarSelectedCount={0}
        imageSelectedCount={0}
        activeSelectionScope={null}
        pendingManageAction={false}
        manageOperationHint={null}
        canManageDelete={false}
        canManageMoveNodes={false}
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
        onManageGroup={vi.fn()}
        onManageMove={vi.fn()}
        onManageHide={vi.fn()}
        onManageUnhide={vi.fn()}
        onToggleAdReviewPanel={vi.fn()}
        onClearManageSelection={vi.fn()}
        nodeBrowseMode={true}
        nodeBrowseLabel="目录A"
        nodeBrowseItems={[
          {
            nodeId: 'folder-1',
            label: '子目录-1',
            imageNodeType: 'folder',
            packageCount: 0,
            imageCount: 12,
            descendantNodeCount: 3,
            coverImageUrl: null,
          },
          {
            nodeId: 'folder-2',
            label: '子目录-2',
            imageNodeType: 'folder',
            packageCount: 0,
            imageCount: 8,
            descendantNodeCount: 2,
            coverImageUrl: null,
          },
          {
            nodeId: 'folder-3',
            label: '子目录-3',
            imageNodeType: 'folder',
            packageCount: 0,
            imageCount: 5,
            descendantNodeCount: 1,
            coverImageUrl: null,
          },
        ]}
        nodeBrowsePageStart={1}
        nodeBrowsePageSize={1}
        onSelectNodeBrowseItem={onSelectNodeBrowseItem}
      />,
    )

    const cards = document.querySelectorAll('[data-slot="fg-main-content-image-node-grid-card"]')
    expect(cards).toHaveLength(1)

    const cardButton = document.querySelector('[data-slot="fg-main-content-image-node-grid-card"] .thumb-card-main') as HTMLButtonElement | null
    expect(cardButton).not.toBeNull()

    fireEvent.click(cardButton as HTMLButtonElement)
    expect(onSelectNodeBrowseItem).toHaveBeenCalledWith('folder-2', undefined)
  })

  it('缩略图在新批次未准备好时显示占位，准备完成后整批替换', async () => {
    const refsInPage = [
      { packageId: packageWithImages.id, imageIndex: 0 },
      { packageId: packageWithImages.id, imageIndex: 1 },
    ]

    const { rerender } = render(
      <ImageMainSection
        vectorMode={false}
        showNamesOnly={false}
        metadataManageMode={false}
        loading={false}
        placeholderCount={2}
        enableLoadingSkeleton={true}
        activePackage={packageWithImages}
        focusedRef={null}
        focusedImageExists={false}
        visibleImageRefs={refsInPage}
        refsInPage={refsInPage}
        pageStart={0}
        actualCellWidth={120}
        actualMediaHeight={108}
        thumbnailColumns={2}
        thumbnailGap={8}
        vectorCandidates={[]}
        packageById={new Map([[packageWithImages.id, packageWithImages]])}
        imageUrlById={{ 'img-1': 'mock://thumb-1' }}
        gridRef={createRef<HTMLDivElement>()}
        onGridElementChange={vi.fn()}
        onToggleShowNamesOnly={vi.fn()}
        onEnterFullscreen={vi.fn()}
        canJumpToAnimation={false}
        onJumpToAnimation={vi.fn()}
        onSelectImage={vi.fn()}
        metadataPending={false}
        metadataTargetPackageLabel={packageWithImages.displayName}
        metadataFetchDefaultText={packageWithImages.packageName}
        metadataProxyServer={''}
        onMetadataSyncName={vi.fn()}
        onMetadataSaveParsed={async () => undefined}
        manageMode={false}
        sidebarSelectedCount={0}
        imageSelectedCount={0}
        activeSelectionScope={null}
        pendingManageAction={false}
        manageOperationHint={null}
        canManageDelete={false}
        canManageMoveNodes={false}
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
        onManageGroup={vi.fn()}
        onManageMove={vi.fn()}
        onManageHide={vi.fn()}
        onManageUnhide={vi.fn()}
        onToggleAdReviewPanel={vi.fn()}
        onClearManageSelection={vi.fn()}
      />,
    )

    expect(document.querySelectorAll('.thumb-card.is-skeleton').length).toBe(2)
    expect(document.querySelectorAll('.thumb-media-image').length).toBe(0)

    rerender(
      <ImageMainSection
        vectorMode={false}
        showNamesOnly={false}
        metadataManageMode={false}
        loading={false}
        placeholderCount={2}
        enableLoadingSkeleton={true}
        activePackage={packageWithImages}
        focusedRef={null}
        focusedImageExists={false}
        visibleImageRefs={refsInPage}
        refsInPage={refsInPage}
        pageStart={0}
        actualCellWidth={120}
        actualMediaHeight={108}
        thumbnailColumns={2}
        thumbnailGap={8}
        vectorCandidates={[]}
        packageById={new Map([[packageWithImages.id, packageWithImages]])}
        imageUrlById={{ 'img-1': 'mock://thumb-1', 'img-2': 'mock://thumb-2' }}
        gridRef={createRef<HTMLDivElement>()}
        onGridElementChange={vi.fn()}
        onToggleShowNamesOnly={vi.fn()}
        onEnterFullscreen={vi.fn()}
        canJumpToAnimation={false}
        onJumpToAnimation={vi.fn()}
        onSelectImage={vi.fn()}
        metadataPending={false}
        metadataTargetPackageLabel={packageWithImages.displayName}
        metadataFetchDefaultText={packageWithImages.packageName}
        metadataProxyServer={''}
        onMetadataSyncName={vi.fn()}
        onMetadataSaveParsed={async () => undefined}
        manageMode={false}
        sidebarSelectedCount={0}
        imageSelectedCount={0}
        activeSelectionScope={null}
        pendingManageAction={false}
        manageOperationHint={null}
        canManageDelete={false}
        canManageMoveNodes={false}
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
        onManageGroup={vi.fn()}
        onManageMove={vi.fn()}
        onManageHide={vi.fn()}
        onManageUnhide={vi.fn()}
        onToggleAdReviewPanel={vi.fn()}
        onClearManageSelection={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(document.querySelectorAll('.thumb-card.is-skeleton').length).toBe(0)
      expect(document.querySelectorAll('.thumb-media-image').length).toBe(2)
    })
  })

  it('切换批次时渐进显示已就绪缩略图，剩余 URL 到达后增量补全', async () => {
    const refsBatchA = [
      { packageId: packageWithMoreImages.id, imageIndex: 0 },
      { packageId: packageWithMoreImages.id, imageIndex: 1 },
    ]
    const refsBatchB = [
      { packageId: packageWithMoreImages.id, imageIndex: 2 },
      { packageId: packageWithMoreImages.id, imageIndex: 3 },
    ]

    const onSelectImage = vi.fn()
    const { rerender } = render(
      <ImageMainSection
        vectorMode={false}
        showNamesOnly={false}
        metadataManageMode={false}
        loading={false}
        placeholderCount={2}
        enableLoadingSkeleton={true}
        activePackage={packageWithMoreImages}
        focusedRef={null}
        focusedImageExists={false}
        visibleImageRefs={refsBatchA}
        refsInPage={refsBatchA}
        pageStart={0}
        actualCellWidth={120}
        actualMediaHeight={108}
        thumbnailColumns={2}
        thumbnailGap={8}
        vectorCandidates={[]}
        packageById={new Map([[packageWithMoreImages.id, packageWithMoreImages]])}
        imageUrlById={{
          'img-1': 'mock://thumb-1',
          'img-2': 'mock://thumb-2',
        }}
        gridRef={createRef<HTMLDivElement>()}
        onGridElementChange={vi.fn()}
        onToggleShowNamesOnly={vi.fn()}
        onEnterFullscreen={vi.fn()}
        canJumpToAnimation={false}
        onJumpToAnimation={vi.fn()}
        onSelectImage={onSelectImage}
        metadataPending={false}
        metadataTargetPackageLabel={packageWithMoreImages.displayName}
        metadataFetchDefaultText={packageWithMoreImages.packageName}
        metadataProxyServer={''}
        onMetadataSyncName={vi.fn()}
        onMetadataSaveParsed={async () => undefined}
        manageMode={false}
        sidebarSelectedCount={0}
        imageSelectedCount={0}
        activeSelectionScope={null}
        pendingManageAction={false}
        manageOperationHint={null}
        canManageDelete={false}
        canManageMoveNodes={false}
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
        onManageGroup={vi.fn()}
        onManageMove={vi.fn()}
        onManageHide={vi.fn()}
        onManageUnhide={vi.fn()}
        onToggleAdReviewPanel={vi.fn()}
        onClearManageSelection={vi.fn()}
      />,
    )

    const initialImages = Array.from(document.querySelectorAll('.thumb-media-image')) as HTMLImageElement[]
    expect(initialImages.map((element) => element.getAttribute('src'))).toEqual(['mock://thumb-1', 'mock://thumb-2'])

    // 切换到批次 B，仅 img-3 URL 就绪 — 渐进显示：img-3 立即可见
    rerender(
      <ImageMainSection
        vectorMode={false}
        showNamesOnly={false}
        metadataManageMode={false}
        loading={false}
        placeholderCount={2}
        enableLoadingSkeleton={true}
        activePackage={packageWithMoreImages}
        focusedRef={null}
        focusedImageExists={false}
        visibleImageRefs={refsBatchB}
        refsInPage={refsBatchB}
        pageStart={0}
        actualCellWidth={120}
        actualMediaHeight={108}
        thumbnailColumns={2}
        thumbnailGap={8}
        vectorCandidates={[]}
        packageById={new Map([[packageWithMoreImages.id, packageWithMoreImages]])}
        imageUrlById={{
          'img-3': 'mock://thumb-3',
        }}
        gridRef={createRef<HTMLDivElement>()}
        onGridElementChange={vi.fn()}
        onToggleShowNamesOnly={vi.fn()}
        onEnterFullscreen={vi.fn()}
        canJumpToAnimation={false}
        onJumpToAnimation={vi.fn()}
        onSelectImage={onSelectImage}
        metadataPending={false}
        metadataTargetPackageLabel={packageWithMoreImages.displayName}
        metadataFetchDefaultText={packageWithMoreImages.packageName}
        metadataProxyServer={''}
        onMetadataSyncName={vi.fn()}
        onMetadataSaveParsed={async () => undefined}
        manageMode={false}
        sidebarSelectedCount={0}
        imageSelectedCount={0}
        activeSelectionScope={null}
        pendingManageAction={false}
        manageOperationHint={null}
        canManageDelete={false}
        canManageMoveNodes={false}
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
        onManageGroup={vi.fn()}
        onManageMove={vi.fn()}
        onManageHide={vi.fn()}
        onManageUnhide={vi.fn()}
        onToggleAdReviewPanel={vi.fn()}
        onClearManageSelection={vi.fn()}
      />,
    )

    // 渐进模式下，img-3 已就绪即显示，网格已切换到新批次
    await waitFor(() => {
      const partialImages = Array.from(document.querySelectorAll('.thumb-media-image')) as HTMLImageElement[]
      const partialSrcs = partialImages.map((element) => element.getAttribute('src'))
      expect(partialSrcs).toContain('mock://thumb-3')
    })

    // img-4 URL 到达后增量补全
    rerender(
      <ImageMainSection
        vectorMode={false}
        showNamesOnly={false}
        metadataManageMode={false}
        loading={false}
        placeholderCount={2}
        enableLoadingSkeleton={true}
        activePackage={packageWithMoreImages}
        focusedRef={null}
        focusedImageExists={false}
        visibleImageRefs={refsBatchB}
        refsInPage={refsBatchB}
        pageStart={0}
        actualCellWidth={120}
        actualMediaHeight={108}
        thumbnailColumns={2}
        thumbnailGap={8}
        vectorCandidates={[]}
        packageById={new Map([[packageWithMoreImages.id, packageWithMoreImages]])}
        imageUrlById={{
          'img-3': 'mock://thumb-3',
          'img-4': 'mock://thumb-4',
        }}
        gridRef={createRef<HTMLDivElement>()}
        onGridElementChange={vi.fn()}
        onToggleShowNamesOnly={vi.fn()}
        onEnterFullscreen={vi.fn()}
        canJumpToAnimation={false}
        onJumpToAnimation={vi.fn()}
        onSelectImage={onSelectImage}
        metadataPending={false}
        metadataTargetPackageLabel={packageWithMoreImages.displayName}
        metadataFetchDefaultText={packageWithMoreImages.packageName}
        metadataProxyServer={''}
        onMetadataSyncName={vi.fn()}
        onMetadataSaveParsed={async () => undefined}
        manageMode={false}
        sidebarSelectedCount={0}
        imageSelectedCount={0}
        activeSelectionScope={null}
        pendingManageAction={false}
        manageOperationHint={null}
        canManageDelete={false}
        canManageMoveNodes={false}
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
        onManageGroup={vi.fn()}
        onManageMove={vi.fn()}
        onManageHide={vi.fn()}
        onManageUnhide={vi.fn()}
        onToggleAdReviewPanel={vi.fn()}
        onClearManageSelection={vi.fn()}
      />,
    )

    await waitFor(() => {
      const swappedImages = Array.from(document.querySelectorAll('.thumb-media-image')) as HTMLImageElement[]
      expect(swappedImages.map((element) => element.getAttribute('src'))).toEqual(['mock://thumb-3', 'mock://thumb-4'])
    })
  })

  it('纯文件名模式来回切换时复用既有缩略图批次，不重新进入 pending', () => {
    const refsInPage = [
      { packageId: packageWithImages.id, imageIndex: 0 },
      { packageId: packageWithImages.id, imageIndex: 1 },
    ]

    const sharedProps = {
      vectorMode: false,
      metadataManageMode: false,
      loading: false,
      placeholderCount: 2,
      enableLoadingSkeleton: true,
      activePackage: packageWithImages,
      focusedRef: null,
      focusedImageExists: false,
      visibleImageRefs: refsInPage,
      refsInPage,
      pageStart: 0,
      actualCellWidth: 120,
      actualMediaHeight: 108,
      thumbnailColumns: 2,
      thumbnailGap: 8,
      vectorCandidates: [],
      packageById: new Map([[packageWithImages.id, packageWithImages]]),
      imageUrlById: {
        'img-1': 'mock://thumb-1',
        'img-2': 'mock://thumb-2',
      },
      gridRef: createRef<HTMLDivElement>(),
      onGridElementChange: vi.fn(),
      onToggleShowNamesOnly: vi.fn(),
      onEnterFullscreen: vi.fn(),
      canJumpToAnimation: false,
      onJumpToAnimation: vi.fn(),
      onSelectImage: vi.fn(),
      metadataPending: false,
      metadataTargetPackageLabel: packageWithImages.displayName,
      metadataFetchDefaultText: packageWithImages.packageName,
      metadataProxyServer: '',
      onMetadataSyncName: vi.fn(),
      onMetadataSaveParsed: async () => undefined,
      manageMode: false,
      sidebarSelectedCount: 0,
      imageSelectedCount: 0,
      activeSelectionScope: null,
      pendingManageAction: false,
      manageOperationHint: null,
      canManageDelete: false,
      canManageMoveNodes: false,
      canManageHide: false,
      canManageUnhide: false,
      adReviewFeatureEnabled: false,
      adReviewPanelOpen: false,
      checkedImageIds: new Set<string>(),
      adReviewScopeImageIds: new Set<string>(),
      adReviewLlmReviewedImageIds: new Set<string>(),
      adReviewNonLlmReviewedImageIds: new Set<string>(),
      onToggleImageChecked: vi.fn(),
      onReplaceCheckedImages: vi.fn(),
      onManageDelete: vi.fn(),
      onManageGroup: vi.fn(),
      onManageMove: vi.fn(),
      onManageHide: vi.fn(),
      onManageUnhide: vi.fn(),
      onToggleAdReviewPanel: vi.fn(),
      onClearManageSelection: vi.fn(),
    } satisfies Omit<Parameters<typeof ImageMainSection>[0], 'showNamesOnly'>

    const { rerender } = render(<ImageMainSection {...sharedProps} showNamesOnly={false} />)

    const initialImages = Array.from(document.querySelectorAll('.thumb-media-image')) as HTMLImageElement[]
    expect(initialImages.map((element) => element.getAttribute('src'))).toEqual(['mock://thumb-1', 'mock://thumb-2'])
    const initialButtons = Array.from(document.querySelectorAll('.thumb-card-main')) as HTMLButtonElement[]
    expect(initialButtons.every((button) => !button.disabled)).toBe(true)

    rerender(<ImageMainSection {...sharedProps} showNamesOnly={true} />)
    expect(document.querySelector('.name-list')).not.toBeNull()

    rerender(<ImageMainSection {...sharedProps} showNamesOnly={false} />)

    const imageGrid = document.querySelector('.image-grid')
    expect(imageGrid?.classList.contains('is-pending-swap')).toBe(false)
    const settledImages = Array.from(document.querySelectorAll('.thumb-media-image')) as HTMLImageElement[]
    expect(settledImages.map((element) => element.getAttribute('src'))).toEqual(['mock://thumb-1', 'mock://thumb-2'])
    const settledButtons = Array.from(document.querySelectorAll('.thumb-card-main')) as HTMLButtonElement[]
    expect(settledButtons.every((button) => !button.disabled)).toBe(true)
  })

  it('广告审核聚焦结果模式点击缩略图时同步焦点到元数据目标图', async () => {
    const activeStatuses = ['running', 'paused', 'review'] as const

    for (const status of activeStatuses) {
      const onSelectImage = vi.fn()
      const adReviewTask: NonNullable<ImageMainSectionProps['adReviewTask']> = {
        task_id: `task-${status}`,
        status,
        progress: status === 'review' ? 1 : 0.5,
        total_count: 1,
        reviewed_count: status === 'review' ? 1 : 0,
        suspected_count: 1,
        failed_count: 0,
        known_hash_hits: 0,
        llm_calls: 1,
        scope_image_ids: ['img-1'],
        image_source_by_id: {
          'img-1': 'llm',
        },
        message: null,
        error_detail: null,
        candidates: [
          {
            image_id: 'img-1',
            package_id: packageWithImages.id,
            package_name: packageWithImages.packageName,
            display_name: packageWithImages.displayName,
            ordinal: 1,
            file_name: 'pkg-2-1.jpg',
            reason: 'suspected-ad',
            source: 'llm',
            hash: 'mock-hash-1',
          },
        ],
        created_at_ms: 1,
        updated_at_ms: 1,
      }

      const { unmount } = render(
        <ImageMainSection
          {...createManageImageConvertProps({
            adReviewResultsMode: true,
            adReviewTask,
            onSelectImage,
          })}
        />,
      )

      const firstCard = document.querySelector('.thumb-card-main') as HTMLButtonElement | null
      expect(firstCard).not.toBeNull()
      fireEvent.mouseDown(firstCard as HTMLButtonElement, { button: 0 })

      expect(onSelectImage).toHaveBeenCalledWith(packageWithImages.id, 0, 0)
      unmount()
    }
  })

  it('纯文件名模式管理态支持 Shift 区间选择参数透传', () => {
    const onToggleImageChecked = vi.fn()
    render(
      <ImageMainSection
        {...createManageImageConvertProps({
          showNamesOnly: true,
          onToggleImageChecked,
          visibleImageRefs: [
            { packageId: packageWithImages.id, imageIndex: 0 },
            { packageId: packageWithImages.id, imageIndex: 1 },
          ],
          refsInPage: [
            { packageId: packageWithImages.id, imageIndex: 0 },
            { packageId: packageWithImages.id, imageIndex: 1 },
          ],
        })}
      />,
    )

    const nameListButtons = document.querySelectorAll('.name-list-row-main')
    expect(nameListButtons.length).toBeGreaterThanOrEqual(2)

    fireEvent.mouseDown(nameListButtons[1] as HTMLButtonElement, {
      button: 0,
      shiftKey: true,
      clientX: 10,
      clientY: 10,
    })
    fireEvent.mouseUp(window)

    expect(onToggleImageChecked).toHaveBeenCalledWith(
      'img-2',
      undefined,
      expect.objectContaining({
        shiftKey: true,
        orderedIds: ['img-1', 'img-2'],
      }),
    )
  })
})
