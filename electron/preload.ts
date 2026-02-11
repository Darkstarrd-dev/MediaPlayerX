import { contextBridge, ipcRenderer, webFrame, webUtils } from 'electron'

import {
  clearDatabaseResponseSchema,
  clearVectorDataResponseSchema,
  enqueueImportTaskRequestSchema,
  enqueueImportTaskResponseSchema,
  librarySnapshotDtoSchema,
  mediaAccessAuditResponseSchema,
  pickImportPathsRequestSchema,
  pickImportPathsResponseSchema,
  readClipboardImportPathsResponseSchema,
  readArchiveLoadStatusResponseSchema,
  readRuntimeCapabilitiesResponseSchema,
  readRuntimeInfoResponseSchema,
  readVectorDataStatusResponseSchema,
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
  testWdSwinTaggerModelRequestSchema,
  testWdSwinTaggerModelResponseSchema,
  testEmbeddingModelRequestSchema,
  testEmbeddingModelResponseSchema,
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
  generatePackageAutoTagsRequestSchema,
  generatePackageAutoTagsResponseSchema,
  generatePackageAutoTagsVisionRequestSchema,
  generatePackageAutoTagsVisionResponseSchema,
  generatePackageEmbeddingsRequestSchema,
  generatePackageEmbeddingsResponseSchema,
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
  testWdSwinTaggerModel: async (request: unknown) => {
    const parsed = testWdSwinTaggerModelRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.testWdSwinTaggerModel, parsed)
    return testWdSwinTaggerModelResponseSchema.parse(response)
  },
  testEmbeddingModel: async (request: unknown) => {
    const parsed = testEmbeddingModelRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.testEmbeddingModel, parsed)
    return testEmbeddingModelResponseSchema.parse(response)
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
  generatePackageAutoTags: async (request: unknown) => {
    const parsed = generatePackageAutoTagsRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.generatePackageAutoTags, parsed)
    return generatePackageAutoTagsResponseSchema.parse(response)
  },
  generatePackageAutoTagsVision: async (request: unknown) => {
    const parsed = generatePackageAutoTagsVisionRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.generatePackageAutoTagsVision, parsed)
    return generatePackageAutoTagsVisionResponseSchema.parse(response)
  },
  generatePackageEmbeddings: async (request: unknown) => {
    const parsed = generatePackageEmbeddingsRequestSchema.parse(request)
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.generatePackageEmbeddings, parsed)
    return generatePackageEmbeddingsResponseSchema.parse(response)
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
  readRuntimeInfo: async () => {
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.readRuntimeInfo)
    return readRuntimeInfoResponseSchema.parse(response)
  },
  readVectorDataStatus: async () => {
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.readVectorDataStatus)
    return readVectorDataStatusResponseSchema.parse(response)
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
  clearVectorData: async () => {
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.clearVectorData)
    return clearVectorDataResponseSchema.parse(response)
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
