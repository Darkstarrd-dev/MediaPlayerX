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

function toNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function buildRuntimeResourceSnapshot() {
  const processCpuUsage = process.cpuUsage()
  const processMemoryUsage = process.memoryUsage()

  const appMetrics = app.getAppMetrics().map((metric) => {
    const cpu = metric.cpu as { percentCPUUsage?: number; idleWakeupsPerSecond?: number } | undefined
    const memory = metric.memory as
      | {
          workingSetSize?: number
          peakWorkingSetSize?: number
          privateBytes?: number
          sharedBytes?: number
        }
      | undefined

    return {
      pid: metric.pid,
      type: metric.type,
      cpu_percent: toNumber(cpu?.percentCPUUsage),
      idle_wakeups_per_sec: toNumber(cpu?.idleWakeupsPerSecond),
      memory_kb: {
        working_set: toNumber(memory?.workingSetSize),
        peak_working_set: toNumber(memory?.peakWorkingSetSize),
        private_bytes: toNumber(memory?.privateBytes),
        shared_bytes: toNumber(memory?.sharedBytes),
      },
    }
  })

  const summaryByType: Record<string, { count: number; cpu_percent_total: number; working_set_kb_total: number }> = {}
  let cpuPercentTotal = 0
  let workingSetKbTotal = 0
  let peakWorkingSetKbMax = 0

  for (const metric of appMetrics) {
    const type = metric.type
    const cpuPercent = metric.cpu_percent ?? 0
    const workingSet = metric.memory_kb.working_set ?? 0
    const peakWorkingSet = metric.memory_kb.peak_working_set ?? 0

    cpuPercentTotal += cpuPercent
    workingSetKbTotal += workingSet
    peakWorkingSetKbMax = Math.max(peakWorkingSetKbMax, peakWorkingSet)

    const bucket = summaryByType[type] ?? {
      count: 0,
      cpu_percent_total: 0,
      working_set_kb_total: 0,
    }
    bucket.count += 1
    bucket.cpu_percent_total += cpuPercent
    bucket.working_set_kb_total += workingSet
    summaryByType[type] = bucket
  }

  return {
    sampled_at_ms: Date.now(),
    process: {
      cpu_usage_microseconds: {
        user: processCpuUsage.user,
        system: processCpuUsage.system,
      },
      memory_usage_bytes: {
        rss: processMemoryUsage.rss,
        heap_total: processMemoryUsage.heapTotal,
        heap_used: processMemoryUsage.heapUsed,
        external: processMemoryUsage.external,
        array_buffers: processMemoryUsage.arrayBuffers,
      },
    },
    electron: {
      process_count: appMetrics.length,
      cpu_percent_total: Number(cpuPercentTotal.toFixed(3)),
      working_set_kb_total: Number(workingSetKbTotal.toFixed(3)),
      peak_working_set_kb_max: Number(peakWorkingSetKbMax.toFixed(3)),
      by_type: summaryByType,
      metrics: appMetrics,
    },
    system: {
      cpus_count: os.cpus().length,
      loadavg: os.loadavg(),
      totalmem_bytes: os.totalmem(),
      freemem_bytes: os.freemem(),
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
      runtime_resources: buildRuntimeResourceSnapshot(),
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
