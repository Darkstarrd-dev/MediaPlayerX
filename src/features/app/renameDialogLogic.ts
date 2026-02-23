import type { SidebarNode } from '../../types'

function stripFileExtension(value: string): string {
  return value.replace(/\.[^./\\]+$/, '')
}

/** 从 sidebar 节点推导单文件重命名时的初始草稿名 */
function resolveNodeDraft(
  node: SidebarNode | undefined,
  videosForSidebar: readonly { id: string; fileName: string }[],
  packageByIdEffective: ReadonlyMap<string, { absolutePath: string }>,
): string {
  if (!node) {
    return ''
  }

  if (node.videoId) {
    const video = videosForSidebar.find((item) => item.id === node.videoId)
    if (video) {
      return stripFileExtension(video.fileName)
    }
  }

  if (node.packageId) {
    const source = packageByIdEffective.get(node.packageId)
    if (source) {
      const fileName = source.absolutePath.split(/[\\/]/).pop() ?? node.label
      return stripFileExtension(fileName)
    }
  }

  return node.label
}

export interface RenameDialogOpenResult {
  targetNodeId: string | null
  targetNodeIds: string[]
  targetImageIds: string[]
  draft: string
  renameMode: 'single' | 'replace'
}

/**
 * 统一的重命名面板参数计算。
 *
 * 管理模式：folder 本身不算更名对象，仅非 folder 的单选状态触发单文件面板，
 * 其余情况触发批量更名面板。
 * 非管理模式：基于焦点节点触发单文件重命名。
 */
export function computeRenameDialogParams(options: {
  manageMode: boolean
  sidebarCheckedNodeIds: readonly string[]
  imageCheckedIds: readonly string[]
  sidebarNodeById: ReadonlyMap<string, SidebarNode>
  selectedSidebarNodeId: string | null
  videosForSidebar: readonly { id: string; fileName: string }[]
  packageByIdEffective: ReadonlyMap<string, { absolutePath: string }>
}): RenameDialogOpenResult | null {
  const {
    manageMode,
    sidebarCheckedNodeIds,
    imageCheckedIds,
    sidebarNodeById,
    selectedSidebarNodeId,
    videosForSidebar,
    packageByIdEffective,
  } = options

  if (manageMode) {
    const validCheckedNodeIds = sidebarCheckedNodeIds.filter((id) => sidebarNodeById.has(id))

    // folder 本身不计算在内，仅非 folder 节点作为更名对象
    const targetNodeIds = validCheckedNodeIds.filter((id) => {
      const node = sidebarNodeById.get(id)
      return node !== undefined && node.kind !== 'folder'
    })

    const targetImageIds = [...imageCheckedIds]
    const totalTargets = targetNodeIds.length + targetImageIds.length

    if (totalTargets === 0) {
      return null
    }

    // 仅非 folder 的单选状态才触发单个修改面板
    if (targetNodeIds.length === 1 && targetImageIds.length === 0) {
      const nodeId = targetNodeIds[0]
      const node = sidebarNodeById.get(nodeId)
      return {
        targetNodeId: nodeId,
        targetNodeIds: [nodeId],
        targetImageIds: [],
        draft: resolveNodeDraft(node, videosForSidebar, packageByIdEffective),
        renameMode: 'single',
      }
    }

    // 多选 → 批量更名面板
    return {
      targetNodeId: null,
      targetNodeIds,
      targetImageIds,
      draft: '',
      renameMode: 'replace',
    }
  }

  // 非管理模式：基于焦点节点的单文件重命名
  const targetNodeId =
    selectedSidebarNodeId && sidebarNodeById.has(selectedSidebarNodeId)
      ? selectedSidebarNodeId
      : null

  if (!targetNodeId) {
    return null
  }

  const node = sidebarNodeById.get(targetNodeId)
  return {
    targetNodeId,
    targetNodeIds: [targetNodeId],
    targetImageIds: [],
    draft: resolveNodeDraft(node, videosForSidebar, packageByIdEffective),
    renameMode: 'single',
  }
}
