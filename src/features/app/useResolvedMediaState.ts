import { useMemo } from "react";

import { type MediaResolveTarget, useResolvedMediaUrls } from "../backend";
import { useFullscreenImagePreloader } from "./useFullscreenImagePreloader";
import type { MediaRepository } from "../backend/repository";
import type { UiBenchSettings } from "../perf/benchSettings";
import type {
  AudioItem,
  FocusedImageRef,
  ImageItem,
  ImagePackage,
  MediaLocator,
  VideoItem,
} from "../../types";

// 导入忙碌期间：限制缩略图解析目标数量，减少对主进程的 IPC 压力
const IMPORT_BUSY_THUMBNAIL_LIMIT = 16;
// 导入忙碌期间：降低最大并发数，避免与 snapshot 刷新争抢资源
const IMPORT_BUSY_MAX_CONCURRENT = 2;

interface UseResolvedMediaStateParams {
  repository: MediaRepository;
  benchSettings: UiBenchSettings;
  maxConcurrent: number;
  importBusy?: boolean;
  actualCellWidth: number;
  actualMediaHeight: number;
  thumbnailQuality: number;
  thumbnailWidth: number;
  thumbnailAdaptiveResolution: boolean;
  thumbnailGenerationConcurrency: number;
  thumbnailQueueSize: number;
  packageById: ReadonlyMap<string, ImagePackage>;
  focusedImage: ImageItem | null;
  metadataImage: ImageItem | null;
  focusedRef: FocusedImageRef | null;
  orderedRootScopedImageRefs: FocusedImageRef[];
  fullscreenActive: boolean;
  fullscreenPrefetchRadius?: number;
  fullscreenCrossPackagePrefetchCount?: number;
  fullscreenResamplingEnabled?: boolean;
  fullscreenUpsamplingKernel?: "lanczos3" | "mitchell" | "nearest" | "cubic";
  fullscreenDownsamplingKernel?: "lanczos3" | "mitchell" | "nearest" | "cubic";
  showNamesOnly: boolean;
  refsInPage: FocusedImageRef[];
  visibleImageRefs?: FocusedImageRef[];
  normalizedPageIndex?: number;
  imageTotalPages?: number;
  pagedPageSize?: number;
  thumbnailWarmupRadius?: number;
  thumbnailWarmupConcurrency?: number;
  focusedVideo: VideoItem | null;
  focusedAudio: AudioItem | null;
  focusedVideoCoverImageLocator: MediaLocator | null;
  sourceCoverLocators?: Array<{ sourceId: string; locator: MediaLocator }>;
  nodeBrowseCoverThumbnailLocators?: Array<{
    sourceId: string;
    imageId: string;
    locator: MediaLocator;
  }>;
  nodeBrowseVideoCoverLocators?: Array<{
    videoId: string;
    locator: MediaLocator;
  }>;
}

interface UseResolvedMediaStateResult {
  thumbnailImageUrlById: Record<string, string>;
  metadataImageSrc: string | null;
  fullscreenImageSrc: string | null;
  focusedVideoSrc: string | null;
  focusedAudioSrc: string | null;
  videoUrlById: Record<string, string>;
  audioUrlById: Record<string, string>;
  videoCoverImageUrlById: Record<string, string>;
  focusedVideoCoverImageSrc: string | null;
  sourceCoverImageUrlBySourceId: Record<string, string>;
  adjacentFullscreenImageSrcs: string[];
  fullscreenWindowImageSrcs: string[];
}

export function useResolvedMediaState({
  repository,
  benchSettings,
  maxConcurrent,
  importBusy = false,
  actualCellWidth,
  actualMediaHeight,
  thumbnailQuality,
  thumbnailWidth,
  thumbnailAdaptiveResolution,
  thumbnailGenerationConcurrency,
  thumbnailQueueSize,
  packageById,
  focusedImage,
  metadataImage,
  focusedRef,
  orderedRootScopedImageRefs,
  fullscreenActive,
  fullscreenPrefetchRadius = 4,
  fullscreenCrossPackagePrefetchCount = 6,
  fullscreenResamplingEnabled = false,
  fullscreenUpsamplingKernel = "lanczos3",
  fullscreenDownsamplingKernel = "lanczos3",
  showNamesOnly,
  refsInPage,
  visibleImageRefs,
  normalizedPageIndex,
  imageTotalPages,
  pagedPageSize,
  thumbnailWarmupRadius = 0,
  thumbnailWarmupConcurrency = 1,
  focusedVideo,
  focusedAudio,
  focusedVideoCoverImageLocator,
  sourceCoverLocators = [],
  nodeBrowseCoverThumbnailLocators = [],
  nodeBrowseVideoCoverLocators = [],
}: UseResolvedMediaStateParams): UseResolvedMediaStateResult {
  const mediaResolveTargets = useMemo<MediaResolveTarget[]>(() => {
    const targetById = new Map<string, MediaResolveTarget>();
    const priorityTargets: MediaResolveTarget[] = [];
    const normalTargets: MediaResolveTarget[] = [];
    const normalizedThumbnailWidth = Math.max(128, Math.round(thumbnailWidth));
    const dpr =
      typeof window !== "undefined" ? (window.devicePixelRatio ?? 1) : 1;
    const displayEdge = Math.max(actualCellWidth, actualMediaHeight);
    const thumbnailMaxEdge = thumbnailAdaptiveResolution
      ? Math.max(96, Math.ceil(dpr * displayEdge))
      : Math.max(
          96,
          Math.ceil(Math.max(displayEdge, normalizedThumbnailWidth)),
        );

    const pushTarget = (target: MediaResolveTarget, priority = false) => {
      if (targetById.has(target.targetId)) {
        return;
      }
      targetById.set(target.targetId, target);
      if (priority) {
        priorityTargets.push(target);
      } else {
        normalTargets.push(target);
      }
    };

    const pushThumbnailImageTarget = (ref: FocusedImageRef): boolean => {
      const image = packageById.get(ref.packageId)?.images[ref.imageIndex];
      if (!image) {
        return false;
      }

      const targetId = `image-thumb:${image.id}`;
      if (targetById.has(targetId)) {
        return false;
      }

      pushTarget({
        targetId,
        locator: image.mediaLocator,
        variant: "thumbnail",
        thumbnailMaxEdge,
        thumbnailQuality,
        thumbnailGenerationConcurrency,
        thumbnailQueueSize,
      });
      return true;
    };

    const pushOriginalImageTarget = (image: ImageItem | null) => {
      if (!image) {
        return;
      }

      pushTarget(
        {
          targetId: `image-original:${image.id}`,
          locator: image.mediaLocator,
          variant: "original",
        },
        true,
      );
    };

    const pushOriginalImageTargetByRef = (
      ref: FocusedImageRef | null | undefined,
      priority = false,
    ) => {
      if (!ref) {
        return;
      }
      const image = packageById.get(ref.packageId)?.images[ref.imageIndex];
      if (!image) {
        return;
      }
      pushTarget(
        {
          targetId: `image-original:${image.id}`,
          locator: image.mediaLocator,
          variant: "original",
        },
        priority,
      );
    };

    const viewportWidth =
      typeof window !== "undefined"
        ? Math.max(1, Math.min(7680, Math.round(window.innerWidth)))
        : 1920;
    const viewportHeight =
      typeof window !== "undefined"
        ? Math.max(1, Math.min(4320, Math.round(window.innerHeight)))
        : 1080;

    const pushFullscreenImageTarget = (
      image: ImageItem | null,
      priority = false,
    ) => {
      if (!image || image.width <= 0 || image.height <= 0) {
        return;
      }

      const fittedScale = Math.min(
        viewportWidth / image.width,
        viewportHeight / image.height,
      );
      if (
        !Number.isFinite(fittedScale) ||
        fittedScale <= 0 ||
        (fittedScale > 0.98 && fittedScale < 1.02)
      ) {
        return;
      }

      const fittedWidth = Math.max(
        1,
        Math.min(7680, Math.round(image.width * fittedScale)),
      );
      const fittedHeight = Math.max(
        1,
        Math.min(4320, Math.round(image.height * fittedScale)),
      );
      const kernel =
        fittedScale < 1
          ? fullscreenDownsamplingKernel
          : fullscreenUpsamplingKernel;

      pushTarget(
        {
          targetId: `image-fullscreen:${image.id}`,
          locator: image.mediaLocator,
          variant: "fullscreen",
          fullscreenTargetWidth: fittedWidth,
          fullscreenTargetHeight: fittedHeight,
          fullscreenKernel: kernel,
        },
        priority,
      );
    };

    const pushFullscreenImageTargetByRef = (
      ref: FocusedImageRef | null | undefined,
      priority = false,
    ) => {
      if (!ref) {
        return;
      }
      const image =
        packageById.get(ref.packageId)?.images[ref.imageIndex] ?? null;
      pushFullscreenImageTarget(image, priority);
    };

    pushOriginalImageTarget(focusedImage);
    pushOriginalImageTarget(metadataImage);
    pushOriginalImageTargetByRef(refsInPage[0], true);

    if (fullscreenActive && fullscreenResamplingEnabled) {
      pushFullscreenImageTarget(focusedImage, true);
    }

    if (focusedRef && orderedRootScopedImageRefs.length > 0) {
      const focusedIndex = orderedRootScopedImageRefs.findIndex(
        (ref) =>
          ref.packageId === focusedRef.packageId &&
          ref.imageIndex === focusedRef.imageIndex,
      );
      if (focusedIndex >= 0) {
        const prefetchRadius = fullscreenActive
          ? Math.max(2, Math.floor(fullscreenPrefetchRadius))
          : 2;
        for (let offset = 1; offset <= prefetchRadius; offset += 1) {
          pushOriginalImageTargetByRef(
            orderedRootScopedImageRefs[focusedIndex + offset],
            true,
          );
          pushOriginalImageTargetByRef(
            orderedRootScopedImageRefs[focusedIndex - offset],
            true,
          );

          if (fullscreenActive && fullscreenResamplingEnabled) {
            pushFullscreenImageTargetByRef(
              orderedRootScopedImageRefs[focusedIndex + offset],
            );
            pushFullscreenImageTargetByRef(
              orderedRootScopedImageRefs[focusedIndex - offset],
            );
          }
        }

        if (
          fullscreenActive &&
          fullscreenCrossPackagePrefetchCount &&
          fullscreenCrossPackagePrefetchCount > 0
        ) {
          const crossCount = Math.min(
            fullscreenCrossPackagePrefetchCount,
            orderedRootScopedImageRefs.length,
          );
          for (let offset = 1; offset <= crossCount; offset += 1) {
            for (const sign of [1, -1] as const) {
              pushOriginalImageTargetByRef(
                orderedRootScopedImageRefs[focusedIndex + sign * offset],
                true,
              );
            }
          }
        }
      }
    }

    // 全屏期间网格被全屏层覆盖、不可见，跳过网格缩略图解析，避免共享解析器随全屏翻页
    // 反复 abort/重派发缩略图、与全屏原图解析争抢算力（全屏退出后自然恢复解析）
    if (!showNamesOnly && !fullscreenActive) {
      // 导入忙碌期间仅解析首屏可视区内的缩略图，减少 IPC 竞争
      const effectiveRefsForThumbnails = importBusy
        ? refsInPage.slice(0, IMPORT_BUSY_THUMBNAIL_LIMIT)
        : refsInPage;
      for (const ref of effectiveRefsForThumbnails) {
        pushThumbnailImageTarget(ref);
      }

      const refsForWarmup = visibleImageRefs ?? refsInPage;
      const effectivePageSize = Math.max(
        0,
        Math.floor(pagedPageSize ?? refsInPage.length),
      );
      const effectiveWarmupRadius = Math.max(
        0,
        Math.floor(thumbnailWarmupRadius),
      );
      const effectiveWarmupConcurrency = Math.max(
        1,
        Math.floor(thumbnailWarmupConcurrency),
      );
      const effectiveTotalPages = Math.max(0, Math.floor(imageTotalPages ?? 0));
      const effectivePageIndex = Math.max(
        0,
        Math.floor(normalizedPageIndex ?? 0),
      );
      const canWarmupAdjacentPages =
        !importBusy &&
        effectiveWarmupRadius > 0 &&
        effectivePageSize > 0 &&
        effectiveTotalPages > 1 &&
        refsForWarmup.length > effectivePageSize;

      if (canWarmupAdjacentPages) {
        const maxWarmupTargets = effectiveWarmupConcurrency * effectivePageSize;
        let warmupCount = 0;
        for (
          let offset = 1;
          offset <= effectiveWarmupRadius && warmupCount < maxWarmupTargets;
          offset += 1
        ) {
          for (const direction of [-1, 1] as const) {
            const adjacentPageIndex = effectivePageIndex + direction * offset;
            if (
              adjacentPageIndex < 0 ||
              adjacentPageIndex >= effectiveTotalPages
            ) {
              continue;
            }

            const start = adjacentPageIndex * effectivePageSize;
            const end = Math.min(
              start + effectivePageSize,
              refsForWarmup.length,
            );
            for (let index = start; index < end; index += 1) {
              if (warmupCount >= maxWarmupTargets) {
                break;
              }

              const ref = refsForWarmup[index];
              if (!ref) {
                continue;
              }

              if (pushThumbnailImageTarget(ref)) {
                warmupCount += 1;
              }
            }
          }
        }
      }
    }

    if (focusedVideo) {
      pushTarget(
        {
          targetId: `video:${focusedVideo.id}`,
          locator: focusedVideo.mediaLocator,
          variant: "original",
        },
        true,
      );

      if (focusedVideoCoverImageLocator) {
        pushTarget(
          {
            targetId: `video-cover:${focusedVideo.id}`,
            locator: focusedVideoCoverImageLocator,
            variant: "original",
          },
          true,
        );
      }
    }

    for (const candidate of nodeBrowseVideoCoverLocators) {
      pushTarget(
        {
          targetId: `video-cover:${candidate.videoId}`,
          locator: candidate.locator,
          variant: "original",
        },
        true,
      );
    }

    if (focusedAudio) {
      pushTarget(
        {
          targetId: `audio:${focusedAudio.id}`,
          locator: focusedAudio.mediaLocator,
          variant: "original",
        },
        true,
      );
    }

    for (const sourceCover of sourceCoverLocators) {
      pushTarget(
        {
          targetId: `source-cover:${sourceCover.sourceId}`,
          locator: sourceCover.locator,
          variant: "original",
        },
        true,
      );
    }

    return [...priorityTargets, ...normalTargets];
  }, [
    actualCellWidth,
    actualMediaHeight,
    thumbnailQuality,
    thumbnailAdaptiveResolution,
    thumbnailGenerationConcurrency,
    thumbnailQueueSize,
    thumbnailWidth,
    focusedImage,
    focusedAudio,
    focusedVideo,
    focusedVideoCoverImageLocator,
    importBusy,
    metadataImage,
    focusedRef,
    fullscreenActive,
    fullscreenPrefetchRadius,
    fullscreenCrossPackagePrefetchCount,
    fullscreenResamplingEnabled,
    fullscreenUpsamplingKernel,
    fullscreenDownsamplingKernel,
    orderedRootScopedImageRefs,
    packageById,
    refsInPage,
    visibleImageRefs,
    normalizedPageIndex,
    imageTotalPages,
    pagedPageSize,
    thumbnailWarmupRadius,
    thumbnailWarmupConcurrency,
    showNamesOnly,
    nodeBrowseVideoCoverLocators,
    sourceCoverLocators,
  ]);

  const resolvedMedia = useResolvedMediaUrls({
    repository,
    targets: mediaResolveTargets,
    options: benchSettings.enabled
      ? benchSettings.resolvedMedia
      : {
          applyMode: "raf",
          stateScope: "active-only",
          maxConcurrent: importBusy
            ? Math.min(maxConcurrent, IMPORT_BUSY_MAX_CONCURRENT)
            : maxConcurrent,
        },
  });

  const nodeBrowseCoverThumbnailTargets = useMemo<MediaResolveTarget[]>(() => {
    if (
      benchSettings.enabled ||
      nodeBrowseCoverThumbnailLocators.length === 0
    ) {
      return [];
    }

    const targetById = new Map<string, MediaResolveTarget>();
    const normalizedThumbnailWidth = Math.max(128, Math.round(thumbnailWidth));
    const dprCover =
      typeof window !== "undefined" ? (window.devicePixelRatio ?? 1) : 1;
    const displayEdgeCover = Math.max(actualCellWidth, actualMediaHeight);
    const thumbnailMaxEdge = thumbnailAdaptiveResolution
      ? Math.max(96, Math.ceil(dprCover * displayEdgeCover))
      : Math.max(
          96,
          Math.ceil(Math.max(displayEdgeCover, normalizedThumbnailWidth)),
        );

    for (const candidate of nodeBrowseCoverThumbnailLocators) {
      const targetId = `node-cover-thumb:${candidate.imageId}`;
      if (targetById.has(targetId)) {
        continue;
      }

      targetById.set(targetId, {
        targetId,
        locator: candidate.locator,
        variant: "thumbnail",
        thumbnailMaxEdge,
        thumbnailQuality,
        thumbnailGenerationConcurrency,
        thumbnailQueueSize,
      });
    }

    return [...targetById.values()];
  }, [
    actualCellWidth,
    actualMediaHeight,
    benchSettings.enabled,
    nodeBrowseCoverThumbnailLocators,
    thumbnailAdaptiveResolution,
    thumbnailGenerationConcurrency,
    thumbnailQueueSize,
    thumbnailQuality,
    thumbnailWidth,
  ]);

  const nodeBrowseCoverWarmupMedia = useResolvedMediaUrls({
    repository,
    targets: nodeBrowseCoverThumbnailTargets,
    options: {
      applyMode: "raf",
      stateScope: "active-only",
      maxConcurrent: 1,
    },
  });

  const thumbnailImageUrlById = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {};

    const appendThumbnailTargetUrls = (
      urlByTargetId: Record<string, string>,
    ) => {
      for (const [targetId, url] of Object.entries(urlByTargetId)) {
        if (targetId.startsWith("image-thumb:")) {
          next[targetId.slice("image-thumb:".length)] = url;
          continue;
        }

        if (targetId.startsWith("node-cover-thumb:")) {
          next[targetId.slice("node-cover-thumb:".length)] = url;
        }
      }
    };

    appendThumbnailTargetUrls(resolvedMedia.urlByTargetId);
    appendThumbnailTargetUrls(nodeBrowseCoverWarmupMedia.urlByTargetId);

    return next;
  }, [nodeBrowseCoverWarmupMedia.urlByTargetId, resolvedMedia.urlByTargetId]);

  const originalImageUrlById = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    for (const [targetId, url] of Object.entries(resolvedMedia.urlByTargetId)) {
      if (!targetId.startsWith("image-original:")) {
        continue;
      }
      next[targetId.slice("image-original:".length)] = url;
    }
    return next;
  }, [resolvedMedia.urlByTargetId]);

  // 全屏专用 eager 预解析（绕开网格共享解析器 debounce/abort 限流），消除连续翻页时
  // 聚焦图 URL 长时间无法解析导致的黑屏空窗（实测 (b) 段可达数秒）
  const { urlByImageId: preloadedFullscreenUrlByImageId } =
    useFullscreenImagePreloader({
      repository,
      fullscreenActive,
      focusedRef,
      orderedRootScopedImageRefs,
      packageById,
      radius: fullscreenCrossPackagePrefetchCount ?? 6,
    });

  const adjacentFullscreenImageSrcs = useMemo<string[]>(() => {
    if (
      !fullscreenActive ||
      !focusedRef ||
      orderedRootScopedImageRefs.length === 0
    ) {
      return [];
    }
    const fi = orderedRootScopedImageRefs.findIndex(
      (ref) =>
        ref.packageId === focusedRef.packageId &&
        ref.imageIndex === focusedRef.imageIndex,
    );
    if (fi < 0) {
      return [];
    }
    const N = Math.max(1, Math.floor(fullscreenCrossPackagePrefetchCount ?? 6));
    const srcs: string[] = [];
    for (let offset = 1; offset <= N; offset += 1) {
      for (const sign of [1, -1] as const) {
        const ref = orderedRootScopedImageRefs[fi + sign * offset];
        if (!ref) {
          continue;
        }
        const img = packageById.get(ref.packageId)?.images[ref.imageIndex];
        if (img) {
          // 与显示一致：优先 eager 预解析 url，确保解码预热命中同一 url
          const url =
            preloadedFullscreenUrlByImageId[img.id] ??
            originalImageUrlById[img.id];
          if (url) {
            srcs.push(url);
          }
        }
      }
    }
    return srcs;
  }, [
    fullscreenActive,
    focusedRef,
    orderedRootScopedImageRefs,
    packageById,
    fullscreenCrossPackagePrefetchCount,
    originalImageUrlById,
    preloadedFullscreenUrlByImageId,
  ]);

  // 多层预渲染窗口：与 adjacentFullscreenImageSrcs 同源，但含聚焦图（index 0），
  // 顺序 [fi+0, fi+1, fi-1, fi+2, fi-2, ...]；供 FullscreenImagePane 堆叠 <img> 层用。
  const fullscreenWindowImageSrcs = useMemo<string[]>(() => {
    if (
      !fullscreenActive ||
      !focusedRef ||
      orderedRootScopedImageRefs.length === 0
    ) {
      return [];
    }
    const fi = orderedRootScopedImageRefs.findIndex(
      (ref) =>
        ref.packageId === focusedRef.packageId &&
        ref.imageIndex === focusedRef.imageIndex,
    );
    if (fi < 0) {
      return [];
    }
    const offsets = buildFullscreenWindowOffsets(
      fi,
      fullscreenCrossPackagePrefetchCount ?? 6,
      true,
    );
    const srcs: string[] = [];
    const seen = new Set<string>();
    for (const index of offsets) {
      const ref = orderedRootScopedImageRefs[index];
      if (!ref) {
        continue;
      }
      const img = packageById.get(ref.packageId)?.images[ref.imageIndex];
      if (!img) {
        continue;
      }
      // 与显示一致：优先 eager 预解析 url，确保多层解码位图复用命中同一 url
      const url =
        preloadedFullscreenUrlByImageId[img.id] ?? originalImageUrlById[img.id];
      if (url && !seen.has(url)) {
        seen.add(url);
        srcs.push(url);
      }
    }
    return srcs;
  }, [
    fullscreenActive,
    focusedRef,
    orderedRootScopedImageRefs,
    packageById,
    fullscreenCrossPackagePrefetchCount,
    originalImageUrlById,
    preloadedFullscreenUrlByImageId,
  ]);

  const fullscreenImageUrlById = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    for (const [targetId, url] of Object.entries(resolvedMedia.urlByTargetId)) {
      if (!targetId.startsWith("image-fullscreen:")) {
        continue;
      }
      next[targetId.slice("image-fullscreen:".length)] = url;
    }
    return next;
  }, [resolvedMedia.urlByTargetId]);

  const videoCoverImageUrlById = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    for (const [targetId, url] of Object.entries(resolvedMedia.urlByTargetId)) {
      if (!targetId.startsWith("video-cover:")) {
        continue;
      }
      next[targetId.slice("video-cover:".length)] = url;
    }
    return next;
  }, [resolvedMedia.urlByTargetId]);

  const sourceCoverImageUrlBySourceId = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    for (const [targetId, url] of Object.entries(resolvedMedia.urlByTargetId)) {
      if (!targetId.startsWith("source-cover:")) {
        continue;
      }
      next[targetId.slice("source-cover:".length)] = url;
    }
    return next;
  }, [resolvedMedia.urlByTargetId]);

  const metadataImageSrc = metadataImage
    ? (originalImageUrlById[metadataImage.id] ?? null)
    : null;
  const fullscreenImageSrc = focusedImage
    ? (fullscreenImageUrlById[focusedImage.id] ??
      preloadedFullscreenUrlByImageId[focusedImage.id] ??
      originalImageUrlById[focusedImage.id] ??
      thumbnailImageUrlById[focusedImage.id] ??
      null)
    : null;
  const focusedVideoSrc = focusedVideo
    ? (resolvedMedia.urlByTargetId[`video:${focusedVideo.id}`] ?? null)
    : null;
  const focusedAudioSrc = focusedAudio
    ? (resolvedMedia.urlByTargetId[`audio:${focusedAudio.id}`] ?? null)
    : null;
  const focusedVideoCoverImageSrc = focusedVideo
    ? (videoCoverImageUrlById[focusedVideo.id] ?? null)
    : null;
  const videoUrlById = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    for (const [targetId, url] of Object.entries(resolvedMedia.urlByTargetId)) {
      if (!targetId.startsWith("video:")) {
        continue;
      }
      next[targetId.slice("video:".length)] = url;
    }
    return next;
  }, [resolvedMedia.urlByTargetId]);
  const audioUrlById = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    for (const [targetId, url] of Object.entries(resolvedMedia.urlByTargetId)) {
      if (!targetId.startsWith("audio:")) {
        continue;
      }
      next[targetId.slice("audio:".length)] = url;
    }
    return next;
  }, [resolvedMedia.urlByTargetId]);

  return {
    thumbnailImageUrlById,
    metadataImageSrc,
    fullscreenImageSrc,
    focusedVideoSrc,
    focusedAudioSrc,
    videoUrlById,
    audioUrlById,
    videoCoverImageUrlById,
    focusedVideoCoverImageSrc,
    sourceCoverImageUrlBySourceId,
    adjacentFullscreenImageSrcs,
    fullscreenWindowImageSrcs,
  };
}

/**
 * 生成全屏多层预渲染窗口的有序索引序列。
 * - includeFocused=true（多层渲染）：[fi, fi+1, fi-1, fi+2, fi-2, ...]
 * - includeFocused=false（仅相邻预解码，沿用 adjacent 语义）：[fi+1, fi-1, fi+2, fi-2, ...]
 * 越界索引被跳过；N 已做下界保护。
 *
 * 抽出为纯函数以便单测（顺序、聚焦位置、去重由调用方处理）。
 */
export function buildFullscreenWindowOffsets(
  focusedIndex: number,
  radius: number,
  includeFocused: boolean,
): number[] {
  const N = Math.max(1, Math.floor(radius));
  const offsets: number[] = [];
  if (includeFocused) {
    offsets.push(focusedIndex);
  }
  for (let step = 1; step <= N; step += 1) {
    offsets.push(focusedIndex + step);
    offsets.push(focusedIndex - step);
  }
  return offsets;
}
