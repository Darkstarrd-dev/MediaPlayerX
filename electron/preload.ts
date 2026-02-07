import { contextBridge, ipcRenderer } from 'electron'

import {
  librarySnapshotDtoSchema,
  mediaAccessAuditResponseSchema,
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
  writePlaylistRequestSchema,
  writePlaylistResponseSchema,
  writePackageGradeRequestSchema,
  writePackageGradeResponseSchema,
} from '../src/contracts/backend'
import { BACKEND_CHANNELS } from './channels'

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
  readMediaAccessAudit: async () => {
    const response = await ipcRenderer.invoke(BACKEND_CHANNELS.readMediaAccessAudit)
    return mediaAccessAuditResponseSchema.parse(response)
  },
}

contextBridge.exposeInMainWorld('mediaPlayerBackend', backendApi)
