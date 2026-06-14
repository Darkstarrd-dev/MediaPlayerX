import { useEffect, useRef, useState } from "react";

import type { ImageItem } from "../../types";

const IS_TEST_MODE = import.meta.env.MODE === "test";

interface DecodedImageCacheEntry {
  aspect: number;
  decodedAtMs: number;
}

const fullscreenDecodedImageCache = new Map<string, DecodedImageCacheEntry>();

function touchDecodedCacheEntry(src: string, aspect: number): void {
  fullscreenDecodedImageCache.set(src, {
    aspect,
    decodedAtMs: Date.now(),
  });
}

function trimDecodedCache(maxSize: number): void {
  while (fullscreenDecodedImageCache.size > maxSize) {
    let oldestKey: string | null = null;
    let oldestTime = Number.POSITIVE_INFINITY;
    for (const [key, entry] of fullscreenDecodedImageCache) {
      if (entry.decodedAtMs < oldestTime) {
        oldestTime = entry.decodedAtMs;
        oldestKey = key;
      }
    }
    if (!oldestKey) {
      break;
    }
    fullscreenDecodedImageCache.delete(oldestKey);
  }
}

interface UseFullscreenImageSourceParams {
  focusedImageSrc: string | null;
  focusedImage: ImageItem | null;
  decodeCacheSize?: number;
  adjacentImageSrcs?: string[];
}

interface UseFullscreenImageSourceResult {
  displayedImageSrc: string | null;
  displayedImageAspect: number | null;
  setDisplayedImageAspect: (aspect: number | null) => void;
}

export function useFullscreenImageSource({
  focusedImageSrc,
  focusedImage,
  decodeCacheSize = 10,
  adjacentImageSrcs,
}: UseFullscreenImageSourceParams): UseFullscreenImageSourceResult {
  const [displayedImageSrc, setDisplayedImageSrc] = useState<string | null>(
    null,
  );
  const [displayedImageAspect, setDisplayedImageAspectState] = useState<
    number | null
  >(null);
  const imagePreloadSeqRef = useRef(0);
  // 预热在途集合 + 持有 Image 引用：避免连续翻页 effect 重跑时重复预热、
  // 以及局部 Image 在 decode 完成前被 GC/取消（导致预热永不落地）
  const prefetchInFlightRef = useRef<Set<string>>(new Set());
  const prefetchImageRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const normalizedDecodeCacheSize = Math.max(
    4,
    Math.min(16, Math.round(decodeCacheSize)),
  );

  useEffect(() => {
    trimDecodedCache(normalizedDecodeCacheSize);
  }, [normalizedDecodeCacheSize]);

  useEffect(() => {
    if (IS_TEST_MODE || !adjacentImageSrcs || adjacentImageSrcs.length === 0) {
      return;
    }
    const inFlight = prefetchInFlightRef.current;
    const heldImages = prefetchImageRef.current;
    for (const src of adjacentImageSrcs) {
      if (!src || fullscreenDecodedImageCache.has(src) || inFlight.has(src)) {
        continue;
      }
      inFlight.add(src);
      const preload = new Image();
      preload.decoding = "async";
      preload.src = src;
      heldImages.set(src, preload);

      const release = () => {
        inFlight.delete(src);
        heldImages.delete(src);
      };
      // 关键：预热不仅触发请求，还要真正解码并写入解码缓存，
      // 使跨包落点命中缓存、瞬时切图（消除切包卡顿）
      const store = () => {
        if (preload.naturalWidth > 0 && preload.naturalHeight > 0) {
          touchDecodedCacheEntry(
            src,
            preload.naturalWidth / preload.naturalHeight,
          );
          trimDecodedCache(normalizedDecodeCacheSize);
        }
        release();
      };

      if (typeof preload.decode === "function") {
        void preload
          .decode()
          .then(store)
          .catch(() => {
            if (
              preload.complete &&
              preload.naturalWidth > 0 &&
              preload.naturalHeight > 0
            ) {
              store();
              return;
            }
            release();
          });
      } else {
        preload.onload = store;
        preload.onerror = release;
      }
    }
  }, [adjacentImageSrcs, normalizedDecodeCacheSize]);

  useEffect(() => {
    if (IS_TEST_MODE) {
      setDisplayedImageSrc(focusedImageSrc);
      if (focusedImage && focusedImage.width > 0 && focusedImage.height > 0) {
        setDisplayedImageAspectState(focusedImage.width / focusedImage.height);
      } else {
        setDisplayedImageAspectState(null);
      }
      return;
    }

    imagePreloadSeqRef.current += 1;
    const sequence = imagePreloadSeqRef.current;

    if (!focusedImageSrc) {
      setDisplayedImageSrc(null);
      setDisplayedImageAspectState(null);
      return;
    }

    const cached = fullscreenDecodedImageCache.get(focusedImageSrc);
    if (cached) {
      touchDecodedCacheEntry(focusedImageSrc, cached.aspect);
      trimDecodedCache(normalizedDecodeCacheSize);
      setDisplayedImageSrc(focusedImageSrc);
      setDisplayedImageAspectState(cached.aspect);
      return;
    }

    if (focusedImageSrc === displayedImageSrc) {
      return;
    }

    let cancelled = false;

    const preview = new Image();
    preview.decoding = "async";
    preview.src = focusedImageSrc;

    const commit = () => {
      if (cancelled || imagePreloadSeqRef.current !== sequence) {
        return;
      }
      setDisplayedImageSrc(focusedImageSrc);
      if (preview.naturalWidth > 0 && preview.naturalHeight > 0) {
        const aspect = preview.naturalWidth / preview.naturalHeight;
        touchDecodedCacheEntry(focusedImageSrc, aspect);
        trimDecodedCache(normalizedDecodeCacheSize);
        setDisplayedImageAspectState(aspect);
      }
    };

    const fail = () => {
      if (cancelled || imagePreloadSeqRef.current !== sequence) {
        return;
      }
    };

    if (typeof preview.decode === "function") {
      void preview
        .decode()
        .then(() => {
          commit();
        })
        .catch(() => {
          if (
            preview.complete &&
            preview.naturalWidth > 0 &&
            preview.naturalHeight > 0
          ) {
            commit();
            return;
          }
          fail();
        });
    } else {
      preview.onload = () => {
        commit();
      };
      preview.onerror = () => {
        fail();
      };
    }

    return () => {
      cancelled = true;
    };
  }, [
    displayedImageSrc,
    focusedImage,
    focusedImageSrc,
    normalizedDecodeCacheSize,
  ]);

  return {
    displayedImageSrc,
    displayedImageAspect,
    setDisplayedImageAspect: (aspect) => setDisplayedImageAspectState(aspect),
  };
}
