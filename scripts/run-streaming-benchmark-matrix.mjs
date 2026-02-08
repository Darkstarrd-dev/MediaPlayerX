#!/usr/bin/env node

import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { promises as fs } from 'node:fs'

const UI_MAX_GAP_THRESHOLD_MS = 500
const RUNS_PER_MODE = 3

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

function quantile(values, q) {
  if (values.length === 0) {
    return null
  }
  const sorted = [...values].sort((a, b) => a - b)
  const position = (sorted.length - 1) * q
  const base = Math.floor(position)
  const rest = position - base
  if (sorted[base + 1] === undefined) {
    return sorted[base]
  }
  return sorted[base] + rest * (sorted[base + 1] - sorted[base])
}

function median(values) {
  return quantile(values, 0.5)
}

function iqr(values) {
  const q1 = quantile(values, 0.25)
  const q3 = quantile(values, 0.75)
  if (q1 === null || q3 === null) {
    return null
  }
  return q3 - q1
}

function formatNumber(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return null
  }
  return Number(value.toFixed(digits))
}

function toPosix(value) {
  return value.split(path.sep).join('/')
}

async function runProcess(command, args, options = {}) {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      const text = String(chunk)
      stdout += text
      process.stdout.write(text)
    })
    child.stderr.on('data', (chunk) => {
      const text = String(chunk)
      stderr += text
      process.stderr.write(text)
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `process_exit_${code}`))
        return
      }
      resolve({ stdout, stderr })
    })
  })
}

function buildComboDefinitions() {
  return [
    {
      comboId: 'C1',
      root: 'Z:/PureBenchFolder01',
      fsStrategy: 'readdir',
      zipStrategy: 'central',
      dbStrategy: 'sqlite',
      queuePolicy: 'Q1',
    },
    {
      comboId: 'C2',
      root: 'Z:/PureBenchFolder02',
      fsStrategy: 'readdir',
      zipStrategy: 'powershell',
      dbStrategy: 'sqlite',
      queuePolicy: 'Q1',
    },
    {
      comboId: 'C3',
      root: 'Z:/PureBenchFolder03',
      fsStrategy: 'opendir',
      zipStrategy: 'central',
      dbStrategy: 'sqlite',
      queuePolicy: 'Q1',
    },
    {
      comboId: 'C5',
      root: 'Z:/PureBenchFolder01',
      fsStrategy: 'readdir',
      zipStrategy: 'central',
      dbStrategy: 'sqlite',
      queuePolicy: 'Q2',
    },
    {
      comboId: 'C6',
      root: 'Z:/PureBenchFolder02',
      fsStrategy: 'readdir',
      zipStrategy: 'node-stream-zip',
      dbStrategy: 'sqlite',
      queuePolicy: 'Q1',
    },
    {
      comboId: 'C7',
      root: 'Z:/PureBenchFolder02',
      fsStrategy: 'readdir',
      zipStrategy: 'yauzl',
      dbStrategy: 'sqlite',
      queuePolicy: 'Q1',
    },
    {
      comboId: 'C8',
      root: 'Z:/PureBenchFolder03',
      fsStrategy: 'readdir',
      zipStrategy: 'central',
      dbStrategy: 'better-sqlite3-worker',
      queuePolicy: 'Q1',
    },
  ]
}

function collectMetrics(results) {
  const keys = [
    'TTFS_ms',
    'TTFI_ms',
    'TTFT_ms',
    'TTFP20_ms',
    'TTFV0_ms',
    'TTFVM_ms',
    'focusLatency_1_ms',
    'focusLatency_20_ms',
    'eventLoopLag_p99_ms',
    'UI_max_gap_ms',
    'scan_files_per_sec',
    'zip_entries_per_sec',
  ]

  const summary = {}
  for (const key of keys) {
    const values = results
      .map((item) => item.metrics[key])
      .filter((value) => typeof value === 'number' && Number.isFinite(value))
    summary[key] = {
      median: values.length > 0 ? formatNumber(median(values), 3) : null,
      iqr: values.length > 0 ? formatNumber(iqr(values), 3) : null,
      values: values.map((value) => formatNumber(value, 3)),
    }
  }

  return summary
}

function evaluateGate(results) {
  const total = results.length
  const passCount = results.filter((item) => {
    const uiGap = item.metrics.UI_max_gap_ms
    return typeof uiGap === 'number' && uiGap < UI_MAX_GAP_THRESHOLD_MS
  }).length

  return {
    total,
    passCount,
    passRate: total > 0 ? formatNumber(passCount / total, 4) : 0,
    passed: total > 0 && passCount === total,
  }
}

async function executeSingleRun({ combo, mode, runIndex, repoRoot, stateRootBase, env }) {
  const runTag = `${combo.comboId}-r${runIndex}-${mode}-${Date.now()}`
  const stateId = `${combo.comboId}-r${runIndex}`

  const args = [
    'scripts/streaming-ingest-benchmark.mjs',
    '--combo',
    combo.comboId,
    '--mode',
    mode,
    '--root',
    combo.root,
    '--state-root',
    stateRootBase,
    '--state-id',
    stateId,
    '--run-tag',
    runTag,
    '--fs-strategy',
    combo.fsStrategy,
    '--zip-strategy',
    combo.zipStrategy,
    '--db-strategy',
    combo.dbStrategy,
    '--queue-policy',
    combo.queuePolicy,
    '--scan-concurrency',
    '16',
    '--zip-scan-concurrency',
    '10',
    '--thumb-concurrency',
    '6',
    '--video-concurrency',
    '1',
    '--video-probe-limit',
    '3',
    '--background-thumb-limit',
    '240',
    '--maintenance-limit',
    '1',
    '--progress-tick-ms',
    '100',
    '--max-wait-ms',
    '240000',
  ]

  await runProcess('node', args, {
    cwd: repoRoot,
    env,
  })

  const resultPath = path.join(repoRoot, 'docs', 'perf', 'runs', `${combo.comboId}-${mode}-${runTag}`, 'result.json')
  const raw = await fs.readFile(resultPath, 'utf8')
  return JSON.parse(raw)
}

async function executeMaintenanceRun({ combo, mode, repoRoot, stateRootBase, env }) {
  const runTag = `${combo.comboId}-maintenance-${mode}-${Date.now()}`
  const stateId = `${combo.comboId}-maintenance`

  const args = [
    'scripts/streaming-ingest-benchmark.mjs',
    '--combo',
    combo.comboId,
    '--mode',
    mode,
    '--root',
    combo.root,
    '--state-root',
    stateRootBase,
    '--state-id',
    stateId,
    '--run-tag',
    runTag,
    '--fs-strategy',
    combo.fsStrategy,
    '--zip-strategy',
    combo.zipStrategy,
    '--db-strategy',
    combo.dbStrategy,
    '--queue-policy',
    combo.queuePolicy,
    '--scan-concurrency',
    '16',
    '--zip-scan-concurrency',
    '10',
    '--thumb-concurrency',
    '6',
    '--video-concurrency',
    '1',
    '--video-probe-limit',
    '3',
    '--background-thumb-limit',
    '240',
    '--maintenance-limit',
    '10',
    '--progress-tick-ms',
    '100',
    '--max-wait-ms',
    '240000',
  ]

  await runProcess('node', args, {
    cwd: repoRoot,
    env,
  })

  const resultPath = path.join(repoRoot, 'docs', 'perf', 'runs', `${combo.comboId}-${mode}-${runTag}`, 'result.json')
  const raw = await fs.readFile(resultPath, 'utf8')
  return JSON.parse(raw)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const repoRoot = process.cwd()
  const combos = buildComboDefinitions()
  const stateRootBase = path.resolve(String(args['state-root'] ?? path.join(repoRoot, 'perf-data', 'streaming-ingest-matrix-state')))

  const env = {
    ...process.env,
    MEDIA_PLAYERX_ARCHIVE_EXTRACTOR_BIN:
      process.env.MEDIA_PLAYERX_ARCHIVE_EXTRACTOR_BIN ?? 'C:/Program Files/7-Zip/7z.exe',
    MEDIA_PLAYERX_FFPROBE_BIN:
      process.env.MEDIA_PLAYERX_FFPROBE_BIN ?? 'C:/Tools/ffmpeg-7.1.1-essentials_build/bin/ffprobe.exe',
  }

  const startedAtMs = Date.now()
  const matrixResults = []

  for (const combo of combos) {
    const coldRuns = []
    const warmRuns = []

    for (let runIndex = 1; runIndex <= RUNS_PER_MODE; runIndex += 1) {
      process.stdout.write(`\n[Matrix] ${combo.comboId} cold run ${runIndex}/${RUNS_PER_MODE}\n`)
      const cold = await executeSingleRun({
        combo,
        mode: 'cold',
        runIndex,
        repoRoot,
        stateRootBase,
        env,
      })
      coldRuns.push(cold)

      process.stdout.write(`\n[Matrix] ${combo.comboId} warm run ${runIndex}/${RUNS_PER_MODE}\n`)
      const warm = await executeSingleRun({
        combo,
        mode: 'warm',
        runIndex,
        repoRoot,
        stateRootBase,
        env,
      })
      warmRuns.push(warm)
    }

    const coldGate = evaluateGate(coldRuns)
    const warmGate = evaluateGate(warmRuns)

    matrixResults.push({
      combo,
      coldRuns,
      warmRuns,
      coldSummary: collectMetrics(coldRuns),
      warmSummary: collectMetrics(warmRuns),
      gate: {
        cold: coldGate,
        warm: warmGate,
        passed: coldGate.passed && warmGate.passed,
      },
      maintenance: null,
    })
  }

  for (const result of matrixResults) {
    if (!result.gate.passed) {
      continue
    }

    process.stdout.write(`\n[Matrix] ${result.combo.comboId} maintenance stress cold\n`)
    const maintenanceCold = await executeMaintenanceRun({
      combo: result.combo,
      mode: 'cold',
      repoRoot,
      stateRootBase,
      env,
    })
    process.stdout.write(`\n[Matrix] ${result.combo.comboId} maintenance stress warm\n`)
    const maintenanceWarm = await executeMaintenanceRun({
      combo: result.combo,
      mode: 'warm',
      repoRoot,
      stateRootBase,
      env,
    })

    const coldMedianTTFP20 = result.coldSummary.TTFP20_ms.median
    const warmMedianTTFP20 = result.warmSummary.TTFP20_ms.median
    const coldMaintenanceTTFP20 = maintenanceCold.metrics.TTFP20_ms
    const warmMaintenanceTTFP20 = maintenanceWarm.metrics.TTFP20_ms

    const coldDegrade =
      typeof coldMedianTTFP20 === 'number' && typeof coldMaintenanceTTFP20 === 'number' && coldMedianTTFP20 > 0
        ? (coldMaintenanceTTFP20 - coldMedianTTFP20) / coldMedianTTFP20
        : null
    const warmDegrade =
      typeof warmMedianTTFP20 === 'number' && typeof warmMaintenanceTTFP20 === 'number' && warmMedianTTFP20 > 0
        ? (warmMaintenanceTTFP20 - warmMedianTTFP20) / warmMedianTTFP20
        : null

    result.maintenance = {
      cold: maintenanceCold,
      warm: maintenanceWarm,
      degradePct: {
        cold: coldDegrade === null ? null : formatNumber(coldDegrade * 100, 3),
        warm: warmDegrade === null ? null : formatNumber(warmDegrade * 100, 3),
      },
      passed:
        (typeof coldDegrade === 'number' ? coldDegrade <= 0.1 : false) &&
        (typeof warmDegrade === 'number' ? warmDegrade <= 0.1 : false) &&
        typeof maintenanceCold.metrics.UI_max_gap_ms === 'number' &&
        maintenanceCold.metrics.UI_max_gap_ms < UI_MAX_GAP_THRESHOLD_MS &&
        typeof maintenanceWarm.metrics.UI_max_gap_ms === 'number' &&
        maintenanceWarm.metrics.UI_max_gap_ms < UI_MAX_GAP_THRESHOLD_MS,
    }
  }

  const endedAtMs = Date.now()
  const output = {
    startedAtMs,
    endedAtMs,
    elapsedMs: endedAtMs - startedAtMs,
    uiMaxGapThresholdMs: UI_MAX_GAP_THRESHOLD_MS,
    runsPerMode: RUNS_PER_MODE,
    results: matrixResults,
  }

  const runTag = new Date().toISOString().replace(/[:.]/g, '-')
  const outputPath = path.join(repoRoot, 'docs', 'perf', 'runs', `matrix-${runTag}.json`)
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2), 'utf8')
  process.stdout.write(`\nMatrix result written: ${toPosix(path.relative(repoRoot, outputPath))}\n`)
}

main().catch((error) => {
  process.stderr.write(`matrix benchmark failed: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
