import { createReadStream, promises as fs } from 'node:fs'

import type { MediaLocatorDto } from '../src/contracts/backend'
import { parseByteRange, toWebReadableStream } from './fileSystemStreamHelpers'
import { readZipEntryContent, readZipEntryDataOffset, type ZipCentralEntry } from './zipArchiveHelpers'

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

export async function readFilesystemMedia(
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

export async function readFilesystemMediaStream(
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

export async function readArchiveEntryMedia(
  locator: Extract<MediaLocatorDto, { kind: 'archive-entry' }>,
  mimeType: string,
  zipEntryIndexByPath: Map<string, Map<string, ZipCentralEntry>>,
): Promise<MediaProtocolResponsePayload> {
  const archivePath = locator.archive_path
  const entryMap = zipEntryIndexByPath.get(archivePath)
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

export async function readArchiveEntryMediaStream(
  locator: Extract<MediaLocatorDto, { kind: 'archive-entry' }>,
  mimeType: string,
  zipEntryIndexByPath: Map<string, Map<string, ZipCentralEntry>>,
  signal?: AbortSignal | null,
): Promise<MediaProtocolStreamResponsePayload> {
  const archivePath = locator.archive_path
  const entryMap = zipEntryIndexByPath.get(archivePath)
  const entry = entryMap?.get(locator.entry_name)
  if (!entry) {
    throw new Error(`压缩包媒体读取失败（entry 丢失）: ${archivePath}::${locator.entry_name}`)
  }

  if ((entry.generalPurposeBitFlag & 0x0001) !== 0) {
    throw new Error(`zip 条目被加密，当前不支持: ${archivePath} -> ${entry.entryName}`)
  }

  if (entry.compressionMethod === 0) {
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
