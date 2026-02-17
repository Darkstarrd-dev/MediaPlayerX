import {
  type ReadSubtitleEngineStatusResponseDto,
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
} from '../../src/contracts/backend'
import { FileSystemFacadeContext } from './types'
import { MediaProtocolResponsePayload, MediaProtocolStreamResponsePayload } from '../fileSystemMediaReaders'

export class FileSystemSystemHandlers {
  constructor(public context: FileSystemFacadeContext) {}

  async readRuntimeCapabilities(): Promise<ReadRuntimeCapabilitiesResponseDto> {
    return this.context.runtimeDependencyService.readRuntimeCapabilities()
  }

  async readSubtitleEngineStatus(): Promise<ReadSubtitleEngineStatusResponseDto> {
    return this.context.runtimeDependencyService.readSubtitleEngineStatus()
  }

  async readArchiveLoadStatus(): Promise<ReadArchiveLoadStatusResponseDto> {
    await this.context.ensureStateLoaded()
    return this.context.archiveNormalizationService.readArchiveLoadStatus()
  }

  async clearDatabase(): Promise<ClearDatabaseResponseDto> {
    return this.context.clearDatabase()
  }

  async readMediaAccessAudit(): Promise<MediaAccessAuditResponseDto> {
    return this.context.mediaResourceService.readMediaAccessAudit()
  }

  async enqueueImportTask(request: EnqueueImportTaskRequestDto): Promise<EnqueueImportTaskResponseDto> {
    return this.context.importTaskService.enqueueImportTask(request)
  }

  async readImportTasks(): Promise<{ tasks: ImportTaskDto[] }> {
    return this.context.importTaskService.readImportTasks()
  }

  async retryImportTask(request: RetryImportTaskRequestDto): Promise<RetryImportTaskResponseDto> {
    return this.context.importTaskService.retryImportTask(request)
  }

  async resolveMediaResource(
    request: ResolveMediaResourceRequestDto,
  ): Promise<ResolveMediaResourceResponseDto> {
    return this.context.mediaResourceService.resolveMediaResource(request)
  }

  async readAppState(request: ReadAppStateRequestDto): Promise<ReadAppStateResponseDto> {
    return this.context.libraryReadWriteService.readAppState(request)
  }

  async writeAppState(request: WriteAppStateRequestDto): Promise<WriteAppStateResponseDto> {
    return this.context.libraryReadWriteService.writeAppState(request)
  }

  async readMediaResourceByToken(token: string, rangeHeader: string | null): Promise<MediaProtocolResponsePayload> {
    return this.context.mediaResourceService.readMediaResourceByToken(token, rangeHeader)
  }

  async readMediaResourceByTokenStream(token: string, rangeHeader: string | null, signal?: AbortSignal | null): Promise<MediaProtocolStreamResponsePayload> {
    return this.context.mediaResourceService.readMediaResourceByTokenStream(token, rangeHeader, signal)
  }

  async searchExternalMetadata(request: SearchExternalMetadataRequestDto): Promise<SearchExternalMetadataResponseDto> {
    return this.context.libraryReadWriteService.searchExternalMetadata(request)
  }
}
