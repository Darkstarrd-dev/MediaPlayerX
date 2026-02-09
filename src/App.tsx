import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'

import './App.css'
import AppShell from './components/AppShell'
import {
  normalizePathForCompare,
} from './features/app/mediaPathUtils'
import { useMetadataWriteBindings } from './features/app/useMetadataWriteBindings'
import { buildE2eBenchSectionProps } from './features/app/buildE2eBenchSectionProps'
import { buildManageDeleteDialogProps } from './features/app/buildManageDeleteDialogProps'
import { useAppSettingsStore } from './features/app/useAppSettingsStore'
import { useAppEffects } from './features/app/useAppEffects'
import { useArchiveLoadStatus } from './features/app/useArchiveLoadStatus'
import { useImageBrowserViewModel } from './features/app/useImageBrowserViewModel'
import { useEffectiveDisplayState } from './features/app/useEffectiveDisplayState'
import { useManageModeActions } from './features/app/useManageModeActions'
import { useAppTopLayerState } from './features/app/useAppTopLayerState'
import { usePersistedAppSettings } from './features/app/usePersistedAppSettings'
import { useRepositoryBootstrapData } from './features/app/useRepositoryBootstrapData'
import { useResponsiveZoomEffect } from './features/app/useResponsiveZoomEffect'
import { useResolvedMediaState } from './features/app/useResolvedMediaState'
import { useAppSidebarScopeState } from './features/app/useAppSidebarScopeState'
import { useAppShortcutBindings } from './features/app/useAppShortcutBindings'
import { useAppWorkspaceProps } from './features/app/useAppWorkspaceProps'
import { useFullscreenPlaybackBindings } from './features/app/useFullscreenPlaybackBindings'
import { useVectorUniverseBindings } from './features/app/useVectorUniverseBindings'
import { useImportPipeline } from './features/import/useImportPipeline'
import { usePaneResizers } from './features/layout/usePaneResizers'
import { computeThumbnailGridLayout } from './features/layout/thumbnailLayout'
import { useMediaState } from './features/media/useMediaState'
import { usePlaylistPersistence } from './features/media/usePlaylistPersistence'
import { useFeatureSearch } from './features/search/useFeatureSearch'
import {
  useRuntimeCapabilities,
  useReadOnlyDataAccess,
  useWriteDataAccess,
} from './features/backend'
import { getBenchSettings } from './features/perf/benchSettings'
import type {
  FocusedImageRef,
  VectorCandidate,
} from './types'
import { clamp } from './utils/ui'

const AUTO_PLAY_PRESETS = [1, 2, 3, 5, 8]
const SIDEBAR_COLLAPSE_RATIO = 0.03
const EMPTY_FEATURE_TAGS: string[] = []
const MEDIA_RESOLVE_MAX_CONCURRENT = 8

function App() {
  const benchSettings = getBenchSettings()
  const appSettings = useAppSettingsStore()
  const {
    mode,
    vectorMode,
    settingsOpen,
    headerHeight,
    sidebarRatio,
    sidebarMinWidth,
    layoutLocked,
    metadataRatio,
    vectorPanelHeight,
    thumbnailScale,
    thumbnailGap,
    showNamesOnly,
    metadataCollapsed,
    autoPlayEnabled,
    autoPlayInterval,
    vectorThreshold,
    sidebarFocus,
    imageRootNodeId,
    videoRootNodeId,
    themeId,
    thumbnailWidth,
    vectorUniverseMoveSpeed,
    vectorUniverseSprintMultiplier,
    vectorUniverseLookSensitivity,
    vectorUniverseRaycastDistance,
    vectorUniverseHelperScale,
    vectorUniverseDispersion,
    vectorUniverseWidgetSize,
    shortcuts,
    vectorControls,
    updateSettings,
  } = appSettings

  const {
    mediaRepository,
    repositoryMode,
    bootstrapLibrarySnapshot,
    imageSources,
    bootstrapImagePackages,
    bootstrapImageDirectories,
    bootstrapVideos,
  } = useRepositoryBootstrapData()
  const [selectedPackageId, setSelectedPackageId] = useState(imageSources[0]?.id ?? '')
  const [selectedSidebarNodeId, setSelectedSidebarNodeId] = useState<string | null>(null)
  const [imageFocusActive, setImageFocusActive] = useState(false)
  const [focusByPackage, setFocusByPackage] = useState<Record<string, number>>(() =>
    Object.fromEntries(imageSources.map((source) => [source.id, 0])),
  )
  const [pageByPackage, setPageByPackage] = useState<Record<string, number>>(() =>
    Object.fromEntries(imageSources.map((source) => [source.id, 0])),
  )
  const [vectorSearchResults, setVectorSearchResults] = useState<VectorCandidate[]>([])
  const [vectorFocusIndex, setVectorFocusIndex] = useState(0)
  const [vectorPage, setVectorPage] = useState(0)
  const [gradeByPackage, setGradeByPackage] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(imageSources.map((source) => [source.id, source.mockGrade ?? null])),
  )
  const [manageMode, setManageMode] = useState(false)
  const [manageOperationHint, setManageOperationHint] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [importMenuOpen, setImportMenuOpen] = useState(false)
  const [vectorUniverseOpen, setVectorUniverseOpen] = useState(false)
  const [dismissedImportTaskIds, setDismissedImportTaskIds] = useState<Record<string, true>>({})
  const [importTaskPanelOpen, setImportTaskPanelOpen] = useState(false)
  const archiveLoadStatus = useArchiveLoadStatus({ repository: mediaRepository })
  const [fullscreenEntryDisplay, setFullscreenEntryDisplay] = useState<'image-only' | 'video-only'>(
    mode === 'video' ? 'video-only' : 'image-only',
  )

  const {
    selectedVideoId,
    playlistIds,
    setPlaylistIds,
    metadataTab,
    setMetadataTab,
    dragVideoId,
    setDragVideoId,
    videoPlaying,
    setVideoPlaying,
    videoTime,
    setVideoTime,
    videoRate,
    setVideoRate,
    videoVolume,
    setVideoVolume,
    videoMuted,
    setVideoMuted,
    videoCoverById,
    setVideoCoverById,
    videoCoverImageById,
    setVideoCoverImageById,
    videoDurationById,
    setVideoDurationById,
    fullscreenActive,
    setFullscreenActive,
    fullscreenDisplay,
    setFullscreenDisplay,
    fullscreenSwapped,
    setFullscreenSwapped,
    fullscreenVideoFocus,
    setFullscreenVideoFocus,
    fullscreenSplit,
    setFullscreenSplit,
    showFullscreenFooter,
    setShowFullscreenFooter,
    goPlaylist,
    selectVideoFromBrowser,
    adjustVideoRate,
    adjustVideoVolume,
  } = useMediaState({
    initialVideoId: bootstrapVideos[0]?.id ?? '',
    initialPlaylistIds: bootstrapVideos.slice(0, 3).map((item) => item.id),
    videos: bootstrapVideos,
  })

  const playlistPersistence = usePlaylistPersistence({
    repository: mediaRepository,
    videos: bootstrapVideos,
    playlistIds,
    setPlaylistIds,
  })

  const {
    fileImportInputRef,
    folderImportInputRef,
    dragOverlayActive,
    enqueuePending,
    taskError,
    importTasks,
    retryImportTask,
    clearTaskError,
    openImportFilesDialog,
    openImportFoldersDialog,
    onImportFilesSelected,
    onImportFoldersSelected,
    onDragEnterImport,
    onDragOverImport,
    onDragLeaveImport,
    onDropImport,
  } = useImportPipeline({ repository: mediaRepository })

  const appBodyRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<HTMLElement>(null)
  const workspaceBodyRef = useRef<HTMLDivElement>(null)
  const vectorPanelRef = useRef<HTMLDivElement>(null)
  const vectorPanelContentRef = useRef<HTMLDivElement>(null)
  const wasFullscreenRef = useRef(false)
  const lastExpandedSidebarRatioRef = useRef(sidebarRatio >= SIDEBAR_COLLAPSE_RATIO ? sidebarRatio : 0.26)
  const [appBodyWidth, setAppBodyWidth] = useState(0)
  const gridRef = useRef<HTMLDivElement>(null)
  const [gridSize, setGridSize] = useState({ width: 1200, height: 700 })

  useResponsiveZoomEffect()

  const {
    searchPanelMode,
    setSearchPanelMode,
    searchPanelCollapsed,
    setSearchPanelCollapsed,
    featureSearchActive,
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
  })

  const vectorResultsActive = mode === 'image' && vectorMode && searchPanelMode === 'vector' && vectorSearchResults.length > 0
  const searchResultsMode = vectorResultsActive || featureSearchActive
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
    featureNameQuery: featureSearchActive ? featureNameQuery : '',
    featureWorkTitleQuery: featureSearchActive ? featureWorkTitleQuery : '',
    featureCircleQuery: featureSearchActive ? featureCircleQuery : '',
    featureAuthorQuery: featureSearchActive ? featureAuthorQuery : '',
    featureTags: featureSearchActive ? featureTags : EMPTY_FEATURE_TAGS,
    featureGradeFilter: featureSearchActive ? featureGradeFilter : null,
    gradeByPackage,
  })

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

  const backendWrite = useWriteDataAccess({
    repository: mediaRepository,
    setGradeByPackage,
    setVideoCoverById,
    setVideoCoverImageById,
  })

  const {
    toggleManageMode,
    runManageHideAction,
    requestManageDelete,
    confirmManageDelete,
  } = useManageModeActions({
    mode,
    manageMode,
    imageCheckedIds,
    sidebarCheckedNodeIds,
    backendWrite,
    clearAllSelections,
    setManageMode,
    setDeleteConfirmOpen,
    setManageOperationHint,
    setVectorSearchResults,
    setVectorFocusIndex,
    setVectorPage,
    setSearchPanelMode,
    setSearchPanelCollapsed,
    updateSettings,
  })

  const runtimeCapabilities = useRuntimeCapabilities({
    repository: mediaRepository,
  })

  const {
    backendPageSnapshot,
    activePackageForDisplay,
    refsInPageEffective,
    pageStartEffective,
    normalizedPageIndexEffective,
    imageTotalPagesEffective,
    metadataImageEffective,
    metadataImagePackageEffective,
    currentGradeEffective,
    focusedVideo,
    focusedVideoDurationSec,
    focusedVideoCoverColor,
    focusedVideoCoverImageLocator,
    focusedVideoEffective,
  } = useEffectiveDisplayState({
    backendPageData: backendRead.page.data,
    backendPageSnapshot: backendRead.page.snapshot,
    backendMetadataData: backendRead.metadata.data,
    backendMetadataSnapshot: backendRead.metadata.snapshot,
    vectorResultsActive,
    imageFocusActive,
    focusedRef,
    focusedImage,
    activePackage,
    refsInPage,
    pageStart,
    normalizedPageIndex,
    imageTotalPages,
    pagedPageSize,
    showNamesOnly,
    packageById: packageByIdEffective,
    metadataImagePackage,
    currentGrade,
    selectedVideoId,
    videoById: videoByIdEffective,
    videosForSidebar,
    videoDurationById,
    videoCoverById,
    videoCoverImageById,
  })

  const metadataWriteBindings = useMetadataWriteBindings({
    backendWrite,
    metadataImagePackageId: metadataImagePackageEffective?.id ?? null,
    focusedVideoId: focusedVideoEffective?.id ?? null,
  })

  const {
    thumbnailImageUrlById,
    metadataImageSrc,
    fullscreenImageSrc,
    focusedVideoSrc,
    focusedVideoCoverImageSrc,
  } = useResolvedMediaState({
    repository: mediaRepository,
    benchSettings,
    maxConcurrent: MEDIA_RESOLVE_MAX_CONCURRENT,
    actualCellWidth,
    actualMediaHeight,
    packageById: packageByIdEffective,
    focusedImage,
    metadataImage: metadataImageEffective,
    focusedRef,
    orderedRootScopedImageRefs,
    fullscreenActive,
    showNamesOnly,
    refsInPage: refsInPageEffective,
    focusedVideo,
    focusedVideoCoverImageLocator,
  })

  const {
    videoShortcutActive,
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
  })

  const {
    runVectorSearch,
    goToFromSearchMode,
    vectorUniverseSectionProps,
  } = useVectorUniverseBindings({
    mode,
    focusedRef,
    allScopedRefs,
    packageById: packageByIdEffective,
    vectorThreshold,
    vectorSearchResults,
    vectorResultsActive,
    featureSearchActive,
    selectedSidebarNodeId,
    normalImageSourceNodeIdMap,
    orderedRootScopedPackages,
    setSelectedPackageId,
    setSelectedSidebarNodeId,
    setVectorSearchResults,
    setVectorFocusIndex,
    setVectorPage,
    setSearchPanelMode,
    vectorUniverseOpen,
    setVectorUniverseOpen,
    setImageFocus,
    updateSettings,
    scopedImageSourcesEffective,
    vectorUniverseMoveSpeed,
    vectorUniverseSprintMultiplier,
    vectorUniverseLookSensitivity,
    vectorUniverseRaycastDistance,
    vectorUniverseDispersion,
    vectorUniverseHelperScale,
    vectorUniverseWidgetSize,
    vectorControls,
  })


  useAppShortcutBindings({
    shortcuts,
    vectorUniverseOpen,
    mode,
    vectorResultsActive,
    settingsOpen,
    sidebarFocus,
    fullscreenActive,
    fullscreenDisplay,
    imageFocusActive,
    videoShortcutActive,
    focusedImage,
    handleSidebarNavigationKey,
    setImageFocusActive,
    setFullscreenActiveWithAutoStop,
    setFullscreenVideoFocus,
    moveImage,
    moveImageVertical,
    jumpImageBoundary,
    goPackage,
    requestFullscreenAlign,
    autoPlayEnabled,
    applyAutoplayIntervalByIndex,
    applyPackageGrade: metadataWriteBindings.applyPackageGrade,
    setVideoPlaying,
    goPlaylist,
    adjustVideoRate,
    adjustVideoVolume,
    updateSettings,
  })

  useAppEffects({
    appBodyRef,
    gridRef,
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
    thumbnailScale,
    normalizedThumbnailScale,
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
    rootScopedVideoIds,
    selectedVideoId,
    videoNodeIdMap,
    ensureSidebarNodeVisible,
    fullscreenActive,
    autoPlayEnabled,
    autoPlayInterval,
    moveImage,
    vectorMode,
    searchPanelCollapsed,
    searchPanelMode,
    vectorPanelHeight,
    featureTagPickerOpen,
    themeId,
    setAppBodyWidth,
    setGridSize,
    setVectorFocusIndex,
    setVectorPage,
    setPageByPackage,
    setSelectedPackageId,
    setSelectedSidebarNodeId,
    selectVideoFromBrowser,
    setFullscreenEntryDisplay,
    setFullscreenDisplay,
    setFullscreenVideoFocus,
    setFullscreenSwapped,
    setShowFullscreenFooter,
    updateSettings,
  })

  usePersistedAppSettings({
    settings: appSettings,
    repository: mediaRepository,
  })

  const {
    bannerBackendErrorRows,
    managementErrorRows,
    runtimeCapabilityWarnings,
    runtimeWarningDismiss,
    fullscreenLayerProps,
    settingsPanelProps,
    appHeaderProps,
    importTaskPanelProps,
  } = useAppTopLayerState({
    appSettings,
    mediaRepository,
    backendRead,
    backendWrite,
    playlistPersistence,
    runtimeCapabilities,
    autoPlayPresets: AUTO_PLAY_PRESETS,
    mode,
    manageMode,
    vectorUniverseOpen,
    displayThumbnailScaleLevel,
    thumbnailScaleLevelCount,
    canThumbnailScaleDown,
    canThumbnailScaleUp,
    importMenuOpen,
    importTaskPanelOpen,
    setImportMenuOpen,
    setImportTaskPanelOpen,
    openImportFilesDialog,
    openImportFoldersDialog,
    setSearchPanelMode,
    setSearchPanelCollapsed,
    setVectorUniverseOpen,
    onToggleManageMode: toggleManageMode,
    importTasks,
    dismissedImportTaskIds,
    setDismissedImportTaskIds,
    enqueuePending,
    archiveLoadStatus,
    normalizePathForCompare,
    retryImportTask,
    taskError,
    clearTaskError,
    fullscreenActive,
    showFullscreenFooter,
    fullscreenDisplay,
    fullscreenEntryDisplay,
    fullscreenAlignRequest,
    fullscreenSwapped,
    fullscreenVideoFocus,
    fullscreenSplit,
    focusedImage,
    fullscreenImageSrc,
    focusedVideo: focusedVideoEffective,
    focusedVideoSrc,
    focusedVideoCoverImageSrc,
    focusedVideoDurationSec,
    focusedVideoCoverColor,
    videoTime,
    videoPlaying,
    videoRate,
    videoVolume,
    videoMuted,
    setVideoPlaying,
    goPlaylist,
    setVideoTime,
    setVideoDurationById,
    setVideoMuted,
    setVideoVolume,
    setVideoRate,
    setFullscreenActiveWithAutoStop,
    setShowFullscreenFooter,
    setFullscreenDisplay,
    setFullscreenSwapped,
    setFullscreenVideoFocus,
    setFullscreenSplit,
    moveImage,
    goPackage,
    applySidebarRatio,
    applyMetadataRatio,
    focusedVideoEffectiveId: focusedVideoEffective?.id ?? null,
  })

  const {
    sidebarPanelProps,
    searchPanelProps,
    managementPanelProps,
    imageMainSectionProps,
    videoMainSectionProps,
    metadataPanelProps,
    mainFooter,
  } = useAppWorkspaceProps({
    appSettings,
    benchSettings,
    mode,
    vectorMode,
    manageMode,
    searchPanelCollapsed,
    setSearchPanelCollapsed,
    vectorPanelHeight,
    vectorPanelRef,
    vectorPanelContentRef,
    searchPanelMode,
    setSearchPanelMode,
    vectorSearchResults,
    scopedImageSourcesEffective,
    focusedRef,
    focusedImage,
    focusedImagePackage,
    runVectorSearch,
    featureNameQuery,
    setFeatureNameQuery,
    featureWorkTitleQuery,
    setFeatureWorkTitleQuery,
    featureCircleQuery,
    setFeatureCircleQuery,
    featureAuthorQuery,
    setFeatureAuthorQuery,
    featureCircleOptions,
    featureAuthorOptions,
    featureTagOptions,
    featureTagPickerOpen,
    setFeatureTagPickerOpen,
    featureTags,
    setFeatureTags,
    featureGradeFilter,
    setFeatureGradeFilter,
    onStartVectorPanelResize,
    layoutLocked,
    currentRootLabel,
    managementErrorRows,
    sidebarCheckedNodeIds,
    imageCheckedIds,
    activeSelectionScope,
    backendWrite,
    manageOperationHint,
    requestManageDelete,
    runManageHideAction,
    clearAllSelections,
    vectorResultsActive,
    showNamesOnly,
    backendPageLoading: backendRead.page.loading,
    pagedPageSize,
    activePackageForDisplay,
    visibleImageRefs,
    refsInPageEffective,
    pageStartEffective,
    actualCellWidth,
    actualMediaHeight,
    thumbnailColumns,
    actualThumbnailGap,
    normalizedPageIndexEffective,
    imageTotalPagesEffective,
    packageByIdEffective,
    thumbnailImageUrlById,
    gridRef,
    imageCheckedIdSet,
    setFullscreenActiveWithAutoStop,
    setVectorFocusIndex,
    setImageFocus,
    toggleImageChecked,
    replaceImageCheckedIds,
    goPrevPage,
    goNextPage,
    focusedVideoDurationSec,
    videoTime,
    videoPlaying,
    videoRate,
    videoVolume,
    videoMuted,
    focusedVideoSrc,
    fullscreenActive,
    focusedVideoCoverColor,
    focusedVideoCoverImageSrc,
    focusedVideoEffective,
    setVideoPlaying,
    goPlaylist,
    setVideoTime,
    setVideoDurationById,
    setVideoMuted,
    setVideoVolume,
    setVideoRate,
    imageFocusActive,
    metadataImageEffective,
    metadataImageSrc,
    metadataImagePackageEffective,
    currentGradeEffective,
    metadataWriteBindings,
    metadataTab,
    playlistIds,
    selectedVideoId,
    dragVideoId,
    videoByIdEffective,
    setMetadataTab,
    selectVideoFromBrowser,
    setPlaylistIds,
    setDragVideoId,
    sidebarNodeById,
    selectedSidebarNodeId,
    searchResultsMode,
    canSetCurrentRoot,
    imageRootNodeId,
    videoRootNodeId,
    imageTreeForSidebar,
    videoTreeForSidebar,
    imageNodeLoadStateById,
    selectedPackageId,
    featureSearchActive,
    searchResultsReadOnly,
    sidebarCheckedNodeIdSet,
    goToFromSearchMode,
    setSelectedSidebarNodeId,
    setSelectedPackageId,
    collapseSidebar,
    applyCurrentRootFromSelection,
    toggleSidebarNodeChecked,
  })

  const manageDeleteDialogProps = buildManageDeleteDialogProps({
    open: deleteConfirmOpen,
    pending: backendWrite.pending.manage,
    confirmManageDelete,
    setDeleteConfirmOpen,
  })

  const e2eBenchSectionProps = buildE2eBenchSectionProps({
    enabled: benchSettings.enabled,
    benchMode: benchSettings.mode,
    repository: mediaRepository,
    mode,
    orderedPackages: orderedRootScopedPackages,
    selectedPackageId,
    setSelectedPackageId,
    pageIndex: backendPageSnapshot?.pageIndex ?? null,
    totalPages: imageTotalPagesEffective,
    pageLoading: backendRead.page.loading,
    refsInPageCount: refsInPageEffective.length,
    goNextPage,
    goPrevPage,
  })

  const importSourceInputsProps = {
    fileImportInputRef,
    folderImportInputRef,
    onImportFilesSelected,
    onImportFoldersSelected,
  }

  const appTopBannersProps = {
    backendErrorRows: bannerBackendErrorRows,
    repositoryMode,
    runtimeWarningVisible: runtimeWarningDismiss.visible,
    runtimeCapabilityWarnings,
    onDismissRuntimeWarning: runtimeWarningDismiss.dismiss,
    importTaskPanelProps,
  }

  const appWorkspaceProps = {
    mode,
    headerHeight,
    sidebarCollapsed,
    sidebarFocus,
    sidebarRatio,
    metadataCollapsed,
    metadataRatio,
    layoutLocked,
    appBodyRef,
    workspaceRef,
    workspaceBodyRef,
    onExpandSidebar,
    onStartSidebarResize,
    onStartMetadataResize,
    sidebarPanelProps,
    searchPanelProps,
    managementPanelProps,
    imageMainSectionProps,
    videoMainSectionProps,
    metadataPanelProps,
    mainFooter,
  }

  return (
    <AppShell
      onDragEnterImport={onDragEnterImport}
      onDragLeaveImport={onDragLeaveImport}
      onDragOverImport={onDragOverImport}
      onDropImport={onDropImport}
      appHeaderProps={appHeaderProps}
      importSourceInputsProps={importSourceInputsProps}
      appTopBannersProps={appTopBannersProps}
      appWorkspaceProps={appWorkspaceProps}
      fullscreenLayerProps={fullscreenLayerProps}
      vectorUniverseSectionProps={vectorUniverseSectionProps}
      settingsPanelProps={settingsPanelProps}
      manageDeleteDialogProps={manageDeleteDialogProps}
      dragOverlayActive={dragOverlayActive}
      e2eBenchSectionProps={e2eBenchSectionProps}
    />
  )
}

export default App
