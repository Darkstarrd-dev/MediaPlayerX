import type { SidebarNode } from "../../types";

interface NormalizePointerSidebarTreeOptions {
  isPointerFolderNode: (node: SidebarNode) => boolean;
  isMediaNode: (node: SidebarNode) => boolean;
  pointerLabelMode?: "path" | "segment";
  siblingOrder?: "media-first" | "folder-first";
}

function resolvePathLeaf(pathKey: string, fallbackLabel: string): string {
  const segments = pathKey.split("/");
  const leaf = segments[segments.length - 1]?.trim();
  return leaf && leaf.length > 0 ? leaf : fallbackLabel;
}

function compareSiblingNodes(
  left: SidebarNode,
  right: SidebarNode,
  options: NormalizePointerSidebarTreeOptions,
): number {
  const isMediaNode = options.isMediaNode;
  const leftIsMedia = isMediaNode(left);
  const rightIsMedia = isMediaNode(right);
  if (leftIsMedia !== rightIsMedia) {
    const siblingOrder = options.siblingOrder ?? "media-first";
    if (siblingOrder === "folder-first") {
      return leftIsMedia ? 1 : -1;
    }
    return leftIsMedia ? -1 : 1;
  }

  return left.label.localeCompare(right.label, "zh-CN", {
    numeric: true,
    sensitivity: "base",
  });
}

function normalizeNode(
  node: SidebarNode,
  options: NormalizePointerSidebarTreeOptions,
): SidebarNode {
  const pointerLabelMode = options.pointerLabelMode ?? "path";
  const nextNode: SidebarNode = options.isPointerFolderNode(node)
    ? {
        ...node,
        label:
          pointerLabelMode === "segment"
            ? resolvePathLeaf(node.pathKey, node.label)
            : node.pathKey,
      }
    : {
        ...node,
      };

  const normalizedChildren = nextNode.children
    .map((child) => normalizeNode(child, options))
    .sort((left, right) => compareSiblingNodes(left, right, options));

  return {
    ...nextNode,
    children: normalizedChildren,
  };
}

export function normalizePointerSidebarTree(
  nodes: SidebarNode[],
  options: NormalizePointerSidebarTreeOptions,
): SidebarNode[] {
  return nodes.map((node) => normalizeNode(node, options));
}
