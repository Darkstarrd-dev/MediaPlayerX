import {
  type ReadImageMetadataRequestDto,
  type ReadImageMetadataResponseDto,
  type ReadImagePageRequestDto,
  type ReadImagePageResponseDto,
  type ReadImageSidebarTreeRequestDto,
  type ReadImageSidebarTreeResponseDto,
  type ReadPlaylistResponseDto,
  type WritePlaylistRequestDto,
  type WritePlaylistResponseDto,
  type WritePackageMetadataRequestDto,
  type WritePackageMetadataResponseDto,
  type WritePackageExternalMetadataRequestDto,
  type WritePackageExternalMetadataResponseDto,
  type WriteVideoMetadataRequestDto,
  type WriteVideoMetadataResponseDto,
  type WritePackageGradeRequestDto,
  type WritePackageGradeResponseDto,
  type SaveVideoCoverRequestDto,
  type SaveVideoCoverResponseDto,
  type LibrarySnapshotDto,
} from '../../src/contracts/backend'
import { FileSystemFacadeContext } from './types'

export class FileSystemLibraryHandlers {
  constructor(private context: FileSystemFacadeContext) {}

  async readLibrarySnapshot(): Promise<LibrarySnapshotDto> {
    this.context.markInteractiveRead()
    return this.context.ensureSnapshotLoaded()
  }

  async readImageSidebarTree(
    request: ReadImageSidebarTreeRequestDto,
  ): Promise<ReadImageSidebarTreeResponseDto> {
    return this.context.libraryReadWriteService.readImageSidebarTree(request)
  }

  async readImagePage(request: ReadImagePageRequestDto): Promise<ReadImagePageResponseDto> {
    return this.context.libraryReadWriteService.readImagePage(request)
  }

  async readImageMetadata(
    request: ReadImageMetadataRequestDto,
  ): Promise<ReadImageMetadataResponseDto> {
    return this.context.libraryReadWriteService.readImageMetadata(request)
  }

  async writePackageGrade(
    request: WritePackageGradeRequestDto,
  ): Promise<WritePackageGradeResponseDto> {
    return this.context.libraryReadWriteService.writePackageGrade(request)
  }

  async writePackageMetadata(
    request: WritePackageMetadataRequestDto,
  ): Promise<WritePackageMetadataResponseDto> {
    return this.context.libraryReadWriteService.writePackageMetadata(request)
  }

  async writePackageExternalMetadata(
    request: WritePackageExternalMetadataRequestDto,
  ): Promise<WritePackageExternalMetadataResponseDto> {
    return this.context.libraryReadWriteService.writePackageExternalMetadata(request)
  }

  async writeVideoMetadata(
    request: WriteVideoMetadataRequestDto,
  ): Promise<WriteVideoMetadataResponseDto> {
    return this.context.libraryReadWriteService.writeVideoMetadata(request)
  }

  async saveVideoCover(
    request: SaveVideoCoverRequestDto,
  ): Promise<SaveVideoCoverResponseDto> {
    return this.context.libraryReadWriteService.saveVideoCover(request)
  }

  async readPlaylist(): Promise<ReadPlaylistResponseDto> {
    return this.context.libraryReadWriteService.readPlaylist()
  }

  async writePlaylist(request: WritePlaylistRequestDto): Promise<WritePlaylistResponseDto> {
    return this.context.libraryReadWriteService.writePlaylist(request)
  }
}
