import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { AudioItem, SidebarNode } from '../../types'
import { useAudioSidebarState } from './useAudioSidebarState'

function makeAudio(params: { id: string; fileName: string; trackTitle: string; treePath: string[] }): AudioItem {
  return {
    id: params.id,
    fileName: params.fileName,
    absolutePath: `Z:/audios/${params.fileName}`,
    treePath: params.treePath,
    durationSec: 120,
    sizeMb: 9,
    album: 'mock-album',
    author: 'mock-author',
    trackTitle: params.trackTitle,
    mediaLocator: {
      kind: 'filesystem',
      absolutePath: `Z:/audios/${params.fileName}`,
      extension: '.mp3',
      mediaType: 'audio',
      mimeType: 'audio/mpeg',
    },
  }
}

function findNodeByAudioId(nodes: SidebarNode[], audioId: string): SidebarNode | null {
  const stack = [...nodes]
  while (stack.length > 0) {
    const node = stack.pop()
    if (!node) {
      continue
    }
    if (node.audioId === audioId) {
      return node
    }
    stack.push(...node.children)
  }
  return null
}

describe('useAudioSidebarState', () => {
  it('音频节点在 fileName 与 trackTitle 不一致时显示 trackTitle', () => {
    const audios = [
      makeAudio({
        id: 'audio-a',
        fileName: 'track_intro.mp3',
        trackTitle: 'Intro Theme',
        treePath: ['X盘', '音乐', '专辑A', 'track_intro.mp3'],
      }),
      makeAudio({
        id: 'audio-b',
        fileName: 'loop_city.mp3',
        trackTitle: 'loop_city',
        treePath: ['X盘', '音乐', '专辑A', 'loop_city.mp3'],
      }),
    ]

    const { result } = renderHook(() => useAudioSidebarState({ audios, musicRootNodeId: null }))

    const trackTitleNode = findNodeByAudioId(result.current.audioTreeRaw, 'audio-a')
    const sameNameNode = findNodeByAudioId(result.current.audioTreeRaw, 'audio-b')

    expect(trackTitleNode?.label).toBe('Intro Theme')
    expect(sameNameNode?.label).toBe('loop_city.mp3')
  })
})
