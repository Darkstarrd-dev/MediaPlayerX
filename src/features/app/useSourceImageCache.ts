import { useEffect, useRef, useState } from "react";

import { mapImageItemDto } from "../backend/mappers";
import type { MediaRepository } from "../backend/repository";
import type { ImageItem } from "../../types";

interface UseSourceImageCacheParams {
  repository: MediaRepository;
  /** 需要确保已加载图片的源 id（通常是当前选中包，可含全屏/向量等扩展） */
  neededSourceIds: string[];
  includeHidden: boolean;
  /** 库版本号：变化时清空缓存重载（删除/隐藏/移动后避免脏数据） */
  generation: number;
}

/**
 * 会话级按需图片缓存。
 *
 * 结构性分页后侧边栏不再携带全库 images，本 hook 按 source id 懒加载并在会话内保留，
 * 使渲染进程持有的图片量与「访问过的源」成正比，而非与入库总量成正比。
 * 已访问的源不主动卸载，保证 validImageIdSet / 跨包导航 / 管理选择覆盖访问集合。
 */
export function useSourceImageCache({
  repository,
  neededSourceIds,
  includeHidden,
  generation,
}: UseSourceImageCacheParams): ReadonlyMap<string, ImageItem[]> {
  const [cache, setCache] = useState<Map<string, ImageItem[]>>(
    () => new Map(),
  );
  const inFlightRef = useRef<Set<string>>(new Set());

  // includeHidden / 库版本变化会改变可见图片集，清空缓存重载
  useEffect(() => {
    setCache((prev) => (prev.size === 0 ? prev : new Map()));
    inFlightRef.current = new Set();
  }, [includeHidden, generation]);

  useEffect(() => {
    const readSourceImages = repository.readSourceImages;
    if (!readSourceImages) {
      return;
    }

    let cancelled = false;
    for (const sourceId of neededSourceIds) {
      if (
        !sourceId ||
        cache.has(sourceId) ||
        inFlightRef.current.has(sourceId)
      ) {
        continue;
      }

      inFlightRef.current.add(sourceId);
      readSourceImages(
        { source_id: sourceId, include_hidden: includeHidden },
        { timeoutMs: 8_000 },
      )
        .then((response) => {
          if (cancelled) {
            return;
          }
          const images = response.images.map(mapImageItemDto);
          setCache((prev) => {
            const next = new Map(prev);
            next.set(sourceId, images);
            return next;
          });
        })
        .catch(() => {
          // 加载失败保持源为空，后续交互可重试
        })
        .finally(() => {
          inFlightRef.current.delete(sourceId);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [repository, neededSourceIds, includeHidden, cache]);

  return cache;
}
