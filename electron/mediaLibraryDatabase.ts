import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

import {
  librarySnapshotDtoSchema,
  type ImageItemDto,
  type ImagePackageDto,
  type LibrarySnapshotDto,
  type MediaLocatorDto,
  type VideoItemDto,
} from '../src/contracts/backend'

const DATABASE_RELATIVE_PATH = '.mediaplayerx/state/library.sqlite'
const SCHEMA_VERSION = 2

interface SQLiteStatementLike {
  run(...params: unknown[]): unknown
  get(...params: unknown[]): unknown
  all(...params: unknown[]): unknown
}

interface SQLiteDatabaseLike {
  exec(sql: string): void
  prepare(sql: string): SQLiteStatementLike
  close(): void
}

const require = createRequire(process.execPath)
const { DatabaseSync } = require('node:sqlite') as {
  DatabaseSync: new (path: string) => SQLiteDatabaseLike
}

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

interface SourceRow {
  id: string
  source_type: 'package' | 'directory'
  package_name: string
  display_name: string
  absolute_path: string
  tree_path_json: string
  work_title: string
  circle: string
  author: string
  tags_json: string
  mock_grade: number | null
}

interface ImageRow {
  id: string
  ordinal: number
  width: number
  height: number
  size_kb: number
  cluster: number
  color: string
  feature_vector_json: string
  media_locator_json: string
}

interface VideoRow {
  id: string
  file_name: string
  absolute_path: string
  tree_path_json: string
  duration_sec: number
  width: number
  height: number
  size_mb: number
  media_locator_json: string
  cover_color: string | null
  cover_image_path: string | null
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.max(0, Math.min(1, value))
}

export class MediaLibraryDatabase {
  private readonly db: SQLiteDatabaseLike

  private disposed = false

  constructor(rootDir: string) {
    const dbPath = path.join(rootDir, DATABASE_RELATIVE_PATH)
    mkdirSync(path.dirname(dbPath), { recursive: true })
    this.db = new DatabaseSync(dbPath)
    this.db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;')
    this.migrate()
    this.upsertRootConfig('library_root', rootDir)
  }

  dispose(): void {
    if (this.disposed) {
      return
    }
    this.disposed = true
    this.db.close()
  }

  private runInTransaction<T>(task: () => T): T {
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const result = task()
      this.db.exec('COMMIT')
      return result
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }

  private migrate(): void {
    const versionRow = this.db.prepare('PRAGMA user_version').get() as { user_version?: number } | undefined
    const currentVersion = versionRow?.user_version ?? 0
    if (currentVersion >= SCHEMA_VERSION) {
      return
    }

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS media_source (
        id TEXT PRIMARY KEY,
        source_type TEXT NOT NULL CHECK (source_type IN ('package', 'directory')),
        package_name TEXT NOT NULL,
        display_name TEXT NOT NULL,
        absolute_path TEXT NOT NULL UNIQUE,
        tree_path_json TEXT NOT NULL,
        work_title TEXT NOT NULL,
        circle TEXT NOT NULL,
        author TEXT NOT NULL,
        tags_json TEXT NOT NULL,
        last_seen_revision INTEGER NOT NULL,
        updated_at_ms INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_media_source_type ON media_source(source_type);
      CREATE INDEX IF NOT EXISTS idx_media_source_path ON media_source(absolute_path);

      CREATE TABLE IF NOT EXISTS image_item (
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
        updated_at_ms INTEGER NOT NULL,
        FOREIGN KEY(source_id) REFERENCES media_source(id) ON DELETE CASCADE,
        UNIQUE(source_id, ordinal)
      );

      CREATE INDEX IF NOT EXISTS idx_image_item_source ON image_item(source_id, ordinal);

      CREATE TABLE IF NOT EXISTS video_item (
        id TEXT PRIMARY KEY,
        file_name TEXT NOT NULL,
        absolute_path TEXT NOT NULL UNIQUE,
        tree_path_json TEXT NOT NULL,
        duration_sec INTEGER NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        size_mb INTEGER NOT NULL,
        media_locator_json TEXT NOT NULL,
        last_seen_revision INTEGER NOT NULL,
        updated_at_ms INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_video_item_path ON video_item(absolute_path);

      CREATE TABLE IF NOT EXISTS package_grade (
        source_id TEXT PRIMARY KEY,
        grade INTEGER,
        updated_at_ms INTEGER NOT NULL,
        FOREIGN KEY(source_id) REFERENCES media_source(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS video_cover (
        video_id TEXT PRIMARY KEY,
        cover_color TEXT NOT NULL,
        cover_image_path TEXT,
        updated_at_ms INTEGER NOT NULL,
        FOREIGN KEY(video_id) REFERENCES video_item(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS playlist_entry (
        video_id TEXT PRIMARY KEY,
        sort_index INTEGER NOT NULL,
        updated_at_ms INTEGER NOT NULL,
        FOREIGN KEY(video_id) REFERENCES video_item(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_playlist_sort ON playlist_entry(sort_index);

      CREATE TABLE IF NOT EXISTS app_state (
        state_key TEXT PRIMARY KEY,
        state_json TEXT NOT NULL,
        updated_at_ms INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS root_config (
        config_key TEXT PRIMARY KEY,
        config_value TEXT NOT NULL,
        updated_at_ms INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS task_log (
        task_id TEXT PRIMARY KEY,
        task_type TEXT NOT NULL,
        task_source TEXT NOT NULL,
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

      CREATE INDEX IF NOT EXISTS idx_task_log_updated_at ON task_log(updated_at_ms DESC);
    `)

    if (currentVersion < 2) {
      try {
        this.db.exec("ALTER TABLE task_log ADD COLUMN task_source TEXT NOT NULL DEFAULT 'dialog-files';")
      } catch {
        // ignore duplicated column on new databases
      }
    }

    this.db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`)
  }

  upsertRootConfig(configKey: string, configValue: string): void {
    this.db
      .prepare(
        `
          INSERT INTO root_config (config_key, config_value, updated_at_ms)
          VALUES (?, ?, ?)
          ON CONFLICT(config_key) DO UPDATE SET
            config_value = excluded.config_value,
            updated_at_ms = excluded.updated_at_ms
        `,
      )
      .run(configKey, configValue, Date.now())
  }

  writeAppState(stateKey: string, value: unknown): void {
    this.db
      .prepare(
        `
          INSERT INTO app_state (state_key, state_json, updated_at_ms)
          VALUES (?, ?, ?)
          ON CONFLICT(state_key) DO UPDATE SET
            state_json = excluded.state_json,
            updated_at_ms = excluded.updated_at_ms
        `,
      )
      .run(stateKey, JSON.stringify(value), Date.now())
  }

  readAppState<T>(stateKey: string, fallback: T): T {
    const row = this.db
      .prepare(
        `
          SELECT state_json
          FROM app_state
          WHERE state_key = ?
        `,
      )
      .get(stateKey) as { state_json: string } | undefined

    if (!row) {
      return fallback
    }
    return parseJson(row.state_json, fallback)
  }

  readImportSources(): { directories: string[]; files: string[] } {
    const state = this.readAppState<{ directories?: unknown; files?: unknown }>('import_sources_v1', {})
    const directories = Array.isArray(state.directories)
      ? state.directories.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : []
    const files = Array.isArray(state.files)
      ? state.files.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : []
    return {
      directories,
      files,
    }
  }

  writeImportSources(next: { directories: string[]; files: string[] }): void {
    this.writeAppState('import_sources_v1', {
      directories: Array.from(new Set(next.directories.map((value) => value.trim()).filter(Boolean))),
      files: Array.from(new Set(next.files.map((value) => value.trim()).filter(Boolean))),
    })
  }

  replaceSnapshot(snapshot: LibrarySnapshotDto): void {
    const revision = Date.now()

    const upsertSource = this.db.prepare(
      `
        INSERT INTO media_source (
          id,
          source_type,
          package_name,
          display_name,
          absolute_path,
          tree_path_json,
          work_title,
          circle,
          author,
          tags_json,
          last_seen_revision,
          updated_at_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          source_type = excluded.source_type,
          package_name = excluded.package_name,
          display_name = excluded.display_name,
          absolute_path = excluded.absolute_path,
          tree_path_json = excluded.tree_path_json,
          work_title = excluded.work_title,
          circle = excluded.circle,
          author = excluded.author,
          tags_json = excluded.tags_json,
          last_seen_revision = excluded.last_seen_revision,
          updated_at_ms = excluded.updated_at_ms
      `,
    )

    const upsertImage = this.db.prepare(
      `
        INSERT INTO image_item (
          id,
          source_id,
          ordinal,
          width,
          height,
          size_kb,
          cluster,
          color,
          feature_vector_json,
          media_locator_json,
          last_seen_revision,
          updated_at_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          source_id = excluded.source_id,
          ordinal = excluded.ordinal,
          width = excluded.width,
          height = excluded.height,
          size_kb = excluded.size_kb,
          cluster = excluded.cluster,
          color = excluded.color,
          feature_vector_json = excluded.feature_vector_json,
          media_locator_json = excluded.media_locator_json,
          last_seen_revision = excluded.last_seen_revision,
          updated_at_ms = excluded.updated_at_ms
      `,
    )

    const upsertVideo = this.db.prepare(
      `
        INSERT INTO video_item (
          id,
          file_name,
          absolute_path,
          tree_path_json,
          duration_sec,
          width,
          height,
          size_mb,
          media_locator_json,
          last_seen_revision,
          updated_at_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          file_name = excluded.file_name,
          absolute_path = excluded.absolute_path,
          tree_path_json = excluded.tree_path_json,
          duration_sec = excluded.duration_sec,
          width = excluded.width,
          height = excluded.height,
          size_mb = excluded.size_mb,
          media_locator_json = excluded.media_locator_json,
          last_seen_revision = excluded.last_seen_revision,
          updated_at_ms = excluded.updated_at_ms
      `,
    )

    const deleteStaleImagesBySource = this.db.prepare(
      `
        DELETE FROM image_item
        WHERE source_id = ? AND last_seen_revision <> ?
      `,
    )

    const deleteStaleSources = this.db.prepare(
      `
        DELETE FROM media_source
        WHERE last_seen_revision <> ?
      `,
    )

    const deleteStaleVideos = this.db.prepare(
      `
        DELETE FROM video_item
        WHERE last_seen_revision <> ?
      `,
    )

    this.runInTransaction(() => {
      const now = Date.now()

      const allSources: Array<{ sourceType: 'package' | 'directory'; source: ImagePackageDto }> = [
        ...snapshot.image_packages.map((source) => ({ sourceType: 'package' as const, source })),
        ...snapshot.image_directories.map((source) => ({ sourceType: 'directory' as const, source })),
      ]

      for (const item of allSources) {
        const source = item.source
        upsertSource.run(
          source.id,
          item.sourceType,
          source.package_name,
          source.display_name,
          source.absolute_path,
          JSON.stringify(source.tree_path),
          source.work_title,
          source.circle,
          source.author,
          JSON.stringify(source.tags),
          revision,
          now,
        )

        for (const image of source.images) {
          upsertImage.run(
            image.id,
            source.id,
            image.ordinal,
            image.width,
            image.height,
            image.size_kb,
            image.cluster,
            image.color,
            JSON.stringify(image.feature_vector),
            JSON.stringify(image.media_locator),
            revision,
            now,
          )
        }

        deleteStaleImagesBySource.run(source.id, revision)
      }

      for (const video of snapshot.videos) {
        upsertVideo.run(
          video.id,
          video.file_name,
          video.absolute_path,
          JSON.stringify(video.tree_path),
          video.duration_sec,
          video.width,
          video.height,
          video.size_mb,
          JSON.stringify(video.media_locator),
          revision,
          now,
        )
      }

      deleteStaleSources.run(revision)
      deleteStaleVideos.run(revision)
    })
  }

  readSnapshot(): LibrarySnapshotDto {
    const sourceRows = this.db
      .prepare(
        `
          SELECT
            source.id,
            source.source_type,
            source.package_name,
            source.display_name,
            source.absolute_path,
            source.tree_path_json,
            source.work_title,
            source.circle,
            source.author,
            source.tags_json,
            grade.grade AS mock_grade
          FROM media_source AS source
          LEFT JOIN package_grade AS grade ON grade.source_id = source.id
          ORDER BY source.absolute_path COLLATE NOCASE
        `,
      )
      .all() as SourceRow[]

    const readImagesBySource = this.db.prepare(
      `
        SELECT
          id,
          ordinal,
          width,
          height,
          size_kb,
          cluster,
          color,
          feature_vector_json,
          media_locator_json
        FROM image_item
        WHERE source_id = ?
        ORDER BY ordinal ASC
      `,
    )

    const imagePackages: ImagePackageDto[] = []
    const imageDirectories: ImagePackageDto[] = []

    for (const row of sourceRows) {
      const imageRows = readImagesBySource.all(row.id) as ImageRow[]
      const images: ImageItemDto[] = imageRows.map((imageRow) => ({
        id: imageRow.id,
        ordinal: imageRow.ordinal,
        width: imageRow.width,
        height: imageRow.height,
        size_kb: imageRow.size_kb,
        cluster: imageRow.cluster,
        color: imageRow.color,
        feature_vector: parseJson<number[]>(imageRow.feature_vector_json, []),
        media_locator: parseJson<MediaLocatorDto>(imageRow.media_locator_json, {
          kind: 'filesystem',
          absolute_path: '',
          extension: '.jpg',
          media_type: 'image',
          mime_type: 'image/jpeg',
        }),
      }))

      const source: ImagePackageDto = {
        id: row.id,
        package_name: row.package_name,
        display_name: row.display_name,
        absolute_path: row.absolute_path,
        tree_path: parseJson<string[]>(row.tree_path_json, [row.display_name]),
        work_title: row.work_title,
        circle: row.circle,
        author: row.author,
        tags: parseJson<string[]>(row.tags_json, []),
        mock_grade: row.mock_grade,
        images,
      }

      if (row.source_type === 'package') {
        imagePackages.push(source)
      } else {
        imageDirectories.push(source)
      }
    }

    const videoRows = this.db
      .prepare(
        `
          SELECT
            video.id,
            video.file_name,
            video.absolute_path,
            video.tree_path_json,
            video.duration_sec,
            video.width,
            video.height,
            video.size_mb,
            video.media_locator_json,
            cover.cover_color,
            cover.cover_image_path
          FROM video_item AS video
          LEFT JOIN video_cover AS cover ON cover.video_id = video.id
          ORDER BY video.absolute_path COLLATE NOCASE
        `,
      )
      .all() as VideoRow[]

    const videos: VideoItemDto[] = videoRows.map((row) => ({
      id: row.id,
      file_name: row.file_name,
      absolute_path: row.absolute_path,
      tree_path: parseJson<string[]>(row.tree_path_json, [row.file_name]),
      duration_sec: row.duration_sec,
      width: row.width,
      height: row.height,
      size_mb: row.size_mb,
      cover_color: row.cover_color ?? 'hsl(0, 0%, 36%)',
      cover_image_path: row.cover_image_path,
      media_locator: parseJson<MediaLocatorDto>(row.media_locator_json, {
        kind: 'filesystem',
        absolute_path: row.absolute_path,
        extension: '.mp4',
        media_type: 'video',
        mime_type: 'video/mp4',
      }),
    }))

    return librarySnapshotDtoSchema.parse({
      image_packages: imagePackages,
      image_directories: imageDirectories,
      videos,
    })
  }

  readPackageGrades(): Map<string, number | null> {
    const rows = this.db
      .prepare(
        `
          SELECT source_id, grade
          FROM package_grade
        `,
      )
      .all() as Array<{ source_id: string; grade: number | null }>

    return new Map(rows.map((row) => [row.source_id, row.grade]))
  }

  readVideoCovers(): Map<string, { coverColor: string; coverImagePath: string | null; updatedAtMs: number }> {
    const rows = this.db
      .prepare(
        `
          SELECT video_id, cover_color, cover_image_path, updated_at_ms
          FROM video_cover
        `,
      )
      .all() as Array<{
        video_id: string
        cover_color: string
        cover_image_path: string | null
        updated_at_ms: number
      }>

    return new Map(
      rows.map((row) => [
        row.video_id,
        {
          coverColor: row.cover_color,
          coverImagePath: row.cover_image_path,
          updatedAtMs: row.updated_at_ms,
        },
      ]),
    )
  }

  writePackageGrade(sourceId: string, grade: number | null): void {
    this.db
      .prepare(
        `
          INSERT INTO package_grade (source_id, grade, updated_at_ms)
          VALUES (?, ?, ?)
          ON CONFLICT(source_id) DO UPDATE SET
            grade = excluded.grade,
            updated_at_ms = excluded.updated_at_ms
        `,
      )
      .run(sourceId, grade, Date.now())
  }

  writeVideoCover(videoId: string, coverColor: string, coverImagePath: string | null): void {
    this.db
      .prepare(
        `
          INSERT INTO video_cover (video_id, cover_color, cover_image_path, updated_at_ms)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(video_id) DO UPDATE SET
            cover_color = excluded.cover_color,
            cover_image_path = excluded.cover_image_path,
            updated_at_ms = excluded.updated_at_ms
        `,
      )
      .run(videoId, coverColor, coverImagePath, Date.now())
  }

  readPlaylist(): string[] {
    const rows = this.db
      .prepare(
        `
          SELECT video_id
          FROM playlist_entry
          ORDER BY sort_index ASC
        `,
      )
      .all() as Array<{ video_id: string }>
    return rows.map((row) => row.video_id)
  }

  writePlaylist(videoIds: string[]): string[] {
    const normalized = Array.from(new Set(videoIds.filter((id) => id.trim().length > 0)))
    const existsVideo = this.db.prepare('SELECT 1 AS present FROM video_item WHERE id = ?')

    const filtered = normalized.filter((videoId) => {
      const row = existsVideo.get(videoId) as { present?: number } | undefined
      return Boolean(row?.present)
    })

    const insert = this.db.prepare(
      `
        INSERT INTO playlist_entry (video_id, sort_index, updated_at_ms)
        VALUES (?, ?, ?)
      `,
    )
    const clear = this.db.prepare('DELETE FROM playlist_entry')

    this.runInTransaction(() => {
      clear.run()
      const now = Date.now()
      for (let index = 0; index < filtered.length; index += 1) {
        insert.run(filtered[index], index, now)
      }
    })
    return filtered
  }

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

  clearDatabase(): void {
    this.runInTransaction(() => {
      this.db.prepare('DELETE FROM task_log').run()
      this.db.prepare('DELETE FROM playlist_entry').run()
      this.db.prepare('DELETE FROM video_cover').run()
      this.db.prepare('DELETE FROM package_grade').run()
      this.db.prepare('DELETE FROM image_item').run()
      this.db.prepare('DELETE FROM media_source').run()
      this.db.prepare('DELETE FROM video_item').run()
      this.db.prepare('DELETE FROM app_state').run()
    })
  }
}
