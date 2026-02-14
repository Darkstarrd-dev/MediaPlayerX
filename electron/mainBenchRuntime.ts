import { app } from 'electron'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

type BenchIdentity = { candidateId: string | null; runTag: string | null }

export function resolveBenchMode(): string | null {
  const value = (process.env.MEDIA_PLAYERX_BENCH ?? '').trim()
  return value.length > 0 ? value : null
}

function resolveBenchOutDir(): string | null {
  const raw = (process.env.MEDIA_PLAYERX_BENCH_OUT_DIR ?? '').trim()
  return raw.length > 0 ? path.resolve(raw) : null
}

function resolveBenchIdentity(): BenchIdentity {
  const raw = (process.env.MEDIA_PLAYERX_BENCH_CONFIG_JSON ?? '').trim()
  if (!raw) {
    return { candidateId: null, runTag: null }
  }

  try {
    const parsed = JSON.parse(raw) as { candidateId?: unknown; runTag?: unknown }
    const candidateId = typeof parsed.candidateId === 'string' ? parsed.candidateId : null
    const runTag = typeof parsed.runTag === 'string' ? parsed.runTag : null
    return { candidateId, runTag }
  } catch {
    return { candidateId: null, runTag: null }
  }
}

export function tryConfigureCrashDumpsDir(): void {
  const benchMode = resolveBenchMode()
  if (!benchMode) {
    return
  }

  const outDir = resolveBenchOutDir()
  if (!outDir) {
    return
  }

  const identity = resolveBenchIdentity()
  const safeCandidate = (identity.candidateId ?? 'unknown').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 64)
  const safeRunTag = (identity.runTag ?? String(Date.now())).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 96)
  const crashDir = path.join(outDir, 'crash-dumps', `${safeCandidate}-${safeRunTag}`)

  try {
    mkdirSync(crashDir, { recursive: true })
    app.setPath('crashDumps', crashDir)
    console.log('[main] crashDumps configured', { crashDir })
  } catch (error) {
    console.warn('[main] crashDumps configure failed', { error: (error as Error).message })
  }
}

export function shouldOpenDevTools(): boolean {
  const raw = (process.env.MEDIA_PLAYERX_BENCH_DEVTOOLS ?? '').trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes'
}
