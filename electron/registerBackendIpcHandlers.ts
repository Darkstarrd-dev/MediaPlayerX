import { app, BrowserWindow, clipboard, dialog, ipcMain, shell } from 'electron'
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
  readSubtitleEngineStatusResponseSchema,
  listSubtitleRemoteModelsResponseSchema,
  listSubtitleLocalModelsRequestSchema,
  listSubtitleLocalModelsResponseSchema,
  startSubtitleModelDownloadRequestSchema,
  startSubtitleModelDownloadResponseSchema,
  cancelSubtitleModelDownloadRequestSchema,
  cancelSubtitleModelDownloadResponseSchema,
  readSubtitleModelDownloadsResponseSchema,
  startSubtitleSessionRequestSchema,
  startSubtitleSessionResponseSchema,
  stopSubtitleSessionRequestSchema,
  stopSubtitleSessionResponseSchema,
  resetSubtitleSessionRequestSchema,
  resetSubtitleSessionResponseSchema,
  flushSubtitleSessionResponseSchema,
  pushSubtitleAudioRequestSchema,
  pushSubtitleAudioResponseSchema,
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
  setImageHiddenRequestSchema,
  setImageHiddenResponseSchema,
  deleteImageItemsRequestSchema,
  deleteImageItemsResponseSchema,
  deleteSidebarNodesRequestSchema,
  deleteSidebarNodesResponseSchema,
  moveSidebarNodesRequestSchema,
  moveSidebarNodesResponseSchema,
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
  startManageCoverReviewRequestSchema,
  startManageCoverReviewResponseSchema,
  readManageCoverReviewTaskRequestSchema,
  readManageCoverReviewTaskResponseSchema,
  pauseManageCoverReviewTaskRequestSchema,
  pauseManageCoverReviewTaskResponseSchema,
  confirmManageCoverReviewHideRequestSchema,
  confirmManageCoverReviewHideResponseSchema,
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
import { buildImportPathsDialogOptions } from './importDialogOptions'
import {
  readRuntimeStoragePaths,
  resolveDatabasePath,
  resolveRuntimeStoragePathsConfigPath,
  resolveThumbnailCachePath,
} from './backendRuntimeStorage'
import { FileSystemMediaReadService } from './fileSystemReadService'
import { registerMediaProtocolHandler } from './registerMediaProtocolHandler'
import { registerResolveMediaResourceHandler } from './registerResolveMediaResourceHandler'
import { updateRuntimeStoragePaths } from './runtimeStorageUpdate'
import { MetadataScraperService } from './services/metadata/metadataScraperService'
import { getAllowedExternalUrlHosts, isExternalUrlAllowed } from './externalUrlPolicy'
import { SubtitleSessionManager } from './subtitles/subtitleSession'

export function registerBackendIpcHandlers(): void {
  const userDataPath = app.getPath('userData')
  const defaultLibraryRoot = path.join(app.getPath('pictures'), 'MediaPlayerXLibrary')
  const libraryRoot = path.resolve(process.env.MEDIA_PLAYERX_LIBRARY_ROOT ?? defaultLibraryRoot)
  const runtimeStoragePathsConfigPath = resolveRuntimeStoragePathsConfigPath(userDataPath)
  let runtimeStoragePaths = readRuntimeStoragePaths(runtimeStoragePathsConfigPath)
  let databasePath = resolveDatabasePath(libraryRoot, runtimeStoragePaths.database_dir)
  let thumbnailCachePath = resolveThumbnailCachePath(libraryRoot, runtimeStoragePaths.thumbnail_cache_dir)
  const allowedExternalUrlHosts = getAllowedExternalUrlHosts()
  let service: FileSystemMediaReadService | null = null
  const metadataScraper = new MetadataScraperService({
    defaultProxyServer: process.env.MEDIA_PLAYERX_PROXY_SERVER,
  })
  const subtitleSessionManager = new SubtitleSessionManager()

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
  registerResolveMediaResourceHandler(ensureService)

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

  ipcMain.handle(BACKEND_CHANNELS.moveSidebarNodes, async (_event, payload: unknown) => {
    const request = moveSidebarNodesRequestSchema.parse(payload)
    const response = await ensureService().moveSidebarNodes(request)
    return moveSidebarNodesResponseSchema.parse(response)
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

  ipcMain.handle(BACKEND_CHANNELS.startManageCoverReview, async (_event, payload: unknown) => {
    const request = startManageCoverReviewRequestSchema.parse(payload)
    const response = await ensureService().startManageCoverReview(request)
    return startManageCoverReviewResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.readManageCoverReviewTask, async (_event, payload: unknown) => {
    const request = readManageCoverReviewTaskRequestSchema.parse(payload)
    const response = await ensureService().readManageCoverReviewTask(request)
    return readManageCoverReviewTaskResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.pauseManageCoverReviewTask, async (_event, payload: unknown) => {
    const request = pauseManageCoverReviewTaskRequestSchema.parse(payload)
    const response = await ensureService().pauseManageCoverReviewTask(request)
    return pauseManageCoverReviewTaskResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.confirmManageCoverReviewHide, async (_event, payload: unknown) => {
    const request = confirmManageCoverReviewHideRequestSchema.parse(payload)
    const response = await ensureService().confirmManageCoverReviewHide(request)
    return confirmManageCoverReviewHideResponseSchema.parse(response)
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
    const result = await dialog.showOpenDialog(buildImportPathsDialogOptions(request.mode, request.target_mode))

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

  ipcMain.handle(BACKEND_CHANNELS.readSubtitleEngineStatus, async () => {
    const response = await ensureService().readSubtitleEngineStatus()
    return readSubtitleEngineStatusResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.listSubtitleRemoteModels, async () => {
    const response = await ensureService().listSubtitleRemoteModels()
    return listSubtitleRemoteModelsResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.listSubtitleLocalModels, async (_event, payload: unknown) => {
    const request = listSubtitleLocalModelsRequestSchema.parse(payload)
    const response = await ensureService().listSubtitleLocalModels(request)
    return listSubtitleLocalModelsResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.startSubtitleModelDownload, async (_event, payload: unknown) => {
    const request = startSubtitleModelDownloadRequestSchema.parse(payload)
    const response = await ensureService().startSubtitleModelDownload(request)
    return startSubtitleModelDownloadResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.cancelSubtitleModelDownload, async (_event, payload: unknown) => {
    const request = cancelSubtitleModelDownloadRequestSchema.parse(payload)
    const response = await ensureService().cancelSubtitleModelDownload(request)
    return cancelSubtitleModelDownloadResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.readSubtitleModelDownloads, async () => {
    const response = await ensureService().readSubtitleModelDownloads()
    return readSubtitleModelDownloadsResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.startSubtitleSession, async (event, payload: unknown) => {
    subtitleSessionManager.bindWebContents(event.sender)
    const request = startSubtitleSessionRequestSchema.parse(payload)
    const response = await subtitleSessionManager.startSession(event.sender.id, request)
    return startSubtitleSessionResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.stopSubtitleSession, async (event, payload: unknown) => {
    const request = stopSubtitleSessionRequestSchema.parse(payload ?? {})
    const response = await subtitleSessionManager.stopSession(event.sender.id, request)
    return stopSubtitleSessionResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.resetSubtitleSession, async (event, payload: unknown) => {
    const request = resetSubtitleSessionRequestSchema.parse(payload ?? {})
    const response = await subtitleSessionManager.resetSession(event.sender.id, request)
    return resetSubtitleSessionResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.flushSubtitleSession, async (event) => {
    const response = await subtitleSessionManager.flushSession(event.sender.id)
    return flushSubtitleSessionResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.pushSubtitleAudio, async (event, payload: unknown) => {
    const request = pushSubtitleAudioRequestSchema.parse(payload)
    const response = await subtitleSessionManager.pushAudio(event.sender.id, request)
    return pushSubtitleAudioResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.readRuntimeInfo, async () => {
    const gpuFeatureStatusRaw = app.getGPUFeatureStatus()
    const gpuFeatureStatus: Record<string, string> = {}
    for (const [key, value] of Object.entries(gpuFeatureStatusRaw)) {
      gpuFeatureStatus[key] = String(value)
    }

    const gpuInfoBasicRaw = await app.getGPUInfo('basic').catch(() => null)
    const gpuInfoBasic =
      gpuInfoBasicRaw && typeof gpuInfoBasicRaw === 'object'
        ? (gpuInfoBasicRaw as Record<string, unknown>)
        : undefined

    return readRuntimeInfoResponseSchema.parse({
      app_version: app.getVersion(),
      is_packaged: app.isPackaged,
      platform: process.platform,
      arch: process.arch,
      user_data_path: userDataPath,
      library_root: libraryRoot,
      database_path: databasePath,
      thumbnail_cache_path: thumbnailCachePath,
      hardware_acceleration_enabled: app.isHardwareAccelerationEnabled(),
      gpu_feature_status: gpuFeatureStatus,
      gpu_info_basic: gpuInfoBasic,
      media_capability_hints: [
        { id: 'h264-1080p', label: 'H.264 / AVC 1080p', content_type: 'video/mp4; codecs="avc1.640028"' },
        { id: 'hevc-1080p', label: 'H.265 / HEVC 1080p', content_type: 'video/mp4; codecs="hvc1.1.6.L120.B0"' },
        { id: 'av1-1080p', label: 'AV1 1080p', content_type: 'video/mp4; codecs="av01.0.08M.08"' },
        { id: 'vp9-1080p', label: 'VP9 1080p', content_type: 'video/webm; codecs="vp09.00.41.08"' },
      ],
    })
  })

  ipcMain.handle(BACKEND_CHANNELS.setRuntimeStoragePaths, async (_event, payload: unknown) => {
    const request = setRuntimeStoragePathsRequestSchema.parse(payload)
    const updateResult = await updateRuntimeStoragePaths({
      request,
      libraryRoot,
      databasePath,
      thumbnailCachePath,
      runtimeStoragePathsConfigPath,
      hasPersistedDatabasePayload,
      disposeService,
    })

    databasePath = updateResult.databasePath
    thumbnailCachePath = updateResult.thumbnailCachePath
    runtimeStoragePaths = updateResult.runtimeStoragePaths

    return setRuntimeStoragePathsResponseSchema.parse({
      database_path: databasePath,
      thumbnail_cache_path: thumbnailCachePath,
      moved_database: updateResult.movedDatabase,
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
    if (!isExternalUrlAllowed(request.url, allowedExternalUrlHosts)) {
      return openExternalUrlResponseSchema.parse({ ok: false })
    }

    await shell.openExternal(request.url)
    return openExternalUrlResponseSchema.parse({ ok: true })
  })

  ipcMain.handle(BACKEND_CHANNELS.clearDatabase, async () => {
    const response = await ensureService().clearDatabase()
    return clearDatabaseResponseSchema.parse(response)
  })
}
