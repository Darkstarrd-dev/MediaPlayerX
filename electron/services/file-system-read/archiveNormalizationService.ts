import { existsSync } from 'node:fs'
import path from 'node:path'
import { Worker } from 'node:worker_threads'

import {
  readArchiveLoadStatusResponseSchema,
  type ReadArchiveLoadStatusResponseDto,
} from '../../../src/contracts/backend'
import {
  normalizeArchiveToStoreZipInPlace,
  resolveArchiveReplacementZipPath,
} from '../../archiveWasmExtractor'

export interface ArchiveNormalizationTaskState {
  status: 'pending' | 'running' | 'completed' | 'failed'
  error: string | null
  updatedAtMs: number
}

interface ArchiveNormalizationServiceOptions {
  idleMs: number
  recheckMs: number
  isTargetEligible: (sourceArchivePath: string) => boolean
  hasRunningImportTasks: () => boolean
  isSnapshotLoading: () => boolean
  onArchiveNormalized: (sourceArchivePath: string, outputZipPath: string) => Promise<void>
  emitLibraryChanged: (payload: { reason: 'archive-normalized' | 'archive-normalize-failed'; updated_at_ms: number }) => void
  emitArchiveLoadStatusChanged: (payload: ReadArchiveLoadStatusResponseDto) => void
}

export class ArchiveNormalizationService {
  // 低优先级队列用于后台归一化（空闲窗口执行），高优先级用于“用户刚打开目标包”时抢占执行。
  private archiveNormalizationPendingLow = new Set<string>()

  private archiveNormalizationPendingHigh = new Set<string>()

  private archiveNormalizationRunningPath: string | null = null

  private archiveNormalizationDrainTimer: ReturnType<typeof setTimeout> | null = null

  private lastInteractiveReadAtMs = Date.now()

  private thumbnailRenderingInFlight = 0

  private archiveNormalizationStateBySourcePath = new Map<string, ArchiveNormalizationTaskState>()

  private archiveNormalizeWorkerScriptPath: string | null = null

  constructor(private readonly options: ArchiveNormalizationServiceOptions) {}

  dispose(): void {
    if (this.archiveNormalizationDrainTimer !== null) {
      clearTimeout(this.archiveNormalizationDrainTimer)
      this.archiveNormalizationDrainTimer = null
    }
  }

  clear(): void {
    this.archiveNormalizationPendingLow.clear()
    this.archiveNormalizationPendingHigh.clear()
    this.archiveNormalizationRunningPath = null
    this.archiveNormalizationStateBySourcePath.clear()
    this.dispose()
    this.emitStatusChanged()
  }

  deleteStateByPath(pathValue: string): void {
    const resolvedPath = path.resolve(pathValue)
    this.archiveNormalizationPendingLow.delete(resolvedPath)
    this.archiveNormalizationPendingHigh.delete(resolvedPath)
    this.archiveNormalizationStateBySourcePath.delete(resolvedPath)
    if (this.archiveNormalizationRunningPath === resolvedPath) {
      this.archiveNormalizationRunningPath = null
    }
  }

  hasPending(): boolean {
    return this.archiveNormalizationPendingHigh.size > 0 || this.archiveNormalizationPendingLow.size > 0
  }

  onInteractiveRead(): void {
    this.lastInteractiveReadAtMs = Date.now()
    if (this.archiveNormalizationPendingHigh.size === 0 && this.archiveNormalizationPendingLow.size > 0) {
      this.scheduleDrain(this.options.idleMs)
    }
  }

  onThumbnailRenderingStart(): void {
    this.thumbnailRenderingInFlight += 1
  }

  onThumbnailRenderingEnd(): void {
    this.thumbnailRenderingInFlight = Math.max(0, this.thumbnailRenderingInFlight - 1)
  }

  queueRar7zNormalization(sourceArchivePath: string, priority: 'low' | 'high' = 'low'): void {
    const resolvedPath = path.resolve(sourceArchivePath)
    if (!this.options.isTargetEligible(resolvedPath)) {
      return
    }

    const state = this.archiveNormalizationStateBySourcePath.get(resolvedPath)
    if (state?.status === 'running' || state?.status === 'completed') {
      return
    }

    this.archiveNormalizationStateBySourcePath.set(resolvedPath, {
      status: 'pending',
      error: null,
      updatedAtMs: Date.now(),
    })

    if (priority === 'high') {
      this.archiveNormalizationPendingLow.delete(resolvedPath)
      this.archiveNormalizationPendingHigh.add(resolvedPath)
      this.emitStatusChanged()
      this.scheduleDrain(0)
      return
    }

    if (!this.archiveNormalizationPendingHigh.has(resolvedPath)) {
      this.archiveNormalizationPendingLow.add(resolvedPath)
    }
    this.emitStatusChanged()
    this.scheduleDrain(this.options.recheckMs)
  }

  async readArchiveLoadStatus(): Promise<ReadArchiveLoadStatusResponseDto> {
    this.prunePendingSets()
    return this.buildArchiveLoadStatusPayload()
  }

  scheduleDrain(delayMs = 0): void {
    if (this.archiveNormalizationDrainTimer !== null) {
      clearTimeout(this.archiveNormalizationDrainTimer)
      this.archiveNormalizationDrainTimer = null
    }

    this.archiveNormalizationDrainTimer = setTimeout(() => {
      this.archiveNormalizationDrainTimer = null
      void this.drainQueue()
    }, Math.max(0, delayMs))
  }

  private emitStatusChanged(): void {
    this.options.emitArchiveLoadStatusChanged(this.buildArchiveLoadStatusPayload())
  }

  private buildArchiveLoadStatusPayload(): ReadArchiveLoadStatusResponseDto {
    const pendingArchivePaths = Array.from(
      new Set([...this.archiveNormalizationPendingHigh, ...this.archiveNormalizationPendingLow]),
    )
      .filter((value) => this.options.isTargetEligible(value))
      .sort((left, right) => left.localeCompare(right, 'zh-CN'))

    const runningArchivePath =
      this.archiveNormalizationRunningPath && this.options.isTargetEligible(this.archiveNormalizationRunningPath)
        ? this.archiveNormalizationRunningPath
        : null

    return readArchiveLoadStatusResponseSchema.parse({
      running_archive_path: runningArchivePath,
      pending_archive_paths: pendingArchivePaths,
      updated_at_ms: Date.now(),
    })
  }

  private prunePendingSets(): void {
    for (const candidate of this.archiveNormalizationPendingHigh) {
      if (!this.options.isTargetEligible(candidate)) {
        this.archiveNormalizationPendingHigh.delete(candidate)
      }
    }
    for (const candidate of this.archiveNormalizationPendingLow) {
      if (!this.options.isTargetEligible(candidate)) {
        this.archiveNormalizationPendingLow.delete(candidate)
      }
    }
  }

  private pickNextTarget(): { path: string; priority: 'high' | 'low' } | null {
    this.prunePendingSets()

    if (this.archiveNormalizationPendingHigh.size > 0) {
      const next = this.archiveNormalizationPendingHigh.values().next().value
      if (typeof next === 'string') {
        return { path: next, priority: 'high' }
      }
    }

    if (this.archiveNormalizationPendingLow.size > 0) {
      // 低优先级按路径排序保证可复现与可观测（同数据集下执行顺序稳定）。
      const sorted = Array.from(this.archiveNormalizationPendingLow).sort((left, right) =>
        left.localeCompare(right, 'zh-CN'),
      )
      const next = sorted[0]
      if (next) {
        return { path: next, priority: 'low' }
      }
    }

    return null
  }

  private shouldDelayLowPriorityNormalization(nowMs: number): boolean {
    // 低优先级任务必须让位于交互链路：导入、缩略图生成、快照加载或刚发生用户读取时都延后。
    if (this.options.hasRunningImportTasks()) {
      return true
    }
    if (this.thumbnailRenderingInFlight > 0) {
      return true
    }
    if (this.options.isSnapshotLoading()) {
      return true
    }
    return nowMs - this.lastInteractiveReadAtMs < this.options.idleMs
  }

  private shouldDelayHighPriorityNormalization(): boolean {
    // 高优先级仅在“系统关键写读任务正在进行”时延后，避免与导入/快照事务竞争。
    if (this.options.hasRunningImportTasks()) {
      return true
    }
    if (this.options.isSnapshotLoading()) {
      return true
    }
    return false
  }

  private resolveWorkerScriptPath(): string | null {
    if (this.archiveNormalizeWorkerScriptPath) {
      return this.archiveNormalizeWorkerScriptPath
    }

    const mainEntry = process.argv[1] ? path.resolve(process.argv[1]) : ''
    const candidates: string[] = []
    if (mainEntry) {
      candidates.push(path.join(path.dirname(mainEntry), 'archiveNormalizeWorker.cjs'))
    }

    candidates.push(path.join(process.cwd(), 'dist-electron', 'archiveNormalizeWorker.cjs'))

    for (const candidate of candidates) {
      if (!existsSync(candidate)) {
        continue
      }
      this.archiveNormalizeWorkerScriptPath = candidate
      return candidate
    }

    return null
  }

  private async runRar7zNormalizationJob(sourceArchivePath: string): Promise<string> {
    const workerPath = this.resolveWorkerScriptPath()
    if (!workerPath) {
      const normalized = await normalizeArchiveToStoreZipInPlace(sourceArchivePath, {
        webpQuality: 90,
      })
      return normalized.outputZipPath
    }

    return await new Promise<string>((resolve, reject) => {
      const worker = new Worker(workerPath, {
        workerData: {
          sourceArchivePath,
          webpQuality: 90,
        },
      })

      let settled = false
      const finish = (error: Error | null, outputZipPath: string | null) => {
        if (settled) {
          return
        }
        settled = true
        if (error) {
          reject(error)
        } else {
          resolve(outputZipPath ?? resolveArchiveReplacementZipPath(sourceArchivePath))
        }
      }

      worker.once('message', (payload: unknown) => {
        const message = payload as { ok?: boolean; error?: string; outputZipPath?: string }
        if (message?.ok) {
          finish(null, typeof message.outputZipPath === 'string' ? message.outputZipPath : null)
          return
        }
        finish(new Error(message?.error ?? `archive normalization worker failed: ${sourceArchivePath}`), null)
      })

      worker.once('error', (error) => {
        finish(error, null)
      })

      worker.once('exit', (code) => {
        if (!settled && code !== 0) {
          finish(new Error(`archive normalization worker exit ${code} for ${sourceArchivePath}`), null)
        }
      })
    })
  }

  private async drainQueue(): Promise<void> {
    if (this.archiveNormalizationRunningPath) {
      return
    }

    const nextTarget = this.pickNextTarget()
    if (!nextTarget) {
      return
    }

    if (nextTarget.priority === 'low' && this.shouldDelayLowPriorityNormalization(Date.now())) {
      this.scheduleDrain(this.options.recheckMs)
      return
    }
    if (nextTarget.priority === 'high' && this.shouldDelayHighPriorityNormalization()) {
      this.scheduleDrain(this.options.recheckMs)
      return
    }

    const resolvedPath = nextTarget.path
    this.archiveNormalizationPendingHigh.delete(resolvedPath)
    this.archiveNormalizationPendingLow.delete(resolvedPath)
    this.archiveNormalizationRunningPath = resolvedPath

    this.archiveNormalizationStateBySourcePath.set(resolvedPath, {
      status: 'running',
      error: null,
      updatedAtMs: Date.now(),
    })
    this.emitStatusChanged()

    try {
      const outputZipPath = await this.runRar7zNormalizationJob(resolvedPath)
      await this.options.onArchiveNormalized(resolvedPath, outputZipPath)
      this.archiveNormalizationStateBySourcePath.set(resolvedPath, {
        status: 'completed',
        error: null,
        updatedAtMs: Date.now(),
      })
      this.emitStatusChanged()
      this.options.emitLibraryChanged({
        reason: 'archive-normalized',
        updated_at_ms: Date.now(),
      })
    } catch (error) {
      const reason = error instanceof Error && error.message ? error.message : String(error)
      this.archiveNormalizationStateBySourcePath.set(resolvedPath, {
        status: 'failed',
        error: reason,
        updatedAtMs: Date.now(),
      })
      this.emitStatusChanged()
      console.warn('archive normalization failed (rar/7z)', {
        archivePath: resolvedPath,
        reason,
      })
      this.options.emitLibraryChanged({
        reason: 'archive-normalize-failed',
        updated_at_ms: Date.now(),
      })
    } finally {
      this.archiveNormalizationRunningPath = null
      this.emitStatusChanged()
      if (this.archiveNormalizationPendingHigh.size > 0 || this.archiveNormalizationPendingLow.size > 0) {
        this.scheduleDrain(0)
      }
    }
  }
}
