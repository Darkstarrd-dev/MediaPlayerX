import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_SHORTCUTS } from '../../shortcuts'
import { useShortcutEngine } from './useShortcutEngine'

function createBaseParams() {
  return {
    shortcuts: DEFAULT_SHORTCUTS,
    suspended: false,
    mode: 'image' as const,
    vectorMode: false,
    settingsOpen: false,
    sidebarFocus: 'main' as const,
    fullscreenActive: false,
    fullscreenDisplay: 'dual' as const,
    imageFocusActive: false,
    videoShortcutActive: false,
    hasFocusedImage: true,
    handleSidebarNavigationKey: vi.fn(() => false),
    onSetImageFocusActive: vi.fn(),
    onSetFullscreenActive: vi.fn(),
    onToggleFullscreenPaneFocus: vi.fn(),
    onToggleSidebarFocus: vi.fn(),
    onMoveImage: vi.fn(),
    onMoveImageVertical: vi.fn(),
    onJumpImageBoundary: vi.fn(),
    onGoPackage: vi.fn(),
    onAlignFocus: vi.fn(),
    onToggleAutoplay: vi.fn(),
    onApplyAutoplayIntervalByIndex: vi.fn(),
    onSetPackageGrade: vi.fn(),
    onToggleVideoPlaying: vi.fn(),
    onGoPlaylist: vi.fn(),
    onAdjustVideoRate: vi.fn(),
    onAdjustVideoVolume: vi.fn(),
    onImageWheelNavigatePage: vi.fn(),
    onImageCtrlWheelNavigateSidebar: vi.fn(),
  }
}

describe('useShortcutEngine ctrl+arrow image mapping', () => {
  it('maps ctrl+left/right to wheel-like page navigation', () => {
    const params = createBaseParams()
    renderHook(() => useShortcutEngine(params))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', code: 'ArrowLeft', ctrlKey: true, bubbles: true, cancelable: true }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', ctrlKey: true, bubbles: true, cancelable: true }))
    })

    expect(params.onImageWheelNavigatePage).toHaveBeenNthCalledWith(1, 'prev')
    expect(params.onImageWheelNavigatePage).toHaveBeenNthCalledWith(2, 'next')
    expect(params.onImageCtrlWheelNavigateSidebar).not.toHaveBeenCalled()
  })

  it('maps ctrl+up/down to ctrl-wheel-like sidebar navigation', () => {
    const params = createBaseParams()
    renderHook(() => useShortcutEngine(params))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', code: 'ArrowUp', ctrlKey: true, bubbles: true, cancelable: true }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', ctrlKey: true, bubbles: true, cancelable: true }))
    })

    expect(params.onImageCtrlWheelNavigateSidebar).toHaveBeenNthCalledWith(1, 'prev')
    expect(params.onImageCtrlWheelNavigateSidebar).toHaveBeenNthCalledWith(2, 'next')
    expect(params.onImageWheelNavigatePage).not.toHaveBeenCalled()
  })
})
