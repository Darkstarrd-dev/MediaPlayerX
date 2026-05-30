import {
  clearDatabaseResponseSchema,
  enqueueImportTaskResponseSchema,
  librarySnapshotDtoSchema,
  librarySnapshotLiteDtoSchema,
  mediaAccessAuditResponseSchema,
  pickImportPathsResponseSchema,
  pickFilePathResponseSchema,
  pickDirectoryPathResponseSchema,
  readClipboardImportPathsResponseSchema,
  readArchiveLoadStatusResponseSchema,
  readSubtitleEngineStatusResponseSchema,
  listSubtitleRemoteModelsResponseSchema,
  listSubtitleLocalModelsRequestSchema,
  listSubtitleLocalModelsResponseSchema,
  startSubtitleModelDownloadRequestSchema,
  startSubtitleModelDownloadResponseSchema,
  cancelSubtitleModelDownloadRequestSchema,
  cancelSubtitleModelDownloadResponseSchema,
  readSubtitleModelDownloadsResponseSchema,
  clearSubtitleLocalModelRequestSchema,
  clearSubtitleLocalModelResponseSchema,
  startSubtitleSessionRequestSchema,
  startSubtitleSessionResponseSchema,
  stopSubtitleSessionRequestSchema,
  stopSubtitleSessionResponseSchema,
  resetSubtitleSessionRequestSchema,
  resetSubtitleSessionResponseSchema,
  flushSubtitleSessionResponseSchema,
  pushSubtitleAudioRequestSchema,
  pushSubtitleAudioResponseSchema,
  startSubtitlePersistenceRequestSchema,
  startSubtitlePersistenceResponseSchema,
  appendSubtitlePersistenceRequestSchema,
  appendSubtitlePersistenceResponseSchema,
  readSubtitlePersistenceWindowRequestSchema,
  readSubtitlePersistenceWindowResponseSchema,
  readRuntimeCapabilitiesResponseSchema,
  readAudioEngineStateResponseSchema,
  setAudioEngineModeRequestSchema,
  setAudioEngineModeResponseSchema,
  listAudioOutputDevicesResponseSchema,
  setAudioOutputDeviceRequestSchema,
  setAudioOutputDeviceResponseSchema,
  setAudioExclusiveRequestSchema,
  setAudioExclusiveResponseSchema,
  setAudioGaplessModeRequestSchema,
  setAudioGaplessModeResponseSchema,
  setAudioReplayGainModeRequestSchema,
  setAudioReplayGainModeResponseSchema,
  readImportTasksResponseSchema,
  readPlaylistResponseSchema,
  listVideoSubtitlesResponseSchema,
  prepareSubtitleTrackResponseSchema,
  readImageMetadataResponseSchema,
  readImagePageResponseSchema,
  readSourceImagesResponseSchema,
  resolveMediaResourceResponseSchema,
  retryImportTaskResponseSchema,
  saveVideoCoverResponseSchema,
  writePlaylistResponseSchema,
  writePackageMetadataResponseSchema,
  writePackageExternalMetadataResponseSchema,
  searchExternalMetadataResponseSchema,
  writeVideoMetadataResponseSchema,
  writeAudioMetadataResponseSchema,
  writePackageGradeResponseSchema,
  setImageHiddenResponseSchema,
  deleteImageItemsResponseSchema,
  deleteSidebarNodesResponseSchema,
  moveSidebarNodesResponseSchema,
  renameSidebarNodeResponseSchema,
  renameSidebarNodesResponseSchema,
  renameItemsResponseSchema,
  startManageAdReviewResponseSchema,
  readManageAdReviewTaskResponseSchema,
  pauseManageAdReviewTaskResponseSchema,
  testAdReviewVisionModelResponseSchema,
  confirmManageAdReviewDeleteResponseSchema,
  readManageAdReviewKnownHashesResponseSchema,
  importManageAdReviewKnownHashesResponseSchema,
  exportManageAdReviewKnownHashesResponseSchema,
  startManageCoverReviewResponseSchema,
  readManageCoverReviewTaskResponseSchema,
  pauseManageCoverReviewTaskResponseSchema,
  confirmManageCoverReviewHideResponseSchema,
  startManageSubtitleCleanupResponseSchema,
  readManageSubtitleCleanupTaskResponseSchema,
  runManageSubtitleCleanupResponseSchema,
  saveManageSubtitleCleanupResponseSchema,
  startImageConvertTaskResponseSchema,
  readImageConvertTaskResponseSchema,
  cancelImageConvertTaskResponseSchema,
  startAudioTranscodeTaskResponseSchema,
  readAudioTranscodeCapabilitiesResponseSchema,
  readAudioTranscodeTaskResponseSchema,
  cancelAudioTranscodeTaskResponseSchema,
  startVideoTranscodeTaskResponseSchema,
  estimateVideoTranscodeOutputSizeResponseSchema,
  readVideoTranscodeCapabilitiesResponseSchema,
  readVideoTranscodeTaskResponseSchema,
  cancelVideoTranscodeTaskResponseSchema,
  readAppStateResponseSchema,
  writeAppStateResponseSchema,
  updatePerformanceConfigResponseSchema,
  type EnqueueImportTaskRequestDto,
  type EnqueueImportTaskResponseDto,
  type ClearDatabaseResponseDto,
  type PickImportPathsRequestDto,
  type PickImportPathsResponseDto,
  type PickFilePathRequestDto,
  type PickFilePathResponseDto,
  type PickDirectoryPathRequestDto,
  type PickDirectoryPathResponseDto,
  type ReadClipboardImportPathsResponseDto,
  type ReadArchiveLoadStatusResponseDto,
  type ReadSubtitleEngineStatusResponseDto,
  type ListSubtitleRemoteModelsResponseDto,
  type ListSubtitleLocalModelsRequestDto,
  type ListSubtitleLocalModelsResponseDto,
  type StartSubtitleModelDownloadRequestDto,
  type StartSubtitleModelDownloadResponseDto,
  type CancelSubtitleModelDownloadRequestDto,
  type CancelSubtitleModelDownloadResponseDto,
  type ReadSubtitleModelDownloadsResponseDto,
  type ClearSubtitleLocalModelRequestDto,
  type ClearSubtitleLocalModelResponseDto,
  type StartSubtitleSessionRequestDto,
  type StartSubtitleSessionResponseDto,
  type StopSubtitleSessionRequestDto,
  type StopSubtitleSessionResponseDto,
  type ResetSubtitleSessionRequestDto,
  type ResetSubtitleSessionResponseDto,
  type FlushSubtitleSessionResponseDto,
  type PushSubtitleAudioRequestDto,
  type PushSubtitleAudioResponseDto,
  type StartSubtitlePersistenceRequestDto,
  type StartSubtitlePersistenceResponseDto,
  type AppendSubtitlePersistenceRequestDto,
  type AppendSubtitlePersistenceResponseDto,
  type ReadSubtitlePersistenceWindowRequestDto,
  type ReadSubtitlePersistenceWindowResponseDto,
  type ReadRuntimeCapabilitiesResponseDto,
  type ReadAudioEngineStateResponseDto,
  type SetAudioEngineModeRequestDto,
  type SetAudioEngineModeResponseDto,
  type ListAudioOutputDevicesResponseDto,
  type SetAudioOutputDeviceRequestDto,
  type SetAudioOutputDeviceResponseDto,
  type SetAudioExclusiveRequestDto,
  type SetAudioExclusiveResponseDto,
  type SetAudioGaplessModeRequestDto,
  type SetAudioGaplessModeResponseDto,
  type SetAudioReplayGainModeRequestDto,
  type SetAudioReplayGainModeResponseDto,
  type MediaAccessAuditResponseDto,
  type LibrarySnapshotDto,
  type LibrarySnapshotLiteDto,
  type ReadImportTasksResponseDto,
  type ReadImageMetadataRequestDto,
  type ReadImageMetadataResponseDto,
  type ReadPlaylistResponseDto,
  type ListVideoSubtitlesRequestDto,
  type ListVideoSubtitlesResponseDto,
  type PrepareSubtitleTrackRequestDto,
  type PrepareSubtitleTrackResponseDto,
  type ReadImagePageRequestDto,
  type ReadImagePageResponseDto,
  type ReadSourceImagesRequestDto,
  type ReadSourceImagesResponseDto,
  type ReadImageSidebarTreeRequestDto,
  type ReadImageSidebarTreeResponseDto,
  type ResolveMediaResourceRequestDto,
  type ResolveMediaResourceResponseDto,
  type RetryImportTaskRequestDto,
  type RetryImportTaskResponseDto,
  type SaveVideoCoverRequestDto,
  type SaveVideoCoverResponseDto,
  type WritePlaylistRequestDto,
  type WritePlaylistResponseDto,
  type WritePackageMetadataRequestDto,
  type WritePackageMetadataResponseDto,
  type WritePackageExternalMetadataRequestDto,
  type WritePackageExternalMetadataResponseDto,
  type SearchExternalMetadataRequestDto,
  type SearchExternalMetadataResponseDto,
  type WriteVideoMetadataRequestDto,
  type WriteVideoMetadataResponseDto,
  type WriteAudioMetadataRequestDto,
  type WriteAudioMetadataResponseDto,
  type SetImageHiddenRequestDto,
  type SetImageHiddenResponseDto,
  type DeleteImageItemsRequestDto,
  type DeleteImageItemsResponseDto,
  type DeleteSidebarNodesRequestDto,
  type DeleteSidebarNodesResponseDto,
  type MoveSidebarNodesRequestDto,
  type MoveSidebarNodesResponseDto,
  type RenameSidebarNodeRequestDto,
  type RenameSidebarNodeResponseDto,
  type RenameSidebarNodesRequestDto,
  type RenameSidebarNodesResponseDto,
  type RenameItemsRequestDto,
  type RenameItemsResponseDto,
  type StartManageAdReviewRequestDto,
  type StartManageAdReviewResponseDto,
  type ReadManageAdReviewTaskRequestDto,
  type ReadManageAdReviewTaskResponseDto,
  type PauseManageAdReviewTaskRequestDto,
  type PauseManageAdReviewTaskResponseDto,
  type TestAdReviewVisionModelRequestDto,
  type TestAdReviewVisionModelResponseDto,
  type ConfirmManageAdReviewDeleteRequestDto,
  type ConfirmManageAdReviewDeleteResponseDto,
  type ReadManageAdReviewKnownHashesResponseDto,
  type ImportManageAdReviewKnownHashesRequestDto,
  type ImportManageAdReviewKnownHashesResponseDto,
  type ExportManageAdReviewKnownHashesRequestDto,
  type ExportManageAdReviewKnownHashesResponseDto,
  type StartManageCoverReviewRequestDto,
  type StartManageCoverReviewResponseDto,
  type ReadManageCoverReviewTaskRequestDto,
  type ReadManageCoverReviewTaskResponseDto,
  type PauseManageCoverReviewTaskRequestDto,
  type PauseManageCoverReviewTaskResponseDto,
  type ConfirmManageCoverReviewHideRequestDto,
  type ConfirmManageCoverReviewHideResponseDto,
  type StartManageSubtitleCleanupRequestDto,
  type StartManageSubtitleCleanupResponseDto,
  type ReadManageSubtitleCleanupTaskRequestDto,
  type ReadManageSubtitleCleanupTaskResponseDto,
  type RunManageSubtitleCleanupRequestDto,
  type RunManageSubtitleCleanupResponseDto,
  type SaveManageSubtitleCleanupRequestDto,
  type SaveManageSubtitleCleanupResponseDto,
  type StartImageConvertTaskRequestDto,
  type StartImageConvertTaskResponseDto,
  type ReadImageConvertTaskRequestDto,
  type ReadImageConvertTaskResponseDto,
  type CancelImageConvertTaskRequestDto,
  type CancelImageConvertTaskResponseDto,
  type StartAudioTranscodeTaskRequestDto,
  type StartAudioTranscodeTaskResponseDto,
  type ReadAudioTranscodeCapabilitiesResponseDto,
  type ReadAudioTranscodeTaskRequestDto,
  type ReadAudioTranscodeTaskResponseDto,
  type CancelAudioTranscodeTaskRequestDto,
  type CancelAudioTranscodeTaskResponseDto,
  type StartVideoTranscodeTaskRequestDto,
  type StartVideoTranscodeTaskResponseDto,
  type EstimateVideoTranscodeOutputSizeRequestDto,
  type EstimateVideoTranscodeOutputSizeResponseDto,
  type ReadVideoTranscodeCapabilitiesResponseDto,
  type ReadVideoTranscodeTaskRequestDto,
  type ReadVideoTranscodeTaskResponseDto,
  type CancelVideoTranscodeTaskRequestDto,
  type CancelVideoTranscodeTaskResponseDto,
  type WritePackageGradeRequestDto,
  type WritePackageGradeResponseDto,
  type ReadAppStateRequestDto,
  type ReadAppStateResponseDto,
  type WriteAppStateRequestDto,
  type WriteAppStateResponseDto,
  type UpdatePerformanceConfigRequestDto,
  type UpdatePerformanceConfigResponseDto,
} from "../../../contracts/backend";
import type { MediaRepository, RepositoryRequestOptions } from "./types";
import { requireBackend, requireBackendMethod } from "./backendChannel";
import { withIpcTiming } from "./repositoryIpcTiming";
import { withAbort } from "./requestGuards";

export class RealMediaRepository implements MediaRepository {
  getInitialLibrarySnapshot(): LibrarySnapshotDto | null {
    return null;
  }

  onLibraryChanged(
    listener: (payload: { reason: string; updated_at_ms: number }) => void,
  ): () => void {
    const api = window.mediaPlayerBackend;
    if (!api?.onLibraryChanged) {
      return () => undefined;
    }

    return api.onLibraryChanged(listener);
  }

  async readLibrarySnapshot(
    options?: RepositoryRequestOptions,
  ): Promise<LibrarySnapshotDto> {
    const api = requireBackend();
    return withIpcTiming("readLibrarySnapshot", async () => {
      const response = await withAbort(api.readLibrarySnapshot(), options);
      return librarySnapshotDtoSchema.parse(response);
    });
  }

  async readLibrarySnapshotLite(
    options?: RepositoryRequestOptions,
  ): Promise<LibrarySnapshotLiteDto> {
    const readLibrarySnapshotLite = requireBackendMethod(
      "readLibrarySnapshotLite",
    );
    return withIpcTiming("readLibrarySnapshotLite", async () => {
      const response = await withAbort(readLibrarySnapshotLite(), options);
      return librarySnapshotLiteDtoSchema.parse(response);
    });
  }

  async readImageSidebarTree(
    request: ReadImageSidebarTreeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadImageSidebarTreeResponseDto> {
    const api = requireBackend();
    return withIpcTiming("readImageSidebarTree", async () => {
      const response = await withAbort(
        api.readImageSidebarTree(request),
        options,
      );
      return response;
    });
  }

  async readImagePage(
    request: ReadImagePageRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadImagePageResponseDto> {
    const api = requireBackend();
    return withIpcTiming("readImagePage", async () => {
      const response = await withAbort(api.readImagePage(request), options);
      return readImagePageResponseSchema.parse(response);
    });
  }

  async readSourceImages(
    request: ReadSourceImagesRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadSourceImagesResponseDto> {
    const readSourceImages = requireBackendMethod("readSourceImages");
    return withIpcTiming("readSourceImages", async () => {
      const response = await withAbort(readSourceImages(request), options);
      return readSourceImagesResponseSchema.parse(response);
    });
  }

  async readImageMetadata(
    request: ReadImageMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadImageMetadataResponseDto> {
    const api = requireBackend();
    return withIpcTiming("readImageMetadata", async () => {
      const response = await withAbort(api.readImageMetadata(request), options);
      return readImageMetadataResponseSchema.parse(response);
    });
  }

  async resolveMediaResource(
    request: ResolveMediaResourceRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ResolveMediaResourceResponseDto> {
    const api = requireBackend();
    return withIpcTiming("resolveMediaResource", async () => {
      const response = await withAbort(
        api.resolveMediaResource(request),
        options,
      );
      return resolveMediaResourceResponseSchema.parse(response);
    });
  }

  async writePackageGrade(
    request: WritePackageGradeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePackageGradeResponseDto> {
    const api = requireBackend();

    const response = await withAbort(api.writePackageGrade(request), options);
    return writePackageGradeResponseSchema.parse(response);
  }

  async setImageHidden(
    request: SetImageHiddenRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SetImageHiddenResponseDto> {
    const setImageHidden = requireBackendMethod("setImageHidden");

    const response = await withAbort(setImageHidden(request), options);
    return setImageHiddenResponseSchema.parse(response);
  }

  async deleteImageItems(
    request: DeleteImageItemsRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<DeleteImageItemsResponseDto> {
    const deleteImageItems = requireBackendMethod("deleteImageItems");

    const response = await withAbort(deleteImageItems(request), options);
    return deleteImageItemsResponseSchema.parse(response);
  }

  async deleteSidebarNodes(
    request: DeleteSidebarNodesRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<DeleteSidebarNodesResponseDto> {
    const deleteSidebarNodes = requireBackendMethod("deleteSidebarNodes");

    const response = await withAbort(deleteSidebarNodes(request), options);
    return deleteSidebarNodesResponseSchema.parse(response);
  }

  async moveSidebarNodes(
    request: MoveSidebarNodesRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<MoveSidebarNodesResponseDto> {
    const moveSidebarNodes = requireBackendMethod("moveSidebarNodes");

    const response = await withAbort(moveSidebarNodes(request), options);
    return moveSidebarNodesResponseSchema.parse(response);
  }

  async renameSidebarNode(
    request: RenameSidebarNodeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<RenameSidebarNodeResponseDto> {
    const renameSidebarNode = requireBackendMethod("renameSidebarNode");

    const response = await withAbort(renameSidebarNode(request), options);
    return renameSidebarNodeResponseSchema.parse(response);
  }

  async renameSidebarNodes(
    request: RenameSidebarNodesRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<RenameSidebarNodesResponseDto> {
    const renameSidebarNodes = requireBackendMethod("renameSidebarNodes");

    const response = await withAbort(renameSidebarNodes(request), options);
    return renameSidebarNodesResponseSchema.parse(response);
  }

  async renameItems(
    request: RenameItemsRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<RenameItemsResponseDto> {
    const renameItems = requireBackendMethod("renameItems");

    const response = await withAbort(renameItems(request), options);
    return renameItemsResponseSchema.parse(response);
  }

  async startManageAdReview(
    request: StartManageAdReviewRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StartManageAdReviewResponseDto> {
    const startManageAdReview = requireBackendMethod("startManageAdReview");

    const response = await withAbort(startManageAdReview(request), options);
    return startManageAdReviewResponseSchema.parse(response);
  }

  async readManageAdReviewTask(
    request: ReadManageAdReviewTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadManageAdReviewTaskResponseDto> {
    const readManageAdReviewTask = requireBackendMethod(
      "readManageAdReviewTask",
    );

    const response = await withAbort(readManageAdReviewTask(request), options);
    return readManageAdReviewTaskResponseSchema.parse(response);
  }

  async pauseManageAdReviewTask(
    request: PauseManageAdReviewTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PauseManageAdReviewTaskResponseDto> {
    const pauseManageAdReviewTask = requireBackendMethod(
      "pauseManageAdReviewTask",
    );

    const response = await withAbort(pauseManageAdReviewTask(request), options);
    return pauseManageAdReviewTaskResponseSchema.parse(response);
  }

  async testAdReviewVisionModel(
    request: TestAdReviewVisionModelRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<TestAdReviewVisionModelResponseDto> {
    const testAdReviewVisionModel = requireBackendMethod(
      "testAdReviewVisionModel",
    );

    const response = await withAbort(testAdReviewVisionModel(request), options);
    return testAdReviewVisionModelResponseSchema.parse(response);
  }

  async confirmManageAdReviewDelete(
    request: ConfirmManageAdReviewDeleteRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ConfirmManageAdReviewDeleteResponseDto> {
    const confirmManageAdReviewDelete = requireBackendMethod(
      "confirmManageAdReviewDelete",
    );

    const response = await withAbort(
      confirmManageAdReviewDelete(request),
      options,
    );
    return confirmManageAdReviewDeleteResponseSchema.parse(response);
  }

  async readManageAdReviewKnownHashes(
    options?: RepositoryRequestOptions,
  ): Promise<ReadManageAdReviewKnownHashesResponseDto> {
    const readManageAdReviewKnownHashes = requireBackendMethod(
      "readManageAdReviewKnownHashes",
    );

    const response = await withAbort(readManageAdReviewKnownHashes(), options);
    return readManageAdReviewKnownHashesResponseSchema.parse(response);
  }

  async importManageAdReviewKnownHashes(
    request: ImportManageAdReviewKnownHashesRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ImportManageAdReviewKnownHashesResponseDto> {
    const importManageAdReviewKnownHashes = requireBackendMethod(
      "importManageAdReviewKnownHashes",
    );

    const response = await withAbort(
      importManageAdReviewKnownHashes(request),
      options,
    );
    return importManageAdReviewKnownHashesResponseSchema.parse(response);
  }

  async exportManageAdReviewKnownHashes(
    request: ExportManageAdReviewKnownHashesRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ExportManageAdReviewKnownHashesResponseDto> {
    const exportManageAdReviewKnownHashes = requireBackendMethod(
      "exportManageAdReviewKnownHashes",
    );

    const response = await withAbort(
      exportManageAdReviewKnownHashes(request),
      options,
    );
    return exportManageAdReviewKnownHashesResponseSchema.parse(response);
  }

  async startManageCoverReview(
    request: StartManageCoverReviewRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StartManageCoverReviewResponseDto> {
    const startManageCoverReview = requireBackendMethod(
      "startManageCoverReview",
    );

    const response = await withAbort(startManageCoverReview(request), options);
    return startManageCoverReviewResponseSchema.parse(response);
  }

  async readManageCoverReviewTask(
    request: ReadManageCoverReviewTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadManageCoverReviewTaskResponseDto> {
    const readManageCoverReviewTask = requireBackendMethod(
      "readManageCoverReviewTask",
    );

    const response = await withAbort(
      readManageCoverReviewTask(request),
      options,
    );
    return readManageCoverReviewTaskResponseSchema.parse(response);
  }

  async pauseManageCoverReviewTask(
    request: PauseManageCoverReviewTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PauseManageCoverReviewTaskResponseDto> {
    const pauseManageCoverReviewTask = requireBackendMethod(
      "pauseManageCoverReviewTask",
    );

    const response = await withAbort(
      pauseManageCoverReviewTask(request),
      options,
    );
    return pauseManageCoverReviewTaskResponseSchema.parse(response);
  }

  async confirmManageCoverReviewHide(
    request: ConfirmManageCoverReviewHideRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ConfirmManageCoverReviewHideResponseDto> {
    const confirmManageCoverReviewHide = requireBackendMethod(
      "confirmManageCoverReviewHide",
    );

    const response = await withAbort(
      confirmManageCoverReviewHide(request),
      options,
    );
    return confirmManageCoverReviewHideResponseSchema.parse(response);
  }

  async startManageSubtitleCleanup(
    request: StartManageSubtitleCleanupRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StartManageSubtitleCleanupResponseDto> {
    const startManageSubtitleCleanup = requireBackendMethod(
      "startManageSubtitleCleanup",
    );

    const response = await withAbort(
      startManageSubtitleCleanup(request),
      options,
    );
    return startManageSubtitleCleanupResponseSchema.parse(response);
  }

  async readManageSubtitleCleanupTask(
    request: ReadManageSubtitleCleanupTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadManageSubtitleCleanupTaskResponseDto> {
    const readManageSubtitleCleanupTask = requireBackendMethod(
      "readManageSubtitleCleanupTask",
    );

    const response = await withAbort(
      readManageSubtitleCleanupTask(request),
      options,
    );
    return readManageSubtitleCleanupTaskResponseSchema.parse(response);
  }

  async runManageSubtitleCleanup(
    request: RunManageSubtitleCleanupRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<RunManageSubtitleCleanupResponseDto> {
    const runManageSubtitleCleanup = requireBackendMethod(
      "runManageSubtitleCleanup",
    );

    const response = await withAbort(
      runManageSubtitleCleanup(request),
      options,
    );
    return runManageSubtitleCleanupResponseSchema.parse(response);
  }

  async saveManageSubtitleCleanup(
    request: SaveManageSubtitleCleanupRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SaveManageSubtitleCleanupResponseDto> {
    const saveManageSubtitleCleanup = requireBackendMethod(
      "saveManageSubtitleCleanup",
    );

    const response = await withAbort(
      saveManageSubtitleCleanup(request),
      options,
    );
    return saveManageSubtitleCleanupResponseSchema.parse(response);
  }

  async startImageConvertTask(
    request: StartImageConvertTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StartImageConvertTaskResponseDto> {
    const startImageConvertTask = requireBackendMethod("startImageConvertTask");

    const response = await withAbort(startImageConvertTask(request), options);
    return startImageConvertTaskResponseSchema.parse(response);
  }

  async readImageConvertTask(
    request: ReadImageConvertTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadImageConvertTaskResponseDto> {
    const readImageConvertTask = requireBackendMethod("readImageConvertTask");

    const response = await withAbort(readImageConvertTask(request), options);
    return readImageConvertTaskResponseSchema.parse(response);
  }

  async cancelImageConvertTask(
    request: CancelImageConvertTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<CancelImageConvertTaskResponseDto> {
    const cancelImageConvertTask = requireBackendMethod(
      "cancelImageConvertTask",
    );

    const response = await withAbort(cancelImageConvertTask(request), options);
    return cancelImageConvertTaskResponseSchema.parse(response);
  }

  async startAudioTranscodeTask(
    request: StartAudioTranscodeTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StartAudioTranscodeTaskResponseDto> {
    const startAudioTranscodeTask = requireBackendMethod(
      "startAudioTranscodeTask",
    );

    const response = await withAbort(startAudioTranscodeTask(request), options);
    return startAudioTranscodeTaskResponseSchema.parse(response);
  }

  async readAudioTranscodeCapabilities(
    options?: RepositoryRequestOptions,
  ): Promise<ReadAudioTranscodeCapabilitiesResponseDto> {
    const readAudioTranscodeCapabilities = requireBackendMethod(
      "readAudioTranscodeCapabilities",
    );

    const response = await withAbort(readAudioTranscodeCapabilities(), options);
    return readAudioTranscodeCapabilitiesResponseSchema.parse(response);
  }

  async readAudioTranscodeTask(
    request: ReadAudioTranscodeTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadAudioTranscodeTaskResponseDto> {
    const readAudioTranscodeTask = requireBackendMethod(
      "readAudioTranscodeTask",
    );

    const response = await withAbort(readAudioTranscodeTask(request), options);
    return readAudioTranscodeTaskResponseSchema.parse(response);
  }

  async cancelAudioTranscodeTask(
    request: CancelAudioTranscodeTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<CancelAudioTranscodeTaskResponseDto> {
    const cancelAudioTranscodeTask = requireBackendMethod(
      "cancelAudioTranscodeTask",
    );

    const response = await withAbort(
      cancelAudioTranscodeTask(request),
      options,
    );
    return cancelAudioTranscodeTaskResponseSchema.parse(response);
  }

  async startVideoTranscodeTask(
    request: StartVideoTranscodeTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StartVideoTranscodeTaskResponseDto> {
    const startVideoTranscodeTask = requireBackendMethod(
      "startVideoTranscodeTask",
    );

    const response = await withAbort(startVideoTranscodeTask(request), options);
    return startVideoTranscodeTaskResponseSchema.parse(response);
  }

  async estimateVideoTranscodeOutputSize(
    request: EstimateVideoTranscodeOutputSizeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<EstimateVideoTranscodeOutputSizeResponseDto> {
    const estimateVideoTranscodeOutputSize = requireBackendMethod(
      "estimateVideoTranscodeOutputSize",
    );

    const response = await withAbort(
      estimateVideoTranscodeOutputSize(request),
      options,
    );
    return estimateVideoTranscodeOutputSizeResponseSchema.parse(response);
  }

  async readVideoTranscodeCapabilities(
    options?: RepositoryRequestOptions,
  ): Promise<ReadVideoTranscodeCapabilitiesResponseDto> {
    const readVideoTranscodeCapabilities = requireBackendMethod(
      "readVideoTranscodeCapabilities",
    );

    const response = await withAbort(readVideoTranscodeCapabilities(), options);
    return readVideoTranscodeCapabilitiesResponseSchema.parse(response);
  }

  async readVideoTranscodeTask(
    request: ReadVideoTranscodeTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadVideoTranscodeTaskResponseDto> {
    const readVideoTranscodeTask = requireBackendMethod(
      "readVideoTranscodeTask",
    );

    const response = await withAbort(readVideoTranscodeTask(request), options);
    return readVideoTranscodeTaskResponseSchema.parse(response);
  }

  async cancelVideoTranscodeTask(
    request: CancelVideoTranscodeTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<CancelVideoTranscodeTaskResponseDto> {
    const cancelVideoTranscodeTask = requireBackendMethod(
      "cancelVideoTranscodeTask",
    );

    const response = await withAbort(
      cancelVideoTranscodeTask(request),
      options,
    );
    return cancelVideoTranscodeTaskResponseSchema.parse(response);
  }

  async writePackageMetadata(
    request: WritePackageMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePackageMetadataResponseDto> {
    const writePackageMetadata = requireBackendMethod("writePackageMetadata");

    const response = await withAbort(writePackageMetadata(request), options);
    return writePackageMetadataResponseSchema.parse(response);
  }

  async writePackageExternalMetadata(
    request: WritePackageExternalMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePackageExternalMetadataResponseDto> {
    const writePackageExternalMetadata = requireBackendMethod(
      "writePackageExternalMetadata",
    );

    const response = await withAbort(
      writePackageExternalMetadata(request),
      options,
    );
    return writePackageExternalMetadataResponseSchema.parse(response);
  }

  async searchExternalMetadata(
    request: SearchExternalMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SearchExternalMetadataResponseDto> {
    const searchExternalMetadata = requireBackendMethod(
      "searchExternalMetadata",
    );

    const response = await withAbort(searchExternalMetadata(request), options);
    return searchExternalMetadataResponseSchema.parse(response);
  }

  async writeVideoMetadata(
    request: WriteVideoMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WriteVideoMetadataResponseDto> {
    const writeVideoMetadata = requireBackendMethod("writeVideoMetadata");

    const response = await withAbort(writeVideoMetadata(request), options);
    return writeVideoMetadataResponseSchema.parse(response);
  }

  async writeAudioMetadata(
    request: WriteAudioMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WriteAudioMetadataResponseDto> {
    const writeAudioMetadata = requireBackendMethod("writeAudioMetadata");

    const response = await withAbort(writeAudioMetadata(request), options);
    return writeAudioMetadataResponseSchema.parse(response);
  }

  async saveVideoCover(
    request: SaveVideoCoverRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SaveVideoCoverResponseDto> {
    const api = requireBackend();

    const response = await withAbort(api.saveVideoCover(request), options);
    return saveVideoCoverResponseSchema.parse(response);
  }

  async readPlaylist(
    options?: RepositoryRequestOptions,
  ): Promise<ReadPlaylistResponseDto> {
    const api = requireBackend();

    const response = await withAbort(api.readPlaylist(), options);
    return readPlaylistResponseSchema.parse(response);
  }

  async writePlaylist(
    request: WritePlaylistRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePlaylistResponseDto> {
    const api = requireBackend();

    const response = await withAbort(api.writePlaylist(request), options);
    return writePlaylistResponseSchema.parse(response);
  }

  async listVideoSubtitles(
    request: ListVideoSubtitlesRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ListVideoSubtitlesResponseDto> {
    const listVideoSubtitles = requireBackendMethod("listVideoSubtitles");

    const response = await withAbort(listVideoSubtitles(request), options);
    return listVideoSubtitlesResponseSchema.parse(response);
  }

  async prepareSubtitleTrack(
    request: PrepareSubtitleTrackRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PrepareSubtitleTrackResponseDto> {
    const prepareSubtitleTrack = requireBackendMethod("prepareSubtitleTrack");

    const response = await withAbort(prepareSubtitleTrack(request), options);
    return prepareSubtitleTrackResponseSchema.parse(response);
  }

  async pickImportPaths(
    request: PickImportPathsRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PickImportPathsResponseDto> {
    const api = requireBackend();

    const response = await withAbort(api.pickImportPaths(request), options);
    return pickImportPathsResponseSchema.parse(response);
  }

  async pickFilePath(
    request: PickFilePathRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PickFilePathResponseDto> {
    const pickFilePath = requireBackendMethod("pickFilePath");

    const response = await withAbort(pickFilePath(request), options);
    return pickFilePathResponseSchema.parse(response);
  }

  async pickDirectoryPath(
    request: PickDirectoryPathRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PickDirectoryPathResponseDto> {
    const pickDirectoryPath = requireBackendMethod("pickDirectoryPath");

    const response = await withAbort(pickDirectoryPath(request), options);
    return pickDirectoryPathResponseSchema.parse(response);
  }

  async readClipboardImportPaths(
    options?: RepositoryRequestOptions,
  ): Promise<ReadClipboardImportPathsResponseDto> {
    const api = requireBackend();

    const response = await withAbort(api.readClipboardImportPaths(), options);
    return readClipboardImportPathsResponseSchema.parse(response);
  }

  async enqueueImportTask(
    request: EnqueueImportTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<EnqueueImportTaskResponseDto> {
    const api = requireBackend();
    return withIpcTiming("enqueueImportTask", async () => {
      const response = await withAbort(api.enqueueImportTask(request), options);
      return enqueueImportTaskResponseSchema.parse(response);
    });
  }

  async readImportTasks(
    options?: RepositoryRequestOptions,
  ): Promise<ReadImportTasksResponseDto> {
    const api = requireBackend();
    return withIpcTiming("readImportTasks", async () => {
      const response = await withAbort(api.readImportTasks(), options);
      return readImportTasksResponseSchema.parse(response);
    });
  }

  async retryImportTask(
    request: RetryImportTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<RetryImportTaskResponseDto> {
    const api = requireBackend();

    const response = await withAbort(api.retryImportTask(request), options);
    return retryImportTaskResponseSchema.parse(response);
  }

  async readMediaAccessAudit(
    options?: RepositoryRequestOptions,
  ): Promise<MediaAccessAuditResponseDto> {
    const api = requireBackend();

    const response = await withAbort(api.readMediaAccessAudit(), options);
    return mediaAccessAuditResponseSchema.parse(response);
  }

  async readRuntimeCapabilities(
    options?: RepositoryRequestOptions,
  ): Promise<ReadRuntimeCapabilitiesResponseDto> {
    const api = requireBackend();

    const response = await withAbort(api.readRuntimeCapabilities(), options);
    return readRuntimeCapabilitiesResponseSchema.parse(response);
  }

  async readAudioEngineState(
    options?: RepositoryRequestOptions,
  ): Promise<ReadAudioEngineStateResponseDto> {
    const readAudioEngineState = requireBackendMethod("readAudioEngineState");

    const response = await withAbort(readAudioEngineState(), options);
    return readAudioEngineStateResponseSchema.parse(response);
  }

  async setAudioEngineMode(
    request: SetAudioEngineModeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SetAudioEngineModeResponseDto> {
    const setAudioEngineMode = requireBackendMethod("setAudioEngineMode");
    const parsedRequest = setAudioEngineModeRequestSchema.parse(request);

    const response = await withAbort(
      setAudioEngineMode(parsedRequest),
      options,
    );
    return setAudioEngineModeResponseSchema.parse(response);
  }

  async listAudioOutputDevices(
    options?: RepositoryRequestOptions,
  ): Promise<ListAudioOutputDevicesResponseDto> {
    const listAudioOutputDevices = requireBackendMethod(
      "listAudioOutputDevices",
    );

    const response = await withAbort(listAudioOutputDevices(), options);
    return listAudioOutputDevicesResponseSchema.parse(response);
  }

  async setAudioOutputDevice(
    request: SetAudioOutputDeviceRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SetAudioOutputDeviceResponseDto> {
    const setAudioOutputDevice = requireBackendMethod("setAudioOutputDevice");
    const parsedRequest = setAudioOutputDeviceRequestSchema.parse(request);

    const response = await withAbort(
      setAudioOutputDevice(parsedRequest),
      options,
    );
    return setAudioOutputDeviceResponseSchema.parse(response);
  }

  async setAudioExclusive(
    request: SetAudioExclusiveRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SetAudioExclusiveResponseDto> {
    const setAudioExclusive = requireBackendMethod("setAudioExclusive");
    const parsedRequest = setAudioExclusiveRequestSchema.parse(request);

    const response = await withAbort(setAudioExclusive(parsedRequest), options);
    return setAudioExclusiveResponseSchema.parse(response);
  }

  async setAudioGaplessMode(
    request: SetAudioGaplessModeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SetAudioGaplessModeResponseDto> {
    const setAudioGaplessMode = requireBackendMethod("setAudioGaplessMode");
    const parsedRequest = setAudioGaplessModeRequestSchema.parse(request);

    const response = await withAbort(
      setAudioGaplessMode(parsedRequest),
      options,
    );
    return setAudioGaplessModeResponseSchema.parse(response);
  }

  async setAudioReplayGainMode(
    request: SetAudioReplayGainModeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SetAudioReplayGainModeResponseDto> {
    const setAudioReplayGainMode = requireBackendMethod(
      "setAudioReplayGainMode",
    );
    const parsedRequest = setAudioReplayGainModeRequestSchema.parse(request);

    const response = await withAbort(
      setAudioReplayGainMode(parsedRequest),
      options,
    );
    return setAudioReplayGainModeResponseSchema.parse(response);
  }

  async readSubtitleEngineStatus(
    options?: RepositoryRequestOptions,
  ): Promise<ReadSubtitleEngineStatusResponseDto> {
    const readSubtitleEngineStatus = requireBackendMethod(
      "readSubtitleEngineStatus",
    );

    const response = await withAbort(readSubtitleEngineStatus(), options);
    return readSubtitleEngineStatusResponseSchema.parse(response);
  }

  async listSubtitleRemoteModels(
    options?: RepositoryRequestOptions,
  ): Promise<ListSubtitleRemoteModelsResponseDto> {
    const listSubtitleRemoteModels = requireBackendMethod(
      "listSubtitleRemoteModels",
    );

    const response = await withAbort(listSubtitleRemoteModels(), options);
    return listSubtitleRemoteModelsResponseSchema.parse(response);
  }

  async listSubtitleLocalModels(
    request: ListSubtitleLocalModelsRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ListSubtitleLocalModelsResponseDto> {
    const listSubtitleLocalModels = requireBackendMethod(
      "listSubtitleLocalModels",
    );
    const parsedRequest = listSubtitleLocalModelsRequestSchema.parse(request);

    const response = await withAbort(
      listSubtitleLocalModels(parsedRequest),
      options,
    );
    return listSubtitleLocalModelsResponseSchema.parse(response);
  }

  async startSubtitleModelDownload(
    request: StartSubtitleModelDownloadRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StartSubtitleModelDownloadResponseDto> {
    const startSubtitleModelDownload = requireBackendMethod(
      "startSubtitleModelDownload",
    );
    const parsedRequest =
      startSubtitleModelDownloadRequestSchema.parse(request);

    const response = await withAbort(
      startSubtitleModelDownload(parsedRequest),
      options,
    );
    return startSubtitleModelDownloadResponseSchema.parse(response);
  }

  async cancelSubtitleModelDownload(
    request: CancelSubtitleModelDownloadRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<CancelSubtitleModelDownloadResponseDto> {
    const cancelSubtitleModelDownload = requireBackendMethod(
      "cancelSubtitleModelDownload",
    );
    const parsedRequest =
      cancelSubtitleModelDownloadRequestSchema.parse(request);

    const response = await withAbort(
      cancelSubtitleModelDownload(parsedRequest),
      options,
    );
    return cancelSubtitleModelDownloadResponseSchema.parse(response);
  }

  async readSubtitleModelDownloads(
    options?: RepositoryRequestOptions,
  ): Promise<ReadSubtitleModelDownloadsResponseDto> {
    const readSubtitleModelDownloads = requireBackendMethod(
      "readSubtitleModelDownloads",
    );

    const response = await withAbort(readSubtitleModelDownloads(), options);
    return readSubtitleModelDownloadsResponseSchema.parse(response);
  }

  async clearSubtitleLocalModel(
    request: ClearSubtitleLocalModelRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ClearSubtitleLocalModelResponseDto> {
    const clearSubtitleLocalModel = requireBackendMethod(
      "clearSubtitleLocalModel",
    );
    const parsedRequest = clearSubtitleLocalModelRequestSchema.parse(request);

    const response = await withAbort(
      clearSubtitleLocalModel(parsedRequest),
      options,
    );
    return clearSubtitleLocalModelResponseSchema.parse(response);
  }

  async startSubtitleSession(
    request: StartSubtitleSessionRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StartSubtitleSessionResponseDto> {
    const startSubtitleSession = requireBackendMethod("startSubtitleSession");
    const parsedRequest = startSubtitleSessionRequestSchema.parse(request);

    const response = await withAbort(
      startSubtitleSession(parsedRequest),
      options,
    );
    return startSubtitleSessionResponseSchema.parse(response);
  }

  async stopSubtitleSession(
    request: StopSubtitleSessionRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StopSubtitleSessionResponseDto> {
    const stopSubtitleSession = requireBackendMethod("stopSubtitleSession");
    const parsedRequest = stopSubtitleSessionRequestSchema.parse(request);

    const response = await withAbort(
      stopSubtitleSession(parsedRequest),
      options,
    );
    return stopSubtitleSessionResponseSchema.parse(response);
  }

  async resetSubtitleSession(
    request: ResetSubtitleSessionRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ResetSubtitleSessionResponseDto> {
    const resetSubtitleSession = requireBackendMethod("resetSubtitleSession");
    const parsedRequest = resetSubtitleSessionRequestSchema.parse(request);

    const response = await withAbort(
      resetSubtitleSession(parsedRequest),
      options,
    );
    return resetSubtitleSessionResponseSchema.parse(response);
  }

  async flushSubtitleSession(
    options?: RepositoryRequestOptions,
  ): Promise<FlushSubtitleSessionResponseDto> {
    const flushSubtitleSession = requireBackendMethod("flushSubtitleSession");

    const response = await withAbort(flushSubtitleSession(), options);
    return flushSubtitleSessionResponseSchema.parse(response);
  }

  async pushSubtitleAudio(
    request: PushSubtitleAudioRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PushSubtitleAudioResponseDto> {
    const pushSubtitleAudio = requireBackendMethod("pushSubtitleAudio");
    const parsedRequest = pushSubtitleAudioRequestSchema.parse(request);

    const response = await withAbort(pushSubtitleAudio(parsedRequest), options);
    return pushSubtitleAudioResponseSchema.parse(response);
  }

  async startSubtitlePersistence(
    request: StartSubtitlePersistenceRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StartSubtitlePersistenceResponseDto> {
    const startSubtitlePersistence = requireBackendMethod(
      "startSubtitlePersistence",
    );
    const parsedRequest = startSubtitlePersistenceRequestSchema.parse(request);

    const response = await withAbort(
      startSubtitlePersistence(parsedRequest),
      options,
    );
    return startSubtitlePersistenceResponseSchema.parse(response);
  }

  async appendSubtitlePersistence(
    request: AppendSubtitlePersistenceRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<AppendSubtitlePersistenceResponseDto> {
    const appendSubtitlePersistence = requireBackendMethod(
      "appendSubtitlePersistence",
    );
    const parsedRequest = appendSubtitlePersistenceRequestSchema.parse(request);

    const response = await withAbort(
      appendSubtitlePersistence(parsedRequest),
      options,
    );
    return appendSubtitlePersistenceResponseSchema.parse(response);
  }

  async readSubtitlePersistenceWindow(
    request: ReadSubtitlePersistenceWindowRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadSubtitlePersistenceWindowResponseDto> {
    const readSubtitlePersistenceWindow = requireBackendMethod(
      "readSubtitlePersistenceWindow",
    );
    const parsedRequest =
      readSubtitlePersistenceWindowRequestSchema.parse(request);

    const response = await withAbort(
      readSubtitlePersistenceWindow(parsedRequest),
      options,
    );
    return readSubtitlePersistenceWindowResponseSchema.parse(response);
  }

  async readArchiveLoadStatus(
    options?: RepositoryRequestOptions,
  ): Promise<ReadArchiveLoadStatusResponseDto> {
    const readArchiveLoadStatus = requireBackendMethod("readArchiveLoadStatus");

    const response = await withAbort(readArchiveLoadStatus(), options);
    return readArchiveLoadStatusResponseSchema.parse(response);
  }

  async readAppState(
    request: ReadAppStateRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadAppStateResponseDto> {
    const readAppState = requireBackendMethod("readAppState");

    const response = await withAbort(readAppState(request), options);
    return readAppStateResponseSchema.parse(response);
  }

  async writeAppState(
    request: WriteAppStateRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WriteAppStateResponseDto> {
    const writeAppState = requireBackendMethod("writeAppState");

    const response = await withAbort(writeAppState(request), options);
    return writeAppStateResponseSchema.parse(response);
  }

  async clearDatabase(
    options?: RepositoryRequestOptions,
  ): Promise<ClearDatabaseResponseDto> {
    const api = requireBackend();

    const response = await withAbort(api.clearDatabase(), options);
    return clearDatabaseResponseSchema.parse(response);
  }

  async updatePerformanceConfig(
    request: UpdatePerformanceConfigRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<UpdatePerformanceConfigResponseDto> {
    const updatePerformanceConfig = requireBackendMethod(
      "updatePerformanceConfig",
    );

    const response = await withAbort(updatePerformanceConfig(request), options);
    return updatePerformanceConfigResponseSchema.parse(response);
  }
}
