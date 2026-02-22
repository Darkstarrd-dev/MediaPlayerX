import type { MouseEvent as ReactMouseEvent, RefObject } from 'react'

import { buildE2eBenchSectionProps } from './buildE2eBenchSectionProps'
import { buildManageDeleteDialogProps } from './buildManageDeleteDialogProps'
import { useI18n } from '../../i18n/useI18n'
import type { AppTopLayerStateResult } from './useAppTopLayerState'
import type { AppWorkspacePropsResult } from './useAppWorkspaceProps'
import type { ImportPipelineResult } from '../import/useImportPipeline'
import type { RepositoryBootstrapDataResult } from './useRepositoryBootstrapData'
import type { BrowserMode } from '../../types'

interface ManageDeleteDialogInput {
  open: boolean
  pending: boolean
  confirmManageDelete: () => Promise<void>
  confirmManageRemoveOnly: () => Promise<void>
  removeOnlyEnabled: boolean
  targetPaths: string[]
  setDeleteConfirmOpen: (value: boolean | ((previous: boolean) => boolean)) => void
}

interface ManageGroupDialogInput {
  open: boolean
  pending: boolean
  value: string
  onChange: (value: string) => void
  onCancel: () => void
  onGroup: () => Promise<void>
  onMove: () => Promise<void>
}

interface SidebarRenameDialogInput {
  open: boolean
  pending: boolean
  mode: 'single' | 'replace' | 'numbering' | 'remove-range' | 'metadata'
  targetCount: number
  value: string
  replaceFrom: string
  replaceTo: string
  numberBase: string
  numberStart: string
  numberStep: string
  numberPadWidth: string
  removeStart: string
  removeEnd: string
  removeHead: string
  removeTail: string
  metadataTemplate: string
  previewRows: Array<{ nodeId: string; sourceName: string; targetName: string; reason: string | null }>
  errorMessage: string | null
  onChange: (value: string) => void
  onModeChange: (value: 'single' | 'replace' | 'numbering' | 'remove-range' | 'metadata') => void
  onReplaceFromChange: (value: string) => void
  onReplaceToChange: (value: string) => void
  onNumberBaseChange: (value: string) => void
  onNumberStartChange: (value: string) => void
  onNumberStepChange: (value: string) => void
  onNumberPadWidthChange: (value: string) => void
  onRemoveStartChange: (value: string) => void
  onRemoveEndChange: (value: string) => void
  onRemoveHeadChange: (value: string) => void
  onRemoveTailChange: (value: string) => void
  onMetadataTemplateChange: (value: string) => void
  onRefreshPreview: () => void
  onCancel: () => void
  onConfirm: () => Promise<void>
}

interface UseAppShellPropsParams {
  repositoryMode: RepositoryBootstrapDataResult['repositoryMode']
  mode: BrowserMode
  sidebarCollapsed: boolean
  sidebarFocus: 'sidebar' | 'main'
  sidebarRatio: number
  metadataCollapsed: boolean
  metadataRatio: number
  layoutLocked: boolean
  appBodyRef: RefObject<HTMLDivElement | null>
  workspaceRef: RefObject<HTMLElement | null>
  workspaceBodyRef: RefObject<HTMLDivElement | null>
  onExpandSidebar: () => void
  onStartSidebarResize: (event: ReactMouseEvent<HTMLDivElement>) => void
  onStartMetadataResize: (event: ReactMouseEvent<HTMLDivElement>) => void
  topLayerState: Pick<
    AppTopLayerStateResult,
    | 'bannerBackendErrorRows'
    | 'runtimeCapabilityWarnings'
    | 'runtimeWarningDismiss'
    | 'fullscreenLayerProps'
    | 'helpPanelProps'
    | 'settingsPanelProps'
    | 'themeParameterPanelProps'
    | 'appHeaderProps'
    | 'importTaskPanelProps'
    | 'helpOverlayOpen'
  >
  workspaceState: AppWorkspacePropsResult
  importInputs: Pick<
    ImportPipelineResult,
    'fileImportInputRef' | 'folderImportInputRef' | 'onImportFilesSelected' | 'onImportFoldersSelected'
  >
  dragOverlayActive: ImportPipelineResult['dragOverlayActive']
  adReviewDeleteOverlayParams: {
    active: boolean
    completedCount: number
    totalCount: number
  }
  manageDeleteDialogParams: ManageDeleteDialogInput
  manageGroupDialogParams: ManageGroupDialogInput
  sidebarRenameDialogParams: SidebarRenameDialogInput
  e2eBenchSectionParams: Parameters<typeof buildE2eBenchSectionProps>[0]
}

export function useAppShellProps({
  repositoryMode,
  mode,
  sidebarCollapsed,
  sidebarFocus,
  sidebarRatio,
  metadataCollapsed,
  metadataRatio,
  layoutLocked,
  appBodyRef,
  workspaceRef,
  workspaceBodyRef,
  onExpandSidebar,
  onStartSidebarResize,
  onStartMetadataResize,
  topLayerState,
  workspaceState,
  importInputs,
  dragOverlayActive,
  adReviewDeleteOverlayParams,
  manageDeleteDialogParams,
  manageGroupDialogParams,
  sidebarRenameDialogParams,
  e2eBenchSectionParams,
}: UseAppShellPropsParams) {
  const { t } = useI18n()

  const manageDeleteDialogProps = buildManageDeleteDialogProps({
    ...manageDeleteDialogParams,
    title: t('ui.manage.deleteDialogTitle'),
    description: t('ui.manage.deleteDialogDescription'),
    targetListTitle: t('ui.manage.deleteDialogTargetListTitle'),
    targetPaths: manageDeleteDialogParams.targetPaths,
    acknowledgeLabel: t('ui.manage.deleteDialogAcknowledge'),
    confirmLabel: t('ui.manage.deleteDialogConfirm'),
    removeOnlyLabel: t('ui.manage.deleteDialogRemoveOnly'),
    removeOnlyEnabled: manageDeleteDialogParams.removeOnlyEnabled,
    cancelLabel: t('ui.common.cancel'),
  })
  const e2eBenchSectionProps = buildE2eBenchSectionProps(e2eBenchSectionParams)

  const manageGroupDialogProps = {
    open: manageGroupDialogParams.open,
    pending: manageGroupDialogParams.pending,
    inputLabel: t('ui.manage.groupDialogInputLabel'),
    inputPlaceholder: t('ui.manage.groupDialogInputPlaceholder'),
    value: manageGroupDialogParams.value,
    groupLabel: t('ui.common.groupShort'),
    moveLabel: t('ui.common.moveShort'),
    cancelLabel: t('ui.common.cancelShort'),
    onChange: manageGroupDialogParams.onChange,
    onCancel: manageGroupDialogParams.onCancel,
    onGroup: () => {
      void manageGroupDialogParams.onGroup()
    },
    onMove: () => {
      void manageGroupDialogParams.onMove()
    },
  }

  const sidebarRenameDialogProps = {
    open: sidebarRenameDialogParams.open,
    pending: sidebarRenameDialogParams.pending,
    mode: sidebarRenameDialogParams.mode,
    targetCount: sidebarRenameDialogParams.targetCount,
    inputLabel: t('ui.sidebar.renameDialogInputLabel'),
    inputPlaceholder: t('ui.sidebar.renameDialogInputPlaceholder'),
    modeLabel: t('ui.sidebar.renameDialogModeLabel'),
    modeOptionReplace: t('ui.sidebar.renameDialogModeReplace'),
    modeOptionNumbering: t('ui.sidebar.renameDialogModeNumbering'),
    modeOptionRemoveRange: t('ui.sidebar.renameDialogModeRemoveRange'),
    modeOptionMetadata: t('ui.sidebar.renameDialogModeMetadata'),
    modeOptionSingle: t('ui.sidebar.renameDialogModeSingle'),
    replaceFromPlaceholder: t('ui.sidebar.renameDialogReplaceFromPlaceholder'),
    replaceToPlaceholder: t('ui.sidebar.renameDialogReplaceToPlaceholder'),
    numberBasePlaceholder: t('ui.sidebar.renameDialogNumberBasePlaceholder'),
    numberStartPlaceholder: t('ui.sidebar.renameDialogNumberStartPlaceholder'),
    numberStepPlaceholder: t('ui.sidebar.renameDialogNumberStepPlaceholder'),
    numberPadWidthPlaceholder: t('ui.sidebar.renameDialogNumberPadWidthPlaceholder'),
    removeStartPlaceholder: t('ui.sidebar.renameDialogRemoveStartPlaceholder'),
    removeEndPlaceholder: t('ui.sidebar.renameDialogRemoveEndPlaceholder'),
    removeHeadPlaceholder: t('ui.sidebar.renameDialogRemoveHeadPlaceholder'),
    removeTailPlaceholder: t('ui.sidebar.renameDialogRemoveTailPlaceholder'),
    removeRangeHint: t('ui.sidebar.renameDialogRemoveRangeHint'),
    removeEdgesHint: t('ui.sidebar.renameDialogRemoveEdgesHint'),
    metadataTemplatePlaceholder: t('ui.sidebar.renameDialogMetadataTemplatePlaceholder'),
    previewLabel: t('ui.sidebar.renameDialogPreviewLabel'),
    previewSummaryText:
      sidebarRenameDialogParams.previewRows.length > 0
        ? t('ui.sidebar.renameDialogPreviewSummary', {
            total: String(sidebarRenameDialogParams.previewRows.length),
            failed: String(sidebarRenameDialogParams.previewRows.filter((row) => row.reason).length),
          })
        : null,
    confirmLabel: t('ui.common.confirm'),
    cancelLabel: t('ui.common.cancel'),
    value: sidebarRenameDialogParams.value,
    replaceFrom: sidebarRenameDialogParams.replaceFrom,
    replaceTo: sidebarRenameDialogParams.replaceTo,
    numberBase: sidebarRenameDialogParams.numberBase,
    numberStart: sidebarRenameDialogParams.numberStart,
    numberStep: sidebarRenameDialogParams.numberStep,
    numberPadWidth: sidebarRenameDialogParams.numberPadWidth,
    removeStart: sidebarRenameDialogParams.removeStart,
    removeEnd: sidebarRenameDialogParams.removeEnd,
    removeHead: sidebarRenameDialogParams.removeHead,
    removeTail: sidebarRenameDialogParams.removeTail,
    metadataTemplate: sidebarRenameDialogParams.metadataTemplate,
    previewRows: sidebarRenameDialogParams.previewRows,
    errorMessage: sidebarRenameDialogParams.errorMessage,
    onChange: sidebarRenameDialogParams.onChange,
    onModeChange: sidebarRenameDialogParams.onModeChange,
    onReplaceFromChange: sidebarRenameDialogParams.onReplaceFromChange,
    onReplaceToChange: sidebarRenameDialogParams.onReplaceToChange,
    onNumberBaseChange: sidebarRenameDialogParams.onNumberBaseChange,
    onNumberStartChange: sidebarRenameDialogParams.onNumberStartChange,
    onNumberStepChange: sidebarRenameDialogParams.onNumberStepChange,
    onNumberPadWidthChange: sidebarRenameDialogParams.onNumberPadWidthChange,
    onRemoveStartChange: sidebarRenameDialogParams.onRemoveStartChange,
    onRemoveEndChange: sidebarRenameDialogParams.onRemoveEndChange,
    onRemoveHeadChange: sidebarRenameDialogParams.onRemoveHeadChange,
    onRemoveTailChange: sidebarRenameDialogParams.onRemoveTailChange,
    onMetadataTemplateChange: sidebarRenameDialogParams.onMetadataTemplateChange,
    onRefreshPreview: sidebarRenameDialogParams.onRefreshPreview,
    onCancel: sidebarRenameDialogParams.onCancel,
    onConfirm: () => {
      void sidebarRenameDialogParams.onConfirm()
    },
  }

  const importSourceInputsProps = {
    fileImportInputRef: importInputs.fileImportInputRef,
    folderImportInputRef: importInputs.folderImportInputRef,
    onImportFilesSelected: importInputs.onImportFilesSelected,
    onImportFoldersSelected: importInputs.onImportFoldersSelected,
  }

  const appTopBannersProps = {
    backendErrorRows: topLayerState.bannerBackendErrorRows,
    repositoryMode,
    runtimeWarningVisible: topLayerState.runtimeWarningDismiss.visible,
    runtimeCapabilityWarnings: topLayerState.runtimeCapabilityWarnings,
    onDismissRuntimeWarning: topLayerState.runtimeWarningDismiss.dismiss,
    importTaskPanelProps: topLayerState.importTaskPanelProps,
  }

  const appWorkspaceProps = {
    mode,
    sidebarCollapsed,
    sidebarFocus,
    sidebarRatio,
    metadataCollapsed,
    metadataRatio,
    layoutLocked,
    appBodyRef,
    workspaceRef,
    workspaceBodyRef,
    onExpandSidebar,
    onStartSidebarResize,
    onStartMetadataResize,
    sidebarPanelProps: workspaceState.sidebarPanelProps,
    imageMainSectionProps: workspaceState.imageMainSectionProps,
    videoMainSectionProps: workspaceState.videoMainSectionProps,
    musicMainSectionProps: workspaceState.musicMainSectionProps,
    metadataPanelProps: workspaceState.metadataPanelProps,
    mainFooter: workspaceState.mainFooter,
  }

  return {
    appHeaderProps: topLayerState.appHeaderProps,
    importSourceInputsProps,
    appTopBannersProps,
    appWorkspaceProps,
    fullscreenLayerProps: topLayerState.fullscreenLayerProps,
    helpPanelProps: topLayerState.helpPanelProps,
    settingsPanelProps: topLayerState.settingsPanelProps,
    themeParameterPanelProps: topLayerState.themeParameterPanelProps,
    manageDeleteDialogProps,
    manageGroupDialogProps,
    sidebarRenameDialogProps,
    dragOverlayActive,
    helpOverlayActive: topLayerState.helpOverlayOpen,
    adReviewDeleteOverlayProps: adReviewDeleteOverlayParams,
    e2eBenchSectionProps,
  }
}
