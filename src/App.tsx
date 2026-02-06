import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEventHandler,
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
const SIDEBAR_COLLAPSE_RATIO = 0.03

type BrowserFile = File & {
  path?: string
  webkitRelativePath?: string
}

type DragEntry = {
  isFile: boolean
  isDirectory: boolean
  name: string
  fullPath?: string
}

type DataTransferItemWithEntry = DataTransferItem & {
  webkitGetAsEntry?: () => DragEntry | null
}

function serializeFile(file: File): {
  name: string
  type: string
  size: number
  lastModified: number
  relativePath?: string
  path?: string
} {
  const source = file as BrowserFile
  const relativePath = source.webkitRelativePath?.trim() || undefined
  const nativePath = typeof source.path === 'string' && source.path.trim() ? source.path : undefined

  return {
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    lastModified: file.lastModified,
    relativePath,
    path: nativePath,
  }
}

function decodeFileUriToPath(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'file:') {
      return null
    }

    let pathname = decodeURIComponent(url.pathname)
    if (/^\/[a-zA-Z]:\//.test(pathname)) {
      pathname = pathname.slice(1)
    }

    return pathname.replace(/\//g, '\\')
  } catch {
    return null
  }
}

function isLikelyFilesystemPath(value: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(value) || /^\\\\[^\\]+\\[^\\]+/.test(value) || /^\//.test(value)
}

function extractPathsFromClipboard(raw: string): string[] {
  const tokens = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const paths: string[] = []
  for (const token of tokens) {
    const unquoted = token.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1').trim()
    const decoded = decodeFileUriToPath(unquoted)
    const candidate = decoded ?? unquoted
    if (isLikelyFilesystemPath(candidate)) {
      paths.push(candidate)
    }
  }

  return Array.from(new Set(paths))
}

function dataTransferHasFiles(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) {
    return false
  }

  return Array.from(dataTransfer.types).includes('Files')
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

function collectImageSourceIds(node: SidebarNode): string[] {
  const current = node.imageSourceId ? [node.imageSourceId] : []
  return [...current, ...node.children.flatMap((child) => collectImageSourceIds(child))]
}

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
      sidebarMinWidth: state.sidebarMinWidth,
      sidebarFontSize: state.sidebarFontSize,
      sidebarCountFontSize: state.sidebarCountFontSize,
      sidebarIndentStep: state.sidebarIndentStep,
      sidebarVerticalGap: state.sidebarVerticalGap,
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

  const imageSources = useMemo(() => [...IMAGE_PACKAGES, ...IMAGE_DIRECTORY_SOURCES], [])
  const packageById = useMemo(() => new Map(imageSources.map((source) => [source.id, source])), [imageSources])
  const videoById = useMemo(() => new Map(VIDEO_ITEMS.map((video) => [video.id, video])), [])

  const [selectedPackageId, setSelectedPackageId] = useState(imageSources[0]?.id ?? '')
  const [selectedVideoId, setSelectedVideoId] = useState(VIDEO_ITEMS[0]?.id ?? '')
  const [selectedSidebarNodeId, setSelectedSidebarNodeId] = useState<string | null>(null)
  const [focusByPackage, setFocusByPackage] = useState<Record<string, number>>(() =>
    Object.fromEntries(imageSources.map((source) => [source.id, 0])),
  )
  const [pageByPackage, setPageByPackage] = useState<Record<string, number>>(() =>
    Object.fromEntries(imageSources.map((source) => [source.id, 0])),
  )
  const [vectorFocusIndex, setVectorFocusIndex] = useState(0)
  const [vectorPage, setVectorPage] = useState(0)
  const [gradeByImage, setGradeByImage] = useState<Record<string, number | null>>({})
  const [playlistIds, setPlaylistIds] = useState<string[]>(VIDEO_ITEMS.slice(0, 3).map((item) => item.id))
  const [metadataTab, setMetadataTab] = useState<'info' | 'playlist'>('info')
  const [dragVideoId, setDragVideoId] = useState<string | null>(null)
  const [importMenuOpen, setImportMenuOpen] = useState(false)
  const [dragOverlayActive, setDragOverlayActive] = useState(false)

  const fileImportInputRef = useRef<HTMLInputElement>(null)
  const folderImportInputRef = useRef<HTMLInputElement>(null)
  const dragDepthRef = useRef(0)

  const [videoPlaying, setVideoPlaying] = useState(false)
  const [videoTime, setVideoTime] = useState(0)
  const [videoRate, setVideoRate] = useState(1)
  const [videoVolume, setVideoVolume] = useState(60)

  const [fullscreenActive, setFullscreenActive] = useState(false)
  const [fullscreenDisplay, setFullscreenDisplay] = useState<'dual' | 'video-only' | 'image-only'>('dual')
  const [fullscreenVideoFocus, setFullscreenVideoFocus] = useState(false)
  const [fullscreenSplit, setFullscreenSplit] = useState(0.56)
  const [showFullscreenFooter, setShowFullscreenFooter] = useState(false)

  const appBodyRef = useRef<HTMLDivElement>(null)
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

  const activeSidebarTree = mode === 'image' ? imageTreeForSidebar : videoTreeForSidebar

  const flatSidebarNodes = useMemo(() => {
    const items: SidebarNode[] = []
    const walk = (nodes: SidebarNode[]) => {
      for (const node of nodes) {
        items.push(node)
        if (node.children.length > 0) {
          walk(node.children)
        }
      }
    }
    walk(activeSidebarTree)
    return items
  }, [activeSidebarTree])

  const sidebarNodeById = useMemo(() => new Map(flatSidebarNodes.map((node) => [node.id, node])), [flatSidebarNodes])

  const imageSourceNodeIdMap = useMemo(() => {
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
    walk(imageTreeForSidebar)
    return map
  }, [imageTreeForSidebar])

  const videoNodeIdMap = useMemo(() => {
    const map = new Map<string, string>()
    const walk = (nodes: SidebarNode[]) => {
      for (const node of nodes) {
        if (node.videoId) {
          map.set(node.videoId, node.id)
        }
        if (node.children.length > 0) {
          walk(node.children)
        }
      }
    }
    walk(videoTreeForSidebar)
    return map
  }, [videoTreeForSidebar])

  const selectedSidebarNode = selectedSidebarNodeId ? sidebarNodeById.get(selectedSidebarNodeId) ?? null : null
  const canSetCurrentRoot = selectedSidebarNode?.kind === 'folder'
  const currentRootLabel = mode === 'image' ? imageRootNode?.label ?? null : videoRootNode?.label ?? null

  const applyCurrentRootFromSelection = useCallback(() => {
    if (!selectedSidebarNode || selectedSidebarNode.kind !== 'folder') {
      return
    }

    if (mode === 'image') {
      updateSettings({ imageRootNodeId: selectedSidebarNode.id })
      return
    }

    updateSettings({ videoRootNodeId: selectedSidebarNode.id })
  }, [mode, selectedSidebarNode, updateSettings])

  const collapseSidebar = useCallback(() => {
    updateSettings({ sidebarRatio: 0, sidebarFocus: 'main' })
  }, [updateSettings])

  const ensureSidebarNodeVisible = useCallback((nodeId: string) => {
    const container = appBodyRef.current?.querySelector<HTMLElement>('.sidebar-tree')
    if (!container) {
      return
    }

    const rowElements = Array.from(container.querySelectorAll<HTMLElement>('[data-sidebar-node-id]'))
    const targetIndex = rowElements.findIndex((row) => row.dataset.sidebarNodeId === nodeId)
    const targetRow = targetIndex >= 0 ? rowElements[targetIndex] : null
    if (!targetRow) {
      return
    }

    if (targetIndex === 0) {
      container.scrollTop = 0
      return
    }

    if (targetIndex === rowElements.length - 1) {
      container.scrollTop = Math.max(0, container.scrollHeight - container.clientHeight)
      return
    }

    const rowTop = targetRow.offsetTop
    const rowBottom = rowTop + targetRow.offsetHeight
    const viewTop = container.scrollTop
    const viewBottom = viewTop + container.clientHeight

    if (rowTop < viewTop) {
      container.scrollTop = Math.max(0, rowTop - 4)
      return
    }

    if (rowBottom > viewBottom) {
      const nextTop = rowBottom - container.clientHeight + 4
      container.scrollTop = Math.min(nextTop, Math.max(0, container.scrollHeight - container.clientHeight))
    }
  }, [])

  const handleSidebarNavigationKey = useCallback(
    (event: KeyboardEvent): boolean => {
      if (flatSidebarNodes.length === 0) {
        return false
      }

      const currentId = selectedSidebarNodeId && sidebarNodeById.has(selectedSidebarNodeId) ? selectedSidebarNodeId : flatSidebarNodes[0].id
      const currentIndex = Math.max(
        0,
        flatSidebarNodes.findIndex((node) => node.id === currentId),
      )

      const moveSelection = (nextIndex: number) => {
        const nextNode = flatSidebarNodes[clamp(nextIndex, 0, flatSidebarNodes.length - 1)]
        if (!nextNode) {
          return false
        }
        setSelectedSidebarNodeId(nextNode.id)
        requestAnimationFrame(() => ensureSidebarNodeVisible(nextNode.id))
        return true
      }

      const container = appBodyRef.current?.querySelector<HTMLElement>('.sidebar-tree')
      const findVisibleCount = (): number => {
        if (!container) {
          return 9
        }

        const viewTop = container.scrollTop
        const viewBottom = viewTop + container.clientHeight
        const indexById = new Map(flatSidebarNodes.map((node, index) => [node.id, index]))
        const visibleRows = Array.from(container.querySelectorAll<HTMLElement>('[data-sidebar-node-id]'))
          .map((row) => {
            const rowId = row.dataset.sidebarNodeId
            if (!rowId) {
              return null
            }

            const rowIndex = indexById.get(rowId)
            if (rowIndex === undefined) {
              return null
            }

            return {
              index: rowIndex,
              top: row.offsetTop,
              bottom: row.offsetTop + row.offsetHeight,
            }
          })
          .filter((item): item is { index: number; top: number; bottom: number } => item !== null)
          .filter((row) => row.bottom > viewTop && row.top < viewBottom)
          .length

        if (visibleRows === 0) {
          return 9
        }

        return visibleRows
      }

      if (event.key === 'ArrowDown') {
        return moveSelection(currentIndex + 1)
      }
      if (event.key === 'ArrowUp') {
        return moveSelection(currentIndex - 1)
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        updateSettings({ sidebarFocus: 'main' })
        return true
      }
      if (event.key === 'PageDown') {
        const pageStep = Math.max(1, findVisibleCount() - 1)
        return moveSelection(currentIndex + pageStep)
      }
      if (event.key === 'PageUp') {
        const pageStep = Math.max(1, findVisibleCount() - 1)
        return moveSelection(currentIndex - pageStep)
      }
      if (event.key === 'Home') {
        return moveSelection(0)
      }
      if (event.key === 'End') {
        return moveSelection(flatSidebarNodes.length - 1)
      }
      if (event.key === 'Enter') {
        const node = flatSidebarNodes[currentIndex]
        if (!node) {
          return false
        }
        setSelectedSidebarNodeId(node.id)
        if (mode === 'image' && node.imageSourceId) {
          setSelectedPackageId(node.imageSourceId)
        }
        if (mode === 'video' && node.videoId) {
          setSelectedVideoId(node.videoId)
        }
        requestAnimationFrame(() => ensureSidebarNodeVisible(node.id))
        return true
      }

      return false
    },
    [ensureSidebarNodeVisible, flatSidebarNodes, mode, selectedSidebarNodeId, sidebarNodeById, updateSettings],
  )

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

  const moveImage = useCallback(
    (delta: number) => {
      if (mode !== 'image' || vectorMode) {
        return
      }

      if (!activePackage) {
        return
      }

      const current = focusByPackage[activePackage.id] ?? 0
      setImageFocus(activePackage.id, current + delta)
    },
    [activePackage, focusByPackage, mode, setImageFocus, vectorMode],
  )

  const jumpImage = useCallback(
    (direction: 'start' | 'end') => {
      if (mode !== 'image' || vectorMode) {
        return
      }

      if (!activePackage) {
        return
      }

      if (direction === 'start') {
        setImageFocus(activePackage.id, 0)
      } else {
        setImageFocus(activePackage.id, activePackage.images.length - 1)
      }
    },
    [activePackage, mode, setImageFocus, vectorMode],
  )

  const goPackage = useCallback(
    (delta: number) => {
      if (mode !== 'image' || vectorMode) {
        return
      }

      if (rootScopedPackages.length === 0) {
        return
      }

      const currentIndexInList = rootScopedPackages.findIndex((pkg) => pkg.id === selectedPackageId)
      const safeCurrent = currentIndexInList >= 0 ? currentIndexInList : 0
      const nextIndex = clamp(safeCurrent + delta, 0, rootScopedPackages.length - 1)
      const nextPackage = rootScopedPackages[nextIndex]
      if (!nextPackage) {
        return
      }

      setSelectedPackageId(nextPackage.id)
    },
    [mode, rootScopedPackages, selectedPackageId, vectorMode],
  )

  const goPlaylist = useCallback(
    (delta: number) => {
      if (playlistIds.length === 0) {
        return
      }

      const currentIndexInPlaylist = playlistIds.findIndex((id) => id === selectedVideoId)
      const safeCurrent = currentIndexInPlaylist >= 0 ? currentIndexInPlaylist : 0
      const nextIndex = clamp(safeCurrent + delta, 0, playlistIds.length - 1)
      const nextId = playlistIds[nextIndex]
      if (!nextId) {
        return
      }

      setSelectedVideoId(nextId)
      setVideoTime(0)
    },
    [playlistIds, selectedVideoId],
  )

  const adjustVideoRate = useCallback((delta: number) => {
    setVideoRate((value) => clamp(Number((value + delta).toFixed(2)), 0.25, 4))
  }, [])

  const adjustVideoVolume = useCallback((delta: number) => {
    setVideoVolume((value) => clamp(value + delta, 0, 100))
  }, [])

  const setFocusedGrade = useCallback(
    (grade: number | null) => {
      if (!focusedImage) {
        return
      }

      setGradeByImage((previous) => ({
        ...previous,
        [focusedImage.id]: grade,
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

  const executeShortcut = useCallback(
    (action: ShortcutAction) => {
      switch (action) {
        case 'focusSwitch':
          if (!fullscreenActive) {
            updateSettings({ sidebarFocus: sidebarFocus === 'sidebar' ? 'main' : 'sidebar' })
          }
          return
        case 'imagePrev':
          moveImage(-1)
          return
        case 'imageNext':
          moveImage(1)
          return
        case 'imageFirst':
          jumpImage('start')
          return
        case 'imageLast':
          jumpImage('end')
          return
        case 'packagePrev':
          goPackage(-1)
          return
        case 'packageNext':
          goPackage(1)
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
            adjustVideoRate(-0.25)
          }
          return
        case 'videoSpeedUp':
          if (videoShortcutActive) {
            adjustVideoRate(0.25)
          }
          return
        case 'videoVolumeDown':
          if (videoShortcutActive) {
            adjustVideoVolume(-5)
          }
          return
        case 'videoVolumeUp':
          if (videoShortcutActive) {
            adjustVideoVolume(5)
          }
          return
        default:
          return
      }
    },
    [
      applyAutoplayIntervalByIndex,
      adjustVideoRate,
      adjustVideoVolume,
      autoPlayEnabled,
      fullscreenActive,
      goPackage,
      goPlaylist,
      jumpImage,
      mode,
      moveImage,
      setFocusedGrade,
      setFullscreenActive,
      sidebarFocus,
      updateSettings,
      videoShortcutActive,
    ],
  )


  const openImportFilesDialog = useCallback(() => {
    const input = fileImportInputRef.current
    if (!input) {
      return
    }

    input.value = ''
    input.click()
  }, [])

  const openImportFoldersDialog = useCallback(() => {
    const input = folderImportInputRef.current
    if (!input) {
      return
    }

    input.value = ''
    input.click()
  }, [])

  const onImportFilesSelected = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) {
      return
    }

    console.info('导入文件弹窗结果', files.map((file) => serializeFile(file)))
  }, [])

  const onImportFoldersSelected = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) {
      return
    }

    const rootFolders = Array.from(
      new Set(
        files
          .map((file) => (file as BrowserFile).webkitRelativePath?.split('/')[0] ?? '')
          .filter(Boolean),
      ),
    )

    console.info('导入文件夹弹窗结果', {
      rootFolders,
      files: files.map((file) => serializeFile(file)),
    })
  }, [])

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
    const folderInput = folderImportInputRef.current
    if (!folderInput) {
      return
    }

    folderInput.setAttribute('webkitdirectory', '')
    folderInput.setAttribute('directory', '')
  }, [])

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
      setSelectedVideoId(videosForSidebar[0].id)
    }
  }, [rootScopedVideoIds, selectedVideoId, videosForSidebar])

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
      if (!document.hasFocus()) {
        return
      }

      const pastedFiles = Array.from(event.clipboardData?.files ?? [])
      if (pastedFiles.length > 0) {
        console.info('粘贴文件输入', pastedFiles.map((file) => serializeFile(file)))
      }

      const text = event.clipboardData?.getData('text') ?? ''
      const uriList = event.clipboardData?.getData('text/uri-list') ?? ''
      const pastedPaths = Array.from(new Set([...extractPathsFromClipboard(text), ...extractPathsFromClipboard(uriList)]))
      if (pastedPaths.length > 0) {
        console.info('粘贴路径输入', pastedPaths)
      }
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

      if (!fullscreenActive && sidebarFocus === 'sidebar') {
        const handledBySidebar = handleSidebarNavigationKey(event)
        if (handledBySidebar) {
          event.preventDefault()
          return
        }
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
  }, [executeShortcut, fullscreenActive, handleSidebarNavigationKey, settingsOpen, shortcuts, sidebarFocus, videoShortcutActive])

  const onDragEnterImport: DragEventHandler<HTMLDivElement> = (event) => {
    if (!dataTransferHasFiles(event.dataTransfer)) {
      return
    }

    event.preventDefault()
    dragDepthRef.current += 1
    setDragOverlayActive(true)
  }

  const onDropImport: DragEventHandler<HTMLDivElement> = (event) => {
    dragDepthRef.current = 0
    setDragOverlayActive(false)

    if (!dataTransferHasFiles(event.dataTransfer)) {
      return
    }

    event.preventDefault()

    const entries: Array<{
      kind: 'file' | 'directory'
      name: string
      fullPath?: string
    }> = []

    for (const item of Array.from(event.dataTransfer.items ?? [])) {
      const entry = (item as DataTransferItemWithEntry).webkitGetAsEntry?.()
      if (!entry) {
        continue
      }

      entries.push({
        kind: entry.isDirectory ? 'directory' : 'file',
        name: entry.name,
        fullPath: entry.fullPath,
      })
    }

    const files = Array.from(event.dataTransfer.files).map((file) => serializeFile(file))
    console.info('拖拽导入输入', {
      entries,
      files,
    })
  }

  const onDragOverImport: DragEventHandler<HTMLDivElement> = (event) => {
    if (!dataTransferHasFiles(event.dataTransfer)) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    if (!dragOverlayActive) {
      setDragOverlayActive(true)
    }
  }

  const onDragLeaveImport: DragEventHandler<HTMLDivElement> = (event) => {
    if (!dataTransferHasFiles(event.dataTransfer)) {
      return
    }

    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) {
      setDragOverlayActive(false)
    }
  }

  return (
    <div className="app" onDragEnter={onDragEnterImport} onDragLeave={onDragLeaveImport} onDragOver={onDragOverImport} onDrop={onDropImport}>
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
        onImportFiles={openImportFilesDialog}
        onImportFolders={openImportFoldersDialog}
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
                setSelectedVideoId(videoId)
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
        sidebarMinWidth={sidebarMinWidth}
        sidebarFontSize={sidebarFontSize}
        sidebarCountFontSize={sidebarCountFontSize}
        sidebarIndentStep={sidebarIndentStep}
        sidebarVerticalGap={sidebarVerticalGap}
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
        onSidebarRatioChange={applySidebarRatio}
        onSidebarMinWidthChange={(value) => updateSettings({ sidebarMinWidth: value })}
        onSidebarFontSizeChange={(value) => updateSettings({ sidebarFontSize: value })}
        onSidebarCountFontSizeChange={(value) => updateSettings({ sidebarCountFontSize: value })}
        onSidebarIndentStepChange={(value) => updateSettings({ sidebarIndentStep: value })}
        onSidebarVerticalGapChange={(value) => updateSettings({ sidebarVerticalGap: value })}
        onMetadataRatioChange={(value) => updateSettings({ metadataRatio: value })}
        onVectorPanelHeightChange={(value) => updateSettings({ vectorPanelHeight: value })}
        onThumbnailQualityChange={(value) => updateSettings({ thumbnailQuality: value })}
        onThumbnailMaxEdgeChange={(value) => updateSettings({ thumbnailMaxEdge: value })}
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
