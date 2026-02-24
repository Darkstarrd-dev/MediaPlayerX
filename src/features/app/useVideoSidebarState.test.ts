import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { SidebarNode, VideoItem } from '../../types'
import { useVideoSidebarState } from './useVideoSidebarState'

function makeVideo(params: { id: string; fileName: string; workTitle: string; treePath: string[] }): VideoItem {
  return {
    id: params.id,
    fileName: params.fileName,
    absolutePath: `Z:/videos/${params.fileName}`,
    treePath: params.treePath,
    durationSec: 12,
    width: 1920,
    height: 1080,
    sizeMb: 123,
    coverColor: 'hsl(220, 44%, 40%)',
    coverImagePath: null,
    workTitle: params.workTitle,
    circle: 'mock-circle',
    author: 'mock-author',
    tags: [],
    grade: null,
    mediaLocator: {
      kind: 'filesystem',
      absolutePath: `Z:/videos/${params.fileName}`,
      extension: '.mp4',
      mediaType: 'video',
      mimeType: 'video/mp4',
    },
  }
}

function findNodeByVideoId(nodes: SidebarNode[], videoId: string): SidebarNode | null {
  const stack = [...nodes]
  while (stack.length > 0) {
    const node = stack.pop()
    if (!node) {
      continue
    }
    if (node.videoId === videoId) {
      return node
    }
    stack.push(...node.children)
  }
  return null
}

describe('useVideoSidebarState', () => {
  it('视频节点在 fileName 与 workTitle 不一致时显示 workTitle', () => {
    const videos = [
      makeVideo({
        id: 'video-a',
        fileName: 'teaser_city.mp4',
        workTitle: '城市先导片',
        treePath: ['X盘', '视频', '项目A', 'teaser_city.mp4'],
      }),
      makeVideo({
        id: 'video-b',
        fileName: 'scene_forest.mp4',
        workTitle: 'scene_forest',
        treePath: ['X盘', '视频', '项目A', 'scene_forest.mp4'],
      }),
    ]

    const { result } = renderHook(() => useVideoSidebarState({ videos, videoRootNodeId: null }))

    const workTitleNode = findNodeByVideoId(result.current.videoTreeRaw, 'video-a')
    const sameNameNode = findNodeByVideoId(result.current.videoTreeRaw, 'video-b')

    expect(workTitleNode?.label).toBe('城市先导片')
    expect(sameNameNode?.label).toBe('scene_forest.mp4')
  })

  it('侧栏会压缩单链父路径并直接挂载视频节点', () => {
    const videos = [
      makeVideo({
        id: 'video-a',
        fileName: 'teaser_city.mp4',
        workTitle: '城市先导片',
        treePath: ['X盘', '视频', '项目A', 'teaser_city.mp4'],
      }),
      makeVideo({
        id: 'video-b',
        fileName: 'scene_forest.mp4',
        workTitle: 'scene_forest',
        treePath: ['X盘', '视频', '项目A', 'scene_forest.mp4'],
      }),
    ]

    const { result } = renderHook(() => useVideoSidebarState({ videos, videoRootNodeId: null }))

    const root = result.current.videoTreeForSidebar[0]
    expect(root?.id).toBe('folder:X盘/视频/项目A')
    expect(root?.label).toBe('X盘/视频/项目A')
    expect(root?.children).toHaveLength(2)
    expect(root?.children.map((node) => node.kind)).toEqual(['video', 'video'])
  })

  it('在同一路径下优先展示直属视频并使用完整路径目录标签', () => {
    const videos = [
      makeVideo({
        id: 'video-root',
        fileName: 'root.mp4',
        workTitle: 'root',
        treePath: ['D:', 'Gallery', 'root.mp4'],
      }),
      makeVideo({
        id: 'video-child',
        fileName: 'child.mp4',
        workTitle: 'child',
        treePath: ['D:', 'Gallery', 'cool', 'child.mp4'],
      }),
    ]

    const { result } = renderHook(() => useVideoSidebarState({ videos, videoRootNodeId: null }))

    const root = result.current.videoTreeForSidebar[0]
    expect(root?.label).toBe('D:/Gallery')
    expect(root?.children.map((node) => node.label)).toEqual(['root.mp4', 'D:/Gallery/cool'])
    expect(root?.children[1]?.children.map((node) => node.label)).toEqual(['child.mp4'])
  })
})
