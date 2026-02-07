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
  const [vectorSearchResults, setVectorSearchResults] = useState<VectorCandidate[]>([])
  const [vectorFocusIndex, setVectorFocusIndex] = useState(0)
  const [vectorPage, setVectorPage] = useState(0)
  const [gradeByPackage, setGradeByPackage] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(imageSources.map((source) => [source.id, source.mockGrade ?? null])),
  )
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
  const workspaceRef = useRef<HTMLElement>(null)
  const workspaceBodyRef = useRef<HTMLDivElement>(null)
  const vectorPanelRef = useRef<HTMLDivElement>(null)
  const vectorPanelContentRef = useRef<HTMLDivElement>(null)
  const wasFullscreenRef = useRef(false)
  const lastExpandedSidebarRatioRef = useRef(sidebarRatio >= SIDEBAR_COLLAPSE_RATIO ? sidebarRatio : 0.26)
  const [appBodyWidth, setAppBodyWidth] = useState(0)
  const gridRef = useRef<HTMLDivElement>(null)
  const [gridSize, setGridSize] = useState({ width: 1200, height: 700 })
  const [searchPanelMode, setSearchPanelMode] = useState<'vector' | 'feature'>('vector')

  const [featureNameQuery, setFeatureNameQuery] = useState('')
  const [featureWorkTitleQuery, setFeatureWorkTitleQuery] = useState('')
  const [featureCircleQuery, setFeatureCircleQuery] = useState('')
  const [featureAuthorQuery, setFeatureAuthorQuery] = useState('')
  const [featureTags, setFeatureTags] = useState<string[]>([])
  const [featureGradeFilter, setFeatureGradeFilter] = useState<number | null>(null)
  const [featureTagPickerOpen, setFeatureTagPickerOpen] = useState(false)
  const [searchPanelCollapsed, setSearchPanelCollapsed] = useState(false)

  useEffect(() => {
    if (!vectorMode || searchPanelMode !== 'feature') {
      setFeatureTagPickerOpen(false)
    }
  }, [searchPanelMode, vectorMode])

  const featureSearchActive = mode === 'image' && vectorMode && searchPanelMode === 'feature'

  const featureCircleOptions = useMemo(
    () => Array.from(new Set(imageSources.map((source) => source.circle))).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [imageSources],
  )
  const featureAuthorOptions = useMemo(
    () => Array.from(new Set(imageSources.map((source) => source.author))).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [imageSources],
  )
  const featureTagOptions = useMemo(
    () => Array.from(new Set(imageSources.flatMap((source) => source.tags))).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [imageSources],
  )

  const scopedSearchPackages = useMemo(() => {
    if (!featureSearchActive) {
      return IMAGE_PACKAGES
    }

    const nameQuery = featureNameQuery.trim().toLowerCase()
    const workTitleQuery = featureWorkTitleQuery.trim().toLowerCase()
    const circleQuery = featureCircleQuery.trim().toLowerCase()
    const authorQuery = featureAuthorQuery.trim().toLowerCase()
    const selectedTags = featureTags.map((tag) => tag.toLowerCase())

    const match = (pkg: ImagePackage) => {
      if (nameQuery) {
        const matchesName = [pkg.packageName, pkg.displayName].some((value) => value.toLowerCase().includes(nameQuery))
        if (!matchesName) {
          return false
        }
      }

      if (workTitleQuery && !pkg.workTitle.toLowerCase().includes(workTitleQuery)) {
        return false
      }

      if (circleQuery && !pkg.circle.toLowerCase().includes(circleQuery)) {
        return false
      }

      if (authorQuery && !pkg.author.toLowerCase().includes(authorQuery)) {
        return false
      }

      if (selectedTags.length > 0) {
        const lowerTags = pkg.tags.map((tag) => tag.toLowerCase())
        const allTagsMatched = selectedTags.every((tag) => lowerTags.includes(tag))
        if (!allTagsMatched) {
          return false
        }
      }

      if (featureGradeFilter !== null) {
        const grade = gradeByPackage[pkg.id] ?? 0
        if (grade !== featureGradeFilter) {
          return false
        }
      }

      return true
    }

    return IMAGE_PACKAGES.filter(match)
  }, [
    featureAuthorQuery,
    featureCircleQuery,
    featureGradeFilter,
    featureNameQuery,
    featureSearchActive,
    featureTags,
    featureWorkTitleQuery,
    gradeByPackage,
  ])

  const scopedSearchDirectories = useMemo(() => {
    if (!featureSearchActive) {
      return IMAGE_DIRECTORY_SOURCES
    }

    const nameQuery = featureNameQuery.trim().toLowerCase()
    const workTitleQuery = featureWorkTitleQuery.trim().toLowerCase()
    const circleQuery = featureCircleQuery.trim().toLowerCase()
    const authorQuery = featureAuthorQuery.trim().toLowerCase()
    const selectedTags = featureTags.map((tag) => tag.toLowerCase())

    const match = (directory: ImagePackage) => {
      if (nameQuery) {
        const matchesName = [directory.packageName, directory.displayName].some((value) => value.toLowerCase().includes(nameQuery))
        if (!matchesName) {
          return false
        }
      }

      if (workTitleQuery && !directory.workTitle.toLowerCase().includes(workTitleQuery)) {
        return false
      }

      if (circleQuery && !directory.circle.toLowerCase().includes(circleQuery)) {
        return false
      }

      if (authorQuery && !directory.author.toLowerCase().includes(authorQuery)) {
        return false
      }

      if (selectedTags.length > 0) {
        const lowerTags = directory.tags.map((tag) => tag.toLowerCase())
        const allTagsMatched = selectedTags.every((tag) => lowerTags.includes(tag))
        if (!allTagsMatched) {
          return false
        }
      }

      if (featureGradeFilter !== null) {
        const grade = gradeByPackage[directory.id] ?? 0
        if (grade !== featureGradeFilter) {
          return false
        }
      }

      return true
    }

    return IMAGE_DIRECTORY_SOURCES.filter(match)
  }, [
    featureAuthorQuery,
    featureCircleQuery,
    featureGradeFilter,
    featureNameQuery,
    featureSearchActive,
    featureTags,
    featureWorkTitleQuery,
    gradeByPackage,
  ])

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

  const allScopedRefs = useMemo<FocusedImageRef[]>(() => {
    const refs: FocusedImageRef[] = []
    for (const pkg of rootScopedPackages) {
      pkg.images.forEach((_, imageIndex) => {
        refs.push({ packageId: pkg.id, imageIndex })
      })
    }
    return refs
  }, [rootScopedPackages])

  const vectorResultsActive = mode === 'image' && vectorMode && searchPanelMode === 'vector' && vectorSearchResults.length > 0
  const searchResultsMode = vectorResultsActive || featureSearchActive
  const searchResultsReadOnly = vectorResultsActive

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

  const searchedVideos = useMemo(() => VIDEO_ITEMS, [])

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
      if (layoutLocked) {
        return
      }
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
    [layoutLocked, updateSidebarRatioByClientX],
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
      if (layoutLocked) {
        return
      }
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
    [layoutLocked, updateMetadataRatioByClientX],
  )

  const updateVectorPanelHeightByClientY = useCallback(
    (clientY: number) => {
      const rect = workspaceRef.current?.getBoundingClientRect()
      if (!rect || rect.height <= 0) {
        return
      }

      const minHeight = 120
      const maxHeight = Math.max(minHeight, Math.min(320, Math.floor(rect.height - 120)))
      const nextHeight = clamp(Math.round(clientY - rect.top), minHeight, maxHeight)
      if (Math.abs(nextHeight - vectorPanelHeight) < 1) {
        return
      }

      updateSettings({ vectorPanelHeight: nextHeight })
    },
    [updateSettings, vectorPanelHeight],
  )

  const onStartVectorPanelResize = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (layoutLocked || searchPanelCollapsed) {
        return
      }
      event.preventDefault()

      const onMouseMove = (moveEvent: MouseEvent) => {
        updateVectorPanelHeightByClientY(moveEvent.clientY)
      }

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [layoutLocked, searchPanelCollapsed, updateVectorPanelHeightByClientY],
  )

  const activePackage = packageById.get(selectedPackageId) ?? orderedRootScopedPackages[0] ?? null

  const activeVectorRef = vectorSearchResults[vectorFocusIndex]
  const focusedRef = useMemo<FocusedImageRef | null>(() => {
    if (mode === 'image' && vectorResultsActive) {
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
  }, [activePackage, activeVectorRef, focusByPackage, imageFocusActive, mode, vectorResultsActive])

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

    if (vectorResultsActive) {
      return vectorSearchResults.map((candidate) => ({
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
  }, [mode, vectorResultsActive, vectorSearchResults, activePackage])

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

  const imagePageIndex = showNamesOnly ? 0 : vectorResultsActive ? vectorPage : (pageByPackage[selectedPackageId] ?? 0)
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
      if (mode !== 'image') {
        return
      }

      if (vectorResultsActive) {
        if (vectorSearchResults.length === 0) {
          return
        }

        const currentIndex = clamp(vectorFocusIndex, 0, vectorSearchResults.length - 1)
        const nextIndex = clamp(currentIndex + delta, 0, vectorSearchResults.length - 1)
        const nextRef = vectorSearchResults[nextIndex]
        if (!nextRef) {
          return
        }

        setVectorFocusIndex(nextIndex)
        setImageFocus(nextRef.packageId, nextRef.imageIndex)
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
    [
      activePackage,
      focusByPackage,
      fullscreenActive,
      mode,
      orderedRootScopedImageRefs,
      setImageFocus,
      vectorFocusIndex,
      vectorResultsActive,
      vectorSearchResults,
    ],
  )

  const moveImageVertical = useCallback(
    (direction: 'up' | 'down') => {
      if (mode !== 'image') {
        return
      }

      if (vectorResultsActive) {
        if (vectorSearchResults.length === 0) {
          return
        }

        const step = showNamesOnly ? 1 : Math.max(1, thumbnailColumns)
        const currentIndex = clamp(vectorFocusIndex, 0, vectorSearchResults.length - 1)
        const candidate = direction === 'up' ? currentIndex - step : currentIndex + step
        const nextIndex = clamp(candidate, 0, vectorSearchResults.length - 1)
        const nextRef = vectorSearchResults[nextIndex]
        if (!nextRef) {
          return
        }

        setVectorFocusIndex(nextIndex)
        setImageFocus(nextRef.packageId, nextRef.imageIndex)
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
    [
      activePackage,
      focusByPackage,
      mode,
      setImageFocus,
      showNamesOnly,
      thumbnailColumns,
      vectorFocusIndex,
      vectorResultsActive,
      vectorSearchResults,
    ],
  )

  const jumpImageBoundary = useCallback(
    (target: 'first' | 'last') => {
      if (mode !== 'image') {
        return
      }

      if (vectorResultsActive) {
        if (vectorSearchResults.length === 0) {
          return
        }

        const nextIndex = target === 'first' ? 0 : vectorSearchResults.length - 1
        const nextRef = vectorSearchResults[nextIndex]
        if (!nextRef) {
          return
        }

        setVectorFocusIndex(nextIndex)
        setImageFocus(nextRef.packageId, nextRef.imageIndex)
        return
      }

      if (!activePackage) {
        return
      }

      const nextIndex = target === 'first' ? 0 : activePackage.images.length - 1
      setImageFocus(activePackage.id, nextIndex)
    },
    [activePackage, mode, setImageFocus, vectorResultsActive, vectorSearchResults],
  )

  const goPackage = useCallback(
    (delta: number) => {
      if (mode !== 'image' || vectorResultsActive) {
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
    [mode, orderedRootScopedPackages, selectedPackageId, vectorResultsActive],
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
  }, [allScopedRefs, focusedRef, mode, packageById, setImageFocus, updateSettings, vectorThreshold])

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
    updateSettings,
    vectorResultsActive,
  ])


  useShortcutEngine({
    shortcuts,
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
    if (!vectorResultsActive || sidebarFocus !== 'sidebar') {
      return
    }
    updateSettings({ sidebarFocus: 'main' })
  }, [sidebarFocus, updateSettings, vectorResultsActive])

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
    if (vectorSearchResults.length === 0) {
      setVectorFocusIndex(0)
      setVectorPage(0)
      return
    }

    setVectorFocusIndex((value) => clamp(value, 0, vectorSearchResults.length - 1))
  }, [vectorSearchResults.length])

  useEffect(() => {
    if (!vectorResultsActive) {
      return
    }

    if (showNamesOnly) {
      setVectorPage(0)
      return
    }

    setVectorPage(Math.floor(vectorFocusIndex / pagedPageSize))
  }, [pagedPageSize, showNamesOnly, vectorFocusIndex, vectorResultsActive])

  useEffect(() => {
    if (!vectorResultsActive || mode !== 'image' || !focusedRef) {
      return
    }

    const sidebarNodeId = vectorResultPackageNodeIdMap.get(focusedRef.packageId)
    if (!sidebarNodeId || sidebarNodeId === selectedSidebarNodeId) {
      return
    }

    setSelectedSidebarNodeId(sidebarNodeId)
  }, [focusedRef, mode, selectedSidebarNodeId, vectorResultPackageNodeIdMap, vectorResultsActive])

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

    let fallbackNodeId: string | null
    if (vectorResultsActive) {
      fallbackNodeId = (focusedRef ? vectorResultPackageNodeIdMap.get(focusedRef.packageId) ?? null : null) ?? vectorSidebarNodes[0]?.id ?? null
    } else {
      fallbackNodeId = imageSourceNodeIdMap.get(selectedPackageId) ?? flatSidebarNodes[0]?.id ?? null
    }

    if (fallbackNodeId !== selectedSidebarNodeId) {
      setSelectedSidebarNodeId(fallbackNodeId)
    }
  }, [
    flatSidebarNodes,
    focusedRef,
    imageSourceNodeIdMap,
    mode,
    selectedPackageId,
    selectedSidebarNodeId,
    sidebarNodeById,
    vectorResultPackageNodeIdMap,
    vectorResultsActive,
    vectorSidebarNodes,
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
    if (!vectorResultsActive || sidebarCollapsed || !selectedSidebarNodeId) {
      return
    }
    ensureSidebarNodeVisible(selectedSidebarNodeId)
  }, [ensureSidebarNodeVisible, selectedSidebarNodeId, sidebarCollapsed, vectorResultsActive])

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

  useEffect(() => {
    if (mode !== 'image' && vectorMode) {
      updateSettings({ vectorMode: false })
    }
  }, [mode, updateSettings, vectorMode])

  useEffect(() => {
    if (!vectorMode && searchPanelCollapsed) {
      setSearchPanelCollapsed(false)
    }
  }, [searchPanelCollapsed, vectorMode])

  useEffect(() => {
    if (mode !== 'image' || !vectorMode || searchPanelCollapsed) {
      return
    }

    const content = vectorPanelContentRef.current
    if (!content) {
      return
    }

    const rafId = window.requestAnimationFrame(() => {
      const measured = clamp(Math.ceil(content.scrollHeight + 20), 120, 320)
      if (Math.abs(measured - vectorPanelHeight) < 1) {
        return
      }
      updateSettings({ vectorPanelHeight: measured })
    })

    return () => window.cancelAnimationFrame(rafId)
  }, [featureTagPickerOpen, mode, searchPanelCollapsed, searchPanelMode, updateSettings, vectorMode, vectorPanelHeight])

  return (
    <div className="app" onDragEnter={onDragEnterImport} onDragLeave={onDragLeaveImport} onDragOver={onDragOverImport} onDrop={onDropImport}>
      <AppHeader
        headerHeight={headerHeight}
        mode={mode}
        searchPanelOpen={vectorMode && mode === 'image'}
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
        onToggleSearchPanel={() => {
          const nextOpen = !vectorMode
          updateSettings({ vectorMode: nextOpen })
          if (nextOpen) {
            setSearchPanelMode('vector')
            setSearchPanelCollapsed(false)
          }
        }}
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
              currentRootLabel={searchResultsMode ? '检索结果' : currentRootLabel}
              selectedSidebarNodeId={selectedSidebarNodeId}
              canSetCurrentRoot={canSetCurrentRoot}
              imageRootNodeId={imageRootNodeId}
              videoRootNodeId={videoRootNodeId}
              imageTreeNodes={imageTreeForSidebar}
              videoTreeNodes={videoTreeForSidebar}
              selectedPackageId={selectedPackageId}
              selectedVideoId={selectedVideoId}
              imageHighlightByNode={vectorResultsActive}
              searchResultMode={searchResultsMode}
              searchResultReadonly={searchResultsReadOnly}
              canGoToFromSearchMode={vectorResultsActive ? Boolean(focusedRef) : featureSearchActive && Boolean(selectedSidebarNodeId)}
              playlistIds={playlistIds}
              onGoToFromSearchMode={goToFromSearchMode}
              onSelectNode={(nodeId) => {
                if (mode === 'image' && vectorResultsActive) {
                  return
                }
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
              aria-disabled={layoutLocked}
              className={`sidebar-splitter ${layoutLocked ? 'is-locked' : ''}`}
              role="separator"
              tabIndex={-1}
              onMouseDown={onStartSidebarResize}
            />
          </>
        )}

        <section
          className={`workspace ${sidebarFocus === 'main' ? 'is-focus' : ''}`}
          ref={workspaceRef}
          style={{ width: sidebarCollapsed ? '100%' : `calc(${(1 - sidebarRatio) * 100}% - 8px)` }}
        >
          {mode === 'image' && vectorMode ? (
            searchPanelCollapsed ? (
              <button
                aria-label="展开检索容器"
                className="search-panel-expand-btn"
                type="button"
                onClick={() => setSearchPanelCollapsed(false)}
              >
                <span className="search-panel-expand-tip">展开检索容器</span>
              </button>
            ) : (
              <div className="vector-panel" ref={vectorPanelRef} style={{ height: `${vectorPanelHeight}px` }}>
                <div className="vector-panel-content" ref={vectorPanelContentRef}>
                <div className="vector-top-row">
                  <div className="search-mode-switch" role="group" aria-label="search-mode-switch">
                    <button
                      className={searchPanelMode === 'vector' ? 'is-active' : ''}
                      type="button"
                      onClick={() => setSearchPanelMode('vector')}
                    >
                      向量检索
                    </button>
                    <button
                      className={searchPanelMode === 'feature' ? 'is-active' : ''}
                      type="button"
                      onClick={() => setSearchPanelMode('feature')}
                    >
                      特征检索
                    </button>
                  </div>

                  <div className="vector-top-actions">
                    <span>
                      {searchPanelMode === 'vector'
                        ? `当前结果: ${vectorSearchResults.length} 张`
                        : `命中节点: ${scopedImageSources.length} 个`}
                    </span>
                    <button type="button" onClick={() => setSearchPanelCollapsed(true)}>
                      折叠
                    </button>
                  </div>
                </div>

                {searchPanelMode === 'vector' ? (
                  <>
                    <div className="vector-controls">
                      <button type="button" disabled={!focusedRef} onClick={runVectorSearch}>
                        向量检索
                      </button>
                      <span>
                        {focusedRef && focusedImagePackage
                          ? `输入：${focusedImagePackage.displayName} #${(focusedImage?.ordinal ?? focusedRef.imageIndex + 1).toString()}`
                          : '请先在缩略图中选中一张图片'}
                      </span>
                    </div>
                    <label>
                      相似度阈值 {vectorThreshold.toFixed(2)}
                      <input
                        max={0.98}
                        min={0.2}
                        step={0.01}
                        type="range"
                        value={vectorThreshold}
                        onChange={(event) => updateSettings({ vectorThreshold: Number(event.target.value) })}
                      />
                    </label>
                    <p className="vector-hint">修改阈值后需重新点击“向量检索”才会刷新结果。</p>
                  </>
                ) : (
                  <div className="feature-controls">
                    <label>
                      名称
                      <input
                        placeholder="按名称模糊匹配"
                        value={featureNameQuery}
                        onChange={(event) => setFeatureNameQuery(event.target.value)}
                      />
                    </label>
                    <label>
                      作品名
                      <input
                        placeholder="按作品名模糊匹配"
                        value={featureWorkTitleQuery}
                        onChange={(event) => setFeatureWorkTitleQuery(event.target.value)}
                      />
                    </label>
                    <label>
                      社团
                      <input
                        list="feature-circle-options"
                        placeholder="输入社团，支持自动补完"
                        value={featureCircleQuery}
                        onChange={(event) => setFeatureCircleQuery(event.target.value)}
                      />
                      <datalist id="feature-circle-options">
                        {featureCircleOptions.map((item) => (
                          <option key={item} value={item} />
                        ))}
                      </datalist>
                    </label>
                    <label>
                      作者
                      <input
                        list="feature-author-options"
                        placeholder="输入作者，支持自动补完"
                        value={featureAuthorQuery}
                        onChange={(event) => setFeatureAuthorQuery(event.target.value)}
                      />
                      <datalist id="feature-author-options">
                        {featureAuthorOptions.map((item) => (
                          <option key={item} value={item} />
                        ))}
                      </datalist>
                    </label>

                    <div className="feature-tags-group">
                      <div className="feature-control-head">
                        <strong>tags</strong>
                        <div className="feature-control-actions">
                          <button type="button" onClick={() => setFeatureTagPickerOpen((value) => !value)}>
                            {featureTagPickerOpen ? '收起 tags' : '选择 tags'}
                          </button>
                          <button type="button" onClick={() => setFeatureTags([])}>
                            清空 tags
                          </button>
                        </div>
                      </div>

                      {featureTagPickerOpen ? (
                        <div className="feature-tags-popover" role="listbox" aria-label="tags 选择">
                          {featureTagOptions.map((tag) => {
                            const selected = featureTags.includes(tag)
                            return (
                              <button
                                key={tag}
                                aria-label={tag}
                                aria-pressed={selected}
                                className={selected ? 'is-active' : ''}
                                type="button"
                                onClick={() => {
                                  setFeatureTags((previous) => {
                                    if (previous.includes(tag)) {
                                      return previous.filter((item) => item !== tag)
                                    }
                                    return [...previous, tag]
                                  })
                                }}
                              >
                                {tag}
                              </button>
                            )
                          })}
                        </div>
                      ) : null}

                      <p className="feature-selection-result">
                        {featureTags.length === 0 ? '未选择 tags' : `已选: ${featureTags.join(', ')}`}
                      </p>
                    </div>

                    <div className="feature-rating-group">
                      <strong>图包评分</strong>
                      <div className="feature-rating-stars" role="group" aria-label="图包评分筛选">
                        {[0, 1, 2, 3, 4, 5].map((score) => {
                          const isActive = featureGradeFilter !== null && score <= featureGradeFilter
                          return (
                            <button
                              key={score}
                              aria-label={`图包评分 ${score} 分`}
                              aria-pressed={featureGradeFilter === score}
                              className={isActive ? 'is-active' : ''}
                              style={{ color: `hsl(42deg ${35 + score * 13}% 48%)` }}
                              type="button"
                              onClick={() => setFeatureGradeFilter((current) => (current === score ? null : score))}
                            >
                              ★
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <p className="vector-hint">多字段组合按 AND 逻辑过滤，结果即时同步到 Sidebar 与主视图。</p>
                  </div>
                )}
                </div>
              </div>
            )
          ) : null}

          {mode === 'image' && vectorMode && !searchPanelCollapsed ? (
            <div
              aria-label="调整检索容器高度"
              aria-orientation="horizontal"
              aria-disabled={layoutLocked}
              className={`vector-splitter ${layoutLocked ? 'is-locked' : ''}`}
              role="separator"
              tabIndex={-1}
              onMouseDown={onStartVectorPanelResize}
            />
          ) : null}

          <div className="workspace-body" ref={workspaceBodyRef}>
            <main className="main-pane" style={{ width: metadataCollapsed ? '100%' : `calc(${(1 - metadataRatio) * 100}% - 8px)` }}>
              {mode === 'image' ? (
                <ImageMainSection
                  vectorMode={vectorResultsActive}
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
                  vectorCandidates={vectorSearchResults}
                  normalizedPageIndex={normalizedPageIndex}
                  imageTotalPages={imageTotalPages}
                  packageById={packageById}
                  gridRef={gridRef}
                  onToggleShowNamesOnly={() => updateSettings({ showNamesOnly: !showNamesOnly })}
                  onEnterFullscreen={() => setFullscreenActive(true)}
                  onSelectImage={(packageId, imageIndex, absoluteIndex) => {
                    if (vectorResultsActive) {
                      setVectorFocusIndex(absoluteIndex)
                    }
                    setImageFocus(packageId, imageIndex)
                    updateSettings({ sidebarFocus: 'main' })
                  }}
                  onPrevPage={() => {
                    if (showNamesOnly) {
                      return
                    }
                    if (vectorResultsActive) {
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
                    if (vectorResultsActive) {
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
                aria-disabled={layoutLocked}
                className={`metadata-splitter ${layoutLocked ? 'is-locked' : ''}`}
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
        shortcuts={shortcuts}
        shortcutConflicts={shortcutConflicts}
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
