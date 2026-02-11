import type { MouseEvent as ReactMouseEvent, RefObject } from 'react'

interface BuildMetadataManagementPanelPropsParams {
  metadataManageMode: boolean
  searchPanelCollapsed: boolean
  setSearchPanelCollapsed: (collapsed: boolean) => void
  vectorPanelHeight: number
  vectorPanelRef: RefObject<HTMLDivElement | null>
  vectorPanelContentRef: RefObject<HTMLDivElement | null>
  metadataPending: boolean
  operationHint: string | null
  onSyncName: () => void
  onStartVectorPanelResize: (event: ReactMouseEvent<HTMLDivElement>) => void
  layoutLocked: boolean
}

export function buildMetadataManagementPanelProps(params: BuildMetadataManagementPanelPropsParams) {
  return {
    visible: params.metadataManageMode,
    collapsed: params.searchPanelCollapsed,
    panelHeight: params.vectorPanelHeight,
    panelRef: params.vectorPanelRef,
    panelContentRef: params.vectorPanelContentRef,
    metadataPending: params.metadataPending,
    operationHint: params.operationHint,
    onSyncName: params.onSyncName,
    onExpand: () => params.setSearchPanelCollapsed(false),
    onStartResize: params.onStartVectorPanelResize,
    layoutLocked: params.layoutLocked,
  }
}
