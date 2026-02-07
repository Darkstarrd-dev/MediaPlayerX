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

import {
  dataTransferHasFiles,
  extractPathsFromClipboard,
  serializeFile,
} from '../app/helpers'
import type { ImportTaskDto, ImportTaskSourceDto } from '../../contracts/backend'
import type { ReadonlyMediaRepository } from '../backend/repository'

const IMPORT_TASK_TIMEOUT_MS = 20_000
const IMPORT_TASK_POLL_INTERVAL_MS = 1_500

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }
  return '导入任务失败'
}

function collectNativePaths(files: File[]): string[] {
  const paths = files
    .map((file) => serializeFile(file).path)
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
  return Array.from(new Set(paths))
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

export function useImportPipeline({ repository }: UseImportPipelineParams): UseImportPipelineResult {
  const fileImportInputRef = useRef<HTMLInputElement>(null)
  const folderImportInputRef = useRef<HTMLInputElement>(null)
  const dragDepthRef = useRef(0)
  const [dragOverlayActive, setDragOverlayActive] = useState(false)
  const [enqueuePending, setEnqueuePending] = useState(false)
  const [taskError, setTaskError] = useState<string | null>(null)
  const [importTasks, setImportTasks] = useState<ImportTaskDto[]>([])

  const refreshTasks = useCallback(async () => {
    const response = await repository.readImportTasks({ timeoutMs: IMPORT_TASK_TIMEOUT_MS })
    setImportTasks(response.tasks)
    setTaskError(null)
  }, [repository])

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
        const response = await repository.enqueueImportTask(
          {
            source,
            paths: normalizedPaths,
          },
          { timeoutMs: IMPORT_TASK_TIMEOUT_MS },
        )
        setImportTasks((previous) => {
          const deduped = previous.filter((task) => task.task_id !== response.task.task_id)
          return [response.task, ...deduped]
        })
        await refreshTasks()
      } catch (error: unknown) {
        setTaskError(toErrorMessage(error))
      } finally {
        setEnqueuePending(false)
      }
    },
    [refreshTasks, repository],
  )

  const retryImportTask = useCallback(
    async (taskId: string) => {
      try {
        setTaskError(null)
        const response = await repository.retryImportTask(
          {
            task_id: taskId,
          },
          { timeoutMs: IMPORT_TASK_TIMEOUT_MS },
        )
        setImportTasks((previous) => previous.map((task) => (task.task_id === taskId ? response.task : task)))
        await refreshTasks()
      } catch (error: unknown) {
        setTaskError(toErrorMessage(error))
      }
    },
    [refreshTasks, repository],
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
        setTaskError(toErrorMessage(error))
      })
  }, [enqueueImportPaths, repository])

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
        setTaskError(toErrorMessage(error))
      })
  }, [enqueueImportPaths, repository])

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
    void refreshTasks().catch((error: unknown) => {
      setTaskError(toErrorMessage(error))
    })

    const timer = window.setInterval(() => {
      void refreshTasks().catch((error: unknown) => {
        setTaskError(toErrorMessage(error))
      })
    }, IMPORT_TASK_POLL_INTERVAL_MS)

    return () => {
      window.clearInterval(timer)
    }
  }, [refreshTasks])

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (!document.hasFocus()) {
        return
      }

      const pastedFiles = Array.from(event.clipboardData?.files ?? [])
      const text = event.clipboardData?.getData('text') ?? ''
      const uriList = event.clipboardData?.getData('text/uri-list') ?? ''
      const pastedPaths = Array.from(new Set([...extractPathsFromClipboard(text), ...extractPathsFromClipboard(uriList)]))

      const filePaths = collectNativePaths(pastedFiles)
      const mergedPaths = Array.from(new Set([...filePaths, ...pastedPaths]))
      if (mergedPaths.length > 0) {
        void enqueueImportPaths('paste', mergedPaths)
      }
    }

    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [enqueueImportPaths])

  const onDragEnterImport: DragEventHandler<HTMLDivElement> = (event) => {
    if (!dataTransferHasFiles(event.dataTransfer)) {
      return
    }

    event.preventDefault()
    dragDepthRef.current += 1
    setDragOverlayActive(true)
  }

  const onDropImport: DragEventHandler<HTMLDivElement> = (event) => {
    dragDepthRef.current = 0
    setDragOverlayActive(false)

    if (!dataTransferHasFiles(event.dataTransfer)) {
      return
    }

    event.preventDefault()

    const nativePaths = collectNativePaths(Array.from(event.dataTransfer.files))
    const uriPaths = extractPathsFromClipboard(event.dataTransfer.getData('text/uri-list') ?? '')
    const textPaths = extractPathsFromClipboard(event.dataTransfer.getData('text/plain') ?? '')
    const mergedPaths = Array.from(new Set([...nativePaths, ...uriPaths, ...textPaths]))
    void enqueueImportPaths('drag-drop', mergedPaths)
  }

  const onDragOverImport: DragEventHandler<HTMLDivElement> = (event) => {
    if (!dataTransferHasFiles(event.dataTransfer)) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    if (!dragOverlayActive) {
      setDragOverlayActive(true)
    }
  }

  const onDragLeaveImport: DragEventHandler<HTMLDivElement> = (event) => {
    if (!dataTransferHasFiles(event.dataTransfer)) {
      return
    }

    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) {
      setDragOverlayActive(false)
    }
  }

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
