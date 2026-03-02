import type { ImagePackage } from "../../types";

function hasAnyImageItems(sources: ImagePackage[]): boolean {
  return sources.some((source) => source.images.length > 0);
}

export function resolvePreferredSidebarSources(
  sidebarSources: ImagePackage[] | undefined,
  librarySources: ImagePackage[],
  bootstrapSources: ImagePackage[],
): ImagePackage[] {
  if (sidebarSources) {
    return sidebarSources;
  }

  if (hasAnyImageItems(librarySources) || librarySources.length === 0) {
    return librarySources;
  }

  if (hasAnyImageItems(bootstrapSources)) {
    return bootstrapSources;
  }

  return librarySources;
}
