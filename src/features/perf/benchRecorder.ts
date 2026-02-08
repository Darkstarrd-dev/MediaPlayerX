import { getBenchSettings } from './benchSettings'

type ReactProfilerPhase = 'mount' | 'update' | 'nested-update'

export interface BenchMarkEvent {
  name: string
  at_perf_ms: number
  data?: unknown
}

export interface BenchIpcTimingEvent {
  name: string
  duration_ms: number
  ok: boolean
  at_perf_ms: number
  error?: string
}

export interface BenchReactProfilerEvent {
  id: string
  phase: ReactProfilerPhase
  actual_duration_ms: number
  base_duration_ms: number
  start_time_ms: number
  commit_time_ms: number
}

export interface BenchQuantiles {
  count: number
  p50_ms: number | null
  p95_ms: number | null
  p99_ms: number | null
  max_ms: number | null
}

export interface UiBenchReport {
  bench: {
    mode: string | null
    candidate_id: string | null
    run_tag: string | null
    settings: unknown
  }
  timestamps: {
    started_at_perf_ms: number
    ended_at_perf_ms: number
    elapsed_ms: number
  }
  raf_gap_ms: BenchQuantiles
  longtask_ms: {
    count: number
    max_ms: number | null
    total_ms: number
  }
  react_profiler: {
    total_events: number
    by_id: Record<string, BenchQuantiles>
  }
  ipc_timings: {
    total_events: number
    by_name: Record<string, BenchQuantiles>
  }
  marks: BenchMarkEvent[]
}

function nowPerf(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now()
}

function toNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function quantile(values: number[], q: number): number | null {
  if (values.length === 0) {
    return null
  }
  const sorted = [...values].sort((a, b) => a - b)
  const position = (sorted.length - 1) * q
  const base = Math.floor(position)
  const rest = position - base
  const next = sorted[base + 1]
  if (next === undefined) {
    return sorted[base]
  }
  return sorted[base] + rest * (next - sorted[base])
}

function summarize(values: number[]): BenchQuantiles {
  const max = values.length > 0 ? Math.max(...values) : null
  return {
    count: values.length,
    p50_ms: quantile(values, 0.5),
    p95_ms: quantile(values, 0.95),
    p99_ms: quantile(values, 0.99),
    max_ms: max,
  }
}

interface RunState {
  startedAtPerf: number
  endedAtPerf: number
  rafGapsMs: number[]
  rafStop: (() => void) | null
  longTaskDurationsMs: number[]
  longTaskObserver: PerformanceObserver | null
  ipcTimings: BenchIpcTimingEvent[]
  reactProfilerEvents: BenchReactProfilerEvent[]
  marks: BenchMarkEvent[]
}

let runState: RunState | null = null

function startRafGapMonitor(): () => void {
  let rafId: number | null = null
  let last: number | null = null

  const step = (ts: number) => {
    if (last !== null) {
      const gap = ts - last
      if (runState) {
        runState.rafGapsMs.push(gap)
      }
    }
    last = ts
    rafId = window.requestAnimationFrame(step)
  }

  rafId = window.requestAnimationFrame(step)

  return () => {
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId)
    }
  }
}

function startLongTaskMonitor(): { observer: PerformanceObserver | null; stop: () => void } {
  try {
    if (typeof PerformanceObserver === 'undefined') {
      return { observer: null, stop: () => undefined }
    }

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const duration = toNumber((entry as PerformanceEntry).duration)
        if (duration === null) {
          continue
        }
        if (runState) {
          runState.longTaskDurationsMs.push(duration)
        }
      }
    })

    // Some runtimes may throw if unsupported.
    observer.observe({ type: 'longtask', buffered: true } as PerformanceObserverInit)
    return {
      observer,
      stop: () => {
        try {
          observer.disconnect()
        } catch {
          // ignore
        }
      },
    }
  } catch {
    return { observer: null, stop: () => undefined }
  }
}

export function benchBegin(): void {
  const settings = getBenchSettings()
  if (!settings.enabled) {
    runState = null
    return
  }

  runState = {
    startedAtPerf: nowPerf(),
    endedAtPerf: 0,
    rafGapsMs: [],
    rafStop: null,
    longTaskDurationsMs: [],
    longTaskObserver: null,
    ipcTimings: [],
    reactProfilerEvents: [],
    marks: [],
  }

  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    runState.rafStop = startRafGapMonitor()
  }

  const { observer, stop } = startLongTaskMonitor()
  runState.longTaskObserver = observer
  // piggyback stop on rafStop to keep single stop point
  const prevStop = runState.rafStop
  runState.rafStop = () => {
    prevStop?.()
    stop()
  }
}

export function benchMark(name: string, data?: unknown): void {
  const settings = getBenchSettings()
  if (!settings.enabled || !runState) {
    return
  }
  runState.marks.push({
    name,
    at_perf_ms: nowPerf(),
    data,
  })
}

export function benchRecordIpcTiming(name: string, durationMs: number, ok: boolean, error?: string): void {
  const settings = getBenchSettings()
  if (!settings.enabled || !runState) {
    return
  }

  runState.ipcTimings.push({
    name,
    duration_ms: durationMs,
    ok,
    at_perf_ms: nowPerf(),
    error,
  })
}

export function benchOnReactRender(
  id: string,
  phase: ReactProfilerPhase,
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number,
): void {
  const settings = getBenchSettings()
  if (!settings.enabled || !settings.reactProfiler || !runState) {
    return
  }

  runState.reactProfilerEvents.push({
    id,
    phase,
    actual_duration_ms: actualDuration,
    base_duration_ms: baseDuration,
    start_time_ms: startTime,
    commit_time_ms: commitTime,
  })
}

export function benchEnd(): UiBenchReport | null {
  const settings = getBenchSettings()
  if (!settings.enabled || !runState) {
    runState = null
    return null
  }

  runState.endedAtPerf = nowPerf()
  runState.rafStop?.()

  const rafSummary = summarize(runState.rafGapsMs)

  const longTaskMax = runState.longTaskDurationsMs.length > 0 ? Math.max(...runState.longTaskDurationsMs) : null
  const longTaskTotal = runState.longTaskDurationsMs.reduce((acc, value) => acc + value, 0)

  const reactById: Record<string, number[]> = {}
  for (const item of runState.reactProfilerEvents) {
    const list = reactById[item.id] ?? []
    list.push(item.actual_duration_ms)
    reactById[item.id] = list
  }
  const reactSummaryById: Record<string, BenchQuantiles> = {}
  for (const [id, values] of Object.entries(reactById)) {
    reactSummaryById[id] = summarize(values)
  }

  const ipcByName: Record<string, number[]> = {}
  for (const item of runState.ipcTimings) {
    const list = ipcByName[item.name] ?? []
    list.push(item.duration_ms)
    ipcByName[item.name] = list
  }
  const ipcSummaryByName: Record<string, BenchQuantiles> = {}
  for (const [name, values] of Object.entries(ipcByName)) {
    ipcSummaryByName[name] = summarize(values)
  }

  const report: UiBenchReport = {
    bench: {
      mode: settings.mode,
      candidate_id: settings.candidateId,
      run_tag: settings.runTag,
      settings,
    },
    timestamps: {
      started_at_perf_ms: runState.startedAtPerf,
      ended_at_perf_ms: runState.endedAtPerf,
      elapsed_ms: runState.endedAtPerf - runState.startedAtPerf,
    },
    raf_gap_ms: rafSummary,
    longtask_ms: {
      count: runState.longTaskDurationsMs.length,
      max_ms: longTaskMax,
      total_ms: longTaskTotal,
    },
    react_profiler: {
      total_events: runState.reactProfilerEvents.length,
      by_id: reactSummaryById,
    },
    ipc_timings: {
      total_events: runState.ipcTimings.length,
      by_name: ipcSummaryByName,
    },
    marks: runState.marks,
  }

  runState = null
  return report
}
