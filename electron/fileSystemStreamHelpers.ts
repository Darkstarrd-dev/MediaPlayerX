import { type ReadStream } from 'node:fs'
import { Readable } from 'node:stream'

interface ByteRange {
  start: number
  end: number
}

export function parseByteRange(rangeHeader: string | null, size: number): ByteRange | null {
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

export function toWebReadableStream(stream: ReadStream, signal?: AbortSignal | null): ReadableStream<Uint8Array> {
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
