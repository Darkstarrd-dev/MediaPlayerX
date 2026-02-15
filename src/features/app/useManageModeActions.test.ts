import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { MoveSidebarNodesResponseDto } from '../../contracts/backend'
import { useManageModeActions } from './useManageModeActions'

function createMoveResponse(overrides?: Partial<MoveSidebarNodesResponseDto>): MoveSidebarNodesResponseDto {
  return {
    moved_count: 0,
    failed: [],
    target_directory: 'D:/target',
    updated_at_ms: Date.now(),
    ...overrides,
  }
}

function createParams(overrides?: Partial<Parameters<typeof useManageModeActions>[0]>) {
  const { backendWrite: _ignoredBackendWrite, ...restOverrides } = overrides ?? {}
  const backendWrite = {
    setImageHidden: vi.fn(),
    deleteImageItems: vi.fn(),
    deleteSidebarNodes: vi.fn(),
    pickDirectoryPath: vi.fn(),
    moveSidebarNodes: vi.fn(),
    ...(_ignoredBackendWrite ?? {}),
  }

  return {
    mode: 'image' as const,
    manageMode: true,
    metadataManageMode: false,
    imageCheckedIds: [],
    sidebarCheckedNodeIds: ['node-a', 'node-b'],
    clearAllSelections: vi.fn(),
    setManageMode: vi.fn(),
    setMetadataManageMode: vi.fn(),
    setAdReviewPanelOpen: vi.fn(),
    setDeleteConfirmOpen: vi.fn(),
    setManageOperationHint: vi.fn(),
    updateSettings: vi.fn(),
    ...restOverrides,
    backendWrite,
  }
}

describe('useManageModeActions', () => {
  it('requestManageGroup 在未选中 sidebar 节点时提示并返回', async () => {
    const params = createParams({
      sidebarCheckedNodeIds: [],
    })
    const { result } = renderHook(() => useManageModeActions(params))

    await act(async () => {
      await result.current.requestManageGroup()
    })

    expect(params.setManageOperationHint).toHaveBeenCalledWith('请先在左侧勾选目录节点')
    expect(params.backendWrite.pickDirectoryPath).not.toHaveBeenCalled()
    expect(params.backendWrite.moveSidebarNodes).not.toHaveBeenCalled()
  })

  it('requestManageGroup 成功后会调用 moveSidebarNodes 并清空选择', async () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('group-alpha')

    const params = createParams({
      backendWrite: {
        setImageHidden: vi.fn(),
        deleteImageItems: vi.fn(),
        deleteSidebarNodes: vi.fn(),
        pickDirectoryPath: vi.fn().mockResolvedValue('D:/target'),
        moveSidebarNodes: vi.fn().mockResolvedValue(createMoveResponse({ moved_count: 2 })),
      },
    })
    const { result } = renderHook(() => useManageModeActions(params))

    await act(async () => {
      await result.current.requestManageGroup()
    })

    expect(params.backendWrite.pickDirectoryPath).toHaveBeenCalledWith('选择分组目标目录')
    expect(params.backendWrite.moveSidebarNodes).toHaveBeenCalledWith(
      ['node-a', 'node-b'],
      'D:/target',
      'group-alpha',
    )
    expect(params.setManageOperationHint).toHaveBeenCalledWith('分组完成：成功 2 项')
    expect(params.clearAllSelections).toHaveBeenCalled()
    promptSpy.mockRestore()
  })

  it('requestManageMove 取消目录选择时不会触发移动', async () => {
    const params = createParams({
      backendWrite: {
        setImageHidden: vi.fn(),
        deleteImageItems: vi.fn(),
        deleteSidebarNodes: vi.fn(),
        pickDirectoryPath: vi.fn().mockResolvedValue(null),
        moveSidebarNodes: vi.fn(),
      },
    })
    const { result } = renderHook(() => useManageModeActions(params))

    await act(async () => {
      await result.current.requestManageMove()
    })

    expect(params.backendWrite.pickDirectoryPath).toHaveBeenCalledWith('选择移动目标目录')
    expect(params.backendWrite.moveSidebarNodes).not.toHaveBeenCalled()
    expect(params.setManageOperationHint).toHaveBeenCalledWith('已取消移动操作')
    expect(params.clearAllSelections).not.toHaveBeenCalled()
  })
})
