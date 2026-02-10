import { useMemo, type Dispatch, type SetStateAction } from 'react'

import type { VectorUniverseSectionProps } from '../../components/VectorUniverseSection'
import type { BrowserMode, FocusedImageRef, ImagePackage, VectorCandidate } from '../../types'
import type { VectorControlMap } from '../../vectorControls'
import type { AppSettingsStoreSnapshot } from './useAppSettingsStore'
import { useSearchAndVectorActions } from './useSearchAndVectorActions'

type SearchPanelMode = 'vector' | 'feature'

interface UseVectorUniverseBindingsParams {
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
  vectorUniverseOpen: boolean
  setVectorUniverseOpen: Dispatch<SetStateAction<boolean>>
  setImageFocus: (packageId: string, imageIndex: number) => void
  updateSettings: AppSettingsStoreSnapshot['updateSettings']
  scopedImageSourcesEffective: ImagePackage[]
  vectorUniverseMoveSpeed: number
  vectorUniverseSprintMultiplier: number
  vectorUniverseLookSensitivity: number
  vectorUniverseRaycastDistance: number
  vectorUniverseDispersion: number
  vectorUniverseHelperScale: number
  vectorUniverseWidgetSize: number
  vectorControls: VectorControlMap
}

export function useVectorUniverseBindings({
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
  vectorUniverseOpen,
  setVectorUniverseOpen,
  setImageFocus,
  updateSettings,
  scopedImageSourcesEffective,
  vectorUniverseMoveSpeed,
  vectorUniverseSprintMultiplier,
  vectorUniverseLookSensitivity,
  vectorUniverseRaycastDistance,
  vectorUniverseDispersion,
  vectorUniverseHelperScale,
  vectorUniverseWidgetSize,
  vectorControls,
}: UseVectorUniverseBindingsParams) {
  const {
    runVectorSearch,
    goToFromSearchMode,
    confirmVectorUniverseSelection,
    vectorUniverseScopeRefs,
  } = useSearchAndVectorActions({
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
  })

  const vectorUniverseSceneSettings = useMemo(
    () => ({
      moveSpeed: vectorUniverseMoveSpeed,
      sprintMultiplier: vectorUniverseSprintMultiplier,
      lookSensitivity: vectorUniverseLookSensitivity,
      raycastDistance: vectorUniverseRaycastDistance,
      dispersion: vectorUniverseDispersion,
    }),
    [
      vectorUniverseDispersion,
      vectorUniverseLookSensitivity,
      vectorUniverseMoveSpeed,
      vectorUniverseRaycastDistance,
      vectorUniverseSprintMultiplier,
    ],
  )

  const vectorUniverseSectionProps = useMemo<VectorUniverseSectionProps>(
    () => ({
      open: vectorUniverseOpen,
      focusedRef,
      imageSources: scopedImageSourcesEffective,
      scopeRefs: vectorUniverseScopeRefs,
      helperScale: vectorUniverseHelperScale,
      sceneSettings: vectorUniverseSceneSettings,
      widgetSize: vectorUniverseWidgetSize,
      vectorControls,
      onClose: () => setVectorUniverseOpen(false),
      onConfirmSelection: confirmVectorUniverseSelection,
    }),
    [
      confirmVectorUniverseSelection,
      focusedRef,
      scopedImageSourcesEffective,
      setVectorUniverseOpen,
      vectorControls,
      vectorUniverseHelperScale,
      vectorUniverseOpen,
      vectorUniverseSceneSettings,
      vectorUniverseScopeRefs,
      vectorUniverseWidgetSize,
    ],
  )

  return {
    runVectorSearch,
    goToFromSearchMode,
    vectorUniverseSectionProps,
  }
}

export type VectorUniverseBindingsResult = ReturnType<typeof useVectorUniverseBindings>
