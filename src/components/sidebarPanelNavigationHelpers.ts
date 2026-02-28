import type { SidebarNode } from "../types";

export interface SidebarParentNavigation {
  previousNodeId: string | null;
  nextNodeId: string | null;
}

export const EMPTY_SIDEBAR_PARENT_NAVIGATION: SidebarParentNavigation = {
  previousNodeId: null,
  nextNodeId: null,
};

export function buildSidebarNodeMap(
  nodes: SidebarNode[],
): Map<string, SidebarNode> {
  const map = new Map<string, SidebarNode>();
  const walk = (currentNodes: SidebarNode[]) => {
    for (const node of currentNodes) {
      map.set(node.id, node);
      if (node.children.length > 0) {
        walk(node.children);
      }
    }
  };
  walk(nodes);
  return map;
}

export function resolveSidebarParentNavigation(
  parentNodeIds: string[],
  nodeOrderIndexById: Map<string, number>,
  selectedSidebarNodeId: string | null,
): SidebarParentNavigation {
  if (parentNodeIds.length === 0) {
    return EMPTY_SIDEBAR_PARENT_NAVIGATION;
  }

  const selectedTargetIndex = selectedSidebarNodeId
    ? parentNodeIds.indexOf(selectedSidebarNodeId)
    : -1;
  if (selectedTargetIndex >= 0) {
    return {
      previousNodeId: parentNodeIds[selectedTargetIndex - 1] ?? null,
      nextNodeId: parentNodeIds[selectedTargetIndex + 1] ?? null,
    };
  }

  const selectedOrder = selectedSidebarNodeId
    ? nodeOrderIndexById.get(selectedSidebarNodeId)
    : undefined;
  if (selectedOrder === undefined) {
    return {
      previousNodeId: null,
      nextNodeId: parentNodeIds[0] ?? null,
    };
  }

  let previousNodeId: string | null = null;
  let nextNodeId: string | null = null;
  for (const targetNodeId of parentNodeIds) {
    const targetOrder = nodeOrderIndexById.get(targetNodeId);
    if (targetOrder === undefined) {
      continue;
    }
    if (targetOrder < selectedOrder) {
      previousNodeId = targetNodeId;
      continue;
    }
    if (targetOrder > selectedOrder) {
      nextNodeId = targetNodeId;
      break;
    }
  }

  return {
    previousNodeId,
    nextNodeId,
  };
}

export function areSidebarParentNodesCollapsed(
  parentNodeIds: string[],
  collapsedNodeIds: Set<string>,
): boolean {
  return parentNodeIds.length > 0
    ? parentNodeIds.every((nodeId) => collapsedNodeIds.has(nodeId))
    : false;
}

export function toggleSidebarParentCollapsedNodes(
  previousNodeIds: Set<string>,
  parentNodeIds: string[],
  allParentsCollapsed: boolean,
): Set<string> {
  const nextNodeIds = new Set(previousNodeIds);
  let changed = false;

  if (allParentsCollapsed) {
    for (const nodeId of parentNodeIds) {
      if (!nextNodeIds.delete(nodeId)) {
        continue;
      }
      changed = true;
    }
  } else {
    for (const nodeId of parentNodeIds) {
      if (nextNodeIds.has(nodeId)) {
        continue;
      }
      nextNodeIds.add(nodeId);
      changed = true;
    }
  }

  return changed ? nextNodeIds : previousNodeIds;
}
