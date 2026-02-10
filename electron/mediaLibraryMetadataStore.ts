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
    { workTitle: string; circle: string; author: string; tags: string[]; grade: number | null; updatedAtMs: number }
  > {
    const rows = this.db
      .prepare(
        `
          SELECT video_id, work_title, circle, author, tags_json, grade, updated_at_ms
          FROM video_metadata
        `,
      )
      .all() as Array<{
      video_id: string
      work_title: string
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
          circle: row.circle,
          author: row.author,
          tags: parseJson<string[]>(row.tags_json, []),
          grade: row.grade,
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
      circle: string
      author: string
      tags: string[]
      grade: number | null
    },
  ): void {
    this.db
      .prepare(
        `
          INSERT INTO video_metadata (video_id, work_title, circle, author, tags_json, grade, updated_at_ms)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(video_id) DO UPDATE SET
            work_title = excluded.work_title,
            circle = excluded.circle,
            author = excluded.author,
            tags_json = excluded.tags_json,
            grade = excluded.grade,
            updated_at_ms = excluded.updated_at_ms
        `,
      )
      .run(videoId, payload.workTitle, payload.circle, payload.author, JSON.stringify(payload.tags), payload.grade, Date.now())
  }
}
