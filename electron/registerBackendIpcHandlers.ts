import { app, dialog, ipcMain, protocol } from 'electron'
import path from 'node:path'

import {
  enqueueImportTaskRequestSchema,
  enqueueImportTaskResponseSchema,
  librarySnapshotDtoSchema,
  mediaAccessAuditResponseSchema,
  pickImportPathsRequestSchema,
  pickImportPathsResponseSchema,
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
  writePackageGradeRequestSchema,
  writePackageGradeResponseSchema,
} from '../src/contracts/backend'
import { BACKEND_CHANNELS, MEDIA_PROTOCOL_SCHEME } from './channels'
import { FileSystemMediaReadService } from './fileSystemReadService'

export function registerBackendIpcHandlers(): void {
  const defaultLibraryRoot = path.join(app.getPath('pictures'), 'MediaPlayerXLibrary')
  const libraryRoot = path.resolve(process.env.MEDIA_PLAYERX_LIBRARY_ROOT ?? defaultLibraryRoot)
  const service = new FileSystemMediaReadService(libraryRoot)

  protocol.handle(MEDIA_PROTOCOL_SCHEME, async (request) => {
    const requestUrl = new URL(request.url)
    const token = decodeURIComponent(requestUrl.pathname.replace(/^\//, ''))
    if (!token) {
      return new Response('invalid media token', { status: 400 })
    }

    try {
      const payload = await service.readMediaResourceByToken(token, request.headers.get('range'))
      return new Response(payload.body, {
        status: payload.status,
        headers: payload.headers,
      })
    } catch {
      return new Response('media not found', { status: 404 })
    }
  })

  ipcMain.handle(BACKEND_CHANNELS.readLibrarySnapshot, async () => {
    const response = await service.readLibrarySnapshot()
    return librarySnapshotDtoSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.readImageSidebarTree, async (_event, payload: unknown) => {
    const request = readImageSidebarTreeRequestSchema.parse(payload)
    const response = await service.readImageSidebarTree(request)
    return readImageSidebarTreeResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.readImagePage, async (_event, payload: unknown) => {
    const request = readImagePageRequestSchema.parse(payload)
    const response = await service.readImagePage(request)
    return readImagePageResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.readImageMetadata, async (_event, payload: unknown) => {
    const request = readImageMetadataRequestSchema.parse(payload)
    const response = await service.readImageMetadata(request)
    return readImageMetadataResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.resolveMediaResource, async (_event, payload: unknown) => {
    const request = resolveMediaResourceRequestSchema.parse(payload)
    const response = await service.resolveMediaResource(request)
    return resolveMediaResourceResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.writePackageGrade, async (_event, payload: unknown) => {
    const request = writePackageGradeRequestSchema.parse(payload)
    const response = await service.writePackageGrade(request)
    return writePackageGradeResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.saveVideoCover, async (_event, payload: unknown) => {
    const request = saveVideoCoverRequestSchema.parse(payload)
    const response = await service.saveVideoCover(request)
    return saveVideoCoverResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.readPlaylist, async () => {
    const response = await service.readPlaylist()
    return readPlaylistResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.writePlaylist, async (_event, payload: unknown) => {
    const request = writePlaylistRequestSchema.parse(payload)
    const response = await service.writePlaylist(request)
    return writePlaylistResponseSchema.parse(response)
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

  ipcMain.handle(BACKEND_CHANNELS.enqueueImportTask, async (_event, payload: unknown) => {
    const request = enqueueImportTaskRequestSchema.parse(payload)
    const response = await service.enqueueImportTask(request)
    return enqueueImportTaskResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.readImportTasks, async () => {
    const response = await service.readImportTasks()
    return readImportTasksResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.retryImportTask, async (_event, payload: unknown) => {
    const request = retryImportTaskRequestSchema.parse(payload)
    const response = await service.retryImportTask(request)
    return retryImportTaskResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.readMediaAccessAudit, async () => {
    const response = await service.readMediaAccessAudit()
    return mediaAccessAuditResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.readRuntimeCapabilities, async () => {
    const response = await service.readRuntimeCapabilities()
    return readRuntimeCapabilitiesResponseSchema.parse(response)
  })
}
