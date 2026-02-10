import { afterEach, describe, expect, it } from 'vitest'

import { MediaLibraryPlaylistStore } from './mediaLibraryPlaylistStore'
import { cleanupTempMediaRoot, createTempMediaRoot } from './test-utils/mediaLibraryFixtures'
import { openMigratedSqliteDatabase } from './test-utils/sqliteHarness'

function seedVideo(db: { prepare: (sql: string) => { run: (...params: unknown[]) => unknown } }, videoId: string): void {
  db.prepare(
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
    `,
  ).run(
    videoId,
    `${videoId}.mp4`,
    `D:/${videoId}.mp4`,
    JSON.stringify([`${videoId}.mp4`]),
    5,
    1280,
    720,
    64,
    JSON.stringify({
      kind: 'filesystem',
      absolute_path: `D:/${videoId}.mp4`,
      extension: '.mp4',
      media_type: 'video',
      mime_type: 'video/mp4',
    }),
    1,
    Date.now(),
  )
}

describe('MediaLibraryPlaylistStore', () => {
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

  it('writePlaylist 会过滤不存在的视频并保持输入顺序', async () => {
    const root = await createTempMediaRoot('mpx-playlist-store-')
    roots.push(root)

    const harness = openMigratedSqliteDatabase(root)
    closers.push(harness.close)
    seedVideo(harness.db, 'video-1')
    seedVideo(harness.db, 'video-2')

    const runInTransaction = <T>(task: () => T): T => {
      harness.db.exec('BEGIN IMMEDIATE')
      try {
        const result = task()
        harness.db.exec('COMMIT')
        return result
      } catch (error) {
        harness.db.exec('ROLLBACK')
        throw error
      }
    }
    const store = new MediaLibraryPlaylistStore(harness.db, runInTransaction)

    const written = store.writePlaylist(['video-2', 'video-missing', 'video-1', 'video-2'])
    expect(written).toEqual(['video-2', 'video-1'])
    expect(store.readPlaylist()).toEqual(['video-2', 'video-1'])
  })

  it('写入空列表会清空已有播放列表', async () => {
    const root = await createTempMediaRoot('mpx-playlist-clear-')
    roots.push(root)

    const harness = openMigratedSqliteDatabase(root)
    closers.push(harness.close)
    seedVideo(harness.db, 'video-1')

    const runInTransaction = <T>(task: () => T): T => {
      harness.db.exec('BEGIN IMMEDIATE')
      try {
        const result = task()
        harness.db.exec('COMMIT')
        return result
      } catch (error) {
        harness.db.exec('ROLLBACK')
        throw error
      }
    }
    const store = new MediaLibraryPlaylistStore(harness.db, runInTransaction)

    store.writePlaylist(['video-1'])
    expect(store.readPlaylist()).toEqual(['video-1'])

    store.writePlaylist([])
    expect(store.readPlaylist()).toEqual([])
  })
})
