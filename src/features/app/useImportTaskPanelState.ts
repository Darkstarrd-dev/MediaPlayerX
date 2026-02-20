import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react'

import type { ImportTaskDto } from '../../contracts/backend'

interface UseImportTaskPanelStateParams {
  importTasks: ImportTaskDto[]
  dismissedImportTaskIds: Record<string, true>
  setDismissedImportTaskIds: Dispatch<SetStateAction<Record<string, true>>>
  enqueuePending: boolean
  archiveLoadStatus: {
    runningArchivePath: string | null
    runningArchiveProgress: number | null
    runningArchiveMessage: string | null
    pendingArchivePaths: string[]
    thumbnailRunningCount: number
    thumbnailRunningProgress: number | null
    thumbnailRunningMessage: string | null
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
    importRunning: (payload: { activeCount: number; enqueuePending: boolean }) => string
    archiveRunning: (payload: { progress: number | null; pendingCount: number }) => string
    thumbnailRunning: (payload: { runningCount: number; progress: number | null }) => string
  }
}

interface UseImportTaskPanelStateResult {
  activeImportTaskCount: number
  importTasksForPanel: ImportTaskDto[]
  normalizedPendingArchivePathSet: Set<string>
  normalizedRunningArchivePath: string | null
  runningArchiveProgress: number | null
  runningArchiveMessage: string | null
  thumbnailRunningCount: number
  thumbnailRunningProgress: number | null
  thumbnailRunningMessage: string | null
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
  const thumbnailBusy = archiveLoadStatus.thumbnailRunningCount > 0
  const importBusy = enqueuePending || activeImportTasks.length > 0 || archiveLoadBusy || thumbnailBusy
  const taskStatusBusy = importBusy || adReviewRunning || adReviewDeleting
  let taskStatusLabel = taskStatusLabels.idle
  if (importBusy) {
    if (normalizedRunningArchivePath !== null || normalizedPendingArchivePathSet.size > 0) {
      taskStatusLabel = taskStatusLabels.archiveRunning({
        progress: archiveLoadStatus.runningArchiveProgress,
        pendingCount: normalizedPendingArchivePathSet.size,
      })
    } else if (thumbnailBusy) {
      taskStatusLabel = taskStatusLabels.thumbnailRunning({
        runningCount: archiveLoadStatus.thumbnailRunningCount,
        progress: archiveLoadStatus.thumbnailRunningProgress,
      })
    } else {
      taskStatusLabel = taskStatusLabels.importRunning({
        activeCount: activeImportTasks.length,
        enqueuePending,
      })
    }
  } else if (adReviewDeleting) {
    taskStatusLabel = taskStatusLabels.deleting
  } else if (adReviewRunning) {
    taskStatusLabel = taskStatusLabels.reviewing
  }

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
    runningArchiveProgress: archiveLoadStatus.runningArchiveProgress,
    runningArchiveMessage: archiveLoadStatus.runningArchiveMessage,
    thumbnailRunningCount: archiveLoadStatus.thumbnailRunningCount,
    thumbnailRunningProgress: archiveLoadStatus.thumbnailRunningProgress,
    thumbnailRunningMessage: archiveLoadStatus.thumbnailRunningMessage,
    taskStatusLabel,
    taskStatusBusy,
    clearFinishedImportTasks,
    clearAllImportTasks,
    retryImportTaskFromPanel,
  }
}
