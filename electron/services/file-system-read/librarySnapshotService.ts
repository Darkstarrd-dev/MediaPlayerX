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
  cueExtensions: ReadonlySet<string>
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
  isInteractiveReadHot?: () => boolean
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
  force?: boolean
}

const MUSIC_BOOKLET_ROOT_LABEL = 'CD Booklet'
const MUSIC_ISOLATED_FALLBACK_GROUP = 'unknown artist'
const ARCHIVE_PLACEHOLDER_ROOT_LABEL = 'Archive Pending Index'
const COLLECTING_PREVIEW_CONTAINER_LIMIT = 120
const COLLECTING_PREVIEW_CONTAINER_UPDATE_DELTA = 8
const COLLECTING_PREVIEW_PERSIST_INTERVAL_MS = 1_500

interface ParsedCueTrackRecord {
  order: number
  trackNo: number
  audioPath: string
  title: string
  performer: string
  startSec: number
}

interface ParsedCueFileRecord {
  album: string
  performer: string
  tracks: ParsedCueTrackRecord[]
}

function swapUtf16ByteOrder(rawBuffer: Buffer): Buffer {
  const swapped = Buffer.allocUnsafe(rawBuffer.length)
  for (let index = 0; index + 1 < rawBuffer.length; index += 2) {
    swapped[index] = rawBuffer[index + 1]
    swapped[index + 1] = rawBuffer[index]
  }
  if (rawBuffer.length % 2 === 1) {
    swapped[rawBuffer.length - 1] = rawBuffer[rawBuffer.length - 1]
  }
  return swapped
}

function countMatches(value: string, pattern: RegExp): number {
  const matched = value.match(pattern)
  return matched ? matched.length : 0
}

interface CueDecodeCandidate {
  encoding: string
  text: string
  trackCount: number
  indexCount: number
  fileCount: number
  titleCount: number
  performerCount: number
  replacementCount: number
  nullCharCount: number
  weirdControlCharCount: number
  suspiciousMojibakeCount: number
  score: number
}

function scoreCueDecodedText(value: string): Omit<CueDecodeCandidate, 'encoding' | 'text'> {
  let score = 0

  const trackCount = countMatches(value, /^\s*TRACK\s+\d+/gim)
  const indexCount = countMatches(value, /^\s*INDEX\s+\d+\s+\d+:\d{2}:\d{2}/gim)
  const fileCount = countMatches(value, /^\s*FILE\s+/gim)
  const titleCount = countMatches(value, /^\s*TITLE\s+/gim)
  const performerCount = countMatches(value, /^\s*PERFORMER\s+/gim)

  score += trackCount * 80
  score += indexCount * 60
  score += fileCount * 30
  score += titleCount * 10
  score += performerCount * 10

  const replacementCount = countMatches(value, /\uFFFD/g)
  score -= replacementCount * 120

  const suspiciousMojibakeCount = countMatches(value, /(?:Ã.|Â.|ã.|â.)/g)
  score -= suspiciousMojibakeCount * 50

  const nullCharCount = countMatches(value, /\u0000/g)
  score -= nullCharCount * 220

  const weirdControlCharCount = countMatches(value, /[\x00-\x08\x0B\x0C\x0E-\x1F]/g)
  score -= weirdControlCharCount * 60

  const knownKeywordCount = countMatches(value, /^\s*(REM|FILE|TRACK|INDEX|TITLE|PERFORMER|CATALOG|ISRC)\b/gim)
  if (knownKeywordCount === 0) {
    score -= 280
  }

  if (trackCount > 0 && indexCount > 0) {
    score += 320
  }

  return {
    trackCount,
    indexCount,
    fileCount,
    titleCount,
    performerCount,
    replacementCount,
    nullCharCount,
    weirdControlCharCount,
    suspiciousMojibakeCount,
    score,
  }
}

function decodeCueBufferByEncoding(
  rawBuffer: Buffer,
  encoding: 'utf8' | 'utf16le' | 'utf16be' | 'shift_jis' | 'cp932' | 'euc-jp' | 'iso-2022-jp' | 'gb18030',
): string {
  if (encoding === 'utf8') {
    return rawBuffer.toString('utf8')
  }
  if (encoding === 'utf16le') {
    return rawBuffer.toString('utf16le')
  }
  if (encoding === 'utf16be') {
    return swapUtf16ByteOrder(rawBuffer).toString('utf16le')
  }
  return new TextDecoder(encoding).decode(rawBuffer)
}

function detectLikelyUtf16EncodingWithoutBom(rawBuffer: Buffer): 'utf16le' | 'utf16be' | null {
  const pairLimit = Math.min(2048, Math.floor(rawBuffer.length / 2))
  if (pairLimit <= 8) {
    return null
  }

  let leAsciiPairs = 0
  let beAsciiPairs = 0
  let leZeroHighBytePairs = 0
  let beZeroHighBytePairs = 0

  for (let pairIndex = 0; pairIndex < pairLimit; pairIndex += 1) {
    const lowByte = rawBuffer[pairIndex * 2]
    const highByte = rawBuffer[pairIndex * 2 + 1]
    if (highByte === 0) {
      leZeroHighBytePairs += 1
      if (lowByte >= 0x09 && lowByte <= 0x7e) {
        leAsciiPairs += 1
      }
    }
    if (lowByte === 0) {
      beZeroHighBytePairs += 1
      if (highByte >= 0x09 && highByte <= 0x7e) {
        beAsciiPairs += 1
      }
    }
  }

  if (leAsciiPairs >= 16 && leAsciiPairs >= beAsciiPairs * 2 && leZeroHighBytePairs >= pairLimit * 0.2) {
    return 'utf16le'
  }
  if (beAsciiPairs >= 16 && beAsciiPairs >= leAsciiPairs * 2 && beZeroHighBytePairs >= pairLimit * 0.2) {
    return 'utf16be'
  }
  return null
}

function decodeCueTextFromBuffer(rawBuffer: Buffer): { text: string; encoding: string } {
  const bomUtf8 = rawBuffer.length >= 3 && rawBuffer[0] === 0xef && rawBuffer[1] === 0xbb && rawBuffer[2] === 0xbf
  const bomUtf16Le = rawBuffer.length >= 2 && rawBuffer[0] === 0xff && rawBuffer[1] === 0xfe
  const bomUtf16Be = rawBuffer.length >= 2 && rawBuffer[0] === 0xfe && rawBuffer[1] === 0xff

  if (bomUtf8) {
    return { text: rawBuffer.toString('utf8'), encoding: 'utf8-bom' }
  }
  if (bomUtf16Le) {
    return { text: rawBuffer.toString('utf16le'), encoding: 'utf16le-bom' }
  }
  if (bomUtf16Be) {
    return { text: swapUtf16ByteOrder(rawBuffer).toString('utf16le'), encoding: 'utf16be-bom' }
  }

  const likelyUtf16WithoutBom = detectLikelyUtf16EncodingWithoutBom(rawBuffer)
  if (likelyUtf16WithoutBom === 'utf16le') {
    return { text: rawBuffer.toString('utf16le'), encoding: 'utf16le-heuristic' }
  }
  if (likelyUtf16WithoutBom === 'utf16be') {
    return { text: swapUtf16ByteOrder(rawBuffer).toString('utf16le'), encoding: 'utf16be-heuristic' }
  }

  const encodings: Array<'utf8' | 'shift_jis' | 'cp932' | 'euc-jp' | 'iso-2022-jp' | 'gb18030'> = [
    'utf8',
    'shift_jis',
    'cp932',
    'euc-jp',
    'iso-2022-jp',
    'gb18030',
  ]

  let bestCandidate: CueDecodeCandidate | null = null

  for (const encoding of encodings) {
    let decoded = ''
    try {
      decoded = decodeCueBufferByEncoding(rawBuffer, encoding)
    } catch {
      continue
    }

    const metrics = scoreCueDecodedText(decoded)
    const candidate: CueDecodeCandidate = {
      encoding,
      text: decoded,
      ...metrics,
    }

    if (!bestCandidate || candidate.score > bestCandidate.score) {
      bestCandidate = candidate
      continue
    }

    if (candidate.score === bestCandidate.score) {
      const candidateStructure = candidate.trackCount + candidate.indexCount + candidate.fileCount
      const bestStructure = bestCandidate.trackCount + bestCandidate.indexCount + bestCandidate.fileCount
      if (candidateStructure > bestStructure) {
        bestCandidate = candidate
      }
    }
  }

  if (!bestCandidate) {
    return { text: rawBuffer.toString('utf8'), encoding: 'utf8-fallback' }
  }

  return {
    text: bestCandidate.text,
    encoding: bestCandidate.encoding,
  }
}

function parseCueTextValue(rawValue: string): string {
  const trimmed = rawValue.trim()
  if (trimmed.length < 2) {
    return trimmed
  }

  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim()
  }

  return trimmed
}

function parseCueTimestampToSec(rawValue: string): number | null {
  const match = rawValue.trim().match(/^(\d+):(\d{2}):(\d{2})$/)
  if (!match) {
    return null
  }

  const minutes = Number(match[1])
  const seconds = Number(match[2])
  const frames = Number(match[3])
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || !Number.isFinite(frames)) {
    return null
  }
  if (minutes < 0 || seconds < 0 || seconds >= 60 || frames < 0 || frames >= 75) {
    return null
  }

  return minutes * 60 + seconds + frames / 75
}

function resolveCueReferencedAudioPath(cuePath: string, cueFileRawPath: string): string {
  const cueDirPath = path.dirname(cuePath)
  const normalizedRelativePath = cueFileRawPath.trim().replace(/[\\/]+/g, path.sep)
  return path.resolve(cueDirPath, normalizedRelativePath)
}

function pickSingleFileCueFallbackAudio(cuePath: string, cueDirectoryAudios: AudioItemDto[]): AudioItemDto | null {
  if (cueDirectoryAudios.length === 0) {
    return null
  }
  if (cueDirectoryAudios.length === 1) {
    return cueDirectoryAudios[0]
  }

  const cueBaseName = path.basename(cuePath, path.extname(cuePath)).trim().toLocaleLowerCase('zh-CN')
  const sameBaseNameCandidates = cueDirectoryAudios.filter((audio) => {
    const audioBaseName = path.basename(audio.absolute_path, path.extname(audio.absolute_path)).trim().toLocaleLowerCase('zh-CN')
    return audioBaseName.length > 0 && audioBaseName === cueBaseName
  })
  if (sameBaseNameCandidates.length === 1) {
    return sameBaseNameCandidates[0]
  }

  const candidates = sameBaseNameCandidates.length > 1 ? sameBaseNameCandidates : cueDirectoryAudios
  let selected = candidates[0]
  for (let index = 1; index < candidates.length; index += 1) {
    const candidate = candidates[index]
    if (candidate.duration_sec > selected.duration_sec) {
      selected = candidate
    }
  }
  return selected
}

function pickAudioByCueBaseName(cuePath: string, audioItems: AudioItemDto[]): AudioItemDto | null {
  if (audioItems.length === 0) {
    return null
  }

  const cueBaseName = path.basename(cuePath, path.extname(cuePath)).trim().toLocaleLowerCase('zh-CN')
  const matched = audioItems.filter((audio) => {
    const audioBaseName = path.basename(audio.absolute_path, path.extname(audio.absolute_path)).trim().toLocaleLowerCase('zh-CN')
    return audioBaseName.length > 0 && audioBaseName === cueBaseName
  })
  if (matched.length === 1) {
    return matched[0]
  }
  return null
}

function parseCueFileRecord(cuePath: string, rawText: string): ParsedCueFileRecord {
  const lines = rawText.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/)
  let cueAlbum = ''
  let cuePerformer = ''
  let currentFilePath: string | null = cuePath
  let lineOrder = 0
  let currentTrack:
    | {
        order: number
        trackNo: number
        audioPath: string | null
        title: string
        performer: string
        startSec: number | null
        firstIndexSec: number | null
      }
    | null = null

  const parsedTracks: ParsedCueTrackRecord[] = []

  const flushTrack = () => {
    const resolvedStartSec = currentTrack?.startSec ?? currentTrack?.firstIndexSec ?? null
    if (!currentTrack || currentTrack.audioPath == null || resolvedStartSec == null) {
      currentTrack = null
      return
    }

    parsedTracks.push({
      order: currentTrack.order,
      trackNo: currentTrack.trackNo,
      audioPath: currentTrack.audioPath,
      title: currentTrack.title,
      performer: currentTrack.performer,
      startSec: resolvedStartSec,
    })
    currentTrack = null
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line.length === 0 || line.startsWith(';') || /^REM\b/i.test(line)) {
      continue
    }

    const fileMatch = line.match(/^FILE\s+(?:"([^"]+)"|(.+?))(?:\s+\S+)?$/i)
    if (fileMatch) {
      const fileRawPath = (fileMatch[1] ?? fileMatch[2] ?? '').trim()
      if (fileRawPath.length > 0) {
        currentFilePath = resolveCueReferencedAudioPath(cuePath, fileRawPath)
      }
      continue
    }

    const trackMatch = line.match(/^TRACK\s+(\d+)\b(?:\s+.+)?$/i)
    if (trackMatch) {
      flushTrack()
      const trackNo = Number(trackMatch[1])
      if (!Number.isFinite(trackNo) || trackNo <= 0) {
        continue
      }
      currentTrack = {
        order: lineOrder,
        trackNo: Math.round(trackNo),
        audioPath: currentFilePath,
        title: '',
        performer: '',
        startSec: null,
        firstIndexSec: null,
      }
      lineOrder += 1
      continue
    }

    const titleMatch = line.match(/^TITLE\s+(.+)$/i)
    if (titleMatch) {
      const value = parseCueTextValue(titleMatch[1])
      if (currentTrack) {
        currentTrack.title = value
      } else {
        cueAlbum = value
      }
      continue
    }

    const performerMatch = line.match(/^PERFORMER\s+(.+)$/i)
    if (performerMatch) {
      const value = parseCueTextValue(performerMatch[1])
      if (currentTrack) {
        currentTrack.performer = value
      } else {
        cuePerformer = value
      }
      continue
    }

    const indexMatch = line.match(/^INDEX\s+(\d+)\s+(\d+:\d{2}:\d{2})(?:\s+.*)?$/i)
    if (indexMatch && currentTrack) {
      const indexNo = Number(indexMatch[1])
      if (!Number.isFinite(indexNo)) {
        continue
      }
      const parsedSec = parseCueTimestampToSec(indexMatch[2])
      if (parsedSec != null) {
        if (currentTrack.firstIndexSec == null) {
          currentTrack.firstIndexSec = parsedSec
        }
        if (indexNo === 1) {
          currentTrack.startSec = parsedSec
        }
      }
    }
  }

  flushTrack()

  return {
    album: cueAlbum,
    performer: cuePerformer,
    tracks: parsedTracks,
  }
}

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

    const hasImport = this.hasImportSources()
    const isEmpty = this.isSnapshotEmpty(this.snapshotCache)

    if (!this.warmupRefreshTriggered && hasImport && isEmpty) {
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

    if (options?.force) {
      if (this.loadingPromise) {
        await this.loadingPromise.catch(() => undefined)
      }
      const forcedLoadPromise = this.loadSnapshot(options)
      this.loadingPromise = forcedLoadPromise.finally(() => {
        if (this.loadingPromise === forcedLoadPromise) {
          this.loadingPromise = null
        }
      })
      this.snapshotCache = await this.loadingPromise
      return this.snapshotCache
    }

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
      cueExtensions: this.options.cueExtensions,
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

  private async createCueVirtualTracks(
    cueFile: FileRecord,
    options: {
      audioByPath: Map<string, AudioItemDto>
      musicImportPathContext: MusicImportPathContext
    },
  ): Promise<AudioItemDto[]> {
    const cueRawBuffer = await fs.readFile(cueFile.absolutePath).catch(() => null)
    if (!cueRawBuffer) {
      return []
    }

    const decodedCue = decodeCueTextFromBuffer(cueRawBuffer)
    const rawCueText = decodedCue.text

    const parsedCueRecord = parseCueFileRecord(cueFile.absolutePath, rawCueText)
    if (parsedCueRecord.tracks.length === 0) {
      const firstLines = rawCueText
        .split(/\r\n|\n|\r/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .slice(0, 12)
        .join(' | ')
      const preview = firstLines.length > 320 ? `${firstLines.slice(0, 320)}...` : firstLines
      console.warn(`[cue] parsed zero tracks: path=${cueFile.absolutePath}; encoding=${decodedCue.encoding}; preview=${preview}`)
      return []
    }

    const referencedAudioPaths = Array.from(new Set(parsedCueRecord.tracks.map((track) => path.resolve(track.audioPath))))
    for (const referencedAudioPath of referencedAudioPaths) {
      const referencedPathKey = normalizeAllowlistKey(referencedAudioPath)
      if (options.audioByPath.has(referencedPathKey)) {
        continue
      }

      const extension = path.extname(referencedAudioPath).toLowerCase()
      if (!this.options.audioExtensions.has(extension)) {
        continue
      }

      const fileStat = await fs.stat(referencedAudioPath).catch(() => null)
      if (!fileStat || !fileStat.isFile()) {
        continue
      }

      const created = await this.createAudioSource(
        {
          absolutePath: referencedAudioPath,
          relativePath: path.basename(referencedAudioPath),
          extension,
          sizeBytes: fileStat.size,
          width: 0,
          height: 0,
        },
        options.musicImportPathContext,
      ).catch(() => null)
      if (!created) {
        continue
      }

      options.audioByPath.set(referencedPathKey, created.audio)
    }

    const audioItems = Array.from(options.audioByPath.values())
    const cueDirectoryPath = path.dirname(cueFile.absolutePath)
    const cueDirectoryKey = normalizeAllowlistKey(cueDirectoryPath)
    const cueDirectoryAudios = audioItems.filter((audio) => normalizeAllowlistKey(path.dirname(audio.absolute_path)) === cueDirectoryKey)
    const cueSubtreeAudios = audioItems.filter((audio) => isPathInsideRoot(cueDirectoryPath, audio.absolute_path))
    const uniqueCueTrackPathKeyCount = new Set(parsedCueRecord.tracks.map((track) => normalizeAllowlistKey(track.audioPath))).size
    const isLikelySingleFileCue = uniqueCueTrackPathKeyCount <= 1
    const singleFileCueFallbackAudio = isLikelySingleFileCue
      ? (
          pickSingleFileCueFallbackAudio(cueFile.absolutePath, cueDirectoryAudios.length > 0 ? cueDirectoryAudios : cueSubtreeAudios) ??
          pickAudioByCueBaseName(cueFile.absolutePath, cueSubtreeAudios.length > 0 ? cueSubtreeAudios : audioItems)
        )
      : null

    const cuePathKey = normalizeAllowlistKey(cueFile.absolutePath)
    const isExplicitMusicFile = options.musicImportPathContext.fileAllowlistKeys.has(cuePathKey)
    const underMusicDirectory = options.musicImportPathContext.directoryRoots.some((rootPath) => isPathInsideRoot(rootPath, cueFile.absolutePath))
    const isIsolatedMusicFile = isExplicitMusicFile && !underMusicDirectory
    const cueTreeBase = isIsolatedMusicFile
      ? [resolveIsolatedAudioGroup(parsedCueRecord.album)]
      : toAbsoluteTreePath(cueFile.absolutePath).slice(0, -1)
    const cueTreeBaseSafe = cueTreeBase.length > 0 ? cueTreeBase : [path.basename(cueFile.absolutePath, path.extname(cueFile.absolutePath))]

    const normalizedTracks = parsedCueRecord.tracks
      .map((track) => ({
        ...track,
        audioPathKey: normalizeAllowlistKey(track.audioPath),
      }))
      .sort((left, right) => {
        if (left.order !== right.order) {
          return left.order - right.order
        }
        if (left.trackNo !== right.trackNo) {
          return left.trackNo - right.trackNo
        }
        return left.audioPath.localeCompare(right.audioPath, 'zh-CN')
      })

    const cueVirtualTracks: AudioItemDto[] = []

    for (let index = 0; index < normalizedTracks.length; index += 1) {
      const currentTrack = normalizedTracks[index]
      let sourceAudio = options.audioByPath.get(currentTrack.audioPathKey)
      if (!sourceAudio) {
        const trackBaseName = path.basename(currentTrack.audioPath).trim().toLocaleLowerCase('zh-CN')
        if (trackBaseName.length > 0) {
          const matchedInCueDir = cueDirectoryAudios.filter(
            (audio) => path.basename(audio.absolute_path).toLocaleLowerCase('zh-CN') === trackBaseName,
          )
          if (matchedInCueDir.length === 1) {
            sourceAudio = matchedInCueDir[0]
          } else if (matchedInCueDir.length === 0) {
            const matchedGlobal = audioItems.filter(
              (audio) => path.basename(audio.absolute_path).toLocaleLowerCase('zh-CN') === trackBaseName,
            )
            if (matchedGlobal.length === 1) {
              sourceAudio = matchedGlobal[0]
            }
          }
        }
      }
      if (!sourceAudio && singleFileCueFallbackAudio) {
        sourceAudio = singleFileCueFallbackAudio
      }
      if (!sourceAudio) {
        continue
      }

      let nextStartSec: number | null = null
      for (let nextIndex = index + 1; nextIndex < normalizedTracks.length; nextIndex += 1) {
        const candidateTrack = normalizedTracks[nextIndex]
        if (candidateTrack.audioPathKey !== currentTrack.audioPathKey) {
          continue
        }
        if (candidateTrack.startSec > currentTrack.startSec + 0.0005) {
          nextStartSec = candidateTrack.startSec
          break
        }
      }

      const sourceDurationSec = Math.max(0, sourceAudio.duration_sec)
      const fallbackEndSec = sourceDurationSec > currentTrack.startSec + 0.0005 ? sourceDurationSec : null
      const rawEndSec = nextStartSec ?? fallbackEndSec
      const resolvedEndSec = rawEndSec != null && rawEndSec > currentTrack.startSec + 0.0005 ? rawEndSec : null
      const resolvedDurationSec = resolvedEndSec != null
        ? Math.max(0, resolvedEndSec - currentTrack.startSec)
        : Math.max(0, sourceDurationSec - currentTrack.startSec)

      const trackNoLabel = String(currentTrack.trackNo).padStart(2, '0')
      const cueTitle = currentTrack.title.trim()
      const sourceTitle = sourceAudio.track_title.trim()
      const resolvedTrackTitle = cueTitle.length > 0 ? cueTitle : sourceTitle.length > 0 ? sourceTitle : `Track ${trackNoLabel}`
      const resolvedAuthor =
        currentTrack.performer.trim().length > 0
          ? currentTrack.performer.trim()
          : parsedCueRecord.performer.trim().length > 0
            ? parsedCueRecord.performer.trim()
            : sourceAudio.author
      const resolvedAlbum = parsedCueRecord.album.trim().length > 0 ? parsedCueRecord.album.trim() : sourceAudio.album
      const cueStartSec = Number(currentTrack.startSec.toFixed(3))
      const cueEndSec = resolvedEndSec == null ? null : Number(resolvedEndSec.toFixed(3))

      const trackId = makeStableId('aud', `${cueFile.absolutePath}#${currentTrack.order}#${currentTrack.trackNo}#${sourceAudio.absolute_path}`)
      const cueVirtualAbsolutePath =
        `cue://${encodeURIComponent(cueFile.absolutePath)}` +
        `?track=${currentTrack.trackNo}` +
        `&order=${currentTrack.order}` +
        `&src=${encodeURIComponent(sourceAudio.absolute_path)}` +
        `&start=${cueStartSec}` +
        (cueEndSec == null ? '' : `&end=${cueEndSec}`)

      cueVirtualTracks.push({
        id: trackId,
        file_name: path.basename(sourceAudio.absolute_path),
        absolute_path: cueVirtualAbsolutePath,
        tree_path: [...cueTreeBaseSafe, `${trackNoLabel} ${resolvedTrackTitle}`],
        duration_sec: Math.max(0, Math.round(resolvedDurationSec)),
        size_mb: sourceAudio.size_mb,
        album: resolvedAlbum,
        author: resolvedAuthor,
        track_title: resolvedTrackTitle,
        series_id: sourceAudio.series_id,
        cue_source_path: cueFile.absolutePath,
        cue_track_no: currentTrack.trackNo,
        cue_start_sec: cueStartSec,
        cue_end_sec: cueEndSec,
        media_locator: { ...sourceAudio.media_locator },
      })
    }

    if (cueVirtualTracks.length === 0) {
      console.warn(
        `[cue] virtual tracks unresolved: path=${cueFile.absolutePath}; parsed=${parsedCueRecord.tracks.length}; inDir=${cueDirectoryAudios.length}; inSubtree=${cueSubtreeAudios.length}; uniqueTrackPaths=${uniqueCueTrackPathKeyCount}; hasSingleFallback=${singleFileCueFallbackAudio ? 'yes' : 'no'}`,
      )
    }

    return cueVirtualTracks
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
    const isInteractiveReadHot = (): boolean => this.options.isInteractiveReadHot?.() ?? false

    const baseSnapshot = this.options.database.readSnapshot()
    const previewDirectoryImageFilesByPath = new Map<string, FileRecord[]>()
    const previewDirectoryImageFileKeysByPath = new Map<string, Set<string>>()
    const previewArchivePaths = new Set<string>()

    const persistCollectingPreviewSnapshot = (force = false): void => {
      const now = Date.now()
      if (
        !force &&
        discoveredContainerCount - lastPreviewPersistedContainerCount < COLLECTING_PREVIEW_CONTAINER_UPDATE_DELTA &&
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
            treePathOverride:
              extension === '.rar' || extension === '.7z'
                ? [ARCHIVE_PLACEHOLDER_ROOT_LABEL, path.basename(ref.path)]
                : undefined,
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
        const collectingFileReportDelta = isInteractiveReadHot() ? 600 : 200
        const collectingContainerReportDelta = isInteractiveReadHot() ? 96 : 32
        const collectingReportIntervalMs = isInteractiveReadHot() ? 1_000 : 300
        if (
          scannedFileCount === 1 ||
          scannedFileCount % collectingFileReportDelta === 0 ||
          discoveredContainerCount % collectingContainerReportDelta === 0 ||
          now - lastProgressReportedAt >= collectingReportIntervalMs
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
    const cues: FileRecord[] = []

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
        continue
      }

      if (this.options.cueExtensions.has(file.extension)) {
        cues.push(file)
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
      const buildingReportIntervalMs = isInteractiveReadHot() ? 1_000 : 280
      const buildingReportCountDelta = isInteractiveReadHot() ? 96 : 24
      if (
        !force &&
        now - lastBuildingProgressReportedAtMs < buildingReportIntervalMs &&
        builtContainerCount % buildingReportCountDelta !== 0
      ) {
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

    const archiveScanConcurrency = isInteractiveReadHot()
      ? Math.max(1, Math.ceil(this.options.archiveScanConcurrency / 2))
      : this.options.archiveScanConcurrency
    const ffprobeConcurrency = isInteractiveReadHot()
      ? Math.max(1, Math.ceil(this.options.ffprobeConcurrency / 2))
      : this.options.ffprobeConcurrency

    const preparedArchives = await parallelMapLimit(archives, archiveScanConcurrency, async (archive) => {
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

    const videoItems = (await parallelMapLimit(videos, ffprobeConcurrency, async (file) => this.createVideoSource(file))).sort((left, right) =>
      left.absolute_path.localeCompare(right.absolute_path, 'zh-CN'),
    )

    const audioSourceResults = await parallelMapLimit(
      audios,
      ffprobeConcurrency,
      async (file) =>
        this.createAudioSource(file, {
          directoryRoots: musicImportDirectoryRoots,
          fileAllowlistKeys: musicImportFileAllowlistKeys,
        }),
    )
    const audioItems = audioSourceResults
      .map((result) => result.audio)
      .sort((left, right) => left.absolute_path.localeCompare(right.absolute_path, 'zh-CN'))

    const audioByPath = new Map<string, AudioItemDto>()
    for (const audio of audioItems) {
      audioByPath.set(normalizeAllowlistKey(audio.absolute_path), audio)
    }

    const cueVirtualTrackItems = (
      await parallelMapLimit(cues, ffprobeConcurrency, async (cueFile) =>
        this.createCueVirtualTracks(cueFile, {
          audioByPath,
          musicImportPathContext: {
            directoryRoots: musicImportDirectoryRoots,
            fileAllowlistKeys: musicImportFileAllowlistKeys,
          },
        }),
      )
    )
      .flat()
      .sort((left, right) => {
        const leftPathKey = left.tree_path.join('/')
        const rightPathKey = right.tree_path.join('/')
        const byTreePath = leftPathKey.localeCompare(rightPathKey, 'zh-CN')
        if (byTreePath !== 0) {
          return byTreePath
        }
        return left.id.localeCompare(right.id, 'zh-CN')
      })

    const cueBoundSourceAudioPathKeys = new Set(
      cueVirtualTrackItems
        .map((audio) => {
          const locator = audio.media_locator
          return locator.kind === 'filesystem' ? normalizeAllowlistKey(locator.absolute_path) : null
        })
        .filter((value): value is string => value != null),
    )

    const filteredBaseAudioItems =
      cueBoundSourceAudioPathKeys.size > 0
        ? audioItems.filter((audio) => !cueBoundSourceAudioPathKeys.has(normalizeAllowlistKey(audio.absolute_path)))
        : audioItems

    const allAudioItems = [...filteredBaseAudioItems, ...cueVirtualTrackItems]

    const scannedSnapshot = librarySnapshotDtoSchema.parse({
      image_packages: imagePackages,
      image_directories: imageDirectories,
      videos: videoItems,
      audios: allAudioItems,
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

    const persistedAudioIdSet = new Set(allAudioItems.map((audio) => audio.id))

    for (const result of audioSourceResults) {
      if (!result.parsedMetadataForUpsert) {
        continue
      }
      if (!persistedAudioIdSet.has(result.parsedMetadataForUpsert.audioId)) {
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
