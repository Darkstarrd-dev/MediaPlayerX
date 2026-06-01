import { promises as fs } from "node:fs";
import path from "node:path";

import {
  isPathInsideRoot,
  normalizeAllowlistKey,
} from "./fileSystemServiceHelpers";

import {
  type EnqueueImportTaskRequestDto,
  type EnqueueImportTaskResponseDto,
  type ClearDatabaseResponseDto,
  type ImportTaskDto,
  type LibrarySnapshotDto,
  type LibrarySnapshotLiteDto,
  type MediaAccessAuditResponseDto,
  type ReadPlaylistResponseDto,
  type ListVideoSubtitlesRequestDto,
  type ListVideoSubtitlesResponseDto,
  type PrepareSubtitleTrackRequestDto,
  type PrepareSubtitleTrackResponseDto,
  type ReadAppStateRequestDto,
  type ReadAppStateResponseDto,
  type ReadImageMetadataRequestDto,
  type ReadImageMetadataResponseDto,
  type ReadRuntimeCapabilitiesResponseDto,
  type ReadSubtitleEngineStatusResponseDto,
  type ListSubtitleRemoteModelsResponseDto,
  type ListSubtitleLocalModelsRequestDto,
  type ListSubtitleLocalModelsResponseDto,
  type StartSubtitleModelDownloadRequestDto,
  type StartSubtitleModelDownloadResponseDto,
  type CancelSubtitleModelDownloadRequestDto,
  type CancelSubtitleModelDownloadResponseDto,
  type ReadSubtitleModelDownloadsResponseDto,
  type ClearSubtitleLocalModelRequestDto,
  type ClearSubtitleLocalModelResponseDto,
  type ReadArchiveLoadStatusResponseDto,
  type ReadImagePageRequestDto,
  type ReadImagePageResponseDto,
  type ReadSourceImagesRequestDto,
  type ReadSourceImagesResponseDto,
  type ReadImageSidebarTreeRequestDto,
  type ReadImageSidebarTreeResponseDto,
  type ResolveMediaResourceRequestDto,
  type ResolveMediaResourceResponseDto,
  type RetryImportTaskRequestDto,
  type RetryImportTaskResponseDto,
  type SaveVideoCoverRequestDto,
  type SaveVideoCoverResponseDto,
  type SearchExternalMetadataRequestDto,
  type SearchExternalMetadataResponseDto,
  type SetImageHiddenRequestDto,
  type SetImageHiddenResponseDto,
  type DeleteImageItemsRequestDto,
  type DeleteImageItemsResponseDto,
  type DeleteSidebarNodesRequestDto,
  type DeleteSidebarNodesResponseDto,
  type MoveSidebarNodesRequestDto,
  type MoveSidebarNodesResponseDto,
  type RenameSidebarNodeRequestDto,
  type RenameSidebarNodeResponseDto,
  type RenameSidebarNodesRequestDto,
  type RenameSidebarNodesResponseDto,
  type RenameItemsRequestDto,
  type RenameItemsResponseDto,
  type StartManageAdReviewRequestDto,
  type StartManageAdReviewResponseDto,
  type ReadManageAdReviewTaskRequestDto,
  type ReadManageAdReviewTaskResponseDto,
  type PauseManageAdReviewTaskRequestDto,
  type PauseManageAdReviewTaskResponseDto,
  type TestAdReviewVisionModelRequestDto,
  type TestAdReviewVisionModelResponseDto,
  type ConfirmManageAdReviewDeleteRequestDto,
  type ConfirmManageAdReviewDeleteResponseDto,
  type ReadManageAdReviewKnownHashesResponseDto,
  type ImportManageAdReviewKnownHashesRequestDto,
  type ImportManageAdReviewKnownHashesResponseDto,
  type ExportManageAdReviewKnownHashesRequestDto,
  type ExportManageAdReviewKnownHashesResponseDto,
  type StartManageCoverReviewRequestDto,
  type StartManageCoverReviewResponseDto,
  type ReadManageCoverReviewTaskRequestDto,
  type ReadManageCoverReviewTaskResponseDto,
  type PauseManageCoverReviewTaskRequestDto,
  type PauseManageCoverReviewTaskResponseDto,
  type ConfirmManageCoverReviewHideRequestDto,
  type ConfirmManageCoverReviewHideResponseDto,
  type StartManageSubtitleCleanupRequestDto,
  type StartManageSubtitleCleanupResponseDto,
  type ReadManageSubtitleCleanupTaskRequestDto,
  type ReadManageSubtitleCleanupTaskResponseDto,
  type RunManageSubtitleCleanupRequestDto,
  type RunManageSubtitleCleanupResponseDto,
  type SaveManageSubtitleCleanupRequestDto,
  type SaveManageSubtitleCleanupResponseDto,
  type StartImageConvertTaskRequestDto,
  type StartImageConvertTaskResponseDto,
  type ReadImageConvertTaskRequestDto,
  type ReadImageConvertTaskResponseDto,
  type CancelImageConvertTaskRequestDto,
  type CancelImageConvertTaskResponseDto,
  type StartAudioTranscodeTaskRequestDto,
  type StartAudioTranscodeTaskResponseDto,
  type ReadAudioTranscodeCapabilitiesResponseDto,
  type ReadAudioTranscodeTaskRequestDto,
  type ReadAudioTranscodeTaskResponseDto,
  type CancelAudioTranscodeTaskRequestDto,
  type CancelAudioTranscodeTaskResponseDto,
  type StartVideoTranscodeTaskRequestDto,
  type StartVideoTranscodeTaskResponseDto,
  type EstimateVideoTranscodeOutputSizeRequestDto,
  type EstimateVideoTranscodeOutputSizeResponseDto,
  type ReadVideoTranscodeCapabilitiesResponseDto,
  type ReadVideoTranscodeTaskRequestDto,
  type ReadVideoTranscodeTaskResponseDto,
  type CancelVideoTranscodeTaskRequestDto,
  type CancelVideoTranscodeTaskResponseDto,
  type AudioItemDto,
  type WritePlaylistRequestDto,
  type WritePlaylistResponseDto,
  type WritePackageMetadataRequestDto,
  type WritePackageMetadataResponseDto,
  type WritePackageExternalMetadataRequestDto,
  type WritePackageExternalMetadataResponseDto,
  type WriteVideoMetadataRequestDto,
  type WriteVideoMetadataResponseDto,
  type WriteAudioMetadataRequestDto,
  type WriteAudioMetadataResponseDto,
  type WritePackageGradeRequestDto,
  type WritePackageGradeResponseDto,
  type WriteAppStateRequestDto,
  type WriteAppStateResponseDto,
} from "../src/contracts/backend";
import { MEDIA_PROTOCOL_SCHEME } from "./channels";
import {
  isPathAllowlisted,
  type MediaAccessGuardContext,
} from "./fileSystemMediaAccessGuard";
import {
  type MediaProtocolResponsePayload,
  type MediaProtocolStreamResponsePayload,
} from "./fileSystemMediaReaders";
import { MediaLibraryDatabase } from "./mediaLibraryDatabase";
import { MediaTokenService } from "./services/file-system-read/mediaTokenService";
import { ImportPathRegistry } from "./services/file-system-read/importPathRegistry";
import {
  ARCHIVE_EXTENSIONS,
  ARCHIVE_NORMALIZE_IDLE_MS,
  ARCHIVE_NORMALIZE_RECHECK_MS,
  ARCHIVE_SCAN_CONCURRENCY,
  AUDIO_TRANSCODE_CONCURRENCY,
  VIDEO_TRANSCODE_CONCURRENCY,
  AUDIO_EXTENSIONS,
  COLOR_PALETTE,
  CUE_EXTENSIONS,
  DIRECTORY_SCAN_CONCURRENCY,
  FFMPEG_BIN,
  FFPROBE_CONCURRENCY,
  FFPROBE_BIN,
  GLOBAL_CPU_TOKEN_LIMIT,
  GLOBAL_GPU_TOKEN_LIMIT,
  IMAGE_EXTENSIONS,
  IMAGE_EXTENSIONS_FOR_WEBP_CONVERT,
  LEGACY_IMPORTS_DIR_NAME,
  MEDIA_TOKEN_TTL_MS,
  SUBTITLE_EXTENSIONS,
  VIDEO_EXTENSIONS,
  ZIP_COMPRESSION_DEFLATE,
  ZIP_COMPRESSION_STORE,
  ZIP_GENERAL_PURPOSE_FLAG_ENCRYPTED,
} from "./services/file-system-read/fileSystemReadFacadeConfig";
import { ArchiveNormalizationService } from "./services/file-system-read/archiveNormalizationService";
import {
  type ArchiveLoadStatusListener,
  type LibraryChangedEventPayload,
  type LibraryChangedListener,
} from "./services/file-system-read/fileSystemReadFacadeEvents";
import { ImportTaskService } from "./services/file-system-read/importTaskService";
import { LibraryReadWriteService } from "./services/file-system-read/libraryReadWriteService";
import {
  LibrarySnapshotService,
  type SnapshotRefreshOptions,
} from "./services/file-system-read/librarySnapshotService";
import { ManagementMutationService } from "./services/file-system-read/managementMutationService";
import { ManageAdReviewService } from "./services/file-system-read/manageAdReviewService";
import { ManageCoverReviewService } from "./services/file-system-read/manageCoverReviewService";
import { MediaResourceService } from "./services/file-system-read/mediaResourceService";
import { RuntimeDependencyService } from "./services/file-system-read/runtimeDependencyService";
import { ArchivePathLockService } from "./services/file-system-read/archivePathLockService";
import { ExternalSourceWatcherManager } from "./services/file-system-read/externalSourceWatcherManager";
import {
  removeImportSourcePathsWithMusicSync,
  replaceImportSourcePathsWithMusicSync,
} from "./services/file-system-read/importSourceMaintenance";
import { ImageReadTaskQueueManager } from "./services/file-system-read/imageReadTaskQueueManager";
import { runStartupTempCleanup } from "./services/file-system-read/startupTempCleanupRunner";
import { disposeTaskProcessRunners } from "./services/task-orchestrator/processTaskOrchestrator";
import { SubtitleModelService } from "./services/file-system-read/subtitleModelService";
import { TaskResourceGovernor } from "./services/file-system-read/taskResourceGovernor";
import { ServiceEventBus } from "./services/file-system-read/serviceEventBus";
import {
  createArchiveNormalizationServiceOptions,
  createFacadeContext,
  createFacadeHandlers,
  createMediaResourceServiceOptions,
  resolveServiceRootPaths,
} from "./facade/fileSystemFacadeFactory";
import { FileSystemLibraryHandlers } from "./facade/FileSystemLibraryHandlers";
import { FileSystemManagementHandlers } from "./facade/FileSystemManagementHandlers";
import { FileSystemSystemHandlers } from "./facade/FileSystemSystemHandlers";
import type {
  FileSystemEventMap,
  FileSystemMediaReadServiceOptions,
} from "./facade/fileSystemMediaReadService.types";

export class FileSystemMediaReadService {
  private static readonly SYNC_PRUNE_ENTRY_THRESHOLD = 256;

  private static readonly EXTERNAL_SOURCE_PRUNE_DEBOUNCE_MS = 600;

  private static readonly WATCHER_REFRESH_MIN_INTERVAL_MS = 5_000;

  private static readonly INTERACTIVE_READ_HOT_WINDOW_MS = 2_500;

  private static readonly ARCHIVE_NORMALIZE_QUEUE_APP_STATE_KEY =
    "archive_normalize_queue_paths";

  private readonly rootDir: string;
  private readonly coverOutputRootDir: string;
  private readonly thumbnailCacheRootDir: string;
  private readonly normalizedArchiveRootDir: string;

  private readonly database: MediaLibraryDatabase;
  private readonly mediaTokenService: MediaTokenService;
  private readonly importPathRegistry: ImportPathRegistry;
  private readonly archiveNormalizationService: ArchiveNormalizationService;
  private readonly importTaskService: ImportTaskService;
  private readonly libraryReadWriteService: LibraryReadWriteService;
  private readonly librarySnapshotService: LibrarySnapshotService;
  private readonly managementMutationService: ManagementMutationService;
  private readonly manageAdReviewService: ManageAdReviewService;
  private readonly manageCoverReviewService: ManageCoverReviewService;
  private readonly mediaResourceService: MediaResourceService;
  private readonly runtimeDependencyService: RuntimeDependencyService;
  private readonly subtitleModelService: SubtitleModelService;
  private readonly taskResourceGovernor: TaskResourceGovernor;
  private readonly ownsTaskResourceGovernor: boolean;
  private readonly archivePathLockService: ArchivePathLockService;
  private readonly eventBus: ServiceEventBus<FileSystemEventMap>;

  private readonly libraryHandlers: FileSystemLibraryHandlers;
  private readonly managementHandlers: FileSystemManagementHandlers;
  private readonly systemHandlers: FileSystemSystemHandlers;

  private stateHydrated = false;

  private pruneMissingSnapshotPromise: Promise<void> | null = null;

  private pruneMissingSnapshotQueued = false;
  private managementMutationInFlightCount = 0;
  private startupCleanupPromise: Promise<void> | null = null;
  private lastInteractiveReadAtMs = 0;
  private watcherRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  private watcherRefreshScheduledAtMs: number | null = null;
  private watcherRefreshInFlight = false;
  private pendingWatcherRefresh = false;
  private lastWatcherRefreshAtMs = 0;
  private readLibrarySnapshotInFlight: Promise<LibrarySnapshotDto> | null =
    null;
  private readLibrarySnapshotLiteInFlight: Promise<LibrarySnapshotLiteDto> | null =
    null;
  private readonly readTaskQueueManager = new ImageReadTaskQueueManager<
    ReadImageSidebarTreeResponseDto,
    ReadImagePageResponseDto
  >({
    maxConcurrentSidebarReads: 1,
    maxConcurrentPageReads: 2,
  });
  private readonly externalSourceWatcherManager =
    new ExternalSourceWatcherManager({
      debounceMs: FileSystemMediaReadService.EXTERNAL_SOURCE_PRUNE_DEBOUNCE_MS,
      mediaExtensions: new Set([
        ...IMAGE_EXTENSIONS,
        ...VIDEO_EXTENSIONS,
        ...AUDIO_EXTENSIONS,
        ...ARCHIVE_EXTENSIONS,
        ...CUE_EXTENSIONS,
      ]),
      onDebouncedChange: () => this.runExternalSourceRefreshFromWatcher(),
    });
  private externalSourceWatcherEnabled = true;
  private disposed = false;

  constructor(optionsOrRootDir: FileSystemMediaReadServiceOptions | string) {
    const options =
      typeof optionsOrRootDir === "string"
        ? { rootDir: optionsOrRootDir }
        : optionsOrRootDir;
    const resolvedPaths = resolveServiceRootPaths(options);
    this.rootDir = resolvedPaths.rootDir;
    this.coverOutputRootDir = resolvedPaths.coverOutputRootDir;
    this.thumbnailCacheRootDir = resolvedPaths.thumbnailCacheRootDir;
    this.normalizedArchiveRootDir = resolvedPaths.normalizedArchiveRootDir;

    this.database = new MediaLibraryDatabase({
      rootDir: this.rootDir,
      databaseFilePath: options.databaseFilePath,
    });
    this.eventBus = new ServiceEventBus();

    if (options.onLibraryChanged) {
      this.eventBus.on("libraryChanged", options.onLibraryChanged);
    }

    this.mediaTokenService = new MediaTokenService(MEDIA_TOKEN_TTL_MS);
    this.importPathRegistry = new ImportPathRegistry();
    this.runtimeDependencyService = new RuntimeDependencyService(
      FFMPEG_BIN,
      FFPROBE_BIN,
    );
    this.subtitleModelService = new SubtitleModelService();
    this.ownsTaskResourceGovernor = !options.taskResourceGovernor;
    this.taskResourceGovernor =
      options.taskResourceGovernor ??
      new TaskResourceGovernor({
        cpuTokenLimit: GLOBAL_CPU_TOKEN_LIMIT,
        gpuTokenLimit: GLOBAL_GPU_TOKEN_LIMIT,
      });
    this.archivePathLockService = new ArchivePathLockService();

    this.archiveNormalizationService = new ArchiveNormalizationService(
      createArchiveNormalizationServiceOptions({
        idleMs: ARCHIVE_NORMALIZE_IDLE_MS,
        recheckMs: ARCHIVE_NORMALIZE_RECHECK_MS,
        isTargetEligible: (sourceArchivePath) =>
          this.isArchiveNormalizationTargetEligible(sourceArchivePath),
        hasRunningImportTasks: () =>
          this.importTaskService.hasRunningImportTasks(),
        isSnapshotLoading: () =>
          this.librarySnapshotService.isSnapshotLoading(),
        onArchiveNormalized: (sourcePath, outputPath) =>
          this.replaceImportedFileSourcePath(sourcePath, outputPath),
        emitLibraryChanged: (payload) => this.emitLibraryChanged(payload),
        emitArchiveLoadStatusChanged: (payload) =>
          this.eventBus.emit("archiveLoadStatusChanged", payload),
        withArchiveWriteLock: (archivePath, task) =>
          this.archivePathLockService.withWriteLock(archivePath, task),
        runWithCpuToken: (taskName, task) =>
          this.taskResourceGovernor.runWithCpuToken(taskName, task),
        readPersistedQueuePaths: () =>
          this.database.readAppState<string[]>(
            FileSystemMediaReadService.ARCHIVE_NORMALIZE_QUEUE_APP_STATE_KEY,
            [],
          ),
        writePersistedQueuePaths: (paths) =>
          this.database.writeAppState(
            FileSystemMediaReadService.ARCHIVE_NORMALIZE_QUEUE_APP_STATE_KEY,
            paths,
          ),
      }),
    );

    this.librarySnapshotService = new LibrarySnapshotService({
      rootDir: this.rootDir,
      normalizedArchiveRootDir: this.normalizedArchiveRootDir,
      legacyImportsDirName: LEGACY_IMPORTS_DIR_NAME,
      database: this.database,
      importPathRegistry: this.importPathRegistry,
      imageExtensions: IMAGE_EXTENSIONS,
      videoExtensions: VIDEO_EXTENSIONS,
      audioExtensions: AUDIO_EXTENSIONS,
      cueExtensions: CUE_EXTENSIONS,
      archiveExtensions: ARCHIVE_EXTENSIONS,
      colorPalette: COLOR_PALETTE,
      imageExtensionsForWebpConvert: IMAGE_EXTENSIONS_FOR_WEBP_CONVERT,
      directoryScanConcurrency: DIRECTORY_SCAN_CONCURRENCY,
      archiveScanConcurrency: ARCHIVE_SCAN_CONCURRENCY,
      ffprobeConcurrency: FFPROBE_CONCURRENCY,
      ffmpegBin: FFMPEG_BIN,
      ffprobeBin: FFPROBE_BIN,
      zipGeneralPurposeFlagEncrypted: ZIP_GENERAL_PURPOSE_FLAG_ENCRYPTED,
      zipCompressionStore: ZIP_COMPRESSION_STORE,
      zipCompressionDeflate: ZIP_COMPRESSION_DEFLATE,
      ensureRuntimeDependencies: () =>
        this.runtimeDependencyService.ensureRuntimeDependencies(),
      queueRar7zNormalization: (path, priority) =>
        this.queueRar7zNormalization(path, priority),
      getPackageGradeOverridesBySourceId: () =>
        this.database.readPackageGrades(),
      getVideoCoverOverridesByVideoId: () => this.database.readVideoCovers(),
      getVideoMetadataOverridesByVideoId: () =>
        this.database.readVideoMetadata(),
      getAudioMetadataOverridesByAudioId: () =>
        this.database.readAudioMetadata(),
      getMusicImportSources: () => this.database.readMusicImportSources(),
      upsertAudioMetadataFromScan: (audioId, payload) =>
        this.database.writeAudioMetadata(audioId, {
          album: payload.album,
          author: payload.author,
          trackTitle: payload.trackTitle,
          seriesId: payload.seriesId,
        }),
      withArchiveReadLock: (archivePath, task) =>
        this.archivePathLockService.withReadLock(archivePath, task),
      isInteractiveReadHot: () => this.isInteractiveReadHot(),
    });

    this.importTaskService = new ImportTaskService({
      rootDir: this.rootDir,
      legacyImportsDirName: LEGACY_IMPORTS_DIR_NAME,
      imageExtensions: IMAGE_EXTENSIONS,
      videoExtensions: VIDEO_EXTENSIONS,
      audioExtensions: AUDIO_EXTENSIONS,
      cueExtensions: CUE_EXTENSIONS,
      archiveExtensions: ARCHIVE_EXTENSIONS,
      database: this.database,
      invalidateSnapshotCache: () => this.invalidateSnapshotCache(),
      refreshSnapshot: (options) => this.refreshSnapshotFromFilesystem(options),
      emitLibraryChanged: (payload) => this.emitLibraryChanged(payload),
      handleImportStageKnownHashHits: async (sourcePaths) =>
        this.manageAdReviewService.handleImportStageKnownHashHits(sourcePaths),
    });

    this.libraryReadWriteService = new LibraryReadWriteService({
      database: this.database,
      ffmpegBin: FFMPEG_BIN,
      coverOutputRootDir: this.coverOutputRootDir,
      rootDir: this.rootDir,
      packageGradeOverridesBySourceId: this.database.readPackageGrades(),
      videoCoverOverridesByVideoId: this.database.readVideoCovers(),
      videoMetadataOverridesByVideoId: this.database.readVideoMetadata(),
      ensureSnapshotLoaded: () => this.ensureSnapshotLoaded(),
      ensureRuntimeDependencies: () =>
        this.runtimeDependencyService.ensureRuntimeDependencies(),
      markInteractiveRead: () => this.markInteractiveRead(),
      isRar7zPath: (filePath) => this.isRar7zPath(filePath),
      queueRar7zNormalization: (path, priority) =>
        this.queueRar7zNormalization(path, priority),
      emitLibraryChanged: (payload) => this.emitLibraryChanged(payload),
    });

    this.managementMutationService = new ManagementMutationService({
      rootDir: this.rootDir,
      thumbnailCacheRootDir: this.thumbnailCacheRootDir,
      database: this.database,
      importPathRegistry: this.importPathRegistry,
      ffmpegBin: FFMPEG_BIN,
      ensureRuntimeDependencies: () =>
        this.runtimeDependencyService.ensureRuntimeDependencies(),
      ensureStateLoaded: () => this.ensureStateLoaded(),
      ensureSnapshotLoaded: () => this.ensureSnapshotLoaded(),
      refreshSnapshotFromFilesystem: (options) =>
        this.refreshSnapshotFromFilesystem(options),
      syncSnapshotFromDatabase: () => this.syncSnapshotFromDatabase(),
      refreshArchiveIndexesForPaths: (paths) =>
        this.refreshArchiveIndexesForPaths(paths),
      pruneArchiveIndexesByDeletedRoots: (paths) =>
        this.pruneArchiveIndexesByDeletedRoots(paths),
      removeImportSourcePaths: (paths) => this.removeImportSourcePaths(paths),
      replaceImportSourcePaths: (mappings) =>
        this.replaceImportSourcePaths(mappings),
      buildMediaAccessContext: () => this.buildMediaAccessContext(),
      emitLibraryChanged: (payload) => this.emitLibraryChanged(payload),
      withArchiveWriteLock: (archivePath, task) =>
        this.archivePathLockService.withWriteLock(archivePath, task),
      audioTranscodeConcurrency: AUDIO_TRANSCODE_CONCURRENCY,
      videoTranscodeConcurrency: VIDEO_TRANSCODE_CONCURRENCY,
      runWithCpuToken: (taskName, task) =>
        this.taskResourceGovernor.runWithCpuToken(taskName, task),
    });

    this.manageAdReviewService = new ManageAdReviewService({
      database: this.database,
      ensureSnapshotLoaded: () => this.ensureSnapshotLoaded(),
      buildMediaAccessContext: () => this.buildMediaAccessContext(),
      getZipEntryIndexByPath: () =>
        this.librarySnapshotService.getZipEntryIndexByPath(),
      deleteImageItems: (request) => this.deleteImageItems(request),
      emitLibraryChanged: (payload) => this.emitLibraryChanged(payload),
    });

    this.manageCoverReviewService = new ManageCoverReviewService({
      database: this.database,
      ensureSnapshotLoaded: () => this.ensureSnapshotLoaded(),
      buildMediaAccessContext: () => this.buildMediaAccessContext(),
      getZipEntryIndexByPath: () =>
        this.librarySnapshotService.getZipEntryIndexByPath(),
      setImageHidden: (request) => this.setImageHidden(request),
    });

    this.mediaResourceService = new MediaResourceService(
      createMediaResourceServiceOptions({
        mediaProtocolScheme: MEDIA_PROTOCOL_SCHEME,
        thumbnailCacheRootDir: this.thumbnailCacheRootDir,
        archiveNormalizeRecheckMs: ARCHIVE_NORMALIZE_RECHECK_MS,
        mediaTokenService: this.mediaTokenService,
        ensureSnapshotLoaded: () => this.ensureSnapshotLoaded(),
        refreshArchiveIndexesForPaths: (paths) =>
          this.refreshArchiveIndexesForPaths(paths),
        buildMediaAccessContext: () => this.buildMediaAccessContext(),
        ensureRuntimeDependencies: () =>
          this.runtimeDependencyService.ensureRuntimeDependencies(),
        readImageBufferForThumbnail: (locator) =>
          this.librarySnapshotService.readImageBufferForThumbnail(locator),
        onThumbnailRenderingStart: (taskKey) => {
          this.archiveNormalizationService.onThumbnailRenderingStart(taskKey);
        },
        onThumbnailRenderingProgress: (taskKey, payload) => {
          this.archiveNormalizationService.onThumbnailRenderingProgress(
            taskKey,
            payload,
          );
        },
        onThumbnailRenderingEnd: (taskKey) => {
          this.archiveNormalizationService.onThumbnailRenderingEnd(taskKey);
        },
        runWithThumbnailCpuToken: (taskName, task) =>
          this.taskResourceGovernor.runWithCpuToken(taskName, task),
        withArchiveReadLock: (archivePath, task) =>
          this.archivePathLockService.withReadLock(archivePath, task),
        hasPendingArchiveNormalization: () =>
          this.archiveNormalizationService.hasPending(),
        scheduleArchiveNormalizationDrain: (delay) =>
          this.scheduleArchiveNormalizationDrain(delay),
        getZipEntryIndexByPath: () =>
          this.librarySnapshotService.getZipEntryIndexByPath(),
      }),
    );

    const context = createFacadeContext({
      rootDir: this.rootDir,
      coverOutputRootDir: this.coverOutputRootDir,
      thumbnailCacheRootDir: this.thumbnailCacheRootDir,
      normalizedArchiveRootDir: this.normalizedArchiveRootDir,
      database: this.database,
      mediaTokenService: this.mediaTokenService,
      importPathRegistry: this.importPathRegistry,
      archiveNormalizationService: this.archiveNormalizationService,
      importTaskService: this.importTaskService,
      libraryReadWriteService: this.libraryReadWriteService,
      librarySnapshotService: this.librarySnapshotService,
      managementMutationService: this.managementMutationService,
      manageAdReviewService: this.manageAdReviewService,
      manageCoverReviewService: this.manageCoverReviewService,
      mediaResourceService: this.mediaResourceService,
      runtimeDependencyService: this.runtimeDependencyService,
      subtitleModelService: this.subtitleModelService,
      eventBus: this.eventBus,
      ensureStateLoaded: () => this.ensureStateLoaded(),
      ensureSnapshotLoaded: () => this.ensureSnapshotLoaded(),
      invalidateCache: () => this.invalidateCache(),
      emitLibraryChanged: (payload) => this.emitLibraryChanged(payload),
      markInteractiveRead: () => this.markInteractiveRead(),
      clearDatabase: () => this.clearDatabase(),
      requestExternalSourceFolderRefresh: (pathKey: string) =>
        this.requestExternalSourceFolderRefresh(pathKey),
      setExternalSourceWatcherEnabled: (enabled: boolean) =>
        this.setExternalSourceWatcherEnabled(enabled),
    });
    const handlers = createFacadeHandlers(context);
    this.libraryHandlers = handlers.libraryHandlers;
    this.managementHandlers = handlers.managementHandlers;
    this.systemHandlers = handlers.systemHandlers;
    void this.scheduleStartupTempCleanup();
  }

  overrideAudioTranscodeRuntimeBins(options: {
    ffmpegBinPath: string;
    ffprobeBinPath: string;
  }): void {
    this.managementMutationService.overrideAudioTranscodeFfmpegBinPath(
      options.ffmpegBinPath,
    );
    this.runtimeDependencyService.overrideBinaryPaths(
      options.ffmpegBinPath,
      options.ffprobeBinPath,
    );
  }

  onLibraryChanged(listener: LibraryChangedListener): () => void {
    return this.eventBus.on("libraryChanged", listener);
  }
  onArchiveLoadStatusChanged(listener: ArchiveLoadStatusListener): () => void {
    return this.eventBus.on("archiveLoadStatusChanged", listener);
  }
  private emitLibraryChanged(
    payload:
      | LibraryChangedEventPayload
      | { reason: string; updated_at_ms: number },
  ): void {
    this.eventBus.emit("libraryChanged", payload as LibraryChangedEventPayload);
    if (
      payload.reason !== "import-task-updated" &&
      payload.reason !== "thumbnail-rendering-progress"
    ) {
      this.scheduleArchiveNormalizationDrain(ARCHIVE_NORMALIZE_IDLE_MS);
    }
  }
  private markInteractiveRead(): void {
    this.lastInteractiveReadAtMs = Date.now();
    this.archiveNormalizationService.onInteractiveRead();
    this.scheduleArchiveNormalizationDrain(ARCHIVE_NORMALIZE_IDLE_MS);
  }
  private isInteractiveReadHot(): boolean {
    return (
      Date.now() - this.lastInteractiveReadAtMs <
      FileSystemMediaReadService.INTERACTIVE_READ_HOT_WINDOW_MS
    );
  }
  private isRar7zPath(targetPath: string): boolean {
    const ext = path.extname(targetPath).toLowerCase();
    return ext === ".rar" || ext === ".7z";
  }
  private isArchiveNormalizationTargetEligible(
    sourceArchivePath: string,
  ): boolean {
    if (!this.isRar7zPath(sourceArchivePath)) {
      return false;
    }
    return isPathAllowlisted(sourceArchivePath, this.buildMediaAccessContext());
  }
  private buildMediaAccessContext(): MediaAccessGuardContext {
    return {
      rootDir: this.rootDir,
      importDirectoryRoots: this.importPathRegistry.getImportDirectoryRoots(),
      importFileAllowlistKeys:
        this.importPathRegistry.getImportFileAllowlistKeys(),
      archiveEntryIndexByPath:
        this.librarySnapshotService.getArchiveEntryIndexByPath(),
      imageExtensions: IMAGE_EXTENSIONS,
      videoExtensions: VIDEO_EXTENSIONS,
      audioExtensions: AUDIO_EXTENSIONS,
      subtitleExtensions: SUBTITLE_EXTENSIONS,
    };
  }
  private queueRar7zNormalization(
    sourceArchivePath: string,
    priority: "low" | "high" = "low",
  ): void {
    if (!this.isRar7zPath(sourceArchivePath)) {
      return;
    }
    if (!isPathAllowlisted(sourceArchivePath, this.buildMediaAccessContext())) {
      return;
    }
    this.archiveNormalizationService.queueRar7zNormalization(
      sourceArchivePath,
      priority,
    );
  }

  private scheduleArchiveNormalizationDrain(delayMs = 0): void {
    this.archiveNormalizationService.scheduleDrain(delayMs);
  }

  private hasManagementMutationInFlight(): boolean {
    return this.managementMutationInFlightCount > 0;
  }

  private async withManagementMutationGuard<T>(
    task: () => Promise<T>,
  ): Promise<T> {
    this.managementMutationInFlightCount += 1;
    try {
      return await task();
    } finally {
      this.managementMutationInFlightCount = Math.max(
        0,
        this.managementMutationInFlightCount - 1,
      );
      if (
        this.managementMutationInFlightCount === 0 &&
        this.pruneMissingSnapshotQueued &&
        !this.pruneMissingSnapshotPromise &&
        !this.disposed
      ) {
        this.schedulePruneMissingSnapshotEntries();
      }
    }
  }

  invalidateCache(): void {
    this.librarySnapshotService.invalidateCache();
    this.stateHydrated = false;
    this.mediaTokenService.cleanupExpiredTokens();
  }

  invalidateSnapshotCache(): void {
    this.librarySnapshotService.invalidateCache();
    const importSources = this.database.readImportSources();
    this.importPathRegistry.hydrate(importSources);
    this.refreshExternalSourceWatchers();
    this.mediaTokenService.cleanupExpiredTokens();
  }

  private clearQueuedReadTasks(reason: string): void {
    this.readTaskQueueManager.clearAll(reason);
  }

  dispose(): void {
    this.disposed = true;
    this.clearWatcherRefreshTimer();
    this.stopExternalSourceWatchers();
    this.readLibrarySnapshotInFlight = null;
    this.readLibrarySnapshotLiteInFlight = null;
    this.clearQueuedReadTasks("read queue cleared: service disposed");
    void disposeTaskProcessRunners().catch(() => undefined);
    if (this.ownsTaskResourceGovernor) {
      this.taskResourceGovernor.dispose();
    }
    this.archiveNormalizationService.dispose();
    this.eventBus.clear();
    this.database.dispose();
  }

  private async ensureStateLoaded(): Promise<void> {
    if (this.stateHydrated) {
      return;
    }
    this.importTaskService.recoverInterruptedImportTasks();
    this.importPathRegistry.hydrate(this.database.readImportSources());
    this.refreshExternalSourceWatchers();
    this.archiveNormalizationService.recoverPersistedQueue();
    this.stateHydrated = true;
  }

  private async scheduleStartupTempCleanup(): Promise<void> {
    if (this.startupCleanupPromise) {
      await this.startupCleanupPromise;
      return;
    }

    this.startupCleanupPromise = Promise.resolve()
      .then(async () => {
        const snapshot = this.database.readSnapshot();
        const importSources = this.database.readImportSources();

        await runStartupTempCleanup({
          thumbnailCacheRootDir: this.thumbnailCacheRootDir,
          normalizedArchiveRootDir: this.normalizedArchiveRootDir,
          snapshot,
          importSources,
          isRar7zPath: (filePath) => this.isRar7zPath(filePath),
          withArchiveWriteLock: (archivePath, task) =>
            this.archivePathLockService.withWriteLock(archivePath, task),
        });
      })
      .catch((error) => {
        console.warn("startup temp cleanup failed", {
          reason:
            error instanceof Error && error.message
              ? error.message
              : String(error),
        });
      })
      .finally(() => {
        this.startupCleanupPromise = null;
      });

    await this.startupCleanupPromise;
  }

  private async replaceImportedFileSourcePath(
    sourceArchivePath: string,
    outputZipPath: string,
  ): Promise<void> {
    await this.ensureStateLoaded();
    const didReplace = this.importPathRegistry.replaceImportedFileSourcePath(
      sourceArchivePath,
      outputZipPath,
    );
    if (didReplace) {
      const nextSources = this.importPathRegistry.getImportSources();
      this.database.writeImportSources({
        directories: nextSources.directories,
        files: nextSources.files,
      });
      this.refreshExternalSourceWatchers();
    }
  }

  private async removeImportSourcePaths(
    pathsToRemove: string[],
  ): Promise<void> {
    await removeImportSourcePathsWithMusicSync({
      pathsToRemove,
      ensureStateLoaded: () => this.ensureStateLoaded(),
      importPathRegistry: this.importPathRegistry,
      database: this.database,
    });
    this.refreshExternalSourceWatchers();
  }

  private async replaceImportSourcePaths(
    mappings: Array<{ fromPath: string; toPath: string }>,
  ): Promise<void> {
    await replaceImportSourcePathsWithMusicSync({
      mappings,
      ensureStateLoaded: () => this.ensureStateLoaded(),
      importPathRegistry: this.importPathRegistry,
      database: this.database,
    });
    this.refreshExternalSourceWatchers();
  }

  private runExternalSourceRefreshFromWatcher(): void {
    if (
      this.disposed ||
      this.importTaskService.hasRunningImportTasks() ||
      this.hasManagementMutationInFlight()
    ) {
      return;
    }

    this.pendingWatcherRefresh = true;
    this.schedulePendingWatcherRefresh(0);
  }

  private clearWatcherRefreshTimer(): void {
    if (this.watcherRefreshTimer !== null) {
      clearTimeout(this.watcherRefreshTimer);
      this.watcherRefreshTimer = null;
    }
    this.watcherRefreshScheduledAtMs = null;
  }

  private schedulePendingWatcherRefresh(delayMs: number): void {
    if (
      this.disposed ||
      this.watcherRefreshInFlight ||
      !this.pendingWatcherRefresh
    ) {
      return;
    }

    const now = Date.now();
    const throttleDelay = Math.max(
      0,
      this.lastWatcherRefreshAtMs +
        FileSystemMediaReadService.WATCHER_REFRESH_MIN_INTERVAL_MS -
        now,
    );
    const effectiveDelay = Math.max(delayMs, throttleDelay);
    const scheduledAtMs = now + effectiveDelay;

    if (
      this.watcherRefreshTimer !== null &&
      this.watcherRefreshScheduledAtMs !== null &&
      this.watcherRefreshScheduledAtMs <= scheduledAtMs
    ) {
      return;
    }

    this.clearWatcherRefreshTimer();
    this.watcherRefreshScheduledAtMs = scheduledAtMs;
    this.watcherRefreshTimer = setTimeout(() => {
      this.watcherRefreshTimer = null;
      this.watcherRefreshScheduledAtMs = null;
      void this.flushPendingWatcherRefresh();
    }, effectiveDelay);
  }

  private async flushPendingWatcherRefresh(): Promise<void> {
    if (
      this.disposed ||
      this.watcherRefreshInFlight ||
      !this.pendingWatcherRefresh ||
      this.importTaskService.hasRunningImportTasks() ||
      this.hasManagementMutationInFlight()
    ) {
      return;
    }

    this.pendingWatcherRefresh = false;
    this.watcherRefreshInFlight = true;
    this.lastWatcherRefreshAtMs = Date.now();

    const previousSnapshot = this.librarySnapshotService.peekSnapshotCache();
    const previousSnapshotKey = previousSnapshot
      ? this.buildExternalWatcherSnapshotKey(previousSnapshot)
      : null;

    try {
      const nextSnapshot = await this.refreshSnapshotFromFilesystem({
        reason: "watcher-external-source-change",
      });
      if (this.disposed) {
        return;
      }

      if (previousSnapshotKey !== null) {
        const nextSnapshotKey =
          this.buildExternalWatcherSnapshotKey(nextSnapshot);
        if (nextSnapshotKey === previousSnapshotKey) {
          return;
        }
      }

      this.emitLibraryChanged({
        reason: "auto-prune-missing-sources",
        updated_at_ms: Date.now(),
      });
    } catch (error) {
      if (this.disposed) {
        return;
      }
      console.warn("external source watcher refresh failed", {
        reason:
          error instanceof Error && error.message
            ? error.message
            : String(error),
      });
    } finally {
      this.watcherRefreshInFlight = false;
      if (this.pendingWatcherRefresh) {
        this.schedulePendingWatcherRefresh(0);
      }
    }
  }

  private refreshExternalSourceWatchers(): void {
    if (this.disposed) {
      return;
    }
    if (!this.externalSourceWatcherEnabled) {
      // 开关关闭时确保任何残留 watcher 句柄被释放，下次开启时再挂载
      this.externalSourceWatcherManager.stop();
      return;
    }
    this.externalSourceWatcherManager.refresh({
      importDirectoryRoots: this.importPathRegistry.getImportDirectoryRoots(),
      importFilePaths: this.importPathRegistry.getImportFilePaths(),
    });
  }

  private stopExternalSourceWatchers(): void {
    this.externalSourceWatcherManager.stop();
  }

  setExternalSourceWatcherEnabled(enabled: boolean): {
    enabled: boolean;
    updated_at_ms: number;
  } {
    if (this.disposed) {
      return {
        enabled: this.externalSourceWatcherEnabled,
        updated_at_ms: Date.now(),
      };
    }
    const nextEnabled = Boolean(enabled);
    if (nextEnabled === this.externalSourceWatcherEnabled) {
      return {
        enabled: nextEnabled,
        updated_at_ms: Date.now(),
      };
    }
    this.externalSourceWatcherEnabled = nextEnabled;
    if (nextEnabled) {
      this.refreshExternalSourceWatchers();
    } else {
      this.externalSourceWatcherManager.stop();
    }
    return {
      enabled: nextEnabled,
      updated_at_ms: Date.now(),
    };
  }

  async requestExternalSourceFolderRefresh(pathKey: string): Promise<{
    matched_directory_root: string | null;
    pruned_source_count: number;
    pruned_video_count: number;
    pruned_audio_count: number;
    removed_import_source_count: number;
    updated_at_ms: number;
  }> {
    if (this.disposed) {
      return {
        matched_directory_root: null,
        pruned_source_count: 0,
        pruned_video_count: 0,
        pruned_audio_count: 0,
        removed_import_source_count: 0,
        updated_at_ms: Date.now(),
      };
    }
    await this.ensureStateLoaded();

    const normalizedKey = normalizeAllowlistKey(pathKey);
    const importDirectoryRoots =
      this.importPathRegistry.getImportDirectoryRoots();
    const matchedRoot = importDirectoryRoots.find(
      (root) => normalizeAllowlistKey(root) === normalizedKey,
    );
    if (!matchedRoot) {
      return {
        matched_directory_root: null,
        pruned_source_count: 0,
        pruned_video_count: 0,
        pruned_audio_count: 0,
        removed_import_source_count: 0,
        updated_at_ms: Date.now(),
      };
    }

    const pathFilter = (absolutePath: string): boolean =>
      isPathInsideRoot(matchedRoot, absolutePath);

    const previousSnapshot = this.librarySnapshotService.peekSnapshotCache();
    const filteredSnapshot: LibrarySnapshotDto = previousSnapshot
      ? {
          ...previousSnapshot,
          image_packages: previousSnapshot.image_packages.filter((source) =>
            pathFilter(source.absolute_path),
          ),
          image_directories: previousSnapshot.image_directories.filter(
            (source) => pathFilter(source.absolute_path),
          ),
          videos: previousSnapshot.videos.filter((video) =>
            pathFilter(video.absolute_path),
          ),
          audios: (previousSnapshot.audios ?? []).filter((audio) =>
            pathFilter(audio.absolute_path),
          ),
        }
      : {
          image_packages: [],
          image_directories: [],
          videos: [],
          audios: [],
        };

    const before = this.countSnapshotEntries(filteredSnapshot);
    let pruned: LibrarySnapshotDto;
    try {
      pruned = await this.pruneMissingSnapshotEntries(filteredSnapshot, {
        pathFilter,
      });
    } catch (error) {
      console.warn("manual folder refresh failed", {
        reason:
          error instanceof Error && error.message
            ? error.message
            : String(error),
      });
      return {
        matched_directory_root: matchedRoot,
        pruned_source_count: 0,
        pruned_video_count: 0,
        pruned_audio_count: 0,
        removed_import_source_count: 0,
        updated_at_ms: Date.now(),
      };
    }

    const after = this.countSnapshotEntries(pruned);
    const removedImportSourceCount =
      await this.pruneImportSourcesForDirectoryRoot(matchedRoot);
    const updatedAtMs = Date.now();
    if (before !== after || removedImportSourceCount > 0) {
      this.emitLibraryChanged({
        reason: "manual-folder-refresh",
        updated_at_ms: updatedAtMs,
      });
    }
    return {
      matched_directory_root: matchedRoot,
      pruned_source_count: before.images - after.images,
      pruned_video_count: before.videos - after.videos,
      pruned_audio_count: before.audios - after.audios,
      removed_import_source_count: removedImportSourceCount,
      updated_at_ms: updatedAtMs,
    };
  }

  private countSnapshotEntries(snapshot: LibrarySnapshotDto): {
    images: number;
    videos: number;
    audios: number;
  } {
    return {
      images:
        snapshot.image_packages.length + snapshot.image_directories.length,
      videos: snapshot.videos.length,
      audios: (snapshot.audios ?? []).length,
    };
  }

  private async pruneImportSourcesForDirectoryRoot(
    directoryRoot: string,
  ): Promise<number> {
    const resolvedRoot = path.resolve(directoryRoot);
    const importDirectoryRoots =
      this.importPathRegistry.getImportDirectoryRoots();
    const importFilePaths = this.importPathRegistry.getImportFilePaths();
    const matchedRootKey = normalizeAllowlistKey(resolvedRoot);
    const nextDirectoryRoots = importDirectoryRoots.filter(
      (value) => normalizeAllowlistKey(value) !== matchedRootKey,
    );
    const nextFilePaths = importFilePaths.filter(
      (value) => !isPathInsideRoot(resolvedRoot, value),
    );
    if (
      nextDirectoryRoots.length === importDirectoryRoots.length &&
      nextFilePaths.length === importFilePaths.length
    ) {
      return 0;
    }
    this.importPathRegistry.hydrate({
      directories: nextDirectoryRoots,
      files: nextFilePaths,
    });
    this.database.writeImportSources({
      directories: nextDirectoryRoots,
      files: nextFilePaths,
    });
    this.refreshExternalSourceWatchers();
    return (
      importDirectoryRoots.length -
      nextDirectoryRoots.length +
      (importFilePaths.length - nextFilePaths.length)
    );
  }

  private syncSnapshotFromDatabase(): LibrarySnapshotDto {
    return this.librarySnapshotService.syncSnapshotFromDatabase();
  }

  private async refreshArchiveIndexesForPaths(
    archivePaths: Iterable<string>,
  ): Promise<void> {
    await this.librarySnapshotService.refreshArchiveIndexesForPaths(
      archivePaths,
    );
  }

  private pruneArchiveIndexesByDeletedRoots(
    deletedPaths: Iterable<string>,
  ): void {
    this.librarySnapshotService.pruneArchiveIndexesByDeletedRoots(
      deletedPaths,
      (archivePath) =>
        this.archiveNormalizationService.deleteStateByPath(archivePath),
    );
  }

  private async ensureSnapshotLoaded(): Promise<LibrarySnapshotDto> {
    const snapshot = await this.librarySnapshotService.ensureSnapshotLoaded(
      () => this.ensureStateLoaded(),
    );
    if (this.shouldPruneSynchronously(snapshot)) {
      return this.pruneMissingSnapshotEntries(snapshot);
    }
    this.schedulePruneMissingSnapshotEntries();
    return snapshot;
  }

  private async refreshSnapshotFromFilesystem(
    options?: SnapshotRefreshOptions,
  ): Promise<LibrarySnapshotDto> {
    const snapshot = await this.librarySnapshotService.refreshSnapshot(
      () => this.ensureStateLoaded(),
      options,
    );
    if (this.shouldPruneSynchronously(snapshot)) {
      return this.pruneMissingSnapshotEntries(snapshot);
    }
    this.schedulePruneMissingSnapshotEntries();
    return snapshot;
  }

  private shouldPruneSynchronously(snapshot: LibrarySnapshotDto): boolean {
    const totalEntries =
      snapshot.image_packages.length +
      snapshot.image_directories.length +
      snapshot.videos.length +
      (snapshot.audios?.length ?? 0);
    return (
      totalEntries <= FileSystemMediaReadService.SYNC_PRUNE_ENTRY_THRESHOLD
    );
  }

  private async pathExists(targetPath: string): Promise<boolean> {
    const stat = await fs.stat(targetPath).catch(() => null);
    return Boolean(stat);
  }

  private static parseCueVirtualPath(value: string): {
    cuePath: string | null;
    sourcePath: string | null;
  } | null {
    if (!value.startsWith("cue://")) {
      return null;
    }

    const decodeSafely = (rawValue: string | null): string | null => {
      if (!rawValue || rawValue.trim().length === 0) {
        return null;
      }
      try {
        return decodeURIComponent(rawValue);
      } catch {
        return rawValue;
      }
    };

    try {
      const parsed = new URL(value);
      const encodedCuePath = `${parsed.host}${parsed.pathname ?? ""}`.replace(
        /^\/+/,
        "",
      );
      const cuePath = decodeSafely(encodedCuePath);
      const sourcePath = parsed.searchParams.get("src");
      return {
        cuePath,
        sourcePath:
          sourcePath && sourcePath.trim().length > 0 ? sourcePath : null,
      };
    } catch {
      const matched = /^cue:\/\/([^?]+)(?:\?(.*))?$/i.exec(value);
      if (!matched) {
        return null;
      }
      const cuePath = decodeSafely(matched[1] ?? null);
      const searchParams = new URLSearchParams(matched[2] ?? "");
      const sourcePath = searchParams.get("src");
      return {
        cuePath,
        sourcePath:
          sourcePath && sourcePath.trim().length > 0 ? sourcePath : null,
      };
    }
  }

  private resolveAudioExistencePaths(audio: AudioItemDto): {
    checkPaths: string[];
    importCleanupPaths: string[];
  } {
    const checkPathSet = new Set<string>();
    const importCleanupPathSet = new Set<string>();
    const pushPath = (targetPath: string | null | undefined) => {
      if (!targetPath || targetPath.trim().length === 0) {
        return;
      }
      if (/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(targetPath)) {
        return;
      }
      const resolved = path.resolve(targetPath);
      checkPathSet.add(resolved);
      importCleanupPathSet.add(resolved);
    };

    if (audio.media_locator.kind === "filesystem") {
      pushPath(audio.media_locator.absolute_path);
    }

    const cueVirtual = FileSystemMediaReadService.parseCueVirtualPath(
      audio.absolute_path,
    );
    if (cueVirtual) {
      pushPath(cueVirtual.cuePath);
      pushPath(cueVirtual.sourcePath);
    }

    if (checkPathSet.size === 0) {
      pushPath(audio.absolute_path);
    }

    return {
      checkPaths: Array.from(checkPathSet),
      importCleanupPaths: Array.from(importCleanupPathSet),
    };
  }

  private buildExternalWatcherSnapshotKey(
    snapshot: LibrarySnapshotDto,
  ): string {
    const tokens: string[] = [];
    for (const source of snapshot.image_packages) {
      tokens.push(`pkg:${source.absolute_path}`);
    }
    for (const source of snapshot.image_directories) {
      tokens.push(`dir:${source.absolute_path}`);
    }
    for (const video of snapshot.videos) {
      tokens.push(`video:${video.absolute_path}`);
    }
    for (const audio of snapshot.audios ?? []) {
      tokens.push(`audio:${audio.absolute_path}`);
    }
    tokens.sort();
    return tokens.join("\n");
  }

  private async pruneMissingSnapshotEntries(
    snapshot: LibrarySnapshotDto,
    options?: { pathFilter?: (absolutePath: string) => boolean },
  ): Promise<LibrarySnapshotDto> {
    if (this.hasManagementMutationInFlight()) {
      this.pruneMissingSnapshotQueued = true;
      return snapshot;
    }

    const pathFilter = options?.pathFilter;
    const passesFilter = (absolutePath: string): boolean => {
      if (!pathFilter) {
        return true;
      }
      try {
        return pathFilter(absolutePath);
      } catch {
        return true;
      }
    };

    const missingPaths = new Set<string>();
    const missingFilesystemPaths = new Set<string>();
    const imageSources = [
      ...snapshot.image_packages,
      ...snapshot.image_directories,
    ];

    for (const source of imageSources) {
      if (!passesFilter(source.absolute_path)) {
        continue;
      }
      if (!(await this.pathExists(source.absolute_path))) {
        missingPaths.add(source.absolute_path);
        missingFilesystemPaths.add(path.resolve(source.absolute_path));
      }
    }
    for (const video of snapshot.videos) {
      if (!passesFilter(video.absolute_path)) {
        continue;
      }
      if (!(await this.pathExists(video.absolute_path))) {
        missingPaths.add(video.absolute_path);
        missingFilesystemPaths.add(path.resolve(video.absolute_path));
      }
    }
    const missingSnapshotPaths = new Set<string>();
    for (const audio of snapshot.audios ?? []) {
      if (!passesFilter(audio.absolute_path)) {
        continue;
      }
      const resolvedPaths = this.resolveAudioExistencePaths(audio);
      const missingCheckPaths: string[] = [];
      for (const targetPath of resolvedPaths.checkPaths) {
        if (await this.pathExists(targetPath)) {
          continue;
        }
        missingCheckPaths.push(targetPath);
      }

      if (missingCheckPaths.length === 0) {
        continue;
      }

      missingSnapshotPaths.add(audio.absolute_path);
      for (const fileSystemPath of resolvedPaths.importCleanupPaths) {
        if (!missingCheckPaths.includes(fileSystemPath)) {
          continue;
        }
        missingFilesystemPaths.add(fileSystemPath);
      }
    }

    for (const missingAudioSnapshotPath of missingSnapshotPaths) {
      missingPaths.add(missingAudioSnapshotPath);
    }

    if (missingPaths.size === 0) {
      return snapshot;
    }

    if (this.hasManagementMutationInFlight()) {
      this.pruneMissingSnapshotQueued = true;
      return snapshot;
    }

    const snapshotPathsToPrune = Array.from(missingPaths);
    const fileSystemPathsToPrune = Array.from(missingFilesystemPaths);
    const deleted =
      this.database.deleteSnapshotEntriesByPaths(snapshotPathsToPrune);
    if (
      deleted.deletedSourceCount === 0 &&
      deleted.deletedVideoCount === 0 &&
      deleted.deletedAudioCount === 0
    ) {
      return snapshot;
    }

    if (fileSystemPathsToPrune.length > 0) {
      this.pruneArchiveIndexesByDeletedRoots(fileSystemPathsToPrune);
      await this.removeImportSourcePaths(fileSystemPathsToPrune);
    }
    const nextSnapshot = this.syncSnapshotFromDatabase();

    this.emitLibraryChanged({
      reason: "auto-prune-missing-sources",
      updated_at_ms: Date.now(),
    });

    return nextSnapshot;
  }

  private schedulePruneMissingSnapshotEntries(): void {
    if (this.disposed) {
      return;
    }

    if (this.hasManagementMutationInFlight()) {
      this.pruneMissingSnapshotQueued = true;
      return;
    }

    if (this.pruneMissingSnapshotPromise) {
      this.pruneMissingSnapshotQueued = true;
      return;
    }

    this.pruneMissingSnapshotPromise = Promise.resolve()
      .then(async () => {
        const snapshot =
          this.librarySnapshotService.peekSnapshotCache() ??
          this.syncSnapshotFromDatabase();
        await this.pruneMissingSnapshotEntries(snapshot);
      })
      .catch((error) => {
        if (this.disposed) {
          return;
        }
        console.warn("auto prune missing snapshot entries failed", {
          reason:
            error instanceof Error && error.message
              ? error.message
              : String(error),
        });
      })
      .finally(() => {
        if (this.disposed) {
          this.pruneMissingSnapshotPromise = null;
          this.pruneMissingSnapshotQueued = false;
          return;
        }
        this.pruneMissingSnapshotPromise = null;
        if (this.pruneMissingSnapshotQueued) {
          this.pruneMissingSnapshotQueued = false;
          this.schedulePruneMissingSnapshotEntries();
        }
      });
  }

  async clearDatabase(): Promise<ClearDatabaseResponseDto> {
    this.database.clearDatabase();
    await Promise.all([
      fs.rm(path.join(this.rootDir, LEGACY_IMPORTS_DIR_NAME), {
        recursive: true,
        force: true,
      }),
      fs.rm(this.coverOutputRootDir, { recursive: true, force: true }),
      fs.rm(this.thumbnailCacheRootDir, { recursive: true, force: true }),
      fs.rm(this.normalizedArchiveRootDir, { recursive: true, force: true }),
    ]);

    this.importPathRegistry.clear();
    this.stopExternalSourceWatchers();
    this.archiveNormalizationService.clear();
    this.mediaTokenService.clearActiveTokens();
    this.importTaskService.clearRuntimeState();
    this.librarySnapshotService.clearRuntimeState();
    this.readLibrarySnapshotInFlight = null;
    this.readLibrarySnapshotLiteInFlight = null;
    this.clearQueuedReadTasks("read queue cleared: database cleared");
    this.invalidateCache();

    this.emitLibraryChanged({
      reason: "clear-database",
      updated_at_ms: Date.now(),
    });

    return {
      cleared: true,
      cleared_at_ms: Date.now(),
    };
  }

  // Delegate handlers
  async readLibrarySnapshot(): Promise<LibrarySnapshotDto> {
    if (this.readLibrarySnapshotInFlight) {
      return this.readLibrarySnapshotInFlight;
    }

    const readTask = this.libraryHandlers.readLibrarySnapshot().finally(() => {
      if (this.readLibrarySnapshotInFlight === readTask) {
        this.readLibrarySnapshotInFlight = null;
      }
    });
    this.readLibrarySnapshotInFlight = readTask;
    return readTask;
  }

  async readLibrarySnapshotLite(): Promise<LibrarySnapshotLiteDto> {
    if (this.readLibrarySnapshotLiteInFlight) {
      return this.readLibrarySnapshotLiteInFlight;
    }

    const readTask = this.libraryHandlers
      .readLibrarySnapshotLite()
      .finally(() => {
        if (this.readLibrarySnapshotLiteInFlight === readTask) {
          this.readLibrarySnapshotLiteInFlight = null;
        }
      });
    this.readLibrarySnapshotLiteInFlight = readTask;
    return readTask;
  }

  async readImageSidebarTree(
    request: ReadImageSidebarTreeRequestDto,
  ): Promise<ReadImageSidebarTreeResponseDto> {
    const requestKey = JSON.stringify(request);
    const startTask = (signal: AbortSignal) =>
      this.libraryHandlers.readImageSidebarTree(request, signal);
    return this.readTaskQueueManager.enqueueSidebarRead(requestKey, startTask);
  }

  async readImagePage(
    request: ReadImagePageRequestDto,
  ): Promise<ReadImagePageResponseDto> {
    const requestKey = JSON.stringify(request);
    const startTask = (signal: AbortSignal) =>
      this.libraryHandlers.readImagePage(request, signal);
    return this.readTaskQueueManager.enqueuePageRead(requestKey, startTask);
  }

  async readImageMetadata(
    request: ReadImageMetadataRequestDto,
  ): Promise<ReadImageMetadataResponseDto> {
    return this.libraryHandlers.readImageMetadata(request);
  }

  async readSourceImages(
    request: ReadSourceImagesRequestDto,
  ): Promise<ReadSourceImagesResponseDto> {
    return this.libraryHandlers.readSourceImages(request);
  }

  async writePackageGrade(
    request: WritePackageGradeRequestDto,
  ): Promise<WritePackageGradeResponseDto> {
    return this.libraryHandlers.writePackageGrade(request);
  }
  async setImageHidden(
    request: SetImageHiddenRequestDto,
  ): Promise<SetImageHiddenResponseDto> {
    return this.withManagementMutationGuard(() =>
      this.managementHandlers.setImageHidden(request),
    );
  }
  async deleteImageItems(
    request: DeleteImageItemsRequestDto,
  ): Promise<DeleteImageItemsResponseDto> {
    return this.withManagementMutationGuard(() =>
      this.managementHandlers.deleteImageItems(request),
    );
  }
  async deleteSidebarNodes(
    request: DeleteSidebarNodesRequestDto,
  ): Promise<DeleteSidebarNodesResponseDto> {
    return this.withManagementMutationGuard(() =>
      this.managementHandlers.deleteSidebarNodes(request),
    );
  }
  async moveSidebarNodes(
    request: MoveSidebarNodesRequestDto,
  ): Promise<MoveSidebarNodesResponseDto> {
    return this.withManagementMutationGuard(() =>
      this.managementHandlers.moveSidebarNodes(request),
    );
  }
  async renameSidebarNode(
    request: RenameSidebarNodeRequestDto,
  ): Promise<RenameSidebarNodeResponseDto> {
    return this.withManagementMutationGuard(() =>
      this.managementHandlers.renameSidebarNode(request),
    );
  }
  async renameSidebarNodes(
    request: RenameSidebarNodesRequestDto,
  ): Promise<RenameSidebarNodesResponseDto> {
    return this.withManagementMutationGuard(() =>
      this.managementHandlers.renameSidebarNodes(request),
    );
  }
  async renameItems(
    request: RenameItemsRequestDto,
  ): Promise<RenameItemsResponseDto> {
    return this.withManagementMutationGuard(() =>
      this.managementHandlers.renameItems(request),
    );
  }
  async startManageAdReview(
    request: StartManageAdReviewRequestDto,
  ): Promise<StartManageAdReviewResponseDto> {
    return this.managementHandlers.startManageAdReview(request);
  }
  async readManageAdReviewTask(
    request: ReadManageAdReviewTaskRequestDto,
  ): Promise<ReadManageAdReviewTaskResponseDto> {
    return this.managementHandlers.readManageAdReviewTask(request);
  }
  async pauseManageAdReviewTask(
    request: PauseManageAdReviewTaskRequestDto,
  ): Promise<PauseManageAdReviewTaskResponseDto> {
    return this.managementHandlers.pauseManageAdReviewTask(request);
  }
  async testAdReviewVisionModel(
    request: TestAdReviewVisionModelRequestDto,
  ): Promise<TestAdReviewVisionModelResponseDto> {
    return this.managementHandlers.testAdReviewVisionModel(request);
  }
  async confirmManageAdReviewDelete(
    request: ConfirmManageAdReviewDeleteRequestDto,
  ): Promise<ConfirmManageAdReviewDeleteResponseDto> {
    return this.managementHandlers.confirmManageAdReviewDelete(request);
  }
  async readManageAdReviewKnownHashes(): Promise<ReadManageAdReviewKnownHashesResponseDto> {
    return this.managementHandlers.readManageAdReviewKnownHashes();
  }
  async importManageAdReviewKnownHashes(
    request: ImportManageAdReviewKnownHashesRequestDto,
  ): Promise<ImportManageAdReviewKnownHashesResponseDto> {
    return this.managementHandlers.importManageAdReviewKnownHashes(request);
  }
  async exportManageAdReviewKnownHashes(
    request: ExportManageAdReviewKnownHashesRequestDto,
  ): Promise<ExportManageAdReviewKnownHashesResponseDto> {
    return this.managementHandlers.exportManageAdReviewKnownHashes(request);
  }
  async startManageCoverReview(
    request: StartManageCoverReviewRequestDto,
  ): Promise<StartManageCoverReviewResponseDto> {
    return this.managementHandlers.startManageCoverReview(request);
  }
  async readManageCoverReviewTask(
    request: ReadManageCoverReviewTaskRequestDto,
  ): Promise<ReadManageCoverReviewTaskResponseDto> {
    return this.managementHandlers.readManageCoverReviewTask(request);
  }
  async pauseManageCoverReviewTask(
    request: PauseManageCoverReviewTaskRequestDto,
  ): Promise<PauseManageCoverReviewTaskResponseDto> {
    return this.managementHandlers.pauseManageCoverReviewTask(request);
  }
  async confirmManageCoverReviewHide(
    request: ConfirmManageCoverReviewHideRequestDto,
  ): Promise<ConfirmManageCoverReviewHideResponseDto> {
    return this.managementHandlers.confirmManageCoverReviewHide(request);
  }
  async startManageSubtitleCleanup(
    request: StartManageSubtitleCleanupRequestDto,
  ): Promise<StartManageSubtitleCleanupResponseDto> {
    return this.managementHandlers.startManageSubtitleCleanup(request);
  }
  async readManageSubtitleCleanupTask(
    request: ReadManageSubtitleCleanupTaskRequestDto,
  ): Promise<ReadManageSubtitleCleanupTaskResponseDto> {
    return this.managementHandlers.readManageSubtitleCleanupTask(request);
  }
  async runManageSubtitleCleanup(
    request: RunManageSubtitleCleanupRequestDto,
  ): Promise<RunManageSubtitleCleanupResponseDto> {
    return this.managementHandlers.runManageSubtitleCleanup(request);
  }
  async saveManageSubtitleCleanup(
    request: SaveManageSubtitleCleanupRequestDto,
  ): Promise<SaveManageSubtitleCleanupResponseDto> {
    return this.managementHandlers.saveManageSubtitleCleanup(request);
  }
  async startImageConvertTask(
    request: StartImageConvertTaskRequestDto,
  ): Promise<StartImageConvertTaskResponseDto> {
    return this.managementHandlers.startImageConvertTask(request);
  }
  async readImageConvertTask(
    request: ReadImageConvertTaskRequestDto,
  ): Promise<ReadImageConvertTaskResponseDto> {
    return this.managementHandlers.readImageConvertTask(request);
  }
  async cancelImageConvertTask(
    request: CancelImageConvertTaskRequestDto,
  ): Promise<CancelImageConvertTaskResponseDto> {
    return this.managementHandlers.cancelImageConvertTask(request);
  }
  async startAudioTranscodeTask(
    request: StartAudioTranscodeTaskRequestDto,
  ): Promise<StartAudioTranscodeTaskResponseDto> {
    return this.managementHandlers.startAudioTranscodeTask(request);
  }
  async readAudioTranscodeCapabilities(): Promise<ReadAudioTranscodeCapabilitiesResponseDto> {
    return this.managementHandlers.readAudioTranscodeCapabilities();
  }
  async readAudioTranscodeTask(
    request: ReadAudioTranscodeTaskRequestDto,
  ): Promise<ReadAudioTranscodeTaskResponseDto> {
    return this.managementHandlers.readAudioTranscodeTask(request);
  }
  async cancelAudioTranscodeTask(
    request: CancelAudioTranscodeTaskRequestDto,
  ): Promise<CancelAudioTranscodeTaskResponseDto> {
    return this.managementHandlers.cancelAudioTranscodeTask(request);
  }
  async startVideoTranscodeTask(
    request: StartVideoTranscodeTaskRequestDto,
  ): Promise<StartVideoTranscodeTaskResponseDto> {
    return this.managementHandlers.startVideoTranscodeTask(request);
  }
  async readVideoTranscodeCapabilities(): Promise<ReadVideoTranscodeCapabilitiesResponseDto> {
    return this.managementHandlers.readVideoTranscodeCapabilities();
  }
  async estimateVideoTranscodeOutputSize(
    request: EstimateVideoTranscodeOutputSizeRequestDto,
  ): Promise<EstimateVideoTranscodeOutputSizeResponseDto> {
    return this.managementHandlers.estimateVideoTranscodeOutputSize(request);
  }
  async readVideoTranscodeTask(
    request: ReadVideoTranscodeTaskRequestDto,
  ): Promise<ReadVideoTranscodeTaskResponseDto> {
    return this.managementHandlers.readVideoTranscodeTask(request);
  }
  async cancelVideoTranscodeTask(
    request: CancelVideoTranscodeTaskRequestDto,
  ): Promise<CancelVideoTranscodeTaskResponseDto> {
    return this.managementHandlers.cancelVideoTranscodeTask(request);
  }
  async writePackageMetadata(
    request: WritePackageMetadataRequestDto,
  ): Promise<WritePackageMetadataResponseDto> {
    return this.libraryHandlers.writePackageMetadata(request);
  }
  async writePackageExternalMetadata(
    request: WritePackageExternalMetadataRequestDto,
  ): Promise<WritePackageExternalMetadataResponseDto> {
    return this.libraryHandlers.writePackageExternalMetadata(request);
  }
  async writeVideoMetadata(
    request: WriteVideoMetadataRequestDto,
  ): Promise<WriteVideoMetadataResponseDto> {
    return this.libraryHandlers.writeVideoMetadata(request);
  }
  async writeAudioMetadata(
    request: WriteAudioMetadataRequestDto,
  ): Promise<WriteAudioMetadataResponseDto> {
    return this.libraryHandlers.writeAudioMetadata(request);
  }
  async saveVideoCover(
    request: SaveVideoCoverRequestDto,
  ): Promise<SaveVideoCoverResponseDto> {
    return this.libraryHandlers.saveVideoCover(request);
  }
  async readPlaylist(): Promise<ReadPlaylistResponseDto> {
    return this.libraryHandlers.readPlaylist();
  }
  async writePlaylist(
    request: WritePlaylistRequestDto,
  ): Promise<WritePlaylistResponseDto> {
    return this.libraryHandlers.writePlaylist(request);
  }
  async listVideoSubtitles(
    request: ListVideoSubtitlesRequestDto,
  ): Promise<ListVideoSubtitlesResponseDto> {
    return this.libraryHandlers.listVideoSubtitles(request);
  }
  async prepareSubtitleTrack(
    request: PrepareSubtitleTrackRequestDto,
  ): Promise<PrepareSubtitleTrackResponseDto> {
    return this.libraryHandlers.prepareSubtitleTrack(request);
  }
  async enqueueImportTask(
    request: EnqueueImportTaskRequestDto,
  ): Promise<EnqueueImportTaskResponseDto> {
    return this.systemHandlers.enqueueImportTask(request);
  }
  async readImportTasks(): Promise<{ tasks: ImportTaskDto[] }> {
    return this.systemHandlers.readImportTasks();
  }
  async retryImportTask(
    request: RetryImportTaskRequestDto,
  ): Promise<RetryImportTaskResponseDto> {
    return this.systemHandlers.retryImportTask(request);
  }
  async resolveMediaResource(
    request: ResolveMediaResourceRequestDto,
  ): Promise<ResolveMediaResourceResponseDto> {
    return this.systemHandlers.resolveMediaResource(request);
  }
  async readMediaResourceByToken(
    token: string,
    rangeHeader: string | null,
  ): Promise<MediaProtocolResponsePayload> {
    return this.systemHandlers.readMediaResourceByToken(token, rangeHeader);
  }
  async readMediaResourceByTokenStream(
    token: string,
    rangeHeader: string | null,
    signal?: AbortSignal | null,
  ): Promise<MediaProtocolStreamResponsePayload> {
    return this.systemHandlers.readMediaResourceByTokenStream(
      token,
      rangeHeader,
      signal,
    );
  }
  async readRuntimeCapabilities(): Promise<ReadRuntimeCapabilitiesResponseDto> {
    return this.systemHandlers.readRuntimeCapabilities();
  }
  async readSubtitleEngineStatus(): Promise<ReadSubtitleEngineStatusResponseDto> {
    return this.systemHandlers.readSubtitleEngineStatus();
  }
  async listSubtitleRemoteModels(): Promise<ListSubtitleRemoteModelsResponseDto> {
    return this.systemHandlers.listSubtitleRemoteModels();
  }
  async listSubtitleLocalModels(
    request: ListSubtitleLocalModelsRequestDto,
  ): Promise<ListSubtitleLocalModelsResponseDto> {
    return this.systemHandlers.listSubtitleLocalModels(request);
  }
  async startSubtitleModelDownload(
    request: StartSubtitleModelDownloadRequestDto,
  ): Promise<StartSubtitleModelDownloadResponseDto> {
    return this.systemHandlers.startSubtitleModelDownload(request);
  }
  async cancelSubtitleModelDownload(
    request: CancelSubtitleModelDownloadRequestDto,
  ): Promise<CancelSubtitleModelDownloadResponseDto> {
    return this.systemHandlers.cancelSubtitleModelDownload(request);
  }
  async readSubtitleModelDownloads(): Promise<ReadSubtitleModelDownloadsResponseDto> {
    return this.systemHandlers.readSubtitleModelDownloads();
  }
  async clearSubtitleLocalModel(
    request: ClearSubtitleLocalModelRequestDto,
  ): Promise<ClearSubtitleLocalModelResponseDto> {
    return this.systemHandlers.clearSubtitleLocalModel(request);
  }
  async readArchiveLoadStatus(): Promise<ReadArchiveLoadStatusResponseDto> {
    return this.systemHandlers.readArchiveLoadStatus();
  }
  async readMediaAccessAudit(): Promise<MediaAccessAuditResponseDto> {
    return this.systemHandlers.readMediaAccessAudit();
  }
  async readAppState(
    request: ReadAppStateRequestDto,
  ): Promise<ReadAppStateResponseDto> {
    return this.systemHandlers.readAppState(request);
  }
  async writeAppState(
    request: WriteAppStateRequestDto,
  ): Promise<WriteAppStateResponseDto> {
    return this.systemHandlers.writeAppState(request);
  }
  async searchExternalMetadata(
    request: SearchExternalMetadataRequestDto,
  ): Promise<SearchExternalMetadataResponseDto> {
    return this.systemHandlers.searchExternalMetadata(request);
  }
}
