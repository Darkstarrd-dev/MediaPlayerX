import { promises as fs } from "node:fs";
import path from "node:path";

import {
  type DeleteImageItemsRequestDto,
  type DeleteImageItemsResponseDto,
  type DeleteSidebarNodesRequestDto,
  type DeleteSidebarNodesResponseDto,
  type ImagePackageDto,
  type LibrarySnapshotDto,
  type MoveSidebarNodesRequestDto,
  type MoveSidebarNodesResponseDto,
} from "../../../src/contracts/backend";
import {
  isPathAllowlisted,
  type MediaAccessGuardContext,
} from "../../fileSystemMediaAccessGuard";
import {
  isPathInsideRoot,
  normalizeAllowlistKey,
} from "../../fileSystemServiceHelpers";
import { MediaLibraryDatabase } from "../../mediaLibraryDatabase";
import { isSafeArchiveEntryName } from "../../zipArchiveHelpers";
import { ImportPathRegistry } from "./importPathRegistry";
import {
  isFileSystemRootPath,
  isValidGroupName,
  parseSidebarNodeId,
  pathKeyHasPrefix,
} from "./managementMutationService.helpers";

interface ManagementMoveDeleteServiceDependencies {
  database: MediaLibraryDatabase;
  importPathRegistry: ImportPathRegistry;
  ensureStateLoaded: () => Promise<void>;
  ensureSnapshotLoaded: () => Promise<LibrarySnapshotDto>;
  syncSnapshotFromDatabase: () => LibrarySnapshotDto;
  refreshArchiveIndexesForPaths: (
    archivePaths: Iterable<string>,
  ) => Promise<void>;
  pruneArchiveIndexesByDeletedRoots: (deletedPaths: Iterable<string>) => void;
  removeImportSourcePaths: (pathsToRemove: string[]) => Promise<void>;
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
  repackArchiveWithoutEntries: (
    archivePath: string,
    removedEntryNames: Iterable<string>,
  ) => Promise<void>;
}

export class ManagementMoveDeleteService {
  constructor(
    private readonly dependencies: ManagementMoveDeleteServiceDependencies,
  ) {}

  async deleteImageItems(
    request: DeleteImageItemsRequestDto,
  ): Promise<DeleteImageItemsResponseDto> {
    const normalizedImageIds = Array.from(
      new Set(request.image_ids.map((value) => value.trim()).filter(Boolean)),
    );
    if (normalizedImageIds.length === 0) {
      throw new Error("删除失败：未提供图片 id");
    }

    const snapshot = await this.dependencies.ensureSnapshotLoaded();
    await this.dependencies.ensureStateLoaded();

    const sourceById = new Map<string, ImagePackageDto>([
      ...snapshot.image_packages.map((source) => [source.id, source] as const),
      ...snapshot.image_directories.map(
        (source) => [source.id, source] as const,
      ),
    ]);
    const mediaAccessContext = this.dependencies.buildMediaAccessContext();

    const imageById = new Map<
      string,
      { image: ImagePackageDto["images"][number]; source: ImagePackageDto }
    >();
    for (const source of sourceById.values()) {
      for (const image of source.images) {
        imageById.set(image.id, { image, source });
      }
    }

    const failed: Array<{ image_id: string; reason: string }> = [];
    const filesystemImageIdsByPath = new Map<string, Set<string>>();
    const archiveEntriesToDelete = new Map<string, Set<string>>();
    const archiveImageIdsByPath = new Map<string, Map<string, Set<string>>>();
    const importPathsToRemove = new Set<string>();

    for (const imageId of normalizedImageIds) {
      const found = imageById.get(imageId);
      if (!found) {
        failed.push({
          image_id: imageId,
          reason: "image not found",
        });
        continue;
      }

      const locator = found.image.media_locator;
      if (locator.kind === "filesystem") {
        const absolutePath = path.resolve(locator.absolute_path);
        if (!isPathAllowlisted(absolutePath, mediaAccessContext)) {
          failed.push({
            image_id: imageId,
            reason: "path outside allowlist",
          });
          continue;
        }
        const imageIds =
          filesystemImageIdsByPath.get(absolutePath) ?? new Set<string>();
        imageIds.add(imageId);
        filesystemImageIdsByPath.set(absolutePath, imageIds);
        continue;
      }

      if (locator.archive_format !== "zip") {
        failed.push({
          image_id: imageId,
          reason: "archive format not supported",
        });
        continue;
      }

      const archivePath = path.resolve(locator.archive_path);
      if (!isPathAllowlisted(archivePath, mediaAccessContext)) {
        failed.push({
          image_id: imageId,
          reason: "archive path outside allowlist",
        });
        continue;
      }
      const entryName = locator.entry_name;
      if (!entryName || !isSafeArchiveEntryName(entryName)) {
        failed.push({
          image_id: imageId,
          reason: "archive entry illegal",
        });
        continue;
      }

      const entrySet =
        archiveEntriesToDelete.get(archivePath) ?? new Set<string>();
      entrySet.add(entryName);
      archiveEntriesToDelete.set(archivePath, entrySet);

      const imageIdsByEntry =
        archiveImageIdsByPath.get(archivePath) ??
        new Map<string, Set<string>>();
      const imageIds = imageIdsByEntry.get(entryName) ?? new Set<string>();
      imageIds.add(imageId);
      imageIdsByEntry.set(entryName, imageIds);
      archiveImageIdsByPath.set(archivePath, imageIdsByEntry);
    }

    const deletedImageIds = new Set<string>();
    const changedArchivePaths = new Set<string>();

    for (const [absolutePath, imageIds] of filesystemImageIdsByPath) {
      try {
        await fs.rm(absolutePath, { force: true });
        for (const imageId of imageIds) {
          deletedImageIds.add(imageId);
        }
        if (this.dependencies.importPathRegistry.hasImportFile(absolutePath)) {
          importPathsToRemove.add(absolutePath);
        }
      } catch (error) {
        const reason =
          error instanceof Error && error.message
            ? error.message
            : String(error);
        for (const imageId of imageIds) {
          failed.push({
            image_id: imageId,
            reason,
          });
        }
      }
    }

    for (const [archivePath, entryNames] of archiveEntriesToDelete) {
      try {
        await this.dependencies.repackArchiveWithoutEntries(
          archivePath,
          entryNames,
        );
        changedArchivePaths.add(archivePath);

        const imageIdsByEntry =
          archiveImageIdsByPath.get(archivePath) ??
          new Map<string, Set<string>>();
        for (const entryName of entryNames) {
          const imageIds = imageIdsByEntry.get(entryName);
          if (!imageIds) {
            continue;
          }
          for (const imageId of imageIds) {
            deletedImageIds.add(imageId);
          }
        }

        if (this.dependencies.importPathRegistry.hasImportFile(archivePath)) {
          const source = Array.from(sourceById.values()).find(
            (item) => path.resolve(item.absolute_path) === archivePath,
          );
          if (source) {
            const remainingEntries = source.images.filter(
              (image) =>
                image.media_locator.kind === "archive-entry" &&
                !entryNames.has(image.media_locator.entry_name),
            );
            if (remainingEntries.length === 0) {
              importPathsToRemove.add(archivePath);
            }
          }
        }
      } catch (error) {
        const reason =
          error instanceof Error && error.message
            ? error.message
            : String(error);
        const imageIdsByEntry =
          archiveImageIdsByPath.get(archivePath) ??
          new Map<string, Set<string>>();
        for (const entryName of entryNames) {
          const imageIds = imageIdsByEntry.get(entryName);
          if (!imageIds) {
            continue;
          }
          for (const imageId of imageIds) {
            failed.push({
              image_id: imageId,
              reason,
            });
          }
        }
      }
    }

    if (deletedImageIds.size > 0) {
      this.dependencies.database.deleteImageItems(Array.from(deletedImageIds));
      this.dependencies.syncSnapshotFromDatabase();
      await this.dependencies.refreshArchiveIndexesForPaths(
        changedArchivePaths,
      );
    }

    if (importPathsToRemove.size > 0) {
      await this.dependencies.removeImportSourcePaths(
        Array.from(importPathsToRemove),
      );
    }

    const deletedCount = deletedImageIds.size;
    if (deletedCount > 0) {
      // 缩略图缓存键含源文件 path+mtime+size，删除/重打包后旧键自然失效，
      // 无需清空整个缓存目录（全清会迫使全库缩略图重新生成）
      this.dependencies.emitLibraryChanged({
        reason: "manage-delete-image-items",
        updated_at_ms: Date.now(),
      });
    }

    return {
      deleted_count: deletedCount,
      failed,
      updated_at_ms: Date.now(),
    };
  }

  async deleteSidebarNodes(
    request: DeleteSidebarNodesRequestDto,
  ): Promise<DeleteSidebarNodesResponseDto> {
    const normalizedNodeIds = Array.from(
      new Set(request.node_ids.map((value) => value.trim()).filter(Boolean)),
    );
    if (normalizedNodeIds.length === 0) {
      throw new Error("删除失败：未提供节点 id");
    }

    const parsedTargets = normalizedNodeIds.map((nodeId) => {
      const parsed = parseSidebarNodeId(nodeId);
      return {
        nodeId,
        parsed,
        matched: false,
      };
    });

    const failed: Array<{ node_id: string; reason: string }> = [];
    const shouldDeleteFiles = request.delete_files ?? true;
    const validTargets = parsedTargets.filter((target) => {
      if (target.parsed) {
        return true;
      }
      failed.push({
        node_id: target.nodeId,
        reason: "invalid node id",
      });
      return false;
    });

    await this.dependencies.ensureStateLoaded();
    const snapshot = await this.dependencies.ensureSnapshotLoaded();
    const mediaAccessContext = this.dependencies.buildMediaAccessContext();

    const selectedPaths = new Set<string>();
    const nodeIdsBySelectedPath = new Map<string, Set<string>>();
    const importPathsToRemove = new Set<string>();

    const hasUriScheme = (value: string): boolean =>
      /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(value);

    const rememberSelectedPath = (absolutePath: string, nodeId: string) => {
      const resolvedPath = hasUriScheme(absolutePath)
        ? absolutePath
        : path.resolve(absolutePath);
      selectedPaths.add(resolvedPath);
      const nodeIds =
        nodeIdsBySelectedPath.get(resolvedPath) ?? new Set<string>();
      nodeIds.add(nodeId);
      nodeIdsBySelectedPath.set(resolvedPath, nodeIds);
    };

    const markMatchedAndSelect = (
      pathKey: string,
      kind: "package" | "directory" | "video" | "audio",
      absolutePath: string,
    ): void => {
      for (const target of validTargets) {
        const parsed = target.parsed;
        if (!parsed) {
          continue;
        }

        if (parsed.kind === "folder") {
          if (pathKeyHasPrefix(pathKey, parsed.pathKey)) {
            target.matched = true;
            rememberSelectedPath(absolutePath, target.nodeId);
          }
          continue;
        }

        if (
          parsed.kind === "package" &&
          kind === "package" &&
          pathKey === parsed.pathKey
        ) {
          target.matched = true;
          rememberSelectedPath(absolutePath, target.nodeId);
          continue;
        }

        if (
          parsed.kind === "video" &&
          kind === "video" &&
          pathKey === parsed.pathKey
        ) {
          target.matched = true;
          rememberSelectedPath(absolutePath, target.nodeId);
          continue;
        }

        if (
          parsed.kind === "audio" &&
          kind === "audio" &&
          pathKey === parsed.pathKey
        ) {
          target.matched = true;
          rememberSelectedPath(absolutePath, target.nodeId);
          continue;
        }
      }
    };

    for (const source of snapshot.image_packages) {
      const pathKey = source.tree_path.join("/");
      markMatchedAndSelect(pathKey, "package", source.absolute_path);
    }

    for (const source of snapshot.image_directories) {
      const pathKey = source.tree_path.join("/");
      markMatchedAndSelect(pathKey, "directory", source.absolute_path);
    }

    for (const video of snapshot.videos) {
      const pathKey = video.tree_path.join("/");
      markMatchedAndSelect(pathKey, "video", video.absolute_path);
    }

    for (const audio of snapshot.audios ?? []) {
      const pathKey = audio.tree_path.join("/");
      markMatchedAndSelect(pathKey, "audio", audio.absolute_path);
    }

    for (const target of validTargets) {
      if (!target.matched) {
        failed.push({
          node_id: target.nodeId,
          reason: "node not found",
        });
      }
    }

    const sortedPaths = Array.from(selectedPaths).sort(
      (left, right) => left.length - right.length,
    );
    const prunedPaths: string[] = [];
    for (const candidatePath of sortedPaths) {
      if (
        prunedPaths.some(
          (existingPath) =>
            !hasUriScheme(existingPath) &&
            !hasUriScheme(candidatePath) &&
            isPathInsideRoot(existingPath, candidatePath),
        )
      ) {
        continue;
      }
      prunedPaths.push(candidatePath);
    }

    let deletedCount = 0;
    const pathsToPurgeFromSnapshot = new Set<string>();
    for (const absolutePath of prunedPaths) {
      try {
        if (hasUriScheme(absolutePath)) {
          pathsToPurgeFromSnapshot.add(absolutePath);
          deletedCount += 1;
          continue;
        }

        if (isFileSystemRootPath(absolutePath)) {
          const nodeIds =
            nodeIdsBySelectedPath.get(absolutePath) ?? new Set<string>();
          for (const nodeId of nodeIds) {
            failed.push({
              node_id: nodeId,
              reason: "refuse to delete filesystem root",
            });
          }
          continue;
        }

        if (!isPathAllowlisted(absolutePath, mediaAccessContext)) {
          const nodeIds =
            nodeIdsBySelectedPath.get(absolutePath) ?? new Set<string>();
          for (const nodeId of nodeIds) {
            failed.push({
              node_id: nodeId,
              reason: "path outside allowlist",
            });
          }
          continue;
        }

        let stat: { isDirectory: () => boolean; isFile: () => boolean } | null =
          null;
        try {
          stat = await fs.stat(absolutePath);
        } catch (error) {
          const maybeFsError = error as NodeJS.ErrnoException;
          if (maybeFsError?.code !== "ENOENT") {
            throw error;
          }
        }

        if (!stat) {
          pathsToPurgeFromSnapshot.add(absolutePath);
          importPathsToRemove.add(absolutePath);
          deletedCount += 1;
          continue;
        }

        if (!shouldDeleteFiles) {
          pathsToPurgeFromSnapshot.add(absolutePath);
          importPathsToRemove.add(absolutePath);
          deletedCount += 1;
          continue;
        }

        if (stat.isDirectory()) {
          await fs.rm(absolutePath, { recursive: true, force: true });
          deletedCount += 1;
          pathsToPurgeFromSnapshot.add(absolutePath);
          importPathsToRemove.add(absolutePath);
          continue;
        }
        if (stat.isFile()) {
          await fs.rm(absolutePath, { force: true });
          deletedCount += 1;
          pathsToPurgeFromSnapshot.add(absolutePath);
          importPathsToRemove.add(absolutePath);
        }
      } catch (error) {
        const reason =
          error instanceof Error && error.message
            ? error.message
            : String(error);
        const nodeIds =
          nodeIdsBySelectedPath.get(absolutePath) ?? new Set<string>();
        for (const nodeId of nodeIds) {
          failed.push({
            node_id: nodeId,
            reason,
          });
        }
      }
    }

    if (pathsToPurgeFromSnapshot.size > 0) {
      this.dependencies.database.deleteSnapshotEntriesByPaths(
        Array.from(pathsToPurgeFromSnapshot),
      );
      this.dependencies.syncSnapshotFromDatabase();
      this.dependencies.pruneArchiveIndexesByDeletedRoots(
        pathsToPurgeFromSnapshot,
      );
    }

    if (importPathsToRemove.size > 0) {
      await this.dependencies.removeImportSourcePaths(
        Array.from(importPathsToRemove),
      );
    }

    if (pathsToPurgeFromSnapshot.size > 0) {
      this.dependencies.emitLibraryChanged({
        reason: "manage-delete-sidebar-nodes",
        updated_at_ms: Date.now(),
      });
    }

    return {
      deleted_count: deletedCount,
      failed,
      updated_at_ms: Date.now(),
    };
  }

  async moveSidebarNodes(
    request: MoveSidebarNodesRequestDto,
  ): Promise<MoveSidebarNodesResponseDto> {
    const normalizedNodeIds = Array.from(
      new Set(request.node_ids.map((value) => value.trim()).filter(Boolean)),
    );
    if (normalizedNodeIds.length === 0) {
      throw new Error("移动失败：未提供节点 id");
    }

    const destinationRootDir = path.resolve(request.destination_directory);
    const destinationRootStat = await fs
      .stat(destinationRootDir)
      .catch(() => null);
    if (!destinationRootStat || !destinationRootStat.isDirectory()) {
      throw new Error(`移动失败：目标目录不存在 ${destinationRootDir}`);
    }

    const groupName = request.group_name?.trim() ?? "";
    if (groupName.length > 0 && !isValidGroupName(groupName)) {
      throw new Error("分组失败：目录名不合法");
    }

    let targetDirectory = destinationRootDir;
    if (groupName.length > 0) {
      targetDirectory = path.resolve(path.join(destinationRootDir, groupName));
      if (path.dirname(targetDirectory) !== destinationRootDir) {
        throw new Error("分组失败：目录名不合法");
      }

      try {
        await fs.mkdir(targetDirectory);
      } catch (error) {
        const maybeFsError = error as NodeJS.ErrnoException;
        if (maybeFsError?.code === "EEXIST") {
          throw new Error(`分组失败：目录已存在 ${targetDirectory}`);
        }
        throw error;
      }
    }

    const parsedTargets = normalizedNodeIds.map((nodeId) => {
      const parsed = parseSidebarNodeId(nodeId);
      return {
        nodeId,
        parsed,
        matched: false,
      };
    });

    const failed: Array<{ node_id: string; reason: string }> = [];
    const validTargets = parsedTargets.filter((target) => {
      if (target.parsed) {
        return true;
      }
      failed.push({
        node_id: target.nodeId,
        reason: "invalid node id",
      });
      return false;
    });

    await this.dependencies.ensureStateLoaded();
    const snapshot = await this.dependencies.ensureSnapshotLoaded();
    const mediaAccessContext = this.dependencies.buildMediaAccessContext();

    const selectedPaths = new Set<string>();
    const nodeIdsBySelectedPath = new Map<string, Set<string>>();

    const rememberSelectedPath = (absolutePath: string, nodeId: string) => {
      const resolvedPath = path.resolve(absolutePath);
      selectedPaths.add(resolvedPath);
      const nodeIds =
        nodeIdsBySelectedPath.get(resolvedPath) ?? new Set<string>();
      nodeIds.add(nodeId);
      nodeIdsBySelectedPath.set(resolvedPath, nodeIds);
    };

    const markMatchedAndSelect = (
      pathKey: string,
      kind: "package" | "directory" | "video" | "audio",
      absolutePath: string,
    ): void => {
      for (const target of validTargets) {
        const parsed = target.parsed;
        if (!parsed) {
          continue;
        }

        if (parsed.kind === "folder") {
          if (pathKeyHasPrefix(pathKey, parsed.pathKey)) {
            target.matched = true;
            rememberSelectedPath(absolutePath, target.nodeId);
          }
          continue;
        }

        if (
          parsed.kind === "package" &&
          kind === "package" &&
          pathKey === parsed.pathKey
        ) {
          target.matched = true;
          rememberSelectedPath(absolutePath, target.nodeId);
          continue;
        }

        if (
          parsed.kind === "video" &&
          kind === "video" &&
          pathKey === parsed.pathKey
        ) {
          target.matched = true;
          rememberSelectedPath(absolutePath, target.nodeId);
          continue;
        }

        if (
          parsed.kind === "audio" &&
          kind === "audio" &&
          pathKey === parsed.pathKey
        ) {
          target.matched = true;
          rememberSelectedPath(absolutePath, target.nodeId);
          continue;
        }
      }
    };

    for (const source of snapshot.image_packages) {
      const pathKey = source.tree_path.join("/");
      markMatchedAndSelect(pathKey, "package", source.absolute_path);
    }

    for (const source of snapshot.image_directories) {
      const pathKey = source.tree_path.join("/");
      markMatchedAndSelect(pathKey, "directory", source.absolute_path);
    }

    for (const video of snapshot.videos) {
      const pathKey = video.tree_path.join("/");
      markMatchedAndSelect(pathKey, "video", video.absolute_path);
    }

    for (const audio of snapshot.audios ?? []) {
      const pathKey = audio.tree_path.join("/");
      markMatchedAndSelect(pathKey, "audio", audio.absolute_path);
    }

    for (const target of validTargets) {
      if (target.matched) {
        continue;
      }
      failed.push({
        node_id: target.nodeId,
        reason: "node not found",
      });
    }

    const sortedPaths = Array.from(selectedPaths).sort(
      (left, right) => left.length - right.length,
    );
    const prunedPaths: string[] = [];
    for (const candidatePath of sortedPaths) {
      if (
        prunedPaths.some((existingPath) =>
          isPathInsideRoot(existingPath, candidatePath),
        )
      ) {
        continue;
      }
      prunedPaths.push(candidatePath);
    }

    const movedMappings: Array<{ fromPath: string; toPath: string }> = [];
    for (const absolutePath of prunedPaths) {
      const nodeIds =
        nodeIdsBySelectedPath.get(absolutePath) ?? new Set<string>();

      if (!isPathAllowlisted(absolutePath, mediaAccessContext)) {
        for (const nodeId of nodeIds) {
          failed.push({
            node_id: nodeId,
            reason: "path outside allowlist",
          });
        }
        continue;
      }

      if (
        normalizeAllowlistKey(absolutePath) ===
        normalizeAllowlistKey(targetDirectory)
      ) {
        for (const nodeId of nodeIds) {
          failed.push({
            node_id: nodeId,
            reason: "source equals destination",
          });
        }
        continue;
      }

      if (isPathInsideRoot(absolutePath, targetDirectory)) {
        for (const nodeId of nodeIds) {
          failed.push({
            node_id: nodeId,
            reason: "destination inside source path",
          });
        }
        continue;
      }

      const sourceStat = await fs.stat(absolutePath).catch(() => null);
      if (!sourceStat) {
        for (const nodeId of nodeIds) {
          failed.push({
            node_id: nodeId,
            reason: "path not found",
          });
        }
        continue;
      }

      const toPath = path.resolve(
        path.join(targetDirectory, path.basename(absolutePath)),
      );
      if (
        normalizeAllowlistKey(absolutePath) === normalizeAllowlistKey(toPath)
      ) {
        for (const nodeId of nodeIds) {
          failed.push({
            node_id: nodeId,
            reason: "source already in destination",
          });
        }
        continue;
      }

      const targetExists = await fs.stat(toPath).catch(() => null);
      if (targetExists) {
        for (const nodeId of nodeIds) {
          failed.push({
            node_id: nodeId,
            reason: "destination already exists",
          });
        }
        continue;
      }

      try {
        await this.dependencies.movePathWithFallback(
          absolutePath,
          toPath,
          sourceStat.isDirectory(),
        );
        movedMappings.push({
          fromPath: absolutePath,
          toPath,
        });
      } catch (error) {
        const reason =
          error instanceof Error && error.message
            ? error.message
            : String(error);
        for (const nodeId of nodeIds) {
          failed.push({
            node_id: nodeId,
            reason,
          });
        }
      }
    }

    if (movedMappings.length > 0) {
      this.dependencies.database.moveSnapshotEntriesByPaths(movedMappings);
      this.dependencies.syncSnapshotFromDatabase();
      this.dependencies.pruneArchiveIndexesByDeletedRoots(
        movedMappings.map((mapping) => mapping.fromPath),
      );
      await this.dependencies.refreshArchiveIndexesForPaths(
        movedMappings.map((mapping) => mapping.toPath),
      );
      await this.dependencies.replaceImportSourcePaths(movedMappings);

      this.dependencies.emitLibraryChanged({
        reason:
          groupName.length > 0
            ? "manage-group-sidebar-nodes"
            : "manage-move-sidebar-nodes",
        updated_at_ms: Date.now(),
      });
    }

    return {
      moved_count: movedMappings.length,
      failed,
      target_directory: targetDirectory,
      updated_at_ms: Date.now(),
    };
  }
}
