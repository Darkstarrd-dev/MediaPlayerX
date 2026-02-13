import type { SQLiteDatabaseLike } from './mediaLibraryDatabaseTypes'
import { parseJson } from './mediaLibraryStoreUtils'

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
      seriesId: string
      circle: string
      author: string
      tags: string[]
      grade: number | null
      updatedAtMs: number
    }
  > {
    const rows = this.db
      .prepare(
        `
          SELECT video_id, work_title, series_id, circle, author, tags_json, grade, updated_at_ms
          FROM video_metadata
        `,
      )
      .all() as Array<{
      video_id: string
      work_title: string
      series_id: string
      circle: string
      author: string
      tags_json: string
      grade: number | null
      updated_at_ms: number
    }>

    return new Map(
      rows.map((row) => [
        row.video_id,
        {
          workTitle: row.work_title,
          seriesId: row.series_id,
          circle: row.circle,
          author: row.author,
          tags: parseJson<string[]>(row.tags_json, []),
          grade: row.grade,
          updatedAtMs: row.updated_at_ms,
        },
      ]),
    )
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
      seriesId: string
      circle: string
      author: string
      tags: string[]
      grade: number | null
    },
  ): void {
    this.db
      .prepare(
        `
          INSERT INTO video_metadata (video_id, work_title, series_id, circle, author, tags_json, grade, updated_at_ms)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(video_id) DO UPDATE SET
            work_title = excluded.work_title,
            series_id = excluded.series_id,
            circle = excluded.circle,
            author = excluded.author,
            tags_json = excluded.tags_json,
            grade = excluded.grade,
            updated_at_ms = excluded.updated_at_ms
        `,
      )
      .run(
        videoId,
        payload.workTitle,
        payload.seriesId,
        payload.circle,
        payload.author,
        JSON.stringify(payload.tags),
        payload.grade,
        Date.now(),
      )
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
}
