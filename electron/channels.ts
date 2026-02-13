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
  writePackageExternalMetadata: 'backend:writePackageExternalMetadata',
  searchExternalMetadata: 'backend:searchExternalMetadata',
  writeVideoMetadata: 'backend:writeVideoMetadata',
  writeAudioMetadata: 'backend:writeAudioMetadata',
  saveVideoCover: 'backend:saveVideoCover',
  readPlaylist: 'backend:readPlaylist',
  writePlaylist: 'backend:writePlaylist',
  listVideoSubtitles: 'backend:listVideoSubtitles',
  prepareSubtitleTrack: 'backend:prepareSubtitleTrack',
  pickImportPaths: 'backend:pickImportPaths',
  pickFilePath: 'backend:pickFilePath',
  pickDirectoryPath: 'backend:pickDirectoryPath',
  readClipboardImportPaths: 'backend:readClipboardImportPaths',
  enqueueImportTask: 'backend:enqueueImportTask',
  readImportTasks: 'backend:readImportTasks',
  retryImportTask: 'backend:retryImportTask',
  readRuntimeCapabilities: 'backend:readRuntimeCapabilities',
  readRuntimeInfo: 'backend:readRuntimeInfo',
  setRuntimeStoragePaths: 'backend:setRuntimeStoragePaths',
  readMediaAccessAudit: 'backend:readMediaAccessAudit',
  clearDatabase: 'backend:clearDatabase',
  readArchiveLoadStatus: 'backend:readArchiveLoadStatus',
  readAppState: 'backend:readAppState',
  writeAppState: 'backend:writeAppState',
  openExternalUrl: 'backend:openExternalUrl',
  libraryChanged: 'backend:libraryChanged',
} as const

export const BENCH_CHANNELS = {
  readConfig: 'bench:readConfig',
  ping: 'bench:ping',
  finish: 'bench:finish',
} as const

export const APP_WINDOW_CHANNELS = {
  minimize: 'appWindow:minimize',
  toggleMaximize: 'appWindow:toggleMaximize',
  close: 'appWindow:close',
  isMaximized: 'appWindow:isMaximized',
  maximizedStateChanged: 'appWindow:maximizedStateChanged',
  getNativeChromeEnabled: 'appWindow:getNativeChromeEnabled',
  setNativeChromeEnabled: 'appWindow:setNativeChromeEnabled',
} as const

export const MEDIA_PROTOCOL_SCHEME = 'mediaplayerx-media'

export type BackendChannelName = (typeof BACKEND_CHANNELS)[keyof typeof BACKEND_CHANNELS]

export type BenchChannelName = (typeof BENCH_CHANNELS)[keyof typeof BENCH_CHANNELS]

export type AppWindowChannelName = (typeof APP_WINDOW_CHANNELS)[keyof typeof APP_WINDOW_CHANNELS]
