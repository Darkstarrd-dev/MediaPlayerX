import type {
  ClearDatabaseResponseDto,
  EnqueueImportTaskRequestDto,
  EnqueueImportTaskResponseDto,
  PickImportPathsRequestDto,
  PickImportPathsResponseDto,
  ReadClipboardImportPathsResponseDto,
  ReadArchiveLoadStatusResponseDto,
  ReadRuntimeCapabilitiesResponseDto,
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
  WriteVideoMetadataRequestDto,
  WriteVideoMetadataResponseDto,
  WritePackageGradeRequestDto,
  WritePackageGradeResponseDto,
} from '../../../contracts/backend'

export interface RepositoryRequestOptions {
  signal?: AbortSignal
  timeoutMs?: number
}

export interface ReadonlyMediaRepository {
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
  writePackageMetadata?(
    request: WritePackageMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePackageMetadataResponseDto>
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
  readArchiveLoadStatus?(options?: RepositoryRequestOptions): Promise<ReadArchiveLoadStatusResponseDto>
  clearDatabase?(options?: RepositoryRequestOptions): Promise<ClearDatabaseResponseDto>
  onLibraryChanged?(listener: (payload: { reason: string; updated_at_ms: number }) => void): () => void
}

export interface SynchronousMediaRepository extends ReadonlyMediaRepository {
  readImageSidebarTreeSync(request: ReadImageSidebarTreeRequestDto): ReadImageSidebarTreeResponseDto
  readImagePageSync(request: ReadImagePageRequestDto): ReadImagePageResponseDto
  readImageMetadataSync(request: ReadImageMetadataRequestDto): ReadImageMetadataResponseDto
  resolveMediaResourceSync(request: ResolveMediaResourceRequestDto): ResolveMediaResourceResponseDto
  writePackageGradeSync(request: WritePackageGradeRequestDto): WritePackageGradeResponseDto
  writePackageMetadataSync?(request: WritePackageMetadataRequestDto): WritePackageMetadataResponseDto
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
  clearDatabaseSync?(): ClearDatabaseResponseDto
}

export type RepositoryMode = 'mock' | 'real'
