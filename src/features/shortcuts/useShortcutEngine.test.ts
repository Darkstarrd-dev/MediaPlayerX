import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_SHORTCUTS } from '../../shortcuts'
import { useShortcutEngine } from './useShortcutEngine'

function createBaseParams(): Parameters<typeof useShortcutEngine>[0] {
  return {
    shortcuts: DEFAULT_SHORTCUTS,
    suspended: false,
    mode: 'image',
    vectorMode: false,
    settingsOpen: false,
    sidebarFocus: 'main' as const,
    fullscreenActive: false,
    fullscreenDisplay: 'dual' as const,
    imageFocusActive: false,
    manageMode: false,
    videoShortcutActive: false,
    handleSidebarNavigationKey: vi.fn(() => false),
    onSetImageFocusActive: vi.fn(),
    onSetFullscreenActive: vi.fn(),
    onToggleFullscreenPaneFocus: vi.fn(),
    onToggleFullscreenDualDisplay: vi.fn(),
    onToggleFullscreenSwapSides: vi.fn(),
    onToggleSidebarFocus: vi.fn(),
    onMoveImage: vi.fn(),
    onMoveImageVertical: vi.fn(),
    onJumpImageBoundary: vi.fn(),
    onGoPackage: vi.fn(),
    onAlignFocus: vi.fn(),
    onToggleAutoplay: vi.fn(),
    onApplyAutoplayIntervalByIndex: vi.fn(),
    onSetPackageGrade: vi.fn(),
    onSetVideoGrade: vi.fn(),
    onRequestManageOrganize: vi.fn(),
    onAddFocusedVideoToPlaylist: vi.fn(),
    onRemoveFocusedVideoFromPlaylist: vi.fn(),
    onToggleVideoPlaying: vi.fn(),
    onGoPlaylist: vi.fn(),
    onSeekVideoBy: vi.fn(),
    onAdjustVideoRate: vi.fn(),
    onAdjustVideoVolume: vi.fn(),
    onToggleVideoMute: vi.fn(),
    onSaveVideoCover: vi.fn(),
    onToggleVideoSubtitle: vi.fn(),
    onAdjustVideoSubtitleOffset: vi.fn(),
    onCycleVideoFitMode: vi.fn(),
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

  it('autoplay toggle shortcut only works in fullscreen image mode', () => {
    const params = createBaseParams()
    const hook = renderHook(() => useShortcutEngine(params))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA', bubbles: true, cancelable: true }))
    })

    expect(params.onToggleAutoplay).not.toHaveBeenCalled()

    hook.unmount()
    params.fullscreenActive = true
    renderHook(() => useShortcutEngine(params))
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA', bubbles: true, cancelable: true }))
    })

    expect(params.onToggleAutoplay).toHaveBeenCalledTimes(1)
  })

  it('digit rating shortcuts apply package grade in non-fullscreen image mode', () => {
    const params = createBaseParams()
    renderHook(() => useShortcutEngine(params))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '1', code: 'Digit1', bubbles: true, cancelable: true }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '5', code: 'Digit5', bubbles: true, cancelable: true }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '0', code: 'Numpad0', bubbles: true, cancelable: true }))
    })

    expect(params.onSetPackageGrade).toHaveBeenNthCalledWith(1, 1)
    expect(params.onSetPackageGrade).toHaveBeenNthCalledWith(2, 5)
    expect(params.onSetPackageGrade).toHaveBeenNthCalledWith(3, null)
    expect(params.onSetVideoGrade).not.toHaveBeenCalled()
  })

  it('digit rating shortcuts apply video grade in video mode', () => {
    const params = createBaseParams()
    params.mode = 'video'
    renderHook(() => useShortcutEngine(params))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '2', code: 'Digit2', bubbles: true, cancelable: true }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '0', code: 'Numpad0', bubbles: true, cancelable: true }))
    })

    expect(params.onSetVideoGrade).toHaveBeenNthCalledWith(1, 2)
    expect(params.onSetVideoGrade).toHaveBeenNthCalledWith(2, null)
    expect(params.onSetPackageGrade).not.toHaveBeenCalled()
  })

  it('video mode A/D shortcuts add and remove focused video in playlist', () => {
    const params = createBaseParams()
    params.mode = 'video'
    params.videoShortcutActive = true
    renderHook(() => useShortcutEngine(params))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA', bubbles: true, cancelable: true }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', code: 'KeyD', bubbles: true, cancelable: true }))
    })

    expect(params.onAddFocusedVideoToPlaylist).toHaveBeenCalledTimes(1)
    expect(params.onRemoveFocusedVideoFromPlaylist).toHaveBeenCalledTimes(1)
  })

  it('Space toggles video play/pause in video shortcut scope', () => {
    const params = createBaseParams()
    params.mode = 'video'
    params.videoShortcutActive = true
    renderHook(() => useShortcutEngine(params))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true }))
    })

    expect(params.onToggleVideoPlaying).toHaveBeenCalledTimes(1)
  })

  it('video seek shortcuts map to short/long/frame step deltas', () => {
    const params = createBaseParams()
    params.mode = 'video'
    params.videoShortcutActive = true
    renderHook(() => useShortcutEngine(params))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', code: 'ArrowLeft', bubbles: true, cancelable: true }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', bubbles: true, cancelable: true }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', code: 'ArrowLeft', ctrlKey: true, bubbles: true, cancelable: true }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', ctrlKey: true, bubbles: true, cancelable: true }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', code: 'ArrowLeft', altKey: true, bubbles: true, cancelable: true }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', altKey: true, bubbles: true, cancelable: true }))
    })

    expect(params.onSeekVideoBy).toHaveBeenNthCalledWith(1, -5)
    expect(params.onSeekVideoBy).toHaveBeenNthCalledWith(2, 5)
    expect(params.onSeekVideoBy).toHaveBeenNthCalledWith(3, -30)
    expect(params.onSeekVideoBy).toHaveBeenNthCalledWith(4, 30)
    expect(params.onSeekVideoBy).toHaveBeenNthCalledWith(5, -(1 / 30))
    expect(params.onSeekVideoBy).toHaveBeenNthCalledWith(6, 1 / 30)
  })

  it('video arrows/keys trigger volume, mute, save-cover, subtitle and fit actions', () => {
    const params = createBaseParams()
    params.mode = 'video'
    params.videoShortcutActive = true
    renderHook(() => useShortcutEngine(params))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', code: 'ArrowUp', bubbles: true, cancelable: true }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', bubbles: true, cancelable: true }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', code: 'KeyM', bubbles: true, cancelable: true }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', code: 'KeyC', bubbles: true, cancelable: true }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', code: 'KeyS', bubbles: true, cancelable: true }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', code: 'ArrowUp', shiftKey: true, bubbles: true, cancelable: true }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', shiftKey: true, bubbles: true, cancelable: true }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '\\', code: 'Backslash', bubbles: true, cancelable: true }))
    })

    expect(params.onAdjustVideoVolume).toHaveBeenNthCalledWith(1, 5)
    expect(params.onAdjustVideoVolume).toHaveBeenNthCalledWith(2, -5)
    expect(params.onToggleVideoMute).toHaveBeenCalledTimes(1)
    expect(params.onSaveVideoCover).toHaveBeenCalledTimes(1)
    expect(params.onToggleVideoSubtitle).toHaveBeenCalledTimes(1)
    expect(params.onAdjustVideoSubtitleOffset).toHaveBeenNthCalledWith(1, 16)
    expect(params.onAdjustVideoSubtitleOffset).toHaveBeenNthCalledWith(2, -16)
    expect(params.onCycleVideoFitMode).toHaveBeenCalledTimes(1)
  })

  it('video ctrl+up/down shortcuts map to previous/next video', () => {
    const params = createBaseParams()
    params.mode = 'video'
    params.videoShortcutActive = true
    renderHook(() => useShortcutEngine(params))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', code: 'ArrowUp', ctrlKey: true, bubbles: true, cancelable: true }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', ctrlKey: true, bubbles: true, cancelable: true }))
    })

    expect(params.onGoPlaylist).toHaveBeenNthCalledWith(1, -1)
    expect(params.onGoPlaylist).toHaveBeenNthCalledWith(2, 1)
  })

  it('M shortcut only triggers organize in manage mode', () => {
    const params = createBaseParams()
    const hook = renderHook(() => useShortcutEngine(params))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', code: 'KeyM', bubbles: true, cancelable: true }))
    })

    expect(params.onRequestManageOrganize).not.toHaveBeenCalled()

    hook.unmount()
    params.manageMode = true
    renderHook(() => useShortcutEngine(params))
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', code: 'KeyM', bubbles: true, cancelable: true }))
    })

    expect(params.onRequestManageOrganize).toHaveBeenCalledTimes(1)
  })

  it('image mode without focused image still allows Enter/F fullscreen shortcuts', () => {
    const params = createBaseParams()
    renderHook(() => useShortcutEngine(params))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', code: 'KeyF', bubbles: true, cancelable: true }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }))
    })

    expect(params.onSetFullscreenActive).toHaveBeenNthCalledWith(1, expect.any(Function))
    expect(params.onSetFullscreenActive).toHaveBeenNthCalledWith(2, true)
  })

  it('fullscreen image/video mode maps D to dual/single toggle handler', () => {
    const params = createBaseParams()
    params.fullscreenActive = true
    renderHook(() => useShortcutEngine(params))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', code: 'KeyD', bubbles: true, cancelable: true }))
    })

    expect(params.onToggleFullscreenDualDisplay).toHaveBeenCalledTimes(1)
  })

  it('fullscreen dual mode maps S to swap-sides handler', () => {
    const params = createBaseParams()
    params.fullscreenActive = true
    params.fullscreenDisplay = 'dual'
    renderHook(() => useShortcutEngine(params))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', code: 'KeyS', bubbles: true, cancelable: true }))
    })

    expect(params.onToggleFullscreenSwapSides).toHaveBeenCalledTimes(1)
  })
})
