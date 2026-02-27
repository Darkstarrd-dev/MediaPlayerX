import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

const MPV_ENV_KEYS = ['MPX_MPV_BIN', 'MEDIA_PLAYERX_MPV_BIN'] as const

function resolveExistingAbsolutePath(rawValue: string | undefined): string | null {
  const value = (rawValue ?? '').trim()
  if (!value) {
    return null
  }

  const resolved = path.resolve(value)
  return fs.existsSync(resolved) ? resolved : null
}

function resolvePackagedMpvPath(): string | null {
  const candidates = [
    path.join(process.resourcesPath, 'vendor', 'mpv', 'mpv.exe'),
    path.join(process.resourcesPath, 'vendor', 'mpv', 'win32-x64', 'mpv.exe'),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return null
}

export function resolveMpvBinPath(projectRoot: string = process.cwd()): string | null {
  for (const key of MPV_ENV_KEYS) {
    const resolved = resolveExistingAbsolutePath(process.env[key])
    if (resolved) {
      return resolved
    }
  }

  if (app?.isPackaged) {
    return resolvePackagedMpvPath()
  }

  const devCandidate = path.resolve(projectRoot, 'vendor', 'mpv', 'win32-x64', 'mpv.exe')
  return fs.existsSync(devCandidate) ? devCandidate : null
}
