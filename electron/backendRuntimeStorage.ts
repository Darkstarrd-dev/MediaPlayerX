import { promises as fs, readFileSync } from 'node:fs'
import path from 'node:path'

import { DATABASE_RELATIVE_PATH } from './mediaLibrarySchema'
import { THUMBNAIL_CACHE_DIR_NAME } from './services/file-system-read/fileSystemReadFacadeConfig'

const RUNTIME_STORAGE_PATHS_FILE_NAME = 'runtime-storage-paths.json'
const DATABASE_FILE_NAME = path.basename(DATABASE_RELATIVE_PATH)

export interface RuntimeStoragePathsConfig {
  database_dir?: string
  thumbnail_cache_dir?: string
}

export function resolveRuntimeStoragePathsConfigPath(userDataPath: string): string {
  return path.join(userDataPath, RUNTIME_STORAGE_PATHS_FILE_NAME)
}

export function normalizeAbsoluteDirectory(value: string | undefined): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  return path.resolve(trimmed)
}

export function resolveDatabasePath(libraryRoot: string, databaseDir: string | undefined): string {
  const normalizedDir = normalizeAbsoluteDirectory(databaseDir)
  if (!normalizedDir) {
    return path.resolve(libraryRoot, DATABASE_RELATIVE_PATH)
  }
  return path.join(normalizedDir, DATABASE_FILE_NAME)
}

export function resolveThumbnailCachePath(libraryRoot: string, thumbnailCacheDir: string | undefined): string {
  const normalizedDir = normalizeAbsoluteDirectory(thumbnailCacheDir)
  if (!normalizedDir) {
    return path.resolve(libraryRoot, THUMBNAIL_CACHE_DIR_NAME)
  }
  return normalizedDir
}

export function readRuntimeStoragePaths(configPath: string): RuntimeStoragePathsConfig {
  try {
    const rawText = readFileSync(configPath, 'utf8')
    const parsed = JSON.parse(rawText) as RuntimeStoragePathsConfig
    return {
      database_dir: normalizeAbsoluteDirectory(parsed.database_dir) ?? undefined,
      thumbnail_cache_dir: normalizeAbsoluteDirectory(parsed.thumbnail_cache_dir) ?? undefined,
    }
  } catch {
    return {}
  }
}

export async function writeRuntimeStoragePaths(configPath: string, config: RuntimeStoragePathsConfig): Promise<void> {
  const normalized: RuntimeStoragePathsConfig = {
    database_dir: normalizeAbsoluteDirectory(config.database_dir) ?? undefined,
    thumbnail_cache_dir: normalizeAbsoluteDirectory(config.thumbnail_cache_dir) ?? undefined,
  }
  await fs.mkdir(path.dirname(configPath), { recursive: true })
  await fs.writeFile(configPath, JSON.stringify(normalized, null, 2), 'utf8')
}

async function moveFileWithFallback(sourcePath: string, targetPath: string): Promise<void> {
  try {
    await fs.rename(sourcePath, targetPath)
  } catch (error) {
    const isCrossDevice =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'EXDEV'

    if (!isCrossDevice) {
      throw error
    }

    await fs.copyFile(sourcePath, targetPath)
    await fs.unlink(sourcePath)
  }
}

export async function moveDatabaseFiles(sourceDatabasePath: string, targetDatabasePath: string): Promise<void> {
  await fs.mkdir(path.dirname(targetDatabasePath), { recursive: true })
  await fs.rm(targetDatabasePath, { force: true })
  await fs.rm(`${targetDatabasePath}-wal`, { force: true })
  await fs.rm(`${targetDatabasePath}-shm`, { force: true })
  await moveFileWithFallback(sourceDatabasePath, targetDatabasePath)

  for (const suffix of ['-wal', '-shm']) {
    const sourceSidecarPath = `${sourceDatabasePath}${suffix}`
    const targetSidecarPath = `${targetDatabasePath}${suffix}`
    const exists = await fs
      .access(sourceSidecarPath)
      .then(() => true)
      .catch(() => false)
    if (!exists) {
      continue
    }
    await moveFileWithFallback(sourceSidecarPath, targetSidecarPath)
  }
}
