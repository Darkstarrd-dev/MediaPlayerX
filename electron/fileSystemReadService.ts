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

interface ArchiveNormalizationResult {
  normalizedArchivePath: string
  strategy: 'zip-repack-webp90-store'
}

interface PersistedVideoCoverRecord {
  coverColor: string
  coverImagePath: string | null
  updatedAtMs: number
}

interface MediaAccessAuditCounters {
  resolveRequests: number
  resolveGranted: number
  resolveDeniedByReason: Record<string, number>
}

interface NormalizedArchiveCacheRecord {
  sourcePath: string
  sourceMtimeMs: number
  sourceSizeBytes: number
  normalizedArchivePath: string
  strategy: ArchiveNormalizationResult['strategy']
}

interface ArchiveNormalizationTaskState {
  status: 'pending' | 'running' | 'completed' | 'failed'
  error: string | null
  updatedAtMs: number
}

interface ParsedSidebarNodeRef {
  kind: 'folder' | 'package' | 'video'
  pathKey: string
}

function parseSidebarNodeId(nodeId: string): ParsedSidebarNodeRef | null {
  const delimiterIndex = nodeId.indexOf(':')
  if (delimiterIndex <= 0) {
    return null
  }

  const rawKind = nodeId.slice(0, delimiterIndex)
  if (rawKind !== 'folder' && rawKind !== 'package' && rawKind !== 'video') {
    return null
  }

  const pathKey = nodeId.slice(delimiterIndex + 1)
  if (pathKey.length === 0) {
    return null
  }

  return {
    kind: rawKind,
    pathKey,
  }
}

function pathKeyHasPrefix(pathKey: string, prefix: string): boolean {
  if (pathKey === prefix) {
    return true
  }
  return pathKey.startsWith(`${prefix}/`)
}

function resolveAbsolutePathFromPathKey(pathKey: string): string {
  if (/^[a-zA-Z]:$/.test(pathKey)) {
    return path.resolve(`${pathKey}${path.sep}`)
  }
  return path.resolve(pathKey)
}

function isFileSystemRootPath(targetPath: string): boolean {
  const resolved = path.resolve(targetPath)
  const root = path.parse(resolved).root
  return normalizeAllowlistKey(resolved) === normalizeAllowlistKey(root)
}

function filterHiddenImagesFromSource(source: ImagePackageDto, includeHidden: boolean): ImagePackageDto {
  if (includeHidden) {
    return source
  }

  const visibleImages = source.images.filter((image) => !(image.hidden ?? false))
  if (visibleImages.length === source.images.length) {
    return source
  }

  return {
    ...source,
    images: visibleImages,
  }
}

function filterHiddenImagesFromSources(sources: ImagePackageDto[], includeHidden: boolean): ImagePackageDto[] {
  if (includeHidden) {
    return sources
  }
  return sources.map((source) => filterHiddenImagesFromSource(source, includeHidden))
}

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

  private mediaAudit: MediaAccessAuditCounters = {
    resolveRequests: 0,
    resolveGranted: 0,
    resolveDeniedByReason: {},
  }

  private resolveDeniedLogAtByKey = new Map<string, number>()

  private readonly runtimeDependencyService = new RuntimeDependencyService(FFMPEG_BIN, FFPROBE_BIN)

  private readonly eventBus = new ServiceEventBus<FileSystemReadServiceEvents>()

  private readonly archiveNormalizationService: ArchiveNormalizationService

  private readonly librarySnapshotService: LibrarySnapshotService

  private readonly importTaskService: ImportTaskService

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

  private countResolveDenied(reason: MediaAuditRejectReason): void {
    this.mediaAudit.resolveDeniedByReason[reason] = (this.mediaAudit.resolveDeniedByReason[reason] ?? 0) + 1
  }

  private shouldLogResolveDenied(reason: MediaAuditRejectReason, pathHint: string): boolean {
    const now = Date.now()
    const key = `${reason}|${normalizeAllowlistKey(pathHint)}`
    const previousAt = this.resolveDeniedLogAtByKey.get(key)
    if (typeof previousAt === 'number' && now - previousAt < 2_500) {
      return false
    }
    this.resolveDeniedLogAtByKey.set(key, now)

    if (this.resolveDeniedLogAtByKey.size > 2_048) {
      this.resolveDeniedLogAtByKey.clear()
    }

    return true
  }

  async readMediaAccessAudit(): Promise<MediaAccessAuditResponseDto> {
    const tokenAudit = this.mediaTokenService.readAuditSnapshot()

    const deniedTotal = Object.values(this.mediaAudit.resolveDeniedByReason).reduce((sum, value) => sum + value, 0)
    return mediaAccessAuditResponseSchema.parse({
      resolve_requests: this.mediaAudit.resolveRequests,
      resolve_granted: this.mediaAudit.resolveGranted,
      resolve_denied_total: deniedTotal,
      resolve_denied_by_reason: this.mediaAudit.resolveDeniedByReason,
      token_reads: tokenAudit.tokenReads,
      token_hits: tokenAudit.tokenHits,
      token_misses: tokenAudit.tokenMisses,
      token_expired: tokenAudit.tokenExpired,
      token_cleanup_removed: tokenAudit.tokenCleanupRemoved,
      token_active: tokenAudit.tokenActive,
      generated_at_ms: Date.now(),
    })
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
    this.markInteractiveRead()
    const snapshot = await this.ensureSnapshotLoaded()
    const includeHidden = request.include_hidden ?? false
    const filtered = filterLibrarySources(snapshot, request)
    const filteredPackages = filterHiddenImagesFromSources(filtered.imagePackages, includeHidden)
    const filteredDirectories = filterHiddenImagesFromSources(filtered.imageDirectories, includeHidden)

    return readImageSidebarTreeResponseSchema.parse({
      image_packages: filteredPackages,
      image_directories: filteredDirectories,
      tree: buildImageSidebarTree(filteredPackages, filteredDirectories),
    })
  }

  async readImagePage(request: ReadImagePageRequestDto): Promise<ReadImagePageResponseDto> {
    this.markInteractiveRead()
    const snapshot = await this.ensureSnapshotLoaded()
    const includeHidden = request.include_hidden ?? false
    const filtered = filterLibrarySources(snapshot, {
      feature_filter: request.feature_filter,
      grade_overrides: request.grade_overrides,
    })

    const allSources = [...filtered.imagePackages, ...filtered.imageDirectories]
    const selectedById = request.source_id ? allSources.find((source) => source.id === request.source_id) : null
    const selectedSource =
      selectedById ?? allSources.find((source) => source.images.length > 0) ?? allSources[0] ?? null

    if (
      request.source_id &&
      selectedSource &&
      selectedSource.images.length === 0 &&
      this.isRar7zPath(selectedSource.absolute_path)
    ) {
      this.queueRar7zNormalization(selectedSource.absolute_path, 'high')
    }

    if (!selectedSource) {
      return readImagePageResponseSchema.parse({
        source_id: null,
        total_items: 0,
        page_index: 0,
        page_size: request.page_size,
        refs: [],
      })
    }

    const selectedSourceVisible = filterHiddenImagesFromSource(selectedSource, includeHidden)
    const totalItems = selectedSourceVisible.images.length
    const pageSize = request.show_names_only ? Math.max(1, totalItems) : request.page_size
    const maxPageIndex = Math.max(0, Math.ceil(totalItems / pageSize) - 1)
    const pageIndex = request.show_names_only ? 0 : Math.min(request.page_index, maxPageIndex)
    const pageStart = pageIndex * pageSize
    const pageEnd = pageStart + pageSize

    const refs: FocusedImageRefDto[] = selectedSourceVisible.images
      .slice(pageStart, pageEnd)
      .map((_, index) => ({
        package_id: selectedSource.id,
        image_index: pageStart + index,
      }))

    return readImagePageResponseSchema.parse({
      source_id: selectedSource.id,
      total_items: totalItems,
      page_index: pageIndex,
      page_size: request.page_size,
      refs,
    })
  }

  async readImageMetadata(
    request: ReadImageMetadataRequestDto,
  ): Promise<ReadImageMetadataResponseDto> {
    this.markInteractiveRead()
    const includeHidden = request.include_hidden ?? false
    const snapshot = await this.ensureSnapshotLoaded()
    const allSources = [...snapshot.image_packages, ...snapshot.image_directories]
    const source = allSources.find((item) => item.id === request.package_id)
    const visibleSource = source ? filterHiddenImagesFromSource(source, includeHidden) : null
    const image = visibleSource?.images[request.image_index]

    if (
      visibleSource &&
      image &&
      image.media_locator.kind === 'filesystem' &&
      image.media_locator.media_type === 'image'
    ) {
      if (image.size_kb <= 0) {
        const stat = await fs.stat(image.media_locator.absolute_path).catch(() => null)
        if (stat?.isFile()) {
          image.size_kb = toSafeSizeKb(stat.size)
        }
      }

      if (image.width <= 0 || image.height <= 0) {
        const dimensions = await probeImageDimensionsFromFile(image.media_locator.absolute_path)
        if (dimensions.width > 0 && dimensions.height > 0) {
          image.width = dimensions.width
          image.height = dimensions.height
        }
      }
    }

    return readImageMetadataResponseSchema.parse(
      visibleSource && image
        ? {
            package: visibleSource,
            image,
            grade: visibleSource.mock_grade,
          }
        : null,
    )
  }

  async writePackageGrade(
    request: WritePackageGradeRequestDto,
  ): Promise<WritePackageGradeResponseDto> {
    const snapshot = await this.ensureSnapshotLoaded()
    const allSources = [...snapshot.image_packages, ...snapshot.image_directories]
    const source = allSources.find((item) => item.id === request.package_id)
    if (!source) {
      throw new Error(`写入评分失败：source 不存在 ${request.package_id}`)
    }

    source.mock_grade = request.grade
    this.packageGradeOverridesBySourceId.set(request.package_id, request.grade)
    this.database.writePackageGrade(request.package_id, request.grade)

    this.emitLibraryChanged({
      reason: 'write-package-grade',
      updated_at_ms: Date.now(),
    })

    return writePackageGradeResponseSchema.parse({
      package_id: request.package_id,
      grade: request.grade,
      updated_at_ms: Date.now(),
    })
  }

  async setImageHidden(
    request: SetImageHiddenRequestDto,
  ): Promise<SetImageHiddenResponseDto> {
    await this.ensureStateLoaded()
    const normalizedImageIds = Array.from(new Set(request.image_ids.map((value) => value.trim()).filter(Boolean)))
    if (normalizedImageIds.length === 0) {
      throw new Error('设置隐藏失败：未提供图片 id')
    }

    const updatedCount = this.database.setImagesHidden(normalizedImageIds, request.hidden)
    if (updatedCount > 0) {
      this.syncSnapshotFromDatabase()
      this.emitLibraryChanged({
        reason: 'manage-hide',
        updated_at_ms: Date.now(),
      })
    }

    return {
      updated_count: updatedCount,
      updated_at_ms: Date.now(),
    }
  }

  private async repackArchiveWithoutEntries(
    archivePath: string,
    deletedEntryNames: Set<string>,
  ): Promise<void> {
    const allEntries = await scanZipCentralEntries(archivePath)
    const keepEntries = allEntries.filter((entry) => !deletedEntryNames.has(entry.entryName))

    const zipEntries: Array<{ entryName: string; content: Buffer }> = []
    for (const entry of keepEntries) {
      const content = await readZipEntryContent(archivePath, entry)
      zipEntries.push({
        entryName: entry.entryName,
        content,
      })
    }

    const tempPath = `${archivePath}.${Date.now()}.${Math.round(Math.random() * 100_000)}.mpx-tmp.zip`
    const backupPath = `${archivePath}.${Date.now()}.${Math.round(Math.random() * 100_000)}.mpx-bak`

    await writeStoredZipFromEntries(tempPath, zipEntries)
    await scanZipCentralEntries(tempPath)

    await fs.rename(archivePath, backupPath)
    let replaced = false
    try {
      await fs.rename(tempPath, archivePath)
      replaced = true
      await fs.rm(backupPath, { force: true })
    } finally {
      if (!replaced) {
        await fs.rename(backupPath, archivePath).catch(() => undefined)
      }
      await fs.rm(tempPath, { force: true }).catch(() => undefined)
    }
  }

  async deleteImageItems(
    request: DeleteImageItemsRequestDto,
  ): Promise<DeleteImageItemsResponseDto> {
    const normalizedImageIds = Array.from(new Set(request.image_ids.map((value) => value.trim()).filter(Boolean)))
    if (normalizedImageIds.length === 0) {
      throw new Error('删除失败：未提供图片 id')
    }

    const snapshot = await this.ensureSnapshotLoaded()
    await this.ensureStateLoaded()

    const sourceById = new Map<string, ImagePackageDto>([
      ...snapshot.image_packages.map((source) => [source.id, source] as const),
      ...snapshot.image_directories.map((source) => [source.id, source] as const),
    ])
    const mediaAccessContext = this.buildMediaAccessContext()

    const imageById = new Map<string, { image: ImagePackageDto['images'][number]; source: ImagePackageDto }>()
    for (const source of sourceById.values()) {
      for (const image of source.images) {
        imageById.set(image.id, { image, source })
      }
    }

    const failed: Array<{ image_id: string; reason: string }> = []
    const filesystemImageIdsByPath = new Map<string, Set<string>>()
    const archiveEntriesToDelete = new Map<string, Set<string>>()
    const archiveImageIdsByPath = new Map<string, Map<string, Set<string>>>()
    const importPathsToRemove = new Set<string>()

    for (const imageId of normalizedImageIds) {
      const found = imageById.get(imageId)
      if (!found) {
        failed.push({
          image_id: imageId,
          reason: 'image not found',
        })
        continue
      }

      const locator = found.image.media_locator
      if (locator.kind === 'filesystem') {
        const absolutePath = path.resolve(locator.absolute_path)
        if (!isPathAllowlisted(absolutePath, mediaAccessContext)) {
          failed.push({
            image_id: imageId,
            reason: 'path outside allowlist',
          })
          continue
        }
        const imageIds = filesystemImageIdsByPath.get(absolutePath) ?? new Set<string>()
        imageIds.add(imageId)
        filesystemImageIdsByPath.set(absolutePath, imageIds)
        continue
      }

      if (locator.archive_format !== 'zip') {
        failed.push({
          image_id: imageId,
          reason: 'archive format not supported',
        })
        continue
      }

      const archivePath = path.resolve(locator.archive_path)
      if (!isPathAllowlisted(archivePath, mediaAccessContext)) {
        failed.push({
          image_id: imageId,
          reason: 'archive path outside allowlist',
        })
        continue
      }
      const entryName = locator.entry_name
      if (!entryName || !isSafeArchiveEntryName(entryName)) {
        failed.push({
          image_id: imageId,
          reason: 'archive entry illegal',
        })
        continue
      }

      const entrySet = archiveEntriesToDelete.get(archivePath) ?? new Set<string>()
      entrySet.add(entryName)
      archiveEntriesToDelete.set(archivePath, entrySet)

      const imageIdsByEntry = archiveImageIdsByPath.get(archivePath) ?? new Map<string, Set<string>>()
      const imageIds = imageIdsByEntry.get(entryName) ?? new Set<string>()
      imageIds.add(imageId)
      imageIdsByEntry.set(entryName, imageIds)
      archiveImageIdsByPath.set(archivePath, imageIdsByEntry)
    }

    const deletedImageIds = new Set<string>()
    const changedArchivePaths = new Set<string>()

    for (const [absolutePath, imageIds] of filesystemImageIdsByPath) {
      try {
        await fs.rm(absolutePath, { force: true })
        for (const imageId of imageIds) {
          deletedImageIds.add(imageId)
        }
        if (this.importPathRegistry.hasImportFile(absolutePath)) {
          importPathsToRemove.add(absolutePath)
        }
      } catch (error) {
        const reason = error instanceof Error && error.message ? error.message : String(error)
        for (const imageId of imageIds) {
          failed.push({
            image_id: imageId,
            reason,
          })
        }
      }
    }

    for (const [archivePath, entryNames] of archiveEntriesToDelete) {
      try {
        await this.repackArchiveWithoutEntries(archivePath, entryNames)
        changedArchivePaths.add(archivePath)

        const imageIdsByEntry = archiveImageIdsByPath.get(archivePath) ?? new Map<string, Set<string>>()
        for (const entryName of entryNames) {
          const imageIds = imageIdsByEntry.get(entryName)
          if (!imageIds) {
            continue
          }
          for (const imageId of imageIds) {
            deletedImageIds.add(imageId)
          }
        }

        if (this.importPathRegistry.hasImportFile(archivePath)) {
          const source = Array.from(sourceById.values()).find(
            (item) => path.resolve(item.absolute_path) === archivePath,
          )
          if (source) {
            const remainingEntries = source.images.filter(
              (image) => image.media_locator.kind === 'archive-entry' && !entryNames.has(image.media_locator.entry_name),
            )
            if (remainingEntries.length === 0) {
              importPathsToRemove.add(archivePath)
            }
          }
        }
      } catch (error) {
        const reason = error instanceof Error && error.message ? error.message : String(error)
        const imageIdsByEntry = archiveImageIdsByPath.get(archivePath) ?? new Map<string, Set<string>>()
        for (const entryName of entryNames) {
          const imageIds = imageIdsByEntry.get(entryName)
          if (!imageIds) {
            continue
          }
          for (const imageId of imageIds) {
            failed.push({
              image_id: imageId,
              reason,
            })
          }
        }
      }
    }

    if (deletedImageIds.size > 0) {
      this.database.deleteImageItems(Array.from(deletedImageIds))
      this.syncSnapshotFromDatabase()
      await this.refreshArchiveIndexesForPaths(changedArchivePaths)
    }

    if (importPathsToRemove.size > 0) {
      await this.removeImportSourcePaths(Array.from(importPathsToRemove))
    }

    const deletedCount = deletedImageIds.size
    if (deletedCount > 0) {
      await fs.rm(this.thumbnailCacheRootDir, { recursive: true, force: true }).catch(() => undefined)
      this.emitLibraryChanged({
        reason: 'manage-delete-image-items',
        updated_at_ms: Date.now(),
      })
    }

    return {
      deleted_count: deletedCount,
      failed,
      updated_at_ms: Date.now(),
    }
  }

  async deleteSidebarNodes(
    request: DeleteSidebarNodesRequestDto,
  ): Promise<DeleteSidebarNodesResponseDto> {
    const normalizedNodeIds = Array.from(new Set(request.node_ids.map((value) => value.trim()).filter(Boolean)))
    if (normalizedNodeIds.length === 0) {
      throw new Error('删除失败：未提供节点 id')
    }

    const parsedTargets = normalizedNodeIds.map((nodeId) => {
      const parsed = parseSidebarNodeId(nodeId)
      return {
        nodeId,
        parsed,
        matched: false,
      }
    })

    const failed: Array<{ node_id: string; reason: string }> = []
    const validTargets = parsedTargets.filter((target) => {
      if (target.parsed) {
        return true
      }
      failed.push({
        node_id: target.nodeId,
        reason: 'invalid node id',
      })
      return false
    })

    await this.ensureStateLoaded()
    const snapshot = await this.ensureSnapshotLoaded()
    const mediaAccessContext = this.buildMediaAccessContext()

    const selectedPaths = new Set<string>()
    const nodeIdsBySelectedPath = new Map<string, Set<string>>()
    const importPathsToRemove = new Set<string>()

    const rememberSelectedPath = (absolutePath: string, nodeId: string) => {
      const resolvedPath = path.resolve(absolutePath)
      selectedPaths.add(resolvedPath)
      const nodeIds = nodeIdsBySelectedPath.get(resolvedPath) ?? new Set<string>()
      nodeIds.add(nodeId)
      nodeIdsBySelectedPath.set(resolvedPath, nodeIds)
    }

    for (const target of validTargets) {
      const parsed = target.parsed
      if (!parsed || parsed.kind !== 'folder') {
        continue
      }
      const folderPath = resolveAbsolutePathFromPathKey(parsed.pathKey)
      rememberSelectedPath(folderPath, target.nodeId)
      target.matched = true
    }

    const markMatchedAndSelect = (pathKey: string, kind: 'package' | 'directory' | 'video', absolutePath: string): boolean => {
      for (const target of validTargets) {
        const parsed = target.parsed
        if (!parsed) {
          continue
        }

        if (parsed.kind === 'folder') {
          if (pathKeyHasPrefix(pathKey, parsed.pathKey)) {
            target.matched = true
            rememberSelectedPath(absolutePath, target.nodeId)
            return true
          }
          continue
        }

        if (parsed.kind === 'package' && kind === 'package' && pathKey === parsed.pathKey) {
          target.matched = true
          rememberSelectedPath(absolutePath, target.nodeId)
          return true
        }

        if (parsed.kind === 'video' && kind === 'video' && pathKey === parsed.pathKey) {
          target.matched = true
          rememberSelectedPath(absolutePath, target.nodeId)
          return true
        }
      }

      return false
    }

    for (const source of snapshot.image_packages) {
      const pathKey = source.tree_path.join('/')
      markMatchedAndSelect(pathKey, 'package', source.absolute_path)
    }

    for (const source of snapshot.image_directories) {
      const pathKey = source.tree_path.join('/')
      markMatchedAndSelect(pathKey, 'directory', source.absolute_path)
    }

    for (const video of snapshot.videos) {
      const pathKey = video.tree_path.join('/')
      markMatchedAndSelect(pathKey, 'video', video.absolute_path)
    }

    for (const target of validTargets) {
      if (!target.matched) {
        failed.push({
          node_id: target.nodeId,
          reason: 'node not found',
        })
      }
    }

    const sortedPaths = Array.from(selectedPaths).sort((left, right) => left.length - right.length)
    const prunedPaths: string[] = []
    for (const candidatePath of sortedPaths) {
      if (prunedPaths.some((existingPath) => isPathInsideRoot(existingPath, candidatePath))) {
        continue
      }
      prunedPaths.push(candidatePath)
    }

    let deletedCount = 0
    const pathsToPurgeFromSnapshot = new Set<string>()
    for (const absolutePath of prunedPaths) {
      try {
        if (isFileSystemRootPath(absolutePath)) {
          const nodeIds = nodeIdsBySelectedPath.get(absolutePath) ?? new Set<string>()
          for (const nodeId of nodeIds) {
            failed.push({
              node_id: nodeId,
              reason: 'refuse to delete filesystem root',
            })
          }
          continue
        }

        if (!isPathAllowlisted(absolutePath, mediaAccessContext)) {
          const nodeIds = nodeIdsBySelectedPath.get(absolutePath) ?? new Set<string>()
          for (const nodeId of nodeIds) {
            failed.push({
              node_id: nodeId,
              reason: 'path outside allowlist',
            })
          }
          continue
        }

        let stat: { isDirectory: () => boolean; isFile: () => boolean } | null = null
        try {
          stat = await fs.stat(absolutePath)
        } catch (error) {
          const maybeFsError = error as NodeJS.ErrnoException
          if (maybeFsError?.code !== 'ENOENT') {
            throw error
          }
        }

        if (!stat) {
          pathsToPurgeFromSnapshot.add(absolutePath)
          importPathsToRemove.add(absolutePath)
          continue
        }
        if (stat.isDirectory()) {
          await fs.rm(absolutePath, { recursive: true, force: true })
          deletedCount += 1
          pathsToPurgeFromSnapshot.add(absolutePath)
          importPathsToRemove.add(absolutePath)
          continue
        }
        if (stat.isFile()) {
          await fs.rm(absolutePath, { force: true })
          deletedCount += 1
          pathsToPurgeFromSnapshot.add(absolutePath)
          importPathsToRemove.add(absolutePath)
        }
      } catch (error) {
        const reason = error instanceof Error && error.message ? error.message : String(error)
        const nodeIds = nodeIdsBySelectedPath.get(absolutePath) ?? new Set<string>()
        for (const nodeId of nodeIds) {
          failed.push({
            node_id: nodeId,
            reason,
          })
        }
      }
    }

    if (pathsToPurgeFromSnapshot.size > 0) {
      this.database.deleteSnapshotEntriesByPaths(Array.from(pathsToPurgeFromSnapshot))
      this.syncSnapshotFromDatabase()
      this.pruneArchiveIndexesByDeletedRoots(pathsToPurgeFromSnapshot)
    }

    if (importPathsToRemove.size > 0) {
      await this.removeImportSourcePaths(Array.from(importPathsToRemove))
    }

    if (pathsToPurgeFromSnapshot.size > 0) {
      await fs.rm(this.thumbnailCacheRootDir, { recursive: true, force: true }).catch(() => undefined)
      this.emitLibraryChanged({
        reason: 'manage-delete-sidebar-nodes',
        updated_at_ms: Date.now(),
      })
    }

    return {
      deleted_count: deletedCount,
      failed,
      updated_at_ms: Date.now(),
    }
  }

  async writePackageMetadata(
    request: WritePackageMetadataRequestDto,
  ): Promise<WritePackageMetadataResponseDto> {
    const snapshot = await this.ensureSnapshotLoaded()
    const response = applyPackageMetadataWrite({
      snapshot,
      database: this.database,
      request,
    })

    this.emitLibraryChanged({
      reason: 'write-package-metadata',
      updated_at_ms: response.updated_at_ms,
    })

    return response
  }

  async writeVideoMetadata(
    request: WriteVideoMetadataRequestDto,
  ): Promise<WriteVideoMetadataResponseDto> {
    const snapshot = await this.ensureSnapshotLoaded()
    const { response, persistedRecord } = applyVideoMetadataWrite({
      snapshot,
      database: this.database,
      request,
    })

    this.videoMetadataOverridesByVideoId.set(response.video.id, persistedRecord)

    this.emitLibraryChanged({
      reason: 'write-video-metadata',
      updated_at_ms: response.updated_at_ms,
    })

    return response
  }

  async saveVideoCover(
    request: SaveVideoCoverRequestDto,
  ): Promise<SaveVideoCoverResponseDto> {
    const snapshot = await this.ensureSnapshotLoaded()
    const runtimeDependencies = await this.ensureRuntimeDependencies()
    const video = snapshot.videos.find((item) => item.id === request.video_id)
    if (!video) {
      throw new Error(`保存封面失败：video 不存在 ${request.video_id}`)
    }

    const coverImagePath = await captureVideoCoverImage({
      videoPath: video.absolute_path,
      videoId: video.id,
      timeSec: request.time_sec,
      ffmpegBin: FFMPEG_BIN,
      coverOutputRootDir: this.coverOutputRootDir,
      ffmpegAvailable: runtimeDependencies.ffmpeg,
    })
    const coverColor = request.fallback_color ?? video.cover_color ?? toDeterministicCoverColor(video.id)
    const updatedAtMs = Date.now()

    video.cover_color = coverColor
    video.cover_image_path = coverImagePath
    this.videoCoverOverridesByVideoId.set(video.id, {
      coverColor,
      coverImagePath,
      updatedAtMs,
    })
    this.database.writeVideoCover(video.id, coverColor, coverImagePath)

    this.emitLibraryChanged({
      reason: 'write-video-cover',
      updated_at_ms: Date.now(),
    })

    return saveVideoCoverResponseSchema.parse({
      video_id: video.id,
      cover_color: coverColor,
      cover_image_path: coverImagePath,
      updated_at_ms: updatedAtMs,
    })
  }

  async readPlaylist(): Promise<ReadPlaylistResponseDto> {
    await this.ensureSnapshotLoaded()
    const videoIds = this.database.readPlaylist()
    return readPlaylistResponseSchema.parse({
      video_ids: videoIds,
    })
  }

  async writePlaylist(request: WritePlaylistRequestDto): Promise<WritePlaylistResponseDto> {
    await this.ensureSnapshotLoaded()
    const nextVideoIds = this.database.writePlaylist(request.video_ids)

    this.emitLibraryChanged({
      reason: 'write-playlist',
      updated_at_ms: Date.now(),
    })

    return writePlaylistResponseSchema.parse({
      video_ids: nextVideoIds,
      updated_at_ms: Date.now(),
    })
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
    this.markInteractiveRead()
    await this.ensureSnapshotLoaded()
    this.cleanupExpiredTokens()

    this.mediaAudit.resolveRequests += 1

    let locator: MediaLocatorDto
    try {
      locator = await assertLocatorAllowed(request.locator, this.buildMediaAccessContext())
    } catch (error) {
      if (error instanceof MediaAccessError) {
        this.countResolveDenied(error.reason)
        const pathHint =
          request.locator.kind === 'filesystem' ? request.locator.absolute_path : request.locator.archive_path
        if (this.shouldLogResolveDenied(error.reason, pathHint)) {
          console.warn('resolveMediaResource denied', {
            reason: error.reason,
            message: error.message,
          })
        }
      } else {
        this.countResolveDenied('filesystem_file_missing')
      }
      throw error
    }

    const thumbnailLocator = await maybeResolveThumbnailLocator({
      locator,
      request,
      thumbnailCacheRootDir: this.thumbnailCacheRootDir,
      ensureRuntimeDependencies: () => this.ensureRuntimeDependencies(),
      readImageBufferForThumbnail: (targetLocator) => this.readImageBufferForThumbnail(targetLocator),
      onRenderingStart: () => {
        this.archiveNormalizationService.onThumbnailRenderingStart()
      },
      onRenderingEnd: () => {
        this.archiveNormalizationService.onThumbnailRenderingEnd()
      },
      hasPendingArchiveNormalization: () => this.archiveNormalizationService.hasPending(),
      scheduleArchiveNormalizationDrain: (delayMs) => this.scheduleArchiveNormalizationDrain(delayMs),
      archiveNormalizeRecheckMs: ARCHIVE_NORMALIZE_RECHECK_MS,
    })
    if (thumbnailLocator) {
      locator = thumbnailLocator
    }

    const mimeType = locator.mime_type || detectMimeTypeByExtension(locator.extension, locator.media_type)
    const { token, expiresAtMs } = this.mediaTokenService.issueToken(locator, mimeType)

    this.mediaAudit.resolveGranted += 1

    return resolveMediaResourceResponseSchema.parse({
      resource_url: `${MEDIA_PROTOCOL_SCHEME}://resource/${encodeURIComponent(token)}`,
      mime_type: mimeType,
      expires_at_ms: expiresAtMs,
    })
  }

  async readMediaResourceByToken(
    token: string,
    rangeHeader: string | null,
  ): Promise<MediaProtocolResponsePayload> {
    const record = this.requireMediaTokenRecord(token)

    const locator = record.locator
    if (locator.kind === 'filesystem') {
      return readFilesystemMedia(locator, record.mimeType, rangeHeader)
    }

    return readArchiveEntryMedia(locator, record.mimeType, this.librarySnapshotService.getZipEntryIndexByPath())
  }

  async readMediaResourceByTokenStream(
    token: string,
    rangeHeader: string | null,
    signal?: AbortSignal | null,
  ): Promise<MediaProtocolStreamResponsePayload> {
    const record = this.requireMediaTokenRecord(token)

    const locator = record.locator
    if (locator.kind === 'filesystem') {
      return readFilesystemMediaStream(locator, record.mimeType, rangeHeader, signal)
    }

    return readArchiveEntryMediaStream(
      locator,
      record.mimeType,
      this.librarySnapshotService.getZipEntryIndexByPath(),
      signal,
    )
  }

  private requireMediaTokenRecord(token: string): MediaTokenRecord {
    return this.mediaTokenService.requireRecord(token)
  }

  async readAppState(request: ReadAppStateRequestDto): Promise<ReadAppStateResponseDto> {
    this.markInteractiveRead()
    const state = this.database.readAppState<unknown>(request.state_key, null)
    return readAppStateResponseSchema.parse({
      state_json: state !== null ? JSON.stringify(state) : (request.fallback_json ?? 'null'),
    })
  }

  async writeAppState(request: WriteAppStateRequestDto): Promise<WriteAppStateResponseDto> {
    this.markInteractiveRead()
    this.database.writeAppState(request.state_key, JSON.parse(request.state_json))
    return writeAppStateResponseSchema.parse({
      updated_at_ms: Date.now(),
    })
  }
}
