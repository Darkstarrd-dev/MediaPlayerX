import { existsSync } from 'node:fs'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Worker } from 'node:worker_threads'

import type { WebContents } from 'electron'

import {
  flushSubtitleSessionResponseSchema,
  pushSubtitleAudioResponseSchema,
  startSubtitlePersistenceResponseSchema,
  appendSubtitlePersistenceResponseSchema,
  readSubtitlePersistenceWindowResponseSchema,
  resetSubtitleSessionResponseSchema,
  startSubtitleSessionResponseSchema,
  stopSubtitleSessionResponseSchema,
  type FlushSubtitleSessionResponseDto,
  type PushSubtitleAudioRequestDto,
  type PushSubtitleAudioResponseDto,
  type StartSubtitlePersistenceRequestDto,
  type StartSubtitlePersistenceResponseDto,
  type AppendSubtitlePersistenceRequestDto,
  type AppendSubtitlePersistenceResponseDto,
  type ReadSubtitlePersistenceWindowRequestDto,
  type ReadSubtitlePersistenceWindowResponseDto,
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
  persistence: SubtitlePersistenceState | null
}

interface SubtitlePersistenceState {
  subtitlePath: string
  cues: SubtitleCueRecord[]
  cueById: Map<string, SubtitleCueRecord>
}

interface SubtitleCueRecord {
  id: string
  start_sec: number
  end_sec: number
  text: string
  lang: string | null
  speaker?: number | null
  line?: 'A' | 'B'
  speaker_changed?: boolean
  speaker_similarity?: number
}

function nowMs(): number {
  return Date.now()
}

function formatSrtTimestamp(seconds: number): string {
  const clamped = Math.max(0, Number.isFinite(seconds) ? seconds : 0)
  const totalMs = Math.floor(clamped * 1000)
  const ms = totalMs % 1000
  const totalSec = Math.floor(totalMs / 1000)
  const sec = totalSec % 60
  const totalMin = Math.floor(totalSec / 60)
  const min = totalMin % 60
  const hour = Math.floor(totalMin / 60)
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

function cuesToSrtText(cues: SubtitleCueRecord[]): string {
  const lines: string[] = []
  let cueIndex = 1
  for (const cue of cues) {
    const text = cue.text.trim()
    if (!text) {
      continue
    }
    lines.push(String(cueIndex))
    lines.push(`${formatSrtTimestamp(cue.start_sec)} --> ${formatSrtTimestamp(Math.max(cue.end_sec, cue.start_sec + 0.2))}`)
    lines.push(text)
    lines.push('')
    cueIndex += 1
  }
  return lines.join('\n').trim()
}

function resolveAutoSubtitlePath(videoPath: string): string {
  const videoDir = path.dirname(videoPath)
  const stem = path.basename(videoPath, path.extname(videoPath))
  return path.join(videoDir, `${stem}.auto-live.srt`)
}

function resolveFallbackSubtitlePath(videoPath: string): string {
  const stem = path.basename(videoPath, path.extname(videoPath))
  const hash = Buffer.from(path.resolve(videoPath)).toString('base64url').slice(0, 12)
  return path.join(os.tmpdir(), 'MediaPlayerX', 'auto-subtitles', `${stem}.${hash}.auto-live.srt`)
}

function toCueRecord(cue: AppendSubtitlePersistenceRequestDto['cues'][number]): SubtitleCueRecord {
  return {
    id: cue.id,
    start_sec: cue.start_sec,
    end_sec: cue.end_sec,
    text: cue.text,
    lang: cue.lang,
    speaker: cue.speaker,
    line: cue.line,
    speaker_changed: cue.speaker_changed,
    speaker_similarity: cue.speaker_similarity,
  }
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
        persistence: null,
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

  async startPersistence(
    webContentsId: number,
    request: StartSubtitlePersistenceRequestDto,
  ): Promise<StartSubtitlePersistenceResponseDto> {
    const session = this.sessions.get(webContentsId)
    if (!session) {
      return startSubtitlePersistenceResponseSchema.parse({
        enabled: false,
        subtitle_path: null,
        cue_count: 0,
        updated_at_ms: nowMs(),
      })
    }

    const resolvedVideoPath = path.resolve(request.video_path)
    let subtitlePath = resolveAutoSubtitlePath(resolvedVideoPath)
    try {
      await fs.mkdir(path.dirname(subtitlePath), { recursive: true })
      if (request.reset_existing) {
        await fs.writeFile(subtitlePath, '', 'utf8')
      }
    } catch (primaryError) {
      subtitlePath = resolveFallbackSubtitlePath(resolvedVideoPath)
      await fs.mkdir(path.dirname(subtitlePath), { recursive: true })
      if (request.reset_existing) {
        await fs.writeFile(subtitlePath, '', 'utf8')
      }
      console.warn('[subtitle] start persistence fallback path used', {
        requested_video_path: request.video_path,
        subtitle_path: subtitlePath,
        reason: primaryError instanceof Error ? primaryError.message : String(primaryError),
      })
    }

    session.persistence = {
      subtitlePath,
      cues: [],
      cueById: new Map<string, SubtitleCueRecord>(),
    }

    return startSubtitlePersistenceResponseSchema.parse({
      enabled: true,
      subtitle_path: subtitlePath,
      cue_count: 0,
      updated_at_ms: nowMs(),
    })
  }

  async appendPersistence(
    webContentsId: number,
    request: AppendSubtitlePersistenceRequestDto,
  ): Promise<AppendSubtitlePersistenceResponseDto> {
    const session = this.sessions.get(webContentsId)
    const persistence = session?.persistence
    if (!session || !persistence) {
      return appendSubtitlePersistenceResponseSchema.parse({
        accepted: false,
        subtitle_path: null,
        cue_count: 0,
        updated_at_ms: nowMs(),
      })
    }

    let changed = false
    for (const cue of request.cues) {
      const nextCue = toCueRecord(cue)
      const previous = persistence.cueById.get(nextCue.id)
      if (
        previous &&
        previous.start_sec === nextCue.start_sec &&
        previous.end_sec === nextCue.end_sec &&
        previous.text === nextCue.text
      ) {
        continue
      }
      persistence.cueById.set(nextCue.id, nextCue)
      changed = true
    }

    if (changed) {
      persistence.cues = Array.from(persistence.cueById.values()).sort(
        (left, right) => left.start_sec - right.start_sec,
      )
      await fs.writeFile(persistence.subtitlePath, cuesToSrtText(persistence.cues), 'utf8')
    }

    return appendSubtitlePersistenceResponseSchema.parse({
      accepted: true,
      subtitle_path: persistence.subtitlePath,
      cue_count: persistence.cues.length,
      updated_at_ms: nowMs(),
    })
  }

  async readPersistenceWindow(
    webContentsId: number,
    request: ReadSubtitlePersistenceWindowRequestDto,
  ): Promise<ReadSubtitlePersistenceWindowResponseDto> {
    const session = this.sessions.get(webContentsId)
    const persistence = session?.persistence
    if (!session || !persistence || persistence.cues.length === 0) {
      return readSubtitlePersistenceWindowResponseSchema.parse({
        subtitle_path: persistence?.subtitlePath ?? null,
        cues: [],
        generated_start_sec: null,
        generated_end_sec: null,
        updated_at_ms: nowMs(),
      })
    }

    const rangeStart = Math.max(0, request.timeline_sec - request.backtrack_sec)
    const rangeEnd = request.timeline_sec + request.lookahead_sec
    const matched = persistence.cues
      .filter((cue) => cue.end_sec + 0.001 >= rangeStart && cue.start_sec <= rangeEnd + 0.001)
      .slice(-request.limit)

    return readSubtitlePersistenceWindowResponseSchema.parse({
      subtitle_path: persistence.subtitlePath,
      cues: matched,
      generated_start_sec: persistence.cues[0]?.start_sec ?? null,
      generated_end_sec: persistence.cues[persistence.cues.length - 1]?.end_sec ?? null,
      updated_at_ms: nowMs(),
    })
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
        preview: null,
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
        preview: null,
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
