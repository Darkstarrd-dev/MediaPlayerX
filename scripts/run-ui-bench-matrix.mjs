#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

function parseArgs(argv) {
  const args = {}
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) {
      continue
    }
    const key = token.slice(2)
    const next = argv[index + 1]
    if (!next || next.startsWith('--')) {
      args[key] = true
      continue
    }
    args[key] = next
    index += 1
  }
  return args
}

function resolveNpmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm'
}

function defaultRunsRoot(sharedLibraryRoot) {
  // IMPORTANT: runs root must NOT be inside the template root.
  // When we run with import stress, reusing a single library root causes cumulative growth
  // (re-importing the same folder over and over) and can crash Electron/native deps.
  // Using a sibling runs directory keeps each run isolated and reproducible.
  return path.resolve(`${sharedLibraryRoot}-matrix-runs`)
}

function shouldCopyFromTemplate(templateRoot, destRoot, relativePath) {
  // Avoid copying heavyweight caches to keep runs fast and consistent.
  // NOTE: relativePath uses platform separators.
  const rel = relativePath.split(path.sep).join('/')
  if (rel.startsWith('.mediaplayerx/thumbnail-cache/')) {
    return false
  }
  if (rel.startsWith('.mediaplayerx/normalized-archives/')) {
    return false
  }

  // Defensive: never copy runs root into a run.
  const destName = path.basename(destRoot)
  if (destName && rel.startsWith(`${destName}/`)) {
    return false
  }

  // Defensive: never copy template root into itself.
  const templateName = path.basename(templateRoot)
  if (templateName && rel.startsWith(`${templateName}/`)) {
    return false
  }

  return true
}

async function cloneLibraryTemplate(templateRoot, destRoot) {
  await rm(destRoot, { recursive: true, force: true })
  await mkdir(destRoot, { recursive: true })
  await cp(templateRoot, destRoot, {
    recursive: true,
    force: true,
    errorOnExist: false,
    filter: (sourcePath) => {
      const relative = path.relative(templateRoot, sourcePath)
      if (!relative || relative === '.') {
        return true
      }
      return shouldCopyFromTemplate(templateRoot, destRoot, relative)
    },
  })
}

async function runCommand(projectRoot, command, args, env) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      windowsHide: true,
    })
    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0) {
        resolve(undefined)
        return
      }
      reject(new Error(`command failed: ${command} ${args.join(' ')} (exit ${code ?? 'null'})`))
    })
  })
}

function buildRunTag() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function safeRunTag(base, index) {
  return `${base}-m${String(index).padStart(2, '0')}`
}

function numberOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function pickMark(marks, name) {
  if (!Array.isArray(marks)) {
    return null
  }
  const item = marks.find((m) => m && m.name === name)
  return item && typeof item.at_perf_ms === 'number' ? item.at_perf_ms : null
}

function extractDomDuration(report) {
  const t0 = pickMark(report?.marks, 'dom_placeholders_committed')
  const t1 = pickMark(report?.marks, 'dom_all_thumbnail_urls_applied')
  if (typeof t0 !== 'number' || typeof t1 !== 'number') {
    return null
  }
  return t1 - t0
}

function extractE2eNavP95(report) {
  return numberOrNull(report?.e2e?.nav?.data_commit_latency_ms?.p95_ms)
}

function extractRafP99(report) {
  return numberOrNull(report?.raf_gap_ms?.p99_ms)
}

const projectRoot = process.cwd()
const args = parseArgs(process.argv.slice(2))

const outDir = path.resolve(String(args['out-dir'] ?? path.join(projectRoot, 'docs', 'perf', 'ui-runs')))
const bench = String(args.bench ?? 'all').trim().toLowerCase()
const importPath = String(args['import-path'] ?? 'Z:/PureBenchFolder03')
const browseSteps = args['browse-steps'] ? Number(args['browse-steps']) : undefined
const skipBuild = Boolean(args['skip-build'])
const importEachRun = Boolean(args['import-each-run'])
const skipSeed = Boolean(args['skip-seed'])
const seedMaxDurationMs = args['seed-max-duration-ms'] ? Number(args['seed-max-duration-ms']) : 20 * 60_000
const sharedLibraryRoot = path.resolve(String(args['shared-library-root'] ?? path.join(projectRoot, 'library-bench-shared')))
const templateLibraryRoot = path.resolve(String(args['template-library-root'] ?? sharedLibraryRoot))
const runsRoot = path.resolve(String(args['runs-root'] ?? defaultRunsRoot(sharedLibraryRoot)))
const isolateLibraryPerRun = Boolean(args['isolate-library-per-run']) || importEachRun

await mkdir(outDir, { recursive: true })
await mkdir(sharedLibraryRoot, { recursive: true })
await mkdir(runsRoot, { recursive: true })

const distOk = existsSync(path.join(projectRoot, 'dist', 'index.html'))
const electronOk = existsSync(path.join(projectRoot, 'dist-electron', 'main.cjs'))
if (!skipBuild && (!distOk || !electronOk)) {
  const npm = resolveNpmCommand()
  await runCommand(projectRoot, npm, ['run', 'desktop:build'], process.env)
}

const resolvedMediaCandidates = [
  {
    id: 'R0',
    resolvedMedia: { applyMode: 'immediate', stateScope: 'accumulate' },
  },
  {
    id: 'R1',
    resolvedMedia: { applyMode: 'immediate', stateScope: 'active-only' },
  },
  {
    id: 'R2',
    resolvedMedia: { applyMode: 'raf', stateScope: 'active-only' },
  },
  {
    id: 'R3',
    resolvedMedia: { applyMode: 'raf', stateScope: 'active-only', maxConcurrent: 4 },
  },
]

const skeletonModes = ['off', 'replace']

const runBaseTag = buildRunTag()
const allRuns = []

const runOne = async ({ mode, candidateId, config, runIndex, libraryRoot, templateRoot, e2eArgs = {} }) => {
  const runTag = safeRunTag(runBaseTag, runIndex)
  let resolvedLibraryRoot = libraryRoot ?? path.join(projectRoot, 'library-bench-matrix', mode, candidateId)

  if (mode === 'e2e' && isolateLibraryPerRun) {
    const base = path.join(runsRoot, 'e2e', candidateId)
    resolvedLibraryRoot = path.join(base, runTag)

    if (!templateRoot) {
      throw new Error('missing templateRoot for isolated e2e run')
    }
    if (path.resolve(templateRoot) === path.resolve(resolvedLibraryRoot)) {
      throw new Error(`templateRoot must differ from run root: ${templateRoot}`)
    }

    const templateOk = existsSync(path.join(templateRoot, '.mediaplayerx'))
    if (!templateOk) {
      throw new Error(
        `template library root missing .mediaplayerx: ${templateRoot} (rerun without --skip-seed or pass --template-library-root)`
      )
    }

    await mkdir(base, { recursive: true })
    await cloneLibraryTemplate(templateRoot, resolvedLibraryRoot)
  } else {
    await mkdir(resolvedLibraryRoot, { recursive: true })
  }

  const childArgs = [
    'scripts/run-ui-bench.mjs',
    '--skip-build',
    '1',
    '--mode',
    mode,
    '--candidate-id',
    candidateId,
    '--run-tag',
    runTag,
    '--out-dir',
    outDir,
    '--library-root',
    resolvedLibraryRoot,
    '--apply-mode',
    config.resolvedMedia?.applyMode ?? 'immediate',
    '--state-scope',
    config.resolvedMedia?.stateScope ?? 'accumulate',
    '--skeleton',
    config.imageLoadingSkeleton?.mode ?? 'off',
  ]
  if (typeof config.resolvedMedia?.maxConcurrent === 'number') {
    childArgs.push('--max-concurrent', String(config.resolvedMedia.maxConcurrent))
  }
  if (mode === 'e2e') {
    if (typeof e2eArgs.importPath === 'string' && e2eArgs.importPath.trim().length > 0) {
      childArgs.push('--import-path', String(e2eArgs.importPath))
    }
    if (typeof e2eArgs.browseSteps === 'number' && Number.isFinite(e2eArgs.browseSteps)) {
      childArgs.push('--browse-steps', String(e2eArgs.browseSteps))
    }
    if (typeof e2eArgs.maxDurationMs === 'number' && Number.isFinite(e2eArgs.maxDurationMs)) {
      childArgs.push('--max-duration-ms', String(e2eArgs.maxDurationMs))
    }
  }

  await runCommand(projectRoot, process.execPath, childArgs, process.env)
  const expectedPath = path.join(outDir, `ui-${mode}-${candidateId}-${runTag}.json`)
  const raw = await readFile(expectedPath, 'utf8')
  const report = JSON.parse(raw)
  return { mode, candidateId, runTag, expectedPath, report }
}

let runIndex = 1

if (bench === 'dom' || bench === 'all') {
  for (const candidate of resolvedMediaCandidates) {
    const config = {
      candidateId: candidate.id,
      runTag: null,
      reactProfiler: true,
      resolvedMedia: candidate.resolvedMedia,
      imageLoadingSkeleton: { mode: 'off' },
      dom: { targetCount: 240, resolveDelayMinMs: 5, resolveDelayMaxMs: 35 },
    }
    process.stdout.write(`\n[UI-Matrix] dom ${candidate.id}\n`)
    const result = await runOne({ mode: 'dom', candidateId: candidate.id, config, runIndex })
    allRuns.push(result)
    runIndex += 1
  }
}

if (bench === 'e2e' || bench === 'all') {
  if (!skipSeed) {
    process.stdout.write(`\n[UI-Matrix] e2e seed (import only)\n`)
    const seedConfig = {
      resolvedMedia: resolvedMediaCandidates[0]?.resolvedMedia ?? { applyMode: 'immediate', stateScope: 'accumulate' },
      imageLoadingSkeleton: { mode: 'off' },
    }
    const result = await runOne({
      mode: 'e2e',
      candidateId: 'SEED',
      config: seedConfig,
      runIndex,
      libraryRoot: templateLibraryRoot,
      templateRoot: null,
      e2eArgs: {
        importPath,
        browseSteps: 0,
        maxDurationMs: seedMaxDurationMs,
      },
    })
    allRuns.push(result)
    runIndex += 1
  }

  for (const candidate of resolvedMediaCandidates) {
    for (const skeleton of skeletonModes) {
      const config = {
        candidateId: `${candidate.id}-S${skeleton === 'replace' ? '1' : '0'}`,
        runTag: null,
        reactProfiler: true,
        resolvedMedia: candidate.resolvedMedia,
        imageLoadingSkeleton: { mode: skeleton },
      }
      process.stdout.write(`\n[UI-Matrix] e2e ${config.candidateId}\n`)
      const result = await runOne({
        mode: 'e2e',
        candidateId: config.candidateId,
        config,
        runIndex,
        // When import is enabled, isolate runs by cloning from template.
        // Otherwise keep old behavior (reuse shared root) for speed.
        libraryRoot: isolateLibraryPerRun ? null : sharedLibraryRoot,
        templateRoot: isolateLibraryPerRun ? templateLibraryRoot : null,
        e2eArgs: {
          importPath: importEachRun ? importPath : null,
          browseSteps: typeof browseSteps === 'number' && Number.isFinite(browseSteps) ? browseSteps : 10,
        },
      })
      allRuns.push(result)
      runIndex += 1
    }
  }
}

const summaries = allRuns.map((item) => {
  const report = item.report
  return {
    mode: item.mode,
    candidate_id: item.candidateId,
    run_tag: item.runTag,
    raf_p99_ms: extractRafP99(report),
    dom_all_urls_ms: item.mode === 'dom' ? extractDomDuration(report) : null,
    e2e_nav_p95_ms: item.mode === 'e2e' ? extractE2eNavP95(report) : null,
    output_path: item.expectedPath,
  }
})

const domRanked = summaries
  .filter((item) => item.mode === 'dom')
  .sort((a, b) => (a.raf_p99_ms ?? Number.POSITIVE_INFINITY) - (b.raf_p99_ms ?? Number.POSITIVE_INFINITY))

const e2eRanked = summaries
  .filter((item) => item.mode === 'e2e' && item.candidate_id !== 'SEED')
  .sort((a, b) => {
    const rafDiff = (a.raf_p99_ms ?? Number.POSITIVE_INFINITY) - (b.raf_p99_ms ?? Number.POSITIVE_INFINITY)
    if (Math.abs(rafDiff) > 0.0001) {
      return rafDiff
    }
    return (a.e2e_nav_p95_ms ?? Number.POSITIVE_INFINITY) - (b.e2e_nav_p95_ms ?? Number.POSITIVE_INFINITY)
  })

const matrix = {
  generated_at_ms: Date.now(),
  run_tag_base: runBaseTag,
  out_dir: outDir,
  summaries,
  ranked: {
    dom: domRanked,
    e2e: e2eRanked,
  },
}

const matrixPath = path.join(outDir, `matrix-ui-${runBaseTag}.json`)
await writeFile(matrixPath, JSON.stringify(matrix, null, 2), 'utf8')
process.stdout.write(`\nUI matrix written: ${matrixPath}\n`)
