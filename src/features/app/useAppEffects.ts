import {
  useEffect,
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
  selectedAudioId: string;
  videoNodeIdMap: Map<string, string>;
  audioNodeIdMap: Map<string, string>;
  ensureSidebarNodeVisible: (nodeId: string) => void;
  fullscreenActive: boolean;
  fullscreenDisplay: "dual" | "video-only" | "image-only";
  fullscreenVideoFocus: boolean;
  autoPlayEnabled: boolean;
  autoPlayInterval: number;
  moveImage: (delta: number) => void;
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
  selectedAudioId,
  videoNodeIdMap,
  audioNodeIdMap,
  ensureSidebarNodeVisible,
  fullscreenActive,
  fullscreenDisplay,
  fullscreenVideoFocus,
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
    if (mode !== "image") {
      return;
    }

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
  }, [gridElement, mode, setGridSize, showNamesOnly]);

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
    const adReviewFocusActive =
      adReviewPanelOpen && Boolean(adReviewFocusTaskId);
    if (
      manageMode ||
      mode !== "image" ||
      vectorResultsActive ||
      sidebarFocus === "sidebar" ||
      adReviewFocusActive
    ) {
      return;
    }

    const nextImageNodeId = imageSourceNodeIdMap.get(selectedPackageId) ?? null;
    if (!nextImageNodeId) {
      return;
    }

    if (nextImageNodeId !== selectedSidebarNodeId) {
      setSelectedSidebarNodeId(nextImageNodeId);
    }
  }, [
    adReviewFocusTaskId,
    adReviewPanelOpen,
    imageSourceNodeIdMap,
    manageMode,
    mode,
    selectedPackageId,
    selectedSidebarNodeId,
    setSelectedSidebarNodeId,
    sidebarFocus,
    vectorResultsActive,
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
    if (mode !== "video") {
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

    if (manageMode) {
      return;
    }

    if (videoQueueSource !== "sidebar") {
      return;
    }

    // 当前选中的是 folder 节点时，说明用户在浏览文件夹层级，不覆盖
    const currentNode = selectedSidebarNodeId
      ? (sidebarNodeById.get(selectedSidebarNodeId) ?? null)
      : null;
    if (currentNode && !currentNode.videoId) {
      return;
    }

    const nextVideoNodeId = videoNodeIdMap.get(selectedVideoId) ?? null;
    if (!nextVideoNodeId) {
      return;
    }

    if (nextVideoNodeId !== selectedSidebarNodeId) {
      setSelectedSidebarNodeId(nextVideoNodeId);
    }
  }, [
    manageMode,
    mode,
    selectedSidebarNodeId,
    selectedVideoId,
    setSelectedSidebarNodeId,
    sidebarNodeById,
    videoNodeIdMap,
    videoQueueSource,
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
    rootScopedAudioIds,
    selectedAudioId,
    setSelectedAudioId,
  ]);

  useEffect(() => {
    if (mode !== "music") {
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
  ]);

  useEffect(() => {
    if (mode !== "music") {
      return;
    }

    const selectedNode = selectedSidebarNodeId
      ? (sidebarNodeById.get(selectedSidebarNodeId) ?? null)
      : null;
    const selectedNodeMatchesMusicMode =
      selectedNode !== null && selectedNode.kind === "audio";

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
    const windowApi =
      typeof window !== "undefined" ? window.mediaPlayerWindow : undefined;
    if (!windowApi?.setFullscreen) {
      return;
    }

    void windowApi.setFullscreen(fullscreenActive).catch(() => {
      // ignore runtime bridge errors and keep renderer behavior intact
    });
  }, [fullscreenActive]);

  useEffect(() => {
    const canAutoplayImages =
      fullscreenActive &&
      (fullscreenDisplay === "image-only" ||
        (fullscreenDisplay === "dual" && !fullscreenVideoFocus));
    if (!canAutoplayImages || !autoPlayEnabled) {
      return;
    }

    const timer = window.setInterval(() => {
      moveImage(1);
    }, autoPlayInterval * 1000);

    return () => window.clearInterval(timer);
  }, [
    autoPlayEnabled,
    autoPlayInterval,
    fullscreenActive,
    fullscreenDisplay,
    fullscreenVideoFocus,
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
}
