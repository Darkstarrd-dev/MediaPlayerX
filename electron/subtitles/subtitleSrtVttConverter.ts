function stripUtf8Bom(text: string): string {
  return text.replace(/^\uFEFF/, "");
}

function decodeUtf16Be(buffer: Buffer): string {
  const payload = buffer.subarray(2);
  const normalized = Buffer.alloc(payload.length - (payload.length % 2));
  for (let index = 0; index < normalized.length; index += 2) {
    normalized[index] = payload[index + 1];
    normalized[index + 1] = payload[index];
  }
  return stripUtf8Bom(normalized.toString("utf16le"));
}

export function decodeSubtitleText(rawBuffer: Buffer): string {
  if (rawBuffer.length >= 2) {
    if (rawBuffer[0] === 0xff && rawBuffer[1] === 0xfe) {
      return stripUtf8Bom(rawBuffer.toString("utf16le"));
    }
    if (rawBuffer[0] === 0xfe && rawBuffer[1] === 0xff) {
      return decodeUtf16Be(rawBuffer);
    }
  }
  if (
    rawBuffer.length >= 3 &&
    rawBuffer[0] === 0xef &&
    rawBuffer[1] === 0xbb &&
    rawBuffer[2] === 0xbf
  ) {
    return stripUtf8Bom(rawBuffer.toString("utf8"));
  }
  return stripUtf8Bom(rawBuffer.toString("utf8"));
}

function parseTimestampToSeconds(rawValue: string): number | null {
  const value = rawValue.trim();
  const hhmmss = /^(\d{1,3}):(\d{2}):(\d{2})[,.](\d{1,3})$/.exec(value);
  if (hhmmss) {
    const hours = Number(hhmmss[1]);
    const minutes = Number(hhmmss[2]);
    const seconds = Number(hhmmss[3]);
    const milliseconds = Number(hhmmss[4].padEnd(3, "0"));
    if (
      [hours, minutes, seconds, milliseconds].some(
        (part) => !Number.isFinite(part),
      )
    ) {
      return null;
    }
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
  }

  const mmss = /^(\d{1,3}):(\d{2})[,.](\d{1,3})$/.exec(value);
  if (!mmss) {
    return null;
  }
  const minutes = Number(mmss[1]);
  const seconds = Number(mmss[2]);
  const milliseconds = Number(mmss[3].padEnd(3, "0"));
  if ([minutes, seconds, milliseconds].some((part) => !Number.isFinite(part))) {
    return null;
  }
  return minutes * 60 + seconds + milliseconds / 1000;
}

function formatVttTimestamp(secondsValue: number): string {
  const clamped = Math.max(0, Number.isFinite(secondsValue) ? secondsValue : 0);
  const totalMilliseconds = Math.round(clamped * 1000);
  const milliseconds = totalMilliseconds % 1000;
  const totalSeconds = Math.floor(totalMilliseconds / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}

export function convertSrtTextToVtt(rawSrtText: string): string {
  const normalizedText = stripUtf8Bom(rawSrtText)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
  if (!normalizedText) {
    throw new Error("字幕转换失败：SRT 内容为空");
  }

  const outputLines: string[] = ["WEBVTT", ""];
  const blocks = normalizedText
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
  let cueCount = 0;

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0);
    if (lines.length === 0) {
      continue;
    }

    let cursor = 0;
    while (cursor < lines.length && lines[cursor].trim().startsWith("#")) {
      cursor += 1;
    }
    if (cursor >= lines.length) {
      continue;
    }
    if (/^\d+$/.test(lines[cursor].trim())) {
      cursor += 1;
    }
    if (cursor >= lines.length) {
      continue;
    }

    const timingMatch = /^(\S+)\s*-->\s*(\S+)(?:\s+(.*))?$/.exec(
      lines[cursor].trim(),
    );
    if (!timingMatch) {
      continue;
    }

    const startSeconds = parseTimestampToSeconds(timingMatch[1]);
    const endSeconds = parseTimestampToSeconds(timingMatch[2]);
    if (startSeconds === null || endSeconds === null) {
      continue;
    }

    const textLines = lines.slice(cursor + 1);
    if (textLines.every((line) => line.trim().length === 0)) {
      continue;
    }

    const safeEndSeconds = Math.max(endSeconds, startSeconds + 0.001);
    const timingLine = `${formatVttTimestamp(startSeconds)} --> ${formatVttTimestamp(safeEndSeconds)}${timingMatch[3] ? ` ${timingMatch[3].trim()}` : ""}`;
    outputLines.push(timingLine);
    outputLines.push(...textLines);
    outputLines.push("");
    cueCount += 1;
  }

  if (cueCount <= 0) {
    throw new Error("字幕转换失败：未解析到有效的 SRT 时间轴");
  }

  return `${outputLines.join("\n").trimEnd()}\n`;
}
