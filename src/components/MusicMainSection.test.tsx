import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AudioItem } from '../types'
import MusicMainSection from './MusicMainSection'

function makeAudio(id: string): AudioItem {
  return {
    id,
    fileName: `${id}.mp3`,
    absolutePath: `Z:/music/${id}.mp3`,
    treePath: ['Z盘', 'music', `${id}.mp3`],
    durationSec: 90,
    sizeMb: 6,
    album: 'album',
    author: 'author',
    trackTitle: id,
    mediaLocator: {
      kind: 'filesystem',
      absolutePath: `Z:/music/${id}.mp3`,
      extension: '.mp3',
      mediaType: 'audio',
      mimeType: 'audio/mpeg',
    },
  }
}

describe('MusicMainSection', () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(async () => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('渲染音乐列表并支持选择音频', () => {
    const onSelectAudio = vi.fn()
    const audios = [makeAudio('track-1'), makeAudio('track-2')]

    render(
      <MusicMainSection
        manageMode={false}
        metadataManageMode={false}
        sidebarSelectedCount={0}
        imageSelectedCount={0}
        activeSelectionScope={null}
        pendingManageAction={false}
        manageOperationHint={null}
        canManageDelete={false}
        onManageDelete={vi.fn()}
        onClearManageSelection={vi.fn()}
        canJumpToManga={false}
        canJumpToAnimation={false}
        onJumpToManga={vi.fn()}
        onJumpToAnimation={vi.fn()}
        audios={audios}
        selectedAudioId="track-1"
        focusedAudio={audios[0]}
        focusedAudioSrc="mock://audio-1"
        canPrevAudio={false}
        canNextAudio={true}
        onSelectAudio={onSelectAudio}
        onPrevAudio={vi.fn()}
        onNextAudio={vi.fn()}
      />,
    )

    expect(screen.getByText('track-1.mp3')).toBeInTheDocument()
    fireEvent.click(screen.getByText('track-2.mp3'))
    expect(onSelectAudio).toHaveBeenCalledWith('track-2')
  })

  it('支持上一首/播放/下一首控制和音量弹层', () => {
    const onPrevAudio = vi.fn()
    const onNextAudio = vi.fn()
    const audios = [makeAudio('track-1')]

    const { container } = render(
      <MusicMainSection
        manageMode={false}
        metadataManageMode={false}
        sidebarSelectedCount={0}
        imageSelectedCount={0}
        activeSelectionScope={null}
        pendingManageAction={false}
        manageOperationHint={null}
        canManageDelete={false}
        onManageDelete={vi.fn()}
        onClearManageSelection={vi.fn()}
        canJumpToManga={false}
        canJumpToAnimation={false}
        onJumpToManga={vi.fn()}
        onJumpToAnimation={vi.fn()}
        audios={audios}
        selectedAudioId="track-1"
        focusedAudio={audios[0]}
        focusedAudioSrc="mock://audio-1"
        canPrevAudio={true}
        canNextAudio={true}
        onSelectAudio={vi.fn()}
        onPrevAudio={onPrevAudio}
        onNextAudio={onNextAudio}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '上一个' }))
    fireEvent.click(screen.getByRole('button', { name: '下一个' }))
    expect(onPrevAudio).toHaveBeenCalledTimes(1)
    expect(onNextAudio).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: '播放' }))
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()

    const muteButton = screen.getByRole('button', { name: '静音' })
    fireEvent.mouseEnter(muteButton.parentElement as HTMLElement)
    const volumePanel = container.querySelector('#music-main-popover-volume') as HTMLDivElement
    expect(volumePanel.hidden).toBe(false)
  })

  it('系列匹配时显示漫画版/动画版按钮并触发跳转', () => {
    const onJumpToManga = vi.fn()
    const onJumpToAnimation = vi.fn()
    const audios = [makeAudio('track-1')]

    render(
      <MusicMainSection
        manageMode={false}
        metadataManageMode={false}
        sidebarSelectedCount={0}
        imageSelectedCount={0}
        activeSelectionScope={null}
        pendingManageAction={false}
        manageOperationHint={null}
        canManageDelete={false}
        onManageDelete={vi.fn()}
        onClearManageSelection={vi.fn()}
        canJumpToManga={true}
        canJumpToAnimation={true}
        onJumpToManga={onJumpToManga}
        onJumpToAnimation={onJumpToAnimation}
        audios={audios}
        selectedAudioId="track-1"
        focusedAudio={audios[0]}
        focusedAudioSrc="mock://audio-1"
        canPrevAudio={false}
        canNextAudio={true}
        onSelectAudio={vi.fn()}
        onPrevAudio={vi.fn()}
        onNextAudio={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '漫画版' }))
    fireEvent.click(screen.getByRole('button', { name: '动画版' }))

    expect(onJumpToManga).toHaveBeenCalledTimes(1)
    expect(onJumpToAnimation).toHaveBeenCalledTimes(1)
  })
})
