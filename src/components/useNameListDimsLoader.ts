import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import { mapMediaLocatorToDto } from "../features/backend";
import type { FocusedImageRef, ImagePackage } from "../types";

interface NameListDimsEntry {
  width: number;
  height: number;
}

interface UseNameListDimsLoaderOptions {
  showNamesOnly: boolean;
  isTestMode: boolean;
  manageMode: boolean;
  nameListRange: { start: number; end: number };
  visibleImageRefs: FocusedImageRef[];
  packageById: Map<string, ImagePackage>;
  nameListDimsById: Record<string, NameListDimsEntry>;
  setNameListDimsById: Dispatch<
    SetStateAction<Record<string, NameListDimsEntry>>
  >;
  nameListDimsLoadingRef: MutableRefObject<Set<string>>;
}

export function useNameListDimsLoader({
  showNamesOnly,
  isTestMode,
  manageMode,
  nameListRange,
  visibleImageRefs,
  packageById,
  nameListDimsById,
  setNameListDimsById,
  nameListDimsLoadingRef,
}: UseNameListDimsLoaderOptions): void {
  useEffect(() => {
    if (!showNamesOnly || isTestMode) {
      return;
    }

    const api = window.mediaPlayerBackend;
    if (!api?.readImageMetadata) {
      return;
    }

    const canResolveOriginal = typeof api.resolveMediaResource === "function";
    let cancelled = false;
    const maxConcurrent = 2;

    const itemsToLoad: Array<{
      imageId: string;
      packageId: string;
      imageIndex: number;
      locatorDto: ReturnType<typeof mapMediaLocatorToDto>;
    }> = [];

    const loadingSet = nameListDimsLoadingRef.current;
    const startIndex = Math.max(0, nameListRange.start);
    const endIndex = Math.min(
      visibleImageRefs.length,
      Math.max(nameListRange.end, startIndex),
    );

    for (let index = startIndex; index < endIndex; index += 1) {
      const ref = visibleImageRefs[index];
      const pkg = packageById.get(ref.packageId);
      const image = pkg?.images[ref.imageIndex];
      if (!image) {
        continue;
      }

      const existing = nameListDimsById[image.id];
      const width = existing?.width ?? image.width;
      const height = existing?.height ?? image.height;
      if (width > 0 && height > 0) {
        continue;
      }

      if (loadingSet.has(image.id)) {
        continue;
      }

      loadingSet.add(image.id);
      itemsToLoad.push({
        imageId: image.id,
        packageId: ref.packageId,
        imageIndex: ref.imageIndex,
        locatorDto: mapMediaLocatorToDto(image.mediaLocator),
      });
    }

    if (itemsToLoad.length === 0) {
      return;
    }

    const loadDimsFromUrl = (
      url: string,
    ): Promise<{ width: number; height: number } | null> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.loading = "eager";
        img.onload = () => {
          const width = img.naturalWidth || img.width || 0;
          const height = img.naturalHeight || img.height || 0;
          resolve(width > 0 && height > 0 ? { width, height } : null);
        };
        img.onerror = () => resolve(null);
        img.src = url;
      });
    };

    let cursor = 0;
    const workers = Array.from(
      { length: Math.min(maxConcurrent, itemsToLoad.length) },
      async () => {
        while (!cancelled) {
          const index = cursor;
          cursor += 1;
          const next = itemsToLoad[index];
          if (!next) {
            return;
          }

          try {
            const response = await api.readImageMetadata({
              package_id: next.packageId,
              image_index: next.imageIndex,
              include_hidden: manageMode,
            });
            const width = response?.image?.width ?? 0;
            const height = response?.image?.height ?? 0;
            if (!cancelled && width > 0 && height > 0) {
              setNameListDimsById((previous) => {
                if (previous[next.imageId]) {
                  return previous;
                }
                return { ...previous, [next.imageId]: { width, height } };
              });
              continue;
            }

            if (!cancelled && canResolveOriginal) {
              const resource = await api.resolveMediaResource({
                locator: next.locatorDto,
                preferred_variant: "original",
              });
              const dims = resource?.resource_url
                ? await loadDimsFromUrl(resource.resource_url)
                : null;
              if (!cancelled && dims) {
                setNameListDimsById((previous) => {
                  if (previous[next.imageId]) {
                    return previous;
                  }
                  return { ...previous, [next.imageId]: dims };
                });
              }
            }
          } catch {
            // ignore
          } finally {
            loadingSet.delete(next.imageId);
          }
        }
      },
    );

    void Promise.all(workers);
    return () => {
      cancelled = true;
      for (const item of itemsToLoad) {
        loadingSet.delete(item.imageId);
      }
    };
  }, [
    isTestMode,
    manageMode,
    nameListDimsById,
    nameListRange.end,
    nameListRange.start,
    packageById,
    setNameListDimsById,
    showNamesOnly,
    visibleImageRefs,
    nameListDimsLoadingRef,
  ]);
}
