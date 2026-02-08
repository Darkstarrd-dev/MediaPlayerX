import { useMemo } from 'react'

import type { SidebarNode } from '../../types'

interface UseImageSidebarBaseStateParams {
  imageTreeRaw: SidebarNode[]
  imageRootNode: SidebarNode | null
}

interface UseImageSidebarBaseStateResult {
  imageTreeForSidebarNormal: SidebarNode[]
  normalImageSourceNodeIdMap: Map<string, string>
}

export function useImageSidebarBaseState({
  imageTreeRaw,
  imageRootNode,
}: UseImageSidebarBaseStateParams): UseImageSidebarBaseStateResult {
  const imageTreeForSidebarNormal = useMemo(() => {
    if (!imageRootNode) {
      return imageTreeRaw
    }
    return [imageRootNode]
  }, [imageRootNode, imageTreeRaw])

  const normalImageSourceNodeIdMap = useMemo(() => {
    const map = new Map<string, string>()
    const walk = (nodes: SidebarNode[]) => {
      for (const node of nodes) {
        if (node.imageSourceId) {
          map.set(node.imageSourceId, node.id)
        }
        if (node.children.length > 0) {
          walk(node.children)
        }
      }
    }
    walk(imageTreeForSidebarNormal)
    return map
  }, [imageTreeForSidebarNormal])

  return {
    imageTreeForSidebarNormal,
    normalImageSourceNodeIdMap,
  }
}
