import { buildSidebarTree } from '../../mockData'
import type { ManageAdReviewTaskDto } from '../../contracts/backend'
import type { ImagePackage, SidebarNode } from '../../types'

interface BuildAdReviewSidebarStateParams {
  focusTask: ManageAdReviewTaskDto | null
  packageById: Map<string, ImagePackage>
}

interface AdReviewSidebarNodeMetrics {
  node: SidebarNode
  packageCount: number
  imageCount: number
}

function decorateNodesWithMetrics(nodes: SidebarNode[], suspectedCountByPackageId: Map<string, number>): AdReviewSidebarNodeMetrics[] {
  return nodes.map((node) => {
    const childMetrics = decorateNodesWithMetrics(node.children, suspectedCountByPackageId)
    const selfImageCount = node.packageId ? (suspectedCountByPackageId.get(node.packageId) ?? 0) : 0
    const descendantImageCount = selfImageCount + childMetrics.reduce((sum, child) => sum + child.imageCount, 0)
    const descendantPackageCount = (node.packageId ? 1 : 0) + childMetrics.reduce((sum, child) => sum + child.packageCount, 0)

    return {
      node: {
        ...node,
        children: childMetrics.map((child) => child.node),
        imageSourceId: node.packageId ?? node.imageSourceId,
        directImageCount: selfImageCount,
        descendantImageCount,
        descendantPackageCount,
      },
      packageCount: descendantPackageCount,
      imageCount: descendantImageCount,
    }
  })
}

export function buildAdReviewSidebarState({ focusTask, packageById }: BuildAdReviewSidebarStateParams): SidebarNode[] {
  if (!focusTask || focusTask.status !== 'review' || focusTask.candidates.length === 0) {
    return []
  }

  const suspectedCountByPackageId = new Map<string, number>()
  for (const candidate of focusTask.candidates) {
    suspectedCountByPackageId.set(
      candidate.package_id,
      (suspectedCountByPackageId.get(candidate.package_id) ?? 0) + 1,
    )
  }

  const leaves: Array<{ id: string; treePath: string[]; leafLabel?: string }> = []
  for (const packageId of suspectedCountByPackageId.keys()) {
    const pkg = packageById.get(packageId)
    if (!pkg) {
      continue
    }

    leaves.push({
      id: packageId,
      treePath: pkg.treePath,
      leafLabel: pkg.displayName,
    })
  }

  const rawTree = buildSidebarTree(leaves, 'package')
  return decorateNodesWithMetrics(rawTree, suspectedCountByPackageId).map((item) => item.node)
}
