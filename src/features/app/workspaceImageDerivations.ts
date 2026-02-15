import type { FocusedImageRef, ImagePackage, SidebarNode } from "../../types";

function resolveNodePreviewSourceIds(node: SidebarNode): string[] {
  const sourceIds: string[] = [];
  const visited = new Set<string>();

  const walk = (current: SidebarNode) => {
    if (current.imageSourceId && !visited.has(current.imageSourceId)) {
      visited.add(current.imageSourceId);
      sourceIds.push(current.imageSourceId);
    }
    for (const child of current.children) {
      walk(child);
    }
  };

  walk(node);
  return sourceIds;
}

function resolveFirstVisibleImage(
  sourceIds: string[],
  packageByIdEffective: Map<string, ImagePackage>,
): { sourceId: string; imageId: string } | null {
  for (const sourceId of sourceIds) {
    const source = packageByIdEffective.get(sourceId);
    if (!source) {
      continue;
    }

    const image = source.images.find((item) => !item.hidden);
    if (image) {
      return {
        sourceId,
        imageId: image.id,
      };
    }
  }

  return null;
}

interface BuildNodeBrowseItemsParams {
  nodeBrowseMode: boolean;
  selectedSidebarNode: SidebarNode | null;
  packageByIdEffective: Map<string, ImagePackage>;
  sourceCoverImageUrlBySourceId: Record<string, string>;
  thumbnailImageUrlById: Record<string, string>;
}

export function buildNodeBrowseItems({
  nodeBrowseMode,
  selectedSidebarNode,
  packageByIdEffective,
  sourceCoverImageUrlBySourceId,
  thumbnailImageUrlById,
}: BuildNodeBrowseItemsParams) {
  if (!nodeBrowseMode) {
    return [];
  }

  return (selectedSidebarNode?.children ?? []).map((child) => {
    const hasOwnImages =
      child.imageNodeType === "package" || child.imageNodeType === "directory";
    const coverSourceIdFromNode = child.coverSourceId?.trim() || null;
    const coverImageIdFromNode = child.coverImageId?.trim() || null;
    const previewSourceIds = coverSourceIdFromNode
      ? [coverSourceIdFromNode]
      : coverImageIdFromNode
        ? []
        : resolveNodePreviewSourceIds(child);
    const firstVisibleImage = coverImageIdFromNode
      ? {
          sourceId: coverSourceIdFromNode ?? "",
          imageId: coverImageIdFromNode,
        }
      : resolveFirstVisibleImage(previewSourceIds, packageByIdEffective);
    const previewSourceId =
      coverSourceIdFromNode ?? firstVisibleImage?.sourceId ?? previewSourceIds[0] ?? null;
    const ownSource = child.imageSourceId
      ? packageByIdEffective.get(child.imageSourceId)
      : null;
    const visibleImageCount = ownSource
      ? ownSource.images.reduce(
          (count, image) => (image.hidden ? count : count + 1),
          0,
        )
      : (child.directImageCount ?? 0);
    const coverImageUrl =
      (previewSourceId
        ? sourceCoverImageUrlBySourceId[previewSourceId]
        : null) ??
      (firstVisibleImage
        ? (thumbnailImageUrlById[firstVisibleImage.imageId] ?? null)
        : null);

    return {
      nodeId: child.id,
      imageSourceId: child.imageSourceId,
      imageNodeType: child.imageNodeType ?? "folder",
      label: child.label,
      packageCount: child.descendantPackageCount ?? 0,
      imageCount: hasOwnImages
        ? visibleImageCount
        : (child.descendantImageCount ?? 0),
      descendantNodeCount: child.descendantNodeCount ?? child.children.length,
      coverImageUrl,
    };
  });
}

export function resolveRefsInPageForDisplay(
  refsInPageEffective: FocusedImageRef[],
  options: {
    manageMode: boolean;
    hideUncheckedNonChecked: boolean;
    imageCheckedIdSet: Set<string>;
    packageByIdEffective: Map<string, ImagePackage>;
  },
): FocusedImageRef[] {
  if (!options.manageMode || !options.hideUncheckedNonChecked) {
    return refsInPageEffective;
  }

  return refsInPageEffective.filter((ref) => {
    const imageId = options.packageByIdEffective.get(ref.packageId)?.images[
      ref.imageIndex
    ]?.id;
    return Boolean(imageId && options.imageCheckedIdSet.has(imageId));
  });
}
