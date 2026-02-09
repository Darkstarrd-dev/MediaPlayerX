import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useManageSelection } from './useManageSelection'

describe('useManageSelection', () => {
  it('支持 Sidebar shift 区间选择', () => {
    const { result } = renderHook(() =>
      useManageSelection({
        flatSidebarNodeIds: ['folder:a', 'folder:b', 'package:c', 'video:d'],
      }),
    )

    act(() => {
      result.current.toggleSidebarNodeChecked('folder:a', false)
    })

    act(() => {
      result.current.toggleSidebarNodeChecked('video:d', true)
    })

    expect(result.current.sidebarCheckedNodeIds).toEqual(['folder:a', 'folder:b', 'package:c', 'video:d'])
    expect(result.current.activeSelectionScope).toBe('sidebar')
  })

  it('Sidebar 与图片选择保持互斥', () => {
    const { result } = renderHook(() =>
      useManageSelection({
        flatSidebarNodeIds: ['folder:a', 'package:b'],
      }),
    )

    act(() => {
      result.current.toggleImageChecked('img-1', true)
    })

    expect(result.current.imageCheckedIds).toEqual(['img-1'])
    expect(result.current.sidebarCheckedNodeIds).toHaveLength(0)

    act(() => {
      result.current.toggleSidebarNodeChecked('folder:a', false)
    })

    expect(result.current.sidebarCheckedNodeIds).toEqual(['folder:a'])
    expect(result.current.imageCheckedIds).toHaveLength(0)

    act(() => {
      result.current.toggleImageChecked('img-2', true)
    })

    expect(result.current.imageCheckedIds).toEqual(['img-2'])
    expect(result.current.sidebarCheckedNodeIds).toHaveLength(0)
    expect(result.current.activeSelectionScope).toBe('image')
  })

  it('图片框选支持追加并自动去重', () => {
    const { result } = renderHook(() =>
      useManageSelection({
        flatSidebarNodeIds: [],
      }),
    )

    act(() => {
      result.current.replaceImageCheckedIds(['img-1', 'img-2'])
    })
    expect(result.current.imageCheckedIds).toEqual(['img-1', 'img-2'])

    act(() => {
      result.current.replaceImageCheckedIds(['img-2', 'img-3'], true)
    })

    expect(result.current.imageCheckedIds).toEqual(['img-1', 'img-2', 'img-3'])
  })

  it('选中父节点会级联选中子节点，再次点击父节点会取消整组', () => {
    const { result } = renderHook(() =>
      useManageSelection({
        flatSidebarNodeIds: ['folder:parent', 'folder:child-1', 'folder:child-2'],
        sidebarDescendantNodeIdsById: new Map([
          ['folder:parent', ['folder:child-1', 'folder:child-2']],
        ]),
      }),
    )

    act(() => {
      result.current.toggleSidebarNodeChecked('folder:parent', false)
    })

    expect(result.current.sidebarCheckedNodeIds).toEqual(['folder:parent', 'folder:child-1', 'folder:child-2'])

    act(() => {
      result.current.toggleSidebarNodeChecked('folder:parent', false)
    })

    expect(result.current.sidebarCheckedNodeIds).toHaveLength(0)
  })

  it('会自动清理已失效的图片与 Sidebar 选择', () => {
    const { result, rerender } = renderHook(
      ({ flatSidebarNodeIds, validImageIdSet }: { flatSidebarNodeIds: string[]; validImageIdSet: Set<string> }) =>
        useManageSelection({
          flatSidebarNodeIds,
          validImageIdSet,
        }),
      {
        initialProps: {
          flatSidebarNodeIds: ['folder:a', 'folder:b'],
          validImageIdSet: new Set(['img-1', 'img-2']),
        },
      },
    )

    act(() => {
      result.current.toggleSidebarNodeChecked('folder:a', false)
      result.current.toggleImageChecked('img-1', true)
      result.current.toggleImageChecked('img-x', true)
    })

    expect(result.current.imageCheckedIds).toEqual(['img-1', 'img-x'])

    rerender({
      flatSidebarNodeIds: ['folder:b'],
      validImageIdSet: new Set(['img-1']),
    })

    expect(result.current.sidebarCheckedNodeIds).toHaveLength(0)
    expect(result.current.imageCheckedIds).toEqual(['img-1'])
  })
})
