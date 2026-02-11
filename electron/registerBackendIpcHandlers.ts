import { app, BrowserWindow, clipboard, dialog, ipcMain, protocol } from 'electron'
import path from 'node:path'

import {
  clearDatabaseResponseSchema,
  enqueueImportTaskRequestSchema,
  enqueueImportTaskResponseSchema,
  librarySnapshotDtoSchema,
  mediaAccessAuditResponseSchema,
  pickImportPathsRequestSchema,
  pickImportPathsResponseSchema,
  readClipboardImportPathsResponseSchema,
  readRuntimeCapabilitiesResponseSchema,
  readRuntimeInfoResponseSchema,
  readArchiveLoadStatusResponseSchema,
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
  writeVideoMetadataRequestSchema,
  writeVideoMetadataResponseSchema,
  writePackageGradeRequestSchema,
  writePackageGradeResponseSchema,
  readAppStateRequestSchema,
  readAppStateResponseSchema,
  writeAppStateRequestSchema,
  writeAppStateResponseSchema,
} from '../src/contracts/backend'
import { BACKEND_CHANNELS, MEDIA_PROTOCOL_SCHEME } from './channels'
import { FileSystemMediaReadService } from './fileSystemReadService'
import { DATABASE_RELATIVE_PATH } from './mediaLibrarySchema'

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
  const defaultLibraryRoot = path.join(app.getPath('pictures'), 'MediaPlayerXLibrary')
  const libraryRoot = path.resolve(process.env.MEDIA_PLAYERX_LIBRARY_ROOT ?? defaultLibraryRoot)
  let service: FileSystemMediaReadService | null = null

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

  const ensureService = (): FileSystemMediaReadService => {
    if (service) {
      return service
    }

    service = new FileSystemMediaReadService(libraryRoot)
    service.onLibraryChanged((payload) => {
      broadcastLibraryChanged(payload)
    })

    return service
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
    } catch {
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
    const response = await ensureService().resolveMediaResource(request)
    return resolveMediaResourceResponseSchema.parse(response)
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

  ipcMain.handle(BACKEND_CHANNELS.testWdSwinTaggerModel, async (_event, payload: unknown) => {
    const request = testWdSwinTaggerModelRequestSchema.parse(payload)
    const response = await ensureService().testWdSwinTaggerModel(request)
    return testWdSwinTaggerModelResponseSchema.parse(response)
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

  ipcMain.handle(BACKEND_CHANNELS.generatePackageAutoTags, async (_event, payload: unknown) => {
    const request = generatePackageAutoTagsRequestSchema.parse(payload)
    const response = await ensureService().generatePackageAutoTags(request)
    return generatePackageAutoTagsResponseSchema.parse(response)
  })

  ipcMain.handle(BACKEND_CHANNELS.writeVideoMetadata, async (_event, payload: unknown) => {
    const request = writeVideoMetadataRequestSchema.parse(payload)
    const response = await ensureService().writeVideoMetadata(request)
    return writeVideoMetadataResponseSchema.parse(response)
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
    const userDataPath = app.getPath('userData')
    const databasePath = path.resolve(userDataPath, DATABASE_RELATIVE_PATH)

    return readRuntimeInfoResponseSchema.parse({
      app_version: app.getVersion(),
      is_packaged: app.isPackaged,
      platform: process.platform,
      arch: process.arch,
      user_data_path: userDataPath,
      library_root: libraryRoot,
      database_path: databasePath,
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

  ipcMain.handle(BACKEND_CHANNELS.clearDatabase, async () => {
    const response = await ensureService().clearDatabase()
    return clearDatabaseResponseSchema.parse(response)
  })
}
