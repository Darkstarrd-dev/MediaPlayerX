import { createHash, randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createReadStream, existsSync, promises as fs, type ReadStream } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { Worker } from 'node:worker_threads'
import { inflateRawSync } from 'node:zlib'

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
  type FeatureFilterDto,
  type FocusedImageRefDto,
  type ImageItemDto,
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
  type SidebarNodeDto,
  type VideoItemDto,
  type WritePlaylistRequestDto,
  type WritePlaylistResponseDto,
  type WritePackageGradeRequestDto,
  type WritePackageGradeResponseDto,
} from '../src/contracts/backend'
import { MEDIA_PROTOCOL_SCHEME } from './channels'
import {
  normalizeArchiveToStoreZipInPlace,
  readArchiveWasmSupport,
  resolveArchiveReplacementZipPath,
} from './archiveWasmExtractor'
import { MediaLibraryDatabase } from './mediaLibraryDatabase'

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

const ZIP_END_OF_CENTRAL_DIR_SIGNATURE = 0x06054b50
const ZIP_CENTRAL_FILE_HEADER_SIGNATURE = 0x02014b50
const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50
const ZIP_GENERAL_PURPOSE_FLAG_UTF8 = 0x0800
const ZIP_GENERAL_PURPOSE_FLAG_ENCRYPTED = 0x0001
const ZIP_COMPRESSION_STORE = 0
const ZIP_COMPRESSION_DEFLATE = 8
const ZIP_MAX_COMMENT_LENGTH = 0xffff

const MEDIA_TOKEN_TTL_MS = 5 * 60 * 1000
const ZIP_SCAN_TAIL_PADDING = 128
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

type SharpModule = typeof import('sharp')
let sharpModulePromise: Promise<SharpModule | null> | null = null

type MediaAuditRejectReason =
  | 'path_outside_root'
  | 'filesystem_extension_mismatch'
  | 'filesystem_media_type_not_allowed'
  | 'filesystem_file_missing'
  | 'archive_format_not_supported'
  | 'archive_extension_invalid'
  | 'archive_entry_illegal'
  | 'archive_entry_not_allowlisted'
  | 'archive_not_exists'

interface ArchiveNormalizationResult {
  normalizedArchivePath: string
  strategy: 'zip-repack-webp90-store'
}

interface PersistedVideoCoverRecord {
  coverColor: string
  coverImagePath: string | null
  updatedAtMs: number
}

interface ServiceShellResult {
  code: number
  stdout: string
  stderr: string
}

interface VideoProbeResult {
  durationSec: number
  width: number
  height: number
}

interface FileRecord {
  absolutePath: string
  relativePath: string
  extension: string
  sizeBytes: number
  width: number
  height: number
}

interface ZipCentralEntry {
  entryName: string
  extension: string
  compressedSize: number
  uncompressedSize: number
  compressionMethod: number
  generalPurposeBitFlag: number
  localHeaderOffset: number
}

interface MediaTokenRecord {
  locator: MediaLocatorDto
  mimeType: string
  expiresAtMs: number
}

export interface MediaProtocolResponsePayload {
  status: number
  headers: Record<string, string>
  body: Uint8Array
}

export interface MediaProtocolStreamResponsePayload {
  status: number
  headers: Record<string, string>
  body: Uint8Array | ReadableStream<Uint8Array>
}

interface ByteRange {
  start: number
  end: number
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
    | 'write-video-cover'
    | 'write-playlist'
  updated_at_ms: number
}

type LibraryChangedListener = (payload: LibraryChangedEventPayload) => void

interface ImportPathInspection {
  absolutePath: string
  insideRoot: boolean
  kind: 'file' | 'directory'
  extension: string | null
}

class MediaAccessError extends Error {
  readonly reason: MediaAuditRejectReason

  constructor(reason: MediaAuditRejectReason, message: string) {
    super(message)
    this.reason = reason
  }
}

function normalizePathKey(value: string): string {
  return value.split(path.sep).join('/')
}

function normalizeAllowlistKey(value: string): string {
  const resolved = normalizePathKey(path.resolve(value))
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved
}

function makeStableId(prefix: string, value: string): string {
  const hash = createHash('sha1').update(value).digest('hex').slice(0, 12)
  return `${prefix}-${hash}`
}

function toAbsoluteTreePath(targetPath: string): string[] {
  const resolved = normalizePathKey(path.resolve(targetPath))

  // Windows drive path: C:/foo/bar
  if (/^[a-zA-Z]:\//.test(resolved)) {
    const drive = resolved.slice(0, 2)
    const rest = resolved.slice(3)
    const segments = rest
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean)
    return segments.length > 0 ? [drive, ...segments] : [drive]
  }

  // Windows UNC path normalized by `normalizePathKey`: //server/share/folder
  if (resolved.startsWith('//')) {
    const parts = resolved
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean)
    if (parts.length >= 2) {
      const uncRoot = `//${parts[0]}/${parts[1]}`
      return parts.length > 2 ? [uncRoot, ...parts.slice(2)] : [uncRoot]
    }
    return [resolved]
  }

  // POSIX: /foo/bar
  if (resolved.startsWith('/')) {
    const parts = resolved
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean)
    return parts.length > 0 ? ['/', ...parts] : ['/']
  }

  const parts = resolved
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
  return parts.length > 0 ? parts : [path.basename(targetPath)]
}

function toSafeSizeKb(sizeBytes: number): number {
  return Math.max(0, Math.ceil(sizeBytes / 1024))
}

function toSafeSizeMb(sizeBytes: number): number {
  return Math.max(0, Math.ceil(sizeBytes / (1024 * 1024)))
}

function pickSourceGrade(
  sourceId: string,
  sourceFallbackGrade: number | null,
  gradeOverrides?: Record<string, number | null>,
): number | null {
  if (!gradeOverrides) {
    return sourceFallbackGrade
  }

  return sourceId in gradeOverrides ? gradeOverrides[sourceId] ?? null : sourceFallbackGrade
}

function normalizeFeatureFilter(filter: FeatureFilterDto): FeatureFilterDto {
  return {
    name_query: filter.name_query.trim().toLowerCase(),
    work_title_query: filter.work_title_query.trim().toLowerCase(),
    circle_query: filter.circle_query.trim().toLowerCase(),
    author_query: filter.author_query.trim().toLowerCase(),
    tags: filter.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean),
    grade: filter.grade,
  }
}

function matchesFeatureFilter(
  source: ImagePackageDto,
  filter: FeatureFilterDto,
  gradeOverrides?: Record<string, number | null>,
): boolean {
  if (filter.name_query) {
    const matched = [source.package_name, source.display_name].some((text) =>
      text.toLowerCase().includes(filter.name_query),
    )
    if (!matched) {
      return false
    }
  }

  if (filter.work_title_query && !source.work_title.toLowerCase().includes(filter.work_title_query)) {
    return false
  }

  if (filter.circle_query && !source.circle.toLowerCase().includes(filter.circle_query)) {
    return false
  }

  if (filter.author_query && !source.author.toLowerCase().includes(filter.author_query)) {
    return false
  }

  if (filter.tags.length > 0) {
    const lowerTags = source.tags.map((tag) => tag.toLowerCase())
    const tagsMatched = filter.tags.every((tag) => lowerTags.includes(tag))
    if (!tagsMatched) {
      return false
    }
  }

  if (filter.grade !== null) {
    const gradeValue = pickSourceGrade(source.id, source.mock_grade, gradeOverrides) ?? 0
    if (gradeValue !== filter.grade) {
      return false
    }
  }

  return true
}

function isPathInsideRoot(rootDir: string, absolutePath: string): boolean {
  const relative = path.relative(rootDir, absolutePath)
  if (relative.length === 0) {
    return true
  }
  return !relative.startsWith('..') && !path.isAbsolute(relative)
}

function normalizeArchiveEntryName(value: string): string {
  const normalized = value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '')
  return normalized
}

function isSafeArchiveEntryName(value: string): boolean {
  if (!value || value.includes('\u0000')) {
    return false
  }
  if (value.startsWith('/') || value.startsWith('\\')) {
    return false
  }
  if (/^[a-zA-Z]:/.test(value)) {
    return false
  }

  const segments = value.split('/')
  return segments.every((segment) => segment !== '..')
}

function detectMimeTypeByExtension(extension: string, mediaType: 'image' | 'video'): string {
  const lowerExt = extension.toLowerCase()
  if (mediaType === 'image') {
    if (lowerExt === '.jpg' || lowerExt === '.jpeg') {
      return 'image/jpeg'
    }
    if (lowerExt === '.png') {
      return 'image/png'
    }
    if (lowerExt === '.webp') {
      return 'image/webp'
    }
    if (lowerExt === '.gif') {
      return 'image/gif'
    }
    if (lowerExt === '.bmp') {
      return 'image/bmp'
    }
    return 'application/octet-stream'
  }

  if (lowerExt === '.mp4') {
    return 'video/mp4'
  }
  if (lowerExt === '.webm') {
    return 'video/webm'
  }
  if (lowerExt === '.mkv') {
    return 'video/x-matroska'
  }
  if (lowerExt === '.mov') {
    return 'video/quicktime'
  }
  return 'application/octet-stream'
}

function findSignatureBackward(buffer: Buffer, signature: number): number {
  for (let index = buffer.length - 4; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === signature) {
      return index
    }
  }
  return -1
}

function decodeZipEntryName(bytes: Buffer, utf8: boolean): string {
  if (utf8) {
    return bytes.toString('utf8')
  }
  return bytes.toString('latin1')
}

async function scanZipCentralEntries(archivePath: string): Promise<ZipCentralEntry[]> {
  const handle = await fs.open(archivePath, 'r')

  try {
    const stat = await handle.stat()
    if (stat.size < 22) {
      return []
    }

    const tailSize = Math.min(stat.size, ZIP_MAX_COMMENT_LENGTH + 22 + ZIP_SCAN_TAIL_PADDING)
    const tailOffset = stat.size - tailSize
    const tailBuffer = Buffer.alloc(tailSize)
    await handle.read(tailBuffer, 0, tailSize, tailOffset)

    const endOfCentralDirIndex = findSignatureBackward(tailBuffer, ZIP_END_OF_CENTRAL_DIR_SIGNATURE)
    if (endOfCentralDirIndex < 0) {
      throw new Error(`zip 中央目录缺失: ${archivePath}`)
    }

    const centralDirectorySize = tailBuffer.readUInt32LE(endOfCentralDirIndex + 12)
    const centralDirectoryOffset = tailBuffer.readUInt32LE(endOfCentralDirIndex + 16)

    if (centralDirectorySize === 0xffffffff || centralDirectoryOffset === 0xffffffff) {
      throw new Error(`zip64 归档暂不支持: ${archivePath}`)
    }
    if (centralDirectoryOffset + centralDirectorySize > stat.size) {
      throw new Error(`zip 中央目录越界: ${archivePath}`)
    }

    const centralBuffer = Buffer.alloc(centralDirectorySize)
    await handle.read(centralBuffer, 0, centralDirectorySize, centralDirectoryOffset)

    const entries: ZipCentralEntry[] = []
    let cursor = 0
    while (cursor + 46 <= centralBuffer.length) {
      const signature = centralBuffer.readUInt32LE(cursor)
      if (signature !== ZIP_CENTRAL_FILE_HEADER_SIGNATURE) {
        break
      }

      const generalPurposeBitFlag = centralBuffer.readUInt16LE(cursor + 8)
      const compressionMethod = centralBuffer.readUInt16LE(cursor + 10)
      const compressedSize = centralBuffer.readUInt32LE(cursor + 20)
      const uncompressedSize = centralBuffer.readUInt32LE(cursor + 24)
      const fileNameLength = centralBuffer.readUInt16LE(cursor + 28)
      const extraLength = centralBuffer.readUInt16LE(cursor + 30)
      const commentLength = centralBuffer.readUInt16LE(cursor + 32)
      const localHeaderOffset = centralBuffer.readUInt32LE(cursor + 42)

      const fileNameStart = cursor + 46
      const fileNameEnd = fileNameStart + fileNameLength
      if (fileNameEnd > centralBuffer.length) {
        break
      }

      const fileNameBuffer = centralBuffer.subarray(fileNameStart, fileNameEnd)
      const entryName = normalizeArchiveEntryName(
        decodeZipEntryName(fileNameBuffer, (generalPurposeBitFlag & ZIP_GENERAL_PURPOSE_FLAG_UTF8) !== 0),
      )

      const nextCursor = fileNameEnd + extraLength + commentLength
      if (nextCursor > centralBuffer.length) {
        break
      }
      cursor = nextCursor

      if (!entryName || entryName.endsWith('/')) {
        continue
      }

      entries.push({
        entryName,
        extension: path.extname(entryName).toLowerCase(),
        compressedSize,
        uncompressedSize,
        compressionMethod,
        generalPurposeBitFlag,
        localHeaderOffset,
      })
    }

    return entries
  } finally {
    await handle.close()
  }
}

async function readZipEntryDataOffset(archivePath: string, entry: ZipCentralEntry): Promise<number> {
  const handle = await fs.open(archivePath, 'r')

  try {
    const localHeader = Buffer.alloc(30)
    const { bytesRead: localHeaderBytesRead } = await handle.read(localHeader, 0, localHeader.length, entry.localHeaderOffset)
    if (localHeaderBytesRead < localHeader.length) {
      throw new Error(`zip 条目本地头部读取失败: ${archivePath} -> ${entry.entryName}`)
    }

    if (localHeader.readUInt32LE(0) !== ZIP_LOCAL_FILE_HEADER_SIGNATURE) {
      throw new Error(`zip 条目本地头部签名异常: ${archivePath} -> ${entry.entryName}`)
    }

    const localFileNameLength = localHeader.readUInt16LE(26)
    const localExtraLength = localHeader.readUInt16LE(28)
    return entry.localHeaderOffset + 30 + localFileNameLength + localExtraLength
  } finally {
    await handle.close()
  }
}

async function readZipEntryContent(archivePath: string, entry: ZipCentralEntry): Promise<Buffer> {
  const dataOffset = await readZipEntryDataOffset(archivePath, entry)
  const handle = await fs.open(archivePath, 'r')

  try {
    const compressedBuffer = Buffer.alloc(entry.compressedSize)
    const { bytesRead } = await handle.read(compressedBuffer, 0, compressedBuffer.length, dataOffset)
    if (bytesRead < compressedBuffer.length) {
      throw new Error(`zip 条目压缩数据读取不完整: ${archivePath} -> ${entry.entryName}`)
    }

    if ((entry.generalPurposeBitFlag & ZIP_GENERAL_PURPOSE_FLAG_ENCRYPTED) !== 0) {
      throw new Error(`zip 条目被加密，当前不支持: ${archivePath} -> ${entry.entryName}`)
    }

    if (entry.compressionMethod === ZIP_COMPRESSION_STORE) {
      return compressedBuffer
    }

    if (entry.compressionMethod === ZIP_COMPRESSION_DEFLATE) {
      return inflateRawSync(compressedBuffer)
    }

    throw new Error(`zip 条目压缩方式不支持(${entry.compressionMethod}): ${archivePath} -> ${entry.entryName}`)
  } finally {
    await handle.close()
  }
}

function parseByteRange(rangeHeader: string | null, size: number): ByteRange | null {
  if (!rangeHeader || !rangeHeader.startsWith('bytes=')) {
    return null
  }

  const rawRange = rangeHeader.slice('bytes='.length).split(',')[0]?.trim()
  if (!rawRange) {
    return null
  }

  const [startRaw, endRaw] = rawRange.split('-')
  if (!startRaw && !endRaw) {
    return null
  }

  if (!startRaw) {
    const suffixLength = Number(endRaw)
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      return null
    }
    const start = Math.max(0, size - suffixLength)
    return {
      start,
      end: size - 1,
    }
  }

  const start = Number(startRaw)
  const end = endRaw ? Number(endRaw) : size - 1
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return null
  }
  if (start < 0 || end < 0 || start > end) {
    return null
  }
  if (start >= size) {
    return null
  }

  return {
    start,
    end: Math.min(end, size - 1),
  }
}

function toWebReadableStream(stream: ReadStream, signal?: AbortSignal | null): ReadableStream<Uint8Array> {
  if (signal) {
    if (signal.aborted) {
      stream.destroy(new Error('媒体读取已取消'))
    } else {
      const onAbort = () => {
        stream.destroy(new Error('媒体读取已取消'))
      }
      signal.addEventListener('abort', onAbort, { once: true })
      const cleanup = () => signal.removeEventListener('abort', onAbort)
      stream.once('close', cleanup)
      stream.once('end', cleanup)
      stream.once('error', cleanup)
    }
  }

  return Readable.toWeb(stream) as ReadableStream<Uint8Array>
}

function toSafeFsName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+/, '').slice(0, 96) || 'archive'
}

function toDeterministicCoverColor(videoId: string): string {
  const hash = makeStableId('cover', videoId)
  let hue = 0
  for (let index = 0; index < hash.length; index += 1) {
    hue = (hue * 31 + hash.charCodeAt(index)) % 360
  }
  return `hsl(${hue}, 44%, 40%)`
}

async function parallelMapLimit<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return []
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length))
  const results = new Array<R>(items.length)
  let cursor = 0

  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const index = cursor
      cursor += 1
      if (index >= items.length) {
        return
      }

      results[index] = await mapper(items[index], index)
    }
  })

  await Promise.all(workers)
  return results
}

function createCrc32Table(): Uint32Array {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let c = index
    for (let bit = 0; bit < 8; bit += 1) {
      c = (c & 1) !== 0 ? (0xedb88320 ^ (c >>> 1)) >>> 0 : (c >>> 1) >>> 0
    }
    table[index] = c >>> 0
  }
  return table
}

const CRC32_TABLE = createCrc32Table()

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff
  for (let index = 0; index < buffer.length; index += 1) {
    crc = CRC32_TABLE[(crc ^ buffer[index]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

async function runProcess(command: string, args: string[], timeoutMs = 120_000): Promise<ServiceShellResult> {
  return new Promise<ServiceShellResult>((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    let finished = false

    const cleanup = () => {
      if (finished) {
        return
      }
      finished = true
      clearTimeout(timeoutId)
    }

    const timeoutId = setTimeout(() => {
      if (!finished) {
        child.kill('SIGKILL')
        cleanup()
        reject(new Error(`命令执行超时: ${command}`))
      }
    }, timeoutMs)

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk)
    })
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })

    child.on('error', (error) => {
      cleanup()
      reject(error)
    })

    child.on('close', (code) => {
      cleanup()
      resolve({
        code: code ?? -1,
        stdout,
        stderr,
      })
    })
  })
}

async function checkCommandAvailability(command: string, args: string[]): Promise<boolean> {
  const result = await runProcess(command, args, 8_000).catch(() => null)
  return Boolean(result && result.code === 0)
}

async function getSharpModule(): Promise<SharpModule | null> {
  if (!sharpModulePromise) {
    sharpModulePromise = import('sharp').catch(() => null)
  }
  return sharpModulePromise
}

async function probeImageDimensionsFromFile(absolutePath: string): Promise<{ width: number; height: number }> {
  const sharpModule = await getSharpModule()
  if (!sharpModule?.default) {
    return { width: 0, height: 0 }
  }

  const metadata = await sharpModule.default(absolutePath, { failOn: 'none' }).metadata().catch(() => null)
  const width = Number(metadata?.width)
  const height = Number(metadata?.height)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: 0, height: 0 }
  }

  return {
    width: Math.max(0, Math.round(width)),
    height: Math.max(0, Math.round(height)),
  }
}

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

async function collectFilesRecursive(rootDir: string): Promise<Array<{ absolutePath: string; relativePath: string }>> {
  const files: Array<{ absolutePath: string; relativePath: string }> = []
  const queue = [rootDir]

  while (queue.length > 0) {
    const current = queue.pop()
    if (!current) {
      continue
    }

    const entries = await fs.readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        queue.push(absolutePath)
        continue
      }

      if (!entry.isFile()) {
        continue
      }

      files.push({
        absolutePath,
        relativePath: normalizePathKey(path.relative(rootDir, absolutePath)),
      })
    }
  }

  files.sort((left, right) => left.relativePath.localeCompare(right.relativePath, 'zh-CN'))
  return files
}

async function extractZipWithPowerShell(sourceArchivePath: string, outputDir: string): Promise<void> {
  const escapedSource = sourceArchivePath.replace(/'/g, "''")
  const escapedOutput = outputDir.replace(/'/g, "''")
  const script = `Expand-Archive -Path '${escapedSource}' -DestinationPath '${escapedOutput}' -Force`
  const result = await runProcess('powershell.exe', ['-NoProfile', '-Command', script], 180_000)
  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || `Expand-Archive 失败: ${sourceArchivePath}`)
  }
}

async function convertDirectoryImagesToWebp90(rootDir: string): Promise<void> {
  const files = await collectFilesRecursive(rootDir)
  for (const file of files) {
    const extension = path.extname(file.absolutePath).toLowerCase()
    if (!IMAGE_EXTENSIONS_FOR_WEBP_CONVERT.has(extension)) {
      continue
    }

    const outputPath = file.absolutePath.slice(0, file.absolutePath.length - extension.length) + '.webp'
    const result = await runProcess(
      FFMPEG_BIN,
      ['-y', '-v', 'error', '-i', file.absolutePath, '-q:v', '90', outputPath],
      120_000,
    )
    if (result.code !== 0) {
      throw new Error(result.stderr.trim() || `ffmpeg 转 webp 失败: ${file.absolutePath}`)
    }

    if (outputPath !== file.absolutePath) {
      await fs.rm(file.absolutePath, { force: true })
    }
  }
}

async function writeStoredZipFromDirectory(inputDir: string, outputZipPath: string): Promise<void> {
  const entries = await collectFilesRecursive(inputDir)
  const localChunks: Buffer[] = []
  const centralChunks: Buffer[] = []
  let cursor = 0

  for (const entry of entries) {
    const content = await fs.readFile(entry.absolutePath)
    const normalizedName = normalizeArchiveEntryName(entry.relativePath)
    if (!normalizedName) {
      continue
    }

    const nameBuffer = Buffer.from(normalizedName, 'utf8')
    const crc = crc32(content)

    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0x0800, 6)
    localHeader.writeUInt16LE(0, 8)
    localHeader.writeUInt16LE(0, 10)
    localHeader.writeUInt16LE(0, 12)
    localHeader.writeUInt32LE(crc, 14)
    localHeader.writeUInt32LE(content.length, 18)
    localHeader.writeUInt32LE(content.length, 22)
    localHeader.writeUInt16LE(nameBuffer.length, 26)
    localHeader.writeUInt16LE(0, 28)

    localChunks.push(localHeader, nameBuffer, content)

    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0)
    centralHeader.writeUInt16LE(20, 4)
    centralHeader.writeUInt16LE(20, 6)
    centralHeader.writeUInt16LE(0x0800, 8)
    centralHeader.writeUInt16LE(0, 10)
    centralHeader.writeUInt16LE(0, 12)
    centralHeader.writeUInt32LE(crc, 16)
    centralHeader.writeUInt32LE(content.length, 20)
    centralHeader.writeUInt32LE(content.length, 24)
    centralHeader.writeUInt16LE(nameBuffer.length, 28)
    centralHeader.writeUInt16LE(0, 30)
    centralHeader.writeUInt16LE(0, 32)
    centralHeader.writeUInt16LE(0, 34)
    centralHeader.writeUInt16LE(0, 36)
    centralHeader.writeUInt32LE(0, 38)
    centralHeader.writeUInt32LE(cursor, 42)

    centralChunks.push(centralHeader, nameBuffer)
    cursor += localHeader.length + nameBuffer.length + content.length
  }

  const centralDirectoryBuffer = Buffer.concat(centralChunks)
  const endOfCentralDirectory = Buffer.alloc(22)
  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0)
  endOfCentralDirectory.writeUInt16LE(0, 4)
  endOfCentralDirectory.writeUInt16LE(0, 6)
  endOfCentralDirectory.writeUInt16LE(entries.length, 8)
  endOfCentralDirectory.writeUInt16LE(entries.length, 10)
  endOfCentralDirectory.writeUInt32LE(centralDirectoryBuffer.length, 12)
  endOfCentralDirectory.writeUInt32LE(cursor, 16)
  endOfCentralDirectory.writeUInt16LE(0, 20)

  await fs.mkdir(path.dirname(outputZipPath), { recursive: true })
  await fs.writeFile(outputZipPath, Buffer.concat([...localChunks, centralDirectoryBuffer, endOfCentralDirectory]))
}

function parseFfprobeJson(raw: string): VideoProbeResult | null {
  try {
    const parsed = JSON.parse(raw) as {
      streams?: Array<{ width?: number; height?: number; duration?: string }>
      format?: { duration?: string }
    }
    const stream = parsed.streams?.find((item) => Number.isFinite(item.width) && Number.isFinite(item.height))
    const width = stream?.width && stream.width > 0 ? Math.round(stream.width) : null
    const height = stream?.height && stream.height > 0 ? Math.round(stream.height) : null

    const durationRaw = parsed.format?.duration ?? stream?.duration
    const durationValue = durationRaw ? Number(durationRaw) : 0
    const durationSec = Number.isFinite(durationValue) && durationValue > 0 ? durationValue : 0

    if (!width || !height) {
      return null
    }

    return {
      durationSec,
      width,
      height,
    }
  } catch {
    return null
  }
}

async function probeVideoMetadata(videoPath: string): Promise<VideoProbeResult | null> {
  const result = await runProcess(
    FFPROBE_BIN,
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height,duration',
      '-show_entries',
      'format=duration',
      '-of',
      'json',
      videoPath,
    ],
    2_000,
  ).catch(() => null)

  if (!result || result.code !== 0) {
    return null
  }
  return parseFfprobeJson(result.stdout)
}

function buildImageSidebarTree(
  imagePackages: ImagePackageDto[],
  imageDirectories: ImagePackageDto[],
): SidebarNodeDto[] {
  const packageByPath = new Map<string, ImagePackageDto>()
  const directoryByPath = new Map<string, ImagePackageDto>()

  for (const pkg of imagePackages) {
    packageByPath.set(pkg.tree_path.join('/'), pkg)
  }
  for (const directory of imageDirectories) {
    directoryByPath.set(directory.tree_path.join('/'), directory)
  }

  const allLeafPaths = [
    ...imagePackages.map((pkg) => pkg.tree_path),
    ...imageDirectories.map((directory) => directory.tree_path),
  ]

  const rootMap = new Map<string, SidebarNodeDto>()
  const nodeByPath = new Map<string, SidebarNodeDto>()

  for (const sourcePath of allLeafPaths) {
    for (let index = 0; index < sourcePath.length; index += 1) {
      const segments = sourcePath.slice(0, index + 1)
      const pathKey = segments.join('/')
      if (nodeByPath.has(pathKey)) {
        continue
      }

      const packageAtPath = packageByPath.get(pathKey)
      const directoryAtPath = directoryByPath.get(pathKey)
      const kind = packageAtPath ? 'package' : 'folder'

      const node: SidebarNodeDto = {
        id: `${kind}:${pathKey}`,
        label: segments[segments.length - 1] ?? pathKey,
        kind,
        children: [],
        path_key: pathKey,
      }

      if (packageAtPath) {
        node.package_id = packageAtPath.id
        node.image_source_id = packageAtPath.id
        node.direct_image_count = packageAtPath.images.length
      } else if (directoryAtPath) {
        node.image_source_id = directoryAtPath.id
        node.direct_image_count = directoryAtPath.images.length
      }

      nodeByPath.set(pathKey, node)

      if (segments.length === 1) {
        rootMap.set(pathKey, node)
        continue
      }

      const parentPath = sourcePath.slice(0, index).join('/')
      const parentNode = nodeByPath.get(parentPath)
      if (parentNode) {
        parentNode.children.push(node)
      }
    }
  }

  const sortNodes = (nodes: SidebarNodeDto[]) => {
    nodes.sort((left, right) => {
      const kindOrder: Record<SidebarNodeDto['kind'], number> = {
        folder: 0,
        package: 1,
        video: 2,
      }
      const kindDelta = kindOrder[left.kind] - kindOrder[right.kind]
      if (kindDelta !== 0) {
        return kindDelta
      }
      return left.label.localeCompare(right.label, 'zh-CN')
    })

    for (const node of nodes) {
      if (node.children.length > 0) {
        sortNodes(node.children)
      }
    }
  }

  const roots = Array.from(rootMap.values())
  sortNodes(roots)
  return roots
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
    return this.isPathAllowlisted(sourceArchivePath)
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
    const rootStat = await fs.stat(this.rootDir).catch(() => null)
    if (!rootStat || !rootStat.isDirectory()) {
      throw new Error(`后端真实读服务失败：目录不存在或不可访问 -> ${this.rootDir}`)
    }

    await this.ensureStateLoaded()

    const directoryRoots = Array.from(new Set(this.importDirectoryRoots.map((value) => path.resolve(value))))
    const explicitFiles = Array.from(new Set(this.importSources.files.map((value) => path.resolve(value))))

    if (directoryRoots.length === 0 && explicitFiles.length === 0) {
      return []
    }

    const internalMetaDir = path.join(this.rootDir, '.mediaplayerx')
    const legacyImportsDir = path.join(this.rootDir, LEGACY_IMPORTS_DIR_NAME)

    const files: FileRecord[] = []
    const seen = new Set<string>()

    const pushFile = (absolutePath: string, extension: string, sizeBytes: number, width = 0, height = 0) => {
      const key = normalizeAllowlistKey(absolutePath)
      if (seen.has(key)) {
        return
      }
      seen.add(key)
      files.push({
        absolutePath,
        relativePath: normalizePathKey(absolutePath),
        extension,
        sizeBytes,
        width,
        height,
      })
    }

    let levelDirectories = directoryRoots

    while (levelDirectories.length > 0) {
      const nestedDirectories = await parallelMapLimit(levelDirectories, DIRECTORY_SCAN_CONCURRENCY, async (current) => {
        const entries = await fs.readdir(current, { withFileTypes: true }).catch(() => null)
        if (!entries) {
          return []
        }
        const nextLevel: string[] = []
        const pendingVideoRecords: Array<{ absolutePath: string; extension: string }> = []
        const pendingImageOrArchiveRecords: Array<{ absolutePath: string; extension: string }> = []

        for (const entry of entries) {
          const absolutePath = path.join(current, entry.name)
          if (entry.isDirectory()) {
            const lowered = entry.name.toLowerCase()
            if (lowered === '.mediaplayerx' || lowered === LEGACY_IMPORTS_DIR_NAME) {
              continue
            }
            nextLevel.push(absolutePath)
            continue
          }

          if (!entry.isFile()) {
            continue
          }

          const extension = path.extname(entry.name).toLowerCase()
          if (!IMAGE_EXTENSIONS.has(extension) && !VIDEO_EXTENSIONS.has(extension) && !ARCHIVE_EXTENSIONS.has(extension)) {
            continue
          }

          if (isPathInsideRoot(internalMetaDir, absolutePath) || isPathInsideRoot(legacyImportsDir, absolutePath)) {
            continue
          }

          if (VIDEO_EXTENSIONS.has(extension)) {
            pendingVideoRecords.push({ absolutePath, extension })
            continue
          }

          pendingImageOrArchiveRecords.push({ absolutePath, extension })
        }

        if (pendingImageOrArchiveRecords.length > 0) {
          const imageOrArchiveFiles = await parallelMapLimit(
            pendingImageOrArchiveRecords,
            DIRECTORY_SCAN_CONCURRENCY,
            async (record) => {
              const stat = await fs.stat(record.absolutePath).catch(() => null)
              if (!stat || !stat.isFile()) {
                return null
              }

              let width = 0
              let height = 0
              if (IMAGE_EXTENSIONS.has(record.extension)) {
                const dimensions = await probeImageDimensionsFromFile(record.absolutePath)
                width = dimensions.width
                height = dimensions.height
              }

              return {
                absolutePath: record.absolutePath,
                extension: record.extension,
                sizeBytes: stat.size,
                width,
                height,
              }
            },
          )

          for (const file of imageOrArchiveFiles) {
            if (!file) {
              continue
            }
            pushFile(file.absolutePath, file.extension, file.sizeBytes, file.width, file.height)
          }
        }

        if (pendingVideoRecords.length > 0) {
          const videoFiles = await parallelMapLimit(
            pendingVideoRecords,
            DIRECTORY_SCAN_CONCURRENCY,
            async (videoRecord) => {
              const stat = await fs.stat(videoRecord.absolutePath).catch(() => null)
              return {
                absolutePath: videoRecord.absolutePath,
                extension: videoRecord.extension,
                sizeBytes: stat?.size ?? 0,
              }
            },
          )

          for (const videoFile of videoFiles) {
            pushFile(videoFile.absolutePath, videoFile.extension, videoFile.sizeBytes, 0, 0)
          }
        }

        return nextLevel
      })

      levelDirectories = nestedDirectories.flat()
    }

    if (explicitFiles.length > 0) {
      const resolvedFiles = await parallelMapLimit(explicitFiles, DIRECTORY_SCAN_CONCURRENCY, async (candidatePath) => {
        const absolutePath = path.resolve(candidatePath)

        if (isPathInsideRoot(internalMetaDir, absolutePath) || isPathInsideRoot(legacyImportsDir, absolutePath)) {
          return null
        }

        const stat = await fs.stat(absolutePath).catch(() => null)
        if (!stat || !stat.isFile()) {
          return null
        }

        const extension = path.extname(absolutePath).toLowerCase()
        if (!IMAGE_EXTENSIONS.has(extension) && !VIDEO_EXTENSIONS.has(extension) && !ARCHIVE_EXTENSIONS.has(extension)) {
          return null
        }

        let width = 0
        let height = 0
        if (IMAGE_EXTENSIONS.has(extension)) {
          const dimensions = await probeImageDimensionsFromFile(absolutePath)
          width = dimensions.width
          height = dimensions.height
        }

        return {
          absolutePath,
          extension,
          sizeBytes: stat.size,
          width,
          height,
        }
      })

      for (const record of resolvedFiles) {
        if (!record) {
          continue
        }
        pushFile(record.absolutePath, record.extension, record.sizeBytes, record.width, record.height)
      }
    }

    files.sort((left, right) => left.absolutePath.localeCompare(right.absolutePath, 'zh-CN'))
    return files
  }

  private createDirectoryImageItem(record: FileRecord, sourceId: string, ordinal: number): ImageItemDto {
    const cluster = ordinal % COLOR_PALETTE.length
    const mediaLocator: MediaLocatorDto = {
      kind: 'filesystem',
      absolute_path: record.absolutePath,
      extension: record.extension,
      media_type: 'image',
      mime_type: detectMimeTypeByExtension(record.extension, 'image'),
    }

    return {
      id: makeStableId('img', `${sourceId}:${record.absolutePath}`),
      ordinal,
      width: record.width,
      height: record.height,
      size_kb: toSafeSizeKb(record.sizeBytes),
      cluster,
      color: COLOR_PALETTE[cluster] ?? '#4f86cf',
      feature_vector: [0, 0, 0, 0, 0, 0, 0, 0],
      media_locator: mediaLocator,
    }
  }

  private createArchiveImageItem(
    sourceId: string,
    archivePath: string,
    entry: ZipCentralEntry,
    ordinal: number,
  ): ImageItemDto {
    const cluster = ordinal % COLOR_PALETTE.length
    const mediaLocator: MediaLocatorDto = {
      kind: 'archive-entry',
      archive_path: archivePath,
      archive_format: 'zip',
      entry_name: entry.entryName,
      extension: entry.extension,
      media_type: 'image',
      mime_type: detectMimeTypeByExtension(entry.extension, 'image'),
    }

    return {
      id: makeStableId('img', `${sourceId}:${archivePath}::${entry.entryName}`),
      ordinal,
      width: 0,
      height: 0,
      size_kb: toSafeSizeKb(entry.uncompressedSize),
      cluster,
      color: COLOR_PALETTE[cluster] ?? '#4f86cf',
      feature_vector: [0, 0, 0, 0, 0, 0, 0, 0],
      media_locator: mediaLocator,
    }
  }

  private createDirectorySource(directoryPath: string, imageFiles: FileRecord[]): ImagePackageDto {
    const treePath = toAbsoluteTreePath(directoryPath)
    const sourceId = makeStableId('dir', directoryPath)
    const displayName = path.basename(directoryPath) || treePath[treePath.length - 1] || sourceId
    const persistedGrade = this.packageGradeOverridesBySourceId.get(sourceId)

    return {
      id: sourceId,
      package_name: displayName,
      display_name: displayName,
      absolute_path: directoryPath,
      tree_path: treePath,
      work_title: displayName,
      circle: '未知',
      author: '未知',
      tags: [],
      mock_grade: persistedGrade ?? null,
      images: imageFiles.map((file, index) => this.createDirectoryImageItem(file, sourceId, index + 1)),
    }
  }

  private createArchiveSource(
    file: FileRecord,
    imageEntries: ZipCentralEntry[],
    archivePathForMediaRead = file.absolutePath,
  ): ImagePackageDto {
    const sourceId = makeStableId('pkg', file.absolutePath)
    const fileName = path.basename(file.absolutePath)
    const displayName = path.basename(file.absolutePath, file.extension)
    const persistedGrade = this.packageGradeOverridesBySourceId.get(sourceId)

    const sortedEntries = [...imageEntries].sort((left, right) => left.entryName.localeCompare(right.entryName, 'zh-CN'))

    return {
      id: sourceId,
      package_name: fileName,
      display_name: displayName,
      absolute_path: file.absolutePath,
      tree_path: toAbsoluteTreePath(file.absolutePath),
      work_title: displayName,
      circle: '未知',
      author: '未知',
      tags: [],
      mock_grade: persistedGrade ?? null,
      images: sortedEntries.map((entry, index) =>
        this.createArchiveImageItem(sourceId, archivePathForMediaRead, entry, index + 1),
      ),
    }
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
    const probe = runtimeDependencies.ffprobe ? await probeVideoMetadata(file.absolutePath).catch(() => null) : null
    const coverRecord = this.videoCoverOverridesByVideoId.get(videoId)

    return {
      id: videoId,
      file_name: path.basename(file.absolutePath),
      absolute_path: file.absolutePath,
      tree_path: toAbsoluteTreePath(file.absolutePath),
      duration_sec: Math.max(0, Math.round(probe?.durationSec ?? 0)),
      width: probe?.width && probe.width > 0 ? probe.width : 1920,
      height: probe?.height && probe.height > 0 ? probe.height : 1080,
      size_mb: toSafeSizeMb(file.sizeBytes),
      cover_color: coverRecord?.coverColor ?? toDeterministicCoverColor(videoId),
      cover_image_path: coverRecord?.coverImagePath ?? null,
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
      await convertDirectoryImagesToWebp90(tempExtractDir)

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
        return this.createDirectorySource(directoryPath, imageFiles)
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
        this.createArchiveSource(prepared.archive, prepared.imageEntries, prepared.archivePathForMediaRead),
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

  private isPathAllowlisted(absolutePath: string): boolean {
    if (isPathInsideRoot(this.rootDir, absolutePath)) {
      return true
    }

    for (const root of this.importDirectoryRoots) {
      if (isPathInsideRoot(root, absolutePath)) {
        return true
      }
    }

    const key = normalizeAllowlistKey(absolutePath)
    return this.importFileAllowlistKeys.has(key)
  }

  private async assertLocatorAllowed(locator: MediaLocatorDto): Promise<MediaLocatorDto> {
    if (locator.kind === 'filesystem') {
      const absolutePath = path.resolve(locator.absolute_path)

      if (!this.isPathAllowlisted(absolutePath)) {
        throw new MediaAccessError('path_outside_root', `媒体访问被拒绝（未导入/未允许）: ${absolutePath}`)
      }

      const extension = path.extname(absolutePath).toLowerCase()
      if (!extension || extension !== locator.extension.toLowerCase()) {
        throw new MediaAccessError('filesystem_extension_mismatch', `媒体访问被拒绝（扩展名不一致）: ${absolutePath}`)
      }

      const extensionAllowed =
        locator.media_type === 'image' ? IMAGE_EXTENSIONS.has(extension) : VIDEO_EXTENSIONS.has(extension)
      if (!extensionAllowed) {
        throw new MediaAccessError('filesystem_media_type_not_allowed', `媒体访问被拒绝（类型不允许）: ${absolutePath}`)
      }

      const stat = await fs.stat(absolutePath).catch(() => null)
      if (!stat || !stat.isFile()) {
        throw new MediaAccessError('filesystem_file_missing', `媒体访问失败（文件不存在）: ${absolutePath}`)
      }

      return {
        ...locator,
        absolute_path: absolutePath,
        extension,
      }
    }

    const archivePath = path.resolve(locator.archive_path)
    if (!this.isPathAllowlisted(archivePath)) {
      throw new MediaAccessError('path_outside_root', `压缩包媒体访问被拒绝（未导入/未允许）: ${archivePath}`)
    }

    const archiveStat = await fs.stat(archivePath).catch(() => null)
    if (!archiveStat || !archiveStat.isFile()) {
      throw new MediaAccessError('archive_not_exists', `压缩包媒体访问被拒绝（文件不存在）: ${archivePath}`)
    }

    if (locator.archive_format !== 'zip') {
      throw new MediaAccessError('archive_format_not_supported', `压缩包媒体访问被拒绝（暂仅支持 zip）: ${archivePath}`)
    }
    if (path.extname(archivePath).toLowerCase() !== '.zip') {
      throw new MediaAccessError('archive_extension_invalid', `压缩包媒体访问被拒绝（扩展名异常）: ${archivePath}`)
    }

    const normalizedEntryName = normalizeArchiveEntryName(locator.entry_name)
    if (!isSafeArchiveEntryName(normalizedEntryName)) {
      throw new MediaAccessError('archive_entry_illegal', `压缩包媒体访问被拒绝（entry 非法）: ${archivePath}`)
    }

    const allowedEntries = this.archiveEntryIndexByPath.get(archivePath)
    if (!allowedEntries || !allowedEntries.has(normalizedEntryName)) {
      throw new MediaAccessError(
        'archive_entry_not_allowlisted',
        `压缩包媒体访问被拒绝（entry 不在白名单）: ${archivePath}::${normalizedEntryName}`,
      )
    }

    return {
      ...locator,
      archive_path: archivePath,
      entry_name: normalizedEntryName,
      extension: path.extname(normalizedEntryName).toLowerCase(),
    }
  }

  private async readFilesystemMedia(
    locator: Extract<MediaLocatorDto, { kind: 'filesystem' }>,
    mimeType: string,
    rangeHeader: string | null,
  ): Promise<MediaProtocolResponsePayload> {
    const filePath = locator.absolute_path
    const stat = await fs.stat(filePath)
    const size = stat.size

    const requestedRange = parseByteRange(rangeHeader, size)
    if (rangeHeader && !requestedRange) {
      return {
        status: 416,
        headers: {
          'content-type': mimeType,
          'content-range': `bytes */${size}`,
          'accept-ranges': 'bytes',
          'cache-control': 'no-store',
        },
        body: new Uint8Array(0),
      }
    }

    if (!requestedRange) {
      const fileBuffer = await fs.readFile(filePath)
      return {
        status: 200,
        headers: {
          'content-type': mimeType,
          'content-length': String(fileBuffer.length),
          'accept-ranges': 'bytes',
          'cache-control': 'no-store',
        },
        body: fileBuffer,
      }
    }

    const { start, end } = requestedRange
    const length = end - start + 1
    const handle = await fs.open(filePath, 'r')
    try {
      const buffer = Buffer.alloc(length)
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, start)
      const payload = bytesRead < buffer.length ? buffer.subarray(0, bytesRead) : buffer
      return {
        status: 206,
        headers: {
          'content-type': mimeType,
          'content-length': String(payload.length),
          'content-range': `bytes ${start}-${start + payload.length - 1}/${size}`,
          'accept-ranges': 'bytes',
          'cache-control': 'no-store',
        },
        body: payload,
      }
    } finally {
      await handle.close()
    }
  }

  private async readFilesystemMediaStream(
    locator: Extract<MediaLocatorDto, { kind: 'filesystem' }>,
    mimeType: string,
    rangeHeader: string | null,
    signal?: AbortSignal | null,
  ): Promise<MediaProtocolStreamResponsePayload> {
    const filePath = locator.absolute_path
    const stat = await fs.stat(filePath)
    const size = stat.size

    const requestedRange = parseByteRange(rangeHeader, size)
    if (rangeHeader && !requestedRange) {
      return {
        status: 416,
        headers: {
          'content-type': mimeType,
          'content-range': `bytes */${size}`,
          'accept-ranges': 'bytes',
          'cache-control': 'no-store',
        },
        body: new Uint8Array(0),
      }
    }

    if (!requestedRange) {
      const stream = createReadStream(filePath)
      return {
        status: 200,
        headers: {
          'content-type': mimeType,
          'content-length': String(size),
          'accept-ranges': 'bytes',
          'cache-control': 'no-store',
        },
        body: toWebReadableStream(stream, signal),
      }
    }

    const { start, end } = requestedRange
    const length = end - start + 1
    const stream = createReadStream(filePath, { start, end })
    return {
      status: 206,
      headers: {
        'content-type': mimeType,
        'content-length': String(length),
        'content-range': `bytes ${start}-${end}/${size}`,
        'accept-ranges': 'bytes',
        'cache-control': 'no-store',
      },
      body: toWebReadableStream(stream, signal),
    }
  }

  private async readArchiveEntryMedia(
    locator: Extract<MediaLocatorDto, { kind: 'archive-entry' }>,
    mimeType: string,
  ): Promise<MediaProtocolResponsePayload> {
    const archivePath = locator.archive_path
    const entryMap = this.zipEntryIndexByPath.get(archivePath)
    const entry = entryMap?.get(locator.entry_name)
    if (!entry) {
      throw new Error(`压缩包媒体读取失败（entry 丢失）: ${archivePath}::${locator.entry_name}`)
    }

    const buffer = await readZipEntryContent(archivePath, entry)
    return {
      status: 200,
      headers: {
        'content-type': mimeType,
        'content-length': String(buffer.length),
        'cache-control': 'no-store',
      },
      body: buffer,
    }
  }

  private async readArchiveEntryMediaStream(
    locator: Extract<MediaLocatorDto, { kind: 'archive-entry' }>,
    mimeType: string,
    signal?: AbortSignal | null,
  ): Promise<MediaProtocolStreamResponsePayload> {
    const archivePath = locator.archive_path
    const entryMap = this.zipEntryIndexByPath.get(archivePath)
    const entry = entryMap?.get(locator.entry_name)
    if (!entry) {
      throw new Error(`压缩包媒体读取失败（entry 丢失）: ${archivePath}::${locator.entry_name}`)
    }

    if ((entry.generalPurposeBitFlag & ZIP_GENERAL_PURPOSE_FLAG_ENCRYPTED) !== 0) {
      throw new Error(`zip 条目被加密，当前不支持: ${archivePath} -> ${entry.entryName}`)
    }

    if (entry.compressionMethod === ZIP_COMPRESSION_STORE) {
      const dataOffset = await readZipEntryDataOffset(archivePath, entry)
      const end = dataOffset + entry.compressedSize - 1
      const stream = createReadStream(archivePath, { start: dataOffset, end })
      return {
        status: 200,
        headers: {
          'content-type': mimeType,
          'content-length': String(entry.compressedSize),
          'cache-control': 'no-store',
        },
        body: toWebReadableStream(stream, signal),
      }
    }

    const buffer = await readZipEntryContent(archivePath, entry)
    return {
      status: 200,
      headers: {
        'content-type': mimeType,
        'content-length': String(buffer.length),
        'cache-control': 'no-store',
      },
      body: buffer,
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

    const payload = await this.readArchiveEntryMedia(locator, locator.mime_type)
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

  private async inspectImportPath(
    candidatePath: string,
  ): Promise<{ ok: true; inspection: ImportPathInspection } | { ok: false; reason: string }> {
    const absolutePath = path.resolve(candidatePath)

    const stat = await fs.stat(absolutePath).catch(() => null)
    if (!stat) {
      return { ok: false, reason: `路径不存在: ${absolutePath}` }
    }

    const insideRoot = isPathInsideRoot(this.rootDir, absolutePath)

    if (stat.isDirectory()) {
      const readable = await fs.readdir(absolutePath).then(() => true).catch(() => false)
      if (!readable) {
        return { ok: false, reason: `目录不可读: ${absolutePath}` }
      }
      return {
        ok: true,
        inspection: {
          absolutePath,
          insideRoot,
          kind: 'directory',
          extension: null,
        },
      }
    }

    if (!stat.isFile()) {
      return { ok: false, reason: `仅支持文件或目录: ${absolutePath}` }
    }

    const extension = path.extname(absolutePath).toLowerCase()
    if (!IMAGE_EXTENSIONS.has(extension) && !VIDEO_EXTENSIONS.has(extension) && !ARCHIVE_EXTENSIONS.has(extension)) {
      return { ok: false, reason: `类型不支持: ${absolutePath}` }
    }

    return {
      ok: true,
      inspection: {
        absolutePath,
        insideRoot,
        kind: 'file',
        extension,
      },
    }
  }

  private async runImportTask(taskId: string): Promise<ImportTaskDto> {
    const existing = this.database.readTask(taskId)
    if (!existing) {
      throw new Error(`导入任务不存在: ${taskId}`)
    }

    const totalCount = existing.sourcePaths.length
    const startedAtMs = Date.now()
    this.database.upsertTask({
      ...existing,
      status: 'running',
      progress: totalCount > 0 ? existing.processedCount / totalCount : 1,
      message: '导入进行中',
      errorDetail: null,
      updatedAtMs: startedAtMs,
    })

    let processedCount = 0
    let acceptedCount = 0
    const failedMessages: string[] = []

    const internalMetaDir = path.join(this.rootDir, '.mediaplayerx')
    const legacyImportsDir = path.join(this.rootDir, LEGACY_IMPORTS_DIR_NAME)

    const existingImportSources = this.database.readImportSources()
    const directoryMap = new Map<string, string>()
    const fileMap = new Map<string, string>()

    for (const value of existingImportSources.directories) {
      const resolved = path.resolve(value)
      directoryMap.set(normalizeAllowlistKey(resolved), resolved)
    }
    for (const value of existingImportSources.files) {
      const resolved = path.resolve(value)
      fileMap.set(normalizeAllowlistKey(resolved), resolved)
    }

    let addedDirectoryCount = 0
    let addedFileCount = 0

    for (const sourcePath of existing.sourcePaths) {
      const inspected = await this.inspectImportPath(sourcePath)
      if (inspected.ok) {
        let pathSucceeded = true
        try {
          const { inspection } = inspected
          const absolutePath = inspection.absolutePath

          if (isPathInsideRoot(internalMetaDir, absolutePath) || isPathInsideRoot(legacyImportsDir, absolutePath)) {
            pathSucceeded = false
            failedMessages.push(`禁止导入内部目录: ${absolutePath}`)
          } else if (inspection.kind === 'file') {
            const key = normalizeAllowlistKey(absolutePath)
            if (!fileMap.has(key)) {
              fileMap.set(key, absolutePath)
              addedFileCount += 1
            }
          } else if (inspection.kind === 'directory') {
            const key = normalizeAllowlistKey(absolutePath)
            if (!directoryMap.has(key)) {
              directoryMap.set(key, absolutePath)
              addedDirectoryCount += 1
            }
          }

          if (pathSucceeded) {
            acceptedCount += 1
          }
        } catch (error) {
          const reason = error instanceof Error && error.message ? error.message : '未知错误'
          failedMessages.push(`导入失败: ${inspected.inspection.absolutePath} (${reason})`)
        }
      } else {
        failedMessages.push(inspected.reason)
      }

      processedCount += 1
      this.database.upsertTask({
        ...existing,
        status: 'running',
        progress: totalCount > 0 ? processedCount / totalCount : 1,
        processedCount,
        totalCount,
        message: `导入进行中 ${processedCount}/${totalCount} | 新增引用 ${addedDirectoryCount + addedFileCount}`,
        errorDetail: failedMessages.length > 0 ? failedMessages.slice(0, 3).join(' | ') : null,
        updatedAtMs: Date.now(),
      })
    }

    const addedTotal = addedDirectoryCount + addedFileCount
    if (addedTotal > 0) {
      this.database.writeImportSources({
        directories: Array.from(directoryMap.values()),
        files: Array.from(fileMap.values()),
      })
      this.invalidateCache()
      await this.ensureSnapshotLoaded()

      this.emitLibraryChanged({
        reason: 'import-task-finished',
        updated_at_ms: Date.now(),
      })
    }

    const finishedAtMs = Date.now()
    const failedCount = Math.max(0, totalCount - acceptedCount)
    const status: ImportTaskDto['status'] = failedCount > 0 ? 'failed' : 'completed'
    const message =
      status === 'completed'
        ? `导入完成，共 ${acceptedCount} 项，新增引用 ${addedTotal} 项（目录 ${addedDirectoryCount} + 文件 ${addedFileCount}）`
        : `导入失败，成功 ${acceptedCount} 项，失败 ${failedCount} 项`

    this.database.upsertTask({
      ...existing,
      status,
      progress: 1,
      processedCount: totalCount,
      totalCount,
      message,
      errorDetail: failedMessages.length > 0 ? failedMessages.join('\n') : null,
      updatedAtMs: finishedAtMs,
    })

    const finalTask = this.database.readTask(taskId)
    if (!finalTask) {
      throw new Error(`导入任务状态丢失: ${taskId}`)
    }
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
      locator = await this.assertLocatorAllowed(request.locator)
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
      return this.readFilesystemMedia(locator, record.mimeType, rangeHeader)
    }

    return this.readArchiveEntryMedia(locator, record.mimeType)
  }

  async readMediaResourceByTokenStream(
    token: string,
    rangeHeader: string | null,
    signal?: AbortSignal | null,
  ): Promise<MediaProtocolStreamResponsePayload> {
    const record = this.requireMediaTokenRecord(token)

    const locator = record.locator
    if (locator.kind === 'filesystem') {
      return this.readFilesystemMediaStream(locator, record.mimeType, rangeHeader, signal)
    }

    return this.readArchiveEntryMediaStream(locator, record.mimeType, signal)
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
