import { app, BrowserWindow, clipboard, dialog, ipcMain, protocol, shell } from 'electron'
import { promises as fs, readFileSync } from 'node:fs'
import path from 'node:path'

import {
  clearDatabaseResponseSchema,
  enqueueImportTaskRequestSchema,
  enqueueImportTaskResponseSchema,
  librarySnapshotDtoSchema,
  mediaAccessAuditResponseSchema,
  pickImportPathsRequestSchema,
  pickImportPathsResponseSchema,
  pickFilePathRequestSchema,
  pickFilePathResponseSchema,
  pickDirectoryPathRequestSchema,
  pickDirectoryPathResponseSchema,
  readClipboardImportPathsResponseSchema,
  readRuntimeCapabilitiesResponseSchema,
  readRuntimeInfoResponseSchema,
  setRuntimeStoragePathsRequestSchema,
  setRuntimeStoragePathsResponseSchema,
  readArchiveLoadStatusResponseSchema,
  readImportTasksResponseSchema,
  readPlaylistResponseSchema,
  listVideoSubtitlesRequestSchema,
  listVideoSubtitlesResponseSchema,
  prepareSubtitleTrackRequestSchema,
  prepareSubtitleTrackResponseSchema,
  readImageMetadataRequestSchema,
  readImageMetadataResponseSchema,
  readImagePageRequestSchema,
  readImagePageResponseSchema,
  readImageSidebarTreeRequestSchema,
  readImageSidebarTreeResponseSchema,
  resolveMediaResourceRequestSchema,
  resolveMediaResourceResponseSchema,
  setImageHiddenRequestSchema,
  setImageHiddenResponseSchema,
  deleteImageItemsRequestSchema,
  deleteImageItemsResponseSchema,
  deleteSidebarNodesRequestSchema,
  deleteSidebarNodesResponseSchema,
  startManageAdReviewRequestSchema,
  startManageAdReviewResponseSchema,
  readManageAdReviewTaskRequestSchema,
  readManageAdReviewTaskResponseSchema,
  pauseManageAdReviewTaskRequestSchema,
  pauseManageAdReviewTaskResponseSchema,
  testAdReviewVisionModelRequestSchema,
  testAdReviewVisionModelResponseSchema,
  confirmManageAdReviewDeleteRequestSchema,
  confirmManageAdReviewDeleteResponseSchema,
  saveVideoCoverRequestSchema,
  saveVideoCoverResponseSchema,
  retryImportTaskRequestSchema,
  retryImportTaskResponseSchema,
  writePlaylistRequestSchema,
  writePlaylistResponseSchema,
  writePackageMetadataRequestSchema,
  writePackageMetadataResponseSchema,
  writePackageExternalMetadataRequestSchema,
  writePackageExternalMetadataResponseSchema,
  searchExternalMetadataRequestSchema,
  searchExternalMetadataResponseSchema,
  writeVideoMetadataRequestSchema,
  writeVideoMetadataResponseSchema,
  writeAudioMetadataRequestSchema,
  writeAudioMetadataResponseSchema,
  writePackageGradeRequestSchema,
  writePackageGradeResponseSchema,
  readAppStateRequestSchema,
  readAppStateResponseSchema,
  writeAppStateRequestSchema,
  writeAppStateResponseSchema,
  openExternalUrlRequestSchema,
  openExternalUrlResponseSchema,
} from '../src/contracts/backend'
import { BACKEND_CHANNELS, MEDIA_PROTOCOL_SCHEME } from './channels'
import { MediaAccessError } from './fileSystemMediaAccessGuard'
import { FileSystemMediaReadService } from './fileSystemReadService'
import { DATABASE_RELATIVE_PATH } from './mediaLibrarySchema'
import { isRuntimeDiagnosticsVerboseEnabled, logRuntimeDiagnostic, serializeUnknownError } from './runtimeDiagnostics'
import { THUMBNAIL_CACHE_DIR_NAME } from './services/file-system-read/fileSystemReadFacadeConfig'
import { MetadataScraperService } from './services/metadata/metadataScraperService'

const MEDIA_ACCESS_FALLBACK_URL = 'data:application/octet-stream;base64,'
const MEDIA_ACCESS_FALLBACK_TTL_MS = 60_000
const RUNTIME_STORAGE_PATHS_FILE_NAME = 'runtime-storage-paths.json'
const DATABASE_FILE_NAME = path.basename(DATABASE_RELATIVE_PATH)

interface RuntimeStoragePathsConfig {
  database_dir?: string
  thumbnail_cache_dir?: string
}

function normalizeAbsoluteDirectory(value: string | undefined): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  return path.resolve(trimmed)
}

function resolveDatabasePath(libraryRoot: string, databaseDir: string | undefined): string {
  const normalizedDir = normalizeAbsoluteDirectory(databaseDir)
  if (!normalizedDir) {
    return path.resolve(libraryRoot, DATABASE_RELATIVE_PATH)
  }
  return path.join(normalizedDir, DATABASE_FILE_NAME)
}

function resolveThumbnailCachePath(libraryRoot: string, thumbnailCacheDir: string | undefined): string {
  const normalizedDir = normalizeAbsoluteDirectory(thumbnailCacheDir)
  if (!normalizedDir) {
    return path.resolve(libraryRoot, THUMBNAIL_CACHE_DIR_NAME)
  }
  return normalizedDir
}

function readRuntimeStoragePaths(configPath: string): RuntimeStoragePathsConfig {
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

async function writeRuntimeStoragePaths(configPath: string, config: RuntimeStoragePathsConfig): Promise<void> {
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

async function moveDatabaseFiles(sourceDatabasePath: string, targetDatabasePath: string): Promise<void> {
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

function extractLikelyPaths(raw: string): string[] {
  const tokens = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  return Array.from(
    new Set(
      tokens.filter((token) => /^[a-zA-Z]:[\\/]/.test(token) || /^\\\\[^\\]+\\[^\\]+/.test(token)),
    ),
  )
}

function parseClipboardFileNameWBuffer(buffer: Buffer): string[] {
  if (buffer.length === 0) {
    return []
  }

  const text = buffer.toString('utf16le')
  const tokens = text
    .split('\u0000')
    .map((line) => line.trim())
    .filter(Boolean)

  return Array.from(new Set(tokens))
}

export function registerBackendIpcHandlers(): void {
  const userDataPath = app.getPath('userData')
  const defaultLibraryRoot = path.join(app.getPath('pictures'), 'MediaPlayerXLibrary')
  const libraryRoot = path.resolve(process.env.MEDIA_PLAYERX_LIBRARY_ROOT ?? defaultLibraryRoot)
  const runtimeStoragePathsConfigPath = path.join(userDataPath, RUNTIME_STORAGE_PATHS_FILE_NAME)
  let runtimeStoragePaths = readRuntimeStoragePaths(runtimeStoragePathsConfigPath)
  let databasePath = resolveDatabasePath(libraryRoot, runtimeStoragePaths.database_dir)
  let thumbnailCachePath = resolveThumbnailCachePath(libraryRoot, runtimeStoragePaths.thumbnail_cache_dir)
  let service: FileSystemMediaReadService | null = null
  let protocolReadFailureCount = 0
  let resolveMediaResourceCount = 0
  let resolveMediaResourceFailureCount = 0
  const metadataScraper = new MetadataScraperService({
    defaultProxyServer: process.env.MEDIA_PLAYERX_PROXY_SERVER,
  })

  const broadcastLibraryChanged = (payload: { reason: string; updated_at_ms: number }) => {
    for (const window of BrowserWindow.getAllWindows()) {
      try {
        if (!window.isDestroyed()) {
          window.webContents.send(BACKEND_CHANNELS.libraryChanged, payload)
        }
      } catch {
        // ignore send failures
      }
    }
  }

  const disposeService = (): void => {
    if (!service) {
      return
    }
    service.dispose()
    service = null
  }

  const ensureService = (): FileSystemMediaReadService => {
    if (service) {
      return service
    }

    service = new FileSystemMediaReadService({
      rootDir: libraryRoot,
      databaseFilePath: databasePath,
      thumbnailCacheRootDir: thumbnailCachePath,
    })
    service.onLibraryChanged((payload) => {
      broadcastLibraryChanged(payload)
    })

    return service
  }

  const hasPersistedDatabasePayload = async (): Promise<boolean> => {
    const activeService = ensureService()
    const [snapshot, playlist, importTasks] = await Promise.all([
      activeService.readLibrarySnapshot(),
      activeService.readPlaylist(),
      activeService.readImportTasks(),
    ])

    return (
      snapshot.image_packages.length > 0 ||
      snapshot.image_directories.length > 0 ||
      snapshot.videos.length > 0 ||
      playlist.video_ids.length > 0 ||
      importTasks.tasks.length > 0
    )
  }

  protocol.handle(MEDIA_PROTOCOL_SCHEME, async (request) => {
    const requestUrl = new URL(request.url)
    const token = decodeURIComponent(requestUrl.pathname.replace(/^\//, ''))
    if (!token) {
      return new Response('invalid media token', { status: 400 })
    }

    try {
      const payload = await ensureService().readMediaResourceByTokenStream(
        token,
        request.headers.get('range'),
        request.signal,
      )
      return new Response(payload.body, {
        status: payload.status,
        headers: payload.headers,
      })
    } catch (error) {
      protocolReadFailureCount += 1
      if (isRuntimeDiagnosticsVerboseEnabled() || protocolReadFailureCount <= 10 || protocolReadFailureCount % 50 === 0) {
        logRuntimeDiagnostic('media-protocol-read-failed', {
          count: protocolReadFailureCount,
          tokenPrefix: token.slice(0, 8),
          hasRangeHeader: Boolean(request.headers.get('range')),
          error: serializeUnknownError(error),
        }, 'warn')
      }
      return new Response('media not found', { status: 404 })
    }
  })

  ipcMain.handle(BACKEND_CHANNELS.readLibrarySnapshot, async () => {
    const response = await ensureService().readLibrarySnapshot()
    return librarySnapshotDtoSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.readImageSidebarTree, async (_event, payload: unknown) => {
    const request = readImageSidebarTreeRequestSchema.parse(payload)
    const response = await ensureService().readImageSidebarTree(request)
    return readImageSidebarTreeResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.readImagePage, async (_event, payload: unknown) => {
    const request = readImagePageRequestSchema.parse(payload)
    const response = await ensureService().readImagePage(request)
    return readImagePageResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.readImageMetadata, async (_event, payload: unknown) => {
    const request = readImageMetadataRequestSchema.parse(payload)
    const response = await ensureService().readImageMetadata(request)
    return readImageMetadataResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.resolveMediaResource, async (_event, payload: unknown) => {
    const request = resolveMediaResourceRequestSchema.parse(payload)
    resolveMediaResourceCount += 1
    try {
      const response = await ensureService().resolveMediaResource(request)
      if (isRuntimeDiagnosticsVerboseEnabled() && resolveMediaResourceCount % 200 === 0) {
        const audit = await ensureService().readMediaAccessAudit()
        logRuntimeDiagnostic('resolve-media-resource-audit', {
          requestCount: resolveMediaResourceCount,
          failureCount: resolveMediaResourceFailureCount,
          audit,
        })
      }
      return resolveMediaResourceResponseSchema.parse(response)
    } catch (error) {
      if (!(error instanceof MediaAccessError)) {
        resolveMediaResourceFailureCount += 1
        if (isRuntimeDiagnosticsVerboseEnabled() || resolveMediaResourceFailureCount <= 10 || resolveMediaResourceFailureCount % 50 === 0) {
          logRuntimeDiagnostic('resolve-media-resource-error', {
            requestCount: resolveMediaResourceCount,
            failureCount: resolveMediaResourceFailureCount,
            locatorKind: request.locator.kind,
            preferredVariant: request.preferred_variant,
            error: serializeUnknownError(error),
          }, 'warn')
        }
        throw error
      }

      console.warn('resolveMediaResource fallback', {
        reason: error.reason,
      })

      return resolveMediaResourceResponseSchema.parse({
        resource_url: MEDIA_ACCESS_FALLBACK_URL,
        mime_type: 'application/octet-stream',
        expires_at_ms: Date.now() + MEDIA_ACCESS_FALLBACK_TTL_MS,
      })
    }
  })

  ipcMain.handle(BACKEND_CHANNELS.writePackageGrade, async (_event, payload: unknown) => {
    const request = writePackageGradeRequestSchema.parse(payload)
    const response = await ensureService().writePackageGrade(request)
    return writePackageGradeResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.setImageHidden, async (_event, payload: unknown) => {
    const request = setImageHiddenRequestSchema.parse(payload)
    const response = await ensureService().setImageHidden(request)
    return setImageHiddenResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.deleteImageItems, async (_event, payload: unknown) => {
    const request = deleteImageItemsRequestSchema.parse(payload)
    const response = await ensureService().deleteImageItems(request)
    return deleteImageItemsResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.deleteSidebarNodes, async (_event, payload: unknown) => {
    const request = deleteSidebarNodesRequestSchema.parse(payload)
    const response = await ensureService().deleteSidebarNodes(request)
    return deleteSidebarNodesResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.startManageAdReview, async (_event, payload: unknown) => {
    const request = startManageAdReviewRequestSchema.parse(payload)
    const response = await ensureService().startManageAdReview(request)
    return startManageAdReviewResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.readManageAdReviewTask, async (_event, payload: unknown) => {
    const request = readManageAdReviewTaskRequestSchema.parse(payload)
    const response = await ensureService().readManageAdReviewTask(request)
    return readManageAdReviewTaskResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.pauseManageAdReviewTask, async (_event, payload: unknown) => {
    const request = pauseManageAdReviewTaskRequestSchema.parse(payload)
    const response = await ensureService().pauseManageAdReviewTask(request)
    return pauseManageAdReviewTaskResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.testAdReviewVisionModel, async (_event, payload: unknown) => {
    const request = testAdReviewVisionModelRequestSchema.parse(payload)
    const response = await ensureService().testAdReviewVisionModel(request)
    return testAdReviewVisionModelResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.confirmManageAdReviewDelete, async (_event, payload: unknown) => {
    const request = confirmManageAdReviewDeleteRequestSchema.parse(payload)
    const response = await ensureService().confirmManageAdReviewDelete(request)
    return confirmManageAdReviewDeleteResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.writePackageMetadata, async (_event, payload: unknown) => {
    const request = writePackageMetadataRequestSchema.parse(payload)
    const response = await ensureService().writePackageMetadata(request)
    return writePackageMetadataResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.writePackageExternalMetadata, async (_event, payload: unknown) => {
    const request = writePackageExternalMetadataRequestSchema.parse(payload)
    const response = await ensureService().writePackageExternalMetadata(request)
    return writePackageExternalMetadataResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.searchExternalMetadata, async (_event, payload: unknown) => {
    const request = searchExternalMetadataRequestSchema.parse(payload)
    const response = await metadataScraper.search(request)
    return searchExternalMetadataResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.writeVideoMetadata, async (_event, payload: unknown) => {
    const request = writeVideoMetadataRequestSchema.parse(payload)
    const response = await ensureService().writeVideoMetadata(request)
    return writeVideoMetadataResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.writeAudioMetadata, async (_event, payload: unknown) => {
    const request = writeAudioMetadataRequestSchema.parse(payload)
    const response = await ensureService().writeAudioMetadata(request)
    return writeAudioMetadataResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.saveVideoCover, async (_event, payload: unknown) => {
    const request = saveVideoCoverRequestSchema.parse(payload)
    const response = await ensureService().saveVideoCover(request)
    return saveVideoCoverResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.readPlaylist, async () => {
    const response = await ensureService().readPlaylist()
    return readPlaylistResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.writePlaylist, async (_event, payload: unknown) => {
    const request = writePlaylistRequestSchema.parse(payload)
    const response = await ensureService().writePlaylist(request)
    return writePlaylistResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.listVideoSubtitles, async (_event, payload: unknown) => {
    const request = listVideoSubtitlesRequestSchema.parse(payload)
    const response = await ensureService().listVideoSubtitles(request)
    return listVideoSubtitlesResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.prepareSubtitleTrack, async (_event, payload: unknown) => {
    const request = prepareSubtitleTrackRequestSchema.parse(payload)
    const response = await ensureService().prepareSubtitleTrack(request)
    return prepareSubtitleTrackResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.pickImportPaths, async (_event, payload: unknown) => {
    const request = pickImportPathsRequestSchema.parse(payload)
    const mode = request.mode

    const result = await dialog.showOpenDialog({
      title: mode === 'folders' ? '选择要导入的文件夹' : '选择要导入的文件',
      properties:
        mode === 'folders' ? ['openDirectory', 'multiSelections', 'dontAddToRecent'] : ['openFile', 'multiSelections', 'dontAddToRecent'],
      filters:
        mode === 'folders'
          ? undefined
          : [
              {
                name: '媒体文件',
                extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'mp4', 'webm', 'mkv', 'mov', 'zip', 'rar', '7z'],
              },
            ],
    })

    return pickImportPathsResponseSchema.parse({
      paths: result.canceled ? [] : result.filePaths,
    })
  })

  ipcMain.handle(BACKEND_CHANNELS.pickFilePath, async (_event, payload: unknown) => {
    const request = pickFilePathRequestSchema.parse(payload)
    const result = await dialog.showOpenDialog({
      title: request.title ?? '选择文件',
      defaultPath: request.default_path,
      properties: ['openFile', 'dontAddToRecent'],
      filters: request.filters,
    })

    return pickFilePathResponseSchema.parse({
      canceled: result.canceled,
      path: result.canceled ? null : (result.filePaths[0] ?? null),
    })
  })

  ipcMain.handle(BACKEND_CHANNELS.pickDirectoryPath, async (_event, payload: unknown) => {
    const request = pickDirectoryPathRequestSchema.parse(payload)
    const result = await dialog.showOpenDialog({
      title: request.title ?? '选择目录',
      defaultPath: request.default_path,
      properties: ['openDirectory', 'dontAddToRecent'],
    })

    return pickDirectoryPathResponseSchema.parse({
      canceled: result.canceled,
      path: result.canceled ? null : (result.filePaths[0] ?? null),
    })
  })

  ipcMain.handle(BACKEND_CHANNELS.readClipboardImportPaths, async () => {
    const paths = new Set<string>()

    try {
      const fileNameWBuffer = clipboard.readBuffer('FileNameW')
      for (const pathValue of parseClipboardFileNameWBuffer(fileNameWBuffer)) {
        paths.add(pathValue)
      }
    } catch {
      // ignore clipboard format unsupported
    }

    const plainText = clipboard.readText()
    for (const pathValue of extractLikelyPaths(plainText)) {
      paths.add(pathValue)
    }

    return readClipboardImportPathsResponseSchema.parse({
      paths: Array.from(paths),
    })
  })

  ipcMain.handle(BACKEND_CHANNELS.enqueueImportTask, async (_event, payload: unknown) => {
    const request = enqueueImportTaskRequestSchema.parse(payload)
    const response = await ensureService().enqueueImportTask(request)
    return enqueueImportTaskResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.readImportTasks, async () => {
    const response = await ensureService().readImportTasks()
    return readImportTasksResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.retryImportTask, async (_event, payload: unknown) => {
    const request = retryImportTaskRequestSchema.parse(payload)
    const response = await ensureService().retryImportTask(request)
    return retryImportTaskResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.readMediaAccessAudit, async () => {
    const response = await ensureService().readMediaAccessAudit()
    return mediaAccessAuditResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.readRuntimeCapabilities, async () => {
    const response = await ensureService().readRuntimeCapabilities()
    return readRuntimeCapabilitiesResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.readRuntimeInfo, async () => {
    return readRuntimeInfoResponseSchema.parse({
      app_version: app.getVersion(),
      is_packaged: app.isPackaged,
      platform: process.platform,
      arch: process.arch,
      user_data_path: userDataPath,
      library_root: libraryRoot,
      database_path: databasePath,
      thumbnail_cache_path: thumbnailCachePath,
    })
  })

  ipcMain.handle(BACKEND_CHANNELS.setRuntimeStoragePaths, async (_event, payload: unknown) => {
    const request = setRuntimeStoragePathsRequestSchema.parse(payload)
    const nextDatabaseDir = normalizeAbsoluteDirectory(request.database_dir) ?? path.dirname(databasePath)
    const nextThumbnailCachePath =
      normalizeAbsoluteDirectory(request.thumbnail_cache_dir) ?? thumbnailCachePath
    const nextDatabasePath = path.join(nextDatabaseDir, DATABASE_FILE_NAME)

    const databasePathChanged = path.resolve(nextDatabasePath) !== path.resolve(databasePath)
    const thumbnailPathChanged = path.resolve(nextThumbnailCachePath) !== path.resolve(thumbnailCachePath)
    let movedDatabase = false

    if (databasePathChanged || thumbnailPathChanged) {
      const previousDatabasePath = databasePath
      const shouldMoveDatabase = databasePathChanged
        ? await hasPersistedDatabasePayload().catch(() => true)
        : false
      disposeService()

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
      await writeRuntimeStoragePaths(runtimeStoragePathsConfigPath, runtimeStoragePaths)
    }

    return setRuntimeStoragePathsResponseSchema.parse({
      database_path: databasePath,
      thumbnail_cache_path: thumbnailCachePath,
      moved_database: movedDatabase,
      updated_at_ms: Date.now(),
    })
  })

  ipcMain.handle(BACKEND_CHANNELS.readArchiveLoadStatus, async () => {
    const response = await ensureService().readArchiveLoadStatus()
    return readArchiveLoadStatusResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.readAppState, async (_event, payload: unknown) => {
    const request = readAppStateRequestSchema.parse(payload)
    const response = await ensureService().readAppState(request)
    return readAppStateResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.writeAppState, async (_event, payload: unknown) => {
    const request = writeAppStateRequestSchema.parse(payload)
    const response = await ensureService().writeAppState(request)
    return writeAppStateResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.openExternalUrl, async (_event, payload: unknown) => {
    const request = openExternalUrlRequestSchema.parse(payload)
    await shell.openExternal(request.url)
    return openExternalUrlResponseSchema.parse({ ok: true })
  })

  ipcMain.handle(BACKEND_CHANNELS.clearDatabase, async () => {
    const response = await ensureService().clearDatabase()
    return clearDatabaseResponseSchema.parse(response)
  })
}
