import {
  AUDIO_ITEMS,
  IMAGE_DIRECTORY_SOURCES,
  IMAGE_PACKAGES,
  VIDEO_ITEMS,
} from '../../../mockData'
import {
  librarySnapshotDtoSchema,
  type ClearDatabaseResponseDto,
  type ConfirmManageAdReviewDeleteRequestDto,
  type ConfirmManageAdReviewDeleteResponseDto,
  type DeleteImageItemsRequestDto,
  type DeleteImageItemsResponseDto,
  type DeleteSidebarNodesRequestDto,
  type DeleteSidebarNodesResponseDto,
  type MoveSidebarNodesRequestDto,
  type MoveSidebarNodesResponseDto,
  type EnqueueImportTaskRequestDto,
  type EnqueueImportTaskResponseDto,
  type LibrarySnapshotDto,
  type MediaAccessAuditResponseDto,
  type PickDirectoryPathRequestDto,
  type PickDirectoryPathResponseDto,
  type PickFilePathRequestDto,
  type PickFilePathResponseDto,
  type PickImportPathsRequestDto,
  type PickImportPathsResponseDto,
  type ReadAppStateRequestDto,
  type ReadAppStateResponseDto,
  type ReadClipboardImportPathsResponseDto,
  type ReadImageMetadataRequestDto,
  type ReadImageMetadataResponseDto,
  type ReadImagePageRequestDto,
  type ReadImagePageResponseDto,
  type ReadImageSidebarTreeRequestDto,
  type ReadImageSidebarTreeResponseDto,
  type ReadImportTasksResponseDto,
  type ListVideoSubtitlesRequestDto,
  type ListVideoSubtitlesResponseDto,
  type PrepareSubtitleTrackRequestDto,
  type PrepareSubtitleTrackResponseDto,
  type ReadPlaylistResponseDto,
  type ReadRuntimeCapabilitiesResponseDto,
  type ResolveMediaResourceRequestDto,
  type ResolveMediaResourceResponseDto,
  type StartManageAdReviewRequestDto,
  type StartManageAdReviewResponseDto,
  type WriteAppStateRequestDto,
  type WriteAppStateResponseDto,
  type WritePackageExternalMetadataRequestDto,
  type WritePackageExternalMetadataResponseDto,
  type WritePackageGradeRequestDto,
  type WritePackageGradeResponseDto,
  type WritePackageMetadataRequestDto,
  type WritePackageMetadataResponseDto,
  type WritePlaylistRequestDto,
  type WritePlaylistResponseDto,
  type WriteVideoMetadataRequestDto,
  type WriteVideoMetadataResponseDto,
  type WriteAudioMetadataRequestDto,
  type WriteAudioMetadataResponseDto,
  type ReadManageAdReviewTaskRequestDto,
  type ReadManageAdReviewTaskResponseDto,
  type PauseManageAdReviewTaskRequestDto,
  type PauseManageAdReviewTaskResponseDto,
  type TestAdReviewVisionModelRequestDto,
  type TestAdReviewVisionModelResponseDto,
  type SaveVideoCoverRequestDto,
  type SaveVideoCoverResponseDto,
  type SetImageHiddenRequestDto,
  type SetImageHiddenResponseDto,
  type RetryImportTaskRequestDto,
  type RetryImportTaskResponseDto,
  type SearchExternalMetadataRequestDto,
  type SearchExternalMetadataResponseDto,
} from '../../../contracts/backend'
import {
  type MediaRepository,
  type RepositoryRequestOptions,
  type SynchronousMediaRepository,
} from './types'
import { toAudioItemDto, toImagePackageDto, toVideoItemDto } from './mock/mappers'
import { resolveAsync } from './mock/utils'
import { MOCK_LIBRARY_SNAPSHOT_REF, type MockRepositoryState } from './mock/types'
import { MockAdReviewHandlers } from './mock/AdReviewHandlers'
import { MockMediaReadHandlers } from './mock/MediaReadHandlers'
import { MockMediaWriteHandlers } from './mock/MediaWriteHandlers'
import { MockSystemHandlers } from './mock/SystemHandlers'

const INITIAL_SNAPSHOT: LibrarySnapshotDto = librarySnapshotDtoSchema.parse({
  image_packages: IMAGE_PACKAGES.map(toImagePackageDto),
  image_directories: IMAGE_DIRECTORY_SOURCES.map(toImagePackageDto),
  videos: VIDEO_ITEMS.map(toVideoItemDto),
  audios: AUDIO_ITEMS.map(toAudioItemDto),
})

MOCK_LIBRARY_SNAPSHOT_REF.current = INITIAL_SNAPSHOT

export class MockMediaRepository implements MediaRepository, SynchronousMediaRepository {
  private state: MockRepositoryState = {
    playlistIds: INITIAL_SNAPSHOT.videos.slice(0, 3).map((v) => v.id),
    importTasks: [],
    manageAdReviewTasks: new Map(),
    appStates: new Map(),
    sourceCoverImageUrlBySourceId: {},
  }

  private adReview = new MockAdReviewHandlers(this.state)
  private read = new MockMediaReadHandlers(this.state)
  private write = new MockMediaWriteHandlers(this.state)
  private system = new MockSystemHandlers(this.state)

  getInitialLibrarySnapshot(): LibrarySnapshotDto {
    return MOCK_LIBRARY_SNAPSHOT_REF.current!
  }

  async readLibrarySnapshot(options?: RepositoryRequestOptions): Promise<LibrarySnapshotDto> {
    return resolveAsync(this.getInitialLibrarySnapshot(), options)
  }

  readImageSidebarTreeSync(request: ReadImageSidebarTreeRequestDto): ReadImageSidebarTreeResponseDto {
    return this.read.readImageSidebarTreeSync(request)
  }

  async readImageSidebarTree(
    request: ReadImageSidebarTreeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadImageSidebarTreeResponseDto> {
    return resolveAsync(this.readImageSidebarTreeSync(request), options)
  }

  readImagePageSync(request: ReadImagePageRequestDto): ReadImagePageResponseDto {
    return this.read.readImagePageSync(request)
  }

  async readImagePage(
    request: ReadImagePageRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadImagePageResponseDto> {
    return resolveAsync(this.readImagePageSync(request), options)
  }

  readImageMetadataSync(request: ReadImageMetadataRequestDto): ReadImageMetadataResponseDto {
    return this.read.readImageMetadataSync(request)
  }

  async readImageMetadata(
    request: ReadImageMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadImageMetadataResponseDto> {
    return resolveAsync(this.readImageMetadataSync(request), options)
  }

  resolveMediaResourceSync(request: ResolveMediaResourceRequestDto): ResolveMediaResourceResponseDto {
    return this.read.resolveMediaResourceSync(request)
  }

  async resolveMediaResource(
    request: ResolveMediaResourceRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ResolveMediaResourceResponseDto> {
    return resolveAsync(this.resolveMediaResourceSync(request), options)
  }

  writePackageGradeSync(request: WritePackageGradeRequestDto): WritePackageGradeResponseDto {
    return this.write.writePackageGradeSync(request)
  }

  async writePackageGrade(
    request: WritePackageGradeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePackageGradeResponseDto> {
    return resolveAsync(this.writePackageGradeSync(request), options)
  }

  setImageHiddenSync(request: SetImageHiddenRequestDto): SetImageHiddenResponseDto {
    return this.write.setImageHiddenSync(request)
  }

  async setImageHidden(
    request: SetImageHiddenRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SetImageHiddenResponseDto> {
    return resolveAsync(this.setImageHiddenSync(request), options)
  }

  deleteImageItemsSync(request: DeleteImageItemsRequestDto): DeleteImageItemsResponseDto {
    return this.write.deleteImageItemsSync(request)
  }

  async deleteImageItems(
    request: DeleteImageItemsRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<DeleteImageItemsResponseDto> {
    return resolveAsync(this.deleteImageItemsSync(request), options)
  }

  deleteSidebarNodesSync(request: DeleteSidebarNodesRequestDto): DeleteSidebarNodesResponseDto {
    return this.write.deleteSidebarNodesSync(request)
  }

  async deleteSidebarNodes(
    request: DeleteSidebarNodesRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<DeleteSidebarNodesResponseDto> {
    return resolveAsync(this.deleteSidebarNodesSync(request), options)
  }

  moveSidebarNodesSync(request: MoveSidebarNodesRequestDto): MoveSidebarNodesResponseDto {
    return this.write.moveSidebarNodesSync(request)
  }

  async moveSidebarNodes(
    request: MoveSidebarNodesRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<MoveSidebarNodesResponseDto> {
    return resolveAsync(this.moveSidebarNodesSync(request), options)
  }

  startManageAdReviewSync(request: StartManageAdReviewRequestDto): StartManageAdReviewResponseDto {
    return this.adReview.startManageAdReviewSync(request)
  }

  async startManageAdReview(
    request: StartManageAdReviewRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StartManageAdReviewResponseDto> {
    return resolveAsync(this.startManageAdReviewSync(request), options)
  }

  readManageAdReviewTaskSync(request: ReadManageAdReviewTaskRequestDto): ReadManageAdReviewTaskResponseDto {
    return this.adReview.readManageAdReviewTaskSync(request)
  }

  async readManageAdReviewTask(
    request: ReadManageAdReviewTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadManageAdReviewTaskResponseDto> {
    return resolveAsync(this.readManageAdReviewTaskSync(request), options)
  }

  pauseManageAdReviewTaskSync(request: PauseManageAdReviewTaskRequestDto): PauseManageAdReviewTaskResponseDto {
    return this.adReview.pauseManageAdReviewTaskSync(request)
  }

  async pauseManageAdReviewTask(
    request: PauseManageAdReviewTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PauseManageAdReviewTaskResponseDto> {
    return resolveAsync(this.pauseManageAdReviewTaskSync(request), options)
  }

  testAdReviewVisionModelSync(request: TestAdReviewVisionModelRequestDto): TestAdReviewVisionModelResponseDto {
    return this.adReview.testAdReviewVisionModelSync(request)
  }

  async testAdReviewVisionModel(
    request: TestAdReviewVisionModelRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<TestAdReviewVisionModelResponseDto> {
    return resolveAsync(this.testAdReviewVisionModelSync(request), options)
  }

  confirmManageAdReviewDeleteSync(request: ConfirmManageAdReviewDeleteRequestDto): ConfirmManageAdReviewDeleteResponseDto {
    return this.adReview.confirmManageAdReviewDeleteSync(request, (req) => this.deleteImageItemsSync(req))
  }

  async confirmManageAdReviewDelete(
    request: ConfirmManageAdReviewDeleteRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ConfirmManageAdReviewDeleteResponseDto> {
    return resolveAsync(this.confirmManageAdReviewDeleteSync(request), options)
  }

  writePackageMetadataSync(request: WritePackageMetadataRequestDto): WritePackageMetadataResponseDto {
    return this.write.writePackageMetadataSync(request)
  }

  async writePackageMetadata(
    request: WritePackageMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePackageMetadataResponseDto> {
    return resolveAsync(this.writePackageMetadataSync(request), options)
  }

  writePackageExternalMetadataSync(request: WritePackageExternalMetadataRequestDto): WritePackageExternalMetadataResponseDto {
    return this.write.writePackageExternalMetadataSync(request)
  }

  async writePackageExternalMetadata(
    request: WritePackageExternalMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WritePackageExternalMetadataResponseDto> {
    return resolveAsync(this.writePackageExternalMetadataSync(request), options)
  }

  searchExternalMetadataSync(request: SearchExternalMetadataRequestDto): SearchExternalMetadataResponseDto {
    return this.system.searchExternalMetadataSync(request)
  }

  async searchExternalMetadata(
    request: SearchExternalMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SearchExternalMetadataResponseDto> {
    return resolveAsync(this.searchExternalMetadataSync(request), options)
  }

  writeVideoMetadataSync(request: WriteVideoMetadataRequestDto): WriteVideoMetadataResponseDto {
    return this.write.writeVideoMetadataSync(request)
  }

  async writeVideoMetadata(
    request: WriteVideoMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WriteVideoMetadataResponseDto> {
    return resolveAsync(this.writeVideoMetadataSync(request), options)
  }

  writeAudioMetadataSync(request: WriteAudioMetadataRequestDto): WriteAudioMetadataResponseDto {
    return this.write.writeAudioMetadataSync(request)
  }

  async writeAudioMetadata(
    request: WriteAudioMetadataRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<WriteAudioMetadataResponseDto> {
    return resolveAsync(this.writeAudioMetadataSync(request), options)
  }

  saveVideoCoverSync(request: SaveVideoCoverRequestDto): SaveVideoCoverResponseDto {
    return this.write.saveVideoCoverSync(request)
  }

  async saveVideoCover(
    request: SaveVideoCoverRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SaveVideoCoverResponseDto> {
    return resolveAsync(this.saveVideoCoverSync(request), options)
  }

  readPlaylistSync(): ReadPlaylistResponseDto {
    return this.read.readPlaylistSync()
  }

  async readPlaylist(options?: RepositoryRequestOptions): Promise<ReadPlaylistResponseDto> {
    return resolveAsync(this.readPlaylistSync(), options)
  }

  writePlaylistSync(request: WritePlaylistRequestDto): WritePlaylistResponseDto {
    return this.write.writePlaylistSync(request)
  }

  async writePlaylist(request: WritePlaylistRequestDto): Promise<WritePlaylistResponseDto> {
    return resolveAsync(this.writePlaylistSync(request))
  }

  listVideoSubtitlesSync(request: ListVideoSubtitlesRequestDto): ListVideoSubtitlesResponseDto {
    void request
    return {
      subtitles: [],
      ffmpeg_available: false,
    }
  }

  async listVideoSubtitles(
    request: ListVideoSubtitlesRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ListVideoSubtitlesResponseDto> {
    return resolveAsync(this.listVideoSubtitlesSync(request), options)
  }

  prepareSubtitleTrackSync(request: PrepareSubtitleTrackRequestDto): PrepareSubtitleTrackResponseDto {
    return {
      locator: request.locator,
      converted: false,
    }
  }

  async prepareSubtitleTrack(
    request: PrepareSubtitleTrackRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PrepareSubtitleTrackResponseDto> {
    return resolveAsync(this.prepareSubtitleTrackSync(request), options)
  }

  async readAppState(request: ReadAppStateRequestDto): Promise<ReadAppStateResponseDto> {
    return this.system.readAppState(request)
  }

  async writeAppState(request: WriteAppStateRequestDto): Promise<WriteAppStateResponseDto> {
    return this.system.writeAppState(request)
  }

  pickImportPathsSync(request: PickImportPathsRequestDto): PickImportPathsResponseDto {
    return this.system.pickImportPathsSync(request)
  }

  async pickImportPaths(
    request: PickImportPathsRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PickImportPathsResponseDto> {
    return resolveAsync(this.pickImportPathsSync(request), options)
  }

  pickFilePathSync(request: PickFilePathRequestDto): PickFilePathResponseDto {
    return this.system.pickFilePathSync(request)
  }

  async pickFilePath(
    request: PickFilePathRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PickFilePathResponseDto> {
    return resolveAsync(this.pickFilePathSync(request), options)
  }

  pickDirectoryPathSync(request: PickDirectoryPathRequestDto): PickDirectoryPathResponseDto {
    return this.system.pickDirectoryPathSync(request)
  }

  async pickDirectoryPath(
    request: PickDirectoryPathRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PickDirectoryPathResponseDto> {
    return resolveAsync(this.pickDirectoryPathSync(request), options)
  }

  readClipboardImportPathsSync(): ReadClipboardImportPathsResponseDto {
    return this.system.readClipboardImportPathsSync()
  }

  async readClipboardImportPaths(options?: RepositoryRequestOptions): Promise<ReadClipboardImportPathsResponseDto> {
    return resolveAsync(this.readClipboardImportPathsSync(), options)
  }

  enqueueImportTaskSync(request: EnqueueImportTaskRequestDto): EnqueueImportTaskResponseDto {
    return this.write.enqueueImportTaskSync(request)
  }

  async enqueueImportTask(
    request: EnqueueImportTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<EnqueueImportTaskResponseDto> {
    return resolveAsync(this.enqueueImportTaskSync(request), options)
  }

  readImportTasksSync(): ReadImportTasksResponseDto {
    return this.read.readImportTasksSync()
  }

  async readImportTasks(options?: RepositoryRequestOptions): Promise<ReadImportTasksResponseDto> {
    return resolveAsync(this.readImportTasksSync(), options)
  }

  retryImportTaskSync(request: RetryImportTaskRequestDto): RetryImportTaskResponseDto {
    return this.write.retryImportTaskSync(request)
  }

  async retryImportTask(
    request: RetryImportTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<RetryImportTaskResponseDto> {
    return resolveAsync(this.retryImportTaskSync(request), options)
  }

  readMediaAccessAuditSync(): MediaAccessAuditResponseDto {
    return this.read.readMediaAccessAuditSync()
  }

  async readMediaAccessAudit(options?: RepositoryRequestOptions): Promise<MediaAccessAuditResponseDto> {
    return resolveAsync(this.readMediaAccessAuditSync(), options)
  }

  readRuntimeCapabilitiesSync(): ReadRuntimeCapabilitiesResponseDto {
    return this.read.readRuntimeCapabilitiesSync()
  }

  async readRuntimeCapabilities(
    options?: RepositoryRequestOptions,
  ): Promise<ReadRuntimeCapabilitiesResponseDto> {
    return resolveAsync(this.readRuntimeCapabilitiesSync(), options)
  }

  clearDatabaseSync(): ClearDatabaseResponseDto {
    return this.write.clearDatabaseSync()
  }

  async clearDatabase(options?: RepositoryRequestOptions): Promise<ClearDatabaseResponseDto> {
    return resolveAsync(this.clearDatabaseSync(), options)
  }
}
