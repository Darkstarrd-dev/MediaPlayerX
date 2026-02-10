import type { MouseEvent as ReactMouseEvent, RefObject } from 'react'

import { buildE2eBenchSectionProps } from './buildE2eBenchSectionProps'
import { buildManageDeleteDialogProps } from './buildManageDeleteDialogProps'
import type { AppTopLayerStateResult } from './useAppTopLayerState'
import type { AppWorkspacePropsResult } from './useAppWorkspaceProps'
import type { VectorUniverseBindingsResult } from './useVectorUniverseBindings'
import type { ImportPipelineResult } from '../import/useImportPipeline'
import type { RepositoryBootstrapDataResult } from './useRepositoryBootstrapData'
import type { BrowserMode } from '../../types'

interface UseAppShellPropsParams {
  repositoryMode: RepositoryBootstrapDataResult['repositoryMode']
  mode: BrowserMode
  headerHeight: number
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
    | 'settingsPanelProps'
    | 'appHeaderProps'
    | 'importTaskPanelProps'
  >
  workspaceState: AppWorkspacePropsResult
  vectorUniverseSectionProps: VectorUniverseBindingsResult['vectorUniverseSectionProps']
  importInputs: Pick<
    ImportPipelineResult,
    'fileImportInputRef' | 'folderImportInputRef' | 'onImportFilesSelected' | 'onImportFoldersSelected'
  >
  dragOverlayActive: ImportPipelineResult['dragOverlayActive']
  manageDeleteDialogParams: Parameters<typeof buildManageDeleteDialogProps>[0]
  e2eBenchSectionParams: Parameters<typeof buildE2eBenchSectionProps>[0]
}

export function useAppShellProps({
  repositoryMode,
  mode,
  headerHeight,
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
  vectorUniverseSectionProps,
  importInputs,
  dragOverlayActive,
  manageDeleteDialogParams,
  e2eBenchSectionParams,
}: UseAppShellPropsParams) {
  const manageDeleteDialogProps = buildManageDeleteDialogProps(manageDeleteDialogParams)
  const e2eBenchSectionProps = buildE2eBenchSectionProps(e2eBenchSectionParams)

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
    headerHeight,
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
    metadataPanelProps: workspaceState.metadataPanelProps,
    mainFooter: workspaceState.mainFooter,
  }

  return {
    appHeaderProps: topLayerState.appHeaderProps,
    importSourceInputsProps,
    appTopBannersProps,
    appWorkspaceProps,
    fullscreenLayerProps: topLayerState.fullscreenLayerProps,
    vectorUniverseSectionProps,
    settingsPanelProps: topLayerState.settingsPanelProps,
    manageDeleteDialogProps,
    dragOverlayActive,
    e2eBenchSectionProps,
  }
}
