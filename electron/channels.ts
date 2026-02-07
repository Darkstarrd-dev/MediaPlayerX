export const BACKEND_CHANNELS = {
  readLibrarySnapshot: 'backend:readLibrarySnapshot',
  readImageSidebarTree: 'backend:readImageSidebarTree',
  readImagePage: 'backend:readImagePage',
  readImageMetadata: 'backend:readImageMetadata',
  resolveMediaResource: 'backend:resolveMediaResource',
  writePackageGrade: 'backend:writePackageGrade',
  saveVideoCover: 'backend:saveVideoCover',
  readPlaylist: 'backend:readPlaylist',
  writePlaylist: 'backend:writePlaylist',
  pickImportPaths: 'backend:pickImportPaths',
  enqueueImportTask: 'backend:enqueueImportTask',
  readImportTasks: 'backend:readImportTasks',
  retryImportTask: 'backend:retryImportTask',
  readRuntimeCapabilities: 'backend:readRuntimeCapabilities',
  readMediaAccessAudit: 'backend:readMediaAccessAudit',
} as const

export const MEDIA_PROTOCOL_SCHEME = 'mediaplayerx-media'

export type BackendChannelName = (typeof BACKEND_CHANNELS)[keyof typeof BACKEND_CHANNELS]
