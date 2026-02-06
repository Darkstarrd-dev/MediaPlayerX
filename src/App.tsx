import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { useShallow } from 'zustand/react/shallow'

import './App.css'
import AppHeader from './components/AppHeader'
import FullscreenLayer from './components/FullscreenLayer'
import ImageMainSection from './components/ImageMainSection'
import MetadataPanel from './components/MetadataPanel'
import SettingsPanel from './components/SettingsPanel'
import SidebarPanel from './components/SidebarPanel'
import VideoMainSection from './components/VideoMainSection'
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
import {
  collectImageSourceIds,
  collectLeafIds,
  packageMatchesSearch,
  videoMatchesSearch,
  makeRandomCoverColor,
} from './features/app/helpers'
import { useImportPipeline } from './features/import/useImportPipeline'
import { computeThumbnailGridLayout } from './features/layout/thumbnailLayout'
import { useMediaState } from './features/media/useMediaState'
import { useSidebarNavigation } from './features/sidebar/useSidebarNavigation'
import { useShortcutEngine } from './features/shortcuts/useShortcutEngine'
import { useUiStore } from './store/useUiStore'
import type {
  FocusedImageRef,
  ImagePackage,
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
    sidebarRatio,
    sidebarMinWidth,
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
    searchField,
    searchText,
    vectorThreshold,
    sidebarFocus,
    imageRootNodeId,
    videoRootNodeId,
    thumbnailQuality,
    thumbnailWidth,
    lmStudioEndpoint,
    lmStudioModel,
    shortcuts,
    updateSettings,
    setShortcut,
    resetShortcuts,
  } = useUiStore(
    useShallow((state) => ({
      mode: state.mode,
      vectorMode: state.vectorMode,
      settingsOpen: state.settingsOpen,
      headerHeight: state.headerHeight,
      sidebarRatio: state.sidebarRatio,
      sidebarMinWidth: state.sidebarMinWidth,
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
      searchField: state.searchField,
      searchText: state.searchText,
      vectorThreshold: state.vectorThreshold,
      sidebarFocus: state.sidebarFocus,
      imageRootNodeId: state.imageRootNodeId,
      videoRootNodeId: state.videoRootNodeId,
      thumbnailQuality: state.thumbnailQuality,
      thumbnailWidth: state.thumbnailWidth,
      lmStudioEndpoint: state.lmStudioEndpoint,
      lmStudioModel: state.lmStudioModel,
      shortcuts: state.shortcuts,
      updateSettings: state.updateSettings,
      setShortcut: state.setShortcut,
      resetShortcuts: state.resetShortcuts,
    })),
  )

  const imageSources = useMemo(() => [...IMAGE_PACKAGES, ...IMAGE_DIRECTORY_SOURCES], [])
  const packageById = useMemo(() => new Map(imageSources.map((source) => [source.id, source])), [imageSources])
  const videoById = useMemo(() => new Map(VIDEO_ITEMS.map((video) => [video.id, video])), [])

  const [selectedPackageId, setSelectedPackageId] = useState(imageSources[0]?.id ?? '')
  const [selectedSidebarNodeId, setSelectedSidebarNodeId] = useState<string | null>(null)
  const [imageFocusActive, setImageFocusActive] = useState(false)
  const [focusByPackage, setFocusByPackage] = useState<Record<string, number>>(() =>
    Object.fromEntries(imageSources.map((source) => [source.id, 0])),
  )
  const [pageByPackage, setPageByPackage] = useState<Record<string, number>>(() =>
    Object.fromEntries(imageSources.map((source) => [source.id, 0])),
  )
  const [vectorFocusIndex, setVectorFocusIndex] = useState(0)
  const [vectorPage, setVectorPage] = useState(0)
  const [gradeByPackage, setGradeByPackage] = useState<Record<string, number | null>>({})
  const [importMenuOpen, setImportMenuOpen] = useState(false)
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
    initialVideoId: VIDEO_ITEMS[0]?.id ?? '',
    initialPlaylistIds: VIDEO_ITEMS.slice(0, 3).map((item) => item.id),
    videoIds: VIDEO_ITEMS.map((item) => item.id),
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
  const workspaceBodyRef = useRef<HTMLDivElement>(null)
  const wasFullscreenRef = useRef(false)
  const lastExpandedSidebarRatioRef = useRef(sidebarRatio >= SIDEBAR_COLLAPSE_RATIO ? sidebarRatio : 0.26)
  const [appBodyWidth, setAppBodyWidth] = useState(0)
  const gridRef = useRef<HTMLDivElement>(null)
  const [gridSize, setGridSize] = useState({ width: 1200, height: 700 })

  const scopedSearchPackages = useMemo(
    () => IMAGE_PACKAGES.filter((pkg) => packageMatchesSearch(pkg, searchField, searchText)),
    [searchField, searchText],
  )

  const scopedSearchDirectories = useMemo(
    () => IMAGE_DIRECTORY_SOURCES.filter((directory) => packageMatchesSearch(directory, searchField, searchText)),
    [searchField, searchText],
  )

  const scopedImageSources = useMemo(
    () => [...scopedSearchPackages, ...scopedSearchDirectories],
    [scopedSearchDirectories, scopedSearchPackages],
  )

  const imageTreeRaw = useMemo(
    () => buildImageSidebarTree(scopedSearchPackages, scopedSearchDirectories),
    [scopedSearchDirectories, scopedSearchPackages],
  )

  const imageRootNode = useMemo(
    () => findNodeById(imageTreeRaw, imageRootNodeId),
    [imageTreeRaw, imageRootNodeId],
  )

  const rootScopedPackageIds = useMemo(() => {
    if (!imageRootNode) {
      return new Set(scopedImageSources.map((source) => source.id))
    }
    return new Set(collectImageSourceIds(imageRootNode))
  }, [imageRootNode, scopedImageSources])

  const rootScopedPackages = useMemo(
    () => scopedImageSources.filter((source) => rootScopedPackageIds.has(source.id)),
    [scopedImageSources, rootScopedPackageIds],
  )

  const focusedIndexInPackage = focusByPackage[selectedPackageId] ?? 0
  const anchorRef = useMemo<FocusedImageRef | null>(() => {
    const selectedPackage = packageById.get(selectedPackageId)
    if (!selectedPackage) {
      return null
    }
    const clampedIndex = clamp(focusedIndexInPackage, 0, selectedPackage.images.length - 1)
    return {
      packageId: selectedPackage.id,
      imageIndex: clampedIndex,
    }
  }, [focusedIndexInPackage, packageById, selectedPackageId])

  const allScopedRefs = useMemo<FocusedImageRef[]>(() => {
    const refs: FocusedImageRef[] = []
    for (const pkg of rootScopedPackages) {
      pkg.images.forEach((_, imageIndex) => {
        refs.push({ packageId: pkg.id, imageIndex })
      })
    }
    return refs
  }, [rootScopedPackages])

  const vectorCandidates = useMemo<VectorCandidate[]>(() => {
    if (!anchorRef) {
      return []
    }
    return buildVectorCandidates(anchorRef, allScopedRefs).filter((candidate) => candidate.score >= vectorThreshold)
  }, [allScopedRefs, anchorRef, vectorThreshold])

  const imageTreeForSidebar = useMemo(() => {
    if (!imageRootNode) {
      return imageTreeRaw
    }
    return [imageRootNode]
  }, [imageRootNode, imageTreeRaw])

  const searchedVideos = useMemo(
    () => VIDEO_ITEMS.filter((video) => videoMatchesSearch(video, searchText)),
    [searchText],
  )

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

  const readAppBodyWidth = useCallback(() => {
    const measured = appBodyRef.current?.getBoundingClientRect().width
    if (measured && measured > 0) {
      return measured
    }
    if (appBodyWidth > 0) {
      return appBodyWidth
    }
    return window.innerWidth
  }, [appBodyWidth])

  const normalizeSidebarRatio = useCallback(
    (candidate: number) => {
      const bounded = clamp(candidate, 0, 0.95)
      if (bounded < SIDEBAR_COLLAPSE_RATIO) {
        return 0
      }

      const bodyWidth = readAppBodyWidth()
      if (bodyWidth <= 0) {
        return Number(bounded.toFixed(3))
      }

      const minRatio = clamp(sidebarMinWidth / bodyWidth, 0, 0.95)
      return Number(Math.max(bounded, minRatio).toFixed(3))
    },
    [readAppBodyWidth, sidebarMinWidth],
  )

  const applySidebarRatio = useCallback(
    (candidate: number) => {
      const next = normalizeSidebarRatio(candidate)
      if (Math.abs(next - sidebarRatio) < 0.0005) {
        return
      }
      updateSettings({ sidebarRatio: next })
    },
    [normalizeSidebarRatio, sidebarRatio, updateSettings],
  )

  const sidebarCollapsed = sidebarRatio < SIDEBAR_COLLAPSE_RATIO

  const updateSidebarRatioByClientX = useCallback(
    (clientX: number) => {
      const bodyRect = appBodyRef.current?.getBoundingClientRect()
      if (!bodyRect || bodyRect.width <= 0) {
        return
      }

      const ratio = clamp((clientX - bodyRect.left) / bodyRect.width, 0, 0.95)
      applySidebarRatio(ratio)
    },
    [applySidebarRatio],
  )

  const onStartSidebarResize = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault()

      const onMouseMove = (moveEvent: MouseEvent) => {
        updateSidebarRatioByClientX(moveEvent.clientX)
      }

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [updateSidebarRatioByClientX],
  )

  const onExpandSidebar = useCallback(() => {
    const bodyWidth = readAppBodyWidth()
    const minRatio = bodyWidth > 0 ? clamp(sidebarMinWidth / bodyWidth, SIDEBAR_COLLAPSE_RATIO, 0.95) : SIDEBAR_COLLAPSE_RATIO
    const nextRatio = Math.max(lastExpandedSidebarRatioRef.current, minRatio)
    updateSettings({ sidebarRatio: Number(nextRatio.toFixed(3)) })
  }, [readAppBodyWidth, sidebarMinWidth, updateSettings])

  const applyMetadataRatio = useCallback(
    (candidate: number) => {
      const next = Number(clamp(candidate, 0.2, 0.45).toFixed(3))
      if (Math.abs(next - metadataRatio) < 0.0005) {
        return
      }
      updateSettings({ metadataRatio: next })
    },
    [metadataRatio, updateSettings],
  )

  const updateMetadataRatioByClientX = useCallback(
    (clientX: number) => {
      const bodyRect = workspaceBodyRef.current?.getBoundingClientRect()
      if (!bodyRect || bodyRect.width <= 0) {
        return
      }

      const ratio = (bodyRect.right - clientX) / bodyRect.width
      applyMetadataRatio(ratio)
    },
    [applyMetadataRatio],
  )

  const onStartMetadataResize = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault()

      const onMouseMove = (moveEvent: MouseEvent) => {
        updateMetadataRatioByClientX(moveEvent.clientX)
      }

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [updateMetadataRatioByClientX],
  )

  const activePackage = packageById.get(selectedPackageId) ?? orderedRootScopedPackages[0] ?? null

  const activeVectorRef = vectorCandidates[vectorFocusIndex]
  const focusedRef = useMemo<FocusedImageRef | null>(() => {
    if (mode === 'image' && vectorMode) {
      if (!activeVectorRef) {
        return null
      }
      return { packageId: activeVectorRef.packageId, imageIndex: activeVectorRef.imageIndex }
    }

    if (!activePackage || !imageFocusActive) {
      return null
    }

    return {
      packageId: activePackage.id,
      imageIndex: clamp(focusByPackage[activePackage.id] ?? 0, 0, activePackage.images.length - 1),
    }
  }, [activePackage, activeVectorRef, focusByPackage, imageFocusActive, mode, vectorMode])

  const focusedImage = useMemo(() => {
    if (!focusedRef) {
      return null
    }
    return packageById.get(focusedRef.packageId)?.images[focusedRef.imageIndex] ?? null
  }, [focusedRef, packageById])

  const focusedImagePackage = useMemo(() => {
    if (!focusedRef) {
      return null
    }
    return packageById.get(focusedRef.packageId) ?? null
  }, [focusedRef, packageById])

  const metadataImagePackage = focusedImagePackage ?? activePackage

  const focusedVideo = videoById.get(selectedVideoId) ?? videosForSidebar[0] ?? null
  const focusedVideoCoverColor = focusedVideo ? (videoCoverById[focusedVideo.id] ?? '#3f4b58') : '#3f4b58'

  const currentGrade = mode === 'image' && metadataImagePackage ? (gradeByPackage[metadataImagePackage.id] ?? null) : null

  const visibleImageRefs = useMemo(() => {
    if (mode !== 'image') {
      return [] as FocusedImageRef[]
    }

    if (vectorMode) {
      return vectorCandidates.map((candidate) => ({
        packageId: candidate.packageId,
        imageIndex: candidate.imageIndex,
      }))
    }

    if (!activePackage) {
      return [] as FocusedImageRef[]
    }

    return activePackage.images.map((_, imageIndex) => ({
      packageId: activePackage.id,
      imageIndex,
    }))
  }, [mode, vectorMode, vectorCandidates, activePackage])

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

  const imagePageIndex = showNamesOnly ? 0 : vectorMode ? vectorPage : (pageByPackage[selectedPackageId] ?? 0)
  const imageTotalPages = showNamesOnly ? 1 : Math.max(1, Math.ceil(visibleImageRefs.length / pagedPageSize))
  const normalizedPageIndex = showNamesOnly ? 0 : clamp(imagePageIndex, 0, imageTotalPages - 1)
  const pageStart = showNamesOnly ? 0 : normalizedPageIndex * pagedPageSize
  const pageEnd = showNamesOnly ? visibleImageRefs.length : pageStart + pagedPageSize
  const refsInPage = showNamesOnly ? visibleImageRefs : visibleImageRefs.slice(pageStart, pageEnd)

  const shortcutConflicts = useMemo(() => findShortcutConflicts(shortcuts), [shortcuts])

  const videoShortcutActive =
    fullscreenActive && (fullscreenDisplay === 'video-only' || (fullscreenDisplay === 'dual' && fullscreenVideoFocus))

  const setImageFocus = useCallback(
    (packageId: string, imageIndex: number) => {
      const pkg = packageById.get(packageId)
      if (!pkg) {
        return
      }

      const clampedIndex = clamp(imageIndex, 0, pkg.images.length - 1)
      setImageFocusActive(true)
      setSelectedPackageId(packageId)
      setFocusByPackage((previous) => ({
        ...previous,
        [packageId]: clampedIndex,
      }))
      setPageByPackage((previous) => ({
        ...previous,
        [packageId]: Math.floor(clampedIndex / pagedPageSize),
      }))
    },
    [packageById, pagedPageSize],
  )

  const moveImage = useCallback(
    (delta: number) => {
      if (mode !== 'image' || vectorMode) {
        return
      }

      if (!activePackage) {
        return
      }

      const current = focusByPackage[activePackage.id] ?? 0

      if (!fullscreenActive || orderedRootScopedImageRefs.length === 0) {
        setImageFocus(activePackage.id, current + delta)
        return
      }

      const currentIndex = orderedRootScopedImageRefs.findIndex(
        (ref) => ref.packageId === activePackage.id && ref.imageIndex === clamp(current, 0, activePackage.images.length - 1),
      )

      if (currentIndex < 0) {
        setImageFocus(activePackage.id, current + delta)
        return
      }

      const nextIndex = clamp(currentIndex + delta, 0, orderedRootScopedImageRefs.length - 1)
      const nextRef = orderedRootScopedImageRefs[nextIndex]
      if (!nextRef) {
        return
      }

      setImageFocus(nextRef.packageId, nextRef.imageIndex)
    },
    [activePackage, focusByPackage, fullscreenActive, mode, orderedRootScopedImageRefs, setImageFocus, vectorMode],
  )

  const moveImageVertical = useCallback(
    (direction: 'up' | 'down') => {
      if (mode !== 'image' || vectorMode) {
        return
      }

      if (!activePackage) {
        return
      }

      const step = showNamesOnly ? 1 : Math.max(1, thumbnailColumns)
      const current = focusByPackage[activePackage.id] ?? 0
      const candidate = direction === 'up' ? current - step : current + step

      if (candidate < 0) {
        setImageFocus(activePackage.id, 0)
        return
      }

      if (candidate >= activePackage.images.length) {
        setImageFocus(activePackage.id, activePackage.images.length - 1)
        return
      }

      setImageFocus(activePackage.id, candidate)
    },
    [activePackage, focusByPackage, mode, setImageFocus, showNamesOnly, thumbnailColumns, vectorMode],
  )

  const jumpImageBoundary = useCallback(
    (target: 'first' | 'last') => {
      if (mode !== 'image' || vectorMode) {
        return
      }

      if (!activePackage) {
        return
      }

      const nextIndex = target === 'first' ? 0 : activePackage.images.length - 1
      setImageFocus(activePackage.id, nextIndex)
    },
    [activePackage, mode, setImageFocus, vectorMode],
  )

  const goPackage = useCallback(
    (delta: number) => {
      if (mode !== 'image' || vectorMode) {
        return
      }

      if (orderedRootScopedPackages.length === 0) {
        return
      }

      const currentIndexInList = orderedRootScopedPackages.findIndex((pkg) => pkg.id === selectedPackageId)
      const safeCurrent = currentIndexInList >= 0 ? currentIndexInList : 0
      const nextIndex = clamp(safeCurrent + delta, 0, orderedRootScopedPackages.length - 1)
      const nextPackage = orderedRootScopedPackages[nextIndex]
      if (!nextPackage) {
        return
      }

      setSelectedPackageId(nextPackage.id)
    },
    [mode, orderedRootScopedPackages, selectedPackageId, vectorMode],
  )

  const setPackageGrade = useCallback(
    (grade: number | null) => {
      if (mode !== 'image' || !metadataImagePackage) {
        return
      }

      setGradeByPackage((previous) => ({
        ...previous,
        [metadataImagePackage.id]: grade,
      }))
    },
    [metadataImagePackage, mode],
  )

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


  useShortcutEngine({
    shortcuts,
    mode,
    vectorMode,
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
    onSetPackageGrade: setPackageGrade,
    onToggleVideoPlaying: () => {
      setVideoPlaying((value) => !value)
    },
    onGoPlaylist: goPlaylist,
    onAdjustVideoRate: adjustVideoRate,
    onAdjustVideoVolume: adjustVideoVolume,
  })

  useEffect(() => {
    if (!appBodyRef.current) {
      return
    }

    const observer = new ResizeObserver((entries) => {
      const target = entries[0]
      if (!target) {
        return
      }
      setAppBodyWidth(target.contentRect.width)
    })

    observer.observe(appBodyRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (mode !== 'image') {
      return
    }

    if (!gridRef.current) {
      return
    }

    const target = gridRef.current
    const updateGridSize = (width: number, height: number) => {
      if (width <= 1 || height <= 1) {
        return
      }

      setGridSize({ width, height })
    }

    const initialRect = target.getBoundingClientRect()
    updateGridSize(initialRect.width, initialRect.height)

    const observer = new ResizeObserver((entries) => {
      const target = entries[0]
      if (!target) {
        return
      }

      updateGridSize(target.contentRect.width, target.contentRect.height)
    })

    observer.observe(target)
    return () => observer.disconnect()
  }, [mode, showNamesOnly])

  useEffect(() => {
    if (sidebarRatio >= SIDEBAR_COLLAPSE_RATIO) {
      lastExpandedSidebarRatioRef.current = sidebarRatio
    }
  }, [sidebarRatio])

  useEffect(() => {
    const normalized = normalizeSidebarRatio(sidebarRatio)
    if (Math.abs(normalized - sidebarRatio) < 0.0005) {
      return
    }
    updateSettings({ sidebarRatio: normalized })
  }, [normalizeSidebarRatio, sidebarRatio, updateSettings])

  useEffect(() => {
    if (!sidebarCollapsed || sidebarFocus !== 'sidebar') {
      return
    }
    updateSettings({ sidebarFocus: 'main' })
  }, [sidebarCollapsed, sidebarFocus, updateSettings])

  useEffect(() => {
    if (thumbnailScale === normalizedThumbnailScale) {
      return
    }
    updateSettings({ thumbnailScale: normalizedThumbnailScale })
  }, [normalizedThumbnailScale, thumbnailScale, updateSettings])

  useEffect(() => {
    if (!activePackage || showNamesOnly) {
      return
    }

    const focused = clamp(focusByPackage[activePackage.id] ?? 0, 0, activePackage.images.length - 1)
    setPageByPackage((previous) => ({
      ...previous,
      [activePackage.id]: Math.floor(focused / pagedPageSize),
    }))
  }, [activePackage, focusByPackage, pagedPageSize, showNamesOnly])

  useEffect(() => {
    if (vectorCandidates.length === 0) {
      setVectorFocusIndex(0)
      setVectorPage(0)
      return
    }

    setVectorFocusIndex((value) => clamp(value, 0, vectorCandidates.length - 1))
  }, [vectorCandidates.length])

  useEffect(() => {
    if (!vectorMode) {
      return
    }

    if (showNamesOnly) {
      setVectorPage(0)
      return
    }

    setVectorPage(Math.floor(vectorFocusIndex / pagedPageSize))
  }, [pagedPageSize, showNamesOnly, vectorFocusIndex, vectorMode])

  useEffect(() => {
    if (orderedRootScopedPackages.length === 0) {
      return
    }

    if (!rootScopedPackageIds.has(selectedPackageId)) {
      setSelectedPackageId(orderedRootScopedPackages[0].id)
    }
  }, [orderedRootScopedPackages, rootScopedPackageIds, selectedPackageId])

  useEffect(() => {
    if (mode !== 'image') {
      return
    }

    if (selectedSidebarNodeId && sidebarNodeById.has(selectedSidebarNodeId)) {
      return
    }

    const fallbackNodeId = imageSourceNodeIdMap.get(selectedPackageId) ?? flatSidebarNodes[0]?.id ?? null
    if (fallbackNodeId !== selectedSidebarNodeId) {
      setSelectedSidebarNodeId(fallbackNodeId)
    }
  }, [
    flatSidebarNodes,
    imageSourceNodeIdMap,
    mode,
    selectedPackageId,
    selectedSidebarNodeId,
    sidebarNodeById,
  ])

  useEffect(() => {
    if (videosForSidebar.length === 0) {
      return
    }

    if (!rootScopedVideoIds.has(selectedVideoId)) {
      selectVideoFromBrowser(videosForSidebar[0].id)
    }
  }, [rootScopedVideoIds, selectVideoFromBrowser, selectedVideoId, videosForSidebar])

  useEffect(() => {
    if (mode !== 'video') {
      return
    }

    if (selectedSidebarNodeId && sidebarNodeById.has(selectedSidebarNodeId)) {
      return
    }

    const fallbackNodeId = videoNodeIdMap.get(selectedVideoId) ?? flatSidebarNodes[0]?.id ?? null
    if (fallbackNodeId !== selectedSidebarNodeId) {
      setSelectedSidebarNodeId(fallbackNodeId)
    }
  }, [flatSidebarNodes, mode, selectedSidebarNodeId, selectedVideoId, sidebarNodeById, videoNodeIdMap])

  useEffect(() => {
    if (sidebarCollapsed || sidebarFocus !== 'sidebar' || !selectedSidebarNodeId) {
      return
    }
    ensureSidebarNodeVisible(selectedSidebarNodeId)
  }, [ensureSidebarNodeVisible, selectedSidebarNodeId, sidebarCollapsed, sidebarFocus])

  useEffect(() => {
    const enteringFullscreen = fullscreenActive && !wasFullscreenRef.current
    if (enteringFullscreen) {
      const entryDisplay = mode === 'video' ? 'video-only' : 'image-only'
      setFullscreenEntryDisplay(entryDisplay)
      setFullscreenDisplay(entryDisplay)
      setFullscreenVideoFocus(mode === 'video')
      setFullscreenSwapped(false)
      setShowFullscreenFooter(false)
    }
    wasFullscreenRef.current = fullscreenActive
  }, [
    fullscreenActive,
    mode,
    setFullscreenEntryDisplay,
    setFullscreenDisplay,
    setFullscreenSwapped,
    setFullscreenVideoFocus,
    setShowFullscreenFooter,
  ])

  useEffect(() => {
    if (mode !== 'image' || !autoPlayEnabled) {
      return
    }

    const timer = window.setInterval(() => {
      moveImage(1)
    }, autoPlayInterval * 1000)

    return () => window.clearInterval(timer)
  }, [autoPlayEnabled, autoPlayInterval, mode, moveImage])

  useEffect(() => {
    if (!videoPlaying || !focusedVideo) {
      return
    }

    const timer = window.setInterval(() => {
      setVideoTime((value) => {
        const next = value + 0.2 * videoRate
        if (next >= focusedVideo.durationSec) {
          goPlaylist(1)
          return 0
        }
        return next
      })
    }, 200)

    return () => window.clearInterval(timer)
  }, [focusedVideo, goPlaylist, setVideoTime, videoPlaying, videoRate])

  return (
    <div className="app" onDragEnter={onDragEnterImport} onDragLeave={onDragLeaveImport} onDragOver={onDragOverImport} onDrop={onDropImport}>
      <AppHeader
        headerHeight={headerHeight}
        mode={mode}
        vectorMode={vectorMode}
        searchField={searchField}
        searchText={searchText}
        currentGrade={currentGrade}
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
        onVectorModeChange={(enabled) => updateSettings({ vectorMode: enabled })}
        onSearchFieldChange={(field) => updateSettings({ searchField: field })}
        onSearchTextChange={(text) => updateSettings({ searchText: text })}
        onGradeChange={setPackageGrade}
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

      <div className="app-body" ref={appBodyRef} style={{ height: `calc(100vh - ${headerHeight}px)` }}>
        {sidebarCollapsed ? (
          <button aria-label="展开目录" className="sidebar-expand-btn" type="button" onClick={onExpandSidebar}>
            <span className="sidebar-expand-tip">展开目录</span>
          </button>
        ) : (
          <>
            <SidebarPanel
              mode={mode}
              sidebarFocus={sidebarFocus}
              sidebarRatio={sidebarRatio}
              sidebarMinWidth={sidebarMinWidth}
              sidebarFontSize={sidebarFontSize}
              sidebarCountFontSize={sidebarCountFontSize}
              sidebarIndentStep={sidebarIndentStep}
              sidebarVerticalGap={sidebarVerticalGap}
              currentRootLabel={currentRootLabel}
              selectedSidebarNodeId={selectedSidebarNodeId}
              canSetCurrentRoot={canSetCurrentRoot}
              imageRootNodeId={imageRootNodeId}
              videoRootNodeId={videoRootNodeId}
              imageTreeNodes={imageTreeForSidebar}
              videoTreeNodes={videoTreeForSidebar}
              selectedPackageId={selectedPackageId}
              selectedVideoId={selectedVideoId}
              playlistIds={playlistIds}
              onSelectNode={(nodeId) => {
                setSelectedSidebarNodeId(nodeId)
                updateSettings({ sidebarFocus: 'sidebar' })
              }}
              onSelectPackage={(packageId) => {
                setSelectedPackageId(packageId)
              }}
              onSelectVideo={(videoId) => {
                selectVideoFromBrowser(videoId)
              }}
              onCollapseSidebar={collapseSidebar}
              onSetCurrentRoot={applyCurrentRootFromSelection}
              onResetRoot={() => {
                if (mode === 'image') {
                  updateSettings({ imageRootNodeId: null })
                  return
                }
                updateSettings({ videoRootNodeId: null })
              }}
              onToggleVideoPlaylist={(videoId, checked) => {
                setPlaylistIds((previous) => {
                  if (checked) {
                    if (previous.includes(videoId)) {
                      return previous
                    }
                    return [...previous, videoId]
                  }
                  return previous.filter((id) => id !== videoId)
                })
              }}
            />

            <div
              aria-label="调整 Sidebar 宽度"
              aria-orientation="vertical"
              className="sidebar-splitter"
              role="separator"
              tabIndex={-1}
              onMouseDown={onStartSidebarResize}
            />
          </>
        )}

        <section
          className={`workspace ${sidebarFocus === 'main' ? 'is-focus' : ''}`}
          style={{ width: sidebarCollapsed ? '100%' : `calc(${(1 - sidebarRatio) * 100}% - 8px)` }}
        >
          {mode === 'image' && vectorMode ? (
            <div className="vector-panel" style={{ height: `${vectorPanelHeight}px` }}>
              <div className="vector-top-row">
                <strong>向量检索容器（虚拟）</strong>
                <span>{`当前结果: ${vectorCandidates.length} 张`}</span>
              </div>
              <label>
                阈值 {vectorThreshold.toFixed(2)}
                <input
                  max={0.98}
                  min={0.2}
                  step={0.01}
                  type="range"
                  value={vectorThreshold}
                  onChange={(event) => updateSettings({ vectorThreshold: Number(event.target.value) })}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  console.info('模拟向量任务面板：手动触发重建 / 范围选择')
                }}
              >
                打开向量任务面板（模拟）
              </button>
            </div>
          ) : null}

          <div className="workspace-body" ref={workspaceBodyRef}>
            <main className="main-pane" style={{ width: metadataCollapsed ? '100%' : `calc(${(1 - metadataRatio) * 100}% - 8px)` }}>
              {mode === 'image' ? (
                <ImageMainSection
                  vectorMode={vectorMode}
                  showNamesOnly={showNamesOnly}
                  activePackage={activePackage}
                  focusedRef={focusedRef}
                  focusedImageExists={Boolean(focusedImage)}
                  visibleImageRefs={visibleImageRefs}
                  refsInPage={refsInPage}
                  pageStart={pageStart}
                  actualCellWidth={actualCellWidth}
                  actualMediaHeight={actualMediaHeight}
                  thumbnailColumns={thumbnailColumns}
                  thumbnailGap={actualThumbnailGap}
                  vectorCandidates={vectorCandidates}
                  normalizedPageIndex={normalizedPageIndex}
                  imageTotalPages={imageTotalPages}
                  packageById={packageById}
                  gridRef={gridRef}
                  onToggleShowNamesOnly={() => updateSettings({ showNamesOnly: !showNamesOnly })}
                  onEnterFullscreen={() => setFullscreenActive(true)}
                  onSelectImage={(packageId, imageIndex, absoluteIndex) => {
                    if (vectorMode) {
                      setVectorFocusIndex(absoluteIndex)
                    }
                    setImageFocus(packageId, imageIndex)
                    updateSettings({ sidebarFocus: 'main' })
                  }}
                  onPrevPage={() => {
                    if (showNamesOnly) {
                      return
                    }
                    if (vectorMode) {
                      setVectorPage((value) => clamp(value - 1, 0, imageTotalPages - 1))
                      return
                    }
                    setPageByPackage((previous) => ({
                      ...previous,
                      [selectedPackageId]: clamp((previous[selectedPackageId] ?? 0) - 1, 0, imageTotalPages - 1),
                    }))
                  }}
                  onNextPage={() => {
                    if (showNamesOnly) {
                      return
                    }
                    if (vectorMode) {
                      setVectorPage((value) => clamp(value + 1, 0, imageTotalPages - 1))
                      return
                    }
                    setPageByPackage((previous) => ({
                      ...previous,
                      [selectedPackageId]: clamp((previous[selectedPackageId] ?? 0) + 1, 0, imageTotalPages - 1),
                    }))
                  }}
                />
              ) : (
                <VideoMainSection
                  focusedVideo={focusedVideo}
                  videoTime={videoTime}
                  videoPlaying={videoPlaying}
                  videoRate={videoRate}
                  videoVolume={videoVolume}
                  videoMuted={videoMuted}
                  coverColor={focusedVideoCoverColor}
                  onTogglePlay={() => {
                    if (!focusedVideo) {
                      return
                    }
                    setVideoPlaying((value) => !value)
                  }}
                  onPrevVideo={() => goPlaylist(-1)}
                  onNextVideo={() => goPlaylist(1)}
                  onSeekVideo={(time) => {
                    const duration = focusedVideo?.durationSec ?? 0
                    setVideoTime(clamp(time, 0, duration))
                  }}
                  onToggleMute={() => setVideoMuted((value) => !value)}
                  onChangeVolume={(volume) => {
                    setVideoMuted(false)
                    setVideoVolume(clamp(volume, 0, 100))
                  }}
                  onChangeRate={(rate) => {
                    setVideoRate(clamp(Number(rate.toFixed(2)), 0.1, 4))
                  }}
                  onSaveCover={() => {
                    if (!focusedVideo) {
                      return
                    }

                    const color = makeRandomCoverColor()
                    setVideoCoverById((previous) => ({
                      ...previous,
                      [focusedVideo.id]: color,
                    }))
                    console.info('模拟 Save as cover', {
                      videoId: focusedVideo.id,
                      time: videoTime,
                      coverColor: color,
                    })
                  }}
                  onEnterFullscreen={() => setFullscreenActive(true)}
                />
              )}

              <footer className="main-footer">
                {mode === 'image' && focusedImage && focusedImagePackage ? (
                  <>
                    <span>{`${focusedImagePackage.absolutePath} #${focusedImage.ordinal}`}</span>
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
              </footer>
            </main>

            {metadataCollapsed ? null : (
              <div
                aria-label="调整元数据面板宽度"
                aria-orientation="vertical"
                className="metadata-splitter"
                role="separator"
                tabIndex={-1}
                onMouseDown={onStartMetadataResize}
              />
            )}

            <MetadataPanel
              mode={mode}
              metadataCollapsed={metadataCollapsed}
              metadataRatio={metadataRatio}
              hasImageFocus={imageFocusActive}
              focusedImage={focusedImage}
              focusedImagePackage={metadataImagePackage}
              currentGrade={currentGrade}
              focusedVideo={focusedVideo}
              metadataTab={metadataTab}
              playlistIds={playlistIds}
              selectedVideoId={selectedVideoId}
              dragVideoId={dragVideoId}
              videoVolume={videoVolume}
              videoMuted={videoMuted}
              videoRate={videoRate}
              videoById={videoById}
              onCollapse={() => updateSettings({ metadataCollapsed: true })}
              onExpand={() => updateSettings({ metadataCollapsed: false })}
              onMetadataTabChange={setMetadataTab}
              onSelectVideo={selectVideoFromBrowser}
              onRemoveVideoFromPlaylist={(videoId) => {
                setPlaylistIds((previous) => previous.filter((id) => id !== videoId))
              }}
              onDragStart={setDragVideoId}
              onDropToVideo={(targetVideoId) => {
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
              }}
            />
          </div>
        </section>
      </div>

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
        focusedVideo={focusedVideo}
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
          const duration = focusedVideo?.durationSec ?? 0
          setVideoTime(clamp(time, 0, duration))
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

      <SettingsPanel
        settingsOpen={settingsOpen}
        headerHeight={headerHeight}
        sidebarRatio={sidebarRatio}
        sidebarMinWidth={sidebarMinWidth}
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
        shortcuts={shortcuts}
        shortcutConflicts={shortcutConflicts}
        onClose={() => updateSettings({ settingsOpen: false })}
        onHeaderHeightChange={(value) => updateSettings({ headerHeight: value })}
        onSidebarRatioChange={applySidebarRatio}
        onSidebarMinWidthChange={(value) => updateSettings({ sidebarMinWidth: value })}
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
        onSetShortcut={setShortcut}
        onResetShortcuts={resetShortcuts}
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
