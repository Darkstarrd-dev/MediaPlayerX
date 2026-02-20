import { parentPort, workerData } from 'node:worker_threads'

import { normalizeArchiveToStoreZipInPlace } from './archiveWasmExtractor'
import {
  TASK_WORKER_HEARTBEAT_INTERVAL_MS,
  type TaskWorkerProgressEnvelope,
  type TaskWorkerRequestEnvelope,
  type TaskWorkerResponseEnvelope,
} from './services/task-orchestrator/taskWorkerProtocol'

interface WorkerData {
  sourceArchivePath?: unknown
  webpQuality?: unknown
}

interface WorkerResult {
  ok: boolean
  outputZipPath?: string
  error?: string
}

interface ParsedRequest {
  requestId: string
  payload: unknown
  legacy: boolean
}

const cancelledRequestIds = new Set<string>()

const queuedMessages: unknown[] = []

let workerRunning = false

function normalizePayload(raw: unknown): { sourceArchivePath: string; webpQuality: number | undefined } {
  const payload = (raw ?? {}) as WorkerData
  const sourceArchivePath = typeof payload.sourceArchivePath === 'string' ? payload.sourceArchivePath : ''
  const webpQuality =
    typeof payload.webpQuality === 'number' && Number.isFinite(payload.webpQuality) ? payload.webpQuality : undefined
  return {
    sourceArchivePath,
    webpQuality,
  }
}

function postResult(result: WorkerResult): void {
  if (parentPort) {
    parentPort.postMessage(result)
    return
  }

  if (typeof process.send === 'function') {
    process.send(result)
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
  if (!parentPort && process.env.MEDIA_PLAYERX_TASK_WORKER_ONESHOT === '1') {
    process.exitCode = code
  }
}

async function runNormalize(rawPayload: unknown): Promise<void> {
  const parsedRequest = parseRequest(rawPayload)

  if (cancelledRequestIds.has(parsedRequest.requestId)) {
    cancelledRequestIds.delete(parsedRequest.requestId)
    return
  }

  const payload = normalizePayload(parsedRequest.payload)
  const heartbeatTimer = setInterval(() => {
    postHeartbeat()
  }, TASK_WORKER_HEARTBEAT_INTERVAL_MS)
  heartbeatTimer.unref?.()

  if (!payload.sourceArchivePath) {
    const error = 'archive normalization worker missing sourceArchivePath'
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
    if (!parsedRequest.legacy) {
      postProgress({
        kind: 'progress',
        request_id: parsedRequest.requestId,
        progress: 0.1,
        message: 'archive-normalize-started',
      })
    }

    const result = await normalizeArchiveToStoreZipInPlace(payload.sourceArchivePath, {
      webpQuality: payload.webpQuality,
    })

    if (cancelledRequestIds.has(parsedRequest.requestId)) {
      cancelledRequestIds.delete(parsedRequest.requestId)
      clearInterval(heartbeatTimer)
      return
    }

    if (!parsedRequest.legacy) {
      postProgress({
        kind: 'progress',
        request_id: parsedRequest.requestId,
        progress: 0.95,
        message: 'archive-normalize-finalizing',
      })
    }

    if (parsedRequest.legacy) {
      postResult({ ok: true, outputZipPath: result.outputZipPath })
    } else {
      postProgress({
        kind: 'progress',
        request_id: parsedRequest.requestId,
        progress: 1,
        message: 'archive-normalize-complete',
      })
      postResponse({
        kind: 'response',
        request_id: parsedRequest.requestId,
        ok: true,
        payload: {
          outputZipPath: result.outputZipPath,
        },
      })
    }
    clearInterval(heartbeatTimer)
    maybeExit(0)
  } catch (error: unknown) {
    const message = error instanceof Error && error.message ? error.message : String(error)
    if (parsedRequest.legacy) {
      postResult({ ok: false, error: message })
    } else {
      postResponse({
        kind: 'response',
        request_id: parsedRequest.requestId,
        ok: false,
        error: message,
      })
    }
    clearInterval(heartbeatTimer)
    maybeExit(1)
  }
}

function enqueueMessage(message: unknown): void {
  if (message && typeof message === 'object') {
    const cancelEnvelope = message as { kind?: unknown; request_id?: unknown }
    if (cancelEnvelope.kind === 'cancel' && typeof cancelEnvelope.request_id === 'string') {
      cancelledRequestIds.add(cancelEnvelope.request_id)
      return
    }
  }

  queuedMessages.push(message)
  void drainQueue()
}

async function drainQueue(): Promise<void> {
  if (workerRunning) {
    return
  }

  const next = queuedMessages.shift()
  if (typeof next === 'undefined') {
    return
  }

  workerRunning = true
  try {
    await runNormalize(next)
  } finally {
    workerRunning = false
    if (queuedMessages.length > 0) {
      void drainQueue()
    }
  }
}

if (parentPort) {
  if (typeof workerData !== 'undefined') {
    enqueueMessage(workerData)
  }
  parentPort.on('message', (message) => {
    enqueueMessage(message)
  })
} else {
  process.on('message', (message) => {
    enqueueMessage(message)
  })
}
