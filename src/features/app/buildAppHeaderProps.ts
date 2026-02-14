import type { Dispatch, SetStateAction } from 'react'

import type { AppSettings } from '../../contracts/settings'
import type { AppHeaderProps } from '../../components/AppHeader'
import { resolvePalettePairForStyle } from '../theme/themeRegistry'
import { clamp } from '../../utils/ui'

interface BuildAppHeaderPropsParams {
  headerHeight: number
  mode: AppSettings['mode']
  vectorMode: boolean
  manageMode: boolean
  metadataManageMode: boolean
  displayThumbnailScaleLevel: number
  canThumbnailScaleDown: boolean
  canThumbnailScaleUp: boolean
  autoPlayEnabled: boolean
  autoPlayInterval: number
  styleId: string
  paletteMode: AppSettings['paletteMode']
  paletteDayId: string
  paletteNightId: string
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
    thumbnailScaleLevel: params.displayThumbnailScaleLevel,
    canThumbnailScaleDown: params.canThumbnailScaleDown,
    canThumbnailScaleUp: params.canThumbnailScaleUp,
    autoPlayEnabled: params.autoPlayEnabled,
    autoPlayInterval: params.autoPlayInterval,
    paletteMode: params.paletteMode,
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
        params.setSearchPanelMode(params.mode === 'image' ? 'vector' : 'feature')
        params.setSearchPanelCollapsed(false)
      }
    },
    onToggleManageMode: params.onToggleManageMode,
    onToggleMetadataManageMode: params.onToggleMetadataManageMode,
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
    onTogglePaletteMode: () => {
      const nextMode: AppSettings['paletteMode'] = params.paletteMode === 'day' ? 'night' : 'day'
      const pair = resolvePalettePairForStyle(params.styleId, params.paletteDayId, params.paletteNightId)
      const targetPaletteId = nextMode === 'night' ? pair.night : pair.day
      params.updateSettings({
        paletteMode: nextMode,
        paletteDayId: pair.day,
        paletteNightId: pair.night,
        paletteId: targetPaletteId,
        themeId: targetPaletteId,
      })
    },
    onOpenSettings: () => params.updateSettings({ settingsOpen: true }),
  }
}
