import type {
  ImagePackageDto,
  LibrarySnapshotDto,
} from "../src/contracts/backend";

import type {
  SQLiteDatabaseLike,
  TransactionRunner,
} from "./mediaLibraryDatabaseTypes";

export function replaceLibrarySnapshot(
  db: SQLiteDatabaseLike,
  runInTransaction: TransactionRunner,
  snapshot: LibrarySnapshotDto,
): void {
  const revision = Date.now();

  const upsertSource = db.prepare(
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
  );

  const upsertImage = db.prepare(
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
  );

  const upsertVideo = db.prepare(
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
  );

  const selectVideoIdByAbsolutePath = db.prepare(
    `
      SELECT id
      FROM video_item
      WHERE absolute_path = ?
      LIMIT 1
    `,
  );

  const selectSourceIdByAbsolutePath = db.prepare(
    `
      SELECT id
      FROM media_source
      WHERE absolute_path = ?
      LIMIT 1
    `,
  );

  const selectAudioIdByAbsolutePath = db.prepare(
    `
      SELECT id
      FROM audio_item
      WHERE absolute_path = ?
      LIMIT 1
    `,
  );

  const upsertAudio = db.prepare(
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
  );

  const deleteStaleImagesBySource = db.prepare(
    `
      DELETE FROM image_item
      WHERE source_id = ? AND last_seen_revision <> ?
    `,
  );

  const deleteStaleSources = db.prepare(
    `
      DELETE FROM media_source
      WHERE last_seen_revision <> ?
    `,
  );

  const deleteStaleVideos = db.prepare(
    `
      DELETE FROM video_item
      WHERE last_seen_revision <> ?
    `,
  );

  const deleteStaleAudios = db.prepare(
    `
      DELETE FROM audio_item
      WHERE last_seen_revision <> ?
    `,
  );

  runInTransaction(() => {
    const now = Date.now();

    const allSources: Array<{
      sourceType: "package" | "directory";
      source: ImagePackageDto;
    }> = [
      ...snapshot.image_packages.map((source) => ({
        sourceType: "package" as const,
        source,
      })),
      ...snapshot.image_directories.map((source) => ({
        sourceType: "directory" as const,
        source,
      })),
    ];

    for (const item of allSources) {
      const source = item.source;
      const existingSourceIdRow = selectSourceIdByAbsolutePath.get(
        source.absolute_path,
      ) as { id?: string } | undefined;
      const effectiveSourceId =
        typeof existingSourceIdRow?.id === "string" &&
        existingSourceIdRow.id.trim().length > 0
          ? existingSourceIdRow.id
          : source.id;

      upsertSource.run(
        effectiveSourceId,
        item.sourceType,
        source.package_name,
        source.display_name,
        source.absolute_path,
        JSON.stringify(source.tree_path),
        source.work_title,
        source.series_id ?? "",
        source.circle,
        source.author,
        JSON.stringify(source.tags),
        revision,
        now,
      );

      deleteStaleImagesBySource.run(effectiveSourceId, revision);

      for (const image of source.images) {
        const imageVector = (image as { feature_vector?: unknown })
          .feature_vector;
        upsertImage.run(
          image.id,
          effectiveSourceId,
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
        );
      }
    }

    for (const video of snapshot.videos) {
      const existingVideoIdRow = selectVideoIdByAbsolutePath.get(
        video.absolute_path,
      ) as { id?: string } | undefined;
      const effectiveVideoId =
        typeof existingVideoIdRow?.id === "string" &&
        existingVideoIdRow.id.trim().length > 0
          ? existingVideoIdRow.id
          : video.id;

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
      );
    }

    for (const audio of snapshot.audios ?? []) {
      const existingAudioIdRow = selectAudioIdByAbsolutePath.get(
        audio.absolute_path,
      ) as { id?: string } | undefined;
      const effectiveAudioId =
        typeof existingAudioIdRow?.id === "string" &&
        existingAudioIdRow.id.trim().length > 0
          ? existingAudioIdRow.id
          : audio.id;

      upsertAudio.run(
        effectiveAudioId,
        audio.file_name,
        audio.absolute_path,
        JSON.stringify(audio.tree_path),
        audio.duration_sec,
        audio.size_mb,
        audio.album ?? "",
        audio.author ?? "",
        audio.track_title ?? "",
        audio.series_id ?? "",
        JSON.stringify(audio.media_locator),
        revision,
        now,
      );
    }

    deleteStaleSources.run(revision);
    deleteStaleVideos.run(revision);
    deleteStaleAudios.run(revision);
  });
}
