import { parentPort, workerData } from 'node:worker_threads'
import { promises as fs } from 'node:fs'

import { getSharpModule } from './fileSystemRuntimeHelpers'
import {
  TASK_WORKER_HEARTBEAT_INTERVAL_MS,
  type TaskWorkerProgressEnvelope,
  type TaskWorkerRequestEnvelope,
  type TaskWorkerResponseEnvelope,
} from './services/task-orchestrator/taskWorkerProtocol'

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

interface ParsedRequest {
  requestId: string
  payload: unknown
  legacy: boolean
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

function postResponse(response: TaskWorkerResponseEnvelope): void {
  if (parentPort) {
    parentPort.postMessage(response)
    return
  }

  if (typeof process.send === 'function') {
    process.send(response)
  }
}

function postProgress(progress: TaskWorkerProgressEnvelope): void {
  if (parentPort) {
    parentPort.postMessage(progress)
    return
  }

  if (typeof process.send === 'function') {
    process.send(progress)
  }
}

function postHeartbeat(): void {
  const payload = {
    kind: 'heartbeat',
    worker_pid: process.pid,
    at_ms: Date.now(),
  }

  if (parentPort) {
    parentPort.postMessage(payload)
    return
  }

  if (typeof process.send === 'function') {
    process.send(payload)
  }
}

function parseRequest(raw: unknown): ParsedRequest {
  if (raw && typeof raw === 'object') {
    const request = raw as Partial<TaskWorkerRequestEnvelope>
    if (request.kind === 'request' && typeof request.request_id === 'string') {
      return {
        requestId: request.request_id,
        payload: request.payload,
        legacy: false,
      }
    }
  }

  return {
    requestId: 'legacy-request',
    payload: raw,
    legacy: true,
  }
}

function maybeExit(code: number): void {
  if (parentPort) {
    return
  }
  process.exitCode = code
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
  const parsedRequest = parseRequest(rawPayload)
  const payload = normalizePayload(parsedRequest.payload)
  const heartbeatTimer = setInterval(() => {
    postHeartbeat()
  }, TASK_WORKER_HEARTBEAT_INTERVAL_MS)
  heartbeatTimer.unref?.()

  if (!payload.sourceBuffer || payload.sourceBuffer.length <= 0) {
    const error = 'thumbnail worker missing sourceBuffer'
    if (parsedRequest.legacy) {
      postResult({ ok: false, error })
    } else {
      postResponse({
        kind: 'response',
        request_id: parsedRequest.requestId,
        ok: false,
        error,
      })
    }
    clearInterval(heartbeatTimer)
    maybeExit(1)
    return
  }
  if (!payload.tempPath || !payload.cachePath) {
    const error = 'thumbnail worker missing target path'
    if (parsedRequest.legacy) {
      postResult({ ok: false, error })
    } else {
      postResponse({
        kind: 'response',
        request_id: parsedRequest.requestId,
        ok: false,
        error,
      })
    }
    clearInterval(heartbeatTimer)
    maybeExit(1)
    return
  }

  const sharpModule = await getSharpModule()
  if (!sharpModule?.default) {
    const error = 'thumbnail worker sharp unavailable'
    if (parsedRequest.legacy) {
      postResult({ ok: false, error })
    } else {
      postResponse({
        kind: 'response',
        request_id: parsedRequest.requestId,
        ok: false,
        error,
      })
    }
    clearInterval(heartbeatTimer)
    maybeExit(1)
    return
  }

  try {
    const sharp = sharpModule.default
    if (!parsedRequest.legacy) {
      postProgress({
        kind: 'progress',
        request_id: parsedRequest.requestId,
        progress: 0.3,
        message: 'thumbnail-render-encoding',
      })
    }
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

    if (!parsedRequest.legacy) {
      postProgress({
        kind: 'progress',
        request_id: parsedRequest.requestId,
        progress: 0.85,
        message: 'thumbnail-render-moving-cache',
      })
    }

    await fs.rename(payload.tempPath, payload.cachePath).catch(async () => {
      await fs.rm(payload.tempPath, { force: true })
    })
    if (parsedRequest.legacy) {
      postResult({ ok: true })
    } else {
      postProgress({
        kind: 'progress',
        request_id: parsedRequest.requestId,
        progress: 1,
        message: 'thumbnail-render-complete',
      })
      postResponse({
        kind: 'response',
        request_id: parsedRequest.requestId,
        ok: true,
        payload: {
          cachePath: payload.cachePath,
        },
      })
    }
    clearInterval(heartbeatTimer)
    maybeExit(0)
  } catch (error) {
    const reason = error instanceof Error && error.message ? error.message : String(error)
    await fs.rm(payload.tempPath, { force: true }).catch(() => undefined)
    if (parsedRequest.legacy) {
      postResult({ ok: false, error: reason })
    } else {
      postResponse({
        kind: 'response',
        request_id: parsedRequest.requestId,
        ok: false,
        error: reason,
      })
    }
    clearInterval(heartbeatTimer)
    maybeExit(1)
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
