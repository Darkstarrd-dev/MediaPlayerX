import path from "node:path";

import { MediaLibraryDatabase } from "../mediaLibraryDatabase";
import type { LibraryChangedEventPayload } from "../services/file-system-read/fileSystemReadFacadeEvents";
import {
  THUMBNAIL_CACHE_DIR_NAME,
  ARCHIVE_NORMALIZE_DIR_NAME,
} from "../services/file-system-read/fileSystemReadFacadeConfig";
import { MediaTokenService } from "../services/file-system-read/mediaTokenService";
import { ImportPathRegistry } from "../services/file-system-read/importPathRegistry";
import { ArchiveNormalizationService } from "../services/file-system-read/archiveNormalizationService";
import { ImportTaskService } from "../services/file-system-read/importTaskService";
import { LibraryReadWriteService } from "../services/file-system-read/libraryReadWriteService";
import { LibrarySnapshotService } from "../services/file-system-read/librarySnapshotService";
import { ManagementMutationService } from "../services/file-system-read/managementMutationService";
import { ManageAdReviewService } from "../services/file-system-read/manageAdReviewService";
import { ManageCoverReviewService } from "../services/file-system-read/manageCoverReviewService";
import { MediaResourceService } from "../services/file-system-read/mediaResourceService";
import { RuntimeDependencyService } from "../services/file-system-read/runtimeDependencyService";
import { SubtitleModelService } from "../services/file-system-read/subtitleModelService";
import { FileSystemLibraryHandlers } from "./FileSystemLibraryHandlers";
import { FileSystemManagementHandlers } from "./FileSystemManagementHandlers";
import { FileSystemSystemHandlers } from "./FileSystemSystemHandlers";
import { FileSystemFacadeContext } from "./types";

export function resolveServiceRootPaths(options: {
  rootDir: string;
  thumbnailCacheRootDir?: string;
}): {
  rootDir: string;
  coverOutputRootDir: string;
  thumbnailCacheRootDir: string;
  normalizedArchiveRootDir: string;
} {
  const rootDir = path.resolve(options.rootDir);
  return {
    rootDir,
    coverOutputRootDir: path.join(rootDir, "covers"),
    thumbnailCacheRootDir: path.resolve(
      options.thumbnailCacheRootDir ??
        path.join(rootDir, THUMBNAIL_CACHE_DIR_NAME),
    ),
    normalizedArchiveRootDir: path.join(rootDir, ARCHIVE_NORMALIZE_DIR_NAME),
  };
}

interface CreateFacadeContextOptions {
  rootDir: string;
  coverOutputRootDir: string;
  thumbnailCacheRootDir: string;
  normalizedArchiveRootDir: string;
  database: MediaLibraryDatabase;
  mediaTokenService: MediaTokenService;
  importPathRegistry: ImportPathRegistry;
  archiveNormalizationService: ArchiveNormalizationService;
  importTaskService: ImportTaskService;
  libraryReadWriteService: LibraryReadWriteService;
  librarySnapshotService: LibrarySnapshotService;
  managementMutationService: ManagementMutationService;
  manageAdReviewService: ManageAdReviewService;
  manageCoverReviewService: ManageCoverReviewService;
  mediaResourceService: MediaResourceService;
  runtimeDependencyService: RuntimeDependencyService;
  subtitleModelService: SubtitleModelService;
  eventBus: FileSystemFacadeContext["eventBus"];
  ensureStateLoaded: FileSystemFacadeContext["ensureStateLoaded"];
  ensureSnapshotLoaded: FileSystemFacadeContext["ensureSnapshotLoaded"];
  invalidateCache: FileSystemFacadeContext["invalidateCache"];
  emitLibraryChanged: (payload: LibraryChangedEventPayload) => void;
  markInteractiveRead: FileSystemFacadeContext["markInteractiveRead"];
  clearDatabase: FileSystemFacadeContext["clearDatabase"];
}

export function createFacadeContext(
  options: CreateFacadeContextOptions,
): FileSystemFacadeContext {
  return {
    rootDir: options.rootDir,
    coverOutputRootDir: options.coverOutputRootDir,
    thumbnailCacheRootDir: options.thumbnailCacheRootDir,
    normalizedArchiveRootDir: options.normalizedArchiveRootDir,
    database: options.database,
    mediaTokenService: options.mediaTokenService,
    importPathRegistry: options.importPathRegistry,
    archiveNormalizationService: options.archiveNormalizationService,
    importTaskService: options.importTaskService,
    libraryReadWriteService: options.libraryReadWriteService,
    librarySnapshotService: options.librarySnapshotService,
    managementMutationService: options.managementMutationService,
    manageAdReviewService: options.manageAdReviewService,
    manageCoverReviewService: options.manageCoverReviewService,
    mediaResourceService: options.mediaResourceService,
    runtimeDependencyService: options.runtimeDependencyService,
    subtitleModelService: options.subtitleModelService,
    eventBus: options.eventBus,
    ensureStateLoaded: options.ensureStateLoaded,
    ensureSnapshotLoaded: options.ensureSnapshotLoaded,
    invalidateCache: options.invalidateCache,
    emitLibraryChanged: options.emitLibraryChanged,
    markInteractiveRead: options.markInteractiveRead,
    clearDatabase: options.clearDatabase,
  };
}

export function createFacadeHandlers(context: FileSystemFacadeContext): {
  libraryHandlers: FileSystemLibraryHandlers;
  managementHandlers: FileSystemManagementHandlers;
  systemHandlers: FileSystemSystemHandlers;
} {
  return {
    libraryHandlers: new FileSystemLibraryHandlers(context),
    managementHandlers: new FileSystemManagementHandlers(context),
    systemHandlers: new FileSystemSystemHandlers(context),
  };
}

export function createArchiveNormalizationServiceOptions(
  options: {} & ConstructorParameters<typeof ArchiveNormalizationService>[0],
): ConstructorParameters<typeof ArchiveNormalizationService>[0] {
  return options;
}

export function createMediaResourceServiceOptions(
  options: ConstructorParameters<typeof MediaResourceService>[0],
): ConstructorParameters<typeof MediaResourceService>[0] {
  return options;
}
