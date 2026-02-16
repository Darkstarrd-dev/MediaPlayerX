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
    searchPanelProps: workspaceState.searchPanelProps,
    managementPanelProps: workspaceState.managementPanelProps,
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
    manageDeleteDialogProps,
    manageGroupDialogProps,
    dragOverlayActive,
    helpOverlayActive: topLayerState.helpOverlayOpen,
    adReviewDeleteOverlayProps: adReviewDeleteOverlayParams,
    e2eBenchSectionProps,
  }
}
