import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

const MPV_ENV_KEYS = ['MPX_MPV_BIN', 'MEDIA_PLAYERX_MPV_BIN'] as const

function resolveMpvExecutableName(): string {
  return process.platform === 'win32' ? 'mpv.exe' : 'mpv'
}

function resolveExistingAbsolutePath(rawValue: string | undefined): string | null {
  const value = (rawValue ?? '').trim()
  if (!value) {
    return null
  }

  const resolved = path.resolve(value)
  if (!fs.existsSync(resolved)) {
    return null
  }

  try {
    return fs.statSync(resolved).isFile() ? resolved : null
  } catch {
    return null
  }
}

function resolvePackagedMpvPath(): string | null {
  const candidates = [
    path.join(process.resourcesPath, 'vendor', 'mpv', resolveMpvExecutableName()),
    path.join(process.resourcesPath, 'vendor', 'mpv', 'win32-x64', resolveMpvExecutableName()),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return null
}

export function resolveMpvBinPathFromDirectory(directoryPath: string): string | null {
  const normalized = directoryPath.trim()
  if (!normalized) {
    return null
  }

  const resolvedDir = path.resolve(normalized)
  if (!fs.existsSync(resolvedDir)) {
    return null
  }

  const candidate = path.join(resolvedDir, resolveMpvExecutableName())
  if (!fs.existsSync(candidate)) {
    return null
  }

  try {
    return fs.statSync(candidate).isFile() ? candidate : null
  } catch {
    return null
  }
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

  const devCandidate = path.resolve(projectRoot, 'vendor', 'mpv', 'win32-x64', resolveMpvExecutableName())
  return fs.existsSync(devCandidate) ? devCandidate : null
}
