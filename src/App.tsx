import { useCallback, useEffect, useMemo, useRef, useState, type DragEventHandler } from 'react'
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
  IMAGE_PACKAGES,
  VIDEO_ITEMS,
  buildSidebarTree,
  buildVectorCandidates,
  findNodeById,
} from './mockData'
import {
  SHORTCUT_DEFINITIONS,
  findShortcutConflicts,
  shortcutMatches,
  type ShortcutAction,
} from './shortcuts'
import { useUiStore } from './store/useUiStore'
import type {
  FocusedImageRef,
  ImagePackage,
  SearchField,
  SidebarNode,
  VectorCandidate,
  VideoItem,
} from './types'
import { clamp, isEditableTarget } from './utils/ui'

const AUTO_PLAY_PRESETS = [1, 2, 3, 5, 8]

function includesText(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

function packageMatchesSearch(pkg: ImagePackage, field: SearchField, query: string): boolean {
  if (!query.trim()) {
    return true
  }

  const normalized = query.trim().toLowerCase()
  const tagsText = pkg.tags.join(' ')

  switch (field) {
    case 'name':
      return includesText(pkg.packageName, normalized) || includesText(pkg.displayName, normalized)
    case 'workTitle':
      return includesText(pkg.workTitle, normalized)
    case 'circle':
      return includesText(pkg.circle, normalized)
    case 'author':
      return includesText(pkg.author, normalized)
    case 'tags':
      return includesText(tagsText, normalized)
    case 'all':
    default:
      return [pkg.packageName, pkg.displayName, pkg.workTitle, pkg.circle, pkg.author, tagsText]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
  }
}

function videoMatchesSearch(video: VideoItem, query: string): boolean {
  if (!query.trim()) {
    return true
  }

  return [video.fileName, video.absolutePath].join(' ').toLowerCase().includes(query.trim().toLowerCase())
}

function collectLeafIds(node: SidebarNode, kind: 'package' | 'video'): string[] {
  if (kind === 'package' && node.packageId) {
    return [node.packageId]
  }
  if (kind === 'video' && node.videoId) {
    return [node.videoId]
  }

  return node.children.flatMap((child) => collectLeafIds(child, kind))
}

function App() {
  const {
    mode,
    vectorMode,
    settingsOpen,
    headerHeight,
    sidebarRatio,
    metadataRatio,
    vectorPanelHeight,
    thumbnailScale,
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
    thumbnailMaxEdge,
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
      metadataRatio: state.metadataRatio,
      vectorPanelHeight: state.vectorPanelHeight,
      thumbnailScale: state.thumbnailScale,
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
      thumbnailMaxEdge: state.thumbnailMaxEdge,
      lmStudioEndpoint: state.lmStudioEndpoint,
      lmStudioModel: state.lmStudioModel,
      shortcuts: state.shortcuts,
      updateSettings: state.updateSettings,
      setShortcut: state.setShortcut,
      resetShortcuts: state.resetShortcuts,
    })),
  )

  const packageById = useMemo(() => new Map(IMAGE_PACKAGES.map((pkg) => [pkg.id, pkg])), [])
  const videoById = useMemo(() => new Map(VIDEO_ITEMS.map((video) => [video.id, video])), [])

  const [selectedPackageId, setSelectedPackageId] = useState(IMAGE_PACKAGES[0]?.id ?? '')
  const [selectedVideoId, setSelectedVideoId] = useState(VIDEO_ITEMS[0]?.id ?? '')
  const [focusByPackage, setFocusByPackage] = useState<Record<string, number>>(() =>
    Object.fromEntries(IMAGE_PACKAGES.map((pkg) => [pkg.id, 0])),
  )
  const [pageByPackage, setPageByPackage] = useState<Record<string, number>>(() =>
    Object.fromEntries(IMAGE_PACKAGES.map((pkg) => [pkg.id, 0])),
  )
  const [vectorFocusIndex, setVectorFocusIndex] = useState(0)
  const [vectorPage, setVectorPage] = useState(0)
  const [gradeByImage, setGradeByImage] = useState<Record<string, number | null>>({})
  const [playlistIds, setPlaylistIds] = useState<string[]>(VIDEO_ITEMS.slice(0, 3).map((item) => item.id))
  const [metadataTab, setMetadataTab] = useState<'info' | 'playlist'>('info')
  const [dragVideoId, setDragVideoId] = useState<string | null>(null)
  const [importMenuOpen, setImportMenuOpen] = useState(false)

  const [videoPlaying, setVideoPlaying] = useState(false)
  const [videoTime, setVideoTime] = useState(0)
  const [videoRate, setVideoRate] = useState(1)
  const [videoVolume, setVideoVolume] = useState(60)

  const [fullscreenActive, setFullscreenActive] = useState(false)
  const [fullscreenDisplay, setFullscreenDisplay] = useState<'dual' | 'video-only' | 'image-only'>('dual')
  const [fullscreenVideoFocus, setFullscreenVideoFocus] = useState(false)
  const [fullscreenSplit, setFullscreenSplit] = useState(0.56)
  const [showFullscreenFooter, setShowFullscreenFooter] = useState(false)

  const gridRef = useRef<HTMLDivElement>(null)
  const [gridSize, setGridSize] = useState({ width: 1200, height: 700 })

  const scopedSearchPackages = useMemo(
    () => IMAGE_PACKAGES.filter((pkg) => packageMatchesSearch(pkg, searchField, searchText)),
    [searchField, searchText],
  )

  const imageTreeRaw = useMemo(
    () =>
      buildSidebarTree(
        scopedSearchPackages.map((pkg) => ({
          id: pkg.id,
          treePath: pkg.treePath,
        })),
        'package',
      ),
    [scopedSearchPackages],
  )

  const imageRootNode = useMemo(
    () => findNodeById(imageTreeRaw, imageRootNodeId),
    [imageTreeRaw, imageRootNodeId],
  )

  const rootScopedPackageIds = useMemo(() => {
    if (!imageRootNode) {
      return new Set(scopedSearchPackages.map((pkg) => pkg.id))
    }
    return new Set(collectLeafIds(imageRootNode, 'package'))
  }, [imageRootNode, scopedSearchPackages])

  const rootScopedPackages = useMemo(
    () => scopedSearchPackages.filter((pkg) => rootScopedPackageIds.has(pkg.id)),
    [scopedSearchPackages, rootScopedPackageIds],
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

  const vectorPackageIds = useMemo(() => {
    return new Set(vectorCandidates.map((candidate) => candidate.packageId))
  }, [vectorCandidates])

  const sidebarPackages = useMemo(() => {
    if (mode !== 'image') {
      return rootScopedPackages
    }
    if (!vectorMode) {
      return rootScopedPackages
    }
    return rootScopedPackages.filter((pkg) => vectorPackageIds.has(pkg.id))
  }, [mode, rootScopedPackages, vectorMode, vectorPackageIds])

  const imageTreeForSidebar = useMemo(
    () =>
      buildSidebarTree(
        sidebarPackages.map((pkg) => ({
          id: pkg.id,
          treePath: pkg.treePath,
        })),
        'package',
      ),
    [sidebarPackages],
  )

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

  const activePackage = packageById.get(selectedPackageId) ?? rootScopedPackages[0] ?? null

  const activeVectorRef = vectorCandidates[vectorFocusIndex]
  const focusedRef = useMemo<FocusedImageRef | null>(() => {
    if (mode === 'image' && vectorMode) {
      if (!activeVectorRef) {
        return null
      }
      return { packageId: activeVectorRef.packageId, imageIndex: activeVectorRef.imageIndex }
    }

    if (!activePackage) {
      return null
    }

    return {
      packageId: activePackage.id,
      imageIndex: clamp(focusByPackage[activePackage.id] ?? 0, 0, activePackage.images.length - 1),
    }
  }, [activePackage, activeVectorRef, focusByPackage, mode, vectorMode])

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

  const focusedVideo = videoById.get(selectedVideoId) ?? videosForSidebar[0] ?? null

  const currentGrade = focusedImage ? (gradeByImage[focusedImage.id] ?? null) : null

  const desiredCellWidth = Math.max(90, Math.round(thumbnailScale))
  const columns = Math.max(1, Math.floor(gridSize.width / desiredCellWidth))
  const actualCellWidth = Math.floor(gridSize.width / columns)
  const tileHeight = showNamesOnly ? 48 : Math.floor(actualCellWidth * 0.68) + 52
  const rows = Math.max(1, Math.floor(gridSize.height / tileHeight))
  const pageSize = Math.max(1, rows * columns)

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

  const imagePageIndex = vectorMode ? vectorPage : (pageByPackage[selectedPackageId] ?? 0)
  const imageTotalPages = Math.max(1, Math.ceil(visibleImageRefs.length / pageSize))
  const normalizedPageIndex = clamp(imagePageIndex, 0, imageTotalPages - 1)
  const pageStart = normalizedPageIndex * pageSize
  const pageEnd = pageStart + pageSize
  const refsInPage = visibleImageRefs.slice(pageStart, pageEnd)

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
      setSelectedPackageId(packageId)
      setFocusByPackage((previous) => ({
        ...previous,
        [packageId]: clampedIndex,
      }))
      setPageByPackage((previous) => ({
        ...previous,
        [packageId]: Math.floor(clampedIndex / pageSize),
      }))
    },
    [packageById, pageSize],
  )

  const jumpPackage = useCallback(
    (direction: -1 | 1) => {
      if (rootScopedPackages.length === 0) {
        return
      }

      const index = rootScopedPackages.findIndex((pkg) => pkg.id === selectedPackageId)
      const safeIndex = index === -1 ? 0 : index
      const next = clamp(safeIndex + direction, 0, rootScopedPackages.length - 1)
      const nextPackage = rootScopedPackages[next]
      if (!nextPackage) {
        return
      }
      setSelectedPackageId(nextPackage.id)
    },
    [rootScopedPackages, selectedPackageId],
  )

  const moveImage = useCallback(
    (step: -1 | 1) => {
      if (mode !== 'image') {
        return
      }

      if (vectorMode) {
        if (vectorCandidates.length === 0) {
          return
        }

        setVectorFocusIndex((previous) => {
          const next = clamp(previous + step, 0, vectorCandidates.length - 1)
          const nextRef = vectorCandidates[next]
          if (nextRef) {
            setImageFocus(nextRef.packageId, nextRef.imageIndex)
          }
          return next
        })
        return
      }

      if (!activePackage) {
        return
      }

      const currentIndex = focusByPackage[activePackage.id] ?? 0
      const nextIndex = currentIndex + step

      if (nextIndex >= 0 && nextIndex < activePackage.images.length) {
        setImageFocus(activePackage.id, nextIndex)
        return
      }

      const packageIndex = rootScopedPackages.findIndex((pkg) => pkg.id === activePackage.id)
      if (packageIndex === -1) {
        return
      }

      if (step > 0) {
        const nextPackage = rootScopedPackages[packageIndex + 1]
        if (nextPackage) {
          setImageFocus(nextPackage.id, 0)
        }
      } else {
        const prevPackage = rootScopedPackages[packageIndex - 1]
        if (prevPackage) {
          setImageFocus(prevPackage.id, prevPackage.images.length - 1)
        }
      }
    },
    [
      activePackage,
      focusByPackage,
      mode,
      rootScopedPackages,
      setImageFocus,
      vectorCandidates,
      vectorMode,
    ],
  )

  const setFocusedGrade = useCallback(
    (value: number | null) => {
      if (!focusedImage) {
        return
      }
      setGradeByImage((previous) => ({
        ...previous,
        [focusedImage.id]: value,
      }))
    },
    [focusedImage],
  )

  const applyAutoplayIntervalByIndex = useCallback(
    (index: 0 | 1 | 2 | 3 | 4) => {
      const seconds = AUTO_PLAY_PRESETS[index]
      updateSettings({ autoPlayInterval: seconds, autoPlayEnabled: true })
    },
    [updateSettings],
  )

  const goPlaylist = useCallback(
    (direction: -1 | 1) => {
      if (playlistIds.length === 0) {
        return
      }

      const currentIndex = playlistIds.findIndex((id) => id === selectedVideoId)
      const safeIndex = currentIndex === -1 ? 0 : currentIndex
      const nextIndex = clamp(safeIndex + direction, 0, playlistIds.length - 1)
      const nextVideo = playlistIds[nextIndex]
      if (!nextVideo) {
        return
      }

      setSelectedVideoId(nextVideo)
      setVideoTime(0)
    },
    [playlistIds, selectedVideoId],
  )

  const executeShortcut = useCallback(
    (action: ShortcutAction) => {
      switch (action) {
        case 'imagePrev':
          moveImage(-1)
          return
        case 'imageNext':
          moveImage(1)
          return
        case 'imageFirst':
          if (mode !== 'image') return
          if (vectorMode) {
            setVectorFocusIndex(0)
            return
          }
          if (activePackage) {
            setImageFocus(activePackage.id, 0)
          }
          return
        case 'imageLast':
          if (mode !== 'image') return
          if (vectorMode) {
            setVectorFocusIndex(Math.max(0, vectorCandidates.length - 1))
            return
          }
          if (activePackage) {
            setImageFocus(activePackage.id, activePackage.images.length - 1)
          }
          return
        case 'packagePrev':
          if (mode === 'image') jumpPackage(-1)
          return
        case 'packageNext':
          if (mode === 'image') jumpPackage(1)
          return
        case 'autoplayToggle':
          if (mode === 'image') {
            updateSettings({ autoPlayEnabled: !autoPlayEnabled })
          }
          return
        case 'autoplayInterval1':
          applyAutoplayIntervalByIndex(0)
          return
        case 'autoplayInterval2':
          applyAutoplayIntervalByIndex(1)
          return
        case 'autoplayInterval3':
          applyAutoplayIntervalByIndex(2)
          return
        case 'autoplayInterval4':
          applyAutoplayIntervalByIndex(3)
          return
        case 'autoplayInterval5':
          applyAutoplayIntervalByIndex(4)
          return
        case 'rating0':
          setFocusedGrade(null)
          return
        case 'rating1':
          setFocusedGrade(1)
          return
        case 'rating2':
          setFocusedGrade(2)
          return
        case 'rating3':
          setFocusedGrade(3)
          return
        case 'rating4':
          setFocusedGrade(4)
          return
        case 'rating5':
          setFocusedGrade(5)
          return
        case 'focusSwitch':
          if (!fullscreenActive) {
            updateSettings({ sidebarFocus: sidebarFocus === 'sidebar' ? 'main' : 'sidebar' })
          }
          return
        case 'enterFullscreen':
          setFullscreenActive(true)
          return
        case 'fullscreenToggle':
          setFullscreenActive((value) => !value)
          return
        case 'videoPlayPause':
          if (videoShortcutActive) {
            setVideoPlaying((value) => !value)
          }
          return
        case 'videoPrev':
          if (videoShortcutActive) {
            goPlaylist(-1)
          }
          return
        case 'videoNext':
          if (videoShortcutActive) {
            goPlaylist(1)
          }
          return
        case 'videoSpeedDown':
          if (videoShortcutActive) {
            setVideoRate((value) => clamp(Number((value - 0.25).toFixed(2)), 0.25, 3))
          }
          return
        case 'videoSpeedUp':
          if (videoShortcutActive) {
            setVideoRate((value) => clamp(Number((value + 0.25).toFixed(2)), 0.25, 3))
          }
          return
        case 'videoVolumeDown':
          if (videoShortcutActive) {
            setVideoVolume((value) => clamp(value - 5, 0, 100))
          }
          return
        case 'videoVolumeUp':
          if (videoShortcutActive) {
            setVideoVolume((value) => clamp(value + 5, 0, 100))
          }
          return
        default:
          return
      }
    },
    [
      activePackage,
      applyAutoplayIntervalByIndex,
      autoPlayEnabled,
      fullscreenActive,
      goPlaylist,
      jumpPackage,
      mode,
      moveImage,
      setFocusedGrade,
      setImageFocus,
      sidebarFocus,
      updateSettings,
      vectorCandidates.length,
      vectorMode,
      videoShortcutActive,
    ],
  )

  useEffect(() => {
    if (!gridRef.current) {
      return
    }

    const observer = new ResizeObserver((entries) => {
      const target = entries[0]
      if (!target) {
        return
      }

      setGridSize({
        width: target.contentRect.width,
        height: target.contentRect.height,
      })
    })

    observer.observe(gridRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!activePackage) {
      return
    }

    const focused = clamp(focusByPackage[activePackage.id] ?? 0, 0, activePackage.images.length - 1)
    setPageByPackage((previous) => ({
      ...previous,
      [activePackage.id]: Math.floor(focused / pageSize),
    }))
  }, [activePackage, focusByPackage, pageSize])

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
    setVectorPage(Math.floor(vectorFocusIndex / pageSize))
  }, [pageSize, vectorFocusIndex, vectorMode])

  useEffect(() => {
    if (rootScopedPackages.length === 0) {
      return
    }

    if (!rootScopedPackageIds.has(selectedPackageId)) {
      setSelectedPackageId(rootScopedPackages[0].id)
    }
  }, [rootScopedPackageIds, rootScopedPackages, selectedPackageId])

  useEffect(() => {
    if (videosForSidebar.length === 0) {
      return
    }

    if (!rootScopedVideoIds.has(selectedVideoId)) {
      setSelectedVideoId(videosForSidebar[0].id)
    }
  }, [rootScopedVideoIds, selectedVideoId, videosForSidebar])

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
  }, [focusedVideo, goPlaylist, videoPlaying, videoRate])

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const text = event.clipboardData?.getData('text') ?? ''
      console.info('模拟粘贴输入', text)
    }

    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && fullscreenActive) {
        event.preventDefault()
        setFullscreenActive(false)
        return
      }

      if (settingsOpen && isEditableTarget(event.target)) {
        return
      }

      if (isEditableTarget(event.target)) {
        return
      }

      const allowedScopes = new Set(['global'])
      if (videoShortcutActive) {
        allowedScopes.add('video')
      }

      const matchedDefinition = SHORTCUT_DEFINITIONS.find((definition) => {
        if (!allowedScopes.has(definition.scope)) {
          return false
        }
        return shortcutMatches(shortcuts[definition.action], event)
      })

      if (!matchedDefinition) {
        return
      }

      event.preventDefault()
      executeShortcut(matchedDefinition.action)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [executeShortcut, fullscreenActive, settingsOpen, shortcuts, videoShortcutActive])

  const onDropImport: DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault()
    const files = Array.from(event.dataTransfer.files).map((file) => file.name)
    console.info('模拟拖拽导入', files)
  }

  const onDragOverImport: DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault()
  }

  return (
    <div className="app" onDragOver={onDragOverImport} onDrop={onDropImport}>
      <AppHeader
        headerHeight={headerHeight}
        mode={mode}
        vectorMode={vectorMode}
        searchField={searchField}
        searchText={searchText}
        currentGrade={currentGrade}
        thumbnailScale={thumbnailScale}
        autoPlayEnabled={autoPlayEnabled}
        autoPlayInterval={autoPlayInterval}
        importMenuOpen={importMenuOpen}
        autoPlayPresets={AUTO_PLAY_PRESETS}
        onToggleImportMenu={() => setImportMenuOpen((value) => !value)}
        onCloseImportMenu={() => setImportMenuOpen(false)}
        onImportFiles={() => {
          console.info('模拟导入：文件')
        }}
        onImportFolders={() => {
          console.info('模拟导入：文件夹')
        }}
        onImportMixed={() => {
          console.info('模拟导入：文件 + 文件夹（混合）')
        }}
        onModeChange={(nextMode) => updateSettings({ mode: nextMode })}
        onVectorModeChange={(enabled) => updateSettings({ vectorMode: enabled })}
        onSearchFieldChange={(field) => updateSettings({ searchField: field })}
        onSearchTextChange={(text) => updateSettings({ searchText: text })}
        onGradeChange={setFocusedGrade}
        onThumbnailScaleChange={(value) => updateSettings({ thumbnailScale: value })}
        onAutoPlayEnabledChange={(enabled) => updateSettings({ autoPlayEnabled: enabled })}
        onAutoPlayIntervalChange={(value) => updateSettings({ autoPlayInterval: value })}
        onOpenSettings={() => updateSettings({ settingsOpen: true })}
      />

      <div className="app-body" style={{ height: `calc(100vh - ${headerHeight}px)` }}>
        <SidebarPanel
          mode={mode}
          sidebarFocus={sidebarFocus}
          sidebarRatio={sidebarRatio}
          imageRootNodeId={imageRootNodeId}
          videoRootNodeId={videoRootNodeId}
          imageTreeNodes={imageTreeForSidebar}
          videoTreeNodes={videoTreeForSidebar}
          selectedPackageId={selectedPackageId}
          selectedVideoId={selectedVideoId}
          playlistIds={playlistIds}
          getPackageImageCount={(packageId) => packageById.get(packageId)?.images.length ?? 0}
          onSelectPackage={(packageId) => {
            setSelectedPackageId(packageId)
            updateSettings({ sidebarFocus: 'main' })
          }}
          onSelectVideo={(videoId) => {
            setSelectedVideoId(videoId)
            updateSettings({ sidebarFocus: 'main' })
          }}
          onSetCurrentRoot={(nodeId) => {
            if (mode === 'image') {
              updateSettings({ imageRootNodeId: nodeId })
              return
            }
            updateSettings({ videoRootNodeId: nodeId })
          }}
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

        <section className={`workspace ${sidebarFocus === 'main' ? 'is-focus' : ''}`} style={{ width: `${(1 - sidebarRatio) * 100}%` }}>
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

          <div className="workspace-body">
            <main className="main-pane" style={{ width: metadataCollapsed ? '100%' : `${(1 - metadataRatio) * 100}%` }}>
              {mode === 'image' ? (
                <ImageMainSection
                  vectorMode={vectorMode}
                  showNamesOnly={showNamesOnly}
                  activePackage={activePackage}
                  focusedRef={focusedRef}
                  focusedImageExists={Boolean(focusedImage)}
                  refsInPage={refsInPage}
                  pageStart={pageStart}
                  actualCellWidth={actualCellWidth}
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
                  onTogglePlay={() => setVideoPlaying((value) => !value)}
                  onPrevVideo={() => goPlaylist(-1)}
                  onNextVideo={() => goPlaylist(1)}
                  onSaveCover={() => {
                    console.info('模拟 Save as cover', {
                      videoId: focusedVideo?.id,
                      time: videoTime,
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

            <MetadataPanel
              mode={mode}
              metadataCollapsed={metadataCollapsed}
              metadataRatio={metadataRatio}
              focusedImagePackage={focusedImagePackage}
              currentGrade={currentGrade}
              focusedVideo={focusedVideo}
              metadataTab={metadataTab}
              playlistIds={playlistIds}
              selectedVideoId={selectedVideoId}
              dragVideoId={dragVideoId}
              videoVolume={videoVolume}
              videoRate={videoRate}
              videoById={videoById}
              onCollapse={() => updateSettings({ metadataCollapsed: true })}
              onExpand={() => updateSettings({ metadataCollapsed: false })}
              onMetadataTabChange={setMetadataTab}
              onSelectVideo={setSelectedVideoId}
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
        fullscreenActive={fullscreenActive}
        showFullscreenFooter={showFullscreenFooter}
        fullscreenDisplay={fullscreenDisplay}
        fullscreenVideoFocus={fullscreenVideoFocus}
        fullscreenSplit={fullscreenSplit}
        focusedImage={focusedImage}
        focusedVideo={focusedVideo}
        videoTime={videoTime}
        videoPlaying={videoPlaying}
        onSetFooterVisible={setShowFullscreenFooter}
        onSetDisplay={setFullscreenDisplay}
        onSetVideoFocus={setFullscreenVideoFocus}
        onSetSplit={setFullscreenSplit}
        onToggleVideoPlay={() => setVideoPlaying((value) => !value)}
        onPrevVideo={() => goPlaylist(-1)}
        onNextVideo={() => goPlaylist(1)}
        onExit={() => setFullscreenActive(false)}
      />

      <SettingsPanel
        settingsOpen={settingsOpen}
        headerHeight={headerHeight}
        sidebarRatio={sidebarRatio}
        metadataRatio={metadataRatio}
        vectorPanelHeight={vectorPanelHeight}
        thumbnailQuality={thumbnailQuality}
        thumbnailMaxEdge={thumbnailMaxEdge}
        lmStudioEndpoint={lmStudioEndpoint}
        lmStudioModel={lmStudioModel}
        shortcuts={shortcuts}
        shortcutConflicts={shortcutConflicts}
        onClose={() => updateSettings({ settingsOpen: false })}
        onHeaderHeightChange={(value) => updateSettings({ headerHeight: value })}
        onSidebarRatioChange={(value) => updateSettings({ sidebarRatio: value })}
        onMetadataRatioChange={(value) => updateSettings({ metadataRatio: value })}
        onVectorPanelHeightChange={(value) => updateSettings({ vectorPanelHeight: value })}
        onThumbnailQualityChange={(value) => updateSettings({ thumbnailQuality: value })}
        onThumbnailMaxEdgeChange={(value) => updateSettings({ thumbnailMaxEdge: value })}
        onLmStudioEndpointChange={(value) => updateSettings({ lmStudioEndpoint: value })}
        onLmStudioModelChange={(value) => updateSettings({ lmStudioModel: value })}
        onSetShortcut={setShortcut}
        onResetShortcuts={resetShortcuts}
      />
    </div>
  )
}

export default App
