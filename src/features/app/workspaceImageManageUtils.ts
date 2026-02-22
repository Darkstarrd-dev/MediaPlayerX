interface SidebarImageNodeLike {
  id: string;
  imageNodeType?: string;
  children: SidebarImageNodeLike[];
}

interface SidebarNodeLike {
  imageNodeType?: string;
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
          return (
            Boolean(node) &&
            (node?.imageNodeType === "package" ||
              node?.imageNodeType === "directory")
          );
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
