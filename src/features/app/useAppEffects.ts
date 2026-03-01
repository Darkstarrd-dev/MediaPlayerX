import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from "react";

import type { AppSettings } from "../../contracts/settings";
import {
  resolvePaletteIdForStyle,
  resolvePalettePairForStyle,
  resolveStyleId,
} from "../theme/themeRegistry";
import { resolveAncestorNodeIds } from "../../components/sidebarPanelTreeUtils";
import type {
  AudioItem,
  BrowserMode,
  FocusedImageRef,
  ImagePackage,
  SidebarNode,
  VectorCandidate,
  VideoItem,
} from "../../types";
import { clamp } from "../../utils/ui";
import {
  resolveFullscreenImageAutoplayEnabled,
  type FullscreenImageNavigationSource,
} from "../../utils/fullscreenAutoplay";
import {
  resolveRuntimeSpacing,
  resolveRuntimeViewportWidth,
} from "../layout/runtimeSpacing";

const TOP_PANEL_MIN_HEIGHT = 80;
const TOP_PANEL_MAX_HEIGHT = 360;

interface UseAppEffectsParams {
  appBodyRef: RefObject<HTMLDivElement | null>;
  gridElement: HTMLDivElement | null;
  vectorPanelContentRef: RefObject<HTMLDivElement | null>;
  wasFullscreenRef: MutableRefObject<boolean>;
  lastExpandedSidebarRatioRef: MutableRefObject<number>;
  mode: BrowserMode;
  showNamesOnly: boolean;
  sidebarRatio: number;
  sidebarCollapseRatio: number;
  normalizeSidebarRatio: (candidate: number) => number;
  sidebarCollapsed: boolean;
  sidebarFocus: "sidebar" | "main";
  vectorResultsActive: boolean;
  activePackage: ImagePackage | null;
  imageFocusActive: boolean;
  focusByPackage: Record<string, number>;
  pagedPageSize: number;
  vectorSearchResults: VectorCandidate[];
  vectorFocusIndex: number;
  selectedPackageId: string;
  orderedRootScopedPackages: ImagePackage[];
  rootScopedPackageIds: Set<string>;
  flatSidebarNodes: SidebarNode[];
  focusedRef: FocusedImageRef | null;
  imageSourceNodeIdMap: Map<string, string>;
  selectedSidebarNodeId: string | null;
  sidebarNodeById: Map<string, SidebarNode>;
  vectorResultPackageNodeIdMap: Map<string, string>;
  vectorSidebarNodes: SidebarNode[];
  videosForSidebar: VideoItem[];
  audiosForSidebar: AudioItem[];
  rootScopedVideoIds: Set<string>;
  rootScopedAudioIds: Set<string>;
  selectedVideoId: string;
  videoQueueSource: "sidebar" | "playlist";
  imageSidebarLocateRequestNonce: number;
  videoSidebarLocateRequestNonce: number;
  selectedAudioId: string;
  videoNodeIdMap: Map<string, string>;
  audioNodeIdMap: Map<string, string>;
  sidebarTreeNodes: SidebarNode[];
  imageCollapsedFolderNodeIds: string[];
  videoCollapsedFolderNodeIds: string[];
  musicCollapsedFolderNodeIds: string[];
  ensureSidebarNodeVisible: (nodeId: string) => void;
  fullscreenActive: boolean;
  fullscreenDisplay: "dual" | "video-only" | "image-only";
  fullscreenVideoFocus: boolean;
  autoPlayEnabled: boolean;
  autoPlayInterval: number;
  moveImage: (delta: number, source?: FullscreenImageNavigationSource) => void;
  vectorMode: boolean;
  manageMode: boolean;
  metadataManageMode: boolean;
  adReviewPanelOpen: boolean;
  adReviewFocusTaskId: string | null;
  searchPanelCollapsed: boolean;
  searchPanelMode: "vector" | "feature";
  workspaceBottomPanelHeight: number;
  featureTagPickerOpen: boolean;
  styleId: string;
  paletteId: string;
  paletteMode: "day" | "night";
  paletteDayId: string;
  paletteNightId: string;
  themeId: string;
  settingsBackdropOpacity: number;
  layoutGapScaleCoeff: number;
  paneInnerGapScaleCoeff: number;
  paneStackGapScaleCoeff: number;
  sidebarInnerGapScaleCoeff: number;
  thumbnailGapScaleCoeff: number;
  buttonGroupInsetScaleCoeff: number;
  paneToolbarHeightScaleCoeff: number;
  paneFooterHeightScaleCoeff: number;
  radiusCascadeScaleCoeff: number;
  radiusValueScaleCoeff: number;
  setAppBodyWidth: Dispatch<SetStateAction<number>>;
  setGridSize: Dispatch<SetStateAction<{ width: number; height: number }>>;
  setVectorFocusIndex: Dispatch<SetStateAction<number>>;
  setVectorPage: Dispatch<SetStateAction<number>>;
  setPageByPackage: Dispatch<SetStateAction<Record<string, number>>>;
  setSelectedPackageId: Dispatch<SetStateAction<string>>;
  setSelectedSidebarNodeId: Dispatch<SetStateAction<string | null>>;
  setSelectedAudioId: Dispatch<SetStateAction<string>>;
  selectVideoFromBrowser: (videoId: string) => void;
  setFullscreenEntryDisplay: Dispatch<
    SetStateAction<"image-only" | "video-only">
  >;
  setFullscreenDisplay: Dispatch<
    SetStateAction<"dual" | "video-only" | "image-only">
  >;
  setFullscreenVideoFocus: Dispatch<SetStateAction<boolean>>;
  setFullscreenSwapped: Dispatch<SetStateAction<boolean>>;
  setShowFullscreenFooter: Dispatch<SetStateAction<boolean>>;
  updateSettings: (patch: Partial<AppSettings>) => void;
}

export function useAppEffects({
  appBodyRef,
  gridElement,
  vectorPanelContentRef,
  wasFullscreenRef,
  lastExpandedSidebarRatioRef,
  mode,
  showNamesOnly,
  sidebarRatio,
  sidebarCollapseRatio,
  normalizeSidebarRatio,
  sidebarCollapsed,
  sidebarFocus,
  vectorResultsActive,
  activePackage,
  imageFocusActive,
  focusByPackage,
  pagedPageSize,
  vectorSearchResults,
  vectorFocusIndex,
  selectedPackageId,
  orderedRootScopedPackages,
  rootScopedPackageIds,
  flatSidebarNodes,
  focusedRef,
  imageSourceNodeIdMap,
  selectedSidebarNodeId,
  sidebarNodeById,
  vectorResultPackageNodeIdMap,
  vectorSidebarNodes,
  videosForSidebar,
  audiosForSidebar,
  rootScopedVideoIds,
  rootScopedAudioIds,
  selectedVideoId,
  videoQueueSource,
  imageSidebarLocateRequestNonce,
  videoSidebarLocateRequestNonce,
  selectedAudioId,
  videoNodeIdMap,
  audioNodeIdMap,
  sidebarTreeNodes,
  imageCollapsedFolderNodeIds,
  videoCollapsedFolderNodeIds,
  musicCollapsedFolderNodeIds,
  ensureSidebarNodeVisible,
  fullscreenActive,
  fullscreenDisplay,
  autoPlayEnabled,
  autoPlayInterval,
  moveImage,
  vectorMode,
  manageMode,
  metadataManageMode,
  adReviewPanelOpen,
  adReviewFocusTaskId,
  searchPanelCollapsed,
  searchPanelMode,
  workspaceBottomPanelHeight,
  featureTagPickerOpen,
  styleId,
  paletteId,
  paletteMode,
  paletteDayId,
  paletteNightId,
  themeId,
  settingsBackdropOpacity,
  layoutGapScaleCoeff,
  paneInnerGapScaleCoeff,
  paneStackGapScaleCoeff,
  sidebarInnerGapScaleCoeff,
  thumbnailGapScaleCoeff,
  buttonGroupInsetScaleCoeff,
  paneToolbarHeightScaleCoeff,
  paneFooterHeightScaleCoeff,
  radiusCascadeScaleCoeff,
  radiusValueScaleCoeff,
  setAppBodyWidth,
  setGridSize,
  setVectorFocusIndex,
  setVectorPage,
  setPageByPackage,
  setSelectedPackageId,
  setSelectedSidebarNodeId,
  setSelectedAudioId,
  selectVideoFromBrowser,
  setFullscreenEntryDisplay,
  setFullscreenDisplay,
  setFullscreenVideoFocus,
  setFullscreenSwapped,
  setShowFullscreenFooter,
  updateSettings,
}: UseAppEffectsParams) {
  void videoQueueSource;
  const handledImageSidebarLocateNonceRef = useRef(0);
  const handledVideoSidebarLocateNonceRef = useRef(0);

  const expandCollapsedAncestorsForNode = useCallback(
    (targetNodeId: string) => {
      if (sidebarTreeNodes.length === 0) {
        return;
      }

      const ancestorNodeIds = resolveAncestorNodeIds(
        sidebarTreeNodes,
        targetNodeId,
      );
      if (ancestorNodeIds.length === 0) {
        return;
      }

      if (mode === "image") {
        const next = new Set(imageCollapsedFolderNodeIds);
        let changed = false;
        for (const ancestorNodeId of ancestorNodeIds) {
          if (next.delete(ancestorNodeId)) {
            changed = true;
          }
        }
        if (changed) {
          updateSettings({ imageCollapsedFolderNodeIds: Array.from(next) });
        }
        return;
      }

      if (mode === "video") {
        const next = new Set(videoCollapsedFolderNodeIds);
        let changed = false;
        for (const ancestorNodeId of ancestorNodeIds) {
          if (next.delete(ancestorNodeId)) {
            changed = true;
          }
        }
        if (changed) {
          updateSettings({ videoCollapsedFolderNodeIds: Array.from(next) });
        }
        return;
      }

      const next = new Set(musicCollapsedFolderNodeIds);
      let changed = false;
      for (const ancestorNodeId of ancestorNodeIds) {
        if (next.delete(ancestorNodeId)) {
          changed = true;
        }
      }
      if (changed) {
        updateSettings({ musicCollapsedFolderNodeIds: Array.from(next) });
      }
    },
    [
      imageCollapsedFolderNodeIds,
      mode,
      musicCollapsedFolderNodeIds,
      sidebarTreeNodes,
      updateSettings,
      videoCollapsedFolderNodeIds,
    ],
  );

  useEffect(() => {
    if (!appBodyRef.current) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const target = entries[0];
      if (!target) {
        return;
      }
      const nextWidth = Math.round(target.contentRect.width);
      if (nextWidth <= 0) {
        return;
      }
      setAppBodyWidth((previous) =>
        Math.abs(previous - nextWidth) < 1 ? previous : nextWidth,
      );
    });

    observer.observe(appBodyRef.current);
    return () => observer.disconnect();
  }, [appBodyRef, setAppBodyWidth]);

  useEffect(() => {
    if (!gridElement) {
      return;
    }

    const updateGridSize = (width: number, height: number) => {
      if (width <= 1 || height <= 1) {
        return;
      }

      const nextWidth = Math.round(width);
      const nextHeight = Math.round(height);
      setGridSize((previous) => {
        if (
          Math.abs(previous.width - nextWidth) < 1 &&
          Math.abs(previous.height - nextHeight) < 1
        ) {
          return previous;
        }
        return { width: nextWidth, height: nextHeight };
      });
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      updateGridSize(entry.contentRect.width, entry.contentRect.height);
    });

    observer.observe(gridElement);

    return () => {
      observer.disconnect();
    };
  }, [gridElement, setGridSize, showNamesOnly]);

  useEffect(() => {
    if (sidebarRatio >= sidebarCollapseRatio) {
      lastExpandedSidebarRatioRef.current = sidebarRatio;
    }
  }, [lastExpandedSidebarRatioRef, sidebarCollapseRatio, sidebarRatio]);

  useEffect(() => {
    const normalized = normalizeSidebarRatio(sidebarRatio);
    if (Math.abs(normalized - sidebarRatio) < 0.0005) {
      return;
    }
    updateSettings({ sidebarRatio: normalized });
  }, [normalizeSidebarRatio, sidebarRatio, updateSettings]);

  useEffect(() => {
    if (!sidebarCollapsed || sidebarFocus !== "sidebar") {
      return;
    }
    updateSettings({ sidebarFocus: "main" });
  }, [sidebarCollapsed, sidebarFocus, updateSettings]);

  useEffect(() => {
    if (!vectorResultsActive || sidebarFocus !== "sidebar") {
      return;
    }
    updateSettings({ sidebarFocus: "main" });
  }, [sidebarFocus, updateSettings, vectorResultsActive]);

  useEffect(() => {
    if (!activePackage || showNamesOnly || !imageFocusActive) {
      return;
    }

    const focused = clamp(
      focusByPackage[activePackage.id] ?? 0,
      0,
      activePackage.images.length - 1,
    );
    const nextPage = Math.floor(focused / pagedPageSize);
    setPageByPackage((previous) => {
      if ((previous[activePackage.id] ?? 0) === nextPage) {
        return previous;
      }

      return {
        ...previous,
        [activePackage.id]: nextPage,
      };
    });
  }, [
    activePackage,
    focusByPackage,
    imageFocusActive,
    pagedPageSize,
    setPageByPackage,
    showNamesOnly,
  ]);

  useEffect(() => {
    if (vectorSearchResults.length === 0) {
      setVectorFocusIndex(0);
      setVectorPage(0);
      return;
    }

    setVectorFocusIndex((value) =>
      clamp(value, 0, vectorSearchResults.length - 1),
    );
  }, [setVectorFocusIndex, setVectorPage, vectorSearchResults.length]);

  useEffect(() => {
    if (!vectorResultsActive) {
      return;
    }

    if (showNamesOnly) {
      setVectorPage(0);
      return;
    }

    setVectorPage(Math.floor(vectorFocusIndex / pagedPageSize));
  }, [
    pagedPageSize,
    setVectorPage,
    showNamesOnly,
    vectorFocusIndex,
    vectorResultsActive,
  ]);

  useEffect(() => {
    if (manageMode || !vectorResultsActive || mode !== "image" || !focusedRef) {
      return;
    }

    const sidebarNodeId = vectorResultPackageNodeIdMap.get(
      focusedRef.packageId,
    );
    if (!sidebarNodeId || sidebarNodeId === selectedSidebarNodeId) {
      return;
    }

    setSelectedSidebarNodeId(sidebarNodeId);
  }, [
    focusedRef,
    manageMode,
    mode,
    selectedSidebarNodeId,
    setSelectedSidebarNodeId,
    vectorResultPackageNodeIdMap,
    vectorResultsActive,
  ]);

  useEffect(() => {
    if (orderedRootScopedPackages.length === 0) {
      return;
    }

    if (!rootScopedPackageIds.has(selectedPackageId)) {
      const firstReadyPackage = orderedRootScopedPackages.find(
        (item) => item.images.length > 0,
      );
      setSelectedPackageId(
        (firstReadyPackage ?? orderedRootScopedPackages[0]).id,
      );
    }
  }, [
    orderedRootScopedPackages,
    rootScopedPackageIds,
    selectedPackageId,
    setSelectedPackageId,
  ]);

  useEffect(() => {
    if (
      mode !== "image" ||
      fullscreenActive ||
      manageMode ||
      metadataManageMode ||
      adReviewPanelOpen ||
      imageSidebarLocateRequestNonce <=
        handledImageSidebarLocateNonceRef.current
    ) {
      return;
    }

    const nextImageNodeId = imageSourceNodeIdMap.get(selectedPackageId) ?? null;
    if (!nextImageNodeId) {
      handledImageSidebarLocateNonceRef.current =
        imageSidebarLocateRequestNonce;
      return;
    }

    expandCollapsedAncestorsForNode(nextImageNodeId);
    if (nextImageNodeId !== selectedSidebarNodeId) {
      setSelectedSidebarNodeId(nextImageNodeId);
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => ensureSidebarNodeVisible(nextImageNodeId));
    });
    handledImageSidebarLocateNonceRef.current = imageSidebarLocateRequestNonce;
  }, [
    adReviewPanelOpen,
    ensureSidebarNodeVisible,
    expandCollapsedAncestorsForNode,
    fullscreenActive,
    imageCollapsedFolderNodeIds,
    imageSourceNodeIdMap,
    imageSidebarLocateRequestNonce,
    manageMode,
    metadataManageMode,
    mode,
    musicCollapsedFolderNodeIds,
    selectedPackageId,
    selectedSidebarNodeId,
    setSelectedSidebarNodeId,
    sidebarTreeNodes,
    updateSettings,
    videoCollapsedFolderNodeIds,
  ]);

  useEffect(() => {
    const adReviewFocusActive =
      adReviewPanelOpen && Boolean(adReviewFocusTaskId);
    if (manageMode || mode !== "image" || adReviewFocusActive) {
      return;
    }

    const selectedNode = selectedSidebarNodeId
      ? (sidebarNodeById.get(selectedSidebarNodeId) ?? null)
      : null;
    const selectedNodeMatchesImageMode =
      selectedNode !== null &&
      (selectedNode.kind === "folder" || selectedNode.kind === "package");

    if (selectedNodeMatchesImageMode) {
      return;
    }

    let fallbackNodeId: string | null;
    if (vectorResultsActive) {
      fallbackNodeId =
        (focusedRef
          ? (vectorResultPackageNodeIdMap.get(focusedRef.packageId) ?? null)
          : null) ??
        vectorSidebarNodes[0]?.id ??
        null;
    } else {
      const firstImagePackageNodeId =
        imageSourceNodeIdMap.values().next().value ?? null;
      fallbackNodeId =
        imageSourceNodeIdMap.get(selectedPackageId) ??
        firstImagePackageNodeId ??
        flatSidebarNodes[0]?.id ??
        null;
    }

    if (fallbackNodeId !== selectedSidebarNodeId) {
      setSelectedSidebarNodeId(fallbackNodeId);
    }
  }, [
    flatSidebarNodes,
    focusedRef,
    imageSourceNodeIdMap,
    mode,
    manageMode,
    selectedPackageId,
    selectedSidebarNodeId,
    setSelectedSidebarNodeId,
    sidebarNodeById,
    vectorResultPackageNodeIdMap,
    vectorResultsActive,
    vectorSidebarNodes,
    adReviewPanelOpen,
    adReviewFocusTaskId,
  ]);

  useEffect(() => {
    const videoPaneVisibleInFullscreen =
      fullscreenActive &&
      (fullscreenDisplay === "dual" || fullscreenDisplay === "video-only");

    if (mode !== "video" && !videoPaneVisibleInFullscreen) {
      return;
    }

    if (manageMode) {
      return;
    }

    if (videosForSidebar.length === 0) {
      if (selectedVideoId !== "") {
        selectVideoFromBrowser("");
      }
      return;
    }

    if (!rootScopedVideoIds.has(selectedVideoId)) {
      selectVideoFromBrowser(videosForSidebar[0].id);
    }
  }, [
    fullscreenActive,
    fullscreenDisplay,
    manageMode,
    mode,
    rootScopedVideoIds,
    selectVideoFromBrowser,
    selectedVideoId,
    videosForSidebar,
  ]);

  useEffect(() => {
    if (mode !== "video") {
      return;
    }

    if (
      fullscreenActive ||
      manageMode ||
      metadataManageMode ||
      adReviewPanelOpen
    ) {
      return;
    }

    if (
      videoSidebarLocateRequestNonce <=
      handledVideoSidebarLocateNonceRef.current
    ) {
      return;
    }

    const nextVideoNodeId = videoNodeIdMap.get(selectedVideoId) ?? null;
    if (!nextVideoNodeId) {
      handledVideoSidebarLocateNonceRef.current =
        videoSidebarLocateRequestNonce;
      return;
    }

    expandCollapsedAncestorsForNode(nextVideoNodeId);
    if (nextVideoNodeId !== selectedSidebarNodeId) {
      setSelectedSidebarNodeId(nextVideoNodeId);
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => ensureSidebarNodeVisible(nextVideoNodeId));
    });
    handledVideoSidebarLocateNonceRef.current = videoSidebarLocateRequestNonce;
  }, [
    adReviewPanelOpen,
    ensureSidebarNodeVisible,
    expandCollapsedAncestorsForNode,
    fullscreenActive,
    imageCollapsedFolderNodeIds,
    manageMode,
    metadataManageMode,
    mode,
    musicCollapsedFolderNodeIds,
    selectedSidebarNodeId,
    selectedVideoId,
    setSelectedSidebarNodeId,
    sidebarTreeNodes,
    updateSettings,
    videoCollapsedFolderNodeIds,
    videoSidebarLocateRequestNonce,
    videoNodeIdMap,
  ]);

  useEffect(() => {
    if (mode !== "video") {
      return;
    }

    if (manageMode) {
      return;
    }

    if (selectedSidebarNodeId && sidebarNodeById.has(selectedSidebarNodeId)) {
      return;
    }

    const fallbackNodeId =
      videoNodeIdMap.get(selectedVideoId) ?? flatSidebarNodes[0]?.id ?? null;
    if (fallbackNodeId !== selectedSidebarNodeId) {
      setSelectedSidebarNodeId(fallbackNodeId);
    }
  }, [
    flatSidebarNodes,
    manageMode,
    mode,
    selectedSidebarNodeId,
    selectedVideoId,
    setSelectedSidebarNodeId,
    sidebarNodeById,
    videoNodeIdMap,
  ]);

  useEffect(() => {
    if (mode !== "music") {
      return;
    }

    if (audiosForSidebar.length === 0) {
      if (selectedAudioId !== "") {
        setSelectedAudioId("");
      }
      return;
    }

    if (!rootScopedAudioIds.has(selectedAudioId)) {
      setSelectedAudioId(audiosForSidebar[0].id);
    }
  }, [
    audiosForSidebar,
    mode,
    rootScopedAudioIds,
    selectedAudioId,
    setSelectedAudioId,
  ]);

  useEffect(() => {
    if (mode !== "music") {
      return;
    }

    const currentNode = selectedSidebarNodeId
      ? (sidebarNodeById.get(selectedSidebarNodeId) ?? null)
      : null;
    if (currentNode && currentNode.kind === "folder") {
      return;
    }

    const nextAudioNodeId = audioNodeIdMap.get(selectedAudioId) ?? null;
    if (!nextAudioNodeId) {
      return;
    }

    if (nextAudioNodeId !== selectedSidebarNodeId) {
      setSelectedSidebarNodeId(nextAudioNodeId);
    }
  }, [
    audioNodeIdMap,
    mode,
    selectedAudioId,
    selectedSidebarNodeId,
    setSelectedSidebarNodeId,
    sidebarNodeById,
  ]);

  useEffect(() => {
    if (mode !== "music") {
      return;
    }

    const selectedNode = selectedSidebarNodeId
      ? (sidebarNodeById.get(selectedSidebarNodeId) ?? null)
      : null;
    const selectedNodeMatchesMusicMode =
      selectedNode !== null &&
      (selectedNode.kind === "folder" || selectedNode.kind === "audio");

    if (selectedNodeMatchesMusicMode) {
      return;
    }

    const fallbackNodeId =
      audioNodeIdMap.get(selectedAudioId) ?? flatSidebarNodes[0]?.id ?? null;
    if (fallbackNodeId !== selectedSidebarNodeId) {
      setSelectedSidebarNodeId(fallbackNodeId);
    }
  }, [
    audioNodeIdMap,
    flatSidebarNodes,
    mode,
    selectedAudioId,
    selectedSidebarNodeId,
    setSelectedSidebarNodeId,
    sidebarNodeById,
  ]);

  useEffect(() => {
    if (
      manageMode ||
      sidebarCollapsed ||
      sidebarFocus !== "sidebar" ||
      !selectedSidebarNodeId
    ) {
      return;
    }
    ensureSidebarNodeVisible(selectedSidebarNodeId);
  }, [
    ensureSidebarNodeVisible,
    manageMode,
    selectedSidebarNodeId,
    sidebarCollapsed,
    sidebarFocus,
  ]);

  useEffect(() => {
    if (
      manageMode ||
      !vectorResultsActive ||
      sidebarCollapsed ||
      !selectedSidebarNodeId
    ) {
      return;
    }
    ensureSidebarNodeVisible(selectedSidebarNodeId);
  }, [
    ensureSidebarNodeVisible,
    manageMode,
    selectedSidebarNodeId,
    sidebarCollapsed,
    vectorResultsActive,
  ]);

  useEffect(() => {
    const enteringFullscreen = fullscreenActive && !wasFullscreenRef.current;
    if (enteringFullscreen) {
      const entryDisplay = mode === "video" ? "video-only" : "image-only";
      setFullscreenEntryDisplay(entryDisplay);
      setFullscreenDisplay(entryDisplay);
      setFullscreenVideoFocus(mode === "video");
      setFullscreenSwapped(false);
      setShowFullscreenFooter(false);
    }
    wasFullscreenRef.current = fullscreenActive;
  }, [
    fullscreenActive,
    mode,
    setFullscreenDisplay,
    setFullscreenEntryDisplay,
    setFullscreenSwapped,
    setFullscreenVideoFocus,
    setShowFullscreenFooter,
    wasFullscreenRef,
  ]);

  useEffect(() => {
    const canAutoplayImages = resolveFullscreenImageAutoplayEnabled({
      fullscreenActive,
      fullscreenDisplay,
    });
    if (!canAutoplayImages || !autoPlayEnabled) {
      return;
    }

    const timer = window.setInterval(() => {
      moveImage(1, "autoplay");
    }, autoPlayInterval * 1000);

    return () => window.clearInterval(timer);
  }, [
    autoPlayEnabled,
    autoPlayInterval,
    fullscreenActive,
    fullscreenDisplay,
    moveImage,
  ]);

  const activeTopPanelKind = manageMode
    ? "manage"
    : metadataManageMode
      ? "metadata"
      : vectorMode
        ? "search"
        : "none";

  useEffect(() => {
    if (searchPanelCollapsed || activeTopPanelKind === "none") {
      return;
    }

    const content = vectorPanelContentRef.current;
    if (!content) {
      return;
    }

    const measurePanelHeight = () => {
      const panel = content.parentElement;
      const styles = panel ? window.getComputedStyle(panel) : null;
      const readPx = (value: string | undefined) => {
        const parsed = Number.parseFloat(value ?? "");
        return Number.isFinite(parsed) ? parsed : 0;
      };
      const chromeHeight = styles
        ? readPx(styles.paddingTop) +
          readPx(styles.paddingBottom) +
          readPx(styles.borderTopWidth) +
          readPx(styles.borderBottomWidth)
        : 20;
      const measured = clamp(
        Math.ceil(content.scrollHeight + chromeHeight + 1),
        TOP_PANEL_MIN_HEIGHT,
        TOP_PANEL_MAX_HEIGHT,
      );
      if (Math.abs(measured - workspaceBottomPanelHeight) < 1) {
        return;
      }
      updateSettings({ workspaceBottomPanelHeight: measured });
    };

    const rafId = window.requestAnimationFrame(measurePanelHeight);
    const observer = new ResizeObserver(() => {
      measurePanelHeight();
    });
    observer.observe(content);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [
    activeTopPanelKind,
    featureTagPickerOpen,
    searchPanelCollapsed,
    searchPanelMode,
    updateSettings,
    vectorPanelContentRef,
    workspaceBottomPanelHeight,
  ]);

  useEffect(() => {
    const nextStyleId = resolveStyleId(styleId);
    const nextPalettePair = resolvePalettePairForStyle(
      nextStyleId,
      paletteDayId,
      paletteNightId,
    );
    const targetPaletteId =
      paletteMode === "night" ? nextPalettePair.night : nextPalettePair.day;
    const nextPaletteId = resolvePaletteIdForStyle(
      targetPaletteId,
      nextStyleId,
    );
    const nextThemeId = nextPaletteId;

    if (
      nextStyleId !== styleId ||
      nextPaletteId !== paletteId ||
      nextThemeId !== themeId ||
      nextPalettePair.day !== paletteDayId ||
      nextPalettePair.night !== paletteNightId
    ) {
      updateSettings({
        styleId: nextStyleId,
        paletteId: nextPaletteId,
        paletteDayId: nextPalettePair.day,
        paletteNightId: nextPalettePair.night,
        themeId: nextThemeId,
      });
    }

    document.documentElement.dataset.mpxStyle = nextStyleId;
    document.documentElement.dataset.mpxPalette = nextPaletteId;
    document.documentElement.dataset.mpxTheme = nextThemeId;
    document.documentElement.dataset.mpxPaletteMode = paletteMode;
  }, [
    paletteDayId,
    paletteId,
    paletteMode,
    paletteNightId,
    styleId,
    themeId,
    updateSettings,
  ]);

  useEffect(() => {
    const normalizedOpacity = Math.max(
      0,
      Math.min(100, settingsBackdropOpacity),
    );
    document.documentElement.style.setProperty(
      "--mpx-settings-backdrop-opacity",
      `${normalizedOpacity.toFixed(0)}%`,
    );
  }, [settingsBackdropOpacity]);

  useEffect(() => {
    const applyLayoutGapVars = () => {
      const runtimeSpacing = resolveRuntimeSpacing({
        viewportWidth: resolveRuntimeViewportWidth(),
        layoutGapScaleCoeff,
        paneInnerGapScaleCoeff,
        paneStackGapScaleCoeff,
        sidebarInnerGapScaleCoeff,
        thumbnailGapScaleCoeff,
        buttonGroupInsetScaleCoeff,
        paneToolbarHeightScaleCoeff,
        paneFooterHeightScaleCoeff,
      });
      const normalizedRadiusCascadeScale = Math.max(
        0,
        Math.min(2, radiusCascadeScaleCoeff),
      );
      const normalizedRadiusValueScale = Math.max(
        0,
        Math.min(2, radiusValueScaleCoeff),
      );
      const resolvedIconButtonSizePx = Math.max(
        34,
        Math.round(34 + runtimeSpacing.paneInnerGapScaleCoeff * 3),
      );
      const resolvedHeaderButtonSizePx = Math.max(
        resolvedIconButtonSizePx,
        Math.round(34 + runtimeSpacing.paneInnerGapScaleCoeff * 4),
      );
      const resolvedPanelHeadHeightPx = Math.max(
        resolvedHeaderButtonSizePx,
        Math.round(
          resolvedHeaderButtonSizePx *
            runtimeSpacing.paneToolbarHeightScaleCoeff,
        ),
      );
      const basePanelFooterMinHeightPx = Math.max(
        resolvedIconButtonSizePx,
        Math.round(
          resolvedHeaderButtonSizePx + runtimeSpacing.paneRecessedPaddingPx * 2,
        ),
      );
      const resolvedPanelFooterMinHeightPx = Math.max(
        resolvedIconButtonSizePx,
        Math.round(
          basePanelFooterMinHeightPx * runtimeSpacing.paneFooterHeightScaleCoeff,
        ),
      );
      const resolvedControlPaddingXPx = Math.max(
        0,
        Math.round(runtimeSpacing.paneInnerGapScaleCoeff * 4),
      );

      document.documentElement.style.setProperty(
        "--mpx-layout-gap-scale",
        runtimeSpacing.layoutGapScaleCoeff.toFixed(2),
      );
      document.documentElement.style.setProperty(
        "--mpx-pane-inner-gap-scale",
        runtimeSpacing.paneInnerGapScaleCoeff.toFixed(2),
      );
      document.documentElement.style.setProperty(
        "--mpx-pane-stack-gap-scale",
        runtimeSpacing.paneStackGapScaleCoeff.toFixed(2),
      );
      document.documentElement.style.setProperty(
        "--mpx-sidebar-inner-gap-scale",
        runtimeSpacing.sidebarInnerGapScaleCoeff.toFixed(2),
      );
      document.documentElement.style.setProperty(
        "--mpx-thumbnail-gap-scale",
        runtimeSpacing.thumbnailGapScaleCoeff.toFixed(2),
      );
      document.documentElement.style.setProperty(
        "--mpx-button-group-inset-scale",
        runtimeSpacing.buttonGroupInsetScaleCoeff.toFixed(2),
      );
      document.documentElement.style.setProperty(
        "--mpx-pane-toolbar-height-scale",
        runtimeSpacing.paneToolbarHeightScaleCoeff.toFixed(2),
      );
      document.documentElement.style.setProperty(
        "--mpx-pane-footer-height-scale",
        runtimeSpacing.paneFooterHeightScaleCoeff.toFixed(2),
      );
      document.documentElement.style.setProperty(
        "--mpx-radius-cascade-scale-coeff",
        normalizedRadiusCascadeScale.toFixed(2),
      );
      document.documentElement.style.setProperty(
        "--mpx-radius-value-scale-coeff",
        normalizedRadiusValueScale.toFixed(2),
      );
      document.documentElement.style.setProperty(
        "--mpx-layout-gap-px",
        `${runtimeSpacing.layoutGapPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-pane-inner-padding-px",
        `${runtimeSpacing.paneInnerPaddingPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-pane-stack-gap-px",
        `${runtimeSpacing.paneStackGapPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-pane-section-gap-px",
        `${runtimeSpacing.paneSectionGapPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-pane-recessed-padding-px",
        `${runtimeSpacing.paneRecessedPaddingPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-sidebar-gap-px",
        `${runtimeSpacing.sidebarGapPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-thumbnail-gap-px",
        `${runtimeSpacing.thumbnailGapPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-button-group-inset-px",
        `${runtimeSpacing.buttonGroupInsetPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-control-group-gap-px",
        `${runtimeSpacing.controlGroupGapPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-metadata-edit-grid-label-gap-px",
        `${runtimeSpacing.metadataEditGridLabelGapPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-icon-button-size-px",
        `${resolvedIconButtonSizePx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-header-btn-size-px",
        `${resolvedHeaderButtonSizePx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-panel-head-height-px",
        `${resolvedPanelHeadHeightPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-pane-toolbar-height-px",
        `${resolvedPanelHeadHeightPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-pane-footer-height-px",
        `${resolvedPanelFooterMinHeightPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-panel-footer-min-height",
        `${resolvedPanelFooterMinHeightPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-control-padding-x",
        `${resolvedControlPaddingXPx}px`,
      );
      document.documentElement.style.setProperty(
        "--mpx-header-btn-padding-x",
        `${resolvedControlPaddingXPx}px`,
      );
    };

    applyLayoutGapVars();
    window.addEventListener("resize", applyLayoutGapVars);
    return () => {
      window.removeEventListener("resize", applyLayoutGapVars);
    };
  }, [
    layoutGapScaleCoeff,
    paneInnerGapScaleCoeff,
    paneStackGapScaleCoeff,
    sidebarInnerGapScaleCoeff,
    thumbnailGapScaleCoeff,
    buttonGroupInsetScaleCoeff,
    paneToolbarHeightScaleCoeff,
    paneFooterHeightScaleCoeff,
    radiusCascadeScaleCoeff,
    radiusValueScaleCoeff,
  ]);
}
