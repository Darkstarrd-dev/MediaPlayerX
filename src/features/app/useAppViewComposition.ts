import { useAppShellProps } from './useAppShellProps'
import { useAppTopLayerBindings } from './useAppTopLayerBindings'
import { useAppWorkspaceBindings } from './useAppWorkspaceBindings'
import type { useAppRuntimeSources } from './useAppRuntimeSources'
import type { useAppReadAndNavigation } from './useAppReadAndNavigation'
import type { useAppDisplayAndEffects } from './useAppDisplayAndEffects'

interface UseAppViewCompositionParams {
  runtimeSources: ReturnType<typeof useAppRuntimeSources>
  readNavigationState: ReturnType<typeof useAppReadAndNavigation>
  displayState: ReturnType<typeof useAppDisplayAndEffects>
}

export function useAppViewComposition({
  runtimeSources,
  readNavigationState,
  displayState,
}: UseAppViewCompositionParams) {
  const {
    benchSettings,
    appSettings,
    repositoryBootstrap,
    sessionState,
    importState,
  } = runtimeSources

  const {
    mediaRepository,
    repositoryMode,
  } = repositoryBootstrap

  const {
    mode,
    headerHeight,
    sidebarRatio,
    metadataCollapsed,
    metadataRatio,
    layoutLocked,
    sidebarFocus,
  } = appSettings

  const {
    selectedPackageId,
    setSelectedPackageId,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    appBodyRef,
    workspaceRef,
    workspaceBodyRef,
  } = sessionState

  const topLayerState = useAppTopLayerBindings({
    runtimeSources,
    readNavigationState,
    displayState,
  })

  const workspaceState = useAppWorkspaceBindings({
    runtimeSources,
    readNavigationState,
    displayState,
    managementErrorRows: topLayerState.managementErrorRows,
  })

  const shellProps = useAppShellProps({
    repositoryMode,
    mode,
    headerHeight,
    sidebarCollapsed: readNavigationState.sidebarCollapsed,
    sidebarFocus,
    sidebarRatio,
    metadataCollapsed,
    metadataRatio,
    layoutLocked,
    appBodyRef,
    workspaceRef,
    workspaceBodyRef,
    onExpandSidebar: readNavigationState.onExpandSidebar,
    onStartSidebarResize: readNavigationState.onStartSidebarResize,
    onStartMetadataResize: readNavigationState.onStartMetadataResize,
    topLayerState: {
      bannerBackendErrorRows: topLayerState.bannerBackendErrorRows,
      runtimeCapabilityWarnings: topLayerState.runtimeCapabilityWarnings,
      runtimeWarningDismiss: topLayerState.runtimeWarningDismiss,
      fullscreenLayerProps: topLayerState.fullscreenLayerProps,
      settingsPanelProps: topLayerState.settingsPanelProps,
      appHeaderProps: topLayerState.appHeaderProps,
      importTaskPanelProps: topLayerState.importTaskPanelProps,
    },
    workspaceState,
    vectorUniverseSectionProps: displayState.vectorUniverseSectionProps,
    importInputs: {
      fileImportInputRef: importState.fileImportInputRef,
      folderImportInputRef: importState.folderImportInputRef,
      onImportFilesSelected: importState.onImportFilesSelected,
      onImportFoldersSelected: importState.onImportFoldersSelected,
    },
    dragOverlayActive: importState.dragOverlayActive,
    manageDeleteDialogParams: {
      open: deleteConfirmOpen,
      pending: displayState.backendWrite.pending.manage,
      confirmManageDelete: displayState.confirmManageDelete,
      setDeleteConfirmOpen,
    },
    e2eBenchSectionParams: {
      enabled: benchSettings.enabled,
      benchMode: benchSettings.mode,
      repository: mediaRepository,
      mode,
      orderedPackages: readNavigationState.orderedRootScopedPackages,
      selectedPackageId,
      setSelectedPackageId,
      pageIndex: displayState.backendPageSnapshot?.pageIndex ?? null,
      totalPages: displayState.imageTotalPagesEffective,
      pageLoading: readNavigationState.backendRead.page.loading,
      refsInPageCount: displayState.refsInPageEffective.length,
      goNextPage: readNavigationState.goNextPage,
      goPrevPage: readNavigationState.goPrevPage,
    },
  })

  return {
    onDragEnterImport: importState.onDragEnterImport,
    onDragLeaveImport: importState.onDragLeaveImport,
    onDragOverImport: importState.onDragOverImport,
    onDropImport: importState.onDropImport,
    ...shellProps,
  }
}
