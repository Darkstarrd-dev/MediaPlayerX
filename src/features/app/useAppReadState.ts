import { useMemo } from 'react'

import type { AppSettingsStoreSnapshot } from './useAppSettingsStore'
import type { AppSessionStateResult } from './useAppSessionState'
import type { RepositoryBootstrapDataResult } from './useRepositoryBootstrapData'
import { useFeatureSearch } from '../search/useFeatureSearch'
import { useReadOnlyDataAccess } from '../backend'
import { computeThumbnailGridLayout } from '../layout/thumbnailLayout'
import type { FocusedImageRef } from '../../types'
import { clamp } from '../../utils/ui'

const EMPTY_FEATURE_TAGS: string[] = []

interface UseAppReadStateParams {
  appSettings: AppSettingsStoreSnapshot
  sessionState: AppSessionStateResult
  repositoryBootstrap: RepositoryBootstrapDataResult
}

export function useAppReadState({
  appSettings,
  sessionState,
  repositoryBootstrap,
}: UseAppReadStateParams) {
  const {
    mode,
    vectorMode,
    thumbnailScale,
    thumbnailGap,
    thumbnailWidth,
    showNamesOnly,
  } = appSettings

  const {
    mediaRepository,
    imageSources,
    bootstrapVideos,
  } = repositoryBootstrap

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
    gridSize,
  } = sessionState

  const {
    searchPanelMode,
    setSearchPanelMode,
    searchPanelCollapsed,
    setSearchPanelCollapsed,
    featureSearchActive,
    quickFeatureSearchActive,
    quickFeatureWorkTitleQuery,
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
  })

  const quickFeatureSearchEnabled = mode === 'image' && quickFeatureSearchActive
  const featureSearchActiveEffective = featureSearchActive || quickFeatureSearchEnabled
  const featureNameQueryEffective = featureSearchActive ? featureNameQuery : ''
  const featureWorkTitleQueryEffective = featureSearchActive
    ? featureWorkTitleQuery
    : quickFeatureSearchEnabled
      ? quickFeatureWorkTitleQuery
      : ''
  const featureCircleQueryEffective = featureSearchActive
    ? featureCircleQuery
    : quickFeatureSearchEnabled
      ? quickFeatureCircleQuery
      : ''
  const featureAuthorQueryEffective = featureSearchActive
    ? featureAuthorQuery
    : quickFeatureSearchEnabled
      ? quickFeatureAuthorQuery
      : ''
  const featureTagsEffective = featureSearchActive ? featureTags : quickFeatureSearchEnabled ? quickFeatureTags : EMPTY_FEATURE_TAGS
  const featureGradeFilterEffective = featureSearchActive ? featureGradeFilter : null

  const vectorResultsActive = mode === 'image' && vectorMode && searchPanelMode === 'vector' && vectorSearchResults.length > 0
  const searchResultsMode = vectorResultsActive || featureSearchActiveEffective
  const searchResultsReadOnly = vectorResultsActive

  const backendPageSize = useMemo(
    () =>
      computeThumbnailGridLayout({
        gridWidth: gridSize.width,
        gridHeight: gridSize.height,
        thumbnailWidth,
        thumbnailGap,
        zoomLevel: thumbnailScale,
      }).pageSize,
    [gridSize.height, gridSize.width, thumbnailGap, thumbnailScale, thumbnailWidth],
  )

  const backendMetadataRequestRef = useMemo<FocusedImageRef | null>(() => {
    if (mode !== 'image') {
      return null
    }

    if (vectorResultsActive) {
      const current = vectorSearchResults[clamp(vectorFocusIndex, 0, Math.max(0, vectorSearchResults.length - 1))]
      return current
        ? {
            packageId: current.packageId,
            imageIndex: current.imageIndex,
          }
        : null
    }

    if (!imageFocusActive || !selectedPackageId) {
      return null
    }

    return {
      packageId: selectedPackageId,
      imageIndex: Math.max(0, focusByPackage[selectedPackageId] ?? 0),
    }
  }, [focusByPackage, imageFocusActive, mode, selectedPackageId, vectorFocusIndex, vectorResultsActive, vectorSearchResults])

  const backendRead = useReadOnlyDataAccess({
    repository: mediaRepository,
    mode,
    includeHidden: manageMode && mode === 'image',
    selectedSourceId: selectedPackageId || null,
    pageIndex: showNamesOnly ? 0 : vectorResultsActive ? vectorPage : (pageByPackage[selectedPackageId] ?? 0),
    pageSize: Math.max(1, backendPageSize),
    showNamesOnly,
    focusedRef: backendMetadataRequestRef,
    vectorResultsActive,
    featureNameQuery: featureNameQueryEffective,
    featureWorkTitleQuery: featureWorkTitleQueryEffective,
    featureCircleQuery: featureCircleQueryEffective,
    featureAuthorQuery: featureAuthorQueryEffective,
    featureTags: featureTagsEffective,
    featureGradeFilter: featureGradeFilterEffective,
    gradeByPackage,
  })

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
    vectorResultsActive,
    searchResultsMode,
    searchResultsReadOnly,
    backendRead,
  }
}

export type AppReadStateResult = ReturnType<typeof useAppReadState>
