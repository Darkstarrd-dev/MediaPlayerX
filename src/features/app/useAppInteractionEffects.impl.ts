import { useEffect, useRef } from "react";

import { useAppShortcutBindings } from "./useAppShortcutBindings";
import { useAppEffects } from "./useAppEffects";
import { usePersistedAppSettings } from "./usePersistedAppSettings";
import { usePersistedSessionCursor } from "./usePersistedSessionCursor";
import { usePreferenceMetricsBuffer } from "./usePreferenceMetricsBuffer";
import { useAppInteractionLayer } from "./useAppInteractionLayer";
import {
  resolveImageConvertScopeNodeIds,
  resolveScopedImageConvertNavigationNodeId,
} from "./workspaceImageManageUtils";
import { clamp } from "../../utils/ui";
import type { AppSettingsStoreSnapshot } from "./useAppSettingsStore";
import type { AppSessionStateResult } from "./useAppSessionState";
import type { RepositoryBootstrapDataResult } from "./useRepositoryBootstrapData";
import type { MediaStateResult } from "../media/useMediaState";
import type { AppReadAndNavigationResult } from "./useAppReadAndNavigation";
import type { FullscreenPlaybackBindingsResult } from "./useFullscreenPlaybackBindings";
import type { MetadataWriteBindingsResult } from "./useMetadataWriteBindings";

const SIDEBAR_COLLAPSE_RATIO = 0.03;

interface UseAppInteractionEffectsParams {
  appSettings: AppSettingsStoreSnapshot;
  mediaRepository: RepositoryBootstrapDataResult["mediaRepository"];
  importBusy: boolean;
  sessionState: AppSessionStateResult;
  mediaState: MediaStateResult;
  readNavigationState: AppReadAndNavigationResult;
  videoShortcutActive: boolean;
  requestFullscreenAlign: FullscreenPlaybackBindingsResult["requestFullscreenAlign"];
  applyAutoplayIntervalByIndex: FullscreenPlaybackBindingsResult["applyAutoplayIntervalByIndex"];
  setFullscreenActiveWithAutoStop: FullscreenPlaybackBindingsResult["setFullscreenActiveWithAutoStop"];
  applyPackageGrade: MetadataWriteBindingsResult["applyPackageGrade"];
  applyVideoGrade: (grade: number | null) => void;
  requestManageOrganize: () => void;
  onToggleSubtitleByShortcut: () => void;
  onSaveVideoCoverByShortcut: () => void;
  adReviewDeletePending: boolean;
}

export function useAppInteractionEffects({
  appSettings,
  mediaRepository,
  importBusy,
  sessionState,
  mediaState,
  readNavigationState,
  videoShortcutActive,
  requestFullscreenAlign,
  applyAutoplayIntervalByIndex,
  setFullscreenActiveWithAutoStop,
  applyPackageGrade,
  applyVideoGrade,
  requestManageOrganize,
  onToggleSubtitleByShortcut,
  onSaveVideoCoverByShortcut,
  adReviewDeletePending,
}: UseAppInteractionEffectsParams) {
  const {
    mode,
    vectorMode,
    settingsOpen,
    helpOpen,
    sidebarRatio,
    settingsBackdropOpacity,
    showNamesOnly,
    autoPlayEnabled,
    autoPlayInterval,
    sidebarFocus,
    workspaceBottomPanelHeight,
    styleId,
    paletteId,
    paletteMode,
    paletteDayId,
    paletteNightId,
    themeId,
    shortcuts,
    updateSettings,
  } = appSettings;

  const {
    selectedPackageId,
    selectedSidebarNodeId,
    imageFocusActive,
    setImageFocusActive,
    focusByPackage,
    setFocusByPackage,
    setPageByPackage,
    vectorSearchResults,
    vectorFocusIndex,
    setVectorFocusIndex,
    setVectorPage,
    appBodyRef,
    vectorPanelContentRef,
    wasFullscreenRef,
    lastExpandedSidebarRatioRef,
    setAppBodyWidth,
    gridElement,
    setGridSize,
    setSelectedPackageId,
    setSelectedSidebarNodeId,
    setSelectedAudioId,
    setFullscreenEntryDisplay,
    imageConvertPreviewMode,
    setManageMode,
    manageMode,
    metadataManageMode,
    adReviewPanelOpen,
    adReviewFocusTaskId,
    helpOverlayOpen,
    themeParameterPanelOpen,
  } = sessionState;

  const {
    selectedVideoId,
    videoDurationById,
    videoPlaying,
    videoTime,
    setVideoPlaying,
    setVideoTime,
    setVideoMuted,
    setPlaylistIds,
    videoQueueSource,
    fullscreenActive,
    fullscreenDisplay,
    fullscreenVideoFocus,
    setFullscreenDisplay,
    setFullscreenVideoFocus,
    setFullscreenSwapped,
    setShowFullscreenFooter,
    goPlaylist,
    adjustVideoRate,
    adjustVideoVolume,
    cycleVideoFitMode,
    selectVideoFromBrowser,
  } = mediaState;

  void videoPlaying;

  const {
    packageByIdEffective,
    searchPanelMode,
    searchPanelCollapsed,
    featureTagPickerOpen,
    vectorResultsActive,
    rootScopedVideoIds,
    rootScopedPackageIds,
    vectorSidebarNodes,
    vectorResultPackageNodeIdMap,
    flatSidebarNodes,
    sidebarNodeById,
    sidebarCheckedNodeIds,
    activeSelectionScope,
    clearSidebarSelections,
    checkSidebarNode,
    imageSourceNodeIdMap,
    videoNodeIdMap,
    videosForSidebar,
    audiosForSidebar,
    rootScopedAudioIds,
    selectedAudioId,
    audioNodeIdMap,
    ensureSidebarNodeVisible,
    handleSidebarNavigationKey,
    orderedRootScopedPackages,
    sidebarCollapsed,
    normalizeSidebarRatio,
    pagedPageSize,
    activePackage,
    focusedRef,
    moveImage,
    moveImageVertical,
    jumpImageBoundary,
    goPackage,
    goPrevPage,
    goNextPage,
  } = readNavigationState;

  const focusedVideoDurationSec = Math.max(
    0,
    videoDurationById[selectedVideoId] ??
      videosForSidebar.find((video) => video.id === selectedVideoId)
        ?.durationSec ??
      0,
  );

  const previousModeRef = useRef(mode);

  useEffect(() => {
    const previousMode = previousModeRef.current;
    if (previousMode === mode) {
      return;
    }

    if (previousMode === "video" || mode === "video") {
      setVideoPlaying(false);
    }

    previousModeRef.current = mode;
  }, [mode, setVideoPlaying]);

  const handleImageWheelLikePageNavigation = (direction: "next" | "prev") => {
    if (mode !== "image") {
      return;
    }

    if (direction === "next") {
      goNextPage();
      return;
    }

    goPrevPage();
  };

  const handleImageCtrlWheelLikeSidebarNavigation = (
    direction: "next" | "prev",
  ) => {
    if (mode !== "image" || flatSidebarNodes.length === 0) {
      return;
    }

    const currentNodeId =
      selectedSidebarNodeId && sidebarNodeById.has(selectedSidebarNodeId)
        ? selectedSidebarNodeId
        : flatSidebarNodes[0].id;
    const currentIndex = Math.max(
      0,
      flatSidebarNodes.findIndex((node) => node.id === currentNodeId),
    );
    const delta = direction === "next" ? 1 : -1;
    const nextIndex = Math.max(
      0,
      Math.min(flatSidebarNodes.length - 1, currentIndex + delta),
    );
    const nextNode = flatSidebarNodes[nextIndex];
    if (!nextNode || nextNode.id === selectedSidebarNodeId) {
      return;
    }

    setSelectedSidebarNodeId(nextNode.id);
    if (nextNode.imageSourceId) {
      setSelectedPackageId(nextNode.imageSourceId);
    }

    requestAnimationFrame(() => ensureSidebarNodeVisible(nextNode.id));
  };

  useAppInteractionLayer({
    appSettings,
    sessionState,
    mediaState,
    readNavigationState,
    adReviewDeletePending,
    setFullscreenActiveWithAutoStop,
  });

  useAppShortcutBindings({
    shortcuts,
    featureTagPickerOpen,
    adReviewDeletePending,
    mode,
    vectorResultsActive,
    settingsOpen:
      settingsOpen || helpOpen || helpOverlayOpen || themeParameterPanelOpen,
    sidebarFocus,
    fullscreenActive,
    fullscreenDisplay,
    fullscreenVideoFocus,
    imageFocusActive,
    manageMode,
    videoShortcutActive,
    handleSidebarNavigationKey,
    setImageFocusActive,
    setFullscreenActiveWithAutoStop,
    setFullscreenEntryDisplay,
    setFullscreenDisplay,
    setFullscreenVideoFocus,
    setFullscreenSwapped,
    moveImage,
    moveImageVertical,
    jumpImageBoundary,
    goPackage: (step) => {
      if (mode !== "image" || !imageConvertPreviewMode) {
        goPackage(step);
        return;
      }

      const scopeNodeIds = resolveImageConvertScopeNodeIds({
        mode,
        manageMode,
        activeSelectionScope,
        sidebarCheckedNodeIds,
        selectedSidebarNodeId,
        sidebarNodeById,
      });
      if (scopeNodeIds.length === 0) {
        goPackage(step);
        return;
      }

      const nextNodeId = resolveScopedImageConvertNavigationNodeId({
        scopeNodeIds,
        selectedSidebarNodeId,
        selectedPackageId,
        sidebarNodeById,
        step,
      });
      if (!nextNodeId || nextNodeId === selectedSidebarNodeId) {
        return;
      }

      const nextNode = sidebarNodeById.get(nextNodeId);
      setSelectedSidebarNodeId(nextNodeId);
      if (nextNode?.imageSourceId) {
        setSelectedPackageId(nextNode.imageSourceId);
      }
    },
    requestFullscreenAlign,
    autoPlayEnabled,
    applyAutoplayIntervalByIndex,
    applyPackageGrade,
    applyVideoGrade,
    requestManageOrganize: () => {
      if (!manageMode) {
        return;
      }
      requestManageOrganize();
    },
    onTriggerImageConvertShortcut: () => {
      if (mode !== "image" || fullscreenActive) {
        return;
      }

      const scopeNodeIds = resolveImageConvertScopeNodeIds({
        mode,
        manageMode,
        activeSelectionScope,
        sidebarCheckedNodeIds,
        selectedSidebarNodeId,
        sidebarNodeById,
      });
      if (scopeNodeIds.length === 0) {
        return;
      }

      if (manageMode) {
        window.dispatchEvent(new CustomEvent("mpx:image-convert-toggle-panel"));
        return;
      }

      const targetNodeId = scopeNodeIds[0];
      const targetNode = sidebarNodeById.get(targetNodeId);
      setSelectedSidebarNodeId(targetNodeId);
      if (targetNode?.imageSourceId) {
        setSelectedPackageId(targetNode.imageSourceId);
      }
      clearSidebarSelections();
      checkSidebarNode(targetNodeId);
      setManageMode(true);
      window.dispatchEvent(new CustomEvent("mpx:image-convert-open-panel"));
    },
    addFocusedVideoToPlaylist: () => {
      if (mode !== "video" || !selectedVideoId) {
        return;
      }
      setPlaylistIds((previous) =>
        previous.includes(selectedVideoId)
          ? previous
          : [...previous, selectedVideoId],
      );
    },
    removeFocusedVideoFromPlaylist: () => {
      if (mode !== "video" || !selectedVideoId) {
        return;
      }
      setPlaylistIds((previous) =>
        previous.filter((id) => id !== selectedVideoId),
      );
    },
    setVideoPlaying,
    goPlaylist: (step) => {
      goPlaylist(step, Array.from(rootScopedVideoIds));
    },
    seekVideoBy: (deltaSeconds) => {
      setVideoTime((value) => {
        const nextValue = value + deltaSeconds;
        if (focusedVideoDurationSec <= 0) {
          return Math.max(0, nextValue);
        }
        return clamp(nextValue, 0, focusedVideoDurationSec);
      });
    },
    adjustVideoRate,
    adjustVideoVolume,
    toggleVideoMute: () => {
      setVideoMuted((value) => !value);
    },
    saveVideoCover: onSaveVideoCoverByShortcut,
    toggleVideoSubtitle: onToggleSubtitleByShortcut,
    adjustVideoSubtitleOffset: (delta) => {
      const nextOffset = clamp(appSettings.subtitleOffsetY + delta, -400, 400);
      updateSettings({ subtitleOffsetY: nextOffset });
    },
    cycleVideoFitMode,
    onImageWheelNavigatePage: handleImageWheelLikePageNavigation,
    onImageCtrlWheelNavigateSidebar: handleImageCtrlWheelLikeSidebarNavigation,
    updateSettings,
  });

  useAppEffects({
    appBodyRef,
    gridElement,
    vectorPanelContentRef,
    wasFullscreenRef,
    lastExpandedSidebarRatioRef,
    mode,
    showNamesOnly,
    sidebarRatio,
    sidebarCollapseRatio: SIDEBAR_COLLAPSE_RATIO,
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
  });

  usePersistedAppSettings({
    settings: appSettings,
    repository: mediaRepository,
  });

  usePersistedSessionCursor({
    repository: mediaRepository,
    mode,
    importBusy,
    fullscreenActive,
    selectedPackageId,
    focusByPackage,
    pagedPageSize,
    packageByIdEffective,
    setSelectedPackageId,
    setImageFocusActive,
    setFocusByPackage,
    setPageByPackage,
    selectedVideoId,
    videoTime,
    rootScopedVideoIds,
    selectVideoFromBrowser,
    setVideoTime,
    selectedAudioId,
    rootScopedAudioIds,
    setSelectedAudioId,
  });

  usePreferenceMetricsBuffer({
    repository: mediaRepository,
    mode,
    fullscreenActive,
    focusedImageRef: focusedRef,
    packageById: packageByIdEffective,
    videos: videosForSidebar,
    selectedVideoId,
    videoPlaying,
    videoTime,
  });
}
