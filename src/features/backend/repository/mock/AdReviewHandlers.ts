import {
  confirmManageAdReviewDeleteResponseSchema,
  manageAdReviewTaskExecutionSchema,
  pauseManageAdReviewTaskResponseSchema,
  readManageAdReviewTaskResponseSchema,
  startManageAdReviewResponseSchema,
  testAdReviewVisionModelResponseSchema,
  type ConfirmManageAdReviewDeleteRequestDto,
  type ConfirmManageAdReviewDeleteResponseDto,
  type ImageItemDto,
  type ImagePackageDto,
  type ManageAdReviewImageSourceDto,
  type ManageAdReviewSourceDistributionDto,
  type ManageAdReviewTaskAuditDto,
  type ManageAdReviewTaskDto,
  type ManageAdReviewTaskExecutionDto,
  type PauseManageAdReviewTaskRequestDto,
  type PauseManageAdReviewTaskResponseDto,
  type ReadManageAdReviewTaskRequestDto,
  type ReadManageAdReviewTaskResponseDto,
  type StartManageAdReviewRequestDto,
  type StartManageAdReviewResponseDto,
  type TestAdReviewVisionModelRequestDto,
  type TestAdReviewVisionModelResponseDto,
} from '../../../../contracts/backend'
import { hashLocator, locatorPathKey } from './utils'
import { MOCK_LIBRARY_SNAPSHOT_REF, type MockRepositoryState } from './types'

const DEFAULT_AD_REVIEW_MAX_CONCURRENCY = 4
const MAX_AD_REVIEW_MAX_CONCURRENCY = 12

export function normalizeAdReviewExecution(request: StartManageAdReviewRequestDto): ManageAdReviewTaskExecutionDto {
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

  const maxConcurrency = Number.isFinite(request.max_concurrency)
    ? Math.min(
        MAX_AD_REVIEW_MAX_CONCURRENCY,
        Math.max(DEFAULT_AD_REVIEW_MAX_CONCURRENCY, Math.floor(request.max_concurrency as number)),
      )
    : DEFAULT_AD_REVIEW_MAX_CONCURRENCY

  return manageAdReviewTaskExecutionSchema.parse({
    strategy: normalizedStrategy,
    max_concurrency: maxConcurrency,
  })
}

export function createAdReviewSourceDistribution(params: {
  knownHash: number
  llmSuspected: number
  llmClean: number
  llmFailed?: number
  strategySkipped?: number
}): ManageAdReviewSourceDistributionDto {
  return {
    known_hash: Math.max(0, Math.floor(params.knownHash)),
    llm_suspected: Math.max(0, Math.floor(params.llmSuspected)),
    llm_clean: Math.max(0, Math.floor(params.llmClean)),
    llm_failed: Math.max(0, Math.floor(params.llmFailed ?? 0)),
    strategy_skipped: Math.max(0, Math.floor(params.strategySkipped ?? 0)),
  }
}

export function buildAdReviewAudit(
  sourceDistribution: ManageAdReviewSourceDistributionDto,
  suspectedCount: number,
  totalCount: number,
): ManageAdReviewTaskAuditDto {
  const llmCalls =
    sourceDistribution.llm_suspected +
    sourceDistribution.llm_clean +
    sourceDistribution.llm_failed

  return {
    source_distribution: sourceDistribution,
    llm_hit_rate: llmCalls > 0 ? sourceDistribution.llm_suspected / llmCalls : 0,
    overall_hit_rate: totalCount > 0 ? suspectedCount / totalCount : 0,
  }
}

export class MockAdReviewHandlers {
  constructor(private state: MockRepositoryState) {}

  private resolveManageAdReviewImageIds(request: StartManageAdReviewRequestDto): string[] {
    const snapshot = MOCK_LIBRARY_SNAPSHOT_REF.current
    if (!snapshot) return []
    const allSources = [...snapshot.image_packages, ...snapshot.image_directories]
    const imageById = new Map<string, { source: ImagePackageDto; image: ImageItemDto }>()
    for (const source of allSources) {
      for (const image of source.images) {
        imageById.set(image.id, { source, image })
      }
    }

    if (!request.scope_image_ids) {
      return Array.from(imageById.keys())
    }

    return Array.from(
      new Set(request.scope_image_ids.map((id) => id.trim()).filter((id) => id.length > 0 && imageById.has(id))),
    )
  }

  startManageAdReviewSync(request: StartManageAdReviewRequestDto): StartManageAdReviewResponseDto {
    const snapshot = MOCK_LIBRARY_SNAPSHOT_REF.current
    if (!snapshot) throw new Error('Mock library snapshot not initialized')
    const selectedImageIds = this.resolveManageAdReviewImageIds(request)
    const allSources = [...snapshot.image_packages, ...snapshot.image_directories]
    const imageById = new Map<string, { source: ImagePackageDto; image: ImageItemDto }>()
    for (const source of allSources) {
      for (const image of source.images) {
        imageById.set(image.id, { source, image })
      }
    }

    const candidates: ManageAdReviewTaskDto['candidates'] = []
    const imageSourceById: Record<string, ManageAdReviewImageSourceDto> = {}
    let knownHashHits = 0
    let llmSuspected = 0
    let llmClean = 0
    let strategySkipped = 0

    for (const imageId of selectedImageIds) {
      const entry = imageById.get(imageId)
      if (!entry) {
        continue
      }

      const { source, image } = entry
      let imageSource: ManageAdReviewImageSourceDto = 'llm'

      if (image.ordinal % 7 === 0) {
        imageSource = 'strategy-skip'
        strategySkipped += 1
      } else if (image.ordinal % 4 === 0) {
        imageSource = 'known-hash'
        knownHashHits += 1
      } else {
        imageSource = 'llm'
        if (image.ordinal % 2 === 1) {
          llmSuspected += 1
        } else {
          llmClean += 1
        }
      }

      imageSourceById[image.id] = imageSource

      const shouldBeCandidate = imageSource === 'known-hash' || (imageSource === 'llm' && image.ordinal % 2 === 1)
      if (!shouldBeCandidate) {
        continue
      }

      candidates.push({
        image_id: image.id,
        package_id: source.id,
        package_name: source.package_name,
        display_name: source.display_name,
        ordinal: image.ordinal,
        file_name:
          image.media_locator.kind === 'filesystem'
            ? image.media_locator.absolute_path.split(/[\\/]/).pop() ?? null
            : image.media_locator.entry_name,
        reason: imageSource === 'known-hash' ? 'mock_known_hash_hit' : 'mock_llm_suspected',
        source: imageSource === 'known-hash' ? 'known-hash' : 'llm',
        hash: hashLocator(`${source.id}:${image.id}`).toString(16).padStart(8, '0'),
      })
    }

    const now = Date.now()
    const taskId = `mock-manage-ad-review-${now}-${Math.round(Math.random() * 10_000)}`
    const execution = normalizeAdReviewExecution(request)
    const sourceDistribution = createAdReviewSourceDistribution({
      knownHash: knownHashHits,
      llmSuspected,
      llmClean,
      strategySkipped,
    })

    const task: ManageAdReviewTaskDto = {
      task_id: taskId,
      status: 'review',
      progress: 1,
      total_count: selectedImageIds.length,
      reviewed_count: selectedImageIds.length,
      suspected_count: candidates.length,
      failed_count: 0,
      known_hash_hits: knownHashHits,
      llm_calls: llmSuspected + llmClean,
      scope_image_ids: selectedImageIds,
      image_source_by_id: imageSourceById,
      execution,
      audit: buildAdReviewAudit(sourceDistribution, candidates.length, selectedImageIds.length),
      message: candidates.length > 0 ? `审核完成：疑似 ${candidates.length} 张` : '审核完成：未发现疑似广告',
      error_detail: null,
      candidates,
      created_at_ms: now,
      updated_at_ms: now,
    }

    this.state.manageAdReviewTasks.set(taskId, task)
    return startManageAdReviewResponseSchema.parse({ task })
  }

  readManageAdReviewTaskSync(request: ReadManageAdReviewTaskRequestDto): ReadManageAdReviewTaskResponseDto {
    return readManageAdReviewTaskResponseSchema.parse({
      task: this.state.manageAdReviewTasks.get(request.task_id) ?? null,
    })
  }

  pauseManageAdReviewTaskSync(
    request: PauseManageAdReviewTaskRequestDto,
  ): PauseManageAdReviewTaskResponseDto {
    const task = this.state.manageAdReviewTasks.get(request.task_id)
    if (!task) {
      throw new Error(`AI广告审核暂停失败：任务不存在 ${request.task_id}`)
    }

    const nextTask: ManageAdReviewTaskDto =
      task.status === 'running'
        ? {
            ...task,
            status: 'paused',
            message: 'AI广告审核已暂停',
            error_detail: null,
            updated_at_ms: Date.now(),
          }
        : task

    this.state.manageAdReviewTasks.set(nextTask.task_id, nextTask)
    return pauseManageAdReviewTaskResponseSchema.parse({
      task: nextTask,
    })
  }

  testAdReviewVisionModelSync(
    request: TestAdReviewVisionModelRequestDto,
  ): TestAdReviewVisionModelResponseDto {
    const endpoint = request.llm_endpoint.trim()
    const model = request.llm_model.trim()
    const imageBase64 = request.image_base64.trim()
    if (!endpoint || !model) {
      return testAdReviewVisionModelResponseSchema.parse({
        ok: false,
        message: '模型测试失败：端口和模型ID不能为空',
      })
    }

    if (!imageBase64) {
      return testAdReviewVisionModelResponseSchema.parse({
        ok: false,
        message: '模型测试失败：测试图片数据缺失',
      })
    }

    if (endpoint.toLowerCase().includes('fail') || model.toLowerCase().includes('fail')) {
      return testAdReviewVisionModelResponseSchema.parse({
        ok: false,
        message: '模型测试失败：mock 连接失败',
      })
    }

    return testAdReviewVisionModelResponseSchema.parse({
      ok: true,
      message: '模型响应正常',
    })
  }

  confirmManageAdReviewDeleteSync(
    request: ConfirmManageAdReviewDeleteRequestDto,
    deleteImageItemsSync: (req: any) => any,
  ): ConfirmManageAdReviewDeleteResponseDto {
    const task = this.state.manageAdReviewTasks.get(request.task_id)
    if (!task) {
      throw new Error(`广告审核删除失败：任务不存在 ${request.task_id}`)
    }

    const candidateIds = new Set(task.candidates.map((item) => item.image_id))
    const normalizedIds = Array.from(
      new Set(request.image_ids.map((value) => value.trim()).filter((value) => value.length > 0 && candidateIds.has(value))),
    )
    if (normalizedIds.length === 0) {
      throw new Error('广告审核删除失败：未选中候选项')
    }

    const deleteResult = deleteImageItemsSync({ image_ids: normalizedIds })
    const failedSet = new Set(deleteResult.failed.map((item: any) => item.image_id))
    const deletedSet = new Set(normalizedIds.filter((imageId) => !failedSet.has(imageId)))

    const now = Date.now()
    const nextImageSourceById = { ...task.image_source_by_id }
    for (const imageId of deletedSet) {
      delete nextImageSourceById[imageId]
    }

    const nextTask: ManageAdReviewTaskDto = {
      ...task,
      candidates: task.candidates.filter((item) => !deletedSet.has(item.image_id)),
      suspected_count: task.candidates.filter((item) => !deletedSet.has(item.image_id)).length,
      scope_image_ids: task.scope_image_ids.filter((imageId) => !deletedSet.has(imageId)),
      image_source_by_id: nextImageSourceById,
      updated_at_ms: now,
      message: deletedSet.size > 0 ? `已删除 ${deletedSet.size} 张疑似广告` : task.message,
    }

    this.state.manageAdReviewTasks.set(task.task_id, nextTask)

    return confirmManageAdReviewDeleteResponseSchema.parse({
      task: nextTask,
      deleted_count: deleteResult.deleted_count,
      failed: deleteResult.failed,
      updated_at_ms: now,
    })
  }
}
