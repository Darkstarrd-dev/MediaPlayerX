import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from "react";

import { MainUiIcon } from "./MainUiIcon";
import { useI18n } from "../i18n/useI18n";
import type { BrowserMode, SidebarNode } from "../types";

function resolveFirstAudioId(node: SidebarNode): string | null {
  if (node.audioId) {
    return node.audioId;
  }

  for (const child of node.children) {
    const candidate = resolveFirstAudioId(child);
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

function canFolderCollapse(
  mode: BrowserMode,
  node: SidebarNode,
  imageNodeType: SidebarNode["imageNodeType"],
): boolean {
  if (node.kind !== "folder") {
    return false;
  }
  if (mode === "image" && imageNodeType !== "folder") {
    return false;
  }
  return node.children.length > 0;
}

function resolveAncestorNodeIds(
  nodes: SidebarNode[],
  targetNodeId: string,
): string[] {
  const path: string[] = [];

  const walk = (items: SidebarNode[], ancestors: string[]): boolean => {
    for (const node of items) {
      if (node.id === targetNodeId) {
        path.push(...ancestors);
        return true;
      }

      if (node.children.length === 0) {
        continue;
      }

      if (walk(node.children, [...ancestors, node.id])) {
        return true;
      }
    }

    return false;
  };

  walk(nodes, []);
  return path;
}

function resolveNodeOrderIndexById(nodes: SidebarNode[]): Map<string, number> {
  const indexById = new Map<string, number>();
  let cursor = 0;

  const walk = (items: SidebarNode[]) => {
    for (const node of items) {
      indexById.set(node.id, cursor);
      cursor += 1;
      if (node.children.length > 0) {
        walk(node.children);
      }
    }
  };

  walk(nodes);
  return indexById;
}

function resolveImagePackageParentNodeIds(nodes: SidebarNode[]): string[] {
  const orderedNodeIds: string[] = [];
  const walk = (items: SidebarNode[], depth: number) => {
    for (const node of items) {
      const canBeParentTarget = node.kind === "folder" && depth > 0;
      const hasDirectImageSourceChild = node.children.some((child) => {
        const childImageNodeType =
          child.imageNodeType ?? (child.kind === "folder" ? "folder" : "package");
        return (
          child.kind === "package"
          || childImageNodeType === "package"
          || childImageNodeType === "directory"
        );
      });
      if (canBeParentTarget && hasDirectImageSourceChild) {
        orderedNodeIds.push(node.id);
      }

      if (node.children.length > 0) {
        walk(node.children, depth + 1);
      }
    }
  };

  walk(nodes, 0);
  return orderedNodeIds;
}

function isSameNodeIdSet(left: Set<string>, right: Set<string>): boolean {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
}

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
  onToggleManageNode?: (nodeId: string, shiftKey: boolean) => void;
  collapsedFolderNodeIds?: string[];
  onSetCollapsedFolderNodeIds?: (nodeIds: string[]) => void;
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
  onToggleManageNode,
  collapsedFolderNodeIds,
  onSetCollapsedFolderNodeIds,
}: SidebarPanelProps) {
  const { t } = useI18n();
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
  }, [collapsedFolderNodeIds, localCollapsedImageFolderNodeIds, onSetCollapsedFolderNodeIds]);
  const manageDragCleanupRef = useRef<(() => void) | null>(null);
  const labelTextElementByNodeIdRef = useRef<Map<string, HTMLSpanElement>>(new Map());
  const suppressAutoExpandAncestorFoldersRef = useRef(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [overflowingNodeIds, setOverflowingNodeIds] = useState<Set<string>>(new Set());
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

  useEffect(
    () => () => {
      detachManageDragListeners();
    },
    [detachManageDragListeners],
  );

  const refreshOverflowState = useCallback((nodeId: string | null) => {
    if (!nodeId) {
      return;
    }
    const element = labelTextElementByNodeIdRef.current.get(nodeId);
    if (!element) {
      return;
    }
    const overflowing = element.scrollWidth - element.clientWidth > 1;
    setOverflowingNodeIds((previous) => {
      const next = new Set(previous);
      if (overflowing) {
        next.add(nodeId);
      } else {
        next.delete(nodeId);
      }
      return isSameNodeIdSet(previous, next) ? previous : next;
    });
  }, []);

  useEffect(() => {
    if (!selectedSidebarNodeId) {
      return;
    }
    requestAnimationFrame(() => {
      refreshOverflowState(selectedSidebarNodeId);
    });
  }, [refreshOverflowState, selectedSidebarNodeId, sidebarFontSize]);

  useEffect(() => {
    if (!hoveredNodeId) {
      return;
    }
    requestAnimationFrame(() => {
      refreshOverflowState(hoveredNodeId);
    });
  }, [hoveredNodeId, refreshOverflowState, sidebarFontSize]);

  useEffect(() => {
    if (sidebarFocus !== 'sidebar') {
      return;
    }

    const onNavigationKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === 'ArrowUp'
        || event.key === 'ArrowDown'
        || event.key === 'PageUp'
        || event.key === 'PageDown'
        || event.key === 'Home'
        || event.key === 'End'
      ) {
        setHoveredNodeId(null);
      }
    };

    window.addEventListener('keydown', onNavigationKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onNavigationKeyDown, true);
    };
  }, [sidebarFocus]);

  const updateCollapsedImageFolderNodeIds = useCallback(
    (
    updater: (previous: Set<string>) => Set<string>,
    ) => {
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

  const imageNodeById = useMemo(() => {
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
  }, [imageTreeNodes]);

  const imagePackageParentNodeIds = useMemo(
    () => (mode === "image" ? resolveImagePackageParentNodeIds(imageTreeNodes) : []),
    [imageTreeNodes, mode],
  );

  const imagePackageParentNodeIdSet = useMemo(
    () => new Set(imagePackageParentNodeIds),
    [imagePackageParentNodeIds],
  );

  const imageNodeOrderIndexById = useMemo(
    () => (mode === "image" ? resolveNodeOrderIndexById(imageTreeNodes) : new Map<string, number>()),
    [imageTreeNodes, mode],
  );

  const allImagePackageParentsCollapsed = useMemo(() => {
    if (mode !== "image" || imagePackageParentNodeIds.length === 0) {
      return false;
    }
    return imagePackageParentNodeIds.every((nodeId) => collapsedImageFolderNodeIds.has(nodeId));
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
        previousNodeId: imagePackageParentNodeIds[selectedTargetIndex - 1] ?? null,
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

  const jumpToImageParentNode = useCallback((targetNodeId: string | null) => {
    if (mode !== "image" || !targetNodeId) {
      return;
    }

    onSelectNode(targetNodeId);
    const targetNode = imageNodeById.get(targetNodeId);
    if (targetNode?.imageSourceId) {
      onSelectPackage(targetNode.imageSourceId);
    }
  }, [imageNodeById, mode, onSelectNode, onSelectPackage]);

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

  useEffect(() => {
    if (!selectedSidebarNodeId) {
      return;
    }

    if (suppressAutoExpandAncestorFoldersRef.current) {
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
        if (allImagePackageParentsCollapsed && imagePackageParentNodeIdSet.has(ancestorNodeId)) {
          continue;
        }
        if (next.delete(ancestorNodeId)) {
          changed = true;
        }
      }

      return changed ? next : previous;
    });
  }, [
    activeTreeNodes,
    allImagePackageParentsCollapsed,
    imagePackageParentNodeIdSet,
    selectedSidebarNodeId,
    updateCollapsedImageFolderNodeIds,
  ]);

  const manageStyleEnabled = manageMode || metadataManageMode;

  const startManagePointerToggle = (
    startNodeId: string,
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    if (!manageStyleEnabled || !onToggleManageNode) {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    if (event.detail > 1) {
      return;
    }

    // Do selection toggle on pointer down so Shift+Click and drag toggling are stable.
    // Click handler only performs fallback toggle in manage styles; navigation happens in non-manage styles.
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

    const resolveNodeIdAtPoint = (clientX: number, clientY: number): string | null => {
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

      applyToggleForNode(resolveNodeIdAtPoint(moveEvent.clientX, moveEvent.clientY));
    };

    const onPointerUpOrCancel = (upEvent: PointerEvent) => {
      const state = manageDragStateRef.current;
      if (!state || upEvent.pointerId !== state.pointerId) {
        return;
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

  const renderNodes = (nodes: SidebarNode[], depth = 0): ReactElement[] => {
    return nodes.flatMap((node) => {
      const isFolder = node.kind === "folder";
      const imageNodeType =
        node.imageNodeType ?? (isFolder ? "folder" : "package");
      const isFocusedNode = selectedSidebarNodeId === node.id;
      const isHoverActive = hoveredNodeId === node.id;
      const isPressedActive = isFocusedNode || isHoverActive;
      const loadState =
        mode === "image" ? imageNodeLoadStateById[node.id] : undefined;
      const hasOwnImages =
        imageNodeType === "package" || imageNodeType === "directory";
      const imageFolderCollapsible = canFolderCollapse(
        mode,
        node,
        imageNodeType,
      );
      const imageFolderCollapsed =
        (imageFolderCollapsible || (mode === "image" && node.kind === "folder"))
        && collapsedImageFolderNodeIds.has(node.id);
      const visibleImageCount = node.directImageCount ?? 0;
      const descendantNodeCount =
        node.descendantNodeCount ?? node.children.length;
      const directAudioCount = node.directAudioCount ?? 0;
      const descendantAudioFolderCount = node.descendantAudioFolderCount ?? 0;
      const musicCountIsTrack = directAudioCount > 0;
      const musicCountValue = musicCountIsTrack
        ? directAudioCount
        : descendantAudioFolderCount;
      const musicCountLabel = musicCountIsTrack
        ? t("a11y.sidebar.musicTrackCount", { count: musicCountValue })
        : t("a11y.sidebar.musicFolderCount", { count: musicCountValue });
      const musicCountClassName = `sidebar-count ${musicCountIsTrack ? "sidebar-count-images" : "sidebar-count-packages"}`;
      const imageCountLabel = hasOwnImages
        ? t("a11y.sidebar.imageCount", { count: visibleImageCount })
        : t("a11y.sidebar.nodeCount", { count: descendantNodeCount });

      const row = (
        <div
          key={node.id}
          data-sidebar-node-id={node.id}
          className={`sidebar-row ${manageStyleEnabled ? "is-manage" : ""} ${checkedNodes.has(node.id) ? "is-selected" : ""} ${isFocusedNode ? "is-active" : ""} ${isHoverActive ? "is-hover-active" : ""} ${isPressedActive ? "is-pressed-active" : ""} ${loadState === "running" ? "is-processing" : ""}`}
          style={{ paddingLeft: `${depth * sidebarIndentStep + 10}px` }}
        >
          <span
            className={`sidebar-bullet ${loadState ? `is-${loadState}` : ""}`}
            aria-hidden="true"
          />

          <button
            className={`sidebar-label ${imageFolderCollapsible ? "is-collapsible" : ""} ${imageFolderCollapsed ? "is-collapsed" : ""}`}
            data-slot="fg-sidebar-main-label"
            type="button"
            aria-pressed={manageStyleEnabled ? checkedNodes.has(node.id) : undefined}
            style={{ fontSize: `${sidebarFontSize}px` }}
            onMouseEnter={() => {
              setHoveredNodeId(node.id);
            }}
            onMouseLeave={() => {
              setHoveredNodeId((previous) => (previous === node.id ? null : previous));
            }}
            onPointerDown={(event) => {
              if (!manageStyleEnabled) {
                return;
              }
              startManagePointerToggle(node.id, event);
            }}
            title={
              imageFolderCollapsible
                ? imageFolderCollapsed
                  ? t("tip.sidebar.expandSubfolder")
                  : t("tip.sidebar.collapseSubfolder")
                : undefined
            }
            onClick={(event) => {
              if (manageStyleEnabled) {
                if (suppressManageClickRef.current) {
                  suppressManageClickRef.current = false;
                } else {
                  onToggleManageNode?.(node.id, event.shiftKey);
                }
                return;
              }
              if (mode === "image" && searchResultReadonly) {
                return;
              }
              onSelectNode(node.id);
              if (mode === "image" && node.imageSourceId) {
                onSelectPackage(node.imageSourceId);
              }
              if (mode === "music") {
                const targetAudioId = resolveFirstAudioId(node);
                if (targetAudioId) {
                  onSelectAudio(targetAudioId);
                }
                return;
              }
              if (node.videoId) {
                onSelectVideo(node.videoId);
              }
            }}
            onDoubleClick={() => {
              if (mode === "video" && node.videoId) {
                onSelectNode(node.id);
                if (onSelectVideoAndPlay) {
                  onSelectVideoAndPlay(node.videoId);
                } else {
                  onSelectVideo(node.videoId);
                }
                return;
              }

              if (!imageFolderCollapsible) {
                return;
              }
              updateCollapsedImageFolderNodeIds((previous) => {
                const next = new Set(previous);
                if (next.has(node.id)) {
                  next.delete(node.id);
                } else {
                  next.add(node.id);
                }
                return next;
              });
            }}
          >
            <span
              ref={(element) => {
                if (element) {
                  labelTextElementByNodeIdRef.current.set(node.id, element);
                  return;
                }
                labelTextElementByNodeIdRef.current.delete(node.id);
              }}
              className={`sidebar-label-text ${isPressedActive && overflowingNodeIds.has(node.id) ? "is-marquee" : ""}`}
            >
              {node.label}
            </span>
          </button>

          {mode === "music" && node.kind === "audio" && node.audioId ? (
            <input
              aria-label={t("a11y.sidebar.toggleAudio", { id: node.audioId })}
              checked={audioPlaylistIds.includes(node.audioId)}
              type="checkbox"
              onChange={(event) =>
                onToggleAudioPlaylist(node.audioId!, event.target.checked)
              }
            />
          ) : null}

          {mode === "image" ? (
            <span
              className="sidebar-counts"
              style={{ fontSize: `${sidebarCountFontSize}px` }}
            >
              <span
                className={`sidebar-count ${hasOwnImages ? "sidebar-count-images" : "sidebar-count-packages"}`}
                aria-label={imageCountLabel}
                title={imageCountLabel}
              >
                {hasOwnImages ? visibleImageCount : descendantNodeCount}
              </span>
            </span>
          ) : null}

          {mode === "music" ? (
            <span
              className="sidebar-counts"
              style={{ fontSize: `${sidebarCountFontSize}px` }}
            >
              <span
                className={musicCountClassName}
                aria-label={musicCountLabel}
                title={musicCountLabel}
              >
                {musicCountValue}
              </span>
            </span>
          ) : null}
        </div>
      );

      if (node.children.length === 0 || imageFolderCollapsed) {
        return [row];
      }

      return [row, ...renderNodes(node.children, depth + 1)];
    });
  };

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
          onClick={onCollapseSidebar}
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
                title={t("tip.common.back")}
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
                title={t("tip.common.clearSelection")}
                disabled={checkedNodes.size === 0}
                onClick={onClearSidebarSelection}
              >
                <MainUiIcon name="unselectAll" />
              </button>
            ) : null
          ) : null}

          {showRootToggle ? (
            mode === "image" ? (
              <button
                className="sidebar-head-icon-btn"
                data-slot="fg-sidebar-toolbar-collapse-all"
                type="button"
                aria-label={collapseImageParentsLabel}
                title={allImagePackageParentsCollapsed ? t("tip.sidebar.expandImageParents") : t("tip.sidebar.collapseImageParents")}
                disabled={imagePackageParentNodeIds.length === 0}
                onClick={toggleCollapseImagePackageParentNodes}
              >
                <MainUiIcon name={allImagePackageParentsCollapsed ? "expand" : "collapse"} />
              </button>
            ) : null
          ) : null}

          {showRootToggle ? (
            mode === "image" ? (
              <button
                className="sidebar-head-icon-btn"
                data-slot="fg-sidebar-toolbar-prev-image-parent"
                type="button"
                aria-label={previousImageParentLabel}
                title={t("tip.sidebar.previousImageParent")}
                disabled={!imageParentNavigation.previousNodeId}
                onClick={() => {
                  jumpToImageParentNode(imageParentNavigation.previousNodeId);
                }}
              >
                <MainUiIcon name="prev" />
              </button>
            ) : null
          ) : null}

          {showRootToggle ? (
            mode === "image" ? (
              <button
                className="sidebar-head-icon-btn"
                data-slot="fg-sidebar-toolbar-next-image-parent"
                type="button"
                aria-label={nextImageParentLabel}
                title={t("tip.sidebar.nextImageParent")}
                disabled={!imageParentNavigation.nextNodeId}
                onClick={() => {
                  jumpToImageParentNode(imageParentNavigation.nextNodeId);
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
              title={rootToggleLabel}
              disabled={!rootSet && !canSetCurrentRoot}
              onClick={rootSet ? onResetRoot : onSetCurrentRoot}
            >
              <MainUiIcon name={rootToggleIconName} />
            </button>
          ) : null}
        </div>
      </div>

      <div
        className="sidebar-tree"
        data-slot="fg-sidebar-main"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: `${sidebarVerticalGap}px`,
        }}
      >
        {mode === "image"
          ? renderNodes(imageTreeNodes)
          : mode === "video"
            ? renderNodes(videoTreeNodes)
            : renderNodes(audioTreeNodes)}
      </div>
      <div hidden data-slot="fg-sidebar-footer" />
    </aside>
  );
}

export default SidebarPanel;
