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
  return node.kind === 'package' || node.imageNodeType === 'package' || node.imageNodeType === 'directory'
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

function resolveRootScopedImageNodes(imageRootNode: SidebarNode): SidebarNode[] {
  if (isImagePointerFolderNode(imageRootNode)) {
    return imageRootNode.children
  }
  return [imageRootNode]
}

function pruneProceduralImagePathNodes(nodes: SidebarNode[]): SidebarNode[] {
  const next: SidebarNode[] = []

  for (const node of nodes) {
    const normalizedChildren = pruneProceduralImagePathNodes(node.children)
    const nextNode: SidebarNode = {
      ...node,
      children: normalizedChildren,
    }

    const hasDirectMediaChild = nextNode.children.some((child) => isImageMediaNode(child))
    if (isImagePointerFolderNode(nextNode) && !hasDirectMediaChild) {
      next.push(...nextNode.children)
      continue
    }

    next.push(nextNode)
  }

  return next
}

function collapseImageMediaNodeChildren(nodes: SidebarNode[]): SidebarNode[] {
  return nodes.map((node) => {
    const normalizedChildren = collapseImageMediaNodeChildren(node.children)
    if (isImageMediaNode(node)) {
      return {
        ...node,
        children: [],
      }
    }

    return {
      ...node,
      children: normalizedChildren,
    }
  })
}

function buildImageSourceNodeIdMap(nodes: SidebarNode[]): Map<string, string> {
  const map = new Map<string, string>()

  const walk = (node: SidebarNode, mediaOwnerNodeId: string | null) => {
    const nodeIsMedia = isImageMediaNode(node)
    const ownerNodeId = mediaOwnerNodeId ?? (nodeIsMedia ? node.id : null)

    if (node.imageSourceId) {
      map.set(node.imageSourceId, ownerNodeId ?? node.id)
    }

    for (const child of node.children) {
      walk(child, ownerNodeId)
    }
  }

  for (const node of nodes) {
    walk(node, null)
  }

  return map
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

  const { imageTreeForSidebarNormal, normalImageSourceNodeIdMap } = useMemo(() => {
    const normalizeTree = (nodes: SidebarNode[]) =>
      normalizePointerSidebarTree(nodes, {
        isPointerFolderNode: isImagePointerFolderNode,
        isMediaNode: isImageMediaNode,
      })

    const rootScopedNodes = imageRootNode
      ? resolveRootScopedImageNodes(imageRootNode)
      : reorderImageRootNodes(compactImageSidebarTree(imageTreeRaw), activeLocale)

    const compactedNodes = imageRootNode
      ? compactImageSidebarTree(rootScopedNodes)
      : rootScopedNodes

    const prunedNodes = pruneProceduralImagePathNodes(compactedNodes)
    const normalizedNodes = normalizeTree(prunedNodes)
    return {
      imageTreeForSidebarNormal: collapseImageMediaNodeChildren(normalizedNodes),
      normalImageSourceNodeIdMap: buildImageSourceNodeIdMap(normalizedNodes),
    }
  }, [activeLocale, imageRootNode, imageTreeRaw])

  return {
    imageTreeForSidebarNormal,
    normalImageSourceNodeIdMap,
  }
}
