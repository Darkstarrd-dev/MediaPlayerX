import { promises as fs } from "node:fs";
import path from "node:path";

export function normalizePersistenceLocaleTag(rawLanguage: string): string {
  const input = rawLanguage.trim();
  if (!input) {
    return "auto";
  }
  if (input.toLowerCase() === "auto") {
    return "auto";
  }

  const cleaned = input.replace(/_/g, "-").replace(/[^A-Za-z0-9-]/g, "");
  const parts = cleaned.split("-").filter((part) => part.length > 0);
  if (parts.length === 0) {
    return "auto";
  }

  const normalized = parts.map((part, index) => {
    if (index === 0) {
      return part.toLowerCase();
    }
    if (part.length === 2) {
      return part.toUpperCase();
    }
    return part.toLowerCase();
  });
  return normalized.join("-");
}

export function resolveAutoSubtitlePath(
  videoPath: string,
  localeTag: string,
): string {
  const videoDir = path.dirname(videoPath);
  const stem = path.basename(videoPath, path.extname(videoPath));
  return path.join(videoDir, `${stem}.auto-live.${localeTag}.srt`);
}

function normalizePathForCompare(inputPath: string): string {
  return path
    .resolve(inputPath)
    .replace(/[\\/]+$/, "")
    .toLowerCase();
}

export function resolvePersistableVideoPath(rawPath: string): string | null {
  const trimmed = rawPath.trim();
  if (!trimmed) {
    return null;
  }
  const resolved = path.resolve(trimmed);
  const parsed = path.parse(resolved);
  const normalizedResolved = normalizePathForCompare(resolved);
  const normalizedRoot = normalizePathForCompare(parsed.root);
  if (!parsed.base || normalizedResolved === normalizedRoot) {
    return null;
  }
  return resolved;
}

export async function ensureParentDirectory(filePath: string): Promise<void> {
  const parentDir = path.dirname(filePath);
  const parsed = path.parse(parentDir);
  const normalizedParent = normalizePathForCompare(parentDir);
  const normalizedRoot = normalizePathForCompare(parsed.root);
  if (normalizedParent === normalizedRoot) {
    return;
  }
  await fs.mkdir(parentDir, { recursive: true });
}
