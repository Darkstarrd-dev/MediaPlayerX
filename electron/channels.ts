export const BACKEND_CHANNELS = {
  readLibrarySnapshot: 'backend:readLibrarySnapshot',
  readImageSidebarTree: 'backend:readImageSidebarTree',
  readImagePage: 'backend:readImagePage',
  readImageMetadata: 'backend:readImageMetadata',
  resolveMediaResource: 'backend:resolveMediaResource',
  writePackageGrade: 'backend:writePackageGrade',
  setImageHidden: 'backend:setImageHidden',
  deleteImageItems: 'backend:deleteImageItems',
  deleteSidebarNodes: 'backend:deleteSidebarNodes',
  startManageAdReview: 'backend:startManageAdReview',
  readManageAdReviewTask: 'backend:readManageAdReviewTask',
  pauseManageAdReviewTask: 'backend:pauseManageAdReviewTask',
  confirmManageAdReviewDelete: 'backend:confirmManageAdReviewDelete',
  testAdReviewVisionModel: 'backend:testAdReviewVisionModel',
  writePackageMetadata: 'backend:writePackageMetadata',
  searchExternalMetadata: 'backend:searchExternalMetadata',
  writeVideoMetadata: 'backend:writeVideoMetadata',
  saveVideoCover: 'backend:saveVideoCover',
  readPlaylist: 'backend:readPlaylist',
  writePlaylist: 'backend:writePlaylist',
  pickImportPaths: 'backend:pickImportPaths',
  pickFilePath: 'backend:pickFilePath',
  pickDirectoryPath: 'backend:pickDirectoryPath',
  readClipboardImportPaths: 'backend:readClipboardImportPaths',
  enqueueImportTask: 'backend:enqueueImportTask',
  readImportTasks: 'backend:readImportTasks',
  retryImportTask: 'backend:retryImportTask',
  readRuntimeCapabilities: 'backend:readRuntimeCapabilities',
  readRuntimeInfo: 'backend:readRuntimeInfo',
  readMediaAccessAudit: 'backend:readMediaAccessAudit',
  clearDatabase: 'backend:clearDatabase',
  readArchiveLoadStatus: 'backend:readArchiveLoadStatus',
  readAppState: 'backend:readAppState',
  writeAppState: 'backend:writeAppState',
  libraryChanged: 'backend:libraryChanged',
} as const

export const BENCH_CHANNELS = {
  readConfig: 'bench:readConfig',
  ping: 'bench:ping',
  finish: 'bench:finish',
} as const

export const MEDIA_PROTOCOL_SCHEME = 'mediaplayerx-media'

export type BackendChannelName = (typeof BACKEND_CHANNELS)[keyof typeof BACKEND_CHANNELS]

export type BenchChannelName = (typeof BENCH_CHANNELS)[keyof typeof BENCH_CHANNELS]
