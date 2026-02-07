import type {
  LibrarySnapshotDto,
  ReadImageMetadataRequestDto,
  ReadImageMetadataResponseDto,
  ReadImagePageRequestDto,
  ReadImagePageResponseDto,
  ReadImageSidebarTreeRequestDto,
  ReadImageSidebarTreeResponseDto,
} from './contracts/backend'

interface MediaPlayerBackendApi {
  readLibrarySnapshot: () => Promise<LibrarySnapshotDto>
  readImageSidebarTree: (request: ReadImageSidebarTreeRequestDto) => Promise<ReadImageSidebarTreeResponseDto>
  readImagePage: (request: ReadImagePageRequestDto) => Promise<ReadImagePageResponseDto>
  readImageMetadata: (request: ReadImageMetadataRequestDto) => Promise<ReadImageMetadataResponseDto>
}

declare global {
  interface Window {
    mediaPlayerBackend?: MediaPlayerBackendApi
  }
}

export {}
