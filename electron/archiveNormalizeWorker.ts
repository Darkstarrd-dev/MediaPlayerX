import { parentPort, workerData } from 'node:worker_threads'

import { normalizeArchiveToStoreZipInPlace } from './archiveWasmExtractor'

interface WorkerData {
  sourceArchivePath?: unknown
  webpQuality?: unknown
}

interface WorkerResult {
  ok: boolean
  outputZipPath?: string
  error?: string
}

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

async function runNormalize(rawPayload: unknown): Promise<void> {
  const payload = normalizePayload(rawPayload)
  if (!payload.sourceArchivePath) {
    postResult({ ok: false, error: 'archive normalization worker missing sourceArchivePath' })
    process.exit(1)
    return
  }

  try {
    const result = await normalizeArchiveToStoreZipInPlace(payload.sourceArchivePath, {
      webpQuality: payload.webpQuality,
    })
    postResult({ ok: true, outputZipPath: result.outputZipPath })
    process.exit(0)
  } catch (error: unknown) {
    const message = error instanceof Error && error.message ? error.message : String(error)
    postResult({ ok: false, error: message })
    process.exit(1)
  }
}

if (parentPort) {
  void runNormalize(workerData)
} else {
  const messageTimeout = setTimeout(() => {
    postResult({ ok: false, error: 'archive normalization process worker missing payload message' })
    process.exit(1)
  }, 5_000)
  messageTimeout.unref?.()

  process.once('message', (message) => {
    clearTimeout(messageTimeout)
    void runNormalize(message)
  })
}
