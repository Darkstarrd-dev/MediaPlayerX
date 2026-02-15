import type { RefObject } from 'react'

import type { AppSettings } from '../../contracts/settings'
import type { ParsedExternalMetadata } from '../metadata/parseExternalMetadata'
import type { FocusedImageRef, ImagePackage, VectorCandidate } from '../../types'

interface BuildImageMainSectionPropsParams {
  vectorResultsActive: boolean
  showNamesOnly: boolean
  metadataManageMode: boolean
  thumbnailScaleLevel: number
  thumbnailScaleLevelCount: number
  canThumbnailScaleDown: boolean
  canThumbnailScaleUp: boolean
  backendPageLoading: boolean
  pagedPageSize: number
  enableLoadingSkeleton: boolean
  activePackageForDisplay: ImagePackage | null
  focusedRef: FocusedImageRef | null
  focusedImageExists: boolean
  visibleImageRefs: FocusedImageRef[]
  refsInPageEffective: FocusedImageRef[]
  pageStartEffective: number
  actualCellWidth: number
  actualMediaHeight: number
  thumbnailColumns: number
  actualThumbnailGap: number
  vectorSearchResults: VectorCandidate[]
  packageByIdEffective: Map<string, ImagePackage>
  thumbnailImageUrlById: Record<string, string>
  gridRef: RefObject<HTMLDivElement | null>
  onGridElementChange: (element: HTMLDivElement | null) => void
  manageMode: boolean
  sidebarSelectedCount: number
  imageSelectedCount: number
  activeSelectionScope: 'sidebar' | 'image' | null
  pendingManageAction: boolean
  manageOperationHint: string | null
  canManageDelete: boolean
  canManageMoveNodes: boolean
  canManageHide: boolean
  canManageUnhide: boolean
  adReviewFeatureEnabled: boolean
  adReviewDeletePending?: boolean
  adReviewPanelOpen: boolean
  checkedImageIdSet: Set<string>
  adReviewScopeImageIdSet: Set<string>
  adReviewLlmReviewedImageIdSet: Set<string>
  adReviewNonLlmReviewedImageIdSet: Set<string>
  adReviewCandidateImageIdSet: Set<string>
  adReviewResultsMode: boolean
  adReviewGroupByPackageRows: boolean
  updateSettings: (patch: Partial<AppSettings>) => void
  setFullscreenActiveWithAutoStop: (value: boolean) => void
  setVectorFocusIndex: (value: number) => void
  setImageFocus: (packageId: string, imageIndex: number) => void
  canJumpToAnimation: boolean
  canJumpToMusic: boolean
  onJumpToAnimation: () => void
  onJumpToMusic: () => void
  metadataPending: boolean
  metadataTargetPackageLabel: string
  metadataFetchDefaultText: string
  metadataProxyServer: string
  metadataEhentaiCookies: string
  onMetadataSyncName: () => void
  onMetadataSaveParsed: (parsed: ParsedExternalMetadata) => Promise<void>
  onToggleImageChecked: (imageId: string, checked?: boolean) => void
  onReplaceCheckedImages: (imageIds: string[], append?: boolean) => void
  onManageDelete: () => void
  onManageGroup: () => void
  onManageMove: () => void
  onManageHide: () => void
  onManageUnhide: () => void
  onToggleAdReviewPanel: () => void
  onClearManageSelection: () => void
  onThumbnailScaleLevelChange: (level: number) => void
  nodeBrowseMode: boolean
  nodeBrowseLabel: string
  nodeBrowseItems: Array<{
    nodeId: string
    imageSourceId?: string
    imageNodeType: 'folder' | 'package' | 'directory'
    label: string
    packageCount: number
    imageCount: number
    descendantNodeCount: number
    coverImageUrl: string | null
  }>
  onSelectNodeBrowseItem: (nodeId: string, imageSourceId?: string) => void
  onThumbnailWheelTurnPage: (direction: 'next' | 'prev') => void
  onThumbnailWheelSwitchSidebarNode: (direction: 'next' | 'prev') => void
}

export function buildImageMainSectionProps(params: BuildImageMainSectionPropsParams) {
  return {
    vectorMode: params.vectorResultsActive,
    showNamesOnly: params.showNamesOnly,
    metadataManageMode: params.metadataManageMode,
    thumbnailScaleLevel: params.thumbnailScaleLevel,
    thumbnailScaleLevelCount: params.thumbnailScaleLevelCount,
    canThumbnailScaleDown: params.canThumbnailScaleDown,
    canThumbnailScaleUp: params.canThumbnailScaleUp,
    loading: params.enableLoadingSkeleton ? params.backendPageLoading : false,
    placeholderCount: Math.max(1, params.pagedPageSize),
    enableLoadingSkeleton: params.enableLoadingSkeleton,
    activePackage: params.activePackageForDisplay,
    focusedRef: params.focusedRef,
    focusedImageExists: params.focusedImageExists,
    visibleImageRefs: params.visibleImageRefs,
    refsInPage: params.refsInPageEffective,
    pageStart: params.pageStartEffective,
    actualCellWidth: params.actualCellWidth,
    actualMediaHeight: params.actualMediaHeight,
    thumbnailColumns: params.thumbnailColumns,
    thumbnailGap: params.actualThumbnailGap,
    vectorCandidates: params.vectorSearchResults,
    packageById: params.packageByIdEffective,
    imageUrlById: params.thumbnailImageUrlById,
    gridRef: params.gridRef,
    onGridElementChange: params.onGridElementChange,
    manageMode: params.manageMode,
    sidebarSelectedCount: params.sidebarSelectedCount,
    imageSelectedCount: params.imageSelectedCount,
    activeSelectionScope: params.activeSelectionScope,
    pendingManageAction: params.pendingManageAction,
    manageOperationHint: params.manageOperationHint,
    canManageDelete: params.canManageDelete,
    canManageMoveNodes: params.canManageMoveNodes,
    canManageHide: params.canManageHide,
    canManageUnhide: params.canManageUnhide,
    adReviewFeatureEnabled: params.adReviewFeatureEnabled,
    adReviewDeletePending: params.adReviewDeletePending,
    adReviewPanelOpen: params.adReviewPanelOpen,
    checkedImageIds: params.checkedImageIdSet,
    adReviewScopeImageIds: params.adReviewScopeImageIdSet,
    adReviewLlmReviewedImageIds: params.adReviewLlmReviewedImageIdSet,
    adReviewNonLlmReviewedImageIds: params.adReviewNonLlmReviewedImageIdSet,
    adReviewCandidateImageIds: params.adReviewCandidateImageIdSet,
    adReviewResultsMode: params.adReviewResultsMode,
    adReviewGroupByPackageRows: params.adReviewGroupByPackageRows,
    onToggleImageChecked: params.onToggleImageChecked,
    onReplaceCheckedImages: params.onReplaceCheckedImages,
    onManageDelete: params.onManageDelete,
    onManageGroup: params.onManageGroup,
    onManageMove: params.onManageMove,
    onManageHide: params.onManageHide,
    onManageUnhide: params.onManageUnhide,
    onToggleAdReviewPanel: params.onToggleAdReviewPanel,
    onClearManageSelection: params.onClearManageSelection,
    onThumbnailScaleLevelChange: params.onThumbnailScaleLevelChange,
    onToggleShowNamesOnly: () => params.updateSettings({ showNamesOnly: !params.showNamesOnly }),
    canJumpToAnimation: params.canJumpToAnimation,
    canJumpToMusic: params.canJumpToMusic,
    onJumpToAnimation: params.onJumpToAnimation,
    onJumpToMusic: params.onJumpToMusic,
    onEnterFullscreen: () => params.setFullscreenActiveWithAutoStop(true),
    onSelectImage: (packageId: string, imageIndex: number, absoluteIndex: number) => {
      if (params.vectorResultsActive) {
        params.setVectorFocusIndex(absoluteIndex)
      }
      params.setImageFocus(packageId, imageIndex)
      params.updateSettings({ sidebarFocus: 'main' })
    },
    metadataPending: params.metadataPending,
    metadataTargetPackageLabel: params.metadataTargetPackageLabel,
    metadataFetchDefaultText: params.metadataFetchDefaultText,
    metadataProxyServer: params.metadataProxyServer,
    metadataEhentaiCookies: params.metadataEhentaiCookies,
    onMetadataSyncName: params.onMetadataSyncName,
    onMetadataSaveParsed: params.onMetadataSaveParsed,
    nodeBrowseMode: params.nodeBrowseMode,
    nodeBrowseLabel: params.nodeBrowseLabel,
    nodeBrowseItems: params.nodeBrowseItems,
    onSelectNodeBrowseItem: params.onSelectNodeBrowseItem,
    onThumbnailWheelTurnPage: params.onThumbnailWheelTurnPage,
    onThumbnailWheelSwitchSidebarNode: params.onThumbnailWheelSwitchSidebarNode,
  }
}
