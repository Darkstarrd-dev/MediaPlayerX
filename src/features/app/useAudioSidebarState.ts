import { useMemo } from 'react'

import { buildSidebarTree, findNodeById } from '../../mockData'
import type { AudioItem, SidebarNode } from '../../types'

interface UseAudioSidebarStateParams {
  audios: AudioItem[]
  musicRootNodeId: string | null
}

interface UseAudioSidebarStateResult {
  audioTreeRaw: SidebarNode[]
  musicRootNode: SidebarNode | null
  rootScopedAudioIds: Set<string>
  audiosForSidebar: AudioItem[]
  audioTreeForSidebar: SidebarNode[]
}

function buildAudioFolderTree(audios: AudioItem[]): SidebarNode[] {
  const directAudioCountByPath = new Map<string, number>()
  const firstAudioIdByPath = new Map<string, string>()
  const uniqueFolderLeaves = new Map<string, { id: string; treePath: string[] }>()

  for (const audio of audios) {
    const folderPath = audio.treePath.slice(0, Math.max(0, audio.treePath.length - 1))
    if (folderPath.length === 0) {
      continue
    }

    const pathKey = folderPath.join('/')
    directAudioCountByPath.set(pathKey, (directAudioCountByPath.get(pathKey) ?? 0) + 1)

    for (let index = 1; index <= folderPath.length; index += 1) {
      const ancestorPathKey = folderPath.slice(0, index).join('/')
      if (!firstAudioIdByPath.has(ancestorPathKey)) {
        firstAudioIdByPath.set(ancestorPathKey, audio.id)
      }
    }

    if (!uniqueFolderLeaves.has(pathKey)) {
      uniqueFolderLeaves.set(pathKey, {
        id: pathKey,
        treePath: folderPath,
      })
    }
  }

  const tree = buildSidebarTree(Array.from(uniqueFolderLeaves.values()), 'folder')

  const hydrateDescendantAudioCounts = (nodes: SidebarNode[]): number => {
    let totalAudioFolderCount = 0

    for (const node of nodes) {
      const childAudioFolderCount = hydrateDescendantAudioCounts(node.children)
      const directCount = directAudioCountByPath.get(node.pathKey) ?? 0
      const selfAudioFolderCount = directCount > 0 ? 1 : 0
      const nodeAudioFolderCount = selfAudioFolderCount + childAudioFolderCount

      node.directAudioCount = directCount
      node.descendantAudioFolderCount = nodeAudioFolderCount
      node.descendantNodeCount = directCount > 0 ? directCount : childAudioFolderCount
      node.audioId = firstAudioIdByPath.get(node.pathKey)
      totalAudioFolderCount += nodeAudioFolderCount
    }

    return totalAudioFolderCount
  }

  hydrateDescendantAudioCounts(tree)
  return tree
}

export function useAudioSidebarState({ audios, musicRootNodeId }: UseAudioSidebarStateParams): UseAudioSidebarStateResult {
  const audioTreeRaw = useMemo(() => buildAudioFolderTree(audios), [audios])

  const musicRootNode = useMemo(() => findNodeById(audioTreeRaw, musicRootNodeId), [audioTreeRaw, musicRootNodeId])

  const rootScopedAudioIds = useMemo(() => {
    if (!musicRootNode) {
      return new Set(audios.map((audio) => audio.id))
    }

    const rootPath = musicRootNode.pathKey
    const rootPrefix = `${rootPath}/`
    return new Set(
      audios
        .filter((audio) => {
          const folderPath = audio.treePath.slice(0, Math.max(0, audio.treePath.length - 1)).join('/')
          return folderPath === rootPath || folderPath.startsWith(rootPrefix)
        })
        .map((audio) => audio.id),
    )
  }, [audios, musicRootNode])

  const audiosForSidebar = useMemo(() => audios.filter((audio) => rootScopedAudioIds.has(audio.id)), [audios, rootScopedAudioIds])

  const audioTreeForSidebar = useMemo(() => buildAudioFolderTree(audiosForSidebar), [audiosForSidebar])

  return {
    audioTreeRaw,
    musicRootNode,
    rootScopedAudioIds,
    audiosForSidebar,
    audioTreeForSidebar,
  }
}
