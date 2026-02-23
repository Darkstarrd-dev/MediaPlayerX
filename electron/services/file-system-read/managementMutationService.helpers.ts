import path from "node:path";

import type {
  LibrarySnapshotDto,
  StartImageConvertTaskRequestDto,
} from "../../../src/contracts/backend";
import { normalizeAllowlistKey } from "../../fileSystemServiceHelpers";

export interface ParsedSidebarNodeRef {
  kind: "folder" | "package" | "video" | "audio";
  pathKey: string;
}

export const ZIP_IMAGE_ENTRY_EXTENSIONS = new Set<string>([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".avif",
]);

/**
 * 数据库层面对空元数据字段使用的占位符 token 集合。
 * snapshot store / source factory 在存储时用此集合中的值替代空字符串。
 * 重命名服务用此集合判断字段是否为真实元数据。
 * 新增语言或调整占位符策略时，仅需维护此集合。
 */
export const METADATA_UNKNOWN_TOKENS: ReadonlySet<string> = new Set([
  "未知",
]);

export function isMetadataUnknownToken(value: string): boolean {
  return METADATA_UNKNOWN_TOKENS.has(value);
}

export const IMAGE_CONVERT_TARGET_EXTENSION_BY_FORMAT: Record<
  StartImageConvertTaskRequestDto["target_format"],
  string
> = {
  webp: ".webp",
  jpeg: ".jpg",
  png: ".png",
  avif: ".avif",
};

export function sanitizeTemplateHint(value: string): string {
  return value
    .replace(/\(if\s+exist\)/gi, "")
    .replace(/\(if\s+only\s+one\s+exist\)/gi, "")
    .replace(/\bautho\.jp\b/gi, "author.jp");
}

function trimResult(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function parseSidebarNodeId(
  nodeId: string,
): ParsedSidebarNodeRef | null {
  const delimiterIndex = nodeId.indexOf(":");
  if (delimiterIndex <= 0) {
    return null;
  }

  const rawKind = nodeId.slice(0, delimiterIndex);
  if (
    rawKind !== "folder" &&
    rawKind !== "package" &&
    rawKind !== "video" &&
    rawKind !== "audio"
  ) {
    return null;
  }

  const pathKey = nodeId.slice(delimiterIndex + 1);
  if (pathKey.length === 0) {
    return null;
  }

  return {
    kind: rawKind,
    pathKey,
  };
}

export function pathKeyHasPrefix(pathKey: string, prefix: string): boolean {
  if (pathKey === prefix) {
    return true;
  }
  return pathKey.startsWith(`${prefix}/`);
}

export function resolveAbsolutePathFromPathKey(pathKey: string): string {
  if (/^[a-zA-Z]:$/.test(pathKey)) {
    return path.resolve(`${pathKey}${path.sep}`);
  }
  return path.resolve(pathKey);
}

export function isFileSystemRootPath(targetPath: string): boolean {
  const resolved = path.resolve(targetPath);
  const root = path.parse(resolved).root;
  return normalizeAllowlistKey(resolved) === normalizeAllowlistKey(root);
}

export function isValidGroupName(groupName: string): boolean {
  if (!groupName || groupName === "." || groupName === "..") {
    return false;
  }
  if (groupName.includes("/") || groupName.includes("\\")) {
    return false;
  }
  return !/[:*?"<>|]/.test(groupName);
}

export function resolveSidebarNodeSourcePath(
  parsed: ParsedSidebarNodeRef,
  snapshot: LibrarySnapshotDto,
): string | null {
  if (parsed.kind === "folder") {
    return resolveAbsolutePathFromPathKey(parsed.pathKey);
  }

  if (parsed.kind === "package") {
    for (const source of snapshot.image_packages) {
      const pathKey = source.tree_path.join("/");
      if (pathKey === parsed.pathKey) {
        return source.absolute_path;
      }
    }
    for (const source of snapshot.image_directories) {
      const pathKey = source.tree_path.join("/");
      if (pathKey === parsed.pathKey) {
        return source.absolute_path;
      }
    }
    return null;
  }

  if (parsed.kind === "video") {
    for (const video of snapshot.videos) {
      const pathKey = video.tree_path.join("/");
      if (pathKey === parsed.pathKey) {
        return video.absolute_path;
      }
    }
    return null;
  }

  for (const audio of snapshot.audios ?? []) {
    const pathKey = audio.tree_path.join("/");
    if (pathKey === parsed.pathKey) {
      return audio.absolute_path;
    }
  }
  return null;
}

export function buildMetadataSynthesisName(
  parsed: ParsedSidebarNodeRef,
  snapshot: LibrarySnapshotDto,
  sourcePath: string,
): string {
  const fallbackName = path.basename(sourcePath, path.extname(sourcePath));
  const compact = (value: string | null | undefined) => value?.trim() ?? "";

  const combinePrimarySecondary = (
    primary: string,
    secondary: string,
    fallback: string,
  ): string => {
    if (primary && secondary) {
      return `${primary}(${secondary})`;
    }
    if (primary) {
      return primary;
    }
    if (secondary) {
      return secondary;
    }
    return fallback;
  };

  if (parsed.kind === "video") {
    const video = snapshot.videos.find(
      (item) => item.tree_path.join("/") === parsed.pathKey,
    );
    if (!video) {
      return fallbackName;
    }
    const author = combinePrimarySecondary(
      compact(video.author_jpn),
      compact(video.author),
      compact(video.author) || fallbackName,
    );
    const circle = combinePrimarySecondary(
      compact(video.circle_jpn),
      compact(video.circle),
      compact(video.circle) || fallbackName,
    );
    const title =
      compact(video.work_title_jpn) ||
      compact(video.work_title) ||
      fallbackName;
    return `${author}-${circle} - ${title}`;
  }

  if (parsed.kind === "package") {
    const source = [
      ...snapshot.image_packages,
      ...snapshot.image_directories,
    ].find((item) => item.tree_path.join("/") === parsed.pathKey);
    if (!source) {
      return fallbackName;
    }
    const metadata = source.external_metadata;
    const authorPrimary = compact(metadata?.artist_jpn);
    const authorSecondary = compact(metadata?.artist) || compact(source.author);
    const circlePrimary = compact(metadata?.group_name_jpn);
    const circleSecondary =
      compact(metadata?.group_name) || compact(source.circle);
    const title =
      compact(metadata?.title_jpn) ||
      compact(metadata?.title) ||
      compact(source.work_title) ||
      fallbackName;
    const author = combinePrimarySecondary(
      authorPrimary,
      authorSecondary,
      authorSecondary || fallbackName,
    );
    const circle = combinePrimarySecondary(
      circlePrimary,
      circleSecondary,
      circleSecondary || fallbackName,
    );
    return `${author}-${circle} - ${title}`;
  }

  if (parsed.kind === "audio") {
    const audio = (snapshot.audios ?? []).find(
      (item) => item.tree_path.join("/") === parsed.pathKey,
    );
    if (!audio) {
      return fallbackName;
    }
    const author = compact(audio.author) || fallbackName;
    const circle = compact(audio.album) || fallbackName;
    const title = compact(audio.track_title) || fallbackName;
    return `${author}-${circle} - ${title}`;
  }

  return fallbackName;
}

export interface MetadataTemplateFields {
  authorJp: string;
  authorEn: string;
  circleJp: string;
  circleEn: string;
  titleJp: string;
  titleEn: string;
}

export function renderMetadataTemplate(
  template: string,
  fields: MetadataTemplateFields,
): string {
  const combinePrimarySecondary = (
    primary: string,
    secondary: string,
  ): string => {
    if (primary && secondary) {
      return `${primary}(${secondary})`;
    }
    return primary || secondary;
  };

  const tokens: Record<string, string> = {
    "author.jp": fields.authorJp,
    "author.en": fields.authorEn,
    author: combinePrimarySecondary(fields.authorJp, fields.authorEn),
    "circle.jp": fields.circleJp,
    "circle.en": fields.circleEn,
    circle: combinePrimarySecondary(fields.circleJp, fields.circleEn),
    "title.jp": fields.titleJp,
    "title.en": fields.titleEn,
    title: fields.titleJp || fields.titleEn,
    authorAuto: combinePrimarySecondary(fields.authorJp, fields.authorEn),
    circleAuto: combinePrimarySecondary(fields.circleJp, fields.circleEn),
    titleAuto: fields.titleJp || fields.titleEn,
  };

  const renderExpression = (rawExpr: string): string => {
    const expr = sanitizeTemplateHint(rawExpr).trim();
    if (!expr) {
      return "";
    }
    if (
      expr.toLowerCase().includes("circle") &&
      expr.toLowerCase().includes("author")
    ) {
      return tokens.circle;
    }

    const pairMatch = expr.match(/^([a-zA-Z.]+)\(([a-zA-Z.]+)\)$/);
    if (pairMatch) {
      const primary = tokens[pairMatch[1]] ?? "";
      const secondary = tokens[pairMatch[2]] ?? "";
      return combinePrimarySecondary(primary, secondary);
    }

    if (expr in tokens) {
      return tokens[expr];
    }

    return expr.replace(
      /\{([a-zA-Z.]+)\}/g,
      (_value, tokenName: string) => tokens[tokenName] ?? "",
    );
  };

  let rendered = sanitizeTemplateHint(template);
  rendered = rendered.replace(
    /\[([^\]]+)\]\s*\/\s*\[([^\]]+)\]/g,
    (_value, left: string, right: string) => {
      const leftValue = renderExpression(left);
      if (leftValue.trim().length > 0) {
        return leftValue;
      }
      return renderExpression(right);
    },
  );
  rendered = rendered.replace(/\[([^\]]+)\]/g, (_value, expression: string) =>
    renderExpression(expression),
  );
  rendered = rendered.replace(
    /\{([a-zA-Z.]+)\}/g,
    (_value, tokenName: string) => tokens[tokenName] ?? "",
  );
  return trimResult(rendered);
}
