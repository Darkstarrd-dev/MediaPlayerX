import { useEffect, useState } from 'react'

import type { UseAppWorkspacePropsParams } from './useAppWorkspaceProps.types'

interface UseMetadataManageSelectionModeParams {
  metadataManageMode: boolean
  selectedSidebarNodeId: UseAppWorkspacePropsParams['selectedSidebarNodeId']
  sidebarNodeById: UseAppWorkspacePropsParams['sidebarNodeById']
  clearSidebarSelections: UseAppWorkspacePropsParams['clearSidebarSelections']
  checkSidebarNode: UseAppWorkspacePropsParams['checkSidebarNode']
}

export function useMetadataManageSelectionMode({
  metadataManageMode,
  selectedSidebarNodeId,
  sidebarNodeById,
  clearSidebarSelections,
  checkSidebarNode,
}: UseMetadataManageSelectionModeParams) {
  const [metadataManageSelectionMode, setMetadataManageSelectionMode] =
    useState<'single' | 'multiple'>('multiple')

  useEffect(() => {
    if (!metadataManageMode || metadataManageSelectionMode !== 'single') {
      return
    }

    if (!selectedSidebarNodeId || !sidebarNodeById.has(selectedSidebarNodeId)) {
      clearSidebarSelections()
      return
    }

    clearSidebarSelections()
    checkSidebarNode(selectedSidebarNodeId)
  }, [
    checkSidebarNode,
    clearSidebarSelections,
    metadataManageMode,
    metadataManageSelectionMode,
    selectedSidebarNodeId,
    sidebarNodeById,
  ])

  const toggleMetadataManageSelectionMode = () => {
    setMetadataManageSelectionMode((value) =>
      value === 'single' ? 'multiple' : 'single',
    )
  }

  return {
    metadataManageSelectionMode,
    toggleMetadataManageSelectionMode,
  }
}
