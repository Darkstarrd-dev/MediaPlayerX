import { afterEach, describe, expect, it } from 'vitest'

import { MediaLibraryDatabase } from './mediaLibraryDatabase'
import {
  cleanupTempMediaRoot,
  createLibrarySnapshotFixture,
  createTempMediaRoot,
} from './test-utils/mediaLibraryFixtures'
import { openRawSqliteDatabase } from './test-utils/sqliteHarness'

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
      audioAbsolutePath: `${root}/audio-fixture.mp3`,
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
      workTitleJpn: 'ビデオタイトル',
      seriesId: 'series-db-001',
      circle: '视频社团',
      circleJpn: 'ビデオサークル',
      author: '视频作者',
      authorJpn: 'ビデオ作者',
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
    expect(restoredSnapshot.audios).toHaveLength(1)

    expect(restarted.readPackageGrades().get(packageId)).toBe(5)
    expect(restarted.readVideoCovers().get(videoId)).toMatchObject({
      coverColor: 'hsl(210, 44%, 40%)',
      coverImagePath: `${root}/covers/video-fixture.webp`,
    })
    expect(restarted.readVideoMetadata().get(videoId)).toMatchObject({
      workTitle: '视频标题',
      workTitleJpn: 'ビデオタイトル',
      seriesId: 'series-db-001',
      circle: '视频社团',
      circleJpn: 'ビデオサークル',
      author: '视频作者',
      authorJpn: 'ビデオ作者',
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
      audioAbsolutePath: `${root}/audio-fixture.mp3`,
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
      audios: [],
    })
    expect(database.readPackageGrades().size).toBe(0)
    expect(database.readVideoCovers().size).toBe(0)
    expect(database.readTasks()).toEqual([])
    expect(database.readAppState('ui', { theme: 'fallback' })).toEqual({ theme: 'fallback' })
  })

  it('数据库重启时会恢复 runtime 会话并清空 runtime 表', async () => {
    const root = await createTempMediaRoot('mpx-db-pref-runtime-recover-')
    roots.push(root)

    const snapshot = createLibrarySnapshotFixture({
      packageAbsolutePath: `${root}/pkg-runtime.zip`,
      directoryAbsolutePath: `${root}/gallery-runtime`,
      videoAbsolutePath: `${root}/video-runtime.mp4`,
      audioAbsolutePath: `${root}/audio-runtime.mp3`,
    })
    const sourceId = snapshot.image_packages[0]?.id
    const videoId = snapshot.videos[0]?.id
    const totalPages = snapshot.image_packages[0]?.images.length ?? 0
    if (!sourceId || !videoId || totalPages <= 0) {
      throw new Error('runtime fixture ids missing')
    }

    const database = new MediaLibraryDatabase(root)
    disposers.push(() => database.dispose())
    database.replaceSnapshot(snapshot)

    database.upsertImagePreferenceRuntime({
      sessionId: 'img-runtime-1',
      sourceId,
      startedAtMs: 1_739_500_000_000,
      lastCheckpointMs: 1_739_500_010_000,
      checkpointSeq: 3,
      pagesRead: 5,
      totalPages,
      completionRatio: 0.5,
      isFullscreen: true,
    })
    database.upsertVideoPreferenceRuntime({
      sessionId: 'vid-runtime-1',
      videoId,
      startedAtMs: 1_739_500_020_000,
      lastCheckpointMs: 1_739_500_040_000,
      checkpointSeq: 4,
      watchSeconds: 16,
      totalSeconds: Math.max(1, snapshot.videos[0]?.duration_sec ?? 120),
      completionRatio: 0.2,
      hadFullscreen: false,
      lastVideoTime: 16,
    })

    database.dispose()
    disposers.pop()

    const restarted = new MediaLibraryDatabase(root)
    disposers.push(() => restarted.dispose())

    expect(restarted.readImagePreferenceMetrics().get(sourceId)).toMatchObject({
      eventCount: 1,
      pagesRead: 5,
    })
    expect(restarted.readVideoPreferenceMetrics().get(videoId)).toMatchObject({
      eventCount: 1,
      watchSeconds: 16,
    })

    const raw = openRawSqliteDatabase(root)
    try {
      const imageRuntimeCount = raw.db
        .prepare('SELECT COUNT(*) AS count FROM image_preference_runtime')
        .get() as { count: number }
      const videoRuntimeCount = raw.db
        .prepare('SELECT COUNT(*) AS count FROM video_preference_runtime')
        .get() as { count: number }
      const imageSession = raw.db
        .prepare('SELECT end_reason FROM image_preference_sessions WHERE session_id = ?')
        .get('img-runtime-1') as { end_reason: string } | undefined
      const videoSession = raw.db
        .prepare('SELECT end_reason FROM video_preference_sessions WHERE session_id = ?')
        .get('vid-runtime-1') as { end_reason: string } | undefined

      expect(imageRuntimeCount.count).toBe(0)
      expect(videoRuntimeCount.count).toBe(0)
      expect(imageSession?.end_reason).toBe('recovered-after-crash')
      expect(videoSession?.end_reason).toBe('recovered-after-crash')
    } finally {
      raw.close()
    }
  })

})
