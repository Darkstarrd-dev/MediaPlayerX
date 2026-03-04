import {
  type SetImageHiddenRequestDto,
  type SetImageHiddenResponseDto,
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
  type StartManageAdReviewRequestDto,
  type StartManageAdReviewResponseDto,
  type ReadManageAdReviewTaskRequestDto,
  type ReadManageAdReviewTaskResponseDto,
  type PauseManageAdReviewTaskRequestDto,
  type PauseManageAdReviewTaskResponseDto,
  type TestAdReviewVisionModelRequestDto,
  type TestAdReviewVisionModelResponseDto,
  type ConfirmManageAdReviewDeleteRequestDto,
  type ConfirmManageAdReviewDeleteResponseDto,
  type ReadManageAdReviewKnownHashesResponseDto,
  type ImportManageAdReviewKnownHashesRequestDto,
  type ImportManageAdReviewKnownHashesResponseDto,
  type ExportManageAdReviewKnownHashesRequestDto,
  type ExportManageAdReviewKnownHashesResponseDto,
  type StartManageCoverReviewRequestDto,
  type StartManageCoverReviewResponseDto,
  type ReadManageCoverReviewTaskRequestDto,
  type ReadManageCoverReviewTaskResponseDto,
  type PauseManageCoverReviewTaskRequestDto,
  type PauseManageCoverReviewTaskResponseDto,
  type ConfirmManageCoverReviewHideRequestDto,
  type ConfirmManageCoverReviewHideResponseDto,
  type StartManageSubtitleCleanupRequestDto,
  type StartManageSubtitleCleanupResponseDto,
  type ReadManageSubtitleCleanupTaskRequestDto,
  type ReadManageSubtitleCleanupTaskResponseDto,
  type RunManageSubtitleCleanupRequestDto,
  type RunManageSubtitleCleanupResponseDto,
  type SaveManageSubtitleCleanupRequestDto,
  type SaveManageSubtitleCleanupResponseDto,
  type ImageConvertTaskDto,
  type StartImageConvertTaskRequestDto,
  type StartImageConvertTaskResponseDto,
  type ReadImageConvertTaskRequestDto,
  type ReadImageConvertTaskResponseDto,
  type CancelImageConvertTaskRequestDto,
  type CancelImageConvertTaskResponseDto,
  type AudioTranscodeTaskDto,
  type StartAudioTranscodeTaskRequestDto,
  type StartAudioTranscodeTaskResponseDto,
  type ReadAudioTranscodeCapabilitiesResponseDto,
  type ReadAudioTranscodeTaskRequestDto,
  type ReadAudioTranscodeTaskResponseDto,
  type CancelAudioTranscodeTaskRequestDto,
  type CancelAudioTranscodeTaskResponseDto,
  type VideoTranscodeTaskDto,
  type StartVideoTranscodeTaskRequestDto,
  type StartVideoTranscodeTaskResponseDto,
  type EstimateVideoTranscodeOutputSizeRequestDto,
  type EstimateVideoTranscodeOutputSizeResponseDto,
  type ReadVideoTranscodeCapabilitiesResponseDto,
  type ReadVideoTranscodeTaskRequestDto,
  type ReadVideoTranscodeTaskResponseDto,
  type CancelVideoTranscodeTaskRequestDto,
  type CancelVideoTranscodeTaskResponseDto,
} from "../../src/contracts/backend";
import { FileSystemFacadeContext } from "./types";

interface VideoTranscodeProgressPayload {
  progress: number;
  total_count: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  message: string;
}

export class FileSystemManagementHandlers {
  private readonly imageConvertTasks = new Map<string, ImageConvertTaskDto>();
  private readonly imageConvertTaskRuntime = new Map<
    string,
    { cancelRequested: boolean }
  >();
  private readonly audioTranscodeTasks = new Map<
    string,
    AudioTranscodeTaskDto
  >();
  private readonly audioTranscodeTaskRuntime = new Map<
    string,
    {
      cancelRequested: boolean;
      abortController: AbortController;
    }
  >();
  private readonly videoTranscodeTasks = new Map<
    string,
    VideoTranscodeTaskDto
  >();
  private readonly videoTranscodeTaskRuntime = new Map<
    string,
    {
      cancelRequested: boolean;
      abortController: AbortController;
      lastProgressCommittedAtMs: number;
      pendingProgress: VideoTranscodeProgressPayload | null;
      progressFlushTimer: NodeJS.Timeout | null;
    }
  >();

  private static readonly VIDEO_TRANSCODE_PROGRESS_THROTTLE_MS = 320;

  constructor(private context: FileSystemFacadeContext) {}

  private updateImageConvertTask(
    taskId: string,
    updater: (task: ImageConvertTaskDto) => ImageConvertTaskDto,
  ): ImageConvertTaskDto {
    const currentTask = this.imageConvertTasks.get(taskId);
    if (!currentTask) {
      throw new Error(`image_convert_task_not_found:${taskId}`);
    }
    const nextTask = updater(currentTask);
    this.imageConvertTasks.set(taskId, nextTask);
    return nextTask;
  }

  private isImageConvertCancelledError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }
    return (
      error.name === "ImageConvertCancelledError" ||
      error.message === "image_convert_cancelled"
    );
  }

  private executeImageConvertTask(
    taskId: string,
    request: StartImageConvertTaskRequestDto,
  ): void {
    const runtime = this.imageConvertTaskRuntime.get(taskId);
    if (!runtime) {
      return;
    }

    void this.context.managementMutationService
      .runImageConvertTask(request, {
        isCancelled: () => runtime.cancelRequested,
        onProgress: (payload) => {
          this.updateImageConvertTask(taskId, (task) => ({
            ...task,
            status: "running",
            progress:
              payload.total_count > 0
                ? Math.max(
                    0,
                    Math.min(1, payload.processed_count / payload.total_count),
                  )
                : 0,
            total_count: payload.total_count,
            processed_count: payload.processed_count,
            success_count: payload.success_count,
            failed_count: payload.failed_count,
            message: payload.message,
            updated_at_ms: Date.now(),
          }));
        },
      })
      .then((result) => {
        const nextStatus = runtime.cancelRequested
          ? "cancelled"
          : result.failed_count > 0
            ? "failed"
            : "completed";
        this.updateImageConvertTask(taskId, (task) => ({
          ...task,
          status: nextStatus,
          progress: 1,
          total_count: result.total_count,
          processed_count: result.processed_count,
          success_count: result.success_count,
          failed_count: result.failed_count,
          message: runtime.cancelRequested
            ? "convert task cancelled"
            : nextStatus === "completed"
              ? "convert task completed"
              : "convert task finished with failure",
          error_detail:
            nextStatus === "failed" ? result.first_error_detail : null,
          updated_at_ms: Date.now(),
        }));
      })
      .catch((error) => {
        const cancelled =
          runtime.cancelRequested || this.isImageConvertCancelledError(error);
        const reason =
          error instanceof Error && error.message
            ? error.message
            : String(error);
        this.updateImageConvertTask(taskId, (task) => ({
          ...task,
          status: cancelled ? "cancelled" : "failed",
          message: cancelled ? "convert task cancelled" : "convert task failed",
          error_detail: cancelled ? null : reason,
          updated_at_ms: Date.now(),
        }));
      })
      .finally(() => {
        this.imageConvertTaskRuntime.delete(taskId);
      });
  }

  private updateAudioTranscodeTask(
    taskId: string,
    updater: (task: AudioTranscodeTaskDto) => AudioTranscodeTaskDto,
  ): AudioTranscodeTaskDto {
    const currentTask = this.audioTranscodeTasks.get(taskId);
    if (!currentTask) {
      throw new Error(`audio_transcode_task_not_found:${taskId}`);
    }
    const nextTask = updater(currentTask);
    this.audioTranscodeTasks.set(taskId, nextTask);
    return nextTask;
  }

  private isAudioTranscodeCancelledError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }
    return (
      error.name === "AudioTranscodeCancelledError" ||
      error.message === "audio_transcode_cancelled"
    );
  }

  private isVideoTranscodeCancelledError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }
    return (
      error.name === "VideoTranscodeCancelledError" ||
      error.message === "video_transcode_cancelled"
    );
  }

  private executeAudioTranscodeTask(
    taskId: string,
    request: StartAudioTranscodeTaskRequestDto,
  ): void {
    const runtime = this.audioTranscodeTaskRuntime.get(taskId);
    if (!runtime) {
      return;
    }

    void this.context.managementMutationService
      .runAudioTranscodeTask(request, {
        isCancelled: () => runtime.cancelRequested,
        signal: runtime.abortController.signal,
        onProgress: (payload) => {
          this.updateAudioTranscodeTask(taskId, (task) => ({
            ...task,
            status: "running",
            progress:
              payload.total_count > 0
                ? Math.max(
                    0,
                    Math.min(1, payload.processed_count / payload.total_count),
                  )
                : 0,
            total_count: payload.total_count,
            processed_count: payload.processed_count,
            success_count: payload.success_count,
            failed_count: payload.failed_count,
            message: payload.message,
            updated_at_ms: Date.now(),
          }));
        },
      })
      .then((result) => {
        const nextStatus = runtime.cancelRequested
          ? "cancelled"
          : result.failed_count > 0
            ? "failed"
            : "completed";
        this.updateAudioTranscodeTask(taskId, (task) => ({
          ...task,
          status: nextStatus,
          progress: 1,
          total_count: result.total_count,
          processed_count: result.processed_count,
          success_count: result.success_count,
          failed_count: result.failed_count,
          output_files: result.output_files,
          message: runtime.cancelRequested
            ? "audio transcode task cancelled"
            : nextStatus === "completed"
              ? "audio transcode task completed"
              : "audio transcode task finished with failure",
          error_detail:
            nextStatus === "failed" ? result.first_error_detail : null,
          updated_at_ms: Date.now(),
        }));
      })
      .catch((error) => {
        const cancelled =
          runtime.cancelRequested || this.isAudioTranscodeCancelledError(error);
        const reason =
          error instanceof Error && error.message
            ? error.message
            : String(error);
        this.updateAudioTranscodeTask(taskId, (task) => ({
          ...task,
          status: cancelled ? "cancelled" : "failed",
          message: cancelled
            ? "audio transcode task cancelled"
            : "audio transcode task failed",
          error_detail: cancelled ? null : reason,
          updated_at_ms: Date.now(),
        }));
      })
      .finally(() => {
        this.audioTranscodeTaskRuntime.delete(taskId);
      });
  }

  private updateVideoTranscodeTask(
    taskId: string,
    updater: (task: VideoTranscodeTaskDto) => VideoTranscodeTaskDto,
  ): VideoTranscodeTaskDto {
    const currentTask = this.videoTranscodeTasks.get(taskId);
    if (!currentTask) {
      throw new Error(`video_transcode_task_not_found:${taskId}`);
    }
    const nextTask = updater(currentTask);
    this.videoTranscodeTasks.set(taskId, nextTask);
    return nextTask;
  }

  private applyVideoTranscodeTaskProgress(
    taskId: string,
    payload: VideoTranscodeProgressPayload,
  ): void {
    this.updateVideoTranscodeTask(taskId, (task) => ({
      ...task,
      status: "running",
      progress: Math.max(0, Math.min(1, payload.progress)),
      total_count: payload.total_count,
      processed_count: payload.processed_count,
      success_count: payload.success_count,
      failed_count: payload.failed_count,
      message: payload.message,
      updated_at_ms: Date.now(),
    }));
  }

  private flushPendingVideoTranscodeProgress(taskId: string): void {
    const runtime = this.videoTranscodeTaskRuntime.get(taskId);
    if (!runtime) {
      return;
    }
    if (runtime.progressFlushTimer) {
      clearTimeout(runtime.progressFlushTimer);
      runtime.progressFlushTimer = null;
    }
    if (!runtime.pendingProgress) {
      return;
    }
    const pending = runtime.pendingProgress;
    runtime.pendingProgress = null;
    runtime.lastProgressCommittedAtMs = Date.now();
    this.applyVideoTranscodeTaskProgress(taskId, pending);
  }

  private scheduleVideoTranscodeProgress(
    taskId: string,
    payload: VideoTranscodeProgressPayload,
  ): void {
    const runtime = this.videoTranscodeTaskRuntime.get(taskId);
    if (!runtime) {
      return;
    }
    runtime.pendingProgress = payload;
    const now = Date.now();
    const elapsed = now - runtime.lastProgressCommittedAtMs;
    const throttleMs =
      FileSystemManagementHandlers.VIDEO_TRANSCODE_PROGRESS_THROTTLE_MS;

    if (elapsed >= throttleMs && !runtime.progressFlushTimer) {
      this.flushPendingVideoTranscodeProgress(taskId);
      return;
    }

    if (runtime.progressFlushTimer) {
      return;
    }

    const delayMs = Math.max(0, throttleMs - elapsed);
    runtime.progressFlushTimer = setTimeout(() => {
      const nextRuntime = this.videoTranscodeTaskRuntime.get(taskId);
      if (!nextRuntime) {
        return;
      }
      nextRuntime.progressFlushTimer = null;
      this.flushPendingVideoTranscodeProgress(taskId);
    }, delayMs);
  }

  private executeVideoTranscodeTask(
    taskId: string,
    request: StartVideoTranscodeTaskRequestDto,
  ): void {
    const runtime = this.videoTranscodeTaskRuntime.get(taskId);
    if (!runtime) {
      return;
    }

    void this.context.managementMutationService
      .runVideoTranscodeTask(request, {
        isCancelled: () => runtime.cancelRequested,
        signal: runtime.abortController.signal,
        onProgress: (payload) => {
          this.scheduleVideoTranscodeProgress(taskId, payload);
        },
      })
      .then((result) => {
        this.flushPendingVideoTranscodeProgress(taskId);
        const nextStatus = runtime.cancelRequested
          ? "cancelled"
          : result.failed_count > 0
            ? "failed"
            : "completed";
        this.updateVideoTranscodeTask(taskId, (task) => ({
          ...task,
          status: nextStatus,
          progress: 1,
          total_count: result.total_count,
          processed_count: result.processed_count,
          success_count: result.success_count,
          failed_count: result.failed_count,
          output_files: result.output_files,
          message: runtime.cancelRequested
            ? "video transcode task cancelled"
            : nextStatus === "completed"
              ? "video transcode task completed"
              : "video transcode task finished with failure",
          error_detail:
            nextStatus === "failed" ? result.first_error_detail : null,
          updated_at_ms: Date.now(),
        }));
      })
      .catch((error) => {
        this.flushPendingVideoTranscodeProgress(taskId);
        const cancelled =
          runtime.cancelRequested || this.isVideoTranscodeCancelledError(error);
        const reason =
          error instanceof Error && error.message
            ? error.message
            : String(error);
        this.updateVideoTranscodeTask(taskId, (task) => ({
          ...task,
          status: cancelled ? "cancelled" : "failed",
          message: cancelled
            ? "video transcode task cancelled"
            : "video transcode task failed",
          error_detail: cancelled ? null : reason,
          updated_at_ms: Date.now(),
        }));
      })
      .finally(() => {
        const latestRuntime = this.videoTranscodeTaskRuntime.get(taskId);
        if (latestRuntime?.progressFlushTimer) {
          clearTimeout(latestRuntime.progressFlushTimer);
        }
        this.videoTranscodeTaskRuntime.delete(taskId);
      });
  }

  async setImageHidden(
    request: SetImageHiddenRequestDto,
  ): Promise<SetImageHiddenResponseDto> {
    return this.context.managementMutationService.setImageHidden(request);
  }

  async deleteImageItems(
    request: DeleteImageItemsRequestDto,
  ): Promise<DeleteImageItemsResponseDto> {
    return this.context.managementMutationService.deleteImageItems(request);
  }

  async deleteSidebarNodes(
    request: DeleteSidebarNodesRequestDto,
  ): Promise<DeleteSidebarNodesResponseDto> {
    return this.context.managementMutationService.deleteSidebarNodes(request);
  }

  async moveSidebarNodes(
    request: MoveSidebarNodesRequestDto,
  ): Promise<MoveSidebarNodesResponseDto> {
    return this.context.managementMutationService.moveSidebarNodes(request);
  }

  async renameSidebarNode(
    request: RenameSidebarNodeRequestDto,
  ): Promise<RenameSidebarNodeResponseDto> {
    return this.context.managementMutationService.renameSidebarNode(request);
  }

  async renameSidebarNodes(
    request: RenameSidebarNodesRequestDto,
  ): Promise<RenameSidebarNodesResponseDto> {
    return this.context.managementMutationService.renameSidebarNodes(request);
  }

  async renameItems(
    request: RenameItemsRequestDto,
  ): Promise<RenameItemsResponseDto> {
    return this.context.managementMutationService.renameItems(request);
  }

  async startManageAdReview(
    request: StartManageAdReviewRequestDto,
  ): Promise<StartManageAdReviewResponseDto> {
    return this.context.manageAdReviewService.startManageAdReview(request);
  }

  async readManageAdReviewTask(
    request: ReadManageAdReviewTaskRequestDto,
  ): Promise<ReadManageAdReviewTaskResponseDto> {
    return this.context.manageAdReviewService.readManageAdReviewTask(request);
  }

  async pauseManageAdReviewTask(
    request: PauseManageAdReviewTaskRequestDto,
  ): Promise<PauseManageAdReviewTaskResponseDto> {
    return this.context.manageAdReviewService.pauseManageAdReviewTask(request);
  }

  async testAdReviewVisionModel(
    request: TestAdReviewVisionModelRequestDto,
  ): Promise<TestAdReviewVisionModelResponseDto> {
    return this.context.manageAdReviewService.testAdReviewVisionModel(request);
  }

  async confirmManageAdReviewDelete(
    request: ConfirmManageAdReviewDeleteRequestDto,
  ): Promise<ConfirmManageAdReviewDeleteResponseDto> {
    return this.context.manageAdReviewService.confirmManageAdReviewDelete(
      request,
    );
  }

  async readManageAdReviewKnownHashes(): Promise<ReadManageAdReviewKnownHashesResponseDto> {
    return this.context.manageAdReviewService.readManageAdReviewKnownHashes();
  }

  async importManageAdReviewKnownHashes(
    request: ImportManageAdReviewKnownHashesRequestDto,
  ): Promise<ImportManageAdReviewKnownHashesResponseDto> {
    return this.context.manageAdReviewService.importManageAdReviewKnownHashes(
      request,
    );
  }

  async exportManageAdReviewKnownHashes(
    request: ExportManageAdReviewKnownHashesRequestDto,
  ): Promise<ExportManageAdReviewKnownHashesResponseDto> {
    return this.context.manageAdReviewService.exportManageAdReviewKnownHashes(
      request,
    );
  }

  async startManageCoverReview(
    request: StartManageCoverReviewRequestDto,
  ): Promise<StartManageCoverReviewResponseDto> {
    return this.context.manageCoverReviewService.startManageCoverReview(
      request,
    );
  }

  async readManageCoverReviewTask(
    request: ReadManageCoverReviewTaskRequestDto,
  ): Promise<ReadManageCoverReviewTaskResponseDto> {
    return this.context.manageCoverReviewService.readManageCoverReviewTask(
      request,
    );
  }

  async pauseManageCoverReviewTask(
    request: PauseManageCoverReviewTaskRequestDto,
  ): Promise<PauseManageCoverReviewTaskResponseDto> {
    return this.context.manageCoverReviewService.pauseManageCoverReviewTask(
      request,
    );
  }

  async confirmManageCoverReviewHide(
    request: ConfirmManageCoverReviewHideRequestDto,
  ): Promise<ConfirmManageCoverReviewHideResponseDto> {
    return this.context.manageCoverReviewService.confirmManageCoverReviewHide(
      request,
    );
  }

  async startManageSubtitleCleanup(
    request: StartManageSubtitleCleanupRequestDto,
  ): Promise<StartManageSubtitleCleanupResponseDto> {
    return this.context.libraryReadWriteService.startManageSubtitleCleanup(
      request,
    );
  }

  async readManageSubtitleCleanupTask(
    request: ReadManageSubtitleCleanupTaskRequestDto,
  ): Promise<ReadManageSubtitleCleanupTaskResponseDto> {
    return this.context.libraryReadWriteService.readManageSubtitleCleanupTask(
      request,
    );
  }

  async runManageSubtitleCleanup(
    request: RunManageSubtitleCleanupRequestDto,
  ): Promise<RunManageSubtitleCleanupResponseDto> {
    return this.context.libraryReadWriteService.runManageSubtitleCleanup(
      request,
    );
  }

  async saveManageSubtitleCleanup(
    request: SaveManageSubtitleCleanupRequestDto,
  ): Promise<SaveManageSubtitleCleanupResponseDto> {
    return this.context.libraryReadWriteService.saveManageSubtitleCleanup(
      request,
    );
  }

  async startImageConvertTask(
    request: StartImageConvertTaskRequestDto,
  ): Promise<StartImageConvertTaskResponseDto> {
    const now = Date.now();
    const taskId = `image-convert-${now}-${Math.floor(Math.random() * 100_000)}`;
    const task: ImageConvertTaskDto = {
      task_id: taskId,
      status: "running",
      progress: 0,
      total_count: 0,
      processed_count: 0,
      success_count: 0,
      failed_count: 0,
      message: "convert task started",
      error_detail: null,
      created_at_ms: now,
      updated_at_ms: now,
    };
    this.imageConvertTasks.set(taskId, task);
    this.imageConvertTaskRuntime.set(taskId, { cancelRequested: false });
    this.executeImageConvertTask(taskId, request);
    return { task };
  }

  async readImageConvertTask(
    request: ReadImageConvertTaskRequestDto,
  ): Promise<ReadImageConvertTaskResponseDto> {
    return {
      task: this.imageConvertTasks.get(request.task_id) ?? null,
    };
  }

  async cancelImageConvertTask(
    request: CancelImageConvertTaskRequestDto,
  ): Promise<CancelImageConvertTaskResponseDto> {
    const existingTask = this.imageConvertTasks.get(request.task_id);
    if (!existingTask) {
      throw new Error(`image_convert_task_not_found:${request.task_id}`);
    }
    const runtime = this.imageConvertTaskRuntime.get(request.task_id);
    if (runtime) {
      runtime.cancelRequested = true;
    }
    const isTerminal =
      existingTask.status === "cancelled" ||
      existingTask.status === "completed" ||
      existingTask.status === "failed";
    const nextTask: ImageConvertTaskDto = isTerminal
      ? {
          ...existingTask,
          updated_at_ms: Date.now(),
        }
      : {
          ...existingTask,
          message: "convert task cancellation requested",
          updated_at_ms: Date.now(),
        };
    this.imageConvertTasks.set(nextTask.task_id, nextTask);
    return { task: nextTask };
  }

  async startAudioTranscodeTask(
    request: StartAudioTranscodeTaskRequestDto,
  ): Promise<StartAudioTranscodeTaskResponseDto> {
    const now = Date.now();
    const taskId = `audio-transcode-${now}-${Math.floor(Math.random() * 100_000)}`;
    const task: AudioTranscodeTaskDto = {
      task_id: taskId,
      status: "running",
      progress: 0,
      total_count: 0,
      processed_count: 0,
      success_count: 0,
      failed_count: 0,
      output_files: [],
      message: "audio transcode task started",
      error_detail: null,
      created_at_ms: now,
      updated_at_ms: now,
    };
    this.audioTranscodeTasks.set(taskId, task);
    this.audioTranscodeTaskRuntime.set(taskId, {
      cancelRequested: false,
      abortController: new AbortController(),
    });
    this.executeAudioTranscodeTask(taskId, request);
    return { task };
  }

  async readAudioTranscodeCapabilities(): Promise<ReadAudioTranscodeCapabilitiesResponseDto> {
    return this.context.managementMutationService.readAudioTranscodeCapabilities();
  }

  async readAudioTranscodeTask(
    request: ReadAudioTranscodeTaskRequestDto,
  ): Promise<ReadAudioTranscodeTaskResponseDto> {
    return {
      task: this.audioTranscodeTasks.get(request.task_id) ?? null,
    };
  }

  async cancelAudioTranscodeTask(
    request: CancelAudioTranscodeTaskRequestDto,
  ): Promise<CancelAudioTranscodeTaskResponseDto> {
    const existingTask = this.audioTranscodeTasks.get(request.task_id);
    if (!existingTask) {
      throw new Error(`audio_transcode_task_not_found:${request.task_id}`);
    }
    const runtime = this.audioTranscodeTaskRuntime.get(request.task_id);
    if (runtime) {
      runtime.cancelRequested = true;
      runtime.abortController.abort();
    }
    const isTerminal =
      existingTask.status === "cancelled" ||
      existingTask.status === "completed" ||
      existingTask.status === "failed";
    const nextTask: AudioTranscodeTaskDto = isTerminal
      ? {
          ...existingTask,
          updated_at_ms: Date.now(),
        }
      : {
          ...existingTask,
          message: "audio transcode cancellation requested",
          updated_at_ms: Date.now(),
        };
    this.audioTranscodeTasks.set(nextTask.task_id, nextTask);
    return { task: nextTask };
  }

  async startVideoTranscodeTask(
    request: StartVideoTranscodeTaskRequestDto,
  ): Promise<StartVideoTranscodeTaskResponseDto> {
    const now = Date.now();
    const taskId = `video-transcode-${now}-${Math.floor(Math.random() * 100_000)}`;
    const task: VideoTranscodeTaskDto = {
      task_id: taskId,
      status: "running",
      progress: 0,
      total_count: 0,
      processed_count: 0,
      success_count: 0,
      failed_count: 0,
      output_files: [],
      message: "video transcode task started",
      error_detail: null,
      created_at_ms: now,
      updated_at_ms: now,
    };
    this.videoTranscodeTasks.set(taskId, task);
    this.videoTranscodeTaskRuntime.set(taskId, {
      cancelRequested: false,
      abortController: new AbortController(),
      lastProgressCommittedAtMs: 0,
      pendingProgress: null,
      progressFlushTimer: null,
    });
    this.executeVideoTranscodeTask(taskId, request);
    return { task };
  }

  async readVideoTranscodeCapabilities(): Promise<ReadVideoTranscodeCapabilitiesResponseDto> {
    return this.context.managementMutationService.readVideoTranscodeCapabilities();
  }

  async estimateVideoTranscodeOutputSize(
    request: EstimateVideoTranscodeOutputSizeRequestDto,
  ): Promise<EstimateVideoTranscodeOutputSizeResponseDto> {
    return this.context.managementMutationService.estimateVideoTranscodeOutputSize(
      request,
    );
  }

  async readVideoTranscodeTask(
    request: ReadVideoTranscodeTaskRequestDto,
  ): Promise<ReadVideoTranscodeTaskResponseDto> {
    return {
      task: this.videoTranscodeTasks.get(request.task_id) ?? null,
    };
  }

  async cancelVideoTranscodeTask(
    request: CancelVideoTranscodeTaskRequestDto,
  ): Promise<CancelVideoTranscodeTaskResponseDto> {
    const existingTask = this.videoTranscodeTasks.get(request.task_id);
    if (!existingTask) {
      throw new Error(`video_transcode_task_not_found:${request.task_id}`);
    }
    const runtime = this.videoTranscodeTaskRuntime.get(request.task_id);
    if (runtime) {
      runtime.cancelRequested = true;
      runtime.abortController.abort();
    }
    const isTerminal =
      existingTask.status === "cancelled" ||
      existingTask.status === "completed" ||
      existingTask.status === "failed";
    const nextTask: VideoTranscodeTaskDto = isTerminal
      ? {
          ...existingTask,
          updated_at_ms: Date.now(),
        }
      : {
          ...existingTask,
          message: "video transcode cancellation requested",
          updated_at_ms: Date.now(),
        };
    this.videoTranscodeTasks.set(nextTask.task_id, nextTask);
    return { task: nextTask };
  }
}
