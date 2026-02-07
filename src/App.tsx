import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useShallow } from 'zustand/react/shallow'

import './App.css'
import AppHeader from './components/AppHeader'
import AppWorkspace from './components/AppWorkspace'
import FullscreenLayer from './components/FullscreenLayer'
import SettingsPanel from './components/SettingsPanel'
import VectorUniverseOverlay from './components/VectorUniverseOverlay'
import {
  IMAGE_DIRECTORY_SOURCES,
  IMAGE_PACKAGES,
  VIDEO_ITEMS,
  buildImageSidebarTree,
  buildSidebarTree,
  buildVectorCandidates,
  findNodeById,
} from './mockData'
import {
  findShortcutConflicts,
} from './shortcuts'
import { findVectorControlConflicts } from './vectorControls'
import {
  collectImageSourceIds,
  collectLeafIds,
  makeRandomCoverColor,
} from './features/app/helpers'
import { useAppEffects } from './features/app/useAppEffects'
import { useImageBrowserViewModel } from './features/app/useImageBrowserViewModel'
import { useImportPipeline } from './features/import/useImportPipeline'
import { usePaneResizers } from './features/layout/usePaneResizers'
import { computeThumbnailGridLayout } from './features/layout/thumbnailLayout'
import { useMediaState } from './features/media/useMediaState'
import { useFeatureSearch } from './features/search/useFeatureSearch'
import { useSidebarNavigation } from './features/sidebar/useSidebarNavigation'
import { useShortcutEngine } from './features/shortcuts/useShortcutEngine'
import {
  createMediaRepository,
  type MediaResolveTarget,
  mapLibrarySnapshotDto,
  useResolvedMediaUrls,
  useReadOnlyDataAccess,
  useWriteDataAccess,
} from './features/backend'
import { useUiStore } from './store/useUiStore'
import type {
  FocusedImageRef,
  ImagePackage,
  SidebarNode,
  VectorCandidate,
} from './types'
import { clamp } from './utils/ui'

const AUTO_PLAY_PRESETS = [1, 2, 3, 5, 8]
const SIDEBAR_COLLAPSE_RATIO = 0.03
type FullscreenAlignDirection = 'up' | 'down' | 'left' | 'right'

function App() {
  const {
    mode,
    vectorMode,
    settingsOpen,
    headerHeight,
    settingsFontSize,
    sidebarRatio,
    sidebarMinWidth,
    layoutLocked,
    sidebarFontSize,
    sidebarCountFontSize,
    sidebarIndentStep,
    sidebarVerticalGap,
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
    thumbnailQuality,
    thumbnailWidth,
    lmStudioEndpoint,
    lmStudioModel,
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
    setShortcut,
    setVectorControl,
    resetShortcuts,
    resetVectorControls,
  } = useUiStore(
    useShallow((state) => ({
      mode: state.mode,
      vectorMode: state.vectorMode,
      settingsOpen: state.settingsOpen,
      headerHeight: state.headerHeight,
      settingsFontSize: state.settingsFontSize,
      sidebarRatio: state.sidebarRatio,
      sidebarMinWidth: state.sidebarMinWidth,
      layoutLocked: state.layoutLocked,
      sidebarFontSize: state.sidebarFontSize,
      sidebarCountFontSize: state.sidebarCountFontSize,
      sidebarIndentStep: state.sidebarIndentStep,
      sidebarVerticalGap: state.sidebarVerticalGap,
      metadataRatio: state.metadataRatio,
      vectorPanelHeight: state.vectorPanelHeight,
      thumbnailScale: state.thumbnailScale,
      thumbnailGap: state.thumbnailGap,
      showNamesOnly: state.showNamesOnly,
      metadataCollapsed: state.metadataCollapsed,
      autoPlayEnabled: state.autoPlayEnabled,
      autoPlayInterval: state.autoPlayInterval,
      vectorThreshold: state.vectorThreshold,
      sidebarFocus: state.sidebarFocus,
      imageRootNodeId: state.imageRootNodeId,
      videoRootNodeId: state.videoRootNodeId,
      thumbnailQuality: state.thumbnailQuality,
      thumbnailWidth: state.thumbnailWidth,
      lmStudioEndpoint: state.lmStudioEndpoint,
      lmStudioModel: state.lmStudioModel,
      vectorUniverseMoveSpeed: state.vectorUniverseMoveSpeed,
      vectorUniverseSprintMultiplier: state.vectorUniverseSprintMultiplier,
      vectorUniverseLookSensitivity: state.vectorUniverseLookSensitivity,
      vectorUniverseRaycastDistance: state.vectorUniverseRaycastDistance,
      vectorUniverseHelperScale: state.vectorUniverseHelperScale,
      vectorUniverseDispersion: state.vectorUniverseDispersion,
      vectorUniverseWidgetSize: state.vectorUniverseWidgetSize,
      shortcuts: state.shortcuts,
      vectorControls: state.vectorControls,
      updateSettings: state.updateSettings,
      setShortcut: state.setShortcut,
      setVectorControl: state.setVectorControl,
      resetShortcuts: state.resetShortcuts,
      resetVectorControls: state.resetVectorControls,
    })),
  )

  const { repository: mediaRepository, mode: repositoryMode } = useMemo(() => createMediaRepository(), [])
  const bootstrapLibrarySnapshot = useMemo(() => {
    const snapshot = mediaRepository.getInitialLibrarySnapshot()
    return snapshot ? mapLibrarySnapshotDto(snapshot) : null
  }, [mediaRepository])
  const imageSources = useMemo(
    () =>
      bootstrapLibrarySnapshot
        ? [...bootstrapLibrarySnapshot.imagePackages, ...bootstrapLibrarySnapshot.imageDirectories]
        : [...IMAGE_PACKAGES, ...IMAGE_DIRECTORY_SOURCES],
    [bootstrapLibrarySnapshot],
  )
  const bootstrapImagePackages = useMemo(
    () => bootstrapLibrarySnapshot?.imagePackages ?? IMAGE_PACKAGES,
    [bootstrapLibrarySnapshot],
  )
  const bootstrapImageDirectories = useMemo(
    () => bootstrapLibrarySnapshot?.imageDirectories ?? IMAGE_DIRECTORY_SOURCES,
    [bootstrapLibrarySnapshot],
  )
  const bootstrapVideos = useMemo(
    () => bootstrapLibrarySnapshot?.videos ?? VIDEO_ITEMS,
    [bootstrapLibrarySnapshot],
  )
  const packageById = useMemo(() => new Map(imageSources.map((source) => [source.id, source])), [imageSources])
  const videoById = useMemo(() => new Map(bootstrapVideos.map((video) => [video.id, video])), [bootstrapVideos])

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
  const [importMenuOpen, setImportMenuOpen] = useState(false)
  const [vectorUniverseOpen, setVectorUniverseOpen] = useState(false)
  const [fullscreenEntryDisplay, setFullscreenEntryDisplay] = useState<'image-only' | 'video-only'>(
    mode === 'video' ? 'video-only' : 'image-only',
  )
  const [fullscreenAlignRequest, setFullscreenAlignRequest] = useState<{
    id: number
    direction: FullscreenAlignDirection
  } | null>(null)

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

  const {
    fileImportInputRef,
    folderImportInputRef,
    dragOverlayActive,
    openImportFilesDialog,
    openImportFoldersDialog,
    onImportFilesSelected,
    onImportFoldersSelected,
    onDragEnterImport,
    onDragOverImport,
    onDragLeaveImport,
    onDropImport,
  } = useImportPipeline()

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

    const selectedSource = packageById.get(selectedPackageId)
    if (!selectedSource || selectedSource.images.length === 0) {
      return null
    }

    return {
      packageId: selectedPackageId,
      imageIndex: clamp(focusByPackage[selectedPackageId] ?? 0, 0, selectedSource.images.length - 1),
    }
  }, [focusByPackage, imageFocusActive, mode, packageById, selectedPackageId, vectorFocusIndex, vectorResultsActive, vectorSearchResults])

  const backendRead = useReadOnlyDataAccess({
    repository: mediaRepository,
    mode,
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
    featureTags: featureSearchActive ? featureTags : [],
    featureGradeFilter: featureSearchActive ? featureGradeFilter : null,
    gradeByPackage,
  })

  const sidebarSnapshot = backendRead.sidebar.data ?? backendRead.sidebar.snapshot
  const scopedSearchPackagesEffective = sidebarSnapshot?.imagePackages ?? bootstrapImagePackages
  const scopedSearchDirectoriesEffective = sidebarSnapshot?.imageDirectories ?? bootstrapImageDirectories
  const scopedImageSourcesEffective = useMemo(
    () => [...scopedSearchPackagesEffective, ...scopedSearchDirectoriesEffective],
    [scopedSearchDirectoriesEffective, scopedSearchPackagesEffective],
  )
  const sidebarTreeSnapshot = sidebarSnapshot?.tree ?? null

  const imageTreeRawLocal = useMemo(
    () => buildImageSidebarTree(bootstrapImagePackages, bootstrapImageDirectories),
    [bootstrapImageDirectories, bootstrapImagePackages],
  )
  const imageTreeRaw = useMemo(
    () => sidebarTreeSnapshot ?? imageTreeRawLocal,
    [imageTreeRawLocal, sidebarTreeSnapshot],
  )

  const imageRootNode = useMemo(
    () => findNodeById(imageTreeRaw, imageRootNodeId),
    [imageTreeRaw, imageRootNodeId],
  )

  const rootScopedPackageIds = useMemo(() => {
    if (!imageRootNode) {
      return new Set(scopedImageSourcesEffective.map((source) => source.id))
    }
    return new Set(collectImageSourceIds(imageRootNode))
  }, [imageRootNode, scopedImageSourcesEffective])

  const rootScopedPackages = useMemo(
    () => scopedImageSourcesEffective.filter((source) => rootScopedPackageIds.has(source.id)),
    [rootScopedPackageIds, scopedImageSourcesEffective],
  )

  const allScopedRefs = useMemo<FocusedImageRef[]>(() => {
    const refs: FocusedImageRef[] = []
    for (const pkg of rootScopedPackages) {
      pkg.images.forEach((_, imageIndex) => {
        refs.push({ packageId: pkg.id, imageIndex })
      })
    }
    return refs
  }, [rootScopedPackages])

  const imageTreeForSidebarNormal = useMemo(() => {
    if (!imageRootNode) {
      return imageTreeRaw
    }
    return [imageRootNode]
  }, [imageRootNode, imageTreeRaw])

  const normalImageSourceNodeIdMap = useMemo(() => {
    const map = new Map<string, string>()
    const walk = (nodes: SidebarNode[]) => {
      for (const node of nodes) {
        if (node.imageSourceId) {
          map.set(node.imageSourceId, node.id)
        }
        if (node.children.length > 0) {
          walk(node.children)
        }
      }
    }
    walk(imageTreeForSidebarNormal)
    return map
  }, [imageTreeForSidebarNormal])

  const vectorSidebarState = useMemo(() => {
    const resultCountByPackage = new Map<string, number>()
    for (const candidate of vectorSearchResults) {
      resultCountByPackage.set(candidate.packageId, (resultCountByPackage.get(candidate.packageId) ?? 0) + 1)
    }

    const leaves = Array.from(resultCountByPackage.keys())
      .map((packageId) => {
        const pkg = packageById.get(packageId)
        if (!pkg) {
          return null
        }
        return {
          id: packageId,
          treePath: pkg.treePath,
        }
      })
      .filter((leaf): leaf is { id: string; treePath: string[] } => Boolean(leaf))

    const rawTree = buildSidebarTree(leaves, 'package')
    const packageNodeIdMap = new Map<string, string>()

    const decorateNodes = (nodes: SidebarNode[]): SidebarNode[] => {
      return nodes.map((node) => {
        const children = decorateNodes(node.children)
        const selfResultCount = node.packageId ? (resultCountByPackage.get(node.packageId) ?? 0) : undefined

        if (node.packageId) {
          packageNodeIdMap.set(node.packageId, node.id)
        }

        return {
          ...node,
          children,
          imageSourceId: node.packageId ?? node.imageSourceId,
          directImageCount: selfResultCount,
        }
      })
    }

    return {
      nodes: decorateNodes(rawTree),
      packageNodeIdMap,
    }
  }, [packageById, vectorSearchResults])

  const vectorSidebarNodes = vectorSidebarState.nodes
  const vectorResultPackageNodeIdMap = vectorSidebarState.packageNodeIdMap

  const imageTreeForSidebar = useMemo(() => {
    if (vectorResultsActive) {
      return vectorSidebarNodes
    }
    return imageTreeForSidebarNormal
  }, [imageTreeForSidebarNormal, vectorResultsActive, vectorSidebarNodes])

  const searchedVideos = useMemo(() => bootstrapVideos, [bootstrapVideos])

  const videoTreeRaw = useMemo(
    () =>
      buildSidebarTree(
        searchedVideos.map((video) => ({
          id: video.id,
          treePath: video.treePath,
        })),
        'video',
      ),
    [searchedVideos],
  )

  const videoRootNode = useMemo(
    () => findNodeById(videoTreeRaw, videoRootNodeId),
    [videoRootNodeId, videoTreeRaw],
  )

  const rootScopedVideoIds = useMemo(() => {
    if (!videoRootNode) {
      return new Set(searchedVideos.map((video) => video.id))
    }
    return new Set(collectLeafIds(videoRootNode, 'video'))
  }, [videoRootNode, searchedVideos])

  const videosForSidebar = useMemo(
    () => searchedVideos.filter((video) => rootScopedVideoIds.has(video.id)),
    [rootScopedVideoIds, searchedVideos],
  )

  const videoTreeForSidebar = useMemo(
    () =>
      buildSidebarTree(
        videosForSidebar.map((video) => ({
          id: video.id,
          treePath: video.treePath,
        })),
        'video',
      ),
    [videosForSidebar],
  )

  const collapseSidebar = useCallback(() => {
    updateSettings({ sidebarRatio: 0, sidebarFocus: 'main' })
  }, [updateSettings])

  const {
    flatSidebarNodes,
    sidebarNodeById,
    imageSourceNodeIdMap,
    videoNodeIdMap,
    canSetCurrentRoot,
    currentRootLabel,
    applyCurrentRootFromSelection,
    ensureSidebarNodeVisible,
    handleSidebarNavigationKey,
  } = useSidebarNavigation({
    mode,
    imageTreeForSidebar,
    videoTreeForSidebar,
    imageRootNode,
    videoRootNode,
    selectedSidebarNodeId,
    appBodyRef,
    onSetSelectedSidebarNodeId: setSelectedSidebarNodeId,
    onSelectPackage: setSelectedPackageId,
    onSelectVideo: selectVideoFromBrowser,
    onSetSidebarFocusMain: () => {
      updateSettings({ sidebarFocus: 'main' })
    },
    onSetImageRootNodeId: (nodeId) => {
      updateSettings({ imageRootNodeId: nodeId })
    },
    onSetVideoRootNodeId: (nodeId) => {
      updateSettings({ videoRootNodeId: nodeId })
    },
  })

  const sidebarOrderedImageSourceIds = useMemo(() => {
    const orderedIds: string[] = []
    const seen = new Set<string>()

    for (const node of flatSidebarNodes) {
      const sourceId = node.imageSourceId
      if (!sourceId || seen.has(sourceId)) {
        continue
      }
      if (!rootScopedPackageIds.has(sourceId) || !packageById.has(sourceId)) {
        continue
      }
      seen.add(sourceId)
      orderedIds.push(sourceId)
    }

    if (orderedIds.length > 0) {
      return orderedIds
    }

    return rootScopedPackages.map((pkg) => pkg.id)
  }, [flatSidebarNodes, packageById, rootScopedPackageIds, rootScopedPackages])

  const orderedRootScopedPackages = useMemo(
    () =>
      sidebarOrderedImageSourceIds
        .map((sourceId) => packageById.get(sourceId))
        .filter((pkg): pkg is ImagePackage => Boolean(pkg)),
    [packageById, sidebarOrderedImageSourceIds],
  )

  const orderedRootScopedImageRefs = useMemo<FocusedImageRef[]>(() => {
    const refs: FocusedImageRef[] = []
    for (const pkg of orderedRootScopedPackages) {
      pkg.images.forEach((_, imageIndex) => {
        refs.push({ packageId: pkg.id, imageIndex })
      })
    }
    return refs
  }, [orderedRootScopedPackages])

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
    packageById,
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
  })

  const backendPageSnapshot = backendRead.page.data ?? backendRead.page.snapshot
  const backendMetadataSnapshot = backendRead.metadata.data ?? backendRead.metadata.snapshot
  const activePackageForDisplay =
    !vectorResultsActive && backendPageSnapshot?.sourceId
      ? (packageById.get(backendPageSnapshot.sourceId) ?? activePackage)
      : activePackage
  const refsInPageEffective = !vectorResultsActive && backendPageSnapshot ? backendPageSnapshot.refs : refsInPage
  const pageStartEffective =
    !vectorResultsActive && backendPageSnapshot
      ? backendPageSnapshot.pageIndex * Math.max(1, pagedPageSize)
      : pageStart
  const normalizedPageIndexEffective =
    !vectorResultsActive && backendPageSnapshot ? backendPageSnapshot.pageIndex : normalizedPageIndex
  const imageTotalPagesEffective =
    !vectorResultsActive && backendPageSnapshot
      ? (showNamesOnly
          ? 1
          : Math.max(1, Math.ceil(backendPageSnapshot.totalItems / Math.max(1, pagedPageSize))))
      : imageTotalPages
  const metadataImageEffective = imageFocusActive ? (backendMetadataSnapshot?.image ?? focusedImage) : focusedImage
  const metadataImagePackageEffective =
    imageFocusActive
      ? (backendMetadataSnapshot?.package ?? metadataImagePackage)
      : metadataImagePackage
  const currentGradeEffective = imageFocusActive ? (backendMetadataSnapshot?.grade ?? currentGrade) : currentGrade
  const focusedVideo = videoById.get(selectedVideoId) ?? videosForSidebar[0] ?? null
  const focusedVideoDurationSec = focusedVideo
    ? Math.max(0, videoDurationById[focusedVideo.id] ?? focusedVideo.durationSec)
    : 0
  const focusedVideoCoverColor = focusedVideo
    ? (videoCoverById[focusedVideo.id] ?? focusedVideo.coverColor ?? '#3f4b58')
    : '#3f4b58'
  const focusedVideoEffective = focusedVideo
    ? {
        ...focusedVideo,
        durationSec: focusedVideoDurationSec,
        coverColor: focusedVideoCoverColor,
      }
    : null

  const applyPackageGrade = useCallback(
    (grade: number | null) => {
      const targetPackageId = metadataImagePackageEffective?.id
      if (!targetPackageId) {
        return
      }
      void backendWrite.writePackageGrade(targetPackageId, grade)
    },
    [backendWrite, metadataImagePackageEffective],
  )

  const mediaResolveTargets = useMemo<MediaResolveTarget[]>(() => {
    const targets: MediaResolveTarget[] = []
    const seenTargetIds = new Set<string>()

    const pushImageTarget = (ref: FocusedImageRef) => {
      const image = packageById.get(ref.packageId)?.images[ref.imageIndex]
      if (!image) {
        return
      }

      const targetId = `image:${image.id}`
      if (seenTargetIds.has(targetId)) {
        return
      }
      seenTargetIds.add(targetId)
      targets.push({
        targetId,
        locator: image.mediaLocator,
      })
    }

    for (const ref of refsInPageEffective) {
      pushImageTarget(ref)
    }

    if (metadataImageEffective && metadataImagePackageEffective) {
      const targetId = `image:${metadataImageEffective.id}`
      if (!seenTargetIds.has(targetId)) {
        seenTargetIds.add(targetId)
        targets.push({
          targetId,
          locator: metadataImageEffective.mediaLocator,
        })
      }
    }

    if (focusedImage && focusedImagePackage) {
      const targetId = `image:${focusedImage.id}`
      if (!seenTargetIds.has(targetId)) {
        seenTargetIds.add(targetId)
        targets.push({
          targetId,
          locator: focusedImage.mediaLocator,
        })
      }
    }

    if (focusedVideo) {
      const targetId = `video:${focusedVideo.id}`
      if (!seenTargetIds.has(targetId)) {
        seenTargetIds.add(targetId)
        targets.push({
          targetId,
          locator: focusedVideo.mediaLocator,
        })
      }
    }

    return targets
  }, [focusedImage, focusedImagePackage, focusedVideo, metadataImageEffective, metadataImagePackageEffective, packageById, refsInPageEffective])

  const resolvedMedia = useResolvedMediaUrls({
    repository: mediaRepository,
    targets: mediaResolveTargets,
  })

  const imageUrlById = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {}
    for (const [targetId, url] of Object.entries(resolvedMedia.urlByTargetId)) {
      if (!targetId.startsWith('image:')) {
        continue
      }
      next[targetId.slice('image:'.length)] = url
    }
    return next
  }, [resolvedMedia.urlByTargetId])

  const metadataImageSrc = metadataImageEffective ? (imageUrlById[metadataImageEffective.id] ?? null) : null
  const fullscreenImageSrc = focusedImage ? (imageUrlById[focusedImage.id] ?? null) : null
  const focusedVideoSrc = focusedVideo ? (resolvedMedia.urlByTargetId[`video:${focusedVideo.id}`] ?? null) : null

  const shortcutConflicts = useMemo(() => findShortcutConflicts(shortcuts), [shortcuts])
  const vectorControlConflicts = useMemo(() => findVectorControlConflicts(vectorControls), [vectorControls])

  const videoShortcutActive =
    fullscreenActive && (fullscreenDisplay === 'video-only' || (fullscreenDisplay === 'dual' && fullscreenVideoFocus))

  const applyAutoplayIntervalByIndex = useCallback(
    (index: 0 | 1 | 2 | 3 | 4) => {
      const seconds = AUTO_PLAY_PRESETS[index]
      updateSettings({ autoPlayInterval: seconds, autoPlayEnabled: true })
    },
    [updateSettings],
  )

  const requestFullscreenAlign = useCallback((direction: FullscreenAlignDirection) => {
    setFullscreenAlignRequest((previous) => ({
      id: (previous?.id ?? 0) + 1,
      direction,
    }))
  }, [])

  const runVectorSearch = useCallback(() => {
    if (mode !== 'image' || !focusedRef) {
      return
    }

    const rankedCandidates = buildVectorCandidates(focusedRef, allScopedRefs, packageById)
    const anchorCandidate = rankedCandidates[0]
    if (!anchorCandidate) {
      setVectorSearchResults([])
      return
    }

    const filteredResults = [
      anchorCandidate,
      ...rankedCandidates.slice(1).filter((candidate) => candidate.score >= vectorThreshold),
    ]

    setVectorSearchResults(filteredResults)
    setVectorFocusIndex(0)
    setVectorPage(0)
    setSearchPanelMode('vector')
    setImageFocus(anchorCandidate.packageId, anchorCandidate.imageIndex)
    updateSettings({ vectorMode: true, sidebarFocus: 'main' })
  }, [allScopedRefs, focusedRef, mode, packageById, setImageFocus, setSearchPanelMode, updateSettings, vectorThreshold])

  const goToFromSearchMode = useCallback(() => {
    if (mode !== 'image') {
      return
    }

    if (vectorResultsActive) {
      if (!focusedRef) {
        return
      }

      const targetPackageId = focusedRef.packageId
      const targetNodeId = normalImageSourceNodeIdMap.get(targetPackageId) ?? null

      setSelectedPackageId(targetPackageId)
      setImageFocus(targetPackageId, focusedRef.imageIndex)
      setVectorSearchResults([])
      setVectorFocusIndex(0)
      setVectorPage(0)
      setSearchPanelMode('vector')
      updateSettings({ vectorMode: false, sidebarFocus: 'main' })

      if (targetNodeId) {
        setSelectedSidebarNodeId(targetNodeId)
      }
      return
    }

    if (featureSearchActive) {
      const targetNodeId = selectedSidebarNodeId
      setVectorSearchResults([])
      setVectorFocusIndex(0)
      setVectorPage(0)
      setSearchPanelMode('vector')
      updateSettings({ vectorMode: false, sidebarFocus: 'main' })
      if (targetNodeId) {
        setSelectedSidebarNodeId(targetNodeId)
      }
    }
  }, [
    featureSearchActive,
    focusedRef,
    mode,
    normalImageSourceNodeIdMap,
    selectedSidebarNodeId,
    setImageFocus,
    setSearchPanelMode,
    updateSettings,
    vectorResultsActive,
  ])

  const vectorUniverseScopeRefs = useMemo<FocusedImageRef[]>(() => {
    if (vectorResultsActive) {
      const refs: FocusedImageRef[] = []
      const seen = new Set<string>()

      for (const candidate of vectorSearchResults) {
        const key = `${candidate.packageId}:${candidate.imageIndex}`
        if (seen.has(key)) {
          continue
        }
        seen.add(key)
        refs.push({
          packageId: candidate.packageId,
          imageIndex: candidate.imageIndex,
        })
      }

      return refs
    }

    const refs: FocusedImageRef[] = []
    for (const pkg of orderedRootScopedPackages) {
      pkg.images.forEach((_, imageIndex) => {
        refs.push({
          packageId: pkg.id,
          imageIndex,
        })
      })
    }

    return refs
  }, [orderedRootScopedPackages, vectorResultsActive, vectorSearchResults])

  const vectorUniverseSceneSettings = useMemo(
    () => ({
      moveSpeed: vectorUniverseMoveSpeed,
      sprintMultiplier: vectorUniverseSprintMultiplier,
      lookSensitivity: vectorUniverseLookSensitivity,
      raycastDistance: vectorUniverseRaycastDistance,
      dispersion: vectorUniverseDispersion,
    }),
    [
      vectorUniverseDispersion,
      vectorUniverseLookSensitivity,
      vectorUniverseMoveSpeed,
      vectorUniverseRaycastDistance,
      vectorUniverseSprintMultiplier,
    ],
  )

  const confirmVectorUniverseSelection = useCallback(
    (ref: FocusedImageRef) => {
      const targetNodeId = normalImageSourceNodeIdMap.get(ref.packageId) ?? null

      setVectorUniverseOpen(false)
      setVectorSearchResults([])
      setVectorFocusIndex(0)
      setVectorPage(0)
      setSearchPanelMode('vector')

      updateSettings({
        mode: 'image',
        vectorMode: false,
        sidebarFocus: 'main',
      })

      setImageFocus(ref.packageId, ref.imageIndex)
      if (targetNodeId) {
        setSelectedSidebarNodeId(targetNodeId)
      }
    },
    [normalImageSourceNodeIdMap, setImageFocus, setSearchPanelMode, updateSettings],
  )


  useShortcutEngine({
    shortcuts,
    suspended: vectorUniverseOpen,
    mode,
    vectorMode: vectorResultsActive,
    settingsOpen,
    sidebarFocus,
    fullscreenActive,
    fullscreenDisplay,
    imageFocusActive,
    videoShortcutActive,
    hasFocusedImage: Boolean(focusedImage),
    handleSidebarNavigationKey,
    onSetImageFocusActive: setImageFocusActive,
    onSetFullscreenActive: setFullscreenActive,
    onToggleFullscreenPaneFocus: () => {
      if (fullscreenDisplay !== 'dual') {
        return
      }
      setFullscreenVideoFocus((value) => !value)
    },
    onToggleSidebarFocus: () => {
      if (vectorResultsActive) {
        return
      }
      updateSettings({ sidebarFocus: sidebarFocus === 'sidebar' ? 'main' : 'sidebar' })
    },
    onMoveImage: moveImage,
    onMoveImageVertical: moveImageVertical,
    onJumpImageBoundary: jumpImageBoundary,
    onGoPackage: goPackage,
    onAlignFocus: requestFullscreenAlign,
    onToggleAutoplay: () => {
      updateSettings({ autoPlayEnabled: !autoPlayEnabled })
    },
    onApplyAutoplayIntervalByIndex: applyAutoplayIntervalByIndex,
    onSetPackageGrade: applyPackageGrade,
    onToggleVideoPlaying: () => {
      setVideoPlaying((value) => !value)
    },
    onGoPlaylist: goPlaylist,
    onAdjustVideoRate: adjustVideoRate,
    onAdjustVideoVolume: adjustVideoVolume,
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

  const sidebarPanelProps = {
    mode,
    sidebarFocus,
    sidebarRatio,
    sidebarMinWidth,
    sidebarFontSize,
    sidebarCountFontSize,
    sidebarIndentStep,
    sidebarVerticalGap,
    currentRootLabel: searchResultsMode ? '检索结果' : currentRootLabel,
    selectedSidebarNodeId,
    canSetCurrentRoot,
    imageRootNodeId,
    videoRootNodeId,
    imageTreeNodes: imageTreeForSidebar,
    videoTreeNodes: videoTreeForSidebar,
    selectedPackageId,
    selectedVideoId,
    imageHighlightByNode: vectorResultsActive,
    searchResultMode: searchResultsMode,
    searchResultReadonly: searchResultsReadOnly,
    canGoToFromSearchMode: vectorResultsActive ? Boolean(focusedRef) : featureSearchActive && Boolean(selectedSidebarNodeId),
    playlistIds,
    onGoToFromSearchMode: goToFromSearchMode,
    onSelectNode: (nodeId: string) => {
      if (mode === 'image' && vectorResultsActive) {
        return
      }
      setSelectedSidebarNodeId(nodeId)
      updateSettings({ sidebarFocus: 'sidebar' })
    },
    onSelectPackage: (packageId: string) => {
      setSelectedPackageId(packageId)
    },
    onSelectVideo: (videoId: string) => {
      selectVideoFromBrowser(videoId)
    },
    onCollapseSidebar: collapseSidebar,
    onSetCurrentRoot: applyCurrentRootFromSelection,
    onResetRoot: () => {
      if (mode === 'image') {
        updateSettings({ imageRootNodeId: null })
        return
      }
      updateSettings({ videoRootNodeId: null })
    },
    onToggleVideoPlaylist: (videoId: string, checked: boolean) => {
      setPlaylistIds((previous) => {
        if (checked) {
          if (previous.includes(videoId)) {
            return previous
          }
          return [...previous, videoId]
        }
        return previous.filter((id) => id !== videoId)
      })
    },
  }

  const searchPanelProps = {
    visible: mode === 'image' && vectorMode,
    collapsed: searchPanelCollapsed,
    panelHeight: vectorPanelHeight,
    panelRef: vectorPanelRef,
    panelContentRef: vectorPanelContentRef,
    searchPanelMode,
    onSearchPanelModeChange: setSearchPanelMode,
    vectorResultCount: vectorSearchResults.length,
    featureResultCount: scopedImageSourcesEffective.length,
    focusedRef,
    focusedImagePackage,
    focusedImageOrdinal: focusedImage?.ordinal ?? null,
    onRunVectorSearch: runVectorSearch,
    vectorThreshold,
    onVectorThresholdChange: (value: number) => updateSettings({ vectorThreshold: value }),
    featureNameQuery,
    onFeatureNameQueryChange: setFeatureNameQuery,
    featureWorkTitleQuery,
    onFeatureWorkTitleQueryChange: setFeatureWorkTitleQuery,
    featureCircleQuery,
    onFeatureCircleQueryChange: setFeatureCircleQuery,
    featureAuthorQuery,
    onFeatureAuthorQueryChange: setFeatureAuthorQuery,
    featureCircleOptions,
    featureAuthorOptions,
    featureTagOptions,
    featureTagPickerOpen,
    onToggleFeatureTagPicker: () => setFeatureTagPickerOpen((value) => !value),
    featureTags,
    onClearFeatureTags: () => setFeatureTags([]),
    onToggleFeatureTag: (tag: string) => {
      setFeatureTags((previous) => {
        if (previous.includes(tag)) {
          return previous.filter((item) => item !== tag)
        }
        return [...previous, tag]
      })
    },
    featureGradeFilter,
    onFeatureGradeFilterChange: setFeatureGradeFilter,
    onCollapse: () => setSearchPanelCollapsed(true),
    onExpand: () => setSearchPanelCollapsed(false),
    onStartResize: onStartVectorPanelResize,
    layoutLocked,
  }

  const imageMainSectionProps = {
    vectorMode: vectorResultsActive,
    showNamesOnly,
    activePackage: activePackageForDisplay,
    focusedRef,
    focusedImageExists: Boolean(focusedImage),
    visibleImageRefs,
    refsInPage: refsInPageEffective,
    pageStart: pageStartEffective,
    actualCellWidth,
    actualMediaHeight,
    thumbnailColumns,
    thumbnailGap: actualThumbnailGap,
    vectorCandidates: vectorSearchResults,
    normalizedPageIndex: normalizedPageIndexEffective,
    imageTotalPages: imageTotalPagesEffective,
    packageById,
    imageUrlById,
    gridRef,
    onToggleShowNamesOnly: () => updateSettings({ showNamesOnly: !showNamesOnly }),
    onEnterFullscreen: () => setFullscreenActive(true),
    onSelectImage: (packageId: string, imageIndex: number, absoluteIndex: number) => {
      if (vectorResultsActive) {
        setVectorFocusIndex(absoluteIndex)
      }
      setImageFocus(packageId, imageIndex)
      updateSettings({ sidebarFocus: 'main' })
    },
    onPrevPage: goPrevPage,
    onNextPage: goNextPage,
  }

  const videoMainSectionProps = {
    durationSec: focusedVideoDurationSec,
    videoTime,
    videoPlaying,
    videoRate,
    videoVolume,
    videoMuted,
    videoSourceUrl: focusedVideoSrc,
    active: !fullscreenActive,
    coverColor: focusedVideoCoverColor,
    onTogglePlay: () => {
      if (!focusedVideo) {
        return
      }
      setVideoPlaying((value) => !value)
    },
    onPrevVideo: () => goPlaylist(-1),
    onNextVideo: () => goPlaylist(1),
    onSeekVideo: (time: number) => {
      setVideoTime(clamp(time, 0, focusedVideoDurationSec))
    },
    onVideoTimeUpdate: (time: number) => {
      setVideoTime(clamp(time, 0, focusedVideoDurationSec))
    },
    onVideoDurationDetected: (duration: number) => {
      if (!focusedVideo || !Number.isFinite(duration) || duration <= 0) {
        return
      }
      setVideoDurationById((previous) => ({
        ...previous,
        [focusedVideo.id]: duration,
      }))
    },
    onToggleMute: () => setVideoMuted((value) => !value),
    onChangeVolume: (volume: number) => {
      setVideoMuted(false)
      setVideoVolume(clamp(volume, 0, 100))
    },
    onChangeRate: (rate: number) => {
      setVideoRate(clamp(Number(rate.toFixed(2)), 0.1, 4))
    },
    onSaveCover: () => {
      if (!focusedVideo) {
        return
      }

      const color = makeRandomCoverColor()
      void backendWrite.saveVideoCover(focusedVideo.id, videoTime, color)
    },
    onEnterFullscreen: () => setFullscreenActive(true),
  }

  const metadataPanelProps = {
    mode,
    metadataCollapsed,
    metadataRatio,
    hasImageFocus: imageFocusActive,
    focusedImage: metadataImageEffective,
    focusedImageSrc: metadataImageSrc,
    focusedImagePackage: metadataImagePackageEffective,
    currentGrade: currentGradeEffective,
    focusedVideo: focusedVideoEffective,
    metadataTab,
    playlistIds,
    selectedVideoId,
    dragVideoId,
    videoVolume,
    videoMuted,
    videoRate,
    videoById,
    onCollapse: () => updateSettings({ metadataCollapsed: true }),
    onExpand: () => updateSettings({ metadataCollapsed: false }),
    onMetadataTabChange: setMetadataTab,
    onSelectVideo: selectVideoFromBrowser,
    onRemoveVideoFromPlaylist: (videoId: string) => {
      setPlaylistIds((previous) => previous.filter((id) => id !== videoId))
    },
    onDragStart: setDragVideoId,
    onDropToVideo: (targetVideoId: string) => {
      if (!dragVideoId || dragVideoId === targetVideoId) {
        return
      }

      setPlaylistIds((previous) => {
        const from = previous.indexOf(dragVideoId)
        const to = previous.indexOf(targetVideoId)
        if (from < 0 || to < 0) {
          return previous
        }

        const next = [...previous]
        next.splice(from, 1)
        next.splice(to, 0, dragVideoId)
        return next
      })
    },
  }

  const mainFooter = (
    <>
      {mode === 'image' && focusedImage && focusedImagePackage ? (
        <>
          <span>
            {focusedImage.mediaLocator.kind === 'filesystem'
              ? focusedImage.mediaLocator.absolutePath
              : `${focusedImage.mediaLocator.archivePath} #${focusedImage.ordinal}`}
          </span>
          <span>{`${focusedImage.sizeKb}KB`}</span>
          <span>{`${focusedImage.width}x${focusedImage.height}`}</span>
        </>
      ) : null}

      {mode === 'video' && focusedVideo ? (
        <>
          <span>{focusedVideo.absolutePath}</span>
          <span>{`${focusedVideo.sizeMb}MB`}</span>
          <span>{`${focusedVideo.width}x${focusedVideo.height}`}</span>
        </>
      ) : null}
    </>
  )

  const backendErrorRows = [
    backendRead.errors.library
      ? {
          key: 'library',
          label: '数据快照',
          message: backendRead.errors.library,
          onRetry: backendRead.retryLibrary,
        }
      : null,
    backendRead.errors.sidebar
      ? {
          key: 'sidebar',
          label: 'Sidebar 目录树',
          message: backendRead.errors.sidebar,
          onRetry: backendRead.retrySidebar,
        }
      : null,
    backendRead.errors.page
      ? {
          key: 'page',
          label: 'Main 分页列表',
          message: backendRead.errors.page,
          onRetry: backendRead.retryPage,
        }
      : null,
    backendRead.errors.metadata
      ? {
          key: 'metadata',
          label: 'Metadata 面板',
          message: backendRead.errors.metadata,
          onRetry: backendRead.retryMetadata,
        }
      : null,
    backendWrite.errors.grade
      ? {
          key: 'grade-write',
          label: '评分写入',
          message: backendWrite.errors.grade,
          onRetry: backendWrite.clearGradeError,
        }
      : null,
    backendWrite.errors.cover
      ? {
          key: 'cover-write',
          label: '封面写入',
          message: backendWrite.errors.cover,
          onRetry: backendWrite.clearCoverError,
        }
      : null,
  ].filter((item): item is { key: string; label: string; message: string; onRetry: () => void } => Boolean(item))

  return (
    <div className="app" onDragEnter={onDragEnterImport} onDragLeave={onDragLeaveImport} onDragOver={onDragOverImport} onDrop={onDropImport}>
      <AppHeader
        headerHeight={headerHeight}
        mode={mode}
        searchPanelOpen={vectorMode && mode === 'image'}
        vectorUniverseOpen={vectorUniverseOpen}
        currentGrade={currentGradeEffective}
        thumbnailScaleLevel={displayThumbnailScaleLevel}
        canThumbnailScaleDown={canThumbnailScaleDown}
        canThumbnailScaleUp={canThumbnailScaleUp}
        autoPlayEnabled={autoPlayEnabled}
        autoPlayInterval={autoPlayInterval}
        importMenuOpen={importMenuOpen}
        autoPlayPresets={AUTO_PLAY_PRESETS}
        onToggleImportMenu={() => setImportMenuOpen((value) => !value)}
        onCloseImportMenu={() => setImportMenuOpen(false)}
        onImportFiles={openImportFilesDialog}
        onImportFolders={openImportFoldersDialog}
        onModeChange={(nextMode) => updateSettings({ mode: nextMode })}
        onToggleSearchPanel={() => {
          const nextOpen = !vectorMode
          updateSettings({ vectorMode: nextOpen })
          if (nextOpen) {
            setSearchPanelMode('vector')
            setSearchPanelCollapsed(false)
          }
        }}
        onOpenVectorUniverse={() => {
          setVectorUniverseOpen(true)
        }}
        onGradeChange={applyPackageGrade}
        onThumbnailScaleDown={() => {
          updateSettings({ thumbnailScale: clamp(thumbnailScale + 1, 1, thumbnailScaleLevelCount) })
        }}
        onThumbnailScaleUp={() => {
          updateSettings({ thumbnailScale: clamp(thumbnailScale - 1, 1, thumbnailScaleLevelCount) })
        }}
        onAutoPlayEnabledChange={(enabled) => updateSettings({ autoPlayEnabled: enabled })}
        onAutoPlayIntervalChange={(value) => updateSettings({ autoPlayInterval: value })}
        onOpenSettings={() => updateSettings({ settingsOpen: true })}
      />

      <input
        ref={fileImportInputRef}
        multiple
        style={{ display: 'none' }}
        type="file"
        onChange={onImportFilesSelected}
      />
      <input
        ref={folderImportInputRef}
        multiple
        style={{ display: 'none' }}
        type="file"
        onChange={onImportFoldersSelected}
      />

      {backendErrorRows.length > 0 ? (
        <section className="backend-error-banner" role="status" aria-live="polite">
          <header>
            <strong>{`后端读取异常（${repositoryMode}）`}</strong>
          </header>
          <ul>
            {backendErrorRows.map((row) => (
              <li key={row.key}>
                <span>{`${row.label}: ${row.message}`}</span>
                <button type="button" onClick={row.onRetry}>
                  重试
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <AppWorkspace
        mode={mode}
        headerHeight={headerHeight}
        sidebarCollapsed={sidebarCollapsed}
        sidebarFocus={sidebarFocus}
        sidebarRatio={sidebarRatio}
        metadataCollapsed={metadataCollapsed}
        metadataRatio={metadataRatio}
        layoutLocked={layoutLocked}
        appBodyRef={appBodyRef}
        workspaceRef={workspaceRef}
        workspaceBodyRef={workspaceBodyRef}
        onExpandSidebar={onExpandSidebar}
        onStartSidebarResize={onStartSidebarResize}
        onStartMetadataResize={onStartMetadataResize}
        sidebarPanelProps={sidebarPanelProps}
        searchPanelProps={searchPanelProps}
        imageMainSectionProps={imageMainSectionProps}
        videoMainSectionProps={videoMainSectionProps}
        metadataPanelProps={metadataPanelProps}
        mainFooter={mainFooter}
      />

      <FullscreenLayer
        mode={mode}
        fullscreenActive={fullscreenActive}
        showFullscreenFooter={showFullscreenFooter}
        fullscreenDisplay={fullscreenDisplay}
        fullscreenEntryDisplay={fullscreenEntryDisplay}
        fullscreenAlignRequest={fullscreenAlignRequest}
        fullscreenSwapped={fullscreenSwapped}
        fullscreenVideoFocus={fullscreenVideoFocus}
        fullscreenSplit={fullscreenSplit}
        focusedImage={focusedImage}
        focusedImageSrc={fullscreenImageSrc}
        focusedVideo={focusedVideoEffective}
        focusedVideoSrc={focusedVideoSrc}
        durationSec={focusedVideoDurationSec}
        focusedVideoCoverColor={focusedVideoCoverColor}
        videoTime={videoTime}
        videoPlaying={videoPlaying}
        videoRate={videoRate}
        videoVolume={videoVolume}
        videoMuted={videoMuted}
        autoPlayEnabled={autoPlayEnabled}
        autoPlayInterval={autoPlayInterval}
        autoPlayPresets={AUTO_PLAY_PRESETS}
        onSetFooterVisible={setShowFullscreenFooter}
        onSetDisplay={setFullscreenDisplay}
        onToggleSwapSides={() => setFullscreenSwapped((value) => !value)}
        onSetVideoFocus={setFullscreenVideoFocus}
        onSetSplit={setFullscreenSplit}
        onPrevImage={() => moveImage(-1)}
        onNextImage={() => moveImage(1)}
        onPrevPackage={() => goPackage(-1)}
        onNextPackage={() => goPackage(1)}
        onToggleAutoplay={() => {
          updateSettings({ autoPlayEnabled: !autoPlayEnabled })
        }}
        onSetAutoplayInterval={(seconds) => {
          updateSettings({ autoPlayInterval: seconds, autoPlayEnabled: true })
        }}
        onToggleVideoPlay={() => setVideoPlaying((value) => !value)}
        onPrevVideo={() => goPlaylist(-1)}
        onNextVideo={() => goPlaylist(1)}
        onSeekVideo={(time) => {
          setVideoTime(clamp(time, 0, focusedVideoDurationSec))
        }}
        onVideoTimeUpdate={(time) => {
          setVideoTime(clamp(time, 0, focusedVideoDurationSec))
        }}
        onVideoDurationDetected={(duration) => {
          if (!focusedVideo || !Number.isFinite(duration) || duration <= 0) {
            return
          }
          setVideoDurationById((previous) => ({
            ...previous,
            [focusedVideo.id]: duration,
          }))
        }}
        onToggleVideoMute={() => setVideoMuted((value) => !value)}
        onChangeVideoVolume={(volume) => {
          setVideoMuted(false)
          setVideoVolume(clamp(volume, 0, 100))
        }}
        onChangeVideoRate={(rate) => {
          setVideoRate(clamp(Number(rate.toFixed(2)), 0.1, 4))
        }}
        onExit={() => setFullscreenActive(false)}
      />

      <VectorUniverseOverlay
        open={vectorUniverseOpen}
        focusedRef={focusedRef}
        imageSources={imageSources}
        scopeRefs={vectorUniverseScopeRefs}
        helperScale={vectorUniverseHelperScale}
        sceneSettings={vectorUniverseSceneSettings}
        widgetSize={vectorUniverseWidgetSize}
        vectorControls={vectorControls}
        onClose={() => setVectorUniverseOpen(false)}
        onConfirmSelection={confirmVectorUniverseSelection}
      />

      <SettingsPanel
        settingsOpen={settingsOpen}
        headerHeight={headerHeight}
        settingsFontSize={settingsFontSize}
        sidebarRatio={sidebarRatio}
        sidebarMinWidth={sidebarMinWidth}
        layoutLocked={layoutLocked}
        sidebarFontSize={sidebarFontSize}
        sidebarCountFontSize={sidebarCountFontSize}
        sidebarIndentStep={sidebarIndentStep}
        sidebarVerticalGap={sidebarVerticalGap}
        metadataRatio={metadataRatio}
        vectorPanelHeight={vectorPanelHeight}
        thumbnailGap={thumbnailGap}
        thumbnailQuality={thumbnailQuality}
        thumbnailWidth={thumbnailWidth}
        lmStudioEndpoint={lmStudioEndpoint}
        lmStudioModel={lmStudioModel}
        vectorUniverseMoveSpeed={vectorUniverseMoveSpeed}
        vectorUniverseSprintMultiplier={vectorUniverseSprintMultiplier}
        vectorUniverseLookSensitivity={vectorUniverseLookSensitivity}
        vectorUniverseRaycastDistance={vectorUniverseRaycastDistance}
        vectorUniverseHelperScale={vectorUniverseHelperScale}
        vectorUniverseDispersion={vectorUniverseDispersion}
        vectorUniverseWidgetSize={vectorUniverseWidgetSize}
        shortcuts={shortcuts}
        shortcutConflicts={shortcutConflicts}
        vectorControls={vectorControls}
        vectorControlConflicts={vectorControlConflicts}
        onClose={() => updateSettings({ settingsOpen: false })}
        onHeaderHeightChange={(value) => updateSettings({ headerHeight: value })}
        onSettingsFontSizeChange={(value) => updateSettings({ settingsFontSize: value })}
        onSidebarRatioChange={applySidebarRatio}
        onSidebarMinWidthChange={(value) => updateSettings({ sidebarMinWidth: value })}
        onLayoutLockedChange={(value) => updateSettings({ layoutLocked: value })}
        onSidebarFontSizeChange={(value) => updateSettings({ sidebarFontSize: value })}
        onSidebarCountFontSizeChange={(value) => updateSettings({ sidebarCountFontSize: value })}
        onSidebarIndentStepChange={(value) => updateSettings({ sidebarIndentStep: value })}
        onSidebarVerticalGapChange={(value) => updateSettings({ sidebarVerticalGap: value })}
        onMetadataRatioChange={applyMetadataRatio}
        onVectorPanelHeightChange={(value) => updateSettings({ vectorPanelHeight: value })}
        onThumbnailGapChange={(value) => updateSettings({ thumbnailGap: value })}
        onThumbnailQualityChange={(value) => updateSettings({ thumbnailQuality: value })}
        onThumbnailWidthChange={(value) => updateSettings({ thumbnailWidth: value })}
        onLmStudioEndpointChange={(value) => updateSettings({ lmStudioEndpoint: value })}
        onLmStudioModelChange={(value) => updateSettings({ lmStudioModel: value })}
        onVectorUniverseMoveSpeedChange={(value) => updateSettings({ vectorUniverseMoveSpeed: value })}
        onVectorUniverseSprintMultiplierChange={(value) => updateSettings({ vectorUniverseSprintMultiplier: value })}
        onVectorUniverseLookSensitivityChange={(value) => updateSettings({ vectorUniverseLookSensitivity: value })}
        onVectorUniverseRaycastDistanceChange={(value) => updateSettings({ vectorUniverseRaycastDistance: value })}
        onVectorUniverseHelperScaleChange={(value) => updateSettings({ vectorUniverseHelperScale: value })}
        onVectorUniverseDispersionChange={(value) => updateSettings({ vectorUniverseDispersion: value })}
        onVectorUniverseWidgetSizeChange={(value) => updateSettings({ vectorUniverseWidgetSize: value })}
        onSetShortcut={setShortcut}
        onSetVectorControl={setVectorControl}
        onResetShortcuts={resetShortcuts}
        onResetVectorControls={resetVectorControls}
      />

      {dragOverlayActive ? (
        <div className="drop-overlay" aria-hidden="true">
          <div className="drop-overlay-card">
            <strong>导入层占位</strong>
            <p>检测到拖拽输入，后续将替换为 Shader/CSS 动画反馈</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
