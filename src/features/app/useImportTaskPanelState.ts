import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react'

import type { ImportTaskDto } from '../../contracts/backend'

interface UseImportTaskPanelStateParams {
  importTasks: ImportTaskDto[]
  dismissedImportTaskIds: Record<string, true>
  setDismissedImportTaskIds: Dispatch<SetStateAction<Record<string, true>>>
  enqueuePending: boolean
  archiveLoadStatus: {
    runningArchivePath: string | null
    pendingArchivePaths: string[]
  }
  normalizePathForCompare: (value: string) => string
  retryImportTask: (taskId: string) => Promise<void>
  adReviewRunning: boolean
  adReviewDeleting: boolean
  taskStatusLabels: {
    loading: string
    deleting: string
    reviewing: string
    idle: string
  }
}

interface UseImportTaskPanelStateResult {
  activeImportTaskCount: number
  importTasksForPanel: ImportTaskDto[]
  normalizedPendingArchivePathSet: Set<string>
  normalizedRunningArchivePath: string | null
  taskStatusLabel: string
  taskStatusBusy: boolean
  clearFinishedImportTasks: () => void
  clearAllImportTasks: () => void
  retryImportTaskFromPanel: (taskId: string) => void
}

export function useImportTaskPanelState({
  importTasks,
  dismissedImportTaskIds,
  setDismissedImportTaskIds,
  enqueuePending,
  archiveLoadStatus,
  normalizePathForCompare,
  retryImportTask,
  adReviewRunning,
  adReviewDeleting,
  taskStatusLabels,
}: UseImportTaskPanelStateParams): UseImportTaskPanelStateResult {
  const visibleImportTasks = useMemo(
    () => importTasks.filter((task) => !dismissedImportTaskIds[task.task_id]),
    [dismissedImportTaskIds, importTasks],
  )

  const activeImportTasks = useMemo(
    () => visibleImportTasks.filter((task) => task.status === 'pending' || task.status === 'running'),
    [visibleImportTasks],
  )

  const finishedImportTasks = useMemo(
    () => visibleImportTasks.filter((task) => task.status === 'completed' || task.status === 'failed'),
    [visibleImportTasks],
  )

  const recentFinishedImportTasks = useMemo(() => finishedImportTasks.slice(0, 8), [finishedImportTasks])

  const importTasksForPanel = useMemo(
    () => [...activeImportTasks, ...recentFinishedImportTasks],
    [activeImportTasks, recentFinishedImportTasks],
  )

  const normalizedPendingArchivePathSet = useMemo(
    () => new Set(archiveLoadStatus.pendingArchivePaths.map((value) => normalizePathForCompare(value))),
    [archiveLoadStatus.pendingArchivePaths, normalizePathForCompare],
  )

  const normalizedRunningArchivePath = archiveLoadStatus.runningArchivePath
    ? normalizePathForCompare(archiveLoadStatus.runningArchivePath)
    : null

  const archiveLoadBusy = normalizedPendingArchivePathSet.size > 0 || normalizedRunningArchivePath !== null
  const importBusy = enqueuePending || activeImportTasks.length > 0 || archiveLoadBusy
  const taskStatusBusy = importBusy || adReviewRunning || adReviewDeleting
  const taskStatusLabel = importBusy
    ? taskStatusLabels.loading
    : adReviewDeleting
      ? taskStatusLabels.deleting
      : adReviewRunning
        ? taskStatusLabels.reviewing
        : taskStatusLabels.idle

  const clearFinishedImportTasks = useCallback(() => {
    setDismissedImportTaskIds((previous) => {
      const next = { ...previous }
      for (const task of finishedImportTasks) {
        next[task.task_id] = true
      }
      return next
    })
  }, [finishedImportTasks, setDismissedImportTaskIds])

  const clearAllImportTasks = useCallback(() => {
    setDismissedImportTaskIds((previous) => {
      const next = { ...previous }
      for (const task of visibleImportTasks) {
        next[task.task_id] = true
      }
      return next
    })
  }, [setDismissedImportTaskIds, visibleImportTasks])

  const retryImportTaskFromPanel = useCallback(
    (taskId: string) => {
      setDismissedImportTaskIds((previous) => {
        if (!(taskId in previous)) {
          return previous
        }
        const next = { ...previous }
        delete next[taskId]
        return next
      })
      void retryImportTask(taskId)
    },
    [retryImportTask, setDismissedImportTaskIds],
  )

  return {
    activeImportTaskCount: activeImportTasks.length,
    importTasksForPanel,
    normalizedPendingArchivePathSet,
    normalizedRunningArchivePath,
    taskStatusLabel,
    taskStatusBusy,
    clearFinishedImportTasks,
    clearAllImportTasks,
    retryImportTaskFromPanel,
  }
}
