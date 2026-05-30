import type { MediaLocator } from "../../types";
import type { AppManageBindingsResult } from "./useAppManageBindings";
import type { AppReadAndNavigationResult } from "./useAppReadAndNavigation";
import type { AppSettingsStoreSnapshot } from "./useAppSettingsStore";
import type { AppSessionStateResult } from "./useAppSessionState";
import type { EffectiveDisplayStateResult } from "./useEffectiveDisplayState";
import { buildCoverImageLocator } from "./mediaPathUtils";
import {
  resolveAdReviewPageDerivations,
  shouldGroupAdReviewByPackageRows,
} from "./workspaceAdReviewPageDerivations";
import { resolveAdReviewSidebarContext } from "./workspaceAdReviewSidebarContext";
import { resolveRefsInPageForDisplay } from "./workspaceImageDerivations";
import { NODE_BROWSE_WARMUP_MAX_TARGETS } from "./useAppDisplayResources.helpers";

interface UseAppDisplayPageResourcesParams {
  mode: AppSettingsStoreSnapshot["mode"];
  importBusy: boolean;
  metadataManageMode: AppSessionStateResult["metadataManageMode"];
  manageMode: AppSessionStateResult["manageMode"];
  adReviewFocusTaskId: AppSessionStateResult["adReviewFocusTaskId"];
  adReviewPageIndex: AppSessionStateResult["adReviewPageIndex"];
  selectedSidebarNodeId: AppSessionStateResult["selectedSidebarNodeId"];
  queueTasks: AppManageBindingsResult["manageAdReview"]["queueTasks"];
  readNavigationState: Pick<
    AppReadAndNavigationResult,
    | "backendRead"
    | "vectorResultsActive"
    | "packageByIdEffective"
    | "orderedRootScopedImageRefs"
    | "imageTreeForSidebar"
    | "sidebarNodeById"
    | "pagedPageSize"
    | "thumbnailColumns"
    | "visibleImageRefs"
    | "imageCheckedIdSet"
    | "videoByIdEffective"
  >;
  videoCoverImageById: Record<string, string | null>;
  effectiveDisplayState: Pick<
    EffectiveDisplayStateResult,
    | "refsInPageEffective"
    | "pageStartEffective"
    | "normalizedPageIndexEffective"
    | "imageTotalPagesEffective"
  >;
}

export interface DisplayPageResourcesResult {
  refsInPageForResolve: EffectiveDisplayStateResult["refsInPageEffective"];
  nodeBrowseCoverThumbnailLocators: Array<{
    sourceId: string;
    imageId: string;
    locator: MediaLocator;
  }>;
  nodeBrowseVideoCoverLocators: Array<{
    videoId: string;
    locator: MediaLocator;
  }>;
}

export function useAppDisplayPageResources({
  mode,
  importBusy,
  metadataManageMode,
  manageMode,
  adReviewFocusTaskId,
  adReviewPageIndex,
  selectedSidebarNodeId,
  queueTasks,
  readNavigationState,
  videoCoverImageById,
  effectiveDisplayState,
}: UseAppDisplayPageResourcesParams): DisplayPageResourcesResult {
  const {
    backendRead,
    vectorResultsActive,
    packageByIdEffective,
    orderedRootScopedImageRefs,
    imageTreeForSidebar,
    sidebarNodeById,
    pagedPageSize,
    thumbnailColumns,
    visibleImageRefs,
    imageCheckedIdSet,
    videoByIdEffective,
  } = readNavigationState;

  const {
    refsInPageEffective,
    pageStartEffective,
    normalizedPageIndexEffective,
    imageTotalPagesEffective,
  } = effectiveDisplayState;

  const { adReviewFocusTask, adReviewResultsMode, selectedSidebarNode } =
    resolveAdReviewSidebarContext({
      mode,
      adReviewFocusTaskId,
      queueTasks,
      packageByIdEffective,
      sidebarNodeById,
      selectedSidebarNodeId,
      imageTreeForSidebar,
    });
  const adReviewGroupByPackageRows = shouldGroupAdReviewByPackageRows(
    adReviewResultsMode,
    selectedSidebarNode,
  );

  const nodeBrowseMode =
    mode === "image" &&
    !vectorResultsActive &&
    !metadataManageMode &&
    !adReviewResultsMode &&
    Boolean(
      selectedSidebarNode &&
      selectedSidebarNode.imageNodeType === "folder" &&
      selectedSidebarNode.children.length > 0,
    );

  const canWarmupNodeBrowseCoverThumbnails =
    !importBusy &&
    !(backendRead.library?.loading ?? false) &&
    !(backendRead.sidebar?.loading ?? false) &&
    !(backendRead.page?.loading ?? false) &&
    !(backendRead.metadata?.loading ?? false);

  const nodeBrowseCoverThumbnailLocators: Array<{
    sourceId: string;
    imageId: string;
    locator: MediaLocator;
  }> = [];
  if (
    nodeBrowseMode &&
    canWarmupNodeBrowseCoverThumbnails &&
    selectedSidebarNode
  ) {
    const seenImageIds = new Set<string>();
    for (const child of selectedSidebarNode.children) {
      if (
        nodeBrowseCoverThumbnailLocators.length >=
        NODE_BROWSE_WARMUP_MAX_TARGETS
      ) {
        break;
      }

      const sourceId = child.coverSourceId?.trim() ?? "";
      const imageId = child.coverImageId?.trim() ?? "";
      if (!sourceId || !imageId || seenImageIds.has(imageId)) {
        continue;
      }

      const source = packageByIdEffective.get(sourceId);
      if (!source || source.sourceCover?.coverImagePath) {
        continue;
      }

      // images 已加载时按 id 精确匹配；否则回退到源上的封面 locator
      // （结构性分页后 images 可能尚未按需加载）。
      const matchedImage = source.images.find(
        (item) => item.id === imageId && !item.hidden,
      );
      const locator = matchedImage?.mediaLocator ?? source.coverMediaLocator ?? null;
      if (!locator) {
        continue;
      }

      seenImageIds.add(imageId);
      nodeBrowseCoverThumbnailLocators.push({
        sourceId,
        imageId,
        locator,
      });
    }
  }

  const nodeBrowseVideoCoverLocators: Array<{
    videoId: string;
    locator: MediaLocator;
  }> = [];
  if (mode === "video" && selectedSidebarNode) {
    const seenVideoIds = new Set<string>();
    for (const child of selectedSidebarNode.children) {
      const videoId = child.videoId?.trim() ?? "";
      if (!videoId || seenVideoIds.has(videoId)) {
        continue;
      }
      const video = videoByIdEffective.get(videoId);
      if (!video) {
        continue;
      }
      const coverPath =
        videoCoverImageById[videoId] ?? video.coverImagePath ?? null;
      const locator = buildCoverImageLocator(coverPath);
      if (!locator) {
        continue;
      }
      seenVideoIds.add(videoId);
      nodeBrowseVideoCoverLocators.push({ videoId, locator });
    }
  }

  const { refsInPageBase } = resolveAdReviewPageDerivations({
    adReviewResultsMode,
    orderedRootScopedImageRefs,
    packageByIdEffective,
    adReviewFocusTask,
    selectedSidebarNode,
    pagedPageSize,
    thumbnailColumns,
    adReviewGroupByPackageRows,
    adReviewPageIndex,
    normalizedPageIndexEffective,
    visibleImageRefs,
    refsInPageEffective,
    pageStartEffective,
    imageTotalPagesEffective,
  });

  const refsInPageForResolve = resolveRefsInPageForDisplay(refsInPageBase, {
    manageMode,
    hideUncheckedNonChecked: false,
    imageCheckedIdSet,
    packageByIdEffective,
  });

  return {
    refsInPageForResolve,
    nodeBrowseCoverThumbnailLocators,
    nodeBrowseVideoCoverLocators,
  };
}
