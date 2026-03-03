import type { FeatureFilterDto, ImagePackageDto } from "./backend";

function toPathBaseName(value: string): string {
  const normalized = value.replace(/\\/g, "/");
  const segments = normalized.split("/");
  return segments[segments.length - 1] ?? value;
}

function resolveFileExtension(value: string): string {
  const dotIndex = value.lastIndexOf(".");
  if (dotIndex <= 0) {
    return "";
  }
  return value.slice(dotIndex);
}

export function pickSourceGrade(
  sourceId: string,
  sourceFallbackGrade: number | null,
  gradeOverrides?: Record<string, number | null>,
): number | null {
  if (!gradeOverrides) {
    return sourceFallbackGrade;
  }

  return sourceId in gradeOverrides
    ? (gradeOverrides[sourceId] ?? null)
    : sourceFallbackGrade;
}

export function normalizeFeatureFilter(
  filter: FeatureFilterDto,
): FeatureFilterDto {
  return {
    name_query: filter.name_query.trim().toLowerCase(),
    work_title_query: filter.work_title_query.trim().toLowerCase(),
    series_id_query: filter.series_id_query.trim().toLowerCase(),
    circle_query: filter.circle_query.trim().toLowerCase(),
    author_query: filter.author_query.trim().toLowerCase(),
    tags: filter.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean),
    grade: filter.grade,
  };
}

export function matchesFeatureFilter(
  source: ImagePackageDto,
  filter: FeatureFilterDto,
  gradeOverrides?: Record<string, number | null>,
): boolean {
  const external = source.external_metadata;

  if (filter.name_query) {
    const matched = [source.package_name, source.display_name].some((text) =>
      text.toLowerCase().includes(filter.name_query),
    );
    if (!matched) {
      return false;
    }
  }

  if (filter.work_title_query) {
    const matched = [
      source.work_title,
      external?.title ?? "",
      external?.title_jpn ?? "",
    ].some((value) => value.toLowerCase().includes(filter.work_title_query));
    if (!matched) {
      return false;
    }
  }

  if (filter.series_id_query) {
    const matched = (source.series_id ?? "")
      .toLowerCase()
      .includes(filter.series_id_query);
    if (!matched) {
      return false;
    }
  }

  if (filter.circle_query) {
    const matched = [
      source.circle,
      external?.group_name ?? "",
      external?.group_name_jpn ?? "",
    ].some((value) => value.toLowerCase().includes(filter.circle_query));
    if (!matched) {
      return false;
    }
  }

  if (filter.author_query) {
    const matched = [
      source.author,
      external?.artist ?? "",
      external?.artist_jpn ?? "",
    ].some((value) => value.toLowerCase().includes(filter.author_query));
    if (!matched) {
      return false;
    }
  }

  if (filter.tags.length > 0) {
    const externalTags = external
      ? Object.entries(external.tags).flatMap(([namespace, raw]) =>
          raw
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
            .flatMap((value) => [value, `${namespace}:${value}`]),
        )
      : [];
    const lowerTags = [...source.tags, ...externalTags].map((tag) =>
      tag.toLowerCase(),
    );
    const tagsMatched = filter.tags.every((tag) => lowerTags.includes(tag));
    if (!tagsMatched) {
      return false;
    }
  }

  if (filter.grade !== null) {
    const gradeValue =
      pickSourceGrade(source.id, source.mock_grade, gradeOverrides) ?? 0;
    if (gradeValue !== filter.grade) {
      return false;
    }
  }

  return true;
}

export function normalizeMetadataText(value: string, fallback: string): string {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

export function normalizeMetadataTags(tags: string[]): string[] {
  const next = new Set<string>();
  for (const rawTag of tags) {
    const normalized = rawTag.trim();
    if (normalized.length > 0) {
      next.add(normalized);
    }
  }
  return Array.from(next);
}

export function deriveWorkTitleFromFileName(fileName: string): string {
  const extension = resolveFileExtension(fileName);
  if (extension.length === 0) {
    return fileName;
  }
  return fileName.slice(0, -extension.length);
}

export function syncPackageNameFromWorkTitle(
  source: Pick<ImagePackageDto, "absolute_path" | "package_name">,
  workTitle: string,
): { packageName: string; displayName: string } {
  const fileName = toPathBaseName(source.absolute_path) || source.package_name;
  const extension = resolveFileExtension(fileName);

  if (extension.length > 0) {
    return {
      packageName: `${workTitle}${extension}`,
      displayName: workTitle,
    };
  }

  return {
    packageName: workTitle,
    displayName: workTitle,
  };
}
