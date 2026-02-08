import { app, ipcMain } from 'electron'
import os from 'node:os'
import path from 'node:path'
import { promises as fs } from 'node:fs'

import { BENCH_CHANNELS } from './channels'

function parseBenchConfigFromEnv(raw: string | undefined): unknown {
  const value = (raw ?? '').trim()
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as unknown
  } catch {
    return { _error: 'bench_config_json_parse_failed', raw: value.slice(0, 2048) }
  }
}

function resolveBenchOutDir(): string {
  const explicit = (process.env.MEDIA_PLAYERX_BENCH_OUT_DIR ?? '').trim()
  if (explicit) {
    return path.resolve(explicit)
  }

  // In dev, cwd is typically project root.
  return path.resolve(process.cwd(), 'docs', 'perf', 'ui-runs')
}

function safeFilePart(value: string): string {
  const normalized = value.trim().replace(/[^a-zA-Z0-9._-]+/g, '_')
  return normalized.length > 0 ? normalized.slice(0, 96) : 'run'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function buildRuntimeSnapshot() {
  const cpu = os.cpus()[0]
  return {
    platform: process.platform,
    arch: process.arch,
    node: process.versions.node,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    v8: process.versions.v8,
    os: {
      type: os.type(),
      release: os.release(),
      version: typeof (os as unknown as { version?: () => string }).version === 'function' ? (os as unknown as { version: () => string }).version() : null,
      totalmem_bytes: os.totalmem(),
      cpus: cpu
        ? {
            model: cpu.model,
            speed_mhz: cpu.speed,
            count: os.cpus().length,
          }
        : null,
    },
  }
}

let benchFinishRequested = false

export function registerBenchIpcHandlers(): void {
  ipcMain.handle(BENCH_CHANNELS.readConfig, async () => {
    const bench = (process.env.MEDIA_PLAYERX_BENCH ?? '').trim() || null
    const config = parseBenchConfigFromEnv(process.env.MEDIA_PLAYERX_BENCH_CONFIG_JSON)
    return {
      bench,
      config,
      read_at_ms: Date.now(),
    }
  })

  ipcMain.handle(BENCH_CHANNELS.ping, async () => {
    return {
      main_now_ms: Date.now(),
    }
  })

  ipcMain.handle(BENCH_CHANNELS.finish, async (_event, payload: unknown) => {
    const bench = (process.env.MEDIA_PLAYERX_BENCH ?? '').trim() || 'unknown'
    const outDir = resolveBenchOutDir()

    const report = typeof payload === 'object' && payload ? payload : { _error: 'bench_payload_invalid', payload }
    const reportAny = report as Record<string, unknown>
    const benchAny = isRecord(reportAny.bench) ? reportAny.bench : null

    const runTagRaw =
      (typeof reportAny.run_tag === 'string' ? reportAny.run_tag : null) ??
      (typeof reportAny.runTag === 'string' ? reportAny.runTag : null) ??
      (typeof benchAny?.run_tag === 'string' ? benchAny.run_tag : null) ??
      (typeof benchAny?.runTag === 'string' ? benchAny.runTag : null) ??
      new Date().toISOString().replace(/[:.]/g, '-')

    const candidateIdRaw =
      (typeof reportAny.candidate_id === 'string' ? reportAny.candidate_id : null) ??
      (typeof reportAny.candidateId === 'string' ? reportAny.candidateId : null) ??
      (typeof benchAny?.candidate_id === 'string' ? benchAny.candidate_id : null) ??
      (typeof benchAny?.candidateId === 'string' ? benchAny.candidateId : null) ??
      (typeof (reportAny.candidate as Record<string, unknown> | undefined)?.id === 'string'
        ? ((reportAny.candidate as Record<string, unknown>).id as string)
        : null) ??
      'candidate'

    const fileName = `ui-${safeFilePart(bench)}-${safeFilePart(candidateIdRaw)}-${safeFilePart(runTagRaw)}.json`
    const outputPath = path.join(outDir, fileName)

    const enriched = {
      ...report,
      runtime: buildRuntimeSnapshot(),
      persisted_at_ms: Date.now(),
      output_path: outputPath,
    }

    await fs.mkdir(outDir, { recursive: true })
    await fs.writeFile(outputPath, JSON.stringify(enriched, null, 2), 'utf8')

    if (!benchFinishRequested) {
      benchFinishRequested = true
      setTimeout(() => {
        try {
          app.quit()
        } catch {
          // ignore
        }
      }, 50)
    }

    return {
      output_path: outputPath,
    }
  })
}
