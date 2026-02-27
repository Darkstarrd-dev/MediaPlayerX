import path from "node:path";

import type {
  AudioItemDto,
  ImageItemDto,
  ImagePackageDto,
  LibrarySnapshotLiteDto,
  MediaLocatorDto,
  VideoItemDto,
} from "../src/contracts/backend";
import type { SQLiteDatabaseLike } from "./mediaLibraryDatabaseTypes";
import {
  type AudioRow,
  type ImageRow,
  parseJson,
  type SourceRow,
  type VideoRow,
} from "./mediaLibraryStoreUtils";

const SOURCE_SELECT_SQL = `
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
    source_cover.updated_at_ms AS source_cover_updated_at_ms,
    preference.event_count AS preference_event_count,
    preference.pages_read AS preference_pages_read,
    preference.total_pages AS preference_total_pages,
    preference.completion_ratio AS preference_completion_ratio,
    preference.last_event_time_ms AS preference_last_event_time_ms,
    preference.updated_at_ms AS preference_updated_at_ms
  FROM media_source AS source
  LEFT JOIN package_grade AS grade ON grade.source_id = source.id
  LEFT JOIN media_source_external_metadata AS external ON external.source_id = source.id
  LEFT JOIN media_source_cover AS source_cover ON source_cover.source_id = source.id
  LEFT JOIN image_preference_metrics AS preference ON preference.source_id = source.id
  ORDER BY source.absolute_path COLLATE NOCASE
`;

const VIDEO_SELECT_SQL = `
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
    metadata.grade,
    preference.event_count AS preference_event_count,
    preference.watch_seconds AS preference_watch_seconds,
    preference.total_seconds AS preference_total_seconds,
    preference.completion_ratio AS preference_completion_ratio,
    preference.last_event_time_ms AS preference_last_event_time_ms,
    preference.updated_at_ms AS preference_updated_at_ms
  FROM video_item AS video
  LEFT JOIN video_cover AS cover ON cover.video_id = video.id
  LEFT JOIN video_metadata AS metadata ON metadata.video_id = video.id
  LEFT JOIN video_preference_metrics AS preference ON preference.video_id = video.id
  ORDER BY video.absolute_path COLLATE NOCASE
`;

const AUDIO_SELECT_SQL = `
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
`;

export function readSourceRows(db: SQLiteDatabaseLike): SourceRow[] {
  return db.prepare(SOURCE_SELECT_SQL).all() as SourceRow[];
}

export function readVideoRows(db: SQLiteDatabaseLike): VideoRow[] {
  return db.prepare(VIDEO_SELECT_SQL).all() as VideoRow[];
}

export function readAudioRows(db: SQLiteDatabaseLike): AudioRow[] {
  return db.prepare(AUDIO_SELECT_SQL).all() as AudioRow[];
}

export function readImageRowsBySourceId(
  db: SQLiteDatabaseLike,
): Map<string, ImageItemDto[]> {
  const imageRows = db
    .prepare(
      `
        SELECT
          source_id,
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
        ORDER BY source_id ASC, ordinal ASC
      `,
    )
    .all() as Array<ImageRow & { source_id: string }>;

  const imageRowsBySourceId = new Map<string, ImageItemDto[]>();
  for (const imageRow of imageRows) {
    const mappedRow: ImageItemDto = {
      id: imageRow.id,
      ordinal: imageRow.ordinal,
      width: imageRow.width,
      height: imageRow.height,
      size_kb: imageRow.size_kb,
      cluster: imageRow.cluster,
      color: imageRow.color,
      media_locator: parseJson<MediaLocatorDto>(imageRow.media_locator_json, {
        kind: "filesystem",
        absolute_path: "",
        extension: ".jpg",
        media_type: "image",
        mime_type: "image/jpeg",
      }),
      hidden: imageRow.hidden !== 0,
    };

    const existing = imageRowsBySourceId.get(imageRow.source_id);
    if (existing) {
      existing.push(mappedRow);
    } else {
      imageRowsBySourceId.set(imageRow.source_id, [mappedRow]);
    }
  }
  return imageRowsBySourceId;
}

export function mapSourceRowToImagePackage(
  row: SourceRow,
  images: ImageItemDto[],
): ImagePackageDto {
  return {
    id: row.id,
    package_name: row.package_name,
    display_name: row.display_name,
    absolute_path: row.absolute_path,
    tree_path: parseJson<string[]>(row.tree_path_json, [row.display_name]),
    work_title: row.work_title,
    series_id: row.series_id ?? "",
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
            source_token: row.source_token ?? "",
            title: row.external_title ?? "",
            title_jpn: row.title_jpn ?? "",
            group_name: row.group_name ?? "",
            group_name_jpn: row.group_name_jpn ?? "",
            artist: row.artist ?? "",
            artist_jpn: row.artist_jpn ?? "",
            posted: row.posted ?? "",
            rating: row.rating,
            favorited: row.favorited,
            tags: parseJson<Record<string, string>>(row.external_tags_json ?? "{}", {}),
            raw_json: row.external_raw_json ?? "{}",
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
    preference_metrics:
      typeof row.preference_event_count === "number" &&
      typeof row.preference_total_pages === "number"
        ? {
            event_count: row.preference_event_count,
            pages_read: row.preference_pages_read ?? 0,
            total_pages: row.preference_total_pages,
            completion_ratio: row.preference_completion_ratio ?? 0,
            last_event_time_ms: row.preference_last_event_time_ms,
            updated_at_ms: row.preference_updated_at_ms ?? Date.now(),
          }
        : null,
    images,
  };
}

export function mapSourceRowToLite(
  row: SourceRow,
): LibrarySnapshotLiteDto["image_packages"][number] {
  const source = mapSourceRowToImagePackage(row, []);
  const { images, ...lite } = source;
  void images;
  return lite;
}

export function mapVideoRowToVideoItem(row: VideoRow): VideoItemDto {
  const defaultWorkTitle = row.file_name.replace(/\.[^./\\]+$/, "");
  return {
    id: row.id,
    file_name: row.file_name,
    absolute_path: row.absolute_path,
    tree_path: parseJson<string[]>(row.tree_path_json, [row.file_name]),
    duration_sec: row.duration_sec,
    width: row.width,
    height: row.height,
    size_mb: row.size_mb,
    cover_color: row.cover_color ?? "hsl(0, 0%, 36%)",
    cover_image_path: row.cover_image_path,
    work_title:
      row.work_title && row.work_title.trim().length > 0
        ? row.work_title
        : defaultWorkTitle,
    work_title_jpn: row.work_title_jpn ?? "",
    series_id: row.series_id ?? "",
    circle: row.circle && row.circle.trim().length > 0 ? row.circle : "未知",
    circle_jpn: row.circle_jpn ?? "",
    author: row.author && row.author.trim().length > 0 ? row.author : "未知",
    author_jpn: row.author_jpn ?? "",
    tags: row.tags_json ? parseJson<string[]>(row.tags_json, []) : [],
    grade: row.grade,
    preference_metrics:
      typeof row.preference_event_count === "number" &&
      typeof row.preference_total_seconds === "number"
        ? {
            event_count: row.preference_event_count,
            watch_seconds: row.preference_watch_seconds ?? 0,
            total_seconds: row.preference_total_seconds,
            completion_ratio: row.preference_completion_ratio ?? 0,
            last_event_time_ms: row.preference_last_event_time_ms,
            updated_at_ms: row.preference_updated_at_ms ?? Date.now(),
          }
        : null,
    media_locator: parseJson<MediaLocatorDto>(row.media_locator_json, {
      kind: "filesystem",
      absolute_path: row.absolute_path,
      extension: ".mp4",
      media_type: "video",
      mime_type: "video/mp4",
    }),
  };
}

export function mapAudioRowToAudioItem(row: AudioRow): AudioItemDto {
  const parseCueMetadata = (absolutePath: string): {
    cueSourcePath?: string;
    cueTrackNo?: number;
    cueStartSec?: number;
    cueEndSec?: number | null;
  } | null => {
    if (!absolutePath.startsWith("cue://")) {
      return null;
    }

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

    let cueSourcePath: string | null = null;
    let trackNo: number | null = null;
    let startSec: number | null = null;
    let endSec: number | null = null;

    try {
      const parsed = new URL(absolutePath);
      cueSourcePath = decodeSafely(`${parsed.host}${parsed.pathname ?? ""}`.replace(/^\/+/, ""));
      const rawTrackNo = parsed.searchParams.get("track");
      const rawStartSec = parsed.searchParams.get("start");
      const rawEndSec = parsed.searchParams.get("end");

      const parsedTrackNo = rawTrackNo ? Number(rawTrackNo) : Number.NaN;
      if (Number.isFinite(parsedTrackNo) && parsedTrackNo > 0) {
        trackNo = Math.round(parsedTrackNo);
      }

      const parsedStartSec = rawStartSec ? Number(rawStartSec) : Number.NaN;
      if (Number.isFinite(parsedStartSec) && parsedStartSec >= 0) {
        startSec = parsedStartSec;
      }

      const parsedEndSec = rawEndSec ? Number(rawEndSec) : Number.NaN;
      if (Number.isFinite(parsedEndSec) && parsedEndSec >= 0) {
        endSec = parsedEndSec;
      }
    } catch {
      return null;
    }

    return {
      cueSourcePath: cueSourcePath ?? undefined,
      cueTrackNo: trackNo ?? undefined,
      cueStartSec: startSec ?? undefined,
      cueEndSec: endSec,
    };
  };

  const defaultTrackTitle = row.file_name.replace(/\.[^./\\]+$/, "");
  const trackTitle = row.metadata_track_title ?? row.track_title ?? defaultTrackTitle;
  const mediaLocator = parseJson<MediaLocatorDto>(row.media_locator_json, {
    kind: "filesystem",
    absolute_path: row.absolute_path,
    extension: path.extname(row.absolute_path).toLowerCase() || ".mp3",
    media_type: "audio",
    mime_type: "audio/mpeg",
  });
  const cueMetadata = parseCueMetadata(row.absolute_path);
  return {
    id: row.id,
    file_name: row.file_name,
    absolute_path: row.absolute_path,
    tree_path: parseJson<string[]>(row.tree_path_json, [row.file_name]),
    duration_sec: row.duration_sec,
    size_mb: row.size_mb,
    album: row.metadata_album ?? row.album ?? "",
    author: row.metadata_author ?? row.author ?? "",
    track_title: trackTitle.trim().length > 0 ? trackTitle : defaultTrackTitle,
    series_id: row.metadata_series_id ?? row.series_id ?? "",
    cue_source_path: cueMetadata?.cueSourcePath,
    cue_track_no: cueMetadata?.cueTrackNo,
    cue_start_sec: cueMetadata?.cueStartSec,
    cue_end_sec: cueMetadata?.cueEndSec,
    media_locator: mediaLocator,
  };
}
