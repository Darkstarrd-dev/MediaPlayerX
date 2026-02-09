import type { MouseEvent as ReactMouseEvent, RefObject } from 'react'

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
    mode: params.mode,
    sidebarSelectedCount: params.sidebarSelectedCount,
    imageSelectedCount: params.imageSelectedCount,
    activeSelectionScope: params.activeSelectionScope,
    pending: params.pending,
    operationHint: params.operationHint,
    errorRows: params.errorRows,
    canDelete: params.sidebarSelectedCount > 0 || params.imageSelectedCount > 0,
    canHide: params.mode === 'image' && params.imageSelectedCount > 0,
    canUnhide: params.mode === 'image' && params.imageSelectedCount > 0,
    onDelete: params.onDelete,
    onHide: params.onHide,
    onUnhide: params.onUnhide,
    onClearSelection: params.onClearSelection,
    onCollapse: () => params.setSearchPanelCollapsed(true),
    onExpand: () => params.setSearchPanelCollapsed(false),
    onStartResize: params.onStartVectorPanelResize,
    layoutLocked: params.layoutLocked,
  }
}
