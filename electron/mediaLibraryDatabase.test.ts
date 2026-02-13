import { afterEach, describe, expect, it } from 'vitest'

import { MediaLibraryDatabase } from './mediaLibraryDatabase'
import {
  cleanupTempMediaRoot,
  createLibrarySnapshotFixture,
  createTempMediaRoot,
} from './test-utils/mediaLibraryFixtures'

describe('MediaLibraryDatabase', () => {
  const roots: string[] = []
  const disposers: Array<() => void> = []

  afterEach(async () => {
    for (const dispose of disposers) {
      dispose()
    }
    disposers.length = 0

    for (const root of roots) {
      await cleanupTempMediaRoot(root)
    }
    roots.length = 0
  })

  it('关键读写数据可在数据库重启后恢复', async () => {
    const root = await createTempMediaRoot('mpx-db-restart-')
    roots.push(root)

    const snapshot = createLibrarySnapshotFixture({
      packageAbsolutePath: `${root}/pkg-fixture.zip`,
      directoryAbsolutePath: `${root}/gallery-fixture`,
      videoAbsolutePath: `${root}/video-fixture.mp4`,
    })
    const packageId = snapshot.image_packages[0]?.id
    const videoId = snapshot.videos[0]?.id
    if (!packageId || !videoId) {
      throw new Error('fixture ids missing')
    }

    const database = new MediaLibraryDatabase(root)
    disposers.push(() => database.dispose())

    database.replaceSnapshot(snapshot)
    database.writePackageGrade(packageId, 5)
    database.writeVideoCover(videoId, 'hsl(210, 44%, 40%)', `${root}/covers/video-fixture.webp`)
    database.writeVideoMetadata(videoId, {
      workTitle: '视频标题',
      seriesId: 'series-db-001',
      circle: '视频社团',
      author: '视频作者',
      tags: ['tag-a', 'tag-b'],
      grade: 4,
    })
    database.writePlaylist([videoId, 'missing-video'])
    database.upsertTask({
      taskId: 'task-1',
      taskType: 'import',
      taskSource: 'dialog-folders',
      sourcePaths: [`${root}/input`],
      status: 'completed',
      progress: 1,
      processedCount: 10,
      totalCount: 10,
      message: 'done',
      errorDetail: null,
      createdAtMs: 100,
      updatedAtMs: 200,
    })
    database.writeAppState('ui', { sidebarRatio: 0.3 })
    database.writeImportSources({
      directories: [`${root}/input`, `${root}/input`],
      files: [`${root}/a.jpg`],
    })

    database.dispose()
    disposers.pop()

    const restarted = new MediaLibraryDatabase(root)
    disposers.push(() => restarted.dispose())

    const restoredSnapshot = restarted.readSnapshot()
    expect(restoredSnapshot.image_packages).toHaveLength(1)
    expect(restoredSnapshot.image_directories).toHaveLength(1)
    expect(restoredSnapshot.videos).toHaveLength(1)

    expect(restarted.readPackageGrades().get(packageId)).toBe(5)
    expect(restarted.readVideoCovers().get(videoId)).toMatchObject({
      coverColor: 'hsl(210, 44%, 40%)',
      coverImagePath: `${root}/covers/video-fixture.webp`,
    })
    expect(restarted.readVideoMetadata().get(videoId)).toMatchObject({
      workTitle: '视频标题',
      seriesId: 'series-db-001',
      circle: '视频社团',
      author: '视频作者',
      tags: ['tag-a', 'tag-b'],
      grade: 4,
    })
    expect(restarted.readPlaylist()).toEqual([videoId])
    expect(restarted.readTask('task-1')).toMatchObject({
      taskId: 'task-1',
      status: 'completed',
    })
    expect(restarted.readAppState('ui', { sidebarRatio: 0.5 })).toEqual({ sidebarRatio: 0.3 })
    expect(restarted.readImportSources()).toEqual({
      directories: [`${root}/input`],
      files: [`${root}/a.jpg`],
    })
  })

  it('clearDatabase 会清空快照/元数据/任务与 app_state', async () => {
    const root = await createTempMediaRoot('mpx-db-clear-')
    roots.push(root)

    const snapshot = createLibrarySnapshotFixture({
      packageAbsolutePath: `${root}/pkg-fixture.zip`,
      directoryAbsolutePath: `${root}/gallery-fixture`,
      videoAbsolutePath: `${root}/video-fixture.mp4`,
    })
    const packageId = snapshot.image_packages[0]?.id
    const videoId = snapshot.videos[0]?.id
    if (!packageId || !videoId) {
      throw new Error('fixture ids missing')
    }

    const database = new MediaLibraryDatabase(root)
    disposers.push(() => database.dispose())
    database.replaceSnapshot(snapshot)
    database.writePackageGrade(packageId, 3)
    database.writeVideoCover(videoId, 'hsl(220, 44%, 40%)', null)
    database.upsertTask({
      taskId: 'task-clear',
      taskType: 'import',
      taskSource: 'dialog-files',
      sourcePaths: ['D:/clear.jpg'],
      status: 'running',
      progress: 0.5,
      processedCount: 1,
      totalCount: 2,
      message: null,
      errorDetail: null,
      createdAtMs: 1,
      updatedAtMs: 2,
    })
    database.writeAppState('ui', { theme: 'ocean' })

    database.clearDatabase()

    const clearedSnapshot = database.readSnapshot()
    expect(clearedSnapshot).toEqual({
      image_packages: [],
      image_directories: [],
      videos: [],
    })
    expect(database.readPackageGrades().size).toBe(0)
    expect(database.readVideoCovers().size).toBe(0)
    expect(database.readTasks()).toEqual([])
    expect(database.readAppState('ui', { theme: 'fallback' })).toEqual({ theme: 'fallback' })
  })

})
