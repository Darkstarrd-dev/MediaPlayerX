import { useCallback, useEffect, useRef, useState } from "react";

import { useAppShellProps } from "./useAppShellProps";
import { useAppTopLayerBindings } from "./useAppTopLayerBindings";
import { useAppWorkspaceBindings } from "./useAppWorkspaceBindings";
import { toErrorDetailWithCode } from "./errorCode";
import type { AppRuntimeSourcesResult } from "./useAppRuntimeSources";
import type { AppReadAndNavigationResult } from "./useAppReadAndNavigation";
import type { AppDisplayAndEffectsResult } from "./useAppDisplayAndEffects";
import type { MediaLocator } from "../../types";
import type {
  RenameItemTargetDto,
  RenameItemsRequestDto,
  RenameItemsResponseDto,
} from "../../contracts/backend";
import { useI18n } from "../../i18n/useI18n";
import { computeRenameDialogParams } from "./renameDialogLogic";

function resolveMediaLocatorPath(locator: MediaLocator): string {
  if (locator.kind === "filesystem") {
    return locator.absolutePath;
  }
  return `${locator.archivePath}#${locator.entryName}`;
}

function buildManageDeleteTargetPaths(
  readNavigationState: AppReadAndNavigationResult,
): string[] {
  const targetPaths: string[] = [];
  const pathSet = new Set<string>();

  for (const nodeId of readNavigationState.sidebarCheckedNodeIds) {
    const node = readNavigationState.sidebarNodeById.get(nodeId);
    if (!node) {
      continue;
    }

    const packagePath = node.packageId
      ? readNavigationState.packageByIdEffective.get(node.packageId)
          ?.absolutePath
      : null;
    const videoPath = node.videoId
      ? readNavigationState.videoByIdEffective.get(node.videoId)?.absolutePath
      : null;
    const audioPath = node.audioId
      ? readNavigationState.audioByIdEffective.get(node.audioId)?.absolutePath
      : null;
    const fallbackPath = node.pathKey;
    const resolvedPath = packagePath ?? videoPath ?? audioPath ?? fallbackPath;
    if (resolvedPath && !pathSet.has(resolvedPath)) {
      pathSet.add(resolvedPath);
      targetPaths.push(resolvedPath);
    }
  }

  if (readNavigationState.imageCheckedIds.length > 0) {
    const pendingImageIdSet = new Set(readNavigationState.imageCheckedIds);
    for (const imagePackage of readNavigationState.packageByIdEffective.values()) {
      if (pendingImageIdSet.size === 0) {
        break;
      }

      for (const image of imagePackage.images) {
        if (!pendingImageIdSet.has(image.id)) {
          continue;
        }

        const path = resolveMediaLocatorPath(image.mediaLocator);
        if (!pathSet.has(path)) {
          pathSet.add(path);
          targetPaths.push(path);
        }

        pendingImageIdSet.delete(image.id);
        if (pendingImageIdSet.size === 0) {
          break;
        }
      }
    }
  }

  return targetPaths;
}

function toRenameTargetKey(target: RenameItemTargetDto): string {
  if (target.kind === "sidebar-node") {
    return `sidebar-node:${target.node_id}`;
  }
  if (target.kind === "image-item") {
    return `image-item:${target.image_id}`;
  }
  return `archive-entry:${target.archive_path}#${target.entry_name}`;
}

function buildRenamePreviewRows(
  response: RenameItemsResponseDto,
  orderedTargets: RenameItemTargetDto[],
): Array<{
  nodeId: string;
  sourceName: string;
  targetName: string;
  reason: string | null;
}> {
  const targetOrder = new Map<string, number>();
  orderedTargets.forEach((target, index) => {
    targetOrder.set(toRenameTargetKey(target), index);
  });

  const rows = response.results.map((item) => ({
    nodeId: JSON.stringify(item.target),
    targetKey: toRenameTargetKey(item.target),
    sourceName: item.source_name,
    targetName: item.target_name,
    reason: item.reason,
  }));
  const existing = new Set(rows.map((row) => row.nodeId));
  for (const failed of response.failed) {
    const nodeId = JSON.stringify(failed.target);
    if (existing.has(nodeId)) {
      continue;
    }
    const fallbackTarget = toRenameTargetKey(failed.target);
    rows.push({
      nodeId,
      targetKey: fallbackTarget,
      sourceName: fallbackTarget,
      targetName: fallbackTarget,
      reason: failed.reason,
    });
    existing.add(nodeId);
  }
  rows.sort((left, right) => {
    const leftOrder =
      targetOrder.get(left.targetKey) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder =
      targetOrder.get(right.targetKey) ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder;
  });
  return rows.map(({ nodeId, sourceName, targetName, reason }) => ({
    nodeId,
    sourceName,
    targetName,
    reason,
  }));
}

interface UseAppViewCompositionParams {
  runtimeSources: AppRuntimeSourcesResult;
  readNavigationState: AppReadAndNavigationResult;
  displayState: AppDisplayAndEffectsResult;
}

export function useAppViewComposition({
  runtimeSources,
  readNavigationState,
  displayState,
}: UseAppViewCompositionParams) {
  const { t } = useI18n();
  const {
    benchSettings,
    appSettings,
    repositoryBootstrap,
    sessionState,
    importState,
  } = runtimeSources;

  const { mediaRepository, repositoryMode } = repositoryBootstrap;

  const {
    mode,
    sidebarRatio,
    metadataCollapsed,
    metadataRatio,
    layoutLocked,
    sidebarFocus,
  } = appSettings;

  const {
    selectedPackageId,
    selectedSidebarNodeId,
    setSelectedPackageId,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    sidebarRenameDialogOpen,
    sidebarRenameTargetNodeId,
    sidebarRenameTargetNodeIds,
    sidebarRenameTargetImageIds,
    sidebarRenameDraft,
    sidebarRenameMode,
    sidebarRenameReplaceFrom,
    sidebarRenameReplaceTo,
    sidebarRenameNumberBase,
    sidebarRenameNumberStart,
    sidebarRenameNumberStep,
    sidebarRenameNumberPadWidth,
    sidebarRenameRemoveStart,
    sidebarRenameRemoveEnd,
    sidebarRenameRemoveHead,
    sidebarRenameRemoveTail,
    sidebarRenameMetadataTemplate,
    sidebarRenamePreviewRows,
    setSidebarRenameDialogOpen,
    setSidebarRenameTargetNodeId,
    setSidebarRenameTargetNodeIds,
    setSidebarRenameTargetImageIds,
    setSidebarRenameDraft,
    setSidebarRenameMode,
    setSidebarRenameReplaceFrom,
    setSidebarRenameReplaceTo,
    setSidebarRenameNumberBase,
    setSidebarRenameNumberStart,
    setSidebarRenameNumberStep,
    setSidebarRenameNumberPadWidth,
    setSidebarRenameRemoveStart,
    setSidebarRenameRemoveEnd,
    setSidebarRenameRemoveHead,
    setSidebarRenameRemoveTail,
    setSidebarRenameMetadataTemplate,
    setSidebarRenamePreviewRows,
    setManageOperationHint,
    appBodyRef,
    workspaceRef,
    workspaceBodyRef,
  } = sessionState;

  const topLayerState = useAppTopLayerBindings({
    runtimeSources,
    readNavigationState,
    displayState,
  });

  const workspaceState = useAppWorkspaceBindings({
    runtimeSources,
    readNavigationState,
    displayState,
    managementErrorRows: topLayerState.managementErrorRows,
  });

  const [sidebarRenamePending, setSidebarRenamePending] = useState(false);
  const [sidebarRenameError, setSidebarRenameError] = useState<string | null>(
    null,
  );
  const renamePreviewRequestIdRef = useRef(0);

  const closeSidebarRenameDialog = useCallback(() => {
    setSidebarRenameDialogOpen(false);
    setSidebarRenameTargetNodeId(null);
    setSidebarRenameTargetNodeIds([]);
    setSidebarRenameTargetImageIds([]);
    setSidebarRenameDraft("");
    setSidebarRenameMode("single");
    setSidebarRenameReplaceFrom("");
    setSidebarRenameReplaceTo("");
    setSidebarRenameNumberBase("item-");
    setSidebarRenameNumberStart("1");
    setSidebarRenameNumberStep("1");
    setSidebarRenameNumberPadWidth("3");
    setSidebarRenameRemoveStart("0");
    setSidebarRenameRemoveEnd("0");
    setSidebarRenameRemoveHead("0");
    setSidebarRenameRemoveTail("0");
    setSidebarRenameMetadataTemplate(
      "[author.jp(if exist)(author.en(if exist))]/[author(if only one exist)]-[circle just like author ] - [title.jp(if exist)]/[title(if only one exist)]",
    );
    setSidebarRenamePreviewRows([]);
    setSidebarRenamePending(false);
    setSidebarRenameError(null);
  }, [
    setSidebarRenameDialogOpen,
    setSidebarRenameDraft,
    setSidebarRenameMode,
    setSidebarRenameNumberBase,
    setSidebarRenameNumberPadWidth,
    setSidebarRenameNumberStart,
    setSidebarRenameNumberStep,
    setSidebarRenamePreviewRows,
    setSidebarRenameRemoveEnd,
    setSidebarRenameRemoveStart,
    setSidebarRenameRemoveHead,
    setSidebarRenameRemoveTail,
    setSidebarRenameMetadataTemplate,
    setSidebarRenameReplaceFrom,
    setSidebarRenameReplaceTo,
    setSidebarRenameTargetNodeId,
    setSidebarRenameTargetNodeIds,
    setSidebarRenameTargetImageIds,
  ]);

  const openManageRenameDialog = useCallback(() => {
    const result = computeRenameDialogParams({
      manageMode: true,
      sidebarCheckedNodeIds: readNavigationState.sidebarCheckedNodeIds,
      imageCheckedIds: readNavigationState.imageCheckedIds,
      sidebarNodeById: readNavigationState.sidebarNodeById,
      selectedSidebarNodeId,
      videosForSidebar: readNavigationState.videosForSidebar,
      packageByIdEffective: readNavigationState.packageByIdEffective,
    });
    if (!result) {
      return;
    }
    setSidebarRenameTargetNodeId(result.targetNodeId);
    setSidebarRenameTargetNodeIds(result.targetNodeIds);
    setSidebarRenameTargetImageIds(result.targetImageIds);
    setSidebarRenameDraft(result.draft);
    setSidebarRenameMode(result.renameMode);
    setSidebarRenamePreviewRows([]);
    setSidebarRenameError(null);
    setSidebarRenameDialogOpen(true);
  }, [
    readNavigationState.imageCheckedIds,
    readNavigationState.packageByIdEffective,
    readNavigationState.sidebarCheckedNodeIds,
    readNavigationState.sidebarNodeById,
    readNavigationState.videosForSidebar,
    selectedSidebarNodeId,
    setSidebarRenameDialogOpen,
    setSidebarRenameDraft,
    setSidebarRenameMode,
    setSidebarRenameError,
    setSidebarRenameTargetImageIds,
    setSidebarRenameTargetNodeId,
    setSidebarRenameTargetNodeIds,
    setSidebarRenamePreviewRows,
  ]);

  const buildBatchRenameRequest = useCallback(
    (previewOnly: boolean): RenameItemsRequestDto | null => {
      const failFast = false;
      const targets = [
        ...sidebarRenameTargetNodeIds.map((nodeId) => ({
          kind: "sidebar-node" as const,
          node_id: nodeId,
        })),
        ...sidebarRenameTargetImageIds.map((imageId) => ({
          kind: "image-item" as const,
          image_id: imageId,
        })),
      ];

      if (targets.length === 0) {
        return null;
      }

      if (sidebarRenameMode === "single") {
        return {
          targets,
          mode: "single",
          single_new_name: sidebarRenameDraft,
          fail_fast: failFast,
          preview_only: previewOnly,
        };
      }

      if (sidebarRenameMode === "replace") {
        return {
          targets,
          mode: "replace",
          replace_from: sidebarRenameReplaceFrom,
          replace_to: sidebarRenameReplaceTo,
          fail_fast: failFast,
          preview_only: previewOnly,
        };
      }
      if (sidebarRenameMode === "numbering") {
        return {
          targets,
          mode: "numbering",
          numbering_base_name: sidebarRenameNumberBase,
          numbering_start: Number.parseInt(sidebarRenameNumberStart, 10) || 1,
          numbering_step: Number.parseInt(sidebarRenameNumberStep, 10) || 1,
          numbering_pad_width:
            Number.parseInt(sidebarRenameNumberPadWidth, 10) || 3,
          fail_fast: failFast,
          preview_only: previewOnly,
        };
      }
      if (sidebarRenameMode === "remove-range") {
        const removeStart = Math.max(
          0,
          Number.parseInt(sidebarRenameRemoveStart, 10) || 0,
        );
        const removeEnd = Math.max(
          0,
          Number.parseInt(sidebarRenameRemoveEnd, 10) || 0,
        );
        const removeHead = Math.max(
          0,
          Number.parseInt(sidebarRenameRemoveHead, 10) || 0,
        );
        const removeTail = Math.max(
          0,
          Number.parseInt(sidebarRenameRemoveTail, 10) || 0,
        );
        return {
          targets,
          mode: "remove-range",
          remove_start: removeStart,
          remove_end: removeEnd,
          remove_head: removeHead,
          remove_tail: removeTail,
          fail_fast: failFast,
          preview_only: previewOnly,
        };
      }
      return {
        targets,
        mode: "metadata",
        metadata_template: sidebarRenameMetadataTemplate,
        fail_fast: failFast,
        preview_only: previewOnly,
      };
    },
    [
      sidebarRenameMode,
      sidebarRenameNumberBase,
      sidebarRenameNumberPadWidth,
      sidebarRenameNumberStart,
      sidebarRenameNumberStep,
      sidebarRenameRemoveEnd,
      sidebarRenameRemoveHead,
      sidebarRenameRemoveStart,
      sidebarRenameRemoveTail,
      sidebarRenameMetadataTemplate,
      sidebarRenameReplaceFrom,
      sidebarRenameReplaceTo,
      sidebarRenameTargetImageIds,
      sidebarRenameTargetNodeIds,
      sidebarRenameDraft,
    ],
  );

  const refreshSidebarRenamePreview = useCallback(async () => {
    if (!displayState.backendWrite.renameItems) {
      return;
    }
    const request = buildBatchRenameRequest(true);
    if (!request) {
      setSidebarRenamePreviewRows([]);
      return;
    }

    const requestId = renamePreviewRequestIdRef.current + 1;
    renamePreviewRequestIdRef.current = requestId;

    try {
      const response = await displayState.backendWrite.renameItems(request);
      if (renamePreviewRequestIdRef.current !== requestId) {
        return;
      }
      setSidebarRenamePreviewRows(
        buildRenamePreviewRows(response, request.targets),
      );
      setSidebarRenameError(null);
    } catch {
      if (renamePreviewRequestIdRef.current !== requestId) {
        return;
      }
      setSidebarRenameError(t("ui.manage.hint.operationFailedUnknownReason"));
    }
  }, [
    buildBatchRenameRequest,
    displayState.backendWrite,
    setSidebarRenameError,
    setSidebarRenamePreviewRows,
    t,
  ]);

  const confirmSidebarRename = useCallback(async () => {
    const batchModeActive =
      sidebarRenameTargetNodeIds.length + sidebarRenameTargetImageIds.length >
        1 || sidebarRenameMode !== "single";
    if (batchModeActive) {
      if (!displayState.backendWrite.renameItems) {
        const unsupportedMessage = t("ui.manage.hint.renameUnsupported");
        setManageOperationHint(unsupportedMessage);
        setSidebarRenameError(unsupportedMessage);
        return;
      }
      const request = buildBatchRenameRequest(false);
      if (!request) {
        closeSidebarRenameDialog();
        return;
      }

      setSidebarRenamePending(true);
      setSidebarRenameError(null);
      try {
        const response = await displayState.backendWrite.renameItems(request);
        if (response.failed.length === 0 && response.renamed_count > 0) {
          const renamedNodeIdMap = new Map<string, string>();
          for (const item of response.results) {
            if (item.target.kind !== "sidebar-node") {
              continue;
            }
            const separatorIndex = item.target.node_id.indexOf(":");
            if (separatorIndex <= 0) {
              continue;
            }
            const kind = item.target.node_id.slice(0, separatorIndex);
            const normalizedTargetPath = item.target_path.replace(/\\/g, "/");
            renamedNodeIdMap.set(
              item.target.node_id,
              `${kind}:${normalizedTargetPath}`,
            );
          }

          if (renamedNodeIdMap.size > 0) {
            setSidebarRenameTargetNodeIds((previous) =>
              previous.map((nodeId) => renamedNodeIdMap.get(nodeId) ?? nodeId),
            );
            setSidebarRenameTargetNodeId((previous) =>
              previous
                ? (renamedNodeIdMap.get(previous) ?? previous)
                : previous,
            );
            if (selectedSidebarNodeId) {
              const nextSelectedNodeId = renamedNodeIdMap.get(
                selectedSidebarNodeId,
              );
              if (nextSelectedNodeId) {
                sessionState.setSelectedSidebarNodeId(nextSelectedNodeId);
              }
            }
          }

          setManageOperationHint(t("ui.manage.hint.renameSuccess"));
          const executedRows = buildRenamePreviewRows(
            response,
            request.targets,
          );
          setSidebarRenamePreviewRows(
            executedRows.map((row) => {
              if (row.reason && row.reason !== "unchanged") {
                return row;
              }
              return {
                ...row,
                sourceName: row.targetName,
                reason: "unchanged",
              };
            }),
          );
          setSidebarRenameReplaceFrom("");
          setSidebarRenameReplaceTo("");
          setSidebarRenameError(null);
        } else {
          const failedReason =
            response.failed[0]?.reason ??
            t("ui.manage.hint.operationFailedUnknownReason");
          const failedMessage = t("ui.manage.hint.renameFailed", {
            message: failedReason,
          });
          setManageOperationHint(failedMessage);
          setSidebarRenameError(failedMessage);
        }
      } catch (error) {
        const failedMessage = t("ui.manage.hint.renameFailed", {
          message: toErrorDetailWithCode(error, t),
        });
        setManageOperationHint(failedMessage);
        setSidebarRenameError(failedMessage);
      } finally {
        readNavigationState.backendRead.retryLibrary();
        readNavigationState.backendRead.retrySidebar();
        readNavigationState.backendRead.retryPage();
        readNavigationState.backendRead.retryMetadata();
        setSidebarRenamePending(false);
      }
      return;
    }

    if (!displayState.backendWrite.renameSidebarNode) {
      const unsupportedMessage = t("ui.manage.hint.renameUnsupported");
      setManageOperationHint(unsupportedMessage);
      setSidebarRenameError(unsupportedMessage);
      closeSidebarRenameDialog();
      return;
    }

    const targetNodeId = sidebarRenameTargetNodeId?.trim() ?? "";
    const targetName = sidebarRenameDraft.trim();
    if (!targetNodeId) {
      closeSidebarRenameDialog();
      return;
    }
    if (!targetName) {
      const emptyMessage = t("ui.manage.hint.renameNameRequired");
      setManageOperationHint(emptyMessage);
      setSidebarRenameError(emptyMessage);
      return;
    }

    setSidebarRenamePending(true);
    setSidebarRenameError(null);

    try {
      const response = await displayState.backendWrite.renameSidebarNode(
        targetNodeId,
        targetName,
      );
      if (response.renamed_count > 0) {
        const kindDelimiterIndex = targetNodeId.indexOf(":");
        const kind =
          kindDelimiterIndex > 0
            ? targetNodeId.slice(0, kindDelimiterIndex)
            : "";
        const nextPath = response.target_path?.replace(/\\/g, "/") ?? "";
        if (kind && nextPath) {
          const nextNodeId = `${kind}:${nextPath}`;
          sessionState.setSelectedSidebarNodeId(nextNodeId);
          setSidebarRenameTargetNodeId(nextNodeId);
          setSidebarRenameTargetNodeIds([nextNodeId]);
          requestAnimationFrame(() =>
            readNavigationState.ensureSidebarNodeVisible(nextNodeId),
          );
        }
        setManageOperationHint(t("ui.manage.hint.renameSuccess"));
        setSidebarRenameReplaceFrom("");
        setSidebarRenameReplaceTo("");
        setSidebarRenameDraft(targetName);
        setSidebarRenameError(null);
        return;
      }

      const failedReason =
        response.failed[0]?.reason ??
        t("ui.manage.hint.operationFailedUnknownReason");
      const failedMessage = t("ui.manage.hint.renameFailed", {
        message: failedReason,
      });
      setManageOperationHint(failedMessage);
      setSidebarRenameError(failedMessage);
    } catch (error) {
      const failedMessage = t("ui.manage.hint.renameFailed", {
        message: toErrorDetailWithCode(error, t),
      });
      setManageOperationHint(failedMessage);
      setSidebarRenameError(failedMessage);
    } finally {
      readNavigationState.backendRead.retryLibrary();
      readNavigationState.backendRead.retrySidebar();
      readNavigationState.backendRead.retryPage();
      readNavigationState.backendRead.retryMetadata();
      setSidebarRenamePending(false);
    }
  }, [
    buildBatchRenameRequest,
    closeSidebarRenameDialog,
    displayState.backendWrite,
    readNavigationState,
    sessionState,
    setManageOperationHint,
    selectedSidebarNodeId,
    setSidebarRenameDraft,
    setSidebarRenameError,
    setSidebarRenamePreviewRows,
    setSidebarRenameReplaceFrom,
    setSidebarRenameReplaceTo,
    setSidebarRenameTargetNodeId,
    setSidebarRenameTargetNodeIds,
    sidebarRenameDraft,
    sidebarRenameMode,
    sidebarRenameTargetNodeId,
    sidebarRenameTargetImageIds.length,
    sidebarRenameTargetNodeIds.length,
    t,
  ]);

  useEffect(() => {
    if (!sidebarRenameDialogOpen) {
      return;
    }
    const batchModeActive =
      sidebarRenameTargetNodeIds.length + sidebarRenameTargetImageIds.length >
        1 || sidebarRenameMode !== "single";
    if (!batchModeActive) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      void refreshSidebarRenamePreview();
    }, 150);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    refreshSidebarRenamePreview,
    sidebarRenameDialogOpen,
    sidebarRenameMode,
    sidebarRenameDraft,
    sidebarRenameNumberBase,
    sidebarRenameNumberStart,
    sidebarRenameNumberStep,
    sidebarRenameNumberPadWidth,
    sidebarRenameRemoveStart,
    sidebarRenameRemoveEnd,
    sidebarRenameRemoveHead,
    sidebarRenameRemoveTail,
    sidebarRenameReplaceFrom,
    sidebarRenameReplaceTo,
    sidebarRenameMetadataTemplate,
    sidebarRenameTargetImageIds.length,
    sidebarRenameTargetNodeIds.length,
  ]);

  const workspaceStateWithRename = {
    ...workspaceState,
    imageMainSectionProps: {
      ...workspaceState.imageMainSectionProps,
      onManageRename: openManageRenameDialog,
    },
    videoMainSectionProps: {
      ...workspaceState.videoMainSectionProps,
      onManageRename: openManageRenameDialog,
    },
  };

  const manageDeleteTargetPaths =
    buildManageDeleteTargetPaths(readNavigationState);

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
      themeParameterPanelProps: topLayerState.themeParameterPanelProps,
      appHeaderProps: topLayerState.appHeaderProps,
      importTaskPanelProps: topLayerState.importTaskPanelProps,
      helpOverlayOpen: topLayerState.helpOverlayOpen,
    },
    workspaceState: workspaceStateWithRename,
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
      mode: sidebarRenameMode,
      targetCount:
        sidebarRenameTargetNodeIds.length + sidebarRenameTargetImageIds.length,
      value: sidebarRenameDraft,
      replaceFrom: sidebarRenameReplaceFrom,
      replaceTo: sidebarRenameReplaceTo,
      numberBase: sidebarRenameNumberBase,
      numberStart: sidebarRenameNumberStart,
      numberStep: sidebarRenameNumberStep,
      numberPadWidth: sidebarRenameNumberPadWidth,
      removeStart: sidebarRenameRemoveStart,
      removeEnd: sidebarRenameRemoveEnd,
      removeHead: sidebarRenameRemoveHead,
      removeTail: sidebarRenameRemoveTail,
      metadataTemplate: sidebarRenameMetadataTemplate,
      previewRows: sidebarRenamePreviewRows,
      errorMessage: sidebarRenameError,
      onChange: (value) => {
        setSidebarRenameDraft(value);
        if (sidebarRenameError) {
          setSidebarRenameError(null);
        }
      },
      onModeChange: setSidebarRenameMode,
      onReplaceFromChange: setSidebarRenameReplaceFrom,
      onReplaceToChange: setSidebarRenameReplaceTo,
      onNumberBaseChange: setSidebarRenameNumberBase,
      onNumberStartChange: setSidebarRenameNumberStart,
      onNumberStepChange: setSidebarRenameNumberStep,
      onNumberPadWidthChange: setSidebarRenameNumberPadWidth,
      onRemoveStartChange: setSidebarRenameRemoveStart,
      onRemoveEndChange: setSidebarRenameRemoveEnd,
      onRemoveHeadChange: setSidebarRenameRemoveHead,
      onRemoveTailChange: setSidebarRenameRemoveTail,
      onMetadataTemplateChange: setSidebarRenameMetadataTemplate,
      onRefreshPreview: () => {
        void refreshSidebarRenamePreview();
      },
      onUseSourceNameAsReplaceFrom: setSidebarRenameReplaceFrom,
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
  });

  return {
    onDragEnterImport: importState.onDragEnterImport,
    onDragLeaveImport: importState.onDragLeaveImport,
    onDragOverImport: importState.onDragOverImport,
    onDropImport: importState.onDropImport,
    ...shellProps,
  };
}
