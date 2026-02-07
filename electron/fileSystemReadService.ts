import { createHash, randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { inflateRawSync } from 'node:zlib'

import {
  librarySnapshotDtoSchema,
  mediaAccessAuditResponseSchema,
  readPlaylistResponseSchema,
  readImageMetadataResponseSchema,
  readImagePageResponseSchema,
  readImageSidebarTreeResponseSchema,
  resolveMediaResourceResponseSchema,
  saveVideoCoverResponseSchema,
  writePlaylistResponseSchema,
  writePackageGradeResponseSchema,
  type FeatureFilterDto,
  type FocusedImageRefDto,
  type ImageItemDto,
  type ImagePackageDto,
  type LibrarySnapshotDto,
  type MediaAccessAuditResponseDto,
  type MediaLocatorDto,
  type ReadPlaylistResponseDto,
  type ReadImageMetadataRequestDto,
  type ReadImageMetadataResponseDto,
  type ReadImagePageRequestDto,
  type ReadImagePageResponseDto,
  type ReadImageSidebarTreeRequestDto,
  type ReadImageSidebarTreeResponseDto,
  type ResolveMediaResourceRequestDto,
  type ResolveMediaResourceResponseDto,
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
import { MediaLibraryDatabase } from './mediaLibraryDatabase'

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
const ARCHIVE_EXTRACTOR_BIN = process.env.MEDIA_PLAYERX_ARCHIVE_EXTRACTOR_BIN ?? '7z'
const ARCHIVE_NORMALIZE_DIR_NAME = '.mediaplayerx/normalized-archives'

const IMAGE_EXTENSIONS_FOR_WEBP_CONVERT = new Set(['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp'])

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
  strategy: 'none' | 'rar7z-to-zip-store' | 'zip-repack-webp90-store'
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

function makeStableId(prefix: string, value: string): string {
  const hash = createHash('sha1').update(value).digest('hex').slice(0, 12)
  return `${prefix}-${hash}`
}

function toTreePath(rootDir: string, targetPath: string): string[] {
  const relative = normalizePathKey(path.relative(rootDir, targetPath))
  const segments = relative
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)

  if (segments.length > 0) {
    return segments
  }

  return [path.basename(targetPath)]
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

async function readZipEntryContent(archivePath: string, entry: ZipCentralEntry): Promise<Buffer> {
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
    const dataOffset = entry.localHeaderOffset + 30 + localFileNameLength + localExtraLength

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

async function extractArchiveWith7z(sourceArchivePath: string, outputDir: string): Promise<void> {
  const result = await runProcess(ARCHIVE_EXTRACTOR_BIN, ['x', '-y', `-o${outputDir}`, sourceArchivePath], 300_000)
  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || `7z 解压失败: ${sourceArchivePath}`)
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

  constructor(rootDir: string) {
    this.rootDir = path.resolve(rootDir)
    this.normalizedArchiveRootDir = path.join(this.rootDir, ARCHIVE_NORMALIZE_DIR_NAME)
    this.coverOutputRootDir = path.join(this.rootDir, '.mediaplayerx', 'covers')
    this.database = new MediaLibraryDatabase(this.rootDir)
  }

  invalidateCache(): void {
    this.snapshotCache = null
    this.stateHydrated = false
    this.archiveEntryIndexByPath.clear()
    this.zipEntryIndexByPath.clear()
    this.mediaTokenIndex.clear()
    this.normalizedArchiveCacheBySourcePath.clear()
  }

  dispose(): void {
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
    this.stateHydrated = true
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

    const files: FileRecord[] = []
    const queue = [this.rootDir]

    while (queue.length > 0) {
      const current = queue.pop()
      if (!current) {
        continue
      }

      const entries = await fs.readdir(current, { withFileTypes: true })
      for (const entry of entries) {
        const absolutePath = path.join(current, entry.name)
        if (entry.isDirectory()) {
          if (entry.name === '.mediaplayerx') {
            continue
          }
          queue.push(absolutePath)
          continue
        }

        if (!entry.isFile()) {
          continue
        }

        const extension = path.extname(entry.name).toLowerCase()
        if (!IMAGE_EXTENSIONS.has(extension) && !VIDEO_EXTENSIONS.has(extension) && !ARCHIVE_EXTENSIONS.has(extension)) {
          continue
        }

        const stat = await fs.stat(absolutePath)
        files.push({
          absolutePath,
          relativePath: normalizePathKey(path.relative(this.rootDir, absolutePath)),
          extension,
          sizeBytes: stat.size,
        })
      }
    }

    files.sort((left, right) => left.relativePath.localeCompare(right.relativePath, 'zh-CN'))
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
      width: 1920,
      height: 1080,
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
      width: 1920,
      height: 1080,
      size_kb: 0,
      cluster,
      color: COLOR_PALETTE[cluster] ?? '#4f86cf',
      feature_vector: [0, 0, 0, 0, 0, 0, 0, 0],
      media_locator: mediaLocator,
    }
  }

  private createDirectorySource(directoryPath: string, imageFiles: FileRecord[]): ImagePackageDto {
    const treePath = toTreePath(this.rootDir, directoryPath)
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
      tree_path: toTreePath(this.rootDir, file.absolutePath),
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
    const probe = await probeVideoMetadata(file.absolutePath).catch(() => null)
    const coverRecord = this.videoCoverOverridesByVideoId.get(videoId)

    return {
      id: videoId,
      file_name: path.basename(file.absolutePath),
      absolute_path: file.absolutePath,
      tree_path: toTreePath(this.rootDir, file.absolutePath),
      duration_sec: Math.max(0, Math.round(probe?.durationSec ?? 0)),
      width: probe?.width && probe.width > 0 ? probe.width : 1920,
      height: probe?.height && probe.height > 0 ? probe.height : 1080,
      size_mb: toSafeSizeMb(file.sizeBytes),
      cover_color: coverRecord?.coverColor ?? toDeterministicCoverColor(videoId),
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

  private async normalizeArchiveToZip(
    sourceFile: FileRecord,
    strategy: ArchiveNormalizationResult['strategy'],
  ): Promise<ArchiveNormalizationResult> {
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

      if (strategy === 'rar7z-to-zip-store') {
        await extractArchiveWith7z(sourceFile.absolutePath, tempExtractDir)
      } else {
        await extractZipWithPowerShell(sourceFile.absolutePath, tempExtractDir)
        await convertDirectoryImagesToWebp90(tempExtractDir)
      }

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
      try {
        const normalized = await this.normalizeArchiveToZip(file, 'rar7z-to-zip-store')
        const entries = await scanZipCentralEntries(normalized.normalizedArchivePath)
        const imageEntries = entries.filter((entry) => IMAGE_EXTENSIONS.has(entry.extension) && isSafeArchiveEntryName(entry.entryName))
        return {
          archivePathForMediaRead: normalized.normalizedArchivePath,
          imageEntries,
        }
      } catch (error) {
        console.warn('archive normalization failed (rar/7z)', {
          archivePath: file.absolutePath,
          reason: (error as Error).message,
        })
        return {
          archivePathForMediaRead: file.absolutePath,
          imageEntries: [],
        }
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
      const normalized = await this.normalizeArchiveToZip(file, 'zip-repack-webp90-store')
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

    this.archiveEntryIndexByPath.clear()
    this.zipEntryIndexByPath.clear()

    const imageDirectories = Array.from(directoryImageMap.entries())
      .map(([directoryPath, imageFiles]) => {
        imageFiles.sort((left, right) => left.relativePath.localeCompare(right.relativePath, 'zh-CN'))
        return this.createDirectorySource(directoryPath, imageFiles)
      })
      .sort((left, right) => left.absolute_path.localeCompare(right.absolute_path, 'zh-CN'))

    const imagePackages: ImagePackageDto[] = []
    for (const archive of archives) {
      const prepared = await this.prepareArchiveEntries(archive)
      const imageEntries = prepared.imageEntries.sort((left, right) => left.entryName.localeCompare(right.entryName, 'zh-CN'))

      this.archiveEntryIndexByPath.set(
        prepared.archivePathForMediaRead,
        new Set(imageEntries.map((entry) => entry.entryName)),
      )
      this.zipEntryIndexByPath.set(
        prepared.archivePathForMediaRead,
        new Map(imageEntries.map((entry) => [entry.entryName, entry])),
      )

      imagePackages.push(this.createArchiveSource(archive, imageEntries, prepared.archivePathForMediaRead))
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

  private async assertLocatorAllowed(locator: MediaLocatorDto): Promise<MediaLocatorDto> {
    if (locator.kind === 'filesystem') {
      const absolutePath = path.resolve(locator.absolute_path)
      if (!isPathInsideRoot(this.rootDir, absolutePath)) {
        throw new MediaAccessError('path_outside_root', `媒体访问被拒绝（越界）: ${absolutePath}`)
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
    if (!isPathInsideRoot(this.rootDir, archivePath)) {
      throw new MediaAccessError('path_outside_root', `压缩包媒体访问被拒绝（越界）: ${archivePath}`)
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

  private async captureVideoCoverImage(
    videoPath: string,
    videoId: string,
    timeSec: number,
  ): Promise<string | null> {
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

  async readLibrarySnapshot(): Promise<LibrarySnapshotDto> {
    return this.ensureSnapshotLoaded()
  }

  async readImageSidebarTree(
    request: ReadImageSidebarTreeRequestDto,
  ): Promise<ReadImageSidebarTreeResponseDto> {
    await this.ensureSnapshotLoaded()
    const filtered = this.filterSources(request)

    return readImageSidebarTreeResponseSchema.parse({
      image_packages: filtered.imagePackages,
      image_directories: filtered.imageDirectories,
      tree: buildImageSidebarTree(filtered.imagePackages, filtered.imageDirectories),
    })
  }

  async readImagePage(request: ReadImagePageRequestDto): Promise<ReadImagePageResponseDto> {
    await this.ensureSnapshotLoaded()
    const filtered = this.filterSources({
      feature_filter: request.feature_filter,
      grade_overrides: request.grade_overrides,
    })

    const allSources = [...filtered.imagePackages, ...filtered.imageDirectories]
    const selectedById = request.source_id ? allSources.find((source) => source.id === request.source_id) : null
    const selectedSource =
      selectedById ?? allSources.find((source) => source.images.length > 0) ?? allSources[0] ?? null

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
    const snapshot = await this.ensureSnapshotLoaded()
    const allSources = [...snapshot.image_packages, ...snapshot.image_directories]
    const source = allSources.find((item) => item.id === request.package_id)
    const image = source?.images[request.image_index]

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
    this.videoCoverOverridesByVideoId.set(video.id, {
      coverColor,
      coverImagePath,
      updatedAtMs,
    })
    this.database.writeVideoCover(video.id, coverColor, coverImagePath)

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
    return writePlaylistResponseSchema.parse({
      video_ids: nextVideoIds,
      updated_at_ms: Date.now(),
    })
  }

  async resolveMediaResource(
    request: ResolveMediaResourceRequestDto,
  ): Promise<ResolveMediaResourceResponseDto> {
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

    const locator = record.locator
    if (locator.kind === 'filesystem') {
      return this.readFilesystemMedia(locator, record.mimeType, rangeHeader)
    }

    return this.readArchiveEntryMedia(locator, record.mimeType)
  }
}
