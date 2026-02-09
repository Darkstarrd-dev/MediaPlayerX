import type {
  ClearDatabaseResponseDto,
  EnqueueImportTaskRequestDto,
  EnqueueImportTaskResponseDto,
  PickImportPathsRequestDto,
  PickImportPathsResponseDto,
  ReadClipboardImportPathsResponseDto,
  ReadArchiveLoadStatusResponseDto,
  ReadImportTasksResponseDto,
  ReadRuntimeCapabilitiesResponseDto,
  LibrarySnapshotDto,
  ReadImageMetadataRequestDto,
  ReadImageMetadataResponseDto,
  ReadImagePageRequestDto,
  ReadImagePageResponseDto,
  ReadImageSidebarTreeRequestDto,
  ReadImageSidebarTreeResponseDto,
  MediaAccessAuditResponseDto,
  ReadPlaylistResponseDto,
  ResolveMediaResourceRequestDto,
  ResolveMediaResourceResponseDto,
  SaveVideoCoverRequestDto,
  SaveVideoCoverResponseDto,
  RetryImportTaskRequestDto,
  RetryImportTaskResponseDto,
  WritePlaylistRequestDto,
  WritePlaylistResponseDto,
  WritePackageMetadataRequestDto,
  WritePackageMetadataResponseDto,
  WriteVideoMetadataRequestDto,
  WriteVideoMetadataResponseDto,
  WritePackageGradeRequestDto,
  WritePackageGradeResponseDto,
  ReadAppStateRequestDto,
  ReadAppStateResponseDto,
  WriteAppStateRequestDto,
  WriteAppStateResponseDto,
} from './contracts/backend'

interface MediaPlayerBackendApi {
  readLibrarySnapshot: () => Promise<LibrarySnapshotDto>
  readImageSidebarTree: (request: ReadImageSidebarTreeRequestDto) => Promise<ReadImageSidebarTreeResponseDto>
  readImagePage: (request: ReadImagePageRequestDto) => Promise<ReadImagePageResponseDto>
  readImageMetadata: (request: ReadImageMetadataRequestDto) => Promise<ReadImageMetadataResponseDto>
  resolveMediaResource: (request: ResolveMediaResourceRequestDto) => Promise<ResolveMediaResourceResponseDto>
  writePackageGrade: (request: WritePackageGradeRequestDto) => Promise<WritePackageGradeResponseDto>
  writePackageMetadata?: (request: WritePackageMetadataRequestDto) => Promise<WritePackageMetadataResponseDto>
  writeVideoMetadata?: (request: WriteVideoMetadataRequestDto) => Promise<WriteVideoMetadataResponseDto>
  saveVideoCover: (request: SaveVideoCoverRequestDto) => Promise<SaveVideoCoverResponseDto>
  readPlaylist: () => Promise<ReadPlaylistResponseDto>
  writePlaylist: (request: WritePlaylistRequestDto) => Promise<WritePlaylistResponseDto>
  readAppState?: (request: ReadAppStateRequestDto) => Promise<ReadAppStateResponseDto>
  writeAppState?: (request: WriteAppStateRequestDto) => Promise<WriteAppStateResponseDto>
  pickImportPaths: (request: PickImportPathsRequestDto) => Promise<PickImportPathsResponseDto>
  readClipboardImportPaths: () => Promise<ReadClipboardImportPathsResponseDto>
  enqueueImportTask: (request: EnqueueImportTaskRequestDto) => Promise<EnqueueImportTaskResponseDto>
  readImportTasks: () => Promise<ReadImportTasksResponseDto>
  retryImportTask: (request: RetryImportTaskRequestDto) => Promise<RetryImportTaskResponseDto>
  readMediaAccessAudit: () => Promise<MediaAccessAuditResponseDto>
  readRuntimeCapabilities: () => Promise<ReadRuntimeCapabilitiesResponseDto>
  readArchiveLoadStatus?: () => Promise<ReadArchiveLoadStatusResponseDto>
  clearDatabase: () => Promise<ClearDatabaseResponseDto>
  onLibraryChanged?: (
    listener: (payload: { reason: string; updated_at_ms: number }) => void,
  ) => () => void
}

interface MediaPlayerBenchConfigResponse {
  bench: string | null
  config: unknown
  read_at_ms: number
}

interface MediaPlayerBenchPingResponse {
  main_now_ms: number
}

interface MediaPlayerBenchFinishResponse {
  output_path: string
}

interface MediaPlayerBenchApi {
  readConfig: () => Promise<MediaPlayerBenchConfigResponse>
  ping: () => Promise<MediaPlayerBenchPingResponse>
  finish: (report: unknown) => Promise<MediaPlayerBenchFinishResponse>
}

interface MediaPlayerPlatformApi {
  getPathForFile: (file: File) => string | null
}

interface MediaPlayerViewApi {
  setZoomFactor: (value: number) => void
}

declare global {
  interface Window {
    mediaPlayerBackend?: MediaPlayerBackendApi
    mediaPlayerBench?: MediaPlayerBenchApi
    mediaPlayerPlatform?: MediaPlayerPlatformApi
    mediaPlayerView?: MediaPlayerViewApi
  }
}

export {}
