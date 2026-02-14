import type { ComponentProps } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { SidebarNode } from '../types'
import SidebarPanel from './SidebarPanel'

const AUDIO_TREE_FIXTURE: SidebarNode[] = [
  {
    id: 'folder:X盘',
    label: 'X盘',
    kind: 'folder',
    pathKey: 'X盘',
    descendantNodeCount: 1,
    directAudioCount: 0,
    descendantAudioFolderCount: 1,
    audioId: 'audio-1',
    children: [
      {
        id: 'folder:X盘/Album A',
        label: 'Album A',
        kind: 'folder',
        audioId: 'audio-1',
        pathKey: 'X盘/Album A',
        descendantNodeCount: 2,
        directAudioCount: 2,
        descendantAudioFolderCount: 1,
        children: [],
      },
    ],
  },
]

function renderMusicSidebar(overrides: Partial<ComponentProps<typeof SidebarPanel>> = {}) {
  const onSelectAudio = vi.fn()
  const onSelectNode = vi.fn()
  const onToggleManageNode = vi.fn()

  render(
    <SidebarPanel
      mode="music"
      sidebarFocus="sidebar"
      sidebarRatio={0.3}
      sidebarMinWidth={220}
      sidebarFontSize={14}
      sidebarCountFontSize={12}
      sidebarIndentStep={16}
      sidebarVerticalGap={4}
      currentRootLabel={null}
      selectedSidebarNodeId={null}
      canSetCurrentRoot={true}
      imageRootNodeId={null}
      videoRootNodeId={null}
      musicRootNodeId={null}
      imageTreeNodes={[]}
      videoTreeNodes={[]}
      audioTreeNodes={AUDIO_TREE_FIXTURE}
      selectedPackageId=""
      selectedVideoId=""
      selectedAudioId="audio-1"
      playlistIds={[]}
      audioPlaylistIds={[]}
      onSelectNode={onSelectNode}
      onSelectPackage={vi.fn()}
      onSelectVideo={vi.fn()}
      onSelectAudio={onSelectAudio}
      onCollapseSidebar={vi.fn()}
      onSetCurrentRoot={vi.fn()}
      onGoToFromSearchMode={vi.fn()}
      onResetRoot={vi.fn()}
      onToggleVideoPlaylist={vi.fn()}
      onToggleAudioPlaylist={vi.fn()}
      onToggleManageNode={onToggleManageNode}
      {...overrides}
    />,
  )

  return {
    onSelectAudio,
    onSelectNode,
    onToggleManageNode,
  }
}

describe('SidebarPanel music interactions', () => {
  it('点击音乐文件夹节点会定位到该节点下第一首音频', () => {
    const { onSelectAudio, onSelectNode } = renderMusicSidebar()

    fireEvent.click(screen.getByRole('button', { name: 'Album A' }))

    expect(onSelectNode).toHaveBeenCalledWith('folder:X盘/Album A')
    expect(onSelectAudio).toHaveBeenCalledWith('audio-1')
  })

  it('音乐模式目录节点显示文件夹数，曲目目录显示曲目数', () => {
    renderMusicSidebar()

    expect(screen.getByLabelText('夹 1')).toBeInTheDocument()
    expect(screen.getByLabelText('曲 2')).toBeInTheDocument()
  })

  it('元数据管理模式下保留管理样式并允许导航同步', () => {
    const { onSelectAudio, onSelectNode, onToggleManageNode } = renderMusicSidebar({ metadataManageMode: true })

    fireEvent.click(screen.getByRole('button', { name: 'Album A' }))

    expect(onToggleManageNode).toHaveBeenCalledWith('folder:X盘/Album A', false)
    expect(onSelectNode).toHaveBeenCalledWith('folder:X盘/Album A')
    expect(onSelectAudio).toHaveBeenCalledWith('audio-1')
    expect(document.querySelectorAll('.sidebar-row.is-manage').length).toBeGreaterThan(0)
  })
})
