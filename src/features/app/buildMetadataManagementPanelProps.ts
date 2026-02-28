import type { MouseEvent as ReactMouseEvent, RefObject } from 'react'
import type { ParsedExternalMetadata } from '../metadata/parseExternalMetadata'

interface BuildMetadataManagementPanelPropsParams {
  metadataManageMode: boolean
  searchPanelCollapsed: boolean
  setSearchPanelCollapsed: (collapsed: boolean) => void
  workspaceBottomPanelHeight: number
  vectorPanelRef: RefObject<HTMLDivElement | null>
  vectorPanelContentRef: RefObject<HTMLDivElement | null>
  metadataPending: boolean
  operationHint: string | null
  onSyncName: () => void
  onSaveParsedMetadata: (parsed: ParsedExternalMetadata) => Promise<void>
  onStartWorkspaceBottomPanelResize: (event: ReactMouseEvent<HTMLDivElement>) => void
  layoutLocked: boolean
  targetPackageName: string
  targetPackageLabel: string
  proxyServer: string
}

function stripArchiveSuffix(value: string): string {
  return value.replace(/\.(zip|rar|7z|cbz|cbr)$/i, '').trim()
}

export function buildMetadataManagementPanelProps(params: BuildMetadataManagementPanelPropsParams) {
  return {
    visible: params.metadataManageMode,
    collapsed: params.searchPanelCollapsed,
    panelHeight: params.workspaceBottomPanelHeight,
    panelRef: params.vectorPanelRef,
    panelContentRef: params.vectorPanelContentRef,
    metadataPending: params.metadataPending,
    operationHint: params.operationHint,
    onSyncName: params.onSyncName,
    onSaveParsedMetadata: params.onSaveParsedMetadata,
    onExpand: () => params.setSearchPanelCollapsed(false),
    onStartResize: params.onStartWorkspaceBottomPanelResize,
    layoutLocked: params.layoutLocked,
    defaultFetchText: stripArchiveSuffix(params.targetPackageName),
    proxyServer: params.proxyServer,
    targetPackageLabel: params.targetPackageLabel,
  }
}
