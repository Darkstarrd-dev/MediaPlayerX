import type { ImportTaskRecord, ImportTaskStatus, SQLiteDatabaseLike } from './mediaLibraryDatabaseTypes'
import { clampProgress, parseJson } from './mediaLibraryStoreUtils'

export class MediaLibraryTaskStore {
  constructor(private readonly db: SQLiteDatabaseLike) {}

  upsertTask(task: ImportTaskRecord): void {
    this.db
      .prepare(
        `
          INSERT INTO task_log (
            task_id,
            task_type,
            task_source,
            source_paths_json,
            status,
            progress,
            processed_count,
            total_count,
            message,
            error_detail,
            created_at_ms,
            updated_at_ms
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(task_id) DO UPDATE SET
            task_type = excluded.task_type,
            task_source = excluded.task_source,
            source_paths_json = excluded.source_paths_json,
            status = excluded.status,
            progress = excluded.progress,
            processed_count = excluded.processed_count,
            total_count = excluded.total_count,
            message = excluded.message,
            error_detail = excluded.error_detail,
            updated_at_ms = excluded.updated_at_ms
        `,
      )
      .run(
        task.taskId,
        task.taskType,
        task.taskSource,
        JSON.stringify(task.sourcePaths),
        task.status,
        clampProgress(task.progress),
        Math.max(0, task.processedCount),
        Math.max(0, task.totalCount),
        task.message,
        task.errorDetail,
        task.createdAtMs,
        task.updatedAtMs,
      )
  }

  readTask(taskId: string): ImportTaskRecord | null {
    const row = this.db
      .prepare(
        `
          SELECT
            task_id,
            task_type,
            task_source,
            source_paths_json,
            status,
            progress,
            processed_count,
            total_count,
            message,
            error_detail,
            created_at_ms,
            updated_at_ms
          FROM task_log
          WHERE task_id = ?
        `,
      )
      .get(taskId) as
      | {
          task_id: string
          task_type: string
          task_source: string
          source_paths_json: string
          status: ImportTaskStatus
          progress: number
          processed_count: number
          total_count: number
          message: string | null
          error_detail: string | null
          created_at_ms: number
          updated_at_ms: number
        }
      | undefined

    if (!row) {
      return null
    }

    return {
      taskId: row.task_id,
      taskType: row.task_type,
      taskSource: row.task_source,
      sourcePaths: parseJson<string[]>(row.source_paths_json, []),
      status: row.status,
      progress: clampProgress(row.progress),
      processedCount: row.processed_count,
      totalCount: row.total_count,
      message: row.message,
      errorDetail: row.error_detail,
      createdAtMs: row.created_at_ms,
      updatedAtMs: row.updated_at_ms,
    }
  }

  readTasks(): ImportTaskRecord[] {
    const rows = this.db
      .prepare(
        `
          SELECT
            task_id,
            task_type,
            task_source,
            source_paths_json,
            status,
            progress,
            processed_count,
            total_count,
            message,
            error_detail,
            created_at_ms,
            updated_at_ms
          FROM task_log
          ORDER BY created_at_ms DESC
        `,
      )
      .all() as Array<{
      task_id: string
      task_type: string
      task_source: string
      source_paths_json: string
      status: ImportTaskStatus
      progress: number
      processed_count: number
      total_count: number
      message: string | null
      error_detail: string | null
      created_at_ms: number
      updated_at_ms: number
    }>

    return rows.map((row) => ({
      taskId: row.task_id,
      taskType: row.task_type,
      taskSource: row.task_source,
      sourcePaths: parseJson<string[]>(row.source_paths_json, []),
      status: row.status,
      progress: clampProgress(row.progress),
      processedCount: row.processed_count,
      totalCount: row.total_count,
      message: row.message,
      errorDetail: row.error_detail,
      createdAtMs: row.created_at_ms,
      updatedAtMs: row.updated_at_ms,
    }))
  }
}
