import type { RefObject } from 'react'

import type { ManageAdReviewTaskDto, ManageReviewModeDto } from '../../contracts/backend'
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
  adReviewPending: boolean
  adReviewDeletePending?: boolean
  adReviewPanelOpen: boolean
  manageReviewMode: ManageReviewModeDto
  canSwitchManageReviewMode: boolean
  adReviewTask: ManageAdReviewTaskDto | null
  adReviewFocusTaskId: string | null
  adReviewStrategyMode: 'all' | 'head-tail'
  adReviewMaxConcurrency: number
  adReviewHeadN: number
  adReviewTailN: number
  adReviewTailStopCleanStreak: number
  canExecuteAdReview: boolean
  hasCheckedAdReviewCandidates: boolean
  selectedAdReviewCandidateCount: number
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
  canJumpToMusicFromBooklet: boolean
  onJumpToAnimation: () => void
  onJumpToMusic: () => void
  onJumpToMusicFromBooklet: () => void
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
  onManageReviewModeChange: (nextMode: ManageReviewModeDto) => void
  onToggleAdReviewFocus: () => void
  onAdReviewStrategyModeChange: (value: 'all' | 'head-tail') => void
  onAdReviewMaxConcurrencyChange: (value: number) => void
  onAdReviewHeadNChange: (value: number) => void
  onAdReviewTailNChange: (value: number) => void
  onAdReviewTailStopCleanStreakChange: (value: number) => void
  onStartAdReview: (options?: { skipReviewedNodes?: boolean }) => void
  onPauseAdReview: () => void
  onRemoveAdReviewTask: (taskId: string) => void
  onDeleteSelectedAdReviewCandidates: () => void
  onDismissAdReviewTask: () => void
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
    adReviewPending: params.adReviewPending,
    adReviewDeletePending: params.adReviewDeletePending,
    adReviewPanelOpen: params.adReviewPanelOpen,
    manageReviewMode: params.manageReviewMode,
    canSwitchManageReviewMode: params.canSwitchManageReviewMode,
    adReviewTask: params.adReviewTask,
    adReviewFocusTaskId: params.adReviewFocusTaskId,
    adReviewStrategyMode: params.adReviewStrategyMode,
    adReviewMaxConcurrency: params.adReviewMaxConcurrency,
    adReviewHeadN: params.adReviewHeadN,
    adReviewTailN: params.adReviewTailN,
    adReviewTailStopCleanStreak: params.adReviewTailStopCleanStreak,
    canExecuteAdReview: params.canExecuteAdReview,
    hasCheckedAdReviewCandidates: params.hasCheckedAdReviewCandidates,
    selectedAdReviewCandidateCount: params.selectedAdReviewCandidateCount,
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
    onManageReviewModeChange: params.onManageReviewModeChange,
    onToggleAdReviewFocus: params.onToggleAdReviewFocus,
    onAdReviewStrategyModeChange: params.onAdReviewStrategyModeChange,
    onAdReviewMaxConcurrencyChange: params.onAdReviewMaxConcurrencyChange,
    onAdReviewHeadNChange: params.onAdReviewHeadNChange,
    onAdReviewTailNChange: params.onAdReviewTailNChange,
    onAdReviewTailStopCleanStreakChange: params.onAdReviewTailStopCleanStreakChange,
    onStartAdReview: params.onStartAdReview,
    onPauseAdReview: params.onPauseAdReview,
    onRemoveAdReviewTask: params.onRemoveAdReviewTask,
    onDeleteSelectedAdReviewCandidates: params.onDeleteSelectedAdReviewCandidates,
    onDismissAdReviewTask: params.onDismissAdReviewTask,
    onClearManageSelection: params.onClearManageSelection,
    onThumbnailScaleLevelChange: params.onThumbnailScaleLevelChange,
    onToggleShowNamesOnly: () => params.updateSettings({ showNamesOnly: !params.showNamesOnly }),
    canJumpToAnimation: params.canJumpToAnimation,
    canJumpToMusic: params.canJumpToMusic,
    canJumpToMusicFromBooklet: params.canJumpToMusicFromBooklet,
    onJumpToAnimation: params.onJumpToAnimation,
    onJumpToMusic: params.onJumpToMusic,
    onJumpToMusicFromBooklet: params.onJumpToMusicFromBooklet,
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
