import { useMemo } from 'react'

import { resolveActiveLocale } from '../../i18n/locale'
import { useUiStore } from '../../store/useUiStore'
import type { SidebarNode } from '../../types'

const MUSIC_BOOKLET_ROOT_LABEL = 'CD Booklet'

function isCompressibleImageFolderNode(node: SidebarNode): boolean {
  if (node.kind !== 'folder') {
    return false
  }

  if (node.imageNodeType && node.imageNodeType !== 'folder') {
    return false
  }

  if (node.imageSourceId || node.packageId || node.videoId || node.audioId) {
    return false
  }

  return (node.directImageCount ?? 0) === 0
}

function compactImageSidebarNode(node: SidebarNode, isRoot: boolean): SidebarNode {
  let cursor = node
  const mergedLabels = [node.label]

  if (!isRoot) {
    while (isCompressibleImageFolderNode(cursor) && cursor.children.length === 1) {
      const child = cursor.children[0]
      if (!isCompressibleImageFolderNode(child)) {
        break
      }
      mergedLabels.push(child.label)
      cursor = child
    }
  }

  return {
    ...cursor,
    label: mergedLabels.length > 1 ? mergedLabels.join('/') : cursor.label,
    children: cursor.children.map((child) => compactImageSidebarNode(child, false)),
  }
}

function compactImageSidebarTree(nodes: SidebarNode[]): SidebarNode[] {
  return nodes.map((node) => compactImageSidebarNode(node, true))
}

function reorderImageRootNodes(nodes: SidebarNode[], locale: string): SidebarNode[] {
  const localeCollator = new Intl.Collator(locale, { sensitivity: 'base' })
  const next = [...nodes]
  next.sort((left, right) => {
    const leftBooklet = localeCollator.compare(left.pathKey, MUSIC_BOOKLET_ROOT_LABEL) === 0
    const rightBooklet = localeCollator.compare(right.pathKey, MUSIC_BOOKLET_ROOT_LABEL) === 0
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
  const uiLocale = useUiStore((state) => state?.uiLocale ?? 'auto')
  const activeLocale = useMemo(
    () => resolveActiveLocale(uiLocale, typeof navigator === 'undefined' ? null : navigator.language),
    [uiLocale],
  )

  const imageTreeForSidebarNormal = useMemo(() => {
    if (!imageRootNode) {
      return reorderImageRootNodes(compactImageSidebarTree(imageTreeRaw), activeLocale)
    }
    return compactImageSidebarTree([imageRootNode])
  }, [activeLocale, imageRootNode, imageTreeRaw])

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
