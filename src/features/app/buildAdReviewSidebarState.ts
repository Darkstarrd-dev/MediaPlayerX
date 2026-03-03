import { buildSidebarTree } from "../../mockData";
import type { ManageAdReviewTaskDto } from "../../contracts/backend";
import type { ImagePackage, SidebarNode } from "../../types";
import { createImageSidebarModePredicates } from "../sidebar/sidebarTreePredicates";

interface BuildAdReviewSidebarStateParams {
  focusTask: ManageAdReviewTaskDto | null;
  packageById: Map<string, ImagePackage>;
}

interface AdReviewSidebarNodeMetrics {
  node: SidebarNode;
  packageCount: number;
  imageCount: number;
}

const isCompressibleImageFolderNode =
  createImageSidebarModePredicates().isCompressibleFolderNode;

function compactImageSidebarNode(
  node: SidebarNode,
  isRoot: boolean,
): SidebarNode {
  let cursor = node;
  const mergedLabels = [node.label];

  if (!isRoot) {
    while (
      isCompressibleImageFolderNode(cursor) &&
      cursor.children.length === 1
    ) {
      const child = cursor.children[0];
      if (!isCompressibleImageFolderNode(child)) {
        break;
      }
      mergedLabels.push(child.label);
      cursor = child;
    }
  }

  return {
    ...cursor,
    label: mergedLabels.length > 1 ? mergedLabels.join("/") : cursor.label,
    children: cursor.children.map((child) =>
      compactImageSidebarNode(child, false),
    ),
  };
}

function compactImageSidebarTree(nodes: SidebarNode[]): SidebarNode[] {
  return nodes.map((node) => compactImageSidebarNode(node, true));
}

function decorateNodesWithMetrics(
  nodes: SidebarNode[],
  suspectedCountByPackageId: Map<string, number>,
): AdReviewSidebarNodeMetrics[] {
  return nodes.map((node) => {
    const childMetrics = decorateNodesWithMetrics(
      node.children,
      suspectedCountByPackageId,
    );
    const selfImageCount = node.packageId
      ? (suspectedCountByPackageId.get(node.packageId) ?? 0)
      : 0;
    const descendantImageCount =
      selfImageCount +
      childMetrics.reduce((sum, child) => sum + child.imageCount, 0);
    const descendantPackageCount =
      (node.packageId ? 1 : 0) +
      childMetrics.reduce((sum, child) => sum + child.packageCount, 0);

    return {
      node: {
        ...node,
        children: childMetrics.map((child) => child.node),
        imageNodeType: node.kind === "folder" ? "folder" : "package",
        imageSourceId: node.packageId ?? node.imageSourceId,
        directImageCount: selfImageCount,
        descendantImageCount,
        descendantPackageCount,
        descendantNodeCount: descendantImageCount,
      },
      packageCount: descendantPackageCount,
      imageCount: descendantImageCount,
    };
  });
}

export function buildAdReviewSidebarState({
  focusTask,
  packageById,
}: BuildAdReviewSidebarStateParams): SidebarNode[] {
  if (!focusTask || focusTask.candidates.length === 0) {
    return [];
  }

  const suspectedCountByPackageId = new Map<string, number>();
  for (const candidate of focusTask.candidates) {
    suspectedCountByPackageId.set(
      candidate.package_id,
      (suspectedCountByPackageId.get(candidate.package_id) ?? 0) + 1,
    );
  }

  const leaves: Array<{ id: string; treePath: string[]; leafLabel?: string }> =
    [];
  for (const packageId of suspectedCountByPackageId.keys()) {
    const pkg = packageById.get(packageId);
    if (!pkg) {
      continue;
    }

    leaves.push({
      id: packageId,
      treePath: pkg.treePath,
      leafLabel: pkg.displayName,
    });
  }

  const rawTree = buildSidebarTree(leaves, "package");
  const decorated = decorateNodesWithMetrics(
    rawTree,
    suspectedCountByPackageId,
  ).map((item) => item.node);
  return compactImageSidebarTree(decorated);
}
