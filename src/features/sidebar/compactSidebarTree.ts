import type { SidebarNode } from '../../types'

interface CompactSidebarTreeOptions {
  shouldCompressFolderNode: (node: SidebarNode) => boolean
  includeRoot?: boolean
  shouldMergeParentIntoChild?: (parent: SidebarNode, child: SidebarNode) => boolean
}

function compactSidebarNode(
  node: SidebarNode,
  isRoot: boolean,
  options: CompactSidebarTreeOptions,
): SidebarNode {
  let cursor = node
  const mergedLabels = [node.label]
  const shouldCompactCurrentRoot = options.includeRoot ?? true

  if (!isRoot || shouldCompactCurrentRoot) {
    while (options.shouldCompressFolderNode(cursor) && cursor.children.length === 1) {
      const child = cursor.children[0]
      if (options.shouldMergeParentIntoChild && !options.shouldMergeParentIntoChild(cursor, child)) {
        break
      }
      mergedLabels.push(child.label)
      cursor = child
      if (!options.shouldCompressFolderNode(cursor)) {
        break
      }
    }
  }

  return {
    ...cursor,
    label: mergedLabels.length > 1 ? mergedLabels.join('/') : cursor.label,
    children: cursor.children.map((child) => compactSidebarNode(child, false, options)),
  }
}

export function compactSidebarTree(
  nodes: SidebarNode[],
  options: CompactSidebarTreeOptions,
): SidebarNode[] {
  return nodes.map((node) => compactSidebarNode(node, true, options))
}
