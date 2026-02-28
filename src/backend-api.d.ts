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
  ReadAudioEngineStateResponseDto,
  ReadAudioEnginePlaybackStatusResponseDto,
  ReadAudioEngineAnalysisFrameResponseDto,
  SetAudioEngineModeRequestDto,
  SetAudioEngineModeResponseDto,
  VerifyAudioEngineMpvBinRequestDto,
  VerifyAudioEngineMpvBinResponseDto,
  VerifyAudioTranscodeFfmpegBinRequestDto,
  VerifyAudioTranscodeFfmpegBinResponseDto,
  ListAudioOutputDevicesResponseDto,
  SetAudioOutputDeviceRequestDto,
  SetAudioOutputDeviceResponseDto,
  SetAudioExclusiveRequestDto,
  SetAudioExclusiveResponseDto,
  SetAudioGaplessModeRequestDto,
  SetAudioGaplessModeResponseDto,
  SetAudioReplayGainModeRequestDto,
  SetAudioReplayGainModeResponseDto,
  AudioEngineActionResponseDto,
  AudioEngineLoadTrackRequestDto,
  AudioEngineSetPausedRequestDto,
  AudioEngineSeekToRequestDto,
  AudioEngineSetVolumeRequestDto,
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
  ReadRuntimeInfoResponseDto,
  SetRuntimeStoragePathsRequestDto,
  SetRuntimeStoragePathsResponseDto,
  LibrarySnapshotDto,
  LibrarySnapshotLiteDto,
  ReadImageMetadataRequestDto,
  ReadImageMetadataResponseDto,
  ReadImagePageRequestDto,
  ReadImagePageResponseDto,
  ReadImageSidebarTreeRequestDto,
  ReadImageSidebarTreeResponseDto,
  MediaAccessAuditResponseDto,
  ReadPlaylistResponseDto,
  ListVideoSubtitlesRequestDto,
  ListVideoSubtitlesResponseDto,
  PrepareSubtitleTrackRequestDto,
  PrepareSubtitleTrackResponseDto,
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
  ExternalAuthConnectRequestDto,
  ExternalAuthConnectResponseDto,
  ExternalAuthDisconnectRequestDto,
  ExternalAuthDisconnectResponseDto,
  ExternalAuthStatusRequestDto,
  ExternalAuthStatusResponseDto,
  WriteVideoMetadataRequestDto,
  WriteVideoMetadataResponseDto,
  WriteAudioMetadataRequestDto,
  WriteAudioMetadataResponseDto,
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
  SetImageHiddenRequestDto,
  SetImageHiddenResponseDto,
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
  WritePackageGradeRequestDto,
  WritePackageGradeResponseDto,
  ReadAppStateRequestDto,
  ReadAppStateResponseDto,
  WriteAppStateRequestDto,
  WriteAppStateResponseDto,
  UpdatePerformanceConfigRequestDto,
  UpdatePerformanceConfigResponseDto,
  OpenExternalUrlRequestDto,
  OpenExternalUrlResponseDto,
} from "./contracts/backend";

interface MediaPlayerBackendApi {
  readLibrarySnapshot: () => Promise<LibrarySnapshotDto>;
  readLibrarySnapshotLite?: () => Promise<LibrarySnapshotLiteDto>;
  readImageSidebarTree: (
    request: ReadImageSidebarTreeRequestDto,
  ) => Promise<ReadImageSidebarTreeResponseDto>;
  readImagePage: (
    request: ReadImagePageRequestDto,
  ) => Promise<ReadImagePageResponseDto>;
  readImageMetadata: (
    request: ReadImageMetadataRequestDto,
  ) => Promise<ReadImageMetadataResponseDto>;
  resolveMediaResource: (
    request: ResolveMediaResourceRequestDto,
  ) => Promise<ResolveMediaResourceResponseDto>;
  writePackageGrade: (
    request: WritePackageGradeRequestDto,
  ) => Promise<WritePackageGradeResponseDto>;
  setImageHidden?: (
    request: SetImageHiddenRequestDto,
  ) => Promise<SetImageHiddenResponseDto>;
  deleteImageItems?: (
    request: DeleteImageItemsRequestDto,
  ) => Promise<DeleteImageItemsResponseDto>;
  deleteSidebarNodes?: (
    request: DeleteSidebarNodesRequestDto,
  ) => Promise<DeleteSidebarNodesResponseDto>;
  moveSidebarNodes?: (
    request: MoveSidebarNodesRequestDto,
  ) => Promise<MoveSidebarNodesResponseDto>;
  renameSidebarNode?: (
    request: RenameSidebarNodeRequestDto,
  ) => Promise<RenameSidebarNodeResponseDto>;
  renameSidebarNodes?: (
    request: RenameSidebarNodesRequestDto,
  ) => Promise<RenameSidebarNodesResponseDto>;
  renameItems?: (
    request: RenameItemsRequestDto,
  ) => Promise<RenameItemsResponseDto>;
  startManageAdReview?: (
    request: StartManageAdReviewRequestDto,
  ) => Promise<StartManageAdReviewResponseDto>;
  readManageAdReviewTask?: (
    request: ReadManageAdReviewTaskRequestDto,
  ) => Promise<ReadManageAdReviewTaskResponseDto>;
  pauseManageAdReviewTask?: (
    request: PauseManageAdReviewTaskRequestDto,
  ) => Promise<PauseManageAdReviewTaskResponseDto>;
  testAdReviewVisionModel?: (
    request: TestAdReviewVisionModelRequestDto,
  ) => Promise<TestAdReviewVisionModelResponseDto>;
  confirmManageAdReviewDelete?: (
    request: ConfirmManageAdReviewDeleteRequestDto,
  ) => Promise<ConfirmManageAdReviewDeleteResponseDto>;
  startManageCoverReview?: (
    request: StartManageCoverReviewRequestDto,
  ) => Promise<StartManageCoverReviewResponseDto>;
  readManageCoverReviewTask?: (
    request: ReadManageCoverReviewTaskRequestDto,
  ) => Promise<ReadManageCoverReviewTaskResponseDto>;
  pauseManageCoverReviewTask?: (
    request: PauseManageCoverReviewTaskRequestDto,
  ) => Promise<PauseManageCoverReviewTaskResponseDto>;
  confirmManageCoverReviewHide?: (
    request: ConfirmManageCoverReviewHideRequestDto,
  ) => Promise<ConfirmManageCoverReviewHideResponseDto>;
  startManageSubtitleCleanup?: (
    request: StartManageSubtitleCleanupRequestDto,
  ) => Promise<StartManageSubtitleCleanupResponseDto>;
  readManageSubtitleCleanupTask?: (
    request: ReadManageSubtitleCleanupTaskRequestDto,
  ) => Promise<ReadManageSubtitleCleanupTaskResponseDto>;
  runManageSubtitleCleanup?: (
    request: RunManageSubtitleCleanupRequestDto,
  ) => Promise<RunManageSubtitleCleanupResponseDto>;
  saveManageSubtitleCleanup?: (
    request: SaveManageSubtitleCleanupRequestDto,
  ) => Promise<SaveManageSubtitleCleanupResponseDto>;
  startImageConvertTask?: (
    request: StartImageConvertTaskRequestDto,
  ) => Promise<StartImageConvertTaskResponseDto>;
  readImageConvertTask?: (
    request: ReadImageConvertTaskRequestDto,
  ) => Promise<ReadImageConvertTaskResponseDto>;
  cancelImageConvertTask?: (
    request: CancelImageConvertTaskRequestDto,
  ) => Promise<CancelImageConvertTaskResponseDto>;
  startAudioTranscodeTask?: (
    request: StartAudioTranscodeTaskRequestDto,
  ) => Promise<StartAudioTranscodeTaskResponseDto>;
  readAudioTranscodeCapabilities?: () => Promise<ReadAudioTranscodeCapabilitiesResponseDto>;
  readAudioTranscodeTask?: (
    request: ReadAudioTranscodeTaskRequestDto,
  ) => Promise<ReadAudioTranscodeTaskResponseDto>;
  cancelAudioTranscodeTask?: (
    request: CancelAudioTranscodeTaskRequestDto,
  ) => Promise<CancelAudioTranscodeTaskResponseDto>;
  startVideoTranscodeTask?: (
    request: StartVideoTranscodeTaskRequestDto,
  ) => Promise<StartVideoTranscodeTaskResponseDto>;
  estimateVideoTranscodeOutputSize?: (
    request: EstimateVideoTranscodeOutputSizeRequestDto,
  ) => Promise<EstimateVideoTranscodeOutputSizeResponseDto>;
  readVideoTranscodeCapabilities?: () => Promise<ReadVideoTranscodeCapabilitiesResponseDto>;
  readVideoTranscodeTask?: (
    request: ReadVideoTranscodeTaskRequestDto,
  ) => Promise<ReadVideoTranscodeTaskResponseDto>;
  cancelVideoTranscodeTask?: (
    request: CancelVideoTranscodeTaskRequestDto,
  ) => Promise<CancelVideoTranscodeTaskResponseDto>;
  writePackageMetadata?: (
    request: WritePackageMetadataRequestDto,
  ) => Promise<WritePackageMetadataResponseDto>;
  writePackageExternalMetadata?: (
    request: WritePackageExternalMetadataRequestDto,
  ) => Promise<WritePackageExternalMetadataResponseDto>;
  searchExternalMetadata?: (
    request: SearchExternalMetadataRequestDto,
  ) => Promise<SearchExternalMetadataResponseDto>;
  externalAuthConnect?: (
    request: ExternalAuthConnectRequestDto,
  ) => Promise<ExternalAuthConnectResponseDto>;
  externalAuthDisconnect?: (
    request: ExternalAuthDisconnectRequestDto,
  ) => Promise<ExternalAuthDisconnectResponseDto>;
  externalAuthStatus?: (
    request: ExternalAuthStatusRequestDto,
  ) => Promise<ExternalAuthStatusResponseDto>;
  writeVideoMetadata?: (
    request: WriteVideoMetadataRequestDto,
  ) => Promise<WriteVideoMetadataResponseDto>;
  writeAudioMetadata?: (
    request: WriteAudioMetadataRequestDto,
  ) => Promise<WriteAudioMetadataResponseDto>;
  saveVideoCover: (
    request: SaveVideoCoverRequestDto,
  ) => Promise<SaveVideoCoverResponseDto>;
  readPlaylist: () => Promise<ReadPlaylistResponseDto>;
  writePlaylist: (
    request: WritePlaylistRequestDto,
  ) => Promise<WritePlaylistResponseDto>;
  listVideoSubtitles?: (
    request: ListVideoSubtitlesRequestDto,
  ) => Promise<ListVideoSubtitlesResponseDto>;
  prepareSubtitleTrack?: (
    request: PrepareSubtitleTrackRequestDto,
  ) => Promise<PrepareSubtitleTrackResponseDto>;
  readAppState?: (
    request: ReadAppStateRequestDto,
  ) => Promise<ReadAppStateResponseDto>;
  writeAppState?: (
    request: WriteAppStateRequestDto,
  ) => Promise<WriteAppStateResponseDto>;
  openExternalUrl?: (
    request: OpenExternalUrlRequestDto,
  ) => Promise<OpenExternalUrlResponseDto>;
  pickImportPaths: (
    request: PickImportPathsRequestDto,
  ) => Promise<PickImportPathsResponseDto>;
  pickFilePath?: (
    request: PickFilePathRequestDto,
  ) => Promise<PickFilePathResponseDto>;
  pickDirectoryPath?: (
    request: PickDirectoryPathRequestDto,
  ) => Promise<PickDirectoryPathResponseDto>;
  readClipboardImportPaths: () => Promise<ReadClipboardImportPathsResponseDto>;
  enqueueImportTask: (
    request: EnqueueImportTaskRequestDto,
  ) => Promise<EnqueueImportTaskResponseDto>;
  readImportTasks: () => Promise<ReadImportTasksResponseDto>;
  retryImportTask: (
    request: RetryImportTaskRequestDto,
  ) => Promise<RetryImportTaskResponseDto>;
  readMediaAccessAudit: () => Promise<MediaAccessAuditResponseDto>;
  readRuntimeCapabilities: () => Promise<ReadRuntimeCapabilitiesResponseDto>;
  readAudioEngineState?: () => Promise<ReadAudioEngineStateResponseDto>;
  readAudioEnginePlaybackStatus?: () => Promise<ReadAudioEnginePlaybackStatusResponseDto>;
  readAudioEngineAnalysisFrame?: () => Promise<ReadAudioEngineAnalysisFrameResponseDto>;
  setAudioEngineMode?: (
    request: SetAudioEngineModeRequestDto,
  ) => Promise<SetAudioEngineModeResponseDto>;
  verifyAudioEngineMpvBin?: (
    request: VerifyAudioEngineMpvBinRequestDto,
  ) => Promise<VerifyAudioEngineMpvBinResponseDto>;
  verifyAudioTranscodeFfmpegBin?: (
    request: VerifyAudioTranscodeFfmpegBinRequestDto,
  ) => Promise<VerifyAudioTranscodeFfmpegBinResponseDto>;
  listAudioOutputDevices?: () => Promise<ListAudioOutputDevicesResponseDto>;
  setAudioOutputDevice?: (
    request: SetAudioOutputDeviceRequestDto,
  ) => Promise<SetAudioOutputDeviceResponseDto>;
  setAudioExclusive?: (
    request: SetAudioExclusiveRequestDto,
  ) => Promise<SetAudioExclusiveResponseDto>;
  setAudioGaplessMode?: (
    request: SetAudioGaplessModeRequestDto,
  ) => Promise<SetAudioGaplessModeResponseDto>;
  setAudioReplayGainMode?: (
    request: SetAudioReplayGainModeRequestDto,
  ) => Promise<SetAudioReplayGainModeResponseDto>;
  audioEngineLoadTrack?: (
    request: AudioEngineLoadTrackRequestDto,
  ) => Promise<AudioEngineActionResponseDto>;
  audioEngineSetPaused?: (
    request: AudioEngineSetPausedRequestDto,
  ) => Promise<AudioEngineActionResponseDto>;
  audioEngineSeekTo?: (
    request: AudioEngineSeekToRequestDto,
  ) => Promise<AudioEngineActionResponseDto>;
  audioEngineSetVolume?: (
    request: AudioEngineSetVolumeRequestDto,
  ) => Promise<AudioEngineActionResponseDto>;
  audioEngineStopPlayback?: () => Promise<AudioEngineActionResponseDto>;
  readSubtitleEngineStatus?: () => Promise<ReadSubtitleEngineStatusResponseDto>;
  listSubtitleRemoteModels?: () => Promise<ListSubtitleRemoteModelsResponseDto>;
  listSubtitleLocalModels?: (
    request: ListSubtitleLocalModelsRequestDto,
  ) => Promise<ListSubtitleLocalModelsResponseDto>;
  startSubtitleModelDownload?: (
    request: StartSubtitleModelDownloadRequestDto,
  ) => Promise<StartSubtitleModelDownloadResponseDto>;
  cancelSubtitleModelDownload?: (
    request: CancelSubtitleModelDownloadRequestDto,
  ) => Promise<CancelSubtitleModelDownloadResponseDto>;
  readSubtitleModelDownloads?: () => Promise<ReadSubtitleModelDownloadsResponseDto>;
  clearSubtitleLocalModel?: (
    request: ClearSubtitleLocalModelRequestDto,
  ) => Promise<ClearSubtitleLocalModelResponseDto>;
  startSubtitleSession?: (
    request: StartSubtitleSessionRequestDto,
  ) => Promise<StartSubtitleSessionResponseDto>;
  stopSubtitleSession?: (
    request: StopSubtitleSessionRequestDto,
  ) => Promise<StopSubtitleSessionResponseDto>;
  resetSubtitleSession?: (
    request: ResetSubtitleSessionRequestDto,
  ) => Promise<ResetSubtitleSessionResponseDto>;
  flushSubtitleSession?: () => Promise<FlushSubtitleSessionResponseDto>;
  pushSubtitleAudio?: (
    request: PushSubtitleAudioRequestDto,
  ) => Promise<PushSubtitleAudioResponseDto>;
  startSubtitlePersistence?: (
    request: StartSubtitlePersistenceRequestDto,
  ) => Promise<StartSubtitlePersistenceResponseDto>;
  appendSubtitlePersistence?: (
    request: AppendSubtitlePersistenceRequestDto,
  ) => Promise<AppendSubtitlePersistenceResponseDto>;
  readSubtitlePersistenceWindow?: (
    request: ReadSubtitlePersistenceWindowRequestDto,
  ) => Promise<ReadSubtitlePersistenceWindowResponseDto>;
  readRuntimeInfo?: () => Promise<ReadRuntimeInfoResponseDto>;
  setRuntimeStoragePaths?: (
    request: SetRuntimeStoragePathsRequestDto,
  ) => Promise<SetRuntimeStoragePathsResponseDto>;
  readArchiveLoadStatus?: () => Promise<ReadArchiveLoadStatusResponseDto>;
  clearDatabase: () => Promise<ClearDatabaseResponseDto>;
  updatePerformanceConfig?: (
    request: UpdatePerformanceConfigRequestDto,
  ) => Promise<UpdatePerformanceConfigResponseDto>;
  onLibraryChanged?: (
    listener: (payload: { reason: string; updated_at_ms: number }) => void,
  ) => () => void;
}

interface MediaPlayerBenchConfigResponse {
  bench: string | null;
  config: unknown;
  read_at_ms: number;
}

interface MediaPlayerBenchPingResponse {
  main_now_ms: number;
}

interface MediaPlayerBenchFinishResponse {
  output_path: string;
}

interface MediaPlayerBenchApi {
  readConfig: () => Promise<MediaPlayerBenchConfigResponse>;
  ping: () => Promise<MediaPlayerBenchPingResponse>;
  finish: (report: unknown) => Promise<MediaPlayerBenchFinishResponse>;
}

interface MediaPlayerPlatformApi {
  getPathForFile: (file: File) => string | null;
}

interface MediaPlayerViewApi {
  setZoomFactor: (value: number) => void;
}

interface MediaPlayerWindowApi {
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  close: () => Promise<void>;
  setFullscreen: (active: boolean) => Promise<void>;
  isMaximized: () => Promise<boolean>;
  isFullscreen: () => Promise<boolean>;
  writeClipboardPng: (pngBytes: Uint8Array) => Promise<boolean>;
  getNativeChromeEnabled: () => Promise<boolean>;
  setNativeChromeEnabled: (enabled: boolean) => Promise<boolean>;
  onMaximizedStateChange: (
    listener: (maximized: boolean) => void,
  ) => () => void;
  onFullscreenStateChange: (listener: (active: boolean) => void) => () => void;
}

declare global {
  interface Window {
    mediaPlayerBackend?: MediaPlayerBackendApi;
    mediaPlayerBench?: MediaPlayerBenchApi;
    mediaPlayerPlatform?: MediaPlayerPlatformApi;
    mediaPlayerView?: MediaPlayerViewApi;
    mediaPlayerWindow?: MediaPlayerWindowApi;
  }
}

export {};
