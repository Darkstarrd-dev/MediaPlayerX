import type {
  CSSProperties,
  Dispatch,
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
  SetStateAction,
} from "react";

import type { BrowserMode, SidebarNode } from "../types";
import type { TranslateFn } from "../i18n/context";
import {
  canFolderCollapse,
  isMediaNodeForMode,
  resolveFirstAudioId,
  resolveImageNodeType,
  resolveSidebarDisplayLabel,
  type SidebarLabelDisplayMode,
} from "./sidebarPanelTreeUtils";
import { useRandomSweepAnimation } from "./useRandomSweepAnimation";

interface SidebarPanelRowProps {
  node: SidebarNode;
  mode: BrowserMode;
  selectedSidebarNodeId: string | null;
  hoveredNodeId: string | null;
  focusedNodeId: string | null;
  sidebarFocus: "sidebar" | "main";
  overflowingNodeIds: Set<string>;
  effectiveSidebarLabelDisplayMode: SidebarLabelDisplayMode;
  imageNodeLoadStateById: Record<string, "pending" | "running">;
  collapsedImageFolderNodeIds: Set<string>;
  manageStyleEnabled: boolean;
  manageToggleEnabled: boolean;
  metadataSingleSelectEnabled: boolean;
  metadataManageMode: boolean;
  checkedNodes: ReadonlySet<string>;
  sidebarFontSize: number;
  sidebarCountFontSize: number;
  audioPlaylistIds: string[];
  searchResultReadonly: boolean;
  videoNodeBrowseMode?: boolean;
  suppressManageClickRef: MutableRefObject<boolean>;
  labelTextElementByNodeIdRef: MutableRefObject<Map<string, HTMLSpanElement>>;
  scheduleOverflowMeasure: () => void;
  setHoveredNodeId: Dispatch<SetStateAction<string | null>>;
  setFocusedNodeId: Dispatch<SetStateAction<string | null>>;
  startManagePointerToggle: (
    nodeId: string,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
  updateCollapsedImageFolderNodeIds: (
    updater: (previous: Set<string>) => Set<string>,
  ) => void;
  onToggleManageNode?: (nodeId: string, shiftKey: boolean) => void;
  onSelectMetadataSingleNode?: (nodeId: string) => void;
  onSelectNode: (nodeId: string) => void;
  onSelectPackage: (packageId: string) => void;
  onSelectVideo: (videoId: string) => void;
  onSelectVideoAndPlay?: (videoId: string) => void;
  onSelectAudio: (audioId: string) => void;
  onToggleAudioPlaylist: (audioId: string, checked: boolean) => void;
  t: TranslateFn;
}

export function SidebarPanelRow({
  node,
  mode,
  selectedSidebarNodeId,
  hoveredNodeId,
  focusedNodeId,
  sidebarFocus,
  overflowingNodeIds,
  effectiveSidebarLabelDisplayMode,
  imageNodeLoadStateById,
  collapsedImageFolderNodeIds,
  manageStyleEnabled,
  manageToggleEnabled,
  metadataSingleSelectEnabled,
  metadataManageMode,
  checkedNodes,
  sidebarFontSize,
  sidebarCountFontSize,
  audioPlaylistIds,
  searchResultReadonly,
  videoNodeBrowseMode = false,
  suppressManageClickRef,
  labelTextElementByNodeIdRef,
  scheduleOverflowMeasure,
  setHoveredNodeId,
  setFocusedNodeId,
  startManagePointerToggle,
  updateCollapsedImageFolderNodeIds,
  onToggleManageNode,
  onSelectMetadataSingleNode,
  onSelectNode,
  onSelectPackage,
  onSelectVideo,
  onSelectVideoAndPlay,
  onSelectAudio,
  onToggleAudioPlaylist,
  t,
}: SidebarPanelRowProps) {
  const isFolder = node.kind === "folder";
  const imageNodeType = resolveImageNodeType(node);
  const displayLabel = resolveSidebarDisplayLabel(
    node,
    effectiveSidebarLabelDisplayMode,
  );
  const isFocusedNode = selectedSidebarNodeId === node.id;
  const isHoverActive = hoveredNodeId === node.id;
  const isPressedActive = isFocusedNode || isHoverActive;
  const marqueeActive =
    (focusedNodeId === node.id ||
      (sidebarFocus === "sidebar" && isFocusedNode)) &&
    overflowingNodeIds.has(node.id);
  const marqueeStyle = marqueeActive
    ? ({
        "--mpx-sidebar-label-marquee-duration": `${Math.max(8, Math.min(30, Math.round(displayLabel.length * 0.24)))}s`,
      } as CSSProperties)
    : undefined;
  const loadState =
    mode === "image" ? imageNodeLoadStateById[node.id] : undefined;
  const hasOwnImages =
    imageNodeType === "package" || imageNodeType === "directory";
  const imageFolderCollapsible = canFolderCollapse(mode, node, imageNodeType);
  const imageFolderCollapsed =
    imageFolderCollapsible && collapsedImageFolderNodeIds.has(node.id);
  const visibleImageCount = node.directImageCount ?? 0;
  const directMediaChildCount = node.children.filter((child) =>
    isMediaNodeForMode(mode, child),
  ).length;
  const directAudioCount = node.directAudioCount ?? 0;
  const descendantAudioCount = Math.max(0, node.descendantNodeCount ?? 0);
  const musicCountIsTrack = directAudioCount > 0;
  const musicCountValue = musicCountIsTrack
    ? directAudioCount
    : descendantAudioCount > 0
      ? descendantAudioCount
      : directMediaChildCount;
  const musicCountLabel = musicCountIsTrack
    ? t("a11y.sidebar.musicTrackCount", { count: musicCountValue })
    : t("a11y.sidebar.musicFolderCount", { count: musicCountValue });
  const musicCountClassName = `sidebar-count ${musicCountIsTrack ? "sidebar-count-images" : "sidebar-count-packages"}`;
  const imageCountLabel = hasOwnImages
    ? t("a11y.sidebar.imageCount", { count: visibleImageCount })
    : t("a11y.sidebar.nodeCount", { count: directMediaChildCount });
  const showProcessingCountPlaceholder =
    mode === "image" && hasOwnImages && Boolean(loadState);
  const {
    sweeping: sidebarFocusSweeping,
    onAnimationEnd: handleSidebarFocusSweepAnimationEnd,
  } = useRandomSweepAnimation({
    enabled: isFocusedNode,
    initialDelayRangeMs: [1000, 2600],
    repeatDelayRangeMs: [2200, 7800],
  });

  const applyMediaSelection = () => {
    if (mode === "image" && searchResultReadonly) {
      return;
    }

    onSelectNode(node.id);
    if (mode === "image" && node.imageSourceId && loadState) {
      return;
    }
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
      if (mode === "video" && videoNodeBrowseMode && onSelectVideoAndPlay) {
        onSelectVideoAndPlay(node.videoId);
        return;
      }
      onSelectVideo(node.videoId);
    }
  };

  return (
    <div
      data-sidebar-node-id={node.id}
      className={`sidebar-row ${manageStyleEnabled ? "is-manage" : ""} ${checkedNodes.has(node.id) ? "is-selected" : ""} ${isFocusedNode ? "is-active" : ""} ${isHoverActive ? "is-hover-active" : ""} ${isPressedActive ? "is-pressed-active" : ""} ${loadState === "running" ? "is-processing" : ""}`}
    >
      <span
        className={`sidebar-bullet ${loadState ? `is-${loadState}` : ""}`}
        aria-hidden="true"
      />

      <button
        className={`sidebar-label ${imageFolderCollapsible ? "is-collapsible" : ""} ${imageFolderCollapsed ? "is-collapsed" : ""} ${isFocusedNode ? "mpx-random-sheen-host" : ""} ${isFocusedNode && sidebarFocusSweeping ? "is-sweeping" : ""}`}
        data-slot="fg-sidebar-main-label"
        type="button"
        aria-label={displayLabel}
        aria-pressed={
          manageStyleEnabled ? checkedNodes.has(node.id) : undefined
        }
        style={{ fontSize: `${sidebarFontSize}px` }}
        onMouseEnter={() => {
          setHoveredNodeId(node.id);
        }}
        onMouseLeave={() => {
          setHoveredNodeId((previous) =>
            previous === node.id ? null : previous,
          );
        }}
        onFocus={() => {
          setFocusedNodeId(node.id);
        }}
        onBlur={() => {
          setFocusedNodeId((previous) =>
            previous === node.id ? null : previous,
          );
        }}
        onPointerDown={(event) => {
          if (!manageStyleEnabled) {
            return;
          }
          startManagePointerToggle(node.id, event);
        }}
        data-tooltip-label={
          loadState === "running"
            ? t("tip.sidebar.processingRunning")
            : loadState === "pending"
              ? t("tip.sidebar.processingPending")
              : imageFolderCollapsible
                ? imageFolderCollapsed
                  ? t("tip.sidebar.expandSubfolder")
                  : t("tip.sidebar.collapseSubfolder")
                : effectiveSidebarLabelDisplayMode === "leaf" && isFolder
                  ? node.pathKey
                  : undefined
        }
        onClick={(event) => {
          if (manageStyleEnabled) {
            if (manageToggleEnabled) {
              if (suppressManageClickRef.current) {
                suppressManageClickRef.current = false;
              } else {
                onToggleManageNode?.(node.id, event.shiftKey);
              }
            }

            if (metadataSingleSelectEnabled) {
              onSelectMetadataSingleNode?.(node.id);
            }

            if (metadataManageMode) {
              applyMediaSelection();
            }
            return;
          }

          applyMediaSelection();
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
        onAnimationEnd={handleSidebarFocusSweepAnimationEnd}
      >
        <span
          ref={(element) => {
            if (element) {
              labelTextElementByNodeIdRef.current.set(node.id, element);
              scheduleOverflowMeasure();
              return;
            }
            labelTextElementByNodeIdRef.current.delete(node.id);
            scheduleOverflowMeasure();
          }}
          className={`sidebar-label-marquee ${marqueeActive ? "is-overflow" : ""}`}
          style={marqueeStyle}
        >
          <span className="sidebar-label-text">{displayLabel}</span>
          {marqueeActive ? (
            <span aria-hidden="true" className="sidebar-label-text">
              {displayLabel}
            </span>
          ) : null}
        </span>

        {mode === "image" || (mode === "video" && imageFolderCollapsible) ? (
          <span
            className="sidebar-counts"
            style={{ fontSize: `${sidebarCountFontSize}px` }}
          >
            <span
              className={`sidebar-count ${hasOwnImages ? "sidebar-count-images" : "sidebar-count-packages"}`}
              aria-label={mode === "image" ? imageCountLabel : t("a11y.sidebar.nodeCount", { count: directMediaChildCount })}
              data-tooltip-label={mode === "image" ? imageCountLabel : t("a11y.sidebar.nodeCount", { count: directMediaChildCount })}
            >
              {mode === "image"
                ? showProcessingCountPlaceholder
                  ? "..."
                  : hasOwnImages
                    ? visibleImageCount
                    : directMediaChildCount
                : directMediaChildCount}
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
              data-tooltip-label={musicCountLabel}
            >
              {musicCountValue}
            </span>
          </span>
        ) : null}
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
    </div>
  );
}
