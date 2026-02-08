#!/usr/bin/env node

import { fork, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { monitorEventLoopDelay, performance } from 'node:perf_hooks'
import path from 'node:path'
import process from 'node:process'
import { promises as fs } from 'node:fs'
import { Worker } from 'node:worker_threads'
import { inflateRawSync } from 'node:zlib'

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'])
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mkv', '.mov'])
const ARCHIVE_EXTENSIONS = new Set(['.zip', '.rar', '.7z'])

const ZIP_END_OF_CENTRAL_DIR_SIGNATURE = 0x06054b50
const ZIP_CENTRAL_FILE_HEADER_SIGNATURE = 0x02014b50
const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50
const ZIP_GENERAL_PURPOSE_FLAG_UTF8 = 0x0800
const ZIP_GENERAL_PURPOSE_FLAG_ENCRYPTED = 0x0001
const ZIP_COMPRESSION_STORE = 0
const ZIP_COMPRESSION_DEFLATE = 8
const ZIP_MAX_COMMENT_LENGTH = 0xffff
const ZIP_SCAN_TAIL_PADDING = 128

function parseArgs(argv) {
  const args = {}
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) {
      continue
    }

    const key = token.slice(2)
    const next = argv[index + 1]
    if (!next || next.startsWith('--')) {
      args[key] = true
      continue
    }

    args[key] = next
    index += 1
  }
  return args
}

function toPosix(value) {
  return value.split(path.sep).join('/')
}

function toStableId(prefix, rawValue) {
  const hash = createHash('sha1').update(rawValue).digest('hex').slice(0, 12)
  return `${prefix}-${hash}`
}

function formatMs(value) {
  if (!Number.isFinite(value) || value < 0) {
    return null
  }
  return Number(value.toFixed(2))
}

function formatNumber(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return null
  }
  return Number(value.toFixed(digits))
}

function resolveNumber(rawValue, fallback) {
  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }
  return parsed
}

function decodeZipEntryName(bytes, utf8) {
  return utf8 ? bytes.toString('utf8') : bytes.toString('latin1')
}

function normalizeArchiveEntryName(value) {
  return value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '')
}

function isSafeArchiveEntryName(value) {
  if (!value || value.includes('\u0000')) {
    return false
  }
  if (value.startsWith('/') || value.startsWith('\\')) {
    return false
  }
  if (/^[a-zA-Z]:/.test(value)) {
    return false
  }

  return value.split('/').every((segment) => segment !== '..')
}

function findSignatureBackward(buffer, signature) {
  for (let index = buffer.length - 4; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === signature) {
      return index
    }
  }
  return -1
}

async function scanZipCentralEntries(archivePath) {
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

    const eocdIndex = findSignatureBackward(tailBuffer, ZIP_END_OF_CENTRAL_DIR_SIGNATURE)
    if (eocdIndex < 0) {
      return []
    }

    const centralSize = tailBuffer.readUInt32LE(eocdIndex + 12)
    const centralOffset = tailBuffer.readUInt32LE(eocdIndex + 16)
    if (centralSize === 0xffffffff || centralOffset === 0xffffffff) {
      return []
    }
    if (centralOffset + centralSize > stat.size) {
      return []
    }

    const centralBuffer = Buffer.alloc(centralSize)
    await handle.read(centralBuffer, 0, centralSize, centralOffset)

    const entries = []
    let cursor = 0
    while (cursor + 46 <= centralBuffer.length) {
      const signature = centralBuffer.readUInt32LE(cursor)
      if (signature !== ZIP_CENTRAL_FILE_HEADER_SIGNATURE) {
        break
      }

      const generalPurposeBitFlag = centralBuffer.readUInt16LE(cursor + 8)
      const compressionMethod = centralBuffer.readUInt16LE(cursor + 10)
      const compressedSize = centralBuffer.readUInt32LE(cursor + 20)
      const fileNameLength = centralBuffer.readUInt16LE(cursor + 28)
      const extraLength = centralBuffer.readUInt16LE(cursor + 30)
      const commentLength = centralBuffer.readUInt16LE(cursor + 32)
      const localHeaderOffset = centralBuffer.readUInt32LE(cursor + 42)

      const fileNameStart = cursor + 46
      const fileNameEnd = fileNameStart + fileNameLength
      if (fileNameEnd > centralBuffer.length) {
        break
      }

      const fileName = decodeZipEntryName(
        centralBuffer.subarray(fileNameStart, fileNameEnd),
        (generalPurposeBitFlag & ZIP_GENERAL_PURPOSE_FLAG_UTF8) !== 0,
      )
      const entryName = normalizeArchiveEntryName(fileName)

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

async function readZipEntryContent(archivePath, entry) {
  const handle = await fs.open(archivePath, 'r')
  try {
    const localHeader = Buffer.alloc(30)
    const { bytesRead } = await handle.read(localHeader, 0, localHeader.length, entry.localHeaderOffset)
    if (bytesRead < localHeader.length || localHeader.readUInt32LE(0) !== ZIP_LOCAL_FILE_HEADER_SIGNATURE) {
      throw new Error('zip_local_header_invalid')
    }

    const localFileNameLength = localHeader.readUInt16LE(26)
    const localExtraLength = localHeader.readUInt16LE(28)
    const dataOffset = entry.localHeaderOffset + 30 + localFileNameLength + localExtraLength
    const compressedBuffer = Buffer.alloc(entry.compressedSize)
    const read = await handle.read(compressedBuffer, 0, compressedBuffer.length, dataOffset)
    if (read.bytesRead < compressedBuffer.length) {
      throw new Error('zip_entry_read_incomplete')
    }

    if ((entry.generalPurposeBitFlag & ZIP_GENERAL_PURPOSE_FLAG_ENCRYPTED) !== 0) {
      throw new Error('zip_entry_encrypted')
    }

    if (entry.compressionMethod === ZIP_COMPRESSION_STORE) {
      return compressedBuffer
    }
    if (entry.compressionMethod === ZIP_COMPRESSION_DEFLATE) {
      return inflateRawSync(compressedBuffer)
    }
    throw new Error('zip_entry_compression_unsupported')
  } finally {
    await handle.close()
  }
}

async function runProcess(command, args, timeoutMs = 120_000) {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })

    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(`process_timeout:${command}`))
    }, timeoutMs)

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk)
    })
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })

    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })

    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) {
        reject(new Error(stderr.trim() || `process_exit_${code}:${command}`))
        return
      }
      resolve({ stdout, stderr })
    })
  })
}

async function probeVideoMetadata(videoPath, ffprobeBin) {
  const result = await runProcess(
    ffprobeBin,
    ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', videoPath],
    60_000,
  )
  const parsed = JSON.parse(result.stdout)
  const videoStream = Array.isArray(parsed.streams)
    ? parsed.streams.find((stream) => stream.codec_type === 'video') ?? parsed.streams[0]
    : null
  const width = Number(videoStream?.width ?? 0)
  const height = Number(videoStream?.height ?? 0)
  const duration = Number(parsed.format?.duration ?? videoStream?.duration ?? 0)
  return {
    width: Number.isFinite(width) && width > 0 ? width : 0,
    height: Number.isFinite(height) && height > 0 ? height : 0,
    durationSec: Number.isFinite(duration) && duration > 0 ? duration : 0,
  }
}

class PriorityQueue {
  constructor(concurrency) {
    this.concurrency = Math.max(1, Math.floor(concurrency))
    this.pending = []
    this.active = 0
    this.running = false
    this.idleResolvers = []
  }

  push(task, priority = 0) {
    this.pending.push({ task, priority })
    this.pending.sort((a, b) => b.priority - a.priority)
    this.#drain()
  }

  async onIdle() {
    if (this.pending.length === 0 && this.active === 0) {
      return
    }

    await new Promise((resolve) => {
      this.idleResolvers.push(resolve)
    })
  }

  #notifyIdleIfNeeded() {
    if (this.pending.length > 0 || this.active > 0) {
      return
    }

    const resolvers = this.idleResolvers.splice(0, this.idleResolvers.length)
    for (const resolver of resolvers) {
      resolver()
    }
  }

  #drain() {
    if (this.running) {
      return
    }
    this.running = true

    queueMicrotask(async () => {
      try {
        while (this.active < this.concurrency && this.pending.length > 0) {
          const current = this.pending.shift()
          if (!current) {
            break
          }

          this.active += 1
          Promise.resolve()
            .then(() => current.task())
            .catch(() => undefined)
            .finally(() => {
              this.active -= 1
              this.#notifyIdleIfNeeded()
              this.#drain()
            })
        }
      } finally {
        this.running = false
      }
    })
  }
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true })
}

async function createDbLayerAsync(dbPath) {
  try {
    const sqlite = await import('node:sqlite')
    const { DatabaseSync } = sqlite
    const db = new DatabaseSync(dbPath)
    db.exec(`
      CREATE TABLE IF NOT EXISTS package_item (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        absolute_path TEXT NOT NULL,
        status TEXT NOT NULL,
        discovered_at_ms INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS image_item (
        id TEXT PRIMARY KEY,
        package_id TEXT NOT NULL,
        source_kind TEXT NOT NULL,
        source_path TEXT NOT NULL,
        archive_entry_name TEXT,
        thumb_path TEXT,
        status TEXT NOT NULL,
        ordinal INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_image_pkg_ordinal ON image_item(package_id, ordinal);
      CREATE TABLE IF NOT EXISTS video_item (
        id TEXT PRIMARY KEY,
        absolute_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        duration_sec REAL,
        width INTEGER,
        height INTEGER,
        status TEXT NOT NULL,
        discovered_at_ms INTEGER NOT NULL,
        updated_at_ms INTEGER NOT NULL
      );
    `)

    const insertPackageStmt = db.prepare(
      'INSERT OR REPLACE INTO package_item(id,kind,absolute_path,status,discovered_at_ms) VALUES(?,?,?,?,?)',
    )
    const insertImageStmt = db.prepare(
      'INSERT OR REPLACE INTO image_item(id,package_id,source_kind,source_path,archive_entry_name,thumb_path,status,ordinal) VALUES(?,?,?,?,?,?,?,?)',
    )
    const updateImageThumbStmt = db.prepare('UPDATE image_item SET thumb_path = ?, status = ? WHERE id = ?')
    const insertVideoStmt = db.prepare(
      'INSERT OR REPLACE INTO video_item(id,absolute_path,file_name,duration_sec,width,height,status,discovered_at_ms,updated_at_ms) VALUES(?,?,?,?,?,?,?,?,?)',
    )
    const updateVideoMetaStmt = db.prepare(
      'UPDATE video_item SET duration_sec = ?, width = ?, height = ?, status = ?, updated_at_ms = ? WHERE id = ?',
    )

    return {
      enabled: true,
      strategy: 'sqlite',
      insertPackage: (item) => insertPackageStmt.run(item.id, item.kind, item.absolutePath, item.status, item.discoveredAtMs),
      insertImage: (item) =>
        insertImageStmt.run(
          item.id,
          item.packageId,
          item.sourceKind,
          item.sourcePath,
          item.archiveEntryName,
          item.thumbPath,
          item.status,
          item.ordinal,
        ),
      updateImageThumb: (item) => updateImageThumbStmt.run(item.thumbPath, item.status, item.id),
      insertVideo: (item) =>
        insertVideoStmt.run(
          item.id,
          item.absolutePath,
          item.fileName,
          item.durationSec,
          item.width,
          item.height,
          item.status,
          item.discoveredAtMs,
          item.updatedAtMs,
        ),
      updateVideoMeta: (item) =>
        updateVideoMetaStmt.run(item.durationSec, item.width, item.height, item.status, item.updatedAtMs, item.id),
      flush: async () => undefined,
      dispose: () => db.close(),
    }
  } catch {
    return {
      enabled: false,
      strategy: 'sqlite',
      insertPackage: () => undefined,
      insertImage: () => undefined,
      updateImageThumb: () => undefined,
      insertVideo: () => undefined,
      updateVideoMeta: () => undefined,
      flush: async () => undefined,
      dispose: () => undefined,
    }
  }
}

async function createBetterSqliteWorkerDbLayer(dbPath) {
  const workerUrl = new URL('./benchmark-db-worker.mjs', import.meta.url)
  const worker = new Worker(workerUrl, {
    workerData: {
      dbPath,
    },
  })

  let requestId = 0
  const pendingRequests = new Map()
  let ready = false

  const rejectAll = (error) => {
    const requests = Array.from(pendingRequests.values())
    pendingRequests.clear()
    for (const request of requests) {
      request.reject(error)
    }
  }

  worker.on('message', (message) => {
    if (!message || typeof message !== 'object') {
      return
    }

    if (message.type === 'ready') {
      ready = true
      const request = pendingRequests.get(0)
      if (request) {
        pendingRequests.delete(0)
        request.resolve(undefined)
      }
      return
    }

    if (message.type === 'response' && typeof message.requestId === 'number') {
      const request = pendingRequests.get(message.requestId)
      if (!request) {
        return
      }
      pendingRequests.delete(message.requestId)
      if (message.ok) {
        request.resolve(message.payload)
      } else {
        request.reject(new Error(message.error ?? 'db_worker_request_failed'))
      }
      return
    }
  })

  worker.on('error', (error) => {
    rejectAll(error)
  })

  const callWorker = (type, payload) => {
    requestId += 1
    const currentRequestId = requestId
    return new Promise((resolve, reject) => {
      pendingRequests.set(currentRequestId, { resolve, reject })
      worker.postMessage({
        type,
        requestId: currentRequestId,
        payload,
      })
    })
  }

  const waitReady = async () => {
    if (ready) {
      return
    }
    await new Promise((resolve, reject) => {
      pendingRequests.set(0, { resolve, reject })
    })
  }

  await waitReady()

  const postWrite = (type, payload) => {
    worker.postMessage({ type, payload })
  }

  return {
    enabled: true,
    strategy: 'better-sqlite3-worker',
    insertPackage: (item) => postWrite('insertPackage', item),
    insertImage: (item) => postWrite('insertImage', item),
    updateImageThumb: (item) => postWrite('updateImageThumb', item),
    insertVideo: (item) => postWrite('insertVideo', item),
    updateVideoMeta: (item) => postWrite('updateVideoMeta', item),
    flush: async () => {
      await callWorker('flush')
    },
    dispose: async () => {
      try {
        await callWorker('close')
      } finally {
        await worker.terminate()
      }
    },
  }
}

function createMemoryDbLayer() {
  const packageStore = new Map()
  const imageStore = new Map()
  const videoStore = new Map()

  return {
    enabled: true,
    strategy: 'memory',
    insertPackage: (item) => packageStore.set(item.id, item),
    insertImage: (item) => imageStore.set(item.id, item),
    updateImageThumb: (item) => {
      const current = imageStore.get(item.id)
      if (!current) {
        return
      }
      imageStore.set(item.id, {
        ...current,
        thumbPath: item.thumbPath,
        status: item.status,
      })
    },
    insertVideo: (item) => videoStore.set(item.id, item),
    updateVideoMeta: (item) => {
      const current = videoStore.get(item.id)
      if (!current) {
        return
      }
      videoStore.set(item.id, {
        ...current,
        durationSec: item.durationSec,
        width: item.width,
        height: item.height,
        status: item.status,
        updatedAtMs: item.updatedAtMs,
      })
    },
    flush: async () => undefined,
    dispose: () => undefined,
  }
}

async function readDirEntriesByStrategy(dirPath, strategy) {
  if (strategy === 'opendir') {
    const entries = []
    const directory = await fs.opendir(dirPath)
    for await (const entry of directory) {
      entries.push(entry)
    }
    return entries
  }

  return await fs.readdir(dirPath, { withFileTypes: true })
}

function parsePowerShellLines(raw) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

async function scanZipEntriesWithPowerShell(archivePath) {
  const escapedArchivePath = archivePath.replace(/'/g, "''")
  const command = [
    "$ErrorActionPreference='Stop'",
    'Add-Type -AssemblyName System.IO.Compression.FileSystem',
    `$zip=[System.IO.Compression.ZipFile]::OpenRead('${escapedArchivePath}')`,
    'try { $zip.Entries | ForEach-Object { $_.FullName } } finally { $zip.Dispose() }',
  ].join('; ')

  const result = await runProcess('powershell.exe', ['-NoProfile', '-Command', command], 180_000)
  const entryNames = parsePowerShellLines(result.stdout)
  return entryNames
    .map((entryName) => normalizeArchiveEntryName(entryName))
    .filter((entryName) => entryName.length > 0 && !entryName.endsWith('/'))
    .map((entryName) => ({
      entryName,
      extension: path.extname(entryName).toLowerCase(),
      compressedSize: 0,
      compressionMethod: ZIP_COMPRESSION_STORE,
      generalPurposeBitFlag: 0,
      localHeaderOffset: 0,
    }))
}

async function scanZipEntriesWithNodeStreamZip(archivePath) {
  const module = await import('node-stream-zip')
  const StreamZip = module.default ?? module
  const zip = new StreamZip.async({
    file: archivePath,
    storeEntries: true,
  })

  try {
    const entries = await zip.entries()
    return Object.values(entries)
      .filter((entry) => !entry.isDirectory)
      .map((entry) => {
        const entryName = normalizeArchiveEntryName(String(entry.name ?? ''))
        return {
          entryName,
          extension: path.extname(entryName).toLowerCase(),
          compressedSize: Number(entry.compressedSize ?? 0),
          compressionMethod: Number(entry.method ?? ZIP_COMPRESSION_STORE),
          generalPurposeBitFlag: 0,
          localHeaderOffset: Number(entry.offset ?? 0),
        }
      })
      .filter((entry) => entry.entryName.length > 0 && !entry.entryName.endsWith('/'))
  } finally {
    await zip.close().catch(() => undefined)
  }
}

async function scanZipEntriesWithYauzl(archivePath) {
  const module = await import('yauzl')
  const yauzl = module.default ?? module

  const zipFile = await new Promise((resolve, reject) => {
    yauzl.open(archivePath, { lazyEntries: true, decodeStrings: false }, (error, handle) => {
      if (error || !handle) {
        reject(error ?? new Error('yauzl_open_failed'))
        return
      }
      resolve(handle)
    })
  })

  return await new Promise((resolve, reject) => {
    const entries = []

    zipFile.on('entry', (entry) => {
      const rawName = Buffer.isBuffer(entry.fileName) ? entry.fileName : Buffer.from(String(entry.fileName ?? ''), 'utf8')
      const entryName = normalizeArchiveEntryName(
        decodeZipEntryName(rawName, (entry.generalPurposeBitFlag & ZIP_GENERAL_PURPOSE_FLAG_UTF8) !== 0),
      )

      if (entryName.length > 0 && !entryName.endsWith('/')) {
        entries.push({
          entryName,
          extension: path.extname(entryName).toLowerCase(),
          compressedSize: Number(entry.compressedSize ?? 0),
          compressionMethod: Number(entry.compressionMethod ?? ZIP_COMPRESSION_STORE),
          generalPurposeBitFlag: Number(entry.generalPurposeBitFlag ?? 0),
          localHeaderOffset: Number(entry.relativeOffsetOfLocalHeader ?? 0),
        })
      }

      zipFile.readEntry()
    })

    zipFile.on('end', () => {
      zipFile.close()
      resolve(entries)
    })

    zipFile.on('error', (error) => {
      reject(error)
    })

    zipFile.readEntry()
  })
}

async function scanZipEntriesByStrategy(archivePath, strategy) {
  if (strategy === 'powershell') {
    return await scanZipEntriesWithPowerShell(archivePath)
  }

  if (strategy === 'node-stream-zip') {
    return await scanZipEntriesWithNodeStreamZip(archivePath)
  }

  if (strategy === 'yauzl') {
    return await scanZipEntriesWithYauzl(archivePath)
  }

  return await scanZipCentralEntries(archivePath)
}

async function runBackendWorker(config) {
  const send = (payload) => {
    if (process.send) {
      process.send({ ...payload, ts: Date.now() })
    }
  }

  const commandState = {
    requestedFocusPackageId: null,
  }

  process.on('message', (message) => {
    if (!message || typeof message !== 'object') {
      return
    }
    if (message.type === 'focus_package' && typeof message.packageId === 'string') {
      commandState.requestedFocusPackageId = message.packageId
    }
  })

  await ensureDir(config.stateRoot)
  const thumbsRoot = path.join(config.stateRoot, 'thumb-cache')
  const normalizedRoot = path.join(config.stateRoot, 'normalized-archives')
  const tempRoot = path.join(config.stateRoot, 'temp')
  await ensureDir(thumbsRoot)
  await ensureDir(normalizedRoot)
  await ensureDir(tempRoot)

  const db =
    config.dbStrategy === 'memory'
      ? createMemoryDbLayer()
      : config.dbStrategy === 'better-sqlite3-worker'
        ? await createBetterSqliteWorkerDbLayer(path.join(config.stateRoot, 'bench.sqlite'))
        : await createDbLayerAsync(path.join(config.stateRoot, 'bench.sqlite'))

  const progressTickIntervalMs = Math.max(50, Number(config.progressTickMs ?? 100))
  const progressTicker = setInterval(() => {
    send({
      type: 'progress_tick',
    })
  }, progressTickIntervalMs)

  const sharpModule = await import('sharp').catch(() => null)
  const sharp = sharpModule?.default ?? null

  const packages = new Map()
  const packageOrder = []
  const videos = []
  const zipPackages = []
  const rar7zPackages = []

  let fileCount = 0
  let zipEntryCount = 0
  let firstPageReady = false
  let firstVideoMetadataReady = false
  let focusPackageId = null
  const focusPageSize = Math.max(1, config.pageSize)

  const thumbnailDoneIds = new Set()
  const thumbnailQueuedIds = new Set()
  const thumbnailCountByPackageId = new Map()
  let totalThumbnailDone = 0
  let backgroundScheduleStarted = false
  const deferredBackgroundImages = []

  const thumbQueue = new PriorityQueue(config.thumbnailConcurrency)
  const videoQueue = new PriorityQueue(config.videoProbeConcurrency)
  const maintenanceQueue = new PriorityQueue(1)

  send({ type: 'run_started' })

  function upsertPackage(rawPath, kind) {
    const id = toStableId('pkg', rawPath)
    let current = packages.get(id)
    if (!current) {
      current = {
        id,
        kind,
        absolutePath: rawPath,
        images: [],
      }
      packages.set(id, current)
      packageOrder.push(id)
      db.insertPackage({
        id,
        kind,
        absolutePath: rawPath,
        status: 'ready',
        discoveredAtMs: Date.now(),
      })
      send({
        type: 'sidebar_item_discovered',
        itemKind: 'package',
        packageId: id,
        packageType: kind,
        absolutePath: rawPath,
      })
    }
    return current
  }

  function addImageToPackage(packageInfo, sourceKind, sourcePath, archiveEntryName) {
    const rawId = sourceKind === 'zip-entry' ? `${sourcePath}::${archiveEntryName}` : sourcePath
    const imageId = toStableId('img', rawId)
    if (packageInfo.images.some((item) => item.id === imageId)) {
      return
    }

    const image = {
      id: imageId,
      sourceKind,
      sourcePath,
      archiveEntryName,
      name: sourceKind === 'zip-entry' ? archiveEntryName : path.basename(sourcePath),
    }
    packageInfo.images.push(image)
  }

  function registerVideo(videoPath) {
    const id = toStableId('vid', videoPath)
    videos.push({ id, absolutePath: videoPath })
    db.insertVideo({
      id,
      absolutePath: videoPath,
      fileName: path.basename(videoPath),
      durationSec: null,
      width: null,
      height: null,
      status: 'placeholder',
      discoveredAtMs: Date.now(),
      updatedAtMs: Date.now(),
    })
    send({
      type: 'video_placeholder_ready',
      videoId: id,
      absolutePath: videoPath,
    })
  }

  async function runShallowScan() {
    const scanStart = performance.now()
    const queue = [config.root]

    while (queue.length > 0) {
      const batch = queue.splice(0, Math.max(1, config.scanConcurrency))
      const levelResults = await Promise.all(
        batch.map(async (dirPath) => {
          const entries = await readDirEntriesByStrategy(dirPath, config.fsStrategy).catch(() => [])
          return { dirPath, entries }
        }),
      )

      for (const level of levelResults) {
        for (const entry of level.entries) {
          const absolutePath = path.join(level.dirPath, entry.name)
          if (entry.isDirectory()) {
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

          fileCount += 1

          if (IMAGE_EXTENSIONS.has(extension)) {
            const packageInfo = upsertPackage(level.dirPath, 'directory')
            addImageToPackage(packageInfo, 'filesystem', absolutePath, null)
            continue
          }

          if (VIDEO_EXTENSIONS.has(extension)) {
            registerVideo(absolutePath)
            continue
          }

          const archivePackage = upsertPackage(absolutePath, extension === '.zip' ? 'zip' : 'rar7z')
          if (extension === '.zip') {
            zipPackages.push(archivePackage)
          } else {
            rar7zPackages.push(archivePackage)
          }
        }
      }
    }

    const scanElapsedMs = performance.now() - scanStart
    send({
      type: 'scan_finished',
      fileCount,
      scanElapsedMs,
      scanFilesPerSec: scanElapsedMs > 0 ? fileCount / (scanElapsedMs / 1000) : 0,
    })
    return {
      scanElapsedMs,
      scanFilesPerSec: scanElapsedMs > 0 ? fileCount / (scanElapsedMs / 1000) : 0,
    }
  }

  async function runZipNameScan() {
    const zipStart = performance.now()
    const queue = [...zipPackages]

    while (queue.length > 0) {
      const batch = queue.splice(0, Math.max(1, config.zipScanConcurrency))
      const results = await Promise.all(
        batch.map(async (pkg) => {
          const entries = await scanZipEntriesByStrategy(pkg.absolutePath, config.zipStrategy).catch(() => [])
          return { pkg, entries }
        }),
      )

      for (const result of results) {
        const imageEntries = result.entries.filter(
          (entry) => IMAGE_EXTENSIONS.has(entry.extension) && isSafeArchiveEntryName(entry.entryName),
        )
        zipEntryCount += imageEntries.length
        for (const entry of imageEntries) {
          addImageToPackage(result.pkg, 'zip-entry', result.pkg.absolutePath, entry.entryName)
        }
        send({
          type: 'zip_package_entries',
          packageId: result.pkg.id,
          count: imageEntries.length,
        })
      }
    }

    const zipElapsedMs = performance.now() - zipStart
    send({
      type: 'zip_scan_finished',
      zipEntryCount,
      zipElapsedMs,
      zipEntriesPerSec: zipElapsedMs > 0 ? zipEntryCount / (zipElapsedMs / 1000) : 0,
    })

    return {
      zipElapsedMs,
      zipEntriesPerSec: zipElapsedMs > 0 ? zipEntryCount / (zipElapsedMs / 1000) : 0,
    }
  }

  function scheduleVideoProbeTasks() {
    const ffprobeBin = process.env.MEDIA_PLAYERX_FFPROBE_BIN ?? 'ffprobe'
    const targetVideos = videos.slice(0, Math.max(1, config.videoProbeLimit))
    for (const video of targetVideos) {
      videoQueue.push(async () => {
        const metaStartAt = Date.now()
        const metadata = await probeVideoMetadata(video.absolutePath, ffprobeBin).catch(() => ({
          durationSec: 0,
          width: 0,
          height: 0,
        }))

        db.updateVideoMeta({
          id: video.id,
          durationSec: metadata.durationSec,
          width: metadata.width,
          height: metadata.height,
          status: 'ready',
          updatedAtMs: Date.now(),
        })

        if (!firstVideoMetadataReady) {
          firstVideoMetadataReady = true
        }

        send({
          type: 'video_metadata_ready',
          videoId: video.id,
          durationSec: metadata.durationSec,
          width: metadata.width,
          height: metadata.height,
          startedAtMs: metaStartAt,
        })
      }, 10)
    }
  }

  async function renderThumbnail(image) {
    if (!sharp) {
      return null
    }

    const thumbName = `${image.id}.webp`
    const outputPath = path.join(thumbsRoot, thumbName)

    if (image.sourceKind === 'filesystem') {
      await sharp(image.sourcePath)
        .resize({ width: 360, height: 360, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(outputPath)
      return outputPath
    }

    const entry = {
      entryName: image.archiveEntryName,
      extension: path.extname(image.archiveEntryName).toLowerCase(),
      compressedSize: 0,
      compressionMethod: ZIP_COMPRESSION_STORE,
      generalPurposeBitFlag: 0,
      localHeaderOffset: 0,
    }
    const allEntries = await scanZipCentralEntries(image.sourcePath)
    const matchedEntry = allEntries.find((item) => item.entryName === image.archiveEntryName)
    if (!matchedEntry) {
      return null
    }

    const raw = await readZipEntryContent(image.sourcePath, matchedEntry)
    await sharp(raw)
      .resize({ width: 360, height: 360, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(outputPath)
    return outputPath
  }

  function enqueueThumbnail(image, packageId, priority) {
    if (thumbnailQueuedIds.has(image.id) || thumbnailDoneIds.has(image.id)) {
      return
    }
    thumbnailQueuedIds.add(image.id)

    thumbQueue.push(async () => {
      const thumbPath = await renderThumbnail(image).catch(() => null)
      if (thumbPath) {
        db.updateImageThumb({
          id: image.id,
          thumbPath,
          status: 'ready',
        })
      }

      thumbnailDoneIds.add(image.id)
      totalThumbnailDone += 1

      const nextCount = (thumbnailCountByPackageId.get(packageId) ?? 0) + 1
      thumbnailCountByPackageId.set(packageId, nextCount)

      send({
        type: 'thumbnail_ready',
        packageId,
        imageId: image.id,
        thumbPath,
      })

      if (packageId === focusPackageId && !firstPageReady && nextCount >= focusPageSize) {
        firstPageReady = true
        send({
          type: 'first_page_ready',
          packageId,
          count: nextCount,
        })

        if (!backgroundScheduleStarted) {
          backgroundScheduleStarted = true
          const backgroundPriority = config.queuePolicy === 'Q2' ? 2 : 10
          for (const item of deferredBackgroundImages) {
            enqueueThumbnail(item.image, item.packageId, backgroundPriority)
          }
        }
      }
    }, priority)
  }

  function sortImages(images) {
    return [...images].sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))
  }

  function scheduleThumbnailTasks() {
    const allPackages = packageOrder
      .map((packageId) => packages.get(packageId))
      .filter((item) => item && item.images.length > 0)

    if (allPackages.length === 0) {
      return
    }

    focusPackageId = allPackages[0].id
    send({
      type: 'focus_selected',
      packageId: focusPackageId,
    })

    let backgroundScheduled = 0
    const focusCandidates = []
    for (const pkg of allPackages) {
      const images = sortImages(pkg.images)
      if (pkg.id !== focusPackageId) {
        focusCandidates.push({ packageId: pkg.id, imageCount: images.length })
      }

      for (let index = 0; index < images.length; index += 1) {
        const image = images[index]
        const imageOrdinal = index + 1
        db.insertImage({
          id: image.id,
          packageId: pkg.id,
          sourceKind: image.sourceKind,
          sourcePath: image.sourcePath,
          archiveEntryName: image.archiveEntryName,
          thumbPath: null,
          status: 'queued',
          ordinal: imageOrdinal,
        })

        if (pkg.id === focusPackageId && imageOrdinal <= focusPageSize) {
          enqueueThumbnail(image, pkg.id, 1000 - imageOrdinal)
          continue
        }

        if (backgroundScheduled >= config.backgroundThumbLimit) {
          continue
        }

        backgroundScheduled += 1
        deferredBackgroundImages.push({ image, packageId: pkg.id })
      }
    }

    send({
      type: 'focus_candidates',
      candidates: focusCandidates,
    })

    if (config.queuePolicy === 'Q2' && !backgroundScheduleStarted) {
      backgroundScheduleStarted = true
      for (const item of deferredBackgroundImages) {
        enqueueThumbnail(item.image, item.packageId, 2)
      }
    }
  }

  function maybeApplyFocusRequest() {
    const requested = commandState.requestedFocusPackageId
    if (!requested || requested === focusPackageId) {
      return
    }

    const target = packages.get(requested)
    if (!target || target.images.length === 0) {
      return
    }

    focusPackageId = requested
    commandState.requestedFocusPackageId = null
    send({ type: 'focus_applied', packageId: requested })

    const images = sortImages(target.images).slice(0, focusPageSize)
    for (let index = 0; index < images.length; index += 1) {
      enqueueThumbnail(images[index], requested, 2000 - index)
    }
  }

  async function runMaintenanceTasks() {
    if (!config.enableMaintenance) {
      return {
        maintenanceCount: 0,
        maintenanceElapsedMs: 0,
      }
    }

    const start = performance.now()
    const tasks = rar7zPackages.slice(0, Math.max(0, config.maintenanceLimit))
    if (tasks.length === 0) {
      return {
        maintenanceCount: 0,
        maintenanceElapsedMs: 0,
      }
    }

    const sevenZipBin = process.env.MEDIA_PLAYERX_ARCHIVE_EXTRACTOR_BIN ?? '7z'
    for (const task of tasks) {
      maintenanceQueue.push(async () => {
        const startedAt = Date.now()
        let status = 'ok'
        let durationMs = 0
        try {
          const tempDir = await fs.mkdtemp(path.join(tempRoot, 'normalize-'))
          const outputZipPath = path.join(normalizedRoot, `${toStableId('normalized', task.absolutePath)}.zip`)
          await runProcess(sevenZipBin, ['x', '-y', `-o${tempDir}`, task.absolutePath], 300_000)
          await runProcess(sevenZipBin, ['a', '-tzip', '-mx=0', outputZipPath, `${tempDir}\\*`], 300_000)
          await fs.rm(tempDir, { recursive: true, force: true })
        } catch {
          status = 'failed'
        } finally {
          durationMs = Date.now() - startedAt
        }

        send({
          type: 'maintenance_item_done',
          archivePath: task.absolutePath,
          status,
          durationMs,
        })
      }, 1)
    }

    await maintenanceQueue.onIdle()
    const maintenanceElapsedMs = performance.now() - start
    send({
      type: 'maintenance_finished',
      maintenanceCount: tasks.length,
      maintenanceElapsedMs,
    })
    return {
      maintenanceCount: tasks.length,
      maintenanceElapsedMs,
    }
  }

  let scanResult = { scanElapsedMs: 0, scanFilesPerSec: 0 }
  let zipScanResult = { zipElapsedMs: 0, zipEntriesPerSec: 0 }
  let maintenanceResult = { maintenanceCount: 0, maintenanceElapsedMs: 0 }

  try {
    scanResult = await runShallowScan()
    zipScanResult = await runZipNameScan()
    scheduleVideoProbeTasks()
    scheduleThumbnailTasks()

    const monitorTimer = setInterval(() => {
      maybeApplyFocusRequest()
    }, 80)

    const maxWaitMs = Math.max(30_000, config.maxWaitMs)
    const waitStart = Date.now()

    while (Date.now() - waitStart < maxWaitMs) {
      maybeApplyFocusRequest()
      if (firstPageReady && firstVideoMetadataReady) {
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    if (firstPageReady) {
      maintenanceResult = await runMaintenanceTasks()
    }

    await thumbQueue.onIdle()
    await videoQueue.onIdle()
    clearInterval(monitorTimer)

    await db.flush()

    send({
      type: 'run_done',
      summary: {
        packageCount: packages.size,
        videoCount: videos.length,
        totalThumbnailDone,
        scanElapsedMs: scanResult.scanElapsedMs,
        scanFilesPerSec: scanResult.scanFilesPerSec,
        zipElapsedMs: zipScanResult.zipElapsedMs,
        zipEntriesPerSec: zipScanResult.zipEntriesPerSec,
        maintenanceCount: maintenanceResult.maintenanceCount,
        maintenanceElapsedMs: maintenanceResult.maintenanceElapsedMs,
        dbEnabled: db.enabled,
        dbStrategyApplied: db.strategy,
        fsStrategy: config.fsStrategy,
        zipStrategy: config.zipStrategy,
        dbStrategy: config.dbStrategy,
        queuePolicy: config.queuePolicy,
      },
    })
  } catch (error) {
    send({
      type: 'run_failed',
      message: error instanceof Error ? error.message : String(error),
    })
  } finally {
    clearInterval(progressTicker)
    await db.dispose()
  }
}

async function runController(config) {
  const startAtMs = Date.now()
  const eventLag = monitorEventLoopDelay({ resolution: 20 })
  eventLag.enable()

  const runTag = config.runTag?.trim().length > 0 ? config.runTag.trim() : new Date().toISOString().replace(/[:.]/g, '-')
  const runDir = path.join(config.outputRoot, `${config.comboId}-${config.mode}-${runTag}`)
  await ensureDir(runDir)

  const eventTimestamps = []
  const packageIds = []
  let focusCandidates = []
  const thumbnailCountByPackage = new Map()
  let initialFocusPackageId = null
  let switchedFocusPackageId = null
  let focusSwitchRequestedAtMs = 0
  let firstPageReadyAtMs = 0
  let firstVideoPlaceholderAtMs = 0
  let firstVideoMetadataAtMs = 0
  let firstSidebarAtMs = 0
  let firstThumbnailAtMs = 0
  let focusLatencyFirstAtMs = 0
  let focusLatency20AtMs = 0
  let lastEventReceivePerf = performance.now()
  let maxEventGapMs = 0
  let backendSummary = null
  let backendError = null

  const child = fork(new URL(import.meta.url), ['--backend-worker', '--config-json', JSON.stringify(config)], {
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  })

  await new Promise((resolve, reject) => {
    child.on('message', (message) => {
      if (!message || typeof message !== 'object') {
        return
      }

      const receivedPerf = performance.now()
      const gap = receivedPerf - lastEventReceivePerf
      if (gap > maxEventGapMs) {
        maxEventGapMs = gap
      }
      lastEventReceivePerf = receivedPerf
      eventTimestamps.push(receivedPerf)

      if (message.type === 'sidebar_item_discovered') {
        if (message.itemKind === 'package' && typeof message.packageId === 'string') {
          if (!packageIds.includes(message.packageId)) {
            packageIds.push(message.packageId)
          }
          if (!firstSidebarAtMs) {
            firstSidebarAtMs = message.ts
          }
          if (!initialFocusPackageId) {
            initialFocusPackageId = message.packageId
          }
        }
      }

      if (message.type === 'focus_selected' && typeof message.packageId === 'string') {
        initialFocusPackageId = message.packageId
      }

      if (message.type === 'first_page_ready' && !firstPageReadyAtMs) {
        firstPageReadyAtMs = message.ts
        if (focusCandidates.length > 0) {
          const preferred =
            focusCandidates.find((item) => item.packageId !== message.packageId && item.imageCount >= config.pageSize) ??
            focusCandidates.find((item) => item.packageId !== message.packageId)
          const alternative = preferred?.packageId ?? null
          if (alternative) {
            switchedFocusPackageId = alternative
            focusSwitchRequestedAtMs = Date.now()
            child.send({
              type: 'focus_package',
              packageId: alternative,
            })
          }
        }
      }

      if (message.type === 'focus_candidates' && Array.isArray(message.candidates)) {
        focusCandidates = message.candidates
      }

      if (message.type === 'focus_applied' && typeof message.packageId === 'string') {
        switchedFocusPackageId = message.packageId
        focusSwitchRequestedAtMs = message.ts
      }

      if (message.type === 'thumbnail_ready' && typeof message.packageId === 'string') {
        if (!firstThumbnailAtMs) {
          firstThumbnailAtMs = message.ts
        }
        const nextCount = (thumbnailCountByPackage.get(message.packageId) ?? 0) + 1
        thumbnailCountByPackage.set(message.packageId, nextCount)

        if (switchedFocusPackageId && message.packageId === switchedFocusPackageId && focusSwitchRequestedAtMs) {
          if (!focusLatencyFirstAtMs) {
            focusLatencyFirstAtMs = message.ts - focusSwitchRequestedAtMs
          }
          if (!focusLatency20AtMs && nextCount >= config.pageSize) {
            focusLatency20AtMs = message.ts - focusSwitchRequestedAtMs
          }
        }
      }

      if (message.type === 'video_placeholder_ready' && !firstVideoPlaceholderAtMs) {
        firstVideoPlaceholderAtMs = message.ts
      }

      if (message.type === 'video_metadata_ready' && !firstVideoMetadataAtMs) {
        firstVideoMetadataAtMs = message.ts
      }

      if (message.type === 'run_done') {
        backendSummary = message.summary
        resolve()
      }

      if (message.type === 'run_failed') {
        backendError = message.message
        resolve()
      }
    })

    child.on('error', reject)
    child.on('exit', () => {
      resolve()
    })
  })

  if (!child.killed) {
    child.kill()
  }

  eventLag.disable()

  const endedAtMs = Date.now()
  const result = {
    comboId: config.comboId,
    mode: config.mode,
    root: config.root,
    stateRoot: config.stateRoot,
    fsStrategy: config.fsStrategy,
    zipStrategy: config.zipStrategy,
    dbStrategy: config.dbStrategy,
    queuePolicy: config.queuePolicy,
    startedAtMs: startAtMs,
    endedAtMs,
    elapsedMs: endedAtMs - startAtMs,
    metrics: {
      TTFS_ms: firstSidebarAtMs ? firstSidebarAtMs - startAtMs : null,
      TTFI_ms: firstSidebarAtMs ? firstSidebarAtMs - startAtMs : null,
      TTFT_ms: firstThumbnailAtMs ? firstThumbnailAtMs - startAtMs : null,
      TTFP20_ms: firstPageReadyAtMs ? firstPageReadyAtMs - startAtMs : null,
      TTFV0_ms: firstVideoPlaceholderAtMs ? firstVideoPlaceholderAtMs - startAtMs : null,
      TTFVM_ms: firstVideoMetadataAtMs ? firstVideoMetadataAtMs - startAtMs : null,
      focusLatency_1_ms: focusLatencyFirstAtMs || null,
      focusLatency_20_ms: focusLatency20AtMs || null,
      eventLoopLag_p95_ms: formatNumber(eventLag.percentile(95) / 1_000_000, 3),
      eventLoopLag_p99_ms: formatNumber(eventLag.percentile(99) / 1_000_000, 3),
      UI_max_gap_ms: formatNumber(maxEventGapMs, 3),
      scan_files_per_sec: formatNumber(backendSummary?.scanFilesPerSec ?? 0, 2),
      zip_entries_per_sec: formatNumber(backendSummary?.zipEntriesPerSec ?? 0, 2),
      package_count: backendSummary?.packageCount ?? 0,
      video_count: backendSummary?.videoCount ?? 0,
      thumbnail_total: backendSummary?.totalThumbnailDone ?? 0,
      maintenance_count: backendSummary?.maintenanceCount ?? 0,
      maintenance_elapsed_ms: formatMs(backendSummary?.maintenanceElapsedMs ?? 0),
      db_enabled: Boolean(backendSummary?.dbEnabled),
      db_strategy_applied: backendSummary?.dbStrategyApplied ?? config.dbStrategy,
    },
    backendError,
  }

  const outJsonPath = path.join(runDir, 'result.json')
  await fs.writeFile(outJsonPath, JSON.stringify(result, null, 2), 'utf8')
  process.stdout.write(`Streaming benchmark result written: ${toPosix(path.relative(config.repoRoot, outJsonPath))}\n`)
  process.stdout.write(`${JSON.stringify(result.metrics, null, 2)}\n`)

  if (backendError) {
    throw new Error(`backend_failed:${backendError}`)
  }

  return result
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args['backend-worker']) {
    const config = JSON.parse(String(args['config-json']))
    await runBackendWorker(config)
    return
  }

  const repoRoot = process.cwd()
  const comboId = String(args.combo ?? 'C1')
  const mode = String(args.mode ?? 'cold')
  const runTag = String(args['run-tag'] ?? '')
  const root = path.resolve(String(args.root ?? 'Z:/PureBenchFolder01'))
  const stateRootBase = path.resolve(String(args['state-root'] ?? path.join(repoRoot, 'perf-data', 'streaming-ingest-state')))
  const stateId = String(args['state-id'] ?? comboId)
  const stateRoot = path.join(stateRootBase, stateId)
  const outputRoot = path.join(repoRoot, 'docs', 'perf', 'runs')

  if (mode === 'cold') {
    await fs.rm(stateRoot, { recursive: true, force: true })
  }
  await ensureDir(stateRoot)

  const config = {
    comboId,
    mode,
    root,
    stateRoot,
    stateId,
    runTag,
    outputRoot,
    repoRoot,
    pageSize: Math.max(1, resolveNumber(args['page-size'], 20)),
    fsStrategy: String(args['fs-strategy'] ?? 'readdir'),
    zipStrategy: String(args['zip-strategy'] ?? 'central'),
    dbStrategy: String(args['db-strategy'] ?? 'sqlite'),
    queuePolicy: String(args['queue-policy'] ?? 'Q1'),
    progressTickMs: Math.max(50, resolveNumber(args['progress-tick-ms'], 100)),
    scanConcurrency: Math.max(1, resolveNumber(args['scan-concurrency'], 16)),
    zipScanConcurrency: Math.max(1, resolveNumber(args['zip-scan-concurrency'], 10)),
    thumbnailConcurrency: Math.max(1, resolveNumber(args['thumb-concurrency'], 6)),
    videoProbeConcurrency: Math.max(1, resolveNumber(args['video-concurrency'], 1)),
    backgroundThumbLimit: Math.max(0, resolveNumber(args['background-thumb-limit'], 240)),
    videoProbeLimit: Math.max(1, resolveNumber(args['video-probe-limit'], 3)),
    maintenanceLimit: Math.max(0, resolveNumber(args['maintenance-limit'], 2)),
    maxWaitMs: Math.max(30_000, resolveNumber(args['max-wait-ms'], 180_000)),
    enableMaintenance: args['disable-maintenance'] ? false : true,
  }

  const rootStat = await fs.stat(config.root).catch(() => null)
  if (!rootStat || !rootStat.isDirectory()) {
    throw new Error(`benchmark_root_missing:${config.root}`)
  }

  if (!new Set(['readdir', 'opendir']).has(config.fsStrategy)) {
    throw new Error(`invalid_fs_strategy:${config.fsStrategy}`)
  }
  if (!new Set(['central', 'powershell', 'node-stream-zip', 'yauzl']).has(config.zipStrategy)) {
    throw new Error(`invalid_zip_strategy:${config.zipStrategy}`)
  }
  if (!new Set(['sqlite', 'memory', 'better-sqlite3-worker']).has(config.dbStrategy)) {
    throw new Error(`invalid_db_strategy:${config.dbStrategy}`)
  }
  if (!new Set(['Q1', 'Q2']).has(config.queuePolicy)) {
    throw new Error(`invalid_queue_policy:${config.queuePolicy}`)
  }

  await runController(config)
}

main().catch((error) => {
  process.stderr.write(`streaming benchmark failed: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
