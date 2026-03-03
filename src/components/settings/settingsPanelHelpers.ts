import type { SettingsSection } from "./renderSettingsMainSection";
import type { ShortcutAction } from "../../shortcuts";

export type BindingTarget = { action: ShortcutAction; label: string };
export type PanelOffset = { x: number; y: number };
export type PanelDragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startOffsetX: number;
  startOffsetY: number;
};

export const MOUSE_CAPTURE_PRESETS: Array<{ labelKey: string; combo: string }> =
  [
    { labelKey: "ui.settings.mousePresetLeft", combo: "MouseLeft" },
    { labelKey: "ui.settings.mousePresetMiddle", combo: "MouseMiddle" },
    { labelKey: "ui.settings.mousePresetRight", combo: "MouseRight" },
    { labelKey: "ui.settings.mousePresetBack", combo: "MouseBack" },
    { labelKey: "ui.settings.mousePresetForward", combo: "MouseForward" },
    { labelKey: "ui.settings.mousePresetWheelUp", combo: "WheelUp" },
    { labelKey: "ui.settings.mousePresetWheelDown", combo: "WheelDown" },
  ];

export const SETTINGS_SECTIONS: Array<{
  id: SettingsSection;
  labelKey: string;
}> = [
  { id: "layout", labelKey: "ui.settings.sectionLayout" },
  { id: "performance", labelKey: "ui.settings.sectionPerformance" },
  { id: "shader", labelKey: "ui.settings.sectionShader" },
  { id: "audio", labelKey: "ui.settings.sectionAudio" },
  { id: "video", labelKey: "ui.settings.sectionVideo" },
  { id: "model", labelKey: "ui.settings.sectionModel" },
  { id: "debug", labelKey: "ui.settings.sectionDebug" },
  { id: "shortcuts", labelKey: "ui.settings.sectionShortcuts" },
  { id: "database", labelKey: "ui.settings.sectionDatabase" },
  { id: "system", labelKey: "ui.settings.sectionSystem" },
];

export const THUMBNAIL_WIDTH_MIN = 128;
export const THUMBNAIL_WIDTH_MAX = 2048;
export const THUMBNAIL_GENERATION_CONCURRENCY_MIN = 1;
export const THUMBNAIL_GENERATION_CONCURRENCY_MAX = 16;
export const THUMBNAIL_RESOLVE_CONCURRENCY_MIN = 1;
export const THUMBNAIL_RESOLVE_CONCURRENCY_MAX = 32;
export const THUMBNAIL_QUEUE_SIZE_MIN = 16;
export const THUMBNAIL_QUEUE_SIZE_MAX = 256;
export const CPU_TOKEN_LIMIT_MIN = 1;
export const CPU_TOKEN_LIMIT_MAX = 16;
export const PREFERENCE_METRICS_STATE_KEY = "xp_preference_metrics_v1";
const PREFERENCE_DEBUG_SESSION_PREVIEW_LIMIT = 8;

export interface PreferenceDebugViewModel {
  reason: string;
  updatedAtMs: number | null;
  imageAggregateCount: number;
  videoAggregateCount: number;
  imageSessionCount: number;
  videoSessionCount: number;
  imageSessionPreview: unknown[];
  videoSessionPreview: unknown[];
}

function dedupeSessionEventsForDebug(events: unknown[]): unknown[] {
  const seenSessionIds = new Set<string>();
  const dedupedReversed: unknown[] = [];
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (!event || typeof event !== "object") {
      dedupedReversed.push(event);
      continue;
    }
    const record = event as Record<string, unknown>;
    const sessionIdRaw = record.session_id;
    const sessionId =
      typeof sessionIdRaw === "string" ? sessionIdRaw.trim() : "";
    if (!sessionId) {
      dedupedReversed.push(event);
      continue;
    }
    if (seenSessionIds.has(sessionId)) {
      continue;
    }
    seenSessionIds.add(sessionId);
    dedupedReversed.push(event);
  }
  return dedupedReversed.reverse();
}

export function parsePreferenceDebugViewModel(
  rawStateJson: string,
): PreferenceDebugViewModel {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawStateJson);
  } catch {
    parsed = {};
  }

  const record =
    parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  const imageBySourceId =
    record.image_by_source_id && typeof record.image_by_source_id === "object"
      ? (record.image_by_source_id as Record<string, unknown>)
      : {};
  const videoById =
    record.video_by_id && typeof record.video_by_id === "object"
      ? (record.video_by_id as Record<string, unknown>)
      : {};
  const imageSessionEventsRaw = Array.isArray(record.image_session_events)
    ? record.image_session_events
    : [];
  const videoSessionEventsRaw = Array.isArray(record.video_session_events)
    ? record.video_session_events
    : [];
  const imageSessionEvents = dedupeSessionEventsForDebug(imageSessionEventsRaw);
  const videoSessionEvents = dedupeSessionEventsForDebug(videoSessionEventsRaw);

  const updatedAtRaw = record.updated_at_ms;
  const updatedAtMs =
    typeof updatedAtRaw === "number" && Number.isFinite(updatedAtRaw)
      ? Math.floor(updatedAtRaw)
      : null;

  return {
    reason: String(record.reason ?? "-"),
    updatedAtMs,
    imageAggregateCount: Object.keys(imageBySourceId).length,
    videoAggregateCount: Object.keys(videoById).length,
    imageSessionCount: imageSessionEvents.length,
    videoSessionCount: videoSessionEvents.length,
    imageSessionPreview: imageSessionEvents
      .slice(-PREFERENCE_DEBUG_SESSION_PREVIEW_LIMIT)
      .reverse(),
    videoSessionPreview: videoSessionEvents
      .slice(-PREFERENCE_DEBUG_SESSION_PREVIEW_LIMIT)
      .reverse(),
  };
}

export function shouldIgnoreSettingsPanelDragStart(
  target: EventTarget | null,
): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      'button, input, select, textarea, a, label, [data-no-drag="true"]',
    ),
  );
}

export function resolveSettingsSection(raw: unknown): SettingsSection {
  if (
    raw === "layout" ||
    raw === "performance" ||
    raw === "shader" ||
    raw === "audio" ||
    raw === "video" ||
    raw === "debug" ||
    raw === "system" ||
    raw === "model" ||
    raw === "database" ||
    raw === "shortcuts"
  ) {
    return raw;
  }
  if (raw === "theme" || raw === "thumbnail") {
    return "layout";
  }
  return "layout";
}
