import type { Dispatch, SetStateAction } from 'react'

import type { DangerConfirmDialogProps } from '../../components/DangerConfirmDialog'

interface BuildManageDeleteDialogPropsParams {
  open: boolean
  pending: boolean
  confirmManageDelete: () => Promise<void>
  setDeleteConfirmOpen: Dispatch<SetStateAction<boolean>>
}

export function buildManageDeleteDialogProps({
  open,
  pending,
  confirmManageDelete,
  setDeleteConfirmOpen,
}: BuildManageDeleteDialogPropsParams): DangerConfirmDialogProps {
  return {
    open,
    title: '永久删除确认',
    description: '该操作将永久删除当前选中的文件/目录/压缩包条目，并同步移除数据库记录与缩略图缓存，且会删除源文件本身。',
    acknowledgeLabel: '我了解此操作将永久不可逆地删除选中数据',
    confirmLabel: '确定删除',
    cancelLabel: '取消',
    pending,
    onConfirm: () => {
      void confirmManageDelete()
    },
    onCancel: () => setDeleteConfirmOpen(false),
  }
}
