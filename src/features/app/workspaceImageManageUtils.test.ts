import { describe, expect, it } from 'vitest'

import {
  resolveImageConvertScopeNodeIds,
  resolveScopedImageConvertNavigationNodeId,
} from './workspaceImageManageUtils'

describe('workspaceImageManageUtils', () => {
  it('文件管理模式下仅在选中节点全部可转换时返回范围', () => {
    const sidebarNodeById = new Map([
      ['pkg-1', { imageNodeType: 'package', imageSourceId: 'source-1' }],
      ['dir-2', { imageNodeType: 'directory', imageSourceId: 'source-2' }],
      ['folder-x', { imageNodeType: 'folder' }],
    ])

    expect(
      resolveImageConvertScopeNodeIds({
        mode: 'image',
        manageMode: true,
        activeSelectionScope: 'sidebar',
        sidebarCheckedNodeIds: ['pkg-1', 'dir-2'],
        selectedSidebarNodeId: 'pkg-1',
        sidebarNodeById,
      }),
    ).toEqual(['pkg-1', 'dir-2'])

    expect(
      resolveImageConvertScopeNodeIds({
        mode: 'image',
        manageMode: true,
        activeSelectionScope: 'sidebar',
        sidebarCheckedNodeIds: ['pkg-1', 'folder-x'],
        selectedSidebarNodeId: 'pkg-1',
        sidebarNodeById,
      }),
    ).toEqual([])
  })

  it('非文件管理模式下仅返回当前可转换焦点节点', () => {
    const sidebarNodeById = new Map([
      ['pkg-1', { imageNodeType: 'package', imageSourceId: 'source-1' }],
      ['folder-x', { imageNodeType: 'folder' }],
    ])

    expect(
      resolveImageConvertScopeNodeIds({
        mode: 'image',
        manageMode: false,
        activeSelectionScope: null,
        sidebarCheckedNodeIds: [],
        selectedSidebarNodeId: 'pkg-1',
        sidebarNodeById,
      }),
    ).toEqual(['pkg-1'])

    expect(
      resolveImageConvertScopeNodeIds({
        mode: 'image',
        manageMode: false,
        activeSelectionScope: null,
        sidebarCheckedNodeIds: [],
        selectedSidebarNodeId: 'folder-x',
        sidebarNodeById,
      }),
    ).toEqual([])
  })

  it('范围导航在边界停止，不会越界', () => {
    const sidebarNodeById = new Map([
      ['pkg-1', { imageNodeType: 'package', imageSourceId: 'source-1' }],
      ['pkg-2', { imageNodeType: 'package', imageSourceId: 'source-2' }],
      ['pkg-3', { imageNodeType: 'package', imageSourceId: 'source-3' }],
    ])

    const scopeNodeIds = ['pkg-1', 'pkg-2', 'pkg-3']

    expect(
      resolveScopedImageConvertNavigationNodeId({
        scopeNodeIds,
        selectedSidebarNodeId: 'pkg-1',
        selectedPackageId: 'source-1',
        sidebarNodeById,
        step: -1,
      }),
    ).toBe('pkg-1')

    expect(
      resolveScopedImageConvertNavigationNodeId({
        scopeNodeIds,
        selectedSidebarNodeId: 'pkg-3',
        selectedPackageId: 'source-3',
        sidebarNodeById,
        step: 1,
      }),
    ).toBe('pkg-3')

    expect(
      resolveScopedImageConvertNavigationNodeId({
        scopeNodeIds,
        selectedSidebarNodeId: 'pkg-2',
        selectedPackageId: 'source-2',
        sidebarNodeById,
        step: 1,
      }),
    ).toBe('pkg-3')
  })
})
