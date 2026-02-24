import { useMemo } from 'react'

import { buildSidebarTree, findNodeById } from '../../mockData'
import type { SidebarNode, VideoItem } from '../../types'
import { collectLeafIds } from '../../utils/mediaHelpers'
import { compactSidebarTree } from '../sidebar/compactSidebarTree'
import { normalizePointerSidebarTree } from '../sidebar/normalizePointerSidebarTree'

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

function isCompressibleVideoFolderNode(node: SidebarNode): boolean {
  if (node.kind !== 'folder') {
    return false
  }

  return !node.imageSourceId && !node.packageId && !node.videoId && !node.audioId
}

function isVideoPointerFolderNode(node: SidebarNode): boolean {
  return isCompressibleVideoFolderNode(node)
}

function isVideoMediaNode(node: SidebarNode): boolean {
  return node.kind === 'video'
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
    const rawTree = buildSidebarTree(
      videosForSidebar.map((video) => ({
        id: video.id,
        treePath: video.treePath,
        leafLabel: shouldUseWorkTitleLabel(video.fileName, video.workTitle) ? video.workTitle : undefined,
      })),
      'video',
    )
    return normalizePointerSidebarTree(
      compactSidebarTree(rawTree, {
        shouldCompressFolderNode: isCompressibleVideoFolderNode,
        includeRoot: true,
      }),
      {
        isPointerFolderNode: isVideoPointerFolderNode,
        isMediaNode: isVideoMediaNode,
      },
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
