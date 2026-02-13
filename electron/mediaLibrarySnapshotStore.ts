import path from 'node:path'

import {
  librarySnapshotDtoSchema,
  type ImageItemDto,
  type ImagePackageDto,
  type LibrarySnapshotDto,
  type MediaLocatorDto,
  type VideoItemDto,
} from '../src/contracts/backend'
import { isPathInsideRoot, normalizeAllowlistKey } from './fileSystemServiceHelpers'
import type { SQLiteDatabaseLike, TransactionRunner } from './mediaLibraryDatabaseTypes'
import { type ImageRow, parseJson, type SourceRow, type VideoRow } from './mediaLibraryStoreUtils'

export class MediaLibrarySnapshotStore {
  constructor(
    private readonly db: SQLiteDatabaseLike,
    private readonly runInTransaction: TransactionRunner,
  ) {}

  replaceSnapshot(snapshot: LibrarySnapshotDto): void {
    const revision = Date.now()

    const upsertSource = this.db.prepare(
      `
        INSERT INTO media_source (
          id,
          source_type,
          package_name,
          display_name,
          absolute_path,
          tree_path_json,
          work_title,
          series_id,
          circle,
          author,
          tags_json,
          last_seen_revision,
          updated_at_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          source_type = excluded.source_type,
          package_name = media_source.package_name,
          display_name = media_source.display_name,
          absolute_path = excluded.absolute_path,
          tree_path_json = excluded.tree_path_json,
          work_title = media_source.work_title,
          series_id = media_source.series_id,
          circle = media_source.circle,
          author = media_source.author,
          tags_json = media_source.tags_json,
          last_seen_revision = excluded.last_seen_revision,
          updated_at_ms = excluded.updated_at_ms
      `,
    )

    const upsertImage = this.db.prepare(
      `
        INSERT INTO image_item (
          id,
          source_id,
          ordinal,
          width,
          height,
          size_kb,
          cluster,
          color,
          feature_vector_json,
          media_locator_json,
          hidden,
          last_seen_revision,
          updated_at_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          source_id = excluded.source_id,
          ordinal = excluded.ordinal,
          width = excluded.width,
          height = excluded.height,
          size_kb = excluded.size_kb,
          cluster = excluded.cluster,
          color = excluded.color,
          feature_vector_json = excluded.feature_vector_json,
          media_locator_json = excluded.media_locator_json,
          hidden = image_item.hidden,
          last_seen_revision = excluded.last_seen_revision,
          updated_at_ms = excluded.updated_at_ms
      `,
    )

    const upsertVideo = this.db.prepare(
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
        ON CONFLICT(id) DO UPDATE SET
          file_name = excluded.file_name,
          absolute_path = excluded.absolute_path,
          tree_path_json = excluded.tree_path_json,
          duration_sec = excluded.duration_sec,
          width = excluded.width,
          height = excluded.height,
          size_mb = excluded.size_mb,
          media_locator_json = excluded.media_locator_json,
          last_seen_revision = excluded.last_seen_revision,
          updated_at_ms = excluded.updated_at_ms
      `,
    )

    const deleteStaleImagesBySource = this.db.prepare(
      `
        DELETE FROM image_item
        WHERE source_id = ? AND last_seen_revision <> ?
      `,
    )

    const deleteStaleSources = this.db.prepare(
      `
        DELETE FROM media_source
        WHERE last_seen_revision <> ?
      `,
    )

    const deleteStaleVideos = this.db.prepare(
      `
        DELETE FROM video_item
        WHERE last_seen_revision <> ?
      `,
    )

    this.runInTransaction(() => {
      const now = Date.now()

      const allSources: Array<{ sourceType: 'package' | 'directory'; source: ImagePackageDto }> = [
        ...snapshot.image_packages.map((source) => ({ sourceType: 'package' as const, source })),
        ...snapshot.image_directories.map((source) => ({ sourceType: 'directory' as const, source })),
      ]

      for (const item of allSources) {
        const source = item.source
        upsertSource.run(
          source.id,
          item.sourceType,
          source.package_name,
          source.display_name,
          source.absolute_path,
          JSON.stringify(source.tree_path),
          source.work_title,
          source.series_id ?? '',
          source.circle,
          source.author,
          JSON.stringify(source.tags),
          revision,
          now,
        )

        for (const image of source.images) {
          const imageVector = (image as { feature_vector?: unknown }).feature_vector
          upsertImage.run(
            image.id,
            source.id,
            image.ordinal,
            image.width,
            image.height,
            image.size_kb,
            image.cluster,
            image.color,
            JSON.stringify(Array.isArray(imageVector) ? imageVector : []),
            JSON.stringify(image.media_locator),
            image.hidden ? 1 : 0,
            revision,
            now,
          )
        }

        deleteStaleImagesBySource.run(source.id, revision)
      }

      for (const video of snapshot.videos) {
        upsertVideo.run(
          video.id,
          video.file_name,
          video.absolute_path,
          JSON.stringify(video.tree_path),
          video.duration_sec,
          video.width,
          video.height,
          video.size_mb,
          JSON.stringify(video.media_locator),
          revision,
          now,
        )
      }

      deleteStaleSources.run(revision)
      deleteStaleVideos.run(revision)
    })
  }

  readSnapshot(): LibrarySnapshotDto {
    const sourceRows = this.db
      .prepare(
        `
          SELECT
            source.id,
            source.source_type,
            source.package_name,
            source.display_name,
            source.absolute_path,
            source.tree_path_json,
            source.work_title,
            source.series_id,
            source.circle,
            source.author,
            source.tags_json,
            grade.grade AS mock_grade,
            external.source_site,
            external.source_url,
            external.source_remote_id,
            external.source_token,
            external.title AS external_title,
            external.title_jpn,
            external.group_name,
            external.group_name_jpn,
            external.artist,
            external.artist_jpn,
            external.posted,
            external.rating,
            external.favorited,
            external.tags_json AS external_tags_json,
            external.raw_json AS external_raw_json,
            source_cover.cover_color AS source_cover_color,
            source_cover.cover_image_path AS source_cover_image_path,
            source_cover.updated_at_ms AS source_cover_updated_at_ms
          FROM media_source AS source
          LEFT JOIN package_grade AS grade ON grade.source_id = source.id
          LEFT JOIN media_source_external_metadata AS external ON external.source_id = source.id
          LEFT JOIN media_source_cover AS source_cover ON source_cover.source_id = source.id
          ORDER BY source.absolute_path COLLATE NOCASE
        `,
      )
      .all() as SourceRow[]

    const readImagesBySource = this.db.prepare(
      `
        SELECT
          id,
          ordinal,
          width,
          height,
          size_kb,
          cluster,
          color,
          feature_vector_json,
          media_locator_json,
          hidden
        FROM image_item
        WHERE source_id = ?
        ORDER BY ordinal ASC
      `,
    )

    const imagePackages: ImagePackageDto[] = []
    const imageDirectories: ImagePackageDto[] = []

    for (const row of sourceRows) {
      const imageRows = readImagesBySource.all(row.id) as ImageRow[]
      const images: ImageItemDto[] = imageRows.map((imageRow) => ({
        id: imageRow.id,
        ordinal: imageRow.ordinal,
        width: imageRow.width,
        height: imageRow.height,
        size_kb: imageRow.size_kb,
        cluster: imageRow.cluster,
        color: imageRow.color,
        feature_vector: parseJson<number[]>(imageRow.feature_vector_json, []),
        media_locator: parseJson<MediaLocatorDto>(imageRow.media_locator_json, {
          kind: 'filesystem',
          absolute_path: '',
          extension: '.jpg',
          media_type: 'image',
          mime_type: 'image/jpeg',
        }),
        hidden: imageRow.hidden !== 0,
      }))

      const source: ImagePackageDto = {
        id: row.id,
        package_name: row.package_name,
        display_name: row.display_name,
        absolute_path: row.absolute_path,
        tree_path: parseJson<string[]>(row.tree_path_json, [row.display_name]),
        work_title: row.work_title,
        series_id: row.series_id ?? '',
        circle: row.circle,
        author: row.author,
        tags: parseJson<string[]>(row.tags_json, []),
        mock_grade: row.mock_grade,
        external_metadata:
          row.source_site && row.source_url && row.source_remote_id
            ? {
                source_site: row.source_site,
                source_url: row.source_url,
                source_remote_id: row.source_remote_id,
                source_token: row.source_token ?? '',
                title: row.external_title ?? '',
                title_jpn: row.title_jpn ?? '',
                group_name: row.group_name ?? '',
                group_name_jpn: row.group_name_jpn ?? '',
                artist: row.artist ?? '',
                artist_jpn: row.artist_jpn ?? '',
                posted: row.posted ?? '',
                rating: row.rating,
                favorited: row.favorited,
                tags: parseJson<Record<string, string>>(row.external_tags_json ?? '{}', {}),
                raw_json: row.external_raw_json ?? '{}',
              }
            : null,
        source_cover:
          row.source_cover_color && row.source_cover_updated_at_ms
            ? {
                cover_color: row.source_cover_color,
                cover_image_path: row.source_cover_image_path,
                updated_at_ms: row.source_cover_updated_at_ms,
              }
            : null,
        images,
      }

      if (row.source_type === 'package') {
        imagePackages.push(source)
      } else {
        imageDirectories.push(source)
      }
    }

    const videoRows = this.db
      .prepare(
        `
          SELECT
            video.id,
            video.file_name,
            video.absolute_path,
            video.tree_path_json,
            video.duration_sec,
            video.width,
            video.height,
            video.size_mb,
            video.media_locator_json,
            cover.cover_color,
            cover.cover_image_path,
            metadata.work_title,
            metadata.series_id,
            metadata.circle,
            metadata.author,
            metadata.tags_json,
            metadata.grade
          FROM video_item AS video
          LEFT JOIN video_cover AS cover ON cover.video_id = video.id
          LEFT JOIN video_metadata AS metadata ON metadata.video_id = video.id
          ORDER BY video.absolute_path COLLATE NOCASE
        `,
      )
      .all() as VideoRow[]

    const videos: VideoItemDto[] = videoRows.map((row) => {
      const defaultWorkTitle = row.file_name.replace(/\.[^./\\]+$/, '')
      return {
        id: row.id,
        file_name: row.file_name,
        absolute_path: row.absolute_path,
        tree_path: parseJson<string[]>(row.tree_path_json, [row.file_name]),
        duration_sec: row.duration_sec,
        width: row.width,
        height: row.height,
        size_mb: row.size_mb,
        cover_color: row.cover_color ?? 'hsl(0, 0%, 36%)',
        cover_image_path: row.cover_image_path,
        work_title: row.work_title && row.work_title.trim().length > 0 ? row.work_title : defaultWorkTitle,
        series_id: row.series_id ?? '',
        circle: row.circle && row.circle.trim().length > 0 ? row.circle : '未知',
        author: row.author && row.author.trim().length > 0 ? row.author : '未知',
        tags: row.tags_json ? parseJson<string[]>(row.tags_json, []) : [],
        grade: row.grade,
        media_locator: parseJson<MediaLocatorDto>(row.media_locator_json, {
          kind: 'filesystem',
          absolute_path: row.absolute_path,
          extension: '.mp4',
          media_type: 'video',
          mime_type: 'video/mp4',
        }),
      }
    })

    return librarySnapshotDtoSchema.parse({
      image_packages: imagePackages,
      image_directories: imageDirectories,
      videos,
    })
  }

  setImagesHidden(imageIds: string[], hidden: boolean): number {
    const normalizedIds = Array.from(new Set(imageIds.map((value) => value.trim()).filter(Boolean)))
    if (normalizedIds.length === 0) {
      return 0
    }

    const update = this.db.prepare(
      `
        UPDATE image_item
        SET hidden = ?, updated_at_ms = ?
        WHERE id = ?
      `,
    )

    const updatedAtMs = Date.now()
    let touched = 0
    this.runInTransaction(() => {
      for (const imageId of normalizedIds) {
        const result = update.run(hidden ? 1 : 0, updatedAtMs, imageId) as { changes?: number } | undefined
        if ((result?.changes ?? 0) > 0) {
          touched += 1
        }
      }
    })

    return touched
  }

  deleteImageItems(imageIds: string[]): { deletedCount: number; touchedSourceIds: string[] } {
    const normalizedIds = Array.from(new Set(imageIds.map((value) => value.trim()).filter(Boolean)))
    if (normalizedIds.length === 0) {
      return {
        deletedCount: 0,
        touchedSourceIds: [],
      }
    }

    const selectImageSource = this.db.prepare(
      `
        SELECT source_id
        FROM image_item
        WHERE id = ?
      `,
    )
    const deleteImage = this.db.prepare(
      `
        DELETE FROM image_item
        WHERE id = ?
      `,
    )
    const selectImagesBySource = this.db.prepare(
      `
        SELECT id, ordinal
        FROM image_item
        WHERE source_id = ?
        ORDER BY ordinal ASC
      `,
    )
    const updateImageOrdinal = this.db.prepare(
      `
        UPDATE image_item
        SET ordinal = ?, updated_at_ms = ?
        WHERE id = ?
      `,
    )
    const deleteEmptySource = this.db.prepare(
      `
        DELETE FROM media_source
        WHERE id = ?
          AND NOT EXISTS (
            SELECT 1
            FROM image_item
            WHERE source_id = ?
          )
      `,
    )

    let deletedCount = 0
    const touchedSourceIds = new Set<string>()
    this.runInTransaction(() => {
      for (const imageId of normalizedIds) {
        const sourceRow = selectImageSource.get(imageId) as { source_id?: string } | undefined
        if (!sourceRow?.source_id) {
          continue
        }

        touchedSourceIds.add(sourceRow.source_id)
        const result = deleteImage.run(imageId) as { changes?: number } | undefined
        deletedCount += result?.changes ?? 0
      }

      const updatedAtMs = Date.now()
      for (const sourceId of touchedSourceIds) {
        const rows = selectImagesBySource.all(sourceId) as Array<{ id: string; ordinal: number }>
        for (let index = 0; index < rows.length; index += 1) {
          const row = rows[index]
          const nextOrdinal = index + 1
          if (row.ordinal === nextOrdinal) {
            continue
          }
          updateImageOrdinal.run(nextOrdinal, updatedAtMs, row.id)
        }

        deleteEmptySource.run(sourceId, sourceId)
      }
    })

    return {
      deletedCount,
      touchedSourceIds: Array.from(touchedSourceIds),
    }
  }

  deleteSnapshotEntriesByPaths(paths: string[]): { deletedSourceCount: number; deletedVideoCount: number } {
    const normalizedRoots = Array.from(new Set(paths.map((value) => path.resolve(value)).filter(Boolean)))
    if (normalizedRoots.length === 0) {
      return {
        deletedSourceCount: 0,
        deletedVideoCount: 0,
      }
    }

    const sourceRows = this.db
      .prepare(
        `
          SELECT id, absolute_path
          FROM media_source
        `,
      )
      .all() as Array<{ id: string; absolute_path: string }>
    const videoRows = this.db
      .prepare(
        `
          SELECT id, absolute_path
          FROM video_item
        `,
      )
      .all() as Array<{ id: string; absolute_path: string }>

    const matchesAnyRoot = (candidatePath: string): boolean => {
      const resolvedCandidate = path.resolve(candidatePath)
      return normalizedRoots.some(
        (rootPath) =>
          normalizeAllowlistKey(rootPath) === normalizeAllowlistKey(resolvedCandidate) ||
          isPathInsideRoot(rootPath, resolvedCandidate),
      )
    }

    const sourceIdsToDelete = sourceRows.filter((row) => matchesAnyRoot(row.absolute_path)).map((row) => row.id)
    const videoIdsToDelete = videoRows.filter((row) => matchesAnyRoot(row.absolute_path)).map((row) => row.id)

    if (sourceIdsToDelete.length === 0 && videoIdsToDelete.length === 0) {
      return {
        deletedSourceCount: 0,
        deletedVideoCount: 0,
      }
    }

    const deleteSourceById = this.db.prepare(
      `
        DELETE FROM media_source
        WHERE id = ?
      `,
    )
    const deleteVideoById = this.db.prepare(
      `
        DELETE FROM video_item
        WHERE id = ?
      `,
    )

    let deletedSourceCount = 0
    let deletedVideoCount = 0
    this.runInTransaction(() => {
      for (const sourceId of sourceIdsToDelete) {
        const result = deleteSourceById.run(sourceId) as { changes?: number } | undefined
        deletedSourceCount += result?.changes ?? 0
      }

      for (const videoId of videoIdsToDelete) {
        const result = deleteVideoById.run(videoId) as { changes?: number } | undefined
        deletedVideoCount += result?.changes ?? 0
      }
    })

    return {
      deletedSourceCount,
      deletedVideoCount,
    }
  }
}
