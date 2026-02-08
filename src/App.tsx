import {
  Suspense,
  useCallback,
  useEffect,
  lazy,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useShallow } from 'zustand/react/shallow'

import './App.css'
import AppHeader from './components/AppHeader'
import AppWorkspace from './components/AppWorkspace'
import FullscreenLayer from './components/FullscreenLayer'
import BackendErrorBanner from './components/BackendErrorBanner'
import ImportTaskPanel from './components/ImportTaskPanel'
import RuntimeWarningBanner from './components/RuntimeWarningBanner'
import SettingsPanel from './components/SettingsPanel'
import E2eBenchController from './bench/E2eBenchController'
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
} from './features/app/helpers'
import { buildAppHeaderProps } from './features/app/buildAppHeaderProps'
import { buildBackendErrorRows } from './features/app/buildBackendErrorRows'
import { buildFullscreenLayerProps } from './features/app/buildFullscreenLayerProps'
import { buildImageMainSectionProps } from './features/app/buildImageMainSectionProps'
import { buildImportTaskPanelProps } from './features/app/buildImportTaskPanelProps'
import { buildMainFooter } from './features/app/buildMainFooter'
import { buildMetadataPanelProps } from './features/app/buildMetadataPanelProps'
import { buildSearchPanelProps } from './features/app/buildSearchPanelProps'
import { buildSidebarPanelProps } from './features/app/buildSidebarPanelProps'
import { buildSettingsPanelProps } from './features/app/buildSettingsPanelProps'
import { buildVideoMainSectionProps } from './features/app/buildVideoMainSectionProps'
import {
  buildCoverImageLocator,
  computeResponsiveZoomFactor,
  normalizePathForCompare,
  RESPONSIVE_ZOOM_EPSILON,
} from './features/app/mediaPathUtils'
import { useMetadataWriteBindings } from './features/app/useMetadataWriteBindings'
import { useImportTaskPanelState } from './features/app/useImportTaskPanelState'
import { useAppEffects } from './features/app/useAppEffects'
import { useImageBrowserViewModel } from './features/app/useImageBrowserViewModel'
import { useDatabaseResetAction } from './features/app/useDatabaseResetAction'
import { useRuntimeWarningDismiss } from './features/app/useRuntimeWarningDismiss'
import { useImportPipeline } from './features/import/useImportPipeline'
import { usePaneResizers } from './features/layout/usePaneResizers'
import { computeThumbnailGridLayout } from './features/layout/thumbnailLayout'
import { useMediaState } from './features/media/useMediaState'
import { usePlaylistPersistence } from './features/media/usePlaylistPersistence'
import { useFeatureSearch } from './features/search/useFeatureSearch'
import { useSidebarNavigation } from './features/sidebar/useSidebarNavigation'
import { useShortcutEngine } from './features/shortcuts/useShortcutEngine'
import {
  createMediaRepository,
  type MediaResolveTarget,
  mapLibrarySnapshotDto,
  useResolvedMediaUrls,
  useRuntimeCapabilities,
  useReadOnlyDataAccess,
  useWriteDataAccess,
} from './features/backend'
import { getBenchSettings } from './features/perf/benchSettings'
import { useUiStore } from './store/useUiStore'
import type {
  FocusedImageRef,
  ImagePackage,
  SidebarNode,
  VectorCandidate,
} from './types'
import { clamp } from './utils/ui'

const VectorUniverseOverlay = lazy(() => import('./components/VectorUniverseOverlay'))

const AUTO_PLAY_PRESETS = [1, 2, 3, 5, 8]
const SIDEBAR_COLLAPSE_RATIO = 0.03
const EMPTY_FEATURE_TAGS: string[] = []
const MEDIA_RESOLVE_MAX_CONCURRENT = 8
type FullscreenAlignDirection = 'up' | 'down' | 'left' | 'right'

function App() {
  const benchSettings = getBenchSettings()
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
  const fallbackImagePackages = useMemo(() => (repositoryMode === 'real' ? [] : IMAGE_PACKAGES), [repositoryMode])
  const fallbackImageDirectories = useMemo(
    () => (repositoryMode === 'real' ? [] : IMAGE_DIRECTORY_SOURCES),
    [repositoryMode],
  )
  const fallbackVideos = useMemo(() => (repositoryMode === 'real' ? [] : VIDEO_ITEMS), [repositoryMode])
  const imageSources = useMemo(
    () =>
      bootstrapLibrarySnapshot
        ? [...bootstrapLibrarySnapshot.imagePackages, ...bootstrapLibrarySnapshot.imageDirectories]
        : [...fallbackImagePackages, ...fallbackImageDirectories],
    [bootstrapLibrarySnapshot, fallbackImageDirectories, fallbackImagePackages],
  )
  const bootstrapImagePackages = useMemo(
    () => bootstrapLibrarySnapshot?.imagePackages ?? fallbackImagePackages,
    [bootstrapLibrarySnapshot, fallbackImagePackages],
  )
  const bootstrapImageDirectories = useMemo(
    () => bootstrapLibrarySnapshot?.imageDirectories ?? fallbackImageDirectories,
    [bootstrapLibrarySnapshot, fallbackImageDirectories],
  )
  const bootstrapVideos = useMemo(
    () => bootstrapLibrarySnapshot?.videos ?? fallbackVideos,
    [bootstrapLibrarySnapshot, fallbackVideos],
  )
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
  const [dismissedImportTaskIds, setDismissedImportTaskIds] = useState<Record<string, true>>({})
  const [importTaskPanelOpen, setImportTaskPanelOpen] = useState(false)
  const [archiveLoadStatus, setArchiveLoadStatus] = useState<{
    runningArchivePath: string | null
    pendingArchivePaths: string[]
  }>({
    runningArchivePath: null,
    pendingArchivePaths: [],
  })
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
  const previousFullscreenActiveRef = useRef(fullscreenActive)

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

  useEffect(() => {
    if (!mediaRepository.readArchiveLoadStatus) {
      return
    }

    let disposed = false
    let runningRequest = false

    const refreshArchiveLoadStatus = async () => {
      if (disposed || runningRequest) {
        return
      }

      runningRequest = true
      try {
        const status = await mediaRepository.readArchiveLoadStatus?.({ timeoutMs: 3_000 })
        if (!disposed && status) {
          setArchiveLoadStatus({
            runningArchivePath: status.running_archive_path,
            pendingArchivePaths: status.pending_archive_paths,
          })
        }
      } catch {
        if (!disposed) {
          setArchiveLoadStatus({
            runningArchivePath: null,
            pendingArchivePaths: [],
          })
        }
      } finally {
        runningRequest = false
      }
    }

    void refreshArchiveLoadStatus()
    const intervalId = window.setInterval(() => {
      void refreshArchiveLoadStatus()
    }, 900)
    const unsubscribe = mediaRepository.onLibraryChanged?.(() => {
      void refreshArchiveLoadStatus()
    })

    return () => {
      disposed = true
      window.clearInterval(intervalId)
      unsubscribe?.()
    }
  }, [mediaRepository])

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
  const responsiveZoomFactorRef = useRef(1)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.mediaPlayerView?.setZoomFactor) {
      return
    }

    let rafId = 0
    responsiveZoomFactorRef.current = 1

    const applyZoom = () => {
      const stableWidth = window.innerWidth * responsiveZoomFactorRef.current
      const stableHeight = window.innerHeight * responsiveZoomFactorRef.current
      const nextFactor = computeResponsiveZoomFactor(stableWidth, stableHeight)
      if (Math.abs(nextFactor - responsiveZoomFactorRef.current) < RESPONSIVE_ZOOM_EPSILON) {
        return
      }

      responsiveZoomFactorRef.current = nextFactor
      window.mediaPlayerView?.setZoomFactor(nextFactor)
    }

    applyZoom()

    const onResize = () => {
      window.cancelAnimationFrame(rafId)
      rafId = window.requestAnimationFrame(applyZoom)
    }

    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.cancelAnimationFrame(rafId)
      responsiveZoomFactorRef.current = 1
      window.mediaPlayerView?.setZoomFactor(1)
    }
  }, [])
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

  const sidebarSnapshot = backendRead.sidebar.data ?? backendRead.sidebar.snapshot
  const scopedSearchPackagesEffective = sidebarSnapshot?.imagePackages ?? bootstrapImagePackages
  const scopedSearchDirectoriesEffective = sidebarSnapshot?.imageDirectories ?? bootstrapImageDirectories
  const scopedImageSourcesEffective = useMemo(
    () => [...scopedSearchPackagesEffective, ...scopedSearchDirectoriesEffective],
    [scopedSearchDirectoriesEffective, scopedSearchPackagesEffective],
  )
  const librarySnapshotEffective = backendRead.library.data ?? backendRead.library.snapshot ?? bootstrapLibrarySnapshot
  const videosEffective = librarySnapshotEffective?.videos ?? bootstrapVideos
  const packageByIdEffective = useMemo(
    () => new Map(scopedImageSourcesEffective.map((source) => [source.id, source])),
    [scopedImageSourcesEffective],
  )
  const videoByIdEffective = useMemo(() => new Map(videosEffective.map((video) => [video.id, video])), [videosEffective])
  const sidebarTreeSnapshot = sidebarSnapshot?.tree ?? null

  useEffect(() => {
    const nextSourceIds = new Set(scopedImageSourcesEffective.map((source) => source.id))

    setFocusByPackage((previous) => {
      const next: Record<string, number> = {}
      let changed = false

      for (const source of scopedImageSourcesEffective) {
        const hadPrev = Object.prototype.hasOwnProperty.call(previous, source.id)
        const prevValue = previous[source.id] ?? 0
        const nextValue = clamp(prevValue, 0, Math.max(0, source.images.length - 1))
        next[source.id] = nextValue
        if (!hadPrev || nextValue !== prevValue) {
          changed = true
        }
      }

      for (const key of Object.keys(previous)) {
        if (!nextSourceIds.has(key)) {
          changed = true
          break
        }
      }

      return changed ? next : previous
    })

    setPageByPackage((previous) => {
      const next: Record<string, number> = {}
      let changed = false

      for (const source of scopedImageSourcesEffective) {
        const hadPrev = Object.prototype.hasOwnProperty.call(previous, source.id)
        const prevValue = previous[source.id] ?? 0
        const nextValue = Math.max(0, prevValue)
        next[source.id] = nextValue
        if (!hadPrev || nextValue !== prevValue) {
          changed = true
        }
      }

      for (const key of Object.keys(previous)) {
        if (!nextSourceIds.has(key)) {
          changed = true
          break
        }
      }

      return changed ? next : previous
    })

    setGradeByPackage((previous) => {
      const next: Record<string, number | null> = {}
      let changed = false

      for (const source of scopedImageSourcesEffective) {
        if (Object.prototype.hasOwnProperty.call(previous, source.id)) {
          next[source.id] = previous[source.id] ?? null
          continue
        }

        next[source.id] = source.mockGrade ?? null
        changed = true
      }

      for (const key of Object.keys(previous)) {
        if (!nextSourceIds.has(key)) {
          changed = true
          break
        }
      }

      return changed ? next : previous
    })
  }, [scopedImageSourcesEffective])

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
        const pkg = packageByIdEffective.get(packageId)
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
  }, [packageByIdEffective, vectorSearchResults])

  const vectorSidebarNodes = vectorSidebarState.nodes
  const vectorResultPackageNodeIdMap = vectorSidebarState.packageNodeIdMap

  const imageTreeForSidebar = useMemo(() => {
    if (vectorResultsActive) {
      return vectorSidebarNodes
    }
    return imageTreeForSidebarNormal
  }, [imageTreeForSidebarNormal, vectorResultsActive, vectorSidebarNodes])

  const imageNodeLoadStateById = useMemo(() => {
    const pendingPathSet = new Set(archiveLoadStatus.pendingArchivePaths.map((value) => normalizePathForCompare(value)))
    const runningPath = archiveLoadStatus.runningArchivePath
      ? normalizePathForCompare(archiveLoadStatus.runningArchivePath)
      : null

    const packageLoadStateBySourceId = new Map<string, 'pending' | 'running'>()

    for (const source of scopedImageSourcesEffective) {
      const normalizedPath = normalizePathForCompare(source.absolutePath)
      const lowerPath = normalizedPath.toLowerCase()
      const isRar7z = lowerPath.endsWith('.rar') || lowerPath.endsWith('.7z')
      if (!isRar7z) {
        continue
      }

      if (runningPath && normalizedPath === runningPath) {
        packageLoadStateBySourceId.set(source.id, 'running')
        continue
      }

      if (pendingPathSet.has(normalizedPath) || source.images.length === 0) {
        packageLoadStateBySourceId.set(source.id, 'pending')
      }
    }

    const nodeStateById: Record<string, 'pending' | 'running'> = {}
    const walk = (nodes: SidebarNode[]): ('pending' | 'running' | null)[] =>
      nodes.map((node) => {
        let state: 'pending' | 'running' | null = null

        if (node.imageSourceId) {
          state = packageLoadStateBySourceId.get(node.imageSourceId) ?? null
        }

        const childStates = walk(node.children)
        for (const childState of childStates) {
          if (childState === 'running') {
            state = 'running'
            break
          }
          if (childState === 'pending' && !state) {
            state = 'pending'
          }
        }

        if (state) {
          nodeStateById[node.id] = state
        }

        return state
      })

    walk(imageTreeForSidebar)
    return nodeStateById
  }, [archiveLoadStatus.pendingArchivePaths, archiveLoadStatus.runningArchivePath, imageTreeForSidebar, scopedImageSourcesEffective])

  const searchedVideos = useMemo(() => videosEffective, [videosEffective])

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
      if (!rootScopedPackageIds.has(sourceId) || !packageByIdEffective.has(sourceId)) {
        continue
      }
      seen.add(sourceId)
      orderedIds.push(sourceId)
    }

    if (orderedIds.length > 0) {
      return orderedIds
    }

    return rootScopedPackages.map((pkg) => pkg.id)
  }, [flatSidebarNodes, packageByIdEffective, rootScopedPackageIds, rootScopedPackages])

  const orderedRootScopedPackages = useMemo(
    () =>
      sidebarOrderedImageSourceIds
        .map((sourceId) => packageByIdEffective.get(sourceId))
        .filter((pkg): pkg is ImagePackage => Boolean(pkg)),
    [packageByIdEffective, sidebarOrderedImageSourceIds],
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

  const runtimeCapabilities = useRuntimeCapabilities({
    repository: mediaRepository,
  })

  const backendPageSnapshot = backendRead.page.data ?? backendRead.page.snapshot
  const backendMetadataSnapshot = backendRead.metadata.data ?? backendRead.metadata.snapshot
  const metadataSnapshotMatchesFocus = Boolean(
    imageFocusActive &&
      focusedRef &&
      backendMetadataSnapshot &&
      backendMetadataSnapshot.package.id === focusedRef.packageId &&
      backendMetadataSnapshot.image.id === focusedImage?.id,
  )
  const activePackageForDisplay =
    !vectorResultsActive && backendPageSnapshot?.sourceId
      ? (packageByIdEffective.get(backendPageSnapshot.sourceId) ?? activePackage)
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
  const metadataImageEffective =
    imageFocusActive && metadataSnapshotMatchesFocus ? backendMetadataSnapshot?.image ?? focusedImage : focusedImage
  const metadataImagePackageEffective =
    imageFocusActive && metadataSnapshotMatchesFocus
      ? (backendMetadataSnapshot?.package ?? metadataImagePackage)
      : metadataImagePackage
  const currentGradeEffective =
    imageFocusActive && metadataSnapshotMatchesFocus
      ? (backendMetadataSnapshot?.grade ?? currentGrade)
      : currentGrade
  const focusedVideo = videoByIdEffective.get(selectedVideoId) ?? videosForSidebar[0] ?? null
  const focusedVideoDurationSec = focusedVideo
    ? Math.max(0, videoDurationById[focusedVideo.id] ?? focusedVideo.durationSec)
    : 0
  const focusedVideoCoverColor = focusedVideo
    ? (videoCoverById[focusedVideo.id] ?? focusedVideo.coverColor ?? '#3f4b58')
    : '#3f4b58'
  const focusedVideoCoverImagePath = focusedVideo
    ? (videoCoverImageById[focusedVideo.id] ?? focusedVideo.coverImagePath ?? null)
    : null
  const focusedVideoCoverImageLocator = useMemo(
    () => buildCoverImageLocator(focusedVideoCoverImagePath),
    [focusedVideoCoverImagePath],
  )
  const focusedVideoEffective = useMemo(
    () =>
      focusedVideo
        ? {
            ...focusedVideo,
            durationSec: focusedVideoDurationSec,
            coverColor: focusedVideoCoverColor,
            coverImagePath: focusedVideoCoverImagePath,
          }
        : null,
    [focusedVideo, focusedVideoCoverColor, focusedVideoCoverImagePath, focusedVideoDurationSec],
  )

  const metadataWriteBindings = useMetadataWriteBindings({
    backendWrite,
    metadataImagePackageId: metadataImagePackageEffective?.id ?? null,
    focusedVideoId: focusedVideoEffective?.id ?? null,
  })

  const mediaResolveTargets = useMemo<MediaResolveTarget[]>(() => {
    const targetById = new Map<string, MediaResolveTarget>()
    const priorityTargets: MediaResolveTarget[] = []
    const normalTargets: MediaResolveTarget[] = []
    const thumbnailMaxEdge = Math.max(96, Math.ceil(Math.max(actualCellWidth, actualMediaHeight)))

    const pushTarget = (target: MediaResolveTarget, priority = false) => {
      if (targetById.has(target.targetId)) {
        return
      }
      targetById.set(target.targetId, target)
      if (priority) {
        priorityTargets.push(target)
      } else {
        normalTargets.push(target)
      }
    }

    const pushThumbnailImageTarget = (ref: FocusedImageRef) => {
      const image = packageByIdEffective.get(ref.packageId)?.images[ref.imageIndex]
      if (!image) {
        return
      }

      pushTarget({
        targetId: `image-thumb:${image.id}`,
        locator: image.mediaLocator,
        variant: 'thumbnail',
        thumbnailMaxEdge,
        thumbnailQuality: 82,
      })
    }

    const pushOriginalImageTarget = (image: typeof focusedImage) => {
      if (!image) {
        return
      }

      pushTarget(
        {
          targetId: `image-original:${image.id}`,
          locator: image.mediaLocator,
          variant: 'original',
        },
        true,
      )
    }

    const pushOriginalImageTargetByRef = (ref: FocusedImageRef | null | undefined, priority = false) => {
      if (!ref) {
        return
      }
      const image = packageByIdEffective.get(ref.packageId)?.images[ref.imageIndex]
      if (!image) {
        return
      }
      pushTarget(
        {
          targetId: `image-original:${image.id}`,
          locator: image.mediaLocator,
          variant: 'original',
        },
        priority,
      )
    }

    pushOriginalImageTarget(focusedImage)
    pushOriginalImageTarget(metadataImageEffective)

    if (focusedRef && orderedRootScopedImageRefs.length > 0) {
      const focusedIndex = orderedRootScopedImageRefs.findIndex(
        (ref) => ref.packageId === focusedRef.packageId && ref.imageIndex === focusedRef.imageIndex,
      )
      if (focusedIndex >= 0) {
        const prefetchRadius = fullscreenActive ? 4 : 2
        for (let offset = 1; offset <= prefetchRadius; offset += 1) {
          pushOriginalImageTargetByRef(orderedRootScopedImageRefs[focusedIndex + offset], true)
          pushOriginalImageTargetByRef(orderedRootScopedImageRefs[focusedIndex - offset], true)
        }
      }
    }

    if (!showNamesOnly) {
      for (const ref of refsInPageEffective) {
        pushThumbnailImageTarget(ref)
      }
    }

    if (focusedVideo) {
      pushTarget(
        {
          targetId: `video:${focusedVideo.id}`,
          locator: focusedVideo.mediaLocator,
          variant: 'original',
        },
        true,
      )

      if (focusedVideoCoverImageLocator) {
        pushTarget(
          {
            targetId: `video-cover:${focusedVideo.id}`,
            locator: focusedVideoCoverImageLocator,
            variant: 'original',
          },
          true,
        )
      }
    }

    return [...priorityTargets, ...normalTargets]
  }, [
    actualCellWidth,
    actualMediaHeight,
    focusedImage,
    focusedVideo,
    focusedVideoCoverImageLocator,
    metadataImageEffective,
    focusedRef,
    fullscreenActive,
    orderedRootScopedImageRefs,
    packageByIdEffective,
    refsInPageEffective,
    showNamesOnly,
  ])

  const resolvedMedia = useResolvedMediaUrls({
    repository: mediaRepository,
    targets: mediaResolveTargets,
    options: benchSettings.enabled
        ? benchSettings.resolvedMedia
        : {
          applyMode: 'raf',
          stateScope: 'active-only',
          maxConcurrent: MEDIA_RESOLVE_MAX_CONCURRENT,
        },
  })

  const thumbnailImageUrlById = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {}
    for (const [targetId, url] of Object.entries(resolvedMedia.urlByTargetId)) {
      if (!targetId.startsWith('image-thumb:')) {
        continue
      }
      next[targetId.slice('image-thumb:'.length)] = url
    }
    return next
  }, [resolvedMedia.urlByTargetId])

  const originalImageUrlById = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {}
    for (const [targetId, url] of Object.entries(resolvedMedia.urlByTargetId)) {
      if (!targetId.startsWith('image-original:')) {
        continue
      }
      next[targetId.slice('image-original:'.length)] = url
    }
    return next
  }, [resolvedMedia.urlByTargetId])

  const videoCoverImageUrlById = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {}
    for (const [targetId, url] of Object.entries(resolvedMedia.urlByTargetId)) {
      if (!targetId.startsWith('video-cover:')) {
        continue
      }
      next[targetId.slice('video-cover:'.length)] = url
    }
    return next
  }, [resolvedMedia.urlByTargetId])

  const metadataImageSrc =
    metadataImageEffective
      ? (originalImageUrlById[metadataImageEffective.id] ?? thumbnailImageUrlById[metadataImageEffective.id] ?? null)
      : null
  const fullscreenImageSrc = focusedImage
    ? (originalImageUrlById[focusedImage.id] ?? thumbnailImageUrlById[focusedImage.id] ?? null)
    : null
  const focusedVideoSrc = focusedVideo ? (resolvedMedia.urlByTargetId[`video:${focusedVideo.id}`] ?? null) : null
  const focusedVideoCoverImageSrc = focusedVideo ? (videoCoverImageUrlById[focusedVideo.id] ?? null) : null

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

    const rankedCandidates = buildVectorCandidates(focusedRef, allScopedRefs, packageByIdEffective)
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
  }, [allScopedRefs, focusedRef, mode, packageByIdEffective, setImageFocus, setSearchPanelMode, updateSettings, vectorThreshold])

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

  useEffect(() => {
    const previous = previousFullscreenActiveRef.current
    if (previous && !fullscreenActive && autoPlayEnabled) {
      updateSettings({ autoPlayEnabled: false })
    }
    previousFullscreenActiveRef.current = fullscreenActive
  }, [autoPlayEnabled, fullscreenActive, updateSettings])

  const setFullscreenActiveWithAutoStop = useCallback(
    (value: boolean | ((previous: boolean) => boolean)) => {
      setFullscreenActive(value)
    },
    [setFullscreenActive],
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
    onSetFullscreenActive: setFullscreenActiveWithAutoStop,
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
    onSetPackageGrade: metadataWriteBindings.applyPackageGrade,
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

  const sidebarPanelProps = buildSidebarPanelProps({
    mode,
    sidebarFocus,
    sidebarRatio,
    sidebarMinWidth,
    sidebarFontSize,
    sidebarCountFontSize,
    sidebarIndentStep,
    sidebarVerticalGap,
    currentRootLabel,
    searchResultsMode,
    selectedSidebarNodeId,
    canSetCurrentRoot,
    imageRootNodeId,
    videoRootNodeId,
    imageTreeNodes: imageTreeForSidebar,
    videoTreeNodes: videoTreeForSidebar,
    imageNodeLoadStateById,
    selectedPackageId,
    selectedVideoId,
    vectorResultsActive,
    featureSearchActive,
    searchResultsReadOnly,
    focusedRef,
    playlistIds,
    goToFromSearchMode,
    setSelectedSidebarNodeId,
    updateSettings,
    setSelectedPackageId,
    selectVideoFromBrowser,
    collapseSidebar,
    applyCurrentRootFromSelection,
    setPlaylistIds,
  })

  const searchPanelProps = buildSearchPanelProps({
    mode,
    vectorMode,
    searchPanelCollapsed,
    setSearchPanelCollapsed,
    vectorPanelHeight,
    vectorPanelRef,
    vectorPanelContentRef,
    searchPanelMode,
    setSearchPanelMode,
    vectorSearchResultsCount: vectorSearchResults.length,
    featureResultCount: scopedImageSourcesEffective.length,
    focusedRef,
    focusedImagePackage,
    focusedImageOrdinal: focusedImage?.ordinal ?? null,
    runVectorSearch,
    vectorThreshold,
    updateSettings,
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
  })

  const enableLoadingSkeleton = benchSettings.enabled ? benchSettings.imageLoadingSkeleton.mode === 'replace' : true

  const imageMainSectionProps = buildImageMainSectionProps({
    vectorResultsActive,
    showNamesOnly,
    backendPageLoading: backendRead.page.loading,
    pagedPageSize,
    enableLoadingSkeleton,
    activePackageForDisplay,
    focusedRef,
    focusedImageExists: Boolean(focusedImage),
    visibleImageRefs,
    refsInPageEffective,
    pageStartEffective,
    actualCellWidth,
    actualMediaHeight,
    thumbnailColumns,
    actualThumbnailGap,
    vectorSearchResults,
    normalizedPageIndexEffective,
    imageTotalPagesEffective,
    packageByIdEffective,
    thumbnailImageUrlById,
    gridRef,
    updateSettings,
    setFullscreenActiveWithAutoStop,
    setVectorFocusIndex,
    setImageFocus,
    goPrevPage,
    goNextPage,
  })

  const videoMainSectionProps = buildVideoMainSectionProps({
    durationSec: focusedVideoDurationSec,
    videoTime,
    videoPlaying,
    videoRate,
    videoVolume,
    videoMuted,
    videoSourceUrl: focusedVideoSrc,
    active: !fullscreenActive,
    coverColor: focusedVideoCoverColor,
    coverImageUrl: focusedVideoCoverImageSrc,
    focusedVideoId: focusedVideoEffective?.id ?? null,
    setVideoPlaying,
    goPlaylist,
    setVideoTime,
    setVideoDurationById,
    setVideoMuted,
    setVideoVolume,
    setVideoRate,
    saveVideoCover: backendWrite.saveVideoCover,
    setFullscreenActiveWithAutoStop,
  })

  const metadataPanelProps = buildMetadataPanelProps({
    mode,
    metadataCollapsed,
    metadataRatio,
    hasImageFocus: imageFocusActive,
    focusedImage: metadataImageEffective,
    focusedImageSrc: metadataImageSrc,
    focusedImagePackage: metadataImagePackageEffective,
    currentGrade: currentGradeEffective,
    currentVideoGrade: focusedVideoEffective?.grade ?? null,
    metadataPending: metadataWriteBindings.metadataPending,
    focusedVideo: focusedVideoEffective,
    metadataTab,
    playlistIds,
    selectedVideoId,
    dragVideoId,
    videoVolume,
    videoMuted,
    videoRate,
    videoById: videoByIdEffective,
    updateSettings,
    onGradeChange: metadataWriteBindings.applyPackageGrade,
    onSavePackageMetadata: metadataWriteBindings.applyPackageMetadata,
    onSaveVideoMetadata: metadataWriteBindings.applyVideoMetadata,
    onMetadataTabChange: setMetadataTab,
    onSelectVideo: selectVideoFromBrowser,
    setPlaylistIds,
    setDragVideoId,
  })

  const mainFooter = buildMainFooter({
    mode,
    focusedImage,
    focusedImagePackage,
    focusedVideo: focusedVideoEffective,
  })

  const backendErrorRows = buildBackendErrorRows({
    backendRead,
    backendWrite,
    playlistPersistence,
    runtimeCapabilities,
  })

  const runtimeCapabilityWarnings = (runtimeCapabilities.data?.minimum_matrix ?? []).filter(
    (item) => item.status !== 'available',
  )
  const runtimeWarningKey = useMemo(
    () => runtimeCapabilityWarnings.map((item) => `${item.capability}|${item.status}|${item.note}`).join('||'),
    [runtimeCapabilityWarnings],
  )
  const runtimeWarningDismiss = useRuntimeWarningDismiss({
    runtimeWarningKey,
    warningCount: runtimeCapabilityWarnings.length,
  })

  const {
    activeImportTaskCount,
    importTasksForPanel,
    normalizedPendingArchivePathSet,
    normalizedRunningArchivePath,
    taskStatusLabel,
    clearFinishedImportTasks,
    clearAllImportTasks,
    retryImportTaskFromPanel,
  } = useImportTaskPanelState({
    importTasks,
    dismissedImportTaskIds,
    setDismissedImportTaskIds,
    enqueuePending,
    archiveLoadStatus,
    normalizePathForCompare,
    retryImportTask,
  })

  const { databaseResetPending, databaseResetError, clearDatabaseForDev } = useDatabaseResetAction({
    mediaRepository,
  })

  const fullscreenLayerProps = buildFullscreenLayerProps({
    mode,
    fullscreenActive,
    showFullscreenFooter,
    fullscreenDisplay,
    fullscreenEntryDisplay,
    fullscreenAlignRequest,
    fullscreenSwapped,
    fullscreenVideoFocus,
    fullscreenSplit,
    focusedImage,
    focusedImageSrc: fullscreenImageSrc,
    focusedVideo: focusedVideoEffective,
    focusedVideoSrc,
    focusedVideoCoverImageSrc,
    durationSec: focusedVideoDurationSec,
    focusedVideoCoverColor,
    videoTime,
    videoPlaying,
    videoRate,
    videoVolume,
    videoMuted,
    autoPlayEnabled,
    autoPlayInterval,
    autoPlayPresets: AUTO_PLAY_PRESETS,
    updateSettings,
    setVideoPlaying,
    goPlaylist,
    setVideoTime,
    focusedVideoId: focusedVideoEffective?.id ?? null,
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
  })

  const settingsPanelProps = buildSettingsPanelProps({
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
    thumbnailGap,
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
    shortcutConflicts,
    vectorControls,
    vectorControlConflicts,
    databaseResetPending,
    databaseResetError,
    updateSettings,
    applySidebarRatio,
    applyMetadataRatio,
    setShortcut,
    setVectorControl,
    resetShortcuts,
    resetVectorControls,
    clearDatabaseForDev,
  })

  const appHeaderProps = buildAppHeaderProps({
    headerHeight,
    mode,
    vectorMode,
    vectorUniverseOpen,
    displayThumbnailScaleLevel,
    canThumbnailScaleDown,
    canThumbnailScaleUp,
    autoPlayEnabled,
    autoPlayInterval,
    importMenuOpen,
    taskStatusLabel,
    importTaskPanelOpen,
    autoPlayPresets: AUTO_PLAY_PRESETS,
    thumbnailScale,
    thumbnailScaleLevelCount,
    setImportMenuOpen,
    setImportTaskPanelOpen,
    openImportFilesDialog,
    openImportFoldersDialog,
    updateSettings,
    setSearchPanelMode,
    setSearchPanelCollapsed,
    setVectorUniverseOpen,
  })

  const importTaskPanelProps = buildImportTaskPanelProps({
    open: importTaskPanelOpen,
    activeTaskCount: activeImportTaskCount,
    pendingArchiveCount: normalizedPendingArchivePathSet.size,
    runningArchive: Boolean(normalizedRunningArchivePath),
    enqueuePending,
    taskError,
    tasks: importTasksForPanel,
    setImportTaskPanelOpen,
    clearFinishedImportTasks,
    clearAllImportTasks,
    clearTaskError,
    retryImportTaskFromPanel,
    setDismissedImportTaskIds,
  })

  return (
    <div className="app" onDragEnter={onDragEnterImport} onDragLeave={onDragLeaveImport} onDragOver={onDragOverImport} onDrop={onDropImport}>
      <AppHeader {...appHeaderProps} />

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

      <BackendErrorBanner rows={backendErrorRows} repositoryMode={repositoryMode} />

      <RuntimeWarningBanner
        visible={runtimeWarningDismiss.visible}
        warnings={runtimeCapabilityWarnings}
        onDismiss={runtimeWarningDismiss.dismiss}
      />

      <ImportTaskPanel {...importTaskPanelProps} />

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

      <FullscreenLayer {...fullscreenLayerProps} />

      {vectorUniverseOpen ? (
        <Suspense
          fallback={
            <section className="vector-universe-overlay vector-universe-overlay-loading" role="dialog" aria-modal="true" aria-label="向量宇宙层">
              <p className="vector-universe-overlay-tip">向量宇宙模块加载中...</p>
            </section>
          }
        >
          <VectorUniverseOverlay
            open={vectorUniverseOpen}
            focusedRef={focusedRef}
            imageSources={scopedImageSourcesEffective}
            scopeRefs={vectorUniverseScopeRefs}
            helperScale={vectorUniverseHelperScale}
            sceneSettings={vectorUniverseSceneSettings}
            widgetSize={vectorUniverseWidgetSize}
            vectorControls={vectorControls}
            onClose={() => setVectorUniverseOpen(false)}
            onConfirmSelection={confirmVectorUniverseSelection}
          />
        </Suspense>
      ) : null}

      <SettingsPanel {...settingsPanelProps} />

      {dragOverlayActive ? (
        <div className="drop-overlay" aria-hidden="true">
          <div className="drop-overlay-card">
            <strong>拖拽导入</strong>
            <p>释放鼠标后将自动入队并在上方显示任务状态</p>
          </div>
        </div>
      ) : null}

      {benchSettings.enabled && benchSettings.mode === 'e2e' ? (
        <E2eBenchController
          repository={mediaRepository}
          mode={mode}
          orderedPackages={orderedRootScopedPackages}
          selectedPackageId={selectedPackageId}
          setSelectedPackageId={setSelectedPackageId}
          pageIndex={backendPageSnapshot?.pageIndex ?? null}
          totalPages={imageTotalPagesEffective}
          pageLoading={backendRead.page.loading}
          refsInPageCount={refsInPageEffective.length}
          goNextPage={goNextPage}
          goPrevPage={goPrevPage}
        />
      ) : null}
    </div>
  )
}

export default App
