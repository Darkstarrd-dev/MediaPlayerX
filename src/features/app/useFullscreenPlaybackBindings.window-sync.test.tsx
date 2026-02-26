import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useFullscreenPlaybackBindings } from './useFullscreenPlaybackBindings'

type WindowFullscreenMock = {
  setFullscreen: ReturnType<typeof vi.fn>
}

function installWindowFullscreenMock(initialWindowFullscreen: boolean): WindowFullscreenMock {
  let fullscreen = initialWindowFullscreen
  const setFullscreen = vi.fn(async (active: boolean) => {
    fullscreen = active
  })
  const isFullscreen = vi.fn(async () => fullscreen)

  Object.defineProperty(window, 'mediaPlayerWindow', {
    configurable: true,
    writable: true,
    value: {
      minimize: vi.fn(async () => undefined),
      toggleMaximize: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
      setFullscreen,
      isMaximized: vi.fn(async () => false),
      isFullscreen,
      writeClipboardPng: vi.fn(async () => false),
      getNativeChromeEnabled: vi.fn(async () => false),
      setNativeChromeEnabled: vi.fn(async () => false),
      onMaximizedStateChange: vi.fn(() => () => undefined),
      onFullscreenStateChange: vi.fn(() => () => undefined),
    },
  })

  return { setFullscreen }
}

describe('useFullscreenPlaybackBindings 窗口全屏同步', () => {
  afterEach(() => {
    Object.defineProperty(window, 'mediaPlayerWindow', {
      configurable: true,
      writable: true,
      value: undefined,
    })
  })

  it('窗口已全屏时，媒体全屏进出后保持窗口全屏', async () => {
    const windowApi = installWindowFullscreenMock(true)

    const { rerender } = renderHook(
      ({ fullscreenActive }) =>
        useFullscreenPlaybackBindings({
          fullscreenActive,
          fullscreenDisplay: 'image-only',
          fullscreenVideoFocus: false,
          autoPlayEnabled: false,
          updateSettings: vi.fn(),
          setFullscreenActive: vi.fn(),
        }),
      { initialProps: { fullscreenActive: false } },
    )

    rerender({ fullscreenActive: true })
    rerender({ fullscreenActive: false })

    await waitFor(() => {
      expect(windowApi.setFullscreen).toHaveBeenCalledWith(true)
    })
    expect(windowApi.setFullscreen).not.toHaveBeenCalledWith(false)
  })

  it('窗口非全屏时，媒体全屏退出后恢复窗口非全屏', async () => {
    const windowApi = installWindowFullscreenMock(false)

    const { rerender } = renderHook(
      ({ fullscreenActive }) =>
        useFullscreenPlaybackBindings({
          fullscreenActive,
          fullscreenDisplay: 'image-only',
          fullscreenVideoFocus: false,
          autoPlayEnabled: false,
          updateSettings: vi.fn(),
          setFullscreenActive: vi.fn(),
        }),
      { initialProps: { fullscreenActive: false } },
    )

    rerender({ fullscreenActive: true })
    rerender({ fullscreenActive: false })

    await waitFor(() => {
      expect(windowApi.setFullscreen).toHaveBeenCalledWith(true)
      expect(windowApi.setFullscreen).toHaveBeenCalledWith(false)
    })
  })
})
