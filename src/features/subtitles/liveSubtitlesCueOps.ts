import type { SubtitleCueDto } from "../../contracts/backend";
import {
  areLikelyDuplicateCue,
  mergeDuplicateCues,
} from "../../contracts/subtitleCue.shared";

export interface GeneratedRangeDto {
  start_sec: number;
  end_sec: number;
}

export function resolveActiveGeneratedRange(
  ranges: GeneratedRangeDto[],
  timelineSec: number,
): GeneratedRangeDto | null {
  for (let index = 0; index < ranges.length; index += 1) {
    const range = ranges[index];
    if (
      range.start_sec - 0.01 <= timelineSec &&
      range.end_sec + 0.01 >= timelineSec
    ) {
      return range;
    }
  }
  return null;
}

function toDisplayCue(cue: SubtitleCueDto): SubtitleCueDto {
  const originalStart = Math.max(0, cue.start_sec);
  const originalEnd = Math.max(originalStart + 0.12, cue.end_sec);
  const rawDurationSec = Math.max(0.12, originalEnd - originalStart);

  const normalizedText = cue.text.replace(/\s+/g, " ").trim();
  const cjkCount = (normalizedText.match(/[\u3400-\u9FFF\uF900-\uFAFF]/g) ?? [])
    .length;
  const latinOrDigitCount = (normalizedText.match(/[A-Za-z0-9]/g) ?? []).length;
  const otherVisibleCount = Math.max(
    0,
    normalizedText.replace(/[\s]/g, "").length - cjkCount - latinOrDigitCount,
  );
  const effectiveCharUnits =
    cjkCount + latinOrDigitCount * 0.45 + otherVisibleCount * 0.6;

  const mappedLeadSec = (() => {
    const minChars = 3;
    const maxChars = 20;
    const minSec = 0.3;
    const maxSec = 2;
    const clampedChars = Math.max(
      minChars,
      Math.min(maxChars, effectiveCharUnits),
    );
    const ratio = (clampedChars - minChars) / (maxChars - minChars);
    return minSec + ratio * (maxSec - minSec);
  })();

  const speechSecByChars = Math.max(
    0.25,
    Math.min(6, effectiveCharUnits * 0.17),
  );
  const leadOffsetSec = mappedLeadSec + speechSecByChars;

  const expandedStart = Math.max(0, originalStart - 0.5);
  const expandedEnd = Math.max(expandedStart + 0.25, originalEnd + 0.5);
  const shiftedStart = Math.max(0, expandedStart - leadOffsetSec);
  const displayDurationSec = Math.max(
    rawDurationSec + 0.5,
    speechSecByChars + 0.55,
    0.85,
  );
  const shiftedEnd = Math.max(
    shiftedStart + 0.25,
    shiftedStart + displayDurationSec,
    expandedEnd - leadOffsetSec,
  );

  return {
    ...cue,
    start_sec: Number(shiftedStart.toFixed(3)),
    end_sec: Number(shiftedEnd.toFixed(3)),
  };
}

export function toDisplayCues(cues: SubtitleCueDto[]): SubtitleCueDto[] {
  if (cues.length === 0) {
    return cues;
  }
  return cues.map((cue) => toDisplayCue(cue));
}

export function hasCueAtTimeline(
  cues: SubtitleCueDto[],
  timelineSec: number,
): boolean {
  for (let index = 0; index < cues.length; index += 1) {
    const cue = cues[index];
    if (
      cue.start_sec - 0.01 <= timelineSec &&
      cue.end_sec + 0.12 >= timelineSec
    ) {
      return true;
    }
  }
  return false;
}

export function hasCueNearTimeline(
  cues: SubtitleCueDto[],
  timelineSec: number,
  options?: { backtrackSec?: number; lookaheadSec?: number },
): boolean {
  const backtrackSec = Math.max(0, options?.backtrackSec ?? 0.25);
  const lookaheadSec = Math.max(0, options?.lookaheadSec ?? 1.2);
  const nearStart = Math.max(0, timelineSec - backtrackSec);
  const nearEnd = timelineSec + lookaheadSec;
  for (let index = 0; index < cues.length; index += 1) {
    const cue = cues[index];
    if (cue.end_sec + 0.001 >= nearStart && cue.start_sec <= nearEnd + 0.001) {
      return true;
    }
  }
  return false;
}

export function isTimelineInRanges(
  ranges: GeneratedRangeDto[],
  timelineSec: number,
): boolean {
  for (let index = 0; index < ranges.length; index += 1) {
    const range = ranges[index];
    if (
      range.start_sec - 0.01 <= timelineSec &&
      range.end_sec + 0.01 >= timelineSec
    ) {
      return true;
    }
  }
  return false;
}

export function appendCues(
  previous: SubtitleCueDto[],
  next: SubtitleCueDto[],
): SubtitleCueDto[] {
  if (next.length === 0) {
    return previous;
  }
  const mergedById = new Map<string, SubtitleCueDto>();
  for (const cue of [...previous, ...next]) {
    mergedById.set(cue.id, cue);
  }
  const ordered = Array.from(mergedById.values()).sort(
    (left, right) => left.start_sec - right.start_sec,
  );
  const deduped: SubtitleCueDto[] = [];
  for (const cue of ordered) {
    let duplicateIndex = -1;
    for (
      let index = deduped.length - 1;
      index >= Math.max(0, deduped.length - 8);
      index -= 1
    ) {
      if (areLikelyDuplicateCue(deduped[index], cue)) {
        duplicateIndex = index;
        break;
      }
    }
    if (duplicateIndex >= 0) {
      deduped[duplicateIndex] = mergeDuplicateCues(
        deduped[duplicateIndex],
        cue,
      );
      continue;
    }
    deduped.push(cue);
  }
  return deduped.slice(-300);
}
