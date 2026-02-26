import { promises as fs } from "node:fs";
import path from "node:path";

import {
  manageSubtitleCleanupTaskSchema,
  type ManageSubtitleCleanupTaskDto,
  type ReadManageSubtitleCleanupTaskRequestDto,
  type ReadManageSubtitleCleanupTaskResponseDto,
  type RunManageSubtitleCleanupRequestDto,
  type RunManageSubtitleCleanupResponseDto,
  type SaveManageSubtitleCleanupRequestDto,
  type SaveManageSubtitleCleanupResponseDto,
  type StartManageSubtitleCleanupResponseDto,
} from "../../../src/contracts/backend";
import type { MediaLibraryDatabase } from "../../mediaLibraryDatabase";
import type { RuntimeDependencySnapshot } from "./runtimeDependencyService";
import { runCleanupLlmStreaming, transcribeVideoToSrt } from "./librarySubtitleCleanupOps";

interface LibrarySubtitleCleanupTaskServiceOptions {
  database: MediaLibraryDatabase;
  rootDir: string;
  ffmpegBin: string;
  ensureRuntimeDependencies: () => Promise<RuntimeDependencySnapshot>;
}

export class LibrarySubtitleCleanupTaskService {
  private readonly taskById = new Map<string, ManageSubtitleCleanupTaskDto>();

  constructor(private readonly options: LibrarySubtitleCleanupTaskServiceOptions) {}

  startTask(
    videoId: string,
    videoAbsolutePath: string,
  ): StartManageSubtitleCleanupResponseDto {
    const now = Date.now();
    const taskId = `manage-subtitle-cleanup-${now}-${Math.round(Math.random() * 1_000_000)}`;
    const subtitlePath = path.join(
      path.dirname(videoAbsolutePath),
      `${path.basename(videoAbsolutePath, path.extname(videoAbsolutePath))}.srt`,
    );
    const task: ManageSubtitleCleanupTaskDto = {
      task_id: taskId,
      video_id: videoId,
      subtitle_path: subtitlePath,
      status: "running",
      raw_stage: "pending",
      cleanup_stage: "pending",
      raw_subtitle_text: "",
      cleaned_subtitle_text: "",
      message: "字幕清洗任务进行中",
      error_detail: null,
      created_at_ms: now,
      updated_at_ms: now,
    };

    this.taskById.set(taskId, task);
    void this.executeSubtitleRawTask(taskId, videoAbsolutePath);

    return { task };
  }

  readTask(
    request: ReadManageSubtitleCleanupTaskRequestDto,
  ): ReadManageSubtitleCleanupTaskResponseDto {
    const task = this.taskById.get(request.task_id) ?? null;
    return { task };
  }

  runTask(
    request: RunManageSubtitleCleanupRequestDto,
  ): RunManageSubtitleCleanupResponseDto {
    const task = this.taskById.get(request.task_id);
    if (!task) {
      throw new Error(`字幕清洗失败：任务不存在 ${request.task_id}`);
    }
    if (task.raw_stage !== "ready" || !task.raw_subtitle_text.trim()) {
      throw new Error("字幕清洗失败：请先获取原始字幕");
    }
    if (task.cleanup_stage === "running") {
      return { task };
    }

    const nextTask = this.updateTask(task.task_id, (previous) => ({
      ...previous,
      status: "running",
      cleanup_stage: "running",
      error_detail: null,
      message: "正在进行字幕清洗",
      updated_at_ms: Date.now(),
    }));

    void this.executeSubtitleCleanupStage(
      task.task_id,
      request.llm_endpoint,
      request.llm_model,
      request.llm_prompt,
    );
    return { task: nextTask };
  }

  async saveTask(
    request: SaveManageSubtitleCleanupRequestDto,
  ): Promise<SaveManageSubtitleCleanupResponseDto> {
    const task = this.taskById.get(request.task_id);
    if (!task) {
      throw new Error(`字幕清洗保存失败：任务不存在 ${request.task_id}`);
    }
    const nextText = request.cleaned_subtitle_text;
    await fs.writeFile(task.subtitle_path, nextText, "utf8");

    const nextTask = this.updateTask(task.task_id, (previous) => ({
      ...previous,
      cleaned_subtitle_text: nextText,
      status: previous.status === "failed" ? "failed" : "review",
      message: "字幕清洗结果已保存",
      updated_at_ms: Date.now(),
    }));

    return {
      task: nextTask,
      saved_path: task.subtitle_path,
      updated_at_ms: Date.now(),
    };
  }

  private updateTask(
    taskId: string,
    updater: (task: ManageSubtitleCleanupTaskDto) => ManageSubtitleCleanupTaskDto,
  ): ManageSubtitleCleanupTaskDto {
    const current = this.taskById.get(taskId);
    if (!current) {
      throw new Error(`字幕清洗任务不存在 ${taskId}`);
    }
    const next = manageSubtitleCleanupTaskSchema.parse(updater(current));
    this.taskById.set(taskId, next);
    return next;
  }

  private async executeSubtitleRawTask(
    taskId: string,
    videoPath: string,
  ): Promise<void> {
    try {
      await this.resolveOrGenerateRawSubtitle(taskId, videoPath);

      this.updateTask(taskId, (task) => ({
        ...task,
        status: "review",
        cleanup_stage: task.cleanup_stage === "ready" ? "ready" : "pending",
        message: "原始字幕已就绪，可开始清洗",
        updated_at_ms: Date.now(),
      }));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.updateTask(taskId, (task) => ({
        ...task,
        status: "failed",
        raw_stage: task.raw_stage === "ready" ? "ready" : "failed",
        message: "原始字幕获取失败",
        error_detail: reason,
        updated_at_ms: Date.now(),
      }));
    }
  }

  private async executeSubtitleCleanupStage(
    taskId: string,
    llmEndpoint: string,
    llmModel: string,
    llmPrompt?: string,
  ): Promise<void> {
    try {
      const task = this.taskById.get(taskId);
      if (!task || task.raw_stage !== "ready" || !task.raw_subtitle_text.trim()) {
        throw new Error("字幕清洗失败：原始字幕不可用");
      }

      await runCleanupLlmStreaming({
        taskId,
        llmEndpoint,
        llmModel,
        rawSubtitleText: task.raw_subtitle_text,
        llmPrompt,
        updateTask: this.updateTask.bind(this),
      });

      this.updateTask(taskId, (current) => ({
        ...current,
        status: "review",
        cleanup_stage: "ready",
        message: "字幕清洗完成，可编辑后保存",
        updated_at_ms: Date.now(),
      }));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.updateTask(taskId, (task) => ({
        ...task,
        status: "failed",
        cleanup_stage: task.cleanup_stage === "ready" ? "ready" : "failed",
        message: "字幕清洗失败",
        error_detail: reason,
        updated_at_ms: Date.now(),
      }));
    }
  }

  private async resolveOrGenerateRawSubtitle(
    taskId: string,
    videoPath: string,
  ): Promise<string> {
    const subtitlePath = path.join(
      path.dirname(videoPath),
      `${path.basename(videoPath, path.extname(videoPath))}.srt`,
    );
    const existing = await fs.readFile(subtitlePath, "utf8").catch(() => null);
    if (existing && existing.trim()) {
      this.updateTask(taskId, (task) => ({
        ...task,
        subtitle_path: subtitlePath,
        raw_stage: "ready",
        raw_subtitle_text: existing,
        message: "检测到现有字幕，已载入原稿",
        updated_at_ms: Date.now(),
      }));
      return existing;
    }

    this.updateTask(taskId, (task) => ({
      ...task,
      subtitle_path: subtitlePath,
      raw_stage: "running",
      message: "正在进行字幕识别",
      updated_at_ms: Date.now(),
    }));

    const rawSrtText = await transcribeVideoToSrt({
      videoPath,
      rootDir: this.options.rootDir,
      ffmpegBin: this.options.ffmpegBin,
      database: this.options.database,
      ensureRuntimeDependencies: this.options.ensureRuntimeDependencies,
    });
    await fs.writeFile(subtitlePath, rawSrtText, "utf8");

    this.updateTask(taskId, (task) => ({
      ...task,
      raw_stage: "ready",
      raw_subtitle_text: rawSrtText,
      message: "原始字幕已生成并写入同名 .srt",
      updated_at_ms: Date.now(),
    }));

    return rawSrtText;
  }
}
