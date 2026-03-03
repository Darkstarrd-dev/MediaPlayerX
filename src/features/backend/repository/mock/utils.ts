import {
  deriveWorkTitleFromFileName,
  matchesFeatureFilter,
  normalizeFeatureFilter,
  normalizeMetadataTags,
  normalizeMetadataText,
  pickSourceGrade,
  syncPackageNameFromWorkTitle,
} from "../../../../contracts/backend.shared";
import {
  type ImagePackageDto,
  type MediaLocatorDto,
  type ReadImageSidebarTreeRequestDto,
} from "../../../../contracts/backend";
import { mediaLocatorDtoKey } from "../../mediaLocator";
import { type RepositoryRequestOptions } from "../types";
import { MOCK_LIBRARY_SNAPSHOT_REF } from "./types";

export {
  deriveWorkTitleFromFileName,
  matchesFeatureFilter,
  normalizeFeatureFilter,
  normalizeMetadataTags as normalizeTags,
  normalizeMetadataText as normalizeTextValue,
  pickSourceGrade,
  syncPackageNameFromWorkTitle,
};

export async function resolveAsync<T>(
  value: T,
  options?: RepositoryRequestOptions,
): Promise<T> {
  throwIfAborted(options?.signal);
  await Promise.resolve();
  throwIfAborted(options?.signal);
  return value;
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) {
    return;
  }

  const abortError = new Error("请求已取消");
  abortError.name = "AbortError";
  throw abortError;
}

export function filterSources(
  request: Pick<
    ReadImageSidebarTreeRequestDto,
    "feature_filter" | "grade_overrides"
  >,
): {
  imagePackages: ImagePackageDto[];
  imageDirectories: ImagePackageDto[];
} {
  const snapshot = MOCK_LIBRARY_SNAPSHOT_REF.current;
  if (!snapshot) {
    return { imagePackages: [], imageDirectories: [] };
  }

  const normalized = normalizeFeatureFilter(request.feature_filter);
  const gradeOverrides = request.grade_overrides;

  return {
    imagePackages: snapshot.image_packages.filter((source) =>
      matchesFeatureFilter(source, normalized, gradeOverrides),
    ),
    imageDirectories: snapshot.image_directories.filter((source) =>
      matchesFeatureFilter(source, normalized, gradeOverrides),
    ),
  };
}

export function filterHiddenImagesForSource(
  source: ImagePackageDto,
  includeHidden: boolean,
): ImagePackageDto {
  if (includeHidden) {
    return source;
  }

  const visibleImages = source.images.filter(
    (image) => !(image.hidden ?? false),
  );
  if (visibleImages.length === source.images.length) {
    return source;
  }

  return {
    ...source,
    images: visibleImages,
  };
}

export function filterHiddenSources(
  sources: ImagePackageDto[],
  includeHidden: boolean,
): ImagePackageDto[] {
  if (includeHidden) {
    return sources;
  }

  return sources
    .map((source) => filterHiddenImagesForSource(source, includeHidden))
    .filter((source) => source.images.length > 0);
}

export function locatorPathKey(locator: MediaLocatorDto): string {
  return mediaLocatorDtoKey(locator);
}

export function hashLocator(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function normalizePathKeyForMatch(pathSegments: string[]): string {
  return pathSegments.join("/");
}

export function pathHasPrefix(pathValue: string, prefix: string): boolean {
  if (pathValue === prefix) {
    return true;
  }
  return pathValue.startsWith(`${prefix}/`);
}

export function renumberSourceImages(source: ImagePackageDto): void {
  source.images.forEach((image, index) => {
    image.ordinal = index + 1;
  });
}

export function parseSidebarNodePath(nodeId: string): {
  kind: "folder" | "package" | "video" | "audio";
  pathKey: string;
} | null {
  const delimiterIndex = nodeId.indexOf(":");
  if (delimiterIndex <= 0) {
    return null;
  }

  const kind = nodeId.slice(0, delimiterIndex);
  if (
    kind !== "folder" &&
    kind !== "package" &&
    kind !== "video" &&
    kind !== "audio"
  ) {
    return null;
  }

  const pathKey = nodeId.slice(delimiterIndex + 1);
  if (pathKey.length === 0) {
    return null;
  }

  return {
    kind,
    pathKey,
  };
}

export function toMockImageDataUrl(locator: MediaLocatorDto): string {
  const key = locatorPathKey(locator);
  const hash = hashLocator(key);
  const hue = hash % 360;
  const label =
    locator.kind === "filesystem"
      ? locator.absolute_path
      : `${locator.archive_path}::${locator.entry_name}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="hsl(${hue} 72% 46%)"/><stop offset="100%" stop-color="hsl(${(hue + 36) % 360} 72% 28%)"/></linearGradient></defs><rect width="1280" height="720" fill="url(#g)"/><text x="50%" y="46%" text-anchor="middle" fill="white" font-size="44" font-family="Segoe UI, sans-serif">Mock Image</text><text x="50%" y="56%" text-anchor="middle" fill="rgba(255,255,255,0.86)" font-size="22" font-family="Consolas, monospace">${label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function toDeterministicCoverColor(videoId: string): string {
  const hash = hashLocator(videoId);
  return `hsl(${hash % 360}, 44%, 40%)`;
}
