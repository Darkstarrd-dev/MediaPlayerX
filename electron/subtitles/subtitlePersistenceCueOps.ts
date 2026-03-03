import type { AppendSubtitlePersistenceRequestDto } from "../../src/contracts/backend";
import {
  areLikelyDuplicateCue,
  mergeDuplicateCues,
} from "../../src/contracts/subtitleCue.shared";

export interface ValidRangeLike {
  start_sec: number;
  end_sec: number;
}

export interface SubtitleCueRecordLike {
  id: string;
  start_sec: number;
  end_sec: number;
  text: string;
  lang: string | null;
  speaker?: number | null;
  line?: "A" | "B";
  speaker_changed?: boolean;
  speaker_similarity?: number;
}

export interface CueRangeLike {
  startSec: number;
  endSec: number;
}

export function mergeValidRanges(ranges: ValidRangeLike[]): ValidRangeLike[] {
  if (ranges.length === 0) {
    return [];
  }
  const sorted = [...ranges]
    .map((range) => ({
      start_sec: Number(range.start_sec.toFixed(3)),
      end_sec: Number(Math.max(range.start_sec, range.end_sec).toFixed(3)),
    }))
    .sort((left, right) => left.start_sec - right.start_sec);
  const merged: ValidRangeLike[] = [];
  for (const range of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous) {
      merged.push(range);
      continue;
    }
    if (range.start_sec <= previous.end_sec + 0.01) {
      previous.end_sec = Math.max(previous.end_sec, range.end_sec);
      previous.end_sec = Number(previous.end_sec.toFixed(3));
    } else {
      merged.push(range);
    }
  }
  return merged;
}

export function isBatchInValidRanges(
  batchStartSec: number,
  batchEndSec: number,
  ranges: ValidRangeLike[],
): boolean {
  if (!Number.isFinite(batchStartSec) || !Number.isFinite(batchEndSec)) {
    return false;
  }
  const startSec = Math.max(0, Math.min(batchStartSec, batchEndSec));
  const endSec = Math.max(startSec, Math.max(batchStartSec, batchEndSec));
  if (endSec - startSec <= 0.01) {
    return true;
  }
  for (const range of ranges) {
    if (startSec >= range.start_sec - 0.01 && endSec <= range.end_sec + 0.01) {
      return true;
    }
  }
  return false;
}

export function normalizeValidRange(input: ValidRangeLike): ValidRangeLike {
  const startSec = Number.isFinite(input.start_sec) ? input.start_sec : 0;
  const endSec = Number.isFinite(input.end_sec) ? input.end_sec : startSec;
  const normalizedStart = Math.max(0, Math.min(startSec, endSec));
  const normalizedEnd = Math.max(normalizedStart, Math.max(startSec, endSec));
  return {
    start_sec: Number(normalizedStart.toFixed(3)),
    end_sec: Number(normalizedEnd.toFixed(3)),
  };
}

export function upsertValidRange(
  ranges: ValidRangeLike[],
  incoming: ValidRangeLike,
): { ranges: ValidRangeLike[]; changed: boolean } {
  const normalizedIncoming = normalizeValidRange(incoming);
  const merged = mergeValidRanges([...ranges, normalizedIncoming]);
  if (merged.length !== ranges.length) {
    return { ranges: merged, changed: true };
  }
  for (let index = 0; index < merged.length; index += 1) {
    const current = merged[index];
    const previous = ranges[index];
    if (
      !previous ||
      current.start_sec !== previous.start_sec ||
      current.end_sec !== previous.end_sec
    ) {
      return { ranges: merged, changed: true };
    }
  }
  return { ranges, changed: false };
}

export function toCueRecord(
  cue: AppendSubtitlePersistenceRequestDto["cues"][number],
): SubtitleCueRecordLike {
  return {
    id: cue.id,
    start_sec: cue.start_sec,
    end_sec: cue.end_sec,
    text: cue.text,
    lang: cue.lang,
    speaker: cue.speaker,
    line: cue.line,
    speaker_changed: cue.speaker_changed,
    speaker_similarity: cue.speaker_similarity,
  };
}

export function cueOverlapsRange(
  cue: SubtitleCueRecordLike,
  rangeStartSec: number,
  rangeEndSec: number,
): boolean {
  return (
    cue.end_sec >= rangeStartSec - 0.01 && cue.start_sec <= rangeEndSec + 0.01
  );
}

export function mergeCueRanges(
  cues: SubtitleCueRecordLike[],
  maxGapSec = 0.35,
): CueRangeLike[] {
  if (cues.length === 0) {
    return [];
  }
  const sorted = [...cues].sort(
    (left, right) => left.start_sec - right.start_sec,
  );
  const ranges: CueRangeLike[] = [];
  for (const cue of sorted) {
    const previous = ranges[ranges.length - 1];
    if (!previous) {
      ranges.push({ startSec: cue.start_sec, endSec: cue.end_sec });
      continue;
    }
    if (cue.start_sec <= previous.endSec + maxGapSec) {
      previous.endSec = Math.max(previous.endSec, cue.end_sec);
    } else {
      ranges.push({ startSec: cue.start_sec, endSec: cue.end_sec });
    }
  }
  return ranges;
}

export function isCueAtTimeline(
  cue: SubtitleCueRecordLike,
  timelineSec: number,
): boolean {
  return (
    cue.start_sec - 0.02 <= timelineSec && cue.end_sec + 0.02 >= timelineSec
  );
}

function toCueDedupKey(cue: SubtitleCueRecordLike): string {
  const start = Math.round(cue.start_sec * 1000);
  const end = Math.round(cue.end_sec * 1000);
  const text = cue.text.trim().toLowerCase().replace(/\s+/g, " ");
  return `${start}|${end}|${text}`;
}

export function dedupeCuesByTimeAndText(
  cues: SubtitleCueRecordLike[],
): SubtitleCueRecordLike[] {
  if (cues.length <= 1) {
    return cues;
  }
  const mergedById = new Map<string, SubtitleCueRecordLike>();
  for (const cue of cues) {
    mergedById.set(cue.id, cue);
  }
  const mergedByTimeline = new Map<string, SubtitleCueRecordLike>();
  for (const cue of mergedById.values()) {
    mergedByTimeline.set(toCueDedupKey(cue), cue);
  }
  const ordered = Array.from(mergedByTimeline.values()).sort(
    (left, right) => left.start_sec - right.start_sec,
  );
  const deduped: SubtitleCueRecordLike[] = [];
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
  return deduped;
}
