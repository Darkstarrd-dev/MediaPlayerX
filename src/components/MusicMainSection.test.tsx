import type { ComponentProps } from 'react'
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

function renderMusicMainSection(overrides: Partial<ComponentProps<typeof MusicMainSection>> = {}) {
  const audios = [makeAudio('track-1')]

  return render(
    <MusicMainSection
      active={true}
      interruptByVideoPlayback={false}
      playRequestNonce={0}
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
      canJumpToBooklet={false}
      onJumpToManga={vi.fn()}
      onJumpToAnimation={vi.fn()}
      onJumpToBooklet={vi.fn()}
      audios={audios}
      focusedAudio={audios[0]}
      focusedAudioSrc="mock://audio-1"
      musicLoopMode="library"
      musicLoopModeLabel="全曲库循环"
      canPrevAudio={false}
      canNextAudio={true}
      fullscreenActive={false}
      onToggleFullscreen={vi.fn()}
      musicVisualizerRenderLongEdgePx={1280}
      musicVisualizerShowFps={false}
      musicVisualizerRenderer="gpu"
      onPrevAudio={vi.fn()}
      onNextAudio={vi.fn()}
      onCycleMusicLoopMode={vi.fn()}
      {...overrides}
    />,
  )
}

describe('MusicMainSection', () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(async () => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('音乐工具栏显示专辑与作者，并渲染可视化区域', () => {
    renderMusicMainSection()

    expect(screen.getByText('album / author (1 首)')).toBeInTheDocument()
    expect(screen.getByLabelText('music visualizer')).toBeInTheDocument()
  })

  it('支持播放控制、进度条与音量弹层调节', () => {
    const { container } = renderMusicMainSection({
      canPrevAudio: true,
      onPrevAudio: vi.fn(),
      onNextAudio: vi.fn(),
    })

    fireEvent.click(screen.getByRole('button', { name: '播放' }))
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('音乐进度滑条'), { target: { value: '25' } })

    const muteButton = screen.getByRole('button', { name: '静音' })
    fireEvent.mouseEnter(muteButton.parentElement as HTMLElement)
    const volumeRange = screen.getByLabelText('音量滑条')
    fireEvent.change(volumeRange, { target: { value: '30' } })

    const audioElement = container.querySelector('audio') as HTMLAudioElement
    expect(audioElement.currentTime).toBe(25)
    expect(audioElement.volume).toBeCloseTo(0.3, 3)
  })

  it('循环模式按钮可触发状态切换', () => {
    const onCycleMusicLoopMode = vi.fn()
    renderMusicMainSection({ onCycleMusicLoopMode })

    fireEvent.click(screen.getByRole('button', { name: '循环模式：全曲库循环' }))
    expect(onCycleMusicLoopMode).toHaveBeenCalledTimes(1)
  })

  it('单曲循环在播放结束后会从头继续播放', () => {
    const { container } = renderMusicMainSection({
      musicLoopMode: 'single',
      musicLoopModeLabel: '单曲循环',
      canNextAudio: false,
    })

    fireEvent.click(screen.getByRole('button', { name: '播放' }))
    const playCallCount = vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length

    const audioElement = container.querySelector('audio') as HTMLAudioElement
    fireEvent.ended(audioElement)

    expect(vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length).toBeGreaterThan(playCallCount)
  })

  it('playRequestNonce 递增时会触发播放', () => {
    const baseAudio = makeAudio('track-1')

    const { rerender } = render(
      <MusicMainSection
        active={true}
        interruptByVideoPlayback={false}
        playRequestNonce={0}
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
        canJumpToBooklet={false}
        onJumpToManga={vi.fn()}
        onJumpToAnimation={vi.fn()}
        onJumpToBooklet={vi.fn()}
        audios={[baseAudio]}
        focusedAudio={baseAudio}
        focusedAudioSrc="mock://audio-1"
        musicLoopMode="library"
        musicLoopModeLabel="全曲库循环"
        canPrevAudio={false}
        canNextAudio={true}
        fullscreenActive={false}
        onToggleFullscreen={vi.fn()}
        musicVisualizerRenderLongEdgePx={1280}
        musicVisualizerShowFps={false}
        musicVisualizerRenderer="gpu"
        onPrevAudio={vi.fn()}
        onNextAudio={vi.fn()}
        onCycleMusicLoopMode={vi.fn()}
      />,
    )

    const initialPlayCallCount = vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length

    rerender(
      <MusicMainSection
        active={true}
        interruptByVideoPlayback={false}
        playRequestNonce={1}
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
        canJumpToBooklet={false}
        onJumpToManga={vi.fn()}
        onJumpToAnimation={vi.fn()}
        onJumpToBooklet={vi.fn()}
        audios={[baseAudio]}
        focusedAudio={baseAudio}
        focusedAudioSrc="mock://audio-1"
        musicLoopMode="library"
        musicLoopModeLabel="全曲库循环"
        canPrevAudio={false}
        canNextAudio={true}
        fullscreenActive={false}
        onToggleFullscreen={vi.fn()}
        musicVisualizerRenderLongEdgePx={1280}
        musicVisualizerShowFps={false}
        musicVisualizerRenderer="gpu"
        onPrevAudio={vi.fn()}
        onNextAudio={vi.fn()}
        onCycleMusicLoopMode={vi.fn()}
      />,
    )

    expect(vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length).toBeGreaterThan(initialPlayCallCount)
  })

  it('视频开始播放时会中断音乐播放', () => {
    const { rerender } = renderMusicMainSection()

    fireEvent.click(screen.getByRole('button', { name: '播放' }))
    const pauseCallCount = vi.mocked(HTMLMediaElement.prototype.pause).mock.calls.length

    rerender(
      <MusicMainSection
        active={false}
        interruptByVideoPlayback={true}
        playRequestNonce={0}
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
        canJumpToBooklet={false}
        onJumpToManga={vi.fn()}
        onJumpToAnimation={vi.fn()}
        onJumpToBooklet={vi.fn()}
        audios={[makeAudio('track-1')]}
        focusedAudio={makeAudio('track-1')}
        focusedAudioSrc="mock://audio-1"
        musicLoopMode="library"
        musicLoopModeLabel="全曲库循环"
        canPrevAudio={false}
        canNextAudio={true}
        fullscreenActive={false}
        onToggleFullscreen={vi.fn()}
        musicVisualizerRenderLongEdgePx={1280}
        musicVisualizerShowFps={false}
        musicVisualizerRenderer="gpu"
        onPrevAudio={vi.fn()}
        onNextAudio={vi.fn()}
        onCycleMusicLoopMode={vi.fn()}
      />,
    )

    expect(vi.mocked(HTMLMediaElement.prototype.pause).mock.calls.length).toBeGreaterThan(pauseCallCount)
  })

  it('播放中切歌时资源短暂置空后恢复会自动续播', () => {
    const track1 = makeAudio('track-1')
    const track2 = makeAudio('track-2')

    const baseProps: ComponentProps<typeof MusicMainSection> = {
      active: true,
      interruptByVideoPlayback: false,
      playRequestNonce: 0,
      manageMode: false,
      metadataManageMode: false,
      sidebarSelectedCount: 0,
      imageSelectedCount: 0,
      activeSelectionScope: null,
      pendingManageAction: false,
      manageOperationHint: null,
      canManageDelete: false,
      onManageDelete: vi.fn(),
      onClearManageSelection: vi.fn(),
      canJumpToManga: false,
      canJumpToAnimation: false,
      canJumpToBooklet: false,
      onJumpToManga: vi.fn(),
      onJumpToAnimation: vi.fn(),
      onJumpToBooklet: vi.fn(),
      audios: [track1, track2],
      musicLoopMode: 'library',
      musicLoopModeLabel: '全曲库循环',
      canPrevAudio: true,
      canNextAudio: true,
      fullscreenActive: false,
      onToggleFullscreen: vi.fn(),
      musicVisualizerRenderLongEdgePx: 1280,
      musicVisualizerShowFps: false,
      musicVisualizerRenderer: 'gpu',
      onPrevAudio: vi.fn(),
      onNextAudio: vi.fn(),
      onCycleMusicLoopMode: vi.fn(),
      focusedAudio: track1,
      focusedAudioSrc: 'mock://audio-track-1',
    }

    const { rerender } = render(<MusicMainSection {...baseProps} />)

    fireEvent.click(screen.getByRole('button', { name: '播放' }))
    const playCallCount = vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length

    rerender(<MusicMainSection {...baseProps} focusedAudio={track2} focusedAudioSrc={null} />)
    rerender(<MusicMainSection {...baseProps} focusedAudio={track2} focusedAudioSrc="mock://audio-track-2" />)

    expect(vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length).toBeGreaterThan(playCallCount)
  })

  it('全屏按钮可切换音乐可视化全屏', () => {
    const onToggleFullscreen = vi.fn()
    renderMusicMainSection({ onToggleFullscreen })

    fireEvent.click(screen.getByRole('button', { name: '全屏' }))
    expect(onToggleFullscreen).toHaveBeenCalledTimes(1)
  })

  it('全屏时使用底部浮动控制条并隐藏右上角退出按钮', () => {
    const { container } = renderMusicMainSection({ fullscreenActive: true })

    const visualizer = screen.getByLabelText('music visualizer')
    expect((visualizer as HTMLElement).querySelector('.music-controls-shell.is-fullscreen-floating')).not.toBeNull()
    expect(container.querySelector('.music-visualizer-exit-fullscreen-btn')).toBeNull()
  })

  it('支持在控制栏打开 Shader 列表', () => {
    renderMusicMainSection()

    const shaderButton = screen.getByRole('button', { name: /^Shader：/ })
    fireEvent.mouseEnter(shaderButton.parentElement as HTMLElement)

    expect(screen.getByRole('button', { name: 'Shadertoy McsSzB' })).toBeInTheDocument()
  })
})
