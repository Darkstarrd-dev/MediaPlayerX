import type { BrowserMode } from '../../types'
import type { MouseEvent as ReactMouseEvent, RefObject } from 'react'

type MetadataTaskKind = 'auto-tags' | 'vision-tags' | 'embeddings'
type MetadataTaskStatus = 'idle' | 'running' | 'paused'

interface BuildMetadataManagementPanelPropsParams {
  mode: BrowserMode
  metadataManageMode: boolean
  searchPanelCollapsed: boolean
  setSearchPanelCollapsed: (collapsed: boolean) => void
  vectorPanelHeight: number
  vectorPanelRef: RefObject<HTMLDivElement | null>
  vectorPanelContentRef: RefObject<HTMLDivElement | null>
  metadataPending: boolean
  operationHint: string | null
  taskKind: MetadataTaskKind | null
  taskStatus: MetadataTaskStatus
  taskProcessed: number
  taskTotal: number
  onSyncName: () => void
  onAutoTags: () => void
  onVisionTags: () => void
  onEmbeddings: () => void
  onStopTask: () => void
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
    showGenerationActions: params.mode === 'image',
    metadataPending: params.metadataPending,
    operationHint: params.operationHint,
    taskKind: params.taskKind,
    taskStatus: params.taskStatus,
    taskProcessed: params.taskProcessed,
    taskTotal: params.taskTotal,
    onSyncName: params.onSyncName,
    onAutoTags: params.onAutoTags,
    onVisionTags: params.onVisionTags,
    onEmbeddings: params.onEmbeddings,
    onStopTask: params.onStopTask,
    onExpand: () => params.setSearchPanelCollapsed(false),
    onStartResize: params.onStartVectorPanelResize,
    layoutLocked: params.layoutLocked,
  }
}
