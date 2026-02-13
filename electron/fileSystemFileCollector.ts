import { promises as fs } from 'node:fs'
import path from 'node:path'

import { parallelMapLimit } from './fileSystemAsyncUtils'
import { isPathInsideRoot, normalizeAllowlistKey, normalizePathKey } from './fileSystemServiceHelpers'

export interface FileRecord {
  absolutePath: string
  relativePath: string
  extension: string
  sizeBytes: number
  width: number
  height: number
}

interface CollectMediaFilesParams {
  rootDir: string
  importDirectoryRoots: string[]
  importFiles: string[]
  legacyImportsDirName: string
  directoryScanConcurrency: number
  imageExtensions: ReadonlySet<string>
  videoExtensions: ReadonlySet<string>
  audioExtensions: ReadonlySet<string>
  archiveExtensions: ReadonlySet<string>
  probeImageDimensionsFromFile: (absolutePath: string) => Promise<{ width: number; height: number }>
}

export async function collectMediaFiles(params: CollectMediaFilesParams): Promise<FileRecord[]> {
  const rootStat = await fs.stat(params.rootDir).catch(() => null)
  if (!rootStat || !rootStat.isDirectory()) {
    throw new Error(`后端真实读服务失败：目录不存在或不可访问 -> ${params.rootDir}`)
  }

  const directoryRoots = Array.from(new Set(params.importDirectoryRoots.map((value) => path.resolve(value))))
  const explicitFiles = Array.from(new Set(params.importFiles.map((value) => path.resolve(value))))

  if (directoryRoots.length === 0 && explicitFiles.length === 0) {
    return []
  }

  const internalMetaDir = path.join(params.rootDir, '.mediaplayerx')
  const legacyImportsDir = path.join(params.rootDir, params.legacyImportsDirName)

  const files: FileRecord[] = []
  const seen = new Set<string>()

  const pushFile = (absolutePath: string, extension: string, sizeBytes: number, width = 0, height = 0) => {
    const key = normalizeAllowlistKey(absolutePath)
    if (seen.has(key)) {
      return
    }
    seen.add(key)
    files.push({
      absolutePath,
      relativePath: normalizePathKey(absolutePath),
      extension,
      sizeBytes,
      width,
      height,
    })
  }

  let levelDirectories = directoryRoots

  while (levelDirectories.length > 0) {
    const nestedDirectories = await parallelMapLimit(levelDirectories, params.directoryScanConcurrency, async (current) => {
      const entries = await fs.readdir(current, { withFileTypes: true }).catch(() => null)
      if (!entries) {
        return []
      }

      const nextLevel: string[] = []
      const pendingMediaRecords: Array<{ absolutePath: string; extension: string }> = []
      const pendingImageOrArchiveRecords: Array<{ absolutePath: string; extension: string }> = []

      for (const entry of entries) {
        const absolutePath = path.join(current, entry.name)
        if (entry.isDirectory()) {
          const lowered = entry.name.toLowerCase()
          if (lowered === '.mediaplayerx' || lowered === params.legacyImportsDirName) {
            continue
          }
          nextLevel.push(absolutePath)
          continue
        }

        if (!entry.isFile()) {
          continue
        }

        const extension = path.extname(entry.name).toLowerCase()
        const supported =
          params.imageExtensions.has(extension) ||
          params.videoExtensions.has(extension) ||
          params.audioExtensions.has(extension) ||
          params.archiveExtensions.has(extension)
        if (!supported) {
          continue
        }

        if (isPathInsideRoot(internalMetaDir, absolutePath) || isPathInsideRoot(legacyImportsDir, absolutePath)) {
          continue
        }

        if (params.videoExtensions.has(extension) || params.audioExtensions.has(extension)) {
          pendingMediaRecords.push({ absolutePath, extension })
          continue
        }

        pendingImageOrArchiveRecords.push({ absolutePath, extension })
      }

      if (pendingImageOrArchiveRecords.length > 0) {
        const imageOrArchiveFiles = await parallelMapLimit(
          pendingImageOrArchiveRecords,
          params.directoryScanConcurrency,
          async (record) => {
            const stat = await fs.stat(record.absolutePath).catch(() => null)
            if (!stat || !stat.isFile()) {
              return null
            }

            let width = 0
            let height = 0
            if (params.imageExtensions.has(record.extension)) {
              const dimensions = await params.probeImageDimensionsFromFile(record.absolutePath)
              width = dimensions.width
              height = dimensions.height
            }

            return {
              absolutePath: record.absolutePath,
              extension: record.extension,
              sizeBytes: stat.size,
              width,
              height,
            }
          },
        )

        for (const file of imageOrArchiveFiles) {
          if (!file) {
            continue
          }
          pushFile(file.absolutePath, file.extension, file.sizeBytes, file.width, file.height)
        }
      }

      if (pendingMediaRecords.length > 0) {
        const mediaFiles = await parallelMapLimit(
          pendingMediaRecords,
          params.directoryScanConcurrency,
          async (mediaRecord) => {
            const stat = await fs.stat(mediaRecord.absolutePath).catch(() => null)
            return {
              absolutePath: mediaRecord.absolutePath,
              extension: mediaRecord.extension,
              sizeBytes: stat?.size ?? 0,
            }
          },
        )

        for (const mediaFile of mediaFiles) {
          pushFile(mediaFile.absolutePath, mediaFile.extension, mediaFile.sizeBytes, 0, 0)
        }
      }

      return nextLevel
    })

    levelDirectories = nestedDirectories.flat()
  }

  if (explicitFiles.length > 0) {
    const resolvedFiles = await parallelMapLimit(explicitFiles, params.directoryScanConcurrency, async (candidatePath) => {
      const absolutePath = path.resolve(candidatePath)

      if (isPathInsideRoot(internalMetaDir, absolutePath) || isPathInsideRoot(legacyImportsDir, absolutePath)) {
        return null
      }

      const stat = await fs.stat(absolutePath).catch(() => null)
      if (!stat || !stat.isFile()) {
        return null
      }

      const extension = path.extname(absolutePath).toLowerCase()
      const supported =
        params.imageExtensions.has(extension) ||
        params.videoExtensions.has(extension) ||
        params.audioExtensions.has(extension) ||
        params.archiveExtensions.has(extension)
      if (!supported) {
        return null
      }

      let width = 0
      let height = 0
      if (params.imageExtensions.has(extension)) {
        const dimensions = await params.probeImageDimensionsFromFile(absolutePath)
        width = dimensions.width
        height = dimensions.height
      }

      return {
        absolutePath,
        extension,
        sizeBytes: stat.size,
        width,
        height,
      }
    })

    for (const record of resolvedFiles) {
      if (!record) {
        continue
      }
      pushFile(record.absolutePath, record.extension, record.sizeBytes, record.width, record.height)
    }
  }

  files.sort((left, right) => left.absolutePath.localeCompare(right.absolutePath, 'zh-CN'))
  return files
}
