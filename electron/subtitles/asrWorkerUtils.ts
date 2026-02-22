export function normalizeRecognizedText(value: string | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) {
    return "";
  }
  return raw
    .replace(/<\|[^|]+\|>/g, "")
    .replace(/<[a-z][^>]{0,80}>/gi, "")
    .replace(/<\/[a-z][^>]{0,80}>/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeLangTag(value: string | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) {
    return null;
  }

  const tagged = /^<\|([^|]+)\|>$/.exec(raw);
  if (tagged?.[1]) {
    return tagged[1].toLowerCase();
  }

  return raw.toLowerCase();
}

export function normalizeRequestedLanguage(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "zh" ||
    normalized === "en" ||
    normalized === "ja" ||
    normalized === "ko" ||
    normalized === "yue"
  ) {
    return normalized;
  }
  return "auto";
}

export function computeTextDelta(
  previousText: string,
  currentText: string,
): string {
  if (!currentText) {
    return "";
  }
  if (!previousText) {
    return currentText;
  }
  if (currentText === previousText) {
    return "";
  }
  if (currentText.startsWith(previousText)) {
    return currentText.slice(previousText.length).trim();
  }

  const previousTail = previousText.slice(
    Math.max(0, previousText.length - 16),
  );
  const overlapIndex = currentText.indexOf(previousTail);
  if (overlapIndex >= 0) {
    return currentText.slice(overlapIndex + previousTail.length).trim();
  }

  return currentText;
}

export function computeOverlapDelta(
  previousText: string,
  currentText: string,
  maxOverlapChars = 64,
): { kind: "none" | "append" | "replace"; delta: string } {
  if (!currentText) {
    return { kind: "none", delta: "" };
  }
  if (!previousText) {
    return { kind: "append", delta: currentText };
  }
  if (currentText === previousText) {
    return { kind: "none", delta: "" };
  }

  if (currentText.startsWith(previousText)) {
    return {
      kind: "append",
      delta: currentText.slice(previousText.length).trim(),
    };
  }

  const previousChars = Array.from(previousText);
  const currentChars = Array.from(currentText);
  const overlapLimit = Math.min(
    maxOverlapChars,
    previousChars.length,
    currentChars.length,
  );
  for (let overlap = overlapLimit; overlap >= 1; overlap -= 1) {
    const prevSuffix = previousChars
      .slice(previousChars.length - overlap)
      .join("");
    const currPrefix = currentChars.slice(0, overlap).join("");
    if (prevSuffix === currPrefix) {
      return {
        kind: "append",
        delta: currentChars.slice(overlap).join("").trim(),
      };
    }
  }

  const rollback = currentChars.length < previousChars.length * 0.7;
  if (rollback) {
    return { kind: "replace", delta: currentText };
  }
  return { kind: "replace", delta: currentText };
}

export function calculateRms(samples: Float32Array): number {
  if (samples.length === 0) {
    return 0;
  }

  let squareSum = 0;
  for (let i = 0; i < samples.length; i += 1) {
    squareSum += samples[i] * samples[i];
  }

  return Math.sqrt(squareSum / samples.length);
}

export function downmixToMono(
  interleaved: Float32Array,
  channelCount: number,
): Float32Array {
  if (channelCount <= 1) {
    return interleaved;
  }
  if (interleaved.length === 0) {
    return interleaved;
  }

  const frameCount = Math.floor(interleaved.length / channelCount);
  const mono = new Float32Array(frameCount);
  for (let frame = 0; frame < frameCount; frame += 1) {
    let sum = 0;
    for (let channel = 0; channel < channelCount; channel += 1) {
      sum += interleaved[frame * channelCount + channel] ?? 0;
    }
    mono[frame] = sum / channelCount;
  }
  return mono;
}

export function decodeFloat32Buffer(chunkBuffer: Buffer): Float32Array {
  if (chunkBuffer.byteLength === 0) {
    return new Float32Array(0);
  }
  const view = new Float32Array(
    chunkBuffer.buffer,
    chunkBuffer.byteOffset,
    Math.floor(chunkBuffer.byteLength / Float32Array.BYTES_PER_ELEMENT),
  );
  return new Float32Array(view);
}

export function makeCueId(sessionId: string, cueSeed: number): string {
  return `${sessionId}:${cueSeed}`;
}

export function charLength(value: string): number {
  return Array.from(value).length;
}

export function sliceTailByChars(value: string, count: number): string {
  if (count <= 0) {
    return "";
  }
  const chars = Array.from(value);
  return chars.slice(Math.max(0, chars.length - count)).join("");
}

export function pickLatestSimpleSnippet(
  fullText: string,
  maxChars = 28,
): string {
  const normalized = fullText.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  const separators = [
    "。",
    "！",
    "？",
    "!",
    "?",
    ".",
    ";",
    "；",
    ",",
    "，",
    "、",
  ];
  const chars = Array.from(normalized);
  let lastSeparatorPos = -1;
  for (let i = chars.length - 1; i >= 0; i -= 1) {
    if (separators.includes(chars[i] ?? "")) {
      lastSeparatorPos = i;
      break;
    }
  }

  if (lastSeparatorPos >= 0 && lastSeparatorPos + 1 < chars.length) {
    const tail = chars
      .slice(lastSeparatorPos + 1)
      .join("")
      .trim();
    if (tail) {
      return sliceTailByChars(tail, maxChars);
    }
  }

  return sliceTailByChars(normalized, maxChars);
}

export function splitCompletedSentence(pendingText: string): {
  completed: string | null;
  rest: string;
} {
  const normalized = pendingText.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return { completed: null, rest: "" };
  }

  const separators = ["。", "！", "？", "!", "?", "."];
  const chars = Array.from(normalized);
  let lastSeparator = -1;
  for (let i = 0; i < chars.length; i += 1) {
    if (separators.includes(chars[i] ?? "")) {
      lastSeparator = i;
    }
  }

  if (lastSeparator < 0) {
    return { completed: null, rest: normalized };
  }

  const completed = chars
    .slice(0, lastSeparator + 1)
    .join("")
    .trim();
  const rest = chars
    .slice(lastSeparator + 1)
    .join("")
    .trim();
  return {
    completed: completed || null,
    rest,
  };
}

export function sanitizePayloadForPostMessage(payload: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(payload));
  } catch {
    return payload;
  }
}

export function normalizeEmbedding(
  value: Float32Array | number[] | null | undefined,
): Float32Array | null {
  if (!value) {
    return null;
  }
  const output =
    value instanceof Float32Array ? value : new Float32Array(value);
  if (output.length === 0) {
    return null;
  }
  return output;
}

export function cosineSimilarity(
  left: Float32Array,
  right: Float32Array,
): number {
  const size = Math.min(left.length, right.length);
  if (size === 0) {
    return -1;
  }

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let i = 0; i < size; i += 1) {
    const l = left[i] ?? 0;
    const r = right[i] ?? 0;
    dot += l * r;
    leftNorm += l * l;
    rightNorm += r * r;
  }

  if (leftNorm <= 0 || rightNorm <= 0) {
    return -1;
  }
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

export function computeMedian(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

export function toFiniteNumbers(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const numbers: number[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const candidate = Number(value[i]);
    if (Number.isFinite(candidate)) {
      numbers.push(candidate);
    }
  }
  return numbers;
}

export function normalizeTokenText(value: string): string {
  return value
    .replace(/<\|[^|]+\|>/g, "")
    .replace(/<[a-z][^>]{0,80}>/gi, "")
    .replace(/<\/[a-z][^>]{0,80}>/gi, "")
    .replaceAll("▁", " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function clampTime(value: number, durationSec: number): number {
  const maxSec = Math.max(0, durationSec);
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(Math.max(value, 0), maxSec + 1);
}
