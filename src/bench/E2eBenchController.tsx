import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import type { ReadonlyMediaRepository } from '../features/backend/repository'
import { benchEnd, benchMark } from '../features/perf/benchRecorder'
import { getBenchSettings } from '../features/perf/benchSettings'
import type { BrowserMode, ImagePackage } from '../types'

type Phase = 'init' | 'warmup' | 'waiting_data' | 'seed_wait' | 'browsing' | 'finished' | 'failed'

function nowPerf(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now()
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function resolveNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.max(min, Math.min(max, Math.round(parsed)))
}

interface NavRecord {
  step: number
  from_page: number
  to_page: number
  direction: 1 | -1
  request_at_perf_ms: number
  loading_commit_at_perf_ms: number | null
  data_commit_at_perf_ms: number
  loading_commit_latency_ms: number | null
  data_commit_latency_ms: number
}

function summarize(values: number[]) {
  if (values.length === 0) {
    return {
      count: 0,
      p50_ms: null,
      p95_ms: null,
      p99_ms: null,
      max_ms: null,
    }
  }
  const sorted = [...values].sort((a, b) => a - b)
  const quantile = (q: number) => {
    const position = (sorted.length - 1) * q
    const base = Math.floor(position)
    const rest = position - base
    const next = sorted[base + 1]
    if (next === undefined) {
      return sorted[base]
    }
    return sorted[base] + rest * (next - sorted[base])
  }
  return {
    count: values.length,
    p50_ms: quantile(0.5),
    p95_ms: quantile(0.95),
    p99_ms: quantile(0.99),
    max_ms: Math.max(...values),
  }
}

export interface E2eBenchControllerProps {
  repository: ReadonlyMediaRepository
  mode: BrowserMode
  orderedPackages: ImagePackage[]
  selectedPackageId: string
  setSelectedPackageId: (value: string) => void
  pageIndex: number | null
  totalPages: number | null
  pageLoading: boolean
  refsInPageCount: number
  goNextPage: () => void
  goPrevPage: () => void
}

function E2eBenchController({
  repository,
  mode,
  orderedPackages,
  selectedPackageId,
  setSelectedPackageId,
  pageIndex,
  totalPages,
  pageLoading,
  refsInPageCount,
  goNextPage,
  goPrevPage,
}: E2eBenchControllerProps) {
  const benchSettings = getBenchSettings()

  const tuning = useMemo(() => {
    const e2e = benchSettings.e2e
    return {
      importPaths: e2e.importPaths && e2e.importPaths.length > 0 ? e2e.importPaths : [],
      browseSteps: resolveNumber(e2e.browseSteps, 10, 0, 200),
      browseIntervalMs: resolveNumber(e2e.browseIntervalMs, 800, 50, 20_000),
      warmupMs: resolveNumber(e2e.warmupMs, 800, 0, 60_000),
      maxDurationMs: resolveNumber(e2e.maxDurationMs, 90_000, 5_000, 10 * 60_000),
    }
  }, [benchSettings.e2e])

  const tuningRef = useRef(tuning)
  useEffect(() => {
    tuningRef.current = tuning
  }, [tuning])

  const preferredPackage = useMemo(() => {
    let best: ImagePackage | null = null
    for (const pkg of orderedPackages) {
      if (pkg.images.length <= 0) {
        continue
      }
      if (!best || pkg.images.length > best.images.length) {
        best = pkg
      }
    }
    return best
  }, [orderedPackages])

  const [phase, setPhase] = useState<Phase>('init')
  const [error, setError] = useState<string | null>(null)
  const [stepDisplay, setStepDisplay] = useState(0)

  const phaseRef = useRef<Phase>('init')
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const didStartRef = useRef(false)
  const forceFinishTimerRef = useRef<number | null>(null)
  const importTaskIdRef = useRef<string | null>(null)
  const importPendingRef = useRef(false)
  const directionRef = useRef<1 | -1>(1)
  const totalPagesRef = useRef<number | null>(totalPages)
  useEffect(() => {
    totalPagesRef.current = totalPages
  }, [totalPages])
  const stepRef = useRef(0)
  const navRecordsRef = useRef<NavRecord[]>([])
  const pendingNavRef = useRef<{
    step: number
    fromPage: number
    toPage: number
    direction: 1 | -1
    requestAtPerf: number
    loadingCommitAtPerf: number | null
  } | null>(null)

  const finishOnceRef = useRef(false)

  const finish = useCallback(async (reason: string) => {
    if (finishOnceRef.current) {
      return
    }
    finishOnceRef.current = true

    const tuningSnapshot = tuningRef.current
    const phaseSnapshot = phaseRef.current

    if (forceFinishTimerRef.current !== null) {
      window.clearTimeout(forceFinishTimerRef.current)
      forceFinishTimerRef.current = null
    }

    benchMark('e2e_finish', { reason })

    const baseReport = benchEnd()
    const dataCommitLatencies = navRecordsRef.current.map((item) => item.data_commit_latency_ms)
    const loadingCommitLatencies = navRecordsRef.current
      .map((item) => item.loading_commit_latency_ms)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

    const report = {
      ...(baseReport ?? {}),
      e2e: {
        reason,
        phase: phaseSnapshot,
        scenario:
          tuningSnapshot.importPaths.length === 0
            ? 'browse'
            : tuningSnapshot.browseSteps <= 0
              ? 'seed'
              : 'browse+import',
        nav: {
          steps: navRecordsRef.current,
          data_commit_latency_ms: summarize(dataCommitLatencies),
          loading_commit_latency_ms: summarize(loadingCommitLatencies),
        },
        import: {
          paths: tuningSnapshot.importPaths,
          task_id: importTaskIdRef.current,
        },
      },
    }

    try {
      await window.mediaPlayerBench?.finish(report)
    } catch {
      // ignore
    }

    setPhase(reason === 'ok' ? 'finished' : 'failed')
  }, [])

  const requestNavigation = useCallback(
    (step: number, fromPage: number) => {
      if (finishOnceRef.current) {
        return
      }

      const total = totalPagesRef.current ?? 0
      if (!Number.isFinite(total) || total <= 1) {
        void finish('insufficient_pages')
        return
      }

      let direction: 1 | -1 = directionRef.current
      let toPage = fromPage + direction
      if (toPage < 0 || toPage >= total) {
        direction = direction === 1 ? -1 : 1
        toPage = fromPage + direction
      }

      if (toPage < 0 || toPage >= total) {
        void finish('insufficient_pages')
        return
      }

      directionRef.current = direction
      pendingNavRef.current = {
        step,
        fromPage,
        toPage,
        direction,
        requestAtPerf: nowPerf(),
        loadingCommitAtPerf: null,
      }
      benchMark('e2e_nav_request', {
        step,
        from_page: fromPage,
        to_page: toPage,
        direction,
      })

      if (direction === 1) {
        goNextPage()
      } else {
        goPrevPage()
      }
    },
    [finish, goNextPage, goPrevPage],
  )

  useEffect(() => {
    if (!benchSettings.enabled || benchSettings.mode !== 'e2e') {
      return
    }

    if (didStartRef.current) {
      return
    }

    didStartRef.current = true

    if (mode !== 'image') {
      setError('e2e bench requires image mode')
      void finish('invalid_mode')
      return
    }

    setPhase('warmup')
    importPendingRef.current = false
    benchMark('e2e_begin', {
      browse_steps: tuning.browseSteps,
      browse_interval_ms: tuning.browseIntervalMs,
      warmup_ms: tuning.warmupMs,
      import_paths: tuning.importPaths,
    })

    forceFinishTimerRef.current = window.setTimeout(() => {
      void finish('timeout')
    }, tuning.maxDurationMs)

    void (async () => {
      if (tuning.warmupMs > 0) {
        await sleep(tuning.warmupMs)
      }
      benchMark('e2e_warmup_done')

      if (tuning.importPaths.length > 0) {
        if (tuning.browseSteps <= 0) {
          try {
            const response = await repository.enqueueImportTask(
              {
                source: 'dialog-folders',
                paths: tuning.importPaths,
              },
              { timeoutMs: 20_000 },
            )
            importTaskIdRef.current = response.task.task_id
            benchMark('e2e_import_enqueued', {
              task_id: response.task.task_id,
              paths: tuning.importPaths,
              when: 'warmup',
            })
          } catch (err: unknown) {
            benchMark('e2e_import_enqueue_failed', {
              message: err instanceof Error ? err.message : String(err),
              paths: tuning.importPaths,
              when: 'warmup',
            })
          }
        } else {
          importPendingRef.current = true
          benchMark('e2e_import_scheduled', {
            when: 'after-step-0',
            paths: tuning.importPaths,
          })
        }
      }

      if (tuning.browseSteps <= 0) {
        setPhase('seed_wait')
        return
      }

      setPhase('waiting_data')
    })().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
      void finish('scenario_failed')
    })
  }, [benchSettings.enabled, benchSettings.mode, finish, mode, repository, tuning.browseIntervalMs, tuning.browseSteps, tuning.importPaths, tuning.maxDurationMs, tuning.warmupMs])

  useEffect(() => {
    if (phase !== 'seed_wait') {
      return
    }
    if (finishOnceRef.current) {
      return
    }

    const taskId = importTaskIdRef.current
    if (!taskId) {
      void finish('seed_no_import_task')
      return
    }

    let active = true
    void (async () => {
      benchMark('e2e_seed_wait_started', { task_id: taskId })
      while (active && !finishOnceRef.current) {
        try {
          const response = await repository.readImportTasks({ timeoutMs: 8_000 })
          const task = response.tasks.find((item) => item.task_id === taskId) ?? null
          if (task) {
            if (task.status === 'completed') {
              benchMark('e2e_seed_completed', { task_id: taskId })
              await finish('ok')
              return
            }
            if (task.status === 'failed') {
              benchMark('e2e_seed_failed', { task_id: taskId, error: task.error_detail })
              await finish('seed_failed')
              return
            }
          }
        } catch {
          // ignore
        }
        await sleep(1_500)
      }
    })()

    return () => {
      active = false
    }
  }, [finish, phase, repository])

  useEffect(() => {
    if (phase !== 'waiting_data') {
      return
    }
    if (finishOnceRef.current) {
      return
    }

    const targetPackage = preferredPackage
    if (!targetPackage) {
      return
    }

    if (!selectedPackageId || selectedPackageId !== targetPackage.id) {
      setSelectedPackageId(targetPackage.id)
      return
    }

    if (pageIndex === null || refsInPageCount <= 0) {
      return
    }

    totalPagesRef.current = totalPages
    if (!totalPages || totalPages <= 1) {
      void finish('insufficient_pages')
      return
    }

    benchMark('e2e_ready', {
      selected_package_id: targetPackage.id,
      initial_page_index: pageIndex,
      total_pages: totalPages,
      refs_in_page: refsInPageCount,
    })

    setPhase('browsing')
    directionRef.current = 1
    stepRef.current = 0
    setStepDisplay(0)
    navRecordsRef.current = []
    pendingNavRef.current = null
    requestNavigation(0, pageIndex)
  }, [finish, pageIndex, phase, preferredPackage, refsInPageCount, requestNavigation, selectedPackageId, setSelectedPackageId, totalPages])

  useLayoutEffect(() => {
    // Intentionally run on every render.
    // `pendingNavRef` is a ref, so it does not participate in dependency tracking.
    // If `pageLoading` is already true when we start a new navigation, we still want to
    // record the skeleton as "committed" on the next render.
    if (phase !== 'browsing') {
      return
    }

    const pending = pendingNavRef.current
    if (!pending) {
      return
    }

    if (!benchSettings.enabled || benchSettings.imageLoadingSkeleton.mode !== 'replace') {
      return
    }

    if (!pageLoading) {
      return
    }

    if (pending.loadingCommitAtPerf !== null) {
      return
    }

    pending.loadingCommitAtPerf = nowPerf()
    benchMark('e2e_nav_loading_skeleton_committed', {
      step: pending.step,
      from_page: pending.fromPage,
      to_page: pending.toPage,
      direction: pending.direction,
      latency_ms: pending.loadingCommitAtPerf - pending.requestAtPerf,
    })
  })

  useLayoutEffect(() => {
    if (phase !== 'browsing') {
      return
    }

    const pending = pendingNavRef.current
    if (!pending) {
      return
    }

    if (pageIndex === null || pageIndex !== pending.toPage) {
      return
    }

    const committedAt = nowPerf()
    const dataLatency = committedAt - pending.requestAtPerf
    const loadingLatency = pending.loadingCommitAtPerf === null ? null : pending.loadingCommitAtPerf - pending.requestAtPerf

    navRecordsRef.current.push({
      step: pending.step,
      from_page: pending.fromPage,
      to_page: pending.toPage,
      direction: pending.direction,
      request_at_perf_ms: pending.requestAtPerf,
      loading_commit_at_perf_ms: pending.loadingCommitAtPerf,
      data_commit_at_perf_ms: committedAt,
      loading_commit_latency_ms: loadingLatency,
      data_commit_latency_ms: dataLatency,
    })

    benchMark('e2e_nav_data_committed', {
      step: pending.step,
      from_page: pending.fromPage,
      to_page: pending.toPage,
      direction: pending.direction,
      data_latency_ms: dataLatency,
      loading_latency_ms: loadingLatency,
    })

    if (pending.step === 0 && importPendingRef.current) {
      importPendingRef.current = false
      const paths = tuningRef.current.importPaths
      if (paths.length > 0) {
        benchMark('e2e_import_enqueue_start', {
          when: 'after-step-0',
          paths,
        })

        void (async () => {
          try {
            const response = await repository.enqueueImportTask(
              {
                source: 'dialog-folders',
                paths,
              },
              { timeoutMs: 20_000 },
            )
            importTaskIdRef.current = response.task.task_id
            benchMark('e2e_import_enqueued', {
              task_id: response.task.task_id,
              paths,
              when: 'after-step-0',
            })
          } catch (err: unknown) {
            benchMark('e2e_import_enqueue_failed', {
              message: err instanceof Error ? err.message : String(err),
              paths,
              when: 'after-step-0',
            })
          }
        })()
      }
    }

    pendingNavRef.current = null
    stepRef.current += 1
    setStepDisplay(stepRef.current)

    if (stepRef.current >= tuning.browseSteps) {
      void finish('ok')
      return
    }

    const nextStep = stepRef.current
    window.setTimeout(() => {
      if (finishOnceRef.current) {
        return
      }
      if (pageIndex === null) {
        return
      }
      totalPagesRef.current = totalPages
      requestNavigation(nextStep, pageIndex)
    }, tuning.browseIntervalMs)
  }, [finish, pageIndex, phase, repository, requestNavigation, totalPages, tuning.browseIntervalMs, tuning.browseSteps])

  if (!benchSettings.enabled || benchSettings.mode !== 'e2e') {
    return null
  }

  // Keep UI minimal to reduce interference.
  return (
    <div
      style={{
        position: 'fixed',
        right: 12,
        bottom: 12,
        padding: 10,
        borderRadius: 10,
        border: '1px solid rgba(0,0,0,0.12)',
        background: 'rgba(255,255,255,0.92)',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 12,
        zIndex: 9999,
        maxWidth: 360,
      }}
    >
      <div>{`E2E Bench | phase=${phase} | step=${stepDisplay}/${tuning.browseSteps} | page=${pageIndex ?? '-'} | loading=${pageLoading ? '1' : '0'}`}</div>
      {error ? <div style={{ marginTop: 6, color: '#b42318' }}>{error}</div> : null}
    </div>
  )
}

export default E2eBenchController
