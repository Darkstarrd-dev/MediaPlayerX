import { useCallback, useMemo } from 'react'

import type { AppSettingsStoreSnapshot } from './useAppSettingsStore'
import type { AppSessionStateResult } from './useAppSessionState'
import type { RepositoryBootstrapDataResult } from './useRepositoryBootstrapData'
import type { ArchiveLoadStatusResult } from './useArchiveLoadStatus'
import type { MediaStateResult } from '../media/useMediaState'
import type { AppReadStateResult } from './useAppReadState'
import { useAppSidebarScopeState } from './useAppSidebarScopeState'
import { usePaneResizers } from '../layout/usePaneResizers'
import { computeThumbnailGridLayout } from '../layout/thumbnailLayout'
import { useImageBrowserViewModel } from './useImageBrowserViewModel'

const SIDEBAR_COLLAPSE_RATIO = 0.03

interface UseAppNavigationStateParams {
  appSettings: AppSettingsStoreSnapshot
  sessionState: AppSessionStateResult
  repositoryBootstrap: RepositoryBootstrapDataResult
  archiveLoadStatus: ArchiveLoadStatusResult
  mediaState: Pick<MediaStateResult, 'selectVideoFromBrowser' | 'fullscreenActive'>
  readState: AppReadStateResult
}

export function useAppNavigationState({
  appSettings,
  sessionState,
  repositoryBootstrap,
  archiveLoadStatus,
  mediaState,
  readState,
}: UseAppNavigationStateParams) {
  const {
    mode,
    sidebarRatio,
    sidebarMinWidth,
    metadataRatio,
    vectorPanelHeight,
    layoutLocked,
    thumbnailScale,
    thumbnailGap,
    thumbnailWidth,
    showNamesOnly,
    imageRootNodeId,
    videoRootNodeId,
    updateSettings,
  } = appSettings

  const {
    bootstrapLibrarySnapshot,
    bootstrapImagePackages,
    bootstrapImageDirectories,
    bootstrapVideos,
  } = repositoryBootstrap

  const {
    selectedPackageId,
    setSelectedPackageId,
    selectedSidebarNodeId,
    setSelectedSidebarNodeId,
    imageFocusActive,
    setImageFocusActive,
    focusByPackage,
    setFocusByPackage,
    pageByPackage,
    setPageByPackage,
    vectorSearchResults,
    vectorFocusIndex,
    setVectorFocusIndex,
    vectorPage,
    setVectorPage,
    gradeByPackage,
    setGradeByPackage,
    appBodyRef,
    workspaceRef,
    workspaceBodyRef,
    lastExpandedSidebarRatioRef,
    appBodyWidth,
    gridSize,
  } = sessionState

  const {
    selectVideoFromBrowser,
    fullscreenActive,
  } = mediaState

  const {
    backendRead,
    searchPanelCollapsed,
    featureSearchActive,
    featureNameQueryEffective,
    featureWorkTitleQueryEffective,
    featureCircleQueryEffective,
    featureAuthorQueryEffective,
    featureTagsEffective,
    featureGradeFilterEffective,
    vectorResultsActive,
  } = readState

  const {
    scopedImageSourcesEffective,
    packageByIdEffective,
    videoByIdEffective,
    imageTreeForSidebar,
    imageNodeLoadStateById,
    videosForSidebar,
    videoTreeForSidebar,
    rootScopedVideoIds,
    rootScopedPackageIds,
    allScopedRefs,
    normalImageSourceNodeIdMap,
    vectorSidebarNodes,
    vectorResultPackageNodeIdMap,
    flatSidebarNodes,
    sidebarNodeById,
    imageSourceNodeIdMap,
    videoNodeIdMap,
    canSetCurrentRoot,
    currentRootLabel,
    applyCurrentRootFromSelection,
    ensureSidebarNodeVisible,
    handleSidebarNavigationKey,
    sidebarCheckedNodeIds,
    sidebarCheckedNodeIdSet,
    imageCheckedIds,
    imageCheckedIdSet,
    activeSelectionScope,
    clearAllSelections,
    toggleSidebarNodeChecked,
    toggleImageChecked,
    replaceImageCheckedIds,
    orderedRootScopedPackages,
    orderedRootScopedImageRefs,
  } = useAppSidebarScopeState({
    backendRead,
    mode,
    bootstrapLibrarySnapshot,
    bootstrapImagePackages,
    bootstrapImageDirectories,
    bootstrapVideos,
    vectorSearchResults,
    vectorResultsActive,
    featureSearchActive,
    featureNameQuery: featureNameQueryEffective,
    featureWorkTitleQuery: featureWorkTitleQueryEffective,
    featureCircleQuery: featureCircleQueryEffective,
    featureAuthorQuery: featureAuthorQueryEffective,
    featureTags: featureTagsEffective,
    featureGradeFilter: featureGradeFilterEffective,
    archiveLoadStatus,
    imageRootNodeId,
    videoRootNodeId,
    selectedSidebarNodeId,
    appBodyRef,
    setSelectedSidebarNodeId,
    setSelectedPackageId,
    selectVideoFromBrowser,
    setFocusByPackage,
    setPageByPackage,
    setGradeByPackage,
    updateSettings,
  })

  const collapseSidebar = useCallback(() => {
    updateSettings({ sidebarRatio: 0, sidebarFocus: 'main' })
  }, [updateSettings])

  const {
    sidebarCollapsed,
    normalizeSidebarRatio,
    applySidebarRatio,
    applyMetadataRatio,
    onStartSidebarResize,
    onStartMetadataResize,
    onStartVectorPanelResize,
    onExpandSidebar,
  } = usePaneResizers({
    appBodyRef,
    workspaceRef,
    workspaceBodyRef,
    appBodyWidth,
    sidebarRatio,
    sidebarMinWidth,
    metadataRatio,
    vectorPanelHeight,
    layoutLocked,
    searchPanelCollapsed,
    sidebarCollapseRatio: SIDEBAR_COLLAPSE_RATIO,
    lastExpandedSidebarRatioRef,
    onSetSidebarRatio: (value) => updateSettings({ sidebarRatio: value }),
    onSetMetadataRatio: (value) => updateSettings({ metadataRatio: value }),
    onSetVectorPanelHeight: (value) => updateSettings({ vectorPanelHeight: value }),
  })

  const thumbnailLayout = useMemo(
    () =>
      computeThumbnailGridLayout({
        gridWidth: gridSize.width,
        gridHeight: gridSize.height,
        thumbnailWidth,
        thumbnailGap,
        zoomLevel: thumbnailScale,
      }),
    [gridSize.height, gridSize.width, thumbnailGap, thumbnailScale, thumbnailWidth],
  )
  const normalizedThumbnailScale = thumbnailLayout.zoomLevel
  const thumbnailScaleLevelCount = thumbnailLayout.zoomLevelCount
  const displayThumbnailScaleLevel = thumbnailScaleLevelCount - normalizedThumbnailScale + 1
  const canThumbnailScaleDown = normalizedThumbnailScale < thumbnailScaleLevelCount
  const canThumbnailScaleUp = normalizedThumbnailScale > 1
  const thumbnailColumns = thumbnailLayout.columns
  const actualCellWidth = thumbnailLayout.cellWidth
  const actualMediaHeight = thumbnailLayout.mediaHeight
  const pagedPageSize = thumbnailLayout.pageSize
  const actualThumbnailGap = thumbnailLayout.gap

  const {
    activePackage,
    focusedRef,
    focusedImage,
    focusedImagePackage,
    metadataImagePackage,
    currentGrade,
    visibleImageRefs,
    imageTotalPages,
    normalizedPageIndex,
    pageStart,
    refsInPage,
    setImageFocus,
    moveImage,
    moveImageVertical,
    jumpImageBoundary,
    goPackage,
    goPrevPage,
    goNextPage,
  } = useImageBrowserViewModel({
    mode,
    selectedPackageId,
    setSelectedPackageId,
    imageFocusActive,
    setImageFocusActive,
    focusByPackage,
    setFocusByPackage,
    pageByPackage,
    setPageByPackage,
    vectorSearchResults,
    vectorFocusIndex,
    setVectorFocusIndex,
    vectorPage,
    setVectorPage,
    gradeByPackage,
    setGradeByPackage,
    packageById: packageByIdEffective,
    orderedRootScopedPackages,
    orderedRootScopedImageRefs,
    vectorResultsActive,
    showNamesOnly,
    thumbnailColumns,
    pagedPageSize,
    fullscreenActive,
  })

  return {
    scopedImageSourcesEffective,
    packageByIdEffective,
    videoByIdEffective,
    imageTreeForSidebar,
    imageNodeLoadStateById,
    videosForSidebar,
    videoTreeForSidebar,
    rootScopedVideoIds,
    rootScopedPackageIds,
    allScopedRefs,
    normalImageSourceNodeIdMap,
    vectorSidebarNodes,
    vectorResultPackageNodeIdMap,
    flatSidebarNodes,
    sidebarNodeById,
    imageSourceNodeIdMap,
    videoNodeIdMap,
    canSetCurrentRoot,
    currentRootLabel,
    applyCurrentRootFromSelection,
    ensureSidebarNodeVisible,
    handleSidebarNavigationKey,
    sidebarCheckedNodeIds,
    sidebarCheckedNodeIdSet,
    imageCheckedIds,
    imageCheckedIdSet,
    activeSelectionScope,
    clearAllSelections,
    toggleSidebarNodeChecked,
    toggleImageChecked,
    replaceImageCheckedIds,
    orderedRootScopedPackages,
    orderedRootScopedImageRefs,
    collapseSidebar,
    sidebarCollapsed,
    normalizeSidebarRatio,
    applySidebarRatio,
    applyMetadataRatio,
    onStartSidebarResize,
    onStartMetadataResize,
    onStartVectorPanelResize,
    onExpandSidebar,
    normalizedThumbnailScale,
    thumbnailScaleLevelCount,
    displayThumbnailScaleLevel,
    canThumbnailScaleDown,
    canThumbnailScaleUp,
    thumbnailColumns,
    actualCellWidth,
    actualMediaHeight,
    pagedPageSize,
    actualThumbnailGap,
    activePackage,
    focusedRef,
    focusedImage,
    focusedImagePackage,
    metadataImagePackage,
    currentGrade,
    visibleImageRefs,
    imageTotalPages,
    normalizedPageIndex,
    pageStart,
    refsInPage,
    setImageFocus,
    moveImage,
    moveImageVertical,
    jumpImageBoundary,
    goPackage,
    goPrevPage,
    goNextPage,
  }
}
