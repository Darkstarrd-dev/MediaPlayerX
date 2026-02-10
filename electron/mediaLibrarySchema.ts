import type { SQLiteDatabaseLike } from './mediaLibraryDatabaseTypes'

export const DATABASE_RELATIVE_PATH = '.mediaplayerx/state/library.sqlite'

const SCHEMA_VERSION = 5

export function migrateMediaLibrarySchema(db: SQLiteDatabaseLike): void {
  const versionRow = db.prepare('PRAGMA user_version').get() as { user_version?: number } | undefined
  const currentVersion = versionRow?.user_version ?? 0
  if (currentVersion >= SCHEMA_VERSION) {
    return
  }

  db.exec(`
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
      hidden INTEGER NOT NULL DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS video_metadata (
      video_id TEXT PRIMARY KEY,
      work_title TEXT NOT NULL,
      circle TEXT NOT NULL,
      author TEXT NOT NULL,
      tags_json TEXT NOT NULL,
      grade INTEGER,
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
      db.exec("ALTER TABLE task_log ADD COLUMN task_source TEXT NOT NULL DEFAULT 'dialog-files';")
    } catch {
      // ignore duplicated column on new databases
    }
  }

  if (currentVersion < 4) {
    try {
      db.exec('ALTER TABLE video_metadata ADD COLUMN grade INTEGER;')
    } catch {
      // ignore duplicated column on new databases
    }
  }

  if (currentVersion < 5) {
    try {
      db.exec('ALTER TABLE image_item ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;')
    } catch {
      // ignore duplicated column on new databases
    }
  }

  db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`)
}
