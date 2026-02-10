import { promises as fs } from 'node:fs'
import path from 'node:path'

import {
  confirmManageAdReviewDeleteResponseSchema,
  manageAdReviewTaskExecutionSchema,
  readManageAdReviewTaskResponseSchema,
  startManageAdReviewResponseSchema,
  type ConfirmManageAdReviewDeleteRequestDto,
  type ConfirmManageAdReviewDeleteResponseDto,
  type DeleteImageItemsRequestDto,
  type DeleteImageItemsResponseDto,
  type ImageItemDto,
  type ImagePackageDto,
  type LibrarySnapshotDto,
  type ManageAdReviewCandidateDto,
  type ManageAdReviewImageSourceDto,
  type ManageAdReviewSourceDistributionDto,
  type ManageAdReviewTaskAuditDto,
  type ManageAdReviewTaskDto,
  type ManageAdReviewTaskExecutionDto,
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
} from '../../../src/contracts/backend'
import { assertLocatorAllowed, type MediaAccessGuardContext } from '../../fileSystemMediaAccessGuard'
import { readArchiveEntryMedia } from '../../fileSystemMediaReaders'
import { MediaLibraryDatabase } from '../../mediaLibraryDatabase'
import { OpenAiVisionClient, runManageAdReview } from '../../manageAdReview'
import type { ManageAdReviewDecision } from '../../manageAdReview'
import { type ZipCentralEntry } from '../../zipArchiveHelpers'

const KNOWN_HASHES_STATE_KEY = 'manage_ad_review_known_hashes_v1'
const DEFAULT_REVIEW_MAX_CONCURRENCY = 4
const REVIEW_MAX_CONCURRENCY_LIMIT = 12
const DEFAULT_VISION_TEST_TIMEOUT_MS = 12_000
const MAX_VISION_TEST_IMAGE_BYTES = 12 * 1024 * 1024
const VISION_TEST_SYSTEM_PROMPT =
  'You are validating vision-model color recognition. Return JSON only: {"is_ad": false, "reason": "<dominant color>"}. The reason must be the dominant color you see in the image.'
const VISION_TEST_USER_PROMPT =
  'What is the dominant color of this image? Return JSON only with is_ad and reason.'
const INVALID_DESCRIPTION_PATTERN =
  /(cannot|can\'t|unable|not able|as an ai|无法|不能|看不到|无法查看|无法识别|无法描述)/i
const RED_COLOR_PATTERN = /\b(red|crimson|scarlet|ruby|maroon|reddish)\b|红色?|赤红|绯红|#?ff0000/i

interface ParsedSidebarNodeRef {
  kind: 'folder' | 'package' | 'video'
  pathKey: string
}

interface ManageAdReviewServiceOptions {
  database: MediaLibraryDatabase
  ensureSnapshotLoaded: () => Promise<LibrarySnapshotDto>
  buildMediaAccessContext: () => MediaAccessGuardContext
  getZipEntryIndexByPath: () => Map<string, Map<string, ZipCentralEntry>>
  deleteImageItems: (request: DeleteImageItemsRequestDto) => Promise<DeleteImageItemsResponseDto>
}

interface RuntimeTaskState {
  task: ManageAdReviewTaskDto
  candidateHashByImageId: Map<string, string>
  abortController: AbortController | null
  pauseRequested: boolean
}

interface ImageEntryRef {
  source: ImagePackageDto
  image: ImageItemDto
}

function parseSidebarNodeId(nodeId: string): ParsedSidebarNodeRef | null {
  const delimiterIndex = nodeId.indexOf(':')
  if (delimiterIndex <= 0) {
    return null
  }

  const kind = nodeId.slice(0, delimiterIndex)
  if (kind !== 'folder' && kind !== 'package' && kind !== 'video') {
    return null
  }

  const pathKey = nodeId.slice(delimiterIndex + 1)
  if (!pathKey) {
    return null
  }

  return {
    kind,
    pathKey,
  }
}

function pathKeyHasPrefix(pathKey: string, prefix: string): boolean {
  if (pathKey === prefix) {
    return true
  }
  return pathKey.startsWith(`${prefix}/`)
}

function normalizeHashes(input: unknown): Set<string> {
  if (!Array.isArray(input)) {
    return new Set()
  }

  const next = new Set<string>()
  for (const value of input) {
    if (typeof value !== 'string') {
      continue
    }
    const normalized = value.trim().toLowerCase()
    if (normalized.length > 0) {
      next.add(normalized)
    }
  }

  return next
}

function resolveCandidateSource(source: ManageAdReviewDecision['source']): 'known-hash' | 'llm' {
  return source === 'known-hash' ? 'known-hash' : 'llm'
}

function toImageFileName(image: ImageItemDto): string | null {
  if (image.media_locator.kind === 'filesystem') {
    return path.basename(image.media_locator.absolute_path)
  }
  return path.basename(image.media_locator.entry_name)
}

function normalizeImageSource(source: ManageAdReviewDecision['source']): ManageAdReviewImageSourceDto {
  if (source === 'llm-error') {
    return 'llm-error'
  }
  if (source === 'strategy-skip') {
    return 'strategy-skip'
  }
  if (source === 'known-hash') {
    return 'known-hash'
  }
  return 'llm'
}

function buildImageSourceById(decisions: ManageAdReviewDecision[]): Record<string, ManageAdReviewImageSourceDto> {
  const next: Record<string, ManageAdReviewImageSourceDto> = {}
  for (const decision of decisions) {
    next[decision.imageId] = normalizeImageSource(decision.source)
  }
  return next
}

function createEmptySourceDistribution(): ManageAdReviewSourceDistributionDto {
  return {
    known_hash: 0,
    llm_suspected: 0,
    llm_clean: 0,
    llm_failed: 0,
    strategy_skipped: 0,
  }
}

function toTaskAudit(params: {
  sourceDistribution: ManageAdReviewSourceDistributionDto
  suspectedCount: number
  totalCount: number
}): ManageAdReviewTaskAuditDto {
  const llmCalls =
    params.sourceDistribution.llm_suspected +
    params.sourceDistribution.llm_clean +
    params.sourceDistribution.llm_failed

  return {
    source_distribution: params.sourceDistribution,
    llm_hit_rate: llmCalls > 0 ? params.sourceDistribution.llm_suspected / llmCalls : 0,
    overall_hit_rate: params.totalCount > 0 ? params.suspectedCount / params.totalCount : 0,
  }
}

function normalizeMaxConcurrency(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_REVIEW_MAX_CONCURRENCY
  }

  return Math.min(REVIEW_MAX_CONCURRENCY_LIMIT, Math.max(DEFAULT_REVIEW_MAX_CONCURRENCY, Math.floor(value as number)))
}

function normalizeTaskExecution(request: StartManageAdReviewRequestDto): ManageAdReviewTaskExecutionDto {
  const strategy = request.strategy
  const normalizedStrategy: ManageAdReviewTaskExecutionDto['strategy'] =
    !strategy || strategy.mode === 'all'
      ? { mode: 'all' }
      : {
          mode: 'head-tail',
          head_n: Math.max(0, Math.floor(strategy.head_n)),
          tail_n: Math.max(0, Math.floor(strategy.tail_n)),
          tail_stop_clean_streak: Math.max(1, Math.floor(strategy.tail_stop_clean_streak)),
        }

  return manageAdReviewTaskExecutionSchema.parse({
    strategy: normalizedStrategy,
    max_concurrency: normalizeMaxConcurrency(request.max_concurrency),
  })
}

function toEngineStrategy(execution: ManageAdReviewTaskExecutionDto) {
  if (execution.strategy.mode === 'head-tail') {
    return {
      mode: 'head-tail' as const,
      headN: execution.strategy.head_n,
      tailN: execution.strategy.tail_n,
      tailStopCleanStreak: execution.strategy.tail_stop_clean_streak,
    }
  }

  return {
    mode: 'all' as const,
  }
}

function applyDecisionToSourceDistribution(
  current: ManageAdReviewSourceDistributionDto,
  decision: Pick<ManageAdReviewDecision, 'source' | 'status'>,
): ManageAdReviewSourceDistributionDto {
  const next: ManageAdReviewSourceDistributionDto = {
    ...current,
  }

  if (decision.source === 'known-hash') {
    next.known_hash += 1
    return next
  }

  if (decision.source === 'llm-error') {
    next.llm_failed += 1
    return next
  }

  if (decision.source === 'strategy-skip') {
    next.strategy_skipped += 1
    return next
  }

  if (decision.status === 'suspected') {
    next.llm_suspected += 1
    return next
  }

  if (decision.status === 'clean') {
    next.llm_clean += 1
    return next
  }

  next.llm_failed += 1
  return next
}

function buildSourceDistribution(decisions: ManageAdReviewDecision[]): ManageAdReviewSourceDistributionDto {
  let distribution = createEmptySourceDistribution()
  for (const decision of decisions) {
    distribution = applyDecisionToSourceDistribution(distribution, decision)
  }
  return distribution
}

function decodeVisionTestImageBytes(base64Value: string): Uint8Array {
  const normalizedBase64 = base64Value.trim().replace(/^data:[^;]+;base64,/i, '')
  if (!normalizedBase64) {
    throw new Error('模型测试失败：测试图片数据缺失')
  }

  const imageBytes = new Uint8Array(Buffer.from(normalizedBase64, 'base64'))
  if (imageBytes.length === 0) {
    throw new Error('模型测试失败：测试图片无效')
  }

  if (imageBytes.length > MAX_VISION_TEST_IMAGE_BYTES) {
    throw new Error('模型测试失败：测试图片过大')
  }

  return imageBytes
}

function isValidVisionDescription(value: string): boolean {
  const normalized = value.trim()
  if (normalized.length < 2) {
    return false
  }

  if (INVALID_DESCRIPTION_PATTERN.test(normalized)) {
    return false
  }

  return RED_COLOR_PATTERN.test(normalized)
}

export class ManageAdReviewService {
  private readonly tasks = new Map<string, RuntimeTaskState>()

  constructor(private readonly options: ManageAdReviewServiceOptions) {}

  async startManageAdReview(
    request: StartManageAdReviewRequestDto,
  ): Promise<StartManageAdReviewResponseDto> {
    const snapshot = await this.options.ensureSnapshotLoaded()
    const imageById = this.buildImageById(snapshot)
    const selectedImageIds = this.resolveSelectedImageIds(request, snapshot, imageById)
    if (selectedImageIds.length === 0) {
      throw new Error('广告审核失败：未选中图片')
    }

    const now = Date.now()
    const taskId = `manage-ad-review-${now}-${Math.round(Math.random() * 1_000_000)}`
    const execution = normalizeTaskExecution(request)
    const task: ManageAdReviewTaskDto = {
      task_id: taskId,
      status: 'running',
      progress: 0,
      total_count: selectedImageIds.length,
      reviewed_count: 0,
      suspected_count: 0,
      failed_count: 0,
      known_hash_hits: 0,
      llm_calls: 0,
      scope_image_ids: selectedImageIds,
      image_source_by_id: {},
      execution,
      audit: toTaskAudit({
        sourceDistribution: createEmptySourceDistribution(),
        suspectedCount: 0,
        totalCount: selectedImageIds.length,
      }),
      message: '广告审核任务进行中',
      error_detail: null,
      candidates: [],
      created_at_ms: now,
      updated_at_ms: now,
    }

    const runtimeTask: RuntimeTaskState = {
      task,
      candidateHashByImageId: new Map<string, string>(),
      abortController: new AbortController(),
      pauseRequested: false,
    }
    this.tasks.set(taskId, runtimeTask)

    void this.executeTask(taskId, selectedImageIds, imageById, request)

    return startManageAdReviewResponseSchema.parse({
      task,
    })
  }

  async readManageAdReviewTask(
    request: ReadManageAdReviewTaskRequestDto,
  ): Promise<ReadManageAdReviewTaskResponseDto> {
    const runtimeTask = this.tasks.get(request.task_id)
    return readManageAdReviewTaskResponseSchema.parse({
      task: runtimeTask?.task ?? null,
    })
  }

  async pauseManageAdReviewTask(
    request: PauseManageAdReviewTaskRequestDto,
  ): Promise<PauseManageAdReviewTaskResponseDto> {
    const runtimeTask = this.tasks.get(request.task_id)
    if (!runtimeTask) {
      throw new Error(`AI广告审核暂停失败：任务不存在 ${request.task_id}`)
    }

    if (runtimeTask.task.status === 'running') {
      runtimeTask.pauseRequested = true
      runtimeTask.abortController?.abort()
      runtimeTask.task = {
        ...runtimeTask.task,
        status: 'paused',
        message: 'AI广告审核已暂停',
        error_detail: null,
        updated_at_ms: Date.now(),
      }
    }

    return pauseManageAdReviewTaskResponseSchema.parse({
      task: runtimeTask.task,
    })
  }

  async testAdReviewVisionModel(
    request: TestAdReviewVisionModelRequestDto,
  ): Promise<TestAdReviewVisionModelResponseDto> {
    const timeoutMs = Number.isFinite(request.timeout_ms)
      ? Math.max(1_000, Math.min(60_000, Math.floor(request.timeout_ms as number)))
      : DEFAULT_VISION_TEST_TIMEOUT_MS

    try {
      const imageBytes = decodeVisionTestImageBytes(request.image_base64)
      const client = new OpenAiVisionClient({
        endpoint: request.llm_endpoint,
        model: request.llm_model,
        apiKey: process.env.MEDIA_PLAYERX_LLM_API_KEY,
        timeoutMs,
        systemPrompt: VISION_TEST_SYSTEM_PROMPT,
        userPrompt: VISION_TEST_USER_PROMPT,
      })

      const detection = await client.detectAd({
        imageBytes,
      })

      const normalizedReason = detection.reason.trim()
      if (!isValidVisionDescription(normalizedReason)) {
        return testAdReviewVisionModelResponseSchema.parse({
          ok: false,
          message: '模型测试失败：模型未返回红色作为图片颜色',
        })
      }

      return testAdReviewVisionModelResponseSchema.parse({
        ok: true,
        message: '模型响应正常',
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      return testAdReviewVisionModelResponseSchema.parse({
        ok: false,
        message: `模型测试失败：${reason}`,
      })
    }
  }

  async confirmManageAdReviewDelete(
    request: ConfirmManageAdReviewDeleteRequestDto,
  ): Promise<ConfirmManageAdReviewDeleteResponseDto> {
    const runtimeTask = this.tasks.get(request.task_id)
    if (!runtimeTask) {
      throw new Error(`广告审核删除失败：任务不存在 ${request.task_id}`)
    }
    if (runtimeTask.task.status !== 'review') {
      throw new Error('广告审核删除失败：任务尚未进入复核阶段')
    }

    const candidateIdSet = new Set(runtimeTask.task.candidates.map((item) => item.image_id))
    const normalizedIds = Array.from(
      new Set(
        request.image_ids
          .map((value) => value.trim())
          .filter((value) => value.length > 0 && candidateIdSet.has(value)),
      ),
    )
    if (normalizedIds.length === 0) {
      throw new Error('广告审核删除失败：未选中候选项')
    }

    const response = await this.options.deleteImageItems({
      image_ids: normalizedIds,
    })

    const failedImageIdSet = new Set(response.failed.map((item) => item.image_id))
    const deletedImageIds = normalizedIds.filter((imageId) => !failedImageIdSet.has(imageId))
    if (deletedImageIds.length > 0) {
      await this.persistKnownHashes(deletedImageIds, runtimeTask.candidateHashByImageId)
    }

    const deletedImageIdSet = new Set(deletedImageIds)
    const nextImageSourceById = { ...runtimeTask.task.image_source_by_id }
    for (const imageId of deletedImageIds) {
      delete nextImageSourceById[imageId]
    }

    runtimeTask.task = {
      ...runtimeTask.task,
      candidates: runtimeTask.task.candidates.filter((item) => !deletedImageIdSet.has(item.image_id)),
      suspected_count: runtimeTask.task.candidates.filter((item) => !deletedImageIdSet.has(item.image_id)).length,
      scope_image_ids: runtimeTask.task.scope_image_ids.filter((imageId) => !deletedImageIdSet.has(imageId)),
      image_source_by_id: nextImageSourceById,
      updated_at_ms: Date.now(),
      message:
        deletedImageIds.length > 0
          ? `已删除 ${deletedImageIds.length} 张疑似广告`
          : response.failed.length > 0
            ? '删除失败'
            : runtimeTask.task.message,
    }

    for (const imageId of deletedImageIds) {
      runtimeTask.candidateHashByImageId.delete(imageId)
    }

    return confirmManageAdReviewDeleteResponseSchema.parse({
      task: runtimeTask.task,
      deleted_count: response.deleted_count,
      failed: response.failed,
      updated_at_ms: Date.now(),
    })
  }

  private buildImageById(snapshot: LibrarySnapshotDto): Map<string, ImageEntryRef> {
    const imageById = new Map<string, ImageEntryRef>()
    for (const source of [...snapshot.image_packages, ...snapshot.image_directories]) {
      for (const image of source.images) {
        imageById.set(image.id, {
          source,
          image,
        })
      }
    }
    return imageById
  }

  private resolveSelectedImageIds(
    request: StartManageAdReviewRequestDto,
    snapshot: LibrarySnapshotDto,
    imageById: Map<string, ImageEntryRef>,
  ): string[] {
    if (request.selection_scope === 'image') {
      return Array.from(
        new Set(
          (request.image_ids ?? [])
            .map((value) => value.trim())
            .filter((value) => value.length > 0 && imageById.has(value)),
        ),
      )
    }

    const parsedTargets = (request.node_ids ?? [])
      .map((nodeId) => parseSidebarNodeId(nodeId))
      .filter((value): value is ParsedSidebarNodeRef => Boolean(value))

    const selected = new Set<string>()
    for (const source of [...snapshot.image_packages, ...snapshot.image_directories]) {
      const sourcePathKey = source.tree_path.join('/')

      let matched = false
      for (const target of parsedTargets) {
        if (target.kind === 'folder' && pathKeyHasPrefix(sourcePathKey, target.pathKey)) {
          matched = true
          break
        }
        if (target.kind === 'package' && sourcePathKey === target.pathKey) {
          matched = true
          break
        }
      }

      if (!matched) {
        continue
      }

      for (const image of source.images) {
        selected.add(image.id)
      }
    }

    return Array.from(selected)
  }

  private async executeTask(
    taskId: string,
    selectedImageIds: string[],
    imageById: Map<string, ImageEntryRef>,
    request: StartManageAdReviewRequestDto,
  ): Promise<void> {
    const runtimeTask = this.tasks.get(taskId)
    if (!runtimeTask) {
      return
    }

    runtimeTask.pauseRequested = false
    if (!runtimeTask.abortController || runtimeTask.abortController.signal.aborted) {
      runtimeTask.abortController = new AbortController()
    }
    const runSignal = runtimeTask.abortController.signal

    try {
      const knownHashes = this.readKnownHashes()
      const client = new OpenAiVisionClient({
        endpoint: request.llm_endpoint,
        model: request.llm_model,
        apiKey: process.env.MEDIA_PLAYERX_LLM_API_KEY,
      })
      const taskExecution = runtimeTask.task.execution ?? normalizeTaskExecution(request)

      const groupedBySource = new Map<string, Array<{ source: ImagePackageDto; image: ImageItemDto }>>()
      for (const imageId of selectedImageIds) {
        const found = imageById.get(imageId)
        if (!found) {
          continue
        }

        const list = groupedBySource.get(found.source.id) ?? []
        list.push({
          source: found.source,
          image: found.image,
        })
        groupedBySource.set(found.source.id, list)
      }

      const result = await runManageAdReview(
        {
          containers: Array.from(groupedBySource.entries()).map(([sourceId, entries]) => ({
            containerId: sourceId,
            images: entries.map(({ image }) => ({
              imageId: image.id,
              ordinal: image.ordinal,
              fileName: toImageFileName(image) ?? undefined,
              getImageBytes: async () => this.readImageBytes(image),
            })),
          })),
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
            const currentTask = this.tasks.get(taskId)
            if (!currentTask || currentTask.task.status !== 'running') {
              return
            }

            if (event.type !== 'image-reviewed') {
              return
            }

            const reviewedCount = Math.min(currentTask.task.total_count, currentTask.task.reviewed_count + 1)
            const suspectedCount = currentTask.task.suspected_count + (event.status === 'suspected' ? 1 : 0)
            const failedCount = currentTask.task.failed_count + (event.status === 'failed' ? 1 : 0)
            const nextSourceDistribution = applyDecisionToSourceDistribution(
              currentTask.task.audit?.source_distribution ?? createEmptySourceDistribution(),
              {
                source: event.source,
                status: event.status,
              },
            )

            const llmCalls =
              nextSourceDistribution.llm_suspected +
              nextSourceDistribution.llm_clean +
              nextSourceDistribution.llm_failed

            const nextImageSourceById: Record<string, ManageAdReviewImageSourceDto> = {
              ...currentTask.task.image_source_by_id,
              [event.imageId]: normalizeImageSource(event.source),
            }

            currentTask.task = {
              ...currentTask.task,
              reviewed_count: reviewedCount,
              suspected_count: suspectedCount,
              failed_count: failedCount,
              known_hash_hits: nextSourceDistribution.known_hash,
              llm_calls: llmCalls,
              image_source_by_id: nextImageSourceById,
              audit: toTaskAudit({
                sourceDistribution: nextSourceDistribution,
                suspectedCount,
                totalCount: currentTask.task.total_count,
              }),
              progress: currentTask.task.total_count > 0 ? reviewedCount / currentTask.task.total_count : 1,
              updated_at_ms: Date.now(),
            }
          },
        },
      )

      const candidates = this.buildCandidates(result.items, imageById)
      const sourceDistribution = buildSourceDistribution(result.items)
      const imageSourceById = buildImageSourceById(result.items)
      runtimeTask.candidateHashByImageId = new Map(candidates.map((candidate) => [candidate.image_id, candidate.hash]))
      runtimeTask.task = {
        ...runtimeTask.task,
        status: 'review',
        progress: 1,
        reviewed_count: result.summary.total,
        suspected_count: result.summary.suspected,
        failed_count: result.summary.failed,
        known_hash_hits: result.summary.knownHashHits,
        llm_calls: result.summary.llmCalls,
        image_source_by_id: imageSourceById,
        audit: toTaskAudit({
          sourceDistribution,
          suspectedCount: result.summary.suspected,
          totalCount: result.summary.total,
        }),
        message:
          candidates.length > 0
            ? `审核完成：疑似 ${candidates.length} 张`
            : '审核完成：未发现疑似广告',
        error_detail: null,
        candidates,
        updated_at_ms: Date.now(),
      }
      runtimeTask.pauseRequested = false
    } catch (error) {
      const isAbortError = error instanceof Error && error.name === 'AbortError'
      if (isAbortError && (runtimeTask.pauseRequested || runtimeTask.task.status === 'paused')) {
        runtimeTask.task = {
          ...runtimeTask.task,
          status: 'paused',
          message: 'AI广告审核已暂停',
          error_detail: null,
          updated_at_ms: Date.now(),
        }
        return
      }

      const reason = error instanceof Error ? error.message : String(error)
      runtimeTask.task = {
        ...runtimeTask.task,
        status: 'failed',
        message: 'AI广告审核失败',
        error_detail: reason,
        updated_at_ms: Date.now(),
      }
    } finally {
      runtimeTask.abortController = null
      runtimeTask.pauseRequested = false
    }
  }

  private buildCandidates(
    decisions: ManageAdReviewDecision[],
    imageById: Map<string, ImageEntryRef>,
  ): ManageAdReviewCandidateDto[] {
    const candidates: ManageAdReviewCandidateDto[] = []

    for (const decision of decisions) {
      if (decision.status !== 'suspected') {
        continue
      }

      const found = imageById.get(decision.imageId)
      if (!found) {
        continue
      }

      candidates.push({
        image_id: decision.imageId,
        package_id: found.source.id,
        package_name: found.source.package_name,
        display_name: found.source.display_name,
        ordinal: found.image.ordinal,
        file_name: toImageFileName(found.image),
        reason: decision.reason.trim() || 'suspected_ad',
        source: resolveCandidateSource(decision.source),
        hash: decision.hash,
      })
    }

    candidates.sort((left, right) => {
      if (left.package_id !== right.package_id) {
        return left.package_id.localeCompare(right.package_id)
      }
      return left.ordinal - right.ordinal
    })

    return candidates
  }

  private async readImageBytes(image: ImageItemDto): Promise<Uint8Array> {
    const context = this.options.buildMediaAccessContext()
    const allowedLocator = await assertLocatorAllowed(image.media_locator, context)

    if (allowedLocator.kind === 'filesystem') {
      return fs.readFile(allowedLocator.absolute_path)
    }

    const payload = await readArchiveEntryMedia(
      allowedLocator,
      allowedLocator.mime_type,
      this.options.getZipEntryIndexByPath(),
    )
    return payload.body
  }

  private readKnownHashes(): Set<string> {
    const raw = this.options.database.readAppState<unknown>(KNOWN_HASHES_STATE_KEY, [])
    return normalizeHashes(raw)
  }

  private async persistKnownHashes(imageIds: string[], candidateHashByImageId: Map<string, string>): Promise<void> {
    const hashes = this.readKnownHashes()
    let changed = false

    for (const imageId of imageIds) {
      const hash = candidateHashByImageId.get(imageId)
      if (!hash) {
        continue
      }
      const normalized = hash.trim().toLowerCase()
      if (!normalized || hashes.has(normalized)) {
        continue
      }
      hashes.add(normalized)
      changed = true
    }

    if (!changed) {
      return
    }

    this.options.database.writeAppState(KNOWN_HASHES_STATE_KEY, Array.from(hashes))
  }
}
