import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'

import {
  readArchiveLoadStatusResponseSchema,
  type ReadArchiveLoadStatusResponseDto,
} from '../../../src/contracts/backend'
import {
  normalizeArchiveToStoreZipInPlace,
  resolveArchiveReplacementZipPath,
} from '../../archiveWasmExtractor'
import { runTaskInProcess } from '../task-orchestrator/processTaskOrchestrator'

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
  withArchiveWriteLock?: <T>(archivePath: string, task: () => Promise<T>) => Promise<T>
  runWithCpuToken?: <T>(taskName: string, task: () => Promise<T>) => Promise<T>
  readPersistedQueuePaths?: () => string[]
  writePersistedQueuePaths?: (paths: string[]) => void
}

export class ArchiveNormalizationService {
  private static readonly ARCHIVE_NORMALIZE_PROCESS_TIMEOUT_MS = 20 * 60_000

  private static readonly ARCHIVE_NORMALIZE_MAX_RETRY = 2

  private static readonly ARCHIVE_NORMALIZE_RETRY_BASE_MS = 1_000

  private static readonly ARCHIVE_NORMALIZE_CIRCUIT_BREAKER_MS = 30_000

  // 低优先级队列用于后台归一化（空闲窗口执行），高优先级用于“用户刚打开目标包”时抢占执行。
  private archiveNormalizationPendingLow = new Set<string>()

  private archiveNormalizationPendingHigh = new Set<string>()

  private archiveNormalizationRunningPath: string | null = null

  private archiveNormalizationDrainTimer: ReturnType<typeof setTimeout> | null = null

  private lastInteractiveReadAtMs = Date.now()

  private thumbnailRenderingInFlight = 0

  private archiveNormalizationStateBySourcePath = new Map<string, ArchiveNormalizationTaskState>()

  private archiveNormalizationRetryCountBySourcePath = new Map<string, number>()

  private archiveNormalizationCircuitOpenUntilBySourcePath = new Map<string, number>()

  private archiveNormalizeWorkerScriptPath: string | null = null

  private persistedQueueRecovered = false

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
    this.archiveNormalizationRetryCountBySourcePath.clear()
    this.archiveNormalizationCircuitOpenUntilBySourcePath.clear()
    this.persistPendingQueueState()
    this.dispose()
    this.emitStatusChanged()
  }

  deleteStateByPath(pathValue: string): void {
    const resolvedPath = path.resolve(pathValue)
    this.archiveNormalizationPendingLow.delete(resolvedPath)
    this.archiveNormalizationPendingHigh.delete(resolvedPath)
    this.archiveNormalizationStateBySourcePath.delete(resolvedPath)
    this.archiveNormalizationRetryCountBySourcePath.delete(resolvedPath)
    this.archiveNormalizationCircuitOpenUntilBySourcePath.delete(resolvedPath)
    if (this.archiveNormalizationRunningPath === resolvedPath) {
      this.archiveNormalizationRunningPath = null
    }
    this.persistPendingQueueState()
  }

  recoverPersistedQueue(): void {
    if (this.persistedQueueRecovered) {
      return
    }
    this.persistedQueueRecovered = true

    const persistedPaths = this.options.readPersistedQueuePaths?.() ?? []
    for (const persistedPath of persistedPaths) {
      this.queueRar7zNormalization(persistedPath, 'low')
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

    const now = Date.now()
    const circuitOpenUntil = this.archiveNormalizationCircuitOpenUntilBySourcePath.get(resolvedPath) ?? 0
    if (circuitOpenUntil > now) {
      this.archiveNormalizationStateBySourcePath.set(resolvedPath, {
        status: 'failed',
        error: `circuit-open-until-${circuitOpenUntil}`,
        updatedAtMs: now,
      })
      this.emitStatusChanged()
      this.scheduleDrain(Math.max(this.options.recheckMs, circuitOpenUntil - now))
      return
    }
    this.archiveNormalizationCircuitOpenUntilBySourcePath.delete(resolvedPath)

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
      this.persistPendingQueueState()
      this.scheduleDrain(0)
      return
    }

    if (!this.archiveNormalizationPendingHigh.has(resolvedPath)) {
      this.archiveNormalizationPendingLow.add(resolvedPath)
    }
    this.emitStatusChanged()
    this.persistPendingQueueState()
    this.scheduleDrain(this.options.recheckMs)
  }

  private buildPersistedQueuePaths(): string[] {
    const paths = [
      ...this.archiveNormalizationPendingHigh,
      ...this.archiveNormalizationPendingLow,
      ...(this.archiveNormalizationRunningPath ? [this.archiveNormalizationRunningPath] : []),
    ]
    const deduped = Array.from(new Set(paths.map((value) => path.resolve(value))))
    deduped.sort((left, right) => left.localeCompare(right, 'zh-CN'))
    return deduped
  }

  private persistPendingQueueState(): void {
    if (!this.options.writePersistedQueuePaths) {
      return
    }

    const paths = this.buildPersistedQueuePaths()
    this.options.writePersistedQueuePaths(paths)
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
    if (this.thumbnailRenderingInFlight > 0) {
      return true
    }
    if (this.options.isSnapshotLoading()) {
      return true
    }
    return false
  }

  private async cleanupNormalizationArtifactsForSource(sourceArchivePath: string): Promise<void> {
    const finalZipPath = resolveArchiveReplacementZipPath(sourceArchivePath)
    const finalZipName = path.basename(finalZipPath)
    const finalZipDir = path.dirname(finalZipPath)
    const directoryEntries = await fs.readdir(finalZipDir, { withFileTypes: true }).catch(() => null)
    if (!directoryEntries || directoryEntries.length === 0) {
      return
    }

    const tempPaths: string[] = []
    const backupPaths: string[] = []

    for (const entry of directoryEntries) {
      if (!entry.isFile()) {
        continue
      }

      const name = entry.name
      if (name.startsWith(`${finalZipName}.mpx-normalizing-`) && name.endsWith('.tmp')) {
        tempPaths.push(path.join(finalZipDir, name))
        continue
      }

      if (name.startsWith(`${finalZipName}.mpx-backup-`)) {
        backupPaths.push(path.join(finalZipDir, name))
      }
    }

    for (const tempPath of tempPaths) {
      await fs.rm(tempPath, { force: true }).catch(() => undefined)
    }

    if (backupPaths.length === 0) {
      return
    }

    const finalExists = await fs
      .stat(finalZipPath)
      .then((stat) => stat.isFile())
      .catch(() => false)
    if (finalExists) {
      for (const backupPath of backupPaths) {
        await fs.rm(backupPath, { force: true }).catch(() => undefined)
      }
      return
    }

    backupPaths.sort((left, right) => right.localeCompare(left, 'en-US'))
    const restorePath = backupPaths[0]
    if (restorePath) {
      await fs.rename(restorePath, finalZipPath).catch(() => undefined)
    }

    for (const backupPath of backupPaths.slice(1)) {
      await fs.rm(backupPath, { force: true }).catch(() => undefined)
    }
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
    const runJob = async () => {
      const workerPath = this.resolveWorkerScriptPath()
      if (!workerPath) {
        const normalized = await normalizeArchiveToStoreZipInPlace(sourceArchivePath, {
          webpQuality: 90,
        })
        return normalized.outputZipPath
      }

      const workerResult = await runTaskInProcess<
        {
          sourceArchivePath: string
          webpQuality: number
        },
        {
          outputZipPath?: string
        }
      >({
        workerPath,
        taskName: 'archive-normalize',
        payload: {
          sourceArchivePath,
          webpQuality: 90,
        },
        timeoutMs: ArchiveNormalizationService.ARCHIVE_NORMALIZE_PROCESS_TIMEOUT_MS,
        heartbeatTimeoutMs: 12_000,
        maxRetries: 1,
      })

      return typeof workerResult.outputZipPath === 'string'
        ? workerResult.outputZipPath
        : resolveArchiveReplacementZipPath(sourceArchivePath)
    }

    if (this.options.runWithCpuToken) {
      return await this.options.runWithCpuToken('archive-normalize', runJob)
    }
    return await runJob()
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
    this.persistPendingQueueState()

    this.archiveNormalizationStateBySourcePath.set(resolvedPath, {
      status: 'running',
      error: null,
      updatedAtMs: Date.now(),
    })
    this.emitStatusChanged()

    let retryDelayMs: number | null = null

    try {
      const outputZipPath = await (this.options.withArchiveWriteLock
        ? this.options.withArchiveWriteLock(resolvedPath, async () => {
            await this.cleanupNormalizationArtifactsForSource(resolvedPath)
            return await this.runRar7zNormalizationJob(resolvedPath)
          })
        : (async () => {
            await this.cleanupNormalizationArtifactsForSource(resolvedPath)
            return await this.runRar7zNormalizationJob(resolvedPath)
          })())
      await this.options.onArchiveNormalized(resolvedPath, outputZipPath)
      this.archiveNormalizationRetryCountBySourcePath.delete(resolvedPath)
      this.archiveNormalizationCircuitOpenUntilBySourcePath.delete(resolvedPath)
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
      const retryCount = (this.archiveNormalizationRetryCountBySourcePath.get(resolvedPath) ?? 0) + 1

      if (retryCount <= ArchiveNormalizationService.ARCHIVE_NORMALIZE_MAX_RETRY) {
        this.archiveNormalizationRetryCountBySourcePath.set(resolvedPath, retryCount)
        retryDelayMs = Math.min(
          15_000,
          ArchiveNormalizationService.ARCHIVE_NORMALIZE_RETRY_BASE_MS * 2 ** (retryCount - 1),
        )
        if (nextTarget.priority === 'high') {
          this.archiveNormalizationPendingHigh.add(resolvedPath)
        } else {
          this.archiveNormalizationPendingLow.add(resolvedPath)
        }
        this.archiveNormalizationStateBySourcePath.set(resolvedPath, {
          status: 'pending',
          error: `retry-${retryCount}:${reason}`,
          updatedAtMs: Date.now(),
        })
        this.emitStatusChanged()
        this.persistPendingQueueState()
        console.warn('archive normalization retry scheduled', {
          archivePath: resolvedPath,
          reason,
          retryCount,
          retryDelayMs,
        })
      } else {
        this.archiveNormalizationRetryCountBySourcePath.set(resolvedPath, retryCount)
        const circuitOpenUntil = Date.now() + ArchiveNormalizationService.ARCHIVE_NORMALIZE_CIRCUIT_BREAKER_MS
        this.archiveNormalizationCircuitOpenUntilBySourcePath.set(resolvedPath, circuitOpenUntil)
        this.archiveNormalizationStateBySourcePath.set(resolvedPath, {
          status: 'failed',
          error: `circuit-open-until-${circuitOpenUntil}:${reason}`,
          updatedAtMs: Date.now(),
        })
        this.emitStatusChanged()
        console.warn('archive normalization failed (rar/7z)', {
          archivePath: resolvedPath,
          reason,
          retryCount,
          circuitOpenUntil,
        })
        this.options.emitLibraryChanged({
          reason: 'archive-normalize-failed',
          updated_at_ms: Date.now(),
        })
        this.persistPendingQueueState()
      }
    } finally {
      this.archiveNormalizationRunningPath = null
      this.emitStatusChanged()
      this.persistPendingQueueState()
      if (this.archiveNormalizationPendingHigh.size > 0 || this.archiveNormalizationPendingLow.size > 0) {
        this.scheduleDrain(retryDelayMs ?? 0)
      }
    }
  }
}
