import { contextBridge, ipcRenderer, webFrame, webUtils } from 'electron'

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
  readArchiveLoadStatusResponseSchema,
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
  audioEngineLoadTrackRequestSchema,
  audioEngineSetPausedRequestSchema,
  audioEngineSeekToRequestSchema,
  audioEngineSetVolumeRequestSchema,
  readRuntimeInfoResponseSchema,
  setRuntimeStoragePathsRequestSchema,
  setRuntimeStoragePathsResponseSchema,
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
  updatePerformanceConfigRequestSchema,
  updatePerformanceConfigResponseSchema,
} from '../src/contracts/backend'
import { APP_WINDOW_CHANNELS, BACKEND_CHANNELS, BENCH_CHANNELS } from './channels'

const backendApi = {
  readLibrarySnapshot: async () => {
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.readLibrarySnapshot)
    return librarySnapshotDtoSchema.parse(response)
  },
  readLibrarySnapshotLite: async () => {
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.readLibrarySnapshotLite)
    return librarySnapshotLiteDtoSchema.parse(response)
  },
  readImageSidebarTree: async (request: unknown) => {
    const parsed = readImageSidebarTreeRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.readImageSidebarTree, parsed)
    return readImageSidebarTreeResponseSchema.parse(response)
  },
  readImagePage: async (request: unknown) => {
    const parsed = readImagePageRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.readImagePage, parsed)
    return readImagePageResponseSchema.parse(response)
  },
  readImageMetadata: async (request: unknown) => {
    const parsed = readImageMetadataRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.readImageMetadata, parsed)
    return readImageMetadataResponseSchema.parse(response)
  },
  resolveMediaResource: async (request: unknown) => {
    const parsed = resolveMediaResourceRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.resolveMediaResource, parsed)
    return resolveMediaResourceResponseSchema.parse(response)
  },
  writePackageGrade: async (request: unknown) => {
    const parsed = writePackageGradeRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.writePackageGrade, parsed)
    return writePackageGradeResponseSchema.parse(response)
  },
  setImageHidden: async (request: unknown) => {
    const parsed = setImageHiddenRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.setImageHidden, parsed)
    return setImageHiddenResponseSchema.parse(response)
  },
  deleteImageItems: async (request: unknown) => {
    const parsed = deleteImageItemsRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.deleteImageItems, parsed)
    return deleteImageItemsResponseSchema.parse(response)
  },
  deleteSidebarNodes: async (request: unknown) => {
    const parsed = deleteSidebarNodesRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.deleteSidebarNodes, parsed)
    return deleteSidebarNodesResponseSchema.parse(response)
  },
  moveSidebarNodes: async (request: unknown) => {
    const parsed = moveSidebarNodesRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.moveSidebarNodes, parsed)
    return moveSidebarNodesResponseSchema.parse(response)
  },
  renameSidebarNode: async (request: unknown) => {
    const parsed = renameSidebarNodeRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.renameSidebarNode, parsed)
    return renameSidebarNodeResponseSchema.parse(response)
  },
  renameSidebarNodes: async (request: unknown) => {
    const parsed = renameSidebarNodesRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.renameSidebarNodes, parsed)
    return renameSidebarNodesResponseSchema.parse(response)
  },
  renameItems: async (request: unknown) => {
    const parsed = renameItemsRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.renameItems, parsed)
    return renameItemsResponseSchema.parse(response)
  },
  startManageAdReview: async (request: unknown) => {
    const parsed = startManageAdReviewRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.startManageAdReview, parsed)
    return startManageAdReviewResponseSchema.parse(response)
  },
  readManageAdReviewTask: async (request: unknown) => {
    const parsed = readManageAdReviewTaskRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.readManageAdReviewTask, parsed)
    return readManageAdReviewTaskResponseSchema.parse(response)
  },
  pauseManageAdReviewTask: async (request: unknown) => {
    const parsed = pauseManageAdReviewTaskRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.pauseManageAdReviewTask, parsed)
    return pauseManageAdReviewTaskResponseSchema.parse(response)
  },
  testAdReviewVisionModel: async (request: unknown) => {
    const parsed = testAdReviewVisionModelRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.testAdReviewVisionModel, parsed)
    return testAdReviewVisionModelResponseSchema.parse(response)
  },
  confirmManageAdReviewDelete: async (request: unknown) => {
    const parsed = confirmManageAdReviewDeleteRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.confirmManageAdReviewDelete, parsed)
    return confirmManageAdReviewDeleteResponseSchema.parse(response)
  },
  startManageCoverReview: async (request: unknown) => {
    const parsed = startManageCoverReviewRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.startManageCoverReview, parsed)
    return startManageCoverReviewResponseSchema.parse(response)
  },
  readManageCoverReviewTask: async (request: unknown) => {
    const parsed = readManageCoverReviewTaskRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.readManageCoverReviewTask, parsed)
    return readManageCoverReviewTaskResponseSchema.parse(response)
  },
  pauseManageCoverReviewTask: async (request: unknown) => {
    const parsed = pauseManageCoverReviewTaskRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.pauseManageCoverReviewTask, parsed)
    return pauseManageCoverReviewTaskResponseSchema.parse(response)
  },
  confirmManageCoverReviewHide: async (request: unknown) => {
    const parsed = confirmManageCoverReviewHideRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.confirmManageCoverReviewHide, parsed)
    return confirmManageCoverReviewHideResponseSchema.parse(response)
  },
  startManageSubtitleCleanup: async (request: unknown) => {
    const parsed = startManageSubtitleCleanupRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.startManageSubtitleCleanup, parsed)
    return startManageSubtitleCleanupResponseSchema.parse(response)
  },
  readManageSubtitleCleanupTask: async (request: unknown) => {
    const parsed = readManageSubtitleCleanupTaskRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.readManageSubtitleCleanupTask, parsed)
    return readManageSubtitleCleanupTaskResponseSchema.parse(response)
  },
  runManageSubtitleCleanup: async (request: unknown) => {
    const parsed = runManageSubtitleCleanupRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.runManageSubtitleCleanup, parsed)
    return runManageSubtitleCleanupResponseSchema.parse(response)
  },
  saveManageSubtitleCleanup: async (request: unknown) => {
    const parsed = saveManageSubtitleCleanupRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.saveManageSubtitleCleanup, parsed)
    return saveManageSubtitleCleanupResponseSchema.parse(response)
  },
  startImageConvertTask: async (request: unknown) => {
    const parsed = startImageConvertTaskRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.startImageConvertTask, parsed)
    return startImageConvertTaskResponseSchema.parse(response)
  },
  readImageConvertTask: async (request: unknown) => {
    const parsed = readImageConvertTaskRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.readImageConvertTask, parsed)
    return readImageConvertTaskResponseSchema.parse(response)
  },
  cancelImageConvertTask: async (request: unknown) => {
    const parsed = cancelImageConvertTaskRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.cancelImageConvertTask, parsed)
    return cancelImageConvertTaskResponseSchema.parse(response)
  },
  writePackageMetadata: async (request: unknown) => {
    const parsed = writePackageMetadataRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.writePackageMetadata, parsed)
    return writePackageMetadataResponseSchema.parse(response)
  },
  writePackageExternalMetadata: async (request: unknown) => {
    const parsed = writePackageExternalMetadataRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.writePackageExternalMetadata, parsed)
    return writePackageExternalMetadataResponseSchema.parse(response)
  },
  searchExternalMetadata: async (request: unknown) => {
    const parsed = searchExternalMetadataRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.searchExternalMetadata, parsed)
    return searchExternalMetadataResponseSchema.parse(response)
  },
  writeVideoMetadata: async (request: unknown) => {
    const parsed = writeVideoMetadataRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.writeVideoMetadata, parsed)
    return writeVideoMetadataResponseSchema.parse(response)
  },
  writeAudioMetadata: async (request: unknown) => {
    const parsed = writeAudioMetadataRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.writeAudioMetadata, parsed)
    return writeAudioMetadataResponseSchema.parse(response)
  },
  saveVideoCover: async (request: unknown) => {
    const parsed = saveVideoCoverRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.saveVideoCover, parsed)
    return saveVideoCoverResponseSchema.parse(response)
  },
  readPlaylist: async () => {
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.readPlaylist)
    return readPlaylistResponseSchema.parse(response)
  },
  writePlaylist: async (request: unknown) => {
    const parsed = writePlaylistRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.writePlaylist, parsed)
    return writePlaylistResponseSchema.parse(response)
  },
  listVideoSubtitles: async (request: unknown) => {
    const parsed = listVideoSubtitlesRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.listVideoSubtitles, parsed)
    return listVideoSubtitlesResponseSchema.parse(response)
  },
  prepareSubtitleTrack: async (request: unknown) => {
    const parsed = prepareSubtitleTrackRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.prepareSubtitleTrack, parsed)
    return prepareSubtitleTrackResponseSchema.parse(response)
  },
  pickImportPaths: async (request: unknown) => {
    const parsed = pickImportPathsRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.pickImportPaths, parsed)
    return pickImportPathsResponseSchema.parse(response)
  },
  pickFilePath: async (request: unknown) => {
    const parsed = pickFilePathRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.pickFilePath, parsed)
    return pickFilePathResponseSchema.parse(response)
  },
  pickDirectoryPath: async (request: unknown) => {
    const parsed = pickDirectoryPathRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.pickDirectoryPath, parsed)
    return pickDirectoryPathResponseSchema.parse(response)
  },
  readClipboardImportPaths: async () => {
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.readClipboardImportPaths)
    return readClipboardImportPathsResponseSchema.parse(response)
  },
  enqueueImportTask: async (request: unknown) => {
    const parsed = enqueueImportTaskRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.enqueueImportTask, parsed)
    return enqueueImportTaskResponseSchema.parse(response)
  },
  readImportTasks: async () => {
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.readImportTasks)
    return readImportTasksResponseSchema.parse(response)
  },
  retryImportTask: async (request: unknown) => {
    const parsed = retryImportTaskRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.retryImportTask, parsed)
    return retryImportTaskResponseSchema.parse(response)
  },
  readMediaAccessAudit: async () => {
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.readMediaAccessAudit)
    return mediaAccessAuditResponseSchema.parse(response)
  },
  readRuntimeCapabilities: async () => {
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.readRuntimeCapabilities)
    return readRuntimeCapabilitiesResponseSchema.parse(response)
  },
  readAudioEngineState: async () => {
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.readAudioEngineState)
    return readAudioEngineStateResponseSchema.parse(response)
  },
  readAudioEnginePlaybackStatus: async () => {
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.readAudioEnginePlaybackStatus)
    return readAudioEnginePlaybackStatusResponseSchema.parse(response)
  },
  setAudioEngineMode: async (request: unknown) => {
    const parsed = setAudioEngineModeRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.setAudioEngineMode, parsed)
    return setAudioEngineModeResponseSchema.parse(response)
  },
  listAudioOutputDevices: async () => {
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.listAudioOutputDevices)
    return listAudioOutputDevicesResponseSchema.parse(response)
  },
  setAudioOutputDevice: async (request: unknown) => {
    const parsed = setAudioOutputDeviceRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.setAudioOutputDevice, parsed)
    return setAudioOutputDeviceResponseSchema.parse(response)
  },
  setAudioExclusive: async (request: unknown) => {
    const parsed = setAudioExclusiveRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.setAudioExclusive, parsed)
    return setAudioExclusiveResponseSchema.parse(response)
  },
  setAudioGaplessMode: async (request: unknown) => {
    const parsed = setAudioGaplessModeRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.setAudioGaplessMode, parsed)
    return setAudioGaplessModeResponseSchema.parse(response)
  },
  setAudioReplayGainMode: async (request: unknown) => {
    const parsed = setAudioReplayGainModeRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.setAudioReplayGainMode, parsed)
    return setAudioReplayGainModeResponseSchema.parse(response)
  },
  audioEngineLoadTrack: async (request: unknown) => {
    const parsed = audioEngineLoadTrackRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.audioEngineLoadTrack, parsed)
    return audioEngineActionResponseSchema.parse(response)
  },
  audioEngineSetPaused: async (request: unknown) => {
    const parsed = audioEngineSetPausedRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.audioEngineSetPaused, parsed)
    return audioEngineActionResponseSchema.parse(response)
  },
  audioEngineSeekTo: async (request: unknown) => {
    const parsed = audioEngineSeekToRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.audioEngineSeekTo, parsed)
    return audioEngineActionResponseSchema.parse(response)
  },
  audioEngineSetVolume: async (request: unknown) => {
    const parsed = audioEngineSetVolumeRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.audioEngineSetVolume, parsed)
    return audioEngineActionResponseSchema.parse(response)
  },
  audioEngineStopPlayback: async () => {
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.audioEngineStopPlayback)
    return audioEngineActionResponseSchema.parse(response)
  },
  readSubtitleEngineStatus: async () => {
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.readSubtitleEngineStatus)
    return readSubtitleEngineStatusResponseSchema.parse(response)
  },
  listSubtitleRemoteModels: async () => {
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.listSubtitleRemoteModels)
    return listSubtitleRemoteModelsResponseSchema.parse(response)
  },
  listSubtitleLocalModels: async (request: unknown) => {
    const parsed = listSubtitleLocalModelsRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.listSubtitleLocalModels, parsed)
    return listSubtitleLocalModelsResponseSchema.parse(response)
  },
  startSubtitleModelDownload: async (request: unknown) => {
    const parsed = startSubtitleModelDownloadRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.startSubtitleModelDownload, parsed)
    return startSubtitleModelDownloadResponseSchema.parse(response)
  },
  cancelSubtitleModelDownload: async (request: unknown) => {
    const parsed = cancelSubtitleModelDownloadRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.cancelSubtitleModelDownload, parsed)
    return cancelSubtitleModelDownloadResponseSchema.parse(response)
  },
  readSubtitleModelDownloads: async () => {
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.readSubtitleModelDownloads)
    return readSubtitleModelDownloadsResponseSchema.parse(response)
  },
  clearSubtitleLocalModel: async (request: unknown) => {
    const parsed = clearSubtitleLocalModelRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.clearSubtitleLocalModel, parsed)
    return clearSubtitleLocalModelResponseSchema.parse(response)
  },
  startSubtitleSession: async (request: unknown) => {
    const parsed = startSubtitleSessionRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.startSubtitleSession, parsed)
    return startSubtitleSessionResponseSchema.parse(response)
  },
  stopSubtitleSession: async (request: unknown) => {
    const parsed = stopSubtitleSessionRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.stopSubtitleSession, parsed)
    return stopSubtitleSessionResponseSchema.parse(response)
  },
  resetSubtitleSession: async (request: unknown) => {
    const parsed = resetSubtitleSessionRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.resetSubtitleSession, parsed)
    return resetSubtitleSessionResponseSchema.parse(response)
  },
  flushSubtitleSession: async () => {
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.flushSubtitleSession)
    return flushSubtitleSessionResponseSchema.parse(response)
  },
  pushSubtitleAudio: async (request: unknown) => {
    const parsed = pushSubtitleAudioRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.pushSubtitleAudio, parsed)
    return pushSubtitleAudioResponseSchema.parse(response)
  },
  startSubtitlePersistence: async (request: unknown) => {
    const parsed = startSubtitlePersistenceRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.startSubtitlePersistence, parsed)
    return startSubtitlePersistenceResponseSchema.parse(response)
  },
  appendSubtitlePersistence: async (request: unknown) => {
    const parsed = appendSubtitlePersistenceRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.appendSubtitlePersistence, parsed)
    return appendSubtitlePersistenceResponseSchema.parse(response)
  },
  readSubtitlePersistenceWindow: async (request: unknown) => {
    const parsed = readSubtitlePersistenceWindowRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.readSubtitlePersistenceWindow, parsed)
    return readSubtitlePersistenceWindowResponseSchema.parse(response)
  },
  readRuntimeInfo: async () => {
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.readRuntimeInfo)
    return readRuntimeInfoResponseSchema.parse(response)
  },
  setRuntimeStoragePaths: async (request: unknown) => {
    const parsed = setRuntimeStoragePathsRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.setRuntimeStoragePaths, parsed)
    return setRuntimeStoragePathsResponseSchema.parse(response)
  },
  readArchiveLoadStatus: async () => {
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.readArchiveLoadStatus)
    return readArchiveLoadStatusResponseSchema.parse(response)
  },
  readAppState: async (request: unknown) => {
    const parsed = readAppStateRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.readAppState, parsed)
    return readAppStateResponseSchema.parse(response)
  },
  writeAppState: async (request: unknown) => {
    const parsed = writeAppStateRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.writeAppState, parsed)
    return writeAppStateResponseSchema.parse(response)
  },
  openExternalUrl: async (request: unknown) => {
    const parsed = openExternalUrlRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.openExternalUrl, parsed)
    return openExternalUrlResponseSchema.parse(response)
  },
  clearDatabase: async () => {
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.clearDatabase)
    return clearDatabaseResponseSchema.parse(response)
  },
  updatePerformanceConfig: async (request: unknown) => {
    const parsed = updatePerformanceConfigRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.updatePerformanceConfig, parsed)
    return updatePerformanceConfigResponseSchema.parse(response)
  },
  onLibraryChanged: (listener: (payload: unknown) => void) => {
    const handler = (_event: unknown, payload: unknown) => {
      try {
        listener(payload)
      } catch {
        // ignore listener errors
      }
    }

    ipcRenderer.on(BACKEND_CHANNELS.libraryChanged, handler)
    return () => {
      ipcRenderer.removeListener(BACKEND_CHANNELS.libraryChanged, handler)
    }
  },
}

const benchApi = {
  readConfig: async () => {
    return await ipcRenderer.invoke(BENCH_CHANNELS.readConfig)
  },
  ping: async () => {
    return await ipcRenderer.invoke(BENCH_CHANNELS.ping)
  },
  finish: async (report: unknown) => {
    return await ipcRenderer.invoke(BENCH_CHANNELS.finish, report)
  },
}

const platformApi = {
  getPathForFile: (file: File): string | null => {
    try {
      const getter = (webUtils as unknown as { getPathForFile?: (file: File) => unknown } | undefined)?.getPathForFile
      const value = getter?.(file)
      if (typeof value === 'string' && value.trim().length > 0) {
        return value
      }
    } catch {
      // ignore
    }

    const fallback = file as File & { path?: unknown }
    return typeof fallback.path === 'string' && fallback.path.trim().length > 0 ? fallback.path : null
  },
}

const viewApi = {
  setZoomFactor: (value: number) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) {
      return
    }

    const clamped = Math.max(0.7, Math.min(1, parsed))
    webFrame.setZoomFactor(clamped)
  },
}

const windowApi = {
  minimize: async () => {
    await ipcRenderer.invoke(APP_WINDOW_CHANNELS.minimize)
  },
  toggleMaximize: async () => {
    await ipcRenderer.invoke(APP_WINDOW_CHANNELS.toggleMaximize)
  },
  close: async () => {
    await ipcRenderer.invoke(APP_WINDOW_CHANNELS.close)
  },
  setFullscreen: async (active: boolean) => {
    await ipcRenderer.invoke(APP_WINDOW_CHANNELS.setFullscreen, Boolean(active))
  },
  isMaximized: async () => {
    return await ipcRenderer.invoke(APP_WINDOW_CHANNELS.isMaximized)
  },
  isFullscreen: async () => {
    return await ipcRenderer.invoke(APP_WINDOW_CHANNELS.isFullscreen)
  },
  writeClipboardPng: async (pngBytes: Uint8Array) => {
    return await ipcRenderer.invoke(APP_WINDOW_CHANNELS.writeClipboardPng, pngBytes)
  },
  getNativeChromeEnabled: async () => {
    return await ipcRenderer.invoke(APP_WINDOW_CHANNELS.getNativeChromeEnabled)
  },
  setNativeChromeEnabled: async (enabled: boolean) => {
    return await ipcRenderer.invoke(APP_WINDOW_CHANNELS.setNativeChromeEnabled, Boolean(enabled))
  },
  onMaximizedStateChange: (listener: (maximized: boolean) => void) => {
    const handler = (_event: unknown, payload: unknown) => {
      listener(Boolean(payload))
    }

    ipcRenderer.on(APP_WINDOW_CHANNELS.maximizedStateChanged, handler)
    return () => {
      ipcRenderer.removeListener(APP_WINDOW_CHANNELS.maximizedStateChanged, handler)
    }
  },
  onFullscreenStateChange: (listener: (active: boolean) => void) => {
    const handler = (_event: unknown, payload: unknown) => {
      listener(Boolean(payload))
    }

    ipcRenderer.on(APP_WINDOW_CHANNELS.fullscreenStateChanged, handler)
    return () => {
      ipcRenderer.removeListener(APP_WINDOW_CHANNELS.fullscreenStateChanged, handler)
    }
  },
}

contextBridge.exposeInMainWorld('mediaPlayerBackend', backendApi)
contextBridge.exposeInMainWorld('mediaPlayerBench', benchApi)
contextBridge.exposeInMainWorld('mediaPlayerPlatform', platformApi)
contextBridge.exposeInMainWorld('mediaPlayerView', viewApi)
contextBridge.exposeInMainWorld('mediaPlayerWindow', windowApi)
