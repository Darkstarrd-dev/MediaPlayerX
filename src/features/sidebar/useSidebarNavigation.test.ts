import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useRef, useState } from 'react'

import type { SidebarNode } from '../../types'
import { useSidebarNavigation } from './useSidebarNavigation'

const IMAGE_SIDEBAR_NODES: SidebarNode[] = [
  {
    id: 'pkg:a',
    label: 'A',
    kind: 'package',
    children: [],
    imageSourceId: 'source-a',
    pathKey: 'a',
  },
  {
    id: 'pkg:b',
    label: 'B',
    kind: 'package',
    children: [],
    imageSourceId: 'source-b',
    pathKey: 'b',
  },
  {
    id: 'pkg:c',
    label: 'C',
    kind: 'package',
    children: [],
    imageSourceId: 'source-c',
    pathKey: 'c',
  },
  {
    id: 'pkg:d',
    label: 'D',
    kind: 'package',
    children: [],
    imageSourceId: 'source-d',
    pathKey: 'd',
  },
]

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

interface NavigationHarnessOptions {
  onSelectPackage: (packageId: string) => void
  onSetSidebarFocusMain: () => void
}

function useImageSidebarNavigationHarness(options: NavigationHarnessOptions) {
  const [selectedSidebarNodeId, setSelectedSidebarNodeId] = useState<string | null>('pkg:a')
  const appBodyRef = useRef<HTMLDivElement | null>(null)

  const navigation = useSidebarNavigation({
    mode: 'image',
    imageTreeForSidebar: IMAGE_SIDEBAR_NODES,
    videoTreeForSidebar: [],
    audioTreeForSidebar: [],
    audiosForSidebar: [],
    imageRootNode: null,
    videoRootNode: null,
    musicRootNode: null,
    selectedSidebarNodeId,
    appBodyRef,
    onSetSelectedSidebarNodeId: setSelectedSidebarNodeId,
    onSelectPackage: options.onSelectPackage,
    onSelectVideo: () => undefined,
    onSelectAudio: () => undefined,
    onSetSidebarFocusMain: options.onSetSidebarFocusMain,
    onSetImageRootNodeId: () => undefined,
    onSetVideoRootNodeId: () => undefined,
    onSetMusicRootNodeId: () => undefined,
  })

  return {
    ...navigation,
    selectedSidebarNodeId,
  }
}

describe('useSidebarNavigation 键盘导航防抖', () => {
  it('快速连续方向键仅在停稳后提交一次媒体选择', () => {
    vi.useFakeTimers()
    const onSelectPackage = vi.fn()

    const { result } = renderHook(() =>
      useImageSidebarNavigationHarness({
        onSelectPackage,
        onSetSidebarFocusMain: () => undefined,
      }),
    )

    act(() => {
      result.current.handleSidebarNavigationKey(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    })
    expect(result.current.selectedSidebarNodeId).toBe('pkg:b')

    act(() => {
      result.current.handleSidebarNavigationKey(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    })
    expect(result.current.selectedSidebarNodeId).toBe('pkg:c')

    act(() => {
      result.current.handleSidebarNavigationKey(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    })
    expect(result.current.selectedSidebarNodeId).toBe('pkg:d')
    expect(onSelectPackage).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(99)
    })
    expect(onSelectPackage).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onSelectPackage).toHaveBeenCalledTimes(1)
    expect(onSelectPackage).toHaveBeenCalledWith('source-d')
  })

  it('切换到主区域前会立即 flush 待提交节点', () => {
    vi.useFakeTimers()
    const onSelectPackage = vi.fn()
    const onSetSidebarFocusMain = vi.fn()

    const { result } = renderHook(() =>
      useImageSidebarNavigationHarness({ onSelectPackage, onSetSidebarFocusMain }),
    )

    act(() => {
      result.current.handleSidebarNavigationKey(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    })
    expect(onSelectPackage).not.toHaveBeenCalled()

    act(() => {
      result.current.handleSidebarNavigationKey(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    })

    expect(onSetSidebarFocusMain).toHaveBeenCalledTimes(1)
    expect(onSelectPackage).toHaveBeenCalledTimes(1)
    expect(onSelectPackage).toHaveBeenCalledWith('source-b')

    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(onSelectPackage).toHaveBeenCalledTimes(1)
  })

  it('Enter 立即提交并取消之前的延迟提交', () => {
    vi.useFakeTimers()
    const onSelectPackage = vi.fn()

    const { result } = renderHook(() =>
      useImageSidebarNavigationHarness({
        onSelectPackage,
        onSetSidebarFocusMain: () => undefined,
      }),
    )

    act(() => {
      result.current.handleSidebarNavigationKey(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    })
    expect(onSelectPackage).not.toHaveBeenCalled()

    act(() => {
      result.current.handleSidebarNavigationKey(new KeyboardEvent('keydown', { key: 'Enter' }))
    })

    expect(onSelectPackage).toHaveBeenCalledTimes(1)
    expect(onSelectPackage).toHaveBeenCalledWith('source-b')

    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(onSelectPackage).toHaveBeenCalledTimes(1)
  })
})
