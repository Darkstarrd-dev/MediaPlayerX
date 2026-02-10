import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

import type { SQLiteDatabaseLike } from '../mediaLibraryDatabaseTypes'
import { DATABASE_RELATIVE_PATH, migrateMediaLibrarySchema } from '../mediaLibrarySchema'

const require = createRequire(process.execPath)
const { DatabaseSync } = require('node:sqlite') as {
  DatabaseSync: new (path: string) => SQLiteDatabaseLike
}

export interface SqliteHarness {
  db: SQLiteDatabaseLike
  dbPath: string
  close: () => void
}

export function openRawSqliteDatabase(rootDir: string): SqliteHarness {
  const dbPath = path.join(rootDir, DATABASE_RELATIVE_PATH)
  mkdirSync(path.dirname(dbPath), { recursive: true })
  const db = new DatabaseSync(dbPath)
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;')

  return {
    db,
    dbPath,
    close: () => db.close(),
  }
}

export function openMigratedSqliteDatabase(rootDir: string): SqliteHarness {
  const harness = openRawSqliteDatabase(rootDir)
  migrateMediaLibrarySchema(harness.db)
  return harness
}
