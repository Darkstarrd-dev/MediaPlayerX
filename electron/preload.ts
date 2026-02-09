import { contextBridge, ipcRenderer, webFrame, webUtils } from 'electron'

import {
  clearDatabaseResponseSchema,
  enqueueImportTaskRequestSchema,
  enqueueImportTaskResponseSchema,
  librarySnapshotDtoSchema,
  mediaAccessAuditResponseSchema,
  pickImportPathsRequestSchema,
  pickImportPathsResponseSchema,
  readClipboardImportPathsResponseSchema,
  readArchiveLoadStatusResponseSchema,
  readRuntimeCapabilitiesResponseSchema,
  readImportTasksResponseSchema,
  readPlaylistResponseSchema,
  readImageMetadataRequestSchema,
  readImageMetadataResponseSchema,
  readImagePageRequestSchema,
  readImagePageResponseSchema,
  readImageSidebarTreeRequestSchema,
  readImageSidebarTreeResponseSchema,
  resolveMediaResourceRequestSchema,
  resolveMediaResourceResponseSchema,
  saveVideoCoverRequestSchema,
  saveVideoCoverResponseSchema,
  retryImportTaskRequestSchema,
  retryImportTaskResponseSchema,
  writePlaylistRequestSchema,
  writePlaylistResponseSchema,
  writePackageMetadataRequestSchema,
  writePackageMetadataResponseSchema,
  writeVideoMetadataRequestSchema,
  writeVideoMetadataResponseSchema,
  writePackageGradeRequestSchema,
  writePackageGradeResponseSchema,
  readAppStateRequestSchema,
  readAppStateResponseSchema,
  writeAppStateRequestSchema,
  writeAppStateResponseSchema,
} from '../src/contracts/backend'
import { BACKEND_CHANNELS, BENCH_CHANNELS } from './channels'

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
  writePackageMetadata: async (request: unknown) => {
    const parsed = writePackageMetadataRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.writePackageMetadata, parsed)
    return writePackageMetadataResponseSchema.parse(response)
  },
  writeVideoMetadata: async (request: unknown) => {
    const parsed = writeVideoMetadataRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.writeVideoMetadata, parsed)
    return writeVideoMetadataResponseSchema.parse(response)
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
  pickImportPaths: async (request: unknown) => {
    const parsed = pickImportPathsRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.pickImportPaths, parsed)
    return pickImportPathsResponseSchema.parse(response)
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

contextBridge.exposeInMainWorld('mediaPlayerBackend', backendApi)
contextBridge.exposeInMainWorld('mediaPlayerBench', benchApi)
contextBridge.exposeInMainWorld('mediaPlayerPlatform', platformApi)
contextBridge.exposeInMainWorld('mediaPlayerView', viewApi)
