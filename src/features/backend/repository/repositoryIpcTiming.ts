import { benchRecordIpcTiming } from '../../perf/benchRecorder'

export async function withIpcTiming<T>(channel: string, task: () => Promise<T>): Promise<T> {
  const startedAt = performance.now()
  try {
    const value = await task()
    benchRecordIpcTiming(channel, performance.now() - startedAt, true)
    return value
  } catch (error: unknown) {
    benchRecordIpcTiming(channel, performance.now() - startedAt, false, error instanceof Error ? error.message : String(error))
    throw error
  }
}
