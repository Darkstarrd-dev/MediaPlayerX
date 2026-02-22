export type UiBenchMode = 'dom' | 'e2e'

export type ResolvedMediaApplyMode = 'immediate' | 'raf'
export type ResolvedMediaStateScope = 'accumulate' | 'active-only'

export type ImageLoadingSkeletonMode = 'off' | 'replace'

export interface ResolvedMediaTuning {
  applyMode?: ResolvedMediaApplyMode
  stateScope?: ResolvedMediaStateScope
  maxConcurrent?: number
}

export interface ImageLoadingSkeletonTuning {
  mode?: ImageLoadingSkeletonMode
}

export interface UiBenchE2eTuning {
  importPaths?: string[]
  browseSteps?: number
  browseIntervalMs?: number
  warmupMs?: number
  maxDurationMs?: number
  waitImportCompletion?: boolean
}

export interface UiBenchSettings {
  enabled: boolean
  mode: UiBenchMode | null
  candidateId: string | null
  runTag: string | null
  librarySnapshotLite?: boolean
  /** false = 禁用 P3 节流（120ms 聚合窗口 + import-task-updated 范围收窄），用于基线对比回滚 */
  importRefreshThrottle?: boolean
  resolvedMedia: ResolvedMediaTuning
  imageLoadingSkeleton: ImageLoadingSkeletonTuning
  reactProfiler: boolean
  e2e: UiBenchE2eTuning
}

const DEFAULT_SETTINGS: UiBenchSettings = {
  enabled: false,
  mode: null,
  candidateId: null,
  runTag: null,
  resolvedMedia: {},
  imageLoadingSkeleton: { mode: 'off' },
  reactProfiler: false,
  e2e: {},
}

let currentSettings: UiBenchSettings = { ...DEFAULT_SETTINGS }

export function setBenchSettings(next: Partial<UiBenchSettings>): UiBenchSettings {
  currentSettings = {
    ...DEFAULT_SETTINGS,
    ...next,
    resolvedMedia: {
      ...DEFAULT_SETTINGS.resolvedMedia,
      ...(next.resolvedMedia ?? {}),
    },
    imageLoadingSkeleton: {
      ...DEFAULT_SETTINGS.imageLoadingSkeleton,
      ...(next.imageLoadingSkeleton ?? {}),
    },
    e2e: {
      ...DEFAULT_SETTINGS.e2e,
      ...(next.e2e ?? {}),
    },
  }
  return currentSettings
}

export function getBenchSettings(): UiBenchSettings {
  return currentSettings
}

export function isBenchEnabled(): boolean {
  return Boolean(currentSettings.enabled && currentSettings.mode)
}
