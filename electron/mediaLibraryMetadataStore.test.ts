import { afterEach, describe, expect, it } from 'vitest'

import { MediaLibraryMetadataStore } from './mediaLibraryMetadataStore'
import { cleanupTempMediaRoot, createTempMediaRoot } from './test-utils/mediaLibraryFixtures'
import { openMigratedSqliteDatabase } from './test-utils/sqliteHarness'

function seedSource(db: { prepare: (sql: string) => { run: (...params: unknown[]) => unknown } }, sourceId: string): void {
  db.prepare(
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
      ) VALUES (?, 'package', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    sourceId,
    'seed.zip',
    'seed',
    'D:/seed.zip',
    JSON.stringify(['seed.zip']),
    'seed',
    '未知',
    '未知',
    JSON.stringify([]),
    1,
    Date.now(),
  )
}

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
    'seed.mp4',
    'D:/seed.mp4',
    JSON.stringify(['seed.mp4']),
    5,
    1280,
    720,
    64,
    JSON.stringify({
      kind: 'filesystem',
      absolute_path: 'D:/seed.mp4',
      extension: '.mp4',
      media_type: 'video',
      mime_type: 'video/mp4',
    }),
    1,
    Date.now(),
  )
}

function seedAudio(db: { prepare: (sql: string) => { run: (...params: unknown[]) => unknown } }, audioId: string): void {
  db.prepare(
    `
      INSERT INTO audio_item (
        id,
        file_name,
        absolute_path,
        tree_path_json,
        duration_sec,
        size_mb,
        album,
        author,
        track_title,
        series_id,
        media_locator_json,
        last_seen_revision,
        updated_at_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    audioId,
    'seed.mp3',
    'D:/seed.mp3',
    JSON.stringify(['seed.mp3']),
    5,
    8,
    '',
    '',
    'seed',
    '',
    JSON.stringify({
      kind: 'filesystem',
      absolute_path: 'D:/seed.mp3',
      extension: '.mp3',
      media_type: 'audio',
      mime_type: 'audio/mpeg',
    }),
    1,
    Date.now(),
  )
}

describe('MediaLibraryMetadataStore', () => {
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

  it('可写入并读取评分与 source 元数据', async () => {
    const root = await createTempMediaRoot('mpx-metadata-grade-')
    roots.push(root)

    const harness = openMigratedSqliteDatabase(root)
    closers.push(harness.close)
    seedSource(harness.db, 'pkg-1')

    const store = new MediaLibraryMetadataStore(harness.db)

    store.writePackageGrade('pkg-1', 4)
    store.writePackageGrade('pkg-1', null)
    store.writeSourceMetadata('pkg-1', {
      packageName: 'renamed.zip',
      displayName: 'renamed',
      workTitle: '新作标题',
      seriesId: 'series-source-001',
      circle: '新社团',
      author: '新作者',
      tags: ['a', 'b'],
    })

    const gradeMap = store.readPackageGrades()
    expect(gradeMap.get('pkg-1')).toBeNull()

    const sourceRow = harness.db
      .prepare('SELECT package_name, display_name, work_title, series_id, circle, author, tags_json FROM media_source WHERE id = ?')
      .get('pkg-1') as
      | {
          package_name: string
          display_name: string
          work_title: string
          series_id: string
          circle: string
          author: string
          tags_json: string
        }
      | undefined

    expect(sourceRow).toEqual({
      package_name: 'renamed.zip',
      display_name: 'renamed',
      work_title: '新作标题',
      series_id: 'series-source-001',
      circle: '新社团',
      author: '新作者',
      tags_json: JSON.stringify(['a', 'b']),
    })
  })

  it('可写入并读取视频封面与视频元数据，异常 tags_json 回退为空数组', async () => {
    const root = await createTempMediaRoot('mpx-metadata-video-')
    roots.push(root)

    const harness = openMigratedSqliteDatabase(root)
    closers.push(harness.close)
    seedVideo(harness.db, 'video-1')

    const store = new MediaLibraryMetadataStore(harness.db)
    store.writeVideoCover('video-1', 'hsl(100, 40%, 40%)', 'D:/covers/seed.webp')
    store.writeVideoMetadata('video-1', {
      workTitle: '视频标题',
      workTitleJpn: 'ビデオタイトル',
      seriesId: 'series-video-001',
      circle: '视频社团',
      circleJpn: 'ビデオサークル',
      author: '视频作者',
      authorJpn: 'ビデオ作者',
      tags: ['tag-1', 'tag-2'],
      grade: 5,
    })

    const coverMap = store.readVideoCovers()
    const metadataMap = store.readVideoMetadata()

    expect(coverMap.get('video-1')).toMatchObject({
      coverColor: 'hsl(100, 40%, 40%)',
      coverImagePath: 'D:/covers/seed.webp',
    })
    expect(metadataMap.get('video-1')).toMatchObject({
      workTitle: '视频标题',
      workTitleJpn: 'ビデオタイトル',
      seriesId: 'series-video-001',
      circle: '视频社团',
      circleJpn: 'ビデオサークル',
      author: '视频作者',
      authorJpn: 'ビデオ作者',
      tags: ['tag-1', 'tag-2'],
      grade: 5,
    })

    harness.db.prepare('UPDATE video_metadata SET tags_json = ? WHERE video_id = ?').run('bad-json', 'video-1')
    const fallbackMetadata = store.readVideoMetadata()
    expect(fallbackMetadata.get('video-1')?.tags).toEqual([])
  })

  it('可写入并读取音频元数据', async () => {
    const root = await createTempMediaRoot('mpx-metadata-audio-')
    roots.push(root)

    const harness = openMigratedSqliteDatabase(root)
    closers.push(harness.close)
    seedAudio(harness.db, 'audio-1')

    const store = new MediaLibraryMetadataStore(harness.db)
    store.writeAudioMetadata('audio-1', {
      album: '专辑-A',
      author: '作者-B',
      trackTitle: '曲目-C',
      seriesId: 'series-audio-001',
    })

    const metadataMap = store.readAudioMetadata()
    expect(metadataMap.get('audio-1')).toMatchObject({
      album: '专辑-A',
      author: '作者-B',
      trackTitle: '曲目-C',
      seriesId: 'series-audio-001',
    })
  })
})
