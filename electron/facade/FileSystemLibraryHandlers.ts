import {
  type ReadImageMetadataRequestDto,
  type ReadImageMetadataResponseDto,
  type ReadImagePageRequestDto,
  type ReadImagePageResponseDto,
  type ReadSourceImagesRequestDto,
  type ReadSourceImagesResponseDto,
  type ReadImageSidebarTreeRequestDto,
  type ReadImageSidebarTreeResponseDto,
  type ReadPlaylistResponseDto,
  type ListVideoSubtitlesRequestDto,
  type ListVideoSubtitlesResponseDto,
  type PrepareSubtitleTrackRequestDto,
  type PrepareSubtitleTrackResponseDto,
  type WritePlaylistRequestDto,
  type WritePlaylistResponseDto,
  type WritePackageMetadataRequestDto,
  type WritePackageMetadataResponseDto,
  type WritePackageExternalMetadataRequestDto,
  type WritePackageExternalMetadataResponseDto,
  type WriteVideoMetadataRequestDto,
  type WriteVideoMetadataResponseDto,
  type WriteAudioMetadataRequestDto,
  type WriteAudioMetadataResponseDto,
  type WritePackageGradeRequestDto,
  type WritePackageGradeResponseDto,
  type SaveVideoCoverRequestDto,
  type SaveVideoCoverResponseDto,
  type LibrarySnapshotDto,
  type LibrarySnapshotLiteDto,
  type ImageSourceLiteDto,
} from '../../src/contracts/backend'
import { FileSystemFacadeContext } from './types'

/**
 * 从 full snapshot 构造 lite DTO（剥离 images[]）。
 * 当 DB 尚未写入（扫描期间 replaceSnapshot 未完成）但 snapshotCache 已有预览数据时，
 * 用此函数从缓存构造 lite 返回，避免前端拿到空 packages 导致 sidebar 无法渲染。
 */
function buildLiteDtoFromSnapshot(snapshot: LibrarySnapshotDto): LibrarySnapshotLiteDto {
  const mapToLite = (pkg: LibrarySnapshotDto['image_packages'][number]): ImageSourceLiteDto => ({
    id: pkg.id,
    package_name: pkg.package_name,
    display_name: pkg.display_name,
    absolute_path: pkg.absolute_path,
    tree_path: pkg.tree_path,
    work_title: pkg.work_title,
    series_id: pkg.series_id,
    circle: pkg.circle,
    author: pkg.author,
    tags: pkg.tags,
    mock_grade: pkg.mock_grade,
    external_metadata: pkg.external_metadata,
    source_cover: pkg.source_cover,
  })

  return {
    image_packages: snapshot.image_packages.map(mapToLite),
    image_directories: snapshot.image_directories.map(mapToLite),
    videos: snapshot.videos,
    audios: snapshot.audios,
  }
}

export class FileSystemLibraryHandlers {
  constructor(private context: FileSystemFacadeContext) {}

  async readLibrarySnapshot(): Promise<LibrarySnapshotDto> {
    this.context.markInteractiveRead()
    return this.context.ensureSnapshotLoaded()
  }

  async readLibrarySnapshotLite(): Promise<LibrarySnapshotLiteDto> {
    this.context.markInteractiveRead()
    const dbResult = this.context.database.readSnapshotLite()
    const dbHasContent =
      dbResult.image_packages.length > 0 ||
      dbResult.image_directories.length > 0 ||
      dbResult.videos.length > 0 ||
      (dbResult.audios?.length ?? 0) > 0
    // DB 有数据时直接返回，避免触发整库 readSnapshot（含所有图片项）进内存。
    if (dbHasContent) {
      return dbResult
    }
    // DB 全空（首次启动或扫描尚未写入）：触发快照加载/warmup，
    // 并在缓存（含扫描预览）有图片时回退构造 lite，避免前端拿到空 sidebar。
    const snapshot = await this.context.ensureSnapshotLoaded()
    if (
      snapshot.image_packages.length > 0 ||
      snapshot.image_directories.length > 0
    ) {
      return buildLiteDtoFromSnapshot(snapshot)
    }
    return dbResult
  }

  async readImageSidebarTree(
    request: ReadImageSidebarTreeRequestDto,
    signal?: AbortSignal,
  ): Promise<ReadImageSidebarTreeResponseDto> {
    return this.context.libraryReadWriteService.readImageSidebarTree(request, signal)
  }

  async readImagePage(request: ReadImagePageRequestDto, signal?: AbortSignal): Promise<ReadImagePageResponseDto> {
    return this.context.libraryReadWriteService.readImagePage(request, signal)
  }

  async readSourceImages(request: ReadSourceImagesRequestDto): Promise<ReadSourceImagesResponseDto> {
    return this.context.libraryReadWriteService.readSourceImages(request)
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

  async writeAudioMetadata(
    request: WriteAudioMetadataRequestDto,
  ): Promise<WriteAudioMetadataResponseDto> {
    return this.context.libraryReadWriteService.writeAudioMetadata(request)
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

  async listVideoSubtitles(request: ListVideoSubtitlesRequestDto): Promise<ListVideoSubtitlesResponseDto> {
    return this.context.libraryReadWriteService.listVideoSubtitles(request)
  }

  async prepareSubtitleTrack(request: PrepareSubtitleTrackRequestDto): Promise<PrepareSubtitleTrackResponseDto> {
    return this.context.libraryReadWriteService.prepareSubtitleTrack(request)
  }
}
