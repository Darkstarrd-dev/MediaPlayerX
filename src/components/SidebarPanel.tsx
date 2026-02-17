import {
  useCallback,
  useEffect,
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
  const collapsedImageFolderNodeIds = onSetCollapsedFolderNodeIds
    ? new Set(collapsedFolderNodeIds ?? [])
    : localCollapsedImageFolderNodeIds;
  const manageDragCleanupRef = useRef<(() => void) | null>(null);
  const labelTextElementByNodeIdRef = useRef<Map<string, HTMLSpanElement>>(new Map());
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

  useEffect(() => {
    if (!selectedSidebarNodeId) {
      return;
    }

    const activeTreeNodes =
      mode === "image"
        ? imageTreeNodes
        : mode === "video"
          ? videoTreeNodes
          : audioTreeNodes;
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
    audioTreeNodes,
    imageTreeNodes,
    mode,
    selectedSidebarNodeId,
    updateCollapsedImageFolderNodeIds,
    videoTreeNodes,
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

    // Do selection toggle on pointer down so Shift+Click and drag toggling are stable.
    // Click handler still drives navigation; we suppress click-based toggle to avoid double flips.
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
        imageFolderCollapsible && collapsedImageFolderNodeIds.has(node.id);
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
      style={{
        width: `${sidebarRatio * 100}%`,
        minWidth: `${sidebarMinWidth}px`,
      }}
    >
      <div className="sidebar-head">
        <button
          className="sidebar-title-btn"
          type="button"
          onClick={onCollapseSidebar}
        >
          {currentRootLabel ?? t("ui.sidebar.structure")}
        </button>

        <div className="sidebar-head-actions">
          {searchResultMode ? (
            <button
              className="sidebar-head-icon-btn"
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
            <button
              className={`sidebar-head-icon-btn ${rootSet ? "is-root-set" : ""}`}
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
    </aside>
  );
}

export default SidebarPanel;
