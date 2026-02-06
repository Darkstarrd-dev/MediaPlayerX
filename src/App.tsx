import { useCallback, useEffect, useMemo, useRef, useState, type DragEventHandler, type JSX } from 'react'
import { useShallow } from 'zustand/react/shallow'

import './App.css'
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

const AUTO_PLAY_PRESETS = [1, 2, 3, 5, 8]

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function formatSeconds(value: number): string {
  const whole = Math.max(0, Math.floor(value))
  const m = Math.floor(whole / 60)
  const s = whole % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tag = target.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable
}

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

  const renderSidebarNodes = (nodes: SidebarNode[], depth = 0): JSX.Element[] => {
    return nodes.flatMap((node) => {
      const isFolder = node.kind === 'folder'
      const isActivePackage = mode === 'image' && node.packageId === selectedPackageId
      const isActiveVideo = mode === 'video' && node.videoId === selectedVideoId

      const row = (
        <div
          key={node.id}
          className={`sidebar-row ${isActivePackage || isActiveVideo ? 'is-active' : ''}`}
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
        >
          <button
            className="sidebar-label"
            type="button"
            onClick={() => {
              if (node.packageId) {
                setSelectedPackageId(node.packageId)
                updateSettings({ sidebarFocus: 'main' })
              }
              if (node.videoId) {
                setSelectedVideoId(node.videoId)
                updateSettings({ sidebarFocus: 'main' })
              }
            }}
          >
            {node.label}
          </button>

          <button
            className="sidebar-mini-btn"
            type="button"
            onClick={() => {
              if (mode === 'image') {
                updateSettings({ imageRootNodeId: node.id })
              } else {
                updateSettings({ videoRootNodeId: node.id })
              }
            }}
          >
            设为根
          </button>

          {mode === 'video' && node.videoId ? (
            <input
              aria-label={`toggle-${node.videoId}`}
              checked={playlistIds.includes(node.videoId)}
              type="checkbox"
              onChange={(event) => {
                const { checked } = event.target
                setPlaylistIds((previous) => {
                  if (checked) {
                    if (previous.includes(node.videoId!)) {
                      return previous
                    }
                    return [...previous, node.videoId!]
                  }
                  return previous.filter((id) => id !== node.videoId)
                })
              }}
            />
          ) : null}

          {!isFolder && mode === 'image' && node.packageId ? (
            <span className="sidebar-count">{packageById.get(node.packageId)?.images.length ?? 0}</span>
          ) : null}
        </div>
      )

      if (node.children.length === 0) {
        return [row]
      }

      return [row, ...renderSidebarNodes(node.children, depth + 1)]
    })
  }

  return (
    <div className="app" onDragOver={onDragOverImport} onDrop={onDropImport}>
      <header className="app-header" style={{ height: `${headerHeight}px` }}>
        <div className="header-left">
          <div className="logo-wrap">
            <button
              className="logo-btn"
              type="button"
              onClick={() => setImportMenuOpen((value) => !value)}
            >
              MediaPlayerX
            </button>
            {importMenuOpen ? (
              <div className="import-menu">
                <button
                  type="button"
                  onClick={() => {
                    console.info('模拟导入：文件')
                    setImportMenuOpen(false)
                  }}
                >
                  导入文件
                </button>
                <button
                  type="button"
                  onClick={() => {
                    console.info('模拟导入：文件夹')
                    setImportMenuOpen(false)
                  }}
                >
                  导入文件夹
                </button>
                <button
                  type="button"
                  onClick={() => {
                    console.info('模拟导入：文件 + 文件夹（混合）')
                    setImportMenuOpen(false)
                  }}
                >
                  导入混合输入
                </button>
              </div>
            ) : null}
          </div>

          <div className="mode-switch" role="group" aria-label="mode-switch">
            <button
              className={mode === 'image' ? 'is-active' : ''}
              type="button"
              onClick={() => updateSettings({ mode: 'image' })}
            >
              图片模式
            </button>
            <button
              className={mode === 'video' ? 'is-active' : ''}
              type="button"
              onClick={() => updateSettings({ mode: 'video' })}
            >
              视频模式
            </button>
          </div>

          <label className="inline-switch">
            <input
              checked={vectorMode}
              disabled={mode !== 'image'}
              type="checkbox"
              onChange={(event) => updateSettings({ vectorMode: event.target.checked })}
            />
            向量模式
          </label>

          <div className="search-box">
            <select
              value={searchField}
              onChange={(event) => updateSettings({ searchField: event.target.value as SearchField })}
            >
              <option value="all">全部字段</option>
              <option value="name">名称</option>
              <option value="workTitle">作品名</option>
              <option value="circle">社团</option>
              <option value="author">作者</option>
              <option value="tags">Tags</option>
            </select>
            <input
              placeholder="特征检索（名称/社团/作者/tags）"
              value={searchText}
              onChange={(event) => updateSettings({ searchText: event.target.value })}
            />
          </div>
        </div>

        <div className="header-right">
          <div className="grade-control">
            <button type="button">评分：{currentGrade === null ? '-' : currentGrade}</button>
            <div className="grade-popover">
              {[0, 1, 2, 3, 4, 5].map((grade) => (
                <button key={grade} type="button" onClick={() => setFocusedGrade(grade === 0 ? null : grade)}>
                  {grade === 0 ? '清空' : `${grade} 星`}
                </button>
              ))}
            </div>
          </div>

          <label className="slider-block">
            缩放
            <input
              max={220}
              min={70}
              type="range"
              value={thumbnailScale}
              onChange={(event) => updateSettings({ thumbnailScale: Number(event.target.value) })}
            />
          </label>

          <label className="inline-switch">
            <input
              checked={autoPlayEnabled}
              type="checkbox"
              onChange={(event) => updateSettings({ autoPlayEnabled: event.target.checked })}
            />
            自动播放
          </label>

          <select
            value={autoPlayInterval}
            onChange={(event) => updateSettings({ autoPlayInterval: Number(event.target.value) })}
          >
            {AUTO_PLAY_PRESETS.map((value) => (
              <option key={value} value={value}>{`${value}s`}</option>
            ))}
          </select>

          <button type="button" onClick={() => updateSettings({ settingsOpen: true })}>
            设置
          </button>
        </div>
      </header>

      <div className="app-body" style={{ height: `calc(100vh - ${headerHeight}px)` }}>
        <aside className={`sidebar ${sidebarFocus === 'sidebar' ? 'is-focus' : ''}`} style={{ width: `${sidebarRatio * 100}%` }}>
          <div className="sidebar-head">
            <strong>目录结构</strong>
            {mode === 'image' && imageRootNodeId ? (
              <button type="button" onClick={() => updateSettings({ imageRootNodeId: null })}>
                恢复数据库根
              </button>
            ) : null}
            {mode === 'video' && videoRootNodeId ? (
              <button type="button" onClick={() => updateSettings({ videoRootNodeId: null })}>
                恢复数据库根
              </button>
            ) : null}
          </div>

          <div className="sidebar-tree">
            {mode === 'image' ? renderSidebarNodes(imageTreeForSidebar) : renderSidebarNodes(videoTreeForSidebar)}
          </div>
        </aside>

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
                <>
                  <div className="main-toolbar">
                    <strong>
                      {vectorMode
                        ? '向量结果视图'
                        : `${activePackage?.displayName ?? '无图包'} (${activePackage?.images.length ?? 0} 张)`}
                    </strong>
                    <div className="toolbar-actions">
                      <button type="button" onClick={() => updateSettings({ showNamesOnly: !showNamesOnly })}>
                        {showNamesOnly ? '显示缩略图' : '纯文件名模式'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFullscreenActive(true)}
                        disabled={!focusedImage}
                      >
                        进入全屏
                      </button>
                    </div>
                  </div>

                  <div className="image-grid" ref={gridRef}>
                    {refsInPage.map((ref, pageIndex) => {
                      const pkg = packageById.get(ref.packageId)
                      const image = pkg?.images[ref.imageIndex]
                      if (!pkg || !image) {
                        return null
                      }

                      const absoluteIndex = pageStart + pageIndex
                      const isFocused =
                        focusedRef?.packageId === ref.packageId && focusedRef.imageIndex === ref.imageIndex

                      return (
                        <button
                          key={`${ref.packageId}-${ref.imageIndex}`}
                          className={`thumb-card ${isFocused ? 'is-focused' : ''}`}
                          style={{ width: `${actualCellWidth}px` }}
                          type="button"
                          onClick={() => {
                            if (vectorMode) {
                              setVectorFocusIndex(absoluteIndex)
                            }
                            setImageFocus(ref.packageId, ref.imageIndex)
                            updateSettings({ sidebarFocus: 'main' })
                          }}
                          onDoubleClick={() => setFullscreenActive(true)}
                        >
                          {showNamesOnly ? (
                            <div className="name-only">{`#${image.ordinal.toString().padStart(4, '0')}`}</div>
                          ) : (
                            <div className="thumb-placeholder" style={{ background: image.color }}>
                              <span>{`${image.width} x ${image.height}`}</span>
                            </div>
                          )}
                          <div className="thumb-caption">
                            <strong>{`${pkg.displayName} #${image.ordinal}`}</strong>
                            {vectorMode ? (
                              <small>{`score ${(vectorCandidates[absoluteIndex]?.score ?? 0).toFixed(2)}`}</small>
                            ) : null}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  <div className="pager-line">
                    <button
                      type="button"
                      onClick={() => {
                        if (vectorMode) {
                          setVectorPage((value) => clamp(value - 1, 0, imageTotalPages - 1))
                          return
                        }
                        setPageByPackage((previous) => ({
                          ...previous,
                          [selectedPackageId]: clamp((previous[selectedPackageId] ?? 0) - 1, 0, imageTotalPages - 1),
                        }))
                      }}
                    >
                      上一页
                    </button>
                    <span>{`第 ${normalizedPageIndex + 1} / ${imageTotalPages} 页`}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (vectorMode) {
                          setVectorPage((value) => clamp(value + 1, 0, imageTotalPages - 1))
                          return
                        }
                        setPageByPackage((previous) => ({
                          ...previous,
                          [selectedPackageId]: clamp((previous[selectedPackageId] ?? 0) + 1, 0, imageTotalPages - 1),
                        }))
                      }}
                    >
                      下一页
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="main-toolbar">
                    <strong>{focusedVideo?.fileName ?? '无视频'}</strong>
                    <div className="toolbar-actions">
                      <button type="button" onClick={() => setFullscreenActive(true)}>
                        F11 全屏
                      </button>
                    </div>
                  </div>

                  <div className="video-preview">
                    <div className="video-screen">
                      <span>{`虚拟视频时钟 ${formatSeconds(videoTime)} / ${formatSeconds(
                        focusedVideo?.durationSec ?? 0,
                      )}`}</span>
                    </div>
                    <div className="video-controls">
                      <button type="button" onClick={() => setVideoPlaying((value) => !value)}>
                        {videoPlaying ? '暂停' : '播放'}
                      </button>
                      <button type="button" onClick={() => goPlaylist(-1)}>
                        上一个
                      </button>
                      <button type="button" onClick={() => goPlaylist(1)}>
                        下一个
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          console.info('模拟 Save as cover', {
                            videoId: focusedVideo?.id,
                            time: videoTime,
                          })
                        }}
                      >
                        Save as cover
                      </button>
                    </div>
                  </div>
                </>
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

            {!metadataCollapsed ? (
              <aside className="metadata-panel" style={{ width: `${metadataRatio * 100}%` }}>
                <div className="metadata-head">
                  <strong>元数据面板</strong>
                  <button type="button" onClick={() => updateSettings({ metadataCollapsed: true })}>
                    折叠
                  </button>
                </div>

                {mode === 'image' ? (
                  <div className="metadata-content">
                    <p>{`图包：${focusedImagePackage?.displayName ?? '-'}`}</p>
                    <p>{`作品名：${focusedImagePackage?.workTitle ?? '-'}`}</p>
                    <p>{`社团：${focusedImagePackage?.circle ?? '-'}`}</p>
                    <p>{`作者：${focusedImagePackage?.author ?? '-'}`}</p>
                    <p>{`Tags：${focusedImagePackage?.tags.join(', ') ?? '-'}`}</p>
                    <p>{`评分：${currentGrade === null ? '未评分' : currentGrade}`}</p>
                  </div>
                ) : (
                  <div className="metadata-content">
                    <div className="meta-tabs">
                      <button
                        className={metadataTab === 'info' ? 'is-active' : ''}
                        type="button"
                        onClick={() => setMetadataTab('info')}
                      >
                        视频信息
                      </button>
                      <button
                        className={metadataTab === 'playlist' ? 'is-active' : ''}
                        type="button"
                        onClick={() => setMetadataTab('playlist')}
                      >
                        播放列表
                      </button>
                    </div>

                    {metadataTab === 'info' && focusedVideo ? (
                      <>
                        <p>{`文件：${focusedVideo.fileName}`}</p>
                        <p>{`时长：${formatSeconds(focusedVideo.durationSec)}`}</p>
                        <p>{`分辨率：${focusedVideo.width}x${focusedVideo.height}`}</p>
                        <p>{`音量：${videoVolume}%`}</p>
                        <p>{`倍速：${videoRate.toFixed(2)}x`}</p>
                      </>
                    ) : null}

                    {metadataTab === 'playlist' ? (
                      <div className="playlist-list">
                        {playlistIds.map((videoId) => {
                          const video = videoById.get(videoId)
                          if (!video) {
                            return null
                          }

                          return (
                            <div
                              key={videoId}
                              className={`playlist-item ${selectedVideoId === videoId ? 'is-active' : ''}`}
                              draggable
                              onDragStart={() => setDragVideoId(videoId)}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => {
                                if (!dragVideoId || dragVideoId === videoId) {
                                  return
                                }

                                setPlaylistIds((previous) => {
                                  const from = previous.indexOf(dragVideoId)
                                  const to = previous.indexOf(videoId)
                                  if (from < 0 || to < 0) {
                                    return previous
                                  }

                                  const next = [...previous]
                                  next.splice(from, 1)
                                  next.splice(to, 0, dragVideoId)
                                  return next
                                })
                              }}
                            >
                              <button type="button" onClick={() => setSelectedVideoId(videoId)}>
                                {video.fileName}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPlaylistIds((previous) => previous.filter((id) => id !== videoId))
                                }}
                              >
                                删除
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                )}
              </aside>
            ) : (
              <button
                className="meta-restore"
                type="button"
                onClick={() => updateSettings({ metadataCollapsed: false })}
              >
                展开元数据面板
              </button>
            )}
          </div>
        </section>
      </div>

      {fullscreenActive ? (
        <div
          className="fullscreen-layer"
          onMouseMove={(event) => {
            setShowFullscreenFooter(event.clientY > window.innerHeight * 0.8)
          }}
          onMouseLeave={() => setShowFullscreenFooter(false)}
        >
          <div className="fullscreen-content">
            {fullscreenDisplay !== 'video-only' ? (
              <section className="fullscreen-image" style={{ flex: fullscreenDisplay === 'dual' ? fullscreenSplit : 1 }}>
                <div className="full-placeholder" style={{ background: focusedImage?.color ?? '#666' }}>
                  <span>{`图片 #${focusedImage?.ordinal ?? '-'}`}</span>
                </div>
              </section>
            ) : null}

            {fullscreenDisplay === 'dual' ? <div className="fullscreen-divider" /> : null}

            {fullscreenDisplay !== 'image-only' ? (
              <section className="fullscreen-video" style={{ flex: fullscreenDisplay === 'dual' ? 1 - fullscreenSplit : 1 }}>
                <div className={`full-video-placeholder ${fullscreenVideoFocus ? 'is-focus' : ''}`}>
                  <span>{`视频 ${focusedVideo?.fileName ?? '-'}`}</span>
                  <strong>{`${formatSeconds(videoTime)} / ${formatSeconds(focusedVideo?.durationSec ?? 0)}`}</strong>
                </div>
              </section>
            ) : null}
          </div>

          {showFullscreenFooter ? (
            <footer className="fullscreen-footer">
              <div className="fullscreen-group">
                <button
                  className={fullscreenDisplay === 'dual' ? 'is-active' : ''}
                  type="button"
                  onClick={() => setFullscreenDisplay('dual')}
                >
                  双显示
                </button>
                <button
                  className={fullscreenDisplay === 'video-only' ? 'is-active' : ''}
                  type="button"
                  onClick={() => setFullscreenDisplay('video-only')}
                >
                  仅视频
                </button>
                <button
                  className={fullscreenDisplay === 'image-only' ? 'is-active' : ''}
                  type="button"
                  onClick={() => setFullscreenDisplay('image-only')}
                >
                  仅图片
                </button>
              </div>

              <div className="fullscreen-group">
                <button type="button" onClick={() => setFullscreenVideoFocus(false)}>
                  图片控制
                </button>
                <button type="button" onClick={() => setFullscreenVideoFocus(true)}>
                  视频控制
                </button>
                <label>
                  分屏比例
                  <input
                    max={0.8}
                    min={0.2}
                    step={0.02}
                    type="range"
                    value={fullscreenSplit}
                    onChange={(event) => setFullscreenSplit(Number(event.target.value))}
                  />
                </label>
              </div>

              <div className="fullscreen-group">
                <button type="button" onClick={() => setVideoPlaying((value) => !value)}>
                  {videoPlaying ? '暂停' : '播放'}
                </button>
                <button type="button" onClick={() => goPlaylist(-1)}>
                  上一个
                </button>
                <button type="button" onClick={() => goPlaylist(1)}>
                  下一个
                </button>
                <button type="button" onClick={() => setFullscreenActive(false)}>
                  退出全屏
                </button>
              </div>
            </footer>
          ) : null}
        </div>
      ) : null}

      {settingsOpen ? (
        <div className="settings-mask" role="dialog" aria-modal="true">
          <section className="settings-panel">
            <div className="settings-head">
              <h2>设置面板（虚拟）</h2>
              <button type="button" onClick={() => updateSettings({ settingsOpen: false })}>
                关闭
              </button>
            </div>

            <div className="settings-grid">
              <div className="settings-block">
                <h3>布局参数</h3>
                <label>
                  Header 高度 {headerHeight}px
                  <input
                    max={96}
                    min={48}
                    type="range"
                    value={headerHeight}
                    onChange={(event) => updateSettings({ headerHeight: Number(event.target.value) })}
                  />
                </label>
                <label>
                  Sidebar 比例 {(sidebarRatio * 100).toFixed(0)}%
                  <input
                    max={0.45}
                    min={0.16}
                    step={0.01}
                    type="range"
                    value={sidebarRatio}
                    onChange={(event) => updateSettings({ sidebarRatio: Number(event.target.value) })}
                  />
                </label>
                <label>
                  元数据面板比例 {(metadataRatio * 100).toFixed(0)}%
                  <input
                    max={0.45}
                    min={0.2}
                    step={0.01}
                    type="range"
                    value={metadataRatio}
                    onChange={(event) => updateSettings({ metadataRatio: Number(event.target.value) })}
                  />
                </label>
                <label>
                  向量容器高度 {vectorPanelHeight}px
                  <input
                    max={320}
                    min={120}
                    step={2}
                    type="range"
                    value={vectorPanelHeight}
                    onChange={(event) => updateSettings({ vectorPanelHeight: Number(event.target.value) })}
                  />
                </label>
              </div>

              <div className="settings-block">
                <h3>缩略图 / 模型参数</h3>
                <label>
                  缩略图质量
                  <input
                    max={100}
                    min={1}
                    type="number"
                    value={thumbnailQuality}
                    onChange={(event) => updateSettings({ thumbnailQuality: Number(event.target.value) })}
                  />
                </label>
                <label>
                  缩略图最长边
                  <input
                    max={2048}
                    min={128}
                    type="number"
                    value={thumbnailMaxEdge}
                    onChange={(event) => updateSettings({ thumbnailMaxEdge: Number(event.target.value) })}
                  />
                </label>
                <label>
                  LM Studio Endpoint
                  <input
                    type="text"
                    value={lmStudioEndpoint}
                    onChange={(event) => updateSettings({ lmStudioEndpoint: event.target.value })}
                  />
                </label>
                <label>
                  Embedding 模型
                  <input
                    type="text"
                    value={lmStudioModel}
                    onChange={(event) => updateSettings({ lmStudioModel: event.target.value })}
                  />
                </label>
              </div>

              <div className="settings-block settings-shortcuts">
                <div className="settings-shortcuts-head">
                  <h3>快捷键重映射</h3>
                  <button type="button" onClick={resetShortcuts}>
                    恢复默认
                  </button>
                </div>

                <div className="shortcut-list">
                  {SHORTCUT_DEFINITIONS.map((definition) => (
                    <label key={definition.action}>
                      <span>{definition.label}</span>
                      <input
                        type="text"
                        value={shortcuts[definition.action]}
                        onChange={(event) => setShortcut(definition.action, event.target.value)}
                      />
                    </label>
                  ))}
                </div>

                <div className="shortcut-conflicts">
                  <strong>冲突检测</strong>
                  {shortcutConflicts.length === 0 ? (
                    <p>当前无冲突。</p>
                  ) : (
                    <ul>
                      {shortcutConflicts.map((conflict) => (
                        <li key={`${conflict.scope}-${conflict.combo}`}>
                          {`${conflict.scope} 范围：${conflict.combo} -> ${conflict.actions.join(', ')}`}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

export default App
