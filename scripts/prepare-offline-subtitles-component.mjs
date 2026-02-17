import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REQUIRED_PACKAGE = 'sherpa-onnx-node'
const SHERPA_PACKAGE_PREFIX = 'sherpa-onnx-'

function resolveDefaultProjectRoot() {
  const scriptPath = fileURLToPath(import.meta.url)
  return path.resolve(path.dirname(scriptPath), '..')
}

function ensureDirectoryEmpty(dirPath) {
  rmSync(dirPath, { recursive: true, force: true })
  mkdirSync(dirPath, { recursive: true })
}

function listSherpaPackages(nodeModulesRoot) {
  const entries = readdirSync(nodeModulesRoot, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name === REQUIRED_PACKAGE || name.startsWith(SHERPA_PACKAGE_PREFIX))
}

export function prepareOfflineSubtitlesComponent(projectRoot = resolveDefaultProjectRoot()) {
  const nodeModulesRoot = path.join(projectRoot, 'node_modules')
  const sourceRequiredPackage = path.join(nodeModulesRoot, REQUIRED_PACKAGE)
  const componentRoot = path.join(projectRoot, 'release', 'offline-subtitles-component')
  const componentNodeModulesRoot = path.join(componentRoot, 'node_modules')

  if (!existsSync(sourceRequiredPackage)) {
    ensureDirectoryEmpty(componentRoot)
    return {
      prepared: false,
      componentRoot,
      copiedPackages: [],
      reason: `${REQUIRED_PACKAGE} is not installed in node_modules`,
    }
  }

  ensureDirectoryEmpty(componentNodeModulesRoot)

  const copiedPackages = listSherpaPackages(nodeModulesRoot)
  for (const packageName of copiedPackages) {
    cpSync(path.join(nodeModulesRoot, packageName), path.join(componentNodeModulesRoot, packageName), {
      recursive: true,
      force: true,
    })
  }

  writeFileSync(
    path.join(componentRoot, 'package.json'),
    `${JSON.stringify(
      {
        name: 'mediaplayerx-offline-subtitles-component',
        private: true,
        version: '0.0.0',
      },
      null,
      2,
    )}\n`,
    'utf8',
  )

  writeFileSync(
    path.join(componentRoot, 'component-manifest.json'),
    `${JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        copied_packages: copiedPackages,
      },
      null,
      2,
    )}\n`,
    'utf8',
  )

  return {
    prepared: true,
    componentRoot,
    copiedPackages,
    reason: null,
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = prepareOfflineSubtitlesComponent()
  if (!result.prepared) {
    console.warn(`[offline-subtitles] skipped: ${result.reason}`)
    process.exit(0)
  }

  console.log('[offline-subtitles] prepared component payload')
  console.log(`- root: ${result.componentRoot}`)
  console.log(`- packages: ${result.copiedPackages.join(', ')}`)
}
