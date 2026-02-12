import { useCallback, type Dispatch, type SetStateAction } from 'react'

import { buildVectorCandidates } from '../../mockData'
import type {
  BrowserMode,
  FocusedImageRef,
  ImagePackage,
  VectorCandidate,
} from '../../types'

type SearchPanelMode = 'vector' | 'feature'

interface UseSearchAndVectorActionsParams {
  mode: BrowserMode
  focusedRef: FocusedImageRef | null
  allScopedRefs: FocusedImageRef[]
  packageById: Map<string, ImagePackage>
  vectorThreshold: number
  vectorResultsActive: boolean
  featureSearchActive: boolean
  quickFeatureSearchActive: boolean
  selectedSidebarNodeId: string | null
  normalImageSourceNodeIdMap: Map<string, string>
  setSelectedPackageId: Dispatch<SetStateAction<string>>
  setSelectedSidebarNodeId: Dispatch<SetStateAction<string | null>>
  setVectorSearchResults: Dispatch<SetStateAction<VectorCandidate[]>>
  setVectorFocusIndex: Dispatch<SetStateAction<number>>
  setVectorPage: Dispatch<SetStateAction<number>>
  setSearchPanelMode: Dispatch<SetStateAction<SearchPanelMode>>
  setImageFocus: (packageId: string, imageIndex: number) => void
  clearQuickFeatureSearch: () => void
  updateSettings: (patch: { mode?: BrowserMode; vectorMode?: boolean; sidebarFocus?: 'sidebar' | 'main' }) => void
}

interface UseSearchAndVectorActionsResult {
  runVectorSearch: () => void
  goToFromSearchMode: () => void
}

export function useSearchAndVectorActions({
  mode,
  focusedRef,
  allScopedRefs,
  packageById,
  vectorThreshold,
  vectorResultsActive,
  featureSearchActive,
  quickFeatureSearchActive,
  selectedSidebarNodeId,
  normalImageSourceNodeIdMap,
  setSelectedPackageId,
  setSelectedSidebarNodeId,
  setVectorSearchResults,
  setVectorFocusIndex,
  setVectorPage,
  setSearchPanelMode,
  setImageFocus,
  clearQuickFeatureSearch,
  updateSettings,
}: UseSearchAndVectorActionsParams): UseSearchAndVectorActionsResult {
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
  }, [
    allScopedRefs,
    focusedRef,
    mode,
    packageById,
    setImageFocus,
    setSearchPanelMode,
    setVectorFocusIndex,
    setVectorPage,
    setVectorSearchResults,
    updateSettings,
    vectorThreshold,
  ])

  const goToFromSearchMode = useCallback(() => {
    if (mode === 'video') {
      if (!featureSearchActive) {
        return
      }

      if (quickFeatureSearchActive) {
        clearQuickFeatureSearch()
      }

      setVectorSearchResults([])
      setVectorFocusIndex(0)
      setVectorPage(0)
      setSearchPanelMode('feature')
      updateSettings({ vectorMode: false, sidebarFocus: 'main' })
      return
    }

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
      if (quickFeatureSearchActive) {
        clearQuickFeatureSearch()
      }

      if (targetNodeId) {
        setSelectedSidebarNodeId(targetNodeId)
      }
      return
    }

    if (featureSearchActive) {
      const targetNodeId = selectedSidebarNodeId
      if (quickFeatureSearchActive) {
        clearQuickFeatureSearch()
      }
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
    quickFeatureSearchActive,
    clearQuickFeatureSearch,
    selectedSidebarNodeId,
    setImageFocus,
    setSearchPanelMode,
    setSelectedPackageId,
    setSelectedSidebarNodeId,
    setVectorFocusIndex,
    setVectorPage,
    setVectorSearchResults,
    updateSettings,
    vectorResultsActive,
  ])

  return {
    runVectorSearch,
    goToFromSearchMode,
  }
}
