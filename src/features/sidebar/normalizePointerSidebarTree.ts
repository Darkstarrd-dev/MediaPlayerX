import type { SidebarNode } from '../../types'

interface NormalizePointerSidebarTreeOptions {
  isPointerFolderNode: (node: SidebarNode) => boolean
  isMediaNode: (node: SidebarNode) => boolean
}

function compareSiblingNodes(
  left: SidebarNode,
  right: SidebarNode,
  isMediaNode: NormalizePointerSidebarTreeOptions['isMediaNode'],
): number {
  const leftIsMedia = isMediaNode(left)
  const rightIsMedia = isMediaNode(right)
  if (leftIsMedia !== rightIsMedia) {
    return leftIsMedia ? -1 : 1
  }

  return left.label.localeCompare(right.label, 'zh-CN', {
    numeric: true,
    sensitivity: 'base',
  })
}

function normalizeNode(
  node: SidebarNode,
  options: NormalizePointerSidebarTreeOptions,
): SidebarNode {
  const nextNode: SidebarNode = options.isPointerFolderNode(node)
    ? {
        ...node,
        label: node.pathKey,
      }
    : {
        ...node,
      }

  const normalizedChildren = nextNode.children
    .map((child) => normalizeNode(child, options))
    .sort((left, right) => compareSiblingNodes(left, right, options.isMediaNode))

  return {
    ...nextNode,
    children: normalizedChildren,
  }
}

export function normalizePointerSidebarTree(
  nodes: SidebarNode[],
  options: NormalizePointerSidebarTreeOptions,
): SidebarNode[] {
  return nodes.map((node) => normalizeNode(node, options))
}
