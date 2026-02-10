import type { MouseEvent as ReactMouseEvent, RefObject } from 'react'

import type { ManageAdReviewTaskDto } from '../../contracts/backend'
import type { BackendErrorRow } from './buildBackendErrorRows'
import type { BrowserMode } from '../../types'

interface BuildManagementPanelPropsParams {
  mode: BrowserMode
  manageMode: boolean
  searchPanelCollapsed: boolean
  setSearchPanelCollapsed: (collapsed: boolean) => void
  vectorPanelHeight: number
  vectorPanelRef: RefObject<HTMLDivElement | null>
  vectorPanelContentRef: RefObject<HTMLDivElement | null>
  sidebarSelectedCount: number
  imageSelectedCount: number
  activeSelectionScope: 'sidebar' | 'image' | null
  pending: boolean
  operationHint: string | null
  errorRows: BackendErrorRow[]
  onDelete: () => void
  onHide: () => void
  onUnhide: () => void
  onClearSelection: () => void
  adReviewFeatureEnabled: boolean
  adReviewPending: boolean
  adReviewTask: ManageAdReviewTaskDto | null
  adReviewHideUncheckedNonChecked: boolean
  hasCheckedAdReviewCandidates: boolean
  adReviewStrategyMode: 'all' | 'head-tail'
  adReviewMaxConcurrency: number
  adReviewHeadN: number
  adReviewTailN: number
  adReviewTailStopCleanStreak: number
  onStartAdReview: () => void
  onPauseAdReview: () => void
  onToggleHideUncheckedNonChecked: () => void
  onAdReviewStrategyModeChange: (value: 'all' | 'head-tail') => void
  onAdReviewMaxConcurrencyChange: (value: number) => void
  onAdReviewHeadNChange: (value: number) => void
  onAdReviewTailNChange: (value: number) => void
  onAdReviewTailStopCleanStreakChange: (value: number) => void
  onDismissAdReviewTask: () => void
  onStartVectorPanelResize: (event: ReactMouseEvent<HTMLDivElement>) => void
  layoutLocked: boolean
}

export function buildManagementPanelProps(params: BuildManagementPanelPropsParams) {
  const hasSelection = params.sidebarSelectedCount > 0 || params.imageSelectedCount > 0
  const adReviewFeatureVisible = params.mode === 'image' && params.adReviewFeatureEnabled

  return {
    visible: params.manageMode,
    collapsed: params.searchPanelCollapsed,
    panelHeight: params.vectorPanelHeight,
    panelRef: params.vectorPanelRef,
    panelContentRef: params.vectorPanelContentRef,
    sidebarSelectedCount: params.sidebarSelectedCount,
    imageSelectedCount: params.imageSelectedCount,
    activeSelectionScope: params.activeSelectionScope,
    pending: params.pending,
    operationHint: params.operationHint,
    errorRows: params.errorRows,
    canDelete: hasSelection,
    canHide: params.mode === 'image' && params.imageSelectedCount > 0,
    canUnhide: params.mode === 'image' && params.imageSelectedCount > 0,
    adReviewFeatureVisible,
    canExecuteAdReview: adReviewFeatureVisible && hasSelection,
    onDelete: params.onDelete,
    onHide: params.onHide,
    onUnhide: params.onUnhide,
    onClearSelection: params.onClearSelection,
    adReviewPending: params.adReviewPending,
    adReviewTask: params.adReviewTask,
    adReviewHideUncheckedNonChecked: params.adReviewHideUncheckedNonChecked,
    hasCheckedAdReviewCandidates: params.hasCheckedAdReviewCandidates,
    adReviewStrategyMode: params.adReviewStrategyMode,
    adReviewMaxConcurrency: params.adReviewMaxConcurrency,
    adReviewHeadN: params.adReviewHeadN,
    adReviewTailN: params.adReviewTailN,
    adReviewTailStopCleanStreak: params.adReviewTailStopCleanStreak,
    onStartAdReview: params.onStartAdReview,
    onPauseAdReview: params.onPauseAdReview,
    onToggleHideUncheckedNonChecked: params.onToggleHideUncheckedNonChecked,
    onAdReviewStrategyModeChange: params.onAdReviewStrategyModeChange,
    onAdReviewMaxConcurrencyChange: params.onAdReviewMaxConcurrencyChange,
    onAdReviewHeadNChange: params.onAdReviewHeadNChange,
    onAdReviewTailNChange: params.onAdReviewTailNChange,
    onAdReviewTailStopCleanStreakChange: params.onAdReviewTailStopCleanStreakChange,
    onDismissAdReviewTask: params.onDismissAdReviewTask,
    onExpand: () => params.setSearchPanelCollapsed(false),
    onStartResize: params.onStartVectorPanelResize,
    layoutLocked: params.layoutLocked,
  }
}
