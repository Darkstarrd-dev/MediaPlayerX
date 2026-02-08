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

function collectPathsFromDataTransfer(dataTransfer: DataTransfer | null): string[] {
  if (!dataTransfer) {
    return []
  }

  const nativePaths = collectNativePaths(Array.from(dataTransfer.files ?? []))
  const uriPaths = extractPathsFromClipboard(dataTransfer.getData('text/uri-list') ?? '')
  const textPaths = extractPathsFromClipboard(dataTransfer.getData('text/plain') ?? '')
  return Array.from(new Set([...nativePaths, ...uriPaths, ...textPaths]))
}

function shouldShowDragOverlay(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) {
    return false
  }

  if (dataTransferHasFiles(dataTransfer)) {
    return true
  }

  try {
    const uriList = dataTransfer.getData('text/uri-list') ?? ''
    const plainText = dataTransfer.getData('text/plain') ?? ''
    return extractPathsFromClipboard(uriList).length > 0 || extractPathsFromClipboard(plainText).length > 0
  } catch {
    return false
  }
}

type DragEventLike = DragEvent | { nativeEvent: DragEvent }

function isEventImportHandled(event: DragEventLike): boolean {
  const nativeEvent = 'nativeEvent' in event ? event.nativeEvent : event
  return Boolean((nativeEvent as unknown as { __mpx_import_handled__?: boolean }).__mpx_import_handled__)
}

function markEventImportHandled(event: DragEventLike): void {
  const nativeEvent = 'nativeEvent' in event ? event.nativeEvent : event
  ;(nativeEvent as unknown as { __mpx_import_handled__?: boolean }).__mpx_import_handled__ = true
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
  const dragDepthRef = useRef(0)
  const [dragOverlayActive, setDragOverlayActive] = useState(false)
  const [enqueuePending, setEnqueuePending] = useState(false)
  const [taskError, setTaskError] = useState<string | null>(null)
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
        setTaskError(toErrorMessage(error))
      } finally {
        setEnqueuePending(false)
      }
    },
    [isSynchronousTestMode, refreshTasks, repository],
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
        setTaskError(toErrorMessage(error))
      }
    },
    [isSynchronousTestMode, refreshTasks, repository],
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
    if (isSynchronousTestMode) {
      return
    }

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
  }, [isSynchronousTestMode, refreshTasks])

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (!document.hasFocus()) {
        return
      }

      const activeElement = document.activeElement as HTMLElement | null
      if (
        activeElement &&
        (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)
      ) {
        return
      }

      const pastedFiles = Array.from(event.clipboardData?.files ?? [])
      const text = event.clipboardData?.getData('text') ?? ''
      const uriList = event.clipboardData?.getData('text/uri-list') ?? ''
      const pastedPaths = Array.from(new Set([...extractPathsFromClipboard(text), ...extractPathsFromClipboard(uriList)]))

      const filePaths = collectNativePaths(pastedFiles)
      const mergedPaths = Array.from(new Set([...filePaths, ...pastedPaths]))
      if (mergedPaths.length > 0) {
        event.preventDefault()
        void enqueueImportPaths('paste', mergedPaths)
        return
      }

      const clipboardReader = repository.readClipboardImportPaths
      if (!clipboardReader) {
        return
      }

      event.preventDefault()
      void clipboardReader({ timeoutMs: IMPORT_TASK_TIMEOUT_MS })
        .then((response) => {
          if (response.paths.length > 0) {
            void enqueueImportPaths('paste', response.paths)
          }
        })
        .catch((error: unknown) => {
          setTaskError(toErrorMessage(error))
        })
    }

    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [enqueueImportPaths, repository])

  const onDragEnterImport: DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy'
    }

    if (!shouldShowDragOverlay(event.dataTransfer)) {
      return
    }

    dragDepthRef.current += 1
    setDragOverlayActive(true)
  }

  const onDropImport: DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault()

    if (isEventImportHandled(event)) {
      dragDepthRef.current = 0
      setDragOverlayActive(false)
      return
    }

    dragDepthRef.current = 0
    setDragOverlayActive(false)

    const mergedPaths = collectPathsFromDataTransfer(event.dataTransfer)
    if (mergedPaths.length === 0) {
      if ((event.dataTransfer?.files?.length ?? 0) > 0) {
        setTaskError('拖拽导入失败：未获取到本地绝对路径')
      }
      return
    }

    markEventImportHandled(event)
    void enqueueImportPaths('drag-drop', mergedPaths)
  }

  const onDragOverImport: DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy'
    }

    if (!dragOverlayActive && shouldShowDragOverlay(event.dataTransfer)) {
      setDragOverlayActive(true)
    }
  }

  const onDragLeaveImport: DragEventHandler<HTMLDivElement> = () => {
    if (!dragOverlayActive) {
      return
    }

    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) {
      setDragOverlayActive(false)
    }
  }

  useEffect(() => {
    const onWindowDragEnter = (event: DragEvent) => {
      event.preventDefault()
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy'
      }

      if (!shouldShowDragOverlay(event.dataTransfer)) {
        return
      }

      dragDepthRef.current += 1
      setDragOverlayActive(true)
    }

    const onWindowDragOver = (event: DragEvent) => {
      event.preventDefault()

      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy'
      }

      if (!dragOverlayActive && shouldShowDragOverlay(event.dataTransfer)) {
        setDragOverlayActive(true)
      }
    }

    const onWindowDrop = (event: DragEvent) => {
      event.preventDefault()

      if (isEventImportHandled(event)) {
        dragDepthRef.current = 0
        setDragOverlayActive(false)
        return
      }

      dragDepthRef.current = 0
      setDragOverlayActive(false)

      const mergedPaths = collectPathsFromDataTransfer(event.dataTransfer)
      if (mergedPaths.length === 0) {
        return
      }

      markEventImportHandled(event)
      void enqueueImportPaths('drag-drop', mergedPaths)
    }

    const onWindowDragLeave = () => {
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
      if (dragDepthRef.current === 0) {
        setDragOverlayActive(false)
      }
    }

    window.addEventListener('dragenter', onWindowDragEnter, true)
    window.addEventListener('dragover', onWindowDragOver, true)
    window.addEventListener('dragleave', onWindowDragLeave, true)
    window.addEventListener('drop', onWindowDrop, true)
    return () => {
      window.removeEventListener('dragenter', onWindowDragEnter, true)
      window.removeEventListener('dragover', onWindowDragOver, true)
      window.removeEventListener('dragleave', onWindowDragLeave, true)
      window.removeEventListener('drop', onWindowDrop, true)
    }
  }, [dragOverlayActive, enqueueImportPaths])

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
