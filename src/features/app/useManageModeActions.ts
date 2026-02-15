import { useCallback, type Dispatch, type SetStateAction } from 'react'

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
  deleteSidebarNodes: (nodeIds: string[]) => Promise<DeleteSidebarNodesResponseDto>
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
  requestManageGroup: () => Promise<void>
  requestManageMove: () => Promise<void>
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
  const { t } = useI18n()

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
    async (groupMode: boolean) => {
      if (sidebarCheckedNodeIds.length === 0) {
        setManageOperationHint(t('ui.manage.hint.selectSidebarNodesFirst'))
        return
      }

      let groupName: string | undefined
      if (groupMode) {
        const input = window.prompt(t('ui.manage.prompt.groupName'))
        if (input === null) {
          setManageOperationHint(t('ui.manage.hint.groupCancelled'))
          return
        }
        groupName = input.trim()
        if (!groupName) {
          setManageOperationHint(t('ui.manage.hint.groupNameRequired'))
          return
        }
      }

      let destinationDirectory: string | null = null
      try {
        destinationDirectory = await backendWrite.pickDirectoryPath(
          groupMode ? t('ui.manage.dialog.pickGroupTargetTitle') : t('ui.manage.dialog.pickMoveTargetTitle'),
        )
      } catch (error) {
        setManageOperationHint(t('ui.manage.hint.operationFailed', { message: toErrorDetailWithCode(error, t) }))
        return
      }

      if (!destinationDirectory) {
        setManageOperationHint(groupMode ? t('ui.manage.hint.groupCancelled') : t('ui.manage.hint.moveCancelled'))
        return
      }

      try {
        const response = await backendWrite.moveSidebarNodes(sidebarCheckedNodeIds, destinationDirectory, groupName)
        const failedCount = response.failed.length
        const action = groupMode ? t('ui.manage.action.group') : t('ui.manage.action.move')
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
      } catch (error) {
        setManageOperationHint(t('ui.manage.hint.operationFailed', { message: toErrorDetailWithCode(error, t) }))
      }
    },
    [backendWrite, clearAllSelections, setManageOperationHint, sidebarCheckedNodeIds, t],
  )

  const requestManageGroup = useCallback(async () => {
    await runManageMoveAction(true)
  }, [runManageMoveAction])

  const requestManageMove = useCallback(async () => {
    await runManageMoveAction(false)
  }, [runManageMoveAction])

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

  return {
    toggleManageMode,
    runManageHideAction,
    requestManageDelete,
    requestManageGroup,
    requestManageMove,
    confirmManageDelete,
  }
}
