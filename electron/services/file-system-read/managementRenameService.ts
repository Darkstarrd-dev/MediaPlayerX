import { promises as fs } from "node:fs";
import path from "node:path";

import {
  type ImagePackageDto,
  type LibrarySnapshotDto,
  type RenameItemTargetDto,
  type RenameItemsRequestDto,
  type RenameItemsResponseDto,
  type RenameSidebarNodeRequestDto,
  type RenameSidebarNodeResponseDto,
  type RenameSidebarNodesRequestDto,
  type RenameSidebarNodesResponseDto,
} from "../../../src/contracts/backend";
import {
  isPathAllowlisted,
  type MediaAccessGuardContext,
} from "../../fileSystemMediaAccessGuard";
import { normalizeAllowlistKey } from "../../fileSystemServiceHelpers";
import { MediaLibraryDatabase } from "../../mediaLibraryDatabase";
import {
  buildMetadataSynthesisName,
  isFileSystemRootPath,
  isValidGroupName,
  type ParsedSidebarNodeRef,
  parseSidebarNodeId,
  renderMetadataTemplate,
  resolveSidebarNodeSourcePath,
} from "./managementMutationService.helpers";

interface ManagementRenameServiceDependencies {
  database: MediaLibraryDatabase;
  thumbnailCacheRootDir: string;
  ensureStateLoaded: () => Promise<void>;
  ensureSnapshotLoaded: () => Promise<LibrarySnapshotDto>;
  syncSnapshotFromDatabase: () => LibrarySnapshotDto;
  refreshArchiveIndexesForPaths: (
    archivePaths: Iterable<string>,
  ) => Promise<void>;
  pruneArchiveIndexesByDeletedRoots: (deletedPaths: Iterable<string>) => void;
  replaceImportSourcePaths: (
    mappings: Array<{ fromPath: string; toPath: string }>,
  ) => Promise<void>;
  buildMediaAccessContext: () => MediaAccessGuardContext;
  emitLibraryChanged: (payload: {
    reason: string;
    updated_at_ms: number;
  }) => void;
  movePathWithFallback: (
    sourcePath: string,
    targetPath: string,
    directory: boolean,
  ) => Promise<void>;
  repackArchiveWithRenamedEntries: (
    archivePath: string,
    mappings: Array<{ fromEntryName: string; toEntryName: string }>,
  ) => Promise<void>;
}

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
  if (normalizedStart > 0 && normalizedEnd > 0 && normalizedEnd >= normalizedStart) {
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

export class ManagementRenameService {
  constructor(
    private readonly dependencies: ManagementRenameServiceDependencies,
  ) {}

  async renameItems(
    request: RenameItemsRequestDto,
  ): Promise<RenameItemsResponseDto> {
    const normalizedTargets = request.targets;
    const previewOnly = request.preview_only ?? false;
    const failFast = request.fail_fast ?? true;
    await this.dependencies.ensureStateLoaded();
    const snapshot = await this.dependencies.ensureSnapshotLoaded();
    const mediaAccessContext = this.dependencies.buildMediaAccessContext();

    const sourceById = new Map<string, ImagePackageDto>([
      ...snapshot.image_packages.map((source) => [source.id, source] as const),
      ...snapshot.image_directories.map(
        (source) => [source.id, source] as const,
      ),
    ]);
    const imageById = new Map<
      string,
      { image: ImagePackageDto["images"][number]; source: ImagePackageDto }
    >();
    for (const source of sourceById.values()) {
      for (const image of source.images) {
        imageById.set(image.id, { image, source });
      }
    }

    type PlannedOperation = {
      target: RenameItemTargetDto;
      sourceName: string;
      targetName: string;
      sourcePath: string;
      targetPath: string;
      filesystemFromPath?: string;
      filesystemToPath?: string;
      archivePath?: string;
      archiveFromEntryName?: string;
      archiveToEntryName?: string;
    };

    const failed: RenameItemsResponseDto["failed"] = [];
    const plannedOperations: PlannedOperation[] = [];

    const toTargetKey = (target: RenameItemTargetDto): string => {
      if (target.kind === "sidebar-node") {
        return `sidebar-node:${target.node_id}`;
      }
      if (target.kind === "image-item") {
        return `image-item:${target.image_id}`;
      }
      return `archive-entry:${path.resolve(target.archive_path)}#${target.entry_name}`;
    };

    const buildFields = (
      source: ImagePackageDto | null,
      video: LibrarySnapshotDto["videos"][number] | null,
      audio: LibrarySnapshotDto["audios"][number] | null,
      fallbackTitle: string,
    ) => {
      if (video) {
        return {
          authorJp: video.author_jpn.trim(),
          authorEn: video.author.trim(),
          circleJp: video.circle_jpn.trim(),
          circleEn: video.circle.trim(),
          titleJp: video.work_title_jpn.trim(),
          titleEn: video.work_title.trim() || fallbackTitle,
        };
      }
      if (audio) {
        return {
          authorJp: "",
          authorEn: audio.author.trim(),
          circleJp: "",
          circleEn: audio.album.trim(),
          titleJp: "",
          titleEn: audio.track_title.trim() || fallbackTitle,
        };
      }

      const metadata = source?.external_metadata;
      return {
        authorJp: (metadata?.artist_jpn ?? "").trim(),
        authorEn:
          (metadata?.artist ?? "").trim() || (source?.author ?? "").trim(),
        circleJp: (metadata?.group_name_jpn ?? "").trim(),
        circleEn:
          (metadata?.group_name ?? "").trim() || (source?.circle ?? "").trim(),
        titleJp: (metadata?.title_jpn ?? "").trim(),
        titleEn:
          (metadata?.title ?? "").trim() ||
          (source?.work_title ?? "").trim() ||
          fallbackTitle,
      };
    };

    for (const [index, target] of normalizedTargets.entries()) {
      let sourcePath = "";
      let sourceName = "";
      let sourceExtension = "";
      let sourceIsFile = true;
      let metadataFields = buildFields(null, null, null, "");
      let archivePath = "";
      let archiveEntryName = "";

      if (target.kind === "sidebar-node") {
        const parsed = parseSidebarNodeId(target.node_id);
        if (!parsed) {
          failed.push({ target, reason: "invalid node id" });
          if (failFast) {
            break;
          }
          continue;
        }
        const resolvedSourcePath = resolveSidebarNodeSourcePath(
          parsed,
          snapshot,
        );
        if (!resolvedSourcePath) {
          failed.push({ target, reason: "node not found" });
          if (failFast) {
            break;
          }
          continue;
        }
        sourcePath = path.resolve(resolvedSourcePath);
        const sourceStat = await fs.stat(sourcePath).catch(() => null);
        if (!sourceStat) {
          failed.push({ target, reason: "path not found" });
          if (failFast) {
            break;
          }
          continue;
        }
        sourceIsFile = sourceStat.isFile();
        sourceExtension = sourceIsFile ? path.extname(sourcePath) : "";
        sourceName = sourceIsFile
          ? path.basename(sourcePath, sourceExtension)
          : path.basename(sourcePath);
        if (parsed.kind === "video") {
          const video =
            snapshot.videos.find(
              (item) => item.tree_path.join("/") === parsed.pathKey,
            ) ?? null;
          metadataFields = buildFields(null, video, null, sourceName);
        } else if (parsed.kind === "audio") {
          const audio =
            (snapshot.audios ?? []).find(
              (item) => item.tree_path.join("/") === parsed.pathKey,
            ) ?? null;
          metadataFields = buildFields(null, null, audio, sourceName);
        } else if (parsed.kind === "package") {
          const source =
            [...snapshot.image_packages, ...snapshot.image_directories].find(
              (item) => item.tree_path.join("/") === parsed.pathKey,
            ) ?? null;
          metadataFields = buildFields(source, null, null, sourceName);
        }
      } else if (target.kind === "image-item") {
        const found = imageById.get(target.image_id);
        if (!found) {
          failed.push({ target, reason: "image not found" });
          if (failFast) {
            break;
          }
          continue;
        }
        metadataFields = buildFields(found.source, null, null, "");
        if (found.image.media_locator.kind === "filesystem") {
          sourcePath = path.resolve(found.image.media_locator.absolute_path);
          sourceExtension = path.extname(sourcePath);
          sourceName = path.basename(sourcePath, sourceExtension);
        } else {
          archivePath = path.resolve(found.image.media_locator.archive_path);
          archiveEntryName = found.image.media_locator.entry_name;
          sourceExtension = path.extname(archiveEntryName);
          sourceName = path.basename(archiveEntryName, sourceExtension);
          sourcePath = `${archivePath}#${archiveEntryName}`;
        }
      } else {
        archivePath = path.resolve(target.archive_path);
        archiveEntryName = target.entry_name;
        sourceExtension = path.extname(archiveEntryName);
        sourceName = path.basename(archiveEntryName, sourceExtension);
        sourcePath = `${archivePath}#${archiveEntryName}`;
      }

      const accessiblePath = archivePath || sourcePath.split("#")[0];
      if (!isPathAllowlisted(accessiblePath, mediaAccessContext)) {
        failed.push({ target, reason: "path outside allowlist" });
        if (failFast) {
          break;
        }
        continue;
      }

      let nextBaseName = sourceName;
      if (request.mode === "single") {
        nextBaseName = request.single_new_name?.trim() ?? "";
      } else if (request.mode === "replace") {
        const replaceFrom = request.replace_from ?? "";
        if (!replaceFrom) {
          failed.push({ target, reason: "replace_from empty" });
          if (failFast) {
            break;
          }
          continue;
        }
        nextBaseName = sourceName.replaceAll(
          replaceFrom,
          request.replace_to ?? "",
        );
      } else if (request.mode === "numbering") {
        const start = request.numbering_start ?? 1;
        const step = request.numbering_step ?? 1;
        const padWidth = request.numbering_pad_width ?? 3;
        const value = start + index * step;
        nextBaseName = `${request.numbering_base_name ?? ""}${String(value).padStart(padWidth, "0")}`;
      } else if (request.mode === "remove-range") {
        nextBaseName = applyRemoveRangeUnion(
          sourceName,
          request.remove_start,
          request.remove_end,
          request.remove_head,
          request.remove_tail,
        );
      } else {
        nextBaseName = renderMetadataTemplate(
          request.metadata_template ?? "",
          metadataFields,
        );
      }

      const normalizedBaseName = nextBaseName.trim();
      if (!isValidGroupName(normalizedBaseName)) {
        failed.push({ target, reason: "invalid target name" });
        if (failFast) {
          break;
        }
        continue;
      }

      const targetName = sourceExtension
        ? normalizedBaseName
            .toLowerCase()
            .endsWith(sourceExtension.toLowerCase())
          ? normalizedBaseName
          : `${normalizedBaseName}${sourceExtension}`
        : normalizedBaseName;

      if (archivePath) {
        const baseDir = path.posix.dirname(
          archiveEntryName.replace(/\\/g, "/"),
        );
        const targetEntryName =
          baseDir === "." ? targetName : `${baseDir}/${targetName}`;
        plannedOperations.push({
          target,
          sourceName,
          targetName,
          sourcePath,
          targetPath: `${archivePath}#${targetEntryName}`,
          archivePath,
          archiveFromEntryName: archiveEntryName,
          archiveToEntryName: targetEntryName,
        });
      } else {
        const toPath = path.resolve(
          path.join(path.dirname(sourcePath), targetName),
        );
        plannedOperations.push({
          target,
          sourceName,
          targetName,
          sourcePath,
          targetPath: toPath,
          filesystemFromPath: sourcePath,
          filesystemToPath: toPath,
        });
      }
    }

    if (failed.length === 0) {
      const plannedFileTargetByKey = new Set<string>();
      const sourcePathKeySet = new Set<string>();
      for (const operation of plannedOperations) {
        if (!operation.filesystemFromPath || !operation.filesystemToPath) {
          continue;
        }
        sourcePathKeySet.add(
          normalizeAllowlistKey(operation.filesystemFromPath),
        );
      }

      for (const operation of plannedOperations) {
        if (operation.filesystemToPath) {
          const targetKey = normalizeAllowlistKey(operation.filesystemToPath);
          if (plannedFileTargetByKey.has(targetKey)) {
            failed.push({
              target: operation.target,
              reason: "duplicate destination in batch",
            });
            break;
          }
          plannedFileTargetByKey.add(targetKey);
          const exists = await fs
            .stat(operation.filesystemToPath)
            .catch(() => null);
          if (exists && !sourcePathKeySet.has(targetKey)) {
            failed.push({
              target: operation.target,
              reason: "destination already exists",
            });
            break;
          }
        }
      }
    }

    const failedTargetKeySet = new Set(
      failed.map((item) => toTargetKey(item.target)),
    );
    const operationByTargetKey = new Map<string, PlannedOperation>();
    for (const operation of plannedOperations) {
      operationByTargetKey.set(toTargetKey(operation.target), operation);
    }

    const operationsToApply =
      failFast && failed.length > 0
        ? []
        : plannedOperations.filter(
            (operation) =>
              !failedTargetKeySet.has(toTargetKey(operation.target)),
          );

    const operationsForResult = previewOnly
      ? plannedOperations.filter(
          (operation) => !failedTargetKeySet.has(toTargetKey(operation.target)),
        )
      : operationsToApply;

    const results: RenameItemsResponseDto["results"] = operationsForResult.map(
      (operation) => ({
        target: operation.target,
        source_name: operation.sourceName,
        target_name: operation.targetName,
        source_path: operation.sourcePath,
        target_path: operation.targetPath,
        applied: !previewOnly,
        reason: null,
      }),
    );

    for (const failedItem of failed) {
      const operation = operationByTargetKey.get(
        toTargetKey(failedItem.target),
      );
      if (!operation) {
        continue;
      }
      results.push({
        target: operation.target,
        source_name: operation.sourceName,
        target_name: operation.targetName,
        source_path: operation.sourcePath,
        target_path: operation.targetPath,
        applied: false,
        reason: failedItem.reason,
      });
    }

    let renamedCount = 0;
    const movedMappings: Array<{ fromPath: string; toPath: string }> = [];
    const archiveEntryMappings: Array<{
      archivePath: string;
      fromEntryName: string;
      toEntryName: string;
    }> = [];

    if (!previewOnly) {
      for (const operation of operationsToApply) {
        if (operation.filesystemFromPath && operation.filesystemToPath) {
          try {
            await this.dependencies.movePathWithFallback(
              operation.filesystemFromPath,
              operation.filesystemToPath,
              false,
            );
            movedMappings.push({
              fromPath: operation.filesystemFromPath,
              toPath: operation.filesystemToPath,
            });
            renamedCount += 1;
          } catch (error) {
            const reason =
              error instanceof Error && error.message
                ? error.message
                : String(error);
            failed.push({ target: operation.target, reason });
            if (failFast) {
              break;
            }
          }
        }
      }

      const archiveMappingsByArchivePath = new Map<
        string,
        Array<{
          fromEntryName: string;
          toEntryName: string;
          target: RenameItemTargetDto;
        }>
      >();
      for (const operation of operationsToApply) {
        if (
          !operation.archivePath ||
          !operation.archiveFromEntryName ||
          !operation.archiveToEntryName
        ) {
          continue;
        }
        const list =
          archiveMappingsByArchivePath.get(operation.archivePath) ?? [];
        list.push({
          fromEntryName: operation.archiveFromEntryName,
          toEntryName: operation.archiveToEntryName,
          target: operation.target,
        });
        archiveMappingsByArchivePath.set(operation.archivePath, list);
      }

      for (const [archivePath, mappingList] of archiveMappingsByArchivePath) {
        try {
          await this.dependencies.repackArchiveWithRenamedEntries(
            archivePath,
            mappingList.map((item) => ({
              fromEntryName: item.fromEntryName,
              toEntryName: item.toEntryName,
            })),
          );
          for (const item of mappingList) {
            archiveEntryMappings.push({
              archivePath,
              fromEntryName: item.fromEntryName,
              toEntryName: item.toEntryName,
            });
            renamedCount += 1;
          }
        } catch (error) {
          const reason =
            error instanceof Error && error.message
              ? error.message
              : String(error);
          for (const item of mappingList) {
            failed.push({ target: item.target, reason });
          }
          if (failFast) {
            break;
          }
        }
      }

      if (movedMappings.length > 0) {
        this.dependencies.database.moveSnapshotEntriesByPaths(movedMappings);
      }
      if (archiveEntryMappings.length > 0) {
        this.dependencies.database.renameImageArchiveEntries(
          archiveEntryMappings,
        );
        await this.dependencies.refreshArchiveIndexesForPaths(
          new Set(archiveEntryMappings.map((item) => item.archivePath)),
        );
      }

      if (movedMappings.length > 0 || archiveEntryMappings.length > 0) {
        this.dependencies.syncSnapshotFromDatabase();
        this.dependencies.pruneArchiveIndexesByDeletedRoots(
          movedMappings.map((item) => item.fromPath),
        );
        await this.dependencies
          .refreshArchiveIndexesForPaths(
            movedMappings.map((item) => item.toPath),
          )
          .catch(() => undefined);
        await this.dependencies
          .replaceImportSourcePaths(movedMappings)
          .catch(() => undefined);
        await fs
          .rm(this.dependencies.thumbnailCacheRootDir, {
            recursive: true,
            force: true,
          })
          .catch(() => undefined);
        this.dependencies.emitLibraryChanged({
          reason: "manage-rename-items",
          updated_at_ms: Date.now(),
        });
      }
    }

    return {
      renamed_count: previewOnly ? 0 : renamedCount,
      failed,
      preview_only: previewOnly,
      results,
      updated_at_ms: Date.now(),
    };
  }

  async renameSidebarNodes(
    request: RenameSidebarNodesRequestDto,
  ): Promise<RenameSidebarNodesResponseDto> {
    const now = Date.now();
    const previewOnly = request.preview_only ?? false;
    const failFast = request.fail_fast ?? true;
    const normalizedNodeIds = Array.from(
      new Set(request.node_ids.map((value) => value.trim()).filter(Boolean)),
    );
    if (normalizedNodeIds.length === 0) {
      throw new Error("批量重命名失败：未提供节点 id");
    }

    await this.dependencies.ensureStateLoaded();
    const snapshot = await this.dependencies.ensureSnapshotLoaded();
    const mediaAccessContext = this.dependencies.buildMediaAccessContext();
    const failed: Array<{ node_id: string; reason: string }> = [];
    const results: RenameSidebarNodesResponseDto["results"] = [];

    const resolvedTargets: Array<{
      nodeId: string;
      parsed: ParsedSidebarNodeRef;
      sourcePath: string;
      sourceName: string;
      sourceStat: Awaited<ReturnType<typeof fs.stat>>;
      targetName: string;
      targetPath: string;
    }> = [];

    if (
      request.mode === "replace" &&
      (request.replace_from ?? "").length === 0
    ) {
      throw new Error("批量重命名失败：replace_from 不能为空");
    }

    for (const [index, nodeId] of normalizedNodeIds.entries()) {
      const parsed = parseSidebarNodeId(nodeId);
      if (!parsed) {
        failed.push({ node_id: nodeId, reason: "invalid node id" });
        if (failFast) {
          break;
        }
        continue;
      }

      const sourcePath = resolveSidebarNodeSourcePath(parsed, snapshot);
      if (!sourcePath) {
        failed.push({ node_id: nodeId, reason: "node not found" });
        if (failFast) {
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
        if (failFast) {
          break;
        }
        continue;
      }

      if (!isPathAllowlisted(resolvedSourcePath, mediaAccessContext)) {
        failed.push({ node_id: nodeId, reason: "path outside allowlist" });
        if (failFast) {
          break;
        }
        continue;
      }

      const sourceStat = await fs.stat(resolvedSourcePath).catch(() => null);
      if (!sourceStat) {
        failed.push({ node_id: nodeId, reason: "path not found" });
        if (failFast) {
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
        nextBaseName = sourceBaseName.replaceAll(
          request.replace_from ?? "",
          request.replace_to ?? "",
        );
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
        if (failFast) {
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
        if (failFast) {
          break;
        }
        continue;
      }

      resolvedTargets.push({
        nodeId,
        parsed,
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
      const plannedTargetByKey = new Map<string, string>();
      for (const target of resolvedTargets) {
        const targetKey = normalizeAllowlistKey(target.targetPath);
        if (plannedTargetByKey.has(targetKey)) {
          failed.push({
            node_id: target.nodeId,
            reason: "duplicate destination in batch",
          });
          if (failFast) {
            break;
          }
          continue;
        }
        plannedTargetByKey.set(targetKey, target.nodeId);

        const exists = await fs.stat(target.targetPath).catch(() => null);
        if (exists && !sourceKeySet.has(targetKey)) {
          failed.push({
            node_id: target.nodeId,
            reason: "destination already exists",
          });
          if (failFast) {
            break;
          }
        }
      }
    }

    const failureNodeIdSet = new Set(failed.map((item) => item.node_id));
    const applyTargets =
      failFast && failed.length > 0
        ? []
        : resolvedTargets.filter((item) => !failureNodeIdSet.has(item.nodeId));
    const resultTargets = previewOnly
      ? resolvedTargets.filter((item) => !failureNodeIdSet.has(item.nodeId))
      : applyTargets;

    const movedMappings: Array<{ fromPath: string; toPath: string }> = [];
    for (const target of applyTargets) {
      if (!previewOnly) {
        try {
          await this.dependencies.movePathWithFallback(
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
          continue;
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
      if (!target) {
        continue;
      }
      if (results.some((entry) => entry.node_id === item.node_id)) {
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
      this.dependencies.database.moveSnapshotEntriesByPaths(movedMappings);
      this.dependencies.syncSnapshotFromDatabase();
      this.dependencies.pruneArchiveIndexesByDeletedRoots(
        movedMappings.map((item) => item.fromPath),
      );
      await this.dependencies
        .refreshArchiveIndexesForPaths(movedMappings.map((item) => item.toPath))
        .catch(() => undefined);
      await this.dependencies
        .replaceImportSourcePaths(movedMappings)
        .catch(() => undefined);
      await fs
        .rm(this.dependencies.thumbnailCacheRootDir, {
          recursive: true,
          force: true,
        })
        .catch(() => undefined);
      this.dependencies.emitLibraryChanged({
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

  async renameSidebarNode(
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
      failed.push({
        node_id: normalizedNodeId,
        reason: "invalid node id",
      });
      return {
        renamed_count: 0,
        failed,
        target_path: null,
        updated_at_ms: Date.now(),
      };
    }

    if (!isValidGroupName(normalizedNewName)) {
      failed.push({
        node_id: normalizedNodeId,
        reason: "invalid target name",
      });
      return {
        renamed_count: 0,
        failed,
        target_path: null,
        updated_at_ms: Date.now(),
      };
    }

    await this.dependencies.ensureStateLoaded();
    const snapshot = await this.dependencies.ensureSnapshotLoaded();
    const mediaAccessContext = this.dependencies.buildMediaAccessContext();

    const sourcePath = resolveSidebarNodeSourcePath(parsed, snapshot);

    if (!sourcePath) {
      failed.push({
        node_id: normalizedNodeId,
        reason: "node not found",
      });
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
      failed.push({
        node_id: normalizedNodeId,
        reason: "path not found",
      });
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
      if (sourceExtension) {
        const normalizedSourceExtension = sourceExtension.toLowerCase();
        if (
          !normalizedTargetName
            .toLowerCase()
            .endsWith(normalizedSourceExtension)
        ) {
          normalizedTargetName = `${normalizedTargetName}${sourceExtension}`;
        }
      }
    }

    const targetPath = path.resolve(
      path.join(path.dirname(resolvedSourcePath), normalizedTargetName),
    );
    if (
      normalizeAllowlistKey(targetPath) ===
      normalizeAllowlistKey(resolvedSourcePath)
    ) {
      failed.push({
        node_id: normalizedNodeId,
        reason: "source equals target",
      });
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
      await this.dependencies.movePathWithFallback(
        resolvedSourcePath,
        targetPath,
        sourceStat.isDirectory(),
      );
    } catch (error) {
      const reason =
        error instanceof Error && error.message ? error.message : String(error);
      failed.push({
        node_id: normalizedNodeId,
        reason,
      });
      return {
        renamed_count: 0,
        failed,
        target_path: null,
        updated_at_ms: Date.now(),
      };
    }

    const movedMappings = [
      { fromPath: resolvedSourcePath, toPath: targetPath },
    ];
    this.dependencies.database.moveSnapshotEntriesByPaths(movedMappings);
    this.dependencies.syncSnapshotFromDatabase();
    this.dependencies.pruneArchiveIndexesByDeletedRoots([resolvedSourcePath]);
    await this.dependencies
      .refreshArchiveIndexesForPaths([targetPath])
      .catch(() => undefined);
    await this.dependencies
      .replaceImportSourcePaths(movedMappings)
      .catch(() => undefined);
    await fs
      .rm(this.dependencies.thumbnailCacheRootDir, {
        recursive: true,
        force: true,
      })
      .catch(() => undefined);

    this.dependencies.emitLibraryChanged({
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
}
