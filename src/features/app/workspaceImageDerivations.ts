import type { FocusedImageRef, ImagePackage, SidebarNode } from '../../types'

function resolveNodePreviewSourceId(node: SidebarNode): string | null {
  if (node.imageSourceId) {
    return node.imageSourceId
  }
  for (const child of node.children) {
    const found = resolveNodePreviewSourceId(child)
    if (found) {
      return found
    }
  }
  return null
}

interface BuildNodeBrowseItemsParams {
  nodeBrowseMode: boolean
  selectedSidebarNode: SidebarNode | null
  packageByIdEffective: Map<string, ImagePackage>
  sourceCoverImageUrlBySourceId: Record<string, string>
  thumbnailImageUrlById: Record<string, string>
}

export function buildNodeBrowseItems({
  nodeBrowseMode,
  selectedSidebarNode,
  packageByIdEffective,
  sourceCoverImageUrlBySourceId,
  thumbnailImageUrlById,
}: BuildNodeBrowseItemsParams) {
  if (!nodeBrowseMode) {
    return []
  }

  return (selectedSidebarNode?.children ?? []).map((child) => {
    const hasOwnImages = child.imageNodeType === 'package' || child.imageNodeType === 'directory'
    const previewSourceId = hasOwnImages ? (child.imageSourceId ?? resolveNodePreviewSourceId(child)) : resolveNodePreviewSourceId(child)
    const previewSource = previewSourceId ? packageByIdEffective.get(previewSourceId) : null
    const fallbackImageId = previewSource?.images.find((image) => !image.hidden)?.id
    const visibleImageCount = previewSource
      ? previewSource.images.reduce((count, image) => (image.hidden ? count : count + 1), 0)
      : child.directImageCount ?? 0
    const coverImageUrl =
      (previewSourceId ? sourceCoverImageUrlBySourceId[previewSourceId] : null) ??
      (fallbackImageId ? thumbnailImageUrlById[fallbackImageId] ?? null : null)

    return {
      nodeId: child.id,
      imageSourceId: child.imageSourceId,
      imageNodeType: child.imageNodeType ?? 'folder',
      label: child.label,
      packageCount: child.descendantPackageCount ?? 0,
      imageCount: hasOwnImages ? visibleImageCount : child.descendantImageCount ?? 0,
      descendantNodeCount: child.descendantNodeCount ?? child.children.length,
      coverImageUrl,
    }
  })
}

export function resolveRefsInPageForDisplay(
  refsInPageEffective: FocusedImageRef[],
  options: {
    manageMode: boolean
    hideUncheckedNonChecked: boolean
    imageCheckedIdSet: Set<string>
    packageByIdEffective: Map<string, ImagePackage>
  },
): FocusedImageRef[] {
  if (!options.manageMode || !options.hideUncheckedNonChecked) {
    return refsInPageEffective
  }

  return refsInPageEffective.filter((ref) => {
    const imageId = options.packageByIdEffective.get(ref.packageId)?.images[ref.imageIndex]?.id
    return Boolean(imageId && options.imageCheckedIdSet.has(imageId))
  })
}
