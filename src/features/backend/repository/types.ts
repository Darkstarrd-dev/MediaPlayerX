import type {
  LibrarySnapshotDto,
  MediaAccessAuditResponseDto,
  ReadImageMetadataRequestDto,
  ReadImageMetadataResponseDto,
  ReadImagePageRequestDto,
  ReadImagePageResponseDto,
  ReadImageSidebarTreeRequestDto,
  ReadImageSidebarTreeResponseDto,
  ResolveMediaResourceRequestDto,
  ResolveMediaResourceResponseDto,
  SaveVideoCoverRequestDto,
  SaveVideoCoverResponseDto,
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
  readMediaAccessAudit(options?: RepositoryRequestOptions): Promise<MediaAccessAuditResponseDto>
}

export interface SynchronousMediaRepository extends ReadonlyMediaRepository {
  readImageSidebarTreeSync(request: ReadImageSidebarTreeRequestDto): ReadImageSidebarTreeResponseDto
  readImagePageSync(request: ReadImagePageRequestDto): ReadImagePageResponseDto
  readImageMetadataSync(request: ReadImageMetadataRequestDto): ReadImageMetadataResponseDto
  resolveMediaResourceSync(request: ResolveMediaResourceRequestDto): ResolveMediaResourceResponseDto
  writePackageGradeSync(request: WritePackageGradeRequestDto): WritePackageGradeResponseDto
  saveVideoCoverSync(request: SaveVideoCoverRequestDto): SaveVideoCoverResponseDto
  readMediaAccessAuditSync(): MediaAccessAuditResponseDto
}

export type RepositoryMode = 'mock' | 'real'
