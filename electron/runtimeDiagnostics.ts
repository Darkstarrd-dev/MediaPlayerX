import { appendFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'

import { app } from 'electron'

const VERBOSE_DEBUG_ENABLED = /^(1|true|yes)$/i.test((process.env.MEDIA_PLAYERX_DEBUG_DIAGNOSTICS ?? '').trim())

let runtimeLogPathCache: string | null = null

function toErrorObject(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    }
  }

  return {
    value: String(error),
  }
}

function resolveRuntimeLogPath(): string {
  if (runtimeLogPathCache) {
    return runtimeLogPathCache
  }

  const explicitDir = (process.env.MEDIA_PLAYERX_DIAGNOSTICS_DIR ?? '').trim()
  const baseDir = explicitDir.length > 0 ? path.resolve(explicitDir) : path.join(app.getPath('userData'), 'logs')
  mkdirSync(baseDir, { recursive: true })
  runtimeLogPathCache = path.join(baseDir, 'runtime-diagnostics.log')
  return runtimeLogPathCache
}

export function isRuntimeDiagnosticsVerboseEnabled(): boolean {
  return VERBOSE_DEBUG_ENABLED
}

export function getRuntimeDiagnosticsLogPath(): string {
  return resolveRuntimeLogPath()
}

export function logRuntimeDiagnostic(
  event: string,
  payload: Record<string, unknown> = {},
  level: 'info' | 'warn' | 'error' = 'info',
  force = false,
): void {
  if (!force && !VERBOSE_DEBUG_ENABLED) {
    return
  }

  const nowIso = new Date().toISOString()
  const body = {
    timestamp: nowIso,
    pid: process.pid,
    uptime_sec: Number(process.uptime().toFixed(3)),
    event,
    ...payload,
  }

  const line = JSON.stringify(body)

  if (level === 'error') {
    console.error(`[diag] ${event}`, body)
  } else if (level === 'warn') {
    console.warn(`[diag] ${event}`, body)
  } else {
    console.log(`[diag] ${event}`, body)
  }

  try {
    appendFileSync(resolveRuntimeLogPath(), `${line}\n`, 'utf8')
  } catch (error) {
    console.error('[diag] write-failed', toErrorObject(error))
  }
}

export function serializeUnknownError(error: unknown): Record<string, unknown> {
  return toErrorObject(error)
}
