import type {
  ClearDatabaseResponseDto,
  EnqueueImportTaskRequestDto,
  EnqueueImportTaskResponseDto,
  PickImportPathsRequestDto,
  PickImportPathsResponseDto,
  PickFilePathRequestDto,
  PickFilePathResponseDto,
  PickDirectoryPathRequestDto,
  PickDirectoryPathResponseDto,
  ReadClipboardImportPathsResponseDto,
  ReadArchiveLoadStatusResponseDto,
  ReadImportTasksResponseDto,
  ReadRuntimeCapabilitiesResponseDto,
  ReadRuntimeInfoResponseDto,
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
  WritePackageExternalMetadataRequestDto,
  WritePackageExternalMetadataResponseDto,
  SearchExternalMetadataRequestDto,
  SearchExternalMetadataResponseDto,
  WriteVideoMetadataRequestDto,
  WriteVideoMetadataResponseDto,
  StartManageAdReviewRequestDto,
  StartManageAdReviewResponseDto,
  ReadManageAdReviewTaskRequestDto,
  ReadManageAdReviewTaskResponseDto,
  PauseManageAdReviewTaskRequestDto,
  PauseManageAdReviewTaskResponseDto,
  TestAdReviewVisionModelRequestDto,
  TestAdReviewVisionModelResponseDto,
  ConfirmManageAdReviewDeleteRequestDto,
  ConfirmManageAdReviewDeleteResponseDto,
  SetImageHiddenRequestDto,
  SetImageHiddenResponseDto,
  DeleteImageItemsRequestDto,
  DeleteImageItemsResponseDto,
  DeleteSidebarNodesRequestDto,
  DeleteSidebarNodesResponseDto,
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
  setImageHidden?: (request: SetImageHiddenRequestDto) => Promise<SetImageHiddenResponseDto>
  deleteImageItems?: (request: DeleteImageItemsRequestDto) => Promise<DeleteImageItemsResponseDto>
  deleteSidebarNodes?: (request: DeleteSidebarNodesRequestDto) => Promise<DeleteSidebarNodesResponseDto>
  startManageAdReview?: (request: StartManageAdReviewRequestDto) => Promise<StartManageAdReviewResponseDto>
  readManageAdReviewTask?: (request: ReadManageAdReviewTaskRequestDto) => Promise<ReadManageAdReviewTaskResponseDto>
  pauseManageAdReviewTask?: (
    request: PauseManageAdReviewTaskRequestDto,
  ) => Promise<PauseManageAdReviewTaskResponseDto>
  testAdReviewVisionModel?: (
    request: TestAdReviewVisionModelRequestDto,
  ) => Promise<TestAdReviewVisionModelResponseDto>
  confirmManageAdReviewDelete?: (
    request: ConfirmManageAdReviewDeleteRequestDto,
  ) => Promise<ConfirmManageAdReviewDeleteResponseDto>
  writePackageMetadata?: (request: WritePackageMetadataRequestDto) => Promise<WritePackageMetadataResponseDto>
  writePackageExternalMetadata?: (
    request: WritePackageExternalMetadataRequestDto,
  ) => Promise<WritePackageExternalMetadataResponseDto>
  searchExternalMetadata?: (request: SearchExternalMetadataRequestDto) => Promise<SearchExternalMetadataResponseDto>
  writeVideoMetadata?: (request: WriteVideoMetadataRequestDto) => Promise<WriteVideoMetadataResponseDto>
  saveVideoCover: (request: SaveVideoCoverRequestDto) => Promise<SaveVideoCoverResponseDto>
  readPlaylist: () => Promise<ReadPlaylistResponseDto>
  writePlaylist: (request: WritePlaylistRequestDto) => Promise<WritePlaylistResponseDto>
  readAppState?: (request: ReadAppStateRequestDto) => Promise<ReadAppStateResponseDto>
  writeAppState?: (request: WriteAppStateRequestDto) => Promise<WriteAppStateResponseDto>
  pickImportPaths: (request: PickImportPathsRequestDto) => Promise<PickImportPathsResponseDto>
  pickFilePath?: (request: PickFilePathRequestDto) => Promise<PickFilePathResponseDto>
  pickDirectoryPath?: (request: PickDirectoryPathRequestDto) => Promise<PickDirectoryPathResponseDto>
  readClipboardImportPaths: () => Promise<ReadClipboardImportPathsResponseDto>
  enqueueImportTask: (request: EnqueueImportTaskRequestDto) => Promise<EnqueueImportTaskResponseDto>
  readImportTasks: () => Promise<ReadImportTasksResponseDto>
  retryImportTask: (request: RetryImportTaskRequestDto) => Promise<RetryImportTaskResponseDto>
  readMediaAccessAudit: () => Promise<MediaAccessAuditResponseDto>
  readRuntimeCapabilities: () => Promise<ReadRuntimeCapabilitiesResponseDto>
  readRuntimeInfo?: () => Promise<ReadRuntimeInfoResponseDto>
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
