import type {
  ClearDatabaseResponseDto,
  ClearVectorDataResponseDto,
  EnqueueImportTaskRequestDto,
  EnqueueImportTaskResponseDto,
  PickImportPathsRequestDto,
  PickImportPathsResponseDto,
  ReadClipboardImportPathsResponseDto,
  ReadArchiveLoadStatusResponseDto,
  ReadRuntimeCapabilitiesResponseDto,
  ReadVectorDataStatusResponseDto,
  DeleteImageItemsRequestDto,
  DeleteImageItemsResponseDto,
  DeleteSidebarNodesRequestDto,
  DeleteSidebarNodesResponseDto,
  StartManageAdReviewRequestDto,
  StartManageAdReviewResponseDto,
  ReadManageAdReviewTaskRequestDto,
  ReadManageAdReviewTaskResponseDto,
  PauseManageAdReviewTaskRequestDto,
  PauseManageAdReviewTaskResponseDto,
  TestAdReviewVisionModelRequestDto,
  TestAdReviewVisionModelResponseDto,
  TestWdSwinTaggerModelRequestDto,
  TestWdSwinTaggerModelResponseDto,
  ConfirmManageAdReviewDeleteRequestDto,
  ConfirmManageAdReviewDeleteResponseDto,
  ReadImportTasksResponseDto,
  RetryImportTaskRequestDto,
  RetryImportTaskResponseDto,
  LibrarySnapshotDto,
  MediaAccessAuditResponseDto,
  ReadImageMetadataRequestDto,
  ReadImageMetadataResponseDto,
  ReadPlaylistResponseDto,
  ReadImagePageRequestDto,
  ReadImagePageResponseDto,
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
  GeneratePackageAutoTagsRequestDto,
  GeneratePackageAutoTagsResponseDto,
  GeneratePackageAutoTagsVisionRequestDto,
  GeneratePackageAutoTagsVisionResponseDto,
  GeneratePackageEmbeddingsRequestDto,
  GeneratePackageEmbeddingsResponseDto,
  WriteVideoMetadataRequestDto,
  WriteVideoMetadataResponseDto,
  SetImageHiddenRequestDto,
  SetImageHiddenResponseDto,
  WritePackageGradeRequestDto,
  WritePackageGradeResponseDto,
  ReadAppStateRequestDto,
  ReadAppStateResponseDto,
  WriteAppStateRequestDto,
  WriteAppStateResponseDto,
} from '../../../contracts/backend'

export interface RepositoryRequestOptions {
  signal?: AbortSignal
  timeoutMs?: number
}

export interface MediaRepository {
  getInitialLibrarySnapshot(): LibrarySnapshotDto | null
  readLibrarySnapshot(options?: RepositoryRequestOptions): Promise<LibrarySnapshotDto>
  readImageSidebarTree(
    request: ReadImageSidebarTreeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadImageSidebarTreeResponseDto>
  readImagePage(
    request: ReadImagePageRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadImagePageResponseDto>
  readImageMetadata(
    request: ReadImageMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadImageMetadataResponseDto>
  resolveMediaResource(
    request: ResolveMediaResourceRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ResolveMediaResourceResponseDto>
  writePackageGrade(
    request: WritePackageGradeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePackageGradeResponseDto>
  setImageHidden?(
    request: SetImageHiddenRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SetImageHiddenResponseDto>
  deleteImageItems?(
    request: DeleteImageItemsRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<DeleteImageItemsResponseDto>
  deleteSidebarNodes?(
    request: DeleteSidebarNodesRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<DeleteSidebarNodesResponseDto>
  startManageAdReview?(
    request: StartManageAdReviewRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StartManageAdReviewResponseDto>
  readManageAdReviewTask?(
    request: ReadManageAdReviewTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadManageAdReviewTaskResponseDto>
  pauseManageAdReviewTask?(
    request: PauseManageAdReviewTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PauseManageAdReviewTaskResponseDto>
  testAdReviewVisionModel?(
    request: TestAdReviewVisionModelRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<TestAdReviewVisionModelResponseDto>
  testWdSwinTaggerModel?(
    request: TestWdSwinTaggerModelRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<TestWdSwinTaggerModelResponseDto>
  confirmManageAdReviewDelete?(
    request: ConfirmManageAdReviewDeleteRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ConfirmManageAdReviewDeleteResponseDto>
  writePackageMetadata?(
    request: WritePackageMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePackageMetadataResponseDto>
  generatePackageAutoTags?(
    request: GeneratePackageAutoTagsRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<GeneratePackageAutoTagsResponseDto>
  generatePackageAutoTagsVision?(
    request: GeneratePackageAutoTagsVisionRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<GeneratePackageAutoTagsVisionResponseDto>
  generatePackageEmbeddings?(
    request: GeneratePackageEmbeddingsRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<GeneratePackageEmbeddingsResponseDto>
  writeVideoMetadata?(
    request: WriteVideoMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WriteVideoMetadataResponseDto>
  saveVideoCover(
    request: SaveVideoCoverRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SaveVideoCoverResponseDto>
  readPlaylist(options?: RepositoryRequestOptions): Promise<ReadPlaylistResponseDto>
  writePlaylist(
    request: WritePlaylistRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePlaylistResponseDto>
  readAppState?(
    request: ReadAppStateRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadAppStateResponseDto>
  writeAppState?(
    request: WriteAppStateRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WriteAppStateResponseDto>
  pickImportPaths?(
    request: PickImportPathsRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PickImportPathsResponseDto>
  readClipboardImportPaths?(options?: RepositoryRequestOptions): Promise<ReadClipboardImportPathsResponseDto>
  enqueueImportTask(
    request: EnqueueImportTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<EnqueueImportTaskResponseDto>
  readImportTasks(options?: RepositoryRequestOptions): Promise<ReadImportTasksResponseDto>
  retryImportTask(
    request: RetryImportTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<RetryImportTaskResponseDto>
  readMediaAccessAudit(options?: RepositoryRequestOptions): Promise<MediaAccessAuditResponseDto>
  readRuntimeCapabilities(options?: RepositoryRequestOptions): Promise<ReadRuntimeCapabilitiesResponseDto>
  readVectorDataStatus?(options?: RepositoryRequestOptions): Promise<ReadVectorDataStatusResponseDto>
  readArchiveLoadStatus?(options?: RepositoryRequestOptions): Promise<ReadArchiveLoadStatusResponseDto>
  clearDatabase?(options?: RepositoryRequestOptions): Promise<ClearDatabaseResponseDto>
  clearVectorData?(options?: RepositoryRequestOptions): Promise<ClearVectorDataResponseDto>
  onLibraryChanged?(listener: (payload: { reason: string; updated_at_ms: number }) => void): () => void
}

export interface SynchronousMediaRepository extends MediaRepository {
  readImageSidebarTreeSync(request: ReadImageSidebarTreeRequestDto): ReadImageSidebarTreeResponseDto
  readImagePageSync(request: ReadImagePageRequestDto): ReadImagePageResponseDto
  readImageMetadataSync(request: ReadImageMetadataRequestDto): ReadImageMetadataResponseDto
  resolveMediaResourceSync(request: ResolveMediaResourceRequestDto): ResolveMediaResourceResponseDto
  writePackageGradeSync(request: WritePackageGradeRequestDto): WritePackageGradeResponseDto
  setImageHiddenSync?(request: SetImageHiddenRequestDto): SetImageHiddenResponseDto
  deleteImageItemsSync?(request: DeleteImageItemsRequestDto): DeleteImageItemsResponseDto
  deleteSidebarNodesSync?(request: DeleteSidebarNodesRequestDto): DeleteSidebarNodesResponseDto
  startManageAdReviewSync?(request: StartManageAdReviewRequestDto): StartManageAdReviewResponseDto
  readManageAdReviewTaskSync?(request: ReadManageAdReviewTaskRequestDto): ReadManageAdReviewTaskResponseDto
  pauseManageAdReviewTaskSync?(request: PauseManageAdReviewTaskRequestDto): PauseManageAdReviewTaskResponseDto
  testAdReviewVisionModelSync?(request: TestAdReviewVisionModelRequestDto): TestAdReviewVisionModelResponseDto
  testWdSwinTaggerModelSync?(request: TestWdSwinTaggerModelRequestDto): TestWdSwinTaggerModelResponseDto
  confirmManageAdReviewDeleteSync?(
    request: ConfirmManageAdReviewDeleteRequestDto,
  ): ConfirmManageAdReviewDeleteResponseDto
  writePackageMetadataSync?(request: WritePackageMetadataRequestDto): WritePackageMetadataResponseDto
  generatePackageAutoTagsSync?(request: GeneratePackageAutoTagsRequestDto): GeneratePackageAutoTagsResponseDto
  generatePackageAutoTagsVisionSync?(
    request: GeneratePackageAutoTagsVisionRequestDto,
  ): GeneratePackageAutoTagsVisionResponseDto
  generatePackageEmbeddingsSync?(
    request: GeneratePackageEmbeddingsRequestDto,
  ): GeneratePackageEmbeddingsResponseDto
  writeVideoMetadataSync?(request: WriteVideoMetadataRequestDto): WriteVideoMetadataResponseDto
  saveVideoCoverSync(request: SaveVideoCoverRequestDto): SaveVideoCoverResponseDto
  readPlaylistSync(): ReadPlaylistResponseDto
  writePlaylistSync(request: WritePlaylistRequestDto): WritePlaylistResponseDto
  pickImportPathsSync?(request: PickImportPathsRequestDto): PickImportPathsResponseDto
  readClipboardImportPathsSync?(): ReadClipboardImportPathsResponseDto
  enqueueImportTaskSync(request: EnqueueImportTaskRequestDto): EnqueueImportTaskResponseDto
  readImportTasksSync(): ReadImportTasksResponseDto
  retryImportTaskSync(request: RetryImportTaskRequestDto): RetryImportTaskResponseDto
  readMediaAccessAuditSync(): MediaAccessAuditResponseDto
  readRuntimeCapabilitiesSync(): ReadRuntimeCapabilitiesResponseDto
  readVectorDataStatusSync?(): ReadVectorDataStatusResponseDto
  clearDatabaseSync?(): ClearDatabaseResponseDto
  clearVectorDataSync?(): ClearVectorDataResponseDto
}

export type RepositoryMode = 'mock' | 'real'
