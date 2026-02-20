import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  librarySnapshotDtoSchema,
  type AudioItemDto,
  type ImagePackageDto,
  type LibrarySnapshotDto,
  type MediaLocatorDto,
  type VideoItemDto,
} from '../../../src/contracts/backend'
import { resolveArchiveReplacementZipPath } from '../../archiveWasmExtractor'
import {
  convertDirectoryImagesToWebp90,
  extractZipWithPowerShell,
} from '../../fileSystemArchiveNormalizeHelpers'
import { parallelMapLimit } from '../../fileSystemAsyncUtils'
import { collectMediaFiles, type FileRecord } from '../../fileSystemFileCollector'
import {
  detectMimeTypeByExtension,
  deriveVideoWorkTitleFromFileName,
  isPathInsideRoot,
  makeStableId,
  normalizeAllowlistKey,
  normalizePathKey,
  toAbsoluteTreePath,
  toDeterministicCoverColor,
  toSafeFsName,
  toSafeSizeMb,
} from '../../fileSystemServiceHelpers'
import { createArchiveSource, createDirectorySource } from '../../fileSystemSourceFactories'
import {
  readArchiveEntryMedia,
} from '../../fileSystemMediaReaders'
import { probeAudioMetadata, probeVideoMetadata } from '../../fileSystemRuntimeHelpers'
import { MediaLibraryDatabase } from '../../mediaLibraryDatabase'
import { writeStoredZipFromDirectory } from '../../fileSystemZipStoreWriter'
import {
  isSafeArchiveEntryName,
  scanZipCentralEntries,
  type ZipCentralEntry,
} from '../../zipArchiveHelpers'
import { ImportPathRegistry } from './importPathRegistry'
import type { PersistedVideoMetadataRecord } from '../../fileSystemMetadataWriters'
import type { RuntimeDependencySnapshot } from './runtimeDependencyService'

interface ArchiveNormalizationResult {
  normalizedArchivePath: string
  strategy: 'zip-repack-webp90-store'
}

interface NormalizedArchiveCacheRecord {
  sourcePath: string
  sourceMtimeMs: number
  sourceSizeBytes: number
  normalizedArchivePath: string
  strategy: ArchiveNormalizationResult['strategy']
}

export interface PersistedVideoCoverRecord {
  coverColor: string
  coverImagePath: string | null
  updatedAtMs: number
}

export interface PersistedAudioMetadataRecord {
  album: string
  author: string
  trackTitle: string
  seriesId: string
  updatedAtMs: number
}

interface LibrarySnapshotServiceOptions {
  rootDir: string
  normalizedArchiveRootDir: string
  legacyImportsDirName: string
  database: MediaLibraryDatabase
  importPathRegistry: ImportPathRegistry
  imageExtensions: ReadonlySet<string>
  videoExtensions: ReadonlySet<string>
  audioExtensions: ReadonlySet<string>
  archiveExtensions: ReadonlySet<string>
  colorPalette: readonly string[]
  imageExtensionsForWebpConvert: ReadonlySet<string>
  directoryScanConcurrency: number
  archiveScanConcurrency: number
  ffprobeConcurrency: number
  ffmpegBin: string
  ffprobeBin: string
  zipGeneralPurposeFlagEncrypted: number
  zipCompressionStore: number
  zipCompressionDeflate: number
  ensureRuntimeDependencies: () => Promise<RuntimeDependencySnapshot>
  queueRar7zNormalization: (sourceArchivePath: string, priority?: 'low' | 'high') => void
  getPackageGradeOverridesBySourceId: () => Map<string, number | null>
  getVideoCoverOverridesByVideoId: () => Map<string, PersistedVideoCoverRecord>
  getVideoMetadataOverridesByVideoId: () => Map<string, PersistedVideoMetadataRecord>
  getAudioMetadataOverridesByAudioId: () => Map<string, PersistedAudioMetadataRecord>
  getMusicImportSources: () => { directories: string[]; files: string[] }
  upsertAudioMetadataFromScan: (
    audioId: string,
    payload: { album: string; author: string; trackTitle: string; seriesId: string },
  ) => void
  withArchiveReadLock?: <T>(archivePath: string, task: () => Promise<T>) => Promise<T>
}

interface MusicImportPathContext {
  directoryRoots: string[]
  fileAllowlistKeys: Set<string>
}

export interface SnapshotRefreshProgress {
  stage: 'collecting' | 'building' | 'persisting'
  scanned_file_count: number
  discovered_container_count?: number
  unit_kind?: 'container'
  unit_processed_count?: number
  unit_total_count?: number
  message: string
}

export interface SnapshotRefreshOptions {
  onProgress?: (payload: SnapshotRefreshProgress) => void
}

const MUSIC_BOOKLET_ROOT_LABEL = 'CD Booklet'
const MUSIC_ISOLATED_FALLBACK_GROUP = 'unknown artist'
const COLLECTING_PREVIEW_CONTAINER_LIMIT = 120
const COLLECTING_PREVIEW_PERSIST_INTERVAL_MS = 1_500

function normalizeTreeSegment(value: string, fallback: string): string {
  const normalized = value
    .replace(/[\\/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized.length > 0 ? normalized : fallback
}

function buildBookletTreePath(directoryPath: string): string[] {
  return [MUSIC_BOOKLET_ROOT_LABEL, ...toAbsoluteTreePath(directoryPath)]
}

function resolveIsolatedAudioGroup(album: string): string {
  const candidate = album.trim().length > 0 ? album : MUSIC_ISOLATED_FALLBACK_GROUP
  return normalizeTreeSegment(candidate, MUSIC_ISOLATED_FALLBACK_GROUP)
}

export class LibrarySnapshotService {
  private snapshotCache: LibrarySnapshotDto | null = null

  private loadingPromise: Promise<LibrarySnapshotDto> | null = null

  private warmupRefreshTriggered = false

  private archiveEntryIndexByPath = new Map<string, Set<string>>()

  private zipEntryIndexByPath = new Map<string, Map<string, ZipCentralEntry>>()

  private normalizedArchiveCacheBySourcePath = new Map<string, NormalizedArchiveCacheRecord>()

  constructor(private readonly options: LibrarySnapshotServiceOptions) {}

  private async withArchiveReadLock<T>(archivePath: string, task: () => Promise<T>): Promise<T> {
    if (this.options.withArchiveReadLock) {
      return await this.options.withArchiveReadLock(archivePath, task)
    }
    return await task()
  }

  invalidateCache(): void {
    this.snapshotCache = null
    this.normalizedArchiveCacheBySourcePath.clear()
  }

  clearRuntimeState(): void {
    this.snapshotCache = null
    this.loadingPromise = null
    this.archiveEntryIndexByPath.clear()
    this.zipEntryIndexByPath.clear()
    this.normalizedArchiveCacheBySourcePath.clear()
  }

  isSnapshotLoading(): boolean {
    return this.loadingPromise !== null
  }

  getArchiveEntryIndexByPath(): Map<string, Set<string>> {
    return this.archiveEntryIndexByPath
  }

  getZipEntryIndexByPath(): Map<string, Map<string, ZipCentralEntry>> {
    return this.zipEntryIndexByPath
  }

  peekSnapshotCache(): LibrarySnapshotDto | null {
    return this.snapshotCache
  }

  syncSnapshotFromDatabase(): LibrarySnapshotDto {
    const snapshot = this.options.database.readSnapshot()
    this.snapshotCache = snapshot
    return snapshot
  }

  async ensureSnapshotLoaded(ensureStateLoaded: () => Promise<void>): Promise<LibrarySnapshotDto> {
    if (this.snapshotCache) {
      return this.snapshotCache
    }

    await ensureStateLoaded()

    this.snapshotCache = this.options.database.readSnapshot()

    if (!this.warmupRefreshTriggered && this.hasImportSources() && this.isSnapshotEmpty(this.snapshotCache)) {
      this.warmupRefreshTriggered = true
      void this.refreshSnapshot(ensureStateLoaded).catch((error) => {
        console.warn('snapshot warmup refresh failed', {
          reason: error instanceof Error && error.message ? error.message : String(error),
        })
      })
    }

    return this.snapshotCache
  }

  async refreshSnapshot(
    ensureStateLoaded: () => Promise<void>,
    options?: SnapshotRefreshOptions,
  ): Promise<LibrarySnapshotDto> {
    await ensureStateLoaded()

    if (!this.loadingPromise) {
      this.loadingPromise = this.loadSnapshot(options).finally(() => {
        this.loadingPromise = null
      })
    }

    this.snapshotCache = await this.loadingPromise
    return this.snapshotCache
  }

  async refreshArchiveIndexesForPaths(archivePaths: Iterable<string>): Promise<void> {
    const normalizedPaths = Array.from(new Set(Array.from(archivePaths).map((value) => path.resolve(value))))
    for (const archivePath of normalizedPaths) {
      const centralEntries = await this.withArchiveReadLock(archivePath, async () => {
        const stat = await fs.stat(archivePath).catch(() => null)
        if (!stat || !stat.isFile()) {
          return null
        }

        return await scanZipCentralEntries(archivePath).catch(() => null)
      })

      if (!centralEntries) {
        this.archiveEntryIndexByPath.delete(archivePath)
        this.zipEntryIndexByPath.delete(archivePath)
        continue
      }

      const imageEntries = centralEntries.filter(
        (entry) => this.options.imageExtensions.has(entry.extension) && isSafeArchiveEntryName(entry.entryName),
      )

      this.archiveEntryIndexByPath.set(archivePath, new Set(imageEntries.map((entry) => entry.entryName)))
      this.zipEntryIndexByPath.set(
        archivePath,
        new Map(imageEntries.map((entry) => [entry.entryName, entry] as const)),
      )
    }
  }

  pruneArchiveIndexesByDeletedRoots(
    deletedPaths: Iterable<string>,
    onArchivePathPruned?: (archivePath: string) => void,
  ): void {
    const roots = Array.from(new Set(Array.from(deletedPaths).map((value) => path.resolve(value))))
    if (roots.length === 0) {
      return
    }

    const shouldPrunePath = (archivePath: string): boolean => {
      const resolvedArchivePath = path.resolve(archivePath)
      return roots.some(
        (rootPath) =>
          normalizeAllowlistKey(rootPath) === normalizeAllowlistKey(resolvedArchivePath) ||
          isPathInsideRoot(rootPath, resolvedArchivePath),
      )
    }

    for (const archivePath of Array.from(this.archiveEntryIndexByPath.keys())) {
      if (!shouldPrunePath(archivePath)) {
        continue
      }
      this.archiveEntryIndexByPath.delete(archivePath)
      this.zipEntryIndexByPath.delete(archivePath)
      this.normalizedArchiveCacheBySourcePath.delete(archivePath)
      onArchivePathPruned?.(archivePath)
    }
  }

  async readImageBufferForThumbnail(locator: MediaLocatorDto): Promise<Buffer> {
    if (locator.kind === 'filesystem') {
      return fs.readFile(locator.absolute_path)
    }

    const payload = await this.withArchiveReadLock(locator.archive_path, () =>
      readArchiveEntryMedia(locator, locator.mime_type, this.zipEntryIndexByPath),
    )
    return Buffer.from(payload.body)
  }

  private async collectFiles(
    options?: {
      onFileDiscovered?: (payload: { scannedCount: number; absolutePath: string; extension: string }) => void
    },
  ): Promise<FileRecord[]> {
    const musicImportSources = this.options.getMusicImportSources()

    return collectMediaFiles({
      rootDir: this.options.rootDir,
      importDirectoryRoots: this.options.importPathRegistry.getImportDirectoryRoots(),
      importFiles: this.options.importPathRegistry.getImportFilePaths(),
      musicImportDirectoryRoots: musicImportSources.directories,
      musicImportFiles: musicImportSources.files,
      legacyImportsDirName: this.options.legacyImportsDirName,
      directoryScanConcurrency: this.options.directoryScanConcurrency,
      imageExtensions: this.options.imageExtensions,
      videoExtensions: this.options.videoExtensions,
      audioExtensions: this.options.audioExtensions,
      archiveExtensions: this.options.archiveExtensions,
      onRecordDiscovered: options?.onFileDiscovered,
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
    const runtimeDependencies = await this.options.ensureRuntimeDependencies()
    const probe = runtimeDependencies.ffprobe
      ? await probeVideoMetadata(file.absolutePath, this.options.ffprobeBin).catch(() => null)
      : null
    const coverRecord = this.options.getVideoCoverOverridesByVideoId().get(videoId)
    const metadataRecord = this.options.getVideoMetadataOverridesByVideoId().get(videoId)
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
      work_title_jpn: metadataRecord?.workTitleJpn ?? '',
      series_id: metadataRecord?.seriesId ?? '',
      circle: metadataRecord?.circle ?? '未知',
      circle_jpn: metadataRecord?.circleJpn ?? '',
      author: metadataRecord?.author ?? '未知',
      author_jpn: metadataRecord?.authorJpn ?? '',
      tags: metadataRecord?.tags ?? [],
      grade: metadataRecord?.grade ?? null,
      media_locator: mediaLocator,
    }
  }

  private async createAudioSource(
    file: FileRecord,
    musicImportPathContext: MusicImportPathContext,
  ): Promise<{
    audio: AudioItemDto
    parsedMetadataForUpsert: {
      audioId: string
      payload: { album: string; author: string; trackTitle: string; seriesId: string }
    } | null
  }> {
    const mediaLocator: MediaLocatorDto = {
      kind: 'filesystem',
      absolute_path: file.absolutePath,
      extension: file.extension,
      media_type: 'audio',
      mime_type: detectMimeTypeByExtension(file.extension, 'audio'),
    }

    const audioId = makeStableId('aud', file.absolutePath)
    const runtimeDependencies = await this.options.ensureRuntimeDependencies()
    const probe = runtimeDependencies.ffprobe
      ? await probeAudioMetadata(file.absolutePath, this.options.ffprobeBin).catch(() => null)
      : null
    const metadataRecord = this.options.getAudioMetadataOverridesByAudioId().get(audioId)
    const fileName = path.basename(file.absolutePath)
    const fallbackTrackTitle = deriveVideoWorkTitleFromFileName(fileName)

    const parsedAlbum = probe?.album ?? ''
    const parsedAuthor = probe?.author ?? ''
    const parsedTrackTitle = probe?.trackTitle ?? ''
    const parsedSeriesId = probe?.seriesId ?? ''

    const album = metadataRecord?.album ?? parsedAlbum
    const author = metadataRecord?.author ?? parsedAuthor
    const trackTitle = metadataRecord?.trackTitle ?? parsedTrackTitle
    const seriesId = metadataRecord?.seriesId ?? parsedSeriesId
    const audioPathKey = normalizeAllowlistKey(file.absolutePath)
    const isExplicitMusicFile = musicImportPathContext.fileAllowlistKeys.has(audioPathKey)
    const underMusicDirectory = musicImportPathContext.directoryRoots.some((rootPath) => isPathInsideRoot(rootPath, file.absolutePath))
    const isIsolatedMusicFile = isExplicitMusicFile && !underMusicDirectory
    const treePath = isIsolatedMusicFile ? [resolveIsolatedAudioGroup(album), fileName] : toAbsoluteTreePath(file.absolutePath)

    const parsedMetadataForUpsert =
      !metadataRecord && (parsedAlbum.length > 0 || parsedAuthor.length > 0 || parsedTrackTitle.length > 0 || parsedSeriesId.length > 0)
        ? {
            audioId,
            payload: {
              album: parsedAlbum,
              author: parsedAuthor,
              trackTitle: parsedTrackTitle,
              seriesId: parsedSeriesId,
            },
          }
        : null

    return {
      audio: {
        id: audioId,
        file_name: fileName,
        absolute_path: file.absolutePath,
        tree_path: treePath,
        duration_sec: Math.max(0, Math.round(probe?.durationSec ?? 0)),
        size_mb: toSafeSizeMb(file.sizeBytes),
        album,
        author,
        track_title: trackTitle.trim().length > 0 ? trackTitle : fallbackTrackTitle,
        series_id: seriesId,
        media_locator: mediaLocator,
      },
      parsedMetadataForUpsert,
    }
  }

  private zipNeedsRepackWebp(entries: ZipCentralEntry[]): boolean {
    for (const entry of entries) {
      if (!this.options.imageExtensions.has(entry.extension)) {
        continue
      }

      if ((entry.generalPurposeBitFlag & this.options.zipGeneralPurposeFlagEncrypted) !== 0) {
        return true
      }
      if (
        entry.compressionMethod !== this.options.zipCompressionStore &&
        entry.compressionMethod !== this.options.zipCompressionDeflate
      ) {
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
    return path.join(this.options.normalizedArchiveRootDir, `${safeBaseName}-${hash}.zip`)
  }

  private async normalizeArchiveToZip(sourceFile: FileRecord): Promise<ArchiveNormalizationResult> {
    const strategy: ArchiveNormalizationResult['strategy'] = 'zip-repack-webp90-store'
    const runtimeDependencies = await this.options.ensureRuntimeDependencies()
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
      await fs.mkdir(this.options.normalizedArchiveRootDir, { recursive: true })

      await extractZipWithPowerShell(sourceFile.absolutePath, tempExtractDir)
      await convertDirectoryImagesToWebp90(
        tempExtractDir,
        this.options.ffmpegBin,
        this.options.imageExtensionsForWebpConvert,
      )

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
        const entries = await this.withArchiveReadLock(replacementZipPath, async () =>
          await scanZipCentralEntries(replacementZipPath).catch(() => []),
        )
        return {
          archivePathForMediaRead: replacementZipPath,
          imageEntries: entries.filter(
            (entry) => this.options.imageExtensions.has(entry.extension) && isSafeArchiveEntryName(entry.entryName),
          ),
        }
      }

      this.options.queueRar7zNormalization(file.absolutePath)
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
      sourceEntries = await this.withArchiveReadLock(file.absolutePath, async () =>
        await scanZipCentralEntries(file.absolutePath),
      )
    } catch {
      sourceEntries = []
    }

    const needsRepack = this.zipNeedsRepackWebp(sourceEntries)
    if (!needsRepack) {
      return {
        archivePathForMediaRead: file.absolutePath,
        imageEntries: sourceEntries.filter(
          (entry) => this.options.imageExtensions.has(entry.extension) && isSafeArchiveEntryName(entry.entryName),
        ),
      }
    }

    try {
      const normalized = await this.normalizeArchiveToZip(file)
      const normalizedEntries = await this.withArchiveReadLock(normalized.normalizedArchivePath, async () =>
        await scanZipCentralEntries(normalized.normalizedArchivePath),
      )
      return {
        archivePathForMediaRead: normalized.normalizedArchivePath,
        imageEntries: normalizedEntries.filter(
          (entry) => this.options.imageExtensions.has(entry.extension) && isSafeArchiveEntryName(entry.entryName),
        ),
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
            this.options.imageExtensions.has(entry.extension) &&
            isSafeArchiveEntryName(entry.entryName) &&
            (entry.generalPurposeBitFlag & this.options.zipGeneralPurposeFlagEncrypted) === 0 &&
            (entry.compressionMethod === this.options.zipCompressionStore ||
              entry.compressionMethod === this.options.zipCompressionDeflate),
        ),
      }
    }
  }

  private emitRefreshProgress(
    options: SnapshotRefreshOptions | undefined,
    payload: SnapshotRefreshProgress,
  ): void {
    options?.onProgress?.(payload)
  }

  private hasImportSources(): boolean {
    const importDirectoryRoots = this.options.importPathRegistry.getImportDirectoryRoots()
    const importFilePaths = this.options.importPathRegistry.getImportFilePaths()
    const musicImportSources = this.options.getMusicImportSources()
    return (
      importDirectoryRoots.length > 0 ||
      importFilePaths.length > 0 ||
      musicImportSources.directories.length > 0 ||
      musicImportSources.files.length > 0
    )
  }

  private isSnapshotEmpty(snapshot: LibrarySnapshotDto): boolean {
    return (
      snapshot.image_packages.length === 0 &&
      snapshot.image_directories.length === 0 &&
      snapshot.videos.length === 0 &&
      (snapshot.audios?.length ?? 0) === 0
    )
  }

  private async loadSnapshot(options?: SnapshotRefreshOptions): Promise<LibrarySnapshotDto> {
    let scannedFileCount = 0
    let discoveredContainerCount = 0
    let lastProgressReportedAt = 0
    let lastPreviewPersistedAtMs = 0
    let lastPreviewPersistedContainerCount = 0

    const baseSnapshot = this.options.database.readSnapshot()
    const previewDirectoryImageFilesByPath = new Map<string, FileRecord[]>()
    const previewDirectoryImageFileKeysByPath = new Map<string, Set<string>>()
    const previewArchivePaths = new Set<string>()

    const persistCollectingPreviewSnapshot = (force = false): void => {
      if (
        !force &&
        discoveredContainerCount < COLLECTING_PREVIEW_CONTAINER_LIMIT &&
        lastPreviewPersistedContainerCount > 0
      ) {
        return
      }

      const now = Date.now()
      if (
        !force &&
        discoveredContainerCount - lastPreviewPersistedContainerCount < 24 &&
        now - lastPreviewPersistedAtMs < COLLECTING_PREVIEW_PERSIST_INTERVAL_MS
      ) {
        return
      }

      const previewContainerRefs: Array<{ kind: 'directory' | 'archive'; path: string }> = []
      for (const directoryPath of previewDirectoryImageFilesByPath.keys()) {
        previewContainerRefs.push({ kind: 'directory', path: directoryPath })
      }
      for (const archivePath of previewArchivePaths.values()) {
        previewContainerRefs.push({ kind: 'archive', path: archivePath })
      }
      previewContainerRefs.sort((left, right) => left.path.localeCompare(right.path, 'zh-CN'))

      const limitedRefs = previewContainerRefs.slice(0, COLLECTING_PREVIEW_CONTAINER_LIMIT)
      if (limitedRefs.length === 0) {
        return
      }

      const packageGradeOverridesBySourceId = this.options.getPackageGradeOverridesBySourceId()
      const previewDirectories: ImagePackageDto[] = []
      const previewPackages: ImagePackageDto[] = []

      for (const ref of limitedRefs) {
        if (ref.kind === 'directory') {
          const imageFiles = previewDirectoryImageFilesByPath.get(ref.path)
          if (!imageFiles || imageFiles.length === 0) {
            continue
          }
          previewDirectories.push(
            createDirectorySource({
              directoryPath: ref.path,
              imageFiles,
              colorPalette: [...this.options.colorPalette],
              packageGradeOverridesBySourceId,
            }),
          )
          continue
        }

        const extension = path.extname(ref.path).toLowerCase()
        const archiveFile: FileRecord = {
          absolutePath: ref.path,
          relativePath: normalizePathKey(ref.path),
          extension,
          sizeBytes: 0,
          width: 0,
          height: 0,
        }
        previewPackages.push(
          createArchiveSource({
            file: archiveFile,
            imageEntries: [],
            archivePathForMediaRead: ref.path,
            colorPalette: [...this.options.colorPalette],
            packageGradeOverridesBySourceId,
          }),
        )
      }

      const packageByPath = new Map(baseSnapshot.image_packages.map((item) => [item.absolute_path, item]))
      const directoryByPath = new Map(baseSnapshot.image_directories.map((item) => [item.absolute_path, item]))

      for (const item of previewPackages) {
        packageByPath.set(item.absolute_path, item)
      }
      for (const item of previewDirectories) {
        directoryByPath.set(item.absolute_path, item)
      }

      const previewSnapshot = librarySnapshotDtoSchema.parse({
        image_packages: Array.from(packageByPath.values()).sort((left, right) =>
          left.absolute_path.localeCompare(right.absolute_path, 'zh-CN'),
        ),
        image_directories: Array.from(directoryByPath.values()).sort((left, right) =>
          left.absolute_path.localeCompare(right.absolute_path, 'zh-CN'),
        ),
        videos: baseSnapshot.videos,
        audios: baseSnapshot.audios ?? [],
      })

      this.snapshotCache = previewSnapshot
      this.options.database.replaceSnapshot(previewSnapshot)
      lastPreviewPersistedAtMs = now
      lastPreviewPersistedContainerCount = discoveredContainerCount
    }

    console.info('library snapshot refresh started')
    this.emitRefreshProgress(options, {
      stage: 'collecting',
      scanned_file_count: scannedFileCount,
      discovered_container_count: discoveredContainerCount,
      message: '薄扫描进行中',
    })

    const files = await this.collectFiles({
      onFileDiscovered: (payload) => {
        scannedFileCount = payload.scannedCount

        if (this.options.imageExtensions.has(payload.extension)) {
          const directoryPath = path.dirname(payload.absolutePath)
          let imageFiles = previewDirectoryImageFilesByPath.get(directoryPath)
          if (!imageFiles) {
            imageFiles = []
            previewDirectoryImageFilesByPath.set(directoryPath, imageFiles)
          }

          let fileKeys = previewDirectoryImageFileKeysByPath.get(directoryPath)
          if (!fileKeys) {
            fileKeys = new Set<string>()
            previewDirectoryImageFileKeysByPath.set(directoryPath, fileKeys)
          }

          const fileKey = normalizeAllowlistKey(payload.absolutePath)
          if (!fileKeys.has(fileKey)) {
            fileKeys.add(fileKey)
            imageFiles.push({
              absolutePath: payload.absolutePath,
              relativePath: normalizePathKey(payload.absolutePath),
              extension: payload.extension,
              sizeBytes: 0,
              width: 0,
              height: 0,
            })
          }
        }

        if (this.options.archiveExtensions.has(payload.extension)) {
          previewArchivePaths.add(path.resolve(payload.absolutePath))
        }

        discoveredContainerCount = previewDirectoryImageFilesByPath.size + previewArchivePaths.size
        persistCollectingPreviewSnapshot(false)

        const now = Date.now()
        if (
          scannedFileCount === 1 ||
          scannedFileCount % 200 === 0 ||
          discoveredContainerCount % 32 === 0 ||
          now - lastProgressReportedAt >= 300
        ) {
          lastProgressReportedAt = now
          this.emitRefreshProgress(options, {
            stage: 'collecting',
            scanned_file_count: scannedFileCount,
            discovered_container_count: discoveredContainerCount,
            message: `薄扫描进行中，已处理 ${scannedFileCount} 个文件，已发现 ${discoveredContainerCount} 个容器`,
          })
        }
      },
    })
    persistCollectingPreviewSnapshot(true)
    const musicImportSources = this.options.getMusicImportSources()
    const musicImportDirectoryRoots = Array.from(new Set(musicImportSources.directories.map((value) => path.resolve(value))))
    const musicImportFileAllowlistKeys = new Set(
      musicImportSources.files.map((value) => normalizeAllowlistKey(path.resolve(value))),
    )

    const directoryImageMap = new Map<string, FileRecord[]>()
    const archives: FileRecord[] = []
    const videos: FileRecord[] = []
    const audios: FileRecord[] = []

    for (const file of files) {
      if (this.options.imageExtensions.has(file.extension)) {
        const directoryPath = path.dirname(file.absolutePath)
        const list = directoryImageMap.get(directoryPath) ?? []
        list.push(file)
        directoryImageMap.set(directoryPath, list)
        continue
      }

      if (this.options.archiveExtensions.has(file.extension)) {
        archives.push(file)
        continue
      }

      if (this.options.videoExtensions.has(file.extension)) {
        videos.push(file)
        continue
      }

      if (this.options.audioExtensions.has(file.extension)) {
        audios.push(file)
      }
    }

    const totalContainerCount = directoryImageMap.size + archives.length
    this.emitRefreshProgress(options, {
      stage: 'building',
      scanned_file_count: scannedFileCount,
      discovered_container_count: discoveredContainerCount,
      unit_kind: 'container',
      unit_processed_count: 0,
      unit_total_count: Math.max(1, totalContainerCount),
      message: `薄扫描完成，开始构建容器（0/${Math.max(1, totalContainerCount)}）`,
    })

    const musicRootMediaFlags = new Map<string, { hasAudio: boolean; hasImage: boolean }>()
    for (const rootPath of musicImportDirectoryRoots) {
      musicRootMediaFlags.set(rootPath, { hasAudio: false, hasImage: false })
    }

    for (const file of files) {
      for (const rootPath of musicImportDirectoryRoots) {
        if (!isPathInsideRoot(rootPath, file.absolutePath)) {
          continue
        }

        const flags = musicRootMediaFlags.get(rootPath)
        if (!flags) {
          continue
        }
        if (this.options.audioExtensions.has(file.extension)) {
          flags.hasAudio = true
        }
        if (this.options.imageExtensions.has(file.extension)) {
          flags.hasImage = true
        }
      }
    }

    const bookletRootPaths = Array.from(musicRootMediaFlags.entries())
      .filter(([, flags]) => flags.hasAudio && flags.hasImage)
      .map(([rootPath]) => rootPath)
      .sort((left, right) => right.length - left.length)

    const nextArchiveEntryIndexByPath = new Map<string, Set<string>>()
    const nextZipEntryIndexByPath = new Map<string, Map<string, ZipCentralEntry>>()

    const totalContainerCountSafe = Math.max(1, totalContainerCount)
    let builtContainerCount = 0
    let lastBuildingProgressReportedAtMs = 0
    const reportBuildingProgress = (message: string, force = false): void => {
      const now = Date.now()
      if (!force && now - lastBuildingProgressReportedAtMs < 280 && builtContainerCount % 24 !== 0) {
        return
      }

      lastBuildingProgressReportedAtMs = now
      this.emitRefreshProgress(options, {
        stage: 'building',
        scanned_file_count: scannedFileCount,
        discovered_container_count: discoveredContainerCount,
        unit_kind: 'container',
        unit_processed_count: Math.min(totalContainerCountSafe, builtContainerCount),
        unit_total_count: totalContainerCountSafe,
        message,
      })
    }

    const packageGradeOverridesBySourceId = this.options.getPackageGradeOverridesBySourceId()
    const sortedDirectoryEntries = Array.from(directoryImageMap.entries()).sort((left, right) =>
      left[0].localeCompare(right[0], 'zh-CN'),
    )
    const imageDirectories: ImagePackageDto[] = []
    for (const [directoryPath, imageFiles] of sortedDirectoryEntries) {
      imageFiles.sort((left, right) => left.relativePath.localeCompare(right.relativePath, 'zh-CN'))
      const bookletRoot = bookletRootPaths.find((rootPath) => isPathInsideRoot(rootPath, directoryPath))
      imageDirectories.push(
        createDirectorySource({
          directoryPath,
          imageFiles,
          colorPalette: [...this.options.colorPalette],
          packageGradeOverridesBySourceId,
          treePathOverride: bookletRoot ? buildBookletTreePath(directoryPath) : undefined,
        }),
      )
      builtContainerCount += 1
      reportBuildingProgress(`构建容器进行中（${Math.min(totalContainerCountSafe, builtContainerCount)}/${totalContainerCountSafe}）`)
    }

    imageDirectories.sort((left, right) => left.absolute_path.localeCompare(right.absolute_path, 'zh-CN'))

    const preparedArchives = await parallelMapLimit(archives, this.options.archiveScanConcurrency, async (archive) => {
      const prepared = await this.prepareArchiveEntries(archive)
      const imageEntries = prepared.imageEntries.sort((left, right) => left.entryName.localeCompare(right.entryName, 'zh-CN'))
      builtContainerCount += 1
      reportBuildingProgress(`构建容器进行中（${Math.min(totalContainerCountSafe, builtContainerCount)}/${totalContainerCountSafe}）`)
      return {
        archive,
        archivePathForMediaRead: prepared.archivePathForMediaRead,
        imageEntries,
      }
    })
    reportBuildingProgress(`构建容器完成（${Math.min(totalContainerCountSafe, builtContainerCount)}/${totalContainerCountSafe}）`, true)

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
          colorPalette: [...this.options.colorPalette],
          packageGradeOverridesBySourceId,
        }),
      )
    }

    imagePackages.sort((left, right) => left.absolute_path.localeCompare(right.absolute_path, 'zh-CN'))

    const videoItems = (await parallelMapLimit(videos, this.options.ffprobeConcurrency, async (file) => this.createVideoSource(file))).sort((left, right) =>
      left.absolute_path.localeCompare(right.absolute_path, 'zh-CN'),
    )

    const audioSourceResults = await parallelMapLimit(
      audios,
      this.options.ffprobeConcurrency,
      async (file) =>
        this.createAudioSource(file, {
          directoryRoots: musicImportDirectoryRoots,
          fileAllowlistKeys: musicImportFileAllowlistKeys,
        }),
    )
    const audioItems = audioSourceResults
      .map((result) => result.audio)
      .sort((left, right) => left.absolute_path.localeCompare(right.absolute_path, 'zh-CN'))

    const scannedSnapshot = librarySnapshotDtoSchema.parse({
      image_packages: imagePackages,
      image_directories: imageDirectories,
      videos: videoItems,
      audios: audioItems,
    })

    this.emitRefreshProgress(options, {
      stage: 'persisting',
      scanned_file_count: scannedFileCount,
      discovered_container_count: discoveredContainerCount,
      unit_kind: 'container',
      unit_processed_count: totalContainerCountSafe,
      unit_total_count: totalContainerCountSafe,
      message: '写入数据库中',
    })

    this.archiveEntryIndexByPath = nextArchiveEntryIndexByPath
    this.zipEntryIndexByPath = nextZipEntryIndexByPath

    this.options.database.replaceSnapshot(scannedSnapshot)

    for (const result of audioSourceResults) {
      if (!result.parsedMetadataForUpsert) {
        continue
      }
      this.options.upsertAudioMetadataFromScan(
        result.parsedMetadataForUpsert.audioId,
        result.parsedMetadataForUpsert.payload,
      )
    }

    const snapshot = this.options.database.readSnapshot()
    console.info('library snapshot refresh finished', {
      scannedFileCount,
      imagePackageCount: snapshot.image_packages.length,
      imageDirectoryCount: snapshot.image_directories.length,
      videoCount: snapshot.videos.length,
      audioCount: snapshot.audios?.length ?? 0,
    })
    this.emitRefreshProgress(options, {
      stage: 'persisting',
      scanned_file_count: scannedFileCount,
      discovered_container_count: discoveredContainerCount,
      unit_kind: 'container',
      unit_processed_count: totalContainerCountSafe,
      unit_total_count: totalContainerCountSafe,
      message: `快照刷新完成，已写入 ${scannedFileCount} 个文件`,
    })
    return snapshot
  }
}
