import type { Dispatch, SetStateAction } from 'react'

import type { AppSettings } from '../../contracts/settings'
import type { AppHeaderProps } from '../../components/AppHeader'
import { clamp } from '../../utils/ui'

interface BuildAppHeaderPropsParams {
  headerHeight: number
  mode: AppSettings['mode']
  vectorMode: boolean
  manageMode: boolean
  metadataManageMode: boolean
  vectorUniverseOpen: boolean
  displayThumbnailScaleLevel: number
  canThumbnailScaleDown: boolean
  canThumbnailScaleUp: boolean
  autoPlayEnabled: boolean
  autoPlayInterval: number
  importMenuOpen: boolean
  taskStatusLabel: string
  importTaskPanelOpen: boolean
  autoPlayPresets: number[]
  thumbnailScale: number
  thumbnailScaleLevelCount: number
  setImportMenuOpen: Dispatch<SetStateAction<boolean>>
  setImportTaskPanelOpen: Dispatch<SetStateAction<boolean>>
  openImportFilesDialog: () => void
  openImportFoldersDialog: () => void
  updateSettings: (patch: Partial<AppSettings>) => void
  setSearchPanelMode: Dispatch<SetStateAction<'vector' | 'feature'>>
  setSearchPanelCollapsed: Dispatch<SetStateAction<boolean>>
  setVectorUniverseOpen: Dispatch<SetStateAction<boolean>>
  onToggleManageMode: () => void
  onToggleMetadataManageMode: () => void
}

export function buildAppHeaderProps(params: BuildAppHeaderPropsParams): AppHeaderProps {
  return {
    headerHeight: params.headerHeight,
    mode: params.mode,
    searchPanelOpen: params.vectorMode && !params.manageMode && !params.metadataManageMode,
    manageMode: params.manageMode,
    metadataManageMode: params.metadataManageMode,
    vectorUniverseOpen: params.vectorUniverseOpen,
    thumbnailScaleLevel: params.displayThumbnailScaleLevel,
    canThumbnailScaleDown: params.canThumbnailScaleDown,
    canThumbnailScaleUp: params.canThumbnailScaleUp,
    autoPlayEnabled: params.autoPlayEnabled,
    autoPlayInterval: params.autoPlayInterval,
    importMenuOpen: params.importMenuOpen,
    taskStatusLabel: params.taskStatusLabel,
    importTaskPanelOpen: params.importTaskPanelOpen,
    autoPlayPresets: params.autoPlayPresets,
    onToggleImportMenu: () => params.setImportMenuOpen((value) => !value),
    onToggleImportTaskPanel: () => params.setImportTaskPanelOpen((value) => !value),
    onCloseImportMenu: () => params.setImportMenuOpen(false),
    onImportFiles: params.openImportFilesDialog,
    onImportFolders: params.openImportFoldersDialog,
    onModeChange: (nextMode) => params.updateSettings({ mode: nextMode }),
    onToggleSearchPanel: () => {
      if (params.manageMode) {
        params.onToggleManageMode()
      }
      if (params.metadataManageMode) {
        params.onToggleMetadataManageMode()
      }

      const nextOpen = params.manageMode || params.metadataManageMode ? true : !params.vectorMode
      params.updateSettings({ vectorMode: nextOpen })
      if (nextOpen) {
        params.setSearchPanelMode(params.mode === 'video' ? 'feature' : 'vector')
        params.setSearchPanelCollapsed(false)
      }
    },
    onToggleManageMode: params.onToggleManageMode,
    onToggleMetadataManageMode: params.onToggleMetadataManageMode,
    onOpenVectorUniverse: () => {
      params.setVectorUniverseOpen(true)
    },
    onThumbnailScaleDown: () => {
      params.updateSettings({
        thumbnailScale: clamp(params.thumbnailScale + 1, 1, params.thumbnailScaleLevelCount),
      })
    },
    onThumbnailScaleUp: () => {
      params.updateSettings({
        thumbnailScale: clamp(params.thumbnailScale - 1, 1, params.thumbnailScaleLevelCount),
      })
    },
    onAutoPlayEnabledChange: (enabled) => params.updateSettings({ autoPlayEnabled: enabled }),
    onAutoPlayIntervalChange: (value) => params.updateSettings({ autoPlayInterval: value }),
    onOpenSettings: () => params.updateSettings({ settingsOpen: true }),
  }
}
