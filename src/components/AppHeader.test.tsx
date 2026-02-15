import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AppHeader, { type AppHeaderProps } from './AppHeader'
import {
  emitMusicPlaybackState,
  onMusicPlaybackControl,
  type MusicPlaybackControlAction,
} from '../features/media/musicPlaybackBridge'

function createHeaderProps(overrides: Partial<AppHeaderProps> = {}): AppHeaderProps {
  return {
    headerHeight: 56,
    mode: 'image',
    searchPanelOpen: false,
    manageMode: false,
    metadataManageMode: false,
    thumbnailScaleLevel: 4,
    canThumbnailScaleDown: true,
    canThumbnailScaleUp: true,
    autoPlayEnabled: false,
    autoPlayInterval: 3,
    paletteMode: 'day',
    interactionLocked: false,
    importMenuOpen: false,
    taskStatusLabel: 'idle',
    taskStatusBusy: false,
    importTaskPanelOpen: false,
    autoPlayPresets: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    onToggleImportMenu: vi.fn(),
    onToggleImportTaskPanel: vi.fn(),
    onCloseImportMenu: vi.fn(),
    onImportFiles: vi.fn(),
    onImportFolders: vi.fn(),
    onModeChange: vi.fn(),
    onToggleSearchPanel: vi.fn(),
    onToggleManageMode: vi.fn(),
    onToggleMetadataManageMode: vi.fn(),
    onThumbnailScaleDown: vi.fn(),
    onThumbnailScaleUp: vi.fn(),
    onAutoPlayEnabledChange: vi.fn(),
    onAutoPlayIntervalChange: vi.fn(),
    onTogglePaletteMode: vi.fn(),
    onOpenSettings: vi.fn(),
    ...overrides,
  }
}

function emitPlaybackState(playing: boolean) {
  act(() => {
    emitMusicPlaybackState({ playing })
  })
}

afterEach(() => {
  emitPlaybackState(false)
})

describe('AppHeader music quick actions', () => {
  it('仅在音乐模式播放后切到非音乐模式才显示', () => {
    const baseProps = createHeaderProps()
    const { container, rerender } = render(<AppHeader {...baseProps} mode="music" />)

    emitPlaybackState(true)
    const quickActions = container.querySelector('.music-quick-actions') as HTMLElement
    expect(quickActions.classList.contains('is-visible')).toBe(false)

    rerender(<AppHeader {...baseProps} mode="image" />)
    expect(quickActions.classList.contains('is-visible')).toBe(true)
  })

  it('非音乐模式快捷控制可切换播放并在 stop 后等待下一次音乐播放', () => {
    const actions: MusicPlaybackControlAction[] = []
    const unsubscribe = onMusicPlaybackControl((action) => {
      actions.push(action)
    })

    const baseProps = createHeaderProps()
    const { container, rerender } = render(<AppHeader {...baseProps} mode="music" />)

    emitPlaybackState(true)
    rerender(<AppHeader {...baseProps} mode="video" />)

    const quickActions = container.querySelector('.music-quick-actions') as HTMLElement
    expect(quickActions.classList.contains('is-visible')).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: '暂停音乐' }))
    expect(actions.at(-1)).toBe('toggle-playback')

    emitPlaybackState(false)
    fireEvent.click(screen.getByRole('button', { name: '播放音乐' }))
    expect(actions.at(-1)).toBe('toggle-playback')

    emitPlaybackState(true)
    fireEvent.click(screen.getByRole('button', { name: '停止音乐' }))
    expect(actions.at(-1)).toBe('stop')
    expect(quickActions.classList.contains('is-visible')).toBe(false)

    rerender(<AppHeader {...baseProps} mode="image" />)
    expect(quickActions.classList.contains('is-visible')).toBe(false)

    rerender(<AppHeader {...baseProps} mode="music" />)
    emitPlaybackState(true)
    expect(quickActions.classList.contains('is-visible')).toBe(false)

    rerender(<AppHeader {...baseProps} mode="image" />)
    expect(quickActions.classList.contains('is-visible')).toBe(true)

    unsubscribe()
  })
})
