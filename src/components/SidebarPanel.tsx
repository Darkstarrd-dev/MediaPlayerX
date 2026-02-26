import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { MainUiIcon } from "./MainUiIcon";
import { SidebarPanelRow } from "./SidebarPanelRow";
import { useI18n } from "../i18n/useI18n";
import type { BrowserMode, SidebarNode } from "../types";
import {
  flattenVisibleSidebarRows,
  isSameNodeIdSet,
  resolveFirstAudioId,
  resolveAncestorNodeIds,
  resolveAudioParentNodeIds,
  resolveImagePackageParentNodeIds,
  resolveNodeOrderIndexById,
  resolveVideoParentNodeIds,
  type SidebarLabelDisplayMode,
  type VisibleSidebarRow,
} from "./sidebarPanelTreeUtils";

interface SidebarPanelProps {
  mode: BrowserMode;
  sidebarFocus: "sidebar" | "main";
  sidebarRatio: number;
  sidebarMinWidth: number;
  sidebarFontSize: number;
  sidebarCountFontSize: number;
  sidebarIndentStep: number;
  sidebarVerticalGap: number;
  currentRootLabel: string | null;
  selectedSidebarNodeId: string | null;
  canSetCurrentRoot: boolean;
  imageRootNodeId: string | null;
  videoRootNodeId: string | null;
  musicRootNodeId: string | null;
  imageTreeNodes: SidebarNode[];
  videoTreeNodes: SidebarNode[];
  audioTreeNodes: SidebarNode[];
  imageNodeLoadStateById?: Record<string, "pending" | "running">;
  selectedPackageId: string;
  selectedVideoId: string;
  selectedAudioId: string;
  imageHighlightByNode?: boolean;
  searchResultMode?: boolean;
  searchResultReadonly?: boolean;
  canGoToFromSearchMode?: boolean;
  manageMode?: boolean;
  metadataManageMode?: boolean;
  metadataManageSelectionMode?: "single" | "multiple";
  checkedSidebarNodeIds?: ReadonlySet<string>;
  playlistIds: string[];
  audioPlaylistIds: string[];
  onSelectNode: (nodeId: string) => void;
  onSelectPackage: (packageId: string) => void;
  onSelectVideo: (videoId: string) => void;
  onSelectVideoAndPlay?: (videoId: string) => void;
  onSelectAudio: (audioId: string) => void;
  onCollapseSidebar: () => void;
  onSetCurrentRoot: () => void;
  onGoToFromSearchMode: () => void;
  onResetRoot: () => void;
  onToggleVideoPlaylist: (videoId: string, checked: boolean) => void;
  onToggleAudioPlaylist: (audioId: string, checked: boolean) => void;
  onClearSidebarSelection?: () => void;
  onSelectMetadataSingleNode?: (nodeId: string) => void;
  onToggleManageNode?: (nodeId: string, shiftKey: boolean) => void;
  collapsedFolderNodeIds?: string[];
  onSetCollapsedFolderNodeIds?: (nodeIds: string[]) => void;
  sidebarLabelDisplayMode?: SidebarLabelDisplayMode;
  onToggleSidebarLabelDisplayMode?: () => void;
  titleCollapseEnabled?: boolean;
}

function SidebarPanel({
  mode,
  sidebarFocus,
  sidebarRatio,
  sidebarMinWidth,
  sidebarFontSize,
  sidebarCountFontSize,
  sidebarIndentStep,
  sidebarVerticalGap,
  currentRootLabel,
  selectedSidebarNodeId,
  canSetCurrentRoot,
  imageRootNodeId,
  videoRootNodeId,
  musicRootNodeId,
  imageTreeNodes,
  videoTreeNodes,
  audioTreeNodes,
  imageNodeLoadStateById = {},
  searchResultMode = false,
  searchResultReadonly = false,
  canGoToFromSearchMode = false,
  manageMode = false,
  metadataManageMode = false,
  metadataManageSelectionMode = "multiple",
  checkedSidebarNodeIds,
  audioPlaylistIds,
  onSelectNode,
  onSelectPackage,
  onSelectVideo,
  onSelectVideoAndPlay,
  onSelectAudio,
  onCollapseSidebar,
  onSetCurrentRoot,
  onGoToFromSearchMode,
  onResetRoot,
  onToggleAudioPlaylist,
  onClearSidebarSelection,
  onSelectMetadataSingleNode,
  onToggleManageNode,
  collapsedFolderNodeIds,
  onSetCollapsedFolderNodeIds,
  sidebarLabelDisplayMode,
  onToggleSidebarLabelDisplayMode,
  titleCollapseEnabled = true,
}: SidebarPanelProps) {
  const { t } = useI18n();
  const manageStyleEnabled = manageMode || metadataManageMode;
  const metadataSingleSelectEnabled =
    metadataManageMode && metadataManageSelectionMode === "single";
  const manageToggleEnabled =
    manageMode ||
    (metadataManageMode && metadataManageSelectionMode === "multiple");
  const checkedNodes = checkedSidebarNodeIds ?? new Set<string>();
  const [
    localCollapsedImageFolderNodeIds,
    setLocalCollapsedImageFolderNodeIds,
  ] = useState<Set<string>>(new Set());
  const collapsedImageFolderNodeIds = useMemo(() => {
    if (onSetCollapsedFolderNodeIds) {
      return new Set(collapsedFolderNodeIds ?? []);
    }
    return localCollapsedImageFolderNodeIds;
  }, [
    collapsedFolderNodeIds,
    localCollapsedImageFolderNodeIds,
    onSetCollapsedFolderNodeIds,
  ]);
  const manageDragCleanupRef = useRef<(() => void) | null>(null);
  const labelTextElementByNodeIdRef = useRef<Map<string, HTMLSpanElement>>(
    new Map(),
  );
  const overflowMeasureRafIdRef = useRef<number | null>(null);
  const suppressAutoExpandAncestorFoldersRef = useRef(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [localSidebarLabelDisplayMode, setLocalSidebarLabelDisplayMode] =
    useState<SidebarLabelDisplayMode>("full");
  const effectiveSidebarLabelDisplayMode =
    sidebarLabelDisplayMode ?? localSidebarLabelDisplayMode;
  const [overflowingNodeIds, setOverflowingNodeIds] = useState<Set<string>>(
    new Set(),
  );
  const suppressManageClickRef = useRef(false);
  const manageDragStateRef = useRef<{
    startX: number;
    startY: number;
    dragStarted: boolean;
    lastNodeId: string;
    pointerId: number;
  } | null>(null);
  const detachManageDragListeners = useCallback(() => {
    const cleanup = manageDragCleanupRef.current;
    if (cleanup) {
      manageDragCleanupRef.current = null;
      cleanup();
    }
    manageDragStateRef.current = null;
  }, []);

  const clearSidebarAlignRaf = useCallback(() => {
    if (sidebarAlignRafIdRef.current === null) {
      return;
    }
    cancelAnimationFrame(sidebarAlignRafIdRef.current);
    sidebarAlignRafIdRef.current = null;
  }, []);

  const clearOverflowMeasureRaf = useCallback(() => {
    if (overflowMeasureRafIdRef.current === null) {
      return;
    }
    cancelAnimationFrame(overflowMeasureRafIdRef.current);
    overflowMeasureRafIdRef.current = null;
  }, []);

  useEffect(
    () => () => {
      detachManageDragListeners();
      clearSidebarAlignRaf();
      clearOverflowMeasureRaf();
    },
    [clearOverflowMeasureRaf, clearSidebarAlignRaf, detachManageDragListeners],
  );

  const refreshVisibleOverflowStates = useCallback(() => {
    const next = new Set<string>();
    for (const [
      nodeId,
      element,
    ] of labelTextElementByNodeIdRef.current.entries()) {
      if (!element.isConnected) {
        continue;
      }
      const primaryTextElement = element.querySelector<HTMLElement>(
        ".sidebar-label-text",
      );
      const textScrollWidth =
        primaryTextElement?.scrollWidth ?? element.scrollWidth;
      if (textScrollWidth - element.clientWidth > 1) {
        next.add(nodeId);
      }
    }

    setOverflowingNodeIds((previous) => {
      return isSameNodeIdSet(previous, next) ? previous : next;
    });
  }, []);

  const scheduleOverflowMeasure = useCallback(() => {
    clearOverflowMeasureRaf();
    overflowMeasureRafIdRef.current = requestAnimationFrame(() => {
      overflowMeasureRafIdRef.current = null;
      refreshVisibleOverflowStates();
    });
  }, [clearOverflowMeasureRaf, refreshVisibleOverflowStates]);

  useEffect(() => {
    if (sidebarFocus !== "sidebar") {
      return;
    }

    const onNavigationKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        event.key === "PageUp" ||
        event.key === "PageDown" ||
        event.key === "Home" ||
        event.key === "End"
      ) {
        setHoveredNodeId(null);
      }
    };

    window.addEventListener("keydown", onNavigationKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onNavigationKeyDown, true);
    };
  }, [sidebarFocus]);

  const updateCollapsedImageFolderNodeIds = useCallback(
    (updater: (previous: Set<string>) => Set<string>) => {
      if (onSetCollapsedFolderNodeIds) {
        const previous = new Set(collapsedFolderNodeIds ?? []);
        const next = updater(new Set(previous));
        if (isSameNodeIdSet(previous, next)) {
          return;
        }
        onSetCollapsedFolderNodeIds(Array.from(next));
        return;
      }

      setLocalCollapsedImageFolderNodeIds((previous) => updater(previous));
    },
    [collapsedFolderNodeIds, onSetCollapsedFolderNodeIds],
  );

  const activeTreeNodes =
    mode === "image"
      ? imageTreeNodes
      : mode === "video"
        ? videoTreeNodes
        : audioTreeNodes;
  const sidebarTreeRef = useRef<HTMLDivElement | null>(null);
  const [sidebarScrollTop, setSidebarScrollTop] = useState(0);
  const [sidebarViewportHeight, setSidebarViewportHeight] = useState(0);
  const previousSelectedSidebarNodeIdRef = useRef<string | null>(null);
  const previousSidebarFocusRef = useRef<"sidebar" | "main">(sidebarFocus);
  const sidebarAlignRafIdRef = useRef<number | null>(null);

  const imageNodeById = useMemo(() => {
    if (mode !== "image") {
      return new Map<string, SidebarNode>();
    }

    const map = new Map<string, SidebarNode>();
    const walk = (nodes: SidebarNode[]) => {
      for (const node of nodes) {
        map.set(node.id, node);
        if (node.children.length > 0) {
          walk(node.children);
        }
      }
    };
    walk(imageTreeNodes);
    return map;
  }, [imageTreeNodes, mode]);

  const activeNodeById = useMemo(() => {
    const map = new Map<string, SidebarNode>();
    const walk = (nodes: SidebarNode[]) => {
      for (const node of nodes) {
        map.set(node.id, node);
        if (node.children.length > 0) {
          walk(node.children);
        }
      }
    };
    walk(activeTreeNodes);
    return map;
  }, [activeTreeNodes]);

  const imagePackageParentNodeIds = useMemo(
    () =>
      mode === "image" ? resolveImagePackageParentNodeIds(imageTreeNodes) : [],
    [imageTreeNodes, mode],
  );

  const imageNodeOrderIndexById = useMemo(
    () =>
      mode === "image"
        ? resolveNodeOrderIndexById(imageTreeNodes)
        : new Map<string, number>(),
    [imageTreeNodes, mode],
  );

  const videoParentNodeIds = useMemo(
    () => (mode === "video" ? resolveVideoParentNodeIds(videoTreeNodes) : []),
    [mode, videoTreeNodes],
  );

  const videoNodeOrderIndexById = useMemo(
    () =>
      mode === "video"
        ? resolveNodeOrderIndexById(videoTreeNodes)
        : new Map<string, number>(),
    [mode, videoTreeNodes],
  );

  const audioParentNodeIds = useMemo(
    () => (mode === "music" ? resolveAudioParentNodeIds(audioTreeNodes) : []),
    [audioTreeNodes, mode],
  );

  const audioNodeOrderIndexById = useMemo(
    () =>
      mode === "music"
        ? resolveNodeOrderIndexById(audioTreeNodes)
        : new Map<string, number>(),
    [audioTreeNodes, mode],
  );

  const allImagePackageParentsCollapsed = useMemo(() => {
    if (mode !== "image" || imagePackageParentNodeIds.length === 0) {
      return false;
    }
    return imagePackageParentNodeIds.every((nodeId) =>
      collapsedImageFolderNodeIds.has(nodeId),
    );
  }, [collapsedImageFolderNodeIds, imagePackageParentNodeIds, mode]);

  const imageParentNavigation = useMemo(() => {
    if (mode !== "image" || imagePackageParentNodeIds.length === 0) {
      return {
        previousNodeId: null as string | null,
        nextNodeId: null as string | null,
      };
    }

    const selectedTargetIndex = selectedSidebarNodeId
      ? imagePackageParentNodeIds.indexOf(selectedSidebarNodeId)
      : -1;
    if (selectedTargetIndex >= 0) {
      return {
        previousNodeId:
          imagePackageParentNodeIds[selectedTargetIndex - 1] ?? null,
        nextNodeId: imagePackageParentNodeIds[selectedTargetIndex + 1] ?? null,
      };
    }

    const selectedOrder = selectedSidebarNodeId
      ? imageNodeOrderIndexById.get(selectedSidebarNodeId)
      : undefined;
    if (selectedOrder === undefined) {
      return {
        previousNodeId: null,
        nextNodeId: imagePackageParentNodeIds[0] ?? null,
      };
    }

    let previousNodeId: string | null = null;
    let nextNodeId: string | null = null;
    for (const targetNodeId of imagePackageParentNodeIds) {
      const targetOrder = imageNodeOrderIndexById.get(targetNodeId);
      if (targetOrder === undefined) {
        continue;
      }
      if (targetOrder < selectedOrder) {
        previousNodeId = targetNodeId;
        continue;
      }
      if (targetOrder > selectedOrder) {
        nextNodeId = targetNodeId;
        break;
      }
    }

    return {
      previousNodeId,
      nextNodeId,
    };
  }, [
    imageNodeOrderIndexById,
    imagePackageParentNodeIds,
    mode,
    selectedSidebarNodeId,
  ]);

  const videoParentNavigation = useMemo(() => {
    if (mode !== "video" || videoParentNodeIds.length === 0) {
      return {
        previousNodeId: null as string | null,
        nextNodeId: null as string | null,
      };
    }

    const selectedTargetIndex = selectedSidebarNodeId
      ? videoParentNodeIds.indexOf(selectedSidebarNodeId)
      : -1;
    if (selectedTargetIndex >= 0) {
      return {
        previousNodeId: videoParentNodeIds[selectedTargetIndex - 1] ?? null,
        nextNodeId: videoParentNodeIds[selectedTargetIndex + 1] ?? null,
      };
    }

    const selectedOrder = selectedSidebarNodeId
      ? videoNodeOrderIndexById.get(selectedSidebarNodeId)
      : undefined;
    if (selectedOrder === undefined) {
      return {
        previousNodeId: null,
        nextNodeId: videoParentNodeIds[0] ?? null,
      };
    }

    let previousNodeId: string | null = null;
    let nextNodeId: string | null = null;
    for (const targetNodeId of videoParentNodeIds) {
      const targetOrder = videoNodeOrderIndexById.get(targetNodeId);
      if (targetOrder === undefined) {
        continue;
      }
      if (targetOrder < selectedOrder) {
        previousNodeId = targetNodeId;
        continue;
      }
      if (targetOrder > selectedOrder) {
        nextNodeId = targetNodeId;
        break;
      }
    }

    return {
      previousNodeId,
      nextNodeId,
    };
  }, [
    mode,
    selectedSidebarNodeId,
    videoNodeOrderIndexById,
    videoParentNodeIds,
  ]);

  const allVideoParentsCollapsed = useMemo(() => {
    if (mode !== "video" || videoParentNodeIds.length === 0) {
      return false;
    }
    return videoParentNodeIds.every((nodeId) =>
      collapsedImageFolderNodeIds.has(nodeId),
    );
  }, [collapsedImageFolderNodeIds, mode, videoParentNodeIds]);

  const audioParentNavigation = useMemo(() => {
    if (mode !== "music" || audioParentNodeIds.length === 0) {
      return {
        previousNodeId: null as string | null,
        nextNodeId: null as string | null,
      };
    }

    const selectedTargetIndex = selectedSidebarNodeId
      ? audioParentNodeIds.indexOf(selectedSidebarNodeId)
      : -1;
    if (selectedTargetIndex >= 0) {
      return {
        previousNodeId: audioParentNodeIds[selectedTargetIndex - 1] ?? null,
        nextNodeId: audioParentNodeIds[selectedTargetIndex + 1] ?? null,
      };
    }

    const selectedOrder = selectedSidebarNodeId
      ? audioNodeOrderIndexById.get(selectedSidebarNodeId)
      : undefined;
    if (selectedOrder === undefined) {
      return {
        previousNodeId: null,
        nextNodeId: audioParentNodeIds[0] ?? null,
      };
    }

    let previousNodeId: string | null = null;
    let nextNodeId: string | null = null;
    for (const targetNodeId of audioParentNodeIds) {
      const targetOrder = audioNodeOrderIndexById.get(targetNodeId);
      if (targetOrder === undefined) {
        continue;
      }
      if (targetOrder < selectedOrder) {
        previousNodeId = targetNodeId;
        continue;
      }
      if (targetOrder > selectedOrder) {
        nextNodeId = targetNodeId;
        break;
      }
    }

    return {
      previousNodeId,
      nextNodeId,
    };
  }, [
    audioNodeOrderIndexById,
    audioParentNodeIds,
    mode,
    selectedSidebarNodeId,
  ]);

  const allAudioParentsCollapsed = useMemo(() => {
    if (mode !== "music" || audioParentNodeIds.length === 0) {
      return false;
    }
    return audioParentNodeIds.every((nodeId) =>
      collapsedImageFolderNodeIds.has(nodeId),
    );
  }, [audioParentNodeIds, collapsedImageFolderNodeIds, mode]);

  const focusSidebarNodeWithRetry = useCallback((targetNodeId: string) => {
    let frame = 0;
    const maxFrames = 6;

    const tryFocus = () => {
      const currentContainer = sidebarTreeRef.current;
      if (!currentContainer) {
        return;
      }
      const rowElement = Array.from(
        currentContainer.querySelectorAll<HTMLElement>(
          "[data-sidebar-node-id]",
        ),
      ).find((element) => element.dataset.sidebarNodeId === targetNodeId);
      const labelElement = rowElement?.querySelector<HTMLButtonElement>(
        "[data-slot='fg-sidebar-main-label']",
      );
      if (labelElement) {
        labelElement.focus({ preventScroll: true });
        return;
      }

      frame += 1;
      if (frame < maxFrames) {
        requestAnimationFrame(tryFocus);
      }
    };

    requestAnimationFrame(tryFocus);
  }, []);

  const scrollSidebarToNode = useCallback(
    (targetNodeId: string) => {
      const container = sidebarTreeRef.current;
      if (!container) {
        return;
      }

      const rows: VisibleSidebarRow[] = [];
      flattenVisibleSidebarRows(
        activeTreeNodes,
        0,
        mode,
        collapsedImageFolderNodeIds,
        rows,
      );
      const targetIndex = rows.findIndex((row) => row.node.id === targetNodeId);
      if (targetIndex < 0) {
        return;
      }

      const rowHeight = Math.max(
        24,
        Math.round(sidebarFontSize + sidebarVerticalGap + 14),
      );
      const rowTop = targetIndex * rowHeight;
      const rowBottom = rowTop + rowHeight;
      const viewTop = container.scrollTop;
      const viewBottom = viewTop + container.clientHeight;
      if (rowTop < viewTop) {
        container.scrollTop = Math.max(0, rowTop - 4);
      } else if (rowBottom > viewBottom) {
        container.scrollTop = Math.max(
          0,
          rowBottom - container.clientHeight + 4,
        );
      }
    },
    [
      activeTreeNodes,
      collapsedImageFolderNodeIds,
      mode,
      sidebarFontSize,
      sidebarVerticalGap,
    ],
  );

  const jumpToImageParentNode = useCallback(
    (targetNodeId: string | null) => {
      if (mode !== "image" || !targetNodeId) {
        return;
      }

      onSelectNode(targetNodeId);
      scrollSidebarToNode(targetNodeId);
      focusSidebarNodeWithRetry(targetNodeId);

      const targetNode = imageNodeById.get(targetNodeId);
      if (targetNode?.imageSourceId) {
        onSelectPackage(targetNode.imageSourceId);
      }
    },
    [
      focusSidebarNodeWithRetry,
      imageNodeById,
      mode,
      onSelectNode,
      onSelectPackage,
      scrollSidebarToNode,
    ],
  );

  const toggleCollapseImagePackageParentNodes = useCallback(() => {
    if (mode !== "image" || imagePackageParentNodeIds.length === 0) {
      return;
    }

    suppressAutoExpandAncestorFoldersRef.current = true;
    updateCollapsedImageFolderNodeIds((previous) => {
      const next = new Set(previous);
      if (allImagePackageParentsCollapsed) {
        let changed = false;
        for (const nodeId of imagePackageParentNodeIds) {
          if (!next.delete(nodeId)) {
            continue;
          }
          changed = true;
        }
        return changed ? next : previous;
      }

      let changed = false;
      for (const nodeId of imagePackageParentNodeIds) {
        if (next.has(nodeId)) {
          continue;
        }
        next.add(nodeId);
        changed = true;
      }
      return changed ? next : previous;
    });

    requestAnimationFrame(() => {
      suppressAutoExpandAncestorFoldersRef.current = false;
    });
  }, [
    allImagePackageParentsCollapsed,
    imagePackageParentNodeIds,
    mode,
    updateCollapsedImageFolderNodeIds,
  ]);

  const toggleCollapseVideoParentNodes = useCallback(() => {
    if (mode !== "video" || videoParentNodeIds.length === 0) {
      return;
    }

    suppressAutoExpandAncestorFoldersRef.current = true;
    updateCollapsedImageFolderNodeIds((previous) => {
      const next = new Set(previous);
      if (allVideoParentsCollapsed) {
        let changed = false;
        for (const nodeId of videoParentNodeIds) {
          if (!next.delete(nodeId)) {
            continue;
          }
          changed = true;
        }
        return changed ? next : previous;
      }

      let changed = false;
      for (const nodeId of videoParentNodeIds) {
        if (next.has(nodeId)) {
          continue;
        }
        next.add(nodeId);
        changed = true;
      }
      return changed ? next : previous;
    });

    requestAnimationFrame(() => {
      suppressAutoExpandAncestorFoldersRef.current = false;
    });
  }, [
    allVideoParentsCollapsed,
    mode,
    updateCollapsedImageFolderNodeIds,
    videoParentNodeIds,
  ]);

  const toggleCollapseAudioParentNodes = useCallback(() => {
    if (mode !== "music" || audioParentNodeIds.length === 0) {
      return;
    }

    suppressAutoExpandAncestorFoldersRef.current = true;
    updateCollapsedImageFolderNodeIds((previous) => {
      const next = new Set(previous);
      if (allAudioParentsCollapsed) {
        let changed = false;
        for (const nodeId of audioParentNodeIds) {
          if (!next.delete(nodeId)) {
            continue;
          }
          changed = true;
        }
        return changed ? next : previous;
      }

      let changed = false;
      for (const nodeId of audioParentNodeIds) {
        if (next.has(nodeId)) {
          continue;
        }
        next.add(nodeId);
        changed = true;
      }
      return changed ? next : previous;
    });

    requestAnimationFrame(() => {
      suppressAutoExpandAncestorFoldersRef.current = false;
    });
  }, [
    allAudioParentsCollapsed,
    audioParentNodeIds,
    mode,
    updateCollapsedImageFolderNodeIds,
  ]);

  const jumpToVideoParentNode = useCallback(
    (targetNodeId: string | null) => {
      if (mode !== "video" || !targetNodeId) {
        return;
      }

      onSelectNode(targetNodeId);
      scrollSidebarToNode(targetNodeId);
      focusSidebarNodeWithRetry(targetNodeId);
    },
    [focusSidebarNodeWithRetry, mode, onSelectNode, scrollSidebarToNode],
  );

  const jumpToAudioParentNode = useCallback(
    (targetNodeId: string | null) => {
      if (mode !== "music" || !targetNodeId) {
        return;
      }

      onSelectNode(targetNodeId);
      scrollSidebarToNode(targetNodeId);
      focusSidebarNodeWithRetry(targetNodeId);
    },
    [focusSidebarNodeWithRetry, mode, onSelectNode, scrollSidebarToNode],
  );

  const expandSelectedSidebarNodeAncestors = useCallback(() => {
    if (!selectedSidebarNodeId) {
      return;
    }

    if (suppressAutoExpandAncestorFoldersRef.current) {
      return;
    }

    const visibleRows: VisibleSidebarRow[] = [];
    flattenVisibleSidebarRows(
      activeTreeNodes,
      0,
      mode,
      collapsedImageFolderNodeIds,
      visibleRows,
    );
    if (visibleRows.some((row) => row.node.id === selectedSidebarNodeId)) {
      return;
    }

    const ancestorNodeIds = resolveAncestorNodeIds(
      activeTreeNodes,
      selectedSidebarNodeId,
    );
    if (ancestorNodeIds.length === 0) {
      return;
    }

    updateCollapsedImageFolderNodeIds((previous) => {
      const next = new Set(previous);
      let changed = false;

      for (const ancestorNodeId of ancestorNodeIds) {
        if (next.delete(ancestorNodeId)) {
          changed = true;
        }
      }

      return changed ? next : previous;
    });
  }, [
    activeTreeNodes,
    collapsedImageFolderNodeIds,
    mode,
    selectedSidebarNodeId,
    updateCollapsedImageFolderNodeIds,
  ]);

  const startManagePointerToggle = (
    startNodeId: string,
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    if (!manageToggleEnabled || !onToggleManageNode) {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    if (event.detail > 1) {
      return;
    }

    // Do selection toggle on pointer down so Shift+Click and drag toggling are stable.
    // Click handler may additionally drive navigation in metadata-manage mode.
    event.preventDefault();
    suppressManageClickRef.current = true;
    onToggleManageNode(startNodeId, event.shiftKey);

    detachManageDragListeners();
    manageDragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      dragStarted: false,
      lastNodeId: startNodeId,
      pointerId: event.pointerId,
    };

    const resolveNodeIdAtPoint = (
      clientX: number,
      clientY: number,
    ): string | null => {
      const element = document.elementFromPoint(clientX, clientY);
      const row = element?.closest<HTMLElement>("[data-sidebar-node-id]");
      return row?.dataset.sidebarNodeId ?? null;
    };

    const applyToggleForNode = (nodeId: string | null) => {
      const state = manageDragStateRef.current;
      if (!state || !nodeId) {
        return;
      }
      if (nodeId === state.lastNodeId) {
        return;
      }
      state.lastNodeId = nodeId;
      onToggleManageNode(nodeId, false);
    };

    const onPointerMove = (moveEvent: PointerEvent) => {
      const state = manageDragStateRef.current;
      if (!state || moveEvent.pointerId !== state.pointerId) {
        return;
      }
      if ((moveEvent.buttons & 1) !== 1) {
        detachManageDragListeners();
        return;
      }

      const movedEnough =
        Math.abs(moveEvent.clientX - state.startX) >= 2 ||
        Math.abs(moveEvent.clientY - state.startY) >= 2;
      if (!state.dragStarted && !movedEnough) {
        return;
      }
      state.dragStarted = true;

      applyToggleForNode(
        resolveNodeIdAtPoint(moveEvent.clientX, moveEvent.clientY),
      );
    };

    const onPointerUpOrCancel = (upEvent: PointerEvent) => {
      const state = manageDragStateRef.current;
      if (!state || upEvent.pointerId !== state.pointerId) {
        return;
      }
      if (upEvent.type === "pointerup") {
        onSelectNode(state.lastNodeId);
        if (metadataManageMode) {
          const targetNode = activeNodeById.get(state.lastNodeId);
          if (mode === "image" && targetNode?.imageSourceId) {
            onSelectPackage(targetNode.imageSourceId);
          } else if (mode === "video" && targetNode?.videoId) {
            onSelectVideo(targetNode.videoId);
          } else if (mode === "music" && targetNode) {
            const targetAudioId = resolveFirstAudioId(targetNode);
            if (targetAudioId) {
              onSelectAudio(targetAudioId);
            }
          }
          if (metadataSingleSelectEnabled) {
            onSelectMetadataSingleNode?.(state.lastNodeId);
          }
        }
      }
      detachManageDragListeners();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUpOrCancel);
    window.addEventListener("pointercancel", onPointerUpOrCancel);
    manageDragCleanupRef.current = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUpOrCancel);
      window.removeEventListener("pointercancel", onPointerUpOrCancel);
    };
  };
  const rootSet =
    mode === "image"
      ? Boolean(imageRootNodeId)
      : mode === "video"
        ? Boolean(videoRootNodeId)
        : Boolean(musicRootNodeId);
  const showRootToggle = !searchResultMode;
  const rootToggleLabel = rootSet
    ? t("a11y.sidebar.restoreRoot")
    : t("a11y.sidebar.setAsRoot");
  const rootToggleIconName = rootSet ? "return" : "setRoot";
  const collapseImageParentsLabel = allImagePackageParentsCollapsed
    ? t("a11y.sidebar.expandImageParents")
    : t("a11y.sidebar.collapseImageParents");
  const previousImageParentLabel = t("a11y.sidebar.previousImageParent");
  const nextImageParentLabel = t("a11y.sidebar.nextImageParent");
  const parentJumpModeEnabled =
    mode === "image" || mode === "video" || mode === "music";
  const allTargetParentsCollapsed =
    mode === "image"
      ? allImagePackageParentsCollapsed
      : mode === "video"
        ? allVideoParentsCollapsed
        : allAudioParentsCollapsed;
  const targetParentNodeIds =
    mode === "image"
      ? imagePackageParentNodeIds
      : mode === "video"
        ? videoParentNodeIds
        : audioParentNodeIds;
  const targetParentNavigation =
    mode === "image"
      ? imageParentNavigation
      : mode === "video"
        ? videoParentNavigation
        : audioParentNavigation;

  const visibleSidebarRows = useMemo(() => {
    const rows: VisibleSidebarRow[] = [];
    flattenVisibleSidebarRows(
      activeTreeNodes,
      0,
      mode,
      collapsedImageFolderNodeIds,
      rows,
    );
    return rows;
  }, [activeTreeNodes, collapsedImageFolderNodeIds, mode]);

  const estimatedRowContentHeight = useMemo(
    () => Math.max(24, Math.round(sidebarFontSize + 14)),
    [sidebarFontSize],
  );
  const estimatedRowBlockHeight = useMemo(
    () => Math.max(1, estimatedRowContentHeight + sidebarVerticalGap),
    [estimatedRowContentHeight, sidebarVerticalGap],
  );
  const virtualizeThreshold = 220;
  const shouldVirtualize =
    sidebarViewportHeight > 0 &&
    visibleSidebarRows.length > virtualizeThreshold;

  const virtualRange = useMemo(() => {
    if (!shouldVirtualize) {
      return {
        startIndex: 0,
        endIndex: visibleSidebarRows.length,
        topSpacerHeight: 0,
        bottomSpacerHeight: 0,
      };
    }

    const overscanRows = 10;
    const rowGap = Math.max(0, sidebarVerticalGap);
    const safeScrollTop = Math.max(0, sidebarScrollTop);
    const startIndex = Math.max(
      0,
      Math.floor(safeScrollTop / estimatedRowBlockHeight) - overscanRows,
    );
    const visibleCount =
      Math.ceil((sidebarViewportHeight + rowGap) / estimatedRowBlockHeight) +
      overscanRows * 2;
    const endIndex = Math.min(
      visibleSidebarRows.length,
      startIndex + Math.max(1, visibleCount),
    );
    const topSpacerHeight =
      startIndex > 0
        ? startIndex * estimatedRowContentHeight + (startIndex - 1) * rowGap
        : 0;
    const trailingCount = Math.max(0, visibleSidebarRows.length - endIndex);
    const bottomSpacerHeight =
      trailingCount > 0
        ? trailingCount * estimatedRowContentHeight +
          (trailingCount - 1) * rowGap
        : 0;

    return {
      startIndex,
      endIndex,
      topSpacerHeight,
      bottomSpacerHeight,
    };
  }, [
    estimatedRowBlockHeight,
    estimatedRowContentHeight,
    shouldVirtualize,
    sidebarVerticalGap,
    sidebarScrollTop,
    sidebarViewportHeight,
    visibleSidebarRows.length,
  ]);

  const rowsForRender = useMemo(
    () =>
      visibleSidebarRows.slice(virtualRange.startIndex, virtualRange.endIndex),
    [visibleSidebarRows, virtualRange.endIndex, virtualRange.startIndex],
  );

  useEffect(() => {
    const container = sidebarTreeRef.current;
    if (!container) {
      return;
    }

    const refreshViewport = () => {
      setSidebarViewportHeight(container.clientHeight);
    };

    refreshViewport();
    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      refreshViewport();
      scheduleOverflowMeasure();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [scheduleOverflowMeasure]);

  useEffect(() => {
    scheduleOverflowMeasure();
  }, [
    rowsForRender,
    scheduleOverflowMeasure,
    sidebarFontSize,
    sidebarIndentStep,
  ]);

  useEffect(() => {
    const handleWindowResize = () => {
      scheduleOverflowMeasure();
    };
    window.addEventListener("resize", handleWindowResize);

    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    const handleFontLoadingDone = () => {
      scheduleOverflowMeasure();
    };
    fonts?.addEventListener?.("loadingdone", handleFontLoadingDone);

    return () => {
      window.removeEventListener("resize", handleWindowResize);
      fonts?.removeEventListener?.("loadingdone", handleFontLoadingDone);
    };
  }, [scheduleOverflowMeasure]);

  const alignSidebarNodeIntoView = useCallback(
    (targetNodeId: string): boolean => {
      const container = sidebarTreeRef.current;
      if (!container) {
        return true;
      }

      const renderedRow = Array.from(
        container.querySelectorAll<HTMLElement>("[data-sidebar-node-id]"),
      ).find((row) => row.dataset.sidebarNodeId === targetNodeId);

      if (renderedRow) {
        const rowTop = renderedRow.offsetTop;
        const rowBottom = rowTop + renderedRow.offsetHeight;
        const viewTop = container.scrollTop;
        const viewBottom = viewTop + container.clientHeight;

        if (rowTop < viewTop) {
          container.scrollTop = Math.max(0, rowTop - 4);
        } else if (rowBottom > viewBottom) {
          container.scrollTop = Math.max(
            0,
            rowBottom - container.clientHeight + 4,
          );
        }
        return true;
      }

      const targetIndex = visibleSidebarRows.findIndex(
        (row) => row.node.id === targetNodeId,
      );
      if (targetIndex < 0) {
        return true;
      }

      const estimatedAlignRowHeight = Math.max(34, estimatedRowBlockHeight);
      const rowTop = targetIndex * estimatedAlignRowHeight;
      const rowBottom = rowTop + estimatedAlignRowHeight;
      const viewTop = container.scrollTop;
      const viewBottom = viewTop + container.clientHeight;

      if (rowTop < viewTop) {
        container.scrollTop = Math.max(0, rowTop - 4);
      } else if (rowBottom > viewBottom) {
        container.scrollTop = Math.max(
          0,
          rowBottom - container.clientHeight + 4,
        );
      }

      return false;
    },
    [estimatedRowBlockHeight, visibleSidebarRows],
  );

  const alignSidebarNodeIntoViewWithRetry = useCallback(
    (targetNodeId: string) => {
      clearSidebarAlignRaf();
      let frame = 0;
      const maxFrames = 6;

      const tryAlign = () => {
        const aligned = alignSidebarNodeIntoView(targetNodeId);
        if (aligned || frame >= maxFrames) {
          sidebarAlignRafIdRef.current = null;
          return;
        }
        frame += 1;
        sidebarAlignRafIdRef.current = requestAnimationFrame(tryAlign);
      };

      tryAlign();
    },
    [alignSidebarNodeIntoView, clearSidebarAlignRaf],
  );

  useEffect(() => {
    const previousSelectedSidebarNodeId =
      previousSelectedSidebarNodeIdRef.current;
    const previousSidebarFocus = previousSidebarFocusRef.current;
    previousSelectedSidebarNodeIdRef.current = selectedSidebarNodeId;
    previousSidebarFocusRef.current = sidebarFocus;

    if (!selectedSidebarNodeId) {
      return;
    }

    const selectedNodeChanged =
      selectedSidebarNodeId !== previousSelectedSidebarNodeId;
    const leftSidebarFocus =
      previousSidebarFocus === "sidebar" && sidebarFocus === "main";

    if (!selectedNodeChanged && !leftSidebarFocus) {
      return;
    }

    expandSelectedSidebarNodeAncestors();
    alignSidebarNodeIntoViewWithRetry(selectedSidebarNodeId);
  }, [
    alignSidebarNodeIntoViewWithRetry,
    expandSelectedSidebarNodeAncestors,
    selectedSidebarNodeId,
    sidebarFocus,
  ]);

  return (
    <aside
      className={`sidebar ${sidebarFocus === "sidebar" ? "is-focus" : ""}`}
      data-slot="fg-sidebar-root"
      style={{
        width: `${sidebarRatio * 100}%`,
        minWidth: `${sidebarMinWidth}px`,
      }}
    >
      <div className="sidebar-head" data-slot="fg-sidebar-toolbar">
        <button
          className="sidebar-title-btn"
          data-slot="fg-sidebar-toolbar-title"
          type="button"
          disabled={!titleCollapseEnabled}
          onClick={titleCollapseEnabled ? onCollapseSidebar : undefined}
        >
          {currentRootLabel ?? t("ui.sidebar.structure")}
        </button>

        <div className="sidebar-head-actions">
          {searchResultMode ? (
            <button
              className="sidebar-head-icon-btn"
              data-slot="fg-sidebar-toolbar-back"
              type="button"
              aria-label={t("a11y.common.back")}
              data-tooltip-label={t("tip.common.back")}
              disabled={!canGoToFromSearchMode}
              onClick={onGoToFromSearchMode}
            >
              <MainUiIcon name="return" />
            </button>
          ) : null}

          {showRootToggle ? (
            manageStyleEnabled ? (
              <button
                className="sidebar-head-icon-btn"
                data-slot="fg-sidebar-toolbar-clear"
                type="button"
                aria-label={t("a11y.common.clearSelection")}
                data-tooltip-label={t("tip.common.clearSelection")}
                disabled={checkedNodes.size === 0}
                onClick={onClearSidebarSelection}
              >
                <MainUiIcon name="unselectAll" />
              </button>
            ) : null
          ) : null}

          {showRootToggle ? (
            <button
              className={`sidebar-head-icon-btn ${effectiveSidebarLabelDisplayMode === "full" ? "is-root-set" : ""}`}
              data-slot="fg-sidebar-toolbar-label-mode-toggle"
              type="button"
              data-tooltip-label={
                effectiveSidebarLabelDisplayMode === "full"
                  ? "切换到末段名"
                  : "切换到完整路径"
              }
              onClick={() => {
                if (onToggleSidebarLabelDisplayMode) {
                  onToggleSidebarLabelDisplayMode();
                  return;
                }
                setLocalSidebarLabelDisplayMode((previous) =>
                  previous === "full" ? "leaf" : "full",
                );
              }}
            >
              {effectiveSidebarLabelDisplayMode === "full" ? "F" : "L"}
            </button>
          ) : null}

          {showRootToggle ? (
            parentJumpModeEnabled ? (
              <button
                className="sidebar-head-icon-btn"
                data-slot="fg-sidebar-toolbar-collapse-all"
                type="button"
                aria-label={collapseImageParentsLabel}
                data-tooltip-label={
                  allTargetParentsCollapsed
                    ? t("tip.sidebar.expandImageParents")
                    : t("tip.sidebar.collapseImageParents")
                }
                disabled={targetParentNodeIds.length === 0}
                onClick={
                  mode === "image"
                    ? toggleCollapseImagePackageParentNodes
                    : mode === "video"
                      ? toggleCollapseVideoParentNodes
                      : toggleCollapseAudioParentNodes
                }
              >
                <MainUiIcon
                  name={allTargetParentsCollapsed ? "expand" : "collapse"}
                />
              </button>
            ) : null
          ) : null}

          {showRootToggle ? (
            parentJumpModeEnabled ? (
              <button
                className="sidebar-head-icon-btn"
                data-slot="fg-sidebar-toolbar-prev-image-parent"
                type="button"
                aria-label={previousImageParentLabel}
                data-tooltip-label={t("tip.sidebar.previousImageParent")}
                disabled={!targetParentNavigation.previousNodeId}
                onClick={() => {
                  if (mode === "image") {
                    jumpToImageParentNode(
                      targetParentNavigation.previousNodeId,
                    );
                  } else if (mode === "video") {
                    jumpToVideoParentNode(
                      targetParentNavigation.previousNodeId,
                    );
                  } else {
                    jumpToAudioParentNode(
                      targetParentNavigation.previousNodeId,
                    );
                  }
                }}
              >
                <MainUiIcon name="prev" />
              </button>
            ) : null
          ) : null}

          {showRootToggle ? (
            parentJumpModeEnabled ? (
              <button
                className="sidebar-head-icon-btn"
                data-slot="fg-sidebar-toolbar-next-image-parent"
                type="button"
                aria-label={nextImageParentLabel}
                data-tooltip-label={t("tip.sidebar.nextImageParent")}
                disabled={!targetParentNavigation.nextNodeId}
                onClick={() => {
                  if (mode === "image") {
                    jumpToImageParentNode(targetParentNavigation.nextNodeId);
                  } else if (mode === "video") {
                    jumpToVideoParentNode(targetParentNavigation.nextNodeId);
                  } else {
                    jumpToAudioParentNode(targetParentNavigation.nextNodeId);
                  }
                }}
              >
                <MainUiIcon name="next" />
              </button>
            ) : null
          ) : null}

          {showRootToggle ? (
            <button
              className={`sidebar-head-icon-btn ${rootSet ? "is-root-set" : ""}`}
              data-slot="fg-sidebar-toolbar-root-toggle"
              type="button"
              aria-label={rootToggleLabel}
              data-tooltip-label={rootToggleLabel}
              disabled={!rootSet && !canSetCurrentRoot}
              onClick={rootSet ? onResetRoot : onSetCurrentRoot}
            >
              <MainUiIcon name={rootToggleIconName} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="sidebar-main-shell" data-slot="fg-sidebar-main">
        <div
          ref={sidebarTreeRef}
          className="sidebar-tree mpx-scroll-area"
          onScroll={(event) => {
            setSidebarScrollTop(event.currentTarget.scrollTop);
          }}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: `${sidebarVerticalGap}px`,
          }}
        >
          {shouldVirtualize && virtualRange.topSpacerHeight > 0 ? (
            <div
              aria-hidden="true"
              style={{
                height: `${virtualRange.topSpacerHeight}px`,
                pointerEvents: "none",
              }}
            />
          ) : null}
          {rowsForRender.map(({ node }) => (
            <SidebarPanelRow
              key={node.id}
              node={node}
              mode={mode}
              selectedSidebarNodeId={selectedSidebarNodeId}
              hoveredNodeId={hoveredNodeId}
              focusedNodeId={focusedNodeId}
              sidebarFocus={sidebarFocus}
              overflowingNodeIds={overflowingNodeIds}
              effectiveSidebarLabelDisplayMode={
                effectiveSidebarLabelDisplayMode
              }
              imageNodeLoadStateById={imageNodeLoadStateById}
              collapsedImageFolderNodeIds={collapsedImageFolderNodeIds}
              manageStyleEnabled={manageStyleEnabled}
              manageToggleEnabled={manageToggleEnabled}
              metadataSingleSelectEnabled={metadataSingleSelectEnabled}
              metadataManageMode={metadataManageMode}
              checkedNodes={checkedNodes}
              sidebarFontSize={sidebarFontSize}
              sidebarCountFontSize={sidebarCountFontSize}
              audioPlaylistIds={audioPlaylistIds}
              searchResultReadonly={searchResultReadonly}
              suppressManageClickRef={suppressManageClickRef}
              labelTextElementByNodeIdRef={labelTextElementByNodeIdRef}
              scheduleOverflowMeasure={scheduleOverflowMeasure}
              setHoveredNodeId={setHoveredNodeId}
              setFocusedNodeId={setFocusedNodeId}
              startManagePointerToggle={startManagePointerToggle}
              updateCollapsedImageFolderNodeIds={
                updateCollapsedImageFolderNodeIds
              }
              onToggleManageNode={onToggleManageNode}
              onSelectMetadataSingleNode={onSelectMetadataSingleNode}
              onSelectNode={onSelectNode}
              onSelectPackage={onSelectPackage}
              onSelectVideo={onSelectVideo}
              onSelectVideoAndPlay={onSelectVideoAndPlay}
              onSelectAudio={onSelectAudio}
              onToggleAudioPlaylist={onToggleAudioPlaylist}
              t={t}
            />
          ))}
          {shouldVirtualize && virtualRange.bottomSpacerHeight > 0 ? (
            <div
              aria-hidden="true"
              style={{
                height: `${virtualRange.bottomSpacerHeight}px`,
                pointerEvents: "none",
              }}
            />
          ) : null}
        </div>
      </div>
      <div aria-hidden="true" data-slot="fg-sidebar-footer" />
    </aside>
  );
}

export default SidebarPanel;
