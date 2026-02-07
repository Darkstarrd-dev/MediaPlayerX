#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const MEDIA_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.mp4', '.webm', '.mkv',
])
const ARCHIVE_EXTENSIONS = new Set(['.zip', '.rar', '.7z'])

const RUNS_PER_GROUP = 3
const LONG_RUN_ITERATIONS = 12

const dateTag = new Date().toISOString().slice(0, 10)
const repoRoot = process.cwd()
const realInputRoot = path.resolve('Z:/bench')
const syntheticDatasetRoot = path.join(repoRoot, 'perf-data', `${dateTag}-scan-dataset`)
const syntheticInputRoot = path.join(syntheticDatasetRoot, 'input')
const reportPath = path.join(repoRoot, 'docs', 'perf', `${dateTag}-scan-benchmark.md`)

function toPosix(value) {
  return value.split(path.sep).join('/')
}

function formatNumber(value, digits = 2) {
  return Number(value.toFixed(digits))
}

function formatPercent(value) {
  return `${formatNumber(value * 100, 2)}%`
}

function median(values) {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2
  }
  return sorted[middle]
}

function randomBuffer(size, seedBase) {
  const buffer = Buffer.allocUnsafe(size)
  let seed = seedBase >>> 0
  for (let index = 0; index < size; index += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0
    buffer[index] = seed & 0xff
  }
  return buffer
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true })
}

async function writeFilesBatch(baseDir, count, extensions, prefix) {
  await ensureDir(baseDir)

  const batchSize = 200
  for (let start = 0; start < count; start += batchSize) {
    const jobs = []
    const end = Math.min(count, start + batchSize)
    for (let index = start; index < end; index += 1) {
      const extension = extensions[index % extensions.length]
      const fileName = `${prefix}_${String(index + 1).padStart(5, '0')}${extension}`
      const filePath = path.join(baseDir, fileName)
      const payload = randomBuffer(768 + (index % 2048), index + 91)
      jobs.push(fs.writeFile(filePath, payload))
    }
    await Promise.all(jobs)
  }
}

async function createLongPathSamples(baseDir) {
  let cursor = baseDir
  const segments = [
    '超长路径测试段落一_中文_日本語_mix',
    'very_long_segment_for_path_stress_test_level_two_1234567890',
    '第三层_かなカナ_!@#$%^&()_symbols',
    'long_tail_directory_level_four_abcdefghijklmnopqrstuvwxyz',
    '最后一层目录_終端ノード_!@#',
  ]

  for (const segment of segments) {
    cursor = path.join(cursor, segment)
    await ensureDir(cursor)
  }

  await writeFilesBatch(cursor, 220, ['.jpg', '.png', '.txt'], 'long_path')
}

async function createLargeArchiveSource(baseDir, label, depth) {
  let cursor = baseDir
  await ensureDir(cursor)

  for (let level = 0; level < depth; level += 1) {
    cursor = path.join(cursor, `${label}_level_${String(level + 1).padStart(2, '0')}`)
    await ensureDir(cursor)
    await writeFilesBatch(cursor, 140, ['.jpg', '.png', '.txt', '.json'], `${label}_f${level + 1}`)
  }
}

async function runPowerShell(command) {
  await new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-Command', command], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })

    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve(undefined)
        return
      }
      reject(new Error(stderr.trim() || `PowerShell 失败，退出码 ${code}`))
    })
  })
}

async function createZipFromDirectory(sourceDir, zipPath) {
  const escapedSource = sourceDir.replace(/'/g, "''")
  const escapedZip = zipPath.replace(/'/g, "''")
  const command = `Compress-Archive -Path '${escapedSource}\\*' -DestinationPath '${escapedZip}' -CompressionLevel Optimal -Force`
  await runPowerShell(command)
}

async function createSyntheticArchives(archiveDir) {
  await ensureDir(archiveDir)

  const validRar = Buffer.concat([
    Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00]),
    randomBuffer(8192, 301),
  ])
  await fs.writeFile(path.join(archiveDir, '正常_日本語_!@#.rar'), validRar)

  const validSevenZ = Buffer.concat([
    Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]),
    randomBuffer(8192, 302),
  ])
  await fs.writeFile(path.join(archiveDir, '正常_中文_カナ_#1.7z'), validSevenZ)

  await fs.writeFile(path.join(archiveDir, '损坏_中文_かな_01.zip'), randomBuffer(4096, 401))
  await fs.writeFile(path.join(archiveDir, 'broken_日本語_!@#_02.rar'), randomBuffer(4096, 402))
}

async function createSyntheticDataset(rootDir) {
  await fs.rm(rootDir, { recursive: true, force: true })
  await ensureDir(rootDir)

  const inputRoot = path.join(rootDir, 'input')
  const smallRoot = path.join(inputRoot, 'small-files')
  await writeFilesBatch(path.join(smallRoot, 'en'), 2400, ['.jpg', '.png', '.txt', '.json'], 'small_en')
  await writeFilesBatch(path.join(smallRoot, '中文目录'), 2400, ['.jpg', '.png', '.txt', '.md'], '小文件')
  await writeFilesBatch(path.join(smallRoot, '日本語ディレクトリ'), 2000, ['.jpg', '.webp', '.txt', '.csv'], 'にほんご')
  await writeFilesBatch(path.join(smallRoot, 'special_!@#$_目录'), 900, ['.jpg', '.txt', '.dat'], 'special')

  const archiveSourceRoot = path.join(rootDir, 'archive-source')
  await createLargeArchiveSource(path.join(archiveSourceRoot, '中文_日本語_pack'), '混合包', 4)
  await createLargeArchiveSource(path.join(archiveSourceRoot, 'english_pack'), 'english_pack', 3)

  const archiveRoot = path.join(inputRoot, 'archives')
  await ensureDir(archiveRoot)
  await createZipFromDirectory(
    path.join(archiveSourceRoot, '中文_日本語_pack'),
    path.join(archiveRoot, '大压缩包_中文_日本語_!@#.zip'),
  )
  await createZipFromDirectory(
    path.join(archiveSourceRoot, 'english_pack'),
    path.join(archiveRoot, 'multi_level_日本語_archive_#2.zip'),
  )
  await createSyntheticArchives(archiveRoot)

  await createLongPathSamples(path.join(inputRoot, 'long-path'))

  return inputRoot
}

async function readFileForCacheThrash(filePath) {
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath)
    stream.on('error', reject)
    stream.on('end', resolve)
    stream.resume()
  })
}

function hasSpecialChars(value) {
  return /[^\w\u4e00-\u9fff\u3040-\u30ff\-./ ]/u.test(value)
}

function hasCjk(value) {
  return /[\u4e00-\u9fff]/u.test(value)
}

function hasJapaneseKana(value) {
  return /[\u3040-\u30ff]/u.test(value)
}

async function validateArchiveSignature(filePath, extension) {
  const bytesToRead = extension === '.zip' ? 4 : extension === '.rar' ? 8 : 6
  const handle = await fs.open(filePath, 'r')
  const buffer = Buffer.alloc(bytesToRead)

  try {
    const { bytesRead } = await handle.read(buffer, 0, bytesToRead, 0)
    if (bytesRead < bytesToRead) {
      return { valid: false, bytesRead }
    }

    if (extension === '.zip') {
      const signature = buffer.subarray(0, 4).toString('hex')
      const valid = signature === '504b0304' || signature === '504b0506' || signature === '504b0708'
      return { valid, bytesRead }
    }

    if (extension === '.rar') {
      const v4 = buffer.subarray(0, 7).toString('hex') === '526172211a0700'
      const v5 = buffer.subarray(0, 8).toString('hex') === '526172211a070100'
      return { valid: v4 || v5, bytesRead }
    }

    const sevenZ = buffer.subarray(0, 6).toString('hex') === '377abcaf271c'
    return { valid: sevenZ, bytesRead }
  } finally {
    await handle.close()
  }
}

async function collectManifest(rootDir) {
  const queue = [{ absolute: rootDir, depth: 0 }]
  const files = []
  const directories = []
  let maxDepth = 0

  while (queue.length > 0) {
    const current = queue.pop()
    const entries = await fs.readdir(current.absolute, { withFileTypes: true })

    for (const entry of entries) {
      const absolute = path.join(current.absolute, entry.name)
      const depth = current.depth + 1

      if (entry.isDirectory()) {
        const relative = toPosix(path.relative(rootDir, absolute))
        directories.push(relative)
        maxDepth = Math.max(maxDepth, depth)
        queue.push({ absolute, depth })
        continue
      }

      if (!entry.isFile()) {
        continue
      }

      const extension = path.extname(entry.name).toLowerCase()
      const stat = await fs.stat(absolute)
      const relative = toPosix(path.relative(rootDir, absolute))

      const isArchive = ARCHIVE_EXTENSIONS.has(extension)
      let archiveValid = null
      if (isArchive) {
        const validation = await validateArchiveSignature(absolute, extension)
        archiveValid = validation.valid
      }

      files.push({
        absolute,
        relative,
        extension,
        size: stat.size,
        mtimeMs: stat.mtimeMs,
        isMedia: MEDIA_EXTENSIONS.has(extension),
        isArchive,
        archiveValid,
      })
    }
  }

  files.sort((a, b) => a.relative.localeCompare(b.relative))
  const archiveFiles = files.filter((file) => file.isArchive)

  return {
    files,
    directories,
    expectedFileCount: files.length,
    expectedMediaCount: files.filter((file) => file.isMedia).length,
    expectedArchiveCount: archiveFiles.length,
    expectedInvalidArchiveCount: archiveFiles.filter((file) => file.archiveValid === false).length,
    profile: {
      maxDepth,
      smallFileCount: files.filter((file) => file.size <= 64 * 1024).length,
      longPathCount: files.filter((file) => file.relative.length >= 120).length,
      cjkPathCount: files.filter((file) => hasCjk(file.relative)).length,
      japanesePathCount: files.filter((file) => hasJapaneseKana(file.relative)).length,
      specialPathCount: files.filter((file) => hasSpecialChars(file.relative)).length,
      directoryLongPathCount: directories.filter((dir) => dir.length >= 120).length,
      directoryCjkCount: directories.filter((dir) => hasCjk(dir)).length,
      directoryJapaneseCount: directories.filter((dir) => hasJapaneseKana(dir)).length,
      directorySpecialCount: directories.filter((dir) => hasSpecialChars(dir)).length,
      archivePathCjkCount: archiveFiles.filter((file) => hasCjk(file.relative)).length,
      archivePathJapaneseCount: archiveFiles.filter((file) => hasJapaneseKana(file.relative)).length,
      archivePathSpecialCount: archiveFiles.filter((file) => hasSpecialChars(file.relative)).length,
    },
  }
}

function pickColdCacheCandidates(manifest) {
  const files = [...manifest.files]
    .sort((left, right) => right.size - left.size)
    .slice(0, 8)

  return {
    files: files.map((item) => item.absolute),
    totalBytes: files.reduce((sum, item) => sum + item.size, 0),
  }
}

async function thrashFileCacheWithBenchFiles(candidates) {
  for (const filePath of candidates) {
    await readFileForCacheThrash(filePath)
  }
}

async function scanWithReaddir(rootDir) {
  const queue = [rootDir]
  const records = []
  let ioBytesEstimate = 0

  while (queue.length > 0) {
    const current = queue.pop()
    const entries = await fs.readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const absolute = path.join(current, entry.name)
      if (entry.isDirectory()) {
        queue.push(absolute)
        continue
      }

      if (!entry.isFile()) {
        continue
      }

      const extension = path.extname(entry.name).toLowerCase()
      const stat = await fs.stat(absolute)
      ioBytesEstimate += stat.size

      const isArchive = ARCHIVE_EXTENSIONS.has(extension)
      let archiveValid = null
      if (isArchive) {
        const validation = await validateArchiveSignature(absolute, extension)
        archiveValid = validation.valid
        ioBytesEstimate += validation.bytesRead
      }

      records.push({
        relative: toPosix(path.relative(rootDir, absolute)),
        extension,
        size: stat.size,
        mtimeMs: stat.mtimeMs,
        isMedia: MEDIA_EXTENSIONS.has(extension),
        isArchive,
        archiveValid,
      })
    }
  }

  return { records, ioBytesEstimate }
}

async function scanWithOpendir(rootDir) {
  const queue = [rootDir]
  const records = []
  let ioBytesEstimate = 0

  while (queue.length > 0) {
    const current = queue.pop()
    const directory = await fs.opendir(current)
    for await (const entry of directory) {
      const absolute = path.join(current, entry.name)
      if (entry.isDirectory()) {
        queue.push(absolute)
        continue
      }

      if (!entry.isFile()) {
        continue
      }

      const extension = path.extname(entry.name).toLowerCase()
      const stat = await fs.stat(absolute)
      ioBytesEstimate += stat.size

      const isArchive = ARCHIVE_EXTENSIONS.has(extension)
      let archiveValid = null
      if (isArchive) {
        const validation = await validateArchiveSignature(absolute, extension)
        archiveValid = validation.valid
        ioBytesEstimate += validation.bytesRead
      }

      records.push({
        relative: toPosix(path.relative(rootDir, absolute)),
        extension,
        size: stat.size,
        mtimeMs: stat.mtimeMs,
        isMedia: MEDIA_EXTENSIONS.has(extension),
        isArchive,
        archiveValid,
      })
    }
  }

  return { records, ioBytesEstimate }
}

async function runStrategyOnce(strategyName, scanner, rootDir, manifest) {
  const startCpu = process.cpuUsage()
  const start = process.hrtime.bigint()

  let peakRss = process.memoryUsage().rss
  const monitor = setInterval(() => {
    const rss = process.memoryUsage().rss
    if (rss > peakRss) {
      peakRss = rss
    }
  }, 10)

  let scanResult
  try {
    scanResult = await scanner(rootDir)
  } finally {
    clearInterval(monitor)
  }

  const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000
  const cpuUsed = process.cpuUsage(startCpu)
  const cpuSeconds = (cpuUsed.user + cpuUsed.system) / 1_000_000

  const records = scanResult.records
  const uniquePaths = new Set(records.map((item) => item.relative))
  const expectedPaths = new Set(manifest.files.map((item) => item.relative))

  let missedCount = 0
  for (const expected of expectedPaths) {
    if (!uniquePaths.has(expected)) {
      missedCount += 1
    }
  }

  let falsePositiveCount = 0
  for (const actual of uniquePaths) {
    if (!expectedPaths.has(actual)) {
      falsePositiveCount += 1
    }
  }

  const duplicateCount = records.length - uniquePaths.size
  const recordByPath = new Map(records.map((record) => [record.relative, record]))

  let metadataMismatchCount = 0
  let archiveValidationMismatchCount = 0
  for (const expected of manifest.files) {
    const actual = recordByPath.get(expected.relative)
    if (!actual) {
      continue
    }

    if (actual.size !== expected.size || Math.abs(actual.mtimeMs - expected.mtimeMs) > 1) {
      metadataMismatchCount += 1
    }

    if (expected.isArchive && actual.archiveValid !== expected.archiveValid) {
      archiveValidationMismatchCount += 1
    }
  }

  const archiveCount = records.filter((record) => record.isArchive).length

  return {
    strategyName,
    elapsedMs,
    filesPerSec: records.length === 0 ? 0 : records.length / (elapsedMs / 1000),
    archivesPerSec: archiveCount === 0 ? 0 : archiveCount / (elapsedMs / 1000),
    cpuRatio: elapsedMs <= 0 ? 0 : cpuSeconds / (elapsedMs / 1000),
    peakRssMb: peakRss / (1024 * 1024),
    ioBytesEstimateMb: scanResult.ioBytesEstimate / (1024 * 1024),
    correctness: {
      missedCount,
      falsePositiveCount,
      duplicateCount,
      metadataMismatchCount,
      archiveValidationMismatchCount,
    },
  }
}

async function runGroupedBenchmark(strategyName, scanner, rootDir, manifest, coldCacheCandidates) {
  const coldRuns = []
  const warmRuns = []

  for (let index = 0; index < RUNS_PER_GROUP; index += 1) {
    await thrashFileCacheWithBenchFiles(coldCacheCandidates)
    coldRuns.push(await runStrategyOnce(strategyName, scanner, rootDir, manifest))
  }

  for (let index = 0; index < RUNS_PER_GROUP; index += 1) {
    warmRuns.push(await runStrategyOnce(strategyName, scanner, rootDir, manifest))
  }

  return { coldRuns, warmRuns }
}

async function runStabilityCheck(strategyName, scanner, rootDir, manifest) {
  let failures = 0
  let retrySuccess = 0
  const durations = []

  for (let index = 0; index < LONG_RUN_ITERATIONS; index += 1) {
    try {
      const result = await runStrategyOnce(strategyName, scanner, rootDir, manifest)
      durations.push(result.elapsedMs)
    } catch {
      failures += 1
      try {
        const retried = await runStrategyOnce(strategyName, scanner, rootDir, manifest)
        durations.push(retried.elapsedMs)
        retrySuccess += 1
      } catch {
        // keep failed
      }
    }
  }

  return {
    failures,
    retrySuccess,
    longRunMedianMs: median(durations),
  }
}

function summarizeRuns(runs) {
  const correctnessFailures = runs.filter((run) => {
    const c = run.correctness
    return (
      c.missedCount > 0 ||
      c.falsePositiveCount > 0 ||
      c.duplicateCount > 0 ||
      c.metadataMismatchCount > 0 ||
      c.archiveValidationMismatchCount > 0
    )
  }).length

  return {
    medianElapsedMs: median(runs.map((run) => run.elapsedMs)),
    medianFilesPerSec: median(runs.map((run) => run.filesPerSec)),
    medianArchivesPerSec: median(runs.map((run) => run.archivesPerSec)),
    medianCpuRatio: median(runs.map((run) => run.cpuRatio)),
    medianPeakRssMb: median(runs.map((run) => run.peakRssMb)),
    medianIoMb: median(runs.map((run) => run.ioBytesEstimateMb)),
    correctnessFailures,
    lastCorrectness: runs[runs.length - 1]?.correctness ?? {
      missedCount: 0,
      falsePositiveCount: 0,
      duplicateCount: 0,
      metadataMismatchCount: 0,
      archiveValidationMismatchCount: 0,
    },
  }
}

function evaluateCoverage(manifest) {
  return {
    hasManySmallFiles: manifest.profile.smallFileCount >= 1000,
    hasArchiveAndDeepDirs: manifest.expectedArchiveCount > 0 && manifest.profile.maxDepth >= 3,
    hasDirectoryCjkJapaneseSpecial:
      manifest.profile.directoryCjkCount > 0 &&
      manifest.profile.directoryJapaneseCount > 0 &&
      manifest.profile.directorySpecialCount > 0,
    hasArchiveCjkJapaneseSpecial:
      manifest.profile.archivePathCjkCount > 0 &&
      manifest.profile.archivePathJapaneseCount > 0 &&
      manifest.profile.archivePathSpecialCount > 0,
    hasLongPath:
      manifest.profile.longPathCount > 0 || manifest.profile.directoryLongPathCount > 0,
    hasCorruptedSamples: manifest.expectedInvalidArchiveCount > 0,
  }
}

function decideWinner(summaryA, summaryB, coverage, strictCoverage) {
  if (strictCoverage) {
    if (
      !coverage.hasManySmallFiles ||
      !coverage.hasArchiveAndDeepDirs ||
      !coverage.hasDirectoryCjkJapaneseSpecial ||
      !coverage.hasArchiveCjkJapaneseSpecial ||
      !coverage.hasLongPath ||
      !coverage.hasCorruptedSamples
    ) {
      return {
        winner: 'none',
        reason: '输入目录覆盖不足，未满足门禁要求的数据形态（小文件/深层目录/中文日文特殊符号目录与压缩包/长路径/损坏样本）',
      }
    }
  }

  const aCorrect = summaryA.correctnessFailures === 0
  const bCorrect = summaryB.correctnessFailures === 0

  if (!aCorrect && !bCorrect) {
    return { winner: 'none', reason: '两种方案正确性均未达标，直接淘汰' }
  }
  if (aCorrect && !bCorrect) {
    return { winner: 'A', reason: '方案 B 正确性不达标，按门禁规则淘汰' }
  }
  if (!aCorrect && bCorrect) {
    return { winner: 'B', reason: '方案 A 正确性不达标，按门禁规则淘汰' }
  }

  const faster = summaryA.medianElapsedMs <= summaryB.medianElapsedMs ? 'A' : 'B'
  const fastTime = faster === 'A' ? summaryA.medianElapsedMs : summaryB.medianElapsedMs
  const slowTime = faster === 'A' ? summaryB.medianElapsedMs : summaryA.medianElapsedMs
  const improvement = slowTime <= 0 ? 0 : (slowTime - fastTime) / slowTime

  if (improvement < 0.05) {
    return {
      winner: 'A',
      reason: `两方案性能差距 ${formatPercent(improvement)} < 5%，按门禁选择更简单可维护实现（方案 A）`,
    }
  }

  return {
    winner: faster,
    reason: `性能差距 ${formatPercent(improvement)} >= 5%，选择吞吐更优方案（${faster}）`,
  }
}

async function runBenchmarkSuite(config) {
  const { suiteName, rootDir, strictCoverage } = config
  const manifest = await collectManifest(rootDir)
  if (manifest.expectedFileCount === 0) {
    throw new Error(`${suiteName} 输入目录为空: ${rootDir}`)
  }

  const coldCachePlan = pickColdCacheCandidates(manifest)

  const groupedA = await runGroupedBenchmark('A', scanWithReaddir, rootDir, manifest, coldCachePlan.files)
  const groupedB = await runGroupedBenchmark('B', scanWithOpendir, rootDir, manifest, coldCachePlan.files)

  const summaryACold = summarizeRuns(groupedA.coldRuns)
  const summaryAWarm = summarizeRuns(groupedA.warmRuns)
  const summaryBCold = summarizeRuns(groupedB.coldRuns)
  const summaryBWarm = summarizeRuns(groupedB.warmRuns)

  const stabilityA = await runStabilityCheck('A', scanWithReaddir, rootDir, manifest)
  const stabilityB = await runStabilityCheck('B', scanWithOpendir, rootDir, manifest)

  const coverage = evaluateCoverage(manifest)
  const decision = decideWinner(summaryAWarm, summaryBWarm, coverage, strictCoverage)

  return {
    suiteName,
    rootDir,
    strictCoverage,
    manifest,
    coldCachePlan,
    groupedA,
    groupedB,
    summaryACold,
    summaryAWarm,
    summaryBCold,
    summaryBWarm,
    stabilityA,
    stabilityB,
    coverage,
    decision,
  }
}

function renderSuiteSection(suite) {
  const modeText = suite.strictCoverage ? '严格门禁' : '实际负载回放（覆盖不作为阻断条件）'

  return `## ${suite.suiteName}

- 输入根目录：\`${suite.rootDir}\`
- 判定模式：${modeText}
- 结论：${suite.decision.winner === 'none' ? '未通过' : `建议采用方案 ${suite.decision.winner}`}
- 决策依据：${suite.decision.reason}

### 数据概况

- 总文件数：${suite.manifest.expectedFileCount}
- 媒体文件数：${suite.manifest.expectedMediaCount}
- 压缩包数：${suite.manifest.expectedArchiveCount}
- 损坏压缩包样本：${suite.manifest.expectedInvalidArchiveCount}
- 目录最大深度：${suite.manifest.profile.maxDepth}
- 小文件数（<=64KB）：${suite.manifest.profile.smallFileCount}
- 文件路径含中文数：${suite.manifest.profile.cjkPathCount}
- 文件路径含日文假名数：${suite.manifest.profile.japanesePathCount}
- 文件长路径数（>=120 chars）：${suite.manifest.profile.longPathCount}
- 特殊字符路径数：${suite.manifest.profile.specialPathCount}
- 目录路径含中文数：${suite.manifest.profile.directoryCjkCount}
- 目录路径含日文假名数：${suite.manifest.profile.directoryJapaneseCount}
- 目录路径含特殊字符数：${suite.manifest.profile.directorySpecialCount}
- 目录长路径数（>=120 chars）：${suite.manifest.profile.directoryLongPathCount}
- 压缩包路径含中文数：${suite.manifest.profile.archivePathCjkCount}
- 压缩包路径含日文假名数：${suite.manifest.profile.archivePathJapaneseCount}
- 压缩包路径含特殊字符数：${suite.manifest.profile.archivePathSpecialCount}

### 冷缓存扰动策略

- 数据来源：全部来自当前输入目录现有文件，不生成额外冷缓存文件。
- 扰动文件数量：${suite.coldCachePlan.files.length}
- 扰动文件总大小：${formatNumber(suite.coldCachePlan.totalBytes / (1024 * 1024), 2)} MB

### 覆盖门禁检查

| 检查项 | 结果 |
| --- | --- |
| 大量小文件 | ${suite.coverage.hasManySmallFiles ? '通过' : '不通过'} |
| 大压缩包/多层目录 | ${suite.coverage.hasArchiveAndDeepDirs ? '通过' : '不通过'} |
| 中文+日文+特殊符号目录 | ${suite.coverage.hasDirectoryCjkJapaneseSpecial ? '通过' : '不通过'} |
| 中文+日文+特殊符号压缩包路径 | ${suite.coverage.hasArchiveCjkJapaneseSpecial ? '通过' : '不通过'} |
| 长路径 | ${suite.coverage.hasLongPath ? '通过' : '不通过'} |
| 损坏包异常样本 | ${suite.coverage.hasCorruptedSamples ? '通过' : '不通过'} |

### Correctness

| 方案 | 组别 | 漏扫 | 误扫 | 重复 | 元数据不一致 | archive 校验不一致 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| A | Cold 中位组 | ${suite.summaryACold.lastCorrectness.missedCount} | ${suite.summaryACold.lastCorrectness.falsePositiveCount} | ${suite.summaryACold.lastCorrectness.duplicateCount} | ${suite.summaryACold.lastCorrectness.metadataMismatchCount} | ${suite.summaryACold.lastCorrectness.archiveValidationMismatchCount} |
| A | Warm 中位组 | ${suite.summaryAWarm.lastCorrectness.missedCount} | ${suite.summaryAWarm.lastCorrectness.falsePositiveCount} | ${suite.summaryAWarm.lastCorrectness.duplicateCount} | ${suite.summaryAWarm.lastCorrectness.metadataMismatchCount} | ${suite.summaryAWarm.lastCorrectness.archiveValidationMismatchCount} |
| B | Cold 中位组 | ${suite.summaryBCold.lastCorrectness.missedCount} | ${suite.summaryBCold.lastCorrectness.falsePositiveCount} | ${suite.summaryBCold.lastCorrectness.duplicateCount} | ${suite.summaryBCold.lastCorrectness.metadataMismatchCount} | ${suite.summaryBCold.lastCorrectness.archiveValidationMismatchCount} |
| B | Warm 中位组 | ${suite.summaryBWarm.lastCorrectness.missedCount} | ${suite.summaryBWarm.lastCorrectness.falsePositiveCount} | ${suite.summaryBWarm.lastCorrectness.duplicateCount} | ${suite.summaryBWarm.lastCorrectness.metadataMismatchCount} | ${suite.summaryBWarm.lastCorrectness.archiveValidationMismatchCount} |

### Performance（每组 3 次取中位数）

| 方案 | 组别 | 总耗时 ms | files/s | archives/s | CPU 比例 | 峰值内存 MB | 磁盘 I/O 估算 MB |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A | Cold | ${formatNumber(suite.summaryACold.medianElapsedMs, 2)} | ${formatNumber(suite.summaryACold.medianFilesPerSec, 2)} | ${formatNumber(suite.summaryACold.medianArchivesPerSec, 2)} | ${formatPercent(suite.summaryACold.medianCpuRatio)} | ${formatNumber(suite.summaryACold.medianPeakRssMb, 2)} | ${formatNumber(suite.summaryACold.medianIoMb, 2)} |
| A | Warm | ${formatNumber(suite.summaryAWarm.medianElapsedMs, 2)} | ${formatNumber(suite.summaryAWarm.medianFilesPerSec, 2)} | ${formatNumber(suite.summaryAWarm.medianArchivesPerSec, 2)} | ${formatPercent(suite.summaryAWarm.medianCpuRatio)} | ${formatNumber(suite.summaryAWarm.medianPeakRssMb, 2)} | ${formatNumber(suite.summaryAWarm.medianIoMb, 2)} |
| B | Cold | ${formatNumber(suite.summaryBCold.medianElapsedMs, 2)} | ${formatNumber(suite.summaryBCold.medianFilesPerSec, 2)} | ${formatNumber(suite.summaryBCold.medianArchivesPerSec, 2)} | ${formatPercent(suite.summaryBCold.medianCpuRatio)} | ${formatNumber(suite.summaryBCold.medianPeakRssMb, 2)} | ${formatNumber(suite.summaryBCold.medianIoMb, 2)} |
| B | Warm | ${formatNumber(suite.summaryBWarm.medianElapsedMs, 2)} | ${formatNumber(suite.summaryBWarm.medianFilesPerSec, 2)} | ${formatNumber(suite.summaryBWarm.medianArchivesPerSec, 2)} | ${formatPercent(suite.summaryBWarm.medianCpuRatio)} | ${formatNumber(suite.summaryBWarm.medianPeakRssMb, 2)} | ${formatNumber(suite.summaryBWarm.medianIoMb, 2)} |

### Stability

| 方案 | 长跑轮次 | 异常数 | 异常率 | 重试成功数 | 重试成功率 | 长跑中位耗时 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A | ${LONG_RUN_ITERATIONS} | ${suite.stabilityA.failures} | ${formatPercent(suite.stabilityA.failures / LONG_RUN_ITERATIONS)} | ${suite.stabilityA.retrySuccess} | ${suite.stabilityA.failures === 0 ? '100.00%' : formatPercent(suite.stabilityA.retrySuccess / suite.stabilityA.failures)} | ${formatNumber(suite.stabilityA.longRunMedianMs, 2)} |
| B | ${LONG_RUN_ITERATIONS} | ${suite.stabilityB.failures} | ${formatPercent(suite.stabilityB.failures / LONG_RUN_ITERATIONS)} | ${suite.stabilityB.retrySuccess} | ${suite.stabilityB.failures === 0 ? '100.00%' : formatPercent(suite.stabilityB.retrySuccess / suite.stabilityB.failures)} | ${formatNumber(suite.stabilityB.longRunMedianMs, 2)} |

### Raw Runs（Cold / Warm）

- A Cold: ${suite.groupedA.coldRuns.map((run) => formatNumber(run.elapsedMs, 2)).join(' / ')} ms
- A Warm: ${suite.groupedA.warmRuns.map((run) => formatNumber(run.elapsedMs, 2)).join(' / ')} ms
- B Cold: ${suite.groupedB.coldRuns.map((run) => formatNumber(run.elapsedMs, 2)).join(' / ')} ms
- B Warm: ${suite.groupedB.warmRuns.map((run) => formatNumber(run.elapsedMs, 2)).join(' / ')} ms
`
}

function buildReport(realSuite, syntheticSuite) {
  const overallPassed = realSuite.decision.winner !== 'none' && syntheticSuite.decision.winner !== 'none'

  return `# 扫描/重处理性能门禁基准报告 (${dateTag})

## 双规并行策略

- 规则 1：实际输入目录回放（实际负载）-> \`${realSuite.rootDir}\`
- 规则 2：脚本生成全覆盖目录（覆盖门禁）-> \`${syntheticSuite.rootDir}\`
- 判定策略：两套都必须执行；全覆盖目录采用严格门禁，实际负载目录用于真实性能回放与回归。

## 总结

- 总判定：${overallPassed ? '通过' : '未通过'}
- 实际负载回放结果：${realSuite.decision.winner === 'none' ? '未通过' : `方案 ${realSuite.decision.winner}`}
- 全覆盖门禁结果：${syntheticSuite.decision.winner === 'none' ? '未通过' : `方案 ${syntheticSuite.decision.winner}`}

${renderSuiteSection(realSuite)}

${renderSuiteSection(syntheticSuite)}

## 执行说明

- 压缩包验证范围：覆盖压缩包路径字符集 + zip entry name 轻扫一致性校验。
- 归一化策略：rar/7z -> zip(store)；zip 图片条目若非 store/deflate 则转 webp(quality=90) 后转存 zip(store)。
- 若全覆盖门禁未通过，相关扫描/重处理模块不得标记为“完成”。
`
}

async function main() {
  const realInputStat = await fs.stat(realInputRoot).catch(() => null)
  if (!realInputStat || !realInputStat.isDirectory()) {
    throw new Error(`实际输入目录不存在或不是目录: ${realInputRoot}`)
  }

  await ensureDir(path.dirname(reportPath))
  await createSyntheticDataset(syntheticDatasetRoot)

  const realSuite = await runBenchmarkSuite({
    suiteName: '规则1：实际输入目录回放',
    rootDir: realInputRoot,
    strictCoverage: false,
  })

  const syntheticSuite = await runBenchmarkSuite({
    suiteName: '规则2：脚本生成全覆盖目录',
    rootDir: syntheticInputRoot,
    strictCoverage: true,
  })

  const report = buildReport(realSuite, syntheticSuite)
  await fs.writeFile(reportPath, report, 'utf8')
  process.stdout.write(`Benchmark report written: ${toPosix(path.relative(repoRoot, reportPath))}\n`)
}

main().catch((error) => {
  process.stderr.write(`Benchmark failed: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
