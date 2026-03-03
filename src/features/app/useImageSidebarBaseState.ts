import { useMemo } from "react";

import { resolveActiveLocale } from "../../i18n/locale";
import { useUiStore } from "../../store/useUiStore";
import type { SidebarNode, SidebarTreeDisplayMode } from "../../types";
import { compactSidebarTree } from "../sidebar/compactSidebarTree";
import { normalizePointerSidebarTree } from "../sidebar/normalizePointerSidebarTree";
import {
  createImageSidebarModePredicates,
  resolvePathLeaf,
} from "../sidebar/sidebarTreePredicates";

const MUSIC_BOOKLET_ROOT_LABEL = "CD Booklet";

const imageSidebarPredicates = createImageSidebarModePredicates();
const isCompressibleImageFolderNode =
  imageSidebarPredicates.isCompressibleFolderNode;
const isImagePointerFolderNode = imageSidebarPredicates.isPointerFolderNode;
const isImageMediaNode = imageSidebarPredicates.isMediaNode;

function compactImageSidebarTree(nodes: SidebarNode[]): SidebarNode[] {
  return compactSidebarTree(nodes, {
    shouldCompressFolderNode: isCompressibleImageFolderNode,
    includeRoot: true,
  });
}

function reorderImageRootNodes(
  nodes: SidebarNode[],
  locale: string,
): SidebarNode[] {
  const localeCollator = new Intl.Collator(locale, { sensitivity: "base" });
  const next = [...nodes];
  next.sort((left, right) => {
    const leftRootSegment = left.pathKey.split("/")[0] ?? left.pathKey;
    const rightRootSegment = right.pathKey.split("/")[0] ?? right.pathKey;
    const leftBooklet =
      localeCollator.compare(leftRootSegment, MUSIC_BOOKLET_ROOT_LABEL) === 0;
    const rightBooklet =
      localeCollator.compare(rightRootSegment, MUSIC_BOOKLET_ROOT_LABEL) === 0;
    if (leftBooklet === rightBooklet) {
      return 0;
    }
    return leftBooklet ? 1 : -1;
  });
  return next;
}

interface UseImageSidebarBaseStateParams {
  imageTreeRaw: SidebarNode[];
  imageRootNode: SidebarNode | null;
  sidebarTreeDisplayMode?: SidebarTreeDisplayMode;
}

interface UseImageSidebarBaseStateResult {
  imageTreeForSidebarNormal: SidebarNode[];
  normalImageSourceNodeIdMap: Map<string, string>;
}

function resolveRootScopedImageNodes(
  imageRootNode: SidebarNode,
): SidebarNode[] {
  if (isImagePointerFolderNode(imageRootNode)) {
    return imageRootNode.children;
  }
  return [imageRootNode];
}

function pruneProceduralImagePathNodes(nodes: SidebarNode[]): SidebarNode[] {
  const next: SidebarNode[] = [];

  for (const node of nodes) {
    const normalizedChildren = pruneProceduralImagePathNodes(node.children);
    const nextNode: SidebarNode = {
      ...node,
      children: normalizedChildren,
    };

    const hasDirectMediaChild = nextNode.children.some((child) =>
      isImageMediaNode(child),
    );
    if (isImagePointerFolderNode(nextNode) && !hasDirectMediaChild) {
      next.push(...nextNode.children);
      continue;
    }

    next.push(nextNode);
  }

  return next;
}

function collapseImageMediaNodeChildren(nodes: SidebarNode[]): SidebarNode[] {
  return nodes.map((node) => {
    const normalizedChildren = collapseImageMediaNodeChildren(node.children);
    if (isImageMediaNode(node)) {
      return {
        ...node,
        children: [],
      };
    }

    return {
      ...node,
      children: normalizedChildren,
    };
  });
}

function buildImageSourceNodeIdMap(nodes: SidebarNode[]): Map<string, string> {
  const map = new Map<string, string>();

  const walk = (node: SidebarNode, mediaOwnerNodeId: string | null) => {
    const nodeIsMedia = isImageMediaNode(node);
    const ownerNodeId = mediaOwnerNodeId ?? (nodeIsMedia ? node.id : null);

    if (node.imageSourceId) {
      map.set(node.imageSourceId, ownerNodeId ?? node.id);
    }

    for (const child of node.children) {
      walk(child, ownerNodeId);
    }
  };

  for (const node of nodes) {
    walk(node, null);
  }

  return map;
}

function normalizeHierarchyLabels(nodes: SidebarNode[]): SidebarNode[] {
  return nodes.map((node) => ({
    ...node,
    label: resolvePathLeaf(node.pathKey, node.label),
    children: normalizeHierarchyLabels(node.children),
  }));
}

export function useImageSidebarBaseState({
  imageTreeRaw,
  imageRootNode,
  sidebarTreeDisplayMode = "direct",
}: UseImageSidebarBaseStateParams): UseImageSidebarBaseStateResult {
  const uiLocale = useUiStore((state) => state?.uiLocale ?? "auto");
  const activeLocale = useMemo(
    () =>
      resolveActiveLocale(
        uiLocale,
        typeof navigator === "undefined" ? null : navigator.language,
      ),
    [uiLocale],
  );

  const { imageTreeForSidebarNormal, normalImageSourceNodeIdMap } =
    useMemo(() => {
      const normalizeTree = (nodes: SidebarNode[]) =>
        normalizePointerSidebarTree(nodes, {
          isPointerFolderNode: isImagePointerFolderNode,
          isMediaNode: isImageMediaNode,
          pointerLabelMode:
            sidebarTreeDisplayMode === "hierarchy" ? "segment" : "path",
          siblingOrder: "media-first",
        });

      const hierarchyRootScopedNodes = imageRootNode
        ? resolveRootScopedImageNodes(imageRootNode)
        : reorderImageRootNodes(imageTreeRaw, activeLocale);
      const directRootScopedNodes = imageRootNode
        ? compactImageSidebarTree(resolveRootScopedImageNodes(imageRootNode))
        : reorderImageRootNodes(
            compactImageSidebarTree(imageTreeRaw),
            activeLocale,
          );

      const displayNodes =
        sidebarTreeDisplayMode === "hierarchy"
          ? normalizeHierarchyLabels(hierarchyRootScopedNodes)
          : pruneProceduralImagePathNodes(directRootScopedNodes);
      const normalizedNodes = normalizeTree(displayNodes);
      return {
        imageTreeForSidebarNormal:
          collapseImageMediaNodeChildren(normalizedNodes),
        normalImageSourceNodeIdMap: buildImageSourceNodeIdMap(normalizedNodes),
      };
    }, [activeLocale, imageRootNode, imageTreeRaw, sidebarTreeDisplayMode]);

  return {
    imageTreeForSidebarNormal,
    normalImageSourceNodeIdMap,
  };
}
