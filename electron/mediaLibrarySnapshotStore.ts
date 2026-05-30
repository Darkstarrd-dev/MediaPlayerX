import path from "node:path";

import {
  librarySnapshotDtoSchema,
  type LibrarySnapshotDto,
  librarySnapshotLiteDtoSchema,
  type LibrarySnapshotLiteDto,
  type MediaLocatorDto,
} from "../src/contracts/backend";
import {
  isPathInsideRoot,
  normalizeAllowlistKey,
  toAbsoluteTreePath,
} from "./fileSystemServiceHelpers";
import type {
  SQLiteDatabaseLike,
  TransactionRunner,
} from "./mediaLibraryDatabaseTypes";
import { parseJson } from "./mediaLibraryStoreUtils";
import { replaceLibrarySnapshot } from "./mediaLibrarySnapshotReplace";
import {
  mapAudioRowToAudioItem,
  mapSourceRowToImagePackage,
  mapSourceRowToLite,
  mapVideoRowToVideoItem,
  readAudioRows,
  readImageRowsBySourceId,
  readSourceRows,
  readVideoRows,
} from "./mediaLibrarySnapshotReadHelpers";

export class MediaLibrarySnapshotStore {
  constructor(
    private readonly db: SQLiteDatabaseLike,
    private readonly runInTransaction: TransactionRunner,
  ) {}

  replaceSnapshot(snapshot: LibrarySnapshotDto): void {
    replaceLibrarySnapshot(this.db, this.runInTransaction, snapshot);
  }

  readSnapshot(options?: { includeImages?: boolean }): LibrarySnapshotDto {
    const includeImages = options?.includeImages ?? true;
    const sourceRows = readSourceRows(this.db);
    const imageRowsBySourceId = includeImages
      ? readImageRowsBySourceId(this.db)
      : new Map<string, LibrarySnapshotDto["image_packages"][number]["images"]>();

    const imagePackages: LibrarySnapshotDto["image_packages"] = [];
    const imageDirectories: LibrarySnapshotDto["image_directories"] = [];

    for (const row of sourceRows) {
      const source = mapSourceRowToImagePackage(
        row,
        imageRowsBySourceId.get(row.id) ?? [],
      );
      if (row.source_type === "package") {
        imagePackages.push(source);
      } else {
        imageDirectories.push(source);
      }
    }

    const videos = readVideoRows(this.db).map(mapVideoRowToVideoItem);
    const audios = readAudioRows(this.db).map(mapAudioRowToAudioItem);

    const snapshot: LibrarySnapshotDto = {
      image_packages: imagePackages,
      image_directories: imageDirectories,
      videos,
      audios,
    };
    // 校验但不深拷贝：mappers 已填好各字段默认值，原对象形状完整，
    // 直接返回原对象可避免整库对象图的 Zod clone 放大堆压力。
    const validated = librarySnapshotDtoSchema.safeParse(snapshot);
    if (!validated.success) {
      throw validated.error;
    }
    return snapshot;
  }

  readSnapshotLite(): LibrarySnapshotLiteDto {
    const sourceRows = readSourceRows(this.db);

    const imagePackages: LibrarySnapshotLiteDto["image_packages"] = [];
    const imageDirectories: LibrarySnapshotLiteDto["image_directories"] = [];

    for (const row of sourceRows) {
      const source = mapSourceRowToLite(row);
      if (row.source_type === "package") {
        imagePackages.push(source);
      } else {
        imageDirectories.push(source);
      }
    }

    const videos = readVideoRows(this.db).map(mapVideoRowToVideoItem);
    const audios = readAudioRows(this.db).map(mapAudioRowToAudioItem);

    const snapshot: LibrarySnapshotLiteDto = {
      image_packages: imagePackages,
      image_directories: imageDirectories,
      videos,
      audios,
    };
    // 校验但不深拷贝，避免整库对象图的 Zod clone 放大堆压力。
    const validated = librarySnapshotLiteDtoSchema.safeParse(snapshot);
    if (!validated.success) {
      throw validated.error;
    }
    return snapshot;
  }

  setImagesHidden(imageIds: string[], hidden: boolean): number {
    const normalizedIds = Array.from(
      new Set(imageIds.map((value) => value.trim()).filter(Boolean)),
    );
    if (normalizedIds.length === 0) {
      return 0;
    }

    const update = this.db.prepare(
      `
        UPDATE image_item
        SET hidden = ?, updated_at_ms = ?
        WHERE id = ?
      `,
    );

    const updatedAtMs = Date.now();
    let touched = 0;
    this.runInTransaction(() => {
      for (const imageId of normalizedIds) {
        const result = update.run(hidden ? 1 : 0, updatedAtMs, imageId) as
          | { changes?: number }
          | undefined;
        if ((result?.changes ?? 0) > 0) {
          touched += 1;
        }
      }
    });

    return touched;
  }

  writeAudioTreePath(audioId: string, treePath: string[]): void {
    const normalizedAudioId = audioId.trim();
    if (!normalizedAudioId) {
      return;
    }

    this.db
      .prepare(
        `
          UPDATE audio_item
          SET tree_path_json = ?, updated_at_ms = ?
          WHERE id = ?
        `,
      )
      .run(JSON.stringify(treePath), Date.now(), normalizedAudioId);
  }

  deleteImageItems(imageIds: string[]): {
    deletedCount: number;
    touchedSourceIds: string[];
  } {
    const normalizedIds = Array.from(
      new Set(imageIds.map((value) => value.trim()).filter(Boolean)),
    );
    if (normalizedIds.length === 0) {
      return {
        deletedCount: 0,
        touchedSourceIds: [],
      };
    }

    const selectImageSource = this.db.prepare(
      `
        SELECT source_id
        FROM image_item
        WHERE id = ?
      `,
    );
    const deleteImage = this.db.prepare(
      `
        DELETE FROM image_item
        WHERE id = ?
      `,
    );
    const selectImagesBySource = this.db.prepare(
      `
        SELECT id, ordinal
        FROM image_item
        WHERE source_id = ?
        ORDER BY ordinal ASC
      `,
    );
    const updateImageOrdinal = this.db.prepare(
      `
        UPDATE image_item
        SET ordinal = ?, updated_at_ms = ?
        WHERE id = ?
      `,
    );
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
    );

    let deletedCount = 0;
    const touchedSourceIds = new Set<string>();
    this.runInTransaction(() => {
      for (const imageId of normalizedIds) {
        const sourceRow = selectImageSource.get(imageId) as
          | { source_id?: string }
          | undefined;
        if (!sourceRow?.source_id) {
          continue;
        }

        touchedSourceIds.add(sourceRow.source_id);
        const result = deleteImage.run(imageId) as
          | { changes?: number }
          | undefined;
        deletedCount += result?.changes ?? 0;
      }

      const updatedAtMs = Date.now();
      for (const sourceId of touchedSourceIds) {
        const rows = selectImagesBySource.all(sourceId) as Array<{
          id: string;
          ordinal: number;
        }>;
        for (let index = 0; index < rows.length; index += 1) {
          const row = rows[index];
          const nextOrdinal = index + 1;
          if (row.ordinal === nextOrdinal) {
            continue;
          }
          updateImageOrdinal.run(nextOrdinal, updatedAtMs, row.id);
        }

        deleteEmptySource.run(sourceId, sourceId);
      }
    });

    return {
      deletedCount,
      touchedSourceIds: Array.from(touchedSourceIds),
    };
  }

  deleteSnapshotEntriesByPaths(paths: string[]): {
    deletedSourceCount: number;
    deletedVideoCount: number;
    deletedAudioCount: number;
  } {
    const hasUriScheme = (value: string): boolean =>
      /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(value.trim());

    const normalizePathForMatching = (value: string): string => {
      const trimmed = value.trim();
      if (!trimmed) {
        return "";
      }
      if (hasUriScheme(trimmed)) {
        return trimmed;
      }
      return path.resolve(trimmed);
    };

    const decodeSafely = (value: string | null): string | null => {
      if (!value || value.trim().length === 0) {
        return null;
      }
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    };

    const parseCueVirtualAudioPath = (
      value: string,
    ): { cuePath: string | null; sourcePath: string | null } | null => {
      if (!value.startsWith("cue://")) {
        return null;
      }

      try {
        const parsed = new URL(value);
        const encodedCuePath = `${parsed.host}${parsed.pathname ?? ""}`.replace(
          /^\/+/,
          "",
        );
        const cuePath = decodeSafely(encodedCuePath);
        const sourcePath = decodeSafely(parsed.searchParams.get("src"));
        return {
          cuePath,
          sourcePath,
        };
      } catch {
        const matched = /^cue:\/\/([^?]+)(?:\?(.*))?$/i.exec(value);
        if (!matched) {
          return null;
        }
        const cuePath = decodeSafely(matched[1] ?? null);
        const searchParams = new URLSearchParams(matched[2] ?? "");
        const sourcePath = decodeSafely(searchParams.get("src"));
        return {
          cuePath,
          sourcePath,
        };
      }
    };

    const normalizedRoots = Array.from(
      new Set(paths.map((value) => normalizePathForMatching(value)).filter(Boolean)),
    );
    if (normalizedRoots.length === 0) {
      return {
        deletedSourceCount: 0,
        deletedVideoCount: 0,
        deletedAudioCount: 0,
      };
    }

    const sourceRows = this.db
      .prepare(
        `
          SELECT id, source_type, package_name, absolute_path
          FROM media_source
        `,
      )
      .all() as Array<{
      id: string;
      source_type: "package" | "directory";
      package_name: string;
      absolute_path: string;
    }>;
    const videoRows = this.db
      .prepare(
        `
          SELECT id, absolute_path
          FROM video_item
        `,
      )
      .all() as Array<{ id: string; absolute_path: string }>;
    const audioRows = this.db
      .prepare(
        `
          SELECT id, absolute_path
          FROM audio_item
        `,
      )
      .all() as Array<{ id: string; absolute_path: string }>;

    const matchesAnyRoot = (candidatePath: string): boolean => {
      const normalizedCandidate = normalizePathForMatching(candidatePath);
      if (!normalizedCandidate) {
        return false;
      }

      return normalizedRoots.some((rootPath) => {
        const exactMatch = hasUriScheme(rootPath) || hasUriScheme(normalizedCandidate)
          ? rootPath === normalizedCandidate
          : normalizeAllowlistKey(rootPath) ===
            normalizeAllowlistKey(normalizedCandidate);
        if (exactMatch) {
          return true;
        }

        if (hasUriScheme(rootPath) || hasUriScheme(normalizedCandidate)) {
          return false;
        }

        return isPathInsideRoot(rootPath, normalizedCandidate);
      });
    };

    const sourceIdsToDelete = sourceRows
      .filter((row) => matchesAnyRoot(row.absolute_path))
      .map((row) => row.id);
    const videoIdsToDelete = videoRows
      .filter((row) => matchesAnyRoot(row.absolute_path))
      .map((row) => row.id);
    const audioIdsToDelete = audioRows
      .filter((row) => {
        const candidatePaths = [row.absolute_path];
        const cueVirtual = parseCueVirtualAudioPath(row.absolute_path);
        if (cueVirtual?.cuePath) {
          candidatePaths.push(cueVirtual.cuePath);
        }
        if (cueVirtual?.sourcePath) {
          candidatePaths.push(cueVirtual.sourcePath);
        }

        return candidatePaths.some((candidatePath) => matchesAnyRoot(candidatePath));
      })
      .map((row) => row.id);

    if (
      sourceIdsToDelete.length === 0 &&
      videoIdsToDelete.length === 0 &&
      audioIdsToDelete.length === 0
    ) {
      return {
        deletedSourceCount: 0,
        deletedVideoCount: 0,
        deletedAudioCount: 0,
      };
    }

    const deleteSourceById = this.db.prepare(
      `
        DELETE FROM media_source
        WHERE id = ?
      `,
    );
    const deleteVideoById = this.db.prepare(
      `
        DELETE FROM video_item
        WHERE id = ?
      `,
    );
    const deleteAudioById = this.db.prepare(
      `
        DELETE FROM audio_item
        WHERE id = ?
      `,
    );

    let deletedSourceCount = 0;
    let deletedVideoCount = 0;
    let deletedAudioCount = 0;
    this.runInTransaction(() => {
      for (const sourceId of sourceIdsToDelete) {
        const result = deleteSourceById.run(sourceId) as
          | { changes?: number }
          | undefined;
        deletedSourceCount += result?.changes ?? 0;
      }

      for (const videoId of videoIdsToDelete) {
        const result = deleteVideoById.run(videoId) as
          | { changes?: number }
          | undefined;
        deletedVideoCount += result?.changes ?? 0;
      }

      for (const audioId of audioIdsToDelete) {
        const result = deleteAudioById.run(audioId) as
          | { changes?: number }
          | undefined;
        deletedAudioCount += result?.changes ?? 0;
      }
    });

    return {
      deletedSourceCount,
      deletedVideoCount,
      deletedAudioCount,
    };
  }

  moveSnapshotEntriesByPaths(
    mappings: Array<{ fromPath: string; toPath: string }>,
  ): {
    movedSourceCount: number;
    movedImageLocatorCount: number;
    movedVideoCount: number;
    movedAudioCount: number;
  } {
    const mappingByFromKey = new Map<
      string,
      { fromPath: string; toPath: string; fromKey: string }
    >();
    for (const mapping of mappings) {
      const fromPath = path.resolve(mapping.fromPath);
      const toPath = path.resolve(mapping.toPath);
      const fromKey = normalizeAllowlistKey(fromPath);
      if (fromKey === normalizeAllowlistKey(toPath)) {
        continue;
      }
      mappingByFromKey.set(fromKey, {
        fromPath,
        toPath,
        fromKey,
      });
    }

    const normalizedMappings = Array.from(mappingByFromKey.values()).sort(
      (left, right) => right.fromPath.length - left.fromPath.length,
    );
    if (normalizedMappings.length === 0) {
      return {
        movedSourceCount: 0,
        movedImageLocatorCount: 0,
        movedVideoCount: 0,
        movedAudioCount: 0,
      };
    }

    const resolveMovedPath = (candidatePath: string): string | null => {
      const resolvedCandidate = path.resolve(candidatePath);
      const candidateKey = normalizeAllowlistKey(resolvedCandidate);

      for (const mapping of normalizedMappings) {
        if (mapping.fromKey === candidateKey) {
          return mapping.toPath;
        }
        if (isPathInsideRoot(mapping.fromPath, resolvedCandidate)) {
          const relativePath = path.relative(
            mapping.fromPath,
            resolvedCandidate,
          );
          return path.resolve(mapping.toPath, relativePath);
        }
      }

      return null;
    };

    const sourceRows = this.db
      .prepare(
        `
          SELECT id, source_type, package_name, absolute_path
          FROM media_source
        `,
      )
      .all() as Array<{
      id: string;
      source_type: "package" | "directory";
      package_name: string;
      absolute_path: string;
    }>;
    const imageRows = this.db
      .prepare(
        `
          SELECT id, media_locator_json
          FROM image_item
        `,
      )
      .all() as Array<{ id: string; media_locator_json: string }>;
    const videoRows = this.db
      .prepare(
        `
          SELECT id, file_name, absolute_path, media_locator_json
          FROM video_item
        `,
      )
      .all() as Array<{
      id: string;
      file_name: string;
      absolute_path: string;
      media_locator_json: string;
    }>;
    const audioRows = this.db
      .prepare(
        `
          SELECT id, file_name, absolute_path, media_locator_json
          FROM audio_item
        `,
      )
      .all() as Array<{
      id: string;
      file_name: string;
      absolute_path: string;
      media_locator_json: string;
    }>;

    const updateSourcePath = this.db.prepare(
      `
        UPDATE media_source
        SET package_name = ?, display_name = ?, absolute_path = ?, tree_path_json = ?, updated_at_ms = ?
        WHERE id = ?
      `,
    );
    const updateImageLocator = this.db.prepare(
      `
        UPDATE image_item
        SET media_locator_json = ?, updated_at_ms = ?
        WHERE id = ?
      `,
    );
    const updateVideoItem = this.db.prepare(
      `
        UPDATE video_item
        SET file_name = ?, absolute_path = ?, tree_path_json = ?, media_locator_json = ?, updated_at_ms = ?
        WHERE id = ?
      `,
    );
    const updateAudioItem = this.db.prepare(
      `
        UPDATE audio_item
        SET file_name = ?, absolute_path = ?, tree_path_json = ?, media_locator_json = ?, updated_at_ms = ?
        WHERE id = ?
      `,
    );
    const updateVideoMetadataWorkTitle = this.db.prepare(
      `
        UPDATE video_metadata
        SET work_title = ?, updated_at_ms = ?
        WHERE video_id = ?
          AND lower(trim(work_title)) = lower(?)
      `,
    );
    const updateAudioMetadataTrackTitle = this.db.prepare(
      `
        UPDATE audio_metadata
        SET track_title = ?, updated_at_ms = ?
        WHERE audio_id = ?
          AND lower(trim(track_title)) = lower(?)
      `,
    );

    let movedSourceCount = 0;
    let movedImageLocatorCount = 0;
    let movedVideoCount = 0;
    let movedAudioCount = 0;

    this.runInTransaction(() => {
      const updatedAtMs = Date.now();

      for (const row of sourceRows) {
        const movedPath = resolveMovedPath(row.absolute_path);
        if (
          !movedPath ||
          normalizeAllowlistKey(movedPath) ===
            normalizeAllowlistKey(row.absolute_path)
        ) {
          continue;
        }
        const movedBaseName = path.basename(movedPath);
        const nextPackageName =
          row.source_type === "package" ? movedBaseName : row.package_name;
        updateSourcePath.run(
          nextPackageName,
          movedBaseName,
          movedPath,
          JSON.stringify(toAbsoluteTreePath(movedPath)),
          updatedAtMs,
          row.id,
        );
        movedSourceCount += 1;
      }

      for (const row of imageRows) {
        const locator = parseJson<MediaLocatorDto>(row.media_locator_json, {
          kind: "filesystem",
          absolute_path: "",
          extension: ".jpg",
          media_type: "image",
          mime_type: "image/jpeg",
        });

        let changed = false;
        if (locator.kind === "filesystem") {
          const movedPath = resolveMovedPath(locator.absolute_path);
          if (
            movedPath &&
            normalizeAllowlistKey(movedPath) !==
              normalizeAllowlistKey(locator.absolute_path)
          ) {
            locator.absolute_path = movedPath;
            changed = true;
          }
        } else {
          const movedPath = resolveMovedPath(locator.archive_path);
          if (
            movedPath &&
            normalizeAllowlistKey(movedPath) !==
              normalizeAllowlistKey(locator.archive_path)
          ) {
            locator.archive_path = movedPath;
            changed = true;
          }
        }

        if (!changed) {
          continue;
        }

        updateImageLocator.run(JSON.stringify(locator), updatedAtMs, row.id);
        movedImageLocatorCount += 1;
      }

      for (const row of videoRows) {
        const movedPath = resolveMovedPath(row.absolute_path);
        if (
          !movedPath ||
          normalizeAllowlistKey(movedPath) ===
            normalizeAllowlistKey(row.absolute_path)
        ) {
          continue;
        }

        const nextFileName = path.basename(movedPath);
        const previousWorkTitle = row.file_name.replace(/\.[^./\\]+$/, "");
        const nextWorkTitle = nextFileName.replace(/\.[^./\\]+$/, "");

        const locator = parseJson<MediaLocatorDto>(row.media_locator_json, {
          kind: "filesystem",
          absolute_path: row.absolute_path,
          extension: path.extname(row.absolute_path).toLowerCase() || ".mp4",
          media_type: "video",
          mime_type: "video/mp4",
        });
        if (locator.kind === "filesystem") {
          locator.absolute_path = movedPath;
        }

        updateVideoItem.run(
          nextFileName,
          movedPath,
          JSON.stringify(toAbsoluteTreePath(movedPath)),
          JSON.stringify(locator),
          updatedAtMs,
          row.id,
        );
        updateVideoMetadataWorkTitle.run(
          nextWorkTitle,
          updatedAtMs,
          row.id,
          previousWorkTitle,
        );
        movedVideoCount += 1;
      }

      for (const row of audioRows) {
        const movedPath = resolveMovedPath(row.absolute_path);
        if (
          !movedPath ||
          normalizeAllowlistKey(movedPath) ===
            normalizeAllowlistKey(row.absolute_path)
        ) {
          continue;
        }

        const nextFileName = path.basename(movedPath);
        const previousTrackTitle = row.file_name.replace(/\.[^./\\]+$/, "");
        const nextTrackTitle = nextFileName.replace(/\.[^./\\]+$/, "");

        const locator = parseJson<MediaLocatorDto>(row.media_locator_json, {
          kind: "filesystem",
          absolute_path: row.absolute_path,
          extension: path.extname(row.absolute_path).toLowerCase() || ".mp3",
          media_type: "audio",
          mime_type: "audio/mpeg",
        });
        if (locator.kind === "filesystem") {
          locator.absolute_path = movedPath;
        }

        updateAudioItem.run(
          nextFileName,
          movedPath,
          JSON.stringify(toAbsoluteTreePath(movedPath)),
          JSON.stringify(locator),
          updatedAtMs,
          row.id,
        );
        updateAudioMetadataTrackTitle.run(
          nextTrackTitle,
          updatedAtMs,
          row.id,
          previousTrackTitle,
        );
        movedAudioCount += 1;
      }
    });

    return {
      movedSourceCount,
      movedImageLocatorCount,
      movedVideoCount,
      movedAudioCount,
    };
  }

  renameImageArchiveEntries(
    mappings: Array<{
      archivePath: string;
      fromEntryName: string;
      toEntryName: string;
    }>,
  ): { updatedImageCount: number } {
    const mappingByKey = new Map<
      string,
      { archiveKey: string; fromEntryName: string; toEntryName: string }
    >();
    for (const mapping of mappings) {
      const archivePath = path.resolve(mapping.archivePath);
      const fromEntryName = mapping.fromEntryName.trim();
      const toEntryName = mapping.toEntryName.trim();
      if (!fromEntryName || !toEntryName || fromEntryName === toEntryName) {
        continue;
      }
      const archiveKey = normalizeAllowlistKey(archivePath);
      mappingByKey.set(`${archiveKey}::${fromEntryName}`, {
        archiveKey,
        fromEntryName,
        toEntryName,
      });
    }

    const normalizedMappings = Array.from(mappingByKey.values());
    if (normalizedMappings.length === 0) {
      return { updatedImageCount: 0 };
    }

    const imageRows = this.db
      .prepare(
        `
          SELECT id, media_locator_json
          FROM image_item
        `,
      )
      .all() as Array<{ id: string; media_locator_json: string }>;

    const updateImageLocator = this.db.prepare(
      `
        UPDATE image_item
        SET media_locator_json = ?, updated_at_ms = ?
        WHERE id = ?
      `,
    );

    let updatedImageCount = 0;
    this.runInTransaction(() => {
      const updatedAtMs = Date.now();
      for (const row of imageRows) {
        const locator = parseJson<MediaLocatorDto>(row.media_locator_json, {
          kind: "filesystem",
          absolute_path: "",
          extension: ".jpg",
          media_type: "image",
          mime_type: "image/jpeg",
        });
        if (locator.kind !== "archive-entry") {
          continue;
        }
        const key = `${normalizeAllowlistKey(path.resolve(locator.archive_path))}::${locator.entry_name}`;
        const mapping = mappingByKey.get(key);
        if (!mapping) {
          continue;
        }
        locator.entry_name = mapping.toEntryName;
        updateImageLocator.run(JSON.stringify(locator), updatedAtMs, row.id);
        updatedImageCount += 1;
      }
    });

    return { updatedImageCount };
  }
}
