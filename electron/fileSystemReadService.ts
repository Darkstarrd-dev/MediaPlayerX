import { createHash } from 'node:crypto'
import { existsSync, promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Worker } from 'node:worker_threads'

import {
  clearDatabaseResponseSchema,
  enqueueImportTaskResponseSchema,
  librarySnapshotDtoSchema,
  mediaAccessAuditResponseSchema,
  readImportTasksResponseSchema,
  readArchiveLoadStatusResponseSchema,
  readPlaylistResponseSchema,
  readImageMetadataResponseSchema,
  readImagePageResponseSchema,
  readImageSidebarTreeResponseSchema,
  resolveMediaResourceResponseSchema,
  retryImportTaskResponseSchema,
  saveVideoCoverResponseSchema,
  writePlaylistResponseSchema,
  writePackageGradeResponseSchema,
  readAppStateResponseSchema,
  writeAppStateResponseSchema,
  type EnqueueImportTaskRequestDto,
  type EnqueueImportTaskResponseDto,
  type ClearDatabaseResponseDto,
  type FocusedImageRefDto,
  type ImportTaskDto,
  type ImportTaskSourceDto,
  type ImagePackageDto,
  type LibrarySnapshotDto,
  type MediaAccessAuditResponseDto,
  type MediaLocatorDto,
  type ReadPlaylistResponseDto,
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
  type VideoItemDto,
  type WritePlaylistRequestDto,
  type WritePlaylistResponseDto,
  type WritePackageMetadataRequestDto,
  type WritePackageMetadataResponseDto,
  type WriteVideoMetadataRequestDto,
  type WriteVideoMetadataResponseDto,
  type WritePackageGradeRequestDto,
  type WritePackageGradeResponseDto,
} from '../src/contracts/backend'
import { MEDIA_PROTOCOL_SCHEME } from './channels'
import { parallelMapLimit } from './fileSystemAsyncUtils'
import {
  normalizeArchiveToStoreZipInPlace,
  resolveArchiveReplacementZipPath,
} from './archiveWasmExtractor'
import {
  convertDirectoryImagesToWebp90,
  extractZipWithPowerShell,
} from './fileSystemArchiveNormalizeHelpers'
import { collectMediaFiles, type FileRecord } from './fileSystemFileCollector'
import {
  detectMimeTypeByExtension,
  isPathInsideRoot,
  makeStableId,
  normalizeAllowlistKey,
  deriveVideoWorkTitleFromFileName,
  toAbsoluteTreePath,
  toDeterministicCoverColor,
  toSafeFsName,
  toSafeSizeKb,
  toSafeSizeMb,
} from './fileSystemServiceHelpers'
import { createArchiveSource, createDirectorySource } from './fileSystemSourceFactories'
import {
  applyPackageMetadataWrite,
  applyVideoMetadataWrite,
  type PersistedVideoMetadataRecord,
} from './fileSystemMetadataWriters'
import { executeImportTask } from './fileSystemImportTasks'
import {
  assertLocatorAllowed,
  isPathAllowlisted,
  MediaAccessError,
  type MediaAccessGuardContext,
  type MediaAuditRejectReason,
} from './fileSystemMediaAccessGuard'
import {
  readArchiveEntryMedia,
  readArchiveEntryMediaStream,
  readFilesystemMedia,
  readFilesystemMediaStream,
  type MediaProtocolResponsePayload,
  type MediaProtocolStreamResponsePayload,
} from './fileSystemMediaReaders'
import { MediaLibraryDatabase } from './mediaLibraryDatabase'
import { filterSources as filterLibrarySources } from './fileSystemSourceFilter'
import { maybeResolveThumbnailLocator } from './fileSystemThumbnailResolver'
import { captureVideoCoverImage } from './fileSystemVideoCoverCapture'
import {
  probeImageDimensionsFromFile,
  probeVideoMetadata,
} from './fileSystemRuntimeHelpers'
import { buildImageSidebarTree } from './fileSystemSidebarTree'
import { writeStoredZipFromDirectory, writeStoredZipFromEntries } from './fileSystemZipStoreWriter'
import { MediaTokenService, type MediaTokenRecord } from './services/file-system-read/mediaTokenService'
import { ImportPathRegistry } from './services/file-system-read/importPathRegistry'
import { ArchiveNormalizationService } from './services/file-system-read/archiveNormalizationService'
import { ImportTaskService } from './services/file-system-read/importTaskService'
import {
  LibrarySnapshotService,
  type PersistedVideoCoverRecord,
} from './services/file-system-read/librarySnapshotService'
import { ManagementMutationService } from './services/file-system-read/managementMutationService'
import { MediaResourceService } from './services/file-system-read/mediaResourceService'
import { LibraryReadWriteService } from './services/file-system-read/libraryReadWriteService'
import {
  RuntimeDependencyService,
  type RuntimeDependencySnapshot,
} from './services/file-system-read/runtimeDependencyService'
import { ServiceEventBus } from './services/file-system-read/serviceEventBus'
import {
  isSafeArchiveEntryName,
  readZipEntryContent,
  scanZipCentralEntries,
  type ZipCentralEntry,
} from './zipArchiveHelpers'

function resolveConcurrency(rawValue: string | undefined, fallback: number, max: number): number {
  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }

  return Math.max(1, Math.min(max, Math.round(parsed)))
}

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'])
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mkv', '.mov'])
const ARCHIVE_EXTENSIONS = new Set(['.zip', '.rar', '.7z'])
const COLOR_PALETTE = ['#dd6b66', '#d58b45', '#6da249', '#4aa6a1', '#4f86cf', '#8868d6']

const ZIP_GENERAL_PURPOSE_FLAG_ENCRYPTED = 0x0001
const ZIP_COMPRESSION_STORE = 0
const ZIP_COMPRESSION_DEFLATE = 8

const MEDIA_TOKEN_TTL_MS = 5 * 60 * 1000
const FFMPEG_BIN = process.env.MEDIA_PLAYERX_FFMPEG_BIN ?? 'ffmpeg'
const FFPROBE_BIN = process.env.MEDIA_PLAYERX_FFPROBE_BIN ?? 'ffprobe'
const ARCHIVE_NORMALIZE_DIR_NAME = '.mediaplayerx/normalized-archives'
const THUMBNAIL_CACHE_DIR_NAME = '.mediaplayerx/thumbnail-cache'
const LEGACY_IMPORTS_DIR_NAME = 'imports'
const DIRECTORY_SCAN_CONCURRENCY = resolveConcurrency(process.env.MEDIA_PLAYERX_SCAN_CONCURRENCY, 16, 64)
const ARCHIVE_SCAN_CONCURRENCY = resolveConcurrency(process.env.MEDIA_PLAYERX_ARCHIVE_SCAN_CONCURRENCY, 10, 32)
const ARCHIVE_NORMALIZE_IDLE_MS = resolveConcurrency(process.env.MEDIA_PLAYERX_ARCHIVE_NORMALIZE_IDLE_MS, 1800, 10_000)
const ARCHIVE_NORMALIZE_RECHECK_MS = resolveConcurrency(process.env.MEDIA_PLAYERX_ARCHIVE_NORMALIZE_RECHECK_MS, 400, 5_000)

const IMAGE_EXTENSIONS_FOR_WEBP_CONVERT = new Set(['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp'])

export interface LibraryChangedEventPayload {
  reason:
    | 'import-task-finished'
    | 'archive-normalized'
    | 'archive-normalize-failed'
    | 'clear-database'
    | 'write-package-grade'
    | 'write-package-metadata'
    | 'write-video-metadata'
    | 'write-video-cover'
    | 'write-playlist'
    | 'manage-hide'
    | 'manage-delete-image-items'
    | 'manage-delete-sidebar-nodes'
  updated_at_ms: number
}

type LibraryChangedListener = (payload: LibraryChangedEventPayload) => void

type ArchiveLoadStatusListener = (payload: ReadArchiveLoadStatusResponseDto) => void

interface FileSystemReadServiceEvents {
  libraryChanged: LibraryChangedEventPayload
  archiveLoadStatus: ReadArchiveLoadStatusResponseDto
}

export class FileSystemMediaReadService {
  private readonly rootDir: string

  private readonly normalizedArchiveRootDir: string

  private readonly thumbnailCacheRootDir: string

  private readonly coverOutputRootDir: string

  private readonly database: MediaLibraryDatabase

  private stateHydrated = false

  private readonly mediaTokenService = new MediaTokenService(MEDIA_TOKEN_TTL_MS)

  private packageGradeOverridesBySourceId = new Map<string, number | null>()

  private videoCoverOverridesByVideoId = new Map<string, PersistedVideoCoverRecord>()

  private videoMetadataOverridesByVideoId = new Map<string, PersistedVideoMetadataRecord>()

  private readonly importPathRegistry = new ImportPathRegistry()

  private readonly runtimeDependencyService = new RuntimeDependencyService(FFMPEG_BIN, FFPROBE_BIN)

  private readonly eventBus = new ServiceEventBus<FileSystemReadServiceEvents>()

  private readonly archiveNormalizationService: ArchiveNormalizationService

  private readonly librarySnapshotService: LibrarySnapshotService

  private readonly importTaskService: ImportTaskService

  private readonly libraryReadWriteService: LibraryReadWriteService

  private readonly managementMutationService: ManagementMutationService

  private readonly mediaResourceService: MediaResourceService

  constructor(rootDir: string) {
    this.rootDir = path.resolve(rootDir)
    this.normalizedArchiveRootDir = path.join(this.rootDir, ARCHIVE_NORMALIZE_DIR_NAME)
    this.thumbnailCacheRootDir = path.join(this.rootDir, THUMBNAIL_CACHE_DIR_NAME)
    this.coverOutputRootDir = path.join(this.rootDir, '.mediaplayerx', 'covers')
    this.database = new MediaLibraryDatabase(this.rootDir)

    this.archiveNormalizationService = new ArchiveNormalizationService({
      idleMs: ARCHIVE_NORMALIZE_IDLE_MS,
      recheckMs: ARCHIVE_NORMALIZE_RECHECK_MS,
      isTargetEligible: (sourceArchivePath) => this.isArchiveNormalizationTargetEligible(sourceArchivePath),
      hasRunningImportTasks: () => this.importTaskService.hasRunningImportTasks(),
      isSnapshotLoading: () => this.librarySnapshotService.isSnapshotLoading(),
      onArchiveNormalized: async (sourceArchivePath, outputZipPath) => {
        await this.replaceImportedFileSourcePath(sourceArchivePath, outputZipPath)
        this.invalidateCache()
      },
      emitLibraryChanged: (payload) => this.emitLibraryChanged(payload),
      emitArchiveLoadStatusChanged: (payload) => this.emitArchiveLoadStatusChanged(payload),
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
      ensureRuntimeDependencies: () => this.ensureRuntimeDependencies(),
      queueRar7zNormalization: (sourceArchivePath, priority) =>
        this.archiveNormalizationService.queueRar7zNormalization(sourceArchivePath, priority),
      getPackageGradeOverridesBySourceId: () => this.packageGradeOverridesBySourceId,
      getVideoCoverOverridesByVideoId: () => this.videoCoverOverridesByVideoId,
      getVideoMetadataOverridesByVideoId: () => this.videoMetadataOverridesByVideoId,
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
      emitLibraryChanged: (payload) => this.emitLibraryChanged(payload),
    })

    this.libraryReadWriteService = new LibraryReadWriteService({
      database: this.database,
      ffmpegBin: FFMPEG_BIN,
      coverOutputRootDir: this.coverOutputRootDir,
      packageGradeOverridesBySourceId: this.packageGradeOverridesBySourceId,
      videoCoverOverridesByVideoId: this.videoCoverOverridesByVideoId,
      videoMetadataOverridesByVideoId: this.videoMetadataOverridesByVideoId,
      ensureSnapshotLoaded: () => this.ensureSnapshotLoaded(),
      ensureRuntimeDependencies: () => this.ensureRuntimeDependencies(),
      markInteractiveRead: () => this.markInteractiveRead(),
      isRar7zPath: (filePath) => this.isRar7zPath(filePath),
      queueRar7zNormalization: (sourceArchivePath, priority) => this.queueRar7zNormalization(sourceArchivePath, priority),
      emitLibraryChanged: (payload) => this.emitLibraryChanged(payload as LibraryChangedEventPayload),
    })

    this.managementMutationService = new ManagementMutationService({
      rootDir: this.rootDir,
      thumbnailCacheRootDir: this.thumbnailCacheRootDir,
      database: this.database,
      importPathRegistry: this.importPathRegistry,
      ensureStateLoaded: () => this.ensureStateLoaded(),
      ensureSnapshotLoaded: () => this.ensureSnapshotLoaded(),
      syncSnapshotFromDatabase: () => this.syncSnapshotFromDatabase(),
      refreshArchiveIndexesForPaths: (archivePaths) => this.refreshArchiveIndexesForPaths(archivePaths),
      pruneArchiveIndexesByDeletedRoots: (deletedPaths) => this.pruneArchiveIndexesByDeletedRoots(deletedPaths),
      removeImportSourcePaths: (pathsToRemove) => this.removeImportSourcePaths(pathsToRemove),
      buildMediaAccessContext: () => this.buildMediaAccessContext(),
      emitLibraryChanged: (payload) => this.emitLibraryChanged(payload as LibraryChangedEventPayload),
    })

    this.mediaResourceService = new MediaResourceService({
      mediaProtocolScheme: MEDIA_PROTOCOL_SCHEME,
      thumbnailCacheRootDir: this.thumbnailCacheRootDir,
      archiveNormalizeRecheckMs: ARCHIVE_NORMALIZE_RECHECK_MS,
      mediaTokenService: this.mediaTokenService,
      ensureSnapshotLoaded: () => this.ensureSnapshotLoaded(),
      markInteractiveRead: () => this.markInteractiveRead(),
      buildMediaAccessContext: () => this.buildMediaAccessContext(),
      ensureRuntimeDependencies: () => this.ensureRuntimeDependencies(),
      readImageBufferForThumbnail: (locator) => this.readImageBufferForThumbnail(locator),
      onThumbnailRenderingStart: () => this.archiveNormalizationService.onThumbnailRenderingStart(),
      onThumbnailRenderingEnd: () => this.archiveNormalizationService.onThumbnailRenderingEnd(),
      hasPendingArchiveNormalization: () => this.archiveNormalizationService.hasPending(),
      scheduleArchiveNormalizationDrain: (delayMs) => this.scheduleArchiveNormalizationDrain(delayMs),
      getZipEntryIndexByPath: () => this.librarySnapshotService.getZipEntryIndexByPath(),
    })

    this.importTaskService.recoverInterruptedImportTasks()
  }

  onLibraryChanged(listener: LibraryChangedListener): () => void {
    return this.eventBus.on('libraryChanged', listener)
  }

  onArchiveLoadStatusChanged(listener: ArchiveLoadStatusListener): () => void {
    return this.eventBus.on('archiveLoadStatus', listener)
  }

  private emitLibraryChanged(payload: LibraryChangedEventPayload): void {
    this.eventBus.emit('libraryChanged', payload)
  }

  private emitArchiveLoadStatusChanged(payload: ReadArchiveLoadStatusResponseDto): void {
    this.eventBus.emit('archiveLoadStatus', payload)
  }

  private markInteractiveRead(): void {
    this.archiveNormalizationService.onInteractiveRead()
  }

  private isRar7zPath(filePath: string): boolean {
    const extension = path.extname(filePath).toLowerCase()
    return extension === '.rar' || extension === '.7z'
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

  private isArchiveNormalizationTargetEligible(sourceArchivePath: string): boolean {
    if (!this.isRar7zPath(sourceArchivePath)) {
      return false
    }
    return isPathAllowlisted(sourceArchivePath, this.buildMediaAccessContext())
  }

  private scheduleArchiveNormalizationDrain(delayMs = 0): void {
    this.archiveNormalizationService.scheduleDrain(delayMs)
  }

  private queueRar7zNormalization(sourceArchivePath: string, priority: 'low' | 'high' = 'low'): void {
    this.archiveNormalizationService.queueRar7zNormalization(sourceArchivePath, priority)
  }

  invalidateCache(): void {
    this.librarySnapshotService.invalidateCache()
    this.stateHydrated = false
    // Keep archive allowlists until next snapshot is ready.
    // This avoids transient "entry not allowlisted" errors while a rescan is in progress.
    // Keep active media tokens until TTL expiry to avoid transient 404
    // during background refreshes or libraryChanged fan-out.
    this.cleanupExpiredTokens()
  }

  dispose(): void {
    this.archiveNormalizationService.dispose()
    this.eventBus.clear()
    this.database.dispose()
  }

  private cleanupExpiredTokens(): void {
    this.mediaTokenService.cleanupExpiredTokens()
  }

  private async ensureStateLoaded(): Promise<void> {
    if (this.stateHydrated) {
      return
    }

    this.packageGradeOverridesBySourceId = this.database.readPackageGrades()
    this.videoCoverOverridesByVideoId = this.database.readVideoCovers()
    this.videoMetadataOverridesByVideoId = this.database.readVideoMetadata()

    const rawImportSources = this.database.readImportSources()
    this.importPathRegistry.hydrate(rawImportSources)
    this.stateHydrated = true
  }

  private async replaceImportedFileSourcePath(sourceArchivePath: string, outputZipPath: string): Promise<void> {
    await this.ensureStateLoaded()

    const didReplace = this.importPathRegistry.replaceImportedFileSourcePath(sourceArchivePath, outputZipPath)
    if (!didReplace) {
      return
    }

    const nextSources = this.importPathRegistry.getImportSources()
    this.database.writeImportSources({
      directories: nextSources.directories,
      files: nextSources.files,
    })
  }

  private async removeImportSourcePaths(pathsToRemove: string[]): Promise<void> {
    await this.ensureStateLoaded()
    const didRemove = this.importPathRegistry.removeImportSourcePaths(pathsToRemove)
    if (!didRemove) {
      return
    }

    const nextSources = this.importPathRegistry.getImportSources()
    this.database.writeImportSources({
      directories: nextSources.directories,
      files: nextSources.files,
    })
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

  private async ensureRuntimeDependencies(): Promise<RuntimeDependencySnapshot> {
    return this.runtimeDependencyService.ensureRuntimeDependencies()
  }

  async readRuntimeCapabilities(): Promise<ReadRuntimeCapabilitiesResponseDto> {
    return this.runtimeDependencyService.readRuntimeCapabilities()
  }

  async readArchiveLoadStatus(): Promise<ReadArchiveLoadStatusResponseDto> {
    await this.ensureStateLoaded()
    return this.archiveNormalizationService.readArchiveLoadStatus()
  }

  async clearDatabase(): Promise<ClearDatabaseResponseDto> {
    this.database.clearDatabase()

    // Clear runtime artifacts and caches so "清除数据库" can reset visible imported content.
    // Keep runtime workspace directories themselves; only wipe their contents.
    await Promise.all([
      // Legacy copy-mode artifacts.
      fs.rm(path.join(this.rootDir, LEGACY_IMPORTS_DIR_NAME), { recursive: true, force: true }),
      fs.rm(this.coverOutputRootDir, { recursive: true, force: true }),
      fs.rm(this.thumbnailCacheRootDir, { recursive: true, force: true }),
      fs.rm(this.normalizedArchiveRootDir, { recursive: true, force: true }),
    ])

    this.packageGradeOverridesBySourceId = new Map()
    this.videoCoverOverridesByVideoId = new Map()
    this.videoMetadataOverridesByVideoId = new Map()
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

    return clearDatabaseResponseSchema.parse({
      cleared: true,
      cleared_at_ms: Date.now(),
    })
  }

  async readMediaAccessAudit(): Promise<MediaAccessAuditResponseDto> {
    return this.mediaResourceService.readMediaAccessAudit()
  }

  private async ensureSnapshotLoaded(): Promise<LibrarySnapshotDto> {
    return this.librarySnapshotService.ensureSnapshotLoaded(() => this.ensureStateLoaded())
  }

  private async readImageBufferForThumbnail(locator: MediaLocatorDto): Promise<Buffer> {
    return this.librarySnapshotService.readImageBufferForThumbnail(locator)
  }

  async readLibrarySnapshot(): Promise<LibrarySnapshotDto> {
    this.markInteractiveRead()
    return this.ensureSnapshotLoaded()
  }

  async readImageSidebarTree(
    request: ReadImageSidebarTreeRequestDto,
  ): Promise<ReadImageSidebarTreeResponseDto> {
    return this.libraryReadWriteService.readImageSidebarTree(request)
  }

  async readImagePage(request: ReadImagePageRequestDto): Promise<ReadImagePageResponseDto> {
    return this.libraryReadWriteService.readImagePage(request)
  }

  async readImageMetadata(
    request: ReadImageMetadataRequestDto,
  ): Promise<ReadImageMetadataResponseDto> {
    return this.libraryReadWriteService.readImageMetadata(request)
  }

  async writePackageGrade(
    request: WritePackageGradeRequestDto,
  ): Promise<WritePackageGradeResponseDto> {
    return this.libraryReadWriteService.writePackageGrade(request)
  }

  async setImageHidden(
    request: SetImageHiddenRequestDto,
  ): Promise<SetImageHiddenResponseDto> {
    return this.managementMutationService.setImageHidden(request)
  }

  async deleteImageItems(
    request: DeleteImageItemsRequestDto,
  ): Promise<DeleteImageItemsResponseDto> {
    return this.managementMutationService.deleteImageItems(request)
  }

  async deleteSidebarNodes(
    request: DeleteSidebarNodesRequestDto,
  ): Promise<DeleteSidebarNodesResponseDto> {
    return this.managementMutationService.deleteSidebarNodes(request)
  }

  async writePackageMetadata(
    request: WritePackageMetadataRequestDto,
  ): Promise<WritePackageMetadataResponseDto> {
    return this.libraryReadWriteService.writePackageMetadata(request)
  }

  async writeVideoMetadata(
    request: WriteVideoMetadataRequestDto,
  ): Promise<WriteVideoMetadataResponseDto> {
    return this.libraryReadWriteService.writeVideoMetadata(request)
  }

  async saveVideoCover(
    request: SaveVideoCoverRequestDto,
  ): Promise<SaveVideoCoverResponseDto> {
    return this.libraryReadWriteService.saveVideoCover(request)
  }

  async readPlaylist(): Promise<ReadPlaylistResponseDto> {
    return this.libraryReadWriteService.readPlaylist()
  }

  async writePlaylist(request: WritePlaylistRequestDto): Promise<WritePlaylistResponseDto> {
    return this.libraryReadWriteService.writePlaylist(request)
  }

  async enqueueImportTask(request: EnqueueImportTaskRequestDto): Promise<EnqueueImportTaskResponseDto> {
    return this.importTaskService.enqueueImportTask(request)
  }

  async readImportTasks(): Promise<{ tasks: ImportTaskDto[] }> {
    return this.importTaskService.readImportTasks()
  }

  async retryImportTask(request: RetryImportTaskRequestDto): Promise<RetryImportTaskResponseDto> {
    return this.importTaskService.retryImportTask(request)
  }

  async resolveMediaResource(
    request: ResolveMediaResourceRequestDto,
  ): Promise<ResolveMediaResourceResponseDto> {
    return this.mediaResourceService.resolveMediaResource(request)
  }

  async readMediaResourceByToken(
    token: string,
    rangeHeader: string | null,
  ): Promise<MediaProtocolResponsePayload> {
    return this.mediaResourceService.readMediaResourceByToken(token, rangeHeader)
  }

  async readMediaResourceByTokenStream(
    token: string,
    rangeHeader: string | null,
    signal?: AbortSignal | null,
  ): Promise<MediaProtocolStreamResponsePayload> {
    return this.mediaResourceService.readMediaResourceByTokenStream(token, rangeHeader, signal)
  }

  async readAppState(request: ReadAppStateRequestDto): Promise<ReadAppStateResponseDto> {
    return this.libraryReadWriteService.readAppState(request)
  }

  async writeAppState(request: WriteAppStateRequestDto): Promise<WriteAppStateResponseDto> {
    return this.libraryReadWriteService.writeAppState(request)
  }
}
