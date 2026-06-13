import { promises as fs } from "node:fs";
import path from "node:path";

import type {
  RenameSidebarNodeRequestDto,
  RenameSidebarNodeResponseDto,
  RenameSidebarNodesRequestDto,
  RenameSidebarNodesResponseDto,
} from "../../../src/contracts/backend";
import { isPathAllowlisted } from "../../fileSystemMediaAccessGuard";
import { normalizeAllowlistKey } from "../../fileSystemServiceHelpers";
import {
  buildMetadataSynthesisName,
  isFileSystemRootPath,
  isValidGroupName,
  parseSidebarNodeId,
  resolveSidebarNodeSourcePath,
} from "./managementMutationService.helpers";
import type { ManagementRenameServiceDependencies } from "./managementRenameService.types";

function applyRemoveRangeUnion(
  sourceName: string,
  removeStart?: number,
  removeEnd?: number,
  removeHead?: number,
  removeTail?: number,
): string {
  const length = sourceName.length;
  if (length === 0) {
    return sourceName;
  }

  const intervals: Array<{ start: number; endExclusive: number }> = [];
  const normalizedStart = Math.max(0, removeStart ?? 0);
  const normalizedEnd = Math.max(0, removeEnd ?? 0);
  if (
    normalizedStart > 0 &&
    normalizedEnd > 0 &&
    normalizedEnd >= normalizedStart
  ) {
    const startIndex = Math.min(length, normalizedStart - 1);
    const endExclusive = Math.min(length, normalizedEnd);
    if (endExclusive > startIndex) {
      intervals.push({ start: startIndex, endExclusive });
    }
  }

  const normalizedHead = Math.max(0, removeHead ?? 0);
  if (normalizedHead > 0) {
    const endExclusive = Math.min(length, normalizedHead);
    if (endExclusive > 0) {
      intervals.push({ start: 0, endExclusive });
    }
  }

  const normalizedTail = Math.max(0, removeTail ?? 0);
  if (normalizedTail > 0) {
    const start = Math.max(0, length - normalizedTail);
    if (start < length) {
      intervals.push({ start, endExclusive: length });
    }
  }

  if (intervals.length === 0) {
    return sourceName;
  }

  intervals.sort((left, right) => left.start - right.start);
  let cursor = 0;
  let nextName = "";
  for (const interval of intervals) {
    if (interval.endExclusive <= cursor) {
      continue;
    }
    if (interval.start > cursor) {
      nextName += sourceName.slice(cursor, interval.start);
    }
    cursor = Math.max(cursor, interval.endExclusive);
  }
  if (cursor < length) {
    nextName += sourceName.slice(cursor);
  }
  return nextName;
}

function splitNameAndExtension(fileName: string): {
  baseName: string;
  extension: string;
} {
  const extension = path.extname(fileName);
  if (!extension) {
    return {
      baseName: fileName,
      extension: "",
    };
  }
  return {
    baseName: fileName.slice(0, fileName.length - extension.length),
    extension,
  };
}

function withNumericSuffix(fileName: string, index: number): string {
  const { baseName, extension } = splitNameAndExtension(fileName);
  return `${baseName}-${index}${extension}`;
}

export async function renameSidebarNodesOperation(
  dependencies: ManagementRenameServiceDependencies,
  request: RenameSidebarNodesRequestDto,
): Promise<RenameSidebarNodesResponseDto> {
  const now = Date.now();
  const previewOnly = request.preview_only ?? false;
  const failFast = request.fail_fast ?? true;
  const effectiveFailFast = previewOnly ? false : failFast;
  const normalizedNodeIds = Array.from(
    new Set(request.node_ids.map((value) => value.trim()).filter(Boolean)),
  );
  if (normalizedNodeIds.length === 0) {
    throw new Error("批量重命名失败：未提供节点 id");
  }

  await dependencies.ensureStateLoaded();
  const snapshot = await dependencies.ensureSnapshotLoaded();
  const mediaAccessContext = dependencies.buildMediaAccessContext();
  const failed: Array<{ node_id: string; reason: string }> = [];
  const results: RenameSidebarNodesResponseDto["results"] = [];

  const resolvedTargets: Array<{
    nodeId: string;
    sourcePath: string;
    sourceName: string;
    sourceStat: Awaited<ReturnType<typeof fs.stat>>;
    targetName: string;
    targetPath: string;
  }> = [];

  if (request.mode === "replace" && (request.replace_from ?? "").length === 0) {
    throw new Error("批量重命名失败：replace_from 不能为空");
  }

  for (const [index, nodeId] of normalizedNodeIds.entries()) {
    const parsed = parseSidebarNodeId(nodeId);
    if (!parsed) {
      failed.push({ node_id: nodeId, reason: "invalid node id" });
      if (effectiveFailFast) {
        break;
      }
      continue;
    }

    const sourcePath = resolveSidebarNodeSourcePath(parsed, snapshot);
    if (!sourcePath) {
      failed.push({ node_id: nodeId, reason: "node not found" });
      if (effectiveFailFast) {
        break;
      }
      continue;
    }

    const resolvedSourcePath = path.resolve(sourcePath);
    if (isFileSystemRootPath(resolvedSourcePath)) {
      failed.push({
        node_id: nodeId,
        reason: "refuse to rename filesystem root",
      });
      if (effectiveFailFast) {
        break;
      }
      continue;
    }

    if (!isPathAllowlisted(resolvedSourcePath, mediaAccessContext)) {
      failed.push({ node_id: nodeId, reason: "path outside allowlist" });
      if (effectiveFailFast) {
        break;
      }
      continue;
    }

    const sourceStat = await fs.stat(resolvedSourcePath).catch(() => null);
    if (!sourceStat) {
      failed.push({ node_id: nodeId, reason: "path not found" });
      if (effectiveFailFast) {
        break;
      }
      continue;
    }

    const sourceExtension = sourceStat.isFile()
      ? path.extname(resolvedSourcePath)
      : "";
    const sourceBaseName = sourceStat.isFile()
      ? path.basename(resolvedSourcePath, sourceExtension)
      : path.basename(resolvedSourcePath);

    let nextBaseName = sourceBaseName;
    if (request.mode === "replace") {
      const replaceFrom = request.replace_from ?? "";
      const replaceTo = request.replace_to ?? "";
      nextBaseName =
        replaceFrom.length > 0
          ? sourceBaseName.split(replaceFrom).join(replaceTo)
          : sourceBaseName;
    } else if (request.mode === "numbering") {
      const start = request.numbering_start ?? 1;
      const step = request.numbering_step ?? 1;
      const padWidth = request.numbering_pad_width ?? 3;
      const value = start + index * step;
      nextBaseName = `${request.numbering_base_name ?? ""}${String(value).padStart(padWidth, "0")}`;
    } else if (request.mode === "remove-range") {
      nextBaseName = applyRemoveRangeUnion(
        sourceBaseName,
        request.remove_start,
        request.remove_end,
        request.remove_head,
        request.remove_tail,
      );
    } else {
      nextBaseName = buildMetadataSynthesisName(
        parsed,
        snapshot,
        resolvedSourcePath,
      );
    }

    const normalizedTargetBaseName = nextBaseName.trim();
    if (!isValidGroupName(normalizedTargetBaseName)) {
      failed.push({ node_id: nodeId, reason: "invalid target name" });
      if (effectiveFailFast) {
        break;
      }
      continue;
    }

    const targetName = sourceStat.isFile()
      ? normalizedTargetBaseName
          .toLowerCase()
          .endsWith(sourceExtension.toLowerCase())
        ? normalizedTargetBaseName
        : `${normalizedTargetBaseName}${sourceExtension}`
      : normalizedTargetBaseName;
    const targetPath = path.resolve(
      path.join(path.dirname(resolvedSourcePath), targetName),
    );

    if (
      normalizeAllowlistKey(targetPath) ===
      normalizeAllowlistKey(resolvedSourcePath)
    ) {
      failed.push({ node_id: nodeId, reason: "source equals target" });
      if (effectiveFailFast) {
        break;
      }
      continue;
    }

    resolvedTargets.push({
      nodeId,
      sourcePath: resolvedSourcePath,
      sourceName: sourceBaseName,
      sourceStat,
      targetName,
      targetPath,
    });
  }

  if (failed.length === 0) {
    const sourceKeySet = new Set(
      resolvedTargets.map((item) => normalizeAllowlistKey(item.sourcePath)),
    );
    const plannedTargetByDir = new Map<string, Set<string>>();

    for (const target of resolvedTargets) {
      const targetDir = path.dirname(target.targetPath);
      const fileName = path.basename(target.targetPath);
      const usedNames = plannedTargetByDir.get(targetDir) ?? new Set<string>();

      let resolvedFileName = fileName;
      let suffixIndex = 2;
      let collided = false;
      while (true) {
        const candidatePath = path.resolve(
          path.join(targetDir, resolvedFileName),
        );
        const candidateKey = normalizeAllowlistKey(candidatePath);
        const alreadyUsed = usedNames.has(resolvedFileName.toLowerCase());
        const exists = await fs.stat(candidatePath).catch(() => null);
        const existsConflict =
          Boolean(exists) && !sourceKeySet.has(candidateKey);
        if (!alreadyUsed && !existsConflict) {
          target.targetPath = candidatePath;
          target.targetName = resolvedFileName;
          usedNames.add(resolvedFileName.toLowerCase());
          plannedTargetByDir.set(targetDir, usedNames);
          break;
        }
        collided = true;
        resolvedFileName = withNumericSuffix(fileName, suffixIndex);
        suffixIndex += 1;
      }

      if (previewOnly && collided) {
        failed.push({
          node_id: target.nodeId,
          reason: "duplicate destination",
        });
      }
    }
  }

  const failureNodeIdSet = new Set(failed.map((item) => item.node_id));
  const applyTargets =
    effectiveFailFast && failed.length > 0
      ? []
      : resolvedTargets.filter((item) => !failureNodeIdSet.has(item.nodeId));
  const resultTargets = previewOnly
    ? resolvedTargets.filter((item) => !failureNodeIdSet.has(item.nodeId))
    : applyTargets;

  const movedMappings: Array<{ fromPath: string; toPath: string }> = [];
  for (const target of applyTargets) {
    if (!previewOnly) {
      try {
        await dependencies.movePathWithFallback(
          target.sourcePath,
          target.targetPath,
          target.sourceStat.isDirectory(),
        );
        movedMappings.push({
          fromPath: target.sourcePath,
          toPath: target.targetPath,
        });
      } catch (error) {
        const reason =
          error instanceof Error && error.message
            ? error.message
            : String(error);
        failed.push({ node_id: target.nodeId, reason });
        if (failFast) {
          break;
        }
      }
    }
  }

  for (const target of resultTargets) {
    results.push({
      node_id: target.nodeId,
      source_name: target.sourceName,
      target_name: target.targetName,
      source_path: target.sourcePath,
      target_path: target.targetPath,
      applied: !previewOnly,
      reason: null,
    });
  }

  for (const item of failed) {
    const target = resolvedTargets.find(
      (candidate) => candidate.nodeId === item.node_id,
    );
    if (!target || results.some((entry) => entry.node_id === item.node_id)) {
      continue;
    }
    results.push({
      node_id: item.node_id,
      source_name: target.sourceName,
      target_name: target.targetName,
      source_path: target.sourcePath,
      target_path: target.targetPath,
      applied: false,
      reason: item.reason,
    });
  }

  if (!previewOnly && movedMappings.length > 0) {
    dependencies.database.moveSnapshotEntriesByPaths(movedMappings);
    dependencies.syncSnapshotFromDatabase();
    dependencies.pruneArchiveIndexesByDeletedRoots(
      movedMappings.map((item) => item.fromPath),
    );
    await dependencies
      .refreshArchiveIndexesForPaths(movedMappings.map((item) => item.toPath))
      .catch(() => undefined);
    await dependencies
      .replaceImportSourcePaths(movedMappings)
      .catch(() => undefined);
    // 缩略图缓存键含源文件 path+mtime+size，重命名后旧键自然失效，无需全清缓存目录
    dependencies.emitLibraryChanged({
      reason: "manage-rename-sidebar-nodes",
      updated_at_ms: Date.now(),
    });
  }

  return {
    renamed_count: movedMappings.length,
    failed,
    preview_only: previewOnly,
    results,
    updated_at_ms: now,
  };
}

export async function renameSidebarNodeOperation(
  dependencies: ManagementRenameServiceDependencies,
  request: RenameSidebarNodeRequestDto,
): Promise<RenameSidebarNodeResponseDto> {
  const normalizedNodeId = request.node_id.trim();
  const normalizedNewName = request.new_name.trim();
  if (!normalizedNodeId) {
    throw new Error("重命名失败：未提供节点 id");
  }

  if (!normalizedNewName) {
    throw new Error("重命名失败：未提供新名称");
  }

  const failed: Array<{ node_id: string; reason: string }> = [];
  const parsed = parseSidebarNodeId(normalizedNodeId);
  if (!parsed) {
    failed.push({ node_id: normalizedNodeId, reason: "invalid node id" });
    return {
      renamed_count: 0,
      failed,
      target_path: null,
      updated_at_ms: Date.now(),
    };
  }

  if (!isValidGroupName(normalizedNewName)) {
    failed.push({ node_id: normalizedNodeId, reason: "invalid target name" });
    return {
      renamed_count: 0,
      failed,
      target_path: null,
      updated_at_ms: Date.now(),
    };
  }

  await dependencies.ensureStateLoaded();
  const snapshot = await dependencies.ensureSnapshotLoaded();
  const mediaAccessContext = dependencies.buildMediaAccessContext();

  const sourcePath = resolveSidebarNodeSourcePath(parsed, snapshot);

  if (!sourcePath) {
    failed.push({ node_id: normalizedNodeId, reason: "node not found" });
    return {
      renamed_count: 0,
      failed,
      target_path: null,
      updated_at_ms: Date.now(),
    };
  }

  const resolvedSourcePath = path.resolve(sourcePath);
  if (isFileSystemRootPath(resolvedSourcePath)) {
    failed.push({
      node_id: normalizedNodeId,
      reason: "refuse to rename filesystem root",
    });
    return {
      renamed_count: 0,
      failed,
      target_path: null,
      updated_at_ms: Date.now(),
    };
  }

  if (!isPathAllowlisted(resolvedSourcePath, mediaAccessContext)) {
    failed.push({
      node_id: normalizedNodeId,
      reason: "path outside allowlist",
    });
    return {
      renamed_count: 0,
      failed,
      target_path: null,
      updated_at_ms: Date.now(),
    };
  }

  const sourceStat = await fs.stat(resolvedSourcePath).catch(() => null);
  if (!sourceStat) {
    failed.push({ node_id: normalizedNodeId, reason: "path not found" });
    return {
      renamed_count: 0,
      failed,
      target_path: null,
      updated_at_ms: Date.now(),
    };
  }

  let normalizedTargetName = normalizedNewName;
  if (sourceStat.isFile()) {
    const sourceExtension = path.extname(resolvedSourcePath);
    if (
      sourceExtension &&
      !normalizedTargetName
        .toLowerCase()
        .endsWith(sourceExtension.toLowerCase())
    ) {
      normalizedTargetName = `${normalizedTargetName}${sourceExtension}`;
    }
  }

  const targetPath = path.resolve(
    path.join(path.dirname(resolvedSourcePath), normalizedTargetName),
  );
  if (
    normalizeAllowlistKey(targetPath) ===
    normalizeAllowlistKey(resolvedSourcePath)
  ) {
    failed.push({ node_id: normalizedNodeId, reason: "source equals target" });
    return {
      renamed_count: 0,
      failed,
      target_path: null,
      updated_at_ms: Date.now(),
    };
  }

  const targetExists = await fs.stat(targetPath).catch(() => null);
  if (targetExists) {
    failed.push({
      node_id: normalizedNodeId,
      reason: "destination already exists",
    });
    return {
      renamed_count: 0,
      failed,
      target_path: null,
      updated_at_ms: Date.now(),
    };
  }

  try {
    await dependencies.movePathWithFallback(
      resolvedSourcePath,
      targetPath,
      sourceStat.isDirectory(),
    );
  } catch (error) {
    const reason =
      error instanceof Error && error.message ? error.message : String(error);
    failed.push({ node_id: normalizedNodeId, reason });
    return {
      renamed_count: 0,
      failed,
      target_path: null,
      updated_at_ms: Date.now(),
    };
  }

  const movedMappings = [{ fromPath: resolvedSourcePath, toPath: targetPath }];
  dependencies.database.moveSnapshotEntriesByPaths(movedMappings);
  dependencies.syncSnapshotFromDatabase();
  dependencies.pruneArchiveIndexesByDeletedRoots([resolvedSourcePath]);
  await dependencies
    .refreshArchiveIndexesForPaths([targetPath])
    .catch(() => undefined);
  await dependencies
    .replaceImportSourcePaths(movedMappings)
    .catch(() => undefined);

  dependencies.emitLibraryChanged({
    reason: "manage-rename-sidebar-node",
    updated_at_ms: Date.now(),
  });

  return {
    renamed_count: 1,
    failed,
    target_path: targetPath,
    updated_at_ms: Date.now(),
  };
}
