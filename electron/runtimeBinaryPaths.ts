import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

const MPV_ENV_KEYS = ['MPX_MPV_BIN', 'MEDIA_PLAYERX_MPV_BIN'] as const
const FFMPEG_ENV_KEYS = ['MPX_FFMPEG_BIN', 'MEDIA_PLAYERX_FFMPEG_BIN'] as const
const FFPROBE_ENV_KEYS = ['MPX_FFPROBE_BIN', 'MEDIA_PLAYERX_FFPROBE_BIN'] as const

function resolveExecutableName(baseName: string): string {
  return process.platform === 'win32' ? `${baseName}.exe` : baseName
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
    path.join(process.resourcesPath, 'vendor', 'mpv', resolveExecutableName('mpv')),
    path.join(process.resourcesPath, 'vendor', 'mpv', 'win32-x64', resolveExecutableName('mpv')),
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

  const candidate = path.join(resolvedDir, resolveExecutableName('mpv'))
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

  const devCandidate = path.resolve(projectRoot, 'vendor', 'mpv', 'win32-x64', resolveExecutableName('mpv'))
  return fs.existsSync(devCandidate) ? devCandidate : null
}

function resolvePackagedVendorBinaryPath(vendorDir: string, executableName: string): string | null {
  const candidates = [
    path.join(process.resourcesPath, 'vendor', vendorDir, executableName),
    path.join(process.resourcesPath, 'vendor', vendorDir, 'win32-x64', executableName),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }
  return null
}

function resolveDevVendorBinaryPath(
  projectRoot: string,
  vendorDir: string,
  executableName: string,
): string | null {
  const candidate = path.resolve(projectRoot, 'vendor', vendorDir, 'win32-x64', executableName)
  return fs.existsSync(candidate) ? candidate : null
}

function resolveVendorBinaryPath(
  envKeys: readonly string[],
  vendorDir: string,
  executableName: string,
  projectRoot: string,
): string | null {
  for (const key of envKeys) {
    const resolved = resolveExistingAbsolutePath(process.env[key])
    if (resolved) {
      return resolved
    }
  }

  if (app?.isPackaged) {
    return resolvePackagedVendorBinaryPath(vendorDir, executableName)
  }

  return resolveDevVendorBinaryPath(projectRoot, vendorDir, executableName)
}

export function resolveFfmpegBinPath(projectRoot: string = process.cwd()): string | null {
  return resolveVendorBinaryPath(
    FFMPEG_ENV_KEYS,
    'ffmpeg',
    resolveExecutableName('ffmpeg'),
    projectRoot,
  )
}

export function resolveFfprobeBinPath(projectRoot: string = process.cwd()): string | null {
  return resolveVendorBinaryPath(
    FFPROBE_ENV_KEYS,
    'ffmpeg',
    resolveExecutableName('ffprobe'),
    projectRoot,
  )
}
