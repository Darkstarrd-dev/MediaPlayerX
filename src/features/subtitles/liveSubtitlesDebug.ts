export type SubtitleDebugOffsetMode = "off" | "renderer";

function isSubtitleDebugEnabled(): boolean {
  if (typeof globalThis === "undefined") {
    return false;
  }
  try {
    const value = globalThis.localStorage?.getItem("subtitle.debug.logs");
    return value === "1" || value === "true";
  } catch {
    return false;
  }
}

export function readSubtitleDebugBoolean(key: string): boolean {
  if (typeof globalThis === "undefined") {
    return false;
  }
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw === "1" || raw === "true";
  } catch {
    return false;
  }
}

export function readSubtitleDebugOffsetSec(): number {
  if (typeof globalThis === "undefined") {
    return 0;
  }
  try {
    const raw = globalThis.localStorage?.getItem("subtitle.debug.offsetSec");
    if (!raw) {
      return 0;
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.max(-2, Math.min(2, value));
  } catch {
    return 0;
  }
}

export function isAbortLikeError(error: unknown): boolean {
  if (!error) {
    return false;
  }
  if (
    typeof error === "object" &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  ) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return (
    normalized.includes("abort") ||
    normalized.includes("cancel") ||
    normalized.includes("canceled") ||
    normalized.includes("cancelled") ||
    normalized.includes("请求已取消")
  );
}

export function readSubtitleDebugOffsetMode(): SubtitleDebugOffsetMode {
  if (typeof globalThis === "undefined") {
    return "off";
  }
  try {
    const raw = (
      globalThis.localStorage?.getItem("subtitle.debug.offsetMode") ?? ""
    )
      .trim()
      .toLowerCase();
    if (raw === "off") {
      return "off";
    }
    return "renderer";
  } catch {
    return "renderer";
  }
}

const SUBTITLE_DEBUG_LOGS = isSubtitleDebugEnabled();

export function emitSubtitleDebug(
  event: string,
  payload: Record<string, unknown>,
): void {
  if (!SUBTITLE_DEBUG_LOGS) {
    return;
  }
  console.info(
    "[subtitle][metrics]",
    JSON.stringify({
      event,
      at_ms: Math.round(performance.now()),
      ...payload,
    }),
  );
}
