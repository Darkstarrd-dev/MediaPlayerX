import { ipcMain } from 'electron'

import {
  librarySnapshotDtoSchema,
  readImageMetadataRequestSchema,
  readImageMetadataResponseSchema,
  readImagePageRequestSchema,
  readImagePageResponseSchema,
  readImageSidebarTreeRequestSchema,
  readImageSidebarTreeResponseSchema,
} from '../src/contracts/backend'
import { BACKEND_CHANNELS } from './channels'
import { FileSystemMediaReadService } from './fileSystemReadService'

export function registerBackendIpcHandlers(): void {
  const libraryRoot = process.env.MEDIA_PLAYERX_LIBRARY_ROOT ?? 'Z:/bench'
  const service = new FileSystemMediaReadService(libraryRoot)

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
}
