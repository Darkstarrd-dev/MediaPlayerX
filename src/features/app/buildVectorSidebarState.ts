import { buildSidebarTree } from '../../mockData'
import type { ImagePackage, SidebarNode, VectorCandidate } from '../../types'

interface VectorSidebarState {
  nodes: SidebarNode[]
  packageNodeIdMap: Map<string, string>
}

function normalizeNodeLabelCompare(value: string): string {
  return value.trim().replace(/\.[^./\\]+$/, '').toLowerCase()
}

function shouldUseWorkTitleLabel(packageName: string, workTitle: string): boolean {
  const normalizedWorkTitle = normalizeNodeLabelCompare(workTitle)
  if (normalizedWorkTitle.length === 0) {
    return false
  }
  return normalizeNodeLabelCompare(packageName) !== normalizedWorkTitle
}

export function buildVectorSidebarState(
  vectorSearchResults: VectorCandidate[],
  packageById: Map<string, ImagePackage>,
): VectorSidebarState {
  const resultCountByPackage = new Map<string, number>()
  for (const candidate of vectorSearchResults) {
    resultCountByPackage.set(candidate.packageId, (resultCountByPackage.get(candidate.packageId) ?? 0) + 1)
  }

  const leaves: Array<{ id: string; treePath: string[]; leafLabel?: string }> = []
  for (const packageId of resultCountByPackage.keys()) {
    const pkg = packageById.get(packageId)
    if (!pkg) {
      continue
    }

    leaves.push({
      id: packageId,
      treePath: pkg.treePath,
      leafLabel: shouldUseWorkTitleLabel(pkg.packageName, pkg.workTitle) ? pkg.workTitle : undefined,
    })
  }

  const rawTree = buildSidebarTree(leaves, 'package')
  const packageNodeIdMap = new Map<string, string>()

  const decorateNodes = (nodes: SidebarNode[]): SidebarNode[] => {
    return nodes.map((node) => {
      const children = decorateNodes(node.children)
      const selfResultCount = node.packageId ? (resultCountByPackage.get(node.packageId) ?? 0) : undefined

      if (node.packageId) {
        packageNodeIdMap.set(node.packageId, node.id)
      }

      return {
        ...node,
        children,
        imageSourceId: node.packageId ?? node.imageSourceId,
        directImageCount: selfResultCount,
      }
    })
  }

  return {
    nodes: decorateNodes(rawTree),
    packageNodeIdMap,
  }
}
