import type { Dispatch, SetStateAction } from 'react'

import type { ImportTaskDto } from '../../contracts/backend'
import type { ImportTaskPanelProps } from '../../components/ImportTaskPanel'

interface BuildImportTaskPanelPropsParams {
  open: boolean
  activeTaskCount: number
  pendingArchiveCount: number
  runningArchive: boolean
  enqueuePending: boolean
  taskError: string | null
  tasks: ImportTaskDto[]
  setImportTaskPanelOpen: Dispatch<SetStateAction<boolean>>
  clearFinishedImportTasks: () => void
  clearAllImportTasks: () => void
  clearTaskError: () => void
  retryImportTaskFromPanel: (taskId: string) => void
  setDismissedImportTaskIds: Dispatch<SetStateAction<Record<string, true>>>
}

export function buildImportTaskPanelProps(params: BuildImportTaskPanelPropsParams): ImportTaskPanelProps {
  return {
    open: params.open,
    activeTaskCount: params.activeTaskCount,
    pendingArchiveCount: params.pendingArchiveCount,
    runningArchive: params.runningArchive,
    enqueuePending: params.enqueuePending,
    taskError: params.taskError,
    tasks: params.tasks,
    onClose: () => params.setImportTaskPanelOpen(false),
    onClearFinished: params.clearFinishedImportTasks,
    onClearAll: params.clearAllImportTasks,
    onClearError: params.clearTaskError,
    onRetryTask: params.retryImportTaskFromPanel,
    onRemoveTask: (taskId) => {
      params.setDismissedImportTaskIds((previous) => ({ ...previous, [taskId]: true }))
    },
  }
}
