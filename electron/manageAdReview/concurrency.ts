export function createAbortError(message: string): Error {
  const error = new Error(message)
  error.name = 'AbortError'
  return error
}

export function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw createAbortError('操作已取消')
  }
}

export function normalizeConcurrency(value: number | undefined, fallback = 2): number {
  if (!Number.isFinite(value)) {
    return Math.max(1, Math.floor(fallback))
  }
  return Math.max(1, Math.floor(value as number))
}

interface MapWithConcurrencyParams<TItem, TResult> {
  items: TItem[]
  concurrency?: number
  signal?: AbortSignal
  worker: (item: TItem, index: number) => Promise<TResult>
}

export async function mapWithConcurrency<TItem, TResult>({
  items,
  concurrency,
  signal,
  worker,
}: MapWithConcurrencyParams<TItem, TResult>): Promise<TResult[]> {
  if (items.length === 0) {
    return []
  }

  const normalizedConcurrency = Math.min(items.length, normalizeConcurrency(concurrency))
  const results = new Array<TResult>(items.length)
  let cursor = 0

  const runWorker = async () => {
    while (true) {
      assertNotAborted(signal)

      const index = cursor
      cursor += 1

      if (index >= items.length) {
        return
      }

      results[index] = await worker(items[index], index)
    }
  }

  const runners = Array.from({ length: normalizedConcurrency }, () => runWorker())
  await Promise.all(runners)
  return results
}
