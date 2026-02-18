import { promises as fs } from "node:fs";

import {
  confirmManageAdReviewDeleteResponseSchema,
  manageAdReviewTaskSchema,
  readManageAdReviewTaskResponseSchema,
  startManageAdReviewResponseSchema,
  type ConfirmManageAdReviewDeleteRequestDto,
  type ConfirmManageAdReviewDeleteResponseDto,
  type ImageItemDto,
  type ImagePackageDto,
  type LibrarySnapshotDto,
  type ManageAdReviewCandidateDto,
  type ManageAdReviewImageSourceDto,
  type ManageAdReviewTaskDto,
  type ReadManageAdReviewTaskRequestDto,
  type ReadManageAdReviewTaskResponseDto,
  pauseManageAdReviewTaskResponseSchema,
  testAdReviewVisionModelResponseSchema,
  type StartManageAdReviewRequestDto,
  type StartManageAdReviewResponseDto,
  type PauseManageAdReviewTaskRequestDto,
  type PauseManageAdReviewTaskResponseDto,
  type TestAdReviewVisionModelRequestDto,
  type TestAdReviewVisionModelResponseDto,
} from "../../../src/contracts/backend";
import { assertLocatorAllowed } from "../../fileSystemMediaAccessGuard";
import { readArchiveEntryMedia } from "../../fileSystemMediaReaders";
import { OpenAiVisionClient, runManageAdReview } from "../../manageAdReview";
import type { ManageAdReviewDecision } from "../../manageAdReview";
import {
  DEFAULT_VISION_TEST_TIMEOUT_MS,
  type ParsedSidebarNodeRef,
  applyDecisionToSourceDistribution,
  createEmptySourceDistribution,
  decodeVisionTestImageBytes,
  isValidVisionDescription,
  normalizeImageSource,
  normalizeTaskExecution,
  normalizeSidebarNodeSelection,
  parseSidebarNodeId,
  collectImageIdsForSidebarNode,
  computeSidebarNodeHash,
  resolveCandidateSource,
  toEngineStrategy,
  toImageFileName,
  toTaskAudit,
} from "./manageAdReviewService.utils";
import type {
  ImageEntryRef,
  ManageAdReviewServiceOptions,
  PersistedQueueItem,
  PersistedQueueState,
  ResolvedStartSelection,
  ReviewedNodeHashState,
  RuntimeTaskState,
} from "./manageAdReviewService.types";
import {
  persistKnownHashes,
  readKnownHashes,
  readQueueStateInternal,
  readReviewedNodeHashState,
  writeQueueState,
  writeReviewedNodeHashState,
} from "./manageAdReviewStateStore";

const VISION_TEST_SYSTEM_PROMPT =
  'You are validating vision-model color recognition. Return JSON only: {"is_ad": false, "reason": "<dominant color>"}. The reason must be the dominant color you see in the image.';
const VISION_TEST_USER_PROMPT =
  "What is the dominant color of this image? Return JSON only with is_ad and reason.";

export class ManageAdReviewService {
  private readonly tasks = new Map<string, RuntimeTaskState>();

  private queueInitialized = false;

  constructor(private readonly options: ManageAdReviewServiceOptions) {
    this.ensureQueueInitialized();
  }

  async startManageAdReview(
    request: StartManageAdReviewRequestDto,
  ): Promise<StartManageAdReviewResponseDto> {
    const snapshot = await this.options.ensureSnapshotLoaded();
    const imageById = this.buildImageById(snapshot);
    const selection = this.resolveStartSelection(request, snapshot, imageById);
    if (
      request.selection_scope === "image" &&
      selection.selectedImageIds.length === 0
    ) {
      throw new Error("广告审核失败：未选中图片");
    }
    if (
      request.selection_scope === "sidebar" &&
      selection.selectedImageIds.length === 0 &&
      selection.skippedNodeIds.length === 0
    ) {
      throw new Error("广告审核失败：未选中图片");
    }

    const queue = this.readQueueState();
    const hasRunningTask = queue.items.some(
      (item) => item.task.status === "running",
    );

    const now = Date.now();
    const taskId = `manage-ad-review-${now}-${Math.round(Math.random() * 1_000_000)}`;
    const execution = normalizeTaskExecution(request);
    const normalizedRequest: StartManageAdReviewRequestDto = {
      ...request,
      strategy: execution.strategy,
      max_concurrency: execution.max_concurrency,
    };
    const noNeedToRun = selection.selectedImageIds.length === 0;
    const initialStatus: ManageAdReviewTaskDto["status"] = noNeedToRun
      ? "review"
      : hasRunningTask
        ? "pending"
        : "running";
    const task: ManageAdReviewTaskDto = {
      task_id: taskId,
      status: initialStatus,
      progress: noNeedToRun ? 1 : 0,
      total_count: selection.selectedImageIds.length,
      reviewed_count: 0,
      suspected_count: 0,
      failed_count: 0,
      known_hash_hits: 0,
      llm_calls: 0,
      scope_image_ids: selection.selectedImageIds,
      image_source_by_id: {},
      execution,
      audit: toTaskAudit({
        sourceDistribution: createEmptySourceDistribution(),
        suspectedCount: 0,
        totalCount: selection.selectedImageIds.length,
      }),
      message: noNeedToRun
        ? "已审核(未变更)，无需执行"
        : initialStatus === "pending"
          ? "排队中，等待前序任务完成"
          : "广告审核任务进行中",
      error_detail: null,
      candidates: [],
      created_at_ms: now,
      updated_at_ms: now,
    };

    const persistedItem: PersistedQueueItem = {
      task,
      request: normalizedRequest,
      effective_node_ids: selection.effectiveNodeIds,
      skipped_node_ids: selection.skippedNodeIds,
      node_hash_by_id: selection.nodeHashById,
    };

    queue.items.push(persistedItem);
    this.writeQueueState(queue);

    if (task.status === "running") {
      const runtimeTask: RuntimeTaskState = {
        task,
        request: normalizedRequest,
        effectiveNodeIds: selection.effectiveNodeIds,
        nodeHashById: selection.nodeHashById,
        candidateHashByImageId: new Map<string, string>(),
        abortController: new AbortController(),
        pauseRequested: false,
      };
      this.tasks.set(taskId, runtimeTask);

      void this.executeTask(taskId, selection.selectedImageIds, imageById);
    }

    return startManageAdReviewResponseSchema.parse({
      task,
    });
  }

  async readManageAdReviewTask(
    request: ReadManageAdReviewTaskRequestDto,
  ): Promise<ReadManageAdReviewTaskResponseDto> {
    const runtimeTask = this.tasks.get(request.task_id);
    if (runtimeTask) {
      return readManageAdReviewTaskResponseSchema.parse({
        task: runtimeTask.task,
      });
    }

    const queueItem = this.findQueueItem(request.task_id);
    return readManageAdReviewTaskResponseSchema.parse({
      task: queueItem?.task ?? null,
    });
  }

  async pauseManageAdReviewTask(
    request: PauseManageAdReviewTaskRequestDto,
  ): Promise<PauseManageAdReviewTaskResponseDto> {
    const queueItem = this.findQueueItem(request.task_id);
    if (!queueItem) {
      throw new Error(`AI广告审核暂停失败：任务不存在 ${request.task_id}`);
    }

    const runtimeTask = this.tasks.get(request.task_id);
    let nextTask = queueItem.task;

    if (runtimeTask && runtimeTask.task.status === "running") {
      runtimeTask.pauseRequested = true;
      runtimeTask.abortController?.abort();
      runtimeTask.task = {
        ...runtimeTask.task,
        status: "paused",
        message: "AI广告审核已暂停",
        error_detail: null,
        updated_at_ms: Date.now(),
      };
      nextTask = runtimeTask.task;
    } else if (queueItem.task.status === "running") {
      nextTask = {
        ...queueItem.task,
        status: "paused",
        message: "AI广告审核已暂停",
        error_detail: null,
        updated_at_ms: Date.now(),
      };
    }

    this.updateQueueTask(nextTask.task_id, () => nextTask);

    return pauseManageAdReviewTaskResponseSchema.parse({
      task: nextTask,
    });
  }

  async testAdReviewVisionModel(
    request: TestAdReviewVisionModelRequestDto,
  ): Promise<TestAdReviewVisionModelResponseDto> {
    const timeoutMs = Number.isFinite(request.timeout_ms)
      ? Math.max(
          1_000,
          Math.min(60_000, Math.floor(request.timeout_ms as number)),
        )
      : DEFAULT_VISION_TEST_TIMEOUT_MS;

    try {
      const imageBytes = decodeVisionTestImageBytes(request.image_base64);
      const client = new OpenAiVisionClient({
        endpoint: request.llm_endpoint,
        model: request.llm_model,
        apiKey: process.env.MEDIA_PLAYERX_LLM_API_KEY,
        timeoutMs,
        systemPrompt: VISION_TEST_SYSTEM_PROMPT,
        userPrompt: VISION_TEST_USER_PROMPT,
      });

      const detection = await client.detectAd({
        imageBytes,
      });

      const normalizedReason = detection.reason.trim();
      if (!isValidVisionDescription(normalizedReason)) {
        return testAdReviewVisionModelResponseSchema.parse({
          ok: false,
          message: "模型测试失败：模型未返回红色作为图片颜色",
        });
      }

      return testAdReviewVisionModelResponseSchema.parse({
        ok: true,
        message: "模型响应正常",
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return testAdReviewVisionModelResponseSchema.parse({
        ok: false,
        message: `模型测试失败：${reason}`,
      });
    }
  }

  async confirmManageAdReviewDelete(
    request: ConfirmManageAdReviewDeleteRequestDto,
  ): Promise<ConfirmManageAdReviewDeleteResponseDto> {
    const queueItem = this.findQueueItem(request.task_id);
    if (!queueItem) {
      throw new Error(`广告审核删除失败：任务不存在 ${request.task_id}`);
    }
    if (queueItem.task.status !== "review") {
      throw new Error("广告审核删除失败：任务尚未进入复核阶段");
    }

    const runtimeTask = this.tasks.get(request.task_id);
    const candidateHashByImageId = runtimeTask
      ? runtimeTask.candidateHashByImageId
      : new Map(
          queueItem.task.candidates.map((candidate) => [
            candidate.image_id,
            candidate.hash,
          ]),
        );

    const candidateIdSet = new Set(
      queueItem.task.candidates.map((item) => item.image_id),
    );
    const normalizedIds = Array.from(
      new Set(
        request.image_ids
          .map((value) => value.trim())
          .filter((value) => value.length > 0 && candidateIdSet.has(value)),
      ),
    );
    if (normalizedIds.length === 0) {
      throw new Error("广告审核删除失败：未选中候选项");
    }

    const response = await this.options.deleteImageItems({
      image_ids: normalizedIds,
    });

    const failedImageIdSet = new Set(
      response.failed.map((item) => item.image_id),
    );
    const deletedImageIds = normalizedIds.filter(
      (imageId) => !failedImageIdSet.has(imageId),
    );
    if (deletedImageIds.length > 0) {
      await this.persistKnownHashes(deletedImageIds, candidateHashByImageId);
    }

    const deletedImageIdSet = new Set(deletedImageIds);
    const nextImageSourceById = { ...queueItem.task.image_source_by_id };
    for (const imageId of deletedImageIds) {
      delete nextImageSourceById[imageId];
    }

    const nextCandidates = queueItem.task.candidates.filter(
      (item) => !deletedImageIdSet.has(item.image_id),
    );

    const nextTask: ManageAdReviewTaskDto = {
      ...queueItem.task,
      candidates: nextCandidates,
      suspected_count: nextCandidates.length,
      scope_image_ids: queueItem.task.scope_image_ids.filter(
        (imageId) => !deletedImageIdSet.has(imageId),
      ),
      image_source_by_id: nextImageSourceById,
      updated_at_ms: Date.now(),
      message:
        deletedImageIds.length > 0
          ? `已删除 ${deletedImageIds.length} 张疑似广告`
          : response.failed.length > 0
            ? "删除失败"
            : queueItem.task.message,
    };

    this.updateQueueTask(nextTask.task_id, () => nextTask);

    if (runtimeTask) {
      runtimeTask.task = nextTask;
    }

    for (const imageId of deletedImageIds) {
      candidateHashByImageId.delete(imageId);
    }

    if (queueItem.effective_node_ids.length > 0) {
      const snapshot = await this.options.ensureSnapshotLoaded();
      this.updateReviewedNodeHashes(queueItem.effective_node_ids, snapshot);
    }

    return confirmManageAdReviewDeleteResponseSchema.parse({
      task: nextTask,
      deleted_count: response.deleted_count,
      failed: response.failed,
      updated_at_ms: Date.now(),
    });
  }

  private buildImageById(
    snapshot: LibrarySnapshotDto,
  ): Map<string, ImageEntryRef> {
    const imageById = new Map<string, ImageEntryRef>();
    for (const source of [
      ...snapshot.image_packages,
      ...snapshot.image_directories,
    ]) {
      for (const image of source.images) {
        imageById.set(image.id, {
          source,
          image,
        });
      }
    }
    return imageById;
  }

  private resolveStartSelection(
    request: StartManageAdReviewRequestDto,
    snapshot: LibrarySnapshotDto,
    imageById: Map<string, ImageEntryRef>,
  ): ResolvedStartSelection {
    if (request.selection_scope === "image") {
      return {
        selectedImageIds: Array.from(
          new Set(
            (request.image_ids ?? [])
              .map((value) => value.trim())
              .filter((value) => value.length > 0 && imageById.has(value)),
          ),
        ),
        effectiveNodeIds: [],
        skippedNodeIds: [],
        nodeHashById: {},
      };
    }

    const sources = [...snapshot.image_packages, ...snapshot.image_directories];
    const parsedTargets = normalizeSidebarNodeSelection(
      (request.node_ids ?? [])
        .map((nodeId) => parseSidebarNodeId(nodeId))
        .filter((value): value is ParsedSidebarNodeRef => Boolean(value))
        .filter((value) => value.kind === "folder" || value.kind === "package"),
    );
    const skipReviewedNodes = request.skip_reviewed_nodes ?? true;
    const reviewedNodeHashById =
      this.readReviewedNodeHashState().node_hash_by_id;

    const selectedImageIdSet = new Set<string>();
    const effectiveNodeIds: string[] = [];
    const skippedNodeIds: string[] = [];
    const nodeHashById: Record<string, string> = {};

    for (const target of parsedTargets) {
      const nodeId = `${target.kind}:${target.pathKey}`;
      const nodeHash = computeSidebarNodeHash(target, sources);
      nodeHashById[nodeId] = nodeHash;

      if (
        skipReviewedNodes &&
        reviewedNodeHashById[nodeId]?.node_hash === nodeHash
      ) {
        skippedNodeIds.push(nodeId);
        continue;
      }

      effectiveNodeIds.push(nodeId);
      const imageIds = collectImageIdsForSidebarNode(target, sources);
      for (const imageId of imageIds) {
        if (imageById.has(imageId)) {
          selectedImageIdSet.add(imageId);
        }
      }
    }

    return {
      selectedImageIds: Array.from(selectedImageIdSet),
      effectiveNodeIds,
      skippedNodeIds,
      nodeHashById,
    };
  }

  private resolveSelectedImageIdsFromNodeId(
    nodeId: string,
    snapshot: LibrarySnapshotDto,
    imageById: Map<string, ImageEntryRef>,
  ): string[] {
    const parsed = parseSidebarNodeId(nodeId);
    if (!parsed || (parsed.kind !== "folder" && parsed.kind !== "package")) {
      return [];
    }

    const sources = [...snapshot.image_packages, ...snapshot.image_directories];
    return collectImageIdsForSidebarNode(parsed, sources).filter((imageId) =>
      imageById.has(imageId),
    );
  }

  private computeNodeHashById(
    nodeId: string,
    snapshot: LibrarySnapshotDto,
  ): string | null {
    const parsed = parseSidebarNodeId(nodeId);
    if (!parsed || (parsed.kind !== "folder" && parsed.kind !== "package")) {
      return null;
    }

    return computeSidebarNodeHash(parsed, [
      ...snapshot.image_packages,
      ...snapshot.image_directories,
    ]);
  }

  private updateReviewedNodeHashes(
    nodeIds: string[],
    snapshot: LibrarySnapshotDto,
  ): void {
    if (nodeIds.length === 0) {
      return;
    }

    const reviewedNodeHashState = this.readReviewedNodeHashState();
    const now = Date.now();
    let changed = false;

    for (const nodeId of nodeIds) {
      const nodeHash = this.computeNodeHashById(nodeId, snapshot);
      if (!nodeHash) {
        continue;
      }

      const previous = reviewedNodeHashState.node_hash_by_id[nodeId];
      if (previous?.node_hash === nodeHash) {
        continue;
      }

      reviewedNodeHashState.node_hash_by_id[nodeId] = {
        node_hash: nodeHash,
        updated_at_ms: now,
      };
      changed = true;
    }

    if (changed) {
      this.writeReviewedNodeHashState(reviewedNodeHashState);
    }
  }

  private collectEffectiveNodeImageIds(
    effectiveNodeIds: string[],
    snapshot: LibrarySnapshotDto,
    imageById: Map<string, ImageEntryRef>,
  ): string[] {
    const selected = new Set<string>();
    for (const nodeId of effectiveNodeIds) {
      const imageIds = this.resolveSelectedImageIdsFromNodeId(
        nodeId,
        snapshot,
        imageById,
      );
      for (const imageId of imageIds) {
        selected.add(imageId);
      }
    }

    return Array.from(selected);
  }

  private async executeTask(
    taskId: string,
    selectedImageIds: string[],
    imageById: Map<string, ImageEntryRef>,
  ): Promise<void> {
    const runtimeTask = this.tasks.get(taskId);
    if (!runtimeTask) {
      return;
    }

    runtimeTask.pauseRequested = false;
    if (
      !runtimeTask.abortController ||
      runtimeTask.abortController.signal.aborted
    ) {
      runtimeTask.abortController = new AbortController();
    }
    const runSignal = runtimeTask.abortController.signal;
    const request = runtimeTask.request;
    const taskExecution =
      runtimeTask.task.execution ?? normalizeTaskExecution(request);
    let shouldStartNextPending = false;

    try {
      const snapshot = await this.options.ensureSnapshotLoaded();
      const latestImageById = this.buildImageById(snapshot);
      imageById = latestImageById;

      if (request.selection_scope === "sidebar") {
        selectedImageIds = this.collectEffectiveNodeImageIds(
          runtimeTask.effectiveNodeIds,
          snapshot,
          imageById,
        );
      } else {
        selectedImageIds = selectedImageIds.filter((imageId) =>
          imageById.has(imageId),
        );
      }

      runtimeTask.task = {
        ...runtimeTask.task,
        total_count: selectedImageIds.length,
        scope_image_ids: selectedImageIds,
        execution: taskExecution,
        audit: toTaskAudit({
          sourceDistribution: createEmptySourceDistribution(),
          suspectedCount: 0,
          totalCount: selectedImageIds.length,
        }),
        updated_at_ms: Date.now(),
      };
      this.updateQueueTask(taskId, () => runtimeTask.task);

      if (selectedImageIds.length === 0) {
        runtimeTask.task = {
          ...runtimeTask.task,
          status: "review",
          progress: 1,
          reviewed_count: 0,
          suspected_count: 0,
          failed_count: 0,
          known_hash_hits: 0,
          llm_calls: 0,
          image_source_by_id: {},
          audit: toTaskAudit({
            sourceDistribution: createEmptySourceDistribution(),
            suspectedCount: 0,
            totalCount: 0,
          }),
          message: "已审核(未变更)，无需执行",
          error_detail: null,
          candidates: [],
          updated_at_ms: Date.now(),
        };
        this.updateQueueTask(taskId, () => runtimeTask.task);
        shouldStartNextPending = true;
        return;
      }

      const knownHashes = this.readKnownHashes();
      const client = new OpenAiVisionClient({
        endpoint: request.llm_endpoint,
        model: request.llm_model,
        apiKey: process.env.MEDIA_PLAYERX_LLM_API_KEY,
      });

      const runSelection = async (imageIds: string[]) => {
        const groupedBySource = new Map<
          string,
          Array<{ source: ImagePackageDto; image: ImageItemDto }>
        >();
        for (const imageId of imageIds) {
          const found = imageById.get(imageId);
          if (!found) {
            continue;
          }

          const list = groupedBySource.get(found.source.id) ?? [];
          list.push({
            source: found.source,
            image: found.image,
          });
          groupedBySource.set(found.source.id, list);
        }

        return runManageAdReview(
          {
            containers: Array.from(groupedBySource.entries()).map(
              ([sourceId, entries]) => ({
                containerId: sourceId,
                images: entries.map(({ image }) => ({
                  imageId: image.id,
                  ordinal: image.ordinal,
                  fileName: toImageFileName(image) ?? undefined,
                  getImageBytes: async () => this.readImageBytes(image),
                })),
              }),
            ),
          },
          {
            client,
            hashStore: {
              has: async (hash) => knownHashes.has(hash.trim().toLowerCase()),
              addMany: async () => {
                // confirmed 删除后再持久化，审核阶段不写入 known-hash。
              },
            },
            concurrency: taskExecution.max_concurrency,
            strategy: toEngineStrategy(taskExecution),
            signal: runSignal,
            onEvent: (event) => {
              const currentTask = this.tasks.get(taskId);
              if (!currentTask || currentTask.task.status !== "running") {
                return;
              }

              if (event.type !== "image-reviewed") {
                return;
              }

              const reviewedCount = Math.min(
                currentTask.task.total_count,
                currentTask.task.reviewed_count + 1,
              );
              const suspectedCount =
                currentTask.task.suspected_count +
                (event.status === "suspected" ? 1 : 0);
              const failedCount =
                currentTask.task.failed_count +
                (event.status === "failed" ? 1 : 0);
              const nextSourceDistribution = applyDecisionToSourceDistribution(
                currentTask.task.audit?.source_distribution ??
                  createEmptySourceDistribution(),
                {
                  source: event.source,
                  status: event.status,
                },
              );

              const llmCalls =
                nextSourceDistribution.llm_suspected +
                nextSourceDistribution.llm_clean +
                nextSourceDistribution.llm_failed;

              const nextImageSourceById: Record<
                string,
                ManageAdReviewImageSourceDto
              > = {
                ...currentTask.task.image_source_by_id,
                [event.imageId]: normalizeImageSource(event.source),
              };

              let nextCandidates = currentTask.task.candidates;
              const imageEntry = imageById.get(event.imageId);
              if (event.status === "suspected" && imageEntry) {
                const normalizedReason = event.reason.trim() || "suspected_ad";
                const normalizedHash =
                  event.hash.trim().toLowerCase() ||
                  `missing-hash-${event.imageId}`;
                const nextCandidate: ManageAdReviewCandidateDto = {
                  image_id: event.imageId,
                  package_id: imageEntry.source.id,
                  package_name: imageEntry.source.package_name,
                  display_name: imageEntry.source.display_name,
                  ordinal: imageEntry.image.ordinal,
                  file_name: toImageFileName(imageEntry.image),
                  reason: normalizedReason,
                  source: resolveCandidateSource(event.source),
                  hash: normalizedHash,
                };

                const candidateByImageId = new Map(
                  currentTask.task.candidates.map((candidate) => [
                    candidate.image_id,
                    candidate,
                  ]),
                );
                candidateByImageId.set(nextCandidate.image_id, nextCandidate);
                nextCandidates = Array.from(candidateByImageId.values()).sort(
                  (left, right) => {
                    if (left.package_id !== right.package_id) {
                      return left.package_id.localeCompare(right.package_id);
                    }
                    return left.ordinal - right.ordinal;
                  },
                );
                currentTask.candidateHashByImageId.set(
                  nextCandidate.image_id,
                  nextCandidate.hash,
                );
              }

              currentTask.task = {
                ...currentTask.task,
                reviewed_count: reviewedCount,
                suspected_count: suspectedCount,
                failed_count: failedCount,
                known_hash_hits: nextSourceDistribution.known_hash,
                llm_calls: llmCalls,
                image_source_by_id: nextImageSourceById,
                candidates: nextCandidates,
                audit: toTaskAudit({
                  sourceDistribution: nextSourceDistribution,
                  suspectedCount,
                  totalCount: currentTask.task.total_count,
                }),
                progress:
                  currentTask.task.total_count > 0
                    ? reviewedCount / currentTask.task.total_count
                    : 1,
                updated_at_ms: Date.now(),
              };
            },
          },
        );
      };

      if (
        request.selection_scope === "sidebar" &&
        runtimeTask.effectiveNodeIds.length > 0
      ) {
        const totalNodeCount = runtimeTask.effectiveNodeIds.length;
        for (
          let nodeIndex = 0;
          nodeIndex < runtimeTask.effectiveNodeIds.length;
          nodeIndex += 1
        ) {
          const nodeId = runtimeTask.effectiveNodeIds[nodeIndex];
          const nodeImageIds = this.resolveSelectedImageIdsFromNodeId(
            nodeId,
            snapshot,
            imageById,
          );
          if (nodeImageIds.length === 0) {
            this.updateReviewedNodeHashes([nodeId], snapshot);
            continue;
          }

          const result = await runSelection(nodeImageIds);
          const nextCandidates = this.mergeCandidates(
            runtimeTask.task.candidates,
            this.buildCandidates(result.items, imageById),
          );
          runtimeTask.candidateHashByImageId = new Map(
            nextCandidates.map((candidate) => [
              candidate.image_id,
              candidate.hash,
            ]),
          );
          runtimeTask.task = {
            ...runtimeTask.task,
            candidates: nextCandidates,
            message: `节点 ${nodeIndex + 1}/${totalNodeCount} 已完成，疑似 ${nextCandidates.length} 张`,
            updated_at_ms: Date.now(),
          };
          this.updateQueueTask(taskId, () => runtimeTask.task);
          this.updateReviewedNodeHashes([nodeId], snapshot);
        }
      } else {
        const result = await runSelection(selectedImageIds);
        const candidates = this.buildCandidates(result.items, imageById);
        runtimeTask.candidateHashByImageId = new Map(
          candidates.map((candidate) => [candidate.image_id, candidate.hash]),
        );
        runtimeTask.task = {
          ...runtimeTask.task,
          candidates,
          updated_at_ms: Date.now(),
        };
      }

      runtimeTask.task = {
        ...runtimeTask.task,
        status: "review",
        progress: 1,
        message:
          runtimeTask.task.candidates.length > 0
            ? `审核完成：疑似 ${runtimeTask.task.candidates.length} 张`
            : "审核完成：未发现疑似广告",
        error_detail: null,
        updated_at_ms: Date.now(),
      };
      this.updateQueueTask(taskId, () => runtimeTask.task);
      shouldStartNextPending = true;
      runtimeTask.pauseRequested = false;
    } catch (error) {
      const isAbortError =
        error instanceof Error && error.name === "AbortError";
      if (
        isAbortError &&
        (runtimeTask.pauseRequested || runtimeTask.task.status === "paused")
      ) {
        runtimeTask.task = {
          ...runtimeTask.task,
          status: "paused",
          message: "AI广告审核已暂停",
          error_detail: null,
          updated_at_ms: Date.now(),
        };
        this.updateQueueTask(taskId, () => runtimeTask.task);
        return;
      }

      const reason = error instanceof Error ? error.message : String(error);
      runtimeTask.task = {
        ...runtimeTask.task,
        status: "failed",
        message: "AI广告审核失败",
        error_detail: reason,
        updated_at_ms: Date.now(),
      };
      this.updateQueueTask(taskId, () => runtimeTask.task);
      shouldStartNextPending = true;
    } finally {
      runtimeTask.abortController = null;
      runtimeTask.pauseRequested = false;
      if (runtimeTask.task.status !== "running") {
        this.tasks.delete(taskId);
      }
      if (shouldStartNextPending) {
        await this.startNextPendingTaskIfIdle();
      }
    }
  }

  private buildCandidates(
    decisions: ManageAdReviewDecision[],
    imageById: Map<string, ImageEntryRef>,
  ): ManageAdReviewCandidateDto[] {
    const candidates: ManageAdReviewCandidateDto[] = [];

    for (const decision of decisions) {
      if (decision.status !== "suspected") {
        continue;
      }

      const found = imageById.get(decision.imageId);
      if (!found) {
        continue;
      }

      candidates.push({
        image_id: decision.imageId,
        package_id: found.source.id,
        package_name: found.source.package_name,
        display_name: found.source.display_name,
        ordinal: found.image.ordinal,
        file_name: toImageFileName(found.image),
        reason: decision.reason.trim() || "suspected_ad",
        source: resolveCandidateSource(decision.source),
        hash: decision.hash,
      });
    }

    candidates.sort((left, right) => {
      if (left.package_id !== right.package_id) {
        return left.package_id.localeCompare(right.package_id);
      }
      return left.ordinal - right.ordinal;
    });

    return candidates;
  }

  private mergeCandidates(
    previous: ManageAdReviewCandidateDto[],
    incoming: ManageAdReviewCandidateDto[],
  ): ManageAdReviewCandidateDto[] {
    const candidateByImageId = new Map<string, ManageAdReviewCandidateDto>();
    for (const candidate of previous) {
      candidateByImageId.set(candidate.image_id, candidate);
    }
    for (const candidate of incoming) {
      candidateByImageId.set(candidate.image_id, candidate);
    }

    return Array.from(candidateByImageId.values()).sort((left, right) => {
      if (left.package_id !== right.package_id) {
        return left.package_id.localeCompare(right.package_id);
      }
      return left.ordinal - right.ordinal;
    });
  }

  private async readImageBytes(image: ImageItemDto): Promise<Uint8Array> {
    const context = this.options.buildMediaAccessContext();
    const allowedLocator = await assertLocatorAllowed(
      image.media_locator,
      context,
    );

    if (allowedLocator.kind === "filesystem") {
      return fs.readFile(allowedLocator.absolute_path);
    }

    const payload = await readArchiveEntryMedia(
      allowedLocator,
      allowedLocator.mime_type,
      this.options.getZipEntryIndexByPath(),
    );
    return payload.body;
  }

  private ensureQueueInitialized(): void {
    if (this.queueInitialized) {
      return;
    }

    const queue = this.readQueueStateInternal();
    let changed = false;

    queue.items = queue.items.map((item) => {
      if (item.task.status !== "running") {
        return item;
      }

      changed = true;
      return {
        ...item,
        task: {
          ...item.task,
          status: "paused",
          message: "AI广告审核已暂停",
          error_detail: null,
          updated_at_ms: Date.now(),
        },
      };
    });

    if (changed) {
      this.writeQueueState(queue);
    }

    this.queueInitialized = true;
  }

  private readQueueState(): PersistedQueueState {
    this.ensureQueueInitialized();
    return this.readQueueStateInternal();
  }

  private readQueueStateInternal(): PersistedQueueState {
    return readQueueStateInternal(this.options.database);
  }

  private writeQueueState(state: PersistedQueueState): void {
    writeQueueState(this.options.database, state);
  }

  private readReviewedNodeHashState(): ReviewedNodeHashState {
    return readReviewedNodeHashState(this.options.database);
  }

  private writeReviewedNodeHashState(state: ReviewedNodeHashState): void {
    writeReviewedNodeHashState(this.options.database, state);
  }

  private findQueueItem(taskId: string): PersistedQueueItem | null {
    const queue = this.readQueueState();
    return queue.items.find((item) => item.task.task_id === taskId) ?? null;
  }

  private updateQueueTask(
    taskId: string,
    updater: (
      task: ManageAdReviewTaskDto,
      item: PersistedQueueItem,
    ) => ManageAdReviewTaskDto,
  ): PersistedQueueItem | null {
    const queue = this.readQueueState();
    let changed = false;
    let updatedItem: PersistedQueueItem | null = null;

    queue.items = queue.items.map((item) => {
      if (item.task.task_id !== taskId) {
        return item;
      }

      const nextTask = manageAdReviewTaskSchema.parse(updater(item.task, item));
      changed = true;
      updatedItem = {
        ...item,
        task: nextTask,
      };
      return updatedItem;
    });

    if (changed) {
      this.writeQueueState(queue);
    }

    return updatedItem;
  }

  private async startNextPendingTaskIfIdle(): Promise<void> {
    const queue = this.readQueueState();
    if (queue.items.some((item) => item.task.status === "running")) {
      return;
    }

    const pendingItem = queue.items.find(
      (item) => item.task.status === "pending",
    );
    if (!pendingItem) {
      return;
    }

    const snapshot = await this.options.ensureSnapshotLoaded();
    const imageById = this.buildImageById(snapshot);
    const selectedImageIds =
      pendingItem.request.selection_scope === "sidebar"
        ? this.collectEffectiveNodeImageIds(
            pendingItem.effective_node_ids,
            snapshot,
            imageById,
          )
        : pendingItem.task.scope_image_ids.filter((imageId) =>
            imageById.has(imageId),
          );

    const noNeedToRun = selectedImageIds.length === 0;
    const now = Date.now();
    const nextTask: ManageAdReviewTaskDto = {
      ...pendingItem.task,
      status: noNeedToRun ? "review" : "running",
      progress: noNeedToRun ? 1 : 0,
      total_count: selectedImageIds.length,
      reviewed_count: 0,
      suspected_count: 0,
      failed_count: 0,
      known_hash_hits: 0,
      llm_calls: 0,
      scope_image_ids: selectedImageIds,
      image_source_by_id: {},
      audit: toTaskAudit({
        sourceDistribution: createEmptySourceDistribution(),
        suspectedCount: 0,
        totalCount: selectedImageIds.length,
      }),
      message: noNeedToRun ? "已审核(未变更)，无需执行" : "广告审核任务进行中",
      error_detail: null,
      candidates: [],
      updated_at_ms: now,
    };

    this.updateQueueTask(nextTask.task_id, () => nextTask);

    if (noNeedToRun) {
      if (pendingItem.effective_node_ids.length > 0) {
        this.updateReviewedNodeHashes(pendingItem.effective_node_ids, snapshot);
      }
      await this.startNextPendingTaskIfIdle();
      return;
    }

    const runtimeTask: RuntimeTaskState = {
      task: nextTask,
      request: pendingItem.request,
      effectiveNodeIds: pendingItem.effective_node_ids,
      nodeHashById: pendingItem.node_hash_by_id,
      candidateHashByImageId: new Map<string, string>(),
      abortController: new AbortController(),
      pauseRequested: false,
    };
    this.tasks.set(nextTask.task_id, runtimeTask);

    void this.executeTask(nextTask.task_id, selectedImageIds, imageById);
  }

  private readKnownHashes(): Set<string> {
    return readKnownHashes(this.options.database);
  }

  private async persistKnownHashes(
    imageIds: string[],
    candidateHashByImageId: Map<string, string>,
  ): Promise<void> {
    persistKnownHashes(this.options.database, imageIds, candidateHashByImageId);
  }
}
