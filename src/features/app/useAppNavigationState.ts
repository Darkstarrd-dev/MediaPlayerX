import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { AppSettingsStoreSnapshot } from './useAppSettingsStore'
import type { AppSessionStateResult } from './useAppSessionState'
import type { RepositoryBootstrapDataResult } from './useRepositoryBootstrapData'
import type { ArchiveLoadStatusResult } from './useArchiveLoadStatus'
import type { MediaStateResult } from '../media/useMediaState'
import type { AppReadStateResult } from './useAppReadState'
import { useAppSidebarScopeState } from './useAppSidebarScopeState'
import { usePaneResizers } from '../layout/usePaneResizers'
import { computeThumbnailGridLayout, resolveThumbnailCardChromePx } from '../layout/thumbnailLayout'
import { useImageBrowserViewModel } from './useImageBrowserViewModel'
import { clamp } from '../../utils/ui'

const SIDEBAR_COLLAPSE_RATIO = 0.03
const SNAP_SETTLE_DELAY_MS = 96
const SCALE_SNAP_SUPPRESS_MS = 220

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
    metadataCollapsed,
    metadataRatio,
    workspaceBottomPanelHeight,
    layoutLocked,
    thumbnailScale,
    thumbnailGap,
    thumbnailWidth,
    styleId,
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
    featureSeriesIdQueryEffective,
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
    featureSeriesIdQuery: featureSeriesIdQueryEffective,
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
    horizontalResizing,
    horizontalResizeCommitCount,
    onStartSidebarResize,
    onStartMetadataResize,
    onStartWorkspaceBottomPanelResize,
    onExpandSidebar,
  } = usePaneResizers({
    appBodyRef,
    workspaceRef,
    workspaceBodyRef,
    appBodyWidth,
    sidebarRatio,
    sidebarMinWidth,
    metadataRatio,
    workspaceBottomPanelHeight,
    layoutLocked,
    searchPanelCollapsed,
    sidebarCollapseRatio: SIDEBAR_COLLAPSE_RATIO,
    lastExpandedSidebarRatioRef,
    onSetSidebarRatio: (value) => updateSettings({ sidebarRatio: value }),
    onSetMetadataRatio: (value) => updateSettings({ metadataRatio: value }),
    onSetWorkspaceBottomPanelHeight: (value) => updateSettings({ workspaceBottomPanelHeight: value }),
  })

  const [layoutGridSize, setLayoutGridSize] = useState(gridSize)
  useEffect(() => {
    if (horizontalResizing) {
      return
    }

    setLayoutGridSize((previous) => {
      if (Math.abs(previous.width - gridSize.width) < 1 && Math.abs(previous.height - gridSize.height) < 1) {
        return previous
      }
      return gridSize
    })
  }, [gridSize, horizontalResizing])

  const thumbnailLayout = useMemo(
    () =>
      computeThumbnailGridLayout({
        gridWidth: layoutGridSize.width,
        gridHeight: layoutGridSize.height,
        thumbnailWidth,
        thumbnailGap,
        zoomLevel: thumbnailScale,
        cardChrome: resolveThumbnailCardChromePx(),
      }),
    [layoutGridSize.height, layoutGridSize.width, styleId, thumbnailGap, thumbnailScale, thumbnailWidth],
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

  const snapTimeoutRef = useRef<number | null>(null)
  const scaleSnapSuppressUntilRef = useRef(0)
  const snapApplyingRef = useRef(false)

  useEffect(() => {
    return () => {
      if (snapTimeoutRef.current !== null) {
        window.clearTimeout(snapTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (mode === 'image' && !showNamesOnly && !layoutLocked && !horizontalResizing) {
      return
    }

    if (snapTimeoutRef.current !== null) {
      window.clearTimeout(snapTimeoutRef.current)
      snapTimeoutRef.current = null
    }
  }, [horizontalResizing, layoutLocked, mode, showNamesOnly])

  const applyThumbnailHorizontalSnap = useCallback(() => {
    if (mode !== 'image' || showNamesOnly || layoutLocked || horizontalResizing || snapApplyingRef.current) {
      return
    }

    if (gridSize.width <= 1 || gridSize.height <= 1) {
      return
    }

    const liveLayout = computeThumbnailGridLayout({
      gridWidth: gridSize.width,
      gridHeight: gridSize.height,
      thumbnailWidth,
      thumbnailGap,
      zoomLevel: thumbnailScale,
      cardChrome: resolveThumbnailCardChromePx(),
    })
    if (liveLayout.columns <= 0) {
      return
    }

    const deltaMainWidth = liveLayout.idealGridWidth - gridSize.width
    if (Math.abs(deltaMainWidth) < 0.5) {
      return
    }

    const appBodyWidthMeasured = appBodyRef.current?.getBoundingClientRect().width ?? appBodyWidth
    const workspaceWidthMeasured = workspaceBodyRef.current?.getBoundingClientRect().width
    if (appBodyWidthMeasured <= 1 || !workspaceWidthMeasured || workspaceWidthMeasured <= 1) {
      return
    }

    const canAdjustSidebar = !sidebarCollapsed
    const canAdjustMetadata = !metadataCollapsed
    if (!canAdjustSidebar && !canAdjustMetadata) {
      return
    }

    const applySidebarShare = (targetMainDelta: number, currentSidebarRatio: number, currentMetadataRatio: number) => {
      if (!canAdjustSidebar) {
        return {
          nextSidebarRatio: currentSidebarRatio,
          appliedMainDelta: 0,
          workspaceWidthDelta: 0,
        }
      }

      const workspaceMainFactor = Math.max(0.05, 1 - currentMetadataRatio)
      const ratioDelta = -(targetMainDelta / (appBodyWidthMeasured * workspaceMainFactor))
      const nextSidebarRatio = normalizeSidebarRatio(currentSidebarRatio + ratioDelta)
      const workspaceWidthDelta = -(nextSidebarRatio - currentSidebarRatio) * appBodyWidthMeasured
      const appliedMainDelta = workspaceWidthDelta * workspaceMainFactor

      return {
        nextSidebarRatio,
        appliedMainDelta,
        workspaceWidthDelta,
      }
    }

    const applyMetadataShare = (targetMainDelta: number, currentMetadataRatio: number, currentWorkspaceWidth: number) => {
      if (!canAdjustMetadata || currentWorkspaceWidth <= 1) {
        return {
          nextMetadataRatio: currentMetadataRatio,
          appliedMainDelta: 0,
        }
      }

      const ratioDelta = -(targetMainDelta / currentWorkspaceWidth)
      const nextMetadataRatio = Number(clamp(currentMetadataRatio + ratioDelta, 0.2, 0.45).toFixed(3))
      const appliedMainDelta = -(nextMetadataRatio - currentMetadataRatio) * currentWorkspaceWidth

      return {
        nextMetadataRatio,
        appliedMainDelta,
      }
    }

    let nextSidebarRatio = sidebarRatio
    let nextMetadataRatio = metadataRatio
    let remainingMainDelta = deltaMainWidth
    let workspaceWidthForMetadata = workspaceWidthMeasured

    const firstShare = canAdjustSidebar && canAdjustMetadata ? remainingMainDelta / 2 : remainingMainDelta
    if (canAdjustSidebar) {
      const sidebarResult = applySidebarShare(firstShare, nextSidebarRatio, nextMetadataRatio)
      nextSidebarRatio = sidebarResult.nextSidebarRatio
      workspaceWidthForMetadata += sidebarResult.workspaceWidthDelta
      remainingMainDelta -= sidebarResult.appliedMainDelta
    }

    if (canAdjustMetadata) {
      const metadataResult = applyMetadataShare(remainingMainDelta, nextMetadataRatio, workspaceWidthForMetadata)
      nextMetadataRatio = metadataResult.nextMetadataRatio
      remainingMainDelta -= metadataResult.appliedMainDelta
    }

    if (canAdjustSidebar && Math.abs(remainingMainDelta) > 0.5) {
      const sidebarFinal = applySidebarShare(remainingMainDelta, nextSidebarRatio, nextMetadataRatio)
      nextSidebarRatio = sidebarFinal.nextSidebarRatio
      remainingMainDelta -= sidebarFinal.appliedMainDelta
    }

    const sidebarChanged = Math.abs(nextSidebarRatio - sidebarRatio) > 0.0005
    const metadataChanged = canAdjustMetadata && Math.abs(nextMetadataRatio - metadataRatio) > 0.0005
    if (!sidebarChanged && !metadataChanged) {
      return
    }

    const nextPatch: {
      sidebarRatio?: number
      metadataRatio?: number
    } = {}
    if (sidebarChanged) {
      nextPatch.sidebarRatio = nextSidebarRatio
    }
    if (metadataChanged) {
      nextPatch.metadataRatio = nextMetadataRatio
    }

    snapApplyingRef.current = true
    updateSettings(nextPatch)

    scaleSnapSuppressUntilRef.current = performance.now() + SCALE_SNAP_SUPPRESS_MS
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        snapApplyingRef.current = false
      })
    })
  }, [
    appBodyRef,
    appBodyWidth,
    gridSize.height,
    gridSize.width,
    horizontalResizing,
    layoutLocked,
    metadataCollapsed,
    metadataRatio,
    mode,
    normalizeSidebarRatio,
    showNamesOnly,
    sidebarCollapsed,
    sidebarRatio,
    thumbnailGap,
    thumbnailScale,
    thumbnailWidth,
    updateSettings,
    workspaceBodyRef,
  ])

  const queueThumbnailHorizontalSnap = useCallback(
    (delayMs: number) => {
      if (mode !== 'image' || showNamesOnly || layoutLocked || horizontalResizing) {
        return
      }

      if (snapApplyingRef.current) {
        return
      }

      if (snapTimeoutRef.current !== null) {
        window.clearTimeout(snapTimeoutRef.current)
      }

      snapTimeoutRef.current = window.setTimeout(() => {
        snapTimeoutRef.current = null
        applyThumbnailHorizontalSnap()
      }, delayMs)
    },
    [applyThumbnailHorizontalSnap, horizontalResizing, layoutLocked, mode, showNamesOnly],
  )

  useEffect(() => {
    if (horizontalResizeCommitCount <= 0) {
      return
    }

    queueThumbnailHorizontalSnap(SNAP_SETTLE_DELAY_MS)
  }, [horizontalResizeCommitCount, queueThumbnailHorizontalSnap])

  const previousThumbnailScaleRef = useRef(thumbnailScale)
  useEffect(() => {
    const scaleChanged = previousThumbnailScaleRef.current !== thumbnailScale
    previousThumbnailScaleRef.current = thumbnailScale
    if (!scaleChanged) {
      return
    }

    if (mode !== 'image' || showNamesOnly || layoutLocked) {
      return
    }

    if (performance.now() < scaleSnapSuppressUntilRef.current) {
      return
    }

    queueThumbnailHorizontalSnap(SNAP_SETTLE_DELAY_MS)
  }, [layoutLocked, mode, queueThumbnailHorizontalSnap, showNamesOnly, thumbnailScale])

  const initialSnapDoneRef = useRef(false)
  useEffect(() => {
    if (mode !== 'image' || showNamesOnly || layoutLocked || horizontalResizing || layoutGridSize.width <= 1) {
      return
    }

    if (initialSnapDoneRef.current) {
      return
    }

    initialSnapDoneRef.current = true
    queueThumbnailHorizontalSnap(0)
  }, [horizontalResizing, layoutGridSize.width, layoutLocked, mode, queueThumbnailHorizontalSnap, showNamesOnly])

  useEffect(() => {
    if (mode === 'image' && !showNamesOnly) {
      return
    }
    initialSnapDoneRef.current = false
  }, [mode, showNamesOnly])

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
    horizontalResizeCommitCount,
    onStartSidebarResize,
    onStartMetadataResize,
    onStartWorkspaceBottomPanelResize,
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
