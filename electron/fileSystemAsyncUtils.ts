export async function parallelMapLimit<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return []
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length))
  const results = new Array<R>(items.length)
  let cursor = 0

  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const index = cursor
      cursor += 1
      if (index >= items.length) {
        return
      }

      results[index] = await mapper(items[index], index)
    }
  })

  await Promise.all(workers)
  return results
}
