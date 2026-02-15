import { describe, expect, it, vi, beforeEach } from 'vitest'

import type {
  DeleteImageItemsRequestDto,
  DeleteImageItemsResponseDto,
  ImageItemDto,
  ImagePackageDto,
  LibrarySnapshotDto,
  StartManageAdReviewRequestDto,
} from '../../../src/contracts/backend'
import { ManageAdReviewService } from './manageAdReviewService'
import { runManageAdReview } from '../../manageAdReview'
import type { MediaLibraryDatabase } from '../../mediaLibraryDatabase'

vi.mock('../../manageAdReview', () => {
  class OpenAiVisionClient {
    constructor(options: unknown) {
      void options
    }
  }

  return {
    OpenAiVisionClient,
    runManageAdReview: vi.fn(),
  }
})

const QUEUE_STATE_KEY = 'manage_ad_review_queue_v1'
const REVIEWED_NODE_HASH_STATE_KEY = 'manage_ad_review_reviewed_nodes_v1'

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function createImage(id: string, ordinal: number, absolutePath: string): ImageItemDto {
  return {
    id,
    ordinal,
    width: 100,
    height: 100,
    size_kb: 10,
    cluster: 0,
    color: '#000000',
    media_locator: {
      kind: 'filesystem',
      absolute_path: absolutePath,
      extension: '.jpg',
      media_type: 'image',
      mime_type: 'image/jpeg',
    },
    hidden: false,
  }
}

function createSource(sourceId: string, treePath: string[], images: ImageItemDto[]): ImagePackageDto {
  return {
    id: sourceId,
    package_name: sourceId,
    display_name: sourceId,
    absolute_path: treePath.join('/'),
    tree_path: treePath,
    work_title: sourceId,
    series_id: '',
    circle: '',
    author: '',
    tags: [],
    mock_grade: null,
    external_metadata: null,
    source_cover: null,
    images,
  }
}

function createSnapshotForTests(): LibrarySnapshotDto {
  return {
    image_packages: [
      createSource('pkg-1', ['C:', 'Users', 'A', 'Pkg-1'], [
        createImage('img-1', 1, 'C:/Users/A/Pkg-1/001.jpg'),
        createImage('img-2', 2, 'C:/Users/A/Pkg-1/002.jpg'),
      ]),
      createSource('pkg-2', ['C:', 'Users', 'A', 'Pkg-2'], [createImage('img-3', 1, 'C:/Users/A/Pkg-2/001.jpg')]),
    ],
    image_directories: [],
    videos: [],
    audios: [],
  }
}

function removeImagesFromSnapshot(snapshot: LibrarySnapshotDto, imageIds: string[]): void {
  const deletedIdSet = new Set(imageIds)
  const mutate = (source: ImagePackageDto) => {
    source.images = source.images.filter((image) => !deletedIdSet.has(image.id))
  }

  for (const source of snapshot.image_packages) {
    mutate(source)
  }
  for (const source of snapshot.image_directories) {
    mutate(source)
  }
}

function buildReviewResult(imageIds: string[]) {
  const items = imageIds.map((imageId, index) => ({
    containerId: `container-${index}`,
    imageId,
    ordinal: index + 1,
    fileName: `${imageId}.jpg`,
    hash: `hash-${imageId}`,
    status: 'suspected' as const,
    source: 'llm' as const,
    reason: 'suspected',
    reviewedAtMs: Date.now(),
  }))

  return {
    items,
    summary: {
      total: items.length,
      suspected: items.length,
      clean: 0,
      failed: 0,
      skipped: 0,
      knownHashHits: 0,
      llmCalls: items.length,
    },
  }
}

function findTaskIdsByStatus(state: unknown, status: string): string[] {
  if (!state || typeof state !== 'object') {
    return []
  }
  const items = Array.isArray((state as { items?: unknown }).items) ? ((state as { items: unknown[] }).items as unknown[]) : []
  return items
    .filter((item) => item && typeof item === 'object' && (item as { task?: { status?: string } }).task?.status === status)
    .map((item) => (item as { task: { task_id: string } }).task.task_id)
}

function createServiceFixture(params?: {
  snapshot?: LibrarySnapshotDto
  deleteImageItems?: (request: DeleteImageItemsRequestDto, snapshot: LibrarySnapshotDto) => DeleteImageItemsResponseDto
}) {
  const snapshotRef = {
    current: params?.snapshot ?? createSnapshotForTests(),
  }
  const appState = new Map<string, unknown>()

  const database = {
    readAppState<T>(stateKey: string, fallback: T): T {
      if (!appState.has(stateKey)) {
        return fallback
      }
      return cloneValue(appState.get(stateKey) as T)
    },
    writeAppState(stateKey: string, value: unknown): void {
      appState.set(stateKey, cloneValue(value))
    },
  } as unknown as MediaLibraryDatabase

  const service = new ManageAdReviewService({
    database,
    ensureSnapshotLoaded: async () => snapshotRef.current,
    buildMediaAccessContext: () => ({
      allowPath: () => true,
    }) as never,
    getZipEntryIndexByPath: () => new Map(),
    deleteImageItems: async (request) => {
      const response =
        params?.deleteImageItems?.(request, snapshotRef.current) ?? {
          deleted_count: request.image_ids.length,
          failed: [],
          updated_at_ms: Date.now(),
        }
      removeImagesFromSnapshot(snapshotRef.current, request.image_ids)
      return response
    },
  })

  return {
    service,
    snapshotRef,
    appState,
  }
}

describe('ManageAdReviewService queue persistence', () => {
  const runManageAdReviewMock = vi.mocked(runManageAdReview)

  beforeEach(() => {
    runManageAdReviewMock.mockReset()
    runManageAdReviewMock.mockImplementation(async (input) => {
      const imageIds = input.containers.flatMap((container) => container.images.map((image) => image.imageId))
      return buildReviewResult(imageIds)
    })
  })

  it('queues second task as pending and auto-starts after first completes', async () => {
    const deferredFirst = createDeferred<ReturnType<typeof buildReviewResult>>()
    const deferredSecond = createDeferred<ReturnType<typeof buildReviewResult>>()

    runManageAdReviewMock
      .mockImplementationOnce(async () => deferredFirst.promise)
      .mockImplementationOnce(async () => deferredSecond.promise)

    const { service } = createServiceFixture()

    const firstRequest: StartManageAdReviewRequestDto = {
      selection_scope: 'image',
      image_ids: ['img-1'],
      llm_endpoint: 'http://127.0.0.1:1234/v1',
      llm_model: 'mock-model',
      strategy: { mode: 'all' },
      max_concurrency: 4,
    }
    const secondRequest: StartManageAdReviewRequestDto = {
      ...firstRequest,
      image_ids: ['img-2'],
    }

    const firstResponse = await service.startManageAdReview(firstRequest)
    const secondResponse = await service.startManageAdReview(secondRequest)

    expect(firstResponse.task.status).toBe('running')
    expect(secondResponse.task.status).toBe('pending')

    deferredFirst.resolve(buildReviewResult(['img-1']))

    await vi.waitFor(async () => {
      const secondTask = await service.readManageAdReviewTask({ task_id: secondResponse.task.task_id })
      expect(secondTask.task?.status).toBe('running')
    })

    deferredSecond.resolve(buildReviewResult(['img-2']))

    await vi.waitFor(async () => {
      const secondTask = await service.readManageAdReviewTask({ task_id: secondResponse.task.task_id })
      expect(secondTask.task?.status).toBe('review')
    })
  })

  it('does not auto-start pending task when running task is paused', async () => {
    const deferredFirst = createDeferred<ReturnType<typeof buildReviewResult>>()
    runManageAdReviewMock.mockImplementationOnce(async () => deferredFirst.promise)

    const { service } = createServiceFixture()

    const request: StartManageAdReviewRequestDto = {
      selection_scope: 'image',
      image_ids: ['img-1'],
      llm_endpoint: 'http://127.0.0.1:1234/v1',
      llm_model: 'mock-model',
      strategy: { mode: 'all' },
      max_concurrency: 4,
    }

    const first = await service.startManageAdReview(request)
    const second = await service.startManageAdReview({ ...request, image_ids: ['img-2'] })

    expect(first.task.status).toBe('running')
    expect(second.task.status).toBe('pending')

    const paused = await service.pauseManageAdReviewTask({ task_id: first.task.task_id })
    expect(paused.task.status).toBe('paused')

    await vi.waitFor(async () => {
      const secondTask = await service.readManageAdReviewTask({ task_id: second.task.task_id })
      expect(secondTask.task?.status).toBe('pending')
    })

    expect(runManageAdReviewMock.mock.calls).toHaveLength(1)
  })

  it('updates running task candidates incrementally from image-reviewed events', async () => {
    const deferred = createDeferred<ReturnType<typeof buildReviewResult>>()
    runManageAdReviewMock.mockImplementationOnce(async (_input, options) => {
      ;(options as { onEvent?: (event: unknown) => void }).onEvent?.({
        type: 'image-reviewed',
        containerId: 'pkg-1',
        imageId: 'img-1',
        status: 'suspected',
        source: 'llm',
        hash: 'hash-img-1',
        reason: 'mock_suspected',
      })
      return deferred.promise
    })

    const { service } = createServiceFixture()
    const request: StartManageAdReviewRequestDto = {
      selection_scope: 'image',
      image_ids: ['img-1'],
      llm_endpoint: 'http://127.0.0.1:1234/v1',
      llm_model: 'mock-model',
      strategy: { mode: 'all' },
      max_concurrency: 4,
    }

    const started = await service.startManageAdReview(request)

    await vi.waitFor(async () => {
      const task = await service.readManageAdReviewTask({ task_id: started.task.task_id })
      expect(task.task?.status).toBe('running')
      expect(task.task?.candidates).toHaveLength(1)
      expect(task.task?.candidates[0]?.image_id).toBe('img-1')
      expect(task.task?.candidates[0]?.reason).toBe('mock_suspected')
    })

    deferred.resolve(buildReviewResult(['img-1']))

    await vi.waitFor(async () => {
      const task = await service.readManageAdReviewTask({ task_id: started.task.task_id })
      expect(task.task?.status).toBe('review')
    })
  })

  it('skips unchanged reviewed sidebar nodes on next run', async () => {
    const { service } = createServiceFixture()
    const request: StartManageAdReviewRequestDto = {
      selection_scope: 'sidebar',
      node_ids: ['folder:C:/Users/A'],
      llm_endpoint: 'http://127.0.0.1:1234/v1',
      llm_model: 'mock-model',
      strategy: { mode: 'all' },
      max_concurrency: 4,
    }

    const first = await service.startManageAdReview(request)
    await vi.waitFor(async () => {
      const task = await service.readManageAdReviewTask({ task_id: first.task.task_id })
      expect(task.task?.status).toBe('review')
    })

    const callCountAfterFirst = runManageAdReviewMock.mock.calls.length
    const second = await service.startManageAdReview(request)

    expect(second.task.status).toBe('review')
    expect(second.task.total_count).toBe(0)
    expect(second.task.message).toBe('已审核(未变更)，无需执行')
    expect(runManageAdReviewMock.mock.calls.length).toBe(callCountAfterFirst)
  })

  it('recomputes reviewed node hash after deleting candidates', async () => {
    const snapshot = createSnapshotForTests()
    const { service, appState } = createServiceFixture({ snapshot })
    const request: StartManageAdReviewRequestDto = {
      selection_scope: 'sidebar',
      node_ids: ['folder:C:/Users/A'],
      llm_endpoint: 'http://127.0.0.1:1234/v1',
      llm_model: 'mock-model',
      strategy: { mode: 'all' },
      max_concurrency: 4,
    }

    const started = await service.startManageAdReview(request)
    await vi.waitFor(async () => {
      const task = await service.readManageAdReviewTask({ task_id: started.task.task_id })
      expect(task.task?.status).toBe('review')
    })

    const reviewedBefore = appState.get(REVIEWED_NODE_HASH_STATE_KEY) as {
      node_hash_by_id: Record<string, { node_hash: string }>
    }
    const hashBefore = reviewedBefore.node_hash_by_id['folder:C:/Users/A']?.node_hash
    expect(typeof hashBefore).toBe('string')

    const deleteResponse = await service.confirmManageAdReviewDelete({
      task_id: started.task.task_id,
      image_ids: ['img-1'],
    })
    expect(deleteResponse.deleted_count).toBe(1)

    const reviewedAfter = appState.get(REVIEWED_NODE_HASH_STATE_KEY) as {
      node_hash_by_id: Record<string, { node_hash: string }>
    }
    const hashAfter = reviewedAfter.node_hash_by_id['folder:C:/Users/A']?.node_hash
    expect(hashAfter).not.toBe(hashBefore)
  })

  it('normalizes stale running queue entries to paused on service bootstrap', async () => {
    const snapshot = createSnapshotForTests()
    const appState = new Map<string, unknown>()

    const staleTask = {
      task_id: 'stale-running-task',
      status: 'running',
      progress: 0.4,
      total_count: 10,
      reviewed_count: 4,
      suspected_count: 1,
      failed_count: 0,
      known_hash_hits: 0,
      llm_calls: 4,
      scope_image_ids: ['img-1'],
      image_source_by_id: {},
      execution: {
        strategy: { mode: 'all' as const },
        max_concurrency: 4,
      },
      audit: {
        source_distribution: {
          known_hash: 0,
          llm_suspected: 1,
          llm_clean: 3,
          llm_failed: 0,
          strategy_skipped: 0,
        },
        llm_hit_rate: 0.25,
        overall_hit_rate: 0.1,
      },
      message: '广告审核任务进行中',
      error_detail: null,
      candidates: [],
      created_at_ms: Date.now(),
      updated_at_ms: Date.now(),
    }

    appState.set(QUEUE_STATE_KEY, {
      version: 1,
      items: [
        {
          task: staleTask,
          request: {
            selection_scope: 'image',
            image_ids: ['img-1'],
            llm_endpoint: 'http://127.0.0.1:1234/v1',
            llm_model: 'mock-model',
            strategy: { mode: 'all' },
            max_concurrency: 4,
          },
          effective_node_ids: [],
          skipped_node_ids: [],
          node_hash_by_id: {},
        },
      ],
    })

    const database = {
      readAppState<T>(stateKey: string, fallback: T): T {
        if (!appState.has(stateKey)) {
          return fallback
        }
        return cloneValue(appState.get(stateKey) as T)
      },
      writeAppState(stateKey: string, value: unknown): void {
        appState.set(stateKey, cloneValue(value))
      },
    } as unknown as MediaLibraryDatabase

    const service = new ManageAdReviewService({
      database,
      ensureSnapshotLoaded: async () => snapshot,
      buildMediaAccessContext: () => ({ allowPath: () => true }) as never,
      getZipEntryIndexByPath: () => new Map(),
      deleteImageItems: async () => ({ deleted_count: 0, failed: [], updated_at_ms: Date.now() }),
    })

    const response = await service.readManageAdReviewTask({ task_id: 'stale-running-task' })
    expect(response.task?.status).toBe('paused')

    const queueState = appState.get(QUEUE_STATE_KEY)
    const pausedTaskIds = findTaskIdsByStatus(queueState, 'paused')
    expect(pausedTaskIds).toContain('stale-running-task')
  })
})
