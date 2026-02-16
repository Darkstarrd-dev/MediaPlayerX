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
  it('requestManageGroup 在未选中 sidebar 节点时无响应', async () => {
    const params = createParams({
      sidebarCheckedNodeIds: [],
    })
    const { result } = renderHook(() => useManageModeActions(params))

    await act(async () => {
      await result.current.requestManageGroup()
    })

    expect(result.current.groupNameDialogOpen).toBe(false)
    expect(params.setManageOperationHint).not.toHaveBeenCalled()
    expect(params.backendWrite.pickDirectoryPath).not.toHaveBeenCalled()
    expect(params.backendWrite.moveSidebarNodes).not.toHaveBeenCalled()
  })

  it('requestManageGroup 打开整理弹窗，confirmManageGroup 后执行分组', async () => {
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

    act(() => {
      result.current.requestManageGroup()
    })
    expect(result.current.groupNameDialogOpen).toBe(true)

    act(() => {
      result.current.setGroupNameDraft('group-alpha')
    })

    await act(async () => {
      await result.current.confirmManageGroup()
    })

    expect(params.backendWrite.pickDirectoryPath).toHaveBeenCalledWith('选择分组目标目录')
    expect(params.backendWrite.moveSidebarNodes).toHaveBeenCalledWith(
      ['node-a', 'node-b'],
      'D:/target',
      'group-alpha',
    )
    expect(params.setManageOperationHint).toHaveBeenCalledWith('分组完成：成功 2 项')
    expect(params.clearAllSelections).toHaveBeenCalled()
  })

  it('requestManageMove 复用整理弹窗，不会直接触发移动', async () => {
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

    expect(result.current.groupNameDialogOpen).toBe(true)
    expect(params.backendWrite.pickDirectoryPath).not.toHaveBeenCalled()
    expect(params.backendWrite.moveSidebarNodes).not.toHaveBeenCalled()
    expect(params.setManageOperationHint).toHaveBeenCalledWith(null)
    expect(params.clearAllSelections).not.toHaveBeenCalled()
  })

  it('confirmManageGroup 输入空目录名时给出提示且不执行移动', async () => {
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

    act(() => {
      result.current.requestManageGroup()
      result.current.setGroupNameDraft('   ')
    })

    await act(async () => {
      await result.current.confirmManageGroup()
    })

    expect(params.setManageOperationHint).toHaveBeenCalledWith('分组目录名不能为空')
    expect(params.backendWrite.pickDirectoryPath).not.toHaveBeenCalled()
    expect(params.backendWrite.moveSidebarNodes).not.toHaveBeenCalled()
  })
})
