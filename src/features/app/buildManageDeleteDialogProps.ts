import type { Dispatch, SetStateAction } from 'react'

import type { DangerConfirmDialogProps } from '../../components/DangerConfirmDialog'

interface BuildManageDeleteDialogPropsParams {
  open: boolean
  pending: boolean
  confirmManageDelete: () => Promise<void>
  confirmManageRemoveOnly: () => Promise<void>
  setDeleteConfirmOpen: Dispatch<SetStateAction<boolean>>
  title: string
  description: string
  targetListTitle: string
  targetPaths: string[]
  acknowledgeLabel: string
  confirmLabel: string
  removeOnlyLabel: string
  removeOnlyEnabled: boolean
  cancelLabel: string
}

export function buildManageDeleteDialogProps({
  open,
  pending,
  confirmManageDelete,
  confirmManageRemoveOnly,
  setDeleteConfirmOpen,
  title,
  description,
  targetListTitle,
  targetPaths,
  acknowledgeLabel,
  confirmLabel,
  removeOnlyLabel,
  removeOnlyEnabled,
  cancelLabel,
}: BuildManageDeleteDialogPropsParams): DangerConfirmDialogProps {
  return {
    open,
    title,
    description,
    targetListTitle,
    targetPaths,
    acknowledgeLabel,
    confirmLabel,
    cancelLabel,
    pending,
    removeOnlyLabel,
    removeOnlyEnabled,
    onRemoveOnly: () => {
      void confirmManageRemoveOnly()
    },
    onConfirm: () => {
      void confirmManageDelete()
    },
    onCancel: () => setDeleteConfirmOpen(false),
  }
}
