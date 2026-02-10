import {
  enqueueImportTaskResponseSchema,
  readImportTasksResponseSchema,
  retryImportTaskResponseSchema,
  type EnqueueImportTaskRequestDto,
  type EnqueueImportTaskResponseDto,
  type ImportTaskDto,
  type ImportTaskSourceDto,
  type RetryImportTaskRequestDto,
  type RetryImportTaskResponseDto,
} from '../../../src/contracts/backend'
import { executeImportTask } from '../../fileSystemImportTasks'
import type { MediaLibraryDatabase } from '../../mediaLibraryDatabase'

interface ImportTaskServiceOptions {
  rootDir: string
  legacyImportsDirName: string
  imageExtensions: ReadonlySet<string>
  videoExtensions: ReadonlySet<string>
  archiveExtensions: ReadonlySet<string>
  database: MediaLibraryDatabase
  invalidateCache: () => void
  ensureSnapshotLoaded: () => Promise<unknown>
  emitLibraryChanged: (payload: { reason: 'import-task-finished'; updated_at_ms: number }) => void
}

export class ImportTaskService {
  private importTaskQueue: Promise<void> = Promise.resolve()

  private runningImportTaskIds = new Set<string>()

  constructor(private readonly options: ImportTaskServiceOptions) {}

  recoverInterruptedImportTasks(): void {
    const tasks = this.options.database.readTasks()
    if (tasks.length === 0) {
      return
    }

    const now = Date.now()
    for (const task of tasks) {
      if (task.taskType !== 'import' || (task.status !== 'pending' && task.status !== 'running')) {
        continue
      }

      this.options.database.upsertTask({
        ...task,
        status: 'failed',
        progress: task.totalCount > 0 ? task.processedCount / task.totalCount : 1,
        message: task.status === 'running' ? '导入任务已中断，请重试' : '导入任务未执行，请重试',
        errorDetail: task.errorDetail ?? '应用重启导致任务中断',
        updatedAtMs: now,
      })
    }
  }

  hasRunningImportTasks(): boolean {
    return this.runningImportTaskIds.size > 0
  }

  clearRuntimeState(): void {
    this.runningImportTaskIds.clear()
    this.importTaskQueue = Promise.resolve()
  }

  async enqueueImportTask(request: EnqueueImportTaskRequestDto): Promise<EnqueueImportTaskResponseDto> {
    const now = Date.now()
    const normalizedPaths = Array.from(new Set(request.paths.map((value) => value.trim()).filter(Boolean)))
    if (normalizedPaths.length === 0) {
      throw new Error('导入失败：路径列表为空')
    }

    const taskId = this.buildImportTaskId()
    this.options.database.upsertTask({
      taskId,
      taskType: 'import',
      taskSource: request.source,
      sourcePaths: normalizedPaths,
      status: 'pending',
      progress: 0,
      processedCount: 0,
      totalCount: normalizedPaths.length,
      message: '导入任务已入队',
      errorDetail: null,
      createdAtMs: now,
      updatedAtMs: now,
    })

    this.scheduleImportTask(taskId)

    const queued = this.options.database.readTask(taskId)
    if (!queued) {
      throw new Error(`导入任务状态丢失: ${taskId}`)
    }

    const task = this.toImportTaskDto(queued)
    return enqueueImportTaskResponseSchema.parse({ task })
  }

  async readImportTasks(): Promise<{ tasks: ImportTaskDto[] }> {
    const tasks = this.options.database.readTasks().map((record) => this.toImportTaskDto(record))
    return readImportTasksResponseSchema.parse({ tasks })
  }

  async retryImportTask(request: RetryImportTaskRequestDto): Promise<RetryImportTaskResponseDto> {
    const existing = this.options.database.readTask(request.task_id)
    if (!existing) {
      throw new Error(`导入重试失败：任务不存在 ${request.task_id}`)
    }

    const now = Date.now()
    this.options.database.upsertTask({
      ...existing,
      status: 'pending',
      progress: 0,
      processedCount: 0,
      totalCount: existing.sourcePaths.length,
      message: '导入任务重试已入队',
      errorDetail: null,
      updatedAtMs: now,
    })

    this.scheduleImportTask(request.task_id)

    const queued = this.options.database.readTask(request.task_id)
    if (!queued) {
      throw new Error(`导入任务状态丢失: ${request.task_id}`)
    }

    const task = this.toImportTaskDto(queued)
    return retryImportTaskResponseSchema.parse({ task })
  }

  private toImportTaskDto(record: {
    taskId: string
    taskType: string
    taskSource: string
    sourcePaths: string[]
    status: 'pending' | 'running' | 'completed' | 'failed'
    progress: number
    processedCount: number
    totalCount: number
    message: string | null
    errorDetail: string | null
    createdAtMs: number
    updatedAtMs: number
  }): ImportTaskDto {
    const taskSource: ImportTaskSourceDto =
      record.taskSource === 'dialog-folders' ||
      record.taskSource === 'drag-drop' ||
      record.taskSource === 'paste'
        ? record.taskSource
        : 'dialog-files'

    return {
      task_id: record.taskId,
      task_type: 'import',
      source: taskSource,
      paths: record.sourcePaths,
      status: record.status,
      progress: Math.max(0, Math.min(1, record.progress)),
      processed_count: Math.max(0, record.processedCount),
      total_count: Math.max(0, record.totalCount),
      message: record.message,
      error_detail: record.errorDetail,
      created_at_ms: record.createdAtMs,
      updated_at_ms: record.updatedAtMs,
    }
  }

  private buildImportTaskId(): string {
    return `import-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`
  }

  private scheduleImportTask(taskId: string): void {
    if (this.runningImportTaskIds.has(taskId)) {
      return
    }

    this.runningImportTaskIds.add(taskId)
    this.importTaskQueue = this.importTaskQueue
      .catch(() => undefined)
      .then(async () => {
        try {
          await this.runImportTask(taskId)
        } catch (error) {
          const reason = error instanceof Error && error.message ? error.message : '未知错误'
          let existing: ReturnType<MediaLibraryDatabase['readTask']>
          try {
            existing = this.options.database.readTask(taskId)
          } catch {
            existing = null
          }
          if (existing) {
            this.options.database.upsertTask({
              ...existing,
              status: 'failed',
              progress: 1,
              processedCount: existing.totalCount,
              totalCount: existing.totalCount,
              message: '导入任务执行失败',
              errorDetail: reason,
              updatedAtMs: Date.now(),
            })
          }
          console.error('import task execution failed', {
            taskId,
            reason,
          })
        } finally {
          this.runningImportTaskIds.delete(taskId)
        }
      })
  }

  private async runImportTask(taskId: string): Promise<ImportTaskDto> {
    const finalTask = await executeImportTask({
      taskId,
      rootDir: this.options.rootDir,
      legacyImportsDirName: this.options.legacyImportsDirName,
      imageExtensions: this.options.imageExtensions,
      videoExtensions: this.options.videoExtensions,
      archiveExtensions: this.options.archiveExtensions,
      database: this.options.database,
      invalidateCache: this.options.invalidateCache,
      ensureSnapshotLoaded: this.options.ensureSnapshotLoaded,
      emitLibraryChanged: this.options.emitLibraryChanged,
    })

    return this.toImportTaskDto(finalTask)
  }
}
