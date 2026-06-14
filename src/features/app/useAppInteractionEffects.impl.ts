import { useCallback, useEffect, useRef } from "react";

import { useAppShortcutBindings } from "./useAppShortcutBindings";
import { useAppEffects } from "./useAppEffects";
import { usePersistedAppSettings } from "./usePersistedAppSettings";
import { usePersistedSessionCursor } from "./usePersistedSessionCursor";
import { usePreferenceMetricsBuffer } from "./usePreferenceMetricsBuffer";
import { useAppInteractionLayer } from "./useAppInteractionLayer";
import { useFullscreenDeleteMarks } from "./useFullscreenDeleteMarks";
import { useFullscreenImageSoftRemove } from "./useFullscreenImageSoftRemove";
import { dispatchFullscreenDeleteFeedback } from "../../utils/fullscreenDeleteFeedback";
import {
  resolveImageConvertScopeNodeIds,
  resolveScopedImageConvertNavigationNodeId,
} from "./workspaceImageManageUtils";
import { resolveAncestorNodeIds } from "../../components/sidebarPanelTreeUtils";
import { mapMediaLocatorToDto } from "../backend/mediaLocator";
import { clamp } from "../../utils/ui";
import type { FocusedImageRef, ImageItem } from "../../types";
import type { AppSettingsStoreSnapshot } from "./useAppSettingsStore";
import type { AppSessionStateResult } from "./useAppSessionState";
import type { RepositoryBootstrapDataResult } from "./useRepositoryBootstrapData";
import type { MediaStateResult } from "../media/useMediaState";
import type { AppReadAndNavigationResult } from "./useAppReadAndNavigation";
import type { FullscreenPlaybackBindingsResult } from "./useFullscreenPlaybackBindings";
import type { MetadataWriteBindingsResult } from "./useMetadataWriteBindings";

const SIDEBAR_COLLAPSE_RATIO = 0.03;
const CLIPBOARD_MEDIA_RESOLVE_TIMEOUT_MS = 8_000;

function canWriteImageToClipboard(): boolean {
  const windowApi =
    typeof window !== "undefined" ? window.mediaPlayerWindow : undefined;
  return typeof windowApi?.writeClipboardPng === "function";
}

async function canvasToPngBytes(
  canvas: HTMLCanvasElement,
): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(null);
        return;
      }

      void blob
        .arrayBuffer()
        .then((arrayBuffer) => resolve(new Uint8Array(arrayBuffer)))
        .catch(() => resolve(null));
    }, "image/png");
  });
}

async function writePngBytesToClipboard(
  pngBytes: Uint8Array,
): Promise<boolean> {
  if (!canWriteImageToClipboard()) {
    return false;
  }

  if (pngBytes.byteLength === 0) {
    return false;
  }

  const windowApi =
    typeof window !== "undefined" ? window.mediaPlayerWindow : undefined;
  if (!windowApi?.writeClipboardPng) {
    return false;
  }

  try {
    return await windowApi.writeClipboardPng(pngBytes);
  } catch {
    return false;
  }
}

async function copyImageElementToClipboard(
  imageElement: HTMLImageElement,
): Promise<boolean> {
  const width = Math.max(
    1,
    imageElement.naturalWidth || imageElement.width || 1,
  );
  const height = Math.max(
    1,
    imageElement.naturalHeight || imageElement.height || 1,
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return false;
  }

  try {
    context.drawImage(imageElement, 0, 0, width, height);
    const pngBytes = await canvasToPngBytes(canvas);
    if (!pngBytes) {
      return false;
    }
    return writePngBytesToClipboard(pngBytes);
  } catch {
    return false;
  }
}

async function copyVideoFrameToClipboard(
  videoElement: HTMLVideoElement,
): Promise<boolean> {
  const width = Math.max(1, Math.round(videoElement.videoWidth || 0));
  const height = Math.max(1, Math.round(videoElement.videoHeight || 0));
  if (width <= 1 || height <= 1) {
    return false;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return false;
  }

  try {
    context.drawImage(videoElement, 0, 0, width, height);
    const pngBytes = await canvasToPngBytes(canvas);
    if (!pngBytes) {
      return false;
    }
    return writePngBytesToClipboard(pngBytes);
  } catch {
    return false;
  }
}

function resolveFullscreenImageElement(): HTMLImageElement | null {
  const previewImage = document.querySelector(
    ".fullscreen-image-compare-layer.is-preview",
  );
  if (previewImage instanceof HTMLImageElement) {
    return previewImage;
  }

  const fullscreenImage = document.querySelector(
    ".fullscreen-media-image-element",
  );
  if (fullscreenImage instanceof HTMLImageElement) {
    return fullscreenImage;
  }

  const compareBaseImage = document.querySelector(
    ".fullscreen-image-compare-layer",
  );
  return compareBaseImage instanceof HTMLImageElement ? compareBaseImage : null;
}

function resolveMainFocusedImageElement(): HTMLImageElement | null {
  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) {
    const focusedCard = activeElement.closest(".thumb-card-main");
    if (focusedCard instanceof HTMLElement) {
      const cardImage = focusedCard.querySelector(".thumb-media-image");
      if (cardImage instanceof HTMLImageElement) {
        return cardImage;
      }
    }
  }

  const focusedGridImage = document.querySelector(
    ".thumb-card.is-focused .thumb-media-image",
  );
  return focusedGridImage instanceof HTMLImageElement ? focusedGridImage : null;
}

function resolveMainFocusedImageRefFromDom(): FocusedImageRef | null {
  const activeElement = document.activeElement;
  if (!(activeElement instanceof HTMLElement)) {
    return null;
  }

  const cardElement = activeElement.closest(".thumb-card");
  if (!(cardElement instanceof HTMLElement)) {
    return null;
  }

  const packageId = cardElement.dataset.managePackageId;
  const imageIndexRaw = cardElement.dataset.manageImageIndex;
  if (!packageId || !imageIndexRaw) {
    return null;
  }

  const imageIndex = Number(imageIndexRaw);
  if (!Number.isInteger(imageIndex) || imageIndex < 0) {
    return null;
  }

  return {
    packageId,
    imageIndex,
  };
}

function resolveImageItemByRef(
  focusedRef: FocusedImageRef | null,
  packageById: Map<string, { images: ImageItem[] }>,
): ImageItem | null {
  if (!focusedRef) {
    return null;
  }

  return (
    packageById.get(focusedRef.packageId)?.images[focusedRef.imageIndex] ?? null
  );
}

async function loadImageElementFromUrl(
  url: string,
): Promise<HTMLImageElement | null> {
  if (url.trim().length === 0) {
    return null;
  }

  return await new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      resolve(null);
    };
    image.src = url;
  });
}

async function copyOriginalImageToClipboard(
  imageItem: ImageItem,
  mediaRepository: RepositoryBootstrapDataResult["mediaRepository"],
): Promise<boolean> {
  try {
    const response = await mediaRepository.resolveMediaResource(
      {
        locator: mapMediaLocatorToDto(imageItem.mediaLocator),
        preferred_variant: "original",
      },
      {
        timeoutMs: CLIPBOARD_MEDIA_RESOLVE_TIMEOUT_MS,
      },
    );

    const imageElement = await loadImageElementFromUrl(response.resource_url);
    if (!imageElement) {
      return false;
    }

    return await copyImageElementToClipboard(imageElement);
  } catch {
    return false;
  }
}

function resolveVideoElement(
  preferFullscreen: boolean,
): HTMLVideoElement | null {
  const selectors = preferFullscreen
    ? [".fullscreen-media-video-element", ".video-screen-media"]
    : [".video-screen-media", ".fullscreen-media-video-element"];

  for (const selector of selectors) {
    const target = document.querySelector(selector);
    if (target instanceof HTMLVideoElement) {
      return target;
    }
  }

  return null;
}

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
  onFullscreenDirectDelete: (pane: "image" | "video") => void;
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
  onFullscreenDirectDelete,
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
    imageCollapsedFolderNodeIds,
    videoCollapsedFolderNodeIds,
    musicCollapsedFolderNodeIds,
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
    setMusicTimeSec,
    setFullscreenEntryDisplay,
    imageSidebarLocateRequestNonce,
    videoSidebarLocateRequestNonce,
    imageConvertPreviewMode,
    setManageMode,
    manageMode,
    metadataManageMode,
    adReviewPanelOpen,
    adReviewFocusTaskId,
    helpOverlayOpen,
    themeParameterPanelOpen,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    setManageOperationHint,
  } = sessionState;

  const {
    selectedVideoId,
    metadataTab,
    videoDurationById,
    videoPlaying,
    videoTime,
    setVideoPlaying,
    setVideoTime,
    setMetadataTab,
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
    imageTreeForSidebar,
    videoTreeForSidebar,
    audioTreeForSidebar,
    sidebarNodeById,
    sidebarCheckedNodeIds,
    activeSelectionScope,
    clearAllSelections,
    clearSidebarSelections,
    checkSidebarNode,
    imageSourceNodeIdMap,
    normalImageSourceNodeIdMap,
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
    replaceImageCheckedIds,
    markImageRemoved,
    clearImageRemovalMarks,
    removedImageIds,
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

  const escapeFromVideoPlaybackToNodeBrowse = () => {
    if (mode !== "video" || fullscreenActive) {
      return false;
    }

    const currentNode = selectedSidebarNodeId
      ? (sidebarNodeById.get(selectedSidebarNodeId) ?? null)
      : null;

    if (
      currentNode &&
      currentNode.kind === "folder" &&
      currentNode.children.some((child) => Boolean(child.videoId))
    ) {
      return false;
    }

    const playbackNodeId =
      (currentNode && currentNode.videoId ? currentNode.id : null) ??
      videoNodeIdMap.get(selectedVideoId) ??
      null;
    if (!playbackNodeId) {
      return false;
    }

    const ancestorNodeIds = resolveAncestorNodeIds(
      videoTreeForSidebar,
      playbackNodeId,
    );
    if (ancestorNodeIds.length === 0) {
      return false;
    }

    let targetNodeId: string | null = null;
    for (let index = ancestorNodeIds.length - 1; index >= 0; index -= 1) {
      const candidateNodeId = ancestorNodeIds[index];
      const candidateNode = candidateNodeId
        ? (sidebarNodeById.get(candidateNodeId) ?? null)
        : null;
      if (
        candidateNode &&
        candidateNode.kind === "folder" &&
        candidateNode.children.some((child) => Boolean(child.videoId))
      ) {
        targetNodeId = candidateNode.id;
        break;
      }
    }

    if (!targetNodeId) {
      targetNodeId = ancestorNodeIds[ancestorNodeIds.length - 1] ?? null;
    }
    if (!targetNodeId) {
      return false;
    }

    setSelectedSidebarNodeId(targetNodeId);
    setVideoPlaying(false);
    requestAnimationFrame(() => ensureSidebarNodeVisible(targetNodeId));
    return true;
  };

  useAppInteractionLayer({
    appSettings,
    sessionState,
    mediaState,
    readNavigationState,
    adReviewDeletePending,
    setFullscreenActiveWithAutoStop,
  });

  const fullscreenDeleteImageNodeId =
    normalImageSourceNodeIdMap.get(selectedPackageId) ??
    imageSourceNodeIdMap.get(selectedPackageId) ??
    null;
  const fullscreenDeleteVideoNodeId =
    videoNodeIdMap.get(selectedVideoId) ?? null;

  const { toggleFullscreenDeleteMark } = useFullscreenDeleteMarks({
    fullscreenActive,
    deleteConfirmOpen,
    imageDeleteTargetNodeId: fullscreenDeleteImageNodeId,
    videoDeleteTargetNodeId: fullscreenDeleteVideoNodeId,
    clearAllSelections,
    checkSidebarNode,
    setDeleteConfirmOpen,
    setManageOperationHint,
    onFullscreenDirectDelete,
  });

  // 全屏 Backspace 单张图软删：退出全屏后把标记图灌入图片勾选并弹出永久删除确认面板
  useFullscreenImageSoftRemove({
    fullscreenActive,
    deleteConfirmOpen,
    getRemovedImageIds: removedImageIds,
    clearImageRemovalMarks,
    clearAllSelections,
    replaceImageCheckedIds,
    setDeleteConfirmOpen,
    setManageOperationHint,
  });

  const handleFullscreenBackspaceRemove = useCallback(() => {
    const focusedImage = resolveImageItemByRef(focusedRef, packageByIdEffective);
    if (!focusedImage) {
      return;
    }
    markImageRemoved(focusedImage.id);
    dispatchFullscreenDeleteFeedback({ marked: true, pane: "image" });
    moveImage(1);
  }, [focusedRef, markImageRemoved, moveImage, packageByIdEffective]);

  useAppShortcutBindings({
    shortcuts,
    featureTagPickerOpen,
    adReviewDeletePending,
    mode,
    fullscreenImageNavMaxPerSecond: appSettings.fullscreenImageNavMaxPerSecond,
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
    onEscapeFromVideoPlaybackToNodeBrowse: escapeFromVideoPlaybackToNodeBrowse,
    setFullscreenActiveWithAutoStop,
    setFullscreenEntryDisplay,
    setFullscreenDisplay,
    setFullscreenVideoFocus,
    setFullscreenSwapped,
    onToggleFullscreenDeleteMark: toggleFullscreenDeleteMark,
    onFullscreenBackspaceRemove: handleFullscreenBackspaceRemove,
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
      const sidebarQueueIds = Array.from(rootScopedVideoIds);
      if (videoQueueSource === "sidebar") {
        goPlaylist(step, sidebarQueueIds);
        return;
      }
      goPlaylist(step);
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
    onCopyFocusedImageToClipboard: () => {
      if (!canWriteImageToClipboard()) {
        return false;
      }

      if (!fullscreenActive && mode === "image") {
        const focusedImageRef =
          resolveMainFocusedImageRefFromDom() ?? focusedRef;
        const focusedImage = resolveImageItemByRef(
          focusedImageRef,
          packageByIdEffective,
        );
        if (!focusedImage) {
          return false;
        }

        void copyOriginalImageToClipboard(focusedImage, mediaRepository);
        return true;
      }

      const imageElement = fullscreenActive
        ? resolveFullscreenImageElement()
        : resolveMainFocusedImageElement();
      if (!imageElement) {
        return false;
      }

      void copyImageElementToClipboard(imageElement);
      return true;
    },
    onCopyFocusedVideoFrameToClipboard: () => {
      if (!canWriteImageToClipboard()) {
        return false;
      }

      const videoElement = resolveVideoElement(fullscreenActive);
      if (!videoElement) {
        return false;
      }

      void copyVideoFrameToClipboard(videoElement);
      return true;
    },
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
    imageSidebarLocateRequestNonce,
    videoSidebarLocateRequestNonce,
    selectedAudioId,
    videoNodeIdMap,
    audioNodeIdMap,
    sidebarTreeNodes:
      mode === "image"
        ? imageTreeForSidebar
        : mode === "video"
          ? videoTreeForSidebar
          : audioTreeForSidebar,
    imageCollapsedFolderNodeIds,
    videoCollapsedFolderNodeIds,
    musicCollapsedFolderNodeIds,
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
    layoutGapScaleCoeff: appSettings.layoutGapScaleCoeff,
    paneInnerGapScaleCoeff: appSettings.paneInnerGapScaleCoeff,
    paneStackGapScaleCoeff: appSettings.paneStackGapScaleCoeff,
    sidebarInnerGapScaleCoeff: appSettings.sidebarInnerGapScaleCoeff,
    thumbnailGapScaleCoeff: appSettings.thumbnailGapScaleCoeff,
    buttonGroupInsetScaleCoeff: appSettings.buttonGroupInsetScaleCoeff,
    paneHeaderHeightScaleCoeff: appSettings.paneHeaderHeightScaleCoeff,
    paneFooterHeightScaleCoeff: appSettings.paneFooterHeightScaleCoeff,
    radiusCascadeScaleCoeff: appSettings.radiusCascadeScaleCoeff,
    radiusValueScaleCoeff: appSettings.radiusValueScaleCoeff,
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
    metadataTab,
    setMetadataTab,
    selectedAudioId,
    rootScopedAudioIds,
    setSelectedAudioId,
    setMusicTimeSec,
    setSelectedSidebarNodeId,
    imageSourceNodeIdMap,
    videoNodeIdMap,
    audioNodeIdMap,
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
