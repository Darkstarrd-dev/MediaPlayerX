import { useCallback, type Dispatch, type SetStateAction } from 'react'

import type {
  DeleteImageItemsResponseDto,
  DeleteSidebarNodesResponseDto,
  SetImageHiddenResponseDto,
} from '../../contracts/backend'
import type { BrowserMode } from '../../types'

interface ManageWriteAccess {
  setImageHidden: (imageIds: string[], hidden: boolean) => Promise<SetImageHiddenResponseDto>
  deleteImageItems: (imageIds: string[]) => Promise<DeleteImageItemsResponseDto>
  deleteSidebarNodes: (nodeIds: string[]) => Promise<DeleteSidebarNodesResponseDto>
}

interface UseManageModeActionsParams {
  mode: BrowserMode
  manageMode: boolean
  metadataManageMode: boolean
  imageCheckedIds: string[]
  sidebarCheckedNodeIds: string[]
  backendWrite: ManageWriteAccess
  clearAllSelections: () => void
  setManageMode: Dispatch<SetStateAction<boolean>>
  setMetadataManageMode: Dispatch<SetStateAction<boolean>>
  setAdReviewPanelOpen: Dispatch<SetStateAction<boolean>>
  setDeleteConfirmOpen: Dispatch<SetStateAction<boolean>>
  setManageOperationHint: Dispatch<SetStateAction<string | null>>
  updateSettings: (patch: { vectorMode?: boolean; sidebarFocus?: 'sidebar' | 'main' }) => void
}

interface UseManageModeActionsResult {
  toggleManageMode: () => void
  runManageHideAction: (hidden: boolean) => Promise<void>
  requestManageDelete: () => void
  confirmManageDelete: () => Promise<void>
}

export function useManageModeActions({
  mode,
  manageMode,
  metadataManageMode,
  imageCheckedIds,
  sidebarCheckedNodeIds,
  backendWrite,
  clearAllSelections,
  setManageMode,
  setMetadataManageMode,
  setAdReviewPanelOpen,
  setDeleteConfirmOpen,
  setManageOperationHint,
  updateSettings,
}: UseManageModeActionsParams): UseManageModeActionsResult {
  const toggleManageMode = useCallback(() => {
    const nextOpen = !manageMode
    setManageMode(nextOpen)
    setAdReviewPanelOpen(false)
    setDeleteConfirmOpen(false)
    setManageOperationHint(null)
    clearAllSelections()

    if (nextOpen) {
      if (metadataManageMode) {
        setMetadataManageMode(false)
      }
      updateSettings({ vectorMode: false, sidebarFocus: 'main' })
    }
  }, [
    setAdReviewPanelOpen,
    clearAllSelections,
    manageMode,
    metadataManageMode,
    setDeleteConfirmOpen,
    setManageMode,
    setManageOperationHint,
    setMetadataManageMode,
    updateSettings,
  ])

  const runManageHideAction = useCallback(
    async (hidden: boolean) => {
      if (mode !== 'image') {
        setManageOperationHint('当前模式不支持隐藏/取消隐藏')
        return
      }
      if (imageCheckedIds.length === 0) {
        setManageOperationHint('请先在缩略图/文件名区域选择图片')
        return
      }

      try {
        const response = await backendWrite.setImageHidden(imageCheckedIds, hidden)
        setManageOperationHint(
          `${hidden ? '隐藏' : '取消隐藏'}完成：${response.updated_count} 项`,
        )
      } catch (error) {
        setManageOperationHint(error instanceof Error ? error.message : String(error))
      }
    },
    [backendWrite, imageCheckedIds, mode, setManageOperationHint],
  )

  const requestManageDelete = useCallback(() => {
    if (sidebarCheckedNodeIds.length === 0 && imageCheckedIds.length === 0) {
      setManageOperationHint('请先选择需要删除的节点或图片')
      return
    }

    setDeleteConfirmOpen(true)
  }, [imageCheckedIds.length, setDeleteConfirmOpen, setManageOperationHint, sidebarCheckedNodeIds.length])

  const confirmManageDelete = useCallback(async () => {
    setDeleteConfirmOpen(false)
    setManageOperationHint(null)

    try {
      if (sidebarCheckedNodeIds.length > 0) {
        const response = await backendWrite.deleteSidebarNodes(sidebarCheckedNodeIds)
        const failedCount = response.failed.length
        setManageOperationHint(
          failedCount > 0
            ? `已删除 ${response.deleted_count} 项，失败 ${failedCount} 项`
            : `已删除 ${response.deleted_count} 项`,
        )
      } else if (imageCheckedIds.length > 0) {
        const response = await backendWrite.deleteImageItems(imageCheckedIds)
        const failedCount = response.failed.length
        setManageOperationHint(
          failedCount > 0
            ? `已删除 ${response.deleted_count} 张，失败 ${failedCount} 项`
            : `已删除 ${response.deleted_count} 张`,
        )
      }
      clearAllSelections()
    } catch (error) {
      setManageOperationHint(error instanceof Error ? error.message : String(error))
    }
  }, [
    backendWrite,
    clearAllSelections,
    imageCheckedIds,
    setDeleteConfirmOpen,
    setManageOperationHint,
    sidebarCheckedNodeIds,
  ])

  return {
    toggleManageMode,
    runManageHideAction,
    requestManageDelete,
    confirmManageDelete,
  }
}
