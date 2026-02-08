import { promises as fs } from 'node:fs'
import path from 'node:path'
import { inflateRawSync } from 'node:zlib'

const ZIP_END_OF_CENTRAL_DIR_SIGNATURE = 0x06054b50
const ZIP_CENTRAL_FILE_HEADER_SIGNATURE = 0x02014b50
const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50
const ZIP_GENERAL_PURPOSE_FLAG_UTF8 = 0x0800
const ZIP_GENERAL_PURPOSE_FLAG_ENCRYPTED = 0x0001
const ZIP_COMPRESSION_STORE = 0
const ZIP_COMPRESSION_DEFLATE = 8
const ZIP_MAX_COMMENT_LENGTH = 0xffff
const ZIP_SCAN_TAIL_PADDING = 128

export interface ZipCentralEntry {
  entryName: string
  extension: string
  compressedSize: number
  uncompressedSize: number
  compressionMethod: number
  generalPurposeBitFlag: number
  localHeaderOffset: number
}

export function normalizeArchiveEntryName(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '')
}

export function isSafeArchiveEntryName(value: string): boolean {
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

export async function scanZipCentralEntries(archivePath: string): Promise<ZipCentralEntry[]> {
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

export async function readZipEntryContent(archivePath: string, entry: ZipCentralEntry): Promise<Buffer> {
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
