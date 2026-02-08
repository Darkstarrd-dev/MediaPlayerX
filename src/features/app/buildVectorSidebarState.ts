import { buildSidebarTree } from '../../mockData'
import type { ImagePackage, SidebarNode, VectorCandidate } from '../../types'

interface VectorSidebarState {
  nodes: SidebarNode[]
  packageNodeIdMap: Map<string, string>
}

export function buildVectorSidebarState(
  vectorSearchResults: VectorCandidate[],
  packageById: Map<string, ImagePackage>,
): VectorSidebarState {
  const resultCountByPackage = new Map<string, number>()
  for (const candidate of vectorSearchResults) {
    resultCountByPackage.set(candidate.packageId, (resultCountByPackage.get(candidate.packageId) ?? 0) + 1)
  }

  const leaves = Array.from(resultCountByPackage.keys())
    .map((packageId) => {
      const pkg = packageById.get(packageId)
      if (!pkg) {
        return null
      }
      return {
        id: packageId,
        treePath: pkg.treePath,
      }
    })
    .filter((leaf): leaf is { id: string; treePath: string[] } => Boolean(leaf))

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
