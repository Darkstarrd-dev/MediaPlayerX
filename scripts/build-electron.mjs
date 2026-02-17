import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { build, context } from 'esbuild'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const distRoot = path.join(projectRoot, 'dist-electron')
const watchMode = process.argv.includes('--watch')

const buildTargets = [
  {
    entryPoints: ['electron/main.ts'],
    outfile: 'dist-electron/main.cjs',
  },
  {
    entryPoints: ['electron/preload.ts'],
    outfile: 'dist-electron/preload.cjs',
  },
  {
    entryPoints: ['electron/archiveNormalizeWorker.ts'],
    outfile: 'dist-electron/archiveNormalizeWorker.cjs',
  },
  {
    entryPoints: ['electron/subtitles/asrWorker.ts'],
    outfile: 'dist-electron/asrWorker.cjs',
  },
  {
    entryPoints: ['electron/subtitles/subtitlePrecomputeWorker.ts'],
    outfile: 'dist-electron/subtitlePrecomputeWorker.cjs',
  },
]

const sharedOptions = {
  absWorkingDir: projectRoot,
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node22',
  sourcemap: true,
  external: ['electron', 'sharp', 'node-unrar-js', '7z-wasm'],
  logLevel: 'info',
}

await mkdir(distRoot, { recursive: true })

if (!watchMode) {
  await Promise.all(buildTargets.map((item) => build({ ...sharedOptions, ...item })))
  process.exit(0)
}

const contexts = await Promise.all(buildTargets.map((item) => context({ ...sharedOptions, ...item })))
await Promise.all(contexts.map((item) => item.watch()))

console.log('Electron build watch started.')

const shutdown = async () => {
  await Promise.all(contexts.map((item) => item.dispose()))
  process.exit(0)
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
