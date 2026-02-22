import { createRef } from 'react'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

function createManageImageConvertProps(
  overrides: Partial<ImageMainSectionProps> = {},
): ImageMainSectionProps {
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
    metadataEhentaiCookies: '',
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

  it('切换批次未就绪时保留旧缩略图并锁定交互，待就绪后平替', async () => {
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

    expect(document.querySelectorAll('.thumb-card.is-skeleton').length).toBe(0)
    const preservedImages = Array.from(document.querySelectorAll('.thumb-media-image')) as HTMLImageElement[]
    expect(preservedImages.map((element) => element.getAttribute('src'))).toEqual(['mock://thumb-1', 'mock://thumb-2'])
    const pendingButtons = Array.from(document.querySelectorAll('.thumb-card-main')) as HTMLButtonElement[]
    expect(pendingButtons.every((button) => button.disabled)).toBe(true)

    fireEvent.click(pendingButtons[0] as HTMLButtonElement)
    expect(onSelectImage).toHaveBeenCalledTimes(0)

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
      const settledButtons = Array.from(document.querySelectorAll('.thumb-card-main')) as HTMLButtonElement[]
      expect(settledButtons.every((button) => !button.disabled)).toBe(true)
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
      metadataEhentaiCookies: '',
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

  it('缩略图容器滚轮触发翻页，Ctrl+滚轮切换 sidebar 节点', () => {
    const refsInPage = [{ packageId: packageWithImages.id, imageIndex: 0 }]
    const onThumbnailWheelTurnPage = vi.fn()
    const onThumbnailWheelSwitchSidebarNode = vi.fn()

    render(
      <ImageMainSection
        vectorMode={false}
        showNamesOnly={false}
        metadataManageMode={false}
        loading={false}
        placeholderCount={1}
        enableLoadingSkeleton={false}
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
        onThumbnailWheelTurnPage={onThumbnailWheelTurnPage}
        onThumbnailWheelSwitchSidebarNode={onThumbnailWheelSwitchSidebarNode}
      />,
    )

    const grid = document.querySelector('.image-grid') as HTMLDivElement
    expect(grid).not.toBeNull()

    fireEvent.wheel(grid, { deltaY: 120 })
    expect(onThumbnailWheelTurnPage).toHaveBeenCalledWith('next')
    expect(onThumbnailWheelSwitchSidebarNode).not.toHaveBeenCalled()

    fireEvent.wheel(grid, { deltaY: -120, ctrlKey: true })
    expect(onThumbnailWheelSwitchSidebarNode).toHaveBeenCalledWith('prev')
  })
})

describe('ImageMainSection RS execution', () => {
  afterEach(() => {
    window.mediaPlayerBackend = undefined
    document.documentElement.dataset.mpxImageConvertExecuting = '0'
  })

  it('点击确定后应锁定 RS 交互并写入执行态 dataset', async () => {
    const onStartImageConvertTask = vi.fn(async () => ({
      task: {
        task_id: 'task-rs-running',
      },
    }))

    window.mediaPlayerBackend = {
      readImageConvertTask: vi.fn(async () => ({
        task: {
          task_id: 'task-rs-running',
          status: 'running',
          progress: 0.3,
          message: 'running',
        },
      })),
    } as unknown as typeof window.mediaPlayerBackend

    render(
      <ImageMainSection
        {...createManageImageConvertProps({ onStartImageConvertTask })}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'RS' }))
    fireEvent.click(screen.getByRole('button', { name: '确定' }))

    await waitFor(() => {
      expect(onStartImageConvertTask).toHaveBeenCalledWith({
        node_ids: [],
        scale_factor: 1,
        target_format: 'webp',
        quality: 80,
        concurrency: 4,
      })
      expect(document.documentElement.dataset.mpxImageConvertExecuting).toBe('1')
    })

    expect(screen.getByRole('button', { name: 'RS' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '预览' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '确定' })).toBeDisabled()
    const scaleSlider = document.querySelector(
      '.main-toolbar-image-convert-panel input[type="range"]',
    ) as HTMLInputElement | null
    expect(scaleSlider).not.toBeNull()
    expect(scaleSlider?.disabled).toBe(true)
  })

  it('最长边有值时应携带 longest_edge_px 参数', async () => {
    const onStartImageConvertTask = vi.fn(async () => ({
      task: {
        task_id: 'task-rs-longest-edge',
      },
    }))

    window.mediaPlayerBackend = {
      readImageConvertTask: vi.fn(async () => ({
        task: {
          task_id: 'task-rs-longest-edge',
          status: 'running',
          progress: 0.1,
          message: 'running',
        },
      })),
    } as unknown as typeof window.mediaPlayerBackend

    render(
      <ImageMainSection
        {...createManageImageConvertProps({
          imageConvertLongestEdgePx: 1600,
          onStartImageConvertTask,
        })}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'RS' }))
    fireEvent.click(screen.getByRole('button', { name: '确定' }))

    await waitFor(() => {
      expect(onStartImageConvertTask).toHaveBeenCalledWith({
        node_ids: [],
        scale_factor: 1,
        longest_edge_px: 1600,
        target_format: 'webp',
        quality: 80,
        concurrency: 4,
      })
    })
  })

  it('执行中点击取消应调用后端 cancel 并清理执行态', async () => {
    const cancelImageConvertTask = vi.fn(async () => ({
      task: {
        task_id: 'task-rs-cancel',
        status: 'cancelled',
      },
    }))

    window.mediaPlayerBackend = {
      readImageConvertTask: vi.fn(async () => ({
        task: {
          task_id: 'task-rs-cancel',
          status: 'running',
          progress: 0.2,
          message: 'running',
        },
      })),
      cancelImageConvertTask,
    } as unknown as typeof window.mediaPlayerBackend

    render(
      <ImageMainSection
        {...createManageImageConvertProps({
          onStartImageConvertTask: async () => ({
            task: {
              task_id: 'task-rs-cancel',
            },
          }),
        })}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'RS' }))
    fireEvent.click(screen.getByRole('button', { name: '确定' }))

    await waitFor(() => {
      expect(document.documentElement.dataset.mpxImageConvertExecuting).toBe('1')
    })

    fireEvent.click(screen.getByRole('button', { name: '取消' }))

    await waitFor(() => {
      expect(cancelImageConvertTask).toHaveBeenCalledWith({
        task_id: 'task-rs-cancel',
      })
      expect(document.documentElement.dataset.mpxImageConvertExecuting).toBe('0')
    })
  })

  it('非执行态点击取消应关闭 panel，预览态下不渲染 RS 弹层', async () => {
    const onCancelImageConvertPreview = vi.fn()

    const { rerender } = render(
      <ImageMainSection
        {...createManageImageConvertProps({
          onCancelImageConvertPreview,
        })}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'RS' }))
    expect(document.querySelector('.main-toolbar-image-convert-panel')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '取消' }))

    await waitFor(() => {
      expect(onCancelImageConvertPreview).toHaveBeenCalledTimes(0)
      expect(document.querySelector('.main-toolbar-image-convert-panel')).toBeNull()
      expect(document.documentElement.dataset.mpxImageConvertExecuting).toBe('0')
    })

    rerender(
      <ImageMainSection
        {...createManageImageConvertProps({
          imageConvertPreviewMode: true,
          onCancelImageConvertPreview,
        })}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'RS' }))
    expect(document.querySelector('.main-toolbar-image-convert-panel')).toBeNull()
  })
})
