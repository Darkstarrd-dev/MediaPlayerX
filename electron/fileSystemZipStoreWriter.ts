import { promises as fs } from 'node:fs'
import path from 'node:path'

import { normalizeArchiveEntryName } from './zipArchiveHelpers'
import { normalizePathKey } from './fileSystemServiceHelpers'

function createCrc32Table(): Uint32Array {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0 ? (0xedb88320 ^ (value >>> 1)) >>> 0 : (value >>> 1) >>> 0
    }
    table[index] = value >>> 0
  }
  return table
}

const CRC32_TABLE = createCrc32Table()

export interface StoredZipEntryInput {
  entryName: string
  content: Buffer
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff
  for (let index = 0; index < buffer.length; index += 1) {
    crc = CRC32_TABLE[(crc ^ buffer[index]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

export async function collectFilesRecursive(rootDir: string): Promise<Array<{ absolutePath: string; relativePath: string }>> {
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

export async function writeStoredZipFromDirectory(inputDir: string, outputZipPath: string): Promise<void> {
  const files = await collectFilesRecursive(inputDir)
  const entries: StoredZipEntryInput[] = []
  for (const file of files) {
    entries.push({
      entryName: file.relativePath,
      content: await fs.readFile(file.absolutePath),
    })
  }

  await writeStoredZipFromEntries(outputZipPath, entries)
}

function buildStoredZipBuffer(entries: StoredZipEntryInput[]): Buffer {
  const localChunks: Buffer[] = []
  const centralChunks: Buffer[] = []
  let cursor = 0
  let writtenCount = 0

  for (const entry of entries) {
    const normalizedName = normalizeArchiveEntryName(entry.entryName)
    if (!normalizedName) {
      continue
    }

    const content = entry.content
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
    writtenCount += 1
  }

  const centralDirectoryBuffer = Buffer.concat(centralChunks)
  const endOfCentralDirectory = Buffer.alloc(22)
  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0)
  endOfCentralDirectory.writeUInt16LE(0, 4)
  endOfCentralDirectory.writeUInt16LE(0, 6)
  endOfCentralDirectory.writeUInt16LE(writtenCount, 8)
  endOfCentralDirectory.writeUInt16LE(writtenCount, 10)
  endOfCentralDirectory.writeUInt32LE(centralDirectoryBuffer.length, 12)
  endOfCentralDirectory.writeUInt32LE(cursor, 16)
  endOfCentralDirectory.writeUInt16LE(0, 20)

  return Buffer.concat([...localChunks, centralDirectoryBuffer, endOfCentralDirectory])
}

export async function writeStoredZipFromEntries(outputZipPath: string, entries: StoredZipEntryInput[]): Promise<void> {
  const zipBuffer = buildStoredZipBuffer(entries)
  await fs.mkdir(path.dirname(outputZipPath), { recursive: true })
  await fs.writeFile(outputZipPath, zipBuffer)
}
