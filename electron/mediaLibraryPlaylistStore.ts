import type { SQLiteDatabaseLike, TransactionRunner } from './mediaLibraryDatabaseTypes'

export class MediaLibraryPlaylistStore {
  constructor(
    private readonly db: SQLiteDatabaseLike,
    private readonly runInTransaction: TransactionRunner,
  ) {}

  readPlaylist(): string[] {
    const rows = this.db
      .prepare(
        `
          SELECT video_id
          FROM playlist_entry
          ORDER BY sort_index ASC
        `,
      )
      .all() as Array<{ video_id: string }>
    return rows.map((row) => row.video_id)
  }

  writePlaylist(videoIds: string[]): string[] {
    const normalized = Array.from(new Set(videoIds.filter((id) => id.trim().length > 0)))
    const existsVideo = this.db.prepare('SELECT 1 AS present FROM video_item WHERE id = ?')

    const filtered = normalized.filter((videoId) => {
      const row = existsVideo.get(videoId) as { present?: number } | undefined
      return Boolean(row?.present)
    })

    const insert = this.db.prepare(
      `
        INSERT INTO playlist_entry (video_id, sort_index, updated_at_ms)
        VALUES (?, ?, ?)
      `,
    )
    const clear = this.db.prepare('DELETE FROM playlist_entry')

    this.runInTransaction(() => {
      clear.run()
      const now = Date.now()
      for (let index = 0; index < filtered.length; index += 1) {
        insert.run(filtered[index], index, now)
      }
    })
    return filtered
  }
}
