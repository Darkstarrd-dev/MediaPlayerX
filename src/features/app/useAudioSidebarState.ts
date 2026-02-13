import { useMemo } from 'react'

import { buildSidebarTree, findNodeById } from '../../mockData'
import type { AudioItem, SidebarNode } from '../../types'
import { collectLeafIds } from '../../utils/mediaHelpers'

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

function normalizeNodeLabelCompare(value: string): string {
  return value.trim().replace(/\.[^./\\]+$/, '').toLowerCase()
}

function shouldUseTrackTitleLabel(fileName: string, trackTitle: string): boolean {
  const normalizedTrackTitle = normalizeNodeLabelCompare(trackTitle)
  if (normalizedTrackTitle.length === 0) {
    return false
  }
  return normalizeNodeLabelCompare(fileName) !== normalizedTrackTitle
}

export function useAudioSidebarState({ audios, musicRootNodeId }: UseAudioSidebarStateParams): UseAudioSidebarStateResult {
  const audioTreeRaw = useMemo(
    () =>
      buildSidebarTree(
        audios.map((audio) => ({
          id: audio.id,
          treePath: audio.treePath,
          leafLabel: shouldUseTrackTitleLabel(audio.fileName, audio.trackTitle) ? audio.trackTitle : undefined,
        })),
        'audio',
      ),
    [audios],
  )

  const musicRootNode = useMemo(() => findNodeById(audioTreeRaw, musicRootNodeId), [audioTreeRaw, musicRootNodeId])

  const rootScopedAudioIds = useMemo(() => {
    if (!musicRootNode) {
      return new Set(audios.map((audio) => audio.id))
    }
    return new Set(collectLeafIds(musicRootNode, 'audio'))
  }, [audios, musicRootNode])

  const audiosForSidebar = useMemo(() => audios.filter((audio) => rootScopedAudioIds.has(audio.id)), [audios, rootScopedAudioIds])

  const audioTreeForSidebar = useMemo(() => {
    return buildSidebarTree(
      audiosForSidebar.map((audio) => ({
        id: audio.id,
        treePath: audio.treePath,
        leafLabel: shouldUseTrackTitleLabel(audio.fileName, audio.trackTitle) ? audio.trackTitle : undefined,
      })),
      'audio',
    )
  }, [audiosForSidebar])

  return {
    audioTreeRaw,
    musicRootNode,
    rootScopedAudioIds,
    audiosForSidebar,
    audioTreeForSidebar,
  }
}
