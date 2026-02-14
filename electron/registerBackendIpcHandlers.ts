import { app, BrowserWindow, clipboard, dialog, ipcMain, shell } from 'electron'
import { promises as fs } from 'node:fs'
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
import { BACKEND_CHANNELS } from './channels'
import { extractLikelyPaths, parseClipboardFileNameWBuffer } from './clipboardImportPaths'
import {
  moveDatabaseFiles,
  normalizeAbsoluteDirectory,
  readRuntimeStoragePaths,
  resolveDatabasePath,
  resolveRuntimeStoragePathsConfigPath,
  resolveThumbnailCachePath,
  writeRuntimeStoragePaths,
} from './backendRuntimeStorage'
import { MediaAccessError } from './fileSystemMediaAccessGuard'
import { FileSystemMediaReadService } from './fileSystemReadService'
import { isRuntimeDiagnosticsVerboseEnabled, logRuntimeDiagnostic, serializeUnknownError } from './runtimeDiagnostics'
import { registerMediaProtocolHandler } from './registerMediaProtocolHandler'
import { MetadataScraperService } from './services/metadata/metadataScraperService'

const MEDIA_ACCESS_FALLBACK_URL = 'data:application/octet-stream;base64,'
const MEDIA_ACCESS_FALLBACK_TTL_MS = 60_000

const AUDIO_FILE_FILTER_EXTENSIONS = ['mp3', 'flac', 'wav', 'ogg', 'm4a', 'opus', 'aac']
const GENERIC_MEDIA_FILE_FILTER_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'bmp',
  'mp4',
  'webm',
  'mkv',
  'mov',
  ...AUDIO_FILE_FILTER_EXTENSIONS,
  'zip',
  'rar',
  '7z',
]

export function registerBackendIpcHandlers(): void {
  const userDataPath = app.getPath('userData')
  const defaultLibraryRoot = path.join(app.getPath('pictures'), 'MediaPlayerXLibrary')
  const libraryRoot = path.resolve(process.env.MEDIA_PLAYERX_LIBRARY_ROOT ?? defaultLibraryRoot)
  const runtimeStoragePathsConfigPath = resolveRuntimeStoragePathsConfigPath(userDataPath)
  let runtimeStoragePaths = readRuntimeStoragePaths(runtimeStoragePathsConfigPath)
  let databasePath = resolveDatabasePath(libraryRoot, runtimeStoragePaths.database_dir)
  let thumbnailCachePath = resolveThumbnailCachePath(libraryRoot, runtimeStoragePaths.thumbnail_cache_dir)
  let service: FileSystemMediaReadService | null = null
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

  registerMediaProtocolHandler(ensureService)

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
    const targetMode = request.target_mode
    const fileExtensions = targetMode === 'music' ? AUDIO_FILE_FILTER_EXTENSIONS : GENERIC_MEDIA_FILE_FILTER_EXTENSIONS

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
                extensions: fileExtensions,
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
    const nextDatabasePath = resolveDatabasePath(libraryRoot, nextDatabaseDir)

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
