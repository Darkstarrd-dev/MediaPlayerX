import { useCallback } from "react";

import { useAppDisplayResources } from "./useAppDisplayResources";
import { useAppInteractionEffects } from "./useAppInteractionEffects";
import { useAppManageBindings } from "./useAppManageBindings";
import { useSearchAndVectorActions } from "./useSearchAndVectorActions";
import type { AppReadAndNavigationResult } from "./useAppReadAndNavigation";
import type { AppSettingsStoreSnapshot } from "./useAppSettingsStore";
import type { AppSessionStateResult } from "./useAppSessionState";
import { useFullscreenPlaybackBindings } from "./useFullscreenPlaybackBindings";
import type { RepositoryBootstrapDataResult } from "./useRepositoryBootstrapData";
import type { MediaStateResult } from "../media/useMediaState";
import type { UiBenchSettings } from "../perf/benchSettings";

const AUTO_PLAY_PRESETS = [1, 2, 3, 5, 8];

interface UseAppDisplayAndEffectsParams {
  appSettings: AppSettingsStoreSnapshot;
  benchSettings: UiBenchSettings;
  mediaRepository: RepositoryBootstrapDataResult["mediaRepository"];
  importBusy: boolean;
  sessionState: AppSessionStateResult;
  mediaState: MediaStateResult;
  readNavigationState: AppReadAndNavigationResult;
}

export function useAppDisplayAndEffects({
  appSettings,
  benchSettings,
  mediaRepository,
  importBusy,
  sessionState,
  mediaState,
  readNavigationState,
}: UseAppDisplayAndEffectsParams) {
  const { mode, autoPlayEnabled, vectorThreshold, updateSettings } =
    appSettings;

  const {
    selectedSidebarNodeId,
    setSelectedPackageId,
    setSelectedSidebarNodeId,
    setVectorSearchResults,
    setVectorFocusIndex,
    setVectorPage,
  } = sessionState;

  const {
    fullscreenActive,
    fullscreenDisplay,
    fullscreenVideoFocus,
    setFullscreenActive,
  } = mediaState;

  const {
    setSearchPanelMode,
    featureSearchActive,
    quickFeatureSearchActive,
    clearQuickFeatureSearch,
    vectorResultsActive,
    packageByIdEffective,
    allScopedRefs,
    normalImageSourceNodeIdMap,
    focusedRef,
    setImageFocus,
  } = readNavigationState;

  const manageBindings = useAppManageBindings({
    appSettings,
    mediaRepository,
    sessionState,
    mediaState,
    readNavigationState,
  });

  const displayResources = useAppDisplayResources({
    appSettings,
    benchSettings,
    mediaRepository,
    importBusy,
    sessionState,
    mediaState,
    readNavigationState,
    manageBindings,
  });

  const {
    videoShortcutActive: fullscreenVideoShortcutActive,
    fullscreenAlignRequest,
    applyAutoplayIntervalByIndex,
    requestFullscreenAlign,
    setFullscreenActiveWithAutoStop,
  } = useFullscreenPlaybackBindings({
    fullscreenActive,
    fullscreenDisplay,
    fullscreenVideoFocus,
    autoPlayEnabled,
    updateSettings,
    setFullscreenActive,
    autoPlayPresets: AUTO_PLAY_PRESETS,
  });

  const videoShortcutActive = mode === "video" || fullscreenVideoShortcutActive;

  const { runVectorSearch, goToFromSearchMode } = useSearchAndVectorActions({
    mode,
    focusedRef,
    allScopedRefs,
    packageById: packageByIdEffective,
    vectorThreshold,
    vectorResultsActive,
    featureSearchActive,
    quickFeatureSearchActive,
    selectedSidebarNodeId,
    normalImageSourceNodeIdMap,
    setSelectedPackageId,
    setSelectedSidebarNodeId,
    setVectorSearchResults,
    setVectorFocusIndex,
    setVectorPage,
    setSearchPanelMode,
    setImageFocus,
    clearQuickFeatureSearch,
    updateSettings,
  });

  // 全屏连按三次 Del 直接删除当前项：删除前先切到 sidebar 顺序的下一项（末尾回到首项），
  // 再调用永久删除并刷新库；图包与视频均生效（问题4）。
  const handleFullscreenDirectDelete = useCallback(
    (pane: "image" | "video") => {
      const { backendRead } = readNavigationState;
      const refreshLibrary = () => {
        backendRead.retryLibrary();
        backendRead.retrySidebar();
        backendRead.retryPage();
        backendRead.retryMetadata();
      };

      if (pane === "video") {
        const videoId = mediaState.selectedVideoId;
        const nodeId = videoId
          ? (readNavigationState.videoNodeIdMap.get(videoId) ?? null)
          : null;
        if (!videoId || !nodeId) {
          return;
        }
        const orderedVideoIds = Array.from(
          readNavigationState.rootScopedVideoIds,
        );
        const currentIndex = orderedVideoIds.indexOf(videoId);
        const nextVideoId =
          currentIndex >= 0
            ? (orderedVideoIds[currentIndex + 1] ??
              orderedVideoIds.find((id) => id !== videoId) ??
              null)
            : null;
        if (nextVideoId) {
          mediaState.selectVideoFromBrowser(nextVideoId);
        } else {
          setFullscreenActiveWithAutoStop(false);
        }
        void manageBindings.backendWrite
          .deleteSidebarNodes([nodeId], { deleteFiles: true })
          .finally(refreshLibrary);
        return;
      }

      const packageId = sessionState.selectedPackageId;
      const nodeId = packageId
        ? (readNavigationState.normalImageSourceNodeIdMap.get(packageId) ??
          readNavigationState.imageSourceNodeIdMap.get(packageId) ??
          null)
        : null;
      if (!packageId || !nodeId) {
        return;
      }
      const orderedPackages = readNavigationState.orderedRootScopedPackages;
      const currentIndex = orderedPackages.findIndex(
        (pkg) => pkg.id === packageId,
      );
      const targetPackage =
        currentIndex >= 0
          ? (orderedPackages[currentIndex + 1] ??
            orderedPackages.find((pkg) => pkg.id !== packageId) ??
            null)
          : null;
      if (targetPackage) {
        setImageFocus(targetPackage.id, 0);
      } else {
        setFullscreenActiveWithAutoStop(false);
      }
      void manageBindings.backendWrite
        .deleteSidebarNodes([nodeId], { deleteFiles: true })
        .finally(refreshLibrary);
    },
    [
      manageBindings.backendWrite,
      mediaState,
      readNavigationState,
      sessionState,
      setFullscreenActiveWithAutoStop,
      setImageFocus,
    ],
  );

  useAppInteractionEffects({
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
    applyPackageGrade: displayResources.metadataWriteBindings.applyPackageGrade,
    applyVideoGrade: (grade) => {
      displayResources.metadataWriteBindings.applyVideoMetadata({ grade });
    },
    requestManageOrganize: manageBindings.requestManageGroup,
    onToggleSubtitleByShortcut: () => {
      displayResources.setSubtitleVisible((value) => !value);
    },
    onSaveVideoCoverByShortcut: () => {
      if (!mediaState.selectedVideoId) {
        return;
      }
      void manageBindings.backendWrite.saveVideoCover(
        mediaState.selectedVideoId,
        mediaState.videoTime,
        displayResources.focusedVideoCoverColor,
      );
    },
    onFullscreenDirectDelete: handleFullscreenDirectDelete,
    adReviewDeletePending: manageBindings.manageAdReview.deletePending,
  });

  return {
    ...manageBindings,
    ...displayResources,
    videoShortcutActive,
    fullscreenAlignRequest,
    applyAutoplayIntervalByIndex,
    requestFullscreenAlign,
    setFullscreenActiveWithAutoStop,
    runVectorSearch,
    goToFromSearchMode,
  };
}

export type AppDisplayAndEffectsResult = ReturnType<
  typeof useAppDisplayAndEffects
>;
