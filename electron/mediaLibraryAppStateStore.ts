import type { SQLiteDatabaseLike } from './mediaLibraryDatabaseTypes'
import { parseJson } from './mediaLibraryStoreUtils'

export class MediaLibraryAppStateStore {
  constructor(private readonly db: SQLiteDatabaseLike) {}

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

  readMusicImportSources(): { directories: string[]; files: string[] } {
    const state = this.readAppState<{ directories?: unknown; files?: unknown }>('music_import_sources_v1', {})
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

  writeMusicImportSources(next: { directories: string[]; files: string[] }): void {
    this.writeAppState('music_import_sources_v1', {
      directories: Array.from(new Set(next.directories.map((value) => value.trim()).filter(Boolean))),
      files: Array.from(new Set(next.files.map((value) => value.trim()).filter(Boolean))),
    })
  }
}
