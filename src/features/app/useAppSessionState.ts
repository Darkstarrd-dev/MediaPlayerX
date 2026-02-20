import { useRef, useState } from 'react'

import type { AudioItem, BrowserMode, ImagePackage, MusicLoopMode, VectorCandidate } from '../../types'

const SIDEBAR_COLLAPSE_RATIO = 0.03

interface UseAppSessionStateParams {
  imageSources: ImagePackage[]
  audios: AudioItem[]
  mode: BrowserMode
  sidebarRatio: number
}

export function useAppSessionState({
  imageSources,
  audios,
  mode,
  sidebarRatio,
}: UseAppSessionStateParams) {
  const [selectedPackageId, setSelectedPackageId] = useState(imageSources[0]?.id ?? '')
  const [selectedSidebarNodeId, setSelectedSidebarNodeId] = useState<string | null>(null)
  const [selectedAudioId, setSelectedAudioId] = useState(audios[0]?.id ?? '')
  const [audioPlaylistIds, setAudioPlaylistIds] = useState<string[]>(audios.slice(0, 3).map((audio) => audio.id))
  const [musicLoopMode, setMusicLoopMode] = useState<MusicLoopMode>('library')
  const [musicPlayRequestNonce, setMusicPlayRequestNonce] = useState(0)
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
  const [manageReviewMode, setManageReviewMode] = useState<'ad' | 'cover'>('ad')
  const [manageOperationHint, setManageOperationHint] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [sidebarRenameDialogOpen, setSidebarRenameDialogOpen] = useState(false)
  const [sidebarRenameTargetNodeId, setSidebarRenameTargetNodeId] = useState<string | null>(null)
  const [sidebarRenameTargetNodeIds, setSidebarRenameTargetNodeIds] = useState<string[]>([])
  const [sidebarRenameTargetImageIds, setSidebarRenameTargetImageIds] = useState<string[]>([])
  const [sidebarRenameDraft, setSidebarRenameDraft] = useState('')
  const [sidebarRenameMode, setSidebarRenameMode] = useState<'single' | 'replace' | 'numbering' | 'remove-range' | 'metadata'>('single')
  const [sidebarRenameReplaceFrom, setSidebarRenameReplaceFrom] = useState('')
  const [sidebarRenameReplaceTo, setSidebarRenameReplaceTo] = useState('')
  const [sidebarRenameNumberBase, setSidebarRenameNumberBase] = useState('item-')
  const [sidebarRenameNumberStart, setSidebarRenameNumberStart] = useState('1')
  const [sidebarRenameNumberStep, setSidebarRenameNumberStep] = useState('1')
  const [sidebarRenameNumberPadWidth, setSidebarRenameNumberPadWidth] = useState('3')
  const [sidebarRenameRemoveStart, setSidebarRenameRemoveStart] = useState('1')
  const [sidebarRenameRemoveEnd, setSidebarRenameRemoveEnd] = useState('1')
  const [sidebarRenameMetadataTemplate, setSidebarRenameMetadataTemplate] = useState('[author.jp(if exist)(author.en(if exist))]/[author(if only one exist)]-[circle just like author ] - [title.jp(if exist)]/[title(if only one exist)]')
  const [sidebarRenamePreviewRows, setSidebarRenamePreviewRows] = useState<Array<{ nodeId: string; sourceName: string; targetName: string; reason: string | null }>>([])
  const [importMenuOpen, setImportMenuOpen] = useState(false)
  const [adReviewPanelOpen, setAdReviewPanelOpen] = useState(false)
  const [adReviewFocusTaskId, setAdReviewFocusTaskId] = useState<string | null>(null)
  const [adReviewPageIndex, setAdReviewPageIndex] = useState(0)
  const [dismissedImportTaskIds, setDismissedImportTaskIds] = useState<Record<string, true>>({})
  const [importTaskPanelOpen, setImportTaskPanelOpen] = useState(false)
  const [helpOverlayOpen, setHelpOverlayOpen] = useState(false)
  const [themeParameterPanelOpen, setThemeParameterPanelOpen] = useState(false)
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
  const [gridElement, setGridElement] = useState<HTMLDivElement | null>(null)
  const [gridSize, setGridSize] = useState({ width: 1200, height: 700 })

  return {
    selectedPackageId,
    setSelectedPackageId,
    selectedSidebarNodeId,
    setSelectedSidebarNodeId,
    selectedAudioId,
    setSelectedAudioId,
    audioPlaylistIds,
    setAudioPlaylistIds,
    musicLoopMode,
    setMusicLoopMode,
    musicPlayRequestNonce,
    requestMusicPlay: () => {
      setMusicPlayRequestNonce((value) => value + 1)
    },
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
    manageReviewMode,
    setManageReviewMode,
    manageOperationHint,
    setManageOperationHint,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    sidebarRenameDialogOpen,
    setSidebarRenameDialogOpen,
    sidebarRenameTargetNodeId,
    setSidebarRenameTargetNodeId,
    sidebarRenameTargetNodeIds,
    setSidebarRenameTargetNodeIds,
    sidebarRenameTargetImageIds,
    setSidebarRenameTargetImageIds,
    sidebarRenameDraft,
    setSidebarRenameDraft,
    sidebarRenameMode,
    setSidebarRenameMode,
    sidebarRenameReplaceFrom,
    setSidebarRenameReplaceFrom,
    sidebarRenameReplaceTo,
    setSidebarRenameReplaceTo,
    sidebarRenameNumberBase,
    setSidebarRenameNumberBase,
    sidebarRenameNumberStart,
    setSidebarRenameNumberStart,
    sidebarRenameNumberStep,
    setSidebarRenameNumberStep,
    sidebarRenameNumberPadWidth,
    setSidebarRenameNumberPadWidth,
    sidebarRenameRemoveStart,
    setSidebarRenameRemoveStart,
    sidebarRenameRemoveEnd,
    setSidebarRenameRemoveEnd,
    sidebarRenameMetadataTemplate,
    setSidebarRenameMetadataTemplate,
    sidebarRenamePreviewRows,
    setSidebarRenamePreviewRows,
    importMenuOpen,
    setImportMenuOpen,
    adReviewPanelOpen,
    setAdReviewPanelOpen,
    adReviewFocusTaskId,
    setAdReviewFocusTaskId,
    adReviewPageIndex,
    setAdReviewPageIndex,
    dismissedImportTaskIds,
    setDismissedImportTaskIds,
    importTaskPanelOpen,
    setImportTaskPanelOpen,
    helpOverlayOpen,
    setHelpOverlayOpen,
    themeParameterPanelOpen,
    setThemeParameterPanelOpen,
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
    gridElement,
    setGridElement,
    gridSize,
    setGridSize,
  }
}

export type AppSessionStateResult = ReturnType<typeof useAppSessionState>
