import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  librarySnapshotDtoSchema,
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
  toAbsoluteTreePath,
  toDeterministicCoverColor,
  toSafeFsName,
  toSafeSizeMb,
} from '../../fileSystemServiceHelpers'
import { createArchiveSource, createDirectorySource } from '../../fileSystemSourceFactories'
import {
  readArchiveEntryMedia,
} from '../../fileSystemMediaReaders'
import { probeImageDimensionsFromFile, probeVideoMetadata } from '../../fileSystemRuntimeHelpers'
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

interface LibrarySnapshotServiceOptions {
  rootDir: string
  normalizedArchiveRootDir: string
  legacyImportsDirName: string
  database: MediaLibraryDatabase
  importPathRegistry: ImportPathRegistry
  imageExtensions: ReadonlySet<string>
  videoExtensions: ReadonlySet<string>
  archiveExtensions: ReadonlySet<string>
  colorPalette: readonly string[]
  imageExtensionsForWebpConvert: ReadonlySet<string>
  directoryScanConcurrency: number
  archiveScanConcurrency: number
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
}

export class LibrarySnapshotService {
  private snapshotCache: LibrarySnapshotDto | null = null

  private loadingPromise: Promise<LibrarySnapshotDto> | null = null

  private archiveEntryIndexByPath = new Map<string, Set<string>>()

  private zipEntryIndexByPath = new Map<string, Map<string, ZipCentralEntry>>()

  private normalizedArchiveCacheBySourcePath = new Map<string, NormalizedArchiveCacheRecord>()

  constructor(private readonly options: LibrarySnapshotServiceOptions) {}

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

    if (!this.loadingPromise) {
      this.loadingPromise = this.loadSnapshot().finally(() => {
        this.loadingPromise = null
      })
    }

    this.snapshotCache = await this.loadingPromise
    return this.snapshotCache
  }

  async refreshArchiveIndexesForPaths(archivePaths: Iterable<string>): Promise<void> {
    const normalizedPaths = Array.from(new Set(Array.from(archivePaths).map((value) => path.resolve(value))))
    for (const archivePath of normalizedPaths) {
      const stat = await fs.stat(archivePath).catch(() => null)
      if (!stat || !stat.isFile()) {
        this.archiveEntryIndexByPath.delete(archivePath)
        this.zipEntryIndexByPath.delete(archivePath)
        continue
      }

      const centralEntries = await scanZipCentralEntries(archivePath).catch(() => null)
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

    const payload = await readArchiveEntryMedia(locator, locator.mime_type, this.zipEntryIndexByPath)
    return Buffer.from(payload.body)
  }

  private async collectFiles(): Promise<FileRecord[]> {
    return collectMediaFiles({
      rootDir: this.options.rootDir,
      importDirectoryRoots: this.options.importPathRegistry.getImportDirectoryRoots(),
      importFiles: this.options.importPathRegistry.getImportFilePaths(),
      legacyImportsDirName: this.options.legacyImportsDirName,
      directoryScanConcurrency: this.options.directoryScanConcurrency,
      imageExtensions: this.options.imageExtensions,
      videoExtensions: this.options.videoExtensions,
      archiveExtensions: this.options.archiveExtensions,
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
        const entries = await scanZipCentralEntries(replacementZipPath).catch(() => [])
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
      sourceEntries = await scanZipCentralEntries(file.absolutePath)
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
      const normalizedEntries = await scanZipCentralEntries(normalized.normalizedArchivePath)
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

  private async loadSnapshot(): Promise<LibrarySnapshotDto> {
    const files = await this.collectFiles()

    const directoryImageMap = new Map<string, FileRecord[]>()
    const archives: FileRecord[] = []
    const videos: FileRecord[] = []

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
          colorPalette: [...this.options.colorPalette],
          packageGradeOverridesBySourceId: this.options.getPackageGradeOverridesBySourceId(),
        })
      })
      .sort((left, right) => left.absolute_path.localeCompare(right.absolute_path, 'zh-CN'))

    const preparedArchives = await parallelMapLimit(archives, this.options.archiveScanConcurrency, async (archive) => {
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
          colorPalette: [...this.options.colorPalette],
          packageGradeOverridesBySourceId: this.options.getPackageGradeOverridesBySourceId(),
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

    this.archiveEntryIndexByPath = nextArchiveEntryIndexByPath
    this.zipEntryIndexByPath = nextZipEntryIndexByPath

    this.options.database.replaceSnapshot(scannedSnapshot)
    return this.options.database.readSnapshot()
  }
}
