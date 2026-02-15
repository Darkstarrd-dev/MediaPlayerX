import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ManageAdReviewTaskDto } from '../../contracts/backend'
import type { MediaRepository } from '../backend/repository'
import { useManageAdReviewActions } from './useManageAdReviewActions'

function createTask(taskId: string, status: ManageAdReviewTaskDto['status'], overrides?: Partial<ManageAdReviewTaskDto>): ManageAdReviewTaskDto {
  const now = Date.now()
  return {
    task_id: taskId,
    status,
    progress: 0,
    total_count: 10,
    reviewed_count: 0,
    suspected_count: 0,
    failed_count: 0,
    known_hash_hits: 0,
    llm_calls: 0,
    scope_image_ids: ['img-1', 'img-2'],
    image_source_by_id: {},
    execution: {
      strategy: { mode: 'all' },
      max_concurrency: 4,
    },
    audit: {
      source_distribution: {
        known_hash: 0,
        llm_suspected: 0,
        llm_clean: 0,
        llm_failed: 0,
        strategy_skipped: 0,
      },
      llm_hit_rate: 0,
      overall_hit_rate: 0,
    },
    message: null,
    error_detail: null,
    candidates: [],
    created_at_ms: now,
    updated_at_ms: now,
    ...overrides,
  }
}

function createQueueStateJson(tasks: ManageAdReviewTaskDto[]): string {
  return JSON.stringify({
    version: 1,
    items: tasks.map((task) => ({ task })),
  })
}

describe('useManageAdReviewActions', () => {
  it('merges running task progress from runtime read', async () => {
    const queueRunningTask = createTask('task-running', 'running', {
      progress: 0,
      reviewed_count: 0,
      total_count: 20,
    })
    const queueReviewTask = createTask('task-review', 'review', {
      progress: 1,
      reviewed_count: 8,
      total_count: 8,
    })
    const runtimeRunningTask = createTask('task-running', 'running', {
      progress: 0.35,
      reviewed_count: 7,
      total_count: 20,
      audit: {
        source_distribution: {
          known_hash: 1,
          llm_suspected: 2,
          llm_clean: 4,
          llm_failed: 0,
          strategy_skipped: 0,
        },
        llm_hit_rate: 2 / 6,
        overall_hit_rate: 2 / 20,
      },
    })

    const readAppState = vi.fn().mockResolvedValue({
      state_json: createQueueStateJson([queueRunningTask, queueReviewTask]),
    })
    const readManageAdReviewTask = vi.fn().mockResolvedValue({
      task: runtimeRunningTask,
    })

    const repository = {
      readAppState,
      readManageAdReviewTask,
    } as unknown as MediaRepository

    const { result } = renderHook(() =>
      useManageAdReviewActions({
        repository,
        mode: 'image',
        manageMode: true,
        activeSelectionScope: null,
        imageCheckedIds: [],
        sidebarCheckedNodeIds: [],
        llmEndpoint: '',
        llmModel: '',
        adReviewStrategyMode: 'all',
        adReviewHeadN: 0,
        adReviewTailN: 0,
        adReviewTailStopCleanStreak: 1,
        adReviewMaxConcurrency: 4,
        clearAllSelections: vi.fn(),
        replaceImageCheckedIds: vi.fn(),
        setManageOperationHint: vi.fn(),
      }),
    )

    await waitFor(() => {
      expect(result.current.queueTasks).toHaveLength(2)
      expect(result.current.task?.task_id).toBe('task-running')
      expect(result.current.task?.reviewed_count).toBe(7)
      expect(result.current.task?.progress).toBe(0.35)
    })

    expect(readManageAdReviewTask).toHaveBeenCalled()
    expect(readManageAdReviewTask.mock.calls[0]).toEqual([
      { task_id: 'task-running' },
      { timeoutMs: 10_000 },
    ])
  })

  it('does not read runtime task when queue has no running item', async () => {
    const readAppState = vi.fn().mockResolvedValue({
      state_json: createQueueStateJson([createTask('task-review', 'review', { progress: 1, reviewed_count: 2, total_count: 2 })]),
    })
    const readManageAdReviewTask = vi.fn()

    const repository = {
      readAppState,
      readManageAdReviewTask,
    } as unknown as MediaRepository

    const { result } = renderHook(() =>
      useManageAdReviewActions({
        repository,
        mode: 'image',
        manageMode: true,
        activeSelectionScope: null,
        imageCheckedIds: [],
        sidebarCheckedNodeIds: [],
        llmEndpoint: '',
        llmModel: '',
        adReviewStrategyMode: 'all',
        adReviewHeadN: 0,
        adReviewTailN: 0,
        adReviewTailStopCleanStreak: 1,
        adReviewMaxConcurrency: 4,
        clearAllSelections: vi.fn(),
        replaceImageCheckedIds: vi.fn(),
        setManageOperationHint: vi.fn(),
      }),
    )

    await waitFor(() => {
      expect(result.current.queueTasks).toHaveLength(1)
      expect(result.current.task?.task_id).toBe('task-review')
    })

    expect(readManageAdReviewTask).not.toHaveBeenCalled()
  })
})
