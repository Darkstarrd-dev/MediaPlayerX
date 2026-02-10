export interface SQLiteStatementLike {
  run(...params: unknown[]): unknown
  get(...params: unknown[]): unknown
  all(...params: unknown[]): unknown
}

export interface SQLiteDatabaseLike {
  exec(sql: string): void
  prepare(sql: string): SQLiteStatementLike
  close(): void
}

export type TransactionRunner = <T>(task: () => T) => T

export type ImportTaskStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface ImportTaskRecord {
  taskId: string
  taskType: string
  taskSource: string
  sourcePaths: string[]
  status: ImportTaskStatus
  progress: number
  processedCount: number
  totalCount: number
  message: string | null
  errorDetail: string | null
  createdAtMs: number
  updatedAtMs: number
}
