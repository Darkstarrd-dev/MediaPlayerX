export interface SubtitleCueDedupLike {
  start_sec: number;
  end_sec: number;
  text: string;
  lang: string | null;
  speaker?: number | null;
  line?: "A" | "B";
  speaker_changed?: boolean;
  speaker_similarity?: number;
}

export function normalizeCueTextForDedup(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "")
    .trim();
}

export function computeDiceSimilarity(left: string, right: string): number {
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
      (sum, char) => sum + (rightSet.has(char) ? 1 : 0),
      0,
    );
    return hit / Math.max(leftChars.length, rightChars.length);
  }

  const leftBigrams = new Map<string, number>();
  for (let index = 0; index < leftChars.length - 1; index += 1) {
    const key = `${leftChars[index]}${leftChars[index + 1]}`;
    leftBigrams.set(key, (leftBigrams.get(key) ?? 0) + 1);
  }

  let intersection = 0;
  let rightCount = 0;
  for (let index = 0; index < rightChars.length - 1; index += 1) {
    const key = `${rightChars[index]}${rightChars[index + 1]}`;
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

export function computeCueTextSimilarity(
  leftText: string,
  rightText: string,
): number {
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

export function cueOverlapRatio(
  left: Pick<SubtitleCueDedupLike, "start_sec" | "end_sec">,
  right: Pick<SubtitleCueDedupLike, "start_sec" | "end_sec">,
): number {
  const overlapStart = Math.max(left.start_sec, right.start_sec);
  const overlapEnd = Math.min(left.end_sec, right.end_sec);
  const overlap = Math.max(0, overlapEnd - overlapStart);
  const leftDuration = Math.max(0.05, left.end_sec - left.start_sec);
  const rightDuration = Math.max(0.05, right.end_sec - right.start_sec);
  return overlap / Math.min(leftDuration, rightDuration);
}

export function areLikelyDuplicateCue(
  left: SubtitleCueDedupLike,
  right: SubtitleCueDedupLike,
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

export function mergeDuplicateCues<T extends SubtitleCueDedupLike>(
  base: T,
  incoming: T,
): T {
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
