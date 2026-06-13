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
import { isPathAllowlisted } from "../../fileSystemMediaAccessGuard";
import { normalizeAllowlistKey } from "../../fileSystemServiceHelpers";
import {
  isMetadataUnknownToken,
  isValidGroupName,
  parseSidebarNodeId,
  renderMetadataTemplate,
  resolveSidebarNodeSourcePath,
} from "./managementMutationService.helpers";
import {
  renameSidebarNodeOperation,
  renameSidebarNodesOperation,
} from "./managementRenameSidebarOps";
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
    const effectiveFailFast = previewOnly ? false : failFast;
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
      audio: NonNullable<LibrarySnapshotDto["audios"]>[number] | null,
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

    const sourceNameByTargetKey = new Map<string, string>();
    const unchangedItems: Array<{
      target: RenameItemTargetDto;
      sourceName: string;
      sourcePath: string;
      sourceExtension: string;
      reason: "unchanged" | "replace-target-not-found";
    }> = [];

    for (const [index, target] of normalizedTargets.entries()) {
      let sourcePath = "";
      let sourceName = "";
      let sourceExtension = "";
      let sourceIsFile = true;
      let replaceMatched = false;
      let metadataFields = buildFields(null, null, null, "");
      let archivePath = "";
      let archiveEntryName = "";

      if (target.kind === "sidebar-node") {
        const parsed = parseSidebarNodeId(target.node_id);
        if (!parsed) {
          failed.push({ target, reason: "invalid node id" });
          if (effectiveFailFast) {
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
          if (effectiveFailFast) {
            break;
          }
          continue;
        }
        sourcePath = path.resolve(resolvedSourcePath);
        const sourceStat = await fs.stat(sourcePath).catch(() => null);
        if (!sourceStat) {
          failed.push({ target, reason: "path not found" });
          if (effectiveFailFast) {
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
          if (effectiveFailFast) {
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
      sourceNameByTargetKey.set(toTargetKey(target), sourceName);
      if (!isPathAllowlisted(accessiblePath, mediaAccessContext)) {
        failed.push({ target, reason: "path outside allowlist" });
        if (effectiveFailFast) {
          break;
        }
        continue;
      }

      let nextBaseName = sourceName;
      if (request.mode === "single") {
        nextBaseName = request.single_new_name?.trim() ?? "";
      } else if (request.mode === "replace") {
        const replaceFrom = request.replace_from ?? "";
        if (replaceFrom) {
          replaceMatched = sourceName.includes(replaceFrom);
          nextBaseName = sourceName
            .split(replaceFrom)
            .join(request.replace_to ?? "");
        }
        // replaceFrom 为空时 nextBaseName 保持 sourceName 不变
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
        // metadata 模式：无任何可用的作者、社团名称时保持原名
        // 通过共享 token 集合判断数据库占位符，应对多语言扩展
        const isRealValue = (v: string): boolean =>
          v !== "" && !isMetadataUnknownToken(v);
        const hasAuthorOrCircle =
          isRealValue(metadataFields.authorJp) ||
          isRealValue(metadataFields.authorEn) ||
          isRealValue(metadataFields.circleJp) ||
          isRealValue(metadataFields.circleEn);
        if (hasAuthorOrCircle) {
          nextBaseName = renderMetadataTemplate(
            request.metadata_template ?? "",
            metadataFields,
          );
        }
      }

      const normalizedBaseName = nextBaseName.trim();
      if (normalizedBaseName === sourceName) {
        // 名称未变化，记录为维持原名
        unchangedItems.push({
          target,
          sourceName,
          sourcePath,
          sourceExtension,
          reason:
            request.mode === "replace" &&
            (request.replace_from ?? "").length > 0 &&
            !replaceMatched
              ? "replace-target-not-found"
              : "unchanged",
        });
        continue;
      }
      if (!isValidGroupName(normalizedBaseName)) {
        failed.push({ target, reason: "invalid target name" });
        if (effectiveFailFast) {
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

    {
      const sourcePathKeySet = new Set<string>();
      for (const operation of plannedOperations) {
        if (!operation.filesystemFromPath || !operation.filesystemToPath) {
          continue;
        }
        sourcePathKeySet.add(
          normalizeAllowlistKey(operation.filesystemFromPath),
        );
      }

      if (previewOnly) {
        const plannedFileTargetByDir = new Map<string, Set<string>>();
        for (const operation of plannedOperations) {
          if (!operation.filesystemToPath || !operation.filesystemFromPath) {
            continue;
          }
          const targetDir = path.dirname(operation.filesystemToPath);
          const fileName = path.basename(operation.filesystemToPath);
          const usedFileNames =
            plannedFileTargetByDir.get(targetDir) ?? new Set<string>();

          let resolvedFileName = fileName;
          let suffixIndex = 2;
          let collided = false;
          while (true) {
            const candidatePath = path.resolve(
              path.join(targetDir, resolvedFileName),
            );
            const candidateKey = normalizeAllowlistKey(candidatePath);
            const candidateUsed = usedFileNames.has(
              resolvedFileName.toLowerCase(),
            );
            const exists = await fs.stat(candidatePath).catch(() => null);
            const existsConflict =
              Boolean(exists) && !sourcePathKeySet.has(candidateKey);
            if (!candidateUsed && !existsConflict) {
              operation.filesystemToPath = candidatePath;
              operation.targetPath = candidatePath;
              operation.targetName = resolvedFileName;
              usedFileNames.add(resolvedFileName.toLowerCase());
              plannedFileTargetByDir.set(targetDir, usedFileNames);
              break;
            }
            collided = true;
            resolvedFileName = withNumericSuffix(fileName, suffixIndex);
            suffixIndex += 1;
          }

          if (collided) {
            failed.push({
              target: operation.target,
              reason: "duplicate destination",
            });
          }
        }

        const plannedArchiveTargetByGroup = new Map<string, Set<string>>();
        for (const operation of plannedOperations) {
          if (!operation.archivePath || !operation.archiveToEntryName) {
            continue;
          }
          const normalizedEntry = operation.archiveToEntryName.replace(
            /\\/g,
            "/",
          );
          const entryDir = path.posix.dirname(normalizedEntry);
          const entryName = path.posix.basename(normalizedEntry);
          const groupKey = `${normalizeAllowlistKey(operation.archivePath)}#${entryDir}`;
          const usedNames =
            plannedArchiveTargetByGroup.get(groupKey) ?? new Set<string>();
          let resolvedEntryName = entryName;
          let suffixIndex = 2;
          let collided = false;
          while (usedNames.has(resolvedEntryName.toLowerCase())) {
            collided = true;
            resolvedEntryName = withNumericSuffix(entryName, suffixIndex);
            suffixIndex += 1;
          }
          usedNames.add(resolvedEntryName.toLowerCase());
          plannedArchiveTargetByGroup.set(groupKey, usedNames);

          const nextEntryName =
            entryDir === "."
              ? resolvedEntryName
              : `${entryDir}/${resolvedEntryName}`;
          operation.archiveToEntryName = nextEntryName;
          operation.targetName = resolvedEntryName;
          operation.targetPath = `${operation.archivePath}#${nextEntryName}`;

          if (collided) {
            failed.push({
              target: operation.target,
              reason: "duplicate destination",
            });
          }
        }
      } else {
        const plannedFileTargetByDir = new Map<string, Set<string>>();
        for (const operation of plannedOperations) {
          if (!operation.filesystemToPath || !operation.filesystemFromPath) {
            continue;
          }
          const targetDir = path.dirname(operation.filesystemToPath);
          const fileName = path.basename(operation.filesystemToPath);
          const usedFileNames =
            plannedFileTargetByDir.get(targetDir) ?? new Set<string>();

          let resolvedFileName = fileName;
          let suffixIndex = 2;
          let collided = false;
          while (true) {
            const candidatePath = path.resolve(
              path.join(targetDir, resolvedFileName),
            );
            const candidateKey = normalizeAllowlistKey(candidatePath);
            const candidateUsed = usedFileNames.has(
              resolvedFileName.toLowerCase(),
            );
            const exists = await fs.stat(candidatePath).catch(() => null);
            const existsConflict =
              Boolean(exists) && !sourcePathKeySet.has(candidateKey);
            if (!candidateUsed && !existsConflict) {
              operation.filesystemToPath = candidatePath;
              operation.targetPath = candidatePath;
              operation.targetName = resolvedFileName;
              usedFileNames.add(resolvedFileName.toLowerCase());
              plannedFileTargetByDir.set(targetDir, usedFileNames);
              break;
            }

            collided = true;
            if (failFast) {
              failed.push({
                target: operation.target,
                reason: "duplicate destination",
              });
              break;
            }

            resolvedFileName = withNumericSuffix(fileName, suffixIndex);
            suffixIndex += 1;
          }

          if (failFast && collided) {
            continue;
          }
        }

        const plannedArchiveTargetByGroup = new Map<string, Set<string>>();
        for (const operation of plannedOperations) {
          if (!operation.archivePath || !operation.archiveToEntryName) {
            continue;
          }
          const normalizedEntry = operation.archiveToEntryName.replace(
            /\\/g,
            "/",
          );
          const entryDir = path.posix.dirname(normalizedEntry);
          const entryName = path.posix.basename(normalizedEntry);
          const groupKey = `${normalizeAllowlistKey(operation.archivePath)}#${entryDir}`;
          const usedNames =
            plannedArchiveTargetByGroup.get(groupKey) ?? new Set<string>();
          let resolvedEntryName = entryName;
          let suffixIndex = 2;
          let collided = false;
          while (usedNames.has(resolvedEntryName.toLowerCase())) {
            collided = true;
            if (failFast) {
              failed.push({
                target: operation.target,
                reason: "duplicate destination",
              });
              break;
            }
            resolvedEntryName = withNumericSuffix(entryName, suffixIndex);
            suffixIndex += 1;
          }

          if (failFast && collided) {
            continue;
          }

          usedNames.add(resolvedEntryName.toLowerCase());
          plannedArchiveTargetByGroup.set(groupKey, usedNames);

          const nextEntryName =
            entryDir === "."
              ? resolvedEntryName
              : `${entryDir}/${resolvedEntryName}`;
          operation.archiveToEntryName = nextEntryName;
          operation.targetName = resolvedEntryName;
          operation.targetPath = `${operation.archivePath}#${nextEntryName}`;
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
      effectiveFailFast && failed.length > 0
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
      if (operation) {
        results.push({
          target: operation.target,
          source_name: operation.sourceName,
          target_name: operation.targetName,
          source_path: operation.sourcePath,
          target_path: operation.targetPath,
          applied: false,
          reason: failedItem.reason,
        });
        continue;
      }

      const storedSourceName =
        sourceNameByTargetKey.get(toTargetKey(failedItem.target)) ?? null;
      const fallbackSource =
        storedSourceName ??
        (failedItem.target.kind === "sidebar-node"
          ? failedItem.target.node_id
          : failedItem.target.kind === "image-item"
            ? failedItem.target.image_id
            : failedItem.target.entry_name);
      const fallbackPath =
        failedItem.target.kind === "archive-entry"
          ? `${path.resolve(failedItem.target.archive_path)}#${failedItem.target.entry_name}`
          : fallbackSource;
      results.push({
        target: failedItem.target,
        source_name: fallbackSource,
        target_name: fallbackSource,
        source_path: fallbackPath,
        target_path: fallbackPath,
        applied: false,
        reason: failedItem.reason,
      });
    }

    for (const item of unchangedItems) {
      const fullName = item.sourceName + item.sourceExtension;
      results.push({
        target: item.target,
        source_name: item.sourceName,
        target_name: fullName,
        source_path: item.sourcePath,
        target_path: item.sourcePath,
        applied: false,
        reason: item.reason,
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
        // 缩略图缓存键含源文件 path+mtime+size，重命名/重打包后旧键自然失效，无需全清缓存目录
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
    return renameSidebarNodesOperation(this.dependencies, request);
  }

  async renameSidebarNode(
    request: RenameSidebarNodeRequestDto,
  ): Promise<RenameSidebarNodeResponseDto> {
    return renameSidebarNodeOperation(this.dependencies, request);
  }
}
