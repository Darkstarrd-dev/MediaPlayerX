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
  ReadRuntimeCapabilitiesResponseDto,
  ReadAudioEngineStateResponseDto,
  SetAudioEngineModeRequestDto,
  SetAudioEngineModeResponseDto,
  ListAudioOutputDevicesResponseDto,
  SetAudioOutputDeviceRequestDto,
  SetAudioOutputDeviceResponseDto,
  SetAudioExclusiveRequestDto,
  SetAudioExclusiveResponseDto,
  SetAudioGaplessModeRequestDto,
  SetAudioGaplessModeResponseDto,
  SetAudioReplayGainModeRequestDto,
  SetAudioReplayGainModeResponseDto,
  ReadSubtitleEngineStatusResponseDto,
  ListSubtitleRemoteModelsResponseDto,
  ListSubtitleLocalModelsRequestDto,
  ListSubtitleLocalModelsResponseDto,
  StartSubtitleModelDownloadRequestDto,
  StartSubtitleModelDownloadResponseDto,
  CancelSubtitleModelDownloadRequestDto,
  CancelSubtitleModelDownloadResponseDto,
  ReadSubtitleModelDownloadsResponseDto,
  ClearSubtitleLocalModelRequestDto,
  ClearSubtitleLocalModelResponseDto,
  StartSubtitleSessionRequestDto,
  StartSubtitleSessionResponseDto,
  StopSubtitleSessionRequestDto,
  StopSubtitleSessionResponseDto,
  ResetSubtitleSessionRequestDto,
  ResetSubtitleSessionResponseDto,
  FlushSubtitleSessionResponseDto,
  PushSubtitleAudioRequestDto,
  PushSubtitleAudioResponseDto,
  StartSubtitlePersistenceRequestDto,
  StartSubtitlePersistenceResponseDto,
  AppendSubtitlePersistenceRequestDto,
  AppendSubtitlePersistenceResponseDto,
  ReadSubtitlePersistenceWindowRequestDto,
  ReadSubtitlePersistenceWindowResponseDto,
  DeleteImageItemsRequestDto,
  DeleteImageItemsResponseDto,
  DeleteSidebarNodesRequestDto,
  DeleteSidebarNodesResponseDto,
  MoveSidebarNodesRequestDto,
  MoveSidebarNodesResponseDto,
  RenameSidebarNodeRequestDto,
  RenameSidebarNodeResponseDto,
  RenameSidebarNodesRequestDto,
  RenameSidebarNodesResponseDto,
  RenameItemsRequestDto,
  RenameItemsResponseDto,
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
  ReadManageAdReviewKnownHashesResponseDto,
  ImportManageAdReviewKnownHashesRequestDto,
  ImportManageAdReviewKnownHashesResponseDto,
  ExportManageAdReviewKnownHashesRequestDto,
  ExportManageAdReviewKnownHashesResponseDto,
  StartManageCoverReviewRequestDto,
  StartManageCoverReviewResponseDto,
  ReadManageCoverReviewTaskRequestDto,
  ReadManageCoverReviewTaskResponseDto,
  PauseManageCoverReviewTaskRequestDto,
  PauseManageCoverReviewTaskResponseDto,
  ConfirmManageCoverReviewHideRequestDto,
  ConfirmManageCoverReviewHideResponseDto,
  StartManageSubtitleCleanupRequestDto,
  StartManageSubtitleCleanupResponseDto,
  ReadManageSubtitleCleanupTaskRequestDto,
  ReadManageSubtitleCleanupTaskResponseDto,
  RunManageSubtitleCleanupRequestDto,
  RunManageSubtitleCleanupResponseDto,
  SaveManageSubtitleCleanupRequestDto,
  SaveManageSubtitleCleanupResponseDto,
  StartImageConvertTaskRequestDto,
  StartImageConvertTaskResponseDto,
  ReadImageConvertTaskRequestDto,
  ReadImageConvertTaskResponseDto,
  CancelImageConvertTaskRequestDto,
  CancelImageConvertTaskResponseDto,
  StartAudioTranscodeTaskRequestDto,
  StartAudioTranscodeTaskResponseDto,
  ReadAudioTranscodeCapabilitiesResponseDto,
  ReadAudioTranscodeTaskRequestDto,
  ReadAudioTranscodeTaskResponseDto,
  CancelAudioTranscodeTaskRequestDto,
  CancelAudioTranscodeTaskResponseDto,
  StartVideoTranscodeTaskRequestDto,
  StartVideoTranscodeTaskResponseDto,
  EstimateVideoTranscodeOutputSizeRequestDto,
  EstimateVideoTranscodeOutputSizeResponseDto,
  ReadVideoTranscodeCapabilitiesResponseDto,
  ReadVideoTranscodeTaskRequestDto,
  ReadVideoTranscodeTaskResponseDto,
  CancelVideoTranscodeTaskRequestDto,
  CancelVideoTranscodeTaskResponseDto,
  ReadImportTasksResponseDto,
  RetryImportTaskRequestDto,
  RetryImportTaskResponseDto,
  LibrarySnapshotDto,
  LibrarySnapshotLiteDto,
  MediaAccessAuditResponseDto,
  ReadImageMetadataRequestDto,
  ReadImageMetadataResponseDto,
  ListVideoSubtitlesRequestDto,
  ListVideoSubtitlesResponseDto,
  PrepareSubtitleTrackRequestDto,
  PrepareSubtitleTrackResponseDto,
  ReadPlaylistResponseDto,
  ReadImagePageRequestDto,
  ReadImagePageResponseDto,
  ReadSourceImagesRequestDto,
  ReadSourceImagesResponseDto,
  ReadImageSidebarTreeRequestDto,
  ReadImageSidebarTreeResponseDto,
  ResolveMediaResourceRequestDto,
  ResolveMediaResourceResponseDto,
  SaveVideoCoverRequestDto,
  SaveVideoCoverResponseDto,
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
  WriteAudioMetadataRequestDto,
  WriteAudioMetadataResponseDto,
  SetImageHiddenRequestDto,
  SetImageHiddenResponseDto,
  WritePackageGradeRequestDto,
  WritePackageGradeResponseDto,
  ReadAppStateRequestDto,
  ReadAppStateResponseDto,
  WriteAppStateRequestDto,
  WriteAppStateResponseDto,
  UpdatePerformanceConfigRequestDto,
  UpdatePerformanceConfigResponseDto,
} from "../../../contracts/backend";

export interface RepositoryRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface MediaRepository {
  getInitialLibrarySnapshot(): LibrarySnapshotDto | null;
  readLibrarySnapshot(
    options?: RepositoryRequestOptions,
  ): Promise<LibrarySnapshotDto>;
  readLibrarySnapshotLite?(
    options?: RepositoryRequestOptions,
  ): Promise<LibrarySnapshotLiteDto>;
  readImageSidebarTree(
    request: ReadImageSidebarTreeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadImageSidebarTreeResponseDto>;
  readImagePage(
    request: ReadImagePageRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadImagePageResponseDto>;
  readSourceImages?(
    request: ReadSourceImagesRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadSourceImagesResponseDto>;
  readImageMetadata(
    request: ReadImageMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadImageMetadataResponseDto>;
  resolveMediaResource(
    request: ResolveMediaResourceRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ResolveMediaResourceResponseDto>;
  writePackageGrade(
    request: WritePackageGradeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePackageGradeResponseDto>;
  setImageHidden?(
    request: SetImageHiddenRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SetImageHiddenResponseDto>;
  deleteImageItems?(
    request: DeleteImageItemsRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<DeleteImageItemsResponseDto>;
  deleteSidebarNodes?(
    request: DeleteSidebarNodesRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<DeleteSidebarNodesResponseDto>;
  moveSidebarNodes?(
    request: MoveSidebarNodesRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<MoveSidebarNodesResponseDto>;
  renameSidebarNode?(
    request: RenameSidebarNodeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<RenameSidebarNodeResponseDto>;
  renameSidebarNodes?(
    request: RenameSidebarNodesRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<RenameSidebarNodesResponseDto>;
  renameItems?(
    request: RenameItemsRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<RenameItemsResponseDto>;
  startManageAdReview?(
    request: StartManageAdReviewRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StartManageAdReviewResponseDto>;
  readManageAdReviewTask?(
    request: ReadManageAdReviewTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadManageAdReviewTaskResponseDto>;
  pauseManageAdReviewTask?(
    request: PauseManageAdReviewTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PauseManageAdReviewTaskResponseDto>;
  testAdReviewVisionModel?(
    request: TestAdReviewVisionModelRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<TestAdReviewVisionModelResponseDto>;
  confirmManageAdReviewDelete?(
    request: ConfirmManageAdReviewDeleteRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ConfirmManageAdReviewDeleteResponseDto>;
  readManageAdReviewKnownHashes?(
    options?: RepositoryRequestOptions,
  ): Promise<ReadManageAdReviewKnownHashesResponseDto>;
  importManageAdReviewKnownHashes?(
    request: ImportManageAdReviewKnownHashesRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ImportManageAdReviewKnownHashesResponseDto>;
  exportManageAdReviewKnownHashes?(
    request: ExportManageAdReviewKnownHashesRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ExportManageAdReviewKnownHashesResponseDto>;
  startManageCoverReview?(
    request: StartManageCoverReviewRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StartManageCoverReviewResponseDto>;
  readManageCoverReviewTask?(
    request: ReadManageCoverReviewTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadManageCoverReviewTaskResponseDto>;
  pauseManageCoverReviewTask?(
    request: PauseManageCoverReviewTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PauseManageCoverReviewTaskResponseDto>;
  confirmManageCoverReviewHide?(
    request: ConfirmManageCoverReviewHideRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ConfirmManageCoverReviewHideResponseDto>;
  startManageSubtitleCleanup?(
    request: StartManageSubtitleCleanupRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StartManageSubtitleCleanupResponseDto>;
  readManageSubtitleCleanupTask?(
    request: ReadManageSubtitleCleanupTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadManageSubtitleCleanupTaskResponseDto>;
  runManageSubtitleCleanup?(
    request: RunManageSubtitleCleanupRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<RunManageSubtitleCleanupResponseDto>;
  saveManageSubtitleCleanup?(
    request: SaveManageSubtitleCleanupRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SaveManageSubtitleCleanupResponseDto>;
  startImageConvertTask?(
    request: StartImageConvertTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StartImageConvertTaskResponseDto>;
  readImageConvertTask?(
    request: ReadImageConvertTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadImageConvertTaskResponseDto>;
  cancelImageConvertTask?(
    request: CancelImageConvertTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<CancelImageConvertTaskResponseDto>;
  startAudioTranscodeTask?(
    request: StartAudioTranscodeTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StartAudioTranscodeTaskResponseDto>;
  readAudioTranscodeCapabilities?(
    options?: RepositoryRequestOptions,
  ): Promise<ReadAudioTranscodeCapabilitiesResponseDto>;
  readAudioTranscodeTask?(
    request: ReadAudioTranscodeTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadAudioTranscodeTaskResponseDto>;
  cancelAudioTranscodeTask?(
    request: CancelAudioTranscodeTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<CancelAudioTranscodeTaskResponseDto>;
  startVideoTranscodeTask?(
    request: StartVideoTranscodeTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StartVideoTranscodeTaskResponseDto>;
  estimateVideoTranscodeOutputSize?(
    request: EstimateVideoTranscodeOutputSizeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<EstimateVideoTranscodeOutputSizeResponseDto>;
  readVideoTranscodeCapabilities?(
    options?: RepositoryRequestOptions,
  ): Promise<ReadVideoTranscodeCapabilitiesResponseDto>;
  readVideoTranscodeTask?(
    request: ReadVideoTranscodeTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadVideoTranscodeTaskResponseDto>;
  cancelVideoTranscodeTask?(
    request: CancelVideoTranscodeTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<CancelVideoTranscodeTaskResponseDto>;
  writePackageMetadata?(
    request: WritePackageMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePackageMetadataResponseDto>;
  writePackageExternalMetadata?(
    request: WritePackageExternalMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePackageExternalMetadataResponseDto>;
  searchExternalMetadata?(
    request: SearchExternalMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SearchExternalMetadataResponseDto>;
  writeVideoMetadata?(
    request: WriteVideoMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WriteVideoMetadataResponseDto>;
  writeAudioMetadata?(
    request: WriteAudioMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WriteAudioMetadataResponseDto>;
  saveVideoCover(
    request: SaveVideoCoverRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SaveVideoCoverResponseDto>;
  readPlaylist(
    options?: RepositoryRequestOptions,
  ): Promise<ReadPlaylistResponseDto>;
  writePlaylist(
    request: WritePlaylistRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePlaylistResponseDto>;
  listVideoSubtitles?(
    request: ListVideoSubtitlesRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ListVideoSubtitlesResponseDto>;
  prepareSubtitleTrack?(
    request: PrepareSubtitleTrackRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PrepareSubtitleTrackResponseDto>;
  readAppState?(
    request: ReadAppStateRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadAppStateResponseDto>;
  writeAppState?(
    request: WriteAppStateRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WriteAppStateResponseDto>;
  pickImportPaths?(
    request: PickImportPathsRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PickImportPathsResponseDto>;
  pickFilePath?(
    request: PickFilePathRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PickFilePathResponseDto>;
  pickDirectoryPath?(
    request: PickDirectoryPathRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PickDirectoryPathResponseDto>;
  readClipboardImportPaths?(
    options?: RepositoryRequestOptions,
  ): Promise<ReadClipboardImportPathsResponseDto>;
  enqueueImportTask(
    request: EnqueueImportTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<EnqueueImportTaskResponseDto>;
  readImportTasks(
    options?: RepositoryRequestOptions,
  ): Promise<ReadImportTasksResponseDto>;
  retryImportTask(
    request: RetryImportTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<RetryImportTaskResponseDto>;
  readMediaAccessAudit(
    options?: RepositoryRequestOptions,
  ): Promise<MediaAccessAuditResponseDto>;
  readRuntimeCapabilities(
    options?: RepositoryRequestOptions,
  ): Promise<ReadRuntimeCapabilitiesResponseDto>;
  readAudioEngineState?(
    options?: RepositoryRequestOptions,
  ): Promise<ReadAudioEngineStateResponseDto>;
  setAudioEngineMode?(
    request: SetAudioEngineModeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SetAudioEngineModeResponseDto>;
  listAudioOutputDevices?(
    options?: RepositoryRequestOptions,
  ): Promise<ListAudioOutputDevicesResponseDto>;
  setAudioOutputDevice?(
    request: SetAudioOutputDeviceRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SetAudioOutputDeviceResponseDto>;
  setAudioExclusive?(
    request: SetAudioExclusiveRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SetAudioExclusiveResponseDto>;
  setAudioGaplessMode?(
    request: SetAudioGaplessModeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SetAudioGaplessModeResponseDto>;
  setAudioReplayGainMode?(
    request: SetAudioReplayGainModeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SetAudioReplayGainModeResponseDto>;
  readSubtitleEngineStatus?(
    options?: RepositoryRequestOptions,
  ): Promise<ReadSubtitleEngineStatusResponseDto>;
  listSubtitleRemoteModels?(
    options?: RepositoryRequestOptions,
  ): Promise<ListSubtitleRemoteModelsResponseDto>;
  listSubtitleLocalModels?(
    request: ListSubtitleLocalModelsRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ListSubtitleLocalModelsResponseDto>;
  startSubtitleModelDownload?(
    request: StartSubtitleModelDownloadRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StartSubtitleModelDownloadResponseDto>;
  cancelSubtitleModelDownload?(
    request: CancelSubtitleModelDownloadRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<CancelSubtitleModelDownloadResponseDto>;
  readSubtitleModelDownloads?(
    options?: RepositoryRequestOptions,
  ): Promise<ReadSubtitleModelDownloadsResponseDto>;
  clearSubtitleLocalModel?(
    request: ClearSubtitleLocalModelRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ClearSubtitleLocalModelResponseDto>;
  startSubtitleSession?(
    request: StartSubtitleSessionRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StartSubtitleSessionResponseDto>;
  stopSubtitleSession?(
    request: StopSubtitleSessionRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StopSubtitleSessionResponseDto>;
  resetSubtitleSession?(
    request: ResetSubtitleSessionRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ResetSubtitleSessionResponseDto>;
  flushSubtitleSession?(
    options?: RepositoryRequestOptions,
  ): Promise<FlushSubtitleSessionResponseDto>;
  pushSubtitleAudio?(
    request: PushSubtitleAudioRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PushSubtitleAudioResponseDto>;
  startSubtitlePersistence?(
    request: StartSubtitlePersistenceRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StartSubtitlePersistenceResponseDto>;
  appendSubtitlePersistence?(
    request: AppendSubtitlePersistenceRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<AppendSubtitlePersistenceResponseDto>;
  readSubtitlePersistenceWindow?(
    request: ReadSubtitlePersistenceWindowRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadSubtitlePersistenceWindowResponseDto>;
  readArchiveLoadStatus?(
    options?: RepositoryRequestOptions,
  ): Promise<ReadArchiveLoadStatusResponseDto>;
  clearDatabase?(
    options?: RepositoryRequestOptions,
  ): Promise<ClearDatabaseResponseDto>;
  updatePerformanceConfig?(
    request: UpdatePerformanceConfigRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<UpdatePerformanceConfigResponseDto>;
  onLibraryChanged?(
    listener: (payload: { reason: string; updated_at_ms: number }) => void,
  ): () => void;
}

export interface SynchronousMediaRepository extends MediaRepository {
  readImageSidebarTreeSync(
    request: ReadImageSidebarTreeRequestDto,
  ): ReadImageSidebarTreeResponseDto;
  readImagePageSync(request: ReadImagePageRequestDto): ReadImagePageResponseDto;
  readSourceImagesSync(
    request: ReadSourceImagesRequestDto,
  ): ReadSourceImagesResponseDto;
  readImageMetadataSync(
    request: ReadImageMetadataRequestDto,
  ): ReadImageMetadataResponseDto;
  resolveMediaResourceSync(
    request: ResolveMediaResourceRequestDto,
  ): ResolveMediaResourceResponseDto;
  writePackageGradeSync(
    request: WritePackageGradeRequestDto,
  ): WritePackageGradeResponseDto;
  setImageHiddenSync?(
    request: SetImageHiddenRequestDto,
  ): SetImageHiddenResponseDto;
  deleteImageItemsSync?(
    request: DeleteImageItemsRequestDto,
  ): DeleteImageItemsResponseDto;
  deleteSidebarNodesSync?(
    request: DeleteSidebarNodesRequestDto,
  ): DeleteSidebarNodesResponseDto;
  moveSidebarNodesSync?(
    request: MoveSidebarNodesRequestDto,
  ): MoveSidebarNodesResponseDto;
  renameSidebarNodeSync?(
    request: RenameSidebarNodeRequestDto,
  ): RenameSidebarNodeResponseDto;
  renameSidebarNodesSync?(
    request: RenameSidebarNodesRequestDto,
  ): RenameSidebarNodesResponseDto;
  renameItemsSync?(request: RenameItemsRequestDto): RenameItemsResponseDto;
  startManageAdReviewSync?(
    request: StartManageAdReviewRequestDto,
  ): StartManageAdReviewResponseDto;
  readManageAdReviewTaskSync?(
    request: ReadManageAdReviewTaskRequestDto,
  ): ReadManageAdReviewTaskResponseDto;
  pauseManageAdReviewTaskSync?(
    request: PauseManageAdReviewTaskRequestDto,
  ): PauseManageAdReviewTaskResponseDto;
  testAdReviewVisionModelSync?(
    request: TestAdReviewVisionModelRequestDto,
  ): TestAdReviewVisionModelResponseDto;
  confirmManageAdReviewDeleteSync?(
    request: ConfirmManageAdReviewDeleteRequestDto,
  ): ConfirmManageAdReviewDeleteResponseDto;
  startManageCoverReviewSync?(
    request: StartManageCoverReviewRequestDto,
  ): StartManageCoverReviewResponseDto;
  readManageCoverReviewTaskSync?(
    request: ReadManageCoverReviewTaskRequestDto,
  ): ReadManageCoverReviewTaskResponseDto;
  pauseManageCoverReviewTaskSync?(
    request: PauseManageCoverReviewTaskRequestDto,
  ): PauseManageCoverReviewTaskResponseDto;
  confirmManageCoverReviewHideSync?(
    request: ConfirmManageCoverReviewHideRequestDto,
  ): ConfirmManageCoverReviewHideResponseDto;
  startManageSubtitleCleanupSync?(
    request: StartManageSubtitleCleanupRequestDto,
  ): StartManageSubtitleCleanupResponseDto;
  readManageSubtitleCleanupTaskSync?(
    request: ReadManageSubtitleCleanupTaskRequestDto,
  ): ReadManageSubtitleCleanupTaskResponseDto;
  runManageSubtitleCleanupSync?(
    request: RunManageSubtitleCleanupRequestDto,
  ): RunManageSubtitleCleanupResponseDto;
  saveManageSubtitleCleanupSync?(
    request: SaveManageSubtitleCleanupRequestDto,
  ): SaveManageSubtitleCleanupResponseDto;
  startImageConvertTaskSync?(
    request: StartImageConvertTaskRequestDto,
  ): StartImageConvertTaskResponseDto;
  readImageConvertTaskSync?(
    request: ReadImageConvertTaskRequestDto,
  ): ReadImageConvertTaskResponseDto;
  cancelImageConvertTaskSync?(
    request: CancelImageConvertTaskRequestDto,
  ): CancelImageConvertTaskResponseDto;
  startAudioTranscodeTaskSync?(
    request: StartAudioTranscodeTaskRequestDto,
  ): StartAudioTranscodeTaskResponseDto;
  readAudioTranscodeCapabilitiesSync?(): ReadAudioTranscodeCapabilitiesResponseDto;
  readAudioTranscodeTaskSync?(
    request: ReadAudioTranscodeTaskRequestDto,
  ): ReadAudioTranscodeTaskResponseDto;
  cancelAudioTranscodeTaskSync?(
    request: CancelAudioTranscodeTaskRequestDto,
  ): CancelAudioTranscodeTaskResponseDto;
  startVideoTranscodeTaskSync?(
    request: StartVideoTranscodeTaskRequestDto,
  ): StartVideoTranscodeTaskResponseDto;
  estimateVideoTranscodeOutputSizeSync?(
    request: EstimateVideoTranscodeOutputSizeRequestDto,
  ): EstimateVideoTranscodeOutputSizeResponseDto;
  readVideoTranscodeCapabilitiesSync?(): ReadVideoTranscodeCapabilitiesResponseDto;
  readVideoTranscodeTaskSync?(
    request: ReadVideoTranscodeTaskRequestDto,
  ): ReadVideoTranscodeTaskResponseDto;
  cancelVideoTranscodeTaskSync?(
    request: CancelVideoTranscodeTaskRequestDto,
  ): CancelVideoTranscodeTaskResponseDto;
  writePackageMetadataSync?(
    request: WritePackageMetadataRequestDto,
  ): WritePackageMetadataResponseDto;
  writePackageExternalMetadataSync?(
    request: WritePackageExternalMetadataRequestDto,
  ): WritePackageExternalMetadataResponseDto;
  searchExternalMetadataSync?(
    request: SearchExternalMetadataRequestDto,
  ): SearchExternalMetadataResponseDto;
  writeVideoMetadataSync?(
    request: WriteVideoMetadataRequestDto,
  ): WriteVideoMetadataResponseDto;
  writeAudioMetadataSync?(
    request: WriteAudioMetadataRequestDto,
  ): WriteAudioMetadataResponseDto;
  saveVideoCoverSync(
    request: SaveVideoCoverRequestDto,
  ): SaveVideoCoverResponseDto;
  readPlaylistSync(): ReadPlaylistResponseDto;
  writePlaylistSync(request: WritePlaylistRequestDto): WritePlaylistResponseDto;
  listVideoSubtitlesSync?(
    request: ListVideoSubtitlesRequestDto,
  ): ListVideoSubtitlesResponseDto;
  prepareSubtitleTrackSync?(
    request: PrepareSubtitleTrackRequestDto,
  ): PrepareSubtitleTrackResponseDto;
  pickImportPathsSync?(
    request: PickImportPathsRequestDto,
  ): PickImportPathsResponseDto;
  pickFilePathSync?(request: PickFilePathRequestDto): PickFilePathResponseDto;
  pickDirectoryPathSync?(
    request: PickDirectoryPathRequestDto,
  ): PickDirectoryPathResponseDto;
  readClipboardImportPathsSync?(): ReadClipboardImportPathsResponseDto;
  enqueueImportTaskSync(
    request: EnqueueImportTaskRequestDto,
  ): EnqueueImportTaskResponseDto;
  readImportTasksSync(): ReadImportTasksResponseDto;
  retryImportTaskSync(
    request: RetryImportTaskRequestDto,
  ): RetryImportTaskResponseDto;
  readMediaAccessAuditSync(): MediaAccessAuditResponseDto;
  readRuntimeCapabilitiesSync(): ReadRuntimeCapabilitiesResponseDto;
  clearDatabaseSync?(): ClearDatabaseResponseDto;
}

export type RepositoryMode = "mock" | "real";
