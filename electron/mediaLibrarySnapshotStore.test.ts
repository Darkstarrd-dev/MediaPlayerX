import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { LibrarySnapshotDto } from '../src/contracts/backend'
import { MediaLibrarySnapshotStore } from './mediaLibrarySnapshotStore'
import {
  createAudioFixture,
  cleanupTempMediaRoot,
  createImageSourceFixture,
  createTempMediaRoot,
  createVideoFixture,
} from './test-utils/mediaLibraryFixtures'
import { openMigratedSqliteDatabase } from './test-utils/sqliteHarness'

function createTransactionRunner(db: { exec: (sql: string) => void }) {
  return <T>(task: () => T): T => {
    db.exec('BEGIN IMMEDIATE')
    try {
      const result = task()
      db.exec('COMMIT')
      return result
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }
}

describe('MediaLibrarySnapshotStore', () => {
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

  it('replaceSnapshot 会按 revision 清理 stale source/image/video', async () => {
    const root = await createTempMediaRoot('mpx-snapshot-stale-')
    roots.push(root)

    const harness = openMigratedSqliteDatabase(root)
    closers.push(harness.close)
    const store = new MediaLibrarySnapshotStore(harness.db, createTransactionRunner(harness.db))

    const snapshotA: LibrarySnapshotDto = {
      image_packages: [
        createImageSourceFixture({
          sourceId: 'pkg-a',
          packageName: 'pkg-a.zip',
          absolutePath: 'D:/root/pkg-a.zip',
          sourceType: 'package',
        }),
      ],
      image_directories: [
        createImageSourceFixture({
          sourceId: 'dir-a',
          packageName: 'dir-a',
          absolutePath: 'D:/root/dir-a',
          sourceType: 'directory',
        }),
      ],
      videos: [createVideoFixture('video-a', 'D:/root/video-a.mp4')],
      audios: [createAudioFixture('audio-a', 'D:/root/audio-a.mp3')],
    }

    const snapshotB: LibrarySnapshotDto = {
      image_packages: [
        createImageSourceFixture({
          sourceId: 'pkg-b',
          packageName: 'pkg-b.zip',
          absolutePath: 'D:/root/pkg-b.zip',
          sourceType: 'package',
        }),
      ],
      image_directories: [],
      videos: [createVideoFixture('video-b', 'D:/root/video-b.mp4')],
      audios: [createAudioFixture('audio-b', 'D:/root/audio-b.mp3')],
    }

    store.replaceSnapshot(snapshotA)
    store.replaceSnapshot(snapshotB)

    const snapshot = store.readSnapshot()
    expect(snapshot.image_packages.map((item) => item.id)).toEqual(['pkg-b'])
    expect(snapshot.image_directories).toHaveLength(0)
    expect(snapshot.videos.map((item) => item.id)).toEqual(['video-b'])
    expect(snapshot.audios?.map((item) => item.id)).toEqual(['audio-b'])
  })

  it('replaceSnapshot 遇到同路径不同 video id 时复用已存在 id，不触发唯一约束异常', async () => {
    const root = await createTempMediaRoot('mpx-snapshot-video-path-collision-')
    roots.push(root)

    const harness = openMigratedSqliteDatabase(root)
    closers.push(harness.close)
    const store = new MediaLibrarySnapshotStore(harness.db, createTransactionRunner(harness.db))

    const sharedVideoPath = 'D:/root/shared/video.mp4'

    store.replaceSnapshot({
      image_packages: [],
      image_directories: [],
      videos: [createVideoFixture('legacy-video-id', sharedVideoPath)],
      audios: [],
    })

    expect(() => {
      store.replaceSnapshot({
        image_packages: [],
        image_directories: [],
        videos: [createVideoFixture('new-video-id', sharedVideoPath)],
        audios: [],
      })
    }).not.toThrow()

    const snapshot = store.readSnapshot()
    expect(snapshot.videos).toHaveLength(1)
    expect(snapshot.videos[0]?.id).toBe('legacy-video-id')
    expect(path.normalize(snapshot.videos[0]?.absolute_path ?? '')).toBe(path.normalize(sharedVideoPath))
  })

  it('setImagesHidden 与 deleteImageItems 可更新 hidden 并在删除后重排 ordinal', async () => {
    const root = await createTempMediaRoot('mpx-snapshot-delete-')
    roots.push(root)

    const harness = openMigratedSqliteDatabase(root)
    closers.push(harness.close)
    const store = new MediaLibrarySnapshotStore(harness.db, createTransactionRunner(harness.db))

    store.replaceSnapshot({
      image_packages: [
        createImageSourceFixture({
          sourceId: 'pkg-1',
          packageName: 'pkg-1.zip',
          absolutePath: 'D:/pkg-1.zip',
          sourceType: 'package',
        }),
      ],
      image_directories: [],
      videos: [],
      audios: [],
    })

    const before = store.readSnapshot().image_packages[0]
    if (!before) {
      throw new Error('seed package missing')
    }
    const imageIds = before.images.map((image) => image.id)

    const hiddenCount = store.setImagesHidden(imageIds, true)
    expect(hiddenCount).toBe(2)
    expect(store.readSnapshot().image_packages[0]?.images.every((image) => image.hidden === true)).toBe(true)

    const deleteOne = store.deleteImageItems([imageIds[0] ?? ''])
    expect(deleteOne.deletedCount).toBe(1)
    expect(deleteOne.touchedSourceIds).toEqual(['pkg-1'])

    const afterFirstDelete = store.readSnapshot().image_packages[0]
    expect(afterFirstDelete?.images).toHaveLength(1)
    expect(afterFirstDelete?.images[0]?.ordinal).toBe(1)

    const remainingId = afterFirstDelete?.images[0]?.id ?? ''
    const deleteLast = store.deleteImageItems([remainingId])
    expect(deleteLast.deletedCount).toBe(1)

    expect(store.readSnapshot().image_packages).toHaveLength(0)
  })

  it('deleteSnapshotEntriesByPaths 可按路径删除 source 与 video', async () => {
    const root = await createTempMediaRoot('mpx-snapshot-path-delete-')
    roots.push(root)

    const harness = openMigratedSqliteDatabase(root)
    closers.push(harness.close)
    const store = new MediaLibrarySnapshotStore(harness.db, createTransactionRunner(harness.db))

    store.replaceSnapshot({
      image_packages: [
        createImageSourceFixture({
          sourceId: 'pkg-keep',
          packageName: 'pkg-keep.zip',
          absolutePath: 'D:/root/keep/pkg-keep.zip',
          sourceType: 'package',
        }),
        createImageSourceFixture({
          sourceId: 'pkg-drop',
          packageName: 'pkg-drop.zip',
          absolutePath: 'D:/root/drop/pkg-drop.zip',
          sourceType: 'package',
        }),
      ],
      image_directories: [],
      videos: [
        createVideoFixture('video-keep', 'D:/root/keep/video-keep.mp4'),
        createVideoFixture('video-drop', 'D:/root/drop/video-drop.mp4'),
      ],
      audios: [
        createAudioFixture('audio-keep', 'D:/root/keep/audio-keep.mp3'),
        createAudioFixture('audio-drop', 'D:/root/drop/audio-drop.mp3'),
      ],
    })

    const result = store.deleteSnapshotEntriesByPaths(['D:/root/drop'])
    expect(result).toEqual({
      deletedSourceCount: 1,
      deletedVideoCount: 1,
      deletedAudioCount: 1,
    })

    const snapshot = store.readSnapshot()
    expect(snapshot.image_packages.map((item) => item.id)).toEqual(['pkg-keep'])
    expect(snapshot.videos.map((item) => item.id)).toEqual(['video-keep'])
    expect(snapshot.audios?.map((item) => item.id)).toEqual(['audio-keep'])
  })

  it('moveSnapshotEntriesByPaths 可同步更新 source 与 media locator 路径', async () => {
    const root = await createTempMediaRoot('mpx-snapshot-path-move-')
    roots.push(root)

    const harness = openMigratedSqliteDatabase(root)
    closers.push(harness.close)
    const store = new MediaLibrarySnapshotStore(harness.db, createTransactionRunner(harness.db))

    const packageSource = createImageSourceFixture({
      sourceId: 'pkg-move',
      packageName: 'pkg-move.zip',
      absolutePath: 'D:/root/drop/pkg-move.zip',
      sourceType: 'package',
    })
    packageSource.images[0]!.media_locator = {
      kind: 'archive-entry',
      archive_path: 'D:/root/drop/pkg-move.zip',
      archive_format: 'zip',
      entry_name: '001.jpg',
      extension: '.jpg',
      media_type: 'image',
      mime_type: 'image/jpeg',
    }

    store.replaceSnapshot({
      image_packages: [packageSource],
      image_directories: [
        createImageSourceFixture({
          sourceId: 'dir-move',
          packageName: 'gallery-move',
          absolutePath: 'D:/root/drop/gallery-move',
          sourceType: 'directory',
        }),
      ],
      videos: [createVideoFixture('video-move', 'D:/root/drop/video-move.mp4')],
      audios: [createAudioFixture('audio-move', 'D:/root/drop/audio-move.mp3')],
    })

    const result = store.moveSnapshotEntriesByPaths([
      {
        fromPath: 'D:/root/drop',
        toPath: 'E:/root/moved',
      },
    ])
    expect(result).toEqual({
      movedSourceCount: 2,
      movedImageLocatorCount: 4,
      movedVideoCount: 1,
      movedAudioCount: 1,
    })

    const snapshot = store.readSnapshot()
    expect(snapshot.image_packages[0]?.absolute_path).toBe(path.resolve('E:/root/moved/pkg-move.zip'))
    expect(snapshot.image_packages[0]?.images[0]?.media_locator).toMatchObject({
      kind: 'archive-entry',
      archive_path: path.resolve('E:/root/moved/pkg-move.zip'),
    })
    expect(snapshot.image_packages[0]?.images[1]?.media_locator).toMatchObject({
      kind: 'filesystem',
      absolute_path: path.resolve('E:/root/moved/pkg-move_002.jpg'),
    })

    expect(snapshot.image_directories[0]?.absolute_path).toBe(path.resolve('E:/root/moved/gallery-move'))
    expect(snapshot.image_directories[0]?.images[0]?.media_locator).toMatchObject({
      kind: 'filesystem',
      absolute_path: path.resolve('E:/root/moved/gallery-move_001.jpg'),
    })

    expect(snapshot.videos[0]?.absolute_path).toBe(path.resolve('E:/root/moved/video-move.mp4'))
    expect(snapshot.videos[0]?.media_locator).toMatchObject({
      kind: 'filesystem',
      absolute_path: path.resolve('E:/root/moved/video-move.mp4'),
    })

    expect(snapshot.audios?.[0]?.absolute_path).toBe(path.resolve('E:/root/moved/audio-move.mp3'))
    expect(snapshot.audios?.[0]?.media_locator).toMatchObject({
      kind: 'filesystem',
      absolute_path: path.resolve('E:/root/moved/audio-move.mp3'),
    })
  })
})
