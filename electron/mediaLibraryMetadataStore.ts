import type { SQLiteDatabaseLike } from './mediaLibraryDatabaseTypes'
import { parseJson } from './mediaLibraryStoreUtils'

function clampNonNegativeInt(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0
  }
  return Math.floor(value)
}

function clampNonNegativeNumber(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0
  }
  return value
}

function clampCompletionRatio(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.max(0, Math.min(1, value))
}

export class MediaLibraryMetadataStore {
  constructor(private readonly db: SQLiteDatabaseLike) {}

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
    const rows = this.db
      .prepare(
        `
          SELECT video_id, work_title, work_title_jpn, series_id, circle, circle_jpn, author, author_jpn, tags_json, grade, updated_at_ms
          FROM video_metadata
        `,
      )
      .all() as Array<{
      video_id: string
      work_title: string
      work_title_jpn: string
      series_id: string
      circle: string
      circle_jpn: string
      author: string
      author_jpn: string
      tags_json: string
      grade: number | null
      updated_at_ms: number
    }>

    return new Map(
      rows.map((row) => [
        row.video_id,
        {
          workTitle: row.work_title,
          workTitleJpn: row.work_title_jpn ?? '',
          seriesId: row.series_id,
          circle: row.circle,
          circleJpn: row.circle_jpn ?? '',
          author: row.author,
          authorJpn: row.author_jpn ?? '',
          tags: parseJson<string[]>(row.tags_json, []),
          grade: row.grade,
          updatedAtMs: row.updated_at_ms,
        },
      ]),
    )
  }

  readAudioMetadata(): Map<
    string,
    {
      album: string
      author: string
      trackTitle: string
      seriesId: string
      updatedAtMs: number
    }
  > {
    const rows = this.db
      .prepare(
        `
          SELECT audio_id, album, author, track_title, series_id, updated_at_ms
          FROM audio_metadata
        `,
      )
      .all() as Array<{
      audio_id: string
      album: string
      author: string
      track_title: string
      series_id: string
      updated_at_ms: number
    }>

    return new Map(
      rows.map((row) => [
        row.audio_id,
        {
          album: row.album,
          author: row.author,
          trackTitle: row.track_title,
          seriesId: row.series_id,
          updatedAtMs: row.updated_at_ms,
        },
      ]),
    )
  }

  readSourceExternalMetadata(): Map<
    string,
    {
      sourceSite: 'nhentai' | 'ehentai' | 'others'
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
    const rows = this.db
      .prepare(
        `
          SELECT
            source_id,
            source_site,
            source_url,
            source_remote_id,
            source_token,
            title,
            title_jpn,
            group_name,
            group_name_jpn,
            artist,
            artist_jpn,
            posted,
            rating,
            favorited,
            tags_json,
            raw_json,
            updated_at_ms
          FROM media_source_external_metadata
        `,
      )
      .all() as Array<{
      source_id: string
      source_site: 'nhentai' | 'ehentai' | 'others'
      source_url: string
      source_remote_id: string
      source_token: string
      title: string
      title_jpn: string
      group_name: string
      group_name_jpn: string
      artist: string
      artist_jpn: string
      posted: string
      rating: string | null
      favorited: string | null
      tags_json: string
      raw_json: string
      updated_at_ms: number
    }>

    return new Map(
      rows.map((row) => [
        row.source_id,
        {
          sourceSite: row.source_site,
          sourceUrl: row.source_url,
          sourceRemoteId: row.source_remote_id,
          sourceToken: row.source_token,
          title: row.title,
          titleJpn: row.title_jpn,
          groupName: row.group_name,
          groupNameJpn: row.group_name_jpn,
          artist: row.artist,
          artistJpn: row.artist_jpn,
          posted: row.posted,
          rating: row.rating,
          favorited: row.favorited,
          tags: parseJson<Record<string, string>>(row.tags_json, {}),
          rawJson: row.raw_json,
          updatedAtMs: row.updated_at_ms,
        },
      ]),
    )
  }

  readSourceCovers(): Map<string, { coverColor: string; coverImagePath: string | null; updatedAtMs: number }> {
    const rows = this.db
      .prepare(
        `
          SELECT source_id, cover_color, cover_image_path, updated_at_ms
          FROM media_source_cover
        `,
      )
      .all() as Array<{
      source_id: string
      cover_color: string
      cover_image_path: string | null
      updated_at_ms: number
    }>

    return new Map(
      rows.map((row) => [
        row.source_id,
        {
          coverColor: row.cover_color,
          coverImagePath: row.cover_image_path,
          updatedAtMs: row.updated_at_ms,
        },
      ]),
    )
  }

  readImagePreferenceMetrics(): Map<
    string,
    {
      eventCount: number
      pagesRead: number
      totalPages: number
      completionRatio: number
      lastEventTimeMs: number | null
      updatedAtMs: number
    }
  > {
    const rows = this.db
      .prepare(
        `
          SELECT source_id, event_count, pages_read, total_pages, completion_ratio, last_event_time_ms, updated_at_ms
          FROM image_preference_metrics
        `,
      )
      .all() as Array<{
      source_id: string
      event_count: number
      pages_read: number
      total_pages: number
      completion_ratio: number
      last_event_time_ms: number | null
      updated_at_ms: number
    }>

    return new Map(
      rows.map((row) => [
        row.source_id,
        {
          eventCount: row.event_count,
          pagesRead: row.pages_read,
          totalPages: row.total_pages,
          completionRatio: row.completion_ratio,
          lastEventTimeMs: row.last_event_time_ms,
          updatedAtMs: row.updated_at_ms,
        },
      ]),
    )
  }

  readVideoPreferenceMetrics(): Map<
    string,
    {
      eventCount: number
      watchSeconds: number
      totalSeconds: number
      completionRatio: number
      lastEventTimeMs: number | null
      updatedAtMs: number
    }
  > {
    const rows = this.db
      .prepare(
        `
          SELECT video_id, event_count, watch_seconds, total_seconds, completion_ratio, last_event_time_ms, updated_at_ms
          FROM video_preference_metrics
        `,
      )
      .all() as Array<{
      video_id: string
      event_count: number
      watch_seconds: number
      total_seconds: number
      completion_ratio: number
      last_event_time_ms: number | null
      updated_at_ms: number
    }>

    return new Map(
      rows.map((row) => [
        row.video_id,
        {
          eventCount: row.event_count,
          watchSeconds: row.watch_seconds,
          totalSeconds: row.total_seconds,
          completionRatio: row.completion_ratio,
          lastEventTimeMs: row.last_event_time_ms,
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
    this.db
      .prepare(
        `
          UPDATE media_source
          SET
            package_name = ?,
            display_name = ?,
            work_title = ?,
            series_id = ?,
            circle = ?,
            author = ?,
            tags_json = ?,
            updated_at_ms = ?
          WHERE id = ?
        `,
      )
      .run(
        payload.packageName,
        payload.displayName,
        payload.workTitle,
        payload.seriesId,
        payload.circle,
        payload.author,
        JSON.stringify(payload.tags),
        Date.now(),
        sourceId,
      )
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
    this.db
      .prepare(
        `
          INSERT INTO video_metadata (video_id, work_title, work_title_jpn, series_id, circle, circle_jpn, author, author_jpn, tags_json, grade, updated_at_ms)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(video_id) DO UPDATE SET
            work_title = excluded.work_title,
            work_title_jpn = excluded.work_title_jpn,
            series_id = excluded.series_id,
            circle = excluded.circle,
            circle_jpn = excluded.circle_jpn,
            author = excluded.author,
            author_jpn = excluded.author_jpn,
            tags_json = excluded.tags_json,
            grade = excluded.grade,
            updated_at_ms = excluded.updated_at_ms
        `,
      )
      .run(
        videoId,
        payload.workTitle,
        payload.workTitleJpn,
        payload.seriesId,
        payload.circle,
        payload.circleJpn,
        payload.author,
        payload.authorJpn,
        JSON.stringify(payload.tags),
        payload.grade,
        Date.now(),
      )
  }

  writeAudioMetadata(
    audioId: string,
    payload: {
      album: string
      author: string
      trackTitle: string
      seriesId: string
    },
  ): void {
    this.db
      .prepare(
        `
          INSERT INTO audio_metadata (audio_id, album, author, track_title, series_id, updated_at_ms)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(audio_id) DO UPDATE SET
            album = excluded.album,
            author = excluded.author,
            track_title = excluded.track_title,
            series_id = excluded.series_id,
            updated_at_ms = excluded.updated_at_ms
        `,
      )
      .run(audioId, payload.album, payload.author, payload.trackTitle, payload.seriesId, Date.now())
  }

  writeSourceExternalMetadata(
    sourceId: string,
    payload: {
      sourceSite: 'nhentai' | 'ehentai' | 'others'
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
    this.db
      .prepare(
        `
          INSERT INTO media_source_external_metadata (
            source_id,
            source_site,
            source_url,
            source_remote_id,
            source_token,
            title,
            title_jpn,
            group_name,
            group_name_jpn,
            artist,
            artist_jpn,
            posted,
            rating,
            favorited,
            tags_json,
            raw_json,
            updated_at_ms
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(source_id) DO UPDATE SET
            source_site = excluded.source_site,
            source_url = excluded.source_url,
            source_remote_id = excluded.source_remote_id,
            source_token = excluded.source_token,
            title = excluded.title,
            title_jpn = excluded.title_jpn,
            group_name = excluded.group_name,
            group_name_jpn = excluded.group_name_jpn,
            artist = excluded.artist,
            artist_jpn = excluded.artist_jpn,
            posted = excluded.posted,
            rating = excluded.rating,
            favorited = excluded.favorited,
            tags_json = excluded.tags_json,
            raw_json = excluded.raw_json,
            updated_at_ms = excluded.updated_at_ms
        `,
      )
      .run(
        sourceId,
        payload.sourceSite,
        payload.sourceUrl,
        payload.sourceRemoteId,
        payload.sourceToken,
        payload.title,
        payload.titleJpn,
        payload.groupName,
        payload.groupNameJpn,
        payload.artist,
        payload.artistJpn,
        payload.posted,
        payload.rating,
        payload.favorited,
        JSON.stringify(payload.tags),
        payload.rawJson,
        Date.now(),
      )
  }

  writeSourceCover(sourceId: string, coverColor: string, coverImagePath: string | null): void {
    this.db
      .prepare(
        `
          INSERT INTO media_source_cover (source_id, cover_color, cover_image_path, updated_at_ms)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(source_id) DO UPDATE SET
            cover_color = excluded.cover_color,
            cover_image_path = excluded.cover_image_path,
            updated_at_ms = excluded.updated_at_ms
        `,
      )
      .run(sourceId, coverColor, coverImagePath, Date.now())
  }

  writeImagePreferenceMetrics(
    sourceId: string,
    payload: {
      eventCount: number
      pagesRead: number
      totalPages: number
      completionRatio: number
      lastEventTimeMs: number | null
    },
  ): void {
    this.db
      .prepare(
        `
          INSERT INTO image_preference_metrics (
            source_id,
            event_count,
            pages_read,
            total_pages,
            completion_ratio,
            last_event_time_ms,
            updated_at_ms
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(source_id) DO UPDATE SET
            event_count = excluded.event_count,
            pages_read = excluded.pages_read,
            total_pages = excluded.total_pages,
            completion_ratio = excluded.completion_ratio,
            last_event_time_ms = excluded.last_event_time_ms,
            updated_at_ms = excluded.updated_at_ms
        `,
      )
      .run(
        sourceId,
        payload.eventCount,
        payload.pagesRead,
        payload.totalPages,
        payload.completionRatio,
        payload.lastEventTimeMs,
        Date.now(),
      )
  }

  writeVideoPreferenceMetrics(
    videoId: string,
    payload: {
      eventCount: number
      watchSeconds: number
      totalSeconds: number
      completionRatio: number
      lastEventTimeMs: number | null
    },
  ): void {
    this.db
      .prepare(
        `
          INSERT INTO video_preference_metrics (
            video_id,
            event_count,
            watch_seconds,
            total_seconds,
            completion_ratio,
            last_event_time_ms,
            updated_at_ms
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(video_id) DO UPDATE SET
            event_count = excluded.event_count,
            watch_seconds = excluded.watch_seconds,
            total_seconds = excluded.total_seconds,
            completion_ratio = excluded.completion_ratio,
            last_event_time_ms = excluded.last_event_time_ms,
            updated_at_ms = excluded.updated_at_ms
        `,
      )
      .run(
        videoId,
        payload.eventCount,
        payload.watchSeconds,
        payload.totalSeconds,
        payload.completionRatio,
        payload.lastEventTimeMs,
        Date.now(),
      )
  }

  upsertImagePreferenceRuntime(
    payload: {
      sessionId: string
      sourceId: string
      startedAtMs: number
      lastCheckpointMs: number
      checkpointSeq: number
      pagesRead: number
      totalPages: number
      completionRatio: number
      isFullscreen: boolean
    },
  ): void {
    this.db
      .prepare(
        `
          INSERT INTO image_preference_runtime (
            session_id,
            source_id,
            started_at_ms,
            last_checkpoint_ms,
            checkpoint_seq,
            pages_read,
            total_pages,
            completion_ratio,
            is_fullscreen
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(session_id) DO UPDATE SET
            source_id = excluded.source_id,
            started_at_ms = excluded.started_at_ms,
            last_checkpoint_ms = excluded.last_checkpoint_ms,
            checkpoint_seq = excluded.checkpoint_seq,
            pages_read = excluded.pages_read,
            total_pages = excluded.total_pages,
            completion_ratio = excluded.completion_ratio,
            is_fullscreen = excluded.is_fullscreen
          WHERE excluded.checkpoint_seq >= image_preference_runtime.checkpoint_seq
        `,
      )
      .run(
        payload.sessionId,
        payload.sourceId,
        payload.startedAtMs,
        payload.lastCheckpointMs,
        payload.checkpointSeq,
        payload.pagesRead,
        payload.totalPages,
        payload.completionRatio,
        payload.isFullscreen ? 1 : 0,
      )
  }

  upsertVideoPreferenceRuntime(
    payload: {
      sessionId: string
      videoId: string
      startedAtMs: number
      lastCheckpointMs: number
      checkpointSeq: number
      watchSeconds: number
      totalSeconds: number
      completionRatio: number
      hadFullscreen: boolean
      lastVideoTime: number
    },
  ): void {
    this.db
      .prepare(
        `
          INSERT INTO video_preference_runtime (
            session_id,
            video_id,
            started_at_ms,
            last_checkpoint_ms,
            checkpoint_seq,
            watch_seconds,
            total_seconds,
            completion_ratio,
            had_fullscreen,
            last_video_time
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(session_id) DO UPDATE SET
            video_id = excluded.video_id,
            started_at_ms = excluded.started_at_ms,
            last_checkpoint_ms = excluded.last_checkpoint_ms,
            checkpoint_seq = excluded.checkpoint_seq,
            watch_seconds = excluded.watch_seconds,
            total_seconds = excluded.total_seconds,
            completion_ratio = excluded.completion_ratio,
            had_fullscreen = excluded.had_fullscreen,
            last_video_time = excluded.last_video_time
          WHERE excluded.checkpoint_seq >= video_preference_runtime.checkpoint_seq
        `,
      )
      .run(
        payload.sessionId,
        payload.videoId,
        payload.startedAtMs,
        payload.lastCheckpointMs,
        payload.checkpointSeq,
        payload.watchSeconds,
        payload.totalSeconds,
        payload.completionRatio,
        payload.hadFullscreen ? 1 : 0,
        payload.lastVideoTime,
      )
  }

  deleteImagePreferenceRuntime(sessionId: string): void {
    this.db
      .prepare(
        `
          DELETE FROM image_preference_runtime
          WHERE session_id = ?
        `,
      )
      .run(sessionId)
  }

  deleteVideoPreferenceRuntime(sessionId: string): void {
    this.db
      .prepare(
        `
          DELETE FROM video_preference_runtime
          WHERE session_id = ?
        `,
      )
      .run(sessionId)
  }

  recoverAllPreferenceRuntimeSessions(endReason: string): {
    imageRecovered: number
    videoRecovered: number
  } {
    const imageRows = this.db
      .prepare(
        `
          SELECT
            session_id,
            source_id,
            started_at_ms,
            last_checkpoint_ms,
            pages_read,
            total_pages,
            completion_ratio,
            is_fullscreen
          FROM image_preference_runtime
          ORDER BY last_checkpoint_ms ASC
        `,
      )
      .all() as Array<{
      session_id: string
      source_id: string
      started_at_ms: number
      last_checkpoint_ms: number
      pages_read: number
      total_pages: number
      completion_ratio: number
      is_fullscreen: number
    }>

    const videoRows = this.db
      .prepare(
        `
          SELECT
            session_id,
            video_id,
            started_at_ms,
            last_checkpoint_ms,
            watch_seconds,
            total_seconds,
            completion_ratio,
            had_fullscreen
          FROM video_preference_runtime
          ORDER BY last_checkpoint_ms ASC
        `,
      )
      .all() as Array<{
      session_id: string
      video_id: string
      started_at_ms: number
      last_checkpoint_ms: number
      watch_seconds: number
      total_seconds: number
      completion_ratio: number
      had_fullscreen: number
    }>

    let imageRecovered = 0
    let videoRecovered = 0

    const insertImageSession = this.db.prepare(
      `
        INSERT OR IGNORE INTO image_preference_sessions (
          session_id,
          source_id,
          started_at_ms,
          ended_at_ms,
          pages_read,
          total_pages,
          completion_ratio,
          is_fullscreen,
          end_reason
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    const insertVideoSession = this.db.prepare(
      `
        INSERT OR IGNORE INTO video_preference_sessions (
          session_id,
          video_id,
          started_at_ms,
          ended_at_ms,
          watch_seconds,
          total_seconds,
          completion_ratio,
          had_fullscreen,
          is_noise,
          end_reason
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )

    for (const row of imageRows) {
      const startedAtMs = clampNonNegativeInt(row.started_at_ms)
      const endedAtMs = Math.max(startedAtMs, clampNonNegativeInt(row.last_checkpoint_ms))
      const pagesRead = clampNonNegativeInt(row.pages_read)
      const totalPages = clampNonNegativeInt(row.total_pages)
      const completionRatio =
        totalPages > 0 ? clampCompletionRatio(pagesRead / totalPages) : clampCompletionRatio(row.completion_ratio)
      const insertResult = insertImageSession.run(
        row.session_id,
        row.source_id,
        startedAtMs,
        endedAtMs,
        pagesRead,
        totalPages,
        completionRatio,
        row.is_fullscreen > 0 ? 1 : 0,
        endReason,
      ) as { changes?: number }
      if ((insertResult.changes ?? 0) > 0) {
        imageRecovered += 1
        this.accumulateImagePreferenceMetric({
          sourceId: row.source_id,
          pagesRead,
          totalPages,
          endedAtMs,
        })
      }
      this.deleteImagePreferenceRuntime(row.session_id)
    }

    for (const row of videoRows) {
      const startedAtMs = clampNonNegativeInt(row.started_at_ms)
      const endedAtMs = Math.max(startedAtMs, clampNonNegativeInt(row.last_checkpoint_ms))
      const watchSeconds = clampNonNegativeNumber(row.watch_seconds)
      const totalSeconds = clampNonNegativeInt(row.total_seconds)
      const completionRatio =
        totalSeconds > 0 ? clampCompletionRatio(watchSeconds / totalSeconds) : clampCompletionRatio(row.completion_ratio)
      const hadFullscreen = row.had_fullscreen > 0
      const isNoise = !hadFullscreen && watchSeconds < 10
      const insertResult = insertVideoSession.run(
        row.session_id,
        row.video_id,
        startedAtMs,
        endedAtMs,
        watchSeconds,
        totalSeconds,
        completionRatio,
        hadFullscreen ? 1 : 0,
        isNoise ? 1 : 0,
        endReason,
      ) as { changes?: number }
      if ((insertResult.changes ?? 0) > 0) {
        videoRecovered += 1
        if (!isNoise) {
          this.accumulateVideoPreferenceMetric({
            videoId: row.video_id,
            watchSeconds,
            totalSeconds,
            endedAtMs,
          })
        }
      }
      this.deleteVideoPreferenceRuntime(row.session_id)
    }

    return {
      imageRecovered,
      videoRecovered,
    }
  }

  private accumulateImagePreferenceMetric(payload: {
    sourceId: string
    pagesRead: number
    totalPages: number
    endedAtMs: number
  }): void {
    this.db
      .prepare(
        `
          INSERT INTO image_preference_metrics (
            source_id,
            event_count,
            pages_read,
            total_pages,
            completion_ratio,
            last_event_time_ms,
            updated_at_ms
          )
          VALUES (?, 1, ?, ?, ?, ?, ?)
          ON CONFLICT(source_id) DO UPDATE SET
            event_count = image_preference_metrics.event_count + 1,
            pages_read = MAX(image_preference_metrics.pages_read, excluded.pages_read),
            total_pages = MAX(image_preference_metrics.total_pages, excluded.total_pages),
            completion_ratio = CASE
              WHEN MAX(image_preference_metrics.total_pages, excluded.total_pages) > 0 THEN
                MIN(
                  1,
                  CAST(MAX(image_preference_metrics.pages_read, excluded.pages_read) AS REAL)
                    / MAX(image_preference_metrics.total_pages, excluded.total_pages)
                )
              ELSE 0
            END,
            last_event_time_ms = MAX(
              COALESCE(image_preference_metrics.last_event_time_ms, 0),
              COALESCE(excluded.last_event_time_ms, 0)
            ),
            updated_at_ms = excluded.updated_at_ms
        `,
      )
      .run(
        payload.sourceId,
        payload.pagesRead,
        payload.totalPages,
        payload.totalPages > 0 ? clampCompletionRatio(payload.pagesRead / payload.totalPages) : 0,
        payload.endedAtMs,
        Date.now(),
      )
  }

  private accumulateVideoPreferenceMetric(payload: {
    videoId: string
    watchSeconds: number
    totalSeconds: number
    endedAtMs: number
  }): void {
    this.db
      .prepare(
        `
          INSERT INTO video_preference_metrics (
            video_id,
            event_count,
            watch_seconds,
            total_seconds,
            completion_ratio,
            last_event_time_ms,
            updated_at_ms
          )
          VALUES (?, 1, ?, ?, ?, ?, ?)
          ON CONFLICT(video_id) DO UPDATE SET
            event_count = video_preference_metrics.event_count + 1,
            watch_seconds = video_preference_metrics.watch_seconds + excluded.watch_seconds,
            total_seconds = MAX(video_preference_metrics.total_seconds, excluded.total_seconds),
            completion_ratio = CASE
              WHEN MAX(video_preference_metrics.total_seconds, excluded.total_seconds) > 0 THEN
                MIN(
                  1,
                  (video_preference_metrics.watch_seconds + excluded.watch_seconds)
                    / MAX(video_preference_metrics.total_seconds, excluded.total_seconds)
                )
              ELSE 0
            END,
            last_event_time_ms = MAX(
              COALESCE(video_preference_metrics.last_event_time_ms, 0),
              COALESCE(excluded.last_event_time_ms, 0)
            ),
            updated_at_ms = excluded.updated_at_ms
        `,
      )
      .run(
        payload.videoId,
        payload.watchSeconds,
        payload.totalSeconds,
        payload.totalSeconds > 0 ? clampCompletionRatio(payload.watchSeconds / payload.totalSeconds) : 0,
        payload.endedAtMs,
        Date.now(),
      )
  }

  insertImagePreferenceSession(
    payload: {
      sessionId: string
      sourceId: string
      startedAtMs: number
      endedAtMs: number
      pagesRead: number
      totalPages: number
      completionRatio: number
      isFullscreen: boolean
      endReason: string
    },
  ): void {
    this.db
      .prepare(
        `
          INSERT OR REPLACE INTO image_preference_sessions (
            session_id,
            source_id,
            started_at_ms,
            ended_at_ms,
            pages_read,
            total_pages,
            completion_ratio,
            is_fullscreen,
            end_reason
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        payload.sessionId,
        payload.sourceId,
        payload.startedAtMs,
        payload.endedAtMs,
        payload.pagesRead,
        payload.totalPages,
        payload.completionRatio,
        payload.isFullscreen ? 1 : 0,
        payload.endReason,
      )
  }

  insertVideoPreferenceSession(
    payload: {
      sessionId: string
      videoId: string
      startedAtMs: number
      endedAtMs: number
      watchSeconds: number
      totalSeconds: number
      completionRatio: number
      hadFullscreen: boolean
      isNoise: boolean
      endReason: string
    },
  ): void {
    this.db
      .prepare(
        `
          INSERT OR REPLACE INTO video_preference_sessions (
            session_id,
            video_id,
            started_at_ms,
            ended_at_ms,
            watch_seconds,
            total_seconds,
            completion_ratio,
            had_fullscreen,
            is_noise,
            end_reason
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        payload.sessionId,
        payload.videoId,
        payload.startedAtMs,
        payload.endedAtMs,
        payload.watchSeconds,
        payload.totalSeconds,
        payload.completionRatio,
        payload.hadFullscreen ? 1 : 0,
        payload.isNoise ? 1 : 0,
        payload.endReason,
      )
  }
}
