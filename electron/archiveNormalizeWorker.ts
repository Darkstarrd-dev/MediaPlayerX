import { parentPort, workerData } from 'node:worker_threads'

import { normalizeArchiveToStoreZipInPlace } from './archiveWasmExtractor'

interface WorkerData {
  sourceArchivePath?: unknown
  webpQuality?: unknown
}

const payload = (workerData ?? {}) as WorkerData
const sourceArchivePath = typeof payload.sourceArchivePath === 'string' ? payload.sourceArchivePath : ''
const webpQuality =
  typeof payload.webpQuality === 'number' && Number.isFinite(payload.webpQuality) ? payload.webpQuality : undefined

if (!parentPort) {
  process.exit(1)
}

if (!sourceArchivePath) {
  parentPort.postMessage({ ok: false, error: 'archive normalization worker missing sourceArchivePath' })
  process.exit(1)
}

void normalizeArchiveToStoreZipInPlace(sourceArchivePath, {
  webpQuality,
})
  .then((result) => {
    parentPort.postMessage({ ok: true, outputZipPath: result.outputZipPath })
    process.exit(0)
  })
  .catch((error: unknown) => {
    const message = error instanceof Error && error.message ? error.message : String(error)
    parentPort.postMessage({ ok: false, error: message })
    process.exit(1)
  })
