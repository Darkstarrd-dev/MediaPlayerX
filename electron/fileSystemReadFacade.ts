import { promises as fs } from 'node:fs'
import path from 'node:path'

import {
  type EnqueueImportTaskRequestDto,
  type EnqueueImportTaskResponseDto,
  type ClearDatabaseResponseDto,
  type ImportTaskDto,
  type LibrarySnapshotDto,
  type MediaAccessAuditResponseDto,
  type MediaLocatorDto,
  type ReadPlaylistResponseDto,
  type ReadAppStateRequestDto,
  type ReadAppStateResponseDto,
  type ReadImageMetadataRequestDto,
  type ReadImageMetadataResponseDto,
  type ReadRuntimeCapabilitiesResponseDto,
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
  type SetImageHiddenRequestDto,
  type SetImageHiddenResponseDto,
  type DeleteImageItemsRequestDto,
  type DeleteImageItemsResponseDto,
  type DeleteSidebarNodesRequestDto,
  type DeleteSidebarNodesResponseDto,
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
  type WritePlaylistRequestDto,
  type WritePlaylistResponseDto,
  type WritePackageMetadataRequestDto,
  type WritePackageMetadataResponseDto,
  type WritePackageExternalMetadataRequestDto,
  type WritePackageExternalMetadataResponseDto,
  type WriteVideoMetadataRequestDto,
  type WriteVideoMetadataResponseDto,
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
import { MediaLibraryDatabase } from './mediaLibraryDatabase'
import { MediaTokenService } from './services/file-system-read/mediaTokenService'
import { ImportPathRegistry } from './services/file-system-read/importPathRegistry'
import {
  ARCHIVE_EXTENSIONS,
  ARCHIVE_NORMALIZE_DIR_NAME,
  ARCHIVE_NORMALIZE_IDLE_MS,
  ARCHIVE_NORMALIZE_RECHECK_MS,
  ARCHIVE_SCAN_CONCURRENCY,
  COLOR_PALETTE,
  DIRECTORY_SCAN_CONCURRENCY,
  FFMPEG_BIN,
  FFPROBE_BIN,
  IMAGE_EXTENSIONS,
  IMAGE_EXTENSIONS_FOR_WEBP_CONVERT,
  LEGACY_IMPORTS_DIR_NAME,
  MEDIA_TOKEN_TTL_MS,
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
import { LibrarySnapshotService } from './services/file-system-read/librarySnapshotService'
import { ManagementMutationService } from './services/file-system-read/managementMutationService'
import { ManageAdReviewService } from './services/file-system-read/manageAdReviewService'
import { MediaResourceService } from './services/file-system-read/mediaResourceService'
import { RuntimeDependencyService } from './services/file-system-read/runtimeDependencyService'
import { ServiceEventBus } from './services/file-system-read/serviceEventBus'
import { FileSystemFacadeContext } from './facade/types'
import { FileSystemLibraryHandlers } from './facade/FileSystemLibraryHandlers'
import { FileSystemManagementHandlers } from './facade/FileSystemManagementHandlers'
import { FileSystemSystemHandlers } from './facade/FileSystemSystemHandlers'

export interface FileSystemMediaReadServiceOptions {
  rootDir: string
  databaseFilePath?: string
  thumbnailCacheRootDir?: string
  onLibraryChanged?: LibraryChangedListener
  onArchiveLoadStatusChanged?: ArchiveLoadStatusListener
}

export class FileSystemMediaReadService implements FileSystemReadServiceEvents {
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
  private readonly mediaResourceService: MediaResourceService
  private readonly runtimeDependencyService: RuntimeDependencyService
  private readonly eventBus: ServiceEventBus

  private readonly libraryHandlers: FileSystemLibraryHandlers
  private readonly managementHandlers: FileSystemManagementHandlers
  private readonly systemHandlers: FileSystemSystemHandlers

  private stateHydrated = false

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

    this.archiveNormalizationService = new ArchiveNormalizationService({
      idleMs: ARCHIVE_NORMALIZE_IDLE_MS,
      recheckMs: ARCHIVE_NORMALIZE_RECHECK_MS,
      isTargetEligible: (sourceArchivePath) => this.isArchiveNormalizationTargetEligible(sourceArchivePath),
      hasRunningImportTasks: () => this.importTaskService.hasRunningImportTasks(),
      isSnapshotLoading: () => this.librarySnapshotService.isSnapshotLoading(),
      onArchiveNormalized: (sourcePath, outputPath) => this.replaceImportedFileSourcePath(sourcePath, outputPath),
      emitLibraryChanged: (payload) => this.emitLibraryChanged(payload as any),
      emitArchiveLoadStatusChanged: (payload) => this.eventBus.emit('archiveLoadStatusChanged', payload),
    })

    this.librarySnapshotService = new LibrarySnapshotService({
      rootDir: this.rootDir,
      normalizedArchiveRootDir: this.normalizedArchiveRootDir,
      legacyImportsDirName: LEGACY_IMPORTS_DIR_NAME,
      database: this.database,
      importPathRegistry: this.importPathRegistry,
      imageExtensions: IMAGE_EXTENSIONS,
      videoExtensions: VIDEO_EXTENSIONS,
      archiveExtensions: ARCHIVE_EXTENSIONS,
      colorPalette: COLOR_PALETTE,
      imageExtensionsForWebpConvert: IMAGE_EXTENSIONS_FOR_WEBP_CONVERT,
      directoryScanConcurrency: DIRECTORY_SCAN_CONCURRENCY,
      archiveScanConcurrency: ARCHIVE_SCAN_CONCURRENCY,
      ffmpegBin: FFMPEG_BIN,
      ffprobeBin: FFPROBE_BIN,
      zipGeneralPurposeFlagEncrypted: ZIP_GENERAL_PURPOSE_FLAG_ENCRYPTED,
      zipCompressionStore: ZIP_COMPRESSION_STORE,
      zipCompressionDeflate: ZIP_COMPRESSION_DEFLATE,
      ensureRuntimeDependencies: () => this.runtimeDependencyService.ensureRuntimeDependencies(),
      queueRar7zNormalization: (path, priority) => this.queueRar7zNormalization(path, priority),
      getPackageGradeOverridesBySourceId: () => this.database.readPackageGrades(),
      getVideoCoverOverridesByVideoId: () => this.database.readVideoCovers() as any,
      getVideoMetadataOverridesByVideoId: () => this.database.readVideoMetadata() as any,
    })

    this.importTaskService = new ImportTaskService({
      rootDir: this.rootDir,
      legacyImportsDirName: LEGACY_IMPORTS_DIR_NAME,
      imageExtensions: IMAGE_EXTENSIONS,
      videoExtensions: VIDEO_EXTENSIONS,
      archiveExtensions: ARCHIVE_EXTENSIONS,
      database: this.database,
      invalidateCache: () => this.invalidateCache(),
      ensureSnapshotLoaded: () => this.ensureSnapshotLoaded(),
      emitLibraryChanged: (payload) => this.emitLibraryChanged(payload as any),
    })

    this.libraryReadWriteService = new LibraryReadWriteService({
      database: this.database,
      ffmpegBin: FFMPEG_BIN,
      coverOutputRootDir: this.coverOutputRootDir,
      packageGradeOverridesBySourceId: this.database.readPackageGrades(),
      videoCoverOverridesByVideoId: this.database.readVideoCovers() as any,
      videoMetadataOverridesByVideoId: this.database.readVideoMetadata() as any,
      ensureSnapshotLoaded: () => this.ensureSnapshotLoaded(),
      ensureRuntimeDependencies: () => this.runtimeDependencyService.ensureRuntimeDependencies(),
      markInteractiveRead: () => this.markInteractiveRead(),
      isRar7zPath: (filePath) => this.isRar7zPath(filePath),
      queueRar7zNormalization: (path, priority) => this.queueRar7zNormalization(path, priority),
      emitLibraryChanged: (payload) => this.emitLibraryChanged(payload as any),
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
      buildMediaAccessContext: () => this.buildMediaAccessContext(),
      emitLibraryChanged: (payload) => this.emitLibraryChanged(payload as any),
    })

    this.manageAdReviewService = new ManageAdReviewService({
      database: this.database,
      ensureSnapshotLoaded: () => this.ensureSnapshotLoaded(),
      buildMediaAccessContext: () => this.buildMediaAccessContext(),
      getZipEntryIndexByPath: () => this.librarySnapshotService.getZipEntryIndexByPath(),
      deleteImageItems: (request) => this.deleteImageItems(request),
    })

    this.mediaResourceService = new MediaResourceService({
      mediaProtocolScheme: MEDIA_PROTOCOL_SCHEME,
      thumbnailCacheRootDir: this.thumbnailCacheRootDir,
      archiveNormalizeRecheckMs: ARCHIVE_NORMALIZE_RECHECK_MS,
      mediaTokenService: this.mediaTokenService,
      ensureSnapshotLoaded: () => this.ensureSnapshotLoaded(),
      markInteractiveRead: () => this.markInteractiveRead(),
      buildMediaAccessContext: () => this.buildMediaAccessContext(),
      ensureRuntimeDependencies: () => this.runtimeDependencyService.ensureRuntimeDependencies(),
      readImageBufferForThumbnail: (locator) => this.librarySnapshotService.readImageBufferForThumbnail(locator),
      onThumbnailRenderingStart: () => this.emitLibraryChanged({ reason: 'thumbnail-rendering-start', updated_at_ms: Date.now() }),
      onThumbnailRenderingEnd: () => this.emitLibraryChanged({ reason: 'thumbnail-rendering-end', updated_at_ms: Date.now() }),
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
      mediaResourceService: this.mediaResourceService,
      runtimeDependencyService: this.runtimeDependencyService,
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
  }

  onLibraryChanged(listener: LibraryChangedListener): () => void {
    return this.eventBus.on('libraryChanged', listener)
  }

  onArchiveLoadStatusChanged(listener: ArchiveLoadStatusListener): () => void {
    return this.eventBus.on('archiveLoadStatusChanged', listener)
  }

  private emitLibraryChanged(payload: LibraryChangedEventPayload): void {
    this.eventBus.emit('libraryChanged', payload)
    if (payload.reason !== 'import-task-updated' && payload.reason !== 'archive-load-status-updated') {
      this.scheduleArchiveNormalizationDrain(ARCHIVE_NORMALIZE_IDLE_MS)
    }
  }

  private markInteractiveRead(): void {
    this.scheduleArchiveNormalizationDrain(ARCHIVE_NORMALIZE_IDLE_MS)
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

  dispose(): void {
    this.archiveNormalizationService.dispose()
    this.eventBus.clear()
    this.database.dispose()
  }

  private async ensureStateLoaded(): Promise<void> {
    if (this.stateHydrated) {
      return
    }
    this.importPathRegistry.hydrate(this.database.readImportSources())
    this.stateHydrated = true
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
    if (didRemove) {
      const nextSources = this.importPathRegistry.getImportSources()
      this.database.writeImportSources({ directories: nextSources.directories, files: nextSources.files })
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
    return this.pruneMissingSnapshotEntries(snapshot)
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

    if (missingPaths.size === 0) {
      return snapshot
    }

    const pathsToPrune = Array.from(missingPaths)
    const deleted = this.database.deleteSnapshotEntriesByPaths(pathsToPrune)
    if (deleted.deletedSourceCount === 0 && deleted.deletedVideoCount === 0) {
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
    return this.libraryHandlers.readLibrarySnapshot()
  }

  async readImageSidebarTree(request: ReadImageSidebarTreeRequestDto): Promise<ReadImageSidebarTreeResponseDto> {
    return this.libraryHandlers.readImageSidebarTree(request)
  }

  async readImagePage(request: ReadImagePageRequestDto): Promise<ReadImagePageResponseDto> {
    return this.libraryHandlers.readImagePage(request)
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

  async writePackageMetadata(request: WritePackageMetadataRequestDto): Promise<WritePackageMetadataResponseDto> {
    return this.libraryHandlers.writePackageMetadata(request)
  }

  async writePackageExternalMetadata(request: WritePackageExternalMetadataRequestDto): Promise<WritePackageExternalMetadataResponseDto> {
    return this.libraryHandlers.writePackageExternalMetadata(request)
  }

  async writeVideoMetadata(request: WriteVideoMetadataRequestDto): Promise<WriteVideoMetadataResponseDto> {
    return this.libraryHandlers.writeVideoMetadata(request)
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

  async searchExternalMetadata(request: any): Promise<any> {
    return this.systemHandlers.searchExternalMetadata(request)
  }
}
