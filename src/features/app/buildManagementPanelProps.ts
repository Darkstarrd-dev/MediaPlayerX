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
  adReviewPending: boolean
  adReviewTask: ManageAdReviewTaskDto | null
  adReviewSelectedImageIds: string[]
  onStartAdReview: () => void
  onToggleAdReviewCandidate: (imageId: string, checked?: boolean) => void
  onSelectAllAdReviewCandidates: () => void
  onClearAdReviewCandidates: () => void
  onDeleteAdReviewCandidates: () => void
  onDismissAdReviewTask: () => void
  onStartVectorPanelResize: (event: ReactMouseEvent<HTMLDivElement>) => void
  layoutLocked: boolean
}

export function buildManagementPanelProps(params: BuildManagementPanelPropsParams) {
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
    canDelete: params.sidebarSelectedCount > 0 || params.imageSelectedCount > 0,
    canHide: params.mode === 'image' && params.imageSelectedCount > 0,
    canUnhide: params.mode === 'image' && params.imageSelectedCount > 0,
    canStartAdReview: params.mode === 'image' && (params.sidebarSelectedCount > 0 || params.imageSelectedCount > 0),
    onDelete: params.onDelete,
    onHide: params.onHide,
    onUnhide: params.onUnhide,
    onClearSelection: params.onClearSelection,
    adReviewPending: params.adReviewPending,
    adReviewTask: params.adReviewTask,
    adReviewSelectedImageIds: params.adReviewSelectedImageIds,
    onStartAdReview: params.onStartAdReview,
    onToggleAdReviewCandidate: params.onToggleAdReviewCandidate,
    onSelectAllAdReviewCandidates: params.onSelectAllAdReviewCandidates,
    onClearAdReviewCandidates: params.onClearAdReviewCandidates,
    onDeleteAdReviewCandidates: params.onDeleteAdReviewCandidates,
    onDismissAdReviewTask: params.onDismissAdReviewTask,
    onExpand: () => params.setSearchPanelCollapsed(false),
    onStartResize: params.onStartVectorPanelResize,
    layoutLocked: params.layoutLocked,
  }
}
