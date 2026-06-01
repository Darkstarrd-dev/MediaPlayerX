import {
  type ReadSubtitleEngineStatusResponseDto,
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
  type ReadRuntimeCapabilitiesResponseDto,
  type ReadArchiveLoadStatusResponseDto,
  type ClearDatabaseResponseDto,
  type MediaAccessAuditResponseDto,
  type ResolveMediaResourceRequestDto,
  type ResolveMediaResourceResponseDto,
  type EnqueueImportTaskRequestDto,
  type EnqueueImportTaskResponseDto,
  type RetryImportTaskRequestDto,
  type RetryImportTaskResponseDto,
  type ImportTaskDto,
  type ReadAppStateRequestDto,
  type ReadAppStateResponseDto,
  type WriteAppStateRequestDto,
  type WriteAppStateResponseDto,
  type SearchExternalMetadataRequestDto,
  type SearchExternalMetadataResponseDto,
  type RequestExternalSourceFolderRefreshRequestDto,
  type RequestExternalSourceFolderRefreshResponseDto,
  type SetExternalSourceWatcherEnabledRequestDto,
  type SetExternalSourceWatcherEnabledResponseDto,
} from "../../src/contracts/backend";
import { FileSystemFacadeContext } from "./types";
import {
  MediaProtocolResponsePayload,
  MediaProtocolStreamResponsePayload,
} from "../fileSystemMediaReaders";

export class FileSystemSystemHandlers {
  constructor(public context: FileSystemFacadeContext) {}

  async readRuntimeCapabilities(): Promise<ReadRuntimeCapabilitiesResponseDto> {
    return this.context.runtimeDependencyService.readRuntimeCapabilities();
  }

  async readSubtitleEngineStatus(): Promise<ReadSubtitleEngineStatusResponseDto> {
    return this.context.runtimeDependencyService.readSubtitleEngineStatus();
  }

  async listSubtitleRemoteModels(): Promise<ListSubtitleRemoteModelsResponseDto> {
    return this.context.subtitleModelService.listRemoteModels();
  }

  async listSubtitleLocalModels(
    request: ListSubtitleLocalModelsRequestDto,
  ): Promise<ListSubtitleLocalModelsResponseDto> {
    return this.context.subtitleModelService.listLocalModels(request.model_dir);
  }

  async startSubtitleModelDownload(
    request: StartSubtitleModelDownloadRequestDto,
  ): Promise<StartSubtitleModelDownloadResponseDto> {
    return this.context.subtitleModelService.startDownload(request);
  }

  async cancelSubtitleModelDownload(
    request: CancelSubtitleModelDownloadRequestDto,
  ): Promise<CancelSubtitleModelDownloadResponseDto> {
    return this.context.subtitleModelService.cancelDownload(
      request.download_id,
    );
  }

  async readSubtitleModelDownloads(): Promise<ReadSubtitleModelDownloadsResponseDto> {
    return this.context.subtitleModelService.readDownloadTasks();
  }

  async clearSubtitleLocalModel(
    request: ClearSubtitleLocalModelRequestDto,
  ): Promise<ClearSubtitleLocalModelResponseDto> {
    return this.context.subtitleModelService.clearLocalModel(
      request.model_dir,
      request.model_id,
    );
  }

  async readArchiveLoadStatus(): Promise<ReadArchiveLoadStatusResponseDto> {
    await this.context.ensureStateLoaded();
    return this.context.archiveNormalizationService.readArchiveLoadStatus();
  }

  async clearDatabase(): Promise<ClearDatabaseResponseDto> {
    return this.context.clearDatabase();
  }

  async readMediaAccessAudit(): Promise<MediaAccessAuditResponseDto> {
    return this.context.mediaResourceService.readMediaAccessAudit();
  }

  async enqueueImportTask(
    request: EnqueueImportTaskRequestDto,
  ): Promise<EnqueueImportTaskResponseDto> {
    await this.context.ensureStateLoaded();
    return this.context.importTaskService.enqueueImportTask(request);
  }

  async readImportTasks(): Promise<{ tasks: ImportTaskDto[] }> {
    await this.context.ensureStateLoaded();
    return this.context.importTaskService.readImportTasks();
  }

  async retryImportTask(
    request: RetryImportTaskRequestDto,
  ): Promise<RetryImportTaskResponseDto> {
    await this.context.ensureStateLoaded();
    return this.context.importTaskService.retryImportTask(request);
  }

  async resolveMediaResource(
    request: ResolveMediaResourceRequestDto,
  ): Promise<ResolveMediaResourceResponseDto> {
    return this.context.mediaResourceService.resolveMediaResource(request);
  }

  async readAppState(
    request: ReadAppStateRequestDto,
  ): Promise<ReadAppStateResponseDto> {
    return this.context.libraryReadWriteService.readAppState(request);
  }

  async writeAppState(
    request: WriteAppStateRequestDto,
  ): Promise<WriteAppStateResponseDto> {
    return this.context.libraryReadWriteService.writeAppState(request);
  }

  async readMediaResourceByToken(
    token: string,
    rangeHeader: string | null,
  ): Promise<MediaProtocolResponsePayload> {
    return this.context.mediaResourceService.readMediaResourceByToken(
      token,
      rangeHeader,
    );
  }

  async readMediaResourceByTokenStream(
    token: string,
    rangeHeader: string | null,
    signal?: AbortSignal | null,
  ): Promise<MediaProtocolStreamResponsePayload> {
    return this.context.mediaResourceService.readMediaResourceByTokenStream(
      token,
      rangeHeader,
      signal,
    );
  }

  async searchExternalMetadata(
    request: SearchExternalMetadataRequestDto,
  ): Promise<SearchExternalMetadataResponseDto> {
    return this.context.libraryReadWriteService.searchExternalMetadata(request);
  }

  async requestExternalSourceFolderRefresh(
    request: RequestExternalSourceFolderRefreshRequestDto,
  ): Promise<RequestExternalSourceFolderRefreshResponseDto> {
    return this.context.requestExternalSourceFolderRefresh(request.path_key);
  }

  async setExternalSourceWatcherEnabled(
    request: SetExternalSourceWatcherEnabledRequestDto,
  ): Promise<SetExternalSourceWatcherEnabledResponseDto> {
    return this.context.setExternalSourceWatcherEnabled(request.enabled);
  }
}
