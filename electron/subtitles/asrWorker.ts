import { existsSync } from 'node:fs'
import { promises as fs } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { parentPort } from 'node:worker_threads'

import {
  flushSubtitleSessionResponseSchema,
  pushSubtitleAudioResponseSchema,
  resetSubtitleSessionResponseSchema,
  startSubtitleSessionResponseSchema,
  stopSubtitleSessionResponseSchema,
  type PushSubtitleAudioRequestDto,
  type ResetSubtitleSessionRequestDto,
  type StartSubtitleSessionRequestDto,
  type StopSubtitleSessionRequestDto,
  type SubtitleCueDto,
  type SubtitleSessionEventDto,
  type SubtitleSessionProviderDto,
} from '../../src/contracts/backend'

type SubtitleWorkerCommand = 'init' | 'stop' | 'reset' | 'flush' | 'push-audio'

interface SubtitleWorkerRequest {
  kind: 'request'
  request_id: string
  command: SubtitleWorkerCommand
  payload: unknown
}

interface InitRequestPayload extends StartSubtitleSessionRequestDto {
  engine_module_root: string
  available_providers: Array<'cpu' | 'directml'>
}

interface RuntimeSessionState {
  sessionId: string
  provider: SubtitleSessionProviderDto
  startedAtMs: number
  modelRootDir: string
  language: string
  fallbackApplied: boolean
  lastChunkEndSec: number
}

let runtimeSession: RuntimeSessionState | null = null

function nowMs(): number {
  return Date.now()
}

function createEvent(
  code: string,
  level: SubtitleSessionEventDto['level'],
  message: string,
): SubtitleSessionEventDto {
  return {
    code,
    level,
    message,
    at_ms: nowMs(),
  }
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function resolveModelRootDir(modelDir: string, modelId: string): Promise<string> {
  const normalizedDir = path.resolve(modelDir)
  const candidates = [path.join(normalizedDir, modelId), normalizedDir]

  for (const candidate of candidates) {
    if (!(await pathExists(candidate))) {
      continue
    }

    const tokensPath = path.join(candidate, 'tokens.txt')
    if (!(await pathExists(tokensPath))) {
      continue
    }

    let entries: Array<Awaited<ReturnType<typeof fs.readdir>>[number]> = []
    try {
      entries = await fs.readdir(candidate, { withFileTypes: true })
    } catch {
      continue
    }

    const hasOnnxModel = entries.some((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.onnx'))
    if (!hasOnnxModel) {
      continue
    }

    return candidate
  }

  throw new Error(`subtitle_model_files_missing:${modelDir}:${modelId}`)
}

function chooseProvider(payload: InitRequestPayload): {
  provider: SubtitleSessionProviderDto
  fallbackApplied: boolean
  events: SubtitleSessionEventDto[]
} {
  const available = new Set(payload.available_providers)
  const events: SubtitleSessionEventDto[] = []

  if (!available.has('cpu')) {
    throw new Error('subtitle_provider_unavailable:cpu')
  }

  if (payload.provider_preference === 'cpu') {
    return {
      provider: 'cpu',
      fallbackApplied: false,
      events,
    }
  }

  if (available.has('directml')) {
    return {
      provider: 'directml',
      fallbackApplied: false,
      events,
    }
  }

  if (!payload.fallback_to_cpu) {
    throw new Error('subtitle_provider_unavailable:directml')
  }

  events.push(
    createEvent(
      'provider_fallback',
      'warning',
      `directml unavailable, fallback to cpu (${payload.provider_preference})`,
    ),
  )

  return {
    provider: 'cpu',
    fallbackApplied: true,
    events,
  }
}

function ensureParentPort(): asserts parentPort is NonNullable<typeof parentPort> {
  if (!parentPort) {
    throw new Error('subtitle_asr_worker_missing_parent_port')
  }
}

function ensureSession(): RuntimeSessionState {
  if (!runtimeSession) {
    throw new Error('subtitle_session_not_running')
  }
  return runtimeSession
}

function loadSherpaModule(moduleRoot: string): void {
  const packageJsonPath = path.join(moduleRoot, 'package.json')
  if (!existsSync(packageJsonPath)) {
    throw new Error(`subtitle_engine_package_not_found:${packageJsonPath}`)
  }

  const moduleRequire = createRequire(packageJsonPath)
  moduleRequire('sherpa-onnx-node')
}

async function handleInit(rawPayload: unknown): Promise<unknown> {
  const payload = rawPayload as InitRequestPayload
  loadSherpaModule(path.resolve(payload.engine_module_root))

  const modelRootDir = await resolveModelRootDir(payload.model_dir, payload.model_id)
  const providerDecision = chooseProvider(payload)

  const sessionId = `subtitle-session-${nowMs()}-${Math.floor(Math.random() * 100_000)}`
  const startedAtMs = nowMs()

  runtimeSession = {
    sessionId,
    provider: providerDecision.provider,
    startedAtMs,
    modelRootDir,
    language: payload.language,
    fallbackApplied: providerDecision.fallbackApplied,
    lastChunkEndSec: 0,
  }

  return startSubtitleSessionResponseSchema.parse({
    session_id: sessionId,
    provider: providerDecision.provider,
    fallback_applied: providerDecision.fallbackApplied,
    events: providerDecision.events,
    started_at_ms: startedAtMs,
  })
}

async function handleStop(rawPayload: unknown): Promise<unknown> {
  const request = (rawPayload ?? {}) as StopSubtitleSessionRequestDto
  const currentSession = runtimeSession
  runtimeSession = null

  const response = stopSubtitleSessionResponseSchema.parse({
    session_id: currentSession?.sessionId ?? null,
    stopped: Boolean(currentSession),
    updated_at_ms: nowMs(),
  })

  void request
  return response
}

async function handleReset(rawPayload: unknown): Promise<unknown> {
  const request = (rawPayload ?? {}) as ResetSubtitleSessionRequestDto
  const currentSession = runtimeSession
  if (!currentSession) {
    return resetSubtitleSessionResponseSchema.parse({
      session_id: null,
      ok: false,
      events: [createEvent('session_not_running', 'warning', 'subtitle session is not running')],
      updated_at_ms: nowMs(),
    })
  }

  currentSession.lastChunkEndSec = request.timeline_sec ?? currentSession.lastChunkEndSec
  return resetSubtitleSessionResponseSchema.parse({
    session_id: currentSession.sessionId,
    ok: true,
    events: [],
    updated_at_ms: nowMs(),
  })
}

async function handleFlush(): Promise<unknown> {
  const currentSession = runtimeSession
  return flushSubtitleSessionResponseSchema.parse({
    session_id: currentSession?.sessionId ?? null,
    cues: [] satisfies SubtitleCueDto[],
    events: [],
    updated_at_ms: nowMs(),
  })
}

async function handlePushAudio(rawPayload: unknown): Promise<unknown> {
  const request = rawPayload as PushSubtitleAudioRequestDto
  const currentSession = ensureSession()

  const chunkBuffer = Buffer.from(request.chunk_base64, 'base64')
  const chunkDurationSec = chunkBuffer.byteLength / 4 / request.sample_rate_hz / Math.max(1, request.channel_count)
  const expectedEndSec = request.chunk_start_sec + Math.max(0, chunkDurationSec)

  const events: SubtitleSessionEventDto[] = []
  if (request.chunk_end_sec + 0.0001 < request.chunk_start_sec) {
    events.push(createEvent('chunk_invalid_range', 'warning', 'chunk_end_sec is less than chunk_start_sec'))
  }
  if (request.chunk_start_sec + 0.0001 < currentSession.lastChunkEndSec) {
    events.push(createEvent('chunk_non_monotonic', 'warning', 'chunk start is earlier than previous chunk end'))
  }

  currentSession.lastChunkEndSec = Math.max(currentSession.lastChunkEndSec, request.chunk_end_sec, expectedEndSec)

  return pushSubtitleAudioResponseSchema.parse({
    session_id: currentSession.sessionId,
    accepted: true,
    provider: currentSession.provider,
    cues: [] satisfies SubtitleCueDto[],
    events,
    updated_at_ms: nowMs(),
  })
}

async function handleRequest(command: SubtitleWorkerCommand, payload: unknown): Promise<unknown> {
  switch (command) {
    case 'init':
      return await handleInit(payload)
    case 'stop':
      return await handleStop(payload)
    case 'reset':
      return await handleReset(payload)
    case 'flush':
      return await handleFlush()
    case 'push-audio':
      return await handlePushAudio(payload)
    default:
      throw new Error(`subtitle_asr_worker_unknown_command:${command satisfies never}`)
  }
}

ensureParentPort()

parentPort.on('message', (message: unknown) => {
  if (!message || typeof message !== 'object') {
    return
  }

  const request = message as Partial<SubtitleWorkerRequest>
  if (request.kind !== 'request' || typeof request.request_id !== 'string' || typeof request.command !== 'string') {
    return
  }

  void handleRequest(request.command as SubtitleWorkerCommand, request.payload)
    .then((payload) => {
      parentPort.postMessage({
        kind: 'response',
        request_id: request.request_id,
        ok: true,
        payload,
      })
    })
    .catch((error: unknown) => {
      const messageText = error instanceof Error && error.message ? error.message : String(error)
      parentPort.postMessage({
        kind: 'response',
        request_id: request.request_id,
        ok: false,
        error: messageText,
      })
    })
})
