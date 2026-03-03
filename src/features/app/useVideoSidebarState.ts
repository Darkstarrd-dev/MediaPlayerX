import { useMemo } from "react";

import { buildSidebarTree, findNodeById } from "../../mockData";
import type {
  SidebarNode,
  SidebarTreeDisplayMode,
  VideoItem,
} from "../../types";
import { collectLeafIds } from "../../utils/mediaHelpers";
import { compactSidebarTree } from "../sidebar/compactSidebarTree";
import { normalizePointerSidebarTree } from "../sidebar/normalizePointerSidebarTree";
import { createVideoSidebarModePredicates } from "../sidebar/sidebarTreePredicates";

interface UseVideoSidebarStateParams {
  videos: VideoItem[];
  videoRootNodeId: string | null;
  sidebarTreeDisplayMode?: SidebarTreeDisplayMode;
}

interface UseVideoSidebarStateResult {
  videoTreeRaw: SidebarNode[];
  videoRootNode: SidebarNode | null;
  rootScopedVideoIds: Set<string>;
  videosForSidebar: VideoItem[];
  videoTreeForSidebar: SidebarNode[];
}

function normalizeNodeLabelCompare(value: string): string {
  return value
    .trim()
    .replace(/\.[^./\\]+$/, "")
    .toLowerCase();
}

function shouldUseWorkTitleLabel(fileName: string, workTitle: string): boolean {
  const normalizedWorkTitle = normalizeNodeLabelCompare(workTitle);
  if (normalizedWorkTitle.length === 0) {
    return false;
  }
  return normalizeNodeLabelCompare(fileName) !== normalizedWorkTitle;
}

function resolveVideoLeafLabel(
  video: Pick<VideoItem, "fileName" | "workTitle">,
  sidebarTreeDisplayMode: SidebarTreeDisplayMode,
): string | undefined {
  if (sidebarTreeDisplayMode === "hierarchy") {
    return undefined;
  }

  return shouldUseWorkTitleLabel(video.fileName, video.workTitle)
    ? video.workTitle
    : undefined;
}

const videoSidebarPredicates = createVideoSidebarModePredicates();
const isCompressibleVideoFolderNode =
  videoSidebarPredicates.isCompressibleFolderNode;
const isVideoPointerFolderNode = videoSidebarPredicates.isPointerFolderNode;
const isVideoMediaNode = videoSidebarPredicates.isMediaNode;

function pruneProceduralVideoPathNodes(nodes: SidebarNode[]): SidebarNode[] {
  const next: SidebarNode[] = [];

  for (const node of nodes) {
    const normalizedChildren = pruneProceduralVideoPathNodes(node.children);
    const nextNode: SidebarNode = {
      ...node,
      children: normalizedChildren,
    };

    const hasDirectVideoChild = nextNode.children.some((child) =>
      isVideoMediaNode(child),
    );
    if (isVideoPointerFolderNode(nextNode) && !hasDirectVideoChild) {
      next.push(...nextNode.children);
      continue;
    }

    next.push(nextNode);
  }

  return next;
}

export function useVideoSidebarState({
  videos,
  videoRootNodeId,
  sidebarTreeDisplayMode = "direct",
}: UseVideoSidebarStateParams): UseVideoSidebarStateResult {
  const videoTreeRaw = useMemo(
    () =>
      buildSidebarTree(
        videos.map((video) => ({
          id: video.id,
          treePath: video.treePath,
          leafLabel: shouldUseWorkTitleLabel(video.fileName, video.workTitle)
            ? video.workTitle
            : undefined,
        })),
        "video",
      ),
    [videos],
  );

  const videoRootNode = useMemo(
    () => findNodeById(videoTreeRaw, videoRootNodeId),
    [videoRootNodeId, videoTreeRaw],
  );

  const rootScopedVideoIds = useMemo(() => {
    if (!videoRootNode) {
      return new Set(videos.map((video) => video.id));
    }
    return new Set(collectLeafIds(videoRootNode, "video"));
  }, [videoRootNode, videos]);

  const videosForSidebar = useMemo(
    () => videos.filter((video) => rootScopedVideoIds.has(video.id)),
    [rootScopedVideoIds, videos],
  );

  const videoTreeForSidebar = useMemo(() => {
    const rawTree = buildSidebarTree(
      videosForSidebar.map((video) => ({
        id: video.id,
        treePath: video.treePath,
        leafLabel: resolveVideoLeafLabel(video, sidebarTreeDisplayMode),
      })),
      "video",
    );

    const displayTree =
      sidebarTreeDisplayMode === "hierarchy"
        ? rawTree
        : pruneProceduralVideoPathNodes(
            compactSidebarTree(rawTree, {
              shouldCompressFolderNode: isCompressibleVideoFolderNode,
              includeRoot: true,
            }),
          );

    return normalizePointerSidebarTree(displayTree, {
      isPointerFolderNode: isVideoPointerFolderNode,
      isMediaNode: isVideoMediaNode,
      pointerLabelMode:
        sidebarTreeDisplayMode === "hierarchy" ? "segment" : "path",
      siblingOrder: "media-first",
    });
  }, [sidebarTreeDisplayMode, videosForSidebar]);

  return {
    videoTreeRaw,
    videoRootNode,
    rootScopedVideoIds,
    videosForSidebar,
    videoTreeForSidebar,
  };
}
