import { existsSync } from 'node:fs'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { Worker } from 'node:worker_threads'

import {
  precomputeSubtitleCuesResponseSchema,
  type PrecomputeSubtitleCuesRequestDto,
  type PrecomputeSubtitleCuesResponseDto,
  type SubtitleCueDto,
  type SubtitleSessionEventDto,
} from '../../src/contracts/backend'
import { FFMPEG_BIN } from '../services/file-system-read/fileSystemReadFacadeConfig'
import { probeSubtitleEngineStatus } from './subtitleEngineProbe'

type PrecomputeWorkerCommand = 'precompute'

interface PrecomputeWorkerRequest {
  kind: 'request'
  request_id: string
  command: PrecomputeWorkerCommand
  payload: unknown
}

interface PrecomputeWorkerResponse {
  kind: 'response'
  request_id: string
  ok: boolean
  payload?: unknown
  error?: string
}

interface PrecomputeWorkerResult {
  cues: SubtitleCueDto[]
  events: SubtitleSessionEventDto[]
}

class SubtitlePrecomputeWorkerClient {
  private requestSeed = 0

  private readonly pending = new Map<
    string,
    {
      resolve: (value: unknown) => void
      reject: (error: Error) => void
      timeout: ReturnType<typeof setTimeout>
    }
  >()

  constructor(private readonly worker: Worker) {
    this.worker.on('message', (message: unknown) => {
      this.handleMessage(message)
    })

    this.worker.on('error', (error) => {
      this.failAll(error)
    })

    this.worker.on('exit', (code) => {
      if (code !== 0) {
        this.failAll(new Error(`subtitle_precompute_worker_exit_${code}`))
      }
    })
  }

  async request(command: PrecomputeWorkerCommand, payload: unknown, timeoutMs: number): Promise<unknown> {
    const requestId = `subtitle-precompute-worker-${Date.now()}-${this.requestSeed++}`
    const requestPayload: PrecomputeWorkerRequest = {
      kind: 'request',
      request_id: requestId,
      command,
      payload,
    }

    return await new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId)
        reject(new Error(`subtitle_precompute_worker_timeout:${command}`))
      }, timeoutMs)

      this.pending.set(requestId, {
        resolve,
        reject,
        timeout,
      })

      try {
        this.worker.postMessage(requestPayload)
      } catch (error) {
        clearTimeout(timeout)
        this.pending.delete(requestId)
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }

  async terminate(): Promise<void> {
    this.failAll(new Error('subtitle_precompute_worker_terminated'))
    await this.worker.terminate()
  }

  private handleMessage(rawMessage: unknown): void {
    if (!rawMessage || typeof rawMessage !== 'object') {
      return
    }

    const message = rawMessage as Partial<PrecomputeWorkerResponse>
    if (message.kind !== 'response' || typeof message.request_id !== 'string') {
      return
    }

    const pending = this.pending.get(message.request_id)
    if (!pending) {
      return
    }

    clearTimeout(pending.timeout)
    this.pending.delete(message.request_id)

    if (!message.ok) {
      pending.reject(new Error(message.error ?? 'subtitle_precompute_worker_failed'))
      return
    }

    pending.resolve(message.payload)
  }

  private failAll(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout)
      pending.reject(error)
    }
    this.pending.clear()
  }
}

interface CacheEntry {
  key: string
  value: Omit<PrecomputeSubtitleCuesResponseDto, 'source'>
}

const MAX_CACHE_ENTRIES = 12

export class SubtitlePrecomputeManager {
  private readonly cache = new Map<string, CacheEntry>()

  private readonly inflight = new Map<string, Promise<Omit<PrecomputeSubtitleCuesResponseDto, 'source'>>>()

  async precompute(webContentsId: number, request: PrecomputeSubtitleCuesRequestDto): Promise<PrecomputeSubtitleCuesResponseDto> {
    void webContentsId

    const engineStatus = probeSubtitleEngineStatus()
    if (!engineStatus.installed || !engineStatus.loadable || !engineStatus.moduleRoot) {
      throw new Error(`subtitle_engine_unavailable:${engineStatus.message ?? 'unknown'}`)
    }

    const stat = await fs.stat(path.resolve(request.video_path))
    const cacheKey = this.buildCacheKey(request, stat.size, stat.mtimeMs)
    const cached = this.cache.get(cacheKey)
    if (cached) {
      return precomputeSubtitleCuesResponseSchema.parse({
        source: 'cache',
        cache_key: cached.value.cache_key,
        cues: cached.value.cues,
        events: cached.value.events,
        generated_at_ms: cached.value.generated_at_ms,
      })
    }

    const existingPromise = this.inflight.get(cacheKey)
    if (existingPromise) {
      const result = await existingPromise
      return precomputeSubtitleCuesResponseSchema.parse({
        source: 'cache',
        cache_key: result.cache_key,
        cues: result.cues,
        events: result.events,
        generated_at_ms: result.generated_at_ms,
      })
    }

    const running = this.computeFromWorker(request, cacheKey, engineStatus.moduleRoot, engineStatus.availableProviders)
    this.inflight.set(cacheKey, running)

    try {
      const result = await running
      return precomputeSubtitleCuesResponseSchema.parse({
        source: 'generated',
        cache_key: result.cache_key,
        cues: result.cues,
        events: result.events,
        generated_at_ms: result.generated_at_ms,
      })
    } finally {
      this.inflight.delete(cacheKey)
    }
  }

  private async computeFromWorker(
    request: PrecomputeSubtitleCuesRequestDto,
    cacheKey: string,
    engineModuleRoot: string,
    availableProviders: Array<'cpu' | 'directml'>,
  ): Promise<Omit<PrecomputeSubtitleCuesResponseDto, 'source'>> {
    const workerPath = this.resolveWorkerScriptPath()
    const workerClient = new SubtitlePrecomputeWorkerClient(new Worker(workerPath))

    try {
      const payload = await workerClient.request(
        'precompute',
        {
          request,
          engine_module_root: engineModuleRoot,
          available_providers: availableProviders,
          ffmpeg_bin: FFMPEG_BIN,
        },
        10 * 60_000,
      )
      const workerResult = payload as PrecomputeWorkerResult
      const result = {
        cache_key: cacheKey,
        cues: workerResult.cues,
        events: workerResult.events,
        generated_at_ms: Date.now(),
      }
      this.rememberCache(cacheKey, result)
      return result
    } finally {
      await workerClient.terminate().catch(() => undefined)
    }
  }

  private buildCacheKey(request: PrecomputeSubtitleCuesRequestDto, fileSize: number, mtimeMs: number): string {
    return JSON.stringify({
      video_path: path.resolve(request.video_path),
      model_dir: path.resolve(request.model_dir),
      model_id: request.model_id,
      provider_preference: request.provider_preference,
      language: request.language,
      fallback_to_cpu: request.fallback_to_cpu,
      file_size: fileSize,
      file_mtime_ms: Math.floor(mtimeMs),
    })
  }

  private rememberCache(key: string, value: Omit<PrecomputeSubtitleCuesResponseDto, 'source'>): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }
    this.cache.set(key, { key, value })

    if (this.cache.size <= MAX_CACHE_ENTRIES) {
      return
    }

    const oldest = this.cache.keys().next().value
    if (typeof oldest === 'string') {
      this.cache.delete(oldest)
    }
  }

  private resolveWorkerScriptPath(): string {
    const mainEntry = process.argv[1] ? path.resolve(process.argv[1]) : ''
    const candidates: string[] = []

    if (mainEntry) {
      candidates.push(path.join(path.dirname(mainEntry), 'subtitlePrecomputeWorker.cjs'))
    }
    candidates.push(path.join(process.cwd(), 'dist-electron', 'subtitlePrecomputeWorker.cjs'))

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate
      }
    }

    throw new Error('subtitle_precompute_worker_not_found')
  }
}
