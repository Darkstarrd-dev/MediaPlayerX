interface SidebarImageNodeLike {
  id: string;
  imageNodeType?: string;
  children: SidebarImageNodeLike[];
}

interface SidebarNodeLike {
  imageNodeType?: string;
  imageSourceId?: string;
}

interface ResolveImageConvertScopeNodeIdsParams {
  mode: string;
  manageMode: boolean;
  activeSelectionScope: string | null;
  sidebarCheckedNodeIds: string[];
  selectedSidebarNodeId: string | null;
  sidebarNodeById: Map<string, SidebarNodeLike>;
}

interface ResolveScopedImageConvertNavigationNodeIdParams {
  scopeNodeIds: string[];
  selectedSidebarNodeId: string | null;
  selectedPackageId: string;
  sidebarNodeById: Map<string, SidebarNodeLike>;
  step: number;
}

export function isConvertibleImageSidebarNode(
  node: SidebarNodeLike | undefined,
): boolean {
  return (
    Boolean(node) &&
    (node?.imageNodeType === "package" || node?.imageNodeType === "directory")
  );
}

export function resolveImageConvertScopeNodeIds({
  mode,
  manageMode,
  activeSelectionScope,
  sidebarCheckedNodeIds,
  selectedSidebarNodeId,
  sidebarNodeById,
}: ResolveImageConvertScopeNodeIdsParams): string[] {
  if (mode !== "image") {
    return [];
  }

  if (manageMode) {
    if (activeSelectionScope !== "sidebar" || sidebarCheckedNodeIds.length === 0) {
      return [];
    }
    const convertibleNodeIds = sidebarCheckedNodeIds.filter((nodeId) =>
      isConvertibleImageSidebarNode(sidebarNodeById.get(nodeId)),
    );
    return convertibleNodeIds.length === sidebarCheckedNodeIds.length
      ? convertibleNodeIds
      : [];
  }

  if (!selectedSidebarNodeId) {
    return [];
  }

  const selectedNode = sidebarNodeById.get(selectedSidebarNodeId);
  if (!isConvertibleImageSidebarNode(selectedNode)) {
    return [];
  }
  return [selectedSidebarNodeId];
}

export function resolveScopedImageConvertNavigationNodeId({
  scopeNodeIds,
  selectedSidebarNodeId,
  selectedPackageId,
  sidebarNodeById,
  step,
}: ResolveScopedImageConvertNavigationNodeIdParams): string | null {
  if (scopeNodeIds.length === 0 || step === 0) {
    return null;
  }

  const fallbackIndexByPackageId = scopeNodeIds.findIndex((nodeId) => {
    const node = sidebarNodeById.get(nodeId);
    return node?.imageSourceId === selectedPackageId;
  });
  const fallbackIndex = fallbackIndexByPackageId >= 0 ? fallbackIndexByPackageId : 0;
  const selectedIndex = selectedSidebarNodeId
    ? scopeNodeIds.indexOf(selectedSidebarNodeId)
    : -1;
  const currentIndex = selectedIndex >= 0 ? selectedIndex : fallbackIndex;
  const nextIndex = Math.max(
    0,
    Math.min(scopeNodeIds.length - 1, currentIndex + step),
  );
  return scopeNodeIds[nextIndex] ?? null;
}

export function buildImageSidebarWheelContext(
  mode: string,
  sidebarImageTreeNodes: SidebarImageNodeLike[],
) {
  if (mode !== "image") {
    return {
      imageSidebarNodeIdsForWheel: [] as string[],
      imageSidebarNodeIndexByIdForWheel: new Map<string, number>(),
    };
  }

  const orderedIds: string[] = [];
  const walk = (nodes: SidebarImageNodeLike[]) => {
    for (const node of nodes) {
      orderedIds.push(node.id);
      if (node.children.length > 0) {
        walk(node.children);
      }
    }
  };
  walk(sidebarImageTreeNodes);

  return {
    imageSidebarNodeIdsForWheel: orderedIds,
    imageSidebarNodeIndexByIdForWheel: new Map(
      orderedIds.map((nodeId, index) => [nodeId, index]),
    ),
  };
}

export function resolveImageConvertManageState({
  mode,
  activeSelectionScope,
  sidebarCheckedNodeIds,
  sidebarNodeById,
}: {
  mode: string;
  activeSelectionScope: string | null;
  sidebarCheckedNodeIds: string[];
  sidebarNodeById: Map<string, SidebarNodeLike>;
}) {
  const selectedConvertibleSidebarNodeIds =
    mode === "image"
      ? sidebarCheckedNodeIds.filter((nodeId) => {
          const node = sidebarNodeById.get(nodeId);
          return isConvertibleImageSidebarNode(node);
        })
      : [];

  const canManageImageConvert =
    mode === "image" &&
    activeSelectionScope === "sidebar" &&
    sidebarCheckedNodeIds.length > 0 &&
    selectedConvertibleSidebarNodeIds.length === sidebarCheckedNodeIds.length;

  return {
    selectedConvertibleSidebarNodeIds,
    canManageImageConvert,
  };
}
