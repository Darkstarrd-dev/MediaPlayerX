import { afterEach, describe, expect, it } from 'vitest'

import { MediaLibraryAppStateStore } from './mediaLibraryAppStateStore'
import { cleanupTempMediaRoot, createTempMediaRoot } from './test-utils/mediaLibraryFixtures'
import { openMigratedSqliteDatabase } from './test-utils/sqliteHarness'

describe('MediaLibraryAppStateStore', () => {
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

  it('可写入并读取 app_state，非法 JSON 会回退到 fallback', async () => {
    const root = await createTempMediaRoot('mpx-app-state-')
    roots.push(root)

    const harness = openMigratedSqliteDatabase(root)
    closers.push(harness.close)
    const store = new MediaLibraryAppStateStore(harness.db)

    store.writeAppState('theme', { id: 'ocean', fontSize: 15 })
    expect(store.readAppState('theme', { id: 'default', fontSize: 12 })).toEqual({ id: 'ocean', fontSize: 15 })

    harness.db
      .prepare(
        `
          INSERT INTO app_state (state_key, state_json, updated_at_ms)
          VALUES (?, ?, ?)
        `,
      )
      .run('broken', '{not-json', Date.now())

    expect(store.readAppState('broken', { id: 'fallback' })).toEqual({ id: 'fallback' })
  })

  it('writeImportSources 会做 trim + 去重，upsertRootConfig 可覆盖旧值', async () => {
    const root = await createTempMediaRoot('mpx-import-sources-')
    roots.push(root)

    const harness = openMigratedSqliteDatabase(root)
    closers.push(harness.close)
    const store = new MediaLibraryAppStateStore(harness.db)

    store.writeImportSources({
      directories: ['  D:/images  ', 'D:/images', '', 'D:/archives'],
      files: ['C:/a.jpg', ' C:/a.jpg ', ' ', 'C:/b.png'],
    })

    expect(store.readImportSources()).toEqual({
      directories: ['D:/images', 'D:/archives'],
      files: ['C:/a.jpg', 'C:/b.png'],
    })

    store.upsertRootConfig('library_root', 'D:/library-a')
    store.upsertRootConfig('library_root', 'D:/library-b')

    const row = harness.db
      .prepare('SELECT config_value FROM root_config WHERE config_key = ?')
      .get('library_root') as { config_value?: string } | undefined
    expect(row?.config_value).toBe('D:/library-b')
  })
})
