import { useMemo } from 'react'

import { buildSidebarTree, findNodeById } from '../../mockData'
import type { SidebarNode, VideoItem } from '../../types'
import { collectLeafIds } from '../../utils/mediaHelpers'

interface UseVideoSidebarStateParams {
  videos: VideoItem[]
  videoRootNodeId: string | null
}

interface UseVideoSidebarStateResult {
  videoTreeRaw: SidebarNode[]
  videoRootNode: SidebarNode | null
  rootScopedVideoIds: Set<string>
  videosForSidebar: VideoItem[]
  videoTreeForSidebar: SidebarNode[]
}

function normalizeNodeLabelCompare(value: string): string {
  return value.trim().replace(/\.[^./\\]+$/, '').toLowerCase()
}

function shouldUseWorkTitleLabel(fileName: string, workTitle: string): boolean {
  const normalizedWorkTitle = normalizeNodeLabelCompare(workTitle)
  if (normalizedWorkTitle.length === 0) {
    return false
  }
  return normalizeNodeLabelCompare(fileName) !== normalizedWorkTitle
}

export function useVideoSidebarState({ videos, videoRootNodeId }: UseVideoSidebarStateParams): UseVideoSidebarStateResult {
  const videoTreeRaw = useMemo(
    () =>
      buildSidebarTree(
        videos.map((video) => ({
          id: video.id,
          treePath: video.treePath,
          leafLabel: shouldUseWorkTitleLabel(video.fileName, video.workTitle) ? video.workTitle : undefined,
        })),
        'video',
      ),
    [videos],
  )

  const videoRootNode = useMemo(() => findNodeById(videoTreeRaw, videoRootNodeId), [videoRootNodeId, videoTreeRaw])

  const rootScopedVideoIds = useMemo(() => {
    if (!videoRootNode) {
      return new Set(videos.map((video) => video.id))
    }
    return new Set(collectLeafIds(videoRootNode, 'video'))
  }, [videoRootNode, videos])

  const videosForSidebar = useMemo(() => videos.filter((video) => rootScopedVideoIds.has(video.id)), [rootScopedVideoIds, videos])

  const videoTreeForSidebar = useMemo(() => {
    return buildSidebarTree(
      videosForSidebar.map((video) => ({
        id: video.id,
        treePath: video.treePath,
        leafLabel: shouldUseWorkTitleLabel(video.fileName, video.workTitle) ? video.workTitle : undefined,
      })),
      'video',
    )
  }, [videosForSidebar])

  return {
    videoTreeRaw,
    videoRootNode,
    rootScopedVideoIds,
    videosForSidebar,
    videoTreeForSidebar,
  }
}
