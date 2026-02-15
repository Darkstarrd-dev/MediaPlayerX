import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'

import type { ManageAdReviewTaskDto } from '../../contracts/backend'
import { MetadataAdReviewSection } from './MetadataAdReviewSection'

function createTask(taskId: string, status: ManageAdReviewTaskDto['status']): ManageAdReviewTaskDto {
  const now = Date.now()
  return {
    task_id: taskId,
    status,
    progress: status === 'review' ? 1 : 0.4,
    total_count: 10,
    reviewed_count: status === 'review' ? 10 : 4,
    suspected_count: status === 'review' ? 2 : 1,
    failed_count: 0,
    known_hash_hits: 0,
    llm_calls: status === 'review' ? 10 : 4,
    scope_image_ids: ['img-1', 'img-2'],
    image_source_by_id: {
      'img-1': 'llm',
      'img-2': 'known-hash',
    },
    execution: {
      strategy: { mode: 'all' },
      max_concurrency: 4,
    },
    audit: {
      source_distribution: {
        known_hash: 1,
        llm_suspected: 1,
        llm_clean: 1,
        llm_failed: 0,
        strategy_skipped: 0,
      },
      llm_hit_rate: 0.5,
      overall_hit_rate: 0.2,
    },
    message: 'message',
    error_detail: null,
    candidates:
      status === 'review'
        ? [
            {
              image_id: 'img-1',
              package_id: 'pkg-1',
              package_name: 'pkg-1.zip',
              display_name: 'pkg-1',
              ordinal: 1,
              file_name: '001.jpg',
              reason: 'suspected',
              source: 'llm',
              hash: 'hash-1',
            },
          ]
        : [],
    created_at_ms: now,
    updated_at_ms: now,
  }
}

function renderSection(overrides: Partial<ComponentProps<typeof MetadataAdReviewSection>> = {}) {
  const onStartAdReview = vi.fn()
  const onPauseAdReview = vi.fn()
  const onSelectAdReviewTask = vi.fn()
  const onRemoveAdReviewTask = vi.fn()
  const onToggleAdReviewFocus = vi.fn()

  const queueTasks = [createTask('task-running', 'running'), createTask('task-review', 'review')]
  const adReviewTask = queueTasks[1]

  render(
    <MetadataAdReviewSection
      adReviewPending={false}
      adReviewTask={adReviewTask}
      adReviewQueueTasks={queueTasks}
      adReviewActiveTaskId={adReviewTask.task_id}
      adReviewHideUncheckedNonChecked={false}
      hasCheckedAdReviewCandidates={false}
      selectedAdReviewCandidateCount={1}
      adReviewFocusTaskId={null}
      adReviewStrategyMode="all"
      adReviewMaxConcurrency={4}
      adReviewHeadN={8}
      adReviewTailN={8}
      adReviewTailStopCleanStreak={6}
      canExecuteAdReview={true}
      onStartAdReview={onStartAdReview}
      onPauseAdReview={onPauseAdReview}
      onToggleHideUncheckedNonChecked={vi.fn()}
      onSelectAdReviewTask={onSelectAdReviewTask}
      onRemoveAdReviewTask={onRemoveAdReviewTask}
      onToggleAdReviewFocus={onToggleAdReviewFocus}
      onAdReviewStrategyModeChange={vi.fn()}
      onAdReviewMaxConcurrencyChange={vi.fn()}
      onAdReviewHeadNChange={vi.fn()}
      onAdReviewTailNChange={vi.fn()}
      onAdReviewTailStopCleanStreakChange={vi.fn()}
      onDismissAdReviewTask={vi.fn()}
      {...overrides}
    />,
  )

  return {
    onStartAdReview,
    onPauseAdReview,
    onSelectAdReviewTask,
    onRemoveAdReviewTask,
    onToggleAdReviewFocus,
  }
}

describe('MetadataAdReviewSection', () => {
  it('renders queue items and supports select/remove actions', () => {
    const { onSelectAdReviewTask, onRemoveAdReviewTask } = renderSection()

    fireEvent.click(screen.getByRole('button', { name: /审核中40% · 4\/10/ }))
    expect(onSelectAdReviewTask).toHaveBeenCalledWith('task-running')

    const removeButtons = screen.getAllByRole('button', { name: '移除' })
    fireEvent.click(removeButtons[1])
    expect(onRemoveAdReviewTask).toHaveBeenCalledWith('task-review')
  })

  it('shows focus button state and triggers toggle', () => {
    const { onToggleAdReviewFocus } = renderSection({ adReviewFocusTaskId: null })

    const focusButton = screen.getByRole('button', { name: 'focus' })
    fireEvent.click(focusButton)
    expect(onToggleAdReviewFocus).toHaveBeenCalledTimes(1)
  })

  it('keeps focus toggle available while running when candidates exist', () => {
    const runningTask = createTask('task-running', 'running')
    runningTask.candidates = [
      {
        image_id: 'img-1',
        package_id: 'pkg-1',
        package_name: 'pkg-1.zip',
        display_name: 'pkg-1',
        ordinal: 1,
        file_name: '001.jpg',
        reason: 'suspected',
        source: 'llm',
        hash: 'hash-1',
      },
    ]

    const { onToggleAdReviewFocus } = renderSection({
      adReviewTask: runningTask,
      adReviewQueueTasks: [runningTask],
      adReviewActiveTaskId: runningTask.task_id,
    })

    const focusButton = screen.getByRole('button', { name: 'focus' })
    expect(focusButton).toBeEnabled()
    fireEvent.click(focusButton)
    expect(onToggleAdReviewFocus).toHaveBeenCalledTimes(1)
  })

  it('opens start dialog and passes skip option', () => {
    const { onStartAdReview } = renderSection({ adReviewTask: createTask('task-pending', 'pending') })

    fireEvent.click(screen.getByRole('button', { name: '执行AI广告审核' }))
    expect(screen.getByRole('dialog', { name: '选择AI广告审核执行方式' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '不跳过已扫描的' }))
    expect(onStartAdReview).toHaveBeenCalledWith({ skipReviewedNodes: false })
  })

  it('running task pauses immediately without opening start dialog', () => {
    const runningTask = createTask('task-running', 'running')
    const { onPauseAdReview } = renderSection({ adReviewTask: runningTask, adReviewQueueTasks: [runningTask] })

    fireEvent.click(screen.getByRole('button', { name: '暂停AI广告审核' }))
    expect(onPauseAdReview).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog', { name: '选择AI广告审核执行方式' })).toBeNull()
  })

  it('shows reset-exclusion action and removes hide-unchecked action', () => {
    renderSection()

    expect(screen.getByRole('button', { name: /待复核.*1\/1/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重置剔除' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /隐藏未勾选图片|显示全部图片/ })).toBeNull()
  })

  it('hides pending-review content and focus button when review has no candidates', () => {
    const reviewTask = createTask('task-review', 'review')
    reviewTask.candidates = []
    reviewTask.suspected_count = 0

    renderSection({
      adReviewTask: reviewTask,
      adReviewQueueTasks: [reviewTask],
      adReviewActiveTaskId: reviewTask.task_id,
      selectedAdReviewCandidateCount: 0,
    })

    expect(screen.queryByRole('button', { name: 'focus' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'return' })).toBeNull()
    expect(screen.queryByRole('button', { name: '重置剔除' })).toBeNull()
    expect(screen.getByRole('button', { name: /已完成.*无待复核/ })).toBeInTheDocument()
    expect(screen.getByText('本轮审核已完成，无待复核内容。')).toBeInTheDocument()
  })
})
