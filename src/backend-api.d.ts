import type {
  ClearDatabaseResponseDto,
  EnqueueImportTaskRequestDto,
  EnqueueImportTaskResponseDto,
  PickImportPathsRequestDto,
  PickImportPathsResponseDto,
  ReadClipboardImportPathsResponseDto,
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
  WritePackageGradeRequestDto,
  WritePackageGradeResponseDto,
} from './contracts/backend'

interface MediaPlayerBackendApi {
  readLibrarySnapshot: () => Promise<LibrarySnapshotDto>
  readImageSidebarTree: (request: ReadImageSidebarTreeRequestDto) => Promise<ReadImageSidebarTreeResponseDto>
  readImagePage: (request: ReadImagePageRequestDto) => Promise<ReadImagePageResponseDto>
  readImageMetadata: (request: ReadImageMetadataRequestDto) => Promise<ReadImageMetadataResponseDto>
  resolveMediaResource: (request: ResolveMediaResourceRequestDto) => Promise<ResolveMediaResourceResponseDto>
  writePackageGrade: (request: WritePackageGradeRequestDto) => Promise<WritePackageGradeResponseDto>
  saveVideoCover: (request: SaveVideoCoverRequestDto) => Promise<SaveVideoCoverResponseDto>
  readPlaylist: () => Promise<ReadPlaylistResponseDto>
  writePlaylist: (request: WritePlaylistRequestDto) => Promise<WritePlaylistResponseDto>
  pickImportPaths: (request: PickImportPathsRequestDto) => Promise<PickImportPathsResponseDto>
  readClipboardImportPaths: () => Promise<ReadClipboardImportPathsResponseDto>
  enqueueImportTask: (request: EnqueueImportTaskRequestDto) => Promise<EnqueueImportTaskResponseDto>
  readImportTasks: () => Promise<ReadImportTasksResponseDto>
  retryImportTask: (request: RetryImportTaskRequestDto) => Promise<RetryImportTaskResponseDto>
  readMediaAccessAudit: () => Promise<MediaAccessAuditResponseDto>
  readRuntimeCapabilities: () => Promise<ReadRuntimeCapabilitiesResponseDto>
  clearDatabase: () => Promise<ClearDatabaseResponseDto>
}

declare global {
  interface Window {
    mediaPlayerBackend?: MediaPlayerBackendApi
  }
}

export {}
