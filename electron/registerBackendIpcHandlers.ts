import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  shell,
} from "electron";
import path from "node:path";

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
  clearSubtitleLocalModelRequestSchema,
  clearSubtitleLocalModelResponseSchema,
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
  renameSidebarNodeRequestSchema,
  renameSidebarNodeResponseSchema,
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
  startManageSubtitleCleanupRequestSchema,
  startManageSubtitleCleanupResponseSchema,
  readManageSubtitleCleanupTaskRequestSchema,
  readManageSubtitleCleanupTaskResponseSchema,
  runManageSubtitleCleanupRequestSchema,
  runManageSubtitleCleanupResponseSchema,
  saveManageSubtitleCleanupRequestSchema,
  saveManageSubtitleCleanupResponseSchema,
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
} from "../src/contracts/backend";
import { BACKEND_CHANNELS } from "./channels";
import {
  extractLikelyPaths,
  parseClipboardFileNameWBuffer,
} from "./clipboardImportPaths";
import { buildImportPathsDialogOptions } from "./importDialogOptions";
import {
  readRuntimeStoragePaths,
  resolveDatabasePath,
  resolveRuntimeStoragePathsConfigPath,
  resolveThumbnailCachePath,
} from "./backendRuntimeStorage";
import { FileSystemMediaReadService } from "./fileSystemReadService";
import { registerMediaProtocolHandler } from "./registerMediaProtocolHandler";
import { registerResolveMediaResourceHandler } from "./registerResolveMediaResourceHandler";
import { updateRuntimeStoragePaths } from "./runtimeStorageUpdate";
import { MetadataScraperService } from "./services/metadata/metadataScraperService";
import {
  getAllowedExternalUrlHosts,
  isExternalUrlAllowed,
} from "./externalUrlPolicy";
import { SubtitleSessionManager } from "./subtitles/subtitleSession";

export function registerBackendIpcHandlers(): void {
  const userDataPath = app.getPath("userData");
  const defaultLibraryRoot = path.join(
    app.getPath("pictures"),
    "MediaPlayerXLibrary",
  );
  const libraryRoot = path.resolve(
    process.env.MEDIA_PLAYERX_LIBRARY_ROOT ?? defaultLibraryRoot,
  );
  const runtimeStoragePathsConfigPath =
    resolveRuntimeStoragePathsConfigPath(userDataPath);
  let runtimeStoragePaths = readRuntimeStoragePaths(
    runtimeStoragePathsConfigPath,
  );
  let databasePath = resolveDatabasePath(
    libraryRoot,
    runtimeStoragePaths.database_dir,
  );
  let thumbnailCachePath = resolveThumbnailCachePath(
    libraryRoot,
    runtimeStoragePaths.thumbnail_cache_dir,
  );
  const allowedExternalUrlHosts = getAllowedExternalUrlHosts();
  let service: FileSystemMediaReadService | null = null;
  const metadataScraper = new MetadataScraperService({
    defaultProxyServer: process.env.MEDIA_PLAYERX_PROXY_SERVER,
  });
  const subtitleSessionManager = new SubtitleSessionManager();

  const broadcastLibraryChanged = (payload: {
    reason: string;
    updated_at_ms: number;
  }) => {
    for (const window of BrowserWindow.getAllWindows()) {
      try {
        if (!window.isDestroyed()) {
          window.webContents.send(BACKEND_CHANNELS.libraryChanged, payload);
        }
      } catch {
        // ignore send failures
      }
    }
  };

  const disposeService = (): void => {
    if (!service) {
      return;
    }
    service.dispose();
    service = null;
  };

  const ensureService = (): FileSystemMediaReadService => {
    if (service) {
      return service;
    }

    service = new FileSystemMediaReadService({
      rootDir: libraryRoot,
      databaseFilePath: databasePath,
      thumbnailCacheRootDir: thumbnailCachePath,
    });
    service.onLibraryChanged((payload) => {
      broadcastLibraryChanged(payload);
    });

    return service;
  };

  const hasPersistedDatabasePayload = async (): Promise<boolean> => {
    const activeService = ensureService();
    const [snapshot, playlist, importTasks] = await Promise.all([
      activeService.readLibrarySnapshot(),
      activeService.readPlaylist(),
      activeService.readImportTasks(),
    ]);

    return (
      snapshot.image_packages.length > 0 ||
      snapshot.image_directories.length > 0 ||
      snapshot.videos.length > 0 ||
      playlist.video_ids.length > 0 ||
      importTasks.tasks.length > 0
    );
  };

  type ParseSchema<T> = {
    parse: (payload: unknown) => T;
  };

  const registerIpcQuery = <TResponse>(
    channel: string,
    responseSchema: ParseSchema<TResponse>,
    action: () => Promise<unknown> | unknown,
  ): void => {
    ipcMain.handle(channel, async () => {
      const response = await action();
      return responseSchema.parse(response);
    });
  };

  const registerIpcCommand = <TRequest, TResponse>(
    channel: string,
    requestSchema: ParseSchema<TRequest>,
    responseSchema: ParseSchema<TResponse>,
    action: (request: TRequest) => Promise<unknown> | unknown,
    options?: { fallbackEmptyPayloadToObject?: boolean },
  ): void => {
    ipcMain.handle(channel, async (_event, payload: unknown) => {
      const normalizedPayload =
        options?.fallbackEmptyPayloadToObject &&
        (payload === undefined || payload === null)
          ? {}
          : payload;
      const request = requestSchema.parse(normalizedPayload);
      const response = await action(request);
      return responseSchema.parse(response);
    });
  };

  registerMediaProtocolHandler(ensureService);
  registerResolveMediaResourceHandler(ensureService);

  registerIpcQuery(
    BACKEND_CHANNELS.readLibrarySnapshot,
    librarySnapshotDtoSchema,
    () => ensureService().readLibrarySnapshot(),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.readImageSidebarTree,
    readImageSidebarTreeRequestSchema,
    readImageSidebarTreeResponseSchema,
    (request) => ensureService().readImageSidebarTree(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.readImagePage,
    readImagePageRequestSchema,
    readImagePageResponseSchema,
    (request) => ensureService().readImagePage(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.readImageMetadata,
    readImageMetadataRequestSchema,
    readImageMetadataResponseSchema,
    (request) => ensureService().readImageMetadata(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.writePackageGrade,
    writePackageGradeRequestSchema,
    writePackageGradeResponseSchema,
    (request) => ensureService().writePackageGrade(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.setImageHidden,
    setImageHiddenRequestSchema,
    setImageHiddenResponseSchema,
    (request) => ensureService().setImageHidden(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.deleteImageItems,
    deleteImageItemsRequestSchema,
    deleteImageItemsResponseSchema,
    (request) => ensureService().deleteImageItems(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.deleteSidebarNodes,
    deleteSidebarNodesRequestSchema,
    deleteSidebarNodesResponseSchema,
    (request) => ensureService().deleteSidebarNodes(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.moveSidebarNodes,
    moveSidebarNodesRequestSchema,
    moveSidebarNodesResponseSchema,
    (request) => ensureService().moveSidebarNodes(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.renameSidebarNode,
    renameSidebarNodeRequestSchema,
    renameSidebarNodeResponseSchema,
    (request) => ensureService().renameSidebarNode(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.startManageAdReview,
    startManageAdReviewRequestSchema,
    startManageAdReviewResponseSchema,
    (request) => ensureService().startManageAdReview(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.readManageAdReviewTask,
    readManageAdReviewTaskRequestSchema,
    readManageAdReviewTaskResponseSchema,
    (request) => ensureService().readManageAdReviewTask(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.pauseManageAdReviewTask,
    pauseManageAdReviewTaskRequestSchema,
    pauseManageAdReviewTaskResponseSchema,
    (request) => ensureService().pauseManageAdReviewTask(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.testAdReviewVisionModel,
    testAdReviewVisionModelRequestSchema,
    testAdReviewVisionModelResponseSchema,
    (request) => ensureService().testAdReviewVisionModel(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.confirmManageAdReviewDelete,
    confirmManageAdReviewDeleteRequestSchema,
    confirmManageAdReviewDeleteResponseSchema,
    (request) => ensureService().confirmManageAdReviewDelete(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.startManageCoverReview,
    startManageCoverReviewRequestSchema,
    startManageCoverReviewResponseSchema,
    (request) => ensureService().startManageCoverReview(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.readManageCoverReviewTask,
    readManageCoverReviewTaskRequestSchema,
    readManageCoverReviewTaskResponseSchema,
    (request) => ensureService().readManageCoverReviewTask(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.pauseManageCoverReviewTask,
    pauseManageCoverReviewTaskRequestSchema,
    pauseManageCoverReviewTaskResponseSchema,
    (request) => ensureService().pauseManageCoverReviewTask(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.confirmManageCoverReviewHide,
    confirmManageCoverReviewHideRequestSchema,
    confirmManageCoverReviewHideResponseSchema,
    (request) => ensureService().confirmManageCoverReviewHide(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.startManageSubtitleCleanup,
    startManageSubtitleCleanupRequestSchema,
    startManageSubtitleCleanupResponseSchema,
    (request) => ensureService().startManageSubtitleCleanup(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.readManageSubtitleCleanupTask,
    readManageSubtitleCleanupTaskRequestSchema,
    readManageSubtitleCleanupTaskResponseSchema,
    (request) => ensureService().readManageSubtitleCleanupTask(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.runManageSubtitleCleanup,
    runManageSubtitleCleanupRequestSchema,
    runManageSubtitleCleanupResponseSchema,
    (request) => ensureService().runManageSubtitleCleanup(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.saveManageSubtitleCleanup,
    saveManageSubtitleCleanupRequestSchema,
    saveManageSubtitleCleanupResponseSchema,
    (request) => ensureService().saveManageSubtitleCleanup(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.writePackageMetadata,
    writePackageMetadataRequestSchema,
    writePackageMetadataResponseSchema,
    (request) => ensureService().writePackageMetadata(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.writePackageExternalMetadata,
    writePackageExternalMetadataRequestSchema,
    writePackageExternalMetadataResponseSchema,
    (request) => ensureService().writePackageExternalMetadata(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.searchExternalMetadata,
    searchExternalMetadataRequestSchema,
    searchExternalMetadataResponseSchema,
    (request) => metadataScraper.search(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.writeVideoMetadata,
    writeVideoMetadataRequestSchema,
    writeVideoMetadataResponseSchema,
    (request) => ensureService().writeVideoMetadata(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.writeAudioMetadata,
    writeAudioMetadataRequestSchema,
    writeAudioMetadataResponseSchema,
    (request) => ensureService().writeAudioMetadata(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.saveVideoCover,
    saveVideoCoverRequestSchema,
    saveVideoCoverResponseSchema,
    (request) => ensureService().saveVideoCover(request),
  );

  registerIpcQuery(
    BACKEND_CHANNELS.readPlaylist,
    readPlaylistResponseSchema,
    () => ensureService().readPlaylist(),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.writePlaylist,
    writePlaylistRequestSchema,
    writePlaylistResponseSchema,
    (request) => ensureService().writePlaylist(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.listVideoSubtitles,
    listVideoSubtitlesRequestSchema,
    listVideoSubtitlesResponseSchema,
    (request) => ensureService().listVideoSubtitles(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.prepareSubtitleTrack,
    prepareSubtitleTrackRequestSchema,
    prepareSubtitleTrackResponseSchema,
    (request) => ensureService().prepareSubtitleTrack(request),
  );

  ipcMain.handle(
    BACKEND_CHANNELS.pickImportPaths,
    async (_event, payload: unknown) => {
      const request = pickImportPathsRequestSchema.parse(payload);
      const result = await dialog.showOpenDialog(
        buildImportPathsDialogOptions(request.mode, request.target_mode),
      );

      return pickImportPathsResponseSchema.parse({
        paths: result.canceled ? [] : result.filePaths,
      });
    },
  );

  ipcMain.handle(
    BACKEND_CHANNELS.pickFilePath,
    async (_event, payload: unknown) => {
      const request = pickFilePathRequestSchema.parse(payload);
      const result = await dialog.showOpenDialog({
        title: request.title ?? "选择文件",
        defaultPath: request.default_path,
        properties: ["openFile", "dontAddToRecent"],
        filters: request.filters,
      });

      return pickFilePathResponseSchema.parse({
        canceled: result.canceled,
        path: result.canceled ? null : (result.filePaths[0] ?? null),
      });
    },
  );

  ipcMain.handle(
    BACKEND_CHANNELS.pickDirectoryPath,
    async (_event, payload: unknown) => {
      const request = pickDirectoryPathRequestSchema.parse(payload);
      const result = await dialog.showOpenDialog({
        title: request.title ?? "选择目录",
        defaultPath: request.default_path,
        properties: ["openDirectory", "dontAddToRecent"],
      });

      return pickDirectoryPathResponseSchema.parse({
        canceled: result.canceled,
        path: result.canceled ? null : (result.filePaths[0] ?? null),
      });
    },
  );

  ipcMain.handle(BACKEND_CHANNELS.readClipboardImportPaths, async () => {
    const paths = new Set<string>();

    try {
      const fileNameWBuffer = clipboard.readBuffer("FileNameW");
      for (const pathValue of parseClipboardFileNameWBuffer(fileNameWBuffer)) {
        paths.add(pathValue);
      }
    } catch {
      // ignore clipboard format unsupported
    }

    const plainText = clipboard.readText();
    for (const pathValue of extractLikelyPaths(plainText)) {
      paths.add(pathValue);
    }

    return readClipboardImportPathsResponseSchema.parse({
      paths: Array.from(paths),
    });
  });

  registerIpcCommand(
    BACKEND_CHANNELS.enqueueImportTask,
    enqueueImportTaskRequestSchema,
    enqueueImportTaskResponseSchema,
    (request) => ensureService().enqueueImportTask(request),
  );

  registerIpcQuery(
    BACKEND_CHANNELS.readImportTasks,
    readImportTasksResponseSchema,
    () => ensureService().readImportTasks(),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.retryImportTask,
    retryImportTaskRequestSchema,
    retryImportTaskResponseSchema,
    (request) => ensureService().retryImportTask(request),
  );

  registerIpcQuery(
    BACKEND_CHANNELS.readMediaAccessAudit,
    mediaAccessAuditResponseSchema,
    () => ensureService().readMediaAccessAudit(),
  );

  registerIpcQuery(
    BACKEND_CHANNELS.readRuntimeCapabilities,
    readRuntimeCapabilitiesResponseSchema,
    () => ensureService().readRuntimeCapabilities(),
  );

  registerIpcQuery(
    BACKEND_CHANNELS.readSubtitleEngineStatus,
    readSubtitleEngineStatusResponseSchema,
    () => ensureService().readSubtitleEngineStatus(),
  );

  registerIpcQuery(
    BACKEND_CHANNELS.listSubtitleRemoteModels,
    listSubtitleRemoteModelsResponseSchema,
    () => ensureService().listSubtitleRemoteModels(),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.listSubtitleLocalModels,
    listSubtitleLocalModelsRequestSchema,
    listSubtitleLocalModelsResponseSchema,
    (request) => ensureService().listSubtitleLocalModels(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.startSubtitleModelDownload,
    startSubtitleModelDownloadRequestSchema,
    startSubtitleModelDownloadResponseSchema,
    (request) => ensureService().startSubtitleModelDownload(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.cancelSubtitleModelDownload,
    cancelSubtitleModelDownloadRequestSchema,
    cancelSubtitleModelDownloadResponseSchema,
    (request) => ensureService().cancelSubtitleModelDownload(request),
  );

  registerIpcQuery(
    BACKEND_CHANNELS.readSubtitleModelDownloads,
    readSubtitleModelDownloadsResponseSchema,
    () => ensureService().readSubtitleModelDownloads(),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.clearSubtitleLocalModel,
    clearSubtitleLocalModelRequestSchema,
    clearSubtitleLocalModelResponseSchema,
    (request) => ensureService().clearSubtitleLocalModel(request),
  );

  ipcMain.handle(
    BACKEND_CHANNELS.startSubtitleSession,
    async (event, payload: unknown) => {
      subtitleSessionManager.bindWebContents(event.sender);
      const request = startSubtitleSessionRequestSchema.parse(payload);
      const response = await subtitleSessionManager.startSession(
        event.sender.id,
        request,
      );
      return startSubtitleSessionResponseSchema.parse(response);
    },
  );

  ipcMain.handle(
    BACKEND_CHANNELS.stopSubtitleSession,
    async (event, payload: unknown) => {
      const normalizedPayload = payload ?? {};
      const request = stopSubtitleSessionRequestSchema.parse(normalizedPayload);
      const response = await subtitleSessionManager.stopSession(
        event.sender.id,
        request,
      );
      return stopSubtitleSessionResponseSchema.parse(response);
    },
  );

  ipcMain.handle(
    BACKEND_CHANNELS.resetSubtitleSession,
    async (event, payload: unknown) => {
      const normalizedPayload = payload ?? {};
      const request =
        resetSubtitleSessionRequestSchema.parse(normalizedPayload);
      const response = await subtitleSessionManager.resetSession(
        event.sender.id,
        request,
      );
      return resetSubtitleSessionResponseSchema.parse(response);
    },
  );

  ipcMain.handle(BACKEND_CHANNELS.flushSubtitleSession, async (event) => {
    const response = await subtitleSessionManager.flushSession(event.sender.id);
    return flushSubtitleSessionResponseSchema.parse(response);
  });

  ipcMain.handle(
    BACKEND_CHANNELS.pushSubtitleAudio,
    async (event, payload: unknown) => {
      const request = pushSubtitleAudioRequestSchema.parse(payload);
      const response = await subtitleSessionManager.pushAudio(
        event.sender.id,
        request,
      );
      return pushSubtitleAudioResponseSchema.parse(response);
    },
  );

  ipcMain.handle(BACKEND_CHANNELS.readRuntimeInfo, async () => {
    const gpuFeatureStatusRaw = app.getGPUFeatureStatus();
    const gpuFeatureStatus: Record<string, string> = {};
    for (const [key, value] of Object.entries(gpuFeatureStatusRaw)) {
      gpuFeatureStatus[key] = String(value);
    }

    const gpuInfoBasicRaw = await app.getGPUInfo("basic").catch(() => null);
    const gpuInfoBasic =
      gpuInfoBasicRaw && typeof gpuInfoBasicRaw === "object"
        ? (gpuInfoBasicRaw as Record<string, unknown>)
        : undefined;

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
        {
          id: "h264-1080p",
          label: "H.264 / AVC 1080p",
          content_type: 'video/mp4; codecs="avc1.640028"',
        },
        {
          id: "hevc-1080p",
          label: "H.265 / HEVC 1080p",
          content_type: 'video/mp4; codecs="hvc1.1.6.L120.B0"',
        },
        {
          id: "av1-1080p",
          label: "AV1 1080p",
          content_type: 'video/mp4; codecs="av01.0.08M.08"',
        },
        {
          id: "vp9-1080p",
          label: "VP9 1080p",
          content_type: 'video/webm; codecs="vp09.00.41.08"',
        },
      ],
    });
  });

  ipcMain.handle(
    BACKEND_CHANNELS.setRuntimeStoragePaths,
    async (_event, payload: unknown) => {
      const request = setRuntimeStoragePathsRequestSchema.parse(payload);
      const updateResult = await updateRuntimeStoragePaths({
        request,
        libraryRoot,
        databasePath,
        thumbnailCachePath,
        runtimeStoragePathsConfigPath,
        hasPersistedDatabasePayload,
        disposeService,
      });

      databasePath = updateResult.databasePath;
      thumbnailCachePath = updateResult.thumbnailCachePath;
      runtimeStoragePaths = updateResult.runtimeStoragePaths;

      return setRuntimeStoragePathsResponseSchema.parse({
        database_path: databasePath,
        thumbnail_cache_path: thumbnailCachePath,
        moved_database: updateResult.movedDatabase,
        updated_at_ms: Date.now(),
      });
    },
  );

  registerIpcQuery(
    BACKEND_CHANNELS.readArchiveLoadStatus,
    readArchiveLoadStatusResponseSchema,
    () => ensureService().readArchiveLoadStatus(),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.readAppState,
    readAppStateRequestSchema,
    readAppStateResponseSchema,
    (request) => ensureService().readAppState(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.writeAppState,
    writeAppStateRequestSchema,
    writeAppStateResponseSchema,
    (request) => ensureService().writeAppState(request),
  );

  ipcMain.handle(
    BACKEND_CHANNELS.openExternalUrl,
    async (_event, payload: unknown) => {
      const request = openExternalUrlRequestSchema.parse(payload);
      if (!isExternalUrlAllowed(request.url, allowedExternalUrlHosts)) {
        return openExternalUrlResponseSchema.parse({ ok: false });
      }

      await shell.openExternal(request.url);
      return openExternalUrlResponseSchema.parse({ ok: true });
    },
  );

  registerIpcQuery(
    BACKEND_CHANNELS.clearDatabase,
    clearDatabaseResponseSchema,
    () => ensureService().clearDatabase(),
  );
}
