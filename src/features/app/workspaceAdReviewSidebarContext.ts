import { buildAdReviewSidebarState } from './buildAdReviewSidebarState'
import type { ManageAdReviewTaskDto } from '../../contracts/backend'
import type { ImagePackage, SidebarNode } from '../../types'

interface ResolveAdReviewSidebarContextParams {
  mode: 'image' | 'video' | 'music'
  adReviewFocusTaskId: string | null
  queueTasks: ManageAdReviewTaskDto[]
  packageByIdEffective: Map<string, ImagePackage>
  sidebarNodeById: Map<string, SidebarNode>
  selectedSidebarNodeId: string | null
  imageTreeForSidebar: SidebarNode[]
}

interface ResolveAdReviewSidebarContextResult {
  adReviewFocusTask: ManageAdReviewTaskDto | null
  adReviewResultsMode: boolean
  effectiveSidebarNodeById: Map<string, SidebarNode>
  selectedSidebarNode: SidebarNode | null
  sidebarImageTreeNodes: SidebarNode[]
}

function buildSidebarNodeById(nodes: SidebarNode[]): Map<string, SidebarNode> {
  const nodeById = new Map<string, SidebarNode>()

  const walk = (input: SidebarNode[]) => {
    for (const node of input) {
      nodeById.set(node.id, node)
      walk(node.children)
    }
  }

  walk(nodes)
  return nodeById
}

export function resolveAdReviewSidebarContext({
  mode,
  adReviewFocusTaskId,
  queueTasks,
  packageByIdEffective,
  sidebarNodeById,
  selectedSidebarNodeId,
  imageTreeForSidebar,
}: ResolveAdReviewSidebarContextParams): ResolveAdReviewSidebarContextResult {
  const adReviewFocusTask = adReviewFocusTaskId
    ? queueTasks.find((item) => item.task_id === adReviewFocusTaskId) ?? null
    : null

  const adReviewResultsMode = mode === 'image' && Boolean(adReviewFocusTask && adReviewFocusTask.status === 'review')
  const adReviewSidebarNodes = adReviewResultsMode
    ? buildAdReviewSidebarState({
        focusTask: adReviewFocusTask,
        packageById: packageByIdEffective,
      })
    : []
  const adReviewSidebarNodeById = adReviewResultsMode ? buildSidebarNodeById(adReviewSidebarNodes) : new Map<string, SidebarNode>()
  const effectiveSidebarNodeById = adReviewResultsMode ? adReviewSidebarNodeById : sidebarNodeById
  const selectedSidebarNode = selectedSidebarNodeId ? effectiveSidebarNodeById.get(selectedSidebarNodeId) ?? null : null
  const sidebarImageTreeNodes = adReviewResultsMode ? adReviewSidebarNodes : imageTreeForSidebar

  return {
    adReviewFocusTask,
    adReviewResultsMode,
    effectiveSidebarNodeById,
    selectedSidebarNode,
    sidebarImageTreeNodes,
  }
}
