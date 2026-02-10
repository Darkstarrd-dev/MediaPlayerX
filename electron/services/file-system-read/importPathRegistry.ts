import path from 'node:path'

import { isPathInsideRoot, normalizeAllowlistKey } from '../../fileSystemServiceHelpers'

export interface ImportSourcesSnapshot {
  directories: string[]
  files: string[]
}

export class ImportPathRegistry {
  private importSources: ImportSourcesSnapshot = { directories: [], files: [] }

  private importDirectoryRoots: string[] = []

  private importFileAllowlistKeys = new Set<string>()

  hydrate(rawImportSources: ImportSourcesSnapshot): void {
    const directoryMap = new Map<string, string>()
    const fileMap = new Map<string, string>()

    for (const value of rawImportSources.directories) {
      const resolved = path.resolve(value)
      const key = normalizeAllowlistKey(resolved)
      directoryMap.set(key, resolved)
    }

    for (const value of rawImportSources.files) {
      const resolved = path.resolve(value)
      const key = normalizeAllowlistKey(resolved)
      fileMap.set(key, resolved)
    }

    this.importSources = {
      directories: Array.from(directoryMap.values()),
      files: Array.from(fileMap.values()),
    }
    this.importDirectoryRoots = this.importSources.directories
    this.importFileAllowlistKeys = new Set(fileMap.keys())
  }

  clear(): void {
    this.importSources = { directories: [], files: [] }
    this.importDirectoryRoots = []
    this.importFileAllowlistKeys.clear()
  }

  getImportSources(): ImportSourcesSnapshot {
    return {
      directories: [...this.importSources.directories],
      files: [...this.importSources.files],
    }
  }

  getImportDirectoryRoots(): string[] {
    return this.importDirectoryRoots
  }

  getImportFilePaths(): string[] {
    return this.importSources.files
  }

  getImportFileAllowlistKeys(): Set<string> {
    return this.importFileAllowlistKeys
  }

  hasImportFile(absolutePath: string): boolean {
    return this.importFileAllowlistKeys.has(normalizeAllowlistKey(path.resolve(absolutePath)))
  }

  replaceImportedFileSourcePath(sourceArchivePath: string, outputZipPath: string): boolean {
    const sourceKey = normalizeAllowlistKey(sourceArchivePath)
    if (!this.importFileAllowlistKeys.has(sourceKey)) {
      return false
    }

    const nextFilesMap = new Map<string, string>()
    for (const filePath of this.importSources.files) {
      const key = normalizeAllowlistKey(filePath)
      if (key === sourceKey) {
        continue
      }
      nextFilesMap.set(key, path.resolve(filePath))
    }

    const resolvedOutputPath = path.resolve(outputZipPath)
    const outputKey = normalizeAllowlistKey(resolvedOutputPath)
    nextFilesMap.set(outputKey, resolvedOutputPath)

    const nextFiles = Array.from(nextFilesMap.values())
    this.importSources = {
      directories: [...this.importSources.directories],
      files: nextFiles,
    }
    this.importFileAllowlistKeys = new Set(nextFilesMap.keys())

    return true
  }

  removeImportSourcePaths(pathsToRemove: string[]): boolean {
    if (pathsToRemove.length === 0) {
      return false
    }

    const removeRoots = pathsToRemove.map((value) => path.resolve(value))
    const shouldRemovePath = (candidatePath: string): boolean => {
      const resolvedCandidatePath = path.resolve(candidatePath)
      return removeRoots.some(
        (rootPath) =>
          normalizeAllowlistKey(rootPath) === normalizeAllowlistKey(resolvedCandidatePath) ||
          isPathInsideRoot(rootPath, resolvedCandidatePath),
      )
    }

    const nextDirectories = this.importSources.directories
      .map((value) => path.resolve(value))
      .filter((value) => !shouldRemovePath(value))
    const nextFiles = this.importSources.files
      .map((value) => path.resolve(value))
      .filter((value) => !shouldRemovePath(value))

    const currentDirectoriesKey = this.importSources.directories
      .map((value) => normalizeAllowlistKey(path.resolve(value)))
      .join('|')
    const nextDirectoriesKey = nextDirectories.map((value) => normalizeAllowlistKey(value)).join('|')
    const currentFilesKey = this.importSources.files
      .map((value) => normalizeAllowlistKey(path.resolve(value)))
      .join('|')
    const nextFilesKey = nextFiles.map((value) => normalizeAllowlistKey(value)).join('|')

    if (currentDirectoriesKey === nextDirectoriesKey && currentFilesKey === nextFilesKey) {
      return false
    }

    this.importSources = {
      directories: nextDirectories,
      files: nextFiles,
    }
    this.importDirectoryRoots = nextDirectories
    this.importFileAllowlistKeys = new Set(nextFiles.map((value) => normalizeAllowlistKey(value)))

    return true
  }
}
