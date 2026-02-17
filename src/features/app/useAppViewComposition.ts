import { useCallback, useState } from 'react'

import { useAppShellProps } from './useAppShellProps'
import { useAppTopLayerBindings } from './useAppTopLayerBindings'
import { useAppWorkspaceBindings } from './useAppWorkspaceBindings'
import { toErrorDetailWithCode } from './errorCode'
import type { AppRuntimeSourcesResult } from './useAppRuntimeSources'
import type { AppReadAndNavigationResult } from './useAppReadAndNavigation'
import type { AppDisplayAndEffectsResult } from './useAppDisplayAndEffects'
import type { MediaLocator } from '../../types'
import { useI18n } from '../../i18n/useI18n'

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
  const { t } = useI18n()
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
    sidebarRenameDialogOpen,
    sidebarRenameTargetNodeId,
    sidebarRenameDraft,
    setSidebarRenameDialogOpen,
    setSidebarRenameTargetNodeId,
    setSidebarRenameDraft,
    setManageOperationHint,
    appBodyRef,
    workspaceRef,
    workspaceBodyRef,
  } = sessionState

  const [sidebarRenamePending, setSidebarRenamePending] = useState(false)
  const [sidebarRenameError, setSidebarRenameError] = useState<string | null>(null)

  const closeSidebarRenameDialog = useCallback(() => {
    setSidebarRenameDialogOpen(false)
    setSidebarRenameTargetNodeId(null)
    setSidebarRenameDraft('')
    setSidebarRenamePending(false)
    setSidebarRenameError(null)
  }, [setSidebarRenameDialogOpen, setSidebarRenameDraft, setSidebarRenameTargetNodeId])

  const confirmSidebarRename = useCallback(async () => {
    if (!displayState.backendWrite.renameSidebarNode) {
      const unsupportedMessage = t('ui.manage.hint.renameUnsupported')
      setManageOperationHint(unsupportedMessage)
      setSidebarRenameError(unsupportedMessage)
      closeSidebarRenameDialog()
      return
    }

    const targetNodeId = sidebarRenameTargetNodeId?.trim() ?? ''
    const targetName = sidebarRenameDraft.trim()
    if (!targetNodeId) {
      closeSidebarRenameDialog()
      return
    }
    if (!targetName) {
      const emptyMessage = t('ui.manage.hint.renameNameRequired')
      setManageOperationHint(emptyMessage)
      setSidebarRenameError(emptyMessage)
      return
    }

    setSidebarRenamePending(true)
    setSidebarRenameError(null)

    try {
      const response = await displayState.backendWrite.renameSidebarNode(targetNodeId, targetName)
      if (response.renamed_count > 0) {
        const kindDelimiterIndex = targetNodeId.indexOf(':')
        const kind = kindDelimiterIndex > 0 ? targetNodeId.slice(0, kindDelimiterIndex) : ''
        const nextPath = response.target_path?.replace(/\\/g, '/') ?? ''
        if (kind && nextPath) {
          const nextNodeId = `${kind}:${nextPath}`
          sessionState.setSelectedSidebarNodeId(nextNodeId)
          requestAnimationFrame(() => readNavigationState.ensureSidebarNodeVisible(nextNodeId))
        }
        setManageOperationHint(t('ui.manage.hint.renameSuccess'))
        closeSidebarRenameDialog()
        return
      }

      const failedReason = response.failed[0]?.reason ?? t('ui.manage.hint.operationFailedUnknownReason')
      const failedMessage = t('ui.manage.hint.renameFailed', { message: failedReason })
      setManageOperationHint(failedMessage)
      setSidebarRenameError(failedMessage)
    } catch (error) {
      const failedMessage = t('ui.manage.hint.renameFailed', { message: toErrorDetailWithCode(error, t) })
      setManageOperationHint(failedMessage)
      setSidebarRenameError(failedMessage)
    } finally {
      readNavigationState.backendRead.retryLibrary()
      readNavigationState.backendRead.retrySidebar()
      readNavigationState.backendRead.retryPage()
      readNavigationState.backendRead.retryMetadata()
      setSidebarRenamePending(false)
    }
  }, [
    closeSidebarRenameDialog,
    displayState.backendWrite,
    readNavigationState,
    sessionState,
    setManageOperationHint,
    sidebarRenameDraft,
    sidebarRenameTargetNodeId,
    setSidebarRenamePending,
    t,
  ])

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
      helpOverlayOpen: topLayerState.helpOverlayOpen,
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
      onGroup: displayState.confirmManageGroup,
      onMove: displayState.confirmManageMove,
    },
    sidebarRenameDialogParams: {
      open: sidebarRenameDialogOpen,
      pending: sidebarRenamePending,
      value: sidebarRenameDraft,
      errorMessage: sidebarRenameError,
      onChange: (value) => {
        setSidebarRenameDraft(value)
        if (sidebarRenameError) {
          setSidebarRenameError(null)
        }
      },
      onCancel: closeSidebarRenameDialog,
      onConfirm: confirmSidebarRename,
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
