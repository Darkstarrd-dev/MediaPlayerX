import { createHash, randomUUID } from 'node:crypto'
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
  readRuntimeCapabilitiesResponseSchema,
  readPlaylistResponseSchema,
  readImageMetadataResponseSchema,
  readImagePageResponseSchema,
  readImageSidebarTreeResponseSchema,
  resolveMediaResourceResponseSchema,
  retryImportTaskResponseSchema,
  saveVideoCoverResponseSchema,
  writePlaylistResponseSchema,
  writePackageGradeResponseSchema,
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
  readArchiveWasmSupport,
  resolveArchiveReplacementZipPath,
} from './archiveWasmExtractor'
import {
  convertDirectoryImagesToWebp90,
  extractZipWithPowerShell,
} from './fileSystemArchiveNormalizeHelpers'
import { collectMediaFiles, type FileRecord } from './fileSystemFileCollector'
import {
  detectMimeTypeByExtension,
  makeStableId,
  matchesFeatureFilter,
  normalizeAllowlistKey,
  normalizeFeatureFilter,
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
import {
  checkCommandAvailability,
  getSharpModule,
  probeImageDimensionsFromFile,
  probeVideoMetadata,
  runProcess,
} from './fileSystemRuntimeHelpers'
import { buildImageSidebarTree } from './fileSystemSidebarTree'
import { writeStoredZipFromDirectory } from './fileSystemZipStoreWriter'
import {
  isSafeArchiveEntryName,
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
const THUMBNAIL_DEFAULT_MAX_EDGE = 320
const THUMBNAIL_DEFAULT_QUALITY = 82
const THUMBNAIL_MIN_EDGE = 64
const THUMBNAIL_MAX_EDGE = 2048
const THUMBNAIL_MIN_QUALITY = 50
const THUMBNAIL_MAX_QUALITY = 95
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

interface MediaTokenRecord {
  locator: MediaLocatorDto
  mimeType: string
  expiresAtMs: number
}

interface MediaAccessAuditCounters {
  resolveRequests: number
  resolveGranted: number
  resolveDeniedByReason: Record<string, number>
  tokenReads: number
  tokenHits: number
  tokenMisses: number
  tokenExpired: number
  tokenCleanupRemoved: number
}

interface NormalizedArchiveCacheRecord {
  sourcePath: string
  sourceMtimeMs: number
  sourceSizeBytes: number
  normalizedArchivePath: string
  strategy: ArchiveNormalizationResult['strategy']
}

interface ThumbnailRenderOptions {
  maxEdge: number
  quality: number
}

interface RuntimeDependencySnapshot {
  sharp: boolean
  ffmpeg: boolean
  ffprobe: boolean
  sevenZip: boolean
  powershell: boolean
  checkedAtMs: number
}

interface ArchiveNormalizationTaskState {
  status: 'pending' | 'running' | 'completed' | 'failed'
  error: string | null
  updatedAtMs: number
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
  updated_at_ms: number
}

type LibraryChangedListener = (payload: LibraryChangedEventPayload) => void

function clampThumbnailMaxEdge(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return THUMBNAIL_DEFAULT_MAX_EDGE
  }

  return Math.max(THUMBNAIL_MIN_EDGE, Math.min(THUMBNAIL_MAX_EDGE, Math.round(value)))
}

function clampThumbnailQuality(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return THUMBNAIL_DEFAULT_QUALITY
  }

  return Math.max(THUMBNAIL_MIN_QUALITY, Math.min(THUMBNAIL_MAX_QUALITY, Math.round(value)))
}

export class FileSystemMediaReadService {
  private readonly rootDir: string

  private readonly normalizedArchiveRootDir: string

  private readonly thumbnailCacheRootDir: string

  private readonly coverOutputRootDir: string

  private readonly database: MediaLibraryDatabase

  private snapshotCache: LibrarySnapshotDto | null = null

  private loadingPromise: Promise<LibrarySnapshotDto> | null = null

  private stateHydrated = false

  private archiveEntryIndexByPath = new Map<string, Set<string>>()

  private zipEntryIndexByPath = new Map<string, Map<string, ZipCentralEntry>>()

  private mediaTokenIndex = new Map<string, MediaTokenRecord>()

  private normalizedArchiveCacheBySourcePath = new Map<string, NormalizedArchiveCacheRecord>()

  private packageGradeOverridesBySourceId = new Map<string, number | null>()

  private videoCoverOverridesByVideoId = new Map<string, PersistedVideoCoverRecord>()

  private videoMetadataOverridesByVideoId = new Map<string, PersistedVideoMetadataRecord>()

  private importSources: { directories: string[]; files: string[] } = { directories: [], files: [] }

  private importDirectoryRoots: string[] = []

  private importFileAllowlistKeys = new Set<string>()

  private mediaAudit: MediaAccessAuditCounters = {
    resolveRequests: 0,
    resolveGranted: 0,
    resolveDeniedByReason: {},
    tokenReads: 0,
    tokenHits: 0,
    tokenMisses: 0,
    tokenExpired: 0,
    tokenCleanupRemoved: 0,
  }

  private runtimeDependencySnapshot: RuntimeDependencySnapshot | null = null

  private runtimeDependencyLoadingPromise: Promise<RuntimeDependencySnapshot> | null = null

  private archiveNormalizationPendingLow = new Set<string>()

  private archiveNormalizationPendingHigh = new Set<string>()

  private archiveNormalizationRunningPath: string | null = null

  private archiveNormalizationDrainTimer: ReturnType<typeof setTimeout> | null = null

  private lastInteractiveReadAtMs = Date.now()

  private thumbnailRenderingInFlight = 0

  private archiveNormalizationStateBySourcePath = new Map<string, ArchiveNormalizationTaskState>()

  private archiveNormalizeWorkerScriptPath: string | null = null

  private libraryChangedListeners = new Set<LibraryChangedListener>()

  private importTaskQueue: Promise<void> = Promise.resolve()

  private runningImportTaskIds = new Set<string>()

  constructor(rootDir: string) {
    this.rootDir = path.resolve(rootDir)
    this.normalizedArchiveRootDir = path.join(this.rootDir, ARCHIVE_NORMALIZE_DIR_NAME)
    this.thumbnailCacheRootDir = path.join(this.rootDir, THUMBNAIL_CACHE_DIR_NAME)
    this.coverOutputRootDir = path.join(this.rootDir, '.mediaplayerx', 'covers')
    this.database = new MediaLibraryDatabase(this.rootDir)
    this.recoverInterruptedImportTasks()
  }

  private recoverInterruptedImportTasks(): void {
    const tasks = this.database.readTasks()
    if (tasks.length === 0) {
      return
    }

    const now = Date.now()
    for (const task of tasks) {
      if (task.taskType !== 'import' || (task.status !== 'pending' && task.status !== 'running')) {
        continue
      }

      this.database.upsertTask({
        ...task,
        status: 'failed',
        progress: task.totalCount > 0 ? task.processedCount / task.totalCount : 1,
        message: task.status === 'running' ? '导入任务已中断，请重试' : '导入任务未执行，请重试',
        errorDetail: task.errorDetail ?? '应用重启导致任务中断',
        updatedAtMs: now,
      })
    }
  }

  onLibraryChanged(listener: LibraryChangedListener): () => void {
    this.libraryChangedListeners.add(listener)
    return () => {
      this.libraryChangedListeners.delete(listener)
    }
  }

  private emitLibraryChanged(payload: LibraryChangedEventPayload): void {
    for (const listener of this.libraryChangedListeners) {
      try {
        listener(payload)
      } catch {
        // ignore listener failures
      }
    }
  }

  private resolveArchiveNormalizeWorkerScriptPath(): string | null {
    if (this.archiveNormalizeWorkerScriptPath) {
      return this.archiveNormalizeWorkerScriptPath
    }

    const mainEntry = process.argv[1] ? path.resolve(process.argv[1]) : ''
    const candidates: string[] = []
    if (mainEntry) {
      candidates.push(path.join(path.dirname(mainEntry), 'archiveNormalizeWorker.cjs'))
    }

    candidates.push(path.join(process.cwd(), 'dist-electron', 'archiveNormalizeWorker.cjs'))

    for (const candidate of candidates) {
      if (!existsSync(candidate)) {
        continue
      }
      this.archiveNormalizeWorkerScriptPath = candidate
      return candidate
    }

    return null
  }

  private async runRar7zNormalizationJob(sourceArchivePath: string): Promise<string> {
    const workerPath = this.resolveArchiveNormalizeWorkerScriptPath()
    if (!workerPath) {
      const normalized = await normalizeArchiveToStoreZipInPlace(sourceArchivePath, {
        webpQuality: 90,
      })
      return normalized.outputZipPath
    }

    return await new Promise<string>((resolve, reject) => {
      const worker = new Worker(workerPath, {
        workerData: {
          sourceArchivePath,
          webpQuality: 90,
        },
      })

      let settled = false
      const finish = (error: Error | null, outputZipPath: string | null) => {
        if (settled) {
          return
        }
        settled = true
        if (error) {
          reject(error)
        } else {
          resolve(outputZipPath ?? resolveArchiveReplacementZipPath(sourceArchivePath))
        }
      }

      worker.once('message', (payload: unknown) => {
        const message = payload as { ok?: boolean; error?: string; outputZipPath?: string }
        if (message?.ok) {
          finish(null, typeof message.outputZipPath === 'string' ? message.outputZipPath : null)
          return
        }
        finish(new Error(message?.error ?? `archive normalization worker failed: ${sourceArchivePath}`), null)
      })

      worker.once('error', (error) => {
        finish(error, null)
      })

      worker.once('exit', (code) => {
        if (!settled && code !== 0) {
          finish(new Error(`archive normalization worker exit ${code} for ${sourceArchivePath}`), null)
        }
      })
    })
  }

  private markInteractiveRead(): void {
    this.lastInteractiveReadAtMs = Date.now()
    if (this.archiveNormalizationPendingHigh.size === 0 && this.archiveNormalizationPendingLow.size > 0) {
      this.scheduleArchiveNormalizationDrain(ARCHIVE_NORMALIZE_IDLE_MS)
    }
  }

  private isRar7zPath(filePath: string): boolean {
    const extension = path.extname(filePath).toLowerCase()
    return extension === '.rar' || extension === '.7z'
  }

  private isArchiveNormalizationTargetEligible(sourceArchivePath: string): boolean {
    if (!this.isRar7zPath(sourceArchivePath)) {
      return false
    }
    return isPathAllowlisted(sourceArchivePath, {
      rootDir: this.rootDir,
      importDirectoryRoots: this.importDirectoryRoots,
      importFileAllowlistKeys: this.importFileAllowlistKeys,
      archiveEntryIndexByPath: this.archiveEntryIndexByPath,
      imageExtensions: IMAGE_EXTENSIONS,
      videoExtensions: VIDEO_EXTENSIONS,
    })
  }

  private pruneArchiveNormalizationPendingSets(): void {
    for (const candidate of this.archiveNormalizationPendingHigh) {
      if (!this.isArchiveNormalizationTargetEligible(candidate)) {
        this.archiveNormalizationPendingHigh.delete(candidate)
      }
    }
    for (const candidate of this.archiveNormalizationPendingLow) {
      if (!this.isArchiveNormalizationTargetEligible(candidate)) {
        this.archiveNormalizationPendingLow.delete(candidate)
      }
    }
  }

  private pickNextArchiveNormalizationTarget(): { path: string; priority: 'high' | 'low' } | null {
    this.pruneArchiveNormalizationPendingSets()

    if (this.archiveNormalizationPendingHigh.size > 0) {
      const next = this.archiveNormalizationPendingHigh.values().next().value
      if (typeof next === 'string') {
        return { path: next, priority: 'high' }
      }
    }

    if (this.archiveNormalizationPendingLow.size > 0) {
      const sorted = Array.from(this.archiveNormalizationPendingLow).sort((left, right) =>
        left.localeCompare(right, 'zh-CN'),
      )
      const next = sorted[0]
      if (next) {
        return { path: next, priority: 'low' }
      }
    }

    return null
  }

  private scheduleArchiveNormalizationDrain(delayMs = 0): void {
    if (this.archiveNormalizationDrainTimer !== null) {
      clearTimeout(this.archiveNormalizationDrainTimer)
      this.archiveNormalizationDrainTimer = null
    }

    this.archiveNormalizationDrainTimer = setTimeout(() => {
      this.archiveNormalizationDrainTimer = null
      void this.drainArchiveNormalizationQueue()
    }, Math.max(0, delayMs))
  }

  private shouldDelayLowPriorityNormalization(nowMs: number): boolean {
    if (this.runningImportTaskIds.size > 0) {
      return true
    }
    if (this.thumbnailRenderingInFlight > 0) {
      return true
    }
    if (this.loadingPromise) {
      return true
    }
    return nowMs - this.lastInteractiveReadAtMs < ARCHIVE_NORMALIZE_IDLE_MS
  }

  private shouldDelayHighPriorityNormalization(): boolean {
    if (this.runningImportTaskIds.size > 0) {
      return true
    }
    if (this.loadingPromise) {
      return true
    }
    return false
  }

  private async drainArchiveNormalizationQueue(): Promise<void> {
    if (this.archiveNormalizationRunningPath) {
      return
    }

    const nextTarget = this.pickNextArchiveNormalizationTarget()
    if (!nextTarget) {
      return
    }

    if (nextTarget.priority === 'low' && this.shouldDelayLowPriorityNormalization(Date.now())) {
      this.scheduleArchiveNormalizationDrain(ARCHIVE_NORMALIZE_RECHECK_MS)
      return
    }
    if (nextTarget.priority === 'high' && this.shouldDelayHighPriorityNormalization()) {
      this.scheduleArchiveNormalizationDrain(ARCHIVE_NORMALIZE_RECHECK_MS)
      return
    }

    const resolvedPath = nextTarget.path
    this.archiveNormalizationPendingHigh.delete(resolvedPath)
    this.archiveNormalizationPendingLow.delete(resolvedPath)
    this.archiveNormalizationRunningPath = resolvedPath

    this.archiveNormalizationStateBySourcePath.set(resolvedPath, {
      status: 'running',
      error: null,
      updatedAtMs: Date.now(),
    })

    try {
      const outputZipPath = await this.runRar7zNormalizationJob(resolvedPath)
      await this.replaceImportedFileSourcePath(resolvedPath, outputZipPath)
      this.archiveNormalizationStateBySourcePath.set(resolvedPath, {
        status: 'completed',
        error: null,
        updatedAtMs: Date.now(),
      })
      this.invalidateCache()
      this.emitLibraryChanged({
        reason: 'archive-normalized',
        updated_at_ms: Date.now(),
      })
    } catch (error) {
      const reason = error instanceof Error && error.message ? error.message : String(error)
      this.archiveNormalizationStateBySourcePath.set(resolvedPath, {
        status: 'failed',
        error: reason,
        updatedAtMs: Date.now(),
      })
      console.warn('archive normalization failed (rar/7z)', {
        archivePath: resolvedPath,
        reason,
      })
      this.emitLibraryChanged({
        reason: 'archive-normalize-failed',
        updated_at_ms: Date.now(),
      })
    } finally {
      this.archiveNormalizationRunningPath = null
      if (this.archiveNormalizationPendingHigh.size > 0 || this.archiveNormalizationPendingLow.size > 0) {
        this.scheduleArchiveNormalizationDrain(0)
      }
    }
  }

  private queueRar7zNormalization(sourceArchivePath: string, priority: 'low' | 'high' = 'low'): void {
    const resolvedPath = path.resolve(sourceArchivePath)
    if (!this.isArchiveNormalizationTargetEligible(resolvedPath)) {
      return
    }

    const state = this.archiveNormalizationStateBySourcePath.get(resolvedPath)
    if (state?.status === 'running' || state?.status === 'completed') {
      return
    }

    this.archiveNormalizationStateBySourcePath.set(resolvedPath, {
      status: 'pending',
      error: null,
      updatedAtMs: Date.now(),
    })

    if (priority === 'high') {
      this.archiveNormalizationPendingLow.delete(resolvedPath)
      this.archiveNormalizationPendingHigh.add(resolvedPath)
      this.scheduleArchiveNormalizationDrain(0)
      return
    }

    if (!this.archiveNormalizationPendingHigh.has(resolvedPath)) {
      this.archiveNormalizationPendingLow.add(resolvedPath)
    }
    this.scheduleArchiveNormalizationDrain(ARCHIVE_NORMALIZE_RECHECK_MS)
  }

  invalidateCache(): void {
    this.snapshotCache = null
    this.stateHydrated = false
    // Keep archive allowlists until next snapshot is ready.
    // This avoids transient "entry not allowlisted" errors while a rescan is in progress.
    // Keep active media tokens until TTL expiry to avoid transient 404
    // during background refreshes or libraryChanged fan-out.
    this.cleanupExpiredTokens()
    this.normalizedArchiveCacheBySourcePath.clear()
  }

  dispose(): void {
    if (this.archiveNormalizationDrainTimer !== null) {
      clearTimeout(this.archiveNormalizationDrainTimer)
      this.archiveNormalizationDrainTimer = null
    }
    this.libraryChangedListeners.clear()
    this.database.dispose()
  }

  private cleanupExpiredTokens(): void {
    const now = Date.now()
    let removed = 0
    for (const [token, record] of this.mediaTokenIndex) {
      if (record.expiresAtMs <= now) {
        this.mediaTokenIndex.delete(token)
        removed += 1
      }
    }
    this.mediaAudit.tokenCleanupRemoved += removed
  }

  private async ensureStateLoaded(): Promise<void> {
    if (this.stateHydrated) {
      return
    }

    this.packageGradeOverridesBySourceId = this.database.readPackageGrades()
    this.videoCoverOverridesByVideoId = this.database.readVideoCovers()
    this.videoMetadataOverridesByVideoId = this.database.readVideoMetadata()

    const rawImportSources = this.database.readImportSources()
    const directoryMap = new Map<string, string>()
    const fileMap = new Map<string, string>()

    for (const value of rawImportSources.directories) {
      const resolved = path.resolve(value)
      const key = normalizeAllowlistKey(resolved)
      directoryMap.set(key, resolved)
    }
    for (const value of rawImportSources.files) {
      const resolved = path.resolve(value)
      const key = normalizeAllowlistKey(resolved)
      fileMap.set(key, resolved)
    }

    this.importSources = {
      directories: Array.from(directoryMap.values()),
      files: Array.from(fileMap.values()),
    }
    this.importDirectoryRoots = this.importSources.directories
    this.importFileAllowlistKeys = new Set(fileMap.keys())
    this.stateHydrated = true
  }

  private async replaceImportedFileSourcePath(sourceArchivePath: string, outputZipPath: string): Promise<void> {
    await this.ensureStateLoaded()

    const sourceKey = normalizeAllowlistKey(sourceArchivePath)
    if (!this.importFileAllowlistKeys.has(sourceKey)) {
      return
    }

    const nextFilesMap = new Map<string, string>()
    for (const filePath of this.importSources.files) {
      const key = normalizeAllowlistKey(filePath)
      if (key === sourceKey) {
        continue
      }
      nextFilesMap.set(key, path.resolve(filePath))
    }

    const resolvedOutputPath = path.resolve(outputZipPath)
    const outputKey = normalizeAllowlistKey(resolvedOutputPath)
    nextFilesMap.set(outputKey, resolvedOutputPath)

    const nextFiles = Array.from(nextFilesMap.values())
    this.importSources = {
      directories: [...this.importSources.directories],
      files: nextFiles,
    }
    this.importFileAllowlistKeys = new Set(nextFilesMap.keys())

    this.database.writeImportSources({
      directories: this.importSources.directories,
      files: nextFiles,
    })
  }

  private async loadRuntimeDependencies(): Promise<RuntimeDependencySnapshot> {
    const [sharpModule, ffmpeg, ffprobe, archiveWasm, powershell] = await Promise.all([
      getSharpModule(),
      checkCommandAvailability(FFMPEG_BIN, ['-version']),
      checkCommandAvailability(FFPROBE_BIN, ['-version']),
      readArchiveWasmSupport(),
      checkCommandAvailability('powershell.exe', ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.ToString()']),
    ])

    return {
      sharp: Boolean(sharpModule?.default),
      ffmpeg,
      ffprobe,
      sevenZip: Boolean(sharpModule?.default) && archiveWasm.rar && archiveWasm.sevenZip,
      powershell,
      checkedAtMs: Date.now(),
    }
  }

  private async ensureRuntimeDependencies(): Promise<RuntimeDependencySnapshot> {
    if (this.runtimeDependencySnapshot) {
      return this.runtimeDependencySnapshot
    }

    if (!this.runtimeDependencyLoadingPromise) {
      this.runtimeDependencyLoadingPromise = this.loadRuntimeDependencies().finally(() => {
        this.runtimeDependencyLoadingPromise = null
      })
    }

    this.runtimeDependencySnapshot = await this.runtimeDependencyLoadingPromise
    return this.runtimeDependencySnapshot
  }

  async readRuntimeCapabilities(): Promise<ReadRuntimeCapabilitiesResponseDto> {
    const dependencies = await this.ensureRuntimeDependencies()

    return readRuntimeCapabilitiesResponseSchema.parse({
      dependencies: {
        sharp: dependencies.sharp,
        ffmpeg: dependencies.ffmpeg,
        ffprobe: dependencies.ffprobe,
        seven_zip: dependencies.sevenZip,
        powershell: dependencies.powershell,
      },
      strategies: {
        thumbnail: dependencies.sharp ? 'sharp-webp-cache' : 'original-fallback',
        video_probe: dependencies.ffprobe ? 'ffprobe' : 'metadata-fallback',
        video_cover: dependencies.ffmpeg ? 'ffmpeg' : 'color-only-fallback',
        archive_rar_7z: dependencies.sevenZip ? 'normalize-to-zip-store' : 'skip-unsupported',
        archive_zip_repack:
          dependencies.ffmpeg && dependencies.powershell ? 'repack-webp-store' : 'safe-entry-fallback',
      },
      minimum_matrix: [
        {
          capability: '基础浏览（文件系统图片/视频）',
          status: 'available',
          note: '无需外部依赖，默认可用',
        },
        {
          capability: '缩略图缓存（Sharp WebP）',
          status: dependencies.sharp ? 'available' : 'degraded',
          note: dependencies.sharp ? 'Sharp 可用，启用 thumbnail 变体缓存' : 'Sharp 缺失，自动回退 original 变体',
        },
        {
          capability: '视频元数据探测（ffprobe）',
          status: dependencies.ffprobe ? 'available' : 'degraded',
          note: dependencies.ffprobe ? 'ffprobe 可用，读取真实时长与分辨率' : 'ffprobe 缺失，使用默认时长与分辨率',
        },
        {
          capability: '视频封面抓取（ffmpeg）',
          status: dependencies.ffmpeg ? 'available' : 'degraded',
          note: dependencies.ffmpeg ? 'ffmpeg 可用，支持 Save as cover 真实截帧' : 'ffmpeg 缺失，仅保留封面颜色写入',
        },
        {
          capability: 'rar/7z 归一化',
          status: dependencies.sevenZip ? 'available' : 'unavailable',
          note: dependencies.sevenZip ? 'WASM 解包器 + Sharp 可用，归一化为 zip(store)' : 'WASM 解包器或 Sharp 不可用，rar/7z 图包被跳过并记录告警',
        },
        {
          capability: 'zip 非 store/deflate 重处理',
          status: dependencies.ffmpeg && dependencies.powershell ? 'available' : 'degraded',
          note:
            dependencies.ffmpeg && dependencies.powershell
              ? 'ffmpeg + powershell 可用，执行 webp90 重打包'
              : '依赖不足，回退 safe-entry 模式，仅加载可直接读取条目',
        },
      ],
      generated_at_ms: Date.now(),
    })
  }

  async readArchiveLoadStatus(): Promise<ReadArchiveLoadStatusResponseDto> {
    await this.ensureStateLoaded()
    this.pruneArchiveNormalizationPendingSets()

    const pendingArchivePaths = Array.from(
      new Set([...this.archiveNormalizationPendingHigh, ...this.archiveNormalizationPendingLow]),
    )
      .filter((value) => this.isArchiveNormalizationTargetEligible(value))
      .sort((left, right) => left.localeCompare(right, 'zh-CN'))

    const runningArchivePath =
      this.archiveNormalizationRunningPath && this.isArchiveNormalizationTargetEligible(this.archiveNormalizationRunningPath)
        ? this.archiveNormalizationRunningPath
        : null

    return readArchiveLoadStatusResponseSchema.parse({
      running_archive_path: runningArchivePath,
      pending_archive_paths: pendingArchivePaths,
      updated_at_ms: Date.now(),
    })
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
    this.importSources = { directories: [], files: [] }
    this.importDirectoryRoots = []
    this.importFileAllowlistKeys.clear()
    this.archiveNormalizationPendingLow.clear()
    this.archiveNormalizationPendingHigh.clear()
    this.archiveNormalizationRunningPath = null
    this.archiveNormalizationStateBySourcePath.clear()
    if (this.archiveNormalizationDrainTimer !== null) {
      clearTimeout(this.archiveNormalizationDrainTimer)
      this.archiveNormalizationDrainTimer = null
    }
    this.mediaTokenIndex.clear()
    this.runningImportTaskIds.clear()
    this.importTaskQueue = Promise.resolve()
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

  async readMediaAccessAudit(): Promise<MediaAccessAuditResponseDto> {
    this.cleanupExpiredTokens()

    const deniedTotal = Object.values(this.mediaAudit.resolveDeniedByReason).reduce((sum, value) => sum + value, 0)
    return mediaAccessAuditResponseSchema.parse({
      resolve_requests: this.mediaAudit.resolveRequests,
      resolve_granted: this.mediaAudit.resolveGranted,
      resolve_denied_total: deniedTotal,
      resolve_denied_by_reason: this.mediaAudit.resolveDeniedByReason,
      token_reads: this.mediaAudit.tokenReads,
      token_hits: this.mediaAudit.tokenHits,
      token_misses: this.mediaAudit.tokenMisses,
      token_expired: this.mediaAudit.tokenExpired,
      token_cleanup_removed: this.mediaAudit.tokenCleanupRemoved,
      token_active: this.mediaTokenIndex.size,
      generated_at_ms: Date.now(),
    })
  }

  private async ensureSnapshotLoaded(): Promise<LibrarySnapshotDto> {
    if (this.snapshotCache) {
      return this.snapshotCache
    }

    await this.ensureStateLoaded()

    if (!this.loadingPromise) {
      this.loadingPromise = this.loadSnapshot().finally(() => {
        this.loadingPromise = null
      })
    }

    this.snapshotCache = await this.loadingPromise
    return this.snapshotCache
  }

  private async collectFiles(): Promise<FileRecord[]> {
    await this.ensureStateLoaded()
    return collectMediaFiles({
      rootDir: this.rootDir,
      importDirectoryRoots: this.importDirectoryRoots,
      importFiles: this.importSources.files,
      legacyImportsDirName: LEGACY_IMPORTS_DIR_NAME,
      directoryScanConcurrency: DIRECTORY_SCAN_CONCURRENCY,
      imageExtensions: IMAGE_EXTENSIONS,
      videoExtensions: VIDEO_EXTENSIONS,
      archiveExtensions: ARCHIVE_EXTENSIONS,
      probeImageDimensionsFromFile,
    })
  }

  private async createVideoSource(file: FileRecord): Promise<VideoItemDto> {
    const mediaLocator: MediaLocatorDto = {
      kind: 'filesystem',
      absolute_path: file.absolutePath,
      extension: file.extension,
      media_type: 'video',
      mime_type: detectMimeTypeByExtension(file.extension, 'video'),
    }

    const videoId = makeStableId('vid', file.absolutePath)
    const runtimeDependencies = await this.ensureRuntimeDependencies()
    const probe = runtimeDependencies.ffprobe ? await probeVideoMetadata(file.absolutePath, FFPROBE_BIN).catch(() => null) : null
    const coverRecord = this.videoCoverOverridesByVideoId.get(videoId)
    const metadataRecord = this.videoMetadataOverridesByVideoId.get(videoId)
    const fileName = path.basename(file.absolutePath)
    const fallbackWorkTitle = deriveVideoWorkTitleFromFileName(fileName)

    return {
      id: videoId,
      file_name: fileName,
      absolute_path: file.absolutePath,
      tree_path: toAbsoluteTreePath(file.absolutePath),
      duration_sec: Math.max(0, Math.round(probe?.durationSec ?? 0)),
      width: probe?.width && probe.width > 0 ? probe.width : 1920,
      height: probe?.height && probe.height > 0 ? probe.height : 1080,
      size_mb: toSafeSizeMb(file.sizeBytes),
      cover_color: coverRecord?.coverColor ?? toDeterministicCoverColor(videoId),
      cover_image_path: coverRecord?.coverImagePath ?? null,
      work_title: metadataRecord?.workTitle ?? fallbackWorkTitle,
      circle: metadataRecord?.circle ?? '未知',
      author: metadataRecord?.author ?? '未知',
      tags: metadataRecord?.tags ?? [],
      grade: metadataRecord?.grade ?? null,
      media_locator: mediaLocator,
    }
  }

  private zipNeedsRepackWebp(entries: ZipCentralEntry[]): boolean {
    for (const entry of entries) {
      if (!IMAGE_EXTENSIONS.has(entry.extension)) {
        continue
      }

      if ((entry.generalPurposeBitFlag & ZIP_GENERAL_PURPOSE_FLAG_ENCRYPTED) !== 0) {
        return true
      }
      if (entry.compressionMethod !== ZIP_COMPRESSION_STORE && entry.compressionMethod !== ZIP_COMPRESSION_DEFLATE) {
        return true
      }
    }
    return false
  }

  private resolveNormalizedArchivePath(sourcePath: string, strategy: ArchiveNormalizationResult['strategy']): string {
    const sourceKey = `${strategy}:${sourcePath}`
    const hash = createHash('sha1').update(sourceKey).digest('hex').slice(0, 16)
    const baseName = path.basename(sourcePath, path.extname(sourcePath))
    const safeBaseName = toSafeFsName(baseName)
    return path.join(this.normalizedArchiveRootDir, `${safeBaseName}-${hash}.zip`)
  }

  private async normalizeArchiveToZip(sourceFile: FileRecord): Promise<ArchiveNormalizationResult> {
    const strategy: ArchiveNormalizationResult['strategy'] = 'zip-repack-webp90-store'
    const runtimeDependencies = await this.ensureRuntimeDependencies()
    if (!runtimeDependencies.powershell || !runtimeDependencies.ffmpeg) {
      throw new Error('archive normalize skipped: powershell/ffmpeg unavailable')
    }

    const sourceStat = await fs.stat(sourceFile.absolutePath)
    const cached = this.normalizedArchiveCacheBySourcePath.get(sourceFile.absolutePath)
    if (
      cached &&
      cached.sourceMtimeMs === sourceStat.mtimeMs &&
      cached.sourceSizeBytes === sourceStat.size &&
      cached.strategy === strategy
    ) {
      const exists = await fs.stat(cached.normalizedArchivePath).catch(() => null)
      if (exists?.isFile()) {
        return {
          normalizedArchivePath: cached.normalizedArchivePath,
          strategy,
        }
      }
    }

    const normalizedArchivePath = this.resolveNormalizedArchivePath(sourceFile.absolutePath, strategy)
    const tempExtractDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-archive-normalize-'))

    try {
      await fs.mkdir(this.normalizedArchiveRootDir, { recursive: true })

      await extractZipWithPowerShell(sourceFile.absolutePath, tempExtractDir)
      await convertDirectoryImagesToWebp90(tempExtractDir, FFMPEG_BIN, IMAGE_EXTENSIONS_FOR_WEBP_CONVERT)

      await writeStoredZipFromDirectory(tempExtractDir, normalizedArchivePath)

      this.normalizedArchiveCacheBySourcePath.set(sourceFile.absolutePath, {
        sourcePath: sourceFile.absolutePath,
        sourceMtimeMs: sourceStat.mtimeMs,
        sourceSizeBytes: sourceStat.size,
        normalizedArchivePath,
        strategy,
      })

      return {
        normalizedArchivePath,
        strategy,
      }
    } finally {
      await fs.rm(tempExtractDir, { recursive: true, force: true })
    }
  }

  private async prepareArchiveEntries(file: FileRecord): Promise<{
    archivePathForMediaRead: string
    imageEntries: ZipCentralEntry[]
  }> {
    if (file.extension === '.rar' || file.extension === '.7z') {
      const replacementZipPath = resolveArchiveReplacementZipPath(file.absolutePath)
      const replacementStat = await fs.stat(replacementZipPath).catch(() => null)

      if (replacementStat?.isFile()) {
        const entries = await scanZipCentralEntries(replacementZipPath).catch(() => [])
        return {
          archivePathForMediaRead: replacementZipPath,
          imageEntries: entries.filter((entry) => IMAGE_EXTENSIONS.has(entry.extension) && isSafeArchiveEntryName(entry.entryName)),
        }
      }

      this.queueRar7zNormalization(file.absolutePath)
      return {
        archivePathForMediaRead: file.absolutePath,
        imageEntries: [],
      }
    }

    if (file.extension !== '.zip') {
      return {
        archivePathForMediaRead: file.absolutePath,
        imageEntries: [],
      }
    }

    let sourceEntries: ZipCentralEntry[] = []
    try {
      sourceEntries = await scanZipCentralEntries(file.absolutePath)
    } catch {
      sourceEntries = []
    }

    const needsRepack = this.zipNeedsRepackWebp(sourceEntries)
    if (!needsRepack) {
      return {
        archivePathForMediaRead: file.absolutePath,
        imageEntries: sourceEntries.filter((entry) => IMAGE_EXTENSIONS.has(entry.extension) && isSafeArchiveEntryName(entry.entryName)),
      }
    }

    try {
      const normalized = await this.normalizeArchiveToZip(file)
      const normalizedEntries = await scanZipCentralEntries(normalized.normalizedArchivePath)
      return {
        archivePathForMediaRead: normalized.normalizedArchivePath,
        imageEntries: normalizedEntries.filter((entry) => IMAGE_EXTENSIONS.has(entry.extension) && isSafeArchiveEntryName(entry.entryName)),
      }
    } catch (error) {
      console.warn('archive normalization failed (zip-repack)', {
        archivePath: file.absolutePath,
        reason: (error as Error).message,
      })
      return {
        archivePathForMediaRead: file.absolutePath,
        imageEntries: sourceEntries.filter(
          (entry) =>
            IMAGE_EXTENSIONS.has(entry.extension) &&
            isSafeArchiveEntryName(entry.entryName) &&
            (entry.generalPurposeBitFlag & ZIP_GENERAL_PURPOSE_FLAG_ENCRYPTED) === 0 &&
            (entry.compressionMethod === ZIP_COMPRESSION_STORE || entry.compressionMethod === ZIP_COMPRESSION_DEFLATE),
        ),
      }
    }
  }

  private async loadSnapshot(): Promise<LibrarySnapshotDto> {
    const files = await this.collectFiles()

    const directoryImageMap = new Map<string, FileRecord[]>()
    const archives: FileRecord[] = []
    const videos: FileRecord[] = []

    for (const file of files) {
      if (IMAGE_EXTENSIONS.has(file.extension)) {
        const directoryPath = path.dirname(file.absolutePath)
        const list = directoryImageMap.get(directoryPath) ?? []
        list.push(file)
        directoryImageMap.set(directoryPath, list)
        continue
      }

      if (ARCHIVE_EXTENSIONS.has(file.extension)) {
        archives.push(file)
        continue
      }

      if (VIDEO_EXTENSIONS.has(file.extension)) {
        videos.push(file)
      }
    }

    const nextArchiveEntryIndexByPath = new Map<string, Set<string>>()
    const nextZipEntryIndexByPath = new Map<string, Map<string, ZipCentralEntry>>()

    const imageDirectories = Array.from(directoryImageMap.entries())
      .map(([directoryPath, imageFiles]) => {
        imageFiles.sort((left, right) => left.relativePath.localeCompare(right.relativePath, 'zh-CN'))
        return createDirectorySource({
          directoryPath,
          imageFiles,
          colorPalette: COLOR_PALETTE,
          packageGradeOverridesBySourceId: this.packageGradeOverridesBySourceId,
        })
      })
      .sort((left, right) => left.absolute_path.localeCompare(right.absolute_path, 'zh-CN'))

    const preparedArchives = await parallelMapLimit(archives, ARCHIVE_SCAN_CONCURRENCY, async (archive) => {
      const prepared = await this.prepareArchiveEntries(archive)
      const imageEntries = prepared.imageEntries.sort((left, right) => left.entryName.localeCompare(right.entryName, 'zh-CN'))
      return {
        archive,
        archivePathForMediaRead: prepared.archivePathForMediaRead,
        imageEntries,
      }
    })

    const imagePackages: ImagePackageDto[] = []
    for (const prepared of preparedArchives) {
      nextArchiveEntryIndexByPath.set(
        prepared.archivePathForMediaRead,
        new Set(prepared.imageEntries.map((entry) => entry.entryName)),
      )
      nextZipEntryIndexByPath.set(
        prepared.archivePathForMediaRead,
        new Map(prepared.imageEntries.map((entry) => [entry.entryName, entry])),
      )

      imagePackages.push(
        createArchiveSource({
          file: prepared.archive,
          imageEntries: prepared.imageEntries,
          archivePathForMediaRead: prepared.archivePathForMediaRead,
          colorPalette: COLOR_PALETTE,
          packageGradeOverridesBySourceId: this.packageGradeOverridesBySourceId,
        }),
      )
    }

    imagePackages.sort((left, right) => left.absolute_path.localeCompare(right.absolute_path, 'zh-CN'))

    const videoItems = (await Promise.all(videos.map((file) => this.createVideoSource(file)))).sort((left, right) =>
      left.absolute_path.localeCompare(right.absolute_path, 'zh-CN'),
    )

    const scannedSnapshot = librarySnapshotDtoSchema.parse({
      image_packages: imagePackages,
      image_directories: imageDirectories,
      videos: videoItems,
    })

    // Swap allowlists atomically with the new snapshot.
    this.archiveEntryIndexByPath = nextArchiveEntryIndexByPath
    this.zipEntryIndexByPath = nextZipEntryIndexByPath

    this.database.replaceSnapshot(scannedSnapshot)
    return this.database.readSnapshot()
  }

  private filterSources(request: Pick<ReadImageSidebarTreeRequestDto, 'feature_filter' | 'grade_overrides'>): {
    imagePackages: ImagePackageDto[]
    imageDirectories: ImagePackageDto[]
  } {
    const snapshot = this.snapshotCache
    if (!snapshot) {
      return {
        imagePackages: [],
        imageDirectories: [],
      }
    }

    const normalizedFilter = normalizeFeatureFilter(request.feature_filter)

    return {
      imagePackages: snapshot.image_packages.filter((source) =>
        matchesFeatureFilter(source, normalizedFilter, request.grade_overrides),
      ),
      imageDirectories: snapshot.image_directories.filter((source) =>
        matchesFeatureFilter(source, normalizedFilter, request.grade_overrides),
      ),
    }
  }

  private async captureVideoCoverImage(
    videoPath: string,
    videoId: string,
    timeSec: number,
  ): Promise<string | null> {
    const runtimeDependencies = await this.ensureRuntimeDependencies()
    if (!runtimeDependencies.ffmpeg) {
      return null
    }

    const safeTime = Number.isFinite(timeSec) ? Math.max(0, timeSec) : 0
    const baseName = `${toSafeFsName(videoId)}-${Date.now()}.jpg`
    const outputPath = path.join(this.coverOutputRootDir, baseName)
    await fs.mkdir(this.coverOutputRootDir, { recursive: true })

    const result = await runProcess(
      FFMPEG_BIN,
      [
        '-y',
        '-v',
        'error',
        '-ss',
        String(safeTime),
        '-i',
        videoPath,
        '-frames:v',
        '1',
        '-q:v',
        '2',
        outputPath,
      ],
      30_000,
    ).catch(() => null)

    if (!result || result.code !== 0) {
      return null
    }

    const stat = await fs.stat(outputPath).catch(() => null)
    if (!stat || !stat.isFile()) {
      return null
    }
    return outputPath
  }

  private resolveThumbnailOptionsFromRequest(
    request: ResolveMediaResourceRequestDto,
  ): ThumbnailRenderOptions | null {
    if (request.preferred_variant !== 'thumbnail') {
      return null
    }
    if (request.locator.media_type !== 'image') {
      return null
    }

    return {
      maxEdge: clampThumbnailMaxEdge(request.thumbnail?.max_edge),
      quality: clampThumbnailQuality(request.thumbnail?.quality),
    }
  }

  private async computeThumbnailCachePath(
    locator: MediaLocatorDto,
    options: ThumbnailRenderOptions,
  ): Promise<string | null> {
    if (locator.media_type !== 'image') {
      return null
    }

    if (locator.kind === 'filesystem') {
      const stat = await fs.stat(locator.absolute_path).catch(() => null)
      if (!stat || !stat.isFile()) {
        return null
      }

      const cacheKey = JSON.stringify({
        variant: 'thumb',
        kind: locator.kind,
        path: locator.absolute_path,
        mtimeMs: stat.mtimeMs,
        size: stat.size,
        maxEdge: options.maxEdge,
        quality: options.quality,
      })
      const hash = createHash('sha1').update(cacheKey).digest('hex')
      return path.join(this.thumbnailCacheRootDir, `${hash}.webp`)
    }

    const archiveStat = await fs.stat(locator.archive_path).catch(() => null)
    if (!archiveStat || !archiveStat.isFile()) {
      return null
    }

    const cacheKey = JSON.stringify({
      variant: 'thumb',
      kind: locator.kind,
      archivePath: locator.archive_path,
      entry: locator.entry_name,
      mtimeMs: archiveStat.mtimeMs,
      size: archiveStat.size,
      maxEdge: options.maxEdge,
      quality: options.quality,
    })
    const hash = createHash('sha1').update(cacheKey).digest('hex')
    return path.join(this.thumbnailCacheRootDir, `${hash}.webp`)
  }

  private async readImageBufferForThumbnail(locator: MediaLocatorDto): Promise<Buffer> {
    if (locator.kind === 'filesystem') {
      return fs.readFile(locator.absolute_path)
    }

    const payload = await readArchiveEntryMedia(locator, locator.mime_type, this.zipEntryIndexByPath)
    return Buffer.from(payload.body)
  }

  private async maybeResolveThumbnailLocator(
    locator: MediaLocatorDto,
    options: ThumbnailRenderOptions,
  ): Promise<MediaLocatorDto | null> {
    if (locator.media_type !== 'image') {
      return null
    }

    const runtimeDependencies = await this.ensureRuntimeDependencies()
    if (!runtimeDependencies.sharp) {
      return null
    }

    const sharpModule = await getSharpModule()
    if (!sharpModule?.default) {
      return null
    }

    const cachePath = await this.computeThumbnailCachePath(locator, options)
    if (!cachePath) {
      return null
    }

    const cached = await fs.stat(cachePath).catch(() => null)
    if (!cached || !cached.isFile()) {
      const sourceBuffer = await this.readImageBufferForThumbnail(locator).catch(() => null)
      if (!sourceBuffer || sourceBuffer.length === 0) {
        return null
      }

      this.thumbnailRenderingInFlight += 1
      try {
        await fs.mkdir(this.thumbnailCacheRootDir, { recursive: true })
        const tempPath = `${cachePath}.${process.pid}.${Date.now()}.tmp.webp`
        const sharp = sharpModule.default

        const generated = await sharp(sourceBuffer, { failOn: 'none' })
          .rotate()
          .resize({
            width: options.maxEdge,
            height: options.maxEdge,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: options.quality })
          .toFile(tempPath)
          .catch(() => null)

        if (!generated) {
          await fs.rm(tempPath, { force: true })
          return null
        }

        await fs.rename(tempPath, cachePath).catch(async () => {
          await fs.rm(tempPath, { force: true })
        })
      } finally {
        this.thumbnailRenderingInFlight = Math.max(0, this.thumbnailRenderingInFlight - 1)
        if (this.archiveNormalizationPendingHigh.size > 0 || this.archiveNormalizationPendingLow.size > 0) {
          this.scheduleArchiveNormalizationDrain(ARCHIVE_NORMALIZE_RECHECK_MS)
        }
      }
    }

    return {
      kind: 'filesystem',
      absolute_path: cachePath,
      extension: '.webp',
      media_type: 'image',
      mime_type: 'image/webp',
    }
  }

  async readLibrarySnapshot(): Promise<LibrarySnapshotDto> {
    this.markInteractiveRead()
    return this.ensureSnapshotLoaded()
  }

  async readImageSidebarTree(
    request: ReadImageSidebarTreeRequestDto,
  ): Promise<ReadImageSidebarTreeResponseDto> {
    this.markInteractiveRead()
    await this.ensureSnapshotLoaded()
    const filtered = this.filterSources(request)

    return readImageSidebarTreeResponseSchema.parse({
      image_packages: filtered.imagePackages,
      image_directories: filtered.imageDirectories,
      tree: buildImageSidebarTree(filtered.imagePackages, filtered.imageDirectories),
    })
  }

  async readImagePage(request: ReadImagePageRequestDto): Promise<ReadImagePageResponseDto> {
    this.markInteractiveRead()
    await this.ensureSnapshotLoaded()
    const filtered = this.filterSources({
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

    const totalItems = selectedSource.images.length
    const pageSize = request.show_names_only ? Math.max(1, totalItems) : request.page_size
    const maxPageIndex = Math.max(0, Math.ceil(totalItems / pageSize) - 1)
    const pageIndex = request.show_names_only ? 0 : Math.min(request.page_index, maxPageIndex)
    const pageStart = pageIndex * pageSize
    const pageEnd = pageStart + pageSize

    const refs: FocusedImageRefDto[] = selectedSource.images
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
    const snapshot = await this.ensureSnapshotLoaded()
    const allSources = [...snapshot.image_packages, ...snapshot.image_directories]
    const source = allSources.find((item) => item.id === request.package_id)
    const image = source?.images[request.image_index]

    if (
      source &&
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
      source && image
        ? {
            package: source,
            image,
            grade: source.mock_grade,
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
    const video = snapshot.videos.find((item) => item.id === request.video_id)
    if (!video) {
      throw new Error(`保存封面失败：video 不存在 ${request.video_id}`)
    }

    const coverImagePath = await this.captureVideoCoverImage(video.absolute_path, video.id, request.time_sec)
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

  private toImportTaskDto(record: {
    taskId: string
    taskType: string
    taskSource: string
    sourcePaths: string[]
    status: 'pending' | 'running' | 'completed' | 'failed'
    progress: number
    processedCount: number
    totalCount: number
    message: string | null
    errorDetail: string | null
    createdAtMs: number
    updatedAtMs: number
  }): ImportTaskDto {
    const taskSource: ImportTaskSourceDto =
      record.taskSource === 'dialog-folders' ||
      record.taskSource === 'drag-drop' ||
      record.taskSource === 'paste'
        ? record.taskSource
        : 'dialog-files'

    return {
      task_id: record.taskId,
      task_type: 'import',
      source: taskSource,
      paths: record.sourcePaths,
      status: record.status,
      progress: Math.max(0, Math.min(1, record.progress)),
      processed_count: Math.max(0, record.processedCount),
      total_count: Math.max(0, record.totalCount),
      message: record.message,
      error_detail: record.errorDetail,
      created_at_ms: record.createdAtMs,
      updated_at_ms: record.updatedAtMs,
    }
  }

  private buildImportTaskId(): string {
    return `import-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`
  }

  private scheduleImportTask(taskId: string): void {
    if (this.runningImportTaskIds.has(taskId)) {
      return
    }

    this.runningImportTaskIds.add(taskId)
    this.importTaskQueue = this.importTaskQueue
      .catch(() => undefined)
      .then(async () => {
        try {
          await this.runImportTask(taskId)
        } catch (error) {
          const reason = error instanceof Error && error.message ? error.message : '未知错误'
          let existing: ReturnType<MediaLibraryDatabase['readTask']>
          try {
            existing = this.database.readTask(taskId)
          } catch {
            existing = null
          }
          if (existing) {
            this.database.upsertTask({
              ...existing,
              status: 'failed',
              progress: 1,
              processedCount: existing.totalCount,
              totalCount: existing.totalCount,
              message: '导入任务执行失败',
              errorDetail: reason,
              updatedAtMs: Date.now(),
            })
          }
          console.error('import task execution failed', {
            taskId,
            reason,
          })
        } finally {
          this.runningImportTaskIds.delete(taskId)
        }
      })
  }

  private async runImportTask(taskId: string): Promise<ImportTaskDto> {
    const finalTask = await executeImportTask({
      taskId,
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

    return this.toImportTaskDto(finalTask)
  }

  async enqueueImportTask(request: EnqueueImportTaskRequestDto): Promise<EnqueueImportTaskResponseDto> {
    const now = Date.now()
    const normalizedPaths = Array.from(new Set(request.paths.map((value) => value.trim()).filter(Boolean)))
    if (normalizedPaths.length === 0) {
      throw new Error('导入失败：路径列表为空')
    }

    const taskId = this.buildImportTaskId()
    this.database.upsertTask({
      taskId,
      taskType: 'import',
      taskSource: request.source,
      sourcePaths: normalizedPaths,
      status: 'pending',
      progress: 0,
      processedCount: 0,
      totalCount: normalizedPaths.length,
      message: '导入任务已入队',
      errorDetail: null,
      createdAtMs: now,
      updatedAtMs: now,
    })

    this.scheduleImportTask(taskId)

    const queued = this.database.readTask(taskId)
    if (!queued) {
      throw new Error(`导入任务状态丢失: ${taskId}`)
    }

    const task = this.toImportTaskDto(queued)
    return enqueueImportTaskResponseSchema.parse({ task })
  }

  async readImportTasks(): Promise<{ tasks: ImportTaskDto[] }> {
    const tasks = this.database.readTasks().map((record) => this.toImportTaskDto(record))
    return readImportTasksResponseSchema.parse({ tasks })
  }

  async retryImportTask(request: RetryImportTaskRequestDto): Promise<RetryImportTaskResponseDto> {
    const existing = this.database.readTask(request.task_id)
    if (!existing) {
      throw new Error(`导入重试失败：任务不存在 ${request.task_id}`)
    }

    const now = Date.now()
    this.database.upsertTask({
      ...existing,
      status: 'pending',
      progress: 0,
      processedCount: 0,
      totalCount: existing.sourcePaths.length,
      message: '导入任务重试已入队',
      errorDetail: null,
      updatedAtMs: now,
    })

    this.scheduleImportTask(request.task_id)

    const queued = this.database.readTask(request.task_id)
    if (!queued) {
      throw new Error(`导入任务状态丢失: ${request.task_id}`)
    }

    const task = this.toImportTaskDto(queued)
    return retryImportTaskResponseSchema.parse({ task })
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
      locator = await assertLocatorAllowed(request.locator, {
        rootDir: this.rootDir,
        importDirectoryRoots: this.importDirectoryRoots,
        importFileAllowlistKeys: this.importFileAllowlistKeys,
        archiveEntryIndexByPath: this.archiveEntryIndexByPath,
        imageExtensions: IMAGE_EXTENSIONS,
        videoExtensions: VIDEO_EXTENSIONS,
      })
    } catch (error) {
      if (error instanceof MediaAccessError) {
        this.countResolveDenied(error.reason)
        console.warn('resolveMediaResource denied', {
          reason: error.reason,
          message: error.message,
        })
      } else {
        this.countResolveDenied('filesystem_file_missing')
      }
      throw error
    }

    const thumbnailOptions = this.resolveThumbnailOptionsFromRequest(request)
    if (thumbnailOptions) {
      const thumbnailLocator = await this.maybeResolveThumbnailLocator(locator, thumbnailOptions)
      if (thumbnailLocator) {
        locator = thumbnailLocator
      }
    }

    const mimeType = locator.mime_type || detectMimeTypeByExtension(locator.extension, locator.media_type)
    const token = randomUUID()
    const expiresAtMs = Date.now() + MEDIA_TOKEN_TTL_MS

    this.mediaTokenIndex.set(token, {
      locator,
      mimeType,
      expiresAtMs,
    })

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

    return readArchiveEntryMedia(locator, record.mimeType, this.zipEntryIndexByPath)
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

    return readArchiveEntryMediaStream(locator, record.mimeType, this.zipEntryIndexByPath, signal)
  }

  private requireMediaTokenRecord(token: string): MediaTokenRecord {
    this.cleanupExpiredTokens()
    this.mediaAudit.tokenReads += 1

    const record = this.mediaTokenIndex.get(token)
    if (!record) {
      this.mediaAudit.tokenMisses += 1
      throw new Error('媒体资源令牌不存在')
    }

    if (record.expiresAtMs <= Date.now()) {
      this.mediaAudit.tokenExpired += 1
      this.mediaTokenIndex.delete(token)
      throw new Error('媒体资源令牌已过期')
    }

    this.mediaAudit.tokenHits += 1
    return record
  }
}
