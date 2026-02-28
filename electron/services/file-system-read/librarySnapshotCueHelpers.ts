import path from "node:path";

import type { AudioItemDto } from "../../../src/contracts/backend";

export interface ParsedCueTrackRecord {
  order: number;
  trackNo: number;
  audioPath: string;
  title: string;
  performer: string;
  startSec: number;
}

export interface ParsedCueFileRecord {
  album: string;
  performer: string;
  tracks: ParsedCueTrackRecord[];
}

interface CueDecodeCandidate {
  encoding: string;
  text: string;
  trackCount: number;
  indexCount: number;
  fileCount: number;
  titleCount: number;
  performerCount: number;
  replacementCount: number;
  nullCharCount: number;
  weirdControlCharCount: number;
  suspiciousMojibakeCount: number;
  score: number;
}

function swapUtf16ByteOrder(rawBuffer: Buffer): Buffer {
  const swapped = Buffer.allocUnsafe(rawBuffer.length);
  for (let index = 0; index + 1 < rawBuffer.length; index += 2) {
    swapped[index] = rawBuffer[index + 1];
    swapped[index + 1] = rawBuffer[index];
  }
  if (rawBuffer.length % 2 === 1) {
    swapped[rawBuffer.length - 1] = rawBuffer[rawBuffer.length - 1];
  }
  return swapped;
}

function countMatches(value: string, pattern: RegExp): number {
  const matched = value.match(pattern);
  return matched ? matched.length : 0;
}

function countNullChars(value: string): number {
  let count = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) === 0) {
      count += 1;
    }
  }
  return count;
}

function countWeirdControlChars(value: string): number {
  let count = 0;
  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.charCodeAt(index);
    const isNull = codePoint === 0;
    const isAsciiControlRangeA = codePoint >= 1 && codePoint <= 8;
    const isAsciiControlRangeB = codePoint >= 11 && codePoint <= 12;
    const isAsciiControlRangeC = codePoint >= 14 && codePoint <= 31;
    if (
      isNull ||
      isAsciiControlRangeA ||
      isAsciiControlRangeB ||
      isAsciiControlRangeC
    ) {
      count += 1;
    }
  }
  return count;
}

function scoreCueDecodedText(
  value: string,
): Omit<CueDecodeCandidate, "encoding" | "text"> {
  let score = 0;

  const trackCount = countMatches(value, /^\s*TRACK\s+\d+/gim);
  const indexCount = countMatches(
    value,
    /^\s*INDEX\s+\d+\s+\d+:\d{2}:\d{2}/gim,
  );
  const fileCount = countMatches(value, /^\s*FILE\s+/gim);
  const titleCount = countMatches(value, /^\s*TITLE\s+/gim);
  const performerCount = countMatches(value, /^\s*PERFORMER\s+/gim);

  score += trackCount * 80;
  score += indexCount * 60;
  score += fileCount * 30;
  score += titleCount * 10;
  score += performerCount * 10;

  const replacementCount = countMatches(value, /\uFFFD/g);
  score -= replacementCount * 120;

  const suspiciousMojibakeCount = countMatches(value, /(?:Ã.|Â.|ã.|â.)/g);
  score -= suspiciousMojibakeCount * 50;

  const nullCharCount = countNullChars(value);
  score -= nullCharCount * 220;

  const weirdControlCharCount = countWeirdControlChars(value);
  score -= weirdControlCharCount * 60;

  const knownKeywordCount = countMatches(
    value,
    /^\s*(REM|FILE|TRACK|INDEX|TITLE|PERFORMER|CATALOG|ISRC)\b/gim,
  );
  if (knownKeywordCount === 0) {
    score -= 280;
  }

  if (trackCount > 0 && indexCount > 0) {
    score += 320;
  }

  return {
    trackCount,
    indexCount,
    fileCount,
    titleCount,
    performerCount,
    replacementCount,
    nullCharCount,
    weirdControlCharCount,
    suspiciousMojibakeCount,
    score,
  };
}

function decodeCueBufferByEncoding(
  rawBuffer: Buffer,
  encoding:
    | "utf8"
    | "utf16le"
    | "utf16be"
    | "shift_jis"
    | "cp932"
    | "euc-jp"
    | "iso-2022-jp"
    | "gb18030",
): string {
  if (encoding === "utf8") {
    return rawBuffer.toString("utf8");
  }
  if (encoding === "utf16le") {
    return rawBuffer.toString("utf16le");
  }
  if (encoding === "utf16be") {
    return swapUtf16ByteOrder(rawBuffer).toString("utf16le");
  }
  return new TextDecoder(encoding).decode(rawBuffer);
}

function detectLikelyUtf16EncodingWithoutBom(
  rawBuffer: Buffer,
): "utf16le" | "utf16be" | null {
  const pairLimit = Math.min(2048, Math.floor(rawBuffer.length / 2));
  if (pairLimit <= 8) {
    return null;
  }

  let leAsciiPairs = 0;
  let beAsciiPairs = 0;
  let leZeroHighBytePairs = 0;
  let beZeroHighBytePairs = 0;

  for (let pairIndex = 0; pairIndex < pairLimit; pairIndex += 1) {
    const lowByte = rawBuffer[pairIndex * 2];
    const highByte = rawBuffer[pairIndex * 2 + 1];
    if (highByte === 0) {
      leZeroHighBytePairs += 1;
      if (lowByte >= 0x09 && lowByte <= 0x7e) {
        leAsciiPairs += 1;
      }
    }
    if (lowByte === 0) {
      beZeroHighBytePairs += 1;
      if (highByte >= 0x09 && highByte <= 0x7e) {
        beAsciiPairs += 1;
      }
    }
  }

  if (
    leAsciiPairs >= 16 &&
    leAsciiPairs >= beAsciiPairs * 2 &&
    leZeroHighBytePairs >= pairLimit * 0.2
  ) {
    return "utf16le";
  }
  if (
    beAsciiPairs >= 16 &&
    beAsciiPairs >= leAsciiPairs * 2 &&
    beZeroHighBytePairs >= pairLimit * 0.2
  ) {
    return "utf16be";
  }
  return null;
}

export function decodeCueTextFromBuffer(rawBuffer: Buffer): {
  text: string;
  encoding: string;
} {
  const bomUtf8 =
    rawBuffer.length >= 3 &&
    rawBuffer[0] === 0xef &&
    rawBuffer[1] === 0xbb &&
    rawBuffer[2] === 0xbf;
  const bomUtf16Le =
    rawBuffer.length >= 2 && rawBuffer[0] === 0xff && rawBuffer[1] === 0xfe;
  const bomUtf16Be =
    rawBuffer.length >= 2 && rawBuffer[0] === 0xfe && rawBuffer[1] === 0xff;

  if (bomUtf8) {
    return { text: rawBuffer.toString("utf8"), encoding: "utf8-bom" };
  }
  if (bomUtf16Le) {
    return { text: rawBuffer.toString("utf16le"), encoding: "utf16le-bom" };
  }
  if (bomUtf16Be) {
    return {
      text: swapUtf16ByteOrder(rawBuffer).toString("utf16le"),
      encoding: "utf16be-bom",
    };
  }

  const likelyUtf16WithoutBom = detectLikelyUtf16EncodingWithoutBom(rawBuffer);
  if (likelyUtf16WithoutBom === "utf16le") {
    return {
      text: rawBuffer.toString("utf16le"),
      encoding: "utf16le-heuristic",
    };
  }
  if (likelyUtf16WithoutBom === "utf16be") {
    return {
      text: swapUtf16ByteOrder(rawBuffer).toString("utf16le"),
      encoding: "utf16be-heuristic",
    };
  }

  const encodings: Array<
    "utf8" | "shift_jis" | "cp932" | "euc-jp" | "iso-2022-jp" | "gb18030"
  > = ["utf8", "shift_jis", "cp932", "euc-jp", "iso-2022-jp", "gb18030"];

  let bestCandidate: CueDecodeCandidate | null = null;

  for (const encoding of encodings) {
    let decoded = "";
    try {
      decoded = decodeCueBufferByEncoding(rawBuffer, encoding);
    } catch {
      continue;
    }

    const metrics = scoreCueDecodedText(decoded);
    const candidate: CueDecodeCandidate = {
      encoding,
      text: decoded,
      ...metrics,
    };

    if (!bestCandidate || candidate.score > bestCandidate.score) {
      bestCandidate = candidate;
      continue;
    }

    if (candidate.score === bestCandidate.score) {
      const candidateStructure =
        candidate.trackCount + candidate.indexCount + candidate.fileCount;
      const bestStructure =
        bestCandidate.trackCount +
        bestCandidate.indexCount +
        bestCandidate.fileCount;
      if (candidateStructure > bestStructure) {
        bestCandidate = candidate;
      }
    }
  }

  if (!bestCandidate) {
    return { text: rawBuffer.toString("utf8"), encoding: "utf8-fallback" };
  }

  return {
    text: bestCandidate.text,
    encoding: bestCandidate.encoding,
  };
}

function parseCueTextValue(rawValue: string): string {
  const trimmed = rawValue.trim();
  if (trimmed.length < 2) {
    return trimmed;
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function parseCueTimestampToSec(rawValue: string): number | null {
  const match = rawValue.trim().match(/^(\d+):(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  const frames = Number(match[3]);
  if (
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds) ||
    !Number.isFinite(frames)
  ) {
    return null;
  }
  if (
    minutes < 0 ||
    seconds < 0 ||
    seconds >= 60 ||
    frames < 0 ||
    frames >= 75
  ) {
    return null;
  }

  return minutes * 60 + seconds + frames / 75;
}

function resolveCueReferencedAudioPath(
  cuePath: string,
  cueFileRawPath: string,
): string {
  const cueDirPath = path.dirname(cuePath);
  const normalizedRelativePath = cueFileRawPath
    .trim()
    .replace(/[\\/]+/g, path.sep);
  return path.resolve(cueDirPath, normalizedRelativePath);
}

export function pickSingleFileCueFallbackAudio(
  cuePath: string,
  cueDirectoryAudios: AudioItemDto[],
): AudioItemDto | null {
  if (cueDirectoryAudios.length === 0) {
    return null;
  }
  if (cueDirectoryAudios.length === 1) {
    return cueDirectoryAudios[0];
  }

  const cueBaseName = path
    .basename(cuePath, path.extname(cuePath))
    .trim()
    .toLocaleLowerCase("zh-CN");
  const sameBaseNameCandidates = cueDirectoryAudios.filter((audio) => {
    const audioBaseName = path
      .basename(audio.absolute_path, path.extname(audio.absolute_path))
      .trim()
      .toLocaleLowerCase("zh-CN");
    return audioBaseName.length > 0 && audioBaseName === cueBaseName;
  });
  if (sameBaseNameCandidates.length === 1) {
    return sameBaseNameCandidates[0];
  }

  const candidates =
    sameBaseNameCandidates.length > 1
      ? sameBaseNameCandidates
      : cueDirectoryAudios;
  let selected = candidates[0];
  for (let index = 1; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (candidate.duration_sec > selected.duration_sec) {
      selected = candidate;
    }
  }
  return selected;
}

export function pickAudioByCueBaseName(
  cuePath: string,
  audioItems: AudioItemDto[],
): AudioItemDto | null {
  if (audioItems.length === 0) {
    return null;
  }

  const cueBaseName = path
    .basename(cuePath, path.extname(cuePath))
    .trim()
    .toLocaleLowerCase("zh-CN");
  const matched = audioItems.filter((audio) => {
    const audioBaseName = path
      .basename(audio.absolute_path, path.extname(audio.absolute_path))
      .trim()
      .toLocaleLowerCase("zh-CN");
    return audioBaseName.length > 0 && audioBaseName === cueBaseName;
  });
  if (matched.length === 1) {
    return matched[0];
  }
  return null;
}

export function parseCueFileRecord(
  cuePath: string,
  rawText: string,
): ParsedCueFileRecord {
  const lines = rawText.replace(/^\uFEFF/, "").split(/\r\n|\n|\r/);
  let cueAlbum = "";
  let cuePerformer = "";
  let currentFilePath: string | null = cuePath;
  let lineOrder = 0;
  let currentTrack: {
    order: number;
    trackNo: number;
    audioPath: string | null;
    title: string;
    performer: string;
    startSec: number | null;
    firstIndexSec: number | null;
  } | null = null;

  const parsedTracks: ParsedCueTrackRecord[] = [];

  const flushTrack = () => {
    const resolvedStartSec =
      currentTrack?.startSec ?? currentTrack?.firstIndexSec ?? null;
    if (
      !currentTrack ||
      currentTrack.audioPath == null ||
      resolvedStartSec == null
    ) {
      currentTrack = null;
      return;
    }

    parsedTracks.push({
      order: currentTrack.order,
      trackNo: currentTrack.trackNo,
      audioPath: currentTrack.audioPath,
      title: currentTrack.title,
      performer: currentTrack.performer,
      startSec: resolvedStartSec,
    });
    currentTrack = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith(";") || /^REM\b/i.test(line)) {
      continue;
    }

    const fileMatch = line.match(/^FILE\s+(?:"([^"]+)"|(.+?))(?:\s+\S+)?$/i);
    if (fileMatch) {
      const fileRawPath = (fileMatch[1] ?? fileMatch[2] ?? "").trim();
      if (fileRawPath.length > 0) {
        currentFilePath = resolveCueReferencedAudioPath(cuePath, fileRawPath);
      }
      continue;
    }

    const trackMatch = line.match(/^TRACK\s+(\d+)\b(?:\s+.+)?$/i);
    if (trackMatch) {
      flushTrack();
      const trackNo = Number(trackMatch[1]);
      if (!Number.isFinite(trackNo) || trackNo <= 0) {
        continue;
      }
      currentTrack = {
        order: lineOrder,
        trackNo: Math.round(trackNo),
        audioPath: currentFilePath,
        title: "",
        performer: "",
        startSec: null,
        firstIndexSec: null,
      };
      lineOrder += 1;
      continue;
    }

    const titleMatch = line.match(/^TITLE\s+(.+)$/i);
    if (titleMatch) {
      const value = parseCueTextValue(titleMatch[1]);
      if (currentTrack) {
        currentTrack.title = value;
      } else {
        cueAlbum = value;
      }
      continue;
    }

    const performerMatch = line.match(/^PERFORMER\s+(.+)$/i);
    if (performerMatch) {
      const value = parseCueTextValue(performerMatch[1]);
      if (currentTrack) {
        currentTrack.performer = value;
      } else {
        cuePerformer = value;
      }
      continue;
    }

    const indexMatch = line.match(
      /^INDEX\s+(\d+)\s+(\d+:\d{2}:\d{2})(?:\s+.*)?$/i,
    );
    if (indexMatch && currentTrack) {
      const indexNo = Number(indexMatch[1]);
      if (!Number.isFinite(indexNo)) {
        continue;
      }
      const parsedSec = parseCueTimestampToSec(indexMatch[2]);
      if (parsedSec != null) {
        if (currentTrack.firstIndexSec == null) {
          currentTrack.firstIndexSec = parsedSec;
        }
        if (indexNo === 1) {
          currentTrack.startSec = parsedSec;
        }
      }
    }
  }

  flushTrack();

  return {
    album: cueAlbum,
    performer: cuePerformer,
    tracks: parsedTracks,
  };
}
