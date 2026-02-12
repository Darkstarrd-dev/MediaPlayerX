import { useRef, useState } from 'react'

import type { BrowserMode, ImagePackage, VectorCandidate } from '../../types'

const SIDEBAR_COLLAPSE_RATIO = 0.03

interface UseAppSessionStateParams {
  imageSources: ImagePackage[]
  mode: BrowserMode
  sidebarRatio: number
}

export function useAppSessionState({
  imageSources,
  mode,
  sidebarRatio,
}: UseAppSessionStateParams) {
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
  const [metadataManageMode, setMetadataManageMode] = useState(false)
  const [manageOperationHint, setManageOperationHint] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [importMenuOpen, setImportMenuOpen] = useState(false)
  const [adReviewPanelOpen, setAdReviewPanelOpen] = useState(false)
  const [dismissedImportTaskIds, setDismissedImportTaskIds] = useState<Record<string, true>>({})
  const [importTaskPanelOpen, setImportTaskPanelOpen] = useState(false)
  const [fullscreenEntryDisplay, setFullscreenEntryDisplay] = useState<'image-only' | 'video-only'>(
    mode === 'video' ? 'video-only' : 'image-only',
  )

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

  return {
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
    setVectorSearchResults,
    vectorFocusIndex,
    setVectorFocusIndex,
    vectorPage,
    setVectorPage,
    gradeByPackage,
    setGradeByPackage,
    manageMode,
    setManageMode,
    metadataManageMode,
    setMetadataManageMode,
    manageOperationHint,
    setManageOperationHint,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    importMenuOpen,
    setImportMenuOpen,
    adReviewPanelOpen,
    setAdReviewPanelOpen,
    dismissedImportTaskIds,
    setDismissedImportTaskIds,
    importTaskPanelOpen,
    setImportTaskPanelOpen,
    fullscreenEntryDisplay,
    setFullscreenEntryDisplay,
    appBodyRef,
    workspaceRef,
    workspaceBodyRef,
    vectorPanelRef,
    vectorPanelContentRef,
    wasFullscreenRef,
    lastExpandedSidebarRatioRef,
    appBodyWidth,
    setAppBodyWidth,
    gridRef,
    gridSize,
    setGridSize,
  }
}

export type AppSessionStateResult = ReturnType<typeof useAppSessionState>
