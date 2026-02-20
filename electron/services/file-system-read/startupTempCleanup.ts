import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

interface StartupTempCleanupOptions {
  thumbnailCacheRootDir: string
  normalizedArchiveRootDir: string
  knownArchivePaths: readonly string[]
  withArchiveWriteLock?: <T>(archivePath: string, task: () => Promise<T>) => Promise<T>
}

interface StartupTempCleanupResult {
  removedCount: number
}

const ARCHIVE_TMP_DIR_PREFIX = 'mpx-archive-normalize-'

async function walkFiles(rootDir: string, visitor: (filePath: string) => Promise<void>): Promise<void> {
  const stack = [rootDir]

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) {
      continue
    }

    const entries = await fs.readdir(current, { withFileTypes: true }).catch(() => null)
    if (!entries) {
      continue
    }

    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(absolutePath)
        continue
      }

      if (!entry.isFile()) {
        continue
      }

      await visitor(absolutePath)
    }
  }
}

async function cleanupThumbnailTmpFiles(thumbnailCacheRootDir: string): Promise<number> {
  let removedCount = 0

  await walkFiles(thumbnailCacheRootDir, async (filePath) => {
    if (!filePath.endsWith('.tmp.webp')) {
      return
    }

    const removed = await fs
      .rm(filePath, { force: true })
      .then(() => true)
      .catch(() => false)
    if (removed) {
      removedCount += 1
    }
  })

  return removedCount
}

async function cleanupArchiveNormalizeTempDirs(): Promise<number> {
  let removedCount = 0
  const tempRoot = os.tmpdir()
  const entries = await fs.readdir(tempRoot, { withFileTypes: true }).catch(() => null)
  if (!entries) {
    return 0
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }
    if (!entry.name.startsWith(ARCHIVE_TMP_DIR_PREFIX)) {
      continue
    }

    const absolutePath = path.join(tempRoot, entry.name)
    const removed = await fs
      .rm(absolutePath, { recursive: true, force: true })
      .then(() => true)
      .catch(() => false)
    if (removed) {
      removedCount += 1
    }
  }

  return removedCount
}

async function cleanupArchiveSidecarTempFiles(
  knownArchivePaths: readonly string[],
  withArchiveWriteLock: StartupTempCleanupOptions['withArchiveWriteLock'],
): Promise<number> {
  const byDirectory = new Map<string, Set<string>>()
  for (const archivePath of knownArchivePaths) {
    const resolvedArchivePath = path.resolve(archivePath)
    const directory = path.dirname(resolvedArchivePath)
    const baseName = path.basename(resolvedArchivePath)
    const names = byDirectory.get(directory) ?? new Set<string>()
    names.add(baseName)
    byDirectory.set(directory, names)
  }

  let removedCount = 0
  for (const [directory, archiveBaseNames] of byDirectory) {
    const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => null)
    if (!entries) {
      continue
    }

    for (const entry of entries) {
      if (!entry.isFile()) {
        continue
      }

      for (const archiveBaseName of archiveBaseNames) {
        const shouldRemove =
          (entry.name.startsWith(`${archiveBaseName}.mpx-normalizing-`) && entry.name.endsWith('.tmp')) ||
          entry.name.startsWith(`${archiveBaseName}.mpx-backup-`) ||
          (entry.name.startsWith(`${archiveBaseName}.`) &&
            (entry.name.endsWith('.mpx-tmp.zip') || entry.name.endsWith('.mpx-bak')))

        if (!shouldRemove) {
          continue
        }

        const fullPath = path.join(directory, entry.name)
        const archivePath = path.join(directory, archiveBaseName)
        const removeFile = async () => {
          const removed = await fs
            .rm(fullPath, { force: true })
            .then(() => true)
            .catch(() => false)
          if (removed) {
            removedCount += 1
          }
        }

        if (withArchiveWriteLock) {
          await withArchiveWriteLock(archivePath, removeFile)
        } else {
          await removeFile()
        }
      }
    }
  }

  return removedCount
}

async function cleanupNormalizedArchiveDir(normalizedArchiveRootDir: string): Promise<number> {
  const entries = await fs.readdir(normalizedArchiveRootDir, { withFileTypes: true }).catch(() => null)
  if (!entries) {
    return 0
  }

  let removedCount = 0
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue
    }

    const shouldRemove =
      entry.name.endsWith('.tmp') ||
      entry.name.endsWith('.mpx-tmp.zip') ||
      entry.name.includes('.mpx-normalizing-') ||
      entry.name.includes('.mpx-backup-')
    if (!shouldRemove) {
      continue
    }

    const removed = await fs
      .rm(path.join(normalizedArchiveRootDir, entry.name), { force: true })
      .then(() => true)
      .catch(() => false)
    if (removed) {
      removedCount += 1
    }
  }

  return removedCount
}

export async function cleanupStartupTempArtifacts(
  options: StartupTempCleanupOptions,
): Promise<StartupTempCleanupResult> {
  const uniqueArchivePaths = Array.from(new Set(options.knownArchivePaths.map((value) => path.resolve(value))))

  const [thumbnailTmpCount, osTempDirCount, archiveSidecarCount, normalizedArchiveTmpCount] = await Promise.all([
    cleanupThumbnailTmpFiles(options.thumbnailCacheRootDir),
    cleanupArchiveNormalizeTempDirs(),
    cleanupArchiveSidecarTempFiles(uniqueArchivePaths, options.withArchiveWriteLock),
    cleanupNormalizedArchiveDir(options.normalizedArchiveRootDir),
  ])

  return {
    removedCount: thumbnailTmpCount + osTempDirCount + archiveSidecarCount + normalizedArchiveTmpCount,
  }
}
