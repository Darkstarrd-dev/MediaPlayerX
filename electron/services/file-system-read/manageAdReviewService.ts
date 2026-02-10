import { promises as fs } from 'node:fs'
import path from 'node:path'

import {
  confirmManageAdReviewDeleteResponseSchema,
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
  type ManageAdReviewTaskDto,
  type ReadManageAdReviewTaskRequestDto,
  type ReadManageAdReviewTaskResponseDto,
  type StartManageAdReviewRequestDto,
  type StartManageAdReviewResponseDto,
} from '../../../src/contracts/backend'
import { assertLocatorAllowed, type MediaAccessGuardContext } from '../../fileSystemMediaAccessGuard'
import { readArchiveEntryMedia } from '../../fileSystemMediaReaders'
import { MediaLibraryDatabase } from '../../mediaLibraryDatabase'
import { OpenAiVisionClient, runManageAdReview } from '../../manageAdReview'
import type { ManageAdReviewDecision } from '../../manageAdReview'
import { type ZipCentralEntry } from '../../zipArchiveHelpers'

const KNOWN_HASHES_STATE_KEY = 'manage_ad_review_known_hashes_v1'

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
      message: '广告审核任务进行中',
      error_detail: null,
      candidates: [],
      created_at_ms: now,
      updated_at_ms: now,
    }

    const runtimeTask: RuntimeTaskState = {
      task,
      candidateHashByImageId: new Map<string, string>(),
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
    runtimeTask.task = {
      ...runtimeTask.task,
      candidates: runtimeTask.task.candidates.filter((item) => !deletedImageIdSet.has(item.image_id)),
      suspected_count: runtimeTask.task.candidates.filter((item) => !deletedImageIdSet.has(item.image_id)).length,
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

    try {
      const knownHashes = this.readKnownHashes()
      const client = new OpenAiVisionClient({
        endpoint: request.llm_endpoint,
        model: request.llm_model,
        apiKey: process.env.MEDIA_PLAYERX_LLM_API_KEY,
      })

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
          concurrency: 2,
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

            currentTask.task = {
              ...currentTask.task,
              reviewed_count: reviewedCount,
              suspected_count: suspectedCount,
              failed_count: failedCount,
              progress: currentTask.task.total_count > 0 ? reviewedCount / currentTask.task.total_count : 1,
              updated_at_ms: Date.now(),
            }
          },
        },
      )

      const candidates = this.buildCandidates(result.items, imageById)
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
        message:
          candidates.length > 0
            ? `审核完成：疑似 ${candidates.length} 张`
            : '审核完成：未发现疑似广告',
        error_detail: null,
        candidates,
        updated_at_ms: Date.now(),
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      runtimeTask.task = {
        ...runtimeTask.task,
        status: 'failed',
        message: '广告审核失败',
        error_detail: reason,
        updated_at_ms: Date.now(),
      }
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
