import { useMemo } from 'react'

import { resolveActiveLocale } from '../../i18n/locale'
import { useUiStore } from '../../store/useUiStore'
import type { SidebarNode } from '../../types'
import { compactSidebarTree } from '../sidebar/compactSidebarTree'
import { normalizePointerSidebarTree } from '../sidebar/normalizePointerSidebarTree'

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

function isImagePointerFolderNode(node: SidebarNode): boolean {
  return isCompressibleImageFolderNode(node)
}

function isImageMediaNode(node: SidebarNode): boolean {
  if (node.kind === 'package') {
    return true
  }

  if (node.kind !== 'folder') {
    return false
  }

  return node.imageNodeType === 'directory' && Boolean(node.imageSourceId)
}

function compactImageSidebarTree(nodes: SidebarNode[]): SidebarNode[] {
  return compactSidebarTree(nodes, {
    shouldCompressFolderNode: isCompressibleImageFolderNode,
    includeRoot: true,
  })
}

function reorderImageRootNodes(nodes: SidebarNode[], locale: string): SidebarNode[] {
  const localeCollator = new Intl.Collator(locale, { sensitivity: 'base' })
  const next = [...nodes]
  next.sort((left, right) => {
    const leftRootSegment = left.pathKey.split('/')[0] ?? left.pathKey
    const rightRootSegment = right.pathKey.split('/')[0] ?? right.pathKey
    const leftBooklet = localeCollator.compare(leftRootSegment, MUSIC_BOOKLET_ROOT_LABEL) === 0
    const rightBooklet = localeCollator.compare(rightRootSegment, MUSIC_BOOKLET_ROOT_LABEL) === 0
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
    const normalizeTree = (nodes: SidebarNode[]) =>
      normalizePointerSidebarTree(nodes, {
        isPointerFolderNode: isImagePointerFolderNode,
        isMediaNode: isImageMediaNode,
      })

    if (!imageRootNode) {
      return normalizeTree(
        reorderImageRootNodes(compactImageSidebarTree(imageTreeRaw), activeLocale),
      )
    }
    return normalizeTree(compactImageSidebarTree([imageRootNode]))
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
