import { useCallback, type Dispatch, type SetStateAction } from 'react'

import type { BrowserMode, VectorCandidate } from '../../types'

type SearchPanelMode = 'vector' | 'feature'

interface UseMetadataManageModeActionsParams {
  mode: BrowserMode
  manageMode: boolean
  metadataManageMode: boolean
  clearAllSelections: () => void
  setManageMode: Dispatch<SetStateAction<boolean>>
  setMetadataManageMode: Dispatch<SetStateAction<boolean>>
  setDeleteConfirmOpen: Dispatch<SetStateAction<boolean>>
  setManageOperationHint: Dispatch<SetStateAction<string | null>>
  setVectorSearchResults: Dispatch<SetStateAction<VectorCandidate[]>>
  setVectorFocusIndex: Dispatch<SetStateAction<number>>
  setVectorPage: Dispatch<SetStateAction<number>>
  setSearchPanelMode: Dispatch<SetStateAction<SearchPanelMode>>
  setSearchPanelCollapsed: Dispatch<SetStateAction<boolean>>
  updateSettings: (patch: { vectorMode?: boolean; sidebarFocus?: 'sidebar' | 'main' }) => void
}

interface UseMetadataManageModeActionsResult {
  toggleMetadataManageMode: () => void
}

export function useMetadataManageModeActions({
  mode,
  manageMode,
  metadataManageMode,
  clearAllSelections,
  setManageMode,
  setMetadataManageMode,
  setDeleteConfirmOpen,
  setManageOperationHint,
  setVectorSearchResults,
  setVectorFocusIndex,
  setVectorPage,
  setSearchPanelMode,
  setSearchPanelCollapsed,
  updateSettings,
}: UseMetadataManageModeActionsParams): UseMetadataManageModeActionsResult {
  const toggleMetadataManageMode = useCallback(() => {
    const nextOpen = !metadataManageMode
    setMetadataManageMode(nextOpen)
    setDeleteConfirmOpen(false)
    setManageOperationHint(null)
    clearAllSelections()

    if (nextOpen) {
      if (manageMode) {
        setManageMode(false)
      }
      setVectorSearchResults([])
      setVectorFocusIndex(0)
      setVectorPage(0)
      setSearchPanelMode(mode === 'video' ? 'feature' : 'vector')
      setSearchPanelCollapsed(false)
      updateSettings({ vectorMode: false, sidebarFocus: 'main' })
    }
  }, [
    clearAllSelections,
    manageMode,
    metadataManageMode,
    mode,
    setDeleteConfirmOpen,
    setManageMode,
    setManageOperationHint,
    setMetadataManageMode,
    setSearchPanelCollapsed,
    setSearchPanelMode,
    setVectorFocusIndex,
    setVectorPage,
    setVectorSearchResults,
    updateSettings,
  ])

  return {
    toggleMetadataManageMode,
  }
}
