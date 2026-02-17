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
  type SubtitlePreviewCueDto,
  type SubtitleSessionEventDto,
  type SubtitleSessionProviderDto,
} from '../../src/contracts/backend'
import {
  DEFAULT_SUBTITLE_SHAPING_OPTIONS,
  SubtitleCueShaper,
} from '../../src/features/subtitles/pipeline/shaper'
import type {
  SubtitlePreviewCue,
  SubtitleShapedCue,
} from '../../src/features/subtitles/pipeline/types'

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
  recognizer: {
    decode: (stream: { acceptWaveform: (obj: { samples: Float32Array; sampleRate: number }) => void }) => void
    getResult: (stream: { acceptWaveform: (obj: { samples: Float32Array; sampleRate: number }) => void }) => {
      lang?: string
      text?: string
    }
    createStream: () => { acceptWaveform: (obj: { samples: Float32Array; sampleRate: number }) => void }
  }
  stream: { acceptWaveform: (obj: { samples: Float32Array; sampleRate: number }) => void }
  sampleRateHz: number
  pendingSamplesSinceDecode: number
  committedText: string
  cueSeed: number
  requestedLanguage: string
  detectedLanguage: string | null
  shaper: SubtitleCueShaper
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

  const isValidModelDir = async (candidate: string): Promise<boolean> => {
    if (!(await pathExists(candidate))) {
      return false
    }

    const tokensPath = path.join(candidate, 'tokens.txt')
    if (!(await pathExists(tokensPath))) {
      return false
    }

    let entries: Array<Awaited<ReturnType<typeof fs.readdir>>[number]> = []
    try {
      entries = await fs.readdir(candidate, { withFileTypes: true })
    } catch {
      return false
    }

    return entries.some((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.onnx'))
  }

  for (const candidate of candidates) {
    if (await isValidModelDir(candidate)) {
      return candidate
    }
  }

  let dirEntries: Array<Awaited<ReturnType<typeof fs.readdir>>[number]> = []
  try {
    dirEntries = await fs.readdir(normalizedDir, { withFileTypes: true })
  } catch {
    throw new Error(`subtitle_model_files_missing:${modelDir}:${modelId}`)
  }

  const fallbackSubdirs = dirEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(normalizedDir, entry.name))
    .sort((left, right) => left.localeCompare(right))

  for (const candidate of fallbackSubdirs) {
    if (await isValidModelDir(candidate)) {
      return candidate
    }
  }

  throw new Error(`subtitle_model_files_missing:${modelDir}:${modelId}`)
}

async function resolveModelOnnxPath(modelRootDir: string): Promise<string> {
  let entries: Array<Awaited<ReturnType<typeof fs.readdir>>[number]> = []
  try {
    entries = await fs.readdir(modelRootDir, { withFileTypes: true })
  } catch {
    throw new Error(`subtitle_model_files_missing:${modelRootDir}`)
  }

  const modelFileNames = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.onnx'))
    .map((entry) => entry.name)

  if (modelFileNames.length === 0) {
    throw new Error(`subtitle_model_files_missing:${modelRootDir}`)
  }

  const preferred = modelFileNames.find((name) => name.toLowerCase() === 'model.int8.onnx')
    ?? modelFileNames.find((name) => name.toLowerCase() === 'model.onnx')
    ?? modelFileNames[0]

  return path.join(modelRootDir, preferred)
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

function loadSherpaModule(moduleRoot: string): {
  OfflineRecognizer: new (config: unknown) => {
    createStream: () => { acceptWaveform: (obj: { samples: Float32Array; sampleRate: number }) => void }
    decode: (stream: { acceptWaveform: (obj: { samples: Float32Array; sampleRate: number }) => void }) => void
    getResult: (stream: { acceptWaveform: (obj: { samples: Float32Array; sampleRate: number }) => void }) => {
      lang?: string
      text?: string
    }
  }
} {
  const packageJsonPath = path.join(moduleRoot, 'package.json')
  if (!existsSync(packageJsonPath)) {
    throw new Error(`subtitle_engine_package_not_found:${packageJsonPath}`)
  }

  const moduleRequire = createRequire(packageJsonPath)
  return moduleRequire('sherpa-onnx-node') as {
    OfflineRecognizer: new (config: unknown) => {
      createStream: () => { acceptWaveform: (obj: { samples: Float32Array; sampleRate: number }) => void }
      decode: (stream: { acceptWaveform: (obj: { samples: Float32Array; sampleRate: number }) => void }) => void
      getResult: (stream: { acceptWaveform: (obj: { samples: Float32Array; sampleRate: number }) => void }) => {
        lang?: string
        text?: string
      }
    }
  }
}

function normalizeRecognizedText(value: string | undefined): string {
  const raw = (value ?? '').trim()
  if (!raw) {
    return ''
  }
  return raw.replace(/<\|[^|]+\|>/g, '').replace(/\s+/g, ' ').trim()
}

function normalizeLangTag(value: string | undefined): string | null {
  const raw = (value ?? '').trim()
  if (!raw) {
    return null
  }

  const tagged = /^<\|([^|]+)\|>$/.exec(raw)
  if (tagged?.[1]) {
    return tagged[1].toLowerCase()
  }

  return raw.toLowerCase()
}

function normalizeRequestedLanguage(value: string): string {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'zh' || normalized === 'en' || normalized === 'ja' || normalized === 'ko' || normalized === 'yue') {
    return normalized
  }
  return 'auto'
}

function computeTextDelta(previousText: string, currentText: string): string {
  if (!currentText) {
    return ''
  }
  if (!previousText) {
    return currentText
  }
  if (currentText === previousText) {
    return ''
  }
  if (currentText.startsWith(previousText)) {
    return currentText.slice(previousText.length).trim()
  }

  const previousTail = previousText.slice(Math.max(0, previousText.length - 16))
  const overlapIndex = currentText.indexOf(previousTail)
  if (overlapIndex >= 0) {
    return currentText.slice(overlapIndex + previousTail.length).trim()
  }

  return currentText
}

function calculateRms(samples: Float32Array): number {
  if (samples.length === 0) {
    return 0
  }

  let squareSum = 0
  for (let i = 0; i < samples.length; i += 1) {
    squareSum += samples[i] * samples[i]
  }

  return Math.sqrt(squareSum / samples.length)
}

function decodeFloat32Buffer(chunkBuffer: Buffer): Float32Array {
  if (chunkBuffer.byteLength === 0) {
    return new Float32Array(0)
  }
  const view = new Float32Array(
    chunkBuffer.buffer,
    chunkBuffer.byteOffset,
    Math.floor(chunkBuffer.byteLength / Float32Array.BYTES_PER_ELEMENT),
  )
  return new Float32Array(view)
}

function makeCueId(sessionId: string, cueSeed: number): string {
  return `${sessionId}:${cueSeed}`
}

function resolveCueLanguage(currentSession: RuntimeSessionState): string | null {
  if (currentSession.requestedLanguage !== 'auto') {
    return currentSession.requestedLanguage
  }
  return currentSession.detectedLanguage
}

function toSubtitleCueDto(currentSession: RuntimeSessionState, cue: SubtitleShapedCue): SubtitleCueDto {
  currentSession.cueSeed += 1
  return {
    id: makeCueId(currentSession.sessionId, currentSession.cueSeed),
    start_sec: cue.startSec,
    end_sec: cue.endSec,
    text: cue.text,
    lang: resolveCueLanguage(currentSession),
  }
}

function toSubtitlePreviewCueDto(currentSession: RuntimeSessionState, cue: SubtitlePreviewCue | null): SubtitlePreviewCueDto | null {
  if (!cue) {
    return null
  }

  return {
    start_sec: cue.startSec,
    end_sec: cue.endSec,
    text: cue.text,
    lang: resolveCueLanguage(currentSession),
  }
}

function decodeAndShapeSubtitle(
  currentSession: RuntimeSessionState,
  timelineStartSec: number,
  timelineEndSec: number,
): {
  cues: SubtitleCueDto[]
  preview: SubtitlePreviewCueDto | null
} {
  currentSession.recognizer.decode(currentSession.stream)
  const result = currentSession.recognizer.getResult(currentSession.stream)
  if (currentSession.requestedLanguage === 'auto') {
    currentSession.detectedLanguage = normalizeLangTag(result.lang)
  }

  const currentText = normalizeRecognizedText(result.text)
  if (!currentText) {
    return {
      cues: [],
      preview: toSubtitlePreviewCueDto(currentSession, currentSession.shaper.getPreviewCue()),
    }
  }

  const delta = computeTextDelta(currentSession.committedText, currentText)
  currentSession.committedText = currentText
  if (!delta) {
    return {
      cues: [],
      preview: toSubtitlePreviewCueDto(currentSession, currentSession.shaper.getPreviewCue()),
    }
  }

  const shaped = currentSession.shaper.ingestDelta({
    text: delta,
    startSec: timelineStartSec,
    endSec: timelineEndSec,
  })

  const cues = shaped.cues.map((cue) => toSubtitleCueDto(currentSession, cue))

  return {
    cues,
    preview: toSubtitlePreviewCueDto(currentSession, shaped.preview),
  }
}

function flushBySilence(
  currentSession: RuntimeSessionState,
  nowSec: number,
): {
  cues: SubtitleCueDto[]
  preview: SubtitlePreviewCueDto | null
} {
  const shaped = currentSession.shaper.flushBySilence(nowSec)
  return {
    cues: shaped.cues.map((cue) => toSubtitleCueDto(currentSession, cue)),
    preview: toSubtitlePreviewCueDto(currentSession, shaped.preview),
  }
}

async function handleInit(rawPayload: unknown): Promise<unknown> {
  const payload = rawPayload as InitRequestPayload
  const sherpa = loadSherpaModule(path.resolve(payload.engine_module_root))

  const modelRootDir = await resolveModelRootDir(payload.model_dir, payload.model_id)
  const providerDecision = chooseProvider(payload)

  const modelPath = await resolveModelOnnxPath(modelRootDir)
  const tokensPath = path.join(modelRootDir, 'tokens.txt')
  const normalizedLanguage = normalizeRequestedLanguage(payload.language)
  const useInverseTextNormalization =
    normalizedLanguage === 'zh' || normalizedLanguage === 'yue' ? 1 : 0

  const recognizer = new sherpa.OfflineRecognizer({
    featConfig: {
      sampleRate: 16_000,
      featureDim: 80,
    },
    modelConfig: {
      senseVoice: {
        model: modelPath,
        language: normalizedLanguage,
        useInverseTextNormalization,
      },
      tokens: tokensPath,
      provider: providerDecision.provider,
      numThreads: 2,
    },
  })
  const stream = recognizer.createStream()

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
    recognizer,
    stream,
    sampleRateHz: 16_000,
    pendingSamplesSinceDecode: 0,
    committedText: '',
    cueSeed: 0,
    requestedLanguage: normalizedLanguage,
    detectedLanguage: null,
    shaper: new SubtitleCueShaper(DEFAULT_SUBTITLE_SHAPING_OPTIONS),
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
  currentSession.stream = currentSession.recognizer.createStream()
  currentSession.pendingSamplesSinceDecode = 0
  currentSession.committedText = ''
  currentSession.detectedLanguage = null
  currentSession.shaper.reset()
  return resetSubtitleSessionResponseSchema.parse({
    session_id: currentSession.sessionId,
    ok: true,
    events: [],
    updated_at_ms: nowMs(),
  })
}

async function handleFlush(): Promise<unknown> {
  const currentSession = runtimeSession
  let cues: SubtitleCueDto[] = []
  let preview: SubtitlePreviewCueDto | null = null

  if (currentSession) {
    const decoded = decodeAndShapeSubtitle(
      currentSession,
      Math.max(0, currentSession.lastChunkEndSec - 2),
      currentSession.lastChunkEndSec,
    )
    cues = decoded.cues

    const flushed = currentSession.shaper.flushAll().map((cue) => toSubtitleCueDto(currentSession, cue))
    if (flushed.length > 0) {
      cues = [...cues, ...flushed]
    }
    preview = toSubtitlePreviewCueDto(currentSession, currentSession.shaper.getPreviewCue())
  }

  return flushSubtitleSessionResponseSchema.parse({
    session_id: currentSession?.sessionId ?? null,
    cues,
    preview,
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

  const samples = decodeFloat32Buffer(chunkBuffer)
  const rms = calculateRms(samples)
  if (samples.length > 0) {
    currentSession.sampleRateHz = request.sample_rate_hz
    currentSession.stream.acceptWaveform({
      samples,
      sampleRate: request.sample_rate_hz,
    })
    currentSession.pendingSamplesSinceDecode += samples.length / Math.max(1, request.channel_count)
  }

  const decodeWindowSamples = Math.max(1_600, Math.floor(currentSession.sampleRateHz * 0.6))
  const shouldDecode =
    currentSession.pendingSamplesSinceDecode >= decodeWindowSamples &&
    rms >= 0.002

  let cues: SubtitleCueDto[] = []
  let preview: SubtitlePreviewCueDto | null = toSubtitlePreviewCueDto(currentSession, currentSession.shaper.getPreviewCue())
  if (shouldDecode) {
    currentSession.pendingSamplesSinceDecode = 0
    const decoded = decodeAndShapeSubtitle(currentSession, request.chunk_start_sec, request.chunk_end_sec)
    cues = decoded.cues
    preview = decoded.preview
  } else if (rms < 0.0015) {
    const flushed = flushBySilence(currentSession, request.chunk_end_sec)
    if (flushed.cues.length > 0) {
      cues = [...cues, ...flushed.cues]
    }
    preview = flushed.preview
  }

  return pushSubtitleAudioResponseSchema.parse({
    session_id: currentSession.sessionId,
    accepted: true,
    provider: currentSession.provider,
    cues,
    preview,
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
