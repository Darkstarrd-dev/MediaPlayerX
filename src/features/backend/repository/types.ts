import type {
  LibrarySnapshotDto,
  ReadImageMetadataRequestDto,
  ReadImageMetadataResponseDto,
  ReadImagePageRequestDto,
  ReadImagePageResponseDto,
  ReadImageSidebarTreeRequestDto,
  ReadImageSidebarTreeResponseDto,
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
}

export interface SynchronousMediaRepository extends ReadonlyMediaRepository {
  readImageSidebarTreeSync(request: ReadImageSidebarTreeRequestDto): ReadImageSidebarTreeResponseDto
  readImagePageSync(request: ReadImagePageRequestDto): ReadImagePageResponseDto
  readImageMetadataSync(request: ReadImageMetadataRequestDto): ReadImageMetadataResponseDto
}

export type RepositoryMode = 'mock' | 'real'
