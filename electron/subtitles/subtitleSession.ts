import { existsSync } from 'node:fs'
import path from 'node:path'
import { Worker } from 'node:worker_threads'

import type { WebContents } from 'electron'

import {
  flushSubtitleSessionResponseSchema,
  pushSubtitleAudioResponseSchema,
  resetSubtitleSessionResponseSchema,
  startSubtitleSessionResponseSchema,
  stopSubtitleSessionResponseSchema,
  type FlushSubtitleSessionResponseDto,
  type PushSubtitleAudioRequestDto,
  type PushSubtitleAudioResponseDto,
  type ResetSubtitleSessionRequestDto,
  type ResetSubtitleSessionResponseDto,
  type StartSubtitleSessionRequestDto,
  type StartSubtitleSessionResponseDto,
  type StopSubtitleSessionRequestDto,
  type StopSubtitleSessionResponseDto,
  type SubtitleSessionProviderDto,
} from '../../src/contracts/backend'
import { probeSubtitleEngineStatus } from './subtitleEngineProbe'

type SubtitleWorkerCommand = 'init' | 'stop' | 'reset' | 'flush' | 'push-audio'

interface SubtitleWorkerRequest {
  kind: 'request'
  request_id: string
  command: SubtitleWorkerCommand
  payload: unknown
}

interface SubtitleWorkerResponse {
  kind: 'response'
  request_id: string
  ok: boolean
  payload?: unknown
  error?: string
}

interface SubtitleSessionState {
  sessionId: string
  provider: SubtitleSessionProviderDto
  workerClient: SubtitleWorkerClient
}

function nowMs(): number {
  return Date.now()
}

class SubtitleWorkerClient {
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
        this.failAll(new Error(`subtitle_asr_worker_exit_${code}`))
      }
    })
  }

  async request(command: SubtitleWorkerCommand, payload: unknown, timeoutMs = 15_000): Promise<unknown> {
    const requestId = `subtitle-worker-${Date.now()}-${this.requestSeed++}`
    const requestPayload: SubtitleWorkerRequest = {
      kind: 'request',
      request_id: requestId,
      command,
      payload,
    }

    return await new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId)
        reject(new Error(`subtitle_asr_worker_timeout:${command}`))
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
    this.failAll(new Error('subtitle_asr_worker_terminated'))
    await this.worker.terminate()
  }

  private handleMessage(rawMessage: unknown): void {
    if (!rawMessage || typeof rawMessage !== 'object') {
      return
    }

    const message = rawMessage as Partial<SubtitleWorkerResponse>
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
      pending.reject(new Error(message.error ?? 'subtitle_asr_worker_failed'))
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

export class SubtitleSessionManager {
  private readonly sessions = new Map<number, SubtitleSessionState>()

  private readonly webContentsBound = new Set<number>()

  bindWebContents(webContents: WebContents): void {
    if (this.webContentsBound.has(webContents.id)) {
      return
    }

    this.webContentsBound.add(webContents.id)
    webContents.once('destroyed', () => {
      void this.stopSession(webContents.id, {
        reason: 'web-contents-destroyed',
      }).catch(() => undefined)
      this.webContentsBound.delete(webContents.id)
    })
  }

  async startSession(webContentsId: number, request: StartSubtitleSessionRequestDto): Promise<StartSubtitleSessionResponseDto> {
    const existingSession = this.sessions.get(webContentsId)
    if (existingSession) {
      await this.stopSession(webContentsId, { reason: 'restart' })
    }

    const engineStatus = probeSubtitleEngineStatus()
    if (!engineStatus.installed || !engineStatus.loadable || !engineStatus.moduleRoot) {
      throw new Error(`subtitle_engine_unavailable:${engineStatus.message ?? 'unknown'}`)
    }

    const workerPath = this.resolveWorkerScriptPath()
    const workerClient = new SubtitleWorkerClient(new Worker(workerPath))

    try {
      const payload = await workerClient.request(
        'init',
        {
          ...request,
          engine_module_root: engineStatus.moduleRoot,
          available_providers: engineStatus.availableProviders,
        },
        20_000,
      )

      const response = startSubtitleSessionResponseSchema.parse(payload)
      this.sessions.set(webContentsId, {
        sessionId: response.session_id,
        provider: response.provider,
        workerClient,
      })

      return response
    } catch (error) {
      await workerClient.terminate().catch(() => undefined)
      throw error
    }
  }

  async stopSession(webContentsId: number, request: StopSubtitleSessionRequestDto): Promise<StopSubtitleSessionResponseDto> {
    const session = this.sessions.get(webContentsId)
    if (!session) {
      return stopSubtitleSessionResponseSchema.parse({
        session_id: null,
        stopped: false,
        updated_at_ms: nowMs(),
      })
    }

    let responsePayload: unknown = null
    try {
      responsePayload = await session.workerClient.request('stop', request, 8_000)
    } catch {
      responsePayload = {
        session_id: session.sessionId,
        stopped: true,
        updated_at_ms: nowMs(),
      }
    } finally {
      await session.workerClient.terminate().catch(() => undefined)
      this.sessions.delete(webContentsId)
    }

    return stopSubtitleSessionResponseSchema.parse(responsePayload)
  }

  async resetSession(
    webContentsId: number,
    request: ResetSubtitleSessionRequestDto,
  ): Promise<ResetSubtitleSessionResponseDto> {
    const session = this.sessions.get(webContentsId)
    if (!session) {
      return resetSubtitleSessionResponseSchema.parse({
        session_id: null,
        ok: false,
        events: [
          {
            code: 'session_not_running',
            level: 'warning',
            message: 'subtitle session is not running',
            at_ms: nowMs(),
          },
        ],
        updated_at_ms: nowMs(),
      })
    }

    const payload = await session.workerClient.request('reset', request)
    return resetSubtitleSessionResponseSchema.parse(payload)
  }

  async flushSession(webContentsId: number): Promise<FlushSubtitleSessionResponseDto> {
    const session = this.sessions.get(webContentsId)
    if (!session) {
      return flushSubtitleSessionResponseSchema.parse({
        session_id: null,
        cues: [],
        events: [],
        updated_at_ms: nowMs(),
      })
    }

    const payload = await session.workerClient.request('flush', {})
    return flushSubtitleSessionResponseSchema.parse(payload)
  }

  async pushAudio(webContentsId: number, request: PushSubtitleAudioRequestDto): Promise<PushSubtitleAudioResponseDto> {
    const session = this.sessions.get(webContentsId)
    if (!session) {
      return pushSubtitleAudioResponseSchema.parse({
        session_id: null,
        accepted: false,
        provider: null,
        cues: [],
        events: [
          {
            code: 'session_not_running',
            level: 'warning',
            message: 'subtitle session is not running',
            at_ms: nowMs(),
          },
        ],
        updated_at_ms: nowMs(),
      })
    }

    const payload = await session.workerClient.request('push-audio', request)
    return pushSubtitleAudioResponseSchema.parse(payload)
  }

  private resolveWorkerScriptPath(): string {
    const mainEntry = process.argv[1] ? path.resolve(process.argv[1]) : ''
    const candidates: string[] = []

    if (mainEntry) {
      candidates.push(path.join(path.dirname(mainEntry), 'asrWorker.cjs'))
    }
    candidates.push(path.join(process.cwd(), 'dist-electron', 'asrWorker.cjs'))

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate
      }
    }

    throw new Error('subtitle_asr_worker_not_found')
  }
}
