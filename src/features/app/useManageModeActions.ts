import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'

import type {
  DeleteImageItemsResponseDto,
  DeleteSidebarNodesResponseDto,
  MoveSidebarNodesResponseDto,
  SetImageHiddenResponseDto,
} from '../../contracts/backend'
import { useI18n } from '../../i18n/useI18n'
import type { BrowserMode } from '../../types'
import { toErrorDetailWithCode } from './errorCode'

interface ManageWriteAccess {
  setImageHidden: (imageIds: string[], hidden: boolean) => Promise<SetImageHiddenResponseDto>
  deleteImageItems: (imageIds: string[]) => Promise<DeleteImageItemsResponseDto>
  deleteSidebarNodes: (nodeIds: string[], options?: { deleteFiles?: boolean }) => Promise<DeleteSidebarNodesResponseDto>
  pickDirectoryPath: (title?: string, defaultPath?: string) => Promise<string | null>
  moveSidebarNodes: (
    nodeIds: string[],
    destinationDirectory: string,
    groupName?: string,
  ) => Promise<MoveSidebarNodesResponseDto>
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
  requestManageGroup: () => void
  groupNameDialogOpen: boolean
  groupNameDraft: string
  setGroupNameDraft: Dispatch<SetStateAction<string>>
  cancelManageGroup: () => void
  confirmManageGroup: () => Promise<void>
  confirmManageMove: () => Promise<void>
  requestManageMove: () => Promise<void>
  confirmManageDelete: () => Promise<void>
  confirmManageRemoveOnly: () => Promise<void>
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
  const { t } = useI18n()
  const [groupNameDialogOpen, setGroupNameDialogOpen] = useState(false)
  const [groupNameDraft, setGroupNameDraft] = useState('')

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
        setManageOperationHint(t('ui.manage.hint.unsupportedHideAction'))
        return
      }
      if (imageCheckedIds.length === 0) {
        setManageOperationHint(t('ui.manage.hint.selectImagesFirst'))
        return
      }

      try {
        const response = await backendWrite.setImageHidden(imageCheckedIds, hidden)
        setManageOperationHint(
          t('ui.manage.hint.setHiddenResult', {
            action: hidden ? t('ui.manage.action.hide') : t('ui.manage.action.unhide'),
            count: response.updated_count,
          }),
        )
      } catch (error) {
        setManageOperationHint(t('ui.manage.hint.operationFailed', { message: toErrorDetailWithCode(error, t) }))
      }
    },
    [backendWrite, imageCheckedIds, mode, setManageOperationHint, t],
  )

  const requestManageDelete = useCallback(() => {
    if (sidebarCheckedNodeIds.length === 0 && imageCheckedIds.length === 0) {
      setManageOperationHint(t('ui.manage.hint.selectNodesOrImagesFirst'))
      return
    }

    setDeleteConfirmOpen(true)
  }, [imageCheckedIds.length, setDeleteConfirmOpen, setManageOperationHint, sidebarCheckedNodeIds.length, t])

  const runManageMoveAction = useCallback(
    async (groupNameInput?: string): Promise<boolean> => {
      if (sidebarCheckedNodeIds.length === 0) {
        return false
      }

      let destinationDirectory: string | null = null
      try {
        destinationDirectory = await backendWrite.pickDirectoryPath(
          groupNameInput ? t('ui.manage.dialog.pickGroupTargetTitle') : t('ui.manage.dialog.pickMoveTargetTitle'),
        )
      } catch (error) {
        setManageOperationHint(t('ui.manage.hint.operationFailed', { message: toErrorDetailWithCode(error, t) }))
        return false
      }

      const normalizedDestinationDirectory = destinationDirectory?.trim() ?? ''
      if (!normalizedDestinationDirectory) {
        return false
      }

      const groupName = groupNameInput?.trim() || undefined

      try {
        const response = await backendWrite.moveSidebarNodes(sidebarCheckedNodeIds, normalizedDestinationDirectory, groupName)
        const failedCount = response.failed.length
        const action = groupName ? t('ui.manage.action.group') : t('ui.manage.action.move')
        setManageOperationHint(
          failedCount > 0
            ? t('ui.manage.hint.moveResultWithFailures', {
                action,
                success: response.moved_count,
                failed: failedCount,
              })
            : t('ui.manage.hint.moveResultSuccess', {
                action,
                success: response.moved_count,
              }),
        )
        clearAllSelections()
        return true
      } catch (error) {
        setManageOperationHint(t('ui.manage.hint.operationFailed', { message: toErrorDetailWithCode(error, t) }))
        return false
      }
    },
    [backendWrite, clearAllSelections, setManageOperationHint, sidebarCheckedNodeIds, t],
  )

  const requestManageGroup = useCallback(() => {
    if (sidebarCheckedNodeIds.length === 0) {
      return
    }
    setGroupNameDraft('')
    setManageOperationHint(null)
    setGroupNameDialogOpen(true)
  }, [setManageOperationHint, sidebarCheckedNodeIds.length])

  const cancelManageGroup = useCallback(() => {
    setGroupNameDialogOpen(false)
    setGroupNameDraft('')
  }, [])

  const confirmManageGroup = useCallback(async () => {
    const normalizedGroupName = groupNameDraft.trim()
    if (!normalizedGroupName) {
      setManageOperationHint(t('ui.manage.hint.groupNameRequired'))
      return
    }

    const completed = await runManageMoveAction(normalizedGroupName)
    if (completed) {
      setGroupNameDialogOpen(false)
      setGroupNameDraft('')
    }
  }, [groupNameDraft, runManageMoveAction, setManageOperationHint, t])

  const confirmManageMove = useCallback(async () => {
    const completed = await runManageMoveAction(undefined)
    if (completed) {
      setGroupNameDialogOpen(false)
      setGroupNameDraft('')
    }
  }, [runManageMoveAction])

  const requestManageMove = useCallback(async () => {
    if (sidebarCheckedNodeIds.length === 0) {
      return
    }
    setGroupNameDraft('')
    setManageOperationHint(null)
    setGroupNameDialogOpen(true)
  }, [setManageOperationHint, sidebarCheckedNodeIds.length])

  const confirmManageDelete = useCallback(async () => {
    setDeleteConfirmOpen(false)
    setManageOperationHint(null)

    try {
      if (sidebarCheckedNodeIds.length > 0) {
        const response = await backendWrite.deleteSidebarNodes(sidebarCheckedNodeIds)
        const failedCount = response.failed.length
        setManageOperationHint(
          failedCount > 0
            ? t('ui.manage.hint.deleteNodesWithFailures', {
                deleted: response.deleted_count,
                failed: failedCount,
              })
            : t('ui.manage.hint.deleteNodesSuccess', { deleted: response.deleted_count }),
        )
      } else if (imageCheckedIds.length > 0) {
        const response = await backendWrite.deleteImageItems(imageCheckedIds)
        const failedCount = response.failed.length
        setManageOperationHint(
          failedCount > 0
            ? t('ui.manage.hint.deleteImagesWithFailures', {
                deleted: response.deleted_count,
                failed: failedCount,
              })
            : t('ui.manage.hint.deleteImagesSuccess', { deleted: response.deleted_count }),
        )
      }
      clearAllSelections()
    } catch (error) {
      setManageOperationHint(t('ui.manage.hint.operationFailed', { message: toErrorDetailWithCode(error, t) }))
    }
  }, [
    backendWrite,
    clearAllSelections,
    imageCheckedIds,
    setDeleteConfirmOpen,
    setManageOperationHint,
    sidebarCheckedNodeIds,
    t,
  ])

  const confirmManageRemoveOnly = useCallback(async () => {
    if (sidebarCheckedNodeIds.length === 0) {
      setManageOperationHint(t('ui.manage.hint.selectSidebarNodesFirst'))
      return
    }

    setDeleteConfirmOpen(false)
    setManageOperationHint(null)

    try {
      const response = await backendWrite.deleteSidebarNodes(sidebarCheckedNodeIds, { deleteFiles: false })
      const failedCount = response.failed.length
      setManageOperationHint(
        failedCount > 0
          ? t('ui.manage.hint.removeNodesWithFailures', {
              removed: response.deleted_count,
              failed: failedCount,
            })
          : t('ui.manage.hint.removeNodesSuccess', { removed: response.deleted_count }),
      )
      clearAllSelections()
    } catch (error) {
      setManageOperationHint(t('ui.manage.hint.operationFailed', { message: toErrorDetailWithCode(error, t) }))
    }
  }, [backendWrite, clearAllSelections, setDeleteConfirmOpen, setManageOperationHint, sidebarCheckedNodeIds, t])

  return {
    toggleManageMode,
    runManageHideAction,
    requestManageDelete,
    requestManageGroup,
    groupNameDialogOpen,
    groupNameDraft,
    setGroupNameDraft,
    cancelManageGroup,
    confirmManageGroup,
    confirmManageMove,
    requestManageMove,
    confirmManageDelete,
    confirmManageRemoveOnly,
  }
}
