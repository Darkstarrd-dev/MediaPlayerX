import { constants as fsConstants, promises as fs } from "node:fs";

import {
  type DeleteImageItemsRequestDto,
  type DeleteImageItemsResponseDto,
  type LibrarySnapshotDto,
  type MoveSidebarNodesRequestDto,
  type MoveSidebarNodesResponseDto,
  type RenameItemsRequestDto,
  type RenameItemsResponseDto,
  type RenameSidebarNodeRequestDto,
  type RenameSidebarNodeResponseDto,
  type RenameSidebarNodesRequestDto,
  type RenameSidebarNodesResponseDto,
  type SetImageHiddenRequestDto,
  type SetImageHiddenResponseDto,
  type StartImageConvertTaskRequestDto,
  type StartAudioTranscodeTaskRequestDto,
  type ReadAudioTranscodeCapabilitiesResponseDto,
  type DeleteSidebarNodesRequestDto,
  type DeleteSidebarNodesResponseDto,
} from "../../../src/contracts/backend";
import { type MediaAccessGuardContext } from "../../fileSystemMediaAccessGuard";
import { MediaLibraryDatabase } from "../../mediaLibraryDatabase";
import { ImportPathRegistry } from "./importPathRegistry";
import { ManagementArchiveOps } from "./managementArchiveOps";
import { ManagementImageConvertService } from "./managementImageConvertService";
import { ManagementAudioTranscodeService } from "./managementAudioTranscodeService";
import { ManagementMoveDeleteService } from "./managementMoveDeleteService";
import { ManagementRenameService } from "./managementRenameService";
import { type RuntimeDependencySnapshot } from "./runtimeDependencyService";

interface ImageConvertProgressPayload {
  total_count: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  message: string;
}

interface RunImageConvertTaskOptions {
  isCancelled?: () => boolean;
  onProgress?: (payload: ImageConvertProgressPayload) => void;
}

interface RunImageConvertTaskResult {
  total_count: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  first_error_detail: string | null;
}

interface AudioTranscodeProgressPayload {
  total_count: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  message: string;
}

interface RunAudioTranscodeTaskOptions {
  isCancelled?: () => boolean;
  signal?: AbortSignal;
  onProgress?: (payload: AudioTranscodeProgressPayload) => void;
}

interface RunAudioTranscodeTaskResult {
  total_count: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  output_files: string[];
  first_error_detail: string | null;
}

interface ManagementMutationServiceOptions {
  rootDir: string;
  thumbnailCacheRootDir: string;
  database: MediaLibraryDatabase;
  importPathRegistry: ImportPathRegistry;
  ensureStateLoaded: () => Promise<void>;
  ensureSnapshotLoaded: () => Promise<LibrarySnapshotDto>;
  refreshSnapshotFromFilesystem?: (options?: {
    force?: boolean;
  }) => Promise<LibrarySnapshotDto>;
  syncSnapshotFromDatabase: () => LibrarySnapshotDto;
  ffmpegBin: string;
  ensureRuntimeDependencies: () => Promise<RuntimeDependencySnapshot>;
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
  audioTranscodeConcurrency?: number;
  runWithCpuToken?: <T>(taskName: string, task: () => Promise<T>) => Promise<T>;
  withArchiveWriteLock?: <T>(
    archivePath: string,
    task: () => Promise<T>,
  ) => Promise<T>;
}

export class ManagementMutationService {
  private readonly archiveOps: ManagementArchiveOps;
  private readonly imageConvertService: ManagementImageConvertService;
  private readonly audioTranscodeService: ManagementAudioTranscodeService;
  private readonly renameService: ManagementRenameService;
  private readonly moveDeleteService: ManagementMoveDeleteService;

  constructor(private readonly options: ManagementMutationServiceOptions) {
    this.archiveOps = new ManagementArchiveOps({
      withArchiveWriteLock: this.withArchiveWriteLock.bind(this),
    });
    this.imageConvertService = new ManagementImageConvertService({
      thumbnailCacheRootDir: options.thumbnailCacheRootDir,
      ensureStateLoaded: options.ensureStateLoaded,
      ensureSnapshotLoaded: options.ensureSnapshotLoaded,
      refreshSnapshotFromFilesystem: options.refreshSnapshotFromFilesystem,
      syncSnapshotFromDatabase: options.syncSnapshotFromDatabase,
      refreshArchiveIndexesForPaths: options.refreshArchiveIndexesForPaths,
      buildMediaAccessContext: options.buildMediaAccessContext,
      emitLibraryChanged: options.emitLibraryChanged,
      withArchiveWriteLock: this.withArchiveWriteLock.bind(this),
    });
    this.audioTranscodeService = new ManagementAudioTranscodeService({
      rootDir: options.rootDir,
      ffmpegBin: options.ffmpegBin,
      ensureRuntimeDependencies: options.ensureRuntimeDependencies,
      ensureStateLoaded: options.ensureStateLoaded,
      ensureSnapshotLoaded: options.ensureSnapshotLoaded,
      refreshSnapshotFromFilesystem: options.refreshSnapshotFromFilesystem,
      syncSnapshotFromDatabase: options.syncSnapshotFromDatabase,
      buildMediaAccessContext: options.buildMediaAccessContext,
      readMusicImportSources: () => options.database.readMusicImportSources(),
      writeMusicImportSources: (next) =>
        options.database.writeMusicImportSources(next),
      emitLibraryChanged: options.emitLibraryChanged,
      defaultConcurrency: options.audioTranscodeConcurrency ?? 1,
      runWithCpuToken: options.runWithCpuToken,
    });
    this.renameService = new ManagementRenameService({
      database: options.database,
      thumbnailCacheRootDir: options.thumbnailCacheRootDir,
      ensureStateLoaded: options.ensureStateLoaded,
      ensureSnapshotLoaded: options.ensureSnapshotLoaded,
      syncSnapshotFromDatabase: options.syncSnapshotFromDatabase,
      refreshArchiveIndexesForPaths: options.refreshArchiveIndexesForPaths,
      pruneArchiveIndexesByDeletedRoots:
        options.pruneArchiveIndexesByDeletedRoots,
      replaceImportSourcePaths: options.replaceImportSourcePaths,
      buildMediaAccessContext: options.buildMediaAccessContext,
      emitLibraryChanged: options.emitLibraryChanged,
      movePathWithFallback: this.movePathWithFallback.bind(this),
      repackArchiveWithRenamedEntries:
        this.archiveOps.repackArchiveWithRenamedEntries.bind(this.archiveOps),
    });
    this.moveDeleteService = new ManagementMoveDeleteService({
      database: options.database,
      thumbnailCacheRootDir: options.thumbnailCacheRootDir,
      importPathRegistry: options.importPathRegistry,
      ensureStateLoaded: options.ensureStateLoaded,
      ensureSnapshotLoaded: options.ensureSnapshotLoaded,
      syncSnapshotFromDatabase: options.syncSnapshotFromDatabase,
      refreshArchiveIndexesForPaths: options.refreshArchiveIndexesForPaths,
      pruneArchiveIndexesByDeletedRoots:
        options.pruneArchiveIndexesByDeletedRoots,
      removeImportSourcePaths: options.removeImportSourcePaths,
      replaceImportSourcePaths: options.replaceImportSourcePaths,
      buildMediaAccessContext: options.buildMediaAccessContext,
      emitLibraryChanged: options.emitLibraryChanged,
      movePathWithFallback: this.movePathWithFallback.bind(this),
      repackArchiveWithoutEntries:
        this.archiveOps.repackArchiveWithoutEntries.bind(this.archiveOps),
    });
  }

  private async withArchiveWriteLock<T>(
    archivePath: string,
    task: () => Promise<T>,
  ): Promise<T> {
    if (this.options.withArchiveWriteLock) {
      return await this.options.withArchiveWriteLock(archivePath, task);
    }
    return await task();
  }

  private async movePathWithFallback(
    sourcePath: string,
    targetPath: string,
    directory: boolean,
  ): Promise<void> {
    try {
      await fs.rename(sourcePath, targetPath);
      return;
    } catch (error) {
      const maybeFsError = error as NodeJS.ErrnoException;
      if (maybeFsError?.code !== "EXDEV") {
        throw error;
      }
    }

    if (directory) {
      await fs.cp(sourcePath, targetPath, {
        recursive: true,
        force: false,
        errorOnExist: true,
      });
      await fs.rm(sourcePath, { recursive: true, force: true });
      return;
    }

    await fs.copyFile(sourcePath, targetPath, fsConstants.COPYFILE_EXCL);
    await fs.rm(sourcePath, { force: true });
  }

  async runImageConvertTask(
    request: StartImageConvertTaskRequestDto,
    options: RunImageConvertTaskOptions = {},
  ): Promise<RunImageConvertTaskResult> {
    return await this.imageConvertService.runImageConvertTask(request, options);
  }

  async runAudioTranscodeTask(
    request: StartAudioTranscodeTaskRequestDto,
    options: RunAudioTranscodeTaskOptions = {},
  ): Promise<RunAudioTranscodeTaskResult> {
    return await this.audioTranscodeService.runAudioTranscodeTask(
      request,
      options,
    );
  }

  async readAudioTranscodeCapabilities(): Promise<ReadAudioTranscodeCapabilitiesResponseDto> {
    return await this.audioTranscodeService.readAudioTranscodeCapabilities();
  }

  async setImageHidden(
    request: SetImageHiddenRequestDto,
  ): Promise<SetImageHiddenResponseDto> {
    await this.options.ensureStateLoaded();
    const normalizedImageIds = Array.from(
      new Set(request.image_ids.map((value) => value.trim()).filter(Boolean)),
    );
    if (normalizedImageIds.length === 0) {
      throw new Error("设置隐藏失败：未提供图片 id");
    }

    const updatedCount = this.options.database.setImagesHidden(
      normalizedImageIds,
      request.hidden,
    );
    if (updatedCount > 0) {
      this.options.syncSnapshotFromDatabase();
      this.options.emitLibraryChanged({
        reason: "manage-hide",
        updated_at_ms: Date.now(),
      });
    }

    return {
      updated_count: updatedCount,
      updated_at_ms: Date.now(),
    };
  }

  async deleteImageItems(
    request: DeleteImageItemsRequestDto,
  ): Promise<DeleteImageItemsResponseDto> {
    return await this.moveDeleteService.deleteImageItems(request);
  }

  async deleteSidebarNodes(
    request: DeleteSidebarNodesRequestDto,
  ): Promise<DeleteSidebarNodesResponseDto> {
    return await this.moveDeleteService.deleteSidebarNodes(request);
  }

  async renameItems(
    request: RenameItemsRequestDto,
  ): Promise<RenameItemsResponseDto> {
    return await this.renameService.renameItems(request);
  }

  async renameSidebarNodes(
    request: RenameSidebarNodesRequestDto,
  ): Promise<RenameSidebarNodesResponseDto> {
    return await this.renameService.renameSidebarNodes(request);
  }

  async renameSidebarNode(
    request: RenameSidebarNodeRequestDto,
  ): Promise<RenameSidebarNodeResponseDto> {
    return await this.renameService.renameSidebarNode(request);
  }

  async moveSidebarNodes(
    request: MoveSidebarNodesRequestDto,
  ): Promise<MoveSidebarNodesResponseDto> {
    return await this.moveDeleteService.moveSidebarNodes(request);
  }
}
