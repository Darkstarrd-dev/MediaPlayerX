import { useEffect, type Dispatch, type MutableRefObject, type RefObject, type SetStateAction } from 'react'

import type { AppSettings } from '../../contracts/settings'
import type { BrowserMode, FocusedImageRef, ImagePackage, SidebarNode, VectorCandidate, VideoItem } from '../../types'
import { clamp } from '../../utils/ui'

interface UseAppEffectsParams {
  appBodyRef: RefObject<HTMLDivElement | null>
  gridRef: RefObject<HTMLDivElement | null>
  vectorPanelContentRef: RefObject<HTMLDivElement | null>
  wasFullscreenRef: MutableRefObject<boolean>
  lastExpandedSidebarRatioRef: MutableRefObject<number>
  mode: BrowserMode
  showNamesOnly: boolean
  sidebarRatio: number
  sidebarCollapseRatio: number
  normalizeSidebarRatio: (candidate: number) => number
  sidebarCollapsed: boolean
  sidebarFocus: 'sidebar' | 'main'
  vectorResultsActive: boolean
  thumbnailScale: number
  normalizedThumbnailScale: number
  activePackage: ImagePackage | null
  imageFocusActive: boolean
  focusByPackage: Record<string, number>
  pagedPageSize: number
  vectorSearchResults: VectorCandidate[]
  vectorFocusIndex: number
  selectedPackageId: string
  orderedRootScopedPackages: ImagePackage[]
  rootScopedPackageIds: Set<string>
  flatSidebarNodes: SidebarNode[]
  focusedRef: FocusedImageRef | null
  imageSourceNodeIdMap: Map<string, string>
  selectedSidebarNodeId: string | null
  sidebarNodeById: Map<string, SidebarNode>
  vectorResultPackageNodeIdMap: Map<string, string>
  vectorSidebarNodes: SidebarNode[]
  videosForSidebar: VideoItem[]
  rootScopedVideoIds: Set<string>
  selectedVideoId: string
  videoNodeIdMap: Map<string, string>
  ensureSidebarNodeVisible: (nodeId: string) => void
  fullscreenActive: boolean
  autoPlayEnabled: boolean
  autoPlayInterval: number
  moveImage: (delta: number) => void
  vectorMode: boolean
  searchPanelCollapsed: boolean
  searchPanelMode: 'vector' | 'feature'
  vectorPanelHeight: number
  featureTagPickerOpen: boolean
  themeId: string
  setAppBodyWidth: Dispatch<SetStateAction<number>>
  setGridSize: Dispatch<SetStateAction<{ width: number; height: number }>>
  setVectorFocusIndex: Dispatch<SetStateAction<number>>
  setVectorPage: Dispatch<SetStateAction<number>>
  setPageByPackage: Dispatch<SetStateAction<Record<string, number>>>
  setSelectedPackageId: Dispatch<SetStateAction<string>>
  setSelectedSidebarNodeId: Dispatch<SetStateAction<string | null>>
  selectVideoFromBrowser: (videoId: string) => void
  setFullscreenEntryDisplay: Dispatch<SetStateAction<'image-only' | 'video-only'>>
  setFullscreenDisplay: Dispatch<SetStateAction<'dual' | 'video-only' | 'image-only'>>
  setFullscreenVideoFocus: Dispatch<SetStateAction<boolean>>
  setFullscreenSwapped: Dispatch<SetStateAction<boolean>>
  setShowFullscreenFooter: Dispatch<SetStateAction<boolean>>
  updateSettings: (patch: Partial<AppSettings>) => void
}

export function useAppEffects({
  appBodyRef,
  gridRef,
  vectorPanelContentRef,
  wasFullscreenRef,
  lastExpandedSidebarRatioRef,
  mode,
  showNamesOnly,
  sidebarRatio,
  sidebarCollapseRatio,
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
}: UseAppEffectsParams) {
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
  }, [appBodyRef, setAppBodyWidth])

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
      const entry = entries[0]
      if (!entry) {
        return
      }

      updateGridSize(entry.contentRect.width, entry.contentRect.height)
    })

    observer.observe(target)
    return () => observer.disconnect()
  }, [gridRef, mode, setGridSize, showNamesOnly])

  useEffect(() => {
    if (sidebarRatio >= sidebarCollapseRatio) {
      lastExpandedSidebarRatioRef.current = sidebarRatio
    }
  }, [lastExpandedSidebarRatioRef, sidebarCollapseRatio, sidebarRatio])

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
    if (!activePackage || showNamesOnly || !imageFocusActive) {
      return
    }

    const focused = clamp(focusByPackage[activePackage.id] ?? 0, 0, activePackage.images.length - 1)
    const nextPage = Math.floor(focused / pagedPageSize)
    setPageByPackage((previous) => {
      if ((previous[activePackage.id] ?? 0) === nextPage) {
        return previous
      }

      return {
        ...previous,
        [activePackage.id]: nextPage,
      }
    })
  }, [activePackage, focusByPackage, imageFocusActive, pagedPageSize, setPageByPackage, showNamesOnly])

  useEffect(() => {
    if (vectorSearchResults.length === 0) {
      setVectorFocusIndex(0)
      setVectorPage(0)
      return
    }

    setVectorFocusIndex((value) => clamp(value, 0, vectorSearchResults.length - 1))
  }, [setVectorFocusIndex, setVectorPage, vectorSearchResults.length])

  useEffect(() => {
    if (!vectorResultsActive) {
      return
    }

    if (showNamesOnly) {
      setVectorPage(0)
      return
    }

    setVectorPage(Math.floor(vectorFocusIndex / pagedPageSize))
  }, [pagedPageSize, setVectorPage, showNamesOnly, vectorFocusIndex, vectorResultsActive])

  useEffect(() => {
    if (!vectorResultsActive || mode !== 'image' || !focusedRef) {
      return
    }

    const sidebarNodeId = vectorResultPackageNodeIdMap.get(focusedRef.packageId)
    if (!sidebarNodeId || sidebarNodeId === selectedSidebarNodeId) {
      return
    }

    setSelectedSidebarNodeId(sidebarNodeId)
  }, [focusedRef, mode, selectedSidebarNodeId, setSelectedSidebarNodeId, vectorResultPackageNodeIdMap, vectorResultsActive])

  useEffect(() => {
    if (orderedRootScopedPackages.length === 0) {
      return
    }

    if (!rootScopedPackageIds.has(selectedPackageId)) {
      setSelectedPackageId(orderedRootScopedPackages[0].id)
    }
  }, [orderedRootScopedPackages, rootScopedPackageIds, selectedPackageId, setSelectedPackageId])

  useEffect(() => {
    if (mode !== 'image') {
      return
    }

    if (selectedSidebarNodeId && sidebarNodeById.has(selectedSidebarNodeId)) {
      return
    }

    let fallbackNodeId: string | null
    if (vectorResultsActive) {
      fallbackNodeId =
        (focusedRef ? vectorResultPackageNodeIdMap.get(focusedRef.packageId) ?? null : null) ?? vectorSidebarNodes[0]?.id ?? null
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
    setSelectedSidebarNodeId,
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
  }, [flatSidebarNodes, mode, selectedSidebarNodeId, selectedVideoId, setSelectedSidebarNodeId, sidebarNodeById, videoNodeIdMap])

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
    setFullscreenDisplay,
    setFullscreenEntryDisplay,
    setFullscreenSwapped,
    setFullscreenVideoFocus,
    setShowFullscreenFooter,
    wasFullscreenRef,
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
    if (mode !== 'image' && vectorMode) {
      updateSettings({ vectorMode: false })
    }
  }, [mode, updateSettings, vectorMode])

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
  }, [
    featureTagPickerOpen,
    mode,
    searchPanelCollapsed,
    searchPanelMode,
    updateSettings,
    vectorMode,
    vectorPanelContentRef,
    vectorPanelHeight,
  ])

  useEffect(() => {
    document.documentElement.dataset.mpxTheme = themeId
  }, [themeId])
}
