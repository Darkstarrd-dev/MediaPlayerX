export const AD_REVIEW_CONCURRENCY_OPTIONS = Array.from({ length: 20 }, (_, index) => index + 1)
export const AD_REVIEW_WINDOW_OPTIONS = Array.from({ length: 20 }, (_, index) => index + 1)
export const AD_REVIEW_STREAK_OPTIONS = Array.from({ length: 20 }, (_, index) => index + 1)

export function formatPercent(value: number): string {
  const normalized = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
  return `${(normalized * 100).toFixed(1)}%`
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
