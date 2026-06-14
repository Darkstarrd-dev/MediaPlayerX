import { useEffect, useRef, useState } from "react";

import { buildResolveRequest } from "../backend/mediaResolveUtils";
import type { MediaRepository } from "../backend/repository";
import type { FocusedImageRef, ImagePackage } from "../../types";

const IS_TEST_MODE = import.meta.env.MODE === "test";
const RESOLVE_TIMEOUT_MS = 8_000;
// 缓存项剩余寿命不足该余量时重新解析（与后端 token TTL 对齐）
const CACHE_REFRESH_LEEWAY_MS = 15_000;

// 高频且不影响文件身份的库变更原因：忽略，避免预解析缓存被反复清空
const IGNORED_LIBRARY_CHANGE_REASONS = new Set([
  "import-task-updated",
  "write-package-grade",
  "write-package-metadata",
  "write-package-external-metadata",
  "write-video-metadata",
  "write-preference-metrics",
  "thumbnail-rendering-start",
  "thumbnail-rendering-progress",
  "thumbnail-rendering-end",
]);

interface CachedResolvedUrl {
  url: string;
  expiresAtMs: number;
}

interface UseFullscreenImagePreloaderParams {
  repository: MediaRepository;
  fullscreenActive: boolean;
  focusedRef: FocusedImageRef | null;
  orderedRootScopedImageRefs: FocusedImageRef[];
  packageById: ReadonlyMap<string, ImagePackage>;
  /** 窗口半径：聚焦图前后各预解析多少张（跨包） */
  radius: number;
}

interface UseFullscreenImagePreloaderResult {
  /** 已 eager 解析（不经网格共享解析器的 debounce/abort 限流）的 image id → 原图资源 url */
  urlByImageId: Record<string, string>;
}

/**
 * 全屏专用图片 URL 预解析器。
 *
 * 共享的 useResolvedMediaUrls 为网格快速滚动省 IPC 而设了 60ms dispatch debounce + 每次导航
 * abort。全屏连续翻页（按住方向键）时，每次按键都重置 debounce 并中止在途解析，导致聚焦图
 * 的 URL 在整个按住期间无法派发解析 —— 即使图片元数据已就绪也长时间黑屏（实测可达数秒）。
 *
 * 本 hook 绕开该限流：对聚焦图及其前后窗口（跨包）主动 resolve，按 imageId 缓存复用、in-flight
 * 去重，且解析不随单次导航中止 —— 使窗口内原图 url 始终就绪、落点直接命中。仅在全屏图片场景启用，
 * 不影响网格缩略图的限流策略。
 */
export function useFullscreenImagePreloader({
  repository,
  fullscreenActive,
  focusedRef,
  orderedRootScopedImageRefs,
  packageById,
  radius,
}: UseFullscreenImagePreloaderParams): UseFullscreenImagePreloaderResult {
  const [urlByImageId, setUrlByImageId] = useState<Record<string, string>>({});
  const urlCacheRef = useRef(new Map<string, CachedResolvedUrl>());
  const inFlightRef = useRef(new Set<string>());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 库变更（文件移动/删除等）使旧 token 失效，清空预解析缓存避免服务死链
  useEffect(() => {
    if (!repository.onLibraryChanged) {
      return;
    }
    const unsubscribe = repository.onLibraryChanged((payload) => {
      if (IGNORED_LIBRARY_CHANGE_REASONS.has(payload.reason)) {
        return;
      }
      urlCacheRef.current.clear();
      inFlightRef.current.clear();
      setUrlByImageId((previous) =>
        Object.keys(previous).length === 0 ? previous : {},
      );
    });
    return unsubscribe;
  }, [repository]);

  useEffect(() => {
    if (IS_TEST_MODE) {
      return;
    }
    if (
      !fullscreenActive ||
      !focusedRef ||
      orderedRootScopedImageRefs.length === 0
    ) {
      return;
    }

    const focusedIndex = orderedRootScopedImageRefs.findIndex(
      (ref) =>
        ref.packageId === focusedRef.packageId &&
        ref.imageIndex === focusedRef.imageIndex,
    );
    if (focusedIndex < 0) {
      return;
    }

    const effectiveRadius = Math.max(1, Math.floor(radius));
    // 聚焦图优先，其后由近及远向两侧展开
    const offsets: number[] = [0];
    for (let offset = 1; offset <= effectiveRadius; offset += 1) {
      offsets.push(offset, -offset);
    }

    const now = Date.now();
    const applyUrl = (imageId: string, url: string) => {
      setUrlByImageId((previous) =>
        previous[imageId] === url ? previous : { ...previous, [imageId]: url },
      );
    };

    for (const offset of offsets) {
      const ref = orderedRootScopedImageRefs[focusedIndex + offset];
      if (!ref) {
        continue;
      }
      const image = packageById.get(ref.packageId)?.images[ref.imageIndex];
      if (!image) {
        continue;
      }

      const cached = urlCacheRef.current.get(image.id);
      if (cached && cached.expiresAtMs > now + CACHE_REFRESH_LEEWAY_MS) {
        applyUrl(image.id, cached.url);
        continue;
      }
      if (inFlightRef.current.has(image.id)) {
        continue;
      }

      inFlightRef.current.add(image.id);
      const request = buildResolveRequest({
        targetId: `fullscreen-preload:${image.id}`,
        locator: image.mediaLocator,
        variant: "original",
      });
      // 关键：不传 abort signal —— 解析结果按 imageId 缓存，连续翻页时让其完成、逐步填满窗口
      void repository
        .resolveMediaResource(request, { timeoutMs: RESOLVE_TIMEOUT_MS })
        .then((response) => {
          urlCacheRef.current.set(image.id, {
            url: response.resource_url,
            expiresAtMs:
              Number.isFinite(response.expires_at_ms) &&
              response.expires_at_ms > 0
                ? response.expires_at_ms
                : Date.now() + 60_000,
          });
          if (mountedRef.current) {
            applyUrl(image.id, response.resource_url);
          }
        })
        .catch(() => {
          // 解析失败：保持未就绪，后续导航可重试
        })
        .finally(() => {
          inFlightRef.current.delete(image.id);
        });
    }
  }, [
    fullscreenActive,
    focusedRef,
    orderedRootScopedImageRefs,
    packageById,
    radius,
    repository,
  ]);

  // 退出全屏释放 state（保留 url 缓存以便快速重入）
  useEffect(() => {
    if (fullscreenActive) {
      return;
    }
    setUrlByImageId((previous) =>
      Object.keys(previous).length === 0 ? previous : {},
    );
  }, [fullscreenActive]);

  return { urlByImageId };
}
