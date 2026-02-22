import { promises as fs } from 'node:fs'
import path from 'node:path'

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
} from '../src/contracts/backend'
import { MEDIA_PROTOCOL_SCHEME } from './channels'
import {
  isPathAllowlisted,
  type MediaAccessGuardContext,
} from './fileSystemMediaAccessGuard'
import {
  type MediaProtocolResponsePayload,
  type MediaProtocolStreamResponsePayload,
} from './fileSystemMediaReaders'
import { isPathInsideRoot, normalizeAllowlistKey } from './fileSystemServiceHelpers'
import { MediaLibraryDatabase } from './mediaLibraryDatabase'
import { MediaTokenService } from './services/file-system-read/mediaTokenService'
import { ImportPathRegistry } from './services/file-system-read/importPathRegistry'
import {
  ARCHIVE_EXTENSIONS,
  ARCHIVE_NORMALIZE_DIR_NAME,
  ARCHIVE_NORMALIZE_IDLE_MS,
  ARCHIVE_NORMALIZE_RECHECK_MS,
  ARCHIVE_SCAN_CONCURRENCY,
  AUDIO_EXTENSIONS,
  COLOR_PALETTE,
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
  THUMBNAIL_CACHE_DIR_NAME,
  VIDEO_EXTENSIONS,
  ZIP_COMPRESSION_DEFLATE,
  ZIP_COMPRESSION_STORE,
  ZIP_GENERAL_PURPOSE_FLAG_ENCRYPTED,
} from './services/file-system-read/fileSystemReadFacadeConfig'
import { ArchiveNormalizationService } from './services/file-system-read/archiveNormalizationService'
import {
  type ArchiveLoadStatusListener,
  type FileSystemReadServiceEvents,
  type LibraryChangedEventPayload,
  type LibraryChangedListener,
} from './services/file-system-read/fileSystemReadFacadeEvents'
import { ImportTaskService } from './services/file-system-read/importTaskService'
import { LibraryReadWriteService } from './services/file-system-read/libraryReadWriteService'
import { LibrarySnapshotService, type SnapshotRefreshOptions } from './services/file-system-read/librarySnapshotService'
import { ManagementMutationService } from './services/file-system-read/managementMutationService'
import { ManageAdReviewService } from './services/file-system-read/manageAdReviewService'
import { ManageCoverReviewService } from './services/file-system-read/manageCoverReviewService'
import { MediaResourceService } from './services/file-system-read/mediaResourceService'
import { RuntimeDependencyService } from './services/file-system-read/runtimeDependencyService'
import { ArchivePathLockService } from './services/file-system-read/archivePathLockService'
import { cleanupStartupTempArtifacts } from './services/file-system-read/startupTempCleanup'
import { disposeTaskProcessRunners } from './services/task-orchestrator/processTaskOrchestrator'
import { SubtitleModelService } from './services/file-system-read/subtitleModelService'
import { TaskResourceGovernor } from './services/file-system-read/taskResourceGovernor'
import { ServiceEventBus } from './services/file-system-read/serviceEventBus'
import { FileSystemFacadeContext } from './facade/types'
import { FileSystemLibraryHandlers } from './facade/FileSystemLibraryHandlers'
import { FileSystemManagementHandlers } from './facade/FileSystemManagementHandlers'
import { FileSystemSystemHandlers } from './facade/FileSystemSystemHandlers'

export interface FileSystemMediaReadServiceOptions {
  rootDir: string
  databaseFilePath?: string
  thumbnailCacheRootDir?: string
  taskResourceGovernor?: TaskResourceGovernor
  onLibraryChanged?: LibraryChangedListener
  onArchiveLoadStatusChanged?: ArchiveLoadStatusListener
}

interface QueuedReadTask<T> {
  key: string
  start: (signal: AbortSignal) => Promise<T>
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
}

interface ActiveReadTask<T> {
  key: string
  controller: AbortController
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
  superseded: boolean
}

export class FileSystemMediaReadService implements FileSystemReadServiceEvents {
  private static readonly SYNC_PRUNE_ENTRY_THRESHOLD = 256

  private static readonly INTERACTIVE_READ_HOT_WINDOW_MS = 2_500

  private static readonly ARCHIVE_NORMALIZE_QUEUE_APP_STATE_KEY = 'archive_normalize_queue_paths'

  private readonly rootDir: string
  private readonly coverOutputRootDir: string
  private readonly thumbnailCacheRootDir: string
  private readonly normalizedArchiveRootDir: string

  private readonly database: MediaLibraryDatabase
  private readonly mediaTokenService: MediaTokenService
  private readonly importPathRegistry: ImportPathRegistry
  private readonly archiveNormalizationService: ArchiveNormalizationService
  private readonly importTaskService: ImportTaskService
  private readonly libraryReadWriteService: LibraryReadWriteService
  private readonly librarySnapshotService: LibrarySnapshotService
  private readonly managementMutationService: ManagementMutationService
  private readonly manageAdReviewService: ManageAdReviewService
  private readonly manageCoverReviewService: ManageCoverReviewService
  private readonly mediaResourceService: MediaResourceService
  private readonly runtimeDependencyService: RuntimeDependencyService
  private readonly subtitleModelService: SubtitleModelService
  private readonly taskResourceGovernor: TaskResourceGovernor
  private readonly ownsTaskResourceGovernor: boolean
  private readonly archivePathLockService: ArchivePathLockService
  private readonly eventBus: ServiceEventBus

  private readonly libraryHandlers: FileSystemLibraryHandlers
  private readonly managementHandlers: FileSystemManagementHandlers
  private readonly systemHandlers: FileSystemSystemHandlers

  private stateHydrated = false

  private pruneMissingSnapshotPromise: Promise<void> | null = null

  private pruneMissingSnapshotQueued = false

  private startupCleanupPromise: Promise<void> | null = null

  private lastInteractiveReadAtMs = 0

  private readLibrarySnapshotInFlight: Promise<LibrarySnapshotDto> | null = null

  private readLibrarySnapshotLiteInFlight: Promise<LibrarySnapshotLiteDto> | null = null

  private readonly maxConcurrentImageSidebarTreeReads = 1

  private activeImageSidebarTreeTasks: ActiveReadTask<ReadImageSidebarTreeResponseDto>[] = []

  private queuedImageSidebarTreeTask: QueuedReadTask<ReadImageSidebarTreeResponseDto> | null = null

  private readonly maxConcurrentImagePageReads = 2

  private activeImagePageTasks: ActiveReadTask<ReadImagePageResponseDto>[] = []

  private queuedImagePageTask: QueuedReadTask<ReadImagePageResponseDto> | null = null

  private disposed = false

  constructor(optionsOrRootDir: FileSystemMediaReadServiceOptions | string) {
    const options = typeof optionsOrRootDir === 'string' ? { rootDir: optionsOrRootDir } : optionsOrRootDir
    this.rootDir = path.resolve(options.rootDir)
    this.coverOutputRootDir = path.join(this.rootDir, 'covers')
    this.thumbnailCacheRootDir = path.resolve(options.thumbnailCacheRootDir ?? path.join(this.rootDir, THUMBNAIL_CACHE_DIR_NAME))
    this.normalizedArchiveRootDir = path.join(this.rootDir, ARCHIVE_NORMALIZE_DIR_NAME)

    this.database = new MediaLibraryDatabase({
      rootDir: this.rootDir,
      databaseFilePath: options.databaseFilePath,
    })
    this.eventBus = new ServiceEventBus()

    if (options.onLibraryChanged) {
      this.eventBus.on('libraryChanged', options.onLibraryChanged)
    }

    this.mediaTokenService = new MediaTokenService(MEDIA_TOKEN_TTL_MS)
    this.importPathRegistry = new ImportPathRegistry()
    this.runtimeDependencyService = new RuntimeDependencyService(FFMPEG_BIN, FFPROBE_BIN)
    this.subtitleModelService = new SubtitleModelService()
    this.ownsTaskResourceGovernor = !options.taskResourceGovernor
    this.taskResourceGovernor =
      options.taskResourceGovernor ??
      new TaskResourceGovernor({
        cpuTokenLimit: GLOBAL_CPU_TOKEN_LIMIT,
        gpuTokenLimit: GLOBAL_GPU_TOKEN_LIMIT,
      })
    this.archivePathLockService = new ArchivePathLockService()

    this.archiveNormalizationService = new ArchiveNormalizationService({
      idleMs: ARCHIVE_NORMALIZE_IDLE_MS,
      recheckMs: ARCHIVE_NORMALIZE_RECHECK_MS,
      isTargetEligible: (sourceArchivePath) => this.isArchiveNormalizationTargetEligible(sourceArchivePath),
      hasRunningImportTasks: () => this.importTaskService.hasRunningImportTasks(),
      isSnapshotLoading: () => this.librarySnapshotService.isSnapshotLoading(),
      onArchiveNormalized: (sourcePath, outputPath) => this.replaceImportedFileSourcePath(sourcePath, outputPath),
      emitLibraryChanged: (payload) => this.emitLibraryChanged(payload),
      emitArchiveLoadStatusChanged: (payload) => this.eventBus.emit('archiveLoadStatusChanged', payload),
      withArchiveWriteLock: (archivePath, task) => this.archivePathLockService.withWriteLock(archivePath, task),
      runWithCpuToken: (taskName, task) => this.taskResourceGovernor.runWithCpuToken(taskName, task),
      readPersistedQueuePaths: () =>
        this.database.readAppState<string[]>(FileSystemMediaReadService.ARCHIVE_NORMALIZE_QUEUE_APP_STATE_KEY, []),
      writePersistedQueuePaths: (paths) =>
        this.database.writeAppState(FileSystemMediaReadService.ARCHIVE_NORMALIZE_QUEUE_APP_STATE_KEY, paths),
    })

    this.librarySnapshotService = new LibrarySnapshotService({
      rootDir: this.rootDir,
      normalizedArchiveRootDir: this.normalizedArchiveRootDir,
      legacyImportsDirName: LEGACY_IMPORTS_DIR_NAME,
      database: this.database,
      importPathRegistry: this.importPathRegistry,
      imageExtensions: IMAGE_EXTENSIONS,
      videoExtensions: VIDEO_EXTENSIONS,
      audioExtensions: AUDIO_EXTENSIONS,
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
      ensureRuntimeDependencies: () => this.runtimeDependencyService.ensureRuntimeDependencies(),
      queueRar7zNormalization: (path, priority) => this.queueRar7zNormalization(path, priority),
      getPackageGradeOverridesBySourceId: () => this.database.readPackageGrades(),
      getVideoCoverOverridesByVideoId: () => this.database.readVideoCovers(),
      getVideoMetadataOverridesByVideoId: () => this.database.readVideoMetadata(),
      getAudioMetadataOverridesByAudioId: () => this.database.readAudioMetadata(),
      getMusicImportSources: () => this.database.readMusicImportSources(),
      upsertAudioMetadataFromScan: (audioId, payload) =>
        this.database.writeAudioMetadata(audioId, {
          album: payload.album,
          author: payload.author,
          trackTitle: payload.trackTitle,
          seriesId: payload.seriesId,
        }),
      withArchiveReadLock: (archivePath, task) => this.archivePathLockService.withReadLock(archivePath, task),
      isInteractiveReadHot: () => this.isInteractiveReadHot(),
    })

    this.importTaskService = new ImportTaskService({
      rootDir: this.rootDir,
      legacyImportsDirName: LEGACY_IMPORTS_DIR_NAME,
      imageExtensions: IMAGE_EXTENSIONS,
      videoExtensions: VIDEO_EXTENSIONS,
      audioExtensions: AUDIO_EXTENSIONS,
      archiveExtensions: ARCHIVE_EXTENSIONS,
      database: this.database,
      invalidateSnapshotCache: () => this.invalidateSnapshotCache(),
      refreshSnapshot: (options) => this.refreshSnapshotFromFilesystem(options),
      emitLibraryChanged: (payload) => this.emitLibraryChanged(payload),
    })

    this.libraryReadWriteService = new LibraryReadWriteService({
      database: this.database,
      ffmpegBin: FFMPEG_BIN,
      coverOutputRootDir: this.coverOutputRootDir,
      rootDir: this.rootDir,
      packageGradeOverridesBySourceId: this.database.readPackageGrades(),
      videoCoverOverridesByVideoId: this.database.readVideoCovers(),
      videoMetadataOverridesByVideoId: this.database.readVideoMetadata(),
      ensureSnapshotLoaded: () => this.ensureSnapshotLoaded(),
      ensureRuntimeDependencies: () => this.runtimeDependencyService.ensureRuntimeDependencies(),
      markInteractiveRead: () => this.markInteractiveRead(),
      isRar7zPath: (filePath) => this.isRar7zPath(filePath),
      queueRar7zNormalization: (path, priority) => this.queueRar7zNormalization(path, priority),
      emitLibraryChanged: (payload) => this.emitLibraryChanged(payload),
    })

    this.managementMutationService = new ManagementMutationService({
      rootDir: this.rootDir,
      thumbnailCacheRootDir: this.thumbnailCacheRootDir,
      database: this.database,
      importPathRegistry: this.importPathRegistry,
      ensureStateLoaded: () => this.ensureStateLoaded(),
      ensureSnapshotLoaded: () => this.ensureSnapshotLoaded(),
      syncSnapshotFromDatabase: () => this.syncSnapshotFromDatabase(),
      refreshArchiveIndexesForPaths: (paths) => this.refreshArchiveIndexesForPaths(paths),
      pruneArchiveIndexesByDeletedRoots: (paths) => this.pruneArchiveIndexesByDeletedRoots(paths),
      removeImportSourcePaths: (paths) => this.removeImportSourcePaths(paths),
      replaceImportSourcePaths: (mappings) => this.replaceImportSourcePaths(mappings),
      buildMediaAccessContext: () => this.buildMediaAccessContext(),
      emitLibraryChanged: (payload) => this.emitLibraryChanged(payload),
      withArchiveWriteLock: (archivePath, task) => this.archivePathLockService.withWriteLock(archivePath, task),
    })

    this.manageAdReviewService = new ManageAdReviewService({
      database: this.database,
      ensureSnapshotLoaded: () => this.ensureSnapshotLoaded(),
      buildMediaAccessContext: () => this.buildMediaAccessContext(),
      getZipEntryIndexByPath: () => this.librarySnapshotService.getZipEntryIndexByPath(),
      deleteImageItems: (request) => this.deleteImageItems(request),
    })

    this.manageCoverReviewService = new ManageCoverReviewService({
      database: this.database,
      ensureSnapshotLoaded: () => this.ensureSnapshotLoaded(),
      buildMediaAccessContext: () => this.buildMediaAccessContext(),
      getZipEntryIndexByPath: () => this.librarySnapshotService.getZipEntryIndexByPath(),
      setImageHidden: (request) => this.setImageHidden(request),
    })

    this.mediaResourceService = new MediaResourceService({
      mediaProtocolScheme: MEDIA_PROTOCOL_SCHEME,
      thumbnailCacheRootDir: this.thumbnailCacheRootDir,
      archiveNormalizeRecheckMs: ARCHIVE_NORMALIZE_RECHECK_MS,
      mediaTokenService: this.mediaTokenService,
      ensureSnapshotLoaded: () => this.ensureSnapshotLoaded(),
      refreshArchiveIndexesForPaths: (paths) => this.refreshArchiveIndexesForPaths(paths),
      buildMediaAccessContext: () => this.buildMediaAccessContext(),
      ensureRuntimeDependencies: () => this.runtimeDependencyService.ensureRuntimeDependencies(),
      readImageBufferForThumbnail: (locator) => this.librarySnapshotService.readImageBufferForThumbnail(locator),
      onThumbnailRenderingStart: (taskKey) => {
        this.archiveNormalizationService.onThumbnailRenderingStart(taskKey)
      },
      onThumbnailRenderingProgress: (taskKey, payload) => {
        this.archiveNormalizationService.onThumbnailRenderingProgress(taskKey, payload)
      },
      onThumbnailRenderingEnd: (taskKey) => {
        this.archiveNormalizationService.onThumbnailRenderingEnd(taskKey)
      },
      runWithThumbnailCpuToken: (taskName, task) => this.taskResourceGovernor.runWithCpuToken(taskName, task),
      withArchiveReadLock: (archivePath, task) => this.archivePathLockService.withReadLock(archivePath, task),
      hasPendingArchiveNormalization: () => this.archiveNormalizationService.hasPending(),
      scheduleArchiveNormalizationDrain: (delay) => this.scheduleArchiveNormalizationDrain(delay),
      getZipEntryIndexByPath: () => this.librarySnapshotService.getZipEntryIndexByPath(),
    })

    const context: FileSystemFacadeContext = {
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
    }

    this.libraryHandlers = new FileSystemLibraryHandlers(context)
    this.managementHandlers = new FileSystemManagementHandlers(context)
    this.systemHandlers = new FileSystemSystemHandlers(context)

    void this.scheduleStartupTempCleanup()
  }

  onLibraryChanged(listener: LibraryChangedListener): () => void {
    return this.eventBus.on('libraryChanged', listener)
  }

  onArchiveLoadStatusChanged(listener: ArchiveLoadStatusListener): () => void {
    return this.eventBus.on('archiveLoadStatusChanged', listener)
  }

  private emitLibraryChanged(payload: LibraryChangedEventPayload): void {
    this.eventBus.emit('libraryChanged', payload)
    if (
      payload.reason !== 'import-task-updated' &&
      payload.reason !== 'archive-load-status-updated' &&
      payload.reason !== 'thumbnail-rendering-progress'
    ) {
      this.scheduleArchiveNormalizationDrain(ARCHIVE_NORMALIZE_IDLE_MS)
    }
  }

  private markInteractiveRead(): void {
    this.lastInteractiveReadAtMs = Date.now()
    this.scheduleArchiveNormalizationDrain(ARCHIVE_NORMALIZE_IDLE_MS)
  }

  private isInteractiveReadHot(): boolean {
    return false
  }

  private isRar7zPath(targetPath: string): boolean {
    const ext = path.extname(targetPath).toLowerCase()
    return ext === '.rar' || ext === '.7z'
  }

  private isArchiveNormalizationTargetEligible(sourceArchivePath: string): boolean {
    if (!this.isRar7zPath(sourceArchivePath)) {
      return false
    }
    return isPathAllowlisted(sourceArchivePath, this.buildMediaAccessContext())
  }

  private buildMediaAccessContext(): MediaAccessGuardContext {
    return {
      rootDir: this.rootDir,
      importDirectoryRoots: this.importPathRegistry.getImportDirectoryRoots(),
      importFileAllowlistKeys: this.importPathRegistry.getImportFileAllowlistKeys(),
      archiveEntryIndexByPath: this.librarySnapshotService.getArchiveEntryIndexByPath(),
      imageExtensions: IMAGE_EXTENSIONS,
      videoExtensions: VIDEO_EXTENSIONS,
      audioExtensions: AUDIO_EXTENSIONS,
      subtitleExtensions: SUBTITLE_EXTENSIONS,
    }
  }

  private queueRar7zNormalization(sourceArchivePath: string, priority: 'low' | 'high' = 'low'): void {
    if (!this.isRar7zPath(sourceArchivePath)) {
      return
    }
    if (!isPathAllowlisted(sourceArchivePath, this.buildMediaAccessContext())) {
      return
    }
    this.archiveNormalizationService.queueRar7zNormalization(sourceArchivePath, priority)
  }

  private scheduleArchiveNormalizationDrain(delayMs = 0): void {
    this.archiveNormalizationService.scheduleDrain(delayMs)
  }

  invalidateCache(): void {
    this.librarySnapshotService.invalidateCache()
    this.stateHydrated = false
    this.mediaTokenService.cleanupExpiredTokens()
  }

  /**
   * 仅清理快照缓存与媒体令牌，不重置 stateHydrated。
   * 在活跃导入任务写入数据库后调用，避免 ensureStateLoaded 触发 recovery 误杀运行中的任务。
   * 同时重新水合 importPathRegistry，保证快照扫描能找到新写入的 import sources。
   */
  invalidateSnapshotCache(): void {
    this.librarySnapshotService.invalidateCache()
    const importSources = this.database.readImportSources()
    this.importPathRegistry.hydrate(importSources)
    this.mediaTokenService.cleanupExpiredTokens()
  }

  private createQueuedReadTask<T>(key: string, start: (signal: AbortSignal) => Promise<T>): QueuedReadTask<T> {
    let resolvePromise: ((value: T | PromiseLike<T>) => void) | undefined
    let rejectPromise: ((reason?: unknown) => void) | undefined
    let settled = false
    const promise = new Promise<T>((resolve, reject) => {
      resolvePromise = (value) => {
        if (settled) {
          return
        }
        settled = true
        resolve(value)
      }
      rejectPromise = (reason) => {
        if (settled) {
          return
        }
        settled = true
        reject(reason)
      }
    })
    if (!resolvePromise || !rejectPromise) {
      throw new Error('createQueuedReadTask: promise callbacks not initialized')
    }
    return {
      key,
      start,
      promise,
      resolve: resolvePromise,
      reject: rejectPromise,
    }
  }

  private createActiveReadTask<T>(key: string): ActiveReadTask<T> {
    let resolvePromise: ((value: T | PromiseLike<T>) => void) | undefined
    let rejectPromise: ((reason?: unknown) => void) | undefined
    let settled = false
    const promise = new Promise<T>((resolve, reject) => {
      resolvePromise = (value) => {
        if (settled) {
          return
        }
        settled = true
        resolve(value)
      }
      rejectPromise = (reason) => {
        if (settled) {
          return
        }
        settled = true
        reject(reason)
      }
    })
    if (!resolvePromise || !rejectPromise) {
      throw new Error('createActiveReadTask: promise callbacks not initialized')
    }
    return {
      key,
      controller: new AbortController(),
      promise,
      resolve: resolvePromise,
      reject: rejectPromise,
      superseded: false,
    }
  }

  private isAbortLikeError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false
    }
    if (error.name === 'AbortError') {
      return true
    }
    return /abort/i.test(error.message)
  }

  private clearQueuedReadTasks(reason: string): void {
    if (this.queuedImageSidebarTreeTask) {
      this.queuedImageSidebarTreeTask.reject(new Error(reason))
      this.queuedImageSidebarTreeTask = null
    }
    if (this.queuedImagePageTask) {
      this.queuedImagePageTask.reject(new Error(reason))
      this.queuedImagePageTask = null
    }
  }

  private clearActiveReadTasks(reason: string): void {
    for (const task of this.activeImageSidebarTreeTasks) {
      task.reject(new Error(reason))
      task.controller.abort(reason)
    }
    this.activeImageSidebarTreeTasks = []
    for (const task of this.activeImagePageTasks) {
      task.reject(new Error(reason))
      task.controller.abort(reason)
    }
    this.activeImagePageTasks = []
  }

  private startImageSidebarTreeTask(
    key: string,
    start: (signal: AbortSignal) => Promise<ReadImageSidebarTreeResponseDto>,
  ): Promise<ReadImageSidebarTreeResponseDto> {
    const activeTask = this.createActiveReadTask<ReadImageSidebarTreeResponseDto>(key)
    this.activeImageSidebarTreeTasks.push(activeTask)
    void start(activeTask.controller.signal)
      .then((response) => {
        activeTask.resolve(response)
      })
      .catch((error: unknown) => {
        if (activeTask.superseded && this.isAbortLikeError(error)) {
          return
        }
        activeTask.reject(error)
      })
      .finally(() => {
        this.onImageSidebarTreeTaskSettled(activeTask)
        this.startQueuedImageSidebarTreeTaskIfPossible()
      })
    return activeTask.promise
  }

  private startQueuedImageSidebarTreeTaskIfPossible(): void {
    if (this.activeImageSidebarTreeTasks.length >= this.maxConcurrentImageSidebarTreeReads) {
      return
    }
    if (!this.queuedImageSidebarTreeTask) {
      return
    }
    const queuedTask = this.queuedImageSidebarTreeTask
    this.queuedImageSidebarTreeTask = null
    const nextTask = this.startImageSidebarTreeTask(queuedTask.key, queuedTask.start)
    queuedTask.resolve(nextTask)
  }

  private supersedeActiveImageSidebarTreeTask(requestKey: string, replacement: Promise<ReadImageSidebarTreeResponseDto>): void {
    const staleTaskIndex = this.activeImageSidebarTreeTasks.findIndex((item) => item.key !== requestKey)
    if (staleTaskIndex < 0) {
      return
    }
    const [staleTask] = this.activeImageSidebarTreeTasks.splice(staleTaskIndex, 1)
    staleTask.superseded = true
    staleTask.resolve(replacement)
    staleTask.controller.abort('read request superseded')
  }

  private onImageSidebarTreeTaskSettled(task: ActiveReadTask<ReadImageSidebarTreeResponseDto>): void {
    const taskIndex = this.activeImageSidebarTreeTasks.indexOf(task)
    if (taskIndex < 0) {
      return
    }
    this.activeImageSidebarTreeTasks.splice(taskIndex, 1)
  }

  private startImagePageTask(
    key: string,
    start: (signal: AbortSignal) => Promise<ReadImagePageResponseDto>,
  ): Promise<ReadImagePageResponseDto> {
    const activeTask = this.createActiveReadTask<ReadImagePageResponseDto>(key)
    this.activeImagePageTasks.push(activeTask)
    void start(activeTask.controller.signal)
      .then((response) => {
        activeTask.resolve(response)
      })
      .catch((error: unknown) => {
        if (activeTask.superseded && this.isAbortLikeError(error)) {
          return
        }
        activeTask.reject(error)
      })
      .finally(() => {
        this.onImagePageTaskSettled(activeTask)
        this.startQueuedImagePageTaskIfPossible()
      })
    return activeTask.promise
  }

  private startQueuedImagePageTaskIfPossible(): void {
    if (this.activeImagePageTasks.length >= this.maxConcurrentImagePageReads) {
      return
    }
    if (!this.queuedImagePageTask) {
      return
    }
    const queuedTask = this.queuedImagePageTask
    this.queuedImagePageTask = null
    const nextTask = this.startImagePageTask(queuedTask.key, queuedTask.start)
    queuedTask.resolve(nextTask)
  }

  private supersedeActiveImagePageTask(requestKey: string, replacement: Promise<ReadImagePageResponseDto>): void {
    const staleTaskIndex = this.activeImagePageTasks.findIndex((item) => item.key !== requestKey)
    if (staleTaskIndex < 0) {
      return
    }
    const [staleTask] = this.activeImagePageTasks.splice(staleTaskIndex, 1)
    staleTask.superseded = true
    staleTask.resolve(replacement)
    staleTask.controller.abort('read request superseded')
  }

  private onImagePageTaskSettled(task: ActiveReadTask<ReadImagePageResponseDto>): void {
    const taskIndex = this.activeImagePageTasks.indexOf(task)
    if (taskIndex < 0) {
      return
    }
    this.activeImagePageTasks.splice(taskIndex, 1)
  }

  dispose(): void {
    this.disposed = true
    this.readLibrarySnapshotInFlight = null
    this.readLibrarySnapshotLiteInFlight = null
    this.clearActiveReadTasks('read queue cleared: service disposed')
    this.clearQueuedReadTasks('read queue cleared: service disposed')
    void disposeTaskProcessRunners().catch(() => undefined)
    if (this.ownsTaskResourceGovernor) {
      this.taskResourceGovernor.dispose()
    }
    this.archiveNormalizationService.dispose()
    this.eventBus.clear()
    this.database.dispose()
  }

  private async ensureStateLoaded(): Promise<void> {
    if (this.stateHydrated) {
      return
    }
    this.importTaskService.recoverInterruptedImportTasks()
    this.importPathRegistry.hydrate(this.database.readImportSources())
    this.archiveNormalizationService.recoverPersistedQueue()
    this.stateHydrated = true
  }

  private async scheduleStartupTempCleanup(): Promise<void> {
    if (this.startupCleanupPromise) {
      await this.startupCleanupPromise
      return
    }

    this.startupCleanupPromise = Promise.resolve()
      .then(async () => {
        const snapshot = this.database.readSnapshot()
        const importSources = this.database.readImportSources()

        const knownArchivePaths = Array.from(
          new Set([
            ...snapshot.image_packages.map((item) => path.resolve(item.absolute_path)),
            ...importSources.files
              .map((item) => path.resolve(item))
              .filter((item) => this.isRar7zPath(item) || path.extname(item).toLowerCase() === '.zip'),
          ]),
        )

        const cleanupResult = await cleanupStartupTempArtifacts({
          thumbnailCacheRootDir: this.thumbnailCacheRootDir,
          normalizedArchiveRootDir: this.normalizedArchiveRootDir,
          knownArchivePaths,
          withArchiveWriteLock: (archivePath, task) => this.archivePathLockService.withWriteLock(archivePath, task),
        })

        if (cleanupResult.removedCount > 0) {
          console.info('startup temp cleanup finished', {
            removedCount: cleanupResult.removedCount,
          })
        }
      })
      .catch((error) => {
        console.warn('startup temp cleanup failed', {
          reason: error instanceof Error && error.message ? error.message : String(error),
        })
      })
      .finally(() => {
        this.startupCleanupPromise = null
      })

    await this.startupCleanupPromise
  }

  private async replaceImportedFileSourcePath(sourceArchivePath: string, outputZipPath: string): Promise<void> {
    await this.ensureStateLoaded()
    const didReplace = this.importPathRegistry.replaceImportedFileSourcePath(sourceArchivePath, outputZipPath)
    if (didReplace) {
      const nextSources = this.importPathRegistry.getImportSources()
      this.database.writeImportSources({ directories: nextSources.directories, files: nextSources.files })
    }
  }

  private async removeImportSourcePaths(pathsToRemove: string[]): Promise<void> {
    await this.ensureStateLoaded()
    const didRemove = this.importPathRegistry.removeImportSourcePaths(pathsToRemove)

    const removeRoots = pathsToRemove.map((value) => path.resolve(value))
    const shouldRemovePath = (candidatePath: string): boolean => {
      const resolvedCandidatePath = path.resolve(candidatePath)
      return removeRoots.some(
        (rootPath) =>
          normalizeAllowlistKey(rootPath) === normalizeAllowlistKey(resolvedCandidatePath) ||
          isPathInsideRoot(rootPath, resolvedCandidatePath),
      )
    }

    const currentMusicSources = this.database.readMusicImportSources()
    const nextMusicDirectories = currentMusicSources.directories
      .map((value) => path.resolve(value))
      .filter((value) => !shouldRemovePath(value))
    const nextMusicFiles = currentMusicSources.files
      .map((value) => path.resolve(value))
      .filter((value) => !shouldRemovePath(value))
    const didChangeMusicSources =
      nextMusicDirectories.length !== currentMusicSources.directories.length ||
      nextMusicFiles.length !== currentMusicSources.files.length

    if (didRemove) {
      const nextSources = this.importPathRegistry.getImportSources()
      this.database.writeImportSources({ directories: nextSources.directories, files: nextSources.files })
    }

    if (didChangeMusicSources) {
      this.database.writeMusicImportSources({
        directories: nextMusicDirectories,
        files: nextMusicFiles,
      })
    }
  }

  private async replaceImportSourcePaths(
    mappings: Array<{ fromPath: string; toPath: string }>,
  ): Promise<void> {
    if (mappings.length === 0) {
      return
    }

    await this.ensureStateLoaded()

    const mappingByFromKey = new Map<string, { fromPath: string; toPath: string; fromKey: string }>()
    for (const mapping of mappings) {
      const fromPath = path.resolve(mapping.fromPath)
      const toPath = path.resolve(mapping.toPath)
      const fromKey = normalizeAllowlistKey(fromPath)
      if (fromKey === normalizeAllowlistKey(toPath)) {
        continue
      }
      mappingByFromKey.set(fromKey, {
        fromPath,
        toPath,
        fromKey,
      })
    }

    const normalizedMappings = Array.from(mappingByFromKey.values()).sort(
      (left, right) => right.fromPath.length - left.fromPath.length,
    )
    if (normalizedMappings.length === 0) {
      return
    }

    const dedupeResolvedPaths = (values: string[]): string[] => {
      const map = new Map<string, string>()
      for (const value of values) {
        const resolved = path.resolve(value)
        map.set(normalizeAllowlistKey(resolved), resolved)
      }
      return Array.from(map.values())
    }

    const toNormalizedKey = (values: string[]): string =>
      values
        .map((value) => normalizeAllowlistKey(path.resolve(value)))
        .sort((left, right) => left.localeCompare(right, 'en-US'))
        .join('|')

    const resolveMappedPath = (candidatePath: string): string => {
      const resolvedCandidate = path.resolve(candidatePath)
      const candidateKey = normalizeAllowlistKey(resolvedCandidate)

      for (const mapping of normalizedMappings) {
        if (mapping.fromKey === candidateKey) {
          return mapping.toPath
        }
        if (isPathInsideRoot(mapping.fromPath, resolvedCandidate)) {
          const relativePath = path.relative(mapping.fromPath, resolvedCandidate)
          return path.resolve(mapping.toPath, relativePath)
        }
      }

      return resolvedCandidate
    }

    const currentImportSources = this.importPathRegistry.getImportSources()
    const nextImportDirectories = dedupeResolvedPaths(currentImportSources.directories.map(resolveMappedPath))
    const nextImportFiles = dedupeResolvedPaths(currentImportSources.files.map(resolveMappedPath))
    const didChangeImportSources =
      toNormalizedKey(currentImportSources.directories) !== toNormalizedKey(nextImportDirectories) ||
      toNormalizedKey(currentImportSources.files) !== toNormalizedKey(nextImportFiles)

    if (didChangeImportSources) {
      this.importPathRegistry.hydrate({
        directories: nextImportDirectories,
        files: nextImportFiles,
      })
      this.database.writeImportSources({
        directories: nextImportDirectories,
        files: nextImportFiles,
      })
    }

    const currentMusicSources = this.database.readMusicImportSources()
    const nextMusicDirectories = dedupeResolvedPaths(currentMusicSources.directories.map(resolveMappedPath))
    const nextMusicFiles = dedupeResolvedPaths(currentMusicSources.files.map(resolveMappedPath))
    const didChangeMusicSources =
      toNormalizedKey(currentMusicSources.directories) !== toNormalizedKey(nextMusicDirectories) ||
      toNormalizedKey(currentMusicSources.files) !== toNormalizedKey(nextMusicFiles)

    if (didChangeMusicSources) {
      this.database.writeMusicImportSources({
        directories: nextMusicDirectories,
        files: nextMusicFiles,
      })
    }
  }

  private syncSnapshotFromDatabase(): LibrarySnapshotDto {
    return this.librarySnapshotService.syncSnapshotFromDatabase()
  }

  private async refreshArchiveIndexesForPaths(archivePaths: Iterable<string>): Promise<void> {
    await this.librarySnapshotService.refreshArchiveIndexesForPaths(archivePaths)
  }

  private pruneArchiveIndexesByDeletedRoots(deletedPaths: Iterable<string>): void {
    this.librarySnapshotService.pruneArchiveIndexesByDeletedRoots(deletedPaths, (archivePath) =>
      this.archiveNormalizationService.deleteStateByPath(archivePath),
    )
  }

  private async ensureSnapshotLoaded(): Promise<LibrarySnapshotDto> {
    const snapshot = await this.librarySnapshotService.ensureSnapshotLoaded(() => this.ensureStateLoaded())
    if (this.shouldPruneSynchronously(snapshot)) {
      return this.pruneMissingSnapshotEntries(snapshot)
    }
    this.schedulePruneMissingSnapshotEntries()
    return snapshot
  }

  private async refreshSnapshotFromFilesystem(options?: SnapshotRefreshOptions): Promise<LibrarySnapshotDto> {
    const snapshot = await this.librarySnapshotService.refreshSnapshot(() => this.ensureStateLoaded(), options)
    if (this.shouldPruneSynchronously(snapshot)) {
      return this.pruneMissingSnapshotEntries(snapshot)
    }
    this.schedulePruneMissingSnapshotEntries()
    return snapshot
  }

  private shouldPruneSynchronously(snapshot: LibrarySnapshotDto): boolean {
    const totalEntries =
      snapshot.image_packages.length +
      snapshot.image_directories.length +
      snapshot.videos.length +
      (snapshot.audios?.length ?? 0)
    return totalEntries <= FileSystemMediaReadService.SYNC_PRUNE_ENTRY_THRESHOLD
  }

  private async pathExists(targetPath: string): Promise<boolean> {
    const stat = await fs.stat(targetPath).catch(() => null)
    return Boolean(stat)
  }

  private async pruneMissingSnapshotEntries(snapshot: LibrarySnapshotDto): Promise<LibrarySnapshotDto> {
    const missingPaths = new Set<string>()
    const imageSources = [...snapshot.image_packages, ...snapshot.image_directories]

    for (const source of imageSources) {
      if (!(await this.pathExists(source.absolute_path))) {
        missingPaths.add(source.absolute_path)
      }
    }
    for (const video of snapshot.videos) {
      if (!(await this.pathExists(video.absolute_path))) {
        missingPaths.add(video.absolute_path)
      }
    }
    for (const audio of snapshot.audios ?? []) {
      if (!(await this.pathExists(audio.absolute_path))) {
        missingPaths.add(audio.absolute_path)
      }
    }

    if (missingPaths.size === 0) {
      return snapshot
    }

    const pathsToPrune = Array.from(missingPaths)
    const deleted = this.database.deleteSnapshotEntriesByPaths(pathsToPrune)
    if (deleted.deletedSourceCount === 0 && deleted.deletedVideoCount === 0 && deleted.deletedAudioCount === 0) {
      return snapshot
    }

    this.pruneArchiveIndexesByDeletedRoots(pathsToPrune)
    await this.removeImportSourcePaths(pathsToPrune)
    const nextSnapshot = this.syncSnapshotFromDatabase()

    this.emitLibraryChanged({
      reason: 'auto-prune-missing-sources',
      updated_at_ms: Date.now(),
    })

    return nextSnapshot
  }

  private schedulePruneMissingSnapshotEntries(): void {
    if (this.disposed) {
      return
    }

    if (this.pruneMissingSnapshotPromise) {
      this.pruneMissingSnapshotQueued = true
      return
    }

    this.pruneMissingSnapshotPromise = Promise.resolve()
      .then(async () => {
        const snapshot = this.librarySnapshotService.peekSnapshotCache() ?? this.syncSnapshotFromDatabase()
        await this.pruneMissingSnapshotEntries(snapshot)
      })
      .catch((error) => {
        if (this.disposed) {
          return
        }
        console.warn('auto prune missing snapshot entries failed', {
          reason: error instanceof Error && error.message ? error.message : String(error),
        })
      })
      .finally(() => {
        if (this.disposed) {
          this.pruneMissingSnapshotPromise = null
          this.pruneMissingSnapshotQueued = false
          return
        }
        this.pruneMissingSnapshotPromise = null
        if (this.pruneMissingSnapshotQueued) {
          this.pruneMissingSnapshotQueued = false
          this.schedulePruneMissingSnapshotEntries()
        }
      })
  }

  async clearDatabase(): Promise<ClearDatabaseResponseDto> {
    this.database.clearDatabase()
    await Promise.all([
      fs.rm(path.join(this.rootDir, LEGACY_IMPORTS_DIR_NAME), { recursive: true, force: true }),
      fs.rm(this.coverOutputRootDir, { recursive: true, force: true }),
      fs.rm(this.thumbnailCacheRootDir, { recursive: true, force: true }),
      fs.rm(this.normalizedArchiveRootDir, { recursive: true, force: true }),
    ])

    this.importPathRegistry.clear()
    this.archiveNormalizationService.clear()
    this.mediaTokenService.clearActiveTokens()
    this.importTaskService.clearRuntimeState()
    this.librarySnapshotService.clearRuntimeState()
    this.readLibrarySnapshotInFlight = null
    this.readLibrarySnapshotLiteInFlight = null
    this.clearActiveReadTasks('read queue cleared: database cleared')
    this.clearQueuedReadTasks('read queue cleared: database cleared')
    this.invalidateCache()

    this.emitLibraryChanged({
      reason: 'clear-database',
      updated_at_ms: Date.now(),
    })

    return {
      cleared: true,
      cleared_at_ms: Date.now(),
    }
  }

  // Delegate handlers
  async readLibrarySnapshot(): Promise<LibrarySnapshotDto> {
    if (this.readLibrarySnapshotInFlight) {
      return this.readLibrarySnapshotInFlight
    }

    const readTask = this.libraryHandlers.readLibrarySnapshot().finally(() => {
      if (this.readLibrarySnapshotInFlight === readTask) {
        this.readLibrarySnapshotInFlight = null
      }
    })
    this.readLibrarySnapshotInFlight = readTask
    return readTask
  }

  async readLibrarySnapshotLite(): Promise<LibrarySnapshotLiteDto> {
    if (this.readLibrarySnapshotLiteInFlight) {
      return this.readLibrarySnapshotLiteInFlight
    }

    const readTask = this.libraryHandlers.readLibrarySnapshotLite().finally(() => {
      if (this.readLibrarySnapshotLiteInFlight === readTask) {
        this.readLibrarySnapshotLiteInFlight = null
      }
    })
    this.readLibrarySnapshotLiteInFlight = readTask
    return readTask
  }

  async readImageSidebarTree(request: ReadImageSidebarTreeRequestDto): Promise<ReadImageSidebarTreeResponseDto> {
    const requestKey = JSON.stringify(request)
    const activeTask = this.activeImageSidebarTreeTasks.find((item) => item.key === requestKey)
    if (activeTask) {
      return activeTask.promise
    }
    if (this.queuedImageSidebarTreeTask?.key === requestKey) {
      return this.queuedImageSidebarTreeTask.promise
    }

    const startTask = (signal: AbortSignal) => this.libraryHandlers.readImageSidebarTree(request, signal)
    if (this.activeImageSidebarTreeTasks.length < this.maxConcurrentImageSidebarTreeReads) {
      return this.startImageSidebarTreeTask(requestKey, startTask)
    }

    const nextQueuedTask = this.createQueuedReadTask(requestKey, startTask)
    if (this.queuedImageSidebarTreeTask) {
      this.queuedImageSidebarTreeTask.resolve(nextQueuedTask.promise)
    }
    this.queuedImageSidebarTreeTask = nextQueuedTask
    this.supersedeActiveImageSidebarTreeTask(requestKey, nextQueuedTask.promise)
    this.startQueuedImageSidebarTreeTaskIfPossible()
    return nextQueuedTask.promise
  }

  async readImagePage(request: ReadImagePageRequestDto): Promise<ReadImagePageResponseDto> {
    const requestKey = JSON.stringify(request)
    const activeTask = this.activeImagePageTasks.find((item) => item.key === requestKey)
    if (activeTask) {
      return activeTask.promise
    }
    if (this.queuedImagePageTask?.key === requestKey) {
      return this.queuedImagePageTask.promise
    }

    const startTask = (signal: AbortSignal) => this.libraryHandlers.readImagePage(request, signal)
    if (this.activeImagePageTasks.length < this.maxConcurrentImagePageReads) {
      return this.startImagePageTask(requestKey, startTask)
    }

    const nextQueuedTask = this.createQueuedReadTask(requestKey, startTask)
    if (this.queuedImagePageTask) {
      this.queuedImagePageTask.resolve(nextQueuedTask.promise)
    }
    this.queuedImagePageTask = nextQueuedTask
    this.supersedeActiveImagePageTask(requestKey, nextQueuedTask.promise)
    this.startQueuedImagePageTaskIfPossible()
    return nextQueuedTask.promise
  }

  async readImageMetadata(request: ReadImageMetadataRequestDto): Promise<ReadImageMetadataResponseDto> {
    return this.libraryHandlers.readImageMetadata(request)
  }

  async writePackageGrade(request: WritePackageGradeRequestDto): Promise<WritePackageGradeResponseDto> {
    return this.libraryHandlers.writePackageGrade(request)
  }

  async setImageHidden(request: SetImageHiddenRequestDto): Promise<SetImageHiddenResponseDto> {
    return this.managementHandlers.setImageHidden(request)
  }

  async deleteImageItems(request: DeleteImageItemsRequestDto): Promise<DeleteImageItemsResponseDto> {
    return this.managementHandlers.deleteImageItems(request)
  }

  async deleteSidebarNodes(request: DeleteSidebarNodesRequestDto): Promise<DeleteSidebarNodesResponseDto> {
    return this.managementHandlers.deleteSidebarNodes(request)
  }

  async moveSidebarNodes(request: MoveSidebarNodesRequestDto): Promise<MoveSidebarNodesResponseDto> {
    return this.managementHandlers.moveSidebarNodes(request)
  }

  async renameSidebarNode(request: RenameSidebarNodeRequestDto): Promise<RenameSidebarNodeResponseDto> {
    return this.managementHandlers.renameSidebarNode(request)
  }

  async renameSidebarNodes(request: RenameSidebarNodesRequestDto): Promise<RenameSidebarNodesResponseDto> {
    return this.managementHandlers.renameSidebarNodes(request)
  }

  async renameItems(request: RenameItemsRequestDto): Promise<RenameItemsResponseDto> {
    return this.managementHandlers.renameItems(request)
  }

  async startManageAdReview(request: StartManageAdReviewRequestDto): Promise<StartManageAdReviewResponseDto> {
    return this.managementHandlers.startManageAdReview(request)
  }

  async readManageAdReviewTask(request: ReadManageAdReviewTaskRequestDto): Promise<ReadManageAdReviewTaskResponseDto> {
    return this.managementHandlers.readManageAdReviewTask(request)
  }

  async pauseManageAdReviewTask(request: PauseManageAdReviewTaskRequestDto): Promise<PauseManageAdReviewTaskResponseDto> {
    return this.managementHandlers.pauseManageAdReviewTask(request)
  }

  async testAdReviewVisionModel(request: TestAdReviewVisionModelRequestDto): Promise<TestAdReviewVisionModelResponseDto> {
    return this.managementHandlers.testAdReviewVisionModel(request)
  }

  async confirmManageAdReviewDelete(request: ConfirmManageAdReviewDeleteRequestDto): Promise<ConfirmManageAdReviewDeleteResponseDto> {
    return this.managementHandlers.confirmManageAdReviewDelete(request)
  }

  async startManageCoverReview(request: StartManageCoverReviewRequestDto): Promise<StartManageCoverReviewResponseDto> {
    return this.managementHandlers.startManageCoverReview(request)
  }

  async readManageCoverReviewTask(request: ReadManageCoverReviewTaskRequestDto): Promise<ReadManageCoverReviewTaskResponseDto> {
    return this.managementHandlers.readManageCoverReviewTask(request)
  }

  async pauseManageCoverReviewTask(request: PauseManageCoverReviewTaskRequestDto): Promise<PauseManageCoverReviewTaskResponseDto> {
    return this.managementHandlers.pauseManageCoverReviewTask(request)
  }

  async confirmManageCoverReviewHide(request: ConfirmManageCoverReviewHideRequestDto): Promise<ConfirmManageCoverReviewHideResponseDto> {
    return this.managementHandlers.confirmManageCoverReviewHide(request)
  }

  async startManageSubtitleCleanup(
    request: StartManageSubtitleCleanupRequestDto,
  ): Promise<StartManageSubtitleCleanupResponseDto> {
    return this.managementHandlers.startManageSubtitleCleanup(request)
  }

  async readManageSubtitleCleanupTask(
    request: ReadManageSubtitleCleanupTaskRequestDto,
  ): Promise<ReadManageSubtitleCleanupTaskResponseDto> {
    return this.managementHandlers.readManageSubtitleCleanupTask(request)
  }

  async runManageSubtitleCleanup(
    request: RunManageSubtitleCleanupRequestDto,
  ): Promise<RunManageSubtitleCleanupResponseDto> {
    return this.managementHandlers.runManageSubtitleCleanup(request)
  }

  async saveManageSubtitleCleanup(
    request: SaveManageSubtitleCleanupRequestDto,
  ): Promise<SaveManageSubtitleCleanupResponseDto> {
    return this.managementHandlers.saveManageSubtitleCleanup(request)
  }

  async writePackageMetadata(request: WritePackageMetadataRequestDto): Promise<WritePackageMetadataResponseDto> {
    return this.libraryHandlers.writePackageMetadata(request)
  }

  async writePackageExternalMetadata(request: WritePackageExternalMetadataRequestDto): Promise<WritePackageExternalMetadataResponseDto> {
    return this.libraryHandlers.writePackageExternalMetadata(request)
  }

  async writeVideoMetadata(request: WriteVideoMetadataRequestDto): Promise<WriteVideoMetadataResponseDto> {
    return this.libraryHandlers.writeVideoMetadata(request)
  }

  async writeAudioMetadata(request: WriteAudioMetadataRequestDto): Promise<WriteAudioMetadataResponseDto> {
    return this.libraryHandlers.writeAudioMetadata(request)
  }

  async saveVideoCover(request: SaveVideoCoverRequestDto): Promise<SaveVideoCoverResponseDto> {
    return this.libraryHandlers.saveVideoCover(request)
  }

  async readPlaylist(): Promise<ReadPlaylistResponseDto> {
    return this.libraryHandlers.readPlaylist()
  }

  async writePlaylist(request: WritePlaylistRequestDto): Promise<WritePlaylistResponseDto> {
    return this.libraryHandlers.writePlaylist(request)
  }

  async listVideoSubtitles(request: ListVideoSubtitlesRequestDto): Promise<ListVideoSubtitlesResponseDto> {
    return this.libraryHandlers.listVideoSubtitles(request)
  }

  async prepareSubtitleTrack(request: PrepareSubtitleTrackRequestDto): Promise<PrepareSubtitleTrackResponseDto> {
    return this.libraryHandlers.prepareSubtitleTrack(request)
  }

  async enqueueImportTask(request: EnqueueImportTaskRequestDto): Promise<EnqueueImportTaskResponseDto> {
    return this.systemHandlers.enqueueImportTask(request)
  }

  async readImportTasks(): Promise<{ tasks: ImportTaskDto[] }> {
    return this.systemHandlers.readImportTasks()
  }

  async retryImportTask(request: RetryImportTaskRequestDto): Promise<RetryImportTaskResponseDto> {
    return this.systemHandlers.retryImportTask(request)
  }

  async resolveMediaResource(request: ResolveMediaResourceRequestDto): Promise<ResolveMediaResourceResponseDto> {
    return this.systemHandlers.resolveMediaResource(request)
  }

  async readMediaResourceByToken(token: string, rangeHeader: string | null): Promise<MediaProtocolResponsePayload> {
    return this.systemHandlers.readMediaResourceByToken(token, rangeHeader)
  }

  async readMediaResourceByTokenStream(token: string, rangeHeader: string | null, signal?: AbortSignal | null): Promise<MediaProtocolStreamResponsePayload> {
    return this.systemHandlers.readMediaResourceByTokenStream(token, rangeHeader, signal)
  }

  async readRuntimeCapabilities(): Promise<ReadRuntimeCapabilitiesResponseDto> {
    return this.systemHandlers.readRuntimeCapabilities()
  }

  async readSubtitleEngineStatus(): Promise<ReadSubtitleEngineStatusResponseDto> {
    return this.systemHandlers.readSubtitleEngineStatus()
  }

  async listSubtitleRemoteModels(): Promise<ListSubtitleRemoteModelsResponseDto> {
    return this.systemHandlers.listSubtitleRemoteModels()
  }

  async listSubtitleLocalModels(request: ListSubtitleLocalModelsRequestDto): Promise<ListSubtitleLocalModelsResponseDto> {
    return this.systemHandlers.listSubtitleLocalModels(request)
  }

  async startSubtitleModelDownload(request: StartSubtitleModelDownloadRequestDto): Promise<StartSubtitleModelDownloadResponseDto> {
    return this.systemHandlers.startSubtitleModelDownload(request)
  }

  async cancelSubtitleModelDownload(request: CancelSubtitleModelDownloadRequestDto): Promise<CancelSubtitleModelDownloadResponseDto> {
    return this.systemHandlers.cancelSubtitleModelDownload(request)
  }

  async readSubtitleModelDownloads(): Promise<ReadSubtitleModelDownloadsResponseDto> {
    return this.systemHandlers.readSubtitleModelDownloads()
  }

  async clearSubtitleLocalModel(request: ClearSubtitleLocalModelRequestDto): Promise<ClearSubtitleLocalModelResponseDto> {
    return this.systemHandlers.clearSubtitleLocalModel(request)
  }

  async readArchiveLoadStatus(): Promise<ReadArchiveLoadStatusResponseDto> {
    return this.systemHandlers.readArchiveLoadStatus()
  }

  async readMediaAccessAudit(): Promise<MediaAccessAuditResponseDto> {
    return this.systemHandlers.readMediaAccessAudit()
  }

  async readAppState(request: ReadAppStateRequestDto): Promise<ReadAppStateResponseDto> {
    return this.systemHandlers.readAppState(request)
  }

  async writeAppState(request: WriteAppStateRequestDto): Promise<WriteAppStateResponseDto> {
    return this.systemHandlers.writeAppState(request)
  }

  async searchExternalMetadata(request: SearchExternalMetadataRequestDto): Promise<SearchExternalMetadataResponseDto> {
    return this.systemHandlers.searchExternalMetadata(request)
  }
}
