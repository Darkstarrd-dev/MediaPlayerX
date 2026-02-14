import { promises as fs } from 'node:fs'
import path from 'node:path'

import {
  moveDatabaseFiles,
  normalizeAbsoluteDirectory,
  resolveDatabasePath,
  writeRuntimeStoragePaths,
  type RuntimeStoragePathsConfig,
} from './backendRuntimeStorage'

interface RuntimeStorageUpdateParams {
  request: {
    database_dir?: string
    thumbnail_cache_dir?: string
  }
  libraryRoot: string
  databasePath: string
  thumbnailCachePath: string
  runtimeStoragePathsConfigPath: string
  hasPersistedDatabasePayload: () => Promise<boolean>
  disposeService: () => void
}

interface RuntimeStorageUpdateResult {
  databasePath: string
  thumbnailCachePath: string
  runtimeStoragePaths: RuntimeStoragePathsConfig
  movedDatabase: boolean
}

export async function updateRuntimeStoragePaths(params: RuntimeStorageUpdateParams): Promise<RuntimeStorageUpdateResult> {
  const nextDatabaseDir = normalizeAbsoluteDirectory(params.request.database_dir) ?? path.dirname(params.databasePath)
  const nextThumbnailCachePath = normalizeAbsoluteDirectory(params.request.thumbnail_cache_dir) ?? params.thumbnailCachePath
  const nextDatabasePath = resolveDatabasePath(params.libraryRoot, nextDatabaseDir)

  const databasePathChanged = path.resolve(nextDatabasePath) !== path.resolve(params.databasePath)
  const thumbnailPathChanged = path.resolve(nextThumbnailCachePath) !== path.resolve(params.thumbnailCachePath)
  let movedDatabase = false
  let databasePath = params.databasePath
  let thumbnailCachePath = params.thumbnailCachePath
  let runtimeStoragePaths: RuntimeStoragePathsConfig = {
    database_dir: path.dirname(databasePath),
    thumbnail_cache_dir: thumbnailCachePath,
  }

  if (databasePathChanged || thumbnailPathChanged) {
    const previousDatabasePath = params.databasePath
    const shouldMoveDatabase = databasePathChanged ? await params.hasPersistedDatabasePayload().catch(() => true) : false
    params.disposeService()

    if (databasePathChanged) {
      const canMoveDatabase = await fs
        .stat(previousDatabasePath)
        .then((stat) => stat.isFile() && stat.size > 0)
        .catch(() => false)

      if (shouldMoveDatabase && canMoveDatabase) {
        await moveDatabaseFiles(previousDatabasePath, nextDatabasePath)
        movedDatabase = true
      }
    }

    databasePath = path.resolve(nextDatabasePath)
    thumbnailCachePath = path.resolve(nextThumbnailCachePath)
    await fs.mkdir(path.dirname(databasePath), { recursive: true })
    await fs.mkdir(thumbnailCachePath, { recursive: true })

    runtimeStoragePaths = {
      database_dir: path.dirname(databasePath),
      thumbnail_cache_dir: thumbnailCachePath,
    }
    await writeRuntimeStoragePaths(params.runtimeStoragePathsConfigPath, runtimeStoragePaths)
  }

  return {
    databasePath,
    thumbnailCachePath,
    runtimeStoragePaths,
    movedDatabase,
  }
}
