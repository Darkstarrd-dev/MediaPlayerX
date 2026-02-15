import type { Dispatch, SetStateAction } from 'react'

import type { DangerConfirmDialogProps } from '../../components/DangerConfirmDialog'

interface BuildManageDeleteDialogPropsParams {
  open: boolean
  pending: boolean
  confirmManageDelete: () => Promise<void>
  setDeleteConfirmOpen: Dispatch<SetStateAction<boolean>>
  title: string
  description: string
  acknowledgeLabel: string
  confirmLabel: string
  cancelLabel: string
}

export function buildManageDeleteDialogProps({
  open,
  pending,
  confirmManageDelete,
  setDeleteConfirmOpen,
  title,
  description,
  acknowledgeLabel,
  confirmLabel,
  cancelLabel,
}: BuildManageDeleteDialogPropsParams): DangerConfirmDialogProps {
  return {
    open,
    title,
    description,
    acknowledgeLabel,
    confirmLabel,
    cancelLabel,
    pending,
    onConfirm: () => {
      void confirmManageDelete()
    },
    onCancel: () => setDeleteConfirmOpen(false),
  }
}
