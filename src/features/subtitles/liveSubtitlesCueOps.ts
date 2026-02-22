import type { SubtitleCueDto } from "../../contracts/backend";

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

function normalizeCueTextForDedup(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "")
    .trim();
}

function computeDiceSimilarity(left: string, right: string): number {
  if (!left || !right) {
    return 0;
  }
  if (left === right) {
    return 1;
  }
  const leftChars = Array.from(left);
  const rightChars = Array.from(right);
  if (leftChars.length < 2 || rightChars.length < 2) {
    const rightSet = new Set(rightChars);
    const hit = leftChars.reduce(
      (sum, ch) => sum + (rightSet.has(ch) ? 1 : 0),
      0,
    );
    return hit / Math.max(leftChars.length, rightChars.length);
  }

  const leftBigrams = new Map<string, number>();
  for (let i = 0; i < leftChars.length - 1; i += 1) {
    const key = `${leftChars[i]}${leftChars[i + 1]}`;
    leftBigrams.set(key, (leftBigrams.get(key) ?? 0) + 1);
  }

  let intersection = 0;
  let rightCount = 0;
  for (let i = 0; i < rightChars.length - 1; i += 1) {
    const key = `${rightChars[i]}${rightChars[i + 1]}`;
    rightCount += 1;
    const leftCount = leftBigrams.get(key) ?? 0;
    if (leftCount > 0) {
      intersection += 1;
      leftBigrams.set(key, leftCount - 1);
    }
  }

  const leftCount = Math.max(1, leftChars.length - 1);
  const denominator = leftCount + Math.max(1, rightCount);
  return (2 * intersection) / denominator;
}

function computeCueTextSimilarity(leftText: string, rightText: string): number {
  const left = normalizeCueTextForDedup(leftText);
  const right = normalizeCueTextForDedup(rightText);
  if (!left || !right) {
    return 0;
  }
  if (left === right) {
    return 1;
  }
  const containment =
    left.includes(right) || right.includes(left)
      ? Math.min(left.length, right.length) /
        Math.max(left.length, right.length)
      : 0;
  const dice = computeDiceSimilarity(left, right);
  return Math.max(containment, dice);
}

function cueOverlapRatio(left: SubtitleCueDto, right: SubtitleCueDto): number {
  const overlapStart = Math.max(left.start_sec, right.start_sec);
  const overlapEnd = Math.min(left.end_sec, right.end_sec);
  const overlap = Math.max(0, overlapEnd - overlapStart);
  const leftDuration = Math.max(0.05, left.end_sec - left.start_sec);
  const rightDuration = Math.max(0.05, right.end_sec - right.start_sec);
  return overlap / Math.min(leftDuration, rightDuration);
}

function areLikelyDuplicateCue(
  left: SubtitleCueDto,
  right: SubtitleCueDto,
): boolean {
  const similarity = computeCueTextSimilarity(left.text, right.text);
  if (similarity < 0.82) {
    return false;
  }
  const leftCenter = (left.start_sec + left.end_sec) * 0.5;
  const rightCenter = (right.start_sec + right.end_sec) * 0.5;
  const centerDiff = Math.abs(leftCenter - rightCenter);
  if (similarity >= 0.92 && centerDiff <= 0.8) {
    return true;
  }
  if (centerDiff <= 0.45 && similarity >= 0.85) {
    return true;
  }
  return cueOverlapRatio(left, right) >= 0.5 && similarity >= 0.82;
}

function mergeDuplicateCues(
  base: SubtitleCueDto,
  incoming: SubtitleCueDto,
): SubtitleCueDto {
  const mergedStart = Math.min(base.start_sec, incoming.start_sec);
  const mergedEnd = Math.max(base.end_sec, incoming.end_sec);
  const mergedText =
    incoming.text.trim().length >= base.text.trim().length
      ? incoming.text
      : base.text;
  return {
    ...base,
    text: mergedText,
    start_sec: Number(mergedStart.toFixed(3)),
    end_sec: Number(mergedEnd.toFixed(3)),
    lang: incoming.lang ?? base.lang,
    speaker: incoming.speaker ?? base.speaker,
    line: incoming.line ?? base.line,
    speaker_changed: incoming.speaker_changed ?? base.speaker_changed,
    speaker_similarity: incoming.speaker_similarity ?? base.speaker_similarity,
  };
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
