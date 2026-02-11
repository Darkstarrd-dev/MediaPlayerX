import { useCallback, type Dispatch, type SetStateAction } from 'react'

interface UseMetadataManageModeActionsParams {
  manageMode: boolean
  metadataManageMode: boolean
  clearAllSelections: () => void
  setManageMode: Dispatch<SetStateAction<boolean>>
  setMetadataManageMode: Dispatch<SetStateAction<boolean>>
  setAdReviewPanelOpen: Dispatch<SetStateAction<boolean>>
  setDeleteConfirmOpen: Dispatch<SetStateAction<boolean>>
  setManageOperationHint: Dispatch<SetStateAction<string | null>>
  updateSettings: (patch: { vectorMode?: boolean; sidebarFocus?: 'sidebar' | 'main' }) => void
}

interface UseMetadataManageModeActionsResult {
  toggleMetadataManageMode: () => void
}

export function useMetadataManageModeActions({
  manageMode,
  metadataManageMode,
  clearAllSelections,
  setManageMode,
  setMetadataManageMode,
  setAdReviewPanelOpen,
  setDeleteConfirmOpen,
  setManageOperationHint,
  updateSettings,
}: UseMetadataManageModeActionsParams): UseMetadataManageModeActionsResult {
  const toggleMetadataManageMode = useCallback(() => {
    const nextOpen = !metadataManageMode
    setMetadataManageMode(nextOpen)
    setAdReviewPanelOpen(false)
    setDeleteConfirmOpen(false)
    setManageOperationHint(null)
    clearAllSelections()

    if (nextOpen) {
      if (manageMode) {
        setManageMode(false)
      }
      updateSettings({ vectorMode: false, sidebarFocus: 'main' })
    }
  }, [
    clearAllSelections,
    manageMode,
    metadataManageMode,
    setAdReviewPanelOpen,
    setDeleteConfirmOpen,
    setManageMode,
    setManageOperationHint,
    setMetadataManageMode,
    updateSettings,
  ])

  return {
    toggleMetadataManageMode,
  }
}
