import type {
  SubtitleCueDto,
  SubtitleSessionEventDto,
} from "../../contracts/backend";
import type { SubtitleDebugOffsetMode } from "./liveSubtitlesDebug";

export function pickDisplayEventMessage(
  events: SubtitleSessionEventDto[],
): string | null {
  const selected = events.find((item) => {
    if (item.level === "error") {
      return true;
    }
    if (item.code === "provider_fallback") {
      return false;
    }
    if (item.code === "session_not_running") {
      return false;
    }
    return item.level === "warning";
  });

  return selected?.message ?? null;
}

function resolveCueTrack(cue: SubtitleCueDto): string {
  if (cue.line === "A" || cue.line === "B") {
    return cue.line;
  }
  if (typeof cue.speaker === "number" && cue.speaker >= 0) {
    return `S${cue.speaker + 1}`;
  }
  return "T";
}

export function buildAdvancedDisplayText(
  cues: SubtitleCueDto[],
  currentTimeSec: number,
  offsetSec: number,
  offsetMode: SubtitleDebugOffsetMode,
  options?: {
    maxLines?: number;
    includeTrackLabel?: boolean;
  },
): string | null {
  const shouldApplyOffsetToRenderer = offsetMode === "renderer";
  const adjustedCurrentTimeSec = shouldApplyOffsetToRenderer
    ? currentTimeSec - offsetSec
    : currentTimeSec;
  const maxLines = Math.max(1, options?.maxLines ?? 2);
  const includeTrackLabel = options?.includeTrackLabel ?? true;
  const activeCues = cues
    .filter(
      (cue) =>
        adjustedCurrentTimeSec + 0.35 >= cue.start_sec &&
        adjustedCurrentTimeSec <= cue.end_sec + 2.4,
    )
    .slice(-8);

  if (activeCues.length === 0) {
    return null;
  }

  const latestCueByTrack = new Map<string, SubtitleCueDto>();
  for (let i = 0; i < activeCues.length; i += 1) {
    const cue = activeCues[i];
    const track = resolveCueTrack(cue);
    const previous = latestCueByTrack.get(track);
    if (!previous) {
      latestCueByTrack.set(track, cue);
      continue;
    }
    if (
      cue.start_sec > previous.start_sec + 0.0005 ||
      (Math.abs(cue.start_sec - previous.start_sec) <= 0.0005 &&
        cue.end_sec >= previous.end_sec)
    ) {
      latestCueByTrack.set(track, cue);
    }
  }

  const selectedByTrack = Array.from(latestCueByTrack.entries())
    .map(([track, cue]) => ({ track, cue }))
    .sort((left, right) => {
      if (Math.abs(left.cue.start_sec - right.cue.start_sec) > 0.0005) {
        return left.cue.start_sec - right.cue.start_sec;
      }
      return left.cue.end_sec - right.cue.end_sec;
    })
    .slice(-maxLines);

  const lines = selectedByTrack
    .map(({ track, cue }) =>
      includeTrackLabel ? `[${track}] ${cue.text}` : cue.text,
    )
    .filter((line) => line.trim().length > 0);

  return lines.join("\n").trim() || null;
}

export function buildDisplayTextByMode(
  cues: SubtitleCueDto[],
  currentTimeSec: number,
  offsetSec: number,
  offsetMode: SubtitleDebugOffsetMode,
  renderMode: "simple" | "advanced",
): string | null {
  return buildAdvancedDisplayText(cues, currentTimeSec, offsetSec, offsetMode, {
    maxLines: renderMode === "advanced" ? 2 : 1,
    includeTrackLabel: renderMode === "advanced",
  });
}

export function detectLatestCueLanguage(cues: SubtitleCueDto[]): string | null {
  for (let index = cues.length - 1; index >= 0; index -= 1) {
    const cue = cues[index];
    if (cue.lang && cue.lang.trim()) {
      return cue.lang.trim().toLowerCase();
    }
  }
  return null;
}
