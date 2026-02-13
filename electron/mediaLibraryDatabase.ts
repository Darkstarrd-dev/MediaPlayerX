import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

import type { LibrarySnapshotDto } from '../src/contracts/backend'
import { MediaLibraryAppStateStore } from './mediaLibraryAppStateStore'
import type { ImportTaskRecord, SQLiteDatabaseLike } from './mediaLibraryDatabaseTypes'
import { MediaLibraryMetadataStore } from './mediaLibraryMetadataStore'
import { MediaLibraryPlaylistStore } from './mediaLibraryPlaylistStore'
import { DATABASE_RELATIVE_PATH, migrateMediaLibrarySchema } from './mediaLibrarySchema'
import { MediaLibrarySnapshotStore } from './mediaLibrarySnapshotStore'
import { MediaLibraryTaskStore } from './mediaLibraryTaskStore'

const require = createRequire(process.execPath)
const { DatabaseSync } = require('node:sqlite') as {
  DatabaseSync: new (path: string) => SQLiteDatabaseLike
}

export type { ImportTaskRecord, ImportTaskStatus } from './mediaLibraryDatabaseTypes'

interface MediaLibraryDatabaseOptions {
  rootDir: string
  databaseFilePath?: string
}

export class MediaLibraryDatabase {
  private readonly db: SQLiteDatabaseLike

  private readonly appStateStore: MediaLibraryAppStateStore

  private readonly snapshotStore: MediaLibrarySnapshotStore

  private readonly metadataStore: MediaLibraryMetadataStore

  private readonly playlistStore: MediaLibraryPlaylistStore

  private readonly taskStore: MediaLibraryTaskStore

  private disposed = false

  constructor(optionsOrRootDir: MediaLibraryDatabaseOptions | string) {
    const options =
      typeof optionsOrRootDir === 'string'
        ? { rootDir: optionsOrRootDir }
        : optionsOrRootDir
    const rootDir = path.resolve(options.rootDir)
    const dbPath = options.databaseFilePath
      ? path.resolve(options.databaseFilePath)
      : path.join(rootDir, DATABASE_RELATIVE_PATH)
    mkdirSync(path.dirname(dbPath), { recursive: true })
    this.db = new DatabaseSync(dbPath)
    this.db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;')
    migrateMediaLibrarySchema(this.db)

    this.appStateStore = new MediaLibraryAppStateStore(this.db)
    this.snapshotStore = new MediaLibrarySnapshotStore(this.db, this.runInTransaction.bind(this))
    this.metadataStore = new MediaLibraryMetadataStore(this.db)
    this.playlistStore = new MediaLibraryPlaylistStore(this.db, this.runInTransaction.bind(this))
    this.taskStore = new MediaLibraryTaskStore(this.db)

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

  upsertRootConfig(configKey: string, configValue: string): void {
    this.appStateStore.upsertRootConfig(configKey, configValue)
  }

  writeAppState(stateKey: string, value: unknown): void {
    this.appStateStore.writeAppState(stateKey, value)
  }

  readAppState<T>(stateKey: string, fallback: T): T {
    return this.appStateStore.readAppState(stateKey, fallback)
  }

  readImportSources(): { directories: string[]; files: string[] } {
    return this.appStateStore.readImportSources()
  }

  writeImportSources(next: { directories: string[]; files: string[] }): void {
    this.appStateStore.writeImportSources(next)
  }

  replaceSnapshot(snapshot: LibrarySnapshotDto): void {
    this.snapshotStore.replaceSnapshot(snapshot)
  }

  readSnapshot(): LibrarySnapshotDto {
    return this.snapshotStore.readSnapshot()
  }

  readPackageGrades(): Map<string, number | null> {
    return this.metadataStore.readPackageGrades()
  }

  readVideoCovers(): Map<string, { coverColor: string; coverImagePath: string | null; updatedAtMs: number }> {
    return this.metadataStore.readVideoCovers()
  }

  readVideoMetadata(): Map<
    string,
    {
      workTitle: string
      workTitleJpn: string
      seriesId: string
      circle: string
      circleJpn: string
      author: string
      authorJpn: string
      tags: string[]
      grade: number | null
      updatedAtMs: number
    }
  > {
    return this.metadataStore.readVideoMetadata()
  }

  readSourceExternalMetadata(): Map<
    string,
    {
      sourceSite: 'nhentai' | 'ehentai'
      sourceUrl: string
      sourceRemoteId: string
      sourceToken: string
      title: string
      titleJpn: string
      groupName: string
      groupNameJpn: string
      artist: string
      artistJpn: string
      posted: string
      rating: string | null
      favorited: string | null
      tags: Record<string, string>
      rawJson: string
      updatedAtMs: number
    }
  > {
    return this.metadataStore.readSourceExternalMetadata()
  }

  readSourceCovers(): Map<string, { coverColor: string; coverImagePath: string | null; updatedAtMs: number }> {
    return this.metadataStore.readSourceCovers()
  }

  writePackageGrade(sourceId: string, grade: number | null): void {
    this.metadataStore.writePackageGrade(sourceId, grade)
  }

  setImagesHidden(imageIds: string[], hidden: boolean): number {
    return this.snapshotStore.setImagesHidden(imageIds, hidden)
  }

  deleteImageItems(imageIds: string[]): { deletedCount: number; touchedSourceIds: string[] } {
    return this.snapshotStore.deleteImageItems(imageIds)
  }

  deleteSnapshotEntriesByPaths(paths: string[]): { deletedSourceCount: number; deletedVideoCount: number } {
    return this.snapshotStore.deleteSnapshotEntriesByPaths(paths)
  }

  writeSourceMetadata(
    sourceId: string,
    payload: {
      packageName: string
      displayName: string
      workTitle: string
      seriesId: string
      circle: string
      author: string
      tags: string[]
    },
  ): void {
    this.metadataStore.writeSourceMetadata(sourceId, payload)
  }

  writeVideoCover(videoId: string, coverColor: string, coverImagePath: string | null): void {
    this.metadataStore.writeVideoCover(videoId, coverColor, coverImagePath)
  }

  writeVideoMetadata(
    videoId: string,
    payload: {
      workTitle: string
      workTitleJpn: string
      seriesId: string
      circle: string
      circleJpn: string
      author: string
      authorJpn: string
      tags: string[]
      grade: number | null
    },
  ): void {
    this.metadataStore.writeVideoMetadata(videoId, payload)
  }

  writeSourceExternalMetadata(
    sourceId: string,
    payload: {
      sourceSite: 'nhentai' | 'ehentai'
      sourceUrl: string
      sourceRemoteId: string
      sourceToken: string
      title: string
      titleJpn: string
      groupName: string
      groupNameJpn: string
      artist: string
      artistJpn: string
      posted: string
      rating: string | null
      favorited: string | null
      tags: Record<string, string>
      rawJson: string
    },
  ): void {
    this.metadataStore.writeSourceExternalMetadata(sourceId, payload)
  }

  writeSourceCover(sourceId: string, coverColor: string, coverImagePath: string | null): void {
    this.metadataStore.writeSourceCover(sourceId, coverColor, coverImagePath)
  }

  readPlaylist(): string[] {
    return this.playlistStore.readPlaylist()
  }

  writePlaylist(videoIds: string[]): string[] {
    return this.playlistStore.writePlaylist(videoIds)
  }

  upsertTask(task: ImportTaskRecord): void {
    this.taskStore.upsertTask(task)
  }

  readTask(taskId: string): ImportTaskRecord | null {
    return this.taskStore.readTask(taskId)
  }

  readTasks(): ImportTaskRecord[] {
    return this.taskStore.readTasks()
  }

  clearDatabase(): void {
    this.runInTransaction(() => {
      this.db.prepare('DELETE FROM task_log').run()
      this.db.prepare('DELETE FROM playlist_entry').run()
      this.db.prepare('DELETE FROM video_cover').run()
      this.db.prepare('DELETE FROM video_metadata').run()
      this.db.prepare('DELETE FROM media_source_cover').run()
      this.db.prepare('DELETE FROM media_source_external_metadata').run()
      this.db.prepare('DELETE FROM package_grade').run()
      this.db.prepare('DELETE FROM image_item').run()
      this.db.prepare('DELETE FROM media_source').run()
      this.db.prepare('DELETE FROM video_item').run()
      this.db.prepare('DELETE FROM app_state').run()
    })
  }
}
