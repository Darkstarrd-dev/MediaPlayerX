import { contextBridge, ipcRenderer, webFrame, webUtils } from 'electron'

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
  readArchiveLoadStatusResponseSchema,
  readRuntimeCapabilitiesResponseSchema,
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
import { APP_WINDOW_CHANNELS, BACKEND_CHANNELS, BENCH_CHANNELS } from './channels'

const backendApi = {
  readLibrarySnapshot: async () => {
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.readLibrarySnapshot)
    return librarySnapshotDtoSchema.parse(response)
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
  isMaximized: async () => {
    return await ipcRenderer.invoke(APP_WINDOW_CHANNELS.isMaximized)
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
}

contextBridge.exposeInMainWorld('mediaPlayerBackend', backendApi)
contextBridge.exposeInMainWorld('mediaPlayerBench', benchApi)
contextBridge.exposeInMainWorld('mediaPlayerPlatform', platformApi)
contextBridge.exposeInMainWorld('mediaPlayerView', viewApi)
contextBridge.exposeInMainWorld('mediaPlayerWindow', windowApi)
