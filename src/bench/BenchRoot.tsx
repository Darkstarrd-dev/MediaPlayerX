import { useEffect, useMemo, useRef, useState } from 'react'

import App from '../App'
import { benchBegin, benchMark } from '../features/perf/benchRecorder'
import {
  setBenchSettings,
  type ImageLoadingSkeletonMode,
  type ImageLoadingSkeletonTuning,
  type ResolvedMediaApplyMode,
  type ResolvedMediaStateScope,
  type ResolvedMediaTuning,
  type UiBenchE2eTuning,
  type UiBenchMode,
} from '../features/perf/benchSettings'
import DomBenchRunner from './DomBenchRunner'

type BenchStatus = 'loading' | 'ready' | 'error'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function resolveBenchMode(raw: string): UiBenchMode | null {
  const value = raw.trim().toLowerCase()
  if (value === 'dom') {
    return 'dom'
  }
  if (value === 'e2e') {
    return 'e2e'
  }
  return null
}

function buildRunTag(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function isResolvedMediaApplyMode(value: string): value is ResolvedMediaApplyMode {
  return value === 'raf' || value === 'immediate'
}

function isResolvedMediaStateScope(value: string): value is ResolvedMediaStateScope {
  return value === 'active-only' || value === 'accumulate'
}

function isSkeletonMode(value: string): value is ImageLoadingSkeletonMode {
  return value === 'off' || value === 'replace'
}

function parseResolvedMediaTuning(config: Record<string, unknown>): ResolvedMediaTuning {
  const raw = isRecord(config.resolvedMedia) ? config.resolvedMedia : {}
  const applyModeRaw = typeof raw.applyMode === 'string' ? raw.applyMode : typeof raw.apply_mode === 'string' ? raw.apply_mode : ''
  const stateScopeRaw = typeof raw.stateScope === 'string' ? raw.stateScope : typeof raw.state_scope === 'string' ? raw.state_scope : ''
  const maxConcurrentRaw =
    typeof raw.maxConcurrent === 'number'
      ? raw.maxConcurrent
      : typeof raw.max_concurrent === 'number'
        ? raw.max_concurrent
        : null

  return {
    applyMode: isResolvedMediaApplyMode(applyModeRaw) ? applyModeRaw : undefined,
    stateScope: isResolvedMediaStateScope(stateScopeRaw) ? stateScopeRaw : undefined,
    maxConcurrent:
      typeof maxConcurrentRaw === 'number' && Number.isFinite(maxConcurrentRaw) && maxConcurrentRaw > 0
        ? Math.round(maxConcurrentRaw)
        : undefined,
  }
}

function parseSkeletonTuning(config: Record<string, unknown>): ImageLoadingSkeletonTuning {
  const raw = isRecord(config.imageLoadingSkeleton) ? config.imageLoadingSkeleton : {}
  const modeRaw = typeof raw.mode === 'string' ? raw.mode : ''
  return {
    mode: isSkeletonMode(modeRaw) ? modeRaw : undefined,
  }
}

function parseE2eTuning(config: Record<string, unknown>): UiBenchE2eTuning {
  const raw = isRecord(config.e2e) ? config.e2e : {}
  const importPathsRaw = Array.isArray(raw.importPaths)
    ? raw.importPaths
    : Array.isArray(raw.import_paths)
      ? raw.import_paths
      : null
  const importPaths = importPathsRaw
    ? importPathsRaw.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : undefined

  const browseStepsRaw = typeof raw.browseSteps === 'number' ? raw.browseSteps : typeof raw.browse_steps === 'number' ? raw.browse_steps : null
  const browseIntervalRaw =
    typeof raw.browseIntervalMs === 'number'
      ? raw.browseIntervalMs
      : typeof raw.browse_interval_ms === 'number'
        ? raw.browse_interval_ms
        : null
  const warmupRaw = typeof raw.warmupMs === 'number' ? raw.warmupMs : typeof raw.warmup_ms === 'number' ? raw.warmup_ms : null
  const maxDurationRaw =
    typeof raw.maxDurationMs === 'number'
      ? raw.maxDurationMs
      : typeof raw.max_duration_ms === 'number'
        ? raw.max_duration_ms
        : null

  return {
    importPaths,
    browseSteps:
      typeof browseStepsRaw === 'number' && Number.isFinite(browseStepsRaw) && browseStepsRaw >= 0
        ? Math.round(browseStepsRaw)
        : undefined,
    browseIntervalMs:
      typeof browseIntervalRaw === 'number' && Number.isFinite(browseIntervalRaw) && browseIntervalRaw > 0
        ? Math.round(browseIntervalRaw)
        : undefined,
    warmupMs: typeof warmupRaw === 'number' && Number.isFinite(warmupRaw) && warmupRaw >= 0 ? Math.round(warmupRaw) : undefined,
    maxDurationMs:
      typeof maxDurationRaw === 'number' && Number.isFinite(maxDurationRaw) && maxDurationRaw > 0 ? Math.round(maxDurationRaw) : undefined,
  }
}

export interface BenchRootProps {
  benchMode: string
}

function BenchRoot({ benchMode }: BenchRootProps) {
  const mode = useMemo(() => resolveBenchMode(benchMode), [benchMode])
  const [status, setStatus] = useState<BenchStatus>(mode ? 'loading' : 'error')
  const [error, setError] = useState<string | null>(mode ? null : `unsupported bench mode: ${benchMode}`)
  const [rawConfig, setRawConfig] = useState<Record<string, unknown>>({})
  const bootedRef = useRef(false)

  useEffect(() => {
    if (!mode || bootedRef.current) {
      return
    }
    bootedRef.current = true

    const boot = async () => {
      const response = await window.mediaPlayerBench?.readConfig().catch(() => null)
      const envConfig = isRecord(response?.config) ? response!.config : {}
      const config = isRecord(envConfig) ? envConfig : {}
      setRawConfig(config)

      const candidateId = typeof config.candidateId === 'string' ? config.candidateId : typeof config.candidate_id === 'string' ? config.candidate_id : 'candidate'
      const runTag = typeof config.runTag === 'string' ? config.runTag : typeof config.run_tag === 'string' ? config.run_tag : buildRunTag()

      setBenchSettings({
        enabled: true,
        mode,
        candidateId,
        runTag,
        resolvedMedia: parseResolvedMediaTuning(config),
        imageLoadingSkeleton: parseSkeletonTuning(config),
        reactProfiler: Boolean(config.reactProfiler ?? true),
        e2e: parseE2eTuning(config),
      })

      benchBegin()
      benchMark('bench_booted', {
        mode,
        candidate_id: candidateId,
        run_tag: runTag,
      })
      setStatus('ready')
    }

    void boot().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    })
  }, [mode])

  if (status === 'error' || !mode) {
    return (
      <div style={{ padding: 16, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>
        <strong>Bench启动失败</strong>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{error ?? 'unknown error'}</pre>
      </div>
    )
  }

  if (status !== 'ready') {
    return (
      <div style={{ padding: 16, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>
        <strong>Bench准备中...</strong>
      </div>
    )
  }

  if (mode === 'dom') {
    return <DomBenchRunner config={rawConfig} />
  }

  return <App />
}

export default BenchRoot
