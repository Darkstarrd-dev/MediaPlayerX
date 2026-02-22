interface RangeLike {
  start_sec: number;
  end_sec: number;
}

interface CueLike {
  start_sec: number;
  end_sec: number;
  text: string;
}

export function formatSrtTimestamp(seconds: number): string {
  const clamped = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const totalMs = Math.floor(clamped * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const sec = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const min = totalMin % 60;
  const hour = Math.floor(totalMin / 60);
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

export function cuesToSrtText(
  cues: CueLike[],
  validRanges: RangeLike[],
  validPlaybackRateThreshold: number,
): string {
  const lines: string[] = [];
  if (validRanges.length > 0) {
    const rangesStr = validRanges
      .map(
        (range) => `${range.start_sec.toFixed(1)}-${range.end_sec.toFixed(1)}`,
      )
      .join(",");
    lines.push(`# ValidRanges: ${rangesStr}`);
  }
  lines.push(
    `# ValidPlaybackRateThreshold: ${validPlaybackRateThreshold.toFixed(1)}`,
  );
  lines.push("");

  let cueIndex = 1;
  for (const cue of cues) {
    const text = cue.text.trim();
    if (!text) {
      continue;
    }
    lines.push(String(cueIndex));
    lines.push(
      `${formatSrtTimestamp(cue.start_sec)} --> ${formatSrtTimestamp(Math.max(cue.end_sec, cue.start_sec + 0.2))}`,
    );
    lines.push(text);
    lines.push("");
    cueIndex += 1;
  }
  return lines.join("\n").trim();
}

export function parseSrtMetadata(rawText: string): {
  validRanges: RangeLike[];
  validPlaybackRateThreshold: number;
} {
  const lines = rawText.split("\n");
  const validRanges: RangeLike[] = [];
  let validPlaybackRateThreshold = 1.0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("#")) {
      break;
    }

    const rangesMatch = trimmed.match(/^#\s*ValidRanges:\s*(.+)$/);
    if (rangesMatch) {
      const rangesStr = rangesMatch[1].trim();
      const rangeParts = rangesStr.split(",");
      for (const part of rangeParts) {
        const [startStr, endStr] = part.trim().split("-");
        const startSec = Number(startStr);
        const endSec = Number(endStr);
        if (
          Number.isFinite(startSec) &&
          Number.isFinite(endSec) &&
          startSec >= 0 &&
          endSec >= startSec
        ) {
          validRanges.push({ start_sec: startSec, end_sec: endSec });
        }
      }
      continue;
    }

    const thresholdMatch = trimmed.match(
      /^#\s*ValidPlaybackRateThreshold:\s*(.+)$/,
    );
    if (thresholdMatch) {
      const value = Number(thresholdMatch[1].trim());
      if (Number.isFinite(value) && value > 0) {
        validPlaybackRateThreshold = value;
      }
      continue;
    }
  }

  return { validRanges, validPlaybackRateThreshold };
}

export function parseSrtTimestamp(timestamp: string): number {
  const match = timestamp.trim().match(/^(\d+):(\d+):(\d+)[,.](\d{1,3})$/);
  if (!match) {
    return Number.NaN;
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3]);
  const ms = Number(match[4].padEnd(3, "0"));
  if (![hour, minute, second, ms].every((value) => Number.isFinite(value))) {
    return Number.NaN;
  }
  return hour * 3600 + minute * 60 + second + ms / 1000;
}
