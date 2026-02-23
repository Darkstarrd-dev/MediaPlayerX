import { createHash } from "node:crypto";
import path from "node:path";

import type { ImagePackageDto } from "../../../src/contracts/backend";

const SOURCE_COVER_EXT_ALLOWLIST = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".bmp",
]);

const MUSIC_ISOLATED_FALLBACK_GROUP = "unknown artist";

export const SUBTITLE_EXTENSIONS = new Set([".vtt", ".srt", ".ass", ".ssa"]);
export const XP_PREFERENCE_METRICS_STATE_KEY = "xp_preference_metrics_v1";

interface PersistedImagePreferenceMetric {
  eventCount: number;
  pagesRead: number;
  totalPages: number;
  completionRatio: number;
  lastEventTimeMs: number | null;
}

interface PersistedVideoPreferenceMetric {
  eventCount: number;
  watchSeconds: number;
  totalSeconds: number;
  completionRatio: number;
  lastEventTimeMs: number | null;
}

export interface PersistedImagePreferenceSession {
  sessionId: string;
  sourceId: string;
  startedAtMs: number;
  endedAtMs: number;
  pagesRead: number;
  totalPages: number;
  completionRatio: number;
  isFullscreen: boolean;
  endReason: string;
}

export interface PersistedVideoPreferenceSession {
  sessionId: string;
  videoId: string;
  startedAtMs: number;
  endedAtMs: number;
  watchSeconds: number;
  totalSeconds: number;
  completionRatio: number;
  hadFullscreen: boolean;
  isNoise: boolean;
  endReason: string;
}

export interface PersistedImagePreferenceRuntimeCheckpoint {
  sessionId: string;
  sourceId: string;
  startedAtMs: number;
  lastCheckpointMs: number;
  checkpointSeq: number;
  pagesRead: number;
  totalPages: number;
  completionRatio: number;
  isFullscreen: boolean;
}

export interface PersistedVideoPreferenceRuntimeCheckpoint {
  sessionId: string;
  videoId: string;
  startedAtMs: number;
  lastCheckpointMs: number;
  checkpointSeq: number;
  watchSeconds: number;
  totalSeconds: number;
  completionRatio: number;
  hadFullscreen: boolean;
  lastVideoTime: number;
}

function clampNonNegativeInt(value: unknown): number {
  const parsed =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return Math.floor(parsed);
}

function clampNonNegativeNumber(value: unknown): number {
  const parsed =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : Number(value ?? NaN);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return parsed;
}

function clampCompletionRatio(value: unknown): number {
  const parsed =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : Number(value ?? NaN);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, Math.min(1, parsed));
}

function parsePreferenceLastEventTime(value: unknown): number | null {
  if (value === null || typeof value === "undefined") {
    return null;
  }
  const parsed =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : Number(value ?? NaN);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.floor(parsed);
}

function parsePositiveTimestamp(value: unknown): number | null {
  const parsed =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : Number(value ?? NaN);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.floor(parsed);
}

function parseBooleanFlag(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value > 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  }
  return false;
}

export function parsePersistedPreferenceMetrics(raw: unknown): {
  imageBySourceId: Map<string, PersistedImagePreferenceMetric>;
  videoById: Map<string, PersistedVideoPreferenceMetric>;
  imageSessions: PersistedImagePreferenceSession[];
  videoSessions: PersistedVideoPreferenceSession[];
} {
  const result = {
    imageBySourceId: new Map<string, PersistedImagePreferenceMetric>(),
    videoById: new Map<string, PersistedVideoPreferenceMetric>(),
    imageSessions: [] as PersistedImagePreferenceSession[],
    videoSessions: [] as PersistedVideoPreferenceSession[],
  };

  if (!raw || typeof raw !== "object") {
    return result;
  }

  const record = raw as Record<string, unknown>;
  const imageRecord = record.image_by_source_id;
  if (imageRecord && typeof imageRecord === "object") {
    for (const [sourceIdRaw, value] of Object.entries(
      imageRecord as Record<string, unknown>,
    )) {
      const sourceId = sourceIdRaw.trim();
      if (!sourceId || !value || typeof value !== "object") {
        continue;
      }
      const metric = value as Record<string, unknown>;
      result.imageBySourceId.set(sourceId, {
        eventCount: clampNonNegativeInt(metric.event_count),
        pagesRead: clampNonNegativeInt(metric.pages_read),
        totalPages: clampNonNegativeInt(metric.total_pages),
        completionRatio: clampCompletionRatio(metric.completion_ratio),
        lastEventTimeMs: parsePreferenceLastEventTime(
          metric.last_event_time_ms,
        ),
      });
    }
  }

  const videoRecord = record.video_by_id;
  if (videoRecord && typeof videoRecord === "object") {
    for (const [videoIdRaw, value] of Object.entries(
      videoRecord as Record<string, unknown>,
    )) {
      const videoId = videoIdRaw.trim();
      if (!videoId || !value || typeof value !== "object") {
        continue;
      }
      const metric = value as Record<string, unknown>;
      result.videoById.set(videoId, {
        eventCount: clampNonNegativeInt(metric.event_count),
        watchSeconds: clampNonNegativeNumber(metric.watch_seconds),
        totalSeconds: clampNonNegativeInt(metric.total_seconds),
        completionRatio: clampCompletionRatio(metric.completion_ratio),
        lastEventTimeMs: parsePreferenceLastEventTime(
          metric.last_event_time_ms,
        ),
      });
    }
  }

  const imageSessions = record.image_session_events;
  if (Array.isArray(imageSessions)) {
    for (const entry of imageSessions) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const session = entry as Record<string, unknown>;
      const sessionId = String(session.session_id ?? "").trim();
      const sourceId = String(session.source_id ?? "").trim();
      const startedAtMs = parsePositiveTimestamp(session.started_at_ms);
      const endedAtMs = parsePositiveTimestamp(session.ended_at_ms);
      if (!sessionId || !sourceId || !startedAtMs || !endedAtMs) {
        continue;
      }
      result.imageSessions.push({
        sessionId,
        sourceId,
        startedAtMs,
        endedAtMs,
        pagesRead: clampNonNegativeInt(session.pages_read),
        totalPages: clampNonNegativeInt(session.total_pages),
        completionRatio: clampCompletionRatio(session.completion_ratio),
        isFullscreen: parseBooleanFlag(session.is_fullscreen),
        endReason: String(session.end_reason ?? "").trim(),
      });
    }
  }

  const videoSessions = record.video_session_events;
  if (Array.isArray(videoSessions)) {
    for (const entry of videoSessions) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const session = entry as Record<string, unknown>;
      const sessionId = String(session.session_id ?? "").trim();
      const videoId = String(session.video_id ?? "").trim();
      const startedAtMs = parsePositiveTimestamp(session.started_at_ms);
      const endedAtMs = parsePositiveTimestamp(session.ended_at_ms);
      if (!sessionId || !videoId || !startedAtMs || !endedAtMs) {
        continue;
      }
      result.videoSessions.push({
        sessionId,
        videoId,
        startedAtMs,
        endedAtMs,
        watchSeconds: clampNonNegativeNumber(session.watch_seconds),
        totalSeconds: clampNonNegativeInt(session.total_seconds),
        completionRatio: clampCompletionRatio(session.completion_ratio),
        hadFullscreen: parseBooleanFlag(session.had_fullscreen),
        isNoise: parseBooleanFlag(session.is_noise),
        endReason: String(session.end_reason ?? "").trim(),
      });
    }
  }

  return result;
}

export function parsePreferenceRuntimeCheckpoints(raw: unknown): {
  imageCheckpoints: PersistedImagePreferenceRuntimeCheckpoint[];
  videoCheckpoints: PersistedVideoPreferenceRuntimeCheckpoint[];
} {
  const result = {
    imageCheckpoints: [] as PersistedImagePreferenceRuntimeCheckpoint[],
    videoCheckpoints: [] as PersistedVideoPreferenceRuntimeCheckpoint[],
  };

  if (!raw || typeof raw !== "object") {
    return result;
  }

  const record = raw as Record<string, unknown>;
  const imageCheckpoints = record.image_runtime_checkpoints;
  if (Array.isArray(imageCheckpoints)) {
    for (const entry of imageCheckpoints) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const checkpoint = entry as Record<string, unknown>;
      const sessionId = String(checkpoint.session_id ?? "").trim();
      const sourceId = String(checkpoint.source_id ?? "").trim();
      const startedAtMs = parsePositiveTimestamp(checkpoint.started_at_ms);
      const lastCheckpointMs = parsePositiveTimestamp(
        checkpoint.last_checkpoint_ms,
      );
      if (!sessionId || !sourceId || !startedAtMs || !lastCheckpointMs) {
        continue;
      }

      result.imageCheckpoints.push({
        sessionId,
        sourceId,
        startedAtMs,
        lastCheckpointMs,
        checkpointSeq: clampNonNegativeInt(checkpoint.checkpoint_seq),
        pagesRead: clampNonNegativeInt(checkpoint.pages_read),
        totalPages: clampNonNegativeInt(checkpoint.total_pages),
        completionRatio: clampCompletionRatio(checkpoint.completion_ratio),
        isFullscreen: parseBooleanFlag(checkpoint.is_fullscreen),
      });
    }
  }

  const videoCheckpoints = record.video_runtime_checkpoints;
  if (Array.isArray(videoCheckpoints)) {
    for (const entry of videoCheckpoints) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const checkpoint = entry as Record<string, unknown>;
      const sessionId = String(checkpoint.session_id ?? "").trim();
      const videoId = String(checkpoint.video_id ?? "").trim();
      const startedAtMs = parsePositiveTimestamp(checkpoint.started_at_ms);
      const lastCheckpointMs = parsePositiveTimestamp(
        checkpoint.last_checkpoint_ms,
      );
      if (!sessionId || !videoId || !startedAtMs || !lastCheckpointMs) {
        continue;
      }

      result.videoCheckpoints.push({
        sessionId,
        videoId,
        startedAtMs,
        lastCheckpointMs,
        checkpointSeq: clampNonNegativeInt(checkpoint.checkpoint_seq),
        watchSeconds: clampNonNegativeNumber(checkpoint.watch_seconds),
        totalSeconds: clampNonNegativeInt(checkpoint.total_seconds),
        completionRatio: clampCompletionRatio(checkpoint.completion_ratio),
        hadFullscreen: parseBooleanFlag(checkpoint.had_fullscreen),
        lastVideoTime: clampNonNegativeNumber(checkpoint.last_video_time),
      });
    }
  }

  return result;
}

function normalizeTreeSegment(value: string, fallback: string): string {
  const normalized = value
    .replace(/[\\/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length > 0 ? normalized : fallback;
}

export function resolveIsolatedAudioGroup(album: string): string {
  const candidate =
    album.trim().length > 0 ? album : MUSIC_ISOLATED_FALLBACK_GROUP;
  return normalizeTreeSegment(candidate, MUSIC_ISOLATED_FALLBACK_GROUP);
}

export function isAutoLiveSubtitleFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return (
    lower.includes(".auto-live.") ||
    lower.endsWith(".auto-live.srt") ||
    lower.endsWith(".auto-live.vtt") ||
    lower.endsWith(".auto-live.ass") ||
    lower.endsWith(".auto-live.ssa")
  );
}

export function normalizeExternalMetadataText(
  value: string | undefined,
): string {
  return value?.trim() ?? "";
}

export function resolveCoverFileExtension(coverUrl: string): string {
  try {
    const parsed = new URL(coverUrl);
    const ext = path.extname(parsed.pathname).toLowerCase();
    if (SOURCE_COVER_EXT_ALLOWLIST.has(ext)) {
      return ext;
    }
  } catch {
    // ignore invalid url
  }
  return ".jpg";
}

export function resolveFallbackCoverColor(sourceId: string): string {
  const hash = createHash("sha1").update(sourceId).digest("hex");
  const hue = Number.parseInt(hash.slice(0, 2), 16) % 360;
  return `hsl(${hue} 36% 42%)`;
}

export function filterHiddenImagesFromSource(
  source: ImagePackageDto,
  includeHidden: boolean,
): ImagePackageDto {
  if (includeHidden) {
    return source;
  }

  const visibleImages = source.images.filter(
    (image) => !(image.hidden ?? false),
  );
  if (visibleImages.length === source.images.length) {
    return source;
  }

  return {
    ...source,
    images: visibleImages,
  };
}

export function filterHiddenImagesFromSources(
  sources: ImagePackageDto[],
  includeHidden: boolean,
): ImagePackageDto[] {
  if (includeHidden) {
    return sources;
  }
  return sources.map((source) =>
    filterHiddenImagesFromSource(source, includeHidden),
  );
}

export function ensureNotAborted(signal?: AbortSignal): void {
  if (!signal) {
    return;
  }
  if (signal.aborted) {
    throw new Error("read request aborted");
  }
}
