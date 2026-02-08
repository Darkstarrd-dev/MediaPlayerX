#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'])
const ZIP_EXTENSIONS = new Set(['.zip'])
const RAR7Z_EXTENSIONS = new Set(['.rar', '.7z'])

const ZIP_END_OF_CENTRAL_DIR_SIGNATURE = 0x06054b50
const ZIP_CENTRAL_FILE_HEADER_SIGNATURE = 0x02014b50
const ZIP_GENERAL_PURPOSE_FLAG_UTF8 = 0x0800
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

function formatNumber(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return null
  }
  return Number(value.toFixed(digits))
}

function stableId(prefix, value) {
  const hash = createHash('sha1').update(value).digest('hex').slice(0, 12)
  return `${prefix}-${hash}`
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true })
}

async function runProcess(command, args, timeoutMs = 600_000) {
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

function normalizeArchiveEntryName(value) {
  return value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '')
}

function decodeZipEntryName(bytes, utf8) {
  return utf8 ? bytes.toString('utf8') : bytes.toString('latin1')
}

function findSignatureBackward(buffer, signature) {
  for (let index = buffer.length - 4; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === signature) {
      return index
    }
  }
  return -1
}

async function scanZipEntryNames(archivePath) {
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
      const fileNameLength = centralBuffer.readUInt16LE(cursor + 28)
      const extraLength = centralBuffer.readUInt16LE(cursor + 30)
      const commentLength = centralBuffer.readUInt16LE(cursor + 32)

      const fileNameStart = cursor + 46
      const fileNameEnd = fileNameStart + fileNameLength
      if (fileNameEnd > centralBuffer.length) {
        break
      }

      const entryName = normalizeArchiveEntryName(
        decodeZipEntryName(centralBuffer.subarray(fileNameStart, fileNameEnd), (generalPurposeBitFlag & ZIP_GENERAL_PURPOSE_FLAG_UTF8) !== 0),
      )

      const nextCursor = fileNameEnd + extraLength + commentLength
      if (nextCursor > centralBuffer.length) {
        break
      }
      cursor = nextCursor

      if (!entryName || entryName.endsWith('/')) {
        continue
      }
      entries.push(entryName)
    }

    return entries
  } finally {
    await handle.close()
  }
}

async function walkFiles(root) {
  const queue = [root]
  const files = []
  while (queue.length > 0) {
    const current = queue.pop()
    const entries = await fs.readdir(current, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        queue.push(absolutePath)
        continue
      }
      if (!entry.isFile()) {
        continue
      }
      files.push(absolutePath)
    }
  }
  return files
}

async function runD1Rar7zNormalize(root, workRoot, extractorBin) {
  const files = await walkFiles(root)
  const rar7zFiles = files.filter((filePath) => RAR7Z_EXTENSIONS.has(path.extname(filePath).toLowerCase()))
  const outputRoot = path.join(workRoot, 'd1-normalized')
  await ensureDir(outputRoot)

  const items = []
  const started = performance.now()
  for (const archivePath of rar7zFiles) {
    const start = performance.now()
    const tempDir = await fs.mkdtemp(path.join(workRoot, 'd1-extract-'))
    const outZip = path.join(outputRoot, `${stableId('normalized', archivePath)}.zip`)
    let status = 'ok'
    try {
      await runProcess(extractorBin, ['x', '-y', `-o${tempDir}`, archivePath], 600_000)
      await runProcess(extractorBin, ['a', '-tzip', '-mx=0', outZip, `${tempDir}\\*`], 600_000)
    } catch {
      status = 'failed'
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true })
    }

    items.push({
      archivePath,
      status,
      elapsedMs: performance.now() - start,
    })
  }

  const elapsedMs = performance.now() - started
  return {
    count: rar7zFiles.length,
    elapsedMs,
    successCount: items.filter((item) => item.status === 'ok').length,
    failedCount: items.filter((item) => item.status !== 'ok').length,
    itemElapsedMedianMs: formatNumber(
      items.length > 0
        ? [...items].sort((a, b) => a.elapsedMs - b.elapsedMs)[Math.floor(items.length / 2)].elapsedMs
        : 0,
    ),
    items,
  }
}

async function listRegularFiles(root) {
  const files = await walkFiles(root)
  return files.filter((filePath) => !filePath.endsWith('.DS_Store'))
}

async function runD2ZipRepackDelete(root, workRoot, extractorBin, deleteRatio) {
  const files = await walkFiles(root)
  const zipFile = files.find((filePath) => ZIP_EXTENSIONS.has(path.extname(filePath).toLowerCase()))
  if (!zipFile) {
    return {
      skipped: true,
      reason: 'no_zip_found',
    }
  }

  const tempDir = await fs.mkdtemp(path.join(workRoot, 'd2-extract-'))
  const repackZipPath = path.join(workRoot, 'd2-repacked.zip')

  const started = performance.now()
  await runProcess(extractorBin, ['x', '-y', `-o${tempDir}`, zipFile], 600_000)
  const extractedFiles = await listRegularFiles(tempDir)
  const deleteCount = Math.max(1, Math.floor(extractedFiles.length * deleteRatio))
  for (let index = 0; index < deleteCount && index < extractedFiles.length; index += 1) {
    await fs.rm(extractedFiles[index], { force: true })
  }
  await runProcess(extractorBin, ['a', '-tzip', '-mx=0', repackZipPath, `${tempDir}\\*`], 600_000)
  const elapsedMs = performance.now() - started
  await fs.rm(tempDir, { recursive: true, force: true })

  return {
    skipped: false,
    sourceZip: zipFile,
    extractedCount: extractedFiles.length,
    deletedCount: deleteCount,
    elapsedMs,
  }
}

async function runD3ZipBulkRename(root, workRoot, extractorBin) {
  const files = await walkFiles(root)
  const zipFiles = files.filter((filePath) => ZIP_EXTENSIONS.has(path.extname(filePath).toLowerCase()))
  const zipFile = zipFiles[1] ?? zipFiles[0]
  if (!zipFile) {
    return {
      skipped: true,
      reason: 'no_zip_found',
    }
  }

  const tempDir = await fs.mkdtemp(path.join(workRoot, 'd3-extract-'))
  const repackZipPath = path.join(workRoot, 'd3-renamed.zip')

  await runProcess(extractorBin, ['x', '-y', `-o${tempDir}`, zipFile], 600_000)
  const extractedFiles = await listRegularFiles(tempDir)

  const renameStart = performance.now()
  let renamedCount = 0
  for (const filePath of extractedFiles) {
    const extension = path.extname(filePath)
    const targetPath = path.join(path.dirname(filePath), `renamed_${String(renamedCount + 1).padStart(6, '0')}${extension}`)
    if (targetPath === filePath) {
      continue
    }
    await fs.rename(filePath, targetPath)
    renamedCount += 1
  }
  const renameElapsedMs = performance.now() - renameStart

  const repackStart = performance.now()
  await runProcess(extractorBin, ['a', '-tzip', '-mx=0', repackZipPath, `${tempDir}\\*`], 600_000)
  const repackElapsedMs = performance.now() - repackStart

  await fs.rm(tempDir, { recursive: true, force: true })

  return {
    skipped: false,
    sourceZip: zipFile,
    extractedCount: extractedFiles.length,
    renamedCount,
    renameElapsedMs,
    repackElapsedMs,
    elapsedMs: renameElapsedMs + repackElapsedMs,
  }
}

async function createDbLayer(dbPath) {
  try {
    const sqlite = await import('node:sqlite')
    const { DatabaseSync } = sqlite
    const db = new DatabaseSync(dbPath)
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      CREATE TABLE IF NOT EXISTS package_item (
        id TEXT PRIMARY KEY,
        absolute_path TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS image_item (
        id TEXT PRIMARY KEY,
        package_id TEXT NOT NULL,
        absolute_path TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_image_package_id ON image_item(package_id);
    `)
    return db
  } catch {
    return null
  }
}

async function runD4DbDelete(root, workRoot) {
  const dbPath = path.join(workRoot, 'd4-delete.sqlite')
  const db = await createDbLayer(dbPath)
  if (!db) {
    return {
      skipped: true,
      reason: 'sqlite_unavailable',
    }
  }

  const files = await walkFiles(root)
  const packageMap = new Map()
  const zipFiles = files.filter((filePath) => ZIP_EXTENSIONS.has(path.extname(filePath).toLowerCase()))
  const imageFiles = files.filter((filePath) => IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase()))

  for (const imagePath of imageFiles) {
    const packagePath = path.dirname(imagePath)
    if (!packageMap.has(packagePath)) {
      packageMap.set(packagePath, [])
    }
    packageMap.get(packagePath).push(imagePath)
  }

  for (const zipPath of zipFiles.slice(0, 8)) {
    const entryNames = await scanZipEntryNames(zipPath)
    packageMap.set(zipPath, entryNames.map((entryName) => `${zipPath}::${entryName}`))
  }

  const insertPackageStmt = db.prepare('INSERT OR REPLACE INTO package_item(id, absolute_path) VALUES(?, ?)')
  const insertImageStmt = db.prepare('INSERT OR REPLACE INTO image_item(id, package_id, absolute_path) VALUES(?, ?, ?)')

  for (const [packagePath, entries] of packageMap.entries()) {
    const packageId = stableId('pkg', packagePath)
    insertPackageStmt.run(packageId, packagePath)
    for (const entry of entries) {
      insertImageStmt.run(stableId('img', entry), packageId, entry)
    }
  }

  const packageIds = Array.from(packageMap.keys()).map((packagePath) => stableId('pkg', packagePath))
  const targetOne = packageIds[0]
  const targetBatch = packageIds.slice(1, 6)

  const deleteSingleStart = performance.now()
  if (targetOne) {
    db.exec('BEGIN')
    db.prepare('DELETE FROM image_item WHERE package_id = ?').run(targetOne)
    db.prepare('DELETE FROM package_item WHERE id = ?').run(targetOne)
    db.exec('COMMIT')
  }
  const deleteSingleMs = performance.now() - deleteSingleStart

  const deleteBatchStart = performance.now()
  if (targetBatch.length > 0) {
    db.exec('BEGIN')
    const deleteImages = db.prepare('DELETE FROM image_item WHERE package_id = ?')
    const deletePackage = db.prepare('DELETE FROM package_item WHERE id = ?')
    for (const packageId of targetBatch) {
      deleteImages.run(packageId)
      deletePackage.run(packageId)
    }
    db.exec('COMMIT')
  }
  const deleteBatchMs = performance.now() - deleteBatchStart

  const beforeCount = packageIds.length
  const afterCount = db.prepare('SELECT COUNT(*) AS count FROM package_item').get().count
  const imageCountAfter = db.prepare('SELECT COUNT(*) AS count FROM image_item').get().count

  db.close()

  return {
    skipped: false,
    packageCountBefore: beforeCount,
    packageCountAfter: afterCount,
    imageCountAfter,
    deleteSingleMs,
    deleteBatchMs,
    deleteBatchCount: targetBatch.length,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const repoRoot = process.cwd()
  const root = path.resolve(String(args.root ?? 'Z:/PureBenchFolder04'))
  const outputRoot = path.resolve(String(args.output ?? path.join(repoRoot, 'docs', 'perf', 'runs')))
  const extractorBin = process.env.MEDIA_PLAYERX_ARCHIVE_EXTRACTOR_BIN ?? '7z'
  const deleteRatio = Math.min(0.9, Math.max(0.01, Number(args['delete-ratio'] ?? 0.1)))

  const rootStat = await fs.stat(root).catch(() => null)
  if (!rootStat || !rootStat.isDirectory()) {
    throw new Error(`benchmark_root_missing:${root}`)
  }

  const runDir = path.join(outputRoot, `D-${new Date().toISOString().replace(/[:.]/g, '-')}-${path.basename(root)}`)
  await ensureDir(runDir)
  const workRoot = path.join(runDir, 'work')
  await ensureDir(workRoot)

  const startedAtMs = Date.now()

  const d1 = await runD1Rar7zNormalize(root, workRoot, extractorBin)
  const d2 = await runD2ZipRepackDelete(root, workRoot, extractorBin, deleteRatio)
  const d3 = await runD3ZipBulkRename(root, workRoot, extractorBin)
  const d4 = await runD4DbDelete(root, workRoot)

  const endedAtMs = Date.now()
  const result = {
    root,
    startedAtMs,
    endedAtMs,
    elapsedMs: endedAtMs - startedAtMs,
    metrics: {
      rar7z_to_zip_ms: formatNumber(d1.elapsedMs),
      rar7z_count: d1.count,
      rar7z_success: d1.successCount,
      rar7z_failed: d1.failedCount,
      rar7z_item_median_ms: d1.itemElapsedMedianMs,
      zip_repack_delete_ms: d2.skipped ? null : formatNumber(d2.elapsedMs),
      zip_repack_deleted_count: d2.skipped ? null : d2.deletedCount,
      zip_bulk_rename_ms: d3.skipped ? null : formatNumber(d3.elapsedMs),
      zip_bulk_rename_repack_ms: d3.skipped ? null : formatNumber(d3.repackElapsedMs),
      zip_bulk_rename_count: d3.skipped ? null : d3.renamedCount,
      db_delete_package_single_ms: d4.skipped ? null : formatNumber(d4.deleteSingleMs),
      db_delete_package_batch_ms: d4.skipped ? null : formatNumber(d4.deleteBatchMs),
      db_delete_batch_count: d4.skipped ? null : d4.deleteBatchCount,
    },
    raw: {
      d1,
      d2,
      d3,
      d4,
    },
  }

  const resultPath = path.join(runDir, 'destructive-result.json')
  await fs.writeFile(resultPath, JSON.stringify(result, null, 2), 'utf8')
  process.stdout.write(`Destructive benchmark result written: ${toPosix(path.relative(repoRoot, resultPath))}\n`)
  process.stdout.write(`${JSON.stringify(result.metrics, null, 2)}\n`)
}

main().catch((error) => {
  process.stderr.write(`archive/db benchmark failed: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
