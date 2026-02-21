import { useCallback, useMemo, type RefObject } from 'react'

import type { AudioItem, BrowserMode, SidebarNode } from '../../types'
import { clamp } from '../../utils/ui'

interface UseSidebarNavigationParams {
  mode: BrowserMode
  imageTreeForSidebar: SidebarNode[]
  videoTreeForSidebar: SidebarNode[]
  audioTreeForSidebar: SidebarNode[]
  audiosForSidebar: AudioItem[]
  imageRootNode: SidebarNode | null
  videoRootNode: SidebarNode | null
  musicRootNode: SidebarNode | null
  selectedSidebarNodeId: string | null
  appBodyRef: RefObject<HTMLDivElement | null>
  onSetSelectedSidebarNodeId: (nodeId: string | null) => void
  onSelectPackage: (packageId: string) => void
  onSelectVideo: (videoId: string) => void
  onSelectAudio: (audioId: string) => void
  onSetSidebarFocusMain: () => void
  onSetImageRootNodeId: (nodeId: string) => void
  onSetVideoRootNodeId: (nodeId: string) => void
  onSetMusicRootNodeId: (nodeId: string) => void
}

interface UseSidebarNavigationResult {
  activeSidebarTree: SidebarNode[]
  flatSidebarNodes: SidebarNode[]
  sidebarNodeById: Map<string, SidebarNode>
  imageSourceNodeIdMap: Map<string, string>
  videoNodeIdMap: Map<string, string>
  audioNodeIdMap: Map<string, string>
  selectedSidebarNode: SidebarNode | null
  canSetCurrentRoot: boolean
  currentRootLabel: string | null
  applyCurrentRootFromSelection: () => void
  ensureSidebarNodeVisible: (nodeId: string) => void
  handleSidebarNavigationKey: (event: KeyboardEvent) => boolean
}

function resolveFirstAudioId(node: SidebarNode): string | null {
  if (node.audioId) {
    return node.audioId
  }

  for (const child of node.children) {
    const candidate = resolveFirstAudioId(child)
    if (candidate) {
      return candidate
    }
  }

  return null
}

export function useSidebarNavigation({
  mode,
  imageTreeForSidebar,
  videoTreeForSidebar,
  audioTreeForSidebar,
  audiosForSidebar,
  imageRootNode,
  videoRootNode,
  musicRootNode,
  selectedSidebarNodeId,
  appBodyRef,
  onSetSelectedSidebarNodeId,
  onSelectPackage,
  onSelectVideo,
  onSelectAudio,
  onSetSidebarFocusMain,
  onSetImageRootNodeId,
  onSetVideoRootNodeId,
  onSetMusicRootNodeId,
}: UseSidebarNavigationParams): UseSidebarNavigationResult {
  const activeSidebarTree = mode === 'image' ? imageTreeForSidebar : mode === 'video' ? videoTreeForSidebar : audioTreeForSidebar

  const flatSidebarNodes = useMemo(() => {
    const items: SidebarNode[] = []
    const walk = (nodes: SidebarNode[]) => {
      for (const node of nodes) {
        items.push(node)
        if (node.children.length > 0) {
          walk(node.children)
        }
      }
    }
    walk(activeSidebarTree)
    return items
  }, [activeSidebarTree])

  const sidebarNodeById = useMemo(() => new Map(flatSidebarNodes.map((node) => [node.id, node])), [flatSidebarNodes])

  const imageSourceNodeIdMap = useMemo(() => {
    if (mode !== 'image') {
      return new Map<string, string>()
    }

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
    walk(imageTreeForSidebar)
    return map
  }, [imageTreeForSidebar, mode])

  const videoNodeIdMap = useMemo(() => {
    if (mode !== 'video') {
      return new Map<string, string>()
    }

    const map = new Map<string, string>()
    const walk = (nodes: SidebarNode[]) => {
      for (const node of nodes) {
        if (node.videoId) {
          map.set(node.videoId, node.id)
        }
        if (node.children.length > 0) {
          walk(node.children)
        }
      }
    }
    walk(videoTreeForSidebar)
    return map
  }, [mode, videoTreeForSidebar])

  const audioNodeIdMap = useMemo(() => {
    if (mode !== 'music') {
      return new Map<string, string>()
    }

    const folderNodeIdByPathKey = new Map<string, string>()
    const walkFolders = (nodes: SidebarNode[]) => {
      for (const node of nodes) {
        folderNodeIdByPathKey.set(node.pathKey, node.id)
        if (node.children.length > 0) {
          walkFolders(node.children)
        }
      }
    }
    walkFolders(audioTreeForSidebar)

    const map = new Map<string, string>()
    for (const audio of audiosForSidebar) {
      const folderSegments = audio.treePath.slice(0, Math.max(0, audio.treePath.length - 1))
      for (let length = folderSegments.length; length >= 1; length -= 1) {
        const pathKey = folderSegments.slice(0, length).join('/')
        const nodeId = folderNodeIdByPathKey.get(pathKey)
        if (!nodeId) {
          continue
        }
        map.set(audio.id, nodeId)
        break
      }
    }

    return map
  }, [audioTreeForSidebar, audiosForSidebar, mode])

  const selectedSidebarNode = selectedSidebarNodeId ? sidebarNodeById.get(selectedSidebarNodeId) ?? null : null
  const canSetCurrentRoot = selectedSidebarNode?.kind === 'folder'
  const currentRootLabel = mode === 'image' ? imageRootNode?.label ?? null : mode === 'video' ? videoRootNode?.label ?? null : musicRootNode?.label ?? null

  const applyCurrentRootFromSelection = useCallback(() => {
    if (!selectedSidebarNode || selectedSidebarNode.kind !== 'folder') {
      return
    }

    if (mode === 'image') {
      onSetImageRootNodeId(selectedSidebarNode.id)
      return
    }

    if (mode === 'video') {
      onSetVideoRootNodeId(selectedSidebarNode.id)
      return
    }

    onSetMusicRootNodeId(selectedSidebarNode.id)
  }, [mode, onSetImageRootNodeId, onSetMusicRootNodeId, onSetVideoRootNodeId, selectedSidebarNode])

  const ensureSidebarNodeVisible = useCallback(
    (nodeId: string) => {
      const container = appBodyRef.current?.querySelector<HTMLElement>('.sidebar-tree')
      if (!container) {
        return
      }

      const rowElements = Array.from(container.querySelectorAll<HTMLElement>('[data-sidebar-node-id]'))
      const targetIndex = rowElements.findIndex((row) => row.dataset.sidebarNodeId === nodeId)
      const targetRow = targetIndex >= 0 ? rowElements[targetIndex] : null
      if (!targetRow) {
        return
      }

      if (targetIndex === 0) {
        container.scrollTop = 0
        return
      }

      if (targetIndex === rowElements.length - 1) {
        container.scrollTop = Math.max(0, container.scrollHeight - container.clientHeight)
        return
      }

      const rowTop = targetRow.offsetTop
      const rowBottom = rowTop + targetRow.offsetHeight
      const viewTop = container.scrollTop
      const viewBottom = viewTop + container.clientHeight

      if (rowTop < viewTop) {
        container.scrollTop = Math.max(0, rowTop - 4)
        return
      }

      if (rowBottom > viewBottom) {
        const nextTop = rowBottom - container.clientHeight + 4
        container.scrollTop = Math.min(nextTop, Math.max(0, container.scrollHeight - container.clientHeight))
      }
    },
    [appBodyRef],
  )

  const handleSidebarNavigationKey = useCallback(
    (event: KeyboardEvent): boolean => {
      if (flatSidebarNodes.length === 0) {
        return false
      }

      const currentId = selectedSidebarNodeId && sidebarNodeById.has(selectedSidebarNodeId) ? selectedSidebarNodeId : flatSidebarNodes[0].id
      const currentIndex = Math.max(
        0,
        flatSidebarNodes.findIndex((node) => node.id === currentId),
      )

      const applyNodeSelection = (node: SidebarNode) => {
        if (mode === 'image' && node.imageSourceId) {
          onSelectPackage(node.imageSourceId)
        }
        if (mode === 'video' && node.videoId) {
          onSelectVideo(node.videoId)
        }
        if (mode === 'music') {
          const targetAudioId = resolveFirstAudioId(node)
          if (targetAudioId) {
            onSelectAudio(targetAudioId)
          }
        }
      }

      const moveSelection = (nextIndex: number) => {
        const nextNode = flatSidebarNodes[clamp(nextIndex, 0, flatSidebarNodes.length - 1)]
        if (!nextNode) {
          return false
        }
        onSetSelectedSidebarNodeId(nextNode.id)
        applyNodeSelection(nextNode)
        requestAnimationFrame(() => ensureSidebarNodeVisible(nextNode.id))
        return true
      }

      const container = appBodyRef.current?.querySelector<HTMLElement>('.sidebar-tree')
      const findVisibleCount = (): number => {
        if (!container) {
          return 9
        }

        const viewTop = container.scrollTop
        const viewBottom = viewTop + container.clientHeight
        const indexById = new Map(flatSidebarNodes.map((node, index) => [node.id, index]))
        const visibleRows = Array.from(container.querySelectorAll<HTMLElement>('[data-sidebar-node-id]'))
          .map((row) => {
            const rowId = row.dataset.sidebarNodeId
            if (!rowId) {
              return null
            }

            const rowIndex = indexById.get(rowId)
            if (rowIndex === undefined) {
              return null
            }

            return {
              index: rowIndex,
              top: row.offsetTop,
              bottom: row.offsetTop + row.offsetHeight,
            }
          })
          .filter((item): item is { index: number; top: number; bottom: number } => item !== null)
          .filter((row) => row.bottom > viewTop && row.top < viewBottom)
          .length

        if (visibleRows === 0) {
          return 9
        }

        return visibleRows
      }

      if (event.key === 'ArrowDown') {
        return moveSelection(currentIndex + 1)
      }
      if (event.key === 'ArrowUp') {
        return moveSelection(currentIndex - 1)
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        onSetSidebarFocusMain()
        return true
      }
      if (event.key === 'PageDown') {
        const pageStep = Math.max(1, findVisibleCount() - 1)
        return moveSelection(currentIndex + pageStep)
      }
      if (event.key === 'PageUp') {
        const pageStep = Math.max(1, findVisibleCount() - 1)
        return moveSelection(currentIndex - pageStep)
      }
      if (event.key === 'Home') {
        return moveSelection(0)
      }
      if (event.key === 'End') {
        return moveSelection(flatSidebarNodes.length - 1)
      }
      if (event.key === 'Enter') {
        const node = flatSidebarNodes[currentIndex]
        if (!node) {
          return false
        }
        onSetSelectedSidebarNodeId(node.id)
        applyNodeSelection(node)
        requestAnimationFrame(() => ensureSidebarNodeVisible(node.id))
        return true
      }

      return false
    },
    [
      appBodyRef,
      ensureSidebarNodeVisible,
      flatSidebarNodes,
      mode,
      onSelectPackage,
      onSelectAudio,
      onSelectVideo,
      onSetSelectedSidebarNodeId,
      onSetSidebarFocusMain,
      selectedSidebarNodeId,
      sidebarNodeById,
    ],
  )

  return {
    activeSidebarTree,
    flatSidebarNodes,
    sidebarNodeById,
    imageSourceNodeIdMap,
    videoNodeIdMap,
    audioNodeIdMap,
    selectedSidebarNode,
    canSetCurrentRoot,
    currentRootLabel,
    applyCurrentRootFromSelection,
    ensureSidebarNodeVisible,
    handleSidebarNavigationKey,
  }
}
