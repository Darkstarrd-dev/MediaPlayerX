import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  shell,
  type IpcMainInvokeEvent,
} from "electron";
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  clearDatabaseResponseSchema,
  enqueueImportTaskRequestSchema,
  enqueueImportTaskResponseSchema,
  librarySnapshotDtoSchema,
  librarySnapshotLiteDtoSchema,
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
  startSubtitlePersistenceRequestSchema,
  startSubtitlePersistenceResponseSchema,
  appendSubtitlePersistenceRequestSchema,
  appendSubtitlePersistenceResponseSchema,
  readSubtitlePersistenceWindowRequestSchema,
  readSubtitlePersistenceWindowResponseSchema,
  readRuntimeCapabilitiesResponseSchema,
  readAudioEngineStateResponseSchema,
  setAudioEngineModeRequestSchema,
  setAudioEngineModeResponseSchema,
  verifyAudioEngineMpvBinRequestSchema,
  verifyAudioEngineMpvBinResponseSchema,
  verifyAudioTranscodeFfmpegBinRequestSchema,
  verifyAudioTranscodeFfmpegBinResponseSchema,
  listAudioOutputDevicesResponseSchema,
  setAudioOutputDeviceRequestSchema,
  setAudioOutputDeviceResponseSchema,
  setAudioExclusiveRequestSchema,
  setAudioExclusiveResponseSchema,
  setAudioGaplessModeRequestSchema,
  setAudioGaplessModeResponseSchema,
  setAudioReplayGainModeRequestSchema,
  setAudioReplayGainModeResponseSchema,
  audioEngineActionResponseSchema,
  readAudioEnginePlaybackStatusResponseSchema,
  readAudioEngineAnalysisFrameResponseSchema,
  audioEngineLoadTrackRequestSchema,
  audioEngineSetPausedRequestSchema,
  audioEngineSeekToRequestSchema,
  audioEngineSetVolumeRequestSchema,
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
  renameSidebarNodesRequestSchema,
  renameSidebarNodesResponseSchema,
  renameItemsRequestSchema,
  renameItemsResponseSchema,
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
  startImageConvertTaskRequestSchema,
  startImageConvertTaskResponseSchema,
  readImageConvertTaskRequestSchema,
  readImageConvertTaskResponseSchema,
  cancelImageConvertTaskRequestSchema,
  cancelImageConvertTaskResponseSchema,
  startAudioTranscodeTaskRequestSchema,
  startAudioTranscodeTaskResponseSchema,
  readAudioTranscodeCapabilitiesResponseSchema,
  readAudioTranscodeTaskRequestSchema,
  readAudioTranscodeTaskResponseSchema,
  cancelAudioTranscodeTaskRequestSchema,
  cancelAudioTranscodeTaskResponseSchema,
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
  externalAuthConnectRequestSchema,
  externalAuthConnectResponseSchema,
  externalAuthDisconnectRequestSchema,
  externalAuthDisconnectResponseSchema,
  externalAuthStatusRequestSchema,
  externalAuthStatusResponseSchema,
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
  updatePerformanceConfigRequestSchema,
  updatePerformanceConfigResponseSchema,
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
import { ExternalAuthSessionManager } from "./services/auth/externalAuthSessionManager";
import {
  GLOBAL_CPU_TOKEN_LIMIT,
  GLOBAL_GPU_TOKEN_LIMIT,
} from "./services/file-system-read/fileSystemReadFacadeConfig";
import { TaskResourceGovernor } from "./services/file-system-read/taskResourceGovernor";
import {
  getAllowedExternalUrlHosts,
  isExternalUrlAllowed,
} from "./externalUrlPolicy";
import { SubtitleSessionManager } from "./subtitles/subtitleSession";
import { resolveBenchMode } from "./mainBenchRuntime";
import { AudioEngineController } from "./services/audio-engine/audioEngineController";
import {
  resolveFfmpegBinPathFromDirectory,
  resolveFfprobeBinPathFromDirectory,
  resolveMpvBinPathFromDirectory,
} from "./runtimeBinaryPaths";
import { resolveRendererEntry } from "./mainPaths";

interface IpcBreakdownEntry {
  timestamp: string;
  channel: string;
  action_ms: number;
  schema_parse_ms: number;
  json_serialize_proxy_ms: number | null;
  payload_bytes: number | null;
  request_id: number;
}

interface TrustedRendererSenderRule {
  allowedOrigin: string | null;
  allowedFileBase: string | null;
}

function resolveIpcBreakdownLogPath(): string | null {
  const diagnosticsDir = (
    process.env.MEDIA_PLAYERX_DIAGNOSTICS_DIR ?? ""
  ).trim();
  const resolved = diagnosticsDir
    ? path.resolve(diagnosticsDir)
    : path.join(app.getPath("userData"), "logs");
  mkdirSync(resolved, { recursive: true });
  return path.join(resolved, "ipc-breakdown.ndjson");
}

function appendIpcBreakdown(
  pathOrNull: string | null,
  entry: IpcBreakdownEntry,
): void {
  if (!pathOrNull) {
    return;
  }
  try {
    appendFileSync(pathOrNull, `${JSON.stringify(entry)}\n`, "utf8");
  } catch {
    // ignore diagnostics write failures
  }
}

export function registerBackendIpcHandlers(): void {
  const benchMode = resolveBenchMode();
  const shouldCaptureIpcBreakdown = benchMode !== null;
  const ipcBreakdownLogPath = shouldCaptureIpcBreakdown
    ? resolveIpcBreakdownLogPath()
    : null;
  const tracedIpcChannels = new Set<string>([
    BACKEND_CHANNELS.readLibrarySnapshot,
    BACKEND_CHANNELS.readLibrarySnapshotLite,
  ]);
  let ipcBreakdownRequestId = 0;

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
  const trustedRendererSenderRule = resolveTrustedRendererSenderRule();
  let service: FileSystemMediaReadService | null = null;
  const externalAuthSessionManager = new ExternalAuthSessionManager();
  const metadataScraper = new MetadataScraperService({
    defaultProxyServer: process.env.MEDIA_PLAYERX_PROXY_SERVER,
    externalAuthSessionManager,
  });
  const audioEngineController = new AudioEngineController({
    projectRoot: process.cwd(),
  });
  const toAudioEngineStateDto = (
    snapshot: ReturnType<typeof audioEngineController.readState>,
  ) => ({
    mode: snapshot.mode,
    desired_mode: snapshot.desiredMode,
    mpv_available: snapshot.mpvAvailable,
    mpv_bin_path: snapshot.mpvBinPath,
    using_fallback: snapshot.usingFallback,
    last_error: snapshot.lastError,
    active_device_id: snapshot.activeDeviceId,
    exclusive_enabled: snapshot.exclusiveEnabled,
    gapless_mode: snapshot.gaplessMode,
    replaygain_mode: snapshot.replayGainMode,
    updated_at_ms: snapshot.updatedAtMs,
  });
  app.once("before-quit", () => {
    void audioEngineController.setMode("chromium").catch(() => {
      // ignore audio engine cleanup failures during quit
    });
  });
  const taskResourceGovernor = new TaskResourceGovernor({
    cpuTokenLimit: GLOBAL_CPU_TOKEN_LIMIT,
    gpuTokenLimit: GLOBAL_GPU_TOKEN_LIMIT,
  });
  const subtitleSessionManager = new SubtitleSessionManager({
    runWithGpuToken: (taskName, task) =>
      taskResourceGovernor.runWithGpuToken(taskName, task),
  });

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
      taskResourceGovernor,
    });
    service.onLibraryChanged((payload) => {
      broadcastLibraryChanged(payload);
    });

    return service;
  };

  const hasPersistedDatabasePayload = async (): Promise<boolean> => {
    const activeService = ensureService();
    const [snapshot, playlist, importTasks] = await Promise.all([
      activeService.readLibrarySnapshotLite(),
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
    options?: { skipResponseSchemaParse?: boolean },
  ): void => {
    ipcMain.handle(channel, async () => {
      if (!shouldCaptureIpcBreakdown || !tracedIpcChannels.has(channel)) {
        const response = await action();
        if (options?.skipResponseSchemaParse) {
          return response as TResponse;
        }
        return responseSchema.parse(response);
      }

      const requestId = ++ipcBreakdownRequestId;
      const actionStart = performance.now();
      const response = await action();
      const actionEnd = performance.now();

      let parsed: TResponse;
      let parseDurationMs = 0;
      if (options?.skipResponseSchemaParse) {
        parsed = response as TResponse;
      } else {
        const parseStart = performance.now();
        parsed = responseSchema.parse(response);
        const parseEnd = performance.now();
        parseDurationMs = parseEnd - parseStart;
      }

      let payloadBytes: number | null = null;
      let jsonSerializeProxyMs: number | null = null;
      try {
        const serializeStart = performance.now();
        const serialized = JSON.stringify(parsed);
        const serializeEnd = performance.now();
        jsonSerializeProxyMs = serializeEnd - serializeStart;
        payloadBytes = Buffer.byteLength(serialized, "utf8");
      } catch {
        payloadBytes = null;
        jsonSerializeProxyMs = null;
      }

      appendIpcBreakdown(ipcBreakdownLogPath, {
        timestamp: new Date().toISOString(),
        channel,
        action_ms: Number((actionEnd - actionStart).toFixed(3)),
        schema_parse_ms: Number(parseDurationMs.toFixed(3)),
        json_serialize_proxy_ms:
          jsonSerializeProxyMs === null
            ? null
            : Number(jsonSerializeProxyMs.toFixed(3)),
        payload_bytes: payloadBytes,
        request_id: requestId,
      });

      return parsed;
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

  const registerTrustedIpcCommand = <TRequest, TResponse>(
    channel: string,
    requestSchema: ParseSchema<TRequest>,
    responseSchema: ParseSchema<TResponse>,
    action: (request: TRequest) => Promise<unknown> | unknown,
  ): void => {
    ipcMain.handle(channel, async (event, payload: unknown) => {
      assertTrustedRendererSender(event, channel, trustedRendererSenderRule);
      const request = requestSchema.parse(payload);
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
    { skipResponseSchemaParse: true },
  );

  registerIpcQuery(
    BACKEND_CHANNELS.readLibrarySnapshotLite,
    librarySnapshotLiteDtoSchema,
    () => ensureService().readLibrarySnapshotLite(),
    { skipResponseSchemaParse: true },
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
    BACKEND_CHANNELS.renameSidebarNodes,
    renameSidebarNodesRequestSchema,
    renameSidebarNodesResponseSchema,
    (request) => ensureService().renameSidebarNodes(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.renameItems,
    renameItemsRequestSchema,
    renameItemsResponseSchema,
    (request) => ensureService().renameItems(request),
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
    BACKEND_CHANNELS.startImageConvertTask,
    startImageConvertTaskRequestSchema,
    startImageConvertTaskResponseSchema,
    (request) => ensureService().startImageConvertTask(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.readImageConvertTask,
    readImageConvertTaskRequestSchema,
    readImageConvertTaskResponseSchema,
    (request) => ensureService().readImageConvertTask(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.cancelImageConvertTask,
    cancelImageConvertTaskRequestSchema,
    cancelImageConvertTaskResponseSchema,
    (request) => ensureService().cancelImageConvertTask(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.startAudioTranscodeTask,
    startAudioTranscodeTaskRequestSchema,
    startAudioTranscodeTaskResponseSchema,
    (request) => ensureService().startAudioTranscodeTask(request),
  );

  registerIpcQuery(
    BACKEND_CHANNELS.readAudioTranscodeCapabilities,
    readAudioTranscodeCapabilitiesResponseSchema,
    () => ensureService().readAudioTranscodeCapabilities(),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.readAudioTranscodeTask,
    readAudioTranscodeTaskRequestSchema,
    readAudioTranscodeTaskResponseSchema,
    (request) => ensureService().readAudioTranscodeTask(request),
  );

  registerIpcCommand(
    BACKEND_CHANNELS.cancelAudioTranscodeTask,
    cancelAudioTranscodeTaskRequestSchema,
    cancelAudioTranscodeTaskResponseSchema,
    (request) => ensureService().cancelAudioTranscodeTask(request),
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

  registerTrustedIpcCommand(
    BACKEND_CHANNELS.externalAuthConnect,
    externalAuthConnectRequestSchema,
    externalAuthConnectResponseSchema,
    (request) => externalAuthSessionManager.connect(request.provider),
  );

  registerTrustedIpcCommand(
    BACKEND_CHANNELS.externalAuthDisconnect,
    externalAuthDisconnectRequestSchema,
    externalAuthDisconnectResponseSchema,
    (request) => externalAuthSessionManager.disconnect(request.provider),
  );

  registerTrustedIpcCommand(
    BACKEND_CHANNELS.externalAuthStatus,
    externalAuthStatusRequestSchema,
    externalAuthStatusResponseSchema,
    (request) => externalAuthSessionManager.getStatus(request.provider),
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
      const targetMode = request.target_mode ?? "image";
      const result = await dialog.showOpenDialog(
        buildImportPathsDialogOptions(request.mode, targetMode),
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

  ipcMain.handle(
    BACKEND_CHANNELS.startSubtitlePersistence,
    async (event, payload: unknown) => {
      const request = startSubtitlePersistenceRequestSchema.parse(payload);
      const response = await subtitleSessionManager.startPersistence(
        event.sender.id,
        request,
      );
      return startSubtitlePersistenceResponseSchema.parse(response);
    },
  );

  ipcMain.handle(
    BACKEND_CHANNELS.appendSubtitlePersistence,
    async (event, payload: unknown) => {
      const request = appendSubtitlePersistenceRequestSchema.parse(payload);
      const response = await subtitleSessionManager.appendPersistence(
        event.sender.id,
        request,
      );
      return appendSubtitlePersistenceResponseSchema.parse(response);
    },
  );

  ipcMain.handle(
    BACKEND_CHANNELS.readSubtitlePersistenceWindow,
    async (event, payload: unknown) => {
      const request = readSubtitlePersistenceWindowRequestSchema.parse(payload);
      const response = await subtitleSessionManager.readPersistenceWindow(
        event.sender.id,
        request,
      );
      return readSubtitlePersistenceWindowResponseSchema.parse(response);
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

  ipcMain.handle(BACKEND_CHANNELS.readAudioEngineState, async () => {
    const snapshot = audioEngineController.readState();
    return readAudioEngineStateResponseSchema.parse(
      toAudioEngineStateDto(snapshot),
    );
  });

  ipcMain.handle(BACKEND_CHANNELS.readAudioEnginePlaybackStatus, async () => {
    const snapshot = await audioEngineController.readPlaybackStatus();
    return readAudioEnginePlaybackStatusResponseSchema.parse({
      ok: snapshot.ok,
      mode: snapshot.mode,
      loaded: snapshot.loaded,
      paused: snapshot.paused,
      time_sec: snapshot.timeSec,
      duration_sec: snapshot.durationSec,
      message: snapshot.message,
      updated_at_ms: snapshot.updatedAtMs,
    });
  });

  ipcMain.handle(BACKEND_CHANNELS.readAudioEngineAnalysisFrame, async () => {
    const snapshot = await audioEngineController.readAnalysisFrame();
    return readAudioEngineAnalysisFrameResponseSchema.parse({
      ok: snapshot.ok,
      mode: snapshot.mode,
      loaded: snapshot.loaded,
      audio_level: snapshot.audioLevel,
      audio_beat: snapshot.audioBeat,
      frequency_bins: snapshot.frequencyBins,
      waveform_bins: snapshot.waveformBins,
      message: snapshot.message,
      updated_at_ms: snapshot.updatedAtMs,
    });
  });

  ipcMain.handle(
    BACKEND_CHANNELS.setAudioEngineMode,
    async (_event, payload: unknown) => {
      const request = setAudioEngineModeRequestSchema.parse(payload);
      const snapshot = await audioEngineController.setMode(request.mode);
      return setAudioEngineModeResponseSchema.parse(
        toAudioEngineStateDto(snapshot),
      );
    },
  );

  ipcMain.handle(
    BACKEND_CHANNELS.verifyAudioEngineMpvBin,
    async (_event, payload: unknown) => {
      const request = verifyAudioEngineMpvBinRequestSchema.parse(payload);
      const resolvedMpvBinPath = resolveMpvBinPathFromDirectory(
        request.directory_path,
      );

      if (!resolvedMpvBinPath) {
        return verifyAudioEngineMpvBinResponseSchema.parse({
          ok: false,
          env_key: "MPX_MPV_BIN",
          mpv_bin_path: null,
          message: `目录下未找到 mpv 可执行文件：${request.directory_path}`,
          state: toAudioEngineStateDto(audioEngineController.readState()),
        });
      }

      process.env.MPX_MPV_BIN = resolvedMpvBinPath;
      const snapshot =
        await audioEngineController.overrideMpvBinPath(resolvedMpvBinPath);
      return verifyAudioEngineMpvBinResponseSchema.parse({
        ok: true,
        env_key: "MPX_MPV_BIN",
        mpv_bin_path: resolvedMpvBinPath,
        message: `已设置 MPX_MPV_BIN=${resolvedMpvBinPath}`,
        state: toAudioEngineStateDto(snapshot),
      });
    },
  );

  ipcMain.handle(
    BACKEND_CHANNELS.verifyAudioTranscodeFfmpegBin,
    async (_event, payload: unknown) => {
      const request = verifyAudioTranscodeFfmpegBinRequestSchema.parse(payload);
      const resolvedFfmpegBinPath = resolveFfmpegBinPathFromDirectory(
        request.directory_path,
      );
      const resolvedFfprobeBinPath = resolveFfprobeBinPathFromDirectory(
        request.directory_path,
      );
      const service = ensureService();

      if (!resolvedFfmpegBinPath || !resolvedFfprobeBinPath) {
        const missingBinaries = [
          resolvedFfmpegBinPath ? null : "ffmpeg",
          resolvedFfprobeBinPath ? null : "ffprobe",
        ]
          .filter((value): value is string => value != null)
          .join("/");
        return verifyAudioTranscodeFfmpegBinResponseSchema.parse({
          ok: false,
          ffmpeg_env_key: "MPX_FFMPEG_BIN",
          ffprobe_env_key: "MPX_FFPROBE_BIN",
          ffmpeg_bin_path: resolvedFfmpegBinPath,
          ffprobe_bin_path: resolvedFfprobeBinPath,
          message: `目录下缺少可执行文件 (${missingBinaries})：${request.directory_path}`,
          capabilities: await service.readAudioTranscodeCapabilities(),
        });
      }

      process.env.MPX_FFMPEG_BIN = resolvedFfmpegBinPath;
      process.env.MPX_FFPROBE_BIN = resolvedFfprobeBinPath;
      service.overrideAudioTranscodeRuntimeBins({
        ffmpegBinPath: resolvedFfmpegBinPath,
        ffprobeBinPath: resolvedFfprobeBinPath,
      });
      return verifyAudioTranscodeFfmpegBinResponseSchema.parse({
        ok: true,
        ffmpeg_env_key: "MPX_FFMPEG_BIN",
        ffprobe_env_key: "MPX_FFPROBE_BIN",
        ffmpeg_bin_path: resolvedFfmpegBinPath,
        ffprobe_bin_path: resolvedFfprobeBinPath,
        message:
          `已设置 MPX_FFMPEG_BIN=${resolvedFfmpegBinPath}; ` +
          `MPX_FFPROBE_BIN=${resolvedFfprobeBinPath}`,
        capabilities: await service.readAudioTranscodeCapabilities(),
      });
    },
  );

  ipcMain.handle(BACKEND_CHANNELS.listAudioOutputDevices, async () => {
    const response = await audioEngineController.listAudioDevices();
    return listAudioOutputDevicesResponseSchema.parse({
      devices: response.devices.map((device) => ({
        id: device.id,
        label: device.label,
        is_default: device.isDefault,
      })),
      active_device_id: response.activeDeviceId,
      updated_at_ms: Date.now(),
    });
  });

  ipcMain.handle(
    BACKEND_CHANNELS.setAudioOutputDevice,
    async (_event, payload: unknown) => {
      const request = setAudioOutputDeviceRequestSchema.parse(payload);
      const response = await audioEngineController.setAudioDevice(
        request.device_id,
      );
      return setAudioOutputDeviceResponseSchema.parse({
        ok: response.ok,
        active_device_id: response.activeDeviceId,
        message: response.message,
        updated_at_ms: Date.now(),
      });
    },
  );

  ipcMain.handle(
    BACKEND_CHANNELS.setAudioExclusive,
    async (_event, payload: unknown) => {
      const request = setAudioExclusiveRequestSchema.parse(payload);
      const response = await audioEngineController.setAudioExclusive(
        request.enabled,
      );
      return setAudioExclusiveResponseSchema.parse({
        ok: response.ok,
        enabled: response.enabled,
        message: response.message,
        updated_at_ms: Date.now(),
      });
    },
  );

  ipcMain.handle(
    BACKEND_CHANNELS.setAudioGaplessMode,
    async (_event, payload: unknown) => {
      const request = setAudioGaplessModeRequestSchema.parse(payload);
      const response = await audioEngineController.setGaplessMode(request.mode);
      return setAudioGaplessModeResponseSchema.parse({
        ok: response.ok,
        mode: response.mode,
        message: response.message,
        updated_at_ms: Date.now(),
      });
    },
  );

  ipcMain.handle(
    BACKEND_CHANNELS.setAudioReplayGainMode,
    async (_event, payload: unknown) => {
      const request = setAudioReplayGainModeRequestSchema.parse(payload);
      const response = await audioEngineController.setReplayGainMode(
        request.mode,
      );
      return setAudioReplayGainModeResponseSchema.parse({
        ok: response.ok,
        mode: response.mode,
        message: response.message,
        updated_at_ms: Date.now(),
      });
    },
  );

  ipcMain.handle(
    BACKEND_CHANNELS.audioEngineLoadTrack,
    async (_event, payload: unknown) => {
      const request = audioEngineLoadTrackRequestSchema.parse(payload);
      const response = await audioEngineController.loadTrack(
        request.file_path,
        {
          startSec: request.start_sec ?? null,
          endSec: request.end_sec ?? null,
        },
      );
      return audioEngineActionResponseSchema.parse({
        ok: response.ok,
        mode: response.mode,
        message: response.message,
        updated_at_ms: Date.now(),
      });
    },
  );

  ipcMain.handle(
    BACKEND_CHANNELS.audioEngineSetPaused,
    async (_event, payload: unknown) => {
      const request = audioEngineSetPausedRequestSchema.parse(payload);
      const response = await audioEngineController.setPaused(request.paused);
      return audioEngineActionResponseSchema.parse({
        ok: response.ok,
        mode: response.mode,
        message: response.message,
        updated_at_ms: Date.now(),
      });
    },
  );

  ipcMain.handle(
    BACKEND_CHANNELS.audioEngineSeekTo,
    async (_event, payload: unknown) => {
      const request = audioEngineSeekToRequestSchema.parse(payload);
      const response = await audioEngineController.seekToSec(request.time_sec);
      return audioEngineActionResponseSchema.parse({
        ok: response.ok,
        mode: response.mode,
        message: response.message,
        updated_at_ms: Date.now(),
      });
    },
  );

  ipcMain.handle(
    BACKEND_CHANNELS.audioEngineSetVolume,
    async (_event, payload: unknown) => {
      const request = audioEngineSetVolumeRequestSchema.parse(payload);
      const response = await audioEngineController.setVolume(request.volume);
      return audioEngineActionResponseSchema.parse({
        ok: response.ok,
        mode: response.mode,
        message: response.message,
        updated_at_ms: Date.now(),
      });
    },
  );

  ipcMain.handle(BACKEND_CHANNELS.audioEngineStopPlayback, async () => {
    const response = await audioEngineController.stopPlayback();
    return audioEngineActionResponseSchema.parse({
      ok: response.ok,
      mode: response.mode,
      message: response.message,
      updated_at_ms: Date.now(),
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

  registerIpcCommand(
    BACKEND_CHANNELS.updatePerformanceConfig,
    updatePerformanceConfigRequestSchema,
    updatePerformanceConfigResponseSchema,
    (request) => {
      taskResourceGovernor.resizeCpuSemaphore(request.cpu_token_limit);
      return { applied: true };
    },
  );
}

function resolveTrustedRendererSenderRule(): TrustedRendererSenderRule {
  const entry = resolveRendererEntry();
  if (entry.type === "url") {
    return {
      allowedOrigin: new URL(entry.value).origin,
      allowedFileBase: null,
    };
  }

  const fileUrl = pathToFileURL(entry.value);
  fileUrl.search = "";
  fileUrl.hash = "";
  return {
    allowedOrigin: null,
    allowedFileBase: fileUrl.toString(),
  };
}

function assertTrustedRendererSender(
  event: Pick<IpcMainInvokeEvent, "sender" | "senderFrame">,
  channel: string,
  rule: TrustedRendererSenderRule,
): void {
  const senderUrl = resolveSenderUrl(event);
  if (!senderUrl) {
    throw new Error(`Untrusted IPC sender: ${channel}`);
  }

  if (rule.allowedOrigin) {
    try {
      if (new URL(senderUrl).origin === rule.allowedOrigin) {
        return;
      }
    } catch {
      // fallthrough
    }
    throw new Error(`Untrusted IPC sender: ${channel}`);
  }

  if (rule.allowedFileBase && senderUrl.startsWith(rule.allowedFileBase)) {
    return;
  }

  throw new Error(`Untrusted IPC sender: ${channel}`);
}

function resolveSenderUrl(
  event: Pick<IpcMainInvokeEvent, "sender" | "senderFrame">,
): string {
  const frameUrl = event.senderFrame?.url?.trim();
  if (frameUrl) {
    return frameUrl;
  }

  const senderUrl = event.sender.getURL().trim();
  if (senderUrl) {
    return senderUrl;
  }

  return "";
}

