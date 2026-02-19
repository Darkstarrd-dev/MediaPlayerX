import { promises as fs } from 'node:fs'
import path from 'node:path'

import type { ImportTaskRecord, MediaLibraryDatabase } from './mediaLibraryDatabase'
import { isPathInsideRoot, normalizeAllowlistKey } from './fileSystemServiceHelpers'

interface ImportPathInspection {
  absolutePath: string
  insideRoot: boolean
  kind: 'file' | 'directory'
  extension: string | null
}

type ImportPathInspectionResult =
  | { ok: true; inspection: ImportPathInspection }
  | { ok: false; reason: string }

async function inspectImportPath(
  candidatePath: string,
  options: {
    rootDir: string
    imageExtensions: ReadonlySet<string>
    videoExtensions: ReadonlySet<string>
    audioExtensions: ReadonlySet<string>
    archiveExtensions: ReadonlySet<string>
    musicImportMode: boolean
  },
): Promise<ImportPathInspectionResult> {
  const absolutePath = path.resolve(candidatePath)

  const stat = await fs.stat(absolutePath).catch(() => null)
  if (!stat) {
    return { ok: false, reason: `路径不存在: ${absolutePath}` }
  }

  const insideRoot = isPathInsideRoot(options.rootDir, absolutePath)

  if (stat.isDirectory()) {
    const readable = await fs.readdir(absolutePath).then(() => true).catch(() => false)
    if (!readable) {
      return { ok: false, reason: `目录不可读: ${absolutePath}` }
    }

    return {
      ok: true,
      inspection: {
        absolutePath,
        insideRoot,
        kind: 'directory',
        extension: null,
      },
    }
  }

  if (!stat.isFile()) {
    return { ok: false, reason: `仅支持文件或目录: ${absolutePath}` }
  }

  const extension = path.extname(absolutePath).toLowerCase()
  if (options.musicImportMode) {
    if (!options.audioExtensions.has(extension)) {
      return { ok: false, reason: `音乐导入仅支持音频文件: ${absolutePath}` }
    }

    return {
      ok: true,
      inspection: {
        absolutePath,
        insideRoot,
        kind: 'file',
        extension,
      },
    }
  }

  if (
    !options.imageExtensions.has(extension) &&
    !options.videoExtensions.has(extension) &&
    !options.audioExtensions.has(extension) &&
    !options.archiveExtensions.has(extension)
  ) {
    return { ok: false, reason: `类型不支持: ${absolutePath}` }
  }

  return {
    ok: true,
    inspection: {
      absolutePath,
      insideRoot,
      kind: 'file',
      extension,
    },
  }
}

interface ExecuteImportTaskParams {
  taskId: string
  rootDir: string
  legacyImportsDirName: string
  imageExtensions: ReadonlySet<string>
  videoExtensions: ReadonlySet<string>
  audioExtensions: ReadonlySet<string>
  archiveExtensions: ReadonlySet<string>
  musicImportMode: boolean
  database: MediaLibraryDatabase
  invalidateCache: () => void
  ensureSnapshotLoaded: () => Promise<unknown>
  emitLibraryChanged: (payload: { reason: 'import-task-finished'; updated_at_ms: number }) => void
}

export async function executeImportTask(params: ExecuteImportTaskParams): Promise<ImportTaskRecord> {
  const existing = params.database.readTask(params.taskId)
  if (!existing) {
    throw new Error(`导入任务不存在: ${params.taskId}`)
  }

  const totalCount = existing.sourcePaths.length
  const startedAtMs = Date.now()
  params.database.upsertTask({
    ...existing,
    status: 'running',
    progress: totalCount > 0 ? existing.processedCount / totalCount : 1,
    message: '导入进行中',
    errorDetail: null,
    updatedAtMs: startedAtMs,
  })

  let processedCount = 0
  let acceptedCount = 0
  const failedMessages: string[] = []

  const internalMetaDir = path.join(params.rootDir, '.mediaplayerx')
  const legacyImportsDir = path.join(params.rootDir, params.legacyImportsDirName)

  const existingImportSources = params.database.readImportSources()
  const directoryMap = new Map<string, string>()
  const fileMap = new Map<string, string>()
  const existingMusicImportSources = params.musicImportMode ? params.database.readMusicImportSources() : null
  const musicDirectoryMap = new Map<string, string>()
  const musicFileMap = new Map<string, string>()

  for (const value of existingImportSources.directories) {
    const resolved = path.resolve(value)
    directoryMap.set(normalizeAllowlistKey(resolved), resolved)
  }

  for (const value of existingImportSources.files) {
    const resolved = path.resolve(value)
    fileMap.set(normalizeAllowlistKey(resolved), resolved)
  }

  if (existingMusicImportSources) {
    for (const value of existingMusicImportSources.directories) {
      const resolved = path.resolve(value)
      musicDirectoryMap.set(normalizeAllowlistKey(resolved), resolved)
    }
    for (const value of existingMusicImportSources.files) {
      const resolved = path.resolve(value)
      musicFileMap.set(normalizeAllowlistKey(resolved), resolved)
    }
  }

  let addedDirectoryCount = 0
  let addedFileCount = 0
  let addedMusicDirectoryCount = 0
  let addedMusicFileCount = 0
  let hasReimportedDirectory = false

  for (const sourcePath of existing.sourcePaths) {
    const inspected = await inspectImportPath(sourcePath, {
      rootDir: params.rootDir,
      imageExtensions: params.imageExtensions,
      videoExtensions: params.videoExtensions,
      audioExtensions: params.audioExtensions,
      archiveExtensions: params.archiveExtensions,
      musicImportMode: params.musicImportMode,
    })

    if (inspected.ok) {
      let pathSucceeded = true
      try {
        const { inspection } = inspected
        const absolutePath = inspection.absolutePath

        if (isPathInsideRoot(internalMetaDir, absolutePath) || isPathInsideRoot(legacyImportsDir, absolutePath)) {
          pathSucceeded = false
          failedMessages.push(`禁止导入内部目录: ${absolutePath}`)
        } else if (inspection.kind === 'file') {
          const key = normalizeAllowlistKey(absolutePath)
          if (!fileMap.has(key)) {
            fileMap.set(key, absolutePath)
            addedFileCount += 1
          }

          if (params.musicImportMode && !musicFileMap.has(key)) {
            musicFileMap.set(key, absolutePath)
            addedMusicFileCount += 1
          }
        } else if (inspection.kind === 'directory') {
          const key = normalizeAllowlistKey(absolutePath)
          if (!directoryMap.has(key)) {
            directoryMap.set(key, absolutePath)
            addedDirectoryCount += 1
          } else {
            hasReimportedDirectory = true
          }

          if (params.musicImportMode) {
            if (!musicDirectoryMap.has(key)) {
              musicDirectoryMap.set(key, absolutePath)
              addedMusicDirectoryCount += 1
            } else {
              hasReimportedDirectory = true
            }
          }
        }

        if (pathSucceeded) {
          acceptedCount += 1
        }
      } catch (error) {
        const reason = error instanceof Error && error.message ? error.message : '未知错误'
        failedMessages.push(`导入失败: ${inspected.inspection.absolutePath} (${reason})`)
      }
    } else {
      failedMessages.push(inspected.reason)
    }

    processedCount += 1
    params.database.upsertTask({
      ...existing,
      status: 'running',
      progress: totalCount > 0 ? processedCount / totalCount : 1,
      processedCount,
      totalCount,
      message: `导入进行中 ${processedCount}/${totalCount} | 新增引用 ${addedDirectoryCount + addedFileCount}`,
      errorDetail: failedMessages.length > 0 ? failedMessages.slice(0, 3).join(' | ') : null,
      updatedAtMs: Date.now(),
    })
  }

  const addedTotal = addedDirectoryCount + addedFileCount
  const addedMusicTotal = addedMusicDirectoryCount + addedMusicFileCount
  if (addedTotal > 0 || hasReimportedDirectory || (params.musicImportMode && addedMusicTotal > 0)) {
    params.database.writeImportSources({
      directories: Array.from(directoryMap.values()),
      files: Array.from(fileMap.values()),
    })

    if (params.musicImportMode && addedMusicTotal > 0) {
      params.database.writeMusicImportSources({
        directories: Array.from(musicDirectoryMap.values()),
        files: Array.from(musicFileMap.values()),
      })
    }

    params.invalidateCache()
    await params.ensureSnapshotLoaded()

    params.emitLibraryChanged({
      reason: 'import-task-finished',
      updated_at_ms: Date.now(),
    })
  }

  const finishedAtMs = Date.now()
  const failedCount = Math.max(0, totalCount - acceptedCount)
  const status: ImportTaskRecord['status'] = failedCount > 0 ? 'failed' : 'completed'
  const message =
    status === 'completed'
      ? params.musicImportMode
        ? `导入完成，共 ${acceptedCount} 项，新增引用 ${addedTotal} 项（目录 ${addedDirectoryCount} + 文件 ${addedFileCount}）；音乐引用新增 ${addedMusicTotal} 项（目录 ${addedMusicDirectoryCount} + 文件 ${addedMusicFileCount}）`
        : `导入完成，共 ${acceptedCount} 项，新增引用 ${addedTotal} 项（目录 ${addedDirectoryCount} + 文件 ${addedFileCount}）`
      : `导入失败，成功 ${acceptedCount} 项，失败 ${failedCount} 项`

  params.database.upsertTask({
    ...existing,
    status,
    progress: 1,
    processedCount: totalCount,
    totalCount,
    message,
    errorDetail: failedMessages.length > 0 ? failedMessages.join('\n') : null,
    updatedAtMs: finishedAtMs,
  })

  const finalTask = params.database.readTask(params.taskId)
  if (!finalTask) {
    throw new Error(`导入任务状态丢失: ${params.taskId}`)
  }

  return finalTask
}
