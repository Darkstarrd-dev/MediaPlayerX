import { useMemo } from "react";

import type { AppSettingsStoreSnapshot } from "./useAppSettingsStore";
import type { AppSessionStateResult } from "./useAppSessionState";
import type { RepositoryBootstrapDataResult } from "./useRepositoryBootstrapData";
import type { MediaStateResult } from "../media/useMediaState";
import { useFeatureSearch } from "../search/useFeatureSearch";
import { useReadOnlyDataAccess } from "../backend";
import {
  computeThumbnailGridLayout,
  resolveThumbnailCardChromePx,
} from "../layout/thumbnailLayout";
import {
  resolveRuntimeSpacing,
  resolveRuntimeViewportWidth,
} from "../layout/runtimeSpacing";
import type { FocusedImageRef } from "../../types";
import { clamp } from "../../utils/ui";

const EMPTY_FEATURE_TAGS: string[] = [];

interface UseAppReadStateParams {
  appSettings: AppSettingsStoreSnapshot;
  sessionState: AppSessionStateResult;
  repositoryBootstrap: RepositoryBootstrapDataResult;
  mediaState: Pick<MediaStateResult, "fullscreenActive" | "fullscreenDisplay">;
  importBusy: boolean;
}

export function useAppReadState({
  appSettings,
  sessionState,
  repositoryBootstrap,
  mediaState,
  importBusy,
}: UseAppReadStateParams) {
  const {
    mode,
    vectorMode,
    thumbnailScale,
    thumbnailGap,
    layoutGapScaleCoeff,
    paneInnerGapScaleCoeff,
    paneStackGapScaleCoeff,
    sidebarInnerGapScaleCoeff,
    thumbnailGapScaleCoeff,
    buttonGroupInsetScaleCoeff,
    thumbnailWidth,
    showNamesOnly,
  } = appSettings;

  const resolvedThumbnailGapPx = useMemo(() => {
    if (typeof window === "undefined") {
      return Math.max(0, Math.round(thumbnailGap));
    }
    return resolveRuntimeSpacing({
      viewportWidth: resolveRuntimeViewportWidth(),
      layoutGapScaleCoeff,
      paneInnerGapScaleCoeff,
      paneStackGapScaleCoeff,
      sidebarInnerGapScaleCoeff,
      thumbnailGapScaleCoeff,
      buttonGroupInsetScaleCoeff,
    }).thumbnailGapPx;
  }, [
    buttonGroupInsetScaleCoeff,
    layoutGapScaleCoeff,
    paneInnerGapScaleCoeff,
    paneStackGapScaleCoeff,
    sidebarInnerGapScaleCoeff,
    thumbnailGap,
    thumbnailGapScaleCoeff,
  ]);

  const { mediaRepository, imageSources, bootstrapVideos, bootstrapAudios } =
    repositoryBootstrap;

  const { fullscreenActive, fullscreenDisplay } = mediaState;

  const {
    selectedPackageId,
    imageFocusActive,
    focusByPackage,
    pageByPackage,
    vectorSearchResults,
    vectorFocusIndex,
    vectorPage,
    gradeByPackage,
    manageMode,
    metadataManageMode,
    gridSize,
  } = sessionState;

  const {
    searchPanelMode,
    setSearchPanelMode,
    searchPanelCollapsed,
    setSearchPanelCollapsed,
    featureSearchActive,
    quickFeatureSearchActive,
    quickFeatureWorkTitleQuery,
    quickFeatureSeriesIdQuery,
    quickFeatureCircleQuery,
    quickFeatureAuthorQuery,
    quickFeatureTags,
    applyQuickFeatureSearch,
    clearQuickFeatureSearch,
    featureNameQuery,
    setFeatureNameQuery,
    featureWorkTitleQuery,
    setFeatureWorkTitleQuery,
    featureCircleQuery,
    setFeatureCircleQuery,
    featureAuthorQuery,
    setFeatureAuthorQuery,
    featureTags,
    setFeatureTags,
    featureGradeFilter,
    setFeatureGradeFilter,
    featureTagPickerOpen,
    setFeatureTagPickerOpen,
    featureCircleOptions,
    featureAuthorOptions,
    featureTagOptions,
  } = useFeatureSearch({
    mode,
    vectorMode,
    imageSources,
    videos: bootstrapVideos,
    audios: bootstrapAudios,
  });

  const quickFeatureSearchEnabled = quickFeatureSearchActive;
  const featureSearchActiveEffective =
    featureSearchActive || quickFeatureSearchEnabled;
  const featureNameQueryEffective = featureSearchActive ? featureNameQuery : "";
  const featureWorkTitleQueryEffective = featureSearchActive
    ? featureWorkTitleQuery
    : quickFeatureSearchEnabled
      ? quickFeatureWorkTitleQuery
      : "";
  const featureSeriesIdQueryEffective = quickFeatureSearchEnabled
    ? quickFeatureSeriesIdQuery
    : "";
  const featureCircleQueryEffective = featureSearchActive
    ? featureCircleQuery
    : quickFeatureSearchEnabled
      ? quickFeatureCircleQuery
      : "";
  const featureAuthorQueryEffective = featureSearchActive
    ? featureAuthorQuery
    : quickFeatureSearchEnabled
      ? quickFeatureAuthorQuery
      : "";
  const featureTagsEffective = featureSearchActive
    ? featureTags
    : quickFeatureSearchEnabled
      ? quickFeatureTags
      : EMPTY_FEATURE_TAGS;
  const featureGradeFilterEffective = featureSearchActive
    ? featureGradeFilter
    : null;

  const vectorResultsActive =
    mode === "image" &&
    vectorMode &&
    searchPanelMode === "vector" &&
    vectorSearchResults.length > 0;
  const searchResultsMode = vectorResultsActive || featureSearchActiveEffective;
  const searchResultsReadOnly = vectorResultsActive;

  const backendPageSize = useMemo(
    () =>
      computeThumbnailGridLayout({
        gridWidth: gridSize.width,
        gridHeight: gridSize.height,
        thumbnailWidth,
        thumbnailGap: resolvedThumbnailGapPx,
        zoomLevel: thumbnailScale,
        cardChrome: resolveThumbnailCardChromePx(),
      }).pageSize,
    [
      gridSize.height,
      gridSize.width,
      resolvedThumbnailGapPx,
      thumbnailScale,
      thumbnailWidth,
    ],
  );

  const backendMetadataRequestRef = useMemo<FocusedImageRef | null>(() => {
    if (mode !== "image") {
      return null;
    }

    if (vectorResultsActive) {
      const current =
        vectorSearchResults[
          clamp(
            vectorFocusIndex,
            0,
            Math.max(0, vectorSearchResults.length - 1),
          )
        ];
      return current
        ? {
            packageId: current.packageId,
            imageIndex: current.imageIndex,
          }
        : null;
    }

    if (!imageFocusActive || !selectedPackageId) {
      return null;
    }

    return {
      packageId: selectedPackageId,
      imageIndex: Math.max(0, focusByPackage[selectedPackageId] ?? 0),
    };
  }, [
    focusByPackage,
    imageFocusActive,
    mode,
    selectedPackageId,
    vectorFocusIndex,
    vectorResultsActive,
    vectorSearchResults,
  ]);

  const backendRead = useReadOnlyDataAccess({
    repository: mediaRepository,
    mode,
    includeHidden: manageMode && mode === "image",
    importBusy,
    enableImageSidebarRead:
      mode === "video" &&
      fullscreenActive &&
      (fullscreenDisplay === "dual" || fullscreenDisplay === "image-only"),
    suspendLibraryChangedRefresh: metadataManageMode,
    selectedSourceId: selectedPackageId || null,
    pageIndex: showNamesOnly
      ? 0
      : vectorResultsActive
        ? vectorPage
        : (pageByPackage[selectedPackageId] ?? 0),
    pageSize: Math.max(1, backendPageSize),
    showNamesOnly,
    focusedRef: backendMetadataRequestRef,
    vectorResultsActive,
    featureNameQuery: featureNameQueryEffective,
    featureWorkTitleQuery: featureWorkTitleQueryEffective,
    featureSeriesIdQuery: featureSeriesIdQueryEffective,
    featureCircleQuery: featureCircleQueryEffective,
    featureAuthorQuery: featureAuthorQueryEffective,
    featureTags: featureTagsEffective,
    featureGradeFilter: featureGradeFilterEffective,
    gradeByPackage,
  });

  return {
    searchPanelMode,
    setSearchPanelMode,
    searchPanelCollapsed,
    setSearchPanelCollapsed,
    featureSearchActive: featureSearchActiveEffective,
    quickFeatureSearchActive,
    applyQuickFeatureSearch,
    clearQuickFeatureSearch,
    featureNameQuery,
    setFeatureNameQuery,
    featureNameQueryEffective,
    featureWorkTitleQuery,
    setFeatureWorkTitleQuery,
    featureWorkTitleQueryEffective,
    featureSeriesIdQueryEffective,
    featureCircleQuery,
    setFeatureCircleQuery,
    featureCircleQueryEffective,
    featureAuthorQuery,
    setFeatureAuthorQuery,
    featureAuthorQueryEffective,
    featureTags,
    setFeatureTags,
    featureTagsEffective,
    featureGradeFilter,
    setFeatureGradeFilter,
    featureGradeFilterEffective,
    featureTagPickerOpen,
    setFeatureTagPickerOpen,
    featureCircleOptions,
    featureAuthorOptions,
    featureTagOptions,
    vectorResultsActive,
    searchResultsMode,
    searchResultsReadOnly,
    backendRead,
  };
}

export type AppReadStateResult = ReturnType<typeof useAppReadState>;
