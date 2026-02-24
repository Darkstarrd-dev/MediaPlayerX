import type { Dispatch, SetStateAction } from "react";

import type { AppSettings } from "../../contracts/settings";
import type { SidebarNode } from "../../types";

interface BuildSidebarPanelPropsParams {
  mode: AppSettings["mode"];
  sidebarFocus: AppSettings["sidebarFocus"];
  sidebarRatio: number;
  sidebarMinWidth: number;
  sidebarFontSize: number;
  sidebarCountFontSize: number;
  sidebarIndentStep: number;
  sidebarVerticalGap: number;
  sidebarLabelDisplayMode?: AppSettings["sidebarLabelDisplayMode"];
  currentRootLabel: string | null;
  searchResultsMode: boolean;
  searchResultsLabel: string;
  adReviewResultsMode?: boolean;
  selectedSidebarNodeId: string | null;
  canSetCurrentRoot: boolean;
  imageRootNodeId: string | null;
  videoRootNodeId: string | null;
  musicRootNodeId: string | null;
  imageTreeNodes: SidebarNode[];
  videoTreeNodes: SidebarNode[];
  audioTreeNodes: SidebarNode[];
  imageNodeLoadStateById: Record<string, "pending" | "running">;
  selectedPackageId: string;
  selectedVideoId: string;
  selectedAudioId: string;
  vectorResultsActive: boolean;
  featureSearchActive: boolean;
  searchResultsReadOnly: boolean;
  manageMode: boolean;
  metadataManageMode: boolean;
  checkedSidebarNodeIdSet: Set<string>;
  focusedRef: { packageId: string; imageIndex: number } | null;
  playlistIds: string[];
  goToFromSearchMode: () => void;
  onExitAdReviewResultsMode?: () => void;
  setSelectedSidebarNodeId: (nodeId: string) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  setSelectedPackageId: (packageId: string) => void;
  selectVideoFromBrowser: (
    videoId: string,
    options?: { play?: boolean; queueSource?: "sidebar" | "playlist" },
  ) => void;
  setSelectedAudioId: (audioId: string) => void;
  collapseSidebar: () => void;
  collapsedFolderNodeIds?: string[];
  setCollapsedFolderNodeIds?: (nodeIds: string[]) => void;
  applyCurrentRootFromSelection: () => void;
  setPlaylistIds: Dispatch<SetStateAction<string[]>>;
  audioPlaylistIds: string[];
  setAudioPlaylistIds: Dispatch<SetStateAction<string[]>>;
  onToggleManageNode: (nodeId: string, shiftKey: boolean) => void;
  onClearSidebarSelection: () => void;
  titleCollapseEnabled?: boolean;
}

export function buildSidebarPanelProps(params: BuildSidebarPanelPropsParams) {
  const adReviewResultsMode = params.adReviewResultsMode ?? false;
  const sidebarResultMode = params.searchResultsMode || adReviewResultsMode;
  const sidebarLabelDisplayMode = params.sidebarLabelDisplayMode ?? "full";

  return {
    mode: params.mode,
    sidebarFocus: params.sidebarFocus,
    sidebarRatio: params.sidebarRatio,
    sidebarMinWidth: params.sidebarMinWidth,
    sidebarFontSize: params.sidebarFontSize,
    sidebarCountFontSize: params.sidebarCountFontSize,
    sidebarIndentStep: params.sidebarIndentStep,
    sidebarVerticalGap: params.sidebarVerticalGap,
    sidebarLabelDisplayMode,
    currentRootLabel: params.searchResultsMode
      ? params.searchResultsLabel
      : params.currentRootLabel,
    selectedSidebarNodeId: params.selectedSidebarNodeId,
    canSetCurrentRoot: params.canSetCurrentRoot,
    imageRootNodeId: params.imageRootNodeId,
    videoRootNodeId: params.videoRootNodeId,
    musicRootNodeId: params.musicRootNodeId,
    imageTreeNodes: params.imageTreeNodes,
    videoTreeNodes: params.videoTreeNodes,
    audioTreeNodes: params.audioTreeNodes,
    imageNodeLoadStateById: params.imageNodeLoadStateById,
    selectedPackageId: params.selectedPackageId,
    selectedVideoId: params.selectedVideoId,
    selectedAudioId: params.selectedAudioId,
    imageHighlightByNode: params.vectorResultsActive,
    searchResultMode: sidebarResultMode,
    searchResultReadonly: params.searchResultsReadOnly,
    manageMode: params.manageMode,
    metadataManageMode: params.metadataManageMode,
    checkedSidebarNodeIds: params.checkedSidebarNodeIdSet,
    canGoToFromSearchMode: adReviewResultsMode
      ? true
      : params.vectorResultsActive
        ? Boolean(params.focusedRef)
        : params.featureSearchActive,
    playlistIds: params.playlistIds,
    audioPlaylistIds: params.audioPlaylistIds,
    onGoToFromSearchMode: adReviewResultsMode
      ? () => {
          params.onExitAdReviewResultsMode?.();
        }
      : params.goToFromSearchMode,
    onSelectNode: (nodeId: string) => {
      if (
        params.mode === "image" &&
        params.vectorResultsActive &&
        !params.manageMode &&
        !params.metadataManageMode
      ) {
        return;
      }

      params.setSelectedSidebarNodeId(nodeId);
      params.updateSettings({ sidebarFocus: "sidebar" });
    },
    onSelectPackage: params.setSelectedPackageId,
    onSelectVideo: (videoId: string) => {
      params.selectVideoFromBrowser(videoId, { queueSource: 'sidebar' });
    },
    onSelectVideoAndPlay: (videoId: string) => {
      params.selectVideoFromBrowser(videoId, { play: true, queueSource: 'sidebar' });
    },
    onSelectAudio: params.setSelectedAudioId,
    onCollapseSidebar: params.collapseSidebar,
    onToggleSidebarLabelDisplayMode: () => {
      params.updateSettings({
        sidebarLabelDisplayMode:
          sidebarLabelDisplayMode === "full" ? "leaf" : "full",
      });
    },
    titleCollapseEnabled: params.titleCollapseEnabled ?? true,
    collapsedFolderNodeIds: params.collapsedFolderNodeIds,
    onSetCollapsedFolderNodeIds: params.setCollapsedFolderNodeIds,
    onSetCurrentRoot: params.applyCurrentRootFromSelection,
    onResetRoot: () => {
      if (params.mode === "image") {
        params.updateSettings({ imageRootNodeId: null });
        return;
      }
      if (params.mode === "video") {
        params.updateSettings({ videoRootNodeId: null });
        return;
      }
      params.updateSettings({ musicRootNodeId: null });
    },
    onToggleVideoPlaylist: (videoId: string, checked: boolean) => {
      params.setPlaylistIds((previous) => {
        if (checked) {
          if (previous.includes(videoId)) {
            return previous;
          }
          return [...previous, videoId];
        }
        return previous.filter((id) => id !== videoId);
      });
    },
    onToggleManageNode: params.onToggleManageNode,
    onClearSidebarSelection: params.onClearSidebarSelection,
    onToggleAudioPlaylist: (audioId: string, checked: boolean) => {
      params.setAudioPlaylistIds((previous) => {
        if (checked) {
          if (previous.includes(audioId)) {
            return previous;
          }
          return [...previous, audioId];
        }
        return previous.filter((id) => id !== audioId);
      });
    },
  };
}
