import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const scriptFilePath = fileURLToPath(import.meta.url)
const scriptDir = path.dirname(scriptFilePath)
const projectRoot = path.resolve(scriptDir, '..')
const projectRequire = createRequire(path.join(projectRoot, 'package.json'))

const DIRECTML_ARTIFACT_NAMES = [
  'onnxruntime_providers_dml.dll',
  'DirectML.dll',
]

function hasValue(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizePathValue(rawPath) {
  return hasValue(rawPath) ? path.resolve(rawPath.trim()) : null
}

function resolveOptionalEngineRoots() {
  const envRoot = normalizePathValue(process.env.MEDIA_PLAYERX_SUBTITLE_ENGINE_ROOT)
  const candidates = [
    envRoot,
    path.join(projectRoot, 'resources', 'optional', 'offline-subtitles'),
    path.join(projectRoot, 'release', 'win-unpacked', 'resources', 'optional', 'offline-subtitles'),
  ].filter((item) => Boolean(item))

  return Array.from(new Set(candidates))
}

function safeStat(absolutePath) {
  try {
    return statSync(absolutePath)
  } catch {
    return null
  }
}

function resolveSherpaPackageRoot() {
  try {
    const packageJsonPath = projectRequire.resolve('sherpa-onnx-node/package.json')
    return path.dirname(packageJsonPath)
  } catch {
    return null
  }
}

function collectDirectMlArtifacts(rootDir, maxDepth = 5) {
  const found = []

  const visit = (currentDir, depth) => {
    if (depth > maxDepth) {
      return
    }

    let entries
    try {
      entries = readdirSync(currentDir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        visit(absolutePath, depth + 1)
        continue
      }

      if (DIRECTML_ARTIFACT_NAMES.includes(entry.name)) {
        found.push(absolutePath)
      }
    }
  }

  visit(rootDir, 0)
  return found
}

function resolveJsonOutputPath(argv) {
  const flagIndex = argv.indexOf('--json-out')
  if (flagIndex < 0) {
    return null
  }

  const value = argv[flagIndex + 1]
  if (!hasValue(value)) {
    throw new Error('Missing value for --json-out')
  }

  return path.resolve(value)
}

function formatBytes(value) {
  if (!Number.isFinite(value) || value < 0) {
    return 'n/a'
  }

  const units = ['B', 'KB', 'MB', 'GB']
  let amount = value
  let unitIndex = 0
  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024
    unitIndex += 1
  }

  return `${amount.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`
}

function buildProbeReport() {
  const optionalRoots = resolveOptionalEngineRoots()
  const optionalRootsState = optionalRoots.map((absolutePath) => {
    const stats = safeStat(absolutePath)
    return {
      path: absolutePath,
      exists: Boolean(stats?.isDirectory()),
    }
  })

  let moduleLoadError = null
  let moduleExports = []
  const sherpaPackageRoot = resolveSherpaPackageRoot()

  try {
    const moduleValue = projectRequire('sherpa-onnx-node')
    moduleExports = Object.keys(moduleValue ?? {})
  } catch (error) {
    moduleLoadError = error instanceof Error ? error.message : String(error)
  }

  const directMlArtifacts = sherpaPackageRoot
    ? collectDirectMlArtifacts(sherpaPackageRoot)
    : []

  const firstExistingOptionalRoot = optionalRootsState.find((item) => item.exists) ?? null

  return {
    generatedAt: new Date().toISOString(),
    environment: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      osRelease: os.release(),
    },
    optionalEngineRoots: optionalRootsState,
    sherpaOnnxNode: {
      installedInNodeModules: Boolean(sherpaPackageRoot),
      packageRoot: sherpaPackageRoot,
      loadable: moduleLoadError === null,
      loadError: moduleLoadError,
      exports: moduleExports,
    },
    providerProbe: {
      cpuCandidate: moduleLoadError === null,
      directMlCandidate: process.platform === 'win32' && directMlArtifacts.length > 0,
      directMlArtifacts,
    },
    phase0Gate: {
      canRunEngineSmokeTest: moduleLoadError === null,
      blockedByMissingModule: moduleLoadError !== null,
      notes: [
        moduleLoadError
          ? 'sherpa-onnx-node not loadable; engine smoke test is blocked until optional component or dependency is present.'
          : 'sherpa-onnx-node loadable; continue with model-level smoke test.',
        firstExistingOptionalRoot
          ? `optional engine root detected: ${firstExistingOptionalRoot.path}`
          : 'optional engine root not found in default paths; expected before installer integration validation.',
      ],
    },
  }
}

function printReport(report) {
  const packageRoot = report.sherpaOnnxNode.packageRoot ?? 'n/a'
  const loadStatus = report.sherpaOnnxNode.loadable ? 'ok' : 'failed'
  const directMlStatus = report.providerProbe.directMlCandidate ? 'candidate' : 'not-detected'

  console.log('[subtitle-phase0] environment')
  console.log(`- platform: ${report.environment.platform}`)
  console.log(`- arch: ${report.environment.arch}`)
  console.log(`- node: ${report.environment.nodeVersion}`)
  console.log(`- os: ${report.environment.osRelease}`)
  console.log('')

  console.log('[subtitle-phase0] sherpa-onnx-node')
  console.log(`- package root: ${packageRoot}`)
  console.log(`- load status: ${loadStatus}`)
  if (report.sherpaOnnxNode.loadError) {
    console.log(`- load error: ${report.sherpaOnnxNode.loadError}`)
  }
  if (report.sherpaOnnxNode.exports.length > 0) {
    console.log(`- exports: ${report.sherpaOnnxNode.exports.join(', ')}`)
  }
  console.log('')

  console.log('[subtitle-phase0] provider probe')
  console.log(`- cpu candidate: ${report.providerProbe.cpuCandidate ? 'yes' : 'no'}`)
  console.log(`- directml candidate: ${directMlStatus}`)
  for (const artifactPath of report.providerProbe.directMlArtifacts) {
    const bytes = safeStat(artifactPath)?.size ?? NaN
    console.log(`  - ${artifactPath} (${formatBytes(bytes)})`)
  }
  console.log('')

  console.log('[subtitle-phase0] gate')
  for (const note of report.phase0Gate.notes) {
    console.log(`- ${note}`)
  }
}

function main() {
  const jsonOutputPath = resolveJsonOutputPath(process.argv.slice(2))
  const report = buildProbeReport()
  printReport(report)

  if (jsonOutputPath) {
    writeFileSync(jsonOutputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    console.log(`\n[subtitle-phase0] report written: ${jsonOutputPath}`)
  }

  if (report.phase0Gate.blockedByMissingModule) {
    process.exitCode = 2
  }
}

try {
  main()
} catch (error) {
  console.error('[subtitle-phase0] fatal', error)
  process.exit(1)
}
