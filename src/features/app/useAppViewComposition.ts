import { useAppShellProps } from './useAppShellProps'
import { useAppTopLayerBindings } from './useAppTopLayerBindings'
import { useAppWorkspaceBindings } from './useAppWorkspaceBindings'
import type { AppRuntimeSourcesResult } from './useAppRuntimeSources'
import type { AppReadAndNavigationResult } from './useAppReadAndNavigation'
import type { AppDisplayAndEffectsResult } from './useAppDisplayAndEffects'
import type { MediaLocator } from '../../types'

function resolveMediaLocatorPath(locator: MediaLocator): string {
  if (locator.kind === 'filesystem') {
    return locator.absolutePath
  }
  return `${locator.archivePath}#${locator.entryName}`
}

function buildManageDeleteTargetPaths(readNavigationState: AppReadAndNavigationResult): string[] {
  const targetPaths: string[] = []
  const pathSet = new Set<string>()

  for (const nodeId of readNavigationState.sidebarCheckedNodeIds) {
    const node = readNavigationState.sidebarNodeById.get(nodeId)
    if (!node) {
      continue
    }

    const packagePath = node.packageId ? readNavigationState.packageByIdEffective.get(node.packageId)?.absolutePath : null
    const videoPath = node.videoId ? readNavigationState.videoByIdEffective.get(node.videoId)?.absolutePath : null
    const audioPath = node.audioId ? readNavigationState.audioByIdEffective.get(node.audioId)?.absolutePath : null
    const fallbackPath = node.pathKey
    const resolvedPath = packagePath ?? videoPath ?? audioPath ?? fallbackPath
    if (resolvedPath && !pathSet.has(resolvedPath)) {
      pathSet.add(resolvedPath)
      targetPaths.push(resolvedPath)
    }
  }

  if (readNavigationState.imageCheckedIds.length > 0) {
    const pendingImageIdSet = new Set(readNavigationState.imageCheckedIds)
    for (const imagePackage of readNavigationState.packageByIdEffective.values()) {
      if (pendingImageIdSet.size === 0) {
        break
      }

      for (const image of imagePackage.images) {
        if (!pendingImageIdSet.has(image.id)) {
          continue
        }

        const path = resolveMediaLocatorPath(image.mediaLocator)
        if (!pathSet.has(path)) {
          pathSet.add(path)
          targetPaths.push(path)
        }

        pendingImageIdSet.delete(image.id)
        if (pendingImageIdSet.size === 0) {
          break
        }
      }
    }
  }

  return targetPaths
}

interface UseAppViewCompositionParams {
  runtimeSources: AppRuntimeSourcesResult
  readNavigationState: AppReadAndNavigationResult
  displayState: AppDisplayAndEffectsResult
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

  const manageDeleteTargetPaths = buildManageDeleteTargetPaths(readNavigationState)

  const shellProps = useAppShellProps({
    repositoryMode,
    mode,
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
      helpPanelProps: topLayerState.helpPanelProps,
      settingsPanelProps: topLayerState.settingsPanelProps,
      appHeaderProps: topLayerState.appHeaderProps,
      importTaskPanelProps: topLayerState.importTaskPanelProps,
    },
    workspaceState,
    importInputs: {
      fileImportInputRef: importState.fileImportInputRef,
      folderImportInputRef: importState.folderImportInputRef,
      onImportFilesSelected: importState.onImportFilesSelected,
      onImportFoldersSelected: importState.onImportFoldersSelected,
    },
    dragOverlayActive: importState.dragOverlayActive,
    adReviewDeleteOverlayParams: {
      active: displayState.manageAdReview.deletePending,
      completedCount: displayState.manageAdReview.deleteProgress.completed,
      totalCount: displayState.manageAdReview.deleteProgress.total,
    },
    manageDeleteDialogParams: {
      open: deleteConfirmOpen,
      pending: displayState.backendWrite.pending.manage,
      confirmManageDelete: displayState.confirmManageDelete,
      confirmManageRemoveOnly: displayState.confirmManageRemoveOnly,
      removeOnlyEnabled: readNavigationState.sidebarCheckedNodeIds.length > 0,
      targetPaths: manageDeleteTargetPaths,
      setDeleteConfirmOpen,
    },
    manageGroupDialogParams: {
      open: displayState.groupNameDialogOpen,
      pending: displayState.backendWrite.pending.manage,
      value: displayState.groupNameDraft,
      onChange: (value) => displayState.setGroupNameDraft(value),
      onCancel: displayState.cancelManageGroup,
      onConfirm: displayState.confirmManageGroup,
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
