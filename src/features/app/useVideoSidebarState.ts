import { useMemo } from 'react'

import { buildSidebarTree, findNodeById } from '../../mockData'
import type { SidebarNode, VideoItem } from '../../types'
import { collectLeafIds } from './helpers'

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

export function useVideoSidebarState({ videos, videoRootNodeId }: UseVideoSidebarStateParams): UseVideoSidebarStateResult {
  const videoTreeRaw = useMemo(
    () =>
      buildSidebarTree(
        videos.map((video) => ({
          id: video.id,
          treePath: video.treePath,
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
