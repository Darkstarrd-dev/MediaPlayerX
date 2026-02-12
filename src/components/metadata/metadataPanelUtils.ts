import type { ManageAdReviewTaskDto } from '../../contracts/backend'

export const AD_REVIEW_CONCURRENCY_OPTIONS = Array.from({ length: 9 }, (_, index) => index + 4)
export const AD_REVIEW_WINDOW_OPTIONS = Array.from({ length: 201 }, (_, index) => index)
export const AD_REVIEW_STREAK_OPTIONS = Array.from({ length: 200 }, (_, index) => index + 1)

export function resolveAdReviewStatusLabel(status: ManageAdReviewTaskDto['status']): string {
  if (status === 'running') {
    return '审核中'
  }
  if (status === 'paused') {
    return '已暂停'
  }
  if (status === 'failed') {
    return '失败'
  }
  return '待复核'
}

export function formatPercent(value: number): string {
  const normalized = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
  return `${(normalized * 100).toFixed(1)}%`
}

export function resolveAdReviewExecutionLabel(task: ManageAdReviewTaskDto): string | null {
  if (!task.execution) {
    return null
  }

  const strategy = task.execution.strategy
  const strategyLabel =
    strategy.mode === 'head-tail'
      ? `head-tail(h=${strategy.head_n}, t=${strategy.tail_n}, stop=${strategy.tail_stop_clean_streak})`
      : 'all'

  return `策略 ${strategyLabel} | 并发 ${task.execution.max_concurrency}`
}

export function resolveTagGroupKey(tag: string): string {
  const normalized = tag.trim()
  if (!normalized) {
    return '#'
  }

  const first = normalized[0]?.toUpperCase() ?? '#'
  return /[A-Z0-9]/.test(first) ? first : '#'
}

export function parseTagsInput(value: string): string[] {
  const next = new Set<string>()
  for (const item of value.split(/[\n,，]/)) {
    const normalized = item.trim()
    if (normalized.length > 0) {
      next.add(normalized)
    }
  }
  return Array.from(next)
}
