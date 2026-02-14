import { useMemo } from 'react'

import type { SidebarNode } from '../../types'

const MUSIC_BOOKLET_ROOT_LABEL = 'CD Booklet'

function reorderImageRootNodes(nodes: SidebarNode[]): SidebarNode[] {
  const next = [...nodes]
  next.sort((left, right) => {
    const leftBooklet = left.pathKey.localeCompare(MUSIC_BOOKLET_ROOT_LABEL, 'zh-CN', { sensitivity: 'base' }) === 0
    const rightBooklet = right.pathKey.localeCompare(MUSIC_BOOKLET_ROOT_LABEL, 'zh-CN', { sensitivity: 'base' }) === 0
    if (leftBooklet === rightBooklet) {
      return 0
    }
    return leftBooklet ? 1 : -1
  })
  return next
}

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
      return reorderImageRootNodes(imageTreeRaw)
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
