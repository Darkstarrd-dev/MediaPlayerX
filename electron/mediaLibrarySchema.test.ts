import { afterEach, describe, expect, it } from 'vitest'

import { cleanupTempMediaRoot, createTempMediaRoot } from './test-utils/mediaLibraryFixtures'
import { openRawSqliteDatabase } from './test-utils/sqliteHarness'
import { migrateMediaLibrarySchema } from './mediaLibrarySchema'

function readTableColumns(db: { prepare: (sql: string) => { all: (...params: unknown[]) => unknown } }, tableName: string): string[] {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>
  return rows.map((row) => row.name)
}

describe('mediaLibrarySchema', () => {
  const roots: string[] = []
  const closers: Array<() => void> = []

  afterEach(async () => {
    for (const close of closers) {
      close()
    }
    closers.length = 0

    for (const root of roots) {
      await cleanupTempMediaRoot(root)
    }
    roots.length = 0
  })

  it('迁移可重复执行且会建立完整表结构', async () => {
    const root = await createTempMediaRoot('mpx-schema-idempotent-')
    roots.push(root)

    const harness = openRawSqliteDatabase(root)
    closers.push(harness.close)

    migrateMediaLibrarySchema(harness.db)
    migrateMediaLibrarySchema(harness.db)

    const version = harness.db.prepare('PRAGMA user_version').get() as { user_version?: number } | undefined
    expect(version?.user_version).toBe(5)

    const tableRows = harness.db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all() as Array<{ name: string }>
    const tableNames = tableRows.map((row) => row.name)

    expect(tableNames).toEqual(
      expect.arrayContaining([
        'media_source',
        'image_item',
        'video_item',
        'package_grade',
        'video_cover',
        'video_metadata',
        'playlist_entry',
        'app_state',
        'root_config',
        'task_log',
      ]),
    )
  })

  it('从旧版本升级时会补齐 task_source/grade/hidden 列', async () => {
    const root = await createTempMediaRoot('mpx-schema-upgrade-')
    roots.push(root)

    const harness = openRawSqliteDatabase(root)
    closers.push(harness.close)

    harness.db.exec(`
      CREATE TABLE task_log (
        task_id TEXT PRIMARY KEY,
        task_type TEXT NOT NULL,
        source_paths_json TEXT NOT NULL,
        status TEXT NOT NULL,
        progress REAL NOT NULL,
        processed_count INTEGER NOT NULL,
        total_count INTEGER NOT NULL,
        message TEXT,
        error_detail TEXT,
        created_at_ms INTEGER NOT NULL,
        updated_at_ms INTEGER NOT NULL
      );

      CREATE TABLE video_metadata (
        video_id TEXT PRIMARY KEY,
        work_title TEXT NOT NULL,
        circle TEXT NOT NULL,
        author TEXT NOT NULL,
        tags_json TEXT NOT NULL,
        updated_at_ms INTEGER NOT NULL
      );

      CREATE TABLE image_item (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        ordinal INTEGER NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        size_kb INTEGER NOT NULL,
        cluster INTEGER NOT NULL,
        color TEXT NOT NULL,
        feature_vector_json TEXT NOT NULL,
        media_locator_json TEXT NOT NULL,
        last_seen_revision INTEGER NOT NULL,
        updated_at_ms INTEGER NOT NULL
      );

      PRAGMA user_version = 1;
    `)

    migrateMediaLibrarySchema(harness.db)

    const taskColumns = readTableColumns(harness.db, 'task_log')
    const metadataColumns = readTableColumns(harness.db, 'video_metadata')
    const imageColumns = readTableColumns(harness.db, 'image_item')

    expect(taskColumns).toContain('task_source')
    expect(metadataColumns).toContain('grade')
    expect(imageColumns).toContain('hidden')

    const version = harness.db.prepare('PRAGMA user_version').get() as { user_version?: number } | undefined
    expect(version?.user_version).toBe(5)
  })
})
