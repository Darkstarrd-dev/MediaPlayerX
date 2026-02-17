import { existsSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

export type SubtitleEngineSource = 'optional-component' | 'node-modules' | 'none'

export interface SubtitleEngineStatusSnapshot {
  installed: boolean
  loadable: boolean
  optionalComponentInstalled: boolean
  source: SubtitleEngineSource
  moduleRoot: string | null
  optionalComponentRoot: string | null
  providers: {
    cpu: boolean
    directml: boolean
  }
  availableProviders: Array<'cpu' | 'directml'>
  message: string | null
  checkedAtMs: number
}

const DIRECTML_ARTIFACT_NAMES = new Set([
  'onnxruntime_providers_dml.dll',
  'DirectML.dll',
])

const MAX_PROBE_DEPTH = 6

function normalizePathValue(rawPath: string | undefined): string | null {
  if (!rawPath || rawPath.trim().length === 0) {
    return null
  }
  return path.resolve(rawPath.trim())
}

function resolveOptionalComponentRootCandidates(): string[] {
  const byEnv = normalizePathValue(process.env.MEDIA_PLAYERX_SUBTITLE_ENGINE_ROOT)
  const byResourcesPath =
    typeof process.resourcesPath === 'string' && process.resourcesPath.trim().length > 0
      ? path.join(process.resourcesPath, 'optional', 'offline-subtitles')
      : null
  const candidates = [
    byEnv,
    byResourcesPath,
    path.join(process.cwd(), 'resources', 'optional', 'offline-subtitles'),
  ].filter((item): item is string => Boolean(item))

  return Array.from(new Set(candidates))
}

function findFirstExistingDirectory(candidates: string[]): string | null {
  for (const candidate of candidates) {
    try {
      if (existsSync(candidate)) {
        return candidate
      }
    } catch {
      continue
    }
  }

  return null
}

function collectDirectMlArtifacts(searchRoot: string): string[] {
  const found: string[] = []

  const walk = (currentDir: string, depth: number): void => {
    if (depth > MAX_PROBE_DEPTH) {
      return
    }

    let entries: ReturnType<typeof readdirSync>
    try {
      entries = readdirSync(currentDir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        walk(absolutePath, depth + 1)
        continue
      }

      if (DIRECTML_ARTIFACT_NAMES.has(entry.name)) {
        found.push(absolutePath)
      }
    }
  }

  walk(searchRoot, 0)
  return found
}

function tryResolveModuleWithRequire(moduleRequire: NodeRequire): {
  moduleRoot: string
  loadError: string | null
} {
  try {
    const packageJsonPath = moduleRequire.resolve('sherpa-onnx-node/package.json')
    moduleRequire('sherpa-onnx-node')
    return {
      moduleRoot: path.dirname(packageJsonPath),
      loadError: null,
    }
  } catch (error) {
    return {
      moduleRoot: '',
      loadError: error instanceof Error ? error.message : String(error),
    }
  }
}

export function probeSubtitleEngineStatus(): SubtitleEngineStatusSnapshot {
  const optionalComponentRoot = findFirstExistingDirectory(
    resolveOptionalComponentRootCandidates(),
  )

  const localRequire = createRequire(__filename)
  let source: SubtitleEngineSource = 'none'
  let moduleRoot: string | null = null
  let loadError: string | null = null

  if (optionalComponentRoot) {
    const componentPackageJson = path.join(optionalComponentRoot, 'package.json')
    if (existsSync(componentPackageJson)) {
      const componentRequire = createRequire(componentPackageJson)
      const resolved = tryResolveModuleWithRequire(componentRequire)
      if (!resolved.loadError) {
        source = 'optional-component'
        moduleRoot = resolved.moduleRoot
      } else {
        loadError = resolved.loadError
      }
    }
  }

  if (!moduleRoot) {
    const fallbackResolved = tryResolveModuleWithRequire(localRequire)
    if (!fallbackResolved.loadError) {
      source = 'node-modules'
      moduleRoot = fallbackResolved.moduleRoot
      loadError = null
    } else if (!loadError) {
      loadError = fallbackResolved.loadError
    }
  }

  const directmlDetected =
    process.platform === 'win32' &&
    Boolean(moduleRoot) &&
    collectDirectMlArtifacts(moduleRoot).length > 0

  const providers = {
    cpu: Boolean(moduleRoot),
    directml: directmlDetected,
  }

  const availableProviders: Array<'cpu' | 'directml'> = []
  if (providers.cpu) {
    availableProviders.push('cpu')
  }
  if (providers.directml) {
    availableProviders.push('directml')
  }

  return {
    installed: Boolean(moduleRoot),
    loadable: Boolean(moduleRoot),
    optionalComponentInstalled: Boolean(optionalComponentRoot),
    source,
    moduleRoot,
    optionalComponentRoot,
    providers,
    availableProviders,
    message: moduleRoot ? null : loadError,
    checkedAtMs: Date.now(),
  }
}
