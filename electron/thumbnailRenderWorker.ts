import { parentPort, workerData } from 'node:worker_threads'
import { promises as fs } from 'node:fs'

import { getSharpModule } from './fileSystemRuntimeHelpers'

interface ThumbnailRenderPayload {
  sourceBuffer?: unknown
  maxEdge?: unknown
  quality?: unknown
  tempPath?: unknown
  cachePath?: unknown
}

interface JsonSerializedBuffer {
  type?: unknown
  data?: unknown
}

interface ThumbnailRenderResult {
  ok: boolean
  error?: string
}

function postResult(payload: ThumbnailRenderResult): void {
  if (parentPort) {
    parentPort.postMessage(payload)
    return
  }

  if (typeof process.send === 'function') {
    process.send(payload)
  }
}

function normalizePayload(raw: unknown): {
  sourceBuffer: Buffer | null
  maxEdge: number
  quality: number
  tempPath: string
  cachePath: string
} {
  const payload = (raw ?? {}) as ThumbnailRenderPayload
  const rawSourceBuffer = payload.sourceBuffer
  const sourceBuffer = Buffer.isBuffer(rawSourceBuffer)
    ? rawSourceBuffer
    : typeof rawSourceBuffer === 'string'
      ? Buffer.from(rawSourceBuffer, 'base64')
      : (() => {
          const serialized = (rawSourceBuffer ?? {}) as JsonSerializedBuffer
          if (serialized.type !== 'Buffer' || !Array.isArray(serialized.data)) {
            return null
          }
          return Buffer.from(serialized.data as number[])
        })()

  const maxEdge = typeof payload.maxEdge === 'number' && Number.isFinite(payload.maxEdge)
    ? Math.max(1, Math.round(payload.maxEdge))
    : 320
  const quality = typeof payload.quality === 'number' && Number.isFinite(payload.quality)
    ? Math.max(1, Math.min(100, Math.round(payload.quality)))
    : 82
  const tempPath = typeof payload.tempPath === 'string' ? payload.tempPath : ''
  const cachePath = typeof payload.cachePath === 'string' ? payload.cachePath : ''

  return {
    sourceBuffer,
    maxEdge,
    quality,
    tempPath,
    cachePath,
  }
}

async function runThumbnailRender(rawPayload: unknown): Promise<void> {
  const payload = normalizePayload(rawPayload)
  if (!payload.sourceBuffer || payload.sourceBuffer.length <= 0) {
    postResult({ ok: false, error: 'thumbnail worker missing sourceBuffer' })
    process.exit(1)
    return
  }
  if (!payload.tempPath || !payload.cachePath) {
    postResult({ ok: false, error: 'thumbnail worker missing target path' })
    process.exit(1)
    return
  }

  const sharpModule = await getSharpModule()
  if (!sharpModule?.default) {
    postResult({ ok: false, error: 'thumbnail worker sharp unavailable' })
    process.exit(1)
    return
  }

  try {
    const sharp = sharpModule.default
    await sharp(payload.sourceBuffer, { failOn: 'none' })
      .rotate()
      .resize({
        width: payload.maxEdge,
        height: payload.maxEdge,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: payload.quality })
      .toFile(payload.tempPath)

    await fs.rename(payload.tempPath, payload.cachePath).catch(async () => {
      await fs.rm(payload.tempPath, { force: true })
    })
    postResult({ ok: true })
    process.exit(0)
  } catch (error) {
    const reason = error instanceof Error && error.message ? error.message : String(error)
    await fs.rm(payload.tempPath, { force: true }).catch(() => undefined)
    postResult({ ok: false, error: reason })
    process.exit(1)
  }
}

if (parentPort) {
  void runThumbnailRender(workerData)
} else {
  const messageTimeout = setTimeout(() => {
    postResult({ ok: false, error: 'thumbnail worker missing payload message' })
    process.exit(1)
  }, 5_000)
  messageTimeout.unref?.()

  process.once('message', (message) => {
    clearTimeout(messageTimeout)
    void runThumbnailRender(message)
  })
}
