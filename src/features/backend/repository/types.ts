import type {
  EnqueueImportTaskRequestDto,
  EnqueueImportTaskResponseDto,
  PickImportPathsRequestDto,
  PickImportPathsResponseDto,
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
}

export interface SynchronousMediaRepository extends ReadonlyMediaRepository {
  readImageSidebarTreeSync(request: ReadImageSidebarTreeRequestDto): ReadImageSidebarTreeResponseDto
  readImagePageSync(request: ReadImagePageRequestDto): ReadImagePageResponseDto
  readImageMetadataSync(request: ReadImageMetadataRequestDto): ReadImageMetadataResponseDto
  resolveMediaResourceSync(request: ResolveMediaResourceRequestDto): ResolveMediaResourceResponseDto
  writePackageGradeSync(request: WritePackageGradeRequestDto): WritePackageGradeResponseDto
  saveVideoCoverSync(request: SaveVideoCoverRequestDto): SaveVideoCoverResponseDto
  readPlaylistSync(): ReadPlaylistResponseDto
  writePlaylistSync(request: WritePlaylistRequestDto): WritePlaylistResponseDto
  pickImportPathsSync?(request: PickImportPathsRequestDto): PickImportPathsResponseDto
  enqueueImportTaskSync(request: EnqueueImportTaskRequestDto): EnqueueImportTaskResponseDto
  readImportTasksSync(): ReadImportTasksResponseDto
  retryImportTaskSync(request: RetryImportTaskRequestDto): RetryImportTaskResponseDto
  readMediaAccessAuditSync(): MediaAccessAuditResponseDto
  readRuntimeCapabilitiesSync(): ReadRuntimeCapabilitiesResponseDto
}

export type RepositoryMode = 'mock' | 'real'
