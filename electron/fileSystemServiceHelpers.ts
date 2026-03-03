import { createHash } from "node:crypto";
import path from "node:path";

import {
  deriveWorkTitleFromFileName,
  matchesFeatureFilter,
  normalizeFeatureFilter,
  normalizeMetadataTags,
  normalizeMetadataText,
  syncPackageNameFromWorkTitle,
} from "../src/contracts/backend.shared";

export function normalizePathKey(value: string): string {
  return value.split(path.sep).join("/");
}

export function normalizeAllowlistKey(value: string): string {
  const resolved = normalizePathKey(path.resolve(value));
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

export function makeStableId(prefix: string, value: string): string {
  const hash = createHash("sha1").update(value).digest("hex").slice(0, 12);
  return `${prefix}-${hash}`;
}

export function toAbsoluteTreePath(targetPath: string): string[] {
  const resolved = normalizePathKey(path.resolve(targetPath));

  if (/^[a-zA-Z]:\//.test(resolved)) {
    const drive = resolved.slice(0, 2);
    const rest = resolved.slice(3);
    const segments = rest
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean);
    return segments.length > 0 ? [drive, ...segments] : [drive];
  }

  if (resolved.startsWith("//")) {
    const parts = resolved
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      const uncRoot = `//${parts[0]}/${parts[1]}`;
      return parts.length > 2 ? [uncRoot, ...parts.slice(2)] : [uncRoot];
    }
    return [resolved];
  }

  if (resolved.startsWith("/")) {
    const parts = resolved
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean);
    return parts.length > 0 ? ["/", ...parts] : ["/"];
  }

  const parts = resolved
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [path.basename(targetPath)];
}

export function toSafeSizeKb(sizeBytes: number): number {
  return Math.max(0, Math.ceil(sizeBytes / 1024));
}

export function toSafeSizeMb(sizeBytes: number): number {
  return Math.max(0, Math.ceil(sizeBytes / (1024 * 1024)));
}

export {
  matchesFeatureFilter,
  normalizeFeatureFilter,
  normalizeMetadataTags,
  normalizeMetadataText,
  syncPackageNameFromWorkTitle,
};

export function deriveVideoWorkTitleFromFileName(fileName: string): string {
  return deriveWorkTitleFromFileName(fileName);
}

export function isPathInsideRoot(
  rootDir: string,
  absolutePath: string,
): boolean {
  const normalizedRoot = path.resolve(rootDir);
  const normalizedTarget = path.resolve(absolutePath);
  const comparableRoot =
    process.platform === "win32"
      ? normalizedRoot.toLowerCase()
      : normalizedRoot;
  const comparableTarget =
    process.platform === "win32"
      ? normalizedTarget.toLowerCase()
      : normalizedTarget;
  const relative = path.relative(comparableRoot, comparableTarget);
  if (relative.length === 0) {
    return true;
  }
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

export function detectMimeTypeByExtension(
  extension: string,
  mediaType: "image" | "video" | "audio" | "subtitle",
): string {
  const lowerExt = extension.toLowerCase();
  if (mediaType === "image") {
    if (lowerExt === ".jpg" || lowerExt === ".jpeg") {
      return "image/jpeg";
    }
    if (lowerExt === ".png") {
      return "image/png";
    }
    if (lowerExt === ".webp") {
      return "image/webp";
    }
    if (lowerExt === ".gif") {
      return "image/gif";
    }
    if (lowerExt === ".bmp") {
      return "image/bmp";
    }
    return "application/octet-stream";
  }

  if (mediaType === "video") {
    if (lowerExt === ".mp4") {
      return "video/mp4";
    }
    if (lowerExt === ".webm") {
      return "video/webm";
    }
    if (lowerExt === ".mkv") {
      return "video/x-matroska";
    }
    if (lowerExt === ".mov") {
      return "video/quicktime";
    }
    return "application/octet-stream";
  }

  if (mediaType === "audio") {
    if (lowerExt === ".mp3") {
      return "audio/mpeg";
    }
    if (lowerExt === ".flac") {
      return "audio/flac";
    }
    if (lowerExt === ".wav") {
      return "audio/wav";
    }
    if (lowerExt === ".ogg") {
      return "audio/ogg";
    }
    if (lowerExt === ".m4a") {
      return "audio/mp4";
    }
    if (lowerExt === ".opus") {
      return "audio/opus";
    }
    if (lowerExt === ".aac") {
      return "audio/aac";
    }
    if (lowerExt === ".ape") {
      return "audio/ape";
    }
    if (lowerExt === ".wv") {
      return "audio/wavpack";
    }
    if (lowerExt === ".tta") {
      return "audio/x-tta";
    }
    if (lowerExt === ".tak") {
      return "audio/x-tak";
    }
    if (lowerExt === ".shn") {
      return "audio/x-shorten";
    }
    if (lowerExt === ".dsf") {
      return "audio/x-dsf";
    }
    if (lowerExt === ".dff") {
      return "audio/x-dff";
    }
    if (lowerExt === ".iso") {
      return "application/x-iso9660-image";
    }
    return "application/octet-stream";
  }

  if (lowerExt === ".vtt") {
    return "text/vtt";
  }
  if (lowerExt === ".srt") {
    return "application/x-subrip";
  }
  if (lowerExt === ".ass" || lowerExt === ".ssa") {
    return "text/x-ssa";
  }
  return "application/octet-stream";
}

export function toSafeFsName(value: string): string {
  return (
    value
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/^_+/, "")
      .slice(0, 96) || "archive"
  );
}

export function toDeterministicCoverColor(videoId: string): string {
  const hash = makeStableId("cover", videoId);
  let hue = 0;
  for (let index = 0; index < hash.length; index += 1) {
    hue = (hue * 31 + hash.charCodeAt(index)) % 360;
  }
  return `hsl(${hue}, 44%, 40%)`;
}
