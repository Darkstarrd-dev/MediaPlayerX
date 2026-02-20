import path from 'node:path'

import {
  type AudioItemDto,
  librarySnapshotDtoSchema,
  type ImageItemDto,
  type ImagePackageDto,
  type LibrarySnapshotDto,
  type MediaLocatorDto,
  type VideoItemDto,
} from '../src/contracts/backend'
import { isPathInsideRoot, normalizeAllowlistKey, toAbsoluteTreePath } from './fileSystemServiceHelpers'
import type { SQLiteDatabaseLike, TransactionRunner } from './mediaLibraryDatabaseTypes'
import { type AudioRow, type ImageRow, parseJson, type SourceRow, type VideoRow } from './mediaLibraryStoreUtils'

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

    const selectVideoIdByAbsolutePath = this.db.prepare(
      `
        SELECT id
        FROM video_item
        WHERE absolute_path = ?
        LIMIT 1
      `,
    )

    const upsertAudio = this.db.prepare(
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
        ON CONFLICT(id) DO UPDATE SET
          file_name = excluded.file_name,
          absolute_path = excluded.absolute_path,
          tree_path_json = excluded.tree_path_json,
          duration_sec = excluded.duration_sec,
          size_mb = excluded.size_mb,
          album = excluded.album,
          author = excluded.author,
          track_title = excluded.track_title,
          series_id = excluded.series_id,
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

    const deleteStaleAudios = this.db.prepare(
      `
        DELETE FROM audio_item
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

        // Delete all existing images for this source before upserting new ones
        // to avoid UNIQUE(source_id, ordinal) constraint conflicts when ordinals change
        deleteStaleImagesBySource.run(source.id, revision)

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
      }

      for (const video of snapshot.videos) {
        const existingVideoIdRow = selectVideoIdByAbsolutePath.get(video.absolute_path) as { id?: string } | undefined
        const effectiveVideoId =
          typeof existingVideoIdRow?.id === 'string' && existingVideoIdRow.id.trim().length > 0
            ? existingVideoIdRow.id
            : video.id

        upsertVideo.run(
          effectiveVideoId,
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

      for (const audio of snapshot.audios ?? []) {
        upsertAudio.run(
          audio.id,
          audio.file_name,
          audio.absolute_path,
          JSON.stringify(audio.tree_path),
          audio.duration_sec,
          audio.size_mb,
          audio.album ?? '',
          audio.author ?? '',
          audio.track_title ?? '',
          audio.series_id ?? '',
          JSON.stringify(audio.media_locator),
          revision,
          now,
        )
      }

      deleteStaleSources.run(revision)
      deleteStaleVideos.run(revision)
      deleteStaleAudios.run(revision)
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
            metadata.work_title_jpn,
            metadata.series_id,
            metadata.circle,
            metadata.circle_jpn,
            metadata.author,
            metadata.author_jpn,
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
        work_title_jpn: row.work_title_jpn ?? '',
        series_id: row.series_id ?? '',
        circle: row.circle && row.circle.trim().length > 0 ? row.circle : '未知',
        circle_jpn: row.circle_jpn ?? '',
        author: row.author && row.author.trim().length > 0 ? row.author : '未知',
        author_jpn: row.author_jpn ?? '',
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

    const audioRows = this.db
      .prepare(
        `
          SELECT
            audio.id,
            audio.file_name,
            audio.absolute_path,
            audio.tree_path_json,
            audio.duration_sec,
            audio.size_mb,
            audio.album,
            audio.author,
            audio.track_title,
            audio.series_id,
            metadata.album AS metadata_album,
            metadata.author AS metadata_author,
            metadata.track_title AS metadata_track_title,
            metadata.series_id AS metadata_series_id,
            audio.media_locator_json
          FROM audio_item AS audio
          LEFT JOIN audio_metadata AS metadata ON metadata.audio_id = audio.id
          ORDER BY audio.absolute_path COLLATE NOCASE
        `,
      )
      .all() as AudioRow[]

    const audios: AudioItemDto[] = audioRows.map((row) => {
      const defaultTrackTitle = row.file_name.replace(/\.[^./\\]+$/, '')
      const trackTitle = row.metadata_track_title ?? row.track_title ?? defaultTrackTitle
      return {
        id: row.id,
        file_name: row.file_name,
        absolute_path: row.absolute_path,
        tree_path: parseJson<string[]>(row.tree_path_json, [row.file_name]),
        duration_sec: row.duration_sec,
        size_mb: row.size_mb,
        album: row.metadata_album ?? row.album ?? '',
        author: row.metadata_author ?? row.author ?? '',
        track_title: trackTitle.trim().length > 0 ? trackTitle : defaultTrackTitle,
        series_id: row.metadata_series_id ?? row.series_id ?? '',
        media_locator: parseJson<MediaLocatorDto>(row.media_locator_json, {
          kind: 'filesystem',
          absolute_path: row.absolute_path,
          extension: path.extname(row.absolute_path).toLowerCase() || '.mp3',
          media_type: 'audio',
          mime_type: 'audio/mpeg',
        }),
      }
    })

    return librarySnapshotDtoSchema.parse({
      image_packages: imagePackages,
      image_directories: imageDirectories,
      videos,
      audios,
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

  writeAudioTreePath(audioId: string, treePath: string[]): void {
    const normalizedAudioId = audioId.trim()
    if (!normalizedAudioId) {
      return
    }

    this.db
      .prepare(
        `
          UPDATE audio_item
          SET tree_path_json = ?, updated_at_ms = ?
          WHERE id = ?
        `,
      )
      .run(JSON.stringify(treePath), Date.now(), normalizedAudioId)
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

  deleteSnapshotEntriesByPaths(
    paths: string[],
  ): { deletedSourceCount: number; deletedVideoCount: number; deletedAudioCount: number } {
    const normalizedRoots = Array.from(new Set(paths.map((value) => path.resolve(value)).filter(Boolean)))
    if (normalizedRoots.length === 0) {
      return {
        deletedSourceCount: 0,
        deletedVideoCount: 0,
        deletedAudioCount: 0,
      }
    }

    const sourceRows = this.db
      .prepare(
        `
          SELECT id, source_type, package_name, absolute_path
          FROM media_source
        `,
      )
      .all() as Array<{ id: string; source_type: 'package' | 'directory'; package_name: string; absolute_path: string }>
    const videoRows = this.db
      .prepare(
        `
          SELECT id, absolute_path
          FROM video_item
        `,
      )
      .all() as Array<{ id: string; absolute_path: string }>
    const audioRows = this.db
      .prepare(
        `
          SELECT id, absolute_path
          FROM audio_item
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
    const audioIdsToDelete = audioRows.filter((row) => matchesAnyRoot(row.absolute_path)).map((row) => row.id)

    if (sourceIdsToDelete.length === 0 && videoIdsToDelete.length === 0 && audioIdsToDelete.length === 0) {
      return {
        deletedSourceCount: 0,
        deletedVideoCount: 0,
        deletedAudioCount: 0,
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
    const deleteAudioById = this.db.prepare(
      `
        DELETE FROM audio_item
        WHERE id = ?
      `,
    )

    let deletedSourceCount = 0
    let deletedVideoCount = 0
    let deletedAudioCount = 0
    this.runInTransaction(() => {
      for (const sourceId of sourceIdsToDelete) {
        const result = deleteSourceById.run(sourceId) as { changes?: number } | undefined
        deletedSourceCount += result?.changes ?? 0
      }

      for (const videoId of videoIdsToDelete) {
        const result = deleteVideoById.run(videoId) as { changes?: number } | undefined
        deletedVideoCount += result?.changes ?? 0
      }

      for (const audioId of audioIdsToDelete) {
        const result = deleteAudioById.run(audioId) as { changes?: number } | undefined
        deletedAudioCount += result?.changes ?? 0
      }
    })

    return {
      deletedSourceCount,
      deletedVideoCount,
      deletedAudioCount,
    }
  }

  moveSnapshotEntriesByPaths(
    mappings: Array<{ fromPath: string; toPath: string }>,
  ): {
    movedSourceCount: number
    movedImageLocatorCount: number
    movedVideoCount: number
    movedAudioCount: number
  } {
    const mappingByFromKey = new Map<string, { fromPath: string; toPath: string; fromKey: string }>()
    for (const mapping of mappings) {
      const fromPath = path.resolve(mapping.fromPath)
      const toPath = path.resolve(mapping.toPath)
      const fromKey = normalizeAllowlistKey(fromPath)
      if (fromKey === normalizeAllowlistKey(toPath)) {
        continue
      }
      mappingByFromKey.set(fromKey, {
        fromPath,
        toPath,
        fromKey,
      })
    }

    const normalizedMappings = Array.from(mappingByFromKey.values()).sort(
      (left, right) => right.fromPath.length - left.fromPath.length,
    )
    if (normalizedMappings.length === 0) {
      return {
        movedSourceCount: 0,
        movedImageLocatorCount: 0,
        movedVideoCount: 0,
        movedAudioCount: 0,
      }
    }

    const resolveMovedPath = (candidatePath: string): string | null => {
      const resolvedCandidate = path.resolve(candidatePath)
      const candidateKey = normalizeAllowlistKey(resolvedCandidate)

      for (const mapping of normalizedMappings) {
        if (mapping.fromKey === candidateKey) {
          return mapping.toPath
        }
        if (isPathInsideRoot(mapping.fromPath, resolvedCandidate)) {
          const relativePath = path.relative(mapping.fromPath, resolvedCandidate)
          return path.resolve(mapping.toPath, relativePath)
        }
      }

      return null
    }

    const sourceRows = this.db
      .prepare(
        `
          SELECT id, source_type, package_name, absolute_path
          FROM media_source
        `,
      )
      .all() as Array<{ id: string; source_type: 'package' | 'directory'; package_name: string; absolute_path: string }>
    const imageRows = this.db
      .prepare(
        `
          SELECT id, media_locator_json
          FROM image_item
        `,
      )
      .all() as Array<{ id: string; media_locator_json: string }>
    const videoRows = this.db
      .prepare(
        `
          SELECT id, file_name, absolute_path, media_locator_json
          FROM video_item
        `,
      )
      .all() as Array<{ id: string; file_name: string; absolute_path: string; media_locator_json: string }>
    const audioRows = this.db
      .prepare(
        `
          SELECT id, file_name, absolute_path, media_locator_json
          FROM audio_item
        `,
      )
      .all() as Array<{ id: string; file_name: string; absolute_path: string; media_locator_json: string }>

    const updateSourcePath = this.db.prepare(
      `
        UPDATE media_source
        SET package_name = ?, display_name = ?, absolute_path = ?, tree_path_json = ?, updated_at_ms = ?
        WHERE id = ?
      `,
    )
    const updateImageLocator = this.db.prepare(
      `
        UPDATE image_item
        SET media_locator_json = ?, updated_at_ms = ?
        WHERE id = ?
      `,
    )
    const updateVideoItem = this.db.prepare(
      `
        UPDATE video_item
        SET file_name = ?, absolute_path = ?, tree_path_json = ?, media_locator_json = ?, updated_at_ms = ?
        WHERE id = ?
      `,
    )
    const updateAudioItem = this.db.prepare(
      `
        UPDATE audio_item
        SET file_name = ?, absolute_path = ?, tree_path_json = ?, media_locator_json = ?, updated_at_ms = ?
        WHERE id = ?
      `,
    )
    const updateVideoMetadataWorkTitle = this.db.prepare(
      `
        UPDATE video_metadata
        SET work_title = ?, updated_at_ms = ?
        WHERE video_id = ?
          AND lower(trim(work_title)) = lower(?)
      `,
    )
    const updateAudioMetadataTrackTitle = this.db.prepare(
      `
        UPDATE audio_metadata
        SET track_title = ?, updated_at_ms = ?
        WHERE audio_id = ?
          AND lower(trim(track_title)) = lower(?)
      `,
    )

    let movedSourceCount = 0
    let movedImageLocatorCount = 0
    let movedVideoCount = 0
    let movedAudioCount = 0

    this.runInTransaction(() => {
      const updatedAtMs = Date.now()

      for (const row of sourceRows) {
        const movedPath = resolveMovedPath(row.absolute_path)
        if (!movedPath || normalizeAllowlistKey(movedPath) === normalizeAllowlistKey(row.absolute_path)) {
          continue
        }
        const movedBaseName = path.basename(movedPath)
        const nextPackageName = row.source_type === 'package' ? movedBaseName : row.package_name
        updateSourcePath.run(
          nextPackageName,
          movedBaseName,
          movedPath,
          JSON.stringify(toAbsoluteTreePath(movedPath)),
          updatedAtMs,
          row.id,
        )
        movedSourceCount += 1
      }

      for (const row of imageRows) {
        const locator = parseJson<MediaLocatorDto>(row.media_locator_json, {
          kind: 'filesystem',
          absolute_path: '',
          extension: '.jpg',
          media_type: 'image',
          mime_type: 'image/jpeg',
        })

        let changed = false
        if (locator.kind === 'filesystem') {
          const movedPath = resolveMovedPath(locator.absolute_path)
          if (movedPath && normalizeAllowlistKey(movedPath) !== normalizeAllowlistKey(locator.absolute_path)) {
            locator.absolute_path = movedPath
            changed = true
          }
        } else {
          const movedPath = resolveMovedPath(locator.archive_path)
          if (movedPath && normalizeAllowlistKey(movedPath) !== normalizeAllowlistKey(locator.archive_path)) {
            locator.archive_path = movedPath
            changed = true
          }
        }

        if (!changed) {
          continue
        }

        updateImageLocator.run(JSON.stringify(locator), updatedAtMs, row.id)
        movedImageLocatorCount += 1
      }

      for (const row of videoRows) {
        const movedPath = resolveMovedPath(row.absolute_path)
        if (!movedPath || normalizeAllowlistKey(movedPath) === normalizeAllowlistKey(row.absolute_path)) {
          continue
        }

        const nextFileName = path.basename(movedPath)
        const previousWorkTitle = row.file_name.replace(/\.[^./\\]+$/, '')
        const nextWorkTitle = nextFileName.replace(/\.[^./\\]+$/, '')

        const locator = parseJson<MediaLocatorDto>(row.media_locator_json, {
          kind: 'filesystem',
          absolute_path: row.absolute_path,
          extension: path.extname(row.absolute_path).toLowerCase() || '.mp4',
          media_type: 'video',
          mime_type: 'video/mp4',
        })
        if (locator.kind === 'filesystem') {
          locator.absolute_path = movedPath
        }

        updateVideoItem.run(
          nextFileName,
          movedPath,
          JSON.stringify(toAbsoluteTreePath(movedPath)),
          JSON.stringify(locator),
          updatedAtMs,
          row.id,
        )
        updateVideoMetadataWorkTitle.run(nextWorkTitle, updatedAtMs, row.id, previousWorkTitle)
        movedVideoCount += 1
      }

      for (const row of audioRows) {
        const movedPath = resolveMovedPath(row.absolute_path)
        if (!movedPath || normalizeAllowlistKey(movedPath) === normalizeAllowlistKey(row.absolute_path)) {
          continue
        }

        const nextFileName = path.basename(movedPath)
        const previousTrackTitle = row.file_name.replace(/\.[^./\\]+$/, '')
        const nextTrackTitle = nextFileName.replace(/\.[^./\\]+$/, '')

        const locator = parseJson<MediaLocatorDto>(row.media_locator_json, {
          kind: 'filesystem',
          absolute_path: row.absolute_path,
          extension: path.extname(row.absolute_path).toLowerCase() || '.mp3',
          media_type: 'audio',
          mime_type: 'audio/mpeg',
        })
        if (locator.kind === 'filesystem') {
          locator.absolute_path = movedPath
        }

        updateAudioItem.run(
          nextFileName,
          movedPath,
          JSON.stringify(toAbsoluteTreePath(movedPath)),
          JSON.stringify(locator),
          updatedAtMs,
          row.id,
        )
        updateAudioMetadataTrackTitle.run(nextTrackTitle, updatedAtMs, row.id, previousTrackTitle)
        movedAudioCount += 1
      }
    })

    return {
      movedSourceCount,
      movedImageLocatorCount,
      movedVideoCount,
      movedAudioCount,
    }
  }

  renameImageArchiveEntries(
    mappings: Array<{ archivePath: string; fromEntryName: string; toEntryName: string }>,
  ): { updatedImageCount: number } {
    const mappingByKey = new Map<string, { archiveKey: string; fromEntryName: string; toEntryName: string }>()
    for (const mapping of mappings) {
      const archivePath = path.resolve(mapping.archivePath)
      const fromEntryName = mapping.fromEntryName.trim()
      const toEntryName = mapping.toEntryName.trim()
      if (!fromEntryName || !toEntryName || fromEntryName === toEntryName) {
        continue
      }
      const archiveKey = normalizeAllowlistKey(archivePath)
      mappingByKey.set(`${archiveKey}::${fromEntryName}`, {
        archiveKey,
        fromEntryName,
        toEntryName,
      })
    }

    const normalizedMappings = Array.from(mappingByKey.values())
    if (normalizedMappings.length === 0) {
      return { updatedImageCount: 0 }
    }

    const imageRows = this.db
      .prepare(
        `
          SELECT id, media_locator_json
          FROM image_item
        `,
      )
      .all() as Array<{ id: string; media_locator_json: string }>

    const updateImageLocator = this.db.prepare(
      `
        UPDATE image_item
        SET media_locator_json = ?, updated_at_ms = ?
        WHERE id = ?
      `,
    )

    let updatedImageCount = 0
    this.runInTransaction(() => {
      const updatedAtMs = Date.now()
      for (const row of imageRows) {
        const locator = parseJson<MediaLocatorDto>(row.media_locator_json, {
          kind: 'filesystem',
          absolute_path: '',
          extension: '.jpg',
          media_type: 'image',
          mime_type: 'image/jpeg',
        })
        if (locator.kind !== 'archive-entry') {
          continue
        }
        const key = `${normalizeAllowlistKey(path.resolve(locator.archive_path))}::${locator.entry_name}`
        const mapping = mappingByKey.get(key)
        if (!mapping) {
          continue
        }
        locator.entry_name = mapping.toEntryName
        updateImageLocator.run(JSON.stringify(locator), updatedAtMs, row.id)
        updatedImageCount += 1
      }
    })

    return { updatedImageCount }
  }
}
