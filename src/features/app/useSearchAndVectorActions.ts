import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react'

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
  vectorSearchResults: VectorCandidate[]
  vectorResultsActive: boolean
  featureSearchActive: boolean
  selectedSidebarNodeId: string | null
  normalImageSourceNodeIdMap: Map<string, string>
  orderedRootScopedPackages: ImagePackage[]
  setSelectedPackageId: Dispatch<SetStateAction<string>>
  setSelectedSidebarNodeId: Dispatch<SetStateAction<string | null>>
  setVectorSearchResults: Dispatch<SetStateAction<VectorCandidate[]>>
  setVectorFocusIndex: Dispatch<SetStateAction<number>>
  setVectorPage: Dispatch<SetStateAction<number>>
  setSearchPanelMode: Dispatch<SetStateAction<SearchPanelMode>>
  setVectorUniverseOpen: Dispatch<SetStateAction<boolean>>
  setImageFocus: (packageId: string, imageIndex: number) => void
  updateSettings: (patch: { mode?: BrowserMode; vectorMode?: boolean; sidebarFocus?: 'sidebar' | 'main' }) => void
}

interface UseSearchAndVectorActionsResult {
  runVectorSearch: () => void
  goToFromSearchMode: () => void
  confirmVectorUniverseSelection: (ref: FocusedImageRef) => void
  vectorUniverseScopeRefs: FocusedImageRef[]
}

export function useSearchAndVectorActions({
  mode,
  focusedRef,
  allScopedRefs,
  packageById,
  vectorThreshold,
  vectorSearchResults,
  vectorResultsActive,
  featureSearchActive,
  selectedSidebarNodeId,
  normalImageSourceNodeIdMap,
  orderedRootScopedPackages,
  setSelectedPackageId,
  setSelectedSidebarNodeId,
  setVectorSearchResults,
  setVectorFocusIndex,
  setVectorPage,
  setSearchPanelMode,
  setVectorUniverseOpen,
  setImageFocus,
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
    setSelectedPackageId,
    setSelectedSidebarNodeId,
    setVectorFocusIndex,
    setVectorPage,
    setVectorSearchResults,
    updateSettings,
    vectorResultsActive,
  ])

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
    [
      normalImageSourceNodeIdMap,
      setImageFocus,
      setSearchPanelMode,
      setSelectedSidebarNodeId,
      setVectorFocusIndex,
      setVectorPage,
      setVectorSearchResults,
      setVectorUniverseOpen,
      updateSettings,
    ],
  )

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

  return {
    runVectorSearch,
    goToFromSearchMode,
    confirmVectorUniverseSelection,
    vectorUniverseScopeRefs,
  }
}
