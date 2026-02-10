import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEventHandler,
  type RefObject,
} from 'react'

import type {
  EnqueueImportTaskRequestDto,
  EnqueueImportTaskResponseDto,
  ImportTaskDto,
  ImportTaskSourceDto,
  ReadImportTasksResponseDto,
  RetryImportTaskRequestDto,
  RetryImportTaskResponseDto,
} from '../../contracts/backend'
import type { ReadonlyMediaRepository } from '../backend/repository'
import { collectNativePaths } from './importPathUtils'
import { useImportDragOverlay } from './useImportDragOverlay'
import { useImportPaste } from './useImportPaste'

const IMPORT_TASK_TIMEOUT_MS = 20_000
const IMPORT_TASK_POLL_INTERVAL_MS = 1_500

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }
  return '导入任务失败'
}

interface UseImportPipelineResult {
  fileImportInputRef: RefObject<HTMLInputElement | null>
  folderImportInputRef: RefObject<HTMLInputElement | null>
  dragOverlayActive: boolean
  enqueuePending: boolean
  taskError: string | null
  importTasks: ImportTaskDto[]
  openImportFilesDialog: () => void
  openImportFoldersDialog: () => void
  retryImportTask: (taskId: string) => Promise<void>
  clearTaskError: () => void
  onImportFilesSelected: (event: ChangeEvent<HTMLInputElement>) => void
  onImportFoldersSelected: (event: ChangeEvent<HTMLInputElement>) => void
  onDragEnterImport: DragEventHandler<HTMLDivElement>
  onDragOverImport: DragEventHandler<HTMLDivElement>
  onDragLeaveImport: DragEventHandler<HTMLDivElement>
  onDropImport: DragEventHandler<HTMLDivElement>
}

interface UseImportPipelineParams {
  repository: ReadonlyMediaRepository
}

interface SyncImportRepository extends ReadonlyMediaRepository {
  enqueueImportTaskSync(request: EnqueueImportTaskRequestDto): EnqueueImportTaskResponseDto
  readImportTasksSync(): ReadImportTasksResponseDto
  retryImportTaskSync(request: RetryImportTaskRequestDto): RetryImportTaskResponseDto
}

function isSyncImportRepository(repository: ReadonlyMediaRepository): repository is SyncImportRepository {
  return (
    'enqueueImportTaskSync' in repository &&
    typeof repository.enqueueImportTaskSync === 'function' &&
    'readImportTasksSync' in repository &&
    typeof repository.readImportTasksSync === 'function' &&
    'retryImportTaskSync' in repository &&
    typeof repository.retryImportTaskSync === 'function'
  )
}

export function useImportPipeline({ repository }: UseImportPipelineParams): UseImportPipelineResult {
  const isSynchronousTestMode = import.meta.env.MODE === 'test' && isSyncImportRepository(repository)

  const fileImportInputRef = useRef<HTMLInputElement>(null)
  const folderImportInputRef = useRef<HTMLInputElement>(null)
  const [enqueuePending, setEnqueuePending] = useState(false)
  const [taskError, setTaskError] = useState<string | null>(null)
  const handleImportError = useCallback((error: unknown) => {
    setTaskError(toErrorMessage(error))
  }, [])
  const initialImportTasks = useMemo<ImportTaskDto[]>(() => {
    if (!isSynchronousTestMode) {
      return []
    }

    return repository.readImportTasksSync().tasks
  }, [isSynchronousTestMode, repository])
  const [importTasks, setImportTasks] = useState<ImportTaskDto[]>(initialImportTasks)

  const refreshTasks = useCallback(async () => {
    const response = isSynchronousTestMode
      ? repository.readImportTasksSync()
      : await repository.readImportTasks({ timeoutMs: IMPORT_TASK_TIMEOUT_MS })
    setImportTasks(response.tasks)
    setTaskError(null)
  }, [isSynchronousTestMode, repository])

  const enqueueImportPaths = useCallback(
    async (source: ImportTaskSourceDto, paths: string[]) => {
      const normalizedPaths = Array.from(new Set(paths.map((value) => value.trim()).filter(Boolean)))
      if (normalizedPaths.length === 0) {
        setTaskError('导入失败：未获取到本地绝对路径')
        return
      }

      setEnqueuePending(true)
      setTaskError(null)

      try {
        const request: EnqueueImportTaskRequestDto = {
          source,
          paths: normalizedPaths,
        }
        const response = isSynchronousTestMode
          ? repository.enqueueImportTaskSync(request)
          : await repository.enqueueImportTask(request, { timeoutMs: IMPORT_TASK_TIMEOUT_MS })
        setImportTasks((previous) => {
          const deduped = previous.filter((task) => task.task_id !== response.task.task_id)
          return [response.task, ...deduped]
        })
        await refreshTasks()
      } catch (error: unknown) {
        handleImportError(error)
      } finally {
        setEnqueuePending(false)
      }
    },
    [handleImportError, isSynchronousTestMode, refreshTasks, repository],
  )

  const retryImportTask = useCallback(
    async (taskId: string) => {
      try {
        setTaskError(null)
        const request: RetryImportTaskRequestDto = {
          task_id: taskId,
        }
        const response = isSynchronousTestMode
          ? repository.retryImportTaskSync(request)
          : await repository.retryImportTask(request, { timeoutMs: IMPORT_TASK_TIMEOUT_MS })
        setImportTasks((previous) => previous.map((task) => (task.task_id === taskId ? response.task : task)))
        await refreshTasks()
      } catch (error: unknown) {
        handleImportError(error)
      }
    },
    [handleImportError, isSynchronousTestMode, refreshTasks, repository],
  )

  const openImportFilesDialog = useCallback(() => {
    const picker = repository.pickImportPaths
    if (!picker) {
      const input = fileImportInputRef.current
      if (!input) {
        return
      }

      input.value = ''
      input.click()
      return
    }

    void picker(
      {
        mode: 'files',
      },
      { timeoutMs: IMPORT_TASK_TIMEOUT_MS },
    )
      .then((response) => {
        if (response.paths.length > 0) {
          void enqueueImportPaths('dialog-files', response.paths)
        }
      })
      .catch((error: unknown) => {
        handleImportError(error)
      })
  }, [enqueueImportPaths, handleImportError, repository])

  const openImportFoldersDialog = useCallback(() => {
    const picker = repository.pickImportPaths
    if (!picker) {
      const input = folderImportInputRef.current
      if (!input) {
        return
      }

      input.value = ''
      input.click()
      return
    }

    void picker(
      {
        mode: 'folders',
      },
      { timeoutMs: IMPORT_TASK_TIMEOUT_MS },
    )
      .then((response) => {
        if (response.paths.length > 0) {
          void enqueueImportPaths('dialog-folders', response.paths)
        }
      })
      .catch((error: unknown) => {
        handleImportError(error)
      })
  }, [enqueueImportPaths, handleImportError, repository])

  const onImportFilesSelected = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) {
      return
    }

    void enqueueImportPaths('dialog-files', collectNativePaths(files))
  }, [enqueueImportPaths])

  const onImportFoldersSelected = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) {
      return
    }

    void enqueueImportPaths('dialog-folders', collectNativePaths(files))
  }, [enqueueImportPaths])

  useEffect(() => {
    const folderInput = folderImportInputRef.current
    if (!folderInput) {
      return
    }

    folderInput.setAttribute('webkitdirectory', '')
    folderInput.setAttribute('directory', '')
  }, [])

  useEffect(() => {
    if (isSynchronousTestMode) {
      return
    }

    void refreshTasks().catch((error: unknown) => {
      handleImportError(error)
    })

    const timer = window.setInterval(() => {
      void refreshTasks().catch((error: unknown) => {
        handleImportError(error)
      })
    }, IMPORT_TASK_POLL_INTERVAL_MS)

    return () => {
      window.clearInterval(timer)
    }
  }, [handleImportError, isSynchronousTestMode, refreshTasks])

  const enqueuePastePaths = useCallback(
    (paths: string[]) => {
      void enqueueImportPaths('paste', paths)
    },
    [enqueueImportPaths],
  )
  const enqueueDragDropPaths = useCallback(
    (paths: string[]) => {
      void enqueueImportPaths('drag-drop', paths)
    },
    [enqueueImportPaths],
  )
  const handleDragPathResolveFailed = useCallback(() => {
    setTaskError('拖拽导入失败：未获取到本地绝对路径')
  }, [])

  useImportPaste({
    repository,
    timeoutMs: IMPORT_TASK_TIMEOUT_MS,
    enqueuePastePaths,
    onError: handleImportError,
  })

  const { dragOverlayActive, onDragEnterImport, onDragOverImport, onDragLeaveImport, onDropImport } =
    useImportDragOverlay({
      enqueueDragDropPaths,
      onPathResolveFailed: handleDragPathResolveFailed,
    })

  const stableTasks = useMemo(
    () => [...importTasks].sort((left, right) => right.created_at_ms - left.created_at_ms),
    [importTasks],
  )

  return {
    fileImportInputRef,
    folderImportInputRef,
    dragOverlayActive,
    enqueuePending,
    taskError,
    importTasks: stableTasks,
    openImportFilesDialog,
    openImportFoldersDialog,
    retryImportTask,
    clearTaskError: () => setTaskError(null),
    onImportFilesSelected,
    onImportFoldersSelected,
    onDragEnterImport,
    onDragOverImport,
    onDragLeaveImport,
    onDropImport,
  }
}

export type ImportPipelineResult = ReturnType<typeof useImportPipeline>
