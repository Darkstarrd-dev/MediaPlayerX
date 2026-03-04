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
  headerDebugGroupVisible: boolean
  tooltipEnabled: boolean
  electronNativeChromeEnabled: boolean
  themeParameterButtonVisible: boolean
  popoverDebugPinned: boolean
  settingsOpen?: boolean
  helpOpen?: boolean
  themeParameterPanelOpen?: boolean
  interactionLocked?: boolean
  importMenuOpen: boolean
  taskStatusLabel: string
  taskStatusBusy: boolean
  importReviewAlerting?: boolean
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
  onTooltipEnabledChange: (value: boolean) => void
  onElectronNativeChromeEnabledChange: (value: boolean) => void
  onThemeParameterButtonVisibleChange: (value: boolean) => void
  onOpenThemeParameter: () => void
  sidebarCollapsed?: boolean
  metadataCollapsed?: boolean
  onToggleSidebarPanel?: () => void
  onToggleMetadataPanel?: () => void
  layoutConvergedInsetPx?: number
}

export function buildAppHeaderProps(params: BuildAppHeaderPropsParams): AppHeaderProps {
  const activePaletteId = params.paletteMode === 'night' ? params.paletteNightId : params.paletteDayId
  const luxuryWhiteActive = params.styleId.startsWith('soft-skeuomorphic') && activePaletteId === 'skeuomorphic-luxury-white'
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
    interactionLocked: Boolean(params.interactionLocked),
    importMenuOpen: params.importMenuOpen,
    taskStatusLabel: params.taskStatusLabel,
    taskStatusBusy: params.taskStatusBusy,
    importReviewAlerting: Boolean(params.importReviewAlerting),
    importTaskPanelOpen: params.importTaskPanelOpen,
    autoPlayPresets: params.autoPlayPresets,
    onToggleImportMenu: () => params.setImportMenuOpen((value) => !value),
    onToggleImportTaskPanel: () => params.setImportTaskPanelOpen((value) => !value),
    onCloseImportMenu: () => params.setImportMenuOpen(false),
    onImportFiles: params.openImportFilesDialog,
    onImportFolders: params.openImportFoldersDialog,
    onModeChange: (nextMode) => {
      if (params.interactionLocked) {
        return
      }
      params.updateSettings({ mode: nextMode })
    },
    onToggleSearchPanel: () => {
      if (params.interactionLocked) {
        return
      }
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
    onToggleManageMode: () => {
      if (params.interactionLocked) {
        return
      }
      params.onToggleManageMode()
    },
    onToggleMetadataManageMode: () => {
      if (params.interactionLocked) {
        return
      }
      params.onToggleMetadataManageMode()
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
    headerDebugGroupVisible: params.headerDebugGroupVisible,
    tooltipEnabled: params.tooltipEnabled,
    electronNativeChromeEnabled: params.electronNativeChromeEnabled,
    onTooltipEnabledChange: params.onTooltipEnabledChange,
    onElectronNativeChromeEnabledChange: params.onElectronNativeChromeEnabledChange,
    themeParameterButtonVisible: params.themeParameterButtonVisible,
    settingsOpen: params.settingsOpen ?? false,
    helpOpen: params.helpOpen ?? false,
    themeParameterPanelOpen: params.themeParameterPanelOpen ?? false,
    onThemeParameterButtonVisibleChange: params.onThemeParameterButtonVisibleChange,
    onOpenThemeParameter: params.onOpenThemeParameter,
    popoverDebugPinned: params.popoverDebugPinned,
    onTogglePopoverDebugPinned: () => params.updateSettings({ popoverDebugPinned: !params.popoverDebugPinned }),
    onOpenHelp: () => params.updateSettings({ helpOpen: true }),
    onOpenSettings: () =>
      params.updateSettings({
        settingsOpen: true,
        settingsPanelSection: 'layout',
      }),
    sidebarCollapsed: params.sidebarCollapsed ?? false,
    metadataCollapsed: params.metadataCollapsed ?? false,
    showPanelToggleControls: luxuryWhiteActive,
    onToggleSidebarPanel: params.onToggleSidebarPanel,
    onToggleMetadataPanel: params.onToggleMetadataPanel,
    layoutConvergedInsetPx: params.layoutConvergedInsetPx ?? 0,
  }
}
