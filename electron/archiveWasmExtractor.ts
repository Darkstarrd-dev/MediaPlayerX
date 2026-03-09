import { promises as fs } from 'node:fs'
import type { FileHandle } from 'node:fs/promises'
import path from 'node:path'

interface SevenZipModule {
  FS: {
    mkdir: (path: string) => void
    rmdir: (path: string) => void
    readdir: (path: string) => string[]
    stat: (path: string) => { mode: number }
    isDir: (mode: number) => boolean
    readFile: (path: string, opts?: unknown) => Uint8Array | string
    writeFile: (path: string, data: Uint8Array) => void
    unlink: (path: string) => void
    chdir: (path: string) => void
  }
  callMain: (args: string[]) => void
}

type SevenZipModuleFactory = (opts?: {
  print?: (value: string) => void
  printErr?: (value: string) => void
}) => Promise<SevenZipModule>

interface NodeUnrarArcFile {
  fileHeader: {
    name: string
    flags: {
      directory: boolean
    }
  }
  extraction?: Uint8Array
}

interface NodeUnrarExtractor {
  extract: () => {
    files: Generator<NodeUnrarArcFile>
  }
}

type NodeUnrarCreateExtractorFromData = (options: {
  data: ArrayBuffer
  password?: string
}) => Promise<NodeUnrarExtractor>

type SharpModule = typeof import('sharp')

interface ZipCentralRecord {
  nameBuffer: Buffer
  crc32: number
  size: number
  localHeaderOffset: number
}

interface ArchiveEntry {
  entryName: string
  data: Uint8Array
}

interface NormalizedArchiveResult {
  outputZipPath: string
  convertedEntryCount: number
  writtenEntryCount: number
}

export interface ArchiveWasmSupport {
  rar: boolean
  sevenZip: boolean
}

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.tif', '.tiff', '.webp'])
const WEBP_EXTENSION = '.webp'
const ZIP_SIGNATURE_LOCAL_FILE = 0x04034b50
const ZIP_SIGNATURE_CENTRAL_FILE = 0x02014b50
const ZIP_SIGNATURE_EOCD = 0x06054b50
const ZIP_FLAG_UTF8 = 0x0800
const ZIP_METHOD_STORE = 0

let sevenZipFactoryPromise: Promise<SevenZipModuleFactory | null> | null = null
let sevenZipModulePromise: Promise<SevenZipModule> | null = null
let sevenZipWorkQueue: Promise<void> = Promise.resolve()
let nodeUnrarCreateExtractorPromise: Promise<NodeUnrarCreateExtractorFromData | null> | null = null
let sharpModulePromise: Promise<SharpModule | null> | null = null

function createCrc32Table(): Uint32Array {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let c = i
    for (let bit = 0; bit < 8; bit += 1) {
      c = (c & 1) !== 0 ? (0xedb88320 ^ (c >>> 1)) >>> 0 : (c >>> 1) >>> 0
    }
    table[i] = c >>> 0
  }
  return table
}

const CRC32_TABLE = createCrc32Table()

function crc32(buffer: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC32_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function normalizeRelativeArchivePath(rawEntryName: string): string | null {
  const normalized = rawEntryName
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')

  if (!normalized) {
    return null
  }

  const segments = normalized
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)

  if (segments.length === 0) {
    return null
  }

  if (
    segments.some(
      (segment) =>
        segment === '.' ||
        segment === '..' ||
        segment.includes('\u0000') ||
        segment.includes(':') ||
        segment.includes('*') ||
        segment.includes('?') ||
        segment.includes('<') ||
        segment.includes('>') ||
        segment.includes('|'),
    )
  ) {
    return null
  }

  return segments.join('/')
}

function makeUniqueEntryName(entryName: string, seen: Set<string>): string {
  if (!seen.has(entryName)) {
    seen.add(entryName)
    return entryName
  }

  const extension = path.posix.extname(entryName)
  const baseName = extension ? entryName.slice(0, -extension.length) : entryName
  let ordinal = 2
  while (true) {
    const candidate = `${baseName}__dup${ordinal}${extension}`
    if (!seen.has(candidate)) {
      seen.add(candidate)
      return candidate
    }
    ordinal += 1
  }
}

function createTempZipPath(finalZipPath: string): string {
  const token = `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 10)}`
  return `${finalZipPath}.mpx-normalizing-${token}.tmp`
}

function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  const start = view.byteOffset
  const end = view.byteOffset + view.byteLength
  return view.buffer.slice(start, end)
}

async function pathExists(targetPath: string): Promise<boolean> {
  const stat = await fs.stat(targetPath).catch(() => null)
  return Boolean(stat)
}

async function getSharpModule(): Promise<SharpModule | null> {
  if (!sharpModulePromise) {
    sharpModulePromise = import('sharp').catch(() => null)
  }
  return sharpModulePromise
}

async function resolveSevenZipFactory(): Promise<SevenZipModuleFactory | null> {
  if (!sevenZipFactoryPromise) {
    sevenZipFactoryPromise = import('7z-wasm')
      .then((module) => {
        const candidate = (module as { default?: unknown }).default ?? module
        return typeof candidate === 'function' ? (candidate as SevenZipModuleFactory) : null
      })
      .catch(() => null)
  }

  return sevenZipFactoryPromise
}

async function resolveNodeUnrarCreateExtractorFromData(): Promise<NodeUnrarCreateExtractorFromData | null> {
  if (!nodeUnrarCreateExtractorPromise) {
    nodeUnrarCreateExtractorPromise = import('node-unrar-js')
      .then((module) => {
        const direct = (module as { createExtractorFromData?: unknown }).createExtractorFromData
        if (typeof direct === 'function') {
          return direct as NodeUnrarCreateExtractorFromData
        }

        const fallback = (module as { default?: { createExtractorFromData?: unknown } }).default?.createExtractorFromData
        return typeof fallback === 'function' ? (fallback as NodeUnrarCreateExtractorFromData) : null
      })
      .catch(() => null)
  }

  return nodeUnrarCreateExtractorPromise
}

async function ensureSevenZipModule(): Promise<SevenZipModule> {
  if (!sevenZipModulePromise) {
    sevenZipModulePromise = resolveSevenZipFactory()
      .then(async (factory) => {
        if (!factory) {
          throw new Error('7z-wasm unavailable')
        }

        return await factory({
          print: () => {
            // suppress noisy output
          },
          printErr: () => {
            // suppress noisy output
          },
        })
      })
      .catch((error) => {
        sevenZipModulePromise = null
        throw error
      })
  }

  return await sevenZipModulePromise
}

async function runSevenZipExclusive<T>(work: () => Promise<T>): Promise<T> {
  const task = sevenZipWorkQueue.then(work, work)
  sevenZipWorkQueue = task.then(
    () => undefined,
    () => undefined,
  )
  return await task
}

async function maybeConvertEntryToWebp(entry: ArchiveEntry, webpQuality: number): Promise<ArchiveEntry | null> {
  const extension = path.posix.extname(entry.entryName).toLowerCase()
  if (!IMAGE_EXTENSIONS.has(extension)) {
    return entry
  }

  if (extension === WEBP_EXTENSION) {
    return entry
  }

  const sharpModule = await getSharpModule()
  if (!sharpModule?.default) {
    throw new Error('sharp unavailable for archive image conversion')
  }

  try {
    const converted = await sharpModule
      .default(Buffer.from(entry.data), {
        animated: true,
      })
      .webp({ quality: webpQuality })
      .toBuffer()

    const nextName = `${entry.entryName.slice(0, -extension.length)}${WEBP_EXTENSION}`
    return {
      entryName: nextName,
      data: converted,
    }
  } catch {
    return null
  }
}

class ZipStoreWriter {
  private readonly outputZipPath: string

  private readonly handle: FileHandle

  private cursor = 0

  private closed = false

  private readonly centralRecords: ZipCentralRecord[] = []

  private constructor(outputZipPath: string, handle: FileHandle) {
    this.outputZipPath = outputZipPath
    this.handle = handle
  }

  static async create(outputZipPath: string): Promise<ZipStoreWriter> {
    const parentDir = path.dirname(outputZipPath)
    if (parentDir !== path.parse(parentDir).root) {
      await fs.mkdir(parentDir, { recursive: true })
    }
    const handle = await fs.open(outputZipPath, 'w')
    return new ZipStoreWriter(outputZipPath, handle)
  }

  private async writeBuffer(buffer: Buffer): Promise<void> {
    await this.handle.write(buffer, 0, buffer.length, this.cursor)
    this.cursor += buffer.length
  }

  async addEntry(entryName: string, data: Uint8Array): Promise<void> {
    if (this.closed) {
      throw new Error('zip writer already closed')
    }

    const nameBuffer = Buffer.from(entryName, 'utf8')
    const payload = Buffer.from(data)
    const checksum = crc32(payload)
    const localHeaderOffset = this.cursor

    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(ZIP_SIGNATURE_LOCAL_FILE, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(ZIP_FLAG_UTF8, 6)
    localHeader.writeUInt16LE(ZIP_METHOD_STORE, 8)
    localHeader.writeUInt16LE(0, 10)
    localHeader.writeUInt16LE(0, 12)
    localHeader.writeUInt32LE(checksum >>> 0, 14)
    localHeader.writeUInt32LE(payload.length >>> 0, 18)
    localHeader.writeUInt32LE(payload.length >>> 0, 22)
    localHeader.writeUInt16LE(nameBuffer.length, 26)
    localHeader.writeUInt16LE(0, 28)

    await this.writeBuffer(localHeader)
    await this.writeBuffer(nameBuffer)
    await this.writeBuffer(payload)

    this.centralRecords.push({
      nameBuffer,
      crc32: checksum >>> 0,
      size: payload.length,
      localHeaderOffset,
    })
  }

  async finalize(): Promise<void> {
    if (this.closed) {
      return
    }

    const centralStartOffset = this.cursor
    for (const record of this.centralRecords) {
      const centralHeader = Buffer.alloc(46)
      centralHeader.writeUInt32LE(ZIP_SIGNATURE_CENTRAL_FILE, 0)
      centralHeader.writeUInt16LE(20, 4)
      centralHeader.writeUInt16LE(20, 6)
      centralHeader.writeUInt16LE(ZIP_FLAG_UTF8, 8)
      centralHeader.writeUInt16LE(ZIP_METHOD_STORE, 10)
      centralHeader.writeUInt16LE(0, 12)
      centralHeader.writeUInt16LE(0, 14)
      centralHeader.writeUInt32LE(record.crc32 >>> 0, 16)
      centralHeader.writeUInt32LE(record.size >>> 0, 20)
      centralHeader.writeUInt32LE(record.size >>> 0, 24)
      centralHeader.writeUInt16LE(record.nameBuffer.length, 28)
      centralHeader.writeUInt16LE(0, 30)
      centralHeader.writeUInt16LE(0, 32)
      centralHeader.writeUInt16LE(0, 34)
      centralHeader.writeUInt16LE(0, 36)
      centralHeader.writeUInt32LE(0, 38)
      centralHeader.writeUInt32LE(record.localHeaderOffset >>> 0, 42)

      await this.writeBuffer(centralHeader)
      await this.writeBuffer(record.nameBuffer)
    }

    const centralSize = this.cursor - centralStartOffset
    const eocd = Buffer.alloc(22)
    eocd.writeUInt32LE(ZIP_SIGNATURE_EOCD, 0)
    eocd.writeUInt16LE(0, 4)
    eocd.writeUInt16LE(0, 6)
    eocd.writeUInt16LE(this.centralRecords.length, 8)
    eocd.writeUInt16LE(this.centralRecords.length, 10)
    eocd.writeUInt32LE(centralSize >>> 0, 12)
    eocd.writeUInt32LE(centralStartOffset >>> 0, 16)
    eocd.writeUInt16LE(0, 20)
    await this.writeBuffer(eocd)

    this.closed = true
    await this.handle.close()
  }

  async abort(): Promise<void> {
    if (!this.closed) {
      this.closed = true
      await this.handle.close().catch(() => undefined)
    }
    await fs.rm(this.outputZipPath, { force: true }).catch(() => undefined)
  }
}

function collectVirtualFilePaths(module: SevenZipModule, rootDir: string): string[] {
  const files: string[] = []
  const queue = [rootDir]

  while (queue.length > 0) {
    const current = queue.pop()
    if (!current) {
      continue
    }

    const entries = module.FS.readdir(current).filter((name) => name !== '.' && name !== '..')
    for (const entryName of entries) {
      const nextPath = `${current}/${entryName}`
      const stat = module.FS.stat(nextPath)
      if (module.FS.isDir(stat.mode)) {
        queue.push(nextPath)
      } else {
        files.push(nextPath)
      }
    }
  }

  return files
}

function removeVirtualTree(module: SevenZipModule, targetPath: string): void {
  const entries = module.FS.readdir(targetPath).filter((name) => name !== '.' && name !== '..')
  for (const entryName of entries) {
    const nextPath = `${targetPath}/${entryName}`
    const stat = module.FS.stat(nextPath)
    if (module.FS.isDir(stat.mode)) {
      removeVirtualTree(module, nextPath)
      try {
        module.FS.rmdir(nextPath)
      } catch {
        // ignore
      }
    } else {
      try {
        module.FS.unlink(nextPath)
      } catch {
        // ignore
      }
    }
  }
}

async function normalizeFromSevenZipArchive(
  sourceArchivePath: string,
  writer: ZipStoreWriter,
  webpQuality: number,
): Promise<{ convertedEntryCount: number; writtenEntryCount: number }> {
  return await runSevenZipExclusive(async () => {
    const module = await ensureSevenZipModule()
    const token = `${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 10)}`
    const virtualArchivePath = `/mpx-archive-${token}${path.extname(sourceArchivePath).toLowerCase()}`
    const virtualOutDir = `/mpx-out-${token}`
    const seenEntryNames = new Set<string>()
    let convertedEntryCount = 0
    let writtenEntryCount = 0

    try {
      const archiveBytes = await fs.readFile(sourceArchivePath)
      module.FS.chdir('/')
      module.FS.writeFile(virtualArchivePath, archiveBytes)
      module.FS.mkdir(virtualOutDir)
      module.callMain(['x', virtualArchivePath, '-y', '-bd', '-bb0', `-o${virtualOutDir}`])

      const virtualFiles = collectVirtualFilePaths(module, virtualOutDir)
      for (const virtualFilePath of virtualFiles) {
        const relativePath = path.posix.relative(virtualOutDir, virtualFilePath)
        const normalizedEntryName = normalizeRelativeArchivePath(relativePath)
        if (!normalizedEntryName) {
          continue
        }

        const rawData = module.FS.readFile(virtualFilePath) as Uint8Array
        const convertedEntry = await maybeConvertEntryToWebp(
          {
            entryName: normalizedEntryName,
            data: rawData,
          },
          webpQuality,
        )

        if (!convertedEntry) {
          continue
        }

        if (convertedEntry.entryName !== normalizedEntryName) {
          convertedEntryCount += 1
        }

        const uniqueEntryName = makeUniqueEntryName(convertedEntry.entryName, seenEntryNames)
        await writer.addEntry(uniqueEntryName, convertedEntry.data)
        writtenEntryCount += 1
      }
    } finally {
      try {
        removeVirtualTree(module, virtualOutDir)
      } catch {
        // ignore
      }
      try {
        module.FS.rmdir(virtualOutDir)
      } catch {
        // ignore
      }
      try {
        module.FS.unlink(virtualArchivePath)
      } catch {
        // ignore
      }
      try {
        module.FS.chdir('/')
      } catch {
        // ignore
      }
    }

    return {
      convertedEntryCount,
      writtenEntryCount,
    }
  })
}

async function normalizeFromRarArchive(
  sourceArchivePath: string,
  writer: ZipStoreWriter,
  webpQuality: number,
): Promise<{ convertedEntryCount: number; writtenEntryCount: number }> {
  const createExtractorFromData = await resolveNodeUnrarCreateExtractorFromData()
  if (!createExtractorFromData) {
    throw new Error('node-unrar-js unavailable')
  }

  const archiveBuffer = await fs.readFile(sourceArchivePath)
  const extractor = await createExtractorFromData({
    data: toArrayBuffer(archiveBuffer),
  })

  const extracted = extractor.extract()
  const seenEntryNames = new Set<string>()
  let convertedEntryCount = 0
  let writtenEntryCount = 0

  for (const file of extracted.files) {
    if (file.fileHeader.flags.directory) {
      continue
    }

    const normalizedEntryName = normalizeRelativeArchivePath(file.fileHeader.name)
    if (!normalizedEntryName) {
      continue
    }

    const rawExtraction = file.extraction
    if (!rawExtraction) {
      continue
    }

    const convertedEntry = await maybeConvertEntryToWebp(
      {
        entryName: normalizedEntryName,
        data: rawExtraction,
      },
      webpQuality,
    )

    if (!convertedEntry) {
      continue
    }

    if (convertedEntry.entryName !== normalizedEntryName) {
      convertedEntryCount += 1
    }

    const uniqueEntryName = makeUniqueEntryName(convertedEntry.entryName, seenEntryNames)
    await writer.addEntry(uniqueEntryName, convertedEntry.data)
    writtenEntryCount += 1
  }

  return {
    convertedEntryCount,
    writtenEntryCount,
  }
}

async function replaceArchiveWithNormalizedZip(
  sourceArchivePath: string,
  tempZipPath: string,
  finalZipPath: string,
): Promise<void> {
  const tempStat = await fs.stat(tempZipPath).catch(() => null)
  if (!tempStat?.isFile() || tempStat.size <= 0) {
    throw new Error(`normalized zip not ready: ${tempZipPath}`)
  }

  const finalExists = await pathExists(finalZipPath)
  const backupPath = `${finalZipPath}.mpx-backup-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`
  let hasBackup = false

  try {
    if (finalExists) {
      await fs.rename(finalZipPath, backupPath)
      hasBackup = true
    }

    await fs.rename(tempZipPath, finalZipPath)

    const finalStat = await fs.stat(finalZipPath)
    if (!finalStat.isFile() || finalStat.size <= 0) {
      throw new Error(`normalized zip verify failed: ${finalZipPath}`)
    }

    await fs.rm(sourceArchivePath, { force: true })
    if (hasBackup) {
      await fs.rm(backupPath, { force: true })
    }
  } catch (error) {
    await fs.rm(tempZipPath, { force: true }).catch(() => undefined)
    if (hasBackup) {
      const finalStillExists = await pathExists(finalZipPath)
      if (!finalStillExists) {
        await fs.rename(backupPath, finalZipPath).catch(() => undefined)
      } else {
        await fs.rm(backupPath, { force: true }).catch(() => undefined)
      }
    }
    throw error
  }
}

async function normalizeArchiveToStoreZipInternal(
  sourceArchivePath: string,
  options?: {
    webpQuality?: number
  },
): Promise<NormalizedArchiveResult> {
  const resolvedSourcePath = path.resolve(sourceArchivePath)
  const extension = path.extname(resolvedSourcePath).toLowerCase()
  if (extension !== '.rar' && extension !== '.7z') {
    throw new Error(`unsupported archive format: ${extension}`)
  }

  const webpQuality = Number.isFinite(options?.webpQuality)
    ? Math.max(50, Math.min(95, Math.round(options?.webpQuality ?? 90)))
    : 90
  const outputZipPath = resolveArchiveReplacementZipPath(resolvedSourcePath)
  const tempZipPath = createTempZipPath(outputZipPath)
  const writer = await ZipStoreWriter.create(tempZipPath)

  try {
    const normalized =
      extension === '.rar'
        ? await normalizeFromRarArchive(resolvedSourcePath, writer, webpQuality)
        : await normalizeFromSevenZipArchive(resolvedSourcePath, writer, webpQuality)

    if (normalized.writtenEntryCount <= 0) {
      throw new Error(`archive normalize produced no entries: ${resolvedSourcePath}`)
    }

    await writer.finalize()
    await replaceArchiveWithNormalizedZip(resolvedSourcePath, tempZipPath, outputZipPath)

    return {
      outputZipPath,
      convertedEntryCount: normalized.convertedEntryCount,
      writtenEntryCount: normalized.writtenEntryCount,
    }
  } catch (error) {
    await writer.abort()
    throw error
  }
}

export function resolveArchiveReplacementZipPath(sourceArchivePath: string): string {
  const resolvedSourcePath = path.resolve(sourceArchivePath)
  const extension = path.extname(resolvedSourcePath)
  const baseName = path.basename(resolvedSourcePath, extension)
  return path.join(path.dirname(resolvedSourcePath), `${baseName}.zip`)
}

export async function readArchiveWasmSupport(): Promise<ArchiveWasmSupport> {
  const [sevenZipFactory, nodeUnrarCreateExtractorFromData, sharpModule] = await Promise.all([
    resolveSevenZipFactory(),
    resolveNodeUnrarCreateExtractorFromData(),
    getSharpModule(),
  ])

  const hasSharp = Boolean(sharpModule?.default)
  const sevenZip = hasSharp && Boolean(sevenZipFactory)
  return {
    sevenZip,
    rar: hasSharp && (Boolean(nodeUnrarCreateExtractorFromData) || sevenZip),
  }
}

export async function normalizeArchiveToStoreZipInPlace(
  sourceArchivePath: string,
  options?: {
    webpQuality?: number
  },
): Promise<NormalizedArchiveResult> {
  return await normalizeArchiveToStoreZipInternal(sourceArchivePath, options)
}
