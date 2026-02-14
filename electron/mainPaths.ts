import { app } from 'electron'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

function collectAppRootCandidates(): string[] {
  const candidates = new Set<string>()

  try {
    const appPath = app.getAppPath()
    if (appPath.trim().length > 0) {
      candidates.add(path.resolve(appPath))
    }
  } catch {
    // ignore app path probing errors
  }

  const argvEntry = process.argv[1]
  if (typeof argvEntry === 'string' && argvEntry.trim().length > 0) {
    const entryDir = path.dirname(path.resolve(argvEntry))
    candidates.add(path.resolve(entryDir, '..'))
    candidates.add(entryDir)
  }

  candidates.add(path.resolve(process.cwd()))
  return Array.from(candidates)
}

function resolveImageMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()

  if (ext === '.png') {
    return 'image/png'
  }

  if (ext === '.jpg' || ext === '.jpeg') {
    return 'image/jpeg'
  }

  if (ext === '.webp') {
    return 'image/webp'
  }

  if (ext === '.gif') {
    return 'image/gif'
  }

  if (ext === '.svg') {
    return 'image/svg+xml'
  }

  return 'application/octet-stream'
}

function resolveImageDataUrl(filePath: string): string | null {
  try {
    const buffer = readFileSync(filePath)
    if (buffer.length === 0) {
      return null
    }

    const mimeType = resolveImageMimeType(filePath)
    return `data:${mimeType};base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
}

export function resolveStartupSplashBannerSrc(): string | null {
  const explicitPath = (process.env.MEDIA_PLAYERX_SPLASH_BANNER_PATH ?? '').trim()
  if (explicitPath.length > 0) {
    const resolvedExplicitPath = path.resolve(explicitPath)
    if (existsSync(resolvedExplicitPath)) {
      const explicitDataUrl = resolveImageDataUrl(resolvedExplicitPath)
      if (explicitDataUrl) {
        return explicitDataUrl
      }
    }
  }

  const relativeCandidates = [
    ['src', 'assets', 'banner.png'],
    ['..', 'src', 'assets', 'banner.png'],
  ] as const

  for (const root of collectAppRootCandidates()) {
    for (const relativeCandidate of relativeCandidates) {
      const candidate = path.resolve(root, ...relativeCandidate)
      if (existsSync(candidate)) {
        const dataUrl = resolveImageDataUrl(candidate)
        if (dataUrl) {
          return dataUrl
        }
      }
    }
  }

  return null
}

export function resolveAppWindowIconPath(): string | null {
  const explicitIconPath = (process.env.MEDIA_PLAYERX_APP_ICON_PATH ?? '').trim()
  if (explicitIconPath.length > 0) {
    const resolvedExplicitPath = path.isAbsolute(explicitIconPath)
      ? explicitIconPath
      : path.resolve(process.cwd(), explicitIconPath)
    if (existsSync(resolvedExplicitPath)) {
      return resolvedExplicitPath
    }
  }

  const platformIconCandidates =
    process.platform === 'win32'
      ? ['build/icons/icon.ico', 'build/icons/256x256.png', 'src/assets/icon.png']
      : process.platform === 'darwin'
        ? ['build/icons/icon.icns', 'build/icons/512x512.png', 'src/assets/icon.png']
        : ['build/icons/512x512.png', 'build/icons/256x256.png', 'src/assets/icon.png']

  for (const rootPath of collectAppRootCandidates()) {
    for (const relativePath of platformIconCandidates) {
      const candidatePath = path.resolve(rootPath, relativePath)
      if (existsSync(candidatePath)) {
        return candidatePath
      }
    }
  }

  return null
}

export function resolveRendererEntry(): { type: 'url' | 'file'; value: string } {
  if (process.env.VITE_DEV_SERVER_URL) {
    return {
      type: 'url',
      value: process.env.VITE_DEV_SERVER_URL,
    }
  }

  const rendererRelativeCandidates = [
    ['dist', 'index.html'],
    ['..', 'dist', 'index.html'],
  ] as const

  for (const root of collectAppRootCandidates()) {
    for (const relativeCandidate of rendererRelativeCandidates) {
      const candidate = path.resolve(root, ...relativeCandidate)
      if (existsSync(candidate)) {
        return {
          type: 'file',
          value: candidate,
        }
      }
    }
  }

  const fallbackRoot = collectAppRootCandidates()[0] ?? path.resolve(process.cwd())

  return {
    type: 'file',
    value: path.join(fallbackRoot, 'dist', 'index.html'),
  }
}

export function resolvePreloadEntry(): string {
  const roots = collectAppRootCandidates()
  const fileNames = ['preload.cjs', 'preload.js', 'preload.ts']
  const relativeDirs = ['dist-electron', '']

  for (const root of roots) {
    for (const relativeDir of relativeDirs) {
      for (const fileName of fileNames) {
        const resolved = path.join(root, relativeDir, fileName)
        if (existsSync(resolved)) {
          return resolved
        }
      }
    }
  }

  const fallbackRoot = roots[0] ?? path.resolve(process.cwd())
  return path.join(fallbackRoot, 'dist-electron', 'preload.cjs')
}
