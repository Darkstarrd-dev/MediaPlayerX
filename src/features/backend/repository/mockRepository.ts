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
  type ConfirmManageCoverReviewHideRequestDto,
  type ConfirmManageCoverReviewHideResponseDto,
  type ManageSubtitleCleanupTaskDto,
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
  type ResolveMediaResourceRequestDto,
  type ResolveMediaResourceResponseDto,
  type StartManageAdReviewRequestDto,
  type StartManageAdReviewResponseDto,
  type StartManageCoverReviewRequestDto,
  type StartManageCoverReviewResponseDto,
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
  type ReadManageCoverReviewTaskRequestDto,
  type ReadManageCoverReviewTaskResponseDto,
  type PauseManageAdReviewTaskRequestDto,
  type PauseManageAdReviewTaskResponseDto,
  type PauseManageCoverReviewTaskRequestDto,
  type PauseManageCoverReviewTaskResponseDto,
  type ReadManageSubtitleCleanupTaskRequestDto,
  type ReadManageSubtitleCleanupTaskResponseDto,
  type RunManageSubtitleCleanupRequestDto,
  type RunManageSubtitleCleanupResponseDto,
  type SaveManageSubtitleCleanupRequestDto,
  type SaveManageSubtitleCleanupResponseDto,
  type StartManageSubtitleCleanupRequestDto,
  type StartManageSubtitleCleanupResponseDto,
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
  type SubtitleModelDownloadTaskDto,
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
  private readonly subtitleRemoteModels: ListSubtitleRemoteModelsResponseDto['models'] = [
    {
      id: 'sensevoice-small-int8-2025-01',
      label: 'SenseVoice Small INT8 (zh/en/ja/ko/yue)',
      description: 'Mock remote model catalog item',
      language_codes: ['zh', 'en', 'ja', 'ko', 'yue'],
      size_bytes: 186_000_000,
      version: '2025-01',
      artifacts: [
        {
          relative_path: 'model.int8.onnx',
          url: 'https://example.invalid/mock/model.int8.onnx',
        },
        {
          relative_path: 'tokens.txt',
          url: 'https://example.invalid/mock/tokens.txt',
        },
      ],
    },
    {
      id: 'sensevoice-small-fp32-2025-01',
      label: 'SenseVoice Small FP32 (zh/en/ja/ko/yue)',
      description: 'Mock remote model catalog item',
      language_codes: ['zh', 'en', 'ja', 'ko', 'yue'],
      size_bytes: 740_000_000,
      version: '2025-01',
      artifacts: [
        {
          relative_path: 'model.onnx',
          url: 'https://example.invalid/mock/model.onnx',
        },
        {
          relative_path: 'tokens.txt',
          url: 'https://example.invalid/mock/tokens.txt',
        },
      ],
    },
  ]

  private readonly subtitleLocalModelsByDir = new Map<string, ListSubtitleLocalModelsResponseDto['models']>()

  private readonly subtitleDownloadTasks = new Map<string, SubtitleModelDownloadTaskDto>()

  private subtitleSessionState: {
    sessionId: string
    provider: 'cpu' | 'directml'
    running: boolean
  } | null = null

  private readonly subtitleCleanupTasks = new Map<string, ManageSubtitleCleanupTaskDto>()

  private state: MockRepositoryState = {
    playlistIds: INITIAL_SNAPSHOT.videos.slice(0, 3).map((v) => v.id),
    importTasks: [],
    manageAdReviewTasks: new Map(),
    manageCoverReviewTasks: new Map(),
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

  renameSidebarNodeSync(request: RenameSidebarNodeRequestDto): RenameSidebarNodeResponseDto {
    return this.write.renameSidebarNodeSync(request)
  }

  renameSidebarNodesSync(request: RenameSidebarNodesRequestDto): RenameSidebarNodesResponseDto {
    return this.write.renameSidebarNodesSync(request)
  }

  async renameSidebarNode(
    request: RenameSidebarNodeRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<RenameSidebarNodeResponseDto> {
    return resolveAsync(this.renameSidebarNodeSync(request), options)
  }

  async renameSidebarNodes(
    request: RenameSidebarNodesRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<RenameSidebarNodesResponseDto> {
    return resolveAsync(this.renameSidebarNodesSync(request), options)
  }

  renameItemsSync(request: RenameItemsRequestDto): RenameItemsResponseDto {
    return this.write.renameItemsSync(request)
  }

  async renameItems(
    request: RenameItemsRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<RenameItemsResponseDto> {
    return resolveAsync(this.renameItemsSync(request), options)
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

  startManageCoverReviewSync(request: StartManageCoverReviewRequestDto): StartManageCoverReviewResponseDto {
    return this.adReview.startManageCoverReviewSync(request)
  }

  async startManageCoverReview(
    request: StartManageCoverReviewRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StartManageCoverReviewResponseDto> {
    return resolveAsync(this.startManageCoverReviewSync(request), options)
  }

  readManageCoverReviewTaskSync(request: ReadManageCoverReviewTaskRequestDto): ReadManageCoverReviewTaskResponseDto {
    return this.adReview.readManageCoverReviewTaskSync(request)
  }

  async readManageCoverReviewTask(
    request: ReadManageCoverReviewTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadManageCoverReviewTaskResponseDto> {
    return resolveAsync(this.readManageCoverReviewTaskSync(request), options)
  }

  pauseManageCoverReviewTaskSync(request: PauseManageCoverReviewTaskRequestDto): PauseManageCoverReviewTaskResponseDto {
    return this.adReview.pauseManageCoverReviewTaskSync(request)
  }

  async pauseManageCoverReviewTask(
    request: PauseManageCoverReviewTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PauseManageCoverReviewTaskResponseDto> {
    return resolveAsync(this.pauseManageCoverReviewTaskSync(request), options)
  }

  confirmManageCoverReviewHideSync(request: ConfirmManageCoverReviewHideRequestDto): ConfirmManageCoverReviewHideResponseDto {
    return this.adReview.confirmManageCoverReviewHideSync(request, (req) => this.setImageHiddenSync(req))
  }

  async confirmManageCoverReviewHide(
    request: ConfirmManageCoverReviewHideRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ConfirmManageCoverReviewHideResponseDto> {
    return resolveAsync(this.confirmManageCoverReviewHideSync(request), options)
  }

  startManageSubtitleCleanupSync(request: StartManageSubtitleCleanupRequestDto): StartManageSubtitleCleanupResponseDto {
    const now = Date.now()
    const taskId = `mock-subtitle-cleanup-${now}-${Math.floor(Math.random() * 100_000)}`
    const task: ManageSubtitleCleanupTaskDto = {
      task_id: taskId,
      video_id: request.video_id,
      subtitle_path: `Z:/mock/${request.video_id}.srt`,
      status: 'review',
      raw_stage: 'ready',
      cleanup_stage: 'ready',
      raw_subtitle_text: '1\n00:00:00,000 --> 00:00:01,200\nmock raw subtitle\n',
      cleaned_subtitle_text: '1\n00:00:00,000 --> 00:00:01,200\nmock cleaned subtitle\n',
      message: 'mock subtitle cleanup ready',
      error_detail: null,
      created_at_ms: now,
      updated_at_ms: now,
    }
    this.subtitleCleanupTasks.set(taskId, task)
    return { task }
  }

  async startManageSubtitleCleanup(
    request: StartManageSubtitleCleanupRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StartManageSubtitleCleanupResponseDto> {
    return resolveAsync(this.startManageSubtitleCleanupSync(request), options)
  }

  readManageSubtitleCleanupTaskSync(
    request: ReadManageSubtitleCleanupTaskRequestDto,
  ): ReadManageSubtitleCleanupTaskResponseDto {
    return {
      task: this.subtitleCleanupTasks.get(request.task_id) ?? null,
    }
  }

  async readManageSubtitleCleanupTask(
    request: ReadManageSubtitleCleanupTaskRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadManageSubtitleCleanupTaskResponseDto> {
    return resolveAsync(this.readManageSubtitleCleanupTaskSync(request), options)
  }

  runManageSubtitleCleanupSync(request: RunManageSubtitleCleanupRequestDto): RunManageSubtitleCleanupResponseDto {
    const task = this.subtitleCleanupTasks.get(request.task_id)
    if (!task) {
      throw new Error(`subtitle_cleanup_task_not_found:${request.task_id}`)
    }
    if (task.raw_stage !== 'ready' || !task.raw_subtitle_text.trim()) {
      throw new Error('subtitle_cleanup_raw_not_ready')
    }

    const updatedAtMs = Date.now()
    const nextTask: ManageSubtitleCleanupTaskDto = {
      ...task,
      status: 'review',
      cleanup_stage: 'ready',
      cleaned_subtitle_text: task.raw_subtitle_text,
      message: 'mock subtitle cleanup done',
      error_detail: null,
      updated_at_ms: updatedAtMs,
    }
    this.subtitleCleanupTasks.set(task.task_id, nextTask)
    return { task: nextTask }
  }

  async runManageSubtitleCleanup(
    request: RunManageSubtitleCleanupRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<RunManageSubtitleCleanupResponseDto> {
    return resolveAsync(this.runManageSubtitleCleanupSync(request), options)
  }

  saveManageSubtitleCleanupSync(request: SaveManageSubtitleCleanupRequestDto): SaveManageSubtitleCleanupResponseDto {
    const task = this.subtitleCleanupTasks.get(request.task_id)
    if (!task) {
      throw new Error(`subtitle_cleanup_task_not_found:${request.task_id}`)
    }
    const updatedAtMs = Date.now()
    const nextTask: ManageSubtitleCleanupTaskDto = {
      ...task,
      cleaned_subtitle_text: request.cleaned_subtitle_text,
      status: task.status === 'failed' ? 'failed' : 'review',
      message: 'mock subtitle cleanup saved',
      updated_at_ms: updatedAtMs,
    }
    this.subtitleCleanupTasks.set(task.task_id, nextTask)
    return {
      task: nextTask,
      saved_path: task.subtitle_path,
      updated_at_ms: updatedAtMs,
    }
  }

  async saveManageSubtitleCleanup(
    request: SaveManageSubtitleCleanupRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<SaveManageSubtitleCleanupResponseDto> {
    return resolveAsync(this.saveManageSubtitleCleanupSync(request), options)
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

  async listSubtitleRemoteModels(options?: RepositoryRequestOptions): Promise<ListSubtitleRemoteModelsResponseDto> {
    return resolveAsync(
      {
        models: this.subtitleRemoteModels,
        generated_at_ms: Date.now(),
      },
      options,
    )
  }

  async listSubtitleLocalModels(
    request: ListSubtitleLocalModelsRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ListSubtitleLocalModelsResponseDto> {
    const key = request.model_dir.trim()
    const models = this.subtitleLocalModelsByDir.get(key) ?? []
    return resolveAsync(
      {
        model_dir: request.model_dir,
        models,
      },
      options,
    )
  }

  async startSubtitleModelDownload(
    request: StartSubtitleModelDownloadRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StartSubtitleModelDownloadResponseDto> {
    const model = this.subtitleRemoteModels.find((item) => item.id === request.model_id)
    if (!model) {
      throw new Error(`subtitle_model_not_found: ${request.model_id}`)
    }

    const now = Date.now()
    const task: SubtitleModelDownloadTaskDto = {
      download_id: `mock-subtitle-download-${now}-${Math.floor(Math.random() * 100000)}`,
      model_id: model.id,
      status: 'completed',
      done_bytes: model.size_bytes,
      total_bytes: model.size_bytes,
      percent: 100,
      speed_bps: 0,
      eta_sec: 0,
      use_proxy: request.use_proxy,
      proxy_url: request.proxy_url,
      message: 'mock download completed',
      started_at_ms: now,
      updated_at_ms: now,
      completed_at_ms: now,
    }
    this.subtitleDownloadTasks.set(task.download_id, task)

    const modelDir = request.model_dir.trim()
    const currentModels = this.subtitleLocalModelsByDir.get(modelDir) ?? []
    if (!currentModels.some((item) => item.id === model.id)) {
      this.subtitleLocalModelsByDir.set(modelDir, [
        ...currentModels,
        {
          id: model.id,
          label: model.label,
          model_dir: `${modelDir}/${model.id}`,
          installed_at_ms: now,
          size_bytes: model.size_bytes,
          source: 'downloaded',
        },
      ])
    }

    return resolveAsync({ task }, options)
  }

  async cancelSubtitleModelDownload(
    request: CancelSubtitleModelDownloadRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<CancelSubtitleModelDownloadResponseDto> {
    const task = this.subtitleDownloadTasks.get(request.download_id)
    if (!task) {
      return resolveAsync({ ok: false }, options)
    }

    if (task.status === 'queued' || task.status === 'downloading' || task.status === 'verifying') {
      task.status = 'cancelled'
      task.updated_at_ms = Date.now()
      task.completed_at_ms = task.updated_at_ms
      task.eta_sec = null
      task.speed_bps = 0
      task.message = 'mock download cancelled'
    }

    return resolveAsync({ ok: true }, options)
  }

  async readSubtitleModelDownloads(options?: RepositoryRequestOptions): Promise<ReadSubtitleModelDownloadsResponseDto> {
    const tasks = Array.from(this.subtitleDownloadTasks.values()).sort(
      (left, right) => right.started_at_ms - left.started_at_ms,
    )
    return resolveAsync({ tasks }, options)
  }

  async clearSubtitleLocalModel(
    request: ClearSubtitleLocalModelRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ClearSubtitleLocalModelResponseDto> {
    const modelDir = request.model_dir.trim()
    const modelId = request.model_id.trim()
    if (!modelDir || !modelId) {
      return resolveAsync({ ok: false, removed_path: null, message: 'subtitle_model_clear_invalid_input' }, options)
    }

    const currentModels = this.subtitleLocalModelsByDir.get(modelDir) ?? []
    const nextModels = currentModels.filter((item) => item.id !== modelId)
    if (nextModels.length === currentModels.length) {
      return resolveAsync({ ok: false, removed_path: null, message: 'subtitle_model_clear_not_found' }, options)
    }

    this.subtitleLocalModelsByDir.set(modelDir, nextModels)
    return resolveAsync({ ok: true, removed_path: `${modelDir}/${modelId}`, message: null }, options)
  }

  async startSubtitleSession(
    request: StartSubtitleSessionRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StartSubtitleSessionResponseDto> {
    const directmlAvailable = false
    const provider =
      request.provider_preference === 'cpu'
        ? 'cpu'
        : directmlAvailable
          ? 'directml'
          : 'cpu'
    const fallbackApplied =
      (request.provider_preference === 'auto' || request.provider_preference === 'directml') && provider === 'cpu'

    const response: StartSubtitleSessionResponseDto = {
      session_id: `mock-subtitle-session-${Date.now()}`,
      provider,
      fallback_applied: fallbackApplied,
      events: fallbackApplied
        ? [
            {
              code: 'provider_fallback',
              level: 'warning',
              message: 'directml unavailable in mock runtime, fallback to cpu',
              at_ms: Date.now(),
            },
          ]
        : [],
      started_at_ms: Date.now(),
    }

    this.subtitleSessionState = {
      sessionId: response.session_id,
      provider: response.provider,
      running: true,
    }

    return resolveAsync(response, options)
  }

  async stopSubtitleSession(
    request: StopSubtitleSessionRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StopSubtitleSessionResponseDto> {
    void request
    const session = this.subtitleSessionState
    this.subtitleSessionState = null
    return resolveAsync(
      {
        session_id: session?.sessionId ?? null,
        stopped: Boolean(session?.running),
        updated_at_ms: Date.now(),
      },
      options,
    )
  }

  async resetSubtitleSession(
    request: ResetSubtitleSessionRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ResetSubtitleSessionResponseDto> {
    void request
    const session = this.subtitleSessionState
    return resolveAsync(
      {
        session_id: session?.sessionId ?? null,
        ok: Boolean(session?.running),
        events: [],
        updated_at_ms: Date.now(),
      },
      options,
    )
  }

  async flushSubtitleSession(options?: RepositoryRequestOptions): Promise<FlushSubtitleSessionResponseDto> {
    const session = this.subtitleSessionState
    return resolveAsync(
      {
        session_id: session?.sessionId ?? null,
        cues: [],
        events: [],
        updated_at_ms: Date.now(),
      },
      options,
    )
  }

  async pushSubtitleAudio(
    request: PushSubtitleAudioRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<PushSubtitleAudioResponseDto> {
    void request
    const session = this.subtitleSessionState
    return resolveAsync(
      {
        session_id: session?.sessionId ?? null,
        accepted: Boolean(session?.running),
        provider: session?.provider ?? null,
        cues: [],
        events: session?.running
          ? []
          : [
              {
                code: 'session_not_running',
                level: 'warning',
                message: 'subtitle session is not running',
                at_ms: Date.now(),
              },
            ],
        session_epoch: request.session_epoch ?? 0,
        chunk_seq: request.chunk_seq ?? 0,
        queue_len: 0,
        updated_at_ms: Date.now(),
      },
      options,
    )
  }

  async startSubtitlePersistence(
    request: StartSubtitlePersistenceRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<StartSubtitlePersistenceResponseDto> {
    void request
    return resolveAsync(
      {
        enabled: Boolean(this.subtitleSessionState?.running),
        subtitle_path: this.subtitleSessionState?.running ? 'mock://subtitle.auto-live.auto.srt' : null,
        cue_count: 0,
        updated_at_ms: Date.now(),
      },
      options,
    )
  }

  async appendSubtitlePersistence(
    request: AppendSubtitlePersistenceRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<AppendSubtitlePersistenceResponseDto> {
    void request
    return resolveAsync(
      {
        accepted: Boolean(this.subtitleSessionState?.running),
        subtitle_path: this.subtitleSessionState?.running ? 'mock://subtitle.auto-live.auto.srt' : null,
        cue_count: 0,
        accepted_cue_count: 0,
        skipped_inner_cue_count: 0,
        replaced_cue_count: 0,
        updated_at_ms: Date.now(),
      },
      options,
    )
  }

  async readSubtitlePersistenceWindow(
    request: ReadSubtitlePersistenceWindowRequestDto,
    options?: RepositoryRequestOptions,
  ): Promise<ReadSubtitlePersistenceWindowResponseDto> {
    void request
    return resolveAsync(
      {
        subtitle_path: this.subtitleSessionState?.running ? 'mock://subtitle.auto-live.auto.srt' : null,
        cues: [],
        generated_ranges: [],
        timeline_in_generated_range: false,
        timeline_has_cue: false,
        generated_start_sec: null,
        generated_end_sec: null,
        updated_at_ms: Date.now(),
      },
      options,
    )
  }

  clearDatabaseSync(): ClearDatabaseResponseDto {
    return this.write.clearDatabaseSync()
  }

  async clearDatabase(options?: RepositoryRequestOptions): Promise<ClearDatabaseResponseDto> {
    return resolveAsync(this.clearDatabaseSync(), options)
  }
}
