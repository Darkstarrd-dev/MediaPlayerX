import type {
  BrowserMode,
  SidebarNode,
  SidebarTreeDisplayMode,
} from "../types";

export type SidebarLabelDisplayMode = "full" | "leaf";

export interface VisibleSidebarRow {
  node: SidebarNode;
  depth: number;
}

export function resolveFirstAudioId(node: SidebarNode): string | null {
  if (node.audioId) {
    return node.audioId;
  }

  for (const child of node.children) {
    const candidate = resolveFirstAudioId(child);
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

export function canFolderCollapse(
  mode: BrowserMode,
  node: SidebarNode,
  imageNodeType: SidebarNode["imageNodeType"],
  sidebarTreeDisplayMode: SidebarTreeDisplayMode = "direct",
): boolean {
  if (sidebarTreeDisplayMode === "hierarchy") {
    return node.kind === "folder" && node.children.length > 0;
  }

  if (node.kind !== "folder" || node.children.length === 0) {
    return false;
  }

  if (!isPointerFolderNode(mode, node, imageNodeType)) {
    return false;
  }

  return hasDirectMediaChild(mode, node);
}

export function resolveImageNodeType(
  node: SidebarNode,
): SidebarNode["imageNodeType"] {
  return node.imageNodeType ?? (node.kind === "folder" ? "folder" : "package");
}

function isImageMediaNode(node: SidebarNode): boolean {
  const imageNodeType = resolveImageNodeType(node);
  return (
    node.kind === "package" ||
    imageNodeType === "package" ||
    imageNodeType === "directory"
  );
}

function isVideoMediaNode(node: SidebarNode): boolean {
  return node.kind === "video" || Boolean(node.videoId);
}

function isMusicMediaNode(node: SidebarNode): boolean {
  if (node.kind === "audio") {
    return true;
  }
  if (node.kind !== "folder") {
    return false;
  }
  return (node.directAudioCount ?? 0) > 0;
}

export function isMediaNodeForMode(
  mode: BrowserMode,
  node: SidebarNode,
): boolean {
  if (mode === "image") {
    return isImageMediaNode(node);
  }
  if (mode === "video") {
    return isVideoMediaNode(node);
  }
  return isMusicMediaNode(node);
}

export function hasDirectMediaChild(
  mode: BrowserMode,
  node: SidebarNode,
): boolean {
  if (node.kind !== "folder") {
    return false;
  }
  return node.children.some((child) => isMediaNodeForMode(mode, child));
}

export function isPointerFolderNode(
  mode: BrowserMode,
  node: SidebarNode,
  imageNodeType: SidebarNode["imageNodeType"],
): boolean {
  if (node.kind !== "folder") {
    return false;
  }

  if (mode === "image") {
    if (imageNodeType !== "folder") {
      return false;
    }
    return (
      !node.imageSourceId && !node.packageId && !node.videoId && !node.audioId
    );
  }

  if (mode === "video") {
    return (
      !node.imageSourceId && !node.packageId && !node.videoId && !node.audioId
    );
  }

  return (node.directAudioCount ?? 0) === 0;
}

export function resolveSidebarDisplayLabel(
  node: SidebarNode,
  labelDisplayMode: SidebarLabelDisplayMode,
): string {
  if (labelDisplayMode === "full" || node.kind !== "folder") {
    return node.label;
  }

  const segments = node.pathKey.split("/");
  const leaf = segments[segments.length - 1]?.trim();
  return leaf && leaf.length > 0 ? leaf : node.label;
}

export function resolveAncestorNodeIds(
  nodes: SidebarNode[],
  targetNodeId: string,
): string[] {
  const path: string[] = [];

  const walk = (items: SidebarNode[], ancestors: string[]): boolean => {
    for (const node of items) {
      if (node.id === targetNodeId) {
        path.push(...ancestors);
        return true;
      }

      if (node.children.length === 0) {
        continue;
      }

      if (walk(node.children, [...ancestors, node.id])) {
        return true;
      }
    }

    return false;
  };

  walk(nodes, []);
  return path;
}

export function resolveNodeOrderIndexById(
  nodes: SidebarNode[],
): Map<string, number> {
  const indexById = new Map<string, number>();
  let cursor = 0;

  const walk = (items: SidebarNode[]) => {
    for (const node of items) {
      indexById.set(node.id, cursor);
      cursor += 1;
      if (node.children.length > 0) {
        walk(node.children);
      }
    }
  };

  walk(nodes);
  return indexById;
}

export function resolveImagePackageParentNodeIds(
  nodes: SidebarNode[],
): string[] {
  const orderedNodeIds: string[] = [];
  const walk = (items: SidebarNode[]) => {
    for (const node of items) {
      if (node.kind === "folder" && hasDirectMediaChild("image", node)) {
        orderedNodeIds.push(node.id);
      }

      if (node.children.length > 0) {
        walk(node.children);
      }
    }
  };

  walk(nodes);
  return orderedNodeIds;
}

export function resolveVideoParentNodeIds(nodes: SidebarNode[]): string[] {
  const orderedNodeIds: string[] = [];
  const walk = (items: SidebarNode[]) => {
    for (const node of items) {
      if (node.kind === "folder" && hasDirectMediaChild("video", node)) {
        orderedNodeIds.push(node.id);
      }

      if (node.children.length > 0) {
        walk(node.children);
      }
    }
  };

  walk(nodes);
  return orderedNodeIds;
}

export function resolveAudioParentNodeIds(nodes: SidebarNode[]): string[] {
  const orderedNodeIds: string[] = [];
  const walk = (items: SidebarNode[]) => {
    for (const node of items) {
      if (node.kind === "folder" && hasDirectMediaChild("music", node)) {
        orderedNodeIds.push(node.id);
      }

      if (node.children.length > 0) {
        walk(node.children);
      }
    }
  };

  walk(nodes);
  return orderedNodeIds;
}

export function isSameNodeIdSet(
  left: Set<string>,
  right: Set<string>,
): boolean {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
}

export function flattenVisibleSidebarRows(
  nodes: SidebarNode[],
  depth: number,
  mode: BrowserMode,
  collapsedImageFolderNodeIds: Set<string>,
  rows: VisibleSidebarRow[],
  sidebarTreeDisplayMode: SidebarTreeDisplayMode = "direct",
): void {
  for (const node of nodes) {
    rows.push({ node, depth });

    if (node.children.length === 0) {
      continue;
    }

    const imageNodeType = resolveImageNodeType(node);
    const imageFolderCollapsible = canFolderCollapse(
      mode,
      node,
      imageNodeType,
      sidebarTreeDisplayMode,
    );
    const imageFolderCollapsed =
      imageFolderCollapsible && collapsedImageFolderNodeIds.has(node.id);

    if (imageFolderCollapsed) {
      if (sidebarTreeDisplayMode === "hierarchy") {
        continue;
      }

      for (const child of node.children) {
        if (isMediaNodeForMode(mode, child)) {
          continue;
        }
        flattenVisibleSidebarRows(
          [child],
          depth + 1,
          mode,
          collapsedImageFolderNodeIds,
          rows,
          sidebarTreeDisplayMode,
        );
      }
      continue;
    }

    flattenVisibleSidebarRows(
      node.children,
      depth + 1,
      mode,
      collapsedImageFolderNodeIds,
      rows,
      sidebarTreeDisplayMode,
    );
  }
}
